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
 *  3. AUCUNE surface de la boutique ne rend un montant en ARGENT RÉEL écrit
 *     dans le code (constitution §9 — le prix vient du Store) ;
 *  4. le montant de maquette « 39,99 » ne revient pas par le catalogue ;
 *  5. un abonnement n'apparaît PAS dans la grille (il vit dans le bloc Premium,
 *     une seule décision par surface) ;
 *  6. aucun objet du catalogue ne vend un avantage de jeu (garde anti-p2w).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isFunctionalItemKey, SKU_PRICES_EUR, SKUS } from '@klaim/shared';
import { ARSENAL_CATALOG, itemByKey } from './catalog.ts';
import {
  ownershipKindOf,
  premiumItem,
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

// ─── 3. AUCUN PRIX EN ARGENT RÉEL N'EST ÉCRIT DANS L'APP (constitution §9) ──
//
// Ce bloc a REMPLACÉ, le 28/07/2026, trois tests qui vérifiaient l'inverse :
// ils garantissaient que la boutique affichait bien `SKU_PRICES_EUR`. C'était
// verrouiller une violation — la constitution dit « LES PRIX VIENNENT DU STORE
// OU D'UNE REMOTE CONFIG — jamais codés en dur dans l'app ». Les tests
// garantissent maintenant le contraire : qu'aucune surface de la boutique ne
// peut RÉGRESSER vers un montant du code.

Deno.test('§9 : aucune surface de boutique ne rend un montant en argent réel', async () => {
  const surfaces = [
    '../../../app/arsenal.tsx',
    './ShopGridCard.tsx',
    './shop.ts',
  ];
  // `formatEur` a été supprimé ; `SKU_PRICES_EUR` n'a plus rien à faire dans une
  // surface de RENDU (le catalogue, lui, le référence pour le seed serveur).
  const banned = [/\bformatEur\b/, /\bSKU_PRICES_EUR\b/, /\bpremiumPrices\b/];
  for (const rel of surfaces) {
    const src = await Deno.readTextFile(new URL(rel, import.meta.url));
    // On ignore les commentaires qui EXPLIQUENT la suppression : la garde vise
    // le code, pas la mémoire de la décision.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const re of banned) {
      assert(!re.test(code), `${rel} : ${re} réintroduit — prix codé en dur (§9)`);
    }
  }
});

Deno.test('§9 : le montant catalogue n’est plus la source d’un prix affiché', () => {
  // `SKU_PRICES_EUR` reste (seed serveur, site web) : ce test ne le supprime
  // pas, il constate qu'il n'est plus l'entrée d'un rendu mobile. Le filet
  // ci-dessus est le vrai gardien ; celui-ci épingle la valeur de maquette pour
  // qu'un « 39,99 » ne revienne pas par la porte du catalogue.
  const annual: number = SKU_PRICES_EUR.club_annual;
  assert(annual !== 39.99, 'le prix annuel de la maquette a été recopié dans game-rules');
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
