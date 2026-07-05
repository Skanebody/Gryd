/**
 * GRYD — secteurs de DÉMO (RÈGLES NON NÉGOCIABLES §C) pour Paris (République /
 * Canal Saint-Martin). « On ne colore pas 200 000 users ; on agrège en secteurs. »
 *
 * Le MOTEUR de secteur (pur, testé Deno) vit dans packages/engine/src/sectors.ts.
 * Comme features/map/demo.ts (bonus), run/loop.ts (boucle) et crew/rules.ts, le
 * tsconfig/Metro Expo ne résout PAS @klaim/engine (subpath exports + imports
 * Deno `.ts`) — on MIROIRE donc ici la même logique pure (`resolveRole`,
 * `pressureScore`, `isContested`, `sectorStatus`, `deriveSectorView`) en lisant
 * les MÊMES seuils depuis @klaim/shared. AUCUN nombre magique ; toute divergence
 * avec engine/sectors.ts serait un bug (le serveur reste seul décideur en V1).
 *
 * Fournit : `PARIS_DEMO_SECTORS` (5 secteurs bruts calibrés sur les 5 niveaux
 * stable→urgence) et `PARIS_DEMO_SECTOR_VIEWS` (les vues dérivées pour l'ego
 * démo — l'objet que le RENDU consomme). Aucune couleur ici : le rendu lit
 * `view.status.key` / `view.ownerRole` / `view.contested` et applique roleColor
 * + la forme + l'icône (jamais la couleur seule — daltonisme).
 */
import {
  SECTOR_ACTIVE_ATTACK_MAX_H,
  SECTOR_CONTESTED_RULE,
  SECTOR_PRESSURE_BANDS,
  SECTOR_PRESSURE_MAX,
  SECTOR_PRESSURE_WEIGHTS,
  SECTOR_RIVAL_ACTIVITY_SATURATION,
  type SectorStatusKey,
  SECTOR_STATUS_LEVELS,
  SECTOR_ZONES_LOST_SATURATION,
} from '@klaim/shared';
import type { LatLngPoint } from './realAnchors';

// ─── Types (miroir strict d'engine/sectors.ts) ──────────────────────────────

/** Rôle d'un crew DANS le contexte du joueur (miroir de SectorRole). */
export type SectorRole = 'mine' | 'ally' | 'rival' | 'neutral';

/** Secteur AGRÉGÉ brut (miroir d'AggregatedSector). Parts en fraction (0-1). */
export interface AggregatedSector {
  id: string;
  ownerCrewId: string | null;
  topRivalCrewId: string | null;
  ownerPercent: number;
  topRivalPercent: number;
  neutralPercent: number;
  rivalActivityRecent: number;
  zonesLostRecent: number;
  rivalReclaimed24h: number;
  decayFraction: number;
  lastAttackAt: Date | null;
}

/** Statut d'un secteur : niveau 0-4 + clé nommée (miroir de SectorStatus). */
export interface SectorStatus {
  level: (typeof SECTOR_STATUS_LEVELS)[SectorStatusKey];
  key: SectorStatusKey;
}

/** Vue d'affichage résolue pour le joueur (miroir de SectorView). */
export interface SectorView {
  id: string;
  ownerRole: SectorRole;
  rivalRole: SectorRole;
  minePercent: number;
  rivalPercent: number;
  neutralPercent: number;
  pressure: number;
  contested: boolean;
  status: SectorStatus;
}

// ─── Primitives numériques (physique, pas des règles) ────────────────────────
const MS_PER_HOUR = 3_600_000;
const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
const saturate = (raw: number, saturation: number): number =>
  saturation <= 0 ? (raw > 0 ? 1 : 0) : clamp(raw / saturation, 0, 1);

// ─── Moteur miroir (engine/sectors.ts) ──────────────────────────────────────

/** Miroir de resolveRole. */
function resolveRole(
  crewId: string | null | undefined,
  myCrewId: string | null | undefined,
  allyCrewIds: readonly string[],
): SectorRole {
  if (!crewId) return 'neutral';
  if (myCrewId && crewId === myCrewId) return 'mine';
  if (allyCrewIds.includes(crewId)) return 'ally';
  return 'rival';
}

