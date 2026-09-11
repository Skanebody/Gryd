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
import { type Activity, DISCIPLINE_STEP_BUCKET_S, type IngestRunRequest, type RunMode } from '@klaim/shared';
import type { RawFix } from './engine/gps';
import {
  buildIngestPayload,
  computeSnapshot,
  type DisciplineChoice2026,
  runDisciplineVerdict2026,
  type RunPipelineState,
  type TrackerSnapshot,
} from './runPipeline';
import type { DisciplineVerdict2026 } from './engine/disciplineCheck2026';
import { canMarkLap, type StepSample } from './liveMetrics2026';
import {
  addStepSample2026,
  openStepWindows2026,
  sealStepWindows2026,
  type StepWindowState2026,
} from '../motionIntegrity';

// Les types de la photo instantanée VIVENT dans le module pur ; on les
// ré-exporte ici parce que tout l'écran de course les importe depuis `tracker`.
export type { TrackerPhase, TrackerSnapshot } from './runPipeline';
// Le CHOIX de discipline voyage du tracker à l'écran de fin et retour : il est
// ré-exporté ici pour la même raison que la photo instantanée.
export type { DisciplineChoice2026 } from './runPipeline';

/**
 * Nombre d'échantillons de podomètre gardés en mémoire (LOT R). La cadence ne
 * regarde que `LIVE_CADENCE_WINDOW_S` ; au-delà, garder plus n'apporte rien et
 * ferait grossir un tableau pendant trois heures. 240 couvre très largement la
 * fenêtre, même sur un capteur bavard. Ce n'est PAS une constante de jeu (elle
 * ne décide d'aucun chiffre affiché) : c'est un plafond mémoire.
 */
const STEP_SAMPLES_MAX = 240;

export interface TrackerInit {
  recordingOwnerId?: string | null;
  recordingSessionId?: string;
  sharedMapParticipation?: boolean;
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
  /**
   * Reprise après kill : TEMPS MORT déjà mesuré (ms) — celui pendant lequel
   * l'app ne tournait pas. Il est retranché du chrono par `computeSnapshot` ;
   * sans lui, une sortie rouverte trois heures après un kill afficherait ces
   * trois heures comme si elles avaient été courues.
   */
  deadMs?: number;
  /** Reprise/fusion : pas déjà comptés par le tracker précédent. */
  initialSteps?: number;
  /**
   * Pause automatique du CHRONO (cahier §8.2) — préférence du joueur pour
   * CETTE discipline, lue au départ. Absente ⇒ le défaut de la discipline.
   */
  autoPause?: boolean;
  /**
   * Reprise après kill / fusion : marques de TOUR déjà posées (LOT R). Sans
   * elles, une sortie rouverte perdrait ses tours alors que sa trace, elle,
   * revient intacte — le résumé de fin ne parlerait plus de la même sortie.
   */
  initialLapMarks?: readonly number[];
}

export class RunTracker {
  readonly recordingOwnerId: string | null | undefined;
  recordingSessionId?: string;
  readonly sharedMapParticipation: boolean;
  readonly runId: string;
  readonly mode: RunMode;
  /** Discipline de CETTE sortie — figée au départ (jamais rebasculée en course). */
  readonly activity: Activity;
  readonly startedAt: number;

