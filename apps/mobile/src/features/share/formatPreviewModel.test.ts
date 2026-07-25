/**
 * GRYD — l'aperçu de format ne doit JAMAIS redevenir le mode démo.
 *
 * Le test central est le dernier : il relit le CATALOGUE RÉEL
 * (i18n/catalog/result.ts), entre deux sentinelles, et vérifie que pas une des
 * cinq langues n'y glisse un chiffre, une unité ou un rang. Un aperçu de format
 * qui afficherait « 4,3 km » serait exactement la carte fabriquée supprimée le
 * 21/07/2026 (AMENDEMENT-47), avec une étiquette pour toute protection — et
 * « une étiquette démonstration ne rend PAS une donnée honnête ».
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  PREVIEW_SLOTS,
  RENDERED_SLOT_ORDER,
  dirtySlotLabels,
  isSlotLabelClean,
  slotById,
  type PreviewSlotId,
} from './formatPreviewModel.ts';

Deno.test('ordre et poids : la composition vient de la planche, pas d’une intuition', () => {
  assertEquals(
    PREVIEW_SLOTS.map((s) => s.id),
    ['place', 'event', 'map', 'hero', 'context', 'challenge', 'signature'],
  );
  const total = PREVIEW_SLOTS.reduce((sum, s) => sum + s.heightShare, 0);
  assert(total > 0.9 && total <= 1, `somme des parts = ${total}`);
  // La CARTE domine : c'est la preuve, elle tient le centre optique.
  const map = slotById('map')!;
  for (const s of PREVIEW_SLOTS) {
    if (s.id !== 'map') assert(map.heightShare > s.heightShare, `${s.id} pèse autant que la carte`);
  }
});

Deno.test('les écarts au code sont DÉCLARÉS, pas masqués', () => {
  // Ce que la carte ne tient pas aujourd'hui. Si ShareCard les tient un jour,
  // ce test tombe : l'écart ne peut pas se périmer en silence.
  assertEquals(slotById('place')!.status, 'missing');
  assertEquals(slotById('place')!.unsourced, true);
  assertEquals(slotById('signature')!.status, 'misplaced');
  const rendered = PREVIEW_SLOTS.filter((s) => s.status === 'rendered').map((s) => s.id);
  assertEquals(rendered, ['event', 'map', 'hero', 'context', 'challenge']);
});

Deno.test('l’ordre RENDU = tout sauf l’absent, et ne diffère que par la signature', () => {
  const notMissing = PREVIEW_SLOTS.filter((s) => s.status !== 'missing').map((s) => s.id);
  assertEquals([...RENDERED_SLOT_ORDER].sort(), [...notMissing].sort());
  // Le seul écart d'ORDRE : la signature passe du pied à la tête.
  const withoutSignature = (ids: readonly PreviewSlotId[]) => ids.filter((i) => i !== 'signature');
  assertEquals(withoutSignature(RENDERED_SLOT_ORDER), withoutSignature(notMissing));
  assertEquals(RENDERED_SLOT_ORDER[0], 'signature');
});

Deno.test('le garde-fou attrape ce qu’il doit attraper', () => {
  // Propres : des NOMS d'emplacement, dans les cinq langues.
  for (const ok of [
    'Lieu',
    'Titre de l’événement',
    'Chiffre héros',
    'Hero number',
    'Kernzahl',
    'Número principal',
    'Cifra principal',
    'Contexte',
    'Défi',
    'Signature',
    'APERÇU DE FORMAT',
  ]) {
    assert(isSlotLabelClean(ok), `faux positif : ${ok}`);
  }
  // Fautifs : tout ce qui ressemble à une VALEUR.
  for (const bad of [
    '4,3 km',
    '+420 000 m²',
    '0,42 km²',
    '#2',
    '62 %',
    '2 h',
    '26 min',
    '+47 pts',
    'Saint-Rémy 12',
  ]) {
    assert(!isSlotLabelClean(bad), `faux négatif : ${bad}`);
  }
  assertEquals(dirtySlotLabels(['Lieu', '4,3 km', 'Défi']), ['4,3 km']);
});

/**
 * Le vrai garde-fou : on relit le catalogue tel qu'il est expédié. Aucune
 * duplication de chaînes ici — une copie dans le test ne prouverait rien sur ce
 * que l'app affiche.
 */
Deno.test('CATALOGUE RÉEL — aucun libellé d’aperçu ne porte de valeur (5 langues)', () => {
  const src = Deno.readTextFileSync(
    new URL('../../i18n/catalog/result.ts', import.meta.url),
  );
  const start = src.indexOf('GARDE-FOU:DEBUT apercu-de-format');
  const end = src.indexOf('GARDE-FOU:FIN apercu-de-format');
  assert(start > 0 && end > start, 'sentinelles introuvables dans i18n/catalog/result.ts');

  // On ne juge que les VALEURS : les commentaires (qui citent « #1 », « (a) »…)
  // et les noms de clés ne sortent jamais à l'écran.
  const block = src
    .slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  const values = [...block.matchAll(/'([^']*)'/g)].map((m) => m[1] ?? '');
  // Sanity : le bloc contient bien les cinq langues de plus d'une dizaine de clés.
  assert(values.length >= 60, `bloc trop court (${values.length} valeurs) — sentinelles ?`);

  const dirty = dirtySlotLabels(values);
  assertEquals(dirty, [], `valeurs interdites dans l'aperçu de format : ${dirty.join(' | ')}`);
});
