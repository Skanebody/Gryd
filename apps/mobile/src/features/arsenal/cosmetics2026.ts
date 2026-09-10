/**
 * GRYD — LES COSMÉTIQUES DE PROFIL : LE CATALOGUE, ET SES RÈGLES D'OBTENTION.
 *
 * ═══ LA DEMANDE, ET CE QU'ELLE EXCLUT ═══════════════════════════════════════
 * Fondateur, 10/09/2026 : « Est-ce qu'il y a d'autres moyens de personnalisation
 * de profil qu'utilisent d'autres applications, que l'on peut faire payer
 * in-app, qui ne seraient QUE DU CODE et qui ne coûtent rien ? »
 *
 * « Que du code » est une contrainte, pas une préférence. Elle EXCLUT :
 *  · toute image livrée (un pack d'avatars dessinés se paie à l'illustrateur,
 *    pèse dans le bundle, et se re-paie à chaque saison) ;
 *  · toute police achetée (une licence de fonderie est un coût récurrent) ;
 *  · toute monnaie virtuelle (§16 : « aucun prix masqué derrière des gemmes »).
 * Elle laisse : le SVG, les dégradés, les motifs, la typographie déjà chargée
 * et l'animation. Ce fichier ne contient donc que des DESCRIPTIONS de rendu —
 * des nombres de géométrie et des tokens de couleur — que `CosmeticArt2026`
 * transforme en SVG. Rien n'est téléchargé, rien n'est facturé à personne.
 *
 * ═══ CE QUE FONT LES AUTRES (benchmark court, détaillé dans le doc) ═════════
 *  · Strava ne vend AUCUN cosmétique. Son payant est fonctionnel (segments,
 *    analyses). Un concurrent direct qui ne fait pas une chose est une donnée,
 *    pas une interdiction : cela veut surtout dire que la place est vide.
 *  · Zwift vend des kits et des vélos — mais certains vélos ROULENT PLUS VITE.
 *    C'est le contre-exemple exact : dès qu'un objet payant touche la
 *    performance, il n'est plus cosmétique. GRYD ne peut pas suivre.
 *  · Discord Nitro est le modèle le plus proche : avatar animé, BANNIÈRE de
 *    profil, DÉCORATIONS d'avatar, thèmes, badge. Tout est du rendu client.
 *  · Snapchat+ vend des icônes d'app, des cadres et un badge ; Duolingo des
 *    tenues pour son hibou ; Twitch des badges et des emotes ; Reddit des
 *    avatars. Nike Run Club et Instagram ne vendent rien de cosmétique.
 * Ce que GRYD reprend : la bannière, le cadre, la couleur du nom, le badge de
 * titre (Discord/Snapchat) — et il y ajoute ce que lui seul possède : la TRACE
 * et le PIN sur la carte. Ce que GRYD ne reprend pas : Zwift.
 *
 * ═══ POURQUOI CE FICHIER EST PUR, ET OÙ SONT LES COMPOSANTS ════════════════
 * Aucun import React ni `react-native-svg` ici. La raison est mécanique : le
 * gate teste sous Deno (`npm run test:mobile`), qui ne résout pas un module
 * natif. Un catalogue qui embarquerait ses composants ne serait donc testable
 * par personne — et c'est précisément le catalogue qu'il faut verrouiller
 * (unicité des identifiants, un gratuit par famille, aucun effet de jeu).
 * Les aperçus SVG lisent ces descriptions : `CosmeticArt2026.tsx`.
 *
 * ═══ ANTI PAY-TO-WIN, VÉRIFIÉ ET PAS PROMIS ════════════════════════════════
 * Aucun objet ne porte de bonus, de multiplicateur, de points ni de vitesse.
 * `cosmetics2026.test.ts` refuse tout champ dont le nom évoque un avantage, et
 * relit `COMMERCIAL_PROPOSAL_2026` pour vérifier que les multiplicateurs payants
 * valent toujours 1. Un cosmétique change ce qu'on MONTRE, jamais ce qu'on
 * GAGNE : c'est la seule promesse que ce fichier ait le droit de tenir.
 *
 * ═══ LA BOUTIQUE N'EST PAS OUVERTE (ADR-014) ═══════════════════════════════
 * Les objets commerciaux existent, sont décrits, et ne sont PAS en vente. Aucun
 * bouton d'achat ne se peint tant que `storeAvailability2026().open` est faux ;
 * `cosmeticCommercialStatus2026` ci-dessous est la seule porte, et elle ne dit
 * « Pas encore en vente » que quand c'est VRAI (ni en cours de lecture, ni
 * déconnecté, ni sur une plateforme sans achat intégré).
 */
