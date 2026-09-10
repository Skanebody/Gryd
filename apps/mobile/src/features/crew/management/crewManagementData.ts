/**
 * GRYD — LE CÂBLAGE de la gestion de crew (React + Supabase). Aucune règle de jeu.
 *
 * Séparé de `crewRules2026.ts` / `crewBoard2026.ts` pour la même raison que
 * `crewEditData.ts` l'est de `crewEdit.ts` : les décisions sont pures et
 * testées, ce fichier ne fait qu'appeler. TOUT passe par les RPC SECURITY
 * DEFINER de 0188-0190 — jamais une requête de table : `crew_rules_2026`,
 * `crew_warnings_2026`, `crew_kicks_2026` et `crew_decisions_2026` sont en RLS
 * « lecture par RPC seulement », et un `.from()` y rendrait un tableau VIDE
 * silencieux, que l'écran lirait « ce crew n'a aucune règle ».
 *
 * ─── CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS (doctrine) ──────────────────────
 *   · `signedOut`   → pas de session locale ;
 *   · `loading`     → lecture EN COURS : n'affirme RIEN ;
 *   · `failed`      → je n'ai PAS PU lire (réseau, backend absent, contrat
 *                     inattendu). Cet état n'affirme rien non plus, et surtout
 *                     pas « il n'y a rien » ;
 *   · `refusal`     → le serveur a RÉPONDU et refusé, avec SON motif
 *                     (`forbidden` est une information, pas une panne) ;
 *   · la donnée     → lue, éventuellement vide. Une liste vide est une réponse.
 *
 * Et pour les ÉCRITURES, quatre issues, jamais confondues :
 *   · `ok`          → le serveur a fait le geste, avec son `effect` ;
 *   · `refusal`     → il a répondu non, avec son motif et ses paramètres ;
 *   · `unsupported` → j'ai JOINT le serveur et il ne connaît pas la fonction :
 *                     cet environnement n'a pas reçu 0188-0190. Un fait sur le
 *                     SERVEUR, pas sur le joueur, et surtout pas « réessaie » ;
 *   · `failed`      → je n'ai pas pu le joindre. On ne sait rien.
 * Rien n'est jamais supposé réussi : l'écran RELIT après un `ok`.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  CREW_BOARD_SORT_DEFAULT,
  CREW_DISSOLVE_REFUSALS,
  type CrewBoardFilter,
  type CrewBoardSort,
  type CrewKickReason,
} from '@klaim/shared';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../../lib/session';
import {
  parseBoard,
  parseDecisions,
  parseStanding,
  refusalOf2026,
  type CrewBoard2026,
  type Decision2026,
  type ManagementRefusal,
  type MyStanding2026,
} from './crewBoard2026';
import {
  discoveryPayload2026,
  type DiscoveryFilterState2026,
} from './crewDiscoveryFilters2026';
import {
  badRulesDetail,
  parseCrewRules,
  parseEligibility,
  parseMissing,
  type BadRulesDetail,
  type CrewEligibility2026,
  type CrewRules2026,
  type MissingRequirement2026,
} from './crewRules2026';

// ═══════════════════════════════════════════════════════════════════════════
// 0. LE SOCLE — un appel, quatre issues
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le serveur ne connaît pas la fonction : PostgREST rend `PGRST202` (absente du
 * cache de schéma) et Postgres `42883` (undefined_function). On teste les deux
 * plutôt que de deviner lequel remonte — ils dépendent de la version du proxy.
 * Même détection que `memberRolesData.ts`.
 */
function isUnsupported(error: { code?: string | null; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === 'PGRST202' || code === '42883') return true;
  const msg = error.message ?? '';
  return /crew_[a-z_]*_2026/.test(msg) && /does not exist|not find/i.test(msg);
}

/** Ce qu'une ÉCRITURE a donné. `extra` porte les paramètres du refus (§6.2). */
export type WriteOutcome<E extends string = string> =
  | { kind: 'ok'; effect: E; data: Readonly<Record<string, unknown>> }
  | {
      kind: 'refusal';
      reason: ManagementRefusal;
      /** Paramètres du refus : `daysLeft`, `endsAt`, `missing`, `detail`… */
      data: Readonly<Record<string, unknown>>;
    }
  | { kind: 'unsupported' }
  | { kind: 'failed' };

