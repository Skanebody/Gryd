/**
 * GRYD — le chiffre héros ne peut pas être fabriqué.
 *
 * ─── CE QUE CE FICHIER GARDE, ET POURQUOI IL A CHANGÉ DE FORME (27/07/2026) ──
 * Il gardait une ABSENCE : `ShareCardFacts` ne portait aucun champ d'aire, et
 * `HERO_METRICS` aucune grandeur d'aire. C'était le bon garde tant que la seule
 * aire atteignable aurait été « compte d'hexagones × aire nominale d'une cellule
 * H3 » — un produit faux à ±20 % selon la latitude.
 *
 * Depuis, le territoire est POLYGONAL : `territories.area_m2` (migration 0074)
 * porte l'aire GÉODÉSIQUE du polygone réel (`polygonAreaM2`, engine/polygon.ts),
 * et le client la LIT pour la course affichée (useResultTerritory.ts). La
 * surface a donc une source ; l'absence n'a plus rien à garder.
 *
 * Ce fichier garde désormais la PROPRIÉTÉ, qui est ce qui comptait vraiment :
 * AUCUNE AIRE INVENTÉE NE PEUT PASSER. Trois barrières, testées ci-dessous :
 *   1. la surface entre en CHAÎNE déjà formatée et ressort à l'identique — le
 *      module n'a aucun nombre d'aire, donc aucune arithmétique d'aire ;
 *   2. aucun COMPTE (zones, défendues, boucle, points) ni aucune mesure ne peut
 *      rendre la surface disponible : seule la surface la rend disponible ;
 *   3. le SOURCE du module ne contient aucun motif « compte × aire nominale »
 *      (aire d'hexagone, facteur km²→m², multiplication d'un compte).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  HERO_METRICS,
  contextParts,
  heroMetricAvailable,
  heroMetricFor,
  heroValueFor,
  knownPlaceName,
  type ShareCardFacts,
} from './cardModel.ts';

const KM = 'km';

/** Course « rien de jugé, rien de mesuré » — la base des surcharges. */
const NOTHING: ShareCardFacts = {
  surfaceValue: '',
  surfaceUnit: '',
  zonesGained: 0,
  zonesDefended: 0,
  loopBonusZones: 0,
  crewPoints: 0,
  rankLabel: null,
  distanceKm: '',
  clockLabel: '',
  crewName: '',
};

function facts(over: Partial<ShareCardFacts> = {}): ShareCardFacts {
  return { ...NOTHING, ...over };
}

/** Une surface RÉELLEMENT lue (ce que `formatArea` rend depuis `area_m2`). */
const LUE = { surfaceValue: '0,42', surfaceUnit: 'km²' } as const;

Deno.test('la liste des grandeurs est close — pas de porte dérobée', () => {
  assertEquals([...HERO_METRICS].sort(), [
    'crew',
    'defended',
    'distance',
    'duration',
    'loop',
    'rank',
    'surface',
    'zones',
  ]);
});

Deno.test('BARRIÈRE 1 — la surface ressort TELLE QUELLE, jamais calculée', () => {
  // Quelle que soit la chaîne fournie par l'écran, la valeur rendue lui est
  // identique (au blanc près) : aucune transformation, aucun arrondi, aucun
  // « + » ajouté. Si un jour ce module calculait quoi que ce soit, ça tombe.
  for (const v of ['0,42', '420 000', '5 001', '1,00', '12 345 678']) {
    assertEquals(heroValueFor('surface', facts({ ...LUE, surfaceValue: v })), v);
  }
  // Aucun signe « + » : une surface est un état (ce qu'on tient), pas un delta.
  const rendu = heroValueFor('surface', facts(LUE));
  assert(rendu !== null && !rendu.startsWith('+'), `surface signée interdite : ${rendu}`);
});

Deno.test('BARRIÈRE 2 — aucun COMPTE ne peut se transformer en surface', () => {
  // Une course qui a tout jugé SAUF la surface : 47 zones, 12 défendues, 33 de
  // boucle, 420 points, 4,2 km, 26:10. La surface reste indisponible.
  const riche = facts({
    zonesGained: 47,
    zonesDefended: 12,
    loopBonusZones: 33,
    crewPoints: 420,
    rankLabel: '#8',
    distanceKm: '4,2',
    clockLabel: '26:10',
    crewName: 'NIGHT OWLS',
  });
  assertEquals(heroMetricAvailable('surface', riche), false);
  assertEquals(heroValueFor('surface', riche), null);
  // Et une carte qui DEMANDE la surface ne la fabrique pas : elle retombe sur
  // les zones (grandeur voisine réellement jugée), jamais sur une aire déduite.
  assertEquals(heroMetricFor('surface', riche), 'zones');
  // Sans zones non plus → l'effort mesuré, toujours pas d'aire.
  assertEquals(heroMetricFor('surface', facts({ distanceKm: '4,2' })), 'distance');
  assertEquals(heroMetricFor('surface', facts({ clockLabel: '26:10' })), 'duration');
  // Rien du tout → rien. La carte dira « — », jamais « 0 m² ».
  assertEquals(heroMetricFor('surface', facts()), null);
});

Deno.test('BARRIÈRE 2 bis — une surface vide/blanche ou sans unité ne compte pas', () => {
  assertEquals(heroMetricAvailable('surface', facts({ ...LUE, surfaceValue: '' })), false);
  assertEquals(heroMetricAvailable('surface', facts({ ...LUE, surfaceValue: '   ' })), false);
  // Une valeur sans unité serait un nombre nu : « 0,42 » ne dit ni m² ni km².
  assertEquals(heroMetricAvailable('surface', facts({ ...LUE, surfaceUnit: '' })), false);
  assertEquals(heroMetricAvailable('surface', facts({ ...LUE, surfaceUnit: '  ' })), false);
  // Vide n'est PAS zéro : la carte bascule, elle n'imprime pas « 0 ».
  assertEquals(
    heroMetricFor('surface', facts({ surfaceValue: '', zonesGained: 3 })),
    'zones',
  );
});

