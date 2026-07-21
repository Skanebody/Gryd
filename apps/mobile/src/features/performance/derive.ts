/**
 * GRYD — cœur PUR de la page Performance : des VRAIES courses → des chiffres.
 *
 * ─── POURQUOI CE FICHIER EXISTE (21/07/2026) ─────────────────────────────────
 * `/performance` rendait `features/performance/demo.ts` SANS AUCUNE GARDE. Un
 * compte neuf, zéro course, lisait « Score Forme 78 », « 3 courses · 18,4 km »,
 * un record « 5 km 26:40 », un plus long parcours « République » et un Impact
 * GRYD de 12 zones défendues. Pas une seule de ces lignes ne lui appartenait.
 * Le bandeau « données de démonstration » ne rachetait rien : le joueur lit des
 * chiffres, pas une note de bas de page.
 *
 * Ici, tout descend de `runs` — la table écrite par ingest_run à partir des
 * courses RÉELLEMENT ingérées, lue par le joueur avec sa propre session (policy
 * RLS `runs_select_own`). Aucune valeur n'est inventée, et ce qui n'a pas de
 * source ne sort pas d'ici :
 *
 *  · SCORE FORME — la colonne `user_stats.forme_score` existe (0009) mais AUCUN
 *    code ne l'écrit jamais (engine/badges.ts : « mises à jour par leurs jobs »,
 *    jobs inexistants). Elle vaut 0 pour tout le monde, à vie. Un « Score Forme
 *    0/100 » serait aussi faux qu'un 78 inventé — donc pas de Score Forme.
 *  · IMPACT GRYD (zones tenues / défendues / frontières / routes) — pas de
 *    source par-joueur fiable sans re-lire `hex_claims` ; c'est déjà le module
 *    Territoire du profil. On ne le duplique pas en le devinant.
 *  · OBJECTIF HEBDO — le joueur n'a jamais fixé d'objectif. « 3/4 » était une
 *    cible fabriquée qui pouvait le mettre en échec sur une consigne qu'il n'a
 *    pas donnée.
 *
 * Module PUR : aucun import React/RN/réseau, horloge INJECTÉE (`now`) — donc
 * testable et déterministe. Le formatage d'affichage (séparateur décimal,
 * langue) reste à l'écran : ici on ne produit que des nombres.
 */
import { weekKey } from '@klaim/shared';

/** Colonnes de `runs` réellement lues (cf. 0002_schema.sql). */
export interface RunRow {
  started_at: string;
  distance_m: number;
  duration_s: number;
  avg_pace_s_km: number | null;
  status: string;
  gps_trust: number | null;
  motion_trust: number | null;
  step_count: number | null;
}

/**
 * Statuts qui COMPTENT comme une course courue — mêmes que la série
 * (`streak.ts`) et que le moteur : 'partial' a eu des segments écartés, mais le
 * joueur a bien couru. 'flagged'/'rejected' ne construisent rien.
 */
const COUNTED = new Set(['valid', 'partial']);

/** Nombre de semaines du mini-graph (UNE courbe, §A — pas 15 graphiques). */
export const TREND_WEEKS = 4;

const MS_PER_WEEK = 7 * 86_400_000;

export interface WeekTotals {
  /** Courses comptabilisées sur la semaine. */
  runs: number;
  /** Distance cumulée (m). */
  distanceM: number;
  /** Durée cumulée (s). */
  durationS: number;
  /**
   * Allure moyenne PONDÉRÉE PAR LA DISTANCE (s/km), ou null si la semaine ne
   * porte aucun kilomètre. Moyenner des allures à la main surpondérerait les
   * courses courtes — l'allure d'une semaine, c'est temps total / distance
   * totale.
   */
  paceSKm: number | null;
}

export interface TrendWeek extends WeekTotals {
  /** Clé de semaine (lundi ISO, cf. weekKey). */
  key: string;
  /** 0 = semaine en cours, 1 = la précédente… */
  weeksAgo: number;
}

/** Un record personnel — toujours accompagné de la course qui l'a produit. */
export interface RealRecord {
  /** Valeur brute (m, s ou s/km selon le record). */
  value: number;
  /** Distance de la course concernée (m) — contexte, jamais décoratif. */
  distanceM: number;
  /** Départ de la course (ISO) pour dater le record. */
  startedAt: string;
}

export interface VerifySummary {
  /**
   * Part des courses INGÉRÉES qui ont capturé sans réserve (statut 'valid') sur
   * l'ensemble des courses ingérées, tous statuts confondus. C'est une mesure,
   * pas une note : 100 % est l'état normal d'un GPS propre.
   */
  reliablePct: number;
  /** Total de courses ingérées (dénominateur affiché au besoin). */
  totalRuns: number;
  /** Signaux réellement présents en base sur ces courses. */
  channels: { gps: boolean; motion: boolean; steps: boolean };
}

export interface RealPerformance {
  /** Courses comptabilisées, toutes périodes — 0 = compte neuf. */
  countedRuns: number;
  /** Semaine en cours (peut être entièrement à zéro : c'est une vérité). */
  week: WeekTotals;
  /** Les TREND_WEEKS dernières semaines, de la plus ancienne à la courante. */
  trend: readonly TrendWeek[];
  /**
   * Variation de distance vs la semaine précédente (%), ou null si la semaine
   * précédente était vide — on ne divise pas par zéro pour fabriquer un « +∞ ».
   */
  distancePct: number | null;
  /**
   * Secondes/km gagnées entre l'allure de la semaine et celle des semaines
   * précédentes du graph. Positif = plus rapide. null si l'une des deux manque.
   */
  paceGainSKm: number | null;
  /** Semaines consécutives avec au moins une course (0 = série éteinte). */
  regularityWeeks: number;
  /** Records — null tant qu'aucune course ne les fonde. */
  records: {
    longestDistance: RealRecord | null;
    longestDuration: RealRecord | null;
    bestPace: RealRecord | null;
  };
  /** null = aucune course ingérée : rien à dire sur la fiabilité. */
  verify: VerifySummary | null;
}

