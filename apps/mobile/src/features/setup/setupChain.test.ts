/**
 * GRYD — LA CHAÎNE DE PREMIER USAGE, PROUVÉE SUR LA SOURCE.
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT ROUGE ═══════════════════════════════════════════
 * Ce fichier vérifiait jusqu'ici que les trois écrans `/setup/*` sortaient tous
 * sur « / ». C'était vrai, et ça masquait le vrai défaut : AUCUNE navigation de
 * l'app ne nommait ces routes. Trois écrans corrects, injoignables, pendant que
 * tout compte neuf gardait le pseudo `runner_5f3a91c0…` posé par la migration
 * 0154 — sans que rien ne lui propose jamais d'en choisir un. Un test peut être
 * vert et surveiller la mauvaise propriété.
 *
 * Il surveille maintenant ce qui compte : la chaîne est NOMMÉE une fois
 * (`SETUP_NEXT`), chaque écran nomme la même étape suivante, et quelqu'un
 * ENTRE dans cette chaîne — l'écran d'accueil du lien, pour un compte neuf.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SETUP_CHAIN, SETUP_EXIT, SETUP_NEXT } from './firstRun.ts';
import { WELCOME_SETUP_ROUTE } from '../account/welcome2026.ts';

const APP_DIR = new URL('../../../app/', import.meta.url);

async function code(rel: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(rel, APP_DIR));
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('chaque écran de premier usage nomme l’étape suivante de la table', async () => {
  for (const route of SETUP_CHAIN) {
    const src = await code(`${route.slice(1)}.tsx`);
    const expected = SETUP_NEXT[route];
    assert(
      src.includes(`const NEXT_STEP = '${expected}'`),
      `${route} doit enchaîner sur ${expected}`,
    );
  }
});

Deno.test('la chaîne se termine sur la carte, et ne boucle jamais', () => {
  let step: string = SETUP_CHAIN[0];
  const seen = new Set<string>();
  for (let guard = 0; guard < SETUP_CHAIN.length + 1; guard += 1) {
    if (step === SETUP_EXIT) break;
    assertEquals(seen.has(step), false, `boucle détectée sur ${step}`);
    seen.add(step);
    const next: string | undefined = SETUP_NEXT[step as (typeof SETUP_CHAIN)[number]];
    assert(next !== undefined, `${step} n’a pas de suite déclarée`);
    step = next;
  }
  assertEquals(step, SETUP_EXIT, 'le parcours doit rendre la main à la carte');
});

Deno.test('quelqu’un ENTRE dans la chaîne : l’accueil d’un compte neuf', async () => {
  assertEquals(WELCOME_SETUP_ROUTE, SETUP_CHAIN[0]);
  const welcome = await Deno.readTextFile(
    new URL('../account/AccountWelcome2026.tsx', import.meta.url),
  );
  assert(
    welcome.includes('welcomeDestination2026'),
    'l’accueil doit router par la règle PURE, jamais par un littéral',
  );
});

/**
 * LES DEUX ARRIVÉES RENDENT LE MÊME ACCUEIL. C'est la garde qui empêche Apple
 * de redevenir un parcours à part : jusqu'au 12/09/2026, « Continuer avec
 * Apple » ouvrait la session et la porte de compte renvoyait sur la carte, si
 * bien que personne venu par Apple ne lisait « Félicitations » ni ne se voyait
 * proposer un pseudo. Deux chemins d'inscription, deux expériences.
 */
Deno.test('le lien e-mail et Apple accueillent avec le MÊME composant', async () => {
  for (const route of ['(auth)/callback.tsx', '(auth)/bienvenue.tsx']) {
    const src = await code(route);
    assert(src.includes('AccountWelcome2026'), `${route} doit rendre l’accueil partagé`);
  }
  const entry = await Deno.readTextFile(
    new URL('../account/AuthEntry2026.tsx', import.meta.url),
  );
  assert(
    entry.includes("router.replace('/bienvenue')"),
    'une connexion par fournisseur natif doit passer par l’accueil, pas sauter à la carte',
  );
});

Deno.test('la navigation principale ne bloque plus la carte sur un profil incomplet', async () => {
  const src = await code('(tabs)/_layout.tsx');
  assertEquals(src.includes('decideFirstRun'), false);
  assertEquals(src.includes('useMinimalProfile'), false);
  assertEquals(src.includes('SETUP_ENTRY'), false);
});

Deno.test('les écrans de premier usage restent de vraies routes Expo', async () => {
  for (const route of SETUP_CHAIN) {
    const path = new URL(`${route.slice(1)}.tsx`, APP_DIR);
    const stat = await Deno.stat(path);
    assert(stat.isFile);
  }
});

/**
 * E10 reste HORS de la chaîne, et c'est une décision, pas un oubli : la boîte
 * système de localisation se demande au premier GO, là où elle a un bénéfice
 * immédiat. La faire tomber trois écrans avant la première course est
 * exactement le défaut corrigé sur la carte le 21/07/2026.
 */
Deno.test('les permissions ne sont pas une étape de l’inscription', () => {
  assertEquals(SETUP_NEXT['/setup/permissions'], SETUP_EXIT);
  for (const next of Object.values(SETUP_NEXT)) {
    assertEquals(next === '/setup/permissions', false, 'aucun écran n’y pousse');
  }
});
