/**
 * GRYD — LE @PSEUDO AUX CONDITIONS D'INSTAGRAM : CE QUE L'ÉCRAN A LE DROIT DE
 * DIRE (LOT H, 10/09/2026).
 *
 * ═══ CE QUE CES TESTS TIENNENT ══════════════════════════════════════════════
 * La migration 0175 décide ; ce module-ci ne fait que LIRE et DIRE. Trois
 * choses peuvent donc mal tourner, et ce fichier les tient toutes les trois :
 *  1. lire une réponse qu'on ne comprend pas et l'afficher quand même comme un
 *     chiffre (« il te reste 0 changement » là où on n'a rien lu) ;
 *  2. dire la règle du BINAIRE au lieu de celle du SERVEUR (un mobile en
 *     retard d'une version afficherait « 2 fois par 14 jours » pendant que le
 *     serveur en applique d'autres) ;
 *  3. peindre une date qui n'existe pas (« Invalid Date », le classique).
 *
 * ═══ ÉTAPE 0 — les défauts existaient ═══════════════════════════════════════
 * Avant ce lot, /profil-edit traitait le pseudo comme un champ de texte libre
 * de 20 caractères : aucune règle affichée, aucun décompte, aucune réservation
 * lisible, et le seul refus possible était « Ce pseudo est déjà utilisé » (la
 * clé `handle_taken` de `socialError2026`). Un joueur ne pouvait donc apprendre
 * la cadence QU'EN SE FAISANT REFUSER — la définition d'une règle cachée. Les
 * tests « MUTATION » ci-dessous rejouent ce que rend un serveur muet.
 *
 * PUR : aucun React, aucun réseau. Le hook n'est pas testé ici (il n'ajoute que
 * le câblage `useSocialRead2026`) ; sa couture l'est dans `handleCouture2026`.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  HANDLE_CHANGES_PER_WINDOW,
  HANDLE_CHANGE_WINDOW_DAYS,
  HANDLE_HOLD_DAYS,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
} from '@klaim/shared';
import {
  handleCreditSentence2026,
  handleRefusalMessage2026,
  handleRuleSentence2026,
  parseHandleChange2026,
  parseHandleStatus2026,
  type HandleStatus2026,
} from './handleStatus2026.ts';

/** Une date lisible et STABLE : le test ne dépend pas du fuseau du poste. */
const showDate = (iso: string) => `[${iso.slice(0, 10)}]`;
const BOUNDS = { min: HANDLE_MIN_LENGTH, max: HANDLE_MAX_LENGTH };

/** La réponse type de `my_handle_status_2026()` (clés snake_case, miroir SQL). */
const rowStatus = (over: Record<string, unknown> = {}) => ({
  handle: 'koro',
  has_profile: true,
  handle_chosen: true,
  changes_per_window: 2,
  window_days: 14,
  hold_days: 14,
  changes_used: 0,
  changes_left: 2,
  next_change_allowed_at: null,
  reclaimable: null,
  ...over,
});

const status = (over: Partial<HandleStatus2026> = {}): HandleStatus2026 => ({
  ...(parseHandleStatus2026(rowStatus()) as HandleStatus2026),
  ...over,
});

Deno.test('la réponse du serveur se lit en entier, réservation comprise', () => {
  const read = parseHandleStatus2026(rowStatus({
    changes_used: 1,
    changes_left: 1,
    reclaimable: { handle: 'koro_old', held_until: '2026-09-24T10:00:00Z' },
  }));
  assert(read !== null);
  assertEquals(read.handle, 'koro');
  assertEquals(read.handleChosen, true);
  assertEquals(read.changesUsed, 1);
  assertEquals(read.changesLeft, 1);
  assertEquals(read.reclaimable, { handle: 'koro_old', heldUntil: '2026-09-24T10:00:00Z' });
});

