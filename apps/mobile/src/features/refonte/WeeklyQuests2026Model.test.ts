import { assertEquals, assertExists } from 'jsr:@std/assert@^1';
import { LOCALES } from '../../i18n/types.ts';
import {
  carriesCountdown2026, parseWeeklyQuests2026,
  QUEST_CONDITION_COPY_2026, QUEST_FAMILY_COPY_2026, QUEST_REWARD_KIND_COPY_2026,
} from './WeeklyQuests2026Model.ts';

const reward = (owned = false) => ({
  rewardId: 'quest_sticker_ailleurs', label: 'Sticker Ailleurs', kind: 'sticker', slot: 'sticker', owned,
});
const quest = (patch: Record<string, unknown> = {}) => ({
  activity: 'run', questId: 'exploration_new_locality', version: 1, family: 'exploration',
  condition: 'new_locality', threshold: 1, status: 'active', completedAt: null, reward: reward(), ...patch,
});
const payload = (patch: Record<string, unknown> = {}) => ({
  ruleset: '2026.1', asOf: '2026-09-10T09:00:00Z', passedWeek: '2026-08-31',
  current: [quest()], passed: [], objects: [], ...patch,
});

Deno.test('défis: une réponse complète est lue telle quelle, sans champ inventé', () => {
  const parsed = parseWeeklyQuests2026(payload());
  assertExists(parsed);
  assertEquals(parsed.current.length, 1);
  assertEquals(parsed.current[0]!.reward.owned, false);
  assertEquals(parsed.passed, []);
  assertEquals(parsed.objects, []);
  assertEquals(Object.keys(parsed).sort().join(','), 'asOf,current,objects,passed,passedWeek,ruleset');
});

Deno.test('défis: une liste vide n’est pas une lecture ratée — et une lecture ratée n’est pas une liste vide', () => {
  const empty = parseWeeklyQuests2026(payload({ current: [] }));
  assertExists(empty);
  assertEquals(empty.current, []);
  assertEquals(parseWeeklyQuests2026(null), null);
  assertEquals(parseWeeklyQuests2026([]), null);
  assertEquals(parseWeeklyQuests2026({ ruleset: '2026.1' }), null);
  assertEquals(parseWeeklyQuests2026(payload({ current: [quest({ condition: 'run_more_kilometres' })] })), null);
  assertEquals(parseWeeklyQuests2026(payload({ current: [quest({ activity: 'swim' })] })), null);
  assertEquals(parseWeeklyQuests2026(payload({ current: [quest({ reward: { ...reward(), kind: 'xp' } })] })), null);
  assertEquals(parseWeeklyQuests2026(payload({ current: [quest({ threshold: 0 })] })), null);
});

Deno.test('défis: aucun compte à rebours ne franchit la frontière, à aucune profondeur', () => {
  assertEquals(carriesCountdown2026(payload()), false);
  for (const key of ['expiresAt', 'endsAt', 'daysLeft', 'remaining', 'countdown', 'deadline', 'timeLeft']) {
    const poisoned = payload({ current: [quest({ [key]: '2026-09-13T21:59:59Z' })] });
    assertEquals(carriesCountdown2026(poisoned), true);
    // Un contrat qui reprend une horloge est une régression serveur : l'écran
    // le dit (état « échec ») au lieu d'inventer une pression de sortie.
    assertEquals(parseWeeklyQuests2026(poisoned), null);
  }
  assertEquals(parseWeeklyQuests2026(payload({ weekEndsAt: '2026-09-13T21:59:59Z' })), null);
});

Deno.test('défis: « réussi » et son instant ne se délient jamais', () => {
  assertEquals(parseWeeklyQuests2026(payload({ current: [quest({ status: 'completed' })] })), null);
  assertEquals(parseWeeklyQuests2026(payload({ current: [quest({ completedAt: '2026-09-09T18:00:00Z' })] })), null);
  const done = parseWeeklyQuests2026(payload({
    current: [quest({ status: 'completed', completedAt: '2026-09-09T18:00:00Z', reward: reward(true) })],
  }));
  assertExists(done);
  assertEquals(done.current[0]!.status, 'completed');
  assertEquals(done.current[0]!.reward.owned, true);
  // Une semaine expirée n'a pas d'instant de réussite, et ça reste lisible.
  const expired = parseWeeklyQuests2026(payload({ current: [], passed: [quest({ status: 'expired' })] }));
  assertExists(expired);
  assertEquals(expired.passed[0]!.status, 'expired');
  assertEquals(expired.passed[0]!.completedAt, null);
});

Deno.test('défis: une semaine « passée » qui ne l’est pas est refusée', () => {
  assertEquals(parseWeeklyQuests2026(payload({ passedWeek: '2027-01-04' })), null);
  assertEquals(parseWeeklyQuests2026(payload({ passedWeek: '31/08/2026' })), null);
  assertEquals(parseWeeklyQuests2026(payload({ asOf: 'bientôt' })), null);
});

Deno.test('défis: un objet possédé porte sa nature, sa provenance et son état d’équipement', () => {
  const withObject = parseWeeklyQuests2026(payload({
    objects: [{
      rewardId: 'quest_pattern_regulier', label: 'Motif Régulier', kind: 'trace_pattern', slot: 'trace',
      questId: 'regularity_two_active_days', earnedAt: '2026-09-08T20:00:00Z', equipped: true,
    }],
  }));
  assertExists(withObject);
  assertEquals(withObject.objects[0]!.equipped, true);
  assertEquals(parseWeeklyQuests2026(payload({ objects: [{ rewardId: 'x', label: 'X', kind: 'sticker', slot: 'sticker', questId: 'q', earnedAt: 'jamais', equipped: false }] })), null);
});

Deno.test('défis: chaque condition, chaque famille et chaque nature d’objet est traduite en 5 langues', () => {
  const entries = [
    ...Object.values(QUEST_CONDITION_COPY_2026).flatMap(copy => [copy.title, copy.detail]),
    ...Object.values(QUEST_FAMILY_COPY_2026),
    ...Object.values(QUEST_REWARD_KIND_COPY_2026),
  ];
  assertEquals(entries.length, 6 * 2 + 8 + 5);
  for (const entry of entries) {
    for (const locale of LOCALES) {
      assertEquals(typeof entry[locale], 'string');
      assertEquals(entry[locale].length > 0, true);
    }
  }
});

Deno.test('défis: aucune condition ne demande « plus » — ni distance, ni allure, ni série', () => {
  const forbidden = /\bkm\b|kilom|allure|pace|vitesse|record|série|streak|plus vite|plus long/i;
  for (const copy of Object.values(QUEST_CONDITION_COPY_2026)) {
    for (const locale of LOCALES) {
      assertEquals(forbidden.test(copy.title[locale]), false, `${locale}: ${copy.title[locale]}`);
    }
  }
});
