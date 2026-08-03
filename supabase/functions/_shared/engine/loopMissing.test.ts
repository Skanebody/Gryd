// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/loopMissing.test.ts

/**
 * GRYD — « Il manquait {m} m » ne se dit QUE quand la phrase a du sens (lot G1c).
 *
 * ─── CE QUI SE JOUE ICI ─────────────────────────────────────────────────────
 * Le lot G1b sait mesurer un manque. Ce lot décide QUAND on le dit — et c'est
 * la partie délicate, parce qu'une information vraie peut être un reproche.
 *
 * « Il manquait 4 940 m pour fermer ta boucle » à quelqu'un qui a couru tout
 * droit est exact, inutile et blessant : il n'essayait pas de refermer. L19
 * (« l'app n'accuse jamais ») interdit cette phrase autant qu'un mensonge.
 *
 * Trois silences, donc, et ils sont testés un par un :
 *   · boucle fermée      → il ne manquait rien ;
 *   · écart > LOOP_HINT_DISTANCE_M → il n'essayait pas ;
 *   · trace < périmètre minimal    → c'est une sortie courte, pas un échec.
 *
 * Et un principe qui traverse tout : `undefined` ≠ `0`. « On ne dit rien » et
 * « il ne manquait rien » sont deux phrases différentes ; les confondre ferait
 * afficher « il manquait 0 m » — la formulation la plus absurde possible.
 */
import {
  DEFAULT_ACTIVITY,
  LOOP_CLOSE_ASSIST_M,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_HINT_DISTANCE_M,
  LOOP_MIN_PERIMETER_M,
} from '../game-rules.ts';
import { runTerritoryEngine } from './engine.ts';
import type { Segment } from './validation.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const M_LAT = 1 / 111_320;
const LAT0 = 48.86;
const LNG0 = 2.35;
const LNG_PER_M = M_LAT / Math.cos((LAT0 * Math.PI) / 180);

/** Carré de `sideM` de côté, dont l'arrivée s'arrête `gapM` avant le départ. */
function squareWithGap(sideM: number, gapM: number) {
  const d = sideM * M_LAT;
  const lngD = sideM * LNG_PER_M;
  return [
    { lat: LAT0, lng: LNG0 },
    { lat: LAT0, lng: LNG0 + lngD },
    { lat: LAT0 + d, lng: LNG0 + lngD },
    { lat: LAT0 + d, lng: LNG0 },
    { lat: LAT0 + gapM * M_LAT, lng: LNG0 },
  ];
}

/** Ligne droite de `lengthM` — personne n'a jamais voulu refermer ça. */
function straightLine(lengthM: number) {
  return [
    { lat: LAT0, lng: LNG0 },
    { lat: LAT0, lng: LNG0 + lengthM * LNG_PER_M },
  ];
}

/**
 * Un run passé au moteur : UNE seule trace claimable contiguë (la détection de
 * boucle l'exige — `loopTracePoints` ne construit un polygone que sur un
 * segment unique).
 *
 * Tout le reste de l'entrée est neutre : compte ancien (aucune exemption de
 * decay), pas de streak, pas de Club, GPS parfait. Ces tests portent sur LA
 * PHRASE, pas sur le score — un paramètre qui bougerait ici brouillerait ce
 * qu'ils prouvent.
 */
async function run(points: { lat: number; lng: number }[], distanceM: number) {
  const claimable: Segment[] = [points.map((p, i) => ({ ...p, t: i * 1_000 }))];
  return runTerritoryEngine({
    claimable,
    gpsTrust: 100,
    trustScore: 100,
    distanceM,
    now: new Date('2026-08-03T10:00:00Z'),
    userId: 'u1',
    userCreatedAt: new Date('2025-01-01T00:00:00Z'),
    streakWeeks: 0,
    isClub: false,
    activity: DEFAULT_ACTIVITY,
    // Terrain VIERGE : aucun hex possédé, aucune zone privée, densité pionnière.
    // Ces tests ne portent pas sur l'attribution — un terrain occupé n'y
    // changerait rien, mais brouillerait la lecture des échecs.
    resolveOwnership: async () => ({
      states: new Map(),
      ownersCreatedAt: new Map(),
      privacyHexes: new Set<string>(),
      noCaptureHexes: new Set<string>(),
      zoneDensity: 'pioneer' as const,
      claimsToday: 0,
    }),
  });
}

// ─── 1. On le dit quand ça a du sens ────────────────────────────────────────

Deno.test('boucle manquée de peu : le manque est ANNONCÉ, en mètres', async () => {
  const trop = LOOP_CLOSE_ASSIST_M + 40;
  const r = await run(squareWithGap(400, trop), 1_600);
  assertEquals(r.loopClosed, false, 'au-delà de la bande, aucune boucle');
  assert(r.loopMissingM !== undefined, 'un refus muet est exactement ce qu’on interdit');
  assert(
    Math.abs(r.loopMissingM! - 40) <= 2,
    `manque annoncé ${r.loopMissingM} m pour un dépassement réel de ~40 m`,
  );
});

