/**
 * GRYD — PROFIL D'UN MEMBRE.
 *
 * ─── LE SECOND DÉFAUT CORRIGÉ (10/09/2026) ─────────────────────────────────
 * Trois actions de relation étaient peintes ENSEMBLE — « Demander en ami »,
 * « Suivre », « Ne plus suivre » — sans qu'aucun état de relation ne soit lu :
 * `social_member_2026` n'en renvoyait pas. Deux sur trois échouaient donc
 * toujours (« aucun bouton mort » § interdits). La migration 0153 ajoute
 * `relation` (suivi, amitié, demande envoyée vs reçue, blocage), du point de
 * vue du LECTEUR ; l'écran ne peint plus que l'action qui peut aboutir.
 *
 * ─── LE TROISIÈME DÉFAUT CORRIGÉ (10/09/2026) ──────────────────────────────
 * « Bloquer ce membre » partait au PREMIER TAP. Le fil du crew, lui, demandait
 * déjà confirmation — et l'appel est le même : `social_block_2026` supprime les
 * abonnements dans les deux sens et rejette l'amitié en cours. Un geste qui
 * défait des liens se demande, et se dit, avant de partir. Symétriquement, une
 * personne DÉJÀ bloquée ne se voit plus proposer « Suivre » ni « Bloquer » :
 * la seule action qui reste vraie est « Débloquer ».
 *
 * ─── LE DÉFAUT CORRIGÉ (10/09/2026, App Review 1.2 · cahier §13.5) ──────────
 * Cet écran offrait « Bloquer ce membre » et RIEN pour SIGNALER. Les deux ne se
 * remplacent pas : bloquer protège celui qui bloque (et n'avertit personne),
 * signaler prévient la modération. Sur le profil — c'est-à-dire là où le
 * problème peut être le HANDLE, le NOM ou la BIO eux-mêmes — il n'existait
 * aucune porte. `social_report_2026` n'acceptait d'ailleurs qu'un `post_id` ou
 * un `comment_id` : la migration 0137 lui ajoute `p_target_user_id`.
 *
 * LE PARCOURS EST EXPLICITE, jamais un tap unique : « Signaler ce profil » →
 * choix du MOTIF (les quatre du serveur, G29) → confirmation. Un signalement
 * part une fois, et l'écran ne dit « transmis » que sur un acquittement RÉEL du
 * serveur — un échec a sa propre phrase (`socialError2026`).
 */
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

/** Les QUATRE motifs que `social_reports_2026` accepte — ni plus, ni moins. */
const REPORT_REASONS_2026 = ['harassment', 'privacy', 'inappropriate', 'other'] as const;
type ReportReason2026 = (typeof REPORT_REASONS_2026)[number];

