/**
 * GRYD — « Ta commune, cette semaine » : LE MODÈLE, PUR ET DÉFIANT.
 * ADR-013 §2.1, lot L. Aucun React, aucun réseau : testable sous Deno.
 *
 * ═══ POURQUOI CE FICHIER EXISTE PLUTÔT QUE DU `data.entries.map()` ═════════
 * Un classement est la seule surface du produit où l'écran affiche des noms de
 * personnes à côté d'un rang. Deux fautes y coûtent cher, et aucune ne se voit
 * à la lecture d'un JSX :
 *   · SERVIR UN PODIUM SOUS LE SEUIL. Le serveur ne rend aucune ligne quand il
 *     y a moins de `minRankedSubjects` sujets (0164). Si une régression future
 *     lui en faisait rendre, l'écran les afficherait sans broncher. Ici, un
 *     `status` autre que `ranked` accompagné de lignes fait REFUSER toute la
 *     lecture : mieux vaut « indisponible » qu'un podium à trois.
 *   · AFFICHER UNE MESURE SANS SA DATE. Un classement `ranked` sans
 *     `measuredAt` est un mensonge d'écran (le piège de la matview sans job,
 *     déjà payé dans ce dépôt). Il est refusé aussi.
 * `parse*` rend `null` sur tout ce qu'il n'a pas compris — jamais un objet
 * partiel « au mieux » : l'écran distingue alors ÉCHEC et VIDE, ce que les
 * quatre états de CLAUDE.md exigent.
 */
import type { Activity } from '@klaim/shared';

export type LeaderboardStatus2026 = 'ranked' | 'not_enough_people' | 'unavailable';
export type LeaderboardScopeKind2026 = 'commune' | 'department' | 'country';

export interface LeaderboardRow2026 {
  readonly rank: number;
  readonly tiedCount: number;
  /** Pseudonyme scopé au lecteur (0126). Jamais l'identifiant d'autrui. */
  readonly key: string;
  /** `null` = identité non publiable pour ce lecteur. La ligne reste. */
  readonly label: string | null;
  readonly crewName: string | null;
  readonly isMe: boolean;
  readonly newTerrainM2: number;
  readonly heldM2: number;
}

export interface LeaderboardMe2026 {
  readonly ranked: boolean;
  readonly rank: number | null;
  readonly tiedCount: number | null;
  readonly newTerrainM2: number | null;
  readonly heldM2: number | null;
}

export interface LeaderboardBoard2026 {
  readonly status: LeaderboardStatus2026;
  readonly reason: string | null;
  readonly activity: Activity;
  readonly scope: LeaderboardScopeKind2026;
  readonly scopeRef: string;
  readonly scopeLabel: string | null;
  readonly measuredAtMs: number | null;
  readonly stale: boolean;
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly entries: readonly LeaderboardRow2026[];
  readonly me: LeaderboardMe2026 | null;
  readonly subjectsCount: number | null;
  readonly minRankedSubjects: number;
}

export interface LeaderboardScope2026 {
  readonly scope: LeaderboardScopeKind2026;
  readonly ref: string;
  readonly label: string | null;
  readonly subjectsCount: number | null;
  readonly measuredAtMs: number | null;
  readonly open: boolean;
}

export interface LeaderboardScopes2026 {
  readonly activity: Activity;
  readonly commune: string | null;
  readonly scopes: readonly LeaderboardScope2026[];
  readonly declaredNotServed: readonly string[];
  readonly minRankedSubjects: number;
}

