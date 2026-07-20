/**
 * GRYD — MISSION DYNAMIQUE RÉELLE : verrouillage du moteur PUR `deriveRealMission`
 * et de ses helpers (`haversineDistanceM`, `territoryCentroid`).
 *
 * POURQUOI CE TEST EXISTE. À chaque ouverture, GRYD doit répondre « où dois-je
 * courir MAINTENANT ? » à partir des SEULES données réelles (mes hex_claims + ma
 * position GPS) — jamais d'une menace fabriquée (règle zéro-mensonge). La décision
 * est une cascade à une seule sortie (§A « 1 écran = 1 décision ») :
 *   defend_expiring (le plus urgent, puis le plus proche) > expand (le plus proche)
 *   > first_capture. Toutes les pannes de ce moteur seraient SILENCIEUSES — une
 *   mauvaise priorité affiche calmement la mauvaise mission —, d'où ce filet.
 *
 * Deno, zéro réseau, zéro mock, zéro horloge implicite : `now` est injecté. Les
 * index H3 sont des cellules res 10 RÉELLES de Paris ; leurs distances à `ego`
 * sont pré-calculées avec la MÊME haversine que la prod (round), pas devinées.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { MISSION_DEFEND_WINDOW_H } from '@klaim/shared';
import {
  deriveRealMission,
  haversineDistanceM,
  territoryCentroid,
  type MissionPoint,
  type MissionTerritoryInput,
} from './deriveMission.ts';

// ── Cellules H3 res 10 RÉELLES (Paris), avec leur distance ronde à EGO ──────────
// Vérifiées via h3-js (cellToLatLng) + haversine prod : ordre near < mid < far.
const EGO: MissionPoint = { lat: 48.86, lng: 2.4 };
const CELL_NEAR = '8a1fb4663587fff'; // 1741 m de EGO
const CELL_MID = '8a1fb46622e7fff'; //  2059 m de EGO
const CELL_FAR = '8a1fb4644917fff'; //  2370 m de EGO
const CELL_BASE = '8a1fb46622dffff'; // 2050 m de EGO (zone « générique »)
const DIST_NEAR = 1741;
const DIST_MID = 2059;

const MS_PER_HOUR = 3_600_000;
const NOW = new Date('2026-07-20T12:00:00.000Z');
/** Instant à +h heures de NOW (h négatif = passé). */
const at = (h: number): Date => new Date(NOW.getTime() + h * MS_PER_HOUR);

/** Fabrique une de MES zones réelles minimales. */
const zone = (
  cells: readonly string[],
  decayAt: Date | null,
  areaM2 = 10_000,
): MissionTerritoryInput => ({ cells, decayAt, areaM2 });

Deno.test('1 — aucun territoire → first_capture (prendre sa première zone ici)', () => {
  assertEquals(deriveRealMission({ now: NOW, ego: EGO, mine: [] }), { kind: 'first_capture' });
  // Sans fix GPS non plus : rien à défendre ni à étendre.
  assertEquals(deriveRealMission({ now: NOW, ego: null, mine: [] }), { kind: 'first_capture' });
});

Deno.test('2 — une zone qui decay dans la fenêtre → defend_expiring, hoursLeft arrondi au-dessus, distance null sans ego', () => {
  // Decay dans 9 h 30 → ceil = 10 h : le plancher DÉFENSE se lit en heures pleines.
  const m = deriveRealMission({
    now: NOW,
    ego: null, // pas de fix → mission sans distance
    mine: [zone([CELL_BASE], at(9.5), 12_345)],
  });
  assertEquals(m.kind, 'defend_expiring');
  if (m.kind !== 'defend_expiring') return; // narrowing TS
  assertEquals(m.hoursLeft, 10);
  assertEquals(m.distanceM, null); // ego null ⇒ jamais une fausse distance
  assertEquals(m.areaM2, 12_345); // l'aire réelle passe telle quelle
  assertEquals(m.anchor, territoryCentroid([CELL_BASE])); // centre = centroïde des cellules
});

Deno.test('3 — deux zones expirent (10 h et 40 h) → la PLUS URGENTE gagne', () => {
  const m = deriveRealMission({
    now: NOW,
    ego: EGO,
    // La moins urgente d'abord : l'ordre du tableau ne doit PAS décider.
    mine: [zone([CELL_NEAR], at(40)), zone([CELL_MID], at(10))],
  });
  assertEquals(m.kind, 'defend_expiring');
  if (m.kind !== 'defend_expiring') return;
  assertEquals(m.hoursLeft, 10); // 10 h l'emporte sur 40 h
  assertEquals(m.anchor, territoryCentroid([CELL_MID])); // on défend la zone urgente
});

