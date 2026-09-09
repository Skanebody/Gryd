/**
 * GRYD — présentation de la progression : trois calculs qui n'ont rien à faire
 * dans un rendu, et que l'écran se trompait à faire.
 */

/**
 * G23 : « Trois étapes proches sont visibles. »
 *
 * L'écran calculait `entries.slice(nextIndex + 1, nextIndex + 4)` : la fenêtre
 * commençait APRÈS le prochain jalon, donc le sautait. Le symptôme qui le
 * prouve est dans le même fichier : la frise stylait un point « prochain »
 * (`item.id === next?.id`) que ce découpage rendait structurellement
 * inatteignable — un style qui ne pouvait jamais s'appliquer.
 */
export function seasonTimelineWindow2026<T extends { id: string; threshold: number }>(
  entries: readonly T[], current: number | undefined, showAll: boolean,
): { nextIndex: number; next: T | null; timeline: T[] } {
  const nextIndex = entries.findIndex((item) => item.threshold > (current ?? 0));
  const next = nextIndex >= 0 ? entries[nextIndex]! : null;
  const timeline = showAll ? [...entries] : next ? entries.slice(nextIndex, nextIndex + 3) : entries.slice(-3);
  return { nextIndex, next, timeline };
}

/**
 * Une journée CIVILE (`AAAA-MM-JJ`) n'est pas un instant : `new Date('2026-09-11')`
 * la lit à minuit UTC, ce qui affiche la veille à l'ouest de Greenwich. On la
 * formate donc en UTC après l'avoir reconstruite composant par composant.
 * Une valeur qu'on ne sait pas lire est rendue TELLE QUELLE : mieux vaut un
 * `AAAA-MM-JJ` visible qu'une date inventée.
 */
export function formatCivilDay2026(day: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return day;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const value = new Date(Date.UTC(year, month - 1, date));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== date) return day;
  try {
    return value.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  } catch { return day; }
}

/**
 * Un identifiant IANA (`Europe/Paris`) est une clé technique, pas un lieu. On
 * met en avant le lieu — le dernier segment, qui est ce que la zone nomme
 * vraiment — sans PERDRE la région, sinon « Paris » et « Paris, Texas »
 * deviendraient le même réglage.
 */
export function readableTimeZone2026(zone: string): string {
  const humanise = (part: string) => part.replace(/_/g, ' ');
  const parts = zone.split('/').filter((part) => part.length > 0);
  if (parts.length === 0) return zone;
  const place = humanise(parts[parts.length - 1]!);
  const region = parts.slice(0, -1).map(humanise).join(' / ');
  return region ? `${place} · ${region}` : place;
}
