/**
 * GRYD — close_offensives/logic.ts : la partie PURE du job de clôture (§38.3).
 *
 * `index.ts` ne fait que de l'I/O (auth cron, lectures paginées, RPC) ; tout ce
 * qui LIT, TRANSFORME ou JUGE vit ici, et est testé en Deno.
 *
 * ─── POURQUOI CE JOB EXISTE ─────────────────────────────────────────────────
 * `offensives` n'apparaissait dans AUCUN job : rien ne passait jamais 'active'
 * → 'done', rien ne calculait `result`. Conséquence mesurée : les 200 XP crew de
 * `CREW_XP_SOURCES.offensiveCompleted` ne tombaient jamais, et la métrique
 * `offensivesJoined` (famille de badges Raid Leader, skill Strategist) restait
 * à 0 — donc INATTEIGNABLE. La migration 0064 a posé les deux transitions SQL ;
 * ce module en est la moitié décisionnelle.
 *
 * ─── CE QUI N'EST PAS DÉCIDÉ ICI ────────────────────────────────────────────
 * Le VERDICT vient du moteur pur déjà existant `offensiveResult()` (crew.ts) et
 * la RÉCOMPENSE de `offensiveAward()` (offensive.ts) : ce fichier ne rejuge
 * rien, il assemble. AUCUN nombre magique — aucun seuil, aucun barème n'est
 * écrit ici ni en SQL.
 *
 * ─── HONNÊTETÉ ──────────────────────────────────────────────────────────────
 * Les parseurs ci-dessous ne DEVINENT jamais : une réponse RPC de forme
 * inattendue donne `found: false` / `finalized: false` (donc « rien n'a été
 * fait »), jamais un succès par défaut. Un rapport à zéro est la réponse
 * normale d'une base sans offensive — pas un échec, et surtout pas un succès
 * décoratif.
 *
 * ANTI PAY-TO-WIN : rien ici ne lit un statut payant. Le résultat d'une
 * offensive ne dépend QUE des hexes réellement pris dans le théâtre.
 */
import { offensiveResult } from '../_shared/engine/crew.ts';
import {
  joinedContributors,
  offensiveAward,
  offensiveHexesTaken,
  type OffensiveContribution,
} from '../_shared/engine/offensive.ts';
import type { OffensiveResult } from '../_shared/game-rules.ts';

// ─── Lignes lues (telles que PostgREST les rend) ─────────────────────────────

/** Offensive dont la fenêtre est close et qui n'est pas encore 'done' (PASSE B). */
export interface DueOffensiveRow {
  id: string;
}

/** Offensive clôturée mais pas encore finalisée (PASSE C — reprend les crashs). */
export interface PendingFinalizeRow {
  id: string;
  crew_id: string;
  /** L'objectif chiffré du théâtre (jamais null en base : `not null` en 0010). */
  objectif_hexes: number | string | null;
  /** Hexes FIGÉS par la transition A. Null seulement sur une ligne historique. */
  hexes_taken: number | string | null;
  /** Horodatage de clôture — sert à attribuer le coffre à la BONNE semaine. */
  closed_at: string | null;
}

/** Une ligne de `offensive_contributions` (écrite en production par ingest_run). */
export interface ContributionRow {
  user_id: string;
  hexes: number | string | null;
}

/** Nombre lu d'une source non typée (PostgREST rend souvent du texte). 0 si illisible. */
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * PostgREST rend le jsonb d'une RPC tel quel, mais certaines RPC `returns table`
 * arrivent enveloppées dans un tableau d'une ligne. On déballe défensivement.
 * PURE.
 */
function unwrap(raw: unknown): unknown {
  return Array.isArray(raw) ? raw[0] : raw;
}

// ─── PASSE A : activation ────────────────────────────────────────────────────

/**
 * Ids activés par `activate_due_offensives()` → {"activated": [uuid, …]}. PURE.
 * Une forme inattendue rend `[]` : on ne prétend PAS avoir activé quoi que ce
 * soit qu'on ne peut pas nommer.
 */
export function parseActivated(raw: unknown): string[] {
  const body = unwrap(raw);
  if (!isRecord(body)) return [];
  const list = body.activated;
  if (!Array.isArray(list)) return [];
  return list.filter((v): v is string => typeof v === 'string');
}

// ─── PASSE B : réclamation de clôture ────────────────────────────────────────

