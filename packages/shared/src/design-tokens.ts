/**
 * KLAIM — Tokens design (ADDENDUM-DESIGN §C + §E, gelés pour la Saison 0).
 * Toute couleur hors tokens = bug. Jamais de chartreuse sur fond clair (contraste 1,2:1).
 */

// ─── DIRECTION NIGHT PRINT (refonte Vague 1, 2026) ──────────────────────────
// Remplace la charte #B4FF0D / noir plat par l'échelle CARBONE + chartreuse
// #C9FF38 (« B amendée », GRYD — Fondations.dc.html). Les NOMS de tokens sont
// conservés → toute l'app se re-skinne sans renommage. Toute couleur hors tokens
// = bug. Jamais de chartreuse sur fond clair. Chartreuse en QUOTA 8–10 % de l'écran.
export const colors = {
  noir: '#0A0D0C', // carbon-950 — fond principal (N0). Nuance chaude anti-smearing OLED.
  carbonImmersive: '#060807', // carbon-1000 — immersif : live, splash, capture
  carbonDeep: '#101412', // carbon-900 — surfaces profondes (fonds de HUD/coffre)
  carbone: '#171C19', // surface-800 — cards, sheets (N1)
  carbone2: '#202622', // surface-700 — surélevé, désactivé (N2)
  blanc: '#F5F7F4', // texte principal, icônes
  gris: '#AEB7B0', // texte secondaire, labels
  grisFaible: '#778079', // texte tertiaire, méta faible, map label
  grisLigne: '#313934', // line-600 — séparateurs 1 px (solide sur l'échelle carbone)
  chartreuse: '#C9FF38', // accent unique — 4 emplois : moi/crew, CTA primaire, gains, live
  chartreusePressed: '#AEEB1F', // état PRESSÉ du CTA chartreuse
  // Remplissage de MON territoire. Fill de possession (LOD carte) : Night Print
  // « Moi » = chartreuse 16–17 %, jamais un aplat lourd (la trace reste dominante).
  chartreuse14: 'rgba(201,255,56,0.16)', // remplissage de MON territoire (fill possession)
  chartreuse40: 'rgba(201,255,56,0.40)', // contours de territoire, glows
  eau: '#0D1112', // fond de carte : eau (bleu pétrole désaturé)
  // Déclinaisons ALPHA du blanc + scrims (§ charte : tokens, jamais rgba inliné) —
  // bordures/overlays translucides des HUD (course-live, FAB, scrims de modale).
  blanc12: 'rgba(245,247,244,0.12)', // bordure hairline renforcée
  blanc14: 'rgba(245,247,244,0.14)', // bordure de FAB/overlay
  blanc22: 'rgba(245,247,244,0.22)', // bordure marquée
  blanc35: 'rgba(245,247,244,0.35)', // bordure forte (état actif discret)
  scrim: 'rgba(0,0,0,0.45)', // voile léger sous une couche flottante
  scrimStrong: 'rgba(5,5,5,0.72)', // voile plein d'une modale/sheet
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
 * NIGHT PRINT (refonte Vague 1) : Inter Tight (titres, chiffres) · Inter
 * (interface) · JetBrains Mono (labels). Chargées au splash (apps/mobile lib/fonts.ts).
 * ⚠ @expo-google-fonts nomme CHAQUE GRAISSE comme une FAMILLE distincte, et en
 * React Native une telle famille IGNORE `fontWeight` : c'est la FAMILLE qui porte
 * la graisse. On expose donc une famille par graisse utile ; un style choisit la
 * bonne et n'ajoute JAMAIS de fontWeight par-dessus.
 */
export const fonts = {
  display: 'InterTight_800ExtraBold', // hero / display / victoire
  displayBold: 'InterTight_700Bold', // H1 / H2 / titres forts (720/700)
  displaySemi: 'InterTight_600SemiBold', // titres de sheet / card (650)
  text: 'Inter_400Regular', // corps
  textMedium: 'Inter_500Medium', // corps fort / secondaire (500)
  textSemi: 'Inter_600SemiBold', // labels, boutons, méta (600/650)
  textBold: 'Inter_700Bold', // emphase de corps
  mono: 'JetBrainsMono_500Medium', // timers, codes crew, étiquettes carte
  serif: 'Lora', // accent éditorial (non chargé — fallback système)
  displayFallback: 'Poppins-Medium',
  textFallback: 'Poppins-Regular',
} as const;

/** Échelle typo mobile (addendum §E). Les stats héros dominent chaque écran de résultat. */
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40, hero: 64, heroMax: 88 } as const;

/**
 * Rayons (audit UI 2026). 4 paliers + pill : `sm` petit composant · `control`
 * bouton/input/conteneur d'icône · `card` surface/sheet · `pill` capsule. Le set
 * ferme les 134 littéraux (les paliers 8 et 12 n'avaient pas de nom → 14 rayons
 * de fait). `card`/`pill` inchangés (rétro-compat).
 */
export const radii = { sm: 8, control: 12, card: 20, pill: 999 } as const;

