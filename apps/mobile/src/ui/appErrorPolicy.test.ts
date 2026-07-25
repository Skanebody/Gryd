/**
 * GRYD — « plus jamais de message technique à l'écran », PROUVÉ.
 *
 * Le fondateur a vu « fonts is not defined » écrit par-dessus l'app. Ces tests
 * ne vérifient pas que la copie est jolie : ils vérifient qu'AUCUN chemin de
 * code ne peut remettre un symbole, un fichier ou une pile d'appel devant le
 * joueur en production — et qu'en développement le détail reste, sinon on
 * déboguerait à l'aveugle.
 *
 * Le test central (`FOUNDER_ERROR`) rejoue l'erreur RÉELLEMENT observée, dans
 * les cinq langues. Il échoue à la seconde où quelqu'un recolle `error.message`
 * dans la copie — c'est exactement son rôle.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../i18n/types';
import {
  analyticsErrorName,
  buildAppErrorView,
  buildFatalAlertView,
  classifyAppError,
  technicalDetail,
  type AppErrorView,
} from './appErrorPolicy';

/** L'erreur EXACTE rapportée par le fondateur, pile comprise. */
const FOUNDER_ERROR = (() => {
  const e = new ReferenceError('fonts is not defined');
  e.stack =
    'ReferenceError: fonts is not defined\n' +
    '    at useAppFonts (/Users/benjaminbel/KLAIM RUN/apps/mobile/src/lib/fonts.ts:42:11)\n' +
    '    at RootLayout (/Users/benjaminbel/KLAIM RUN/apps/mobile/app/_layout.tsx:55:23)';
  return e;
})();

/**
 * Jetons qui n'ont RIEN à faire devant un joueur. On ne teste pas des mots
 * vagues (« at », « erreur ») : ils apparaissent légitimement dans de la prose
 * — l'allemand « hat ausgesetzt » contient « at ». On teste les marqueurs
 * réellement techniques.
 */
const FORBIDDEN_TOKENS = [
  'fonts is not defined',
  'ReferenceError',
  'TypeError',
  'undefined',
  '.tsx',
  '.ts:',
  '.js:',
  'stack',
  'Stack',
  '_layout',
  'useAppFonts',
];

/** Les quatre chaînes que l'écran rend réellement. */
function visibleStrings(view: AppErrorView): string[] {
  return [view.title, view.body, view.retryLabel, view.backLabel];
}

Deno.test(
  "l'erreur RÉELLE du fondateur ne fuit jamais à l'écran — 5 langues, production",
  () => {
    for (const locale of LOCALES) {
      const view = buildAppErrorView(FOUNDER_ERROR, locale, false);
      // Le détail technique n'est même pas FABRIQUÉ : l'écran n'a rien à fuiter.
      assertEquals(view.detail, null, `détail technique fourni en prod (${locale})`);
      for (const text of visibleStrings(view)) {
        assert(text.length > 0, `texte vide (${locale})`);
        for (const token of FORBIDDEN_TOKENS) {
          assert(
            !text.includes(token),
            `jeton technique « ${token} » visible en ${locale} : ${text}`,
          );
        }
      }
    }
  },
);

Deno.test('en production, AUCUNE erreur ne produit de détail technique', () => {
  const zoo: unknown[] = [
    FOUNDER_ERROR,
    new TypeError("Cannot read properties of undefined (reading 'map')"),
    new Error('Network request failed'),
    'une chaîne brute',
    { name: 'CustomError', message: 'token=abc123', stack: 'at secret.ts:1' },
    null,
    undefined,
    42,
  ];
  for (const error of zoo) {
    assertEquals(technicalDetail(error, false), null);
    assertEquals(buildAppErrorView(error, 'fr', false).detail, null);
  }
});

Deno.test('en développement, le détail technique reste COMPLET (nom + message + pile)', () => {
  const detail = technicalDetail(FOUNDER_ERROR, true);
  assert(detail !== null, 'le détail doit exister en dev');
  assert(detail.includes('ReferenceError'), 'le nom manque');
  assert(detail.includes('fonts is not defined'), 'le message manque');
  assert(detail.includes('fonts.ts'), 'la pile manque');
});

Deno.test('le détail dev est BORNÉ — une pile géante ne noie pas la tête', () => {
  const huge = new Error('boom');
  huge.stack = `Error: boom\n${'    at frame (a.ts:1:1)\n'.repeat(500)}`;
  const detail = technicalDetail(huge, true);
  assert(detail !== null);
  assert(detail.length <= 1201, `détail non borné : ${detail.length}`);
  // La tête (nom + message) survit toujours à la troncature.
  assert(detail.startsWith('Error: boom'));
});

