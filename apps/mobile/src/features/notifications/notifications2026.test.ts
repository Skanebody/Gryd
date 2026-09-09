/**
 * GRYD — tests du moteur §14, côté client.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ───────────────────────────────────────────
 * Les deux premiers tests ne testent pas mon code : ils fixent l'écart qui a
 * motivé ce lot. `NOTIFICATION_RULES_2026` vivait dans game-rules.ts sans un
 * seul lecteur, pendant que les constantes RÉELLEMENT lues disaient autre chose
 * (fin de plage calme à 8 h contre 9 h, 2 par jour contre 1). Si un jour
 * quelqu'un redonne à `PUSH_MAX_PER_DAY` une valeur propre, ces tests tombent.
 *
 * Les scénarios de refus sont EXACTEMENT ceux que rejoue le test SQL
 * (`supabase/tests/notifications_2026.pglite.test.mjs`) : quatrième
 * sollicitation de la semaine, 21 h 30, promo sans opt-in, doublon. Deux
 * moteurs, une seule table de vérité.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  NOTIFICATION_RULES_2026,
  PUSH_MAX_PER_DAY,
  PUSH_QUIET_HOURS_END,
  PUSH_QUIET_HOURS_START,
} from '@klaim/shared';
import {
  applyNotificationSettingsPatch2026,
  canNotify2026,
  DEFAULT_NOTIFICATION_SETTINGS_2026,
  inQuietHours2026,
  NOTIFICATION_CATEGORIES_2026,
  notifChannels2026,
  parseNotificationSettings2026,
  PAUSED_BY_GAME_PAUSE_2026,
  type NotificationLogEntry2026,
  type NotificationSettings2026,
} from './notifications2026.ts';

const DAY = 86_400_000;
const T0 = Date.parse('2026-09-10T12:00:00Z');

const settings = (patch: Partial<NotificationSettings2026> = {}): NotificationSettings2026 => ({
  ...DEFAULT_NOTIFICATION_SETTINGS_2026,
  ...patch,
});

const sent = (
  eventId: string,
  atMs: number,
  category: NotificationLogEntry2026['category'] = 'sport',
  transactional = false,
): NotificationLogEntry2026 => ({ eventId, category, atMs, transactional });

// ─── ÉTAPE 0 ─────────────────────────────────────────────────────────────────

Deno.test('étape 0 — les anciennes constantes DÉRIVENT du cahier, elles ne le contredisent plus', () => {
  assertEquals(PUSH_QUIET_HOURS_START, NOTIFICATION_RULES_2026.quietHoursStart);
  assertEquals(PUSH_QUIET_HOURS_END, NOTIFICATION_RULES_2026.quietHoursEnd);
  assertEquals(PUSH_MAX_PER_DAY, NOTIFICATION_RULES_2026.maximumNonTransactionalPerDay);
  // Les valeurs du cahier elles-mêmes, écrites une fois ici pour qu'un
  // changement de politique soit une DÉCISION et pas un glissement.
  assertEquals(NOTIFICATION_RULES_2026.quietHoursEnd, 9);
  assertEquals(NOTIFICATION_RULES_2026.maximumNonTransactionalPerDay, 1);
  assertEquals(NOTIFICATION_RULES_2026.maximumNonTransactionalPerWeek, 3);
  assertEquals(NOTIFICATION_RULES_2026.maximumOffersPerMonth, 2);
});

Deno.test('étape 0 — le seuil journalier de 3 non-urgents a disparu de @klaim/shared', async () => {
  const shared = (await import('@klaim/shared')) as Record<string, unknown>;
  assert(
    !('NOTIF_NON_URGENT_DAILY_THRESHOLD' in shared),
    'NOTIF_NON_URGENT_DAILY_THRESHOLD est revenu : 3 par JOUR contredit 3 par SEMAINE',
  );
});

// ─── §14.1 : les six catégories et leurs défauts ─────────────────────────────

Deno.test('les six catégories du cahier, dans son ordre, et rien d’autre', () => {
  assertEquals([...NOTIFICATION_CATEGORIES_2026], [
    'sport',
    'crew',
    'events',
    'results',
    'weekly',
    'offers',
  ]);
});

Deno.test('promotion DÉSACTIVÉE par défaut, tout le reste activé', () => {
  assertEquals(DEFAULT_NOTIFICATION_SETTINGS_2026.offers, false);
  for (const c of NOTIFICATION_CATEGORIES_2026) {
    if (c === 'offers') continue;
    assertEquals(DEFAULT_NOTIFICATION_SETTINGS_2026[c], true, `${c} devrait être activée`);
  }
  assertEquals(DEFAULT_NOTIFICATION_SETTINGS_2026.gamePause, false);
});

Deno.test('« Pause du jeu » conserve le compte, le crew et les événements suivis', () => {
  // C'est la phrase du cahier : la pause coupe la RÉTENTION, pas ce à quoi on
  // s'est inscrit. Un test qui la perdrait laisserait rater un rendez-vous.
  for (const kept of ['crew', 'events', 'results'] as const) {
    assert(!PAUSED_BY_GAME_PAUSE_2026.includes(kept), `${kept} ne doit pas être coupée`);
  }
  for (const cut of ['sport', 'weekly', 'offers'] as const) {
    assert(PAUSED_BY_GAME_PAUSE_2026.includes(cut), `${cut} doit être coupée`);
  }
});

// ─── §14.3 : les quatre refus que le SQL rejoue à l'identique ────────────────

Deno.test('4ᵉ sollicitation de la semaine : refusée', () => {
  const log = [
    sent('a', T0 - 5 * DAY),
    sent('b', T0 - 4 * DAY),
    sent('c', T0 - 3 * DAY),
  ];
  const d = canNotify2026(
    settings(),
    { category: 'sport', eventId: 'd', atMs: T0, localHour: 12 },
    log,
  );
  assertEquals(d, { allowed: false, reason: 'weekly_budget' });
  // …et la 3ᵉ passait : sans ça le test ne prouverait pas le SEUIL.
  assertEquals(
    canNotify2026(
      settings(),
      { category: 'sport', eventId: 'c2', atMs: T0, localHour: 12 },
      log.slice(0, 2),
    ),
    { allowed: true },
  );
});

Deno.test('2ᵉ du même jour : refusée (budget quotidien = 1)', () => {
  const d = canNotify2026(
    settings(),
    { category: 'sport', eventId: 'b', atMs: T0, localHour: 12 },
    [sent('a', T0 - 3_600_000)],
  );
  assertEquals(d, { allowed: false, reason: 'daily_budget' });
});

Deno.test('21 h 30 : refusée — et 9 h passe, 8 h 59 non', () => {
  assertEquals(
    canNotify2026(settings(), { category: 'sport', eventId: 'x', atMs: T0, localHour: 21 }, []),
    { allowed: false, reason: 'quiet_hours' },
  );
  assertEquals(
    canNotify2026(settings(), { category: 'sport', eventId: 'x', atMs: T0, localHour: 8 }, []),
    { allowed: false, reason: 'quiet_hours' },
  );
  assertEquals(
    canNotify2026(settings(), { category: 'sport', eventId: 'x', atMs: T0, localHour: 9 }, []),
    { allowed: true },
  );
});

Deno.test('plage calme : intervalle circulaire, et start === end ne coupe rien', () => {
  assert(inQuietHours2026(23, 21, 9));
  assert(inQuietHours2026(3, 21, 9));
  assert(!inQuietHours2026(20, 21, 9));
  // Plage non enjambante (quelqu'un qui coupe l'après-midi) : elle marche aussi.
  assert(inQuietHours2026(14, 13, 17));
  assert(!inQuietHours2026(17, 13, 17));
  // Ni plage vide interprétée comme 24 h de silence, ni l'inverse.
  assert(!inQuietHours2026(3, 9, 9));
});

Deno.test('promo sans opt-in : refusée pour la préférence, pas pour le budget', () => {
  assertEquals(
    canNotify2026(settings(), { category: 'offers', eventId: 'o', atMs: T0, localHour: 12 }, []),
    { allowed: false, reason: 'category_off' },
  );
  // Avec consentement : elle passe…
  assertEquals(
    canNotify2026(
      settings({ offers: true }),
      { category: 'offers', eventId: 'o', atMs: T0, localHour: 12 },
      [],
    ),
    { allowed: true },
  );
});

Deno.test('offres : deux par mois au maximum, la troisième tombe sur SA raison', () => {
  const log = [
    sent('o1', T0 - 20 * DAY, 'offers'),
    sent('o2', T0 - 10 * DAY, 'offers'),
  ];
  assertEquals(
    canNotify2026(
      settings({ offers: true }),
      { category: 'offers', eventId: 'o3', atMs: T0, localHour: 12 },
      log,
    ),
    { allowed: false, reason: 'monthly_offer_budget' },
  );
});

Deno.test('doublon : le même identifiant d’événement ne repasse jamais', () => {
  assertEquals(
    canNotify2026(
      settings(),
      { category: 'results', eventId: 'result:42', atMs: T0, localHour: 12 },
      [sent('result:42', T0 - 60_000, 'results')],
    ),
    { allowed: false, reason: 'duplicate' },
  );
  // …y compris pour un transactionnel : le cahier les déduplique aussi.
  assertEquals(
    canNotify2026(
      settings(),
      {
        category: 'events',
        eventId: 'cancel:7',
        atMs: T0,
        localHour: 23,
        transactional: true,
      },
      [sent('cancel:7', T0 - 60_000, 'events', true)],
    ),
    { allowed: false, reason: 'duplicate' },
  );
});

// ─── Les autres portes de §14.3 ──────────────────────────────────────────────

Deno.test('transactionnel : hors budget et hors plage calme, jamais hors dédup', () => {
  const full = [sent('a', T0 - 5 * DAY), sent('b', T0 - 4 * DAY), sent('c', T0 - 1_000)];
  assertEquals(
    canNotify2026(
      settings(),
      { category: 'events', eventId: 'cancel:9', atMs: T0, localHour: 22, transactional: true },
      full,
    ),
    { allowed: true },
  );
});

Deno.test('un transactionnel ne consomme PAS le budget des suivants', () => {
  const log = [sent('t', T0 - 3_600_000, 'events', true)];
  assertEquals(
    canNotify2026(settings(), { category: 'sport', eventId: 's', atMs: T0, localHour: 12 }, log),
    { allowed: true },
  );
});

Deno.test('activité en cours, blocage, événement devenu faux : trois refus distincts', () => {
  const base = { category: 'sport' as const, eventId: 'z', atMs: T0, localHour: 12 };
  assertEquals(canNotify2026(settings(), { ...base, activityInProgress: true }, []), {
    allowed: false,
    reason: 'activity_in_progress',
  });
  assertEquals(canNotify2026(settings(), { ...base, blocked: true }, []), {
    allowed: false,
    reason: 'blocked',
  });
  assertEquals(canNotify2026(settings(), { ...base, eventStillValid: false }, []), {
    allowed: false,
    reason: 'event_invalid',
  });
});

Deno.test('pause du jeu : coupe le sport, laisse passer un événement suivi', () => {
  const paused = settings({ gamePause: true });
  assertEquals(
    canNotify2026(paused, { category: 'sport', eventId: 's', atMs: T0, localHour: 12 }, []),
    { allowed: false, reason: 'game_paused' },
  );
  assertEquals(
    canNotify2026(paused, { category: 'events', eventId: 'e', atMs: T0, localHour: 12 }, []),
    { allowed: true },
  );
});

Deno.test('préférence coupée : la raison dit « catégorie », jamais « budget »', () => {
  const d = canNotify2026(
    settings({ weekly: false }),
    { category: 'weekly', eventId: 'w', atMs: T0, localHour: 12 },
    [sent('a', T0 - 5 * DAY), sent('b', T0 - 4 * DAY), sent('c', T0 - 3 * DAY)],
  );
  assertEquals(d, { allowed: false, reason: 'category_off' });
});

// ─── Lecture tolérante et patch ──────────────────────────────────────────────

Deno.test('lecture tolérante : chaque champ retombe sur SON défaut', () => {
  assertEquals(parseNotificationSettings2026(null), DEFAULT_NOTIFICATION_SETTINGS_2026);
  assertEquals(parseNotificationSettings2026('nope'), DEFAULT_NOTIFICATION_SETTINGS_2026);
  const partial = parseNotificationSettings2026({ offers: true, weekly: 'oui', quietEndHour: 42 });
  assertEquals(partial.offers, true);
  assertEquals(partial.weekly, DEFAULT_NOTIFICATION_SETTINGS_2026.weekly);
  assertEquals(partial.quietEndHour, DEFAULT_NOTIFICATION_SETTINGS_2026.quietEndHour);
  assertEquals(partial.sport, true);
});

Deno.test('patch : ne mute jamais l’état d’origine', () => {
  const before = settings();
  const after = applyNotificationSettingsPatch2026(before, { sport: false });
  assertEquals(before.sport, true);
  assertEquals(after.sport, false);
});

// ─── Canaux hérités ──────────────────────────────────────────────────────────

Deno.test('les canaux des alarmes abolies ne sont PLUS jamais émis', () => {
  for (const s of [
    settings(),
    settings({ crew: false }),
    settings({ gamePause: true }),
    settings({ offers: true }),
  ]) {
    const channels = notifChannels2026(s);
    assert(!channels.includes('solo'), 'le canal `solo` était celui du decay (§5.3, aboli)');
    assert(
      !channels.includes('competition'),
      'le canal `competition` était celui du vol de zone (§14.2, aboli)',
    );
  }
  assertEquals(notifChannels2026(settings()), ['crew']);
  assertEquals(notifChannels2026(settings({ crew: false })), ['off']);
  assertEquals(notifChannels2026(settings({ gamePause: true })), ['off']);
});
