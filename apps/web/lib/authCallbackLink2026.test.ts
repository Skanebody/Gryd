/**
 * GRYD — tests de `readAuthCallbackLink2026` (page https://gryd.run/callback).
 *
 * ÉTAPE 0, LE DÉFAUT QU'ON MESURE : avant cette page, le lien de l'e-mail
 * pointait sur `gryd://callback`, un schéma privé que ni un client mail ni un
 * Mac n'ouvrent — le clic ne produisait littéralement rien (retour fondateur du
 * 12/09/2026, « le bouton pour s'inscrire mène vers rien du tout »). La page web
 * remplace ce néant ; ces tests vérifient qu'elle ne le remplace pas par une
 * félicitation infondée.
 *
 * ⚠ POURQUOI AUCUN IMPORT EXTERNE ET UN `Deno` DÉCLARÉ LOCALEMENT — même
 * arbitrage que `packages/shared/src/game-rules.test.ts` et
 * `packages/engine/src/polygon.test.ts`. Ce fichier est lu par DEUX outils aux
 * attentes opposées : Deno l'exécute (`npm run test:web`), et `tsc --noEmit` le
 * typecheck (il tombe sous `include: ["**\/*.ts"]` de `apps/web/tsconfig.json`,
 * donc aussi pendant `next build`). Un spécificateur `https://deno.land/std…`
 * fait échouer `tsc`, et la directive `/// <reference lib="deno.ns" />` fait
 * échouer `tsc` aussi (il ne connaît pas cette lib). Une déclaration de portée
 * module et trois assertions locales satisfont les deux.
 *
 * Purs : aucun DOM, aucun réseau, aucune horloge — comme le module testé.
 */
import { readAuthCallbackLink2026 } from './authCallbackLink2026.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

/** Égalité STRUCTURELLE : les vues rendues sont des objets, jamais des références partagées. */
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

/**
 * ═══ E4 — LE LIEN DIRECT (`?token_hash=…`) ══════════════════════════════════
 * ÉTAPE 0 : le gabarit d'e-mail visait `…supabase.co/auth/v1/verify?…`, qui
 * vérifie puis redirige. iOS ne remet PAS un lien universel à l'app au bout
 * d'une redirection, donc cette page se peignait TOUJOURS et il fallait
 * appuyer sur « Ouvrir GRYD ». Le gabarit vise maintenant cette page
 * directement ; elle reçoit un haché NON vérifié, et rendait `incomplete` —
 * c'est-à-dire « ce lien est incomplet » sur un lien parfaitement valide.
 */
Deno.test('un lien direct est transmis à l app, jamais consommé ici', () => {
  assertEquals(
    readAuthCallbackLink2026({ search: '?token_hash=pkce_a1b2&type=signup' }),
    { kind: 'token_hash', appUrl: 'gryd://callback?token_hash=pkce_a1b2&type=signup' },
  );
  assertEquals(
    readAuthCallbackLink2026({ search: '?token_hash=h9&type=magiclink' }).kind,
    'token_hash',
  );
});

Deno.test('un lien direct n est JAMAIS une félicitation : rien n a été vérifié', () => {
  // `type=signup` dit de quel gabarit vient le lien, pas qu'un compte est né :
  // seul le serveur peut le dire, et il ne l a pas encore fait.
  assertEquals(readAuthCallbackLink2026({ search: '?token_hash=h9&type=signup' }).kind !== 'signup', true);
});

Deno.test('un haché vide n est pas un haché', () => {
  assertEquals(readAuthCallbackLink2026({ search: '?token_hash=&type=signup' }).kind, 'incomplete');
});

Deno.test('l erreur passe AVANT le haché : un lien refusé ne s ouvre pas dans l app', () => {
  assertEquals(
    readAuthCallbackLink2026({
      search: '?error=access_denied&error_code=otp_expired&token_hash=h9&type=signup',
    }),
    { kind: 'expired', appUrl: null },
  );
});

Deno.test('une inscription est la SEULE félicitation, et la session part vers l app', () => {
  const view = readAuthCallbackLink2026({
    hash: '#access_token=aaa.bbb.ccc&refresh_token=rrr&expires_in=3600&token_type=bearer&type=signup',
  });
  assertEquals(view.kind, 'signup');
  assertEquals(
    view.appUrl,
    'gryd://callback#access_token=aaa.bbb.ccc&refresh_token=rrr&expires_in=3600&token_type=bearer&type=signup',
  );
});

