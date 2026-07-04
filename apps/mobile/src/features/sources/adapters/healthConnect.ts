/**
 * GRYD — adaptateur Health Connect (Android) (AMENDEMENT-15 §3) : stub HONNÊTE.
 * L'API Health Connect (androidx.health.connect) exige un DEV BUILD natif
 * (O8) : déclaration <queries> du provider + permissions
 * android.permission.health.READ_EXERCISE / READ_DISTANCE — indisponible en
 * Expo Go et sur le web. Statut affiché : « Dev build requis — O8 ».
 *
 * Chemin d'intégration documenté (à câbler dès O8, PAS de lib hors stack) :
 *  1. app.json → android.permissions health.READ_EXERCISE + READ_DISTANCE,
 *     intent-filter ACTION_SHOW_PERMISSIONS_RATIONALE.
 *  2. Module natif (Expo Modules API) sur HealthConnectClient :
 *     getGrantedPermissions() → permissionController.requestPermissions(),
 *     puis readRecords(ExerciseSessionRecord, type RUNNING) + DistanceRecord
 *     agrégé par session (route GPS via ExerciseRoute quand exposée).
 *  3. Normalisation → IngestRunRequest source 'healthkit' (même canal santé
 *     OS qu'Apple Health côté ingest_run) : décision 100 % serveur.
 */
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

const SNAPSHOT: SourceAdapterSnapshot = {
  status: 'needs_dev_build',
  lastSync: null,
  detail: 'Dev build requis — O8',
};

export const healthConnectAdapter: SourceAdapter = {
  id: 'health_connect',
  trustLevel: 'high', // signal santé OS : import + vérif (catalog §6)
  status: () => Promise.resolve(SNAPSHOT),
  connect: () => Promise.resolve(SNAPSHOT), // CTA inactif tant que O8 est ouvert
  disconnect: () => Promise.resolve(SNAPSHOT),
};
