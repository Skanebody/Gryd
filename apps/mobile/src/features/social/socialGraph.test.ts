/**
 * GRYD — E57/E58 : tests de la logique PURE (`socialGraph.ts`).
 *
 * Ces tests gardent quatre invariants, et chacun a déjà coûté un écran ailleurs
 * dans ce dépôt :
 *  · UNE RÉPONSE À MOITIÉ LUE N'EST PAS UNE LISTE VIDE. `parseSocialGraph` rend
 *    `null` dès qu'un total manque — sans quoi l'écran afficherait « 0 ami » à
 *    quelqu'un qui en a douze (le « 0 nu » interdit par la constitution) ;
 *  · UNE DEMANDE SANS `id` N'EST PAS AFFICHABLE : elle peindrait « accepter » et
 *    « refuser », deux boutons morts (§A4) ;
 *  · LE LIEN PRÉCÈDE LA SOLLICITATION. `canChallenge` refuse le suivi
 *    UNILATÉRAL, exactement comme `duel_create` (0088) — un bouton « Défier »
 *    peint sur `no_relation` échouerait à chaque tap ;
 *  · « AUCUNE SOURCE » N'EST PAS « AUCUN RÉSULTAT ». Si un jour le serveur se
 *    met à proposer des suggestions, la lecture doit s'en apercevoir au lieu de
 *    continuer à afficher « il n'y a pas de source ».
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  canChallenge,
  challengeableHandles,
  duelDraftIssue,
  duelPayload,
  isEmptyGraph,
  parseDuelInbox,
  parseSocialGraph,
  sections,
  socialRefusalOf,
  type DuelDraft,
} from './socialGraph.ts';
import { DUEL_PERIOD_DAYS_MAX, DUEL_PERIOD_DAYS_MIN } from '@klaim/shared';

const person = (handle: string) => ({ handle, displayName: handle.toUpperCase() });

/** Un graphe SERVEUR minimal et VALIDE — la base vide, telle qu'elle est. */
const emptyRaw = {
  ok: true,
  me: { handle: 'ana', displayName: 'ANA' },
  following: [], followingTotal: 0,
  followers: [], followersTotal: 0,
  friends: [], friendsTotal: 0,
  requestsIn: [], requestsInTotal: 0,
  requestsOut: [], requestsOutTotal: 0,
  rowsLimit: 200,
  suggestionsSource: 'none',
  importedFriendsSource: 'none',
};

Deno.test('parseSocialGraph — la base vide se lit SANS erreur, et se dit vide', () => {
  const g = parseSocialGraph(emptyRaw);
  assertEquals(g !== null, true);
  assertEquals(isEmptyGraph(g!), true);
  assertEquals(sections(g!).length, 0, 'aucune section fantôme quand tout est vide');
});

Deno.test('parseSocialGraph — un TOTAL manquant invalide la lecture (jamais un 0 nu)', () => {
  const { friendsTotal: _drop, ...missing } = emptyRaw;
  assertEquals(parseSocialGraph(missing), null);
});

Deno.test('parseSocialGraph — une demande REÇUE sans id est refusée (deux boutons morts sinon)', () => {
  const ok = parseSocialGraph({
    ...emptyRaw,
    requestsIn: [{ handle: 'ben', displayName: 'BEN', id: 'r-1' }],
    requestsInTotal: 1,
  });
  assertEquals(ok?.requestsIn[0]?.id, 'r-1');

  const broken = parseSocialGraph({
    ...emptyRaw,
    requestsIn: [{ handle: 'ben', displayName: 'BEN' }],
    requestsInTotal: 1,
  });
  assertEquals(broken, null);
});

Deno.test('parseSocialGraph — « aucune source » est LU, jamais supposé', () => {
  // Si le serveur se met un jour à proposer des suggestions, la lecture le voit.
  assertEquals(parseSocialGraph({ ...emptyRaw, suggestionsSource: 'local' }), null);
  assertEquals(parseSocialGraph({ ...emptyRaw, importedFriendsSource: 'contacts' }), null);
});

Deno.test('parseSocialGraph — un REFUS n’est pas un graphe (il se lit avec socialRefusalOf)', () => {
  assertEquals(parseSocialGraph({ ok: false, reason: 'signed_out' }), null);
  assertEquals(socialRefusalOf({ ok: false, reason: 'signed_out' }), 'signed_out');
  assertEquals(socialRefusalOf({ ok: false, reason: 'quelque_chose_de_neuf' }), 'unknown');
  assertEquals(socialRefusalOf(emptyRaw), null, 'un succès n’a pas de motif');
  assertEquals(socialRefusalOf('bonjour'), 'unknown');
});

Deno.test('sections — ordre par ce qui ATTEND une décision, et rien de vide', () => {
  const g = parseSocialGraph({
    ...emptyRaw,
    requestsIn: [{ ...person('ben'), id: 'r-1' }], requestsInTotal: 1,
    friends: [person('clo')], friendsTotal: 1,
    following: [], followingTotal: 0,
    followers: [person('eve')], followersTotal: 1,
  })!;
  assertEquals(sections(g).map((s) => s.key), ['requestsIn', 'friends', 'followers']);
  assertEquals(isEmptyGraph(g), false);
});

Deno.test('sections — une liste BORNÉE se sait tronquée (le total reste le vrai)', () => {
  const g = parseSocialGraph({
    ...emptyRaw,
    friends: [person('a'), person('b')],
    friendsTotal: 340,
  })!;
  const s = sections(g)[0];
  assertEquals(s.key, 'friends');
  assertEquals(s.total, 340);
  assertEquals(s.truncated, true, 'la liste montrée est incomplète, et le dit');
});

