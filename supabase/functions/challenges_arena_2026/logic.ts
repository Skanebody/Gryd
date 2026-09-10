/**
 * GRYD — challenges_arena_2026/logic.ts : la commande d'exploitation d'une
 * arène de défi, validée AVANT tout appel réseau (fonction pure, testée).
 *
 * POURQUOI CETTE FONCTION EXISTE. `challenge_arenas_2026` est vide en
 * production et la seule voie d'écriture (`configure_challenge_arena_2026`)
 * attend trois polygones déjà écrits. 0151 ajoute la dérivation depuis une
 * géographie réelle ; ce module est la porte par laquelle un opérateur la
 * déclenche, avec des paramètres explicites et rien d'implicite.
 *
 * CE QU'IL N'INVENTE PAS :
 *   · aucun nom de lieu — les trois titres de secteurs viennent de l'humain qui
 *     a vu le terrain, et sans eux la publication est refusée ;
 *   · aucun fuseau — il est passé, puis revalidé par le serveur ;
 *   · aucune géométrie — elle est dérivée en SQL, jamais ici ;
 *   · aucune constante de jeu — la marge et la portée minimale d'un secteur
 *     SONT le seuil de trace du cahier (`minimumTraceInsideSectorM`), le nombre
 *     minimal de possessions EST `sectorCount`, et le rayon de recherche ne
 *     peut pas dépasser l'aire de jeu déclarée d'une ville (`CITY_DISC_RADIUS_M`).
 *
 * L'IDENTIFIANT EST DÉRIVÉ, PAS SAISI : `fr-<insee>-<discipline>-v<n>`. Une
 * arène publiée est immuable (0122) ; une correction se publie en `v2` et
 * l'ancienne se retire. Les identifiants de secteurs en découlent côté SQL
 * (`<arenaId>-west|centre|east`), donc deux publications ne se mélangent pas.
 */
import { CHALLENGE_RULES_2026, CITY_DISC_RADIUS_M } from '../_shared/game-rules.ts';

/** Même forme que le référentiel réel `fr_communes` (0068) : Corse incluse. */
export const COMMUNE_INSEE_PATTERN = /^[0-9][0-9AB][0-9]{3}$/;
export const ARENA_ID_PATTERN = /^fr-[0-9][0-9AB][0-9]{3}-(?:run|bike)-v[1-9][0-9]?$/;
export const ARENA_ACTIONS = ['propose', 'publish', 'retire'] as const;
export type ArenaAction2026 = (typeof ARENA_ACTIONS)[number];
export type ArenaActivity2026 = 'run' | 'bike';

export interface ArenaGeometryRequest2026 {
  arenaId: string;
  communeInsee: string;
  activity: ArenaActivity2026;
  searchRadiusM: number;
  padM: number;
  minSpanM: number;
  minPossessions: number;
}
export type ArenaCommand2026 =
  | { action: 'propose'; request: ArenaGeometryRequest2026 }
  | {
    action: 'publish'; request: ArenaGeometryRequest2026; timeZone: string; title: string;
    sectorTitles: string[]; accessSource: string; reviewedAt: string; operator: string;
  }
  | { action: 'retire'; arenaId: string; operator: string; reason: string };

const PROPOSE_FIELDS = ['action', 'communeInsee', 'activity', 'version', 'searchRadiusM'] as const;
const PUBLISH_FIELDS = [...PROPOSE_FIELDS, 'timeZone', 'title', 'sectorTitles', 'accessSource', 'reviewedAt', 'operator'] as const;
const RETIRE_FIELDS = ['action', 'arenaId', 'operator', 'reason'] as const;

export function buildArenaId2026(communeInsee: string, activity: ArenaActivity2026, version: number): string {
  return `fr-${communeInsee}-${activity}-v${version}`;
}

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isActivity = (value: unknown): value is ArenaActivity2026 => value === 'run' || value === 'bike';

/**
 * Refuse un champ inconnu au lieu de l'ignorer : un opérateur qui croit régler
 * la marge d'un secteur par le corps de la requête doit l'apprendre tout de
 * suite, pas découvrir six mois plus tard que son réglage n'a rien fait.
 */
