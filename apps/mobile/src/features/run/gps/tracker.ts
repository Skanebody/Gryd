/**
 * GRYD — tracker de course réelle (AMENDEMENT-15 §2). Machine d'états
 * idle → tracking ⇄ paused-auto/paused-user → finished, branchée sur le
 * pipeline PUR de engine/gps.ts (copie générée — source unique client/serveur) :
 *   cleanTrace → smoothTrace → detectPauses → totalDistanceM (affichage live)
 *   + gpsTrustScore (jauge) + signalState (états honnêtes ok/weak/lost)
 *   → decimateForPayload → rawFixesToRunPoints (IngestRunRequest, fin de course).
 *
 * Le client PRÉ-FILTRE pour l'affichage ; le serveur (ingest_run §3.2) reste
 * SEUL juge du claim. Les « zones estimées » sont un comptage local de cellules
 * H3 traversées — toujours étiquetées estimées, jamais une attribution.
 *
 * Pause MANUELLE : le chrono gèle et les fixes entrants sont IGNORÉS (le trou
 * temporel > GPS_SIGNAL_LOST_AFTER_S devient une discontinuité gapBefore côté
 * moteur : jamais de faux mètres à la reprise). Pause AUTO (feu rouge) :
 * détectée par detectPauses, distance et chrono actifs exclus, anti-shame
 * (« En pause » informatif, jamais une alerte).
 *
 * I/O quasi nulle : le hook useRealRun pousse les fixes GPS et persiste via
 * runStore. Seule exception ASSUMÉE (AMENDEMENT-15 §2 « steps si dispo ») : le
 * podomètre (startPedometer/stopPedometer, expo-sensors) — opt-in explicite du
 * hook, guardé isAvailableAsync, no-op web/simulateur : le reste du pipeline
 * demeure testable à sec sans capteur.
 */
import { latLngToCell } from 'h3-js';
// expo-sensors : stack Expo — stepCount alimente motionTrust anti-triche §3.2.
import { Pedometer } from 'expo-sensors';
import {
  GPS_ACCURACY_MAX_M,
  GPS_SIGNAL_LOST_AFTER_S,
  H3_RESOLUTION,
  type IngestRunRequest,
  type RunMode,
} from '@klaim/shared';
import {
  cleanTrace,
  decimateForPayload,
  detectPauses,
  gpsTrustScore,
  rawFixesToRunPoints,
  signalState,
  smoothTrace,
  totalDistanceM,
  type CleanFix,
  type GpsSignalState,
  type PauseInterval,
  type RawFix,
} from './engine/gps';

const MS_PER_S = 1_000;

/** États de la course réelle (AMENDEMENT-15 §2). */
export type TrackerPhase = 'idle' | 'tracking' | 'paused-auto' | 'paused-user' | 'finished';

/** Photo instantanée consommée par l'UI (recalculée ~1 Hz). */
export interface TrackerSnapshot {
  phase: TrackerPhase;
  /** Distance nette (m) — hors pauses, hors trous de signal, trace lissée. */
  distanceM: number;
  /** Temps ACTIF (s) : chrono gelé pendant les pauses manuelle et auto. */
  activeS: number;
  /** Allure moyenne active (s/km) — 0 tant que la distance est nulle. */
  paceSPerKm: number;
  /** GPS Trust 0-100 (jauge existante — envoyé au serveur via buildPayload). */
  gpsTrust: number;
  /** État du signal (ok/weak/lost) sur le DERNIER fix brut reçu. */
  signal: GpsSignalState;
  /** Zones H3 res 10 traversées, ESTIMATION locale (le serveur décide). */
  zonesEstimated: number;
  /** Points gardés par le moteur (trace affichable). */
  keptPoints: number;
  /** Fixes bruts reçus depuis le départ. */
  totalFixes: number;
  /**
   * Des fixes ARRIVENT mais aucun n'est exploitable (accuracy > max) :
   * signature de la « position approximative » iOS 14+/Android coarse →
   * bandeau « Active la position exacte ».
   */
  approxLocationSuspected: boolean;
}

export interface TrackerInit {
  runId: string;
  mode: RunMode;
  /** Départ epoch ms. */
  startedAt: number;
  /** Reprise après kill : trace brute restaurée (runStore). */
  initialFixes?: readonly RawFix[];
  /** Reprise après kill : pauses manuelles déjà écoulées (ms). */
  userPausedMs?: number;
  /** Reprise/fusion : pas déjà comptés par le tracker précédent. */
  initialSteps?: number;
}

