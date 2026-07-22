/**
 * GRYD — recompute_sectors/logic.ts : la partie PURE du job (testable Deno).
 *
 * `index.ts` ne fait que de l'I/O (auth, lectures paginées, upserts) ; tout ce
 * qui TRANSFORME vit ici : lignes `sector_holdings` → lignes du moteur, lignes
 * `sector_activity` → `SectorActivity`, snapshot du moteur → payload d'upsert.
 *
 * ─── DEUX PIÈGES QUE CE MODULE EXISTE POUR TENIR ────────────────────────────
 * 1. `owner_kind` / `top_rival_kind` sont des colonnes GÉNÉRÉES STORED (0061) :
 *    les inclure dans un upsert fait échouer TOUT le lot (« cannot insert into
 *    generated column »). Le payload ne les porte donc JAMAIS — c'est vérifié
 *    par test, pas par vigilance.
 * 2. UN SECTEUR SANS PROPRIÉTAIRE EST LE CAS NORMAL. Depuis le plancher de
 *    domination (moteur), un secteur juste effleuré ressort owner = null : le
 *    job doit l'écrire tel quel (neutre = la vérité), sans jamais retomber sur
 *    un ancien propriétaire ni sauter la ligne.
 */
import type {
  SectorActivity,
  SectorControlRow,
  SectorSnapshot,
} from '../_shared/engine/sectorSnapshot.ts';

/** Une ligne de la vue `public.sector_holdings` (0061), telle que PostgREST la rend. */
export interface HoldingRow {
  sector_id: string;
  /** null quand le détenteur est un joueur SANS crew. */
  crew_id: string | null;
  /** null quand le détenteur est un crew. */
  holder_user_id: string | null;
  /** numeric → string côté PostgREST. */
  control_percent: number | string;
}

/** Une ligne de la vue `public.sector_activity` (0040). */
export interface ActivityRow {
  sector_id: string;
  zones_lost_recent: number | string | null;
  rival_reclaimed_24h: number | string | null;
  last_attack_at: string | null;
  decay_fraction: number | string | null;
}

/** Payload d'upsert `public.sector_snapshot` — sans AUCUNE colonne générée. */
export interface SnapshotPayload {
  sector_id: string;
  owner_crew_id: string | null;
  owner_user_id: string | null;
  owner_percent: number;
  top_rival_crew_id: string | null;
  top_rival_user_id: string | null;
  top_rival_percent: number;
  neutral_percent: number;
  pressure_score: number;
  status_level: number;
  contested: boolean;
  last_attack_at: string | null;
  updated_at: string;
}

const num = (v: number | string | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Groupe les lignes de contrôle par secteur, en préservant l'identité du
 * détenteur (crew OU joueur solo). Le job ne filtre RIEN : le plancher de
 * domination est appliqué par le moteur, pas par l'I/O.
 * PURE.
 */
export function groupHoldingsBySector(
  rows: readonly HoldingRow[],
): Map<string, SectorControlRow[]> {
  const bySector = new Map<string, SectorControlRow[]>();
  for (const r of rows) {
    const arr = bySector.get(r.sector_id) ?? [];
    arr.push({
      crewId: r.crew_id,
      userId: r.holder_user_id,
      controlPercent: num(r.control_percent),
    });
    bySector.set(r.sector_id, arr);
  }
  return bySector;
}

/**
 * Indexe les signaux d'activité par secteur. Un secteur absent de la vue reçoit
 * une activité VIDE côté appelant (`{}`) : le moteur retombe alors sur le seul
 * équilibre de contrôle — il n'invente pas d'attaque.
 * PURE.
 */
export function indexActivityBySector(
  rows: readonly ActivityRow[],
): Map<string, SectorActivity> {
  const bySector = new Map<string, SectorActivity>();
  for (const a of rows) {
    bySector.set(a.sector_id, {
      zonesLostRecent: num(a.zones_lost_recent),
      rivalReclaimed24h: num(a.rival_reclaimed_24h),
      decayFraction: num(a.decay_fraction),
      lastAttackAt: a.last_attack_at ? new Date(a.last_attack_at) : null,
    });
  }
  return bySector;
}

/**
 * Snapshot du moteur → ligne à écrire. Écrit les DEUX identités possibles
 * (crew et solo) ; n'écrit JAMAIS `owner_kind` / `top_rival_kind` (générées).
 * Un secteur neutre passe ici exactement comme les autres, avec ses nulls.
 * PURE.
 */
export function toSnapshotPayload(
  sectorId: string,
  snapshot: SectorSnapshot,
  lastAttackAt: Date | null | undefined,
  updatedAtIso: string,
): SnapshotPayload {
  return {
    sector_id: sectorId,
    owner_crew_id: snapshot.ownerCrewId,
    owner_user_id: snapshot.ownerUserId,
    owner_percent: snapshot.ownerPercent,
    top_rival_crew_id: snapshot.topRivalCrewId,
    top_rival_user_id: snapshot.topRivalUserId,
    top_rival_percent: snapshot.topRivalPercent,
    neutral_percent: snapshot.neutralPercent,
    pressure_score: snapshot.pressureScore,
    status_level: snapshot.statusLevel,
    contested: snapshot.contested,
    last_attack_at: lastAttackAt ? lastAttackAt.toISOString() : null,
    updated_at: updatedAtIso,
  };
}
