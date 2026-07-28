/**
 * GRYD — tests de `crewMissionBriefing` (engine/crewMission.ts), le moteur PUR
 * de l'écran E45 « Mission crew ».
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. les TROIS vues ne se confondent jamais — « pas lu » n'est pas « aucune
 *     mission », et aucune des deux n'est un échec technique ;
 *  2. aucune ÉCHÉANCE n'est fabriquée : `reclaim` et `capture` n'en ont pas, et
 *     `reclaim.lastLostAt` (un fait PASSÉ) ne se maquille pas en compte à rebours ;
 *  3. `progress` reste `null` en toutes circonstances — aucune mission n'a de
 *     dénominateur, donc aucun pourcentage n'est affichable ;
 *  4. la liste des membres qui tiennent du terrain est DÉTERMINISTE, et `null`
 *     (non lue) ne se confond pas avec `[]` (lue, et vide).
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  crewMissionBriefing,
  type CrewHolder,
  type CrewMission,
} from '../_shared/engine/crewMission.ts';

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);
const H = 3_600_000;

// ─── 1. Les trois vues ───────────────────────────────────────────────────────

// ⚠ `holders` EST DÉSORMAIS PORTÉ PAR LES TROIS VUES (correctif 28/07/2026).
// Il vivait dans la seule variante `brief`, ce qui obligeait l'écran à écrire
// `brief.view !== 'brief' || brief.holders === null` — donc à afficher « Parts
// non chargées » (un ÉCHEC DE LECTURE) dès qu'il n'y avait pas de mission, alors
// que `crew_overview()` avait répondu. Les attentes ci-dessous incluent donc
// `holders`, et le test « les parts survivent à l'absence de mission » (§4)
// verrouille précisément le cas qui mentait.

Deno.test('mission NON LUE ⇒ view unread (jamais « aucune mission »)', () => {
  const b = crewMissionBriefing({ nowMs: NOW, mission: null, contributions: [] });
  assertEquals(b, { view: 'unread', holders: [] });
});

Deno.test('mission lue et vide ⇒ view none, avec SON motif', () => {
  for (const reason of ['no_data', 'nothing_urgent'] as const) {
    const b = crewMissionBriefing({
      nowMs: NOW,
      mission: { kind: 'none', reason },
      contributions: null,
    });
    assertEquals(b, { view: 'none', reason, holders: null });
  }
});

Deno.test('contrat inattendu ⇒ jamais un crash, et jamais une mission inventée', () => {
  const broken = { kind: 'none' } as unknown as CrewMission;
  assertEquals(crewMissionBriefing({ nowMs: NOW, mission: broken, contributions: null }), {
    view: 'none',
    reason: 'no_data',
    holders: null,
  });
  const noKind = {} as unknown as CrewMission;
  assertEquals(crewMissionBriefing({ nowMs: NOW, mission: noKind, contributions: null }), {
    view: 'unread',
    holders: null,
  });
});

// ─── 2. L'échéance : réelle, ou absente ──────────────────────────────────────

Deno.test('defend : l’échéance est celle de la base, heures arrondies au SUPÉRIEUR', () => {
  const b = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'defend', sectorId: 's1', sectorName: 'Belleville', zones: 3, deadlineAt: NOW + 90 * 60_000 },
    contributions: null,
  });
  assertEquals(b.view, 'brief');
  if (b.view !== 'brief') return;
  assertEquals(b.deadlineAtMs, NOW + 90 * 60_000);
  assertEquals(b.hoursLeft, 2);
  assertEquals(b.overdue, false);
});

Deno.test('defend : échéance DÉPASSÉE ⇒ overdue, et surtout pas « 1 h » de repli', () => {
  const b = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'defend', sectorId: null, sectorName: null, zones: 1, deadlineAt: NOW - H },
    contributions: null,
  });
  if (b.view !== 'brief') throw new Error('brief attendu');
  assertEquals(b.overdue, true);
  assertEquals(b.hoursLeft, null);
});

Deno.test('reclaim : AUCUNE échéance — lastLostAt est un fait passé, pas un compte à rebours', () => {
  const b = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'reclaim', sectorId: 's2', sectorName: null, zones: 2, lastLostAt: NOW - 3 * H },
    contributions: null,
  });
  if (b.view !== 'brief') throw new Error('brief attendu');
  assertEquals(b.deadlineAtMs, null);
  assertEquals(b.hoursLeft, null);
  assertEquals(b.overdue, false);
});

Deno.test('capture : aucune échéance non plus', () => {
  const b = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'capture', sectorId: null, sectorName: 'Wazemmes', freeZones: 12 },
    contributions: null,
  });
  if (b.view !== 'brief') throw new Error('brief attendu');
  assertEquals(b.deadlineAtMs, null);
});

Deno.test('close_loop : expiration lue si elle existe, null si la base ne la donne pas', () => {
  const withExp = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'close_loop', loopId: 'l1', name: 'Canal', missingM: 240, expiresAt: NOW + 5 * H },
    contributions: null,
  });
  if (withExp.view !== 'brief') throw new Error('brief attendu');
  assertEquals(withExp.hoursLeft, 5);

  const without = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'close_loop', loopId: 'l1', name: 'Canal', missingM: 240, expiresAt: null },
    contributions: null,
  });
  if (without.view !== 'brief') throw new Error('brief attendu');
  assertEquals(without.deadlineAtMs, null);
  assertEquals(without.hoursLeft, null);
});

// ─── 3. Aucune progression, jamais ───────────────────────────────────────────

Deno.test('progress vaut null pour LES QUATRE natures de mission (aucun dénominateur)', () => {
  const missions: CrewMission[] = [
    { kind: 'defend', sectorId: null, sectorName: null, zones: 1, deadlineAt: NOW + H },
    { kind: 'reclaim', sectorId: null, sectorName: null, zones: 1, lastLostAt: NOW - H },
    { kind: 'close_loop', loopId: 'l', name: 'x', missingM: 10, expiresAt: null },
    { kind: 'capture', sectorId: null, sectorName: null, freeZones: 9 },
  ];
  for (const mission of missions) {
    const b = crewMissionBriefing({ nowMs: NOW, mission, contributions: [] });
    if (b.view !== 'brief') throw new Error('brief attendu');
    assertEquals(b.progress, null);
  }
});

// ─── 4. Ceux qui tiennent du terrain ─────────────────────────────────────────

const MISSION: CrewMission = {
  kind: 'capture',
  sectorId: null,
  sectorName: null,
  freeZones: 20,
};

Deno.test('LES PARTS SURVIVENT À L’ABSENCE DE MISSION (la faute du 28/07/2026)', () => {
  // Sans mission, l'écran E45 lisait `brief.view !== 'brief'` et annonçait
  // « Parts non chargées » — un échec de lecture qui n'avait pas eu lieu, sur
  // des parts pourtant RÉELLES. Les trois vues portent maintenant `holders`,
  // et chacune distingue « lu et plein », « lu et vide » et « pas lu ».
  const held: CrewHolder[] = [{ userId: 'u1', pseudo: 'ana', contributionPct: 60 }];

  const noMission = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'none', reason: 'nothing_urgent' },
    contributions: held,
  });
  assertEquals(noMission.view, 'none');
  assertEquals(noMission.holders, held);

  const missionUnread = crewMissionBriefing({ nowMs: NOW, mission: null, contributions: held });
  assertEquals(missionUnread.view, 'unread');
  assertEquals(missionUnread.holders, held);

  // Et l'inverse reste vrai : sans mission ET sans lecture des parts, c'est
  // `null` — le seul cas où l'écran a le droit de dire qu'il n'a pas pu lire.
  const nothing = crewMissionBriefing({
    nowMs: NOW,
    mission: { kind: 'none', reason: 'no_data' },
    contributions: null,
  });
  assertEquals(nothing.holders, null);
});

Deno.test('contributions NON LUES (null) ≠ lues et vides ([])', () => {
  const unread = crewMissionBriefing({ nowMs: NOW, mission: MISSION, contributions: null });
  if (unread.view !== 'brief') throw new Error('brief attendu');
  assertEquals(unread.holders, null);

  const empty = crewMissionBriefing({ nowMs: NOW, mission: MISSION, contributions: [] });
  if (empty.view !== 'brief') throw new Error('brief attendu');
  assertEquals(empty.holders, []);
});

Deno.test('une part à 0 n’est pas « tenir du terrain » : la ligne est écartée', () => {
  const contributions: CrewHolder[] = [
    { userId: 'u1', pseudo: 'ana', contributionPct: 0 },
    { userId: 'u2', pseudo: 'bo', contributionPct: 40 },
  ];
  const b = crewMissionBriefing({ nowMs: NOW, mission: MISSION, contributions });
  if (b.view !== 'brief') throw new Error('brief attendu');
  assertEquals(b.holders, [{ userId: 'u2', pseudo: 'bo', contributionPct: 40 }]);
});

Deno.test('ordre DÉTERMINISTE : part décroissante, puis pseudo, puis id', () => {
  const contributions: CrewHolder[] = [
    { userId: 'u3', pseudo: 'zoe', contributionPct: 30 },
    { userId: 'u1', pseudo: 'ana', contributionPct: 30 },
    { userId: 'u2', pseudo: 'bo', contributionPct: 55 },
  ];
  const b = crewMissionBriefing({ nowMs: NOW, mission: MISSION, contributions });
  if (b.view !== 'brief') throw new Error('brief attendu');
  assertEquals(b.holders?.map((h) => h.userId), ['u2', 'u1', 'u3']);
});

Deno.test('entrées dégradées : NaN, part > 100, id vide ⇒ écartées ou bornées, jamais un crash', () => {
  const contributions = [
    { userId: 'u1', pseudo: 'ana', contributionPct: Number.NaN },
    { userId: '', pseudo: 'sans-id', contributionPct: 10 },
    { userId: 'u2', pseudo: 'bo', contributionPct: 320 },
  ] as CrewHolder[];
  const b = crewMissionBriefing({ nowMs: NOW, mission: MISSION, contributions });
  if (b.view !== 'brief') throw new Error('brief attendu');
  assertEquals(b.holders, [{ userId: 'u2', pseudo: 'bo', contributionPct: 100 }]);
});
