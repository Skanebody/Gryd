/**
 * GRYD — P0.2 (AMENDEMENT-39) : la carte lit les VRAIES captures — CÂBLAGE React.
 *
 * Jusqu'ici la carte ne lisait JAMAIS `hex_claims` (les 9 occurrences dans le mobile
 * étaient des TODO) : elle affichait un Paris conquis fabriqué. C'était le P0 « la carte
 * ment » de l'audit de mise en prod. Ce module est la porte d'entrée du réel.
 *
 * La LOGIQUE vit dans `territoryBuild.ts` (pur, testé en Deno) : ce fichier ne porte que
 * l'accès réseau et l'état React. Les types y sont ré-exportés pour ne rien casser chez
 * les consommateurs.
 *
 * Pattern de câblage (identique à economy.ts / leagueBoard.ts) : session → serveur,
 * sinon démo ÉTIQUETÉE. Aucune donnée fabriquée n'est jamais présentée comme réelle.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { buildTerritories, type HexClaimRow, type RealTerritory } from './territoryBuild';

export { buildTerritories, dbToH3, stateFor } from './territoryBuild';
export type {
  HexClaimRow,
  RealTerritory,
  TerritoryProperties,
} from './territoryBuild';

export interface UseRealTerritoriesResult {
  /** null = pas encore chargé ; [] = chargé et VRAIMENT VIDE (état honnête). */
  territories: RealTerritory[] | null;
  /** true quand la source est le serveur (sinon l'appelant doit étiqueter « démo »). */
  isReal: boolean;
  loading: boolean;
  reload: () => void;
}

/**
 * Lecture réelle des captures.
 *
 * ⚠️ PAS DE FILTRE `city_id` — et c'est un choix, pas un oubli. Deux raisons, la
 * seconde étant un BUG que le filtre aurait rendu invisible :
 *
 * 1. Erreur de catégorie. `city_id` est la « ville de rattachement DÉCLARÉE
 *    (classements) » (types.ts:65) et « la capture n'y est PAS bornée » —
 *    AMENDEMENT-02/35 : on capture dans toute l'Europe. Filtrer la CARTE par ville
 *    masquerait le territoire réellement possédé hors Paris/Lille. La carte mentirait.
 *
 * 2. Le filtre ne matcherait RIEN. `claim_hexes` insère `city_id = p_city_id`
 *    (0031:123-127), alimenté par `ctx.cityId ?? null` (ingest_run:1526) ; or le SEUL
 *    constructeur de payload (`tracker.ts:295 buildPayload`) ne déclare JAMAIS `cityId`
 *    — le champ est optionnel côté serveur (index.ts:196). Toute capture réelle a donc
 *    `city_id = NULL`. Un `.eq('city_id', …)` renverrait 0 ligne À VIE, ce qui se lit
 *    exactement comme « aucune capture » : la panne serait indétectable à l'œil.
 *    (Conséquence hors P0.2, à traiter séparément : les classements PAR VILLE n'ont
 *    aucune donnée à agréger.)
 *
 * Volume : la table est lue en entier. Assumé au MVP (0 ligne aujourd'hui), cohérent
 * avec le « aucun filtrage par viewport, volumes MVP négligeables » d'allTerritories.
 * Pas de `.limit()` : une troncature silencieuse ferait à nouveau mentir la carte.
 * Le filtrage par VIEWPORT + LOD est la vraie réponse à l'échelle (audit 200 joueurs)
 * et exige une colonne de zone indexée — un chantier à part, pas une rustine ici.
 *
 * Sans session (ou sans backend) → `isReal:false` : l'appelant garde la démo ÉTIQUETÉE.
 */
export function useRealTerritories(): UseRealTerritoriesResult {
  const { session } = useSession();
  const [territories, setTerritories] = useState<RealTerritory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!supabase || !session) {
      setTerritories(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('hex_claims')
        .select('h3index, owner_user_id, claim_type, decay_at, claimed_at');
      if (cancelled) return;
      setLoading(false);
      if (error) {
        // Échec réseau → on NE bascule PAS sur la démo en la faisant passer pour du réel.
        console.error('[hexClaims] lecture hex_claims échouée :', error.message);
        setTerritories(null);
        return;
      }
        setTerritories(buildTerritories((data ?? []) as HexClaimRow[], session.user.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [session, tick]);

  return {
    territories,
    isReal: territories !== null,
    loading,
    reload,
  };
}
