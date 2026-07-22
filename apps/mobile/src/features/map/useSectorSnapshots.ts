/**
 * GRYD — SECTEURS §C : la carte lit ENFIN `sector_snapshot` (câblage React).
 *
 * AMENDEMENT-47 avait supprimé le rendu des secteurs DE DÉMO sans jamais
 * brancher la source réelle : les deux seules occurrences de `sector_snapshot`
 * dans `apps/` étaient des COMMENTAIRES (mapStyle.ts, allTerritories.ts) qui
 * promettaient le retour du rendu « quand il aura une source RÉELLE ». La
 * source existe (0037 + 0061), le job `recompute_sectors` tourne (pg_cron toutes
 * les 15 minutes, migration 0038) : voici la porte d'entrée.
 *
 * ── QUATRE ÉTATS DISTINCTS, JAMAIS CONFONDUS (doctrine « l'app ne ment jamais »)
 * Même grammaire que `useActiveSeason` (season) et `useRealTerritories` (carte) :
 *
 *   · 'loading'   → on ne SAIT pas encore : session en restauration, identité du
 *                   joueur pas résolue, ou requête en vol. On n'affirme RIEN.
 *   · 'signedOut' → aucune session (ou pas de backend). `sector_snapshot` est en
 *                   RLS `select to authenticated` : sans session il n'y a rien à
 *                   lire, et c'est un fait, pas une panne.
 *   · 'empty'     → LU, et il n'y a réellement AUCUN secteur snapshoté. À 0
 *                   `hex_claims` en production, C'EST LA RÉPONSE NORMALE ET
 *                   ATTENDUE : la carte ne peint aucun secteur. Pas un « 0 » nu,
 *                   pas un hexagone gris, pas un spinner qui tourne à vide.
 *   · 'error'     → la lecture a ÉCHOUÉ. On ne sait pas s'il y a des secteurs :
 *                   on ne peint rien ET on le DIT (l'écran propose de réessayer).
 *                   Confondre cet état avec 'empty' serait affirmer « personne ne
 *                   tient rien » alors que le réseau a simplement coupé.
 *   · 'ready'     → des secteurs réels sont là.
 *
 * ── DEUX REQUÊTES, ET POURQUOI ──────────────────────────────────────────────
 * 1. `sector_snapshot` : les lignes agrégées (§C « le client reçoit ces lignes
 *    agrégées, pas toute la base — jamais 200k runners »).
 * 2. `sectors` (filtrée sur les ids trouvés) : nom + `center_h3_res7`, qui porte
 *    la GÉOMÉTRIE (`sectors.geojson` est NULL en base).
 * Aucune deuxième requête quand la première est vide — c'est-à-dire aujourd'hui,
 * tout le temps. Le coût de l'état vide est donc UNE requête.
 *
 * `center_h3_res7` est demandé en TEXTE (`::text`) et non en nombre : un index H3
 * res 7 vaut ~6·10^17, très au-dessus de `Number.MAX_SAFE_INTEGER`. Rendu en
 * nombre JSON il serait ARRONDI, donc converti en une AUTRE cellule — un secteur
 * peint à côté de sa vraie place. `sectorRing` refuse de toute façon toute
 * cellule invalide, mais on ne compte pas sur un garde-fou pour éviter une perte
 * de données évitable.
 *
 * Aucun `.limit()` : une troncature silencieuse ferait mentir la carte (même
 * raisonnement que `hexClaims.ts`). Aucun filtrage par viewport non plus — c'est
 * un chantier à part, pas une rustine ici.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { joinSectorRows, toId } from './sectorView';
import type { SectorSnapshotRow } from './sectorView';

export type SectorSnapshotStatus = 'loading' | 'signedOut' | 'empty' | 'ready' | 'error';

export interface UseSectorSnapshotsResult {
  status: SectorSnapshotStatus;
  /**
   * Les secteurs réels. `null` dans TOUT état autre que 'ready'/'empty' —
   * jamais un tableau vide qui pourrait passer pour « lu et vide ».
   * `[]` signifie exactement « lu, et il n'y en a aucun ».
   */
  sectors: SectorSnapshotRow[] | null;
  reload: () => void;
}

/** Colonnes de `sector_snapshot` (0037 + 0061). Les `*_kind` sont GÉNÉRÉES : lues, jamais écrites. */
// UNE SEULE littérale, sans concaténation ni espaces : supabase-js analyse cette
// chaîne AU NIVEAU DES TYPES. Une concaténation `'a' + 'b'` s'efface en `string`
// et le parser rend alors `GenericStringError` — gate rouge, pour de la mise en
// forme. La ligne est longue : c'est le prix de la vérification statique.
const SNAPSHOT_COLUMNS =
  'sector_id,owner_crew_id,owner_user_id,owner_kind,owner_percent,top_rival_crew_id,top_rival_user_id,top_rival_kind,top_rival_percent,neutral_percent,pressure_score,status_level,contested';

