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

/** Clipped geometry, open counters and a consistent optical weight at 20–32 px. */
export function GrydIcon({ name, size = 24, color = c.black, active = false, strokeWidth = 1.7, accessibilityLabel }: GrydIconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={!!accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} accessibilityLabel={accessibilityLabel} aria-label={accessibilityLabel}>
    <G fill="none" stroke={color} strokeWidth={active ? strokeWidth + 0.35 : strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {GRYD_GLYPHS[name].map((d, i) => <Path key={i} d={d} />)}
    </G>
  </Svg>;
}
