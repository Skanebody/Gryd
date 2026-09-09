import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { refonteColors as c } from '@klaim/shared';
import { useSession } from '../src/lib/session';
import { resultOwnerEpoch2026 } from '../src/features/run/resultOwner2026';
import { screen } from '../src/lib/analytics';
import { useSocialEpoch2026, pickSocialImage2026, socialRpc2026, uploadSocialImage2026, useSocialRead2026 } from '../src/features/social/social2026Data';
import { socialError2026 } from '../src/features/social/social2026Model';
import { ProfileButton, ProfileLink, ProfilePage, lightStyles, s as darkStyles, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
import { GrydIcon } from '../src/ui/gryd';
const s = { ...darkStyles, ...lightStyles };
type Context={runId:string;activity:'run'|'bike';distanceM:number;durationS:number;crewName:string;crewId:string;profileReady:boolean;published:boolean};
export default function PublishRoute(){const {session}=useSession();const epoch=useSocialEpoch2026();return <Composer key={epoch+':'+(session?.user.id??'guest')}/>;}
function Composer(){const copy=useRefonteCopy();const {runId}=useLocalSearchParams<{runId:string}>();const context=useSocialRead2026<Context|null>('social_publication_context_2026',{p_run_id:runId});
 const [body,setBody]=useState('');const [image,setImage]=useState<string|null>(null);const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);const lock=useRef(false);const [error,setError]=useState<string|null>(null);const [clientId]=useState(()=>Crypto.randomUUID());const uploaded=useRef<{uri:string;path:string}|null>(null);
 useEffect(()=>{screen('crew_publication')},[]);
 useEffect(()=>{setConsent(false)},[context.data?.crewId]);
 async function publish(){if(lock.current||!context.owner||!context.data||!consent)return;const epoch=resultOwnerEpoch2026(),expectedCrewId=context.data.crewId;lock.current=true;setBusy(true);setError(null);try{
  let mediaPath:string|null=null;if(image){if(uploaded.current?.uri!==image)uploaded.current={uri:image,path:await uploadSocialImage2026(context.owner,image,'post',epoch)};mediaPath=uploaded.current.path;}
  await socialRpc2026(context.owner,'social_publish_2026',{p_client_id:clientId,p_run_id:runId,p_body:body,p_media_path:mediaPath,p_consent:true,p_expected_crew_id:expectedCrewId},epoch);router.replace({pathname:'/crew-feed',params:{activity:context.data.activity}});
 }catch(e){if(String(e).includes('crew_changed')){setConsent(false);context.reload()}setError(socialError2026(String(e),copy('fr','en')==='en'))}finally{setBusy(false);lock.current=false}}
 return <ProfilePage tone="light" title={copy('Partager une sortie','Share activity')} back>
 {context.status==='loading'?<ActivityIndicator color={c.ink}/>:context.status==='failed'?<><Text style={s.body}>{copy('L’aperçu n’a pas pu être chargé.','The preview could not be loaded.')}</Text><ProfileButton tone="light" label={copy('Réessayer','Retry')} onPress={context.reload}/></>:!context.data?<><Text style={s.body}>{copy('Une sortie confirmée et un crew sont nécessaires.','A confirmed activity and crew membership are required.')}</Text><ProfileLink tone="light" title={copy('Mon crew','My crew')} icon="crew" onPress={()=>router.push('/(tabs)/crew')}/></>:!context.data.profileReady?<><Text style={s.body}>{copy('Enregistre ton nom et ton pseudo avant de publier.','Save your name and handle before posting.')}</Text><ProfileButton tone="light" label={copy('Mon profil','My profile')} onPress={()=>router.push('/profil-edit')}/></>:context.data.published?<><Text style={s.body}>{copy('Cette sortie a déjà été partagée avec ce crew.','This activity has already been shared with this crew.')}</Text><ProfileLink tone="light" title={copy('Voir le fil','View feed')} icon="feed" onPress={()=>router.replace({pathname:'/crew-feed',params:{activity:context.data!.activity}})}/></>:<>
 <Text style={s.linkTitle}>{context.data.crewName}</Text><View style={{flexDirection:'row',alignItems:'center',gap:12,marginVertical:20}}><GrydIcon name={context.data.activity} size={24} color={c.ink}/><Text style={s.title}>{(context.data.distanceM/1000).toFixed(2)} km</Text><Text style={s.meta}>{Math.round(context.data.durationS/60)} min</Text></View>
 {image?<Image source={{uri:image}} style={{height:260,width:'100%',borderRadius:12,marginBottom:16}} resizeMode="cover"/>:null}
 <ProfileLink tone="light" title={image?copy('Changer la photo','Change photo'):copy('Ajouter une photo','Add photo')} icon="plus" onPress={()=>void pickSocialImage2026().then(uri=>{if(uri)setImage(uri)}).catch(()=>setError(copy('Photo indisponible.','Photo unavailable.')))}/>
 {image?<ProfileLink tone="light" title={copy('Retirer la photo','Remove photo')} icon="fermer" onPress={()=>setImage(null)}/>:null}
 <TextInput accessibilityLabel={copy('Ton récit','Your caption')} placeholder={copy('Un mot sur cette sortie…','A few words about this activity…')} placeholderTextColor={c.muted} value={body} onChangeText={setBody} multiline maxLength={600} style={[s.input,{minHeight:110,textAlignVertical:'top',marginVertical:18}]}/>
 <Text style={s.meta}>{copy('Seuls le résumé, ton texte et la photo choisie seront publiés. Aucune trace GPS. Les métadonnées de la photo sont retirées.','Only the summary, your text and chosen photo will be published. No GPS trace. Photo metadata is removed.')}</Text>
 <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} aria-checked={consent} onPress={()=>setConsent(!consent)} style={{flexDirection:'row',gap:12,alignItems:'center',minHeight:64}}><GrydIcon name={consent?'check':'plus'} size={22} color={c.ink}/><Text style={[s.body,s.flex]}>{copy(`Partager avec les membres de ${context.data.crewName}`,`Share with ${context.data.crewName} members`)}</Text></Pressable>
 {error?<Text accessibilityRole="alert" style={s.body}>{error}</Text>:null}<View style={{alignSelf:'flex-start',marginTop:12}}><ProfileButton tone="light" label={copy('Publier','Publish')} busy={busy} disabled={!consent} onPress={()=>void publish()}/></View>
 </>}
 </ProfilePage>;
}
