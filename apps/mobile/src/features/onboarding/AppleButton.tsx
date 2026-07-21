/**
 * GRYD — bouton « Continuer avec Apple » de l'étape compte (AMENDEMENT-30 §6),
 * variante NATIVE. Isole l'import de `expo-apple-authentication` (qui appelle
 * `requireNativeViewManager` au chargement → crash sur web) dans un fichier à
 * fork de plateforme : la cible web charge `AppleButton.web.tsx` à la place, qui
 * n'importe jamais le module natif. Même contrat que sign-in.tsx / sign-in.web.tsx.
 *
 * ─── LA GARDE DE CAPACITÉ (corrigée le 21/07/2026) ──────────────────────────
 * Ce composant se contentait de `Platform.OS !== 'ios' → null`. C'est l'OS, pas
 * la CAPACITÉ : sur un build iOS SANS l'entitlement « Sign in with Apple » (ou
 * sur iOS < 13), le test passe et `signInAsync` échoue à 100 % — soit exactement
 * le bouton mort que la règle interdit, et sur l'UNIQUE CTA de l'écran (§A4).
 * On interroge donc le système : `isAppleAuthAvailable()` (auth.ts) enveloppe
 * `AppleAuthentication.isAvailableAsync()`.
 *
 * La sonde est ASYNCHRONE : tant qu'elle n'a pas répondu on ne peint RIEN. Un
 * bouton affiché puis retiré serait pire qu'absent, et l'absence d'un bouton
 * n'est pas un mensonge — un bouton qui échoue toujours en est un. En pratique
 * la réponse arrive dans la première frame ; l'écran garde ses autres voies
 * (Google si capable, e-mail OTP) pendant ce temps.
 *
 * ⚠️ Règle des hooks : les deux hooks sont déclarés AVANT tout retour.
 *
 * Ce composant ne peint AUCUN repli générique. Il en peignait un — un « bouton
 * Apple » maison affiché hors iOS, sans aucun moteur derrière : il a disparu, et
 * rien ne le remplace ailleurs (l'ancienne mention d'un repli en preview, dans
 * l'entête de la variante web, décrivait un comportement mort).
 */
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { radii } from '@klaim/shared';
import { isAppleAuthAvailable } from '../../lib/auth';

export function OnboardingAppleButton({ onPress }: { onPress: () => void }) {
  /** `null` = on ne sait pas encore ; on ne peint que sur un `true` prouvé. */
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isAppleAuthAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (available !== true) return null;
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
