/**
 * GRYD — LA SURFACE DU RÉSULTAT VIENT DE `territories`, PAS D'UN COMPTE D'HEXAGONES.
 *
 * La spec §D veut une « surface héro » sur E29 (conquête), E30 (reprise) et
 * E31 (défense : « surface conservée »). `IngestRunResponse` n'en porte AUCUNE —
 * l'écran l'écrivait donc noir sur blanc : « aucun km² : convertir des hexes en
 * surface côté client serait un chiffre inventé ». Il avait raison, et depuis le
 * lot 1 la vraie surface EXISTE : `territories.area_m2` (0074), calculée
 * géodésiquement par le moteur, écrite par `ingest_run` avec `source_run_id` =
 * la course qui l'a créée. Ce module va la CHERCHER, au lieu de la deviner.
 *
 * DEUX LECTURES, DEUX BESOINS DISTINCTS :
 *  1. LE TERRITOIRE DE CETTE SORTIE — `territories.source_run_id = runId`. Il
 *     n'existe que si la boucle a fermé ET qu'une capture a eu lieu (index.ts :
 *     `capturedCellCount > 0 && loopClosed`). Sert à E29 et E30.
 *  2. LA CONTESTATION REFERMÉE — E31. Une défense n'écrit AUCUN territoire :
 *     elle passe une ligne de `territory_contests` en 'defended' et fortifie le
 *     territoire visé. L'« échéance évitée » de la spec est le `expires_at` de
 *     cette ligne ; le « niveau de protection obtenu » est le `defense_level`
 *     du territoire fortifié ; la « surface conservée » son `area_m2`.
 *
 * ⚠️ CE QUE CES LECTURES NE PEUVENT PAS FAIRE, ET QU'ON N'IMITERA PAS :
 *  · nommer l'ancien propriétaire d'une zone reprise. `territories` ne garde pas
 *    d'historique de propriété, et `territory_contests.attacker_*` n'est lisible
 *    QUE des deux parties (0078). E30 se raconte donc SANS nommer personne, ce
 *    qui est de toute façon ce que §12 demande ;
 *  · dire une variation de rang. Aucune lecture de classement n'alimente cet
 *    écran ; la ligne reste absente jusqu'à ce qu'une source existe.
 *
 * ⚠️ DÉPENDANCE DE DÉPLOIEMENT : ces lectures exigent 0074 et 0078 APPLIQUÉES.
 * Une lecture qui échoue rend `null` — c'est-à-dire « on ne sait pas », donc un
 * bloc ABSENT. Jamais un zéro, jamais un repli.
 *
 * PUR — zéro import, donc Deno-testable : ce fichier ne fait QUE choisir la
 * bonne ligne et vérifier qu'elle me concerne. Les deux `select` vivent dans
 * `useResultTerritory.ts` (React + Supabase), qui n'ajoute aucune décision.
 */
// ═══════════════════════════════════════════════════════════════════════════
// 1. LES LIGNES, TELLES QUE POSTGREST LES REND
// ═══════════════════════════════════════════════════════════════════════════

/** Colonnes de `territories` lues ici — SOURCE UNIQUE de ce select. */
export const RESULT_TERRITORY_COLUMNS = 'id, area_m2, defense_level, source_run_id';

/**
 * Colonnes de `territory_contests` lues ici, AVEC le territoire visé embarqué.
 * `attacker_type` / `attacker_id` sont volontairement ABSENTS : cet écran n'a
 * aucun besoin de savoir QUI attaquait, et §12 dit que ça ne le regarde pas.
 */
export const RESULT_CONTEST_COLUMNS =
  'status, resolved_at, expires_at, territories(owner_type, owner_id, area_m2, defense_level)';

export interface ResultTerritoryRow {
  readonly id: string;
  readonly area_m2: number | null;
  readonly defense_level: number | null;
  readonly source_run_id: string | null;
}

export interface ContestTerritoryRow {
  readonly owner_type: 'user' | 'crew' | null;
  readonly owner_id: string | null;
  readonly area_m2: number | null;
  readonly defense_level: number | null;
}

