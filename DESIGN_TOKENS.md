# GRYD — DESIGN_TOKENS.md

> Cible du système de tokens, dérivée de l'audit UI (43 agents, 8 inventaires + 28 écrans).
> Source unique : [`packages/shared/src/design-tokens.ts`](packages/shared/src/design-tokens.ts).
> **On ÉTEND l'existant, on ne le remplace pas** : `colors`, `gameColors`, `elevation`,
> `borderState`, `roleColor`, `withAlpha` sont sains et restent tels quels.

## Résumé exécutif

Le problème n'est pas la charte (couleurs et rôles sont propres : **0 P0, 5 P1** côté couleurs)
— c'est l'**absence d'échelles nommées**. Il existe UN seul token d'espacement
(`spacing.cardPadding = 20`) et DEUX rayons (`card`, `pill`) pour couvrir toute l'app. Résultat
mesuré :

| Dimension | Littéraux en dur | Tokens utilisés | Taux de tokenisation | Cible |
|---|---:|---:|---:|---|
| Espacement | 1 429 | 86 | **≈ 6 %** | 100 % |
| Rayons | 134 | 254 (`card`+`pill`) | 65 % | 100 % |
| fontSize | 56 | 782 | 93 % (mais 184 combinaisons) | ≤ 6 rôles |
| Icônes (size) | 323 appels, 18 tailles | 0 token | **0 %** | 100 % |

La grille réellement utilisée pour les espacements est **2 px** (10, 14, 6, 2, 18, 22, 26
dominent), pas 4. Cinq nouveaux blocs de tokens ferment ces trous et rendent les violations
**grep-ables** donc lintables.

---

## 1. Espacement — `spacing` (le trou le plus grand)

**Constat** : `spacing = { cardPadding: 20 }`. 1 429 littéraux, dont **52 % hors grille 4 px**.
Pire : 8 dérivations arithmétiques `cardPadding ± 2/4/6` fabriquent activement du hors-grille
(14, 18, 24). Le token unique est devenu un *générateur* de violations.

```ts
// packages/shared/src/design-tokens.ts — REMPLACE spacing = { cardPadding: 20 }
export const spacing = {
  xxs: 4,   // micro-espace (icône↔texte serré, gap de pills)
  xs: 8,    // espace interne faible
  sm: 12,   // espace compact (gap de liste, padding de chip)
  md: 16,   // espace standard (padding de card compacte)
  lg: 20,   // séparation de blocs = ANCIEN cardPadding (marge d'écran, padding card)
  xl: 24,   // séparation de sections
  xxl: 32,  // séparation majeure
} as const;
/** Alias rétro-compat le temps de la migration — pointe vers lg. À retirer en fin de codemod. */
export const cardPadding = spacing.lg;
```

**Marge horizontale d'écran** — axe unique **`spacing.lg` (20 px)** (déjà la valeur dominante sur
~25 écrans). Trois écrans à corriger : `sign-in.tsx:278` et `onboarding/index.tsx:808` sont à
**24** (`cardPadding + 4`) ; la barre de `StackScreen.tsx:79` est à **14** (`cardPadding - 6`).

**Rythme vertical cible** (à encoder dans les composants, pas à mémoriser) :

| Relation | Token | px |
|---|---|---:|
| Titre → sous-titre | `xxs`–`xs` | 4–8 |
| Sous-titre → contenu | `sm`–`md` | 12–16 |
| Contenu → CTA | `md`–`xl` | 16–24 |
| Card → card | `sm`–`md` | 12–16 |
| Section → section | `xl`–`xxl` | 24–32 |

**Table de correspondance (codemod mécanique)** — la grille de fait 2 px → grille 4 px :

| En dur | → Token | | En dur | → Token |
|---:|---|---|---:|---|
| 2 | `xxs` (4) | | 14 | `sm` (12) ou `md` (16) |
| 6 | `xs` (8) | | 18 | `md` (16) ou `lg` (20) |
| 10 | `xs` (8) ou `sm` (12) | | 22 | `xl` (24) |
| 4 | `xxs` | | 26 | `xl` (24) |
| 8 | `xs` | | 30 | `xxl` (32) |
| 12 | `sm` | | 24 | `xl` |
| 16 | `md` | | 32 | `xxl` |

