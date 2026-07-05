/**
 * GRYD — layout (tabs) : 5 onglets de JEU Carte · War Room · Crew · League ·
 * Profil (AMENDEMENT-08 §3, doc §6 — la route `classement` garde son nom, seul
 * le label devient « League »). La Boutique SORT de la nav (renommée Arsenal,
 * route /arsenal, accessible depuis Profil et War Room). La tab bar native est
 * masquée : seule la barre pill carbone flottante (GrydNavBar) est rendue ICI,
 * en overlay — 5 onglets ÉGAUX, aucun bouton surélevé.
 *
 * AMENDEMENT-17 §1.1 : le FAB flottant GO central est SUPPRIMÉ de l'overlay
 * global — il ne flotte plus JAMAIS au milieu, sur aucun onglet (« pas deux
 * GO » ; retiré de Profil / League / Crew / War Room). Le lancement de course
 * est désormais un CTA INLINE contextuel, rendu DANS le contenu de chaque
 * écran (Carte → RunButton inline dans la bottom sheet ; les autres pages →
 * leur propre CTA plein-largeur via ContextualRunButton). Le composant
 * RunButton (features/nav/RunButton) reste exporté pour la Carte, mais n'est
 * plus monté ici.
 * Garde d'auth (règle session.tsx) : Supabase configuré + pas de session →
 * (auth)/sign-in ; non configuré (O1) → mode dev.
 *
 * AMENDEMENT-07 §8 : après l'auth, si l'onboarding motivationnel n'a jamais été
 * vu, on redirige une fois vers /onboarding (natif uniquement — session réelle).
 * NON BLOQUANT : sur web `configured=false` (aperçu), donc jamais de redirection ;
 * et l'onboarding lui-même a un « Passer ». On n'agit qu'une fois les prefs lues
 * (évite un flash pendant la lecture AsyncStorage).
 */
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { GrydNavBar } from '../../src/features/nav/GrydNavBar';
import { useMotivationPrefs } from '../../src/features/motivation/store';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();
  const { prefs, loading: prefsLoading } = useMotivationPrefs();

  // Restauration de session en cours : fond noir muet (splash implicite).
  if (loading) return <View style={styles.root} />;
  if (configured && !session) return <Redirect href="/sign-in" />;

  // Onboarding motivationnel une seule fois, sur session réelle (§8).
  if (configured && session && !prefsLoading && !prefs.onboardingSeen) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.hiddenTabBar }}>
        <Tabs.Screen name="index" options={{ title: 'Carte' }} />
        <Tabs.Screen name="warroom" options={{ title: 'War Room' }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew' }} />
        <Tabs.Screen name="classement" options={{ title: 'League' }} />
        <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
      </Tabs>
      <GrydNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
});
