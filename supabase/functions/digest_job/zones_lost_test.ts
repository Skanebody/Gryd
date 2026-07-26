/**
 * GRYD — « ZONES PERDUES » : UN COMPTE DE ZONES, PAR DISCIPLINE, OU RIEN.
 *
 * Le défaut réparé, dit sans euphémisme : le récap hebdo comptait des LIGNES de
 * `notifications` de type `steal`. Une ligne est un ÉVÉNEMENT AGRÉGÉ par
 * victime (steal_push_job:inboxRow) et couvre `payload.hexCount` hexagones :
 * « 3 zones perdues » pouvait valoir vingt zones. Et quand `payload.activity`
 * était `null`, la même ligne agrégeait les DEUX mondes — la somme que E14
 * interdit, poussée dans l'inbox du joueur.
 *
 * La difficulté, et pourquoi ce fichier existe : `payload.activity = null` NE
 * VEUT PAS DIRE « mêlé ». `worldToName` (steal_push_job/logic.ts) y met `null`
 * aussi bien quand les pertes couvrent deux mondes que quand le joueur n'en
 * pratique qu'un — auquel cas le nommer n'aurait rien distingué. La règle
 * testée ici est donc celle-là : lever l'ambiguïté quand on PEUT (un seul monde
 * pratiqué ⇒ tout son territoire y vit), s'ABSTENIR de chiffrer quand on ne
 * peut pas. Jamais deviner.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import type { Activity } from '../_shared/game-rules.ts';
import {
  buildDigest,
  buildZonesLost,
  readPayloadActivity,
  readPayloadHexCount,
  type StealNotificationRow,
} from './logic.ts';

const U = 'user-1';
const V = 'user-2';

const row = (over: Partial<StealNotificationRow> = {}): StealNotificationRow => ({
  userId: U,
  hexCount: 4,
  activity: null,
  ...over,
});

const worlds = (...pairs: [string, Activity[]][]) =>
  new Map(pairs.map(([uid, list]) => [uid, new Set(list)]));

// ════════════════════════════════════════════════════════════════════════════
// 1. LES LECTEURS DE PAYLOAD — l'absence n'est pas un fait
// ════════════════════════════════════════════════════════════════════════════

Deno.test('readPayloadHexCount : un entier positif, ou RIEN (jamais 1 par défaut)', () => {
  assertEquals(readPayloadHexCount(7), 7);
  assertEquals(readPayloadHexCount(1), 1);
  // Le repli à 1 serait exactement le bug d'origine : une ligne = une zone.
  for (const bogus of [undefined, null, 0, -3, 2.5, '4', NaN, Infinity, {}, []]) {
    assertEquals(readPayloadHexCount(bogus), null, `« ${JSON.stringify(bogus)} » ne vaut pas 1`);
  }
});

Deno.test('readPayloadActivity : absente ⇒ NON ATTRIBUABLE, surtout pas « run »', () => {
  assertEquals(readPayloadActivity('run'), 'run');
  assertEquals(readPayloadActivity('bike'), 'bike');
  // Contrairement à `readActivity` (colonne `hex_claims`, où l'absence est un
  // FAIT historique adossé à `default 'run'`), un payload sans monde ne prouve
  // rien : le lui attribuer serait inventer une discipline.
  assertEquals(readPayloadActivity(undefined), null);
  assertEquals(readPayloadActivity(null), null);
  assertEquals(readPayloadActivity('scooter'), null);
  assertEquals(readPayloadActivity(3), null);
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE DÉFAUT — des ZONES, plus des lignes
// ════════════════════════════════════════════════════════════════════════════

Deno.test('LE DÉFAUT : trois notifications de 7, 8 et 5 zones font 20, pas 3', () => {
  const r = buildZonesLost(
    [row({ hexCount: 7 }), row({ hexCount: 8 }), row({ hexCount: 5 })],
    worlds([U, ['run']]),
  );
  assertEquals(r.events, [{ userId: U, event: { type: 'zones_lost', count: 20, activity: 'run' } }]);
  assertEquals(r.unquantifiable, []);
});

Deno.test('le compte traverse jusqu’à la COPIE que le joueur lit', () => {
  const r = buildZonesLost([row({ hexCount: 20 })], worlds([U, ['run']]));
  assertEquals(
    buildDigest(r.events.map((e) => e.event), 'weekly')?.body,
    '20 zones perdues à pied.',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LA DISCIPLINE — chaque monde chez lui, jamais sommés
// ════════════════════════════════════════════════════════════════════════════

Deno.test('deux mondes nommés → deux comptes, jamais leur somme', () => {
  const r = buildZonesLost(
    [row({ hexCount: 3, activity: 'run' }), row({ hexCount: 2, activity: 'bike' })],
    worlds([U, ['run', 'bike']]),
  );
  assertEquals(r.events, [
    { userId: U, event: { type: 'zones_lost', count: 3, activity: 'run' } },
    { userId: U, event: { type: 'zones_lost', count: 2, activity: 'bike' } },
  ]);
  // La preuve côté copie : « 5 zones perdues » n'apparaît nulle part.
  assertEquals(
    buildDigest(r.events.map((e) => e.event), 'weekly')?.body,
    '3 zones perdues à pied, 2 zones perdues à vélo.',
  );
});

Deno.test('un `null` chez un joueur MONO-MONDE est levé : le compte est exact', () => {
  // `worldToName` n'avait pas nommé le monde parce qu'il n'y avait rien à
  // distinguer — pas parce que les pertes en mêlaient deux. Tout le territoire
  // de ce joueur vit dans son unique monde, donc toutes ses pertes aussi.
  const r = buildZonesLost([row({ hexCount: 6 })], worlds([U, ['bike']]));
  assertEquals(r.events, [{ userId: U, event: { type: 'zones_lost', count: 6, activity: 'bike' } }]);
  assertEquals(r.unquantifiable, []);
});

// ════════════════════════════════════════════════════════════════════════════
// 4. L'ABSTENTION — mieux vaut ne pas chiffrer que chiffrer faux
// ════════════════════════════════════════════════════════════════════════════

Deno.test('un `null` chez un joueur BI-MONDE ne se chiffre pas', () => {
  const r = buildZonesLost([row({ hexCount: 9 })], worlds([U, ['run', 'bike']]));
  assertEquals(r.events, []);
  assertEquals(r.unquantifiable, [U]);
});

Deno.test('une seule ligne ambiguë fait taire TOUT le compte du joueur', () => {
  // Garder les lignes non ambiguës donnerait « 3 zones perdues à pied » alors
  // que le lot mêlé en contenait peut-être quatre autres à pied : exact dans
  // son monde, mais faux comme total. Un chiffre incomplet se lit comme un
  // chiffre complet.
  const r = buildZonesLost(
    [row({ hexCount: 3, activity: 'run' }), row({ hexCount: 4 })],
    worlds([U, ['run', 'bike']]),
  );
  assertEquals(r.events, []);
  assertEquals(r.unquantifiable, [U]);
});

Deno.test('joueur INCONNU de season_scores → abstention, pas un monde inventé', () => {
  const r = buildZonesLost([row({ hexCount: 5 })], new Map());
  assertEquals(r.events, []);
  assertEquals(r.unquantifiable, [U]);
});

Deno.test('hexCount illisible → abstention (une ligne ne vaut pas une zone)', () => {
  const r = buildZonesLost(
    [row({ hexCount: null, activity: 'run' })],
    worlds([U, ['run']]),
  );
  assertEquals(r.events, []);
  assertEquals(r.unquantifiable, [U]);
});

Deno.test('l’abstention d’un joueur ne contamine pas celui d’à côté', () => {
  const r = buildZonesLost(
    [row({ userId: U, hexCount: 5 }), row({ userId: V, hexCount: 2, activity: 'bike' })],
    worlds([U, ['run', 'bike']], [V, ['run', 'bike']]),
  );
  assertEquals(r.events, [{ userId: V, event: { type: 'zones_lost', count: 2, activity: 'bike' } }]);
  assertEquals(r.unquantifiable, [U]);
});

// ════════════════════════════════════════════════════════════════════════════
// 5. STABILITÉ — un résumé ne change pas d'ordre au hasard
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ordre des mondes = ordre de ACTIVITIES, pas ordre de lecture', () => {
  const r = buildZonesLost(
    [row({ hexCount: 2, activity: 'bike' }), row({ hexCount: 3, activity: 'run' })],
    worlds([U, ['run', 'bike']]),
  );
  assertEquals(r.events.map((e) => e.event.activity), ['run', 'bike']);
});

Deno.test('aucune notification → aucun événement, aucune abstention', () => {
  assertEquals(buildZonesLost([], new Map()), { events: [], unquantifiable: [] });
});
