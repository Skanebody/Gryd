/**
 * GRYD — registre des adaptateurs de sources (AMENDEMENT-15 §3).
 * Une entrée par source CONNECTABLE du catalogue (catalog.ts). GRYD Live GPS
 * n'a pas d'adaptateur : capture native, toujours active (« Actif » dans le
 * Hub). Le Verify Hub interroge status() de chaque adaptateur au montage et
 * n'affiche QUE ces états réels.
 *
 * PÉRIMÈTRE 5 (21/07/2026) : ne restent ici que les sources activables SANS
 * intervention du fondateur. Les adaptateurs des autres sont conservés, prêts
 * à l'emploi, mais volontairement NON enregistrés — sinon le Hub interrogerait
 * au montage des sources qu'il n'affiche plus :
 *  · ./strava        (OAuth + edge strava_import complets — manque les clés O7) ;
 *  · ./appleHealth   (chemin HealthKit documenté — manque l'entitlement + O8) ;
 *  · ./healthConnect (chemin androidx.health documenté — manque le module + O8).
 * Les re-brancher = une ligne ici + une entrée dans catalog.ts.
 */
import type { SourceAdapter } from './types';
import { gpxAdapter } from './gpx';

/** Adaptateur par clé de source (catalog.ts) — hors gryd_live (natif). */
export const SOURCE_ADAPTERS: Readonly<Record<string, SourceAdapter>> = {
  gpx: gpxAdapter,
};
