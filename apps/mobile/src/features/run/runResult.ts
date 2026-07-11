/**
 * GRYD — RÉSULTAT SERVEUR de la dernière course (O1 Pass 3, 11/07/2026).
 *
 * `ingest_run` (seul juge) renvoie un IngestRunResponse complet (points, zones,
 * XP, badges, bonus, streak…). Jusqu'ici useRealRun jetait cette réponse (`const
 * { error }` ignorait `data`). On la CAPTURE ici, singleton module (même pattern
 * que route/plannedRoute.ts) : useRealRun l'ARME juste avant de naviguer vers le
 * Résultat (l'upload est attendu — le statut queued/sent est déjà propagé), et
 * course-result la LIT pour afficher ce que le serveur a RÉELLEMENT décidé, avec
 * fallback sur la simulation démo quand elle est absente (course web / hors
 * session — aucun envoi). Le client n'écrit jamais rien : lecture seule d'affichage.
 */
import type { IngestRunResponse } from '@klaim/shared';

let lastResult: IngestRunResponse | null = null;

/** Arme le résultat serveur (appelé par useRealRun après un ingest_run 'sent'). */
export function setLastRunResult(result: IngestRunResponse | null): void {
  lastResult = result;
}

/** Résultat serveur de la dernière course, ou null (démo / hors session). */
export function getLastRunResult(): IngestRunResponse | null {
  return lastResult;
}
