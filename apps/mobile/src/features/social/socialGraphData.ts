/**
 * GRYD — E57 / E58 : le CÂBLAGE (React + Supabase). Aucune règle de jeu.
 *
 * Séparé de `socialGraph.ts` pour la même raison que `crewOutingData.ts` l'est
 * de `crewOuting.ts` : ce qui se DÉCIDE est pur et testé en Deno, ce fichier ne
 * fait que lire et écrire. Tous les appels passent par les RPC SECURITY DEFINER
 * de la migration 0088 — jamais une requête de table : `insert/update/delete`
 * sont révoqués sur `follows`, `duels` ET `friendships` (0011 puis 0088 §15).
 *
 * ─── CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS (doctrine) ──────────────────────
 *   · `signedOut`   → pas connecté ;
 *   · `loading`     → lecture EN COURS : n'affirme RIEN sur le joueur ;
 *   · `failed`      → je n'ai PAS PU lire — n'affirme rien, et surtout pas
 *                     « tu n'as aucun ami » ;
 *   · `unsupported` → j'ai JOINT le serveur et il ne connaît pas la fonction :
 *                     la base de cet environnement n'a pas reçu 0088. C'est un
 *                     fait sur le SERVEUR, pas sur le joueur, et pas une panne
 *                     réseau à réessayer indéfiniment ;
 *   · `graph`/`inbox` → lu. Une liste vide y est alors une VÉRITÉ, pas un trou.
 *
 * ⚠️ CE QUE CE FICHIER NE FAIT JAMAIS : conclure « tu n'as personne » depuis un
 * échec. Les quatre premiers états rendent `graph = null`, et c'est l'écran qui
 * choisit une phrase par état. Le seul cas où « tu n'as personne » se dit est
 * `graph !== null && isEmptyGraph(graph)`.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  parseDuelInbox,
  parseSocialGraph,
  socialRefusalOf,
  type DuelInbox,
  type DuelPayload,
  type SocialGraph,
  type SocialRefusal,
} from './socialGraph';

/**
 * Le serveur ne connaît pas la fonction : PostgREST rend `PGRST202` (absente du
 * cache de schéma) et Postgres `42883` (undefined_function). On teste les deux
 * plutôt que de deviner lequel remonte — ils dépendent de la version du proxy.
 * (Même garde que `crewOutingData.ts`, et pour la même raison.)
 */
const RPC_NAMES =
  /(social_graph|follow_user|unfollow_user|friend_request|friend_respond|duel_create|duel_respond|duel_cancel|duel_inbox)/;

