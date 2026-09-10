/**
 * GRYD — ÉDITION DU PROFIL. En tête : la PHOTO DE PROFIL.
 *
 * Retour fondateur (iPhone, 10/09/2026) : « dans les paramètres du profil, il
 * faut pouvoir mettre sa photo de profil ». Le bloc « Photo de profil » ouvre
 * donc l'écran, avec ses trois gestes explicites, sa photo en grand, et un état
 * peint pour chaque issue réelle (permission refusée, hors ligne, échec, envoi
 * en cours) — jamais un rond gris qui tourne sans fin.
 *
 * ─── LE CIRCUIT EXACT DE LA PHOTO ───────────────────────────────────────────
 *   photothèque / appareil photo   (expo-image-picker, recadrage carré)
 *     → `uploadSocialImage2026`    (métadonnées retirées, ≤ 5 Mio)
 *     → bucket `social-2026`, chemin `<uid>/avatar/<uuid>.jpg`   (policy 0124)
 *     → `save_my_social_profile_2026` écrit `user_profiles.avatar_path_2026`
 *     → relecture : URL SIGNÉE (le bucket est privé) → Profil, carte, cards.
 *
 * ─── POURQUOI L'ENVOI A LIEU AU CHOIX, ET L'APPLICATION À « ENREGISTRER » ───
 * L'envoi est la seule opération LONGUE de cet écran. La laisser dans
 * « Enregistrer » revenait à faire tourner un bouton pendant dix secondes sans
 * dire ce qui se passe, et à confondre deux échecs différents (« ta photo n'est
 * pas partie » et « ton pseudo est déjà pris »). Elle a donc son propre
 * indicateur BORNÉ et son propre « Réessayer ». Ce que la photo devient ensuite
 * est un champ comme les autres : elle s'applique à l'enregistrement, et le
 * bloc le DIT au lieu de le laisser deviner.
 *
 * ─── LE MÉNAGE DU BUCKET (aucun visage oublié) ──────────────────────────────
 * Le bucket n'a PAS de policy UPDATE (0124) : chaque photo est un objet neuf.
 * Sans ménage, une photo changée trois fois laisserait trois visages derrière
 * elle. Deux moments, deux règles, aucune ambiguïté :
 *   · enregistrement réussi → l'objet que le profil ne référence PLUS est
 *     supprimé (policy `social_media_delete_2026`) ;
 *   · écran quitté sans enregistrer → les objets déposés pendant la session, que
 *     le serveur n'a JAMAIS référencés, sont supprimés. L'objet du serveur, lui,
 *     n'est jamais touché tant qu'un enregistrement ne l'a pas remplacé.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../src/lib/session';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useMyProfile, type EditableProfile } from '../src/features/social/profileStore';
import { useSocialEpoch2026, uploadSocialImage2026 } from '../src/features/social/social2026Data';
import { socialError2026 } from '../src/features/social/social2026Model';
import { avatarPathAccepted, avatarUploadRefusal, cameraAvatarAvailable, captureAvatarPhoto, pickAvatarPhoto } from '../src/features/social/avatarPhoto';
import { discardAvatarObject2026, signMyAvatarUrl2026 } from '../src/features/social/myAvatar';
import { classifyAppError } from '../src/ui/appErrorPolicy';
import { ProfileButton, ProfilePage, ProfileSection, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
import { AccountDoor2026 } from '../src/features/account/AccountDoor2026';
import { GrydIcon } from '../src/ui/gryd';

/** Diamètre de la photo en tête d'écran. Une mesure de composition, pas une règle de jeu. */
const AVATAR_PX = 112;
/**
 * Plafond de l'envoi. C'est ce qui rend l'indicateur BORNÉ : passé ce délai on
 * ne « continue pas d'attendre », on rend la main avec un motif et un
 * « Réessayer ». Un envoi de photo qui dure plus longtemps a échoué, même si la
 * requête, elle, n'a encore rien répondu.
 */
const UPLOAD_TIMEOUT_MS = 30_000;

type PhotoSource = 'library' | 'camera';
/** Un état = une chose vraie à afficher. Aucun n'est un repli inventé. */
type PhotoState =
 | { kind: 'idle' }
 | { kind: 'sending' }
 | { kind: 'ready' }
 /** `retryUri` = la photo à renvoyer. `null` quand l'échec vient du sélecteur
  *  lui-même : il n'y a alors RIEN à renvoyer, et « Réessayer l'envoi » serait
  *  un bouton mort. L'écran ne le peint pas dans ce cas. */
 | { kind: 'failed'; message: string; retryUri: string | null }
 | { kind: 'denied'; canAskAgain: boolean; source: PhotoSource }
 | { kind: 'unavailable'; source: PhotoSource };

