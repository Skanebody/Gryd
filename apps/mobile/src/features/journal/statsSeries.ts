/**
 * GRYD — LES SÉRIES DE L'ÉCRAN STATISTIQUES (cahier G25 : « période puis sport ;
 * distance, temps et fréquence de sortie ; sous ce résumé, évolution lisible »).
 *
 * ═══ POURQUOI CES CALCULS SORTENT DE L'ÉCRAN ════════════════════════════════
 * `ProfileStatsScreen` calculait ses barres dans son JSX : `day.km / chartMax *
 * 112`, avec `chartMax = Math.max(...jours, 1)`. Rien ne le testait, et deux
 * défauts y vivaient : une journée à 0,3 km dessinait presque un tiers du
 * graphique (le plancher de 1 km s'appliquait au MAXIMUM, pas à l'échelle), et
 * un jour sans sortie ne dessinait aucune barre — il disparaissait de l'axe au
 * lieu de se lire « rien ce jour-là ».
 *
 * Ici, les séries sont PURES et testées ; le rendu ne fait que les peindre.
 *
 * ═══ CE QU'ELLES NE FONT PAS ════════════════════════════════════════════════
 * · Aucune période n'est inventée : une semaine sans sortie vaut 0 km — c'est
 *   un FAIT (elle a bien eu lieu), à la différence d'une allure absente, qui
 *   rend `null` et fait disparaître le point de la courbe.
 * · Aucune moyenne « lissée » entre deux sorties : la courbe d'allure relie des
 *   sorties RÉELLES, une par point.
 * · Aucune extrapolation au-delà de la fenêtre lue par l'historique.
 *
 * PUR : zéro React, zéro i18n, zéro `Date.now()` implicite (l'horloge est
 * injectée, comme dans `historyView.groupRunsByWeek`).
 */
import { startOfWeekMs } from '../history/historyView';

/** Entrée minimale : ce dont les séries ont besoin, et rien de plus. */
export interface StatsRunInput {
  readonly startedAtMs: number;
  readonly km: number;
  readonly durationS: number;
  readonly paceSPerKm?: number | null;
}

export interface WeekBar {
  /** Lundi de la semaine (ms epoch) — l'écran le formate dans sa langue. */
  readonly weekStartMs: number;
  readonly km: number;
  readonly runs: number;
}

/** Millisecondes dans une journée — unité, pas une règle de jeu. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Les `count` dernières semaines civiles, la plus ancienne d'abord. Une semaine
 * SANS sortie est présente avec 0 km : c'est ce qui rend une régularité (ou son
 * absence) visible d'un coup d'œil. La retirer donnerait un graphique qui
 * remonte le temps par sauts, et deux barres voisines ne voudraient plus dire
 * deux semaines voisines.
 */
export function weeklyDistance(
  runs: readonly StatsRunInput[],
  nowMs: number,
  count: number,
): WeekBar[] {
  const thisWeek = startOfWeekMs(nowMs);
  const weeks: WeekBar[] = [];
  for (let i = count - 1; i >= 0; i--) {
    // On repart de `startOfWeekMs` à chaque pas : soustraire 7 × 86 400 000 ms
    // dérive d'une heure aux changements d'heure, et une barre finirait par
    // tomber dans la semaine voisine.
    weeks.push({ weekStartMs: startOfWeekMs(thisWeek - i * 7 * MS_PER_DAY), km: 0, runs: 0 });
  }
  const index = new Map(weeks.map((week, position) => [week.weekStartMs, position]));
  const out = weeks.map((week) => ({ ...week }));
  for (const run of runs) {
    if (!Number.isFinite(run.startedAtMs)) continue;
    const position = index.get(startOfWeekMs(run.startedAtMs));
    if (position === undefined) continue;
    const week = out[position];
    if (!week) continue;
    out[position] = {
      weekStartMs: week.weekStartMs,
      km: Number.isFinite(run.km) && run.km > 0 ? week.km + run.km : week.km,
      runs: week.runs + 1,
    };
  }
  return out;
}

export interface SessionPace {
  readonly startedAtMs: number;
  readonly paceSPerKm: number;
}

/**
 * L'allure moyenne des `limit` dernières sorties MESURÉES, de la plus ancienne
 * à la plus récente (sens de lecture d'une évolution).
 *
 * Une sortie sans allure n'est pas un trou à combler : elle est ABSENTE de la
 * courbe. Interpoler entre ses voisines dessinerait une séance qui n'a pas eu
 * lieu.
 */
export function sessionPaces(runs: readonly StatsRunInput[], limit: number): SessionPace[] {
  const measured = runs
    .filter(
      (run): run is StatsRunInput & { paceSPerKm: number } =>
        typeof run.paceSPerKm === 'number' &&
        Number.isFinite(run.paceSPerKm) &&
        run.paceSPerKm > 0 &&
        Number.isFinite(run.startedAtMs),
    )
    .sort((a, b) => a.startedAtMs - b.startedAtMs);
  return measured
    .slice(Math.max(0, measured.length - limit))
    .map((run) => ({ startedAtMs: run.startedAtMs, paceSPerKm: run.paceSPerKm }));
}

/**
 * Le nombre de JOURS où au moins une sortie a été enregistrée, dans la fenêtre
 * donnée. ⚠ Ce n'est PAS la « journée active » du serveur (≥ 10 min de
 * mouvement admissible, cahier §7.1) affichée dans le Profil : deux mesures
 * différentes ne partagent pas le même mot, et l'écran doit dire laquelle il
 * montre (« jours avec sortie »).
 */
export function daysWithRun(
  runs: readonly StatsRunInput[],
  fromMs: number,
  toMs: number,
): number {
  const days = new Set<string>();
  for (const run of runs) {
    if (!Number.isFinite(run.startedAtMs)) continue;
    if (run.startedAtMs < fromMs || run.startedAtMs >= toMs) continue;
    const date = new Date(run.startedAtMs);
    days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  }
  return days.size;
}

/**
 * L'index de la plus grande barre, ou `null` si tout est à zéro (rien à mettre
 * en avant : aucune barre ne « parle » plus qu'une autre).
 *
 * ÉGALITÉ : la semaine la PLUS RÉCENTE gagne (`>=`). Deux semaines identiques
 * arrivent souvent chez quelqu'un de régulier, et souligner la plus ancienne
 * donnerait l'impression d'un record passé qu'on n'aurait pas égalé.
 */
export function bestWeekIndex(weeks: readonly WeekBar[]): number | null {
  let best: number | null = null;
  weeks.forEach((week, index) => {
    if (week.km <= 0) return;
    if (best === null || week.km >= (weeks[best]?.km ?? 0)) best = index;
  });
  return best;
}
