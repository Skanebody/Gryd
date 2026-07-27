/**
 * GRYD — tests de engine/contest.ts (§9 contestation et défense).
 *
 * Ce que ces tests VERROUILLENT, ce sont des RÈGLES DE JEU, pas des
 * implémentations : à partir de quel recouvrement une zone est remise en jeu,
 * combien de temps son propriétaire a pour la sauver, ce qui compte comme une
 * défense, et ce qui se passe à la seconde d'après. Ils sont écrits en français
 * parce qu'ils se relisent comme la règle : si le titre d'un test devient faux,
 * c'est le jeu qui a changé, pas le code.
 *
 * BORDS COUVERTS EXPRÈS (ce sont eux qui coûtent cher en production) :
 *  · un recouvrement de EXACTEMENT 60 % ;
 *  · une défense terminée UNE SECONDE après l'échéance ;
 *  · une défense d'un TIERS (ni le propriétaire, ni son crew) ;
 *  · une DOUBLE résolution (le cron qui repasse).
 *
 * MÊMES CONTRAINTES D'OUTILLAGE que polygon.test.ts, pour les mêmes raisons :
 * aucun import externe (le tsconfig du paquet typecheckerait un spécificateur
 * `jsr:`), et le global `Deno` déclaré localement (le paquet est `"type":
 * "module"`, Deno n'y injecte pas la lib `deno.ns`).
 */
import {
  contestDeadline,
  decayedDefenseLevel,
  defenseWindowHours,
  isDefenseValid,
  nextDefenseLevel,
  resolveContest,
  shouldContest,
  type ContestSnapshot,
  type DefenseActivity,
} from './contest.ts';
import {
  BASE_DEFENSE_WINDOW_HOURS,
  CONTEST_INTERSECTION_THRESHOLD,
  FORTIFICATION_WINDOW_HOURS_BY_LEVEL,
  MIN_POLYGON_AREA_M2,
  NEW_PLAYER_PROTECTION_DAYS,
} from '@klaim/shared/game-rules';
import type { LatLngPoint } from './hexing.ts';

// Voir le docblock : le runner Deno, typé localement.
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

// ─── Assertions minimales ────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEgal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  attendu : ${e}\n  obtenu  : ${a}`);
}

function assertProche(actual: number, expected: number, tolerance: number, quoi: string): void {
  const ecart = expected === 0 ? Math.abs(actual) : Math.abs(actual - expected) / Math.abs(expected);
  if (ecart > tolerance) {
    throw new Error(`${quoi} : attendu ${expected}, obtenu ${actual}`);
  }
}

// ─── Fabrique de géométries (identique à polygon.test.ts) ────────────────────

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 48.85, lng: 2.35 };
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);

function pt(xM: number, yM: number): LatLngPoint {
  return {
    lat: ORIGINE.lat + yM / (RAD_PER_DEG * EARTH_RADIUS_M),
    lng: ORIGINE.lng + xM / (RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0),
  };
}

/** Rectangle CCW : coin bas-gauche + taille, en mètres. */
function rect(x0: number, y0: number, largeurM: number, hauteurM: number): LatLngPoint[] {
  return [
    pt(x0, y0),
    pt(x0 + largeurM, y0),
    pt(x0 + largeurM, y0 + hauteurM),
    pt(x0, y0 + hauteurM),
  ];
}

/** La zone possédée de référence : 400 m × 400 m = 160 000 m² (≫ MIN_POLYGON_AREA_M2). */
const ZONE = rect(0, 0, 400, 400);

/** Boucle rivale couvrant `fraction` de ZONE par la gauche, sur toute sa hauteur. */
function boucleCouvrant(fraction: number): LatLngPoint[] {
  return rect(0, 0, 400 * fraction, 400);
}

const HEURE = 3_600_000;
const JOUR = 86_400_000;
const T0 = Date.UTC(2026, 6, 27, 8, 0, 0); // 27/07/2026 08:00 UTC

// ═══ §9.1 — DÉCLENCHEMENT ═══════════════════════════════════════════════════

Deno.test('une boucle rivale qui couvre tout le territoire le conteste', () => {
  const d = shouldContest(rect(0, 0, 400, 400), ZONE);
  assert(d.contested, 'une couverture totale doit contester');
  assertEgal(d.reason, 'overlap_reaches_threshold', 'motif');
  assertProche(d.overlapRatio, 1, 1e-6, 'recouvrement');
});

