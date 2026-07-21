/**
 * ⚠ CE MODULE VIT DANS `shared`, PAS DANS `engine` — et c'est un ARBITRAGE, pas
 * un hasard. Le mobile doit l'utiliser (le Route Planner affiche la distance
 * habituelle, l'écran Paramètres montre ce qui a été déduit). Or importer
 * `@klaim/engine` depuis l'app tire tout le barrel — dont h3-js — dans le
 * bundle Metro et casse la résolution des sous-chemins ; le repo a déjà payé ce
 * correctif (voir l'en-tête de `streak.ts`, même arbitrage, même raison). Ce
 * calcul ne dépend QUE de constantes et d'arithmétique, aucune géométrie H3 :
 * sa place est `shared`, consommable par le mobile ET le serveur sans doublon.
 *
 * GRYD — habits.ts : LE PROFIL D'HABITUDES (A-46 §1), moteur PUR.
 *
 * ─── Constat d'audit (21/07/2026) ────────────────────────────────────────────
 * Le Route Planner proposait des parcours de DÉMO et affichait, sur l'un
 * d'eux, la mention « Adaptée à tes habitudes » (`features/route/demo.ts`)
 * alors que RIEN dans le repo n'apprenait quoi que ce soit (grep
 * `preferredDistance` / `habitude` : zéro). C'est un mensonge d'écran de la
 * même famille que `users.streak_weeks` jamais écrit ou `daily_zone_awards`
 * jamais alimentée : une promesse que le code ne tient pas. Ce module rend la
 * phrase VRAIE — ou, quand les données manquent, la rend impossible à afficher.
 *
 * ─── LE SEUIL D'HONNÊTETÉ ────────────────────────────────────────────────────
 * Avec 1 ou 2 courses, on ne connaît pas les habitudes de quelqu'un. En dessous
 * de HABITS_MIN_RUNS, `computeHabitsProfile` renvoie `status: 'unknown'` avec
 * TOUTES les mesures à `null` : il n'existe aucune valeur à afficher, donc
 * aucun écran ne peut prétendre savoir. L'app dit « je ne sais pas encore »,
 * elle n'extrapole jamais une habitude à partir d'un run.
 *
 * ─── ROBUSTESSE ──────────────────────────────────────────────────────────────
 * MÉDIANE + MAD, jamais la moyenne + écart-type : une sortie longue
 * exceptionnelle (un semi improvisé) ne doit pas déplacer le profil de
 * quelqu'un qui court 5 km d'habitude. La moyenne le ferait, la médiane non.
 *
 * ─── VIE PRIVÉE (contraignant) ───────────────────────────────────────────────
 * Apprendre des habitudes de déplacement est du profilage sur des données de
 * localisation. Ce moteur ne reçoit AUCUNE coordonnée, AUCUNE trace, AUCUN
 * identifiant de rue : uniquement distance, durée, allure, horodatage et
 * statut. Un profil d'habitudes ne peut donc structurellement pas ré-exposer le
 * point de départ que §7 floute à 500 m — « tu cours le mardi soir » ne dit pas
 * OÙ. L'appelant fournit `learningEnabled: false` quand l'utilisateur a coupé
 * l'apprentissage : le moteur renvoie alors `'disabled'` sans rien calculer.
 *
 * ─── ANTI PAY-TO-WIN ─────────────────────────────────────────────────────────
 * Ce profil SUGGÈRE un parcours. Il n'accorde aucun point, aucun territoire,
 * aucun multiplicateur, et n'entre dans aucune formule de score.
 *
 * PURE : aucune I/O, aucune horloge implicite (`now` est un paramètre), aucun
 * nombre magique (tout vient de ./game-rules).
 */
import {
  HABITS_CONFIDENT_RUNS,
  HABITS_HISTORY_DAYS,
  HABITS_MIN_RUNS,
  HABITS_PATTERN_MIN_SHARE,
  HABITS_SLOTS,
  HABITS_TIGHT_SPREAD_RATIO,
  RUN_AVG_PACE_MAX_S_KM,
  RUN_AVG_PACE_MIN_S_KM,
  RUN_MIN_DISTANCE_M,
  RUN_MIN_DURATION_S,
  type HabitSlotKey,
} from './game-rules.ts';

