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
 * (auth)/sign-in SI l'onboarding a déjà été vu, /onboarding sinon ; non
 * configuré (O1) → mode dev, aucune redirection.
 *
 * AMENDEMENT-30 §3 — ONBOARDING SANS FRICTION : « jouer avant le compte ». Un
 * NOUVEAU visiteur voit l'ONBOARDING D'ABORD ; la porte de connexion ne
 * s'applique qu'ENSUITE. Non bloquant sans backend (`configured=false`) : on ne
 * force aucune redirection, aucune garde ne pourrait aboutir.
 *
 * ─── ORDRE DES GARDES (corrigé le 21/07/2026) ───────────────────────────────
 * L'ordre précédent était : onboarding D'ABORD, session ensuite — et le gate
 * d'onboarding ne consultait JAMAIS `session`. Un joueur DÉJÀ CONNECTÉ dont le
 * drapeau local manquait (nouveau téléphone, stockage vidé, navigation privée)
 * était donc renvoyé dans l'onboarding : le flow le rattrapait bien (son effet
 * « session ⇒ finish('/') »), mais après un aller-retour d'écrans que rien ne
 * justifiait. Le drapeau d'onboarding est du stockage LOCAL ; la session, elle,
 * est la preuve serveur qu'un compte existe.
 *
 *   UNE SESSION VALIDE VAUT ONBOARDING FAIT — elle passe donc EN PREMIER.
 *
 * Et tant que la lecture du drapeau n'a pas résolu, on ne tranche PAS (fond noir
 * muet) : l'ancien `!onboardingLoading &&` faisait TOMBER le nouveau visiteur
 * dans la branche suivante — donc vers /sign-in — pendant la lecture.
 *
 * ─── ET SI LE DRAPEAU EST ILLISIBLE ? (21/07/2026) ──────────────────────────
 * `onboardingDone: false` sorti des DÉFAUTS n'est pas une réponse (navigation
 * privée, localStorage bloqué, blob corrompu…). On ne choisit donc pas une porte
 * dessus : on envoie vers l'écran qui RE-DEMANDE. /onboarding est ce bon écran,
 * parce qu'il porte les DEUX portes — la découverte, et « J'ai déjà un compte »
 * qui mène droit à /sign-in. Re-demander ne coûte donc jamais l'accès à la
 * connexion, alors que trancher au hasard le coûterait une fois sur deux.
 *
 * ⚠️ Ce fichier ne connaît PAS le gate 16+, et c'est voulu. Faire dépendre
 * l'accès d'un drapeau d'âge stocké localement est ce qui a briqué l'app une
 * fois (cf. entête de `(auth)/sign-in.tsx`) : le gate légal vit au point de
 * CRÉATION de compte, jamais dans une garde de route.
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
  const { state: onboarding, status: onboardingStatus } = useOnboardingState();
  const t = useT();

  // Restauration de session en cours : fond noir muet (splash implicite).
  if (loading) return <View style={styles.root} />;

  // Pas de session (et un backend qui rend la garde utile) : c'est LÀ, et
  // seulement là, que le drapeau local d'onboarding décide de la porte.
  // Une session existante ne consulte plus rien — voir l'entête.
  if (configured && !session) {
    // Lecture du drapeau EN COURS : fond noir muet. On ne choisit pas une porte
    // sur une valeur par défaut (« un chargement n'affirme rien sur le joueur »).
    // Borné : le store plafonne la lecture, elle finit toujours par trancher
    // entre `ready` et `unavailable` — jamais de noir éternel.
    if (onboardingStatus === 'reading') return <View style={styles.root} />;
    // `/sign-in` UNIQUEMENT sur une réponse LUE. Illisible ⇒ /onboarding, qui
    // re-demande et garde la porte de connexion ouverte (voir l'entête).
    const seen = onboardingStatus === 'ready' && onboarding.onboardingDone;
    return <Redirect href={seen ? '/sign-in' : '/onboarding'} />;
  }

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
