/**
 * GRYD — CALCUL d'une sortie en cours, extrait de `RunTracker` (25/07/2026).
 *
 * POURQUOI CE FICHIER EXISTE. Le tracker importe `expo-sensors` (podomètre) :
 * il est donc IMPOSSIBLE à charger sous Deno, et tout ce qu'il calculait
 * échappait au filet de tests. C'est exactement là que le défaut E14 s'est
 * logé : `cleanTrace(this.fixes)` et `decimateForPayload(smoothed)` étaient
 * appelés SANS discipline, donc avec les bornes de la COURSE À PIED (25 km/h,
 * saut 100 m), y compris pour une sortie VÉLO. Sonde du 25/07/2026, cycliste à
 * 30 km/h, 300 fixes à 1 Hz :
 *
 *   cleanTrace(fixes)          → 50 points gardés, 250 rejetés en 'speed'
 *   cleanTrace(fixes, 'bike')  → 300 points gardés, 0 rejet
 *   distance live affichée     → 0 m en 'run' (!), 2 489 m en 'bike' (vraie ≈ 2 492 m)
 *
 * Autrement dit : tout le socle serveur par discipline était court-circuité EN
 * AMONT — la trace arrivait déjà mutilée — et le cycliste lisait « 0,00 km »
 * pendant toute sa sortie. Une distance fausse à l'écran est un mensonge de
 * l'app au sens le plus littéral de la charte.
 *
 * CE QUE CE MODULE GARANTIT. Il est PUR (aucune I/O, aucun capteur, aucune
 * horloge implicite) et il prend la discipline dans son ÉTAT D'ENTRÉE, où elle
 * est OBLIGATOIRE (`RunPipelineState.activity`, sans valeur par défaut). Le
 * compilateur refuse donc désormais un calcul de sortie sans discipline
 * déclarée : l'oubli d'origine ne peut plus se réécrire en silence.
 *
 * Le partage des rôles reste celui d'AMENDEMENT-15 §1 : le client PRÉ-FILTRE
 * pour l'affichage, le serveur (ingest_run §3.2) reste SEUL juge du claim — et
 * il rejuge la trace reçue avec les bornes de `IngestRunRequest.activity`, que
 * `buildIngestPayload` déclare désormais explicitement.
 */
