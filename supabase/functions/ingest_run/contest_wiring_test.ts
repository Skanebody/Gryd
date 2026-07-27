/**
 * GRYD — CÂBLAGE DE LA CONTESTATION (§9), LOT 3 SUITE. Tests PURS.
 *
 * ═══ CE QUI EST VERROUILLÉ ICI, ET POURQUOI CES CAS-LÀ ══════════════════════
 * Le moteur (`contest.ts`, 36 tests) sait déjà décider. Ce qui peut être faux
 * ICI, c'est le CÂBLAGE — et un câblage faux ne plante pas, il attribue le
 * territoire à la mauvaise personne. Cinq façons de se tromper, une famille de
 * tests chacune :
 *
 *  1. ATTAQUER QUI IL NE FAUT PAS. Sa propre zone, celle de son crew, une zone
 *     déjà contestée, une zone d'un joueur encore sous protection d'onboarding.
 *     Chacune est un vol qui n'aurait jamais dû s'ouvrir.
 *  2. OUVRIR DEUX FOIS. Rejouer l'ingestion, ou deux rivaux le même soir : 0078
 *     refuserait le second insert, mais une règle de jeu ne doit pas être
 *     tranchée par un code d'erreur SQL — le PLAN doit déjà le savoir.
 *  3. SE TROMPER DE FENÊTRE. La durée vient du niveau de fortification DÉCRU,
 *     pas du niveau stocké ; et elle part de l'INGESTION, pas de la fin de
 *     course (sinon un GPX vieux de trois semaines ouvre une fenêtre déjà
 *     expirée et le propriétaire perd sans avoir pu défendre).
 *  4. MAL JUGER LA DÉFENSE. Une défense valide doit clore la contestation ET
 *     monter la fortification ; une défense insuffisante ne doit rien clore —
 *     et surtout pas se transformer en attaque contre soi-même.
 *  5. NE RIEN DIRE. Un territoire écarté sans motif est un silence : l'écran ne
 *     peut plus expliquer « ta boucle couvre 42 %, il en faut 60 % ».
 *
 * Un dernier test regarde `index.ts` : un module pur que personne n'appelle ne
 * protège rien.
 *
 * Géométrie : repère local plan centré Paris (mêmes conversions que
 * `territory_test.ts`). AUCUN seuil n'est écrit en dur — tout vient de
 * game-rules.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  CONTEST_INTERSECTION_THRESHOLD,
  FORTIFICATION_WINDOW_HOURS_BY_LEVEL,
  MIN_POLYGON_AREA_M2,
  NEW_PLAYER_PROTECTION_DAYS,
} from '../_shared/game-rules.ts';
import { polygonAreaM2, toGeoJsonPolygon } from '../_shared/engine/polygon.ts';
import type { LatLngPoint } from '../_shared/engine/hexing.ts';
import {
  type CandidateTerritory,
  type ContestWiringInput,
  type ExistingContest,
  ownedStateFor,
  planContestWiring,
  ringFromGeometry,
  type RunnerActivity,
  TERRITORY_STATE_CONTESTED,
  TERRITORY_STATE_DEFENDED,
} from './contest_wiring.ts';

// ─── Repère local Paris ─────────────────────────────────────────────────────
const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);
const at = (xM: number, yM: number): LatLngPoint => ({
  lat: LAT0 + yM / M_PER_DEG_LAT,
  lng: LNG0 + xM / M_PER_DEG_LNG,
});

/** Carré de côté `side` m dont le coin bas-gauche est à (x0, y0). */
const square = (x0: number, y0: number, side: number): LatLngPoint[] => [
  at(x0, y0),
  at(x0 + side, y0),
  at(x0 + side, y0 + side),
  at(x0, y0 + side),
];

/**
 * Côté d'un carré confortablement AU-DESSUS de `MIN_POLYGON_AREA_M2` (§1.4) :
 * dérivé du plancher, jamais choisi à la main. ×4 en aire — assez pour que les
 * sous-recouvrements testés restent eux aussi au-dessus du plancher.
 */
