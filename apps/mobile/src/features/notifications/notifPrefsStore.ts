/**
 * GRYD — accès React aux réglages de notifications (E71).
 *
 * La FORME, les DÉFAUTS, la lecture et les deux règles de protection (urgence
 * jamais gatée, regroupement au-delà de 3/jour) vivent dans `./notifPrefs.ts` —
 * module pur, testé sous Deno. Ici : uniquement le hook, l'AsyncStorage, et la
 * migration en LECTURE SEULE depuis l'ancien magasin motivation (§21).
 *
 * Persistance LOCALE (AsyncStorage) : `defense`/`rivalite` sont en outre
 * MIROITÉES côté serveur via `push_devices.notif_channels`
 * (`notifPrefsToChannels`, câblé par l'écran via `useDeviceNotifications`) —
 * c'est ce qui permet à `decay_job`/`steal_push_job` de respecter le choix.
 * `crew`/`progression`/`produit` restent purement locales : aucun canal serveur
 * n'existe pour elles aujourd'hui (cf. l'en-tête de `notifPrefs.ts`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyNotificationPrefsPatch,
  DEFAULT_NOTIFICATION_PREFS,
  deriveFromLegacyChannels,
  NOTIF_PREFS_STORAGE_KEY,
  parseNotificationPrefs,
  type NotificationPrefs,
} from './notifPrefs';

export {
  applyNotificationPrefsPatch,
  categoryOf,
  DEFAULT_NOTIFICATION_PREFS,
  isUrgentKind,
  NOTIFICATION_CATEGORIES,
  NOTIF_PREFS_STORAGE_KEY,
  notifPrefsToChannels,
  parseNotificationPrefs,
  planDailyDelivery,
  type DeliverableEvent,
  type DeliveryDecision,
  type DeliveryMode,
  type NonUrgentNotificationKind,
  type NotificationCategory,
  type NotificationKind,
  type NotificationPrefs,
  type UrgentNotificationKind,
} from './notifPrefs';

/** Clé HÉRITÉE (motivation §21) — lue une seule fois, jamais écrite d'ici. */
const LEGACY_MOTIVATION_STORAGE_KEY = 'gryd.motivation.prefs.v1';

/**
 * Première lecture : le nouveau magasin si présent, sinon une dérivation
 * ponctuelle de l'ancien (préserve un choix déjà fait par le joueur), sinon les
 * défauts E71. Best effort — un stockage indisponible retombe sur les défauts,
 * jamais une exception vers l'écran.
 */
async function readPrefs(): Promise<NotificationPrefs> {
  try {
    const own = await AsyncStorage.getItem(NOTIF_PREFS_STORAGE_KEY);
    if (own !== null) return parseNotificationPrefs(own);

    const legacy = await AsyncStorage.getItem(LEGACY_MOTIVATION_STORAGE_KEY);
    const derived = deriveFromLegacyChannels(legacy);
    return derived ? { ...DEFAULT_NOTIFICATION_PREFS, ...derived } : DEFAULT_NOTIFICATION_PREFS;
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

async function writePrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Best effort : un stockage indisponible (web privé) ne casse rien.
  }
}

export interface NotificationPrefsStore {
  prefs: NotificationPrefs;
  /** True tant que la lecture initiale (+ migration éventuelle) n'a pas résolu. */
  loading: boolean;
  /** Patch partiel + persistance. Retourne la promesse d'écriture. */
  update: (patch: Partial<NotificationPrefs>) => Promise<void>;
}

/**
 * Hook d'accès aux réglages de notifications. Charge en asynchrone (défauts
 * affichés immédiatement, jamais de blocage), persiste chaque patch dans SON
 * PROPRE magasin (la migration legacy ne s'applique qu'à la lecture initiale,
 * une seule fois — le premier `update` fige définitivement le nouveau magasin).
 */
export function useNotificationPrefs(): NotificationPrefsStore {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loading, setLoading] = useState(true);
  // Miroir synchrone (patron `privacy/store.ts`) : la valeur persistée dérive
  // d'ici, jamais du callback fonctionnel de `setPrefs` qui peut ne pas s'être
  // exécuté avant l'`await writePrefs` sous React 18 batché.
  const prefsRef = useRef<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    let alive = true;
    void readPrefs().then((p) => {
      if (alive) {
        prefsRef.current = p;
        setPrefs(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<NotificationPrefs>) => {
    const next = applyNotificationPrefsPatch(prefsRef.current, patch);
    prefsRef.current = next;
    setPrefs(next);
    await writePrefs(next);
  }, []);

  return { prefs, loading, update };
}
