/**
 * Tests de la fermeture de BOUCLE CREW (engine/engine.ts — runCrewBoundaryClose,
 * algo #8). Purs : h3-js déterministe, aucune I/O ; l'ownership est un MOCK
 * déterministe (resolveOwnership). On vérifie que l'EXTRACTION du cœur de
 * completeBoundaries (ingest_run) est à ISO-comportement :
 *
 *  1. boucle crew fermée normale   → intérieur crew capturé (claimed_neutral) ;
 *  2. plafond d'aire atteint       → intérieur tronqué (cappedAt=true) ;
 *  3. intérieur vide (rare)        → capped=[], decision nulle, on ferme quand même.
 *
 * NB : contrairement au solo, la boucle est fermée PAR CONSTRUCTION (anneau
 * ouvreur + finisher) — pas de detectLoop/forme/gate GPS, et l'intérieur n'est
 * PAS `clean_loop` (reproduit tel quel).
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { runCrewBoundaryClose } from '../_shared/engine/engine.ts';
import type { CrewOwnershipResolution } from '../_shared/engine/engine.ts';
import type { HexState } from '../_shared/engine/claims.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

/** Point {lat,lng} à (xM est, yM nord) du coin d'origine. */
function pt(xM: number, yM: number): { lat: number; lng: number } {
  return { lat: LAT0 + yM / M_PER_DEG_LAT, lng: LNG0 + xM / M_PER_DEG_LNG };
}

/**
 * Boucle carrée de côté `sideM` scindée en DEUX traces (comme une frontière
 * crew) : l'ouvreur trace 3 côtés (départ → coin bas-droit → haut-droit →
 * haut-gauche), le finisher referme le 4ᵉ côté (haut-gauche → départ). Le
 * polygone `[...opener, ...finisher]` enclôt le carré.
 */
function crewSquare(sideM: number, nPerLeg: number): {
  openerRing: { lat: number; lng: number }[];
  finisherTrace: { lat: number; lng: number }[];
} {
  const openerRing: { lat: number; lng: number }[] = [pt(0, 0)];
  let x = 0;
  let y = 0;
  const legs: Array<[number, number]> = [[1, 0], [0, 1], [-1, 0]]; // E, N, W (3 côtés)
  for (const [dx, dy] of legs) {
    for (let k = 0; k < nPerLeg; k++) {
      x += (dx * sideM) / nPerLeg;
      y += (dy * sideM) / nPerLeg;
      openerRing.push(pt(x, y));
    }
  }
  // Finisher : dernier bout ouvert (0, side) → départ (0,0), côté S.
  const finisherTrace: { lat: number; lng: number }[] = [];
  for (let k = 0; k <= nPerLeg; k++) {
    finisherTrace.push(pt(0, sideM - (k * sideM) / nPerLeg));
  }
  return { openerRing, finisherTrace };
}

const NOW = new Date('2026-07-03T10:00:00.000Z');
const OLD_ACCOUNT = new Date('2020-01-01T00:00:00.000Z'); // > 14 j : pas d'exemption decay

/**
 * Mock d'ownership déterministe : tous les hexes NEUTRES jamais possédés
 * (pionniers), aucune zone privée/no-capture, 0 claim du jour. Enregistre
 * l'ensemble `capped` reçu pour les assertions.
 */
function neutralOwnership(
  opts: { claimsToday?: number; seen?: { capped?: readonly string[] } } = {},
): (capped: readonly string[]) => Promise<CrewOwnershipResolution> {
  return (capped) => {
    if (opts.seen) opts.seen.capped = capped;
    return Promise.resolve({
      states: new Map<string, HexState>(), // vide = tout neutre + pionnier
      ownersCreatedAt: new Map<string, Date>(),
      privacyHexes: new Set<string>(),
      noCaptureHexes: new Set<string>(),
      claimsToday: opts.claimsToday ?? 0,
    });
  };
}

interface CloseArgs {
  openerRing: { lat: number; lng: number }[];
  finisherTrace: { lat: number; lng: number }[];
  finisherLengthM: number;
  accumulatedLengthM: number;
  resolve?: (capped: readonly string[]) => Promise<CrewOwnershipResolution>;
}

function close(args: CloseArgs) {
  return runCrewBoundaryClose({
    openerRing: args.openerRing,
    finisherTrace: args.finisherTrace,
    finisherLengthM: args.finisherLengthM,
    accumulatedLengthM: args.accumulatedLengthM,
    userId: 'finisher-1',
    userCreatedAt: OLD_ACCOUNT,
    now: NOW,
    zoneDensity: 'wild',
    resolveOwnership: args.resolve ?? neutralOwnership(),
  });
}

