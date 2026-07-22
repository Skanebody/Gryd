/**
 * GRYD — create_offensive/logic.ts : la partie PURE de l'écrivain d'offensives.
 *
 * `index.ts` ne fait que de l'I/O (JWT, lectures crew, RPC, réconciliation) ;
 * tout ce qui JUGE ou TRANSFORME vit ici : lecture du corps de requête, théâtre
 * (H3 res SECTOR_H3_RESOLUTION), clé naturelle d'idempotence, arbitrage d'un
 * doublon né d'une course, et code HTTP d'un refus nommé.
 *
 * ─── POURQUOI CE MODULE EXISTE (et ce qu'il tient) ──────────────────────────
 * 1. LES BORNES DE JEU NE SONT PAS ICI. Rayon, objectif, durée, libellé, lead
 *    time et plafond d'offensives ouvertes sont jugés par le MOTEUR PUR
 *    `validateOffensiveDraft` (_shared/engine/offensive.ts), qui lit
 *    game-rules. Ce module ne juge que la FORME (types, UUID, cellule H3
 *    valide, dates lisibles) — jamais un seuil. Aucun nombre magique : la seule
 *    constante de jeu touchée ici est OFFENSIVE_DURATION_H, et uniquement comme
 *    DÉFAUT quand l'appelant ne fournit pas de fin de fenêtre.
 * 2. UN REFUS EST TOUJOURS NOMMÉ. Aucun 500 générique ne doit fuir un message
 *    Postgres au client (faute déjà corrigée deux fois sur ce repo) : chaque
 *    sortie de `parseCreateOffensiveRequest` est un code stable, affichable.
 * 3. L'IDEMPOTENCE EST UNE RÈGLE PURE, PAS UN RÉFLEXE D'I/O. `sameOffensive`
 *    définit la clé naturelle d'une offensive (crew + théâtre + objectif +
 *    fenêtre + auteur) ; `resolveDuplicate` désigne le SURVIVANT de façon
 *    déterministe (la plus ancienne, `id` en départage) pour que deux requêtes
 *    concurrentes convergent sur la même offensive au lieu d'en laisser deux.
 *
 * ANTI PAY-TO-WIN : aucune fonction de ce fichier ne lit, ne reçoit ni ne
 * dérive un statut payant. Le droit de lancer une offensive vient du RÔLE dans
 * le crew, rien d'autre.
 *
 * L'APP NE MENT JAMAIS : ce module ne fabrique aucune valeur de repli. Un
 * théâtre absent est un refus (`invalid_center`), jamais un centre inventé ;
 * une fenêtre illisible est un refus, jamais une fenêtre « par défaut » posée
 * sur une saisie que l'utilisateur croyait comprise.
 */
import { getResolution, isValidCell, latLngToCell } from 'npm:h3-js@^4.1';
import {
  OFFENSIVE_DURATION_H,
  SECTOR_H3_RESOLUTION,
  CREW_ROLES,
  type CrewRole,
} from '../_shared/game-rules.ts';
import type {
  OffensiveDraft,
  OffensiveRejectReason,
} from '../_shared/engine/offensive.ts';

/**
 * Résolution H3 du CENTRE d'une offensive. Ce n'est pas un choix de ce module :
 * c'est la colonne `offensives.center_h3` (0010, « H3 res 7 en BIGINT (D13) »),
 * la même granularité que les secteurs. Nommée ici pour que le contrôle de
 * validité soit lisible et testable, jamais réécrite en littéral.
 */
export const OFFENSIVE_CENTER_RESOLUTION = SECTOR_H3_RESOLUTION;

const MS_PER_HOUR = 3_600_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Index H3 (hex) → entier décimal pour une colonne bigint. PURE (miroir ingest_run). */
export const h3ToDb = (h3: string): string => BigInt(`0x${h3}`).toString();
/** Colonne bigint → index H3 (hex). PURE (miroir ingest_run). */
export const dbToH3 = (v: string | number): string => BigInt(v).toString(16);

// ─── 1. Lecture du corps de requête ──────────────────────────────────────────