Deno.test('classification : le joueur n’est accusé de rien qui ne soit vrai', () => {
  // Réseau — il a une action à lui.
  assertEquals(classifyAppError(new Error('Network request failed')), 'network');
  assertEquals(classifyAppError(new Error('Failed to fetch')), 'network');
  assertEquals(
    classifyAppError(new Error('The Internet connection appears to be offline.')),
    'network',
  );
  const aborted = new Error('anything');
  aborted.name = 'AbortError';
  assertEquals(classifyAppError(aborted), 'network');

  // Affichage — l'app seule est en cause. Le cas du fondateur en fait partie :
  // le classer « réseau » enverrait le joueur inspecter son wifi pour rien.
  assertEquals(classifyAppError(FOUNDER_ERROR), 'display');
  assertEquals(classifyAppError(new TypeError('undefined is not a function')), 'display');
  assertEquals(classifyAppError(null), 'display');
});

Deno.test('les deux familles ne disent PAS la même chose', () => {
  const net = buildAppErrorView(new Error('Network request failed'), 'fr', false);
  const disp = buildAppErrorView(FOUNDER_ERROR, 'fr', false);
  assertEquals(net.kind, 'network');
  assertEquals(disp.kind, 'display');
  assertNotEquals(net.title, disp.title);
  assertNotEquals(net.body, disp.body);
});

Deno.test('la copie affirme la NUANCE : un plantage de rendu ne perd pas le territoire', () => {
  // Exigence explicite du chantier : l'écran ne doit rien affirmer de faux sur
  // les données — et doit dire ce qui est vrai (le serveur n'a pas bougé).
  const fr = buildAppErrorView(FOUNDER_ERROR, 'fr', false);
  assert(fr.body.includes('territoires'), 'la nuance territoire manque');
  assert(fr.body.includes('serveur'), 'la nuance serveur manque');
  const en = buildAppErrorView(FOUNDER_ERROR, 'en', false);
  assert(en.body.includes('territories') && en.body.includes('server'));
});

Deno.test('la reprise est RÉELLE dans les 5 langues (deux sorties nommées)', () => {
  for (const locale of LOCALES) {
    const view = buildAppErrorView(FOUNDER_ERROR, locale, false);
    assert(view.retryLabel.trim().length > 0, `réessayer vide (${locale})`);
    assert(view.backLabel.trim().length > 0, `retour carte vide (${locale})`);
    assertNotEquals(view.retryLabel, view.backLabel);
    // §A — libellés de bouton courts, jamais tronqués à 375 px.
    assert(view.retryLabel.length <= 20, `libellé trop long (${locale}) : ${view.retryLabel}`);
    assert(view.backLabel.length <= 24, `libellé trop long (${locale}) : ${view.backLabel}`);
  }
});

Deno.test('journal interne : vocabulaire FERMÉ, le message ne part jamais', () => {
  assertEquals(analyticsErrorName(FOUNDER_ERROR), 'ReferenceError');
  assertEquals(analyticsErrorName(new TypeError('x')), 'TypeError');
  // Un nom arbitraire (classe maison, message serveur recopié) est refermé.
  assertEquals(analyticsErrorName({ name: 'HttpError 500 /users/42', message: 'x' }), 'other');
  assertEquals(analyticsErrorName(null), 'Error');
  // Le nom rendu ne transporte jamais le message.
  const leaky = new Error('token=abc123');
  assert(!analyticsErrorName(leaky).includes('abc123'));
});

Deno.test("l'alerte du filet FATAL suit la même règle que l'écran", () => {
  const prod = buildFatalAlertView(FOUNDER_ERROR, 'fr', false);
  for (const token of FORBIDDEN_TOKENS) {
    assert(!prod.body.includes(token), `jeton « ${token} » dans l'alerte de prod`);
  }
  assert(prod.body.includes('Relance GRYD'), 'aucune reprise proposée');
  assert(prod.title.length > 0 && prod.okLabel.length > 0);

  // En dev, le détail est recollé — sinon un crash au démarrage est muet.
  const dev = buildFatalAlertView(FOUNDER_ERROR, 'fr', true);
  assert(dev.body.includes('fonts is not defined'), 'le détail dev manque');
  assert(dev.body.startsWith(prod.body), 'la copie honnête doit rester en tête');
});
