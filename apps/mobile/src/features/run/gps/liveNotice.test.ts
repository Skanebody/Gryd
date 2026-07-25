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
  // restore > bg_offer > weak > precise > foreground
  assertEquals(
    selectLiveNotice({ ...base, hasRestore: true, bgPrompt: 'offer', signal: 'weak', approxLocation: true, foregroundOnlyPlatform: true }),
    'restore',
  );
  assertEquals(
    selectLiveNotice({ ...base, bgPrompt: 'offer', signal: 'weak', approxLocation: true }),
    'bg_offer',
  );
  assertEquals(
    selectLiveNotice({ ...base, signal: 'weak', approxLocation: true }),
    'signal_weak',
  );
  assertEquals(selectLiveNotice({ ...base, approxLocation: true }), 'precise');
  // La note plate cède à tout : elle ne s'affiche que seule.
  assertEquals(selectLiveNotice({ ...base, foregroundOnlyPlatform: true }), 'foreground');
  assertEquals(selectLiveNotice({ ...base, bgPrompt: 'denied' }), 'foreground');
});

Deno.test('planche E07 : la fermeture de boucle n’occupe PLUS le slot d’avis', () => {
  // Elle est devenue un état PERMANENT (pill d'en-tête + segment sur la carte).
  // Le sélecteur n'en sait donc plus rien : aucune entrée, aucune sortie « loop_* ».
  const notices = [
    selectLiveNotice(base),
    selectLiveNotice({ ...base, foregroundOnlyPlatform: true }),
    selectLiveNotice({ ...base, signal: 'weak' }),
  ];
  for (const n of notices) {
    assertEquals(String(n).startsWith('loop'), false, `avis « ${n} » ne doit plus exister`);
  }
});