/** Totaux d'un paquet de courses (allure = temps total / distance totale). */
function totals(runs: readonly RunRow[]): WeekTotals {
  let distanceM = 0;
  let durationS = 0;
  for (const r of runs) {
    distanceM += Math.max(0, r.distance_m);
    durationS += Math.max(0, r.duration_s);
  }
  return {
    runs: runs.length,
    distanceM,
    durationS,
    paceSKm: distanceM > 0 ? Math.round((durationS / distanceM) * 1000) : null,
  };
}

/**
 * Semaines consécutives avec au moins une course. La semaine EN COURS n'étant
 * pas finie, son absence ne casse pas la série : on démarre le décompte à la
 * semaine précédente dans ce cas (même clémence que le moteur de série).
 */
function regularity(weeksWithRuns: ReadonlySet<string>, now: Date): number {
  const nowMs = now.getTime();
  const keyAt = (weeksAgo: number) => weekKey(new Date(nowMs - weeksAgo * MS_PER_WEEK));
  let start = 0;
  if (!weeksWithRuns.has(keyAt(0))) start = 1;
  let count = 0;
  for (let i = start; ; i += 1) {
    if (!weeksWithRuns.has(keyAt(i))) break;
    count += 1;
    // Garde-fou : la série ne peut pas dépasser l'historique lu.
    if (count > weeksWithRuns.size) break;
  }
  return count;
}

/**
 * Dérive la page Performance des courses du joueur.
 *
 * @param rows courses lues (tous statuts — la fiabilité a besoin du dénominateur)
 * @param now horloge injectée
 */
export function derivePerformance(rows: readonly RunRow[], now: Date): RealPerformance {
  const counted = rows.filter((r) => COUNTED.has(r.status));

  // ── Regroupement par semaine ────────────────────────────────────────────────
  const byWeek = new Map<string, RunRow[]>();
  for (const r of counted) {
    const at = new Date(r.started_at);
    if (Number.isNaN(at.getTime())) continue;
    const key = weekKey(at);
    if (!key) continue;
    const bucket = byWeek.get(key);
    if (bucket) bucket.push(r);
    else byWeek.set(key, [r]);
  }

  const nowMs = now.getTime();
  const trend: TrendWeek[] = [];
  for (let weeksAgo = TREND_WEEKS - 1; weeksAgo >= 0; weeksAgo -= 1) {
    const key = weekKey(new Date(nowMs - weeksAgo * MS_PER_WEEK));
    trend.push({ key, weeksAgo, ...totals(byWeek.get(key) ?? []) });
  }
  // trend est construit du plus ancien (TREND_WEEKS-1) au plus récent (0) :
  // le dernier élément est TOUJOURS la semaine en cours.
  const week = trend[trend.length - 1] ?? totals([]);
  const previous = trend[trend.length - 2] ?? null;

  const distancePct =
    previous && previous.distanceM > 0
      ? Math.round(((week.distanceM - previous.distanceM) / previous.distanceM) * 100)
      : null;

  // Allure de référence = les semaines PRÉCÉDENTES du graph agrégées (une seule
  // semaine de comparaison serait trop bruyante pour parler de progression).
  const priorRuns = trend
    .slice(0, -1)
    .flatMap((w) => byWeek.get(w.key) ?? []);
  const priorPace = totals(priorRuns).paceSKm;
  const paceGainSKm =
    week.paceSKm !== null && priorPace !== null ? priorPace - week.paceSKm : null;

  // ── Records (sur tout l'historique lu) ──────────────────────────────────────
  let longestDistance: RealRecord | null = null;
  let longestDuration: RealRecord | null = null;
  let bestPace: RealRecord | null = null;
  for (const r of counted) {
    const base = { distanceM: r.distance_m, startedAt: r.started_at };
    if (!longestDistance || r.distance_m > longestDistance.value) {
      longestDistance = { value: r.distance_m, ...base };
    }
    if (!longestDuration || r.duration_s > longestDuration.value) {
      longestDuration = { value: r.duration_s, ...base };
    }
    // avg_pace_s_km est NULLABLE en base (colonne optionnelle) : on ne le
    // recalcule pas nous-mêmes, on ignore la course pour ce record.
    if (r.avg_pace_s_km !== null && r.avg_pace_s_km > 0) {
      if (!bestPace || r.avg_pace_s_km < bestPace.value) {
        bestPace = { value: r.avg_pace_s_km, ...base };
      }
    }
  }
  // Un record de 0 m / 0 s n'est pas un record : c'est une course vide.
  if (longestDistance && longestDistance.value <= 0) longestDistance = null;
  if (longestDuration && longestDuration.value <= 0) longestDuration = null;

  // ── GRYD Verify ─────────────────────────────────────────────────────────────
  const verify: VerifySummary | null =
    rows.length > 0
      ? {
          reliablePct: Math.round(
            (rows.filter((r) => r.status === 'valid').length / rows.length) * 100,
          ),
          totalRuns: rows.length,
          channels: {
            gps: rows.some((r) => r.gps_trust !== null),
            motion: rows.some((r) => r.motion_trust !== null),
            steps: rows.some((r) => r.step_count !== null),
          },
        }
      : null;

  return {
    countedRuns: counted.length,
    week,
    trend,
    distancePct,
    paceGainSKm,
    regularityWeeks: regularity(new Set(byWeek.keys()), now),
    records: { longestDistance, longestDuration, bestPace },
    verify,
  };
}
