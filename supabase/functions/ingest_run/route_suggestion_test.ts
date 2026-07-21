/**
 * Tests — A-46 : la distance proposée et LA RAISON de cette distance.
 * Moteur PUR : apps/mobile/src/features/route/suggestion.ts (zéro import, donc
 * chargé tel quel par chemin relatif — le mobile ne peut pas importer
 * @klaim/engine, et Deno ne résout pas `@klaim/shared`). AUCUN réseau.
 *
 * CE QUE CES TESTS PROTÈGENT, dans l'ordre d'importance :
 *
 *  1. LE MENSONGE SYMÉTRIQUE. « Apprentissage désactivé » est une AFFIRMATION
 *     sur un réglage du joueur : elle n'est légitime que si le serveur a
 *     réellement répondu. Une lecture EN COURS ou RATÉE doit sortir en
 *     `unavailable` (« on ne sait pas »), jamais en `off` (« tu as coupé »).
 *     C'est le `?? false` de l'ancien hook qui confondait les deux, et
 *     `routeDistancePrefsFrom` est l'endroit unique où la confusion redeviendrait
 *     possible — donc l'endroit à verrouiller.
 *  2. « ADAPTÉ À TES HABITUDES » NE SORT QUE D'UN PROFIL APPRIS, et jamais
 *     lorsqu'on ignore si on avait le droit d'apprendre.
 *  3. UNE DISTANCE NON LUE N'EST PAS UNE DISTANCE CHOISIE : hors lecture
 *     réussie, aucun `source: 'manual'` ne peut sortir.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  resolveRouteSuggestion,
  routeDistancePrefsFrom,
  runsBeforeLearning,
  type HabitProfile,
  type RouteDistancePrefs,
  type RoutePrefsRead,
  type SuggestionBounds,
} from '../../../apps/mobile/src/features/route/suggestion.ts';

/** Bornes du planificateur — mêmes ordres de grandeur que GEN_* côté app. */
const BOUNDS: SuggestionBounds = { minKm: 1, maxKm: 20, stepKm: 0.5, fallbackKm: 5 };

const UNAVAILABLE: HabitProfile = { kind: 'unavailable' };
const KNOWN: HabitProfile = { kind: 'known', typicalKm: 8.2, sampleRuns: 11 };

// ─── 1. Les trois états de la LECTURE des réglages ──────────────────────────

Deno.test('lecture EN COURS → learning inconnu, aucune distance manuelle', () => {
  assertEquals(routeDistancePrefsFrom({ status: 'loading' }), {
    manualKm: null,
    learning: 'unknown',
  });
});

Deno.test('lecture RATÉE → learning inconnu (surtout pas "off")', () => {
  const p = routeDistancePrefsFrom({ status: 'error' });
  assertEquals(p.learning, 'unknown');
  assertEquals(p.manualKm, null);
});

Deno.test('hors session / vitrine → learning inconnu', () => {
  assertEquals(routeDistancePrefsFrom({ status: 'unavailable' }).learning, 'unknown');
});

Deno.test('serveur a répondu → le réglage du joueur fait foi, mètres → km', () => {
  const on = routeDistancePrefsFrom({
    status: 'ready',
    learningEnabled: true,
    targetDistanceM: 7500,
  });
  assertEquals(on, { manualKm: 7.5, learning: 'on' });

  const off = routeDistancePrefsFrom({
    status: 'ready',
    learningEnabled: false,
    targetDistanceM: null,
  });
  assertEquals(off, { manualKm: null, learning: 'off' });
});

Deno.test('cible non finie → aucune distance manuelle inventée', () => {
  const p = routeDistancePrefsFrom({
    status: 'ready',
    learningEnabled: true,
    targetDistanceM: Number.NaN,
  });
  assertEquals(p.manualKm, null);
  assertEquals(p.learning, 'on');
});

// ─── 2. LE défaut du jour : échec ≠ opt-out ─────────────────────────────────

Deno.test('un échec de lecture ne devient JAMAIS "apprentissage désactivé"', () => {
  for (const status of ['loading', 'error', 'unavailable'] as const) {
    const read: RoutePrefsRead = { status };
    const s = resolveRouteSuggestion(UNAVAILABLE, routeDistancePrefsFrom(read), BOUNDS);
    assertEquals(s.source, 'default');
    assertEquals(s.cause, 'unavailable', `statut ${status} ne doit pas affirmer "off"`);
    assertEquals(s.km, BOUNDS.fallbackKm);
  }
});

