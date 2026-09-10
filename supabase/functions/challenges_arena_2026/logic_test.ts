import { assertEquals } from 'jsr:@std/assert@^1';
import { CHALLENGE_RULES_2026, CITY_DISC_RADIUS_M } from '../_shared/game-rules.ts';
import { arenaJournalLine2026, arenaRpcArguments2026, buildArenaId2026, parseArenaCommand2026 } from './logic.ts';

const now = Date.parse('2026-09-10T12:00:00Z');
const propose = { action: 'propose', communeInsee: '76540', activity: 'run' } as Record<string, unknown>;
const publish = {
  ...propose, action: 'publish', timeZone: 'Europe/Paris', title: 'Rouen — rive droite',
  sectorTitles: ['Les Quais', 'Jardin des Plantes', 'Rive Gauche'],
  accessSource: 'https://exemple.fr/acces-verifie', reviewedAt: '2026-09-09T09:00:00Z', operator: 'fondateur',
};
const reason = (body: unknown) => { const parsed = parseArenaCommand2026(body, now); return parsed.ok ? null : parsed.reason; };

Deno.test('arène : l’identifiant est dérivé de la commune, jamais saisi libre', () => {
  assertEquals(buildArenaId2026('76540', 'run', 1), 'fr-76540-run-v1');
  assertEquals(buildArenaId2026('2A004', 'bike', 2), 'fr-2A004-bike-v2');
  const parsed = parseArenaCommand2026({ ...propose, version: 3 }, now);
  assertEquals(parsed.ok && parsed.command.action === 'propose' && parsed.command.request.arenaId, 'fr-76540-run-v3');
  assertEquals(reason({ ...propose, version: 0 }), 'invalid_version');
  assertEquals(reason({ ...propose, version: 1.5 }), 'invalid_version');
  assertEquals(reason({ ...propose, communeInsee: '7654' }), 'invalid_commune');
  assertEquals(reason({ ...propose, communeInsee: 'rouen' }), 'invalid_commune');
});

Deno.test('arène : les paramètres géographiques viennent des constantes, pas du corps', () => {
  const parsed = parseArenaCommand2026(propose, now);
  if (!parsed.ok || parsed.command.action !== 'propose') throw new Error('proposition refusée');
  assertEquals(parsed.command.request.padM, CHALLENGE_RULES_2026.minimumTraceInsideSectorM.run);
  assertEquals(parsed.command.request.minSpanM, CHALLENGE_RULES_2026.minimumTraceInsideSectorM.run);
  assertEquals(parsed.command.request.minPossessions, CHALLENGE_RULES_2026.sectorCount);
  assertEquals(parsed.command.request.searchRadiusM, CITY_DISC_RADIUS_M);
  const bike = parseArenaCommand2026({ ...propose, activity: 'bike' }, now);
  assertEquals(bike.ok && bike.command.action === 'propose' && bike.command.request.padM, CHALLENGE_RULES_2026.minimumTraceInsideSectorM.bike);
  // Un réglage qui ne gouverne rien doit être refusé, pas ignoré.
  assertEquals(reason({ ...propose, padM: 10 }), 'unexpected_field:padM');
  assertEquals(reason({ ...propose, minPossessions: 1, sectorGeometry: {} }), 'unexpected_field:minPossessions,sectorGeometry');
  assertEquals(reason({ ...propose, searchRadiusM: CITY_DISC_RADIUS_M + 1 }), 'invalid_search_radius');
  assertEquals(reason({ ...propose, searchRadiusM: 0 }), 'invalid_search_radius');
  const narrowed = parseArenaCommand2026({ ...propose, searchRadiusM: 2500 }, now);
  assertEquals(narrowed.ok && narrowed.command.action === 'propose' && narrowed.command.request.searchRadiusM, 2500);
});

