import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { classifyProfileRead, shouldStartRead } from './firstRun.ts';

Deno.test('une erreur de lecture profil ne devient jamais un profil absent', () => {
  assertEquals(classifyProfileRead({ failed: true, rowFound: false }), 'unknown');
  assertEquals(classifyProfileRead({ failed: true, rowFound: true }), 'unknown');
});

Deno.test('une réponse serveur distingue profil présent et absent', () => {
  assertEquals(classifyProfileRead({ failed: false, rowFound: true }), 'present');
  assertEquals(classifyProfileRead({ failed: false, rowFound: false }), 'absent');
});

Deno.test('la sonde de profil ne se lance que lorsqu’elle peut répondre', () => {
  assertEquals(shouldStartRead({ configured: false, hasSession: true, inFlight: false, profile: 'idle' }), false);
  assertEquals(shouldStartRead({ configured: true, hasSession: false, inFlight: false, profile: 'idle' }), false);
  assertEquals(shouldStartRead({ configured: true, hasSession: true, inFlight: true, profile: 'idle' }), false);
  assertEquals(shouldStartRead({ configured: true, hasSession: true, inFlight: false, profile: 'idle' }), true);
  assertEquals(shouldStartRead({ configured: true, hasSession: true, inFlight: false, profile: 'unknown' }), true);
  assertEquals(shouldStartRead({ configured: true, hasSession: true, inFlight: false, profile: 'present' }), false);
});
