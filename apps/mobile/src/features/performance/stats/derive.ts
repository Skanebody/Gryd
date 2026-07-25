/**
 * GRYD — E18 « Statistiques & data » : MOTEUR PUR (courses réelles → tendances).
 *
 * ─── POURQUOI UN MOTEUR À CÔTÉ DE `performance/derive.ts` ───────────────────
 * L'ancien moteur ne sait faire qu'UNE chose : la semaine ISO en cours + quatre
 * semaines de tendance. La planche E18 demande trois autres lectures qu'il ne
 * porte pas et ne peut pas porter sans être réécrit :
 *   · une FENÊTRE choisie par le joueur (Semaine · Mois · Saison) ;
 *   · un histogramme par JOUR DE LA SEMAINE (« samedi est ton meilleur jour ») ;
 *   · l'IMPACT TERRITORIAL par semaine, qui vit dans `runs.celebration` — une
 *     colonne que `performance/real.ts` ne sélectionne même pas.
 * Le périmètre de ce chantier interdit de toucher `performance/derive.ts` (il
 * alimente encore `components.tsx`). On construit donc à côté, en assumant la
 * dette : les deux moteurs devront fusionner quand le périmètre le permettra.
 *
 * Module PUR : aucun import React / React Native / réseau, horloge INJECTÉE.
 * Il ne produit que des NOMBRES et des drapeaux — jamais de texte, jamais de
 * couleur : le formatage locale-aware et la DA restent à l'écran.
 *
 * ─── CE QU'IL REFUSE DE CALCULER (et pourquoi) ──────────────────────────────
 *  · La SURFACE TENUE DANS LE TEMPS. `hex_claims` ne garde que le propriétaire
 *    COURANT : une zone perdue disparaît sans laisser de trace, et aucune table
 *    n'historise les pertes. Une courbe reconstruite depuis les `claimed_at` des
 *    hexes tenus AUJOURD'HUI serait monotone croissante par construction — elle
 *    affirmerait qu'on n'a jamais rien perdu. Ce fichier ne mesure donc que le
 *    GAIN par semaine (zones prises), jamais un solde net.
 *  · Un compteur de captures « au mieux ». `celebration` peut manquer ou être
 *    tronquée : chaque compteur incertain vaut `null` et se propage en `null`.
 *    Un payload absent ne doit JAMAIS se lire « cette course n'a rien pris ».
 */
import { weekKey, weekStartUtc } from '@klaim/shared';

/** Colonnes de `runs` réellement lues par `useStats` (cf. 0002_schema.sql). */
export interface StatsRunRow {
  started_at: string;
  distance_m: number;
  status: string;
  /**
   * Durée de la course (s). Lue pour le RECORD « plus longtemps » (`records.ts`),
   * pas pour les trois blocs : ajoutée ici plutôt que d'ouvrir une SECONDE
   * lecture de `runs` — deux lectures du même joueur peuvent se contredire.
   */
  duration_s: number;
  /** Allure moyenne (s/km). NULLABLE en base : une course sans allure existe. */
  avg_pace_s_km: number | null;
  /** Payload serveur `IngestRunResponse` figé à l'ingestion — forme non garantie. */
  celebration: unknown;
}

/**
 * Statuts qui COMPTENT comme une course courue — mêmes que le moteur de série
 * et que `performance/derive.ts` : 'partial' a eu des segments écartés, mais le
 * joueur a bien couru. 'flagged'/'rejected' ne construisent rien.
 */
const COUNTED = new Set(['valid', 'partial']);

const MS_PER_WEEK = 7 * 86_400_000;

/**
 * Seuil d'AFFICHAGE (pas une constante de jeu — sa place n'est donc pas dans
 * `game-rules.ts`) : en dessous de deux courses sur la fenêtre, il n'y a pas de
 * « meilleur jour », juste une course isolée. On dit « pas encore de tendance »
 * plutôt que de peindre une conclusion à partir d'un seul point.
 */
export const MIN_RUNS_FOR_TRENDS = 2;

/**
 * Horizon des deux lectures HEBDOMADAIRES (gains territoriaux, régularité).
 * Elles ne suivent PAS le commutateur de période : une régularité ne se lit pas
 * sur sept jours, et une aire à un seul point n'est pas une aire. L'horizon est
 * donc écrit noir sur blanc dans la copie de chaque bloc — un écart de portée
 * assumé et déclaré, jamais masqué.
 */
export const WEEKLY_HORIZON_WEEKS = 12;

/**
 * Ce qui fait une semaine « active » sur la rangée de carrés. UNE course suffit :
 * le carré et la phrase de conclusion doivent dire EXACTEMENT la même chose
 * (« un message par graphique »), et un seuil à 2 peindrait en gris une semaine
 * où le joueur a réellement couru — un reproche déguisé en donnée.
 */