import { latLngToCell } from 'h3-js';
import {
  type Activity,
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
import { farthestGapM, loopGapM } from './engine/loopHint';
import { recentSpeedMps } from './engine/liveView';
import { sampleEvenly, splitAndSampleAtGaps } from './traceSample';

const MS_PER_S = 1_000;

/**
 * LE DÉFAUT DE PAUSE AUTOMATIQUE, PAR DISCIPLINE (cahier §8.2).
 *
 * « Course à pied : désactivée par défaut, réglage personnel. Vélo : proposée
 * pour arrêts, sans combler les trous GPS. » Ce n'est pas une règle de jeu (elle
 * ne décide ni capture, ni point, ni distance — seulement quel temps s'affiche),
 * elle ne vit donc pas dans `game-rules.ts`. Elle est PURE et testée ici.
 */
export function autoPauseDefault2026(activity: Activity): boolean {
  return activity === 'bike';
}

/**
 * Une durée relue du disque (ou d'une horloge système) est-elle MESURABLE ?
 * `0` sinon — on ne retranche jamais ce qu'on ne sait pas mesurer, et une valeur
 * négative ALLONGERAIT le chrono au lieu de le corriger.
 */
function measurableMs(ms: number | undefined): number {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0;
}

/**
 * TEMPS MORT TOTAL d'une sortie qu'on REPREND, à l'instant `now`. PURE.
 *
 * Cumule ce qui avait DÉJÀ été mesuré (`deadMs` écrit sur le disque) et l'écart
 * de CETTE reprise, compté depuis le dernier instant réellement connu — le
 * dernier relevé GPS, ou le départ si la trace est vide (rien ne prouve alors
 * qu'une seconde ait été courue, et on ne l'invente pas).
 *
 * Le cumul est toute la raison de persister le champ : sans lui, une DEUXIÈME
 * interruption rendrait au chrono les heures de la première.
 *
 * Cette règle a une jumelle littérale dans `mvp/run/persist.ts`
 * (`resumedDeadMs`), écrite pour l'écran d'août. Elle n'est pas importée : le
 * groupe `(mvp)` est en quarantaine et partira ; la chaîne vivante ne peut pas
 * dépendre d'un module condamné. Les deux disent la même chose, et celle-ci est
 * celle que la chaîne vivante applique.
 */
export function resumedDeadTimeMs(
  stored: { readonly deadMs?: number; readonly startedAt: number; readonly fixes: readonly { readonly ts: number }[] },
  now: number,
): number {
  const already = measurableMs(stored.deadMs);
  const last = stored.fixes[stored.fixes.length - 1];
  const lastKnown = last === undefined ? stored.startedAt : last.ts;
  const gap = now - lastKnown;
  if (!Number.isFinite(gap) || gap <= 0) return already;
  return already + gap;
}

/**
 * Plafond de points de la TRACE LIVE affichée (rendu SVG ~1×/s). Purement visuel
 * — pas une constante de jeu (le serveur ne voit jamais cette trace, il reçoit la
 * trace décimée de buildIngestPayload). Assez pour une forme fidèle, assez peu
 * pour ne jamais faire ramer une course de plusieurs heures.
 */
const TRACE_DISPLAY_MAX_POINTS = 240;

/**
 * Fenêtre de MESURE de la vitesse récente (ms) — présentation, pas une règle de
 * jeu : elle ne décide d'aucun claim, elle sert seulement à savoir si le
 * coureur va assez vite pour qu'une animation devienne dangereuse (E08). Assez
 * longue pour lisser un fix isolé, assez courte pour rester « maintenant ».
 */
const RECENT_SPEED_WINDOW_MS = 10_000;

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
  /** GPS Trust 0-100 (jauge existante — envoyé au serveur via buildIngestPayload). */
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
   * Écart À VOL D'OISEAU départ ↔ position courante (m) — nourrit le guidage
   * de boucle D4 (« retour ~N m »). null tant que la trace a < 2 points.
   * Estimation locale : le serveur reste seul juge de la fermeture.
   */
  loopGapM: number | null;
  /**
   * Des fixes ARRIVENT mais aucun n'est exploitable (accuracy > max) :
   * signature de la « position approximative » iOS 14+/Android coarse →
   * bandeau « Active la position exacte ».
   */
  approxLocationSuspected: boolean;
  /**
   * §10 — TRACE LIVE : la vraie polyligne mesurée (trace lissée), pour la dessiner
   * pendant la course. Coordonnées seules (lat/lng), sous-échantillonnées pour
   * l'affichage (TRACE_DISPLAY_MAX_POINTS) — le vrai tracé, plus léger, jamais
   * inventé. Vide tant qu'il y a < 2 points : rien à tracer (l'écran le dit).
   */
  tracePoints: readonly { lat: number; lng: number }[];
  /**
   * E07 — le MÊME tracé, mais coupé aux discontinuités de signal (`gapBefore`).
   * Chaque tronçon a été RÉELLEMENT parcouru sous mesure et se peint plein ;
   * ce qui sépare deux tronçons n'a jamais été mesuré et se peint en pointillé
   * (planche E07 « tracé incertain »). Vide tant qu'aucun tronçon n'a 2 points.
   */
  traceSegments: readonly (readonly { lat: number; lng: number }[])[];
  /**
   * Écart MAXIMAL au départ atteint depuis le début (m) — le point le plus
   * loin, mesuré. Sert UNIQUEMENT à situer le retour (progression de fermeture
   * E07) : sans lui, un pourcentage serait inventé. null si trace < 2 points.
   */
  farthestGapM: number | null;
  /**
   * Vitesse MESURÉE sur les dernières secondes (m/s), null si indéterminable.
   * Distincte de `paceSPerKm` (moyenne de toute la course, muette sur
   * l'instant). Sert la réduction de SÉCURITÉ d'E08 — jamais un affichage.
   */
  recentSpeedMps: number | null;
}

/**
 * Tout ce dont le calcul d'une sortie a besoin — et RIEN d'autre : ni capteur,
 * ni stockage, ni horloge (le `nowTs` entre par paramètre). C'est la frontière
 * entre le tracker (état mutable, abonnements) et la décision (pure, testée).
 */
