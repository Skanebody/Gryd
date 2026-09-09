import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useCommercialCollections2026 } from '../premium/useCommercialCollections2026';
import { CollectionIdentityArt2026 } from '../share/StudioObjectArtwork2026';
/** Server-owned permanent identity. Can wrap the existing avatar without claiming a sporting merit. */
export function CommercialIdentity2026({children,size=56}:{children:ReactNode;size?:number}) {
  const store=useCommercialCollections2026();
  const frame=store.rows.some(r=>r.id==='relief'&&r.owned&&r.equipped),emblem=store.rows.some(r=>r.id==='clubhouse'&&r.owned&&r.equipped);
  return <View style={{position:'relative',padding:frame?6:0}}>{children}{frame?<View pointerEvents="none" style={{position:'absolute',top:-5,left:-5}}><CollectionIdentityArt2026 kind="frame" size={size+22}/></View>:null}{emblem?<View pointerEvents="none" style={{position:'absolute',right:-13,bottom:-10}}><CollectionIdentityArt2026 kind="emblem" size={34}/></View>:null}</View>;
}
