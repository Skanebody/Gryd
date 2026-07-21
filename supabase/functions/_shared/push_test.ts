/**
 * GRYD — tests de la décision d'envoi push (_shared/push.ts).
 *
 * Ce qui est vérifié ici est exactement ce qui protège le joueur du spam :
 * préférences, quiet hours dans SON fuseau, cap journalier par joueur, et une
 * copie qui reste actionnable et non culpabilisante.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  DECAY_WARNING_DAYS_BEFORE,
  PUSH_MAX_PER_DAY,
  STEAL_PUSH_COOLDOWN_MINUTES,
  STEAL_PUSH_MIN_HEXES,
} from './game-rules.ts';
import {
  aggregateStealEvents,
  buildDecayPush,
  buildStealPush,
  channelEnabled,
  daysUntilDecay,
  type DecayTarget,
  planDecayPushes,
  planStealPushes,
  type PushDevice,
  PUSH_LOCALES,
  type StealEvent,
  stealCooldownElapsed,
} from './push.ts';

const paris = (iso: string) => new Date(`${iso}+02:00`); // été
const USER = 'user-1';

const device = (over: Partial<PushDevice> = {}): PushDevice => ({
  userId: USER,
  expoToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  locale: 'fr',
  timeZone: 'Europe/Paris',
  channels: ['solo', 'crew'],
  ...over,
});

const target = (over: Partial<DecayTarget> = {}): DecayTarget => ({
  userId: USER,
  hexCount: 3,
  earliestDecayAt: paris('2026-07-06T10:00:00'),
  ...over,
});

const plan = (
  devices: PushDevice[],
  now = paris('2026-07-03T10:00:00'),
  log: Date[] = [],
  t: DecayTarget = target(),
) =>
  planDecayPushes(
    [t],
    new Map([[USER, devices]]),
    new Map([[USER, log]]),
    now,
  );

// ─── Préférences : le joueur décide ──────────────────────────────────────────

Deno.test('canal solo actif → push envoyé', () => {
  const p = plan([device()]);
  assertEquals(p.sends.length, 1);
  assertEquals(p.sends[0].messages.length, 1);
  assertEquals(p.suppressed.length, 0);
});

Deno.test('canal solo désactivé → aucun push (l\'inbox, elle, reste)', () => {
  const p = plan([device({ channels: ['crew'] })]);
  assertEquals(p.sends.length, 0);
  assertEquals(p.suppressed, [{ userId: USER, reason: 'channel_off' }]);
});

Deno.test('« off » est exclusif : il coupe tout, même listé avec solo', () => {
  assertEquals(channelEnabled(['off'], 'solo'), false);
  assertEquals(channelEnabled(['solo', 'off'], 'solo'), false);
  assertEquals(channelEnabled([], 'solo'), false);
  assertEquals(plan([device({ channels: ['off'] })]).sends.length, 0);
});

Deno.test('aucun appareil enregistré → rien, et c\'est tracé', () => {
  const p = planDecayPushes([target()], new Map(), new Map(), paris('2026-07-03T10:00:00'));
  assertEquals(p.sends.length, 0);
  assertEquals(p.suppressed, [{ userId: USER, reason: 'no_device' }]);
});

Deno.test('deux téléphones = deux messages mais UN SEUL envoi (cap par joueur)', () => {
  const p = plan([device(), device({ expoToken: 'ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]' })]);
  assertEquals(p.sends.length, 1);
  assertEquals(p.sends[0].messages.length, 2);
});

// ─── Quiet hours dans le fuseau RÉEL de l'appareil ───────────────────────────

Deno.test('quiet hours : 21h locale bloque', () => {
  const p = plan([device()], paris('2026-07-03T21:00:00'));
  assertEquals(p.suppressed, [{ userId: USER, reason: 'quiet_hours' }]);
});

Deno.test('quiet hours : le fuseau de l\'appareil fait foi, pas Paris', () => {
  const at = paris('2026-07-03T22:00:00'); // nuit à Paris, 17h à São Paulo
  assertEquals(plan([device()], at).sends.length, 0);
  assertEquals(plan([device({ timeZone: 'America/Sao_Paulo' })], at).sends.length, 1);
});

Deno.test('fuseau invalide → repli sur le défaut, jamais un job qui casse', () => {
  const p = plan([device({ timeZone: 'Mars/Olympus' })], paris('2026-07-03T10:00:00'));
  assertEquals(p.sends.length, 1);
});

// ─── Cap journalier ──────────────────────────────────────────────────────────

Deno.test('cap PUSH_MAX_PER_DAY atteint → supprimé', () => {
  const now = paris('2026-07-03T10:00:00');
  const log = Array.from({ length: PUSH_MAX_PER_DAY }, () => paris('2026-07-03T09:00:00'));
  assertEquals(plan([device()], now, log).suppressed, [{ userId: USER, reason: 'daily_cap' }]);
});

Deno.test('les envois d\'hier ne consomment pas le cap d\'aujourd\'hui', () => {
  const now = paris('2026-07-03T10:00:00');
  const log = Array.from({ length: PUSH_MAX_PER_DAY }, () => paris('2026-07-02T09:00:00'));
  assertEquals(plan([device()], now, log).sends.length, 1);
});

// ─── Copie : actionnable, honnête, jamais culpabilisante ─────────────────────

Deno.test('le corps porte le compte réel et un délai borné à la fenêtre', () => {
  const now = paris('2026-07-03T10:00:00');
  const msg = buildDecayPush(device(), 3, paris('2026-07-06T10:00:00'), now);
  assert(msg.body.includes('3 zones'));
  assert(msg.body.includes('3 j'));
  assertEquals(msg.data.cta, 'defend');
  assertEquals(msg.priority, 'default');
});

Deno.test('singulier vs pluriel', () => {
  const now = paris('2026-07-03T10:00:00');
  const one = buildDecayPush(device(), 1, paris('2026-07-05T10:00:00'), now);
  assert(one.body.startsWith('1 zone '));
});

Deno.test('les 5 langues existent et parlent d\'action', () => {
  const now = paris('2026-07-03T10:00:00');
  for (const locale of PUSH_LOCALES) {
    const msg = buildDecayPush(device({ locale }), 2, paris('2026-07-05T10:00:00'), now);
    assert(msg.title.length > 0, `titre ${locale}`);
    assert(msg.body.includes('2'), `compte ${locale}`);
    // Aucun placeholder oublié : un « {n} » à l'écran, c'est un mensonge de plus.
    assert(!msg.body.includes('{'), `placeholder résiduel ${locale}`);
  }
});

Deno.test('jamais « dans 0 j », jamais plus que la fenêtre d\'avertissement', () => {
  const now = paris('2026-07-03T10:00:00');
  assertEquals(daysUntilDecay(paris('2026-07-03T10:30:00'), now), 1); // imminent
  assertEquals(daysUntilDecay(paris('2026-07-02T10:00:00'), now), 1); // cron en retard
  assertEquals(
    daysUntilDecay(paris('2026-07-30T10:00:00'), now),
    DECAY_WARNING_DAYS_BEFORE, // borné : on n'annonce pas plus que la fenêtre
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// VOL SUBI — « quelqu'un a pris ton territoire »
// ═════════════════════════════════════════════════════════════════════════════

const VICTIM = 'victim-1';
const RIVAL = 'rival-1';

const steal = (over: Partial<StealEvent> = {}): StealEvent => ({
  victimUserId: VICTIM,
  thiefUserId: RIVAL,
  hexId: 'hex-1',
  sectorId: 'sector-1',
  sectorName: 'République',
  at: paris('2026-07-03T09:30:00'),
  ...over,
});

/** n vols distincts, tous du même rival, dans le même secteur nommé. */
const steals = (n: number, over: Partial<StealEvent> = {}): StealEvent[] =>
  Array.from({ length: n }, (_, i) => steal({ hexId: `hex-${i}`, ...over }));

