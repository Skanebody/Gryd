/**
 * GRYD — E49 · SORTIE CREW : le CÂBLAGE (React + Supabase). Aucune règle de jeu.
 *
 * Séparé de `crewOuting.ts` pour la même raison que `crewEditData.ts` l'est de
 * `crewEdit.ts` : les décisions sont pures et testées, ce fichier ne fait que
 * lire et écrire. Les deux appels passent par les RPC SECURITY DEFINER de la
 * migration 0085 — jamais une requête de table : `insert` sur `crew_events` est
 * révoqué depuis 0019 et le reste (0085 §7 le réaffirme).
 *
 * ─── CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS (doctrine) ──────────────────────
 *   · `signedOut`   → pas connecté ;
 *   · `loading`     → lecture EN COURS : n'affirme RIEN sur le crew ;
 *   · `failed`      → je n'ai PAS PU lire (réseau, backend absent) — n'affirme
 *                     rien, et surtout pas « tu n'as pas de crew » ;
 *   · `unsupported` → j'ai JOINT le serveur, et il ne connaît pas cette
 *                     fonction : la base de cet environnement n'a pas reçu
 *                     0085. C'est un fait sur le SERVEUR, pas sur le joueur, et
 *                     pas une panne de réseau. Sans ce cas, un backend en
 *                     retard s'afficherait comme un échec aléatoire à réessayer
 *                     indéfiniment ;
 *   · `refusal`     → le serveur a RÉPONDU et refusé, avec son motif (`no_crew`
 *                     est une réponse, pas une panne) ;
 *   · `ctx`         → lu, avec le rôle, le droit de créer et les sorties.
 *
 * ⚠️ POURQUOI `unsupported` N'EST PAS DU ZÈLE. `CREW_OUTING_WRITE_PATH_EXISTS`
 * (game-rules) dit que LE DÉPÔT sait publier. Il ne dit rien de la base d'un
 * environnement donné : une migration non appliquée est un état réel, et le
 * confondre avec « réessaie » ferait tourner quelqu'un en rond.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  outingRefusalOf,
  parseCrewOuting,
  parseOutingContext,
  type CrewOuting,
  type OutingContext,
  type OutingPayload,
  type OutingRefusal,
} from './crewOuting';
import type { MeetingPointRefusal } from './crewOuting';

/**
 * Le serveur ne connaît pas la fonction : PostgREST rend `PGRST202` (absente du
 * cache de schéma) et Postgres `42883` (undefined_function). On teste les deux
 * plutôt que de deviner lequel remonte — ils dépendent de la version du proxy.
 */
function isUnsupported(error: { code?: string | null; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === 'PGRST202' || code === '42883') return true;
  const msg = error.message ?? '';
  return /crew_outing_(context|create)/.test(msg) && /does not exist|not find/i.test(msg);
}

export interface CrewOutingState {
  signedOut: boolean;
  loading: boolean;
  /** Lecture IMPOSSIBLE — distinct de « le serveur a dit non ». */
  failed: boolean;
  /** Le serveur RÉPOND mais n'a pas la migration 0085. */
  unsupported: boolean;
  refusal: OutingRefusal | null;
  ctx: OutingContext | null;
  reload: () => void;
  /** Fond une sortie fraîchement publiée dans la liste, sans relire le serveur. */
  addOuting: (outing: CrewOuting) => void;
}

