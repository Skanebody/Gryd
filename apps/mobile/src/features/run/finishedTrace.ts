/**
 * GRYD — TRACÉ RÉEL de la dernière course, pour l'écran de RÉSULTAT (§25, pic
 * peak-end). Le RunTracker (features/run/gps/tracker.ts) mesure la vraie
 * polyligne PENDANT la course, mais elle MOURAIT à `finish()` : RealCourseLive
 * ne transmettait que dist+dur, et `IngestRunResponse` ne renvoie aucune trace.
 * Le Résultat n'avait donc AUCUNE géométrie réelle (le tracé de la share-card
 * restait à `[]`, et aucun tracé n'apparaissait sur l'écran).
 *
 * On la CAPTURE ici, singleton module — même patron que `runResult.ts` et
 * `route/plannedRoute.ts` : `useRealRun` l'ARME juste avant de naviguer vers le
 * Résultat (depuis `snapshot.tracePoints`), et `course-result` la LIT pour
 * dessiner LE parcours réellement couru — jamais une géométrie d'authoring.
 *
 * HONNÊTE : c'est la trace MESURÉE, jamais fabriquée. Absente (reprise après kill
 * sans points, ou < 2 points) → l'écran ne dessine RIEN plutôt qu'un tracé
 * inventé. Le client n'écrit jamais rien ailleurs : lecture seule d'affichage.
 *
 * ⚠ PURGÉ AU DÉPART DE CHAQUE COURSE (exactement comme `runResult.ts`). Sans ça,
 * la course N+1 terminée en 'queued' afficherait le TRACÉ de la course N — le
 * mensonge précis que ce projet traque. D'où `clearFinishedTrace()`, appelé au
 * démarrage des capteurs, à côté de `clearLastRunResult()`.
 *
 * Vie privée : ce tracé ne sert qu'à l'affichage LOCAL du résultat (la vue du
 * coureur lui-même). Tout partage SORTANT doit d'abord passer par
 * `applySharePrivacy` (features/share/sharePrivacy.ts) — jamais la trace brute,
 * dont le départ/arrivée trahit le domicile.
 *
 * PUR : structurel, aucun import (Deno-testable) — le type lat/lng est
 * compatible avec `LatLngPoint` (features/map/realAnchors) et `tracePoints`.
 */
type LatLng = { readonly lat: number; readonly lng: number };

import { createOwnedRunMemory2026, type RunOwnerScope2026 } from './resultOwner2026';
const memory = createOwnedRunMemory2026<{ trace: readonly LatLng[]; segments: readonly (readonly LatLng[])[] }>();

export function setFinishedTrace(trace: readonly LatLng[], segments: readonly (readonly LatLng[])[] | undefined, scope: RunOwnerScope2026): void {
  memory.set({ trace, segments: segments ?? (trace.length > 1 ? [trace] : []) }, scope);
}
export function clearFinishedTrace(): void { memory.clear(); }
export function getFinishedTrace(ownerId?: string | null, clientRunId?: string): readonly LatLng[] {
  return memory.get(ownerId, clientRunId)?.trace ?? [];
}
export function getFinishedSegments(ownerId?: string | null, clientRunId?: string): readonly (readonly LatLng[])[] {
  return memory.get(ownerId, clientRunId)?.segments ?? [];
}
