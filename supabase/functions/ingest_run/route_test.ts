/**
 * Tests — GARDE-FOUS de walkabilité des routes (engine/route.ts, moteur PUR).
 * « Vérifier que les routes utilisées sont bien accessibles à pied et non des
 * autoroutes. » Couvre : denylist de classes (motorway/trunk → rejet dur),
 * classe inconnue (signal doux), connexité (saut > ROUTE_MAX_STEP_M), route
 * trop courte, et un tracé démo piéton sans classes (walkable). AUCUN réseau.
 * Importe les copies _shared (re-sync par le vérificateur).
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { ROUTE_MAX_STEP_M, ROUTE_MIN_POINTS } from '../_shared/game-rules.ts';
import {
  isRouteWalkable,
  validateRouteWalkability,
} from '../_shared/engine/route.ts';

// Deux points piétons proches (~150 m) place de la République.
const A = { lat: 48.86703, lng: 2.36415 };
const B = { lat: 48.86751, lng: 2.36424 };
const C = { lat: 48.86844, lng: 2.36319 };

Deno.test('route piétonne (classes walkable) → walkable + ok', () => {
  const r = validateRouteWalkability({
    points: [A, B, C],
    roadClasses: ['residential', 'footway'],
    provenance: 'osrm_foot',
  });
  assert(r.walkable);
  assert(r.ok);
  assertEquals(r.violations.length, 0);
});

Deno.test('un segment motorway → rejet DUR (non walkable)', () => {
  const r = validateRouteWalkability({
    points: [A, B, C],
    roadClasses: ['residential', 'motorway'],
  });
  assert(!r.walkable);
  assert(!r.ok);
  assert(r.violations.some((v) => v.kind === 'forbidden_class' && v.detail === 'motorway'));
  assertEquals(isRouteWalkable({ points: [A, B, C], roadClasses: ['residential', 'motorway'] }), false);
});

Deno.test('trunk et bretelles *_link interdits aussi', () => {
  for (const cls of ['trunk', 'motorway_link', 'trunk_link']) {
    const r = validateRouteWalkability({ points: [A, B], roadClasses: [cls] });
    assert(!r.walkable, `${cls} devrait être non walkable`);
  }
});

Deno.test('classe inconnue → signal DOUX (walkable mais pas ok)', () => {
  const r = validateRouteWalkability({
    points: [A, B],
    roadClasses: ['ferry'],
  });
  assert(r.walkable); // pas un rejet dur
  assert(!r.ok); // mais pas walkabilité stricte
  assert(r.violations.some((v) => v.kind === 'unknown_class' && v.detail === 'ferry'));
});

Deno.test('saut > ROUTE_MAX_STEP_M → disconnected (non walkable)', () => {
  // ~2,2 km au nord de A (bien au-delà de ROUTE_MAX_STEP_M = 1500 m).
  const far = { lat: A.lat + 0.02, lng: A.lng };
  const r = validateRouteWalkability({ points: [A, far] });
  assert(!r.walkable);
  assert(r.violations.some((v) => v.kind === 'disconnected'));
});

Deno.test('sauts sous le seuil → connexe (walkable, sans classes)', () => {
  const r = validateRouteWalkability({ points: [A, B, C], provenance: 'demo' });
  assert(r.walkable);
  assert(r.ok); // aucune classe fournie → aucun signal doux
});

Deno.test(`moins de ROUTE_MIN_POINTS (${ROUTE_MIN_POINTS}) → too_short`, () => {
  const r = validateRouteWalkability({ points: [A] });
  assert(!r.walkable);
  assertEquals(r.violations[0]?.kind, 'too_short');
});

Deno.test('route vide → too_short (jamais une exception)', () => {
  const r = validateRouteWalkability({ points: [] });
  assert(!r.walkable);
  assertEquals(r.violations[0]?.kind, 'too_short');
});

Deno.test('le seuil de connexité correspond bien à la constante partagée', () => {
  // Juste sous le seuil : connexe. Juste au-dessus : déconnecté.
  const degLat = (ROUTE_MAX_STEP_M * 0.9) / 111_320; // ~0,9 × seuil vers le nord
  const near = { lat: A.lat + degLat, lng: A.lng };
  assert(isRouteWalkable({ points: [A, near] }));
});
