/**
 * GRYD — CREW RÉEL (variante NATIVE). Câblage React des RPC crew arbitrées
 * SERVEUR (create_crew / join_crew_by_code / leave_crew / my_crew_code), même
 * doctrine que `useRealMission` : sur l'app native, un crew est RÉEL ou VIDE,
 * JAMAIS la démo (« l'app ne ment jamais »). La démo Supercell (crew.tsx, 1600+
 * lignes) reste intacte pour la vitrine web (isShowcasePlatform).
 *
 * Règle zéro-crash : tout échec — pas de session, showcase, lecture ratée,
 * rejet réseau — retombe SILENCIEUSEMENT sur `crew: null` (l'écran affiche
 * alors l'état « fonde ou rejoins », honnête). AUCUNE écriture client directe :
 * chaque mutation passe par une RPC service-role (le client n'attribue jamais
 * une adhésion). Le CODE d'un crew n'est JAMAIS lu depuis la table (colonne
 * secrète depuis 0036) — il vient de `my_crew_code()` à la demande.
 *
 * ⚠ Pré-vol `crewCreateDecision`/`crewJoinDecision` : miroir logique mobile de
 * `packages/engine/src/crew.ts` (même raison que rules.ts / raid.ts — Metro ne
 * résout pas les imports Deno `.ts` de @klaim/engine, et l'importer tirerait
 * h3-js dans le bundle). Constantes RÉELLES depuis @klaim/shared, aucun nombre
 * magique de jeu ; le serveur reste seul juge (le pré-vol évite juste un
 * aller-retour perdu quand l'entrée est manifestement invalide).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  CREW_CODE_LENGTH,
  CREW_COLORS_COUNT,
  CREW_MAX_MEMBERS,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isShowcasePlatform } from '../../lib/flags';

// ─── Contrat RPC (jsonb) — typé sur les réponses des fonctions serveur ───────

/** Colonnes PUBLIQUES d'un crew (jamais `code` : secret, via my_crew_code). */
export interface RealCrew {
  id: string;
  name: string;
  color: number;
  cityId: string;
}

/** Membre actif du crew (public_profiles = pseudo seulement). */
export interface RealCrewMember {
  userId: string;
  pseudo: string;
  joinedAt: string;
  isMe: boolean;
}

/** Ville sélectionnable à la création (city_zones, colonnes publiques). */
export interface CityOption {
  cityId: string;
  name: string;
}

/** Motifs de refus renvoyés par les RPC (contrat figé). */
export type CrewRefusal =
  | 'signed_out'
  | 'already_in_crew'
  | 'cooldown'
  | 'bad_name'
  | 'bad_color'
  | 'bad_city'
  | 'bad_code'
  | 'full'
  | 'no_crew';

export type CreateResult =
  | { ok: true; crew: RealCrew & { code: string } }
  | { ok: false; reason: CrewRefusal; daysLeft?: number };

export type JoinResult =
  | { ok: true; crew: RealCrew }
  | { ok: false; reason: CrewRefusal; daysLeft?: number };

export type LeaveResult = { ok: true } | { ok: false; reason: CrewRefusal };

export type CodeResult = { ok: true; code: string } | { ok: false; reason: CrewRefusal };

// ─── Pré-vol PUR (miroir engine/crew.ts) ─────────────────────────────────────

/** Bornes du nom crew = contrainte DB (0002_schema.sql : char_length 1..40). */
const CREW_NAME_MAX_LENGTH = 40;

export type PreflightDecision = { ok: true } | { ok: false; reason: 'bad_name' | 'bad_color' | 'bad_city' };

/** Le nom crew nettoyé (trim) pour l'envoi — jamais d'espaces parasites en DB. */
export function normalizeCrewName(raw: string): string {
  return raw.trim().slice(0, CREW_NAME_MAX_LENGTH);
}

/** Pré-vol création : nom non vide (≤40) + couleur 0..CREW_COLORS_COUNT-1 + ville. */
export function crewCreateDecision(name: string, color: number, cityId: string): PreflightDecision {
  const clean = normalizeCrewName(name);
  if (clean.length < 1) return { ok: false, reason: 'bad_name' };
  if (!Number.isInteger(color) || color < 0 || color >= CREW_COLORS_COUNT) {
    return { ok: false, reason: 'bad_color' };
  }
  if (cityId.trim().length < 1) return { ok: false, reason: 'bad_city' };
  return { ok: true };
}

