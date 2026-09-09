/**
 * GRYD — CE BUILD PEUT-IL RECEVOIR UN PUSH DISTANT ? Fonction PURE, testée.
 *
 * ─── LA FAUTE RÉPARÉE (10/09/2026) ─────────────────────────────────────────
 * `registerPushDevice` demandait la permission SYSTÈME de notification
 * (`requestPermissionsAsync`, push.ts:96) AVANT d'aller chercher le jeton
 * (`getExpoPushTokenAsync`, push.ts:121). Or sur iOS ce jeton ne peut PAS être
 * délivré : `plugins/withoutPushEntitlement.js` retire l'entitlement
 * `aps-environment` de chaque build, parce que le profil de provisioning ne
 * porte pas la capacité Push et qu'aucune clé APNs n'a été déposée.
 *
 * Conséquence exacte : la boîte système s'ouvrait, le joueur accordait — et la
 * suite échouait à coup sûr en `unavailable`. C'est le pire usage possible
 * d'une permission : Apple ne l'accorde qu'UNE fois (« Managing notifications »),
 * un refus se répare seulement dans les Réglages, et on la dépensait pour un
 * service qui ne peut rien délivrer. La permission de notification a une valeur
 * RÉELLE dans ce build — les rappels LOCAUX en dépendent — et on la brûlait
 * pour un push impossible.
 *
 * ─── COMMENT LA CAPACITÉ EST DÉRIVÉE : DU BUILD, PAS D'UN ÉCHEC ────────────
 * Pas d'un `try/catch`, pas d'une supposition de plateforme : de la LISTE DES
 * PLUGINS de la configuration Expo. `./plugins/withoutPushEntitlement` y figure
 * (apps/mobile/app.json) et c'est LUI qui supprime l'entitlement. Le fait est
 * donc déclaré au même endroit que sa cause : si un jour on retire ce plugin
 * pour remettre `expo-notifications` (les deux étapes de son en-tête), cette
 * fonction change d'avis toute seule, sans qu'on ait à s'en souvenir.
 *
 * Aucun import React/RN/Expo : la règle est pure, l'I/O reste au-dessus.
 */

/** Le plugin qui retire `aps-environment` — sa présence EST le verdict. */
export const WITHOUT_PUSH_ENTITLEMENT_PLUGIN = './plugins/withoutPushEntitlement';

export type RemotePushCapability =
  /** Le build peut demander un jeton : la chaîne distante a une chance. */
  | 'capable'
  /** iOS sans entitlement `aps-environment` : aucun jeton ne sera jamais émis. */
  | 'no_entitlement'
  /** Android sans `google-services.json` : FCM n'est pas configuré du tout. */
  | 'no_fcm_config'
  /** Web : il n'y a pas de push GRYD à activer ici. */
  | 'unsupported_platform';

/**
 * Forme d'une entrée de `expo.plugins` : soit `"nom"`, soit `["nom", options]`.
 * Typée large volontairement — la config est du JSON, elle n'est pas garantie.
 */
export type ExpoPluginEntry = string | readonly unknown[] | unknown;

/** Ce que la fonction lit de la configuration Expo, et rien d'autre. */
export interface RemotePushBuildFacts {
  /** `Constants.expoConfig?.plugins` — TEL QUEL, sans interprétation. */
  plugins: readonly ExpoPluginEntry[] | null | undefined;
  /** `Constants.expoConfig?.android?.googleServicesFile` — absent = pas de FCM. */
  googleServicesFile: string | null | undefined;
}

/** Le nom d'un plugin, quelle que soit sa forme. `null` = entrée illisible. */
function pluginName(entry: ExpoPluginEntry): string | null {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0];
  return null;
}

/**
 * Ce build peut-il obtenir un jeton de push distant ?
 *
 * Les DEUX plateformes sont tranchées par un FAIT DE BUILD, pas par un échec :
 *  · iOS     — le plugin qui retire `aps-environment` est-il monté ?
 *  · Android — `google-services.json` est-il déclaré ? Il ne l'est pas
 *    (app.json n'a pas de clé `android.googleServicesFile` et le fichier est
 *    absent du dépôt), donc FCM n'a aucune configuration à lire. Sans elle,
 *    `getExpoPushTokenAsync` échoue — mais l'échec arrivait APRÈS la boîte de
 *    permission, c'est-à-dire trop tard.
 *
 * @param platform `Platform.OS` — passé, jamais lu ici (module pur).
 * @param facts    ce que la configuration Expo déclare. Une config illisible
 *   (`null`) rend le verdict NÉGATIF : on ne peut pas PROUVER la capacité, et
 *   un « peut-être » se paierait par une permission système gaspillée.
 */
export function remotePushCapability(
  platform: string,
  facts: RemotePushBuildFacts,
): RemotePushCapability {
  if (platform === 'web') return 'unsupported_platform';
  if (platform === 'ios') {
    if (facts.plugins === null || facts.plugins === undefined) return 'no_entitlement';
    const names = facts.plugins.map(pluginName);
    return names.includes(WITHOUT_PUSH_ENTITLEMENT_PLUGIN) ? 'no_entitlement' : 'capable';
  }
  if (platform === 'android') {
    const file = facts.googleServicesFile;
    return typeof file === 'string' && file.length > 0 ? 'capable' : 'no_fcm_config';
  }
  // Plateforme inconnue (macOS Catalyst, windows…) : rien n'est prouvé.
  return 'unsupported_platform';
}

/**
 * Un push DISTANT est-il possible ? Un seul verdict positif, tout le reste est
 * un empêchement nommé — c'est ce booléen que `registerPushDevice` consulte
 * AVANT de toucher à la moindre permission système.
 */
export function remotePushPossible(capability: RemotePushCapability): boolean {
  return capability === 'capable';
}