async function callWrite<E extends string>(
  fn: string,
  args: Record<string, unknown>,
): Promise<WriteOutcome<E>> {
  // Pas de client configuré = pas de backend : ce n'est pas un refus du serveur.
  if (!supabase) return { kind: 'failed' };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return isUnsupported(error) ? { kind: 'unsupported' } : { kind: 'failed' };
    if (typeof data !== 'object' || data === null) return { kind: 'failed' };
    const root = data as Record<string, unknown>;
    if (root.ok === true) {
      const effect = typeof root.effect === 'string' ? root.effect : 'ok';
      return { kind: 'ok', effect: effect as E, data: root };
    }
    return { kind: 'refusal', reason: refusalOf2026(root) ?? 'unknown', data: root };
  } catch {
    return { kind: 'failed' };
  }
}

/** L'état d'une LECTURE, identique pour les six hooks de ce fichier. */
export interface ReadState<T> {
  signedOut: boolean;
  loading: boolean;
  /** Lecture IMPOSSIBLE — DISTINCT de « le serveur a dit non ». */
  failed: boolean;
  refusal: ManagementRefusal | null;
  data: T | null;
  reload: () => void;
}

/**
 * Le patron de lecture, écrit UNE fois. Chaque hook lui donne son nom de RPC,
 * ses arguments et son parseur ; il ne décide de rien d'autre.
 *
 * `enabled` couvre les lectures qui n'ont pas de sens sans identifiant (la
 * fiche publique d'un crew inconnu) : elles ne partent pas, et n'affichent NI
 * un chargement NI un échec — elles n'ont simplement rien à dire.
 */
