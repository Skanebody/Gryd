/**
 * GRYD — Types partagés : contrats client ↔ Edge Functions.
 * Le client n'attribue JAMAIS un hex : il envoie des points, le serveur décide.
 */
import type { CityId } from './game-rules';

export type RunSource = 'gps' | 'healthkit';

/**
 * Mode de course choisi au départ (AMENDEMENT-07 §2, social §10). `race_mode`
 * et `event_run` sont catalogués mais DÉSACTIVÉS (V1) : ingest_run les traite
 * comme `conquete` en MVP. Défaut `conquete` si absent de la requête.
 */
export type RunMode =
  | 'conquete' // capture normale + règles run groupé
  | 'social_run' // stats + badges + XP perso, capture désactivée (hexes → stats_only)
  | 'course_privee' // stats perso uniquement, aucun claim, aucun partage, aucun feed
  | 'race_mode' // V1 (désactivé)
  | 'event_run'; // V1 (désactivé)

/** Profil motivationnel (AMENDEMENT-07 §1, motivation §2-§4). Filtrage UI/notifs, pas de gameplay. */
export type PlayStyle = 'focus_solo' | 'mixte' | 'crew_war';

/** Visibilité du profil (AMENDEMENT-07 §1, motivation §4/§34). */
export type ProfileVisibility = 'private' | 'friends' | 'crew' | 'public';
/** Partage d'activité (AMENDEMENT-07 §1). */
export type ActivitySharing = 'private' | 'friends' | 'crew' | 'stats_only';
/** Partage de carte/traces (AMENDEMENT-07 §1). Défaut simplified, jamais de position live. */
export type MapSharing = 'precise' | 'simplified' | 'territory_only' | 'none';

/**
 * Statut social d'un hex touché par une course (AMENDEMENT-07 §3, social §13).
 *  - `stats_only` : traversé sans claim (social_run/course_privee, ou anti-collusion) ;
 *  - `contested`  : revendiqué par ≥ 2 crews dans la fenêtre → résolution pondérée ;
 *  - `defended`   : re-parcouru par son propriétaire lors d'un run groupé ;
 *  - `neutralized`: égalité de contribution entre crews → reste neutre/contesté, jamais volé.
 */
export type HexSocialStatus = 'contested' | 'defended' | 'neutralized' | 'stats_only';
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
  /**
   * GPS Trust client 0-100 (AMENDEMENT-15 §1) : score du moteur gps.ts calculé
   * sur la trace BRUTE (accuracy moyenne, pertes de signal, ratio d'outliers —
   * compteurs perdus après décimation, le serveur ne peut pas le recalculer).
   * Signal INDICATIF : le serveur le borne par min() avec son propre calcul et
   * reste SEUL juge du claim (§3.2).
   */
  gpsTrust?: number;
  /** Le joueur a partagé le résultat de cette course (badge First Share, AMENDEMENT-06 §1). */
  shared?: boolean;
  /** sha-256 de la polyline arrondie (dédup Activity Hub §4) — calculé serveur si absent. */
  polylineHash?: string;
  /** Mode de course (AMENDEMENT-07 §2) — défaut `conquete` si absent. */
  runMode?: RunMode;
  /**
   * Mode facile choisi au départ (AMENDEMENT-07 §6) : course SANS objectif de
   * vitesse (badges Easy Run / Recovery Run). Défaut false. Signal client, jamais
   * déduit du gameplay — la récup se choisit, elle n'est ni imposée ni jugée.
   */
  easyMode?: boolean;
}

/** Avancement d'un challenge renvoyé après une course (AMENDEMENT-07 §5). */
export interface ChallengeUpdate {
  challengeId: string;
  /** Sujet : le joueur (`user`) ou son crew (`crew`). */
  kind: 'user' | 'crew';
  name: string;
  /** Valeur courante sur la métrique de l'objectif. */
  progress: number;
  target: number;
  /** Objectif atteint (juste franchi ou déjà fait). */
  done: boolean;
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
  /** Badges débloqués par cette course (keys du catalogue badges.ts, AMENDEMENT-04 §5). */
  newBadges: string[];
  /** XP crew créditée par cette course (après cap quotidien §34.1). Absent si sans crew. */
  crewXp?: number;
  /** Montée de niveau crew déclenchée par cette course (§34.3). Absent si aucune. */
  crewLevelUp?: { from: number; to: number };
  /** Mode de course appliqué (AMENDEMENT-07 §2) — écho du runMode (défaut conquete). */
  runMode?: RunMode;
  /**
   * Hexes passés en `contested` par cette course (AMENDEMENT-07 §3, approx MVP :
   * 2ᵉ ingest d'un autre crew dans la fenêtre de lock d'un hex fraîchement claimé).
   * Absent/vide si aucun. Le résumé de course les explicite (social §13).
   */
  contestedHexes?: string[];
  /**
   * Challenges actifs du joueur et de son crew mis à jour par cette course
   * (AMENDEMENT-07 §5). Absent/vide si aucun challenge actif concerné. Sert au
   * feedback sain (« à 1 run de ton objectif », jamais culpabilisant §12).
   */
  challengeUpdates?: ChallengeUpdate[];
  /**
   * AMENDEMENT-12 §B « la boucle fait la zone » : true si la trace claimable
   * est revenue à ≤ LOOP_CLOSE_TOLERANCE_M de son départ avec une distance
   * totale ≥ LOOP_MIN_PERIMETER_M (décidé serveur, detectClosedLoop). Toujours
   * présent en mode conquête ; absent hors conquête (social_run/course_privee :
   * jamais de claims, boucle ou pas) et sur les courses rejetées/gelées.
   */
  loopClosed?: boolean;
  /**
   * Zones INTÉRIEURES gagnées grâce à la boucle fermée (claimed_neutral +
   * stolen, DÉJÀ comptées dans `hexes`/`results` — pas un total séparé).
   * Alimente le « dont N en boucle fermée » du post-run et le burst Live Run
   * (AMENDEMENT-12 §C). 0 si boucle ouverte ou intérieur entièrement bloqué.
   */
  enclosedZones?: number;
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