/**
 * Refus de FORME (le corps est inexploitable). Distinct des motifs de RÈGLE
 * (`OffensiveRejectReason`, rendus par le moteur) : ici rien n'est jugé « trop
 * grand » ou « interdit », c'est simplement illisible.
 */
export type CreateOffensiveBodyError =
  | 'invalid_body'
  | 'invalid_crew_id'
  | 'invalid_zone_label'
  | 'invalid_center'
  | 'invalid_radius'
  | 'invalid_objective'
  | 'invalid_window';

/** Brouillon d'offensive lu et normalisé, prêt pour le moteur puis la RPC. */
export interface ParsedOffensiveRequest {
  crewId: string;
  /** Libellé nettoyé (trim) — la longueur est jugée par le moteur. */
  zoneLabel: string;
  /** Centre du théâtre, index H3 res OFFENSIVE_CENTER_RESOLUTION. */
  centerH3: string;
  /** Même centre, en décimal, pour la colonne bigint `offensives.center_h3`. */
  centerH3Db: string;
  radiusKm: number;
  objectiveHexes: number;
  startsAtMs: number;
  endsAtMs: number;
  /** Vrai si la fenêtre a été fermée par le défaut OFFENSIVE_DURATION_H. */
  usedDefaultDuration: boolean;
}

export type ParseResult =
  | { ok: true; value: ParsedOffensiveRequest }
  | { ok: false; error: CreateOffensiveBodyError };

/** Date ISO lisible → epoch ms, ou null (jamais « aujourd'hui » par défaut). */
function parseIso(v: unknown): number | null {
  if (typeof v !== 'string' || v.trim() === '') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Corps de requête → brouillon normalisé. PURE (`nowMs` est un paramètre).
 *
 * Le théâtre accepte DEUX écritures, et une seule des deux gagne :
 *   · `centerH3` — un index H3 déjà choisi ; il doit être VALIDE et exactement
 *     à la résolution de la colonne (un centre res 10 rendrait le théâtre
 *     minuscule sans que rien ne le signale) ;
 *   · `centerLat` / `centerLng` — un point de la carte, converti ici.
 * Aucune des deux n'est devinée : ni centre par défaut, ni « position du
 * joueur » implicite.
 *
 * La FIN de fenêtre, elle, a un défaut assumé : OFFENSIVE_DURATION_H après le
 * début (la durée canonique §38 de 0010). C'est un défaut de DURÉE, pas une
 * invention de donnée — et il est signalé dans le résultat.
 */
export function parseCreateOffensiveRequest(raw: unknown, nowMs: number): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'invalid_body' };
  }
  const b = raw as Record<string, unknown>;

  if (typeof b.crewId !== 'string' || !UUID_RE.test(b.crewId)) {
    return { ok: false, error: 'invalid_crew_id' };
  }
  if (typeof b.zoneLabel !== 'string') {
    return { ok: false, error: 'invalid_zone_label' };
  }

  // ── Théâtre ──────────────────────────────────────────────────────────────
  let centerH3: string;
  if (b.centerH3 !== undefined) {
    if (typeof b.centerH3 !== 'string' || !isValidCell(b.centerH3)) {
      return { ok: false, error: 'invalid_center' };
    }
    if (getResolution(b.centerH3) !== OFFENSIVE_CENTER_RESOLUTION) {
      return { ok: false, error: 'invalid_center' };
    }
    centerH3 = b.centerH3;
  } else {
    const lat = b.centerLat;
    const lng = b.centerLng;
    if (
      typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180
    ) {
      return { ok: false, error: 'invalid_center' };
    }
    centerH3 = latLngToCell(lat, lng, OFFENSIVE_CENTER_RESOLUTION);
  }

  // ── Forme du rayon / de l'objectif (les BORNES sont au moteur) ───────────
  if (typeof b.radiusKm !== 'number' || !Number.isFinite(b.radiusKm)) {
    return { ok: false, error: 'invalid_radius' };
  }
  if (typeof b.objectiveHexes !== 'number' || !Number.isFinite(b.objectiveHexes)) {
    return { ok: false, error: 'invalid_objective' };
  }

  // ── Fenêtre ──────────────────────────────────────────────────────────────
  let startsAtMs: number;
  if (b.startsAt === undefined || b.startsAt === null) {
    startsAtMs = nowMs;
  } else {
    const parsed = parseIso(b.startsAt);
    if (parsed === null) return { ok: false, error: 'invalid_window' };
    startsAtMs = parsed;
  }

  let endsAtMs: number;
  let usedDefaultDuration = false;
  if (b.endsAt === undefined || b.endsAt === null) {
    endsAtMs = startsAtMs + OFFENSIVE_DURATION_H * MS_PER_HOUR;
    usedDefaultDuration = true;
  } else {
    const parsed = parseIso(b.endsAt);
    if (parsed === null) return { ok: false, error: 'invalid_window' };
    endsAtMs = parsed;
  }

  return {
    ok: true,
    value: {
      crewId: b.crewId,
      zoneLabel: b.zoneLabel.trim(),
      centerH3,
      centerH3Db: h3ToDb(centerH3),
      radiusKm: b.radiusKm,
      objectiveHexes: b.objectiveHexes,
      startsAtMs,
      endsAtMs,
      usedDefaultDuration,
    },
  };
}