Deno.test('un recouvrement de EXACTEMENT 60 % conteste (le seuil est atteint, pas dépassé)', () => {
  const d = shouldContest(boucleCouvrant(CONTEST_INTERSECTION_THRESHOLD), ZONE);
  assertProche(d.overlapRatio, CONTEST_INTERSECTION_THRESHOLD, 1e-6, 'recouvrement');
  assert(d.contested, 'à 60 % pile, la zone DOIT être contestée — un arrondi ne doit pas la sauver');
});

Deno.test('un recouvrement juste sous le seuil ne conteste pas, et le dit avec son chiffre', () => {
  const d = shouldContest(boucleCouvrant(CONTEST_INTERSECTION_THRESHOLD - 0.05), ZONE);
  assert(!d.contested, '55 % ne doit pas contester');
  assertEgal(d.reason, 'overlap_below_threshold', 'motif');
  assertProche(d.overlapRatio, 0.55, 1e-3, 'le ratio réel doit rester lisible par l’écran');
  assertEgal(d.threshold, CONTEST_INTERSECTION_THRESHOLD, 'seuil rendu');
});

Deno.test('le sens de la mesure n’est pas symétrique : une petite boucle incluse ne conteste pas', () => {
  // 100 m × 100 m au cœur de la zone : couverte à 100 % par ZONE, mais ne couvre
  // que 6,25 % de ZONE. C'est la zone VISÉE que l'on mesure.
  const petite = rect(150, 150, 100, 100);
  const d = shouldContest(petite, ZONE);
  assert(!d.contested, 'un tour de pâté de maisons ne remet pas un quartier en jeu');
  assertProche(d.overlapRatio, 0.0625, 1e-3, 'recouvrement de la zone visée');
});

Deno.test('une boucle plus petite que la surface minimale d’un territoire ne conteste rien', () => {
  // 60 m × 60 m = 3 600 m² < MIN_POLYGON_AREA_M2 (5 000). Elle couvre pourtant
  // 100 % d'un micro-territoire de même taille : la surface prime.
  const micro = rect(0, 0, 60, 60);
  assert(3600 < MIN_POLYGON_AREA_M2, 'prérequis du test : 3 600 m² sous le plancher');
  const d = shouldContest(micro, micro);
  assert(!d.contested, 'sous le plancher de surface, pas de contestation');
  assertEgal(d.reason, 'attacker_area_below_minimum', 'motif');
});

Deno.test('une boucle non fermée ou recalée par l’anti-triche ne conteste rien', () => {
  const total = rect(0, 0, 400, 400);
  assertEgal(
    shouldContest(total, ZONE, { attackerLoopClosed: false }).reason,
    'attacker_loop_not_closed',
    'boucle ouverte',
  );
  assertEgal(
    shouldContest(total, ZONE, { attackerAntiCheatPassed: false }).reason,
    'attacker_anti_cheat_failed',
    'anti-triche',
  );
});

Deno.test('une géométrie dégénérée ne conteste rien et ne rend jamais NaN', () => {
  const d = shouldContest([pt(0, 0), pt(10, 0)], ZONE);
  assert(!d.contested, 'deux points ne font pas un territoire');
  assertEgal(d.reason, 'attacker_polygon_degenerate', 'motif');
  assertEgal(d.overlapRatio, 0, 'ratio : 0, jamais NaN');
  assertEgal(
    shouldContest(ZONE, [pt(0, 0), pt(10, 0)]).reason,
    'defender_polygon_degenerate',
    'territoire visé dégénéré',
  );
});

Deno.test('le territoire d’un joueur encore sous protection d’onboarding n’est pas contestable', () => {
  const total = rect(0, 0, 400, 400);
  const cree = T0;
  const avant = shouldContest(total, ZONE, {
    defenderOnboarding: { ownerCreatedAtMs: cree, nowMs: cree + 13 * JOUR },
  });
  assert(!avant.contested, 'à J+13, le nouveau joueur reste protégé');
  assertEgal(avant.reason, 'defender_under_onboarding_protection', 'motif');
  assertProche(avant.overlapRatio, 1, 1e-6, 'le recouvrement réel reste affiché, on ne le cache pas');

  const apres = shouldContest(total, ZONE, {
    defenderOnboarding: {
      ownerCreatedAtMs: cree,
      nowMs: cree + NEW_PLAYER_PROTECTION_DAYS * JOUR + 1,
    },
  });
  assert(apres.contested, 'la protection d’onboarding expire, elle ne dure pas');
});

