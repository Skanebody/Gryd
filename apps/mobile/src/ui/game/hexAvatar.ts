/**
 * GRYD — GÉOMÉTRIE PARTAGÉE de l'avatar hexagonal (player card, lignes de
 * classement, marqueurs de carte, chips de frame). Source UNIQUE : deux
 * composants dessinaient le même hexagone avec deux copies de la même recette
 * (PlayerAvatarFrame + PlayerCardAvatar), et la recette elle-même était fausse.
 *
 * ── CE QUI ÉTAIT CASSÉ (retour fondateur « les frames de la card ne sont pas
 *    bien alignés »), mesuré sur la player card à size = 72 ──
 *
 *  1. BOÎTE NON TANGENTE À L'ENCRE. Le <Svg> était carré (72×72) alors qu'un
 *     hexagone régulier pointe-en-haut est ANISOTROPE : largeur = √3/2 × hauteur.
 *     L'ancienne recette (viewBox 100, anneau au rayon 44, trait ≤ 2,4) dessinait
 *     une encre de 56,6 px de large sur 65,1 px de haut dans une boîte de 72×72 :
 *       · 7,7 px de vide FANTÔME à gauche et à droite,
 *       · 3,4 px en haut et en bas.
 *     Conséquences visibles : (a) l'avatar paraissait RENTRÉ de ~8 px par rapport
 *     au blason crew et au bandeau de chiffres, qui s'alignent eux sur le padding
 *     de la card ; (b) l'écart avatar↔texte valait 14 + 7,7 ≈ 22 px au lieu des
 *     14 demandés ; (c) le vide horizontal (7,7) valant plus du double du vide
 *     vertical (3,4), l'hexagone semblait mal centré dans son propre emplacement.
 *     → Ici la boîte est calculée POUR l'encre : `hexAvatarWidth(size)` et la
 *       viewBox partagent exactement le même rapport, tolérance ≤ 0,4 px répartie
 *       symétriquement (jamais de fraction de pixel d'un seul côté).
 *
 *  2. EMPREINTE VARIABLE SELON LE TIER. L'anneau était posé par sa LIGNE
 *     MÉDIANE (rayon 44) et son épaisseur dépend du tier (1,6 road → 2,4 legend) :
 *     l'encre d'un joueur legend était donc 0,6 px plus large que celle d'un
 *     joueur road, à taille de boîte identique. Deux avatars côte à côte (liste
 *     de crew, classement) n'avaient pas le même diamètre optique.
 *     → L'anneau est maintenant posé par son BORD EXTÉRIEUR (`OUTER_EDGE`) :
 *       l'empreinte est rigoureusement identique pour les 6 tiers. Ce qui varie,
 *       c'est le bord INTÉRIEUR de l'anneau — invisible, ≤ 0,6 px, et vers le
 *       centre.
 *
 *  3. CONTOUR DU CORPS DE LARGEUR VARIABLE (2 si « moi », 1,5 sinon) : mon
 *     avatar était littéralement plus GROS que celui des autres sur la même
 *     ligne. Le rôle doit se lire à la COULEUR, jamais à la taille (charte :
 *     couleurs par rôle). → `BODY_STROKE` est constant ; seule la couleur change.
 *
 *  4. LIGNE DE BASE DES INITIALES posée « au jugé » (centre + 12). Une lettre
 *     capitale est centrée quand sa ligne de base tombe à centre + hauteur de
 *     capitale / 2, soit ≈ centre + 0,36 × corps — c'est la formule ci-dessous,
 *     plus un décalage constant à réajuster si le corps change.
 *
 * Les constantes de ce module sont de la GÉOMÉTRIE D'INTERFACE (pas des règles
 * de jeu) : elles vivent ici, nommées, et nulle part ailleurs.
 */
import { BADGE_TIER_STYLE } from '@klaim/shared';

/** Largeur / hauteur d'un hexagone régulier pointe-en-haut. */
export const HEX_ASPECT = Math.sqrt(3) / 2;

/**
 * Largeur de boîte, en px, pour une hauteur d'avatar donnée. `ceil` (jamais
 * `round`) : arrondir vers le bas rognerait l'encre d'un demi-pixel d'un seul
 * côté — exactement le décalage d'une fraction de pixel qu'on veut éliminer.
 */
export function hexAvatarWidth(size: number): number {
  return Math.ceil(size * HEX_ASPECT);
}

// ─── Repères en unités de viewBox (hauteur = 100) ────────────────────────────

/** Hauteur de la viewBox — la dimension qui porte l'échelle. */
export const VB_HEIGHT = 100;
/** Centre vertical. */
export const VB_CY = VB_HEIGHT / 2;

/**
 * Bord EXTÉRIEUR de l'anneau de tier = bord de la viewBox. C'est ce qui fige
 * l'empreinte, tous tiers confondus (défaut n°2).
 */
const OUTER_EDGE = 50;

/** Trait le plus épais du set de tiers — dérivé, jamais recopié en dur. */
const RING_MAX_W = Math.max(
  ...Object.values(BADGE_TIER_STYLE).map((s) => s.strokeWidth),
);

/** Respiration entre le corps et l'anneau (accueille l'anneau secondaire). */
const BAND = 5;

/** Contour du corps — CONSTANT (défaut n°3) : le rôle change la couleur, pas la taille. */
export const BODY_STROKE = 2;

/** Rayon du corps hexagonal (photo / aplat + initiales). */
export const BODY_R = OUTER_EDGE - RING_MAX_W - BAND - BODY_STROKE / 2;

/** Anneau secondaire (tiers race+) — centré dans la bande, épaisseur fixe. */
export const RING2_R = OUTER_EDGE - RING_MAX_W - BAND / 2;
export const RING2_W = 1.1;

/** Rayon de la LIGNE MÉDIANE de l'anneau de tier pour une épaisseur donnée. */
export function ringRadiusFor(strokeWidth: number): number {
  return OUTER_EDGE - strokeWidth / 2;
}

/** Corps des initiales et sa ligne de base optique (défaut n°4). */
export const INITIALS_FONT = 36;
/** Hauteur de capitale ≈ 0,72 × corps → demi-hauteur = 0,36 × corps. */
const CAP_HALF_RATIO = 0.36;
export const INITIALS_BASELINE = VB_CY + INITIALS_FONT * CAP_HALF_RATIO;

/**
 * Boîte de rendu d'un avatar de `size` px de haut : largeur en px, viewBox de
 * MÊME rapport (donc aucun letterboxing, aucune mise à l'échelle parasite) et
 * centre horizontal. Le jeu d'arrondi (≤ 1 unité de viewBox) est réparti
 * symétriquement de part et d'autre de l'encre par construction, puisque le
 * centre est la moitié exacte de la viewBox.
 */
export interface HexAvatarBox {
  /** Largeur de la boîte de layout ET du <Svg>, en px. */
  width: number;
  /** Hauteur, en px (= size). */
  height: number;
  /** Attribut viewBox du <Svg>. */
  viewBox: string;
  /** Centre horizontal, en unités de viewBox. */
  cx: number;
  /** Centre vertical, en unités de viewBox. */
  cy: number;
}

export function hexAvatarBox(size: number): HexAvatarBox {
  const width = hexAvatarWidth(size);
  const vbWidth = (VB_HEIGHT * width) / size;
  return {
    width,
    height: size,
    viewBox: `0 0 ${vbWidth} ${VB_HEIGHT}`,
    cx: vbWidth / 2,
    cy: VB_CY,
  };
}

/** Sommets d'un hexagone régulier pointe-en-haut, prêts pour <Polygon points>. */
export function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}