const SIDE = Math.ceil(2 * Math.sqrt(MIN_POLYGON_AREA_M2));

const H = 3_600_000;
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);

const ME = 'aaaaaaaa-0000-0000-0000-000000000001';
const RIVAL = 'bbbbbbbb-0000-0000-0000-000000000002';
const MY_CREW = 'cccccccc-0000-0000-0000-000000000003';
const RUN = 'dddddddd-0000-0000-0000-000000000004';

/**
 * Territoire d'un tiers, carré `SIDE`, en (0,0), niveau 0, propriétaire ancien
 * (donc HORS protection d'onboarding — sinon tous les tests d'attaque
 * échoueraient pour la mauvaise raison).
 */
const territory = (over: Partial<CandidateTerritory> = {}): CandidateTerritory => ({
  id: 'T1',
  ownerType: 'user',
  ownerId: RIVAL,
  state: 'owned_personal',
  defenseLevel: 0,
  geometry: toGeoJsonPolygon(square(0, 0, SIDE)),
  ownerCreatedAtMs: NOW - (NEW_PLAYER_PROTECTION_DAYS + 1) * DAY,
  ...over,
});

/** Course du joueur ME : boucle qui recouvre EXACTEMENT le carré (0,0). */
const activity = (over: Partial<RunnerActivity> = {}): RunnerActivity => ({
  runId: RUN,
  actorUserId: ME,
  actorCrewId: null,
  polygon: square(0, 0, SIDE),
  loopClosed: true,
  antiCheatPassed: true,
  finishedAtMs: NOW - 10 * 60_000,
  ...over,
});

const plan = (over: Partial<ContestWiringInput> = {}) =>
  planContestWiring({
    activity: activity(),
    candidates: [territory()],
    contests: [],
    nowMs: NOW,
    ...over,
  });

const contestRow = (over: Partial<ExistingContest> = {}): ExistingContest => ({
  id: 'C1',
  territoryId: 'T1',
  status: 'active',
  attackerType: 'user',
  attackerId: RIVAL,
  startedAtMs: NOW - 2 * H,
  expiresAtMs: NOW + 16 * H,
  resolvedAtMs: null,
  ...over,
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. OUVERTURE — une boucle rivale valide CONTESTE, elle ne vole pas
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('une boucle rivale qui recouvre la zone OUVRE une contestation (§9.1)', () => {
  const p = plan();
  assertEquals(p.opens.length, 1);
  assertEquals(p.defenses.length, 0);
  const open = p.opens[0]!;
  assertEquals(open.territoryId, 'T1');
  assertEquals(open.attackerId, ME);
  assertEquals(open.sourceActivityId, RUN);
  assert(
    open.overlapRatio >= CONTEST_INTERSECTION_THRESHOLD,
    `recouvrement ${open.overlapRatio} sous le seuil`,
  );
});

Deno.test("l'assaillant est TOUJOURS un joueur, jamais son crew (crew = LOT 7)", () => {
  const p = plan({ activity: activity({ actorCrewId: MY_CREW }) });
  assertEquals(p.opens.length, 1);
  assertEquals(p.opens[0]!.attackerType, 'user');
  assertEquals(p.opens[0]!.attackerId, ME);
});

Deno.test('un simple frôlement ne conteste rien, et le CHIFFRE est rendu', () => {
  // Boucle décalée de 70 % du côté : recouvrement ≈ 30 % × 100 % = 30 % < 60 %.
  const p = plan({ activity: activity({ polygon: square(0.7 * SIDE, 0, SIDE) }) });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped.length, 1);
  assertEquals(p.skipped[0]!.reason, 'overlap_below_threshold');
  assert(p.skipped[0]!.overlapRatio > 0, 'le recouvrement mesuré doit être rendu');
  assert(p.skipped[0]!.overlapRatio < CONTEST_INTERSECTION_THRESHOLD);
});

Deno.test('une course sans boucle fermée ne conteste rien, et le DIT', () => {
  const p = plan({ activity: activity({ polygon: null, loopClosed: false }) });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped.map((s) => s.reason), ['no_attacker_polygon']);
});

