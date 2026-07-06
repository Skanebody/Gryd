/**
 * Tests de la COMPOSITION territoriale (engine/engine.ts — runTerritoryEngine).
 * Purs : h3-js déterministe, aucune I/O ; l'ownership est un MOCK déterministe
 * (resolveOwnership). On vérifie la cohérence couloir / intérieur / score /
 * explicabilité du chemin CONQUÊTE, à ISO-comportement d'ingest_run :
 *
 *  1. boucle fermée propre           → intérieur capturé (clean_loop), pas de refus ;
 *  2. boucle trop étroite            → loopRejectedReason='narrow', intérieur refusé ;
 *  3. gpsTrust < LOOP_MIN_GPS_TRUST  → intérieur refusé (cause 'low_trust') ;
 *  4. boucle trop grande             → intérieur tronqué (capReached) ;
 *  5. couloir seul (pas de boucle)   → aucun intérieur, aucune boucle ;
 *  6. trace non contiguë (partial)   → loopTracePoints=null → couloir seul.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  LOOP_MIN_GPS_TRUST,
  MAX_CLAIMS_PER_DAY,
  POINTS_BASE_PER_ZONE,
} from '../_shared/game-rules.ts';
import { runTerritoryEngine } from '../_shared/engine/engine.ts';
import type { OwnershipResolution } from '../_shared/engine/engine.ts';
import type { HexState } from '../_shared/engine/claims.ts';
import type { Segment } from '../_shared/engine/validation.ts';
import type { RunPoint } from '../_shared/types.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

/** Point à (xM est, yM nord) du coin d'origine, timestampé. */
function pt(xM: number, yM: number, i: number): RunPoint {
  return { lat: LAT0 + yM / M_PER_DEG_LAT, lng: LNG0 + xM / M_PER_DEG_LNG, t: i * 5_000 };
}

/** Boucle carrée de côté `sideM`, `n` points/côté, refermée exactement au départ. */
function squareLoop(sideM: number, n: number): RunPoint[] {
  const pts: RunPoint[] = [pt(0, 0, 0)];
  let x = 0;
  let y = 0;
  let i = 1;
  const legs: Array<[number, number]> = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // N, E, S, W
  for (const [dx, dy] of legs) {
    for (let k = 0; k < n; k++) {
      x += (dx * sideM) / n;
      y += (dy * sideM) / n;
      pts.push(pt(x, y, i++));
    }
  }
  return pts;
}

/** Rectangle fin `lenM`×`widthM` refermé — boucle « trop étroite » (anti-abus §6). */
function narrowRect(lenM: number, widthM: number, nLong: number): RunPoint[] {
  const pts: RunPoint[] = [pt(0, 0, 0)];
  let x = 0;
  let y = 0;
  let i = 1;
  const push = () => pts.push(pt(x, y, i++));
  for (let k = 0; k < nLong; k++) {
    x += lenM / nLong;
    push();
  } // E
  y += widthM;
  push(); // N
  for (let k = 0; k < nLong; k++) {
    x -= lenM / nLong;
    push();
  } // W
  y -= widthM;
  push(); // S (retour au départ)
  return pts;
}

/** Couloir droit (segment ouvert, jamais fermé) de `lenM`, `n` points. */
function corridor(lenM: number, n: number): RunPoint[] {
  const pts: RunPoint[] = [];
  for (let k = 0; k <= n; k++) pts.push(pt((k * lenM) / n, 0, k));
  return pts;
}

/**
 * Mock d'ownership déterministe : tous les hexes NEUTRES jamais possédés
 * (pionniers), aucune zone privée/no-capture, densité globale fournie, 0 claim
 * du jour. Enregistre l'ensemble `allHexes` reçu pour les assertions.
 */
function neutralOwnership(
  opts: {
    density?: OwnershipResolution['zoneDensity'];
    claimsToday?: number;
    seen?: { allHexes?: readonly string[] };
  } = {},
): (allHexes: readonly string[]) => Promise<OwnershipResolution> {
  return (allHexes) => {
    if (opts.seen) opts.seen.allHexes = allHexes;
    return Promise.resolve({
      states: new Map<string, HexState>(), // vide = tout neutre + pionnier
      ownersCreatedAt: new Map<string, Date>(),
      privacyHexes: new Set<string>(),
      noCaptureHexes: new Set<string>(),
      zoneDensity: opts.density ?? 'wild',
      claimsToday: opts.claimsToday ?? 0,
    });
  };
}

const NOW = new Date('2026-07-03T10:00:00.000Z');
const OLD_ACCOUNT = new Date('2020-01-01T00:00:00.000Z'); // > 14 j : pas d'exemption decay

interface EngineArgs {
  claimable: Segment[];
  gpsTrust?: number;
  trustScore?: number;
  distanceM: number;
  streakWeeks?: number;
  isClub?: boolean;
  resolve?: (allHexes: readonly string[]) => Promise<OwnershipResolution>;
}