// ─── 1. Boucle crew fermée normale → intérieur crew capturé ──────────────────
Deno.test('runCrewBoundaryClose : boucle crew fermée → intérieur pris (claimed_neutral)', async () => {
  const { openerRing, finisherTrace } = crewSquare(350, 6); // ~350 m côté → intérieur non vide, sous plafond
  const seen: { capped?: readonly string[] } = {};
  const res = await close({
    openerRing,
    finisherTrace,
    finisherLengthM: 350,
    accumulatedLengthM: 1_050, // total ~1,4 km → plafond large
    resolve: neutralOwnership({ seen }),
  });

  assert(res.explanation.interiorClosed, 'le polygone doit enclore des cellules');
  assert(res.interiorCells.length > 0, 'un intérieur crew doit être capturé');
  assertEquals(res.cappedAt, false); // sous le plafond d'aire
  assertEquals(res.explanation.capReached, false);
  assertEquals(res.explanation.interiorCellCount, res.interiorCells.length);
  assertEquals(res.explanation.cappedCellCount, res.interiorCells.length);

  // capped passé tel quel au résolveur puis à decideClaims.
  assertEquals(seen.capped, res.interiorCells);

  // Tout neutre → claimed_neutral pionnier ; base > 0 ; actionable cohérent.
  const claimed = res.decision.results.filter((r) => r.outcome === 'claimed_neutral');
  assertEquals(claimed.length, res.interiorCells.length);
  assert(res.decision.totals.pioneer > 0);
  assert(res.explanation.points.base > 0);
  assertEquals(res.explanation.points.base, res.decision.totals.points);
  assertEquals(res.explanation.points.actionable, claimed.length);
});

// ─── 2. Plafond d'aire atteint → intérieur tronqué (cappedAt=true) ───────────
Deno.test('runCrewBoundaryClose : grande boucle crew → intérieur tronqué (cappedAt)', async () => {
  const { openerRing, finisherTrace } = crewSquare(900, 10); // area ~0,81 km² : intérieur > plafond pour de courtes distances
  const seen: { capped?: readonly string[] } = {};
  const res = await close({
    openerRing,
    finisherTrace,
    finisherLengthM: 600,
    accumulatedLengthM: 600, // total ~1,2 km → plafond d'aire bas devant l'aire réelle
    resolve: neutralOwnership({ seen }),
  });

  assert(res.explanation.interiorClosed);
  assert(res.cappedAt, 'le plafond d’aire doit être atteint');
  assertEquals(res.explanation.capReached, true);
  // Intérieur tronqué EXACTEMENT au plafond, strictement sous le brut.
  assertEquals(res.interiorCells.length, res.explanation.cellCap);
  assert(res.explanation.cappedCellCount < res.explanation.interiorCellCount);
  assertEquals(seen.capped, res.interiorCells);
  // decideClaims ne décide que les cellules plafonnées.
  assertEquals(res.decision.results.length, res.interiorCells.length);
});

// ─── 3. Intérieur vide (rare) → capped=[], on ferme quand même ───────────────
Deno.test('runCrewBoundaryClose : intérieur vide → capped=[], décision nulle, fermeture OK', async () => {
  // Anneau dégénéré (colinéaire) : aucun polygone plein → enclosedCells = [].
  const openerRing = [pt(0, 0), pt(100, 0), pt(200, 0)];
  const finisherTrace = [pt(200, 0), pt(0, 0)];
  const seen: { capped?: readonly string[] } = {};
  const res = await close({
    openerRing,
    finisherTrace,
    finisherLengthM: 200,
    accumulatedLengthM: 200,
    resolve: neutralOwnership({ seen }),
  });

  assertEquals(res.interiorCells.length, 0);
  assertEquals(res.cappedAt, false);
  assertEquals(res.explanation.interiorClosed, false);
  assertEquals(res.explanation.interiorCellCount, 0);
  assertEquals(res.explanation.cappedCellCount, 0);
  assertEquals(res.explanation.points.base, 0);
  assertEquals(res.explanation.points.actionable, 0);
  assertEquals(res.decision.results.length, 0);
  assertEquals(res.decision.totals.claimed, 0);
  assertEquals(seen.capped, []); // résolveur appelé avec l'ensemble vide
});
