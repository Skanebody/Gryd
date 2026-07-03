// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/badges.ts

/**
 * GRYD — engine/badges.ts (V2, AMENDEMENT-06 §2)
 * Attribution des badges : stats vie entière + évaluation. Fonctions PURES :
 * aucune I/O, aucune horloge. L'appelant (ingest_run) lit `user_stats` /
 * `user_badges`, appelle applyRunToStats (course valide) OU applyRejectedRun
 * (course rejetée, pour cleanDays) puis evaluateBadges, et persiste. Tous les
 * seuils/bornes viennent de @klaim/shared/badges — AUCUN nombre magique ici.
 *
 * Métriques NON alimentées par une course (jobs sector_control/season_close/
 * offensives/perf V1 : sectorsControlled, bestSectorControlPct, holdDays,
 * clustersProtected, offensivesJoined, sectorsContested, ruralZonesOpened,
 * supplyLines, crewCaptainScore, activeMembersWeek, paceImprovementSKm,
 * formeScore, seasonRank/nationalRank/crewSeasonRank) : mises à jour par leurs
 * pipelines directement dans user_stats — evaluateBadges les ramasse ensuite.
 */
import {
  BADGES,
  COMEBACK_GAP_DAYS,
  DEDUP_DISTANCE_TOLERANCE,
  DEDUP_DURATION_TOLERANCE,
  DEDUP_START_TOLERANCE_MIN,
  EXACT_TEN_TARGET_M,
  EXACT_TEN_TOLERANCE,
  HOME_SPOT_H3_RESOLUTION,
  LOOP_MAX_CLOSE_M,
  NEW_YEAR_MONTH_DAY,
  NIGHT_END_MIN,
  NIGHT_START_MIN,
  ROUTE_MIN_KM,
  SILENT_TAKEOVER_MIN_STEALS,
  STRAIGHT_MIN_DISTANCE_M,
  STRAIGHT_MIN_RATIO,
  VERIFIED_MIN_TRUST,
  WEATHER_HEAT_MIN_C,
  WEATHER_RAIN_MIN_MM_H,
  WEATHER_SNOW_MIN_CM_H,
  WOLF_HOUR_END_MIN,
  WOLF_HOUR_START_MIN,
  type BadgeMetric,
} from '../badges.ts';
import { OUTPOST_MIN_HEXES } from '../game-rules.ts';
import type { RunStatus } from '../types.ts';
import { latLngToCell } from 'npm:h3-js@^4.1';
import { haversineM } from './validation.ts';

// Conversion d'unités — pas une règle de jeu.
const MS_PER_DAY = 86_400_000;

/**
 * Stats vie entière d'un joueur (table `user_stats`, migration 0009).
 * Toutes les métriques badge (Record<BadgeMetric, number>) sont des compteurs/
 * maxima croissants ; s'y ajoutent des champs de suivi internes jamais évalués
 * directement par un badge.
 */
export interface LifetimeStats extends Record<BadgeMetric, number> {
  /** Meilleure (plus basse) allure moyenne d'une course valide, s/km. 0 = aucune. */
  bestAvgPaceSKm: number;
  /** Dernier jour actif LOCAL ('YYYY-MM-DD'), pour jours distincts + streaks + comeback. */
  lastActiveDay: string | null;
  /** Courses validées le dernier jour actif (alimente maxRunsInOneDay). */
  runsOnLastActiveDay: number;
  /** Jours actifs consécutifs en cours (alimente bestActiveDayStreak). */
  activeDayStreak: number;
  /** Cellule H3 res 9 du premier départ (« Fidèle au Poste »). */
  homeSpotH3: string | null;
  /** Semaine ISO active la plus récente ('YYYY-Www'), pour weeksActive. */
  lastActiveWeek: string | null;
  /** Dernier jour LOCAL avec un run rejeté ('YYYY-MM-DD'), pour cleanDays. null = jamais. */
  lastRejectedDay: string | null;
  /** Premier jour actif LOCAL observé ('YYYY-MM-DD') — origine de cleanDays sans rejet. */
  firstActiveDay: string | null;
}