function useRpcRead<T>(
  fn: string,
  args: Record<string, unknown>,
  parse: (raw: unknown) => T | null,
  opts: { enabled?: boolean } = {},
): ReadState<T> {
  const enabled = opts.enabled ?? true;
  const { session } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [refusal, setRefusal] = useState<ManagementRefusal | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  // La clé sérialise les arguments : deux tris différents sont deux lectures,
  // et un tableau d'arguments recréé à chaque rendu ne doit pas relancer l'appel.
  const key = JSON.stringify(args);
  const ready = !!supabase && !!session && enabled;

  useEffect(() => {
    if (!ready || !supabase) {
      setData(null);
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
        const res = await client.rpc(fn, JSON.parse(key) as Record<string, unknown>);
        if (cancelled) return;
        if (res.error) {
          setData(null);
          setRefusal(null);
          setFailed(true);
          return;
        }
        const parsed = parse(res.data);
        if (parsed !== null) {
          setData(parsed);
          setRefusal(null);
          setFailed(false);
          return;
        }
        // Lu, mais ce n'est pas la donnée attendue : soit un refus explicite,
        // soit un contrat inattendu. Les deux se disent, aucun ne se tait.
        const why = refusalOf2026(res.data);
        setData(null);
        setRefusal(why);
        setFailed(why === null || why === 'unknown');
      } catch {
        if (cancelled) return;
        setData(null);
        setRefusal(null);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `parse` et `fn` sont stables par construction (fonctions de module).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fn, key, tick]);

  return { signedOut: !session, loading, failed, refusal, data, reload };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LECTURES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le tableau de suivi (`crew_member_board_2026`, 0189). Rôle-gaté
 * `CREW_PERMISSIONS.kick` : un membre simple reçoit `forbidden`, et c'est une
 * RÉPONSE — l'écran l'explique au lieu de proposer « Réessayer ».
 */
export function useCrewBoard(
  sort: CrewBoardSort = CREW_BOARD_SORT_DEFAULT,
  filter: CrewBoardFilter | null = null,
): ReadState<CrewBoard2026> {
  return useRpcRead('crew_member_board_2026', { p_sort: sort, p_filter: filter }, parseBoard);
}

/**
 * Charte, exigences et règles d'un crew (`crew_rules_get_2026`, 0188). Ouverte à
 * TOUT compte connecté, membre ou non : la fiche publique DOIT les montrer avant
 * l'entrée, sinon l'acceptation de charte serait un consentement fictif (§5.3).
 */
export function useCrewRules(crewId: string | null): ReadState<CrewRules2026> {
  return useRpcRead('crew_rules_get_2026', { p_crew_id: crewId }, parseCrewRules, {
    enabled: crewId !== null,
  });
}

/** Ce qu'il ME manque pour candidater (`crew_eligibility_2026`, 0188). */
export function useCrewEligibility(crewId: string | null): ReadState<CrewEligibility2026> {
  return useRpcRead('crew_eligibility_2026', { p_crew_id: crewId }, parseEligibility, {
    enabled: crewId !== null,
  });
}

/** Ma situation dans MON crew (`crew_my_standing_2026`, 0189). ⚠ Cette lecture ACQUITTE. */
export function useMyStanding(): ReadState<MyStanding2026> {
  return useRpcRead('crew_my_standing_2026', {}, parseStanding);
}

/** Le journal des décisions (`crew_decisions_log_2026`, 0189). */
export function useCrewDecisions(limit = 50): ReadState<readonly Decision2026[]> {
  return useRpcRead('crew_decisions_log_2026', { p_limit: limit }, parseDecisions);
}

// ─── Découverte à filtres (`crew_discovery_2026`, 0190) ─────────────────────
//
// ⚠ 11/09/2026 (lot Q4) : `DiscoveryFilters2026` (six champs, dont quatre
// jamais envoyés) est remplacé par `DiscoveryFilterState2026`, PUR et testé
// (`crewDiscoveryFilters2026.ts`). Les quatre paramètres de 0190 qui restaient
// à `null` en dur — discipline, taille, étiquettes, activité récente — sont
// désormais construits là-bas, et l'écran les peint.

export interface DiscoveryRow2026 {
  readonly id: string;
  readonly name: string;
  readonly tag: string | null;
  readonly cityId: string;
  readonly recruitmentStatus: string;
  readonly memberCount: number;
  readonly upcomingOutings: number;
  readonly nextOutingAtMs: number | null;
  readonly membersHolding: number;
  readonly holdsRun: boolean;
  readonly holdsBike: boolean;
  readonly lastCaptureAtMs: number | null;
  readonly myRequestPending: boolean;
  readonly hasRequirements: boolean;
  readonly hasCharter: boolean;
  /**
   * Un BOOLÉEN, jamais la liste de ce qui manque : le détail n'appartient qu'à
   * la fiche du crew (§6.3). Il ne se lit que s'il y a des exigences.
   */
  readonly iAmEligible: boolean;
}

export interface DiscoveryPage2026 {
  readonly cityId: string;
  readonly cityName: string | null;
  readonly rows: readonly DiscoveryRow2026[];
}

const msOf = (v: unknown): number | null => {
  if (typeof v !== 'string' || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

export function parseDiscovery2026(raw: unknown): DiscoveryPage2026 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true || typeof o.cityId !== 'string') return null;
  const rows: DiscoveryRow2026[] = [];
  if (Array.isArray(o.rows)) {
    for (const item of o.rows) {
      if (typeof item !== 'object' || item === null) continue;
      const r = item as Record<string, unknown>;
      if (typeof r.id !== 'string' || typeof r.name !== 'string') continue;
      rows.push({
        id: r.id,
        name: r.name,
        tag: typeof r.tag === 'string' && r.tag.length > 0 ? r.tag : null,
        cityId: typeof r.cityId === 'string' ? r.cityId : o.cityId,
        // Un statut inconnu vaut `closed` : le défaut le plus fermé est le seul
        // qui ne peut pas peindre un bouton mort (même arbitrage que 0083).
        recruitmentStatus:
          typeof r.recruitmentStatus === 'string' ? r.recruitmentStatus : 'closed',
        memberCount: Math.max(0, Number(r.memberCount) || 0),
        upcomingOutings: Math.max(0, Number(r.upcomingOutings) || 0),
        nextOutingAtMs: msOf(r.nextOutingAt),
        membersHolding: Math.max(0, Number(r.membersHolding) || 0),
        holdsRun: r.holdsRun === true,
        holdsBike: r.holdsBike === true,
        lastCaptureAtMs: msOf(r.lastCaptureAt),
        myRequestPending: r.myRequestPending === true,
        hasRequirements: r.hasRequirements === true,
        hasCharter: r.hasCharter === true,
        iAmEligible: r.iAmEligible === true,
      });
    }
  }
  return {
    cityId: o.cityId,
    cityName: typeof o.cityName === 'string' ? o.cityName : null,
    rows,
  };
}

export function useCrewDiscovery2026(f: DiscoveryFilterState2026): ReadState<DiscoveryPage2026> {
  // La charge utile est construite AILLEURS, et testée : le serveur refuse une
  // valeur hors catalogue au lieu de la rogner, donc une charge fausse ne se
  // verrait qu'à l'exécution, sur un écran vide sans explication.
  return useRpcRead(
    'crew_discovery_2026',
    { ...discoveryPayload2026(f) },
    parseDiscovery2026,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ÉCRITURES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Écrit charte, exigences ET règles. Les trois partent ENSEMBLE : la RPC fait
 * `coalesce(p_requirements, '{}')`, donc n'en envoyer qu'un remettrait les deux
 * autres à zéro en silence. `rulesPayload` (pur) construit la charge.
 */
export function saveCrewRules(payload: {
  p_charter: string | null;
  p_requirements: Record<string, number | string>;
  p_enforcement: Record<string, number>;
}): Promise<WriteOutcome<'ok'>> {
  return callWrite('crew_rules_set_2026', payload);
}

/** Le `detail` d'un `bad_rules`, pour que l'écran dise LEQUEL des dix refus. */
export function detailOfRefusal(out: WriteOutcome): BadRulesDetail | null {
  return out.kind === 'refusal' ? badRulesDetail(out.data) : null;
}

/** Candidater : le message s'écrit ENFIN (trou ① de la spec). */
export function applyToCrew(
  crewId: string,
  message: string,
  charterVersion: number | null,
): Promise<WriteOutcome<'applied' | 'joined'>> {
  return callWrite('crew_apply_2026', {
    p_crew_id: crewId,
    p_message: message.trim().length > 0 ? message.trim() : null,
    p_charter_version: charterVersion,
  });
}

/** Le détail de ce qui manque, quand le serveur refuse `not_eligible`. */
export function missingOfRefusal(out: WriteOutcome): readonly MissingRequirement2026[] {
  return out.kind === 'refusal' ? parseMissing(out.data.missing) : [];
}

/** Accepter une version PRÉCISE de la charte. Ne pas appeler EST le refus. */
export function acceptCharter(version: number): Promise<WriteOutcome<'ok'>> {
  return callWrite('crew_accept_charter_2026', { p_charter_version: version });
}

/** Avertir à la main. Un avertissement par membre et par JOUR (`unchanged` sinon). */
export function warnMember(
  userId: string,
  note: string,
): Promise<WriteOutcome<'warned' | 'unchanged'>> {
  return callWrite('crew_warn_member_2026', {
    p_user_id: userId,
    p_note: note.trim().length > 0 ? note.trim() : null,
  });
}

/**
 * Exclure AVEC UN MOTIF. Remplace `crew_remove_member` (0093), qui n'en portait
 * aucun et n'écrivait aucune trace : c'était le dernier endroit du lot où la
 * garantie « toute exclusion dit son motif » n'était pas tenue (§6.7 ④).
 */
export function removeMemberWithReason(
  userId: string,
  reason: CrewKickReason,
  note: string,
): Promise<WriteOutcome<'removed' | 'already_removed'>> {
  return callWrite('crew_remove_member_2026', {
    p_user_id: userId,
    p_reason: reason,
    p_note: note.trim().length > 0 ? note.trim() : null,
  });
}

/** Lever un avertissement. La trace RESTE : levé n'est pas effacé. */
export function resolveWarning(
  warningId: string,
): Promise<WriteOutcome<'resolved' | 'already_resolved'>> {
  return callWrite('crew_resolve_warning_2026', { p_warning_id: warningId });
}

/**
 * Inviter par pseudo. ⚠ LE JETON NE REVIENT PAS À L'INVITEUR : il est posé dans
 * la boîte de réception de la personne visée, et l'acceptation reste
 * `redeem_crew_invite` (0090). Cet écran ne peut donc PAS afficher un lien à
 * partager : le prétendre serait un bouton mort.
 */
export function inviteByHandle(
  handle: string,
): Promise<WriteOutcome<'invited' | 'already_member'>> {
  return callWrite('crew_invite_by_handle_2026', { p_handle: handle.trim() });
}

/**
 * Dissoudre. Fondateur SEUL. Le serveur refuse `active_challenge` avec la date
 * de clôture : un refus sans échéance serait un cul-de-sac.
 */
export function dissolveCrew(reason: string): Promise<WriteOutcome<'archived'>> {
  return callWrite('crew_dissolve_2026', {
    p_reason: reason.trim().length > 0 ? reason.trim() : null,
  });
}

/**
 * Le refus d'une dissolution, ramené au catalogue de game-rules. Un motif hors
 * `CREW_DISSOLVE_REFUSALS` n'est pas traduit au hasard : il retombe sur `null`,
 * et l'écran affiche le refus générique.
 */
export function dissolveRefusalOf(
  out: WriteOutcome,
): (typeof CREW_DISSOLVE_REFUSALS)[number] | null {
  if (out.kind !== 'refusal') return null;
  return (CREW_DISSOLVE_REFUSALS as readonly string[]).includes(out.reason)
    ? (out.reason as (typeof CREW_DISSOLVE_REFUSALS)[number])
    : null;
}
