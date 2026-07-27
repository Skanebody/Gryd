/**
 * GRYD — §26 : les nombres se formatent selon la LANGUE, sans Intl (parité Hermes).
 * Verrouille les conventions par langue + la NON-régression du français.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../i18n/types.ts';
import { formatIntFor, formatMultiplierFor , formatKmFor, formatKm2For } from './numberFormat.ts';

Deno.test('français INCHANGÉ (aucune régression) : espace milliers, virgule décimale', () => {
  assertEquals(formatIntFor(2147, 'fr'), '2 147');
  assertEquals(formatIntFor(1234567, 'fr'), '1 234 567');
  assertEquals(formatMultiplierFor(1.3000004, 'fr'), '×1,3');
});

Deno.test('milliers par langue : en=virgule, de/es/pt=point, fr=espace', () => {
  assertEquals(formatIntFor(1234567, 'en'), '1,234,567');
  assertEquals(formatIntFor(1234567, 'de'), '1.234.567');
  assertEquals(formatIntFor(1234567, 'es'), '1.234.567');
  assertEquals(formatIntFor(1234567, 'pt'), '1.234.567');
});

Deno.test('décimale par langue : en=point, toutes les autres=virgule', () => {
  assertEquals(formatMultiplierFor(1.3, 'en'), '×1.3');
  assertEquals(formatMultiplierFor(1.3, 'de'), '×1,3');
  assertEquals(formatMultiplierFor(1.3, 'es'), '×1,3');
  assertEquals(formatMultiplierFor(1.3, 'pt'), '×1,3');
});

Deno.test('petits entiers : pas de séparateur', () => {
  for (const locale of LOCALES) {
    assertEquals(formatIntFor(0, locale), '0');
    assertEquals(formatIntFor(999, locale), '999');
  }
});

Deno.test('formatKmFor : une décimale, séparateur de la langue', () => {
  assertEquals(formatKmFor(4.2, 'fr'), '4,2');
  assertEquals(formatKmFor(4.2, 'en'), '4.2');
  assertEquals(formatKmFor(4.2, 'de'), '4,2');
  assertEquals(formatKmFor(4.2, 'es'), '4,2');
  assertEquals(formatKmFor(4.2, 'pt'), '4,2');
});

Deno.test('formatKmFor : la décimale est TOUJOURS rendue (4 → « 4,0 »)', () => {
  // Sinon « 4 km » et « 4,2 km » s'alignent mal dans un bloc de métriques, et le
  // regard doute : est-ce 4 exactement, ou un arrondi qu'on a masqué ?
  assertEquals(formatKmFor(4, 'fr'), '4,0');
  assertEquals(formatKmFor(0, 'fr'), '0,0');
});

Deno.test('formatKmFor : arrondi au dixième, jamais de troncature', () => {
  assertEquals(formatKmFor(4.26, 'fr'), '4,3');
  assertEquals(formatKmFor(4.24, 'fr'), '4,2');
  assertEquals(formatKmFor(0.04, 'fr'), '0,0');
});

Deno.test('formatKmFor : ce qui N’EST PAS une distance rend null, jamais un faux zéro', () => {
  // C'est le cœur du contrat : « je ne sais pas » ne doit pas se confondre avec
  // « zéro », qui est une valeur VRAIE que des écrans affichent légitimement.
  assertEquals(formatKmFor(Number.NaN, 'fr'), null);
  assertEquals(formatKmFor(Number.POSITIVE_INFINITY, 'fr'), null);
  assertEquals(formatKmFor(Number.NEGATIVE_INFINITY, 'fr'), null);
  assertEquals(formatKmFor(-1, 'fr'), null);
});

Deno.test('formatKmFor : les grandes distances gardent le séparateur DÉCIMAL, pas de milliers', () => {
  // Un marathon reste « 42,2 » — on ne mélange pas les deux séparateurs dans un
  // même nombre (en anglais, « 1,234.5 » viendrait de formatIntFor, pas d'ici).
  assertEquals(formatKmFor(42.195, 'fr'), '42,2');
  assertEquals(formatKmFor(42.195, 'en'), '42.2');
});

Deno.test('formatKm2For : la plus petite emprise réelle reste VISIBLE (jamais « 0,0 »)', () => {
  // Un hexagone de capture ≈ 0,015 km². À une décimale il s'écrirait « 0,0 » —
  // un zéro qui affirmerait faussement que le joueur ne tient rien.
  assertEquals(formatKm2For(0.015, 'fr'), '0,01');
  assertEquals(formatKm2For(0.023, 'fr'), '0,02');
  // ⚠️ `toFixed` arrondit sur la valeur BINAIRE : 0,015 tombe à « 0,01 » et non
  // « 0,02 ». C'est un arrondi vers le BAS, donc le sens sûr : on n'attribue
  // jamais à quelqu'un plus de surface qu'il n'en tient.
  assertEquals(formatKm2For(0.045, 'fr'), '0,04');
});

Deno.test('formatKm2For : deux décimales toujours rendues, séparateur par langue', () => {
  assertEquals(formatKm2For(2.31, 'fr'), '2,31');
  assertEquals(formatKm2For(2.31, 'en'), '2.31');
  assertEquals(formatKm2For(2, 'de'), '2,00');
  assertEquals(formatKm2For(0, 'fr'), '0,00');
});

Deno.test('formatKm2For : ce qui N’EST PAS une surface rend null, jamais un faux zéro', () => {
  assertEquals(formatKm2For(Number.NaN, 'fr'), null);
  assertEquals(formatKm2For(Number.POSITIVE_INFINITY, 'fr'), null);
  assertEquals(formatKm2For(-1, 'fr'), null);
});