/** Lit le contexte : mon rôle, mon droit de créer, les sorties à venir du crew. */
export function useCrewOutingContext(): CrewOutingState {
  const { session } = useSession();
  const [ctx, setCtx] = useState<OutingContext | null>(null);
  const [refusal, setRefusal] = useState<OutingRefusal | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const ready = !!supabase && !!session;

  useEffect(() => {
    if (!ready || !supabase) {
      setCtx(null);
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
        const res = await client.rpc('crew_outing_context');
        if (cancelled) return;
        if (res.error) {
          setCtx(null);
          setRefusal(null);
          setUnsupported(isUnsupported(res.error));
          setFailed(!isUnsupported(res.error));
          return;
        }
        const parsed = parseOutingContext(res.data);
        if (parsed) {
          setCtx(parsed);
          setRefusal(null);
          setFailed(false);
          setUnsupported(false);
          return;
        }
        // Lu, mais ce n'est pas un contexte : soit un refus explicite, soit un
        // contrat inattendu. Les deux se disent, aucun ne se tait.
        const why = outingRefusalOf(res.data);
        setCtx(null);
        setRefusal(why);
        setUnsupported(false);
        setFailed(why === null);
      } catch {
        if (cancelled) return;
        setCtx(null);
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
  }, [ready, tick]);

  /**
   * Insère la sortie publiée à sa place dans la liste locale, triée par instant
   * croissant comme le fait le serveur. On ne la met PAS en tête : l'ordre de
   * la liste est un fait sur le calendrier, pas sur qui vient d'écrire.
   */
  const addOuting = useCallback((outing: CrewOuting) => {
    setCtx((prev) => {
      if (!prev) return prev;
      const without = prev.upcoming.filter((o) => o.id !== outing.id);
      const next = [...without, outing].sort((a, b) => {
        const ta = a.startsAt ? Date.parse(a.startsAt) : Number.MAX_SAFE_INTEGER;
        const tb = b.startsAt ? Date.parse(b.startsAt) : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      });
      return { ...prev, upcoming: next };
    });
  }, []);

  return { signedOut: !session, loading, failed, unsupported, refusal, ctx, reload, addOuting };
}

/** Ce que la publication a donné. Quatre issues, jamais confondues. */
export type PublishOutcome =
  | {
      kind: 'published';
      /** La sortie TELLE QUE LE SERVEUR l'a écrite — pas le brouillon local. */
      outing: CrewOuting;
      /**
       * Le serveur a reconnu un REJEU (même auteur, même instant, même titre) et
       * a rendu la ligne existante. Ce n'est pas un échec : c'est la preuve
       * qu'aucun doublon n'a été créé, et l'écran peut le dire sans alarmer.
       */
      duplicate: boolean;
    }
  | {
      kind: 'refused';
      refusal: OutingRefusal;
      /** Sur `place_looks_like_address` : lequel des deux motifs a mordu. */
      placeKind: MeetingPointRefusal | null;
      /** Sur `too_many_upcoming` : le plafond, pour le DIRE au lieu de le taire. */
      max: number | null;
    }
  /** Le serveur répond mais ne connaît pas la fonction (migration absente). */
  | { kind: 'unsupported' }
  /** Je n'ai pas pu joindre le serveur : je ne sais PAS si l'écriture a eu lieu. */
  | { kind: 'failed' };

/**
 * Publie la sortie. La charge utile vient de `outingPayloadOf`, qui ne doit
 * être appelé qu'après `outingBlockReason(...) === null`.
 *
 * Sur succès on rend la sortie TELLE QUE LE SERVEUR l'a écrite, jamais le
 * brouillon local : si le serveur a rogné des espaces ou normalisé un champ,
 * c'est SA version qui s'affiche. C'est aussi ce qui rend le rejeu honnête —
 * en cas de doublon, la ligne rendue est l'ORIGINALE, pas ce qu'on vient de
 * taper.
 */
export async function publishOuting(payload: OutingPayload): Promise<PublishOutcome> {
  if (!supabase) return { kind: 'failed' };
  try {
    const res = await supabase.rpc('crew_outing_create', payload);
    if (res.error) return isUnsupported(res.error) ? { kind: 'unsupported' } : { kind: 'failed' };

    const data = res.data as Record<string, unknown> | null;
    if (data && data.ok === true) {
      const outing = parseCrewOuting(data.outing);
      // Le serveur dit « ok » mais rend une sortie illisible : on ne fabrique
      // pas la ligne manquante. `failed` invite à rouvrir l'écran, ce qui
      // relira la vérité au lieu de l'inventer.
      if (!outing) return { kind: 'failed' };
      return { kind: 'published', outing, duplicate: data.duplicate === true };
    }

    const why = outingRefusalOf(res.data);
    if (why) {
      const kind = data?.kind;
      return {
        kind: 'refused',
        refusal: why,
        placeKind:
          kind === 'street_address' || kind === 'door_detail'
            ? (kind as MeetingPointRefusal)
            : null,
        max: typeof data?.max === 'number' ? data.max : null,
      };
    }
    return { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}
