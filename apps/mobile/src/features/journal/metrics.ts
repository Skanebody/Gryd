/**
 * GRYD — LES MESURES D'UNE SORTIE, DÉRIVÉES DE SA TRACE (cahier §8.2 et G13).
 *
 * ═══ POURQUOI CE MODULE EXISTE (10/09/2026) ═════════════════════════════════
 * Le détail d'une sortie affichait trois chiffres (distance · durée · allure
 * moyenne) et s'arrêtait là, avec une note en gris expliquant qu'aucun tracé
 * n'était archivé. Cette note DÉCRIVAIT LE SERVEUR DE JUILLET : depuis le
 * chantier `ingest_run/tracePersist.ts`, `runs.polyline_masked` est écrit, et
 * depuis la migration 0118, `runs.trace_points_2026` conserve les points
 * COMPLETS de la sortie (lat, lng, horodatage, précision) — c'est l'évidence
 * que le serveur relit lui-même pour rejouer une capture
 * (`ingest_run/refonte2026.ts:179`). Les splits, la courbe d'allure et la carte
 * n'attendaient donc aucune migration : personne n'avait écrit le calcul.
 *
 * ═══ LA MÊME CONVENTION QUE LE SERVEUR, SINON DEUX VÉRITÉS ══════════════════
 * `analyzeTrace2026` (packages/engine/src/capture2026.ts) accumule distance et
 * durée sur les paires de points CONSÉCUTIVES, en sautant une paire quand :
 *   · le point porte `breakBefore` (rupture attestée par l'enregistreur) ;
 *   · l'écart de temps est nul ou négatif (horodatages désordonnés) ;
 *   · l'écart de temps dépasse `pointMaxGapS` de la discipline (silence GPS :
 *     rien n'atteste de ce qui s'est passé entre les deux relevés).
 * Ce module applique EXACTEMENT cette règle. C'est ce qui fait que la somme des
 * splits retombe sur la distance que le serveur a écrite dans `runs.distance_m`
 * — au lieu de produire un second total qui la contredirait de 200 m.
 *
 * ⚠ Metro ne résout pas les imports Deno `.ts` de `@klaim/engine` (constat déjà
 * payé par `features/crew/rules.ts`, `features/map/territoriesSource.ts`) : la
 * règle est RÉ-IMPLÉMENTÉE ici, ses bornes lues dans `@klaim/shared`
 * (`activityRules`), et un test miroir relit la source du moteur pour échouer
 * le jour où les deux divergeraient. `haversineM` vient, lui, de la copie
 * GÉNÉRÉE du moteur (`features/run/gps/engine/validation.ts`) : une formule de
 * distance recopiée à la main est une divergence qui attend son heure.
 *
 * ═══ CE QUE CE MODULE N'INVENTE JAMAIS ══════════════════════════════════════
 * · Sans horodatage (une trace masquée n'en porte pas), il n'y a NI split NI
 *   courbe d'allure : `splitsFrom` rend une liste vide plutôt qu'une allure
 *   moyenne étalée sur des kilomètres qu'elle n'a pas mesurés.
 * · Sans altitude, `elevationFrom` rend `available: false`. AUCUNE source de
 *   GRYD ne fournit d'altitude aujourd'hui (`RunPoint` = lat/lng/t/acc) : le
 *   calcul existe pour que le jour où une source en fournira, le profil ne soit
 *   pas improvisé — jamais pour dessiner un relief déduit d'un fond de carte.
 * · Une sortie plus courte qu'un kilomètre rend UN split partiel, marqué comme
 *   tel : un split partiel présenté comme complet flatterait l'allure.
 *
 * PUR : zéro React, zéro réseau, zéro horloge, zéro i18n. Testable sous Deno.
 */