Deno.test('SEUL un serveur qui a répondu peut produire la cause "off"', () => {
  const s = resolveRouteSuggestion(
    UNAVAILABLE,
    routeDistancePrefsFrom({ status: 'ready', learningEnabled: false, targetDistanceM: null }),
    BOUNDS,
  );
  assertEquals(s.cause, 'off');
});

Deno.test('réglages non lus : un profil appris qui traîne n’est PAS utilisé', () => {
  // Cas réel : l'apprentissage vient d'être coupé sur un autre appareil, le
  // profil chargé avant reste en mémoire. Tant que la relecture n'a pas
  // répondu, on ne s'en sert pas — on n'a pas vérifié qu'on en avait le droit.
  const stale: RouteDistancePrefs = { manualKm: null, learning: 'unknown' };
  const s = resolveRouteSuggestion(KNOWN, stale, BOUNDS);
  assertEquals(s.source, 'default');
  assertEquals(s.cause, 'unavailable');
  assertEquals(s.sampleRuns, null);
});

// ─── 3. « Adapté à tes habitudes » — les seules portes d'entrée ─────────────

Deno.test('profil appris + apprentissage autorisé → source "learned"', () => {
  const s = resolveRouteSuggestion(KNOWN, { manualKm: null, learning: 'on' }, BOUNDS);
  assertEquals(s.source, 'learned');
  assertEquals(s.km, 8); // 8,2 aligné sur le pas de 0,5
  assertEquals(s.sampleRuns, 11);
  assertEquals(s.cause, null);
});

Deno.test('apprentissage coupé : un profil appris ne repasse pas par la fenêtre', () => {
  const s = resolveRouteSuggestion(KNOWN, { manualKm: null, learning: 'off' }, BOUNDS);
  assertEquals(s.source, 'default');
  assertEquals(s.cause, 'off');
  assertEquals(s.sampleRuns, null);
});

Deno.test('pas encore assez de courses → cause "learning" + le reste à courir', () => {
  const s = resolveRouteSuggestion(
    { kind: 'learning', sampleRuns: 2, requiredRuns: 5 },
    { manualKm: null, learning: 'on' },
    BOUNDS,
  );
  assertEquals(s.source, 'default');
  assertEquals(s.cause, 'learning');
  assertEquals(runsBeforeLearning(s), 3);
});

Deno.test('"encore N courses" n’a pas de sens hors de la cause "learning"', () => {
  const failed = resolveRouteSuggestion(
    UNAVAILABLE,
    routeDistancePrefsFrom({ status: 'error' }),
    BOUNDS,
  );
  assertEquals(runsBeforeLearning(failed), null);
});

// ─── 4. Le réglage manuel ───────────────────────────────────────────────────

Deno.test('réglage explicite : il prime, et il est annoncé comme tel', () => {
  const s = resolveRouteSuggestion(
    KNOWN,
    routeDistancePrefsFrom({ status: 'ready', learningEnabled: true, targetDistanceM: 6000 }),
    BOUNDS,
  );
  assertEquals(s.source, 'manual');
  assertEquals(s.km, 6);
});

Deno.test('aucune lecture réussie ⇒ aucune source "manual" possible', () => {
  for (const status of ['loading', 'error', 'unavailable'] as const) {
    const s = resolveRouteSuggestion(KNOWN, routeDistancePrefsFrom({ status }), BOUNDS);
    assertEquals(s.source, 'default', `statut ${status} ne doit pas produire "manual"`);
  }
});

Deno.test('distance proposée toujours courable (bornée + alignée)', () => {
  const huge = resolveRouteSuggestion(
    { kind: 'known', typicalKm: 999, sampleRuns: 30 },
    { manualKm: null, learning: 'on' },
    BOUNDS,
  );
  assertEquals(huge.km, BOUNDS.maxKm);

  const tiny = resolveRouteSuggestion(
    { kind: 'known', typicalKm: 0.2, sampleRuns: 30 },
    { manualKm: null, learning: 'on' },
    BOUNDS,
  );
  assertEquals(tiny.km, BOUNDS.minKm);
});
