/**
 * GRYD — ingest_run : le compteur qui nourrit Raid Leader / Strategist.
 *
 * ═══ CE QUE CE FICHIER VERROUILLE ═══════════════════════════════════════════
 * Deux choses, et elles sont opposées :
 *
 *  1. `offensivesCompleted` DOIT rester 0 dans ingest_run. Ce champ n'a qu'UN
 *     consommateur : `crewXpForRun`, qui le multiplie par
 *     CREW_XP_SOURCES.offensiveCompleted (200) POUR CETTE COURSE. Y écrire un
 *     compte d'offensives terminées rejouerait donc 200 XP par offensive à
 *     CHAQUE course du membre, à vie — et l'imputerait à un membre via
 *     crew_xp_daily alors que l'XP de clôture est COLLECTIVE. Les 200 XP
 *     arrivent une seule fois, par `finalize_offensive` (migration 0064).
 *
 *  2. Le VRAI compteur des badges Raid Leader et de la skill Strategist est la
 *     colonne `user_stats.offensives_joined` (métrique `offensivesJoined`),
 *     écrite en direct par `finalize_offensive`. Or ingest_run réécrivait la
 *     ligne user_stats ENTIÈRE à chaque course, avec les valeurs lues AVANT :
 *     un crédit de job tombé entre la lecture et l'écriture était effacé en
 *     silence, et le compteur d'un badge pouvait RECULER. `statsDelta` limite
 *     l'écriture aux colonnes que la course a réellement changées — plus rien
 *     à écraser.
 *
 * AUCUN réseau ici : tout est pur.
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  applyRejectedRun,
  applyRunToStats,
  emptyLifetimeStats,
  statsDelta,
  type BadgeRunInput,
  type LifetimeStats,
} from '../_shared/engine/badges.ts';
import { crewXpForRun, type CrewXpRunInput } from '../_shared/engine/crew.ts';
import { CREW_XP_SOURCES } from '../_shared/game-rules.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PARIS = { lat: 48.8566, lng: 2.3522 };

function mkRun(over: Partial<BadgeRunInput> = {}): BadgeRunInput {
  return {
    status: 'valid',
    startedAt: '2026-07-03T10:00:00+02:00',
    distanceM: 5_000,
    durationS: 1_800,
    avgPaceSKm: 360,
    hexes: { claimed: 5, stolen: 2, defended: 1, pioneer: 1 },
    startPoint: PARIS,
    endPoint: { lat: PARIS.lat, lng: PARIS.lng + 0.02 },
    crewSize: 4,
    duringSeasonZero: true,
    ...over,
  };
}

const emptyCrewRun: CrewXpRunInput = {
  hexesCaptured: 0,
  hexesDefended: 0,
  routesOpened: 0,
  routesDuplicated: 0,
  outpostsMaintained: 0,
  missionsCompleted: 0,
  offensivesCompleted: 0,
  verified: false,
  firstOfWeek: false,
};

/**
 * Métriques qu'AUCUNE course ne produit : elles sont écrites en direct dans
 * user_stats par leurs jobs (clôture d'offensive, sector_control, season_close,
 * rollups hebdo, endpoints V1). Une course ne doit jamais les réécrire.
 */
const JOB_OWNED: readonly (keyof LifetimeStats)[] = [
  'offensivesJoined', // finalize_offensive (0064) — Raid Leader / Strategist
  'sectorsControlled',
  'bestSectorControlPct',
  'holdDays',
  'clustersProtected',
  'sectorsContested',
  'ruralZonesOpened',
  'supplyLines',
  'crewCaptainScore',
  'activeMembersWeek',
  'paceImprovementSKm',
  'formeScore',
  'seasonRank',
  'nationalRank',
  'crewSeasonRank',
  'invitesSent',
  'referralsActivated',
  'reactionsSent',
  'cleanWeeks',
  'balancedWeeks',
  'noPressureWeeks',
];

