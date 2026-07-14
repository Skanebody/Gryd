/**
 * GRYD Admin — données de démonstration DÉTERMINISTES.
 *
 * MODE DÉMO (point ouvert O1) : tant que le projet Supabase n'est pas branché,
 * le dashboard lit ce générateur. Interface volontairement calquée sur les
 * colonnes de supabase/migrations/0002_schema.sql (runs, hex_claims) :
 * TODO(O1) — remplacer chaque getter par la requête Supabase équivalente
 * (service_role côté serveur), sans changer les types exportés.
 *
 * Déterminisme : PRNG seedé (mulberry32), seed fixe — AUCUN Math.random à
 * l'init de module (SSR stable). Seule l'ancre temporelle est capturée au
 * premier appel (lazy), pour que « courses du jour » reste vivant.
 */
import {
  RUN_AVG_PACE_MAX_S_KM,
  RUN_AVG_PACE_MIN_S_KM,
  CITIES,
  type CityId,
} from '@klaim/shared/game-rules';
import type { RejectReason, RunSource, RunStatus } from '@klaim/shared/types';

// ─── PRNG seedé ───────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0x6b1a1; // fixe — même dataset à chaque rendu serveur

// ─── Types (miroir 0002_schema.sql, enrichis pour l'admin) ───────────────────

export interface DemoSanction {
  /** Niveau §7 (1-8) — sanctions progressives. */
  level: number;
  label: string;
  at: string; // ISO
}

export interface DemoPlayer {
  id: string;
  pseudo: string;
  createdAt: string;
  device: string;
  deviceIntegrity: 'ok' | 'jailbreak' | 'émulateur' | 'inconnu';
  riskScore: number; // 0-100
  runsTotal: number;
  flaggedRuns: number;
  repeatedTraces: number; // traces quasi identiques répétées
  multiAccountSuspect: boolean;
  sanctions: DemoSanction[];
  cityId: CityId;
}

export interface DemoAdminAction {
  id: string;
  at: string;
  author: string; // « système » ou email admin
  action: string;
  before: string;
  after: string;
  reason: string;
}

export interface DemoRun {
  id: string;
  userId: string;
  pseudo: string;
  source: RunSource;
  cityId: CityId;
  startedAt: string;
  distanceM: number;
  durationS: number;
  avgPaceSKm: number;
  status: RunStatus;
  rejectReason?: RejectReason;
  trustScore: number;
  gpsTrust: number;
  motionTrust: number;
  stepCount?: number;
  segmentsKept: number;
  segmentsExcluded: number;
  claimsRequested: number;
  claimsGranted: number;
  pointsAwarded: number;
  flagReasons: string[];
  /** Trace masquée (zones privées expurgées) pour la mini-carte de détail. */
  trace: { lat: number; lng: number }[];
  /** Plages d'indices de `trace` exclues du claim (affichées gris pointillé). */
  excludedRanges: [number, number][];
  /** Journal admin_actions existant (spec §9 : aucune action sans trace). */
  journal: DemoAdminAction[];
}

export interface DemoFrozenClaim {
  id: string;
  runId: string;
  userId: string;
  pseudo: string;
  cityId: CityId;
  hexCount: number;
  potentialPoints: number;
  reason: string;
  frozenAt: string;
  rankImpact: string;
}

export interface DashboardStats {
  runsToday: number;
  flaggedPending: number;
  frozenClaims: number;
  activePlayers: number;
  newCrews: number;
  reports: number;
}

export interface AdminDemoData {
  players: DemoPlayer[];
  runs: DemoRun[];
  frozenClaims: DemoFrozenClaim[];
  stats: DashboardStats;
}

// ─── Génération ──────────────────────────────────────────────────────────────