export default function MemberRoute(){const {session}=useSession();const epoch=useSocialEpoch2026();return <Member key={epoch+':'+(session?.user.id??'guest')}/>;}
function Member(){const copy=useRefonteCopy();const params=useLocalSearchParams<{userId?:string;handle?:string}>();const person=useSocialRead2026<SocialPerson2026|null>(params.userId?'social_member_2026':'social_member_by_handle_2026',params.userId?{p_user_id:params.userId}:{p_handle:params.handle??''});const [busy,setBusy]=useState(false);const [notice,setNotice]=useState<string|null>(null);
 /** null = feuille fermée ; sinon le motif choisi (ou null tant qu'aucun). */
 const [reporting,setReporting]=useState<{reason:ReportReason2026|null}|null>(null);
 /** true = on a demandé à bloquer, on n'a pas encore bloqué. */
 const [blocking,setBlocking]=useState(false);
 useEffect(()=>{screen('member_profile')},[]);
 async function act(rpc:string,args:Record<string,unknown>,message:string){if(!person.owner||busy)return;setBusy(true);try{const result=await socialRpc2026<{ok?:boolean;reason?:string}>(person.owner,rpc,args);if(result?.ok===false)throw new Error(result.reason);setNotice(message);person.reload()}catch(e){setNotice(socialError2026(String(e),copy('fr','en')==='en'))}finally{setBusy(false)}}
 /** MA relation, telle que le serveur la rend (0153). `undefined` = non lue. */
 const relation=person.data?.relation ?? null;
 const reasonLabel=(reason:ReportReason2026)=>reason==='harassment'?copy('Harcèlement','Harassment'):reason==='privacy'?copy('Vie privée','Privacy'):reason==='inappropriate'?copy('Contenu inapproprié','Inappropriate content'):copy('Autre motif','Other reason');
 return <ProfilePage title={copy('Profil du membre','Member profile')} back>
 {person.status==='loading'?<ActivityIndicator color={c.darkInk}/>:person.status==='failed'?<ProfileButton label={copy('Réessayer','Retry')} onPress={person.reload}/>:person.data?<>
 <View style={{flexDirection:'row',alignItems:'center',gap:18,marginVertical:18}}><SocialAvatar2026 person={person.data} size={80}/><View style={s.flex}><Text style={s.title}>{person.data.name}</Text><Text style={s.meta}>@{person.data.handle}</Text></View></View>{person.data.bio?<Text style={s.body}>{person.data.bio}</Text>:null}
 {person.data.isMe?<ProfileLink title={copy('Modifier mon profil','Edit my profile')} icon="profil" onPress={()=>router.push('/profil-edit')}/>:<>
 {/* ─── UNE SEULE ACTION PAR LIEN, CELLE QUI PEUT ABOUTIR ────────────────
     Cet écran peignait « Demander en ami », « Suivre » ET « Ne plus suivre »
     en même temps : deux boutons morts sur trois, quel que soit l'état réel.
     `social_member_2026` ne renvoyait aucune relation (migration 0153 la lui
     ajoute) — l'écran ne pouvait donc rien savoir, et il montrait tout.
     `relation` absente (serveur en retard d'une migration) n'est PAS « aucune
     relation » : on ne peint alors AUCUNE action et on le dit. Un bouton
     affiché sur une supposition serait le mensonge qu'on vient de retirer. */}
 {!relation?<Text style={[s.body,{marginTop:24}]}>{copy('Le lien entre vos deux comptes n’a pas pu être lu. Les actions d’ami et d’abonnement reviendront dès que ce sera le cas.','Your connection to this account could not be read. Friend and follow actions will return once it can.')}</Text>
 /* DÉJÀ BLOQUÉE : ni ami, ni abonnement. `social_block_2026` a supprimé les
    deux (0124:216) — proposer « Suivre » ici peindrait un geste qui se
    défait au moment même où il se fait. Il ne reste qu'une chose à offrir :
    revenir en arrière, et le dire. */
 :relation.blocked?<>
 <Text style={[s.body,{marginTop:24}]}>{copy('Tu as bloqué cette personne. Vous ne voyez plus vos publications, vos commentaires ni vos messages, ni l’un ni l’autre. Elle n’en a jamais été informée.','You blocked this person. Neither of you sees the other’s posts, comments or messages. They were never told.')}</Text>
 <ProfileLink title={copy('Débloquer','Unblock')} icon="verrou" onPress={()=>void act('social_block_2026',{p_user_id:person.data!.id,p_blocked:false},copy('Membre débloqué. L’abonnement et l’amitié ne reviennent pas d’eux-mêmes.','Member unblocked. Following and friendship do not come back on their own.'))}/>
 </>:<>
 {relation.friend?<Text style={[s.body,{marginTop:24}]}>{copy('Vous êtes amis.','You are friends.')}</Text>
  :relation.requestReceived?<><Text style={[s.body,{marginTop:24}]}>{copy('Cette personne t’a demandé en ami.','This person sent you a friend request.')}</Text><ProfileLink title={copy('Répondre à sa demande','Answer the request')} icon="ami" onPress={()=>router.push('/amis')}/></>
  :relation.requestSent?<Text style={[s.body,{marginTop:24}]}>{copy('Demande envoyée — en attente de sa réponse.','Request sent — waiting for an answer.')}</Text>
  :<View style={{alignSelf:'flex-start',marginTop:24}}><ProfileButton label={copy('Demander en ami','Add friend')} busy={busy} onPress={()=>void act('friend_request',{p_handle:person.data!.handle},copy('Demande envoyée.','Request sent.'))}/></View>}
 {relation.following
  ?<ProfileLink title={copy('Ne plus suivre','Unfollow')} icon="ami" onPress={()=>void act('unfollow_user',{p_handle:person.data!.handle},copy('Abonnement retiré.','Following removed.'))}/>
  :<ProfileLink title={copy('Suivre','Follow')} icon="ami" onPress={()=>void act('follow_user',{p_handle:person.data!.handle},copy('Abonnement enregistré.','Following saved.'))}/>}
 </>}
 {/* SIGNALER vient AVANT bloquer : c'est le geste qui prévient quelqu'un.
     Bloquer reste juste en dessous, et les deux se cumulent (0137 accepte le
     signalement d'une personne déjà bloquée — sinon « je bloque puis je
     signale », l'ordre naturel quand on est visé, serait impossible). */}
 <ProfileLink title={copy('Signaler ce profil','Report this profile')} icon="alerte" onPress={()=>{setNotice(null);setBlocking(false);setReporting({reason:null})}}/>
 {/* ─── BLOQUER SE DEMANDE, COMME SIGNALER (10/09/2026) ──────────────────
     Le fil du crew avait déjà sa confirmation ; ce profil-ci bloquait au
     PREMIER TAP, sans dire ce que bloquer fait. Or l'appel supprime les
     abonnements dans les DEUX sens et rejette l'amitié en cours (0124:216) :
     c'est irréversible d'un simple débloquage, et ça se dit AVANT. La ligne
     disparaît quand la personne est déjà bloquée — au-dessus, c'est
     « Débloquer » qui prend sa place. */}
 {relation?.blocked?null:<ProfileLink title={copy('Bloquer ce membre','Block member')} icon="verrou" onPress={()=>{setNotice(null);setReporting(null);setBlocking(true)}}/>}
 {blocking?<View style={{gap:10,paddingVertical:18}}>
  <Text style={s.body}>{copy(`Bloquer ${person.data.name} ? Vous ne verrez plus vos publications, vos commentaires ni vos messages, ni l’un ni l’autre. Ton abonnement et toute demande d’ami en cours sont annulés, et ils ne reviendront pas tout seuls. Cette personne n’en est pas informée.`,`Block ${person.data.name}? Neither of you will see the other’s posts, comments or messages. Your following and any pending friend request are cancelled, and they do not come back on their own. This person is never told.`)}</Text>
  <ProfileButton secondary busy={busy} label={copy('Confirmer le blocage','Confirm block')} onPress={()=>{void act('social_block_2026',{p_user_id:person.data!.id,p_blocked:true},copy('Membre bloqué. Tu peux le débloquer depuis ce profil.','Member blocked. You can unblock from this profile.')).then(()=>setBlocking(false))}}/>
  <ProfileButton secondary label={copy('Annuler','Cancel')} onPress={()=>setBlocking(false)}/>
 </View>:null}
 {reporting?<View style={{gap:10,paddingVertical:18}}>
  <Text style={s.body}>{reporting.reason===null?copy('Pourquoi signales-tu ce profil ? Le motif est transmis à la modération GRYD ; la personne n’en est jamais informée.','Why are you reporting this profile? The reason goes to GRYD moderation; the person is never told.'):copy('Confirmer ce signalement ? Il part une seule fois et reste consultable dans ton export de données.','Send this report? It is sent once and stays visible in your data export.')}</Text>
  {reporting.reason===null?REPORT_REASONS_2026.map(reason=><ProfileButton key={reason} secondary label={reasonLabel(reason)} onPress={()=>setReporting({reason})}/>):
   <ProfileButton secondary busy={busy} label={copy(`Confirmer · ${reasonLabel(reporting.reason)}`,`Confirm · ${reasonLabel(reporting.reason)}`)} onPress={()=>{const reason=reporting.reason!;void act('social_report_2026',{p_reason:reason,p_post_id:null,p_comment_id:null,p_target_user_id:person.data!.id},copy('Signalement transmis à la modération.','Report sent to moderation.')).then(()=>setReporting(null))}}/>}
  <ProfileButton secondary label={copy('Annuler','Cancel')} onPress={()=>setReporting(null)}/>
 </View>:null}
 </>}
 </>:<Text style={s.body}>{copy('Ce profil est privé ou indisponible.','This profile is private or unavailable.')}</Text>}
 {notice?<Text accessibilityRole="alert" style={[s.meta,{marginTop:18}]}>{notice}</Text>:null}
 </ProfilePage>;
}
