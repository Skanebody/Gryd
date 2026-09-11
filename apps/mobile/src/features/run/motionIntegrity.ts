/**
 * GRYD — CE QUE LES CAPTEURS DE L'APPAREIL DISENT DE LA SORTIE, ET SURTOUT CE
 * QU'ILS NE DISENT PAS (cahier de septembre §18.4 « Antitriche proportionnée »).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * Deux signaux de capteur partent avec la trace : le PODOMÈTRE et le drapeau de
 * POSITION SIMULÉE. Aucun des deux n'est une décision — le serveur reste seul
 * juge (§3.2) — mais tous les deux ont la même propriété piégeuse : leur ABSENCE
 * doit rester distinguable de leur valeur négative.
 *
 * ─── LE DÉFAUT QUE CE MODULE RÉPARE ─────────────────────────────────────────
 * `buildIngestPayload` n'envoyait `stepCount` que s'il était STRICTEMENT positif
 * (`ctx.stepCount > 0`). Conséquence exacte : « aucun podomètre sur cet
 * appareil » et « un podomètre a tourné pendant 12 km et n'a compté AUCUN pas »
 * arrivaient au serveur sous la même forme — un champ absent. Le second cas est
 * pourtant l'observation la plus parlante qu'un téléphone puisse faire : c'est
 * la signature d'un déplacement non pédestre. Il était jeté avec le premier.
 *
 * Et ce n'était pas un cas d'école : `stepCoherence` (moteur) sait lire un zéro
 * (« trust ≈ 0 → sortie signalée »), il ne le recevait simplement jamais.
 *
 * ─── LE PRINCIPE, DANS LES DEUX SENS ────────────────────────────────────────
 * On envoie une MESURE quand une mesure a eu lieu, et RIEN quand il n'y en a pas
 * eu. Jamais un zéro par défaut (ce serait accuser un appareil qui n'a rien
 * fait), jamais un silence sur une mesure réelle (ce serait cacher la preuve).
 *
 * PUR : aucune I/O, aucun capteur lu ici, aucune horloge. Ce module TRADUIT ce
 * que le tracker a observé ; c'est ce qui le rend testable sous Deno, alors que
 * `tracker.ts` (qui importe `expo-sensors`) ne l'est pas.
 */
import type { RawFix } from './gps/engine/gps';
import type { StepWindow2026 } from './gps/engine/disciplineCheck2026';

/** Ce que le tracker sait de son podomètre à la fin de la sortie. */
export interface StepObservation {
  /**
   * Un abonnement podomètre a-t-il RÉELLEMENT tourné ? Faux quand le capteur
   * est absent (navigateur, simulateur), quand la permission « Mouvements et
   * forme » a été refusée, ou quand l'abonnement a échoué.
   */
  readonly sensorRan: boolean;
  /** Pas cumulés observés (0 est une valeur légitime si `sensorRan`). */
  readonly steps: number;
}

/**
 * Le `stepCount` à mettre dans le payload — ou `undefined` pour l'OMETTRE.
 *
 * `sensorRan === false` ⇒ `undefined` : rien n'a été mesuré, et le serveur doit
 * pouvoir le savoir (le signal `step_coherence` sort alors du dénominateur, il
 * n'accuse ni ne blanchit).
 * `sensorRan === true`  ⇒ le nombre, ZÉRO COMPRIS.
 */
export function stepCountForPayload(observation: StepObservation): number | undefined {
  if (!observation.sensorRan) return undefined;
  if (!Number.isFinite(observation.steps)) return undefined;
  return Math.max(0, Math.round(observation.steps));
}

