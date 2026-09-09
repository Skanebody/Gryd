/**
 * GRYD — LA VOIX ET L'HAPTIQUE DE LA SORTIE RÉELLE (cahier G09, loi L6).
 *
 * ─── POURQUOI CE MODULE EXISTE ──────────────────────────────────────────────
 * Les règles « quand parler » et « quand vibrer » sont écrites, pures et
 * testées depuis le lot M9 (`mvp/run/feedback.ts`), et les trois phrases sont
 * au catalogue. Elles n'avaient qu'un seul appelant : l'écran du groupe
 * `(mvp)`, en quarantaine. La chaîne vivante — celle qui enregistre réellement
 * les sorties — était donc MUETTE : le seul canal qui atteint quelqu'un qui
 * court bras ballant, écran éteint, téléphone au brassard, n'existait pas pour
 * elle.
 *
 * Ce module ne réinvente aucune mécanique. Il TRADUIT la phase de fermeture de
 * la chaîne vivante (`engine/loopClosure`, la seule autorité de fermeture ici)
 * dans le vocabulaire des règles existantes, et laisse celles-ci décider. Une
 * deuxième implémentation de « quand parler » finirait par diverger de la
 * première, et c'est exactement le genre de divergence qu'on ne voit pas : elle
 * s'entend, une fois, pendant que quelqu'un court.
 *
 * ─── CE QUI RESTE HORS DE PORTÉE ────────────────────────────────────────────
 * `voice.ts` le documente : `expo-speech` ne touche pas l'`AVAudioSession`, et
 * `app.json` ne déclare pas le mode d'arrière-plan `audio` (décision fondateur :
 * pas d'`audio` avant un test sur appareil). L'annonce est donc PROBABLEMENT
 * muette écran verrouillé. Rien ici ne prétend le contraire.
 */
import { C } from '../../../i18n/catalog/mvp';
import type { Entry } from '../../../i18n/types';
import type { GaugePhase, VoiceCue } from '../../../mvp/run/feedback';
import type { LoopClosurePhase } from './engine/loopClosure';

/**
 * La phase de fermeture de la chaîne vivante, dite dans le vocabulaire des
 * règles de retour (voix + haptique). Les quatre valeurs se correspondent une à
 * une — `open` (on est en train de refermer, il manque des mètres) est
 * exactement ce que `missing` nomme, et `nearMiss` (dans la bande de tolérance
 * élargie) ce que `almost` nomme.
 */
export function gaugePhaseFromClosure2026(phase: LoopClosurePhase): GaugePhase {
  switch (phase) {
    case 'closed':
      return 'closed';
    case 'nearMiss':
      return 'almost';
    case 'open':
      return 'missing';
    case 'idle':
      return 'silent';
  }
}

/**
 * Ce que chaque moment DIT — des entrées du catalogue, jamais du texte (L18).
 * Les trois moments, et c'est tout : le départ, la boucle devenue fermable, la
 * boucle fermée.
 */
export const VOICE_LINE_2026: Readonly<Record<VoiceCue, Entry>> = {
  voiceStart: C.voiceStart,
  runLoopAlmost: C.runLoopAlmost,
  runLoopClosed: C.runLoopClosed,
};
