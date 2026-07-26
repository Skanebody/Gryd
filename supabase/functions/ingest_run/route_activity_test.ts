/**
 * GRYD — LE ROUTAGE VÉLO EST OUVERT (décision fondateur 26/07/2026).
 *
 * Jusqu'ici, `ROUTE_PEDESTRIAN_PROFILE` portait un interdit GLOBAL (« jamais
 * car/bike ») : le planificateur ne POUVAIT PAS proposer de boucle vélo. C'était
 * juste tant que le vélo n'existait pas — plus maintenant.
 *
 * Ce que ce fichier verrouille :
 *   1. chaque discipline a SON profil de routage, et aucune n'a le profil `car` ;
 *   2. la course à pied n'a pas bougé d'un iota (rétro-compatibilité par
 *      construction : `activity` absent ⇒ comportement d'avant le vélo) ;
 *   3. la denylist de voies rapides mord DANS LES DEUX MONDES ;
 *   4. les bornes de distance vélo sont DÉRIVÉES (×5, planche E14), cohérentes
 *      avec le périmètre minimal d'une boucle et avec le plafond d'ingestion.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  ACTIVITIES,
  ACTIVITY_ROUTING,
  activityRouting,
  activityRules,
  BIKE_LOOP_MIN_PERIMETER_M,
  BIKE_MAX_DISTANCE_M,
  BIKE_MIN_DISTANCE_M,
  ROUTE_TARGET_DISTANCE_CHOICES_M,
  RUN_MAX_DISTANCE_M,
} from '../_shared/game-rules.ts';
import { isRouteWalkable, validateRouteWalkability } from '../_shared/engine/route.ts';

// Trois points voisins (≈ 100 m), bien en deçà de ROUTE_MAX_STEP_M.
const A = { lat: 48.8566, lng: 2.3522 };
const B = { lat: 48.8575, lng: 2.3522 };
const C = { lat: 48.8584, lng: 2.3522 };

// ════════════════════════════════════════════════════════════════════════════
// 1. LES PROFILS DE ROUTAGE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('chaque discipline a son profil : `foot` à pied, `bike` à vélo', () => {
  assertEquals(activityRouting('run').profile, 'foot');
  assertEquals(activityRouting('bike').profile, 'bike');
});

Deno.test('AUCUNE discipline ne route au profil `car` — l’interdit qui reste entier', () => {
  for (const a of ACTIVITIES) {
    assert(
      activityRouting(a).profile !== 'car',
      `« ${a} » ne doit jamais être routé comme une voiture.`,
    );
  }
});

Deno.test('discipline absente ⇒ routage piéton : le défaut est le comportement d’avant', () => {
  assertEquals(activityRouting(), activityRouting('run'));
  assertEquals(ACTIVITY_ROUTING.run.profile, 'foot');
});

Deno.test('toute discipline connue a des règles de routage (aucun trou de table)', () => {
  for (const a of ACTIVITIES) {
    const r = activityRouting(a);
    assert(r.profile.length > 0);
    assert(r.forbiddenHighwayClasses.length > 0);
    assert(r.usableHighwayClasses.length > 0);
    assert(r.targetDistanceChoicesM.length > 0);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LES VOIES — ce qui est dangereux l’est dans les deux mondes
// ════════════════════════════════════════════════════════════════════════════

Deno.test('autoroute et voie express : rejet DUR à pied ET à vélo', () => {
  for (const cls of ['motorway', 'motorway_link', 'trunk', 'trunk_link']) {
    for (const a of ACTIVITIES) {
      const r = validateRouteWalkability({ points: [A, B], roadClasses: [cls] }, a);
      assertEquals(
        r.walkable,
        false,
        `« ${cls} » doit être refusé en ${a} (interdit et dangereux pour les deux).`,
      );
      assertEquals(r.violations[0].kind, 'forbidden_class');
    }
  }
});

Deno.test('une piste cyclable est normalement praticable dans les deux disciplines', () => {
  for (const a of ACTIVITIES) {
    const r = validateRouteWalkability(
      { points: [A, B, C], roadClasses: ['cycleway', 'residential'] },
      a,
    );
    assertEquals(r.ok, true, `« cycleway » ne devrait lever aucun signal en ${a}.`);
  }
});

Deno.test('un escalier : normal à pied, signal DOUX à vélo — jamais un rejet', () => {
  const stairs = { points: [A, B], roadClasses: ['steps'] };

  const onFoot = validateRouteWalkability(stairs, 'run');
  assertEquals(onFoot.ok, true, 'À pied, un escalier est une voie ordinaire.');

  const onBike = validateRouteWalkability(stairs, 'bike');
  // Impraticable ≠ dangereux : on le REMONTE (audit) sans rejeter la route —
  // un cycliste descend et porte, il ne se met pas en danger.
  assertEquals(onBike.walkable, true, 'Un escalier ne rend pas une route vélo dangereuse.');
  assertEquals(onBike.ok, false, 'Il doit quand même se voir.');
  assertEquals(onBike.violations[0].kind, 'unknown_class');
  assertEquals(onBike.violations[0].detail, 'steps');
});

Deno.test('la géométrie se juge pareil dans les deux mondes (connexité, nb de points)', () => {
  const far = { lat: 49.5, lng: 2.3522 }; // > ROUTE_MAX_STEP_M
  for (const a of ACTIVITIES) {
    assertEquals(validateRouteWalkability({ points: [A, far] }, a).walkable, false);
    assertEquals(validateRouteWalkability({ points: [A] }, a).walkable, false);
    assertEquals(isRouteWalkable({ points: [A, B, C] }, a), true);
  }
});

Deno.test('RÉTRO-COMPAT : sans discipline, le verdict est EXACTEMENT celui du piéton', () => {
  const cases = [
    { points: [A, B, C] },
    { points: [A, B], roadClasses: ['steps'] },
    { points: [A, B], roadClasses: ['motorway'] },
    { points: [A, B], roadClasses: ['zoo'] },
    { points: [A] },
  ];
  for (const route of cases) {
    assertEquals(validateRouteWalkability(route), validateRouteWalkability(route, 'run'));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LES DISTANCES — dérivées, pas choisies
// ════════════════════════════════════════════════════════════════════════════

Deno.test('les distances vélo sont les distances course × 5 (facteur de longueur E14)', () => {
  assertEquals(
    [...activityRouting('bike').targetDistanceChoicesM],
    ROUTE_TARGET_DISTANCE_CHOICES_M.map((d) => d * 5),
  );
});

Deno.test('le plancher d’une suggestion = le plancher d’une sortie qui compte', () => {
  assertEquals(activityRouting('bike').targetDistanceMinM, BIKE_MIN_DISTANCE_M);
  assertEquals(
    activityRouting('run').targetDistanceMinM,
    activityRules('run').minDistanceM,
  );
});

Deno.test('SUGGÉRABLE et INGÉRABLE ne se confondent jamais (les deux disciplines)', () => {
  // Le plafond de ce qu’on PROPOSE reste nettement sous le plafond de ce qu’on
  // ACCEPTE : proposer une sortie au bord du plafond anti-abus serait envoyer
  // quelqu’un contre un mur qu’il ne voit pas.
  assert(activityRouting('run').targetDistanceMaxM < RUN_MAX_DISTANCE_M);
  assert(activityRouting('bike').targetDistanceMaxM < BIKE_MAX_DISTANCE_M);
});

Deno.test('toute distance proposée tient dans les bornes de sa discipline', () => {
  for (const a of ACTIVITIES) {
    const r = activityRouting(a);
    for (const d of r.targetDistanceChoicesM) {
      assert(d >= r.targetDistanceMinM, `${a} : ${d} m sous le plancher.`);
      assert(d <= r.targetDistanceMaxM, `${a} : ${d} m au-dessus du plafond.`);
      assert(
        d <= activityRules(a).maxDistanceM,
        `${a} : ${d} m ne serait même pas ingérable.`,
      );
    }
  }
});

Deno.test('toute distance proposée peut réellement FAIRE une zone (≥ périmètre minimal)', () => {
  // Sinon la suggestion promet une capture que la sortie ne rendra pas —
  // exactement le genre de bouton qui ment.
  for (const a of ACTIVITIES) {
    const r = activityRouting(a);
    for (const d of r.targetDistanceChoicesM) {
      assert(
        d >= r.loopMinPerimeterM,
        `${a} : une boucle de ${d} m ne peut pas capturer de zone ` +
          `(périmètre minimal ${r.loopMinPerimeterM} m).`,
      );
    }
  }
});

Deno.test('le périmètre de boucle du routage est CELUI du moteur (une seule source)', () => {
  for (const a of ACTIVITIES) {
    assertEquals(activityRouting(a).loopMinPerimeterM, activityRules(a).loopMinPerimeterM);
  }
  assertEquals(activityRouting('bike').loopMinPerimeterM, BIKE_LOOP_MIN_PERIMETER_M);
});

Deno.test('à vélo, une sortie entre 2 et 5 km reste VALIDE mais ne fait pas de zone', () => {
  // Conséquence ASSUMÉE et documentée de BIKE_LOOP_MIN_PERIMETER_M : « à vélo,
  // la zone se gagne à l'échelle du quartier, pas du pâté de maisons ». On la
  // teste pour qu'elle reste un choix, et ne devienne pas une surprise.
  const r = activityRouting('bike');
  assert(r.targetDistanceMinM < r.loopMinPerimeterM);
  assertEquals(r.targetDistanceMinM, BIKE_MIN_DISTANCE_M);
  assertEquals(r.loopMinPerimeterM, BIKE_LOOP_MIN_PERIMETER_M);
});