Deno.test('MUTATION : une réponse illisible rend `null`, jamais un zéro', () => {
  // C'est LE piège du lot : `changes_left` absent donnerait 0 avec un
  // `?? 0` distrait, et l'écran annoncerait « plus aucun changement » à
  // quelqu'un qui en a deux. `null` force l'écran à dire qu'il ne sait pas.
  for (const muet of [null, undefined, 'ok', 42, {}, { handle: 'koro' }, { changes_left: '2' }]) {
    assertEquals(parseHandleStatus2026(muet), null, `réponse acceptée à tort : ${JSON.stringify(muet)}`);
  }
});

Deno.test('une réservation sans date de fin ne se peint pas', () => {
  // « Reprendre @koro_old » sans horizon serait un bouton qui ne sait pas
  // jusqu'à quand il reste vrai.
  const read = parseHandleStatus2026(rowStatus({ reclaimable: { handle: 'koro_old' } }));
  assert(read !== null);
  assertEquals(read.reclaimable, null);
  const sansNom = parseHandleStatus2026(rowStatus({ reclaimable: { held_until: '2026-09-24T10:00:00Z' } }));
  assertEquals(sansNom?.reclaimable, null);
});

Deno.test('un serveur en retard : les constantes partagées servent de repli, pas de loi', () => {
  // Le serveur DIT ses trois règles (0175). S'il ne les dit pas, on affiche
  // celles du binaire — mais on ne les impose jamais à un serveur qui parle.
  const muet = parseHandleStatus2026({ handle: 'koro', changes_left: 2 });
  assert(muet !== null);
  assertEquals(muet.changesPerWindow, HANDLE_CHANGES_PER_WINDOW);
  assertEquals(muet.windowDays, HANDLE_CHANGE_WINDOW_DAYS);
  assertEquals(muet.holdDays, HANDLE_HOLD_DAYS);

  const bavard = parseHandleStatus2026(rowStatus({ changes_per_window: 3, window_days: 30, hold_days: 7 }));
  assertEquals(bavard?.changesPerWindow, 3);
  assertEquals(bavard?.windowDays, 30);
  assertEquals(bavard?.holdDays, 7);
});

Deno.test('la règle est écrite avec les nombres qu’on lui donne, dans les deux langues', () => {
  const fr = handleRuleSentence2026(2, 14, 14, false);
  assert(fr.includes('2 fois par 14 jours'), fr);
  assert(fr.includes('réservé 14 jours'), fr);
  assert(!/[—–]/.test(fr), 'pas de tiret long en français');
  const en = handleRuleSentence2026(2, 14, 14, true);
  assert(en.includes('2 times every 14 days'), en);
  // Un serveur qui change d'avis change la phrase, sans release mobile.
  assert(handleRuleSentence2026(3, 30, 7, false).includes('3 fois par 30 jours'));
});

Deno.test('le décompte a trois phrases distinctes, et aucune ne se replie sur une autre', () => {
  // (a) pas encore choisi : le prochain enregistrement est GRATUIT. Annoncer
  //     « il te reste 2 changements » serait vrai et trompeur à la fois.
  const neuf = handleCreditSentence2026(status({ handleChosen: false }), false, showDate);
  assert(neuf.includes('pas encore choisi'), neuf);
  // (b) il lui en reste : le singulier n'est pas « 1 changements ».
  const un = handleCreditSentence2026(status({ changesLeft: 1 }), false, showDate);
  assert(un.includes('reste 1 changement '), un);
  assert(!un.includes('changements'), 'pluriel sur un seul changement : ' + un);
  assert(handleCreditSentence2026(status({ changesLeft: 2 }), false, showDate).includes('reste 2 changements'));
  // (c) bloqué : la DATE, parce que « reviens plus tard » ne se note pas.
  const bloque = handleCreditSentence2026(
    status({ changesLeft: 0, nextChangeAllowedAt: '2026-09-24T10:00:00Z' }),
    false,
    showDate,
  );
  assert(bloque.includes('[2026-09-24]'), bloque);
});

Deno.test('bloqué SANS date : on dit ce qu’on sait, on n’invente pas d’échéance', () => {
  const sansDate = handleCreditSentence2026(status({ changesLeft: 0, nextChangeAllowedAt: null }), false, showDate);
  assert(sansDate.includes('utilisé tes 2 changements'), sansDate);
  assert(!sansDate.includes('['), 'une date a été fabriquée : ' + sansDate);
  assert(!sansDate.includes('Invalid'), sansDate);
});

