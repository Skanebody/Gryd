/**
 * GRYD — E00 « Splash / restauration de session » : LA SÉQUENCE DE DÉMARRAGE,
 * en fonctions PURES (spec produit `GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md`
 * l.547-577, route `/`).
 *
 * ─── CE QUI EXISTAIT DÉJÀ, ET QUE CE MODULE NE REFAIT PAS ───────────────────
 * L'essentiel de la séquence E00 était DÉJÀ dans le dépôt, éparpillé, et
 * fonctionnel. Ce module ne le réécrit pas — il l'ORDONNE :
 *
 *  · lecture du token  → `lib/session.tsx` (`SessionProvider`, `loading` part à
 *    `true` dès que Supabase est configuré) ;
 *  · refresh silencieux du token expiré → `lib/supabase.ts:26`
 *    (`autoRefreshToken: true`, `persistSession: true`) — supabase-js renouvelle
 *    seul, aucun écran ne le voit ;
 *  · décision de reprise d'une course interrompue → `features/run/gps/
 *    crashRecovery.ts` (`decideCrashRecoveryNavigation`, déjà pur, déjà testé) ;
 *  · fork onboarding / connexion / carte → `app/(tabs)/_layout.tsx:100-113`
 *    (une session valide vaut onboarding fait ; drapeau illisible ⇒ /onboarding).
 *
 * ─── CE QUE CE MODULE AJOUTE ────────────────────────────────────────────────
 * L'ORDRE, qui n'existait nulle part. Avant lui, `app/_layout.tsx` déclenchait
 * la reprise de course dans un `useEffect` à dépendances vides, donc AU MONTAGE,
 * en COURSE avec la restauration de session : l'étape 3 de la spec pouvait
 * s'exécuter avant l'étape 1. `decideBoot` scanne les étapes DANS L'ORDRE de la
 * spec et rend la PREMIÈRE qui bloque encore ; tant qu'elle bloque, rien n'est
 * décidé et le splash couvre l'app.
 *
 * ─── POURQUOI PUR (zéro import React / RN / AsyncStorage) ───────────────────
 * Même raison que `crashRecovery.ts` : `deno test --allow-read --allow-env
 * apps/mobile/src` (`npm run test:mobile`) typecheck ce fichier et ses imports.
 * Un seul `import` d'AsyncStorage ou de `react-native` ici casserait le gate
 * pour tout `apps/mobile/src`. Les I/O (session Supabase, buffer de course) et
 * la navigation (expo-router) restent dans `app/_layout.tsx`, qui compose.
 */
import { SPLASH_INDICATOR_DELAY_MS } from '@klaim/shared';

/**
 * Les CINQ étapes de la spec, dans l'ordre qu'elle impose (l.562-567). Cette
 * constante N'EST PAS décorative : `decideBoot` l'itère, donc l'ordre du tableau
 * EST l'ordre appliqué. Réordonner ce tableau change le comportement — et fait
 * échouer les tests qui le figent.
 */
export const BOOT_STEPS = [
  'token', //          1. lire le token local
  'profile', //        2. charger le profil minimal
  'interrupted_run', // 3. restaurer une activité interrompue
  'min_version', //    4. vérifier la version minimale
  'route', //          5. router
] as const;

export type BootStepId = (typeof BOOT_STEPS)[number];

/**
 * ÉTAPE 1 — état de la lecture du token local.
 *
 * `'reading'` : la restauration Supabase est en cours (`session.loading`). On
 * ne sait RIEN du joueur — « un chargement n'affirme rien sur le joueur ».
 * `'none'`    : lecture FINIE, aucune session (ou backend non configuré, O1).
 * `'valid'`   : lecture FINIE, session présente.
 *
 * ⚠ Il n'y a délibérément PAS de valeur `'expired'`. Un token expiré n'est
 * jamais un état observable par cette séquence : `supabase.ts` construit le
 * client avec `autoRefreshToken: true` + `persistSession: true`, donc le
 * renouvellement silencieux exigé par la spec (« token expiré : tenter un
 * refresh silencieux ») se produit À L'INTÉRIEUR de `'reading'`, et la séquence
 * n'en voit que le verdict : `'valid'` (refresh réussi) ou `'none'` (refresh
 * impossible → il faut se reconnecter). Ajouter `'expired'` ici modéliserait un
 * état que le code ne produit pas.
 */
