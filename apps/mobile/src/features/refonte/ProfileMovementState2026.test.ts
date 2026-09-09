import { assertEquals } from 'jsr:@std/assert@^1';
import { profileMovementState2026 } from './ProfileMovementState2026.ts';
Deno.test('profil : un échec de lecture n’est jamais peint comme un profil vide', () => {
  // Le défaut : `failed` et `unavailable` n’avaient pas de donnée, donc l’écran
  // affichait l’invitation « Tout commence dehors » — une affirmation fausse.
  assertEquals(profileMovementState2026({ status: 'failed', activeDays: null }), 'failed');
  assertEquals(profileMovementState2026({ status: 'unavailable', activeDays: null }), 'unavailable');
});
Deno.test('profil : les six états du chiffre héros restent distincts', () => {
  assertEquals(profileMovementState2026({ status: 'loading', activeDays: null }), 'loading');
  assertEquals(profileMovementState2026({ status: 'signed-out', activeDays: null }), 'guest');
  assertEquals(profileMovementState2026({ status: 'ready', activeDays: 0 }), 'empty');
  assertEquals(profileMovementState2026({ status: 'ready', activeDays: 4 }), 'ready');
  // Lu sans mesure exploitable : on ne fabrique pas un zéro.
  assertEquals(profileMovementState2026({ status: 'ready', activeDays: null }), 'loading');
});
