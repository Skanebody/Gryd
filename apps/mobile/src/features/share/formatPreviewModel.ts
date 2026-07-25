/**
 * GRYD — APERÇU DE FORMAT (livrable (c), demande explicite du fondateur).
 *
 * PROBLÈME : le compositeur /partage ne s'ouvre qu'avec une VRAIE course
 * terminée. Sur localhost il n'y en a jamais, donc personne — ni le fondateur,
 * ni l'agent qui recale — ne peut juger le rendu des cartes.
 *
 * SOLUTION, ET SA LIMITE : on montre la MISE EN PAGE (cadre, hiérarchie,
 * proportions, ordre des emplacements) avec le NOM de chaque emplacement, et
 * strictement AUCUNE valeur. Un aperçu de format mal fait redeviendrait le mode
 * démo supprimé le 21/07/2026 (AMENDEMENT-47) ; d'où quatre garde-fous :
 *   1. aucun chiffre, aucune unité, aucun nom de lieu dans les libellés
 *      (`isSlotLabelClean`, appliqué AU RENDU et testé sur le catalogue réel) ;
 *   2. l'ordre et les proportions viennent de la planche, pas d'une intuition de
 *      mise en page (`PREVIEW_SLOTS`) ;
 *   3. aucun chemin d'export (ni captureRef, ni Share, ni CTA de partage) et
 *      aucune lecture de `getShareRun()` — garanti par le composant, qui
 *      n'importe aucun de ces modules ;
 *   4. l'étiquette « aperçu de format » est DANS le cadre, pas seulement autour.
 *
 * ─── L'APERÇU MONTRE LE CODE, PAS LA PLANCHE ────────────────────────────────
 * Tentation évidente et piège grossier : dessiner la composition IDÉALE de la
 * planche. Ce serait une doc qui promet au-delà du code — la même faute qu'une
 * donnée fabriquée. L'aperçu dessine donc ce que la carte rend VRAIMENT, et
 * déclare à côté les emplacements que le code ne tient pas encore (`status`).
 * Le jour où ShareCard les tiendra, le test ci-contre exigera de mettre cette
 * déclaration à jour : l'écart ne peut pas se périmer en silence.
 *
 * PUR, zéro import : testable en Deno.
 */

/** Les sept emplacements de la planche E10, dans l'ORDRE de lecture. */
export type PreviewSlotId =
  | 'place'
  | 'event'
  | 'map'
  | 'hero'
  | 'context'
  | 'challenge'
  | 'signature';

/**
 * État RÉEL de l'emplacement dans la carte d'aujourd'hui :
 *   · `rendered`  — présent, à sa place ;
 *   · `missing`   — pas rendu du tout ;
 *   · `misplaced` — rendu, mais ailleurs que là où la planche le veut.
 */
export type SlotStatus = 'rendered' | 'missing' | 'misplaced';

export interface PreviewSlot {
  readonly id: PreviewSlotId;
  /**
   * Part de la hauteur du cadre. La CARTE domine : c'est la preuve, elle occupe
   * le centre optique (planche). Le reste doit se lire en moins d'une seconde à
   * la taille d'une vignette, donc rien d'autre ne peut peser autant qu'elle.
   */
  readonly heightShare: number;
  readonly status: SlotStatus;
  /**
   * `true` = aucune SOURCE de donnée ne l'alimente aujourd'hui, même si un slot
   * existait. À distinguer de `status` : l'un parle du rendu, l'autre de la
   * donnée. Un emplacement peut être rendu et rester vide.
   */
  readonly unsourced?: boolean;
}

/**
 * Composition de RÉFÉRENCE (ordre de la planche E10).
 *
 * `place` est `missing` ET `unsourced` : ShareCard n'expose aucun slot au-dessus
 * du titre en mode héros, et aucune ville ni secteur n'est armé nulle part (voir
 * cardModel.knownPlaceName). `signature` est `misplaced` : le wordmark GRYD
 * existe, mais en haut à gauche, pas en pied.
 */
export const PREVIEW_SLOTS: readonly PreviewSlot[] = [
  { id: 'place', heightShare: 0.05, status: 'missing', unsourced: true },
  { id: 'event', heightShare: 0.18, status: 'rendered' },
  { id: 'map', heightShare: 0.4, status: 'rendered' },
  { id: 'hero', heightShare: 0.14, status: 'rendered' },
  { id: 'context', heightShare: 0.06, status: 'rendered' },
  { id: 'challenge', heightShare: 0.09, status: 'rendered' },
  { id: 'signature', heightShare: 0.05, status: 'misplaced' },
];

/**
 * Ordre RÉELLEMENT rendu par la carte, de haut en bas. Il diffère de la planche
 * sur un seul point — la signature est en tête au lieu du pied — et c'est
 * exactement l'écart déclaré ci-dessus.
 */
export const RENDERED_SLOT_ORDER: readonly PreviewSlotId[] = [
  'signature',
  'event',
  'map',
  'hero',
  'context',
  'challenge',
];

/** L'emplacement `id`, ou undefined s'il n'existe pas. */
export function slotById(id: PreviewSlotId): PreviewSlot | undefined {
  return PREVIEW_SLOTS.find((s) => s.id === id);
}

/**
 * Motifs qui trahiraient une VALEUR (donc une donnée fabriquée) dans un libellé
 * d'emplacement. Les unités sont listées explicitement : « km » et « m² » sont
 * des invariants non traduits du catalogue, donc ils apparaîtraient tels quels
 * dans les cinq langues.
 */
const VALUE_MARKERS: readonly RegExp[] = [
  /\d/, // le plus simple et le plus sûr : aucun chiffre, jamais
  /[#%+]/, // « #2 », « 62 % », « +47 »
  /\bkm\b/i,
  /m²/i, // l'aire interdite (contrainte (a)), sous toutes ses formes
  /\bmin\b/i,
  /\bpts?\b/i,
];
// NOTE : pas de règle sur « h » seul. `\b` ne connaît pas les lettres accentuées
// (« é » n'est pas un caractère de mot en JS sans /u), donc /\bh\b/ marquerait le
// « h » de « héros » comme une durée. Les durées de la planche (« 2 h ») portent
// toutes un chiffre : la première règle les attrape déjà.

/**
 * Un libellé d'emplacement est-il exempt de toute valeur ?
 *
 * La marque « GRYD » est autorisée : ce n'est pas une donnée du joueur, c'est le
 * nom de l'app — il figure sur toutes les cartes, aperçu compris.
 */
export function isSlotLabelClean(label: string): boolean {
  return !VALUE_MARKERS.some((re) => re.test(label));
}

/** Libellés fautifs d'un lot (vide = tout est propre). Sert au rendu ET au test. */
export function dirtySlotLabels(labels: readonly string[]): readonly string[] {
  return labels.filter((l) => !isSlotLabelClean(l));
}