/** Miroir de pressureScore. */
function pressureScore(i: {
  minePercent: number;
  rivalPercent: number;
  rivalActivityRecent: number;
  zonesLostRecent: number;
  decayFraction: number;
}): number {
  const mine = clamp(i.minePercent, 0, 1);
  const rival = clamp(i.rivalPercent, 0, 1);
  const flip =
    rival < SECTOR_CONTESTED_RULE.rivalMinShare ? 0 : clamp(1 - Math.abs(mine - rival), 0, 1);
  const raw =
    saturate(Math.max(0, i.rivalActivityRecent), SECTOR_RIVAL_ACTIVITY_SATURATION) *
      SECTOR_PRESSURE_WEIGHTS.rivalActivity +
    saturate(Math.max(0, i.zonesLostRecent), SECTOR_ZONES_LOST_SATURATION) *
      SECTOR_PRESSURE_WEIGHTS.zonesLost +
    flip * SECTOR_PRESSURE_WEIGHTS.flipProximity +
    clamp(i.decayFraction, 0, 1) * SECTOR_PRESSURE_WEIGHTS.decay;
  return Math.round(clamp(raw, 0, SECTOR_PRESSURE_MAX));
}

/** Miroir d'isContested. */
function isContested(i: {
  minePercent: number;
  rivalPercent: number;
  rivalReclaimed24h: number;
}): boolean {
  const mine = clamp(i.minePercent, 0, 1);
  const rival = clamp(i.rivalPercent, 0, 1);
  const present = rival >= SECTOR_CONTESTED_RULE.rivalMinShare;
  return (
    (present && mine <= SECTOR_CONTESTED_RULE.mineMaxShare) ||
    (present && Math.abs(mine - rival) < SECTOR_CONTESTED_RULE.closeGapMax) ||
    i.rivalReclaimed24h > SECTOR_CONTESTED_RULE.reclaimZones24h
  );
}

function pressureBand(pressure: number): SectorStatusKey {
  const p = clamp(pressure, 0, SECTOR_PRESSURE_MAX);
  if (p >= SECTOR_PRESSURE_BANDS.urgence) return 'urgence';
  if (p >= SECTOR_PRESSURE_BANDS.contestee) return 'contestee';
  if (p >= SECTOR_PRESSURE_BANDS.pression) return 'pression';
  return 'stable';
}

function attackIsActive(lastAttackAt: Date | null | undefined, now: Date): boolean {
  if (!lastAttackAt) return false;
  const ageH = (now.getTime() - lastAttackAt.getTime()) / MS_PER_HOUR;
  return ageH >= 0 && ageH <= SECTOR_ACTIVE_ATTACK_MAX_H;
}

const statusOf = (key: SectorStatusKey): SectorStatus => ({
  level: SECTOR_STATUS_LEVELS[key],
  key,
});

/** Miroir de sectorStatus. */
function sectorStatus(i: {
  pressure: number;
  contested: boolean;
  lastAttackAt?: Date | null;
  now: Date;
}): SectorStatus {
  const band = pressureBand(i.pressure);
  const active = attackIsActive(i.lastAttackAt, i.now);
  if (band === 'urgence') return statusOf('urgence');
  const alreadyHot = band !== 'stable' || i.contested;
  if (active && alreadyHot) return statusOf('attaque');
  if (i.contested || band === 'contestee') return statusOf('contestee');
  if (band === 'pression') return statusOf('pression');
  return statusOf('stable');
}