Deno.test("une boucle qui a échoué à l'anti-triche ne conteste rien (§11)", () => {
  const p = plan({ activity: activity({ antiCheatPassed: false }) });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped[0]!.reason, 'attacker_anti_cheat_failed');
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. QUI ON N'ATTAQUE PAS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('on ne conteste JAMAIS sa propre zone', () => {
  const p = plan({ candidates: [territory({ ownerId: ME })] });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped.map((s) => s.reason), ['own_territory']);
});

Deno.test('on ne conteste JAMAIS la zone de son propre crew', () => {
  const p = plan({
    activity: activity({ actorCrewId: MY_CREW }),
    candidates: [territory({ ownerType: 'crew', ownerId: MY_CREW, state: 'owned_crew' })],
  });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped.map((s) => s.reason), ['own_crew_territory']);
});

Deno.test('un propriétaire encore sous protection d’onboarding n’est pas contesté', () => {
  const p = plan({
    candidates: [territory({ ownerCreatedAtMs: NOW - 2 * DAY })],
  });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped[0]!.reason, 'defender_under_onboarding_protection');
  // Le chiffre reste rendu MÊME quand la contestation est refusée : l'écran doit
  // pouvoir dire « tu couvrais 100 % » sans re-dériver la règle.
  assert(p.skipped[0]!.overlapRatio >= CONTEST_INTERSECTION_THRESHOLD);
});

Deno.test('une date de création INCONNUE n’est pas présumée hors protection… ni dedans', () => {
  // `ownerCreatedAtMs: null` ⇒ garde-fou NON ÉVALUÉ (contrat de `ContestGate`).
  // La contestation s'ouvre : c'est le comportement du moteur, verrouillé ici
  // pour qu'il reste une DÉCISION et non un effet de bord d'une lecture ratée.
  const p = plan({ candidates: [territory({ ownerCreatedAtMs: null })] });
  assertEquals(p.opens.length, 1);
});

