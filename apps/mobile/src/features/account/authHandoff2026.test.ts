/**
 * GRYD — LA REMISE DE SESSION : CE QUI SE PROUVE SANS TÉLÉPHONE ET SANS COMPTE.
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT ROUGE ═══════════════════════════════════════════
 * Avant E5, `requestEmailOtp` posait `emailRedirectTo: AUTH_CALLBACK_URL` —
 * une adresse NUE, sans nonce. L'app ne gardait donc AUCUN secret partagé avec
 * la page web, et la page n'avait AUCUN endroit où déposer ce qu'elle venait de
 * vérifier : le seul chemin de retour était le lien universel, qui exige un
 * build qu'Apple n'a pas encore signé (`fe030292` ERRORED). C'est exactement le
 * défaut du fondateur — « derrière il faut que le compte fonctionne dans
 * l'application ».
 *
 * Ce fichier fige les quatre décisions que ce lot ajoute, et leurs revers :
 * la FORME du nonce, l'ADRESSE qui part dans l'e-mail, la LECTURE de ce que la
 * base rend, et le MOMENT où l'écran cesse d'attendre.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { AUTH_HANDOFF_2026, AUTH_HANDOFF_NONCE_PARAM_2026 } from '@klaim/shared';
import { AUTH_CALLBACK_DEEP_LINK, AUTH_CALLBACK_URL } from '../../lib/links.ts';
import {
  HANDOFF_NONCE_LENGTH_2026,
  handoffRedirectUrl2026,
  handoffStillWaiting2026,
  handoffWelcomeUrl2026,
  hexFromBytes2026,
  isHandoffNonce2026,
  parseHandoffClaim2026,
} from './authHandoff2026.ts';
import { callbackType2026 } from './welcome2026.ts';

const NONCE = 'a1b2c3d4'.repeat(8); // 64 caractères hexadécimaux

Deno.test('étape 0 — l’adresse de retour NUE ne porte aucun nonce, donc aucune remise', () => {
  // C'est l'état d'avant E5, rejoué : `AUTH_CALLBACK_URL` seule ne contient
  // rien que la page web puisse rattacher à l'appareil qui a demandé le lien.
  assertEquals(AUTH_CALLBACK_URL.includes(`${AUTH_HANDOFF_NONCE_PARAM_2026}=`), false);
  assertEquals(new URL(AUTH_CALLBACK_URL).searchParams.get(AUTH_HANDOFF_NONCE_PARAM_2026), null);
});

Deno.test('la longueur du nonce est DÉRIVÉE des octets tirés, jamais écrite à la main', () => {
  assertEquals(HANDOFF_NONCE_LENGTH_2026, AUTH_HANDOFF_2026.nonceBytes * 2);
  // 256 bits : le minimum exigé était 128, on tire le double (voir game-rules).
  assert(AUTH_HANDOFF_2026.nonceBytes * 8 >= 128);
});

Deno.test('octets → hexadécimal : longueur exacte, minuscules, zéros conservés', () => {
  assertEquals(hexFromBytes2026(new Uint8Array([0, 1, 15, 16, 255])), '00010f10ff');
  const bytes = new Uint8Array(AUTH_HANDOFF_2026.nonceBytes).fill(0);
  assertEquals(hexFromBytes2026(bytes).length, HANDOFF_NONCE_LENGTH_2026);
  // Un octet tout à zéro ne doit PAS se résorber en « 0 » : la longueur est la
  // preuve d'entropie que la base contrôle (0198 refuse hors 64-128).
  assertEquals(hexFromBytes2026([0]), '00');
  assertEquals(hexFromBytes2026([]), '');
});

Deno.test('la forme du nonce est celle que la base acceptera, et rien d’autre', () => {
  assert(isHandoffNonce2026(NONCE));
  assertEquals(isHandoffNonce2026(NONCE.toUpperCase()), false); // 0198 exige des minuscules
  assertEquals(isHandoffNonce2026(NONCE.slice(0, 63)), false);
  assertEquals(isHandoffNonce2026(`${NONCE}0`), false);
  assertEquals(isHandoffNonce2026('zz'.repeat(32)), false);
  assertEquals(isHandoffNonce2026(''), false);
  assertEquals(isHandoffNonce2026(null), false);
  assertEquals(isHandoffNonce2026(undefined), false);
});

Deno.test('l’adresse de retour porte le nonce en PREMIER paramètre', () => {
  const url = handoffRedirectUrl2026(AUTH_CALLBACK_URL, NONCE);
  assertEquals(url, `${AUTH_CALLBACK_URL}?${AUTH_HANDOFF_NONCE_PARAM_2026}=${NONCE}`);
  // Le gabarit d'e-mail accroche ensuite `&token_hash=…&type=…` : l'adresse
  // complète doit rester lisible par un navigateur.
  const complete = new URL(`${url}&token_hash=pkce_abc&type=signup`);
  assertEquals(complete.searchParams.get(AUTH_HANDOFF_NONCE_PARAM_2026), NONCE);
  assertEquals(complete.searchParams.get('token_hash'), 'pkce_abc');
  assertEquals(complete.searchParams.get('type'), 'signup');
});

Deno.test('une base qui a déjà une query reçoit le nonce avec « & »', () => {
  const url = handoffRedirectUrl2026('http://localhost:8081/callback?x=1', NONCE);
  assertEquals(url, `http://localhost:8081/callback?x=1&${AUTH_HANDOFF_NONCE_PARAM_2026}=${NONCE}`);
});

Deno.test('un nonce malformé ne corrompt PAS l’adresse : on retombe sur le parcours E4', () => {
  for (const bad of ['', 'abc', null, undefined, NONCE.toUpperCase()]) {
    assertEquals(handoffRedirectUrl2026(AUTH_CALLBACK_URL, bad), AUTH_CALLBACK_URL);
  }
});

Deno.test('la lecture de la réclamation exige un jeton, et ne devine aucun type', () => {
  assertEquals(parseHandoffClaim2026({ refresh_token: 'r-1', type: 'signup' }), {
    refreshToken: 'r-1',
    type: 'signup',
  });
  assertEquals(parseHandoffClaim2026({ refresh_token: 'r-1', type: null }), {
    refreshToken: 'r-1',
    type: null,
  });
  // Un type inconnu ne devient jamais `signup` : féliciter quelqu'un qui
  // revient serait le mensonge que `welcomeKind2026` existe pour empêcher.
  assertEquals(parseHandoffClaim2026({ refresh_token: 'r-1', type: 'bidon' }), {
    refreshToken: 'r-1',
    type: null,
  });
});

Deno.test('tous les refus de la réclamation se lisent « null », sans exception', () => {
  for (
    const payload of [
      null,
      undefined,
      {},
      [],
      'r-1',
      42,
      { refresh_token: '' },
      { refresh_token: '   ' },
      { refresh_token: 123 },
      { type: 'signup' },
    ]
  ) {
    assertEquals(parseHandoffClaim2026(payload), null);
  }
});

Deno.test('l’écran attend plus longtemps que la remise ne vit — et pas l’inverse', () => {
  // Le dépôt peut arriver à la dernière seconde du TTL : l'app doit encore
  // être là pour le prendre. Cette inégalité EST la garantie.
  assert(AUTH_HANDOFF_2026.pollForMs > AUTH_HANDOFF_2026.ttlS * 1000);
  const t0 = 1_000_000;
  assert(handoffStillWaiting2026(t0, t0));
  assert(handoffStillWaiting2026(t0, t0 + AUTH_HANDOFF_2026.ttlS * 1000));
  assert(handoffStillWaiting2026(t0, t0 + AUTH_HANDOFF_2026.pollForMs - 1));
  assertEquals(handoffStillWaiting2026(t0, t0 + AUTH_HANDOFF_2026.pollForMs), false);
  assertEquals(handoffStillWaiting2026(t0, t0 + AUTH_HANDOFF_2026.pollForMs + 1), false);
});

Deno.test('une horloge qui recule ne conclut rien : on continue d’attendre', () => {
  assert(handoffStillWaiting2026(1_000_000, 900_000));
  assertEquals(handoffStillWaiting2026(Number.NaN, 1_000), false);
  assertEquals(handoffStillWaiting2026(1_000, Number.POSITIVE_INFINITY), false);
});

Deno.test('la cadence reste humaine : 3 s, et jamais moins d’une seconde', () => {
  assertEquals(AUTH_HANDOFF_2026.pollEveryMs, 3_000);
  assert(AUTH_HANDOFF_2026.pollEveryMs >= 1_000);
});

Deno.test('l’accueil relit le type par le MÊME chemin que le lien e-mail', () => {
  const url = handoffWelcomeUrl2026(AUTH_CALLBACK_DEEP_LINK, 'signup');
  assert(url !== null);
  assertEquals(callbackType2026(url), 'signup');
  assertEquals(callbackType2026(handoffWelcomeUrl2026(AUTH_CALLBACK_DEEP_LINK, 'magiclink')), 'magiclink');
  // Type inconnu : aucune URL, donc l'accueil retombe sur ses autres sources.
  assertEquals(handoffWelcomeUrl2026(AUTH_CALLBACK_DEEP_LINK, null), null);
});

Deno.test('l’URL d’accueil ne porte AUCUN jeton — seulement le type', () => {
  const url = handoffWelcomeUrl2026(AUTH_CALLBACK_DEEP_LINK, 'signup') ?? '';
  for (const secret of ['token', 'refresh', 'access', AUTH_HANDOFF_NONCE_PARAM_2026 + '=']) {
    assertEquals(url.includes(secret), false, `l’URL d’accueil ne doit pas porter « ${secret} »`);
  }
});