import {
  PROFILE_COSMETIC_LEVELS_2026,
  PROFILE_COSMETIC_SLOTS_2026,
  colors,
  withAlpha,
} from '@klaim/shared';

/** Les sept emplacements, tels que `game-rules.ts` les nomme (source unique). */
export type CosmeticSlot2026 = (typeof PROFILE_COSMETIC_SLOTS_2026)[number];

/** Les trois collections commerciales permanentes de 0125. Jamais une de plus. */
export type CosmeticCollectionId2026 = 'contour' | 'relief' | 'clubhouse';

/**
 * COMMENT UN OBJET S'OBTIENT — quatre origines, et pas une cinquième.
 *
 * `level` et `season` sont GRATUITES : elles se gagnent en bougeant. `gryd_plus`
 * et `collection` sont COMMERCIALES : elles se paieront le jour où la boutique
 * ouvrira, et jamais avant (ADR-011 : « aucune capacité déjà offerte ne devient
 * payante » — c'est pour ça qu'aucun objet gratuit d'aujourd'hui n'est déplacé
 * vers une origine commerciale ; ils naissent du bon côté et y restent).
 */
export type CosmeticObtain2026 =
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'season'; readonly rewardId: string }
  | { readonly kind: 'gryd_plus' }
  | { readonly kind: 'collection'; readonly collectionId: CosmeticCollectionId2026 };

/** Un dégradé NOMMÉ : deux tokens, un nom, et zéro hex épars dans les écrans. */
export interface CosmeticGradient2026 {
  readonly id: 'aurore' | 'lave' | 'givre';
  readonly from: string;
  readonly to: string;
}

/**
 * LES TROIS DÉGRADÉS, CONSTRUITS SUR LA PALETTE RÉELLE. La direction du 9
 * septembre a neutralisé toute l'échelle : `gameColors.rival` est un gris,
 * `gold` est un blanc. Il n'existe donc AUCUN orange ni violet à mettre dans
 * une « lave ». Plutôt qu'inventer un hex (interdit : ADR-008, tout passe par
 * les tokens), « lave » est la seule chaleur que la charte autorise — la
 * chartreuse pressée qui remonte vers la chartreuse vive, comme une braise.
 */
export const COSMETIC_GRADIENTS_2026: Readonly<Record<CosmeticGradient2026['id'], CosmeticGradient2026>> = {
  aurore: { id: 'aurore', from: colors.chartreuse, to: colors.blanc },
  lave: { id: 'lave', from: colors.chartreusePressed, to: colors.chartreuse },
  givre: { id: 'givre', from: colors.blanc, to: colors.grisFaible },
};

interface CosmeticBase2026 {
  readonly id: string;
  readonly name: { readonly fr: string; readonly en: string };
  readonly obtain: CosmeticObtain2026;
  /** §7.5 — un objet obtenu ne se reprend jamais, même après un abonnement fini. */
  readonly permanent: true;
}

/** (a) Couleur du nom et du @pseudo : un aplat, ou un dégradé nommé. */
export interface NameColorCosmetic2026 extends CosmeticBase2026 {
  readonly family: 'nameColor';
  readonly ink: { readonly kind: 'solid'; readonly color: string }
    | { readonly kind: 'gradient'; readonly gradient: CosmeticGradient2026 };
}

/**
 * (b) Cadre d'avatar. `ring` est une FORME, pas seulement une couleur (L15) :
 * un liseré simple, un double, une couture pointillée, une pulsation, un
 * hexagone. Deux joueurs qui ne distinguent pas les teintes distinguent les
 * formes.
 */
export interface AvatarFrameCosmetic2026 extends CosmeticBase2026 {
  readonly family: 'avatarFrame';
  readonly ring: 'none' | 'single' | 'double' | 'stitch' | 'pulse' | 'hex';
  readonly color: string;
  readonly width: number;
}

