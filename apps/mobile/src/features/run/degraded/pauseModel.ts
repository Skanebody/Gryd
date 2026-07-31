/**
 * GRYD — E23 « PAUSE » : LA DÉCISION, PURE ET TESTÉE.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md l.1185-1197.)
 *
 * ═══ LE FAIT QUE CET ÉCRAN NE DOIT JAMAIS BROUILLER ═════════════════════════
 * Une activité peut s'arrêter de compter pour TROIS raisons qui n'ont rien à
 * voir entre elles, et que rien dans le pipeline ne distingue une fois qu'on
 * regarde seulement « le chrono est gelé » :
 *
 *   · LE JOUEUR A CHOISI       — il a tapé PAUSE. C'est une décision. Elle se
 *     défait exactement comme elle s'est prise : en tapant. (`paused-user`)
 *   · L'APP A CONSTATÉ         — le moteur GPS voit une immobilité sous
 *     `GPS_PAUSE_SPEED_MS` pendant `GPS_PAUSE_AFTER_S` (feu rouge, lacet,
 *     photo). Personne n'a rien décidé : l'app RAPPORTE. Elle se défait en
 *     REPARTANT, pas en tapant — d'où la copie « BOUGE POUR REPRENDRE »
 *     (`statusPausedAuto`, i18n/catalog/runGps.ts). (`paused-auto`)
 *   · QUELQUE CHOSE A CASSÉ    — l'autorisation de localisation a été retirée
 *     EN COURSE. Ni choix ni constat : un accident. Il ne se défait ni en
 *     tapant ni en courant — seulement dans les réglages du téléphone.
 *
 * Les présenter avec le même mot serait un mensonge d'écran au sens littéral de
 * la constitution : « EN PAUSE » sur un accident laisse croire qu'on a décidé,
 * et « bouge pour reprendre » sur une permission coupée demande un geste qui ne
 * marchera jamais (« aucun bouton mort », version phrase).
 *
 * ═══ CE QUE CE MODULE FAIT, ET NE FAIT PAS ══════════════════════════════════
 * Il ne rend rien et il ne pause rien. Il REND LISIBLE la frontière ci-dessus,
 * pour que l'écran et l'analytics ne puissent pas la franchir par distraction :
 *  · `describePause` — quelle sorte de pause, comment on en sort, et si les
 *    gestes rares (terminer / annuler) ont le droit d'être offerts ;
 *  · `stepPauseTelemetry` — l'event §18 à émettre SUR TRANSITION uniquement.
 *
 * ⚠ POURQUOI « SUR TRANSITION » N'EST PAS UN DÉTAIL DE STYLE : l'écran de course
 * recalcule son snapshot à 1 Hz, l'écran allumé, pendant une sortie. Un event
 * émis « quand on est en pause » plutôt que « quand on ENTRE en pause » enverrait
 * un point par seconde d'arrêt à un feu rouge — de la batterie et du réseau
 * dépensés pour rendre le taux de pause inexploitable.
 *
 * PUR : aucun import React/RN, aucune I/O, aucune horloge (rien à injecter ici —
 * la décision ne dépend que de l'état, jamais du temps).
 */
import { type Activity, activityProducesResult } from '@klaim/shared';
import type { TrackerPhase } from '../gps/runPipeline';

// ═══════════════════════════════════════════════════════════════════════════
// 1. QUELLE SORTE DE PAUSE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les quatre valeurs, alignées MOT POUR MOT sur `EVENTS.activityPaused.cause`
 * et `EVENTS.activityInterrupted.cause` (packages/shared/src/events.ts). Cet
 * alignement n'est pas décoratif : c'est ce qui empêche l'écran et la mesure de
 * raconter deux histoires différentes du même arrêt.
 */
export type ActivityPause = 'none' | 'user' | 'auto_still' | 'permission_revoked';

/** La nature de l'arrêt — la distinction que tout le module protège. */
export type PauseOrigin =
  /** Le joueur a décidé. */
  | 'choice'
  /** L'app a constaté une immobilité. Elle rapporte, elle ne décide pas. */
  | 'observation'
  /** Quelque chose a cassé hors du jeu (permission retirée). */
  | 'accident';

