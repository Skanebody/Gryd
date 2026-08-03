/**
 * GRYD — LA TRACE PENDANT LA COURSE. PUR (lot M4).
 *
 * Le strict minimum pour que l'écran de course dise des choses VRAIES : une
 * distance, et rien de plus.
 *
 * ─── POURQUOI UN HAVERSINE ICI PLUTÔT QUE CELUI DU MOTEUR ───────────────────
 * `@klaim/engine` en a un (`validation.ts:haversineM`), et c'est LUI qui fait
 * foi pour tout ce qui décide un claim. Mais le moteur ne se bundle pas tel quel
 * dans Expo : il est RECOPIÉ par `scripts/sync-game-rules.mjs` vers des chemins
 * choisis, et les seuls existants aujourd'hui sont des chemins legacy.
 *
 * Plutôt que d'ajouter une cible de synchronisation à la hâte, ce module refait
 * les huit lignes de trigonométrie — ET NE DÉCIDE RIEN AVEC. La distance
 * affichée est de l'INFORMATION de course ; la distance qui compte pour le
 * territoire est recalculée côté serveur, sur la trace envoyée. Aucun des deux
 * chiffres n'autorise l'autre, donc aucun ne peut faire mentir l'autre.
 *
 * ⚠️ CE QUI N'EST PAS ENCORE LÀ : la jauge de fermeture (« il te manque 84 m »)
 * a besoin de `loopClosureVerdict`, qui vit dans `engine/hexing.ts` — lequel
 * importe h3-js et ne peut donc pas tomber dans le bundle mobile en l'état.
 * L'extraction est un arbitrage à part entière (SALVAGE le prévoit pour
 * `features/run/gps/**`), pas un raccourci de fin de lot. Inscrit au BACKLOG.
 */

export interface TracePoint {
  readonly lng: number;
  readonly lat: number;
  /** Millisecondes epoch. Injecté par l'appelant — ce module n'a pas d'horloge. */
  readonly t: number;
}

/** Rayon moyen de la Terre (m). Constante physique, pas une règle de jeu. */
const R_TERRE_M = 6_371_000;

/** Distance orthodromique entre deux points, en mètres. */
export function distanceM(a: TracePoint, b: TracePoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRE_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Longueur cumulée de la trace, en mètres. Zéro pour 0 ou 1 point. */
export function traceDistanceM(points: readonly TracePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a === undefined || b === undefined) continue;
    total += distanceM(a, b);
  }
  return total;
}

/**
 * Distance formatée en km, 2 décimales. `null` tant qu'on n'a rien parcouru.
 *
 * `null` et « 0,00 » ne sont pas la même chose : au tout début d'une course, un
 * compteur à zéro se lit comme une panne. La constitution interdit le « 0 » nu
 * pour cette raison — l'écran affiche alors un tiret, pas un échec.
 */
export function formatKm(meters: number): string | null {
  if (!Number.isFinite(meters) || meters <= 0) return null;
  const km = Math.round(meters / 10) / 100;
  if (km <= 0) return null;
  // Virgule décimale : c'est la seule langue du MVP à en avoir besoin, et
  // `toFixed` produit un point. Le remplacement est fait ICI plutôt que dans
  // l'écran, pour qu'il n'y ait qu'un seul endroit à changer le jour où EN
  // devient exposé.
  return km.toFixed(2).replace('.', ',');
}

/**
 * Chrono `mm:ss`, ou `h:mm:ss` au-delà d'une heure. PURE.
 *
 * Écrit à la main plutôt que via `Date` : un `new Date(ms)` appliquerait le
 * fuseau de l'appareil à une DURÉE, ce qui décale le chrono d'une heure entière
 * dans la moitié du monde — et personne ne s'en aperçoit en développant à Paris.
 */
export function formatChrono(elapsedMs: number): string {
  const total = !Number.isFinite(elapsedMs) || elapsedMs < 0 ? 0 : Math.floor(elapsedMs / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const deux = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${deux(m)}:${deux(s)}` : `${deux(m)}:${deux(s)}`;
}
