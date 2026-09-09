import { supabase } from '../../lib/supabase';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026 } from '../run/resultOwner2026';
import { readCommercialCollections2026, resolveStudioObject2026, type StudioObjectRequest2026, type StudioOwnedReward2026 } from './studioObjects2026';
/** Recheck the exact permanent right immediately before preparing an export. */
export async function verifyStudioObject2026(request: StudioObjectRequest2026, ownerId: string | null) {
  if (!supabase || !ownerId || !isResultOwnerCurrent2026(ownerId)) return false;
  const epoch=resultOwnerEpoch2026();
  const auth=await supabase.auth.getSession();
  if(auth.error || auth.data.session?.user.id!==ownerId || !isResultOwnerCurrent2026(ownerId,epoch)) return false;
  const Authorization=`Bearer ${auth.data.session.access_token}`;
  if(request.kind==='commercial') {
    const result=await supabase.rpc('get_commercial_collections_2026').setHeader('Authorization',Authorization);
    const rows=result.error?null:readCommercialCollections2026(result.data);
    return isResultOwnerCurrent2026(ownerId,epoch) && !!rows && !!resolveStudioObject2026(request,[],rows);
  }
  const result=await supabase.functions.invoke('progression_2026',{body:{},headers:{Authorization}});
  const data=result.data as {ruleset?:string;ownedRewards?:StudioOwnedReward2026[]}|null;
  return isResultOwnerCurrent2026(ownerId,epoch) && !result.error && data?.ruleset==='2026.1' && Array.isArray(data.ownedRewards) && !!resolveStudioObject2026(request,data.ownedRewards,[]);
}
