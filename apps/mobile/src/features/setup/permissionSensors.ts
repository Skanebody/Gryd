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
 * Sans cette déclaration, la demande échouerait à coup sûr et il ne faudrait
 * peindre aucune carte — ce n'est pas le cas ici.
 * · Notifications — plus rien à déclarer ici : ce module n'expose plus de
 *   provider de notification (voir le bloc du bas). L'entitlement iOS
 *   `aps-environment` est d'ailleurs RETIRÉ de chaque build par
 *   `plugins/withoutPushEntitlement.js`.
 *
 * ─── CE QUE CE MODULE NE FAIT PAS, ET POURQUOI ──────────────────────────────
 * Il ne touche plus du tout aux notifications — ni permission, ni
 * enregistrement d'appareil. L'état complet de la chaîne (capacité du build,
 * permission, préférences §14.1) a un seul récit, dans Réglages ›
 * Notifications. En avoir un deuxième ici avait produit exactement ce que ce
 * dépôt appelle un mensonge : E10 disait « Autorisé » pendant que Réglages
 * disait « pas encore disponibles », pour le même fait.
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

// ─── Notifications : PLUS DE PROVIDER ICI (10/09/2026) ──────────────────────
//
// `NOTIFICATIONS_SENSOR` vivait ici et E10 s'en servait pour demander la
// permission système AU PREMIER LANCEMENT. C'est exactement ce que l'en-tête de
// ce fichier interdit — « chaque permission est demandée au moment de son
// bénéfice » — et le cahier §14.1 le redit derrière Apple. Pire : la permission
// partait pour un push DISTANT que ce build ne peut pas recevoir
// (`plugins/withoutPushEntitlement.js` retire `aps-environment` ; aucun
// `google-services.json` n'existe), et iOS ne présente cette boîte qu'UNE fois
// — un refus à froid condamnait aussi les rappels LOCAUX, seule chose que GRYD
// sache réellement envoyer aujourd'hui.
//
// La permission de notification est désormais demandée par le module qui a
// quelque chose à programmer, à l'instant où il le programme :
// `features/notifications/localReminder.ts` et `resultReadyNotice.ts`. Aucune
// autre entrée ne doit exister : un provider ici serait la tentation permanente
// de la redemander à froid.

/**
 * Réglages système de l'app — la SEULE action encore vivante quand une
 * permission est bloquée définitivement. `Linking.openSettings()` peut rejeter
 * (aucune app de réglages atteignable) : l'écran le dit alors, il ne fait pas
 * semblant.
 */
export const OPEN_APP_SETTINGS: (() => Promise<void>) | null = () => Linking.openSettings();