/** Miroir de deriveSectorView. */
function deriveSectorView(
  sector: AggregatedSector,
  myCrewId: string | null,
  allyCrewIds: readonly string[],
  now: Date,
): SectorView {
  const ownerRole = resolveRole(sector.ownerCrewId, myCrewId, allyCrewIds);
  const rivalRole = resolveRole(sector.topRivalCrewId, myCrewId, allyCrewIds);
  const minePercent = ownerRole === 'mine' ? clamp(sector.ownerPercent, 0, 1) : 0;
  const rivalPercent = rivalRole === 'rival' ? clamp(sector.topRivalPercent, 0, 1) : 0;
  const pressure = pressureScore({
    minePercent,
    rivalPercent,
    rivalActivityRecent: sector.rivalActivityRecent,
    zonesLostRecent: sector.zonesLostRecent,
    decayFraction: sector.decayFraction,
  });
  const contested = isContested({
    minePercent,
    rivalPercent,
    rivalReclaimed24h: sector.rivalReclaimed24h,
  });
  const status = sectorStatus({ pressure, contested, lastAttackAt: sector.lastAttackAt, now });
  return {
    id: sector.id,
    ownerRole,
    rivalRole,
    minePercent,
    rivalPercent,
    neutralPercent: clamp(sector.neutralPercent, 0, 1),
    pressure,
    contested,
    status,
  };
}

// ─── Ego démo (les rôles sont RELATIFS à lui) ────────────────────────────────

/** Crew de l'ego démo — « moi » (AMENDEMENT-01). */
export const DEMO_MY_CREW_ID = 'gryd-republique';
/** Rival principal démo (le seul autre crew fortement coloré). */
export const DEMO_RIVAL_CREW_ID = 'canal-crew';
/** Crew allié démo (chartreuse secondaire — opt-in mission). */
export const DEMO_ALLY_CREW_ID = 'nuit-pacers';
/** Alliés de l'ego démo. */
export const DEMO_ALLY_CREW_IDS: readonly string[] = [DEMO_ALLY_CREW_ID];

/** Horloge FIXE de la démo (déterminisme des 5 niveaux, indépendant de l'heure). */
export const DEMO_NOW = new Date('2026-07-05T12:00:00Z');
const hAgo = (h: number): Date => new Date(DEMO_NOW.getTime() - h * MS_PER_HOUR);

/** Un secteur démo = son objet agrégé brut + un centre réel + un nom court. */
export interface DemoSector {
  sector: AggregatedSector;
  /** Nom COURT (jamais tronqué — §A9). */
  name: string;
  /** Centre réel du secteur (ancre du label/badge — 1 par secteur). */
  center: LatLngPoint;
}

// ─── 5 secteurs calibrés sur les 5 niveaux (§C) ──────────────────────────────
// Parts en FRACTION (0-1). Inputs de pression choisis pour tomber DANS la bande
// visée (poids 45/30/30/20, saturations 20 runs / 16 zones — validé numériquement).

