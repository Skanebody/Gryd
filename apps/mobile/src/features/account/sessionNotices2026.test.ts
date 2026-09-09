/**
 * GRYD — UN FAIT DE SESSION QUE PERSONNE NE REND N'EXISTE PAS.
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il se mesure : au 09/09/2026, `src/lib/
 * session.tsx` était le SEUL fichier du dépôt à contenir le mot
 * `deletionCancelled`. Il le calculait (RPC `cancel_account_deletion`, 0046),
 * l'exposait, offrait même son acquittement — et aucun écran ne le lisait. Un
 * joueur qui avait demandé la suppression de son compte, puis se reconnectait
 * pendant le délai de grâce, voyait sa suppression annulée EN SILENCE. Le test
 * « au moins un rendu lit ce fait » échouait donc, forcément.
 *
 * Le second fait, `sessionExpired`, n'existait pas du tout : un `SIGNED_OUT`
 * issu d'un rafraîchissement raté renvoyait l'app en visiteur sans un mot.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  consumeIntentionalSignOut2026,
  forgetIntentionalSignOut2026,
  markIntentionalSignOut2026,
} from './signOutIntent2026.ts';

async function code(relPath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relPath, import.meta.url));
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('l’intention de déconnexion se CONSOMME — jamais un drapeau qu’on relit', () => {
  forgetIntentionalSignOut2026();
  assert(consumeIntentionalSignOut2026() === false, 'sans demande, rien n’est attendu');
  markIntentionalSignOut2026();
  assert(consumeIntentionalSignOut2026() === true, 'la déconnexion demandée est reconnue');
  // LE POINT : un drapeau simplement LU resterait vrai, et la déconnexion
  // SUIVANTE — subie, celle-là — serait classée « volontaire ». On retomberait
  // exactement dans le silence qu'on corrige.
  assert(consumeIntentionalSignOut2026() === false, 'le ticket ne sert qu’une fois');
  markIntentionalSignOut2026();
  forgetIntentionalSignOut2026();
  assert(consumeIntentionalSignOut2026() === false, 'une intention sans effet s’oublie');
});

Deno.test('les deux faits de session sont RENDUS quelque part', async () => {
  const notices = await code('./SessionNotices2026.tsx');
  for (const fait of ['deletionCancelled', 'sessionExpired']) {
    assert(notices.includes(fait), `le bandeau doit lire ${fait}`);
  }
  for (const acquit of ['acknowledgeDeletionCancelled', 'acknowledgeSessionExpired']) {
    assert(notices.includes(acquit), `${acquit} : un bandeau qui ne se ferme pas est une bannière`);
  }
  const layout = await code('../../../app/(tabs)/_layout.tsx');
  assert(
    layout.includes('<SessionNotices2026 />'),
    'le bandeau doit être MONTÉ : le calculer sans le rendre ne dit rien à personne',
  );
});

Deno.test('l’attente de démarrage montre E00, plus un rectangle noir', async () => {
  const layout = await code('../../../app/(tabs)/_layout.tsx');
  // ÉTAPE 0 : les deux gardes rendaient `<View style={styles.root} />` — un noir
  // muet, jusqu'à 3 s (plafond de lecture du stockage d'onboarding).
  assert(
    !/return\s*<View style=\{styles\.root\}\s*\/>/.test(layout),
    'aucun écran de démarrage nu : E00 existe (features/boot/SplashE00)',
  );
  assert(layout.includes('<SplashE00 logoReady />'), 'les deux attentes rendent E00');
});

Deno.test('le rafraîchissement du jeton suit le cycle de vie de l’app', async () => {
  const session = await code('../../lib/session.tsx');
  // `autoRefreshToken: true` seul ne suffit pas en React Native : la minuterie
  // tourne pendant que l'OS suspend le JS, rate ses échéances, et le réveil part
  // avec un jeton périmé — donc un `SIGNED_OUT` que personne n'a demandé.
  for (const appel of ['startAutoRefresh', 'stopAutoRefresh', 'AppState.addEventListener']) {
    assert(session.includes(appel), `session.tsx doit appeler ${appel}`);
  }
  assert(
    /Platform\.OS !== 'web'/.test(session),
    'sur web l’onglet garde ses minuteries : AppState n’y décrit pas la même chose',
  );
  const supabase = await code('../../lib/supabase.ts');
  assert(supabase.includes('autoRefreshToken: true'), 'le SDK garde son drapeau');
});

Deno.test('une déconnexion DEMANDÉE ne se commente pas — les deux plateformes le savent', async () => {
  for (const file of ['auth.ts', 'auth.web.ts']) {
    const src = await code(`../../lib/${file}`);
    const signOut = src.slice(src.indexOf('export async function signOut('));
    const corps = signOut.slice(0, signOut.indexOf('\n}') + 2);
    assert(
      corps.indexOf('markIntentionalSignOut2026()') < corps.indexOf('auth.signOut()'),
      `${file} : l'intention se pose AVANT l'appel — l'événement arrive pendant l'await`,
    );
    assert(
      corps.includes('forgetIntentionalSignOut2026()'),
      `${file} : une déconnexion qui échoue doit oublier son intention`,
    );
  }
});

Deno.test('les deux variantes de session exposent la MÊME surface', async () => {
  const natif = await code('../../lib/session.tsx');
  const web = await code('../../lib/session.web.tsx');
  for (const champ of [
    'deletionCancelled', 'acknowledgeDeletionCancelled',
    'sessionExpired', 'acknowledgeSessionExpired',
    'consumeIntentionalSignOut2026',
  ]) {
    assert(natif.includes(champ), `session.tsx : ${champ}`);
    assert(web.includes(champ), `session.web.tsx : ${champ} — la parité n'est pas optionnelle`);
  }
  // Le web ne pilote PAS le rafraîchissement : l'onglet garde ses minuteries.
  assert(!web.includes('startAutoRefresh'), 'session.web.tsx ne doit pas piloter AppState');
});
