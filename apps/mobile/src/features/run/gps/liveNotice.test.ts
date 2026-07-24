/**
 * GRYD — §10 : le sélecteur d'avis live rend TOUJOURS un seul avis, et la sûreté
 * (signal critique) prime sur tout. Verrouille l'ordre de priorité complet.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { selectLiveNotice, type LiveNoticeInput } from './liveNotice.ts';

const base: LiveNoticeInput = {
  pausedByUser: false,
  permissionRevoked: false,
  awaitingFirstFix: false,
  firstFixOverdue: false,
  signal: 'ok',
  hasRestore: false,
  bgPrompt: 'hidden',
  approxLocation: false,
  foregroundOnlyPlatform: false,
  loopHint: null,
};

Deno.test('rien d’actif → aucun avis', () => {
  assertEquals(selectLiveNotice(base), 'none');
});

Deno.test('signal critique (perdu) prime sur TOUT le reste simultané', () => {
  const all: LiveNoticeInput = {
    ...base,
    signal: 'lost',
    hasRestore: true,
    bgPrompt: 'offer',
    approxLocation: true,
    foregroundOnlyPlatform: true,
    loopHint: 'ready',
  };
  assertEquals(selectLiveNotice(all), 'signal_critical');
});

Deno.test('autorisation coupée = critique ; jamais reçu (dépassé) = critique', () => {
  assertEquals(selectLiveNotice({ ...base, permissionRevoked: true }), 'signal_critical');
  assertEquals(
    selectLiveNotice({ ...base, awaitingFirstFix: true, firstFixOverdue: true }),
    'signal_critical',
  );
  // Attente JEUNE du 1er fix → pas encore un échec (la pill d'état suffit).
  assertEquals(selectLiveNotice({ ...base, awaitingFirstFix: true, firstFixOverdue: false }), 'none');
});

Deno.test('en pause manuelle : aucun faux signal (perdu/faible ignorés)', () => {
  assertEquals(selectLiveNotice({ ...base, pausedByUser: true, signal: 'lost' }), 'none');
  assertEquals(selectLiveNotice({ ...base, pausedByUser: true, signal: 'weak' }), 'none');
});

Deno.test('ordre de priorité complet (chaque niveau bat les suivants réunis)', () => {
  // restore > bg_offer > weak > precise > loop_ready > loop_return > foreground
  assertEquals(
    selectLiveNotice({ ...base, hasRestore: true, bgPrompt: 'offer', signal: 'weak', approxLocation: true, foregroundOnlyPlatform: true, loopHint: 'ready' }),
    'restore',
  );
  assertEquals(
    selectLiveNotice({ ...base, bgPrompt: 'offer', signal: 'weak', approxLocation: true, loopHint: 'ready' }),
    'bg_offer',
  );
  assertEquals(
    selectLiveNotice({ ...base, signal: 'weak', approxLocation: true, loopHint: 'ready' }),
    'signal_weak',
  );
  assertEquals(
    selectLiveNotice({ ...base, approxLocation: true, loopHint: 'ready' }),
    'precise',
  );
  assertEquals(selectLiveNotice({ ...base, loopHint: 'ready', foregroundOnlyPlatform: true }), 'loop_ready');
  assertEquals(selectLiveNotice({ ...base, loopHint: 'return', foregroundOnlyPlatform: true }), 'loop_return');
  // La note plate cède à tout : elle ne s'affiche que seule.
  assertEquals(selectLiveNotice({ ...base, foregroundOnlyPlatform: true }), 'foreground');
  assertEquals(selectLiveNotice({ ...base, bgPrompt: 'denied' }), 'foreground');
});

Deno.test('foreground ne masque JAMAIS « boucle prête » (régression web)', () => {
  // Sur navigateur foregroundOnlyPlatform est toujours vrai : la boucle doit primer.
  assertEquals(
    selectLiveNotice({ ...base, foregroundOnlyPlatform: true, loopHint: 'ready' }),
    'loop_ready',
  );
});