  private fixes: RawFix[];
  private finished = false;
  private finishedAt: number | null = null;
  private userPaused = false;
  private breakBeforeNext = false;
  private userPauseStartedTs = 0;
  private userPausedMsTotal: number;
  /** Temps mort cumulé (ms) — hérité d'une reprise, jamais fabriqué ici. */
  private deadMsTotal: number;
  /** Préférence de pause automatique, figée au départ comme la discipline. */
  readonly autoPause: boolean | undefined;
  /** Pas hérités d'un tracker précédent (reprise/fusion). */
  private stepBase: number;
  /** Pas comptés par L'ABONNEMENT courant (cumulés depuis watchStepCount). */
  private stepsSinceWatch = 0;
  private stepSub: { remove(): void } | null = null;
  /**
   * ÉCHANTILLONS HORODATÉS DU PODOMÈTRE (LOT R) — la cadence en vit.
   *
   * `stepCount` seul ne suffit pas : c'est un cumul, il ne dit rien du RYTHME.
   * Une cadence se lit sur une fenêtre, donc sur des relevés datés. On garde le
   * strict nécessaire (`STEP_SAMPLES_MAX`) : une sortie de trois heures ne doit
   * pas faire grossir un tableau sans fin dans la mémoire d'un téléphone qui
   * enregistre déjà une trace.
   */
  private stepSamples: StepSample[] = [];
  /**
   * TRANCHES DE PODOMÈTRE de toute la sortie (12/09/2026), à une entrée par
   * `DISCIPLINE_STEP_BUCKET_S`.
   *
   * ─── POURQUOI CE SECOND TABLEAU EXISTE À CÔTÉ DE `stepSamples` ────────────
   * `stepSamples` est PLAFONNÉ (`STEP_SAMPLES_MAX`) : il sert la cadence LIVE,
   * qui ne regarde que les dernières secondes. Sur une sortie d'une heure, ses
   * premières minutes ont disparu. Le contrôle de fin, lui, oppose une cadence
   * à une fenêtre de cinq minutes qui peut tomber n'importe où — il lui faut
   * TOUTE la sortie. Une tranche par minute coûte 180 entrées pour trois
   * heures ; garder les relevés bruts en coûterait des milliers.
   *
   * `null` tant qu'aucun abonnement n'a tourné : le contrôle se tait alors
   * (`no_steps`), il ne conclut pas « zéro pas ».
   */
  private stepWindows: StepWindowState2026 | null = null;
  /**
   * MARQUES DE TOUR (« lap » d'INTVL) — des horodatages, jamais des mesures.
   * Elles vivent dans le tracker parce qu'elles appartiennent à LA SORTIE : un
   * état d'écran les perdrait au premier remontage (minimiser le suivi, rotation).
   */
  private lapMarksList: number[] = [];
  /**
   * Un abonnement podomètre a-t-il RÉELLEMENT tourné pendant cette sortie ?
   *
   * ─── POURQUOI CE DRAPEAU N'EST PAS `stepSub !== null` ──────────────────────
   * `stepSub` est remis à `null` par `stopPedometer()` — c'est-à-dire À LA FIN
   * DE LA COURSE, juste avant que le payload soit construit. Le lire là
   * répondrait toujours « non », et le zéro d'un vrai podomètre repartirait dans
   * le silence exactement comme avant. Ce drapeau, lui, est POSÉ UNE FOIS et ne
   * redescend jamais : il décrit ce qui a eu lieu, pas ce qui est branché.
   *
   * Il survit aussi à une fusion après reprise (`initialSteps`) : une course
   * rouverte dont le podomètre avait déjà compté ne redevient pas « non mesurée ».
   */
  private stepSensorRan = false;

  constructor(init: TrackerInit) {
    this.recordingOwnerId = init.recordingOwnerId;
    this.recordingSessionId = init.recordingSessionId;
    this.sharedMapParticipation = init.sharedMapParticipation === true;
    this.runId = init.runId;
    this.mode = init.mode;
    // Aucune résolution ici : la discipline est DÉCLARÉE par l'appelant (le
    // compilateur l'exige) — plus aucun `??` ne peut la fabriquer en silence.
    this.activity = init.activity;
    this.startedAt = init.startedAt;
    this.fixes = [...(init.initialFixes ?? [])];
    this.userPausedMsTotal = init.userPausedMs ?? 0;
    this.deadMsTotal = init.deadMs ?? 0;
    this.autoPause = init.autoPause;
    this.stepBase = init.initialSteps ?? 0;
    this.lapMarksList = [...(init.initialLapMarks ?? [])];
    // Un cumul repris d'une session précédente PROUVE qu'un podomètre a tourné.
    this.stepSensorRan = this.stepBase > 0;
  }

