/**
 * GRYD — E61 « Fin de saison » : câblage React du FAIT SERVEUR de clôture.
 *
 * ─── L'ÉCRAN NE S'OUVRE QUE SUR UNE PREUVE ──────────────────────────────────
 * E61 est une CÉLÉBRATION. La constitution interdit de la déclencher sur un
 * calcul client : elle ne s'affiche donc que si `season_close` a réellement
 * inséré la notification de clôture de CE joueur (`notifications`, type
 * 'season', RLS owner-only 0006). Pas de ligne ⇒ pas de bilan ⇒ l'écran le dit.
 * Rien n'est recalculé côté client : le rang final vient du payload que le
 * serveur a gelé.
 *
 * ─── UN SEUL VERDICT, JAMAIS D'ÉCHEC PARTIEL ────────────────────────────────
 * Cinq lectures composent le bilan (la notification, la saison close, le
 * registre de sa ville, le nombre de classés, mes courses de la fenêtre). Si
 * l'une échoue, le hook passe 'failed' et ne rend RIEN : afficher « #3 » sans le
 * total, ou un bilan sportif tronqué, serait une sous-déclaration silencieuse —
 * c'est-à-dire un mensonge (même règle que `useActivityEvents`).
 *
 * ─── LES CINQ ÉTATS ──────────────────────────────────────────────────────────
 *  · 'signed-out' — pas de compte : un bilan appartient à un compte ;
 *  · 'loading'    — lecture en vol / session en hydratation ;
 *  · 'failed'     — une lecture a échoué : on le dit, on propose de réessayer ;
 *  · 'none'       — LU, et aucune clôture ne concerne ce joueur. L'état DOMINANT
 *                   aujourd'hui (la base est vide, aucune saison n'a été close) ;
 *  · 'ready'      — un bilan réel existe.
 *
 * ─── UN RANG APPARTIENT À UNE DISCIPLINE, ET ELLE SE CHOISIT (28/07/2026) ───
 * `season_close` insère UNE notification 'season' PAR DISCIPLINE JOUÉE
 * (season_close/index.ts : une ligne par résultat). Ce hook n'en lisait qu'UNE
 * — `order('created_at', desc).limit(1)` — donc, pour un athlète hybride dont
 * les deux notifications sont insérées dans le MÊME batch, l'horodatage
 * départageait ARBITRAIREMENT. L'écran affichait « #17 sur 42 » sans jamais
 * dire « Vélo », et le bilan juste dessous était silencieusement borné à cette
 * discipline sous des libellés génériques. C'est mot pour mot la faute que
 * `economy.ts` décrit (« le joueur lisait “mes points de saison” alors qu'il
 * lisait “mon meilleur des deux mondes” »), en version « le plus récent des
 * deux » — et la seule désambiguïsation que le serveur avait produite (le
 * `body` qui nomme le monde) est jetée, à raison, pour cause d'i18n.
 *
 * Le hook lit donc TOUTES les clôtures récentes, garde celles de la MÊME saison
 * (la plus récente), expose `available` et laisse l'écran CHOISIR. Aucun
 * mélange, aucune somme : E14 interdit d'additionner les disciplines, et
 * afficher l'une pour l'autre est la même faute en plus discret.
 *
 * ─── « RÉCUPÉRER » N'EXISTE PAS, ET C'EST ASSUMÉ ─────────────────────────────
 * Les médailles sont déjà dans `user_badges` : `season_close` les a écrites en
 * service_role. `acknowledge()` ne réclame RIEN — il pose `read_at` sur MA
 * notification (le seul droit d'écriture que la RLS accorde au client, 0006 :
 * `grant update (read_at)`). C'est un accusé de réception, et le libellé du CTA
 * le dit (`ctaVoirMesBadges`) au lieu de mimer un claim inexistant.
 */
import { useCallback, useEffect, useState } from 'react';
import { ACTIVITIES, type Activity } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  parseSeasonRecap,
  seasonRecapSummary,
  type RecapRunRow,
  type SeasonRecap,
  type SeasonRecapSummary,
} from './seasonRecap';
import { nextSeasonAfter, seasonLedger, type SeasonLedgerRow } from './seasonLedger';

export type SeasonRecapStatus = 'signed-out' | 'loading' | 'failed' | 'none' | 'ready';

