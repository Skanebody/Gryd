/**
 * GRYD — E07 : tests des décisions de l'écran « Connexion par e-mail ».
 *
 * CE QUI EST VÉRIFIÉ ICI, ET SEULEMENT ÇA :
 *  · qu'une FORME d'adresse est jugée sans jamais prétendre juger une existence ;
 *  · qu'un message serveur est traduit en motif FERMÉ — et que l'inconnu reste
 *    inconnu (le piège : classer un imprévu en « réseau » et conseiller faux) ;
 *  · qu'un fournisseur n'est JAMAIS déduit d'un domaine (le test `gmail.com`) ;
 *  · que le compte à rebours de renvoi est borné des deux côtés et suit
 *    `AUTH_EMAIL_RESEND_DELAY_S` (game-rules), pas un littéral ;
 *  · qu'un retour de lien sans paramètre d'erreur ne rend AUCUN verdict.
 *
 * PUR : zéro import React Native, zéro accès disque — joué par `npm run test:mobile`.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { AUTH_EMAIL_RESEND_DELAY_S } from '@klaim/shared';
import {
  canResend,
  classifyEmailLinkFailure,
  isEmailShapeValid,
  linkVerdictFromParams,
  normalizeEmail,
  resendSecondsLeft,
} from './emailLink.ts';

// ─── FORME DE L'ADRESSE (état 2 « e-mail invalide ») ─────────────────────────

Deno.test('forme : les adresses ordinaires passent, y compris les cas “exotiques” valides', () => {
  for (const ok of [
    'ben@gryd.fr',
    'ben.bel@gryd.fr',
    'ben+run@gryd.fr',
    'ben_bel@sous-domaine.gryd.co.uk',
    "o'brien@gryd.ie",
    'BEN@GRYD.FR',
    'a@b.io',
    'coureur@gryd.technology',
  ]) {
    assert(isEmailShapeValid(ok), `refusée à tort : ${ok}`);
  }
});

Deno.test('forme : seules les frappes qui ne PEUVENT pas être une adresse sont refusées', () => {
  for (const ko of [
    '',
    '   ',
    'ben',
    'ben@',
    '@gryd.fr',
    'ben@@gryd.fr',
    'ben@gryd', // domaine sans point — frappe inachevée
    'ben@gryd.f', // TLD d'un caractère
    'ben@gryd.4u', // TLD non alphabétique
    'ben @gryd.fr',
    'ben@gryd .fr',
    'ben..bel@gryd.fr',
    'ben@gryd..fr',
    '.ben@gryd.fr',
    'ben.@gryd.fr',
    'ben@.gryd.fr',
    'ben@gryd.fr.',
    'ben@-gryd.fr',
  ]) {
    assert(!isEmailShapeValid(ko), `acceptée à tort : « ${ko} »`);
  }
});

Deno.test('forme : les espaces de bord sont pardonnés (copier-coller depuis un SMS)', () => {
  assert(isEmailShapeValid('  ben@gryd.fr  '));
  assertEquals(normalizeEmail('  ben@gryd.fr  '), 'ben@gryd.fr');
});

Deno.test('normalisation : la CASSE est préservée — on affiche ce qu’on a envoyé', () => {
  // Mettre en minuscules afficherait au joueur une adresse qu'il n'a pas tapée,
  // et le ferait douter d'avoir bien saisi.
  assertEquals(normalizeEmail(' Ben.Bel@Gryd.FR '), 'Ben.Bel@Gryd.FR');
});

// ─── MOTIFS D'ÉCHEC (états 3 et 5, + transports) ─────────────────────────────

Deno.test('cadence serveur → rate_limited (le seul motif qui justifie « attends »)', () => {
  for (const msg of [
    'For security purposes, you can only request this after 47 seconds.',
    'Email rate limit exceeded',
    'over_email_send_rate_limit',
    'Too many requests',
  ]) {
    assertEquals(classifyEmailLinkFailure(msg).reason, 'rate_limited', msg);
  }
});

Deno.test('refus de forme côté serveur → invalid_email', () => {
  assertEquals(
    classifyEmailLinkFailure('Unable to validate email address: invalid format').reason,
    'invalid_email',
  );
  assertEquals(classifyEmailLinkFailure('email_address_invalid').reason, 'invalid_email');
});

Deno.test('transport coupé → network', () => {
  for (const msg of ['Failed to fetch', 'Network request failed', 'TypeError: Load failed']) {
    assertEquals(classifyEmailLinkFailure(msg).reason, 'network', msg);
  }
});

Deno.test('identité déjà liée ET fournisseur NOMMÉ par le serveur → existing_provider', () => {
  const apple = classifyEmailLinkFailure('identity_already_exists: apple');
  assertEquals(apple.reason, 'existing_provider');
  assertEquals(apple.provider, 'Apple');

  const google = classifyEmailLinkFailure('This email is already linked to a Google identity');
  assertEquals(google.reason, 'existing_provider');
  assertEquals(google.provider, 'Google');
});

Deno.test('identité déjà liée SANS fournisseur nommé → unknown, jamais un fournisseur deviné', () => {
  const r = classifyEmailLinkFailure('identity_already_exists');
  assertEquals(r.reason, 'unknown');
  assertEquals(r.provider, undefined);
});

Deno.test('LE PIÈGE : un domaine ne dit RIEN du fournisseur', () => {
  // Aucune de ces entrées ne doit produire `existing_provider`. Le domaine d'une
  // adresse n'est pas une preuve d'identité fédérée — des comptes @gmail.com se
  // connectent par lien tous les jours.
  assertEquals(classifyEmailLinkFailure('').reason, 'unknown');
  assertEquals(classifyEmailLinkFailure(undefined).reason, 'unknown');
  assertEquals(classifyEmailLinkFailure('error sending mail to ben@gmail.com').reason, 'unknown');
  assertEquals(classifyEmailLinkFailure('smtp relay icloud.com refused').reason, 'unknown');
});

Deno.test('un message imprévu reste unknown — on ne conseille pas au hasard', () => {
  assertEquals(classifyEmailLinkFailure('Internal Server Error').reason, 'unknown');
  assertEquals(classifyEmailLinkFailure('database is starting up').reason, 'unknown');
});

// ─── RENVOI APRÈS DÉLAI (état 5) ─────────────────────────────────────────────

Deno.test('le délai vient de game-rules, pas d’un littéral de l’écran', () => {
  const t0 = 1_700_000_000_000;
  assertEquals(resendSecondsLeft(t0, t0), AUTH_EMAIL_RESEND_DELAY_S);
  assertEquals(resendSecondsLeft(t0, t0 + AUTH_EMAIL_RESEND_DELAY_S * 1000), 0);
  assert(AUTH_EMAIL_RESEND_DELAY_S > 0, 'un délai nul armerait un bouton condamné au refus');
});

Deno.test('décompte : arrondi au-dessus, jamais un « 0 s » qui n’arme pas encore', () => {
  const t0 = 1_700_000_000_000;
  // 500 ms écoulées : il reste 59,5 s → on AFFICHE 60, et le bouton reste fermé.
  assertEquals(resendSecondsLeft(t0, t0 + 500), AUTH_EMAIL_RESEND_DELAY_S);
  assert(!canResend(t0, t0 + 500));
  // 100 ms avant l'échéance : 1 s affichée, toujours fermé.
  assertEquals(resendSecondsLeft(t0, t0 + AUTH_EMAIL_RESEND_DELAY_S * 1000 - 100), 1);
  assert(!canResend(t0, t0 + AUTH_EMAIL_RESEND_DELAY_S * 1000 - 100));
});

Deno.test('horloge en arrière (remise à l’heure, réveil) : plafonné, le bouton revient', () => {
  const t0 = 1_700_000_000_000;
  assertEquals(resendSecondsLeft(t0, t0 - 3_600_000), AUTH_EMAIL_RESEND_DELAY_S);
  // Et il ne reste jamais bloqué : passé l'échéance depuis le nouveau « now ».
  assertEquals(resendSecondsLeft(t0, t0 + 10 * AUTH_EMAIL_RESEND_DELAY_S * 1000), 0);
});

Deno.test('INVARIANT anti-gel : « armé » et « il reste 0 s » sont VRAIS au même instant', () => {
  // Le bug de classe visé : l'écran affiche le décompte depuis un instant et
  // décide d'arrêter son horloge depuis un autre. À quelques millisecondes
  // près, il coupait le tic-tac alors que le rendu montrait encore « 1 s » — le
  // bouton restait fermé POUR TOUJOURS. Les deux lectures doivent coïncider sur
  // toute la fenêtre, sinon le gel est reproductible.
  const t0 = 1_700_000_000_000;
  for (let ms = 0; ms <= AUTH_EMAIL_RESEND_DELAY_S * 1000 + 2000; ms += 137) {
    const now = t0 + ms;
    assertEquals(
      canResend(t0, now),
      resendSecondsLeft(t0, now) === 0,
      `désaccord à ${ms} ms : le décompte se figerait sur une valeur non nulle`,
    );
  }
});

Deno.test('valeurs non finies : on ferme le renvoi plutôt que d’ouvrir au hasard', () => {
  assertEquals(resendSecondsLeft(Number.NaN, 0), AUTH_EMAIL_RESEND_DELAY_S);
  assertEquals(resendSecondsLeft(0, Number.POSITIVE_INFINITY), AUTH_EMAIL_RESEND_DELAY_S);
});

// ─── VERDICT DU LIEN OUVERT (état 4) ─────────────────────────────────────────

Deno.test('aucun paramètre d’erreur → AUCUN verdict (un silence n’est pas une réponse)', () => {
  assertEquals(linkVerdictFromParams({}), null);
  assertEquals(linkVerdictFromParams({ error: undefined, error_code: undefined }), null);
});

Deno.test('retour GoTrue « otp_expired » → expired', () => {
  assertEquals(
    linkVerdictFromParams({
      error: 'access_denied',
      error_code: 'otp_expired',
      error_description: 'Email link is invalid or has expired',
    }),
    'expired',
  );
});

Deno.test('erreur sans mention d’expiration → invalid (lien recopié / tronqué)', () => {
  assertEquals(
    linkVerdictFromParams({ error: 'invalid_request', error_description: 'bad_code_verifier' }),
    'invalid',
  );
});

Deno.test('paramètre répété : la première valeur tranche, sans planter', () => {
  assertEquals(linkVerdictFromParams({ error_code: ['otp_expired', 'autre'] }), 'expired');
  assertEquals(linkVerdictFromParams({ error_code: [] }), null);
});
