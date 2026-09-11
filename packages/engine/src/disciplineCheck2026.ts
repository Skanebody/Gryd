/**
 * GRYD — « TU T'ES TROMPÉ DE DISCIPLINE » : LE CONTRÔLE, PUR (12/09/2026).
 *
 * ═══ LA DÉCISION QUE CE MODULE SERT ═════════════════════════════════════════
 * Décision fondateur du 12/09/2026, mot pour mot : « à la fin, si la personne
 * s'est trompée, on lui met le message comme quoi il y a un problème avec sa
 * course ; s'il ne veut pas basculer, on ne comptabilise pas pour certaines
 * choses ».
 *
 * Ce module ne décide RIEN de tout cela. Il répond à une seule question, avec
 * des nombres : « la trace et le podomètre racontent-ils une AUTRE discipline
 * que celle qui a été déclarée au départ ? ». L'écran de fin en fait une
 * question posée au joueur ; `ingest_run` en fait un signal de revue. Les deux
 * lisent la MÊME fonction — il n'existe pas deux définitions du motif.
 *
 * ─── POURQUOI À L'ARRIVÉE, ET JAMAIS PENDANT ────────────────────────────────
 * La discipline est FIGÉE AU DÉPART (`tracker.ts` : `readonly activity`) parce
 * qu'elle fixe les bornes de nettoyage §3.2 appliquées à chaque relevé. La
 * rebasculer en pleine sortie produirait une trace filtrée à deux barèmes
 * différents — un objet que plus aucune règle ne saurait juger. Le contrôle a
 * donc lieu quand la trace est complète, et il est alors RÉPARABLE : basculer
 * renvoie simplement la même trace avec l'autre discipline déclarée.
 *
 * ─── DEUX FAITS QUI TIENNENT ENSEMBLE, JAMAIS UN SEUL ───────────────────────
 * Aucun des deux sens ne se conclut sur une moitié de motif :
 *  · vite tout seul   → c'est peut-être un très bon coureur ;
 *  · zéro pas tout seul → c'est peut-être un téléphone dans une poussette ;
 *  · cadence de foulée toute seule → c'est peut-être un cycliste qui a le
 *    téléphone en poche sur une route pavée ;
 *  · lent tout seul   → c'est peut-être une côte, ou la ville aux feux rouges.
 * Il faut les DEUX moitiés, sur la MÊME fenêtre, pour que la lecture tienne.
 *
 * ─── CE QUI N'EST PAS MESURÉ N'EST PAS JUGÉ ─────────────────────────────────
 * Sans podomètre : `suspected === null`, avec le motif `no_steps`. On ne devine
 * pas une cadence à partir d'un silence, et surtout : on ne présente JAMAIS à
 * quelqu'un un écran qui affirme un fait qu'aucun capteur n'a observé (L8/L19).
 *
 * PUR : aucune I/O, aucune horloge, aucun tri en place (`points` n'est pas muté).
 */
import {
  type Activity,
  activityRules,
  DEFAULT_ACTIVITY,
  DISCIPLINE_CHECK_2026,
  type DisciplineUnavailable2026,
} from '@klaim/shared/game-rules';
import type { RunPoint } from '@klaim/shared/types';
import { haversineM } from './validation.ts';

// Constantes physiques / d'unités — pas des règles de jeu.
const MS_PER_S = 1_000;
const S_PER_MIN = 60;
const KMH_PER_M_S = 3.6;

// ════════════════════════════════════════════════════════════════════════════
// LA FENÊTRE SOUTENUE, AVEC SES BORNES
// ════════════════════════════════════════════════════════════════════════════

/** Une fenêtre glissante mesurée : sa vitesse, et QUAND elle a eu lieu. */
export interface SustainedWindow2026 {
  /** Vitesse moyenne sur la fenêtre, en km/h. */
  readonly kmh: number;
  /** Epoch ms du premier relevé de la fenêtre. */
  readonly fromT: number;
  /** Epoch ms du dernier relevé de la fenêtre. */
  readonly toT: number;
}

