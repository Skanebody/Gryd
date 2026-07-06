/**
 * GRYD — bouton Apple de l'étape compte, variante WEB (aperçu navigateur).
 * Metro résout `.web.tsx` avant `.tsx` : le module natif `expo-apple-authentication`
 * (requireNativeViewManager → crash web) n'est JAMAIS importé sur la cible web.
 * En preview, l'écran compte affiche déjà un bouton Apple générique en repli
 * (auth.web = no-op « ok ») ; ce composant ne rend donc rien pour éviter un
 * doublon. Le natif garde AppleButton.tsx (vrai bouton système).
 */
export function OnboardingAppleButton(_: { onPress: () => void }) {
  return null;
}
