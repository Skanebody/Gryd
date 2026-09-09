import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026 } from '../run/resultOwner2026';
import { readCommercialCollections2026, type CommercialCollection2026, type CommercialCollectionId2026 } from '../share/studioObjects2026';
import { fetchCollectionProducts2026, purchaseCollectionProduct2026, purchasesCapability, restorePremiumPurchases } from './client';
import type { StoreProductLike } from './offerings';
/** Issues NOMMÉES d'un achat de collection permanente (G28, §7.5). */
export type CommercialActionResult2026 =
  | 'confirmed' | 'pending' | 'cancelled' | 'already_owned' | 'declined'
  | 'store_problem' | 'network' | 'no_price' | 'unavailable' | 'failed';
const collectionListeners=new Set<()=>void>();
export function refreshCommercialCollections2026(){collectionListeners.forEach(listener=>listener());}
export async function fetchCommercialCollections2026(ownerId: string | null) {
  if (!supabase) return null;
  const auth = await supabase.auth.getSession();
  if (auth.error || (auth.data.session?.user.id ?? null) !== ownerId) return null;
  const call = supabase.rpc('get_commercial_collections_2026');
  const result = await (auth.data.session ? call.setHeader('Authorization', `Bearer ${auth.data.session.access_token}`) : call);
  return result.error ? null : readCommercialCollections2026(result.data);
}
export function useCommercialCollections2026() {
  const { session, loading } = useSession(); const ownerId = session?.user.id ?? null;
  const epoch = resultOwnerEpoch2026();
  const [revision,setRevision] = useState(0); const reload = useCallback(()=>refreshCommercialCollections2026(),[]);
  useEffect(()=>{const update=()=>setRevision(v=>v+1);collectionListeners.add(update);const sub=AppState.addEventListener('change',state=>{if(state==='active')update();});return()=>{collectionListeners.delete(update);sub.remove();};},[]);
  const [read,setRead] = useState<{ ownerId: string | null; epoch: number; rows: CommercialCollection2026[] | null; products: readonly StoreProductLike[] } | null>(null);
  const [busy,setBusy] = useState(false); const lock = useRef(false);
  const current = () => isResultOwnerCurrent2026(ownerId,epoch);
  useFocusEffect(useCallback(()=>{
    if (loading) return;
    let alive = true; setRead(null);
    void (async()=>{
      const rows = await fetchCommercialCollections2026(ownerId).catch(()=>null);
      const ids = rows?.filter(r=>r.configured && !r.owned).flatMap(r=>r.productIds) ?? [];
      const products = ownerId && ids.length && purchasesCapability().available ? await fetchCollectionProducts2026(ids,ownerId).catch(()=>null) : [];
      if(alive && isResultOwnerCurrent2026(ownerId,epoch)) setRead({ownerId,epoch,rows,products:products??[]});
    })(); return ()=>{alive=false;};
  },[ownerId,epoch,loading,revision]));
  const own = read?.ownerId===ownerId && read.epoch===epoch ? read : null;
  const productFor = (id: CommercialCollectionId2026) => { const row=own?.rows?.find(r=>r.id===id); return row && own?.products.find(p=>p.identifier && row.productIds.includes(p.identifier) && typeof p.priceString==='string' && p.priceString.trim() && typeof p.price==='number' && Number.isFinite(p.price) && p.price>0); };
  async function action(id: CommercialCollectionId2026 | 'restore'): Promise<CommercialActionResult2026> {
    // Quatre refus AVANT le Store, chacun avec son nom : la plateforme ne vend
    // pas ici, aucun prix confirmé, l'objet est déjà détenu — ce ne sont pas
    // des pannes, et « L'achat n'a pas pu être vérifié » les décrivait toutes.
    if (!ownerId || !current() || lock.current || !supabase || !purchasesCapability().available) return 'unavailable';
    const product = id === 'restore' ? null : productFor(id);
    if (id!=='restore' && own?.rows?.find(r=>r.id===id)?.owned) return 'already_owned';
    if (id!=='restore' && !product) return 'no_price';
    lock.current=true; setBusy(true);
    try {
      const result=id==='restore' ? await restorePremiumPurchases(ownerId) : await purchaseCollectionProduct2026(product!,ownerId);
      if(!current()) return 'cancelled';
      if(result.kind==='cancelled') return 'cancelled';
      if(result.kind==='failed') return result.failure==='already_owned' ? 'already_owned' : result.failure==='declined' ? 'declined'
        : result.failure==='store_problem' ? 'store_problem' : result.failure==='network' ? 'network'
        : result.failure==='pending' ? 'pending' : 'failed';
      const auth=await supabase.auth.getSession();
      if(!current() || auth.data.session?.user.id!==ownerId) return 'cancelled';
      const sync=await supabase.functions.invoke('sync_gryd_plus_access_2026',{body:{},headers:{Authorization:`Bearer ${auth.data.session.access_token}`}});
      const rows=sync.error?null:await fetchCommercialCollections2026(ownerId);
      if(!current()) return 'cancelled';
      reload();
      return rows && (id==='restore'?rows.some(r=>r.owned):rows.some(r=>r.id===id&&r.owned)) ? 'confirmed' : 'pending';
    } catch { return 'failed'; }
    finally { lock.current=false; if(current()) setBusy(false); }
  }
  return { rows:own?.rows??[], status:loading||!own?'loading':own.rows?'ready':'unavailable', productFor, busy, action, reload, canPurchase:!!ownerId&&purchasesCapability().available } as const;
}
