/**
 * GRYD — reverse-geocoding (gratuit, Nominatim OSM) : nommer la POSITION ACTUELLE
 * (ville/village) pour l'afficher. Le départ reste TOUJOURS la position réelle —
 * ceci ne sert qu'à l'étiquette. Sans clé, partagé natif + web.
 */
import type { LatLngPoint } from '../map/realAnchors';

export interface OriginPoint {
  point: LatLngPoint;
  /** Étiquette courte affichée (« Chamonix », « Ma position »…). */
  label: string;
}

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

/** Nom court d'un résultat (ville/village plutôt que l'adresse entière). */
function shortLabel(hit: { address?: Record<string, string>; display_name?: string }): string | null {
  const a = hit.address ?? {};
  const place =
    a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || a.county;
  return place ?? hit.display_name?.split(',')[0] ?? null;
}

/** Nom de la ville/du village à une position (reverse). `null` si échec réseau. */
export async function reverseGeocode(point: LatLngPoint): Promise<string | null> {
  try {
    const url =
      `${NOMINATIM_REVERSE}?lat=${point.lat}&lon=${point.lng}` +
      `&format=json&zoom=14&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = (await res.json()) as { address?: Record<string, string>; display_name?: string };
    return shortLabel(json);
  } catch {
    return null;
  }
}
