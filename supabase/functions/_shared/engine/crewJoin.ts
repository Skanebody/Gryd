// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/crewJoin.ts

/**
 * GRYD — engine/crewJoin.ts (pré-vol UX des RPC crew : create/join/switch).
 *
 * Fonctions PURES : aucune I/O, aucune horloge implicite (`now` injecté), aucun
 * nombre magique (seuils depuis @klaim/shared/game-rules). Rejouent CÔTÉ CLIENT
 * la MÊME décision que les RPC serveur `create_crew` / `join_crew_by_code`, pour
 * l'UX AVANT l'aller-retour réseau : griser le bouton, afficher « encore N j »
 * de cooldown. Le serveur reste seul JUGE — ceci n'anticipe que le verdict.
 *
 * Sémantique miroir du contrat RPC :
 *  - join vers le MÊME crew actif → already_member (l'UI le lit « déjà dedans » ;
 *    le serveur, lui, est idempotent) ;
 *  - cooldown = un left_at récent (< CREW_SWITCH_COOLDOWN_DAYS) bloque tout
 *    (re)join / création — daysLeft = ceil des jours restants ;
 *  - full = crew cible pleine (targetMemberCount >= CREW_MAX_MEMBERS) ;
 *  - un switch direct (crew actif ≠ cible, sans left_at récent) est OK : le
 *    serveur clôt l'ancienne adhésion puis adhère, pas besoin de quitter avant ;
 *  - create refuse si déjà membre actif (already_in_crew : quitter d'abord).
 */
import {
  CREW_MAX_MEMBERS,
  CREW_SWITCH_COOLDOWN_DAYS,
} from '../game-rules.ts';

// ─── Contexte & verdicts ─────────────────────────────────────────────────────

/** État lu côté client au moment de la décision (aucune horloge implicite). */
export interface CrewJoinContext {
  /** Instant de référence (injecté : PURE). */
  now: Date;
  /** Crew actif du joueur, ou null s'il n'en a aucun. */
  activeCrewId: string | null;
  /** Date du dernier départ de crew (`left_at`), ou null si jamais parti. */
  lastLeftAt: Date | null;
  /** Nombre de membres du crew CIBLE (pour le plafond). */
  targetMemberCount: number;
}

/** Contexte de création : pas de crew cible → pas de compteur de membres. */
export type CrewCreateContext = Omit<CrewJoinContext, 'targetMemberCount'>;

/** Verdict d'un join / switch (pré-vol). daysLeft présent SEULEMENT si cooldown. */
export type CrewJoinVerdict =
  | { ok: true }
  | { ok: false; reason: 'already_member' | 'cooldown' | 'full'; daysLeft?: number };

/** Verdict d'une création (pré-vol). daysLeft présent SEULEMENT si cooldown. */
export type CrewCreateVerdict =
  | { ok: true }
  | { ok: false; reason: 'already_in_crew' | 'cooldown'; daysLeft?: number };

// ─── Cooldown de switch ──────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Jours de cooldown restants (0 si aucun). PURE.
 *
 * Cooldown ACTIF tant que `lastLeftAt > now - CREW_SWITCH_COOLDOWN_DAYS`, c.-à-d.
 * tant que la fin de cooldown (`lastLeftAt + N j`) est STRICTEMENT dans le futur.
 * À EXACTEMENT N jours écoulés (fin == now) → plus de cooldown → 0 (borne OK).
 * daysLeft = ceil des jours restants. Défensif : lastLeftAt null ou Invalid Date
 * (remaining NaN) → 0.
 */
function cooldownDaysLeft(now: Date, lastLeftAt: Date | null): number {
  if (lastLeftAt === null) return 0;
  const cooldownEndMs = lastLeftAt.getTime() + CREW_SWITCH_COOLDOWN_DAYS * MS_PER_DAY;
  const remainingMs = cooldownEndMs - now.getTime();
  // `!(remainingMs > 0)` attrape aussi NaN (Invalid Date) → 0, jamais de cooldown fantôme.
  if (!(remainingMs > 0)) return 0;
  return Math.ceil(remainingMs / MS_PER_DAY);
}

// ─── Décisions pré-vol ───────────────────────────────────────────────────────

/**
 * Verdict pré-vol d'un join / switch vers `targetCrewId`. PURE, miroir de
 * `join_crew_by_code`. Ordre du contrat (reasons: cooldown avant full) :
 *  1. déjà membre actif du MÊME crew → already_member ;
 *  2. left_at récent → cooldown (daysLeft) — bloque aussi le switch ;
 *  3. crew cible pleine → full ;
 *  4. sinon OK (y compris un switch direct depuis un autre crew).
 */
export function crewJoinDecision(
  ctx: CrewJoinContext,
  targetCrewId: string,
): CrewJoinVerdict {
  if (ctx.activeCrewId !== null && ctx.activeCrewId === targetCrewId) {
    return { ok: false, reason: 'already_member' };
  }
  const daysLeft = cooldownDaysLeft(ctx.now, ctx.lastLeftAt);
  if (daysLeft > 0) return { ok: false, reason: 'cooldown', daysLeft };
  if (ctx.targetMemberCount >= CREW_MAX_MEMBERS) return { ok: false, reason: 'full' };
  return { ok: true };
}

/**
 * Verdict pré-vol d'une création de crew. PURE, miroir de `create_crew` :
 *  1. déjà membre actif d'un crew → already_in_crew (quitter d'abord) ;
 *  2. left_at récent → cooldown (daysLeft) ;
 *  3. sinon OK.
 */
export function crewCreateDecision(ctx: CrewCreateContext): CrewCreateVerdict {
  if (ctx.activeCrewId !== null) return { ok: false, reason: 'already_in_crew' };
  const daysLeft = cooldownDaysLeft(ctx.now, ctx.lastLeftAt);
  if (daysLeft > 0) return { ok: false, reason: 'cooldown', daysLeft };
  return { ok: true };
}