export class RunTracker {
  readonly runId: string;
  readonly mode: RunMode;
  readonly startedAt: number;

  private fixes: RawFix[];
  private finished = false;
  private userPaused = false;
  private userPauseStartedTs = 0;
  private userPausedMsTotal: number;
  /** Pas hérités d'un tracker précédent (reprise/fusion). */
  private stepBase: number;
  /** Pas comptés par L'ABONNEMENT courant (cumulés depuis watchStepCount). */
  private stepsSinceWatch = 0;
  private stepSub: { remove(): void } | null = null;

  constructor(init: TrackerInit) {
    this.runId = init.runId;
    this.mode = init.mode;
    this.startedAt = init.startedAt;
    this.fixes = [...(init.initialFixes ?? [])];
    this.userPausedMsTotal = init.userPausedMs ?? 0;
    this.stepBase = init.initialSteps ?? 0;
  }

  /** Trace brute (persistance runStore, fusion à la reprise). */
  get rawFixes(): readonly RawFix[] {
    return this.fixes;
  }

  /** Cumul des pauses manuelles (ms) — persisté pour la reprise après kill. */
  get userPausedMs(): number {
    return this.userPausedMsTotal;
  }

  /** Pas cumulés de la course (0 = podomètre indisponible/jamais démarré). */
  get stepCount(): number {
    return this.stepBase + this.stepsSinceWatch;
  }

  /**
   * Podomètre (AMENDEMENT-15 §2 « steps si dispo via pedometer ») : démarré par
   * le hook AVEC la course, guardé isAvailableAsync — no-op web/simulateur/
   * permission refusée. Indisponible → stepCount reste 0 et buildPayload OMET
   * le champ (comportement serveur inchangé : motionTrust neutre §3.2).
   */
  async startPedometer(): Promise<void> {
    if (this.finished || this.stepSub !== null) return;
    try {
      if (!(await Pedometer.isAvailableAsync())) return;
      this.stepSub = Pedometer.watchStepCount((result) => {
        // result.steps = cumul depuis CET abonnement (jamais additionné à lui-même).
        this.stepsSinceWatch = Math.max(0, result.steps);
      });
    } catch {
      // Capteur absent/refusé : signal simplement absent, jamais bloquant.
    }
  }

  /** Coupe l'abonnement podomètre (fin de course, unmount) — cumul conservé. */
  stopPedometer(): void {
    this.stepSub?.remove();
    this.stepSub = null;
  }

  /**
   * Ajoute des fixes capteur. Ignorés si terminé ou en pause MANUELLE (chrono
   * gelé — le moteur marquera la discontinuité à la reprise). Les timestamps
   * non croissants sont écartés ICI (double source watch/tâche background) :
   * un doublon ne doit jamais compter comme outlier dans la jauge de confiance.
   */
  addFixes(incoming: readonly RawFix[]): void {
    if (this.finished || this.userPaused) return;
    for (const f of incoming) {
      const last = this.fixes[this.fixes.length - 1];
      if (last !== undefined && f.ts <= last.ts) continue;
      this.fixes.push(f);
    }
  }

  /** Pause manuelle (bouton) — fige le chrono, ignore les fixes. */
  pauseUser(nowTs: number): void {
    if (this.finished || this.userPaused) return;
    this.userPaused = true;
    this.userPauseStartedTs = nowTs;
  }

  /** Reprise manuelle. */
  resumeUser(nowTs: number): void {
    if (!this.userPaused) return;
    this.userPaused = false;
    this.userPausedMsTotal += Math.max(0, nowTs - this.userPauseStartedTs);
  }

  /** Clôture — le tracker devient inerte (plus aucun fix accepté). */
  finish(nowTs: number): void {
    if (this.userPaused) this.resumeUser(nowTs);
    this.finished = true;
    this.stopPedometer();
  }

  // ─── Pipeline (recalculé à la demande — O(n), quelques ms à 2 h de course) ─

  private pipeline(): {
    smoothed: CleanFix[];
    pauses: PauseInterval[];
    trust: number;
    keptPoints: number;
    totalFixes: number;
    accuracyRejects: number;
  } {
    const clean = cleanTrace(this.fixes);
    const smoothed = smoothTrace(clean.points);
    const pauses = detectPauses(smoothed);
    return {
      smoothed,
      pauses,
      trust: gpsTrustScore(clean),
      keptPoints: clean.points.length,
      totalFixes: clean.totalFixes,
      accuracyRejects: clean.rejected.accuracy,
    };
  }

