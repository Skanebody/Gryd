/**
 * GRYD — E48 · ACTIVITÉ ET ANNONCES CREW : le CÂBLAGE (React + Supabase).
 * Aucune règle : les décisions vivent dans `crewActivity.ts`, pures et testées.
 *
 * Séparé pour la même raison que `crewOutingData.ts` l'est de `crewOuting.ts`.
 *
 * ─── CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS (doctrine) ─────────────────────
 *   · `signedOut`   → pas connecté ;
 *   · `loading`     → lecture EN COURS : n'affirme RIEN sur le crew ;
 *   · `failed`      → je n'ai PAS PU lire — n'affirme rien, et surtout pas
 *                     « ton crew n'a rien publié » ;
 *   · `unsupported` → j'ai JOINT le serveur, et il ne connaît pas cette
 *                     fonction : la base de cet environnement n'a pas reçu
 *                     0096. C'est un fait sur le SERVEUR, pas sur le joueur, et
 *                     réessayer n'y changera rien ;
 *   · `refusal`     → le serveur a RÉPONDU et refusé, avec son motif (`no_crew`
 *                     est une réponse, pas une panne) ;
 *   · `ctx`         → lu. Les listes peuvent être vides : c'est l'état CALME,
 *                     un fait — pas un chargement, pas un échec.
 *
 * ─── DEUX LECTURES, UN SEUL VERDICT ───────────────────────────────────────
 * L'écran a besoin du fil (annonces + faits, RPC 0096) ET des sorties à venir
 * (`crew_outing_context`, 0085, lu par le hook d'E49 qu'on RÉUTILISE tel quel).
 * Si l'une échoue, l'écran ne rend pas l'autre à moitié : « échec partiel »
 * n'existe pas — rendre les annonces sans les sorties dirait « aucun rendez-vous
 * prévu » à quelqu'un qui en a un ce soir. Même règle que `useActivityEvents`
 * (E23) et `premium/analytics/read.ts`. La composition se fait dans l'écran, qui
 * dispose des deux états ; ce module ne prétend pas les fusionner à sa place.
 *
 * ─── AUCUN REPLI LOCAL, JAMAIS ────────────────────────────────────────────
 * Même règle dure que `pings.ts` : pas de session, pas de backend, lecture
 * ratée ⇒ AUCUNE ligne. Une annonce affichée sans être partie au crew serait le
 * mensonge exact que la doctrine interdit (« KORO a annoncé… » alors que
 * personne d'autre ne le voit).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  activityRefusalKindOf,
  activityRefusalOf,
  parseCrewActivityContext,
  parseCrewAnnouncement,
  type AnnouncementPrivacyRefusal,
  type CrewActivityContext,
  type CrewActivityRefusal,
  type CrewAnnouncement,
} from './crewActivity';

/**
 * Le serveur ne connaît pas la fonction : PostgREST rend `PGRST202` (absente du
 * cache de schéma) et Postgres `42883` (undefined_function). On teste les deux
 * plutôt que de deviner lequel remonte — ils dépendent de la version du proxy.
 * Patron `crewOutingData.ts`.
 */
function isUnsupported(error: { code?: string | null; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === 'PGRST202' || code === '42883') return true;
  const msg = error.message ?? '';
  return /crew_(activity_feed|announcement_post|announcement_remove)/.test(msg)
    && /does not exist|not find/i.test(msg);
}

export interface CrewActivityState {
  signedOut: boolean;
  loading: boolean;
  /** Lecture IMPOSSIBLE — distinct de « le serveur a dit non ». */
  failed: boolean;
  /** Le serveur RÉPOND mais n'a pas la migration 0096. */
  unsupported: boolean;
  refusal: CrewActivityRefusal | null;
  ctx: CrewActivityContext | null;
  reload: () => void;
  /** Fond une annonce fraîchement publiée en tête, sans relire le serveur. */
  addAnnouncement: (a: CrewAnnouncement) => void;
  /** Retire une annonce de la liste locale après un retrait confirmé serveur. */
  dropAnnouncement: (id: string) => void;
}

/** Lit le fil : mon rôle, mon droit d'épingler, les annonces et les faits. */
export function useCrewActivity(): CrewActivityState {
  const { session } = useSession();
  const [ctx, setCtx] = useState<CrewActivityContext | null>(null);
  const [refusal, setRefusal] = useState<CrewActivityRefusal | null>(null);
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
        const res = await client.rpc('crew_activity_feed');
        if (cancelled) return;
        if (res.error) {
          const missing = isUnsupported(res.error);
          setCtx(null);
          setRefusal(null);
          setUnsupported(missing);
          setFailed(!missing);
          return;
        }
        const parsed = parseCrewActivityContext(res.data);
        if (parsed) {
          setCtx(parsed);
          setRefusal(null);
          setFailed(false);
          setUnsupported(false);
          return;
        }
        // Lu, mais ce n'est pas un contexte : soit un refus explicite, soit un
        // contrat inattendu. Les deux se disent, aucun ne se tait.
        const why = activityRefusalOf(res.data);
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
   * En TÊTE, et non triée comme les sorties : le fil des annonces est
   * chronologique décroissant, la dernière publiée est donc bien la première.
   * Un `id` déjà présent est remplacé — c'est le cas du REJEU, où le serveur
   * rend la ligne d'origine.
   */
  const addAnnouncement = useCallback((a: CrewAnnouncement) => {
    setCtx((prev) => {
      if (!prev) return prev;
      const without = prev.announcements.filter((x) => x.id !== a.id);
      return { ...prev, announcements: [a, ...without] };
    });
  }, []);

  const dropAnnouncement = useCallback((id: string) => {
    setCtx((prev) =>
      prev ? { ...prev, announcements: prev.announcements.filter((a) => a.id !== id) } : prev,
    );
  }, []);

  return {
    signedOut: !session,
    loading,
    failed,
    unsupported,
    refusal,
    ctx,
    reload,
    addAnnouncement,
    dropAnnouncement,
  };
}