/**
 * (c) Bannière de profil. JAMAIS une photo : un dégradé et un motif SVG. Une
 * photo serait un contenu importé — donc un stockage, une modération et un
 * risque de vie privée, pour un objet décoratif. Trois motifs, plus l'aplat.
 */
export interface BannerCosmetic2026 extends CosmeticBase2026 {
  readonly family: 'banner';
  readonly gradient: CosmeticGradient2026 | null;
  readonly base: string;
  readonly pattern: 'flat' | 'grid' | 'hatch' | 'contour';
  readonly patternColor: string;
}

/**
 * (d) Style de la trace. Couleur, épaisseur, et un halo optionnel (`blur`, en
 * pixels MapLibre) : c'est exactement ce que `RealMapGeoJSONLayer` sait peindre.
 *
 * ⚠️ AUCUN POINTILLÉ ICI, ET C'EST DÉLIBÉRÉ. La carte se sert déjà du
 * pointillé pour dire une AFFILIATION (`terr-owner-member`, territoryPaint2026).
 * Un pointillé décoratif sur ma trace ferait lire une information de jeu là où
 * il n'y en a pas — L15 exige que le motif porte du sens, pas qu'il en imite un.
 */
export interface TraceCosmetic2026 extends CosmeticBase2026 {
  readonly family: 'trace';
  readonly color: string;
  readonly width: number;
  /** Halo néon (px). `0` = aucun halo. Rendu par `lineBlur` sur les deux forks. */
  readonly blur: number;
}

/**
 * (e) Style du pin « moi ». La forme seule change ; l'ANCRAGE ne bouge jamais
 * (`MePinMarker2026` : la pointe tombe sur la coordonnée, à 26 pt près sinon).
 * C'est pour ça que le composant reçoit un `style` et pas une géométrie.
 */
export interface PinCosmetic2026 extends CosmeticBase2026 {
  readonly family: 'pin';
  readonly shape: 'drop' | 'hex' | 'bolt' | 'crown' | 'crest';
}

/** (g) Badge de titre : la typographie du titre équipé, jamais un rang de plus. */
export interface TitleBadgeCosmetic2026 extends CosmeticBase2026 {
  readonly family: 'titleBadge';
  readonly letterCase: 'normal' | 'upper';
  readonly outline: boolean;
  readonly color: string;
}

/**
 * (f) Thème de la carte de résultat et de partage. Exposé ici, CONSOMMÉ par le
 * lot partage : ce lot-ci ne touche pas `share/**`. Trois couleurs suffisent à
 * décrire une affiche, et elles viennent toutes des tokens.
 */
export interface CardThemeCosmetic2026 extends CosmeticBase2026 {
  readonly family: 'cardTheme';
  readonly background: string;
  readonly ink: string;
  readonly accent: string;
}

export type CosmeticItem2026 =
  | NameColorCosmetic2026 | AvatarFrameCosmetic2026 | BannerCosmetic2026
  | TraceCosmetic2026 | PinCosmetic2026 | TitleBadgeCosmetic2026 | CardThemeCosmetic2026;

const L = PROFILE_COSMETIC_LEVELS_2026;
const level = (n: number): CosmeticObtain2026 => ({ kind: 'level', level: n });
const collection = (id: CosmeticCollectionId2026): CosmeticObtain2026 => ({ kind: 'collection', collectionId: id });
const PLUS: CosmeticObtain2026 = { kind: 'gryd_plus' };
const PERMANENT = true as const;

/**
 * ═══ LE CATALOGUE ═══════════════════════════════════════════════════════════
 *
 * TRENTE-QUATRE objets, SEPT familles, et une règle tenue partout : chaque
 * famille commence par un objet LIVRÉ AVEC LE COMPTE (niveau 1), qui décrit
 * l'apparence actuelle de l'app. Ce n'est pas un remplissage — sans lui,
 * « retirer » un cosmétique n'aurait aucun objet vers lequel revenir, et
 * l'écran devrait inventer un état « rien », que le serveur ne saurait pas
 * nommer.
 *
 * Chaque famille compte AU MOINS deux objets gratuits gagnés en bougeant, et au
 * moins un objet commercial. Les commerciaux ne sont pas plus « forts » : ils
 * sont plus rares. Un cadre pulsé n'ajoute pas un mètre carré.
 */
