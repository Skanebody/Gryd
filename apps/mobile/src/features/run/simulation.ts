/**
 * GRYD — Course Live : simulation DÉMO déterministe (AMENDEMENT-08 §5, doc §9-§10).
 * Aucune géoloc réelle : un tracé pré-calculé (PRNG mulberry32, même générateur
 * que les autres demos) rejoué en temps réel ACCÉLÉRÉ (1 tick réel = SIM_TICK_MS,
 * 1 tick simulé = SIM_SECONDS_PER_TICK). Tout ce qui touche au territoire est
 * étiqueté « estimé » : le client n'attribue JAMAIS un hex, le serveur
 * (ingest_run) reste le seul décideur. Les constantes de JEU (points, bornes de
 * bonus, seuil Verify) viennent de @klaim/shared/game-rules — les valeurs de
 * SCÉNARIO (distance, cible d'hexes du doc §10 « +214 ») sont des données démo,
 * comme dans les autres fichiers demo.ts de src/features.
 * TODO(O1) : remplacer par expo-location + ingest_run réels.
 */
import {
  PERFORMANCE_BONUS_CAP,
  PERFORMANCE_BONUS_FLOOR,
  POINTS_NEUTRAL_HEX,
  VERIFIED_MIN_TRUST,
  colors,
  gameColors,
  type IconName,
  type RunMode,
} from '@klaim/shared';
import type { GameVisualState } from '../../ui/game';

// ─── Cadence de la démo (présentation, pas des règles de jeu) ────────────────

/** Durée réelle d'un tick de simulation (≈ 1 min de démo au total). */
export const SIM_TICK_MS = 620;
/** Secondes SIMULÉES par tick (96 ticks ≈ 44 min de course affichée). */
export const SIM_SECONDS_PER_TICK = 28;
/** Nombre de ticks du scénario. */
const TICK_COUNT = 96;
/**
 * Dernier index de tick (paramètre `t` de course-result). Exporté pour la fin
 * de course RÉELLE (AMENDEMENT-15 §2) : tant que le résultat réel n'est pas
 * branché (phase suivante), la célébration démo est rejouée à l'échelle de la
 * distance réellement courue.
 */
export const SIM_LAST_TICK = TICK_COUNT - 1;

// ─── Scénario démo (données démo, cohérentes avec le doc §10) ────────────────

/** Distance totale simulée (m) — allure ≈ 5'28/km sur 44 min. Exportée pour
 * la mise à l'échelle de la célébration après une course RÉELLE (AMENDEMENT-15). */
export const DEMO_TOTAL_DISTANCE_M = 8_200;
/** Hexes estimés en fin de course — l'exemple gelé du doc §10 (« +214 HEXES »). */
const DEMO_HEXES_TARGET = 214;
/** Multiplicateur perf démo — borné par les règles réelles (§3). */
const DEMO_PERF_MULTIPLIER = 1.07;
/** Zone crew du scénario (doc §10 : « Paris Est passe à 62 % »). */
const DEMO_ZONE = { name: 'Paris Est', pctStart: 57, pctEnd: 62 } as const;
/** Rang crew local avant/après (doc §10 : « gagne 1 rang »). */
const DEMO_CREW_RANK = { before: 9, after: 8 } as const;
/**
 * Part minimale de la cible d'hexes du scénario pour mettre en scène le rang
 * gagné : une démo écourtée (< 60 % des 214 hexes) ne gagne PAS de rang —
 * l'étape crew montre alors seulement la contribution de zone.
 */
const RANK_UP_MIN_TARGET_RATIO = 0.6;
/** Cohérent avec features/crew/demo.ts (LES FOULÉES 9³) et social/demo.ts (KORO). */
const DEMO_CREW_NAME = 'LES FOULÉES 9³';
const DEMO_PLAYER_NAME = 'KORO';
/** Graine unique du scénario — même tracé à chaque lancement (déterminisme). */
const DEMO_SEED = 0x6c1a1;

// ─── Modes ───────────────────────────────────────────────────────────────────

