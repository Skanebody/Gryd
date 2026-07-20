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
}

/** Repli hors-ligne : villes de Saison 0 déclarées dans game-rules (source du seed). */
export const FALLBACK_CITIES: readonly CityChoice[] = Object.values(CITIES)
  .map((c) => ({ cityId: c.id, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

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
          .map((r) => ({ cityId: r.city_id, name: r.name }));
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
