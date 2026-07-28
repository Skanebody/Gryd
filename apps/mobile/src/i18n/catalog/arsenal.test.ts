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
import type { Entry } from '../types.ts';
import { LOCALES } from '../types.ts';
import { ARSENAL_I18N, SHOP_C } from './arsenal.ts';

/**
 * Les DEUX exports du fichier passent les mêmes contrôles : le catalogue produit
 * (ARSENAL_I18N) et la copie d'écran E17 (SHOP_C). Séparer les deux exports ne
 * doit pas créer une zone où la parité n'est plus vérifiée.
 */
const ALL_ENTRIES: [string, Entry][] = [
  ...Object.entries(ARSENAL_I18N),
  ...Object.entries(SHOP_C).map(([k, v]) => [`SHOP_C.${k}`, v] as [string, Entry]),
];

Deno.test('parité 5 langues : chaque entrée du catalogue est traduite partout', () => {
  for (const [key, entry] of ALL_ENTRIES) {
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
  for (const [key, entry] of ALL_ENTRIES) {
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

// ─── E17 « Boutique & Premium » : ce que la COPIE n'a pas le droit de dire ───

Deno.test('E17 : aucun chiffre n’est écrit en dur dans la copie d’écran', () => {
  // La planche affichait « SAISON 3 », « 18 j », « 39,99 € », « 3,33 €/mois » :
  // quatre placeholders de maquette. Prix, numéro de saison et jours restants
  // sont interpolés depuis game-rules et la RPC season_current — jamais écrits.
  for (const [key, entry] of Object.entries(SHOP_C)) {
    for (const locale of LOCALES) {
      const withoutPlaceholders = entry[locale].replace(/\{\w+\}/g, '');
      assert(!/\d/.test(withoutPlaceholders), `SHOP_C.${key} (${locale}) : chiffre en dur`);
    }
  }
});

Deno.test('E17 : les libellés porteurs de valeur exposent bien leur placeholder', () => {
  assert(SHOP_C.kickerSeason.fr.includes('{season}'));
  assert(SHOP_C.seasonHeroTitle.fr.includes('{season}'));
  assert(SHOP_C.seasonHeroDays.fr.includes('{days}'));
  // Les trois gabarits de prix Premium ont été retirés le 28/07/2026 : ce bloc
  // ne vend plus (constitution §9 — cf. `SHOP_C.premiumPriceFromStore`). Les
  // gabarits `{price}` vivent désormais dans le catalogue `premium.ts` (E74),
  // où ils sont remplis par `product.priceString` du Store.
  assert(SHOP_C.priceDual.fr.includes('{eclats}') && SHOP_C.priceDual.fr.includes('{eur}'));
});

Deno.test('E17 : la note permanente porte le libellé exact de la planche', () => {
  const note = SHOP_C.cosmeticOnlyNote.fr;
  assert(note.startsWith('Cosmétique uniquement.'), 'la note a dérivé du libellé de planche');
  for (const word of ['capture', 'défense', 'classement']) {
    assert(note.includes(word), `la note ne nomme plus « ${word} »`);
  }
});

Deno.test('E17 : la copie ne promet ni essai, ni restauration, ni rabais', () => {
  // Trois contrôles morts (aucune API derrière) et un interdit absolu de la
  // planche. Si l'un de ces mots réapparaît dans la copie, c'est qu'un bouton
  // menteur a été repeint.
  const FORBIDDEN = /(essai gratuit|jours gratuits|restaurer|réduction|économise|au lieu de|-\s?\d+\s?%)/i;
  for (const [key, entry] of Object.entries(SHOP_C)) {
    for (const locale of LOCALES) {
      assert(!FORBIDDEN.test(entry[locale]), `SHOP_C.${key} (${locale}) : promesse sans code derrière`);
    }
  }
});

// ─── E17 · LE PANNEAU « PAS ENCORE OUVERTE » NE PEUT PLUS SE CONTREDIRE ──────
//
// Ajouté le 28/07/2026 après un audit. `notOpenBody` affirmait « Les prix
// ci-dessous sont ceux du catalogue » ALORS QUE le catalogue n'est plus rendu
// (les prix EUR ont été retirés de la grille au nom de la constitution §9), et
// « le paiement n'est pas branché » ALORS QUE E74 achète réellement via
// RevenueCat depuis un CTA du même écran. Deux affirmations fausses, dont l'une
// contredisait `storePricesUnavailable` 36 lignes plus bas sur la même page.
// Ce test empêche l'une comme l'autre de revenir.

Deno.test('E17 : le panneau « pas encore ouverte » n’affirme RIEN sur les prix', () => {
  // Un panneau qui parle de prix rouvre la contradiction avec
  // `storePricesLoading/Unavailable/SignedOut/Error/Empty`, seule copie
  // autorisée à en parler (elle dit qu'ils viennent du Store).
  const PRIX = /(prix|precio|preis|preço|price)/i;
  for (const locale of LOCALES) {
    assert(
      !PRIX.test(SHOP_C.notOpenBody[locale]),
      `SHOP_C.notOpenBody (${locale}) parle de prix — c’est le rôle de StorePricesNote, et les deux se contrediraient`,
    );
  }
});

Deno.test('E17 : le panneau ne nie plus le paiement — E74 encaisse vraiment', () => {
  // « aucun paiement n'est branché » / « payment isn't wired up » est FAUX
  // depuis E74 (`app/premium.tsx` → `purchasePremiumPackage`). La copie n'a le
  // droit de parler que de CETTE grille, pas du paiement en général.
  const NIE_LE_PAIEMENT =
    /(paiement n[’']est pas|payment isn[’']t|pago no está|Zahlung ist nicht|pagamento não está)/i;
  for (const locale of LOCALES) {
    assert(
      !NIE_LE_PAIEMENT.test(SHOP_C.notOpenBody[locale]),
      `SHOP_C.notOpenBody (${locale}) nie le paiement alors que E74 achète réellement`,
    );
  }
});
