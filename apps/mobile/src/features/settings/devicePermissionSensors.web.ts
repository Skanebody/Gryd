/**
 * GRYD — RÉGLAGES › AUTORISATIONS : accès aux permissions (variante WEB).
 *
 * Même surface que `devicePermissionSensors.ts`, et une seule réponse : NON.
 * C'est la différence utile, exactement comme `LOCATION_CAPABLE` dans
 * `features/onboarding/locate.web.ts`.
 *
 * ─── POURQUOI `null` PLUTÔT QU'UNE SONDE QUI RÉPONDRAIT « REFUSÉ » ──────────
 * · POSITION. Le navigateur n'a pas d'équivalent de
 *   `getForegroundPermissionsAsync` (`features/map/webGeolocation.ts` le dit
 *   déjà : l'état ne se connaît qu'en demandant). Peindre « refusée » sans
 *   avoir demandé serait une accusation inventée.
 * · PHOTOS / APPAREIL PHOTO. Le web ouvre un sélecteur de fichiers ; il n'y a
 *   pas de permission persistée à lire, donc rien à afficher.
 * · RÉGLAGES SYSTÈME. Aucune API navigateur ne mène aux réglages du navigateur,
 *   et `Linking.openSettings` n'existe pas sur react-native-web.
 *
 * L'écran n'a donc AUCUN bouton à peindre : il dit « indisponible sur cette
 * plateforme ». L'absence d'un bouton n'est pas un mensonge ; un bouton qui
 * échoue toujours en est un.
 */
import type { DevicePermissionProbe } from './devicePermissionRows';

export { MOTION_SENSOR, OPEN_APP_SETTINGS } from '../setup/permissionSensors';

export const LOCATION_PERMISSION: DevicePermissionProbe | null = null;
export const PHOTOS_PERMISSION: DevicePermissionProbe | null = null;
export const CAMERA_PERMISSION: DevicePermissionProbe | null = null;
