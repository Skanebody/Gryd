import { Platform, Switch as NativeSwitch, type SwitchProps } from 'react-native';
import { refonteColors as c } from '@klaim/shared';

/** RN Web 0.19 uses activeThumbColor separately; keep the same neutral thumb on both platforms. */
export function GrydSwitch({ thumbColor = c.surface, ios_backgroundColor, ...props }: SwitchProps) {
  const platformProps = Platform.OS === 'web' ? { activeThumbColor: thumbColor } : { ios_backgroundColor };
  return <NativeSwitch {...props} {...platformProps} thumbColor={thumbColor} />;
}