export interface SeasonRecapView {
  /** Le fait serveur : rang final, ex æquo, points, date du wipe. */
  recap: SeasonRecap;
  /** La saison close elle-même (numéro dérivé comme en SQL, bornes réelles). */
  season: SeasonLedgerRow;
  /** La saison suivante SI elle existe déjà en base — jamais extrapolée. */
  next: SeasonLedgerRow | null;
  /** Nombre de joueurs classés dans CETTE discipline (le « sur {total} »). */
  total: number;
  /** Mon bilan sportif de la fenêtre (sorties, jours actifs, distance). */
  summary: SeasonRecapSummary;
  /** Identifiant de MA notification, pour l'accusé de réception. */
  notificationId: string;
  /**
   * Les disciplines pour lesquelles CETTE saison a produit un résultat, dans
   * l'ordre de `ACTIVITIES`. Une seule dans le cas normal ; deux pour un
   * athlète hybride. L'écran s'en sert pour NOMMER ce qu'il montre et, s'il y
   * en a deux, pour permettre de passer de l'un à l'autre — jamais pour les
   * additionner.
   */
  available: readonly Activity[];
}

export interface UseSeasonRecapResult {
  status: SeasonRecapStatus;
  view: SeasonRecapView | null;
  reload: () => void;
  /** Choisir la discipline lue, parmi `view.available`. Sans effet si absente. */
  select: (activity: Activity) => void;
  /** Pose `read_at` sur ma notification. Silencieux : rien à l'écran n'en dépend. */
  acknowledge: () => void;
}

/** Plafond de lecture des courses d'une saison (8 semaines — jamais des milliers). */
const RUN_READ_LIMIT = 500;
const SEASON_READ_LIMIT = 50;

