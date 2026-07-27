/**
 * GRYD — UNE CONTESTATION RÉELLE DEVIENT UNE LIGNE « À DÉFENDRE ». Moteur PUR
 * (zéro React, zéro Supabase), testé sans réseau (`contestEvents.test.ts`).
 *
 * ─── POURQUOI CE MODULE EXISTE MAINTENANT, ET PAS AVANT ─────────────────────
 * Le groupe À DÉFENDRE de la planche E23 est resté VIDE tant qu'aucune source
 * réelle ne l'alimentait : fabriquer « Saint-Rémy contesté par Nina M. » aurait
 * été exactement le mensonge que la constitution interdit. Ce n'est plus le cas.
 * `public.territory_contests` (0078) existe, `ingest_run` OUVRE des
 * contestations (contest_wiring), et une ligne de cette table EST un événement
 * tactique réel, daté, qui concerne son propriétaire. Ce module transforme cette
 * ligne — et rien d'autre — en `ActivityEvent`.
 *
 * ─── LES TROIS FILTRES, ET CE QUE CHACUN ÉVITE ──────────────────────────────
 * 1. LE CAMP. La policy `territory_contests_select_parties` (0078 §4) m'ouvre
 *    les contestations des DEUX camps : celles que je SUBIS **et** celles que
 *    J'AI LANCÉES. Une attaque que je mène n'est pas une zone « à défendre » —
 *    la compter alarmerait le joueur pour son propre assaut. On ne garde donc
 *    que les contestations qui visent MES territoires. Le tri est refait ICI, en
 *    pur, exactement comme `premium/analytics/derive.ts` : ce que la RLS ouvre
 *    et ce que l'écran doit montrer sont deux questions différentes.
 * 2. LE STATUT. Seul `'active'` est une défense EN COURS. `'defended'`,
 *    `'transferred'`, `'cancelled'` sont de l'histoire : rien à défendre.
 * 3. LES DATES LISIBLES. `started_at` ordonne la ligne, `expires_at` la fait
 *    DISPARAÎTRE seule à l'échéance (règle 3 du flux E23). Si l'une des deux est
 *    illisible, on ne produit AUCUN événement : un événement sans échéance ne se
 *    retirerait jamais (il alarmerait indéfiniment), et un événement sans date
 *    d'ouverture s'afficherait « il y a NaN ». Perdre une ligne est honnête ;
 *    en afficher une fausse ne l'est pas.
 *
 * ─── CE QU'ON NE DEMANDE PAS AU SERVEUR, DONC CE QU'ON NE PEUT PAS DIRE ─────
 * Ni `attacker_id` ni `attacker_type` (même mesure qu'en `analytics/read.ts`) :
 * la RLS me les rendrait, mais le camp qui défend a le droit de savoir qu'il est
 * attaqué, pas d'en tirer une fiche de renseignement (§12). Conséquence assumée
 * et VISIBLE : la ligne ne peut pas nommer l'assaillant. Elle ne le nomme donc
 * pas — plutôt que de fabriquer un nom pour ressembler à la planche.
 *
 * ─── AUCUN NOMBRE MAGIQUE ───────────────────────────────────────────────────
 * Pas un seuil de jeu ici : ni les 60 % d'intersection, ni les fenêtres de
 * fortification. `expires_at` est un INSTANT déjà calculé serveur par
 * `contestDeadline` depuis `game-rules`. Ce module lit une date, il n'en dérive
 * aucune.
 */
import type { ActivityEvent } from './activityFeed';

/**
 * Colonnes de `public.territory_contests` réellement lues pour le flux. La
 * liste vit ICI, à côté de son interprétation, pour qu'un ajout de colonne au
 * `select` soit forcément un ajout raisonné — et pas une fuite par distraction.
 */
export const CONTEST_FEED_COLUMNS = 'id, territory_id, status, started_at, expires_at';

/** Une ligne `territory_contests` telle que le `select` ci-dessus la rend. */
export interface FeedContestRow {
  readonly id: string;
  readonly territory_id: string;
  /** 'active' | 'defended' | 'transferred' | 'cancelled' (0078). */
  readonly status: string;
  /** ISO 8601 — ouverture de la contestation. */
  readonly started_at: string | null;
  /** ISO 8601 — échéance de la fenêtre de défense (§9.1/§9.2). */
  readonly expires_at: string | null;
}

/**
 * `territory_contests` → événements « À DÉFENDRE ».
 *
 * @param rows           lignes rendues par le serveur (les DEUX camps, cf. §1)
 * @param myTerritoryIds identifiants des territoires dont JE suis propriétaire
 *
 * Ne prend PAS `nowMs` : la péremption n'est pas décidée ici mais au rendu, par
 * `liveEvents`/`actionableCount` avec l'horloge de l'écran. Un événement mis en
 * cache reste ainsi exact quand le temps passe, au lieu d'être figé à l'instant
 * de sa lecture.
 */
export function defendEventsFromContests(
  rows: readonly FeedContestRow[],
  myTerritoryIds: ReadonlySet<string>,
): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const row of rows) {
    // 2. Seule une contestation OUVERTE se défend.
    if (row.status !== 'active') continue;
    // 1. Seules celles qui visent MES territoires me concernent en défense.
    if (!myTerritoryIds.has(row.territory_id)) continue;
    // 3. Deux dates lisibles, sinon aucune ligne.
    const startedAtMs = row.started_at === null ? NaN : Date.parse(row.started_at);
    const expiresAtMs = row.expires_at === null ? NaN : Date.parse(row.expires_at);
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(expiresAtMs)) continue;
    out.push({
      // Préfixé : `contest:` et `badge:` ne peuvent pas se télescoper dans une
      // même liste, quelle que soit la forme des identifiants serveur.
      id: `contest:${row.id}`,
      group: 'defend',
      createdAtMs: startedAtMs,
      // ACTIONNABLE : c'est une décision qu'on demande au joueur (courir pour
      // défendre). C'est cette ligne — et pas un badge débloqué — que compte le
      // badge de la cloche.
      actionable: true,
      // L'échéance fait le ménage toute seule : passée, la ligne quitte le flux
      // et le compte de la cloche, sans qu'aucun écran ait à s'en souvenir.
      expiresAtMs,
    });
  }
  return out;
}
