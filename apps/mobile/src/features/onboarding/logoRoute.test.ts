/**
 * GRYD — tests du logo couru (le « G » dessiné par un parcours).
 *
 * POURQUOI CES TESTS EXISTENT. L'animation du logo ne peut PAS être vérifiée
 * dans la preview : `document.visibilityState` y vaut "hidden", donc
 * `requestAnimationFrame` produit ZÉRO image par seconde et toute animation
 * pilotée en JS y paraît figée. Mesuré le 21/07/2026 : j'ai cru pendant trois
 * itérations que le tracé était cassé alors que c'était l'instrument de mesure.
 *
 * Ce qui est prouvable sans écran l'est donc ici : la géométrie du parcours, le
 * fait qu'un coureur ne se téléporte jamais, le cap, et le découpage du cycle
 * (tracé puis tenue). Ce qui reste invérifiable — que React Native fasse
 * réellement avancer la valeur animée — est signalé comme tel, pas maquillé.
 */
import {
  assert,
  assertAlmostEquals,
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  LOGO_CX,
  LOGO_CY,
  LOGO_LEN,
  LOGO_ROUTE,
  LOGO_RX,
  LOGO_RY,
  logoDrawProgress,
  logoHeadAt,
  logoHeadingAt,
} from './logoRoute.ts';

// ─── La lettre ───────────────────────────────────────────────────────────────

Deno.test('le G garde les proportions de l’icône (ratio de référence 1,53)', () => {
  // Si ce test casse, le logo de l'accueil et l'icône de l'app ont divergé —
  // c'est arrivé le 21/07/2026, chacun ayant été relevé à l'œil de son côté.
  assertAlmostEquals(LOGO_RX / LOGO_RY, 1.53, 0.03);
});

Deno.test('le parcours est un G : ouvert à droite, barre vers l’intérieur', () => {
  const first = LOGO_ROUTE[0]!;
  const last = LOGO_ROUTE[LOGO_ROUTE.length - 1]!;

  // Départ : haut à droite (au-dessus du centre, à droite du centre).
  assert(first.x > LOGO_CX, 'le tracé part à droite du centre');
  assert(first.y < LOGO_CY, 'le tracé part au-dessus du centre');

  // Arrivée : la barre horizontale, à hauteur du centre, PAS au bord droit —
  // sinon le G se referme en O.
  assertAlmostEquals(last.y, LOGO_CY, LOGO_RY * 0.2);
  assert(last.x > LOGO_CX, 'la barre finit à droite du centre');
  assert(last.x < LOGO_CX + LOGO_RX * 0.6, 'la barre rentre vers l’intérieur');

  // L'ouverture est réelle : départ et arrivée ne se rejoignent pas.
  assert(Math.hypot(last.x - first.x, last.y - first.y) > LOGO_RY * 0.4, 'le G est ouvert');
});

Deno.test('un coureur ne se téléporte jamais : aucun saut dans le tracé', () => {
  let max = 0;
  for (let i = 1; i < LOGO_ROUTE.length; i += 1) {
    const a = LOGO_ROUTE[i - 1]!;
    const b = LOGO_ROUTE[i]!;
    max = Math.max(max, Math.hypot(b.x - a.x, b.y - a.y));
  }
  // Un pas ne doit jamais dépasser quelques unités : au-delà, le trait
  // « saute » et l'illusion du parcours tombe.
  assert(max < 6, `pas maximal ${max.toFixed(2)} — le tracé saute`);
});

Deno.test('la longueur cumulée est cohérente avec la taille de la lettre', () => {
  assert(LOGO_LEN > 2 * LOGO_RX, 'le parcours fait au moins le tour');
  assert(Number.isFinite(LOGO_LEN) && LOGO_LEN > 0);
});

// ─── La tête de course ───────────────────────────────────────────────────────

Deno.test('la tête suit le parcours du début à la fin', () => {
  const start = logoHeadAt(0);
  const end = logoHeadAt(1);
  assertAlmostEquals(start.x, LOGO_ROUTE[0]!.x, 0.01);
  assertAlmostEquals(end.x, LOGO_ROUTE[LOGO_ROUTE.length - 1]!.x, 0.01);
});

Deno.test('la tête avance de façon monotone, sans marche arrière', () => {
  let prev = logoHeadAt(0);
  let travelled = 0;
  for (let i = 1; i <= 200; i += 1) {
    const p = logoHeadAt(i / 200);
    travelled += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  // La distance parcourue en échantillonnant doit approcher la longueur réelle :
  // si la tête reculait ou sautait, la somme divergerait.
  assertAlmostEquals(travelled, LOGO_LEN, LOGO_LEN * 0.02);
});

Deno.test('le cap est défini partout et tourne bien le long de la boucle', () => {
  const caps = [0.1, 0.3, 0.5, 0.7, 0.9].map(logoHeadingAt);
  for (const c of caps) assert(Number.isFinite(c), 'cap non fini');
  // Le parcours fait le tour : les caps ne peuvent pas tous être identiques.
  const spread = Math.max(...caps) - Math.min(...caps);
  assert(spread > 90, `le cap ne tourne pas assez (${spread.toFixed(0)}°)`);
});

Deno.test('la tête reste bornée aux extrémités (pas d’extrapolation)', () => {
  assertEquals(logoHeadAt(-5).x, logoHeadAt(0).x);
  assertEquals(logoHeadAt(9).x, logoHeadAt(1).x);
});

// ─── Le cycle : tracé puis TENUE ─────────────────────────────────────────────

Deno.test('le tracé occupe la première part du cycle, la tenue le reste', () => {
  const draw = 2600;
  const hold = 1500;
  const cycle = draw + hold;

  assertEquals(logoDrawProgress(0, draw, hold), 0);
  // À la fin exacte de la phase de tracé, le G est complet…
  assertAlmostEquals(logoDrawProgress(draw / cycle, draw, hold), 1, 1e-9);
  // …et il le RESTE pendant toute la tenue (c'est ce qui rend le logo lisible
  // avant que la boucle reparte).
  assertEquals(logoDrawProgress(0.9, draw, hold), 1);
  assertEquals(logoDrawProgress(1, draw, hold), 1);
});

Deno.test('la progression du tracé est croissante et jamais hors [0,1]', () => {
  let prev = -1;
  for (let i = 0; i <= 100; i += 1) {
    const v = logoDrawProgress(i / 100, 2600, 1500);
    assert(v >= 0 && v <= 1, `progression hors bornes : ${v}`);
    assert(v >= prev, 'la progression recule');
    prev = v;
  }
});

Deno.test('la courbe part doucement et finit posée (cubique in-out)', () => {
  const draw = 2600;
  const hold = 1500;
  const cycle = draw + hold;
  const at = (frac: number) => logoDrawProgress((frac * draw) / cycle, draw, hold);
  // Au quart du tracé, moins d'un quart est dessiné : le départ est progressif.
  assert(at(0.25) < 0.25, 'le départ n’est pas amorti');
  // Aux trois quarts, plus des trois quarts : la fin ralentit.
  assert(at(0.75) > 0.75, 'l’arrivée n’est pas amortie');
  assertAlmostEquals(at(0.5), 0.5, 1e-9);
});

Deno.test('paramètres dégénérés : aucune division par zéro, aucun NaN', () => {
  assertEquals(logoDrawProgress(0.5, 0, 0), 0);
  assertEquals(logoDrawProgress(0.5, 0, 1000), 0);
  assert(Number.isFinite(logoDrawProgress(0.5, 2600, 0)));
});
