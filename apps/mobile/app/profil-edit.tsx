import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../src/lib/session';
import { screen } from '../src/lib/analytics';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useMyProfile, type EditableProfile } from '../src/features/social/profileStore';
import { useSocialEpoch2026, pickSocialImage2026 } from '../src/features/social/social2026Data';
import { socialError2026 } from '../src/features/social/social2026Model';
import { ProfileButton, ProfilePage, ProfileSection, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
import { GrydIcon } from '../src/ui/gryd';
export default function ProfileEdit(){const {session}=useSession();const epoch=useSocialEpoch2026();return <Editor key={epoch+':'+(session?.user.id??'guest')} />;}
function Editor(){
 const copy=useRefonteCopy();const {session,configured}=useSession();const account=useMyProfile();
 const [draft,setDraft]=useState<EditableProfile|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 useEffect(()=>{screen('profil_edit')},[]);
 useEffect(()=>{if(!account.loading&&!draft&&!account.failed)setDraft(account.editable)},[account.loading,account.failed,account.editable,draft]);
 const patch=(value:Partial<EditableProfile>)=>setDraft(current=>current?{...current,...value}:current);
 async function save(){if(!draft||busy)return;setBusy(true);setError(null);try{await account.save(draft);router.back()}catch(e){setError(socialError2026(String(e),copy('fr','en')==='en'))}finally{setBusy(false)}}
 return <ProfilePage title={copy('Modifier le profil','Edit profile')} back>
 {!session?<><Text style={s.body}>{copy('Connecte-toi pour enregistrer ton identité.','Sign in to save your identity.')}</Text>{configured?<ProfileButton label={copy('Connexion','Sign in')} onPress={()=>router.push('/sign-in')}/>:null}</>:account.loading?<ActivityIndicator color={c.darkInk}/>:account.failed?<><Text style={s.body}>{copy('Le profil est indisponible.','Profile unavailable.')}</Text><ProfileButton label={copy('Réessayer','Retry')} onPress={account.reload}/></>:draft?<>
 <View style={styles.portraitRow}><View style={styles.portrait}>{draft.avatarUri?<Image source={{uri:draft.avatarUri}} style={styles.image}/>:<GrydIcon name="profile" size={30} color={c.darkMuted}/>}</View><View style={s.flex}><Pressable style={styles.action} accessibilityRole="button" onPress={()=>void pickSocialImage2026().then(uri=>{if(uri)patch({avatarUri:uri})}).catch(()=>setError(copy('Cette photo ne peut pas être ouverte.','This photo could not be opened.')))}><Text style={styles.link}>{copy('Choisir une photo','Choose photo')}</Text></Pressable>{draft.avatarUri?<Pressable style={styles.action} accessibilityRole="button" onPress={()=>patch({avatarUri:'',avatarPath:null})}><Text style={s.meta}>{copy('Retirer la photo','Remove photo')}</Text></Pressable>:null}</View></View>
 <Text style={s.meta}>{copy('La photo choisie sera partagée avec les personnes autorisées à voir ton profil. Les métadonnées sont retirées avant envoi.','Your chosen photo will be shared with people allowed to view your profile. Metadata is removed before upload.')}</Text>
 {([{key:'displayName',label:copy('Nom affiché','Display name'),max:40},{key:'handle',label:copy('Pseudo','Handle'),max:20},{key:'bio',label:copy('Bio','Bio'),max:280}] as const).map(field=><View key={field.key} style={styles.field}><Text style={styles.label}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={draft[field.key]} onChangeText={value=>patch({[field.key]:value})} style={[s.input,field.key==='bio'&&styles.bio]} maxLength={field.max} autoCapitalize={field.key==='handle'?'none':'sentences'} autoCorrect={field.key!=='handle'} multiline={field.key==='bio'} placeholderTextColor={c.darkMuted}/></View>)}
 <ProfileSection title={copy('Qui voit ton profil ?','Who sees your profile?')}/>
 {([{key:'private',label:copy('Moi uniquement','Only me')},{key:'friends',label:copy('Mes amis','Friends')},{key:'crew',label:copy('Mon crew et mes amis','Crew and friends')},{key:'public',label:copy('Les membres GRYD','GRYD members')}] as const).map(option=><Pressable key={option.key} style={styles.visibility} accessibilityRole="radio" accessibilityState={{selected:(draft.visibility??'crew')===option.key}} onPress={()=>patch({visibility:option.key})}><Text style={styles.label}>{option.label}</Text><GrydIcon name={(draft.visibility??'crew')===option.key?'check':'plus'} size={18} color={c.darkInk}/></Pressable>)}
 <Text style={[s.meta,{marginVertical:16}]}>{copy('Ce choix ne publie aucune sortie ni position. Les anciens profils locaux restent sur cet appareil.','This choice publishes no activities or location. Previous local profiles stay on this device.')}</Text>
 {error?<Text accessibilityRole="alert" style={s.body}>{error}</Text>:null}<View style={{alignSelf:'flex-start',marginTop:18}}><ProfileButton label={copy('Enregistrer','Save')} busy={busy} disabled={!draft.displayName.trim()||!draft.handle.trim()} onPress={()=>void save()}/></View>
 </>:null}
 </ProfilePage>;
}
const styles=StyleSheet.create({portraitRow:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:12},portrait:{width:64,height:64,borderRadius:32,backgroundColor:c.darkSurface,alignItems:'center',justifyContent:'center',overflow:'hidden'},image:{width:'100%',height:'100%'},action:{minHeight:44,justifyContent:'center'},link:{color:c.darkInk,fontFamily:fonts.textMedium,fontSize:13},field:{gap:6,marginTop:14},label:{color:c.darkInk,fontFamily:fonts.text,fontSize:14},bio:{minHeight:80,textAlignVertical:'top'},visibility:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:c.darkSurfaceMuted}});