  /** Trace brute (persistance runStore, fusion à la reprise). */
  get rawFixes(): readonly RawFix[] {
    return this.fixes;
  }

  /** Cumul des pauses manuelles (ms) — persisté pour la reprise après kill. */
  get userPausedMs(): number {
    return this.userPausedMsTotal;
  }

  /** Temps mort cumulé (ms) — persisté pour survivre à un SECOND kill. */
  get deadMs(): number {
    return this.deadMsTotal;
  }

  /** Pas cumulés de la course. `0` avec `stepSensorActive` vrai EST une mesure. */
  get stepCount(): number {
    return this.stepBase + this.stepsSinceWatch;
  }

  /** Un podomètre a-t-il tourné pendant cette sortie ? (cf. `stepSensorRan`) */
  get stepSensorActive(): boolean {
    return this.stepSensorRan;
  }

  /** Marques de tour posées jusqu'ici (LOT R) — persistées avec la sortie. */
  get lapMarks(): readonly number[] {
    return this.lapMarksList;
  }

  /**
   * Pose une marque de TOUR. Rend `false` quand le geste est refusé — un double
   * appui ou un rebond tactile sous `LIVE_LAP_MIN_DURATION_S`. L'écran s'en sert
   * pour désactiver le bouton PENDANT le plancher plutôt que de le laisser
   * échouer en silence (« aucun bouton mort »).
   */
  markLap(nowTs: number): boolean {
    if (this.finished) return false;
    if (!canMarkLap(this.startedAt, this.lapMarksList, nowTs)) return false;
    this.lapMarksList.push(nowTs);
    return true;
  }