/** Comment on SORT de cet arrêt. Jamais l'un présenté pour l'autre. */
export type PauseExit =
  /** Retaper le bouton (l'inverse exact du geste qui a mis en pause). */
  | 'tap'
  /** Repartir. Aucun bouton n'y changera rien. */
  | 'movement'
  /** Rendre l'autorisation dans les réglages du téléphone. */
  | 'permission';

export interface PauseInput {
  /** Phase RÉELLE du tracker (`runPipeline.computeSnapshot`). */
  readonly phase: TrackerPhase;
  /** L'autorisation de localisation a été retirée EN COURSE (re-check 10 s). */
  readonly permissionRevoked: boolean;
}

export interface PauseModel {
  readonly pause: ActivityPause;
  /** `null` quand rien n'est en pause (l'activité tourne, ou elle est finie). */
  readonly origin: PauseOrigin | null;
  readonly exit: PauseExit | null;
  /**
   * L'activité ENREGISTRE-T-ELLE encore ? Faux dans les trois pauses, et pour
   * trois raisons différentes — mais un écran qui affirmerait « on enregistre »
   * dans l'une d'elles mentirait pareil.
   */
  readonly recording: boolean;
  /**
   * Les gestes RARES d'E23 (`Terminer`, `Annuler`) ont-ils le droit d'être
   * peints ? UNIQUEMENT dans une pause CHOISIE. Deux raisons, et aucune n'est
   * cosmétique :
   *  · dans une pause auto, le joueur est arrêté trente secondes à un feu — lui
   *    poser sous le pouce un bouton qui SUPPRIME sa sortie serait un piège ;
   *  · une pause auto se défait toute seule dès qu'il repart : la surface
   *    disparaîtrait sous son doigt au moment où il la touche.
   */
  readonly offersRareGestures: boolean;
}

/** Aucun arrêt : soit l'activité tourne (`recording` corrigé à l'appel), soit
 *  elle n'existe pas / plus (idle, finished) — une activité terminée n'est PAS
 *  « en pause », le dire ferait croire qu'elle peut repartir. */
const NOT_PAUSED: PauseModel = {
  pause: 'none',
  origin: null,
  exit: null,
  recording: false,
  offersRareGestures: false,
};

/**
 * ORDRE DE PRIORITÉ, ET POURQUOI IL EST CELUI-LÀ.
 *
 * 1. `finished` / `idle` — rien n'est en pause : il n'y a pas d'activité à
 *    arrêter. (Une activité terminée n'est pas « en pause » ; le dire ferait
 *    croire qu'elle peut repartir.)
 * 2. `paused-user` — LE CHOIX PASSE AVANT L'ACCIDENT. Si l'autorisation tombe
 *    pendant une pause manuelle, l'écran doit continuer de dire ce que le
 *    joueur a fait ; l'accident est signalé par ailleurs (`GpsSignalPill` et
 *    `selectLiveNotice`, qui traitent déjà la permission coupée comme un avis
 *    de sûreté prioritaire). Inverser reviendrait à effacer le geste du joueur
 *    de son propre écran.
 * 3. `permission_revoked` — l'accident passe avant le constat d'immobilité :
 *    sans position, l'immobilité mesurée n'est PAS une immobilité observée,
 *    c'est une absence de mesure. Dire « bouge pour reprendre » à quelqu'un
 *    dont le GPS est coupé lui demande un geste qui ne marchera jamais.
 * 4. `paused-auto`.
 */
