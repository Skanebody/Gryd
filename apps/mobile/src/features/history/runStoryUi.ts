/**
 * GRYD — LE VOCABULAIRE VISUEL d'une sortie, PARTAGÉ par la LIGNE (E67,
 * `RealRunCard`) et par le DÉTAIL (E68, `app/course/[id].tsx`).
 *
 * ─── POURQUOI IL A FALLU L'EXTRAIRE (28/07/2026) ────────────────────────────
 * Ces quatre dérivations — picto de type, libellé de type, token de couleur,
 * phrase d'impact — vivaient en privé dans `RealRunCard.tsx`. Le détail E68
 * ouvre EXACTEMENT la même sortie que la ligne d'où on l'a tapée : les recopier
 * aurait créé deux vérités sur un même objet, et la première divergence (un mot
 * de type changé d'un côté) aurait fait dire deux choses à un seul écran de
 * jeu. Le module ne contient AUCUNE règle neuve : c'est le même code, déplacé.
 *
 * ⚠ AUCUNE DÉCISION ICI. Le TYPE d'une sortie est décidé par `runStory`
 * (`historyView.ts`, PUR et testé sous Deno) ; ce fichier ne fait que traduire
 * un rôle déjà décidé en token de la charte — « couleurs par RÔLE » (§C) dans
 * le seul sens autorisé : rôle → couleur, jamais l'inverse. Il n'est donc PAS
 * Deno-testable (il tire les design-tokens, qui tirent du natif RN), et c'est
 * précisément pour ça que rien de décisif n'y vit.
 */
import { colors, gameColors, type IconName } from '@klaim/shared';
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/historique';
import type { RunColorRole, RunStory, RunStoryType } from './historyView';

/** Rôle de couleur (pur) → token de la charte. Jamais l'inverse. */
export function roleToken(role: RunColorRole): string {
  switch (role) {
    case 'me':
      return colors.chartreuse; // moi — gain
    case 'rival':
      return gameColors.rival; // orange — arraché à un rival
    case 'defense':
      return gameColors.electricBlue; // bleu — zone tenue
    default:
      return colors.gris; // free / unknown — neutre
  }
}

/** Picto de la tuile, par type. */
export const TYPE_ICON: Readonly<Record<RunStoryType, IconName>> = {
  capture: 'conquete',
  reprise: 'raid',
  defense: 'bouclier',
  free: 'boucle_ouverte',
  unknown: 'historique',
};

/** Libellé du type (le mot coloré de la planche). */
export const TYPE_LABEL: Readonly<Record<RunStoryType, Entry>> = {
  capture: C.typeCapture,
  reprise: C.typeReprise,
  defense: C.typeDefense,
  free: C.typeFree,
  unknown: C.typeUnknown,
};

/**
 * L'impact dominant en toutes lettres, par type. Singulier / pluriel géré par
 * l'entrée (« 1 zone » vs « 3 zones ») : un « 1 zones » est une petite
 * négligence qui trahit tout de suite le texte fabriqué.
 *
 * `null` pour `free`/`unknown` : le TYPE porte alors seul le message, sans un
 * chiffre qui n'existe pas.
 */
export function impactText(
  story: RunStory,
  t: (e: Entry, vars?: Record<string, string | number>) => string,
): string | null {
  switch (story.type) {
    case 'capture':
      return t(story.zones === 1 ? C.impactCapturedOne : C.impactCapturedMany, { n: story.zones });
    case 'reprise':
      return t(story.zones === 1 ? C.impactRetakenOne : C.impactRetakenMany, { n: story.zones });
    case 'defense':
      return t(story.zones === 1 ? C.impactDefendedOne : C.impactDefendedMany, { n: story.zones });
    default:
      // free / unknown : aucun chiffre — le type porte le sens.
      return null;
  }
}
