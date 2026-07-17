# GRYD — UI_AUDIT.md

> Audit UI de cohérence complet. Méthode : 8 inventaires transverses + 28 audits d'écran sur une
> grille unique (43 sous-agents). Aucune ligne de code modifiée — ce rapport précède la correction.
> Documents liés : [DESIGN_TOKENS](DESIGN_TOKENS.md) · [TYPOGRAPHY](TYPOGRAPHY_AUDIT.md) ·
> [ICON](ICON_AUDIT.md) · [COMPONENT_INVENTORY](COMPONENT_INVENTORY.md) ·
> [SCREEN_BY_SCREEN_FIX_PLAN](SCREEN_BY_SCREEN_FIX_PLAN.md) · [VISUAL_REGRESSION_PLAN](VISUAL_REGRESSION_PLAN.md).

## 1. Résumé exécutif

GRYD n'a **pas** de problème de charte : couleurs, rôles et profondeur sont propres (0 P0 couleur,
la carte MapLibre dérive 100 % de ses teintes des tokens). Le problème est l'**absence d'échelles
nommées** — un seul token d'espacement, deux rayons — qui a laissé chaque écran réinventer ses
valeurs. La dérive est cumulative et mesurable :

- **1 P0** (bloquant) : le flux e-mail OTP de `sign-in` n'a pas de gestion clavier → sur petit
  écran, le champ et le bouton peuvent être masqués par le clavier (l'utilisateur ne peut pas se
  connecter).
- **~145 P1** (incohérence forte) : dominés par 3 familles — cibles tactiles < 44 px sur des
  actions réelles (18 écrans), textes importants coupés en silence, et recodes de boutons/cards
  hors composant partagé.
- **~500 P2 / ~700 P3** : finition et cosmétique, essentiellement absorbés mécaniquement par les
  tokens.

**Taux de tokenisation de l'espacement : ≈ 6 %.** C'est la cause racine. La correction n'est PAS
un rattrapage pixel par pixel (il reviendrait) mais : **étendre les tokens → extraire 10
composants → codemod → corriger les écrans → verrouiller par lint + tests visuels**.

## 2. Compte par gravité

| Périmètre | P0 | P1 | P2 | P3 |
|---|--:|--:|--:|--:|
| Inventaires transverses (8) | 0 | 53 | 362 | 561 |
| Écrans audités (28) | 1 | ~92 | ~330 | ~330 |

