/**
 * GRYD — LE CATALOGUE DE COSMÉTIQUES, ÉPROUVÉ.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ───────────────────────────────────────────
 * Avant ce lot, `apps/mobile` n'avait AUCUN cosmétique de profil : ni couleur
 * de nom, ni bannière, ni style de trace, ni style de pin. Les seuls objets
 * équipables étaient le cadre et le titre (0121/0144), et leurs deux
 * emplacements étaient les seuls que le schéma connaisse — mesuré le 10/09 :
 *   `grep "slot text not null check" supabase/migrations/*.sql`
 *   → ('frame','emblem') · ('frame','title') · ('sticker','trace','emblem',…)
 * Aucun `profile_cosmetics_2026` nulle part, aucun `style` sur `MePinMarker2026`,
 * aucun `lineBlur` sur les deux forks de carte.
 *
 * Ce que ce fichier verrouille, et pourquoi chaque verrou existe :
 *  1. UNICITÉ des identifiants — un doublon ferait équiper deux objets
 *     différents sous le même nom, et la clé primaire SQL en choisirait un.
 *  2. UN GRATUIT PAR FAMILLE, au niveau de départ — sans lui, « retirer » un
 *     cosmétique n'aurait aucun état de retour.
 *  3. AUCUN EFFET DE JEU — la seule chose qu'un joueur payant ne doit jamais
 *     obtenir. Un champ nommé `bonus`, `xp`, `multiplier`… fait rougir ce test.
 *  4. PAS DE DÉRIVE avec la migration 0180 — un objet ajouté ici et absent du
 *     serveur serait un objet équipable qui échoue à l'équipement.
 *  5. LA COUTURE COMMERCIALE — « Pas encore en vente » n'est jamais une
 *     supposition : il descend de `storeAvailability2026`, lu dans l'écran.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { COMMERCIAL_PROPOSAL_2026, PROFILE_COSMETIC_LEVELS_2026, PROFILE_COSMETIC_SLOTS_2026 } from '@klaim/shared';
import {
  COSMETIC_GRADIENTS_2026, PROFILE_COSMETICS_2026, cosmeticById2026, cosmeticCardTheme2026,
  cosmeticCommercialStatus2026, cosmeticState2026, cosmeticTracePaint2026, cosmeticsOfFamily2026,
  defaultCosmetic2026, equippedCosmetic2026, isCosmeticUnlocked2026, isFreeCosmetic2026,
  parseEquippedCosmetics2026, type CosmeticItem2026, type CosmeticUnlockContext2026,
} from './cosmetics2026.ts';

const RACINE = new URL('../../../../../', import.meta.url);

const CONTEXTE_NEUF: CosmeticUnlockContext2026 = {
  level: PROFILE_COSMETIC_LEVELS_2026.included,
  ownedSeasonRewardIds: [],
  ownedCollectionIds: [],
  grydPlusActive: false,
};

Deno.test('1 — chaque identifiant est unique, et chaque objet appartient à un emplacement connu', () => {
  const ids = PROFILE_COSMETICS_2026.map(item => item.id);
  assertEquals(new Set(ids).size, ids.length, `identifiants dupliqués : ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);
  for (const item of PROFILE_COSMETICS_2026) {
    assert(PROFILE_COSMETIC_SLOTS_2026.includes(item.family), `${item.id} : emplacement inconnu ${item.family}`);
    assertEquals(item.permanent, true, `${item.id} : tout objet obtenu est permanent (§7.5)`);
    assert(item.name.fr.trim().length > 0 && item.name.en.trim().length > 0, `${item.id} : nom manquant en FR ou EN`);
  }
});

Deno.test('2 — chaque famille a son objet livré avec le compte, et au moins deux gratuits', () => {
  for (const slot of PROFILE_COSMETIC_SLOTS_2026) {
    const famille = cosmeticsOfFamily2026(slot);
    assert(famille.length >= 3, `${slot} : une famille d'un seul objet n'est pas un choix`);
    const livre = defaultCosmetic2026(slot);
    assertEquals(livre.family, slot);
    assert(isCosmeticUnlocked2026(livre, CONTEXTE_NEUF), `${slot} : l'objet livré doit être disponible dès le premier jour`);
    const gratuits = famille.filter(isFreeCosmetic2026);
    assert(gratuits.length >= 2, `${slot} : ${gratuits.length} objet gratuit — il en faut au moins deux (ADR-011)`);
    const commerciaux = famille.filter(item => !isFreeCosmetic2026(item));
    assert(commerciaux.length >= 1, `${slot} : aucune raison d'ouvrir la boutique un jour`);
  }
});

Deno.test('3 — AUCUN effet de jeu : ni bonus, ni multiplicateur, ni monnaie', () => {
  // Le nom d'un champ suffit : on ne veut pas d'un « +5 % de capture » caché
  // sous un intitulé neutre, mais on veut surtout qu'un tel champ soit
  // IMPOSSIBLE à ajouter sans que quelqu'un lise cette ligne.
  const INTERDITS = /(bonus|multipl|xp|score|points?|boost|advantage|avantage|vitesse|speed|capture|m2|territo)/i;
  for (const item of PROFILE_COSMETICS_2026) {
    for (const cle of Object.keys(item as unknown as Record<string, unknown>)) {
      assert(!INTERDITS.test(cle), `${item.id} : le champ « ${cle} » ressemble à un avantage de jeu`);
    }
    // Les seuls nombres autorisés sont de la GÉOMÉTRIE (épaisseur, halo) et le
    // seuil de niveau. Aucun d'eux ne dépasse une valeur de rendu plausible.
    const nombres = Object.entries(item as unknown as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'number') as [string, number][];
    for (const [cle, valeur] of nombres) {
      assert(valeur >= 0 && valeur <= 64, `${item.id}.${cle} = ${valeur} : hors d'une échelle de rendu`);
    }
  }
  // La promesse « aucun avantage payant » n'est affichable que si les règles la
  // tiennent. Si l'une de ces quatre lignes change, ce test tombe AVANT l'écran.
  assertEquals(COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier, 1);
  assertEquals(COMMERCIAL_PROPOSAL_2026.paidXpMultiplier, 1);
  assertEquals(COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier, 1);
  assertEquals(COMMERCIAL_PROPOSAL_2026.virtualCurrency, false);
});

Deno.test('4 — les seuils de niveau viennent de game-rules, jamais d’un nombre écrit ici', () => {
  const echelle = new Set<number>(Object.values(PROFILE_COSMETIC_LEVELS_2026));
  for (const item of PROFILE_COSMETICS_2026) {
    if (item.obtain.kind !== 'level') continue;
    assert(echelle.has(item.obtain.level), `${item.id} : niveau ${item.obtain.level} hors de PROFILE_COSMETIC_LEVELS_2026`);
  }
});

Deno.test('5 — les dégradés sont des objets NOMMÉS, partagés, jamais des hex épars', () => {
  const connus = new Set(Object.values(COSMETIC_GRADIENTS_2026));
  for (const item of PROFILE_COSMETICS_2026) {
    if (item.family === 'nameColor' && item.ink.kind === 'gradient') {
      assert(connus.has(item.ink.gradient), `${item.id} : dégradé anonyme`);
    }
    if (item.family === 'banner' && item.gradient) {
      assert(connus.has(item.gradient), `${item.id} : dégradé anonyme`);
    }
  }
  // Trois dégradés, trois identifiants distincts : un dégradé sans nom ne peut
  // pas être cité dans un écran sans y recopier deux hex.
  assertEquals(Object.keys(COSMETIC_GRADIENTS_2026).length, 3);
  for (const [cle, gradient] of Object.entries(COSMETIC_GRADIENTS_2026)) assertEquals(gradient.id, cle);
});

Deno.test('6 — un objet équipé inconnu retombe sur le défaut, jamais sur du vide', () => {
  for (const slot of PROFILE_COSMETIC_SLOTS_2026) {
    assertEquals(equippedCosmetic2026(slot, null).id, defaultCosmetic2026(slot).id);
    assertEquals(equippedCosmetic2026(slot, 'objet_dune_saison_future').id, defaultCosmetic2026(slot).id);
    // Un identifiant VALIDE mais d'une AUTRE famille ne s'installe pas ici.
    const autre = PROFILE_COSMETICS_2026.find(item => item.family !== slot)!;
    assertEquals(equippedCosmetic2026(slot, autre.id).id, defaultCosmetic2026(slot).id);
  }
  assertEquals(cosmeticById2026(null), null);
  assertEquals(cosmeticById2026('rien')?.id, undefined);
});

Deno.test('7 — le déblocage suit la source serveur, pas une envie du client', () => {
  const item = (id: string) => cosmeticById2026(id) as CosmeticItem2026;
  const niveau8 = { ...CONTEXTE_NEUF, level: PROFILE_COSMETIC_LEVELS_2026.established };
  assert(!isCosmeticUnlocked2026(item('name_aurore'), CONTEXTE_NEUF));
  assert(isCosmeticUnlocked2026(item('name_aurore'), niveau8));
  assert(!isCosmeticUnlocked2026(item('name_givre'), niveau8), 'GRYD+ ne se déduit pas d’un niveau');
  assert(isCosmeticUnlocked2026(item('name_givre'), { ...niveau8, grydPlusActive: true }));
  assert(!isCosmeticUnlocked2026(item('name_lave'), { ...niveau8, grydPlusActive: true }),
    'une collection permanente n’est PAS incluse dans l’abonnement (§16.1)');
  assert(isCosmeticUnlocked2026(item('name_lave'), { ...niveau8, ownedCollectionIds: ['contour'] }));
  assert(!isCosmeticUnlocked2026(item('pin_couronne'), niveau8));
  assert(isCosmeticUnlocked2026(item('pin_couronne'), { ...niveau8, ownedSeasonRewardIds: ['title'] }));
});

Deno.test('8 — « Pas encore en vente » n’est dit QUE quand la boutique le dit', () => {
  // Le défaut réparé par ADR-014 : la phrase s'affichait pour toute boutique
  // fermée, y compris à quelqu'un de déconnecté. Ici elle exige les DEUX faits.
  assertEquals(cosmeticCommercialStatus2026({ owned: false, storeOpen: false, storeSaysNotOnSale: true }), 'not_on_sale');
  assertEquals(cosmeticCommercialStatus2026({ owned: false, storeOpen: false, storeSaysNotOnSale: false }), 'store_unknown');
  assertEquals(cosmeticCommercialStatus2026({ owned: false, storeOpen: true, storeSaysNotOnSale: false }), 'on_sale');
  assertEquals(cosmeticCommercialStatus2026({ owned: true, storeOpen: false, storeSaysNotOnSale: true }), 'owned');

  const givre = cosmeticById2026('name_givre') as CosmeticItem2026;
  assertEquals(cosmeticState2026({ item: givre, context: CONTEXTE_NEUF, equippedId: null, storeOpen: false, storeSaysNotOnSale: true }).kind, 'not_on_sale');
  assertEquals(cosmeticState2026({ item: givre, context: CONTEXTE_NEUF, equippedId: null, storeOpen: false, storeSaysNotOnSale: false }).kind, 'store_unknown');
  assertEquals(cosmeticState2026({ item: givre, context: { ...CONTEXTE_NEUF, grydPlusActive: true }, equippedId: null, storeOpen: false, storeSaysNotOnSale: true }).kind, 'available');

  // Une condition GRATUITE ne devient jamais « pas en vente » : elle porte son
  // niveau, qui est vérifiable (G24).
  const aurore = cosmeticById2026('name_aurore') as CosmeticItem2026;
  const bloque = cosmeticState2026({ item: aurore, context: CONTEXTE_NEUF, equippedId: null, storeOpen: true, storeSaysNotOnSale: false });
  assertEquals(bloque.kind, 'locked_level');
  assertEquals(bloque.kind === 'locked_level' ? bloque.level : 0, PROFILE_COSMETIC_LEVELS_2026.established);
  const ivoire = cosmeticById2026('name_ivoire') as CosmeticItem2026;
  assertEquals(cosmeticState2026({ item: ivoire, context: CONTEXTE_NEUF, equippedId: 'name_ivoire', storeOpen: false, storeSaysNotOnSale: true }).kind, 'equipped');
});

Deno.test('9 — la trace et le thème de carte sortent au format que la carte consomme', () => {
  const defaut = cosmeticTracePaint2026(null);
  assertEquals(defaut.lineColor, '#B4FF0D');
  assertEquals(defaut.lineBlur, undefined, 'aucun halo par défaut : la carte d’aujourd’hui ne change pas');
  const neon = cosmeticTracePaint2026('trace_neon');
  assert((neon.lineBlur ?? 0) > 0, 'le néon SANS halo ne serait pas un néon');
  assert(neon.lineWidth > 0);
  // Un identifiant d'une autre famille ne peint pas la carte.
  assertEquals(cosmeticTracePaint2026('banner_trame').lineColor, defaut.lineColor);
  const theme = cosmeticCardTheme2026('card_inverse');
  assertEquals(theme.id, 'card_inverse');
  assert(theme.background !== theme.ink, 'un thème dont le fond et l’encre se confondent est illisible');
});

Deno.test('10 — la lecture serveur ignore ce qu’elle ne connaît pas', () => {
  assertEquals(parseEquippedCosmetics2026(null).nameColor, null);
  assertEquals(parseEquippedCosmetics2026('bruit').banner, null);
  const lu = parseEquippedCosmetics2026({ nameColor: 'name_chartreuse', banner: 'banner_dune_saison_future', pin: 'name_ivoire', inconnu: 'x' });
  assertEquals(lu.nameColor, 'name_chartreuse');
  assertEquals(lu.banner, null, 'un objet inconnu de ce build ne s’équipe pas de force');
  assertEquals(lu.pin, null, 'un objet d’une autre famille ne prend pas cet emplacement');
  assertEquals(Object.keys(lu).sort().join(','), [...PROFILE_COSMETIC_SLOTS_2026].sort().join(','));
});

Deno.test('11 — aucune dérive entre le catalogue et la migration 0180', async () => {
  const sql = await Deno.readTextFile(new URL('supabase/migrations/0180_profile_cosmetics_2026.sql', RACINE));
  for (const item of PROFILE_COSMETICS_2026) {
    assert(sql.includes(`'${item.id}'`), `${item.id} : équipable côté client, INCONNU du serveur — l’équipement échouerait`);
  }
  // L'inverse : le serveur ne connaît pas d'objet que ce build ne saurait peindre.
  const inserts = [...sql.matchAll(/^\s*\('([a-z0-9_]+)','([a-zA-Z]+)','([a-z_]+)'/gm)].map(m => m[1]!);
  assert(inserts.length > 0, 'la migration n’insère aucun objet : le test ne prouverait rien');
  for (const id of inserts) {
    assert(cosmeticById2026(id), `${id} : objet servi par 0180 et absent du catalogue`);
  }
  assertEquals(inserts.length, PROFILE_COSMETICS_2026.length);
  // Les emplacements du `check` SQL sont EXACTEMENT ceux de game-rules.
  for (const slot of PROFILE_COSMETIC_SLOTS_2026) assert(sql.includes(`'${slot}'`), `emplacement ${slot} absent de 0180`);
});

Deno.test('12 — l’écran ne conclut jamais seul : il lit storeAvailability2026', async () => {
  const source = await Deno.readTextFile(new URL('apps/mobile/src/features/arsenal/CosmeticsPanel2026.tsx', RACINE));
  assert(source.includes('storeAvailability2026('), 'la capacité de vente n’est plus lue : la phrase redeviendrait une supposition');
  assert(source.includes('storeSaysNotOnSale2026('), 'ADR-014 : la phrase « Pas encore en vente » exige sa garde');
  // Aucun ACHAT ici : ce fichier LIT la capacité de vente (`purchasesCapability`)
  // mais n'appelle aucune fonction qui débite, et n'écrit aucun verbe d'achat.
  const sansCommentaires = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const interdit of ['purchasePackage', 'purchaseCollectionProduct2026', 'restorePremiumPurchases', 'Acheter', 'S’abonner']) {
    assert(!sansCommentaires.includes(interdit),
      `« ${interdit} » dans la liste des cosmétiques : ADR-014 interdit tout bouton d’achat tant que la boutique est fermée`);
  }
});
