/**
 * GRYD — E26 « FIN D'ACTIVITÉ » : LA DÉCISION, PURE ET TESTÉE.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1234-1252.)
 *
 * La feuille basse s'intercale entre l'ARRÊT et le RÉSULTAT : temps, distance,
 * objectif détecté, `TERMINER ET ANALYSER`, `REPRENDRE`. Ce module ne rend rien
 * — il dit seulement CE QUE la feuille a le droit d'affirmer.
 *
 * ═══ POURQUOI « REPRENDRE » NE PEUT RIEN PERDRE, PAR CONSTRUCTION ═══════════
 * La feuille s'ouvre AVANT `RealRunApi.finish()`, jamais après. `finish()` est
 * irréversible (`useRealRunCore.ts:456` — il pose `finishedRef`, arrête les
 * capteurs, vide le buffer et lance l'envoi) : une feuille affichée APRÈS lui
 * n'aurait aucun moyen de rendre le tracker. Tant que la feuille est ouverte,
 * la sortie est simplement en PAUSE UTILISATEUR — le tracker vit, la trace
 * reste en mémoire ET sur le disque (autosave `run_autosave`, §8, et reprise
 * après kill par `mvp/run/crashRecovery.ts`). `REPRENDRE` ne « restaure » donc rien :
 * il lève la pause. Le segment déjà enregistré n'a jamais cessé d'exister, et
 * c'est la seule façon d'en être certain plutôt que de l'espérer.
 *
 * ═══ L'OBJECTIF EST DÉTECTÉ, PAS DEVINÉ ═════════════════════════════════════
 * Il ne se dérive que de DEUX faits déjà établis par ailleurs, jamais d'une
 * supposition d'écran :
 *  · une DÉFENSE est en cours — c'est-à-dire qu'une contestation RÉELLE, ouverte
 *    et à portée vise une de mes zones (`defense/liveDefense.ts`, qui ne rend un
 *    objectif que sur des lignes de `territory_contests`) ;
 *  · le MODE de la sortie, déclaré au départ et porté par le tracker
 *    (`RealRunApi.effectiveMode`) : `conquete` vise le territoire, les autres
 *    modes sont des sorties de statistiques.
 * Quand aucun des deux n'est lisible, `'unknown'` — l'écran affiche l'absence
 * (`objectiveUnknown`) plutôt qu'un objectif plausible.
 *
 * PURE : aucun import React, aucune I/O, aucune horloge.
 */
import { type Activity, type RunMode, activityProducesResult } from '@klaim/shared';

/** Les quatre valeurs d'« objectif détecté » — miroir exact du catalogue `finActivite.ts`. */
export type FinishObjective = 'conquest' | 'defense' | 'free' | 'unknown';

export interface DetectObjectiveInput {
  /**
   * Une DÉFENSE réelle est en cours sur cette sortie. Vient de
   * `pickLiveDefenseTarget() !== null` — donc d'une ligne serveur, jamais d'une
   * intention déclarée par le joueur.
   */
  readonly defenseActive: boolean;
  /** Mode EFFECTIF du tracker. `null` = non lisible (on ne suppose pas). */
  readonly mode: RunMode | null;
}

/**
 * L'objectif que la feuille a le droit d'annoncer.
 *
 * La DÉFENSE l'emporte sur le mode : défendre est un fait mesuré sur le
 * terrain (une zone à moi, contestée, à portée), alors que le mode n'est qu'une
 * déclaration de départ. Quand les deux disent quelque chose, c'est le fait qui
 * gagne — sinon une sortie partie en « conquête » et devenue une défense
 * afficherait le mauvais mot au moment précis où il compte.
 */
export function detectObjective(input: DetectObjectiveInput): FinishObjective {
  if (input.defenseActive) return 'defense';
  if (input.mode === null) return 'unknown';
  if (input.mode === 'conquete') return 'conquest';
  return 'free';
}

// ═══════════════════════════════════════════════════════════════════════════
// LE PLANCHER §3.2 — LA SEULE RAISON DE DEMANDER CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════

/** Ce que la feuille affiche, entièrement dérivé de faits mesurés. */
export interface FinishSheetModel {
  readonly objective: FinishObjective;
  /**
   * La sortie franchit-elle les minima §3.2 de sa discipline
   * (`activityProducesResult`, game-rules — LES MÊMES que le serveur) ?
   */
  readonly producesResult: boolean;
  /**
   * `TERMINER` doit-il demander confirmation ? Spec l.1194 : « uniquement si
   * l'activité est trop courte pour produire un résultat ». Donc exactement la
   * négation de `producesResult`, et rien d'autre — pas de confirmation « au
   * cas où », qui rendrait le geste normal pénible pour rien.
   */
  readonly confirmBeforeFinish: boolean;
}

export interface FinishSheetInput extends DetectObjectiveInput {
  readonly distanceM: number;
  readonly durationS: number;
  readonly activity: Activity;
}

export function finishSheetModel(input: FinishSheetInput): FinishSheetModel {
  const producesResult = activityProducesResult(
    input.distanceM,
    input.durationS,
    input.activity,
  );
  return {
    objective: detectObjective(input),
    producesResult,
    confirmBeforeFinish: !producesResult,
  };
}
