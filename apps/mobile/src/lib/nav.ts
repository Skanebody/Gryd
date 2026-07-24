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
import { EVENTS, track } from './analytics';

/** Parent par défaut quand il n'y a pas d'historique (accueil = onglets). */
const DEFAULT_BACK: Href = '/(tabs)';

/**
 * Retour fluide : `router.back()` s'il y a un historique, sinon `router.replace`
 * vers `fallback` (parent logique de l'écran). Ne laisse jamais un bouton retour
 * sans effet.
 *
 * §26 : un retour explicite est un RECUL dans un parcours (friction). `screen`
 * (super-prop) dit d'où l'on recule. `had_history` distingue « je dépile un écran
 * poussé » de « je retombe sur un parent » (sans historique). `to` n'est émis QUE
 * dans ce second cas — la SEULE branche où `fallback` est vraiment la destination :
 * avec historique, `router.back()` ramène à l'écran précédent RÉEL (inconnu ici),
 * donc affirmer `to: fallback` serait fabriquer un fait (doctrine anti-mensonge).
 * Jamais un objet à params (aucun id/code ne fuit) — d'où le repli 'stack'.
 *
 * `opts.silent` — pour un retour PROGRAMMATIQUE (auto-retour après un succès, pas
 * un tap) : ne pas polluer back_tapped avec ce qui n'est pas une friction réelle.
 */
export function goBack(fallback: Href = DEFAULT_BACK, opts?: { silent?: boolean }): void {
  const canGoBack = router.canGoBack();
  if (!opts?.silent) {
    track(
      EVENTS.backTapped,
      canGoBack
        ? { had_history: true }
        : { had_history: false, to: typeof fallback === 'string' ? fallback : 'stack' },
    );
  }
  if (canGoBack) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