export type TokenProbe = 'reading' | 'none' | 'valid';

/**
 * ÉTAPE 2 — état de la lecture du profil minimal.
 *
 * ⚠ HONNÊTETÉ (mis à jour le 27/07/2026). Une lecture du profil minimal EXISTE
 * désormais : `features/setup/minimalProfile.ts` interroge `public.user_profiles`
 * et `features/setup/firstRun.ts` en tire la porte E08 / carte. Mais elle n'est
 * PAS branchée sur CETTE séquence, et c'est un choix : elle est portée par la
 * garde de route `app/(tabs)/_layout.tsx`, seule à savoir qu'en faire, et cette
 * garde couvre sa propre attente avec le MÊME écran E00 (`SplashE00`) — le
 * joueur ne voit donc aucune couture, et la question n'est posée qu'à un seul
 * endroit.
 *
 * `'unwired'` reste donc EXACT pour la séquence de démarrage : elle ne lit pas
 * le profil et ne bloque pas dessus. `'reading'` / `'ready'` restent sans
 * appelant réel — ils décriront cette étape le jour où elle devrait retenir le
 * splash (par exemple si un profil devenait nécessaire à la reprise de course).
 */
export type ProfileProbe = 'reading' | 'ready' | 'unwired';

/**
 * ÉTAPE 3 — état du buffer de course interrompue (`lib/runStore.ts`), déjà
 * réduit par `crashRecovery.decideCrashRecoveryNavigation`.
 */
export type InterruptedRunProbe = 'reading' | 'none' | 'resumable';

/**
 * ÉTAPE 4 — vérification de la version minimale.
 *
 * ⚠ HONNÊTETÉ, ET C'EST UN REFUS DÉLIBÉRÉ : ce type n'a PAS de valeur
 * `'blocked'`. La spec E00 renvoie une version bloquée vers « E77 » et un
 * incident serveur vers « E76 » (l.574-575) — mais dans CETTE MÊME spec, E76 est
 * « Modifier le profil » (l.2320) et E77 « Confidentialité et sécurité »
 * (l.2338). Il n'existe donc, NI dans la spec NI dans le dépôt, d'écran de
 * blocage de version ou d'incident serveur. Router vers un écran absent est un
 * bouton mort ; inventer ces écrans ici serait pire. Tant qu'ils n'existent pas,
 * le type REND IMPOSSIBLE d'exprimer « bloqué » : le manque est un trou visible,
 * pas une promesse tenue à moitié.
 *
 * `'unwired'` : aucune source de version minimale n'existe (état d'aujourd'hui —
 * ni constante, ni champ serveur, vérifié par grep le 27/07/2026).
 * `'supported'` : réservé au jour où une source existera et répondra « ça va ».
 */
export type MinVersionProbe = 'unwired' | 'supported';

export interface BootInput {
  readonly token: TokenProbe;
  readonly profile: ProfileProbe;
  readonly interruptedRun: InterruptedRunProbe;
  readonly minVersion: MinVersionProbe;
}

