/**
 * GRYD — tests de `chooseCrewMission` (engine/crewMission.ts, AMENDEMENT-43 §0
 * maillon 3 : LA mission prioritaire du crew).
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. l'app ne ment jamais — aucune mission n'est renvoyée quand la donnée
 *     réelle ne la porte pas (§ « aucune mission ») ;
 *  2. la priorité entre les 4 types est celle documentée, y compris quand
 *     plusieurs types sont simultanément vrais ;
 *  3. les ex aequo sont tranchés de façon DÉTERMINISTE (deux lectures de suite
 *     donnent la même mission — sinon l'écran a l'air instable) ;
 *  4. les entrées dégradées (nulls, NaN, négatifs, dates passées) ne créent
 *     JAMAIS une urgence.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  chooseCrewMission,
  CREW_MISSION_WINDOWS,
  type CrewLoopState,
  type CrewMissionState,
  type CrewSectorState,
} from '../_shared/engine/crewMission.ts';
import {
  CREW_MISSION_CAPTURE_MIN_FREE,
  CREW_MISSION_RECLAIM_WINDOW_H,
  ZONE_DEFEND_WINDOW_HOURS,
} from '../_shared/game-rules.ts';

const NOW = Date.UTC(2026, 6, 21, 12, 0, 0);
const H = 3_600_000;

/** Secteur neutre : rien tenu, rien perdu, rien de libre connu. */
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

function loop(p: Partial<CrewLoopState> = {}): CrewLoopState {
  return { id: 'loop-a', name: 'Canal', missingM: 400, expiresAt: NOW + 24 * H, ...p };
}

function state(p: Partial<CrewMissionState> = {}): CrewMissionState {
  return { nowMs: NOW, sectors: [], loops: [], ...p };
}

// ─── § « aucune mission » : l'état honnête ───────────────────────────────────

Deno.test('none/no_data : crew tout neuf — rien lu, rien inventé', () => {
  assertEquals(chooseCrewMission(state()), { kind: 'none', reason: 'no_data' });
});

Deno.test('none/nothing_urgent : le crew tient du terrain mais rien ne presse', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', sectorName: 'République', heldTotal: 40, freeHexes: 0 })],
  });
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

