/**
 * GRYD — ÉDITION DE CREW : le CÂBLAGE (React + Supabase). Aucune règle de jeu.
 *
 * Séparé de `crewEdit.ts` pour la même raison que `discoveryData.ts` l'est de
 * `discovery.ts` : les décisions sont pures et testées, ce fichier ne fait que
 * lire et écrire. Les deux appels passent par les RPC SECURITY DEFINER de la
 * migration 0084 — jamais une requête de table : `select` sur `crews` est
 * révoqué depuis 0036 (le code d'invitation y est un secret), et `update` l'est
 * intégralement depuis 0084.
 *
 * ─── QUATRE ÉTATS DISTINCTS, JAMAIS CONFONDUS (doctrine) ────────────────────
 *   · `signedOut` → pas connecté ;
 *   · `loading`   → lecture EN COURS : n'affirme RIEN sur le crew ;
 *   · `failed`    → je n'ai PAS PU lire (réseau, backend absent) — cet état
 *                   n'affirme rien non plus, et surtout pas « tu n'as pas de
 *                   crew » ;
 *   · `refusal`   → le serveur a RÉPONDU et refusé, avec son motif (`no_crew`
 *                   est une réponse, pas une panne) ;
 *   · `ctx`       → lu, avec le crew et les droits.
 * Confondre `failed` et `refusal: 'no_crew'` serait le mensonge le plus facile
 * de cet écran : « je n'ai pas pu lire » deviendrait « tu n'es dans aucun crew ».
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  parseEditContext,
  parseEditableCrew,
  refusalOf,
  shortfallOf,
  type EditContext,
  type EditPayload,
  type EditRefusal,
  type EditableCrew,
} from './crewEdit';

export interface CrewEditState {
  signedOut: boolean;
  loading: boolean;
  /** Lecture IMPOSSIBLE — distinct de « le serveur a dit non ». */
  failed: boolean;
  refusal: EditRefusal | null;
  ctx: EditContext | null;
  reload: () => void;
}

/** Lit le contexte d'édition : le crew, mes droits PAR CHAMP, le coût, le solde. */
export function useCrewEditContext(): CrewEditState {
  const { session } = useSession();
  const [ctx, setCtx] = useState<EditContext | null>(null);
  const [refusal, setRefusal] = useState<EditRefusal | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const ready = !!supabase && !!session;

  useEffect(() => {
    if (!ready || !supabase) {
      setCtx(null);
      setRefusal(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await client.rpc('crew_edit_context');
        if (cancelled) return;
        if (res.error) {
          setCtx(null);
          setRefusal(null);
          setFailed(true);
          return;
        }
        const parsed = parseEditContext(res.data);
        if (parsed) {
          setCtx(parsed);
          setRefusal(null);
          setFailed(false);
          return;
        }
        // Lu, mais ce n'est pas un contexte : soit un refus explicite, soit un
        // contrat inattendu. Les deux se disent, aucun ne se tait.
        const why = refusalOf(res.data);
        setCtx(null);
        setRefusal(why);
        setFailed(why === null);
      } catch {
        if (cancelled) return;
        setCtx(null);
        setRefusal(null);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, tick]);

  return { signedOut: !session, loading, failed, refusal, ctx, reload };
}

/** Ce que l'enregistrement a donné. Trois issues, jamais confondues. */
export type SaveOutcome =
  | {
      kind: 'saved';
      /** Le crew TEL QUE LE SERVEUR l'a écrit — pas le brouillon local. */
      crew: EditableCrew;
      renamed: boolean;
      fouleesSpent: number;
      fouleesLeft: number;
    }
  | { kind: 'refused'; refusal: EditRefusal; shortfall: { need: number; have: number } | null }
  /** Je n'ai pas pu joindre le serveur : je ne sais PAS si l'édition a eu lieu. */
  | { kind: 'failed' };

/**
 * Envoie l'édition. La charge utile vient de `payloadOf` : `null` sur tout champ
 * intouché, pour qu'aucun renommage ne parte d'un écran qui n'a pas renommé.
 *
 * Sur succès on rend le crew TEL QUE LE SERVEUR l'a écrit, jamais le brouillon
 * local : si le serveur a rogné des espaces ou trié des tags, c'est SA version
 * qui s'affiche. On ne reconstruit PAS un `EditContext` complet ici — le rôle,
 * les droits et le coût du renommage appartiennent à `crew_edit_context` et
 * n'ont aucune raison d'être devinés par le chemin d'écriture. L'appelant fond
 * ce crew dans le contexte qu'il détient déjà.
 */
export async function saveCrewEdit(payload: EditPayload): Promise<SaveOutcome> {
  if (!supabase) return { kind: 'failed' };
  try {
    const res = await supabase.rpc('crew_edit', payload);
    if (res.error) return { kind: 'failed' };

    const data = res.data as Record<string, unknown> | null;
    if (data && data.ok === true) {
      const crew = parseEditableCrew(data.crew);
      if (!crew) return { kind: 'failed' };
      return {
        kind: 'saved',
        crew,
        renamed: data.renamed === true,
        fouleesSpent: typeof data.fouleesSpent === 'number' ? data.fouleesSpent : 0,
        fouleesLeft: typeof data.fouleesLeft === 'number' ? data.fouleesLeft : 0,
      };
    }

    const why = refusalOf(res.data);
    if (why) return { kind: 'refused', refusal: why, shortfall: shortfallOf(res.data) };
    return { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}
