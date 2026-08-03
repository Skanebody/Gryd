// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/closure.ts (drift testé côté Deno).

/**
 * GRYD — COMMENT UNE TRACE SE REFERME. PURE, ET SANS H3.
 *
 * ─── POURQUOI CE MODULE EXISTE (extrait de `hexing.ts` le 03/08/2026) ───────
 * Le MASTER pose une frontière explicite : « H3 invisible backend, polygones
 * organiques frontend » (§29). Or `hexing.ts` tenait les deux à la fois —
 * l'index spatial du serveur (`hexesForSegments`, `enclosedCells`) ET la
 * géométrie de fermeture, qui est précisément ce que le joueur LIT pendant sa
 * course (« il te manque 84 m »). Un fichier qui mélange les deux est celui
 * qu'il faut couper.
 *
 * La coupure a un déclencheur concret : la jauge du Live Run a besoin de
 * `loopClosureVerdict` dans le bundle Expo, et `hexing.ts` importe `h3-js` en
 * tête de module — donc rien de ce fichier ne pouvait être recopié vers le
 * mobile sans embarquer l'index spatial avec. Mais le déclencheur n'est pas la
 * raison : ce module est nommé pour ce qu'il EST (la fermeture d'une trace),
 * pas pour ce qu'il n'a pas. Un module « tout ce qui n'a pas de h3 » aurait été
 * un artefact de bundler ; celui-ci est une couture du domaine.
 *
 * ─── CE QU'IL NE FAIT PAS ───────────────────────────────────────────────────
 * Aucune cellule, aucun index, aucune I/O, aucune horloge. Il dit si une trace
 * boucle et de combien elle a manqué — jamais ce que ça rapporte. `hexing.ts`
 * réexporte tout ce qui suit : AUCUN appelant existant ne change.
 *
 * ⚠️ Ce fichier est RECOPIÉ vers le mobile par `scripts/sync-game-rules.mjs`
 * (avec `validation.ts`, dont il tire `haversineM`). Y ajouter un import de
 * `h3-js` casserait le bundle Expo — et annulerait la raison d'être du fichier.
 */
import {
  type Activity,
  activityRules,
  DEFAULT_ACTIVITY,
} from '@klaim/shared';
import { haversineM } from './validation';

// Constantes physiques / géométriques — pas des règles de jeu.
const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;

/** Point minimal lat/lng (un RunPoint est structurellement compatible). */
export interface LatLngPoint {
  lat: number;
  lng: number;
}

/**
 * Aire (m²) du polygone formé par la trace refermée sur elle-même : shoelace
 * sur une projection équirectangulaire centrée (coordonnées relatives au 1er
 * point pour la stabilité numérique). Précision largement suffisante à
 * l'échelle d'une course ; ne sert qu'à écarter les polygones DÉGÉNÉRÉS
 * (aller-retour → aire ~0), jamais à compter des zones (ça, c'est h3).
 */
export function traceAreaM2(points: readonly LatLngPoint[]): number {
  const first = points[0];
  if (first === undefined) return 0;
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const cosLat0 = Math.cos((latSum / points.length) * RAD_PER_DEG);
  const x = (p: LatLngPoint): number => (p.lng - first.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
  const y = (p: LatLngPoint): number => (p.lat - first.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
  let doubled = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    doubled += x(a) * y(b) - x(b) * y(a);
  }
  return Math.abs(doubled) / 2;
}

/**
 * Trace candidate au polygone de boucle (AMENDEMENT-12 §B). PURE. La boucle
 * n'est détectable que sur une trace claimable CONTIGUË : exactement UN
 * segment claimable — aucun segment exclu du claim (§3.2 : allure hors
 * bornes, véhicule) ni coupure GPS entre le départ et la fermeture. Sinon,
 * aplatir les segments restants relierait leurs extrémités en ligne droite :
 * l'aire parcourue en segment exclu (voiture…) resterait ENFERMÉE dans le
 * polygone et serait capturée en intérieur, alors que le périmètre n'a pas
 * été couru en entier. Retourne le segment unique, ou null si la trace n'est
 * pas contiguë → couloir seul (« trait »), jamais d'intérieur.
 */
export function loopTracePoints<P extends LatLngPoint>(
  segments: readonly (readonly P[])[],
): readonly P[] | null {
  return segments.length === 1 ? segments[0]! : null;
}

/**
 * Longueur (m) d'une trace OUVERTE — somme des segments, SANS le segment de
 * fermeture. À ne pas confondre avec `ringPerimeterM`, qui referme l'anneau :
 * confondre les deux surestimerait une trace non bouclée du seul écart
 * départ/arrivée, et ferait passer une sortie courte pour une boucle ratée.
 */
export function traceLengthM(points: readonly LatLngPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1]!, points[i]!);
  return total;
}