export default function ProfileEdit(){const {session}=useSession();const epoch=useSocialEpoch2026();return <Editor key={epoch+':'+(session?.user.id??'guest')} />;}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
 return new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('upload_timeout')), ms);
  work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error as Error); });
 });
}

function Editor(){
 const copy=useRefonteCopy();const {session}=useSession();const account=useMyProfile();const owner=session?.user.id??null;
 const [draft,setDraft]=useState<EditableProfile|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 /** Le chemin que le SERVEUR référence aujourd'hui. Jamais supprimé sans enregistrement. */
 const serverPath=useRef<string|null>(null);
 /** Les objets déposés PENDANT cette session d'édition (donc supprimables par nous). */
 const uploaded=useRef<string[]>([]);
 const ownerRef=useRef<string|null>(owner);ownerRef.current=owner;
 useEffect(()=>{screen('profil_edit')},[]);
 useEffect(()=>{if(!account.loading&&!draft&&!account.failed){setDraft(account.editable);serverPath.current=account.editable.avatarPath??null;}},[account.loading,account.failed,account.editable,draft]);
 // Quitter sans enregistrer ne doit rien laisser derrière : ce que le serveur
 // n'a jamais référencé n'a aucune raison de survivre dans le bucket.
 useEffect(()=>()=>{const uid=ownerRef.current;if(!uid)return;for(const path of uploaded.current)if(path!==serverPath.current)void discardAvatarObject2026(uid,path);},[]);
 const patch=(value:Partial<EditableProfile>)=>setDraft(current=>current?{...current,...value}:current);
 async function save(){
  if(!draft||busy)return;setBusy(true);setError(null);
  try{
   await account.save(draft);
   const kept=draft.avatarPath??null;const uid=ownerRef.current;
   // L'enregistrement a réussi : le serveur ne référence plus que `kept`.
   const orphans=[...uploaded.current,serverPath.current].filter((path):path is string=>!!path&&path!==kept);
   serverPath.current=kept;uploaded.current=[];
   if(uid)for(const path of orphans)void discardAvatarObject2026(uid,path);
   haptics.success();router.back();
  }catch(e){haptics.error();setError(socialError2026(String(e),copy('fr','en')==='en'))}finally{setBusy(false)}
 }
 return <ProfilePage title={copy('Modifier le profil','Edit profile')} back>
 {!session?<AccountDoor2026 reason={copy('Ton nom, ton pseudo et ta photo s’enregistrent sur ton compte, pas sur ce téléphone.','Your name, handle and photo are saved to your account, not to this phone.')}/>:account.loading?<ActivityIndicator color={c.darkInk}/>:account.failed?<><Text style={s.body}>{copy('Le profil est indisponible.','Profile unavailable.')}</Text><ProfileButton label={copy('Réessayer','Retry')} onPress={account.reload}/></>:draft?<>
 <AvatarField owner={owner} draft={draft} patch={patch} copy={copy} onUploaded={path=>{uploaded.current=[...uploaded.current,path]}}/>
 {([{key:'displayName',label:copy('Nom affiché','Display name'),max:40},{key:'handle',label:copy('Pseudo','Handle'),max:20},{key:'bio',label:copy('Bio','Bio'),max:280}] as const).map(field=><View key={field.key} style={styles.field}><Text style={styles.label}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={draft[field.key]} onChangeText={value=>patch({[field.key]:value})} style={[s.input,field.key==='bio'&&styles.bio]} maxLength={field.max} autoCapitalize={field.key==='handle'?'none':'sentences'} autoCorrect={field.key!=='handle'} multiline={field.key==='bio'} placeholderTextColor={c.darkMuted}/></View>)}
 <ProfileSection title={copy('Qui voit ton profil ?','Who sees your profile?')}/>
 {([{key:'private',label:copy('Moi uniquement','Only me')},{key:'friends',label:copy('Mes amis','Friends')},{key:'crew',label:copy('Mon crew et mes amis','Crew and friends')},{key:'public',label:copy('Les membres GRYD','GRYD members')}] as const).map(option=><Pressable key={option.key} style={styles.visibility} accessibilityRole="radio" accessibilityState={{selected:(draft.visibility??'crew')===option.key}} onPress={()=>patch({visibility:option.key})}><Text style={styles.label}>{option.label}</Text><GrydIcon name={(draft.visibility??'crew')===option.key?'check':'plus'} size={18} color={c.darkInk}/></Pressable>)}
 <Text style={[s.meta,{marginVertical:16}]}>{copy('Ce choix ne publie aucune sortie ni position. Les anciens profils locaux restent sur cet appareil.','This choice publishes no activities or location. Previous local profiles stay on this device.')}</Text>
 {error?<Text accessibilityRole="alert" style={s.body}>{error}</Text>:null}<View style={{alignSelf:'flex-start',marginTop:18}}><ProfileButton label={copy('Enregistrer','Save')} busy={busy} disabled={!draft.displayName.trim()||!draft.handle.trim()} onPress={()=>void save()}/></View>
 </>:null}
 </ProfilePage>;
}