/**
 * Verdict de la séquence.
 *
 * `'reading'` — la séquence n'a pas fini : le splash E00 couvre l'app, aucune
 * navigation n'est déclenchée. `blockingStep` dit LAQUELLE des cinq étapes
 * retient encore (utile en debug, et c'est ce que les tests figent).
 *
 * `'ready'` — verdict rendu :
 *   · `'recover_run'` : une activité interrompue mérite d'être reprise → l'app
 *     va DIRECTEMENT à la récupération (spec : « activité active retrouvée :
 *     aller directement à la récupération »), c'est-à-dire `/course-live`, qui
 *     porte déjà `RestoreRunCard` ;
 *   · `'continue'` : rien à reprendre → on laisse le routage normal opérer
 *     (`app/(tabs)/_layout.tsx` : carte, /onboarding ou /sign-in). Ce module ne
 *     duplique PAS ce fork — deux sources de vérité sur la même décision
 *     divergeraient. Il ne fait que garantir qu'il ne s'applique qu'APRÈS les
 *     étapes 1-4.
 */
export type BootOutcome =
  | { readonly phase: 'reading'; readonly blockingStep: BootStepId }
  | { readonly phase: 'ready'; readonly next: 'recover_run' | 'continue' };

/** Une étape donnée retient-elle encore la séquence ? PURE. */
function isStepBlocking(step: BootStepId, input: BootInput): boolean {
  switch (step) {
    case 'token':
      return input.token === 'reading';
    case 'profile':
      return input.profile === 'reading';
    case 'interrupted_run':
      return input.interruptedRun === 'reading';
    case 'min_version':
      // `'unwired'` ne bloque pas : ne pas savoir vérifier une version n'est pas
      // une raison de retenir un joueur devant un logo. Voir MinVersionProbe.
      return false;
    case 'route':
      // L'étape 5 est le verdict lui-même : elle ne « bloque » jamais.
      return false;
  }
}

/**
 * LA séquence E00, PURE. Scanne `BOOT_STEPS` dans l'ordre et rend la première
 * étape encore en cours ; si aucune ne l'est, rend le verdict.
 *
 * L'ordre n'est pas un détail de style : il est la garantie que l'étape 3
 * (reprise de course) ne s'exécute jamais avant l'étape 1 (token). C'était
 * précisément le défaut de `app/_layout.tsx` avant ce module — la reprise
 * partait au montage, en course avec la restauration de session.
 */
export function decideBoot(input: BootInput): BootOutcome {
  for (const step of BOOT_STEPS) {
    if (isStepBlocking(step, input)) return { phase: 'reading', blockingStep: step };
  }
  return {
    phase: 'ready',
    next: input.interruptedRun === 'resumable' ? 'recover_run' : 'continue',
  };
}

/**
 * ─── LE CRITÈRE DE LA SPEC, EN UNE FONCTION ─────────────────────────────────
 * « Aucun flash de l'écran de connexion lorsqu'une session valide existe. »
 *
 * Un flash de /sign-in ne peut se produire QUE si l'app laisse voir une surface
 * routable avant de savoir s'il y a une session. La sonde du token au TOUT
 * PREMIER rendu est donc le seul endroit où ce flash se joue : si elle vaut
 * `'reading'`, `decideBoot` rend `phase: 'reading'` et le splash couvre — donc
 * rien d'autre n'est visible, quoi que fasse le routeur en dessous.
 *
 * ⚠️ CE QUI A CHANGÉ LE 27/07/2026, ET POURQUOI C'ÉTAIT NÉCESSAIRE.
 * `initialTokenProbe` était une RÉÉCRITURE de `lib/session.tsx` : le runtime ne
 * l'appelait nulle part (`app/_layout.tsx` calculait son propre ternaire, et
 * `session.tsx` son propre `useState(isSupabaseConfigured)`). Les tests
 * « ANTI-FLASH » validaient donc une constante locale : passer `session.tsx` à
 * `useState(false)` aurait ramené le flash de l'écran de connexion en gardant
 * la suite verte — l'inverse exact d'une preuve.
 * Les deux fonctions ci-dessous sont désormais les SEULES à décider :
 * `session.tsx` dérive son `loading` initial d'`initialTokenProbe`, et
 * `app/_layout.tsx` dérive sa sonde de `tokenProbe`. `bootSequence.test.ts`
 * RELIT ces deux fichiers pour que ça reste vrai — c'est ce qui rend le
 * tripwire structurel au lieu de décoratif.
 */
