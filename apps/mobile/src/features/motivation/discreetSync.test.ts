/**
 * GRYD — LE MODE DISCRET : QUATRE ISSUES, JAMAIS TROIS.
 *
 * Ce test verrouille la partie PURE de `discreetSync.ts`. Ce qu'il protège est
 * précisément la faute qui a rendu le module nécessaire : croire qu'un réglage
 * de vie privée est appliqué serveur alors qu'il n'a jamais quitté le téléphone.
 * « Rien à écrire » et « je n'ai pas réussi à écrire » sont deux faits opposés
 * pour le joueur — les confondre reproduirait le mensonge sous une autre forme.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { discreetSyncNeedsWarning, discreetSyncOutcome } from './discreetSync.ts';

const USER = 'u-1';

Deno.test('sans backend configuré, on ne prétend rien avoir envoyé', () => {
  assertEquals(
    discreetSyncOutcome({ hasBackend: false, userId: USER, error: null, updatedRows: 1 }),
    'no_backend',
  );
});

Deno.test('sans session, il n’y a pas de profil à protéger — et on le dit', () => {
  assertEquals(
    discreetSyncOutcome({ hasBackend: true, userId: null, error: null, updatedRows: null }),
    'no_profile',
  );
});

Deno.test('zéro ligne mise à jour = aucun profil, PAS un succès', () => {
  // Le joueur n'a pas encore fait son profil minimal : aucune ligne
  // `user_profiles`, donc aucun classement ne le porte. Ce n'est pas un échec,
  // mais ce n'est pas non plus « envoyé au serveur ».
  assertEquals(
    discreetSyncOutcome({ hasBackend: true, userId: USER, error: null, updatedRows: 0 }),
    'no_profile',
  );
});

Deno.test('une ligne mise à jour = le serveur sait, et lui seul le prouve', () => {
  assertEquals(
    discreetSyncOutcome({ hasBackend: true, userId: USER, error: null, updatedRows: 1 }),
    'synced',
  );
});

Deno.test('une erreur d’écriture est un ÉCHEC — jamais un « rien à faire »', () => {
  assertEquals(
    discreetSyncOutcome({
      hasBackend: true,
      userId: USER,
      error: { message: 'permission denied' },
      updatedRows: null,
    }),
    'failed',
  );
  // Réponse sans erreur MAIS sans compte de lignes : on ne sait pas, donc on ne
  // rassure pas. L'incertitude penche du côté du joueur, pas du confort.
  assertEquals(
    discreetSyncOutcome({ hasBackend: true, userId: USER, error: null, updatedRows: null }),
    'failed',
  );
});

Deno.test('seul l’échec alerte : les deux « rien à écrire » ne crient pas au loup', () => {
  assert(discreetSyncNeedsWarning('failed'));
  assert(!discreetSyncNeedsWarning('synced'));
  assert(!discreetSyncNeedsWarning('no_backend'));
  assert(!discreetSyncNeedsWarning('no_profile'));
});
