/**
 * GRYD Admin — simulateur : génération de trace GPS + exécution du VRAI moteur.
 *
 * Pipeline identique à ingest_run (Edge Function) :
 *   filterPoints → computeStats → validateRun → claimableSegments →
 *   stepCoherence → hexesForSegments → decideClaims → computeScore.
 * Tout vient de @klaim/engine — AUCUNE règle de jeu réimplémentée ici. La seule
 * logique locale est la fabrication d'un état d'hexes existants plausible
 * (adversaires, locks, boucliers, protection nouveau joueur, zones privées),
 * état que la vraie RPC lirait en DB.
 */
import {
  MOTION_TRUST_FLAGGED_BELOW,
  claimableSegments,
  computeScore,
  computeStats,
  decideClaims,
  filterPoints,
  hexesForSegments,
  stepCoherence,
  validateRun,
  type HexState,
  type Segment,
} from '@klaim/engine';
import { cellToBoundary } from 'h3-js';
import { CITIES, type CityId, type ZoneDensity } from '@klaim/shared/game-rules';
import type {
  HexClaimResult,
  HexOutcome,
  RejectReason,
  RunPoint,
  RunSource,
  RunStatus,
} from '@klaim/shared/types';
import { mulberry32 } from './demo-data';
import type { MapHex, MapHexKind, MapPath } from '../components/TraceMap';

// ─── Paramètres de simulation ────────────────────────────────────────────────

export type CheatMode = 'none' | 'bike' | 'car' | 'car_city' | 'gps_jump' | 'mixed';

export interface SimParams {
  city: CityId;
  distanceKm: number; // 1-15
  paceSKm: number; // 180-720 (3:00 → 12:00 /km)
  noiseM: number; // bruit GPS (écart-type, m)
  cheat: CheatMode;
  source: RunSource;
  density: ZoneDensity;
}

export const CHEAT_LABELS: Record<CheatMode, string> = {
  none: 'Aucun — course honnête',
  bike: 'Vélo (~22 km/h)',
  car: 'Voiture (45 km/h)',
  car_city: 'Voiture en ville (~18 km/h, zéro pas)',
  gps_jump: 'Sauts GPS (téléportations)',
  mixed: 'Segments mixtes (marche très lente au milieu)',
};

/** Cas de démo en 1 clic — statuts attendus vérifiés contre le moteur. */
export const PRESETS: { id: string; label: string; expect: RunStatus; params: SimParams }[] = [
  {
    id: 'clean',
    label: 'Course propre 5 km',
    expect: 'valid',
    params: { city: 'paris', distanceKm: 5, paceSKm: 330, noiseM: 5, cheat: 'none', source: 'gps', density: 'active' },
  },
  {
    id: 'bike',
    label: 'Vélo (doit être rejetée)',
    expect: 'rejected',
    params: { city: 'paris', distanceKm: 6, paceSKm: 330, noiseM: 4, cheat: 'bike', source: 'gps', density: 'active' },
  },
  {
    id: 'car',
    label: 'Voiture (flagged)',
    expect: 'flagged',
    // 18 km/h : allure « humaine » (~3:20/km mesuré) → passe §3.2, mais zéro pas
    // → motionTrust ≈ 0 → flagged (45 km/h serait rejetée : tous points filtrés).
    params: { city: 'lille', distanceKm: 5, paceSKm: 330, noiseM: 5, cheat: 'car_city', source: 'gps', density: 'emerging' },
  },
  {
    id: 'mixed',
    label: 'Segments mixtes (partial)',
    expect: 'partial',
    params: { city: 'paris', distanceKm: 6, paceSKm: 330, noiseM: 2, cheat: 'mixed', source: 'gps', density: 'active' },
  },
];

// ─── Génération de trace (marche aléatoire lissée) ──────────────────────────

const M_PER_DEG_LAT = 111_320;
const DT_S = 3; // ~1 point / 3 s
const KMH = 3.6;

interface Phase {
  distanceM: number;
  paceSKm: number;
  stepsPerM: number;
  /** Téléportation (m) AVANT la phase — saut GPS > 100 m = segment coupé. */
  jumpBeforeM?: number;
}

