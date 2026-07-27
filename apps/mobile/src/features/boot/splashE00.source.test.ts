/**
 * GRYD — GARDE-FOUS DE SOURCE pour E00 (spec l.549-577).
 *
 * `SplashE00.tsx` et le `<BootGate>` de `app/_layout.tsx` sont du JSX : ils ne
 * peuvent pas être montés sous Deno (aucun React ici, c'est la règle du gate
 * `test:mobile`). Or ce qu'ils portent est EXACTEMENT ce qu'une retouche
 * distraite casse en silence — un slogan rajouté « pour meubler », une couleur
 * en dur, un `600` recopié à la main, ou le splash déplacé AVANT les enfants,
 * ce qui le ferait passer DERRIÈRE eux et rendrait l'écran de connexion visible.
 *
 * On lit donc la SOURCE, comme le fait déjà `features/social/activityScoping.
 * test.ts` pour ses requêtes. Un tripwire de source ne prouve pas le rendu ; il
 * prouve qu'une propriété structurelle n'a pas disparu. C'est précisément le
 * genre de preuve qu'une capture d'écran ne peut pas donner.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

/** Source d'un fichier du dépôt, commentaires RETIRÉS (la prose n'est pas du code). */
async function code(relPath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relPath, import.meta.url));
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

// ── « aucun slogan » ────────────────────────────────────────────────────────
Deno.test('E00 — le splash ne rend AUCUN texte hors le wordmark GRYD', async () => {
  const src = await code('./SplashE00.tsx');
  const texts = [...src.matchAll(/<Text[^>]*>([\s\S]*?)<\/Text>/g)].map((m) => m[1].trim());
  assert(texts.length > 0, 'le wordmark doit exister');
  assertEquals(
    texts,
    ['GRYD'],
    'spec l.551 : « aucun slogan ». Le seul texte peint est le logo, ' +
      'invariant de marque — tout autre libellé est un ajout non spécifié.',
  );
});

// ── charte : zéro couleur hors tokens ───────────────────────────────────────
Deno.test('E00 — aucune couleur en dur dans le splash (tokens uniquement)', async () => {
  const src = await code('./SplashE00.tsx');
  const literals = [...src.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((m) => m[0]);
  assertEquals(
    literals,
    [],
    'toute couleur vient de packages/shared/src/design-tokens.ts — ' +
      `trouvé : ${literals.join(', ')}`,
  );
});

// ── le seuil de 600 ms ne se recopie pas à la main ──────────────────────────
Deno.test('E00 — le seuil de l’indicateur vient de game-rules, jamais d’un littéral', async () => {
  const src = await code('./SplashE00.tsx');
  assert(
    src.includes('SPLASH_INDICATOR_DELAY_MS'),
    'le splash doit consommer la constante partagée',
  );
  assert(
    !/\b600\b/.test(src),
    'aucun 600 en dur : « aucun nombre magique », la valeur vit dans game-rules.ts',
  );
});

// ── LE CRITÈRE ANTI-FLASH, DANS LA STRUCTURE DU JSX ─────────────────────────
Deno.test('E00 — le splash est un calque OPAQUE en absoluteFill', async () => {
  const src = await code('./SplashE00.tsx');
  assert(
    src.includes('StyleSheet.absoluteFillObject'),
    'le splash doit COUVRIR, pas s’insérer dans un flux (sinon il ne masque rien)',
  );
  assert(
    /backgroundColor:\s*colors\.noir/.test(src),
    'fond OPAQUE au token --gryd-bg : c’est lui qui rend invisible ce qui est monté dessous',
  );
});

Deno.test('E00 — le splash est rendu APRÈS les enfants (donc AU-DESSUS)', async () => {
  // En React Native, l'ordre du JSX EST l'ordre de peinture entre frères. Si le
  // splash passait avant `children`, il serait peint DESSOUS : l'écran de
  // connexion redeviendrait visible et le critère l.577 tomberait — sans qu'un
  // seul type ne bronche.
  const src = await code('../../../app/_layout.tsx');
  const childrenAt = src.indexOf('{fontsReady ? children : null}');
  const splashAt = src.indexOf('<SplashE00');
  assert(childrenAt >= 0, 'le BootGate doit rendre ses enfants');
  assert(splashAt >= 0, 'le BootGate doit rendre le splash E00');
  assert(
    childrenAt < splashAt,
    'le splash DOIT être le dernier frère : au-dessus du <Stack>, jamais dessous',
  );
});

Deno.test('E00 — plus aucun écran de démarrage nu dans le layout racine', async () => {
  const src = await code('../../../app/_layout.tsx');
  // L'ancien `if (!fontsReady) return <View .../>` rendait un fond noir SANS
  // logo ni indicateur, et surtout SANS SessionProvider : l'étape 1 de E00 ne
  // démarrait qu'après le chargement des polices.
  assert(
    !/if\s*\(\s*!fontsReady\s*\)\s*\{?\s*return/.test(src),
    'l’attente des fontes passe par <BootGate>/<SplashE00>, plus par un retour anticipé',
  );
  const providerAt = src.indexOf('<SessionProvider>');
  const gateAt = src.indexOf('<BootGate');
  assert(providerAt >= 0 && gateAt > providerAt, 'le BootGate lit la session : il vit DEDANS');
});

// ── l'ordre de la spec n'est pas contourné dans le layout ───────────────────
Deno.test('E00 — la reprise de course ne repart pas d’un effet au montage', async () => {
  const src = await code('../../../app/_layout.tsx');
  const gateAt = src.indexOf('function BootGate');
  const pushAt = src.indexOf("router.push('/course-live')");
  assert(pushAt >= 0, 'la reprise doit toujours exister');
  assert(
    pushAt > gateAt && gateAt >= 0,
    'la navigation de reprise (étape 3) appartient au BootGate, qui la retient ' +
      'jusqu’à ce que le token soit lu (étape 1) — la remettre dans un useEffect ' +
      'de RootLayout rétablirait la course entre les deux',
  );
});