const competitionDevice = (over: Partial<PushDevice> = {}): PushDevice =>
  device({ userId: VICTIM, channels: ['competition'], ...over });

const planSteal = (
  events: StealEvent[],
  devices: PushDevice[] = [competitionDevice()],
  now = paris('2026-07-03T10:00:00'),
  log: Date[] = [],
  lastSteal?: Date,
) =>
  planStealPushes(
    events,
    new Map([[VICTIM, devices]]),
    new Map([[VICTIM, log]]),
    lastSteal ? new Map([[VICTIM, lastSteal]]) : new Map(),
    now,
  );

// ─── L'AGRÉGATION, cœur de l'anti-spam ───────────────────────────────────────

Deno.test('vol : 50 hexes d\'un coup → UN SEUL message agrégé', () => {
  const p = planSteal(steals(50));
  assertEquals(p.sends.length, 1);
  assertEquals(p.sends[0].messages.length, 1);
  assert(p.sends[0].messages[0].body.includes('50 zones'));
});

Deno.test('vol : une course qui frappe 3 victimes → 1 message CHACUNE', () => {
  const victims = ['v-a', 'v-b', 'v-c'];
  const events = victims.flatMap((v) =>
    steals(STEAL_PUSH_MIN_HEXES, { victimUserId: v }).map((e, i) => ({
      ...e,
      hexId: `${v}-hex-${i}`,
    }))
  );
  const p = planStealPushes(
    events,
    new Map(victims.map((v) => [v, [competitionDevice({ userId: v })]])),
    new Map(),
    new Map(),
    paris('2026-07-03T10:00:00'),
  );
  assertEquals(p.sends.length, 3);
  assertEquals(p.sends.map((s) => s.userId), victims); // ordre stable
  for (const s of p.sends) assertEquals(s.messages.length, 1);
});