export function initialTokenProbe(supabaseConfigured: boolean): TokenProbe {
  // Au TOUT PREMIER rendu il n'y a jamais de session en main : elle n'a pas
  // encore été restaurée. La lecture est donc « en cours » dès qu'il y a un
  // backend, et « aucune » sinon — ce qui est exactement `tokenProbe` appliqué
  // à cet instant-là. Un seul énoncé, pas deux.
  return tokenProbe({
    configured: supabaseConfigured,
    loading: supabaseConfigured,
    hasSession: false,
  });
}

/**
 * ÉTAPE 1, à n'importe quel instant : ce que la sonde du token vaut compte tenu
 * de ce que `SessionProvider` rapporte. PURE.
 *
 * `configured === false` (O1, aucun backend) rend `'none'` sans regarder le
 * reste : il n'y a alors AUCUNE session à restaurer, donc rien à attendre et
 * rien à flasher — la garde de `(tabs)/_layout.tsx` ne redirige pas dans ce cas.
 * Sinon `loading` gagne sur tout (« un chargement n'affirme rien sur le
 * joueur »), et il couvre AUSSI le refresh silencieux d'un token expiré
 * (supabase-js, `autoRefreshToken: true`) : la séquence n'en voit que le
 * verdict.
 */
export function tokenProbe(input: {
  readonly configured: boolean;
  readonly loading: boolean;
  readonly hasSession: boolean;
}): TokenProbe {
  if (!input.configured) return 'none';
  if (input.loading) return 'reading';
  return input.hasSession ? 'valid' : 'none';
}

/**
 * PLAFOND DE PATIENCE de l'étape 3 (lecture du buffer de course, AsyncStorage).
 *
 * « Jamais de spinner infini » : un AsyncStorage qui ne répond JAMAIS (web sur
 * un localStorage verrouillé, quota mort) tiendrait sinon le joueur devant le
 * logo pour toujours, puisque `decideBoot` attend un verdict de l'étape 3.
 * Passé ce délai on conclut `'none'` — « rien à reprendre » — ce qui est le
 * choix SÛR : la trace reste sur le disque et `course-live` la repropose au
 * prochain GO (sa propre réconciliation, inchangée) ; l'inverse aurait envoyé
 * le joueur sur un écran de reprise sans savoir s'il y a quoi que ce soit à
 * reprendre.
 *
 * Aligné sur le précédent du dépôt : `features/onboarding/store.ts:126`
 * (`STORAGE_TIMEOUT_MS = 3000`), même cause, même remède, même ordre de grandeur
 * — ne pas les faire diverger sans raison.
 *
 * Ce n'est PAS une règle de jeu (elle ne décide ni claim, ni point, ni
 * distance) : elle ne vit donc pas dans `game-rules.ts`, exactement comme
 * `CRASH_RECOVERY_MAX_AGE_MS` qui documente la même distinction.
 */
export const BOOT_STORAGE_TIMEOUT_MS = 3_000;

/** Le splash E00 couvre-t-il encore la totalité de l'app ? PURE. */
export function splashCovers(outcome: BootOutcome): boolean {
  return outcome.phase === 'reading';
}

/**
 * L'indicateur discret a-t-il le droit d'apparaître ? PURE.
 *
 * Spec l.550 : « indicateur discret uniquement si le chargement dépasse 600 ms »
 * (`SPLASH_INDICATOR_DELAY_MS`, game-rules). Défensif sur une horloge absurde
 * (valeur non finie ou négative : on n'affiche rien plutôt que de conclure d'un
 * temps qui n'a pas de sens).
 */
export function shouldShowBootIndicator(elapsedMs: number): boolean {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  return elapsedMs >= SPLASH_INDICATOR_DELAY_MS;
}
