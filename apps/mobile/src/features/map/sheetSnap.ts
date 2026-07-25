/**
 * GRYD — GÉOMÉTRIE PURE de la sheet ANCRÉE de la Carte (planches E02/E03) et du
 * bouton GO à deux états. Zéro import React/RN : testable en Deno.
 *
 * POURQUOI CE MODULE EXISTE. L'ancienne sheet (`ui/game/MapBottomSheet`) calcule
 * ses paliers en fraction de SON CONTENEUR (`containerH * 0.85`) — or ce
 * conteneur s'arrêtait 152 px au-dessus du bord bas, si bien que le « 85 % »
 * mesuré valait 67 % de l'écran et que les 29 % / 52 % / 90 % de la planche E02
 * étaient intenables. Pire : le moindre ajustement du dégagement bas déplaçait
 * TOUS les paliers. Ici les paliers sont des fractions de la HAUTEUR D'ÉCRAN,
 * et le dégagement de la barre d'onglets est retiré une seule fois, en amont.
 *
 * Aucune constante de JEU ici — uniquement de la mise en page (les règles de jeu
 * vivent dans packages/shared/src/game-rules.ts).
 */

/** Les trois paliers de la planche E02, du plus fermé au plus ouvert. */
export type MapSheetStop = 'compact' | 'semi' | 'open';

/** Ordre CANONIQUE (fermé → ouvert) : toute la logique de voisinage s'y adosse. */
export const MAP_SHEET_STOP_ORDER: readonly MapSheetStop[] = ['compact', 'semi', 'open'];

/**
 * Paliers de la planche E02, en fraction de la HAUTEUR D'ÉCRAN :
 * « Sheet compacte 29 % (drag → 52 % / 90 %) ».
 */
export const MAP_SHEET_STOP_RATIO: Readonly<Record<MapSheetStop, number>> = {
  compact: 0.29,
  semi: 0.52,
  open: 0.9,
};

/** Glissement minimal (px) avant que la sheet prenne le geste (verrouillage d'axe). */
export const SHEET_DRAG_THRESHOLD_PX = 6;
/** Vitesse (px/ms) au-delà de laquelle un fling saute au palier voisin. */
export const SHEET_FLING_VELOCITY = 0.45;

export interface MapSheetGeometryInput {
  /** Hauteur de l'ÉCRAN (window) — jamais celle du conteneur. */
  screenH: number;
  /** Safe area basse. */
  bottomInset: number;
  /** Hauteur de la barre d'onglets : la sheet se colle JUSTE au-dessus d'elle. */
  navBarH: number;
  /** Hauteur du contenu compact — le peek ne se tronque jamais (§A9). */
  peekMinHeight: number;
  /**
   * Paliers autorisés. `['compact']` = panneau FIXE (ni poignée ni geste) : c'est
   * le cas d'une sheet sans contenu déployé, où une poignée serait un contrôle
   * mort (§ « aucun bouton mort »).
   */
  stops?: readonly MapSheetStop[];
  /**
   * `true` = la sheet ÉPOUSE son contenu au lieu de monter au ratio de la
   * planche. Réservé aux panneaux FIXES : sans geste pour la déployer, une sheet
   * de 29 % remplie par 128 px de texte laisse une bande carbone vide qui se lit
   * comme un écran cassé (§A). Une sheet TIRABLE, elle, garde le ratio : le vide
   * du bas est occupé par le bouton GO en position pill (planche E02).
   */
  hugContent?: boolean;
}

export interface MapSheetGeometry {
  /** Paliers réellement disponibles, dans l'ordre canonique. */
  stops: readonly MapSheetStop[];
  /** Hauteur VISIBLE de la sheet à chaque palier. */
  heights: Readonly<Record<MapSheetStop, number>>;
  /** translateY de la sheet (hauteur `sheetH` ancrée en bas) à chaque palier. */
  offsets: Readonly<Record<MapSheetStop, number>>;
  /** Hauteur de la vue animée = palier le plus ouvert disponible. */
  sheetH: number;
}

/** Borne `v` dans [min, max] (min gagne si l'intervalle est dégénéré). */
function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

