/**
 * GRYD — ÉTAT RÉEL DU PUSH DISTANT SUR CET APPAREIL.
 *
 * Le hook ne raconte que ce qu'il a constaté. Depuis le 10/09/2026 il commence
 * par le seul fait qui compte sur ce build : `remotePushCapability` — dérivée
 * de la configuration Expo, pas d'un échec. Sur iOS l'entitlement
 * `aps-environment` est retiré par `plugins/withoutPushEntitlement.js` et sur
 * Android aucun `google-services.json` n'existe : le verdict `unavailable`
 * tombe AVANT toute I/O et AVANT toute boîte système.
 *
 * Conséquence directe pour l'écran : `pushActionable('unavailable')` est déjà
 * `false`, donc aucune ligne pressable n'est peinte pour une action qui ne peut
 * pas aboutir. L'état, lui, reste affiché — une ligne muette informe ; une
 * ligne pressable qui échoue à coup sûr ment.
 *
 * Les PRÉFÉRENCES, elles, ne passent plus par ici : elles vivent sur le serveur
 * (`notificationSettingsStore2026.ts`, migration 0140) et sont lues par le
 * moteur `can_notify_2026`. Ce hook ne parle plus que de l'APPAREIL.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useLocale } from '../../i18n/store';
import {
  buildRemotePushCapability,
  type PushStatus,
  registerPushDevice,
  storedPushToken,
  unregisterPushDevice,
} from './push';
import { remotePushPossible } from './remotePushCapability';
import { notifChannels2026, type NotificationSettings2026 } from './notifications2026';

export interface DeviceNotifications {
  status: PushStatus;
  /** True pendant la demande de permission / l'aller-retour serveur. */
  busy: boolean;
  /** Geste explicite du joueur : demande la permission puis enregistre. */
  enable: () => void;
  /** Retire cet appareil (le serveur cesse d'y envoyer). */
  disable: () => void;
}

/**
 * Statut + actions pour la sous-page Réglages › Notifications.
 * @param settings les réglages §14.1 — seuls consultés pour dériver l'ancienne
 *   colonne de canaux, et seulement le jour où un build retrouvera la capacité.
 */
export function useDeviceNotifications(settings: NotificationSettings2026): DeviceNotifications {
  const locale = useLocale();
  const [status, setStatus] = useState<PushStatus>(() =>
    Platform.OS === 'web'
      ? 'unsupported'
      : remotePushPossible(buildRemotePushCapability())
        ? 'idle'
        : 'unavailable',
  );
  const [busy, setBusy] = useState(false);

  // Constat initial : cet appareil a-t-il déjà un token enregistré ? On ne le
  // demande que si ce build peut en avoir un — sinon un token laissé par une
  // version antérieure ferait dire « enregistré » à un appareil devenu muet.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!remotePushPossible(buildRemotePushCapability())) return;
    let alive = true;
    void storedPushToken().then((token) => {
      if (alive && token) setStatus('registered');
    });
    return () => {
      alive = false;
    };
  }, []);

  // ── PLUS AUCUNE SYNCHRO AUTOMATIQUE DE PRÉFÉRENCES ────────────────────────
  // `syncPushPreferences` était rejoué à chaque changement de réglage. Il ne
  // servait qu'à propager `notif_channels`, la colonne des canaux `solo` et
  // `competition` — les deux alarmes abolies par §5.3 et §14.2, dont les jobs
  // refusent désormais de tourner. La propager encore aurait écrit sur le
  // serveur un choix qui ne gouverne plus rien.

  const enable = useCallback(() => {
    if (busy) return;
    setBusy(true);
    void registerPushDevice({ channels: notifChannels2026(settings), locale })
      .then((res) => {
        if (res.detail) console.warn('[GRYD] push:', res.status, res.detail);
        setStatus(res.status);
      })
      .finally(() => setBusy(false));
  }, [busy, settings, locale]);

  const disable = useCallback(() => {
    if (busy) return;
    setBusy(true);
    void unregisterPushDevice()
      .then(() => setStatus('idle'))
      .finally(() => setBusy(false));
  }, [busy]);

  return { status, busy, enable, disable };
}
