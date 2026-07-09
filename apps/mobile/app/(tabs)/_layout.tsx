/**
 * GRYD — layout (tabs) : 5 onglets de JEU Carte · Missions · Crew · Saison ·
 * Profil (AMENDEMENT-29 §1 — relabel : « War Room » → « Missions », « League » →
 * « Saison » ; les routes `warroom`/`classement` sont CONSERVÉES, seuls les
 * labels changent). La Boutique SORT de la nav (renommée Arsenal, route
 * /arsenal, accessible depuis Profil et Missions). La tab bar native est
 * masquée : seule la barre pill carbone flottante (GrydNavBar) est rendue ICI,
 * en overlay — 5 onglets ÉGAUX, aucun bouton surélevé.
 *
 * AMENDEMENT-29 §2-§3 : le BOUTON D'ACTION FLOTTANT CONTEXTUEL revient (supersède
 * le retrait AMENDEMENT-17 par une version CONTEXTUELLE + GATÉE). Un SEUL bouton
 * chartreuse, centré AU-DESSUS de la barre de nav, dont le libellé + l'action
 * changent selon le contexte (RUN / DÉFENDRE / CONQUÉRIR / TERMINER / REJOINDRE —
 * jamais « GO »). Il n'apparaît QUE sur les écrans de flow de course (§A.5,
 * gating strict par route via usePathname) : Carte · Missions · détail zone
 * (/territoire) · détail route (/route-planner). Il est MASQUÉ partout ailleurs
 * (Profil · Saison · Crew · Historique · Partage · Arsenal · FAQ · Paramètres ·
 * Confidentialité · Live · Résultat · calcul-zones). Au tap : router.push vers
 * la cible dérivée (/course-live avec l'intention CLIENT ; le tracé décide, le
 * serveur tranche). Sur la Carte, ce bouton EST le CTA de mission → l'Info panel
 * ne duplique PLUS un 2ᵉ [Défendre] (anti double-CTA §A.4).
 * Garde d'auth (règle session.tsx) : Supabase configuré + pas de session →
 * (auth)/sign-in ; non configuré (O1) → mode dev.
 *
 * AMENDEMENT-30 §3 — ONBOARDING SANS FRICTION : « jouer avant le compte ». Le
 * gating est RÉORDONNÉ : un NOUVEAU visiteur (état pré-compte `onboardingDone`
 * faux, onboarding/store) voit l'ONBOARDING D'ABORD — la 1re capture démo se
 * fait AVANT toute auth ; le compte se crée à l'étape 6 du flow. La garde d'auth
 * (sign-in) ne s'applique qu'ENSUITE (filet natif si l'onboarding est fait mais
 * qu'aucune session n'existe encore). Un utilisateur DÉJÀ authentifié qui a fini
 * l'onboarding saute tout (§3).
 * NON BLOQUANT sur web preview (`configured=false`) : on NE force PAS la
 * redirection vers l'onboarding (les tabs restent l'aperçu par défaut, les
 * autres écrans testables) — le flow reste accessible/testable via /onboarding.
 * On n'agit qu'une fois l'état d'onboarding lu (évite un flash pendant la lecture
 * AsyncStorage).
 */
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@klaim/shared';
import { GrydNavBar } from '../../src/features/nav/GrydNavBar';
import { BattleLiveSync } from '../../src/features/nav/BattleLiveSync';
import { FAB_BOTTOM } from '../../src/features/nav/metrics';
import {
  deriveContextualAction,
  type ContextInput,
} from '../../src/features/nav/contextualAction';
import { EVENTS, track } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { FloatingActionButton } from '../../src/ui/game';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();
  const { state: onboarding, loading: onboardingLoading } = useOnboardingState();

  // Restauration de session en cours : fond noir muet (splash implicite).
  if (loading) return <View style={styles.root} />;

  // §3 — JOUER AVANT LE COMPTE : le nouveau visiteur voit l'onboarding en
  // premier (capture démo avant toute auth). Sur web preview (configured=false)
  // on ne force pas la redirection — les tabs restent l'aperçu par défaut,
  // l'onboarding reste testable via /onboarding.
  if (configured && !onboardingLoading && !onboarding.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  // Filet d'auth : onboarding fait mais pas de session (ex. compte différé à
  // l'étape 6) → écran de connexion réel. Jamais atteint en preview web.
  if (configured && !session) return <Redirect href="/sign-in" />;

  return (
    <View style={styles.root}>
      <BattleLiveSync />
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.hiddenTabBar }}>
        <Tabs.Screen name="index" options={{ title: 'Carte', tabBarLabel: 'Carte' }} />
        {/* Route `warroom` conservée, label recadré « Missions » (AMENDEMENT-29 §1). */}
        <Tabs.Screen name="warroom" options={{ title: 'Missions', tabBarLabel: 'Missions' }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarLabel: 'Crew' }} />
        {/* Route `classement` conservée, label recadré « Saison » (AMENDEMENT-29 §1). */}
        <Tabs.Screen name="classement" options={{ title: 'Saison', tabBarLabel: 'Saison' }} />
        <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarLabel: 'Profil' }} />
      </Tabs>
      {/* Bouton d'action flottant contextuel (gaté par route) AU-DESSUS de la nav. */}
      <ContextualNavButton />
      <GrydNavBar />
    </View>
  );
}

