/**
 * GRYD — root layout expo-router.
 * Thème dark-first (fond = token noir, jamais #000 pur), provider de session
 * Supabase minimal, track app_open (§8) à l'ouverture.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@klaim/shared';
import { EVENTS, track } from '../src/lib/analytics';
import { SessionProvider } from '../src/lib/session';

export default function RootLayout() {
  useEffect(() => {
    track(EVENTS.appOpen);
  }, []);

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.noir },
            animation: 'fade', // transitions sobres 200-250 ms (addendum §G)
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)/sign-in" />
          {/* Onboarding motivationnel plein écran (AMENDEMENT-07 §8). */}
          <Stack.Screen name="onboarding/index" />
          {/* Écrans poussés par-dessus les tabs (AMENDEMENT-06 §3) */}
          <Stack.Screen name="badges" />
          <Stack.Screen name="arsenal" />
          <Stack.Screen name="sources" />
          <Stack.Screen name="support" />
          <Stack.Screen name="crew-discovery" />
          {/* Social (AMENDEMENT-07 §8) : Amis, fiche crew publique/recrutement. */}
          <Stack.Screen name="amis" />
          <Stack.Screen name="crew-public" />
          {/* Motivation (AMENDEMENT-07 §8) : Aujourd'hui, Challenges, réglages. */}
          <Stack.Screen name="aujourdhui" />
          <Stack.Screen name="challenges/index" />
          <Stack.Screen name="challenges/[id]" />
          <Stack.Screen name="settings-motivation" />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
