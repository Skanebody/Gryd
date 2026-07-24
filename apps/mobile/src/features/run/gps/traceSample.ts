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
