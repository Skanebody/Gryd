/**
 * KLAIM — Tokens design (ADDENDUM-DESIGN §C + §E, gelés pour la Saison 0).
 * Toute couleur hors tokens = bug. Jamais de chartreuse sur fond clair (contraste 1,2:1).
 */

export const colors = {
  noir: '#0A0B09', // fond global (nuance chaude, pas #000 pur — anti-smearing OLED)
  carbone: '#141613', // surfaces, cartes
  carbone2: '#1D201B', // surfaces élevées, inputs
  blanc: '#FAFAF7', // texte principal, icônes
  gris: '#8A8F84', // texte secondaire, labels
  grisLigne: 'rgba(250,250,247,0.10)', // bordures 1 px, séparateurs (blanc 8-12 %)
  chartreuse: '#B4FF0D', // accent unique — 4 emplois : moi/crew, CTA primaire, gains, live
  chartreuse14: 'rgba(180,255,13,0.14)', // remplissage de MON territoire
  chartreuse40: 'rgba(180,255,13,0.40)', // contours de territoire, glows
  eau: '#0D1112', // fond de carte : eau
} as const;

/** Rendu carte égocentré (addendum §D — AMENDEMENT-01). */
export const mapTokens = {
  mineFill: colors.chartreuse14,
  mineStroke: colors.chartreuse40,
  foeFill: 'rgba(250,250,247,0.06)', // + motif par crew (8 motifs), jamais par teinte
  foeStroke: 'rgba(250,250,247,0.22)',
  neutralStroke: 'rgba(250,250,247,0.05)',
  roads: 'rgba(250,250,247,0.07)',
  parks: 'rgba(250,250,247,0.03)',
  water: colors.eau,
} as const;

/**
 * AMENDEMENT-03 (typo Outcrowd) : ITC Avant Garde Gothic Std (Md = display/UI, Bk = texte) + Lora
 * (accent éditorial). Avant Garde est commerciale — tant que la licence n'est pas acquise, le
 * fallback libre le plus proche est Josefin Sans. Mono conservé (fonctionnel : timers/codes).
 */
export const fonts = {
  display: 'ITCAvantGardeStd-Md', // titres, gros chiffres — fallback: JosefinSans-Medium
  text: 'ITCAvantGardeStd-Bk', // UI, paragraphes, labels — fallback: JosefinSans-Regular
  serif: 'Lora', // accent éditorial (citations, longform)
  mono: 'SpaceMono', // timers, codes crew, étiquettes carte (exception fonctionnelle)
  displayFallback: 'JosefinSans-Medium',
  textFallback: 'JosefinSans-Regular',
} as const;

/** Échelle typo mobile (addendum §E). Les stats héros dominent chaque écran de résultat. */
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40, hero: 64, heroMax: 88 } as const;

export const radii = { card: 20, pill: 999 } as const;
export const spacing = { cardPadding: 20 } as const;

/** Motion (addendum §G). */
export const motion = {
  transitionMs: 225, // 200-250 ms, ease-out
  celebrationWaveMs: 400,
  celebrationCountMs: 800,
  holdToStopMs: 1_200, // stop protégé : maintenir 1,2 s
  runButtonPulseMs: 2_000,
  toastDismissMs: 2_500,
} as const;

/** 8 motifs de différenciation des crews adverses (addendum §D). */
export const foePatterns = [
  'hatch45', 'hatch-45', 'dots', 'crosshatch', 'vlines', 'hlines', 'dashes', 'rings',
] as const;
export type FoePattern = (typeof foePatterns)[number];
