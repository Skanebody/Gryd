/**
 * GRYD — LE REGISTRE DES SAISONS D'UNE VILLE (moteur PUR, testable en Deno).
 *
 * ─── LE TROU QU'IL FERME ─────────────────────────────────────────────────────
 * La RPC `season_current` (0060) ne rend QUE la saison active. E59 demande
 * « historique saison précédente » et E61 « prochaine saison » : deux faits qui
 * vivent dans les AUTRES lignes de `seasons` (statut 'closed' / 'upcoming'), et
 * qu'aucun lecteur du dépôt ne dérivait. La table est lisible par tout compte
 * connecté (0003 : `seasons_select_all`), donc rien à ajouter côté serveur.
 *
 * ─── LE NUMÉRO DE SAISON EST DÉRIVÉ, JAMAIS STOCKÉ ───────────────────────────
 * Exactement comme 0060 le fait en SQL : le numéro d'une saison est son rang
 * 0-indexé dans SA ville, par ancienneté de `starts_at`. La première saison
 * d'une ville est « Saison 0 ». On refait ici la MÊME dérivation sur les lignes
 * lues — jamais un compteur local, jamais un « +1 » posé à la main.
 *
 * ─── CE QU'IL REFUSE DE FAIRE ────────────────────────────────────────────────
 *  · aucune saison inventée : sans ligne, tout rend `null` et l'écran dit
 *    « aucune saison terminée » (état NORMAL aujourd'hui — la base est vide) ;
 *  · aucune ligne réparée : bornes illisibles ou désordonnées (`endsAt` ≤
 *    `startsAt`), statut inconnu ⇒ la ligne est ÉCARTÉE, pas rafistolée ;
 *  · aucune ville mélangée : le filtre par ville est la responsabilité de
 *    l'appelant (la RLS de `seasons` autorise la lecture de TOUTES les villes),
 *    et `assertSingleCity` rend le mélange détectable plutôt que silencieux.
 */

/** Statuts RÉELS de `seasons` (0002 + 0006) — aucun autre n'est accepté. */
export const SEASON_STATUSES = ['upcoming', 'active', 'closed', 'reset'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

/** Une ligne `seasons` validée. Bornes ISO brutes, jamais reformatées ici. */
export interface SeasonLedgerRow {
  seasonId: string;
  cityId: string;
  startsAt: string;
  endsAt: string;
  status: SeasonStatus;
  /** Rang 0-indexé dans la ville (= « Saison {number} »), dérivé par `seasonLedger`. */
  number: number;
}

function isStatus(value: unknown): value is SeasonStatus {
  return typeof value === 'string' && (SEASON_STATUSES as readonly string[]).includes(value);
}

/**
 * Une ligne brute PostgREST → ligne validée SANS numéro (il se dérive du lot).
 * `null` dès qu'un champ manque ou qu'une fenêtre est incohérente : une saison à
 * moitié lisible n'est pas affichable.
 */
export function parseSeasonRow(raw: unknown): Omit<SeasonLedgerRow, 'number'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const seasonId = typeof row.id === 'string' ? row.id : null;
  const cityId = typeof row.city_id === 'string' ? row.city_id : null;
  const startsAt = typeof row.starts_at === 'string' ? row.starts_at : null;
  const endsAt = typeof row.ends_at === 'string' ? row.ends_at : null;
  if (!seasonId || !cityId || !startsAt || !endsAt || !isStatus(row.status)) return null;

  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

  return { seasonId, cityId, startsAt, endsAt, status: row.status };
}

/**
 * Le registre d'UNE ville : lignes valides, triées par `starts_at` croissant,
 * numérotées comme le fait 0060. À égalité de `starts_at` le rang est PARTAGÉ
 * (même choix que la RPC : deux « Saison 3 » restent honnêtes, un numéro
 * fabriqué ne l'est pas).
 */
export function seasonLedger(raws: readonly unknown[]): SeasonLedgerRow[] {
  const parsed = raws
    .map(parseSeasonRow)
    .filter((r): r is Omit<SeasonLedgerRow, 'number'> => r !== null)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  return parsed.map((row) => ({
    ...row,
    // Rang 0-indexé = nombre de saisons STRICTEMENT antérieures (cf. 0060).
    number: parsed.filter((other) => Date.parse(other.startsAt) < Date.parse(row.startsAt)).length,
  }));
}

/**
 * La dernière saison TERMINÉE — celle dont E59 montre le souvenir et dont E61
 * fait le bilan. 'closed' ET 'reset' comptent : une saison dont la carte a déjà
 * été effacée reste une saison terminée (le rang final, lui, est gelé dans
 * `season_scores.rank_cache`). `null` si aucune ne l'est — l'état NORMAL
 * aujourd'hui, jamais un repli.
 */
export function lastClosedSeason(ledger: readonly SeasonLedgerRow[]): SeasonLedgerRow | null {
  let best: SeasonLedgerRow | null = null;
  for (const row of ledger) {
    if (row.status !== 'closed' && row.status !== 'reset') continue;
    if (best === null || Date.parse(row.endsAt) > Date.parse(best.endsAt)) best = row;
  }
  return best;
}

/**
 * La saison qui SUIT une saison donnée dans la même ville : la première dont le
 * `starts_at` est postérieur. `null` quand elle n'existe pas encore en base —
 * et alors l'écran dit « la date d'ouverture n'est pas encore fixée » plutôt
 * que d'ajouter des jours d'intersaison à une date de fin pour se donner l'air
 * de savoir.
 */
export function nextSeasonAfter(
  ledger: readonly SeasonLedgerRow[],
  season: SeasonLedgerRow,
): SeasonLedgerRow | null {
  const from = Date.parse(season.startsAt);
  let best: SeasonLedgerRow | null = null;
  for (const row of ledger) {
    if (Date.parse(row.startsAt) <= from) continue;
    if (best === null || Date.parse(row.startsAt) < Date.parse(best.startsAt)) best = row;
  }
  return best;
}

/**
 * Le registre ne contient-il qu'UNE ville ? Le filtre `.eq('city_id', …)` est
 * côté requête ; ce garde-fou rend un mélange DÉTECTABLE (l'appelant refuse
 * alors d'afficher) au lieu de laisser une saison d'une autre ville passer pour
 * la mienne. `true` sur un registre vide : rien à mélanger.
 */
export function assertSingleCity(ledger: readonly SeasonLedgerRow[]): boolean {
  const first = ledger[0];
  if (first === undefined) return true;
  return ledger.every((row) => row.cityId === first.cityId);
}