// ═══ §9.2 — FORTIFICATION ═══════════════════════════════════════════════════

Deno.test('la fenêtre de défense va de 18 h au niveau 0 à 36 h au niveau 3', () => {
  assertEgal(defenseWindowHours(0), BASE_DEFENSE_WINDOW_HOURS, 'niveau 0 = fenêtre de base');
  assertEgal(
    [0, 1, 2, 3].map(defenseWindowHours),
    [...FORTIFICATION_WINDOW_HOURS_BY_LEVEL],
    'table §9.2',
  );
});

Deno.test('un niveau hors bornes est ramené dans 0-3 plutôt que de produire une échéance absurde', () => {
  assertEgal(defenseWindowHours(-2), FORTIFICATION_WINDOW_HOURS_BY_LEVEL[0], 'sous 0');
  assertEgal(defenseWindowHours(9), FORTIFICATION_WINDOW_HOURS_BY_LEVEL[3], 'au-dessus de 3');
  assert(Number.isFinite(contestDeadline(T0, Number.NaN)), 'une échéance ne doit jamais être NaN');
});

Deno.test('l’échéance est le début de la contestation plus la fenêtre du niveau', () => {
  assertEgal(contestDeadline(T0, 0), T0 + 18 * HEURE, 'niveau 0');
  assertEgal(contestDeadline(T0, 3), T0 + 36 * HEURE, 'niveau 3');
});

Deno.test('l’échéance ne dépend pas de l’instant où on la calcule', () => {
  // Aucune horloge n'entre dans contestDeadline : la recalculer trois jours plus
  // tard rend la même date. C'est ce qui rend le cron d'échéance rejouable.
  assertEgal(contestDeadline(T0, 2), contestDeadline(T0, 2), 'même entrée, même sortie');
});

Deno.test('la fortification monte d’un cran par défense réussie et plafonne au niveau 3', () => {
  assertEgal(nextDefenseLevel(0, 'defended'), 1, '0 → 1');
  assertEgal(nextDefenseLevel(2, 'defended'), 3, '2 → 3');
  assertEgal(nextDefenseLevel(3, 'defended'), 3, 'le niveau 3 est un plafond');
});

Deno.test('le nouveau propriétaire n’hérite jamais du bouclier de celui qu’il vient de battre', () => {
  assertEgal(nextDefenseLevel(3, 'transferred'), 0, 'transfert → niveau 0');
});

Deno.test('une contestation annulée ne change pas la fortification', () => {
  assertEgal(nextDefenseLevel(2, 'cancelled'), 2, 'annulation → inchangé');
});

Deno.test('un cran de fortification ne survit pas à sa propre fenêtre sans défense', () => {
  const base = { level: 3, lastDefendedAtMs: T0 };
  assertEgal(decayedDefenseLevel({ ...base, nowMs: T0 + 35 * HEURE }), 3, 'avant 36 h : intact');
  assertEgal(decayedDefenseLevel({ ...base, nowMs: T0 + 36 * HEURE }), 2, 'à 36 h : 3 → 2');
  assertEgal(decayedDefenseLevel({ ...base, nowMs: T0 + 66 * HEURE }), 1, '+30 h : 2 → 1');
  assertEgal(decayedDefenseLevel({ ...base, nowMs: T0 + 90 * HEURE }), 0, '+24 h : 1 → 0');
  assertEgal(decayedDefenseLevel({ ...base, nowMs: T0 + 400 * HEURE }), 0, 'jamais sous 0');
});

Deno.test('sans date de dernière défense connue, la fortification n’est pas devinée', () => {
  assertEgal(
    decayedDefenseLevel({ level: 2, lastDefendedAtMs: null, nowMs: T0 + 500 * HEURE }),
    2,
    'donnée manquante ⇒ niveau rendu tel quel, jamais supposé',
  );
});