/** Ce que la publication a donné. Quatre issues, jamais confondues. */
export type AnnouncementOutcome =
  | {
      kind: 'published';
      /** L'annonce TELLE QUE LE SERVEUR l'a écrite — pas le brouillon local. */
      announcement: CrewAnnouncement;
      /**
       * Le serveur a reconnu un REJEU (même auteur, même corps normalisé) et a
       * rendu la ligne existante. Ce n'est pas un échec : c'est la preuve
       * qu'aucun doublon n'a été créé.
       */
      duplicate: boolean;
    }
  | {
      kind: 'refused';
      refusal: CrewActivityRefusal;
      /** Sur `body_looks_like_place` : lequel des trois motifs a mordu. */
      placeKind: AnnouncementPrivacyRefusal | null;
      /** Sur `too_many_active` / `bad_body` : la borne, pour la DIRE. */
      max: number | null;
    }
  /** Le serveur répond mais ne connaît pas la fonction (migration absente). */
  | { kind: 'unsupported' }
  /** Je n'ai pas pu joindre le serveur : je ne sais PAS si l'écriture a eu lieu. */
  | { kind: 'failed' };

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * Publie une annonce. Le corps ne doit partir qu'après
 * `announcementBlockReason(...) === null` — mais le serveur retranche tout, et
 * peut refuser pour un motif que le client n'anticipe pas (la MODÉRATION de
 * langage, délibérément absente du client : cf. `crewActivity.ts`).
 *
 * Sur succès on rend l'annonce TELLE QUE LE SERVEUR l'a écrite, jamais le
 * brouillon : si le serveur a détouré des espaces, c'est SA version qui
 * s'affiche. C'est aussi ce qui rend le rejeu honnête — en cas de doublon, la
 * ligne rendue est l'ORIGINALE, pas ce qu'on vient de taper.
 */
export async function postAnnouncement(body: string): Promise<AnnouncementOutcome> {
  if (!supabase) return { kind: 'failed' };
  try {
    const res = await supabase.rpc('crew_announcement_post', { p_body: body });
    if (res.error) return isUnsupported(res.error) ? { kind: 'unsupported' } : { kind: 'failed' };

    const data = res.data as Record<string, unknown> | null;
    const refusal = activityRefusalOf(data);
    if (refusal) {
      return {
        kind: 'refused',
        refusal,
        placeKind: activityRefusalKindOf(data),
        max: numOrNull(data?.max),
      };
    }
    const announcement = parseCrewAnnouncement(data?.announcement);
    // Le serveur a dit `ok` mais la ligne n'a pas la forme attendue : on ne
    // fabrique pas une annonce à partir du brouillon local pour « sauver »
    // l'affichage. On dit qu'on ne sait pas.
    if (!announcement) return { kind: 'failed' };
    return { kind: 'published', announcement, duplicate: data?.duplicate === true };
  } catch {
    return { kind: 'failed' };
  }
}

/** Ce que le retrait a donné. `alreadyRemoved` n'est PAS un échec. */
export type RemoveOutcome =
  | { kind: 'removed'; alreadyRemoved: boolean }
  | { kind: 'refused'; refusal: CrewActivityRefusal }
  | { kind: 'unsupported' }
  | { kind: 'failed' };

/**
 * Retire une annonce (Apple 1.2). Le serveur tranche qui a le droit : l'auteur,
 * ou la direction du crew. Le client ne peint le geste que là où il aboutira,
 * mais il ne l'autorise pas.
 */
export async function removeAnnouncement(id: string): Promise<RemoveOutcome> {
  if (!supabase) return { kind: 'failed' };
  try {
    const res = await supabase.rpc('crew_announcement_remove', { p_id: id });
    if (res.error) return isUnsupported(res.error) ? { kind: 'unsupported' } : { kind: 'failed' };
    const data = res.data as Record<string, unknown> | null;
    const refusal = activityRefusalOf(data);
    if (refusal) return { kind: 'refused', refusal };
    if (data?.ok !== true) return { kind: 'failed' };
    return { kind: 'removed', alreadyRemoved: data.alreadyRemoved === true };
  } catch {
    return { kind: 'failed' };
  }
}
