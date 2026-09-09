/**
 * MA relation à quelqu'un, telle que `social_member_2026` la rend (0153).
 * `null` sur mon propre profil et hors session. Ce sont MES arêtes : rien ici
 * ne dit combien d'abonnés a la personne ni qui la suit.
 */
export type SocialRelation2026 = { following: boolean; friend: boolean; requestSent: boolean; requestReceived: boolean; blocked: boolean };
export type SocialPerson2026 = { id: string; handle: string; name: string; bio?: string | null; avatarPath?: string | null; isMe?: boolean; relation?: SocialRelation2026 | null };
/** §13.4 — réactions limitées et humaines. Liste FERMÉE, miroir du CHECK SQL (0153). */
export type SocialReactionKind2026 = 'cheer' | 'thanks' | 'next_time';
export const SOCIAL_REACTION_KINDS_2026: readonly SocialReactionKind2026[] = ['cheer', 'thanks', 'next_time'];
export type SocialPost2026 = { id: string; body: string; mediaPath: string | null; createdAt: string; mine: boolean; author: SocialPerson2026; activity: 'run' | 'bike'; distanceM: number; durationS: number; reacted: boolean; reactionCount: number; myReaction?: SocialReactionKind2026 | null; reactions?: { cheer: number; thanks: number; nextTime: number }; commentCount: number };

/**
 * Compteur d'UNE réaction. `undefined` côté serveur (base en retard d'une
 * migration) ⇒ 0 : on n'affiche pas un nombre qu'on n'a pas reçu, et le
 * compteur n'est de toute façon peint que s'il est strictement positif.
 */