Deno.test('un lien magique, une récupération et un changement d e-mail accueillent sans féliciter', () => {
  for (const type of ['magiclink', 'recovery', 'email_change']) {
    const view = readAuthCallbackLink2026({
      hash: `#access_token=a.b.c&refresh_token=r&type=${type}`,
    });
    assertEquals(view.kind, 'return', `type=${type}`);
    assertEquals(view.appUrl, `gryd://callback#access_token=a.b.c&refresh_token=r&type=${type}`);
  }
});

Deno.test('sans type déclaré, la session vaut un retour, jamais une inscription', () => {
  assertEquals(readAuthCallbackLink2026({ hash: '#access_token=a.b.c&refresh_token=r' }).kind, 'return');
});

Deno.test('un access_token SEUL ne fait pas une session : l app n en ferait rien', () => {
  // Miroir de `parseAuthCallback2026` (mobile), qui rend `none` dans ce cas précis.
  assertEquals(readAuthCallbackLink2026({ hash: '#access_token=a.b.c&type=signup' }), {
    kind: 'incomplete',
    appUrl: null,
  });
});

Deno.test('le fragment reste le fragment : avec ou sans son dièse, il se lit pareil', () => {
  assertEquals(
    readAuthCallbackLink2026({ hash: '#access_token=a&refresh_token=r&type=signup' }),
    readAuthCallbackLink2026({ hash: 'access_token=a&refresh_token=r&type=signup' }),
  );
});

Deno.test('un lien expiré est nommé expiré, dans le fragment comme dans la query', () => {
  assertEquals(
    readAuthCallbackLink2026({
      hash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    }),
    { kind: 'expired', appUrl: null },
  );
  assertEquals(
    readAuthCallbackLink2026({
      search: '?error=access_denied&error_code=otp_expired&error_description=Email%20link%20is%20invalid%20or%20has%20expired',
    }).kind,
    'expired',
  );
});

Deno.test('l expiration est reconnue même quand seule la description la nomme', () => {
  assertEquals(
    readAuthCallbackLink2026({
      hash: '#error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    }).kind,
    'expired',
  );
});

Deno.test('un refus qui n est pas une expiration ne se confond pas avec elle', () => {
  assertEquals(
    readAuthCallbackLink2026({
      hash: '#error=server_error&error_description=Database+error+saving+new+user',
    }),
    { kind: 'failed', appUrl: null },
  );
});

Deno.test('une erreur nue, sans code ni description, reste une erreur', () => {
  assertEquals(readAuthCallbackLink2026({ search: '?error=access_denied' }).kind, 'failed');
});

Deno.test('l erreur passe AVANT les jetons : un lien qui porte les deux est un refus', () => {
  assertEquals(
    readAuthCallbackLink2026({
      hash: '#access_token=a&refresh_token=r&type=signup&error=access_denied&error_code=otp_expired',
    }),
    { kind: 'expired', appUrl: null },
  );
});

Deno.test('un code PKCE accueille sans prétendre savoir si le compte vient de naître', () => {
  assertEquals(readAuthCallbackLink2026({ search: '?code=abc123' }), {
    kind: 'return',
    appUrl: 'gryd://callback?code=abc123',
  });
});

Deno.test('une adresse vide dit qu elle est incomplète, elle ne dit pas bienvenue', () => {
  assertEquals(readAuthCallbackLink2026({}), { kind: 'incomplete', appUrl: null });
  assertEquals(readAuthCallbackLink2026({ hash: '', search: '' }), { kind: 'incomplete', appUrl: null });
  assertEquals(readAuthCallbackLink2026({ hash: '#', search: '?' }), { kind: 'incomplete', appUrl: null });
  assertEquals(readAuthCallbackLink2026({ hash: null, search: null }), { kind: 'incomplete', appUrl: null });
});

Deno.test('un paramètre présent mais vide ne vaut pas une valeur', () => {
  assertEquals(readAuthCallbackLink2026({ search: '?code=' }).kind, 'incomplete');
  assertEquals(readAuthCallbackLink2026({ hash: '#access_token=&refresh_token=' }).kind, 'incomplete');
  assertEquals(readAuthCallbackLink2026({ hash: '#error=' }).kind, 'incomplete');
});

Deno.test('aucune adresse produite ne sort du schéma de l app', () => {
  const hostile = readAuthCallbackLink2026({
    hash: '#access_token=a&refresh_token=r&type=signup&next=https://exemple.invalide',
  });
  assertEquals(hostile.appUrl !== null && hostile.appUrl.startsWith('gryd://callback#'), true);
});
