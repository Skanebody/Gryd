/**
 * GRYD — LES TROIS TEMPS DE LA CÉLÉBRATION. PUR (L7).
 *
 * ─── POURQUOI CETTE TABLE EXISTE ────────────────────────────────────────────
 * L7 ne demande pas « une animation » : elle demande un ORDRE — « le contour se
 * stabilise → remplissage → gain ». Cet ordre est ce qui fait du chiffre une
 * révélation plutôt qu'un affichage, et c'est exactement ce qu'une relecture ne
 * vérifie pas : trois `interpolate` écrits à la suite se chevauchent sans que
 * personne ne le voie, et la séquence s'aplatit en un simple fondu.
 *
 * Une capture d'écran ne le prouve pas non plus : l'aller-retour d'une capture
 * dépasse la durée de la séquence, et on ne photographie que l'état final.
 * Les bornes vivent donc ICI, où elles se testent.
 *
 * ⚠️ SON : ABSENT. L7 le demande, mais le dépôt n'a ni dépendance audio ni
 * fichier, et un son bâclé — ou un placeholder muet — vaudrait moins que son
 * absence assumée. Déclaré au BACKLOG, pas maquillé.
 */

/** Durée totale (ms). L7 : « 2 à 3 s ». */
export const CELEBRATION_MS = 2_200;

/** Bornes d'un temps, en fraction de la durée totale. */
export interface Beat {
  readonly from: number;
  readonly to: number;
}

/**
 * Les trois temps, dans l'ordre de la loi.
 *
 * Ils ne se CHEVAUCHENT PAS, et c'est tout l'objet : un remplissage qui commence
 * avant que le contour soit posé donne une tache qui se cherche une forme ; un
 * chiffre qui arrive pendant le remplissage n'est plus une révélation.
 */
export const OUTLINE: Beat = { from: 0, to: 0.3 };
export const FILL: Beat = { from: 0.3, to: 0.55 };
export const GAIN: Beat = { from: 0.55, to: 1 };

/**
 * Le DÉPASSEMENT du contour : il arrive trop grand, puis se pose.
 *
 * C'est ce retour qui donne le mot « se stabilise » plutôt que « apparaît ».
 * Trois bornes, pas deux — avec deux, la forme grandit et s'arrête, ce qui se
 * lit comme un zoom.
 */
export const OUTLINE_SCALE = {
  input: [0, 0.22, OUTLINE.to] as const,
  output: [0.9, 1.04, 1] as const,
};

/** Les trois temps, dans l'ordre déclaré. */
export const BEATS: readonly Beat[] = [OUTLINE, FILL, GAIN];
