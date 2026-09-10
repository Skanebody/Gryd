/**
 * GRYD — LE TABLEAU DE SUIVI, MA SITUATION, LE JOURNAL : côté LECTURE (LOT Q3).
 *
 * ─── LA SEULE RÈGLE QUI COMPTE DANS CE FICHIER ───────────────────────────────
 * Une mesure vaut soit une VALEUR, soit le littéral `'not_shared'`. JAMAIS
 * `null`, JAMAIS `0` pour une donnée masquée (§6.3, lecture obligatoire ①).
 * Le serveur tient ce contrat ; ce module le tient à son tour dans le type, de
 * sorte qu'un écran ne PUISSE PAS écrire `row.distance28dKm ?? 0` sans que le
 * compilateur le voie. C'est la loi L8 (« l'app ne ment jamais ») rendue
 * mécanique : un `0` affirmerait que la personne n'a pas couru, alors qu'on ne
 * sait simplement pas.
 *
 * Trois cas se distinguent, et ils ne doivent JAMAIS se confondre :
 *   · `42`            → la mesure, lue ;
 *   · `'not_shared'`  → cette personne a fermé son profil, et aucune règle
 *                       active du crew ne déverrouille cette mesure-là ;
 *   · `null` sur `lastRunAt` UNIQUEMENT → cette personne n'a JAMAIS couru.
 *                       C'est un fait, pas un masquage.
 *
 * ─── PUR : AUCUN REACT, AUCUN RÉSEAU ─────────────────────────────────────────
 * Les appels vivent dans `crewManagementData.ts`, les écrans dans
 * `app/crew-gestion.tsx`, `app/crew-ma-situation.tsx`, `app/crew-journal.tsx`.
 */
import {
  CREW_ENFORCEMENT_KEYS,
  CREW_MEASURE_NOT_SHARED,
  CREW_STANDING_STATES,
  CREW_WARNING_KINDS,
  type CrewBoardFilter,
  type CrewBoardSort,
  type CrewEnforcementKey,
  type CrewRoleDuty,
  type CrewStandingState,
  type CrewWarningKind,
} from '@klaim/shared';

// ─── Lecture DÉFENSIVE du jsonb ──────────────────────────────────────────────

const asText = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