import { activityRules, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
// Copie GÉNÉRÉE du moteur (scripts/sync-game-rules.mjs) : une seule formule de
// distance dans tout le produit. Ce module ne l'édite pas, il la consomme.
import { haversineM } from '../run/gps/engine/validation';

/** Millisecondes par seconde — unité, pas une règle de jeu. */
const MS_PER_S = 1_000;
/** Mètres par kilomètre — unité, pas une règle de jeu. */
const M_PER_KM = 1_000;

/**
 * LA LONGUEUR D'UN SPLIT : un kilomètre. Ce n'est pas une constante de JEU (elle
 * ne décide d'aucune capture, d'aucun point, d'aucun XP) — c'est l'unité dans
 * laquelle un coureur lit sa sortie, la même que celle de l'allure `s/km` déjà
 * écrite par le serveur dans `runs.avg_pace_s_km`. Elle vit donc ici, nommée,
 * et pas en dur au milieu d'une boucle.
 */
export const SPLIT_DISTANCE_M = M_PER_KM;

/**
 * FENÊTRE DE LISSAGE DE LA COURBE D'ALLURE, en mètres. Une allure calculée
 * point à point est illisible : à 1 Hz, deux points séparés de 2 m avec 10 m de
 * précision GPS donnent des allures qui sautent du simple au triple. La courbe
 * est donc mesurée sur une fenêtre GLISSANTE de 200 m — assez large pour que le
 * bruit du capteur s'annule, assez courte pour qu'une côte ou un feu rouge se
 * voie encore. C'est une convention d'AFFICHAGE : elle ne change aucun chiffre
 * annoncé (distance, durée, allure moyenne, splits restent des mesures brutes).
 */
export const PACE_WINDOW_M = 200;

/**
 * Nombre maximal d'échantillons de la courbe. Un tracé de 1 Hz sur deux heures
 * porte 7 200 points ; en dessiner autant dans 300 pt de large produit un trait
 * illisible et un `Path` SVG de plusieurs dizaines de milliers de caractères.
 * On échantillonne à pas de distance CONSTANT : la courbe garde sa forme, l'axe
 * reste une distance, et rien n'est inventé entre deux échantillons.
 */
export const PACE_SAMPLES_MAX = 64;

/**
 * SEUIL ANTI-BRUIT DU DÉNIVELÉ, en mètres. L'altitude GPS d'un téléphone oscille
 * de quelques mètres à l'arrêt : sommer toutes les variations positives d'une
 * sortie plate produirait 200 m de dénivelé imaginaire. On ne compte donc une
 * montée qu'une fois qu'elle a dépassé ce seuil depuis le dernier point de
 * référence (hystérésis). Convention de MESURE, pas une règle de jeu — aucune
 * capture, aucun point, aucun XP n'en dépend.
 */
export const ELEVATION_NOISE_M = 3;

/**
 * Un point de trace tel que ce module le consomme. Surensemble tolérant de
 * `RunPoint` (@klaim/shared) : `t` est OPTIONNEL parce qu'une trace masquée
 * (`runs.polyline_masked`) ne porte que la géométrie, et `alt` est prévu sans
 * être fourni par aucune source d'aujourd'hui.
 */
export interface JournalPoint {
  readonly lat: number;
  readonly lng: number;
  /** Horodatage epoch ms. Absent ⇒ ni split ni allure, et c'est dit à l'écran. */
  readonly t?: number;
  /** Précision horizontale en mètres. */
  readonly acc?: number;
  /** Altitude en mètres. Aucune source GRYD ne la fournit à ce jour. */
  readonly alt?: number;
  /** Discontinuité attestée : la paire qui l'ouvre ne compte pas. */
  readonly breakBefore?: true;
}

/** Un point est-il exploitable tout court ? (mêmes bornes que le moteur.) */
export function isLocatable(point: JournalPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Math.abs(point.lat) <= 90 &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lng) <= 180
  );
}

/** Une paire de points consécutifs qui COMPTE, avec ses deux mesures. */
interface Leg {
  readonly distanceM: number;
  readonly durationS: number;
  readonly from: JournalPoint;
  readonly to: JournalPoint;
}

/**
 * Les paires qui comptent, dans l'ordre. C'est LE point de convergence avec le
 * serveur : tout ce que ce module dérive passe par ici, donc rien ne peut
 * accumuler une distance que `analyzeTrace2026` aurait écartée.
 */
