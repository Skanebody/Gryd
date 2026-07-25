/**
 * GRYD — tracker de course réelle (AMENDEMENT-15 §2). Machine d'états
 * idle → tracking ⇄ paused-auto/paused-user → finished.
 *
 * Ce fichier ne porte plus que L'ÉTAT MUTABLE et les abonnements capteur : la
 * DÉCISION (nettoyage, distance, pauses, zones estimées, payload) vit dans
 * `runPipeline.ts`, PUR et testé sous Deno. La séparation n'est pas cosmétique :
 * le tracker importe `expo-sensors`, donc rien de ce qu'il calculait lui-même
 * n'était atteignable par le filet de tests — et c'est exactement là que le
 * défaut E14 s'était logé (`cleanTrace(this.fixes)` sans discipline, bornes de
 * la course appliquées à une sortie vélo, cf. l'en-tête de `runPipeline.ts`).
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
 * hook, guardé isAvailableAsync, no-op web/simulateur.
 */
// expo-sensors : stack Expo — stepCount alimente motionTrust anti-triche §3.2.
import { Pedometer } from 'expo-sensors';
import { type Activity, type IngestRunRequest, type RunMode } from '@klaim/shared';
import type { RawFix } from './engine/gps';
import {
  buildIngestPayload,
  computeSnapshot,
  type RunPipelineState,
  type TrackerSnapshot,
} from './runPipeline';

// Les types de la photo instantanée VIVENT dans le module pur ; on les
// ré-exporte ici parce que tout l'écran de course les importe depuis `tracker`.
export type { TrackerPhase, TrackerSnapshot } from './runPipeline';

export interface TrackerInit {
  runId: string;
  mode: RunMode;
  /**
   * DISCIPLINE de la sortie (E14) — DÉCLARÉE au départ, jamais devinée en cours
   * de route. Elle change les BORNES anti-triche du nettoyage client ET celles
   * que le serveur appliquera (`IngestRunRequest.activity`) : à 30 km/h, une
   * trace est de la triche en `run` et une sortie normale en `bike`.
   *
   * OBLIGATOIRE depuis le 25/07/2026. Le champ était optionnel et le
   * constructeur résolvait l'absence par un `?? DEFAULT_ACTIVITY` — un défaut
   * SILENCIEUX, exactement le genre de résolution invisible qui a permis à la
   * discipline de se faire deviner ailleurs (la préférence d'affichage de la
   * carte, cf. `runActivity.ts`). Aucun tracker ne se construit plus sans que
   * son appelant ait écrit noir sur blanc ce qui est enregistré.
   */
  activity: Activity;
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
  /** Discipline de CETTE sortie — figée au départ (jamais rebasculée en course). */
  readonly activity: Activity;
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
    // Aucune résolution ici : la discipline est DÉCLARÉE par l'appelant (le
    // compilateur l'exige) — plus aucun `??` ne peut la fabriquer en silence.
    this.activity = init.activity;
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

  // ─── Décision : déléguée au module PUR `runPipeline.ts` ───────────────────
  // Le tracker ne calcule plus rien lui-même. Il expose son ÉTAT (dont la
  // DISCIPLINE, obligatoire côté pur) et laisse le module testé décider.

  /** État courant, tel que le module pur l'attend. */
  private state(): RunPipelineState {
    return {
      fixes: this.fixes,
      activity: this.activity,
      mode: this.mode,
      startedAt: this.startedAt,
      userPausedMs: this.userPausedMsTotal,
      userPausedSinceTs: this.userPaused ? this.userPauseStartedTs : null,
      finished: this.finished,
    };
  }

  /** Photo instantanée pour l'UI (distance live, chrono, trace, signal…). */
  snapshot(nowTs: number): TrackerSnapshot {
    return computeSnapshot(this.state(), nowTs);
  }

  /**
   * Payload RÉEL pour ingest_run — trace nettoyée AUX BORNES DE LA DISCIPLINE
   * et discipline DÉCLARÉE au serveur (cf. `buildIngestPayload`). Idempotent
   * par clientRunId (UUID local généré AVANT la course).
   */
  buildPayload(): IngestRunRequest {
    return buildIngestPayload(this.state(), {
      clientRunId: this.runId,
      stepCount: this.stepCount,
    });
  }
}