// ═══ §9.3 — DÉFENSE VALIDE ══════════════════════════════════════════════════

const PROPRIO = 'user-proprietaire';
const CREW = 'crew-proprietaire';
const TIERS = 'user-tiers';
const ASSAILLANT = 'user-assaillant';

function contestation(over: Partial<ContestSnapshot> = {}): ContestSnapshot {
  return {
    territoryId: 'territoire-1',
    owner: { type: 'user', id: PROPRIO },
    attacker: { type: 'user', id: ASSAILLANT },
    polygon: ZONE,
    startedAtMs: T0,
    expiresAtMs: contestDeadline(T0, 0),
    status: 'active',
    defenseLevel: 0,
    resolvedAtMs: null,
    ...over,
  };
}

function defense(over: Partial<DefenseActivity> = {}): DefenseActivity {
  return {
    activityId: 'act-1',
    actorUserId: PROPRIO,
    actorCrewId: null,
    polygon: rect(0, 0, 400, 400),
    closedLoop: true,
    finishedAtMs: T0 + 2 * HEURE,
    antiCheatPassed: true,
    ...over,
  };
}

const NOW_APRES = contestDeadline(T0, 0) + HEURE;

Deno.test('une boucle du propriétaire, fermée, couvrante et dans les temps, défend la zone', () => {
  const v = isDefenseValid({ contest: contestation(), defenseActivity: defense(), nowMs: NOW_APRES });
  assert(v.valid, `la défense nominale doit être valide (motif rendu : ${v.reason})`);
  assertEgal(v.reason, 'valid', 'motif');
});

Deno.test('une défense d’un TIERS ne défend rien, même parfaite par ailleurs', () => {
  const v = isDefenseValid({
    contest: contestation(),
    defenseActivity: defense({ actorUserId: TIERS }),
    nowMs: NOW_APRES,
  });
  assert(!v.valid, 'un tiers ne défend pas le territoire d’un autre');
  assertEgal(v.reason, 'not_owner_activity', 'motif');
});

Deno.test('sur un territoire de crew, un membre du crew défend ; un membre d’un autre crew non', () => {
  const c = contestation({ owner: { type: 'crew', id: CREW } });
  const membre = isDefenseValid({
    contest: c,
    defenseActivity: defense({ actorUserId: TIERS, actorCrewId: CREW }),
    nowMs: NOW_APRES,
  });
  assert(membre.valid, 'un membre du crew propriétaire défend le territoire du crew');

  const autre = isDefenseValid({
    contest: c,
    defenseActivity: defense({ actorUserId: TIERS, actorCrewId: 'crew-rival' }),
    nowMs: NOW_APRES,
  });
  assertEgal(autre.reason, 'not_owner_activity', 'un autre crew ne défend pas');

  const sansCrew = isDefenseValid({
    contest: c,
    defenseActivity: defense({ actorUserId: PROPRIO, actorCrewId: null }),
    nowMs: NOW_APRES,
  });
  assertEgal(sansCrew.reason, 'not_owner_activity', 'sans crew connu, rien n’est supposé');
});

Deno.test('une défense terminée UNE SECONDE après l’échéance ne compte pas', () => {
  const c = contestation();
  const juste = isDefenseValid({
    contest: c,
    defenseActivity: defense({ finishedAtMs: c.expiresAtMs }),
    nowMs: NOW_APRES,
  });
  assert(juste.valid, 'terminée PILE à l’échéance : elle compte');

  const trop = isDefenseValid({
    contest: c,
    defenseActivity: defense({ finishedAtMs: c.expiresAtMs + 1000 }),
    nowMs: NOW_APRES,
  });
  assert(!trop.valid, 'une seconde de trop et la zone est perdue — c’est la règle');
  assertEgal(trop.reason, 'finished_after_deadline', 'motif');
});

Deno.test('une course terminée AVANT l’ouverture de la contestation ne la défend pas', () => {
  const v = isDefenseValid({
    contest: contestation(),
    defenseActivity: defense({ finishedAtMs: T0 - HEURE }),
    nowMs: NOW_APRES,
  });
  assertEgal(v.reason, 'finished_before_contest', 'on ne défend pas par anticipation');
});

