/**
 * GRYD — registre des adaptateurs de sources (AMENDEMENT-15 §3).
 * Une entrée par source CONNECTABLE du catalogue (catalog.ts). GRYD Live GPS
 * n'a pas d'adaptateur : capture native, toujours active (« Actif » dans le
 * Hub). Le Verify Hub interroge status() de chaque adaptateur au montage et
 * n'affiche QUE ces états réels.
 */
import type { SourceAdapter } from './types';
import { appleHealthAdapter } from './appleHealth';
import { healthConnectAdapter } from './healthConnect';
import { stravaAdapter } from './strava';
import { comingSoonAdapter } from './watches';

/** Adaptateur par clé de source (catalog.ts) — hors gryd_live (natif). */
export const SOURCE_ADAPTERS: Readonly<Record<string, SourceAdapter>> = {
  apple_health: appleHealthAdapter,
  health_connect: healthConnectAdapter,
  strava: stravaAdapter,
  garmin: comingSoonAdapter('garmin'),
  whoop: comingSoonAdapter('whoop'),
  fitbit: comingSoonAdapter('fitbit'),
  polar: comingSoonAdapter('polar'),
  coros: comingSoonAdapter('coros'),
  suunto: comingSoonAdapter('suunto'),
};
