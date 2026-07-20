/**
 * GRYD — layout (tabs) : BARRE D'ONGLETS BASSE PERSISTANTE custom (GrydNavBar)
 * par-dessus des Tabs expo-router dont la tab bar NATIVE est masquée.
 * 4 destinations visibles en 1 tap : Carte · Crew · Saison · Moi ; la route
 * `warroom` (Missions) est conservée HORS barre, atteinte depuis « Moi ».
 *
 * Au CENTRE de la barre, soulevé : LE bouton d'action contextuel chartreuse
 * (AMENDEMENT-29), présent sur TOUS les onglets — « le joueur ne doit jamais
 * chercher comment courir ». Sa dérivation (deriveContextualAction : RUN par
 * défaut, DÉFENDRE/CONQUÉRIR/TERMINER selon l'écran) est portée par la barre,
 * avec un lien « Course libre » visible quand le verbe dérivé n'est pas RUN.
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
import { C } from '../../src/i18n/catalog/nav';
import { useT } from '../../src/i18n/store';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();
  const { state: onboarding, loading: onboardingLoading } = useOnboardingState();
  const t = useT();

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
        <Tabs.Screen name="index" options={{ title: t(C.tabCarte), tabBarLabel: t(C.tabCarte) }} />
        {/* Seule route HORS barre : Missions, atteinte depuis « Moi ». */}
        <Tabs.Screen
          name="warroom"
          options={{ title: t(C.tabMissions), tabBarLabel: t(C.tabMissions) }}
        />
        {/* « Crew » = invariant produit (jamais traduit). */}
        <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarLabel: 'Crew' }} />
        <Tabs.Screen
          name="classement"
          options={{ title: t(C.tabSaison), tabBarLabel: t(C.tabSaison) }}
        />
        <Tabs.Screen name="profil" options={{ title: t(C.tabMoi), tabBarLabel: t(C.tabMoi) }} />
      </Tabs>
      {/* Barre d'onglets persistante (Carte · Crew · Saison · Moi) + action centrale. */}
      <GrydNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
});
