/**
 * ⚠ CE MODULE VIT DANS `shared`, PAS DANS `engine` — déplacé le 21/07/2026.
 * Raison : le mobile doit l'utiliser (série affichée), or importer `@klaim/engine`
 * depuis l'app tire TOUT le barrel — dont `badges.ts` et h3-js — dans le bundle
 * Metro, et casse la résolution des sous-chemins (le repo documente déjà ce
 * piège dans crew/real.ts, rules.ts, raid.ts, qui MIROITENT la logique faute de
 * pouvoir l'importer). Comme ce calcul ne dépend QUE de constantes (aucune
 * géométrie), sa place naturelle est `shared` : une seule source de vérité,
 * consommable par le mobile ET le serveur, sans duplication ni h3-js.
 *
 * GRYD — engine/streak.ts : la SÉRIE hebdomadaire (§3.4), moteur PUR.
 *
 * Constat de l'audit (21/07/2026) : les constantes STREAK_* existaient, le
 * multiplicateur `streakMultiplier()` existait, `users.streak_weeks` existait —
 * mais AUCUN code n'écrivait jamais cette colonne. La série valait donc 0 pour
 * tout le monde, à vie, et le multiplicateur ×1,0. Ce module comble le trou : il
 * DÉRIVE la série des courses réellement enregistrées, sans jamais l'inventer.
 *
 * Règle (game-rules) : une semaine est VALIDÉE dès STREAK_MIN_RUNS_PER_WEEK
 * courses comptabilisées. La série = le nombre de semaines validées CONSÉCUTIVES
 * qui se terminent à la semaine courante (si déjà validée) ou à la précédente.
 *
 * Gel de série (streak_gels, migration 0024) : une semaine COUVERTE par un gel
 * actif ne casse pas la chaîne — elle est traversée sans être comptée comme
 * validée (le gel protège, il ne fabrique pas de série).
 *
 * PURE : aucune I/O, aucune horloge implicite (`now` est un paramètre), aucun
 * nombre magique (tout vient de @klaim/shared/game-rules).
 *
 * ANTI-SHAME (§11) : le moteur ne rend jamais un jugement, seulement un `status`
 * factuel. `'none'` signifie « rien à afficher » — l'UI n'affiche alors RIEN,
 * surtout pas un « 0 ».
 */
import {
  STREAK_MIN_RUNS_PER_WEEK,
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
} from './game-rules';

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Début de la semaine ISO (lundi 00:00 UTC) contenant `at`. PURE.
 * UTC partout : la semaine de jeu est la même pour tous les joueurs, on ne
 * dépend pas du fuseau du téléphone (deux appareils ne doivent jamais afficher
 * deux séries différentes pour les mêmes courses).
 */
export function weekStartUtc(at: Date): number {
  const ms = at.getTime();
  if (!Number.isFinite(ms)) return Number.NaN;
  const d = new Date(ms);
  // getUTCDay : 0 = dimanche → on ramène à un index lundi=0.
  const mondayIndex = (d.getUTCDay() + 6) % 7;
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return midnight - mondayIndex * MS_PER_DAY;
}

/** Clé lisible et stable d'une semaine ('YYYY-MM-DD' du lundi UTC). PURE. */
export function weekKey(at: Date): string {
  const start = weekStartUtc(at);
  return Number.isFinite(start) ? new Date(start).toISOString().slice(0, 10) : '';
}

export interface StreakInput {
  /**
   * Dates de départ des courses COMPTABILISÉES (statut 'valid' ou 'partial' —
   * un rejet ne construit pas de série). Ordre libre, doublons tolérés :
   * chaque entrée compte pour une course.
   */
  readonly runStartedAt: readonly Date[];
  /** Horloge injectée (jamais Date.now() implicite). */
  readonly now: Date;
  /**
   * Semaines couvertes par un gel de série actif, en clés `weekKey`. Facultatif :
   * si l'appelant ne câble pas les gels, on ne fait PAS semblant — aucune semaine
   * n'est protégée.
   */
  readonly frozenWeekKeys?: readonly string[];
}

