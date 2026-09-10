/**
 * September 2026: exploring the map precedes account creation.
 *
 * ─── DEUX CORRECTIFS DU 10/09/2026 ──────────────────────────────────────────
 *
 * 1. PLUS D'ÉCRAN NOIR MUET. Cette garde rendait `<View style={styles.root} />`
 *    — un rectangle noir sans logo ni indicateur — dans DEUX attentes : la
 *    restauration de session, et la lecture du drapeau d'onboarding, qui a son
 *    propre plafond de patience de 3 secondes (`onboarding/store.ts`,
 *    `STORAGE_TIMEOUT_MS`). Trois secondes de noir au lancement, sur un stockage
 *    lent, ressemblent à un plantage. E00 EXISTE (`features/boot/SplashE00`) et
 *    couvre déjà l'attente de session depuis le layout racine ; il n'y avait
 *    aucune raison que celle-ci reste nue. Les fontes sont chargées à ce
 *    stade — `app/_layout.tsx` ne rend ses enfants qu'ensuite —, d'où
 *    `logoReady`.
 *
 * 2. LES BANDEAUX DE SESSION SONT ENFIN RENDUS. `deletionCancelled` (0046) et
 *    `sessionExpired` étaient calculés par `lib/session.tsx` et lus par
 *    PERSONNE. Voir `features/account/SessionNotices2026.tsx`.
 */
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { GrydNavBar } from '../../src/features/nav/GrydNavBar';
import { SessionNotices2026 } from '../../src/features/account/SessionNotices2026';
import { SplashE00 } from '../../src/features/boot/SplashE00';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { completedOnboardingThisSession2026 } from '../../src/features/onboarding/sessionCompletion2026';
import { C } from '../../src/i18n/catalog/nav';
import { useT } from '../../src/i18n/store';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();
  const { state: onboarding, status: onboardingStatus } = useOnboardingState();
  const t = useT();

  // Restauration de session en cours : E00, pas un rectangle noir.
  if (loading) return <SplashE00 logoReady />;

  // Existing accounts go straight to the app; guests see the welcome once.
  if (configured && !session) {
    // An explicit exploration choice also works when local storage is unavailable.
    if (onboardingStatus === 'reading' && !completedOnboardingThisSession2026()) {
      return <SplashE00 logoReady />;
    }
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
      {/* UNE barre, montée ICI, pour les cinq routes du groupe (10/09/2026).
          Elle était conditionnelle : la Carte se voyait refuser la barre du
          layout parce qu'elle montait la sienne, action « Courir » comprise.
          Crew et Profil recevaient donc une barre DIFFÉRENTE, sans départ
          possible. La barre calcule maintenant son action elle-même
          (`features/nav/useRunAction2026`), et la Carte n'en monte plus. */}
      <GrydNavBar />
      {/* Rendus par-dessus : un fait de session n'attend pas la prochaine
          navigation pour être dit, et il ne pousse aucun contenu. */}
      <SessionNotices2026 />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
});
