/**
 * GRYD — CE QUE LA COURSE AFFICHE : distance, chrono, jauge de fermeture.
 *
 * ─── UNE SEULE GÉOMÉTRIE, PARTAGÉE AVEC LE SERVEUR ──────────────────────────
 * La distance et le verdict de fermeture viennent du MOTEUR, via la copie
 * générée `run/engine/closure.ts` — la même source que celle qui décide le
 * claim dans `ingest_run`. C'est la seule façon d'éviter la faute qui compte
 * ici : un écran qui annonce « boucle fermée » sur une trace que le serveur
 * refusera ensuite. Deux implémentations « équivalentes » divergent toujours,
 * et le joueur découvre l'écart au pire moment — après avoir couru.
 *
 * ⚠️ Une version antérieure de ce fichier réécrivait son propre haversine
 * (« ce ne sont que huit lignes de trigonométrie »). C'était vrai, et c'était
 * quand même faux : le problème n'était pas la formule, c'était qu'il y en ait
 * DEUX. L'extraction de `closure.ts` hors de `hexing.ts` a supprimé la raison
 * technique qui l'imposait ; cette duplication n'a plus lieu d'être.
 *
 * ─── CE QUI RESTE ICI ───────────────────────────────────────────────────────
 * Uniquement du FORMATAGE : transformer des nombres vrais en texte lisible à
 * bout de souffle. Aucun calcul de jeu, aucune décision.
 */
import { traceLengthM, type LatLngPoint } from './engine/closure';

export { loopClosureVerdict, type LoopClosureVerdict } from './engine/closure';

export interface TracePoint extends LatLngPoint {
  /** Millisecondes epoch. Injecté par l'appelant — ce module n'a pas d'horloge. */
  readonly t: number;
}

/**
 * Longueur cumulée de la trace, en mètres.
 *
 * Délègue au moteur : c'est la MÊME somme que celle qui servira à valider la
 * course côté serveur.
 */
export function traceDistanceM(points: readonly TracePoint[]): number {
  return traceLengthM(points);
}

/**
 * Distance formatée en km, 2 décimales. `null` tant qu'on n'a rien parcouru.
 *
 * `null` et « 0,00 » ne sont pas la même chose : au tout début d'une course, un
 * compteur à zéro se lit comme une panne. La constitution interdit le « 0 » nu
 * pour cette raison — l'écran affiche alors autre chose, jamais un échec.
 */
export function formatKm(meters: number): string | null {
  if (!Number.isFinite(meters) || meters <= 0) return null;
  const km = Math.round(meters / 10) / 100;
  if (km <= 0) return null;
  // Virgule décimale : c'est la seule langue du MVP à en avoir besoin, et
  // `toFixed` produit un point. Le remplacement est fait ICI plutôt que dans
  // l'écran, pour qu'il n'y ait qu'un seul endroit à changer le jour où EN
  // devient exposé.
  return km.toFixed(2).replace('.', ',');
}

/**
 * Chrono `mm:ss`, ou `h:mm:ss` au-delà d'une heure. PURE.
 *
 * Écrit à la main plutôt que via `Date` : un `new Date(ms)` appliquerait le
 * fuseau de l'appareil à une DURÉE, ce qui décale le chrono d'une heure entière
 * dans la moitié du monde — et personne ne s'en aperçoit en développant à Paris.
 */
export function formatChrono(elapsedMs: number): string {
  const total = !Number.isFinite(elapsedMs) || elapsedMs < 0 ? 0 : Math.floor(elapsedMs / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const deux = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${deux(m)}:${deux(s)}` : `${deux(m)}:${deux(s)}`;
}

/**
 * FUSION DES DEUX SOURCES DE POINTS. PURE.
 *
 * ─── POURQUOI IL Y EN A DEUX ────────────────────────────────────────────────
 * Pendant une course, les positions arrivent par le suivi de PREMIER PLAN tant
 * que l'écran est allumé, et par la TÂCHE BACKGROUND dès qu'il s'éteint ou que
 * l'app passe en fond. Les deux se recouvrent au moment de la bascule : le
 * système livre parfois le même relevé aux deux chemins.
 *
 * Concaténer sans dédupliquer ferait COMPTER DEUX FOIS les mètres du
 * recouvrement — une distance gonflée à chaque verrouillage d'écran, donc
 * plusieurs fois par course. Le serveur, lui, redéduplique (`cleanTrace`) : le
 * chiffre affiché finirait par contredire celui du résultat, et le joueur
 * n'aurait aucun moyen de savoir lequel croire.
 *
 * ⚠️ LA CLÉ EST L'HORODATAGE, pas la position. Deux relevés à la même
 * milliseconde SONT le même relevé — à 1 Hz, aucune course ne produit deux
 * positions distinctes dans la même milliseconde. Dédupliquer sur les
 * coordonnées, à l'inverse, effacerait les arrêts (feu rouge, lacet refait),
 * pendant lesquels la position ne bouge pas alors que le temps passe.
 *
 * Le tri est indispensable : la file background est vidée par lots, donc ses
 * points arrivent APRÈS des points de premier plan plus récents. Une trace non
 * triée mesurerait des allers-retours qui n'ont pas eu lieu.
 */
export function mergeFixes(
  a: readonly TracePoint[],
  b: readonly TracePoint[],
): TracePoint[] {
  const parTs = new Map<number, TracePoint>();
  // `a` d'abord, `b` ensuite : à horodatage égal, le second gagne. Sans
  // conséquence (c'est le même relevé), mais l'ordre est ÉCRIT plutôt que subi.
  for (const p of a) parTs.set(p.t, p);
  for (const p of b) parTs.set(p.t, p);
  return [...parTs.values()].sort((x, y) => x.t - y.t);
}