export const PROFILE_COSMETICS_2026: readonly CosmeticItem2026[] = [
  // ─── (a) COULEUR DU NOM ET DU @PSEUDO ────────────────────────────────────
  { id: 'name_ivoire', family: 'nameColor', permanent: PERMANENT, obtain: level(L.included),
    name: { fr: 'Ivoire', en: 'Ivory' }, ink: { kind: 'solid', color: colors.blanc } },
  { id: 'name_chartreuse', family: 'nameColor', permanent: PERMANENT, obtain: level(L.firstLoop),
    name: { fr: 'Chartreuse', en: 'Chartreuse' }, ink: { kind: 'solid', color: colors.chartreuse } },
  { id: 'name_aurore', family: 'nameColor', permanent: PERMANENT, obtain: level(L.established),
    name: { fr: 'Aurore', en: 'Dawn' }, ink: { kind: 'gradient', gradient: COSMETIC_GRADIENTS_2026.aurore } },
  { id: 'name_givre', family: 'nameColor', permanent: PERMANENT, obtain: PLUS,
    name: { fr: 'Givre', en: 'Frost' }, ink: { kind: 'gradient', gradient: COSMETIC_GRADIENTS_2026.givre } },
  { id: 'name_lave', family: 'nameColor', permanent: PERMANENT, obtain: collection('contour'),
    name: { fr: 'Lave', en: 'Lava' }, ink: { kind: 'gradient', gradient: COSMETIC_GRADIENTS_2026.lave } },

  // ─── (b) CADRES D'AVATAR ─────────────────────────────────────────────────
  { id: 'frame_nu', family: 'avatarFrame', permanent: PERMANENT, obtain: level(L.included),
    name: { fr: 'Sans cadre', en: 'No frame' }, ring: 'none', color: colors.grisLigne, width: 0 },
  { id: 'frame_lisere', family: 'avatarFrame', permanent: PERMANENT, obtain: level(L.firstLoop),
    name: { fr: 'Liseré', en: 'Hairline' }, ring: 'single', color: colors.blanc, width: 2 },
  { id: 'frame_double', family: 'avatarFrame', permanent: PERMANENT, obtain: level(L.regular),
    name: { fr: 'Double liseré', en: 'Double hairline' }, ring: 'double', color: colors.blanc, width: 2 },
  { id: 'frame_couture', family: 'avatarFrame', permanent: PERMANENT, obtain: level(L.seasoned),
    name: { fr: 'Couture', en: 'Stitch' }, ring: 'stitch', color: colors.chartreuse, width: 2 },
  { id: 'frame_pulsation', family: 'avatarFrame', permanent: PERMANENT, obtain: PLUS,
    name: { fr: 'Pulsation', en: 'Pulse' }, ring: 'pulse', color: colors.chartreuse, width: 3 },
  { id: 'frame_hexagone', family: 'avatarFrame', permanent: PERMANENT, obtain: collection('relief'),
    name: { fr: 'Hexagone néon', en: 'Neon hexagon' }, ring: 'hex', color: colors.chartreuse, width: 3 },

  // ─── (c) BANNIÈRES DE PROFIL ─────────────────────────────────────────────
  { id: 'banner_carbone', family: 'banner', permanent: PERMANENT, obtain: level(L.included),
    name: { fr: 'Carbone', en: 'Carbon' }, gradient: null, base: colors.carbone,
    pattern: 'flat', patternColor: colors.grisLigne },
  { id: 'banner_trame', family: 'banner', permanent: PERMANENT, obtain: level(L.regular),
    name: { fr: 'Trame', en: 'Grid' }, gradient: null, base: colors.carbone,
    pattern: 'grid', patternColor: withAlpha(colors.blanc, 0.1) },
  { id: 'banner_hachures', family: 'banner', permanent: PERMANENT, obtain: level(L.established),
    name: { fr: 'Hachures', en: 'Hatching' }, gradient: null, base: colors.carbonDeep,
    pattern: 'hatch', patternColor: withAlpha(colors.chartreuse, 0.22) },
  { id: 'banner_aurore', family: 'banner', permanent: PERMANENT, obtain: PLUS,
    name: { fr: 'Aurore', en: 'Dawn' }, gradient: COSMETIC_GRADIENTS_2026.aurore, base: colors.carbone,
    pattern: 'flat', patternColor: withAlpha(colors.blanc, 0.1) },
  { id: 'banner_courbes', family: 'banner', permanent: PERMANENT, obtain: collection('contour'),
    name: { fr: 'Courbes de niveau', en: 'Contour lines' }, gradient: null, base: colors.carbonDeep,
    pattern: 'contour', patternColor: withAlpha(colors.chartreuse, 0.3) },

  // ─── (d) STYLE DE LA TRACE ───────────────────────────────────────────────
  { id: 'trace_chartreuse', family: 'trace', permanent: PERMANENT, obtain: level(L.included),
    name: { fr: 'Chartreuse', en: 'Chartreuse' }, color: colors.chartreuse, width: 3, blur: 0 },
  { id: 'trace_ivoire', family: 'trace', permanent: PERMANENT, obtain: level(L.firstLoop),
    name: { fr: 'Ivoire', en: 'Ivory' }, color: colors.blanc, width: 3, blur: 0 },
  { id: 'trace_large', family: 'trace', permanent: PERMANENT, obtain: level(L.established),
    name: { fr: 'Trait large', en: 'Bold line' }, color: colors.chartreuse, width: 5, blur: 0 },
  { id: 'trace_neon', family: 'trace', permanent: PERMANENT, obtain: PLUS,
    name: { fr: 'Néon', en: 'Neon' }, color: colors.chartreuse, width: 4, blur: 3 },
  { id: 'trace_relief', family: 'trace', permanent: PERMANENT, obtain: collection('relief'),
    name: { fr: 'Relief', en: 'Relief' }, color: colors.blanc, width: 5, blur: 2 },

  // ─── (e) STYLE DU PIN « MOI » ────────────────────────────────────────────
  { id: 'pin_goutte', family: 'pin', permanent: PERMANENT, obtain: level(L.included),
    name: { fr: 'Goutte', en: 'Drop' }, shape: 'drop' },
  { id: 'pin_hexagone', family: 'pin', permanent: PERMANENT, obtain: level(L.regular),
    name: { fr: 'Hexagone', en: 'Hexagon' }, shape: 'hex' },
  { id: 'pin_eclair', family: 'pin', permanent: PERMANENT, obtain: level(L.veteran),
    name: { fr: 'Éclair', en: 'Bolt' }, shape: 'bolt' },
  // La couronne se gagne avec le TITRE de saison : c'est le seul pin qui dise
  // quelque chose du joueur, et il ne le dit que si le joueur a l'objet.
  { id: 'pin_couronne', family: 'pin', permanent: PERMANENT, obtain: { kind: 'season', rewardId: 'title' },
    name: { fr: 'Couronne', en: 'Crown' }, shape: 'crown' },
  { id: 'pin_blason', family: 'pin', permanent: PERMANENT, obtain: collection('clubhouse'),
    name: { fr: 'Blason', en: 'Crest' }, shape: 'crest' },

  // ─── (g) BADGES DE TITRE ─────────────────────────────────────────────────
  { id: 'title_simple', family: 'titleBadge', permanent: PERMANENT, obtain: level(L.included),
    name: { fr: 'Simple', en: 'Plain' }, letterCase: 'normal', outline: false, color: colors.gris },
  { id: 'title_capitales', family: 'titleBadge', permanent: PERMANENT, obtain: level(L.firstLoop),
    name: { fr: 'Capitales', en: 'Caps' }, letterCase: 'upper', outline: false, color: colors.blanc },
  { id: 'title_contour', family: 'titleBadge', permanent: PERMANENT, obtain: level(L.established),
    name: { fr: 'Contour', en: 'Outlined' }, letterCase: 'upper', outline: true, color: colors.blanc },
  { id: 'title_grave', family: 'titleBadge', permanent: PERMANENT, obtain: collection('clubhouse'),
    name: { fr: 'Gravé', en: 'Engraved' }, letterCase: 'upper', outline: true, color: colors.chartreuse },

  // ─── (f) THÈMES DE CARTE DE RÉSULTAT ET DE PARTAGE ───────────────────────
  { id: 'card_sombre', family: 'cardTheme', permanent: PERMANENT, obtain: level(L.included),
    name: { fr: 'Sombre', en: 'Dark' }, background: colors.noir, ink: colors.blanc, accent: colors.chartreuse },
  { id: 'card_minimal', family: 'cardTheme', permanent: PERMANENT, obtain: level(L.regular),
    name: { fr: 'Minimal', en: 'Minimal' }, background: colors.carbone, ink: colors.blanc, accent: colors.gris },
  { id: 'card_inverse', family: 'cardTheme', permanent: PERMANENT, obtain: level(L.seasoned),
    name: { fr: 'Chartreuse inversé', en: 'Inverted chartreuse' }, background: colors.chartreuse,
    ink: colors.noir, accent: colors.noir },
  { id: 'card_affiche', family: 'cardTheme', permanent: PERMANENT, obtain: PLUS,
    name: { fr: 'Affiche', en: 'Poster' }, background: colors.carbonDeep, ink: colors.blanc, accent: colors.chartreuse },
];

