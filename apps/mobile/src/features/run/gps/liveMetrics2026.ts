/**
 * GRYD — CE QUE L'ÉCRAN DE COURSE MESURE PENDANT QU'ON COURT (LOT R, 11/09/2026).
 *
 * ═══ POURQUOI CE MODULE EXISTE ══════════════════════════════════════════════
 * Demande fondateur : « Vérifie qu'on a bien au minimum toutes les informations
 * que Strava et INTVL peuvent donner. » L'audit
 * (`docs/product/GRYD_ECRAN_DE_COURSE_2026_09.md`) a trouvé un bandeau à TROIS
 * chiffres : distance, temps actif, allure MOYENNE. Manquaient, entre autres :
 * l'allure INSTANTANÉE (la seule qui bouge encore après une heure), les splits
 * au kilomètre, la cadence, le dénivelé positif, la précision GPS, et les tours
 * manuels d'INTVL.
 *
 * ═══ CE QU'IL NE REFAIT PAS ═════════════════════════════════════════════════
 * Presque tout existait, écrit et testé, ailleurs. Ce module RELIE, il ne
 * réimplémente pas — c'est la seule façon que le chiffre lu en courant et le
 * chiffre lu le soir dans le détail de la sortie soient le MÊME chiffre :
 *   · splits et dénivelé → `features/journal/metrics.ts` (`splitsFrom`,
 *     `elevationFrom`, hystérésis `ELEVATION_NOISE_M`, `SPLIT_DISTANCE_M`) ;
 *   · vitesse sur fenêtre récente → `engine/liveView.recentSpeedMps`, déjà
 *     utilisée par la réduction de sécurité E08, déjà testée, et qui sait déjà
 *     ne pas franchir une discontinuité de signal ;
 *   · seuil d'immobilité → `GPS_PAUSE_SPEED_MS` (game-rules), le MÊME que celui
 *     de la pause automatique : au-dessous, le moteur considère qu'on est
 *     arrêté, et l'écran ne doit pas afficher une allure là où le chrono se fige.
 * Seules deux mécaniques sont neuves parce qu'elles n'existaient nulle part : la
 * CADENCE (échantillons du podomètre) et les TOURS MANUELS.
 *
 * ═══ LA RÈGLE, PARTOUT : `null` PLUTÔT QU'UN CHIFFRE FABRIQUÉ ═══════════════
 * Chaque fonction rend `null` dès que la mesure n'est pas possible, et l'écran
 * fait alors disparaître le chiffre en gardant son libellé (convention posée par
 * `liveRate.ts` : un tiret cadratin, jamais un « 0 » nu). C'est la loi L8 : une
 * valeur non mesurée DISPARAÎT, elle ne vaut pas zéro.
 *
 * PUR : zéro React, zéro capteur, zéro horloge implicite (`nowTs` entre par
 * paramètre), zéro i18n. Testable sous Deno comme le reste du moteur.
 */
import {
  type Activity,
  GPS_PAUSE_SPEED_MS,
  LIVE_CADENCE_WINDOW_S,
  LIVE_LAP_MIN_DURATION_S,
  LIVE_PACE_WINDOW_S,
} from '@klaim/shared';
import {
  elevationFrom,
  splitsFrom,
  type JournalPoint,
  type Split,
} from '../../journal/metrics';
import type { CleanFix } from './engine/gps';
import { recentSpeedMps } from './engine/liveView';
import { haversineM } from './engine/validation';

/** Millisecondes par seconde — unité, pas une règle de jeu. */
const MS_PER_S = 1_000;
/** Mètres par kilomètre — unité, pas une règle de jeu. */
const M_PER_KM = 1_000;
/** Secondes par minute — unité (cadence en pas/minute). */
const S_PER_MIN = 60;

/**
 * Trace NETTOYÉE du moteur → points tels que le journal les consomme.
 *
 * Deux vocabulaires pour la même chose : le moteur GPS dit `ts`/`accuracy`/
 * `gapBefore`, le contrat serveur et le journal disent `t`/`acc`/`breakBefore`.
 * La traduction vit ICI, une seule fois. La recopier dans l'écran aurait suffi à
 * ce qu'un jour l'un des deux oublie `breakBefore` — et un split se mettrait
 * alors à compter les mètres d'un trou de signal que personne n'a courus.
 */