/** Normalise un code saisi : majuscules, sans espaces (l'UI l'affiche « propre »). */
export function normalizeCrewCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CREW_CODE_LENGTH);
}

export type JoinPreflight = { ok: true } | { ok: false; reason: 'bad_code' };

/** Pré-vol adhésion : exactement CREW_CODE_LENGTH caractères A-Z0-9. */
export function crewJoinDecision(code: string): JoinPreflight {
  const clean = normalizeCrewCode(code);
  if (clean.length !== CREW_CODE_LENGTH) return { ok: false, reason: 'bad_code' };
  return { ok: true };
}

/** Couleur d'identité auto (0..CREW_COLORS_COUNT-1) — pas de picker à la création. */
export function randomCrewColor(): number {
  return Math.floor(Math.random() * CREW_COLORS_COUNT);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseRealCrewResult {
  /** false = déconnecté / showcase / sans backend : l'écran invite à se connecter. */
  ready: boolean;
  /** true tant que la 1re lecture réelle n'a pas abouti. */
  loading: boolean;
  /** Mon crew actif, ou null (fonde ou rejoins). */
  crew: RealCrew | null;
  /** Membres actifs (moi inclus), triés par ancienneté. */
  members: RealCrewMember[];
  /** Effectif actif (X de X/CREW_MAX_MEMBERS). */
  memberCount: number;
  /** Plafond d'affichage (CREW_MAX_MEMBERS). */
  maxMembers: number;
  /** Recharge (après une mutation ou au retour d'onglet). */
  reload: () => void;
  createCrew: (name: string, color: number, cityId: string) => Promise<CreateResult>;
  joinByCode: (code: string) => Promise<JoinResult>;
  leaveCrew: () => Promise<LeaveResult>;
  fetchMyCode: () => Promise<CodeResult>;
  listCities: () => Promise<CityOption[]>;
}

/** Colonnes publiques du crew embarqué. */
interface CrewCols {
  id: string;
  name: string;
  color: number;
  city_id: string;
}

/**
 * Ligne d'adhésion active + crew embarqué (FK crew_members.crew_id → crews.id).
 * Sans types DB générés, PostgREST typé l'embed to-one comme un tableau : on
 * accepte les deux formes et on normalise à la lecture.
 */
interface MyMembershipRow {
  crew_id: string;
  crews: CrewCols | CrewCols[] | null;
}

export function useRealCrew(): UseRealCrewResult {
  const { session } = useSession();
  const [crew, setCrew] = useState<RealCrew | null>(null);
  const [members, setMembers] = useState<RealCrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const ready = !isShowcasePlatform && !!supabase && !!session;
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Showcase / pas de session / pas de backend → aucun crew réel (état vide).
    if (!ready || !supabase || !session) {
      setCrew(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    const client = supabase;
    const myId = session.user.id;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // MON adhésion active + le crew (colonnes publiques via l'embed FK).
        const mine = await client
          .from('crew_members')
          .select('crew_id, crews(id, name, color, city_id)')
          .eq('user_id', myId)
          .is('left_at', null)
          .maybeSingle();
        if (cancelled) return;
        if (mine.error || !mine.data) {
          // Pas de crew (ou lecture ratée) : état vide, jamais une démo.
          setCrew(null);
          setMembers([]);
          setLoading(false);
          return;
        }
        const row = mine.data as unknown as MyMembershipRow;
        const c = Array.isArray(row.crews) ? (row.crews[0] ?? null) : row.crews;
        if (!c) {
          setCrew(null);
          setMembers([]);
          setLoading(false);
          return;
        }
        const myCrew: RealCrew = { id: c.id, name: c.name, color: c.color, cityId: c.city_id };

        // Membres actifs du crew, puis leurs pseudos (public_profiles = vue :
        // pas d'embed FK fiable → 2e requête `in(...)`, patron du repo).
        const roster = await client
          .from('crew_members')
          .select('user_id, joined_at')
          .eq('crew_id', myCrew.id)
          .is('left_at', null)
          .order('joined_at', { ascending: true });
        if (cancelled) return;
        const rosterRows = (roster.data ?? []) as { user_id: string; joined_at: string }[];
        const ids = rosterRows.map((r) => r.user_id);
        const profiles = ids.length
          ? await client.from('public_profiles').select('id, pseudo').in('id', ids)
          : { data: [] as { id: string; pseudo: string }[], error: null };
        if (cancelled) return;
        const pseudoById = new Map<string, string>();
        for (const p of (profiles.data ?? []) as { id: string; pseudo: string }[]) {
          pseudoById.set(p.id, p.pseudo);
        }
        const list: RealCrewMember[] = rosterRows.map((r) => ({
          userId: r.user_id,
          pseudo: pseudoById.get(r.user_id) ?? '—',
          joinedAt: r.joined_at,
          isMe: r.user_id === myId,
        }));

        setCrew(myCrew);
        setMembers(list);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setCrew(null);
        setMembers([]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, tick]);

  // Refetch au retour sur l'onglet Crew (patron useRealMission) : on saute le
  // 1er focus (le fetch au montage suffit), les suivants rafraîchissent après
  // une création / adhésion / départ faits ailleurs.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  // ── Actions (chacune décidée serveur ; le pré-vol évite un aller-retour) ────

  const createCrew = useCallback(
    async (name: string, color: number, cityId: string): Promise<CreateResult> => {
      if (!ready || !supabase) return { ok: false, reason: 'signed_out' };
      const pre = crewCreateDecision(name, color, cityId);
      if (!pre.ok) return { ok: false, reason: pre.reason };
      try {
        const { data, error } = await supabase.rpc('create_crew', {
          p_name: normalizeCrewName(name),
          p_color: color,
          p_city_id: cityId,
        });
        if (error) return { ok: false, reason: 'signed_out' };
        return data as CreateResult;
      } catch {
        return { ok: false, reason: 'signed_out' };
      }
    },
    [ready],
  );

  const joinByCode = useCallback(
    async (code: string): Promise<JoinResult> => {
      if (!ready || !supabase) return { ok: false, reason: 'signed_out' };
      const pre = crewJoinDecision(code);
      if (!pre.ok) return { ok: false, reason: pre.reason };
      try {
        const { data, error } = await supabase.rpc('join_crew_by_code', {
          p_code: normalizeCrewCode(code),
        });
        if (error) return { ok: false, reason: 'signed_out' };
        return data as JoinResult;
      } catch {
        return { ok: false, reason: 'signed_out' };
      }
    },
    [ready],
  );

  const leaveCrew = useCallback(async (): Promise<LeaveResult> => {
    if (!ready || !supabase) return { ok: false, reason: 'no_crew' };
    try {
      const { data, error } = await supabase.rpc('leave_crew');
      if (error) return { ok: false, reason: 'no_crew' };
      return data as LeaveResult;
    } catch {
      return { ok: false, reason: 'no_crew' };
    }
  }, [ready]);

  const fetchMyCode = useCallback(async (): Promise<CodeResult> => {
    if (!ready || !supabase) return { ok: false, reason: 'no_crew' };
    try {
      const { data, error } = await supabase.rpc('my_crew_code');
      if (error) return { ok: false, reason: 'no_crew' };
      return data as CodeResult;
    } catch {
      return { ok: false, reason: 'no_crew' };
    }
  }, [ready]);

  const listCities = useCallback(async (): Promise<CityOption[]> => {
    if (!ready || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from('city_zones')
        .select('city_id, name')
        .order('name', { ascending: true });
      if (error || !data) return [];
      return (data as { city_id: string; name: string }[]).map((r) => ({
        cityId: r.city_id,
        name: r.name,
      }));
    } catch {
      return [];
    }
  }, [ready]);

  return {
    ready,
    loading,
    crew,
    members,
    memberCount: members.length,
    maxMembers: CREW_MAX_MEMBERS,
    reload,
    createCrew,
    joinByCode,
    leaveCrew,
    fetchMyCode,
    listCities,
  };
}
