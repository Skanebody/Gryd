/** September 2026: exploring the map precedes account creation. */
import { Redirect, Tabs, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { GrydNavBar } from '../../src/features/nav/GrydNavBar';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { completedOnboardingThisSession2026 } from '../../src/features/onboarding/sessionCompletion2026';
import { C } from '../../src/i18n/catalog/nav';
import { useT } from '../../src/i18n/store';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();
  const { state: onboarding, status: onboardingStatus } = useOnboardingState();
  const pathname = usePathname();
  const t = useT();

  // Restauration de session en cours : fond noir muet (splash implicite).
  if (loading) return <View style={styles.root} />;

  // Existing accounts go straight to the app; guests see the welcome once.
  if (configured && !session) {
    // An explicit exploration choice also works when local storage is unavailable.
    if (onboardingStatus === 'reading' && !completedOnboardingThisSession2026()) return <View style={styles.root} />;
    const seen = onboardingStatus === 'ready' && onboarding.onboardingDone;
    if (!seen && !completedOnboardingThisSession2026()) return <Redirect href="/onboarding" />;
  }

  // A profile is completed where public identity is needed. Exploring and
  // recording an outing never await a social-profile read or a setup wizard.
  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.hiddenTabBar }}>
        <Tabs.Screen name="index" options={{ title: t(C.tabCarte), tabBarLabel: t(C.tabCarte) }} />
        {/* HORS barre GrydNavBar (LOT 5) : Missions, atteinte depuis Aujourd'hui
            et Paramètres — pas encore depuis la Carte (E16, hors périmètre). */}
        <Tabs.Screen
          name="warroom"
          options={{ title: t(C.tabMissions), tabBarLabel: t(C.tabMissions) }}
        />
        {/* « Crew » = invariant produit (jamais traduit). */}
        <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarLabel: 'Crew' }} />
        {/* HORS barre GrydNavBar (LOT 5, 27/07/2026) : Saison, atteinte depuis le
            Profil (raccourci « Saison › » + lien Progression). Route + titre
            d'onglet restent déclarés ici — seule sa présence dans LA BARRE a
            disparu, cf. `src/features/nav/tabs.ts`. */}
        <Tabs.Screen
          name="classement"
          options={{ title: t(C.tabSaison), tabBarLabel: t(C.tabSaison) }}
        />
        <Tabs.Screen name="profil" options={{ title: t(C.tabMoi), tabBarLabel: t(C.tabMoi) }} />
      </Tabs>
      {/* La Carte monte sa barre avec l'action Courir/Rouler/Reprendre intégrée. */}
      {pathname === '/' ? null : <GrydNavBar />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
});
