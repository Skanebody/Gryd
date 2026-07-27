/**
 * GRYD — tests de la séquence de démarrage E00 (`bootSequence.ts`).
 *
 * Ces tests figent DEUX choses que rien ne protégeait avant :
 *  1. l'ORDRE des cinq étapes de la spec (l.562-567) ;
 *  2. le CRITÈRE de la spec (l.577) — « aucun flash de l'écran de connexion
 *     lorsqu'une session valide existe » — sous une forme VÉRIFIABLE. Une
 *     capture d'écran headless ne peut pas montrer un flash (elle échantillonne
 *     un instant, et justement pas celui-là) ; la preuve est donc STRUCTURELLE :
 *     tant que la sonde du token vaut `'reading'`, `decideBoot` rend
 *     `phase: 'reading'`, donc `splashCovers` est vrai, donc aucune surface
 *     routable n'est visible. Et le tout premier rendu vaut FORCÉMENT `'reading'`
 *     dès qu'un backend existe (`initialTokenProbe`).
 *
 * ⚠️ CE QUI MANQUAIT À CE FICHIER JUSQU'AU 27/07/2026, ET QUI LE RENDAIT FAUX.
 * `initialTokenProbe` n'était appelée NULLE PART dans le runtime : `session.tsx`
 * portait son propre `useState(isSupabaseConfigured)` et `app/_layout.tsx` son
 * propre ternaire. Les deux tests « ANTI-FLASH » validaient donc un duplicata —
 * repasser `session.tsx` à `useState(false)` aurait ramené le flash de l'écran
 * de connexion en laissant toute cette suite verte. Le runtime consomme
 * désormais `initialTokenProbe` / `tokenProbe`, et la section « BRANCHEMENT
 * RÉEL » en bas de ce fichier RELIT les deux sources pour que ça le reste. Sans
 * elle, les tests ci-dessous ne prouveraient toujours rien sur l'app.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SPLASH_INDICATOR_DELAY_MS } from '@klaim/shared';
import {
  BOOT_STEPS,
  type BootInput,
  decideBoot,
  initialTokenProbe,
  shouldShowBootIndicator,
  splashCovers,
  type TokenProbe,
  tokenProbe,
} from './bootSequence.ts';

/** Démarrage NOMINAL résolu : token lu, rien à reprendre. */
function input(overrides: Partial<BootInput> = {}): BootInput {
  return {
    token: 'valid',
    profile: 'unwired',
    interruptedRun: 'none',
    minVersion: 'unwired',
    ...overrides,
  };
}

// ── L'ordre de la spec est le tableau, et le tableau est l'ordre ────────────
Deno.test('BOOT_STEPS — exactement les 5 étapes de la spec, dans son ordre', () => {
  assertEquals(BOOT_STEPS, ['token', 'profile', 'interrupted_run', 'min_version', 'route']);
});

Deno.test('decideBoot — le token bloque AVANT tout le reste (étape 1)', () => {
  // Tout est en cours en même temps (cas réel : les lectures sont parallèles).
  // C'est la PREMIÈRE étape de la spec qui doit être rapportée.
  const out = decideBoot(input({ token: 'reading', profile: 'reading', interruptedRun: 'reading' }));
  assertEquals(out, { phase: 'reading', blockingStep: 'token' });
});

Deno.test('decideBoot — le profil bloque avant la reprise de course (étape 2 avant 3)', () => {
  const out = decideBoot(input({ profile: 'reading', interruptedRun: 'reading' }));
  assertEquals(out, { phase: 'reading', blockingStep: 'profile' });
});

Deno.test('decideBoot — la lecture du buffer de course bloque (étape 3)', () => {
  const out = decideBoot(input({ interruptedRun: 'reading' }));
  assertEquals(out, { phase: 'reading', blockingStep: 'interrupted_run' });
});

// ── LE DÉFAUT CORRIGÉ : la reprise ne part JAMAIS avant que le token soit lu ─
Deno.test(
  'decideBoot — une course reprenable NE déclenche RIEN tant que le token est en lecture',
  () => {
    // Avant ce module, `app/_layout.tsx` poussait /course-live dans un effet au
    // MONTAGE, donc potentiellement avant la restauration de session : l'étape 3
    // doublait l'étape 1. Ici, `recover_run` est structurellement inatteignable
    // tant que `token === 'reading'`.
    const out = decideBoot(input({ token: 'reading', interruptedRun: 'resumable' }));
    assertEquals(out.phase, 'reading');
  },
);