/** L'objet livré avec le compte pour un emplacement. Il existe toujours. */
export function defaultCosmetic2026(family: CosmeticSlot2026): CosmeticItem2026 {
  const found = PROFILE_COSMETICS_2026.find(item =>
    item.family === family && item.obtain.kind === 'level' && item.obtain.level === L.included);
  if (!found) throw new Error(`Aucun cosmétique livré pour ${family}`);
  return found;
}

export function cosmeticsOfFamily2026(family: CosmeticSlot2026): readonly CosmeticItem2026[] {
  return PROFILE_COSMETICS_2026.filter(item => item.family === family);
}

export function cosmeticById2026(id: string | null | undefined): CosmeticItem2026 | null {
  if (!id) return null;
  return PROFILE_COSMETICS_2026.find(item => item.id === id) ?? null;
}

/**
 * Un objet ÉQUIPÉ, lu comme celui de sa famille — avec repli sur l'objet livré.
 * Un identifiant inconnu (serveur en avance d'une saison sur ce build) ne rend
 * JAMAIS `null` : il rend le défaut. Peindre « rien » ferait croire à une panne.
 */
export function equippedCosmetic2026(family: CosmeticSlot2026, equippedId: string | null | undefined): CosmeticItem2026 {
  const item = cosmeticById2026(equippedId);
  return item && item.family === family ? item : defaultCosmetic2026(family);
}

