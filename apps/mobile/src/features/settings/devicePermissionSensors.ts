/**
 * GRYD — RÉGLAGES › AUTORISATIONS : accès aux permissions (variante NATIVE).
 *
 * Même patron que `features/setup/permissionSensors.ts` : le fork de plateforme
 * est isolé ICI pour que `app/parametres/permissions.tsx` ne connaisse ni
 * expo-location ni expo-image-picker. Metro résout `.web.ts` sur le web.
 *
 * ⚠️ CE MODULE NE DEMANDE RIEN. Aucun `request*` n'est exposé, et c'est
 * délibéré : voir `devicePermissionRows.ts`. Il n'expose que `check()`, qui
 * n'ouvre aucun dialogue système.
 *
 * ─── QUATRE AUTORISATIONS, ET PAS UNE DE PLUS ───────────────────────────────
 * La règle : une ligne n'existe que si CE dépôt utilise vraiment la permission
 * ET que le build la déclare. Vérifié fichier par fichier, pas supposé.
 *  · POSITION — `expo-location`. Utilisée par toute la chaîne de course
 *    (`features/run/gps/*`, `mvp/run/gpsProvider.ts`). Déclarée : le plugin
 *    expo-location pose les trois clés iOS (app.json, `_ajout_locationAlways…`).
 *    On lit le PREMIER PLAN seulement : c'est celui dont dépend « GO ».
 *  · PHOTOS — `expo-image-picker`, photothèque. Utilisée par la photo de profil
 *    (`features/social/avatarPhoto.ts`) et l'import du studio de partage
 *    (`features/share/ShareStudio2026.tsx`).
 *  · APPAREIL PHOTO — `expo-image-picker`, caméra. Utilisée par la photo de
 *    profil. La purpose string est passée de `false` à un texte réel le
 *    10/09/2026 (app.json, `_ajout_cameraPermission_2026_09_10`) : avant ce
 *    jour, aucune ligne ne devait exister ici.
 *  · MOUVEMENT — réexporté de `features/setup/permissionSensors.ts`, jamais
 *    recodé. Deux sondes de podomètre dans deux fichiers finiraient par ne plus
 *    dire la même chose du même téléphone.
 *
 * Les NOTIFICATIONS n'ont volontairement AUCUNE ligne ici : leur état complet
 * (capacité du build, permission système, préférences serveur §14.1) a un seul
 * récit, dans Réglages › Notifications. En avoir un deuxième a déjà produit
 * dans ce dépôt deux écrans qui se contredisaient sur le même fait.
 */
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import type { PermissionProbe } from '../setup/permissionCards';
import type { DevicePermissionProbe } from './devicePermissionRows';

export { MOTION_SENSOR, OPEN_APP_SETTINGS } from '../setup/permissionSensors';

/** Forme commune des réponses expo-* → forme neutre du module pur. */
function toProbe(r: { status: string; canAskAgain: boolean; granted: boolean }): PermissionProbe {
  if (r.granted) return { status: 'granted', canAskAgain: r.canAskAgain };
  if (r.status === 'undetermined') return { status: 'undetermined', canAskAgain: r.canAskAgain };
  return { status: 'denied', canAskAgain: r.canAskAgain };
}

export const LOCATION_PERMISSION: DevicePermissionProbe | null = async () => {
  try {
    return toProbe(await Location.getForegroundPermissionsAsync());
  } catch {
    return null;
  }
};

export const PHOTOS_PERMISSION: DevicePermissionProbe | null = async () => {
  try {
    return toProbe(await ImagePicker.getMediaLibraryPermissionsAsync());
  } catch {
    return null;
  }
};

export const CAMERA_PERMISSION: DevicePermissionProbe | null = async () => {
  try {
    return toProbe(await ImagePicker.getCameraPermissionsAsync());
  } catch {
    return null;
  }
};
