/**
 * GRYD — types partagés des 6 schémas pédagogiques d'explicabilité (§31).
 * Chaque schéma est un composant PUR (aucun état, aucune dépendance runtime) :
 * il ne fait que DESSINER une règle. Les valeurs chiffrées visibles sont des
 * SCÉNARIOS DÉMO passés en props (défauts = exemples du doc : +214/+247/+33,
 * 79 %/21 %, 620 m), jamais des constantes de jeu copiées — les vraies
 * constantes (DEFENSE_HOURS_*, ZONE_DECAY_DAYS, VERIFY_FULL_MIN…) sont
 * injectées par les PAGES via des labels dérivés de game-rules.ts.
 */

/** Props communes à tous les schémas : taille responsive (largeur en px). */
export interface SchemaBaseProps {
  /**
   * Largeur cible en px (la hauteur suit le ratio du viewBox). Défaut : 280.
   * Le viewBox interne reste fixe → le tracé est net à toute échelle.
   */
  size?: number;
  /** Label d'accessibilité (défaut sensé par schéma). */
  accessibilityLabel?: string;
}
