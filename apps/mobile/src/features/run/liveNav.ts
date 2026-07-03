/**
 * GRYD — Course Live « navigation type Uber » (AMENDEMENT-09 §3) : données de
 * scène. Le MONDE est le même plan de quartier que la Battle Map (primitives
 * de src/features/map/basemap importées SANS modification), projeté une fois
 * pour toutes en PIXELS-MONDE à l'échelle coureur (hex H3 res 10 ≈ 130 m ≈
 * 30 px — même règle gelée que MapScreen). L'itinéraire démo SUIT les rues du
 * plan (boulevard NS → rue de l'Est → quai du canal → retour), avec :
 *   - un tracé PLANIFIÉ (court) et un tracé RÉEL (le coureur rate le virage
 *     du quai) → « Déviation — itinéraire recalculé », la route restante se
 *     redessine au tick de déviation (démo scriptée, pas de vrai routing) ;
 *   - des checkpoints nommés (virage + distance), une destination ;
 *   - les cellules hex du monde allumées au passage (« la route conquiert ») ;
 *   - un SCRIPT de feedback (toasts + haptics) : clusters de capture « +N »,
 *     record segment (1×), déviation (1×), checkpoints, arrivée.
 * Purement présentation : AUCUNE règle de jeu ici — hexes/points « estimés »
 * viennent de la simulation, le serveur (ingest_run) reste seul décideur.
 */
import { colors, gameColors, type IconName } from '@klaim/shared';
import type { RoutePoint } from '../../ui/game';
import {
  BASEMAP_CENTER,
  BLOCKS,
  CANAL,
  CANAL_BANK_WIDTH_M,
  CANAL_WIDTH_M,
  MAIN_AXES,
  MINOR_AXES,
  M_PER_DEG_LAT,
  M_PER_DEG_LNG,
  PARKS,
  SECTOR_LABELS,
  STREET_MAJOR_WIDTH_M,
  STREET_MINOR_WIDTH_M,
  type LatLngPoint,
} from '../map/basemap';
import { SIM_SECONDS_PER_TICK, type RunSimulation } from './simulation';

// ─── Échelle coureur (même règle gelée que la Battle Map — NE PAS régresser) ─

/** Règle gelée : un hex H3 res 10 fait ~130 m de diamètre. */
const HEX_DIAMETER_M = 130;
/** Cible visuelle : un hex ≈ 30 px à l'écran. */
const HEX_TARGET_PX = 30;
/** ≈ 4,33 m/px — identique à la Battle Map (échelle coureur). */
export const NAV_METERS_PER_PIXEL = HEX_DIAMETER_M / HEX_TARGET_PX;
/** Barre d'échelle graphique (bas gauche) — parité Battle Map. */
export const NAV_SCALE_BAR_METERS = 500;

// ─── Monde en pixels (emprise du plan de quartier autour du centre égocentré) ─

/** Demi-emprise du monde (m) — dans la couverture d'îlots de la basemap. */
const WORLD_HALF_WIDTH_M = 1_200;
const WORLD_HALF_HEIGHT_M = 2_250;
/** Taille du monde en px (le conteneur animé que la caméra translate). */
export const NAV_WORLD_W = Math.round((2 * WORLD_HALF_WIDTH_M) / NAV_METERS_PER_PIXEL);
export const NAV_WORLD_H = Math.round((2 * WORLD_HALF_HEIGHT_M) / NAV_METERS_PER_PIXEL);

/** lat/lng (basemap) → pixels-monde (origine coin haut-gauche, y vers le bas). */
function geoToWorld(p: LatLngPoint): RoutePoint {
  return {
    x: ((p.lng - BASEMAP_CENTER.lng) * M_PER_DEG_LNG + WORLD_HALF_WIDTH_M) / NAV_METERS_PER_PIXEL,
    y: (WORLD_HALF_HEIGHT_M - (p.lat - BASEMAP_CENTER.lat) * M_PER_DEG_LAT) / NAV_METERS_PER_PIXEL,
  };
}

