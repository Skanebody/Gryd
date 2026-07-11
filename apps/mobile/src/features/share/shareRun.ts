/**
 * GRYD — DONNÉES DE PARTAGE de la course affichée (zéro-friction, partage VRAI).
 *
 * L'écran Résultat ARME ici les stats de LA course affichée (mêmes valeurs que
 * son KPI : zones, zone, boucle, distance/allure/durée, points) juste avant de
 * naviguer vers /partage ; PartageScreen les LIT pour alimenter les templates.
 * Singleton module (même pattern que run/runResult.ts) — lecture seule
 * d'affichage, rien ne part au serveur.
 *
 * Si /partage s'ouvre SANS course armée (deep link, dev), il retombe sur
 * SHARE_DEMO et se présente comme EXEMPLE — jamais comme « ta course ».
 */
import type { RunIntention } from '../run/intention';
import type { LiveRunMode } from '../run/simulation';
import { SHARE_DEMO, type ShareDemoData } from './templates';

export interface ShareRunData {
  /** Valeurs projetées dans les cards — celles de l'écran Résultat. */
  card: ShareDemoData;
  /** Intention client (teinte titre + style par défaut — jamais l'attribution). */
  intention: RunIntention | null;
  /** Mode de la course (social_run = stats seules, aucune capture à montrer). */
  mode: LiveRunMode;
}

let current: ShareRunData | null = null;

/** Arme les données de partage (appelé par le Résultat avant router.push). */
export function setShareRun(data: ShareRunData | null): void {
  current = data;
}

/** Données de la course affichée, ou null (aucune course → exemple). */
export function getShareRun(): ShareRunData | null {
  return current;
}

/**
 * Card de partage depuis les stats du Résultat : les champs non fournis par le
 * run (zonesDefended, holdHours…) restent ceux du scénario démo — TODO(O1) :
 * en prod, tout vient d'IngestRunResponse (le serveur reste seul juge).
 */
export function shareCardFromResult(overrides: Partial<ShareDemoData>): ShareDemoData {
  return { ...SHARE_DEMO, ...overrides };
}