/** Issue d'un `claim_offensive_close` (transition A). */
export interface ClaimOutcome {
  /** L'offensive existe-t-elle encore ? (false = supprimée entre lecture et RPC) */
  found: boolean;
  /** CE passage a-t-il gagné la transition ? false ⇒ NE RIEN CRÉDITER ICI. */
  claimed: boolean;
  crewId: string | null;
  /** Hexes figés à la clôture (null si la RPC n'a rien pu figer). */
  hexesTaken: number | null;
  objectifHexes: number | null;
}

/**
 * Parse la réponse de `claim_offensive_close`. PURE.
 * Par défaut : found=false, claimed=false — le silence ne vaut jamais un
 * « c'est fait ». `claimed=false` sur une offensive trouvée est le cas NORMAL
 * d'un rejeu de cron (elle était déjà 'done'), pas une erreur.
 */
export function parseClaim(raw: unknown): ClaimOutcome {
  const body = unwrap(raw);
  if (!isRecord(body)) {
    return { found: false, claimed: false, crewId: null, hexesTaken: null, objectifHexes: null };
  }
  return {
    found: body.found === true,
    claimed: body.claimed === true,
    crewId: typeof body.crew_id === 'string' ? body.crew_id : null,
    hexesTaken: body.hexes_taken == null ? null : num(body.hexes_taken),
    objectifHexes: body.objectif_hexes == null ? null : num(body.objectif_hexes),
  };
}

// ─── PASSE C : finalisation ──────────────────────────────────────────────────

/** Contributions lues → entrée du moteur pur. PURE. */
export function toContributions(rows: readonly ContributionRow[]): OffensiveContribution[] {
  return rows.map((r) => ({ userId: String(r.user_id), hexes: num(r.hexes) }));
}

/** Ce que le job s'apprête à écrire pour UNE offensive clôturée. */
export interface FinalizationPlan {
  offensiveId: string;
  crewId: string;
  /** Hexes retenus pour le verdict (figés à la clôture). */
  hexesTaken: number;
  objectifHexes: number;
  result: OffensiveResult;
  crewXp: number;
  chestDelta: number;
  /** Contributeurs comptant comme ayant REJOINT (seuil OFFENSIVE_JOINED_MIN_HEXES). */
  joinedUserIds: string[];
  /** Lundi ISO de la semaine où l'offensive s'est TERMINÉE (coffre, §39). */
  weekStart: string;
}

/**
 * Assemble le plan de finalisation d'une offensive clôturée. PURE.
 *
 * `hexes_taken` est la source : il a été FIGÉ sous verrou par la transition A,
 * au moment exact où l'offensive est passée 'done'. Les contributions ne sont
 * relues que pour savoir QUI a participé — et, pour une ligne historique sans
 * `hexes_taken` (normalisée par 0064), comme repli MESURÉ (leur somme), jamais
 * comme invention.
 *
 * La semaine de coffre est celle de la CLÔTURE, pas celle du cron : après une
 * panne de plusieurs jours, l'effort reste attribué à la semaine où il a eu
 * lieu. `now` ne sert que si `closed_at` manque.
 */
export function planFinalization(
  row: PendingFinalizeRow,
  contributions: readonly ContributionRow[],
  now: Date,
): FinalizationPlan {
  const parsed = toContributions(contributions);
  const hexesTaken = row.hexes_taken == null ? offensiveHexesTaken(parsed) : num(row.hexes_taken);
  const objectifHexes = num(row.objectif_hexes);
  const result = offensiveResult(hexesTaken, objectifHexes);
  const award = offensiveAward(result);
  const closedAt = row.closed_at ? new Date(row.closed_at) : null;
  const weekRef = closedAt && !Number.isNaN(closedAt.getTime()) ? closedAt : now;
  return {
    offensiveId: row.id,
    crewId: row.crew_id,
    hexesTaken,
    objectifHexes,
    result,
    crewXp: award.crewXp,
    chestDelta: award.chestDelta,
    joinedUserIds: joinedContributors(parsed),
    weekStart: isoWeekStart(weekRef),
  };
}

/** Issue d'un `finalize_offensive` (transition B). */
export interface FinalizeOutcome {
  /** CE passage a-t-il écrit le résultat ET crédité ? false ⇒ rien n'a bougé. */
  finalized: boolean;
  levelFrom: number | null;
  levelTo: number | null;
  /** Membres dont `user_stats.offensives_joined` a réellement été incrémenté. */
  joined: number;
}

/** Parse la réponse de `finalize_offensive`. PURE (défaut : rien n'a été fait). */
export function parseFinalize(raw: unknown): FinalizeOutcome {
  const body = unwrap(raw);
  if (!isRecord(body)) return { finalized: false, levelFrom: null, levelTo: null, joined: 0 };
  return {
    finalized: body.finalized === true,
    levelFrom: typeof body.level_from === 'number' ? body.level_from : null,
    levelTo: typeof body.level_to === 'number' ? body.level_to : null,
    joined: num(body.joined),
  };
}

