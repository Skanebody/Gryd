/**
 * GRYD — projection PURE d'un ensemble de tracés lat/lng RÉELS dans une viewBox
 * SVG (aspect conservé, nord en haut). Source unique pour tout rendu de vrai
 * tracé hors carte MapLibre : onboarding (terrain de jeu, capture, hook) et
 * partage réutilisent CE projecteur — plus AUCUN blob/ellipse décoratif.
 *
 * On projette en mètres locaux (REAL_M_PER_DEG_*) puis on cadre l'union des
 * tracés dans (w × h) avec un padding : chaque tracé garde sa forme réelle ET sa
 * position RELATIVE aux autres (République au centre-sud, Faubourg à l'est,
 * Villemin au nord se lisent au bon endroit). Aucune règle de jeu — pur rendu.
 */
import {
  REAL_M_PER_DEG_LAT,
  REAL_M_PER_DEG_LNG,
  type LatLngPoint,
} from './realAnchors';

export interface TraceProjection {
  /** lat/lng réel → point SVG dans la viewBox cadrée. */
  project: (p: LatLngPoint) => { x: number; y: number };
  /** Polyligne SVG `x,y x,y …` d'un tracé (ouvert). */
  points: (trace: readonly LatLngPoint[]) => string;
  /** Path SVG d'un tracé (M…L…), fermé si `close`. */
  path: (trace: readonly LatLngPoint[], close?: boolean) => string;
}

/**
 * Cadre l'union de `traces` dans (w × h) moins `pad`, aspect conservé et centré.
 * Robuste au tracé vide/dégénéré (renvoie un projecteur qui mappe tout au centre
 * plutôt que de diviser par zéro).
 */
export function fitTracesToBox(
  traces: readonly (readonly LatLngPoint[])[],
  w: number,
  h: number,
  pad = 12,
): TraceProjection {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const trace of traces) {
    for (const p of trace) {
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
  }
  const spanX = Math.max(1, (maxLng - minLng) * REAL_M_PER_DEG_LNG);
  const spanY = Math.max(1, (maxLat - minLat) * REAL_M_PER_DEG_LAT);
  const innerW = Math.max(1, w - pad * 2);
  const innerH = Math.max(1, h - pad * 2);
  const k = Math.min(innerW / spanX, innerH / spanY);
  // Centrage : marge restante répartie de chaque côté après mise à l'échelle.
  const drawnW = spanX * k;
  const drawnH = spanY * k;
  const offX = pad + (innerW - drawnW) / 2;
  const offY = pad + (innerH - drawnH) / 2;
  const finite = Number.isFinite(minLng) && Number.isFinite(minLat);

  const project = (p: LatLngPoint): { x: number; y: number } => {
    if (!finite) return { x: w / 2, y: h / 2 };
    return {
      x: offX + (p.lng - minLng) * REAL_M_PER_DEG_LNG * k,
      // y inversé : le nord (lat max) est en haut de la viewBox.
      y: offY + (maxLat - p.lat) * REAL_M_PER_DEG_LAT * k,
    };
  };

  const points = (trace: readonly LatLngPoint[]): string =>
    trace
      .map((p) => {
        const { x, y } = project(p);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const path = (trace: readonly LatLngPoint[], close = false): string => {
    let d = '';
    trace.forEach((p, i) => {
      const { x, y } = project(p);
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return close ? `${d} Z` : d;
  };

  return { project, points, path };
}

/**
 * Longueur approx (en unités viewBox) d'un tracé projeté — pour dimensionner un
 * `strokeDasharray` de dessin progressif quand on préfère le dash à la
 * sous-polyligne. Déterministe.
 */
export function projectedLength(
  trace: readonly LatLngPoint[],
  project: (p: LatLngPoint) => { x: number; y: number },
): number {
  let len = 0;
  for (let i = 1; i < trace.length; i += 1) {
    const a = trace[i - 1];
    const b = trace[i];
    if (!a || !b) continue;
    const pa = project(a);
    const pb = project(b);
    len += Math.hypot(pb.x - pa.x, pb.y - pa.y);
  }
  return len;
}

/**
 * Sous-tracé « dessiné jusqu'à p∈[0,1] » — même logique que la trace qui se
 * dessine dans ShareMap (sous-polyligne fiable natif ET react-native-web,
 * contrairement à strokeDashoffset). Renvoie au moins 2 points.
 *
 * Seul consommateur aujourd'hui : `onboarding/visuals` (TerrainVisual et
 * LogoRouteMark). `CaptureFillVisual`, cité ici jusqu'au 21/07/2026, a été
 * SUPPRIMÉ avec le mode vitrine — le nommer laissait croire à une surface qui
 * n'existe plus.
 */
export function tracePrefix(
  trace: readonly LatLngPoint[],
  p: number,
): readonly LatLngPoint[] {
  if (trace.length <= 2) return trace;
  const clamped = Math.max(0, Math.min(1, p));
  const count = Math.max(2, Math.ceil(clamped * trace.length));
  return trace.slice(0, count);
}