/** Stats vierges (nouveau joueur / ligne user_stats absente). */
export function emptyLifetimeStats(): LifetimeStats {
  return {
    // ── onboarding / simples ──
    runsValid: 0,
    firstShares: 0,
    crewsJoined: 0,
    // ── distance ──
    bestRunDistanceM: 0,
    seasonDistanceM: 0,
    totalDistanceM: 0,
    // ── territoire ──
    hexesCaptured: 0,
    sectorsControlled: 0,
    bestSectorControlPct: 0,
    // ── attaque ──
    steals: 0,
    sectorsContested: 0,
    offensivesJoined: 0,
    // ── défense ──
    defends: 0,
    holdDays: 0,
    clustersProtected: 0,
    // ── exploration ──
    pioneerHexes: 0,
    ruralZonesOpened: 0,
    // ── routes ──
    routes: 0,
    outposts: 0,
    supplyLines: 0,
    // ── crew ──
    crewContributions: 0,
    crewCaptainScore: 0,
    activeMembersWeek: 0,
    // ── performance ──
    paceImprovementSKm: 0,
    weeksActive: 0,
    formeScore: 0,
    // ── verified ──
    verifiedRuns: 0,
    cleanDays: 0,
    // ── saison (jobs) ──
    seasonRank: 0,
    nationalRank: 0,
    crewSeasonRank: 0,
    // ── secrets / héritage ──
    pioneerZoneRuns: 0,
    seasonZeroHexes: 0,
    soloRuns: 0,
    loopRuns: 0,
    exactTenRuns: 0,
    maxRunsInOneDay: 0,
    wolfHourRuns: 0,
    straightRuns: 0,
    maxHexesInRun: 0,
    newYearRuns: 0,
    bestActiveDayStreak: 0,
    homeSpotRuns: 0,
    comebackRuns: 0,
    silentTakeoverRuns: 0,
    noMapRuns: 0,
    // ── suivi interne ──
    bestAvgPaceSKm: 0,
    lastActiveDay: null,
    runsOnLastActiveDay: 0,
    activeDayStreak: 0,
    homeSpotH3: null,
    lastActiveWeek: null,
    lastRejectedDay: null,
    firstActiveDay: null,
  };
}

/** Ce qu'une course apporte aux stats (extrait du pipeline ingest_run). */
export interface BadgeRunInput {
  /** Seules 'valid' et 'partial' comptent (course valide, AMENDEMENT-02 §4). */
  status: RunStatus;
  /** Départ ISO 8601 avec offset local (heure LOCALE lue textuellement). */
  startedAt: string;
  distanceM: number;
  durationS: number;
  /** Allure moyenne s/km (0 si inconnue). */
  avgPaceSKm: number;
  /** Totaux décidés par decideClaims pour CETTE course. */
  hexes: { claimed: number; stolen: number; defended: number; pioneer: number };
  /** Premier/dernier point de la trace. */
  startPoint?: { lat: number; lng: number } | null;
  endPoint?: { lat: number; lng: number } | null;
  /** Taille du crew actif au moment de la course (0 = sans crew, §3). */
  crewSize: number;
  /** true si la course a lieu pendant la Saison 0. */
  duringSeasonZero: boolean;
  /** true si la course capture en zone pionnière/sauvage (héritage Explorateur). */
  inPioneerZone?: boolean;
  /** true si le joueur a partagé le résultat (badge First Share). */
  shared?: boolean;
  /**
   * Confiance mouvement/GPS de la course (motionTrust, 0-100). Si absente
   * (undefined/null), la course compte comme vérifiée SEULEMENT si status
   * 'valid' ET aucun flag (`flagged: false`) — cf. VERIFIED_MIN_TRUST.
   */
  motionTrust?: number | null;
  /** true si la course porte au moins un flag anti-triche non bloquant. */
  flagged?: boolean;
  /**
   * true si TOUS les hexes claimés de cette course sont pionniers (jamais
   * possédés) ET la course a capturé ≥ 1 hex — secret « No Map Run ».
   * Fourni par ingest_run (run.allPioneer).
   */
  allPioneer?: boolean;
  /** Avant-postes / routes ouverts par CETTE course (détection V0 ingest_run). */
  newOutposts?: number;
  newRoutes?: number;
}