/** Brouillon normalisé → entrée du moteur pur `validateOffensiveDraft`. PURE. */
export function toOffensiveDraft(parsed: ParsedOffensiveRequest): OffensiveDraft {
  return {
    zoneLabel: parsed.zoneLabel,
    radiusKm: parsed.radiusKm,
    objectiveHexes: parsed.objectiveHexes,
    startsAtMs: parsed.startsAtMs,
    endsAtMs: parsed.endsAtMs,
  };
}

/**
 * Le rôle lu en base est-il un rôle CONNU ? PURE.
 * Une valeur inconnue (rôle ajouté en base sans passer par game-rules) ne
 * reçoit AUCUN droit : on refuse plutôt que de supposer une hiérarchie.
 */
export function asCrewRole(value: unknown): CrewRole | null {
  return typeof value === 'string' && (CREW_ROLES as readonly string[]).includes(value)
    ? (value as CrewRole)
    : null;
}

// ─── 2. Idempotence : clé naturelle et arbitrage d'un doublon ────────────────

/**
 * Une ligne `offensives` NON clôturée, telle que PostgREST la rend.
 *
 * `radius_km` (numeric) arrive en CHAÎNE : le comparer sans normaliser ferait
 * échouer l'idempotence sans bruit. `center_h3` est un bigint que PostgREST
 * sérialiserait en NOMBRE JSON — au-delà de 2^53, un index H3 res 7 y perdrait
 * ses chiffres de poids faible. L'appelant le lit donc en `center_h3::text` ;
 * le type accepte quand même `number` pour que la comparaison reste EXACTE
 * (String()) plutôt que faussement tolérante si le cast disparaissait un jour.
 */
export interface ExistingOffensiveRow {
  id: string;
  crew_id: string;
  center_h3: string | number;
  radius_km: string | number;
  objectif_hexes: number;
  starts_at: string;
  ends_at: string;
  created_by: string | null;
  created_at: string;
  status: string;
}

/**
 * Cette offensive ouverte est-elle LA MÊME que le brouillon soumis ? PURE.
 *
 * Clé naturelle = crew + théâtre (centre et rayon) + objectif + fenêtre EXACTE
 * + auteur. Deux appels identiques (retry réseau, double-tap) retombent dessus ;
 * deux offensives volontairement différentes (autre quartier, autre fenêtre)
 * n'y retombent jamais — une milliseconde d'écart suffit à les distinguer, ce
 * qui est le bon compromis : mieux vaut laisser passer une seconde offensive
 * réellement distincte que fusionner deux intentions différentes.
 */
export function sameOffensive(
  row: ExistingOffensiveRow,
  parsed: ParsedOffensiveRequest,
  userId: string,
): boolean {
  if (row.crew_id !== parsed.crewId) return false;
  if (row.created_by !== userId) return false;
  if (String(row.center_h3) !== parsed.centerH3Db) return false;
  if (Number(row.radius_km) !== parsed.radiusKm) return false;
  if (Number(row.objectif_hexes) !== parsed.objectiveHexes) return false;
  if (Date.parse(row.starts_at) !== parsed.startsAtMs) return false;
  if (Date.parse(row.ends_at) !== parsed.endsAtMs) return false;
  return true;
}