const PSEUDOS: { pseudo: string; device: string; cityId: CityId }[] = [
  { pseudo: 'ClaraSprint75', device: 'iPhone 15 Pro', cityId: 'paris' },
  { pseudo: 'Maxime_LZ', device: 'Pixel 8', cityId: 'lille' },
  { pseudo: 'chloe.kmh', device: 'iPhone 14', cityId: 'paris' },
  { pseudo: 'ThéoPace', device: 'Galaxy S24', cityId: 'paris' },
  { pseudo: 'AlixDuNord', device: 'iPhone 13 mini', cityId: 'lille' },
  { pseudo: 'JB_Foulées', device: 'Pixel 7a', cityId: 'paris' },
  { pseudo: 'Margaux19e', device: 'iPhone 15', cityId: 'paris' },
  { pseudo: 'RaphVélo59', device: 'Xiaomi 13T', cityId: 'lille' },
  { pseudo: 'CamilleTrail', device: 'iPhone 12', cityId: 'paris' },
  { pseudo: 'YanisFlash', device: 'OnePlus 12', cityId: 'lille' },
  { pseudo: 'SoléneRun', device: 'iPhone 15 Plus', cityId: 'paris' },
  { pseudo: 'Kevin_GPS', device: 'émulateur Android ?', cityId: 'lille' },
];

/** Répartition des statuts sur les ~40 courses (mélangée déterministiquement). */
const STATUS_PLAN: RunStatus[] = [
  ...Array<RunStatus>(22).fill('valid'),
  ...Array<RunStatus>(6).fill('partial'),
  ...Array<RunStatus>(7).fill('flagged'),
  ...Array<RunStatus>(5).fill('rejected'),
];

const REJECT_REASONS: RejectReason[] = [
  'pace_too_fast',
  'too_short',
  'no_valid_points',
  'pace_too_slow',
  'too_brief',
];

const FLAG_REASON_POOL = [
  'motion_trust bas — cadence quasi nulle sur distance significative',
  'vitesse segmentaire régulière type véhicule',
  'trace identique à 94 % aux 3 dernières courses',
  'précision GPS dégradée sur 40 % des points',
  'départ/arrivée hors zone habituelle + device modifié',
];

function isoAgo(anchorMs: number, ms: number): string {
  return new Date(anchorMs - ms).toISOString();
}

/** Marche aléatoire lissée autour du centre-ville (pour la mini-carte). */
function makeTrace(
  rng: () => number,
  cityId: CityId,
  distanceM: number,
): { lat: number; lng: number }[] {
  const center = CITIES[cityId].center;
  const n = Math.max(24, Math.min(140, Math.round(distanceM / 90)));
  const stepM = distanceM / n;
  // Point de départ décalé du centre (± ~2,5 km), déterministe.
  let lat = center.lat + (rng() - 0.5) * 0.045;
  let lng = center.lng + (rng() - 0.5) * 0.065;
  let heading = rng() * Math.PI * 2;
  const pts: { lat: number; lng: number }[] = [{ lat, lng }];
  const mPerDegLat = 111_320;
  for (let i = 0; i < n; i++) {
    heading += (rng() - 0.5) * 0.7;
    lat += (stepM * Math.cos(heading)) / mPerDegLat;
    lng += (stepM * Math.sin(heading)) / (mPerDegLat * Math.cos((lat * Math.PI) / 180));
    pts.push({ lat, lng });
  }
  return pts;
}