Deno.test('une activité terminée dans le futur est rejetée (horloge client, jamais crue)', () => {
  const v = isDefenseValid({
    contest: contestation(),
    defenseActivity: defense({ finishedAtMs: T0 + 3 * HEURE }),
    nowMs: T0 + HEURE,
  });
  assertEgal(v.reason, 'finished_in_future', 'motif');
});

Deno.test('une boucle ouverte ou recalée par l’anti-triche ne défend pas', () => {
  assertEgal(
    isDefenseValid({
      contest: contestation(),
      defenseActivity: defense({ closedLoop: false }),
      nowMs: NOW_APRES,
    }).reason,
    'loop_not_closed',
    'boucle ouverte',
  );
  assertEgal(
    isDefenseValid({
      contest: contestation(),
      defenseActivity: defense({ antiCheatPassed: false }),
      nowMs: NOW_APRES,
    }).reason,
    'anti_cheat_failed',
    'anti-triche',
  );
});

Deno.test('défendre exige AUTANT que conquérir : le même seuil des deux côtés', () => {
  const insuffisante = isDefenseValid({
    contest: contestation(),
    defenseActivity: defense({ polygon: boucleCouvrant(CONTEST_INTERSECTION_THRESHOLD - 0.05) }),
    nowMs: NOW_APRES,
  });
  assert(!insuffisante.valid, '55 % ne défend pas');
  assertEgal(insuffisante.reason, 'overlap_below_threshold', 'motif');
  assertEgal(insuffisante.threshold, CONTEST_INTERSECTION_THRESHOLD, 'même seuil qu’en §9.1');

  const pile = isDefenseValid({
    contest: contestation(),
    defenseActivity: defense({ polygon: boucleCouvrant(CONTEST_INTERSECTION_THRESHOLD) }),
    nowMs: NOW_APRES,
  });
  assert(pile.valid, 'à 60 % pile, la défense compte');
});

Deno.test('sur une contestation déjà tranchée, plus aucune défense n’est recevable', () => {
  const v = isDefenseValid({
    contest: contestation({ status: 'transferred', resolvedAtMs: contestDeadline(T0, 0) }),
    defenseActivity: defense(),
    nowMs: NOW_APRES,
  });
  assertEgal(v.reason, 'contest_not_active', 'motif');
});

// ═══ §9.4 — RÉSOLUTION ══════════════════════════════════════════════════════

Deno.test('avant l’échéance, rien n’est tranché — mais la défense déjà enregistrée est signalée', () => {
  const r = resolveContest({
    contest: contestation(),
    defenses: [defense()],
    nowMs: T0 + HEURE * 3,
  });
  assertEgal(r.status, 'active', 'statut');
  assertEgal(r.reason, 'deadline_not_reached', 'motif');
  assertEgal(r.resolvedAtMs, null, 'aucune date de résolution avant l’échéance');
  assert(r.hasValidDefense, 'l’écran doit pouvoir dire « défense enregistrée »');
});

Deno.test('à l’échéance sans défense valide, le territoire est TRANSFÉRÉ à l’assaillant', () => {
  const c = contestation();
  const r = resolveContest({ contest: c, defenses: [], nowMs: c.expiresAtMs });
  assertEgal(r.status, 'transferred', 'statut');
  assertEgal(r.newOwner, { type: 'user', id: ASSAILLANT }, 'nouveau propriétaire');
  assertEgal(r.defenseLevel, 0, 'le repreneur repart au niveau 0');
  assertEgal(r.resolvedAtMs, c.expiresAtMs, 'résolu À l’échéance, pas à l’heure du cron');
});

Deno.test('à l’échéance avec une défense valide, la propriété est CONSERVÉE et la zone se fortifie', () => {
  const c = contestation();
  const r = resolveContest({ contest: c, defenses: [defense()], nowMs: c.expiresAtMs });
  assertEgal(r.status, 'defended', 'statut');
  assertEgal(r.newOwner, null, 'aucun changement de propriétaire');
  assertEgal(r.defenseLevel, 1, 'une défense réussie fortifie la zone');
  assertEgal(r.winningDefenseId, 'act-1', 'la défense retenue est nommée');
});

