/**
 * GRYD — §26 : les nombres se formatent selon la LANGUE, sans Intl (parité Hermes).
 * Verrouille les conventions par langue + la NON-régression du français.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../i18n/types.ts';
import { formatIntFor, formatMultiplierFor } from './numberFormat.ts';

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