/** Modes actifs au départ (AMENDEMENT-07 §2 — race_mode/event_run = V1). */
export type LiveRunMode = Extract<RunMode, 'conquete' | 'social_run' | 'course_privee'>;

export const RUN_MODE_LABEL: Record<LiveRunMode, string> = {
  conquete: 'Conquête',
  social_run: 'Social Run',
  course_privee: 'Course privée',
};

/** Parse le paramètre de route `mode` (défaut conquete — jamais de crash). */
export function runModeFromParam(param: string | string[] | undefined): LiveRunMode {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'social_run' || value === 'course_privee') return value;
  return 'conquete';
}

// ─── Mini-grille hex (géométrie ÉCRAN, pas H3 — schéma de la zone) ───────────

const SQRT3 = Math.sqrt(3);
/** Rayon (circonscrit) d'un hex de la mini-grille, en unités de viewBox. */
export const HEX_R = 13;
const GRID_COLS = 15;
const GRID_ROWS = 13;
const GRID_PAD = 10;

/** ViewBox du schéma de zone (générateur de tracé). */
export const LIVE_MAP_W = GRID_PAD * 2 + SQRT3 * HEX_R * (GRID_COLS + 0.5);
export const LIVE_MAP_H = GRID_PAD * 2 + 1.5 * HEX_R * (GRID_ROWS - 1) + 2 * HEX_R;

export interface HexCell {
  id: string;
  col: number;
  row: number;
  cx: number;
  cy: number;
}

function cellCenter(col: number, row: number): { cx: number; cy: number } {
  const offset = row % 2 === 1 ? 0.5 : 0;
  return {
    cx: GRID_PAD + SQRT3 * HEX_R * (col + offset) + (SQRT3 * HEX_R) / 2,
    cy: GRID_PAD + HEX_R + 1.5 * HEX_R * row,
  };
}

function buildCells(): HexCell[] {
  const cells: HexCell[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const { cx, cy } = cellCenter(col, row);
      cells.push({ id: `${col}:${row}`, col, row, cx, cy });
    }
  }
  return cells;
}

/** Cellule la plus proche d'un point (recherche locale 3×3 — grille row-major). */
function nearestCell(cells: readonly HexCell[], x: number, y: number): HexCell {
  let best = cells[0]!;
  let bestD = Number.POSITIVE_INFINITY;
  const rowGuess = Math.round((y - GRID_PAD - HEX_R) / (1.5 * HEX_R));
  for (let row = Math.max(0, rowGuess - 1); row <= Math.min(GRID_ROWS - 1, rowGuess + 1); row++) {
    const offset = row % 2 === 1 ? 0.5 : 0;
    const colGuess = Math.round((x - GRID_PAD - (SQRT3 * HEX_R) / 2) / (SQRT3 * HEX_R) - offset);
    for (let col = Math.max(0, colGuess - 1); col <= Math.min(GRID_COLS - 1, colGuess + 1); col++) {
      const cell = cells[row * GRID_COLS + col];
      if (!cell) continue;
      const d = (cell.cx - x) ** 2 + (cell.cy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = cell;
      }
    }
  }
  return best;
}

// ─── PRNG + tracé ────────────────────────────────────────────────────────────

/** mulberry32 — même générateur déterministe que les demos (D-décisions). */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Interpolation Catmull-Rom (une composante) — tracé lissé « vraie route ». */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (3 * p1 - 3 * p2 + p3 - p0) * t3)
  );
}

interface Point {
  x: number;
  y: number;
}

/** Waypoints qui traversent la zone (départ bas-gauche → boucle vers la droite). */
function buildWaypoints(rand: () => number): Point[] {
  const margin = 34;
  const n = 8;
  const pts: Point[] = [];
  let y = LIVE_MAP_H - margin - rand() * 24;
  for (let i = 0; i < n; i++) {
    const x =
      margin +
      ((LIVE_MAP_W - margin * 2) * i) / (n - 1) +
      (i > 0 && i < n - 1 ? (rand() - 0.5) * 26 : 0);
    if (i > 0) y = clamp(y + (rand() - 0.5) * 130, margin, LIVE_MAP_H - margin);
    pts.push({ x: clamp(x, margin, LIVE_MAP_W - margin), y });
  }
  return pts;
}