export interface ResultContestRow {
  readonly status: string | null;
  readonly resolved_at: string | null;
  readonly expires_at: string | null;
  /**
   * PostgREST rend l'embed en objet quand la relation est « many-to-one », mais
   * certaines versions le rendent en TABLEAU. Les deux formes sont acceptées ici
   * plutôt que de faire dépendre l'honnêteté d'un écran d'une version de
   * PostgREST — et une forme inattendue rend `null`, pas une valeur par défaut.
   */
  readonly territories: ContestTerritoryRow | readonly ContestTerritoryRow[] | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE CHOIX DE LA LIGNE — PUR, DONC TESTÉ
// ═══════════════════════════════════════════════════════════════════════════

/** Ce que l'écran de résultat peut afficher d'une zone gagnée ou tenue. */
export interface ResultTerritoryFacts {
  readonly areaM2: number | null;
  readonly protectionLevel: number | null;
}

/**
 * Le territoire écrit PAR CETTE SORTIE.
 *
 * Le filtre sur `source_run_id` est refait ICI alors que la requête le pose
 * déjà : une requête qui déraperait (paramètre perdu, cache, mauvais `runId`)
 * afficherait sinon la surface d'une AUTRE course sous le résultat de celle-ci.
 * Deux serrures sur un chiffre que le joueur va croire.
 *
 * Plusieurs lignes pour un même run ne devraient pas exister
 * (`territories_source_run_unique`, 0075) ; si ça arrive quand même, on prend la
 * plus GRANDE — c'est la seule règle qui ne dépende pas de l'ordre de la base.
 */
export function pickRunTerritory(
  rows: readonly ResultTerritoryRow[] | null,
  runId: string | null,
): ResultTerritoryFacts | null {
  if (!rows || !runId) return null;
  const mine = rows.filter((r) => r.source_run_id === runId);
  if (mine.length === 0) return null;
  let best: ResultTerritoryRow | null = null;
  for (const row of mine) {
    const area = typeof row.area_m2 === 'number' && Number.isFinite(row.area_m2) ? row.area_m2 : -1;
    const bestArea =
      best && typeof best.area_m2 === 'number' && Number.isFinite(best.area_m2) ? best.area_m2 : -1;
    if (!best || area > bestArea) best = row;
  }
  if (!best) return null;
  return { areaM2: best.area_m2, protectionLevel: best.defense_level };
}

/** Ce qu'une contestation refermée par ma défense apprend à l'écran (E31). */
export interface DefendedContestFacts {
  /** `expires_at` : l'échéance que la défense a ÉVITÉE (ISO 8601). */
  readonly deadlineAvoidedAt: string;
  /** `resolved_at` : quand la défense a tranché (ISO 8601). */
  readonly defendedAt: string;
  readonly areaM2: number | null;
  readonly protectionLevel: number | null;
}

/** Normalise l'embed PostgREST (objet ou tableau) — forme inattendue ⇒ `null`. */
function embeddedTerritory(
  value: ResultContestRow['territories'],
): ContestTerritoryRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.length > 0 ? value[0] : null;
  return value as ContestTerritoryRow;
}

/**
 * LA contestation que MA défense vient de refermer, ou `null`.
 *
 * Trois filtres, tous nécessaires :
 *  1. `status === 'defended'` — une contestation encore active n'a rien évité ;
 *  2. LE TERRITOIRE EST À MOI (ou à mon crew). La RLS de 0078 rend une ligne
 *     visible aux DEUX parties : sans ce filtre, un attaquant dont la cible
 *     s'est défendue lirait « ZONE DÉFENDUE · échéance évitée » sur SA course —
 *     l'écran raconterait la victoire de l'adversaire ;
 *  3. `resolved_at` DANS LA FENÊTRE de cette sortie. Une contestation refermée
 *     la semaine dernière n'est pas l'œuvre de la course qu'on regarde.
 *
 * La plus RÉCENTE gagne quand il y en a plusieurs : c'est celle que la sortie
 * qu'on affiche vient de trancher.
 */
export function pickDefendedContest(
  rows: readonly ResultContestRow[] | null,
  input: {
    readonly meId: string | null;
    readonly myCrewId: string | null;
    readonly windowStartMs: number;
    readonly nowMs: number;
  },
): DefendedContestFacts | null {
  if (!rows || !input.meId) return null;
  let best: { row: ResultContestRow; t: ContestTerritoryRow; at: number } | null = null;
  for (const row of rows) {
    if (row.status !== 'defended') continue;
    if (!row.resolved_at || !row.expires_at) continue;
    const at = Date.parse(row.resolved_at);
    if (!Number.isFinite(at)) continue;
    // Fenêtre STRICTE : bornée en bas par le départ de la fenêtre, en haut par
    // l'instant courant (une résolution « dans le futur » est un skew, pas un fait).
    if (at < input.windowStartMs || at > input.nowMs) continue;
    const t = embeddedTerritory(row.territories);
    if (!t) continue;
    const isMine =
      (t.owner_type === 'user' && t.owner_id === input.meId) ||
      (t.owner_type === 'crew' && input.myCrewId !== null && t.owner_id === input.myCrewId);
    if (!isMine) continue;
    if (!best || at > best.at) best = { row, t, at };
  }
  if (!best) return null;
  return {
    deadlineAvoidedAt: best.row.expires_at as string,
    defendedAt: best.row.resolved_at as string,
    areaM2: best.t.area_m2,
    protectionLevel: best.t.defense_level,
  };
}