/**
 * Échelle d'espacement sur grille 4 px (audit UI 2026). AVANT : `cardPadding`
 * était le SEUL token → ~6 % de tokenisation, 1 429 littéraux, grille de fait
 * 2 px. `cardPadding` (= lg = 20) est CONSERVÉ dans l'objet pour les usages
 * existants `spacing.cardPadding` ; les nouveaux écrans consomment l'échelle.
 * Marge horizontale d'écran = `lg` (axe unique).
 */
export const spacing = {
  xxs: 4, // micro-espace (icône↔texte, gap de pills)
  xs: 8, // espace interne faible
  sm: 12, // espace compact (gap de liste, padding de chip)
  md: 16, // espace standard (padding de card compacte)
  lg: 20, // séparation de blocs = marge d'écran = ANCIEN cardPadding
  xl: 24, // séparation de sections
  xxl: 32, // séparation majeure
  cardPadding: 20, // = lg — conservé pour les 86 usages `spacing.cardPadding`
} as const;

/**
 * Tailles d'icônes (audit UI 2026). AVANT : 18 tailles littérales, 31 % sur
 * cible. Typer `IconProps.size` sur ces valeurs refuse 13/15/17/18 à la
 * compilation. Migration : 11→12, 13→12, 14→16, 15→16, 17→16, 18→20, 22→24…
 */
export const iconSizes = { xs: 12, sm: 16, md: 20, lg: 24, display: 48 } as const;
export type IconSize = (typeof iconSizes)[keyof typeof iconSizes];

/**
 * Gabarits d'interaction (audit UI 2026). Le rôle « bouton primaire » existait
 * en 9 hauteurs (33→56) → on gèle 2 hauteurs + le plancher tactile WCAG 2.5.5.
 * Consommés par le futur composant `Button` partagé.
 */
export const sizes = {
  buttonLg: 56, // CTA principal plein écran / bas de page
  buttonMd: 48, // CTA secondaire, boutons en ligne, sheet
  touchTarget: 44, // plancher tactile absolu (minHeight/hitSlop garanti)
} as const;

/**
 * Rôles typographiques fermes (audit UI 2026) — 184 combinaisons de fait pour
 * ~6 rôles. Chaque rôle : taille + graisse + lineHeight + letterSpacing.
 * La COULEUR et `textTransform` (uppercase des kickers) s'appliquent à l'usage
 * (`[typography.kicker, { color: colors.gris }]`). Le rôle `stat` laisse
 * `fontSize`/`lineHeight` à l'usage (rampe lg/xl/xxl/heroMax). Plancher 12.
 */
// Night Print : chaque rôle porte SA famille (Inter Tight / Inter), qui encode la
// graisse. `fontWeight` reste posé pour le fallback système si une fonte manquait,
// mais n'agit pas sur les familles à graisse nommée. La couleur/textTransform
// s'appliquent à l'usage.
export const typography = {
  /** R1 — kicker / label de section (uppercase + gris à l'usage). */
  kicker: { fontFamily: fonts.textSemi, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 2, lineHeight: 16 },
  /** R2 — titre d'écran (Inter Tight 700). */
  title: { fontFamily: fonts.displayBold, fontSize: fontSizes.xl, fontWeight: '700', letterSpacing: -0.5, lineHeight: 31 },
  /** R3 — titre de card (md) / titre d'item de liste (sm) — Inter Tight 600. */
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0, lineHeight: 20 },
  itemTitle: { fontFamily: fonts.displaySemi, fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0, lineHeight: 18 },
  /** R4 — corps (Inter 400) + méta (Inter 600 gris). */
  body: { fontFamily: fonts.text, fontSize: fontSizes.sm, fontWeight: '400', letterSpacing: 0, lineHeight: 21 },
  meta: { fontFamily: fonts.textSemi, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0, lineHeight: 17 },
  /** R5 — label de CTA — IDENTIQUE partout (Inter 600). */
  button: { fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '800', letterSpacing: 0.5, lineHeight: 20 },
  /** R6 — valeur / stat (Inter Tight 800, tabular). fontSize à l'usage : lg|xl|xxl|hero|heroMax. */
  stat: { fontFamily: fonts.display, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
} as const;

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
  traceDrawMs: 1_200, // dessin du VRAI tracé sur le Résultat (§25 peak-end)
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
  /** Rival / attaque subie ou menée — rival-orange (Night Print). */
  rival: '#FF7043',
  /** Contesté / rare / événement — contested-violet (Night Print). */
  contested: '#8A70FF',
  /** Victoire / or / récompense de saison — prestige-gold (Night Print). */
  gold: '#FFC857',
  /** GRYD Verify / info de confiance — protected-blue (Night Print). */
  verify: '#4A8DFF',
  /**
   * Territoire PROTÉGÉ — bleu ÉLECTRIQUE (AMENDEMENT-37 §5). DISSOCIÉ de `verify`
   * (#6FB7FF, réservé au GRYD Verify) : le protégé est un ÉTAT de zone (bouclier),
   * pas une info de confiance. Teinte franche, lisible sur fond sombre.
   */
  electricBlue: '#4A8DFF', // protected-blue (Night Print) — liseré défense/vérifié
  /** Danger / decay urgent — danger-red (Night Print). Abandon, erreur critique seule. */
  danger: '#FF4D57',
  /** Confirmation HORS capture — success-mint (Night Print). Jamais pour un claim. */
  successMint: '#5CE6A8',
  /**
   * Dégradé / avertissement NON bloquant (E06 préflight « position approximative »,
   * signal GPS incertain) — ambre. Distinct de `gold` (victoire/récompense) et de
   * `danger` (bloquant, rouge) : la triade planche mint→ambre→rouge. Toujours
   * icône + libellé, jamais couleur seule.
   */
  warn: '#FFB020',
  /** Surfaces profondes de scène de jeu (cartes HUD, fonds de coffre) — carbon-900. */
  carbon: '#101412',
  /**
   * Déclinaisons ALPHA (§ charte : toute couleur hors tokens = bug — les washes/
   * bordures translucides passent par un TOKEN, jamais un rgba littéral inliné).
   * Dérivées des teintes de rôle ci-dessus.
   */
  verifySoft: 'rgba(74,141,255,0.28)', // #4A8DFF @ 28 % — bordure/wash d'info de confiance
  dangerSoft: 'rgba(255,77,87,0.16)', // #FF4D57 @ 16 % — wash de decay/urgent
} as const;
export type GameColorName = keyof typeof gameColors;

