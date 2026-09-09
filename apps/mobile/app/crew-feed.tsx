/**
 * GRYD — LE FIL DU CREW.
 *
 * ─── LE DÉFAUT CORRIGÉ (10/09/2026, cahier §13.5) ──────────────────────────
 * Signaler écrivait dans `social_reports_2026`, et personne n'ouvrait jamais
 * cette table : `reviewed_at` n'était renseigné par AUCUNE fonction. Un membre
 * signalait, le contenu restait, et la direction du crew n'avait aucun moyen de
 * le retirer — `social_remove_2026` est filtrée sur l'auteur. Les migrations
 * 0138 ouvrent `social_moderate_2026` (retirer / classer) au founder et au
 * co_captain du crew PROPRIÉTAIRE, et `social_moderation_queue_2026` leur rend
 * les alertes ouvertes de LEUR crew.
 *
 * CE QUE LA DIRECTION VOIT, ET CE QU'ELLE NE VOIT PAS : le contenu signalé, son
 * auteur, le nombre d'alertes et le motif le plus grave. JAMAIS qui a signalé —
 * dans un crew de dix personnes, le nommer serait le désigner.
 *
 * AUCUN BOUTON MORT : la section de modération n'existe que si le serveur a
 * répondu `canModerate: true`. Un membre ordinaire ne voit rien de tout ça, et
 * la capacité n'est jamais devinée depuis un rôle deviné côté client.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { refonteColors as c } from '@klaim/shared';
import { useSession } from '../src/lib/session';
import { screen } from '../src/lib/analytics';
import { useSocialEpoch2026, socialRpc2026, useSocialRead2026 } from '../src/features/social/social2026Data';
import { myReaction2026, socialError2026, type SocialPost2026, type SocialComment2026 } from '../src/features/social/social2026Model';
import { SocialPostCard2026 } from '../src/features/social/SocialPostCard2026';
import { ProfileButton, ProfileLink, ProfilePage, ProfileSection, ProfileSegments, lightStyles, s as darkStyles, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
const s = { ...darkStyles, ...lightStyles };

/** Ce que `social_moderation_queue_2026` (0138) rend à la DIRECTION d'un crew. */
interface ModerationItem2026 { kind:'post'|'comment'|'message'; id:string; excerpt:string; author:string|null; reports:number; reason:string; oldest:string }
interface ModerationQueue2026 { ok:boolean; reason?:string; canModerate?:boolean; items?:ModerationItem2026[] }