export function useSeasonRecap(): UseSeasonRecapResult {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [status, setStatus] = useState<SeasonRecapStatus>('loading');
  const [view, setView] = useState<SeasonRecapView | null>(null);
  const [tick, setTick] = useState(0);
  /**
   * Discipline DEMANDÉE par l'écran. `null` = « celle que le serveur a rendue
   * en premier » — on ne présume rien avant d'avoir lu. Ce n'est pas la lentille
   * globale (`useActivityLens`) : un bilan de saison close ne se filtre pas par
   * une préférence d'affichage, il n'existe que pour les disciplines réellement
   * classées.
   */
  const [wanted, setWanted] = useState<Activity | null>(null);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  const acknowledge = useCallback(() => {
    const id = view?.notificationId;
    if (!supabase || !id) return;
    // Écriture la plus étroite que la RLS permette : `read_at` sur MA ligne.
    void supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => undefined, () => undefined);
  }, [view]);

  useEffect(() => {
    if (configured && sessionLoading && !userId) {
      setStatus('loading');
      return;
    }
    if (!configured || !supabase || !userId) {
      setView(null);
      setStatus('signed-out');
      return;
    }
    const client = supabase;
    let cancelled = false;
    setStatus('loading');

    void (async () => {
      try {
        // 1. LE FAIT SERVEUR. Les clôtures récentes qui me concernent —
        //    `season_close` en insère UNE PAR DISCIPLINE jouée, donc lire une
        //    seule ligne revenait à laisser `created_at` choisir le monde
        //    affiché, en silence. On lit `ACTIVITIES.length` lignes : le nombre
        //    exact de résultats qu'une saison peut produire pour une personne.
        const notif = await client
          .from('notifications')
          .select('id, payload, created_at')
          .eq('user_id', userId)
          .eq('type', 'season')
          .order('created_at', { ascending: false })
          .limit(ACTIVITIES.length);
        if (cancelled) return;
        if (notif.error) {
          setStatus('failed');
          return;
        }

        // Les lignes exploitables, dans l'ordre rendu (la plus récente d'abord).
        const parsed = (notif.data ?? [])
          .map((row) => ({
            recap: parseSeasonRecap(row?.payload ?? null),
            notificationId: typeof row?.id === 'string' ? row.id : null,
          }))
          .filter(
            (r): r is { recap: SeasonRecap; notificationId: string } =>
              r.recap !== null && r.notificationId !== null,
          );
        const latest = parsed[0];
        if (latest === undefined) {
          // Lu, et rien ne me concerne : état vide HONNÊTE, distinct d'un échec.
          setView(null);
          setStatus('none');
          return;
        }

        // Une seule saison à la fois : celle de la clôture la plus récente. Deux
        // saisons différentes dans la même fenêtre de lecture (une ville qui
        // clôture pendant qu'une autre l'a fait la veille) ne se mélangent pas.
        const sameSeason = parsed.filter((r) => r.recap.seasonId === latest.recap.seasonId);
        const available = ACTIVITIES.filter((a) => sameSeason.some((r) => r.recap.activity === a));
        // La discipline DEMANDÉE si elle existe, sinon la plus récente. Jamais un
        // défaut codé en dur : `run` inventerait un résultat que le serveur
        // n'aurait pas produit.
        const chosen =
          (wanted === null ? undefined : sameSeason.find((r) => r.recap.activity === wanted)) ??
          latest;
        const recap = chosen.recap;
        const notificationId = chosen.notificationId;

        // 2. La saison close (pour sa ville et ses bornes réelles).
        const seasonRow = await client
          .from('seasons')
          .select('id, city_id, starts_at, ends_at, status')
          .eq('id', recap.seasonId)
          .maybeSingle();
        if (cancelled) return;
        if (seasonRow.error || !seasonRow.data) {
          setStatus('failed');
          return;
        }
        const cityId = typeof seasonRow.data.city_id === 'string' ? seasonRow.data.city_id : null;
        if (cityId === null) {
          setStatus('failed');
          return;
        }

        // 3. Le registre de sa ville : numéro de saison + saison suivante.
        const [cityRows, ranked, runs] = await Promise.all([
          client
            .from('seasons')
            .select('id, city_id, starts_at, ends_at, status')
            .eq('city_id', cityId)
            .order('starts_at', { ascending: true })
            .limit(SEASON_READ_LIMIT),
          // 4. Le « sur {total} » : les classés de CETTE discipline, jamais les deux.
          client
            .from('season_scores')
            .select('user_id', { count: 'exact', head: true })
            .eq('season_id', recap.seasonId)
            .eq('activity', recap.activity),
          // 5. Mon bilan sportif, borné à la fenêtre RÉELLE de la saison.
          client
            .from('runs')
            .select('started_at, distance_m, status, activity')
            .eq('user_id', userId)
            .gte('started_at', seasonRow.data.starts_at as string)
            .lt('started_at', seasonRow.data.ends_at as string)
            .limit(RUN_READ_LIMIT),
        ]);
        if (cancelled) return;
        if (cityRows.error || ranked.error || runs.error) {
          setStatus('failed');
          return;
        }

        const ledger = seasonLedger(cityRows.data ?? []);
        const season = ledger.find((s) => s.seasonId === recap.seasonId);
        if (season === undefined) {
          // La saison close n'est pas dans le registre de sa propre ville : on ne
          // sait plus de quoi on parle. On ne devine pas un numéro.
          setStatus('failed');
          return;
        }

        const runRows: RecapRunRow[] = (runs.data ?? []).map((r) => ({
          startedAt: typeof r.started_at === 'string' ? r.started_at : '',
          distanceM: typeof r.distance_m === 'number' ? r.distance_m : 0,
          status: typeof r.status === 'string' ? r.status : '',
          activity: typeof r.activity === 'string' ? r.activity : '',
        }));

        // « #3 SUR COMBIEN ? » — sans le total, la phrase de rang final n'est pas
        // dite. Retomber sur mon propre rang afficherait « #3 sur 3 » : un
        // classement INVENTÉ, et le pire moment pour en inventer un. Pas de
        // total ⇒ échec de lecture, comme les quatre autres.
        if (ranked.count === null || ranked.count === undefined) {
          setStatus('failed');
          return;
        }

        setView({
          recap,
          season,
          next: nextSeasonAfter(ledger, season),
          // Garde-fou : un total inférieur à mon rang serait incohérent (le
          // serveur ne peut pas m'avoir classé n°5 sur 3).
          total: Math.max(ranked.count, recap.rank),
          summary: seasonRecapSummary(runRows, recap.activity),
          notificationId,
          available,
        });
        setStatus('ready');
      } catch {
        if (cancelled) return;
        setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, sessionLoading, userId, tick, wanted]);

  /**
   * Basculer de discipline. On ne remet PAS `status` à 'loading' à la main :
   * l'effet le fait, et un état intermédiaire posé ici pourrait survivre à un
   * effet annulé. Choisir une discipline absente ne fait rien — l'écran ne peint
   * le commutateur que sur `view.available`, donc le cas ne devrait pas exister,
   * mais un hook ne se repose pas sur la discipline de son appelant.
   */
  const select = useCallback((activity: Activity) => {
    setWanted((current) => (current === activity ? current : activity));
  }, []);

  return { status, view, reload, select, acknowledge };
}
