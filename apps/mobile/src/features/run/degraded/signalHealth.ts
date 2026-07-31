/**
 * GRYD — E24 « GPS FAIBLE / ACTIVITÉ EN RÉCUPÉRATION » : LA DÉCISION, PURE.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md l.1201-1215.)
 *
 * ═══ « GPS FAIBLE » EST UN ÉTAT HONNÊTE, PAS UN ÉCHEC ═══════════════════════
 * Le pipeline ne connaît que trois valeurs (`engine/gps.ts:signalState` →
 * `ok` / `weak` / `lost`) et l'écran en tirait déjà deux pills. Ce n'est pas
 * assez : au même mot `lost` correspondent SIX situations que le joueur vit
 * différemment, et trois d'entre elles ne sont même pas des pannes.
 *
 *   MESURE EN COURS     — on vient de partir, aucune position n'est encore
 *                         arrivée. Rien n'est perdu : on n'a jamais rien eu.
 *                         « Un chargement n'affirme rien sur le joueur. »
 *   JAMAIS REÇUE        — l'attente dépasse `GPS_SIGNAL_LOST_AFTER_S`. Ce
 *                         n'est TOUJOURS pas « perdu » : c'est « rien n'arrive ».
 *                         Deux faits différents, deux phrases différentes.
 *   DÉGRADÉE            — les positions arrivent, moins précises ou plus
 *                         espacées. L'ACTIVITÉ CONTINUE DE S'ENREGISTRER. C'est
 *                         le cas que la spec nomme « GPS faible : continuer en
 *                         enregistrant » (l.1204).
 *   PERDUE              — plus aucune position fraîche. L'activité continue de
 *                         TOURNER, mais elle n'enregistre plus : il y aura un
 *                         TROU dans la trace.
 *   AUTORISATION COUPÉE — l'accident. Il ne se répare pas en attendant.
 *   SUSPENDUE           — le joueur est en pause manuelle : les positions sont
 *                         ignorées volontairement. Parler de « signal perdu »
 *                         ici serait inventer une panne à partir d'un choix.
 *
 * ═══ ⚠ CE QUE CE MODULE INTERDIT STRUCTURELLEMENT ═══════════════════════════
 * IL N'EXISTE AUCUNE FONCTION D'INTERPOLATION DANS CE FICHIER, ET IL NE DOIT
 * JAMAIS Y EN AVOIR. Un trou dans la trace est un FAIT ; une position fabriquée
 * pour « lisser » le tracé est un mensonge qui finit dans un verdict de capture,
 * c'est-à-dire dans du territoire pris à quelqu'un sur la foi d'un point que
 * personne n'a jamais mesuré. Le dépôt tient déjà cette ligne ailleurs, et
 * `signalHealth.test.ts` le VÉRIFIE sur le vrai pipeline :
 *   · `cleanTrace` marque la discontinuité (`gapBefore`) au lieu de la combler ;
 *   · `totalDistanceM` ne compte JAMAIS une paire séparée par un trou ;
 *   · `splitAndSampleAtGaps` coupe la polyligne — le segment plein est ce qui a
 *     été mesuré, le pointillé est ce que personne n'a mesuré (planche E07).
 * `health === 'lost'` sert donc à DIRE le trou, jamais à le remplir.
 *
 * ═══ CE QUI N'EST PAS ICI ═══════════════════════════════════════════════════
 * · RÉSEAU ABSENT (l.1212, « file d'attente locale ») — ce n'est pas un état du
 *   SIGNAL, et il est déjà tenu de bout en bout par la file d'envoi
 *   (`lib/pendingUpload.ts`) et par la machine d'analyse E27
 *   (`analysis/analysisMachine.ts`, phases `deferred` / `unstored`). L'ajouter
 *   ici dupliquerait une vérité qui existe déjà.
 * · APP TUÉE (l.1207) — `gps/crashRecovery.ts`, déjà pur, déjà testé, déjà
 *   branché au lancement (`app/_layout.tsx:171`). Ce module ne le redécide pas :
 *   il se contente d'en NOMMER la cause pour la mesure (`interruptionCause`).
 *
 * PUR : aucun import React/RN, aucune I/O, aucune horloge implicite.
 */
import type { GpsSignalState } from '../gps/engine/gps';

// ═══════════════════════════════════════════════════════════════════════════
// 1. L'ÉTAT DU SIGNAL, DIT AVEC LE BON MOT
// ═══════════════════════════════════════════════════════════════════════════

