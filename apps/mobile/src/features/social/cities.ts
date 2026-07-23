/**
 * GRYD — VILLES RÉELLES pour le profil (demande fondateur : « pour la ville il
 * faut absolument que la ville existe donc un pré-remplissage »).
 *
 * Source d'autorité : `public.city_zones` — la MÊME table que la création de
 * crew (`listCities` dans features/crew/real.ts) et la même que celle dont les
 * contours servent au test in/out zone du gameplay (0033). Choisir sa ville dans
 * cette liste garantit deux choses : la ville EXISTE, et elle correspond à une
 * zone jouable. La saisie libre est supprimée — elle produisait des « Pariss »
 * et des villes hors périmètre de jeu.
 *
 * REPLI SANS BACKEND (vitrine web, mode dev O1) : `CITIES` de @klaim/shared. Ce
 * n'est PAS une donnée inventée — c'est la source dont le seed 0004 dérive
 * city_zones (les lignes du seed portent le commentaire `-- game-rules:
 * CITIES.paris`). Les deux listes disent donc la même chose ; on ne fabrique
 * aucune ville européenne qu'aucun joueur ne peuple (CLAUDE.md).
 */
import { useEffect, useState } from 'react';
import { CITIES } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

/** Ville sélectionnable (id technique + nom affichable réel). */
export interface CityChoice {
  cityId: string;
  name: string;
  /**
   * Centre publié de la ville — `undefined` quand on ne le connaît pas.
   *
   * ⚠️ IL VIENT DE `game-rules.CITIES`, PAS DU SERVEUR : `city_zones` porte le
   * contour (geojson, 0033) mais AUCUNE colonne de centre. On ne calcule pas de
   * centroïde ici (celui d'un polygone concave peut tomber hors zone) et on
   * n'invente rien : une ville servie par le serveur que game-rules ne connaît
   * pas encore arrive donc SANS centre, et c'est traité comme tel partout —
   * elle reste choisissable à la main, elle n'est simplement ni reconnue par le
   * raccourci « Utiliser ma position » ni utilisable pour cadrer la carte.
   */
  center?: { lat: number; lng: number };
}

/** Repli hors-ligne : villes de Saison 0 déclarées dans game-rules (source du seed). */
export const FALLBACK_CITIES: readonly CityChoice[] = Object.values(CITIES)
  .map((c) => ({ cityId: c.id, name: c.name, center: { lat: c.center.lat, lng: c.center.lng } }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Centre connu d'une ville, ou `undefined`. Source unique : `game-rules.CITIES`
 * — celle dont le seed 0004 dérive `city_zones` (les lignes du seed portent le
 * commentaire `-- game-rules: CITIES.paris`). Utilisée pour cadrer la carte
 * d'arrivée sur la ville CHOISIE : un cadrage, rien d'autre — aucune zone,
 * aucun propriétaire, aucun classement n'en découle.
 */
export function cityCenter(cityId: string | null): { lat: number; lng: number } | undefined {
  if (!cityId) return undefined;
  const known = (CITIES as Record<string, { center: { lat: number; lng: number } } | undefined>)[
    cityId
  ];
  return known ? { lat: known.center.lat, lng: known.center.lng } : undefined;
}

/**
 * Liste des villes proposables. Toujours non vide (repli game-rules), toujours
 * réelle. `fromServer` dit d'où elle vient — utile pour ne pas prétendre que la
 * liste est à jour quand elle ne l'est pas.
 */
export function useCityChoices(): { cities: readonly CityChoice[]; fromServer: boolean } {
  const { session, configured } = useSession();
  const [cities, setCities] = useState<readonly CityChoice[]>(FALLBACK_CITIES);
  const [fromServer, setFromServer] = useState(false);

  useEffect(() => {
    if (!configured || !session || !supabase) return;
    let cancelled = false;
    void (async () => {
      try {
        const client = supabase;
        if (!client) return;
        const { data, error } = await client
          .from('city_zones')
          .select('city_id, name')
          .order('name', { ascending: true });
        if (cancelled || error || !data) return;
        const rows = (data as { city_id: string; name: string }[])
          .filter((r) => typeof r.name === 'string' && r.name.trim().length > 0)
          // Le centre ne vient JAMAIS du serveur (city_zones n'en a pas) : on le
          // rapproche de game-rules quand l'id y est connu, sinon il reste absent.
          .map((r) => ({ cityId: r.city_id, name: r.name, center: cityCenter(r.city_id) }));
        // Une lecture VIDE ne remplace pas le repli : afficher zéro ville
        // rendrait le champ inutilisable pour une panne passagère.
        if (rows.length === 0) return;
        setCities(rows);
        setFromServer(true);
      } catch {
        // Silence assumé : le repli game-rules reste affiché (jamais d'écran vide).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, session]);

  return { cities, fromServer };
}
