/**
 * GRYD — E16 « Mission recommandée » : verrouillage du moteur PUR.
 *
 * POURQUOI CE TEST EXISTE. Cet écran fait DEUX affirmations que rien d'autre ne
 * rattrape s'il se trompe :
 *   1. « voici pourquoi je te recommande CELLE-CI » — une raison fausse est un
 *      mensonge qui se déguise en explication ;
 *   2. « cette mission n'est plus possible, et voici pourquoi » — un motif faux
 *      annonce une perte sur une réussite (le cas de la zone REPARCOURUE).
 * Les deux pannes seraient parfaitement SILENCIEUSES : l'écran resterait joli.
 *
 * Deno, zéro réseau, zéro mock, `now` injecté. Les cellules H3 res 10 sont des
 * cellules RÉELLES de Paris (les mêmes que `deriveMission.test.ts`, avec leurs
 * distances pré-calculées à EGO).
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { MISSION_DEFEND_WINDOW_H, RUN_MAX_DISTANCE_M } from '@klaim/shared';
import {
  territoryCentroid,
  type MissionPoint,
  type MissionTerritoryInput,
  type RealMission,
} from './deriveMission.ts';
import {
  MISSION_REACH_M,
  missionDigest,
  missionDropReason,
  missionKey,
  missionReason,
  parseMissionKey,
  recommendedMissionView,
} from './recommendedMission.ts';

const EGO: MissionPoint = { lat: 48.86, lng: 2.4 };
/** Lyon — à ~390 km de EGO, très au-delà de la portée d'une sortie. */
const EGO_LOIN: MissionPoint = { lat: 45.764, lng: 4.8357 };
const CELL_NEAR = '8a1fb4663587fff'; // 1741 m de EGO
const CELL_MID = '8a1fb46622e7fff'; //  2059 m de EGO

const MS_PER_HOUR = 3_600_000;
const NOW = new Date('2026-07-20T12:00:00.000Z');
const at = (h: number): Date => new Date(NOW.getTime() + h * MS_PER_HOUR);

/** Centroïde RÉEL d'une cellule (jamais une coordonnée écrite à la main). */
function centroid(cell: string): MissionPoint {
  const c = territoryCentroid([cell]);
  assert(c !== null, 'cellule de test invalide');
  return c;
}

function territory(cell: string, decayAt: Date | null): MissionTerritoryInput {
  return { cells: [cell], decayAt, areaM2: 15_000 };
}

const DEFEND: RealMission = {
  kind: 'defend_expiring',
  anchor: centroid(CELL_NEAR),
  hoursLeft: 6,
  distanceM: 1741,
  areaM2: 15_000,
};
const EXPAND: RealMission = { kind: 'expand', anchor: centroid(CELL_NEAR), distanceM: 1741 };

// ─── Identité d'URL : opaque, stable, et sans coordonnées ────────────────────

Deno.test('la clé d’URL ne contient AUCUNE coordonnée (§12 : rien de géo dans une URL)', () => {
  const key = missionKey(DEFEND);
  assert(key !== null);
  // Ni la latitude ni la longitude, sous aucune forme lisible.
  assert(!key.includes('48.'), 'une latitude a fuité dans la clé');
  assert(!key.includes('2.3'), 'une longitude a fuité dans la clé');
  assert(!key.includes(','), 'la clé ressemble à un couple de coordonnées');
  assert(key.startsWith('defend-'));
});

Deno.test('le digest est déterministe et discrimine deux zones voisines', () => {
  assertEquals(missionDigest(centroid(CELL_NEAR)), missionDigest(centroid(CELL_NEAR)));
  assertNotEquals(missionDigest(centroid(CELL_NEAR)), missionDigest(centroid(CELL_MID)));
});

Deno.test('first_capture n’a AUCUNE clé — elle n’a aucune cible à identifier', () => {
  assertEquals(missionKey({ kind: 'first_capture' }), null);
});

