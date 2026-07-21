/**
 * GRYD — tests de `engine/crewSignals.ts` (AMENDEMENT-44 A4 messages crew
 * contextuels + A5 ping de zone).
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. AUCUN texte libre n'est possible — le vocabulaire est un catalogue fermé,
 *     et un ping ne peut désigner qu'un secteur RÉEL du crew ;
 *  2. un signal HORS CONTEXTE n'est jamais proposé ni accepté (c'est la demande
 *     A4 : le jeu de messages dépend de la situation) ;
 *  3. l'ignorance ne devient jamais une affirmation — mission inconnue ⇒ aucun
 *     signal, secteur non nommé ⇒ non pingable, jamais de nom de repli ;
 *  4. les bornes anti-spam (1 actif/membre, cooldown, TTL) viennent de
 *     game-rules et tiennent sur les entrées dégradées (horloge en arrière…).
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  crewPingDecision,
  crewSignalsFor,
  crewSituationOf,
  pingableSectors,
  visibleCrewPings,
  CREW_SIGNALS,
  CREW_SIGNAL_KEYS,
  type CrewPing,
  type CrewSignalKey,
  type CrewSituation,
} from '../_shared/engine/crewSignals.ts';
import type { CrewMission, CrewSectorState } from '../_shared/engine/crewMission.ts';
import {
  CREW_PING_COOLDOWN_MIN,
  CREW_PING_FEED_MAX,
  CREW_PING_MAX_ACTIVE_PER_MEMBER,
  CREW_PING_TTL_H,
} from '../_shared/game-rules.ts';

const NOW = Date.UTC(2026, 6, 21, 12, 0, 0);
const MIN = 60_000;
const H = 3_600_000;

function sector(p: Partial<CrewSectorState> = {}): CrewSectorState {
  return {
    sectorId: null,
    sectorName: null,
    heldTotal: 0,
    expiringSoon: 0,
    earliestDecayAt: null,
    lostRecently: 0,
    lastLostAt: null,
    freeHexes: null,
    ...p,
  };
}

function ping(p: Partial<CrewPing> = {}): CrewPing {
  return {
    id: 'p1',
    authorUserId: 'u1',
    authorPseudo: 'KORO',
    signal: 'defend_tonight',
    sectorId: 's1',
    sectorName: 'République',
    createdAt: NOW - MIN,
    expiresAt: NOW + H,
    ...p,
  };
}

// ═══ 1. Catalogue : fermé, cohérent, sans doublon ═══════════════════════════

Deno.test('catalogue : 15 signaux, clés uniques', () => {
  assertEquals(CREW_SIGNALS.length, 15);
  assertEquals(new Set(CREW_SIGNAL_KEYS).size, 15);
});

Deno.test('catalogue : tout signal a au moins une situation', () => {
  for (const s of CREW_SIGNALS) {
    assertEquals(s.situations.length > 0, true, `${s.key} sans situation`);
  }
});

Deno.test('catalogue : chaque situation propose entre 4 et 15 signaux', () => {
  // Borne basse = la demande d'audit (« 5 messages figés = frustration ») ;
  // borne haute = §A (un menu illisible ne serait pas une simplification).
  for (const situation of ['defense', 'attack', 'loop', 'gather'] as const) {
    const n = crewSignalsFor(situation, true).length;
    assertEquals(n >= 4 && n <= 15, true, `${situation} → ${n} signaux`);
  }
});

Deno.test('catalogue : les 4 situations réunies couvrent les 15 signaux', () => {
  const seen = new Set<CrewSignalKey>();
  for (const situation of ['defense', 'attack', 'loop', 'gather'] as const) {
    for (const s of crewSignalsFor(situation, true)) seen.add(s.key);
  }
  assertEquals(seen.size, 15);
});

// ═══ 2. Situation dérivée de la mission RÉELLE ══════════════════════════════

Deno.test('situation : mission inconnue (null) ⇒ null, jamais « gather »', () => {
  // Le piège que ce test verrouille : traiter « je n'ai pas pu lire » comme
  // « rien d'urgent » ferait dire « tout est calme » pendant qu'un secteur tombe.
  assertEquals(crewSituationOf(null), null);
});

Deno.test('situation : chaque mission tombe sur la bonne situation', () => {
  const cases: [CrewMission, CrewSituation][] = [
    [{ kind: 'defend', sectorId: 's', sectorName: 'X', zones: 2, deadlineAt: NOW + H }, 'defense'],
    [{ kind: 'reclaim', sectorId: 's', sectorName: 'X', zones: 1, lastLostAt: NOW - H }, 'attack'],
    [{ kind: 'capture', sectorId: 's', sectorName: 'X', freeZones: 9 }, 'attack'],
    [{ kind: 'close_loop', loopId: 'l', name: 'Canal', missingM: 400, expiresAt: null }, 'loop'],
    [{ kind: 'none', reason: 'nothing_urgent' }, 'gather'],
  ];
  for (const [mission, expected] of cases) {
    assertEquals(crewSituationOf(mission), expected, mission.kind);
  }
});

Deno.test('signaux : situation null ⇒ aucun signal proposé', () => {
  assertEquals(crewSignalsFor(null, true).length, 0);
});

Deno.test('signaux : le vocabulaire d’une situation n’apparaît pas dans une autre', () => {
  const defense = crewSignalsFor('defense', true).map((s) => s.key);
  const attack = crewSignalsFor('attack', true).map((s) => s.key);
  assertEquals(defense.includes('attack_now'), false);
  assertEquals(attack.includes('defend_tonight'), false);
  const gather = crewSignalsFor('gather', true).map((s) => s.key);
  assertEquals(gather.includes('loop_closing'), false);
  assertEquals(gather.includes('defend_backup'), false);
});

Deno.test('signaux : sans secteur pingable, seuls les signaux de crew restent', () => {
  for (const situation of ['defense', 'attack', 'loop', 'gather'] as const) {
    const list = crewSignalsFor(situation, false);
    assertEquals(list.length > 0, true, `${situation} ne doit pas être vide`);
    assertEquals(list.every((s) => s.scope === 'crew'), true, situation);
  }
});

// ═══ 3. Secteurs pingables : réels ou rien ═════════════════════════════════

Deno.test('pingable : un secteur sans NOM n’est pas pingable (jamais de nom de repli)', () => {
  const out = pingableSectors([sector({ sectorId: 's1', sectorName: null, heldTotal: 4 })]);
  assertEquals(out.length, 0);
});

Deno.test('pingable : un secteur sans ID n’est pas pingable', () => {
  const out = pingableSectors([sector({ sectorId: null, sectorName: 'République', heldTotal: 4 })]);
  assertEquals(out.length, 0);
});

Deno.test('pingable : un nom vide ou blanc ne compte pas comme un nom', () => {
  const out = pingableSectors([
    sector({ sectorId: 's1', sectorName: '   ', heldTotal: 4 }),
    sector({ sectorId: 's2', sectorName: '', lostRecently: 2 }),
  ]);
  assertEquals(out.length, 0);
});

Deno.test('pingable : sans lien réel (ni tenu ni perdu) le secteur est exclu', () => {
  const out = pingableSectors([
    sector({ sectorId: 's1', sectorName: 'Ailleurs', heldTotal: 0, lostRecently: 0, freeHexes: 40 }),
  ]);
  assertEquals(out.length, 0);
});

Deno.test('pingable : tenu OU récemment perdu suffit, tri par nom', () => {
  const out = pingableSectors([
    sector({ sectorId: 's2', sectorName: 'République', heldTotal: 3 }),
    sector({ sectorId: 's1', sectorName: 'Canal', lostRecently: 1 }),
  ]);
  assertEquals(out.map((s) => s.name), ['Canal', 'République']);
  assertEquals(out.map((s) => s.id), ['s1', 's2']);
});

// ═══ 4. Décision de ping ═══════════════════════════════════════════════════

function attempt(p: Partial<Parameters<typeof crewPingDecision>[0]> = {}) {
  return crewPingDecision({
    nowMs: NOW,
    signal: 'defend_tonight',
    situation: 'defense',
    sectorId: 's1',
    pingableSectorIds: ['s1'],
    myActivePings: 0,
    myLastPingAt: null,
    ...p,
  });
}

Deno.test('ping : cas nominal ⇒ accepté, TTL = CREW_PING_TTL_H', () => {
  const d = attempt();
  assertEquals(d.ok, true);
  if (d.ok) {
    assertEquals(d.replacesPrevious, false);
    assertEquals(d.expiresAt, NOW + CREW_PING_TTL_H * H);
  }
});

Deno.test('ping : signal inconnu refusé (client hors catalogue)', () => {
  const d = attempt({ signal: 'not_a_signal' as CrewSignalKey });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'unknown_signal');
});

Deno.test('ping : signal hors contexte refusé', () => {
  const d = attempt({ signal: 'attack_now', situation: 'defense' });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'out_of_context');
});

Deno.test('ping : situation inconnue refusée (on ne ping pas à l’aveugle)', () => {
  const d = attempt({ situation: null });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'out_of_context');
});

Deno.test('ping : signal de secteur sans secteur ⇒ refus explicite', () => {
  const d = attempt({ sectorId: null });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'sector_required');
});

Deno.test('ping : secteur hors de la liste RÉELLE ⇒ refusé', () => {
  // Le test central du zéro-mensonge : impossible d'épingler un quartier
  // fabriqué, même en forgeant l'appel.
  const d = attempt({ sectorId: 's_inventé', pingableSectorIds: ['s1'] });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'sector_not_allowed');
});

Deno.test('ping : liste de secteurs vide ⇒ aucun signal de secteur ne passe', () => {
  const d = attempt({ pingableSectorIds: [] });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'sector_not_allowed');
});

Deno.test('ping : signal de crew accepté sans secteur', () => {
  const d = attempt({ signal: 'gather_tonight', sectorId: null });
  assertEquals(d.ok, true);
});

Deno.test('ping : signal de crew AVEC secteur ⇒ refusé (jamais ignoré en silence)', () => {
  const d = attempt({ signal: 'gather_tonight', sectorId: 's1' });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'sector_unexpected');
});

Deno.test('ping : au-delà du plafond actif, le nouveau REMPLACE (et le dit)', () => {
  const d = attempt({
    myActivePings: CREW_PING_MAX_ACTIVE_PER_MEMBER,
    myLastPingAt: NOW - (CREW_PING_COOLDOWN_MIN + 1) * MIN,
  });
  assertEquals(d.ok, true);
  if (d.ok) assertEquals(d.replacesPrevious, true);
});

Deno.test('ping : cooldown refusé avec le temps restant, arrondi vers le HAUT', () => {
  const d = attempt({ myLastPingAt: NOW - (CREW_PING_COOLDOWN_MIN * MIN - 1500) });
  assertEquals(d.ok, false);
  if (!d.ok) {
    assertEquals(d.reason, 'cooldown');
    assertEquals(d.retryInS, 2);
  }
});

Deno.test('ping : cooldown exactement écoulé ⇒ accepté', () => {
  const d = attempt({ myLastPingAt: NOW - CREW_PING_COOLDOWN_MIN * MIN });
  assertEquals(d.ok, true);
});

Deno.test('ping : horloge client en arrière ne contourne pas le cooldown', () => {
  const d = attempt({ myLastPingAt: NOW + 10 * MIN });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'cooldown');
});

Deno.test('ping : hors contexte l’emporte sur le cooldown (motif le plus explicatif)', () => {
  const d = attempt({ signal: 'attack_now', situation: 'defense', myLastPingAt: NOW });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.reason, 'out_of_context');
});

// ═══ 5. Lecture du mur de pings ════════════════════════════════════════════

Deno.test('affichage : un ping expiré disparaît, même s’il vient du serveur', () => {
  const out = visibleCrewPings([ping({ expiresAt: NOW - 1 })], NOW);
  assertEquals(out.length, 0);
});

Deno.test('affichage : expiration à la milliseconde près (strictement futur)', () => {
  assertEquals(visibleCrewPings([ping({ expiresAt: NOW })], NOW).length, 0);
  assertEquals(visibleCrewPings([ping({ expiresAt: NOW + 1 })], NOW).length, 1);
});

Deno.test('affichage : un signal inconnu du client est écarté, pas rendu en clair', () => {
  const out = visibleCrewPings([ping({ signal: 'signal_du_futur' as CrewSignalKey })], NOW);
  assertEquals(out.length, 0);
});

Deno.test('affichage : plus récents d’abord, ex aequo tranchés par id (déterminisme)', () => {
  const out = visibleCrewPings(
    [
      ping({ id: 'b', createdAt: NOW - 3 * MIN }),
      ping({ id: 'c', createdAt: NOW - MIN }),
      ping({ id: 'a', createdAt: NOW - 3 * MIN }),
    ],
    NOW,
  );
  assertEquals(out.map((p) => p.id), ['c', 'a', 'b']);
});

Deno.test('affichage : plafonné à CREW_PING_FEED_MAX', () => {
  const many = Array.from({ length: CREW_PING_FEED_MAX + 5 }, (_, i) =>
    ping({ id: `p${i}`, createdAt: NOW - i * MIN }),
  );
  assertEquals(visibleCrewPings(many, NOW).length, CREW_PING_FEED_MAX);
});

Deno.test('affichage : liste vide ⇒ liste vide (aucun ping fabriqué)', () => {
  assertEquals(visibleCrewPings([], NOW).length, 0);
});