export const ACTIVE_WEEK_MIN_RUNS = 1;

/** Fenêtre de lecture choisie par le joueur. */
export type StatsPeriod = 'week' | 'month' | 'season';

export interface PeriodWindow {
  /** Début inclus (ms epoch). */
  startMs: number;
  /** Fin incluse (ms epoch) = maintenant. */
  endMs: number;
  /**
   * Fenêtre PRÉCÉDENTE de même nature, pour le delta. `null` = il n'y en a pas
   * de comparable : c'est le cas de la SAISON (la saison précédente n'est pas
   * une donnée que nous lisons — inventer une fenêtre équivalente avant le
   * début de saison et l'appeler « la saison dernière » serait un mensonge).
   */
  previous: { startMs: number; endMs: number } | null;
}

/**
 * Bornes de la fenêtre. Les semaines et les mois sont en UTC, comme le reste du
 * moteur GRYD (`weekStartUtc`) : deux téléphones dans deux fuseaux ne doivent
 * jamais lire deux semaines différentes pour les mêmes courses.
 *
 * @param seasonStartMs début RÉEL de la saison active (jamais fabriqué). `null`
 *                      quand aucune saison n'est lue — on retombe alors sur la
 *                      semaine plutôt que d'inventer une borne.
 */
export function periodWindow(
  now: Date,
  period: StatsPeriod,
  seasonStartMs: number | null,
): PeriodWindow {
  const endMs = now.getTime();
  if (period === 'week') {
    const startMs = weekStartUtc(now);
    return { startMs, endMs, previous: { startMs: startMs - MS_PER_WEEK, endMs: startMs - 1 } };
  }
  if (period === 'month') {
    const d = new Date(endMs);
    const startMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const prevStartMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1);
    return { startMs, endMs, previous: { startMs: prevStartMs, endMs: startMs - 1 } };
  }
  // Saison : bornes RÉELLES ou repli sur la semaine. Jamais de « saison
  // précédente » reconstruite.
  const startMs =
    seasonStartMs !== null && Number.isFinite(seasonStartMs) && seasonStartMs <= endMs
      ? seasonStartMs
      : weekStartUtc(now);
  return { startMs, endMs, previous: null };
}

/**
 * Zones PRISES par une course, lues dans le payload serveur `celebration`.
 * Même parseur défensif que `features/history/real.ts` : chaque composante doit
 * être lisible, sinon le total vaut `null`. Additionner en traitant une
 * composante manquante comme 0 sous-déclarerait la conquête.
 */
export function capturedOf(celebration: unknown): number | null {
  if (typeof celebration !== 'object' || celebration === null) return null;
  const hexes = (celebration as { hexes?: unknown }).hexes;
  if (typeof hexes !== 'object' || hexes === null) return null;
  const h = hexes as Record<string, unknown>;
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  const claimed = num(h.claimed);
  const stolen = num(h.stolen);
  const pioneer = num(h.pioneer);
  if (claimed === null || stolen === null || pioneer === null) return null;
  return claimed + stolen + pioneer;
}

/** Une colonne de l'histogramme : un jour de la semaine, lundi = 0. */
export interface DayBucket {
  /** 0 = lundi … 6 = dimanche (index d'AFFICHAGE, jamais `getDay()` brut). */
  index: number;
  distanceM: number;
  runs: number;
}

export interface VolumeStats {
  /** Courses comptabilisées SUR LA FENÊTRE. */
  runs: number;
  /** Distance cumulée sur la fenêtre (m). */
  distanceM: number;
  /**
   * Variation vs la fenêtre précédente (%), ou `null` : fenêtre précédente vide
   * (pas de division par zéro → jamais de « +∞ »), fenêtre courante vide (un
   * « −100 % » ne serait qu'un reproche), ou pas de fenêtre comparable (saison).
   */
  deltaPct: number | null;
  /** Toujours 7 entrées, lundi → dimanche. */
  days: readonly DayBucket[];
  /** Jour le plus couru, ou `null` si la fenêtre ne porte aucun kilomètre. */
  bestDayIndex: number | null;
  /** Courses effectuées ce jour-là (repli quand les captures sont illisibles). */
  bestDayRuns: number;
  /** Captures du meilleur jour — `null` si un payload de la fenêtre est illisible. */
  bestDayCaptures: number | null;
  /** Captures de toute la fenêtre — `null` si un payload est illisible. */
  totalCaptures: number | null;
  /** `false` = moins de MIN_RUNS_FOR_TRENDS courses : aucune conclusion à tirer. */
  enough: boolean;
}