/** Origine gratuite ? `level` et `season` se gagnent ; les deux autres se paient. */
export function isFreeCosmetic2026(item: CosmeticItem2026): boolean {
  return item.obtain.kind === 'level' || item.obtain.kind === 'season';
}

/**
 * CE QUE LE JOUEUR POSSÈDE VRAIMENT, tel que les lectures serveur le disent.
 * Le client ne DÉCIDE rien avec : il AFFICHE. L'autorisation est reprise mot
 * pour mot par `equip_cosmetic_2026` (migration 0180), qui refuse un objet non
 * débloqué même si l'écran l'a proposé par erreur.
 */
export interface CosmeticUnlockContext2026 {
  /** Niveau permanent, dérivé des XP confirmés (`careerProgress2026`). */
  readonly level: number;
  /** `rewardId` des objets de saison POSSÉDÉS (`ownedRewards`). */
  readonly ownedSeasonRewardIds: readonly string[];
  /** Collections commerciales possédées (`commercial_ownership_2026`). */
  readonly ownedCollectionIds: readonly string[];
  /** GRYD+ actif à l'instant de la lecture (`has_gryd_plus_access_2026`). */
  readonly grydPlusActive: boolean;
}

export function isCosmeticUnlocked2026(item: CosmeticItem2026, context: CosmeticUnlockContext2026): boolean {
  switch (item.obtain.kind) {
    case 'level': return context.level >= item.obtain.level;
    case 'season': return context.ownedSeasonRewardIds.includes(item.obtain.rewardId);
    case 'collection': return context.ownedCollectionIds.includes(item.obtain.collectionId);
    case 'gryd_plus': return context.grydPlusActive;
  }
}

