/**
 * GRYD — LA GÉOMÉTRIE DES GRAPHIQUES, ISOLÉE POUR ÊTRE TESTÉE.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * Un graphique est le seul endroit d'une app où un mensonge peut passer pour
 * une mesure : une échelle qui ne part pas de zéro double une progression, un
 * axe inversé sans étiquette transforme un ralentissement en record, une valeur
 * absente interpolée invente un kilomètre. On isole donc la PROJECTION (pure,
 * sans React ni SVG) de son rendu, exactement comme `share/mapFrame.ts` l'a
 * fait pour la carte de partage — et pour la même raison : ce qui n'est pas
 * testé finit par flatter.
 *
 * ═══ LES RÈGLES QUE CE MODULE TIENT ═════════════════════════════════════════
 *  · Aucune valeur n'est inventée entre deux points : la projection est
 *    affine, l'appelant fournit les points qu'il a MESURÉS.
 *  · Une série vide ou constante ne produit pas une échelle dégénérée : elle
 *    est centrée, jamais étirée à toute la hauteur (une sortie plate ne doit
 *    pas ressembler à des montagnes russes).
 *  · Un axe INVERSÉ (l'allure : plus bas = plus rapide) est un PARAMÈTRE
 *    explicite, pour que l'écran soit obligé d'étiqueter son sens.
 *  · Une barre de valeur nulle garde une hauteur MINIMALE visible : un jour
 *    sans sortie reste un jour, il ne disparaît pas de l'axe.
 *
 * PUR : zéro import. Testable sous Deno.
 */

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
}

/** Marges intérieures du cadre, en unités de rendu. */
export interface ChartPadding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ChartFrame {
  readonly width: number;
  readonly height: number;
  readonly padding: ChartPadding;
}

export interface ChartDomain {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export const NO_PADDING: ChartPadding = { top: 0, right: 0, bottom: 0, left: 0 };

/** Hauteur minimale d'une barre, en unités de rendu (un zéro reste visible). */
export const MIN_BAR_HEIGHT = 2;

/**
 * Étendue d'une série. `marginRatio` élargit l'étendue VERTICALE d'une fraction
 * de sa hauteur, pour que la courbe ne colle ni au plafond ni au plancher —
 * c'est une respiration graphique, pas un recadrage : les deux bords bougent de
 * la même quantité, donc aucune pente n'est exagérée.
 *
 * `null` quand il n'y a rien à cadrer.
 */
export function domainOf(
  points: readonly ChartPoint[],
  marginRatio = 0.1,
): ChartDomain | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  const spanY = maxY - minY;
  // Série constante : on ne l'étire pas, on la centre sur une bande d'une unité.
  // Sans ce garde-fou, une allure parfaitement régulière produirait une échelle
  // de hauteur nulle, donc une division par zéro, donc n'importe quel dessin.
  const margin = spanY > 0 ? spanY * marginRatio : 0.5;
  return { minX, maxX, minY: minY - margin, maxY: maxY + margin };
}

/**
 * Projette une série dans le cadre. `invertY = true` place les PETITES valeurs
 * en HAUT — la convention de l'allure (plus rapide = plus haut). L'écran qui
 * l'active doit étiqueter ses deux bornes, sinon la courbe se lit à l'envers.
 */
export function projectChart(
  points: readonly ChartPoint[],
  domain: ChartDomain,
  frame: ChartFrame,
  invertY = false,
): ChartPoint[] {
  const innerW = Math.max(1, frame.width - frame.padding.left - frame.padding.right);
  const innerH = Math.max(1, frame.height - frame.padding.top - frame.padding.bottom);
  const spanX = domain.maxX - domain.minX;
  const spanY = domain.maxY - domain.minY;
  return points.map((point) => {
    const rx = spanX > 0 ? (point.x - domain.minX) / spanX : 0.5;
    const ry = spanY > 0 ? (point.y - domain.minY) / spanY : 0.5;
    // L'axe des ordonnées de l'écran descend : une valeur HAUTE se dessine donc
    // en haut (1 - ry) par défaut, et l'inversion la renvoie en bas.
    const up = invertY ? ry : 1 - ry;
    return {
      x: frame.padding.left + rx * innerW,
      y: frame.padding.top + up * innerH,
    };
  });
}

/** Points d'une `Polyline` SVG : « x,y x,y … ». Chaîne vide si rien à tracer. */
export function polylinePoints(points: readonly ChartPoint[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/**
 * Aire sous la courbe, refermée sur la base du cadre. Décorative et JAMAIS
 * porteuse d'une mesure supplémentaire : c'est la même série, remplie.
 */
export function areaPath(points: readonly ChartPoint[], frame: ChartFrame): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2) return '';
  const base = frame.height - frame.padding.bottom;
  const body = points.map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return `M${first.x.toFixed(1)} ${base.toFixed(1)} ${body} L${last.x.toFixed(1)} ${base.toFixed(1)} Z`;
}

export interface BarLayout {
  readonly index: number;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Barres à base ZÉRO, largeur égale. L'échelle part toujours de zéro : c'est ce
 * qui rend deux semaines comparables d'un coup d'œil, et une base flottante est
 * la façon la plus courante de faire mentir un histogramme.
 *
 * `maxValue` peut être imposé (pour comparer deux graphiques entre eux) ; sinon
 * c'est le maximum de la série.
 */
export function barsLayout(
  values: readonly number[],
  frame: ChartFrame,
  gap: number,
  maxValue?: number,
): BarLayout[] {
  if (values.length === 0) return [];
  const innerW = Math.max(1, frame.width - frame.padding.left - frame.padding.right);
  const innerH = Math.max(1, frame.height - frame.padding.top - frame.padding.bottom);
  const width = Math.max(1, (innerW - gap * (values.length - 1)) / values.length);
  const top = Math.max(...values.map((v) => (Number.isFinite(v) ? v : 0)), maxValue ?? 0);
  const scale = top > 0 ? innerH / top : 0;
  const base = frame.padding.top + innerH;
  return values.map((raw, index) => {
    const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
    const height = value > 0 ? Math.max(MIN_BAR_HEIGHT, value * scale) : MIN_BAR_HEIGHT;
    return {
      index,
      value,
      x: frame.padding.left + index * (width + gap),
      y: base - height,
      width,
      height,
    };
  });
}