/** Écart (m) entre le départ et l'arrivée d'une trace. `null` si trace inexploitable. */
export function closureGapM(points: readonly LatLngPoint[]): number | null {
  if (points.length < 2) return null;
  return haversineM(points[0]!, points[points.length - 1]!);
}

/** Par quel mécanisme une boucle a été refermée. */
export type LoopClosure = 'tolerance' | 'assisted' | 'self_intersection';

/**
 * Comment cette trace se referme — ou de combien elle a manqué. PURE.
 *
 * ─── POURQUOI CETTE FONCTION EXISTE, ET PAS SEULEMENT UN BOOLÉEN ────────────
 * Une boucle ouverte est une TENSION : le joueur a couru en croyant refermer.
 * Lui rendre `false` est exact et inutilisable — l'écran ne peut alors dire que
 * « raté », ce que le MASTER interdit (« jamais d'échec sec à 98 % », L19
 * « l'app n'accuse jamais »). Cette fonction rend donc le MANQUE, en mètres :
 * c'est ce qui permet d'écrire « Il manquait 23 m pour fermer ta boucle. »
 *
 * ─── LES TROIS ISSUES ───────────────────────────────────────────────────────
 *   · `closed`   — écart ≤ tolérance. Le joueur a bouclé, point.
 *   · `assisted` — tolérance < écart ≤ bande assistée : GRYD referme À SA
 *     PLACE par un segment droit. Il a fait le tour, il lui manquait un
 *     trottoir. L'issue est NOMMÉE plutôt que confondue avec `closed` : le
 *     produit doit savoir ce qu'il a donné — pour pouvoir le dire à l'écran, et
 *     pour mesurer en Saison 0 si la bande est bien réglée.
 *   · `open`     — au-delà. `missingM` dit de combien, toujours > 0.
 *
 * `missingM` est mesuré depuis la BANDE ASSISTÉE, pas depuis la tolérance :
 * c'est la distance qu'il fallait réellement parcourir en moins pour que la
 * boucle soit accordée. Annoncer un manque plus grand que le vrai serait
 * décourager pour rien.
 */
export interface LoopClosureVerdict {
  readonly kind: 'closed' | 'assisted' | 'open';
  /** Écart départ/arrivée mesuré (m). `null` = trace inexploitable. */
  readonly gapM: number | null;
  /** Mètres manquants pour que la boucle soit accordée. `0` sauf si `open`. */
  readonly missingM: number;
}

export function loopClosureVerdict(
  points: readonly LatLngPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
): LoopClosureVerdict {
  const rules = activityRules(activity);
  const gapM = closureGapM(points);
  // Trace inexploitable : on ne prétend NI qu'elle ferme, NI de combien elle
  // manque. `missingM = 0` avec `kind: 'open'` serait lu « il ne manquait
  // rien », donc on rend l'écart `null` et l'appelant se tait.
  if (gapM === null || !Number.isFinite(gapM)) {
    return { kind: 'open', gapM: null, missingM: 0 };
  }
  if (gapM <= rules.loopCloseToleranceM) return { kind: 'closed', gapM, missingM: 0 };
  if (gapM <= rules.loopCloseAssistM) return { kind: 'assisted', gapM, missingM: 0 };
  // Arrondi au mètre SUPÉRIEUR : annoncer « 0 m manquants » sur un écart de
  // 60,4 m ferait mentir la phrase. Un mètre de trop est honnête, zéro non.
  return { kind: 'open', gapM, missingM: Math.ceil(gapM - rules.loopCloseAssistM) };
}
