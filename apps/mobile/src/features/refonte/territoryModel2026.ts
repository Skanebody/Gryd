import type { Feature, Polygon, MultiPolygon } from 'geojson';
import type { Activity } from '@klaim/shared';
export type TerritoryRole2026 = 'mine' | 'crew' | 'others';
export interface TerritoryOwner2026 { key: string; kind: 'individual'; label: string | null; crew: { key: string; name: string } | null; identityAvailable: boolean }
export type OwnedFeature = Feature<Polygon | MultiPolygon, {
  id: string; ownerId: string | null; role: TerritoryRole2026; activity: Activity; areaM2: number;
  capturedAreaM2: number; controlledSince: string; ruleset: string; owner: TerritoryOwner2026;
}>;
export interface OwnershipSnapshot2026 { features: OwnedFeature[]; crew: { id: string; name: string } | null; asOf: string }
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function validGeometry(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  const polygon = (rings: unknown): boolean => Array.isArray(rings) && rings.length > 0 && rings.every(ring => {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    if (!ring.every(point => Array.isArray(point) && point.length >= 2 &&
      typeof point[0] === 'number' && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180 &&
      typeof point[1] === 'number' && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90)) return false;
    return ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
  });
  return geometry.type === 'Polygon' ? polygon(geometry.coordinates) : geometry.type === 'MultiPolygon' &&
    Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(polygon);
}
export function parseOwnership2026(data: unknown, activity: Activity, ownerId: string): OwnershipSnapshot2026 | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as Record<string, unknown>;
  if (body.type !== 'FeatureCollection' || !['ownership.2026.2', 'ownership.2026.3'].includes(String(body.contract)) || body.activity !== activity || !Array.isArray(body.features) || typeof body.asOf !== 'string' || !Number.isFinite(Date.parse(body.asOf))) return null;
  const features: OwnedFeature[] = [];
  for (const raw of body.features) {
    const f = raw as OwnedFeature; const p = f?.properties;
    if (f?.type !== 'Feature' || !validGeometry(f.geometry) || !p ||
      !['mine','crew','others'].includes(p.role) || p.ruleset !== '2026.1' || p.activity !== activity || typeof p.id !== 'string' ||
      !finite(p.areaM2) || !finite(p.capturedAreaM2) || typeof p.controlledSince !== 'string' || !Number.isFinite(Date.parse(p.controlledSince)) ||
      (p.role === 'mine' ? p.ownerId !== ownerId : p.ownerId !== null)) return null;
    let owner: TerritoryOwner2026;
    if (body.contract === 'ownership.2026.3') {
      const identity = p.owner;
      if (!identity || identity.kind !== 'individual' || typeof identity.key !== 'string' || !/^[a-f0-9]{32}$/.test(identity.key) ||
        !(identity.label === null || (typeof identity.label === 'string' && identity.label.length > 0 && identity.label.length <= 40)) ||
        !(identity.crew === null || (typeof identity.crew?.key === 'string' && /^[a-f0-9]{32}$/.test(identity.crew.key) && typeof identity.crew.name === 'string' && identity.crew.name.length > 0 && identity.crew.name.length <= 40))) return null;
      owner = { key: identity.key, kind: 'individual', label: identity.label, crew: identity.crew, identityAvailable: true };
    } else {
      // Older servers do not identify foreign owners. A face is NOT an identity.
      owner = { key: p.role === 'mine' ? `self:${ownerId}` : `face:${p.id}`, kind: 'individual', label: null, crew: null, identityAvailable: false };
    }
    features.push({ ...f, properties: { ...p, owner } });
  }
  const crew = body.crew as OwnershipSnapshot2026['crew'];
  if (crew !== null && (!crew || typeof crew.id !== 'string' || typeof crew.name !== 'string')) return null;
  if (!crew && features.some(f => f.properties.role === 'crew')) return null;
  return { features, crew, asOf: body.asOf };
}
export function territoryRoleLabel2026(role: TerritoryRole2026, fr: boolean) {
  return role === 'mine' ? (fr ? 'Mon terrain' : 'My terrain') : role === 'crew' ? (fr ? 'Membres de mon crew' : 'My crew members') : (fr ? 'Autres' : 'Others');
}

export function territoryOwnerLabel2026(feature: OwnedFeature, fr: boolean): string {
  const { owner, role, id } = feature.properties;
  if (role === 'mine') return fr ? 'Toi' : 'You';
  if (owner.label) return owner.label;
  return `${owner.identityAvailable ? (fr ? 'Joueur' : 'Player') : (fr ? 'Terrain' : 'Terrain')} · ${(owner.identityAvailable ? owner.key : id).slice(0, 6).toUpperCase()}`;
}
