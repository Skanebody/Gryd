/**
 * GRYD — E17 : les règles de la boutique que le code doit tenir SEUL.
 *
 * `features/arsenal/**` n'avait AUCUN test avant ce chantier — c'est-à-dire que
 * rien n'empêchait la boutique de redevenir menteuse. Ce que ces tests
 * verrouillent, dans l'ordre de gravité :
 *
 *  1. un objet FONCTIONNEL (Bouclier, Streak Gel, Scout Ping) ne s'annonce
 *     jamais comme achetable — « ne s'achète pas » n'est pas « pas encore » ;
 *  2. la boutique ne peut pas afficher un objet NON LANCÉ dans son rayon ;
 *  3. le prix mensuel équivalent de l'annuel est CALCULÉ et jamais optimiste
 *     (annoncer moins que ce qui sera payé = faux rabais) ;
 *  4. les prix affichés sont exactement ceux de game-rules (la planche disait
 *     « 39,99 €/an » : un placeholder de maquette, faux) ;
 *  5. un abonnement n'apparaît PAS dans la grille (il vit dans le bloc Premium,
 *     une seule décision par surface) ;
 *  6. aucun objet du catalogue ne vend un avantage de jeu (garde anti-p2w).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isFunctionalItemKey, SKU_PRICES_EUR, SKUS } from '@klaim/shared';
import { ARSENAL_CATALOG, itemByKey } from './catalog.ts';
import {
  monthlyEquivalentEur,
  ownershipKindOf,
  premiumItem,
  premiumPrices,
  PREMIUM_MAX_BENEFITS,
  shopCategoryKeys,
  shopItems,
  shopSectionKeys,
} from './shop.ts';

// ─── 1. Propriété ────────────────────────────────────────────────────────────

Deno.test('propriété : posséder l’emporte sur tout le reste', () => {
  for (const item of ARSENAL_CATALOG) {
    assertEquals(ownershipKindOf(item, true), 'owned', `${item.key} possédé`);
  }
});

Deno.test('propriété : un objet fonctionnel ne s’achète JAMAIS (pas « pas encore »)', () => {
  for (const key of ['shield', 'streak_gel', 'scout_ping']) {
    const item = itemByKey(key);
    assert(item, `${key} absent du catalogue`);
    assert(isFunctionalItemKey(item.key), `${key} devrait être fonctionnel`);
    assertEquals(ownershipKindOf(item, false), 'neverForSale');
    // Corollaire dur : aucun prix, dans aucune monnaie.
    assertEquals(item.priceEur, undefined, `${key} porte un prix EUR`);
    assertEquals(item.priceShards, undefined, `${key} porte un prix Éclats`);
  }
});

Deno.test('propriété : un Crew Boost est SAISON (il expire), jamais permanent', () => {
  for (const key of [SKUS.crewBoost24, SKUS.crewBoost72, SKUS.crewBoostWeekend, SKUS.crewBoostSeason]) {
    const item = itemByKey(key);
    assert(item, `${key} absent`);
    assertEquals(ownershipKindOf(item, false), 'season', key);
  }
});

Deno.test('propriété : un cosmétique équipable est PERMANENT, un pack d’Éclats est consommable', () => {
  const skin = itemByKey('skin_territory_gold_border');
  const frame = itemByKey('frame_carbon');
  const template = itemByKey('template_night_run');
  const eclats = itemByKey(SKUS.eclatsM);
  assert(skin && frame && template && eclats);
  assertEquals(ownershipKindOf(skin, false), 'permanent');
  assertEquals(ownershipKindOf(frame, false), 'permanent');
  assertEquals(ownershipKindOf(template, false), 'permanent');
  assertEquals(ownershipKindOf(eclats, false), 'consumable');
});

Deno.test('propriété : exclusif de pack et non lancé sont DEUX états distincts', () => {
  const founderFrame = itemByKey('frame_founder');
  const pass = itemByKey('gryd_pass');
  assert(founderFrame && pass);
  assertEquals(ownershipKindOf(founderFrame, false), 'packOnly');
  assertEquals(ownershipKindOf(pass, false), 'draft');
});

// ─── 2. Grille & catégories ──────────────────────────────────────────────────

Deno.test('grille : aucun objet NON LANCÉ n’entre en rayon', () => {
  for (const item of shopItems('all')) {
    assertEquals(item.draft, undefined, `${item.key} est draft et pourtant en grille`);
  }
});

Deno.test('grille : les abonnements ne sont PAS en grille (ils vivent dans le bloc Premium)', () => {
  assert(!shopSectionKeys().includes('subscriptions'));
  assert(!shopSectionKeys().includes('featured'));
  for (const item of shopItems('all')) {
    assert(item.section !== 'subscriptions', `${item.key} duplique le bloc Premium`);
  }
  // Et le Club existe bien ailleurs : sinon le paywall n'aurait pas de copie.
  assert(premiumItem(), 'club_monthly absent du catalogue');
});

Deno.test('catégories : « Tout » d’abord, puis des sections RÉELLEMENT peuplées', () => {
  const keys = shopCategoryKeys();
  assertEquals(keys[0], 'all');
  assertEquals(new Set(keys).size, keys.length, 'catégorie dupliquée');
  for (const key of keys.slice(1)) {
    assert(shopItems(key).length > 0, `catégorie vide affichée : ${key}`);
  }
});

Deno.test('catégories : « Tout » = l’union exacte des catégories', () => {
  const all = shopItems('all').map((i) => i.key).sort();
  const union = shopCategoryKeys()
    .slice(1)
    .flatMap((key) => shopItems(key).map((i) => i.key))
    .sort();
  assertEquals(union, all);
});

// ─── 3. Prix Premium ─────────────────────────────────────────────────────────

Deno.test('premium : les deux prix affichés sont EXACTEMENT ceux de game-rules', () => {
  const p = premiumPrices();
  assertEquals(p.monthlyEur, SKU_PRICES_EUR.club_monthly);
  assertEquals(p.annualEur, SKU_PRICES_EUR.club_annual);
  // Le « 39,99 €/an » de la planche est un placeholder de maquette : il ne doit
  // JAMAIS réapparaître dans le code.
  assert(p.annualEur !== 39.99, 'le prix annuel de la maquette a été recopié');
});

Deno.test('premium : l’équivalent mensuel est calculé, jamais optimiste', () => {
  const p = premiumPrices();
  // Recalcul indépendant : jamais moins cher que la réalité mensualisée.
  assert(p.annualPerMonthEur >= p.annualEur / 12, 'mensuel annoncé sous la réalité');
  assert(p.annualPerMonthEur < p.annualEur / 12 + 0.01, 'arrondi trop large');
  // Deux décimales exactement (un prix ne s'affiche pas au millième).
  assertEquals(Math.round(p.annualPerMonthEur * 100), p.annualPerMonthEur * 100);
  // Et l'annuel reste réellement plus avantageux que le mensuel : sinon le
  // simple fait d'afficher les deux côte à côte induirait en erreur.
  assert(p.annualPerMonthEur < p.monthlyEur, 'annuel non avantageux');
});

Deno.test('premium : monthlyEquivalentEur est défensif et arrondi au centime supérieur', () => {
  assertEquals(monthlyEquivalentEur(34.99), 2.92);
  assertEquals(monthlyEquivalentEur(12), 1);
  assertEquals(monthlyEquivalentEur(0), 0);
  assertEquals(monthlyEquivalentEur(-5), 0);
  assertEquals(monthlyEquivalentEur(Number.NaN), 0);
});

Deno.test('premium : 3 bénéfices MAXIMUM, et ils existent dans le catalogue', () => {
  assertEquals(PREMIUM_MAX_BENEFITS, 3);
  const club = premiumItem();
  assert(club?.contents, 'le Club n’a aucun contenu à montrer');
  assert(club.contents.length >= 1);
});

// ─── 4. Garde anti-pay-to-win sur tout le catalogue ──────────────────────────

Deno.test('anti-p2w : aucun item vendu ne promet capture, points, rang ni défense', () => {
  // Filet de COPIE (les descriptions passent par i18n, mais le seed FR reste la
  // référence) : un item à prix ne doit pas se vendre sur un verbe de jeu.
  const FORBIDDEN = /(capture[rz]?\s+(une|des)\s+zone|gagne[rz]?\s+des\s+points|monte[rz]?\s+au\s+classement|invincib)/i;
  for (const item of ARSENAL_CATALOG) {
    const forSale = item.priceEur !== undefined || item.priceShards !== undefined;
    if (!forSale) continue;
    assert(!FORBIDDEN.test(item.description), `${item.key} vend un avantage de jeu`);
  }
});
