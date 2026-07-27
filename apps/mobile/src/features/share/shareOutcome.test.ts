/**
 * GRYD — E37 « Partage terminé » : on n'affirme un partage que si la plateforme
 * l'a dit, et l'annulation ne produit jamais d'écran de succès.
 */
import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  shareDeliveryClaim,
  shareDoneActions,
  shareOutcome,
  type ShareDoneActionId,
  type ShareOutcomePlatform,
  type ShareVia,
} from './shareOutcome.ts';

const PLATFORMS: readonly ShareOutcomePlatform[] = ['ios', 'android', 'web'];
const VIAS: readonly ShareVia[] = ['clipboard', 'share', 'webshare', 'image'];

// ═══ 1. CE QU'ON A LE DROIT D'AFFIRMER ══════════════════════════════════════

Deno.test('la copie presse-papiers est un fait certain — mais ce n’est pas un envoi', () => {
  for (const p of PLATFORMS) {
    assertEquals(shareDeliveryClaim('clipboard', p), 'copied');
  }
});

Deno.test('expo-sharing (image) ne rapporte JAMAIS l’issue : handed_off partout', () => {
  for (const p of PLATFORMS) {
    assertEquals(shareDeliveryClaim('image', p), 'handed_off');
  }
});

Deno.test('Share.share : seul iOS distingue une annulation, donc seul iOS confirme', () => {
  assertEquals(shareDeliveryClaim('share', 'ios'), 'confirmed');
  // Android : `ACTION_SEND` ne remonte pas l'issue, la promesse résout toujours
  // en `sharedAction`. Confirmer y serait une déduction, pas une mesure.
  assertEquals(shareDeliveryClaim('share', 'android'), 'handed_off');
  assertEquals(shareDeliveryClaim('share', 'web'), 'handed_off');
});

Deno.test('Web Share API : un ok est une vraie confirmation (l’annulation rejette)', () => {
  assertEquals(shareDeliveryClaim('webshare', 'web'), 'confirmed');
});

Deno.test('aucun canal ne produit une revendication hors des trois valeurs prévues', () => {
  for (const via of VIAS) {
    for (const p of PLATFORMS) {
      const c = shareDeliveryClaim(via, p);
      assert(c === 'copied' || c === 'confirmed' || c === 'handed_off', `${via}/${p} → ${c}`);
    }
  }
});

// ═══ 2. LA SURFACE — « toast ou petit écran selon canal » ═══════════════════

Deno.test('UNE ANNULATION NE DIT RIEN : aucune surface, aucune revendication', () => {
  for (const p of PLATFORMS) {
    const o = shareOutcome({ ok: false, reason: 'dismissed' }, p);
    assertEquals(o.surface, 'none');
    assertEquals(o.claim, null);
  }
});

Deno.test('« Partage terminé » ne peut PAS s’afficher après une annulation', () => {
  for (const p of PLATFORMS) {
    const o = shareOutcome({ ok: false, reason: 'dismissed' }, p);
    // Le panneau (le seul endroit où la phrase existe) n'est pas ouvert…
    assert(o.surface !== 'panel');
    // …et rien n'est revendiqué, donc aucune phrase ne peut être choisie.
    assertEquals(o.claim, null);
  }
});

Deno.test('un canal indisponible se DIT (toast), mais n’ouvre aucune suite', () => {
  const o = shareOutcome({ ok: false, reason: 'unavailable' }, 'ios');
  assertEquals(o.surface, 'toast');
  assertEquals(o.claim, null);
});

Deno.test('une copie reste un toast : rien à faire ensuite, rien à proposer', () => {
  for (const p of PLATFORMS) {
    const o = shareOutcome({ ok: true, via: 'clipboard' }, p);
    assertEquals(o.surface, 'toast');
    assertEquals(o.claim, 'copied');
  }
});