/**
 * TOUTES les fenêtres d'au moins `windowS` secondes, une par relevé de fin.
 *
 * ─── POURQUOI LES BORNES, ET PAS SEULEMENT LA VITESSE ───────────────────────
 * `sustainedWindowKmh` (anti-triche) ne rendait qu'un nombre. Pour opposer une
 * CADENCE à une vitesse, il faut savoir sur quel INTERVALLE la vitesse a été
 * mesurée : sans les bornes, on comparerait la vitesse d'une portion aux pas
 * d'une autre — c'est-à-dire on fabriquerait une coïncidence.
 *
 * ─── « CONTINUE » SE DÉFINIT COMME AILLEURS, ET NULLE PART AUTREMENT ────────
 * Une fenêtre qui enjamberait une discontinuité mesurerait une vitesse qui n'a
 * jamais existé. La contiguïté se rompt donc exactement là où `filterPoints` la
 * rompt déjà : rupture DÉCLARÉE (`breakBefore`), horodatage dupliqué ou
 * désordonné, silence au-delà de `pointMaxGapS`, saut au-delà de
 * `pointMaxJumpM`. Aucun nouveau critère n'est inventé ici.
 *
 * ─── CE QUE LA FENÊTRE NE FILTRE PAS, ET POURQUOI ───────────────────────────
 * Elle ne retire PAS les tronçons plus rapides que `pointMaxSpeedKmh`. Les
 * retirer rendrait le contrôle muet exactement sur le cas le plus net (un
 * trajet motorisé, dont TOUS les tronçons dépassent le plafond, ne laisserait
 * plus aucune portion continue). Un vrai saut de satellite, lui, casse la
 * contiguïté par sa DISTANCE et sort donc bien de la mesure.
 *
 * Pour chaque relevé de fin, on garde la PLUS COURTE fenêtre d'au moins
 * `windowS` : c'est elle qui porte la vitesse la plus élevée de toutes celles
 * qui finissent là (allonger une fenêtre ne peut que diluer une pointe).
 */
export function sustainedWindows2026(
  points: readonly RunPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
  windowS: number = DISCIPLINE_CHECK_2026.windowS,
): SustainedWindow2026[] {
  const rules = activityRules(activity);
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const out: SustainedWindow2026[] = [];

  /** Temps, distances et horodatages CUMULÉS de la portion continue en cours. */
  let times: number[] = [];
  let dists: number[] = [];
  let stamps: number[] = [];

  const measure = () => {
    if (times.length < 2) return;
    let i = 0;
    for (let j = 1; j < times.length; j++) {
      while (i + 1 <= j && times[j]! - times[i + 1]! >= windowS) i++;
      const dtS = times[j]! - times[i]!;
      if (dtS < windowS) continue;
      out.push({
        kmh: ((dists[j]! - dists[i]!) / dtS) * KMH_PER_M_S,
        fromT: stamps[i]!,
        toT: stamps[j]!,
      });
    }
  };

  let previousPoint: RunPoint | null = null;
  for (const point of sorted) {
    if (previousPoint === null) {
      times = [0];
      dists = [0];
      stamps = [point.t];
      previousPoint = point;
      continue;
    }
    const dtS = (point.t - previousPoint.t) / MS_PER_S;
    const distM = haversineM(previousPoint, point);
    const broken = point.breakBefore === true ||
      dtS <= 0 ||
      dtS > rules.pointMaxGapS ||
      distM > rules.pointMaxJumpM;
    if (broken) {
      measure();
      times = [0];
      dists = [0];
      stamps = [point.t];
    } else {
      times.push(times[times.length - 1]! + dtS);
      dists.push(dists[dists.length - 1]! + distM);
      stamps.push(point.t);
    }
    previousPoint = point;
  }
  measure();
  return out;
}

/**
 * La fenêtre la PLUS RAPIDE, ou `null` quand aucune portion continue n'atteint
 * `windowS` : on ne juge pas ce qu'on n'a pas mesuré.
 */
export function fastestSustainedWindow2026(
  points: readonly RunPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
  windowS: number = DISCIPLINE_CHECK_2026.windowS,
): SustainedWindow2026 | null {
  let best: SustainedWindow2026 | null = null;
  for (const w of sustainedWindows2026(points, activity, windowS)) {
    if (best === null || w.kmh > best.kmh) best = w;
  }
  return best;
}

// ════════════════════════════════════════════════════════════════════════════
// LE PODOMÈTRE, PAR TRANCHES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Des pas COMPTÉS sur un intervalle — jamais un cumul.
 *
 * Le podomètre d'un téléphone émet un CUMUL horodaté, à intervalle irrégulier
 * (iOS par paquets, Android au fil des pas). C'est l'appelant qui le range en
 * tranches contiguës (`DISCIPLINE_STEP_BUCKET_S` côté mobile), parce que lui
 * seul sait QUAND le capteur a réellement écouté : une tranche absente ne veut
 * pas dire « zéro pas », elle veut dire « personne n'écoutait ».
 *
 * `steps === 0` avec une tranche PRÉSENTE est donc une mesure — et c'est même
 * la plus parlante qu'un téléphone sache produire d'un déplacement non pédestre.
 */
export interface StepWindow2026 {
  /** Epoch ms — début de la tranche (inclus). */
  readonly fromT: number;
  /** Epoch ms — fin de la tranche (exclu). Strictement après `fromT`. */
  readonly toT: number;
  /** Pas comptés SUR cette tranche. Jamais négatif, jamais un cumul. */
  readonly steps: number;
}