/**
 * Horloge LOCALE du départ, lue TEXTUELLEMENT dans l'ISO 8601. Un ISO en Z est
 * pris tel quel (approximation MVP, France = UTC+1/+2).
 */
export function localClock(startedAt: string): { date: string; minutes: number } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(startedAt);
  if (!m) return null;
  return { date: m[1]!, minutes: Number(m[2]) * 60 + Number(m[3]) };
}

const dayMs = (date: string): number => new Date(`${date}T00:00:00Z`).getTime();
const isNextDay = (prev: string, cur: string): boolean => dayMs(cur) - dayMs(prev) === MS_PER_DAY;
const gapDays = (prev: string, cur: string): number =>
  Math.round((dayMs(cur) - dayMs(prev)) / MS_PER_DAY);

/**
 * Clé de SEMAINE ISO-8601 ('YYYY-Www') d'une date locale 'YYYY-MM-DD'. La
 * semaine ISO commence le lundi ; la semaine 1 est celle du premier jeudi.
 * PURE, sans dépendance : calcul standard sur le jeudi de la semaine.
 */
export function isoWeek(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // lundi=0 … dimanche=6
  d.setUTCDate(d.getUTCDate() - day + 3); // jeudi de la semaine ISO
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const ft = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ft + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Une course est-elle vérifiée (metric verifiedRuns) ? Si motionTrust fourni :
 * `>= VERIFIED_MIN_TRUST`. Si absent : vérifiée SEULEMENT si status 'valid' ET
 * non flaggée (documenté : sans signal de confiance, on n'accorde le vérifié
 * qu'à une course pleinement valide et propre — 'partial' ne suffit pas).
 */
function isVerifiedRun(run: BadgeRunInput): boolean {
  if (run.motionTrust !== undefined && run.motionTrust !== null) {
    return run.motionTrust >= VERIFIED_MIN_TRUST;
  }
  return run.status === 'valid' && run.flagged !== true;
}

/**
 * Applique une course aux stats vie entière (PUR — retourne une copie).
 * Une course non valide (rejected/flagged) ne change rien ICI : les rejets
 * passent par applyRejectedRun (cleanDays). Hypothèse MVP : courses en ordre
 * chronologique.
 */
export function applyRunToStats(stats: LifetimeStats, run: BadgeRunInput): LifetimeStats {
  if (run.status !== 'valid' && run.status !== 'partial') return stats;

  const s: LifetimeStats = { ...stats };

  // ── Volumes / distance ──
  s.runsValid += 1;
  s.totalDistanceM += run.distanceM;
  s.seasonDistanceM += run.distanceM;
  s.bestRunDistanceM = Math.max(s.bestRunDistanceM, run.distanceM);
  if (run.avgPaceSKm > 0) {
    s.bestAvgPaceSKm = s.bestAvgPaceSKm === 0
      ? run.avgPaceSKm
      : Math.min(s.bestAvgPaceSKm, run.avgPaceSKm);
  }

  // ── Vérification (GRYD Verified) ──
  if (isVerifiedRun(run)) s.verifiedRuns += 1;

  // ── Partage (First Share) ──
  if (run.shared === true) s.firstShares += 1;

  // ── Territoire (« capturés » = neutres + volés, §3) ──
  const captured = run.hexes.claimed + run.hexes.stolen;
  s.hexesCaptured += captured;
  s.steals += run.hexes.stolen;
  s.defends += run.hexes.defended;
  s.pioneerHexes += run.hexes.pioneer;
  s.maxHexesInRun = Math.max(s.maxHexesInRun, captured);

  // ── Crew / solo (§3) ──
  if (run.crewSize >= 1) {
    s.crewsJoined = Math.max(s.crewsJoined, 1);
    if (captured >= 1) s.crewContributions += 1;
  } else {
    s.soloRuns += 1;
  }

  // ── Saison 0 (héritage Fondateur/Saison 0) ──
  if (run.duringSeasonZero) s.seasonZeroHexes += captured;

  // ── Zone pionnière/sauvage (héritage Explorateur) ──
  if (run.inPioneerZone === true && captured >= 1) s.pioneerZoneRuns += 1;

  // ── Avant-postes / routes fondés par CETTE course (détection V0) ──
  s.outposts += run.newOutposts ?? 0;
  s.routes += run.newRoutes ?? 0;

  // ── Horloge locale : jours actifs, plages horaires, 1ᵉʳ janvier, comeback, semaines ISO ──
  const clock = localClock(run.startedAt);
  let nightRun = false;
  if (clock) {
    if (clock.minutes >= NIGHT_START_MIN || clock.minutes <= NIGHT_END_MIN) nightRun = true;
    if (clock.minutes >= WOLF_HOUR_START_MIN && clock.minutes < WOLF_HOUR_END_MIN) {
      s.wolfHourRuns += 1;
    }
    if (clock.date.slice(5) === NEW_YEAR_MONTH_DAY) s.newYearRuns += 1;

    // Comeback : trou d'au moins 30 j depuis le dernier jour actif.
    if (s.lastActiveDay !== null && gapDays(s.lastActiveDay, clock.date) >= COMEBACK_GAP_DAYS) {
      s.comebackRuns += 1;
    }

    // Premier jour actif observé (origine de cleanDays sans rejet).
    if (s.firstActiveDay === null) s.firstActiveDay = clock.date;

    // Jours actifs DISTINCTS + streak.
    if (clock.date === s.lastActiveDay) {
      s.runsOnLastActiveDay += 1;
    } else {
      s.activeDayStreak = s.lastActiveDay !== null && isNextDay(s.lastActiveDay, clock.date)
        ? s.activeDayStreak + 1
        : 1;
      s.lastActiveDay = clock.date;
      s.runsOnLastActiveDay = 1;
    }
    s.maxRunsInOneDay = Math.max(s.maxRunsInOneDay, s.runsOnLastActiveDay);
    s.bestActiveDayStreak = Math.max(s.bestActiveDayStreak, s.activeDayStreak);

    // Semaines ISO actives DISTINCTES (Consistency).
    const week = isoWeek(clock.date);
    if (week !== s.lastActiveWeek) {
      s.weeksActive += 1;
      s.lastActiveWeek = week;
    }

    // cleanDays : jours propres écoulés depuis le dernier rejet, ou depuis le
    // premier jour actif si aucun rejet. Max monotone (le compteur ne redescend
    // qu'au prochain rejet, via applyRejectedRun).
    const cleanOrigin = s.lastRejectedDay ?? s.firstActiveDay;
    if (cleanOrigin !== null) {
      s.cleanDays = Math.max(s.cleanDays, gapDays(cleanOrigin, clock.date));
    }
  }

  // ── Silent Takeover : ≥ 50 volés ET départ nocturne ──
  if (nightRun && run.hexes.stolen >= SILENT_TAKEOVER_MIN_STEALS) s.silentTakeoverRuns += 1;

  // ── No Map Run : course valide 100 % pionnière (fourni par ingest) ──
  if (run.allPioneer === true) s.noMapRuns += 1;

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
 * Enregistre un jour LOCAL avec run rejeté (Clean Runner). PUR. Appelé par
 * ingest_run pour CHAQUE course rejetée (applyRunToStats ignore les rejets).
 * Remet le compteur cleanDays à 0 et mémorise le jour du rejet.
 */
export function applyRejectedRun(stats: LifetimeStats, dateISO: string): LifetimeStats {
  const clock = localClock(dateISO);
  if (!clock) return stats;
  return { ...stats, lastRejectedDay: clock.date, cleanDays: 0 };
}

/**
 * Badges NOUVELLEMENT décernés : seuil atteint dans `after`, jamais gagné.
 * Le moteur décerne TOUS les niveaux franchis d'un coup. Les franchis PENDANT
 * cette course (before sous le seuil) sortent en premier ; suivent les
 * rattrapages (seuil déjà atteint mais jamais persisté).
 */
export function evaluateBadges(
  before: LifetimeStats,
  after: LifetimeStats,
  alreadyEarned: ReadonlySet<string>,
): string[] {
  const crossed: string[] = [];
  const catchUp: string[] = [];
  for (const def of BADGES) {
    if (alreadyEarned.has(def.key)) continue;
    if (after[def.metric] < def.threshold) continue;
    (before[def.metric] < def.threshold ? crossed : catchUp).push(def.key);
  }
  return [...crossed, ...catchUp];
}

// ─── Déduplication d'activité (AMENDEMENT-06 §4, Activity Hub) ────────────────

/** Activité candidate à la dédup (course entrante ou activité importée). */
export interface DedupActivity {
  startedAt: string;
  durationS: number;
  distanceM: number;
  /** sha-256 des points arrondis (res ~6 déc.). Vide/absent si trace absente. */
  polylineHash?: string | null;
}

/**
 * Deux activités du MÊME user sont-elles un doublon (AMENDEMENT-06 §4) ?
 * DUPLICATE ssi :
 *  - polyline_hash identiques (non vides) — court-circuit fort ; OU
 *  - départ à ± DEDUP_START_TOLERANCE_MIN (borne INCLUSE) ET durée à
 *    ± DEDUP_DURATION_TOLERANCE ET distance à ± DEDUP_DISTANCE_TOLERANCE
 *    (bornes relatives INCLUSES).
 * PURE. Le hash et l'appariement candidat sont fournis par ingest_run.
 */
export function dedupeActivity(a: DedupActivity, b: DedupActivity): boolean {
  if (a.polylineHash && b.polylineHash && a.polylineHash === b.polylineHash) return true;

  const startDeltaMin = Math.abs(Date.parse(a.startedAt) - Date.parse(b.startedAt)) / 60_000;
  if (startDeltaMin > DEDUP_START_TOLERANCE_MIN) return false;

  const within = (x: number, y: number, tol: number): boolean => {
    const ref = Math.max(Math.abs(x), Math.abs(y));
    if (ref === 0) return true; // deux valeurs nulles = identiques
    return Math.abs(x - y) <= ref * tol;
  };
  return (
    within(a.durationS, b.durationS, DEDUP_DURATION_TOLERANCE) &&
    within(a.distanceM, b.distanceM, DEDUP_DISTANCE_TOLERANCE)
  );
}

// ─── Décisions PURES des mécaniques conservées (consommées par ingest_run) ────

/** Mesures de l'heure LOCALE du départ (Open-Meteo hourly, unités natives). */
export interface WeatherHour {
  tempC: number;
  precipMmH: number;
  snowCmH: number;
}

/** Décision de seuil météo (héritage) — seuils INCLUS. PURE. */
export function weatherFlags(
  hour: WeatherHour,
): { rain: boolean; snow: boolean; heat: boolean } {
  return {
    rain: hour.precipMmH >= WEATHER_RAIN_MIN_MM_H,
    snow: hour.snowCmH >= WEATHER_SNOW_MIN_CM_H,
    heat: hour.tempC >= WEATHER_HEAT_MIN_C,
  };
}

/** Fondation d'un avant-poste V0 (Outpost Builder). PURE. */
export function shouldCreateOutpost(ownedNearby: number, existingNearby: number): boolean {
  return ownedNearby >= OUTPOST_MIN_HEXES && existingNearby === 0;
}

/** Ouverture d'une route V0 (Route Opened). PURE. */
export function shouldOpenRoute(
  startOwned: boolean,
  endOwned: boolean,
  distanceKm: number,
  existing: boolean,
): boolean {
  return startOwned && endOwned && distanceKm >= ROUTE_MIN_KM && !existing;
}

/** Fenêtre d'événement (héritage) : bornes INCLUSES. MIROIR SQL. PURE. */
export function inEventWindow(
  startedAt: string,
  event: { startsAt: string; endsAt: string },
): boolean {
  const t = Date.parse(startedAt);
  return Date.parse(event.startsAt) <= t && t <= Date.parse(event.endsAt);
}
