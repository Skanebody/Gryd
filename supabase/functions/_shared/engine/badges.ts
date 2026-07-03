// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/badges.ts

/**
 * GRYD — engine/badges.ts
 * Attribution des badges (AMENDEMENT-04 §5) : stats vie entière + évaluation.
 *
 * Fonctions PURES : aucune I/O, aucune horloge. L'appelant (ingest_run) lit
 * `user_stats` / `user_badges`, appelle applyRunToStats puis evaluateBadges,
 * et persiste. Tous les seuils/bornes viennent de @klaim/shared/badges —
 * AUCUN nombre magique badge ici.
 *
 * Métriques NON alimentées par une course (crewsCreated, referralsActivated,
 * outposts/routes/secteurs, dominatedSectors, météo/events) : mises à jour par
 * leurs pipelines respectifs directement dans user_stats — evaluateBadges les
 * ramasse à la course suivante.
 */
import {
  BADGES,
  DAWN_END_MIN,
  DAWN_START_MIN,
  EXACT_TEN_TARGET_M,
  EXACT_TEN_TOLERANCE,
  HOME_SPOT_H3_RESOLUTION,
  LOOP_MAX_CLOSE_M,
  NEW_YEAR_MONTH_DAY,
  NIGHT_END_MIN,
  NIGHT_START_MIN,
  SPRINTER_MAX_AVG_PACE_S_KM,
  STRAIGHT_MIN_DISTANCE_M,
  STRAIGHT_MIN_RATIO,
  WOLF_HOUR_END_MIN,
  WOLF_HOUR_START_MIN,
  type BadgeMetric,
} from '../badges.ts';
import type { RunStatus } from '../types.ts';
import { latLngToCell } from 'npm:h3-js@^4.1';
import { haversineM } from './validation.ts';

// Conversion d'unités — pas une règle de jeu.
const MS_PER_DAY = 86_400_000;

/**
 * Stats vie entière d'un joueur (table `user_stats`, migration 0007).
 * Toutes les métriques badge (Record<BadgeMetric, number>) sont des compteurs/
 * maxima croissants ; s'y ajoutent des champs de suivi internes (jours actifs,
 * spot de départ) jamais évalués directement par un badge.
 */
export interface LifetimeStats extends Record<BadgeMetric, number> {
  /** Meilleure (plus basse) allure moyenne d'une course valide, s/km. 0 = aucune. */
  bestAvgPaceSKm: number;
  /** Dernier jour actif LOCAL ('YYYY-MM-DD'), pour jours distincts + streaks. */
  lastActiveDay: string | null;
  /** Courses validées le dernier jour actif (alimente maxRunsInOneDay). */
  runsOnLastActiveDay: number;
  /** Jours actifs consécutifs en cours (alimente bestActiveDayStreak). */
  activeDayStreak: number;
  /** Cellule H3 res 9 du premier départ (« Fidèle au Poste ») — jamais de lat/lng exact. */
  homeSpotH3: string | null;
}

/** Stats vierges (nouveau joueur / ligne user_stats absente). */
export function emptyLifetimeStats(): LifetimeStats {
  return {
    runsValid: 0,
    totalDistanceM: 0,
    activeDays: 0,
    hexesCaptured: 0,
    steals: 0,
    defends: 0,
    pioneerHexes: 0,
    sectorsVisited: 0,
    outposts: 0,
    routes: 0,
    dominatedSectors: 0,
    crewsJoined: 0,
    crewsCreated: 0,
    crewContributions: 0,
    crewOutposts: 0,
    crewRoutes: 0,
    maxCrewSize: 0,
    referralsActivated: 0,
    soloRuns: 0,
    seasonZeroRuns: 0,
    seasonZeroHexes: 0,
    pioneerZoneRuns: 0,
    bestRunDistanceM: 0,
    sprintRuns: 0,
    nightRuns: 0,
    dawnRuns: 0,
    rainRuns: 0,
    snowRuns: 0,
    heatRuns: 0,
    eventRuns: 0,
    loopRuns: 0,
    exactTenRuns: 0,
    maxRunsInOneDay: 0,
    wolfHourRuns: 0,
    straightRuns: 0,
    maxHexesInRun: 0,
    newYearRuns: 0,
    bestActiveDayStreak: 0,
    homeSpotRuns: 0,
    bestAvgPaceSKm: 0,
    lastActiveDay: null,
    runsOnLastActiveDay: 0,
    activeDayStreak: 0,
    homeSpotH3: null,
  };
}