/**
 * LE BLOC PHOTO. Il ne connaît que trois faits : ce que le brouillon porte, à
 * qui appartient le compte, et ce que la dernière tentative a donné.
 */
function AvatarField({owner,draft,patch,copy,onUploaded}:{
 owner:string|null;draft:EditableProfile;patch:(value:Partial<EditableProfile>)=>void;
 copy:(fr:string,en:string)=>string;onUploaded:(path:string)=>void;
}){
 const en=copy('fr','en')==='en';
 const [state,setState]=useState<PhotoState>({kind:'idle'});
 /** Aperçu LOCAL : la photo s'affiche à l'instant du choix, avant tout réseau. */
 const [preview,setPreview]=useState<string|null>(null);
 const alive=useRef(true);useEffect(()=>()=>{alive.current=false},[]);
 // La caméra n'est proposée que si CE binaire la déclare (sans
 // NSCameraUsageDescription, iOS ne « refuse » pas : il tue l'app).
 const cameraCapability=cameraAvatarAvailable();
 const shown=preview??(draft.avatarUri||null);

 /** `uri` nul = rien à envoyer : le geste est sans objet, on ne fait rien. */
 async function send(uri:string|null,bytes:number|null){
  if(!owner||!uri)return;
  // Refus AVANT le réseau, quand le sélecteur a donné la taille : lire 8 Mo en
  // mémoire pour se les faire refuser par le bucket coûte une attente inutile,
  // et le motif serait noyé dans un échec d'envoi générique. `retryUri` reste
  // nul : renvoyer la MÊME photo trop lourde ne marchera pas davantage, c'est
  // une autre photo qu'il faut — le message le dit.
  const refusal=bytes===null?null:avatarUploadRefusal({bytes});
  if(refusal){haptics.error();setState({kind:'failed',message:socialError2026(refusal,en),retryUri:null});return;}
  setState({kind:'sending'});
  try{
   const path=await withTimeout(uploadSocialImage2026(owner,uri,'avatar'),UPLOAD_TIMEOUT_MS);
   // Garde-fou : le chemin doit satisfaire la MÊME regex que la policy 0124.
   // S'il ne la satisfait pas, le profil ne pourra pas le référencer — mieux
   // vaut le dire ici que laisser « Enregistrer » échouer sans expliquer.
   if(!avatarPathAccepted(path)){if(alive.current)setState({kind:'failed',message:socialError2026('invalid_media',en),retryUri:null});return;}
   onUploaded(path);
   const signed=await signMyAvatarUrl2026(path);
   if(!alive.current)return;
   // `avatarUri` en https:// (ou vide) : `saveProfile` n'a plus rien à
   // téléverser, il se contente d'écrire `avatarPath`. L'aperçu reste local.
   patch({avatarPath:path,avatarUri:signed??''});
   setState({kind:'ready'});haptics.success();
  }catch(e){
   if(!alive.current)return;
   haptics.error();setState({kind:'failed',message:uploadFailureMessage(e,en),retryUri:uri});
  }
 }

 async function choose(source:PhotoSource){
  if(!owner)return;
  haptics.light();setState({kind:'idle'});
  try{
   const result=source==='camera'?await captureAvatarPhoto():await pickAvatarPhoto();
   if(!alive.current)return;
   if(result.kind==='canceled')return;
   if(result.kind==='denied'){setState({kind:'denied',canAskAgain:result.canAskAgain,source});return;}
   if(result.kind==='unavailable'){setState({kind:'unavailable',source});return;}
   setPreview(result.uri);await send(result.uri,result.bytes);
  }catch(e){if(alive.current)setState({kind:'failed',message:uploadFailureMessage(e,en),retryUri:null});}
 }

 function remove(){
  haptics.light();setPreview(null);
  // On n'efface rien dans le bucket ici : tant que l'enregistrement n'a pas eu
  // lieu, le serveur référence encore cette photo. Le ménage suit la sauvegarde.
  patch({avatarUri:'',avatarPath:null});setState({kind:'idle'});
 }

 const sending=state.kind==='sending';
 /** La photo qu'un « Réessayer » renverrait. `null` = pas de bouton du tout. */
 const retryUri=state.kind==='failed'?state.retryUri:null;
 return <View style={styles.photoBlock}>
  <ProfileSection title={copy('Photo de profil','Profile photo')}/>
  <View style={styles.photoRow}>
   <View style={styles.portrait} accessibilityRole="image" accessibilityLabel={shown?copy('Ta photo de profil actuelle','Your current profile photo'):copy('Aucune photo de profil','No profile photo')}>
    {shown?<Image source={{uri:shown}} style={styles.image}/>:<GrydIcon name="profile" size={40} color={c.darkMuted}/>}
    {sending?<View style={styles.portraitVeil}><ActivityIndicator color={c.darkInk}/></View>:null}
   </View>
   <View style={s.flex}>
    <Text style={styles.photoLead}>{state.kind==='failed'?copy('Cette photo n’est pas encore envoyée.','This photo is not uploaded yet.'):shown?copy('Ta photo est en place.','Your photo is set.'):copy('Aucune photo pour l’instant. Ton avatar affiche ton initiale.','No photo yet. Your avatar shows your initial.')}</Text>
    {/* L’anti-honte n’a de sens que face au VIDE : répéter « facultatif » à quelqu’un
        qui vient d’en mettre une reviendrait à le pousser à la retirer. */}
    {shown?null:<Text style={s.meta}>{copy('Rester derrière ton pseudo est un choix entier, pas un profil incomplet.','Staying behind your handle is a full choice, not an incomplete profile.')}</Text>}
   </View>
  </View>

  <View style={styles.photoActions}>
   <Pressable style={styles.action} accessibilityRole="button" accessibilityState={{disabled:sending}} disabled={sending} onPress={()=>void choose('library')}>
    <GrydIcon name="photo" size={18} color={c.darkInk}/><Text style={styles.link}>{copy('Choisir dans la photothèque','Choose from library')}</Text>
   </Pressable>
   {cameraCapability==='capable'?<Pressable style={styles.action} accessibilityRole="button" accessibilityState={{disabled:sending}} disabled={sending} onPress={()=>void choose('camera')}>
    <GrydIcon name="camera" size={18} color={c.darkInk}/><Text style={styles.link}>{copy('Prendre une photo','Take a photo')}</Text>
   </Pressable>:null}
   {shown?<Pressable style={styles.action} accessibilityRole="button" accessibilityState={{disabled:sending}} disabled={sending} onPress={remove}>
    <GrydIcon name="close" size={18} color={c.darkMuted}/><Text style={s.meta}>{copy('Retirer la photo','Remove photo')}</Text>
   </Pressable>:null}
  </View>

  {/* ── L'état, écrit. Un seul à la fois, et toujours le vrai. ── */}
  {sending?<View style={styles.photoState} accessibilityLiveRegion="polite"><Text style={s.meta}>{copy('Envoi de ta photo…','Sending your photo…')}</Text></View>
  :state.kind==='ready'?<View style={styles.photoState} accessibilityLiveRegion="polite"><Text style={s.meta}>{copy('Photo envoyée. Touche Enregistrer pour l’appliquer à ton profil.','Photo uploaded. Tap Save to apply it to your profile.')}</Text></View>
  :state.kind==='failed'?<View style={styles.photoState} accessibilityLiveRegion="polite">
    <Text accessibilityRole="alert" style={s.body}>{state.message}</Text>
    {retryUri?<Pressable style={styles.action} accessibilityRole="button" onPress={()=>{void send(retryUri,null)}}><Text style={styles.link}>{copy('Réessayer l’envoi','Try sending again')}</Text></Pressable>:null}
   </View>
  :state.kind==='denied'?<View style={styles.photoState} accessibilityLiveRegion="polite">
    <Text accessibilityRole="alert" style={s.body}>{deniedMessage(state.source,state.canAskAgain,copy)}</Text>
    {!state.canAskAgain&&Platform.OS!=='web'?<Pressable style={styles.action} accessibilityRole="button" onPress={()=>void Linking.openSettings().catch(()=>{})}><Text style={styles.link}>{copy('Ouvrir les Réglages','Open Settings')}</Text></Pressable>:null}
   </View>
  :state.kind==='unavailable'?<View style={styles.photoState} accessibilityLiveRegion="polite">
    <Text style={s.body}>{state.source==='camera'?copy('L’appareil photo n’est pas disponible dans cette version de l’app.','The camera is not available in this version of the app.'):copy('La photothèque n’est pas disponible sur cet appareil.','The photo library is not available on this device.')}</Text>
   </View>
  :null}

  <Text style={s.meta}>{copy('Ta photo est envoyée à GRYD. Qui la voit dépend de ton réglage ci-dessous. Le lieu de la prise de vue et les autres métadonnées sont retirés avant l’envoi.','Your photo is uploaded to GRYD. Who sees it follows your setting below. Where the picture was taken, and other metadata, is stripped before upload.')}</Text>
 </View>;
}

