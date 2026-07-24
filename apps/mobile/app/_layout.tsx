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
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@klaim/shared';
import { EVENTS, registerScreen, screen, track } from '../src/lib/analytics';
import { normalizeScreenPath } from '../src/lib/screenName';
import { retryPendingUpload } from '../src/lib/pendingUpload';
import { SessionProvider } from '../src/lib/session';
import {
  parseInviteUrl,
  rememberPendingInvite,
  startPendingInviteWatcher,
} from '../src/features/crew/pendingInvite';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';
// AMENDEMENT-15 §2 : la tâche GPS background doit être définie AU CHARGEMENT
// du bundle (relance headless après kill). Variante .web.ts vide — le preview
// web ne voit aucun module natif.
import '../src/features/run/gps/registerBackgroundTask';

/**
 * TRACEUR DE NAVIGATION (§26 super-propriétés). Un composant sans rendu, monté
 * sous le routeur : à chaque changement de route il déclare l'écran normalisé
 * (registerScreen → previous_screen/time_on_screen des events suivants) et émet
 * la vue standard `$screen`. Le NOM est rédigé (normalizeScreenPath) — aucun id
 * dynamique ne fuit. Silencieux si PostHog n'est pas configuré (O3).
 */
function NavAnalytics(): null {
  const pathname = usePathname();
  useEffect(() => {
    const name = normalizeScreenPath(pathname);
    registerScreen(name);
    screen(name);
  }, [pathname]);
  return null;
}

export default function RootLayout() {
  useEffect(() => {
    track(EVENTS.appOpen);
    // AMENDEMENT-15 §2 : une fin de course restée hors-ligne est renvoyée
    // silencieusement à chaque lancement (idempotent par clientRunId, D14).
    void retryPendingUpload();
  }, []);

  // ── RÉCEPTION DES LIENS D'INVITE CREW (demande fondateur 21/07/2026) ────────
  // DEUX chemins, tous deux nécessaires : `getInitialURL` quand l'app est
  // LANCÉE par le lien (elle n'existait pas encore, aucun listener n'aurait pu
  // l'entendre), et le listener `url` quand elle est DÉJÀ ouverte (le lancement
  // initial, lui, n'émet pas d'événement). Un seul des deux ⇒ la moitié des
  // scans de QR ne fait rien.
  //
  // Le parsing est STRICT (`parseInviteUrl`) : une URL non reconnue — autre
  // domaine, autre chemin, code de mauvaise longueur — est IGNORÉE. On ne route
  // jamais sur une entrée externe non validée.
  // ANTI-DOUBLON : expo-router route DÉJÀ tout seul un lien dont le chemin
  // correspond à une route existante. Sans garde, l'app empilerait DEUX fois
  // l'écran d'invitation (le « retour » revenant sur lui-même). On compare donc
  // au chemin courant avant de naviguer. On garde quand même notre handler : il
  // VALIDE le code (le routage automatique, lui, accepterait n'importe quoi) et
  // couvre les runtimes où l'auto-linking ne se déclenche pas.
  // ANTI-DOUBLON PAR CODE, pas par pathname : `open()` est appelé depuis la
  // microtâche de résolution de getInitialURL, donc potentiellement AVANT que le
  // routage automatique d'expo-router ait mis à jour `usePathname()`. Comparer au
  // pathname lisait alors encore '/' : la garde ne se déclenchait pas et l'écran
  // d'invitation s'empilait deux fois (le « Retour » revenait sur lui-même). Une
  // ref sur le dernier code traité est immunisée au timing.
  const lastHandledCodeRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const open = (url: string | null): void => {
      const code = parseInviteUrl(url);
      if (!alive || !code) return;
      if (lastHandledCodeRef.current === code) return; // déjà traité
      lastHandledCodeRef.current = code;
      // §26 — l'app ouverte par un lien. `kind` est FERMÉ (le seul type routé
      // aujourd'hui) : ni l'URL ni le code d'invitation ne partent en analytics.
      track(EVENTS.deepLinkOpened, { kind: 'crew_invite' });
      // MÉMORISATION ICI, et INCONDITIONNELLE (correctif du bloquant relevé par
      // la vérification adversariale). Elle vivait dans l'écran /c/[code], gardée
      // par `sessionLoading` : au démarrage à froid ce drapeau est VRAI, donc le
      // 1er passage de l'effet renonçait, et la mémorisation dépendait d'un 2e
      // passage… pendant que (tabs)/_layout rendait un <Redirect> vers
      // /onboarding ou /sign-in qui remplace la pile entière. Deux lectures
      // asynchrones indépendantes en COURSE — et si le Redirect gagnait,
      // l'invitation était perdue en silence, EXACTEMENT pour la personne pas
      // encore inscrite que ce parcours vise. Le layout racine, lui, est toujours
      // monté : poser l'intention ici la rend indépendante du routage.
      void rememberPendingInvite(code);
      router.push({ pathname: '/c/[code]', params: { code } });
    };
    // Défensif : sur un runtime où Linking n'est pas dispo (preview dégradée),
    // l'app démarre quand même — un lien manqué ne vaut pas un crash.
    try {
      void Linking.getInitialURL()
        .then(open)
        .catch(() => undefined);
    } catch {
      // ignoré
    }
    const sub = Linking.addEventListener('url', ({ url }) => open(url));
    // Reprise de l'invitation mémorisée dès que la session devient valide
    // (inscription différée) — posée ICI, dans un layout toujours monté.
    const stopWatcher = startPendingInviteWatcher();
    return () => {
      alive = false;
      sub.remove();
      stopWatcher();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavAnalytics />
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
          {/* Atterrissage d'une invitation crew (QR / lien `gryd://c/CODE`). */}
          <Stack.Screen name="c/[code]" />
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