/**
 * Le `mockedLocation` à mettre dans le payload — ou `undefined` pour l'OMETTRE.
 *
 * Lecture sur la trace BRUTE, pas sur un état global : le drapeau vit sur chaque
 * relevé (`RawFix.mocked`, alimenté par `LocationObject.mocked` d'expo-location).
 *
 *  · un SEUL relevé simulé suffit à répondre `true`. Une trace à moitié truquée
 *    reste une trace truquée, et le serveur doit voir la moitié qui l'est ;
 *  · `false` seulement si au moins un relevé a répondu « non » : c'est une
 *    mesure, et une mesure négative est une information ;
 *  · `undefined` quand aucun relevé ne porte l'information — le cas de TOUT
 *    iOS, où CoreLocation ne l'expose pas, et du navigateur.
 *
 * ⚠️ CE QUE ÇA N'EST PAS. Ce n'est pas une attestation d'intégrité : une
 * application modifiée ne renseignerait tout simplement pas le champ, et le
 * serveur le lirait comme « la plateforme n'a rien dit ». Ce drapeau attrape
 * l'usage d'une app de simulation par quelqu'un qui n'a PAS recompilé GRYD —
 * c'est-à-dire le scénario réel, celui des tutoriels de triche Strava.
 */
export function mockedLocationForPayload(fixes: readonly RawFix[]): boolean | undefined {
  let answered = false;
  for (const fix of fixes) {
    if (fix.mocked === true) return true;
    if (fix.mocked === false) answered = true;
  }
  return answered ? false : undefined;
}

// ════════════════════════════════════════════════════════════════════════════
// LE PODOMÈTRE PAR TRANCHES — CE QUE LE CONTRÔLE DE DISCIPLINE DEMANDE
// (décision fondateur du 12/09/2026)
// ════════════════════════════════════════════════════════════════════════════
//
// ─── LE DÉFAUT QUE CE BLOC RÉPARE ───────────────────────────────────────────
// Le tracker gardait DEUX choses du podomètre : un CUMUL (`stepCount`) et des
// échantillons bruts pour la cadence live — ces derniers plafonnés
// (`STEP_SAMPLES_MAX = 240`) pour ne pas faire enfler la mémoire d'un téléphone
// qui enregistre déjà une trace. Conséquence exacte : sur une sortie d'une
// heure, les premières minutes avaient disparu du tableau.
//
// Le contrôle de discipline, lui, oppose une cadence à une fenêtre de CINQ
// minutes qui peut tomber n'importe où dans la sortie. Avec les seuls
// échantillons plafonnés, il n'aurait rien vu avant les dernières minutes — et
// avec le seul cumul, il aurait lu une cadence MOYENNE, qui dilue exactement la
// portion qu'on cherche (dix minutes de vélo noyées dans vingt de trot).
//
// ─── LE PRINCIPE : UNE TRANCHE ABSENTE N'EST PAS « ZÉRO PAS » ───────────────
// Les tranches sont CONTIGUËS depuis l'instant où l'abonnement a réellement
// commencé. Un podomètre silencieux remplit donc des tranches à ZÉRO (c'est une
// mesure : personne n'a posé un pied), tandis qu'une portion ANTÉRIEURE à
// l'abonnement n'a aucune tranche du tout (personne n'écoutait). Le moteur
// distingue les deux par sa couverture minimale, et refuse de juger la seconde.
//
// PUR : aucun capteur lu ici, aucune horloge. Le tracker pousse les relevés,
// ces fonctions les rangent — c'est ce qui les rend testables sous Deno.

/** Le cumul horodaté qu'émet `Pedometer.watchStepCount`. */
export interface StepCumulative2026 {
  /** Epoch ms de l'émission. */
  readonly ts: number;
  /** Compteur CUMULÉ de la sortie (jamais un delta). */
  readonly steps: number;
}

/** L'état du rangement en cours. Opaque pour l'appelant : il le repasse tel quel. */
export interface StepWindowState2026 {
  /** Tranches déjà ouvertes, contiguës depuis `openedAt`. */
  readonly windows: readonly StepWindow2026[];
  /** Epoch ms — l'instant où l'abonnement a commencé d'écouter. */
  readonly openedAt: number;
  /** Cumul du DERNIER relevé rangé : c'est lui qui donne le delta du suivant. */
  readonly lastSteps: number;
}

