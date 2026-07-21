/**
 * GRYD — Course Live « navigation type Uber » (AMENDEMENT-09 §3, revu
 * AMENDEMENT-11 : ZÉRO hexagone visible ; AMENDEMENT-16 §0 : VRAIE CARTE) :
 * données de scène 100 % GÉO RÉEL. La basemap procédurale a disparu — la
 * Course Live est posée sur les vraies tuiles (RealMap, comme la Battle Map),
 * ce module ne produit plus que la GÉOMÉTRIE DE JEU :
 *   - l'itinéraire suit les polylignes ROUTÉES rue par rue du Route Planner
 *     (route/demo.ts — OSRM foot figé à l'authoring, « pas de vol d'oiseau ») ;
 *   - sans `route=<id>`, le SCÉNARIO PAR DÉFAUT emprunte la géométrie routée
 *     de la Route B (canal Saint-Martin) : le PLAN s'arrête au bas du
 *     Faubourg-du-Temple, le coureur part en pointe de raid vers Belleville →
 *     « Déviation — itinéraire recalculé », la route restante se redessine
 *     (démo scriptée, pas de vrai routing) ;
 *   - des checkpoints nommés (vrais lieux du canal), une destination ;
 *   - les ZONES traversées (cellules H3 réelles — moteur invisible) accumulées
 *     dans l'ordre : LiveNavMap rend ruban/boucle NETS via allTerritories ;
 *   - un SCRIPT de feedback (toasts + haptics) : « Secteur pris · +N zones »,
 *     record segment (1×), déviation (1×), checkpoints, arrivée.
 * Le « monde pixels » ne survit qu'en INTERNE (échelle coureur gelée ~4,33
 * m/px, ancrée place de la République) : loop.ts et les ticks continuent de
 * raisonner en px, worldToGeo rend des lat/lng bien formés (projetables tels
 * quels sur les tuiles). Purement présentation : AUCUNE règle de jeu ici —
 * zones et points « estimés » viennent de la simulation, le serveur
 * (ingest_run) reste seul décideur.
 *
 * ─── « RÉELS » NE VEUT PAS DIRE « MESURÉS » (21/07/2026) ────────────────────
 * Les lat/lng qui sortent d'ici sont de vraies coordonnées terrestres, mais
 * personne ne les a mesurées : elles décrivent un parcours d'AUTHORING (démo)
 * ou un itinéraire PLANIFIÉ, jamais le chemin qu'un joueur a couru. Sans
 * `explicitLine` ni `route=<id>`, `navAnchor` retombe sur `NAV_DEFAULT_ANCHOR`
 * = le départ de ROUTES_DEMO[0], place de la République : la scène entière est
 * alors parisienne, où que se trouve le joueur.
 *
 * Ce module alimente la Course Live de DÉMONSTRATION. Aucune surface qui parle
 * d'une vraie course (Résultat, Partage, Historique) ne doit afficher sa
 * géométrie. Le Résultat le faisait jusqu'au 21/07/2026, via buildRunLoop : un
 * coureur lillois y voyait l'analyse de sa boucle tracée à Paris. Le tracé
 * mesuré, lui, vit dans `features/run/gps/tracker.ts`.
 */
import { latLngToCell } from 'h3-js';
import { H3_RESOLUTION, colors, gameColors, type IconName } from '@klaim/shared';
import { C } from '../../i18n/catalog/courseLive';
import { format, resolve, type Locale } from '../../i18n/types';
import type { RoutePoint } from '../../ui/game';
import {
  EGO_REPUBLIQUE,
  REAL_M_PER_DEG_LAT,
  RUNNER_SCALE_ZOOM,
  type LatLngPoint,
} from '../map/realAnchors';
import { ROUTES_DEMO } from '../route/demo';
import type { PlannedRouteDemo } from '../route/types';
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

