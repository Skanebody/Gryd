/**
 * GRYD — LE NUMÉRO DE SCÈNE de la visite guidée « Calcul des zones », PUR.
 *
 * POURQUOI CE FICHIER EXISTE. L'écran fabriquait son sur-titre avec
 * `` `0${index + 1}` `` : un zéro collé à la main. La visite est passée de 6 à 8
 * scènes sans que personne ne le remarque ; à la neuvième ajoutée, la dixième
 * scène s'appellerait « 010 ». Une numérotation qui casse en ajoutant une scène
 * est un piège posé pour le prochain lecteur, pas une mise en forme.
 *
 * Ce n'est PAS une règle de jeu : c'est de la présentation d'index. Aucune
 * constante de game-rules.ts n'entre ici.
 */

/**
 * Sur-titre d'une scène à partir de son index 0-based : `0` → « 01 », `9` → « 10 ».
 *
 * Renvoie `null` quand l'index n'est pas un rang affichable (négatif, NaN) :
 * l'écran n'affiche alors PAS de kicker plutôt que d'imprimer « 0NaN » — même
 * discipline que « un segment sans source disparaît ».
 */
export function sceneStepLabel(index: number): string | null {
  if (!Number.isFinite(index)) return null;
  const rank = Math.trunc(index) + 1;
  if (rank < 1) return null;
  return rank < 10 ? `0${rank}` : String(rank);
}
