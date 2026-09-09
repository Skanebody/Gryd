/**
 * GRYD — « Ta commune, cette semaine » : ce que le CLIENT refuse d'afficher.
 * ADR-013 §2.1, lot L. Pur (aucun React, aucun réseau).
 *
 * Ces tests ne vérifient pas un parseur : ils verrouillent les deux refus qui
 * font qu'un classement reste honnête même si le serveur régresse — pas de
 * podium sous le seuil, pas de classement sans sa date de mesure.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  formatMeasuredAt2026,
  formatSquareKm2026,
  paintedScopes2026,
  parseLeaderboard2026,
  parseLeaderboardScopes2026,
  type LeaderboardScope2026,
} from './CommuneLeaderboard2026Model.ts';

const KEY = 'a'.repeat(32);
const row = (patch: Record<string, unknown> = {}) => ({
  rank: 1, tiedCount: 1, key: KEY, label: 'Marie', crew: null, isMe: false,
  subjectId: null, newTerrainM2: 1200, heldM2: 300, ...patch,
});
const board = (patch: Record<string, unknown> = {}) => ({
  contract: 'leaderboard.2026.1',
  status: 'ranked',
  reason: null,
  activity: 'run',
  scope: 'commune',
  scopeRef: 'insee-76540',
  scopeLabel: 'Rouen',
  measuredAt: '2026-09-10T12:00:00.000Z',
  stale: false,
  window: { start: '2026-09-06T22:00:00.000Z', end: '2026-09-13T22:00:00.000Z', timeZone: 'Europe/Paris' },
  entries: [row(), row({ rank: 2, key: 'b'.repeat(32), label: null })],
  me: { rank: 1, tiedCount: 1, ranked: true, newTerrainM2: 1200, heldM2: 300 },
  subjectsCount: 5,
  minRankedSubjects: 5,
  ...patch,
});

Deno.test('un classement complet se lit, avec sa date et ses lignes', () => {
  const parsed = parseLeaderboard2026(board(), 'run');
  assertEquals(parsed?.status, 'ranked');
  assertEquals(parsed?.entries.length, 2);
  assertEquals(parsed?.entries[1].label, null);
  assertEquals(parsed?.scopeLabel, 'Rouen');
  assertEquals(parsed?.me?.rank, 1);
});

Deno.test('des lignes servies HORS de l’état classé font refuser toute la lecture', () => {
  // Le serveur ne doit jamais rendre de lignes sous le seuil (0164). S'il le
  // faisait, l'écran afficherait un podium à quatre sans s'en apercevoir : ici,
  // la lecture est refusée, et l'écran dit « indisponible ».
  assertEquals(parseLeaderboard2026(board({ status: 'not_enough_people', subjectsCount: 4 }), 'run'), null);
  assertEquals(parseLeaderboard2026(board({ status: 'unavailable' }), 'run'), null);
});

Deno.test('un classement SANS date de mesure est refusé', () => {
  // « Mesuré à HH:MM » n'est pas une décoration : un classement daté de nulle
  // part est le mensonge d'écran de la matview sans job.
  assertEquals(parseLeaderboard2026(board({ measuredAt: null }), 'run'), null);
  assertEquals(parseLeaderboard2026(board({ entries: [] }), 'run'), null);
});

Deno.test('« pas assez de monde » se lit, sans une seule ligne, avec son compte réel', () => {
  const parsed = parseLeaderboard2026(
    board({ status: 'not_enough_people', reason: 'below_threshold', entries: [], subjectsCount: 3,
      me: { rank: null, tiedCount: null, ranked: false, newTerrainM2: null, heldM2: null } }),
    'run',
  );
  assertEquals(parsed?.status, 'not_enough_people');
  assertEquals(parsed?.entries.length, 0);
  assertEquals(parsed?.subjectsCount, 3);
  assertEquals(parsed?.me?.ranked, false);
  assertEquals(parsed?.me?.newTerrainM2, null);
});

Deno.test('« moi » ne peut être ni classé sans rang, ni non classé avec un chiffre', () => {
  assertEquals(parseLeaderboard2026(board({ me: { rank: null, tiedCount: null, ranked: true, newTerrainM2: 5, heldM2: 0 } }), 'run'), null);
  assertEquals(
    parseLeaderboard2026(board({ me: { rank: null, tiedCount: null, ranked: false, newTerrainM2: 0, heldM2: 0 } }), 'run'),
    null,
    'un « 0 » nu servi comme mesure doit être refusé',
  );
});

Deno.test('un identifiant de tiers dans une ligne fait refuser la lecture', () => {
  assertEquals(parseLeaderboard2026(board({ entries: [row({ subjectId: 'ab' })] }), 'run'), null);
});

Deno.test('un contrat, une discipline ou une portée étrangère est refusé', () => {
  assertEquals(parseLeaderboard2026(board({ contract: 'leaderboard.2027.1' }), 'run'), null);
  assertEquals(parseLeaderboard2026(board(), 'bike'), null);
  assertEquals(parseLeaderboard2026(board({ scope: 'europe' }), 'run'), null);
  assertEquals(parseLeaderboard2026(null, 'run'), null);
});

Deno.test('une fenêtre à l’envers ou illisible est refusée', () => {
  assertEquals(parseLeaderboard2026(board({ window: { start: 'x', end: 'y', timeZone: 'Europe/Paris' } }), 'run'), null);
  assertEquals(
    parseLeaderboard2026(board({ window: { start: '2026-09-13T22:00:00Z', end: '2026-09-06T22:00:00Z', timeZone: 'Europe/Paris' } }), 'run'),
    null,
  );
});

const scopes = (patch: Record<string, unknown> = {}) => ({
  contract: 'leaderboard.scopes.2026.1',
  activity: 'run',
  commune: 'insee-76540',
  window: { start: '2026-09-06T22:00:00Z', end: '2026-09-13T22:00:00Z', timeZone: 'Europe/Paris' },
  scopes: [
    { scope: 'commune', ref: 'insee-76540', label: 'Rouen', subjectsCount: 7, measuredAt: '2026-09-10T12:00:00Z', open: true },
    { scope: 'department', ref: '76', label: null, subjectsCount: null, measuredAt: null, open: false },
    { scope: 'country', ref: 'FR', label: null, subjectsCount: 2, measuredAt: '2026-09-10T12:00:00Z', open: false },
  ],
  declaredNotServed: ['region', 'europe'],
  minRankedSubjects: 5,
  ...patch,
});

Deno.test('les portées se lisent avec leur ouverture réelle', () => {
  const parsed = parseLeaderboardScopes2026(scopes(), 'run');
  assertEquals(parsed?.commune, 'insee-76540');
  assertEquals(parsed?.scopes.map((s) => s.open), [true, false, false]);
  assertEquals(parsed?.declaredNotServed, ['region', 'europe']);
});

Deno.test('une portée « ouverte » sans compte de sujets est refusée', () => {
  const bad = scopes({ scopes: [{ scope: 'commune', ref: 'insee-76540', label: 'Rouen', subjectsCount: null, measuredAt: null, open: true }] });
  assertEquals(parseLeaderboardScopes2026(bad, 'run'), null);
});

Deno.test('on ne peint QUE les portées ouvertes — et celle qu’on regarde', () => {
  const parsed = parseLeaderboardScopes2026(scopes(), 'run');
  const list = parsed?.scopes as readonly LeaderboardScope2026[];
  assertEquals(paintedScopes2026(list, null).map((s) => s.scope), ['commune']);
  // La portée regardée ne disparaît pas sous le doigt si elle se referme.
  assertEquals(paintedScopes2026(list, 'country').map((s) => s.scope), ['commune', 'country']);
});

Deno.test('région et Europe ne sont jamais peintes', () => {
  const parsed = parseLeaderboardScopes2026(scopes(), 'run');
  assertEquals(paintedScopes2026(parsed!.scopes, null).some((s) => ['region', 'europe'].includes(s.scope)), false);
});

Deno.test('une petite surface n’est jamais arrondie à zéro', () => {
  // 18 000 m² = 0,018 km². Deux décimales seulement afficheraient « 0,02 » ;
  // aucune n'afficherait « 0 » — un terrain réel ne devient pas rien.
  assertEquals(formatSquareKm2026(18_000, 'fr-FR'), '0,018');
  assertEquals(formatSquareKm2026(1_200_000, 'en-GB'), '1.20');
});

Deno.test('sans mesure, il n’y a pas d’heure — et surtout pas une inventée', () => {
  assertEquals(formatMeasuredAt2026(null, 'fr-FR'), null);
  assertEquals(typeof formatMeasuredAt2026(Date.parse('2026-09-10T12:00:00Z'), 'fr-FR'), 'string');
});
