/**
 * GRYD — LE NOM D'APPLE PROPOSE, IL N'IMPOSE PAS.
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT ROUGE ═══════════════════════════════════════════
 * `signInWithApple` demandait le scope `FULL_NAME`, recevait `credential
 * .fullName`… et le JETAIT. Apple ne le donne qu'au PREMIER consentement : à la
 * connexion suivante il vaut `null`, et le token d'identité ne le porte pas.
 * Le joueur accordait donc son nom, puis on le lui redemandait deux écrans plus
 * loin — et pour toujours, puisque plus personne ne pouvait le récupérer.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { HANDLE_MIN_LENGTH } from '@klaim/shared';
import {
  consumeProviderName2026,
  forgetProviderName2026,
  providerDisplayName2026,
  rememberProviderName2026,
  suggestedHandle2026,
} from './providerIdentity2026.ts';

Deno.test('le nom se recompose de ce qu’Apple a réellement donné', () => {
  assertEquals(providerDisplayName2026({ givenName: 'Lina', familyName: 'Moreau' }), 'Lina Moreau');
  // Consentement partiel : un prénom seul est un nom valable.
  assertEquals(providerDisplayName2026({ givenName: 'Lina', familyName: null }), 'Lina');
  assertEquals(providerDisplayName2026({ givenName: null, familyName: 'Moreau' }), 'Moreau');
  assertEquals(providerDisplayName2026({ givenName: '  Lina  ', familyName: '' }), 'Lina');
});

Deno.test('rien d’accordé = rien de proposé : aucun faux nom n’est fabriqué', () => {
  assertEquals(providerDisplayName2026(null), null);
  assertEquals(providerDisplayName2026(undefined), null);
  assertEquals(providerDisplayName2026({}), null);
  assertEquals(providerDisplayName2026({ givenName: '   ', familyName: null }), null);
});

Deno.test('le pseudo proposé traverse le filtre de la base (0011)', () => {
  assertEquals(suggestedHandle2026('Lina Moreau'), 'lina_moreau');
  assertEquals(suggestedHandle2026('Jean-Éric'), 'jeanric'); // hors ASCII supprimé, pas translittéré
});

/**
 * ⚠️ LE CAS QUI COMPTE. `sanitizeHandle` réduit à `a-z0-9_` : « Bø » rend « b »,
 * soit un caractère. Le proposer afficherait « trop court » sous un champ qu'on
 * vient de remplir soi-même — une proposition qui se contredit. On ne propose
 * rien, et le champ garde son aide normale.
 */
Deno.test('on ne propose jamais un pseudo que le serveur refuserait pour sa taille', () => {
  assertEquals(suggestedHandle2026('Bø'), null);
  assertEquals(suggestedHandle2026('李'), null);
  assertEquals(suggestedHandle2026(null), null);
  assertEquals(
    suggestedHandle2026('a'.repeat(HANDLE_MIN_LENGTH))?.length,
    HANDLE_MIN_LENGTH,
    'la borne est celle de game-rules, jamais un nombre écrit ici',
  );
});

Deno.test('la proposition se CONSOMME : elle ne réécrase pas une correction', () => {
  forgetProviderName2026();
  rememberProviderName2026({ givenName: 'Lina', familyName: 'Moreau' });
  assertEquals(consumeProviderName2026(), 'Lina Moreau');
  // Deuxième lecture : plus rien. Sans ça, un remontage de l'écran de profil
  // écraserait le nom que le joueur vient de corriger dans le champ.
  assertEquals(consumeProviderName2026(), null);
});

Deno.test('un consentement vide ne remplace pas une proposition déjà retenue', () => {
  forgetProviderName2026();
  rememberProviderName2026({ givenName: 'Lina', familyName: null });
  // Apple ne redonne le nom qu'une fois : un `null` plus tard n'est pas une
  // rétractation, c'est le comportement normal du fournisseur.
  rememberProviderName2026(null);
  assertEquals(consumeProviderName2026(), 'Lina');
});

Deno.test('oublier est possible : rien ne survit à un changement de compte', () => {
  rememberProviderName2026({ givenName: 'Lina', familyName: 'Moreau' });
  forgetProviderName2026();
  assertEquals(consumeProviderName2026(), null);
});
