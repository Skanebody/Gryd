/**
 * GRYD — ROUTE DE COMPATIBILITÉ.
 *
 * `/activite` (planche E23) lisait `user_badges` et `territory_contests` : deux
 * sources d'AVANT la refonte, dont l'une mesure une mécanique que §5.3 a
 * supprimée (ni bouclier, ni contestation). Aucun écran n'y menait depuis des
 * semaines (aucun `router.push('/activite')` dans le dépôt), et sa cloche
 * (`useActivityBell`) n'était importée nulle part.
 *
 * Le centre d'activité de §14.2 vit désormais sur `/notifications` et lit les
 * faits que le serveur produit vraiment (migrations 0192-0193). On redirige
 * plutôt que de supprimer : un lien profond ou un retour arrière ne doit jamais
 * tomber sur une route morte.
 */
import { Redirect } from 'expo-router';

export default function ActiviteLegacyRoute() {
  return <Redirect href="/notifications" />;
}
