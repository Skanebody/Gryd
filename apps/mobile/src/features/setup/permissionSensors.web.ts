/**
 * GRYD — E10 : ACCÈS AUX PERMISSIONS (variante WEB).
 *
 * Même surface que `permissionSensors.ts`, et une seule réponse : NON. C'est
 * la différence utile, exactement comme `LOCATION_CAPABLE` dans
 * `features/onboarding/locate.web.ts`.
 *
 * ─── POURQUOI `null` ET PAS UN PROVIDER QUI RÉPOND « REFUSÉ » ───────────────
 * · MOUVEMENTS. Le stub web d'expo-sensors ne compte aucun pas
 *   (node_modules/expo-sensors/build/ExponentPedometer.web.js : `isAvailableAsync`
 *   renvoie false, aucune fonction de permission). Et comme le wrapper JS sert
 *   alors `granted: true` par défaut, un provider web « honnête en apparence »
 *   afficherait « Autorisé » sur un navigateur incapable de compter un seul pas.
 *   Le seul état vrai est : cette capacité n'existe pas ici.
 * · RÉGLAGES SYSTÈME. Aucune API navigateur ne mène aux réglages de permission
 *   du navigateur ; `Linking.openSettings` n'existe pas sur react-native-web.
 *
 * L'écran n'a donc AUCUN bouton à peindre sur cette carte : il dit
 * « indisponible » et son CTA principal reste `CONTINUER`. L'absence d'un bouton
 * n'est pas un mensonge ; un bouton qui échoue toujours en est un (§A4).
 */
import type { PermissionSensor } from './permissionCards';

export const MOTION_SENSOR: PermissionSensor | null = null;
// `NOTIFICATIONS_SENSOR` a disparu des DEUX variantes le 10/09/2026 : E10 ne
// demande plus la permission de notification à froid (voir le bloc du bas de
// `permissionSensors.ts`). La surface des deux fichiers reste identique.
export const OPEN_APP_SETTINGS: (() => Promise<void>) | null = null;
