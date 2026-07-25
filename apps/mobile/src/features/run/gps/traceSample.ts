/**
 * GRYD — sous-échantillonnage d'AFFICHAGE de la trace (§10 trace live).
 *
 * Purement MOBILE et purement VISUEL : ne vit PAS dans `engine/gps.ts` (généré,
 * miroir serveur/web + test de drift) — le serveur reçoit la trace décimée de
 * `decimateForPayload`, jamais celle-ci. Fonction pure, testable.
 */

/**
 * Plafonne un tableau à `max` éléments en gardant TOUJOURS le premier et le dernier
 * (départ et position courante), et des éléments régulièrement espacés entre eux.
 * La forme du tracé est préservée — le vrai tracé, moins dense, jamais inventé.
 * Une course de 2 h (~7 000 points) redevient une polyligne SVG légère à rendre
 * ~1×/s sans jamais faire ramer le live.
 */
export function sampleEvenly<T>(arr: readonly T[], max: number): T[] {
  if (max < 2 || arr.length <= max) return [...arr];
  const out: T[] = [];
  const step = (arr.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) {
    const v = arr[Math.min(arr.length - 1, Math.round(i * step))];
    if (v !== undefined) out.push(v);
  }
  return out;
}

/**
 * E07 — TRACÉ MESURÉ vs TRACÉ INCERTAIN. Le moteur marque `gapBefore` sur le
 * premier point qui suit un trou de signal (tunnel, relock GPS) : le trait
 * qu'on dessinerait à travers ce trou n'a JAMAIS été parcouru sous mesure — la
 * distance ne le compte d'ailleurs pas (totalDistanceM saute les gapBefore).
 * On coupe donc la trace en TRONÇONS continus, que l'écran peint en plein ; ce
 * qui les relie sera peint en pointillé (« tracé incertain », planche E07).
 *
 * Chaque tronçon est sous-échantillonné au prorata de sa longueur, pour que le
 * TOTAL reste sous le plafond d'affichage (≥ 2 points par tronçon : un segment
 * a besoin de ses deux bouts).
 */
export function splitAndSampleAtGaps<T extends { gapBefore?: true }>(
  points: readonly T[],
  maxTotal: number,
): T[][] {
  const segments: T[][] = [];
  let current: T[] = [];
  for (const p of points) {
    if (p.gapBefore === true && current.length > 0) {
      segments.push(current);
      current = [];
    }
    current.push(p);
  }
  if (current.length > 0) segments.push(current);

  const total = points.length;
  if (total <= maxTotal) return segments.filter((s) => s.length >= 2);
  return segments
    .map((seg) => sampleEvenly(seg, Math.max(2, Math.round((maxTotal * seg.length) / total))))
    .filter((seg) => seg.length >= 2);
}
