/**
 * GRYD — RENDEZ-VOUS LOCAL : un rappel programmé SUR L'APPAREIL pour la prochaine
 * sortie, posé par le joueur après une course.
 *
 * 100 % LOCAL (`scheduleNotificationAsync`) : AUCUN token, AUCUN APNs/FCM, AUCUN
 * serveur. C'est l'inverse EXACT de push.ts (`getExpoPushTokenAsync`, dormant tant
 * que les credentials fondateur manquent). Il marche donc HORS-LIGNE et AVANT O1 —
 * le seul déclencheur de retour shippable aujourd'hui.
 *
 * HONNÊTE : la notif n'affirme QUE ce qui est vrai en local — un rendez-vous que
 * le joueur a lui-même posé. JAMAIS « on t'a pris ta zone » (vérité serveur,
 * inconnue en local, fausse dans un monde vide) ni un rival fabriqué. Refus de
 * permission → statut distinct : l'appelant efface la surface (pas de bouton mort,
 * car la notif locale, elle, part réellement une fois autorisée).
 *
 * DÉPENDANCE NATIVE chargée paresseusement (patron push.ts) : sur un build sans le
 * module, l'app ne plante pas — statut `module_missing`. Web → `unsupported`.
 * PUR d'i18n : le titre/corps arrivent en prop, résolus par l'écran.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NotificationsModule = typeof import('expo-notifications');

/** Diagnostic — chaque valeur pilote un état d'écran distinct (jamais un bouton mort). */
export type ReminderStatus =
  /** Le rappel local est posé — il partira vraiment à l'heure choisie. */
  | 'scheduled'
  /** Le joueur a refusé la permission — un choix, pas une panne. */
  | 'permission_denied'
  /** Web / preview : pas de notification locale à poser ici. */
  | 'unsupported'
  /** Module natif absent du build installé (ajout postérieur). */
  | 'module_missing'
  /** Échec technique (journalisé) — jamais avalé en silence. */
  | 'error';

/** Identifiant STABLE : on REMPLACE le rendez-vous, jamais on n'en empile. */
const NOTIF_ID = 'gryd-rendezvous-daily';
const STATE_KEY = 'gryd.rendezvous.v1';

/**
 * Heure par défaut du rendez-vous (18 h). Constante NOMMÉE, pas un nombre magique
 * inline — mais ce n'est PAS une règle de jeu (aucun effet sur claims/points), donc
 * elle vit ici, pas dans game-rules.ts. TON/HEURE/CADENCE = décision fondateur
 * (voix produit) : une seule ligne à changer.
 */
export const RENDEZVOUS_DEFAULT_HOUR = 18;

export interface RendezvousState {
  scheduled: boolean;
  hour?: number;
  minute?: number;
}

/** null = module absent du build (dégradation propre, jamais un crash). */
function loadModule(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('[GRYD] expo-notifications absent de ce build', e);
    return null;
  }
}

/** Contenu de la notif — résolu par l'écran (i18n), jamais ici. */
export interface RendezvousContent {
  title: string;
  body: string;
}

/**
 * Pose un rappel LOCAL quotidien à `hour:minute`. À n'appeler que sur un geste
 * EXPLICITE du joueur (une permission demandée sans contexte est une permission
 * refusée). Remplace tout rendez-vous précédent (identifiant stable).
 */
export async function scheduleDailyRendezvous(
  hour: number,
  minute: number,
  content: RendezvousContent,
): Promise<ReminderStatus> {
  if (Platform.OS === 'web') return 'unsupported';
  const N = loadModule();
  if (!N) return 'module_missing';

  try {
    const current = await N.getPermissionsAsync();
    if (!current.granted) {
      if (current.canAskAgain === false) return 'permission_denied';
      const asked = await N.requestPermissionsAsync();
      if (!asked.granted) return 'permission_denied';
    }

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('rendezvous', {
        name: 'GRYD',
        importance: N.AndroidImportance.DEFAULT,
      });
    }

    // Identifiant stable → on annule d'abord, puis on repose : jamais deux rappels.
    await N.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});
    await N.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: { title: content.title, body: content.body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: 'rendezvous' } : {}),
      },
    });

    try {
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify({ scheduled: true, hour, minute }));
    } catch {
      // Best effort : le rappel EST posé même si l'état local n'a pas pu s'écrire.
    }
    return 'scheduled';
  } catch (e) {
    console.warn('[GRYD] rendez-vous local non posé', e);
    return 'error';
  }
}

/** Retire le rappel (le joueur coupe). Idempotent : rien à retirer n'est pas une erreur. */
export async function cancelRendezvous(): Promise<void> {
  const N = loadModule();
  try {
    await N?.cancelScheduledNotificationAsync(NOTIF_ID);
  } catch {
    // idem : best effort
  }
  try {
    await AsyncStorage.removeItem(STATE_KEY);
  } catch {
    // best effort
  }
}

/** Un rappel est-il déjà posé ? (lecture locale du cache, aucun réseau.) */
export async function getRendezvousState(): Promise<RendezvousState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return { scheduled: false };
    const parsed = JSON.parse(raw) as RendezvousState;
    return parsed?.scheduled ? parsed : { scheduled: false };
  } catch {
    return { scheduled: false };
  }
}

/**
 * État RÉCONCILIÉ avec l'OS (l'app ne ment jamais). Le cache local peut mentir :
 * l'utilisateur peut avoir coupé les notifications GRYD dans les Réglages système
 * APRÈS les avoir accordées, ou l'OS peut avoir purgé le rappel. On ne montre
 * « posé » que si la notif est RÉELLEMENT programmée ET la permission encore
 * accordée — sinon on rend `{ scheduled:false }` (et on purge le cache menteur).
 *
 * Reste lazy côté web : l'appelant (RendezvousOptIn) court-circuite AVANT sur web,
 * donc `loadModule()` n'est jamais atteint là-bas ; sur natif le module est présent.
 */
export async function reconcileRendezvous(): Promise<RendezvousState> {
  const cached = await getRendezvousState();
  if (!cached.scheduled) return { scheduled: false };
  if (Platform.OS === 'web') return { scheduled: false };
  const N = loadModule();
  if (!N) return { scheduled: false };
  try {
    const perm = await N.getPermissionsAsync();
    if (!perm.granted) {
      await AsyncStorage.removeItem(STATE_KEY).catch(() => {});
      return { scheduled: false };
    }
    const all = await N.getAllScheduledNotificationsAsync();
    if (!all.some((n) => n.identifier === NOTIF_ID)) {
      await AsyncStorage.removeItem(STATE_KEY).catch(() => {});
      return { scheduled: false };
    }
    return cached;
  } catch {
    // Lecture OS impossible (transitoire) : on garde l'état local plutôt que de
    // re-proposer à tort — re-poser ne ferait de toute façon que remplacer.
    return cached;
  }
}