// ─── 1. offensivesCompleted : pourquoi 0 est la seule valeur honnête ──────────

Deno.test('crewXpForRun : chaque offensive comptée vaut 200 XP POUR CETTE COURSE', () => {
  assertEquals(crewXpForRun({ ...emptyCrewRun, offensivesCompleted: 1 }), 200);
  assertEquals(crewXpForRun({ ...emptyCrewRun, offensivesCompleted: 3 }), 600);
  assertEquals(CREW_XP_SOURCES.offensiveCompleted, 200);
});

Deno.test(
  'offensivesCompleted : un compteur CUMULÉ rejouerait le crédit à chaque course',
  () => {
    // Scénario refusé : « offensives terminées auxquelles le joueur a contribué ».
    // Le joueur en a 3 à son actif ; il court 10 fois de plus sans rien clôturer.
    const cumulative = 3;
    const perRun = crewXpForRun({ ...emptyCrewRun, offensivesCompleted: cumulative });
    assertEquals(perRun, 600);
    // 10 courses ordinaires → 6 000 XP crew tombés de nulle part, en plus des
    // 3 × 200 déjà crédités UNE fois par finalize_offensive.
    assertEquals(perRun * 10, 6_000);
    // La valeur câblée dans ingest_run est 0 : aucune XP d'offensive par course.
    assertEquals(crewXpForRun({ ...emptyCrewRun, offensivesCompleted: 0 }), 0);
  },
);

Deno.test('une course NE clôt aucune offensive : 0 XP d\'offensive, quels que soient les hexes', () => {
  // Même une course très productive ne crédite RIEN au titre des offensives :
  // seuls ses propres postes (hexes, route, vérifiée…) comptent.
  const productive: CrewXpRunInput = {
    ...emptyCrewRun,
    hexesCaptured: 40,
    hexesDefended: 10,
    verified: true,
    offensivesCompleted: 0,
  };
  const expected = 40 * CREW_XP_SOURCES.hexCaptured + 10 * CREW_XP_SOURCES.hexDefended +
    CREW_XP_SOURCES.verifiedRun;
  assertEquals(crewXpForRun(productive), expected);
  assertFalse(expected >= CREW_XP_SOURCES.offensiveCompleted && expected % 200 === 0);
});

// ─── 2. statsDelta : la course n'écrase plus les compteurs des jobs ───────────

Deno.test('statsDelta : ne retourne QUE les clés réellement changées', () => {
  const before = emptyLifetimeStats();
  const after = applyRunToStats(before, mkRun());
  const delta = statsDelta(before, after);
  const keys = Object.keys(delta);
  assert(keys.length > 0, 'une course valide change forcément des compteurs');
  for (const k of keys) {
    assert(
      (after as unknown as Record<string, unknown>)[k] !==
        (before as unknown as Record<string, unknown>)[k],
      `${k} figure dans le delta sans avoir changé`,
    );
  }
  // Contrôle positif : les compteurs run-fed y sont bien.
  assertEquals(delta.runsValid, 1);
  assertEquals(delta.hexesCaptured, 7); // 5 claimed + 2 stolen
  assertEquals(delta.steals, 2);
});

Deno.test('statsDelta : stats identiques → delta vide (aucune colonne réécrite)', () => {
  const s = emptyLifetimeStats();
  assertEquals(Object.keys(statsDelta(s, s)).length, 0);
  // Course non valide : applyRunToStats renvoie l'objet inchangé.
  const rejected = applyRunToStats(s, mkRun({ status: 'rejected' }));
  assertEquals(Object.keys(statsDelta(s, rejected)).length, 0);
});

