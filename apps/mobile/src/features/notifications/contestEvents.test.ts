/**
 * GRYD — tests du moteur PUR « contestation réelle → ligne À DÉFENDRE ».
 *
 * Chaque cas ci-dessous correspond à une manière précise de mentir au joueur :
 *   · compter une attaque QUE J'AI LANCÉE comme une zone à défendre ;
 *   · alarmer sur une contestation déjà tranchée ;
 *   · produire une ligne sans échéance, qui ne s'éteindrait jamais ;
 *   · afficher « il y a NaN » sur une date illisible.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { defendEventsFromContests, type FeedContestRow } from './contestEvents.ts';
import { actionableCount } from './activityFeed.ts';

const NOW = new Date('2026-07-27T12:00:00Z').getTime();
const H = 3600 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

const MINE = 'terr-a';
const THEIRS = 'terr-b';
const MY_IDS = new Set([MINE]);

function row(part: Partial<FeedContestRow> & Pick<FeedContestRow, 'id'>): FeedContestRow {
  return {
    territory_id: MINE,
    status: 'active',
    started_at: iso(NOW - 2 * H),
    expires_at: iso(NOW + 16 * H),
    ...part,
  };
}

Deno.test('une contestation ACTIVE sur MON territoire devient une ligne actionnable', () => {
  const events = defendEventsFromContests([row({ id: 'k1' })], MY_IDS);
  assertEquals(events.length, 1);
  assertEquals(events[0].id, 'contest:k1');
  assertEquals(events[0].group, 'defend');
  assertEquals(events[0].actionable, true);
  assertEquals(events[0].createdAtMs, NOW - 2 * H);
  assertEquals(events[0].expiresAtMs, NOW + 16 * H);
  // Et elle compte donc dans le badge de la cloche.
  assertEquals(actionableCount(events, NOW), 1);
});

Deno.test('une attaque QUE JE MENE n est PAS une zone a defendre', () => {
  // La policy 0078 m'ouvre les deux camps : la contestation que j'ai lancée vise
  // le territoire d'un autre. La compter alarmerait pour mon propre assaut.
  const events = defendEventsFromContests([row({ id: 'k2', territory_id: THEIRS })], MY_IDS);
  assertEquals(events, []);
});

Deno.test('une contestation TRANCHEE n a plus rien a defendre', () => {
  const closed: FeedContestRow[] = [
    row({ id: 'd', status: 'defended' }),
    row({ id: 't', status: 'transferred' }),
    row({ id: 'c', status: 'cancelled' }),
  ];
  assertEquals(defendEventsFromContests(closed, MY_IDS), []);
});

Deno.test('une date illisible ne produit AUCUNE ligne (jamais une fausse)', () => {
  const bad: FeedContestRow[] = [
    row({ id: 'no-exp', expires_at: null }),
    row({ id: 'bad-exp', expires_at: 'pas-une-date' }),
    row({ id: 'no-start', started_at: null }),
    row({ id: 'bad-start', started_at: '' }),
  ];
  assertEquals(defendEventsFromContests(bad, MY_IDS), []);
});

Deno.test('une contestation deja expiree reste lisible mais ne compte plus', () => {
  // Le mapping la produit (elle a existé, ses dates sont vraies) ; c'est
  // l'horloge du rendu qui la retire — la péremption n'est PAS figée à la lecture.
  const events = defendEventsFromContests(
    [row({ id: 'old', started_at: iso(NOW - 40 * H), expires_at: iso(NOW - 4 * H) })],
    MY_IDS,
  );
  assertEquals(events.length, 1);
  assertEquals(actionableCount(events, NOW), 0);
  // …et elle comptait bel et bien avant son échéance.
  assertEquals(actionableCount(events, NOW - 10 * H), 1);
});

Deno.test('aucun territoire a moi => aucune ligne, quoi que rende le serveur', () => {
  assertEquals(defendEventsFromContests([row({ id: 'k' })], new Set<string>()), []);
});

Deno.test('plusieurs contestations : une ligne par contestation, ids distincts', () => {
  const events = defendEventsFromContests(
    [row({ id: 'k1' }), row({ id: 'k2' }), row({ id: 'k3', territory_id: THEIRS })],
    MY_IDS,
  );
  assertEquals(
    events.map((e) => e.id),
    ['contest:k1', 'contest:k2'],
  );
});
