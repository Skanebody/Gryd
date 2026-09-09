/**
 * GRYD — LE JOURNAL LOCAL DES SOLLICITATIONS (§14.3 « message déjà vu »).
 *
 * Le budget du cahier — 3 par semaine, 1 par jour — est arbitré côté serveur
 * par `can_notify_2026` (migration 0141) pour tout ce que le serveur envoie.
 * Mais les notifications LOCALES sont programmées par CE téléphone, souvent
 * hors ligne : elles ne peuvent pas consulter le serveur, et elles consomment
 * pourtant le MÊME budget (« push et email confondus », §14.1). Il leur faut
 * donc un journal ici.
 *
 * Ce fichier ne contient que l'I/O. La FORME et la FENÊTRE vivent dans
 * `notificationLogFormat.ts` (pur, testé) ; la DÉCISION dans
 * `notifications2026.ts` (pur, testé). Le journal serveur reste la référence
 * dès qu'un envoi part du serveur.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationLogEntry2026 } from './notifications2026';
import { parseNotificationLog2026, pruneNotificationLog2026 } from './notificationLogFormat';

const KEY = 'gryd.notifLog2026.v1';

export async function readNotificationLog2026(nowMs: number): Promise<NotificationLogEntry2026[]> {
  try {
    return pruneNotificationLog2026(
      parseNotificationLog2026(await AsyncStorage.getItem(KEY)),
      nowMs,
    );
  } catch {
    // Stockage indisponible : le journal est VIDE, pas « plein ». Un budget
    // qu'on ne sait pas lire ne doit pas condamner un message légitime — le
    // serveur, lui, garde le sien et tranchera pour tout ce qui vient de lui.
    return [];
  }
}

/** Inscrit une remise. Best effort : un stockage muet ne casse pas l'envoi. */
export async function appendNotificationLog2026(entry: NotificationLogEntry2026): Promise<void> {
  try {
    const current = await readNotificationLog2026(entry.atMs);
    await AsyncStorage.setItem(KEY, JSON.stringify([...current, entry]));
  } catch {
    // best effort
  }
}
