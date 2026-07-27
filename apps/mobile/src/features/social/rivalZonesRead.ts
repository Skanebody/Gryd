/**
 * GRYD — E15 : LA LECTURE (I/O) des territoires publics d'un rival. Le pendant
 * impur de `rivalZones.ts` : ici et nulle part ailleurs on parle à Supabase ;
 * la DÉCISION d'écran, elle, reste dans le moteur pur et testé.
 *
 * ═══ LES DEUX LECTURES, ET CE QUI LES AUTORISE ══════════════════════════════
 *  1. `user_profiles` par `handle`. La policy `user_profiles_select_visible`
 *     (migration 0011:201) ne rend la ligne QUE si le profil est `public`, ou si
 *     je suis ami/coéquipier selon le réglage du joueur. Le CONSENTEMENT est
 *     donc appliqué par le serveur, pas par cet écran : rien à filtrer ici.
 *     ⚠️ « Aucune ligne » couvre DEUX cas — ce handle n'existe pas, ou il ne
 *     m'est pas visible. On les rend indistinguables (`no_profile`) : les
 *     séparer ferait de l'écran un oracle d'existence de comptes.
 *  2. `public_territories` (migration 0077) — la vue publique, JAMAIS la table
 *     `territories`. Elle n'expose que `geometry_generalized`, pas de
 *     `source_run_id`, un `controlled_since` tronqué à l'heure, et seulement les
 *     lignes dont `publish_after` est échu (publication différée §1.5). La
 *     généralisation est donc SERVEUR et irréversible : rien n'est lissé ici.
 *     Depuis 0087, la vue applique AUSSI le `map_sharing` du propriétaire : le
 *     refus de partager sa carte est devenu une protection serveur, plus un
 *     filtre client. Celui du dessous reste utile — il évite de demander ce
 *     qu'on sait interdit — mais il n'est plus ce qui protège.
 *
 * ═══ CE QUE CE MODULE NE DEMANDE JAMAIS ════════════════════════════════════
 * Ni `geometry`, ni `source_run_id`, ni `publish_after`, ni `created_at` — la
 * vue ne les porte même pas. Le `select` ci-dessous est la liste EXHAUSTIVE de
 * ce qui traverse le réseau pour cet écran ; l'y relire est la façon la plus
 * courte de vérifier qu'aucun trajet ni aucun horaire ne circule.
 *
 * ═══ ÉTAT RÉEL AU 27/07/2026 ═══════════════════════════════════════════════
 * La base est VIDE : aucun `user_profiles` peuplé, aucun territoire. Ce chemin
 * rendra donc `no_profile` ou `empty` — et c'est exactement ce que l'écran doit
 * dire. Aucune fixture, aucun rival d'illustration : le jour où un vrai joueur
 * publie une zone, la même lecture la rend, sans qu'une ligne change.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { PAINTABLE_STATES, parsePolygonRings } from '../map/territoriesSource';
import type { TerritoryDbState } from '../map/territoriesSource';
import type { MapSharing, RivalZoneRow, RivalZonesRead } from './rivalZones';

/**
 * Colonnes lues sur `user_profiles` — SOURCE UNIQUE de ce select. `bio`,
 * `avatar_url`, `main_city` ne sont PAS demandées : E15 n'est pas un profil, et
 * la spec y impose une « identité RÉDUITE ». Ce qu'on ne lit pas ne peut pas
 * fuir dans un log ni dans une capture d'écran.
 */
const PROFILE_COLUMNS = 'user_id, handle, display_name, map_sharing';

/**
 * Colonnes lues sur `public_territories`. `state` sert à ne peindre QUE ce qui
 * est réellement tenu (mêmes états que la carte, `PAINTABLE_STATES`) : peindre
 * un `expired` affirmerait une possession qui n'existe plus.
 */
const TERRITORY_COLUMNS = 'id, state, area_m2, geometry_generalized, controlled_since_hour';

/** Réglages connus (0011). Une valeur inattendue est traitée comme un REFUS. */
const MAP_SHARING_VALUES: readonly MapSharing[] = [
  'precise',
  'simplified',
  'territory_only',
  'none',
];

/**
 * Un `map_sharing` qu'on ne reconnaît pas devient `'none'`, donc « carte
 * masquée ». Le repli le plus PRUDENT, pas le plus permissif : si une migration
 * future ajoute un mode, l'app d'hier refusera d'afficher plutôt que de
 * divulguer sous un réglage qu'elle ne comprend pas.
 */
function toMapSharing(raw: unknown): MapSharing {
  return MAP_SHARING_VALUES.includes(raw as MapSharing) ? (raw as MapSharing) : 'none';
}