export function parseArenaCommand2026(body: unknown, nowMs: number): { ok: true; command: ArenaCommand2026 } | { ok: false; reason: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'invalid_body' };
  const input = body as Record<string, unknown>;
  if (typeof input.action !== 'string' || !ARENA_ACTIONS.includes(input.action as ArenaAction2026)) return { ok: false, reason: 'invalid_action' };
  const action: ArenaAction2026 = input.action as ArenaAction2026;
  const allowed: readonly string[] = action === 'retire' ? RETIRE_FIELDS : action === 'publish' ? PUBLISH_FIELDS : PROPOSE_FIELDS;
  const unexpected = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) return { ok: false, reason: `unexpected_field:${unexpected.sort().join(',')}` };
  if (!text(input.operator) && action !== 'propose') return { ok: false, reason: 'operator_required' };

  if (action === 'retire') {
    if (!text(input.arenaId) || !ARENA_ID_PATTERN.test(input.arenaId)) return { ok: false, reason: 'invalid_arena_id' };
    if (!text(input.reason)) return { ok: false, reason: 'reason_required' };
    return { ok: true, command: { action, arenaId: input.arenaId, operator: (input.operator as string).trim(), reason: input.reason.trim() } };
  }

  if (!text(input.communeInsee) || !COMMUNE_INSEE_PATTERN.test(input.communeInsee)) return { ok: false, reason: 'invalid_commune' };
  if (!isActivity(input.activity)) return { ok: false, reason: 'invalid_activity' };
  const version = input.version === undefined ? 1 : input.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 99) return { ok: false, reason: 'invalid_version' };
  const searchRadiusM = input.searchRadiusM === undefined ? CITY_DISC_RADIUS_M : input.searchRadiusM;
  if (typeof searchRadiusM !== 'number' || !Number.isFinite(searchRadiusM) || searchRadiusM <= 0 || searchRadiusM > CITY_DISC_RADIUS_M) {
    return { ok: false, reason: 'invalid_search_radius' };
  }
  // Le seuil de trace du cahier §6.2 est aussi la plus petite portée qu'un
  // secteur puisse avoir : en dessous, la condition serait inatteignable.
  const trace = CHALLENGE_RULES_2026.minimumTraceInsideSectorM[input.activity];
  const request: ArenaGeometryRequest2026 = {
    arenaId: buildArenaId2026(input.communeInsee, input.activity, version),
    communeInsee: input.communeInsee, activity: input.activity,
    searchRadiusM, padM: trace, minSpanM: trace, minPossessions: CHALLENGE_RULES_2026.sectorCount,
  };
  if (action === 'propose') return { ok: true, command: { action, request } };

  if (!text(input.timeZone)) return { ok: false, reason: 'time_zone_required' };
  if (!text(input.title)) return { ok: false, reason: 'title_required' };
  if (!text(input.accessSource)) return { ok: false, reason: 'access_source_required' };
  if (!Array.isArray(input.sectorTitles) || input.sectorTitles.length !== CHALLENGE_RULES_2026.sectorCount
    || input.sectorTitles.some((title) => !text(title))
    || new Set(input.sectorTitles.map((title) => (title as string).trim())).size !== CHALLENGE_RULES_2026.sectorCount) {
    return { ok: false, reason: 'sector_titles_required' };
  }
  if (!text(input.reviewedAt) || !Number.isFinite(Date.parse(input.reviewedAt)) || Date.parse(input.reviewedAt) > nowMs) {
    return { ok: false, reason: 'invalid_reviewed_at' };
  }
  return {
    ok: true,
    command: {
      action, request, timeZone: input.timeZone.trim(), title: input.title.trim(),
      sectorTitles: input.sectorTitles.map((title) => (title as string).trim()),
      accessSource: input.accessSource.trim(), reviewedAt: input.reviewedAt,
      operator: (input.operator as string).trim(),
    },
  };
}

/** Arguments RPC, dans l'ordre du contrat SQL de 0151. Aucun défaut côté base. */
export function arenaRpcArguments2026(command: ArenaCommand2026): { rpc: string; args: Record<string, unknown> } {
  if (command.action === 'retire') {
    return { rpc: 'retire_challenge_arena_2026', args: { p_arena_id: command.arenaId, p_operator: command.operator, p_reason: command.reason } };
  }
  const geometry = {
    p_arena_id: command.request.arenaId, p_commune_insee: command.request.communeInsee, p_activity: command.request.activity,
    p_search_radius_m: command.request.searchRadiusM, p_pad_m: command.request.padM,
    p_min_span_m: command.request.minSpanM, p_min_possessions: command.request.minPossessions,
  };
  if (command.action === 'propose') return { rpc: 'propose_challenge_arenas_2026', args: geometry };
  return {
    rpc: 'publish_challenge_arena_2026',
    args: {
      p_arena_id: geometry.p_arena_id, p_commune_insee: geometry.p_commune_insee, p_activity: geometry.p_activity,
      p_time_zone: command.timeZone, p_title: command.title, p_sector_titles: command.sectorTitles,
      p_access_source: command.accessSource, p_reviewed_at: command.reviewedAt, p_operator: command.operator,
      p_search_radius_m: geometry.p_search_radius_m, p_pad_m: geometry.p_pad_m,
      p_min_span_m: geometry.p_min_span_m, p_min_possessions: geometry.p_min_possessions,
    },
  };
}

/** Journal d'exploitation : ce qui a été demandé, par qui — jamais un secret. */
export function arenaJournalLine2026(command: ArenaCommand2026, at: string): string {
  const base = { fn: 'challenges_arena_2026', at, action: command.action };
  if (command.action === 'retire') return JSON.stringify({ ...base, arenaId: command.arenaId, operator: command.operator, reason: command.reason });
  const request = { ...base, arenaId: command.request.arenaId, commune: command.request.communeInsee, activity: command.request.activity, searchRadiusM: command.request.searchRadiusM };
  return JSON.stringify(command.action === 'publish' ? { ...request, operator: command.operator, timeZone: command.timeZone } : request);
}
