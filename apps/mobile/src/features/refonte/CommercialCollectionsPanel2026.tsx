import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026 } from '../run/resultOwner2026';
import { useCommercialCollections2026 } from '../premium/useCommercialCollections2026';
import { COMMERCIAL_OBJECTS_2026, commercialObjectPreview2026, type CommercialCollectionId2026 } from '../share/studioObjects2026';
import { requestStudioObject2026 } from '../share/studioObjectSelection2026';
import { CollectionIdentityArt2026, StudioObjectArtwork2026 } from '../share/StudioObjectArtwork2026';
import { ProfileButton, ProfileSection, s, useRefonteCopy } from './ProfilePrimitives';
import { GrydIcon } from '../../ui/gryd';
export function CommercialCollectionsPanel2026({ locale, tone = 'dark' }: {locale:'fr'|'en';tone?:'dark'|'light'}) {
  const {width}=useWindowDimensions(); const light=tone==='light', ink=light?c.ink:c.darkInk, muted=light?c.muted:c.darkMuted;
  const thumbnailWidth=Math.min(96,Math.max(48,(width-80)*0.28)), detailWidth=Math.min(224,Math.max(1,width-88));
  const copy=useRefonteCopy(),store=useCommercialCollections2026(),{session}=useSession();
  const [selected,setSelected]=useState<CommercialCollectionId2026|null>(null),[notice,setNotice]=useState<string|null>(null),[equipping,setEquipping]=useState(false);
  const row=store.rows.find(r=>r.id===selected),product=selected?store.productFor(selected):null;
  const describe=(id:CommercialCollectionId2026)=>id==='contour'?copy('2 affiches originales.','2 original posters.'):id==='relief'?copy('4 compositions et le cadre Relief.','4 compositions and the Relief frame.'):copy('6 compositions et un emblème personnel.','6 compositions and a personal emblem.');
  // G28 : chaque issue porte son nom. « L'achat n'a pas pu être vérifié »
  // couvrait aussi bien une plateforme sans achat qu'un refus du Store — deux
  // situations dont la suite à donner n'a rien de commun.
  async function purchase(id:CommercialCollectionId2026|'restore') {
    const result=await store.action(id);
    setNotice(
      result==='confirmed'?copy('Tes objets sont confirmés dans ton compte.','Your objects are confirmed in your account.')
      :result==='pending'?copy('Achat enregistré, en attente de confirmation. Actualise après la confirmation du Store.','Purchase registered, awaiting confirmation. Refresh once the Store confirms.')
      :result==='cancelled'?null
      :result==='already_owned'?copy('Cette collection est déjà à toi. Aucune nouvelle facturation.','You already own this collection. No new charge.')
      :result==='declined'?copy('Le Store a refusé l’achat. Vérifie ton moyen de paiement dans ses réglages.','The Store declined the purchase. Check your payment method in its settings.')
      :result==='store_problem'?copy('Le Store est indisponible pour le moment. Réessaie plus tard.','The Store is unavailable right now. Try again later.')
      :result==='network'?copy('La connexion au Store a échoué. Réessaie une fois en ligne.','The Store connection failed. Try again once online.')
      :result==='no_price'?copy('Aucun prix confirmé pour cette collection. Rien n’est proposé sans prix du Store.','No confirmed price for this collection. Nothing is offered without a Store price.')
      :result==='unavailable'?copy('L’achat n’est pas possible sur cet appareil. Tes objets restent liés à ton compte.','Purchasing is not possible on this device. Your objects stay linked to your account.')
      :copy('L’achat n’a pas pu être vérifié. Aucun objet ajouté.','The purchase could not be verified. No object added.'));
  }
  async function equip() {
    const owner=session?.user.id,epoch=resultOwnerEpoch2026(); if(!selected||!row?.owned||!owner||!supabase||equipping) return;
    setEquipping(true);setNotice(null);
    try{const auth=await supabase.auth.getSession();if(auth.data.session?.user.id!==owner||!isResultOwnerCurrent2026(owner,epoch))return;
      const result=await supabase.rpc('equip_commercial_collection_2026',{p_collection_id:selected,p_equip:!row.equipped}).setHeader('Authorization',`Bearer ${auth.data.session.access_token}`);
      if(!isResultOwnerCurrent2026(owner,epoch))return;if(result.error)throw result.error;store.reload();setNotice(copy('Ton profil a été mis à jour.','Your profile has been updated.'));
    }catch{setNotice(copy('Le choix n’a pas été enregistré.','This choice could not be saved.'));}finally{setEquipping(false);}
  }
  return <View><ProfileSection tone={tone} title={copy('Éditions permanentes','Permanent editions')}/><Text style={[s.meta,{color:muted}]}>{copy('Achat unique · non inclus dans GRYD+. Les rendus standards restent utilisables sans abonnement.','One-time purchase · not included in GRYD+. Standard renders remain usable without a subscription.')}</Text>
    {(Object.keys(COMMERCIAL_OBJECTS_2026) as CommercialCollectionId2026[]).map(id=>{const item=store.rows.find(r=>r.id===id);return <Pressable key={id} accessibilityRole="button" onPress={()=>{setSelected(id);setNotice(null);}} style={{paddingVertical:20,paddingHorizontal:light?16:0,marginTop:12,borderRadius:light?24:0,backgroundColor:light?c.surface:'transparent',flexDirection:'row',gap:12,borderBottomWidth:light?0:1,borderColor:c.darkSurfaceMuted,alignItems:'center'}}><StudioObjectArtwork2026 theme={tone} object={commercialObjectPreview2026(id,0)!} facts={null} width={thumbnailWidth} locale={locale}/><View style={{flex:1,gap:5}}><Text style={[s.linkTitle,{color:ink,fontFamily:fonts.displayMedium,fontSize:20,lineHeight:26}]}>{COMMERCIAL_OBJECTS_2026[id].name}</Text><Text style={[s.meta,{color:muted}]}>{describe(id)}</Text><Text style={[s.meta,{color:muted}]}>{item?.owned?copy('Possédé · permanent','Owned · permanent'):store.productFor(id)?.priceString??copy('Aperçu · vente indisponible','Preview · sale unavailable')}</Text></View><GrydIcon name="chevronRight" size={18} color={muted}/></Pressable>;})}
    {store.canPurchase?<Pressable accessibilityRole="button" disabled={store.busy} onPress={()=>void purchase('restore')} style={{minHeight:44,justifyContent:'center'}}><Text style={[s.linkAction,{color:ink}]}>{copy('Restaurer mes collections','Restore my collections')}</Text></Pressable>:null}
    <Modal visible={selected!==null} transparent animationType="slide" onRequestClose={()=>{if(!store.busy)setSelected(null);}}><View style={{flex:1,backgroundColor:c.scrim,justifyContent:'flex-end'}}><View style={{backgroundColor:light?c.surface:c.carbon,maxHeight:'90%',padding:20,paddingBottom:36,borderTopLeftRadius:24,borderTopRightRadius:24}}><ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={copy('Fermer','Close')} disabled={store.busy} onPress={()=>setSelected(null)} style={{width:44,height:44,borderRadius:22,backgroundColor:light?c.canvas:c.darkSurface,alignSelf:'flex-end',alignItems:'center',justifyContent:'center',marginBottom:12}}><GrydIcon name="close" size={20} color={ink}/></Pressable>
      {selected?<><Text style={[s.linkTitle,{color:ink,fontFamily:fonts.displayMedium,fontSize:20,lineHeight:26}]}>{COMMERCIAL_OBJECTS_2026[selected].name}</Text><Text style={[s.meta,{color:muted}]}>{describe(selected)}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:16,paddingVertical:20}}>{COMMERCIAL_OBJECTS_2026[selected].designs.map((id,index)=>{const object=commercialObjectPreview2026(selected,index)!;return <View key={id} style={{width:detailWidth,gap:12}}><StudioObjectArtwork2026 theme={tone} object={object} facts={null} width={detailWidth} locale={locale}/><Text style={[s.meta,{color:muted}]}>{object.name} · {copy('aperçu du modèle','template preview')}</Text>{row?.owned?<ProfileButton tone={tone} secondary label={copy('Créer depuis une sortie','Create from an activity')} onPress={()=>{if(session&&requestStudioObject2026(object.request,session.user.id)){setSelected(null);router.push('/partage');}}}/>:null}</View>;})}</ScrollView>
      {selected!=='contour'?<View style={{flexDirection:'row',gap:14,alignItems:'center',marginBottom:16}}><CollectionIdentityArt2026 light={light} kind={selected==='relief'?'frame':'emblem'} size={64}/><View style={{flex:1}}><Text style={[s.meta,{color:muted}]}>{selected==='relief'?copy('Cadre Relief · profil','Relief frame · profile'):copy('Emblème personnel · profil','Personal emblem · profile')}</Text>{row?.owned?<Pressable accessibilityRole="button" disabled={equipping} onPress={()=>void equip()} style={{minHeight:44,justifyContent:'center'}}><Text style={[s.linkAction,{color:ink}]}>{row.equipped?copy('Retirer du profil','Remove from profile'):copy('Équiper sur le profil','Equip on profile')}</Text></Pressable>:null}</View></View>:null}
      {!row?.owned?product&&store.canPurchase?<ProfileButton tone={tone} label={`${copy('Acheter','Buy')} · ${product.priceString}`} busy={store.busy} onPress={()=>void purchase(selected)}/>:<Text style={[s.meta,{color:muted}]}>{copy('Cette collection n’est pas disponible à l’achat sur cet appareil. Aucun prix n’est présumé.','This collection is unavailable to purchase on this device. No price is assumed.')}</Text>:<Text style={[s.meta,{color:muted}]}>{copy('Collection possédée · aucune nouvelle facturation.','Collection owned · no additional charge.')}</Text>}
      <Text style={[s.meta,{color:muted,marginTop:12}]}>{copy('Achat unique, non inclus dans GRYD+. Aucun effet sur l’XP, le territoire ou les défis.','One-time purchase, not included in GRYD+. No effect on XP, territory or challenges.')}</Text></>:null}
      {notice?<Text accessibilityRole="alert" style={[s.meta,{color:muted,marginTop:12}]}>{notice}</Text>:null}
    </ScrollView></View></View></Modal>
    {!selected&&notice?<Text accessibilityRole="alert" style={[s.meta,{color:muted}]}>{notice}</Text>:null}
  </View>;
}
