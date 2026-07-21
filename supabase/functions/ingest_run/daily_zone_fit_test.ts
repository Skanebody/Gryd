/**
 * Tests — A-46 × A-45 : la Zone du Jour lue à la distance réellement courue.
 * Moteur PUR : apps/mobile/src/features/daily/zoneFit.ts.
 *
 * CE QUE CES TESTS PROTÈGENT, dans l'ordre d'importance :
 *
 *  1. « ADAPTÉ À TES HABITUDES » NE SORT QUE D'UN PROFIL APPRIS. C'est LA règle
 *     du chantier. Elle est portée par le TYPE (seul `kind: 'learned'` donne
 *     accès à la copie), donc les tests vérifient que ce variant est
 *     INATTEIGNABLE depuis `manual`, `learning`, `off` et `unavailable` — y
 *     compris quand un `km` parfaitement plausible traîne dans l'entrée.
 *  2. AUCUN VERDICT DE TERRAIN N'EST INVENTÉ. Compte inconnu, secteur fragile,
 *     portée incalculable → `unknown`, jamais un `ample` optimiste.
 *  3. LE VERDICT EST CONSERVATEUR. `ample` exige au moins autant de zones
 *     libres que la borne HAUTE de portée. Un secteur juste en dessous sort
 *     `tight`, et `tight` ne déclenche AUCUN repli sur un autre secteur (ce
 *     module ne choisit pas de zone — il n'en reçoit qu'une).
 *
 * Le module n'importe rien : il est chargé tel quel par chemin relatif (le
 * mobile ne peut pas importer @klaim/engine, et Deno ne résout pas
 * `@klaim/shared`). Le pas de grille est INJECTÉ, comme dans l'app.
 * AUCUN réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { ZONE_CENTER_SPACING_M } from '../_shared/game-rules.ts';
import {
  resolveDailyZoneEffort,
  zonesWithinReach,
  type DailyZoneGround,
  type ZoneEffortInput,
} from '../../../apps/mobile/src/features/daily/zoneFit.ts';

const SPACING = ZONE_CENTER_SPACING_M;

/** Secteur neutre avec `free` zones réellement libres. */
const neutral = (free: number | null): DailyZoneGround => ({ role: 'neutral', freeZones: free });
const fragile: DailyZoneGround = { role: 'fragile', freeZones: null };

const learned = (km: number): ZoneEffortInput => ({
  km,
  source: 'learned',
  cause: null,
  runsLeft: null,
});

// ═══ 1. La phrase « adapté à tes habitudes » ═══════════════════════════════

