export type SocialPerson2026 = { id: string; handle: string; name: string; bio?: string | null; avatarPath?: string | null; isMe?: boolean };
export type SocialPost2026 = { id: string; body: string; mediaPath: string | null; createdAt: string; mine: boolean; author: SocialPerson2026; activity: 'run' | 'bike'; distanceM: number; durationS: number; reacted: boolean; reactionCount: number; commentCount: number };
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