export default function FeedRoute(){const {session}=useSession();const epoch=useSocialEpoch2026();return <Feed key={epoch+':'+(session?.user.id??'guest')}/>;}
function Feed(){
 const copy=useRefonteCopy();const params=useLocalSearchParams<{activity?:string;postId?:string}>();const [activity,setActivity]=useState<'run'|'bike'>(params.activity==='bike'?'bike':'run');
 const feed=useSocialRead2026<SocialPost2026[]>('social_feed_2026',{p_activity:activity,p_post_id:params.postId??null});const comments=useSocialRead2026<SocialComment2026[]>('social_comments_read_2026',{p_post_id:params.postId??null});
 const moderation=useSocialRead2026<ModerationQueue2026>('social_moderation_queue_2026',{});
 const canModerate=moderation.status==='ready'&&moderation.data?.canModerate===true;
 const alerts=canModerate?moderation.data?.items??[]:[];
 const [body,setBody]=useState('');const [commentId,setCommentId]=useState(()=>Crypto.randomUUID());const [busy,setBusy]=useState(false);const lock=useRef(false);const [error,setError]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null);/** Une seule feuille de confirmation pour quatre gestes distincts. `moderate`
  *  porte SA cible (`kind` + `moderateId`) : la même publication peut être
  *  retirée par son auteur (`social_remove_2026`) ou par la direction
  *  (`social_moderate_2026`), et ces deux chemins ne doivent jamais se
  *  confondre. */
 const [confirm,setConfirm]=useState<{post?:string;comment?:string;report?:boolean;moderate?:'remove'|'dismiss';kind?:'post'|'comment'|'message';moderateId?:string;block?:string;blockName?:string}|null>(null);
 useEffect(()=>{screen('crew_feed')},[]);
 async function mutate(rpc:string,args:Record<string,unknown>,success?:()=>void){if(lock.current||!feed.owner)return;lock.current=true;setBusy(true);setError(null);try{await socialRpc2026(feed.owner,rpc,args);success?.();feed.reload();comments.reload();moderation.reload()}catch(e){setError(socialError2026(String(e),copy('fr','en')==='en'))}finally{lock.current=false;setBusy(false)}}
 const reasonLabel=(reason:string)=>reason==='privacy'?copy('Vie privée','Privacy'):reason==='harassment'?copy('Harcèlement','Harassment'):reason==='inappropriate'?copy('Contenu inapproprié','Inappropriate content'):reason==='spam'?copy('Spam','Spam'):copy('Autre motif','Other reason');
 const detail=params.postId?feed.data?.[0]:null;
 return <ProfilePage tone="light" title={params.postId?copy('Publication','Post'):copy('Le fil du crew','Crew feed')} back backHref="/(tabs)/crew">
 {!params.postId?<ProfileSegments tone="light" value={activity} onChange={setActivity} options={[{key:'run',label:copy('Course','Run')},{key:'bike',label:copy('Vélo','Ride')}]}/>:null}
 {feed.status==='signedOut'?<><Text style={[s.body,{marginBottom:20}]}>{copy('Les photos et récits de sortie restent entre les membres du crew. Connecte-toi pour retrouver le fil.','Activity photos and stories stay within the crew. Sign in to view the feed.')}</Text><View style={{alignSelf:'flex-start'}}><ProfileButton tone="light" label={copy('Connexion','Sign in')} onPress={()=>router.push('/sign-in')}/></View></>:feed.status==='loading'?<ActivityIndicator color={c.ink}/>:feed.status==='failed'?<><Text style={s.body}>{copy('Le fil est indisponible.','Feed unavailable.')}</Text><ProfileButton tone="light" label={copy('Réessayer','Retry')} onPress={feed.reload}/></>:feed.data?.length?feed.data.map(post=><View key={post.id}><SocialPostCard2026 tone="light" post={post} busy={busy} onReact={kind=>void mutate('social_react_2026',{p_post_id:post.id,p_kind:kind,p_reacted:myReaction2026(post)!==kind})} onOpen={()=>router.push({pathname:'/crew-feed',params:{activity,postId:post.id}})}/>{canModerate&&!post.mine?<Pressable accessibilityRole="button" style={{minHeight:44,justifyContent:'center'}} onPress={()=>setConfirm({kind:'post',moderateId:post.id,moderate:'remove'})}><Text style={s.meta}>{copy('Retirer du fil (direction du crew)','Remove from the feed (crew leadership)')}</Text></Pressable>:null}</View>):<Text style={[s.body,{marginVertical:24}]}>{params.postId?copy('Cette publication n’est plus accessible.','This post is no longer accessible.'):copy('Les sorties partagées volontairement par ton crew apparaîtront ici.','Activities voluntarily shared by your crew will appear here.')}</Text>}
 {/* ── LES ALERTES À TRAITER (direction seulement) ────────────────────────
     Elles n'apparaissent QUE si le serveur a dit `canModerate`. Priorité au
     harcèlement : la file arrive déjà triée, on ne la retrie pas ici. */}
 {!params.postId&&canModerate&&alerts.length>0?<>
  <ProfileSection tone="light" title={copy('Signalements à traiter','Reports to handle')}/>
  {alerts.map(item=><View key={`${item.kind}:${item.id}`} style={{paddingVertical:12,borderBottomWidth:1,borderColor:c.border}}>
   <Text style={s.linkTitle}>{item.kind==='post'?copy('Publication','Post'):item.kind==='comment'?copy('Commentaire','Comment'):copy('Message de la conversation','Conversation message')}{item.author?` · ${item.author}`:''}</Text>
   <Text style={s.body}>{item.excerpt}</Text>
   <Text style={s.meta}>{reasonLabel(item.reason)} · {item.reports>1?copy(`${item.reports} signalements`,`${item.reports} reports`):copy('1 signalement','1 report')}</Text>
   <View style={{flexDirection:'row',gap:18}}>
    <Pressable accessibilityRole="button" style={{minHeight:44,justifyContent:'center'}} onPress={()=>setConfirm({kind:item.kind,moderateId:item.id,moderate:'remove'})}><Text style={s.meta}>{copy('Retirer','Remove')}</Text></Pressable>
    <Pressable accessibilityRole="button" style={{minHeight:44,justifyContent:'center'}} onPress={()=>setConfirm({kind:item.kind,moderateId:item.id,moderate:'dismiss'})}><Text style={s.meta}>{copy('Classer sans suite','Dismiss')}</Text></Pressable>
   </View>
  </View>)}
 </>:null}
 {!params.postId&&moderation.status==='failed'?<ProfileLink tone="light" title={copy('Signalements indisponibles · Réessayer','Reports unavailable · Retry')} icon="historique" onPress={moderation.reload}/>:null}
 {!params.postId ? <ProfileLink tone="light" title={copy('Conversation du crew','Crew conversation')} icon="crew" onPress={()=>router.push('/crew-conversation')}/> : null}
 {!params.postId?<ProfileLink tone="light" title={copy('Choisir une sortie dans mon journal','Choose an activity from my journal')} icon="historique" onPress={()=>router.push('/(tabs)/profil')}/>:detail?<>
 <ProfileSection tone="light" title={copy('Commentaires','Comments')}/>
 {/* QUATRE ÉTATS, jamais fondus : lecture en cours (n'affirme rien), échec
     (n'affirme rien non plus, mais se réessaie), lu et VIDE (une affirmation
     vraie), lu avec des commentaires. Sans le premier, une lecture lente se
     lisait « personne n'a répondu ». */}
 {comments.status==='loading'?<View style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12}}><ActivityIndicator color={c.ink}/><Text style={s.meta}>{copy('Lecture des commentaires…','Loading comments…')}</Text></View>
 :comments.status==='failed'?<ProfileLink tone="light" title={copy('Recharger les commentaires','Reload comments')} icon="historique" onPress={comments.reload}/>
 :comments.data?.length===0?<Text style={[s.meta,{paddingVertical:12}]}>{copy('Aucun commentaire pour l’instant.','No comment yet.')}</Text>
 :comments.data?.map(comment=><View key={comment.id} style={{paddingVertical:12,borderBottomWidth:1,borderColor:c.border}}><Pressable accessibilityRole="button" style={{minHeight:32}} onPress={()=>router.push({pathname:'/member',params:{userId:comment.author.id}})}><Text style={s.linkTitle}>{comment.author.name}</Text></Pressable><Text style={s.body}>{comment.body}</Text><View style={{flexDirection:'row',gap:18}}><Pressable accessibilityRole="button" style={{minHeight:44,justifyContent:'center'}} onPress={()=>setConfirm(comment.mine?{comment:comment.id}:{comment:comment.id,report:true})}><Text style={s.meta}>{comment.mine?copy('Retirer','Remove'):copy('Signaler','Report')}</Text></Pressable>{canModerate&&!comment.mine?<Pressable accessibilityRole="button" style={{minHeight:44,justifyContent:'center'}} onPress={()=>setConfirm({kind:'comment',moderateId:comment.id,moderate:'remove'})}><Text style={s.meta}>{copy('Retirer (direction)','Remove (leadership)')}</Text></Pressable>:null}</View></View>)}
 <TextInput value={body} onChangeText={setBody} maxLength={400} multiline placeholder={copy('Ajouter un commentaire…','Add a comment…')} placeholderTextColor={c.muted} accessibilityLabel={copy('Commentaire','Comment')} style={[s.input,{marginTop:18,minHeight:80,textAlignVertical:'top'}]}/>
 <View style={{alignSelf:'flex-start',marginVertical:14}}><ProfileButton tone="light" label={copy('Envoyer','Send')} disabled={!body.trim()} busy={busy} onPress={()=>void mutate('social_comment_2026',{p_post_id:detail.id,p_client_id:commentId,p_body:body},()=>{setBody('');setCommentId(Crypto.randomUUID())})}/></View>
 <ProfileLink tone="light" title={detail.mine?copy('Retirer la publication','Remove post'):copy('Signaler la publication','Report post')} icon="alerte" onPress={()=>setConfirm(detail.mine?{post:detail.id}:{post:detail.id,report:true})}/>
 {canModerate&&!detail.mine?<ProfileLink tone="light" title={copy('Retirer du fil (direction du crew)','Remove from the feed (crew leadership)')} icon="fermer" onPress={()=>setConfirm({kind:'post',moderateId:detail.id,moderate:'remove'})}/>:null}
 {/* BLOQUER NE PART PLUS AU PREMIER TAP. C'est le geste le plus lourd de
     l'écran — il coupe l'abonnement, rejette l'amitié en attente et masque
     les deux comptes l'un à l'autre (0124) — et il partait sans un mot. */}
 {!detail.mine?<ProfileLink tone="light" title={copy('Bloquer ce membre','Block member')} icon="verrou" onPress={()=>setConfirm({block:detail.author.id,blockName:detail.author.name})}/>:null}
 </>:null}
 {confirm?<View style={[s.gap,{paddingVertical:18}]}>
  <Text style={s.body}>{confirm.block?copy(`Bloquer ${confirm.blockName??'ce membre'} ? Vous ne verrez plus vos publications, commentaires et messages, ni l’un ni l’autre. Ton abonnement et toute demande d’ami en cours sont annulés. Cette personne n’en est pas informée, et tu pourras la débloquer depuis Amis.`,`Block ${confirm.blockName??'this member'}? Neither of you will see the other’s posts, comments or messages. Your follow and any pending friend request are cancelled. This person is not told, and you can unblock from Friends.`):confirm.moderate==='remove'?copy('Retirer ce contenu pour TOUT le crew ? La sortie reste dans le journal de son auteur, et les signalements liés sont classés.','Remove this content for the WHOLE crew? The activity stays in its author’s journal, and the linked reports are closed.'):confirm.moderate==='dismiss'?copy('Classer ces signalements sans retirer le contenu ? Ils ne réapparaîtront plus dans cette liste.','Close these reports without removing the content? They will not come back in this list.'):confirm.report?copy('Le signalement sera transmis et ce contenu sera masqué pour toi.','The report will be submitted and this content hidden for you.'):copy('Retirer ce contenu du fil ? Ta sortie reste dans ton journal.','Remove this content from the feed? Your activity stays in your journal.')}</Text>
  {confirm.block?<ProfileButton tone="light" secondary busy={busy} label={copy('Confirmer le blocage','Confirm block')} onPress={()=>void mutate('social_block_2026',{p_user_id:confirm.block,p_blocked:true},()=>{setConfirm(null);setNotice(copy('Membre bloqué. Tu peux le débloquer depuis Amis.','Member blocked. You can unblock from Friends.'))})}/>
  :confirm.moderate?<ProfileButton tone="light" secondary busy={busy} label={confirm.moderate==='remove'?copy('Confirmer le retrait','Confirm removal'):copy('Confirmer le classement','Confirm dismissal')} onPress={()=>void mutate('social_moderate_2026',{p_kind:confirm.kind??'post',p_id:confirm.moderateId,p_action:confirm.moderate},()=>{setConfirm(null);setNotice(confirm.moderate==='remove'?copy('Contenu retiré du fil.','Content removed from the feed.'):copy('Signalements classés.','Reports closed.'))})}/>
  :confirm.report?(['privacy','harassment','inappropriate','other'] as const).map(reason=><ProfileButton tone="light" key={reason} secondary label={reasonLabel(reason)} busy={busy} onPress={()=>void mutate('social_report_2026',{p_reason:reason,p_post_id:confirm.post??null,p_comment_id:confirm.comment??null,p_target_user_id:null},()=>{setConfirm(null);setNotice(copy('Signalement transmis.','Report submitted.'))})}/>)
  :<ProfileButton tone="light" label={copy('Confirmer le retrait','Confirm removal')} secondary busy={busy} onPress={()=>void mutate('social_remove_2026',{p_post_id:confirm.post??null,p_comment_id:confirm.comment??null},()=>setConfirm(null))}/>}
  <ProfileButton tone="light" label={copy('Annuler','Cancel')} secondary onPress={()=>setConfirm(null)}/>
 </View>:null}
 {error?<Text accessibilityRole="alert" style={s.body}>{error}</Text>:null}{notice?<Text accessibilityRole="alert" style={s.meta}>{notice}</Text>:null}
 </ProfilePage>;
}
