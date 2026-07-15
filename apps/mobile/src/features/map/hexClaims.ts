/**
 * GRYD — P0.2 (AMENDEMENT-39) : la carte lit les VRAIES captures.
 *
 * Jusqu'ici la carte ne lisait JAMAIS `hex_claims` (les 9 occurrences dans le mobile
 * étaient des TODO) : elle affichait un Paris conquis fabriqué. C'était le P0 « la carte
 * ment » de l'audit de mise en prod. Ce module est la porte d'entrée du réel.
 *
 * DOCTRINE (arbitrage fondateur « A ») : une SEULE géométrie — les hexes possédés,
 * fusionnés et lissés. Le tracé du coureur n'est plus la frontière : il reste la vérité
 * d'UNE course (Live Run, Résultat, story de partage). Motif décisif : un territoire
 * s'accumule sur plusieurs courses, perd des hexes par decay/vol → aucun tracé unique
 * n'égale « ce que je possède maintenant ». Et depuis la migration 0030 (fuite de
 * domicile RGPD), le tracé d'un rival n'est plus lisible : il n'y a plus de tracé à
 * dessiner pour le territoire adverse.
 *
 * ZONE = un LIEU, pas une possession : identifiée par sa cellule H3 PARENTE
 * (TERRITORY_ZONE_RES), donc stable à vie et deep-linkable même après un vol. Voir
 * territory.ts / TerritoryId pour le raisonnement complet.
 *
 * Pattern de câblage (identique à economy.ts / leagueBoard.ts) : session → serveur,
 * sinon démo ÉTIQUETÉE. Aucune donnée fabriquée n'est jamais présentée comme réelle.
 */
import { useCallback, useEffect, useState } from 'react';
import { cellToParent } from 'h3-js';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  TERRITORY_ZONE_RES,
  cellsToTerritory,
  territoryId,
  type TerritoryId,
  type TerritoryState,
} from './territory';

/** Une capture telle que stockée : h3index est un BIGINT côté Postgres. */
interface HexClaimRow {
  h3index: string | number;
  owner_user_id: string | null;
  claim_type: string | null;
  decay_at: string | null;
  claimed_at: string | null;
}

/**
 * Contrat de propriétés d'une feature de territoire (contraintes fondateur §6).
 * `displayName` est nullable DÈS MAINTENANT : quand les secteurs/quartiers existeront,
 * on le renseignera par un simple lookup sur `territoryId` — sans changer le rendu, ni
 * le contrat, ni les deep links déjà partagés.
 */
export interface TerritoryProperties {
  territoryId: TerritoryId;
  /** Nom métier (« République »). NULL tant qu'aucun secteur n'est câblé → l'UI dit « Zone ». */
  displayName: string | null;
  ownerId: string | null;
  ownerType: 'user' | 'crew' | 'neutral';
  areaM2: number;
  status: TerritoryState;
  capturedAt: string | null;
  updatedAt: string;
}

/** Un territoire réel prêt à rendre : géométrie fusionnée + propriétés du contrat. */
export interface RealTerritory {
  props: TerritoryProperties;
  /** Multi-polygone fusionné/lissé, [lng, lat] (sortie de cellsToTerritory). */
  polygons: [number, number][][][];
  zoneCount: number;
}

/**
 * BIGINT Postgres → cellule H3 hexadécimale.
 * NB : `ingest_run` fait la conversion inverse (index.ts:146-148) mais ce sont des
 * const PRIVÉES d'un fichier Deno, non exportées et absentes de packages/shared → le
 * mobile ne peut pas les importer. On la refait ici, côté client, plutôt que de
 * prétendre réutiliser ce qui n'est pas réutilisable.
 */
export function dbToH3(value: string | number): string {
  return BigInt(value).toString(16);
}

/**
 * État de rendu d'une capture, du point de vue du joueur courant.
 * MVP volontairement minimal : 'crew' (à moi) / 'rival' (à un autre). Le decay et le
 * contesté viendront quand la donnée existera vraiment — on n'invente pas un statut.
 */
function stateFor(row: HexClaimRow, meId: string | null): TerritoryState {
  return row.owner_user_id !== null && row.owner_user_id === meId ? 'crew' : 'rival';
}

/**
 * Groupe les captures par (ZONE = cellule parente) × état, puis fusionne CHAQUE groupe.
 * Grouper par zone AVANT de fusionner garantit qu'une feature rendue appartient à une
 * zone et une seule → le tap (contrat C1) reste sans ambiguïté.
 */
export function buildTerritories(rows: readonly HexClaimRow[], meId: string | null): RealTerritory[] {
  const groups = new Map<string, { zone: TerritoryId; state: TerritoryState; cells: string[]; row: HexClaimRow }>();

  for (const row of rows) {
    const cell = dbToH3(row.h3index);
    const zone = cellToParent(cell, TERRITORY_ZONE_RES);
    const state = stateFor(row, meId);
    const key = `${zone}:${state}`;
    const existing = groups.get(key);
    if (existing) existing.cells.push(cell);
    else groups.set(key, { zone: territoryId(zone), state, cells: [cell], row });
  }

  const out: RealTerritory[] = [];
  for (const g of groups.values()) {
    const territory = cellsToTerritory(g.cells, g.state);
    if (!territory) continue;
    out.push({
      props: {
        territoryId: g.zone,
        // Aucun nom inventé (contrainte fondateur §5) : null → l'UI affiche « Zone ».
        displayName: null,
        ownerId: g.row.owner_user_id,
        ownerType: g.row.owner_user_id ? 'user' : 'neutral',
        areaM2: 0, // renseigné par le rendu via h3 cellArea si besoin — jamais deviné ici
        status: g.state,
        capturedAt: g.row.claimed_at,
        updatedAt: new Date().toISOString(),
      },
      polygons: territory.polygons as unknown as [number, number][][][],
      zoneCount: territory.zoneCount,
    });
  }
  return out;
}

export interface UseRealTerritoriesResult {
  /** null = pas encore chargé ; [] = chargé et VRAIMENT VIDE (état honnête). */
  territories: RealTerritory[] | null;
  /** true quand la source est le serveur (sinon l'appelant doit étiqueter « démo »). */
  isReal: boolean;
  loading: boolean;
  reload: () => void;
}

/**
 * Lecture réelle des captures d'une ville.
 *
 * Requête volontairement la plus SIMPLE qui marche : filtre `city_id`, qui utilise
 * l'index EXISTANT `hex_claims_city_idx` (0002) sous la policy `hex_claims_select_all`
 * (0003). Aucune migration, aucun index à créer. La LOD par cellules parentes ne devient
 * nécessaire qu'à l'échelle (cf. audit 200 concurrents) — pas au MVP, et on ne
 * pré-optimise pas une carte que personne ne regarde encore.
 *
 * Sans session (ou sans backend) → `isReal:false` : l'appelant garde la démo ÉTIQUETÉE.
 */
export function useRealTerritories(cityId: string | undefined): UseRealTerritoriesResult {
  const { session } = useSession();
  const [territories, setTerritories] = useState<RealTerritory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!supabase || !session || !cityId) {
      setTerritories(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('hex_claims')
        .select('h3index, owner_user_id, claim_type, decay_at, claimed_at')
        .eq('city_id', cityId);
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
  }, [cityId, session, tick]);

  return {
    territories,
    isReal: territories !== null,
    loading,
    reload,
  };
}