function legs(points: readonly JournalPoint[], activity: Activity): Leg[] {
  const maxGapMs = activityRules(activity).pointMaxGapS * MS_PER_S;
  const out: Leg[] = [];
  for (let i = 1; i < points.length; i++) {
    const before = points[i - 1];
    const current = points[i];
    if (!before || !current) continue;
    if (!isLocatable(before) || !isLocatable(current)) continue;
    if (current.breakBefore === true) continue;
    const from = before.t;
    const to = current.t;
    // Sans horodatage des DEUX côtés, la paire porte une distance mais aucune
    // durée : elle ne peut alimenter ni un split ni une allure. On la garde
    // avec `durationS = 0` et les fonctions temporelles la refusent en amont.
    if (typeof from !== 'number' || typeof to !== 'number') {
      out.push({ distanceM: haversineM(before, current), durationS: 0, from: before, to: current });
      continue;
    }
    const gapMs = to - from;
    if (gapMs <= 0 || gapMs > maxGapMs) continue;
    out.push({
      distanceM: haversineM(before, current),
      durationS: gapMs / MS_PER_S,
      from: before,
      to: current,
    });
  }
  return out;
}

/** La trace porte-t-elle un temps exploitable de bout en bout ? */
export function hasTiming(points: readonly JournalPoint[]): boolean {
  let seen = 0;
  for (const point of points) {
    if (typeof point.t === 'number' && Number.isFinite(point.t)) seen++;
    if (seen >= 2) return true;
  }
  return false;
}

/** Totaux dérivés de la trace — jamais substitués aux totaux du serveur. */
export interface TraceTotals {
  readonly distanceM: number;
  /** Somme des durées RETENUES (les silences GPS n'y sont pas). */
  readonly movingS: number;
  /** Du premier au dernier horodatage. `null` si la trace n'en porte pas. */
  readonly elapsedS: number | null;
  readonly points: number;
}

export function traceTotals(
  points: readonly JournalPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
): TraceTotals {
  let distanceM = 0;
  let movingS = 0;
  for (const leg of legs(points, activity)) {
    distanceM += leg.distanceM;
    movingS += leg.durationS;
  }
  const stamps = points
    .map((p) => p.t)
    .filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
  const first = stamps[0];
  const last = stamps[stamps.length - 1];
  const elapsedS =
    first !== undefined && last !== undefined && last > first ? (last - first) / MS_PER_S : null;
  return { distanceM, movingS, elapsedS, points: points.length };
}

// ═════════════════════════════════════════════════════════════════════════════
// SPLITS
// ═════════════════════════════════════════════════════════════════════════════

export interface Split {
  /** 1 pour le premier kilomètre. */
  readonly index: number;
  /** Distance RÉELLE du split : `SPLIT_DISTANCE_M`, sauf le dernier. */
  readonly distanceM: number;
  readonly durationS: number;
  /** Secondes par kilomètre. Toujours dérivée des deux mesures ci-dessus. */
  readonly paceSPerKm: number;
  /** `false` = kilomètre entamé et non terminé : son allure n'est pas comparable. */
  readonly complete: boolean;
}

/**
 * Découpe la sortie en kilomètres. La frontière tombe rarement sur un point
 * relevé : on INTERPOLE le temps au prorata de la distance à l'intérieur de la
 * paire qui franchit la borne — c'est la seule façon d'obtenir un « 5’42 au
 * 3ᵉ km » qui veuille dire quelque chose. Cette interpolation ne crée aucune
 * mesure : elle répartit une durée déjà mesurée.
 *
 * Trace sans horodatage ⇒ `[]` : un split est une DURÉE sur une distance, pas
 * une découpe géométrique.
 */
