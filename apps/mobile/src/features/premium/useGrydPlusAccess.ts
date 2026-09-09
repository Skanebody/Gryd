import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { fetchCustomerInfo, observeCustomerInfo, PRO_ENTITLEMENT_ID, purchasesCapability } from './client';
import { readProStatus, type CustomerInfoLike } from './entitlement';
import { grydPlusAccessState2026, readServerGrydPlusAccess2026, type ServerGrydPlusAccess2026 } from './access2026';

const refreshed = new Set<() => void>();
/** Authenticated Edge function verifies RevenueCat itself; no client-supplied entitlement. */
export async function refreshServerGrydPlusAccess(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.functions.invoke('sync_gryd_plus_access_2026', { body: {} });
  if (error) return false;
  refreshed.forEach(listener => listener());
  return true;
}
export function useGrydPlusAccess() {
  const { session, loading } = useSession();
  const owner = session?.user.id ?? null;
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [receipt, setReceipt] = useState<{ owner: string; store: CustomerInfoLike | null; server: ServerGrydPlusAccess2026 | null; loaded: boolean } | null>(null);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    refreshed.add(reload);
    const timer = setInterval(() => setClock(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { setClock(Date.now()); reload(); } });
    return () => { refreshed.delete(reload); clearInterval(timer); subscription.remove(); };
  }, [reload]);
  useEffect(() => {
    if (!owner || loading) return;
    let cancelled = false;
    const accept = (store: CustomerInfoLike) => { if (!cancelled && currentOwner.current === owner) setReceipt(old => ({ owner, store, server: old?.owner === owner ? old.server : null, loaded: true })); };
    const unobserve = purchasesCapability().available ? observeCustomerInfo(owner, accept) : () => {};
    void Promise.allSettled([
      purchasesCapability().available ? fetchCustomerInfo(owner) : Promise.resolve(null),
      supabase ? supabase.rpc('get_gryd_plus_access_2026') : Promise.resolve({ data: null, error: null }),
    ]).then(([store, server]) => {
      if (cancelled || currentOwner.current !== owner) return;
      setReceipt({ owner, store: store.status === 'fulfilled' ? store.value : null, server: server.status === 'fulfilled' && !server.value.error ? readServerGrydPlusAccess2026(server.value.data, Date.now()) : null, loaded: true });
    });
    return () => { cancelled = true; unobserve(); };
  }, [owner, loading, revision]);
  const own = receipt?.owner === owner ? receipt : null;
  const pro = own?.store ? readProStatus(own.store, PRO_ENTITLEMENT_ID, clock) : null;
  const server = own?.server ? readServerGrydPlusAccess2026(own.server, clock) : null;
  const storeActive = pro?.kind === 'active';
  // Le SERVEUR décide, le Store informe (G28). Le détail de l'arbitrage vit
  // dans `access2026.ts`, pur et testé.
  const { status, active } = grydPlusAccessState2026({ sessionLoading: loading, ownerId: owner, loaded: own?.loaded === true, server, storeActive });
  return { status, active,
    /** Le Store a enregistré l'achat ; ce n'est pas encore un droit ouvert. */
    storeSaysActive: !!owner && storeActive,
    /** Échéance CONFIRMÉE. Une échéance non confirmée n'est pas une échéance. */
    expiresAtMs: server?.expiresAt ? Date.parse(server.expiresAt) : null,
    /** Résiliation vue par le Store : disponible jusqu'à la fin de la période. */
    cancelled: pro?.kind === 'active' && pro.cancelled === true,
    source: server ? 'server' as const : pro ? 'store' as const : null, reload } as const;
}
