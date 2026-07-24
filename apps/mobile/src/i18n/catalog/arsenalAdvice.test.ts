/**
 * GRYD — la couche explicative de l'Arsenal (le « à quoi ça sert / pourquoi /
 * limite ») ne peut plus se dire en français à un joueur en/es/de/pt.
 *
 * Verrouille : parité 5 langues, et placeholders ({hours}/{boostLabel}/{duration})
 * identiques dans les 5 langues — sinon un nombre disparaît d'une traduction.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import { ARSENAL_ADVICE_I18N } from './arsenalAdvice.ts';

Deno.test('parité 5 langues : chaque conseil est traduit partout', () => {
  for (const [key, entry] of Object.entries(ARSENAL_ADVICE_I18N)) {
    for (const locale of LOCALES) {
      assert(
        typeof entry[locale] === 'string' && entry[locale].trim().length > 0,
        `${key} : ${locale} manquant ou vide`,
      );
    }
  }
});

Deno.test('placeholders {…} identiques dans les 5 langues', () => {
  const ph = (s: string): Set<string> => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  for (const [key, entry] of Object.entries(ARSENAL_ADVICE_I18N)) {
    const ref = ph(entry.fr);
    for (const locale of LOCALES) {
      assertEquals([...ph(entry[locale])].sort(), [...ref].sort(), `${key} : placeholders ${locale}`);
    }
  }
});
