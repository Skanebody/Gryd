/**
 * GRYD — LA VOIX DE LA CHAÎNE VIVANTE (cahier G09).
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT (recette R2C, constat 10) ─────────────────
 * `mvp/run/voice.ts` et ses règles pures (`feedback.ts`) existaient, testées,
 * avec leurs trois phrases au catalogue — et un seul appelant : l'écran du
 * groupe `(mvp)`, en quarantaine. La chaîne vivante (`useRealRunCore` →
 * `RealCourseLive`) n'avait donc AUCUNE annonce : le seul canal qui atteint
 * quelqu'un qui court, bras ballant, écran éteint, était muet.
 *
 * Ce module traduit la phase de fermeture de la chaîne vivante
 * (`engine/loopClosure`) dans le vocabulaire des règles de voix. Il ne
 * réinvente aucune mécanique : la décision « quand parler » reste celle de
 * `feedback.ts`, la seule à être déjà testée.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { gaugeVoice } from '../../../mvp/run/feedback.ts';
import { gaugePhaseFromClosure2026, VOICE_LINE_2026 } from './liveVoice.ts';

Deno.test('voix : les quatre phases de fermeture ont leur équivalent, sans en inventer', () => {
  assertEquals(gaugePhaseFromClosure2026('idle'), 'silent');
  assertEquals(gaugePhaseFromClosure2026('open'), 'missing');
  assertEquals(gaugePhaseFromClosure2026('nearMiss'), 'almost');
  assertEquals(gaugePhaseFromClosure2026('closed'), 'closed');
});

Deno.test('voix : la traduction alimente les règles existantes, qui décident seules', () => {
  // Une sortie qui referme : silence → presque → fermée. Deux phrases, une fois.
  const almost = gaugeVoice(gaugePhaseFromClosure2026('open'), gaugePhaseFromClosure2026('nearMiss'), null);
  assertEquals(almost, 'runLoopAlmost');
  const closed = gaugeVoice(gaugePhaseFromClosure2026('nearMiss'), gaugePhaseFromClosure2026('closed'), almost);
  assertEquals(closed, 'runLoopClosed');
  // Et le bruit GPS qui refait osciller la jauge ne la fait pas bégayer.
  assertEquals(gaugeVoice(gaugePhaseFromClosure2026('closed'), gaugePhaseFromClosure2026('nearMiss'), closed), null);
  assertEquals(gaugeVoice(gaugePhaseFromClosure2026('nearMiss'), gaugePhaseFromClosure2026('closed'), closed), null);
});

Deno.test('voix : chaque phrase vient du catalogue, jamais d’un texte en dur (L18)', () => {
  for (const cue of ['voiceStart', 'runLoopAlmost', 'runLoopClosed'] as const) {
    const entry = VOICE_LINE_2026[cue];
    assertEquals(typeof entry.fr, 'string');
    assertEquals(typeof entry.en, 'string');
  }
});