/** Échantillonne le tracé lissé + bruit GPS léger (déterministe). */
function samplePath(waypoints: Point[], count: number, rand: () => number): Point[] {
  const segs = waypoints.length - 1;
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const u = (i / (count - 1)) * segs;
    const s = Math.min(segs - 1, Math.floor(u));
    const t = u - s;
    const p0 = waypoints[Math.max(0, s - 1)]!;
    const p1 = waypoints[s]!;
    const p2 = waypoints[s + 1]!;
    const p3 = waypoints[Math.min(segs, s + 2)]!;
    out.push({
      x: clamp(catmullRom(p0.x, p1.x, p2.x, p3.x, t) + (rand() - 0.5) * 2.4, 6, LIVE_MAP_W - 6),
      y: clamp(catmullRom(p0.y, p1.y, p2.y, p3.y, t) + (rand() - 0.5) * 2.4, 6, LIVE_MAP_H - 6),
    });
  }
  return out;
}

// ─── États live (doc §9) ─────────────────────────────────────────────────────

export type LiveEventKind =
  | 'zone_privee'
  | 'gps_faible'
  | 'conteste'
  | 'run_groupe'
  | 'segment_exclu';

export interface LiveEventMeta {
  label: string;
  detail: string;
  /** Teinte fonctionnelle (gameColors/colors) — la couleur lit l'état de jeu. */
  tint: string;
  /** État visuel commun (StatePill). */
  state: GameVisualState;
  icon: IconName;
}

/** Copy FR courte, vocabulaire de jeu, anti-shame (jamais culpabilisant). */
export const LIVE_EVENT_META: Record<LiveEventKind, LiveEventMeta> = {
  zone_privee: {
    label: 'Zone privée',
    detail: 'Trace masquée ici. Rien n\'est enregistré sur la carte.',
    tint: gameColors.verify,
    state: 'protected',
    icon: 'discret',
  },
  gps_faible: {
    label: 'GPS faible',
    detail: 'Capture en pause. Continue, le signal revient.',
    tint: gameColors.danger,
    state: 'decay',
    icon: 'gps',
  },
  conteste: {
    label: 'Zone contestée',
    detail: 'Un crew rival tient ce secteur. Le serveur tranchera.',
    tint: gameColors.contested,
    state: 'contested',
    icon: 'guerre',
  },
  run_groupe: {
    label: 'Run groupé détecté',
    detail: 'Coéquipiers à proximité — la défense compte pour le crew.',
    tint: gameColors.crew,
    state: 'active',
    icon: 'crew',
  },
  segment_exclu: {
    label: 'Segment exclu',
    detail: 'Allure hors bornes sur ce segment. Tout le reste compte.',
    tint: colors.gris,
    state: 'statsonly',
    icon: 'route',
  },
};

interface EventWindow {
  kind: LiveEventKind;
  from: number;
  to: number;
}

/** Fenêtres d'événements du scénario (indices de ticks, inclusifs). */
const EVENT_WINDOWS: readonly EventWindow[] = [
  { kind: 'zone_privee', from: 14, to: 19 },
  { kind: 'gps_faible', from: 32, to: 38 },
  { kind: 'conteste', from: 46, to: 53 },
  { kind: 'run_groupe', from: 62, to: 66 },
  { kind: 'segment_exclu', from: 74, to: 78 },
];

/** Événements pendant lesquels la capture est en pause (règles §3 : segments douteux exclus). */
const CAPTURE_PAUSED: ReadonlySet<LiveEventKind> = new Set([
  'zone_privee',
  'gps_faible',
  'segment_exclu',
]);

function eventAt(tick: number): LiveEventKind | null {
  for (const w of EVENT_WINDOWS) {
    if (tick >= w.from && tick <= w.to) return w.kind;
  }
  return null;
}

export interface LiveEventLogEntry {
  kind: LiveEventKind;
  /** Seconde simulée du début de la fenêtre (journal « états du run »). */
  atS: number;
}

