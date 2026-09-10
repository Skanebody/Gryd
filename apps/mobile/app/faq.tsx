/**
 * GRYD — `/faq` : route de COMPATIBILITÉ.
 *
 * Les questions fréquentes sont devenues le chapitre 08 du guide
 * « Comment ça marche » (retour fondateur du 10/09/2026 : une seule surface
 * d'explication, pas trois). Ce fichier reste pour les chemins écrits AVANT
 * ce chantier — lien profond, notification, capture d'écran d'un testeur —
 * et les emmène à l'endroit exact où vit désormais la réponse.
 *
 * Sa porte entrante est `/calcul-zones`, qui garde son lien « Questions
 * fréquentes » : la route n'est donc pas orpheline pour `scripts/audit-routes.mjs`.
 *
 * ⚠️ LA DESTINATION EST NOMMÉE À PART, ET CE N'EST PAS UN DÉTAIL DE STYLE.
 * L'extracteur de liens de l'audit (`LINK_RE`, scripts/audit-routes.mjs) n'admet
 * pas `?` ni `=` dans un chemin : un `href="/comment-ca-marche?chapitre=faq"`
 * écrit d'un seul tenant ne serait vu par lui comme AUCUN lien, et cette route
 * serait déclarée cul-de-sac (mesuré le 10/09/2026 — l'audit sortait en erreur).
 * La constante rend la destination lisible pour l'audit comme pour un humain.
 */
import { Redirect } from 'expo-router';

/** Le guide, et le chapitre où la FAQ vit désormais. */
const GUIDE = '/comment-ca-marche';
const CHAPTER = 'chapitre=faq';

export default function FaqCompatibilityRoute() {
  return <Redirect href={`${GUIDE}?${CHAPTER}`} />;
}