export function describePause(input: PauseInput): PauseModel {
  if (input.phase === 'finished' || input.phase === 'idle') {
    return NOT_PAUSED;
  }
  if (input.phase === 'paused-user') {
    return {
      pause: 'user',
      origin: 'choice',
      exit: 'tap',
      recording: false,
      offersRareGestures: true,
    };
  }
  if (input.permissionRevoked) {
    return {
      pause: 'permission_revoked',
      origin: 'accident',
      exit: 'permission',
      recording: false,
      offersRareGestures: false,
    };
  }
  if (input.phase === 'paused-auto') {
    return {
      pause: 'auto_still',
      origin: 'observation',
      exit: 'movement',
      recording: false,
      offersRareGestures: false,
    };
  }
  return { ...NOT_PAUSED, recording: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. L'EVENT §18, SUR TRANSITION UNIQUEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ce qu'il faut émettre au passage `prev → next`. `null` = rien ne s'est passé
 * (même état, ou transition qui n'a pas de nom dans le catalogue).
 *
 * `activity_paused` et `activity_interrupted` sont DEUX events distincts, et la
 * raison est écrite dans `events.ts` : mêler la permission coupée aux deux
 * autres rendrait le taux de pause inexploitable — on ne saurait plus si les
 * gens soufflent ou si le produit casse.
 */
export type PauseTelemetry =
  | { readonly event: 'activity_paused'; readonly cause: 'user' | 'auto_still' }
  | { readonly event: 'activity_interrupted'; readonly cause: 'permission_revoked' }
  | { readonly event: 'activity_resumed'; readonly from: 'pause' };

export function stepPauseTelemetry(
  prev: ActivityPause,
  next: ActivityPause,
): PauseTelemetry | null {
  if (prev === next) return null;
  if (next === 'none') {
    // On REPART. Peu importe de quelle sorte de pause on sort : `activity_resumed
    // { from: 'pause' }` existe déjà et couvre exactement ce cas (events.ts) —
    // un second nom par sorte de pause dédoublerait la reprise sans rien dire de
    // plus que `activity_paused { cause }`, émis quelques secondes plus tôt.
    return { event: 'activity_resumed', from: 'pause' };
  }
  if (next === 'permission_revoked') {
    return { event: 'activity_interrupted', cause: 'permission_revoked' };
  }
  return { event: 'activity_paused', cause: next };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA TROISIÈME ACTION — « ANNULER L'ACTIVITÉ » (spec l.1192 et l.1197)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quelle phrase la confirmation doit tenir. Ce n'est PAS un habillage : jeter
 * une sortie de quarante secondes et jeter une sortie qui aurait pris du
 * territoire ne sont pas la même décision, et l'écran doit dire laquelle des
 * deux on est en train de prendre.
 */
export type CancelBody =
  /** Sous les minima §3.2 : rien n'aurait compté de toute façon. */
  | 'plain'
  /** Au-dessus des minima : cette sortie AURAIT pu prendre du territoire. */
  | 'would_count';

export interface CancelActivityInput {
  readonly pause: ActivityPause;
  /** Distance NETTE mesurée (m) — `TrackerSnapshot.distanceM`. */
  readonly distanceM: number;
  /** Durée ACTIVE mesurée (s) — `TrackerSnapshot.activeS`. */
  readonly durationS: number;
  /** Discipline RÉELLE de la sortie (figée au départ). */
  readonly activity: Activity;
}

export interface CancelActivityModel {
  /** L'action a-t-elle le droit d'être PEINTE ? */
  readonly offered: boolean;
  /**
   * Verdict de `activityProducesResult()` — LES MÊMES minima §3.2 que le
   * serveur, jamais un troisième seuil inventé pour cet écran. C'est aussi la
   * propriété envoyée avec `activity_cancelled` : elle répond à la seule
   * question qui compte, « combien de sorties détruites auraient compté ? ».
   */
  readonly producesResult: boolean;
  readonly body: CancelBody;
}

/**
 * ANNULER SE DEMANDE TOUJOURS, ET NE SE FAIT JAMAIS D'UN SEUL TAP.
 *
 * C'est le seul geste du produit qui DÉTRUIT une mesure d'effort : il n'y a pas
 * de corbeille derrière lui (`runStore.clearActiveRun` / `clearCurrentRun`
 * effacent le tampon, et rien n'est envoyé au serveur). La confirmation n'est
 * donc pas conditionnelle ici, contrairement à `TERMINER` (E26, spec l.1194 :
 * confirmation « uniquement si l'activité est trop courte ») — terminer met à
 * l'abri, annuler supprime. Les deux gestes n'ont pas la même conséquence, ils
 * n'ont pas la même garde.
 *
 * L'action n'est OFFERTE que dans une pause CHOISIE : cf. `offersRareGestures`.
 */
export function cancelActivityModel(input: CancelActivityInput): CancelActivityModel {
  const producesResult = activityProducesResult(
    input.distanceM,
    input.durationS,
    input.activity,
  );
  return {
    offered: input.pause === 'user',
    producesResult,
    body: producesResult ? 'would_count' : 'plain',
  };
}
