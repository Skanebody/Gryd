import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydIcon } from '../../ui/gryd/GrydIcon';
import { DISCOVERY_CLOSE_MS_2026, DISCOVERY_FILL_MS_2026, DISCOVERY_LOOP_LENGTH_2026, DISCOVERY_LOOP_PATH_2026, DISCOVERY_TRACE_MS_2026, discoveryLoopFrame2026, discoveryLoopPoint2026 } from './discoveryMotion2026';
import { useDiscoveryElapsed2026, useDiscoveryMotion2026 } from './useDiscoveryMotion2026';

/** Educational interaction only. No success callback to a run or account store. */
export function DiscoveryLoop2026({fr}:{fr:boolean}) {
  const motion=useDiscoveryMotion2026();
  const [attempt,setAttempt]=useState({phase:'trace' as 'trace'|'close',from:0,revision:0});
  const still=motion.ready?motion.reduced:attempt.phase==='close';
  const elapsed=useDiscoveryElapsed2026(motion.enabled,`${attempt.phase}:${attempt.revision}`,attempt.phase==='trace'?DISCOVERY_TRACE_MS_2026:DISCOVERY_CLOSE_MS_2026+DISCOVERY_FILL_MS_2026,still);
  const frame=discoveryLoopFrame2026(elapsed,attempt.phase,attempt.from,still);
  const point=discoveryLoopPoint2026(frame.progress);
  const close=()=>setAttempt(current=>current.phase==='trace'?{phase:'close',from:frame.progress,revision:current.revision+1}:current);
  const replay=()=>setAttempt(current=>({phase:'trace',from:0,revision:current.revision+1}));
  const action=frame.closed?(fr?'Boucle fermée dans cet exemple':'Loop closed in this example'):(fr?'Toucher pour fermer la boucle':'Tap to close the loop');
  return <View style={s.root}>
    <View style={s.header}><Text style={s.example}>{fr?'EXEMPLE INTERACTIF':'INTERACTIVE EXAMPLE'}</Text><Pressable accessibilityRole="button" accessibilityLabel={fr?'Rejouer la boucle d’exemple':'Replay the example loop'} onPress={replay} style={s.replay}><GrydIcon name="route" size={18} color={c.darkInk} /><Text style={s.replayText}>{fr?'Rejouer':'Replay'}</Text></Pressable></View>
    <Pressable accessibilityRole="button" accessibilityLabel={action} accessibilityHint={fr?'Ce dessin ne capture aucun terrain réel.':'This illustration does not capture any real terrain.'} accessibilityState={{disabled:attempt.phase==='close'}} aria-disabled={attempt.phase==='close'} disabled={attempt.phase==='close'} onPress={close} style={s.board}>
      {/* `aria-hidden` SEUL, et c'est mesuré : react-native-svg étale ses props
          telles quelles sur le <svg> du web (`web/utils/prepare.js`), et le
          `createDOMProps` de react-native-web n'intercepte NI `accessible`, NI
          `accessibilityElementsHidden`, NI `importantForAccessibility`. Les
          trois deviennent des attributs DOM inventés — c'est ce qui produisait
          « Received `false` for a non-boolean attribute `accessible` ».
          Rien ne se perd : sur natif, c'est ce Pressable qui porte le libellé,
          l'état et le regroupement ; le dessin n'a jamais été annoncé. */}
      <Svg aria-hidden width="100%" height={210} viewBox="0 0 320 210">
        <G stroke={c.darkSurfaceMuted} strokeWidth={1}><Path d="M20 31H300M8 75H312M8 122H312M20 172H300M46 8V202M101 8V202M160 8V202M215 8V202M274 8V202" /></G>
        <G fill={c.darkSurface} opacity={.75}><Rect x={110} y={84} width={39} height={28} rx={4}/><Rect x={169} y={84} width={35} height={28} rx={4}/><Rect x={110} y={131} width={39} height={30} rx={4}/></G>
        <Path d={DISCOVERY_LOOP_PATH_2026} fill={c.accent} fillOpacity={frame.fill*.2} />
        <Path d={DISCOVERY_LOOP_PATH_2026} fill="none" stroke={c.darkSurfaceMuted} strokeWidth={1} strokeDasharray="3 6"/>
        <Path d={DISCOVERY_LOOP_PATH_2026} fill="none" stroke={c.carbon} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${DISCOVERY_LOOP_LENGTH_2026} ${DISCOVERY_LOOP_LENGTH_2026}`} strokeDashoffset={DISCOVERY_LOOP_LENGTH_2026*(1-frame.progress)}/>
        <Path d={DISCOVERY_LOOP_PATH_2026} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${DISCOVERY_LOOP_LENGTH_2026} ${DISCOVERY_LOOP_LENGTH_2026}`} strokeDashoffset={DISCOVERY_LOOP_LENGTH_2026*(1-frame.progress)}/>
        <Circle cx={68} cy={154} r={8} fill={c.carbon} stroke={c.darkInk} strokeWidth={1.5}/>
        <Circle cx={point[0]} cy={point[1]} r={6} fill={c.accent} stroke={c.carbon} strokeWidth={2}/>
        {frame.closed?<Path d="M60 154l5 5 10-11" fill="none" stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>:null}
      </Svg>
      <View style={s.caption}><GrydIcon name={frame.closed?'check':'plus'} size={16} color={c.darkInk}/><Text accessibilityLiveRegion="polite" aria-live="polite" style={s.action}>{action}</Text></View>
    </Pressable>
  </View>;
}
const s=StyleSheet.create({root:{width:'100%',gap:2},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},example:{fontFamily:fonts.text,fontSize:10,letterSpacing:1.2,color:c.darkMuted},replay:{minHeight:44,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:4},replayText:{fontFamily:fonts.text,fontSize:12,color:c.darkInk},board:{width:'100%',gap:4},caption:{minHeight:36,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},action:{fontFamily:fonts.textMedium,fontSize:12,lineHeight:18,color:c.darkInk,flexShrink:1}});
