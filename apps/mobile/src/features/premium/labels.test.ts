/**
 * GRYD — PREMIUM : les libellés doivent s'accorder, dans les 5 langues.
 *  1. chaque période a son entrée (aucune formule sans nom) ;
 *  2. « 1 jour » / « 7 jours » — le pluriel bascule à n > 1, partout ;
 *  3. aucune entrée du catalogue premium ne contient de PRIX en dur.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import { C } from '../../i18n/catalog/premium.ts';
import { offerLabelEntry, trialUnitEntry } from './labels.ts';

Deno.test('chaque période a un libellé complet dans les 5 langues', () => {
  for (const period of ['lifetime', 'yearly', 'monthly'] as const) {
    const entry = offerLabelEntry(period);
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${period}/${locale}`);
    }
  }
});

Deno.test('essai : singulier à 1, pluriel au-delà (fr)', () => {
  assertEquals(trialUnitEntry({ units: 1, unit: 'day' }).fr, '{n} jour');
  assertEquals(trialUnitEntry({ units: 7, unit: 'day' }).fr, '{n} jours');
  assertEquals(trialUnitEntry({ units: 1, unit: 'week' }).fr, '{n} semaine');
  assertEquals(trialUnitEntry({ units: 2, unit: 'week' }).fr, '{n} semaines');
  assertEquals(trialUnitEntry({ units: 1, unit: 'year' }).fr, '{n} an');
  assertEquals(trialUnitEntry({ units: 2, unit: 'year' }).fr, '{n} ans');
});

Deno.test('toute forme de durée porte le trou {n} dans les 5 langues', () => {
  for (const unit of ['day', 'week', 'month', 'year'] as const) {
    for (const units of [1, 3]) {
      const entry = trialUnitEntry({ units, unit });
      for (const locale of LOCALES) {
        assert(entry[locale].includes('{n}'), `${unit}/${units}/${locale}`);
      }
    }
  }
});

Deno.test('AUCUN prix en dur dans le catalogue premium (les prix viennent du Store)', () => {
  // Un montant suivi d'un symbole monétaire, ou l'inverse — ce que la spec E74
  // interdit explicitement d'écrire dans le code.
  const money = /\d[\d.,]*\s*(€|\$|£)|(€|\$|£)\s*\d/;
  for (const [key, entry] of Object.entries(C)) {
    for (const locale of LOCALES) {
      assert(!money.test(entry[locale]), `${key}/${locale} contient un prix en dur`);
    }
  }
});