Deno.test('BARRIÈRE 3 — le source ne contient aucun « compte × aire nominale »', async () => {
  const src = await Deno.readTextFile(new URL('./cardModel.ts', import.meta.url));
  // Le code seul (les commentaires EXPLIQUENT l'interdiction, ils la citent donc).
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
  const INTERDITS: readonly [RegExp, string][] = [
    [/HEX_AREA|hexArea/i, "l'aire nominale d'une cellule H3"],
    [/15[_ ]?047|0\.0150475|1[_ ]?000[_ ]?000/i, 'un facteur de conversion d’aire en dur'],
    [/\*/, 'une multiplication (une surface ne se calcule pas ici)'],
    [/Number\s*\(|parseFloat|parseInt/i, 'une conversion de la surface en nombre'],
  ];
  for (const [motif, quoi] of INTERDITS) {
    assert(!motif.test(code), `motif interdit dans cardModel.ts — ${quoi} : ${motif}`);
  }
});

Deno.test('la grandeur du mode est retenue quand elle EXISTE', () => {
  assertEquals(heroMetricFor('zones', facts({ zonesGained: 7 })), 'zones');
  assertEquals(heroMetricFor('defended', facts({ zonesDefended: 2 })), 'defended');
  assertEquals(heroMetricFor('loop', facts({ loopBonusZones: 33 })), 'loop');
  assertEquals(heroMetricFor('crew', facts({ crewPoints: 420 })), 'crew');
  assertEquals(heroMetricFor('rank', facts({ rankLabel: '#8' })), 'rank');
});

Deno.test('zéro n’est pas une valeur : on ne met JAMAIS « +0 » en géant', () => {
  // Zones à 0 avec une distance mesurée → c'est la distance qui passe en héros.
  assertEquals(heroMetricFor('zones', facts({ distanceKm: '4,2' })), 'distance');
  // Ni distance ni durée → la durée, sinon RIEN.
  assertEquals(heroMetricFor('zones', facts({ clockLabel: '26:10' })), 'duration');
  assertEquals(heroMetricFor('zones', facts()), null);
  assertEquals(heroValueFor(null, facts()), null);
});

Deno.test('un rang vide ou blanc ne compte pas comme un rang', () => {
  assertEquals(heroMetricAvailable('rank', facts({ rankLabel: '' })), false);
  assertEquals(heroMetricAvailable('rank', facts({ rankLabel: '   ' })), false);
  assertEquals(heroMetricFor('rank', facts({ rankLabel: '', distanceKm: '3,0' })), 'distance');
});

Deno.test('valeurs héros : signe + pour un gain, et AUCUNE unité collée', () => {
  assertEquals(heroValueFor('zones', facts({ zonesGained: 47 })), '+47');
  assertEquals(heroValueFor('defended', facts({ zonesDefended: 2 })), '+2');
  assertEquals(heroValueFor('crew', facts({ crewPoints: 420 })), '+420');
  assertEquals(heroValueFor('rank', facts({ rankLabel: '#8' })), '#8');
  // L'unité est le LIBELLÉ, pas la valeur : « 4,2 km » en 64 pt déborde une
  // story de 232 pt, et un texte coupé est interdit (§A.9).
  assertEquals(heroValueFor('distance', facts({ distanceKm: '4,2' })), '4,2');
  assertEquals(heroValueFor('duration', facts({ clockLabel: '26:10' })), '26:10');
  // Grandeur demandée mais absente → null (jamais « undefined km »).
  assertEquals(heroValueFor('distance', facts()), null);
});

Deno.test('ligne de contexte : ordre de la planche, sans partie vide', () => {
  const f = facts({
    crewName: 'NIGHT OWLS',
    rankLabel: '#8',
    distanceKm: '4,2',
    clockLabel: '26:10',
  });
  // Héros = zones → aucune des quatre parties n'est doublonnée.
  assertEquals(contextParts(f, 'zones', KM), ['NIGHT OWLS', '#8', '4,2 km', '26:10']);
});

Deno.test('la grandeur affichée en GÉANT n’est pas répétée en petit', () => {
  const f = facts({ distanceKm: '4,2', clockLabel: '26:10' });
  assertEquals(contextParts(f, 'distance', KM), ['26:10']);
  assertEquals(contextParts(f, 'duration', KM), ['4,2 km']);
  assertEquals(contextParts(facts({ rankLabel: '#8' }), 'rank', KM), []);
});

Deno.test('aucune partie vide, aucun « km » orphelin', () => {
  assertEquals(contextParts(facts(), null, KM), []);
  assertEquals(contextParts(facts({ distanceKm: '   ' }), null, KM), []);
  assertEquals(contextParts(facts({ crewName: '  ' }), null, KM), []);
});

Deno.test('« Zone » n’est pas un nom de lieu — c’est l’aveu qu’on n’en a pas', () => {
  const fallbacks = ['Zone', 'Zone', 'Zona', 'Zone', 'Zona'];
  assertEquals(knownPlaceName('Zone', fallbacks), '');
  assertEquals(knownPlaceName('zone', fallbacks), '');
  assertEquals(knownPlaceName('  Zona  ', fallbacks), '');
  assertEquals(knownPlaceName('', fallbacks), '');
  // Un VRAI nom passe (le jour où resolveSectorName sera câblé).
  assertEquals(knownPlaceName('Saint-Rémy', fallbacks), 'Saint-Rémy');
});