/** Pas et durée réellement ÉCOUTÉE sur `[fromT, toT]`. */
interface StepsOver {
  readonly steps: number;
  readonly coveredMs: number;
}

/**
 * Pas observés sur un intervalle, au prorata des tranches qui le recouvrent.
 *
 * Le prorata suppose les pas répartis uniformément DANS une tranche : c'est
 * faux à la seconde près, et sans importance à l'échelle d'une tranche d'une
 * minute face à une fenêtre de cinq. Ce qui compte, et qui est exact, c'est
 * `coveredMs` : la part de l'intervalle qu'un podomètre a réellement écoutée.
 */
function stepsOver(
  windows: readonly StepWindow2026[],
  fromT: number,
  toT: number,
): StepsOver {
  const spanMs = toT - fromT;
  let steps = 0;
  let coveredMs = 0;
  if (!(spanMs > 0)) return { steps: 0, coveredMs: 0 };
  for (const w of windows) {
    const widthMs = w.toT - w.fromT;
    if (!Number.isFinite(widthMs) || widthMs <= 0) continue;
    if (!Number.isFinite(w.steps) || w.steps < 0) continue;
    const overlap = Math.min(w.toT, toT) - Math.max(w.fromT, fromT);
    if (overlap <= 0) continue;
    steps += (w.steps * overlap) / widthMs;
    coveredMs += overlap;
  }
  // Des tranches qui se recouvriraient ne doivent pas faire dépasser 100 % :
  // une couverture de 120 % n'existe pas, et la lire comme telle masquerait
  // précisément le trou qu'on cherche.
  return { steps, coveredMs: Math.min(coveredMs, spanMs) };
}

// ════════════════════════════════════════════════════════════════════════════
// LE CONTRÔLE
// ════════════════════════════════════════════════════════════════════════════

/** Les nombres MESURÉS qui fondent (ou refusent de fonder) la lecture. */
export interface DisciplineEvidence2026 {
  /** Vitesse soutenue de la fenêtre retenue (km/h), `null` si non mesurée. */
  readonly sustainedKmh: number | null;
  /** Cadence sur cette même fenêtre (pas/min), `null` si non mesurée. */
  readonly stepsPerMin: number | null;
  /** Durée de la fenêtre, en secondes — le « pendant 5 minutes » du message. */
  readonly windowS: number;
  /** Présent UNIQUEMENT quand rien n'a pu être jugé, et dit ce qui a manqué. */
  readonly reason?: DisciplineUnavailable2026;
}

/** Le verdict : une discipline SOUPÇONNÉE, ou rien — et les chiffres. */
export interface DisciplineVerdict2026 {
  /** La discipline telle qu'elle a été déclarée au départ. */
  readonly declared: Activity;
  /**
   * La discipline que la mesure raconte, ou `null`.
   *
   * `null` NE VEUT PAS DIRE « c'est propre » : il veut dire « rien ne contredit
   * la déclaration, ou rien n'était mesurable ». `evidence.reason` distingue
   * les deux, et c'est ce qui interdit à un écran de féliciter quelqu'un pour
   * une vérification qui n'a pas eu lieu.
   */
  readonly suspected: Activity | null;
  readonly evidence: DisciplineEvidence2026;
}

/**
 * La trace et le podomètre racontent-ils une autre discipline que la déclarée ?
 *
 * ─── COURSE DÉCLARÉE → « ça ressemble à du vélo » ───────────────────────────
 * Une fenêtre soutenue AU-DESSUS de `runLooksLikeBikeKmh` (≈ 21,2 km/h, la
 * borne que le produit appelle lui-même « anti-vélo ») ET une cadence QUASI
 * NULLE (`noStrideMaxSpm`) sur cette même fenêtre.
 *
 * ─── VÉLO DÉCLARÉ → « ça ressemble à de la course » ─────────────────────────
 * Une cadence de FOULÉE (`runCadenceMinSpm`) sur une fenêtre soutenue ET une
 * vitesse SOUS `bikeLooksLikeRunKmh`. Sans cette seconde moitié, un cycliste
 * qui descend une côte avec le téléphone en poche serait invité à « basculer en
 * course » — une proposition absurde.
 *
 * ─── QUELLE FENÊTRE EST RETENUE, ET POURQUOI CELLE-LÀ ───────────────────────
 * Parmi les fenêtres qui portent le motif, la PLUS FRANCHE (la plus rapide en
 * course déclarée, la plus cadencée en vélo déclaré) : c'est elle que l'écran
 * montrera, et montrer la plus tiède reviendrait à sous-dire ce qu'on a vu.
 * Quand AUCUNE ne porte le motif, l'évidence rend quand même les chiffres de la
 * fenêtre la plus extrême : le contrôle a eu lieu, et il dit sur quoi.
 */
