/**
 * GRYD — E10 « Permissions utiles » : LA MACHINE À ÉTATS DES DEUX CARTES.
 *
 * Module PUR (zéro React, zéro import natif, testable en Deno). Il ne demande
 * rien et ne lit aucun capteur : il traduit ce que l'OS a RÉPONDU en ce que
 * l'écran a le droit de DIRE, et en ce qu'il a le droit de PEINDRE.
 *
 * ─── POURQUOI CETTE LOGIQUE VIT ICI ET PAS DANS LE JSX ──────────────────────
 * Le cœur de E10 n'est pas sa mise en page, c'est « aucun bouton mort » (§A4) :
 * la décision « je peins un bouton / je n'en peins pas » doit être vérifiable
 * sans lancer l'app. Elle est donc une fonction pure + des tests.
 *
 * ─── LES SEPT ÉTATS, ET POURQUOI AUCUN NE PEUT ÊTRE FUSIONNÉ ────────────────
 * La constitution exige quatre états jamais confondus (pas connecté / vide /
 * échec / lecture EN COURS). Transposés à une permission, il en faut sept :
 *
 *   · `checking`     — LECTURE EN COURS. On interroge l'OS. On n'affirme RIEN
 *                      sur le joueur : ni « refusé », ni « accordé ». C'est
 *                      exactement « un chargement n'affirme rien ».
 *   · `undetermined` — jamais demandée. Le dialogue système n'est jamais tombé.
 *                      Ce n'est PAS un refus : afficher « Refusé » ici serait
 *                      inventer une décision que le joueur n'a pas prise.
 *   · `asking`       — le dialogue système est ouvert. État transitoire, mais
 *                      distinct : le bouton se verrouille au lieu d'empiler
 *                      deux demandes.
 *   · `granted`      — CONSTATÉ par l'OS (jamais supposé après un tap).
 *   · `denied`       — refusée, et l'OS accepte encore qu'on redemande
 *                      (Android avant « ne plus demander »). Le bouton marche
 *                      encore : on le garde.
 *   · `blocked`      — refusée DÉFINITIVEMENT (`canAskAgain === false` : le cas
 *                      normal sur iOS dès le premier refus). Redemander
 *                      n'ouvrirait plus rien → ce serait LE bouton mort. On
 *                      montre à la place la seule action qui marche encore :
 *                      les réglages système.
 *   · `unavailable`  — la plateforme ou l'appareil n'a pas la capacité (aperçu
 *                      web, téléphone sans podomètre, module absent du build).
 *                      Aucun bouton n'est peint : « l'absence d'un bouton n'est
 *                      pas un mensonge, un bouton qui échoue toujours en est un ».
 *
 * ⚠️ PIÈGE RÉEL DU DÉPÔT, ET LA RAISON D'ÊTRE DE `unavailable`.
 * `Pedometer.getPermissionsAsync()` d'expo-sensors répond `granted: true` SANS
 * rien demander quand l'implémentation native n'existe pas
 * (node_modules/expo-sensors/build/Pedometer.js → `defaultPermissionsResponse`,
 * servi dès que `ExponentPedometer.getPermissionsAsync` est absent — c'est le
 * cas du stub web `ExponentPedometer.web.js`). Une carte qui déduirait son état
 * de la RÉPONSE DE PERMISSION afficherait donc « Autorisé » sur un navigateur
 * qui n'a aucun podomètre. D'où la règle : la capacité se sonde par le CAPTEUR
 * (`isAvailableAsync`, plus le fork de plateforme), jamais par la permission —
 * et `unavailable` gagne toujours sur tout le reste (voir `cardState`).
 */
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/setupPermissions';

/** Ce que l'OS répond quand on l'interroge (forme commune expo-*). */
export interface PermissionProbe {
  status: 'granted' | 'undetermined' | 'denied';
  /** false = le dialogue système ne reparaîtra plus (seuls les réglages peuvent). */
  canAskAgain: boolean;
}

/**
 * Contrat d'accès à UNE permission. Il vit dans le module PUR (et non dans
 * `permissionSensors.ts`) pour que la variante web puisse le référencer sans
 * importer son propre jumeau natif — les deux forks n'ont alors aucun lien entre
 * eux, ni de type ni de valeur.
 */