/**
 * État de la série. `status` décrit une SITUATION, jamais une valeur morale :
 *  - 'none'     : aucune course comptabilisée dans l'historique fourni → l'UI
 *                 n'affiche RIEN (ni « 0 », ni « série perdue »).
 *  - 'building' : des courses cette semaine, pas encore de semaine validée.
 *  - 'active'   : semaine courante DÉJÀ validée, série ≥ 1.
 *  - 'atRisk'   : série ≥ 1 acquise, semaine courante pas encore validée.
 *  - 'frozen'   : semaine courante couverte par un gel actif (protégée).
 *  - 'broken'   : une série a existé (`best` ≥ 1), elle ne court plus.
 */
export type StreakStatus = 'none' | 'building' | 'active' | 'atRisk' | 'frozen' | 'broken';

export interface StreakState {
  readonly status: StreakStatus;
  /**
   * Semaines consécutives AFFICHÉES — un gel enjambe une semaine ratée.
   * Sert la motivation (anti-shame), JAMAIS le calcul des points.
   */
  readonly weeks: number;
  /**
   * Semaines consécutives réellement COURUES — un gel n'enjambe pas.
   * SEULE entrée de `streakMultiplier` : l'argent n'achète aucun point.
   */
  readonly scoringWeeks: number;
  /** Multiplicateur de points correspondant (cap STREAK_MULTIPLIER_CAP). */
  readonly multiplier: number;
  /** Courses comptabilisées dans la semaine courante. */
  readonly runsThisWeek: number;
  /** Courses restantes pour valider la semaine courante (0 si déjà validée). */
  readonly runsToValidate: number;
  /** Meilleure série jamais atteinte sur l'historique fourni. */
  readonly best: number;
  /** La semaine courante est-elle couverte par un gel actif. */
  readonly frozen: boolean;
}

const EMPTY: StreakState = {
  status: 'none',
  weeks: 0,
  scoringWeeks: 0,
  multiplier: 1,
  runsThisWeek: 0,
  runsToValidate: STREAK_MIN_RUNS_PER_WEEK,
  best: 0,
  frozen: false,
};

/**
 * Multiplicateur de régularité (§3.4) : +STREAK_MULTIPLIER_STEP par semaine
 * consécutive validée (0 → ×1), plafonné à STREAK_MULTIPLIER_CAP.
 *
 * SEULE DÉFINITION du multiplicateur dans tout le repo (21/07). Elle vivait
 * dans `engine/scoring.ts` — qui l'importe désormais d'ici — et une copie
 * privée `multiplierFor` avait été ajoutée ici en parallèle : deux formules
 * pour un même chiffre, c'est une divergence en attente. Elle est exportée
 * parce que l'écran de résultat du mobile l'affiche, et le mobile ne peut pas
 * importer `@klaim/engine` (h3-js + résolution Metro).
 *
 * NON pay-to-win : la régularité se gagne en courant, jamais en payant.
 */
export function streakMultiplier(streakWeeks: number): number {
  const raw = 1 + Math.max(0, streakWeeks) * STREAK_MULTIPLIER_STEP;
  return Math.min(raw, STREAK_MULTIPLIER_CAP);
}

/**
 * Longueur de la chaîne de semaines validées consécutives se terminant à
 * `endWeek` (inclus), en remontant. Une semaine gelée est TRAVERSÉE (ne casse
 * pas, ne compte pas). PURE.
 */
function chainEndingAt(
  endWeek: number,
  countByWeek: ReadonlyMap<number, number>,
  frozen: ReadonlySet<number>,
  earliestWeek: number,
  /**
   * Le gel enjambe-t-il une semaine manquée ? `true` pour la série AFFICHÉE,
   * `false` pour celle qui multiplie les POINTS. Voir `computeStreak`.
   */
  freezeBridges: boolean,
): number {
  let weeks = 0;
  for (let w = endWeek; w >= earliestWeek; w -= MS_PER_WEEK) {
    const validated = (countByWeek.get(w) ?? 0) >= STREAK_MIN_RUNS_PER_WEEK;
    if (validated) weeks += 1;
    else if (freezeBridges && frozen.has(w)) continue; // gel : la chaîne survit, sans crédit
    else break;
  }
  return weeks;
}

