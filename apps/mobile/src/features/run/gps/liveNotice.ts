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
 * Ordre = SÛRETÉ d'abord, puis décisions, puis qualité de signal, puis guidage,
 * puis la note plate de plateforme en DERNIER (sinon, sur navigateur où elle est
 * toujours vraie, elle masquerait à jamais « BOUCLE PRÊTE ») :
 *   1 signal_critical  — perdu / autorisation coupée / jamais reçu : la course
 *                        n'enregistre PLUS. Prime toujours (rien ne la masque).
 *   2 restore          — course interrompue retrouvée : décision anti-perte.
 *   3 bg_offer         — permission arrière-plan proposée (décision).
 *   4 signal_weak      — signal faible (avertissement doux).
 *   5 precise          — position approximative (qualité de capture).
 *   6 loop_ready       — boucle prête (le moment ACTIONNABLE).
 *   7 loop_return      — retour ~N m (guidage doux).
 *   8 foreground       — « enregistré seulement app ouverte » (note permanente,
 *                        cède à tout le reste).
 *   9 none.
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
  | 'loop_ready'
  | 'loop_return'
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
  /** Guidage de boucle courant (moteur D4), ou null. */
  readonly loopHint: 'ready' | 'return' | null;
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
  if (i.loopHint === 'ready') return 'loop_ready';
  if (i.loopHint === 'return') return 'loop_return';
  if (foreground) return 'foreground';
  return 'none';
}