Deno.test('canChallenge — le suivi UNILATÉRAL ne donne PAS le droit de solliciter', () => {
  const g = parseSocialGraph({
    ...emptyRaw,
    friends: [person('clo')], friendsTotal: 1,
    following: [person('ben'), person('eve')], followingTotal: 2,
    followers: [person('eve')], followersTotal: 1,
  })!;
  assertEquals([...challengeableHandles(g)].sort(), ['clo', 'eve']);
  assertEquals(canChallenge(g, 'clo'), true, 'amie');
  assertEquals(canChallenge(g, 'eve'), true, 'suivi réciproque');
  assertEquals(canChallenge(g, 'ben'), false, 'suivi unilatéral — miroir de no_relation');
  assertEquals(canChallenge(g, 'inconnu'), false);
  assertEquals(canChallenge(g, null), false, 'une personne sans handle n’est pas adressable');
});

Deno.test('canChallenge — une personne SANS handle n’entre jamais dans l’ensemble', () => {
  const g = parseSocialGraph({
    ...emptyRaw,
    friends: [{ handle: null, displayName: null }], friendsTotal: 1,
  })!;
  assertEquals(challengeableHandles(g).size, 0);
});

const base: DuelDraft = {
  kind: 'distance', activity: 'run', periodDays: 7, target: 10, zoneLabel: null,
};

Deno.test('duelDraftIssue — les quatre formats exigent ce qu’ils exigent', () => {
  assertEquals(duelDraftIssue(base), null);
  assertEquals(duelDraftIssue({ ...base, target: null }), 'target');
  assertEquals(duelDraftIssue({ ...base, target: 0 }), 'target');
  assertEquals(duelDraftIssue({ ...base, periodDays: DUEL_PERIOD_DAYS_MIN - 1 }), 'period');
  assertEquals(duelDraftIssue({ ...base, periodDays: DUEL_PERIOD_DAYS_MAX + 1 }), 'period');
  assertEquals(duelDraftIssue({ ...base, periodDays: 3.5 }), 'period');

  const zone: DuelDraft = { ...base, kind: 'defend_zone', target: null, zoneLabel: 'Buttes' };
  assertEquals(duelDraftIssue(zone), null);
  assertEquals(duelDraftIssue({ ...zone, zoneLabel: '   ' }), 'zone');
  assertEquals(duelDraftIssue({ ...zone, zoneLabel: null }), 'zone');
  assertEquals(duelDraftIssue({ ...zone, target: 5 }), 'target', 'une cible sur un défi de zone ment');

  // @ts-expect-error — un format hors DUEL_KINDS ne compile pas, et se refuse aussi à l'exécution
  assertEquals(duelDraftIssue({ ...base, kind: 'peloton' }), 'kind');
});

Deno.test('duelPayload — ce qui a été relu à l’écran est exactement ce qui part', () => {
  assertEquals(duelPayload('ben', base), {
    p_handle: 'ben', p_kind: 'distance', p_period_days: 7,
    p_activity: 'run', p_target: 10, p_zone_label: null,
  });
  assertEquals(
    duelPayload('ben', { ...base, kind: 'defend_zone', target: 42, zoneLabel: '  Canal  ' }),
    {
      p_handle: 'ben', p_kind: 'defend_zone', p_period_days: 7,
      p_activity: 'run', p_target: null, p_zone_label: 'Canal',
    },
    'la cible est écartée et le libellé nettoyé — comme le fera le serveur',
  );
});

const inboxRaw = {
  ok: true,
  incoming: [{
    id: 'd-1', kind: 'loops', activity: 'run', periodDays: 5, target: 4,
    zoneLabel: null, expiresAt: '2026-08-01T10:00:00Z', createdAt: '2026-07-29T10:00:00Z',
    from: { handle: 'ben', displayName: 'BEN' },
  }],
  outgoing: [],
  active: [],
  expiryHours: 72,
  maxPendingSent: 5,
  scoringExists: false,
};

Deno.test('parseDuelInbox — lit une boîte réelle, et sait qu’AUCUN score n’existe', () => {
  const inbox = parseDuelInbox(inboxRaw)!;
  assertEquals(inbox.incoming.length, 1);
  assertEquals(inbox.incoming[0].from.handle, 'ben');
  assertEquals(inbox.incoming[0].kind, 'loops');
  assertEquals(inbox.scoringExists, false, 'l’écran ne doit pas peindre de score');
});

Deno.test('parseDuelInbox — `scoringExists` ABSENT est refusé (une absence n’est pas un false)', () => {
  const { scoringExists: _drop, ...missing } = inboxRaw;
  assertEquals(parseDuelInbox(missing), null);
});

Deno.test('parseDuelInbox — un format inconnu du client invalide la lecture', () => {
  assertEquals(
    parseDuelInbox({ ...inboxRaw, incoming: [{ ...inboxRaw.incoming[0], kind: 'peloton' }] }),
    null,
  );
});

Deno.test('parseDuelInbox — une échéance manquante invalide la ligne (on ne l’invente pas)', () => {
  const { expiresAt: _drop, ...noExpiry } = inboxRaw.incoming[0];
  assertEquals(parseDuelInbox({ ...inboxRaw, incoming: [noExpiry] }), null);
});