Deno.test('decideBoot — token lu + course reprenable → récupération de course', () => {
  assertEquals(decideBoot(input({ interruptedRun: 'resumable' })), {
    phase: 'ready',
    next: 'recover_run',
  });
});

Deno.test('decideBoot — reprise même sans session (le buffer est LOCAL)', () => {
  // Une trace GPS survit sur le disque du téléphone, pas dans le compte : ne pas
  // être connecté n'est pas une raison de jeter la sortie du joueur.
  assertEquals(decideBoot(input({ token: 'none', interruptedRun: 'resumable' })), {
    phase: 'ready',
    next: 'recover_run',
  });
});

Deno.test('decideBoot — rien à reprendre → routage normal (aucun détour)', () => {
  assertEquals(decideBoot(input()), { phase: 'ready', next: 'continue' });
});

Deno.test('decideBoot — sans backend (O1), le démarrage se résout immédiatement', () => {
  const out = decideBoot(input({ token: initialTokenProbe(false) }));
  assertEquals(out, { phase: 'ready', next: 'continue' });
});

// ── ÉTAPE 4 : non câblée, et surtout NON BLOQUANTE ──────────────────────────
Deno.test('decideBoot — une version minimale non vérifiable ne retient personne', () => {
  // Il n'existe aujourd'hui aucune source de version minimale, et aucun écran de
  // blocage (E77 est « Confidentialité et sécurité » dans cette même spec). Ne
  // pas savoir vérifier ne doit pas geler le lancement.
  assertEquals(decideBoot(input({ minVersion: 'unwired' })).phase, 'ready');
  assertEquals(decideBoot(input({ minVersion: 'supported' })).phase, 'ready');
});

// ── CRITÈRE DE LA SPEC — preuve structurelle de l'absence de flash ──────────
Deno.test(
  'ANTI-FLASH — avec un backend, le TOUT PREMIER rendu est couvert par le splash',
  () => {
    // `initialTokenProbe(true)` n'imite plus `SessionProvider` : c'est LA
    // fonction dont `src/lib/session.tsx` dérive son `loading` initial (garde
    // « BRANCHEMENT » en bas de ce fichier). Aucune autre valeur n'est donc
    // atteignable au premier rendu quand un backend est configuré.
    const first = decideBoot({
      token: initialTokenProbe(true),
      profile: 'unwired',
      interruptedRun: 'reading',
      minVersion: 'unwired',
    });
    assert(splashCovers(first), 'le splash doit couvrir le premier rendu');
    assertEquals(first, { phase: 'reading', blockingStep: 'token' });
  },
);

Deno.test('ANTI-FLASH — le splash ne se lève que sur un verdict de session', () => {
  // Exhaustif sur TokenProbe : la seule valeur qui laisse le splash en place est
  // `'reading'`. Donc lever le splash IMPLIQUE que le sort de la session est
  // connu — un écran de connexion ne peut apparaître qu'après une réponse
  // « pas de session », jamais pendant l'ignorance.
  assertEquals(splashCovers(decideBoot(input({ token: 'reading' }))), true);
  assertEquals(splashCovers(decideBoot(input({ token: 'valid' }))), false);
  assertEquals(splashCovers(decideBoot(input({ token: 'none' }))), false);
});

Deno.test('ANTI-FLASH — session valide : on ne passe jamais par un état « pas de session »', () => {
  // Le chemin complet d'un joueur déjà connecté, rendu par rendu.
  const timeline: BootInput[] = [
    { token: 'reading', profile: 'unwired', interruptedRun: 'reading', minVersion: 'unwired' },
    { token: 'reading', profile: 'unwired', interruptedRun: 'none', minVersion: 'unwired' },
    { token: 'valid', profile: 'unwired', interruptedRun: 'none', minVersion: 'unwired' },
  ];
  const outcomes = timeline.map(decideBoot);
  assertEquals(
    outcomes.map(splashCovers),
    [true, true, false],
    'le splash couvre tant que le token n’a pas répondu, et se lève exactement à sa réponse',
  );
  assertEquals(outcomes[2], { phase: 'ready', next: 'continue' });
});

// ── Indicateur discret : 600 ms, pas avant ─────────────────────────────────
Deno.test('shouldShowBootIndicator — rien avant le seuil de la spec', () => {
  assertEquals(shouldShowBootIndicator(0), false);
  assertEquals(shouldShowBootIndicator(SPLASH_INDICATOR_DELAY_MS - 1), false);
});