export interface RunPipelineState {
  /** Trace BRUTE reçue des capteurs, dans l'ordre d'arrivée. */
  readonly fixes: readonly RawFix[];
  /**
   * DISCIPLINE de la sortie (E14). OBLIGATOIRE, et volontairement SANS valeur
   * par défaut ici : c'est la règle qui rend l'oubli d'origine impossible à
   * réécrire (le compilateur refuse un calcul sans discipline déclarée). Le
   * défaut « absente ⇒ run » vit UNE seule fois, au démarrage du tracker.
   */
  readonly activity: Activity;
  readonly mode: RunMode;
  /** Départ epoch ms. */
  readonly startedAt: number;
  /** Cumul des pauses MANUELLES déjà terminées (ms). */
  readonly userPausedMs: number;
  /**
   * TEMPS MORT cumulé (ms) : celui pendant lequel l'app NE TOURNAIT PAS (kill
   * OS, batterie, crash), mesuré à chaque reprise par `resumedDeadTimeMs`.
   *
   * ─── POURQUOI CE CHAMP A DÛ DESCENDRE JUSQU'ICI (10/09/2026) ──────────────
   * `StoredRun.deadMs` existait sur le disque depuis des mois et n'avait AUCUN
   * lecteur dans la chaîne vivante : le chrono valait `now - startedAt - pauses`.
   * Une sortie tuée à 20 minutes et rouverte trois heures plus tard affichait
   * donc 3 h 20 — l'app rendait au coureur des heures pendant lesquelles elle
   * ne mesurait rien. C'est un mensonge sur la seule chose qu'un chronomètre
   * promet.
   *
   * OPTIONNEL et DISTINCT de `userPausedMs` : celui-là est une DÉCISION du
   * coureur (il a appuyé sur pause), celui-ci est une ABSENCE d'application.
   * Les fondre ferait lire une pause volontaire là où il y a eu un crash.
   */
  readonly deadMs?: number;
  /**
   * PAUSE AUTOMATIQUE — fige-t-elle le chrono aux arrêts ?
   *
   * Cahier §8.2 : « désactivée par défaut, réglage personnel » à pied,
   * « proposée pour arrêts » à vélo. Elle était appliquée à TOUT LE MONDE, sans
   * réglage : un coureur voyait son chrono s'arrêter au feu rouge sans l'avoir
   * demandé, et son « temps » n'était plus celui de sa montre.
   *
   * Elle ne touche QUE le temps. Le filtrage de la dérive GPS à l'arrêt, lui,
   * reste toujours actif : ce n'est pas une préférence, c'est une correction du
   * bruit du capteur (sans elle, cinq minutes à l'arrêt ajouteraient des mètres
   * que personne n'a courus). Absente ⇒ le défaut de la discipline.
   */
  readonly autoPause?: boolean;
  /** Instant de début de la pause manuelle EN COURS, `null` si aucune. */
  readonly userPausedSinceTs: number | null;
  /** La course est clôturée (le tracker n'accepte plus rien). */
  readonly finished: boolean;
}

/** Sortie du nettoyage, partagée entre le snapshot et le payload. */
interface CleanedRun {
  smoothed: CleanFix[];
  pauses: PauseInterval[];
  trust: number;
  keptPoints: number;
  totalFixes: number;
  accuracyRejects: number;
}

/**
 * Nettoyage + lissage + détection de pauses, AUX BORNES DE LA DISCIPLINE.
 * O(n) — quelques ms sur 2 h de course, recalculé à la demande.
 */
function cleanRun(fixes: readonly RawFix[], activity: Activity): CleanedRun {
  // ── LE CORRECTIF E14 : la discipline descend jusqu'ici. Sans elle, un
  // cycliste à 30 km/h voyait 250 de ses 300 fixes rejetés en 'speed'.
  const clean = cleanTrace(fixes, activity);
  const smoothed = smoothTrace(clean.points);
  return {
    smoothed,
    pauses: detectPauses(smoothed),
    trust: gpsTrustScore(clean),
    keptPoints: clean.points.length,
    totalFixes: clean.totalFixes,
    accuracyRejects: clean.rejected.accuracy,
  };
}

