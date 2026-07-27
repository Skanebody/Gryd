/**
 * GRYD — E22 : tests du PORT client de la couverture de frontière.
 *
 * Ce que ces tests verrouillent, dans l'ordre de ce qui pourrait faire mentir
 * l'écran :
 *  1. les PALIERS sont ceux de `game-rules` (jamais 0,4 / 0,8 écrits à la main),
 *     donc le port ne peut pas diverger du moteur serveur en silence ;
 *  2. une frontière JAMAIS approchée rend 0 — pas « un peu », pas NaN ;
 *  3. une frontière longée à moins d'un buffer rend 1 ;
 *  4. `traverse` n'est PAS un franchissement : sans cette garantie, le label
 *     « Défense possible » s'afficherait au premier tick de chaque sortie ;
 *  5. le franchissement ne se célèbre qu'UNE fois, et une redescente ne
 *     reprend rien.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  DEFENSE_COVER_FULL_MIN,
  DEFENSE_COVER_LONGE_MIN,
  FRONTIER_COVERAGE_BUFFER_M,
} from '@klaim/shared';
import {
  INITIAL_DEFENSE_COVERAGE,
  defenseIsPossible,
  defenseLevel,
  distanceToPolylineM,
  frontierCoverage,
  stepDefenseCoverage,
  type CoveragePoint,
} from './coverage.ts';

// Un carré d'environ 200 m de côté près de Paris — géométrie plausible d'une
// petite zone, jamais une donnée de jeu.
const A: CoveragePoint = { lat: 48.87, lng: 2.36 };
const B: CoveragePoint = { lat: 48.87, lng: 2.3627 };
const C: CoveragePoint = { lat: 48.8718, lng: 2.3627 };
const D: CoveragePoint = { lat: 48.8718, lng: 2.36 };
const RING: CoveragePoint[] = [A, B, C, D, A];

Deno.test('les paliers sont EXACTEMENT ceux de game-rules', () => {
  assertEquals(defenseLevel(DEFENSE_COVER_LONGE_MIN), 'longe');
  assertEquals(defenseLevel(DEFENSE_COVER_LONGE_MIN - 0.001), 'traverse');
  assertEquals(defenseLevel(DEFENSE_COVER_FULL_MIN), 'cover');
  assertEquals(defenseLevel(DEFENSE_COVER_FULL_MIN - 0.001), 'longe');
  // Une boucle refermée vaut le niveau maximal quelle que soit la couverture.
  assertEquals(defenseLevel(0, true), 'cover');
});

Deno.test('une frontière jamais approchée rend 0 (jamais NaN, jamais un repli)', () => {
  const loin: CoveragePoint[] = [
    { lat: 45.75, lng: 4.85 },
    { lat: 45.751, lng: 4.851 },
  ];
  assertEquals(frontierCoverage(RING, loin), 0);
  // Dégénérescences : aucune ne doit produire autre chose que 0.
  assertEquals(frontierCoverage([], loin), 0);
  assertEquals(frontierCoverage(RING, []), 0);
  assertEquals(frontierCoverage([A], loin), 0);
});

Deno.test('une frontière parcourue exactement rend une couverture pleine', () => {
  // `> 0,999` et non `=== 1` : la somme des sous-segments passe par une
  // projection locale, dont l'erreur double est de l'ordre de 1e-16. Exiger
  // l'égalité exacte ferait échouer le test sur un arrondi binaire, pas sur une
  // règle — même raison que le RATIO_EPS de `engine/contest.ts`.
  assert(frontierCoverage(RING, RING) > 0.999);
});

Deno.test('un seul côté longé donne une couverture partielle strictement entre 0 et 1', () => {
  const unCote: CoveragePoint[] = [A, B];
  const c = frontierCoverage(RING, unCote);
  assert(c > 0, `couverture attendue > 0, reçue ${c}`);
  assert(c < 1, `couverture attendue < 1, reçue ${c}`);
});

Deno.test('la distance à une polyligne est celle du SEGMENT le plus proche', () => {
  // Point au milieu du segment A-B, décalé vers le nord : la distance doit être
  // très inférieure à celle d'un sommet (sinon un tracé peu échantillonné
  // sous-estimerait la couverture).
  const milieu: CoveragePoint = { lat: 48.8702, lng: 2.36135 };
  const d = distanceToPolylineM(milieu, [A, B]);
  assert(d < FRONTIER_COVERAGE_BUFFER_M, `distance attendue < buffer, reçue ${d}`);
  assertEquals(distanceToPolylineM(milieu, []), Infinity);
});

Deno.test('« traverse » n’est pas un franchissement : rien ne se célèbre au premier tick', () => {
  assert(!defenseIsPossible('traverse'));
  const step = stepDefenseCoverage(INITIAL_DEFENSE_COVERAGE, 'traverse');
  assertEquals(step.reached, 'traverse');
  assertEquals(step.celebrate, false);
});

Deno.test('« Défense possible » ne se joue qu’une fois, et une redescente ne reprend rien', () => {
  let memory = INITIAL_DEFENSE_COVERAGE;
  const first = stepDefenseCoverage(memory, 'longe');
  assertEquals(first.celebrate, true);
  assertEquals(first.reached, 'longe');
  memory = first.memory;

  // Le niveau remonte : nouvel event, mais pas une seconde célébration.
  const up = stepDefenseCoverage(memory, 'cover');
  assertEquals(up.reached, 'cover');
  assertEquals(up.celebrate, false);
  memory = up.memory;

  // Le moteur remesure plus bas (la trace s'allonge) : aucun event, mémoire intacte.
  const down = stepDefenseCoverage(memory, 'traverse');
  assertEquals(down.reached, null);
  assertEquals(down.celebrate, false);
  assertEquals(down.memory.best, 'cover');
});