/** Une semaine de l'horizon hebdomadaire. */
export interface WeekBucket {
  /** Clé de semaine (lundi UTC, cf. `weekKey`). */
  key: string;
  /** 0 = semaine en cours, 1 = la précédente… */
  weeksAgo: number;
  runs: number;
  /** Zones prises dans la semaine — `null` si un payload de la semaine est illisible. */
  capturedHexes: number | null;
}

export interface WeeklyStats {
  /** De la plus ANCIENNE à la semaine en cours. Longueur ≤ WEEKLY_HORIZON_WEEKS. */
  weeks: readonly WeekBucket[];
  /**
   * Moyenne de courses par semaine sur `weeks`. Le dénominateur est le nombre de
   * semaines RÉELLEMENT couvertes depuis la première course, jamais l'horizon
   * complet : diviser par 12 les courses d'un compte vieux de 3 semaines
   * fabriquerait une moyenne trois fois trop basse.
   */
  avgRunsPerWeek: number;
  /** Semaines actives consécutives, en finissant à la semaine en cours. */
  streakWeeks: number;
  /** Index dans `weeks` de la meilleure semaine de capture — `null` si aucune. */
  bestCaptureWeekIndex: number | null;
  /** Zones prises sur tout l'horizon — `null` si un payload est illisible. */
  capturedTotalHexes: number | null;
}

export interface DerivedStats {
  /** Courses comptabilisées sur tout l'historique lu — 0 = compte neuf. */
  countedRuns: number;
  /** Bloc 1 « volume d'activité », sur la fenêtre choisie. */
  volume: VolumeStats;
  /** Blocs 2 et 3 : horizon hebdomadaire propre, indépendant de la fenêtre. */
  weekly: WeeklyStats;
  /** Zones prises SUR LA FENÊTRE — `null` si un payload est illisible. */
  capturedInPeriod: number | null;
}

/** Une course retenue, avec son horodatage déjà parsé (jamais NaN). */
export interface CountedRun {
  row: StatsRunRow;
  /** Départ en ms epoch. */
  atMs: number;
}

/**
 * Le filtre d'entrée de TOUT le module : statuts qui comptent + horodatage
 * lisible. Exporté pour que `records.ts` retienne EXACTEMENT les mêmes courses
 * que les trois blocs — deux filtres jumeaux finissent toujours par diverger, et
 * un palmarès qui compterait une course rejetée contredirait le bloc du dessus.
 */
export function countedRuns(rows: readonly StatsRunRow[]): CountedRun[] {
  const out: CountedRun[] = [];
  for (const row of rows) {
    if (!COUNTED.has(row.status)) continue;
    const atMs = Date.parse(row.started_at);
    if (!Number.isFinite(atMs)) continue;
    out.push({ row, atMs });
  }
  return out;
}

/** Index d'affichage lundi=0 à partir d'une date. */
function displayDayIndex(at: Date): number {
  // Jour LOCAL (et non UTC) : « samedi est ton meilleur jour » parle du samedi
  // du joueur. Une course de 22 h à São Paulo (UTC−3) tomberait un dimanche UTC
  // — la conclusion la plus visible de l'écran désignerait le mauvais jour.
  return (at.getDay() + 6) % 7;
}

/** Somme de captures d'un paquet de courses : `null` dès qu'une est illisible. */
function sumCaptures(runs: readonly StatsRunRow[]): number | null {
  let total = 0;
  for (const r of runs) {
    const c = capturedOf(r.celebration);
    if (c === null) return null;
    total += c;
  }
  return total;
}

/**
 * Dérive les trois blocs de l'écran Statistiques.
 *
 * @param rows           courses lues (tous statuts — le filtrage est fait ici)
 * @param now            horloge injectée
 * @param period         fenêtre choisie par le joueur
 * @param seasonStartMs  début RÉEL de la saison active, ou `null`
 */
