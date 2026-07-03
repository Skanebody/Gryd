/**
 * GRYD — basemap urbaine STYLISÉE de la Battle Map (AMENDEMENT-08 §4, doc §7
 * « Basemap urbaine subtile »), à l'ÉCHELLE COUREUR : le viewport (~375 px)
 * couvre ~1,6 km, donc le plan doit ressembler à un plan de quartier tactique
 * (Paris Est) — îlots de 60-150 m, rues secondaires très fines, 2-3 axes
 * principaux, le canal, 1-2 parcs, noms de secteurs discrets. Ce n'est PAS une
 * carte exacte : tout est défini en MÈTRES autour du centre égocentré
 * (AMENDEMENT-01 : « moi » au centre) puis converti en lat/lng. Purement
 * visuel, aucune règle de jeu ici — mais les COULOIRS de course de fakeHexes
 * suivent les tronçons hôtes exportés plus bas, pour que le territoire
 * serpente le long de vraies rues du plan.
 * (La version native MapLibre a déjà un fond vectoriel : ce module ne sert
 * qu'au rendu SVG web + aux labels de secteurs des deux variantes.)
 */
import { CITIES } from '@klaim/shared';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface SectorLabel {
  name: string;
  lat: number;
  lng: number;
}

/** Centre égocentré du plan (le « moi » démo — même origine que fakeHexes). */
export const BASEMAP_CENTER: LatLngPoint = CITIES.paris.center;

/** Mètres par degré de latitude (constante géodésique locale suffisante ici). */
export const M_PER_DEG_LAT = 111_320;
/** Mètres par degré de longitude à la latitude du centre (corrigé cos φ). */
export const M_PER_DEG_LNG =
  M_PER_DEG_LAT * Math.cos((BASEMAP_CENTER.lat * Math.PI) / 180);

/** (x m vers l'est, y m vers le nord) depuis le centre → lat/lng. */
export function offsetMeters(xEast: number, yNorth: number): LatLngPoint {
  return {
    lat: BASEMAP_CENTER.lat + yNorth / M_PER_DEG_LAT,
    lng: BASEMAP_CENTER.lng + xEast / M_PER_DEG_LNG,
  };
}

// ─── Emprise et trame des rues secondaires ──────────────────────────────────

/** Demi-emprise du plan (m) : couvre 375×812 px à ~4,3 m/px, plus une marge. */
const PLAN_HALF_WIDTH_M = 1_150;
const PLAN_HALF_HEIGHT_M = 2_050;
/** Rotation légère de la trame (le tissu urbain n'est pas aligné à l'écran). */
const GRID_ROTATION_RAD = -0.14; // ≈ -8°
/** Largeurs d'îlots 60-150 m — motif cyclique déterministe, jamais aléatoire. */
const BLOCK_PATTERN_M = [95, 130, 75, 110, 145, 85] as const;
/** Échantillonnage des polylignes de rue + léger louvoiement déterministe. */
const STREET_SAMPLE_STEP_M = 320;
const STREET_BEND_AMPLITUDE_M = 14;
const STREET_BEND_WAVELENGTH_M = 620;
const STREET_BEND_PHASE_PER_LINE = 1.7;

/** Rotation de la trame locale (u, v) vers le repère est/nord. */
function rotate(u: number, v: number): { x: number; y: number } {
  const c = Math.cos(GRID_ROTATION_RAD);
  const s = Math.sin(GRID_ROTATION_RAD);
  return { x: u * c - v * s, y: u * s + v * c };
}

/** Positions de rues cumulées selon le motif d'îlots, centrées sur 0. */
function blockPositions(limit: number): number[] {
  const out: number[] = [];
  let p = -limit;
  let k = 0;
  while (p <= limit) {
    out.push(p);
    p += BLOCK_PATTERN_M[k % BLOCK_PATTERN_M.length] ?? BLOCK_PATTERN_M[0];
    k += 1;
  }
  return out;
}

/** Une rue de la trame : droite dans (u, v) + léger louvoiement, puis rotation. */
function gridStreet(fixed: number, limit: number, vertical: boolean, index: number): LatLngPoint[] {
  const pts: LatLngPoint[] = [];
  for (let t = -limit; t <= limit; t += STREET_SAMPLE_STEP_M) {
    const bend =
      Math.sin(t / STREET_BEND_WAVELENGTH_M + index * STREET_BEND_PHASE_PER_LINE) *
      STREET_BEND_AMPLITUDE_M;
    const u = vertical ? fixed + bend : t;
    const v = vertical ? t : fixed + bend;
    const { x, y } = rotate(u, v);
    pts.push(offsetMeters(x, y));
  }
  return pts;
}

function buildMinorStreets(): readonly (readonly LatLngPoint[])[] {
  // Marge de rotation : une trame tournée doit déborder pour couvrir les coins.
  const rotSlack = Math.abs(Math.sin(GRID_ROTATION_RAD));
  const uLimit = PLAN_HALF_WIDTH_M + PLAN_HALF_HEIGHT_M * rotSlack;
  const vLimit = PLAN_HALF_HEIGHT_M + PLAN_HALF_WIDTH_M * rotSlack;
  const streets: (readonly LatLngPoint[])[] = [];
  blockPositions(uLimit).forEach((u, i) => streets.push(gridStreet(u, vLimit, true, i)));
  blockPositions(vLimit).forEach((v, i) => streets.push(gridStreet(v, uLimit, false, i)));
  return streets;
}

// ─── Axes principaux, canal, quai (hôtes des couloirs de course) ────────────

