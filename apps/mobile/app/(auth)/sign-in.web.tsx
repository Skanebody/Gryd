/**
 * GRYD — sign-in, variante WEB (aperçu navigateur).
 * Metro/expo-router résolvent `.web.tsx` avant `.tsx` : les modules natifs-only
 * (expo-apple-authentication) ne sont PAS importés dans le bundle web.
 * En aperçu web la session est en mode « non configuré » (session.web.tsx),
 * donc cette route redirige immédiatement vers la carte — jamais de mur d'auth.
 * Le natif garde sign-in.tsx intact (vrai flux Apple/Google).
 */
import { Redirect } from 'expo-router';

export default function SignInScreenWeb() {
  return <Redirect href="/" />;
}