Deno.test('profil APPRIS → variant learned (le seul qui autorise la phrase)', () => {
  const out = resolveDailyZoneEffort(neutral(500), learned(5), SPACING);
  assertEquals(out.kind, 'learned');
  if (out.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(out.km, 5);
});

Deno.test('réglage MANUEL → jamais learned, même avec une distance crédible', () => {
  const out = resolveDailyZoneEffort(neutral(500), {
    km: 5,
    source: 'manual',
    cause: null,
    runsLeft: null,
  }, SPACING);
  assertEquals(out.kind, 'manual');
});

Deno.test('profil en APPRENTISSAGE → learning + courses restantes, jamais learned', () => {
  const out = resolveDailyZoneEffort(neutral(500), {
    km: 3.4,
    source: 'default',
    cause: 'learning',
    runsLeft: 3,
  }, SPACING);
  assertEquals(out, { kind: 'learning', runsLeft: 3 });
});

Deno.test('apprentissage COUPÉ → off, jamais learned ni une distance affichée', () => {
  const out = resolveDailyZoneEffort(neutral(500), {
    km: 3.4,
    source: 'default',
    cause: 'off',
    runsLeft: null,
  }, SPACING);
  assertEquals(out, { kind: 'off' });
});

Deno.test('lecture INDISPONIBLE → unknown (silence), jamais « pas assez de courses »', () => {
  const out = resolveDailyZoneEffort(neutral(500), {
    km: 3.4,
    source: 'default',
    cause: 'unavailable',
    runsLeft: null,
  }, SPACING);
  assertEquals(out, { kind: 'unknown' });
});

Deno.test('aucune distance du tout → unknown', () => {
  assertEquals(resolveDailyZoneEffort(neutral(500), null, SPACING), { kind: 'unknown' });
});

Deno.test('distance apprise ABERRANTE → unknown, jamais un « appris » incohérent', () => {
  for (const km of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertEquals(resolveDailyZoneEffort(neutral(500), learned(km), SPACING).kind, 'unknown');
  }
});

Deno.test('courses restantes nulles ou aberrantes → runsLeft null, jamais « encore 0 »', () => {
  for (const left of [0, -2, Number.NaN, null]) {
    const out = resolveDailyZoneEffort(neutral(500), {
      km: 3.4,
      source: 'default',
      cause: 'learning',
      runsLeft: left,
    }, SPACING);
    assertEquals(out, { kind: 'learning', runsLeft: null });
  }
});

// ═══ 2. Portée d'une sortie, en zones ══════════════════════════════════════

Deno.test('portée = borne HAUTE (trajectoire rectiligne), arrondie vers le bas', () => {
  // 5 km à 114 m d'écart entre centres → 43 zones (5000 / 114 = 43,85).
  assertEquals(zonesWithinReach(5, 114), 43);
  assertEquals(zonesWithinReach(1, 114), 8);
});

Deno.test('portée incalculable → 0 (et donc aucun verdict en aval)', () => {
  assertEquals(zonesWithinReach(5, 0), 0);
  assertEquals(zonesWithinReach(5, -1), 0);
  assertEquals(zonesWithinReach(5, Number.NaN), 0);
  assertEquals(zonesWithinReach(Number.NaN, 114), 0);
  assertEquals(zonesWithinReach(0, 114), 0);
});

// ═══ 3. Verdict de terrain — conservateur, jamais inventé ══════════════════

Deno.test('assez de terrain libre pour la sortie habituelle → ample', () => {
  const reach = zonesWithinReach(5, SPACING);
  const out = resolveDailyZoneEffort(neutral(reach), learned(5), SPACING);
  if (out.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(out.fit, 'ample');
});

Deno.test('une zone libre de moins que la portée → tight (dit, pas corrigé)', () => {
  const reach = zonesWithinReach(5, SPACING);
  const out = resolveDailyZoneEffort(neutral(reach - 1), learned(5), SPACING);
  if (out.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(out.fit, 'tight');
});

Deno.test('même secteur, coureur de 4 km vs 12 km → le verdict change vraiment', () => {
  const ground = neutral(50); // 50 zones libres réelles
  const court = resolveDailyZoneEffort(ground, learned(4), SPACING);
  const long = resolveDailyZoneEffort(ground, learned(12), SPACING);
  if (court.kind !== 'learned' || long.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(court.fit, 'ample'); // 4 km → 35 zones ≤ 50
  assertEquals(long.fit, 'tight'); //  12 km → 105 zones > 50
});

Deno.test('total INCONNU (null) → unknown, surtout pas « 0 libre » ni ample', () => {
  const out = resolveDailyZoneEffort(neutral(null), learned(5), SPACING);
  if (out.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(out.fit, 'unknown');
});

Deno.test('secteur FRAGILE → unknown : la RPC n’expose qu’un booléen, pas un compte', () => {
  const out = resolveDailyZoneEffort(fragile, learned(5), SPACING);
  if (out.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(out.fit, 'unknown');
});

Deno.test('aucun terrain connu (ground null) → unknown, la distance reste dite', () => {
  const out = resolveDailyZoneEffort(null, learned(5), SPACING);
  if (out.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(out.km, 5);
  assertEquals(out.fit, 'unknown');
});

Deno.test('compte libre aberrant (négatif, NaN) → unknown', () => {
  for (const free of [-3, Number.NaN]) {
    const out = resolveDailyZoneEffort(neutral(free), learned(5), SPACING);
    if (out.kind !== 'learned') throw new Error('variant attendu');
    assertEquals(out.fit, 'unknown');
  }
});

Deno.test('secteur plein (0 libre) avec distance apprise → tight, jamais ample', () => {
  const out = resolveDailyZoneEffort(neutral(0), learned(5), SPACING);
  if (out.kind !== 'learned') throw new Error('variant attendu');
  assertEquals(out.fit, 'tight');
});
