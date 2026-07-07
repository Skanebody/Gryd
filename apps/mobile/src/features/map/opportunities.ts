/**
 * GRYD — miroir mobile du coach « OPPORTUNITÉS PROCHES » (§carte). Metro ne
 * résout pas @klaim/engine → on ré-implémente ICI la MÊME logique PURE que
 * packages/engine/src/opportunities.ts (mêmes seuils @klaim/shared), nourrie des
 * secteurs démo (PARIS_DEMO_SECTOR_VIEWS) + la position ego. Anti pay-to-win :
 * une opportunité se lit dans la SITUATION (rôle + pression + distance), jamais
 * achetée. Informatif : le bandeau oriente, il ne double PAS le CTA (§A.4).
 *
 * ⚠ Miroir logique de engine/opportunities.ts — toute évolution du barème se fait
 * dans game-rules ; ici de simples lectures + la même classification.
 */
import {
  OPPORTUNITY_DEFENSE_PRESSURE_MIN,
  OPPORTUNITY_NEAR_MAX_M,
  roleColor,
} from '@klaim/shared';
import { EGO_REPUBLIQUE } from './realAnchors';
import { PARIS_DEMO_SECTOR_VIEWS } from './sectorsDemo';

export type OpportunityKind = 'capture' | 'rival' | 'defense';

export interface NearbyOpportunity {
  kind: OpportunityKind;
  sectorId: string;
  name: string;
  distanceM: number;
  role: 'mine' | 'rival' | 'neutral';
}

const EARTH_M = 6_371_000;
/** Distance haversine en mètres — même formule que engine/validation.ts. */
function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Genre d'opportunité d'un secteur, ou null. MIROIR de engine/classify. */
function classify(v: {
  ownerRole: 'mine' | 'ally' | 'rival' | 'neutral';
  pressure: number;
  contested: boolean;
}): Pick<NearbyOpportunity, 'kind' | 'role'> | null {
  if (v.ownerRole === 'neutral') return { kind: 'capture', role: 'neutral' };
  if (v.ownerRole === 'rival' && v.contested) return { kind: 'rival', role: 'rival' };
  if (
    (v.ownerRole === 'mine' || v.ownerRole === 'ally') &&
    v.pressure >= OPPORTUNITY_DEFENSE_PRESSURE_MIN
  ) {
    return { kind: 'defense', role: 'mine' };
  }
  return null;
}

/** Opportunités proches de l'ego démo (secteurs Paris), triées par distance, top 3. */
export function mapOpportunities(): NearbyOpportunity[] {
  const out: NearbyOpportunity[] = [];
  for (const v of PARIS_DEMO_SECTOR_VIEWS) {
    const c = classify(v);
    if (c === null) continue;
    const distanceM = Math.round(haversineM(EGO_REPUBLIQUE, v.center));
    if (distanceM > OPPORTUNITY_NEAR_MAX_M) continue;
    out.push({ kind: c.kind, sectorId: v.id, name: v.name, distanceM, role: c.role });
  }
  out.sort((a, b) => a.distanceM - b.distanceM);
  return out.slice(0, 3);
}

/** Distance courte lisible : « 300 m » / « 1,1 km » (§A9, jamais tronqué). */
export function formatOppDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Libellé court d'une opportunité (verbe de situation, jamais « GO »). */
export function opportunityLabel(o: NearbyOpportunity): string {
  const d = formatOppDistance(o.distanceM);
  switch (o.kind) {
    case 'capture':
      return `${o.name} à capturer · ${d}`;
    case 'rival':
      return `Frontière ${o.name} faible · ${d}`;
    case 'defense':
      return `${o.name} à défendre · ${d}`;
  }
}

/** Couleur de RÔLE de l'opportunité (chartreuse=moi, orange=rival, gris=neutre). */
export function opportunityColor(o: NearbyOpportunity): string {
  return roleColor(o.role);
}