/** (x m est, y m nord) depuis le centre égocentré → pixels-monde. */
function metersToWorld(xEast: number, yNorth: number): RoutePoint {
  return {
    x: (xEast + WORLD_HALF_WIDTH_M) / NAV_METERS_PER_PIXEL,
    y: (WORLD_HALF_HEIGHT_M - yNorth) / NAV_METERS_PER_PIXEL,
  };
}

// ─── Grille hex du monde (échelle coureur, pointe en haut) ───────────────────

/** Rayon (circonscrit) d'une cellule hex du monde, px. */
export const NAV_HEX_RADIUS_PX = HEX_TARGET_PX / 2;
const SQRT3 = Math.sqrt(3);
const CELL_W = SQRT3 * NAV_HEX_RADIUS_PX;
const CELL_H = 1.5 * NAV_HEX_RADIUS_PX;
const GRID_COLS = Math.ceil(NAV_WORLD_W / CELL_W);
const GRID_ROWS = Math.ceil(NAV_WORLD_H / CELL_H);

export interface NavCell {
  id: string;
  cx: number;
  cy: number;
}

function cellCenter(col: number, row: number): { cx: number; cy: number } {
  const offset = row % 2 === 1 ? 0.5 : 0;
  return {
    cx: CELL_W * (col + offset) + CELL_W / 2,
    cy: NAV_HEX_RADIUS_PX + CELL_H * row,
  };
}

