/**
 * KLAIM — Tokens design (ADDENDUM-DESIGN §C + §E, gelés pour la Saison 0).
 * Toute couleur hors tokens = bug. Jamais de chartreuse sur fond clair (contraste 1,2:1).
 */

// Direction du 9 septembre 2026 : les alias historiques restent disponibles,
// avec des valeurs neutres. Noir, blanc et chartreuse sont partagés par les écrans.
// Le chartreuse s'emploie sur fond sombre, ou comme fond de bouton à texte noir.
/** GRYD studio direction — founder override, 9 September 2026.
 * Neutral black/white values; chartreuse is the sole chromatic accent.
 * Compatibility aliases keep existing screens in the same palette.
 */
const translucentDark2026 = 'rgba(10,10,10,0.78)';
const translucentLight2026 = 'rgba(255,255,255,0.88)';

export const refonteColors = {
  canvas: '#F5F5F5', surface: '#FFFFFF', surfaceMuted: '#EBEBEB',
  ink: '#101010', muted: '#666666', border: '#DEDEDE', accent: '#B4FF0D',
  forest: '#151515', rival: '#858585', water: '#DEDEDE', carbon: '#0A0A0A',
  darkSurface: '#171717', darkSurfaceMuted: '#292929', floating: 'rgba(23,23,23,0.96)',
  translucentDark: translucentDark2026, translucentLight: translucentLight2026,
  // Compatibility aliases for map consumers. All floating controls now share
  // the same flat, blur-free material.
  mapTranslucentDark: translucentDark2026, mapTranslucentLight: translucentLight2026,
  darkInk: '#FAFAFA', darkMuted: '#A3A3A3', error: '#666666',
  scrim: 'rgba(10,10,10,0.48)', shadow: 'rgba(0,0,0,0.08)',
} as const;

export const colors = {
  noir: '#0A0A0A', // --gryd-bg — fond principal (N0)
  carbonImmersive: '#0A0A0A', // immersif : live, splash, capture (= bg, spec sans palier dédié)
  carbonDeep: '#111111', // --gryd-surface-1 — surfaces profondes (fonds de HUD/coffre)
  carbone: '#191919', // --gryd-surface-2 — cards, sheets (N1)
  carbone2: '#242424', // --gryd-surface-3 — surélevé, désactivé (N2)
  blanc: '#FAFAFA', // --gryd-text — texte principal, icônes
  gris: '#A3A3A3', // --gryd-text-muted — texte secondaire, labels
  grisFaible: '#858585', // --gryd-text-faint AJUSTÉ AA
  grisLigne: '#303030', // --gryd-border — séparateurs 1 px
  chartreuse: '#B4FF0D', // --gryd-primary / --gryd-run — accent unique
  chartreusePressed: '#ACDB2E', // --gryd-primary-dark — état PRESSÉ du CTA
  // Remplissage de MON territoire. Fill de possession (LOD carte) : « Moi » à
  // 16–17 %, jamais un aplat lourd (la trace reste dominante). Spec §3.9 : 18–24 %.
  chartreuse14: 'rgba(180,255,13,0.16)', // remplissage de MON territoire (fill possession)
  chartreuse40: 'rgba(180,255,13,0.40)', // contours de territoire, glows
  eau: '#141414', // fond de carte : eau (gris profond)
  // Déclinaisons ALPHA du blanc + scrims (§ charte : tokens, jamais rgba inliné) —
  // bordures/overlays translucides des HUD (course-live, FAB, scrims de modale).
  blanc12: 'rgba(250,250,250,0.12)', // bordure hairline renforcée
  blanc14: 'rgba(250,250,250,0.14)', // bordure de FAB/overlay
  blanc22: 'rgba(250,250,250,0.22)', // bordure marquée
  blanc35: 'rgba(250,250,250,0.35)', // bordure forte (état actif discret)
  scrim: 'rgba(0,0,0,0.45)', // voile léger sous une couche flottante
  scrimStrong: 'rgba(5,5,5,0.72)', // voile plein d'une modale/sheet
} as const;

/**
 * Rendu carte égocentré (addendum §D — AMENDEMENT-01).
 * `mineFill`/`mineStroke` = la teinte de MON territoire (chartreuse). Les VARIANTES
 * PAR RÔLE (rival / contesté / protégé — fill + contour) et le LISERÉ INTERNE
 * (signature « à moi » des planches) vivent dans `territoryPaint()` en bas de ce
 * fichier : elles doivent DÉRIVER de `roleColor()` (défini plus bas), qu'on ne peut
 * pas référencer ici sans dépendance circulaire. `mapTokens` reste la teinte de base ;
 * `territoryPaint()` en est la déclinaison par rôle consommée par la carte.
 */
