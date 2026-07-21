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
import {
  chooseCrewMission,
  CREW_MISSION_WINDOWS,
  type CrewLoopState,
  type CrewMission,
  type CrewSectorState,
} from './engine/crewMission';

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

/**
 * Territoire du crew, calculé FRAIS par `crew_overview()` (migration 0044).
 *
 * ⚠ AUCUNE AIRE : la RPC n'émet volontairement PAS de clé `areaM2` (aucune aire
 * réelle n'existe en base — cf. choix n°1 de 0044). Ne jamais en fabriquer une
 * côté client à partir de `hexesHeld` : ce serait un chiffre inventé à l'écran.
 *
 * ⚠ NE JAMAIS lire `crew_leaderboard` pour ça : vue matérialisée rafraîchie par
 * aucun job du repo, donc figée à zéro (constat 0044). Elle afficherait
 * « 0 zone » à vie.
 */
export interface CrewTerritory {
  /** Hexes tenus par les membres ACTIFS, non expirés. 0 = le crew ne tient rien. */
  hexesHeld: number;
  /** Dernière capture du crew, ou null s'il n'a jamais rien pris. */
  lastCaptureAt: string | null;
  /** Rang dans la ville du crew (ex aequo partagés), null si non calculable. */
  cityRank: number | null;
  /** Nombre de crews dans la ville (contexte du rang), null si non calculable. */
  crewsInCity: number | null;
}

/** Part d'un membre dans le territoire du crew (maillon 4 de la boucle §0). */
export interface CrewContribution {
  userId: string;
  pseudo: string;
  /** Rôle serveur (`CrewRole` attendu ; typé large : la DB reste souveraine). */
  role: string;
  hexesHeld: number;
  /** Part ENTIÈRE (plancher) — 0 partout quand le crew ne tient rien. */
  contributionPct: number;
}

/** Retour utile de `crew_overview()` (les refus retombent sur `null`). */
export interface CrewOverview {
  territory: CrewTerritory;
  /** Mon rôle dans le crew, ou null si le serveur ne le renseigne pas. */
  myRole: string | null;
  contributions: CrewContribution[];
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
  // Modération SERVEUR du nom (0050) : insulte, marque, terme officiel GRYD,
  // caractère trompeur. Motif VOLONTAIREMENT UNIQUE — le serveur ne dit jamais
  // quelle règle a mordu ni quel mot il a reconnu, sinon le refus devient un
  // mode d'emploi du contournement. Le détail reste en base, pour la revue.
  | 'name_unavailable'
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

// ─── Lecture DÉFENSIVE du jsonb crew_overview (PUR, testable) ────────────────

function asFiniteInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;
}

function asText(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * jsonb → CrewOverview, ou `null` si la forme n'est pas celle attendue (refus
 * `{ok:false}`, erreur réseau, contrat futur inconnu). `null` = l'écran
 * n'affiche AUCUN bloc territoire : mieux vaut ne rien dire que dire « 0 ».
 */
export function parseCrewOverview(raw: unknown): CrewOverview | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return null;

  const terr = root.territory;
  if (!terr || typeof terr !== 'object') return null;
  const t = terr as Record<string, unknown>;
  const hexesHeld = asFiniteInt(t.hexesHeld);
  // Sans compte fiable il n'y a pas de territoire à montrer : on se tait.
  if (hexesHeld === null || hexesHeld < 0) return null;

  const contributions: CrewContribution[] = [];
  if (Array.isArray(root.members)) {
    for (const entry of root.members) {
      if (!entry || typeof entry !== 'object') continue;
      const m = entry as Record<string, unknown>;
      const userId = asText(m.userId);
      const held = asFiniteInt(m.hexesHeld);
      const pct = asFiniteInt(m.contributionPct);
      if (!userId || held === null || pct === null) continue;
      contributions.push({
        userId,
        pseudo: asText(m.pseudo) ?? '—',
        role: asText(m.role) ?? '',
        hexesHeld: Math.max(0, held),
        // Bornage client : un pourcentage hors [0,100] serait un bug serveur,
        // il ne doit jamais atteindre l'écran.
        contributionPct: Math.min(100, Math.max(0, pct)),
      });
    }
  }

  return {
    territory: {
      hexesHeld,
      lastCaptureAt: asText(t.lastCaptureAt),
      cityRank: asFiniteInt(t.cityRank),
      crewsInCity: asFiniteInt(t.crewsInCity),
    },
    myRole: asText(root.role),
    contributions,
  };
}