Deno.test('none : secteur SANS total fiable (freeHexes null) n’est jamais lu comme « 0 libre »… ni comme une mission', () => {
  const s = state({ sectors: [sector({ sectorId: 's1', heldTotal: 12, freeHexes: null })] });
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

Deno.test('none : sous CREW_MISSION_CAPTURE_MIN_FREE, « allez prendre 1 zone » n’est pas une mission', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', heldTotal: 5, freeHexes: CREW_MISSION_CAPTURE_MIN_FREE - 1 })],
  });
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

Deno.test('none : des zones libres LÀ OÙ LE CREW N’EST PAS ne fabriquent aucune proximité', () => {
  // heldTotal = 0 → le crew n'y court pas. Aucune distance n'est inventée pour
  // prétendre que c'est « proche ».
  const s = state({ sectors: [sector({ sectorId: 's9', heldTotal: 0, freeHexes: 300 })] });
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

// ─── 1. DÉFENDRE ─────────────────────────────────────────────────────────────

Deno.test('defend : échéance réelle, comptes réels, nom de secteur réel', () => {
  const deadline = NOW + 6 * H;
  const s = state({
    sectors: [
      sector({
        sectorId: 's1',
        sectorName: 'Belleville',
        heldTotal: 20,
        expiringSoon: 4,
        earliestDecayAt: deadline,
      }),
    ],
  });
  assertEquals(chooseCrewMission(s), {
    kind: 'defend',
    sectorId: 's1',
    sectorName: 'Belleville',
    zones: 4,
    deadlineAt: deadline,
  });
});

Deno.test('defend : une échéance DÉPASSÉE n’est pas une menace (zone déjà perdue) — pas de compte à rebours négatif', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', heldTotal: 3, expiringSoon: 3, earliestDecayAt: NOW - H })],
  });
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

Deno.test('defend : expiringSoon > 0 sans échéance lisible ⇒ aucune urgence fabriquée', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', heldTotal: 3, expiringSoon: 3, earliestDecayAt: null })],
  });
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

Deno.test('defend : ex aequo en zones ⇒ l’échéance la plus PROCHE gagne', () => {
  const s = state({
    sectors: [
      sector({ sectorId: 'b', sectorName: 'B', expiringSoon: 3, earliestDecayAt: NOW + 30 * H }),
      sector({ sectorId: 'a', sectorName: 'A', expiringSoon: 3, earliestDecayAt: NOW + 2 * H }),
    ],
  });
  const m = chooseCrewMission(s);
  assertEquals(m.kind, 'defend');
  assertEquals(m.kind === 'defend' && m.sectorId, 'a');
});

Deno.test('defend : plus de zones menacées l’emporte sur une échéance plus proche', () => {
  const s = state({
    sectors: [
      sector({ sectorId: 'few', expiringSoon: 1, earliestDecayAt: NOW + 1 * H }),
      sector({ sectorId: 'many', expiringSoon: 9, earliestDecayAt: NOW + 40 * H }),
    ],
  });
  const m = chooseCrewMission(s);
  assertEquals(m.kind === 'defend' && m.sectorId, 'many');
});

Deno.test('defend : ex aequo total ⇒ nom alphabétique, secteur SANS NOM en dernier, résultat stable', () => {
  const d = NOW + 5 * H;
  const anon = sector({ sectorId: 'z-anon', sectorName: null, expiringSoon: 2, earliestDecayAt: d });
  const named = sector({ sectorId: 'a-named', sectorName: 'Ourcq', expiringSoon: 2, earliestDecayAt: d });
  const first = chooseCrewMission(state({ sectors: [anon, named] }));
  const second = chooseCrewMission(state({ sectors: [named, anon] }));
  assertEquals(first.kind === 'defend' && first.sectorName, 'Ourcq');
  assertEquals(first, second); // déterminisme : l'ordre d'entrée ne change rien
});

// ─── 2. REPRENDRE ────────────────────────────────────────────────────────────

Deno.test('reclaim : zones perdues récemment, non reprises', () => {
  const lostAt = NOW - 3 * H;
  const s = state({
    sectors: [sector({ sectorId: 's1', sectorName: 'Buttes', lostRecently: 2, lastLostAt: lostAt })],
  });
  assertEquals(chooseCrewMission(s), {
    kind: 'reclaim',
    sectorId: 's1',
    sectorName: 'Buttes',
    zones: 2,
    lastLostAt: lostAt,
  });
});

Deno.test('reclaim : une perte sans date lisible ne devient pas une rancune inventée', () => {
  const s = state({ sectors: [sector({ sectorId: 's1', lostRecently: 5, lastLostAt: null })] });
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

Deno.test('reclaim : ex aequo en zones ⇒ la perte la plus RÉCENTE gagne', () => {
  const s = state({
    sectors: [
      sector({ sectorId: 'old', sectorName: 'A', lostRecently: 2, lastLostAt: NOW - 100 * H }),
      sector({ sectorId: 'fresh', sectorName: 'B', lostRecently: 2, lastLostAt: NOW - 2 * H }),
    ],
  });
  const m = chooseCrewMission(s);
  assertEquals(m.kind === 'reclaim' && m.sectorId, 'fresh');
});

Deno.test('priorité : DÉFENDRE passe avant REPRENDRE (ce qui est encore à nous d’abord)', () => {
  const s = state({
    sectors: [
      sector({ sectorId: 'lost', lostRecently: 9, lastLostAt: NOW - H }),
      sector({ sectorId: 'held', expiringSoon: 1, earliestDecayAt: NOW + 47 * H }),
    ],
  });
  const m = chooseCrewMission(s);
  assertEquals(m.kind, 'defend');
  assertEquals(m.kind === 'defend' && m.sectorId, 'held');
});

// ─── 3. TERMINER UNE BOUCLE ──────────────────────────────────────────────────

Deno.test('close_loop : le manque est celui calculé serveur, tel quel', () => {
  const s = state({ loops: [loop({ id: 'l1', name: 'Canal', missingM: 380 })] });
  assertEquals(chooseCrewMission(s), {
    kind: 'close_loop',
    loopId: 'l1',
    name: 'Canal',
    missingM: 380,
    expiresAt: NOW + 24 * H,
  });
});

Deno.test('close_loop : boucle EXPIRÉE ignorée, boucle sans expiration acceptée', () => {
  const expired = loop({ id: 'dead', missingM: 10, expiresAt: NOW - H });
  const evergreen = loop({ id: 'alive', missingM: 900, expiresAt: null });
  const m = chooseCrewMission(state({ loops: [expired, evergreen] }));
  assertEquals(m.kind === 'close_loop' && m.loopId, 'alive');
});

Deno.test('close_loop : missingM ≤ 0 ou id vide ⇒ ignorés (rien à annoncer)', () => {
  const s = state({
    loops: [loop({ id: 'zero', missingM: 0 }), loop({ id: '', missingM: 100 })],
  });
  // `nothing_urgent` et non `no_data` : des boucles ONT été lues, elles ne sont
  // simplement pas actionnables. La nuance change la phrase affichée.
  assertEquals(chooseCrewMission(s), { kind: 'none', reason: 'nothing_urgent' });
});

Deno.test('close_loop : la plus PROCHE d’être finie gagne, puis l’expiration la plus tôt', () => {
  const s = state({
    loops: [
      loop({ id: 'far', missingM: 1200, expiresAt: NOW + 2 * H }),
      loop({ id: 'near', missingM: 150, expiresAt: NOW + 40 * H }),
    ],
  });
  const m = chooseCrewMission(s);
  assertEquals(m.kind === 'close_loop' && m.loopId, 'near');

  const tie = chooseCrewMission(
    state({
      loops: [
        loop({ id: 'later', missingM: 150, expiresAt: NOW + 40 * H }),
        loop({ id: 'sooner', missingM: 150, expiresAt: NOW + 3 * H }),
      ],
    }),
  );
  assertEquals(tie.kind === 'close_loop' && tie.loopId, 'sooner');
});

Deno.test('priorité : REPRENDRE passe avant TERMINER UNE BOUCLE', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', lostRecently: 1, lastLostAt: NOW - H })],
    loops: [loop({ missingM: 20 })],
  });
  assertEquals(chooseCrewMission(s).kind, 'reclaim');
});