Deno.test('4 — urgence ÉGALE → la plus PROCHE de ego départage', () => {
  const m = deriveRealMission({
    now: NOW,
    ego: EGO,
    // Même échéance (20 h) pour les deux ; la loin d'abord pour tester le tie-break.
    mine: [zone([CELL_FAR], at(20)), zone([CELL_NEAR], at(20))],
  });
  assertEquals(m.kind, 'defend_expiring');
  if (m.kind !== 'defend_expiring') return;
  assertEquals(m.hoursLeft, 20);
  assertEquals(m.distanceM, DIST_NEAR); // 1741 m < 2370 m
  assertEquals(m.anchor, territoryCentroid([CELL_NEAR]));
});

Deno.test('5 — aucun decay dans la fenêtre (100 h / null) → expand, ancré sur la zone la plus proche', () => {
  // 100 h > MISSION_DEFEND_WINDOW_H (72) ⇒ hors fenêtre ; null ⇒ jamais menacée.
  const horsFenetre = at(MISSION_DEFEND_WINDOW_H + 28);
  const m = deriveRealMission({
    now: NOW,
    ego: EGO,
    // La loin d'abord ; l'extension doit s'ancrer sur la PLUS PROCHE.
    mine: [zone([CELL_FAR], horsFenetre), zone([CELL_NEAR], null)],
  });
  assertEquals(m.kind, 'expand');
  if (m.kind !== 'expand') return;
  assertEquals(m.distanceM, DIST_NEAR);
  assertEquals(m.anchor, territoryCentroid([CELL_NEAR]));
});

Deno.test('6 — decay ÉCHU (passé) : ignoré comme défense, mais le territoire existe → expand quand même', () => {
  // Une zone dont le decay est DÉJÀ passé n'est plus « à défendre » (elle est
  // neutre pour le moteur) — mais elle reste MON territoire, donc on l'étend.
  const m = deriveRealMission({
    now: NOW,
    ego: EGO,
    mine: [zone([CELL_BASE], at(-5))], // échu depuis 5 h
  });
  assertEquals(m.kind, 'expand');
  if (m.kind !== 'expand') return;
  assertEquals(m.anchor, territoryCentroid([CELL_BASE]));
});

Deno.test('7 — plancher hoursLeft : decay dans 20 min → 1, jamais 0', () => {
  const m = deriveRealMission({
    now: NOW,
    ego: EGO,
    mine: [zone([CELL_BASE], at(20 / 60))], // +20 minutes
  });
  assertEquals(m.kind, 'defend_expiring');
  if (m.kind !== 'defend_expiring') return;
  assertEquals(m.hoursLeft, 1); // arrondi au-dessus + plancher : « il te reste 1 h », pas « 0 h »
});

Deno.test('8 — cellules invalides ignorées sans crash ; toutes invalides + rien d’autre → first_capture', () => {
  // NB h3-js v4 : cellToLatLng ne LÈVE que sur un index hex INVALIDE (ex. 16 « f ») ;
  // du texte non-hexa (« nope ») est silencieusement mappé sur un point bidon. Le
  // filet défensif de territoryCentroid (try/catch → null) ne se déclenche donc que
  // sur ces index throwants — ce sont eux qu'on emploie ici.
  const INVALID_A = 'ffffffffffffffff'; // hex parseable mais pas une cellule H3 ⇒ throw
  const INVALID_B = 'fffffffffffffff';

  // Aucune cellule ⇒ null ; que des index throwants ⇒ null (catch, jamais un crash).
  assertEquals(territoryCentroid([]), null);
  assertEquals(territoryCentroid([INVALID_A, INVALID_B]), null);
  // Les invalides sont sautées, les valides comptent (moyenne inchangée).
  assertEquals(territoryCentroid([INVALID_A, CELL_BASE]), territoryCentroid([CELL_BASE]));

  // Une seule zone, entièrement invalide (même avec un decay urgent) : anchor null
  // ⇒ zone sautée ⇒ ni defend ni expand ⇒ first_capture, sans crash.
  assertEquals(
    deriveRealMission({ now: NOW, ego: EGO, mine: [zone([INVALID_A, INVALID_B], at(3))] }),
    { kind: 'first_capture' },
  );

  // Robustesse : une zone invalide À CÔTÉ d'une valide ne casse rien — la valide gagne.
  const m = deriveRealMission({
    now: NOW,
    ego: EGO,
    mine: [zone([INVALID_A], at(2)), zone([CELL_MID], null)],
  });
  assertEquals(m.kind, 'expand');
  if (m.kind !== 'expand') return;
  assertEquals(m.distanceM, DIST_MID);
  assertEquals(m.anchor, territoryCentroid([CELL_MID]));
});

Deno.test('9 — haversineDistanceM : 0 sur place, ~1 km sur un déplacement connu', () => {
  const p: MissionPoint = { lat: 48.8566, lng: 2.3522 }; // Paris
  assertEquals(haversineDistanceM(p, p), 0);
  // +0,009° de latitude ≈ 1 km (référence géodésique).
  const km = haversineDistanceM(p, { lat: 48.8656, lng: 2.3522 });
  assert(Math.abs(km - 1000) <= 15, `distance ${km} m hors de 1000 ± 15`);
});