export function reactionCount2026(post: SocialPost2026, kind: SocialReactionKind2026): number {
 const counts = post.reactions; if (!counts) return 0;
 const n = kind === 'cheer' ? counts.cheer : kind === 'thanks' ? counts.thanks : counts.nextTime;
 return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/**
 * MA réaction, ou `null`. Un serveur d'avant 0153 ne renvoie que `reacted` :
 * on la lit alors comme un encouragement, ce qu'elle était — jamais comme
 * « aucune », qui rallumerait un bouton déjà posé.
 */
export function myReaction2026(post: SocialPost2026): SocialReactionKind2026 | null {
 const mine = post.myReaction;
 if (mine === 'cheer' || mine === 'thanks' || mine === 'next_time') return mine;
 if (mine === null || mine === undefined) return post.reacted && post.reactions === undefined ? 'cheer' : null;
 return null;
}
export type SocialComment2026 = { id: string; body: string; createdAt: string; mine: boolean; author: SocialPerson2026 };
export function ownerScopedValue2026<T>(owner: string | null, read: { owner: string; value: T } | null): T | null { return owner && read?.owner === owner ? read.value : null; }
export const socialError2026 = (reason: string, en = false): string => {
 const messages: Record<string, [string,string]> = {
  authentication_required:['Reconnecte-toi pour continuer.','Sign in again to continue.'], session_changed:['Le compte a changé. Recommence depuis ton profil.','The account changed. Start again from your profile.'],
  crew_changed:['Ton crew a changé. Recharge l’aperçu et confirme le nouveau destinataire.','Your crew changed. Reload the preview and confirm the new audience.'], no_crew:['Rejoins un crew pour publier une sortie.','Join a crew to publish an activity.'], profile_required:['Enregistre d’abord ton profil.','Save your profile first.'],
  handle_taken:['Ce pseudo est déjà utilisé.','This handle is already used.'], invalid_handle:['Choisis un pseudo de 3 à 20 lettres, chiffres ou tirets bas.','Choose a handle of 3–20 letters, numbers or underscores.'],
  invalid_profile:['Vérifie le nom et les champs du profil.','Check the name and profile fields.'], invalid_media:['Cette image ne peut pas être utilisée.','This image cannot be used.'], media_too_large:['Choisis une photo de moins de 5 Mo.','Choose a photo smaller than 5 MB.'],
  consent_required:['Confirme le partage avec les membres du crew.','Confirm sharing with crew members.'], run_unavailable:['Cette sortie confirmée n’est pas accessible à ton compte.','This confirmed activity is not accessible to your account.'],
  post_unavailable:['Cette publication n’est plus accessible.','This post is no longer accessible.'], post_removed:['Cette publication a été retirée.','This post has been removed.'],
  moderated:['Ce texte ne peut pas être publié. Modifie-le.','This text cannot be published. Edit it.'], forbidden:['Cette action n’est pas autorisée.','This action is not allowed.'],
  // Signalement d'une PERSONNE (0137) et modération de crew (0138). Sans ces
  // clés, un refus nommé par le serveur retombait sur « L'action n'a pas
  // abouti » — la phrase qui n'apprend rien à celui qui signale un abus.
  profile_unavailable:['Ce profil n’est plus accessible : impossible de le signaler.','This profile is no longer reachable, so it cannot be reported.'],
  invalid_target:['Choisis une seule cible à signaler.','Pick a single thing to report.'],
  invalid_reason:['Choisis un motif de signalement.','Pick a reason for your report.'],
  invalid_moderation:['Cette action de modération n’est pas reconnue.','This moderation action is not recognised.'],
  no_content_to_remove:['Ce signalement vise une personne : il n’y a pas de contenu à retirer.','This report is about a person: there is no content to remove.'],
  content_unavailable:['Ce contenu n’est plus accessible.','This content is no longer accessible.'],
 };
 const found=Object.keys(messages).find(key=>reason.includes(key)); return found ? messages[found]![en?1:0] : en ? 'The action did not complete. Try again.' : 'L’action n’a pas abouti. Réessaie.';
};

/** Remove metadata from supported image bytes before any upload. Never upload
 * the original if parsing fails. Pixel data remains unchanged (no generated image). */
export function stripSocialImageMetadata2026(input: Uint8Array): { bytes: Uint8Array; mime: 'image/jpeg'|'image/png'; extension: 'jpg'|'png' } {
 const chunks: Uint8Array[]=[];
 if(input[0]===0xff && input[1]===0xd8) {
  chunks.push(input.slice(0,2)); let at=2;
  while(at<input.length) {
   if(input[at]!==0xff) throw new Error('invalid_media');
   const marker=input[at+1];
   if(marker===0xd9){chunks.push(input.slice(at,at+2));return {bytes:join(chunks),mime:'image/jpeg',extension:'jpg'};}
   const length=(input[at+2]??0)*256+(input[at+3]??0); if(length<2 || at+length+2>input.length) throw new Error('invalid_media');
   if(marker===0xda){let end=at+length+2;while(end<input.length){if(input[end]===0xff){const next=input[end+1];if(next!==0x00&&next!==0xff&&!(next!==undefined&&next>=0xd0&&next<=0xd7))break;}end++;}chunks.push(input.slice(at,end));at=end;continue;}
   // APP1(EXIF/XMP), APP13(IPTC), comments and all optional app payloads.
   if(!(marker!==undefined && marker>=0xe1 && marker<=0xef) && marker!==0xfe) chunks.push(input.slice(at,at+length+2));
   at+=length+2;
  }
 } else if(input.length>=8 && input.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i])) {
  chunks.push(input.slice(0,8)); let at=8;
  while(at+12<=input.length){const view=new DataView(input.buffer,input.byteOffset+at,4);const length=view.getUint32(0);const end=at+12+length;if(end>input.length)throw new Error('invalid_media');
   const type=String.fromCharCode(...input.slice(at+4,at+8));
   if(!['eXIf','tEXt','zTXt','iTXt','tIME'].includes(type))chunks.push(input.slice(at,end));
   at=end;if(type==='IEND')return {bytes:join(chunks),mime:'image/png',extension:'png'};
  }
 }
 throw new Error('invalid_media');
}
function join(chunks:Uint8Array[]):Uint8Array {const out=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out;}
