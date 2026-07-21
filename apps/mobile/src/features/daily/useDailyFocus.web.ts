/**
 * GRYD — useDailyFocus (WEB) : stub vitrine.
 * La Zone du Jour et le défi d'accueil n'existent que pour un VRAI joueur (vraie
 * ville, vraies captures, vrais compteurs). La vitrine web n'a ni session ni
 * base : elle n'affiche donc rien plutôt qu'une zone de démonstration — une zone
 * inventée serait un mensonge sur le monde réel (CLAUDE.md, catégorique).
 */
import type { UseDailyFocusResult } from './useDailyFocus';

export function useDailyFocus(): UseDailyFocusResult {
  return { focus: null, loading: false };
}