// ─── Calendrier ──────────────────────────────────────────────────────────────

/**
 * Lundi ISO ('YYYY-MM-DD') de la semaine d'une date — clé `week_start` du
 * coffre crew. PURE. Miroir exact du helper d'ingest_run/digest_job : c'est un
 * calcul de calendrier, pas une constante de jeu (rien à mettre en game-rules).
 */
export function isoWeekStart(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // lundi=0 … dimanche=6
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

// ─── Rapport du job ──────────────────────────────────────────────────────────

/**
 * Un échec ISOLÉ (une offensive), qui n'arrête pas le balayage — sauf `scan`,
 * qui signale une lecture impossible et interrompt le passage.
 */
export interface JobFailure {
  step: 'activate' | 'scan' | 'close' | 'contributions' | 'finalize';
  offensiveId: string | null;
  message: string;
}

/**
 * Compteurs RÉELS du passage. Tout est à zéro quand il n'y a rien à faire —
 * c'est la réponse honnête d'une base sans offensive, pas un échec.
 */
export interface OffensiveJobReport {
  /** false dès qu'un échec isolé a été rencontré (le reste a quand même tourné). */
  ok: boolean;
  /** preparation → active (PASSE A). */
  activated: number;
  /** Offensives dont la fenêtre est close, examinées par CE passage (PASSE B). */
  due: number;
  /** Transitions 'done' GAGNÉES par ce passage. */
  closed: number;
  /** Déjà clôturées par un passage précédent (rejeu de cron) : aucun crédit. */
  alreadyClosed: number;
  /** Disparues entre la lecture et la RPC (suppression de crew, par ex.). */
  vanished: number;
  /** Résultats ÉCRITS par ce passage (PASSE C). */
  finalized: number;
  victories: number;
  partials: number;
  fails: number;
  /** XP crew réellement créditée par ce passage (0 sur un échec d'offensive). */
  xpCredited: number;
  /** Progression de coffre réellement créditée. */
  chestCredited: number;
  /** Incréments de `user_stats.offensives_joined` réellement écrits. */
  joinedCredited: number;
  /** Montées de niveau crew provoquées par ces clôtures. */
  crewLevelUps: number;
  failures: JobFailure[];
}

/** Rapport vierge (tout à zéro, ok=true). PURE. */
export function emptyReport(): OffensiveJobReport {
  return {
    ok: true,
    activated: 0,
    due: 0,
    closed: 0,
    alreadyClosed: 0,
    vanished: 0,
    finalized: 0,
    victories: 0,
    partials: 0,
    fails: 0,
    xpCredited: 0,
    chestCredited: 0,
    joinedCredited: 0,
    crewLevelUps: 0,
    failures: [],
  };
}

/** Comptabilise une issue de PASSE B. PURE (mutation du seul rapport). */
export function recordClaim(report: OffensiveJobReport, outcome: ClaimOutcome): void {
  if (!outcome.found) report.vanished += 1;
  else if (outcome.claimed) report.closed += 1;
  else report.alreadyClosed += 1;
}

/**
 * Comptabilise une issue de PASSE C. PURE.
 * RÈGLE D'HONNÊTETÉ : on ne compte l'XP/le coffre/les participations QUE si la
 * RPC dit avoir finalisé. `finalized=false` (déjà finalisée par un autre
 * passage) n'ajoute RIEN — sinon le rapport doublerait le crédit sur un rejeu.
 */
export function recordFinalize(
  report: OffensiveJobReport,
  plan: FinalizationPlan,
  outcome: FinalizeOutcome,
): void {
  if (!outcome.finalized) return;
  report.finalized += 1;
  if (plan.result === 'victory') report.victories += 1;
  else if (plan.result === 'partial') report.partials += 1;
  else report.fails += 1;
  report.xpCredited += plan.crewXp;
  report.chestCredited += plan.chestDelta;
  report.joinedCredited += outcome.joined;
  if (
    outcome.levelFrom !== null && outcome.levelTo !== null && outcome.levelTo > outcome.levelFrom
  ) {
    report.crewLevelUps += 1;
  }
}

/** Consigne un échec isolé : le job continue, mais ne se dit plus « ok ». PURE. */
export function recordFailure(
  report: OffensiveJobReport,
  step: JobFailure['step'],
  offensiveId: string | null,
  message: string,
): void {
  report.ok = false;
  report.failures.push({ step, offensiveId, message });
}