/**
 * ─── L'ÉTAT COMMERCIAL D'UN OBJET, ET LA PHRASE QU'IL AUTORISE ─────────────
 *
 * ADR-014 a corrigé un défaut PRÉCIS et il ne se reproduit pas ici : « Pas
 * encore en vente » était affiché pour TOUTE boutique fermée, y compris à
 * quelqu'un de déconnecté — à qui la vraie phrase est « connecte-toi », parce
 * qu'on ne sait rien de la vente tant qu'on n'a pas lu son compte.
 *
 * Cette fonction ne REFAIT pas ce raisonnement : elle le REÇOIT. L'écran
 * calcule `storeAvailability2026(…)` puis `storeSaysNotOnSale2026(…)`, les deux
 * fonctions qui font déjà loi dans `features/premium/plan2026.ts`, et passe
 * leurs résultats. Deux copies de la même doctrine finiraient par diverger.
 */
export type CosmeticCommercialStatus2026 = 'owned' | 'on_sale' | 'not_on_sale' | 'store_unknown';

export function cosmeticCommercialStatus2026(input: {
  readonly owned: boolean;
  readonly storeOpen: boolean;
  readonly storeSaysNotOnSale: boolean;
}): CosmeticCommercialStatus2026 {
  if (input.owned) return 'owned';
  if (input.storeOpen) return 'on_sale';
  return input.storeSaysNotOnSale ? 'not_on_sale' : 'store_unknown';
}

/**
 * L'ÉTAT COMPLET d'un objet dans la liste. Sept états, chacun avec sa phrase.
 * `locked_level` porte le niveau : « Débloqué au niveau N » est vérifiable,
 * « bientôt » ne l'est pas (G24 : « les objets gagnables indiquent une condition
 * vérifiable »).
 */
export type CosmeticState2026 =
  | { readonly kind: 'equipped' }
  | { readonly kind: 'available' }
  | { readonly kind: 'locked_level'; readonly level: number }
  | { readonly kind: 'locked_season'; readonly rewardId: string }
  | { readonly kind: 'not_on_sale' }
  | { readonly kind: 'store_unknown' }
  | { readonly kind: 'on_sale' };

export function cosmeticState2026(input: {
  readonly item: CosmeticItem2026;
  readonly context: CosmeticUnlockContext2026;
  readonly equippedId: string | null;
  readonly storeOpen: boolean;
  readonly storeSaysNotOnSale: boolean;
}): CosmeticState2026 {
  const { item, context, equippedId } = input;
  const unlocked = isCosmeticUnlocked2026(item, context);
  if (unlocked && equippedId === item.id) return { kind: 'equipped' };
  if (unlocked) return { kind: 'available' };
  if (item.obtain.kind === 'level') return { kind: 'locked_level', level: item.obtain.level };
  if (item.obtain.kind === 'season') return { kind: 'locked_season', rewardId: item.obtain.rewardId };
  const commercial = cosmeticCommercialStatus2026({
    owned: false, storeOpen: input.storeOpen, storeSaysNotOnSale: input.storeSaysNotOnSale,
  });
  return commercial === 'on_sale' ? { kind: 'on_sale' }
    : commercial === 'not_on_sale' ? { kind: 'not_on_sale' } : { kind: 'store_unknown' };
}

/**
 * ─── LA TRACE, TRADUITE EN COUCHE DE CARTE ─────────────────────────────────
 * Les noms de champs sont EXACTEMENT ceux de `RealMapGeoJSONLayer` et de
 * `TerritoryPaintLayer2026` : l'appelant étale le résultat, il ne traduit rien.
 * C'est ce qui rend le cosmétique VRAI sur la carte sans dupliquer une palette.
 */
export interface CosmeticTracePaint2026 {
  readonly lineColor: string;
  readonly lineWidth: number;
  readonly lineBlur?: number;
}

export function cosmeticTracePaint2026(equippedId: string | null | undefined): CosmeticTracePaint2026 {
  const item = equippedCosmetic2026('trace', equippedId);
  if (item.family !== 'trace') throw new Error('Emplacement de trace incohérent');
  return item.blur > 0
    ? { lineColor: item.color, lineWidth: item.width, lineBlur: item.blur }
    : { lineColor: item.color, lineWidth: item.width };
}

