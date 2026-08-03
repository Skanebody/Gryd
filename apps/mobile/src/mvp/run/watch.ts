/**
 * GRYD — COUPER UN ABONNEMENT DE POSITION SANS FAIRE TOMBER L'ÉCRAN (lot M4).
 *
 * ─── LE BUG QUE CE FICHIER EXISTE POUR EMPÊCHER ─────────────────────────────
 * `Location.watchPositionAsync` rend un objet d'abonnement — et sa forme
 * DIFFÈRE selon la plateforme. Sur le fork web d'`expo-location`, appeler
 * `sub.remove()` lève `removeSubscription is not a function` : l'écran tombe au
 * DÉMONTAGE, c'est-à-dire au moment précis où le joueur le quitte. Constaté sur
 * `/prete` le 03/08/2026, écran rouge à la fin du décompte.
 *
 * Un `try/catch` recopié dans chaque écran aurait marché, et se serait perdu au
 * premier écran suivant écrit sans lui. C'est le genre de faute qui ne se voit
 * jamais en revue : le code fautif est correct sur la plateforme où on le lit.
 *
 * ⚠️ Le `catch` est SILENCIEUX, et c'est le seul endroit du MVP où c'est juste :
 * on est en train de partir, il n'y a plus rien à dire à personne, et une erreur
 * remontée ici ne ferait que masquer la vraie raison du démontage.
 */
import type * as Location from 'expo-location';

/** Ce dont on a réellement besoin d'un abonnement : savoir l'arrêter. */
type Arretable = { remove?: () => void; removeSubscription?: () => void } | null;

/**
 * Coupe un abonnement de position, quelle que soit la forme qu'il a ici.
 *
 * Tolère `null` : l'écran peut se démonter AVANT que la promesse d'abonnement
 * n'ait résolu, et c'est le cas le plus fréquent sur un décompte de 3 secondes.
 */
export function stopWatch(sub: Location.LocationSubscription | null): void {
  const s = sub as Arretable;
  if (s === null || s === undefined) return;
  try {
    if (typeof s.remove === 'function') s.remove();
    else if (typeof s.removeSubscription === 'function') s.removeSubscription();
  } catch {
    // Voir l'en-tête : on part, il n'y a plus d'écran à informer.
  }
}
