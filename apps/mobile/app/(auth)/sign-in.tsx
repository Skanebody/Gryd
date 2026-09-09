import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet } from 'react-native';
import { radii } from '@klaim/shared';
import { APPLE_BUTTON_HEIGHT, AuthEntry2026 } from '../../src/features/account/AuthEntry2026';

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
  // ⚠️ LA HAUTEUR VIENT DU MODULE, PAS D'UN 48 RECOPIÉ ICI. C'est la place que
  // `AuthEntry2026` réserve pendant la sonde de capacité : deux nombres qui
  // divergent ne suppriment pas le saut de mise en page, ils le déplacent.
  apple: { alignSelf: 'stretch', height: APPLE_BUTTON_HEIGHT },
  busy: { opacity: 0.5 },
});
