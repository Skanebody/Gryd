/**
 * GRYD — CADRAGE DE LA CARTE PARTAGÉE (planche E10 : « la carte est recalculée
 * par ratio, le territoire n'est JAMAIS coupé »).
 *
 * ─── LE BUG QUE CE FICHIER FERME ────────────────────────────────────────────
 * Le cadrage vivait dans `ShareMap.tsx` (fonction `fit`) et souffrait de deux
 * défauts que rien ne testait :
 *   1. la viewBox était FIGÉE à « 0 0 100 100 » et les dimensions calculées
 *      (`vbW`/`vbH`) étaient jetées : le cadrage était donc identique en 9:16,
 *      4:5 et 1:1. Le territoire n'était effectivement pas coupé — mais par
 *      ACCIDENT (`preserveAspectRatio` vaut « xMidYMid meet » par défaut), au
 *      prix d'un letterboxing qui rapetissait la preuve visuelle ;
 *   2. le dessin était ancré à `PAD` sur les DEUX axes au lieu d'être CENTRÉ :
 *      un tracé large-et-plat collait donc en haut du cadre, avec tout le vide
 *      en bas.
 *
 * Ici, le cadrage est une fonction PURE (zéro import → testable en Deno) : la
 * viewBox suit l'aspect RÉEL du slot, l'échelle est le `min` des deux axes
 * (donc « meet » : rien ne sort jamais du cadre) et le dessin est centré. Les
 * tests vérifient l'invariant de la planche pour les quatre formats.
 *
 * Les mètres-par-degré sont des PARAMÈTRES, pas des constantes locales : ce
 * module ne doit pas dupliquer les valeurs de `features/map/realAnchors.ts`
 * (source unique), et il reste ainsi sans import.
 */

/** Point projeté dans la viewBox SVG. */
export interface FramePoint {
  readonly x: number;
  readonly y: number;
}

/** Anneau/polyligne en coordonnées [lng, lat] — la forme que dessine ShareMap. */
export type FrameRing = readonly (readonly [number, number])[];

/** Cadre prêt à dessiner : dimensions de viewBox + projection. */
export interface MapFrame {
  readonly vbW: number;
  readonly vbH: number;
  readonly project: (lng: number, lat: number) => FramePoint;
}

/** Côté COURT de la viewBox (le long s'en déduit par l'aspect). */
export const FRAME_SHORT_SIDE = 100;

/** Marge intérieure, en unités de viewBox — la trace ne touche jamais le bord. */
export const FRAME_PAD = 12;

/**
 * Bornes d'aspect acceptées. Au-delà, le slot mesuré est aberrant (mesure de
 * premier rendu, hauteur nulle) : on retombe sur le carré plutôt que de
 * produire une viewBox dégénérée.
 */
export const FRAME_MIN_ASPECT = 1 / 3;
export const FRAME_MAX_ASPECT = 3;

/**
 * Étendue minimale prise en compte, en mètres. Une trace réduite à un point
 * (ou deux points confondus) aurait une étendue nulle → échelle infinie → NaN.
 * Un mètre plancher donne un point centré, ce qui est la bonne lecture.
 */
export const FRAME_MIN_SPAN_M = 1;

/** Aspect utilisable : borné, et carré par défaut si la mesure n'a aucun sens. */
export function normalizeAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return Math.min(FRAME_MAX_ASPECT, Math.max(FRAME_MIN_ASPECT, aspect));
}

/** Dimensions de viewBox pour un aspect (largeur / hauteur) donné. */
export function viewBoxFor(aspect: number): { vbW: number; vbH: number } {
  const a = normalizeAspect(aspect);
  return a >= 1
    ? { vbW: FRAME_SHORT_SIDE * a, vbH: FRAME_SHORT_SIDE }
    : { vbW: FRAME_SHORT_SIDE, vbH: FRAME_SHORT_SIDE / a };
}

/**
 * Cadre pour un ensemble d'anneaux, dans un slot d'aspect `aspect`.
 *
 * INVARIANT TESTÉ (planche E10) : tout point d'entrée se projette DANS le cadre,
 * marge comprise — quel que soit le ratio. Le facteur d'échelle est le minimum
 * des deux axes : agrandir davantage sortirait du cadre, c'est-à-dire couperait
 * le territoire, ce que la planche interdit explicitement.
 */
export function frameFor(
  rings: readonly FrameRing[],
  aspect: number,
  mPerDegLng: number,
  mPerDegLat: number,
): MapFrame {
  const { vbW, vbH } = viewBoxFor(aspect);

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      const lng = p[0];
      const lat = p[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  // Aucun point : cadre vide, projection au centre (l'appelant n'a de toute
  // façon rien à dessiner — ShareMap rend son état vide bien avant).
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) {
    const c = { x: vbW / 2, y: vbH / 2 };
    return { vbW, vbH, project: () => c };
  }

  const spanX = Math.max(FRAME_MIN_SPAN_M, (maxLng - minLng) * mPerDegLng);
  const spanY = Math.max(FRAME_MIN_SPAN_M, (maxLat - minLat) * mPerDegLat);
  const availW = Math.max(1, vbW - FRAME_PAD * 2);
  const availH = Math.max(1, vbH - FRAME_PAD * 2);
  // « meet » : la plus CONTRAIGNANTE des deux échelles — jamais un recadrage.
  const k = Math.min(availW / spanX, availH / spanY);
  // Projection relative au CENTRE de l'étendue, pas à son coin : le centrage
  // est alors une propriété de la formule et non un décalage à ne pas oublier.
  // Bénéfice secondaire : une étendue nulle (un point unique, deux points
  // confondus) tombe pile au milieu du cadre au lieu de se coller à la marge.
  const cLng = (minLng + maxLng) / 2;
  const cLat = (minLat + maxLat) / 2;

  return {
    vbW,
    vbH,
    project: (lng, lat) => ({
      x: vbW / 2 + (lng - cLng) * mPerDegLng * k,
      y: vbH / 2 - (lat - cLat) * mPerDegLat * k,
    }),
  };
}
