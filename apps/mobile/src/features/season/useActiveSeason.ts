/**
 * GRYD — SAISON ACTIVE (câblage React de la RPC `season_current`, 0060).
 *
 * Doctrine « l'app ne ment jamais » appliquée à la SAISON : l'écran n'affiche une
 * date de fin QUE si une saison réelle existe en base. Ce hook lit la saison
 * active de la ville du joueur (RPC serveur, jamais une constante) et n'invente
 * JAMAIS de fenêtre. La progression (pct, jours restants, phase) se dérive
 * ensuite du moteur PUR `seasonProgress` (@klaim/shared) à partir des bornes
 * RÉELLES renvoyées ici — voir l'exemple d'usage en bas de fichier.
 *
 * ── QUATRE ÉTATS DISTINCTS (jamais confondus) ────────────────────────────────
 * Les trois demandés — chargement / active / aucune — plus un quatrième que la
 * doctrine impose : ÉCHEC DE LECTURE. « Je n'ai pas pu lire » n'est pas « il n'y
 * a pas de saison » : confondre les deux, c'est affirmer « pas de saison » quand
 * le réseau a simplement coupé. Même distinction que `useRealCrew.loadFailed`.
 *
 *   · 'loading' → requête en vol (ou session en cours de restauration).
 *   · 'active'  → une saison réelle est en cours ; `season` porte ses bornes.
 *   · 'none'    → LU, et il n'y a réellement aucune saison active (ou pas de
 *                 session / pas de backend / le joueur n'a pas de ville).
 *   · 'error'   → la lecture a échoué ; on ne sait pas. L'UI dit l'échec et
 *                 propose de réessayer — elle n'affirme SURTOUT pas « aucune ».
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

export type ActiveSeasonStatus = 'loading' | 'active' | 'none' | 'error';

/** Saison active RÉELLE — bornes brutes ISO, numéro 0-indexé (« Saison 0 »). */
export interface ActiveSeason {
  seasonId: string;
  cityId: string;
  /** Début de saison, ISO 8601 (borne réelle de la table `seasons`). */
  startsAt: string;
  /** Fin de saison, ISO 8601 (borne réelle — jamais fabriquée). */
  endsAt: string;
  /** Rang 0-indexé de la saison dans sa ville : 0 = « Saison 0 ». */
  number: number;
}

export interface UseActiveSeasonResult {
  status: ActiveSeasonStatus;
  /** La saison active, ou `null` dans tout autre état que 'active'. */
  season: ActiveSeason | null;
  /** Relance la lecture (après un retour de connexion, un pull-to-refresh…). */
  reload: () => void;
}

/**
 * jsonb d'une ligne `season_current` → ActiveSeason, ou `null` si la forme n'est
 * pas celle attendue. PUR et défensif (même patron que `parseCrewOverview`) :
 * une borne manquante ou illisible ⇒ `null` ⇒ l'écran ne montre PAS de saison,
 * plutôt que d'afficher une date à moitié vraie.
 */
export function parseActiveSeason(raw: unknown): ActiveSeason | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const seasonId = typeof row.season_id === 'string' ? row.season_id : null;
  const cityId = typeof row.city_id === 'string' ? row.city_id : null;
  const startsAt = typeof row.starts_at === 'string' ? row.starts_at : null;
  const endsAt = typeof row.ends_at === 'string' ? row.ends_at : null;
  const number =
    typeof row.season_number === 'number' && Number.isFinite(row.season_number)
      ? Math.trunc(row.season_number)
      : null;

  if (!seasonId || !cityId || !startsAt || !endsAt || number === null || number < 0) {
    return null;
  }
  // Les bornes doivent être des dates réelles ET ordonnées : sinon ce n'est pas
  // une saison affichable (on ne « répare » pas une fenêtre incohérente).
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }

  return { seasonId, cityId, startsAt, endsAt, number };
}

/**
 * Saison active de la ville du joueur (ou d'une ville explicite via `cityId`).
 *
 * @param cityId ville ciblée ; par défaut la RPC résout la ville du joueur
 *               courant (users.city_id). Sans ville → aucune saison → 'none'.
 */
export function useActiveSeason(cityId?: string): UseActiveSeasonResult {
  const { session } = useSession();
  const [status, setStatus] = useState<ActiveSeasonStatus>('loading');
  const [season, setSeason] = useState<ActiveSeason | null>(null);
  const [tick, setTick] = useState(0);

  const ready = !!supabase && !!session;
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Pas de backend / pas de session : rien à lire. Une saison est une donnée de
    // joueur connecté — sans session il n'y en a pas à montrer (état 'none'
    // honnête, PAS un échec).
    if (!ready || !supabase || !session) {
      setSeason(null);
      setStatus('none');
      return;
    }
    const client = supabase;
    let cancelled = false;
    setStatus('loading');

    void (async () => {
      try {
        const { data, error } = await client.rpc(
          'season_current',
          cityId === undefined ? {} : { p_city_id: cityId },
        );
        if (cancelled) return;
        if (error) {
          // Échec de lecture ≠ absence de saison : on ne dit pas « aucune ».
          setSeason(null);
          setStatus('error');
          return;
        }
        // La RPC renvoie 0 ou 1 ligne (setof). PostgREST rend un tableau.
        const first = Array.isArray(data) ? data[0] : data;
        const parsed = parseActiveSeason(first ?? null);
        if (parsed) {
          setSeason(parsed);
          setStatus('active');
        } else {
          // Lu, et il n'y a réellement aucune saison active : état vide honnête.
          setSeason(null);
          setStatus('none');
        }
      } catch {
        if (cancelled) return;
        // Exception (réseau coupé, JSON illisible) : on n'a rien pu établir.
        setSeason(null);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, session, cityId, tick]);

  return { status, season, reload };
}

/*
 * ── EXEMPLE D'USAGE (pour les lots qui s'y branchent) ────────────────────────
 *
 *   import { useActiveSeason } from '../src/features/season/useActiveSeason';
 *   import { seasonProgress } from '@klaim/shared';
 *
 *   const { status, season, reload } = useActiveSeason();
 *   if (status === 'loading') return <SeasonLoading />;
 *   if (status === 'error')   return <SeasonUnavailable onRetry={reload} />;
 *   if (status === 'none')    return <SeasonNotYetOpen />; // « Saison 0 · pas
 *                                                          //   encore ouverte »
 *   // status === 'active' :
 *   const { pct, joursRestants, phase } = seasonProgress(season.startsAt, season.endsAt);
 *   // …afficher « Saison {season.number} » + décompte réel.
 */