function phasesFor(p: SimParams): Phase[] {
  const d = p.distanceKm * 1000;
  switch (p.cheat) {
    case 'none':
      return [{ distanceM: d, paceSKm: p.paceSKm, stepsPerM: 1.3 }];
    case 'bike':
      return [{ distanceM: d, paceSKm: 3600 / 22, stepsPerM: 0.05 }];
    case 'car':
      return [{ distanceM: d, paceSKm: 3600 / 45, stepsPerM: 0.005 }];
    case 'car_city':
      return [{ distanceM: d, paceSKm: 3600 / 18, stepsPerM: 0.005 }];
    case 'gps_jump':
      return [
        { distanceM: d * 0.4, paceSKm: p.paceSKm, stepsPerM: 1.3 },
        { distanceM: d * 0.3, paceSKm: p.paceSKm, stepsPerM: 1.3, jumpBeforeM: 220 },
        { distanceM: d * 0.3, paceSKm: p.paceSKm, stepsPerM: 1.3, jumpBeforeM: 180 },
      ];
    case 'mixed':
      // Marche très lente (15:00/km) isolée par deux sauts : segment exclu du
      // claim (> SEGMENT_PACE_MAX_S_KM) mais course globalement valide → partial.
      return [
        { distanceM: d * 0.4, paceSKm: p.paceSKm, stepsPerM: 1.3 },
        { distanceM: d * 0.2, paceSKm: 900, stepsPerM: 1.4, jumpBeforeM: 160 },
        { distanceM: d * 0.4, paceSKm: p.paceSKm, stepsPerM: 1.3, jumpBeforeM: 160 },
      ];
  }
}

