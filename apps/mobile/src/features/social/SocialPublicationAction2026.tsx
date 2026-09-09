import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { GrydIcon } from '../../ui/gryd';
import { refonteColors as c } from '@klaim/shared';
import { s, useRefonteCopy } from '../refonte/ProfilePrimitives';
/** Reusable entry; opening the composer never publishes or uploads anything. */
export function SocialPublicationAction2026({runId,activity,surface='dark'}:{runId:string;activity:'run'|'bike';surface?:'light'|'dark';onPublished?:()=>void}){
 const copy=useRefonteCopy();const ink=surface==='light'?c.ink:c.darkInk,muted=surface==='light'?c.muted:c.darkMuted;return <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/crew-publish',params:{runId,activity}})} style={{minHeight:52,flexDirection:'row',alignItems:'center',gap:12}}><GrydIcon name="crew" color={ink} size={20}/><View style={s.flex}><Text style={[s.linkTitle,{color:ink}]}>{copy('Partager avec mon crew','Share with my crew')}</Text><Text style={[s.meta,{color:muted}]}>{copy('Publication volontaire · aperçu avant envoi','Optional post · preview before sending')}</Text></View><GrydIcon name="arrowUpRight" color={muted} size={18}/></Pressable>;
}