/** Ce qu'une course apporte aux stats (extrait du pipeline ingest_run). */
export interface BadgeRunInput {
  /** Seules 'valid' et 'partial' comptent (course valide, AMENDEMENT-02 §4). */
  status: RunStatus;
  /**
   * Départ ISO 8601. L'heure LOCALE est lue TEXTUELLEMENT (cf. localClock) :
   * le client doit envoyer l'offset local (`…T22:14:00+02:00`).
   */
  startedAt: string;
  distanceM: number;
  durationS: number;
  /** Allure moyenne s/km (0 si inconnue). */
  avgPaceSKm: number;
  /** Totaux décidés par decideClaims pour CETTE course. */
  hexes: { claimed: number; stolen: number; defended: number; pioneer: number };
  /** Premier/dernier point de la trace (forme : boucle, ligne droite, spot). */
  startPoint?: { lat: number; lng: number } | null;
  endPoint?: { lat: number; lng: number } | null;
  /** Taille du crew actif au moment de la course (0 = sans crew, §3). */
  crewSize: number;
  /** true si la course a lieu pendant la Saison 0. */
  duringSeasonZero: boolean;
  /** true si la course capture en zone pionnière/sauvage (badge Explorateur). */
  inPioneerZone?: boolean;
}

/**
 * Horloge LOCALE du départ, lue TEXTUELLEMENT dans l'ISO 8601 : si le client
 * envoie un offset local (`2026-07-03T22:14:00+02:00`), les champs du texte
 * SONT l'heure locale — aucune conversion. Un ISO en Z (UTC) est pris tel quel :
 * approximation MVP documentée (France = UTC+1/+2), le client doit envoyer l'offset.
 */
export function localClock(startedAt: string): { date: string; minutes: number } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(startedAt);
  if (!m) return null;
  return { date: m[1]!, minutes: Number(m[2]) * 60 + Number(m[3]) };
}

const dayMs = (date: string): number => new Date(`${date}T00:00:00Z`).getTime();
const isNextDay = (prev: string, cur: string): boolean => dayMs(cur) - dayMs(prev) === MS_PER_DAY;

/**
 * Applique une course aux stats vie entière (PUR — retourne une copie, ne mute
 * jamais `stats`). Une course non valide (rejected/flagged) ne change rien.
 * Hypothèse MVP : les courses arrivent dans l'ordre chronologique (une course
 * antidatée fausserait jours actifs/streaks, pas les cumuls).
 */
