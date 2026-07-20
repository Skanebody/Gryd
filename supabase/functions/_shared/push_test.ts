/**
 * GRYD — tests de la décision d'envoi push (_shared/push.ts).
 *
 * Ce qui est vérifié ici est exactement ce qui protège le joueur du spam :
 * préférences, quiet hours dans SON fuseau, cap journalier par joueur, et une
 * copie qui reste actionnable et non culpabilisante.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { DECAY_WARNING_DAYS_BEFORE, PUSH_MAX_PER_DAY } from './game-rules.ts';
import {
  buildDecayPush,
  channelEnabled,
  daysUntilDecay,
  type DecayTarget,
  planDecayPushes,
  type PushDevice,
  PUSH_LOCALES,
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