export const mapTokens = {
  // Opacité MESURÉE sur la planche V1-selection8 (PORT OUEST) à ~0,15 ; la teinte,
  // elle, DÉRIVE du token courant (#B4FF0D depuis D-19) — jamais un hex en dur.
  // Spec §3.9 demande 18-24 % : à re-mesurer au lot carte, pas ici.
  mineFill: colors.chartreuse14,
  mineStroke: colors.chartreuse40,
  foeFill: 'rgba(250,250,250,0.06)', // + motif par crew (8 motifs), jamais par teinte
  foeStroke: 'rgba(250,250,250,0.22)',
  neutralStroke: 'rgba(250,250,250,0.05)',
  roads: 'rgba(250,250,250,0.07)',
  parks: 'rgba(250,250,250,0.03)',
  water: colors.eau,
} as const;

/**
 * NIGHT PRINT (refonte Vague 1) : Inter Tight (titres, chiffres) · Inter
 * (interface) · JetBrains Mono (labels). Chargées au splash (apps/mobile lib/fonts.ts).
 * ⚠ @expo-google-fonts nomme CHAQUE GRAISSE comme une FAMILLE distincte, et en
 * React Native une telle famille IGNORE `fontWeight` : c'est la FAMILLE qui porte
 * la graisse. On expose donc une famille par graisse utile ; un style choisit la
 * bonne et n'ajoute JAMAIS de fontWeight par-dessus.
 *
 * Septembre 2026 : Manrope pour les titres et chiffres, Inter pour la lecture.
 * Manrope est embarquée via Expo Google Fonts sous SIL OFL 1.1. Elle traduit
 * la géométrie de la référence sans prétendre utiliser la fonte Lufga absente.
 */
export const fonts = {
  displayRegular: 'Manrope_400Regular',
  displayMedium: 'Manrope_500Medium',
  display: 'Manrope_800ExtraBold', // hero / display / victoire
  displayBold: 'Manrope_700Bold', // H1 / H2 / titres forts (720/700)
  displaySemi: 'Manrope_600SemiBold', // titres de sheet / card (650)
  text: 'Inter_400Regular', // corps
  textMedium: 'Inter_500Medium', // corps fort / secondaire (500)
  textSemi: 'Inter_600SemiBold', // labels, boutons, méta (600/650)
  textBold: 'Inter_700Bold', // emphase de corps
  mono: 'JetBrainsMono_500Medium', // timers, codes crew, étiquettes carte
  serif: 'Lora', // accent éditorial (non chargé — fallback système)
  displayFallback: 'Poppins-Medium',
  textFallback: 'Poppins-Regular',
} as const;

/**
 * Échelle typo mobile (addendum §E). Les stats héros dominent chaque écran de résultat.
 * `hero`/`heroMax` = le TITRE-NOMBRE géant des planches (« +0,42 km² » de
 * -selection14 : hauteur de capitale MESURÉE ~44 pt sur l'export 2× → corps ~64 pt
 * = `hero` ; `heroMax` 88 est la marche au-dessus pour un nombre qui remplit
 * l'écran). Rôle porté par `typography.stat` (chiffres tabulaires, Inter Tight 800).
 */
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40, hero: 64, heroMax: 88 } as const;

/**
 * Rayons (audit UI 2026). 4 paliers + pill : `sm` petit composant · `control`
 * bouton/input/conteneur d'icône · `card` surface/sheet · `pill` capsule. Le set
 * ferme les 134 littéraux (les paliers 8 et 12 n'avaient pas de nom → 14 rayons
 * de fait). `card`/`pill` inchangés (rétro-compat).
 */
