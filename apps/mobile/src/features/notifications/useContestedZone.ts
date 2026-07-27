/**
 * GRYD — E70 : LA LECTURE (I/O) d'une zone attaquée. Le pendant impur de
 * `contestedZone.ts` : ici et nulle part ailleurs on parle à Supabase ; la
 * DÉCISION d'écran reste dans le moteur pur et testé.
 *
 * ═══ TROIS LECTURES, ET CE QUI AUTORISE CHACUNE ═════════════════════════════
 *  1. `territory_contests` PAR IDENTIFIANT. La policy
 *     `territory_contests_select_parties` (0078 §4) ne rend la ligne que si je
 *     suis PARTIE — assaillant ou défenseur. Aucun filtre client ne remplace ça :
 *     un identifiant deviné par un tiers ne rend rien, par construction serveur.
 *     ⚠️ « Aucune ligne » couvre DEUX cas — cette contestation n'existe pas, ou
 *     elle ne m'est pas visible. Ils sont rendus indistinguables (`not_found`),
 *     comme `rivalZonesRead` le fait pour les profils : les séparer ferait de
 *     l'écran un oracle d'existence.
 *  2. `territories` PAR IDENTIFIANT, restreinte à `owner_type='user'` et
 *     `owner_id = moi`. Ce n'est PAS une redondance avec la policy : la RLS de
 *     `territories` (0074 §3) m'ouvre aussi les territoires PUBLIÉS des autres.
 *     Sans ce filtre, l'assaillant lirait la zone de sa victime et l'écran la
 *     titrerait comme sienne. Ce que la RLS ouvre et ce que l'écran doit montrer
 *     sont deux questions différentes (même arbitrage qu'en `contestEvents.ts`).
 *  3. `user_profiles` PAR `user_id`, UNIQUEMENT si l'assaillant est un joueur.
 *     La policy `user_profiles_select_visible` (0011:201) applique le
 *     CONSENTEMENT du rival côté serveur : rien à filtrer ici, et un rival
 *     discret reste anonyme. Cette lecture est FACULTATIVE — son échec ne fait
 *     PAS échouer l'écran (cf. plus bas), parce qu'une alerte de défense ne doit
 *     pas dépendre de la disponibilité du nom de l'attaquant.
 *
 * ═══ « ÉCHEC PARTIEL » N'EXISTE PAS… SAUF POUR LE NOM ═══════════════════════
 * Les lectures 1 et 2 portent le FAIT (suis-je attaqué, jusqu'à quand). Si
 * l'une échoue, l'écran passe `failed` et n'affirme rien : rendre la
 * contestation sans savoir si la zone est mienne titrerait une alerte à
 * l'assaillant. La lecture 3 ne porte qu'un ORNEMENT VRAI (un pseudo) : son
 * échec dégrade en `rivalName: null`, ce que l'écran sait déjà dire. Refuser
 * d'afficher l'échéance parce qu'on n'a pas su lire un pseudo serait une panne
 * fabriquée.
 *
 * ═══ CE QUI N'EST PAS DEMANDÉ, DONC NE PEUT PAS FUIR ════════════════════════
 * Ni `source_activity_id` (il désigne la COURSE du rival, §12), ni
 * `territories.geometry` (le polygone fin — seul `geometry_generalized` est lu),
 * ni `publish_after`, ni `controlled_since`. Les deux `select` ci-dessus sont la
 * liste EXHAUSTIVE de ce qui traverse le réseau pour cet écran.
 *
 * ═══ ÉTAT RÉEL AU 27/07/2026 ════════════════════════════════════════════════
 * `ingest_run` OUVRE de vraies contestations (`contest_wiring.ts`), mais la base
 * est VIDE : ce chemin rendra `not_found` pour tout identifiant. C'est le
 * comportement JUSTE. Aucune fixture, aucune attaque d'illustration : le jour où
 * un vrai rival boucle autour d'une vraie zone, la même lecture la rend, sans
 * qu'une ligne change ici.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { parsePolygonRings } from '../map/territoriesSource';
import {
  CONTESTED_TERRITORY_COLUMNS,
  CONTESTED_ZONE_COLUMNS,
  type ContestRow,
  type ContestedTerritory,
  type ContestedZoneRead,
} from './contestedZone';

/** Colonnes lues sur `user_profiles` — un pseudo public, RIEN d'autre. */
const RIVAL_PROFILE_COLUMNS = 'user_id, handle, display_name';