  /**
   * Podomètre (AMENDEMENT-15 §2 « steps si dispo via pedometer ») : démarré par
   * le hook AVEC la course, guardé isAvailableAsync — no-op web/simulateur/
   * permission refusée.
   *
   * DEUX ISSUES, ET ELLES NE SE RESSEMBLENT PLUS (10/09/2026) :
   *  · capteur indisponible → `stepSensorRan` reste FAUX, `buildPayload` OMET
   *    le champ, et le serveur traite le signal comme indisponible (neutre) ;
   *  · capteur disponible → `stepSensorRan` passe à VRAI, et le total part avec
   *    la trace MÊME S'IL VAUT ZÉRO. Un podomètre qui n'a compté aucun pas sur
   *    plusieurs kilomètres est la meilleure preuve qu'un téléphone sache
   *    produire d'un déplacement non pédestre ; elle était jetée.
   */
  async startPedometer(): Promise<void> {
    if (this.finished || this.stepSub !== null) return;
    try {
      if (!(await Pedometer.isAvailableAsync())) return;
      // OUVERT AVANT l'abonnement : le premier relevé peut arriver dans la
      // milliseconde, et il doit trouver un rangement déjà en place. Le cumul
      // courant sert de plancher — après une reprise, il n'est pas nul, et
      // l'ignorer rangerait tout l'historique repris dans la première tranche.
      this.stepWindows = openStepWindows2026(Date.now(), this.stepCount);
      this.stepSub = Pedometer.watchStepCount((result) => {
        // result.steps = cumul depuis CET abonnement (jamais additionné à lui-même).
        this.stepsSinceWatch = Math.max(0, result.steps);
        // LOT R — la CADENCE : le cumul est daté à l'instant où il arrive. Le
        // podomètre n'émet pas à cadence fixe (iOS par paquets, Android au fil
        // des pas), donc la fenêtre se mesure sur ces horodatages, jamais sur
        // une fréquence supposée.
        const at = Date.now();
        this.stepSamples.push({ ts: at, steps: this.stepCount });
        if (this.stepSamples.length > STEP_SAMPLES_MAX) this.stepSamples.shift();
        // Le rangement par tranches, lui, ne se plafonne pas : il compacte.
        if (this.stepWindows !== null) {
          this.stepWindows = addStepSample2026(
            this.stepWindows,
            { ts: at, steps: this.stepCount },
            DISCIPLINE_STEP_BUCKET_S * 1_000,
          );
        }
      });
      // POSÉ APRÈS l'abonnement réussi, et jamais retiré : à partir d'ici, un
      // total de zéro pas est une MESURE, pas une absence de capteur.
      this.stepSensorRan = true;
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
      this.fixes.push(this.breakBeforeNext ? { ...f, breakBefore: true } : f);
      this.breakBeforeNext = false;
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
    this.breakBeforeNext = true;
    this.userPausedMsTotal += Math.max(0, nowTs - this.userPauseStartedTs);
  }

  /** Clôture — le tracker devient inerte (plus aucun fix accepté). */
  finish(nowTs: number): void {
    if (this.finished) return;
    if (this.userPaused) this.resumeUser(nowTs);
    this.finished = true;
    this.finishedAt = nowTs;
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
      deadMs: this.deadMsTotal,
      autoPause: this.autoPause,
      userPausedSinceTs: this.userPaused ? this.userPauseStartedTs : null,
      lapMarks: this.lapMarksList,
      stepSamples: this.stepSamples,
      // ── LES TRANCHES, FERMÉES SUR LE DERNIER RELEVÉ GPS ──────────────────
      // Fermées sur la TRACE et non sur `Date.now()` : `state()` doit rester
      // sans horloge pour que le module pur soit rejouable à l'identique. Le
      // contrôle ne regarde de toute façon que des fenêtres qui tombent dans la
      // trace — au-delà du dernier relevé, il n'y a rien à couvrir.
      ...(this.stepWindows === null ? {} : {
        stepWindows: sealStepWindows2026(
          this.stepWindows,
          this.fixes[this.fixes.length - 1]?.ts ?? this.stepWindows.openedAt,
          DISCIPLINE_STEP_BUCKET_S * 1_000,
        ),
      }),
      finished: this.finished,
    };
  }

  /** Photo instantanée pour l'UI (distance live, chrono, trace, signal…). */
  snapshot(nowTs: number): TrackerSnapshot {
    return computeSnapshot(this.state(), this.finishedAt ?? nowTs);
  }

  /**
   * « La trace raconte-t-elle une autre discipline que celle déclarée ? »
   *
   * Lecture PURE, sans effet : le tracker ne bascule rien tout seul. C'est
   * l'écran de fin qui pose la question au joueur, avec ces chiffres, et le
   * joueur seul qui tranche (décision fondateur du 12/09/2026).
   */
  disciplineVerdict(): DisciplineVerdict2026 {
    return runDisciplineVerdict2026(this.state());
  }

  /**
   * Payload RÉEL pour ingest_run — trace nettoyée AUX BORNES DE LA DISCIPLINE
   * et discipline DÉCLARÉE au serveur (cf. `buildIngestPayload`). Idempotent
   * par clientRunId (UUID local généré AVANT la course).
   *
   * `choice` : ce que le joueur a répondu à « Un problème avec ta sortie ».
   * Absent = aucune question posée. Basculer RE-NETTOIE la trace aux bornes de
   * la nouvelle discipline — sans quoi on enverrait une trace amputée par les
   * bornes de l'ancienne sous une étiquette qui ne l'ampute pas.
   */
  buildPayload(choice?: DisciplineChoice2026): IngestRunRequest {
    return { ...buildIngestPayload(this.state(), {
      clientRunId: this.runId,
      stepCount: this.stepCount,
      stepSensorRan: this.stepSensorRan,
    }, choice), recordingOwnerId: this.recordingOwnerId, recordingSessionId: this.recordingSessionId, sharedMapParticipation: this.sharedMapParticipation };
  }
}