const MS_PER_DAY = 86_400_000;
const MS_PER_MINUTE = 60_000;

/**
 * Statut d'une course tel que stocké (`public.runs.status`). Seuls 'valid' et
 * 'partial' construisent une habitude : une course rejetée ou signalée n'a pas
 * eu lieu du point de vue du jeu, elle ne doit rien apprendre.
 */
export type HabitRunStatus = 'valid' | 'partial' | 'flagged' | 'rejected';

/** Statuts qui comptent. Exporté pour que le test et le serveur partagent la règle. */
export const HABITS_COUNTED_STATUSES: readonly HabitRunStatus[] = ['valid', 'partial'];

/**
 * Faits d'UNE course. Volontairement pauvre : ce sont les seules colonnes que
 * le moteur a le droit de connaître (cf. VIE PRIVÉE ci-dessus).
 */
export interface HabitRunFact {
  readonly startedAt: Date;
  readonly distanceM: number;
  readonly durationS: number;
  /** `avg_pace_s_km` si présent ; sinon dérivée de distance/durée. */
  readonly avgPaceSKm?: number | null;
  readonly status: HabitRunStatus;
}

export interface HabitsInput {
  readonly runs: readonly HabitRunFact[];
  /** Horloge injectée (jamais Date.now() implicite). */
  readonly now: Date;
  /**
   * Décalage LOCAL de l'appareil en minutes (comme `-new Date().getTimezoneOffset()`,
   * ex. +120 pour Paris en été). Sert UNIQUEMENT à situer jour et créneau :
   * « le mardi soir » doit vouloir dire le mardi soir de la personne. Absent →
   * UTC, et on l'assume plutôt que de deviner.
   */
  readonly timeZoneOffsetMinutes?: number;
  /**
   * L'utilisateur a-t-il laissé l'apprentissage activé. Absent → `true`
   * (l'appelant serveur le fournit toujours). `false` court-circuite TOUT.
   */
  readonly learningEnabled?: boolean;
}

/**
 * - 'disabled' : l'utilisateur a coupé l'apprentissage. Rien n'est calculé.
 * - 'unknown'  : pas assez de courses (< HABITS_MIN_RUNS). L'app le DIT.
 * - 'known'    : profil exploitable.
 */
export type HabitsStatus = 'disabled' | 'unknown' | 'known';

/**
 * - 'none' : pas de profil (disabled/unknown).
 * - 'low'  : profil établi mais échantillon mince OU habitudes dispersées —
 *            l'UI propose sans affirmer.
 * - 'high' : échantillon fourni ET dispersion faible.
 */
export type HabitsConfidence = 'none' | 'low' | 'high';

/** Une mesure robuste : médiane + dispersion (MAD), et la plage qui en découle. */
export interface HabitMeasure {
  readonly median: number;
  /** Median Absolute Deviation — dispersion insensible aux valeurs extrêmes. */
  readonly spread: number;
  readonly low: number;
  readonly high: number;
  /** `spread / median <= HABITS_TIGHT_SPREAD_RATIO` → habitude régulière. */
  readonly tight: boolean;
  /** Nombre de courses ayant réellement alimenté cette mesure. */
  readonly sampleSize: number;
}

/** Un jour ou un créneau récurrent, avec sa part réelle. */
export interface HabitPattern<K extends string | number> {
  readonly key: K;
  readonly count: number;
  /** Part de l'échantillon, dans [0, 1]. */
  readonly share: number;
}