/**
 * Départage DÉTERMINISTE de plusieurs lignes : la plus ancienne gagne, `id` en
 * cas d'égalité stricte d'horodatage. PURE.
 * Le déterminisme est la propriété utile : deux requêtes concurrentes qui
 * exécutent ce même arbitrage désignent forcément la MÊME survivante, donc
 * l'une garde et l'autre se retire — sans se concerter.
 */
export function pickSurvivor(
  rows: readonly ExistingOffensiveRow[],
): ExistingOffensiveRow | null {
  let best: ExistingOffensiveRow | null = null;
  for (const r of rows) {
    if (best === null) {
      best = r;
      continue;
    }
    const a = Date.parse(r.created_at);
    const b = Date.parse(best.created_at);
    if (a < b || (a === b && r.id < best.id)) best = r;
  }
  return best;
}

/**
 * Jumelle déjà existante d'un brouillon (avant toute écriture). PURE.
 * Renvoie la SURVIVANTE des jumelles s'il y en a plusieurs, pour que la réponse
 * pointe toujours la même offensive.
 */
export function findIdempotentTwin(
  rows: readonly ExistingOffensiveRow[],
  parsed: ParsedOffensiveRequest,
  userId: string,
): ExistingOffensiveRow | null {
  return pickSurvivor(rows.filter((r) => sameOffensive(r, parsed, userId)));
}

export interface DuplicateResolution {
  /** L'offensive à annoncer à l'appelant (toujours la survivante). */
  keepId: string;
  /** L'offensive en trop, née d'une course — à retirer, ou null s'il n'y en a pas. */
  discardId: string | null;
}

/**
 * Arbitrage APRÈS écriture : notre insertion a-t-elle doublé une jumelle créée
 * en même temps par une requête concurrente ? PURE.
 *
 * Le verrou consultatif de `create_offensive` sérialise les créations d'un même
 * crew mais ne connaît PAS la clé naturelle : deux requêtes identiques passent
 * l'une après l'autre et créent deux lignes. Cette fonction rend la course
 * inoffensive : la plus ancienne survit, la nôtre se retire si elle a perdu.
 * Si notre id est absent des lignes relues (lecture en retard), on ne retire
 * RIEN — jamais de suppression sur une base de faits incomplète.
 */
export function resolveDuplicate(
  createdId: string,
  rows: readonly ExistingOffensiveRow[],
  parsed: ParsedOffensiveRequest,
  userId: string,
): DuplicateResolution {
  const twins = rows.filter((r) => sameOffensive(r, parsed, userId));
  if (!twins.some((r) => r.id === createdId)) {
    return { keepId: createdId, discardId: null };
  }
  const survivor = pickSurvivor(twins);
  if (survivor === null || survivor.id === createdId) {
    return { keepId: createdId, discardId: null };
  }
  return { keepId: survivor.id, discardId: createdId };
}

// ─── 3. Codes HTTP des refus nommés ─────────────────────────────────────────

/** Motifs de refus rendus par la RPC `create_offensive` (garde serveur ultime). */
export type RpcRejectReason = 'not_member' | 'forbidden_role' | 'too_many_open';

/**
 * Code HTTP d'un refus NOMMÉ. PURE.
 * Aucun refus ne sort en 500 : un 500 signifie « le serveur a échoué », pas
 * « ta demande est refusée » — les confondre transforme une règle de jeu en
 * panne et fait fuir des détails Postgres au client.
 */
export function statusForReject(
  reason: OffensiveRejectReason | RpcRejectReason,
): number {
  switch (reason) {
    case 'not_member':
    case 'forbidden_role':
      return 403; // le demandeur existe, mais n'a pas ce droit
    case 'too_many_open':
      return 409; // conflit avec l'état du crew, pas avec la demande
    default:
      return 400; // demande hors bornes : label, rayon, objectif, durée, fenêtre
  }
}
