/**
 * GRYD — LE NOMBRE DE LA CLOCHE, ET RIEN D'AUTRE.
 *
 * ─── POURQUOI UN HOOK À PART ────────────────────────────────────────────────
 * La cloche vit dans l'en-tête de la carte, l'écran le plus chaud de l'app.
 * Lui faire tirer la PAGE entière du centre pour afficher un nombre aurait payé
 * une liste à chaque ouverture. `unread_notifications_count_2026` rend un
 * entier, et c'est tout ce dont la cloche a besoin.
 *
 * ─── ZÉRO N'EST PAS UNE PASTILLE ───────────────────────────────────────────
 * `unread = 0` ne peint RIEN (G24 : « interdit, la pastille rouge permanente »).
 * Un échec de lecture ne peint rien non plus : la cloche reste une porte, elle
 * n'annonce jamais un nombre qu'elle n'a pas lu. Le badge apparaît quand il y a
 * vraiment quelque chose, et DISPARAÎT dès que c'est lu.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { shouldRefresh2026 } from './notificationInbox2026';

export function useUnreadNotifications2026(): { unread: number } {
  const { session, loading } = useSession();
  const ownerId = session?.user.id ?? null;
  const owner = useRef(ownerId);
  owner.current = ownerId;
  const [state, setState] = useState<{ ownerId: string; unread: number } | null>(null);
  const [tick, setTick] = useState(0);
  const lastReadMs = useRef<number | null>(null);

  const reload = useCallback(() => {
    lastReadMs.current = null;
    setTick((value) => value + 1);
  }, []);

  useFocusEffect(useCallback(() => {
    if (ownerId === null || supabase === null || loading) return;
    const client = supabase;
    let cancelled = false;
    void (async () => {
      try {
        const current = await client.auth.getSession();
        if (current.error || current.data.session?.user.id !== ownerId) return;
        const response = await client
          .rpc('unread_notifications_count_2026')
          .setHeader('Authorization', `Bearer ${current.data.session.access_token}`);
        if (cancelled || owner.current !== ownerId) return;
        lastReadMs.current = Date.now();
        const value = typeof response.data === 'number' ? response.data : 0;
        // Un échec ne remet PAS le compteur à zéro : il le laisse tel quel.
        // « Je ne sais pas » n'est pas « il n'y a rien ».
        if (!response.error) setState({ ownerId, unread: Math.max(0, Math.trunc(value)) });
      } catch { /* silencieux : la carte ne porte pas d'erreur de notification */ }
    })();
    return () => { cancelled = true; };
  }, [ownerId, loading, tick]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && shouldRefresh2026(lastReadMs.current, Date.now())) reload();
    });
    return () => subscription.remove();
  }, [reload]);

  return { unread: state?.ownerId === ownerId ? state.unread : 0 };
}
