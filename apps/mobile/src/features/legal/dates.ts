/**
 * GRYD — LA DATE DES DOCUMENTS LÉGAUX ET DES CRÉDITS, formatée d'UNE seule façon.
 *
 * POURQUOI CE FICHIER EXISTE. Les cinq documents légaux affichent leur date au
 * format neutre `jj/mm/aaaa` (`LEGAL_LAST_UPDATED`, i18n/catalog/legal.ts), mais
 * la page Crédits de données affichait `EU_CITIES_SOURCE.generatedAt` BRUT —
 * « 2026-07-23 », la forme du fichier généré, telle quelle. Deux grammaires de
 * date dans la même famille d'écrans, dont une qui n'est pas une date lisible.
 *
 * POURQUOI LE FORMAT NE VARIE PAS PAR LANGUE. C'est délibéré, et c'est le seul
 * endroit de l'app où le formatage ignore la locale : les quatre documents
 * légaux portent la MÊME date d'entrée en vigueur, et c'est une date qui fait
 * FOI. Un lecteur qui verrait « 07/23/2026 » sur une page et « 23/07/2026 » sur
 * une autre aurait deux dates pour un seul fait. Le format ISO du fichier source
 * n'est pas une option non plus : personne ne lit « 2026-07-23 » comme une date
 * d'entrée en vigueur.
 *
 * SANS `Intl` : Hermes n'embarque pas ICU (même contrainte que `numberFormat`),
 * et le rendu doit être identique iOS / Android / Deno.
 *
 * RETOURNE `null` SI CE N'EST PAS UNE DATE. Jamais « NaN/NaN/NaN », jamais un
 * repli sur aujourd'hui : l'appelant masque alors sa ligne. Une date fabriquée
 * sur une page de crédits est exactement le mensonge que la charte interdit.
 */

/** Longueur d'un jour ISO `AAAA-MM-JJ` — mesure de format, pas une règle de jeu. */
const ISO_DAY_LENGTH = 10;

/**
 * Jour ISO `AAAA-MM-JJ` → `JJ/MM/AAAA`. Toute autre forme (horodatage complet,
 * chaîne vide, mois 13, jour 32) rend `null`.
 *
 * La validation est structurelle ET calendaire : `2026-02-31` est bien formé
 * mais n'existe pas — le rendre tel quel ferait afficher une date impossible.
 */
export function formatLegalDay(iso: string): string | null {
  if (iso.length !== ISO_DAY_LENGTH) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m === null) return null;
  const [, year, month, day] = m;
  // Reconstruire la date et la comparer à l'entrée : c'est le seul contrôle qui
  // attrape les jours qui n'existent pas, sans table de longueurs de mois.
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, ISO_DAY_LENGTH) !== iso) return null;
  return `${day}/${month}/${year}`;
}
