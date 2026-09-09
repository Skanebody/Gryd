import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { refonteColors as c } from '@klaim/shared';
import type { ChallengeSector2026 } from './CrewChallengesModel2026';
import { s, useRefonteCopy } from './ProfilePrimitives';
function rings(geometry: unknown): number[][][] {
  if (!geometry || typeof geometry !== 'object') return [];
  const g = geometry as { type?: string; coordinates?: unknown };
  const validRing = (ring: unknown): ring is number[][] => Array.isArray(ring) && ring.length >= 4 && ring.every(p => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && Number.isFinite(p[0]) && Math.abs(p[0]) <= 180 && typeof p[1] === 'number' && Number.isFinite(p[1]) && Math.abs(p[1]) <= 90);
  if (g.type === 'Polygon' && Array.isArray(g.coordinates)) return g.coordinates.filter(validRing);
  if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) return g.coordinates.flatMap(polygon => Array.isArray(polygon) ? polygon.filter(validRing) : []);
  return [];
}
/** Diagram of the published arena, never a participant route or a navigation map. */
export function CrewArenaPreview2026({ sectors }: { sectors: readonly ChallengeSector2026[] }) {
  const copy = useRefonteCopy(); const shapes = sectors.map(sector => ({ id: sector.id, rings: rings(sector.geometry) }));
  const points = shapes.flatMap(shape => shape.rings.flat());
  if (!points.length) return <Text style={s.meta}>{copy('Schéma de l’arène indisponible.', 'Arena diagram unavailable.')}</Text>;
  const { minX, maxX, minY, maxY } = points.reduce((bounds, point) => ({ minX: Math.min(bounds.minX, point[0]!), maxX: Math.max(bounds.maxX, point[0]!), minY: Math.min(bounds.minY, point[1]!), maxY: Math.max(bounds.maxY, point[1]!) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const latitudeScale = Math.cos((minY + maxY) / 2 * Math.PI / 180);
  const scale = Math.min(260 / Math.max((maxX - minX) * latitudeScale, 0.000001), 128 / Math.max(maxY - minY, 0.000001));
  const width = (maxX - minX) * latitudeScale * scale, height = (maxY - minY) * scale;
  const project = (p: number[]) => `${((p[0]! - minX) * latitudeScale * scale + (280 - width) / 2).toFixed(2)},${(148 - ((p[1]! - minY) * scale + (148 - height) / 2)).toFixed(2)}`;
  return <View style={{ gap: 8, marginVertical: 12 }}><View style={{ backgroundColor: c.darkSurface, borderRadius: 14, padding: 8 }} accessible accessibilityLabel={copy(`Schéma des secteurs : ${sectors.map(sector => sector.title).join(', ')}`, `Sector diagram: ${sectors.map(sector => sector.title).join(', ')}`)}><Svg width="100%" height={148} viewBox="0 0 280 148">{shapes.map((shape, i) => <Path key={shape.id} d={shape.rings.map(ring => `M${ring.map(project).join(' L')} Z`).join(' ')} fill={i === 0 ? c.darkSurfaceMuted : c.darkSurface} fillRule="evenodd" stroke={c.darkInk} strokeWidth={1.2} />)}</Svg></View><Text style={s.meta}>{copy('Schéma des secteurs publiés · sans guidage', 'Published sector diagram · no navigation')}</Text></View>;
}