export interface HabitsProfile {
  readonly status: HabitsStatus;
  readonly confidence: HabitsConfidence;
  /** Courses retenues (comptabilisées, dans la fenêtre, non aberrantes). */
  readonly sampleSize: number;
  /** Courses manquantes avant d'atteindre HABITS_MIN_RUNS (0 si atteint). */
  readonly runsMissing: number;
  /** Distance habituelle, en mètres. `null` tant que le profil n'est pas connu. */
  readonly distanceM: HabitMeasure | null;
  /** Allure habituelle, en s/km. `null` si trop peu d'allures exploitables. */
  readonly paceSKm: HabitMeasure | null;
  /** Jours récurrents (0 = lundi), part décroissante. Vide si rien ne ressort. */
  readonly weekdays: readonly HabitPattern<number>[];
  /** Créneaux récurrents, part décroissante. Vide si rien ne ressort. */
  readonly slots: readonly HabitPattern<HabitSlotKey>[];
  /** Fenêtre d'historique effectivement appliquée (jours). */
  readonly windowDays: number;
}

const emptyProfile = (status: HabitsStatus, sampleSize: number): HabitsProfile => ({
  status,
  confidence: 'none',
  sampleSize,
  runsMissing: Math.max(0, HABITS_MIN_RUNS - sampleSize),
  distanceM: null,
  paceSKm: null,
  weekdays: [],
  slots: [],
  windowDays: HABITS_HISTORY_DAYS,
});

/** Médiane d'un échantillon NON VIDE, trié ou non. PURE. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const mid = n >> 1;
  // Accès indexés explicitement gardés : `noUncheckedIndexedAccess` est actif,
  // et `?? Number.NaN` propage l'anomalie au lieu de fabriquer un 0 silencieux.
  const hi = sorted[mid] ?? Number.NaN;
  if (n % 2 === 1) return hi;
  const lo = sorted[mid - 1] ?? Number.NaN;
  return (lo + hi) / 2;
}

/**
 * Mesure robuste d'un échantillon. `null` en dessous de HABITS_MIN_RUNS : sous
 * ce seuil, une « distance habituelle » n'existe pas, on ne la fabrique pas.
 */
function measure(values: readonly number[]): HabitMeasure | null {
  if (values.length < HABITS_MIN_RUNS) return null;
  const med = median(values);
  const spread = median(values.map((v) => Math.abs(v - med)));
  return {
    median: med,
    spread,
    low: Math.max(0, med - spread),
    high: med + spread,
    // med > 0 garanti par les filtres (distance ≥ RUN_MIN_DISTANCE_M, allure > 0).
    tight: med > 0 && spread / med <= HABITS_TIGHT_SPREAD_RATIO,
    sampleSize: values.length,
  };
}

/** Index du jour LOCAL, 0 = lundi (même convention que streak.ts). PURE. */
export function localWeekday(at: Date, offsetMinutes: number): number {
  const shifted = new Date(at.getTime() + offsetMinutes * MS_PER_MINUTE);
  return (shifted.getUTCDay() + 6) % 7;
}

/**
 * Créneau LOCAL d'une course. `night` enjambe minuit : toute heure antérieure
 * au premier créneau retombe sur le dernier. PURE.
 */
export function localSlot(at: Date, offsetMinutes: number): HabitSlotKey {
  const shifted = new Date(at.getTime() + offsetMinutes * MS_PER_MINUTE);
  const hour = shifted.getUTCHours();
  // HABITS_SLOTS est un tuple `as const` non vide : le dernier créneau existe
  // toujours. C'est lui qui recueille les heures antérieures au premier
  // créneau (00:00–04:59 → `night`), d'où le repli initial.
  const last = HABITS_SLOTS[HABITS_SLOTS.length - 1];
  let found: HabitSlotKey = last ? last.key : HABITS_SLOTS[0].key;
  for (const slot of HABITS_SLOTS) {
    if (hour >= slot.startHour) found = slot.key;
  }
  return found;
}

/**
 * Trie les récurrences par part décroissante et ne garde que celles qui pèsent
 * au moins HABITS_PATTERN_MIN_SHARE. Ordre déterministe : à part égale, on
 * départage par clé croissante (sinon deux appareils afficheraient deux ordres).
 */
