import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { AUTH_CALLBACK_URL_WAIT_MS, TOKEN_HASH_FALLBACK_TYPE, authCallbackVerdict2026, emailDelivery2026, parseAuthCallback2026, shouldAutoDetectAuth2026, webPathnameForAuthDetect2026 } from './authCallback2026.ts';
import { linkVerdictFromParams } from './emailLink.ts';

Deno.test('un callback dédié ne consomme pas son code deux fois via le SDK et son écran', () => {
  assertEquals(shouldAutoDetectAuth2026('web', '/callback'), false);
  assertEquals(shouldAutoDetectAuth2026('web', '/callback/'), false);
  assertEquals(shouldAutoDetectAuth2026('ios', '/callback'), false);
  assertEquals(shouldAutoDetectAuth2026('android', '/callback'), false);
});

Deno.test('les anciens retours web hors callback conservent la détection de session', () => {
  assertEquals(shouldAutoDetectAuth2026('web', '/'), true);
  assertEquals(shouldAutoDetectAuth2026('web', '/account/email'), true);
  assertEquals(shouldAutoDetectAuth2026('web', null), false);
});

/**
 * ═══ E4 — LE LIEN DIRECT, CE QUE L'APP EN LIT ═══════════════════════════════
 * ÉTAPE 0 : `parseAuthCallback2026` ne connaissait que `?code=` et
 * `#access_token=`. Un lien `?token_hash=…&type=…` rendait donc `{ kind:
 * 'none' }` — l'app attendait trois secondes puis disait « aucun retour n'est
 * arrivé », sur un lien parfaitement valide qu'elle tenait en main.
 */
Deno.test('lien direct : le haché et son type sont lus dans la query', () => {
  assertEquals(
    parseAuthCallback2026('https://gryd.run/callback?token_hash=pkce_a1b2&type=signup'),
    { kind: 'token_hash', tokenHash: 'pkce_a1b2', type: 'signup' },
  );
  assertEquals(
    parseAuthCallback2026('gryd://callback?token_hash=h9&type=magiclink'),
    { kind: 'token_hash', tokenHash: 'h9', type: 'magiclink' },
  );
  // La forme à slash final que l'export statique produit, et qu'Apple déclare.
  assertEquals(
    parseAuthCallback2026('https://gryd.run/callback/?token_hash=h9&type=recovery'),
    { kind: 'token_hash', tokenHash: 'h9', type: 'recovery' },
  );
});

Deno.test('lien direct sans type lisible : on vérifie ce que GoTrue COUVRE', () => {
  // `email` couvre `signup` ET `magiclink` côté serveur — les deux seuls
  // gabarits que GRYD émet avec un haché. Ce n'est donc pas une devinette.
  assertEquals(TOKEN_HASH_FALLBACK_TYPE, 'email');
  assertEquals(parseAuthCallback2026('https://gryd.run/callback?token_hash=h9'), {
    kind: 'token_hash', tokenHash: 'h9', type: 'email',
  });
  assertEquals(parseAuthCallback2026('https://gryd.run/callback?token_hash=h9&type=magie'), {
    kind: 'token_hash', tokenHash: 'h9', type: 'email',
  });
});

Deno.test('un haché vide n’est pas un haché', () => {
  // Un client mail qui coupe l'adresse après le `=`. On ne demande pas au
  // serveur de vérifier du vide : il répondrait « lien invalide » et l'app
  // accuserait un lien qui était bon.
  assertEquals(
    parseAuthCallback2026('https://gryd.run/callback?token_hash=&type=signup'),
    { kind: 'none' },
  );
});

Deno.test('une erreur du serveur gagne sur le haché', () => {
  assertEquals(
    parseAuthCallback2026(
      'https://gryd.run/callback?error=access_denied&error_code=otp_expired&token_hash=h9',
    ),
    { kind: 'error', message: 'access_denied' },
  );
});

Deno.test('un lien direct N’EST PAS une session : l’écran attend le serveur', () => {
  const parsed = parseAuthCallback2026('https://gryd.run/callback?token_hash=h9&type=signup');
  // Tant que l'échange n'a pas eu lieu, aucun verdict — même le délai écoulé ne
  // permet pas de dire « aucun retour » : il y en a un, il est en cours.
  assertEquals(
    authCallbackVerdict2026({ parsed, waited: true, exchanged: false, linkVerdict: null }),
    null,
  );
  // Haché périmé ou déjà servi : GoTrue nomme l'expiration, l'écran la nomme.
  assertEquals(
    authCallbackVerdict2026({
      parsed,
      waited: true,
      exchanged: true,
      exchangeMessage: 'Email link is invalid or has expired',
      linkVerdict: null,
    }),
    'expired',
  );
});