export function checkDeclaredDiscipline2026(
  points: readonly RunPoint[],
  stepWindows: readonly StepWindow2026[],
  declared: Activity,
): DisciplineVerdict2026 {
  const windowS = DISCIPLINE_CHECK_2026.windowS;
  const unavailable = (
    reason: DisciplineUnavailable2026,
    sustainedKmh: number | null = null,
  ): DisciplineVerdict2026 => ({
    declared,
    suspected: null,
    evidence: { sustainedKmh, stepsPerMin: null, windowS, reason },
  });

  const windows = sustainedWindows2026(points, declared, windowS);
  if (windows.length === 0) return unavailable('no_window');

  let fastest = windows[0]!;
  for (const w of windows) if (w.kmh > fastest.kmh) fastest = w;

  const usableSteps = stepWindows.some(
    (w) => Number.isFinite(w.steps) && w.steps >= 0 && w.toT > w.fromT,
  );
  if (!usableSteps) return unavailable('no_steps', fastest.kmh);

  /** Les fenêtres que le podomètre a réellement écoutées, avec leur cadence. */
  const judged: { window: SustainedWindow2026; spm: number }[] = [];
  for (const w of windows) {
    const spanMs = w.toT - w.fromT;
    if (!(spanMs > 0)) continue;
    const observed = stepsOver(stepWindows, w.fromT, w.toT);
    if (observed.coveredMs / spanMs < DISCIPLINE_CHECK_2026.stepCoverageMin) continue;
    judged.push({ window: w, spm: (observed.steps / (spanMs / MS_PER_S)) * S_PER_MIN });
  }
  if (judged.length === 0) return unavailable('steps_not_covering', fastest.kmh);

  const verdict = (
    picked: { window: SustainedWindow2026; spm: number },
    suspected: Activity | null,
  ): DisciplineVerdict2026 => ({
    declared,
    suspected,
    evidence: {
      sustainedKmh: picked.window.kmh,
      stepsPerMin: picked.spm,
      windowS,
    },
  });

  if (declared === 'run') {
    const hits = judged.filter(
      (j) => j.window.kmh > DISCIPLINE_CHECK_2026.runLooksLikeBikeKmh &&
        j.spm <= DISCIPLINE_CHECK_2026.noStrideMaxSpm,
    );
    const pool = hits.length > 0 ? hits : judged;
    let picked = pool[0]!;
    for (const j of pool) if (j.window.kmh > picked.window.kmh) picked = j;
    return verdict(picked, hits.length > 0 ? 'bike' : null);
  }

  const hits = judged.filter(
    (j) => j.spm >= DISCIPLINE_CHECK_2026.runCadenceMinSpm &&
      j.window.kmh < DISCIPLINE_CHECK_2026.bikeLooksLikeRunKmh,
  );
  const pool = hits.length > 0 ? hits : judged;
  let picked = pool[0]!;
  for (const j of pool) if (j.spm > picked.spm) picked = j;
  return verdict(picked, hits.length > 0 ? 'run' : null);
}

/**
 * UNE seule tranche couvrant toute la trace, à partir d'un CUMUL de pas.
 *
 * ─── POURQUOI CETTE DÉGRADATION EXISTE, ET CE QU'ELLE COÛTE ─────────────────
 * `ingest_run` ne reçoit et ne scelle qu'un CUMUL (`runs.step_count`) : le
 * serveur n'a pas les tranches que le mobile sait construire. Plutôt que
 * d'inventer une seconde règle « côté serveur », il applique la MÊME fonction à
 * la meilleure évidence qu'il possède — une tranche unique, donc une cadence
 * MOYENNE sur toute la sortie.
 *
 * Conséquence assumée, et écrite pour qu'on ne la découvre pas : le serveur est
 * PLUS INDULGENT que l'écran de fin. Quelqu'un qui court deux kilomètres puis
 * pédale vingt garde une cadence moyenne bien au-dessus du plancher, et le
 * serveur ne verra rien là où le mobile aura vu une fenêtre franche. C'est le
 * sens que le lot veut : l'écran de fin PROPOSE (il a la meilleure mesure), le
 * serveur ne fait que rattraper les cas les plus nets — ceux où aucun pas n'a
 * été compté de toute la sortie.
 *
 * `null` quand aucun cumul n'a été mesuré : l'absence de podomètre ne se
 * convertit pas en « zéro pas ».
 */
export function wholeRunStepWindow2026(
  points: readonly RunPoint[],
  stepCount: number | undefined,
): StepWindow2026[] {
  if (stepCount === undefined || !Number.isFinite(stepCount) || stepCount < 0) return [];
  let fromT = Number.POSITIVE_INFINITY;
  let toT = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    if (!Number.isFinite(p.t)) continue;
    if (p.t < fromT) fromT = p.t;
    if (p.t > toT) toT = p.t;
  }
  if (!(toT > fromT)) return [];
  return [{ fromT, toT, steps: stepCount }];
}