Deno.test('un canal EXTERNE ouvre le petit écran de succès (spec E37)', () => {
  assertEquals(shareOutcome({ ok: true, via: 'image' }, 'ios').surface, 'panel');
  assertEquals(shareOutcome({ ok: true, via: 'image' }, 'android').surface, 'panel');
  assertEquals(shareOutcome({ ok: true, via: 'share' }, 'ios').surface, 'panel');
  assertEquals(shareOutcome({ ok: true, via: 'webshare' }, 'web').surface, 'panel');
});

Deno.test('le panneau Android/expo-sharing ne revendique jamais mieux que handed_off', () => {
  // Le cas RÉEL du CTA chartreuse sur téléphone : la card est rasterisée puis
  // remise à `expo-sharing`. Le panneau s'ouvre, mais sa phrase décrit le geste.
  assertEquals(shareOutcome({ ok: true, via: 'image' }, 'ios').claim, 'handed_off');
  assertEquals(shareOutcome({ ok: true, via: 'share' }, 'android').claim, 'handed_off');
});

Deno.test('une revendication existe si et seulement si quelque chose a réussi', () => {
  for (const p of PLATFORMS) {
    for (const via of VIAS) {
      assert(shareOutcome({ ok: true, via }, p).claim !== null);
    }
    assertEquals(shareOutcome({ ok: false, reason: 'dismissed' }, p).claim, null);
    assertEquals(shareOutcome({ ok: false, reason: 'unavailable' }, p).claim, null);
  }
});

// ═══ 3. LES ACTIONS DU PANNEAU ═════════════════════════════════════════════

const ALL_CAPS = {
  resultReachable: true,
  linkAvailable: true,
  publicProfileReachable: true,
} as const;

Deno.test('« retour au résultat » est le CTA principal dès qu’il est atteignable', () => {
  assertEquals(shareDoneActions(ALL_CAPS).primary, 'back_to_result');
});

Deno.test('sans historique, le principal retombe sur une action qui, elle, marche', () => {
  const a = shareDoneActions({ ...ALL_CAPS, resultReachable: false });
  assertEquals(a.primary, 'share_again');
  // …et il n'est pas répété en secondaire (deux contrôles pour un geste = §A).
  assert(!a.secondary.includes('share_again'));
});

Deno.test('UN SEUL principal, jamais dupliqué en secondaire (§A : un CTA chartreuse)', () => {
  for (const resultReachable of [true, false]) {
    for (const linkAvailable of [true, false]) {
      for (const publicProfileReachable of [true, false]) {
        const a = shareDoneActions({ resultReachable, linkAvailable, publicProfileReachable });
        assert(!a.secondary.includes(a.primary), 'le principal est répété en secondaire');
        const seen = new Set<ShareDoneActionId>(a.secondary);
        assertEquals(seen.size, a.secondary.length, 'une action apparaît deux fois');
      }
    }
  }
});

Deno.test('AUCUN BOUTON MORT : rien n’est peint sans capacité réelle', () => {
  const a = shareDoneActions({
    resultReachable: false,
    linkAvailable: false,
    publicProfileReachable: false,
  });
  assertEquals(a.secondary, []);
  assertEquals(a.primary, 'share_again');
});

Deno.test('le profil public n’est PAS peint tant que la route n’existe pas', () => {
  // L'état RÉEL du dépôt au 27/07/2026 : aucune route de profil public.
  const a = shareDoneActions({ ...ALL_CAPS, publicProfileReachable: false });
  assert(!a.secondary.includes('public_profile'));
  // …et il apparaît le jour où elle existe, sans toucher à cette fonction.
  assert(shareDoneActions(ALL_CAPS).secondary.includes('public_profile'));
});

Deno.test('« copier le lien » n’apparaît que si un lien a été construit', () => {
  assert(shareDoneActions(ALL_CAPS).secondary.includes('copy_link'));
  assert(!shareDoneActions({ ...ALL_CAPS, linkAvailable: false }).secondary.includes('copy_link'));
});

Deno.test('l’ordre suit la spec : retour au résultat, lien, profil public', () => {
  const a = shareDoneActions(ALL_CAPS);
  assertEquals(a.primary, 'back_to_result');
  assertEquals(a.secondary[0], 'copy_link');
  assertEquals(a.secondary[1], 'public_profile');
});