const asMs = (v: unknown): number | null => {
  if (typeof v !== 'string' || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

const asInt = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA MESURE, ET SON MASQUE
// ═══════════════════════════════════════════════════════════════════════════

/** Une valeur lue, ou le masque de vie privée. Rien d'autre n'existe. */
export type CrewMeasure = number | typeof CREW_MEASURE_NOT_SHARED;

/** `true` si la mesure est LUE. Le seul chemin autorisé vers un nombre. */
export function isShared(m: CrewMeasure | null): m is number {
  return typeof m === 'number';
}

/**
 * jsonb → mesure. Une valeur inattendue est traitée comme MASQUÉE, jamais comme
 * zéro : ne pas savoir lire est plus proche de « je ne sais pas » que de « rien ».
 */
function asMeasure(v: unknown): CrewMeasure {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return CREW_MEASURE_NOT_SHARED;
}

/**
 * `lastRunAt` a TROIS valeurs, et c'est la seule colonne du tableau qui en a
 * trois : un instant, le masque, ou `null` (« n'a jamais couru »). Les replier
 * l'une sur l'autre effacerait soit un fait, soit un consentement.
 */
export type LastRun = number | typeof CREW_MEASURE_NOT_SHARED | null;

function asLastRun(v: unknown): LastRun {
  if (v === CREW_MEASURE_NOT_SHARED) return CREW_MEASURE_NOT_SHARED;
  if (v === null || v === undefined) return null;
  const ms = asMs(v);
  // Une chaîne illisible qui n'est pas le masque : on ne l'invente pas en date,
  // et on ne la déclare pas « jamais couru » non plus. Elle vaut masquée.
  return ms ?? CREW_MEASURE_NOT_SHARED;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. `crew_member_board_2026`
// ═══════════════════════════════════════════════════════════════════════════

export interface BoardWarning2026 {
  readonly id: string;
  readonly kind: CrewWarningKind;
  readonly issuedAtMs: number | null;
  /** `'server'` (le job) ou `'officer'`. JAMAIS un pseudo : §6.3. */
  readonly issuedBy: 'server' | 'officer';
  readonly note: string | null;
  readonly acknowledgedAtMs: number | null;
}

export interface BoardRow2026 {
  readonly userId: string;
  readonly pseudo: string;
  readonly role: string;
  readonly duty: CrewRoleDuty | null;
  readonly joinedAtMs: number | null;
  readonly seniorityDays: number;
  readonly lastRunAt: LastRun;
  readonly runs7d: CrewMeasure;
  readonly runs28d: CrewMeasure;
  readonly distance7dKm: CrewMeasure;
  readonly distance28dKm: CrewMeasure;
  readonly loops28d: CrewMeasure;
  readonly challengeDays: CrewMeasure;
  readonly outingsJoined28d: CrewMeasure;
  readonly outingsCreated28d: CrewMeasure;
  readonly warnings: readonly BoardWarning2026[];
  readonly standing: CrewStandingState;
  readonly removalAtMs: number | null;
}

export interface CrewBoard2026 {
  readonly rows: readonly BoardRow2026[];
  /** Les règles ARMÉES, telles quelles. `{}` = ce crew n'en a aucune. */
  readonly rulesActive: Readonly<Partial<Record<CrewEnforcementKey, number>>>;
  readonly sort: CrewBoardSort;
  readonly filter: CrewBoardFilter | null;
  readonly generatedAtMs: number | null;
}

const DUTIES: readonly string[] = ['member', 'organizer', 'moderator', 'captain'];

function parseWarning(raw: unknown): BoardWarning2026 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const id = asText(o.id);
  const kind = asText(o.kind);
  if (!id || !kind || !(CREW_WARNING_KINDS as readonly string[]).includes(kind)) return null;
  return {
    id,
    kind: kind as CrewWarningKind,
    issuedAtMs: asMs(o.issuedAt),
    // Tout ce qui n'est pas explicitement `officer` est traité comme le
    // SERVEUR : c'est le seul défaut qui ne prête un geste à personne.
    issuedBy: o.issuedBy === 'officer' ? 'officer' : 'server',
    note: asText(o.note),
    acknowledgedAtMs: asMs(o.acknowledgedAt),
  };
}

export function parseBoardRow(raw: unknown): BoardRow2026 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const userId = asText(o.userId);
  const pseudo = asText(o.pseudo);
  // Pas d'identité = pas de ligne. On n'affiche jamais une ligne anonyme dans un
  // écran qui sert à décider du sort de quelqu'un.
  if (!userId || !pseudo) return null;
  const duty = asText(o.duty);
  const standing = asText(o.standing);
  const warnings: BoardWarning2026[] = [];
  if (Array.isArray(o.warnings)) {
    for (const w of o.warnings) {
      const parsed = parseWarning(w);
      if (parsed) warnings.push(parsed);
    }
  }
  return {
    userId,
    pseudo,
    role: asText(o.role) ?? '',
    duty: duty && DUTIES.includes(duty) ? (duty as CrewRoleDuty) : null,
    joinedAtMs: asMs(o.joinedAt),
    seniorityDays: Math.max(0, asInt(o.seniorityDays)),
    lastRunAt: asLastRun(o.lastRunAt),
    runs7d: asMeasure(o.runs7d),
    runs28d: asMeasure(o.runs28d),
    distance7dKm: asMeasure(o.distance7dKm),
    distance28dKm: asMeasure(o.distance28dKm),
    loops28d: asMeasure(o.loops28d),
    challengeDays: asMeasure(o.challengeDays),
    outingsJoined28d: asMeasure(o.outingsJoined28d),
    outingsCreated28d: asMeasure(o.outingsCreated28d),
    warnings,
    // Un état inconnu vaut `rule_off` : « il n'y a rien à respecter » ne
    // reproche rien à personne, là où `warned` accuserait à tort.
    standing:
      standing && (CREW_STANDING_STATES as readonly string[]).includes(standing)
        ? (standing as CrewStandingState)
        : 'rule_off',
    removalAtMs: asMs(o.removalAt),
  };
}

const SORTS: readonly string[] = ['last_run', 'distance_28d', 'seniority', 'role'];
const FILTERS: readonly string[] = ['at_risk', 'warned', 'never_ran', 'officers'];

export function parseBoard(raw: unknown): CrewBoard2026 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true) return null;
  const rows: BoardRow2026[] = [];
  if (Array.isArray(o.rows)) {
    for (const item of o.rows) {
      const r = parseBoardRow(item);
      if (r) rows.push(r);
    }
  }
  const active: Partial<Record<CrewEnforcementKey, number>> = {};
  if (typeof o.rulesActive === 'object' && o.rulesActive !== null) {
    const src = o.rulesActive as Record<string, unknown>;
    for (const key of CREW_ENFORCEMENT_KEYS) {
      const n = typeof src[key] === 'number' ? (src[key] as number) : Number(src[key]);
      if (Number.isFinite(n) && n > 0) active[key] = n;
    }
  }
  const sort = asText(o.sort);
  const filter = asText(o.filter);
  return {
    rows,
    rulesActive: active,
    sort: sort && SORTS.includes(sort) ? (sort as CrewBoardSort) : 'last_run',
    filter: filter && FILTERS.includes(filter) ? (filter as CrewBoardFilter) : null,
    generatedAtMs: asMs(o.generatedAt),
  };
}

