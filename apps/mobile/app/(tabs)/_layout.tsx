/**
 * GRYD — layout (tabs) : 5 onglets Carte · War Room · Crew · Classement · Profil
 * (AMENDEMENT-06 §3, doc v3 §6). La Boutique SORT de la nav (renommée Arsenal,
 * route /arsenal, accessible depuis Profil et War Room). La tab bar native est
 * masquée : la barre pill carbone flottante (GrydNavBar) et le bouton COURIR
 * 72 px chartreuse (RunButton) sont rendus ICI, en overlay — permanents sur les
 * 5 onglets, dont la carte. Garde d'auth (règle session.tsx) : Supabase
 * configuré + pas de session → (auth)/sign-in ; non configuré (O1) → mode dev.
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
import { RunButton } from '../../src/features/nav/RunButton';
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
        <Tabs.Screen name="classement" options={{ title: 'Classement' }} />
        <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
      </Tabs>
      <GrydNavBar />
      <RunButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
});