/**
 * Ouvre le rangement à l'instant où le podomètre commence VRAIMENT d'écouter.
 *
 * `baseSteps` est le cumul de la sortie à cet instant — non nul après une
 * reprise (`initialSteps`). Sans lui, le premier relevé produirait un delta
 * égal à tout l'historique repris, rangé dans la première tranche : une cadence
 * fantôme de plusieurs milliers de pas par minute.
 */
export function openStepWindows2026(atTs: number, baseSteps: number): StepWindowState2026 {
  return {
    windows: [],
    openedAt: Number.isFinite(atTs) ? atTs : 0,
    lastSteps: Number.isFinite(baseSteps) ? Math.max(0, baseSteps) : 0,
  };
}

/** Tranche vide numéro `index`, alignée sur l'ouverture. */
function emptyWindow(openedAt: number, index: number, bucketMs: number): StepWindow2026 {
  return {
    fromT: openedAt + index * bucketMs,
    toT: openedAt + (index + 1) * bucketMs,
    steps: 0,
  };
}

/**
 * Range un relevé cumulé dans sa tranche, en ouvrant à ZÉRO celles qu'on a
 * traversées sans rien entendre.
 *
 * Un relevé ANTÉRIEUR à l'ouverture (horloge qui recule) est IGNORÉ : le ranger
 * ailleurs inventerait des pas à un moment où le capteur ne parlait pas. Un
 * cumul qui REDESCEND (compteur remis à zéro par l'OS) ne produit pas de delta
 * négatif : on ne retire pas des pas déjà comptés, on reprend simplement la
 * mesure à partir du nouveau plancher.
 */
export function addStepSample2026(
  state: StepWindowState2026,
  sample: StepCumulative2026,
  bucketMs: number,
): StepWindowState2026 {
  if (!Number.isFinite(sample.ts) || !Number.isFinite(sample.steps)) return state;
  if (!(bucketMs > 0)) return state;
  if (sample.ts < state.openedAt) return state;
  const index = Math.floor((sample.ts - state.openedAt) / bucketMs);
  const delta = Math.max(0, sample.steps - state.lastSteps);
  const windows = state.windows.slice();
  while (windows.length <= index) {
    windows.push(emptyWindow(state.openedAt, windows.length, bucketMs));
  }
  const target = windows[index]!;
  windows[index] = { fromT: target.fromT, toT: target.toT, steps: target.steps + delta };
  return {
    windows,
    openedAt: state.openedAt,
    lastSteps: Math.max(state.lastSteps, sample.steps),
  };
}

/**
 * Ferme le rangement sur `endTs` : les tranches traversées en silence sont
 * ouvertes à zéro, et la dernière est RABOTÉE à l'instant de fin.
 *
 * Sans le rabotage, la dernière tranche déborderait dans le futur et la
 * couverture d'une fenêtre de mesure serait surévaluée — c'est-à-dire qu'on
 * jugerait sur du temps qui n'a pas eu lieu.
 */
export function sealStepWindows2026(
  state: StepWindowState2026,
  endTs: number,
  bucketMs: number,
): readonly StepWindow2026[] {
  if (!Number.isFinite(endTs) || !(bucketMs > 0)) return state.windows;
  if (endTs <= state.openedAt) return [];
  const last = Math.floor((endTs - state.openedAt) / bucketMs);
  const windows = state.windows.slice();
  while (windows.length <= last) {
    windows.push(emptyWindow(state.openedAt, windows.length, bucketMs));
  }
  const out: StepWindow2026[] = [];
  for (const w of windows) {
    if (w.fromT >= endTs) continue;
    out.push(w.toT <= endTs ? w : { fromT: w.fromT, toT: endTs, steps: w.steps });
  }
  return out;
}