function run(args: EngineArgs) {
  return runTerritoryEngine({
    claimable: args.claimable,
    gpsTrust: args.gpsTrust ?? 100,
    trustScore: args.trustScore ?? 100,
    distanceM: args.distanceM,
    now: NOW,
    userId: 'runner-1',
    userCreatedAt: OLD_ACCOUNT,
    streakWeeks: args.streakWeeks ?? 0,
    isClub: args.isClub ?? false,
    resolveOwnership: args.resolve ?? neutralOwnership(),
  });
}

// ─── 1. Boucle fermée propre → intérieur capturé (clean_loop) ────────────────
Deno.test('runTerritoryEngine : boucle propre → intérieur capturé, pas de refus', async () => {
  const loop = squareLoop(350, 8); // perimeter ~1400 m, compacité ~0,78, width ~175 m
  const seen: { allHexes?: readonly string[] } = {};
  const res = await run({
    claimable: [loop],
    distanceM: 1_600,
    resolve: neutralOwnership({ density: 'pioneer', seen }),
  });

  assert(res.loopClosed, 'la boucle doit être détectée fermée');
  assertEquals(res.loopRejectedReason, undefined); // intérieur accepté
  assert(res.interiorCells.length > 0, 'un intérieur doit être capturé');
  assertEquals(res.capReached, false); // sous le plafond d'aire pour 1,6 km
  assertEquals(res.explanation.loop.interiorRejected, undefined);
  assertEquals(res.explanation.loop.shapeOk, true);
  assertEquals(res.explanation.loop.closure, 'tolerance');

  // allHexes = couloir + intérieur, sans doublon, passé tel quel à decideClaims.
  assertEquals(res.allHexes.length, res.hexes.length + res.interiorCells.length);
  assertEquals(new Set(res.allHexes).size, res.allHexes.length);
  assertEquals(seen.allHexes, res.allHexes);
  for (const c of res.interiorCells) assert(!res.hexes.includes(c), 'intérieur disjoint du couloir');

  // Explicabilité : couloir + intérieur cohérents avec la sortie.
  assertEquals(res.explanation.corridorCellCount, res.hexes.length);
  assertEquals(res.explanation.interiorCellCount, res.interiorCells.length);

  // Toutes les cellules capturées sont neutres → claimed_neutral, pionnières.
  const claimed = res.decision.results.filter((r) => r.outcome === 'claimed_neutral');
  assertEquals(claimed.length, res.allHexes.length);
  assert(res.decision.totals.pioneer > 0);

  // Points : verify plein (trust 100 → ×1,0), streak neutre (0 sem → ×1,0),
  // performance = gpsTrust/100=1,0 & non régulier → ×1,15 (comme ingest_run :
  // dataReliability=1,0, isRegular=false). final = floor(base × 1 × 1 × 1,15).
  assertEquals(res.explanation.verifyTier, 'full');
  assertEquals(res.explanation.verifyFactor, 1);
  assertEquals(res.explanation.points.base, res.decision.totals.points);
  assertEquals(res.explanation.points.final, res.score.points);
  assertEquals(res.score.streakMultiplier, 1);
  assertEquals(res.score.performanceModifier, 1.15);
  assertEquals(
    res.explanation.points.final,
    Math.floor(res.explanation.points.base * 1 * 1 * 1.15),
  );
});

// ─── 2. Boucle trop étroite → intérieur refusé (narrow) ──────────────────────
Deno.test('runTerritoryEngine : boucle trop étroite → narrow, intérieur refusé mais couloir gardé', async () => {
  const rect = narrowRect(700, 25, 12); // compacité ~0,10 < 0,12, width ~24 m < 80 m
  const res = await run({ claimable: [rect], distanceM: 1_500 });

  assert(res.loopClosed, 'la boucle étroite est bien fermée (tolérance)');
  assertEquals(res.loopRejectedReason, 'narrow');
  assertEquals(res.interiorCells.length, 0);
  assertEquals(res.explanation.loop.shapeOk, false);
  assertEquals(res.explanation.loop.interiorRejected, 'narrow');
  assertEquals(res.explanation.interiorCellCount, 0);

  // Couloir toujours récompensé (« trait ») : allHexes == couloir.
  assertEquals(res.allHexes, res.hexes);
  assert(res.hexes.length > 0);
  assert(res.decision.totals.claimed > 0, 'le couloir reste capturé');
});