/** Réordonne/filtre une liste de paliers selon l'ordre canonique (fermé → ouvert). */
function orderStops(stops: readonly MapSheetStop[] | undefined): readonly MapSheetStop[] {
  const wanted = stops && stops.length > 0 ? stops : MAP_SHEET_STOP_ORDER;
  const kept = MAP_SHEET_STOP_ORDER.filter((s) => wanted.includes(s));
  return kept.length > 0 ? kept : ['compact'];
}

/**
 * Paliers de la sheet ancrée. Trois contraintes, dans cet ordre :
 *   1. le palier vaut sa FRACTION D'ÉCRAN (planche E02) ;
 *   2. il ne descend jamais sous la hauteur du contenu compact — un peek tronqué
 *      est interdit (§A9), et une sheet plus courte que son texte se lirait
 *      comme un écran cassé ;
 *   3. il ne dépasse jamais l'espace LIBRE au-dessus de la barre d'onglets : la
 *      sheet se colle au-dessus d'elle, elle ne passe jamais dessous.
 * Les paliers restent monotones (compact ≤ semi ≤ open) même après ces bornes.
 */
export function mapSheetStops(input: MapSheetGeometryInput): MapSheetGeometry {
  const stops = orderStops(input.stops);
  const usable = Math.max(0, input.screenH - input.bottomInset - input.navBarH);
  const floor = Math.max(0, input.peekMinHeight);
  const heights = {} as Record<MapSheetStop, number>;
  let previous = 0;
  for (const stop of MAP_SHEET_STOP_ORDER) {
    const ratioH = input.hugContent === true ? 0 : input.screenH * MAP_SHEET_STOP_RATIO[stop];
    // `previous` garantit la monotonie : un palier ne redescend jamais sous le
    // précédent, même quand le plafond `usable` écrase les deux derniers.
    heights[stop] = clamp(Math.max(ratioH, floor, previous), 0, usable);
    previous = heights[stop];
  }
  const sheetH = stops.reduce((max, s) => Math.max(max, heights[s]), 0);
  const offsets = {} as Record<MapSheetStop, number>;
  for (const stop of MAP_SHEET_STOP_ORDER) offsets[stop] = sheetH - heights[stop];
  return { stops, heights, offsets, sheetH };
}

/**
 * PLAFONNE les paliers à la hauteur RÉELLE du contenu, et supprime les paliers
 * devenus identiques.
 *
 * POURQUOI : le palier « ouvert » de la planche vaut 90 % de l'écran. Tant que le
 * contenu déployé tient en 250 px, tirer jusque-là révèle 400 px de carbone vide
 * — un écran qui se lit comme cassé (§A).
 *
 * DEUX GARDE-FOUS, et ils comptent autant que le plafond lui-même :
 *   • le palier COMPACT n'est jamais rogné — il garde le ratio de la planche, et
 *     le vide de son bas est occupé par le bouton GO en position pill (E02) ;
 *   • le PREMIER palier déployé (52 %) n'est jamais rogné non plus. Sans ça, un
 *     contenu à peine plus haut que le compact rendrait le déploiement invisible
 *     (quelques pixels de course), voire ferait disparaître la poignée sur les
 *     grands écrans — c'est-à-dire supprimerait le geste que la planche exige.
 *     Le déploiement reste donc TOUJOURS franc ; c'est le palier 90 % qui saute
 *     quand il n'a rien à montrer.
 *
 * Deux paliers qui finiraient à la même hauteur sont fusionnés : un palier qui ne
 * déplace rien serait un cran mort sous le doigt.
 */
export function clampSheetToContent(
  geometry: MapSheetGeometry,
  contentH: number,
): MapSheetGeometry {
  if (!Number.isFinite(contentH) || contentH <= 0) return geometry;
  const firstDeployed = geometry.stops[1];
  const deployedFloor = firstDeployed ? geometry.heights[firstDeployed] : 0;
  const cap = Math.max(geometry.heights.compact, deployedFloor, contentH);
  if (geometry.sheetH <= cap) return geometry;
  const heights = {} as Record<MapSheetStop, number>;
  for (const stop of MAP_SHEET_STOP_ORDER) heights[stop] = Math.min(geometry.heights[stop], cap);
  // Dédoublonne : on garde le PREMIER palier (le plus fermé) de chaque hauteur.
  const seen = new Set<number>();
  const stops = geometry.stops.filter((s) => {
    if (seen.has(heights[s])) return false;
    seen.add(heights[s]);
    return true;
  });
  const kept = stops.length > 0 ? stops : ([geometry.stops[0] ?? 'compact'] as MapSheetStop[]);
  const sheetH = kept.reduce((max, s) => Math.max(max, heights[s]), 0);
  const offsets = {} as Record<MapSheetStop, number>;
  for (const stop of MAP_SHEET_STOP_ORDER) offsets[stop] = sheetH - heights[stop];
  return { stops: kept, heights, offsets, sheetH };
}

