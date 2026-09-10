/**
 * GRYD — UN DÉCOR SE TAIT, ET IL SE TAIT DANS LA BONNE LANGUE.
 *
 * ─── LE DÉFAUT MESURÉ (10/09/2026) ──────────────────────────────────────────
 * Plusieurs `<Svg>` portaient `accessible={false}` pour dire « je suis un
 * décor ». Sur le web, cette prop n'arrive JAMAIS à destination : elle atterrit
 * en attribut DOM inventé et le navigateur répond « Received `false` for a
 * non-boolean attribute `accessible` ». Deux faits, tous les deux vérifiables
 * dans `node_modules` (§ ÉTAPE 0 ci-dessous) :
 *
 *   1. `react-native-svg/lib/module/web/utils/prepare.js` NE FILTRE PAS : il
 *      étale `...rest` sur l'élément SVG du DOM. Une prop inconnue passe.
 *   2. `react-native-web/dist/modules/createDOMProps/index.js` tient la liste
 *      `_excluded` des props d'accessibilité qu'il TRADUIT (aria-*). Elle
 *      contient `aria-hidden`. Elle ne contient ni `accessible`, ni
 *      `accessibilityElementsHidden`, ni `importantForAccessibility`.
 *
 * Conséquence contre-intuitive, et c'est tout l'objet de ce test : remplacer
 * `accessible={false}` par le couple « natif » `accessibilityElementsHidden` +
 * `importantForAccessibility` REPRODUIT le défaut sous un autre nom — deux
 * attributs DOM inventés au lieu d'un. Sur un `<Svg>`, la seule orthographe qui
 * arrive vraiment est `aria-hidden`.
 *
 * Rien ne se perd côté natif : un SVG sans libellé n'est pas un élément
 * d'accessibilité (iOS n'en fait un que si `accessible` est VRAI), et quand
 * l'icône porte un libellé la prop reste posée — mais gardée par
 * `Platform.OS === 'web'`, comme `GrydMark` le faisait déjà seul.
 *
 * Ce test est TEXTUEL parce que la chose à protéger est une orthographe dans du
 * JSX : ni Deno ni le typage ne peuvent monter un arbre React ici.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const MOBILE = new URL('../../', import.meta.url);

/** Tous les .tsx de l'app mobile (écrans `app/` compris). */
async function* sources(dir: URL): AsyncGenerator<{ path: string; src: string }> {
  for await (const entry of Deno.readDir(dir)) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const child = new URL(`${entry.name}${entry.isDirectory ? '/' : ''}`, dir);
    if (entry.isDirectory) yield* sources(child);
    else if (entry.name.endsWith('.tsx')) {
      yield { path: child.pathname.slice(MOBILE.pathname.length), src: await Deno.readTextFile(child) };
    }
  }
}

/**
 * Les props d'une balise `<Svg …>`, brutes. On s'arrête au premier `>` qui ne
 * suit pas un `=` : les flèches `=>` d'un `onPress` ne coupent donc pas la
 * balise en deux. Approximation assumée, et suffisante pour ce que l'on cherche
 * (des noms de props, jamais des expressions).
 */
function svgTags(src: string): string[] {
  const tags: string[] = [];
  for (let i = src.indexOf('<Svg'); i !== -1; i = src.indexOf('<Svg', i + 1)) {
    const next = src[i + 4];
    if (next !== ' ' && next !== '>' && next !== '\n') continue; // <SvgXml, <SvgUri…
    let end = i + 4;
    while (end < src.length && !(src[end] === '>' && src[end - 1] !== '=')) end += 1;
    tags.push(src.slice(i, end));
  }
  return tags;
}

async function allTags(): Promise<{ path: string; tag: string }[]> {
  const found: { path: string; tag: string }[] = [];
  for await (const file of sources(MOBILE)) {
    for (const tag of svgTags(file.src)) found.push({ path: file.path, tag });
  }
  return found;
}

