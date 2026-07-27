/**
 * GRYD — E15 : la carte d'un rival montre son EMPRISE, jamais son trajet, et
 * elle ne dit « il ne tient rien » que si la lecture a vraiment abouti.
 *
 * Ces tests gardent quatre invariants de la constitution :
 *  · les états ne se confondent JAMAIS (vide ≠ échec ≠ illisible ≠ masqué ≠
 *    lecture en cours) ;
 *  · le refus de partage du joueur observé PRIME sur tout décompte ;
 *  · l'ancienneté n'est jamais inventée (instant manquant ou futur → rien) ;
 *  · l'analytics ne transporte qu'un ÉTAT, et rien pendant le chargement.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  deriveRivalZonesFacts,
  heldFor,
  resolveRivalZonesState,
  rivalZonesAnalyticsState,
  type RivalZoneRow,
  type RivalZonesRead,
} from './rivalZones.ts';

const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);
const H = 3_600_000;

/** Carré d'environ 100 m — une forme, jamais un trajet. */
const SQUARE: readonly (readonly [number, number])[] = [
  [2.35, 48.86],
  [2.3512, 48.86],
  [2.3512, 48.8609],
  [2.35, 48.8609],
];

function zone(id: string, over: Partial<RivalZoneRow> = {}): RivalZoneRow {
  return {
    id,
    rings: [SQUARE],
    areaM2: 15_000,
    controlledSinceHourMs: NOW - 5 * H,
    ...over,
  };
}

function loaded(over: Partial<Extract<RivalZonesRead, { kind: 'loaded' }>> = {}): RivalZonesRead {
  return { kind: 'loaded', mapSharing: 'simplified', zones: [], unreadable: 0, ...over };
}

// ─── Les états ne se confondent jamais ──────────────────────────────────────

Deno.test('E15 — pas de session : on n’affirme rien sur ce joueur', () => {
  assertEquals(resolveRivalZonesState({ kind: 'signed_out' }, NOW).status, 'signed_out');
});

Deno.test('E15 — lecture EN COURS n’est ni un vide ni un échec', () => {
  assertEquals(resolveRivalZonesState({ kind: 'loading' }, NOW).status, 'loading');
});

Deno.test('E15 — un échec de lecture n’est JAMAIS déguisé en « il ne tient rien »', () => {
  assertEquals(resolveRivalZonesState({ kind: 'failed' }, NOW).status, 'failed');
});

Deno.test('E15 — profil non rendu (inexistant OU non consenti) → un seul état, pas un oracle', () => {
  assertEquals(resolveRivalZonesState({ kind: 'no_profile' }, NOW).status, 'not_found');
});

Deno.test('E15 — lecture aboutie et vraiment vide : c’est le SEUL cas où l’écran l’affirme', () => {
  assertEquals(resolveRivalZonesState(loaded(), NOW).status, 'empty');
});

Deno.test('E15 — des lignes revenues mais aucune dessinable ≠ « il ne tient rien »', () => {
  const view = resolveRivalZonesState(loaded({ unreadable: 3 }), NOW);
  assertEquals(view.status, 'unreadable');
  assertEquals(view.status === 'unreadable' ? view.count : -1, 3);
});

// ─── Le refus de partage prime sur tout ─────────────────────────────────────

Deno.test('E15 — map_sharing = none masque la carte MÊME s’il tient des zones', () => {
  const view = resolveRivalZonesState(
    loaded({ mapSharing: 'none', zones: [zone('a'), zone('b')], unreadable: 1 }),
    NOW,
  );
  assertEquals(view.status, 'hidden');
  // Et surtout : aucun décompte ne fuit par la porte de derrière.
  assertEquals(Object.keys(view), ['status']);
});

Deno.test('E15 — les autres réglages de partage laissent la carte publique visible', () => {
  for (const sharing of ['precise', 'simplified', 'territory_only'] as const) {
    const view = resolveRivalZonesState(loaded({ mapSharing: sharing, zones: [zone('a')] }), NOW);
    assertEquals(view.status, 'ready');
  }
});

