/**
 * GRYD — ce qu'on ne sait pas lire n'est jamais peint « à peu près » (lot M3).
 *
 * La colonne `geometry` est du `jsonb` que la base ne vérifie pas. Ces tests
 * portent donc sur des lignes que personne n'écrira volontairement mais que la
 * base accepte : un Polygon sans sommets, une latitude à 91, un anneau de deux
 * points, une aire NaN. Chacune produirait, sans garde-fou, soit une forme
 * fausse, soit une disparition silencieuse.
 */
import {
  parsePolygonRings,
  toTerritoryGeo,
  type TerritoryRow,
} from './territoryGeo';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

/** Un carré valide autour de Rouen, écrit FERMÉ comme la base le stocke. */
const CARRE = {
  type: 'Polygon',
  coordinates: [
    [
      [1.0993, 49.4431],
      [1.1003, 49.4431],
      [1.1003, 49.4441],
      [1.0993, 49.4441],
      [1.0993, 49.4431],
    ],
  ],
};

function ligne(patch: Partial<TerritoryRow> = {}): TerritoryRow {
  return { id: 't1', geometry: CARRE, area_m2: 5_000, ...patch };
}

// ─── Lire ce qui est lisible ────────────────────────────────────────────────

Deno.test('un Polygon fermé se lit, et reste fermé SANS sommet dupliqué', () => {
  const anneaux = parsePolygonRings(CARRE);
  assert(anneaux !== null, 'polygone valide refusé');
  assertEquals(anneaux?.length, 1);
  const a = anneaux![0];
  // 4 sommets distincts + la fermeture = 5. Pas 6 : réapposer un point déjà
  // présent créerait un segment de longueur nulle que MapLibre peut refuser de
  // trianguler — la forme disparaîtrait sans un message d'erreur.
  assertEquals(a.length, 5);
  assertEquals(a[0][0], a[a.length - 1][0]);
  assertEquals(a[0][1], a[a.length - 1][1]);
});

Deno.test('un anneau OUVERT en base est fermé à la lecture', () => {
  const ouvert = {
    type: 'Polygon',
    coordinates: [[[1, 49], [1.001, 49], [1.001, 49.001]]],
  };
  const anneaux = parsePolygonRings(ouvert);
  assertEquals(anneaux?.[0].length, 4);
  assertEquals(anneaux?.[0][3][0], 1);
});

Deno.test('les TROUS sont conservés', () => {
  // N'en garder que l'extérieur peindrait une surface que le joueur n'a pas.
  const troue = {
    type: 'Polygon',
    coordinates: [
      CARRE.coordinates[0],
      [[1.0995, 49.4433], [1.0997, 49.4433], [1.0997, 49.4435], [1.0995, 49.4433]],
    ],
  };
  assertEquals(parsePolygonRings(troue)?.length, 2);
});

// ─── Refuser ce qui ne se lit pas ───────────────────────────────────────────

Deno.test('rien de ce qui n’est pas un Polygon exploitable ne passe', () => {
  const refus: unknown[] = [
    null,
    undefined,
    'Polygon',
    42,
    {},
    { type: 'Point', coordinates: [1, 49] },
    { type: 'Polygon' },
    { type: 'Polygon', coordinates: [] },
    { type: 'Polygon', coordinates: 'oups' },
    { type: 'Polygon', coordinates: [null] },
  ];
  for (const v of refus) {
    assertEquals(parsePolygonRings(v), null, `accepté à tort : ${JSON.stringify(v)}`);
  }
});

Deno.test('un anneau de moins de 3 sommets distincts n’enferme aucune surface', () => {
  // Un segment peint en « territoire » serait une forme inventée.
  assertEquals(parsePolygonRings({ type: 'Polygon', coordinates: [[[1, 49], [1.001, 49]]] }), null);
  // …y compris déguisé en anneau fermé de 3 entrées (2 sommets + la fermeture).
  assertEquals(
    parsePolygonRings({ type: 'Polygon', coordinates: [[[1, 49], [1.001, 49], [1, 49]]] }),
    null,
  );
});

Deno.test('une coordonnée hors du monde est refusée, pas ramenée dans les bornes', () => {
  // Ramener 91 à 90 déplacerait un territoire de plusieurs kilomètres sans
  // qu'aucune ligne de log ne le dise.
  const hors = [
    [[1, 91], [1.001, 49], [1.001, 49.001]],
    [[181, 49], [1.001, 49], [1.001, 49.001]],
    [[Number.NaN, 49], [1.001, 49], [1.001, 49.001]],
    [['1', 49], [1.001, 49], [1.001, 49.001]],
  ];
  for (const anneau of hors) {
    assertEquals(parsePolygonRings({ type: 'Polygon', coordinates: [anneau] }), null, JSON.stringify(anneau));
  }
});