Deno.test('parseMissionKey refuse tout ce qui n’est pas une clé de mission', () => {
  assertEquals(parseMissionKey(undefined), null);
  assertEquals(parseMissionKey(''), null);
  assertEquals(parseMissionKey('defend'), null); // sans digest
  assertEquals(parseMissionKey('defend-'), null); // digest vide
  assertEquals(parseMissionKey('-abc'), null); // sans genre
  assertEquals(parseMissionKey('attack-abc'), null); // genre inconnu
  assertEquals(parseMissionKey('expand-abc'), { kind: 'expand', digest: 'abc' });
  // expo-router peut rendre un tableau pour un segment dynamique.
  assertEquals(parseMissionKey(['defend-xyz']), { kind: 'defend', digest: 'xyz' });
});

Deno.test('clé → parse → même cible (aller-retour)', () => {
  const key = missionKey(EXPAND);
  assert(key !== null);
  const opened = parseMissionKey(key);
  assert(opened !== null);
  assertEquals(opened.kind, 'expand');
  assertEquals(opened.digest, missionDigest(centroid(CELL_NEAR)));
});

// ─── LA RAISON : dérivée, jamais générique ───────────────────────────────────

Deno.test('défense ⇒ la raison est l’échéance réelle de la zone', () => {
  assertEquals(missionReason(DEFEND, 3), 'expiring');
});

Deno.test('une seule zone ⇒ « elle borde ce que tu tiens », jamais « la plus proche »', () => {
  // « La plus proche » suppose un choix. Avec une seule zone il n'y en a pas :
  // la raison serait vraie par accident et fausse dans son sens.
  assertEquals(missionReason(EXPAND, 1), 'adjacent');
});

Deno.test('plusieurs zones + distance MESURÉE ⇒ « la plus proche d’ici »', () => {
  assertEquals(missionReason(EXPAND, 4), 'closest');
});

Deno.test('plusieurs zones mais AUCUN fix ⇒ on n’invente pas une proximité', () => {
  const sansFix: RealMission = { kind: 'expand', anchor: centroid(CELL_NEAR), distanceM: null };
  assertEquals(missionReason(sansFix, 4), 'adjacent');
});

Deno.test('first_capture n’a aucune raison — donc aucune recommandation', () => {
  assertEquals(missionReason({ kind: 'first_capture' }, 0), null);
});

// ─── EXTINCTION : un motif seulement quand il est prouvé ─────────────────────

const OPENED_DEFEND = { kind: 'defend' as const, digest: missionDigest(centroid(CELL_NEAR)) };
const OPENED_EXPAND = { kind: 'expand' as const, digest: missionDigest(centroid(CELL_NEAR)) };

Deno.test('la zone n’est plus dans MES claims ⇒ « taken »', () => {
  const reason = missionDropReason(OPENED_DEFEND, {
    now: NOW,
    ego: EGO,
    mine: [territory(CELL_MID, at(3))],
  });
  assertEquals(reason, 'taken');
});

Deno.test('défense dont l’échéance est PASSÉE ⇒ « expired »', () => {
  const reason = missionDropReason(OPENED_DEFEND, {
    now: NOW,
    ego: EGO,
    mine: [territory(CELL_NEAR, at(-1))],
  });
  assertEquals(reason, 'expired');
});

Deno.test('défense encore menacée ⇒ AUCUNE extinction', () => {
  const reason = missionDropReason(OPENED_DEFEND, {
    now: NOW,
    ego: EGO,
    mine: [territory(CELL_NEAR, at(3))],
  });
  assertEquals(reason, null);
});

Deno.test('LA ZONE REPARCOURUE N’EST PAS UNE MISSION PERDUE — aucun motif inventé', () => {
  // Le joueur vient de courir sa zone : `decay_at` est repoussé bien au-delà de
  // la fenêtre. La mission de défense n'a plus lieu d'être — mais elle a été
  // ACCOMPLIE. Émettre « la fenêtre est passée, ta zone s'est effacée » serait
  // annoncer une perte sur une réussite. C'est le motif le plus tentant du
  // module, et celui qu'il refuse.
  const reason = missionDropReason(OPENED_DEFEND, {
    now: NOW,
    ego: EGO,
    mine: [territory(CELL_NEAR, at(MISSION_DEFEND_WINDOW_H * 10))],
  });
  assertEquals(reason, null);
});

Deno.test('cible hors de portée d’une sortie ⇒ « out_of_range »', () => {
  const reason = missionDropReason(OPENED_EXPAND, {
    now: NOW,
    ego: EGO_LOIN,
    mine: [territory(CELL_NEAR, null)],
  });
  assertEquals(reason, 'out_of_range');
});