/** Borne un translateY courant aux paliers disponibles (anti sur-glissement). */
export function clampSheetY(y: number, geometry: MapSheetGeometry): number {
  const values = geometry.stops.map((s) => geometry.offsets[s]);
  return clamp(y, Math.min(...values), Math.max(...values));
}

/** Palier le plus proche de la POSITION courante (jamais de l'état de départ). */
export function nearestSheetStop(y: number, geometry: MapSheetGeometry): MapSheetStop {
  const [first, ...rest] = geometry.stops;
  let best: MapSheetStop = first ?? 'compact';
  for (const stop of rest) {
    if (Math.abs(geometry.offsets[stop] - y) < Math.abs(geometry.offsets[best] - y)) best = stop;
  }
  return best;
}

/**
 * Palier retenu au relâcher : le plus proche, sauf FLING — un geste rapide saute
 * au voisin dans SON sens (vy < 0 = doigt vers le haut = palier plus ouvert),
 * clampé aux bornes.
 */
export function releaseSheetStop(
  y: number,
  vy: number,
  geometry: MapSheetGeometry,
): MapSheetStop {
  const nearest = nearestSheetStop(y, geometry);
  if (Math.abs(vy) <= SHEET_FLING_VELOCITY) return nearest;
  const index = geometry.stops.indexOf(nearest);
  const target = vy < 0 ? index + 1 : index - 1;
  return geometry.stops[clamp(target, 0, geometry.stops.length - 1)] ?? nearest;
}

/**
 * TAP sur la poignée = BASCULE compact ⇄ déployé (jamais un cycle à 3 temps :
 * un tap doit être prévisible, et le geste reste le moyen d'atteindre le 3ᵉ
 * palier). Le palier « déployé » est `semi` quand il existe — c'est celui de la
 * planche E02 quand la sheet est ouverte — sinon le plus ouvert disponible.
 */
export function toggleSheetStop(
  current: MapSheetStop,
  geometry: MapSheetGeometry,
): MapSheetStop {
  if (current !== 'compact') return 'compact';
  if (geometry.stops.includes('semi')) return 'semi';
  return geometry.stops[geometry.stops.length - 1] ?? 'compact';
}

// ─── Bouton GO à DEUX ÉTATS (planche E02) ────────────────────────────────────

export interface GoButtonPlacementInput {
  /** Bas du bouton en PILL (px depuis le bas de l'écran) — sheet compacte/absente. */
  pillBottom: number;
  /** Distance bas d'écran → HAUT de la sheet, à son palier COURANT. */
  sheetTop: number;
  /** La sheet est-elle déployée (au-delà du compact) ? */
  expanded: boolean;
  /** Diamètre du bouton rond (= hauteur de la pill). */
  size: number;
  /** Hauteur de l'écran. */
  screenH: number;
  /**
   * Bande HAUTE réservée (safe area + header + rangée du commutateur Run/Bike) :
   * le rond ne monte jamais dedans, sinon il recouvrirait l'avatar et le
   * commutateur au palier 90 %.
   */
  topClearance: number;
}

/**
 * Bas du bouton GO (px depuis le bas de l'écran). Deux états, planche E02 :
 *   • sheet compacte/absente → PILL au-dessus de la barre d'onglets ;
 *   • sheet déployée        → ROND CENTRÉ sur le bord haut de la sheet (il le
 *     chevauche), donc « ancré à droite du bloc mission » : le pouce retrouve
 *     toujours le rond à droite, et il ne recouvre jamais le contenu de la sheet.
 * Deux bornes : il ne redescend jamais sous sa position de pill, et il ne monte
 * jamais dans la bande du header.
 */
export function goButtonBottom(input: GoButtonPlacementInput): number {
  if (!input.expanded) return input.pillBottom;
  const ceiling = Math.max(input.pillBottom, input.screenH - input.topClearance - input.size);
  return clamp(input.sheetTop - input.size / 2, input.pillBottom, ceiling);
}