Deno.test('arène : publier exige trois noms de lieux réels, un fuseau et une revue datée', () => {
  assertEquals(reason(publish), null);
  assertEquals(reason({ ...publish, sectorTitles: ['Les Quais', 'Jardin des Plantes'] }), 'sector_titles_required');
  assertEquals(reason({ ...publish, sectorTitles: ['Les Quais', 'Les Quais', 'Rive Gauche'] }), 'sector_titles_required');
  assertEquals(reason({ ...publish, sectorTitles: ['Les Quais', '  ', 'Rive Gauche'] }), 'sector_titles_required');
  assertEquals(reason({ ...publish, timeZone: '' }), 'time_zone_required');
  assertEquals(reason({ ...publish, title: '   ' }), 'title_required');
  assertEquals(reason({ ...publish, accessSource: '' }), 'access_source_required');
  assertEquals(reason({ ...publish, operator: '' }), 'operator_required');
  // Une revue d'accès dans le futur serait une revue qui n'a pas eu lieu.
  assertEquals(reason({ ...publish, reviewedAt: '2026-09-11T09:00:00Z' }), 'invalid_reviewed_at');
  assertEquals(reason({ ...publish, reviewedAt: 'hier' }), 'invalid_reviewed_at');
});

Deno.test('arène : retirer nomme son opérateur, son motif et une arène dérivée', () => {
  assertEquals(reason({ action: 'retire', arenaId: 'fr-76540-run-v1', operator: 'fondateur', reason: 'travaux' }), null);
  assertEquals(reason({ action: 'retire', arenaId: 'rouen', operator: 'fondateur', reason: 'travaux' }), 'invalid_arena_id');
  assertEquals(reason({ action: 'retire', arenaId: 'fr-76540-run-v1', operator: 'fondateur' }), 'reason_required');
  assertEquals(reason({ action: 'retire', arenaId: 'fr-76540-run-v1', reason: 'travaux' }), 'operator_required');
  assertEquals(reason({ action: 'retire', arenaId: 'fr-76540-run-v1', operator: 'x', reason: 'y', communeInsee: '76540' }), 'unexpected_field:communeInsee');
  assertEquals(reason({ action: 'ouvrir' }), 'invalid_action');
  assertEquals(reason([]), 'invalid_body');
  assertEquals(reason(null), 'invalid_body');
});

Deno.test('arène : les arguments RPC suivent le contrat SQL de 0151, sans défaut caché', () => {
  const proposal = parseArenaCommand2026(propose, now);
  if (!proposal.ok) throw new Error('proposition refusée');
  assertEquals(arenaRpcArguments2026(proposal.command), {
    rpc: 'propose_challenge_arenas_2026',
    args: { p_arena_id: 'fr-76540-run-v1', p_commune_insee: '76540', p_activity: 'run', p_search_radius_m: CITY_DISC_RADIUS_M, p_pad_m: 400, p_min_span_m: 400, p_min_possessions: 3 },
  });
  const published = parseArenaCommand2026(publish, now);
  if (!published.ok) throw new Error('publication refusée');
  const call = arenaRpcArguments2026(published.command);
  assertEquals(call.rpc, 'publish_challenge_arena_2026');
  assertEquals(call.args.p_sector_titles, ['Les Quais', 'Jardin des Plantes', 'Rive Gauche']);
  assertEquals(call.args.p_operator, 'fondateur');
  assertEquals(call.args.p_time_zone, 'Europe/Paris');
  assertEquals(Object.keys(call.args).length, 13);
});

Deno.test('arène : le journal dit qui a demandé quoi, et ne porte aucun secret', () => {
  const published = parseArenaCommand2026(publish, now);
  if (!published.ok) throw new Error('publication refusée');
  const line = arenaJournalLine2026(published.command, '2026-09-10T12:00:00.000Z');
  assertEquals(JSON.parse(line), {
    fn: 'challenges_arena_2026', at: '2026-09-10T12:00:00.000Z', action: 'publish', arenaId: 'fr-76540-run-v1',
    commune: '76540', activity: 'run', searchRadiusM: CITY_DISC_RADIUS_M, operator: 'fondateur', timeZone: 'Europe/Paris',
  });
  assertEquals(line.includes('Bearer'), false);
});