export const radii = { sm: 8, control: 12, btn: 18, card: 20, sheet: 28, pill: 999 } as const;

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
  /**
   * R6 — valeur / stat / TITRE-NOMBRE HÉROS (Inter Tight 800, tabular). fontSize à
   * l'usage : lg|xl|xxl|hero|heroMax. C'est le rôle du « +0,42 km² » géant des
   * planches (-selection13/-selection14) : `tabular-nums` (les chiffres ne dansent
   * pas quand le nombre change), graisse 800, tracking serré (-1) pour un bloc
   * dense. L'unité (« km² ») reste PETITE À CÔTÉ (taille `lg`/`md` à l'usage) — la
   * composition « grand nombre + petite unité » est un choix d'écran, pas un token.
   */
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
  /**
   * E60 « Passage de rang » — spéc §3.7 : « Rang : moment dédié de 1,4 seconde
   * MAXIMUM, skippable ». C'est un PLAFOND, pas une cible : l'écran doit rendre
   * la main au plus tard à cette échéance, et immédiatement si l'utilisateur
   * tape. Reduce Motion (§3.7) supprime le zoom, les particules et les
   * pulsations — la valeur ne change pas, l'animation disparaît.
   * Vit ici et non dans `game-rules` : une durée d'animation ne décide d'aucun
   * claim ni d'aucun point.
   */
  rankMomentMaxMs: 1_400,
  holdToStopMs: 1_200, // stop protégé : maintenir 1,2 s
  runButtonPulseMs: 2_000,
  toastDismissMs: 2_500,
} as const;

/**
 * Compatibility roles, September 2026 palette. A role is expressed by its
 * icon, label and pattern; no per-crew color or multicolor reward hierarchy.
 */
