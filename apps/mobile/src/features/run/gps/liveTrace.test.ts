/**
 * GRYD — E20/E21 : la révision de trace ne peut pas laisser un écran MENTIR.
 *
 * L'enjeu de ces tests n'est pas la performance (elle se mesure, elle ne se
 * teste pas) : c'est l'HONNÊTETÉ. `RealCourseLive` ne redessine la trace que
 * lorsque `traceRevision` change. Si la révision pouvait rester identique alors
 * que la trace mesurée a bougé, la carte afficherait un tracé PÉRIMÉ pendant
 * une course réelle — un mensonge d'écran au sens le plus littéral de la
 * constitution.
 *
 * On ne teste donc pas la fonction contre elle-même : on rejoue de VRAIS flux
 * de fixes à travers le VRAI `computeSnapshot`, fix par fix, et on vérifie sur
 * chaque paire de snapshots consécutifs :
 *     révision inchangée  ⇒  `traceSegments` rigoureusement identiques.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeSnapshot, type RunPipelineState } from './runPipeline.ts';
import { traceRevision } from './liveTrace.ts';
import type { RawFix } from './engine/gps.ts';

const START_TS = 1_700_000_000_000;
const PARIS = { lat: 48.8566, lng: 2.3522 };
/** ~1 m en latitude (WGS84) — une commodité de fabrication, pas une règle. */
const M_IN_DEG_LAT = 1 / 111_320;

function state(fixes: readonly RawFix[], activity: 'run' | 'bike'): RunPipelineState {
  return {
    fixes,
    activity,
    mode: 'conquete',
    startedAt: START_TS,
    userPausedMs: 0,
    userPausedSinceTs: null,
    finished: false,
  };
}

/** Trace synthétique : marche en ligne droite, puis ARRÊT prolongé (jitter), puis reprise. */
function streamWithStop(speedMps: number): RawFix[] {
  const out: RawFix[] = [];
  let lat = PARIS.lat;
  let i = 0;
  const push = (accuracy = 8) => {
    out.push({ ts: START_TS + i * 1_000, lat, lng: PARIS.lng, accuracy });
    i += 1;
  };
  // 1. 60 s d'avancée régulière.
  for (let k = 0; k < 60; k += 1) {
    lat += speedMps * M_IN_DEG_LAT;
    push();
  }
  // 2. 40 s d'ARRÊT avec bruit GPS (le cas qui piège un compteur de points
  //    gardés : `dropStationaryJitter` supprime les points intérieurs).
  const anchor = lat;
  for (let k = 0; k < 40; k += 1) {
    lat = anchor + (k % 2 === 0 ? 1.5 : -1.5) * M_IN_DEG_LAT;
    push();
  }
  // 3. Reprise.
  lat = anchor;
  for (let k = 0; k < 60; k += 1) {
    lat += speedMps * M_IN_DEG_LAT;
    push();
  }
  return out;
}

/** Compare deux découpages de trace point par point (jamais par identité). */
function sameSegments(
  a: readonly (readonly { lat: number; lng: number }[])[],
  b: readonly (readonly { lat: number; lng: number }[])[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const sa = a[i]!;
    const sb = b[i]!;
    if (sa.length !== sb.length) return false;
    for (let k = 0; k < sa.length; k += 1) {
      if (sa[k]!.lat !== sb[k]!.lat || sa[k]!.lng !== sb[k]!.lng) return false;
    }
  }
  return true;
}

/**
 * LE TEST QUI COMPTE — LE SENS ANTI-PÉRIMÉ. Rejoue un vrai flux fix par fix
 * pour les DEUX disciplines (elles n'ont pas les mêmes bornes de nettoyage : le
 * même flux ne produit pas la même trace, et l'invariant doit tenir dans les
 * deux mondes) et vérifie que JAMAIS la trace ne change en silence.
 */
for (const [activity, speedMps] of [['run', 3], ['bike', 8]] as const) {
  Deno.test(`traceRevision — trace modifiée ⇒ révision modifiée (${activity})`, () => {
    const fixes = streamWithStop(speedMps);
    let prev: { rev: string; segments: readonly (readonly { lat: number; lng: number }[])[] } | null =
      null;
    let traceChanges = 0;
    for (let n = 1; n <= fixes.length; n += 1) {
      const nowTs = START_TS + n * 1_000;
      const snap = computeSnapshot(state(fixes.slice(0, n), activity), nowTs);
      const rev = traceRevision(snap);
      if (prev !== null) {
        const changed = !sameSegments(prev.segments, snap.traceSegments);
        if (changed) {
          traceChanges += 1;
          assertEquals(
            rev === prev.rev,
            false,
            `trace modifiée alors que la révision n'a pas bougé (n=${n}, rev=${rev})`,
          );
        }
      }
      prev = { rev, segments: snap.traceSegments };
    }
    // Garde-fou du test lui-même : un flux immobile ne prouverait rien.
    assert(traceChanges > 50, `flux trop pauvre (${traceChanges} changements)`);
  });
}

/**
 * LE MÊME FLUX, SANS BOUGER L'HORLOGE. Un tick d'UI arrive chaque seconde même
 * quand AUCUN fix n'est arrivé (tunnel, signal perdu, navigateur en veille) :
 * c'est exactement le cas où l'écran ne doit rien reconstruire.
 */
Deno.test('traceRevision — le seul temps qui passe ne change jamais la révision', () => {
  const fixes = streamWithStop(3).slice(0, 80);
  const base = computeSnapshot(state(fixes, 'run'), START_TS + 80_000);
  const later = computeSnapshot(state(fixes, 'run'), START_TS + 300_000);
  assertEquals(traceRevision(base), traceRevision(later));
  assert(sameSegments(base.traceSegments, later.traceSegments));
  // …et le chrono, lui, a bien avancé : la révision n'est pas une clé morte.
  assert(later.activeS > base.activeS);
});

/** Trace vide (aucun fix exploitable) : une révision existe quand même. */
Deno.test('traceRevision — trace vide : une clé stable, jamais une exception', () => {
  const empty = computeSnapshot(state([], 'run'), START_TS + 1_000);
  assertEquals(empty.tracePoints.length, 0);
  assertEquals(traceRevision(empty), traceRevision(empty));
  assert(traceRevision(empty).endsWith('none'));
});
