import { Platform } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { GRYD_GLYPHS, type GrydIconName } from './glyphs';
import { grydGraphicColors as c } from './palette';
export type { GrydIconName } from './glyphs';

export interface GrydIconProps {
  name: GrydIconName;
  size?: number;
  color?: string;
  active?: boolean;
  strokeWidth?: number;
  accessibilityLabel?: string;
}

/**
 * Clipped geometry, open counters and a consistent optical weight at 20–32 px.
 *
 * ─── `accessible` NE PASSE PAS SUR LE WEB (10/09/2026) ──────────────────────
 * `GrydMark` portait déjà la garde `Platform.OS === 'web' ? undefined : …` ;
 * cette icône-ci, montée des centaines de fois par écran, ne l'avait pas.
 * Raison : react-native-svg étale ses props sur le <svg> sans filtre
 * (`web/utils/prepare.js`) et le `createDOMProps` de react-native-web ne
 * connaît pas `accessible` — la valeur booléenne devient un attribut DOM
 * inventé (« Received `false` for a non-boolean attribute »). Sur natif, elle
 * reste indispensable : c'est elle qui fait de l'icône UN élément annoncé
 * quand elle porte un libellé. Sans libellé, l'icône est un décor : on le DIT
 * au web (`aria-hidden`) au lieu de le laisser deviner.
 */
export function GrydIcon({ name, size = 24, color = c.black, active = false, strokeWidth = 1.7, accessibilityLabel }: GrydIconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={Platform.OS === 'web' ? undefined : !!accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} accessibilityLabel={accessibilityLabel} aria-label={accessibilityLabel} aria-hidden={accessibilityLabel ? undefined : true}>
    <G fill="none" stroke={color} strokeWidth={active ? strokeWidth + 0.35 : strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {GRYD_GLYPHS[name].map((d, i) => <Path key={i} d={d} />)}
    </G>
  </Svg>;
}
