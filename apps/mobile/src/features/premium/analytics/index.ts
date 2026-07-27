/**
 * GRYD — E66 « Analyse territoriale » : la porte d'entrée du sous-domaine.
 *
 * Deux couches, dans l'ordre de pureté :
 *   · `derive` — PUR, testé sous Deno (`derive.test.ts`), `nowMs` injecté ;
 *   · `read`   — la SEULE frontière Supabase, et la machine d'états de l'écran.
 *
 * ANTI PAY-TO-WIN (§1.6) : rien d'exporté ici ne doit être lu par le moteur de
 * capture, de défense ou de classement. Cette analyse EXPLIQUE le territoire
 * déjà acquis ; elle n'en donne, n'en protège et n'en priorise aucun.
 *
 * §12 / E66 : rien d'exporté ici n'accepte ni ne rend une donnée d'autrui —
 * voir les en-têtes des deux modules, où la règle est appliquée par la FORME
 * des types et par les colonnes demandées au serveur, pas par une consigne.
 */
export {
  TERRITORY_ANALYTICS_WINDOW_DAYS,
  centerLatitudeOf,
  deriveTerritoryAnalytics,
  heatRings,
  metersPerDegreeLng,
} from './derive';
export type {
  AnalyticsWindow,
  DeriveAnalyticsInput,
  OwnContestRow,
  OwnedTerritoryRow,
  TerritoryAnalytics,
  ZoneAnalytics,
} from './derive';
export { useTerritoryAnalytics } from './read';
export type { AnalyticsStatus, UseTerritoryAnalyticsResult } from './read';