Deno.test('statsDelta : AUCUNE métrique de job dans le delta d\'une course', () => {
  // Départ RÉALISTE : le joueur a déjà des crédits de jobs (2 offensives
  // rejointes, des secteurs, un rang de saison). Une course ne doit pas les
  // republier — sinon un crédit concurrent est perdu.
  const before: LifetimeStats = {
    ...emptyLifetimeStats(),
    offensivesJoined: 2,
    sectorsControlled: 3,
    seasonRank: 12,
    holdDays: 40,
  };
  const after = applyRunToStats(before, mkRun());
  const delta = statsDelta(before, after);
  for (const key of JOB_OWNED) {
    assertFalse(key in delta, `${key} (métrique de job) réécrite par une course`);
  }
  // Les valeurs de job survivent telles quelles côté moteur.
  assertEquals(after.offensivesJoined, 2);
});

Deno.test(
  'lost update : un finalize_offensive concurrent n\'est plus effacé par la course',
  () => {
    // T0 — ingest_run LIT user_stats : offensives_joined = 2.
    const readAtT0: LifetimeStats = { ...emptyLifetimeStats(), offensivesJoined: 2 };
    // T1 — le job de clôture crédite +1 EN BASE (ingest_run l'ignore).
    const dbAtT1: Record<string, unknown> = { offensives_joined: 3 };
    // T2 — ingest_run écrit. Seules les colonnes du delta partent dans l'UPDATE.
    const after = applyRunToStats(readAtT0, mkRun());
    const delta = statsDelta(readAtT0, after) as unknown as Record<string, unknown>;
    const camelToSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    for (const [k, v] of Object.entries(delta)) dbAtT1[camelToSnake(k)] = v;
    // Le crédit du job tient : le badge ne recule pas.
    assertEquals(dbAtT1.offensives_joined, 3);
    // …et la course a bien été comptabilisée.
    assertEquals(dbAtT1.runs_valid, 1);
  },
);

Deno.test('statsDelta : les clés OMISES valent exactement le DEFAULT SQL (INSERT)', () => {
  // Joueur sans ligne user_stats : l'INSERT n'envoie que le delta, les autres
  // colonnes prennent leur DEFAULT (0 / NULL, migrations 0007/0009/0012). Ce
  // n'est honnête que si `after` vaut ce défaut pour chaque clé omise.
  const empty = emptyLifetimeStats();
  const after = applyRunToStats(empty, mkRun());
  const delta = statsDelta(empty, after) as unknown as Record<string, unknown>;
  const bag = after as unknown as Record<string, unknown>;
  const dflt = empty as unknown as Record<string, unknown>;
  for (const key of Object.keys(bag)) {
    if (key in delta) continue;
    assertEquals(bag[key], dflt[key], `${key} omis mais différent du défaut`);
  }
  // Tous les défauts sont 0 ou NULL — rien d'inventé.
  for (const v of Object.values(dflt)) assert(v === 0 || v === null, `défaut inattendu: ${v}`);
});

Deno.test('statsDelta : une course REJETÉE n\'écrit que la trace du rejet', () => {
  const before: LifetimeStats = { ...emptyLifetimeStats(), offensivesJoined: 5, cleanDays: 9 };
  const after = applyRejectedRun(before, '2026-07-03T10:00:00+02:00');
  const delta = statsDelta(before, after);
  assertEquals(Object.keys(delta).sort(), ['cleanDays', 'lastRejectedDay']);
  assertEquals(delta.cleanDays, 0);
  assertEquals(delta.lastRejectedDay, '2026-07-03');
  assertFalse('offensivesJoined' in delta);
});

Deno.test('statsDelta : passage null → valeur détecté (homeSpotH3, lastActiveDay)', () => {
  const before = emptyLifetimeStats();
  assertEquals(before.homeSpotH3, null);
  const after = applyRunToStats(before, mkRun());
  const delta = statsDelta(before, after);
  assert('homeSpotH3' in delta, 'première cellule H3 de départ non écrite');
  assert(typeof delta.homeSpotH3 === 'string');
  assertEquals(delta.lastActiveDay, '2026-07-03');
});
