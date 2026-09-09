import Svg, { Polyline } from 'react-native-svg';
import { refonteColors as c } from '@klaim/shared';
import { REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';
import { frameFor } from './mapFrame';
export function PosterTrace({ segments, width, height, light }: {
  segments: readonly (readonly LatLngPoint[])[]; width: number; height: number; light: boolean;
}) {
  const rings = segments.filter((segment) => segment.length >= 2)
    .map((segment) => segment.map((point) => [point.lng, point.lat] as const));
  const all = rings.flat();
  const latitude = all.length ? all.reduce((sum, point) => sum + point[1], 0) / all.length : 0;
  const frame = frameFor(rings, width / height,
    REAL_M_PER_DEG_LAT * Math.max(0.01, Math.cos(latitude * Math.PI / 180)), REAL_M_PER_DEG_LAT);
  const paths = rings.map((ring) => ring.map(([lng, lat]) => {
    const point = frame.project(lng, lat);
    return `${point.x},${point.y}`;
  }).join(' '));
  return <Svg width={width} height={height} viewBox={`0 0 ${frame.vbW} ${frame.vbH}`}>
    {paths.map((points, i) => <Polyline key={`casing-${i}`} points={points} fill="none" stroke={light ? c.surface : c.carbon}
      strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />)}
    {paths.map((points, i) => <Polyline key={`core-${i}`} points={points} fill="none" stroke={light ? c.ink : c.accent}
      strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />)}
  </Svg>;
}