/**
 * Calcule l'état de la série à partir de l'historique réel. PURE.
 *
 * Historique vide → `status: 'none'` (et surtout pas « série de 0 ») : c'est la
 * règle « l'app ne ment jamais » appliquée au vide — on ne connaît rien, on
 * n'affiche rien.
 */
export function computeStreak(input: StreakInput): StreakState {
  const now = input.now;
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return EMPTY;

  const currentWeek = weekStartUtc(now);

  // Agrégation par semaine — on ignore les dates invalides et le futur (une
  // course « à venir » ne peut pas valider une semaine).
  const countByWeek = new Map<number, number>();
  let earliestWeek = currentWeek;
  let total = 0;
  for (const at of input.runStartedAt) {
    const ms = at instanceof Date ? at.getTime() : Number.NaN;
    if (!Number.isFinite(ms) || ms > nowMs) continue;
    const w = weekStartUtc(at);
    countByWeek.set(w, (countByWeek.get(w) ?? 0) + 1);
    if (w < earliestWeek) earliestWeek = w;
    total += 1;
  }

  if (total === 0) return EMPTY;

  const frozen = new Set<number>();
  for (const key of input.frozenWeekKeys ?? []) {
    const ms = Date.parse(`${key}T00:00:00.000Z`);
    if (Number.isFinite(ms)) frozen.add(weekStartUtc(new Date(ms)));
  }

  const runsThisWeek = countByWeek.get(currentWeek) ?? 0;
  const thisWeekValidated = runsThisWeek >= STREAK_MIN_RUNS_PER_WEEK;
  const isFrozen = frozen.has(currentWeek);

  // La série COURANTE se termine à la semaine en cours si elle est validée (ou
  // gelée), sinon à la précédente : une semaine encore ouverte ne pénalise pas.
  // ─── DEUX CHAÎNES, ET C'EST VOLONTAIRE (correctif anti-pay-to-win 21/07) ───
  // Un gel est achetable avec des Éclats, eux-mêmes achetables en argent réel.
  // S'il ENJAMBAIT la coupure pour la série qui multiplie les points, la chaîne
  // d'avant le trou continuerait de compter : payer 60 Éclats transformerait un
  // ×1,0 en ×1,4. Ce sont des points de classement, pas du cosmétique — donc du
  // pay-to-win, interdit par la constitution du projet.
  //   • `weeks`        — série AFFICHÉE : le gel enjambe. C'est son vrai rôle,
  //     anti-shame : ne pas voir sa série remise à zéro pour une semaine ratée.
  //   • `scoringWeeks` — série qui MULTIPLIE : le gel n'enjambe pas. Seules les
  //     semaines réellement courues comptent. L'argent n'achète aucun point.
  const endWeek = thisWeekValidated || isFrozen ? currentWeek : currentWeek - MS_PER_WEEK;
  const weeks = chainEndingAt(endWeek, countByWeek, frozen, earliestWeek, true);
  const scoringWeeks = chainEndingAt(endWeek, countByWeek, frozen, earliestWeek, false);

  // Meilleure série de l'historique : chaîne maximale terminée sur n'importe
  // quelle semaine passée (bornée par earliestWeek → coût linéaire borné).
  let best = weeks;
  for (let w = currentWeek; w >= earliestWeek; w -= MS_PER_WEEK) {
    if ((countByWeek.get(w) ?? 0) < STREAK_MIN_RUNS_PER_WEEK) continue;
    const chain = chainEndingAt(w, countByWeek, frozen, earliestWeek, true);
    if (chain > best) best = chain;
  }

  const status: StreakStatus = isFrozen && !thisWeekValidated
    ? 'frozen'
    : weeks > 0
      ? (thisWeekValidated ? 'active' : 'atRisk')
      : best > 0
        ? 'broken'
        : 'building';

  return {
    status,
    weeks,
    scoringWeeks,
    multiplier: streakMultiplier(scoringWeeks),
    runsThisWeek,
    runsToValidate: Math.max(0, STREAK_MIN_RUNS_PER_WEEK - runsThisWeek),
    best,
    frozen: isFrozen,
  };
}
