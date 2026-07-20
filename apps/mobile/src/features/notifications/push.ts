/**
 * GRYD — enregistrement de l'appareil pour les notifications (PÉRIMÈTRE 3).
 *
 * POURQUOI CE FICHIER EXISTE. Le decay serveur est réel : à J-3, `decay_job`
 * sait exactement quelles zones vont redevenir neutres et à qui elles sont.
 * Il ne manquait qu'une adresse à qui parler. C'est ce que fait ce module :
 * obtenir l'ExpoPushToken de CET appareil et le confier au serveur avec les
 * préférences locales du joueur (canaux, langue, fuseau).
 *
 * RÈGLE D'HONNÊTETÉ. Chaque étape peut échouer pour une raison DIFFÉRENTE, et
 * l'écran doit pouvoir dire laquelle — jamais un « Activer » qui ne fait rien.
 * D'où `PushStatus` : c'est un diagnostic, pas un booléen.
 *
 * DÉPENDANCE NATIVE. `expo-notifications` est chargé paresseusement (même
 * patron que `sources/adapters/gpx.ts`) : sur un build antérieur à son ajout,
 * l'app ne plante pas, elle dit « indisponible sur cette version ».
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import type { NotifChannel } from '../motivation/store';
import type { Locale } from '../../i18n/types';

/** Diagnostic d'enregistrement — chaque valeur a un message d'écran distinct. */
export type PushStatus =
  /** Pas encore tenté sur cet appareil. */
  | 'idle'
  /** Web / preview : il n'y a pas de push à activer ici. */
  | 'unsupported'
  /** Module natif absent du build installé (ajout postérieur). */
  | 'module_missing'
  /** Le joueur a refusé — c'est un choix, pas une panne. */
  | 'permission_denied'
  /** Pas de backend / pas de session : rien à enregistrer côté serveur. */
  | 'not_configured'
  /**
   * Le service de push n'a délivré aucun token : build sans credentials APNs
   * ou FCM, ou simulateur. C'est l'étape qui attend le fondateur.
   */
  | 'unavailable'
  /** Le serveur a refusé l'enregistrement (réseau, RLS, session expirée). */
  | 'error'
  /** L'appareil recevra les notifications de ses canaux actifs. */
  | 'registered';

export interface PushRegistration {
  status: PushStatus;
  /** Détail technique, jamais affiché tel quel — journalisé pour le debug. */
  detail?: string;
}

/** Clé locale : le token du dernier enregistrement réussi (pour le retirer). */
const TOKEN_KEY = 'gryd.push.token.v1';

type NotificationsModule = typeof import('expo-notifications');

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

/** projectId EAS (app.json → extra.eas.projectId) : requis par Expo Push. */
function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? null;
}

/** Fuseau RÉEL de l'appareil : les quiet hours serveur sont calculées dedans. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
}

export interface PushPreferences {
  channels: readonly NotifChannel[];
  locale: Locale;
}

/**
 * Demande la permission puis enregistre l'appareil côté serveur.
 * À n'appeler que sur un geste EXPLICITE du joueur : une permission demandée
 * sans contexte est une permission refusée.
 */
export async function registerPushDevice(prefs: PushPreferences): Promise<PushRegistration> {
  if (Platform.OS === 'web') return { status: 'unsupported' };

  const Notifications = loadModule();
  if (!Notifications) return { status: 'module_missing' };

  if (!supabase) return { status: 'not_configured', detail: 'supabase absent' };
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { status: 'not_configured', detail: 'aucune session' };

  // ── Permission système ────────────────────────────────────────────────────
  try {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) {
      if (current.canAskAgain === false) return { status: 'permission_denied' };
      const asked = await Notifications.requestPermissionsAsync();
      if (!asked.granted) return { status: 'permission_denied' };
    }
  } catch (e) {
    return { status: 'unavailable', detail: `permissions: ${e}` };
  }

  // ── Canal Android (obligatoire pour afficher quoi que ce soit) ─────────────
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GRYD',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch (e) {
      console.warn('[GRYD] canal Android non créé', e);
    }
  }

  // ── Token ─────────────────────────────────────────────────────────────────
  const id = projectId();
  if (!id) return { status: 'not_configured', detail: 'projectId EAS absent' };

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
    token = result.data;
  } catch (e) {
    // Cas dominant AUJOURD'HUI : build sans clé APNs / config FCM, ou simulateur.
    return { status: 'unavailable', detail: `token: ${e}` };
  }

  // ── Enregistrement serveur (le serveur seul écrit la table) ───────────────
  const { error } = await supabase.rpc('register_push_device', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    p_locale: prefs.locale,
    p_time_zone: deviceTimeZone(),
    p_channels: [...prefs.channels],
  });
  if (error) return { status: 'error', detail: error.message };

  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Best effort : sans cache local on ne saura pas dé-enregistrer, mais
    // l'enregistrement lui-même a bien eu lieu.
  }
  return { status: 'registered' };
}

/**
 * Retire cet appareil (le joueur coupe tout). Idempotent : sans token connu,
 * il n'y a rien à retirer et ce n'est pas une erreur.
 */
export async function unregisterPushDevice(): Promise<void> {
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }
  if (token && supabase) {
    const { error } = await supabase.rpc('unregister_push_device', { p_token: token });
    if (error) console.warn('[GRYD] unregister_push_device', error.message);
  }
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // idem : best effort
  }
}

/**
 * Rejoue l'enregistrement quand les préférences changent (canal coupé, langue).
 * NE DEMANDE JAMAIS de permission : sans appareil déjà enregistré, il n'y a
 * rien à synchroniser — on ne profite pas d'un changement de réglage pour
 * réclamer un accès système.
 */
export async function syncPushPreferences(prefs: PushPreferences): Promise<void> {
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return;
  }
  if (!token || !supabase) return;

  // `off` exclusif : couper tous les canaux retire réellement l'appareil,
  // plutôt que de laisser un token vivant que le serveur devrait filtrer.
  if (prefs.channels.includes('off') || prefs.channels.length === 0) {
    await unregisterPushDevice();
    return;
  }

  const { error } = await supabase.rpc('register_push_device', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    p_locale: prefs.locale,
    p_time_zone: deviceTimeZone(),
    p_channels: [...prefs.channels],
  });
  if (error) console.warn('[GRYD] sync des préférences push', error.message);
}

/** Cet appareil est-il déjà enregistré ? (lecture locale, aucun réseau.) */
export async function storedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