Deno.test('une géométrie illisible produit un motif, jamais un silence ni une exception', () => {
  for (const broken of [null, {}, { type: 'Point', coordinates: [1, 2] }, 'nope', 42]) {
    const p = plan({ candidates: [territory({ geometry: broken })] });
    assertEquals(p.opens.length, 0);
    assertEquals(p.skipped.map((s) => s.reason), ['unreadable_geometry']);
  }
  // Un anneau à deux sommets passe les CHECK de 0074 (type + tableau) mais n'est
  // pas une surface : « on ne sait pas lire cette zone » ≠ « pas de recouvrement ».
  const degenerate = { type: 'Polygon', coordinates: [[[2.35, 48.85], [2.36, 48.85]]] };
  assertEquals(ringFromGeometry(degenerate), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. IDEMPOTENCE — jamais deux contestations
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('une zone DÉJÀ contestée n’est pas ré-ouverte (rejeu de l’ingestion)', () => {
  const p = plan({ contests: [contestRow({ attackerId: ME, id: 'C0' })] });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped.map((s) => s.reason), ['already_contested']);
});

Deno.test('deux attaquants simultanés : le second n’ouvre RIEN', () => {
  // Le premier rival a ouvert C1 il y a dix minutes ; ME boucle le même quartier.
  const p = plan({
    contests: [contestRow({ attackerId: RIVAL, startedAtMs: NOW - 10 * 60_000 })],
  });
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped.map((s) => s.reason), ['already_contested']);
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA FENÊTRE DE DÉFENSE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('la fenêtre part de l’INGESTION, jamais de la fin de course', () => {
  // GPX vieux de trois semaines : avec `finishedAtMs` comme départ, la fenêtre
  // serait déjà expirée et le propriétaire perdrait sans jamais avoir pu courir.
  const p = plan({ activity: activity({ finishedAtMs: NOW - 21 * DAY }) });
  const open = p.opens[0]!;
  assertEquals(open.startedAtMs, NOW);
  assert(open.expiresAtMs > NOW, 'une fenêtre ouverte dans le passé ne défend personne');
});

Deno.test('la durée de la fenêtre suit le niveau de fortification (§9.2)', () => {
  for (let level = 0; level < FORTIFICATION_WINDOW_HOURS_BY_LEVEL.length; level += 1) {
    const p = plan({
      candidates: [territory({ defenseLevel: level })],
      // Défense TOUTE FRAÎCHE : sans elle, `decayedDefenseLevel` ferait retomber
      // le niveau et on mesurerait la mauvaise fenêtre.
      contests: [contestRow({ status: 'defended', resolvedAtMs: NOW - 60_000 })],
    });
    const open = p.opens[0]!;
    assertEquals(open.defenseLevelAtOpen, level);
    assertEquals(open.expiresAtMs - open.startedAtMs, FORTIFICATION_WINDOW_HOURS_BY_LEVEL[level]! * H);
  }
});

Deno.test('un niveau NON entretenu a décru avant d’ouvrir la fenêtre (§9.2 axe temporel)', () => {
  // Niveau 3 stocké, dernière défense il y a 200 h : la table §9.2 coûte
  // 36 + 30 + 24 = 90 h pour retomber à 0.
  const p = plan({
    candidates: [territory({ defenseLevel: 3 })],
    contests: [contestRow({ status: 'defended', resolvedAtMs: NOW - 200 * H })],
  });
  const open = p.opens[0]!;
  assertEquals(open.defenseLevelAtOpen, 0);
  assertEquals(open.expiresAtMs - open.startedAtMs, FORTIFICATION_WINDOW_HOURS_BY_LEVEL[0]! * H);
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. LA DÉFENSE
// ═══════════════════════════════════════════════════════════════════════════

/** Ma zone, contestée par RIVAL depuis 2 h, échéance dans 16 h. */
const defended = (over: Partial<ContestWiringInput> = {}) =>
  planContestWiring({
    activity: activity(),
    candidates: [territory({ ownerId: ME })],
    contests: [contestRow()],
    nowMs: NOW,
    ...over,
  });

Deno.test('une défense valide CLÔT la contestation et monte la fortification (§9.3)', () => {
  const p = defended();
  assertEquals(p.opens.length, 0);
  assertEquals(p.defenses.length, 1);
  const d = p.defenses[0]!;
  assertEquals(d.contestId, 'C1');
  assertEquals(d.territoryId, 'T1');
  assertEquals(d.defenseLevel, 1);
  assertEquals(d.winningActivityId, RUN);
  // Décision 4 : l'instant RÉEL où la zone a été sauvée, jamais un futur.
  assertEquals(d.resolvedAtMs, activity().finishedAtMs);
  assert(d.resolvedAtMs >= contestRow().startedAtMs, 'CHECK 0078 : resolved_at >= started_at');
  assert(d.resolvedAtMs <= NOW, 'une défense ne se résout pas dans le futur');
});

Deno.test('un membre du crew propriétaire défend la zone du crew', () => {
  const p = defended({
    activity: activity({ actorCrewId: MY_CREW }),
    candidates: [territory({ ownerType: 'crew', ownerId: MY_CREW, state: 'owned_crew' })],
  });
  assertEquals(p.defenses.length, 1);
});

Deno.test('une boucle défensive insuffisante ne clôt RIEN, et ne devient pas une attaque', () => {
  const p = defended({ activity: activity({ polygon: square(0.7 * SIDE, 0, SIDE) }) });
  assertEquals(p.defenses.length, 0);
  assertEquals(p.opens.length, 0, 'défendre mal ne conteste pas sa propre zone');
  assertEquals(p.defenseRefusals.length, 1);
  assertEquals(p.defenseRefusals[0]!.reason, 'overlap_below_threshold');
});

Deno.test('une course terminée APRÈS l’échéance ne défend plus (§9.3)', () => {
  const p = defended({
    contests: [contestRow({ expiresAtMs: NOW - H })],
    activity: activity({ finishedAtMs: NOW - 10 * 60_000 }),
  });
  assertEquals(p.defenses.length, 0);
  assertEquals(p.defenseRefusals[0]!.reason, 'finished_after_deadline');
});

Deno.test('une course antérieure à l’ouverture de la contestation ne la défend pas', () => {
  const p = defended({ activity: activity({ finishedAtMs: NOW - 5 * H }) });
  assertEquals(p.defenses.length, 0);
  assertEquals(p.defenseRefusals[0]!.reason, 'finished_before_contest');
});

Deno.test('sans contestation ouverte, courir chez soi ne produit rien', () => {
  const p = defended({ contests: [] });
  assertEquals(p.defenses.length, 0);
  assertEquals(p.opens.length, 0);
  assertEquals(p.skipped.map((s) => s.reason), ['own_territory']);
});

Deno.test('la fortification plafonne au niveau maximal de la table §9.2', () => {
  const top = FORTIFICATION_WINDOW_HOURS_BY_LEVEL.length - 1;
  const p = defended({
    candidates: [territory({ ownerId: ME, defenseLevel: top })],
    contests: [
      contestRow(),
      // Défense fraîche : le niveau `top` n'a pas décru.
      contestRow({ id: 'C0', status: 'defended', resolvedAtMs: NOW - 60_000 }),
    ],
  });
  assertEquals(p.defenses[0]!.defenseLevel, top);
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. UNE MÊME BOUCLE PEUT DÉFENDRE ET ATTAQUER — jamais sur la même zone
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('une boucle qui couvre ma zone ET celle d’un voisin : défense + attaque', () => {
  // Deux carrés côte à côte ; la boucle est le rectangle qui les englobe.
  const mine = square(0, 0, SIDE);
  const his = square(SIDE, 0, SIDE);
  const both: LatLngPoint[] = [at(0, 0), at(2 * SIDE, 0), at(2 * SIDE, SIDE), at(0, SIDE)];
  assert(polygonAreaM2(both) > MIN_POLYGON_AREA_M2);

  const p = planContestWiring({
    activity: activity({ polygon: both }),
    candidates: [
      territory({ id: 'MINE', ownerId: ME, geometry: toGeoJsonPolygon(mine) }),
      territory({ id: 'HIS', ownerId: RIVAL, geometry: toGeoJsonPolygon(his) }),
    ],
    contests: [contestRow({ territoryId: 'MINE' })],
    nowMs: NOW,
  });
  assertEquals(p.defenses.map((d) => d.territoryId), ['MINE']);
  assertEquals(p.opens.map((o) => o.territoryId), ['HIS']);
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. LES ÉTATS §5.3 ET LE CÂBLAGE RÉEL
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('les états écrits sont ceux de §5.3 (0074 les accepte tels quels)', () => {
  assertEquals(TERRITORY_STATE_CONTESTED, 'contested');
  assertEquals(TERRITORY_STATE_DEFENDED, 'defended');
  assertEquals(ownedStateFor('user'), 'owned_personal');
  assertEquals(ownedStateFor('crew'), 'owned_crew');
});

Deno.test('index.ts APPELLE réellement le câblage (un module pur inutilisé ne protège rien)', async () => {
  const src = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assert(src.includes("from './contest_wiring.ts'"), 'index.ts n’importe pas le câblage');
  assert(src.includes('planContestWiring('), 'index.ts n’appelle pas planContestWiring');
  assert(src.includes("from('territory_contests')"), 'index.ts n’écrit aucune contestation');
});

Deno.test('la migration 0080 existe et reste appelable À LA MAIN (pg_cron optionnel)', async () => {
  const sql = await Deno.readTextFile(
    new URL('../../migrations/0080_resolve_contests.sql', import.meta.url),
  );
  assert(
    sql.includes('create or replace function public.resolve_due_contests'),
    'la fonction de résolution doit exister et être appelable sans cron',
  );
  // pg_cron n'est JAMAIS créé ni exigé par cette migration : elle doit s'appliquer
  // sur un Postgres nu (c'est ce que le test PGlite exécute réellement).
  assert(!sql.includes('create extension if not exists pg_cron'), 'pg_cron ne doit pas être exigé');
});