const SCOPES: readonly string[] = ['commune', 'department', 'country'];
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const nullableArea = (v: unknown): v is number | null => v === null || positive(v);
const time = (v: unknown): number | null => {
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

function parseRow(raw: unknown): LeaderboardRow2026 | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Number.isInteger(r.rank) || (r.rank as number) < 1) return null;
  if (!Number.isInteger(r.tiedCount) || (r.tiedCount as number) < 1) return null;
  if (typeof r.key !== 'string' || !/^[a-f0-9]{32}$/.test(r.key)) return null;
  if (!(r.label === null || (typeof r.label === 'string' && r.label.length > 0 && r.label.length <= 40))) return null;
  if (typeof r.isMe !== 'boolean') return null;
  // L'identifiant brut n'existe QUE pour moi. Une ligne de tiers qui en porte un
  // est un contrat cassé : on refuse la lecture au lieu de l'afficher.
  if (!r.isMe && r.subjectId !== null && r.subjectId !== undefined) return null;
  if (!positive(r.newTerrainM2) || !positive(r.heldM2)) return null;
  const crew = r.crew as { name?: unknown } | null | undefined;
  const crewName = crew && typeof crew === 'object' && typeof crew.name === 'string' ? crew.name : null;
  return {
    rank: r.rank as number,
    tiedCount: r.tiedCount as number,
    key: r.key,
    label: r.label,
    crewName,
    isMe: r.isMe,
    newTerrainM2: r.newTerrainM2,
    heldM2: r.heldM2,
  };
}

function parseMe(raw: unknown): LeaderboardMe2026 | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.ranked !== 'boolean') return null;
  if (!(m.rank === null || (Number.isInteger(m.rank) && (m.rank as number) >= 1))) return null;
  if (!(m.tiedCount === null || (Number.isInteger(m.tiedCount) && (m.tiedCount as number) >= 1))) return null;
  if (!nullableArea(m.newTerrainM2) || !nullableArea(m.heldM2)) return null;
  // Classé ⇒ un rang et une surface. Non classé ⇒ aucun chiffre : c'est ce qui
  // permet à l'écran d'écrire une phrase au lieu d'un « 0 » nu.
  if (m.ranked && (m.rank === null || m.newTerrainM2 === null)) return null;
  if (!m.ranked && (m.rank !== null || m.newTerrainM2 !== null)) return null;
  return {
    ranked: m.ranked,
    rank: m.rank as number | null,
    tiedCount: m.tiedCount as number | null,
    newTerrainM2: m.newTerrainM2 as number | null,
    heldM2: m.heldM2 as number | null,
  };
}

/** Lit la réponse de `read_leaderboard_2026`. `null` = incompris, donc ÉCHEC. */
export function parseLeaderboard2026(data: unknown, activity: Activity): LeaderboardBoard2026 | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as Record<string, unknown>;
  if (body.contract !== 'leaderboard.2026.1') return null;
  if (body.activity !== activity) return null;
  if (typeof body.status !== 'string' || !['ranked', 'not_enough_people', 'unavailable'].includes(body.status)) return null;
  if (typeof body.scope !== 'string' || !SCOPES.includes(body.scope)) return null;
  if (typeof body.scopeRef !== 'string' || body.scopeRef.length === 0) return null;
  if (!(body.scopeLabel === null || typeof body.scopeLabel === 'string')) return null;
  if (typeof body.stale !== 'boolean') return null;
  if (!Number.isInteger(body.minRankedSubjects) || (body.minRankedSubjects as number) < 1) return null;
  if (!(body.subjectsCount === null || (Number.isInteger(body.subjectsCount) && (body.subjectsCount as number) >= 0))) return null;

  const win = body.window as Record<string, unknown> | undefined;
  const startMs = time(win?.start);
  const endMs = time(win?.end);
  if (startMs === null || endMs === null || endMs <= startMs) return null;

  const measuredAtMs = body.measuredAt === null ? null : time(body.measuredAt);
  if (body.measuredAt !== null && measuredAtMs === null) return null;

  if (!Array.isArray(body.entries)) return null;
  const entries: LeaderboardRow2026[] = [];
  for (const raw of body.entries) {
    const row = parseRow(raw);
    if (row === null) return null;
    entries.push(row);
  }

  // LES DEUX REFUS QUI JUSTIFIENT CE FICHIER (voir l'en-tête).
  if (body.status !== 'ranked' && entries.length > 0) return null;
  if (body.status === 'ranked' && (measuredAtMs === null || entries.length === 0)) return null;

  const me = parseMe(body.me);
  if (body.me !== null && body.me !== undefined && me === null) return null;

  return {
    status: body.status as LeaderboardStatus2026,
    reason: typeof body.reason === 'string' ? body.reason : null,
    activity,
    scope: body.scope as LeaderboardScopeKind2026,
    scopeRef: body.scopeRef,
    scopeLabel: body.scopeLabel,
    measuredAtMs,
    stale: body.stale,
    windowStartMs: startMs,
    windowEndMs: endMs,
    entries,
    me,
    subjectsCount: body.subjectsCount as number | null,
    minRankedSubjects: body.minRankedSubjects as number,
  };
}