export function journalPointsFrom(fixes: readonly CleanFix[]): JournalPoint[] {
  return fixes.map((f) => ({
    lat: f.lat,
    lng: f.lng,
    t: f.ts,
    acc: f.accuracy,
    ...(typeof f.alt === 'number' && Number.isFinite(f.alt) ? { alt: f.alt } : {}),
    ...(f.gapBefore === true || f.breakBefore === true ? { breakBefore: true as const } : {}),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// ALLURE INSTANTANÉE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Allure des `LIVE_PACE_WINDOW_S` dernières secondes, en s/km. `null` si elle
 * n'est pas mesurable.
 *
 * TROIS RAISONS DE RENDRE `null`, ET AUCUNE NE PRODUIT DE CHIFFRE :
 *  · la fenêtre ne contient pas deux relevés exploitables (départ, trou de
 *    signal, pause manuelle qui gèle les fixes) ;
 *  · la vitesse mesurée est sous `GPS_PAUSE_SPEED_MS` — c'est le seuil auquel le
 *    moteur considère qu'on est ARRÊTÉ. Au-dessous, l'allure tendrait vers
 *    l'infini et le bandeau afficherait « 47'12 » à quelqu'un qui attend au feu
 *    rouge : un reproche, et une mesure fausse (L19) ;
 *  · la vitesse n'est pas finie.
 *
 * La conversion se fait dans CE sens (vitesse → allure) parce que la mesure
 * primitive de la fenêtre est une vitesse. À vélo, `liveRateDisplay` reconvertit
 * en km/h par la formule unique d'`effortRate` : une seule chaîne, jamais deux.
 */
export function livePaceSPerKm(
  points: readonly CleanFix[],
  nowTs: number,
  windowS: number = LIVE_PACE_WINDOW_S,
): number | null {
  const speed = recentSpeedMps(
    points.map((p) => ({ lat: p.lat, lng: p.lng, ts: p.ts, ...(p.gapBefore === true ? { gapBefore: true as const } : {}) })),
    nowTs,
    windowS * MS_PER_S,
  );
  if (speed === null || !Number.isFinite(speed)) return null;
  if (speed < GPS_PAUSE_SPEED_MS) return null;
  return M_PER_KM / speed;
}

// ════════════════════════════════════════════════════════════════════════════
// SPLITS AU KILOMÈTRE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Les kilomètres de la sortie EN COURS, du premier au kilomètre entamé.
 *
 * C'est littéralement `splitsFrom` du journal, appliqué à la trace live : la
 * liste que le coureur voit défiler pendant sa sortie et celle qu'il relira le
 * soir sont produites par la même fonction, avec la même interpolation à la
 * borne du kilomètre. Sans ce partage, un « 5'42 au 3ᵉ km » annoncé en courant
 * aurait pu devenir « 5'39 » deux heures plus tard, sans que personne ne sache
 * lequel croire.
 */
export function liveSplits(points: readonly CleanFix[], activity: Activity): Split[] {
  return splitsFrom(journalPointsFrom(points), activity);
}

/**
 * Le DERNIER kilomètre COMPLET, celui que Strava annonce à voix haute. `null`
 * tant qu'aucun kilomètre entier n'a été bouclé : un kilomètre entamé n'est pas
 * comparable aux autres, et le présenter comme le « dernier split » flatterait
 * ou punirait une allure au hasard de l'endroit où on en est.
 */
export function lastCompleteSplit(splits: readonly Split[]): Split | null {
  for (let i = splits.length - 1; i >= 0; i -= 1) {
    const split = splits[i];
    if (split !== undefined && split.complete) return split;
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// DÉNIVELÉ POSITIF
// ════════════════════════════════════════════════════════════════════════════

/**
 * D+ cumulé (m) depuis le départ, ou `null` si la trace ne porte AUCUNE
 * altitude — c'est-à-dire sur tout appareil dont la plateforme n'en rend pas.
 *
 * `elevationFrom` (journal) applique l'hystérésis `ELEVATION_NOISE_M` : sans
 * elle, sommer toutes les variations positives d'une sortie plate produirait
 * 200 m de dénivelé imaginaire. On ne recopie ni le calcul ni le seuil ; on
 * traduit seulement `available: false` en `null`, parce que l'écran de course
 * n'affiche pas un profil (il n'a pas la place) mais UN chiffre, qui doit
 * disparaître quand il n'est pas mesuré.
 */
export function liveElevationGainM(
  points: readonly CleanFix[],
  activity: Activity,
): number | null {
  const profile = elevationFrom(journalPointsFrom(points), activity);
  return profile.available ? profile.gainM : null;
}

// ════════════════════════════════════════════════════════════════════════════
// CADENCE (pas / minute)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Un relevé de podomètre : « à cet instant, le compteur cumulé valait N ».
 *
 * Le tracker en pousse un à chaque émission de `Pedometer.watchStepCount`. Ce
 * n'est PAS un intervalle régulier : iOS émet par paquets, Android au fil des
 * pas. La cadence se déduit donc de la DIFFÉRENCE entre deux échantillons, pas
 * d'une fréquence supposée.
 */
export interface StepSample {
  /** Epoch ms. */
  readonly ts: number;
  /** Compteur CUMULÉ depuis le début de l'abonnement (jamais un delta). */
  readonly steps: number;
}

/**
 * Cadence en pas par minute sur les `LIVE_CADENCE_WINDOW_S` dernières secondes,
 * ou `null` quand elle n'est pas mesurable.
 *
 * ─── `null` N'EST PAS ZÉRO, ET C'EST TOUT LE SUJET ──────────────────────────
 * Trois situations distinctes rendent `null` — aucune ne doit produire un
 * chiffre, parce qu'un « 0 spm » affiché à un coureur affirme qu'il ne pose plus
 * un pied par terre :
 *  · aucun podomètre sur cet appareil (navigateur, simulateur, permission
 *    « Mouvement et forme » refusée) : le tracker n'a jamais poussé
 *    d'échantillon, la liste est vide ;
 *  · la fenêtre ne contient pas deux échantillons (démarrage, capteur qui n'a
 *    pas encore parlé) ;
 *  · l'écart de temps est nul ou négatif (horloge qui saute).
 * En revanche, un podomètre qui a réellement tourné et compté ZÉRO pas sur la
 * fenêtre rend bien `0` : c'est une MESURE, et c'est même la plus parlante que
 * fasse un téléphone (elle est la signature d'un déplacement non pédestre — cf.
 * `motionIntegrity.ts`, qui l'envoie au serveur pour la même raison).
 */
export function cadenceSpm(
  samples: readonly StepSample[],
  nowTs: number,
  windowS: number = LIVE_CADENCE_WINDOW_S,
): number | null {
  const from = nowTs - windowS * MS_PER_S;
  let first: StepSample | null = null;
  let last: StepSample | null = null;
  for (const sample of samples) {
    if (!Number.isFinite(sample.ts) || !Number.isFinite(sample.steps)) continue;
    if (sample.ts < from) {
      // Le dernier échantillon ANTÉRIEUR à la fenêtre en est la borne gauche :
      // sans lui, une fenêtre contenant un seul relevé ne mesurerait rien alors
      // qu'on sait exactement combien de pas ont été faits depuis le précédent.
      first = sample;
      continue;
    }
    first ??= sample;
    last = sample;
  }
  if (first === null || last === null || first === last) return null;
  const elapsedS = (last.ts - first.ts) / MS_PER_S;
  if (!(elapsedS > 0)) return null;
  const steps = last.steps - first.steps;
  if (!(steps >= 0)) return null; // compteur remis à zéro : on ne devine pas
  return (steps / elapsedS) * S_PER_MIN;
}

// ════════════════════════════════════════════════════════════════════════════
// TOURS MANUELS (le « lap » d'INTVL)
// ════════════════════════════════════════════════════════════════════════════

/** Un tour bouclé (ou le tour EN COURS, `closed: false`). */
export interface Lap {
  /** 1 pour le premier tour. */
  readonly index: number;
  readonly distanceM: number;
  readonly durationS: number;
  /** s/km, ou `null` si le tour n'a pas avancé (arrêt complet). */
  readonly paceSPerKm: number | null;
  /** `false` = tour en cours : son allure n'est pas encore comparable. */
  readonly closed: boolean;
}

/**
 * Les tours d'une sortie, à partir des instants où le bouton « Tour » a été
 * pressé. PURE.
 *
 * ─── UN TOUR EST UNE COUPURE, PAS UN SECOND CHRONOMÈTRE ────────────────────
 * Les marques sont des HORODATAGES, jamais des mesures : distance et durée de
 * chaque tour se relisent sur la trace, avec la même règle que partout ailleurs
 * (une paire ne compte pas si elle ouvre sur une discontinuité). Un tour ne peut
 * donc jamais totaliser plus que la sortie, et la somme des tours retombe sur
 * la distance affichée en haut de l'écran — ce qu'un compteur séparé, incrémenté
 * à part, aurait fini par démentir.
 *
 * ─── LE PLANCHER (`LIVE_LAP_MIN_DURATION_S`) EST APPLIQUÉ ICI ───────────────
 * Une marque posée moins de `LIVE_LAP_MIN_DURATION_S` après la précédente est
 * IGNORÉE : c'est un rebond tactile ou un double appui, pas un tour. L'ignorer
 * ici plutôt qu'au bouton garantit que la règle vaut aussi pour des marques
 * relues d'un buffer restauré.
 */
export function lapsFrom(
  points: readonly CleanFix[],
  marks: readonly number[],
  nowTs: number,
): Lap[] {
  if (points.length < 2) return [];
  const start = points[0]?.ts;
  if (start === undefined) return [];
  // Bornes retenues : le départ, puis chaque marque assez espacée de la
  // précédente, puis l'instant courant. Les marques sont triées : une horloge
  // qui saute ne doit pas produire un tour de durée négative.
  const bounds: number[] = [start];
  for (const mark of [...marks].sort((a, b) => a - b)) {
    const previous = bounds[bounds.length - 1] ?? start;
    if (!Number.isFinite(mark)) continue;
    if (mark - previous < LIVE_LAP_MIN_DURATION_S * MS_PER_S) continue;
    bounds.push(mark);
  }
  const end = Math.max(nowTs, points[points.length - 1]?.ts ?? nowTs);
  const out: Lap[] = [];
  for (let i = 0; i < bounds.length; i += 1) {
    const from = bounds[i];
    const to = bounds[i + 1] ?? end;
    if (from === undefined || to <= from) continue;
    let distanceM = 0;
    let durationS = 0;
    for (let k = 1; k < points.length; k += 1) {
      const before = points[k - 1];
      const current = points[k];
      if (before === undefined || current === undefined) continue;
      if (current.gapBefore === true || current.breakBefore === true) continue;
      // La paire appartient au tour quand son point d'ARRIVÉE y tombe : une
      // paire est indivisible, et la couper au prorata inventerait un point.
      if (current.ts <= from || current.ts > to) continue;
      const dtS = (current.ts - before.ts) / MS_PER_S;
      if (!(dtS > 0)) continue;
      distanceM += haversineM(before, current);
      durationS += dtS;
    }
    out.push({
      index: i + 1,
      distanceM,
      durationS,
      paceSPerKm: distanceM > 0 && durationS > 0 ? (durationS * M_PER_KM) / distanceM : null,
      closed: bounds[i + 1] !== undefined,
    });
  }
  return out;
}

/**
 * Une nouvelle marque de tour est-elle recevable À CET INSTANT ? PURE.
 *
 * L'écran s'en sert pour ne pas peindre un bouton qui refuserait en silence :
 * pendant les `LIVE_LAP_MIN_DURATION_S` qui suivent un tour, « Tour » est
 * DÉSACTIVÉ plutôt que muet — « aucun bouton mort », et le geste refusé se voit.
 */
export function canMarkLap(
  startedAt: number,
  marks: readonly number[],
  nowTs: number,
): boolean {
  const last = marks.length > 0 ? Math.max(...marks) : startedAt;
  return nowTs - last >= LIVE_LAP_MIN_DURATION_S * MS_PER_S;
}
