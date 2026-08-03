/**
 * GRYD — le chiffre le plus regardé du jeu ne s'affiche pas à tort (lot M3).
 *
 * C'est le nombre que le joueur retient, annonce à son crew et met dans une
 * carte de partage. Une erreur ici se propage hors de l'app.
 */
import { FINE_ESPACE, heroArea } from './area';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${JSON.stringify(expected)}\n  obtenu  : ${JSON.stringify(actual)}`);
  }
}

Deno.test('les milliers sont groupés, en partant de la DROITE', () => {
  assertEquals(heroArea(1), '1');
  assertEquals(heroArea(999), '999');
  assertEquals(heroArea(1_000), `1${FINE_ESPACE}000`);
  assertEquals(heroArea(12_400), `12${FINE_ESPACE}400`);
  assertEquals(heroArea(128_400), `128${FINE_ESPACE}400`);
  assertEquals(heroArea(1_240_000), `1${FINE_ESPACE}240${FINE_ESPACE}000`);
});

Deno.test('le séparateur est une espace FINE INSÉCABLE, pas une espace ordinaire', () => {
  // Une espace ordinaire couperait « 12 400 » en fin de ligne : le joueur
  // lirait « 12 » sur une ligne et « 400 » sur la suivante.
  assertEquals(FINE_ESPACE, ' ');
  assertEquals(heroArea(12_400)?.includes(' '), false);
});

Deno.test('l’unité n’est PAS incluse — elle vient de l’i18n et se peint plus petite', () => {
  assertEquals(heroArea(12_400)?.includes('m'), false);
});

Deno.test('les m² restent des m² à TOUTES les échelles (L12)', () => {
  // Aucun basculement en km² : changer d'unité ferait sauter le chiffre le plus
  // regardé du jeu au moment même où le joueur commence à comparer.
  assertEquals(heroArea(999_999), `999${FINE_ESPACE}999`);
  assertEquals(heroArea(5_000_000), `5${FINE_ESPACE}000${FINE_ESPACE}000`);
});

Deno.test('zéro ne s’affiche PAS : l’état vide invite, il ne compte pas', () => {
  // « 0 m² » en géant est un échec mis en scène. L8 veut une invitation.
  assertEquals(heroArea(0), null);
});

Deno.test('rien d’aberrant ne devient un chiffre', () => {
  for (const v of [null, -1, -0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assertEquals(heroArea(v), null, `valeur ${String(v)}`);
  }
});

Deno.test('les fractions de m² sont ARRONDIES, jamais tronquées à l’affichage', () => {
  // Le moteur produit une aire géodésique flottante. Tronquer perdrait un m²
  // au hasard entre deux écrans qui lisent la même valeur.
  assertEquals(heroArea(12_399.6), `12${FINE_ESPACE}400`);
  assertEquals(heroArea(0.4), null);
  assertEquals(heroArea(0.6), '1');
});