export function splitsFrom(
  points: readonly JournalPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
): Split[] {
  if (!hasTiming(points)) return [];
  const out: Split[] = [];
  let acc = 0;
  let accS = 0;
  let index = 1;
  for (const leg of legs(points, activity)) {
    let distance = leg.distanceM;
    let duration = leg.durationS;
    if (!(distance > 0) || !(duration > 0)) {
      // Une paire immobile (ou sans durée) ajoute son temps au kilomètre en
      // cours sans le faire avancer : un arrêt fait partie du split.
      accS += Math.max(0, duration);
      continue;
    }
    while (acc + distance >= SPLIT_DISTANCE_M) {
      const need = SPLIT_DISTANCE_M - acc;
      const share = need / distance;
      const takenS = duration * share;
      out.push({
        index,
        distanceM: SPLIT_DISTANCE_M,
        durationS: accS + takenS,
        paceSPerKm: accS + takenS,
        complete: true,
      });
      index++;
      distance -= need;
      duration -= takenS;
      acc = 0;
      accS = 0;
    }
    acc += distance;
    accS += duration;
  }
  // Le reste : un kilomètre entamé. Il n'apparaît que s'il a une longueur
  // mesurable — un résidu de quelques centimètres n'est pas un split.
  if (acc >= 1 && accS > 0) {
    out.push({
      index,
      distanceM: acc,
      durationS: accS,
      paceSPerKm: (accS * M_PER_KM) / acc,
      complete: false,
    });
  }
  return out;
}

/**
 * Le kilomètre le plus rapide, parmi les splits COMPLETS uniquement. Comparer
 * un kilomètre entier à un résidu de 120 m couronnerait presque toujours le
 * résidu. `null` quand aucun kilomètre entier n'a été couru.
 */
export function bestSplitIndex(splits: readonly Split[]): number | null {
  let best: Split | null = null;
  for (const split of splits) {
    if (!split.complete) continue;
    if (best === null || split.paceSPerKm < best.paceSPerKm) best = split;
  }
  return best === null ? null : best.index;
}

// ═════════════════════════════════════════════════════════════════════════════
// COURBE D'ALLURE
// ═════════════════════════════════════════════════════════════════════════════

export interface PaceSample {
  /** Distance depuis le départ, en mètres — l'axe de la courbe. */
  readonly distanceM: number;
  /** Secondes par kilomètre sur la fenêtre glissante centrée ici. */
  readonly paceSPerKm: number;
}

/**
 * La courbe d'allure, échantillonnée à pas de distance constant et lissée sur
 * `PACE_WINDOW_M`. Rend `[]` quand la trace n'a pas de temps, ou quand elle est
 * plus courte que la fenêtre : une courbe de deux points n'est pas une courbe,
 * c'est une affirmation.
 */
