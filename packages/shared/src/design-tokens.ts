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
 * fallback libre le plus proche est Poppins. Mono conservé (fonctionnel : timers/codes).
 */
export const fonts = {
  display: 'ITCAvantGardeStd-Md', // titres, gros chiffres — fallback: Poppins-Medium
  text: 'ITCAvantGardeStd-Bk', // UI, paragraphes, labels — fallback: Poppins-Regular
  serif: 'Lora', // accent éditorial (citations, longform)
  mono: 'SpaceMono', // timers, codes crew, étiquettes carte (exception fonctionnelle)
  displayFallback: 'Poppins-Medium',
  textFallback: 'Poppins-Regular',
} as const;

/** Échelle typo mobile (addendum §E). Les stats héros dominent chaque écran de résultat. */
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40, hero: 64, heroMax: 88 } as const;

export const radii = { card: 20, pill: 999 } as const;
export const spacing = { cardPadding: 20 } as const;

/**
 * AMENDEMENT-22 — RÈGLE DE PROFONDEUR GRYD (« UI en scènes, pas en boîtes »).
 * Le fond sombre est de l'ESPACE, pas un remplissage de rectangles. Une page ne
 * doit JAMAIS empiler plusieurs niveaux de cards imbriquées. Les écrans
 * consomment cette échelle nommée au lieu de réinventer la profondeur.
 *
 * Max 3 niveaux VISIBLES simultanément :
 *  - N0 `elevation.base`    (colors.noir)     — le FOND. Sert d'espace, jamais de surface.
 *  - N1 `elevation.surface` (colors.carbone)  — UNE surface par section (card principale ·
 *                                                bottom sheet · preview). Jamais deux imbriquées.
 *  - N2 `elevation.raised`  (colors.carbone2) — INTERACTION : bouton · pill · item sélectionné.
 *  - N3 état RARE            (glow · `borderState` chartreuse) — alerte · sélection · rareté · live.
 *
 * Contours (`borderState`) : 80 % des surfaces SANS contour ; les 20 % avec contour sont
 * RÉSERVÉS aux états (interaction active · statut · alerte · rareté · sélection). Si tout a un
 * contour, plus rien n'a d'importance — les sections se séparent par l'ESPACE, pas par des boîtes.
 *
 * Doctrine d'écran : UN SEUL gros CTA chartreuse ; actions secondaires LÉGÈRES (icône + label,
 * pas de grosse card) ; groupes de choix = UN segmented control ; détails AU TAP (jamais en
 * sous-cards permanentes) ; chiffres GRANDS.
 */
export const elevation = {
  /** N0 — Fond global (espace). Ne jamais l'utiliser comme surface d'un bloc. */
  base: colors.noir,
  /** N1 — Surface unique d'une section (card principale, bottom sheet, preview). */
  surface: colors.carbone,
  /** N2 — Interaction : bouton, pill, item de segmented sélectionné, input. */
  raised: colors.carbone2,
} as const;
export type ElevationLevel = keyof typeof elevation;

/**
 * Bordures d'ÉTAT (règle 80/20). Un contour signale toujours un état, jamais une simple
 * séparation de bloc.
 *  - `hairline`  : filet neutre (blanc 10 %) — séparateur DISCRET, pas un cadre de card.
 *  - `active`    : sélection / interaction en cours (chartreuse pleine — état N3).
 *  - `activeSoft`: sélection douce / glow (chartreuse 40 %) — contour de territoire, focus léger.
 * Jamais de contour chartreuse sur fond clair (contraste 1,2:1 — illisible).
 */
export const borderState = {
  hairline: colors.grisLigne,
  active: colors.chartreuse,
  activeSoft: colors.chartreuse40,
} as const;
export type BorderStateName = keyof typeof borderState;

/** Motion (addendum §G). */
export const motion = {
  transitionMs: 225, // 200-250 ms, ease-out
  celebrationWaveMs: 400,
  celebrationCountMs: 800,
  holdToStopMs: 1_200, // stop protégé : maintenir 1,2 s
  runButtonPulseMs: 2_000,
  toastDismissMs: 2_500,
} as const;

/**
 * AMENDEMENT-08 §2 — palette FONCTIONNELLE de jeu (Game UI « scènes de jeu »).
 * Chaque couleur lit un ÉTAT DE JEU, jamais une décoration, jamais un CTA/nav
 * générique (le CTA primaire reste la chartreuse, ton crew/action).
 * Réutilise les couleurs de conflit AMENDEMENT-05 + 3 ajouts (verify/danger/carbon).
 */
export const gameColors = {
  /** Ton crew / action / gain — la chartreuse unique de la charte. */
  crew: colors.chartreuse,
  /** Rival / attaque subie ou menée. */
  rival: '#FF5C33',
  /** Contesté / rare / événement. */
  contested: '#8B5CF6',
  /** Victoire / or / récompense de saison. */
  gold: '#E7B84C',
  /** GRYD Verify / info de confiance. */
  verify: '#6FB7FF',
  /** Danger / decay urgent (rouge éteint, jamais criard). */
  danger: '#D64545',
  /** Surfaces profondes de scène de jeu (cartes HUD, fonds de coffre). */
  carbon: '#101210',
} as const;
export type GameColorName = keyof typeof gameColors;

/** 8 motifs de différenciation des crews adverses (addendum §D). */
export const foePatterns = [
  'hatch45', 'hatch-45', 'dots', 'crosshatch', 'vlines', 'hlines', 'dashes', 'rings',
] as const;
export type FoePattern = (typeof foePatterns)[number];