Deno.test('la portée est DÉRIVÉE de la sortie maximale, pas choisie', () => {
  assertEquals(MISSION_REACH_M, RUN_MAX_DISTANCE_M / 2);
});

Deno.test('position perdue + plusieurs zones ⇒ « no_position » (le choix n’est plus justifiable)', () => {
  const reason = missionDropReason(OPENED_EXPAND, {
    now: NOW,
    ego: null,
    mine: [territory(CELL_NEAR, null), territory(CELL_MID, null)],
  });
  assertEquals(reason, 'no_position');
});

Deno.test('position perdue mais UNE SEULE zone ⇒ rien à départager, la mission tient', () => {
  const reason = missionDropReason(OPENED_EXPAND, {
    now: NOW,
    ego: null,
    mine: [territory(CELL_NEAR, null)],
  });
  assertEquals(reason, null);
});

// ─── LA MACHINE À ÉTATS : l'ordre est la garantie ────────────────────────────

const READY_CTX = { now: NOW, ego: EGO, mine: [territory(CELL_NEAR, at(3))] };

Deno.test('les quatre états de lecture passent AVANT toute question de mission', () => {
  const base = { ...READY_CTX, mission: null, opened: null };
  assertEquals(recommendedMissionView({ ...base, status: 'signed-out' }), { kind: 'signed-out' });
  assertEquals(recommendedMissionView({ ...base, status: 'idle' }), { kind: 'loading' });
  assertEquals(recommendedMissionView({ ...base, status: 'loading' }), { kind: 'loading' });
  assertEquals(recommendedMissionView({ ...base, status: 'failed' }), {
    kind: 'failed',
    retryable: true,
  });
});

Deno.test('sans backend, l’échec n’offre PAS de « Réessayer » (jamais un bouton mort)', () => {
  assertEquals(
    recommendedMissionView({ ...READY_CTX, status: 'unconfigured', mission: null, opened: null }),
    { kind: 'failed', retryable: false },
  );
});

Deno.test('une lecture EN COURS ne se lit jamais « aucune mission »', () => {
  const view = recommendedMissionView({
    ...READY_CTX,
    status: 'loading',
    mission: null,
    opened: null,
  });
  assertEquals(view.kind, 'loading');
});

Deno.test('lecture aboutie sans territoire ⇒ VIDE, et surtout aucune mission tirée au hasard', () => {
  const view = recommendedMissionView({
    now: NOW,
    ego: EGO,
    mine: [],
    status: 'ready',
    mission: { kind: 'first_capture' },
    opened: null,
  });
  assertEquals(view, { kind: 'empty' });
});

Deno.test('mission vivante ⇒ elle est rendue AVEC sa raison dérivée', () => {
  const view = recommendedMissionView({
    ...READY_CTX,
    status: 'ready',
    mission: DEFEND,
    opened: parseMissionKey(missionKey(DEFEND)),
  });
  assertEquals(view.kind, 'mission');
  if (view.kind === 'mission') {
    assertEquals(view.reason, 'expiring');
    assertEquals(view.mission.kind, 'defend_expiring');
  }
});

Deno.test('mission éteinte ⇒ l’extinction prime sur l’affichage d’une autre mission', () => {
  // La zone ouverte n'est plus à moi, mais le moteur en propose déjà une autre.
  // Montrer la nouvelle sans rien dire escamoterait la disparition ; la spec
  // exige une disparition PROPRE, AVEC explication.
  const view = recommendedMissionView({
    now: NOW,
    ego: EGO,
    mine: [territory(CELL_MID, at(2))],
    status: 'ready',
    mission: { kind: 'expand', anchor: centroid(CELL_MID), distanceM: 2059 },
    opened: OPENED_DEFEND,
  });
  assertEquals(view, { kind: 'dropped', reason: 'taken' });
});

Deno.test('ouvert SANS id ⇒ aucune extinction possible, on montre la mission courante', () => {
  const view = recommendedMissionView({
    ...READY_CTX,
    status: 'ready',
    mission: EXPAND,
    opened: null,
  });
  assertEquals(view.kind, 'mission');
});