Deno.test('vol : plusieurs rivaux sur la MÊME victime → toujours un seul message', () => {
  const events = Array.from({ length: 12 }, (_, i) =>
    steal({ hexId: `hex-${i}`, thiefUserId: `rival-${i}` }));
  const p = planSteal(events);
  assertEquals(p.sends.length, 1);
  assertEquals(p.sends[0].messages.length, 1);
  assertEquals(aggregateStealEvents(events)[0].rivalCount, 12);
});

Deno.test('vol : « dix rivaux dans la même heure » en dix passes → une seule notif', () => {
  // Chaque passe est un appel séparé (dix ingests successifs). Le cooldown, et
  // non le cap journalier, est ce qui tient : il n'y a qu'UN envoi.
  let lastSteal: Date | undefined;
  let sent = 0;
  for (let i = 0; i < 10; i++) {
    const now = new Date(paris('2026-07-03T10:00:00').getTime() + i * 6 * 60_000); // +6 min
    const p = planSteal(
      steals(STEAL_PUSH_MIN_HEXES, { thiefUserId: `rival-${i}` }),
      [competitionDevice()],
      now,
      [],
      lastSteal,
    );
    if (p.sends.length > 0) {
      sent++;
      lastSteal = now;
    } else {
      assertEquals(p.suppressed[0].reason, 'too_soon');
    }
  }
  assertEquals(sent, 1);
});

Deno.test('vol : le cooldown écoulé rouvre la notification (la boucle vit)', () => {
  const last = paris('2026-07-03T09:00:00');
  const after = new Date(last.getTime() + STEAL_PUSH_COOLDOWN_MINUTES * 60_000);
  assertEquals(stealCooldownElapsed(last, after), true);
  assertEquals(stealCooldownElapsed(last, new Date(after.getTime() - 1)), false);
  assertEquals(stealCooldownElapsed(undefined, after), true);
  assertEquals(planSteal(steals(9), [competitionDevice()], after, [], last).sends.length, 1);
});

Deno.test('vol : un même hex volé deux fois ne compte qu\'une perte', () => {
  const events = [...steals(6), ...steals(6)]; // mêmes hexIds
  assertEquals(aggregateStealEvents(events)[0].hexCount, 6);
});

// ─── « Perte significative » : pas chaque hex ─────────────────────────────────

Deno.test('vol : sous le seuil → aucun push, et c\'est tracé', () => {
  const p = planSteal(steals(STEAL_PUSH_MIN_HEXES - 1));
  assertEquals(p.sends.length, 0);
  assertEquals(p.suppressed, [{ userId: VICTIM, reason: 'below_threshold' }]);
});

Deno.test('vol : pile au seuil → push', () => {
  assertEquals(planSteal(steals(STEAL_PUSH_MIN_HEXES)).sends.length, 1);
});

// ─── « Je me vole moi-même » : jamais de notification ─────────────────────────

