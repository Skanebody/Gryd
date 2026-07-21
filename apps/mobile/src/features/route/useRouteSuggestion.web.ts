/**
 * GRYD — useRouteSuggestion (WEB) : stub vitrine.
 * La vitrine n'a ni session ni base : aucun profil d'habitudes ne peut exister,
 * donc on renvoie la distance par défaut ANNONCÉE comme telle (`unavailable`) —
 * jamais un « adapté à tes habitudes » sur un visiteur dont on ne sait rien.
 * Même patron que useDailyFocus.web.ts.
 */
import { resolveRouteSuggestion, type SuggestionBounds } from './suggestion';
// Le doublon features/route/routePrefs.ts a été supprimé (deux magasins
// homonymes : l'écran de réglages écrivait dans l'un, le planificateur lisait
// l'autre — les réglages ne pilotaient rien). Source unique : le store serveur.
import { GEN_DEFAULT_KM, GEN_MAX_KM, GEN_MIN_KM, GEN_STEP_KM } from './generator';
import type { UseRouteSuggestionResult } from './useRouteSuggestion';

const BOUNDS: SuggestionBounds = {
  minKm: GEN_MIN_KM,
  maxKm: GEN_MAX_KM,
  stepKm: GEN_STEP_KM,
  fallbackKm: GEN_DEFAULT_KM,
};

export function useRouteSuggestion(): UseRouteSuggestionResult {
  return {
    // Pas de réglage à honorer non plus : la vitrine n'a pas de compte, donc
    // ni distance choisie ni apprentissage. `resolveRouteSuggestion` retombe
    // sur `fallbackKm` et l'annonce comme `unavailable`.
    suggestion: resolveRouteSuggestion(
      { kind: 'unavailable' },
      { manualKm: null, learningEnabled: false },
      BOUNDS,
    ),
    loading: false,
  };
}
