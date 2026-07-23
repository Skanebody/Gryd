/**
 * GRYD — LA LECTURE. Ce que le SERVEUR dit des villes ouvertes, et rien d'autre.
 *
 * Le référentiel (7 870 villes d'Europe) est EMBARQUÉ : il est toujours là,
 * hors ligne compris, et il ne dépend d'aucune session. Ce qui dépend du serveur
 * — et de lui seul — c'est la liste des villes RÉELLEMENT OUVERTES (`city_zones`,
 * la table que `create_crew` interroge avant d'accepter un crew, 0050:466).
 *
 * ─── QUATRE ÉTATS, JAMAIS TROIS ────────────────────────────────────────────
 * `loading` (on lit) · `signed_out` (on ne PEUT pas savoir) · `failed` (on a
 * essayé, ça n'a pas abouti) · `ready` (on sait). Ils ne disent pas la même
 * chose et l'écran les rend séparément : confondre « échec de lecture » et
 * « aucune ville ouverte » ferait croire que GRYD est fermé alors que c'est le
 * réseau qui manque (AMENDEMENT-47).
 *
 * ⚠️ AUCUN REPLI SUR `CITIES`. `game-rules.CITIES` est la liste de DÉMARRAGE,
 * pas la liste de ce qui est ouvert : s'en servir de repli reviendrait à
 * affirmer « Paris est ouverte » sans l'avoir lu — exactement la fabrication que
 * CLAUDE.md interdit. Sans lecture serveur, ZÉRO ville est déclarée ouverte, et
 * l'écran le dit.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { parsePackedCitiesCached } from '@klaim/shared';
// ⚠️ CHEMIN PROFOND VOLONTAIRE (`/src/`), et non le sous-chemin d'exports
// `@klaim/shared/cities-eu` : Metro laisse `unstable_enablePackageExports` à
// FALSE (metro-config/src/defaults, Expo SDK 52) et le TS du mobile est en
// `moduleResolution: node` — aucun des deux ne lit le champ `exports`. Le
// sous-chemin compile côté web/Deno et CASSE le bundle mobile à l'exécution.
// Ce qui compte reste tenu : la donnée n'est PAS ré-exportée par l'index, donc
// un `import … from '@klaim/shared'` ne tire toujours pas 346 Ko.
import { EU_CITIES_PACKED } from '@klaim/shared/src/cities-eu';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { buildCityIndex, type CityIndex, type OpenCityRow } from './catalog';

/** Les 7 870 villes réelles, parsées UNE fois par exécution (mémoïsation partagée). */
export function euReferential() {
  return parsePackedCitiesCached(EU_CITIES_PACKED);
}

/** État de la connaissance qu'a le client des villes ouvertes. */
export type CityCatalogState = 'loading' | 'signed_out' | 'failed' | 'ready';

/**
 * Borne de la requête `city_zones`.
 *
 * Ce n'est pas une règle de jeu (aucune valeur de score) : c'est la taille de
 * page d'une lecture, et elle existe parce que la version précédente
 * (`listCities`, crew/real.ts) faisait un `select` SANS limite — tenable à 2
 * villes, plus du tout le jour où GRYD en ouvre des centaines. Si le serveur en
 * a davantage, `truncated` le dit ; on ne fait jamais semblant d'avoir tout lu.
 */
export const OPEN_CITY_PAGE_SIZE = 500;

export interface CityCatalog {
  /** Index fusionné (villes ouvertes + référentiel), prêt pour la recherche. */
  readonly index: CityIndex;
  readonly state: CityCatalogState;
  /** Nombre de villes ouvertes RÉELLEMENT lues. `0` n'a de sens que si `state === 'ready'`. */
  readonly openCount: number;
  /** Le serveur en a plus que ce qu'on a lu — la liste affichée n'est pas exhaustive. */
  readonly truncated: boolean;
  /** Relance la lecture (bouton « Réessayer » d'un état `failed`). */
  readonly reload: () => void;
}

