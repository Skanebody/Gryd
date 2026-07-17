/**
 * GRYD — nommage d'un SECTEUR (H3 res 7, ~5 km²) PARTOUT en Europe, à partir d'une
 * adresse reverse-geocodée OSM. PURE + déterministe (testable).
 *
 * « République » n'est jamais codé en dur : on prend le centre du secteur, on
 * reverse-geocode (Nominatim), puis on choisit le nom le plus LOCALEMENT reconnu
 * via une hiérarchie de repli. Dense (Paris) → quartier (« République »,
 * « Le Marais ») ; rural (Ouville-la-Rivière) → hameau/village/commune. Rien
 * d'inventé : à défaut de tout nom OSM (ou réseau HS), on retombe sur une étiquette
 * de GRILLE neutre (coordonnées), jamais un faux lieu. Le nom se peuple une fois
 * par secteur (un secteur ne change pas de nom) → l'appelant cache par id.
 */

/** Sous-ensemble PERTINENT de l'objet `address` de Nominatim (tout optionnel). */
export interface SectorAddress {
  neighbourhood?: string;
  quarter?: string;
  city_block?: string;
  residential?: string;
  suburb?: string;
  city_district?: string;
  borough?: string;
  hamlet?: string;
  isolated_dwelling?: string;
  locality?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  road?: string;
  pedestrian?: string;
}

/**
 * Ordre de PRÉFÉRENCE pour nommer un secteur (~5 km²), du plus localement reconnu
 * au plus large : micro-quartier → district → lieu rural → commune → rue. On
 * s'arrête au PREMIER champ renseigné. Une rue ne sert que faute de mieux (un
 * secteur se reconnaît d'abord à son quartier / son village, pas à une rue).
 */
export const SECTOR_NAME_KEYS: readonly (keyof SectorAddress)[] = [
  'neighbourhood',
  'quarter',
  'city_block',
  'residential',
  'suburb',
  'city_district',
  'borough',
  'hamlet',
  'isolated_dwelling',
  'locality',
  'village',
  'town',
  'city',
  'municipality',
  'road',
  'pedestrian',
];

/** Valeur OSM nettoyée (trim), ou null si vide. */
function clean(v: string | undefined): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Le meilleur nom LOCAL trouvé dans l'adresse selon la hiérarchie, ou `null` si
 * l'adresse ne porte AUCUN champ nommant (zone sans nom OSM / réponse vide). PURE.
 * `null` (et pas un repli) permet à l'appelant de NE PAS cacher un repli et de
 * réessayer plus tard.
 */
export function pickSectorName(address: SectorAddress | null | undefined): string | null {
  const a = address ?? {};
  for (const key of SECTOR_NAME_KEYS) {
    const v = clean(a[key]);
    if (v) return v;
  }
  return null;
}

/**
 * Nom d'affichage d'un secteur : le meilleur nom OSM, sinon le `fallback` (une
 * étiquette de grille neutre — jamais un faux lieu). PURE.
 */
export function sectorNameFromAddress(
  address: SectorAddress | null | undefined,
  fallback: string,
): string {
  return pickSectorName(address) ?? fallback;
}

/**
 * Étiquette de GRILLE neutre et déterministe (repli ultime : réseau HS, ou zone
 * réellement sans nom OSM). Jamais un faux lieu — juste des coordonnées arrondies
 * lisibles, ex. « Secteur 49,7N · 1,0E ». Décimale française, hémisphères FR
 * (N/S · E/O). PURE. `res` de décimales par défaut 1 (~11 km, l'échelle secteur).
 */
export function gridFallbackLabel(lat: number, lng: number, decimals = 1): string {
  const axis = (n: number, pos: string, neg: string): string => {
    const v = Number.isFinite(n) ? n : 0;
    const hemi = v >= 0 ? pos : neg;
    return `${Math.abs(v).toFixed(decimals).replace('.', ',')}${hemi}`;
  };
  return `Secteur ${axis(lat, 'N', 'S')} · ${axis(lng, 'E', 'O')}`;
}
