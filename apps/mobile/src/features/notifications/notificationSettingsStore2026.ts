/**
 * GRYD — LES RÉGLAGES DE NOTIFICATION VIVENT SUR LE SERVEUR (cahier §14.1).
 *
 * ─── POURQUOI PAS ASYNCSTORAGE ──────────────────────────────────────────────
 * L'ancien magasin (`notifPrefsStore.ts`) n'écrivait que sur le téléphone. Deux
 * conséquences, toutes deux visibles par le joueur : le choix disparaissait au
 * changement d'appareil, et surtout AUCUN envoi serveur ne pouvait le respecter
 * — le moteur `can_notify_2026` (migration 0141) n'avait rien à lire. Un
 * réglage que le décideur ne voit pas n'est pas un réglage.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS CONFONDUS (L8/L14/L19) ────────────────────────
 *  · `signedOut` — pas de backend, ou pas de session. L'écran montre la matrice
 *    et DIT que ces choix appartiennent à un compte. Un invité voit donc l'état
 *    du produit ; il ne tape pas dans le vide.
 *  · `loading`   — la lecture court. On n'affirme rien.
 *  · `ready`     — valeurs RÉELLES lues sur le serveur.
 *  · `failed`    — on n'a pas pu lire. C'est distinct de « tout est par
 *    défaut » : afficher des défauts après un échec de lecture, ce serait
 *    montrer à quelqu'un un réglage qu'il n'a pas choisi.
 *
 * ─── ÉCRITURE OPTIMISTE, ET DITE ────────────────────────────────────────────
 * L'interrupteur bascule tout de suite (§18.3 : l'attente ne doit pas paraître
 * un bug), mais `saving` est exposé pour que l'écran le dise, et un échec
 * REMET la valeur d'avant en annonçant l'échec — jamais un basculement muet qui
 * laisserait croire à un choix enregistré.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  applyNotificationSettingsPatch2026,
  DEFAULT_NOTIFICATION_SETTINGS_2026,
  parseNotificationSettings2026,
  type NotificationSettings2026,
} from './notifications2026';

export type NotificationSettingsPhase2026 = 'signedOut' | 'loading' | 'ready' | 'failed';

export interface NotificationSettingsStore2026 {
  phase: NotificationSettingsPhase2026;
  /**
   * Les valeurs à AFFICHER. En `signedOut` ce sont les défauts du cahier — et
   * l'écran doit dire que ce sont des défauts, pas un choix. En `failed`, elles
   * ne veulent rien dire : l'écran n'affiche alors aucun interrupteur.
   */
  settings: NotificationSettings2026;
  /** Une écriture est en vol. */
  saving: boolean;
  /** La dernière écriture a échoué (et la valeur d'avant a été remise). */
  saveFailed: boolean;
  update: (patch: Partial<NotificationSettings2026>) => void;
  reload: () => void;
}

/** Contrat de la RPC `my_notification_settings_2026()` (jsonb, migration 0140). */
interface WireSettings2026 {
  hasAccount?: unknown;
}

export function useNotificationSettings2026(): NotificationSettingsStore2026 {
  const { session, configured, loading: sessionLoading } = useSession();
  const [phase, setPhase] = useState<NotificationSettingsPhase2026>('loading');
  const [settings, setSettings] = useState<NotificationSettings2026>(
    DEFAULT_NOTIFICATION_SETTINGS_2026,
  );
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [tick, setTick] = useState(0);
  // Miroir synchrone : la valeur à réécrire dérive d'ici, jamais d'un `setState`
  // qui peut ne pas s'être appliqué avant l'aller-retour réseau (React 18 batché).
  const ref = useRef<NotificationSettings2026>(DEFAULT_NOTIFICATION_SETTINGS_2026);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Un chargement de session N'EST PAS une absence de compte : tant qu'on ne
    // sait pas, on reste en `loading` plutôt que d'affirmer « pas connecté ».
    if (sessionLoading) {
      setPhase('loading');
      return;
    }
    const client = supabase;
    if (!configured || client === null || session === null) {
      ref.current = DEFAULT_NOTIFICATION_SETTINGS_2026;
      setSettings(DEFAULT_NOTIFICATION_SETTINGS_2026);
      setPhase('signedOut');
      return;
    }
    let cancelled = false;
    setPhase('loading');
    void (async () => {
      const { data, error } = await client.rpc('my_notification_settings_2026');
      if (cancelled) return;
      // `data === null` hors session côté serveur : la session a expiré entre
      // notre lecture locale et l'appel. Ce n'est pas un échec technique, et ce
      // n'est pas non plus « pas de réglage » — c'est « pas connecté ».
      if (error !== null) {
        setPhase('failed');
        return;
      }
      if (data === null || data === undefined) {
        setPhase('signedOut');
        return;
      }
      const next = parseNotificationSettings2026(data);
      ref.current = next;
      setSettings(next);
      setPhase((data as WireSettings2026).hasAccount === false ? 'signedOut' : 'ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, session, sessionLoading, tick]);

  const update = useCallback(
    (patch: Partial<NotificationSettings2026>) => {
      const client = supabase;
      if (client === null || session === null) return;
      const previous = ref.current;
      const next = applyNotificationSettingsPatch2026(previous, patch);
      ref.current = next;
      setSettings(next);
      setSaving(true);
      setSaveFailed(false);
      void (async () => {
        const { data, error } = await client.rpc('save_notification_settings_2026', {
          p_settings: patch,
        });
        setSaving(false);
        if (error !== null || data === null || data === undefined) {
          // Rendre la valeur d'avant : un interrupteur resté sur la nouvelle
          // position après un échec est un choix que personne n'a enregistré.
          ref.current = previous;
          setSettings(previous);
          setSaveFailed(true);
          return;
        }
        // On ADOPTE ce que le serveur renvoie, pas ce qu'on croyait écrire : il
        // est seul juge (une valeur hors domaine revient corrigée).
        const confirmed = parseNotificationSettings2026(data);
        ref.current = confirmed;
        setSettings(confirmed);
      })();
    },
    [session],
  );

  return { phase, settings, saving, saveFailed, update, reload };
}
