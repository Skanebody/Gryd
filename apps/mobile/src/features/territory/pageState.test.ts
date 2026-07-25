/**
 * GRYD — tests de l'état de « Mon territoire ».
 *
 * Le test décisif du plan de recalage : « ouvrir l'écran sans backend, sans
 * session, puis avec une lecture qui échoue. S'il affiche la même chose dans
 * deux de ces cas, il n'est pas fini. » On le verrouille ici.
 */
import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  territoryCta,
  territoryMetricKeys,
  territoryPageState,
  territoryShowsMap,
  type TerritoryPageInput,
} from './pageState.ts';

const BASE: TerritoryPageInput = {
  loading: false,
  failed: false,
  signedOut: false,
  configured: true,
  zonesHeld: 0,
};

// ─── Les cinq situations, jamais fondues ────────────────────────────────────

Deno.test('territoryPageState : un CHARGEMENT n’affirme rien — il prime sur tout', () => {
  assertEquals(
    territoryPageState({ ...BASE, loading: true, failed: true, signedOut: true, configured: false }),
    'loading',
  );
});

Deno.test('territoryPageState : SANS BACKEND ≠ PAS CONNECTÉ (le bouton mort d’origine)', () => {
  const noBackend = territoryPageState({ ...BASE, signedOut: true, configured: false });
  const signedOut = territoryPageState({ ...BASE, signedOut: true, configured: true });
  assertEquals(noBackend, 'no-backend');
  assertEquals(signedOut, 'signed-out');
  assertNotEquals(noBackend, signedOut);
});

Deno.test('territoryPageState : un ÉCHEC ne se lit jamais comme un territoire vide', () => {
  const failed = territoryPageState({ ...BASE, failed: true });
  const empty = territoryPageState({ ...BASE, zonesHeld: 0 });
  assertEquals(failed, 'failed');
  assertEquals(empty, 'empty');
  assertNotEquals(failed, empty);
});

Deno.test('territoryPageState : « tenu » exige des zones RÉELLEMENT tenues', () => {
  assertEquals(territoryPageState({ ...BASE, zonesHeld: 1 }), 'held');
  assertEquals(territoryPageState({ ...BASE, zonesHeld: 0 }), 'empty');
});

// ─── La carte de 220 px ─────────────────────────────────────────────────────

Deno.test('territoryShowsMap : la carte n’occupe le premier écran que si l’on SAIT', () => {
  assertEquals(territoryShowsMap('held'), true);
  assertEquals(territoryShowsMap('empty'), true);
  for (const s of ['loading', 'failed', 'signed-out', 'no-backend'] as const) {
    assertEquals(territoryShowsMap(s), false, `${s} ne doit pas peindre une vue monde vide`);
  }
});

// ─── L'unique CTA ───────────────────────────────────────────────────────────

Deno.test('territoryCta : « Se connecter » n’apparaît QUE là où la connexion existe', () => {
  assertEquals(territoryCta('signed-out'), 'sign-in');
  // Sans backend, /(auth)/sign-in redirige vers la carte : proposer « Se
  // connecter » renverrait le joueur d'où il vient. On ouvre la carte, et
  // c'est ce que le bouton dit.
  assertEquals(territoryCta('no-backend'), 'map');
  assertEquals(territoryCta('failed'), 'retry');
  assertEquals(territoryCta('loading'), 'map');
  assertEquals(territoryCta('empty'), 'map');
  assertEquals(territoryCta('held'), 'map');
});

// ─── Métriques ──────────────────────────────────────────────────────────────

Deno.test('territoryMetricKeys : la surface mène, et une mesure absente DISPARAÎT', () => {
  assertEquals(territoryMetricKeys({ areaM2: 420_000, zonesHeld: 12 }), ['area', 'zones']);
  assertEquals(territoryMetricKeys({ areaM2: 0, zonesHeld: 12 }), ['zones']);
  assertEquals(territoryMetricKeys({ areaM2: Number.NaN, zonesHeld: 12 }), ['zones']);
  assertEquals(territoryMetricKeys({ areaM2: 0, zonesHeld: 0 }), []);
});
