/**
 * GRYD — le catalogue Arsenal ne peut plus se dire en français à un joueur
 * en/es/de/pt.
 *
 * Ce que ces tests verrouillent, dans l'ordre de gravité :
 *  1. PARITÉ 5 langues : chaque entrée porte fr/en/es/de/pt, toutes non vides —
 *     sinon la boutique retombe en français (la régression que ce chantier lève) ;
 *  2. PLACEHOLDERS : un `{n}`/`{hours}`/… présent en fr l'est à l'identique dans
 *     les 4 autres langues — sinon un nombre d'Éclats disparaît d'une traduction ;
 *  3. les items et sections CRITIQUES ont bien leur nom ET leur description, pour
 *     que le resolver n'ait jamais à retomber sur la chaîne FR de repli.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import { ARSENAL_I18N } from './arsenal.ts';

Deno.test('parité 5 langues : chaque entrée du catalogue est traduite partout', () => {
  for (const [key, entry] of Object.entries(ARSENAL_I18N)) {
    for (const locale of LOCALES) {
      assert(
        typeof entry[locale] === 'string' && entry[locale].trim().length > 0,
        `${key} : ${locale} manquant ou vide`,
      );
    }
  }
});

Deno.test('les placeholders {…} sont IDENTIQUES dans les 5 langues', () => {
  const ph = (s: string): Set<string> => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  for (const [key, entry] of Object.entries(ARSENAL_I18N)) {
    const ref = ph(entry.fr);
    for (const locale of LOCALES) {
      const here = ph(entry[locale]);
      assertEquals(
        [...here].sort(),
        [...ref].sort(),
        `${key} : placeholders divergents en ${locale}`,
      );
    }
  }
});

Deno.test('les items et sections critiques ont nom + description (pas de repli FR)', () => {
  // Un échantillon qui couvre chaque famille : si l'un manque, le resolver
  // retomberait sur la chaîne FR du seed — le mensonge que ce chantier retire.
  const NAMES = [
    'starter_pack', 'founder_pack', 'eclats_s', 'eclats_xxl',
    'shield', 'streak_gel', 'scout_ping',
    'skin_territory_gold_border', 'skin_trace_electric', 'frame_carbon',
    'template_first_zone', 'crew_banner_impact', 'crew_emblem_gold',
    'crew_boost_24', 'crew_boost_season', 'crew_cosmetic_chest',
    'founder_badge', 'title_founder_runner', 'club_monthly', 'gryd_pass',
  ];
  for (const key of NAMES) {
    assert(ARSENAL_I18N[`${key}.name`], `${key}.name manquant`);
    assert(ARSENAL_I18N[`${key}.description`], `${key}.description manquant`);
  }
  // starter_pack : l'item oublié par la 1re passe de traduction — verrouillé.
  assert(ARSENAL_I18N['starter_pack.limit'], 'starter_pack.limit manquant');
  for (let i = 0; i < 4; i++) {
    assert(ARSENAL_I18N[`starter_pack.contents.${i}`], `starter_pack.contents.${i} manquant`);
  }
  // Sections : label présent pour chaque section du §25.
  for (const s of [
    'packs', 'objets', 'skins_territory', 'skins_trace', 'frames',
    'emblems', 'banners', 'templates', 'crew_boosts', 'subscriptions',
  ]) {
    assert(ARSENAL_I18N[`section.${s}.label`], `section.${s}.label manquant`);
  }
});

Deno.test('les nombres RESTENT des placeholders, jamais écrits en dur dans la copie', () => {
  // Aucune copie ne doit contenir un nombre d'Éclats en dur : ils viennent de
  // game-rules via {n} (aucun nombre magique dans la traduction).
  for (const key of ['starter_pack.description', 'founder_pack.description', 'eclats_s.description']) {
    assert(ARSENAL_I18N[key].fr.includes('{n}'), `${key} devrait porter {n}`);
    assert(!/\d{2,}/.test(ARSENAL_I18N[key].fr.replace(/\{\w+\}/g, '')), `${key} : nombre en dur`);
  }
});
