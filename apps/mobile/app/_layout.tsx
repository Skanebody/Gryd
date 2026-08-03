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
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { router, Stack, usePathname } from 'expo-router';
import { useAppFonts } from '../src/lib/fonts';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@klaim/shared';
import { EVENTS, registerScreen, screen, track } from '../src/lib/analytics';
import { normalizeScreenPath } from '../src/lib/screenName';
import { retryPendingUpload } from '../src/lib/pendingUpload';
import { loadActiveRun, loadCurrentRun } from '../src/lib/runStore';
import { SessionProvider, useSession } from '../src/lib/session';
import {
  decideCrashRecoveryNavigation,
  type InterruptedRunSnapshot,
} from '../src/mvp/run/crashRecovery';
import {
  BOOT_STORAGE_TIMEOUT_MS,
  decideBoot,
  type InterruptedRunProbe,
  splashCovers,
  type TokenProbe,
  tokenProbe,
} from '../src/features/boot/bootSequence';
import { SplashE00 } from '../src/features/boot/SplashE00';
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
import '../src/mvp/run/registerBackgroundTask';

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

/**
 * E00 « Splash / restauration de session » — LE CHEF D'ORCHESTRE (spec l.547).
 *
 * Il ne CALCULE rien : la décision est PURE et testée
 * (`src/features/boot/bootSequence.ts`), le rendu est à part
 * (`src/features/boot/SplashE00.tsx`). Ce composant ne fait que les brancher aux
 * trois choses qu'il est seul à pouvoir observer — les fontes, la session
 * Supabase, le buffer de course sur le disque — et poser la couverture.
 *
 * ─── POURQUOI ICI, ET PAS DANS UNE ROUTE `app/index.tsx` ────────────────────
 * Parce que la route `/` EXISTE DÉJÀ : c'est `app/(tabs)/index.tsx` (la carte),
 * `(tabs)` étant un groupe de routes sans segment d'URL. Créer `app/index.tsx`
 * ferait DEUX fichiers pour le même chemin — un conflit de routes expo-router,
 * pas un écran de plus. E00 n'est de toute façon pas une destination : c'est ce
 * qui couvre l'app pendant que la destination se décide. Le layout racine, seul
 * composant monté avant TOUTE route, est donc exactement le bon endroit.
 *
 * ─── POURQUOI UNE COUVERTURE, ET PAS UN `return` ANTICIPÉ ──────────────────
 * Le `<Stack>` reste MONTÉ sous le splash. C'est délibéré : les deux effets de
 * `RootLayout` (lien d'invitation via `getInitialURL`, reprise de course)
 * appellent `router.push` — sur un routeur démonté ces intentions se perdraient
 * en silence, et un QR scanné au lancement ne ferait rien. Le splash est donc un
 * calque OPAQUE en `absoluteFill` posé APRÈS les enfants : rien de ce qui se
 * monte dessous n'est visible, y compris l'écran de connexion.
 *
 * ─── LE CRITÈRE DE LA SPEC (l.577), TENU STRUCTURELLEMENT ──────────────────
 * « Aucun flash de l'écran de connexion lorsqu'une session valide existe. »
 * `session.loading` vaut `true` AU PREMIER RENDU dès qu'un backend est configuré
 * (`src/lib/session.tsx:37` — `useState(isSupabaseConfigured)`), donc
 * `token === 'reading'`, donc `splashCovers(...)` est vrai avant même que le
 * routeur ait tranché quoi que ce soit ; la couverture ne se lève qu'une fois le
 * sort de la session CONNU. C'est ce que figent les tests « ANTI-FLASH » de
 * `bootSequence.test.ts` — une capture d'écran, elle, ne pourrait pas prouver
 * l'ABSENCE d'un flash (elle échantillonne un instant, et pas celui-là).
 */
