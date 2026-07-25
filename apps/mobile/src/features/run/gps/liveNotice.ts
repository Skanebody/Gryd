/**
 * GRYD — §10 « UNE seule information temporaire à la fois » sur l'écran de course.
 *
 * Avant : la pile du haut (signal GPS, précision approx., premier-plan, rationale
 * arrière-plan, reprise) ET le guidage de boucle du centre pouvaient s'afficher
 * EN MÊME TEMPS — « BOUCLE PRÊTE » sous « GPS FAIBLE ». §10 l'interdit.
 *
 * Ce sélecteur PUR choisit UN SEUL avis temporaire, par PRIORITÉ. Ne sont PAS
 * comptés ici (contexte permanent, toujours affiché) : la pill d'ÉTAT (en
 * cours/pause/recherche) et la pill de MODE (social/privé) — ce sont des libellés
 * d'état, pas des alertes.
 *
 * Ordre = SÛRETÉ d'abord, puis décisions, puis qualité de signal, puis la note
 * plate de plateforme en DERNIER :
 *   1 signal_critical  — perdu / autorisation coupée / jamais reçu : la course
 *                        n'enregistre PLUS. Prime toujours (rien ne la masque).
 *   2 restore          — course interrompue retrouvée : décision anti-perte.
 *   3 bg_offer         — permission arrière-plan proposée (décision).
 *   4 signal_weak      — signal faible (avertissement doux).
 *   5 precise          — position approximative (qualité de capture).
 *   6 foreground       — « enregistré seulement app ouverte » (note permanente,
 *                        cède à tout le reste).
 *   7 none.
 *
 * PLANCHE E07 (25/07/2026) : la FERMETURE DE BOUCLE a QUITTÉ ce sélecteur. Elle
 * n'est plus un avis temporaire disputant un slot aux alertes : c'est un ÉTAT
 * PERMANENT de la course, dessiné SUR LA CARTE (segment pointillé + progression)
 * et résumé par une pill d'en-tête, au même titre que la pill d'état. §10 est
 * respecté — le slot d'avis reste unique, la boucle n'y entre plus.
 *
 * PUR : aucun import natif, aucun état — testable, sûr dans le bundle web.
 */
import type { GpsSignalState } from './engine/gps';

export type LiveNotice =
  | 'signal_critical'
  | 'restore'
  | 'bg_offer'
  | 'signal_weak'
  | 'precise'
  | 'foreground'
  | 'none';

export interface LiveNoticeInput {
  /** Pause MANUELLE : les fixes sont ignorés — jamais de faux « signal perdu ». */
  readonly pausedByUser: boolean;
  readonly permissionRevoked: boolean;
  /** Aucune position n'est encore jamais arrivée depuis le départ. */
  readonly awaitingFirstFix: boolean;
  /** …et l'attente dépasse le délai moteur (sinon la pill d'état suffit). */
  readonly firstFixOverdue: boolean;
  readonly signal: GpsSignalState;
  readonly hasRestore: boolean;
  readonly bgPrompt: 'hidden' | 'offer' | 'denied';
  readonly approxLocation: boolean;
  readonly foregroundOnlyPlatform: boolean;
}

/** L'UNIQUE avis temporaire à afficher (§10). Miroir fidèle de GpsSignalPill. */
export function selectLiveNotice(i: LiveNoticeInput): LiveNotice {
  // Sévérité du signal — EXACTEMENT la logique de GpsSignalPill : en pause
  // manuelle, aucun signal ; en attente du 1er fix, seul un dépassement compte
  // (sinon la pill « RECHERCHE GPS… » dit déjà tout).
  const signalCritical =
    !i.pausedByUser &&
    (i.permissionRevoked || (i.awaitingFirstFix ? i.firstFixOverdue : i.signal === 'lost'));
  const signalWeak =
    !i.pausedByUser && !i.awaitingFirstFix && i.signal === 'weak';
  const foreground = i.foregroundOnlyPlatform || i.bgPrompt === 'denied';

  if (signalCritical) return 'signal_critical';
  if (i.hasRestore) return 'restore';
  if (i.bgPrompt === 'offer') return 'bg_offer';
  if (signalWeak) return 'signal_weak';
  if (i.approxLocation) return 'precise';
  if (foreground) return 'foreground';
  return 'none';
}