Deno.test('une défense invalide ne sauve rien : la zone part quand même', () => {
  const c = contestation();
  const r = resolveContest({
    contest: c,
    defenses: [defense({ actorUserId: TIERS }), defense({ activityId: 'act-2', closedLoop: false })],
    nowMs: c.expiresAtMs,
  });
  assertEgal(r.status, 'transferred', 'deux défenses invalides ne font pas une valide');
  assertEgal(r.winningDefenseId, null, 'aucune défense retenue');
});

Deno.test('entre plusieurs défenses valides, c’est la plus ancienne qui sauve la zone', () => {
  const c = contestation();
  const r = resolveContest({
    contest: c,
    defenses: [
      defense({ activityId: 'act-tard', finishedAtMs: T0 + 5 * HEURE }),
      defense({ activityId: 'act-tot', finishedAtMs: T0 + 2 * HEURE }),
    ],
    nowMs: c.expiresAtMs,
  });
  assertEgal(r.winningDefenseId, 'act-tot', 'celle qui a réellement sauvé la zone');
});

Deno.test('à date de fin identique, le départage est stable et ne dépend pas de l’ordre reçu', () => {
  const c = contestation();
  const a = defense({ activityId: 'act-a' });
  const b = defense({ activityId: 'act-b' });
  const r1 = resolveContest({ contest: c, defenses: [a, b], nowMs: c.expiresAtMs });
  const r2 = resolveContest({ contest: c, defenses: [b, a], nowMs: c.expiresAtMs });
  assertEgal(r1.winningDefenseId, 'act-a', 'départage déterministe');
  assertEgal(r1, r2, 'l’ordre du tableau ne change pas le verdict');
});

Deno.test('rejouer la résolution donne EXACTEMENT le même verdict (cron rejoué, doublons)', () => {
  const c = contestation();
  const premier = resolveContest({ contest: c, defenses: [], nowMs: c.expiresAtMs });
  const tardif = resolveContest({ contest: c, defenses: [], nowMs: c.expiresAtMs + 3 * 24 * HEURE });
  assertEgal(premier, tardif, 'passé l’échéance, le verdict ne dépend plus de l’heure du cron');
});

Deno.test('une contestation déjà résolue n’est pas rejugée : le second passage est un no-op', () => {
  const c = contestation();
  const applique = contestation({
    status: 'transferred',
    resolvedAtMs: c.expiresAtMs,
    defenseLevel: 0,
  });
  // La défense arrive APRÈS coup : elle ne doit pas renverser un transfert déjà écrit.
  const r = resolveContest({
    contest: applique,
    defenses: [defense()],
    nowMs: c.expiresAtMs + 10 * HEURE,
  });
  assertEgal(r.status, 'transferred', 'le verdict existant est rendu tel quel');
  assertEgal(r.reason, 'already_resolved', 'motif');
  assertEgal(r.resolvedAtMs, c.expiresAtMs, 'la date de résolution n’est pas réécrite');
  assertEgal(r.newOwner, null, 'aucun second transfert');
});

Deno.test('une contestation annulée reste annulée — resolveContest ne l’invente ni ne la lève', () => {
  const r = resolveContest({
    contest: contestation({ status: 'cancelled', resolvedAtMs: T0 + HEURE }),
    defenses: [defense()],
    nowMs: NOW_APRES,
  });
  assertEgal(r.status, 'cancelled', 'statut inchangé');
  assertEgal(r.reason, 'already_resolved', 'motif');
});

Deno.test('une fenêtre fortifiée laisse réellement plus de temps pour défendre', () => {
  // La MÊME course, à la MÊME heure : perdue au niveau 0, gagnée au niveau 2.
  const finMs = T0 + 20 * HEURE; // > 18 h (niveau 0), < 30 h (niveau 2)
  const niveau0 = contestation({ defenseLevel: 0, expiresAtMs: contestDeadline(T0, 0) });
  const niveau2 = contestation({ defenseLevel: 2, expiresAtMs: contestDeadline(T0, 2) });
  const act = defense({ finishedAtMs: finMs });

  assertEgal(
    resolveContest({ contest: niveau0, defenses: [act], nowMs: niveau0.expiresAtMs }).status,
    'transferred',
    'au niveau 0, la course arrive trop tard',
  );
  assertEgal(
    resolveContest({ contest: niveau2, defenses: [act], nowMs: niveau2.expiresAtMs }).status,
    'defended',
    'au niveau 2, la même course sauve la zone',
  );
});
