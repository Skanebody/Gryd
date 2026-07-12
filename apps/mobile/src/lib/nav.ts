/**
 * GRYD — navigation robuste (retour JAMAIS mort).
 *
 * `router.back()` NE FAIT RIEN quand l'écran est le premier de la pile (deep
 * link, ouverture directe, ou arrivée via `router.replace`) : le bouton retour
 * paraît alors cassé. `goBack` garantit un retour TOUJOURS fluide : il revient
 * dans la pile s'il y a un historique, sinon il REMPLACE par un parent sensé
 * (défaut : les onglets). Un seul point de vérité pour tous les boutons retour.
 */
import { router, type Href } from 'expo-router';

/** Parent par défaut quand il n'y a pas d'historique (accueil = onglets). */
const DEFAULT_BACK: Href = '/(tabs)';

/**
 * Retour fluide : `router.back()` s'il y a un historique, sinon `router.replace`
 * vers `fallback` (parent logique de l'écran). Ne laisse jamais un bouton retour
 * sans effet.
 */
export function goBack(fallback: Href = DEFAULT_BACK): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