function gauss(rng: () => number): number {
  // Box-Muller.
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface SimTrace {
  points: RunPoint[];
  stepCount: number;
}

export function generateTrace(params: SimParams, seed: number): SimTrace {
  const rng = mulberry32(seed);
  const center = CITIES[params.city].center;
  let lat = center.lat + (rng() - 0.5) * 0.03;
  let lng = center.lng + (rng() - 0.5) * 0.045;
  let heading = rng() * Math.PI * 2;
  let t = Date.now() - 2 * 3_600_000; // course « il y a 2 h »
  let steps = 0;
  const points: RunPoint[] = [];

  // Bruit GPS corrélé (AR(1)) : dérive lente réaliste, la distance mesurée
  // reste proche de la distance vraie (le bruit blanc gonflerait l'allure).
  const rho = 0.85;
  const incStd = params.noiseM * Math.sqrt(1 - rho * rho);
  let nx = 0;
  let ny = 0;

  const push = () => {
    nx = rho * nx + incStd * gauss(rng);
    ny = rho * ny + incStd * gauss(rng);
    const mLat = lat + ny / M_PER_DEG_LAT;
    const mLng = lng + nx / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
    const point: RunPoint = { lat: mLat, lng: mLng, t };
    if (params.source === 'gps') {
      // HealthKit : pas d'accuracy (considérée bonne, cf. types.ts).
      point.acc = Math.round(3 + Math.abs(gauss(rng)) * (2 + params.noiseM * 0.7));
    }
    points.push(point);
    t += DT_S * 1000;
  };

  push();
  for (const phase of phasesFor(params)) {
    if (phase.jumpBeforeM) {
      const jh = rng() * Math.PI * 2;
      lat += (phase.jumpBeforeM * Math.cos(jh)) / M_PER_DEG_LAT;
      lng += (phase.jumpBeforeM * Math.sin(jh)) / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
    }
    const speedMS = 1000 / phase.paceSKm;
    const stepM = speedMS * DT_S;
    let travelled = 0;
    while (travelled < phase.distanceM) {
      heading += (rng() - 0.5) * 0.5;
      lat += (stepM * Math.cos(heading)) / M_PER_DEG_LAT;
      lng += (stepM * Math.sin(heading)) / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
      travelled += stepM;
      steps += stepM * phase.stepsPerM;
      push();
    }
  }
  return { points, stepCount: Math.round(steps) };
}

// ─── État d'hexes existants plausible (ce que la RPC lirait en DB) ──────────

const ME = 'moi';
const ADVERSARY = 'crew-adverse';
const NEWBIE = 'nouveau-joueur'; // compte < 14 j → protection

interface FabricatedWorld {
  states: Map<string, HexState>;
  privacyHexes: Set<string>;
  noCaptureHexes: Set<string>;
  ownersCreatedAt: Map<string, Date>;
}

function fabricateWorld(hexes: readonly string[], seed: number, now: Date): FabricatedWorld {
  const rng = mulberry32(seed ^ 0x51ca7);
  const nowMs = now.getTime();
  const day = 86_400_000;
  const hour = 3_600_000;
  const states = new Map<string, HexState>();
  const privacyHexes = new Set<string>();
  const noCaptureHexes = new Set<string>();

  for (const hex of hexes) {
    const r = rng();
    if (r < 0.03) {
      noCaptureHexes.add(hex); // autoroute / zone militaire
      continue;
    }
    if (r < 0.07) {
      privacyHexes.add(hex); // zone privée d'un riverain (§7)
      continue;
    }
    if (r < 0.17) {
      // Déjà à moi : moitié défendable (+3), moitié en cooldown 24 h (0 pt).
      const recent = rng() < 0.5;
      states.set(hex, {
        ownerUserId: ME,
        lockedUntil: null,
        shieldedUntil: null,
        decayAt: new Date(nowMs + 10 * day),
        lastDefendedAt: new Date(nowMs - (recent ? 6 : 30) * hour),
        everOwned: true,
      });
      continue;
    }
    if (r < 0.47) {
      // ~30 % adverses : lock / bouclier / protection nouveau joueur / volable.
      const sub = rng();
      states.set(hex, {
        ownerUserId: sub < 0.5 && sub >= 0.35 ? NEWBIE : ADVERSARY,
        lockedUntil: sub < 0.2 ? new Date(nowMs + 12 * hour) : null,
        shieldedUntil: sub >= 0.2 && sub < 0.35 ? new Date(nowMs + 24 * hour) : null,
        decayAt: new Date(nowMs + 14 * day),
        lastDefendedAt: new Date(nowMs - 2 * day),
        everOwned: true,
      });
      continue;
    }
    if (r < 0.57) {
      // Neutre mais déjà possédé dans l'histoire (pas de bonus pionnier).
      states.set(hex, {
        ownerUserId: null,
        lockedUntil: null,
        shieldedUntil: null,
        decayAt: null,
        lastDefendedAt: null,
        everOwned: true,
      });
    }
    // Sinon : absent de la map = jamais possédé → pionnier possible.
  }

  return {
    states,
    privacyHexes,
    noCaptureHexes,
    ownersCreatedAt: new Map([
      [ADVERSARY, new Date(nowMs - 400 * day)],
      [NEWBIE, new Date(nowMs - 3 * day)], // < NEW_PLAYER_PROTECTION_DAYS
    ]),
  };
}

// ─── Exécution du moteur ─────────────────────────────────────────────────────

export interface SimResult {
  status: RunStatus;
  rejectReason?: RejectReason;
  stats: { distanceM: number; durationS: number; avgPaceSKm: number };
  totalPoints: number;
  keptPoints: number;
  segmentsKept: number;
  segmentsExcluded: number;
  gpsTrust: number;
  motionTrust: number;
  stepCount: number;
  mapHexes: MapHex[];
  paths: MapPath[];
  outcomeCounts: Partial<Record<HexOutcome, number>>;
  totals: { claimed: number; stolen: number; defended: number; pioneer: number; blocked: number };
  /** null si rejetée ; « gelé » si flaggée (points calculés mais non crédités). */
  score: {
    basePoints: number;
    pointsAwarded: number;
    fouleesAwarded: number;
    xpAwarded: number;
    streakMultiplier: number;
    performanceModifier: number;
    frozen: boolean;
  } | null;
}

const KIND_BY_OUTCOME: Record<HexOutcome, MapHexKind> = {
  claimed_neutral: 'mine',
  stolen: 'stolen',
  defended: 'mine',
  already_owned_cooldown: 'mine',
  blocked_lock: 'blocked',
  blocked_shield: 'blocked',
  blocked_new_player: 'blocked',
  blocked_privacy: 'blocked',
  blocked_no_capture_zone: 'blocked',
  blocked_daily_cap: 'blocked',
};

function segmentPath(seg: Segment, id: string, kind: MapPath['kind']): MapPath {
  return { id, kind, points: seg.map((p) => ({ lat: p.lat, lng: p.lng })) };
}

export function simulate(params: SimParams, seed: number): SimResult {
  const now = new Date();
  const { points, stepCount } = generateTrace(params, seed);

  // ── LE MOTEUR (fonctions pures de @klaim/engine) ──
  const filtered = filterPoints(points);
  const stats = computeStats(filtered.segments);
  const validation = validateRun(stats);
  const claimable = claimableSegments(filtered.segments);
  const motionTrust = stepCoherence(stats.distanceM, stepCount);
  const gpsTrust = Math.round((filtered.keptPoints / Math.max(1, filtered.totalPoints)) * 100);

  const status: RunStatus = validation.status === 'rejected'
    ? 'rejected'
    : motionTrust < MOTION_TRUST_FLAGGED_BELOW
      ? 'flagged'
      : claimable.status;

  const hexes = hexesForSegments(claimable.claimable);
  const world = fabricateWorld(hexes, seed, now);
  const decision = decideClaims({
    hexes,
    states: world.states,
    context: {
      userId: ME,
      userCreatedAt: new Date(now.getTime() - 60 * 86_400_000), // compte de 60 j
      now,
      ownersCreatedAt: world.ownersCreatedAt,
      privacyHexes: world.privacyHexes,
      noCaptureHexes: world.noCaptureHexes,
      zoneDensity: params.density,
      claimsToday: 0,
    },
  });

  // Carte : hexes colorés par outcome (gelés si flagged, contour si rejetée).
  const outcomeByHex = new Map<string, HexClaimResult>(decision.results.map((r) => [r.h3, r]));
  const mapHexes: MapHex[] = hexes.map((h3) => {
    const res = outcomeByHex.get(h3);
    const kind: MapHexKind = status === 'rejected'
      ? 'outline'
      : status === 'flagged'
        ? 'frozen'
        : res
          ? KIND_BY_OUTCOME[res.outcome]
          : 'outline';
    return {
      id: h3,
      boundary: cellToBoundary(h3) as [number, number][],
      kind,
      ...(res?.pioneer && status !== 'rejected' && status !== 'flagged'
        ? { pioneer: true }
        : {}),
    };
  });

  const paths: MapPath[] = [
    { id: 'raw', kind: 'raw', points: points.map((p) => ({ lat: p.lat, lng: p.lng })) },
    ...claimable.excluded.map((s, i) => segmentPath(s, `excl-${i}`, 'excluded')),
    ...claimable.claimable.map((s, i) => segmentPath(s, `kept-${i}`, 'kept')),
  ];

  const outcomeCounts: Partial<Record<HexOutcome, number>> = {};
  for (const r of decision.results) {
    outcomeCounts[r.outcome] = (outcomeCounts[r.outcome] ?? 0) + 1;
  }

  let score: SimResult['score'] = null;
  if (status !== 'rejected') {
    const s = computeScore({
      basePoints: decision.totals.points,
      streakWeeks: 3,
      performance: { dataReliability: gpsTrust / 100, isRegular: true },
      isClub: false,
    });
    const frozen = status === 'flagged'; // claims gelés : rien n'est crédité (§6 étape 2)
    score = {
      basePoints: decision.totals.points,
      pointsAwarded: frozen ? 0 : s.points,
      fouleesAwarded: frozen ? 0 : s.foulees,
      xpAwarded: frozen ? 0 : s.xp,
      streakMultiplier: s.streakMultiplier,
      performanceModifier: s.performanceModifier,
      frozen,
    };
  }

  return {
    status,
    ...(validation.status === 'rejected' ? { rejectReason: validation.reason } : {}),
    stats: {
      distanceM: Math.round(stats.distanceM),
      durationS: Math.round(stats.durationS),
      avgPaceSKm: Math.round(stats.avgPaceSKm),
    },
    totalPoints: filtered.totalPoints,
    keptPoints: filtered.keptPoints,
    segmentsKept: claimable.claimable.length,
    segmentsExcluded: claimable.excluded.length,
    gpsTrust,
    motionTrust,
    stepCount,
    mapHexes,
    paths,
    outcomeCounts,
    totals: decision.totals,
    score,
  };
}