/**
 * LA COULEUR PLEINE d'un cosmétique de nom. Un dégradé rend son PREMIER ton.
 *
 * Pourquoi cette porte de sortie existe : un dégradé se peint en `<Text>` SVG,
 * qui perd le retour à la ligne, la sélection et l'agrandissement des polices
 * système. Sur un titre de profil, ça vaut le coup ; sur un @ de 13 pt dans une
 * liste, non. Les petits libellés prennent donc la teinte, pas le dégradé — et
 * ils restent du VRAI texte, lisible par un lecteur d'écran comme par le
 * réglage « texte plus grand ».
 */
export function cosmeticInkColor2026(item: CosmeticItem2026): string {
  if (item.family !== 'nameColor') return colors.blanc;
  return item.ink.kind === 'solid' ? item.ink.color : item.ink.gradient.from;
}

/**
 * ─── LE CADRE, TRADUIT EN ANNEAU POUR LES AVATARS SOCIAUX ──────────────────
 * `AvatarHex` et `PlayerCardAvatar` dessinent déjà un anneau, mais sa couleur
 * vient du TIER du joueur — c'est-à-dire d'un rang. G22 refuse « sept rangs
 * différents au-dessus du nom » : un cadre choisi REMPLACE donc l'anneau de
 * rang, il ne s'y ajoute pas. Sans cadre équipé, cette fonction rend `null` et
 * l'anneau de tier reste exactement ce qu'il était.
 *
 * Le rendu est STATIQUE : ces avatars sont des SVG posés dans des listes, et
 * une pulsation par ligne coûterait plus qu'elle n'apporte. Le cadre animé
 * garde donc sa forme et sa couleur ici, et ne pulse que sur le profil.
 */
export interface CosmeticRingPaint2026 {
  readonly stroke: string;
  readonly strokeWidth: number;
  /** Pointillé de la « couture ». `null` = trait plein. */
  readonly dash: readonly number[] | null;
  /** Second anneau extérieur (« double liseré »). */
  readonly outerRing: boolean;
}

export function cosmeticRingPaint2026(equippedId: string | null | undefined): CosmeticRingPaint2026 | null {
  const item = cosmeticById2026(equippedId);
  if (!item || item.family !== 'avatarFrame' || item.ring === 'none') return null;
  return {
    stroke: item.color,
    strokeWidth: item.width,
    dash: item.ring === 'stitch' ? [3, 3] : null,
    outerRing: item.ring === 'double' || item.ring === 'hex' || item.ring === 'pulse',
  };
}

/**
 * Le thème de carte de partage, exposé pour le lot partage. Ce lot-ci ne touche
 * pas `share/**` : il publie le contrat, l'autre le consomme quand il passe.
 */
export interface CosmeticCardTheme2026 {
  readonly id: string;
  readonly background: string;
  readonly ink: string;
  readonly accent: string;
}

export function cosmeticCardTheme2026(equippedId: string | null | undefined): CosmeticCardTheme2026 {
  const item = equippedCosmetic2026('cardTheme', equippedId);
  if (item.family !== 'cardTheme') throw new Error('Emplacement de thème incohérent');
  return { id: item.id, background: item.background, ink: item.ink, accent: item.accent };
}

/** Ce que le serveur garde par emplacement. `null` = l'objet livré avec le compte. */
export type EquippedCosmetics2026 = Readonly<Record<CosmeticSlot2026, string | null>>;

export const NO_COSMETICS_EQUIPPED_2026: EquippedCosmetics2026 = Object.freeze(
  Object.fromEntries(PROFILE_COSMETIC_SLOTS_2026.map(slot => [slot, null])),
) as EquippedCosmetics2026;

/**
 * Lit la carte d'équipement rendue par le serveur. Un emplacement inconnu est
 * IGNORÉ, un identifiant absent du catalogue aussi : un build en retard d'une
 * saison montre le défaut, il ne plante pas et n'invente pas.
 */
export function parseEquippedCosmetics2026(value: unknown): EquippedCosmetics2026 {
  if (!value || typeof value !== 'object') return NO_COSMETICS_EQUIPPED_2026;
  const row = value as Record<string, unknown>;
  const entries = PROFILE_COSMETIC_SLOTS_2026.map(slot => {
    const raw = row[slot];
    const item = typeof raw === 'string' ? cosmeticById2026(raw) : null;
    return [slot, item && item.family === slot ? item.id : null] as const;
  });
  return Object.fromEntries(entries) as EquippedCosmetics2026;
}