export interface PermissionSensor {
  /** La capacité existe-t-elle VRAIMENT sur cet appareil ? (sonde, pas supposition) */
  supported: () => Promise<boolean>;
  /** Lit l'état sans ouvrir de dialogue. `null` = impossible à savoir. */
  check: () => Promise<PermissionProbe | null>;
  /** Ouvre le dialogue système. `null` = la demande n'a rien pu produire. */
  request: () => Promise<PermissionProbe | null>;
}

export type PermissionCardState =
  | 'checking'
  | 'undetermined'
  | 'asking'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

/** Le bouton que la carte a le droit de peindre — `none` = elle n'en peint aucun. */
export type PermissionCardAction = 'none' | 'ask' | 'open_settings';

/**
 * État de la carte à partir des DEUX faits indépendants : le capteur existe-t-il
 * ici, et qu'a répondu l'OS.
 *
 * `supported === false` court-circuite tout : sans capteur, la réponse de
 * permission ne veut rien dire (voir le piège documenté en tête de fichier).
 * `probe === null` = l'interrogation a échoué/levé → on ne sait pas, et on ne
 * DEVINE pas : indisponible, donc aucun bouton.
 */
export function cardState(
  supported: boolean,
  probe: PermissionProbe | null,
): PermissionCardState {
  if (!supported) return 'unavailable';
  if (probe === null) return 'unavailable';
  if (probe.status === 'granted') return 'granted';
  if (probe.status === 'undetermined') return 'undetermined';
  return probe.canAskAgain ? 'denied' : 'blocked';
}

/**
 * Le bouton de la carte. `asking` garde `ask` (le bouton reste en place, en
 * chargement) : le faire disparaître pendant le dialogue système ferait sauter
 * la mise en page sous le doigt.
 */
export function cardAction(state: PermissionCardState): PermissionCardAction {
  switch (state) {
    case 'undetermined':
    case 'denied':
    case 'asking':
      return 'ask';
    case 'blocked':
      return 'open_settings';
    case 'checking':
    case 'granted':
    case 'unavailable':
      return 'none';
  }
}

/**
 * Un tap sur « Autoriser » est-il légitime dans cet état ? Sépare l'INTENTION
 * (le bouton est peint) de l'EXÉCUTION (on n'empile pas deux dialogues, on ne
 * demande rien pendant la lecture initiale).
 */
export function canAsk(state: PermissionCardState): boolean {
  return state === 'undetermined' || state === 'denied';
}

/** L'OS a-t-il CONSTATÉ l'autorisation ? (jamais « probablement ».) */
export function isGranted(state: PermissionCardState): boolean {
  return state === 'granted';
}

/**
 * Valeur de `result` pour `permission_motion` / `permission_notifications`
 * (ensemble FERMÉ défini dans packages/shared/src/events.ts). `null` = il n'y a
 * rien à mesurer : une lecture en cours ou un dialogue ouvert n'est pas un
 * résultat, et l'envoyer fabriquerait un refus qui n'a pas eu lieu.
 */
export function analyticsResult(
  state: PermissionCardState,
): 'granted' | 'denied' | 'blocked' | 'unavailable' | null {
  switch (state) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'blocked':
      return 'blocked';
    case 'unavailable':
      return 'unavailable';
    case 'checking':
    case 'undetermined':
    case 'asking':
      return null;
  }
}

/**
 * LA LIGNE D'ÉTAT de chaque carte — une table exhaustive, donc vérifiable.
 * `null` = aucune ligne : l'état est déjà porté par le bouton lui-même
 * (`undetermined` : « Autoriser… » ; `asking` : le même bouton en chargement).
 * Écrire deux fois la même chose serait du bruit (§A « comprendre en < 3 s »).
 */
export const MOTION_LINE: Readonly<Record<PermissionCardState, Entry | null>> = {
  checking: C.checking,
  undetermined: null,
  asking: null,
  granted: C.motionGranted,
  denied: C.motionDenied,
  blocked: C.motionBlocked,
  unavailable: C.motionUnavailable,
};

export const NOTIFICATIONS_LINE: Readonly<Record<PermissionCardState, Entry | null>> = {
  checking: C.checking,
  undetermined: null,
  asking: null,
  granted: C.notificationsGranted,
  denied: C.notificationsDenied,
  blocked: C.notificationsBlocked,
  unavailable: C.notificationsUnavailable,
};