/**
 * Journal des états live déjà rencontrés au tick (sheet OUVERTE, AMENDEMENT-09
 * §3 : zone privée, segment exclu, run groupé, contesté… vivent dans la sheet,
 * pas sur la carte).
 */
export function liveEventLogAt(tickIndex: number): LiveEventLogEntry[] {
  return EVENT_WINDOWS.filter((w) => w.from <= tickIndex).map((w) => ({
    kind: w.kind,
    atS: (w.from + 1) * SIM_SECONDS_PER_TICK,
  }));
}

// ─── Simulation ──────────────────────────────────────────────────────────────

export interface RunTick {
  x: number;
  y: number;
  cellId: string;
  /** Distance CUMULÉE (m). */
  distanceM: number;
  /** Hexes estimés CUMULÉS (0 hors conquête — le serveur décide). */
  hexes: number;
  /** Points estimés CUMULÉS (hexes × POINTS_NEUTRAL_HEX). */
  points: number;
  /** Jauges de confiance 0-100 (GRYD Verify). */
  gpsTrust: number;
  motionTrust: number;
  event: LiveEventKind | null;
  /** Zone privée : la trace n'est ni dessinée ni comptée sur la carte. */
  masked: boolean;
  /** Ce tick capture (mode conquête + hors fenêtre de pause). */
  capturing: boolean;
}

export interface RunSimulation {
  mode: LiveRunMode;
  ticks: readonly RunTick[];
  cells: readonly HexCell[];
  crew: {
    crewName: string;
    playerName: string;
    zoneName: string;
    /** Objectif crew affiché en live (vocabulaire de jeu). */
    objective: string;
    pctStart: number;
    pctEnd: number;
    rankBefore: number;
    rankAfter: number;
  };
}

/**
 * Construit la simulation complète (déterministe : même mode → même course).
 * Les cumuls sont normalisés pour finir EXACTEMENT sur les valeurs du scénario
 * (8,2 km · 214 hexes) — la boucle d'affichage n'a que le tick à consommer.
 */
export function buildRunSimulation(mode: LiveRunMode): RunSimulation {
  const rand = mulberry32(DEMO_SEED);
  const cells = buildCells();
  const path = samplePath(buildWaypoints(rand), TICK_COUNT, rand);

  // Poids par tick (distance : toujours ; hexes : hors pauses uniquement).
  const distanceWeights: number[] = [];
  const hexWeights: number[] = [];
  for (let i = 0; i < TICK_COUNT; i++) {
    const ev = eventAt(i);
    distanceWeights.push(0.85 + rand() * 0.3);
    hexWeights.push(ev !== null && CAPTURE_PAUSED.has(ev) ? 0 : 0.6 + rand() * 0.8);
  }
  const distanceTotal = distanceWeights.reduce((a, b) => a + b, 0);
  const hexTotal = hexWeights.reduce((a, b) => a + b, 0);

  const conquest = mode === 'conquete';
  const ticks: RunTick[] = [];
  let distanceCum = 0;
  let hexCum = 0;
  for (let i = 0; i < TICK_COUNT; i++) {
    const p = path[i]!;
    const ev = eventAt(i);
    const paused = ev !== null && CAPTURE_PAUSED.has(ev);
    distanceCum += distanceWeights[i]!;
    hexCum += hexWeights[i]!;
    const distanceM = Math.round((DEMO_TOTAL_DISTANCE_M * distanceCum) / distanceTotal);
    const hexes = conquest ? Math.round((DEMO_HEXES_TARGET * hexCum) / hexTotal) : 0;
    // GPS trust : bon signal ~86-96, creux net pendant « GPS faible ».
    const gpsTrust = Math.round(
      ev === 'gps_faible' ? 52 + rand() * 8 : 86 + rand() * 10,
    );
    const motionTrust = Math.round(89 + rand() * 8);
    ticks.push({
      x: p.x,
      y: p.y,
      cellId: nearestCell(cells, p.x, p.y).id,
      distanceM,
      hexes,
      points: hexes * POINTS_NEUTRAL_HEX,
      gpsTrust,
      motionTrust,
      event: ev,
      masked: ev === 'zone_privee',
      capturing: conquest && !paused,
    });
  }

  return {
    mode,
    ticks,
    cells,
    crew: {
      crewName: DEMO_CREW_NAME,
      playerName: DEMO_PLAYER_NAME,
      zoneName: DEMO_ZONE.name,
      objective: `Verrouiller ${DEMO_ZONE.name}`,
      pctStart: DEMO_ZONE.pctStart,
      pctEnd: DEMO_ZONE.pctEnd,
      rankBefore: DEMO_CREW_RANK.before,
      rankAfter: DEMO_CREW_RANK.after,
    },
  };
}