/**
 * Les alertes de l'en-tête (§4.1 A). Elles comptent des LIGNES LUES, jamais une
 * estimation : un crew dont toutes les mesures sont masquées affiche donc zéro
 * alerte, et c'est honnête — on ne peut pas alerter sur ce qu'on ne voit pas.
 */
export function boardAlerts(board: CrewBoard2026): { atRisk: number; warned: number } {
  let atRisk = 0;
  let warned = 0;
  for (const r of board.rows) {
    if (r.standing === 'at_risk') atRisk += 1;
    else if (r.standing === 'warned') warned += 1;
  }
  return { atRisk, warned };
}

/**
 * LA CONSÉQUENCE D'UN RÉGLAGE, avant qu'il soit armé (§4.1 B).
 *
 * Elle se dérive du tableau DÉJÀ LU : le serveur n'a pas de RPC de simulation,
 * et en écrire une côté client ferait diverger deux calculs du même fait. Trois
 * réglages sont simulables, le quatrième ne l'est pas :
 *   · `max_inactivity_days` → dernière sortie plus vieille que N jours ;
 *   · `min_weekly_outings`  → moins de N courses sur 7 jours ;
 *   · `min_challenge_days`  → moins de N journées contribuées au défi ;
 *   · `auto_remove_after_days` → il ne mesure RIEN par lui-même : il compte des
 *     jours APRÈS un avertissement qui n'existe pas encore. Le simuler
 *     annoncerait des retraits imaginaires. Il rend donc toujours `null`.
 *
 * `unknown` compte les lignes MASQUÉES : elles ne sont ni conformes ni en
 * faute, et les taire ferait passer « 3 membres sur 12 » pour « 3 sur 12 vus ».
 */
export interface EnforcementImpact {
  readonly key: CrewEnforcementKey;
  /** Membres qui, aujourd'hui, ne respecteraient pas ce réglage. */
  readonly wouldWarn: number;
  /** Membres dont la mesure est masquée : on ne peut rien en dire. */
  readonly unknown: number;
}

