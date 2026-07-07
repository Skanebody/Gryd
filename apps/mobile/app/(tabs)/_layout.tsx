/**
 * GRYD — layout (tabs) : navigation ULTRA-SIMPLE à 4 slots pilotée par la barre
 * flottante custom (GrydNavBar) : Carte · Crew · [RUN central] · Moi. Décision
 * fondateur : le menu ne répond qu'à 3 besoins (courir · carte · progression).
 * Missions et Saison SORTENT de la barre (routes `warroom`/`classement`
 * conservées, atteintes depuis « Moi »). La tab bar native reste masquée.
 *
 * Le BOUTON RUN CONTEXTUEL (AMENDEMENT-29) n'est plus un overlay gaté : il vit
 * DANS GrydNavBar, toujours visible, au centre — « le joueur ne doit jamais
 * chercher comment courir ». Sa dérivation (deriveContextualAction : RUN par
 * défaut, DÉFENDRE/CONQUÉRIR/TERMINER selon l'écran) est portée par la barre.
 *
 * Garde d'auth (règle session.tsx) : Supabase configuré + pas de session →
 * (auth)/sign-in ; non configuré (O1) → mode dev.
 *
 * AMENDEMENT-30 §3 — ONBOARDING SANS FRICTION : « jouer avant le compte ». Un
 * NOUVEAU visiteur voit l'ONBOARDING D'ABORD (1re capture démo avant toute auth ;
 * compte créé à l'étape 6). La garde sign-in ne s'applique qu'ENSUITE. Non
 * bloquant sur web preview (`configured=false`) : on ne force pas la redirection.
 */
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { GrydNavBar } from '../../src/features/nav/GrydNavBar';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();
  const { state: onboarding, loading: onboardingLoading } = useOnboardingState();

  // Restauration de session en cours : fond noir muet (splash implicite).
  if (loading) return <View style={styles.root} />;

  // §3 — JOUER AVANT LE COMPTE : le nouveau visiteur voit l'onboarding en
  // premier. Sur web preview (configured=false) on ne force pas la redirection.
  if (configured && !onboardingLoading && !onboarding.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  // Filet d'auth : onboarding fait mais pas de session → connexion réelle.
  if (configured && !session) return <Redirect href="/sign-in" />;

  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.hiddenTabBar }}>
        <Tabs.Screen name="index" options={{ title: 'Carte', tabBarLabel: 'Carte' }} />
        {/* Routes conservées, hors barre : atteintes depuis « Moi ». */}
        <Tabs.Screen name="warroom" options={{ title: 'Missions', tabBarLabel: 'Missions' }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarLabel: 'Crew' }} />
        <Tabs.Screen name="classement" options={{ title: 'Saison', tabBarLabel: 'Saison' }} />
        <Tabs.Screen name="profil" options={{ title: 'Moi', tabBarLabel: 'Moi' }} />
      </Tabs>
      {/* Barre flottante 4 slots — Carte · Crew · [RUN] · Moi (RUN au centre). */}
      <GrydNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
});
