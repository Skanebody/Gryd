/**
 * GRYD — LE DÉPART : ce qu'on attend, et ce qu'on N'ATTEND PAS. PUR (lot M4).
 *
 * ─── L3 : UN SEUL TAP ENTRE LA CARTE ET LE DÉPART ───────────────────────────
 * « Deux taps max entre l'ouverture de l'app et le départ » — or ouvrir n'est
 * pas un tap. Il reste donc UN tap : GO. Le préflight ne peut pas demander un
 * second appui « pour confirmer » : il se déroule TOUT SEUL, et le seul geste
 * qu'il offre est d'annuler.
 *
 * ─── POURQUOI LE DÉCOMPTE N'ATTEND PAS LE GPS ───────────────────────────────
 * Le réflexe serait de bloquer le départ tant que la précision n'est pas bonne.
 * C'est une mauvaise idée : en ville, un premier point fiable peut demander 30 s,
 * et quelqu'un qui a appuyé sur GO est DÉJÀ en train de partir. Un écran qui le
 * retient pendant qu'il court perd le début de sa trace — c'est-à-dire ce qui
 * ferme la boucle.
 *
 * On part donc à l'heure, et on ENREGISTRE le fait que le départ était dégradé
 * (`run_start_degraded`), ce que la taxonomie du dépôt prévoit déjà. La qualité
 * du signal est une INFORMATION affichée, jamais une permission de courir.
 *
 * ─── AUCUN NOMBRE DE JEU ICI ────────────────────────────────────────────────
 * La durée du décompte ne décide d'aucun claim : c'est de l'UI, sa place n'est
 * pas dans `game-rules`. La précision-seuil, si — mais elle sert seulement à
 * QUALIFIER le départ, jamais à l'autoriser.
 */

/** Durée du décompte, en secondes. Assez pour ranger le téléphone, pas plus. */
export const COUNTDOWN_S = 3;

/**
 * Précision (m) en deçà de laquelle on considère le signal FRANC.
 *
 * Ce seuil ne bloque rien — voir l'en-tête. Il sert à dire au joueur ce qu'il
 * en est, et à marquer les départs dégradés pour qu'on sache, plus tard,
 * pourquoi certaines traces sont mauvaises.
 */
export const GPS_GOOD_ACCURACY_M = 20;

/** Ce que l'écran affiche du signal. Trois états, jamais deux. */
export type GpsGrade = 'searching' | 'weak' | 'good';

/**
 * Précision mesurée → ce qu'on en dit. PURE.
 *
 * `null` = aucun point encore reçu : « recherche », et surtout PAS « faible ».
 * Annoncer un signal faible avant d'avoir mesuré quoi que ce soit serait
 * inventer un diagnostic — et inquiéter quelqu'un sur la foi de rien.
 */
export function gpsGrade(accuracyM: number | null | undefined): GpsGrade {
  if (typeof accuracyM !== 'number' || !Number.isFinite(accuracyM) || accuracyM <= 0) {
    return 'searching';
  }
  return accuracyM <= GPS_GOOD_ACCURACY_M ? 'good' : 'weak';
}

/**
 * Le départ est-il DÉGRADÉ ? (pour `run_start_degraded`)
 *
 * Oui dès que le signal n'est pas franc — y compris quand aucun point n'est
 * arrivé. C'est le sens utile : on veut savoir combien de courses partent sans
 * repère, pas seulement combien partent avec un mauvais.
 */
export function isDegradedStart(grade: GpsGrade): boolean {
  return grade !== 'good';
}

/**
 * Le décompte restant après `elapsedS` secondes, jamais négatif.
 *
 * Séparé du composant pour une raison précise : un décompte se teste mal à la
 * main (il faut attendre), et c'est exactement le genre de calcul où un `<` mis
 * pour un `<=` fait afficher « 0 » une seconde entière avant de partir.
 */
export function remaining(elapsedS: number): number {
  if (!Number.isFinite(elapsedS) || elapsedS < 0) return COUNTDOWN_S;
  return Math.max(0, COUNTDOWN_S - Math.floor(elapsedS));
}

/** Le décompte est-il terminé ? */
export function isDone(elapsedS: number): boolean {
  return remaining(elapsedS) === 0;
}
