/**
 * GRYD — geocoding France (gratuit, Nominatim OSM) pour choisir un DÉPART
 * n'importe où : ville, village, adresse. Partagé natif + web. Sans clé.
 */
import type { LatLngPoint } from '../map/realAnchors';

export interface OriginPoint {
  point: LatLngPoint;
  /** Étiquette courte affichée (« Chamonix », « Ma position »…). */
  label: string;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Nom court d'un résultat (ville/village plutôt que l'adresse entière). */
function shortLabel(hit: { address?: Record<string, string>; display_name?: string }): string {
  const a = hit.address ?? {};
  const place =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.hamlet ||
    a.suburb ||
    hit.display_name?.split(',')[0];
  return place ?? 'Lieu';
}

/**
 * Cherche un lieu en France → point + nom court. `null` si rien / échec réseau.
 * Limité à la France (villes ET campagne).
 */
export async function geocodeFrance(query: string): Promise<OriginPoint | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url =
      `${NOMINATIM}?q=${encodeURIComponent(q)}` +
      `&format=json&countrycodes=fr&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const arr = (await res.json()) as {
      lat: string;
      lon: string;
      address?: Record<string, string>;
      display_name?: string;
    }[];
    const hit = arr?.[0];
    if (!hit) return null;
    return { point: { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }, label: shortLabel(hit) };
  } catch {
    return null;
  }
}