// ─── Mission prioritaire du crew (A-43 §0 maillon 3) — lecture + dérivation ──

/** Timestamp ISO serveur → ms, ou `null` si absent/illisible. */
function asMs(v: unknown): number | null {
  if (typeof v !== 'string' || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/** Nombre fini, sinon `null` (0 serait une affirmation, `null` est un aveu). */
function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * jsonb `crew_mission_inputs` → entrées du moteur, ou `null` si la forme n'est
 * pas celle attendue (refus `{ok:false}`, réseau, contrat futur). `null` ⇒
 * AUCUN bloc mission à l'écran : on ne dit pas « aucune mission » alors qu'on
 * n'a simplement pas réussi à lire. Ne rien savoir et savoir qu'il n'y a rien
 * sont deux choses différentes, et une seule des deux se raconte au joueur.
 */
export function parseCrewMissionInputs(
  raw: unknown,
): { sectors: CrewSectorState[]; loops: CrewLoopState[] } | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return null;

  const sectors: CrewSectorState[] = [];
  if (Array.isArray(root.sectors)) {
    for (const entry of root.sectors) {
      if (!entry || typeof entry !== 'object') continue;
      const s = entry as Record<string, unknown>;
      sectors.push({
        sectorId: asText(s.sectorId),
        sectorName: asText(s.sectorName),
        heldTotal: asNum(s.heldTotal) ?? 0,
        expiringSoon: asNum(s.expiringSoon) ?? 0,
        earliestDecayAt: asMs(s.earliestDecayAt),
        lostRecently: asNum(s.lostRecently) ?? 0,
        lastLostAt: asMs(s.lastLostAt),
        // `null` PRÉSERVÉ : « inconnu » ne doit jamais devenir « 0 libre »,
        // sinon un secteur non rattaché se ferait passer pour saturé.
        freeHexes: asNum(s.freeHexes),
      });
    }
  }

  const loops: CrewLoopState[] = [];
  if (Array.isArray(root.loops)) {
    for (const entry of root.loops) {
      if (!entry || typeof entry !== 'object') continue;
      const l = entry as Record<string, unknown>;
      const id = asText(l.id);
      const missingM = asNum(l.missingM);
      if (!id || missingM === null) continue;
      loops.push({
        id,
        name: asText(l.name) ?? '',
        missingM,
        expiresAt: asMs(l.expiresAt),
      });
    }
  }

  return { sectors, loops };
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
  /**
   * Territoire + contributions (crew_overview, 0044), ou null : pas de crew,
   * lecture ratée, ou contrat inattendu. null ⇒ l'écran n'affiche pas le bloc
   * territoire (jamais un zéro fabriqué).
   */
  overview: CrewOverview | null;
  /** true pendant la 1re lecture du territoire (le roster, lui, est déjà là). */
  overviewLoading: boolean;
  /**
   * LA mission prioritaire du crew (A-43 §0 maillon 3), dérivée par le moteur
   * PUR `chooseCrewMission` à partir des faits de `crew_mission_inputs` (0049).
   *
   * Trois valeurs, trois écrans différents — la distinction est le cœur de la
   * doctrine « l'app ne ment jamais » :
   *  · `null`             → on n'a PAS PU lire (chargement, échec, pas de crew).
   *                          L'écran n'affiche AUCUN bloc.
   *  · `{kind:'none'}`    → on a lu, et il n'y a réellement rien à faire.
   *                          L'écran le DIT.
   *  · une mission        → un fait mesuré, avec son manque chiffré.
   */
  mission: CrewMission | null;
  /**
   * Les FAITS par secteur derrière la mission (crew_mission_inputs, 0049), tels
   * quels. Exposés — et non re-fetchés — parce que le PING DE ZONE (A-44 A5) a
   * besoin exactement de cette liste pour savoir quelles zones sont RÉELLEMENT
   * celles du crew (`pingableSectors`). Une 2ᵉ lecture serveur dirait la même
   * chose, avec le risque qu'elle dise autre chose entre-temps.
   *
   * `[]` signifie « lu, et il n'y a rien » ; `mission === null` signale, lui,
   * qu'on n'a pas pu lire. Les deux ne se confondent pas.
   */
  missionSectors: CrewSectorState[];
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

export interface UseRealCrewOptions {
  /**
   * Charger AUSSI le territoire + les contributions (`crew_overview`, 0044) ?
   *
   * Défaut FALSE, volontairement. `crew_overview` est un AGRÉGAT serveur (scan
   * des hex_claims des membres + classement de tous les crews de la ville) et
   * le hook refetch à chaque prise de focus. Or deux consommateurs sur trois
   * n'ont besoin que du roster : MapScreen (teinte des zones du crew) et
   * course-result (« N coéquipiers en bénéficient »). Sans ce drapeau, le
   * simple fait de revenir sur l'onglet Carte payait l'agrégat pour une donnée
   * jamais affichée. Seul l'écran Crew le demande.
   */
  withOverview?: boolean;
}

export function useRealCrew(options: UseRealCrewOptions = {}): UseRealCrewResult {
  const { withOverview = false } = options;
  const { session } = useSession();
  const [crew, setCrew] = useState<RealCrew | null>(null);
  const [members, setMembers] = useState<RealCrewMember[]>([]);
  const [overview, setOverview] = useState<CrewOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [mission, setMission] = useState<CrewMission | null>(null);
  const [missionSectors, setMissionSectors] = useState<CrewSectorState[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const ready = !isShowcasePlatform && !!supabase && !!session;
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Showcase / pas de session / pas de backend → aucun crew réel (état vide).
    if (!ready || !supabase || !session) {
      setCrew(null);
      setMembers([]);
      setOverview(null);
      setMission(null);
      setMissionSectors([]);
      setOverviewLoading(false);
      setLoading(false);
      return;
    }
    const client = supabase;
    const myId = session.user.id;
    let cancelled = false;
    setLoading(true);
    setOverviewLoading(true);
    /** Sortie « pas de crew » : aucune donnée fabriquée, aucun bloc territoire. */
    const clearAll = () => {
      setCrew(null);
      setMembers([]);
      setOverview(null);
      setMission(null);
      setMissionSectors([]);
      setOverviewLoading(false);
      setLoading(false);
    };
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
          clearAll();
          return;
        }
        const row = mine.data as unknown as MyMembershipRow;
        const c = Array.isArray(row.crews) ? (row.crews[0] ?? null) : row.crews;
        if (!c) {
          clearAll();
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

        // ── Territoire + contributions (0044) ────────────────────────────────
        // Lecture SÉPARÉE et POSTÉRIEURE : le roster s'affiche sans attendre
        // l'agrégat, et un échec ici ne fait pas disparaître le crew (le bloc
        // territoire reste simplement absent — jamais un « 0 zone » inventé).
        // OPT-IN (withOverview) : seul l'écran Crew paie cet agrégat.
        if (!withOverview) {
          setOverviewLoading(false);
          return;
        }
        try {
          const { data, error } = await client.rpc('crew_overview');
          if (cancelled) return;
          setOverview(error ? null : parseCrewOverview(data));
        } catch {
          if (cancelled) return;
          setOverview(null);
        }

        // ── LA mission prioritaire (0049 + moteur pur) ───────────────────────
        // Les DEUX fenêtres sont envoyées depuis game-rules : le SQL n'écrit
        // aucun seuil de jeu en dur (il refuse même une fenêtre absente plutôt
        // que d'en inventer une). Échec de lecture ⇒ `mission = null` ⇒ AUCUN
        // bloc : « je n'ai pas pu lire » ne se dit pas « aucune mission ».
        try {
          const { data, error } = await client.rpc('crew_mission_inputs', {
            p_defend_window_h: CREW_MISSION_WINDOWS.defendWindowH,
            p_reclaim_window_h: CREW_MISSION_WINDOWS.reclaimWindowH,
          });
          if (cancelled) return;
          const facts = error ? null : parseCrewMissionInputs(data);
          setMissionSectors(facts?.sectors ?? []);
          setMission(
            facts === null
              ? null
              : chooseCrewMission({ nowMs: Date.now(), sectors: facts.sectors, loops: facts.loops }),
          );
        } catch {
          if (cancelled) return;
          setMission(null);
          setMissionSectors([]);
        }
        setOverviewLoading(false);
      } catch {
        if (cancelled) return;
        clearAll();
      }
    })();
    return () => {
      cancelled = true;
    };
    // `withOverview` est un BOOLÉEN (destructuré des options) et non l'objet
    // `options` — dont l'identité change à chaque rendu de l'appelant et
    // relancerait le fetch en boucle.
  }, [ready, session, tick, withOverview]);

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
    overview,
    overviewLoading,
    mission,
    missionSectors,
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
