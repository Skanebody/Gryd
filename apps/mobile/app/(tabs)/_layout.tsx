/**
 * GRYD — layout (tabs) : 5 onglets Carte · Crew · Classement · Boutique · Profil
 * (AMENDEMENT-02 §5). La tab bar native est masquée : la barre pill carbone
 * flottante (GrydNavBar) et le bouton COURIR 72 px chartreuse (RunButton)
 * sont rendus ICI, en overlay — permanents sur les 5 onglets, dont la carte.
 * Garde d'auth (règle session.tsx) : Supabase configuré + pas de session
 * → (auth)/sign-in ; non configuré (O1) → mode dev, accès direct.
 */
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { GrydNavBar } from '../../src/features/nav/GrydNavBar';
import { RunButton } from '../../src/features/nav/RunButton';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();

  // Restauration de session en cours : fond noir muet (splash implicite).
  if (loading) return <View style={styles.root} />;
  if (configured && !session) return <Redirect href="/sign-in" />;

  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.hiddenTabBar }}>
        <Tabs.Screen name="index" options={{ title: 'Carte' }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew' }} />
        <Tabs.Screen name="classement" options={{ title: 'Classement' }} />
        <Tabs.Screen name="boutique" options={{ title: 'Boutique' }} />
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
