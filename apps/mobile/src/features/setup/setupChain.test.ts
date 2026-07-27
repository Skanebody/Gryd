/**
 * GRYD — TRIPWIRES DE SOURCE du parcours de premier usage.
 *
 * Les trois écrans `/setup/*` et la garde de `app/(tabs)/_layout.tsx` sont du
 * JSX : ils ne peuvent pas être montés sous Deno (aucun React dans le gate
 * `test:mobile`). Or ce qu'ils portent est exactement ce qu'une retouche
 * distraite casse en silence — un `NEXT_STEP` qui pointe vers une route qui
 * n'existe pas (l'écran « Unmatched route » d'expo-router), une garde de route
 * supprimée qui rendrait E08 INATTEIGNABLE, ou l'oubli du marquage serveur qui
 * renverrait le joueur dans le formulaire qu'il vient de valider.
 *
 * On lit donc la SOURCE, comme le font déjà `boot/splashE00.source.test.ts` et
 * `social/activityScoping.test.ts`. Un tripwire de source ne prouve pas le
 * rendu ; il prouve qu'une propriété structurelle n'a pas disparu — et c'est
 * précisément le genre de preuve qu'une capture d'écran ne peut pas donner.
 *
 * ⚠️ Le piège classique de ce dépôt est évité ici par construction : l'audit
 * fait en shell avec `grep -E` rendait des faux positifs en masse parce que
 * POSIX ERE ne connaît pas la classe `\s`. Tout est fait en JS/Deno, où `\s`
 * est correct.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SETUP_CHAIN, SETUP_ENTRY, SETUP_EXIT } from './firstRun.ts';

const APP_DIR = new URL('../../../app/', import.meta.url);

/** Source d'un fichier du dépôt, commentaires RETIRÉS (la prose n'est pas du code). */
async function code(relFromApp: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relFromApp, APP_DIR));
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Toutes les routes que le dossier `app/` sert RÉELLEMENT, dérivées des
 * fichiers comme le fait expo-router : les segments de groupe `(auth)`/`(tabs)`
 * disparaissent de l'URL, `index` se replie sur son parent, et les variantes de
 * plateforme (`.web.tsx`) servent la même route.
 */
async function servedRoutes(): Promise<Set<string>> {
  const routes = new Set<string>();
  async function walk(dir: URL, prefix: string[]): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory) {
        await walk(new URL(`${entry.name}/`, dir), [...prefix, entry.name]);
        continue;
      }
      if (!entry.name.endsWith('.tsx')) continue;
      if (/^_layout\.(web\.)?tsx$/.test(entry.name)) continue;
      const base = entry.name.replace(/\.(web|native|ios|android)\.tsx$/, '').replace(/\.tsx$/, '');
      const segs = [...prefix, base].filter((s) => !/^\(.+\)$/.test(s));
      if (segs[segs.length - 1] === 'index') segs.pop();
      routes.add('/' + segs.join('/'));
    }
  }
  await walk(APP_DIR, []);
  return routes;
}

/** Le `const NEXT_STEP = '…'` déclaré par un écran (null s'il n'y en a pas). */
function nextStepOf(src: string): string | null {
  const m = src.match(/const\s+NEXT_STEP\s*=\s*'([^']+)'/);
  return m ? m[1] : null;
}

/** Fichier de route qui sert un chemin du parcours (`/setup/profile` → `setup/profile.tsx`). */
function fileFor(route: string): string {
  return `${route.replace(/^\//, '')}.tsx`;
}

// ═══ 1. LA CHAÎNE EST COMPLÈTE, DANS L'ORDRE, ET SANS TROU ═════════════════

Deno.test('chaque écran du parcours nomme le SUIVANT de la chaîne', async () => {
  for (let i = 0; i < SETUP_CHAIN.length - 1; i++) {
    const src = await code(fileFor(SETUP_CHAIN[i]));
    assertEquals(
      nextStepOf(src),
      SETUP_CHAIN[i + 1],
      `${SETUP_CHAIN[i]} doit enchaîner sur ${SETUP_CHAIN[i + 1]} — sinon le ` +
        'parcours a un trou, et le joueur tombe sur « Unmatched route »',
    );
  }
});

Deno.test('le DERNIER écran du parcours sort sur le produit, pas sur un écran de plus', async () => {
  const last = SETUP_CHAIN[SETUP_CHAIN.length - 1];
  const src = await code(fileFor(last));
  assertEquals(nextStepOf(src), SETUP_EXIT, `${last} est la sortie : il rend la main à la carte`);
});

Deno.test('toutes les routes du parcours EXISTENT sur le disque', async () => {
  const routes = await servedRoutes();
  for (const route of [...SETUP_CHAIN, SETUP_EXIT]) {
    assert(routes.has(route), `aucun fichier ne sert ${route} — le lien serait mort`);
  }
});

// ═══ 2. AUCUN LIEN MORT DEPUIS LES ÉCRANS DU PARCOURS ══════════════════════

Deno.test('aucune navigation du parcours ne vise une route inexistante', async () => {
  const routes = await servedRoutes();
  const dead: string[] = [];
  for (const route of SETUP_CHAIN) {
    const src = await code(fileFor(route));
    // `router.push('/x')`, `router.replace('/x')`, `href="/x"`, `href={'/x'}`.
    const targets = [
      ...src.matchAll(/router\.(?:push|replace|navigate)\(\s*'([^']+)'/g),
      ...src.matchAll(/href=(?:"|\{')([^"']+)(?:"|'\})/g),
      ...src.matchAll(/const\s+NEXT_STEP\s*=\s*'([^']+)'/g),
    ].map((m) => m[1]);
    for (const target of targets) {
      if (!target.startsWith('/')) continue;
      if (!routes.has(target.split('?')[0])) dead.push(`${route} → ${target}`);
    }
  }
  assertEquals(dead, [], `liens morts : ${dead.join(', ')}`);
});

