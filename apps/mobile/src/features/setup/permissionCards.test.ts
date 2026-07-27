/**
 * GRYD — E10 : ce que ces tests EMPÊCHENT.
 *
 * 1. Un bouton mort. `cardAction` ne doit jamais rendre `ask` là où la demande
 *    ne peut pas aboutir (capacité absente, refus définitif).
 * 2. Un état inventé. Une lecture en cours n'est pas un refus ; une permission
 *    jamais demandée non plus.
 * 3. Le piège d'expo-sensors (documenté dans permissionCards.ts) : une réponse
 *    `granted: true` servie par le stub d'une plateforme sans capteur ne doit
 *    JAMAIS produire une carte « Autorisé ».
 * 4. Un trou de copie : chaque état a exactement une ligne (ou volontairement
 *    aucune), dans les 5 langues.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  MOTION_LINE,
  NOTIFICATIONS_LINE,
  analyticsResult,
  canAsk,
  cardAction,
  cardState,
  isGranted,
  notificationsDeliveryLine,
  type PermissionCardState,
  type PushDeliveryProbe,
} from './permissionCards.ts';
import { LOCALES } from '../../i18n/types.ts';

const ALL_STATES: readonly PermissionCardState[] = [
  'checking',
  'undetermined',
  'asking',
  'granted',
  'denied',
  'blocked',
  'unavailable',
];

// ─── cardState : la capacité prime sur la permission ────────────────────────

Deno.test('cardState — sans capteur, une permission « accordée » ne rend PAS la carte accordée', () => {
  // Le stub web d'expo-sensors répond exactement ça, sans rien demander.
  const menteur = { status: 'granted', canAskAgain: true } as const;
  assertEquals(cardState(false, menteur), 'unavailable');
});

Deno.test('cardState — sonde impossible (exception, module absent) = indisponible, jamais un refus', () => {
  assertEquals(cardState(true, null), 'unavailable');
});

Deno.test('cardState — jamais demandée n’est pas un refus', () => {
  assertEquals(cardState(true, { status: 'undetermined', canAskAgain: true }), 'undetermined');
});

Deno.test('cardState — refus redemandable vs refus définitif', () => {
  assertEquals(cardState(true, { status: 'denied', canAskAgain: true }), 'denied');
  assertEquals(cardState(true, { status: 'denied', canAskAgain: false }), 'blocked');
});

Deno.test('cardState — accordée, constatée par l’OS', () => {
  assertEquals(cardState(true, { status: 'granted', canAskAgain: false }), 'granted');
});

// ─── cardAction : aucun bouton mort ─────────────────────────────────────────

Deno.test('cardAction — aucun bouton « Autoriser » là où la demande ne peut pas aboutir', () => {
  for (const state of ['unavailable', 'blocked', 'granted', 'checking'] as const) {
    assert(cardAction(state) !== 'ask', `${state} ne doit pas peindre un bouton d'autorisation`);
  }
});

Deno.test('cardAction — un refus définitif renvoie aux réglages (la seule action qui marche)', () => {
  assertEquals(cardAction('blocked'), 'open_settings');
});

Deno.test('cardAction — indisponible ne peint AUCUN bouton (ni demande, ni réglages)', () => {
  assertEquals(cardAction('unavailable'), 'none');
});

Deno.test('cardAction — le bouton reste en place pendant le dialogue système', () => {
  assertEquals(cardAction('asking'), 'ask');
});

// ─── canAsk : on n’empile pas deux dialogues ────────────────────────────────

Deno.test('canAsk — seulement là où l’OS ouvrira vraiment quelque chose', () => {
  const autorises = ALL_STATES.filter((s) => canAsk(s));
  assertEquals(autorises, ['undetermined', 'denied']);
});

Deno.test('canAsk — false pendant la lecture initiale et pendant la demande', () => {
  assertEquals(canAsk('checking'), false);
  assertEquals(canAsk('asking'), false);
});

// ─── isGranted : le CONTINUER ne raconte que du constaté ────────────────────

Deno.test('isGranted — un seul état vaut « accordée »', () => {
  const vrais = ALL_STATES.filter((s) => isGranted(s));
  assertEquals(vrais, ['granted']);
});

// ─── analytics : jamais un résultat fabriqué ────────────────────────────────

Deno.test('analyticsResult — une lecture en cours ou un dialogue ouvert n’est pas un résultat', () => {
  assertEquals(analyticsResult('checking'), null);
  assertEquals(analyticsResult('undetermined'), null);
  assertEquals(analyticsResult('asking'), null);
});

Deno.test('analyticsResult — ensemble FERMÉ, conforme à events.ts', () => {
  const ferme = ['granted', 'denied', 'blocked', 'unavailable'];
  for (const state of ALL_STATES) {
    const r = analyticsResult(state);
    if (r !== null) assert(ferme.includes(r), `valeur hors ensemble fermé : ${r}`);
  }
});

// ─── copie : exhaustive et traduite ─────────────────────────────────────────

Deno.test('lignes d’état — chaque état est couvert, et seuls deux n’ont volontairement aucune ligne', () => {
  for (const table of [MOTION_LINE, NOTIFICATIONS_LINE]) {
    for (const state of ALL_STATES) {
      assert(state in table, `état non couvert : ${state}`);
    }
    assertEquals(table.undetermined, null);
    assertEquals(table.asking, null);
  }
});

Deno.test('lignes d’état — les 5 langues sont remplies, sans chaîne vide', () => {
  for (const table of [MOTION_LINE, NOTIFICATIONS_LINE]) {
    for (const state of ALL_STATES) {
      const entry = table[state];
      if (entry === null) continue;
      for (const locale of LOCALES) {
        assert(entry[locale].trim().length > 0, `${state}/${locale} vide`);
      }
    }
  }
});

Deno.test('lignes d’état — mouvements et notifications ne se recopient pas mot pour mot', () => {
  // Deux permissions, deux conséquences : « le GPS seul suffit à jouer » n'a
  // rien à voir avec « tu retrouveras tout dans l'app ». Si ces textes venaient
  // à fusionner, l'écran cesserait d'expliquer ce qu'on perd vraiment.
  assert(MOTION_LINE.denied?.fr !== NOTIFICATIONS_LINE.denied?.fr);
  assert(MOTION_LINE.unavailable?.fr !== NOTIFICATIONS_LINE.unavailable?.fr);
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. « AUTORISÉ » N'EST PAS « TU RECEVRAS »
// ═══════════════════════════════════════════════════════════════════════════
// Le défaut du 27/07/2026 : la carte disait « Autorisé » et la copie annonçait
// trois messages, alors que la chaîne push ne peut rien délivrer tant que les
// credentials APNs/FCM ne sont pas déposés — ce que le MÊME binaire dit dans
// Réglages › Notifications. Ces tests figent la seconde ligne qui manquait.

const ALL_PROBES: readonly PushDeliveryProbe[] = [
  'idle',
  'unsupported',
  'module_missing',
  'permission_denied',
  'not_configured',
  'unavailable',
  'error',
  'registered',
];

Deno.test('délivrabilité — rien n’est dit tant que l’OS n’a pas accordé', () => {
  for (const state of ALL_STATES) {
    if (state === 'granted') continue;
    for (const probe of ALL_PROBES) {
      assertEquals(
        notificationsDeliveryLine(state, probe),
        null,
        `${state}/${probe} : une phrase sur la livraison répond à une question que ` +
          'personne n’a posée — la carte parle encore de la permission',
      );
    }
  }
});

Deno.test('délivrabilité — jamais tenté ⇒ on n’affirme rien', () => {
  // `idle` = `registerPushDevice` n'a pas été appelé. Ni « ça arrivera », ni
  // « ça n’arrivera pas » : un non-essai n'est pas un verdict.
  assertEquals(notificationsDeliveryLine('granted', 'idle'), null);
});

Deno.test('délivrabilité — le cas RÉEL du dépôt : autorisé mais non livrable', () => {
  // Build sans credentials APNs/FCM → `getExpoPushTokenAsync` échoue →
  // `unavailable`. C'est exactement l'état d'aujourd'hui (app.json
  // `_note_push_perimetre3`), et c'est ce que la carte doit DIRE.
  const line = notificationsDeliveryLine('granted', 'unavailable');
  assert(line !== null, 'l’écran doit avouer que ces alertes ne sont pas livrées');
  for (const locale of LOCALES) {
    assert(line[locale].trim().length > 0, `${locale} vide`);
  }
});

Deno.test('délivrabilité — chaque cause a SA phrase, elles ne sont pas interchangeables', () => {
  const noAccount = notificationsDeliveryLine('granted', 'not_configured');
  const notDelivering = notificationsDeliveryLine('granted', 'unavailable');
  const failed = notificationsDeliveryLine('granted', 'error');
  const ok = notificationsDeliveryLine('granted', 'registered');
  for (const [name, line] of [
    ['not_configured', noAccount],
    ['unavailable', notDelivering],
    ['error', failed],
    ['registered', ok],
  ] as const) {
    assert(line !== null, `${name} doit avoir une phrase`);
  }
  const frs = [noAccount!.fr, notDelivering!.fr, failed!.fr, ok!.fr];
  assertEquals(new Set(frs).size, 4, 'deux causes distinctes partagent une phrase : l’une ment');
});

Deno.test('délivrabilité — un refus système repris en route ne contredit pas la carte', () => {
  // `permission_denied` remonté par la chaîne push alors que la carte lit encore
  // `granted` : l'OS a repris la main entre deux mesures. On se tait — c'est
  // `PermissionCardState` qui tranchera à la relecture (AppState), pas deux
  // phrases contradictoires empilées.
  assertEquals(notificationsDeliveryLine('granted', 'permission_denied'), null);
});

Deno.test('délivrabilité — les 8 valeurs sont couvertes (aucun trou silencieux)', () => {
  // `notificationsDeliveryLine` est un `switch` exhaustif : ce test garantit
  // qu'aucune valeur n'y tombe dans un `default` implicite rendant `undefined`.
  for (const probe of ALL_PROBES) {
    const line = notificationsDeliveryLine('granted', probe);
    assert(line === null || typeof line.fr === 'string', `${probe} : sortie inattendue`);
  }
});