export function enforcementImpact(
  rows: readonly BoardRow2026[],
  key: CrewEnforcementKey,
  value: number,
  nowMs: number,
): EnforcementImpact | null {
  if (key === 'auto_remove_after_days') return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  let wouldWarn = 0;
  let unknown = 0;
  for (const r of rows) {
    if (key === 'max_inactivity_days') {
      if (r.lastRunAt === CREW_MEASURE_NOT_SHARED) {
        unknown += 1;
      } else if (r.lastRunAt === null) {
        // N'a JAMAIS couru : c'est le cas d'inactivité le plus net qui soit.
        wouldWarn += 1;
      } else if (nowMs - r.lastRunAt > value * 86_400_000) {
        wouldWarn += 1;
      }
      continue;
    }
    const measure = key === 'min_weekly_outings' ? r.runs7d : r.challengeDays;
    if (!isShared(measure)) unknown += 1;
    else if (measure < value) wouldWarn += 1;
  }
  return { key, wouldWarn, unknown };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. `crew_my_standing_2026` — MA situation, à MOI
// ═══════════════════════════════════════════════════════════════════════════

export interface StandingWarning2026 {
  readonly id: string;
  readonly kind: CrewWarningKind;
  readonly issuedAtMs: number | null;
  readonly issuedBy: 'server' | 'officer';
  readonly note: string | null;
  readonly resolvedAtMs: number | null;
}

export interface MyStanding2026 {
  readonly crewId: string;
  readonly role: string;
  readonly duty: CrewRoleDuty | null;
  readonly rules: Readonly<Partial<Record<CrewEnforcementKey, number>>>;
  /** MES mesures : aucune vie privée à s'opposer à soi-même, donc aucun masque. */
  readonly my: {
    readonly lastRunAtMs: number | null;
    readonly runs7d: number;
    readonly runs28d: number;
    readonly distance28dKm: number;
    readonly loops28d: number;
    readonly challengeDays: number;
  };
  readonly warnings: readonly StandingWarning2026[];
  /** N'existe QUE si le retrait automatique est armé (§4.2 I). */
  readonly atRisk: boolean;
  readonly removalAtMs: number | null;
}

export function parseStanding(raw: unknown): MyStanding2026 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true) return null;
  const crewId = asText(o.crewId);
  if (!crewId) return null;
  const my = (typeof o.my === 'object' && o.my !== null ? o.my : {}) as Record<string, unknown>;
  const rules: Partial<Record<CrewEnforcementKey, number>> = {};
  if (typeof o.rules === 'object' && o.rules !== null) {
    const src = o.rules as Record<string, unknown>;
    for (const key of CREW_ENFORCEMENT_KEYS) {
      const n = typeof src[key] === 'number' ? (src[key] as number) : Number(src[key]);
      if (Number.isFinite(n) && n > 0) rules[key] = n;
    }
  }
  const warnings: StandingWarning2026[] = [];
  if (Array.isArray(o.warnings)) {
    for (const item of o.warnings) {
      if (typeof item !== 'object' || item === null) continue;
      const w = item as Record<string, unknown>;
      const id = asText(w.id);
      const kind = asText(w.kind);
      if (!id || !kind || !(CREW_WARNING_KINDS as readonly string[]).includes(kind)) continue;
      warnings.push({
        id,
        kind: kind as CrewWarningKind,
        issuedAtMs: asMs(w.issuedAt),
        issuedBy: w.issuedBy === 'officer' ? 'officer' : 'server',
        note: asText(w.note),
        resolvedAtMs: asMs(w.resolvedAt),
      });
    }
  }
  const duty = asText(o.duty);
  return {
    crewId,
    role: asText(o.role) ?? '',
    duty: duty && DUTIES.includes(duty) ? (duty as CrewRoleDuty) : null,
    rules,
    my: {
      lastRunAtMs: asMs(my.lastRunAt),
      runs7d: Math.max(0, asInt(my.runs7d)),
      runs28d: Math.max(0, asInt(my.runs28d)),
      distance28dKm: typeof my.distance28dKm === 'number' ? my.distance28dKm : 0,
      loops28d: Math.max(0, asInt(my.loops28d)),
      challengeDays: Math.max(0, asInt(my.challengeDays)),
    },
    warnings,
    // `atRisk` du SERVEUR uniquement : le dériver de `removalAt` ferait dire
    // « tu vas être retiré » à un client en avance sur une règle désarmée.
    atRisk: o.atRisk === true,
    removalAtMs: asMs(o.removalAt),
  };
}

