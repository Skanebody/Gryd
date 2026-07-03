/**
 * Tests digest_job/logic.ts — SPEC §4.3 (quiet hours 21h-8h, cap 2 push/jour),
 * GRYD_notifications_logic.md §3/§6. Purs, aucun réseau.
 *
 * Les bornes horaires sont testées en heure de PARIS (quiet hours = heure
 * locale du joueur) : le 3 juillet, Paris = UTC+2 → 20:59 Paris = 18:59 UTC.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { PUSH_MAX_PER_DAY } from '../_shared/game-rules.ts';
import { buildDigest, canPush, type PushUser } from './logic.ts';

const USER: PushUser = { id: 'user-1' };
/** Instant UTC correspondant à une heure de Paris (été : UTC+2). */
const paris = (isoLocal: string) => new Date(`${isoLocal}+02:00`);

// ─── canPush : quiet hours (bornes exactes) ──────────────────────────────────

Deno.test('14h00 Paris, aucun push aujourd’hui → autorisé', () => {
  assertEquals(canPush(USER, paris('2026-07-03T14:00:00'), []), { allowed: true });
});

Deno.test('20h59 Paris → autorisé (dernière minute avant quiet hours)', () => {
  assertEquals(canPush(USER, paris('2026-07-03T20:59:59'), []), { allowed: true });
});

Deno.test('21h00 pile Paris → bloqué (début des quiet hours, inclusif)', () => {
  assertEquals(
    canPush(USER, paris('2026-07-03T21:00:00'), []),
    { allowed: false, reason: 'quiet_hours' },
  );
});

Deno.test('21h01 Paris → bloqué (quiet hours)', () => {
  assertEquals(
    canPush(USER, paris('2026-07-03T21:01:00'), []),
    { allowed: false, reason: 'quiet_hours' },
  );
});

Deno.test('3h00 Paris (nuit) → bloqué ; 7h59 → bloqué ; 8h00 pile → autorisé', () => {
  assertEquals(canPush(USER, paris('2026-07-03T03:00:00'), []).reason, 'quiet_hours');
  assertEquals(canPush(USER, paris('2026-07-03T07:59:59'), []).reason, 'quiet_hours');
  assertEquals(canPush(USER, paris('2026-07-03T08:00:00'), []), { allowed: true });
});

Deno.test('les quiet hours suivent le fuseau du joueur, pas l’UTC', () => {
  // 22h00 UTC = minuit à Paris (bloqué) mais 18h00 à São Paulo (autorisé).
  const at = new Date('2026-07-03T22:00:00Z');
  assertEquals(canPush(USER, at, []).reason, 'quiet_hours');
  assertEquals(canPush({ id: 'u', timeZone: 'America/Sao_Paulo' }, at, []), { allowed: true });
});

// ─── canPush : cap PUSH_MAX_PER_DAY ──────────────────────────────────────────

Deno.test('cap 2/jour atteint → bloqué (tous types confondus)', () => {
  assertEquals(PUSH_MAX_PER_DAY, 2); // garde-fou : cap gelé §4.3
  const now = paris('2026-07-03T14:00:00');
  const log = [paris('2026-07-03T09:00:00'), paris('2026-07-03T12:00:00')];
  assertEquals(canPush(USER, now, log), { allowed: false, reason: 'daily_cap' });
});

Deno.test('1 push aujourd’hui sur un cap de 2 → encore autorisé', () => {
  const now = paris('2026-07-03T14:00:00');
  assertEquals(canPush(USER, now, [paris('2026-07-03T09:00:00')]), { allowed: true });
});

Deno.test('les push d’HIER ne comptent pas dans le cap du jour (jour LOCAL)', () => {
  const now = paris('2026-07-03T14:00:00');
  // 2 push la veille au soir + 23h30 Paris (= 21h30 UTC le 2) → jour local 2/07.
  const log = [paris('2026-07-02T18:00:00'), paris('2026-07-02T23:30:00')];
  assertEquals(canPush(USER, now, log), { allowed: true });
});

// ─── buildDigest (doc notifs §6) ─────────────────────────────────────────────

Deno.test('digest groupé : ordre stable, pluriels fr, « + » sur les gains', () => {
  const d = buildDigest([
    { type: 'zones_lost', count: 1 },
    { type: 'hexes_gained', count: 34 },
    { type: 'badges_unlocked', count: 1 },
    { type: 'zones_defended', count: 3 },
  ], 'weekly');
  assertEquals(d, {
    title: 'Résumé GRYD de la semaine',
    body: '+34 hexes gagnés, 3 zones défendues, 1 zone perdue, 1 badge débloqué.',
    itemCount: 4,
  });
});

Deno.test('doublons fusionnés par type, comptes nuls/négatifs ignorés', () => {
  const d = buildDigest([
    { type: 'crew_runs', count: 2 },
    { type: 'crew_runs', count: 3 },
    { type: 'hexes_gained', count: 0 },
    { type: 'zones_lost', count: -1 },
  ], 'crew');
  assertEquals(d, {
    title: 'Résumé GRYD du crew',
    body: '5 courses du crew.',
    itemCount: 1,
  });
});

Deno.test('aucun événement (ou que des zéros) → null, jamais de digest vide', () => {
  assertEquals(buildDigest([], 'weekly'), null);
  assertEquals(buildDigest([{ type: 'hexes_gained', count: 0 }], 'crew'), null);
});
