/**
 * GRYD — E78 : la ligne « appareils » ne peut ni inventer une session, ni peindre
 * une action impossible. Tests PURS (Deno), zéro import React.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  otherDevicesActionable,
  otherDevicesState,
  otherDevicesVisible,
  type OtherDevicesInput,
} from './otherDevices.ts';

/** Cas nominal : compte ouvert, rien en vol, rien tenté. */
function base(over: Partial<OtherDevicesInput> = {}): OtherDevicesInput {
  return {
    sessionLoading: false,
    configured: true,
    signedIn: true,
    busy: false,
    lastResult: 'none',
    ...over,
  };
}

Deno.test('un chargement n’affirme RIEN sur le compte', () => {
  // La fenêtre de restauration : `signedIn` est faux sans que ce soit une
  // absence de compte. Dire « pas de compte » ici serait un mensonge bref.
  assertEquals(otherDevicesState(base({ sessionLoading: true, signedIn: false })), 'unknown');
  // Et il prime même sur un backend absent : on ne sait pas, point.
  assertEquals(
    otherDevicesState(base({ sessionLoading: true, configured: false, signedIn: false })),
    'unknown',
  );
  assert(!otherDevicesVisible('unknown'), 'une ligne est peinte alors qu’on ne sait rien');
});

Deno.test('sans backend, l’action est nommée absente — jamais offerte', () => {
  const state = otherDevicesState(base({ configured: false, signedIn: false }));
  assertEquals(state, 'noBackend');
  assert(!otherDevicesActionable(state), 'un bouton mort est peint dans un build sans backend');
  assert(otherDevicesVisible(state), 'l’absence doit être DITE, pas masquée');
});

Deno.test('sans session, il n’y a aucune autre session à révoquer', () => {
  const state = otherDevicesState(base({ signedIn: false }));
  assertEquals(state, 'signedOut');
  assert(!otherDevicesActionable(state), 'l’action est peinte alors qu’elle échouerait à coup sûr');
});

Deno.test('les trois issues d’une tentative ne se confondent pas', () => {
  assertEquals(otherDevicesState(base({ busy: true })), 'busy');
  assertEquals(otherDevicesState(base({ lastResult: 'ok' })), 'done');
  assertEquals(otherDevicesState(base({ lastResult: 'error' })), 'failed');
  // Un échec reste actionnable : réessayer est la seule suite utile.
  assert(otherDevicesActionable('failed'), 'un échec ferme la porte au lieu de proposer un retry');
  // Une révocation en vol ne se relance pas.
  assert(!otherDevicesActionable('busy'), 'la ligne reste pressable pendant l’appel');
});

Deno.test('« occupé » prime sur l’issue précédente', () => {
  // Sinon un second tap affiche « fait » pendant que l'appel est encore en vol.
  assertEquals(otherDevicesState(base({ busy: true, lastResult: 'ok' })), 'busy');
  assertEquals(otherDevicesState(base({ busy: true, lastResult: 'error' })), 'busy');
});

Deno.test('cas nominal : l’action est offerte, et une seconde fois après succès', () => {
  assertEquals(otherDevicesState(base()), 'ready');
  assert(otherDevicesActionable('ready'));
  // Un appareil a pu se reconnecter entre deux taps — re-révoquer est licite.
  assert(otherDevicesActionable('done'), 'la révocation devient impossible après un succès');
});