/** Mes avertissements NON LEVÉS : les seuls qui appellent une suite. */
export function openWarnings(
  standing: MyStanding2026,
): readonly StandingWarning2026[] {
  return standing.warnings.filter((w) => w.resolvedAtMs === null);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. `crew_decisions_log_2026` — le journal
// ═══════════════════════════════════════════════════════════════════════════

export const DECISION_KINDS = [
  'charter',
  'rules',
  'application',
  'warning',
  'removal',
  'dissolution',
  'joined',
  'left',
] as const;
export type DecisionKind2026 = (typeof DECISION_KINDS)[number];

export interface Decision2026 {
  readonly atMs: number | null;
  readonly kind: DecisionKind2026;
  /** Le pseudo du décideur, ou `null` quand c'est le job (`automatic`). */
  readonly actor: string | null;
  readonly automatic: boolean;
  readonly target: string | null;
  readonly reason: string | null;
}

/** `null` = je n'ai pas lu un journal. Un tableau VIDE est une réponse, pas un échec. */
export function parseDecisions(raw: unknown): readonly Decision2026[] | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true || !Array.isArray(o.entries)) return null;
  const out: Decision2026[] = [];
  for (const item of o.entries) {
    if (typeof item !== 'object' || item === null) continue;
    const e = item as Record<string, unknown>;
    const kind = asText(e.kind);
    // Un type de décision inconnu n'est PAS rangé sous un autre : il est écarté.
    // Ranger une dissolution sous « départ » raconterait une autre histoire.
    if (!kind || !(DECISION_KINDS as readonly string[]).includes(kind)) continue;
    out.push({
      atMs: asMs(e.at),
      kind: kind as DecisionKind2026,
      actor: asText(e.actor),
      automatic: e.automatic === true,
      target: asText(e.target),
      reason: asText(e.reason),
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LE VOCABULAIRE DE REFUS, FERMÉ UNE FOIS (§6.2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les vingt-six mots que 0188-0190 peuvent rendre. Fermer ce vocabulaire ICI
 * évite que chaque écran invente sa traduction d'un motif : le compilateur
 * force alors chaque surface à traiter ce qu'elle reçoit.
 *
 * `unknown` n'est PAS un mot du serveur : c'est ce que ce module rend quand le
 * serveur en dit un qu'il ne connaît pas. On ne devine jamais.
 */
export const MANAGEMENT_REFUSALS = [
  'signed_out',
  'no_crew',
  'forbidden',
  'not_founder',
  'not_found',
  'not_member',
  'self',
  'cannot_target_lead',
  'out_of_scope',
  'full',
  'cooldown',
  'already_in_crew',
  'pending',
  'closed',
  'dead_crew',
  'not_eligible',
  'charter_stale',
  'rate_limited',
  'bad_rules',
  'bad_message',
  'bad_note',
  'bad_reason',
  'note_required',
  'bad_sort',
  'bad_filter',
  'bad_activity',
  'bad_recruitment',
  'bad_requirements',
  'active_challenge',
  'already_archived',
  'no_city',
  'unknown',
] as const;
export type ManagementRefusal = (typeof MANAGEMENT_REFUSALS)[number];

/** `{ok:false}` → motif typé. `null` quand la réponse est un succès. */
export function refusalOf2026(raw: unknown): ManagementRefusal | null {
  if (typeof raw !== 'object' || raw === null) return 'unknown';
  const o = raw as Record<string, unknown>;
  if (o.ok !== false) return null;
  const r = asText(o.reason);
  return r && (MANAGEMENT_REFUSALS as readonly string[]).includes(r)
    ? (r as ManagementRefusal)
    : 'unknown';
}