/**
 * AMENDEMENT-29 §3 — GATING STRICT (§A.5) du bouton flottant par la ROUTE
 * courante. Le bouton n'existe QUE sur les écrans de flow de course (allowlist,
 * jamais une denylist : par défaut CACHÉ). Le contexte de l'écran (`screen`)
 * recadre la dérivation de l'action (la Carte lit l'attaque ⇒ DÉFENDRE ; les
 * Missions lisent la mission urgente ⇒ TERMINER/DÉFENDRE). Rendu au-dessus de la
 * barre de nav (overlay), centré. Au tap : navigation vers la cible dérivée
 * (/course-live avec l'intention CLIENT).
 */
// Allowlist STRICTE (jamais une denylist : par défaut CACHÉ). Ne portent le
// bouton flottant que les écrans de flow de course SANS gros CTA chartreuse
// propre — sinon on créerait un 2ᵉ CTA principal (§A.4). Carte : le flottant
// REMPLACE le [Défendre] de l'Info (retiré). Missions : le flottant (TERMINER)
// est COMPLÉMENTAIRE des CTA in-content (par carte de mission).
// NB : /territoire (« Voir sur la carte » + « Défendre ») et /route-planner
// (« Démarrer ») ont DÉJÀ leur propre CTA chartreuse plein-largeur en bas → le
// bouton flottant y est VOLONTAIREMENT masqué (anti double-CTA). Quand ces
// écrans exposeront une vraie sélection de zone/route, ils passeront l'intention
// via leur CTA existant plutôt que via un doublon flottant.
const FAB_SCREEN_BY_PATH: Readonly<Record<string, NonNullable<ContextInput['screen']>>> = {
  '/': 'map', // Carte — le flottant EST le CTA de mission
  '/warroom': 'missions', // Missions (route conservée) — action complémentaire
};

function ContextualNavButton() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Gating STRICT : uniquement les routes de l'allowlist portent le bouton.
  const screen = FAB_SCREEN_BY_PATH[pathname];
  if (!screen) return null;

  const action = deriveContextualAction({ screen });

  return (
    <View
      style={[styles.fabOverlay, { bottom: insets.bottom + FAB_BOTTOM }]}
      pointerEvents="box-none"
    >
      <FloatingActionButton
        label={action.label}
        accessibilityLabel={action.a11yLabel}
        leading={<Icon name={action.icon} size={20} color={colors.noir} />}
        onPress={() => {
          // L'intention CLIENT part au live ; le tracé décide, le serveur tranche.
          track(EVENTS.runStart, {
            context: action.kind,
            intention: action.intention,
          });
          router.push(action.targetHref);
        }}
        // Appui long = choix avancés (AMENDEMENT-16) : on ouvre le Route Planner
        // (intentions/itinéraire) sans imposer un mode — le tap reste le départ.
        onLongPress={() => router.push('/route-planner')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
  // Overlay centré au-dessus de la barre de nav (ne capte pas les taps hors bouton).
  fabOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