// ─── Ancrage GÉO RÉEL du monde interne (AMENDEMENT-16 §0) ────────────────────
// Les ticks vivent en pixels (loop.ts, distances) mais l'ancre du monde est le
// DÉPART RÉEL des parcours démo (place de la République, angle sud-est) : le
// roundtrip geoToWorld/worldToGeo restitue les lat/lng réels au micromètre —
// les tracés se projettent tels quels sur les vraies tuiles.

/** Ancre géo PAR DÉFAUT du monde de nav = départ des parcours démo (République). */
const NAV_DEFAULT_ANCHOR: LatLngPoint = ROUTES_DEMO[0]?.line[0] ?? EGO_REPUBLIQUE;
/**
 * Ancre géo COURANTE : le DÉPART du parcours réellement suivi. DYNAMIQUE — un
 * parcours à Lyon ou Chamonix n'est plus déformé par le cos φ de Paris. Posée
 * par buildLiveNav AVANT tout mapping ; une seule course active à la fois, donc
 * cohérente pour tous les worldToGeo du rendu qui suivent.
 */
let navAnchor: LatLngPoint = NAV_DEFAULT_ANCHOR;
/** Mètres par degré de longitude à l'ancre courante (cos φ). */
function navMPerDegLng(): number {
  return REAL_M_PER_DEG_LAT * Math.cos((navAnchor.lat * Math.PI) / 180);
}

/** Circonférence terrestre (m) — géodésie, pas une règle de jeu. */
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
/** Monde MapLibre = 512 px × 2^zoom (tuiles vectorielles 512). */
const MAP_WORLD_TILE_PX = 512;
/**
 * Mètres par pixel ÉCRAN de la VRAIE carte à l'échelle coureur (zoom
 * RUNNER_SCALE_ZOOM, latitude de l'ancre) — sert au décalage caméra et à la
 * barre d'échelle de la Course Live (AMENDEMENT-16 §0 : la carte est réelle,
 * l'ex-échelle du monde px interne ne décrit plus l'écran).
 */
export const NAV_MAP_METERS_PER_PIXEL =
  (EARTH_CIRCUMFERENCE_M * Math.cos((NAV_DEFAULT_ANCHOR.lat * Math.PI) / 180)) /
  (MAP_WORLD_TILE_PX * 2 ** RUNNER_SCALE_ZOOM);

/**
 * Demi-emprise du monde interne (m) — contient les 3 parcours routés
 * (Père-Lachaise ~1,65 km à l'est, pointe nord du canal ~1,4 km).
 */
const WORLD_HALF_WIDTH_M = 1_750;
const WORLD_HALF_HEIGHT_M = 2_250;

/** lat/lng RÉELS → pixels-monde interne (origine haut-gauche, y vers le bas). */
function geoToWorld(p: LatLngPoint): RoutePoint {
  return {
    x:
      ((p.lng - navAnchor.lng) * navMPerDegLng() + WORLD_HALF_WIDTH_M) /
      NAV_METERS_PER_PIXEL,
    y:
      (WORLD_HALF_HEIGHT_M - (p.lat - navAnchor.lat) * REAL_M_PER_DEG_LAT) /
      NAV_METERS_PER_PIXEL,
  };
}

/**
 * Pixels-monde interne → lat/lng (inverse exact de geoToWorld). Coordonnées
 * bien formées, mais issues d'un parcours démo/planifié ancré sur `navAnchor` —
 * JAMAIS une position mesurée. Ne pas rendre le résultat sur une surface qui
 * parle d'une vraie course (voir l'avertissement en tête de fichier).
 */
export function worldToGeo(x: number, y: number): LatLngPoint {
  return {
    lat:
      navAnchor.lat +
      (WORLD_HALF_HEIGHT_M - y * NAV_METERS_PER_PIXEL) / REAL_M_PER_DEG_LAT,
    lng:
      navAnchor.lng +
      (x * NAV_METERS_PER_PIXEL - WORLD_HALF_WIDTH_M) / navMPerDegLng(),
  };
}

