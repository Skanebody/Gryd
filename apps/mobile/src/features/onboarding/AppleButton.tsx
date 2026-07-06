/**
 * GRYD — bouton « Continuer avec Apple » de l'étape compte (AMENDEMENT-30 §6),
 * variante NATIVE. Isole l'import de `expo-apple-authentication` (qui appelle
 * `requireNativeViewManager` au chargement → crash sur web) dans un fichier à
 * fork de plateforme : la cible web charge `AppleButton.web.tsx` à la place, qui
 * n'importe jamais le module natif. Même contrat que sign-in.tsx / sign-in.web.tsx.
 *
 * Sur iOS : le vrai bouton système Apple. Sur Android : rien (l'écran compte
 * garde son bouton Google + Apple générique en repli côté écran).
 */
import { Platform, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { radii } from '@klaim/shared';

export function OnboardingAppleButton({ onPress }: { onPress: () => void }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={radii.pill}
      style={styles.button}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  button: { height: 56, width: '100%' },
});