function isUnsupported(error: { code?: string | null; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === 'PGRST202' || code === '42883') return true;
  const msg = error.message ?? '';
  return RPC_NAMES.test(msg) && /does not exist|not find/i.test(msg);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LECTURE
// ═══════════════════════════════════════════════════════════════════════════

export interface SocialState<T> {
  signedOut: boolean;
  /**
   * UN BACKEND EST-IL RELIÉ ? (`isSupabaseConfigured`, supabase.ts:60.)
   *
   * SANS LUI, `signedOut` EST VRAI SANS QU'IL Y AIT DE COMPTE À REJOINDRE — et
   * proposer « Se connecter » serait un bouton mort : `/sign-in` fait
   * `if (session || !configured) return <Redirect href="/" />`
   * (app/(auth)/sign-in.tsx), donc le tap éjecte la personne sur la carte sans
   * un mot. C'est exactement le cas d'un build/preview sans `.env` (les `.env`
   * sont gitignorés), c'est-à-dire l'instrument de preview du fondateur.
   * L'écran DOIT donc dériver son CTA de la capacité RÉELLE, pas de l'absence
   * de session — même patron que `activite.tsx` (`configured ? cta : rien`).
   */
  configured: boolean;
  loading: boolean;
  /** Lecture IMPOSSIBLE — distinct de « le serveur a dit non ». */
  failed: boolean;
  /** Le serveur RÉPOND mais n'a pas la migration 0088. */
  unsupported: boolean;
  /** Le serveur a RÉPONDU et refusé (`signed_out` est une réponse, pas une panne). */
  refusal: SocialRefusal | null;
  data: T | null;
  reload: () => void;
}

/** Fabrique de hook de lecture : `social_graph()` et `duel_inbox()` ne diffèrent
 *  que par leur nom de RPC et leur lecteur. Deux copies auraient divergé sur la
 *  gestion des états — la partie la plus facile à bâcler. */
function useRpcRead<T>(rpc: string, parse: (raw: unknown) => T | null): SocialState<T> {
  const { session } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [refusal, setRefusal] = useState<SocialRefusal | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  const ready = !!supabase && !!session;

  useEffect(() => {
    if (!ready || !supabase) {
      setData(null);
      setRefusal(null);
      setLoading(false);
      setFailed(false);
      setUnsupported(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await client.rpc(rpc);
        if (cancelled) return;
        if (res.error) {
          const missing = isUnsupported(res.error);
          setData(null);
          setRefusal(null);
          setUnsupported(missing);
          setFailed(!missing);
          return;
        }
        const parsed = parse(res.data);
        if (parsed) {
          setData(parsed);
          setRefusal(null);
          setFailed(false);
          setUnsupported(false);
          return;
        }
        // Lu, mais ce n'est pas la forme attendue : soit un refus explicite,
        // soit un contrat inattendu. Les deux se DISENT, aucun ne se tait.
        const why = socialRefusalOf(res.data);
        setData(null);
        setRefusal(why);
        setUnsupported(false);
        setFailed(why === null);
      } catch {
        if (cancelled) return;
        setData(null);
        setRefusal(null);
        setUnsupported(false);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, rpc, parse, tick]);

  return {
    signedOut: !session,
    configured: !!supabase,
    loading,
    failed,
    unsupported,
    refusal,
    data,
    reload,
  };
}

/** E57 — mes suivis, abonnés, amis et demandes. */
export function useSocialGraph(): SocialState<SocialGraph> {
  return useRpcRead('social_graph', parseSocialGraph);
}

/** E58 — mes défis reçus, envoyés et en cours. */
export function useDuelInbox(): SocialState<DuelInbox> {
  return useRpcRead('duel_inbox', parseDuelInbox);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ÉCRITURE — quatre issues, jamais confondues
// ═══════════════════════════════════════════════════════════════════════════

export type SocialOutcome<T = Record<string, unknown>> =
  /** Le serveur a écrit. `already` = c'était déjà le cas (idempotence, pas un échec). */
  | { kind: 'done'; already: boolean; data: T }
  /** Le serveur a RÉPONDU et refusé, avec son motif. */
  | { kind: 'refused'; refusal: SocialRefusal; data: Record<string, unknown> }
  /** Le serveur répond mais ne connaît pas la fonction (migration absente). */
  | { kind: 'unsupported' }
  /** Je n'ai pas pu joindre le serveur : je ne SAIS PAS si l'écriture a eu lieu. */
  | { kind: 'failed' };

async function callWrite(
  rpc: string,
  params: Record<string, unknown>,
): Promise<SocialOutcome> {
  if (!supabase) return { kind: 'failed' };
  try {
    const res = await supabase.rpc(rpc, params);
    if (res.error) return isUnsupported(res.error) ? { kind: 'unsupported' } : { kind: 'failed' };
    const data = (res.data ?? null) as Record<string, unknown> | null;
    if (data && data.ok === true) {
      return { kind: 'done', already: data.already === true, data };
    }
    const why = socialRefusalOf(res.data);
    // `why === null` sur une réponse qui n'est pas `ok:true` = contrat
    // inattendu. On ne le déguise pas en refus : on dit qu'on n'a pas su lire.
    if (!why) return { kind: 'failed' };
    return { kind: 'refused', refusal: why, data: data ?? {} };
  } catch {
    return { kind: 'failed' };
  }
}

/** Suivre quelqu'un dont on a le @handle (E57). */
export const followUser = (handle: string): Promise<SocialOutcome> =>
  callWrite('follow_user', { p_handle: handle });

/** Se désabonner — toujours possible, sans condition (0088 §10). */
export const unfollowUser = (handle: string): Promise<SocialOutcome> =>
  callWrite('unfollow_user', { p_handle: handle });

/** Demander en ami (E57). Une DEMANDE : elle n'établit rien. */
export const requestFriend = (handle: string): Promise<SocialOutcome> =>
  callWrite('friend_request', { p_handle: handle });

/** Répondre à une demande REÇUE. `accept: false` ne demande aucun motif. */
export const respondFriend = (requestId: string, accept: boolean): Promise<SocialOutcome> =>
  callWrite('friend_respond', { p_request_id: requestId, p_accept: accept });

/** Envoyer un défi (E58). La charge vient de `duelPayload`, jamais du hasard. */
export const createDuel = (payload: DuelPayload): Promise<SocialOutcome> =>
  callWrite('duel_create', payload as unknown as Record<string, unknown>);

/** Accepter ou refuser un défi REÇU. Refuser est UN TAP, sans motif. */
export const respondDuel = (duelId: string, accept: boolean): Promise<SocialOutcome> =>
  callWrite('duel_respond', { p_duel_id: duelId, p_accept: accept });

/** Retirer un défi qu'on a envoyé, tant qu'il n'a pas reçu de réponse. */
export const cancelDuel = (duelId: string): Promise<SocialOutcome> =>
  callWrite('duel_cancel', { p_duel_id: duelId });