// ─── Scénario PAR DÉFAUT (sans `route=`) : géométrie ROUTÉE de la Route B ───
// La démo de déviation reste, mais sur de VRAIES rues : le plan descend le
// quai et rentre par le bas du Faubourg-du-Temple ; le coureur, lui, part en
// pointe de raid jusqu'à Belleville (les sommets 29→38 de la Route B) — la
// fourche est un vrai coin de rue, chaque segment une vraie rue.

/** Hôte du scénario par défaut : la Route B (canal), polyligne OSRM figée. */
const DEFAULT_HOST_ROUTE_ID = 'route_b_optimisee';
/** Sommet de la FOURCHE (croisement quai × Faubourg-du-Temple, départ raid). */
const DEFAULT_FORK_INDEX = 29;
/** Premier sommet du retour direct (le plan saute la pointe de raid). */
const DEFAULT_REJOIN_INDEX = 38;

const DEFAULT_ACTUAL_GEO: readonly LatLngPoint[] =
  ROUTES_DEMO.find((r) => r.id === DEFAULT_HOST_ROUTE_ID)?.line ?? [];
const DEFAULT_PLANNED_GEO: readonly LatLngPoint[] = [
  ...DEFAULT_ACTUAL_GEO.slice(0, DEFAULT_FORK_INDEX),
  ...DEFAULT_ACTUAL_GEO.slice(DEFAULT_REJOIN_INDEX),
];

/** Checkpoints nommés : index de sommet dans la polyline correspondante. */
const CHECKPOINTS_PLANNED: readonly { index: number; label: string }[] = [
  { index: 6, label: 'Passerelle Alibert' },
  { index: 11, label: 'Écluse des Récollets' },
  { index: 15, label: 'Rue Louis-Blanc' },
  { index: 30, label: 'Faubourg-du-Temple' },
];
const CHECKPOINTS_ACTUAL: readonly { index: number; label: string }[] = [
  { index: 6, label: 'Passerelle Alibert' },
  { index: 11, label: 'Écluse des Récollets' },
  { index: 15, label: 'Rue Louis-Blanc' },
  { index: 32, label: 'Carrefour Belleville' },
];

// ─── Itinéraire ROUTÉ sélectionné (AMENDEMENT-13 §4ter — `route=<id>`) ──────

/** Normalise un param `route` (`route_b_optimisee`, `route-b`, `b`…). */
function normalizedRouteParam(param: string | string[] | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw) return null;
  return raw.toLowerCase().replace(/_/g, '-');
}

/** Proposition ROUTÉE du planner correspondant au param — null sinon. */
function plannedRouteFromParam(
  param: string | string[] | undefined,
): PlannedRouteDemo | null {
  const norm = normalizedRouteParam(param);
  if (!norm) return null;
  return (
    ROUTES_DEMO.find((r) => {
      const id = r.id.replace(/_/g, '-');
      const letter = r.letter.toLowerCase();
      return norm === id || norm === `route-${letter}` || norm === letter;
    }) ?? null
  );
}

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

export type NavToastKind = 'capture' | 'record' | 'deviation' | 'checkpoint' | 'arrivee' | 'boucle';

export interface NavToast {
  kind: NavToastKind;
  text: string;
  icon: IconName;
  /** Teinte fonctionnelle (tokens) — chartreuse gain, or record, blanc info. */
  tint: string;
  /** Grammaire doc §25 — heavy réservé au burst « BOUCLE FERMÉE » (§12 C). */
  haptic: 'light' | 'medium' | 'success' | 'heavy';
}