export function applyRunToStats(stats: LifetimeStats, run: BadgeRunInput): LifetimeStats {
  if (run.status !== 'valid' && run.status !== 'partial') return stats;

  const s: LifetimeStats = { ...stats };

  // ── Volumes ──
  s.runsValid += 1;
  s.totalDistanceM += run.distanceM;
  s.bestRunDistanceM = Math.max(s.bestRunDistanceM, run.distanceM);
  if (run.avgPaceSKm > 0) {
    s.bestAvgPaceSKm = s.bestAvgPaceSKm === 0
      ? run.avgPaceSKm
      : Math.min(s.bestAvgPaceSKm, run.avgPaceSKm);
    // Sprinter : course valide (donc ≥ RUN_MIN_DISTANCE_M = 1 km, §3.2) sous 4:00/km strict.
    if (run.avgPaceSKm < SPRINTER_MAX_AVG_PACE_S_KM) s.sprintRuns += 1;
  }

  // ── Territoire (« capturés » = neutres + volés, §3) ──
  const captured = run.hexes.claimed + run.hexes.stolen;
  s.hexesCaptured += captured;
  s.steals += run.hexes.stolen;
  s.defends += run.hexes.defended;
  s.pioneerHexes += run.hexes.pioneer;
  s.maxHexesInRun = Math.max(s.maxHexesInRun, captured);

  // ── Crew / solo (§3 : solo = aucun crew ; contribution = ≥ 1 hex claimé en crew) ──
  if (run.crewSize >= 1) {
    // Proxy MVP de l'adhésion : courir avec un crew actif ⇒ a rejoint un crew.
    s.crewsJoined = Math.max(s.crewsJoined, 1);
    s.maxCrewSize = Math.max(s.maxCrewSize, run.crewSize);
    if (captured >= 1) s.crewContributions += 1;
  } else {
    s.soloRuns += 1;
  }

  // ── Saison 0 ──
  if (run.duringSeasonZero) {
    s.seasonZeroRuns += 1;
    s.seasonZeroHexes += captured;
  }

  // ── Zone pionnière/sauvage (badge Explorateur, AMENDEMENT-04) ──
  if (run.inPioneerZone === true && captured >= 1) s.pioneerZoneRuns += 1;

  // ── Horloge locale : jours actifs, plages horaires, 1ᵉʳ janvier ──
  const clock = localClock(run.startedAt);
  if (clock) {
    if (clock.minutes >= NIGHT_START_MIN || clock.minutes <= NIGHT_END_MIN) s.nightRuns += 1;
    if (clock.minutes >= DAWN_START_MIN && clock.minutes < DAWN_END_MIN) s.dawnRuns += 1;
    if (clock.minutes >= WOLF_HOUR_START_MIN && clock.minutes < WOLF_HOUR_END_MIN) {
      s.wolfHourRuns += 1;
    }
    if (clock.date.slice(5) === NEW_YEAR_MONTH_DAY) s.newYearRuns += 1;

    // Jours actifs DISTINCTS (§3) + streak de jours consécutifs.
    if (clock.date === s.lastActiveDay) {
      s.runsOnLastActiveDay += 1;
    } else {
      s.activeDays += 1;
      s.activeDayStreak = s.lastActiveDay !== null && isNextDay(s.lastActiveDay, clock.date)
        ? s.activeDayStreak + 1
        : 1;
      s.lastActiveDay = clock.date;
      s.runsOnLastActiveDay = 1;
    }
    s.maxRunsInOneDay = Math.max(s.maxRunsInOneDay, s.runsOnLastActiveDay);
    s.bestActiveDayStreak = Math.max(s.bestActiveDayStreak, s.activeDayStreak);
  }

  // ── Forme de trace : « La Boucle » / « Ligne Droite » ──
  if (run.startPoint && run.endPoint && run.distanceM > 0) {
    const closeM = haversineM(run.startPoint, run.endPoint);
    if (closeM <= LOOP_MAX_CLOSE_M) s.loopRuns += 1;
    if (run.distanceM >= STRAIGHT_MIN_DISTANCE_M && closeM >= run.distanceM * STRAIGHT_MIN_RATIO) {
      s.straightRuns += 1;
    }
  }

  // ── « Dix Pile » : 10,00 km ± 1 % ──
  if (Math.abs(run.distanceM - EXACT_TEN_TARGET_M) <= EXACT_TEN_TARGET_M * EXACT_TEN_TOLERANCE) {
    s.exactTenRuns += 1;
  }

  // ── « Fidèle au Poste » : départs dans la même cellule H3 res 9 ──
  if (run.startPoint) {
    const cell = latLngToCell(run.startPoint.lat, run.startPoint.lng, HOME_SPOT_H3_RESOLUTION);
    if (s.homeSpotH3 === null) {
      s.homeSpotH3 = cell;
      s.homeSpotRuns = 1;
    } else if (cell === s.homeSpotH3) {
      s.homeSpotRuns += 1;
    }
  }

  return s;
}

/**
 * Badges NOUVELLEMENT décernés : seuil atteint dans `after`, jamais gagné
 * (alreadyEarned), jamais un dormant (§4). Les badges franchis PENDANT cette
 * course (before sous le seuil) sortent en premier ; suivent les rattrapages
 * (seuil déjà atteint mais jamais persisté — auto-réparation).
 */
export function evaluateBadges(
  before: LifetimeStats,
  after: LifetimeStats,
  alreadyEarned: ReadonlySet<string>,
): string[] {
  const crossed: string[] = [];
  const catchUp: string[] = [];
  for (const def of BADGES) {
    if (def.dormant !== undefined) continue; // jamais décerné en l'état (§4)
    if (alreadyEarned.has(def.key)) continue; // jamais ré-attribué
    if (after[def.metric] < def.threshold) continue;
    (before[def.metric] < def.threshold ? crossed : catchUp).push(def.key);
  }
  return [...crossed, ...catchUp];
}