// ─── La lecture d'ensemble : jamais de moitié peinte ────────────────────────

Deno.test('zéro ligne est un SUCCÈS vide — le seul cas où l’écran peut le dire', () => {
  const r = toTerritoryGeo([]);
  assertEquals(r.kind, 'ok');
  if (r.kind !== 'ok') return;
  assertEquals(r.ownedCount, 0);
  assertEquals(r.areaM2, 0);
  assertEquals(r.collection.features.length, 0);
});

Deno.test('des lignes lisibles donnent leurs formes ET la somme de leurs aires', () => {
  const r = toTerritoryGeo([ligne(), ligne({ id: 't2', area_m2: 12_000 })]);
  assertEquals(r.kind, 'ok');
  if (r.kind !== 'ok') return;
  assertEquals(r.ownedCount, 2);
  assertEquals(r.areaM2, 17_000);
  assertEquals(r.collection.features[0].id, 't1');
});

Deno.test('UNE seule ligne illisible fait échouer TOUTE la lecture', () => {
  // Peindre les 2 lisibles en taisant la 3ᵉ montrerait moins de territoire qu'il
  // n'y en a : une sous-déclaration silencieuse, invisible y compris pour nous.
  const r = toTerritoryGeo([ligne(), ligne({ id: 't2' }), ligne({ id: 't3', geometry: null })]);
  assertEquals(r.kind, 'failed');
  if (r.kind !== 'failed') return;
  assertEquals(r.unreadable, 1);
});

Deno.test('une AIRE aberrante compte comme illisible, au même titre qu’une forme', () => {
  // Un chiffre faux est pire qu'une forme manquante : c'est lui que le joueur
  // retient, annonce à son crew et partage.
  for (const aire of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    const r = toTerritoryGeo([ligne({ area_m2: aire })]);
    assertEquals(r.kind, 'failed', `aire ${String(aire)} acceptée`);
  }
});

Deno.test('l’échec dit COMBIEN de lignes sont corrompues', () => {
  // Sans ce compte, l'échec serait indiscernable d'une panne réseau et personne
  // ne saurait qu'il y a des données à réparer.
  const r = toTerritoryGeo([
    ligne({ id: 'a', geometry: {} }),
    ligne({ id: 'b' }),
    ligne({ id: 'c', geometry: { type: 'Polygon', coordinates: [] } }),
  ]);
  assertEquals(r.kind, 'failed');
  if (r.kind !== 'failed') return;
  assertEquals(r.unreadable, 2);
});

// ─── Le TRACÉ suit les points, il ne les redresse pas ───────────────────────

Deno.test('le tracé conserve CHAQUE sommet — aucune ligne droite de substitution', () => {
  // Ce que le coureur reconnaît comme sa sortie, c'est la ligne qui épouse les
  // rues. Simplifier ici dessinerait un raccourci que personne n'a couru : à
  // travers un pâté de maisons, un fleuve, une voie ferrée.
  const sinueux = {
    type: 'Polygon',
    coordinates: [[
      [1.0993, 49.4431], [1.0995, 49.4432], [1.0996, 49.4434], [1.0994, 49.4436],
      [1.0991, 49.4437], [1.0989, 49.4435], [1.0990, 49.4432], [1.0993, 49.4431],
    ]],
  };
  const r = toTerritoryGeo([{ id: 't1', geometry: sinueux, area_m2: 9_000 }]);
  assertEquals(r.kind, 'ok');
  if (r.kind !== 'ok') return;
  const anneau = r.trace.features[0]!.geometry.coordinates[0]!;
  // 7 sommets distincts + la fermeture. Un seul point perdu et la ligne
  // couperait un virage.
  assertEquals(anneau.length, 8);
});

Deno.test('le TRACÉ et la SURFACE sont deux choses (ADR-010)', () => {
  // `toTerritoryGeo` rend les deux ; l'appelant remplace la surface par celle
  // dérivée des cellules et GARDE le tracé. Les confondre était tout le sujet.
  const r = toTerritoryGeo([ligne()]);
  assertEquals(r.kind, 'ok');
  if (r.kind !== 'ok') return;
  assert(r.trace.features.length > 0, 'aucun tracé rendu');
  assertEquals(r.trace.features.length, r.collection.features.length);
});
