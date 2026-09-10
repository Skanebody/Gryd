/**
 * GRYD — LES DEUX SURFACES SUR LESQUELLES UN GRAPHIQUE SE POSE.
 *
 * L'app a deux fonds vivants : les écrans à châssis sombre (`StackScreen` +
 * `colors.*` — /historique, /course/[id]) et les écrans clairs du cahier de
 * septembre (`refonteColors` — Profil, Statistiques, Résultat). Un graphique
 * doit pouvoir vivre sur les deux SANS que ses couleurs soient recodées à
 * chaque appel : c'est ainsi qu'un gris finit par être écrit en dur.
 *
 * DEUX COULEURS MAXIMUM PAR GRAPHIQUE (règle reprise de la planche E18) :
 * l'accent porte la série qui parle, le neutre porte le contexte. Jamais une
 * couleur par entrée, jamais une légende à décoder.
 *
 * ADR-008 : toutes les valeurs viennent des tokens. Aucun hexadécimal ici.
 */
import { colors, refonteColors } from '@klaim/shared';

export interface ChartPalette {
  /** La série qui porte le message. Chartreuse, et elle seule. */
  readonly accent: string;
  /** Remplissage sous la courbe — le même accent, transparent. */
  readonly accentFill: string;
  /** La série de contexte (les autres barres, la ligne de comparaison). */
  readonly neutral: string;
  /** Lignes de grille : présentes, presque invisibles. */
  readonly grid: string;
  /** Texte des valeurs. */
  readonly ink: string;
  /** Texte des axes et des légendes. */
  readonly muted: string;
  /** Fond d'une piste (barre vide, rail) — jamais un cadre. */
  readonly track: string;
}

export const darkChartPalette: ChartPalette = {
  accent: colors.chartreuse,
  accentFill: colors.chartreuse14,
  neutral: colors.grisLigne,
  grid: colors.blanc12,
  ink: colors.blanc,
  muted: colors.gris,
  track: colors.carbone2,
};

export const lightChartPalette: ChartPalette = {
  accent: refonteColors.accent,
  // Le fond clair n'a pas de token d'accent transparent : on réutilise celui de
  // la carte (16 % de chartreuse), lisible sur blanc comme sur carbone.
  accentFill: colors.chartreuse14,
  neutral: refonteColors.border,
  grid: refonteColors.border,
  ink: refonteColors.ink,
  muted: refonteColors.muted,
  track: refonteColors.surfaceMuted,
};

/** Le fond sur lequel l'écran appelant pose le graphique. */
export type ChartTone = 'dark' | 'light';

export function chartPalette(tone: ChartTone): ChartPalette {
  return tone === 'light' ? lightChartPalette : darkChartPalette;
}