/** Sous-chaîne `d` SVG d'un hexagone pointe en haut centré (cx, cy). */
export function hexPathAt(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 180) * (60 * i - 30);
    d += `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return `${d} Z`;
}

/** Cellule du monde la plus proche d'un point (recherche locale 3×3). */
function cellAt(x: number, y: number): NavCell {
  const rowGuess = Math.round((y - NAV_HEX_RADIUS_PX) / CELL_H);
  let best: NavCell = { id: 'c0r0', ...cellCenter(0, 0) };
  let bestD = Number.POSITIVE_INFINITY;
  for (
    let row = Math.max(0, rowGuess - 1);
    row <= Math.min(GRID_ROWS - 1, rowGuess + 1);
    row += 1
  ) {
    const offset = row % 2 === 1 ? 0.5 : 0;
    const colGuess = Math.round(x / CELL_W - offset - 0.5);
    for (
      let col = Math.max(0, colGuess - 1);
      col <= Math.min(GRID_COLS - 1, colGuess + 1);
      col += 1
    ) {
      const { cx, cy } = cellCenter(col, row);
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { id: `c${col}r${row}`, cx, cy };
      }
    }
  }
  return best;
}

/** Grille neutre du monde entier — UN `d` concaténé (texture Battle Map). */
function buildGridD(): string {
  let d = '';
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const { cx, cy } = cellCenter(col, row);
      d += hexPathAt(cx, cy, NAV_HEX_RADIUS_PX - 0.8);
    }
  }
  return d;
}

// ─── Basemap projetée en pixels-monde (mêmes primitives que la Battle Map) ──

export interface NavWorld {
  w: number;
  h: number;
  /** Îlots urbains pleins — UN path concaténé (ordre de peinture basemap). */
  blocksD: string;
  minorAxesD: readonly string[];
  axesD: readonly string[];
  canalD: string;
  parksD: readonly string[];
  labels: readonly { name: string; x: number; y: number }[];
  /** Grille hex neutre du monde (texture, sous les états de jeu). */
  gridD: string;
  /** Largeurs de voirie converties en px (constantes basemap). */
  minorPx: number;
  majorPx: number;
  majorCasingPx: number;
  canalPx: number;
  canalBankPx: number;
}

function lineD(pts: readonly LatLngPoint[], close = false): string {
  const d = pts
    .map((p, i) => {
      const { x, y } = geoToWorld(p);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return close ? `${d} Z` : d;
}

/** Marge de culling des îlots hors monde (px) — plus grand îlot ~150 m. */
const BLOCK_CULL_MARGIN_PX = 150 / NAV_METERS_PER_PIXEL;

function buildNavWorld(): NavWorld {
  const inWorld = (ring: readonly LatLngPoint[]): boolean =>
    ring.some((p) => {
      const { x, y } = geoToWorld(p);
      return (
        x >= -BLOCK_CULL_MARGIN_PX &&
        x <= NAV_WORLD_W + BLOCK_CULL_MARGIN_PX &&
        y >= -BLOCK_CULL_MARGIN_PX &&
        y <= NAV_WORLD_H + BLOCK_CULL_MARGIN_PX
      );
    });
  return {
    w: NAV_WORLD_W,
    h: NAV_WORLD_H,
    blocksD: BLOCKS.filter(inWorld)
      .map((ring) => lineD(ring, true))
      .join(' '),
    minorAxesD: MINOR_AXES.map((street) => lineD(street)),
    axesD: MAIN_AXES.map((axis) => lineD(axis)),
    canalD: lineD(CANAL),
    parksD: PARKS.map((ring) => lineD(ring, true)),
    labels: SECTOR_LABELS.map((s) => ({ name: s.name, ...geoToWorld(s) })),
    gridD: buildGridD(),
    minorPx: STREET_MINOR_WIDTH_M / NAV_METERS_PER_PIXEL,
    majorPx: STREET_MAJOR_WIDTH_M / NAV_METERS_PER_PIXEL,
    majorCasingPx: STREET_MAJOR_WIDTH_M / NAV_METERS_PER_PIXEL + 2,
    canalPx: CANAL_WIDTH_M / NAV_METERS_PER_PIXEL,
    canalBankPx: CANAL_BANK_WIDTH_M / NAV_METERS_PER_PIXEL,
  };
}

/** Monde partagé, construit une fois (déterministe — données basemap). */
export const NAV_WORLD: NavWorld = buildNavWorld();

// ─── Itinéraire démo (mètres autour du centre — suit les rues du plan) ──────

/**
 * Préfixe COMMUN planifié/réel : départ maison → nord sur le boulevard →
 * rue de l'Est vers le quai → quai du canal vers le sud, jusqu'à la fourche.
 */
const ROUTE_PREFIX_M: readonly (readonly [number, number])[] = [
  [-100, -60],
  [-96, 180],
  [-88, 460],
  [-78, 720],
  [-70, 860], // C1 : à droite sur la rue de l'Est
  [40, 872],
  [160, 880],
  [262, 888], // C2 : au sud sur le quai du canal
  [266, 640],
  [258, 320],
  [252, 20],
  [255, -92], // fourche : le plan tournait ici (le coureur file tout droit)
];

/** Fin PLANIFIÉE (courte) : à l'ouest à la fourche, puis retour maison. */
const ROUTE_PLANNED_TAIL_M: readonly (readonly [number, number])[] = [
  [90, -108],
  [-60, -122],
  [-102, -116],
  [-100, -60],
];

/** Fin RÉELLE (recalculée) : le quai continue au sud, boucle plus large. */
const ROUTE_ACTUAL_TAIL_M: readonly (readonly [number, number])[] = [
  [260, -320],
  [268, -620],
  [272, -880], // C3 : à droite, rue du Bassin
  [120, -895],
  [-30, -908],
  [-108, -902], // C4 : au nord sur le boulevard
  [-116, -620],
  [-110, -320],
  [-100, -60], // arrivée = maison (boucle)
];

/** Checkpoints nommés : index de sommet dans la polyline correspondante. */
const CHECKPOINTS_PLANNED: readonly { index: number; label: string }[] = [
  { index: 4, label: "Rue de l'Est" },
  { index: 7, label: 'Quai du canal' },
  { index: 11, label: 'Rue de Charonne' },
  { index: 14, label: 'Boulevard maison' },
];
const CHECKPOINTS_ACTUAL: readonly { index: number; label: string }[] = [
  { index: 4, label: "Rue de l'Est" },
  { index: 7, label: 'Quai du canal' },
  { index: 14, label: 'Rue du Bassin' },
  { index: 17, label: 'Boulevard maison' },
];

// ─── Géométrie de polyline (longueurs cumulées, point à distance donnée) ────

function cumulativeLengths(points: readonly RoutePoint[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const prev = cum[i - 1] ?? 0;
    cum.push(prev + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
  }
  return cum;
}

function pointAt(points: readonly RoutePoint[], cum: readonly number[], len: number): RoutePoint {
  const first = points[0] ?? { x: 0, y: 0 };
  for (let i = 1; i < points.length; i += 1) {
    const end = cum[i] ?? 0;
    if (end < len) continue;
    const start = cum[i - 1] ?? 0;
    const a = points[i - 1] ?? first;
    const b = points[i] ?? a;
    const t = end === start ? 0 : (len - start) / (end - start);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return points[points.length - 1] ?? first;
}

// ─── Script de feedback (toasts + haptics) ───────────────────────────────────

export type NavToastKind = 'capture' | 'record' | 'deviation' | 'checkpoint' | 'arrivee';

export interface NavToast {
  kind: NavToastKind;
  text: string;
  icon: IconName;
  /** Teinte fonctionnelle (tokens) — chartreuse gain, or record, blanc info. */
  tint: string;
  haptic: 'light' | 'medium' | 'success';
}

/** Écart minimal entre deux toasts (ticks) — anti-bruit. */
const TOAST_MIN_GAP_TICKS = 4;
/** Cluster de capture : toast « +N » dès N hexes estimés gagnés. */
const CAPTURE_CLUSTER_MIN_HEX = 45;
/** Tick visé pour le record segment (résolu s'il y a collision). */
const RECORD_SEGMENT_TICK = 72;

// ─── Navigation par tick ─────────────────────────────────────────────────────

export interface NavTick {
  /** Position du coureur en pixels-monde. */
  x: number;
  y: number;
  /** Cap du marqueur (deg, 0 = vers le haut de l'écran). */
  headingDeg: number;
  /** Distance parcourue le long du tracé RÉEL (px-monde). */
  lenPx: number;
  /** Nombre de cellules allumées jusqu'à ce tick (préfixe de `litCells`). */
  litCount: number;
}

export interface NavCheckpoint {
  label: string;
  x: number;
  y: number;
  cumPx: number;
  /** Tick de franchissement (tracé réel) — -1 pour les sommets planifiés. */
  tick: number;
}

export interface LiveNav {
  world: NavWorld;
  /** Itinéraire affiché avant la déviation (plan court). */
  plannedPoints: readonly RoutePoint[];
  plannedTotal: number;
  /** Itinéraire réellement couru (affiché après la déviation). */
  actualPoints: readonly RoutePoint[];
  actualTotal: number;
  /** Premier tick où le coureur dépasse la fourche → la route se redessine. */
  deviationTick: number;
  destination: RoutePoint;
  /** Cellules allumées, dans l'ordre d'allumage (préfixées par litCount). */
  litCells: readonly NavCell[];
  ticks: readonly NavTick[];
  checkpointsPlanned: readonly NavCheckpoint[];
  checkpointsActual: readonly NavCheckpoint[];
  /** Script de feedback : tick → toast (déjà filtré par mode). */
  toasts: ReadonlyMap<number, NavToast>;
}

/**
 * Construit la scène de navigation depuis la simulation (déterministe : même
 * mode → même course → même scène). La position du coureur suit le tracé RÉEL
 * proportionnellement à la distance simulée (cumuls normalisés → l'arrivée
 * tombe exactement sur la destination au dernier tick).
 */
export function buildLiveNav(sim: RunSimulation): LiveNav {
  const plannedPoints: RoutePoint[] = [...ROUTE_PREFIX_M, ...ROUTE_PLANNED_TAIL_M].map(([x, y]) =>
    metersToWorld(x, y),
  );
  const actualPoints: RoutePoint[] = [...ROUTE_PREFIX_M, ...ROUTE_ACTUAL_TAIL_M].map(([x, y]) =>
    metersToWorld(x, y),
  );
  const plannedCum = cumulativeLengths(plannedPoints);
  const actualCum = cumulativeLengths(actualPoints);
  const plannedTotal = plannedCum[plannedCum.length - 1] ?? 0;
  const actualTotal = actualCum[actualCum.length - 1] ?? 0;
  /** Longueur du préfixe commun (la fourche). */
  const forkLen = actualCum[ROUTE_PREFIX_M.length - 1] ?? 0;

  const lastIndex = sim.ticks.length - 1;
  const totalDistanceM = Math.max(1, sim.ticks[lastIndex]?.distanceM ?? 1);

  // Positions + cellules allumées au passage (capture active uniquement).
  const ticks: NavTick[] = [];
  const litCells: NavCell[] = [];
  const litSeen = new Set<string>();
  for (let i = 0; i <= lastIndex; i += 1) {
    const simTick = sim.ticks[i];
    const lenPx = ((simTick?.distanceM ?? 0) / totalDistanceM) * actualTotal;
    const pos = pointAt(actualPoints, actualCum, lenPx);
    if (simTick?.capturing) {
      const cell = cellAt(pos.x, pos.y);
      if (!litSeen.has(cell.id)) {
        litSeen.add(cell.id);
        litCells.push(cell);
      }
    }
    ticks.push({ x: pos.x, y: pos.y, headingDeg: 0, lenPx, litCount: litCells.length });
  }
  // Cap : direction vers la position suivante (dernier tick = cap précédent).
  for (let i = 0; i <= lastIndex; i += 1) {
    const cur = ticks[i];
    const next = ticks[i + 1];
    if (!cur) continue;
    if (next && (next.x !== cur.x || next.y !== cur.y)) {
      cur.headingDeg = (Math.atan2(next.y - cur.y, next.x - cur.x) * 180) / Math.PI + 90;
    } else {
      cur.headingDeg = ticks[i - 1]?.headingDeg ?? 0;
    }
  }

  const deviationIdx = ticks.findIndex((t) => t.lenPx > forkLen);
  const deviationTick = deviationIdx === -1 ? lastIndex : deviationIdx;

  const checkpointOf = (
    points: readonly RoutePoint[],
    cum: readonly number[],
    index: number,
    label: string,
  ): NavCheckpoint => {
    const p = points[index] ?? { x: 0, y: 0 };
    const cumPx = cum[index] ?? 0;
    const tick = ticks.findIndex((t) => t.lenPx >= cumPx);
    return { label, x: p.x, y: p.y, cumPx, tick };
  };
  const checkpointsPlanned = CHECKPOINTS_PLANNED.map((c) => ({
    ...checkpointOf(plannedPoints, plannedCum, c.index, c.label),
    tick: -1,
  }));
  const checkpointsActual = CHECKPOINTS_ACTUAL.map((c) =>
    checkpointOf(actualPoints, actualCum, c.index, c.label),
  );

  // ── Script de feedback : placement anti-collision (≥ TOAST_MIN_GAP_TICKS) ─
  const toasts = new Map<number, NavToast>();
  const canPlace = (tick: number): boolean => {
    if (tick < 2 || tick > lastIndex) return false;
    for (const k of toasts.keys()) {
      if (Math.abs(k - tick) < TOAST_MIN_GAP_TICKS) return false;
    }
    return true;
  };
  const place = (tick: number, toast: NavToast): void => {
    for (let d = 0; d <= 6; d += 1) {
      if (canPlace(tick + d)) {
        toasts.set(tick + d, toast);
        return;
      }
    }
  };

  place(lastIndex, {
    kind: 'arrivee',
    text: 'Destination atteinte',
    icon: 'pin',
    tint: colors.chartreuse,
    haptic: 'medium',
  });
  place(deviationTick, {
    kind: 'deviation',
    text: 'Déviation — itinéraire recalculé',
    icon: 'route',
    tint: colors.blanc,
    haptic: 'light',
  });
  for (const cp of checkpointsActual) {
    if (cp.tick >= 0 && cp.tick < lastIndex) {
      place(cp.tick, {
        kind: 'checkpoint',
        text: `Checkpoint — ${cp.label}`,
        icon: 'virage',
        tint: colors.chartreuse,
        haptic: 'light',
      });
    }
  }
  place(Math.min(RECORD_SEGMENT_TICK, lastIndex - TOAST_MIN_GAP_TICKS), {
    kind: 'record',
    text: 'Nouveau record segment',
    icon: 'performance',
    tint: gameColors.gold,
    haptic: 'medium',
  });
  if (sim.mode === 'conquete') {
    let hexBase = 0;
    for (let i = 0; i <= lastIndex; i += 1) {
      const simTick = sim.ticks[i];
      if (!simTick?.capturing) continue;
      const gained = simTick.hexes - hexBase;
      if (gained >= CAPTURE_CLUSTER_MIN_HEX && canPlace(i)) {
        toasts.set(i, {
          kind: 'capture',
          text: `Zone capturée +${gained}`,
          icon: 'carte',
          tint: colors.chartreuse,
          haptic: 'light',
        });
        hexBase = simTick.hexes;
      }
    }
  }

  return {
    world: NAV_WORLD,
    plannedPoints,
    plannedTotal,
    actualPoints,
    actualTotal,
    deviationTick,
    destination: actualPoints[actualPoints.length - 1] ?? { x: 0, y: 0 },
    litCells,
    ticks,
    checkpointsPlanned,
    checkpointsActual,
    toasts,
  };
}

// ─── Lectures dérivées (écran Course Live) ───────────────────────────────────

function clampIndex(nav: LiveNav, tickIndex: number): number {
  return Math.min(Math.max(Math.round(tickIndex), 0), nav.ticks.length - 1);
}

/** Prochain checkpoint sur l'itinéraire AFFICHÉ (plan avant déviation). */
export function nextCheckpointAt(
  nav: LiveNav,
  tickIndex: number,
): { label: string; distanceM: number } {
  const i = clampIndex(nav, tickIndex);
  const len = nav.ticks[i]?.lenPx ?? 0;
  const deviated = i >= nav.deviationTick;
  const list = deviated ? nav.checkpointsActual : nav.checkpointsPlanned;
  const total = deviated ? nav.actualTotal : nav.plannedTotal;
  const next = list.find((cp) => cp.cumPx > len + 1);
  if (next) {
    return { label: next.label, distanceM: (next.cumPx - len) * NAV_METERS_PER_PIXEL };
  }
  return { label: 'Arrivée', distanceM: Math.max(0, total - len) * NAV_METERS_PER_PIXEL };
}

/** Temps restant estimé (s) — la démo scriptée fait foi (déterministe). */
export function etaSecondsAt(sim: RunSimulation, tickIndex: number): number {
  const last = sim.ticks.length - 1;
  return Math.max(0, last - Math.min(Math.max(Math.round(tickIndex), 0), last)) *
    SIM_SECONDS_PER_TICK;
}

/** % de progression de la course (distance simulée / distance totale). */
export function progressPctAt(sim: RunSimulation, tickIndex: number): number {
  const last = sim.ticks.length - 1;
  const i = Math.min(Math.max(Math.round(tickIndex), 0), last);
  const total = Math.max(1, sim.ticks[last]?.distanceM ?? 1);
  return Math.round(((sim.ticks[i]?.distanceM ?? 0) / total) * 100);
}

/** Splits démo au km (allure = s/km, kilomètres exacts → temps entre bornes). */
export function splitsAt(
  sim: RunSimulation,
  tickIndex: number,
): { km: number; paceS: number }[] {
  const last = sim.ticks.length - 1;
  const i = Math.min(Math.max(Math.round(tickIndex), 0), last);
  const out: { km: number; paceS: number }[] = [];
  let prevS = 0;
  let km = 1;
  for (let t = 0; t <= i; t += 1) {
    const d = sim.ticks[t]?.distanceM ?? 0;
    while (d >= km * 1000) {
      const s = (t + 1) * SIM_SECONDS_PER_TICK;
      out.push({ km, paceS: s - prevS });
      prevS = s;
      km += 1;
    }
  }
  return out;
}
