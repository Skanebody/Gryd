/**
 * GRYD — E52 : le jeton d'invitation côté client, prouvé.
 *
 * Quatre familles, et les quatre correspondent à une faute possible :
 *
 *   1. LA NORMALISATION DOIT ÊTRE CELLE DU SERVEUR. `gryd_invite_token_hash`
 *      (0090 §3) fait `upper` + retrait des non-alphanumériques avant de hacher.
 *      Si le client normalisait autrement, un jeton accepté par l'app serait
 *      refusé par la base — un « lien invalide » sur un lien parfaitement bon.
 *
 *   2. LE PARSING EST UNE FRONTIÈRE DE SÉCURITÉ. Un deep link est une entrée
 *      hostile : un hôte voisin, un chemin inattendu, une longueur bricolée ne
 *      doivent produire AUCUNE navigation. Et le SEGMENT décide du genre — un
 *      code servi sur `/i/` n'est pas un jeton, c'est une contradiction.
 *
 *   3. UN LIEN NE PORTE PERSONNE. Le test le vérifie littéralement : rien
 *      d'autre que l'hôte, le segment et l'aléa ne sort de `buildInviteTokenLink`.
 *
 *   4. L'HORLOGE ENTRE PAR L'ARGUMENT. `inviteLifetime` est pure ; c'est ce qui
 *      permet de prouver que « expiré » et « révoqué » ne se confondent jamais,
 *      et qu'un arrondi ne fait pas rater une fenêtre à quelqu'un.
 */
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CREW_CODE_LENGTH,
  CREW_INVITE_DEFAULT_TTL_HOURS,
  CREW_INVITE_MAX_TTL_HOURS,
  CREW_INVITE_MIN_TTL_HOURS,
  CREW_INVITE_TOKEN_LENGTH,
} from '@klaim/shared';
import {
  INVITE_EXPIRING_SOON_HOURS,
  INVITE_HOSTS,
  INVITE_TTL_CHOICES,
  INVITE_TTL_DEFAULT,
  buildInviteTokenDeepLink,
  buildInviteTokenLink,
  formatInviteTokenForDisplay,
  inviteLifetime,
  isSendableTtlHours,
  normalizeInviteCode,
  normalizeInviteToken,
  parseInviteInput,
  parseInviteRef,
} from './inviteToken.ts';

/** Un jeton bien formé : 26 symboles de l'alphabet Crockford (0090 §3). */
const TOKEN = '0123456789ABCDEFGHJKMNPQRS';
const CODE = 'AB12CD';

Deno.test('le jeton d’exemple respecte la longueur de game-rules', () => {
  assertEquals(TOKEN.length, CREW_INVITE_TOKEN_LENGTH);
  assertEquals(CODE.length, CREW_CODE_LENGTH);
});

// ═══ 1. NORMALISATION ═══════════════════════════════════════════════════════

Deno.test('normalizeInviteToken accepte un jeton recopié à la main', () => {
  assertEquals(normalizeInviteToken(TOKEN), TOKEN);
  assertEquals(normalizeInviteToken(TOKEN.toLowerCase()), TOKEN);
  assertEquals(normalizeInviteToken(`  ${TOKEN}  `), TOKEN);
  // Tirets et espaces : c'est ainsi qu'un jeton voyage dans un message.
  assertEquals(normalizeInviteToken('0123-4567-89AB-CDEF-GHJK-MNPQ-RS'), TOKEN);
  assertEquals(normalizeInviteToken('0123 4567 89ab cdef ghjk mnpq rs'), TOKEN);
});

Deno.test('normalizeInviteToken refuse ce qui ne peut pas être un jeton', () => {
  assertEquals(normalizeInviteToken(null), null);
  assertEquals(normalizeInviteToken(undefined), null);
  assertEquals(normalizeInviteToken(''), null);
  assertEquals(normalizeInviteToken(TOKEN.slice(0, 25)), null, 'trop court');
  assertEquals(normalizeInviteToken(`${TOKEN}Z`), null, 'trop long');
  // Les quatre lettres que Crockford exclut ne sortent JAMAIS d'un tirage : les
  // voir signale une faute de recopie (« I » pour « 1 »), pas un jeton valide.
  for (const bad of ['I', 'L', 'O', 'U']) {
    assertEquals(normalizeInviteToken(`${bad}${TOKEN.slice(1)}`), null, `lettre ${bad}`);
  }
});

Deno.test('un code n’est pas un jeton, et réciproquement', () => {
  assertEquals(normalizeInviteToken(CODE), null);
  assertEquals(normalizeInviteCode(TOKEN), null);
  assertEquals(normalizeInviteCode('ab12cd'), CODE);
  assertEquals(normalizeInviteCode('AB-12 CD'), CODE);
});

