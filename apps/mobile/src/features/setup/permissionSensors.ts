/**
 * GRYD — E10 : ACCÈS AUX DEUX PERMISSIONS (variante NATIVE).
 *
 * Même patron que `features/onboarding/locate.ts` / `locate.web.ts` : le fork de
 * plateforme est isolé ICI, pour que l'écran `app/setup/permissions.tsx` ne
 * connaisse ni expo-sensors ni expo-notifications. Metro résout
 * `permissionSensors.web.ts` sur web.
 *
 * ⚠️ CE MODULE NE DEMANDE RIEN TOUT SEUL. Il expose de quoi le faire ; l'appel
 * part d'un GESTE explicite du joueur, après avoir lu à quoi sert l'autorisation
 * — jamais au montage. (Règle de la spec E10 : « chaque permission est demandée
 * au moment de son bénéfice ».) Ce que l'écran fait au montage, c'est LIRE
 * l'état — `check()`, qui n'ouvre aucun dialogue.
 *
 * ─── `supported()` EST LA PIÈCE ANTI-BOUTON-MORT ────────────────────────────
 * Il sonde le CAPTEUR, pas la permission, parce que la permission ment sur les
 * plateformes sans implémentation native : `Pedometer.getPermissionsAsync()`
 * renvoie `granted: true` par défaut quand le module natif n'expose pas la
 * fonction (node_modules/expo-sensors/build/Pedometer.js). C'est aussi pour ça
 * que `supported()` est ASYNCHRONE ici alors que `LOCATION_CAPABLE` est une
 * constante : un podomètre n'est pas une propriété de la plateforme mais de
 * L'APPAREIL — beaucoup d'Android n'ont pas de `TYPE_STEP_COUNTER`, un
 * simulateur iOS n'a pas de `CMPedometer`. On ne peut donc pas le décider à la
 * compilation ; on le CONSTATE, et l'écran affiche « lecture en cours » pendant
 * ce temps au lieu d'affirmer quoi que ce soit.
 *
 * ─── LES DEUX PERMISSIONS SONT BIEN DÉCLARÉES (vérifié, pas supposé) ────────
 * · Mouvements — iOS : `NSMotionUsageDescription` via les options du plugin
 *   `expo-sensors` (apps/mobile/app.json). Android : `ACTIVITY_RECOGNITION`,
 *   déclarée par le manifeste de la bibliothèque
 *   (node_modules/expo-sensors/android/src/main/AndroidManifest.xml) et fusionnée
 *   au build — elle n'a donc pas à figurer dans `android.permissions`.
 * · Notifications — iOS : entitlement `aps-environment` posé par le plugin
 *   `expo-notifications` (app.json). Android 13+ : `POST_NOTIFICATIONS`, déclarée
 *   par le manifeste de la bibliothèque (même mécanique).
 * Sans ces déclarations, la demande échouerait à coup sûr et il ne faudrait
 * peindre aucune carte — ce n'est pas le cas ici.
 *
 * ─── CE QUE CE MODULE NE FAIT PAS, ET POURQUOI ──────────────────────────────
 * Il n'enregistre PAS l'appareil pour le push serveur (`features/notifications/
 * push.ts`). E10 obtient l'autorisation SYSTÈME ; l'état de la chaîne push (token
 * Expo, credentials APNs/FCM) a déjà son écran et son diagnostic honnête dans
 * Réglages › Notifications. Le dupliquer ici produirait deux récits pour une
 * seule situation — c'est l'arbitrage déjà pris pour la position en E05, qui
 * demande la permission sans refaire le travail de la carte.
 */
import { Linking } from 'react-native';
import { Pedometer } from 'expo-sensors';
import type { PermissionProbe, PermissionSensor } from './permissionCards';

/** Forme commune des réponses expo-* → forme neutre du module pur. */
function toProbe(r: { status: string; canAskAgain: boolean; granted: boolean }): PermissionProbe {
  if (r.granted) return { status: 'granted', canAskAgain: r.canAskAgain };
  if (r.status === 'undetermined') return { status: 'undetermined', canAskAgain: r.canAskAgain };
  return { status: 'denied', canAskAgain: r.canAskAgain };
}

// ─── Mouvements et activité physique (podomètre) ─────────────────────────────
//
// À QUOI ÇA SERT VRAIMENT, dans CE dépôt : `run/gps/tracker.ts` s'abonne à
// `Pedometer.watchStepCount` pendant la course, le cumul part dans le payload et
// le serveur en dérive `motionTrust` (packages/engine/src/validation.ts) — le
// signal qui distingue une foulée d'un trajet motorisé. Sans podomètre, le champ
// est simplement absent et `motionTrust` reste NEUTRE : refuser ne pénalise rien.

export const MOTION_SENSOR: PermissionSensor | null = {
  async supported() {
    try {
      return await Pedometer.isAvailableAsync();
    } catch {
      return false;
    }
  },
  async check() {
    try {
      return toProbe(await Pedometer.getPermissionsAsync());
    } catch {
      return null;
    }
  },
  async request() {
    try {
      return toProbe(await Pedometer.requestPermissionsAsync());
    } catch {
      return null;
    }
  },
};

// ─── Notifications ───────────────────────────────────────────────────────────
//
// Module chargé PARESSEUSEMENT (patron `features/notifications/push.ts` et
// `localReminder.ts`) : sur un build antérieur à l'ajout d'expo-notifications,
// l'app ne plante pas — la carte dit « indisponible » et ne peint aucun bouton.

type NotificationsModule = typeof import('expo-notifications');

function loadNotifications(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('[GRYD] expo-notifications absent de ce build', e);
    return null;
  }
}

export const NOTIFICATIONS_SENSOR: PermissionSensor | null = {
  async supported() {
    return loadNotifications() !== null;
  },
  async check() {
    const N = loadNotifications();
    if (N === null) return null;
    try {
      return toProbe(await N.getPermissionsAsync());
    } catch {
      return null;
    }
  },
  async request() {
    const N = loadNotifications();
    if (N === null) return null;
    try {
      return toProbe(await N.requestPermissionsAsync());
    } catch {
      return null;
    }
  },
};

/**
 * Réglages système de l'app — la SEULE action encore vivante quand une
 * permission est bloquée définitivement. `Linking.openSettings()` peut rejeter
 * (aucune app de réglages atteignable) : l'écran le dit alors, il ne fait pas
 * semblant.
 */
export const OPEN_APP_SETTINGS: (() => Promise<void>) | null = () => Linking.openSettings();
