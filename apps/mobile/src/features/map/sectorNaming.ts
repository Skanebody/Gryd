/**
 * GRYD — résolution du NOM d'un secteur, câblée : reverse-geocode (Nominatim OSM,
 * gratuit, sans clé) → hiérarchie de repli PURE (@klaim/shared) → CACHE (un secteur
 * ne change pas de nom). Marche PARTOUT en Europe : dense → quartier, rural →
 * village/commune, sinon étiquette de grille neutre (jamais un faux lieu).
 *
 * Au MVP les secteurs sont dérivés côté client ; en V1 le pré-calcul serveur (§C)
 * appellera la MÊME hiérarchie pure. Ici on ne fait que nommer + cacher.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickSectorName, gridFallbackLabel, type SectorAddress } from '@klaim/shared';
import type { LatLngPoint } from './realAnchors';

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_PREFIX = 'gryd.sectorName.';

/** Cache mémoire (par session) — évite un aller-retour réseau/disque répété. */
const mem = new Map<string, string>();

/**
 * Nom d'un secteur pour un centre donné, caché par `cacheKey` (l'id de secteur,
 * H3 res 7). Ne cache JAMAIS le repli de grille (réseau HS / zone sans nom) → un
 * secteur mal nommé au premier essai sera renommé quand le réseau revient. Ne
 * lance JAMAIS : renvoie au pire l'étiquette de grille neutre.
 */
export async function resolveSectorName(
  center: LatLngPoint,
  cacheKey: string,
  /** Repli si aucun nom OSM (réseau HS / zone anonyme). Défaut : étiquette de
   *  grille neutre. Un appelant peut passer un repli plus chaleureux (« Ma
   *  position ») quand le contexte n'est pas la carte — jamais un FAUX lieu. */
  fallbackLabel?: string,
): Promise<string> {
  const fallback = fallbackLabel ?? gridFallbackLabel(center.lat, center.lng);

  const cachedMem = mem.get(cacheKey);
  if (cachedMem) return cachedMem;

  try {
    const stored = await AsyncStorage.getItem(CACHE_PREFIX + cacheKey);
    if (stored) {
      mem.set(cacheKey, stored);
      return stored;
    }
  } catch {
    // Stockage indisponible (web privé…) : on continue sans cache disque.
  }

  try {
    const url =
      `${NOMINATIM_REVERSE}?lat=${center.lat}&lon=${center.lng}` +
      `&format=json&zoom=16&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = (await res.json()) as { address?: SectorAddress };
    const real = pickSectorName(json.address);
    if (real) {
      mem.set(cacheKey, real);
      try {
        await AsyncStorage.setItem(CACHE_PREFIX + cacheKey, real);
      } catch {
        // best effort
      }
      return real;
    }
  } catch {
    // Réseau HS → repli de grille (NON caché : on réessaiera).
  }
  return fallback;
}
