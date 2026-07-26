/**
 * GRYD — LISERÉ INTERNE (signature planche -selection8 PORT OUEST) : géométrie PURE,
 * ZÉRO import. Isolé exprès dans son propre module (et non dans allTerritories, qui
 * tire le barrel RN `ui/game`) pour rester testable en Deno sans traîner de JSX.
 * allTerritories/mapStyle le RÉ-EXPORTENT — la carte n'importe rien de neuf.
 *
 * Le 2ᵉ trait fin EN RETRAIT vers l'intérieur du contour = la marque « ce territoire
 * est À MOI » (design-tokens `territoryLisere` / `territoryPaint`). Il est obtenu AU
 * RENDU par un `line-offset` NÉGATIF (px écran, donc CONSTANT par zoom — un inset
 * métrique gelé dans la géométrie exploserait au zoom). Or le SENS d'un line-offset
 * dépend du WINDING de l'anneau, quelconque sur les tracés démo comme sur les hexes
 * fusionnés. On NORMALISE donc l'anneau du liseré en ANTIHORAIRE : l'offset négatif
 * pointe alors TOUJOURS vers l'intérieur (jamais dehors → jamais un halo, §0).
 */

/** Point [lng, lat]. */
export type LngLat = [number, number];

/**
 * Aire signée (shoelace, en degrés² — seul le SIGNE compte) d'un anneau [lng,lat].
 * > 0 = sens ANTIHORAIRE (CCW, winding GeoJSON standard d'un contour extérieur),
 * < 0 = horaire. Robuste à un anneau fermé (dernier point = premier) comme ouvert.
 */
export function ringSignedArea(ring: readonly LngLat[]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const p = ring[i];
    const q = ring[i + 1];
    if (!p || !q) continue;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/**
 * Force un anneau en ANTIHORAIRE (aire signée ≥ 0) — rend le sens du liseré interne
 * (line-offset) DÉTERMINISTE. Copie (n'altère jamais l'entrée) ; conserve la
 * fermeture de l'anneau (inverser [a,b,c,a] donne [a,c,b,a], toujours fermé) et
 * exactement le même ENSEMBLE de points (la forme est intacte).
 */
export function toCcwRing(ring: readonly LngLat[]): LngLat[] {
  return ringSignedArea(ring) < 0 ? [...ring].reverse() : [...ring];
}

// ── Types STRUCTURELS (indépendants de @types/geojson, absent sous Deno) ──────
// Volontairement lâches en ENTRÉE (accepte une GeoJSON.FeatureCollection réelle) et
// précis en SORTIE (assignable à GeoJSON.FeatureCollection côté carte).

/** Feature d'entrée : on ne lit que `geometry` (narrowé au runtime) + `properties`. */
interface AnyFeature {
  readonly geometry: unknown;
  readonly properties?: unknown;
}
/** Feature-ligne du liseré (contour extérieur normalisé CCW), properties reportées. */
export interface LisereLineFeature {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: number[][] };
  properties: Record<string, unknown> | null;
}
export interface LisereCollection {
  type: 'FeatureCollection';
  features: LisereLineFeature[];
}

/** Un anneau valide : ≥ 3 sommets + la fermeture (4 points minimum). */
function isValidRing(ring: unknown): ring is number[][] {
  return Array.isArray(ring) && ring.length >= 4;
}

/**
 * À partir des POLYGONES de territoire d'une collection, produit les LineStrings de
 * leurs anneaux EXTÉRIEURS, chacun normalisé ANTIHORAIRE → la géométrie du LISERÉ
 * INTERNE. On ne prend que le contour extérieur (index 0) : les éventuels TROUS
 * restent sans liseré (les zones des planches n'en ont pas ; un liseré de trou
 * partirait dans le mauvais sens). Les features NON surfaciques (couloirs LineString)
 * sont ignorées. `properties` (state/zoneId) est PRÉSERVÉ → le dimming à la sélection
 * et le tap (contrat C1) traitent le liseré comme sa zone. Pur, testé.
 */
export function territoryLisereLines(data: { readonly features: readonly AnyFeature[] }): LisereCollection {
  const features: LisereLineFeature[] = [];
  const pushRing = (ring: unknown, props: Record<string, unknown> | null): void => {
    if (!isValidRing(ring)) return;
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: toCcwRing(ring as LngLat[]) },
      properties: props,
    });
  };
  for (const f of data.features) {
    const g = f.geometry as { type?: string; coordinates?: unknown } | null;
    const props = (f.properties ?? null) as Record<string, unknown> | null;
    if (!g) continue;
    if (g.type === 'Polygon') {
      pushRing((g.coordinates as unknown[] | undefined)?.[0], props);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of (g.coordinates as unknown[][] | undefined) ?? []) {
        pushRing((poly as unknown[] | undefined)?.[0], props);
      }
    }
  }
  return { type: 'FeatureCollection', features };
}