/** Lit la réponse de `my_leaderboard_scopes_2026`. `null` = incompris. */
export function parseLeaderboardScopes2026(data: unknown, activity: Activity): LeaderboardScopes2026 | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as Record<string, unknown>;
  if (body.contract !== 'leaderboard.scopes.2026.1') return null;
  if (body.activity !== activity) return null;
  if (!(body.commune === null || (typeof body.commune === 'string' && body.commune.length > 0))) return null;
  if (!Number.isInteger(body.minRankedSubjects) || (body.minRankedSubjects as number) < 1) return null;
  if (!Array.isArray(body.scopes) || !Array.isArray(body.declaredNotServed)) return null;

  const scopes: LeaderboardScope2026[] = [];
  for (const raw of body.scopes) {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Record<string, unknown>;
    if (typeof s.scope !== 'string' || !SCOPES.includes(s.scope)) return null;
    if (typeof s.ref !== 'string' || s.ref.length === 0) return null;
    if (!(s.label === null || typeof s.label === 'string')) return null;
    if (typeof s.open !== 'boolean') return null;
    if (!(s.subjectsCount === null || (Number.isInteger(s.subjectsCount) && (s.subjectsCount as number) >= 0))) return null;
    // Une portée « ouverte » sans compte de sujets serait une ouverture sans
    // preuve : on refuse plutôt que de peindre un onglet qu'on ne sait pas
    // justifier.
    if (s.open && s.subjectsCount === null) return null;
    scopes.push({
      scope: s.scope as LeaderboardScopeKind2026,
      ref: s.ref,
      label: s.label,
      subjectsCount: s.subjectsCount as number | null,
      measuredAtMs: s.measuredAt === null || s.measuredAt === undefined ? null : time(s.measuredAt),
      open: s.open,
    });
  }
  const declared = body.declaredNotServed.filter((v): v is string => typeof v === 'string');
  if (declared.length !== body.declaredNotServed.length) return null;

  return {
    activity,
    commune: body.commune as string | null,
    scopes,
    declaredNotServed: declared,
    minRankedSubjects: body.minRankedSubjects as number,
  };
}

/**
 * Les portées PEINTES : uniquement celles qui sont ouvertes. Une portée fermée
 * n'est pas grisée, elle n'existe pas — « aucun bouton mort » (CLAUDE.md), et
 * l'affichage se dérive de la présence réelle de gens.
 *
 * Exception NOMMÉE : la portée qu'on regarde en ce moment reste peinte même si
 * elle vient de se refermer, sinon le sélecteur perdrait l'onglet actif sous le
 * doigt du lecteur.
 */
export function paintedScopes2026(
  scopes: readonly LeaderboardScope2026[],
  current: LeaderboardScopeKind2026 | null,
): readonly LeaderboardScope2026[] {
  return scopes.filter((s) => s.open || s.scope === current);
}

/**
 * m² → km², avec la locale du lecteur. Trois décimales : une boucle de
 * quartier vaut quelques centièmes de km², et l'arrondir à zéro afficherait
 * « 0 » là où il y a du terrain.
 */
export function formatSquareKm2026(m2: number, locale: string): string {
  return (m2 / 1e6).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

/** L'heure de la mesure, telle qu'elle s'affiche. Jamais une date fabriquée. */
export function formatMeasuredAt2026(ms: number | null, locale: string): string | null {
  if (ms === null) return null;
  return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