export function deriveStats(
  rows: readonly StatsRunRow[],
  now: Date,
  period: StatsPeriod,
  seasonStartMs: number | null,
): DerivedStats {
  const counted = countedRuns(rows);

  // ── Bloc 1 : la fenêtre choisie ────────────────────────────────────────────
  const win = periodWindow(now, period, seasonStartMs);
  const inWindow = counted.filter((r) => r.atMs >= win.startMs && r.atMs <= win.endMs);
  const prev = win.previous;
  const previousRuns = prev
    ? counted.filter((r) => r.atMs >= prev.startMs && r.atMs <= prev.endMs)
    : [];

  const days: DayBucket[] = Array.from({ length: 7 }, (_, index) => ({
    index,
    distanceM: 0,
    runs: 0,
  }));
  let distanceM = 0;
  for (const r of inWindow) {
    const bucket = days[displayDayIndex(new Date(r.atMs))];
    if (!bucket) continue;
    const d = Math.max(0, r.row.distance_m);
    bucket.distanceM += d;
    bucket.runs += 1;
    distanceM += d;
  }

  let bestDayIndex: number | null = null;
  for (const d of days) {
    if (d.distanceM <= 0) continue;
    const best = bestDayIndex === null ? null : days[bestDayIndex];
    if (!best || d.distanceM > best.distanceM) bestDayIndex = d.index;
  }

  const previousDistanceM = previousRuns.reduce((s, r) => s + Math.max(0, r.row.distance_m), 0);
  const deltaPct =
    previousDistanceM > 0 && distanceM > 0
      ? Math.round(((distanceM - previousDistanceM) / previousDistanceM) * 100)
      : null;

  const windowRows = inWindow.map((r) => r.row);
  const totalCaptures = sumCaptures(windowRows);
  const bestDayCaptures =
    bestDayIndex === null
      ? null
      : sumCaptures(
          inWindow
            .filter((r) => displayDayIndex(new Date(r.atMs)) === bestDayIndex)
            .map((r) => r.row),
        );

  const volume: VolumeStats = {
    runs: inWindow.length,
    distanceM,
    deltaPct,
    days,
    bestDayIndex,
    bestDayRuns: bestDayIndex === null ? 0 : (days[bestDayIndex]?.runs ?? 0),
    bestDayCaptures,
    totalCaptures,
    enough: inWindow.length >= MIN_RUNS_FOR_TRENDS,
  };

  // ── Blocs 2 et 3 : horizon hebdomadaire ────────────────────────────────────
  const byWeek = new Map<string, StatsRunRow[]>();
  for (const r of counted) {
    const key = weekKey(new Date(r.atMs));
    if (!key) continue;
    const bucket = byWeek.get(key);
    if (bucket) bucket.push(r.row);
    else byWeek.set(key, [r.row]);
  }

  const nowMs = now.getTime();
  const currentWeekStart = weekStartUtc(now);
  // Nombre de semaines réellement couvertes depuis la PREMIÈRE course : afficher
  // douze carrés à un compte vieux de trois semaines peindrait neuf semaines
  // « creuses » qui n'ont jamais existé.
  let oldestMs = nowMs;
  for (const r of counted) oldestMs = Math.min(oldestMs, r.atMs);
  const spannedWeeks =
    counted.length === 0
      ? 0
      : Math.floor((currentWeekStart - weekStartUtc(new Date(oldestMs))) / MS_PER_WEEK) + 1;
  const horizon = Math.max(1, Math.min(WEEKLY_HORIZON_WEEKS, spannedWeeks));

  const weeks: WeekBucket[] = [];
  for (let weeksAgo = horizon - 1; weeksAgo >= 0; weeksAgo -= 1) {
    const key = weekKey(new Date(nowMs - weeksAgo * MS_PER_WEEK));
    const bucket = byWeek.get(key) ?? [];
    weeks.push({ key, weeksAgo, runs: bucket.length, capturedHexes: sumCaptures(bucket) });
  }

  const totalRunsOnHorizon = weeks.reduce((s, w) => s + w.runs, 0);
  const avgRunsPerWeek = weeks.length > 0 ? totalRunsOnHorizon / weeks.length : 0;

  // Série : la semaine EN COURS n'étant pas finie, son absence ne la casse pas
  // (même clémence que le moteur de série du projet).
  const activeAt = (weeksAgo: number): boolean => {
    const key = weekKey(new Date(nowMs - weeksAgo * MS_PER_WEEK));
    return (byWeek.get(key)?.length ?? 0) >= ACTIVE_WEEK_MIN_RUNS;
  };
  let streakWeeks = 0;
  for (let i = activeAt(0) ? 0 : 1; i < horizon + 1; i += 1) {
    if (!activeAt(i)) break;
    streakWeeks += 1;
  }

  let bestCaptureWeekIndex: number | null = null;
  let bestCaptureHexes = 0;
  for (let i = 0; i < weeks.length; i += 1) {
    const w = weeks[i];
    if (!w || w.capturedHexes === null || w.capturedHexes <= 0) continue;
    if (w.capturedHexes > bestCaptureHexes) {
      bestCaptureHexes = w.capturedHexes;
      bestCaptureWeekIndex = i;
    }
  }

  let capturedTotalHexes: number | null = 0;
  for (const w of weeks) {
    if (w.capturedHexes === null || capturedTotalHexes === null) {
      capturedTotalHexes = null;
      break;
    }
    capturedTotalHexes += w.capturedHexes;
  }

  return {
    countedRuns: counted.length,
    volume,
    weekly: {
      weeks,
      avgRunsPerWeek,
      streakWeeks,
      bestCaptureWeekIndex,
      capturedTotalHexes,
    },
    capturedInPeriod: totalCaptures,
  };
}