function buildDataset(anchorMs: number): AdminDemoData {
  const rng = mulberry32(SEED);
  const day = 86_400_000;
  const hour = 3_600_000;

  // Joueurs — les 3 derniers sont « à risque » assumés.
  const players: DemoPlayer[] = PSEUDOS.map((p, i) => {
    const risky = i >= 9 || p.pseudo === 'RaphVélo59';
    const riskScore = risky ? 55 + Math.floor(rng() * 40) : Math.floor(rng() * 30);
    const sanctions: DemoSanction[] = [];
    if (riskScore > 60) {
      sanctions.push({
        level: 2,
        label: 'Avertissement doux',
        at: isoAgo(anchorMs, (10 + Math.floor(rng() * 10)) * day),
      });
    }
    if (riskScore > 80) {
      sanctions.push({
        level: 3,
        label: 'Claims gelés',
        at: isoAgo(anchorMs, (2 + Math.floor(rng() * 4)) * day),
      });
    }
    return {
      id: `u-${String(i + 1).padStart(2, '0')}`,
      pseudo: p.pseudo,
      createdAt: isoAgo(anchorMs, (20 + Math.floor(rng() * 90)) * day),
      device: p.device,
      deviceIntegrity: p.device.includes('émulateur')
        ? 'émulateur'
        : riskScore > 75
          ? 'inconnu'
          : 'ok',
      riskScore,
      runsTotal: 6 + Math.floor(rng() * 40),
      flaggedRuns: risky ? 2 + Math.floor(rng() * 5) : Math.floor(rng() * 2),
      repeatedTraces: risky ? Math.floor(rng() * 4) : 0,
      multiAccountSuspect: riskScore > 85,
      sanctions,
      cityId: p.cityId,
    };
  });

  // Mélange déterministe du plan de statuts.
  const statuses = [...STATUS_PLAN];
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = statuses[i]!;
    statuses[i] = statuses[j]!;
    statuses[j] = a;
  }

  const riskyPlayers = players.filter((p) => p.riskScore >= 55);
  const safePlayers = players.filter((p) => p.riskScore < 55);
  let rejectIdx = 0;

  const runs: DemoRun[] = statuses.map((status, i) => {
    const suspicious = status === 'flagged' || status === 'rejected';
    const pool = suspicious && rng() < 0.75 ? riskyPlayers : safePlayers;
    const player = pool[Math.floor(rng() * pool.length)]!;

    // Étalées sur 10 jours, ~6 dans les dernières 24 h.
    const ageMs = i < 8
      ? Math.floor(rng() * 22 * hour)
      : Math.floor((1 + rng() * 9) * day);
    const startedAt = isoAgo(anchorMs, ageMs);

    let distanceM: number;
    let avgPaceSKm: number;
    let rejectReason: RejectReason | undefined;
    let stepCount: number | undefined;
    let motionTrust = 80 + Math.floor(rng() * 20);

    if (status === 'rejected') {
      rejectReason = REJECT_REASONS[rejectIdx % REJECT_REASONS.length]!;
      rejectIdx++;
      switch (rejectReason) {
        case 'too_short':
          distanceM = 400 + Math.floor(rng() * 500);
          avgPaceSKm = 330 + Math.floor(rng() * 90);
          break;
        case 'too_brief':
          distanceM = 1_050 + Math.floor(rng() * 200);
          avgPaceSKm = 280 + Math.floor(rng() * 40);
          break;
        case 'pace_too_fast':
          distanceM = 6_000 + Math.floor(rng() * 6_000);
          avgPaceSKm = RUN_AVG_PACE_MIN_S_KM - 10 - Math.floor(rng() * 15); // ~2:25-2:40
          stepCount = Math.floor(distanceM * 0.08); // vélo : quasi pas de pas
          motionTrust = Math.floor(rng() * 20);
          break;
        case 'pace_too_slow':
          distanceM = 2_500 + Math.floor(rng() * 2_000);
          avgPaceSKm = RUN_AVG_PACE_MAX_S_KM + 40 + Math.floor(rng() * 80);
          break;
        case 'too_far':
          distanceM = 105_000 + Math.floor(rng() * 40_000); // > RUN_MAX_DISTANCE_M (plafond anti-abus)
          avgPaceSKm = 330 + Math.floor(rng() * 120);
          break;
        case 'no_valid_points':
          distanceM = 0;
          avgPaceSKm = 0;
          break;
      }
    } else {
      distanceM = 3_000 + Math.floor(rng() * 11_000);
      avgPaceSKm = 280 + Math.floor(rng() * 180); // 4:40 → 7:40
      stepCount = Math.floor(distanceM * (1.15 + rng() * 0.35));
      if (status === 'flagged') {
        motionTrust = Math.floor(rng() * 45); // < 50 → flagged
        stepCount = Math.floor(distanceM * (0.02 + rng() * 0.2));
        avgPaceSKm = 185 + Math.floor(rng() * 120); // rapide mais « valide »
      }
    }

    const durationS = Math.round((distanceM / 1000) * (avgPaceSKm || 300));
    const gpsTrust = status === 'rejected' && rejectReason === 'no_valid_points'
      ? 8 + Math.floor(rng() * 12)
      : 62 + Math.floor(rng() * 38);
    const trustScore = Math.min(gpsTrust, motionTrust);

    const segmentsExcluded = status === 'partial' ? 1 + Math.floor(rng() * 2) : 0;
    const segmentsKept = 1 + segmentsExcluded + Math.floor(rng() * 2);
    const hexEstimate = Math.max(0, Math.round((distanceM / 66) * (1.6 + rng() * 0.5)));
    const claimsRequested = status === 'rejected' ? 0 : hexEstimate;
    const claimsGranted = status === 'valid'
      ? Math.round(claimsRequested * (0.82 + rng() * 0.15))
      : status === 'partial'
        ? Math.round(claimsRequested * (0.45 + rng() * 0.25))
        : 0; // flagged → gelés, rejected → 0
    const pointsAwarded = claimsGranted * (10 + Math.floor(rng() * 3));

    const flagReasons = status === 'flagged'
      ? [
        FLAG_REASON_POOL[Math.floor(rng() * FLAG_REASON_POOL.length)]!,
        ...(rng() < 0.4 ? [FLAG_REASON_POOL[Math.floor(rng() * FLAG_REASON_POOL.length)]!] : []),
      ]
      : [];

    const trace = distanceM > 0 ? makeTrace(rng, player.cityId, distanceM) : [];
    const excludedRanges: [number, number][] = [];
    if (status === 'partial' && trace.length > 20) {
      const start = Math.floor(trace.length * (0.3 + rng() * 0.2));
      excludedRanges.push([start, Math.min(trace.length - 4, start + Math.floor(trace.length * 0.25))]);
    }

    const id = `run-${String(i + 1).padStart(3, '0')}`;
    const journal: DemoAdminAction[] = [];
    if (status === 'flagged') {
      journal.push({
        id: `${id}-j1`,
        at: startedAt,
        author: 'système (GRYD Verify)',
        action: 'Course flaggée automatiquement',
        before: 'statut : en cours de traitement',
        after: 'statut : flagged — claims gelés',
        reason: flagReasons[0] ?? 'signal automatique',
      });
    }
    if (status === 'rejected') {
      journal.push({
        id: `${id}-j1`,
        at: startedAt,
        author: 'système (moteur §3.2)',
        action: 'Course rejetée automatiquement',
        before: 'statut : en cours de traitement',
        after: `statut : rejected (${rejectReason ?? '—'})`,
        reason: 'validation §3.2',
      });
    }

    return {
      id,
      userId: player.id,
      pseudo: player.pseudo,
      source: rng() < 0.8 ? 'gps' : 'healthkit',
      cityId: player.cityId,
      startedAt,
      distanceM,
      durationS,
      avgPaceSKm,
      status,
      ...(rejectReason !== undefined ? { rejectReason } : {}),
      trustScore,
      gpsTrust,
      motionTrust,
      ...(stepCount !== undefined ? { stepCount } : {}),
      segmentsKept,
      segmentsExcluded,
      claimsRequested,
      claimsGranted,
      pointsAwarded,
      flagReasons,
      trace,
      excludedRanges,
      journal,
    };
  });

  runs.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  const frozenClaims: DemoFrozenClaim[] = runs
    .filter((r) => r.status === 'flagged')
    .map((r, i) => ({
      id: `fz-${String(i + 1).padStart(2, '0')}`,
      runId: r.id,
      userId: r.userId,
      pseudo: r.pseudo,
      cityId: r.cityId,
      hexCount: r.claimsRequested,
      potentialPoints: r.claimsRequested * 10,
      reason: r.flagReasons[0] ?? 'signal automatique',
      frozenAt: r.startedAt,
      rankImpact: r.claimsRequested > 120
        ? 'top 10 ville en jeu'
        : r.claimsRequested > 60
          ? 'classement de secteur'
          : 'impact local faible',
    }));

  const today = anchorMs - 24 * hour;
  const stats: DashboardStats = {
    runsToday: runs.filter((r) => new Date(r.startedAt).getTime() >= today).length,
    flaggedPending: runs.filter((r) => r.status === 'flagged').length,
    frozenClaims: frozenClaims.length,
    activePlayers: players.length,
    newCrews: 3,
    reports: 5,
  };

  return { players, runs, frozenClaims, stats };
}

// Singleton lazy (ancre temporelle posée au premier accès, pas à l'init module).
let cache: AdminDemoData | null = null;

/** TODO(O1) : remplacer par des requêtes Supabase (service_role, RLS admin). */
export function getAdminDemoData(): AdminDemoData {
  cache ??= buildDataset(Date.now());
  return cache;
}

export const getRuns = () => getAdminDemoData().runs;
export const getRunById = (id: string) => getAdminDemoData().runs.find((r) => r.id === id);
export const getPlayers = () => getAdminDemoData().players;
export const getFrozenClaims = () => getAdminDemoData().frozenClaims;
export const getDashboardStats = () => getAdminDemoData().stats;