/** Nom + centre H3 du secteur. Le H3 est cast en TEXTE (bigint > 2^53 — cf. en-tête). */
const SECTOR_COLUMNS = 'id,name,center_h3:center_h3_res7::text';

/**
 * Lecture réelle des secteurs agrégés.
 *
 * `viewerResolved` : l'écran sait-il DÉJÀ qui regarde (identité + crew) ? Tant
 * que non, ce hook reste 'loading' — un secteur peint avec un rôle inconnu
 * s'affiche dans la mauvaise couleur, ce qui est un mensonge de même nature
 * qu'un chiffre faux. Passer `true` quand `useRealCrew()` a répondu.
 *
 * `viewerFailed` : la lecture de cette identité a-t-elle ÉCHOUÉ ? C'est un état
 * DIFFÉRENT de « pas encore résolue », et il doit le rester. Sans ce paramètre,
 * un échec se présentait comme un `viewerResolved` éternellement faux — donc un
 * 'loading' perpétuel, puisque `useRealCrew` ne repasse pas son `loadFailed` à
 * false tout seul. La carte tournait alors dans le vide sans jamais dire qu'elle
 * avait échoué : exactement la confusion de deux des quatre états que la
 * doctrine interdit.
 */
export function useSectorSnapshots(
  viewerResolved: boolean,
  viewerFailed = false,
): UseSectorSnapshotsResult {
  const { session, loading: sessionLoading } = useSession();
  const [sectors, setSectors] = useState<SectorSnapshotRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const signedOut = !sessionLoading && (!supabase || !session);

  useEffect(() => {
    // Session en RESTAURATION : on ne lit rien et surtout on n'affirme rien.
    if (sessionLoading) return;
    if (!supabase || !session) {
      setSectors(null);
      setFailed(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setFailed(false);

    void (async () => {
      const snap = await client
        .from('sector_snapshot')
        .select(SNAPSHOT_COLUMNS)
        .order('pressure_score', { ascending: false });
      if (cancelled) return;
      if (snap.error) {
        console.error('[sectors] lecture sector_snapshot échouée :', snap.error.message);
        setSectors(null);
        setFailed(true);
        return;
      }
      const rows = (snap.data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) {
        // LU, et il n'y a aucun secteur. État vide RÉEL — la deuxième requête
        // n'a pas lieu d'être.
        setSectors([]);
        return;
      }
      const ids = rows.map((r) => toId(r.sector_id)).filter((id): id is string => id !== null);
      const places = await client.from('sectors').select(SECTOR_COLUMNS).in('id', ids);
      if (cancelled) return;
      if (places.error) {
        // Les snapshots sans leur géométrie ne peuvent RIEN peindre d'honnête :
        // c'est un échec de lecture, pas un état vide.
        console.error('[sectors] lecture sectors échouée :', places.error.message);
        setSectors(null);
        setFailed(true);
        return;
      }
      // `as unknown as` : le cast SQL `::text` sort du modèle typé de
      // supabase-js (il ne sait pas nommer une colonne castée). La forme réelle
      // est validée à la lecture par `parseSectorRow`, pas par ce cast.
      setSectors(
        joinSectorRows(rows, (places.data ?? []) as unknown as Record<string, unknown>[]),
      );
    })().catch((e: unknown) => {
      // Sans ce catch, un throw synchrone du client laisserait le hook à jamais
      // en 'loading' — une carte muette, ni « échec » ni « vide » : le cul-de-sac
      // que la doctrine interdit.
      if (cancelled) return;
      console.error('[sectors] lecture rejetée :', e);
      setSectors(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading, tick]);

  const status: SectorSnapshotStatus = useMemo(() => {
    if (failed) return 'error';
    if (signedOut) return 'signedOut';
    // Identité du spectateur ILLISIBLE : on ne peut pas colorer par rôle, donc on
    // ne peint pas — et on le DIT. Sans cette branche, l'échec se déguisait en
    // « lecture en cours » et la carte n'en sortait jamais.
    if (viewerFailed) return 'error';
    // L'identité du joueur passe APRÈS la session (« pas connecté » est plus
    // informatif que « je cherche ») mais AVANT toute affirmation sur le contenu.
    if (!viewerResolved || sectors === null) return 'loading';
    return sectors.length === 0 ? 'empty' : 'ready';
  }, [failed, signedOut, viewerFailed, viewerResolved, sectors]);

  return {
    status,
    // Hors 'ready'/'empty', l'appelant ne reçoit RIEN à peindre.
    sectors: status === 'ready' || status === 'empty' ? sectors : null,
    reload,
  };
}
