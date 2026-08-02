/**
 * GRYD — engine/territoryHistory.ts : « ce quartier était à toi de mars à septembre ».
 *
 * Fonctions PURES : aucune I/O, aucune horloge implicite — `nowMs` est INJECTÉ,
 * comme partout dans ce moteur. C'est ce qui rend une durée testable au lieu
 * d'être « ce que la machine dit aujourd'hui ».
 *
 * ─── POURQUOI LA DÉRIVATION VIT ICI ET PAS EN SQL ───────────────────────────
 * `my_territory_history()` (0110) rend les règnes BRUTS. Si la durée était
 * calculée en base, un « 187 jours » serveur pourrait contredire un « 6 mois »
 * écran, et personne ne saurait lequel croire. Une seule dérivation, testée.
 *
 * ─── CE QUE CE MODULE REFUSE DE DIRE ────────────────────────────────────────
 * Il ne compte JAMAIS de « territoires perdus » à partir de règnes clos sans
 * distinguer la cause : `lost` (quelqu'un a pris) et `released` (le territoire
 * n'appartient plus à personne) ne racontent pas la même chose, et les
 * additionner produirait un chiffre qui a l'air précis et ne veut rien dire.
 *
 * Et il ne remonte pas avant le registre : l'histoire commence à la migration
 * `0109`. `firstKnownAtMs` existe pour que l'écran puisse dire « depuis le … »
 * au lieu de laisser croire qu'il connaît l'avant.
 */

/** Un règne tel que la RPC le rend (dates ISO, `endedAt` nul = en cours). */
export interface RawReign {
  readonly territoryId: string;
  readonly activity: string;
  readonly cityId: string | null;
  readonly areaM2: number;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly endedReason: string | null;
}

export interface Reign {
  readonly territoryId: string;
  readonly activity: string;
  readonly cityId: string | null;
  readonly areaM2: number;
  readonly startedAtMs: number;
  /** `null` = EN COURS. */
  readonly endedAtMs: number | null;
  readonly endedReason: 'lost' | 'released' | null;
  /** Jours ENTIERS tenus (plancher). Un règne en cours compte jusqu'à `nowMs`. */
  readonly heldDays: number;
  readonly ongoing: boolean;
}

export interface TerritoryHistory {
  readonly reigns: readonly Reign[];
  /** Règnes EN COURS — ce que le joueur tient maintenant. */
  readonly holdingCount: number;
  /** Règnes terminés parce qu'un AUTRE a pris. Jamais mélangé avec `released`. */
  readonly lostCount: number;
  /** Règnes terminés sans nouveau propriétaire. */
  readonly releasedCount: number;
  /** Le plus long règne, en cours ou passé. `null` si aucun règne lisible. */
  readonly longestDays: number | null;
  /**
   * Début du plus ancien règne CONNU. `null` s'il n'y en a aucun.
   * ⚠ Ce n'est PAS « depuis quand le joueur joue » : le registre ne remonte pas
   * avant `0109`. L'écran doit dire « depuis le … », jamais « tu as commencé ».
   */
  readonly firstKnownAtMs: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO → ms, ou `null` si absent/illisible (jamais 0 : 0 serait une date). */
function msOf(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function reasonOf(raw: string | null): 'lost' | 'released' | null {
  return raw === 'lost' || raw === 'released' ? raw : null;
}

/**
 * Règnes bruts → histoire lisible. `nowMs` sert à mesurer les règnes EN COURS.
 *
 * Une ligne illisible (date absente ou invalide) est ÉCARTÉE, jamais réparée :
 * une date devinée deviendrait « ce quartier était à toi depuis le 1er janvier
 * 1970 ». Mieux vaut une ligne de moins qu'une ligne fausse.
 *
 * Un règne dont la fin PRÉCÈDE le début est écarté pour la même raison — c'est
 * un état impossible, donc une donnée à laquelle on ne peut pas se fier.
 */
export function buildTerritoryHistory(
  raw: readonly RawReign[],
  nowMs: number,
): TerritoryHistory {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const reigns: Reign[] = [];

  for (const r of raw ?? []) {
    const startedAtMs = msOf(r?.startedAt);
    if (startedAtMs === null) continue;

    const endedAtMs = msOf(r?.endedAt ?? null);
    if (endedAtMs !== null && endedAtMs < startedAtMs) continue;

    const area = typeof r.areaM2 === 'number' && Number.isFinite(r.areaM2) ? r.areaM2 : 0;
    if (area <= 0) continue; // un territoire sans surface n'a jamais existé

    const ongoing = endedAtMs === null;
    // Un règne en cours se mesure jusqu'à MAINTENANT ; un règne clos jusqu'à sa
    // fin. `max(0, …)` : une horloge en retard ne doit pas produire -3 jours.
    const jusqua = ongoing ? now : endedAtMs;
    const heldDays = Math.max(0, Math.floor((jusqua - startedAtMs) / MS_PER_DAY));

    reigns.push({
      territoryId: String(r.territoryId ?? ''),
      activity: String(r.activity ?? ''),
      cityId: typeof r.cityId === 'string' && r.cityId.length > 0 ? r.cityId : null,
      areaM2: area,
      startedAtMs,
      endedAtMs,
      endedReason: ongoing ? null : reasonOf(r?.endedReason ?? null),
      heldDays,
      ongoing,
    });
  }

  // Le plus récent d'abord — l'ordre de lecture d'une histoire.
  reigns.sort((a, b) => b.startedAtMs - a.startedAtMs);

  let holdingCount = 0;
  let lostCount = 0;
  let releasedCount = 0;
  let longestDays: number | null = null;
  let firstKnownAtMs: number | null = null;

  for (const reign of reigns) {
    if (reign.ongoing) holdingCount += 1;
    else if (reign.endedReason === 'lost') lostCount += 1;
    else if (reign.endedReason === 'released') releasedCount += 1;

    if (longestDays === null || reign.heldDays > longestDays) longestDays = reign.heldDays;
    if (firstKnownAtMs === null || reign.startedAtMs < firstKnownAtMs) {
      firstKnownAtMs = reign.startedAtMs;
    }
  }

  return { reigns, holdingCount, lostCount, releasedCount, longestDays, firstKnownAtMs };
}

/**
 * Le règne le plus long TERMINÉ — celui qui porte la phrase du produit
 * (« ce quartier était à toi de mars à septembre »). `null` si le joueur n'a
 * encore rien perdu : on ne raconte pas une fin qui n'a pas eu lieu.
 */
export function longestFinishedReign(history: TerritoryHistory): Reign | null {
  let best: Reign | null = null;
  for (const reign of history.reigns) {
    if (reign.ongoing) continue;
    if (best === null || reign.heldDays > best.heldDays) best = reign;
  }
  return best;
}