export type SignalHealth =
  /** Pause MANUELLE : on n'écoute pas. Aucune panne à annoncer. */
  | 'suspended'
  /** L'autorisation a été retirée en course. */
  | 'revoked'
  /** Départ récent, aucune position encore arrivée — LECTURE EN COURS. */
  | 'measuring'
  /** L'attente dépasse le délai moteur : rien n'arrive (≠ on a perdu). */
  | 'never_received'
  /** Plus aucune position fraîche : la trace aura un TROU, et on le dira. */
  | 'lost'
  /** Positions moins bonnes, mais RÉELLES : on continue d'enregistrer. */
  | 'degraded'
  /** Rien à signaler. */
  | 'ok';

export interface SignalInput {
  /** Pause MANUELLE en cours (`describePause().pause === 'user'`). */
  readonly pausedByUser: boolean;
  /** Autorisation de localisation retirée EN COURSE. */
  readonly permissionRevoked: boolean;
  /** Aucune position n'est encore JAMAIS arrivée depuis le départ. */
  readonly awaitingFirstFix: boolean;
  /** …et l'attente dépasse `GPS_SIGNAL_LOST_AFTER_S` (jamais un nombre ici). */
  readonly firstFixOverdue: boolean;
  /** Verdict du moteur sur le DERNIER fix brut (`engine/gps.ts:signalState`). */
  readonly signal: GpsSignalState;
}

export interface SignalModel {
  readonly health: SignalHealth;
  /**
   * L'activité ENREGISTRE-T-ELLE encore des positions exploitables ?
   *
   * ⚠ `degraded` vaut TRUE, et c'est tout le point d'E24 : un signal faible
   * n'arrête rien. Peindre un état d'échec sur une activité qui s'enregistre
   * ferait abandonner des sorties parfaitement valides.
   */
  readonly recording: boolean;
  /**
   * Cet état laisse-t-il un TROU dans la trace ? Vrai seulement quand on
   * n'enregistre pas ALORS QU'ON DEVRAIT — donc jamais en pause manuelle (le
   * joueur a choisi), jamais avant la première position (il n'y a pas encore de
   * trace à trouer).
   */
  readonly leavesGap: boolean;
}

/**
 * ORDRE DE PRIORITÉ — le même que `GpsSignalPill` et `selectLiveNotice`, pour
 * qu'aucune surface de l'écran ne puisse contredire une autre :
 *   pause manuelle > permission > première position > perte > faiblesse.
 */
export function describeSignal(input: SignalInput): SignalModel {
  if (input.pausedByUser) {
    return { health: 'suspended', recording: false, leavesGap: false };
  }
  if (input.permissionRevoked) {
    return { health: 'revoked', recording: false, leavesGap: true };
  }
  if (input.awaitingFirstFix) {
    // Ni l'un ni l'autre ne troue une trace : il n'y a pas encore de trace.
    return input.firstFixOverdue
      ? { health: 'never_received', recording: false, leavesGap: false }
      : { health: 'measuring', recording: false, leavesGap: false };
  }
  if (input.signal === 'lost') {
    return { health: 'lost', recording: false, leavesGap: true };
  }
  if (input.signal === 'weak') {
    // LE CAS QUI DONNE SON NOM À L'ÉCRAN : ça continue.
    return { health: 'degraded', recording: true, leavesGap: false };
  }
  return { health: 'ok', recording: true, leavesGap: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. L'EVENT §18 — `activity_interrupted`, SUR TRANSITION UNIQUEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les causes d'`EVENTS.activityInterrupted` OBSERVABLES depuis l'état du signal.
 * `app_killed` et `sensor_inconsistent` existent aussi dans le catalogue mais ne
 * se lisent PAS ici : le premier se décide au lancement (`crashRecovery.ts`), le
 * second à l'ingestion. Les inventer depuis un état de signal serait affirmer un
 * fait qu'on n'a pas mesuré.
 */
export type SignalInterruption = 'signal_lost' | 'permission_revoked';

/**
 * `prev → next` : faut-il émettre `activity_interrupted`, et avec quelle cause ?
 *
 * ⚠ SUR TRANSITION, JAMAIS SUR ÉTAT. L'écran de course recalcule à 1 Hz avec le
 * GPS actif : émettre « pendant que le signal est perdu » enverrait un event par
 * seconde de tunnel. Une transition `lost → revoked` compte pour un NOUVEL
 * accident (ce n'est pas le même fait), une transition `degraded → lost` aussi ;
 * `measuring → never_received` n'en est PAS un — rien n'a été interrompu, rien
 * n'avait commencé.
 */
export function stepInterruptionTelemetry(
  prev: SignalHealth,
  next: SignalHealth,
): SignalInterruption | null {
  if (prev === next) return null;
  if (next === 'revoked') return 'permission_revoked';
  if (next === 'lost') return 'signal_lost';
  return null;
}
