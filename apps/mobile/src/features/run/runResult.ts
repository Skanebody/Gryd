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

let lastResult: IngestRunResponse | null = null;

/** Arme le résultat serveur (appelé par useRealRun après un ingest_run 'sent'). */
export function setLastRunResult(result: IngestRunResponse | null): void {
  lastResult = result;
}

/**
 * Purge le verdict précédent. À appeler AU DÉPART d'une course, jamais à
 * l'arrivée : entre les deux, l'écran de résultat doit encore pouvoir le lire.
 */
export function clearLastRunResult(): void {
  lastResult = null;
}

/** Résultat serveur de la dernière course, ou null (hors session / non jugée). */
export function getLastRunResult(): IngestRunResponse | null {
  return lastResult;
}