/** `timestamptz` PostgREST → ms. `null` si absent ou illisible — jamais `Date.now()`. */
function toMs(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/** Identité RÉDUITE du joueur observé — un pseudo, et rien d'autre. */
export interface RivalIdentity {
  readonly handle: string;
  /** `display_name` s'il existe, sinon le handle. Jamais un nom civil déduit. */
  readonly name: string;
}

export interface UseRivalZonesResult {
  readonly read: RivalZonesRead;
  /** Renseignée dès que le profil consenti a été rendu ; `null` sinon. */
  readonly identity: RivalIdentity | null;
  readonly reload: () => void;
}

/**
 * Lit les territoires publics d'un joueur désigné par son @handle.
 *
 * `handle` vide → `no_profile` sans aucun appel réseau : une route ouverte sans
 * paramètre ne doit pas produire une requête, et encore moins un `select` sans
 * filtre qui ramènerait des profils au hasard.
 */
export function useRivalZones(handle: string): UseRivalZonesResult {
  const { session, loading: sessionLoading } = useSession();
  const viewerId = session?.user?.id ?? null;

  const [read, setRead] = useState<RivalZonesRead>({ kind: 'loading' });
  const [identity, setIdentity] = useState<RivalIdentity | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    // Session en RESTAURATION : on ne lit rien et on n'affirme rien. L'écran
    // reste en « lecture en cours », qui ne dit rien du joueur observé.
    if (sessionLoading) {
      setRead({ kind: 'loading' });
      return;
    }
    // Pas de backend configuré (O1) ou pas de session : `public_territories`
    // n'est accordée qu'à `authenticated` (0077), la lecture ÉCHOUERAIT. On le
    // dit au lieu de la tenter et d'afficher un échec trompeur.
    if (!supabase || !viewerId) {
      setIdentity(null);
      setRead({ kind: 'signed_out' });
      return;
    }
    if (handle.length === 0) {
      setIdentity(null);
      setRead({ kind: 'no_profile' });
      return;
    }

    let cancelled = false;
    setRead({ kind: 'loading' });

    void (async () => {
      try {
        const profile = await supabase
          .from('user_profiles')
          .select(PROFILE_COLUMNS)
          .eq('handle', handle)
          .maybeSingle();
        if (cancelled) return;
        if (profile.error) {
          setIdentity(null);
          setRead({ kind: 'failed' });
          return;
        }
        const row = profile.data as
          | { user_id: string; handle: string; display_name: string | null; map_sharing: unknown }
          | null;
        if (!row) {
          // Inexistant OU non consenti : un seul et même état (cf. en-tête).
          setIdentity(null);
          setRead({ kind: 'no_profile' });
          return;
        }
        setIdentity({ handle: row.handle, name: row.display_name ?? row.handle });

        const mapSharing = toMapSharing(row.map_sharing);
        // Il a refusé de partager sa carte : on ne DEMANDE même pas ses
        // territoires. Ne pas les lire vaut mieux que les lire puis les cacher —
        // une donnée qu'on n'a pas reçue ne peut pas se retrouver dans un cache.
        if (mapSharing === 'none') {
          setRead({ kind: 'loaded', mapSharing, zones: [], unreadable: 0 });
          return;
        }

        const territories = await supabase
          .from('public_territories')
          .select(TERRITORY_COLUMNS)
          .eq('owner_type', 'user')
          .eq('owner_id', row.user_id);
        if (cancelled) return;
        if (territories.error) {
          setRead({ kind: 'failed' });
          return;
        }

        const zones: RivalZoneRow[] = [];
        let unreadable = 0;
        for (const raw of (territories.data ?? []) as readonly Record<string, unknown>[]) {
          // Un état non peignable n'est pas une anomalie : ce n'est simplement
          // pas une possession en cours. Il n'entre donc pas dans `unreadable`,
          // qui compte les lignes qu'on AURAIT dû savoir dessiner.
          if (!PAINTABLE_STATES.has(raw.state as TerritoryDbState)) continue;
          const rings = parsePolygonRings(raw.geometry_generalized);
          if (!rings) {
            // Aucun repli : il n'existe PAS de géométrie exacte à servir ici, et
            // il ne doit pas en exister. La ligne est comptée, pas approchée.
            unreadable += 1;
            continue;
          }
          zones.push({
            id: String(raw.id),
            rings,
            areaM2: typeof raw.area_m2 === 'number' ? raw.area_m2 : Number.NaN,
            controlledSinceHourMs: toMs(raw.controlled_since_hour),
          });
        }
        setRead({ kind: 'loaded', mapSharing, zones, unreadable });
      } catch {
        if (!cancelled) setRead({ kind: 'failed' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handle, viewerId, sessionLoading, tick]);

  return { read, identity, reload };
}
