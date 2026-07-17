# GRYD — VISUAL_REGRESSION_PLAN.md

> Comment **verrouiller** les corrections UI pour qu'elles ne régressent pas. Adapté à ce repo :
> Expo web déjà en ligne, pas de Storybook aujourd'hui, carte MapLibre non rendue en headless.

## Résumé exécutif

Deux filets complémentaires, du moins cher au plus complet :
1. **Lint UI grep-able** (immédiat, 0 dépendance) — attrape les valeurs hors tokens à chaque commit.
2. **Captures Playwright du bundle expo-web** (P1) — attrape tout changement de padding/couleur/
   taille/alignement par diff d'image.
Storybook des composants (P2) et Maestro des flows natifs (P3) viennent ensuite.

## Palier 0 — Lint UI (immédiat, aucun outil)

Un script `scripts/check-ui-tokens.mjs` (même esprit que `sync-game-rules.mjs`) qui `grep` les
interdictions de [DESIGN_TOKENS.md §6](DESIGN_TOKENS.md) et sort en code ≠ 0 :

```txt
Échoue si, dans apps/mobile/app|src (hors design-tokens.ts, mapStyle.ts) :
  padding|margin|gap: <nombre>        · borderRadius: <littéral hors size/2>
  <Icon size={<nombre>}>              · fontSize: <nombre>   (plancher 12)
  #RRGGBB / rgba(...) dans un StyleSheet · height 33..56 sur un Pressable hors <Button>
```

Branché dans le gate existant (à côté de `typecheck` / `deno test`). **C'est le vrai filet
anti-retour** : sans lui, l'absence de tokens reviendra.

## Palier 1 — Captures Playwright du bundle web (recommandé)

Le bundle expo-web tourne déjà (`localhost:8081`, cf. `web-deploy-github-pages`). Script Playwright
qui, par route, prend une capture et la compare à une référence commitée.

```txt
scripts/visual/                 # référentiel
  ref/<route>@<viewport>.png    # images de référence (commitées)
  capture.mjs                   # navigue localhost:8081/<route>, screenshot, diff vs ref
  routes.json                   # liste des routes + viewports
```

- **Routes** : /, /profil, /crew, /course-result, /partage, /historique, /performance,
  /parametres, /confidentialite, /onboarding, /sign-in, /badges, /challenges, /territoire, /amis…
- **Viewports** : `mobile` 375×812 et `large` 430×932 (petit écran = le cas qui casse le plus).
- **Texte long** : forcer les données de démo aux pires cas (`Saint-Germain-des-Prés`,
  `Les Coureurs du Front de Seine`, `+12 847`) via un flag de démo.
- **Thème** : dark (l'app est dark-only).

**Zone masquée à documenter** : la **carte MapLibre (WebGL) rend NOIR en headless** — masquer la
région carte dans le diff (`mask:`) et la vérifier à part en navigateur réel. De même, les
animations `Animated` ne se terminent pas en headless → capturer après un délai fixe ou désactiver
les animations en mode test.

**CI** : sur PR, `capture.mjs` échoue si le diff dépasse un seuil ; l'artefact `avant/après` est
publié. Workflow avant/référence/après pour chaque correction d'écran.

## Palier 2 — Storybook des composants partagés

Une fois les composants de [COMPONENT_INVENTORY.md](COMPONENT_INVENTORY.md) extraits, un Storybook
(react-native-web) couvre chacun dans **tous ses états** — c'est là que Chromatic/Percy prennent
leur valeur (diff par composant, pas par écran) :

| Composant | États à couvrir |
|---|---|
| `Button` | primary/ghost/raised × lg/md × {default, pressed, disabled, loading, icône, label long} |
| `Card` | default/compact × {sans état, contested, gold, danger, activeSoft} |
| `IconPlate` | xs/sm/md/lg × 3 couleurs de rôle |
| `SectionHeader` | avec/sans « Voir tout », titre long |
| `StatBlock` | 1 chiffre / 6 chiffres (`+12 847`) / valeur nulle |
| `EmptyState` | 3 contextes (liste vide, erreur, offline) |
| `ShareCard` | mode héros / carte seule / templates × trace courte-longue |
| `TerritoryWidgetCard` | les 8 états du widget × texte long |

Matrice transverse par composant : **Default · Long text · Loading · Disabled · Error · Small
screen · Large font (accessibilité)**.

## Palier 3 — Maestro (flows natifs)

Pour ce que le web ne peut pas exercer (GPS, permissions, clavier natif, Live Activity) : flows
Maestro sur dev build EAS — en priorité le **flux OTP de sign-in** (le P0 clavier) et la
**course live réelle** (les 6 cibles tactiles < 44 px). Palier le plus lourd, dernier.

## Convention avant/après (chaque correction d'écran)

Pour chaque écran corrigé, produire une planche à 3 colonnes :

```txt
[ Avant ]      [ Référence (grille + axes tracés) ]      [ Après ]
```

- **Avant** : capture de l'état actuel.
- **Référence** : capture annotée (grille 4/8 px + axe horizontal `spacing.lg` tracés) montrant la
  cible.
- **Après** : capture post-correction, diff vs référence attendu nul.

Ces planches servent la validation fondateur (« aucun changement visuel sans screenshot de
validation ») et alimentent le référentiel Playwright du Palier 1.

## Ordre de mise en place

1. **Palier 0** dès L1 (tokens) — le lint verrouille le codemod.
2. **Palier 1** en parallèle de L4 (écrans MVP) — référentiel des écrans corrigés.
3. **Palier 2** après L2 (composants extraits).
4. **Palier 3** sur dev build, après les corrections critiques (P0 + course live).
