/**
 * GRYD — un échec d'authentification ne dit pas toujours la même phrase.
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT : `AuthEntry2026.tsx` tenait un `useState(false)`
 * nommé `failed`, alimenté par `visibleFailure(result)`. Les six motifs que
 * `lib/auth.ts` calcule tombaient donc tous dans la MÊME phrase, « La connexion
 * a échoué. Réessaie ». « Sign in with Apple n'est pas disponible sur cet
 * appareil » invitait à réessayer un chemin qui ne peut pas exister.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  authFailureVoice2026,
  isSilentFailure2026,
  type AuthFailureReason2026,
} from './authFailure2026.ts';

Deno.test('un succès n’a aucune voix — il n’y a rien à dire', () => {
  assertEquals(authFailureVoice2026({ ok: true }), null);
});

Deno.test('annuler et « pas de chemin ici » restent SILENCIEUX', () => {
  for (const reason of ['cancelled', 'web_unsupported'] as const) {
    assertEquals(isSilentFailure2026({ ok: false, reason }), true);
    assertEquals(authFailureVoice2026({ ok: false, reason }), 'silent');
  }
});

Deno.test('une capacité absente ne se confond jamais avec une panne', () => {
  // Réessayer ne changera rien : l'appareil ne propose pas ce chemin.
  assertEquals(authFailureVoice2026({ ok: false, reason: 'apple_not_available' }), 'apple_unavailable');
  assertEquals(authFailureVoice2026({ ok: false, reason: 'google_not_configured' }), 'google_not_configured');
  // Réessayer a du sens : le système a dit oui, la tentative a échoué.
  assertEquals(authFailureVoice2026({ ok: false, reason: 'auth_error' }), 'generic');
  assertEquals(authFailureVoice2026({ ok: false, reason: 'no_identity_token' }), 'generic');
});

Deno.test('l’absence de backend a sa propre voix — jamais « réessaie »', () => {
  assertEquals(authFailureVoice2026({ ok: false, reason: 'supabase_not_configured' }), 'no_backend');
});

Deno.test('chaque motif connu reçoit une voix — aucun ne tombe dans un trou', () => {
  const reasons: AuthFailureReason2026[] = [
    'supabase_not_configured', 'google_not_configured', 'apple_not_available',
    'cancelled', 'no_identity_token', 'auth_error', 'web_unsupported',
  ];
  for (const reason of reasons) {
    const voice = authFailureVoice2026({ ok: false, reason });
    assertEquals(voice !== null, true, `${reason} n’a pas de voix`);
  }
});

Deno.test('les deux plateformes appliquent LA MÊME règle de silence', async () => {
  // ÉTAPE 0 : `lib/auth.ts` documentait « sans oublier web_unsupported » et ne
  // testait que `cancelled` ; `lib/auth.web.ts` testait les deux. Deux copies,
  // deux comportements. Il n'en reste qu'une, et les deux fichiers l'appellent.
  for (const file of ['auth.ts', 'auth.web.ts']) {
    const src = await Deno.readTextFile(new URL(`../../lib/${file}`, import.meta.url));
    assertEquals(src.includes('isSilentFailure2026(result)'), true, `${file} doit déléguer`);
    assertEquals(
      /export type AuthFailureReason\s*=\s*AuthFailureReason2026/.test(src),
      true,
      `${file} doit RÉEXPORTER le type, jamais le redéclarer`,
    );
  }
});