// ─── 2. Les trois silences ──────────────────────────────────────────────────

Deno.test('SILENCE 1 — boucle fermée : il ne manquait rien', async () => {
  const r = await run(squareWithGap(400, Math.round(LOOP_CLOSE_TOLERANCE_M * 0.5)), 1_600);
  assertEquals(r.loopClosed, true);
  assertEquals(r.loopMissingM, undefined, 'aucun manque sur une boucle fermée');
  assertEquals(r.loopAssisted, false, 'et le joueur a bouclé LUI-MÊME');
});

Deno.test('SILENCE 2 — le coureur n’essayait pas de refermer : on se tait', async () => {
  // Ligne droite de 2 km : l'écart vaut 2 km, très au-delà de la distance à
  // laquelle l'écran live proposait déjà de refermer.
  const r = await run(straightLine(2_000), 2_000);
  assertEquals(r.loopClosed, false);
  assertEquals(
    r.loopMissingM,
    undefined,
    '« il manquait 1 940 m » serait un reproche déguisé en information (L19)',
  );
});

Deno.test('SILENCE 2bis — la borne est EXACTEMENT LOOP_HINT_DISTANCE_M', async () => {
  // Juste sous la borne : on parle. Franchement au-dessus : on se tait.
  const sous = await run(squareWithGap(400, LOOP_HINT_DISTANCE_M - 50), 1_600);
  assert(sous.loopMissingM !== undefined, 'sous la borne du hint, la phrase reste pertinente');
  const au_dessus = await run(squareWithGap(400, LOOP_HINT_DISTANCE_M + 100), 1_600);
  assertEquals(au_dessus.loopMissingM, undefined, 'au-delà, le coureur n’essayait plus');
});

Deno.test('SILENCE 3 — une sortie courte n’est pas une boucle ratée', async () => {
  // Trace sous le périmètre minimal : la transformer en échec serait
  // décourager quelqu'un qui a simplement fait un petit tour.
  const court = Math.round(LOOP_MIN_PERIMETER_M / 8); // côté → périmètre ~4× côté
  const r = await run(squareWithGap(court, LOOP_CLOSE_ASSIST_M + 30), 400);
  assertEquals(r.loopClosed, false);
  assertEquals(r.loopMissingM, undefined, 'une balade ne se voit pas reprocher un échec');
});

// ─── 3. L'assistance est DITE, pas offerte en silence ───────────────────────

Deno.test('boucle refermée par GRYD : le produit le SAIT et le dit', async () => {
  const milieu = Math.round((LOOP_CLOSE_TOLERANCE_M + LOOP_CLOSE_ASSIST_M) / 2);
  const r = await run(squareWithGap(400, milieu), 1_600);
  assertEquals(r.loopClosed, true, 'la boucle est bien accordée');
  assertEquals(r.loopAssisted, true, 'et le produit sait qu’il l’a refermée');
  assertEquals(r.loopMissingM, undefined, 'une boucle accordée n’a aucun manque à annoncer');
});

// ─── 4. Le principe qui traverse tout ───────────────────────────────────────

Deno.test('INVARIANT : `undefined` ne se confond JAMAIS avec 0', async () => {
  // Sur TOUS les cas : soit on se tait (undefined), soit on annonce un manque
  // STRICTEMENT positif. « Il manquait 0 m » ne doit jamais pouvoir s'écrire.
  const cas = [
    squareWithGap(400, 10),
    squareWithGap(400, Math.round((LOOP_CLOSE_TOLERANCE_M + LOOP_CLOSE_ASSIST_M) / 2)),
    squareWithGap(400, LOOP_CLOSE_ASSIST_M + 5),
    squareWithGap(400, LOOP_HINT_DISTANCE_M + 200),
    straightLine(3_000),
  ];
  for (const points of cas) {
    const r = await run(points, 1_600);
    if (r.loopMissingM !== undefined) {
      assert(r.loopMissingM > 0, `manque annoncé ${r.loopMissingM} : « 0 m » est absurde`);
      assert(Number.isInteger(r.loopMissingM), 'un manque en mètres s’écrit en entier');
    }
  }
});

Deno.test('INVARIANT : jamais de manque annoncé SUR une boucle accordée', async () => {
  for (const gap of [5, 20, 39, 45, 55, 60]) {
    const r = await run(squareWithGap(400, gap), 1_600);
    if (r.loopClosed) {
      assertEquals(r.loopMissingM, undefined, `écart ${gap} m : boucle accordée ET manque annoncé`);
    }
  }
});