> Les comptes d'inventaire et d'écran se recouvrent partiellement (une même violation d'espacement
> apparaît dans `inv-spacing` ET dans l'écran qui la porte). Les totaux servent à prioriser, pas à
> additionner. 6 écrans mineurs n'ont pas été audités (limite de session) : `nav-bar`,
> `calcul-zones`, `settings-motivation`, et les 3 écrans masqués par flag (`arsenal`, `warroom`,
> `classement`) — cf. §6.

## 3. Les 10 problèmes systémiques (par impact)

| # | Problème | Preuve | Gravité |
|--:|---|---|:--:|
| 1 | **Pas d'échelle d'espacement** — `spacing = {cardPadding:20}` seul | 1 429 littéraux / 86 tokens (6 %) ; 52 % hors grille 4 px ; grille de fait = 2 px | P1 |
| 2 | **Cibles tactiles < 44 px sur actions réelles** | 18 écrans : GPS RÉGLAGES ~21 px, AUTORISER/REPRENDRE ~30 px (en course !), chips de filtre 32–37 px, kebab FriendCard 34 px, CTA widget ~17 px | P1 |
| 3 | **Textes importants coupés en silence** | `ellipsizeMode="clip"`/`numberOfLines={1}` sans autoshrink sur données : heroLine (course-result), zoneName (carte), titre widget (profil), nom de badge, `+12 847 ZONES` (course-live-reel) | P1 |
| 4 | **Bouton primaire recodé 21×** (9 hauteurs 33→56) | `InlineRunCTA` n'a que 6 usages ; 2 gabarits chartreuse coexistent sur crew, course/[id], territoire | P1 |
| 5 | **Cards : règle 80/20 INVERSÉE** | 79 % des 129 cards N1 ont un contour permanent ; ~51 bordure-dans-bordure ; triple contour `BonusActionCard` (crew.tsx:584/586/599) | P1 |
| 6 | **184 combinaisons typo pour ~6 rôles** | « titre de card » en 46 variantes ; micro-typo 8.5–9.5 px sur les écrans **en course** | P1 |
| 7 | **Échelle d'icônes absente** | 18 tailles, 31 % sur cible 16/20/24 ; 69 icônes à 2 px d'un palier | P1 |
| 8 | **États manquants** (loading/disabled/vide/erreur) | aucun bouton n'a de loading ; disabled absent de ~15 CTA ; états vides muets (amis, historique) ; échec de routage non géré (route-planner OSRM) | P1 |
| 9 | **14 rayons pour 3 + pill** | `radii = {card,pill}` → 134 littéraux ; dérivations `card-8`/`card-6` fragiles | P2 |
| 10 | **Confirmations mensongères / mélange réel-démo non étiqueté** | crew-public « Lien copié » sans copie ; support « C'est noté » sans envoi ; profil mélange xp réel + coffre démo ; réf spec `(§37.3)` visible à l'écran | P1 |

## 4. Tableau des écrans les plus lourds

Écrans à ≥ 8 issues (détail complet dans [SCREEN_BY_SCREEN_FIX_PLAN.md](SCREEN_BY_SCREEN_FIX_PLAN.md)) :

| Écran | P0 | P1 | Total | Signature du problème |
|---|--:|--:|--:|---|
| onboarding | 0 | 3 | 40 | marge 24 px hors axe, 15 typos, auth sans loading |
| course-live-reel | 0 | 9 | 34 | 6 cibles < 44 px **en course**, micro-typo, finish() sans catch |
| crew | 0 | 5 | 33 | 2 gabarits CTA, ReactionBar 24 px, titre 28 px clippé |
| crew-public | 0 | 4 | 31 | confirmations mensongères, `(§37.3)` visible, 13 typos |
| profil | 0 | 5 | 27 | « MON TERRITOIRE » ×2, widget clippé + CTA 17 px, mélange réel/démo |
| historique | 0 | 3 | 27 | noms coupés, 2 paddings de card, chips 37 px |
| course-result | 0 | 2 | 26 | heroLine clippée, 14 styles typo, 9 styles de card |
| course-live-demo | 0 | 6 | 26 | 13.5/17 px hors grille, card-in-card sheet, 30 typos |
| parametres | 0 | 2 | 30 | 17 P2, TogglePill 35 px, ValueRow longue non gérée |
| badges | 0 | 5 | 30 | filtre « Secrets » mort, ~200 SVG en scroll, tier 9 px |
| aujourdhui | 0 | 1 | 30 | 22 P3 cosmétiques, BadgeCard nom coupé |
| **sign-in** | **1** | 4 | 17 | **clavier masque le flux OTP**, marge 24 px, disabled non stylé |

## 5. Ce qui est DÉJÀ sain (à préserver absolument)

- **La charte et les rôles couleur** : `colors`/`gameColors`/`roleColor`/`elevation`/`borderState`
  — 0 P0. `mapStyle` dérive toutes ses teintes des tokens via `withAlpha`/`scaleAlpha`.
- **La famille d'icônes unique** (`Icon` + `icons.ts`) — pas de mélange de bibliothèques. **Ne pas
  introduire Lucide/Material.**
- **`fontSizes`** bien adopté (93 %) — le désordre est dans les *combinaisons*, pas l'échelle.
- **Le bouton GO** (décision fondateur) et son routing contextuel.
- **La règle de profondeur AMENDEMENT-22** (N0/N1/N2) est le bon référentiel — elle est juste
  *violée* (80/20 inversé), pas absente.

## 6. Écrans non audités (limite de session)

À couvrir pour compléter le plan : `nav-bar` (`GrydNavBar` — important, sur tous les écrans),
`calcul-zones`, `settings-motivation`. Les 3 écrans **masqués par flag D8** (`arsenal`, `warroom`,
`classement`) sont plafonnés P3 (invisibles en MVP) sauf défaut survivant au flip — à auditer avant
toute réactivation de surface.

## 7. Méthode de correction (ordre impératif)

L'ordre n'est pas négociable — corriger les écrans avant les tokens ferait revenir les
incohérences :

1. **Tokens** — étendre `design-tokens.ts` (`spacing`, `radii`, `iconSizes`, `sizes`, `typography`).
   1 fichier, 0 risque de rendu. Gate : typecheck.
2. **Composants** — extraire/adopter les 10 canoniques (`Button`, `Card`, `IconPlate`,
   `SectionHeader`, `StatBlock`, `EmptyState`, kit settings, `Toast`, `Segmented`, `verifyPill`).
3. **Codemod** — migrer espacements/rayons/icônes vers les tokens, par paquets, gate à chaque.
4. **Écrans** — dans l'ordre du ROI (surface MVP d'abord), tables de
   [SCREEN_BY_SCREEN_FIX_PLAN.md](SCREEN_BY_SCREEN_FIX_PLAN.md).
5. **Verrouillage** — lint UI grep-able + tests visuels
   ([VISUAL_REGRESSION_PLAN.md](VISUAL_REGRESSION_PLAN.md)).

**Le P0 `sign-in` (clavier OTP) est à corriger en premier, hors séquence** — il bloque la connexion.
