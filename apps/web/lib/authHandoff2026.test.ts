/**
 * GRYD — CE QUE LA PAGE `gryd.run/callback` A LE DROIT DE FAIRE, ET DE DIRE.
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT ROUGE ═══════════════════════════════════════════
 * En E4, cette page ne vérifiait RIEN : elle lisait le lien et tendait un
 * bouton `gryd://callback?token_hash=…`. Sur un iPhone où le lien universel ne
 * fonctionne pas (la capacité Apple « Associated Domains » manque au profil de
 * signature : build `fe030292` ERRORED), ce bouton est le seul chemin, et il
 * suppose que l'app réponde au schéma privé, ce qu'un navigateur intégré de
 * webmail ne garantit pas. Sur un ORDINATEUR, il ne mène nulle part du tout.
 *
 * Le fondateur, 12/09/2026 : « vas juste vers une page qui dit que ça a été
 * bien validé mais derrière il faut que le compte fonctionne dans
 * l'application ».
 *
 * Ce fichier fige les décisions du nouveau chemin, ET la garantie qui compte
 * autant : sans nonce, RIEN ne change — les liens partis avant ce lot gardent
 * exactement le comportement E4.
 *
 * ⚠ POURQUOI AUCUN IMPORT EXTERNE ET UN `Deno` DÉCLARÉ LOCALEMENT — même
 * arbitrage que `authCallbackLink2026.test.ts`, mot pour mot. Ce fichier est lu
 * par DEUX outils aux attentes opposées : Deno l'exécute (`npm run test:web`),
 * et `tsc --noEmit` le typecheck (il tombe sous `include: ["**\/*.ts"]` de
 * `apps/web/tsconfig.json`, donc aussi pendant `next build`). Un spécificateur
 * `https://deno.land/std…` fait échouer `tsc`, et `/// <reference lib="deno.ns" />`
 * le fait échouer aussi (il ne connaît pas cette lib). Une déclaration de
 * portée module et deux assertions locales satisfont les deux.
 *
 * `@klaim/shared` est en revanche un import RÉEL, et il doit l'être : les
 * constantes de la remise sont exactement ce qui doit rester identique entre
 * l'app qui tire le nonce, la page qui le relit et la migration qui le hache.
 * Les recopier ici ferait trois sources pour un seul nombre.
 */
import { AUTH_HANDOFF_2026, AUTH_HANDOFF_NONCE_PARAM_2026 } from '@klaim/shared';
import {
  HANDOFF_NONCE_MIN_LENGTH_2026,
  handoffCleanUrl2026,
  handoffFailureKind2026,
  handoffIsNewAccount2026,
  handoffNonce2026,
  handoffPlan2026,
} from './authHandoff2026.ts';
import { readAuthCallbackLink2026 } from './authCallbackLink2026.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

