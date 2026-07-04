/**
 * GRYD — adaptateur Apple Health (AMENDEMENT-15 §3) : stub HONNÊTE.
 * HealthKit exige un DEV BUILD natif (O8) : entitlement
 * `com.apple.developer.healthkit` + NSHealthShareUsageDescription — aucune de
 * ces capacités n'existe en Expo Go ni sur le preview web. Plutôt que de
 * mentir avec un toggle démo, le Hub affiche « Dev build requis — O8 ».
 *
 * Chemin d'intégration documenté (à câbler dès O8, PAS de lib hors stack) :
 *  1. app.json → ios.entitlements['com.apple.developer.healthkit'] = true,
 *     ios.infoPlist.NSHealthShareUsageDescription (une phrase FR).
 *  2. Module natif (Expo Modules API) exposant HKHealthStore :
 *     requestAuthorization(read: [HKWorkoutType,
 *     HKQuantityType(distanceWalkingRunning), heartRate]) puis
 *     HKSampleQuery des HKWorkout .running récents (+ route via
 *     HKWorkoutRouteQuery quand dispo).
 *  3. Normalisation → IngestRunRequest source 'healthkit' (déjà supporté par
 *     ingest_run) : le serveur reste seul juge (validation §3.2, dédup
 *     Activity Hub, statut capture/stats selon trust).
 */
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

const SNAPSHOT: SourceAdapterSnapshot = {
  status: 'needs_dev_build',
  lastSync: null,
  detail: 'Dev build requis — O8',
};

export const appleHealthAdapter: SourceAdapter = {
  id: 'apple_health',
  trustLevel: 'high', // signal santé OS : import + vérif (catalog §6)
  status: () => Promise.resolve(SNAPSHOT),
  connect: () => Promise.resolve(SNAPSHOT), // CTA inactif tant que O8 est ouvert
  disconnect: () => Promise.resolve(SNAPSHOT),
};
