/**
 * GRYD — E20/E21 : LA RÉVISION DE LA TRACE LIVE (module PUR, testé Deno).
 *
 * ═══ POURQUOI CE FICHIER EXISTE : UN ÉCRAN QUI TOURNE 90 MINUTES ════════════
 * `RealCourseLive` se re-rend UNE FOIS PAR SECONDE pendant toute l'activité
 * (`useRealRunCore.ts:69` — UI_TICK_MS, le chrono doit avancer). À chaque tick,
 * `computeSnapshot` reconstruit des tableaux NEUFS (`runPipeline.ts:254-263` :
 * `tracePoints` et `traceSegments` sont des `.map()`), donc leur IDENTITÉ change
 * même quand la trace mesurée, elle, n'a pas bougé d'un mètre. Un `useMemo`
 * dépendant de `snapshot.traceSegments` ne mémoïse alors RIEN : il reconstruit
 * la FeatureCollection GeoJSON et la repasse à MapLibre 60 fois par minute,
 * feu rouge et tunnel compris. Sur un écran allumé, GPS actif, pendant 30 à
 * 90 minutes, ce n'est pas un détail de style — c'est de la batterie.
 *
 * ═══ CE QUE LA RÉVISION GARANTIT (et pourquoi elle ne peut pas mentir) ══════
 * Elle rend une chaîne qui CHANGE dès que la trace affichable change. Le terme
 * PORTEUR est `totalFixes`, et il l'est par un théorème, pas par observation :
 *
 *   `computeSnapshot` est PURE et ne reçoit que `state` et `nowTs`
 *   (`runPipeline.ts:195`). `traceSegments` se dérive de `smoothed`, lui-même
 *   dérivé de `cleanTrace(state.fixes, activity)` — AUCUNE de ces étapes ne lit
 *   `nowTs` (`runPipeline.ts:261`, `engine/gps.ts:137,257`). La discipline est
 *   figée au départ (`useRealRunCore.ts:649`). Donc, à discipline constante,
 *   `traceSegments` est fonction de `state.fixes` SEUL — et `state.fixes` ne
 *   change que par ajout, ce que `totalFixes` compte exactement
 *   (`engine/gps.ts:200` : `totalFixes: fixes.length`).
 *   ⇒ révision inchangée ⇒ `state.fixes` inchangé ⇒ trace inchangée.
 *
 * POURQUOI PAS SIMPLEMENT LE NOMBRE DE POINTS GARDÉS. Parce qu'il faudrait
 * alors prouver qu'un fix tardif ne modifie JAMAIS un point déjà gardé — et ce
 * n'est pas gratuit : `cleanTrace` termine par `dropStationaryJitter`
 * (`engine/gps.ts:200`), une passe qui relit TOUTE la liste gardée et supprime
 * les points intérieurs d'un arrêt prolongé, et `smoothTrace` (`gps.ts:257`)
 * recalcule chaque point avec une fenêtre médiane qui déborde sur ses voisins.
 * Un compteur de points gardés demanderait donc un raisonnement fin sur deux
 * passes couplées ; `totalFixes` ne demande rien du tout. `keptPoints`, le
 * nombre de tronçons et le dernier point restent dans la clé en
 * ceinture-bretelles (coût nul), mais la garantie repose sur `totalFixes` seul.
 *
 * ═══ CE QUE CE MODULE N'EST PAS ═════════════════════════════════════════════
 * Ce n'est PAS une règle de jeu : aucune décision de capture, de fermeture ou
 * de claim n'en dépend (le serveur reste seul juge). C'est une clé de cache
 * d'AFFICHAGE — au même titre que le pas de recalcul de la couverture de
 * défense (`RealCourseLive.tsx`, `coverageTick`). Elle ne change donc AUCUN
 * seuil et n'a rien à faire dans `game-rules.ts`.
 *
 * PURE : aucun import React, aucune I/O, aucune horloge.
 */

/** Le strict minimum d'un snapshot pour en tirer une révision de trace. */
export interface TraceRevisionInput {
  /** Fixes BRUTS reçus depuis le départ — le terme porteur (cf. docblock). */
  readonly totalFixes: number;
  /** Points gardés par le moteur après nettoyage. */
  readonly keptPoints: number;
  /** Trace affichable, sous-échantillonnée (son dernier point suffit ici). */
  readonly tracePoints: readonly { readonly lat: number; readonly lng: number }[];
  /** Tronçons coupés aux trous de signal (seul leur NOMBRE entre dans la clé). */
  readonly traceSegments: readonly (readonly unknown[])[];
}

/**
 * Clé de cache de la trace affichable. Deux snapshots d'une MÊME activité qui
 * rendent la même chaîne ont exactement la même trace à dessiner.
 *
 * Volontairement une CHAÎNE et non un objet : une dépendance de `useMemo` se
 * compare par `Object.is`, et un objet neuf à chaque tick relancerait le calcul
 * qu'on cherche précisément à éviter.
 */
export function traceRevision(s: TraceRevisionInput): string {
  const last = s.tracePoints[s.tracePoints.length - 1];
  // Coordonnées brutes, sans arrondi : arrondir reviendrait à décider qu'un
  // déplacement sous le seuil « ne compte pas » — une décision de mesure, que
  // ce module n'a pas à prendre (l'app ne lisse jamais pour faire joli).
  const tail = last === undefined ? 'none' : `${last.lat},${last.lng}`;
  return `${s.totalFixes}|${s.keptPoints}|${s.traceSegments.length}|${tail}`;
}
