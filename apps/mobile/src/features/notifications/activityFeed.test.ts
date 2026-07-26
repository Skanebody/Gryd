/**
 * GRYD — tests du moteur pur du flux d'ACTIVITÉ (planche E23).
 *
 * On verrouille les trois règles qui font d'un flux TACTIQUE (et pas une boîte
 * aux lettres) :
 *   · l'ordre est par PRIORITÉ, jamais chronologique — un badge récent ne passe
 *     jamais devant une zone à défendre ;
 *   · le badge de la cloche ne compte que les lignes ACTIONNABLES vivantes ;
 *   · une alerte obsolète se retire seule.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  actionableCount,
  buildActivityFeed,
  isObsolete,
  liveEvents,
  relativeAge,
  type ActivityEvent,
} from './activityFeed.ts';

const NOW = new Date('2026-07-26T12:00:00Z').getTime();
const H = 3600 * 1000;
const D = 24 * H;

function ev(part: Partial<ActivityEvent> & Pick<ActivityEvent, 'id' | 'group'>): ActivityEvent {
  return { createdAtMs: NOW, actionable: false, ...part };
}

Deno.test("buildActivityFeed : l'ORDRE est la priorite, pas la chronologie", () => {
  // Le badge (progression) est le PLUS RÉCENT ; la contestation (defend) est
  // plus ancienne. Un tri chrono mettrait le badge en tête — interdit.
  const feed = buildActivityFeed(
    [
      ev({ id: 'badge', group: 'progression', createdAtMs: NOW }),
      ev({ id: 'contest', group: 'defend', createdAtMs: NOW - 5 * H, actionable: true }),
      ev({ id: 'rival', group: 'rivalry', createdAtMs: NOW - 2 * H, actionable: true }),
      ev({ id: 'crew', group: 'crew', createdAtMs: NOW - 1 * H }),
    ],
    NOW,
  );
  assertEquals(
    feed.map((g) => g.group),
    ['defend', 'rivalry', 'crew', 'progression'],
  );
});

Deno.test("buildActivityFeed : tri INTERNE par recence, groupes vides omis", () => {
  const feed = buildActivityFeed(
    [
      ev({ id: 'p1', group: 'progression', createdAtMs: NOW - 3 * D }),
      ev({ id: 'p2', group: 'progression', createdAtMs: NOW - 1 * H }),
    ],
    NOW,
  );
  // Un seul groupe non vide : les trois tactiques sont ABSENTS, pas peints vides.
  assertEquals(feed.length, 1);
  assertEquals(feed[0]?.group, 'progression');
  // Plus récent d'abord.
  assertEquals(feed[0]?.events.map((e) => e.id), ['p2', 'p1']);
});

Deno.test("buildActivityFeed : aucun evenement -> flux vide (etat calme)", () => {
  assertEquals(buildActivityFeed([], NOW), []);
});

Deno.test("obsolete : une alerte perimee quitte le flux d'elle-meme", () => {
  const perimee = ev({ id: 'old', group: 'defend', actionable: true, expiresAtMs: NOW - 1 });
  const vivante = ev({ id: 'live', group: 'defend', actionable: true, expiresAtMs: NOW + 1 * D });
  assertEquals(isObsolete(perimee, NOW), true);
  assertEquals(isObsolete(vivante, NOW), false);
  assertEquals(liveEvents([perimee, vivante], NOW).map((e) => e.id), ['live']);
  // Une alerte sans échéance ne périme jamais (un badge reste vrai).
  assertEquals(isObsolete(ev({ id: 'b', group: 'progression' }), NOW), false);
});

Deno.test("actionableCount : le badge de la cloche = lignes actionnables vivantes", () => {
  const events = [
    ev({ id: 'a', group: 'defend', actionable: true }),
    ev({ id: 'b', group: 'rivalry', actionable: true }),
    ev({ id: 'c', group: 'progression', actionable: false }), // chevron -> pas compté
    ev({ id: 'd', group: 'defend', actionable: true, expiresAtMs: NOW - 1 }), // périmé -> pas compté
  ];
  assertEquals(actionableCount(events, NOW), 2);
  // Rien d'actionnable (l'état d'avant O1) -> 0 -> pas de badge peint.
  assertEquals(actionableCount([ev({ id: 'x', group: 'progression' })], NOW), 0);
});

Deno.test("relativeAge : today / jours / semaines", () => {
  assertEquals(relativeAge(NOW - 2 * H, NOW), { unit: 'today' });
  assertEquals(relativeAge(NOW - 1 * D, NOW), { unit: 'day', n: 1 });
  assertEquals(relativeAge(NOW - 3 * D, NOW), { unit: 'day', n: 3 });
  assertEquals(relativeAge(NOW - 14 * D, NOW), { unit: 'week', n: 2 });
  // Un futur proche (horloge de biais) ne rend jamais un âge négatif.
  assert(relativeAge(NOW + 5 * H, NOW).unit === 'today');
});
