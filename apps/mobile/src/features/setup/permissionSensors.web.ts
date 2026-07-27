/**
 * GRYD — E10 : ACCÈS AUX DEUX PERMISSIONS (variante WEB).
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
 * · NOTIFICATIONS. Le bénéfice promis par la carte est une notification
 *   TACTIQUE reçue sur le téléphone, hors de l'app. L'aperçu web n'a ni token
 *   Expo Push ni cette chaîne : peindre « Autoriser les notifications » y serait
 *   un bouton mort au sens strict — il aboutirait, sans que rien n'arrive jamais.
 * · RÉGLAGES SYSTÈME. Aucune API navigateur ne mène aux réglages de permission
 *   du navigateur ; `Linking.openSettings` n'existe pas sur react-native-web.
 *
 * L'écran n'a donc AUCUN bouton à peindre sur ces deux cartes : il dit
 * « indisponible » et son CTA principal reste `CONTINUER`. L'absence d'un bouton
 * n'est pas un mensonge ; un bouton qui échoue toujours en est un (§A4).
 */
import type { PermissionSensor } from './permissionCards';

export const MOTION_SENSOR: PermissionSensor | null = null;
export const NOTIFICATIONS_SENSOR: PermissionSensor | null = null;
export const OPEN_APP_SETTINGS: (() => Promise<void>) | null = null;
