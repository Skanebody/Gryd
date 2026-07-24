/**
 * GRYD — le sous-échantillonnage d'AFFICHAGE de la trace live (§10) reste FIDÈLE :
 * il plafonne le nombre de points mais garde toujours le départ ET la position
 * courante, dans l'ordre. C'est le vrai tracé, plus léger — jamais un tracé faux.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sampleEvenly } from './traceSample.ts';

Deno.test('sous le plafond : renvoie une copie inchangée', () => {
  assertEquals(sampleEvenly([1, 2, 3], 240), [1, 2, 3]);
  assertEquals(sampleEvenly([], 240), []);
});

Deno.test('au-dessus du plafond : plafonne, garde le premier ET le dernier', () => {
  const pts = Array.from({ length: 1000 }, (_, i) => i);
  const out = sampleEvenly(pts, 240);
  assertEquals(out.length, 240);
  assertEquals(out[0], 0); // départ conservé
  assertEquals(out[out.length - 1], 999); // position courante conservée
});

Deno.test('ordre strictement croissant préservé (pas de mélange de la trace)', () => {
  const pts = Array.from({ length: 5000 }, (_, i) => i);
  const out = sampleEvenly(pts, 100);
  for (let i = 1; i < out.length; i += 1) {
    if (out[i]! <= out[i - 1]!) throw new Error(`ordre rompu à ${i}`);
  }
});

Deno.test('cas dégénérés : max < 2 renvoie la copie (pas de division par zéro)', () => {
  assertEquals(sampleEvenly([10, 20, 30], 1), [10, 20, 30]);
  assertEquals(sampleEvenly([10, 20, 30], 0), [10, 20, 30]);
});