// ─── Ce qui est rendu quand il y a quelque chose ────────────────────────────

Deno.test('E15 — ready porte les zones, les faits agrégés ET le nombre d’écartées', () => {
  const view = resolveRivalZonesState(loaded({ zones: [zone('a'), zone('b')], unreadable: 2 }), NOW);
  assertEquals(view.status, 'ready');
  if (view.status !== 'ready') return;
  assertEquals(view.zones.length, 2);
  assertEquals(view.facts.zoneCount, 2);
  assertEquals(view.facts.totalAreaM2, 30_000);
  assertEquals(view.unreadable, 2);
});

// ─── L'ancienneté n'est jamais inventée ─────────────────────────────────────

Deno.test('E15 — ancienneté absente reste absente (aucun « depuis 0 h » fabriqué)', () => {
  assertEquals(heldFor(null, NOW), null);
});

Deno.test('E15 — un instant dans le FUTUR (dérive d’horloge) ne produit pas d’ancienneté', () => {
  assertEquals(heldFor(NOW + 2 * H, NOW), null);
});

Deno.test('E15 — sous 24 h l’ancienneté s’exprime en heures, arrondie vers le bas', () => {
  assertEquals(heldFor(NOW - 5 * H - 59 * 60_000, NOW), { unit: 'h', value: 5 });
  assertEquals(heldFor(NOW - 23 * H, NOW), { unit: 'h', value: 23 });
});

Deno.test('E15 — à partir de 24 h, en jours, arrondie vers le bas', () => {
  assertEquals(heldFor(NOW - 24 * H, NOW), { unit: 'd', value: 1 });
  assertEquals(heldFor(NOW - (3 * 24 + 23) * H, NOW), { unit: 'd', value: 3 });
});

Deno.test('E15 — l’ancienneté agrégée est celle de la PLUS ANCIENNE zone', () => {
  const facts = deriveRivalZonesFacts(
    [
      zone('recent', { controlledSinceHourMs: NOW - 2 * H }),
      zone('vieille', { controlledSinceHourMs: NOW - 50 * H }),
    ],
    NOW,
  );
  assertEquals(facts.oldestHeldFor, { unit: 'd', value: 2 });
});

Deno.test('E15 — une aire aberrante ne contamine pas le total, la zone reste comptée', () => {
  const facts = deriveRivalZonesFacts(
    [zone('ok'), zone('nan', { areaM2: Number.NaN }), zone('neg', { areaM2: -4 })],
    NOW,
  );
  assertEquals(facts.zoneCount, 3);
  assertEquals(facts.totalAreaM2, 15_000);
});

Deno.test('E15 — aucune zone datée → aucune ancienneté agrégée', () => {
  const facts = deriveRivalZonesFacts([zone('a', { controlledSinceHourMs: null })], NOW);
  assertEquals(facts.oldestHeldFor, null);
});

// ─── Analytics : un ÉTAT, jamais un rival ───────────────────────────────────

Deno.test('E15 — le chargement n’émet AUCUN event (un chargement n’est pas un écran vu)', () => {
  assertEquals(rivalZonesAnalyticsState({ status: 'loading' }), null);
});

Deno.test('E15 — le domaine de `state` reste fermé à ready|empty|unavailable', () => {
  assertEquals(rivalZonesAnalyticsState({ status: 'empty' }), 'empty');
  assertEquals(
    rivalZonesAnalyticsState({
      status: 'ready',
      zones: [zone('a')],
      facts: deriveRivalZonesFacts([zone('a')], NOW),
      unreadable: 0,
    }),
    'ready',
  );
  for (const status of ['signed_out', 'failed', 'not_found', 'hidden'] as const) {
    assertEquals(rivalZonesAnalyticsState({ status }), 'unavailable');
  }
  assertEquals(rivalZonesAnalyticsState({ status: 'unreadable', count: 2 }), 'unavailable');
});
