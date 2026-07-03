/**
 * GRYD Admin — carte SVG minimaliste (projection équirectangulaire locale).
 * Rendu pur (utilisable en Server ou Client Component) : hexes H3 en polygones
 * + trace en polylines. Couleurs = tokens carte (ADDENDUM §D).
 */
import styles from './TraceMap.module.css';

export type MapHexKind = 'mine' | 'stolen' | 'blocked' | 'frozen' | 'outline';

export interface MapHex {
  id: string;
  /** Frontière H3 : liste de [lat, lng] (cellToBoundary). */
  boundary: [number, number][];
  kind: MapHexKind;
  pioneer?: boolean;
}

export interface MapPath {
  id: string;
  points: { lat: number; lng: number }[];
  kind: 'kept' | 'excluded' | 'raw';
}

const VIEW_W = 860;
const VIEW_H = 520;
const PAD = 24;

const HEX_CLASS: Record<MapHexKind, string> = {
  mine: styles.hexMine!,
  stolen: styles.hexStolen!,
  blocked: styles.hexBlocked!,
  frozen: styles.hexFrozen!,
  outline: styles.hexOutline!,
};

const PATH_CLASS: Record<MapPath['kind'], string> = {
  kept: styles.pathKept!,
  excluded: styles.pathExcluded!,
  raw: styles.pathRaw!,
};

export function TraceMap({
  hexes,
  paths,
  title,
  compact = false,
}: {
  hexes: MapHex[];
  paths: MapPath[];
  title: string;
  compact?: boolean;
}) {
  // Bounding box de tout ce qui se dessine.
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  const eat = (lat: number, lng: number) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };
  for (const h of hexes) for (const [lat, lng] of h.boundary) eat(lat, lng);
  for (const p of paths) for (const pt of p.points) eat(pt.lat, pt.lng);

  const height = compact ? 320 : VIEW_H;
  if (!Number.isFinite(minLat)) {
    return (
      <div className={styles.empty} style={{ height }}>
        Aucune donnée à cartographier.
      </div>
    );
  }

  // Projection équirectangulaire locale : x ∝ lng·cos(lat₀), y ∝ −lat.
  const lat0 = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const kx = Math.cos(lat0);
  const spanX = Math.max(1e-9, (maxLng - minLng) * kx);
  const spanY = Math.max(1e-9, maxLat - minLat);
  const scale = Math.min((VIEW_W - PAD * 2) / spanX, (height - PAD * 2) / spanY);
  const offX = (VIEW_W - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const px = (lat: number, lng: number): string => {
    const x = offX + (lng - minLng) * kx * scale;
    const y = offY + (maxLat - lat) * scale;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <svg
      className={styles.map}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      role="img"
      aria-label={title}
    >
      <defs>
        {/* Hachures 45° pour les hexes bloqués (ADDENDUM §D : motif, pas de teinte). */}
        <pattern id="gryd-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(250,250,247,0.18)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width={VIEW_W} height={height} className={styles.bg} />
      {hexes.map((h) => (
        <polygon
          key={h.id}
          points={h.boundary.map(([lat, lng]) => px(lat, lng)).join(' ')}
          className={h.pioneer ? `${HEX_CLASS[h.kind]} ${styles.hexPioneer}` : HEX_CLASS[h.kind]}
        />
      ))}
      {paths.map((p) => (
        <polyline
          key={p.id}
          points={p.points.map((pt) => px(pt.lat, pt.lng)).join(' ')}
          className={PATH_CLASS[p.kind]}
        />
      ))}
    </svg>
  );
}
