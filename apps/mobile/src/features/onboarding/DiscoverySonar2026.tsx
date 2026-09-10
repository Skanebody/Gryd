import Svg, { Circle, G, Path } from 'react-native-svg';
import { refonteColors as c } from '@klaim/shared';
import { useDiscoveryElapsed2026, useDiscoveryMotion2026 } from './useDiscoveryMotion2026';

/** Decorative sonar, independent of permission and location request state. */
export function DiscoverySonar2026() {
  const motion=useDiscoveryMotion2026();
  const elapsed=useDiscoveryElapsed2026(motion.enabled,'sonar');
  const phase=(.3+elapsed%4200/4200)%1;
  const rings=motion.ready&&!motion.reduced?[phase,(phase+.5)%1]:[.3,.8];
  // UN SEUL MOT, ET C'EST `aria-hidden` — mesuré, pas supposé (10/09/2026) :
  // react-native-svg ne filtre RIEN sur le web (`web/utils/prepare.js` étale
  // `...rest` sur le <svg>), et react-native-web ne connaît, dans son
  // `createDOMProps`, ni `accessible`, ni `accessibilityElementsHidden`, ni
  // `importantForAccessibility`. Les trois atterrissent donc en attributs DOM
  // inventés — `accessible={false}` donnait « Received `false` for a
  // non-boolean attribute », et les deux props « natives » auraient rendu le
  // même défaut sous un autre nom. `aria-hidden` est la SEULE que
  // `createDOMProps` intercepte. Côté natif rien ne régresse : un SVG sans
  // libellé n'est pas un élément d'accessibilité, `accessible={false}` ne
  // faisait que répéter le défaut. Un décor ne s'annonce pas.
  return <Svg aria-hidden width="100%" height={210} viewBox="0 0 320 210">
    <G stroke={c.darkSurfaceMuted} fill="none"><Circle cx={160} cy={105} r={92}/><Circle cx={160} cy={105} r={61}/><Path d="M160 13V197M50 105H270" strokeDasharray="3 6"/></G>
    {rings.map((progress,index)=><Circle key={index} cx={160} cy={105} r={28+progress*64} fill="none" stroke={c.accent} strokeWidth={1} opacity={(1-progress)*.24}/>)}
    <Circle cx={160} cy={105} r={29} fill={c.accent} fillOpacity={.055}/>
    <Path d="M143 103L180 85L165 125L158 109Z" fill={c.accent} stroke={c.accent} strokeLinejoin="round"/>
  </Svg>;
}