/**
 * Décline un TOKEN hex (#RRGGBB) en `rgba()` à l'alpha voulu — LA façon
 * autorisée de produire une teinte translucide (§ charte « toute couleur hors
 * tokens = bug » : une variante alpha DÉRIVE du token, jamais un rgba littéral
 * recodé à la main). Ex. withAlpha(colors.blanc, 0.28), withAlpha(gameColors.gold, 0.22).
 */
export function withAlpha(tokenHex: string, alpha: number): string {
  const h = tokenHex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * RÈGLES NON NÉGOCIABLES §C — COULEUR PAR RÔLE (pas par identité de crew). La
 * carte colore le rôle d'une zone DANS LE CONTEXTE du joueur, jamais l'identité
 * universelle d'un crew (« on ne colore pas 200 000 utilisateurs »). Jamais plus
 * de 2 rôles fortement colorés sur une même zone (moi + rival dominant) ; les
 * autres crews sont agrégés dans le détail au tap.
 *
 * ⚠ La couleur ne SUFFIT jamais (daltonisme) : chaque rôle/état porte aussi une
 * FORME + une icône (bordure pleine = mon crew · cassée-cible = rival ·
 * double+hachures = contesté · bouclier = protégé · sablier-pointillé = decay ·
 * éclair = bonus — cf. mapStyle contested/spec). `roleColor` ne rend QUE le
 * token de teinte ; le rendu ajoute forme + picto.
 */
export type SectorRoleColorKey =
  /** Moi / mon crew — la chartreuse unique de la charte. */
  | 'mine'
  /** Alliés (opt-in mission) — chartreuse SECONDAIRE (déclinaison atténuée). */
  | 'ally'
  /** Rival principal — orange/rouge. */
  | 'rival'
  /** Zone contestée — violet (+ double contour côté rendu). */
  | 'contested'
  /** Neutre / inconnu — gris (pas d'accent). */
  | 'neutral'
  /** Protégé — bleu/bouclier. */
  | 'protected'
  /** Decay — rouge sombre/pointillé. */
  | 'decay'
  /** Bonus — gold/éclair. */
  | 'bonus';

/**
 * Chartreuse SECONDAIRE des ALLIÉS (§C) : la MÊME teinte que mon crew, mais
 * atténuée — un allié se lit « de mon bord » sans jamais dominer ma propre
 * couleur (ma zone reste la plus lisible). Dérivée du token chartreuse (aucune
 * teinte nouvelle : charte).
 */
export const ALLY_CHARTREUSE = colors.chartreuse40;

/**
 * Token de teinte d'un rôle/état de zone (§C). SOURCE unique pour la carte et
 * les légendes — garantit qu'aucun écran n'invente une couleur de rôle hors
 * charte. Retourne toujours un token existant (colors.* / gameColors.*).
 */
export function roleColor(role: SectorRoleColorKey): string {
  switch (role) {
    case 'mine':
      return gameColors.crew; // = colors.chartreuse
    case 'ally':
      return ALLY_CHARTREUSE;
    case 'rival':
      return gameColors.rival;
    case 'contested':
      return gameColors.contested;
    case 'protected':
      // AMENDEMENT-37 §5 : protégé = bleu ÉLECTRIQUE (dissocié de verify #6FB7FF).
      return gameColors.electricBlue;
    case 'decay':
      return gameColors.danger;
    case 'bonus':
      return gameColors.gold;
    case 'neutral':
      return colors.gris;
  }
}

/** 8 motifs de différenciation des crews adverses (addendum §D). */
export const foePatterns = [
  'hatch45', 'hatch-45', 'dots', 'crosshatch', 'vlines', 'hlines', 'dashes', 'rings',
] as const;
export type FoePattern = (typeof foePatterns)[number];
