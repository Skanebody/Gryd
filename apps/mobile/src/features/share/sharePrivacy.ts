/**
 * GRYD — MASQUAGE PRIVACY DES TRACES PARTAGÉES : LA FAÇADE MOBILE.
 *
 * ⚠️ LA LOGIQUE N'EST PLUS ICI (28/07/2026). Elle vit dans le MOTEUR —
 * `packages/engine/src/tracePrivacy.ts` — et ce fichier ne fait plus que la
 * réexporter en lui donnant les constantes de jeu par défaut.
 *
 * POURQUOI ELLE A DÉMÉNAGÉ. `ingest_run` doit désormais persister une trace
 * masquée dans `runs.polyline_masked`, donc exécuter ce pipeline CÔTÉ SERVEUR.
 * Et ce dépôt a appris deux fois en juillet 2026 — les zones d'un rival, puis le
 * mode discret du classement — qu'une protection de vie privée appliquée côté
 * client ne protège personne : la donnée fine avait déjà quitté le serveur.
 * Une protection s'exécute là où la donnée est ÉCRITE.
 *
 * CE QUE CETTE FAÇADE GARANTIT. Le partage et l'ingestion masquent
 * RIGOUREUSEMENT pareil, parce qu'ils appellent le même code. La trace stockée
 * en base ne peut donc pas être plus précise que ce que le joueur accepte déjà
 * de publier. Une seule règle de confidentialité dans tout le produit.
 *
 * Le raisonnement complet (pourquoi la simplification vient en dernier, pourquoi
 * « autour » et pas seulement « le long de », ce que Douglas-Peucker ne garantit
 * PAS, pourquoi on préfère une trace vide à un masquage insuffisant) est dans
 * l'en-tête du module moteur. Il n'est pas dupliqué ici : deux copies d'un
 * raisonnement finissent toujours par diverger.
 */
import { SHARE_SIMPLIFY_EPSILON_M, SHARE_TRIM_M } from '@klaim/shared';
// ⚠️ COPIE GÉNÉRÉE, PAS UN IMPORT PROFOND. `./engine/tracePrivacy` est produit
// par `scripts/sync-game-rules.mjs` (cible `MOBILE_ENGINE_TARGETS`) et son
// non-drift est prouvé côté Deno (`ingest_run/mobile_gps_drift_test.ts`).
// POURQUOI une copie et non `@klaim/engine/src/tracePrivacy` : ce module a un
// import de VALEUR (`./polygon.ts`), et le tsconfig Expo refuse l'extension
// `.ts` que Deno exige. Le générateur retire l'extension. Un import profond
// marchait pour `polygon.ts` seul — son unique import est un `import type`,
// effacé à la compilation — mais il ne marche pas dès qu'un import de valeur
// existe. NE PAS ÉDITER les fichiers de `./engine/`.
import {
  applyTracePrivacy,
  applyPrivacyZones,
  haversineM,
  trimTraceEnds,
  type PrivacyZone,
} from './engine/tracePrivacy';
import type { LatLngPoint } from '../map/realAnchors';

export { applyPrivacyZones, haversineM, trimTraceEnds };
export type { PrivacyZone };

/**
 * Mètres masqués à CHAQUE extrémité de la trace partagée. Ré-exporté ici parce
 * que c'est le point d'entrée mobile du masquage (l'écran Confidentialité
 * l'importe pour ANNONCER la distance réellement appliquée) — la valeur, elle,
 * vient de `packages/shared/src/game-rules.ts` (§12.1), source unique.
 */
export { SHARE_TRIM_M };

/**
 * Tolérance (m) de la simplification appliquée à TOUT ce qui reste après
 * masquage. Ré-exportée pour la même raison que `SHARE_TRIM_M` : qui veut
 * ANNONCER la dégradation doit lire la valeur réellement appliquée.
 */
export { SHARE_SIMPLIFY_EPSILON_M };

/**
 * LE POINT D'ENTRÉE DU PARTAGE. Applique le pipeline du moteur avec les
 * constantes de jeu du produit.
 *
 * Le moteur, lui, ne connaît AUCUNE constante : il les reçoit. C'est ce qui
 * permet à `ingest_run` d'appeler exactement le même code avec exactement les
 * mêmes valeurs, sans que le moteur ait à importer game-rules.
 *
 * `simplifyM` est plafonné par le bas à `SHARE_SIMPLIFY_EPSILON_M` : un appelant
 * peut flouter DAVANTAGE, jamais moins — une valeur plus fine publierait une
 * trace plus précise que ce que la règle §12.1 promet.
 */
export function applySharePrivacy(
  trace: readonly LatLngPoint[],
  trimM: number = SHARE_TRIM_M,
  zones: readonly PrivacyZone[] = [],
  simplifyM: number = SHARE_SIMPLIFY_EPSILON_M,
): readonly LatLngPoint[] {
  return applyTracePrivacy(
    trace,
    trimM,
    zones,
    Math.max(SHARE_SIMPLIFY_EPSILON_M, simplifyM),
  );
}
