/**
 * GRYD — les labels a11y (VoiceOver) des aperçus Arsenal, traduits partout.
 * Parité 5 langues + placeholders ({name}/{hours}) identiques d'une langue à l'autre.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import { ARSENAL_PREVIEW_I18N } from './arsenalPreview.ts';

Deno.test('parité 5 langues + placeholders identiques (aperçus a11y)', () => {
  const ph = (s: string): Set<string> => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  for (const [key, entry] of Object.entries(ARSENAL_PREVIEW_I18N)) {
    const ref = ph(entry.fr);
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${key} : ${locale} vide`);
      assertEquals([...ph(entry[locale])].sort(), [...ref].sort(), `${key} : placeholders ${locale}`);
    }
    // Chaque aperçu nomme l'item : {name} est présent.
    assert(ref.has('name'), `${key} : {name} attendu`);
  }
});