Deno.test('callback Supabase lit un code PKCE natif sans dépendre du chemin', () => {
  assertEquals(parseAuthCallback2026('gryd://callback?code=pkce-demo'), {
    kind: 'pkce', code: 'pkce-demo',
  });
});

Deno.test('callback Supabase lit une session implicite placée dans le fragment', () => {
  assertEquals(parseAuthCallback2026('gryd://callback#access_token=a&refresh_token=r'), {
    kind: 'tokens', accessToken: 'a', refreshToken: 'r',
  });
});

Deno.test('callback incomplet ne fabrique jamais une session', () => {
  assertEquals(parseAuthCallback2026('gryd://callback#access_token=a'), { kind: 'none' });
  assertEquals(parseAuthCallback2026('pas une url'), { kind: 'none' });
});

Deno.test('une erreur fournisseur gagne sur les paramètres de session', () => {
  assertEquals(
    parseAuthCallback2026('gryd://callback?error=access_denied&code=ignored'),
    { kind: 'error', message: 'access_denied' },
  );
});

Deno.test('le lien reste le défaut tant que le template OTP n’est pas déclaré', () => {
  // ÉTAPE 0 — cette suite figeait le défaut : sa dernière ligne attendait
  // `emailDelivery2026('code') === 'code'`, c'est-à-dire qu'une variable
  // d'environnement CLIENT suffise à décider ce que le SERVEUR envoie. L'écran
  // réclamait alors six chiffres qu'aucun e-mail ne contenait.
  for (const raw of [undefined, 'link', 'code', 'CODE', 'otp']) {
    assertEquals(emailDelivery2026(raw, false), 'link');
  }
  // La preuve n'ouvre `'code'` que si la variable le demande AUSSI : elle
  // autorise, elle ne décide pas à la place du fondateur.
  assertEquals(emailDelivery2026('code', true), 'code');
  assertEquals(emailDelivery2026('link', true), 'link');
  assertEquals(emailDelivery2026(undefined, true), 'link');
});

Deno.test('aucun appelant ne prétend disposer de la preuve du gabarit OTP', async () => {
  // Le seul argument acceptable aujourd'hui est un `false` littéral, greppable.
  for (const file of ['auth.ts', 'auth.web.ts']) {
    const src = await Deno.readTextFile(new URL(`../../lib/${file}`, import.meta.url));
    const call = src.slice(src.indexOf('emailDelivery2026('));
    assertEquals(
      /emailDelivery2026\(\s*process\.env\.EXPO_PUBLIC_EMAIL_AUTH_MODE,\s*false,\s*\)/.test(call.slice(0, 200)),
      true,
      `${file} doit passer \`false\` : aucune source ne prouve le gabarit OTP`,
    );
  }
});

Deno.test('le template OTP est versionné sans être activé seul dans le projet local', async () => {
  const template = await Deno.readTextFile(
    new URL('../../../../../supabase/templates/magic_link_otp.html', import.meta.url),
  );
  const config = await Deno.readTextFile(
    new URL('../../../../../supabase/config.toml', import.meta.url),
  );
  assertEquals(template.includes('{{ .Token }}'), true);
  assertEquals(template.includes('{{ .ConfirmationURL }}'), false);
  assertEquals(config.includes('\n[auth.email.template.magic_link]\n'), false);
  assertEquals(config.includes('\n[auth.email.template.confirmation]\n'), false);
  assertEquals(config.includes('# [auth.email.template.magic_link]'), true);
  assertEquals(config.includes('# [auth.email.template.confirmation]'), true);
});


// ═══ LE RETOUR DE LIEN MAGIQUE DIT CE QUI S'EST PASSÉ ═══════════════════════
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT : `app/(auth)/callback.tsx` n'avait qu'un booléen
// `failed` et UNE phrase (`C.callbackFailed`, « Ce retour de connexion n'est
// plus valide. Demande un nouveau lien. ») pour quatre faits opposés. Pire, il
// posait `setFailed(true)` dès que `Linking.useLinkingURL()` rendait `null` —
// c'est-à-dire au tout premier rendu d'un lancement à froid, avant que le
// système ait pu répondre.
const parse = (url: string | null) => parseAuthCallback2026(url);

Deno.test('un lien expiré le dit — et ne se confond pas avec un lien tronqué', () => {
  const expired = parse('gryd://callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  assertEquals(authCallbackVerdict2026({
    parsed: expired, waited: true, exchanged: false,
    linkVerdict: linkVerdictFromParams({ error_description: expired.kind === 'error' ? expired.message : undefined }),
  }), 'expired');

  const broken = parse('gryd://callback?error=access_denied');
  assertEquals(authCallbackVerdict2026({
    parsed: broken, waited: true, exchanged: false,
    linkVerdict: linkVerdictFromParams({ error_description: broken.kind === 'error' ? broken.message : undefined }),
  }), 'invalid');
});

