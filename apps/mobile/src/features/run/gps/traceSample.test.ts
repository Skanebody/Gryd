/**
 * GRYD — le sous-échantillonnage d'AFFICHAGE de la trace live (§10) reste FIDÈLE :
 * il plafonne le nombre de points mais garde toujours le départ ET la position
 * courante, dans l'ordre. C'est le vrai tracé, plus léger — jamais un tracé faux.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sampleEvenly, splitAndSampleAtGaps } from './traceSample.ts';

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

// ─── E07 : tracé MESURÉ vs tracé INCERTAIN ──────────────────────────────────

Deno.test('découpe aux trous de signal : un tronçon par portion réellement mesurée', () => {
  const pts = [
    { id: 0 },
    { id: 1 },
    { id: 2, gapBefore: true as const },
    { id: 3 },
  ];
  const segs = splitAndSampleAtGaps(pts, 240);
  assertEquals(segs.length, 2);
  assertEquals(segs[0]?.map((p) => p.id), [0, 1]);
  assertEquals(segs[1]?.map((p) => p.id), [2, 3]);
});

Deno.test('aucun trou : un seul tronçon, trace intacte', () => {
  const pts: { id: number; gapBefore?: true }[] = [{ id: 0 }, { id: 1 }, { id: 2 }];
  assertEquals(splitAndSampleAtGaps(pts, 240)[0]?.length, 3);
  assertEquals(splitAndSampleAtGaps(pts, 240).length, 1);
});

Deno.test('un tronçon d’UN point est écarté : on ne dessine pas un segment inexistant', () => {
  const pts = [{ id: 0 }, { id: 1, gapBefore: true as const }];
  assertEquals(splitAndSampleAtGaps(pts, 240), []);
});

Deno.test('plafond global respecté, chaque tronçon garde au moins ses deux bouts', () => {
  const pts = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    ...(i === 500 || i === 998 ? { gapBefore: true as const } : {}),
  }));
  const segs = splitAndSampleAtGaps(pts, 100);
  assertEquals(segs.length, 3);
  const total = segs.reduce((n, s) => n + s.length, 0);
  if (total > 110) throw new Error(`plafond dépassé : ${total}`);
  for (const s of segs) if (s.length < 2) throw new Error('tronçon sans ses deux bouts');
  // Départ et position courante toujours présents.
  assertEquals(segs[0]?.[0]?.id, 0);
  assertEquals(segs[2]?.[segs[2]!.length - 1]?.id, 999);
});