// ─── Lectures dérivées (écrans) ──────────────────────────────────────────────

function tickAt(sim: RunSimulation, tickIndex: number): RunTick {
  const i = clamp(Math.round(tickIndex), 0, sim.ticks.length - 1);
  return sim.ticks[i]!;
}

/**
 * Ids des cellules allumées jusqu'au tick (ordre d'allumage, uniques, zone
 * privée exclue — jamais de trace là-bas). Le dernier élément = le plus récent.
 */
export function litCellIdsAt(sim: RunSimulation, tickIndex: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const last = clamp(Math.round(tickIndex), 0, sim.ticks.length - 1);
  for (let i = 0; i <= last; i++) {
    const t = sim.ticks[i]!;
    if (t.masked) continue;
    if (!seen.has(t.cellId)) {
      seen.add(t.cellId);
      out.push(t.cellId);
    } else if (out[out.length - 1] !== t.cellId) {
      // Re-passage : le remonter en « plus récent » pour le pulse.
      out.splice(out.indexOf(t.cellId), 1);
      out.push(t.cellId);
    }
  }
  return out;
}

/**
 * Segments de trace visibles jusqu'au tick (attributs `points` de <Polyline>).
 * La trace est COUPÉE sur les ticks masqués (zone privée, AMENDEMENT-07).
 */
export function traceSegmentsAt(sim: RunSimulation, tickIndex: number): string[] {
  const segments: string[] = [];
  let current: string[] = [];
  const last = clamp(Math.round(tickIndex), 0, sim.ticks.length - 1);
  for (let i = 0; i <= last; i++) {
    const t = sim.ticks[i]!;
    if (t.masked) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      continue;
    }
    current.push(`${t.x.toFixed(1)},${t.y.toFixed(1)}`);
  }
  if (current.length > 1) segments.push(current.join(' '));
  return segments;
}

/** % de contrôle de la zone crew au tick (progresse avec les hexes estimés). */
export function crewZonePctAt(sim: RunSimulation, tickIndex: number): number {
  const { pctStart, pctEnd } = sim.crew;
  if (sim.mode !== 'conquete') return pctStart;
  const t = tickAt(sim, tickIndex);
  return Math.round(pctStart + ((pctEnd - pctStart) * t.hexes) / DEMO_HEXES_TARGET);
}

// ─── Résultat (course-result) ────────────────────────────────────────────────

/**
 * Résumé boucle (AMENDEMENT-12) calculé par features/run/loop.ts (la géométrie
 * vit dans liveNav — simulation.ts reste sans géo). Miroir d'IngestRunResponse :
 * enclosedZones DÉJÀ comptées dans hexes/points, jamais un total séparé.
 */
export interface RunLoopSummary {
  loopClosed: boolean;
  enclosedZones: number;
}

export interface RunResultStats {
  mode: LiveRunMode;
  distanceM: number;
  durationS: number;
  /** Allure moyenne (s/km). */
  paceSPerKm: number;
  /** Zones estimées TOTALES (couloir + intérieur si boucle fermée). */
  hexes: number;
  /** Boucle fermée au sens moteur (§12 B) — false hors conquête. */
  loopClosed: boolean;
  /** Zones intérieures estimées, DÉJÀ incluses dans hexes (« dont N »). */
  enclosedZones: number;
  basePoints: number;
  /** Bonus performance appliqué (%) — borné par les règles §3. */
  bonusPct: number;
  totalPoints: number;
  /** GRYD Verified : confiance moyenne ≥ seuil réel. */
  verified: boolean;
  gpsTrust: number;
  motionTrust: number;
  zoneName: string;
  zonePctBefore: number;
  zonePctAfter: number;
  crewRankBefore: number;
  crewRankAfter: number;
  /** Rang gagné mis en scène seulement si la course couvre assez du scénario. */
  rankGained: boolean;
  crewName: string;
  playerName: string;
}

