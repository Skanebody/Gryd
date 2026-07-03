/**
 * GRYD — Types partagés : contrats client ↔ Edge Functions.
 * Le client n'attribue JAMAIS un hex : il envoie des points, le serveur décide.
 */
import type { CityId } from './game-rules';

export type RunSource = 'gps' | 'healthkit';
/** `partial` (AMENDEMENT-02 §4) : segments douteux exclus, le reste claim. */
export type RunStatus = 'valid' | 'partial' | 'rejected' | 'flagged';

export type RejectReason =
  | 'too_short' // < RUN_MIN_DISTANCE_M
  | 'too_brief' // < RUN_MIN_DURATION_S
  | 'pace_too_fast' // allure moyenne < RUN_AVG_PACE_MIN_S_KM (anti-vélo)
  | 'pace_too_slow' // allure moyenne > RUN_AVG_PACE_MAX_S_KM
  | 'no_valid_points'; // tous les points filtrés

/** Un point GPS brut envoyé par le client (ou issu d'une route HealthKit). */
export interface RunPoint {
  lat: number;
  lng: number;
  /** Timestamp epoch ms. */
  t: number;
  /** Précision horizontale en mètres (absente pour HealthKit → considérée bonne). */
  acc?: number;
}

/** Requête d'ingestion — idempotente par (user, clientRunId). */
export interface IngestRunRequest {
  /** UUID généré côté client AVANT la course : clé d'idempotence (retry offline safe). */
  clientRunId: string;
  source: RunSource;
  /** Ville de rattachement déclarée (classements) — la capture n'y est PAS bornée (France entière, AMENDEMENT-02 §2). */
  cityId?: CityId;
  startedAt: string; // ISO 8601
  points: RunPoint[];
  /** Nombre de pas mesuré sur la période (podomètre/HealthKit) — signal GRYD Verify optionnel. */
  stepCount?: number;
}

/** Résultat d'un claim par hexagone, décidé serveur. */
export type HexOutcome =
  | 'claimed_neutral' // +POINTS_NEUTRAL_HEX (+ pionnier éventuel)
  | 'stolen' // +POINTS_STOLEN_HEX
  | 'defended' // +POINTS_DEFENDED_HEX (max 1×/24 h/hex)
  | 'blocked_lock' // lock 24 h d'un autre joueur
  | 'blocked_shield' // bouclier actif
  | 'blocked_new_player' // protection compte < 14 j
  | 'blocked_privacy' // zone privée (aucune donnée rendue)
  | 'blocked_no_capture_zone' // zone non capturable (autoroute, zone militaire…)
  | 'blocked_daily_cap' // > MAX_CLAIMS_PER_DAY
  | 'already_owned_cooldown'; // déjà à moi, défendu il y a < 24 h

export interface HexClaimResult {
  /** Index H3 res 10 en représentation string (converti en BIGINT en DB). */
  h3: string;
  outcome: HexOutcome;
  points: number;
  pioneer: boolean;
}

/** Payload de célébration renvoyé au client (< 3 s après la fin de course). */
export interface IngestRunResponse {
  runId: string;
  status: RunStatus;
  rejectReason?: RejectReason;
  /** True si la réponse vient d'un traitement antérieur (retry idempotent). */
  replayed: boolean;
  distanceM: number;
  durationS: number;
  avgPaceSKm: number;
  hexes: {
    claimed: number;
    stolen: number;
    defended: number;
    pioneer: number;
    blocked: number;
  };
  pointsAwarded: number;
  fouleesAwarded: number;
  xpAwarded: number;
  streak: { weeks: number; multiplier: number };
  results: HexClaimResult[];
}

/** Ligne hex_claims exposée publiquement (jamais de trace, jamais de position live). */
export interface PublicHexClaim {
  h3: string;
  cityId: CityId;
  ownerPseudo: string;
  crewId: string | null;
  crewColorCache: string | null;
  claimedAt: string;
  lockedUntil: string | null;
  shieldedUntil: string | null;
}