export interface UseContestedZoneResult {
  readonly read: ContestedZoneRead;
  readonly reload: () => void;
}

/**
 * Lit LA contestation désignée par `contestId`.
 *
 * `contestId` vide → `not_found` SANS aucun appel réseau : une route ouverte
 * sans paramètre ne doit pas produire un `select` sans filtre, qui ramènerait
 * une contestation au hasard.
 */
export function useContestedZone(contestId: string): UseContestedZoneResult {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const [read, setRead] = useState<ContestedZoneRead>({ kind: 'loading' });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    // Session en RESTAURATION : on ne lit rien et on n'affirme rien.
    if (sessionLoading) {
      setRead({ kind: 'loading' });
      return;
    }
    // Pas de backend (O1) ou pas de session : `territory_contests` n'est
    // accordée qu'à `authenticated` (0078 §4) — la lecture ÉCHOUERAIT. On le dit
    // au lieu de la tenter et d'afficher un échec trompeur.
    if (!supabase || !userId) {
      setRead({ kind: 'signed_out' });
      return;
    }
    if (contestId.length === 0) {
      setRead({ kind: 'not_found' });
      return;
    }

    const client = supabase;
    let cancelled = false;
    setRead({ kind: 'loading' });

    void (async () => {
      try {
        // ── 1. LE FAIT. Sans cette ligne, il n'y a pas d'attaque. ──────────
        const contest = await client
          .from('territory_contests')
          .select(CONTESTED_ZONE_COLUMNS)
          .eq('id', contestId)
          .maybeSingle();
        if (cancelled) return;
        if (contest.error) {
          setRead({ kind: 'failed' });
          return;
        }
        const row = contest.data as unknown as ContestRow | null;
        if (!row) {
          // Inexistante OU pas partie : un seul et même état (cf. en-tête).
          setRead({ kind: 'not_found' });
          return;
        }

        // ── 2. LA ZONE, et seulement si elle est MIENNE en propre. ─────────
        const owned = await client
          .from('territories')
          .select(CONTESTED_TERRITORY_COLUMNS)
          .eq('id', row.territory_id)
          .eq('owner_type', 'user')
          .eq('owner_id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (owned.error) {
          setRead({ kind: 'failed' });
          return;
        }
        const ownedRow = owned.data as Record<string, unknown> | null;
        const territory: ContestedTerritory | null = ownedRow
          ? {
              id: String(ownedRow.id),
              // `true` sans condition : le `select` ci-dessus ne rend la ligne
              // QUE si les deux `.eq` de propriété sont satisfaits. Aucune
              // ligne ⇒ `territory` reste `null` ⇒ le moteur rend
              // `not_defender`. La propriété n'est donc jamais déduite ici.
              mineAsUser: true,
              areaM2: typeof ownedRow.area_m2 === 'number' ? ownedRow.area_m2 : null,
              // Contour GÉNÉRALISÉ uniquement. Illisible ⇒ `null` : la carte
              // disparaît, elle ne se replie sur aucune autre géométrie.
              rings: parsePolygonRings(ownedRow.geometry_generalized),
            }
          : null;

        // ── 3. LE NOM, facultatif et soumis au consentement du rival. ──────
        let rivalName: string | null = null;
        if (territory && row.attacker_type === 'user' && row.attacker_id) {
          const profile = await client
            .from('user_profiles')
            .select(RIVAL_PROFILE_COLUMNS)
            .eq('user_id', row.attacker_id)
            .maybeSingle();
          if (cancelled) return;
          // Erreur OU aucune ligne (profil non visible) : même issue, l'anonymat.
          // On n'échoue PAS l'écran pour un pseudo (cf. en-tête).
          const p = profile.error
            ? null
            : (profile.data as { handle?: unknown; display_name?: unknown } | null);
          const display = typeof p?.display_name === 'string' ? p.display_name.trim() : '';
          const handle = typeof p?.handle === 'string' ? p.handle.trim() : '';
          rivalName = display.length > 0 ? display : handle.length > 0 ? handle : null;
        }

        setRead({ kind: 'loaded', contest: row, territory, rivalName });
      } catch {
        if (!cancelled) setRead({ kind: 'failed' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contestId, userId, sessionLoading, tick]);

  return { read, reload };
}
