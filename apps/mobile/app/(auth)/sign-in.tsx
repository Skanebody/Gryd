/**
 * GRYD — la porte de compte sur iOS. Le panneau, sa copie et ses états vivent
 * dans `features/account/AuthEntry2026` ; cet écran n'apporte QUE le bouton
 * natif Apple, qu'Apple interdit de redessiner.
 *
 * ⚠️ `SIGN_IN` → `CONTINUE` (10/09/2026). Le bouton natif affichait « Sign in
 * with Apple » / « Se connecter avec Apple » : sur la seule porte de l'app, le
 * système lui-même répétait au nouveau joueur qu'il fallait déjà avoir un
 * compte. Cette porte fait les deux (Apple crée le compte au premier passage) ;
 * `CONTINUE` rend « Continuer avec Apple », le libellé qu'Apple prévoit
 * justement pour un flux qui crée OU connecte. Le titre de l'écran dit le
 * reste. Aucun texte n'est écrit ici : ces libellés appartiennent à iOS et sont
 * traduits par lui.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet } from 'react-native';
import { radii } from '@klaim/shared';
import { APPLE_BUTTON_HEIGHT, AuthEntry2026 } from '../../src/features/account/AuthEntry2026';

export default function SignInScreen() {
  return <AuthEntry2026 renderAppleButton={(onPress, busy) => (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
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
