/**
 * GRYD — opportunités proches (coach tactique de la carte). PURE : aucune I/O.
 * À partir des secteurs VISIBLES + la position du joueur, dérive les opportunités
 * les plus PROCHES, triées par distance, typées par genre :
 *   - `capture` : zone neutre à prendre ;
 *   - `rival`   : frontière rivale FAIBLE (contestée) à enfoncer ;
 *   - `defense` : zone tenue MENACÉE (pression ≥ seuil) à défendre.
 * Anti pay-to-win : l'opportunité se lit dans la SITUATION (rôle + pression +
 * distance), jamais achetée. Tous les seuils viennent de @klaim/shared/game-rules.
 */
import {
  OPPORTUNITY_DEFENSE_PRESSURE_MIN,
  OPPORTUNITY_NEAR_MAX_M,
} from '@klaim/shared/game-rules';
import { haversineM } from './validation.ts';

export type OpportunityKind = 'capture' | 'rival' | 'defense';

/** Secteur candidat (sous-ensemble d'une SectorView + son centre). */
export interface OpportunityZone {
  sectorId: string;
  /** Nom court (jamais tronqué — §A9). */
  name: string;
  center: { lat: number; lng: number };
  ownerRole: 'mine' | 'ally' | 'rival' | 'neutral';
  /** Pression 0-100 (menace rivale agrégée). */
  pressure: number;
  /** Zone contestée (rival proche de basculer). */
  contested: boolean;
}

export interface NearbyOpportunity {
  kind: OpportunityKind;
  sectorId: string;
  name: string;
  /** Distance ego→centre de zone, en mètres (arrondie). */
  distanceM: number;
  /** Rôle pour la couleur (roleColor) : chartreuse=moi, orange=rival, gris=neutre. */
  role: 'mine' | 'rival' | 'neutral';
}

/** Genre d'opportunité d'un secteur, ou null si aucune. PURE. */
function classify(zone: OpportunityZone): Pick<NearbyOpportunity, 'kind' | 'role'> | null {
  if (zone.ownerRole === 'neutral') return { kind: 'capture', role: 'neutral' };
  if (zone.ownerRole === 'rival' && zone.contested) return { kind: 'rival', role: 'rival' };
  if (
    (zone.ownerRole === 'mine' || zone.ownerRole === 'ally') &&
    zone.pressure >= OPPORTUNITY_DEFENSE_PRESSURE_MIN
  ) {
    return { kind: 'defense', role: 'mine' };
  }
  return null;
}

/**
 * Opportunités PROCHES triées par distance croissante (§coach). PURE. Rayon
 * `maxM` (défaut OPPORTUNITY_NEAR_MAX_M), limitées à `limit` (défaut 3). Une zone
 * sans opportunité (rival stable, zone tenue calme) est ignorée.
 */
export function nearbyOpportunities(
  zones: readonly OpportunityZone[],
  playerPos: { lat: number; lng: number },
  opts: { maxM?: number; limit?: number } = {},
): NearbyOpportunity[] {
  const maxM = opts.maxM ?? OPPORTUNITY_NEAR_MAX_M;
  const limit = opts.limit ?? 3;
  const out: NearbyOpportunity[] = [];
  for (const zone of zones) {
    const c = classify(zone);
    if (c === null) continue;
    const distanceM = Math.round(haversineM(playerPos, zone.center));
    if (distanceM > maxM) continue;
    out.push({ kind: c.kind, sectorId: zone.sectorId, name: zone.name, distanceM, role: c.role });
  }
  out.sort((a, b) => a.distanceM - b.distanceM);
  return out.slice(0, Math.max(0, limit));
}
