/**
 * GRYD — RÉSULTAT SERVEUR de la dernière course (O1 Pass 3, 11/07/2026).
 *
 * `ingest_run` (seul juge) renvoie un IngestRunResponse complet (points, zones,
 * XP, badges, bonus, streak…). Jusqu'ici useRealRun jetait cette réponse (`const
 * { error }` ignorait `data`). On la CAPTURE ici, singleton module (même pattern
 * que route/plannedRoute.ts) : useRealRun l'ARME juste avant de naviguer vers le
 * Résultat (l'upload est attendu — le statut queued/sent est déjà propagé), et
 * course-result la LIT pour afficher ce que le serveur a RÉELLEMENT décidé. Absent
 * (hors session, envoi en file, rejet) → l'écran le dit, il n'invente rien.
 * Le client n'écrit jamais rien : lecture seule d'affichage.
 *
 * ⚠ CE SINGLETON DOIT ÊTRE PURGÉ AU DÉPART DE CHAQUE COURSE. Il n'était armé
 * que sur succès et jamais remis à null : le verdict de la course N restait donc
 * en mémoire, et la course N+1 terminée en 'queued' / 'rejected' / 'lost'
 * affichait les points et les zones de la PRÉCÉDENTE. Un joueur se voyait
 * attribuer une capture qu'il venait de ne pas faire — le mensonge exact que ce
 * projet traque. D'où `clearLastRunResult()`, appelé au démarrage des capteurs.
 */
import type { IngestRunResponse } from '@klaim/shared';

import { createOwnedRunMemory2026, type RunOwnerScope2026 } from './resultOwner2026';
const memory = createOwnedRunMemory2026<IngestRunResponse>();
export function setLastRunResult(result: IngestRunResponse | null, scope: RunOwnerScope2026): void {
  if (result) memory.set(result, scope); else memory.clear();
}
export function clearLastRunResult(): void { memory.clear(); }
export function getLastRunResult(ownerId?: string | null, clientRunId?: string): IngestRunResponse | null {
  return memory.get(ownerId, clientRunId);
}
