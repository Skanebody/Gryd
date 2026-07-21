/**
 * GRYD — /crew-public : ROUTE ARCHIVÉE (fin du mode vitrine, 21/07/2026).
 *
 * Cette page affichait la fiche publique d'un crew INVENTÉ (`features/crew/
 * publicDemo`) : blason, ligue, membres, zones tenues, rôles recherchés — tout
 * fabriqué. Elle n'était atteignable que sous `isShowcasePlatform`, sinon elle
 * redirigeait déjà vers l'écran Crew réel. La vitrine étant abandonnée, la
 * branche démo n'a plus de porte d'entrée : il ne reste que la redirection.
 *
 * Pourquoi GARDER le fichier plutôt que le supprimer : la route est déclarée
 * dans `_layout.tsx` et donc atteignable par deep link (`gryd://crew-public`)
 * ou par un lien partagé avant aujourd'hui. Supprimer le fichier renverrait
 * l'utilisateur sur l'écran « unmatched route » d'expo-router ; le rediriger
 * l'amène là où l'information existe VRAIMENT — son propre crew.
 *
 * Aucun hook ici : la sortie anticipée est inoffensive par construction.
 * La vraie fiche publique de crew (données serveur) reste à construire.
 */
import { Redirect } from 'expo-router';

export default function CrewPublicRoute() {
  return <Redirect href="/crew" />;
}
