/**
 * GRYD — route `/moderation` : la file de revue anti-triche (ADR-015, 0187).
 *
 * Ré-exportation PURE, comme le reste des écrans depuis ADR-012 : la
 * composition (et donc la navigation) vit dans le composant, pas dans le
 * fichier de route. `scripts/audit-routes.mjs` sait suivre cette forme.
 *
 * La PORTE de cet écran est conditionnelle : `app/parametres.tsx` ne peint la
 * ligne « Modération » que si `am_i_moderator_2026()` (0187) rend vrai. Un
 * joueur ordinaire qui atteindrait cette route malgré tout n'y trouve rien :
 * la file LÈVE `forbidden` côté serveur, et l'écran l'affiche honnêtement.
 */
export { default } from '../src/features/moderation/ReviewQueue2026';