function patterns<K extends string | number>(
  counts: ReadonlyMap<K, number>,
  total: number,
): readonly HabitPattern<K>[] {
  const out: HabitPattern<K>[] = [];
  for (const [key, count] of counts) {
    const share = count / total;
    if (share >= HABITS_PATTERN_MIN_SHARE) out.push({ key, count, share });
  }
  return out.sort((a, b) =>
    b.share !== a.share ? b.share - a.share : String(a.key) < String(b.key) ? -1 : 1,
  );
}

/**
 * Calcule le profil d'habitudes à partir des courses RÉELLES de l'appelant. PURE.
 *
 * Rejets silencieux (une entrée douteuse ne doit jamais devenir une habitude) :
 *  - statut hors HABITS_COUNTED_STATUSES (rejetée, signalée) ;
 *  - date invalide, ou dans le futur, ou hors fenêtre HABITS_HISTORY_DAYS ;
 *  - distance < RUN_MIN_DISTANCE_M ou durée < RUN_MIN_DURATION_S (sessions
 *    avortées : elles ne décrivent pas une habitude de course) ;
 *  - valeurs non finies.
 * L'allure, elle, est filtrée SÉPARÉMENT : une allure hors bornes physiques
 * n'invalide pas la course (sa distance reste un fait), elle ne fournit
 * simplement pas d'échantillon d'allure. On peut donc connaître la distance
 * habituelle de quelqu'un sans connaître son allure — et le dire.
 */
export function computeHabitsProfile(input: HabitsInput): HabitsProfile {
  if (input.learningEnabled === false) return emptyProfile('disabled', 0);

  const nowMs = input.now instanceof Date ? input.now.getTime() : Number.NaN;
  if (!Number.isFinite(nowMs)) return emptyProfile('unknown', 0);

  const offset = Number.isFinite(input.timeZoneOffsetMinutes)
    ? (input.timeZoneOffsetMinutes as number)
    : 0;
  const oldestMs = nowMs - HABITS_HISTORY_DAYS * MS_PER_DAY;

  const distances: number[] = [];
  const paces: number[] = [];
  const weekdayCounts = new Map<number, number>();
  const slotCounts = new Map<HabitSlotKey, number>();

  for (const run of input.runs) {
    if (!HABITS_COUNTED_STATUSES.includes(run.status)) continue;

    const ms = run.startedAt instanceof Date ? run.startedAt.getTime() : Number.NaN;
    if (!Number.isFinite(ms) || ms > nowMs || ms < oldestMs) continue;

    const distanceM = run.distanceM;
    const durationS = run.durationS;
    if (!Number.isFinite(distanceM) || distanceM < RUN_MIN_DISTANCE_M) continue;
    if (!Number.isFinite(durationS) || durationS < RUN_MIN_DURATION_S) continue;

    distances.push(distanceM);

    const weekday = localWeekday(run.startedAt, offset);
    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
    const slot = localSlot(run.startedAt, offset);
    slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);

    const stored = run.avgPaceSKm;
    const pace =
      typeof stored === 'number' && Number.isFinite(stored) && stored > 0
        ? stored
        : durationS / (distanceM / 1_000);
    if (Number.isFinite(pace) && pace >= RUN_AVG_PACE_MIN_S_KM && pace <= RUN_AVG_PACE_MAX_S_KM) {
      paces.push(pace);
    }
  }

  const sampleSize = distances.length;
  if (sampleSize < HABITS_MIN_RUNS) return emptyProfile('unknown', sampleSize);

  const distanceM = measure(distances);
  // Ne peut pas être null ici (sampleSize ≥ HABITS_MIN_RUNS), mais on ne
  // suppose rien : si ça l'était, on retomberait honnêtement sur 'unknown'.
  if (!distanceM) return emptyProfile('unknown', sampleSize);

  const confidence: HabitsConfidence =
    sampleSize >= HABITS_CONFIDENT_RUNS && distanceM.tight ? 'high' : 'low';

  return {
    status: 'known',
    confidence,
    sampleSize,
    runsMissing: 0,
    distanceM,
    paceSKm: measure(paces),
    weekdays: patterns(weekdayCounts, sampleSize),
    slots: patterns(slotCounts, sampleSize),
    windowDays: HABITS_HISTORY_DAYS,
  };
}