Deno.test('chaque refus du serveur a SA phrase et SON geste', () => {
  const refus = (reason: string, extra: Record<string, unknown> = {}) =>
    handleRefusalMessage2026(
      parseHandleChange2026({ ok: false, reason, ...extra }),
      false,
      showDate,
      BOUNDS,
    );
  assert(refus('too_short').includes(String(HANDLE_MIN_LENGTH)));
  assert(refus('too_long').includes(String(HANDLE_MAX_LENGTH)));
  assert(refus('bad_chars').includes('minuscules'));
  assert(refus('reserved').includes('réservé'));
  assert(refus('taken').includes('déjà porté'));
  const held = refus('held', { held_until: '2026-09-24T10:00:00Z' });
  assert(held.includes('[2026-09-24]'), held);
  assert(held.includes('ancien titulaire'), held);
  const plafond = refus('rate_limited', { next_change_allowed_at: '2026-09-25T10:00:00Z' });
  assert(plafond.includes('[2026-09-25]'), plafond);
  // Quatre messages, quatre gestes : ils ne doivent pas se confondre.
  const tous = ['too_short', 'bad_chars', 'reserved', 'taken'].map((r) => refus(r));
  assertEquals(new Set(tous).size, 4, 'deux refus différents disent la même chose');
  for (const message of tous) assert(!/[—–]/.test(message), 'tiret long en français : ' + message);
});

Deno.test('MUTATION : un refus daté sans date ne peint jamais « Invalid Date »', () => {
  // Le serveur PEUT taire la date (version antérieure, champ perdu). La phrase
  // doit rester une phrase.
  for (const reason of ['held', 'rate_limited']) {
    const message = handleRefusalMessage2026(parseHandleChange2026({ ok: false, reason }), false, showDate, BOUNDS);
    assert(!message.includes('{date}'), 'gabarit non remplacé : ' + message);
    assert(!message.includes('Invalid'), message);
    assert(message.trim().length > 10, message);
  }
});

Deno.test('un motif inconnu n’est pas nommé au hasard', () => {
  // Un serveur plus récent que l'app peut inventer un motif. Le traduire par
  // « ce pseudo est pris » accuserait quelqu'un à tort.
  const inconnu = parseHandleChange2026({ ok: false, reason: 'quelque_chose_de_neuf' });
  assertEquals(inconnu.reason, 'unknown');
  const message = handleRefusalMessage2026(inconnu, false, showDate, BOUNDS);
  assert(message.includes('n’a pas pu être changé'), message);
  assert(!message.includes('pris'), message);
});

Deno.test('les trois SUCCÈS se distinguent : changé, nommé, inchangé', () => {
  assertEquals(parseHandleChange2026({ ok: true, reason: 'changed', handle: 'koro2', changes_left: 1 }).reason, 'changed');
  assertEquals(parseHandleChange2026({ ok: true, reason: 'named', handle: 'koro' }).reason, 'named');
  assertEquals(parseHandleChange2026({ ok: true, reason: 'unchanged', handle: 'koro' }).reason, 'unchanged');
  // `changes_left` absent n'est pas zéro : c'est « non dit ».
  assertEquals(parseHandleChange2026({ ok: true, reason: 'named', handle: 'koro' }).changesLeft, null);
  assertEquals(parseHandleChange2026({ ok: true, reason: 'changed', handle: 'k', changes_left: 0 }).changesLeft, 0);
});

Deno.test('l’anglais existe pour chaque phrase, et il garde ses tirets', () => {
  const en = handleRefusalMessage2026(
    parseHandleChange2026({ ok: false, reason: 'held', held_until: '2026-09-24T10:00:00Z' }),
    true,
    showDate,
    BOUNDS,
  );
  assert(en.includes('previous owner'), en);
  assert(en.includes('[2026-09-24]'), en);
  assert(handleCreditSentence2026(status({ handleChosen: false }), true, showDate).includes('not chosen'));
});
