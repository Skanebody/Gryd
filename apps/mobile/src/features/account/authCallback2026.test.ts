import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { AUTH_CALLBACK_URL_WAIT_MS, authCallbackVerdict2026, emailDelivery2026, parseAuthCallback2026, shouldAutoDetectAuth2026 } from './authCallback2026.ts';
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
