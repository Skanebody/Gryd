import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet } from 'react-native';
import { radii } from '@klaim/shared';
import { AuthEntry2026 } from '../../src/features/account/AuthEntry2026';

export default function SignInScreen() {
  return <AuthEntry2026 renderAppleButton={(onPress, busy) => (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={radii.btn}
      onPress={onPress}
      pointerEvents={busy ? 'none' : 'auto'}
      style={[styles.apple, busy && styles.busy]}
    />
  )} />;
}

const styles = StyleSheet.create({
  apple: { alignSelf: 'stretch', height: 48 },
  busy: { opacity: 0.5 },
});