// ═══ 2. PARSING D'UN LIEN ENTRANT ═══════════════════════════════════════════

Deno.test('parseInviteRef reconnaît les jetons sur les deux hôtes et le scheme', () => {
  for (const host of INVITE_HOSTS) {
    assertEquals(parseInviteRef(`https://${host}/i/${TOKEN}`), { kind: 'token', value: TOKEN });
    assertEquals(parseInviteRef(`https://www.${host}/i/${TOKEN.toLowerCase()}`), {
      kind: 'token',
      value: TOKEN,
    });
    assertEquals(parseInviteRef(`http://${host}/i/${TOKEN}/?utm=x`), {
      kind: 'token',
      value: TOKEN,
    });
  }
  assertEquals(parseInviteRef(`gryd://i/${TOKEN}`), { kind: 'token', value: TOKEN });
  assertEquals(parseInviteRef(`gryd:///i/${TOKEN}`), { kind: 'token', value: TOKEN });
});

Deno.test('parseInviteRef reconnaît toujours les codes hérités sur /c/', () => {
  assertEquals(parseInviteRef(`https://gryd.run/c/${CODE}`), { kind: 'code', value: CODE });
  assertEquals(parseInviteRef(`gryd://c/${CODE.toLowerCase()}`), { kind: 'code', value: CODE });
});

Deno.test('LE SEGMENT DÉCIDE : un code servi sur /i/ n’est pas « corrigé », il est refusé', () => {
  assertEquals(parseInviteRef(`https://gryd.run/i/${CODE}`), null);
  assertEquals(parseInviteRef(`https://gryd.run/c/${TOKEN}`), null);
});

Deno.test('parseInviteRef ne navigue sur RIEN d’inattendu', () => {
  const hostile = [
    null,
    undefined,
    '',
    'gryd://run/42',
    'https://gryd.run/blog',
    // Un domaine voisin : les points DOIVENT être échappés dans la regex,
    // sinon « grydxrun » passerait.
    `https://grydxrun/i/${TOKEN}`,
    `https://evil.com/i/${TOKEN}`,
    // Sous-domaine arbitraire : seul « www. » est toléré.
    `https://gryd.run.evil.com/i/${TOKEN}`,
    `https://gryd.run/i/${TOKEN}/extra`,
    `https://gryd.run/x/${TOKEN}`,
    'https://gryd.run/i/',
  ];
  for (const url of hostile) {
    assertEquals(parseInviteRef(url), null, `doit refuser : ${String(url)}`);
  }
});

Deno.test('parseInviteInput tranche par la FORME quand il n’y a pas d’URL', () => {
  assertEquals(parseInviteInput(TOKEN), { kind: 'token', value: TOKEN });
  assertEquals(parseInviteInput(CODE), { kind: 'code', value: CODE });
  assertEquals(parseInviteInput('trop court'), null);
  assertEquals(parseInviteInput(null), null);
});

// ═══ 3. CONSTRUCTION D'UN LIEN ══════════════════════════════════════════════

Deno.test('un lien d’invitation ne transporte QUE l’hôte, le segment et l’aléa', () => {
  const link = buildInviteTokenLink(TOKEN.toLowerCase());
  assertEquals(link, `https://${INVITE_HOSTS[0]}/i/${TOKEN}`);
  // Vie privée (0090 §0 bis) : rien d'autre que le jeton ne doit s'y trouver.
  const rest = link.replace(`https://${INVITE_HOSTS[0]}/i/`, '');
  assertEquals(rest, TOKEN, 'aucun paramètre, aucun handle, aucun identifiant');
  assertEquals(link.includes('?'), false, 'aucune query string');
});

Deno.test('un lien construit se reparse à l’identique (aller-retour)', () => {
  assertEquals(parseInviteRef(buildInviteTokenLink(TOKEN)), { kind: 'token', value: TOKEN });
  assertEquals(parseInviteRef(buildInviteTokenDeepLink(TOKEN)), { kind: 'token', value: TOKEN });
});

Deno.test('on ne construit JAMAIS un lien depuis un jeton invalide', () => {
  assertThrows(() => buildInviteTokenLink('nope'));
  assertThrows(() => buildInviteTokenDeepLink(CODE));
});