function BootGate({ fontsReady, children }: { fontsReady: boolean; children: ReactNode }) {
  const { session, loading, configured } = useSession();
  // ÉTAPE 3 de la spec — verdict du buffer de course. `'reading'` tant qu'on n'a
  // pas lu : « un chargement n'affirme rien sur le joueur ».
  const [interruptedRun, setInterruptedRun] = useState<InterruptedRunProbe>('reading');
  // Le relais a-t-il été passé ? Empêche à la fois la double navigation et la
  // levée du splash AVANT que l'intention de navigation soit émise — sans quoi
  // on verrait la carte une fraction de seconde avant la reprise de course.
  const [handedOff, setHandedOff] = useState(false);

  // ── ÉTAPE 3 : lire le buffer, une seule fois, au lancement FROID ──────────
  useEffect(() => {
    let alive = true;
    const settle = (probe: InterruptedRunProbe): void => {
      if (alive) setInterruptedRun(probe);
    };
    // PLAFOND DE PATIENCE : un AsyncStorage qui ne répond jamais ne doit pas
    // pouvoir tenir le joueur devant le logo (« jamais de spinner infini »).
    // Au-delà on conclut « rien à reprendre » — le choix SÛR : la trace reste
    // sur le disque et `course-live` la repropose au prochain GO.
    const bail = setTimeout(() => settle('none'), BOOT_STORAGE_TIMEOUT_MS);
    void (async () => {
      try {
        const [active, current] = await Promise.all([loadActiveRun(), loadCurrentRun()]);
        // Décision PURE et déjà testée (crashRecovery.ts) — non dupliquée ici.
        const decision = decideCrashRecoveryNavigation(
          [toRecoverySnapshot(active), toRecoverySnapshot(current)],
          Date.now(),
        );
        settle(decision.shouldNavigate ? 'resumable' : 'none');
      } catch {
        settle('none'); // stockage illisible : rien à reprendre, jamais de crash
      } finally {
        clearTimeout(bail);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(bail);
    };
  }, []);

  // ÉTAPE 1 — le token, décidé par le moteur PUR et non plus par un ternaire
  // écrit ici. `loading` couvre AUSSI le refresh silencieux d'un token expiré
  // (supabase-js, `autoRefreshToken: true`) : on n'en voit que le verdict.
  // Le ternaire local était le second exemplaire d'une règle dont
  // `bootSequence.ts` portait déjà l'énoncé : les tests anti-flash figeaient
  // l'énoncé, pas ce qui s'exécutait.
  const token: TokenProbe = tokenProbe({ configured, loading, hasSession: session !== null });
  const outcome = decideBoot({
    token,
    // ÉTAPE 2 — la lecture du profil minimal EXISTE désormais
    // (`features/setup/minimalProfile.ts` interroge `user_profiles`), mais elle
    // n'est PAS un blocage de CETTE séquence, et c'est délibéré : elle est
    // portée par la garde de route `app/(tabs)/_layout.tsx`, qui est la seule à
    // savoir qu'en faire (E08 ou la carte). La lui faire attendre ici la
    // dupliquerait — et le joueur ne verrait aucune différence, la garde
    // couvrant sa propre attente avec CE MÊME écran E00 (`SplashE00`).
    // `'unwired'` reste donc exact pour la séquence de démarrage : elle ne lit
    // pas le profil, elle ne bloque pas dessus, elle ne promet rien.
    profile: 'unwired',
    interruptedRun,
    // ÉTAPE 4 — aucune source de version minimale n'existe, et il n'existe aucun
    // écran de blocage vers lequel router (voir `MinVersionProbe`).
    minVersion: 'unwired',
  });

  // ── ÉTAPE 5 : le SEUL routage que ce composant s'autorise ────────────────
  // Le fork onboarding / connexion / carte appartient à `(tabs)/_layout.tsx` et
  // n'est PAS dupliqué ici (deux sources de vérité sur la même décision
  // divergeraient) ; le splash garantit seulement qu'il ne s'applique qu'APRÈS
  // les étapes 1-4.
  const ready = outcome.phase === 'ready';
  const next = outcome.phase === 'ready' ? outcome.next : null;
  useEffect(() => {
    // ⚠️ `fontsReady` EST une condition de navigation, pas seulement d'affichage.
    // Ce composant ne rend `children` — donc le `<Stack>` — que si les fontes
    // sont là (voir le `return` plus bas). Tant qu'elles ne le sont pas, AUCUN
    // navigateur n'est monté, et un `router.push` lève « Attempted to navigate
    // before mounting the Root Layout ».
    //
    // Le cas se produisait pour de bon : la séquence de démarrage peut conclure
    // « reprendre la course » AVANT la fin du chargement des polices. Résultat,
    // tout démarrage à froid avec une course interrompue plantait l'app — sur
    // le chemin même qui existe pour ne jamais perdre une course. Reproduit le
    // 03/08/2026 en preview, sur `/` comme sur une URL directe.
    if (!ready || handedOff || !fontsReady) return;
    // « Activité active retrouvée : aller directement à la récupération. »
    if (next === 'recover_run') router.push('/course-live');
    setHandedOff(true);
  }, [ready, next, handedOff, fontsReady]);

  // Fontes NIGHT PRINT prêtes avant TOUTE route : jamais de flash de la police
  // système ensuite remplacée. Le splash, lui, est rendu dès le premier frame —
  // il réserve la place du wordmark et ne le révèle qu'une fois la fonte là.
  const covering = !fontsReady || splashCovers(outcome) || !handedOff;
  return (
    <View style={styles.bootRoot}>
      {fontsReady ? children : null}
      {covering ? <SplashE00 logoReady={fontsReady} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    track(EVENTS.appOpen);
    // AMENDEMENT-15 §2 : une fin de course restée hors-ligne est renvoyée
    // silencieusement à chaque lancement (idempotent par clientRunId, D14).
    void retryPendingUpload();
    // ⚠ LA REPRISE APRÈS CRASH N'EST PLUS DÉCLENCHÉE ICI (E00, 27/07/2026).
    // Elle vivait dans cet effet à dépendances vides, donc AU MONTAGE — c'est-
    // à-dire en COURSE avec la restauration de session : l'étape 3 de la spec
    // E00 (« restaurer une activité interrompue ») pouvait partir AVANT
    // l'étape 1 (« lire le token local »), et son `router.push` courait contre
    // le `<Redirect>` de `(tabs)/_layout.tsx`, qui remplace la pile entière.
    // Elle est désormais ORDONNÉE par `<BootGate>` (plus bas), qui ne la
    // déclenche qu'une fois le token lu, et toujours UNE SEULE fois au
    // lancement FROID — jamais au retour au premier plan (l'AppState listener
    // ci-dessous ne fait QUE `retryPendingUpload`) : une course RÉELLEMENT en
    // cours reste sur son écran `course-live`, et la reproposer à chaque retour
    // arracherait le joueur de SA PROPRE course pour la lui « redécouvrir ».
    // Le module de décision (`mvp/run/crashRecovery.ts`) et l'écran de
    // reprise (`course-live` / `RestoreRunCard`, qui refait sa PROPRE
    // réconciliation des deux clés ACTIVE/CURRENT) sont INCHANGÉS.
    //
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

  // ATTENTE DES FONTES — plus de `return` anticipé sur un fond noir NU.
  //
  // Ce retour rendait un `<View>` vide, donc SANS `SessionProvider` : la
  // restauration de session ne COMMENÇAIT même pas tant que les fontes
  // n'étaient pas là (l'étape 1 de E00 sérialisée derrière un chargement de
  // police), et l'écran de démarrage n'avait ni logo ni indicateur — E00
  // n'était pas rendu, il était SUBI. Désormais le provider est monté dès le
  // premier frame (la lecture du token part immédiatement) et `<BootGate>`
  // porte les deux attentes derrière LE splash E00. `useAppFonts` rend `true`
  // même en cas d'échec (fallback système) : cette attente ne peut pas être
  // infinie.
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavAnalytics />
        <StatusBar style="light" />
        {/* La frontière d'erreur n'est PAS ici : elle enveloppe ce layout entier
            (export `ErrorBoundary` en tête de fichier), donc plus haut que ce
            JSX. Voir le commentaire de l'export. */}
        <BootGate fontsReady={fontsReady}>
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
            {/* E13 « Recherche de lieu » (spec l.926) : poussée par-dessus
                l'onglet Carte, qui reste monté derrière — c'est ce qui permet au
                choix d'un lieu de CADRER la carte (placeFocus) sans la remonter. */}
            <Stack.Screen name="map/search" />
          </Stack>
        </BootGate>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  /**
   * Conteneur du `<BootGate>` : les enfants (le `<Stack>`) remplissent, le
   * splash E00 se pose PAR-DESSUS en `absoluteFill`. Fond au token — jamais un
   * `#000` en dur, jamais un blanc : même pendant un frame, l'app reste GRYD.
   */
  bootRoot: { flex: 1, backgroundColor: colors.noir },
});