/** Égalité STRUCTURELLE : les plans rendus sont des objets, jamais des références. */
function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  const equal = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => equal(v, b[i]));
    }
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      const ka = Object.keys(a as Record<string, unknown>).sort();
      const kb = Object.keys(b as Record<string, unknown>).sort();
      return ka.length === kb.length && ka.every((k, i) => k === kb[i]) &&
        ka.every((k) => equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
    }
    return false;
  };
  if (!equal(actual, expected)) {
    throw new Error(message ?? `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

function assert(condition: boolean, message = 'condition fausse'): void {
  if (!condition) throw new Error(message);
}

const NONCE = 'a1b2c3d4'.repeat(8); // 64 caractères hexadécimaux
const HASH = 'pkce_9f3a91c04e7b2d18a6c5';
const n = AUTH_HANDOFF_NONCE_PARAM_2026;

const search = (params: Record<string, string>) =>
  `?${new URLSearchParams(params).toString()}`;

Deno.test('étape 0 — sans nonce, le plan est celui de E4, mot pour mot', () => {
  const location = { search: search({ token_hash: HASH, type: 'signup' }), hash: '' };
  const plan = handoffPlan2026(location);
  assertEquals(plan.mode, 'link');
  if (plan.mode !== 'link') throw new Error('mode inattendu');
  // Le verdict n'est pas recalculé : c'est LE MÊME objet que E4 produisait.
  assertEquals(plan.view, readAuthCallbackLink2026(location));
  assertEquals(plan.view.kind, 'token_hash');
  assert(plan.view.appUrl !== null && plan.view.appUrl.startsWith('gryd://callback?'));
});

Deno.test('avec un nonce ET un haché, la page vérifie — et elle seule', () => {
  const plan = handoffPlan2026({
    search: search({ [n]: NONCE, token_hash: HASH, type: 'signup' }),
    hash: '',
  });
  assertEquals(plan, { mode: 'handoff', nonce: NONCE, tokenHash: HASH, type: 'signup' });
});

Deno.test('la longueur minimale du nonce est DÉRIVÉE des octets tirés par l’app', () => {
  assertEquals(HANDOFF_NONCE_MIN_LENGTH_2026, AUTH_HANDOFF_2026.nonceBytes * 2);
});

Deno.test('un nonce de forme douteuse fait retomber sur E4, sans rien consommer', () => {
  for (const bad of ['', 'abc', NONCE.toUpperCase(), 'zz'.repeat(32), NONCE.slice(0, 63), 'f'.repeat(129)]) {
    const plan = handoffPlan2026({
      search: search({ [n]: bad, token_hash: HASH, type: 'signup' }),
      hash: '',
    });
    assertEquals(plan.mode, 'link', `nonce « ${bad.slice(0, 10)} » ne doit rien déclencher`);
  }
});

Deno.test('un type inconnu ne part JAMAIS au serveur', () => {
  for (const type of ['', 'bidon', 'SIGNUP', 'token']) {
    const plan = handoffPlan2026({
      search: search({ [n]: NONCE, token_hash: HASH, type }),
      hash: '',
    });
    assertEquals(plan.mode, 'link', `type « ${type} » ne doit rien déclencher`);
  }
});

Deno.test('les cinq types que verifyOtp sait échanger sont acceptés', () => {
  for (const type of ['signup', 'invite', 'magiclink', 'recovery', 'email_change']) {
    const plan = handoffPlan2026({
      search: search({ [n]: NONCE, token_hash: HASH, type }),
      hash: '',
    });
    assertEquals(plan.mode, 'handoff', `type « ${type} » doit être vérifiable`);
  }
});

Deno.test('un refus serveur passe AVANT tout : on ne consomme rien', () => {
  const plan = handoffPlan2026({
    search: search({
      [n]: NONCE,
      error: 'access_denied',
      error_code: 'otp_expired',
      error_description: 'Email link is invalid or has expired',
    }),
    hash: '',
  });
  assertEquals(plan.mode, 'link');
  if (plan.mode !== 'link') throw new Error('mode inattendu');
  assertEquals(plan.view.kind, 'expired');
  // Aucun bouton : l'app ne rattraperait pas ce que le serveur a déjà refusé.
  assertEquals(plan.view.appUrl, null);
});

Deno.test('une session déjà ouverte dans le fragment reste un parcours E4', () => {
  const plan = handoffPlan2026({
    search: search({ [n]: NONCE }),
    hash: `#${new URLSearchParams({ access_token: 'a', refresh_token: 'r', type: 'signup' }).toString()}`,
  });
  assertEquals(plan.mode, 'link');
  if (plan.mode !== 'link') throw new Error('mode inattendu');
  assertEquals(plan.view.kind, 'signup');
});

Deno.test('une adresse vide n’est ni une réussite ni un échec serveur', () => {
  const plan = handoffPlan2026({ search: '', hash: '' });
  assertEquals(plan.mode, 'link');
  if (plan.mode !== 'link') throw new Error('mode inattendu');
  assertEquals(plan.view.kind, 'incomplete');
});

Deno.test('le nonce se lit dans la query comme dans le fragment', () => {
  assertEquals(handoffNonce2026({ search: search({ [n]: NONCE }), hash: '' }), NONCE);
  assertEquals(handoffNonce2026({ search: '', hash: `#${n}=${NONCE}` }), NONCE);
  assertEquals(handoffNonce2026({ search: '', hash: '' }), null);
});

Deno.test('seul « signup » autorise une félicitation', () => {
  assertEquals(handoffIsNewAccount2026('signup'), true);
  for (const type of ['magiclink', 'recovery', 'email_change', 'invite'] as const) {
    assertEquals(handoffIsNewAccount2026(type), false, `« ${type} » n’est pas une création`);
  }
});

Deno.test('expiré et refusé ne se disent pas de la même façon', () => {
  assertEquals(handoffFailureKind2026('Email link is invalid or has expired'), 'expired');
  assertEquals(handoffFailureKind2026('Token has expired or is invalid'), 'expired');
  assertEquals(handoffFailureKind2026('Database error finding user'), 'failed');
  assertEquals(handoffFailureKind2026(''), 'failed');
  assertEquals(handoffFailureKind2026(null), 'failed');
  assertEquals(handoffFailureKind2026(undefined), 'failed');
});

Deno.test('l’adresse remise dans l’historique ne porte NI haché NI nonce', () => {
  assertEquals(handoffCleanUrl2026('/callback'), '/callback');
  assertEquals(handoffCleanUrl2026(`/callback?${n}=${NONCE}&token_hash=${HASH}`), '/callback');
  assertEquals(handoffCleanUrl2026('/callback#access_token=abc'), '/callback');
  assertEquals(handoffCleanUrl2026(''), '/callback');
  assertEquals(handoffCleanUrl2026(null), '/callback');
  // Un sous-chemin (export statique servi ailleurs) est conservé tel quel.
  assertEquals(handoffCleanUrl2026('/gryd/callback?x=1'), '/gryd/callback');
});