/**
 * Stats de fin au tick où le joueur a terminé (déterministe, rejouable).
 * `loop` (optionnel — features/run/loop.ts) : boucle fermée → les zones
 * intérieures s'ajoutent au couloir AVANT points/bonus, barèmes inchangés.
 */
export function resultStats(
  sim: RunSimulation,
  tickIndex: number,
  loop?: RunLoopSummary,
): RunResultStats {
  const last = clamp(Math.round(tickIndex), 0, sim.ticks.length - 1);
  const t = sim.ticks[last]!;
  const durationS = (last + 1) * SIM_SECONDS_PER_TICK;
  const km = Math.max(0.001, t.distanceM / 1000);
  const loopClosed = sim.mode === 'conquete' && loop?.loopClosed === true;
  const enclosedZones = loopClosed ? Math.max(0, loop?.enclosedZones ?? 0) : 0;
  const totalHexes = t.hexes + enclosedZones;

  let gpsSum = 0;
  let motionSum = 0;
  for (let i = 0; i <= last; i++) {
    gpsSum += sim.ticks[i]!.gpsTrust;
    motionSum += sim.ticks[i]!.motionTrust;
  }
  const gpsTrust = Math.round(gpsSum / (last + 1));
  const motionTrust = Math.round(motionSum / (last + 1));

  const multiplier = clamp(DEMO_PERF_MULTIPLIER, PERFORMANCE_BONUS_FLOOR, PERFORMANCE_BONUS_CAP);
  /** Couloir + intérieur au MÊME barème (§12 B : barèmes serveur inchangés). */
  const basePoints = totalHexes * POINTS_NEUTRAL_HEX;

  // Rang gagné SEULEMENT si la course capture assez de la cible du scénario
  // (démo écourtée → contribution de zone seule, pas de RankUpCard).
  const rankGained =
    sim.mode === 'conquete' && t.hexes >= DEMO_HEXES_TARGET * RANK_UP_MIN_TARGET_RATIO;

  return {
    mode: sim.mode,
    distanceM: t.distanceM,
    durationS,
    paceSPerKm: durationS / km,
    hexes: totalHexes,
    loopClosed,
    enclosedZones,
    basePoints,
    bonusPct: Math.round((multiplier - 1) * 100),
    totalPoints: Math.round(basePoints * multiplier),
    verified: Math.min(gpsTrust, motionTrust) >= VERIFIED_MIN_TRUST,
    gpsTrust,
    motionTrust,
    zoneName: sim.crew.zoneName,
    zonePctBefore: sim.crew.pctStart,
    zonePctAfter: crewZonePctAt(sim, last),
    crewRankBefore: sim.crew.rankBefore,
    crewRankAfter: rankGained ? sim.crew.rankAfter : sim.crew.rankBefore,
    rankGained,
    crewName: sim.crew.crewName,
    playerName: sim.crew.playerName,
  };
}

// ─── Formatage (identique iOS/Android — pas d'Intl, cf. src/ui/format.ts) ────

/** « 44:48 » ou « 1:02:11 » (mono tabular-nums côté écran). */
export function formatClock(totalS: number): string {
  const s = Math.max(0, Math.round(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Allure « 5'28 » (s/km → min'sec). */
export function formatPace(sPerKm: number): string {
  if (!Number.isFinite(sPerKm) || sPerKm <= 0) return `0'00`;
  const s = Math.round(sPerKm);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}`;
}

/** Distance « 8,20 » (km, 2 décimales, virgule FR). */
export function formatKm(distanceM: number): string {
  return (Math.max(0, distanceM) / 1000).toFixed(2).replace('.', ',');
}