Deno.test('l’affichage groupe le jeton sans jamais le déformer', () => {
  const shown = formatInviteTokenForDisplay(TOKEN);
  assertEquals(shown, '0123-4567-89AB-CDEF-GHJK-MNPQ-RS');
  // La forme d'affichage doit REVENIR au jeton canonique : c'est ce qui rend
  // sûre la recopie à la main depuis un écran.
  assertEquals(normalizeInviteToken(shown), TOKEN);
  assertEquals(formatInviteTokenForDisplay('nope'), '');
});

// ═══ 4. CE QU'UNE DATE D'EXPIRATION VEUT DIRE ═══════════════════════════════

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const iso = (hoursFromNow: number) => new Date(NOW + hoursFromNow * 3_600_000).toISOString();

Deno.test('inviteLifetime sépare vivant, bientôt mort, mort et révoqué', () => {
  assertEquals(inviteLifetime({ expiresAt: iso(72) }, NOW), { state: 'live', hoursLeft: 72 });
  assertEquals(inviteLifetime({ expiresAt: iso(6) }, NOW), { state: 'expiring', hoursLeft: 6 });
  assertEquals(inviteLifetime({ expiresAt: iso(-1) }, NOW), { state: 'expired' });
  // La frontière EXACTE appartient à « expiring » : à 24 h pile, on prévient.
  assertEquals(inviteLifetime({ expiresAt: iso(INVITE_EXPIRING_SOON_HOURS) }, NOW), {
    state: 'expiring',
    hoursLeft: INVITE_EXPIRING_SOON_HOURS,
  });
});

Deno.test('RÉVOQUÉ prime sur EXPIRÉ — une décision n’est pas un oubli', () => {
  assertEquals(
    inviteLifetime({ expiresAt: iso(72), revokedAt: iso(-2) }, NOW),
    { state: 'revoked' },
  );
  assertEquals(
    inviteLifetime({ expiresAt: iso(-72), revokedAt: iso(-80) }, NOW),
    { state: 'revoked' },
  );
});

Deno.test('sans date lisible, on n’affirme RIEN (jamais « expiré » par défaut)', () => {
  assertEquals(inviteLifetime({}, NOW), { state: 'unknown' });
  assertEquals(inviteLifetime({ expiresAt: null }, NOW), { state: 'unknown' });
  assertEquals(inviteLifetime({ expiresAt: 'pas une date' }, NOW), { state: 'unknown' });
  assertEquals(inviteLifetime({ expiresAt: iso(3) }, Number.NaN), { state: 'unknown' });
});

Deno.test('le temps restant s’arrondit AU SUPÉRIEUR (ne jamais faire rater une fenêtre)', () => {
  // 90 minutes : on annonce 2 h. Annoncer 1 h ferait courir pour rien.
  assertEquals(inviteLifetime({ expiresAt: iso(1.5) }, NOW), { state: 'expiring', hoursLeft: 2 });
  // Une seconde restante reste VIVANTE : la porte n'est pas encore fermée.
  assertEquals(inviteLifetime({ expiresAt: new Date(NOW + 1000).toISOString() }, NOW), {
    state: 'expiring',
    hoursLeft: 1,
  });
  // La milliseconde du basculement appartient à « expiré ».
  assertEquals(inviteLifetime({ expiresAt: new Date(NOW).toISOString() }, NOW), {
    state: 'expired',
  });
});

Deno.test('inviteLifetime accepte aussi un epoch ms (pas seulement une ISO)', () => {
  assertEquals(inviteLifetime({ expiresAt: NOW + 48 * 3_600_000 }, NOW), {
    state: 'live',
    hoursLeft: 48,
  });
});

// ═══ 5. LES DURÉES PROPOSABLES ══════════════════════════════════════════════

Deno.test('les durées proposées tiennent dans les bornes du serveur', () => {
  for (const h of INVITE_TTL_CHOICES) {
    assertEquals(isSendableTtlHours(h), true, `${h} h doit être envoyable`);
  }
  assertEquals(INVITE_TTL_CHOICES.includes(INVITE_TTL_DEFAULT), true, 'le défaut est proposé');
  assertEquals(INVITE_TTL_DEFAULT, CREW_INVITE_DEFAULT_TTL_HOURS);
});

Deno.test('une durée hors bornes n’est pas rognée : elle n’est pas envoyable', () => {
  assertEquals(isSendableTtlHours(CREW_INVITE_MIN_TTL_HOURS - 1), false);
  assertEquals(isSendableTtlHours(CREW_INVITE_MAX_TTL_HOURS + 1), false);
  assertEquals(isSendableTtlHours(0), false);
  assertEquals(isSendableTtlHours(-24), false);
  assertEquals(isSendableTtlHours(24.5), false, 'une durée fractionnaire n’est pas une durée');
  assertEquals(isSendableTtlHours(Number.NaN), false);
});