  /** Photo instantanée pour l'UI. */
  snapshot(nowTs: number): TrackerSnapshot {
    const { smoothed, pauses, trust, keptPoints, totalFixes, accuracyRejects } = this.pipeline();
    const distanceM = totalDistanceM(smoothed, pauses);

    const lastRaw = this.fixes[this.fixes.length - 1] ?? null;
    const signal = signalState(nowTs, lastRaw);

    // Chrono actif : temps écoulé − pauses manuelles (incl. en cours) − pauses auto.
    const userPauseMs =
      this.userPausedMsTotal +
      (this.userPaused ? Math.max(0, nowTs - this.userPauseStartedTs) : 0);
    const autoPauseMs = pauses.reduce((s, p) => s + p.durationS * MS_PER_S, 0);
    const activeS = Math.max(0, (nowTs - this.startedAt - userPauseMs - autoPauseMs) / MS_PER_S);

    // Pause auto EN COURS : le dernier intervalle détecté court jusqu'au
    // dernier point gardé (le coureur est toujours à l'arrêt).
    const lastKept = smoothed[smoothed.length - 1];
    const lastPause = pauses[pauses.length - 1];
    const autoPausedNow =
      lastKept !== undefined && lastPause !== undefined && lastPause.endTs >= lastKept.ts &&
      signal !== 'lost';

    const phase: TrackerPhase = this.finished
      ? 'finished'
      : this.userPaused
        ? 'paused-user'
        : autoPausedNow
          ? 'paused-auto'
          : 'tracking';

    // Zones estimées : cellules H3 uniques de la trace gardée (hors conquête → 0,
    // rien n'est capturé — même règle que la démo, le serveur reste seul juge).
    let zonesEstimated = 0;
    if (this.mode === 'conquete') {
      const cells = new Set<string>();
      for (const p of smoothed) cells.add(latLngToCell(p.lat, p.lng, H3_RESOLUTION));
      zonesEstimated = cells.size;
    }

    const km = distanceM / 1000;
    return {
      phase,
      distanceM,
      activeS,
      paceSPerKm: km > 0 ? activeS / km : 0,
      gpsTrust: trust,
      signal,
      zonesEstimated,
      keptPoints,
      totalFixes,
      // Position approximative : le dernier fix est FRAIS mais inutilisable
      // (accuracy > max) — signature de « Précision exacte » désactivée
      // (iOS 14+) ou d'une permission Android coarse. accuracyRejects garde le
      // diagnostic global (bandeau maintenu tant que rien n'est exploitable).
      approxLocationSuspected:
        lastRaw !== null &&
        nowTs - lastRaw.ts <= GPS_SIGNAL_LOST_AFTER_S * MS_PER_S &&
        lastRaw.accuracy > GPS_ACCURACY_MAX_M &&
        (keptPoints === 0 || accuracyRejects > keptPoints),
    };
  }

  /**
   * Payload RÉEL pour ingest_run : trace nettoyée + lissée + décimée
   * (≤ GPS_MAX_PAYLOAD_POINTS, cordes re-bornées §3.2), accuracies conservées,
   * + GPS Trust calculé sur la trace BRUTE (AMENDEMENT-15 §1 : les compteurs
   * de rejets n'existent que côté client — signal indicatif, le serveur borne
   * et reste seul juge). Idempotent par clientRunId (UUID local généré AVANT
   * la course).
   *
   * ACTÉ (AMENDEMENT-15 §1, vérification 05/07/2026) : le lissage pondéré par
   * accuracy fait PARTIE du nettoyage pré-envoi (pipeline déterministe, testé
   * Deno) — le serveur borne le trust à la baisse et rejuge toute la trace
   * reçue, rien n'est « embelli » à son insu.
   */
  buildPayload(): IngestRunRequest {
    const clean = cleanTrace(this.fixes);
    const smoothed = smoothTrace(clean.points);
    const steps = this.stepCount;
    return {
      clientRunId: this.runId,
      source: 'gps',
      startedAt: new Date(this.startedAt).toISOString(),
      points: rawFixesToRunPoints(decimateForPayload(smoothed)),
      runMode: this.mode,
      gpsTrust: gpsTrustScore(clean),
      // Podomètre indisponible → champ ABSENT (motionTrust neutre côté serveur).
      ...(steps > 0 ? { stepCount: steps } : {}),
    };
  }
}
