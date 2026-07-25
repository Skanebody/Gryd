/**
 * GRYD — E18 : LE PALMARÈS (records personnels), moteur PUR.
 *
 * ─── POURQUOI CE MODULE EXISTE À CÔTÉ DE `derive.ts` ────────────────────────
 * Le recalage sur la planche E18 a sorti les records de l'écran : la planche
 * impose TROIS blocs à grammaire identique (chiffre → graphique → conclusion en
 * langage naturel) et un quatrième bloc aurait cassé la règle. Le fondateur a
 * tranché : les records reviennent, mais PAS comme un 4e bloc d'analyse.
 *
 * La règle des trois blocs vise la grammaire d'ANALYSE — « voici une tendance,
 * voici ce qu'elle veut dire ». Un palmarès n'analyse rien : il CONSTATE. Il n'a
 * ni tendance à tracer (un record est un point, pas une série), ni conclusion à
 * tirer (« ta plus longue course fait 18 km » EST déjà la conclusion). Le sortir
 * de `derive.ts` et lui donner son propre module, c'est écrire cette frontière
 * dans le code : ce fichier ne produira jamais de courbe ni de phrase — s'il
 * devait le faire un jour, c'est qu'il serait devenu un bloc, et il faudrait
 * rouvrir la planche, pas contourner sa règle.
 *
 * ─── LECTURE UNIQUE ─────────────────────────────────────────────────────────
 * Ce module ne lit RIEN : il dérive des lignes déjà lues par `useStats`. Les
 * records ne rouvrent pas `useMyPerformance` (l'ancienne lecture de `runs`) :
 * deux lectures du même joueur aboutissent à deux instants différents, et le
 * jour où elles divergent l'écran se contredit lui-même — « 12 courses » en
 * haut, un record posé sur une 13e en bas.
 *
 * ─── AUCUNE HORLOGE ─────────────────────────────────────────────────────────
 * `deriveStats` prend `now` (une semaine, un mois, une saison sont des fenêtres
 * autour de l'instant présent). Un palmarès, non : il ne dépend pas de l'instant
 * où on le regarde. C'est exactement ce qui le distingue des trois blocs — et
 * c'est ce qui le rend trivialement déterministe.
 *
 * ─── CE QU'IL REFUSE ────────────────────────────────────────────────────────
 *  · De fabriquer un record à partir d'une course vide (0 m / 0 s) : ce n'est
 *    pas un record, c'est une course sans contenu.
 *  · De recalculer une allure absente. `avg_pace_s_km` est NULLABLE en base :
 *    la course est ignorée POUR CE RECORD (les autres records la gardent).
 *    Conséquence assumée et documentée : si les courses les plus rapides du
 *    joueur n'ont pas d'allure enregistrée, le record affiché est SOUS-estimé —
 *    jamais surestimé. Une valeur affichée reste une valeur réellement courue ;
 *    la reconstruire à partir de distance/durée inventerait une mesure que le
 *    serveur n'a pas validée.
 *  · D'appeler « série » une semaine isolée (cf. MIN_RECORD_STREAK_WEEKS).
 */
import { weekStartUtc } from '@klaim/shared';
import { countedRuns, type StatsRunRow } from './derive';

const MS_PER_WEEK = 7 * 86_400_000;

/**
 * Longueur minimale d'une série pour qu'elle soit un RECORD. Deux, comme le
 * bloc « Régularité » qui n'ouvre une série qu'à partir de deux semaines
 * actives : une semaine seule n'est pas une suite, et les deux lectures de
 * l'écran doivent dire la même chose. Seuil d'AFFICHAGE, pas une constante de
 * jeu — sa place n'est donc pas dans `game-rules.ts`.
 */
export const MIN_RECORD_STREAK_WEEKS = 2;

/** Un record : sa valeur ET la course qui l'a posé (jamais un chiffre orphelin). */
export interface RecordEntry {
  /** Valeur brute : m, s ou s/km selon le record. Jamais formatée ici. */
  value: number;
  /**
   * Distance de la course concernée (m), 0 si elle n'est pas lisible. C'est le
   * CONTEXTE de la meilleure allure : 4'10/km sur 2 km et sur 30 km ne sont pas
   * le même fait.
   */
  distanceM: number;
  /** Départ de la course (ISO d'origine) : ce record appartient à cette course. */
  startedAt: string;
  /** Le même départ en ms epoch (déjà parsé) — sert aussi à départager les ex æquo. */
  atMs: number;
}