/** Écart minimal entre deux toasts (ticks) — anti-bruit. */
const TOAST_MIN_GAP_TICKS = 4;
/** Cluster de capture : toast « Secteur pris · +N zones » dès N zones estimées. */
const CAPTURE_CLUSTER_MIN_ZONES = 45;
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
  /** Nombre de zones capturées jusqu'à ce tick (préfixe de `litCells`). */
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
  /** Itinéraire affiché avant la déviation (plan court). */
  plannedPoints: readonly RoutePoint[];
  plannedTotal: number;
  /** Itinéraire réellement couru (affiché après la déviation). */
  actualPoints: readonly RoutePoint[];
  actualTotal: number;
  /** Premier tick où le coureur dépasse la fourche → la route se redessine. */
  deviationTick: number;
  destination: RoutePoint;
  /**
   * Zones H3 capturées, dans l'ordre de capture (préfixées par litCount).
   * LiveNavMap rend le ruban/la boucle NETS depuis la trace (§4ter).
   */
  litCells: readonly string[];
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
 * tombe exactement sur la destination au dernier tick). Si `routeParam`
 * désigne une proposition du planner, la course SUIT sa polyligne ROUTÉE
 * (§4ter) — pas de scénario de déviation dans ce cas (plan = réel).
 * `locale` traduit les toasts scriptés (module PUR : résolution i18n directe,
 * jamais d'import du store) — défaut 'fr' pour les appelants qui ne rejouent
 * que la géométrie (course-result n'affiche pas ces toasts).
 */
export function buildLiveNav(
  sim: RunSimulation,
  routeParam?: string | string[],
  explicitLine?: readonly LatLngPoint[],
  locale: Locale = 'fr',
): LiveNav {
  // `explicitLine` = parcours PLANIFIÉ (routé en direct, n'importe où en France,
  // passé par le store). Sinon un `route=<id>` démo. Sinon le scénario par défaut.
  const curated = plannedRouteFromParam(routeParam);
  const followLine: readonly LatLngPoint[] | null =
    explicitLine && explicitLine.length >= 2
      ? explicitLine
      : curated
        ? curated.line
        : null;
  const routed = followLine !== null;
  // Ancre le monde de nav sur le DÉPART du parcours suivi (dynamique → pas de
  // déformation loin de Paris). Posée AVANT tout geoToWorld ci-dessous.
  navAnchor = followLine?.[0] ?? DEFAULT_PLANNED_GEO[0] ?? NAV_DEFAULT_ANCHOR;
  const plannedGeo = followLine ?? DEFAULT_PLANNED_GEO;
  const actualGeo = followLine ?? DEFAULT_ACTUAL_GEO;
  const plannedPoints: RoutePoint[] = plannedGeo.map(geoToWorld);
  const actualPoints: RoutePoint[] = actualGeo.map(geoToWorld);
  const plannedCum = cumulativeLengths(plannedPoints);
  const actualCum = cumulativeLengths(actualPoints);
  const plannedTotal = plannedCum[plannedCum.length - 1] ?? 0;
  const actualTotal = actualCum[actualCum.length - 1] ?? 0;
  /** Longueur du préfixe commun (la fourche) — jamais atteinte si routé. */
  const forkLen = routed ? Infinity : actualCum[DEFAULT_FORK_INDEX] ?? 0;

  const lastIndex = sim.ticks.length - 1;
  const totalDistanceM = Math.max(1, sim.ticks[lastIndex]?.distanceM ?? 1);

  // Positions + zones H3 capturées au passage (capture active uniquement).
  const ticks: NavTick[] = [];
  const litCells: string[] = [];
  const litSeen = new Set<string>();
  for (let i = 0; i <= lastIndex; i += 1) {
    const simTick = sim.ticks[i];
    const lenPx = ((simTick?.distanceM ?? 0) / totalDistanceM) * actualTotal;
    const pos = pointAt(actualPoints, actualCum, lenPx);
    if (simTick?.capturing) {
      const g = worldToGeo(pos.x, pos.y);
      const cell = latLngToCell(g.lat, g.lng, H3_RESOLUTION);
      if (!litSeen.has(cell)) {
        litSeen.add(cell);
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

  // Routé (§4ter) : plan = réel, la déviation n'arrive JAMAIS (tick hors plage).
  const deviationIdx = ticks.findIndex((t) => t.lenPx > forkLen);
  const deviationTick = routed
    ? lastIndex + 1
    : deviationIdx === -1
      ? lastIndex
      : deviationIdx;

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
  // Les checkpoints nommés appartiennent au SCÉNARIO par défaut (sommets de
  // ses polylignes) — un parcours routé n'en scripte pas (« Arrivée » reste).
  const checkpointsPlanned = routed
    ? []
    : CHECKPOINTS_PLANNED.map((c) => ({
        ...checkpointOf(plannedPoints, plannedCum, c.index, c.label),
        tick: -1,
      }));
  const checkpointsActual = routed
    ? []
    : CHECKPOINTS_ACTUAL.map((c) =>
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
    text: resolve(C.toastArrival, locale),
    icon: 'pin',
    tint: colors.chartreuse,
    haptic: 'medium',
  });
  if (!routed) {
    // Le scénario de déviation n'existe que sur le parcours par défaut.
    place(deviationTick, {
      kind: 'deviation',
      text: resolve(C.toastDeviation, locale),
      icon: 'route',
      tint: colors.blanc,
      haptic: 'light',
    });
  }
  for (const cp of checkpointsActual) {
    if (cp.tick >= 0 && cp.tick < lastIndex) {
      place(cp.tick, {
        kind: 'checkpoint',
        // « Repère — X » en fr (zéro jargon anglais), « Checkpoint — X » ailleurs.
        text: format(C.toastCheckpoint, { label: cp.label }, locale),
        icon: 'virage',
        tint: colors.chartreuse,
        haptic: 'light',
      });
    }
  }
  place(Math.min(RECORD_SEGMENT_TICK, lastIndex - TOAST_MIN_GAP_TICKS), {
    kind: 'record',
    text: resolve(C.toastRecord, locale),
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
      if (gained >= CAPTURE_CLUSTER_MIN_ZONES && canPlace(i)) {
        toasts.set(i, {
          kind: 'capture',
          text: format(C.toastSectorTaken, { n: gained }, locale),
          icon: 'carte',
          tint: colors.chartreuse,
          haptic: 'light',
        });
        hexBase = simTick.hexes;
      }
    }
  }

  return {
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
  locale: Locale = 'fr',
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
  return {
    label: resolve(C.arrival, locale),
    distanceM: Math.max(0, total - len) * NAV_METERS_PER_PIXEL,
  };
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

// ─── Routes démo (param `?route=` — AMENDEMENT-10 §2, vocabulaire zones) ─────

export interface LiveRouteInfo {
  id: string;
  /** Nom affiché en tête de course. */
  name: string;
  /** Résumé court (distance · gain) — vocabulaire territoire, jamais « hex ». */
  summary: string;
}

/** Libellé km court (séparateur décimal par langue : point en, virgule ailleurs). */
function kmLabel(km: number, locale: Locale): string {
  const fixed = km.toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

/**
 * En-tête DÉRIVÉ de la proposition du planner (route/demo.ts — l'ex-miroir
 * local est mort : nom, distance routée et zones sortent de la même source
 * que la carte du planner, plus aucun résumé codé en dur ici).
 */
function liveRouteInfo(route: PlannedRouteDemo, locale: Locale): LiveRouteInfo {
  const km = kmLabel(route.distanceKm, locale);
  return {
    id: route.id.replace(/_/g, '-'),
    name: format(C.routeName, { letter: route.letter, name: route.name }, locale),
    summary:
      route.streetsToSave !== undefined
        ? format(C.routeSummaryStreets, { km, n: route.streetsToSave }, locale)
        : format(C.routeSummaryZones, { km, n: route.zones }, locale),
  };
}

/**
 * Résout le paramètre de route (`route_b_optimisee`, `route-b`, `b`…). Id
 * inconnu → tête générique (jamais de crash) ; absent → null (pas d'en-tête).
 */
export function routeInfoFromParam(
  param: string | string[] | undefined,
  locale: Locale = 'fr',
): LiveRouteInfo | null {
  const norm = normalizedRouteParam(param);
  if (!norm) return null;
  const route = plannedRouteFromParam(param);
  return route
    ? liveRouteInfo(route, locale)
    : { id: norm, name: resolve(C.recommendedRoute, locale), summary: '' };
}
