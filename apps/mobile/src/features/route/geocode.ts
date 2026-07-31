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

/**
 * Un FIX brut du capteur, tel que la plateforme le rend (28/07/2026).
 *
 * `accuracyM` existe pour une seule raison : le planificateur fait de ce point
 * le DÉPART de la boucle. À 40 m de précision, le tracé peut commencer une rue
 * plus loin — le taire ferait passer une imprécision de capteur pour une erreur
 * de l'app. `null` quand la plateforme ne dit rien : on ne devine pas une
 * précision, et « précision inconnue » n'est pas « bonne précision ».
 *
 * Le type vit ici (et non dans `origin.ts`) parce que ce module est le seul
 * fichier partagé par les DEUX implémentations de plateforme (`origin.ts` et
 * `origin.web.ts` le réexportent tous les deux) : une définition par plateforme
 * finirait par diverger en silence.
 */
export interface PositionFix {
  point: LatLngPoint;
  /** Précision horizontale en mètres, ou `null` si la plateforme ne la donne pas. */
  accuracyM: number | null;
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