export const PARIS_DEMO_SECTORS: readonly DemoSector[] = [
  // ── Niveau 0 · STABLE — je tiens, rival quasi absent, aucune activité ──
  {
    name: 'Voltaire',
    center: { lat: 48.8612, lng: 2.375 }, // bd Voltaire / Saint-Ambroise
    sector: {
      id: 'paris-voltaire',
      ownerCrewId: DEMO_MY_CREW_ID,
      ownerPercent: 0.82,
      topRivalCrewId: DEMO_RIVAL_CREW_ID,
      topRivalPercent: 0.08, // < rivalMinShare → pas de bascule, pas contesté
      neutralPercent: 0.1,
      rivalActivityRecent: 0,
      zonesLostRecent: 0,
      rivalReclaimed24h: 0,
      decayFraction: 0,
      lastAttackAt: null,
    },
  },

  // ── Niveau 1 · PRESSION — « Canal actif » : activité rival modérée, pas contesté ──
  {
    name: 'Récollets',
    center: { lat: 48.8745, lng: 2.36281 }, // écluse des Récollets
    sector: {
      id: 'paris-recollets',
      ownerCrewId: DEMO_MY_CREW_ID,
      ownerPercent: 0.7,
      topRivalCrewId: DEMO_RIVAL_CREW_ID,
      topRivalPercent: 0.18, // rival présent mais < 0.25 → (a)/(b) faux → non contesté
      neutralPercent: 0.12,
      rivalActivityRecent: 12, // 12/20 → 0.6 × 45 = 27 …
      zonesLostRecent: 5, // 5/16 → ≈ 0.31 × 30 ≈ 9 → pressure ≈ 36 → bande pression (31-60)
      rivalReclaimed24h: 3,
      decayFraction: 0,
      lastAttackAt: null,
    },
  },

  // ── Niveau 2 · CONTESTÉE — coude-à-coude (règle b) : violet + double contour ──
  {
    name: 'Villemin',
    center: { lat: 48.8748, lng: 2.3622 }, // square Villemin
    sector: {
      id: 'paris-villemin',
      ownerCrewId: DEMO_MY_CREW_ID,
      ownerPercent: 0.46,
      topRivalCrewId: DEMO_RIVAL_CREW_ID,
      topRivalPercent: 0.44, // écart 0.02 < 0.15 ET rival ≥ 0.25 → contesté (b)
      neutralPercent: 0.1,
      rivalActivityRecent: 6,
      zonesLostRecent: 3,
      rivalReclaimed24h: 5,
      decayFraction: 0,
      lastAttackAt: null, // pas d'assaut EN COURS → « contestée », pas « attaque »
    },
  },

  // ── Niveau 3 · ATTAQUE ACTIVE — assaut rival en cours sur un secteur tendu ──
  {
    name: 'Canal',
    center: { lat: 48.87379, lng: 2.36308 }, // quai de Valmy, jardin Villemin
    sector: {
      id: 'paris-canal',
      ownerCrewId: DEMO_MY_CREW_ID,
      ownerPercent: 0.5,
      topRivalCrewId: DEMO_RIVAL_CREW_ID,
      topRivalPercent: 0.38, // (a) rival ≥ 0.25 ET mine ≤ 0.60 → contesté …
      neutralPercent: 0.12,
      rivalActivityRecent: 12, // pression dans la bande 61-80 (mais < urgence)
      zonesLostRecent: 7,
      rivalReclaimed24h: 6,
      decayFraction: 0.2,
      lastAttackAt: hAgo(1), // … + assaut il y a 1 h (< 6 h) → niveau 3 ATTAQUE
    },
  },

  // ── Niveau 4 · URGENCE — pression ≥ 81 : rouge limité + [DÉFENDRE] ──
  {
    name: 'Louis-Blanc',
    center: { lat: 48.87963, lng: 2.36707 }, // rue Louis-Blanc (nord du canal)
    sector: {
      id: 'paris-louis-blanc',
      ownerCrewId: DEMO_MY_CREW_ID,
      ownerPercent: 0.42,
      topRivalCrewId: DEMO_RIVAL_CREW_ID,
      topRivalPercent: 0.46, // coude-à-coude → flipProximity ≈ 1
      neutralPercent: 0.12,
      rivalActivityRecent: 20, // saturé → 45
      zonesLostRecent: 14, // ≈ 0.875 × 30 ≈ 26
      rivalReclaimed24h: 14, // > 8 → contesté (c) aussi
      decayFraction: 0.6, // 0.6 × 20 = 12 → total saturé ≥ 81 → URGENCE
      lastAttackAt: hAgo(2),
    },
  },
] as const;

/**
 * Vues dérivées pour l'ego démo (mon crew + alliés), à l'horloge figée. C'est ce
 * que le RENDU consomme : `view.status.key`/`view.status.level` (5 niveaux),
 * `view.ownerRole` (→ roleColor), `view.contested` (→ double contour + violet),
 * `view.pressure`, et les parts pour l'étiquette « moi/rival/neutre ».
 */
export const PARIS_DEMO_SECTOR_VIEWS: readonly (SectorView & {
  name: string;
  center: LatLngPoint;
})[] = PARIS_DEMO_SECTORS.map((d) => ({
  ...deriveSectorView(d.sector, DEMO_MY_CREW_ID, DEMO_ALLY_CREW_IDS, DEMO_NOW),
  name: d.name,
  center: d.center,
}));