/** Le refus de permission, dit avec le chemin exact pour le lever. */
function deniedMessage(source:PhotoSource,canAskAgain:boolean,copy:(fr:string,en:string)=>string):string {
 if(canAskAgain)return source==='camera'
  ? copy('GRYD n’a pas eu accès à l’appareil photo. Touche à nouveau « Prendre une photo » pour l’autoriser.','GRYD was not given camera access. Tap “Take a photo” again to allow it.')
  : copy('GRYD n’a pas eu accès à tes photos. Touche à nouveau « Choisir dans la photothèque » pour l’autoriser.','GRYD was not given access to your photos. Tap “Choose from library” again to allow it.');
 return source==='camera'
  ? copy('L’accès à l’appareil photo est bloqué. Ouvre Réglages, GRYD, puis Appareil photo pour l’autoriser.','Camera access is blocked. Open Settings, GRYD, then Camera to allow it.')
  : copy('L’accès aux photos est bloqué. Ouvre Réglages, GRYD, puis Photos pour l’autoriser.','Photo access is blocked. Open Settings, GRYD, then Photos to allow it.');
}

/**
 * Ce que le joueur lit quand l'envoi échoue. Trois familles distinctes, parce
 * que trois gestes différents les réparent : attendre le réseau, choisir une
 * autre photo, ou se reconnecter. Un message unique les mélangerait toutes.
 */
