/**
 * GRYD — bouton Apple de l'étape compte, variante WEB (aperçu navigateur).
 * Metro résout `.web.tsx` avant `.tsx` : le module natif `expo-apple-authentication`
 * (requireNativeViewManager → crash web) n'est JAMAIS importé sur la cible web.
 *
 * Rend `null`, et c'est la seule réponse honnête : `auth.web.ts` refuse Apple
 * (`web_unsupported`) tant que le Services ID + le secret Apple n'existent pas
 * côté Supabase (O2). Peindre un bouton ici serait peindre un bouton mort.
 *
 * ─── ENTÊTE CORRIGÉE (21/07/2026) ───────────────────────────────────────────
 * Ce fichier expliquait qu'il ne rendait rien « pour éviter un doublon », parce
 * que l'écran compte afficherait déjà « un bouton Apple générique en repli
 * (auth.web = no-op ok) ». Les deux moitiés de cette phrase sont mortes : le
 * repli générique a été supprimé de l'écran compte, et le no-op « ok » de
 * auth.web.ts — qui prétendait une connexion qui n'avait pas eu lieu — aussi.
 * Une doc qui décrit un comportement disparu est du même ordre qu'une donnée
 * fabriquée : elle fait raisonner faux le prochain lecteur.
 */
export function OnboardingAppleButton(_: { onPress: () => void }) {
  return null;
}
