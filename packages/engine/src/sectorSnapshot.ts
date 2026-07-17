/**
 * GRYD — engine/sectorSnapshot.ts : PRÉ-CALCUL par SECTEUR (§C, AMENDEMENT-41 §2).
 *
 * La vue matérialisée `sector_control` donne, par (secteur, crew), le % d'hexes
 * tenus. Ce module ROULE ces lignes en UN snapshot par secteur, VIEWER-INDÉPENDANT :
 * propriétaire majoritaire + rival principal + parts + `pressure_score` + statut
 * 5 niveaux. Le serveur stocke ce snapshot ; le CLIENT y applique ensuite son rôle
 * (moi/rival) via `deriveSectorView` avec les mêmes % — un seul moteur, deux bouts.
 *
 * PURE + déterministe (testable Deno). Réutilise `deriveSectorView` (pression /
 * contesté / statut déjà gelés §C) en prenant le PROPRIÉTAIRE comme « moi » : la
 * tension owner↔rival ne dépend pas de qui regarde.
 */
import { deriveSectorView, type AggregatedSector } from './sectors.ts';

/** Une ligne de `sector_control` : un crew et sa part du secteur (0-1). */
export interface SectorControlRow {
  crewId: string;
  /** control_percent (fraction 0-1). */
  controlPercent: number;
}

/** Signaux d'activité récente d'un secteur (0 si non encore câblés — honnête). */
export interface SectorActivity {
  rivalActivityRecent?: number;
  zonesLostRecent?: number;
  rivalReclaimed24h?: number;
  decayFraction?: number;
  lastAttackAt?: Date | null;
}

/** Roulé owner / rival / neutre d'un secteur (parts 0-1). */
export interface SectorRollup {
  ownerCrewId: string | null;
  ownerPercent: number;
  topRivalCrewId: string | null;
  topRivalPercent: number;
  neutralPercent: number;
}

/** Snapshot §C complet d'un secteur (viewer-indépendant), prêt à stocker. */
export interface SectorSnapshot extends SectorRollup {
  /** 0-100. */
  pressureScore: number;
  /** 0 stable · 1 pression · 2 contestée · 3 attaque · 4 urgence. */
  statusLevel: number;
  statusKey: string;
  contested: boolean;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Roule les lignes (crew, control%) d'UN secteur en propriétaire majoritaire +
 * rival principal + neutre. Le neutre = 1 − Σ des parts tenues (borné [0;1]).
 * Ignore les parts nulles. PURE.
 */
export function rollupSectorControl(rows: readonly SectorControlRow[]): SectorRollup {
  const held = rows
    .filter((r) => r.controlPercent > 0)
    .slice()
    .sort((a, b) => b.controlPercent - a.controlPercent);
  const owner = held[0];
  const rival = held[1];
  const totalHeld = held.reduce((s, r) => s + clamp01(r.controlPercent), 0);
  return {
    ownerCrewId: owner?.crewId ?? null,
    ownerPercent: clamp01(owner?.controlPercent ?? 0),
    topRivalCrewId: rival?.crewId ?? null,
    topRivalPercent: clamp01(rival?.controlPercent ?? 0),
    neutralPercent: clamp01(1 - Math.min(1, totalHeld)),
  };
}

/**
 * Snapshot §C d'un secteur à partir de ses lignes `sector_control` + activité.
 * On calcule la pression / le contesté / le statut « du point de vue du
 * PROPRIÉTAIRE » (owner = « moi ») → chiffres viewer-indépendants que le client
 * réinterprète ensuite selon SON crew. PURE.
 */
export function computeSectorSnapshot(
  rows: readonly SectorControlRow[],
  activity: SectorActivity = {},
  now: Date = new Date(),
): SectorSnapshot {
  const rollup = rollupSectorControl(rows);
  const agg: AggregatedSector = {
    id: '',
    ownerCrewId: rollup.ownerCrewId,
    topRivalCrewId: rollup.topRivalCrewId,
    ownerPercent: rollup.ownerPercent,
    topRivalPercent: rollup.topRivalPercent,
    neutralPercent: rollup.neutralPercent,
    rivalActivityRecent: activity.rivalActivityRecent ?? 0,
    zonesLostRecent: activity.zonesLostRecent ?? 0,
    rivalReclaimed24h: activity.rivalReclaimed24h ?? 0,
    decayFraction: activity.decayFraction ?? 0,
    lastAttackAt: activity.lastAttackAt ?? null,
  };
  // owner = « moi » → pression/statut mesurent la tension owner↔rival, pas un viewer.
  const view = deriveSectorView(agg, rollup.ownerCrewId, [], now);
  return {
    ...rollup,
    pressureScore: view.pressure,
    statusLevel: view.status.level,
    statusKey: view.status.key,
    contested: view.contested,
  };
}
