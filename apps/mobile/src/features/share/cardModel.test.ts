/**
 * GRYD — le chiffre héros ne peut pas être fabriqué.
 *
 * Le test central est le premier : `ShareCardFacts` ne porte AUCUN champ d'aire,
 * et `HERO_METRICS` n'en propose aucune. C'est la contrainte (a) rendue
 * STRUCTURELLE — « +420 000 m² » de la planche n'a aucune source serveur
 * (IngestRunResponse ne renvoie que des comptes d'hexagones, et l'aire d'un H3
 * varie d'environ ±20 % selon la latitude). Si quelqu'un ajoute un jour un champ
 * de surface, ce test tombe et force la décision au lieu de la laisser passer.
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

const AREA_LIKE = /aire|area|surface|m2|km2|m²|km²/i;

Deno.test('contrainte (a) — AUCUNE aire, ni dans les faits ni dans les grandeurs', () => {
  for (const key of Object.keys(NOTHING)) {
    assert(!AREA_LIKE.test(key), `champ d'aire interdit dans ShareCardFacts : ${key}`);
  }
  for (const m of HERO_METRICS) {
    assert(!AREA_LIKE.test(m), `grandeur d'aire interdite en chiffre héros : ${m}`);
  }
  // Et la seule liste de grandeurs est bien celle-là (pas de porte dérobée).
  assertEquals([...HERO_METRICS].sort(), [
    'crew',
    'defended',
    'distance',
    'duration',
    'loop',
    'rank',
    'zones',
  ]);
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