Deno.test('shouldShowBootIndicator — visible à partir du seuil (inclus)', () => {
  assertEquals(shouldShowBootIndicator(SPLASH_INDICATOR_DELAY_MS), true);
  assertEquals(shouldShowBootIndicator(SPLASH_INDICATOR_DELAY_MS + 5_000), true);
});

Deno.test('shouldShowBootIndicator — horloge absurde : on n’affiche rien', () => {
  assertEquals(shouldShowBootIndicator(-1), false);
  assertEquals(shouldShowBootIndicator(Number.NaN), false);
  assertEquals(shouldShowBootIndicator(Number.POSITIVE_INFINITY), false);
});

Deno.test('SPLASH_INDICATOR_DELAY_MS — vaut bien les 600 ms de la spec', () => {
  assertEquals(SPLASH_INDICATOR_DELAY_MS, 600);
});

// ═══════════════════════════════════════════════════════════════════════════
// LE BRANCHEMENT RÉEL — sans cette section, tout ce qui précède ne prouve rien
// ═══════════════════════════════════════════════════════════════════════════
// Une fonction pure parfaitement testée qu'aucun code d'app n'appelle est une
// maquette. Ces trois tests relisent les DEUX fichiers de runtime qui décident
// réellement de la sonde du token, et refusent qu'ils recalculent la règle dans
// leur coin. Ils relisent la SOURCE (au lieu d'importer, ce qui tirerait React
// et supabase-js dans Deno) — même patron que le garde de pureté de
// `shareTargets.test.ts` et que `drift_test.ts` côté Edge Functions.

const SESSION_SRC = Deno.readTextFileSync(new URL('../../lib/session.tsx', import.meta.url));
const LAYOUT_SRC = Deno.readTextFileSync(new URL('../../../app/_layout.tsx', import.meta.url));

Deno.test('BRANCHEMENT — session.tsx dérive son `loading` initial d’initialTokenProbe', () => {
  assert(
    SESSION_SRC.includes("from '../features/boot/bootSequence'"),
    'session.tsx n’importe plus bootSequence : la sonde du premier rendu est redevenue un duplicata',
  );
  assert(
    /useState<boolean>\(\s*initialTokenProbe\(isSupabaseConfigured\) === 'reading',?\s*\)/.test(
      SESSION_SRC,
    ),
    'session.tsx ne dérive plus son état initial d’initialTokenProbe — les tests ANTI-FLASH ' +
      'ci-dessus ne diraient alors plus rien de l’app (c’est exactement le défaut corrigé le 27/07/2026)',
  );
});

Deno.test('BRANCHEMENT — app/_layout.tsx dérive sa sonde de tokenProbe, pas d’un ternaire local', () => {
  assert(
    LAYOUT_SRC.includes('tokenProbe({ configured, loading, hasSession: session !== null })'),
    '_layout.tsx ne passe plus par tokenProbe : la règle est réécrite ailleurs',
  );
  assert(
    !/const token: TokenProbe = loading \?/.test(LAYOUT_SRC),
    '_layout.tsx a retrouvé son ternaire local — deux énoncés de la même règle',
  );
});

Deno.test('tokenProbe — les trois valeurs, et rien d’autre', () => {
  // Sans backend (O1) : rien à restaurer, donc rien à attendre — quoi que
  // rapporte le provider (il ne s'abonne même pas).
  assertEquals(tokenProbe({ configured: false, loading: false, hasSession: false }), 'none');
  assertEquals(tokenProbe({ configured: false, loading: true, hasSession: true }), 'none');
  // Avec backend : le chargement gagne sur tout — « un chargement n'affirme rien ».
  assertEquals(tokenProbe({ configured: true, loading: true, hasSession: false }), 'reading');
  assertEquals(tokenProbe({ configured: true, loading: true, hasSession: true }), 'reading');
  // Lecture finie : le verdict, et lui seul.
  assertEquals(tokenProbe({ configured: true, loading: false, hasSession: true }), 'valid');
  assertEquals(tokenProbe({ configured: true, loading: false, hasSession: false }), 'none');
});

Deno.test('initialTokenProbe n’est qu’un cas particulier de tokenProbe (un seul énoncé)', () => {
  for (const configured of [true, false]) {
    const expected: TokenProbe = tokenProbe({
      configured,
      // Au tout premier rendu : `SessionProvider` part en chargement dès qu'il y
      // a un backend, et n'a JAMAIS de session en main (elle n'est pas restaurée).
      loading: configured,
      hasSession: false,
    });
    assertEquals(initialTokenProbe(configured), expected);
  }
});