Deno.test('vol : re-capture d\'un hex déjà à moi → RIEN, pas même un suppressed', () => {
  const events = steals(20, { thiefUserId: VICTIM }); // victime === voleur
  assertEquals(aggregateStealEvents(events), []);
  const p = planSteal(events);
  assertEquals(p.sends.length, 0);
  assertEquals(p.suppressed.length, 0);
});

Deno.test('vol : mes propres reprises n\'enflent pas le compte d\'un vrai vol', () => {
  const events = [
    ...steals(6, { thiefUserId: VICTIM }).map((e, i) => ({ ...e, hexId: `mine-${i}` })),
    ...steals(7),
  ];
  const [t] = aggregateStealEvents(events);
  assertEquals(t.hexCount, 7);
  assertEquals(t.rivalCount, 1);
});

// ─── Préférences : canal `competition` ───────────────────────────────────────

Deno.test('vol : canal competition coupé → rien (l\'inbox, elle, reste)', () => {
  const p = planSteal(steals(9), [competitionDevice({ channels: ['solo', 'crew'] })]);
  assertEquals(p.sends.length, 0);
  assertEquals(p.suppressed, [{ userId: VICTIM, reason: 'channel_off' }]);
});

Deno.test('vol : « off » coupe aussi le vol', () => {
  assertEquals(planSteal(steals(9), [competitionDevice({ channels: ['off'] })]).sends.length, 0);
});

Deno.test('vol : aucun appareil enregistré → rien, et c\'est tracé', () => {
  const p = planStealPushes(steals(9), new Map(), new Map(), new Map(), paris('2026-07-03T10:00:00'));
  assertEquals(p.suppressed, [{ userId: VICTIM, reason: 'no_device' }]);
});

Deno.test('vol : deux téléphones = deux messages, UN SEUL envoi', () => {
  const p = planSteal(steals(9), [
    competitionDevice(),
    competitionDevice({ expoToken: 'ExponentPushToken[zzzzzzzzzzzzzzzzzzzzzz]' }),
  ]);
  assertEquals(p.sends.length, 1);
  assertEquals(p.sends[0].messages.length, 2);
});

// ─── Quiet hours + cap : le vol n'a aucun passe-droit ────────────────────────

Deno.test('vol : quiet hours bloquent, dans le fuseau de l\'appareil', () => {
  const at = paris('2026-07-03T22:00:00'); // nuit à Paris, 17h à São Paulo
  assertEquals(planSteal(steals(9), [competitionDevice()], at).suppressed, [
    { userId: VICTIM, reason: 'quiet_hours' },
  ]);
  assertEquals(
    planSteal(steals(9), [competitionDevice({ timeZone: 'America/Sao_Paulo' })], at).sends.length,
    1,
  );
});

Deno.test('vol : cap journalier atteint → supprimé (un vol ne double pas le quota)', () => {
  const now = paris('2026-07-03T10:00:00');
  const log = Array.from({ length: PUSH_MAX_PER_DAY }, () => paris('2026-07-03T09:00:00'));
  assertEquals(planSteal(steals(9), [competitionDevice()], now, log).suppressed, [
    { userId: VICTIM, reason: 'daily_cap' },
  ]);
});

// ─── Copie : honnête, actionnable, sans reproche, sans coupable nommé ────────

Deno.test('vol : singulier vs pluriel', () => {
  const one = buildStealPush(competitionDevice(), {
    userId: VICTIM,
    hexCount: 1,
    sectorName: 'République',
    sectorId: 'sector-1',
    sectorCount: 1,
    rivalCount: 1,
    latestAt: paris('2026-07-03T09:30:00'),
  });
  assert(one.body.startsWith('1 zone '), one.body);
  assert(!one.body.includes('1 zones'));

  const many = buildStealPush(competitionDevice(), {
    userId: VICTIM,
    hexCount: 18,
    sectorName: 'République',
    sectorId: 'sector-1',
    sectorCount: 1,
    rivalCount: 1,
    latestAt: paris('2026-07-03T09:30:00'),
  });
  assert(many.body.startsWith('18 zones '), many.body);
});

Deno.test('vol : le secteur nommé apparaît dans le titre', () => {
  const p = planSteal(steals(9));
  assert(p.sends[0].messages[0].title.includes('République'));
  assertEquals(p.sends[0].messages[0].data.sectorId, 'sector-1');
});