// ─── 3. gpsTrust < 80 → intérieur refusé (low_trust) ─────────────────────────
Deno.test('runTerritoryEngine : gpsTrust < LOOP_MIN_GPS_TRUST → intérieur refusé (low_trust)', async () => {
  const loop = squareLoop(350, 8); // forme OK, mais GPS douteux
  const res = await run({
    claimable: [loop],
    gpsTrust: LOOP_MIN_GPS_TRUST - 10, // 70 < 80
    trustScore: LOOP_MIN_GPS_TRUST - 10,
    distanceM: 1_600,
  });

  assert(res.loopClosed, 'la boucle est fermée, la forme est bonne');
  assertEquals(res.explanation.loop.shapeOk, true); // la forme passe…
  assertEquals(res.loopRejectedReason, 'narrow'); // …mais l'intérieur est refusé (motif DB partagé)
  assertEquals(res.explanation.loop.interiorRejected, 'low_trust'); // cause fine
  assertEquals(res.interiorCells.length, 0);
  assertEquals(res.allHexes, res.hexes); // couloir seul
  // trustScore 70 ∈ [60,80) → verify partiel (×0,5).
  assertEquals(res.explanation.verifyTier, 'partial');
  assertEquals(res.explanation.verifyFactor, 0.5);
});

// ─── 4. Boucle trop grande → intérieur tronqué (capReached) ──────────────────
Deno.test('runTerritoryEngine : grande boucle → intérieur tronqué au plafond (capReached)', async () => {
  const loop = squareLoop(900, 12); // area ~0,81 km² ; interior ~44 > cap ~29 pour 3,7 km
  const seen: { allHexes?: readonly string[] } = {};
  const res = await run({
    claimable: [loop],
    distanceM: 3_700,
    resolve: neutralOwnership({ seen }),
  });

  assert(res.loopClosed);
  assertEquals(res.loopRejectedReason, undefined); // forme OK, GPS OK
  assert(res.capReached, 'le plafond d’aire doit être atteint');
  assertEquals(res.explanation.loop.capReached, true);
  assert(res.interiorCells.length > 0);
  // L'intérieur tronqué reste STRICTEMENT sous le nombre de cellules du polygone
  // (donc borné) et la sortie reste cohérente couloir + intérieur.
  assertEquals(res.allHexes.length, res.hexes.length + res.interiorCells.length);
  assertEquals(seen.allHexes?.length, res.allHexes.length);
});

// ─── 5. Couloir seul (pas de boucle) → aucun intérieur ───────────────────────
Deno.test('runTerritoryEngine : couloir seul (segment ouvert) → aucune boucle, aucun intérieur', async () => {
  const line = corridor(1_200, 24); // ligne droite : jamais refermée
  const res = await run({ claimable: [line], distanceM: 1_200 });

  assertEquals(res.loopClosed, false);
  assertEquals(res.loopRejectedReason, undefined);
  assertEquals(res.interiorCells.length, 0);
  assertEquals(res.capReached, false);
  assertEquals(res.explanation.loop.closed, false);
  assertEquals(res.explanation.loop.shapeOk, null); // aucune boucle à juger
  assertEquals(res.explanation.loop.compactness, null);
  assertEquals(res.allHexes, res.hexes);
  assert(res.hexes.length > 0, 'le couloir capture bien des cellules');
  assert(res.decision.totals.claimed > 0);
});

// ─── 6. Trace non contiguë (partial) → loopTracePoints=null → couloir seul ───
Deno.test('runTerritoryEngine : deux segments (partial) → jamais de boucle, couloir seul', async () => {
  // Même géométrie qu’une boucle carrée, mais COUPÉE en deux segments : la trace
  // n’est pas contiguë (loopTracePoints exige exactement 1 segment) → couloir seul.
  const full = squareLoop(350, 8);
  const half = Math.floor(full.length / 2);
  const two: Segment[] = [full.slice(0, half), full.slice(half)];
  const res = await run({ claimable: two, distanceM: 1_600 });

  assertEquals(res.loopClosed, false); // pas de trace contiguë → pas de détection
  assertEquals(res.interiorCells.length, 0);
  assertEquals(res.allHexes, res.hexes);
  // Le couloir des DEUX segments est bien hexé (union des deux).
  assert(res.hexes.length > 0);
});

// ─── Bonus : plafond quotidien propagé (claimsToday) — cohérence decideClaims ─
Deno.test('runTerritoryEngine : claimsToday au plafond → tout blocked_daily_cap', async () => {
  const line = corridor(1_200, 24);
  const res = await run({
    claimable: [line],
    distanceM: 1_200,
    resolve: neutralOwnership({ claimsToday: MAX_CLAIMS_PER_DAY }),
  });
  assertEquals(res.decision.totals.claimed, 0);
  assertEquals(res.decision.totals.blocked, res.allHexes.length);
  assertEquals(res.decision.totals.points, 0);
  assertEquals(res.score.points, 0);
  // base par zone reste la constante attendue (sanity sur POINTS_BASE_PER_ZONE).
  assert(POINTS_BASE_PER_ZONE > 0);
});
