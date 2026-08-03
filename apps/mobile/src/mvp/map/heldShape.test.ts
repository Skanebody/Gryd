/**
 * GRYD — la forme rétrécit quand on perd des cellules (ADR-010).
 *
 * C'est LE test de la décision : jusqu'ici, un rival pouvait prendre la moitié
 * d'une zone sans que la carte du propriétaire ne bouge d'un pixel, parce
 * qu'elle lisait le polygone de boucle et que celui-ci n'est jamais découpé.
 * L'« étape 0 » ci-dessous prouve d'abord que la forme dépend RÉELLEMENT des
 * cellules — sans elle, les assertions suivantes ne distingueraient pas ce
 * module d'une fonction qui rendrait n'importe quoi.
 */
import { gridDisk, latLngToCell } from 'h3-js';
import { heldCollection, heldShape, toH3Index } from './heldShape';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

/**
 * Un bloc CONTIGU de cellules res 10 autour de Rouen.
 *
 * ⚠️ Construit avec `gridDisk`, pas avec des décalages de latitude. Première
 * version : `lat + i * 0.0009`, en supposant que ~100 m suffisaient à toucher
 * la cellule voisine. Faux — une cellule res 10 fait ~115 m de centre à centre,
 * et les tests d'adjacence échouaient sur MA fixture, pas sur le code. La
 * contiguïté se construit, elle ne se devine pas.
 *
 * `k` est le rayon : 1 → 7 cellules, 2 → 19, 3 → 37.
 */
const CENTRE_ROUEN = latLngToCell(49.4431, 1.0993, 10);
function blocRouen(k: number): { h3index: string }[] {
  return gridDisk(CENTRE_ROUEN, k).map((h) => ({ h3index: h }));
}

/** Une seule cellule, pour les cas qui n'ont pas besoin d'un bloc. */
function uneCellule(): { h3index: string }[] {
  return [{ h3index: CENTRE_ROUEN }];
}

/** Somme des périmètres des anneaux — mesure grossière mais monotone. */
function tailleTotale(rings: [number, number][][]): number {
  let n = 0;
  for (const r of rings) n += r.length;
  return n;
}

// ─── ÉTAPE 0 : la forme dépend RÉELLEMENT des cellules ──────────────────────

Deno.test('ÉTAPE 0 — sans cellule, aucune forme', () => {
  // Si ce cas rendait quand même un contour, tout le reste du fichier ne
  // prouverait rien.
  const r = heldShape([]);
  assertEquals(r.rings.length, 0);
  assertEquals(r.unreadable, 0);
});

Deno.test('ÉTAPE 0 — une cellule donne UN contour fermé', () => {
  const r = heldShape(uneCellule());
  assertEquals(r.rings.length, 1);
  const a = r.rings[0]!;
  assert(a.length >= 4, `contour de ${a.length} sommets`);
  assertEquals(a[0]![0], a[a.length - 1]![0]);
  assertEquals(a[0]![1], a[a.length - 1]![1]);
});

// ─── LE test : perdre des cellules RÉTRÉCIT la forme ────────────────────────

Deno.test('perdre la moitié de ses cellules RÉTRÉCIT la forme', () => {
  // Le défaut d'ADR-010 en une assertion : avec la lecture des polygones de
  // boucle, ces deux formes auraient été IDENTIQUES.
  const avant = heldShape(blocRouen(2)); // 19 cellules
  const apres = heldShape(blocRouen(1)); // 7 — un rival a pris la couronne
  assert(
    tailleTotale(apres.rings) < tailleTotale(avant.rings),
    `la forme n'a pas rétréci : ${tailleTotale(avant.rings)} → ${tailleTotale(apres.rings)}`,
  );
});

Deno.test('des cellules ADJACENTES fusionnent en UN contour organique', () => {
  // C'est ce qui fait une forme de quartier plutôt qu'une grille d'hexagones :
  // le joueur ne doit jamais voir la maille (MASTER §29).
  const r = heldShape(blocRouen(2));
  assertEquals(r.rings.length, 1);
});

Deno.test('des cellules ÉPARSES restent PLUSIEURS contours — et c’est juste', () => {
  // Deux quartiers non contigus SONT deux formes. Les relier dessinerait un
  // territoire qui n'a jamais été couru.
  const loin = [
    { h3index: latLngToCell(49.4431, 1.0993, 10) },
    { h3index: latLngToCell(49.5, 1.3, 10) },
  ];
  assertEquals(heldShape(loin).rings.length, 2);
});

// ─── La conversion BIGINT, là où une trace se perd en silence ───────────────

Deno.test('un h3index BIGINT décimal est converti, pas ignoré', () => {
  // PostgREST rend `h3index` (bigint) en décimal. Le passer tel quel à h3-js
  // ferait disparaître la cellule SANS erreur — territoire amputé, aucun log.
  const hexa = latLngToCell(49.4431, 1.0993, 10);
  const decimal = BigInt('0x' + hexa).toString();
  assertEquals(toH3Index(decimal), hexa);
  assertEquals(toH3Index(BigInt(decimal)), hexa);
  assertEquals(toH3Index(hexa), hexa);
});

Deno.test('un index illisible est ÉCARTÉ et COMPTÉ, jamais deviné', () => {
  // Un index mal converti dessinerait un hexagone à l'autre bout du monde.
  for (const v of ['', 'zzz', '-1', '0']) {
    assertEquals(toH3Index(v), null, `valeur « ${v} »`);
  }
  const r = heldShape([{ h3index: 'zzz' }, ...uneCellule()]);
  assertEquals(r.unreadable, 1);
});

// ─── Ce que la carte reçoit ─────────────────────────────────────────────────

Deno.test('UNE seule feature : ce que je tiens est UNE possession', () => {
  // Une feature par morceau ferait compter des « zones » là où il n'y a que
  // des fragments d'une même propriété.
  const r = heldCollection(blocRouen(2));
  assert(r !== null);
  assertEquals(r?.collection.features.length, 1);
  assert((r?.collection.features[0]?.geometry.coordinates.length ?? 0) >= 1);
});

Deno.test('UNE cellule illisible fait échouer TOUTE la lecture', () => {
  // Même contrat que `toTerritoryGeo` : peindre les lisibles en taisant les
  // autres montrerait moins de territoire qu'il n'y en a.
  assertEquals(heldCollection([{ h3index: 'zzz' }, ...uneCellule()]), null);
});

Deno.test('zéro cellule est un SUCCÈS vide — pas un échec', () => {
  const r = heldCollection([]);
  assert(r !== null);
  assertEquals(r?.collection.features.length, 0);
  assertEquals(r?.cellCount, 0);
});