// ─── 4. CAPTURER ─────────────────────────────────────────────────────────────

Deno.test('capture : secteur où le crew court DÉJÀ, zones libres comptées', () => {
  const s = state({
    sectors: [
      sector({ sectorId: 's1', sectorName: 'Pantin', heldTotal: 8, freeHexes: 42 }),
    ],
  });
  assertEquals(chooseCrewMission(s), {
    kind: 'capture',
    sectorId: 's1',
    sectorName: 'Pantin',
    freeZones: 42,
  });
});

Deno.test('capture : seuil exact CREW_MISSION_CAPTURE_MIN_FREE inclus', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', heldTotal: 1, freeHexes: CREW_MISSION_CAPTURE_MIN_FREE })],
  });
  assertEquals(chooseCrewMission(s).kind, 'capture');
});

Deno.test('capture : le secteur le plus IMPLANTÉ gagne, puis le plus libre', () => {
  const s = state({
    sectors: [
      sector({ sectorId: 'thin', sectorName: 'A', heldTotal: 2, freeHexes: 200 }),
      sector({ sectorId: 'home', sectorName: 'B', heldTotal: 60, freeHexes: 10 }),
    ],
  });
  const m = chooseCrewMission(s);
  assertEquals(m.kind === 'capture' && m.sectorId, 'home');

  const tie = chooseCrewMission(
    state({
      sectors: [
        sector({ sectorId: 'less', sectorName: 'A', heldTotal: 5, freeHexes: 10 }),
        sector({ sectorId: 'more', sectorName: 'B', heldTotal: 5, freeHexes: 90 }),
      ],
    }),
  );
  assertEquals(tie.kind === 'capture' && tie.sectorId, 'more');
});

Deno.test('priorité : TERMINER UNE BOUCLE passe avant CAPTURER', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', heldTotal: 30, freeHexes: 100 })],
    loops: [loop({ id: 'l1', missingM: 800 })],
  });
  assertEquals(chooseCrewMission(s).kind, 'close_loop');
});

Deno.test('priorité complète : les 4 types vrais en même temps ⇒ defend', () => {
  const s = state({
    sectors: [
      sector({
        sectorId: 's1',
        sectorName: 'Tout',
        heldTotal: 50,
        expiringSoon: 2,
        earliestDecayAt: NOW + 10 * H,
        lostRecently: 3,
        lastLostAt: NOW - H,
        freeHexes: 80,
      }),
    ],
    loops: [loop()],
  });
  assertEquals(chooseCrewMission(s).kind, 'defend');
});

// ─── Entrées dégradées : jamais d’urgence fabriquée ──────────────────────────

Deno.test('robustesse : NaN / négatifs / non-nombres ne produisent aucune mission', () => {
  const junk = {
    sectorId: 's1',
    sectorName: 'X',
    heldTotal: Number.NaN,
    expiringSoon: -5,
    earliestDecayAt: Number.NaN,
    lostRecently: Number.POSITIVE_INFINITY,
    lastLostAt: Number.NaN,
    freeHexes: Number.NaN,
  } as unknown as CrewSectorState;
  assertEquals(chooseCrewMission(state({ sectors: [junk] })), {
    kind: 'none',
    reason: 'nothing_urgent',
  });
});

Deno.test('robustesse : tableaux absents (contrat serveur inattendu) ⇒ no_data, pas un crash', () => {
  const broken = { nowMs: NOW } as unknown as CrewMissionState;
  assertEquals(chooseCrewMission(broken), { kind: 'none', reason: 'no_data' });
});

Deno.test('robustesse : comptes fractionnaires arrondis vers le BAS (on ne sur-annonce jamais)', () => {
  const s = state({
    sectors: [sector({ sectorId: 's1', expiringSoon: 2.9, earliestDecayAt: NOW + H })],
  });
  const m = chooseCrewMission(s);
  assertEquals(m.kind === 'defend' && m.zones, 2);
});

// ─── Fenêtres : une seule vérité par seuil ───────────────────────────────────

Deno.test('les fenêtres exportées viennent de game-rules (aucun nombre magique)', () => {
  assertEquals(CREW_MISSION_WINDOWS.defendWindowH, ZONE_DEFEND_WINDOW_HOURS);
  assertEquals(CREW_MISSION_WINDOWS.reclaimWindowH, CREW_MISSION_RECLAIM_WINDOW_H);
});