Deno.test('vol : secteur SANS nom connu → titre sans lieu, JAMAIS un lieu inventé', () => {
  for (const name of [null, undefined, '', '   ']) {
    const p = planSteal(steals(9, { sectorName: name }));
    const msg = p.sends[0].messages[0];
    assertEquals(msg.title, 'Ton territoire a changé de mains');
    assert(!msg.title.includes('{'), 'placeholder résiduel');
    assert(msg.body.includes('9 zones'), 'le compte réel reste dit');
  }
});

Deno.test('vol : le secteur retenu est le PLUS touché, et son nom ne se replie pas', () => {
  const events = [
    ...steals(3, { sectorId: 's-petit', sectorName: 'Bastille' })
      .map((e, i) => ({ ...e, hexId: `p-${i}` })),
    ...steals(8, { sectorId: 's-gros', sectorName: null })
      .map((e, i) => ({ ...e, hexId: `g-${i}` })),
  ];
  const [t] = aggregateStealEvents(events);
  assertEquals(t.hexCount, 11);
  assertEquals(t.sectorCount, 2);
  assertEquals(t.sectorId, 's-gros');
  // Le gros secteur n'a pas de nom → on ne nomme PAS Bastille : ce serait
  // désigner le mauvais endroit.
  assertEquals(t.sectorName, null);
});

Deno.test('vol : aucun nom de rival, ni de crew, ni de coureur, dans le message', () => {
  const events = Array.from({ length: 9 }, (_, i) =>
    steal({ hexId: `hex-${i}`, thiefUserId: `rival-${i}` }));
  for (const locale of PUSH_LOCALES) {
    const p = planSteal(events, [competitionDevice({ locale })]);
    const msg = p.sends[0].messages[0];
    const text = `${msg.title} ${msg.body}`;
    for (let i = 0; i < 9; i++) assert(!text.includes(`rival-${i}`), `rival nommé (${locale})`);
    // Le payload non plus ne transporte pas d'identifiant d'attaquant.
    assertEquals(JSON.stringify(msg.data).includes('rival-'), false);
  }
});

Deno.test('vol : les 5 langues existent, comptent juste et restent actionnables', () => {
  for (const locale of PUSH_LOCALES) {
    const p = planSteal(steals(7), [competitionDevice({ locale })]);
    const msg = p.sends[0].messages[0];
    assert(msg.title.length > 0, `titre ${locale}`);
    assert(msg.body.includes('7'), `compte ${locale}`);
    assert(!msg.body.includes('{'), `placeholder résiduel body ${locale}`);
    assert(!msg.title.includes('{'), `placeholder résiduel titre ${locale}`);
    assert(msg.title.includes('République'), `secteur ${locale}`);
  }
});

Deno.test('vol : la copie constate, elle ne fait pas honte', () => {
  const p = planSteal(steals(9));
  const msg = p.sends[0].messages[0];
  const text = `${msg.title} ${msg.body}`.toLowerCase();
  for (const blame of ['perdu', 'tu n\'as pas', 'dommage', 'trop tard', 'échec']) {
    assert(!text.includes(blame), `formulation culpabilisante : ${blame}`);
  }
  assertEquals(msg.data.cta, 'reclaim'); // toujours une action
});

// ─── Anti pay-to-win (AMENDEMENT-45 C1, §22) ────────────────────────────────

Deno.test('vol : priorité « default » — personne n\'est prévenu plus fort', () => {
  assertEquals(planSteal(steals(9)).sends[0].messages[0].priority, 'default');
});

Deno.test('vol : deux joueurs, même perte, même instant → messages identiques', () => {
  const now = paris('2026-07-03T10:00:00');
  const mk = (v: string) =>
    planStealPushes(
      steals(9, { victimUserId: v }).map((e, i) => ({ ...e, hexId: `hex-${i}` })),
      new Map([[v, [competitionDevice({ userId: v })]]]),
      new Map(),
      new Map(),
      now,
    ).sends[0].messages[0];
  const a = mk('joueur-gratuit');
  const b = mk('joueur-pass-saison');
  assertEquals(a.title, b.title);
  assertEquals(a.body, b.body);
  assertEquals(a.priority, b.priority);
});
