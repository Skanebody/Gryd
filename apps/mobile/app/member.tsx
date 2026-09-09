import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { refonteColors as c } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { useSession } from '../src/lib/session';
import { useSocialEpoch2026, socialRpc2026, useSocialRead2026 } from '../src/features/social/social2026Data';
import { socialError2026, type SocialPerson2026 } from '../src/features/social/social2026Model';
import { SocialAvatar2026 } from '../src/features/social/SocialPostCard2026';
import { ProfileButton, ProfileLink, ProfilePage, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
export default function MemberRoute(){const {session}=useSession();const epoch=useSocialEpoch2026();return <Member key={epoch+':'+(session?.user.id??'guest')}/>;}
function Member(){const copy=useRefonteCopy();const params=useLocalSearchParams<{userId?:string;handle?:string}>();const person=useSocialRead2026<SocialPerson2026|null>(params.userId?'social_member_2026':'social_member_by_handle_2026',params.userId?{p_user_id:params.userId}:{p_handle:params.handle??''});const [busy,setBusy]=useState(false);const [notice,setNotice]=useState<string|null>(null);
 useEffect(()=>{screen('member_profile')},[]);
 async function act(rpc:string,args:Record<string,unknown>,message:string){if(!person.owner||busy)return;setBusy(true);try{const result=await socialRpc2026<{ok?:boolean;reason?:string}>(person.owner,rpc,args);if(result?.ok===false)throw new Error(result.reason);setNotice(message);person.reload()}catch(e){setNotice(socialError2026(String(e),copy('fr','en')==='en'))}finally{setBusy(false)}}
 return <ProfilePage title={copy('Profil du membre','Member profile')} back>
 {person.status==='loading'?<ActivityIndicator color={c.darkInk}/>:person.status==='failed'?<ProfileButton label={copy('Réessayer','Retry')} onPress={person.reload}/>:person.data?<>
 <View style={{flexDirection:'row',alignItems:'center',gap:18,marginVertical:18}}><SocialAvatar2026 person={person.data} size={80}/><View style={s.flex}><Text style={s.title}>{person.data.name}</Text><Text style={s.meta}>@{person.data.handle}</Text></View></View>{person.data.bio?<Text style={s.body}>{person.data.bio}</Text>:null}
 {person.data.isMe?<ProfileLink title={copy('Modifier mon profil','Edit my profile')} icon="profil" onPress={()=>router.push('/profil-edit')}/>:<>
 <View style={{alignSelf:'flex-start',marginTop:24}}><ProfileButton label={copy('Demander en ami','Add friend')} busy={busy} onPress={()=>void act('friend_request',{p_handle:person.data!.handle},copy('Demande envoyée.','Request sent.'))}/></View>
 <ProfileLink title={copy('Suivre','Follow')} icon="ami" onPress={()=>void act('follow_user',{p_handle:person.data!.handle},copy('Abonnement enregistré.','Following saved.'))}/>
 <ProfileLink title={copy('Ne plus suivre','Unfollow')} icon="ami" onPress={()=>void act('unfollow_user',{p_handle:person.data!.handle},copy('Abonnement retiré.','Following removed.'))}/>
 <ProfileLink title={copy('Bloquer ce membre','Block member')} icon="verrou" onPress={()=>void act('social_block_2026',{p_user_id:person.data!.id,p_blocked:true},copy('Membre bloqué.','Member blocked.'))}/>
 </>}
 </>:<Text style={s.body}>{copy('Ce profil est privé ou indisponible.','This profile is private or unavailable.')}</Text>}
 {notice?<Text accessibilityRole="alert" style={[s.meta,{marginTop:18}]}>{notice}</Text>:null}
 </ProfilePage>;
}
