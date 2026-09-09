import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { emailDelivery2026, parseAuthCallback2026, shouldAutoDetectAuth2026 } from './authCallback2026.ts';

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
  assertEquals(emailDelivery2026(undefined), 'link');
  assertEquals(emailDelivery2026('link'), 'link');
  assertEquals(emailDelivery2026('code'), 'code');
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