// ═══ 3. LA PORTE EXISTE — E08 N'EST PAS UNE ROUTE ORPHELINE ════════════════

Deno.test('la garde de route mène RÉELLEMENT au premier écran du parcours', async () => {
  const src = await code('(tabs)/_layout.tsx');
  // On exige la NAVIGATION, pas la simple présence du symbole : un import resté
  // en place au-dessus d'une redirection supprimée laisserait passer le test
  // alors que la route serait redevenue orpheline (vérifié par mutation).
  assert(
    /href=\{\s*SETUP_ENTRY\s*\}/.test(src),
    `sans cette redirection, ${SETUP_ENTRY} n'a AUCUN lien entrant : la route ` +
      'existe mais rien ne peut y conduire — une route orpheline',
  );
  assert(
    src.includes('decideFirstRun'),
    'la destination doit venir de la décision PURE et testée, pas d’un `if` recopié',
  );
  assert(
    src.includes('useMinimalProfile'),
    'le drapeau se LIT (user_profiles) — il ne se devine pas depuis le stockage local',
  );
});

Deno.test('la garde ne tranche pas pendant la lecture : elle couvre avec l’écran E00', async () => {
  const src = await code('(tabs)/_layout.tsx');
  assert(
    /firstRun\s*===\s*'wait'/.test(src) && src.includes('<SplashE00'),
    '« lecture en cours » doit rendre une surface qui n’affirme rien — jamais un ' +
      'verdict, jamais un écran blanc',
  );
});

// ═══ 4. LE VERDICT SERVEUR EST POSÉ, SINON LE PARCOURS BOUCLE ══════════════

Deno.test('E08 marque le profil comme fait une fois le serveur ACQUITTÉ', async () => {
  const src = await code('setup/profile.tsx');
  assert(
    src.includes('markMinimalProfileDone('),
    'sans ce marquage, la garde relirait son verdict précédent (« absent ») à la ' +
      'sortie de E10 et renverrait le joueur dans le formulaire qu’il vient de valider',
  );
  // Le marquage doit vivre APRÈS le contrôle d'erreur d'écriture : le poser
  // avant reviendrait à déclarer fait ce qui n'a pas abouti.
  const errorCheck = src.indexOf('if (written.error) throw written.error;');
  const mark = src.indexOf('markMinimalProfileDone(');
  assert(errorCheck >= 0, 'le contrôle d’erreur d’écriture doit exister');
  assert(mark > errorCheck, 'on ne marque jamais « fait » avant l’acquittement du serveur');
});

// ═══ 5. E08 NE CONCLUT JAMAIS SANS QUE LE SERVEUR AIT ÉCRIT ════════════════
// Le défaut trouvé le 27/07/2026 : `submit()` enveloppait l'écriture dans
// `if (client && userId) { … }`. Sans backend (O1) ou sans session, la branche
// était SAUTÉE et le code continuait — `track(setup_profile_completed)` puis
// `router.replace('/setup/activity')`. Le CTA chartreuse avait l'air d'avoir
// réussi, et le @handle n'était réservé nulle part.

Deno.test('E08 n’ouvre pas un formulaire qu’aucun serveur ne peut enregistrer', async () => {
  const src = await code('setup/profile.tsx');
  assert(
    /if\s*\(!configured\s*\|\|\s*session === null\)\s*return\s*<Redirect\s+href="\/"\s*\/>;/.test(
      src,
    ),
    'sans backend ni session, E08 doit rendre <Redirect href="/" /> — peindre le CTA ' +
      'ici est le bouton mort de §2, et pire : un bouton qui a l’air de réussir ' +
      '(même patron que app/(auth)/email.tsx)',
  );
  assert(
    /if\s*\(sessionLoading\)\s*return/.test(src),
    'la restauration de session EN COURS ne doit rien affirmer : ni « pas de compte », ' +
      'ni « compte prêt » — elle ne doit surtout pas déclencher la redirection',
  );
});

Deno.test('E08 : plus aucune écriture serveur OPTIONNELLE dans submit()', async () => {
  const src = await code('setup/profile.tsx');
  assert(
    !/if\s*\(client\s*&&\s*userId\)/.test(src),
    'la garde `if (client && userId)` est de retour : elle saute l’écriture ET laisse ' +
      'passer l’event + la navigation, donc l’écran conclut sur une écriture qui n’a pas eu lieu',
  );
  // La navigation et l'event ne doivent être atteignables qu'APRÈS le try/catch
  // qui contient l'écriture — le `return` du catch est ce qui les protège.
  const write = src.indexOf("from('user_profiles')");
  const done = src.indexOf('EVENTS.setupProfileCompleted');
  const nav = src.indexOf('router.replace(NEXT_STEP)');
  assert(write >= 0, 'l’écriture sur user_profiles doit exister');
  assert(done > write, 'l’event de complétion ne peut pas précéder l’écriture');
  assert(nav > done, 'la navigation ne peut pas précéder l’event de complétion');
  // Sans client ni session, on rend la main AVEC un échec dit — jamais un succès muet.
  assert(
    /if\s*\(!client\s*\|\|\s*userId === null\)\s*\{[\s\S]{0,200}?setSaveError\(/.test(src),
    'submit() doit dire l’échec quand il n’a ni client ni session, au lieu de continuer',
  );
});
