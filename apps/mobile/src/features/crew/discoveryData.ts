/**
 * GRYD — E39/E40 · le CÂBLAGE de la découverte (React + Supabase).
 *
 * Séparé de `discovery.ts` VOLONTAIREMENT : la pertinence est pure et testée en
 * Deno ; ce fichier-ci ne fait que lire, et il n'a aucune décision de jeu à
 * prendre. Toutes les lectures passent par les RPC SECURITY DEFINER de 0083 —
 * aucune requête de table directe, donc aucun risque d'exposer `crews.code`
 * (secret depuis 0036) ni d'énumérer des membres (§12).
 *
 * ─── QUATRE ÉTATS DISTINCTS, JAMAIS CONFONDUS (doctrine) ────────────────────
 *   · `signedOut`  → pas connecté ;
 *   · `loading`    → lecture EN COURS : n'affirme RIEN sur les crews ;
 *   · `refusal`    → le serveur a répondu et a REFUSÉ (no_city…) ;
 *   · `page`       → lu, avec 0 à N crews — une liste vide est une réponse.
 * Un échec réseau donne `refusal: 'not_found'`… non : il donne `failed`, et
 * c'est un cinquième état, distinct des quatre autres — sans quoi « je n'ai pas
 * pu lire » se déguiserait en « il n'y a rien ».
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  parseDiscoveryPage,
  refusalOf,
  type DiscoveryCrew,
  type DiscoveryPage,
  type DiscoveryRefusal,
} from './discovery';

// ─── Découverte (E39) ────────────────────────────────────────────────────────

export interface DiscoveryState {
  /** Aucun compte : rien à découvrir, et on ne prétend pas le contraire. */
  signedOut: boolean;
  loading: boolean;
  /** La lecture a échoué (réseau, backend absent) — DISTINCT de « aucun crew ». */
  failed: boolean;
  /** Le serveur a répondu et refusé, avec son motif (jamais inventé). */
  refusal: DiscoveryRefusal | null;
  page: DiscoveryPage | null;
  reload: () => void;
}

