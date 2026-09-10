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
