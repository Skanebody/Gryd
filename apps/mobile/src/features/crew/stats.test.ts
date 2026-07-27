/**
 * GRYD — E50/E54 · la LECTURE DÉFENSIVE des RPC de 0086, prouvée cas par cas.
 *
 * Le test décisif de tout ce fichier est le premier : `{ok:false}` ne devient
 * JAMAIS une liste vide. Une liste vide AFFIRME « aucun crew ne tient de terrain
 * ici » ; un refus n'affirme rien. Deux écrans, deux phrases, et le catalogue
 * i18n les porte séparément (`boardNoSourceCrews` vs `crewBoardEmpty`).
 *
 * Le second, propre à ce chantier : 'never_refreshed' ≠ 'empty'. La matview
 * `crew_leaderboard` a vécu depuis 0002 sans qu'aucun job ne la rafraîchisse ;
 * son vide décrivait un JOB ABSENT, pas le monde. 0086 rend les deux
 * distinguables en base — ces tests garantissent que le client ne les refond pas.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  emptyCrewBoard,
  parseCrewBoard,
  parseCrewBoardRow,
  parseCrewStats,
  parseCrewTrendPoint,
  trendHeights,
  type CrewTrendPoint,
} from './stats.ts';

const ROW = {
  crewId: 'c-1',
  name: 'Les Bouclards',
  color: 3,
  membersActive: 4,
  zonesHeld: 2,
  areaM2: 5500,
  rank: 1,
};

const BOARD_OK = {
  ok: true,
  activity: 'run',
  cityId: 'paris',
  cityName: 'Paris',
  refreshedAt: '2026-07-27T10:00:00Z',
  rankedTotal: 2,
  myCrewId: 'c-1',
  myRank: 1,
  myAreaM2: 5500,
  rows: [ROW],
};

// ═══ 1. UN REFUS N'EST JAMAIS UN VIDE ══════════════════════════════════════

Deno.test('E54 : `never_refreshed` ne devient PAS `empty` — un job absent n’est pas un constat', () => {
  const b = parseCrewBoard({ ok: false, reason: 'never_refreshed' }, 'run');
  assertEquals(b.status, 'never_refreshed');
  assertEquals(b.rows, []);
  // Le point : `empty` dirait « personne n'a couru ici ». Ici, GRYD n'a
  // simplement rien calculé — c'est un fait sur GRYD.
  assertEquals(b.status === 'empty', false);
});

Deno.test('E54 : chaque refus serveur garde son propre état d’écran', () => {
  const of = (reason: string) => parseCrewBoard({ ok: false, reason }, 'run').status;
  assertEquals(of('signed_out'), 'signed_out');
  assertEquals(of('city_unknown'), 'city_unknown');
  assertEquals(of('never_refreshed'), 'never_refreshed');
  // Bugs d'appelant : ils ne méritent pas une phrase, mais ils ne doivent
  // SURTOUT pas se déguiser en « aucun crew ».
  assertEquals(of('bad_activity'), 'unavailable');
  assertEquals(of('bad_limit'), 'unavailable');
  // Motif inconnu (contrat futur) : on ne devine pas, on avoue.
  assertEquals(of('venu_du_futur'), 'unavailable');
});

Deno.test('E54 : une réponse illisible donne `unavailable`, jamais `empty`', () => {
  for (const raw of [null, undefined, 42, 'non', [], { rien: true }]) {
    assertEquals(parseCrewBoard(raw, 'run').status, 'unavailable');
  }
});

Deno.test('E54 : `ok` SANS date de calcul est un contrat cassé, pas un classement', () => {
  const { refreshedAt: _drop, ...sansDate } = BOARD_OK;
  const b = parseCrewBoard(sansDate, 'run');
  // Un classement non daté est exactement ce que 0086 rend impossible : le
  // client refuse de l'afficher plutôt que de le présenter comme instantané.
  assertEquals(b.status, 'unavailable');
});

// ═══ 2. LE VIDE HONNÊTE ════════════════════════════════════════════════════

Deno.test('E54 : lecture RÉUSSIE sans aucune ligne ⇒ `empty` (le monde, pas GRYD)', () => {
  const b = parseCrewBoard({ ...BOARD_OK, rows: [], rankedTotal: 0, myCrewId: null, myRank: null }, 'run');
  assertEquals(b.status, 'empty');
  assertEquals(b.rows, []);
  assertEquals(b.rankedTotal, 0);
  assertEquals(b.myCrewId, null);
  assertEquals(b.myRank, null);
  // La date SURVIT au vide : « rien à 10 h 00 » est plus honnête que « rien ».
  assertEquals(b.refreshedAt, '2026-07-27T10:00:00Z');
});

Deno.test('E54 : un crew NON CLASSÉ garde myRank null — il n’est pas « dernier »', () => {
  const b = parseCrewBoard({ ...BOARD_OK, rows: [], rankedTotal: 0, myCrewId: 'c-9', myRank: null }, 'run');
  assertEquals(b.myCrewId, 'c-9');
  assertEquals(b.myRank, null);
});

// ═══ 3. LES LIGNES — AUCUNE VALEUR FABRIQUÉE ═══════════════════════════════

Deno.test('E54 : une ligne complète est lue telle quelle', () => {
  assertEquals(parseCrewBoardRow(ROW), {
    crewId: 'c-1',
    name: 'Les Bouclards',
    color: 3,
    membersActive: 4,
    zonesHeld: 2,
    areaM2: 5500,
    rank: 1,
  });
});

Deno.test('E54 : une ligne AMPUTÉE est écartée, jamais complétée par des zéros', () => {
  for (const missing of ['crewId', 'name', 'color', 'membersActive', 'zonesHeld', 'areaM2', 'rank']) {
    const partial: Record<string, unknown> = { ...ROW };
    delete partial[missing];
    assertEquals(
      parseCrewBoardRow(partial),
      null,
      `un crew sans ${missing} ne doit pas atteindre un classement`,
    );
  }
  assertEquals(parseCrewBoardRow({ ...ROW, rank: 0 }), null, 'un rang 0 n’existe pas');
  assertEquals(parseCrewBoardRow({ ...ROW, areaM2: -1 }), null, 'une surface négative n’existe pas');
});

Deno.test('E54 : les lignes illisibles sont écartées SANS faire tomber les autres', () => {
  const b = parseCrewBoard({ ...BOARD_OK, rows: [ROW, { crewId: 'c-2' }, { ...ROW, crewId: 'c-3', rank: 2 }] }, 'run');
  assertEquals(b.rows.map((r) => r.crewId), ['c-1', 'c-3']);
  assertEquals(b.status, 'ready');
});

Deno.test('E54 : `rankedTotal` ne peut pas annoncer moins que ce qui est affiché', () => {
  const b = parseCrewBoard({ ...BOARD_OK, rankedTotal: 0 }, 'run');
  assertEquals(b.rankedTotal, 1, 'annoncer « 0 crew classé » en montrant une ligne serait incohérent');
});

Deno.test('E54 : sans nom de ville en base, aucune légende de portée n’est inventée', () => {
  const b = parseCrewBoard({ ...BOARD_OK, cityName: null }, 'run');
  assertEquals(b.cityName, null);
});

Deno.test('E54 : `emptyCrewBoard` ne fabrique rien et porte l’état demandé', () => {
  const b = emptyCrewBoard('bike', 'loading');
  assertEquals(b.status, 'loading');
  assertEquals(b.activity, 'bike');
  assertEquals(b.rows, []);
  assertEquals(b.refreshedAt, null);
  assertEquals(b.myRank, null);
});

// ═══ 4. E50 — LES TROIS MESURES ════════════════════════════════════════════

const STATS_OK = {
  ok: true,
  activity: 'run',
  weeks: 4,
  since: '2026-07-06T00:00:00Z',
  defenses: 3,
  distanceM: 82000,
  trend: [
    { weekStart: '2026-07-06T00:00:00Z', distanceM: 20000 },
    { weekStart: '2026-07-13T00:00:00Z', distanceM: 0 },
    { weekStart: '2026-07-20T00:00:00Z', distanceM: 40000 },
    { weekStart: '2026-07-27T00:00:00Z', distanceM: 22000 },
  ],
};

Deno.test('E50 : les trois mesures sont lues, et la courbe garde ses semaines à zéro', () => {
  const s = parseCrewStats(STATS_OK, 'run');
  assertEquals(s.status, 'ready');
  assertEquals(s.stats?.defenses, 3);
  assertEquals(s.stats?.distanceM, 82000);
  assertEquals(s.stats?.trend.length, 4);
  assertEquals(s.stats?.trend[1]?.distanceM, 0, 'une semaine sans sortie est une INFORMATION');
});

Deno.test('E50 : `no_crew` reste `no_crew` — il ne devient pas « crew à zéro »', () => {
  const s = parseCrewStats({ ok: false, reason: 'no_crew' }, 'run');
  assertEquals(s.status, 'no_crew');
  assertEquals(s.stats, null, 'aucun chiffre ne doit exister sans crew');
});

Deno.test('E50 : `signed_out` et les motifs inconnus ne rendent jamais de zéros', () => {
  assertEquals(parseCrewStats({ ok: false, reason: 'signed_out' }, 'run').status, 'signed_out');
  assertEquals(parseCrewStats({ ok: false, reason: 'venu_du_futur' }, 'run').status, 'unavailable');
  for (const raw of [null, 7, 'non', []]) {
    const s = parseCrewStats(raw, 'run');
    assertEquals(s.status, 'unavailable');
    assertEquals(s.stats, null);
  }
});

Deno.test('E50 : une COURBE AMPUTÉE est refusée — elle ferait croire à une tendance', () => {
  const s = parseCrewStats({ ...STATS_OK, trend: STATS_OK.trend.slice(0, 2) }, 'run');
  assertEquals(s.status, 'unavailable');
  assertEquals(s.stats, null);
});

Deno.test('E50 : une mesure manquante ou négative refuse tout le bloc', () => {
  assertEquals(parseCrewStats({ ...STATS_OK, defenses: undefined }, 'run').status, 'unavailable');
  assertEquals(parseCrewStats({ ...STATS_OK, defenses: -1 }, 'run').status, 'unavailable');
  assertEquals(parseCrewStats({ ...STATS_OK, distanceM: null }, 'run').status, 'unavailable');
  assertEquals(parseCrewStats({ ...STATS_OK, weeks: 0 }, 'run').status, 'unavailable');
});

Deno.test('E50 : un `bigint` rendu en CHAÎNE est accepté (sinon la semaine disparaît)', () => {
  assertEquals(parseCrewTrendPoint({ weekStart: '2026-07-27T00:00:00Z', distanceM: '123456' }), {
    weekStart: '2026-07-27T00:00:00Z',
    distanceM: 123456,
  });
  const s = parseCrewStats({ ...STATS_OK, distanceM: '82000' }, 'run');
  assertEquals(s.stats?.distanceM, 82000);
});

Deno.test('E50 : un point SANS date ne se place nulle part', () => {
  assertEquals(parseCrewTrendPoint({ distanceM: 10 }), null);
  assertEquals(parseCrewTrendPoint({ weekStart: '2026-07-27T00:00:00Z' }), null);
  assertEquals(parseCrewTrendPoint({ weekStart: '2026-07-27T00:00:00Z', distanceM: -5 }), null);
});

// ═══ 5. LA COURBE NE MENT PAS GRAPHIQUEMENT ════════════════════════════════

Deno.test('E50 : la barre la plus haute EST le maximum réel, et zéro vaut zéro', () => {
  const trend: CrewTrendPoint[] = [
    { weekStart: 'a', distanceM: 0 },
    { weekStart: 'b', distanceM: 5000 },
    { weekStart: 'c', distanceM: 10000 },
  ];
  assertEquals(trendHeights(trend), [0, 0.5, 1]);
});

Deno.test('E50 : une courbe entièrement à zéro reste PLATE AU SOL (aucun moignon décoratif)', () => {
  const trend: CrewTrendPoint[] = [
    { weekStart: 'a', distanceM: 0 },
    { weekStart: 'b', distanceM: 0 },
  ];
  assertEquals(trendHeights(trend), [0, 0], 'un moignon ferait croire à une activité inexistante');
  assertEquals(trendHeights([]), []);
});
