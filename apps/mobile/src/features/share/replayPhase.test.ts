/**
 * GRYD — la partition du replay respecte le minutage de la planche E10, ne
 * revient jamais en arrière, et finit dans un état FINAL complet (la « frame
 * finale partageable » de la planche).
 */
import { assert, assertAlmostEquals, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  PREVIEW_INTRO_MS,
  REPLAY_FINAL,
  REPLAY_MARKS_MS,
  REPLAY_TOTAL_MS,
  replayPhase,
  replayPhaseAtProgress,
} from './replayPhase.ts';

Deno.test('durée totale dans la fenêtre 6-8 s imposée par la planche', () => {
  assert(REPLAY_TOTAL_MS >= 6_000, 'trop court');
  assert(REPLAY_TOTAL_MS <= 8_000, 'trop long');
});

Deno.test('les bornes sont strictement croissantes (partition cohérente)', () => {
  const m = REPLAY_MARKS_MS;
  assert(m.contextEnd < m.traceEnd);
  assert(m.traceEnd < m.closeEnd);
  assert(m.closeEnd < m.fillEnd);
  assert(m.fillEnd < m.end);
});

Deno.test('phases nommées aux instants clés de la planche', () => {
  assertEquals(replayPhase(0).phase, 'context');
  assertEquals(replayPhase(400).phase, 'context');
  assertEquals(replayPhase(1_500).phase, 'trace');
  assertEquals(replayPhase(4_000).phase, 'close');
  assertEquals(replayPhase(5_000).phase, 'fill');
  assertEquals(replayPhase(6_500).phase, 'result');
});

Deno.test('contexte : rien n’est encore dessiné ni rempli', () => {
  const p = replayPhase(300);
  assertEquals(p.traceP, 0);
  assertEquals(p.closeP, 0);
  assertEquals(p.fillP, 0);
  assertEquals(p.done, false);
});

Deno.test('la zone ne se remplit qu’APRÈS la fermeture (l’ordre porte le sens)', () => {
  // À 3,4 s la trace se dessine encore : ni fermeture ni remplissage.
  const dessin = replayPhase(3_400);
  assert(dessin.traceP > 0 && dessin.traceP < 1);
  assertEquals(dessin.closeP, 0);
  assertEquals(dessin.fillP, 0);
  // À 4,4 s la trace est complète, la fermeture court, le remplissage attend.
  const fermeture = replayPhase(4_400);
  assertEquals(fermeture.traceP, 1);
  assert(fermeture.closeP > 0 && fermeture.closeP < 1);
  assertEquals(fermeture.fillP, 0);
});

Deno.test('monotonie : aucune valeur ne redescend au fil du temps', () => {
  let prev = replayPhase(0);
  for (let t = 0; t <= REPLAY_TOTAL_MS + 500; t += 50) {
    const cur = replayPhase(t);
    assert(cur.traceP >= prev.traceP, `traceP redescend à ${t}`);
    assert(cur.closeP >= prev.closeP, `closeP redescend à ${t}`);
    assert(cur.fillP >= prev.fillP, `fillP redescend à ${t}`);
    prev = cur;
  }
});

Deno.test('à la fin : état complet, identique à l’état final (reduce motion)', () => {
  assertEquals(replayPhase(REPLAY_TOTAL_MS), REPLAY_FINAL);
  assertEquals(replayPhase(99_000), REPLAY_FINAL);
  assertEquals(replayPhaseAtProgress(1), REPLAY_FINAL);
});

Deno.test('entrées aberrantes (NaN, négatif) → début de partition, jamais un crash', () => {
  assertEquals(replayPhase(Number.NaN).phase, 'context');
  assertEquals(replayPhase(-500).phase, 'context');
  assertEquals(replayPhaseAtProgress(Number.NaN).phase, 'context');
  assertEquals(replayPhaseAtProgress(-2).phase, 'context');
  assertEquals(replayPhaseAtProgress(9).done, true);
});

Deno.test('la progression normalisée respecte les MÊMES proportions', () => {
  // La moitié de la partition normalisée = la moitié du temps réel.
  const parProgression = replayPhaseAtProgress(0.5);
  const parTemps = replayPhase(REPLAY_TOTAL_MS / 2);
  assertAlmostEquals(parProgression.traceP, parTemps.traceP, 1e-9);
  assertEquals(parProgression.phase, parTemps.phase);
});

Deno.test('l’entrée de l’aperçu est COURTE (l’écran est actionnable tout de suite)', () => {
  assert(PREVIEW_INTRO_MS < REPLAY_TOTAL_MS, 'l’entrée doit être plus courte que le replay');
  assert(PREVIEW_INTRO_MS <= 3_500, 'une entrée > 3,5 s serait un temps mort (§A)');
});
