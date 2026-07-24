/**
 * GRYD — la raison d'un refus serveur (§11) doit être DITE, en entier, dans les
 * 5 langues. Le type garantit l'exhaustivité (Record<RejectReason,Entry>) ; ce
 * test verrouille le reste : aucune chaîne vide, aucune raison oubliée.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import { REJECT_REASON_COPY } from './result.ts';

Deno.test('les 6 raisons de refus, traduites et non vides partout', () => {
  const reasons = Object.keys(REJECT_REASON_COPY);
  assertEquals(reasons.length, 6); // too_short/too_brief/pace_too_fast/pace_too_slow/too_far/no_valid_points
  for (const [reason, entry] of Object.entries(REJECT_REASON_COPY)) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${reason} : ${locale} vide`);
    }
  }
});
