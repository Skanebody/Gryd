import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { fetchCurrentOffering, fetchCustomerInfo, observeCustomerInfo, PRO_ENTITLEMENT_ID, purchasesCapability } from './client';
import { STORE_READ_PATIENCE_MS } from './usePremium';
import { readProStatus, type CustomerInfoLike } from './entitlement';
import { readSubscriptionOffers2026, type OfferingLike } from './offerings';
import { storeAvailability2026, storeCannotSellYet2026, type PremiumStatus } from './plan2026';
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

/**
 * ─── « PERSONNE NE PEUT PAYER » SE LIT, IL NE SE SUPPOSE PAS ───────────────
 *
 * La décision du fondateur du 11/09/2026 ouvre les outils GRYD+ **tant que rien
 * n'est en vente** (brouillon `docs/product/ADR-016-BROUILLON-GRYDPLUS-OUVERT.md`).
 * Écrire `preSaleOpen = true` en dur serait donc juste aujourd'hui et faux le
 * jour de l'ouverture, sans que personne ne s'en aperçoive. Le fait est lu ici,
 * avec les MÊMES primitives que `usePremium` (`purchasesCapability`,
 * `fetchCurrentOffering`, `readSubscriptionOffers2026`) et tranché par la MÊME
 * fonction pure (`storeAvailability2026`) : deux lecteurs, un seul verdict.
 *
 * Coût réel aujourd'hui : ZÉRO appel réseau. Sans clé de production,
 * `capability.available` est faux et l'offre n'est même pas demandée — le
 * verdict `notConfigured` (ou `platform` sur le web) est déjà connu.
 */
function storeCannotSellNow2026(offering: OfferingLike | null | undefined, offeringRead: boolean): boolean {
  const capability = purchasesCapability();
  const offers = readSubscriptionOffers2026(offering);
  const status: PremiumStatus = !capability.available ? 'unavailable'
    : !offeringRead ? 'error'
      : offers.length > 0 ? 'ready' : 'empty';
  return storeCannotSellYet2026(storeAvailability2026({
    status, offers, blockedReason: capability.available ? null : capability.reason,
  }));
}

export function useGrydPlusAccess() {
  const { session, loading } = useSession();
  const owner = session?.user.id ?? null;
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [receipt, setReceipt] = useState<{ owner: string; store: CustomerInfoLike | null; server: ServerGrydPlusAccess2026 | null; storeCannotSell: boolean; loaded: boolean } | null>(null);
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
    /**
     * ── LE CACHE DU SDK NE DÉCLARE PLUS LA LECTURE TERMINÉE (10/09/2026) ────
     * `accept` posait `loaded: true` dès que l'observateur RevenueCat rendait
     * un CustomerInfo — avant que la RPC serveur ait répondu. Or `loaded` avec
     * `server: null` vaut 'unavailable' (`access2026.ts`) : l'écran affichait
     * donc « Impossible de vérifier » PENDANT la vérification, puis se
     * corrigeait. Un fait faux, même bref, reste un fait faux. Le Store
     * INFORME (`store`), il ne clôt pas la lecture ; seule la RPC le fait.
     */
    const accept = (store: CustomerInfoLike) => { if (!cancelled && currentOwner.current === owner) setReceipt(old => old?.owner === owner ? { ...old, store } : { owner, store, server: null, storeCannotSell: false, loaded: false }); };
    const unobserve = purchasesCapability().available ? observeCustomerInfo(owner, accept) : () => {};
    /**
     * Et la lecture est BORNÉE, pour la même raison que dans `usePremium` :
     * `supabase.rpc` n'a pas d'échéance propre, et une requête qui pend
     * laissait ce hook en 'loading' pour toujours. Passé la patience, on dit
     * « on ne sait pas » (`server: null` → 'unavailable', avec son
     * « Réessayer ») plutôt que de faire tourner un rond sans fin.
     */
    const patience = setTimeout(() => {
      if (cancelled || currentOwner.current !== owner) return;
      setReceipt(old => old?.owner === owner && old.loaded ? old : { owner, store: old?.owner === owner ? old.store : null, server: null, storeCannotSell: false, loaded: true });
    }, STORE_READ_PATIENCE_MS);
    void Promise.allSettled([
      purchasesCapability().available ? fetchCustomerInfo(owner) : Promise.resolve(null),
      supabase ? supabase.rpc('get_gryd_plus_access_2026') : Promise.resolve({ data: null, error: null }),
      // Troisième lecture, et pas un hook de plus : monter `usePremium` ici
      // doublerait son horloge d'une seconde et son observateur de CustomerInfo
      // sur TOUTE surface qui lit un droit (le Studio, les comparaisons). Une
      // requête ajoutée au lot qui existe déjà coûte moins cher, et la lecture
      // reste bornée par la même patience que les deux autres.
      purchasesCapability().available ? fetchCurrentOffering(owner) : Promise.resolve(null),
    ]).then(([store, server, offering]) => {
      if (cancelled || currentOwner.current !== owner) return;
      clearTimeout(patience);
      setReceipt({ owner, store: store.status === 'fulfilled' ? store.value : null, server: server.status === 'fulfilled' && !server.value.error ? readServerGrydPlusAccess2026(server.value.data, Date.now()) : null, storeCannotSell: storeCannotSellNow2026(offering.status === 'fulfilled' ? offering.value : null, offering.status === 'fulfilled'), loaded: true });
    });
    return () => { cancelled = true; clearTimeout(patience); unobserve(); };
  }, [owner, loading, revision]);
  const own = receipt?.owner === owner ? receipt : null;
  const pro = own?.store ? readProStatus(own.store, PRO_ENTITLEMENT_ID, clock) : null;
  const server = own?.server ? readServerGrydPlusAccess2026(own.server, clock) : null;
  const storeActive = pro?.kind === 'active';
  // Le SERVEUR décide, le Store informe (G28). Le détail de l'arbitrage vit
  // dans `access2026.ts`, pur et testé — pré-vente comprise.
  const { status, active, reason } = grydPlusAccessState2026({ sessionLoading: loading, ownerId: owner, loaded: own?.loaded === true, server, storeActive, storeCannotSell: own?.storeCannotSell === true });
  return { status, active,
    /**
     * POURQUOI c'est ouvert : `'server_entitlement'` (un abonnement confirmé)
     * ou `'pre_sale_open'` (rien n'est en vente, donc l'outil est inclus). Les
     * écrans DOIVENT les distinguer : afficher « Abonnement actif » à quelqu'un
     * qui n'a jamais payé serait un mensonge de plus, pas un cadeau.
     */
    reason,
    /** Le Store a enregistré l'achat ; ce n'est pas encore un droit ouvert. */
    storeSaysActive: !!owner && storeActive,
    /** Échéance CONFIRMÉE. Une échéance non confirmée n'est pas une échéance. */
    expiresAtMs: server?.expiresAt ? Date.parse(server.expiresAt) : null,
    /** Résiliation vue par le Store : disponible jusqu'à la fin de la période. */
    cancelled: pro?.kind === 'active' && pro.cancelled === true,
    source: server ? 'server' as const : pro ? 'store' as const : null, reload } as const;
}