// ═══════════════════════════════════════════════════════════════════════════
// LE 8e ÉTAT : « AUTORISÉ » NE VEUT PAS DIRE « TU RECEVRAS » (27/07/2026)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * ─── LE DÉFAUT QUE CETTE SECTION CORRIGE ────────────────────────────────────
 * E10 peignait « Autoriser les notifications », puis « Autorisé », et la copie
 * annonçait le contenu attendu (« une zone qu'on te prend, une défense qui
 * expire, ton crew qui t'appelle »). Or l'autorisation SYSTÈME et la CAPACITÉ À
 * DÉLIVRER sont deux faits distincts : tant que les credentials APNs/FCM ne sont
 * pas déposés sur EAS (app.json `_note_push_perimetre3`), `getExpoPushTokenAsync`
 * échoue et aucun de ces trois messages ne peut arriver. Le même binaire le
 * disait déjà ailleurs — `app/parametres/[section].tsx` mappe le statut
 * `unavailable` sur « Pas encore disponibles sur cette version de l'app » — et
 * c'est l'écran d'onboarding, celui que 100 % des nouveaux voient, qui portait
 * la version optimiste. Deux écrans, deux récits d'une même situation.
 *
 * ─── POURQUOI PAS UN 8e ÉTAT DANS `PermissionCardState` ────────────────────
 * Parce que ce n'en est pas un. `PermissionCardState` décrit ce que l'OS a
 * répondu ; la délivrabilité décrit la chaîne push (module natif, session,
 * token, serveur). Les fondre produirait un état qui ne serait ni l'un ni
 * l'autre. On ajoute donc une SECONDE ligne, sous la première, et elle n'existe
 * que là où elle a un sens : après un `granted`.
 */

/**
 * Miroir LITTÉRAL de `PushStatus` (`features/notifications/push.ts`) — et PAS un
 * `import type`, exactement pour la raison que `notifPrefs.ts` documente déjà
 * pour `NotifChannel` : `push.ts` importe `react-native`, `AsyncStorage`,
 * `expo-constants` et le client Supabase, et Deno type-checke le FICHIER entier,
 * pas le seul symbole référencé. L'importer ici sortirait ce module du domaine
 * pur et casserait `npm run test:mobile`.
 *
 * L'ÉGALITÉ DES DEUX UNIONS N'EST PAS LAISSÉE À LA VIGILANCE : `app/setup/
 * permissions.tsx` porte deux affectations croisées (`PushStatus` →
 * `PushDeliveryProbe` et retour) que `tsc` refuse à la moindre divergence.
 */
export type PushDeliveryProbe =
  | 'idle'
  | 'unsupported'
  | 'module_missing'
  | 'permission_denied'
  | 'not_configured'
  | 'unavailable'
  | 'error'
  | 'registered';

/**
 * La ligne de DÉLIVRABILITÉ sous la carte notifications. `null` = on ne dit
 * rien, et c'est le cas le plus fréquent — parce qu'on ne SAIT rien.
 *
 * Trois principes, dans cet ordre :
 *  1. tant que l'OS n'a pas accordé, la question ne se pose pas : la carte parle
 *    déjà de la permission, et une phrase sur la livraison serait une réponse à
 *    une question que personne n'a posée ;
 *  2. `idle` = l'enregistrement n'a PAS encore été tenté. On ne conclut pas —
 *    « un chargement n'affirme rien » ;
 *  3. chaque échec a sa CAUSE, et elles ne sont pas interchangeables : « pas de
 *    compte » n'est pas « pas encore disponible sur cette version », et l'une
 *    des deux serait fausse à la place de l'autre.
 *
 * `permission_denied` rend `null` volontairement : l'OS a repris la main entre
 * temps, et c'est `PermissionCardState` qui le dira à la prochaine relecture —
 * pas deux phrases contradictoires dans la même carte.
 */
export function notificationsDeliveryLine(
  state: PermissionCardState,
  probe: PushDeliveryProbe,
): Entry | null {
  if (state !== 'granted') return null;
  switch (probe) {
    case 'registered':
      return C.notificationsDelivering;
    case 'idle':
    case 'permission_denied':
      return null;
    case 'not_configured':
      return C.notificationsNoAccount;
    case 'error':
      return C.notificationsDeliveryError;
    case 'unsupported':
    case 'module_missing':
    case 'unavailable':
      return C.notificationsNotDelivering;
  }
}