export function paceSeries(
  points: readonly JournalPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
  windowM: number = PACE_WINDOW_M,
  maxSamples: number = PACE_SAMPLES_MAX,
): PaceSample[] {
  if (!hasTiming(points)) return [];
  // Nœuds cumulés (distance, temps) : la courbe se lit ensuite par différences.
  const distances: number[] = [0];
  const times: number[] = [0];
  let distance = 0;
  let time = 0;
  for (const leg of legs(points, activity)) {
    if (!(leg.durationS > 0)) continue;
    distance += leg.distanceM;
    time += leg.durationS;
    distances.push(distance);
    times.push(time);
  }
  const total = distance;
  if (total < windowM || times.length < 3) return [];
  /** Temps écoulé à une distance donnée, par interpolation linéaire entre nœuds. */
  const timeAt = (d: number): number => {
    if (d <= 0) return 0;
    if (d >= total) return time;
    let lo = 0;
    let hi = distances.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((distances[mid] ?? 0) <= d) lo = mid;
      else hi = mid;
    }
    const d0 = distances[lo] ?? 0;
    const d1 = distances[hi] ?? d0;
    const t0 = times[lo] ?? 0;
    const t1 = times[hi] ?? t0;
    if (d1 <= d0) return t0;
    return t0 + ((t1 - t0) * (d - d0)) / (d1 - d0);
  };
  const count = Math.min(maxSamples, Math.max(2, Math.floor(total / (windowM / 2))));
  const half = windowM / 2;
  const out: PaceSample[] = [];
  for (let i = 0; i < count; i++) {
    // Les échantillons sont centrés à l'intérieur des bornes : une fenêtre qui
    // dépasse le départ mesurerait une distance plus courte que `windowM` et
    // afficherait une allure fantaisiste au premier point de la courbe.
    const at = half + ((total - windowM) * i) / (count - 1);
    const span = timeAt(at + half) - timeAt(at - half);
    if (!(span > 0)) continue;
    out.push({ distanceM: at, paceSPerKm: (span * M_PER_KM) / windowM });
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
// ALTITUDE
// ═════════════════════════════════════════════════════════════════════════════

export interface ElevationSample {
  readonly distanceM: number;
  readonly altM: number;
}

export interface ElevationProfile {
  /** `false` = la trace ne porte pas d'altitude. Aucun profil n'est dessiné. */
  readonly available: boolean;
  readonly gainM: number;
  readonly lossM: number;
  readonly minM: number | null;
  readonly maxM: number | null;
  readonly samples: readonly ElevationSample[];
}

const NO_ELEVATION: ElevationProfile = {
  available: false,
  gainM: 0,
  lossM: 0,
  minM: null,
  maxM: null,
  samples: [],
};

/**
 * Dénivelé cumulé et profil, avec hystérésis `ELEVATION_NOISE_M`. La règle : on
 * ne valide une montée (ou une descente) que lorsqu'elle dépasse le seuil
 * depuis le dernier point de RÉFÉRENCE, et la référence se déplace alors. Une
 * oscillation de ±2 m sur un plateau ne produit donc aucun dénivelé, alors
 * qu'une somme naïve en fabriquerait des dizaines de mètres.
 */
export function elevationFrom(
  points: readonly JournalPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
  noiseM: number = ELEVATION_NOISE_M,
): ElevationProfile {
  const withAlt = points.filter(
    (p) => typeof p.alt === 'number' && Number.isFinite(p.alt) && isLocatable(p),
  );
  if (withAlt.length < 2) return NO_ELEVATION;

  const samples: ElevationSample[] = [];
  let distance = 0;
  let min = Infinity;
  let max = -Infinity;
  const first = points.find((p) => typeof p.alt === 'number');
  if (first?.alt !== undefined) {
    samples.push({ distanceM: 0, altM: first.alt });
    min = first.alt;
    max = first.alt;
  }
  for (const leg of legs(points, activity)) {
    distance += leg.distanceM;
    const alt = leg.to.alt;
    if (typeof alt !== 'number' || !Number.isFinite(alt)) continue;
    samples.push({ distanceM: distance, altM: alt });
    if (alt < min) min = alt;
    if (alt > max) max = alt;
  }
  if (samples.length < 2) return NO_ELEVATION;

  let gainM = 0;
  let lossM = 0;
  let reference = samples[0]?.altM ?? 0;
  for (const sample of samples) {
    const delta = sample.altM - reference;
    if (delta >= noiseM) {
      gainM += delta;
      reference = sample.altM;
    } else if (delta <= -noiseM) {
      lossM += -delta;
      reference = sample.altM;
    }
  }
  return {
    available: true,
    gainM,
    lossM,
    minM: Number.isFinite(min) ? min : null,
    maxM: Number.isFinite(max) ? max : null,
    samples,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// LA BOUCLE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * L'écart entre le départ et l'arrivée, en mètres. `null` si la trace est trop
 * courte. ⚠ Ce n'est PAS un verdict de capture : refermer sa boucle ne suffit
 * pas à prendre du terrain (le serveur juge l'aire, la compacité, les
 * exclusions). Cette valeur ne sert qu'à décrire la FORME de la sortie.
 */
export function closureGapM(points: readonly JournalPoint[]): number | null {
  const located = points.filter(isLocatable);
  const first = located[0];
  const last = located[located.length - 1];
  if (!first || !last || located.length < 3) return null;
  return haversineM(first, last);
}
