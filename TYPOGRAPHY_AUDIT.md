# GRYD — TYPOGRAPHY_AUDIT.md

> Inventaire typographique de `apps/mobile/app` + `apps/mobile/src` (838 déclarations `fontSize`).
> Cible : **≤ 6 rôles fermes**. Valeurs identiques à [DESIGN_TOKENS.md §5](DESIGN_TOKENS.md).

## Résumé exécutif

`fontSizes` est déjà bien utilisé (**93 %** des tailles passent par un token). Le désordre est
ailleurs : **184 combinaisons distinctes** (taille + graisse + lineHeight + letterSpacing) pour
**~6 rôles réels**. Un même rôle — « titre de card » — existe en **46 variantes** faute d'arbitrage
`700` vs `800` et `md` vs `lg`. Trois défauts structurels :

1. **56 fontSize littéraux** (8.5, 9, 9.5, 10, 10.5, 11, 13, 13.5, 15, 17, 24, 32) forment une
   *échelle fantôme* qui comble les trous 12→14 et 16→20 de `fontSizes`.
2. **lineHeight défini sur 14 % des styles** seulement — et quand il l'est, **11 multiplicateurs**
   (×1.28 à ×1.6) + 12 valeurs absolues. `letterSpacing` : **27 valeurs distinctes**, dont 10 rien
   que pour les kickers.
3. **Micro-typo 8.5–9.5 px** sur les écrans **pendant la course** (`RealCourseLive`, `RunModeSheet`,
   `GpsStatusUI`) — le pire contexte de lecture de l'app.

## Histogrammes

**fontSize — tokens (782)** : `xs` 365 · `sm` 231 · `md` 91 · `lg` 46 · `xl` 19 · `xxl` 11 ·
`hero` 7 · `heroMax` 3.
**fontSize — littéraux (56)** : 10 (×17) · 9 (×10) · 11 (×6) · 9.5 (×4) · 13 (×4) · 15 (×3) ·
12.5 (×3) · 17 (×2) · 13.5 (×2) · 10.5 (×2) · 8.5 (×1) · 12/14/16/24/32 (×1).
**lineHeight** : présent sur ~14 % des styles ; multiplicateurs ×1.28/1.3/1.35/1.4/1.45/1.5/1.55/1.6…
**letterSpacing** : 27 valeurs distinctes.

## Les 6 rôles cibles

| Rôle | Cible (taille · graisse · ls · lh) | Variantes actuelles | Usages |
|---|---|---:|---:|
| **R1 kicker / label section** | `xs (12)` · 600 · ls 2 · UPPERCASE · gris | 34 | 86 |
| **R2 titre d'écran** | `xl (28)` · 700 · ls −0.5 · lh ×1.1 | 6 | 12 |
| **R3 titre de card / item** | card `md (16)` · item `sm (14)` · **700** · ls 0 | 46 | 180 |
| **R4 corps / méta** | corps `sm (14)`·400·lh ×1.5 — méta `xs (12)`·600·gris | 41 | 300 |
| **R5 label de CTA** | `md (16)` · 800 · ls 0.5 — **identique GO / nav / inline / sheet** | 8 | 15 |
| **R6 valeur / stat** | tabular · 800 · ls −1 · lh ×1.05 — rampe lg/xl/xxl/heroMax | 25 | 40 |

## Mapping de migration (variante de fait → rôle)

| Variante rencontrée | → Rôle | Note |
|---|---|---|
| `xs`/défaut/ls 2 (28×), `xs`/600/ls 1.5, `xs`/700/ls 1.2… | **R1** | fixer graisse 600, ls 2 |
| `md`/700 (28×), `md`/800, `lg`/700, `lg`/800 + 9 ls parasites | **R3** | trancher 700 ; card=md, item=sm |
| `sm`/400, `sm`/défaut, `xs`/400 (corps) | **R4 corps** | lh ×1.5 obligatoire |
| 8.5 / 9 / 9.5 / 10 / 10.5 / 11 (méta minuscule) | **R4 méta** | **remonter à xs (12)** — plancher |
| fab 17/800/ls1 · nav 15/800/ls0.4 · inline 16/800/ls0.6 · 5× sm/800 | **R5** | UNE seule déf partagée |
| 13/13.5 (bandeau mission, stat sheet) · 17 (statValue) | **R6** ou **R4** | selon rôle sémantique |
| `heroMax`/900 (course-live-reel) | **R6** | garder 88, graisse → 800 |

## Cas légitimes conservés (ne pas toucher)

- `hero` (64) / `heroMax` (88) : valeur héros des écrans **résultat** et **course live**.
- `fontVariant: ['tabular-nums']` : toutes les stats alignées en colonne.
- `fonts.mono` (SpaceMono) : timers, codes crew, étiquettes de carte (exception fonctionnelle).

## Points de vigilance (par écran, extraits de l'audit)

- **course-live-reel** : ~25 styles fermes, dont **5 tailles « caption » différentes** ; micro-typo
  8.5–9.5 px (`RealCourseLive.tsx:409/425/452`) — écran de lecture en mouvement, **priorité P1**.
- **course-live-demo** : ~30 combinaisons ; `13.5` (bandeau mission `:1358`), `17` (statValue `:1692`).
- **profil** : ~20 styles pour 5 rôles (8 variantes de kicker seul).
- **crew-public / crew** : 3 styles à `fontSize 10` (`tagLabel`, `styleTagLabel`, `recruitLabel`) —
  hors tokens ET sous le plancher 12.
- **course/[id]**, **performance**, **badges** : labels d'axe/tier à 9–10 px (à remonter à `xs`).

## ⚠ Polices de marque non chargées (P2)

`fonts.*` (Avant Garde Gothic / Poppins / SpaceMono, AMENDEMENT-03) est référencé ~35× via
`fontFamily`, mais **aucun `useFonts`/`expo-font`/asset n'est chargé** → l'app rend intégralement
en police système. Risque de redbox dev sur les 5 usages en StyleSheet natif. Décision fondateur :
charger les polices (licence Avant Garde requise) **ou** retirer les `fontFamily` en attendant.
