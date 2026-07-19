/**
 * GRYD — root layout expo-router.
 * Thème dark-first (fond = token noir, jamais #000 pur), provider de session
 * Supabase minimal, track app_open (§8) à l'ouverture.
 */
// DIAGNOSTIC CRASH iOS (temporaire) : DOIT être le tout premier import — les
// imports s'évaluent dans l'ordre, et ce module pose le handler d'erreur global
// AVANT que le reste de l'app ne charge. Une erreur fatale s'affiche à l'écran
// au lieu de tuer l'app en silence.
import '../src/lib/bootDiagnostics';
// CAUSE RÉELLE du crash de démarrage iOS (builds 1-3) : le TextDecoder du
// runtime Expo/Hermes ne connaît pas utf-16le, or h3-js (Emscripten) en crée
// un à l'import. Ce polyfill DOIT précéder tout module qui touche h3-js.
import '../src/lib/textDecoderUtf16';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@klaim/shared';
import { EVENTS, track } from '../src/lib/analytics';
import { retryPendingUpload } from '../src/lib/pendingUpload';
import { SessionProvider } from '../src/lib/session';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
// AMENDEMENT-15 §2 : la tâche GPS background doit être définie AU CHARGEMENT
// du bundle (relance headless après kill). Variante .web.ts vide — le preview
// web ne voit aucun module natif.
import '../src/features/run/gps/registerBackgroundTask';

export default function RootLayout() {
  useEffect(() => {
    track(EVENTS.appOpen);
    // AMENDEMENT-15 §2 : une fin de course restée hors-ligne est renvoyée
    // silencieusement à chaque lancement (idempotent par clientRunId, D14).
    void retryPendingUpload();
  }, []);

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        {/* Boundary global brandé (AMENDEMENT-08 §0) : plus jamais d'écran d'erreur brut. */}
        <ErrorBoundary>
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
          {/* Performance (AMENDEMENT-17 chantier 3) : running + impact GRYD. */}
          <Stack.Screen name="performance" />
          <Stack.Screen name="support" />
          <Stack.Screen name="crew-discovery" />
          {/* Édition du crew (founder §8.1) : nom/tag/desc/recrutement/tags. */}
          <Stack.Screen name="crew-edit" />
          {/* Social (AMENDEMENT-07 §8) : Amis, fiche crew publique/recrutement. */}
          <Stack.Screen name="amis" />
          <Stack.Screen name="crew-public" />
          {/* Motivation (AMENDEMENT-07 §8) : Aujourd'hui, Challenges, réglages. */}
          <Stack.Screen name="aujourdhui" />
          <Stack.Screen name="challenges/index" />
          <Stack.Screen name="challenges/[id]" />
          <Stack.Screen name="settings-motivation" />
          {/* Historique (AMENDEMENT-17 §CH3) : liste + détail d'une course. */}
          <Stack.Screen name="historique" />
          <Stack.Screen name="course/[id]" />
          </Stack>
        </ErrorBoundary>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