/** Photo instantanée pour l'UI — pure : tout entre par `state` et `nowTs`. */
export function computeSnapshot(state: RunPipelineState, nowTs: number): TrackerSnapshot {
  const { smoothed, pauses, trust, keptPoints, totalFixes, accuracyRejects } = cleanRun(
    state.fixes,
    state.activity,
  );
  const distanceM = totalDistanceM(smoothed, pauses);

  const lastRaw = state.fixes[state.fixes.length - 1] ?? null;
  const signal = signalState(nowTs, lastRaw);

  // Chrono actif : temps écoulé − pauses manuelles (incl. en cours) − pauses auto.
  const userPauseMs =
    state.userPausedMs +
    (state.userPausedSinceTs !== null ? Math.max(0, nowTs - state.userPausedSinceTs) : 0);
  const autoPauseMs = pauses.reduce((s, p) => s + p.durationS * MS_PER_S, 0);
  const autoPause = state.autoPause ?? autoPauseDefault2026(state.activity);
  // Le temps où l'app ne tournait pas ne se court pas (voir `deadMs`).
  const activeS = Math.max(
    0,
    (nowTs - state.startedAt - userPauseMs - (autoPause ? autoPauseMs : 0) - measurableMs(state.deadMs)) / MS_PER_S,
  );

  // Pause auto EN COURS : le dernier intervalle détecté court jusqu'au
  // dernier point gardé (le coureur est toujours à l'arrêt).
  const lastKept = smoothed[smoothed.length - 1];
  const lastPause = pauses[pauses.length - 1];
  const autoPausedNow =
    autoPause &&
    lastKept !== undefined && lastPause !== undefined && lastPause.endTs >= lastKept.ts &&
    signal !== 'lost';

  const phase: TrackerPhase = state.finished
    ? 'finished'
    : state.userPausedSinceTs !== null
      ? 'paused-user'
      : autoPausedNow
        ? 'paused-auto'
        : 'tracking';

  // Zones estimées : cellules H3 uniques de la trace gardée (hors conquête → 0,
  // rien n'est capturé — le serveur reste seul juge).
  // Retour terrain 20/07 : au tout premier fix, la cellule de DÉPART comptait
  // déjà → « +1 ZONES ESTIMÉES » à 0,00 km, à l'arrêt. Une zone s'estime en
  // BOUGEANT : tant que le déplacement ne dépasse pas le bruit GPS
  // (GPS_ACCURACY_MAX_M), rien n'est estimé.
  let zonesEstimated = 0;
  if (state.mode === 'conquete' && distanceM >= GPS_ACCURACY_MAX_M) {
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
    // §10 trace live : la vraie polyligne lissée, coordonnées seules,
    // sous-échantillonnée pour un rendu léger. `smoothed` est déjà calculé.
    tracePoints: sampleEvenly(smoothed, TRACE_DISPLAY_MAX_POINTS).map((p) => ({
      lat: p.lat,
      lng: p.lng,
    })),
    // E07 : mêmes points, coupés aux trous de signal — ce qui a été mesuré se
    // peint plein, ce qui les relie se peint en pointillé (jamais un trait
    // plein sur un chemin que personne n'a mesuré).
    traceSegments: splitAndSampleAtGaps(smoothed, TRACE_DISPLAY_MAX_POINTS).map((seg) =>
      seg.map((p) => ({ lat: p.lat, lng: p.lng })),
    ),
    loopGapM: loopGapM(smoothed),
    farthestGapM: farthestGapM(smoothed),
    recentSpeedMps: recentSpeedMps(smoothed, nowTs, RECENT_SPEED_WINDOW_MS),
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

/** Ce que seul le tracker connaît (identité de la course, capteur de pas). */
export interface PayloadContext {
  /** UUID local généré AVANT la course : clé d'idempotence d'ingest_run. */
  clientRunId: string;
  /** Pas cumulés (0 = podomètre indisponible → le champ est OMIS du payload). */
  stepCount: number;
}

/**
 * Payload RÉEL pour ingest_run : trace nettoyée + lissée + décimée
 * (≤ GPS_MAX_PAYLOAD_POINTS, cordes re-bornées §3.2 DE LA DISCIPLINE),
 * accuracies conservées, + GPS Trust calculé sur la trace BRUTE
 * (AMENDEMENT-15 §1 : les compteurs de rejets n'existent que côté client —
 * signal indicatif, le serveur borne et reste seul juge). Idempotent par
 * clientRunId.
 *
 * ACTÉ (AMENDEMENT-15 §1, vérification 05/07/2026) : le lissage pondéré par
 * accuracy fait PARTIE du nettoyage pré-envoi (pipeline déterministe, testé
 * Deno) — le serveur borne le trust à la baisse et rejuge toute la trace
 * reçue, rien n'est « embelli » à son insu.
 *
 * E14 (25/07/2026) : le payload DÉCLARE désormais sa discipline. Sans ce champ,
 * `ingest_run` retombait sur `run` et rejugeait une sortie vélo avec les bornes
 * de la course — la trace disciplinée aurait été refusée à l'arrivée. Nettoyer
 * la trace aux bonnes bornes et ne pas les déclarer au serveur reviendrait à ne
 * rien avoir corrigé.
 */
export function buildIngestPayload(
  state: RunPipelineState,
  ctx: PayloadContext,
): IngestRunRequest {
  const clean = cleanTrace(state.fixes, state.activity);
  const smoothed = smoothTrace(clean.points);
  return {
    clientRunId: ctx.clientRunId,
    source: 'gps',
    startedAt: new Date(state.startedAt).toISOString(),
    // `undefined` = plafond par défaut GPS_MAX_PAYLOAD_POINTS (aucun nombre magique).
    points: rawFixesToRunPoints(decimateForPayload(smoothed, undefined, state.activity)),
    activity: state.activity,
    runMode: state.mode,
    gpsTrust: gpsTrustScore(clean),
    // Podomètre indisponible → champ ABSENT (motionTrust neutre côté serveur).
    ...(ctx.stepCount > 0 ? { stepCount: ctx.stepCount } : {}),
  };
}