export function useCrewDiscovery(params: {
  cityId: string | null;
  query: string;
}): DiscoveryState {
  const { cityId, query } = params;
  const { session } = useSession();
  const [page, setPage] = useState<DiscoveryPage | null>(null);
  const [refusal, setRefusal] = useState<DiscoveryRefusal | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const ready = !!supabase && !!session;

  useEffect(() => {
    if (!ready || !supabase) {
      setPage(null);
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
        const res = await client.rpc('crew_discovery', {
          p_city_id: cityId,
          // Chaîne vide → `null` côté serveur : une recherche vide n'est pas une
          // recherche de la chaîne vide.
          p_query: query.trim().length > 0 ? query.trim() : null,
        });
        if (cancelled) return;
        if (res.error) {
          setPage(null);
          setRefusal(null);
          setFailed(true);
          return;
        }
        const parsed = parseDiscoveryPage(res.data);
        if (parsed) {
          setPage(parsed);
          setRefusal(null);
          setFailed(false);
          return;
        }
        // Réponse lue, mais ce n'est pas une page : soit un refus explicite,
        // soit un contrat inattendu. Les deux se disent, aucun ne se tait.
        const why = refusalOf(res.data);
        setPage(null);
        setRefusal(why);
        setFailed(why === null);
      } catch {
        if (cancelled) return;
        setPage(null);
        setRefusal(null);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, cityId, query, tick]);

  return { signedOut: !session, loading, failed, refusal, page, reload };
}

// ─── Fiche publique (E40) ────────────────────────────────────────────────────

/** La fiche publique ajoute le rang de ville aux faits de la découverte. */
export interface PublicCrew extends DiscoveryCrew {
  cityName: string | null;
  createdAtMs: number | null;
  /** Rang dans la ville, `null` quand le crew ne tient RIEN (jamais « dernier »). */
  cityRank: number | null;
  /** Nombre de crews réellement classés (contexte du rang), `null` si sans objet. */
  crewsRanked: number | null;
  iAmMember: boolean;
}

export interface PublicProfileState {
  signedOut: boolean;
  loading: boolean;
  failed: boolean;
  refusal: DiscoveryRefusal | null;
  crew: PublicCrew | null;
  reload: () => void;
}

const asMs = (v: unknown): number | null => {
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};
const asIntOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export function useCrewPublicProfile(crewId: string | null): PublicProfileState {
  const { session } = useSession();
  const [crew, setCrew] = useState<PublicCrew | null>(null);
  const [refusal, setRefusal] = useState<DiscoveryRefusal | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const ready = !!supabase && !!session && !!crewId;

  useEffect(() => {
    if (!ready || !supabase || !crewId) {
      setCrew(null);
      setRefusal(crewId ? null : 'not_found');
      setLoading(false);
      setFailed(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await client.rpc('crew_public_profile', { p_crew_id: crewId });
        if (cancelled) return;
        if (res.error) {
          setCrew(null);
          setRefusal(null);
          setFailed(true);
          return;
        }
        const raw = res.data as Record<string, unknown> | null;
        if (!raw || raw.ok !== true || typeof raw.crew !== 'object' || raw.crew === null) {
          const why = refusalOf(raw);
          setCrew(null);
          setRefusal(why);
          setFailed(why === null);
          return;
        }
        // On réutilise le parseur de la découverte : la forme est la même, plus
        // trois clés. Un seul lecteur, donc une seule façon de se tromper.
        const base = parseDiscoveryPage({ ok: true, cityId: (raw.crew as Record<string, unknown>).cityId, crews: [raw.crew] });
        const first = base?.crews[0] ?? null;
        if (!first) {
          setCrew(null);
          setRefusal(null);
          setFailed(true);
          return;
        }
        const c = raw.crew as Record<string, unknown>;
        setCrew({
          ...first,
          cityName: typeof c.cityName === 'string' ? c.cityName : null,
          createdAtMs: asMs(c.createdAt),
          cityRank: asIntOrNull(c.cityRank),
          crewsRanked: asIntOrNull(c.crewsRanked),
          iAmMember: c.iAmMember === true,
        });
        setRefusal(null);
        setFailed(false);
      } catch {
        if (cancelled) return;
        setCrew(null);
        setRefusal(null);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, crewId, tick]);

  return { signedOut: !session, loading, failed, refusal, crew, reload };
}

// ─── L'INTENTION D'ADHÉSION — le serveur décide, jamais l'écran ─────────────

export type JoinIntentResult =
  | { ok: true; effect: 'joined' | 'requested' }
  | { ok: false; reason: DiscoveryRefusal; daysLeft?: number };

/**
 * Appelle `crew_join_intent` (0083). L'écran choisit un LIBELLÉ d'après le
 * recrutement lu ; c'est le serveur qui choisit l'EFFET. Un statut changé entre
 * la lecture et le tap est donc arbitré correctement, pas subi.
 */
// ─── LA CONTREPARTIE : les candidatures REÇUES ──────────────────────────────

export interface JoinRequest {
  id: string;
  pseudo: string;
  message: string | null;
  createdAtMs: number | null;
}

export interface JoinRequestsState {
  /**
   * `true` UNIQUEMENT si le serveur m'a reconnu le droit de décider
   * (`CREW_PERMISSIONS.acceptApplications`, arbitré dans 0083). Un `forbidden`
   * ou un `no_crew` laisse ce drapeau à `false` : l'écran ne peint alors RIEN,
   * pas même un bloc vide — un simple membre n'a pas à savoir qu'une file
   * existe.
   */
  canDecide: boolean;
  requests: readonly JoinRequest[];
  busyId: string | null;
  decide: (id: string, accept: boolean) => Promise<void>;
  reload: () => void;
}

/**
 * ⚠ CE HOOK EXISTE POUR QU'UNE CANDIDATURE NE SOIT PAS UN CUL-DE-SAC.
 * `crew_join_intent` peut écrire une demande ; si aucun écran ne la montre à
 * quelqu'un qui peut trancher, le bouton « Demander à rejoindre » fait semblant
 * — exactement la faute que le dépôt s'interdit. Les deux se livrent ensemble.
 */
export function useCrewJoinRequests(): JoinRequestsState {
  const { session } = useSession();
  const [requests, setRequests] = useState<readonly JoinRequest[]>([]);
  const [canDecide, setCanDecide] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const ready = !!supabase && !!session;

  useEffect(() => {
    if (!ready || !supabase) {
      setRequests([]);
      setCanDecide(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    void (async () => {
      try {
        const res = await client.rpc('crew_join_requests');
        if (cancelled) return;
        const raw = res.data as Record<string, unknown> | null;
        if (res.error || !raw || raw.ok !== true || !Array.isArray(raw.requests)) {
          // Refus, échec ou contrat inattendu : on ne peint rien. Ici, ne rien
          // montrer n'affirme rien — contrairement à une liste vide, qui dirait
          // « personne ne veut vous rejoindre ».
          setRequests([]);
          setCanDecide(false);
          return;
        }
        const parsed: JoinRequest[] = [];
        for (const item of raw.requests) {
          if (typeof item !== 'object' || item === null) continue;
          const o = item as Record<string, unknown>;
          if (typeof o.id !== 'string' || typeof o.pseudo !== 'string') continue;
          parsed.push({
            id: o.id,
            pseudo: o.pseudo,
            message: typeof o.message === 'string' ? o.message : null,
            createdAtMs: asMs(o.createdAt),
          });
        }
        setRequests(parsed);
        setCanDecide(true);
      } catch {
        if (cancelled) return;
        setRequests([]);
        setCanDecide(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, tick]);

  const decide = useCallback(
    async (id: string, accept: boolean) => {
      if (!supabase || busyId !== null) return;
      setBusyId(id);
      try {
        await supabase.rpc('crew_decide_join_request', { p_request_id: id, p_accept: accept });
      } catch {
        // Silencieux À DESSEIN : la relecture ci-dessous dit l'état RÉEL. Un
        // message d'échec inventé serait pire que la vérité relue.
      }
      setBusyId(null);
      reload();
    },
    [busyId, reload],
  );

  return { canDecide, requests, busyId, decide, reload };
}

export async function requestCrewJoin(crewId: string): Promise<JoinIntentResult> {
  if (!supabase) return { ok: false, reason: 'not_found' };
  try {
    const res = await supabase.rpc('crew_join_intent', { p_crew_id: crewId });
    if (res.error) return { ok: false, reason: 'not_found' };
    const raw = res.data as Record<string, unknown> | null;
    if (raw?.ok === true) {
      const effect = raw.effect === 'joined' ? 'joined' : 'requested';
      return { ok: true, effect };
    }
    const reason = (typeof raw?.reason === 'string' ? raw.reason : 'not_found') as DiscoveryRefusal;
    const daysLeft = typeof raw?.daysLeft === 'number' ? raw.daysLeft : undefined;
    return { ok: false, reason, daysLeft };
  } catch {
    return { ok: false, reason: 'not_found' };
  }
}