export function useCityCatalog(): CityCatalog {
  const { session, configured, loading: sessionLoading } = useSession();
  const [openRows, setOpenRows] = useState<readonly OpenCityRow[]>([]);
  const [state, setState] = useState<CityCatalogState>('loading');
  const [truncated, setTruncated] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    // Session encore en hydratation : « pas connecté » serait faux, « échec »
    // aussi. On lit encore — c'est littéralement ce qui se passe.
    if (sessionLoading) {
      setState('loading');
      return;
    }
    // Sans backend configuré ou sans session, `city_zones` n'est pas lisible :
    // on ne SAIT pas ce qui est ouvert, et on le dira. On ne devine pas.
    if (!configured || !session || !supabase) {
      setOpenRows([]);
      setState('signed_out');
      return;
    }

    let cancelled = false;
    setState('loading');
    void (async () => {
      try {
        const client = supabase;
        if (!client) return;
        const { data, error, count } = await client
          .from('city_zones')
          .select('city_id, name', { count: 'exact' })
          .order('name', { ascending: true })
          .limit(OPEN_CITY_PAGE_SIZE);
        if (cancelled) return;
        if (error || !data) {
          // ÉCHEC ≠ « aucune ville ouverte ». On vide la liste (on n'affirme
          // plus rien) ET on nomme la cause.
          setOpenRows([]);
          setTruncated(false);
          setState('failed');
          return;
        }
        const rows = (data as { city_id: string; name: string }[])
          .filter((r) => typeof r.name === 'string' && r.name.trim().length > 0)
          .map((r) => ({ cityId: r.city_id, name: r.name }));
        setOpenRows(rows);
        setTruncated(typeof count === 'number' && count > rows.length);
        setState('ready');
      } catch {
        if (cancelled) return;
        setOpenRows([]);
        setTruncated(false);
        setState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, session, sessionLoading, attempt]);

  const index = useMemo(() => buildCityIndex(openRows, euReferential()), [openRows]);

  return { index, state, openCount: openRows.length, truncated, reload };
}

/** État d'un comptage d'activité. `idle` = on n'a rien demandé, donc rien à dire. */
export type CityActivityState = 'idle' | 'loading' | 'signed_out' | 'failed' | 'ready';

export interface CityActivity {
  readonly state: CityActivityState;
  /** Nombre de crews lus dans cette ville. N'a de sens que si `state === 'ready'`. */
  readonly crewCount: number;
}

/**
 * « Aucun crew ici pour l'instant », mais seulement si on l'a LU — et en disant
 * CREW, pas coureur.
 *
 * ⚠️ La phrase affichée disait « Personne ne court encore ici ». C'était une
 * INFERENCE : ce hook ne compte que des crews, et la capture n'en exige aucun —
 * une ville peut parfaitement avoir des coureurs solo et zéro crew. Le chiffre
 * lu et la phrase énoncée doivent parler de la même chose.
 *
 * Compte les crews de la ville (`crews`, colonnes ouvertes en lecture à
 * `authenticated` depuis 0036). C'est le SEUL signal d'activité qu'un client
 * peut lire honnêtement aujourd'hui — et c'est donc le seul que l'écran a le
 * droit d'énoncer : « n crews », jamais « n coureurs », jamais un classement,
 * jamais une densité.
 *
 * On ne compte que pour une ville OUVERTE : une ville non provisionnée n'a pas
 * de crews par construction, et poser la question laisserait croire qu'elle est
 * jouable. `state === 'idle'` alors, et l'écran affiche l'explication « pas
 * encore ouverte » à la place.
 */
export function useCityActivity(cityId: string | null, isOpenCity: boolean): CityActivity {
  const { session, configured, loading: sessionLoading } = useSession();
  const [state, setState] = useState<CityActivityState>('idle');
  const [crewCount, setCrewCount] = useState(0);

  useEffect(() => {
    if (!cityId || !isOpenCity) {
      setState('idle');
      setCrewCount(0);
      return;
    }
    if (sessionLoading) {
      setState('loading');
      return;
    }
    if (!configured || !session || !supabase) {
      setState('signed_out');
      return;
    }
    let cancelled = false;
    setState('loading');
    void (async () => {
      try {
        const client = supabase;
        if (!client) return;
        // `head: true` : on ne rapatrie AUCUNE ligne, juste le compte. On n'a
        // besoin que du nombre, et lire les crews d'une ville où l'on n'est pas
        // n'a aucune raison d'être.
        const { count, error } = await client
          .from('crews')
          .select('id', { count: 'exact', head: true })
          .eq('city_id', cityId);
        if (cancelled) return;
        if (error || typeof count !== 'number') {
          setState('failed');
          return;
        }
        setCrewCount(count);
        setState('ready');
      } catch {
        if (cancelled) return;
        setState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cityId, isOpenCity, configured, session, sessionLoading]);

  return { state, crewCount };
}
