/**
 * GRYD — i18n : catalogue du domaine « démarrage » (écran E00).
 *
 * E00 n'affiche AUCUN texte visible : la spec dit « aucun slogan », et le seul
 * élément de marque est le wordmark GRYD, INVARIANT (jamais traduit, donc hors
 * catalogue — même règle que « GO » et « Crew »).
 *
 * Ce catalogue ne porte donc qu'une chose : l'étiquette LECTEUR D'ÉCRAN de
 * l'indicateur discret. Un indicateur purement graphique est muet pour VoiceOver
 * / TalkBack ; sans étiquette, un joueur non-voyant n'a aucun moyen de savoir
 * que l'app travaille encore. Elle n'est jamais peinte à l'écran.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  /**
   * `accessibilityLabel` de l'indicateur discret (jamais visible). Formulé
   * comme un ÉTAT, pas comme une promesse : « chargement » n'affirme rien sur
   * le joueur, ni sur ce qui va s'afficher ensuite.
   */
  loadingIndicator: {
    fr: 'Chargement',
    en: 'Loading',
    es: 'Cargando',
    de: 'Wird geladen',
    pt: 'A carregar',
  },
});
