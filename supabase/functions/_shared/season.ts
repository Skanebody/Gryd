/**
 * GRYD — PROGRESSION DE SAISON (moteur PUR, partagé).
 *
 * Hébergé dans `shared` (et non `engine`) pour la MÊME raison que `streak.ts` /
 * `habits.ts` : le mobile doit l'importer sans tirer h3-js dans le bundle Metro
 * — ce fichier n'importe RIEN (arithmétique de dates pure, aucune constante de
 * jeu). Il est copié tel quel en `supabase/functions/_shared/season.ts` par
 * `scripts/sync-game-rules.mjs` (drift testé), et c'est cette copie qu'un test
 * Deno exécute.
 *
 * ── CE QU'IL FAIT, ET CE QU'IL NE FAIT JAMAIS ──────────────────────────────────
 * À partir des BORNES RÉELLES d'une saison (`startsAt`, `ends_at`) et de l'heure
 * courante, il dérive la progression. Il ne DÉCIDE pas qu'une saison existe et
 * n'en INVENTE aucune date : c'est la RPC `season_current` qui lit la table
 * `seasons`, et le hook `useActiveSeason` qui distingue « active » de « aucune ».
 * Ici, on suppose déjà des bornes réelles en entrée ; la seule chose qu'on
 * garantit, c'est de ne jamais MENTIR sur ces bornes (jamais de jours négatifs
 * maquillés, jamais un pct hors [0,1], jamais une phase incohérente avec le temps).
 *
 * La phase est dérivée du TEMPS seul, pas du statut serveur : une saison encore
 * marquée `active` en base mais dont `ends_at` est passé (cron de clôture pas
 * encore repassé) rend `phase: 'ended'` — l'UI dit « en clôture » plutôt que
 * d'afficher un décompte négatif.
 */

/** Où en est une saison MAINTENANT, dérivé du temps seul. */
export type SeasonPhase =
  /** `now` est avant `startsAt` — la saison est annoncée mais pas commencée. */
  | 'upcoming'
  /** `startsAt` ≤ `now` < `endsAt` — la saison court. */
  | 'active'
  /** `now` ≥ `endsAt` — la saison est arrivée à terme (clôture/intersaison). */
  | 'ended';

export interface SeasonProgress {
  /** Fraction ÉCOULÉE dans [0,1] : 0 avant le début, 1 une fois terminée. */
  pct: number;
  /**
   * Jours PLEINS restants avant `endsAt` (arrondi au supérieur : « il reste
   * 3 jours » tant que les 3 dernières journées ne sont pas entamées). Borné à
   * 0 dès que l'échéance est atteinte ou dépassée — jamais de nombre négatif.
   */
  joursRestants: number;
  /** Phase courante, dérivée du temps (voir SeasonPhase). */
  phase: SeasonPhase;
}

/** Un instant accepté en entrée : ISO string, ms epoch, ou Date. */
export type SeasonInstant = string | number | Date;

const MS_PER_DAY = 86_400_000; // unité de temps universelle, pas une constante de jeu

/** Normalise un instant en ms epoch, ou `null` s'il est illisible. */
function toMs(value: SeasonInstant): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/**
 * Progression d'une saison à un instant donné. TOTALE et défensive : si une
 * borne est illisible ou incohérente (`endsAt` ≤ `startsAt`), on retombe sur un
 * état neutre plutôt que de produire un NaN à l'écran — mais on ne fabrique
 * jamais une fenêtre : c'est à l'appelant de ne pas nous passer de saison
 * fantôme.
 *
 * @param startsAt début de la saison (borne réelle, lue en base).
 * @param endsAt   fin de la saison (borne réelle, lue en base).
 * @param now      instant d'évaluation (défaut : maintenant).
 */
export function seasonProgress(
  startsAt: SeasonInstant,
  endsAt: SeasonInstant,
  now: SeasonInstant = Date.now(),
): SeasonProgress {
  const startMs = toMs(startsAt);
  const endMs = toMs(endsAt);
  const nowMs = toMs(now);

  // Entrée illisible : on ne devine pas. « Rien de sûr » se rend comme une
  // saison à l'arrêt (pct 0, 0 jour), jamais comme un décompte inventé.
  if (startMs === null || endMs === null || nowMs === null || endMs <= startMs) {
    return { pct: 0, joursRestants: 0, phase: 'upcoming' };
  }

  const phase: SeasonPhase =
    nowMs < startMs ? 'upcoming' : nowMs >= endMs ? 'ended' : 'active';

  const pct = clamp01((nowMs - startMs) / (endMs - startMs));

  // Jours restants jusqu'à la FIN, jamais négatifs. Arrondi au supérieur pour un
  // décompte « J-n » naturel ; 0 dès que la saison est terminée.
  const joursRestants = Math.max(0, Math.ceil((endMs - nowMs) / MS_PER_DAY));

  return { pct, joursRestants, phase };
}