/** Là où le vrai comportement est écrit — présent dès qu'on a installé l'app. */
function installed(...candidates: string[]): URL | null {
  for (const candidate of candidates) {
    const url = new URL(candidate, MOBILE);
    try {
      Deno.statSync(url);
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

const RNSVG = installed(
  'node_modules/react-native-svg/lib/module/web/utils/prepare.js',
  '../../node_modules/react-native-svg/lib/module/web/utils/prepare.js',
);
const RNW = installed(
  'node_modules/react-native-web/dist/modules/createDOMProps/index.js',
  '../../node_modules/react-native-web/dist/modules/createDOMProps/index.js',
);

Deno.test({
  name: 'ÉTAPE 0 : react-native-svg n’enlève rien avant le DOM',
  // Ignoré (et DIT) plutôt que faussement vert quand les dépendances ne sont
  // pas installées : ce test parle du comportement réel d'une bibliothèque.
  ignore: RNSVG === null,
  fn: async () => {
    const prepare = await Deno.readTextFile(RNSVG!);
    assert(prepare.includes('...rest'), 'prepare() ne relaie plus les props inconnues — la garde ci-dessous est à revoir');
    assert(
      !prepare.includes('accessible'),
      'prepare() connaît maintenant `accessible` : vérifier ce qu’il en fait avant de rouvrir la prop',
    );
  },
});

Deno.test({
  name: 'ÉTAPE 0 : react-native-web ne traduit QUE aria-hidden, pas les props natives',
  ignore: RNW === null,
  fn: async () => {
    const dom = await Deno.readTextFile(RNW!);
    const excluded = dom.slice(dom.indexOf('var _excluded = ['), dom.indexOf('];', dom.indexOf('var _excluded = [')));
    assert(excluded.includes('"aria-hidden"'), 'createDOMProps ne traduit plus aria-hidden — tout ce fichier est à refaire');
    assert(dom.includes("domProps['aria-hidden']"), 'aria-hidden n’atteint plus le DOM');
    for (const orpheline of ['accessibilityElementsHidden', 'importantForAccessibility', 'accessible=']) {
      assert(
        !dom.includes(orpheline),
        `react-native-web sait désormais lire « ${orpheline} » : cette prop peut revenir sur un <Svg>`,
      );
    }
    // `accessible` (et non `accessibility…`) est bien un inconnu pour lui : le
    // mot entier n'apparaît nulle part dans le fichier.
    assert(!/\baccessible\b/.test(dom), 'createDOMProps intercepte maintenant `accessible` : le défaut d’origine n’existe plus');
  },
});

Deno.test('aucun <Svg> ne pose `accessible` sans garde de plateforme', async () => {
  const offenders = (await allTags())
    .filter(({ tag }) => /\baccessible\s*=/.test(tag))
    .filter(({ tag }) => !tag.includes("Platform.OS === 'web' ? undefined"));
  assertEquals(
    offenders.map((o) => o.path),
    [],
    'sur le web, `accessible` devient un attribut DOM inventé — le garder demande la garde de GrydMark',
  );
});

Deno.test('aucun <Svg> ne pose les deux props natives que le web ne sait pas lire', async () => {
  const offenders = (await allTags())
    .filter(({ tag }) => /accessibilityElementsHidden|importantForAccessibility/.test(tag))
    .map((o) => o.path);
  assertEquals(offenders, [], 'ces deux props n’existent pas dans createDOMProps : elles reproduisent le défaut sous un autre nom');
});

Deno.test('les décors nommés par l’audit disent `aria-hidden`, et le disent seuls', async () => {
  const decors = [
    'src/features/onboarding/DiscoverySonar2026.tsx',
    'src/features/onboarding/DiscoveryLoop2026.tsx',
    'src/features/onboarding/Discovery2026Screen.tsx',
    'src/features/refonte/SeasonJourneyScreen.tsx',
  ];
  const tags = await allTags();
  for (const decor of decors) {
    const mine = tags.filter((t) => t.path === decor);
    assert(mine.length > 0, `${decor} n’a plus de <Svg> — la liste de l’audit est périmée`);
    assert(
      mine.some((t) => /\baria-hidden\b/.test(t.tag)),
      `${decor} : le décor ne se déclare plus muet pour le lecteur d’écran`,
    );
  }
});

Deno.test('un dessin sans libellé est un décor ; avec un libellé, il s’annonce', async () => {
  // Les trois SVG qui PEUVENT porter un nom accessible. Ils gardent `accessible`
  // pour le natif (c'est elle qui en fait un élément annoncé) et le retirent du
  // web, où elle n'arriverait qu'en attribut inventé.
  for (const primitive of ['src/ui/gryd/GrydIcon.tsx', 'src/ui/gryd/RewardEmblem.tsx']) {
    const src = await Deno.readTextFile(new URL(primitive, MOBILE));
    assert(
      src.includes("accessible={Platform.OS === 'web' ? undefined : !!accessibilityLabel}"),
      `${primitive} : sans la garde de plateforme, chaque montage crie une fois sur le web`,
    );
    assert(
      src.includes('aria-hidden={accessibilityLabel ? undefined : true}'),
      `${primitive} : un dessin sans nom accessible se masque, il ne se devine pas`,
    );
    assert(src.includes('aria-label={accessibilityLabel}'), `${primitive} : un dessin nommé garde son nom sur le web`);
  }
  // `GrydMark` portait la garde AVANT ce lot — c'est elle qui a servi de preuve
  // que le défaut était connu ; si elle disparaît, la démonstration tombe.
  const mark = await Deno.readTextFile(new URL('src/ui/gryd/GrydMark.tsx', MOBILE));
  assert(mark.includes("Platform.OS === 'web' ? undefined"), 'GrydMark a perdu la garde qui a mis le défaut en évidence');
});
