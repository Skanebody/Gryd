/**
 * GRYD — E48 · route `/crew-activite`.
 *
 * PORTE D'ENTRÉE (exigée par `node scripts/audit-routes.mjs`) : le lien
 * « Activité du crew » de l'onglet Crew (`features/crew/RealCrewScreen.tsx`,
 * bloc SIGNAUX). Une seule, et volontairement une seule : cet écran est un
 * approfondissement du fil déjà résumé dans l'onglet, pas une cinquième
 * destination de la barre.
 *
 * Fichier délibérément mince — tout l'écran vit dans
 * `features/crew/CrewActivityScreen.tsx`, testable et lisible hors du routeur
 * (patron `crew-discovery.tsx` / `crew-stats.tsx`).
 */
import { CrewActivityScreen } from '../src/features/crew/CrewActivityScreen';

export default function CrewActiviteRoute() {
  return <CrewActivityScreen />;
}