> Les cas 10→8/12 et 14→12/16 demandent un œil (ambigus) : les traiter par **paquets
> structurels** (paddings de container d'abord, gaps ensuite), jamais un `sed` aveugle.

---

## 2. Rayons — `radii` (2 → 4 tokens)

**Constat** : 14 rayons de coin réels (2.5, 3.5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22)
pour une cible de 3 + pill. 134 littéraux existent **parce que les paliers 8 et 12 n'ont pas de
nom**. Deux dérivations `radii.card - 8` (=12, ×5) et `radii.card - 6` (=14, ×3) cassent si la
card change de rayon.

```ts
// packages/shared/src/design-tokens.ts — REMPLACE radii = { card: 20, pill: 999 }
export const radii = {
  sm: 8,       // petit composant : checkbox, tierHex, segment, rowIcon, trendBars
  control: 12, // bouton, input, conteneur d'icône, chip carré, field
  card: 20,    // card, preview, sheet (inchangé)
  pill: 999,   // capsule pleinement arrondie (inchangé)
} as const;
```

**Absorption** (67 littéraux consolidés) : `sm←` 6, 7, 9 · `control←` 9–11 et 14–18 (icônes),
10–14 (rows/fields), 12 littéral, `card-8`, `card-6`, boutons `ctaMd 14`/`cta 16` · `card←` 16
et 22 des cards, 20 littéral. Les cercles `size/2` (avatars, FAB ronds) restent calculés — ce
ne sont pas des rayons de coin.

---

## 3. Tailles d'icônes — `iconSizes` (n'existe pas)

**Constat** : 323 appels `<Icon size={…}>`, **18 tailles distinctes**, seulement **31 % sur la
cible 16/20/24**. Dominantes hors cible : 14 (×43), 18 (×68), 15 (×37), 13 (×27) — toutes à
2 px d'un palier.

```ts
// packages/shared/src/design-tokens.ts — NOUVEAU
export const iconSizes = { xs: 12, sm: 16, md: 20, lg: 24, display: 48 } as const;
export type IconSize = (typeof iconSizes)[keyof typeof iconSizes];
```

Typer `IconProps.size?: IconSize` **refuse structurellement** 13/15/17/18. Migration :
11→12, 13→12, 14→16, 15→16, 17→16, 18→20, 22→24, 26→24, 28→24 (couvre 285/323 sans jugement).
Détail dans [ICON_AUDIT.md](ICON_AUDIT.md).

---

## 4. Tailles de boutons & cibles tactiles — `sizes`

```ts
// packages/shared/src/design-tokens.ts — NOUVEAU
export const sizes = {
  buttonLg: 56,     // CTA principal plein écran / bas de page
  buttonMd: 48,     // CTA secondaire, boutons en ligne, sheet
  touchTarget: 44,  // plancher tactile absolu (WCAG 2.5.5) — minHeight/hitSlop garanti
} as const;
```

**Constat** : le rôle « bouton principal chartreuse » existe en **9 hauteurs** (33 → 56) sur 21
recodes locaux. On gèle **2 hauteurs** (56 lg / 48 md) et un composant `Button` unique les porte
(cf. [COMPONENT_INVENTORY.md](COMPONENT_INVENTORY.md)). Tout Pressable < 44 px reçoit
`hitSlop`/`minHeight = sizes.touchTarget` — 18 écrans ont des cibles à 21–37 px aujourd'hui.

---

## 5. Typographie — `typography` (184 combinaisons → 6 rôles)

Détail et mapping complet dans [TYPOGRAPHY_AUDIT.md](TYPOGRAPHY_AUDIT.md). Les 6 rôles fermes,
chacun avec taille + graisse + lineHeight + letterSpacing, **dérivés des styles de fait
majoritaires** (on standardise vers l'existant dominant, pas vers un idéal) :

```ts
// packages/shared/src/design-tokens.ts — NOUVEAU (consomme fontSizes.* existant)
export const typography = {
  // R1 kicker / label de section (86 usages, 34 variantes aujourd'hui)
  kicker:  { fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 2,    lineHeight: 16 }, // + textTransform:'uppercase' + color gris à l'usage
  // R2 titre d'écran (12 usages)
  title:   { fontSize: fontSizes.xl, fontWeight: '700', letterSpacing: -0.5, lineHeight: 31 },
  // R3 titre de card (16) / titre d'item de liste (14) — MÊME graisse 700
  cardTitle: { fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0,  lineHeight: 20 },
  itemTitle: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0,  lineHeight: 18 },
  // R4 corps (14/400) + méta (12/600 gris) — plancher absolu 12
  body:    { fontSize: fontSizes.sm, fontWeight: '400', letterSpacing: 0,    lineHeight: 21 },
  meta:    { fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0,    lineHeight: 17 },
  // R5 label de CTA — IDENTIQUE partout (GO, capsule nav, CTA inline, boutons de sheet)
  button:  { fontSize: fontSizes.md, fontWeight: '800', letterSpacing: 0.5,  lineHeight: 20 },
  // R6 valeur / stat — tabular, rampe lg/xl/xxl/heroMax
  stat:    { fontWeight: '800', letterSpacing: -1, lineHeight: 0, fontVariant: ['tabular-nums'] }, // fontSize choisi à l'usage : lg|xl|xxl|hero|heroMax
} as const;
```

> **`fontSizes` reste inchangé** (`xs:12 … heroMax:88`). Les 56 littéraux hors tokens (8.5, 9,
> 9.5, 10, 10.5, 11, 13, 13.5, 15, 17…) remontent tous à un palier ; **plancher absolu 12 px**
> (aucun texte lisible sous xs). Cas légitimes conservés : `hero`/`heroMax` (résultats),
> `tabular-nums` (stats), `mono` (timers/codes).

**⚠ Polices de marque non chargées (P2, à trancher)** : `fonts.*` (Avant Garde / Poppins /
SpaceMono) est référencé ~35× mais **jamais chargé** (aucun `useFonts`/`expo-font`). L'app rend
100 % en police système. Soit charger les polices, soit retirer les références `fontFamily` des
5 StyleSheet natifs (risque de redbox dev). Décision fondateur (licence Avant Garde, cf.
AMENDEMENT-03).

---

## 6. Règles de lint UI (grep-ables)

Une fois les tokens en place, ces interdictions deviennent mécaniques (script `check-ui-tokens`,
cf. [VISUAL_REGRESSION_PLAN.md](VISUAL_REGRESSION_PLAN.md)) :

```txt
INTERDIT dans apps/mobile/app et apps/mobile/src (hors design-tokens.ts, hors mapStyle.ts) :
  - padding|margin|gap: <nombre>          → doit être spacing.*
  - borderRadius: <nombre littéral>       → doit être radii.*  (sauf size/2 des cercles)
  - <Icon size={<nombre>}>                → doit être iconSizes.*
  - fontSize: <nombre>                    → doit être fontSizes.*  (plancher 12)
  - #RRGGBB ou rgba(...) dans un StyleSheet → doit être colors.*/gameColors.* ou withAlpha(token, a)
  - height: <33..56> sur un Pressable-bouton → doit passer par le composant Button
```

Exceptions déclarées : `mapStyle.ts` (styles MapLibre, teintes dérivées par `withAlpha`/`scaleAlpha`),
fonds de tuiles CARTO/Esri (externes), cercles `size/2`, échelle `hero`/`heroMax`.

---

## Ordre d'application

1. Étendre `design-tokens.ts` (ce document) — **1 seul fichier, 0 risque de rendu**.
2. Codemod espacement + rayons + icônes (mécanique, table §1–3) — par paquets, gate à chaque.
3. Extraire les composants partagés ([COMPONENT_INVENTORY.md](COMPONENT_INVENTORY.md)).
4. Corriger écran par écran ([SCREEN_BY_SCREEN_FIX_PLAN.md](SCREEN_BY_SCREEN_FIX_PLAN.md)).
5. Verrouiller (lint + visual regression).
