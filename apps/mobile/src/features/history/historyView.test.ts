/**
 * GRYD — tests des décisions d'affichage de l'Historique.
 *
 * Ce qu'on verrouille ici n'est pas « la liste s'affiche » mais deux règles
 * d'honnêteté : un filtre qui ne mène nulle part n'existe pas, et un impact
 * INCONNU ne se rend jamais comme un impact NUL.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { HISTORY_FILTER_ORDER, runImpactKeys, visibleHistoryFilters } from './historyView.ts';

// ─── Filtres ────────────────────────────────────────────────────────────────

Deno.test('visibleHistoryFilters : un seul filtre utile n’est PAS un filtre', () => {
  // Trois courses, toutes « stats seules » → « Tout » et « Stats seules »
  // désigneraient la même liste : deux boutons pour un seul résultat.
  assertEquals(visibleHistoryFilters({ all: 3, conquest: 0, defense: 0, stats: 3 }), [
    'all',
    'stats',
  ]);
  // Zéro course : la barre disparaît entièrement (pas un « Tout » solitaire).
  assertEquals(visibleHistoryFilters({ all: 0, conquest: 0, defense: 0, stats: 0 }), []);
});

Deno.test('visibleHistoryFilters : une nature VIDE ne prend jamais de place', () => {
  const shown = visibleHistoryFilters({ all: 5, conquest: 4, defense: 0, stats: 1 });
  assertEquals(shown, ['all', 'conquest', 'stats']);
  assertEquals(shown.includes('defense'), false);
});

Deno.test('visibleHistoryFilters : l’ordre est celui de la planche, pas un tri', () => {
  const shown = visibleHistoryFilters({ all: 9, conquest: 2, defense: 3, stats: 4 });
  assertEquals(shown, [...HISTORY_FILTER_ORDER]);
});

// ─── Impact territorial ─────────────────────────────────────────────────────

Deno.test('runImpactKeys : un impact INCONNU n’affiche rien (jamais un « 0 » inventé)', () => {
  assertEquals(runImpactKeys({ captured: null, defended: null }), []);
});

Deno.test('runImpactKeys : « 0 zone capturée » est un FAIT serveur, il s’affiche', () => {
  assertEquals(runImpactKeys({ captured: 0, defended: null }), ['captured']);
});

Deno.test('runImpactKeys : « 0 défendue » n’est pas une information, il disparaît', () => {
  assertEquals(runImpactKeys({ captured: 4, defended: 0 }), ['captured']);
  assertEquals(runImpactKeys({ captured: 4, defended: 2 }), ['captured', 'defended']);
});