export const gameColors = {
  crew: colors.chartreuse, bike: colors.chartreuse,
  rival: colors.gris, contested: colors.blanc, gold: colors.blanc,
  verify: colors.blanc, electricBlue: colors.blanc, danger: colors.blanc,
  successMint: colors.chartreuse, warn: colors.gris,
  carbon: colors.carbonDeep,
  verifySoft: 'rgba(250,250,250,0.28)',
  dangerSoft: 'rgba(250,250,250,0.16)',
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

// ═══════════════════════════════════════════════════════════════════════════
// SIGNATURE VISUELLE DU TERRITOIRE (planches Vague 1) — RÔLE → STYLE
//
// MESURÉ AU PIXEL sur les planches (exports 2× : 1 px image = 0,5 pt écran) :
//  · -selection8 (E03) PORT OUEST = MOI, K.RUNNER = rival, zone bleue = protégé ;
//  · -selection10 (E04) SAINT-RÉMY = rival ; -selection13 (E08) zone reprise = MOI.
//
// Ce qui compose une zone sur la planche :
//  ① CONTOUR ÉPAIS à la couleur du RÔLE — MESURÉ #B4FF0D EXACT (moi), #FF7043 EXACT
//     (rival) : ce sont `colors.chartreuse` et `gameColors.rival` au pixel près.
//  ② LISERÉ INTERNE : un 2ᵉ trait PLUS FIN, en RETRAIT vers l'intérieur du contour.
//     MESURÉ chartreuse @ ~0,45 (≈ `chartreuse40`), largeur ~1 pt, retrait ~7 pt.
//     C'EST LA SIGNATURE DE LA POSSESSION : présent sur MA zone, ABSENT du rival
//     (fill uni (35,23,18), aucun 2ᵉ trait) et du protégé. Le liseré dit « CE
//     territoire est À MOI », pas seulement « il y a une zone ici ».
//  ③ REMPLISSAGE faible de la MÊME teinte — MESURÉ moi @ ~0,15 (= `chartreuse14`),
//     rival @ ~0,10.
//  ④ NOM DE LA ZONE écrit DEDANS, capitales espacées, couleur du rôle, centré —
//     MESURÉ « PORT OUEST » ~10 pt de corps, +0,15 em, #B4FF0D plein.
//
// Ces VALEURS DE STYLE sont des tokens (jamais en dur dans un écran, CLAUDE.md) ;
// `territoryPaint()` en est la fonction pure de dérivation (rôle → teintes), testée
// en Deno. La GÉOMÉTRIE du liseré (anneau normalisé + line-offset) et son
// application vivent côté carte (apps/mobile map) ; ici, la spec chiffrée.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LISERÉ INTERNE (signature possession) — spec chiffrée MESURÉE. `insetPt` = retrait
 * du 2ᵉ trait vers l'intérieur (line-offset écran, CONSTANT par zoom : c'est pour ça
 * qu'il ne peut pas être une distance métrique gelée dans la géométrie) ; `widthPt` =
 * largeur du filet (jamais un 2ᵉ contour épais) ; la TEINTE est `chartreuse40`
 * (retournée par `territoryPaint('mine').lisere`).
 */
export const territoryLisere = {
  /** Retrait vers l'intérieur (pt écran) — MESURÉ ~7 pt sur PORT OUEST. */
  insetPt: 6,
  /** Largeur du filet (pt) — MESURÉ ~1 pt : un liseré, pas un contour. */
  widthPt: 1.4,
} as const;

/**
 * NOM DE ZONE écrit À L'INTÉRIEUR (planches). Spec consommée par le rendu de label
 * (screen ou symbol layer). `sizePt` = corps ; `letterSpacingEm` = l'espacement des
 * capitales (MESURÉ large) ; couleur = `territoryPaint(role).label` (teinte de rôle
 * pleine). Toujours en capitales (le rendu applique `uppercase`).
 */
export const territoryLabelStyle = {
  sizePt: 10, // MESURÉ ~7 pt de hauteur de capitale → ~10 pt de corps
  letterSpacingEm: 0.15,
  uppercase: true,
} as const;

/**
 * Style de peinture d'une zone de territoire pour un RÔLE donné.
 *  - `stroke` : contour épais (teinte de rôle, quasi-plein) ;
 *  - `fill`   : remplissage faible de la même teinte ;
 *  - `label`  : couleur du NOM écrit dedans (teinte de rôle pleine) ;
 *  - `lisere` : le 2ᵉ trait interne (SIGNATURE possession) — `null` quand le rôle
 *               n'en porte pas (rival, contesté, protégé… : la planche n'y montre
 *               qu'un contour simple + fill).
 */
export interface TerritoryPaint {
  stroke: string;
  fill: string;
  label: string;
  lisere: string | null;
}

/**
 * RÔLE → style de zone (§C) — FONCTION PURE, source unique du rendu de territoire.
 * Chaque teinte DÉRIVE d'un token via `roleColor`/`colors`/`gameColors` + `withAlpha`
 * (aucune couleur nouvelle : charte). Alphas de fill/contour MESURÉS sur les planches.
 * Le LISERÉ n'est rendu que pour la POSSESSION (`mine`) : c'est le trait « à moi » de
 * -selection8, absent du rival/protégé — reproduire fidèlement la planche, c'est aussi
 * reproduire cette ABSENCE. (`ally` = mon bord atténué : pas de liseré pour ne pas
 * rivaliser avec ma propre zone, §C « un allié ne domine jamais ma couleur ».)
 */
export function territoryPaint(role: SectorRoleColorKey): TerritoryPaint {
  switch (role) {
    case 'mine':
      return {
        stroke: withAlpha(colors.chartreuse, 0.9), // contour ~plein (MESURÉ #B4FF0D solide)
        fill: colors.chartreuse14, // MESURÉ @ ~0,15
        label: colors.chartreuse, // nom en chartreuse plein (MESURÉ)
        lisere: colors.chartreuse40, // 2ᵉ trait @ 0,40 (MESURÉ ~0,45) — SIGNATURE
      };
    case 'ally':
      return {
        stroke: colors.chartreuse40,
        fill: withAlpha(colors.chartreuse, 0.1),
        label: colors.chartreuse40,
        lisere: null, // allié = atténué, pas de signature possession
      };
    case 'rival':
      return {
        stroke: withAlpha(gameColors.rival, 0.85), // MESURÉ #FF7043 contour ~plein
        fill: withAlpha(gameColors.rival, 0.1), // MESURÉ K.RUNNER @ ~0,10
        label: gameColors.rival,
        lisere: null, // rival = contour simple (aucun 2ᵉ trait sur la planche)
      };
    case 'contested':
      return {
        stroke: withAlpha(gameColors.contested, 0.8),
        fill: withAlpha(gameColors.contested, 0.18),
        label: gameColors.contested,
        lisere: null, // le contesté a son PROPRE double contour bicolore (mapStyle), pas ce liseré
      };
    case 'protected':
      return {
        stroke: withAlpha(gameColors.electricBlue, 0.85),
        fill: withAlpha(gameColors.electricBlue, 0.08),
        label: gameColors.electricBlue,
        lisere: null,
      };
    case 'decay':
      return {
        stroke: withAlpha(gameColors.danger, 0.85),
        fill: withAlpha(gameColors.danger, 0.08),
        label: gameColors.danger,
        lisere: null,
      };
    case 'bonus':
      return {
        stroke: withAlpha(gameColors.gold, 0.8),
        fill: withAlpha(gameColors.gold, 0.08),
        label: gameColors.gold,
        lisere: null,
      };
    case 'neutral':
      return {
        stroke: withAlpha(colors.gris, 0.5),
        fill: withAlpha(colors.gris, 0.05),
        label: colors.gris,
        lisere: null,
      };
  }
}
