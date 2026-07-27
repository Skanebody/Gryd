/**
 * GRYD — root layout expo-router.
 * Thème dark-first (fond = token noir, jamais #000 pur), provider de session
 * Supabase minimal, track app_open (§8) à l'ouverture.
 */
// FILET FATAL : DOIT rester le tout premier import — les imports s'évaluent
// dans l'ordre, et le handler global doit être posé AVANT que le reste de l'app
// ne se charge (une erreur d'ÉVALUATION de module se produit à l'import).
//
// Il remplace `src/lib/bootDiagnostics`, qui n'est donc plus chargé. Ce module
// de diagnostic affichait `error.name: error.message` + 900 caractères de PILE
// D'APPEL dans une Alert, SANS garde `__DEV__` : c'était un chemin garanti vers
// un message technique brut sous les yeux d'un joueur en production — la faute
// même que ce chantier corrige. Il avait été posé pour élucider le crash de
// démarrage iOS des builds 1-3 ; ce crash est élucidé (TextDecoder utf-16le,
// correctif importé juste en dessous) et son en-tête le déclarait « TEMPORAIRE ».
// On conserve sa seule vertu — ne PAS propager l'erreur fatale, car propager
// vaut RCTFatal, donc un crash muet — et on remplace l'affichage brut par une
// alerte GRYD honnête (`src/ui/fatalErrorGuard`).
import { installFatalErrorGuard } from '../src/ui/fatalErrorGuard';

installFatalErrorGuard();
// CAUSE RÉELLE du crash de démarrage iOS (builds 1-3) : le TextDecoder du
// runtime Expo/Hermes ne connaît pas utf-16le, or h3-js (Emscripten) en crée
// un à l'import. Ce polyfill DOIT précéder tout module qui touche h3-js.
import '../src/lib/textDecoderUtf16';
import { useEffect, useRef } from 'react';
import { AppState, Linking, View } from 'react-native';
import { router, Stack, usePathname } from 'expo-router';
import { useAppFonts } from '../src/lib/fonts';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@klaim/shared';
import { EVENTS, registerScreen, screen, track } from '../src/lib/analytics';
import { normalizeScreenPath } from '../src/lib/screenName';
import { retryPendingUpload } from '../src/lib/pendingUpload';
import { loadActiveRun, loadCurrentRun } from '../src/lib/runStore';
import { SessionProvider } from '../src/lib/session';
import {
  decideCrashRecoveryNavigation,
  type InterruptedRunSnapshot,
} from '../src/features/run/gps/crashRecovery';
import {
  parseInviteUrl,
  rememberPendingInvite,
  startPendingInviteWatcher,
} from '../src/features/crew/pendingInvite';

/**
 * Réduit un buffer `runStore.StoredRun` à ce que la décision PURE de
 * `crashRecovery.ts` a besoin de connaître (voir ce fichier : `runStore.ts`
 * n'est délibérément PAS importé par ce module, pour ne pas faire échouer son
 * gate Deno). `null` passe tel quel (buffer absent).
 */
function toRecoverySnapshot(
  run: { runId: string; startedAt: number; fixes: readonly { ts: number }[] } | null,
): InterruptedRunSnapshot | null {
  if (run === null) return null;
  return { runId: run.runId, startedAt: run.startedAt, fixTimestamps: run.fixes.map((f) => f.ts) };
}

/**
 * FRONTIÈRE D'ERREUR DE L'APP — mécanisme d'expo-router, rendu GRYD.
 *
 * Exporter `ErrorBoundary` depuis un fichier de route fait envelopper CE
 * composant de route dans `<Try>` (expo-router `useScreens.fromImport`). Pour
 * le layout racine, cela couvre le corps même de `RootLayout` — donc l'appel à
 * `useAppFonts`, qui est exactement là où la panne observée par le fondateur
 * (« fonts is not defined ») se déclarait. Un `<ErrorBoundary>` posé PLUS BAS
 * dans le JSX ne pouvait pas l'attraper : un boundary React n'attrape jamais ce
 * qui casse chez son parent. `Try` masque en plus le splash, sans quoi l'écran
 * d'erreur resterait caché derrière.
 *
 * C'est pourquoi il n'y a plus de `<ErrorBoundary>` autour du `<Stack>` :
 * l'envelopper deux fois n'aurait rien attrapé de plus (`Try` est déjà au-dessus)
 * et aurait fait deux couches à maintenir pour un seul écran d'erreur.
 * `src/ui/ErrorBoundary.tsx` n'est donc plus utilisé par personne.
 */