export interface PersonalRecords {
  /** Plus longue course (`value` en m). */
  longestDistance: RecordEntry | null;
  /** Plus longue durée (`value` en s). */
  longestDuration: RecordEntry | null;
  /** Meilleure allure (`value` en s/km — le PLUS PETIT gagne). */
  bestPace: RecordEntry | null;
  /**
   * Plus longue suite de semaines consécutives avec au moins une course, sur
   * tout l'historique lu. `null` sous MIN_RECORD_STREAK_WEEKS.
   *
   * C'est le RECORD, pas la série en cours (qu'affiche le bloc « Régularité »).
   * Les deux nombres diffèrent légitimement — c'est pourquoi leurs libellés
   * doivent différer aussi, sans quoi l'écran se contredirait à voix haute.
   */
  bestStreakWeeks: number | null;
  /** `false` = aucun record établi : l'écran invite à courir, il n'aligne pas des zéros. */
  hasAny: boolean;
}

/** Nombre exploitable et strictement positif, ou `null`. */
function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Le tenant garde son titre sauf si le candidat fait STRICTEMENT mieux. À
 * ÉGALITÉ, c'est la course la PLUS ANCIENNE qui le garde : un record appartient
 * au jour où il a été posé pour la première fois, l'égaler ne le reprend pas.
 * Règle indépendante de l'ordre des lignes reçues (elles arrivent triées par
 * date décroissante aujourd'hui — un tri serveur ne doit jamais décider d'un
 * record).
 */
function challenge(
  current: RecordEntry | null,
  candidate: RecordEntry,
  isBetter: (candidate: number, current: number) => boolean,
): RecordEntry {
  if (!current) return candidate;
  if (isBetter(candidate.value, current.value)) return candidate;
  if (candidate.value === current.value && candidate.atMs < current.atMs) return candidate;
  return current;
}

const higher = (a: number, b: number): boolean => a > b;
const lower = (a: number, b: number): boolean => a < b;

/**
 * Dérive le palmarès des courses déjà lues.
 *
 * @param rows lignes brutes de `runs` (tous statuts — le filtrage est fait ici,
 *             par le MÊME `countedRuns` que les trois blocs).
 *
 * Portée : « de tous les temps » se lit sur l'historique RÉELLEMENT lu
 * (`RUN_HISTORY_LIMIT` dans `useStats`). Une troncature ferait mentir un record
 * par le BAS — un record plus ancien resterait simplement invisible, jamais
 * inventé. Au-delà de cette limite, le calcul devra passer serveur.
 */
export function deriveRecords(rows: readonly StatsRunRow[]): PersonalRecords {
  const counted = countedRuns(rows);

  let longestDistance: RecordEntry | null = null;
  let longestDuration: RecordEntry | null = null;
  let bestPace: RecordEntry | null = null;

  for (const { row, atMs } of counted) {
    const distanceM = positive(row.distance_m);
    const durationS = positive(row.duration_s);
    const paceSKm = positive(row.avg_pace_s_km);
    const base = { distanceM: distanceM ?? 0, startedAt: row.started_at, atMs };

    if (distanceM !== null) {
      longestDistance = challenge(longestDistance, { value: distanceM, ...base }, higher);
    }
    if (durationS !== null) {
      longestDuration = challenge(longestDuration, { value: durationS, ...base }, higher);
    }
    if (paceSKm !== null) {
      bestPace = challenge(bestPace, { value: paceSKm, ...base }, lower);
    }
  }

  // ── Plus longue série de semaines actives ─────────────────────────────────
  // Semaines UTC (`weekStartUtc`), comme partout dans le moteur GRYD : deux
  // téléphones dans deux fuseaux ne doivent pas lire deux séries différentes.
  const weekStarts = new Set<number>();
  for (const { atMs } of counted) {
    const start = weekStartUtc(new Date(atMs));
    if (Number.isFinite(start)) weekStarts.add(start);
  }
  const sorted = [...weekStarts].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const start of sorted) {
    run = previous !== null && start - previous === MS_PER_WEEK ? run + 1 : 1;
    previous = start;
    if (run > best) best = run;
  }
  const bestStreakWeeks = best >= MIN_RECORD_STREAK_WEEKS ? best : null;

  return {
    longestDistance,
    longestDuration,
    bestPace,
    bestStreakWeeks,
    hasAny:
      longestDistance !== null ||
      longestDuration !== null ||
      bestPace !== null ||
      bestStreakWeeks !== null,
  };
}
