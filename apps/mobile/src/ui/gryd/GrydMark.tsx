import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { grydGraphicColors as c } from './palette';
import { GRYD_BRAND } from './brandPaths';

/** Preserves the supplied elliptical G and the airy GRYD wordmark, including their proportions. */
export const GRYD_SYMBOL_PATH = GRYD_BRAND.symbol.paths.join(' ');
export interface GrydMarkProps {
  /** Height. The original identity's aspect ratio determines width. */
  size?: number;
  color?: string;
  variant?: 'symbol' | 'wordmark';
  accessibilityLabel?: string;
}
export function GrydMark({ size = 32, color = c.black, variant = 'symbol', accessibilityLabel = 'GRYD' }: GrydMarkProps) {
  const art = GRYD_BRAND[variant];
  return <Svg width={size * art.width / art.height} height={size} viewBox={`0 0 ${art.width} ${art.height}`} accessible={Platform.OS === 'web' ? undefined : true} accessibilityLabel={accessibilityLabel}>
    <Path d={art.paths.join(' ')} fill={color} fillRule="evenodd" />
  </Svg>;
}
