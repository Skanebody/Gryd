/**
 * GRYD — la lecture serveur du parrainage, et la seule mutation possible.
 *
 * Même patron que `useWeeklyQuests2026` : une lecture par focus d'écran, un
 * jeton vérifié à chaque appel, un verrou qui empêche deux mutations
 * concurrentes. L'attribution des récompenses se fait SERVEUR, à la validation
 * d'une sortie (déclencheur SQL, migration 0186) : le client n'a AUCUNE RPC
 * pour s'octroyer un objet, un boost ou un jour de GRYD+. La seule mutation
 * ouverte est « saisir un code », qui noue un lien et n'octroie rien.
 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { parseMyReferral2026, parseRedeemResult2026, type MyReferral2026, type ReferralRefusal2026 } from './referral2026';

export type ReferralStatus2026 = 'loading' | 'signed-out' | 'unavailable' | 'failed' | 'ready';
export type RedeemOutcome2026 = { ok: true } | { ok: false; reason: ReferralRefusal2026 | 'network' };

export function useMyReferral2026() {
  const { session, loading: sessionLoading } = useSession();
  const ownerId = session?.user.id ?? null;
  const owner = useRef(ownerId);
  owner.current = ownerId;
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [read, setRead] = useState<{ ownerId: string; status: 'loading' | 'failed' | 'ready'; data: MyReferral2026 | null } | null>(null);

  const reload = useCallback(() => {
    if (ownerId) setRead({ ownerId, status: 'loading', data: null });
    setTick(value => value + 1);
  }, [ownerId]);

  useFocusEffect(useCallback(() => {
    if (!ownerId || !supabase || sessionLoading) return;
    const client = supabase;
    let cancelled = false;
    const load = async () => {
      setRead({ ownerId, status: 'loading', data: null });
      try {
        const current = await client.auth.getSession();
        if (current.error || current.data.session?.user.id !== ownerId) throw new Error('session_changed');
        const response = await client.rpc('my_referral_2026')
          .setHeader('Authorization', `Bearer ${current.data.session.access_token}`);
        if (cancelled || owner.current !== ownerId) return;
        const data = response.error ? null : parseMyReferral2026(response.data);
        if (!data) throw new Error('referral_read_failed');
        setRead({ ownerId, status: 'ready', data });
      } catch {
        if (!cancelled && owner.current === ownerId) setRead({ ownerId, status: 'failed', data: null });
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [ownerId, sessionLoading, tick]));

  const redeem = useCallback(async (code: string): Promise<RedeemOutcome2026> => {
    if (lock.current || !ownerId || !supabase || owner.current !== ownerId) return { ok: false, reason: 'network' };
    lock.current = true;
    setBusy(true);
    try {
      const current = await supabase.auth.getSession();
      if (current.error || current.data.session?.user.id !== ownerId || owner.current !== ownerId) {
        return { ok: false, reason: 'network' };
      }
      const response = await supabase.rpc('redeem_referral_code_2026', { p_code: code })
        .setHeader('Authorization', `Bearer ${current.data.session.access_token}`);
      if (owner.current !== ownerId) return { ok: false, reason: 'network' };
      // Une ERREUR de transport n'est pas un refus métier : la confondre ferait
      // dire « ce code n'existe pas » à quelqu'un dont le réseau a lâché.
      if (response.error) return { ok: false, reason: 'network' };
      const result = parseRedeemResult2026(response.data);
      if (result.ok) reload();
      return result;
    } catch {
      return { ok: false, reason: 'network' };
    } finally {
      lock.current = false;
      if (owner.current === ownerId) setBusy(false);
    }
  }, [ownerId, reload]);

  const own = read?.ownerId === ownerId ? read : null;
  const status: ReferralStatus2026 = sessionLoading ? 'loading'
    : !ownerId ? 'signed-out'
      : !supabase ? 'unavailable'
        : own?.status ?? 'loading';
  return { status, data: own?.data ?? null, busy, reload, redeem } as const;
}