export { AppErrorBoundary as ErrorBoundary } from '../src/ui/AppErrorBoundary';
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
  const fontsReady = useAppFonts();

  useEffect(() => {
    track(EVENTS.appOpen);
    // AMENDEMENT-15 §2 : une fin de course restée hors-ligne est renvoyée
    // silencieusement à chaque lancement (idempotent par clientRunId, D14).
    void retryPendingUpload();
    // PROPOSER LA REPRISE APRÈS CRASH (LOT 2.3, 27/07/2026 — voir
    // `features/run/gps/crashRecovery.ts`). La donnée SURVIT déjà (buffer
    // `runStore`, flush périodique `run_autosave`) et `course-live` sait déjà
    // la reproposer (`RestoreRunCard`) — mais RIEN n'y menait au lancement :
    // seul un nouveau GO y navigue. Un joueur qui rouvre l'app après un crash
    // croyait donc sa course perdue alors qu'elle était sur le disque (spec
    // §25.3, E00 : « activité active retrouvée : aller directement à la
    // récupération »).
    //
    // UNE SEULE fois, au lancement FROID de cet effet (tableau de dépendances
    // vide) — jamais sur le retour au premier plan (l'AppState listener
    // ci-dessous ne fait QUE `retryPendingUpload`) : une course RÉELLEMENT en
    // cours reste sur son écran `course-live`, qui continue de flusher son
    // propre buffer pendant que l'app est en arrière-plan ; la reproposer à
    // chaque retour arracherait le joueur de SA PROPRE course en train de se
    // dérouler pour la lui « redécouvrir » par-dessus elle-même.
    //
    // `course-live` refait ensuite sa PROPRE réconciliation complète des deux
    // clés (ACTIVE/CURRENT) — ce déclencheur ne fait QUE décider s'il faut
    // l'atteindre, jamais reprendre ou clôturer une course lui-même.
    void (async () => {
      const [active, current] = await Promise.all([loadActiveRun(), loadCurrentRun()]);
      const decision = decideCrashRecoveryNavigation(
        [toRecoverySnapshot(active), toRecoverySnapshot(current)],
        Date.now(),
      );
      if (decision.shouldNavigate) router.push('/course-live');
    })();
    // DÉCLENCHEUR DE REPRISE (27/07/2026, file FIFO) : le lancement ne suffit
    // pas — une app qui reste ouverte plusieurs jours ne relancerait jamais.
    // Le retour au PREMIER PLAN est le seul signal de reconnexion disponible
    // sans nouvelle dépendance (`@react-native-community/netinfo` n'est PAS
    // dans le projet, et on n'en ajoute pas une pour ça) : c'est exactement le
    // moment où l'utilisateur rentre chez lui et retrouve du réseau. Le rejeu
    // est verrouillé (retryInFlight) et no-op hors-ligne : le déclencher trop
    // souvent ne coûte rien.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void retryPendingUpload();
    });
    return () => sub.remove();
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

  // Fontes NIGHT PRINT prêtes avant tout rendu (jamais de flash de la police
  // système ensuite remplacée). Fond carbone plein pendant le chargement — bref,
  // les fichiers sont bundlés. En cas d'échec, useAppFonts rend `true` (fallback).
  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: colors.noir }} />;
  }

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavAnalytics />
        <StatusBar style="light" />
        {/* La frontière d'erreur n'est PAS ici : elle enveloppe ce layout entier
            (export `ErrorBoundary` en tête de fichier), donc plus haut que ce
            JSX. Voir le commentaire de l'export. */}
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
          {/* E26 « Profil rival · vue publique » (lien profond / QR). N'affiche
              qu'un état honnête tant qu'O1 n'expose pas de rival consenti —
              aucun profil fabriqué, aucune surface de l'app n'y mène. */}
          <Stack.Screen name="profil-rival/[handle]" />
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
      </SessionProvider>
    </SafeAreaProvider>
  );
}