/** Axe est-ouest type République→Est — le couloir Est le suit depuis le centre. */
const AXIS_EST: readonly LatLngPoint[] = [
  offsetMeters(-950, -40),
  offsetMeters(-500, 10),
  offsetMeters(-140, 40),
  offsetMeters(0, 55),
  offsetMeters(250, 90),
  offsetMeters(520, 150),
  offsetMeters(820, 235),
  offsetMeters(1100, 320),
];
/** Index du point de l'axe Est le plus proche du centre (départ du couloir). */
const AXIS_EST_HOME_INDEX = 3;

/** Boulevard nord-sud passant au bord du cluster maison (porte la route ouverte). */
const AXIS_NS: readonly LatLngPoint[] = [
  offsetMeters(-90, 1_900),
  offsetMeters(-60, 600),
  offsetMeters(-100, 0),
  offsetMeters(-140, -700),
  offsetMeters(-110, -1_450),
  offsetMeters(-90, -1_900),
];

/** Diagonale sud-ouest (type Ledru-Rollin) — hôte du couloir sud-ouest. */
const AXIS_DIAG_SO: readonly LatLngPoint[] = [
  offsetMeters(40, -20),
  offsetMeters(-260, -280),
  offsetMeters(-520, -560),
  offsetMeters(-740, -900),
  offsetMeters(-950, -1_250),
];

/** Le canal (bande bleue sombre) — nord → sud, à l'est du centre. */
export const CANAL: readonly LatLngPoint[] = [
  offsetMeters(430, 1_900),
  offsetMeters(400, 1_300),
  offsetMeters(370, 800),
  offsetMeters(340, 300),
  offsetMeters(330, -200),
  offsetMeters(360, -800),
  offsetMeters(330, -1_900),
];

/** Décalage du quai (rue longeant le canal, côté ouest). */
const QUAI_OFFSET_M = -70;
/** Le quai complet (dessiné dans la trame) — sud → nord. */
const QUAI: readonly LatLngPoint[] = CANAL.map((p) => ({
  lat: p.lat,
  lng: p.lng + QUAI_OFFSET_M / M_PER_DEG_LNG,
}))
  .slice()
  .reverse();
/** Tronçon du quai remonté par le couloir nord (départ ~200 m au sud du centre). */
const QUAI_SEGMENT_START_INDEX = 2;

/** Rue diagonale nord-est — le couloir RIVAL descend le long d'elle vers le quai. */
const RUE_NE: readonly LatLngPoint[] = [
  offsetMeters(900, 1_650),
  offsetMeters(700, 1_300),
  offsetMeters(520, 1_000),
  offsetMeters(400, 800),
  offsetMeters(340, 690),
];

/** Axes principaux dessinés plus épais (2-3, doc §7). */
export const MAIN_AXES: readonly (readonly LatLngPoint[])[] = [AXIS_EST, AXIS_NS, AXIS_DIAG_SO];

/** Rues secondaires : trame procédurale déterministe + quai + rue NE. */
export const STREETS: readonly (readonly LatLngPoint[])[] = [...buildMinorStreets(), QUAI, RUE_NE];

/**
 * Tronçons hôtes des couloirs de course (consommés par fakeHexes) : le
 * territoire capturé SUIT visuellement ces rues du plan.
 */
export const CORRIDOR_HOSTS = {
  /** Couloir Est de mon crew, le long de l'axe République→Est. */
  est: AXIS_EST.slice(AXIS_EST_HOME_INDEX),
  /** Couloir nord de mon crew, le long du quai du canal. */
  quai: QUAI.slice(QUAI_SEGMENT_START_INDEX),
  /** Couloir sud-ouest de mon crew, le long de la diagonale. */
  sudOuest: AXIS_DIAG_SO,
  /** Couloir RIVAL qui s'approche depuis le nord-est le long de la rue NE. */
  rivalNordEst: RUE_NE,
} as const;

/** Route ouverte (doc §7) : le long du boulevard NS, entre le cluster maison et l'avant-poste. */
export const ROUTE_OUVERTE: readonly LatLngPoint[] = [
  offsetMeters(-100, -60),
  offsetMeters(-112, -340),
  offsetMeters(-122, -640),
  offsetMeters(-132, -940),
  offsetMeters(-124, -1_140),
  offsetMeters(-115, -1_320),
];

/** Ancre de la zone objectif crew (zone neutre sur l'axe Est, côté ouest). */
export const OBJECTIVE_ANCHOR: LatLngPoint = offsetMeters(-640, -20);

/** 2 parcs stylisés (aplats vert très sombre, anneaux fermés, formes irrégulières). */
export const PARKS: readonly (readonly LatLngPoint[])[] = [
  // Square type Villemin, au nord-ouest
  [
    offsetMeters(-660, 960),
    offsetMeters(-420, 990),
    offsetMeters(-380, 830),
    offsetMeters(-500, 750),
    offsetMeters(-650, 800),
  ],
  // Jardin type Trousseau, au sud-est
  [
    offsetMeters(510, -740),
    offsetMeters(740, -760),
    offsetMeters(750, -910),
    offsetMeters(560, -940),
    offsetMeters(490, -850),
  ],
];

/** Noms de secteurs très discrets (doc §7 : Paris Est / République / Canal / Bastille). */
export const SECTOR_LABELS: readonly SectorLabel[] = [
  { name: 'RÉPUBLIQUE', ...offsetMeters(-350, 1_250) },
  { name: 'CANAL', ...offsetMeters(530, 420) },
  { name: 'BASTILLE', ...offsetMeters(450, -620) },
  { name: 'PARIS EST', ...offsetMeters(-560, -420) },
];