function uploadFailureMessage(error:unknown,en:boolean):string {
 const raw=String(error);
 if(raw.includes('upload_timeout'))return en?'Sending took too long. Check your connection, then try again.':'L’envoi a pris trop de temps. Vérifie ta connexion, puis réessaie.';
 if(classifyAppError(error)==='network')return en?'Your photo did not leave the device: GRYD cannot reach the server. Check your connection, then try again.':'Ta photo n’est pas partie : GRYD ne joint pas le serveur. Vérifie ta connexion, puis réessaie.';
 // `uploadSocialImage2026` nomme `invalid_media` TOUTE panne d'envoi : supabase-js
 // REND l'erreur de transport au lieu de la lever, et `social2026Data` ne la lit
 // pas avant de jeter son propre motif. Une coupure de réseau arrive donc ici
 // sous le nom de la photo. Répondre « cette image ne peut pas être utilisée »
 // serait une ACCUSATION NON FONDÉE — le client sait seulement que l'envoi n'a
 // pas abouti. On dit ça, avec les deux gestes qui le réparent, dans l'ordre.
 if(raw.includes('invalid_media'))return en?'The upload did not complete. Check your connection, then try again. If it keeps failing, pick another photo.':'L’envoi n’a pas abouti. Vérifie ta connexion, puis réessaie. Si ça recommence, choisis une autre photo.';
 return socialError2026(raw,en);
}

const styles=StyleSheet.create({
 photoBlock:{gap:12,marginBottom:8},
 photoRow:{flexDirection:'row',alignItems:'center',gap:16},
 portrait:{width:AVATAR_PX,height:AVATAR_PX,borderRadius:AVATAR_PX/2,backgroundColor:c.darkSurface,borderWidth:1,borderColor:c.darkSurfaceMuted,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 portraitVeil:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',backgroundColor:c.scrim},
 image:{width:'100%',height:'100%'},
 photoLead:{color:c.darkInk,fontFamily:fonts.textMedium,fontSize:14,marginBottom:4},
 photoActions:{gap:2},
 photoState:{gap:2,paddingVertical:2},
 action:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,justifyContent:'flex-start'},
 link:{color:c.darkInk,fontFamily:fonts.textMedium,fontSize:14},
 field:{gap:6,marginTop:14},
 label:{color:c.darkInk,fontFamily:fonts.text,fontSize:14},
 bio:{minHeight:80,textAlignVertical:'top'},
 visibility:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:c.darkSurfaceMuted},
});
