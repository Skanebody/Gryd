/**
 * GRYD — le parrainage côté client, prouvé.
 *
 * ─── ÉTAPE 0, MESURÉE ───────────────────────────────────────────────────────
 * Avant ce lot, `apps/mobile` n'avait AUCUN module de parrainage : le seul mot
 * du dépôt était l'avertissement du bloc social du Profil (« PAS DE ENTRER UN
 * CODE DE PARRAINAGE… peindre le champ serait un bouton mort »). Le premier
 * test le rejoue littéralement : la table `public.referrals` de 0002 existait
 * depuis le premier schéma, et son code de HUIT caractères hexadécimaux ne
 * passerait aucune des vérifications d'ici. Sans cette mesure, rien ne
 * distinguerait ce module d'un no-op.
 *
 * ─── QUATRE FAMILLES, QUATRE FAUTES POSSIBLES ───────────────────────────────
 *  1. LA NORMALISATION DOIT ÊTRE CELLE DU SERVEUR. `normalize_referral_code_2026`
 *     (0184) fait `upper` + retrait des non-alphanumériques, et ne SUBSTITUE
 *     rien. Un client plus « intelligent » accepterait un code que la base
 *     refuse : un « code invalide » sur un code parfaitement bon.
 *  2. LE PARSING EST UNE FRONTIÈRE DE SÉCURITÉ. Un autre hôte, un autre
 *     segment, une longueur bricolée ne doivent produire AUCUNE navigation.
 *  3. UN LIEN NE PORTE PERSONNE. Rien d'autre que le schéma et le code n'en
 *     sort — surtout pas un identifiant de compte.
 *  4. UNE RÉPONSE ILLISIBLE N'EST PAS UN COMPTE VIDE. Le modèle rend `null`,
 *     et l'écran peint « échec », jamais « tu n'as personne » (L8/L14/L19).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH, REFERRAL_MAX_ACTIVE_PER_SEASON,
  REFERRAL_REWARDS_2026, REFERRAL_XP_BOOST_2026,
} from '@klaim/shared';
import {
  REFERRAL_WEB_HOSTS, buildReferralDeepLink, buildReferralWebLink,
  formatReferralCodeForDisplay, looksLikeReferralCode, normalizeReferralCode,
  parseMyReferral2026, parseRedeemResult2026, parseReferralUrl,
} from './referral2026.ts';

const CODE = 'ABC234';

// ═══ ÉTAPE 0 ════════════════════════════════════════════════════════════════

Deno.test('étape 0 — le code de 0002 ne passerait AUCUNE vérification d’ici', () => {
  // `users.referral_code text not null unique default encode(gen_random_bytes(4),'hex')`
  // : huit caractères, alphabet 0-9a-f. C'est ce que le dépôt portait, et c'est
  // ce qu'aucun écran n'a jamais su lire.
  assertEquals(normalizeReferralCode('3f7a91b2'), null, 'huit caractères hexadécimaux');
  assertEquals(parseReferralUrl('gryd://r/3f7a91b2'), null);
  // Et les quatre glyphes que l'œil confond n'existent plus dans l'alphabet.
  for (const ambiguous of ['I', 'O', '0', '1']) {
    assertEquals(REFERRAL_CODE_ALPHABET.includes(ambiguous), false, `${ambiguous} retiré`);
  }
  assertEquals(CODE.length, REFERRAL_CODE_LENGTH);
});

// ═══ 1. NORMALISATION ═══════════════════════════════════════════════════════

Deno.test('normalizeReferralCode accepte un code recopié à la main', () => {
  assertEquals(normalizeReferralCode(CODE), CODE);
  assertEquals(normalizeReferralCode(CODE.toLowerCase()), CODE);
  assertEquals(normalizeReferralCode(' abc-234 '), CODE);
  assertEquals(normalizeReferralCode('ABC 234'), CODE);
});

Deno.test('normalizeReferralCode ne DEVINE jamais une lettre absente de l’alphabet', () => {
  // Le serveur ne substitue rien non plus (0184) : les deux doivent refuser.
  assertEquals(normalizeReferralCode('ABC23O'), null, 'O n’est pas 0');
  assertEquals(normalizeReferralCode('1BC234'), null, '1 n’est pas I');
  assertEquals(normalizeReferralCode('ABC23I'), null);
});

Deno.test('normalizeReferralCode refuse toute autre longueur, et toute entrée non textuelle', () => {
  assertEquals(normalizeReferralCode('ABC23'), null);
  assertEquals(normalizeReferralCode('ABC2345'), null);
  assertEquals(normalizeReferralCode(''), null);
  assertEquals(normalizeReferralCode(null), null);
  assertEquals(normalizeReferralCode(undefined), null);
  assertEquals(looksLikeReferralCode(CODE), true);
  assertEquals(looksLikeReferralCode('nope'), false);
});

// ═══ 2. PARSING D'UN LIEN ENTRANT ═══════════════════════════════════════════

Deno.test('parseReferralUrl reconnaît le schéma natif, tolérant sur les slashes', () => {
  assertEquals(parseReferralUrl(`gryd://r/${CODE}`), CODE);
  assertEquals(parseReferralUrl(`gryd:///r/${CODE}`), CODE);
  assertEquals(parseReferralUrl(`gryd://r/${CODE.toLowerCase()}/`), CODE);
  assertEquals(parseReferralUrl(`gryd://r/${CODE}?from=sms`), CODE);
});

Deno.test('parseReferralUrl accepte les deux hôtes candidats, et EUX SEULS', () => {
  for (const host of REFERRAL_WEB_HOSTS) {
    assertEquals(parseReferralUrl(`https://${host}/r/${CODE}`), CODE);
    assertEquals(parseReferralUrl(`https://www.${host}/r/${CODE}`), CODE);
  }
  // Le point est ÉCHAPPÉ dans la regex : sans ça, `grydxrun` matcherait aussi.
  assertEquals(parseReferralUrl(`https://grydxrun/r/${CODE}`), null);
  assertEquals(parseReferralUrl(`https://gryd.run.evil.example/r/${CODE}`), null);
});

Deno.test('parseReferralUrl ignore un autre segment, un autre schéma, un code bricolé', () => {
  assertEquals(parseReferralUrl(`gryd://c/${CODE}`), null, 'le segment crew n’est pas le nôtre');
  assertEquals(parseReferralUrl(`gryd://run/${CODE}`), null);
  assertEquals(parseReferralUrl(`https://gryd.run/blog/${CODE}`), null);
  assertEquals(parseReferralUrl('gryd://r/ABC'), null);
  assertEquals(parseReferralUrl('gryd://r/'), null);
  assertEquals(parseReferralUrl(''), null);
  assertEquals(parseReferralUrl(null), null);
});

// ═══ 3. UN LIEN NE PORTE PERSONNE ═══════════════════════════════════════════

Deno.test('buildReferralDeepLink ne porte que le schéma et le code', () => {
  assertEquals(buildReferralDeepLink(CODE), `gryd://r/${CODE}`);
  assertEquals(buildReferralDeepLink('abc 234'), `gryd://r/${CODE}`);
  assertEquals(buildReferralDeepLink('nope'), null);
  // Aller-retour : ce que l'app émet, l'app le relit.
  assertEquals(parseReferralUrl(buildReferralDeepLink(CODE) ?? ''), CODE);
});

Deno.test('buildReferralWebLink exige un hôte EXPLICITE (O10 n’est pas tranché)', () => {
  assertEquals(buildReferralWebLink(CODE, 'gryd.run'), `https://gryd.run/r/${CODE}`);
  assertEquals(buildReferralWebLink('nope', 'gryd.app'), null);
});

Deno.test('formatReferralCodeForDisplay groupe pour l’œil, sans jamais changer le code', () => {
  assertEquals(formatReferralCodeForDisplay(CODE), 'ABC 234');
  assertEquals(normalizeReferralCode(formatReferralCodeForDisplay(CODE)), CODE);
  assertEquals(formatReferralCodeForDisplay('nope'), '');
});

// ═══ 4. LE MODÈLE SERVEUR ═══════════════════════════════════════════════════

const FULL = {
  code: CODE, accountAgeDays: 3, canRedeem: true, redeemBlockedReason: null, myRunDone: false,
  sponsor: null, referees: [{ pseudo: 'lea', state: 'awaiting_referee_run', redeemedAt: '2026-09-11T10:00:00Z', completedAt: null }],
  rewards: [
    { kind: 'collection', rewardId: 'referral_frame', side: 'referrer', grantedAt: '2026-09-11T10:00:00Z', boostEndsAt: null, boostMultiplier: null },
    { kind: 'xp_boost', rewardId: 'referral_xp_boost', side: 'referrer', grantedAt: '2026-09-11T10:00:00Z', boostEndsAt: '2026-09-18T10:00:00Z', boostMultiplier: '1.5' },
  ],
  boostActive: true, bonusXp: 50,
  grydPlusCredit: { days: 30, state: 'banked', endsAt: null },
  remainingThisSeason: 4, nextStep: 'run',
};

Deno.test('parseMyReferral2026 lit une réponse complète, multiplicateur compris', () => {
  const model = parseMyReferral2026(FULL);
  assertEquals(model?.code, CODE);
  assertEquals(model?.referees.length, 1);
  assertEquals(model?.referees[0].state, 'awaiting_referee_run');
  // Un `numeric` Postgres arrive en CHAÎNE : sans conversion, le ×1,5 serait perdu.
  assertEquals(model?.rewards[1].boostMultiplier, REFERRAL_XP_BOOST_2026.multiplier);
  assertEquals(model?.grydPlusCredit?.state, 'banked');
  assertEquals(model?.remainingThisSeason, REFERRAL_MAX_ACTIVE_PER_SEASON - 1);
  assertEquals(model?.nextStep, 'run');
});

Deno.test('une réponse illisible rend null — jamais un compte qui a l’air vide', () => {
  assertEquals(parseMyReferral2026(null), null);
  assertEquals(parseMyReferral2026('boom'), null);
  assertEquals(parseMyReferral2026({ ...FULL, code: '3f7a91b2' }), null, 'un code hors alphabet');
  assertEquals(parseMyReferral2026({ ...FULL, nextStep: 'sprint' }), null, 'une étape inconnue');
  // Un compte VRAIMENT vide, lui, se lit : listes vides, crédit absent.
  const empty = parseMyReferral2026({ ...FULL, referees: [], rewards: [], grydPlusCredit: null, nextStep: 'share' });
  assertEquals(empty?.referees, []);
  assertEquals(empty?.rewards, []);
  assertEquals(empty?.grydPlusCredit, null, 'aucun crédit ⇒ null, jamais « 0 jour »');
});

Deno.test('un état de lien inconnu est ÉCARTÉ, pas rendu tel quel', () => {
  const model = parseMyReferral2026({ ...FULL, referees: [{ pseudo: 'lea', state: 'pending_forever' }] });
  assertEquals(model?.referees, []);
});

Deno.test('les identifiants d’objets de la collection sont ceux de game-rules', () => {
  const ids: readonly string[] = REFERRAL_REWARDS_2026.map((reward) => reward.id);
  assertEquals(ids.includes('referral_frame'), true);
  const model = parseMyReferral2026(FULL);
  for (const reward of model?.rewards ?? []) {
    if (reward.kind !== 'collection') continue;
    assertEquals(ids.includes(reward.rewardId), true, `${reward.rewardId} vient du catalogue partagé`);
  }
});

Deno.test('parseRedeemResult2026 rend un refus TYPÉ, jamais un « réessaie » opaque', () => {
  assertEquals(parseRedeemResult2026({ ok: true, linkId: 12 }), { ok: true });
  assertEquals(parseRedeemResult2026({ ok: false, reason: 'account_too_old' }), { ok: false, reason: 'account_too_old' });
  assertEquals(parseRedeemResult2026({ ok: false, reason: 'reciprocity' }), { ok: false, reason: 'reciprocity' });
  // Un motif inconnu ou une réponse absente ne se peignent pas comme un refus
  // métier : ce sont des pannes, et l'écran doit le dire autrement.
  assertEquals(parseRedeemResult2026({ ok: false, reason: 'martian' }), { ok: false, reason: 'network' });
  assertEquals(parseRedeemResult2026(null), { ok: false, reason: 'network' });
});
