/**
 * GRYD — état réel des notifications sur CET appareil (PÉRIMÈTRE 3).
 *
 * Le hook ne raconte que ce qu'il a constaté : au montage il lit le token déjà
 * enregistré (aucun réseau, aucune demande de permission), et ne bascule sur un
 * autre statut qu'après une tentative EXPLICITE du joueur. Une permission
 * système demandée sans que le joueur ait rien demandé est une permission
 * perdue — et un écran qui promet des notifications qu'il n'enverra pas est un
 * mensonge.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useLocale } from '../../i18n/store';
import type { NotifChannel } from '../motivation/store';
import {
  type PushStatus,
  registerPushDevice,
  storedPushToken,
  syncPushPreferences,
  unregisterPushDevice,
} from './push';

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
 * Statut + actions pour la sous-page Réglages > Notifications.
 * @param channels canaux actifs — repropagés au serveur à chaque changement.
 */
export function useDeviceNotifications(channels: readonly NotifChannel[]): DeviceNotifications {
  const locale = useLocale();
  const [status, setStatus] = useState<PushStatus>(
    Platform.OS === 'web' ? 'unsupported' : 'idle',
  );
  const [busy, setBusy] = useState(false);

  // Constat initial : cet appareil a-t-il déjà un token enregistré ?
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    void storedPushToken().then((token) => {
      if (alive && token) setStatus('registered');
    });
    return () => {
      alive = false;
    };
  }, []);

  // Propagation des préférences : le serveur ne peut respecter que ce qu'il
  // sait. No-op tant qu'aucun appareil n'est enregistré (jamais de permission
  // réclamée en douce à l'occasion d'un changement de réglage).
  const signature = `${locale}|${[...channels].sort().join(',')}`;
  const lastSynced = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (lastSynced.current === signature) return;
    lastSynced.current = signature;
    void syncPushPreferences({ channels, locale }).then(() => {
      // Couper tous les canaux dé-enregistre l'appareil : le dire.
      if (channels.includes('off') || channels.length === 0) setStatus('idle');
    });
  }, [signature, channels, locale]);

  const enable = useCallback(() => {
    if (busy) return;
    setBusy(true);
    void registerPushDevice({ channels, locale })
      .then((res) => {
        if (res.detail) console.warn('[GRYD] push:', res.status, res.detail);
        setStatus(res.status);
      })
      .finally(() => setBusy(false));
  }, [busy, channels, locale]);

  const disable = useCallback(() => {
    if (busy) return;
    setBusy(true);
    void unregisterPushDevice()
      .then(() => setStatus('idle'))
      .finally(() => setBusy(false));
  }, [busy]);

  return { status, busy, enable, disable };
}