Deno.test('une panne réseau pendant l’échange n’accuse jamais le lien', () => {
  const parsed = parse('gryd://callback?code=abc123');
  assertEquals(authCallbackVerdict2026({
    parsed, waited: true, exchanged: true, exchangeMessage: 'Network request failed', linkVerdict: null,
  }), 'network');
  assertEquals(authCallbackVerdict2026({
    parsed, waited: true, exchanged: true, exchangeMessage: 'Token has expired', linkVerdict: null,
  }), 'expired');
  assertEquals(authCallbackVerdict2026({
    parsed, waited: true, exchanged: true, exchangeMessage: 'invalid request: both auth code and code verifier should be non-empty', linkVerdict: null,
  }), 'invalid');
  // Un refus sans message ne se devine pas.
  assertEquals(authCallbackVerdict2026({
    parsed, waited: true, exchanged: true, linkVerdict: null,
  }), 'unknown');
});

Deno.test('tant que l’URL n’est pas arrivée, l’écran n’affirme RIEN', () => {
  const nothing = parse(null);
  assertEquals(authCallbackVerdict2026({ parsed: nothing, waited: false, exchanged: false, linkVerdict: null }), null);
  assertEquals(authCallbackVerdict2026({ parsed: nothing, waited: true, exchanged: false, linkVerdict: null }), 'no_return');
  assertEquals(AUTH_CALLBACK_URL_WAIT_MS > 0, true);
});

Deno.test('un retour VALIDE en cours d’échange n’est pas un échec', () => {
  const parsed = parse('gryd://callback?code=abc123');
  assertEquals(authCallbackVerdict2026({ parsed, waited: true, exchanged: false, linkVerdict: null }), null);
});

Deno.test('l’écran de retour ne conclut plus sur un premier `url` nul', async () => {
  // ÉTAPE 0 : `app/(auth)/callback.tsx` ouvrait son effet par
  //     if (!url) { setFailed(true); return () => { … }; }
  // — donc il déclarait l'échec au tout premier rendu d'un lancement à froid,
  // avant que le système ait remis l'URL.
  const src = (await Deno.readTextFile(new URL('../../../app/(auth)/callback.tsx', import.meta.url)))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('{/*') && !l.trim().startsWith('*'))
    .join('\n');
  assertEquals(/if\s*\(\s*!url\s*\)\s*\{?\s*set[A-Za-z]*\(\s*true/.test(src), false,
    'aucune conclusion d’échec sur l’absence d’URL : c’est le délai qui tranche');
  assertEquals(src.includes('AUTH_CALLBACK_URL_WAIT_MS'), true, 'le délai d’attente doit être armé');
  assertEquals(src.includes('authCallbackVerdict2026'), true, 'le verdict vient du module PUR');
  assertEquals(src.includes('linkVerdictFromParams'), true,
    '`linkVerdictFromParams` distingue expiré/incomplet — elle n’avait aucun appelant');
  // Quatre faits, quatre phrases : plus un seul message pour tout.
  for (const copy of ['callbackNetwork', 'callbackNoReturn', 'expiredTitle', 'errorLinkInvalid']) {
    assertEquals(src.includes(copy), true, `la copie ${copy} doit être rendue`);
  }
});

// ─── window SANS location : le cas React Native (bug du 09/09 → 11/09/2026) ─────
Deno.test("webPathnameForAuthDetect2026 : sur natif, window existe sans location → null, sans jeter", () => {
  const rnWindow = {} as unknown; // global.window = global, aucune `location`
  assertEquals(webPathnameForAuthDetect2026('ios', rnWindow), null);
  assertEquals(webPathnameForAuthDetect2026('android', rnWindow), null);
  assertEquals(webPathnameForAuthDetect2026('ios', { location: { pathname: '/x' } }), null);
});

Deno.test('webPathnameForAuthDetect2026 : sur web, le pathname réel ; sans location ou sans window → null', () => {
  assertEquals(webPathnameForAuthDetect2026('web', { location: { pathname: '/callback' } }), '/callback');
  assertEquals(webPathnameForAuthDetect2026('web', {}), null);
  assertEquals(webPathnameForAuthDetect2026('web', null), null);
  assertEquals(webPathnameForAuthDetect2026('web', undefined), null);
  assertEquals(webPathnameForAuthDetect2026('web', { location: { pathname: 42 } }), null);
});

Deno.test('la chaîne complète : natif → jamais de détection automatique ; web hors /callback → détection', () => {
  assertEquals(shouldAutoDetectAuth2026('ios', webPathnameForAuthDetect2026('ios', {})), false);
  assertEquals(shouldAutoDetectAuth2026('web', webPathnameForAuthDetect2026('web', { location: { pathname: '/' } })), true);
  assertEquals(shouldAutoDetectAuth2026('web', webPathnameForAuthDetect2026('web', { location: { pathname: '/callback' } })), false);
});
