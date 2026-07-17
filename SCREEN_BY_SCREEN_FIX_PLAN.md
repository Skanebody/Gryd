# GRYD — SCREEN_BY_SCREEN_FIX_PLAN.md

> Plan de correction ordonné. Les tables listent les **P0/P1** par écran (les P2/P3 sont
> majoritairement absorbés par le codemod tokens et l'extraction de composants — non répétés).
> Prérequis transverses : [DESIGN_TOKENS](DESIGN_TOKENS.md) + [COMPONENT_INVENTORY](COMPONENT_INVENTORY.md).

## Ordre global (lots committables, gate à chaque)

| Lot | Contenu | Dépend de | Effort |
|--:|---|---|:--:|
| **L0** | 🚨 P0 `sign-in` clavier OTP (hors séquence) | — | S |
| **L1** | Étendre `design-tokens.ts` (spacing/radii/iconSizes/sizes/typography) | — | S |
| **L2** | Extraire `Button`, `Card`, `IconPlate`, `SectionHeader`, `StatBlock`, `EmptyState` | L1 | M |
| **L3** | Codemod espacement + rayons + icônes (mécanique, par paquets) | L1 | M |
| **L4** | Surface MVP : carte · crew · profil · course-live-reel · course-result · partage · onboarding · sign-in | L1-L3 | L |
| **L5** | Secondaires : historique · performance · parametres · confidentialite · aujourdhui · amis · badges · challenges · sources · territoire | L1-L3 | L |
| **L6** | Détail/annexes : profil-edit · crew-edit · crew-discovery · crew-public · route-planner · course-detail · support · faq · course-live-demo | L1-L3 | M |
| **L7** | Kit settings + états loading/disabled/vide/erreur (transverse) | L2 | M |
| **L8** | Non audités : nav-bar · calcul-zones · settings-motivation · (OFF: arsenal/warroom/classement) | L1 | S |

---

## L0 — P0 (à corriger immédiatement)

**sign-in** — `app/(auth)/sign-in.tsx`

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| Flux e-mail OTP | Pas de `KeyboardAvoidingView`/`ScrollView` ; bloc actions collé en bas (`justify`) → le clavier masque le champ et le CTA sur petit écran | **P0** | Envelopper dans `KeyboardAvoidingView` + `ScrollView` (`keyboardShouldPersistTaps="handled"`) `:207` |

---

## L4 — Surface MVP

### carte — `app/(tabs)/index.tsx` + `src/features/map/BattleMapOverlays.tsx` + `MapScreen.tsx`

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| Mission | Même mission formulée 2× (ligne haute + peek bas), 2 vocabulaires | P1 | Une seule lecture ; le peek reprend le libellé de la ligne mission `index.tsx:65` |
| Axe horizontal | Double axe 14/16 px (`MISSION_LINE_SIDE=14`, `fabColumn`) | P1 | Aligner sur `spacing.lg` (20) `index.tsx:37` |
| Textes clippés | `zoneName`, `ownerLine`, `peekTitle` en `ellipsizeMode="clip"` sans autoshrink | P1 | `adjustsFontSizeToFit` ou `numberOfLines` élargi `BattleMapOverlays.tsx:694/708` |
| Typo | ~12 styles pour ~5 rôles ; `12.5` px hors tokens | P1 | Rôles R1-R6 ; `12.5→xs` `BattleMapOverlays.tsx:963` |
| dataNote / attribution | 11 px et 9 px nus sur les tuiles | P1 | Remonter à `xs` (12) `MapScreen.tsx:491` |
| Hauteurs de peek | 168/224 px figées vs font scaling OS | P1 | `minHeight` + contenu flexible `BattleMapOverlays.tsx:128/134` |

### crew — `app/(tabs)/crew.tsx` (~3400 lignes)

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| CTA primaires | 2 gabarits chartreuse (InlineRunCTA « DÉFENDRE » vs boutons locaux) | P1 | `Button variant=primary` unique `:3382` |
| UrgentMissionCard | Titre secteur (28/800) le plus important, clippé | P1 | autoshrink `:325` |
| ReactionBar / WarEventCard | Chips de réaction ~24-26 px tactiles | P1 | `hitSlop`/`minHeight` 44 `ReactionBar.tsx:88`, `WarEventCard.tsx:160` |
| MemberCard / WarEventCard | Tailles 9 px (`rookiePillText`, `liveLabel`) | P1 | Remonter à `xs` `MemberCard.tsx:160` |
| Cards (transverse) | 2 générations mélangées ; triple contour `BonusActionCard:584/586/599` | P1 | `Card` borderless (L2) |

### profil — `app/(tabs)/profil.tsx` + `TerritoryWidgetCard.tsx`

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| En-tête | « MON TERRITOIRE » affiché 2× (section + kicker widget) | P1 | Retirer le kicker du widget quand la section le porte `:454` |
| Widget | Titre/lignes clippés sans autoshrink sur données réelles | P1 | `adjustsFontSizeToFit` `TerritoryWidgetCard.tsx:56` |
| Widget CTA | Lien ~17 px tactile (ni minHeight ni padding) | P1 | `minHeight` 44 + hitSlop `TerritoryWidgetCard.tsx:64` |
| Progression | Mélange réel/démo non étiqueté (xp serveur + coffre démo) | P1 | Étiqueter la démo ou masquer sans données `:603` |
| Typo | ~20 styles pour 5 rôles (8 kickers) | P1 | Rôles R1-R6 `:813` |

### course-live-reel — `src/features/run/gps/RealCourseLive.tsx` + `GpsStatusUI.tsx`

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| Boutons GPS en course | RÉGLAGES ~21 px, AUTORISER/PLUS TARD/REPRENDRE ~30 px, ✕ 32 px | P1 | `sizes.touchTarget` sur tous `GpsStatusUI.tsx:243/265/306` |
| Bouton TERMINER | Appui court = haptique seule, aucun guidage visible « maintenir » | P1 | Micro-hint visuel au tap `RealCourseLive.tsx:247` |
| finish() | `.then()` sans `.catch` ; `finishedRef=true` avant résolution | P1 | `try/catch`, ne verrouiller qu'après succès `:83` |
| zonesValue | `+N ZONES` (40/900) clippé sur `+12 847` | P1 | autoshrink `:160` |
| GpsSignalPill | Libellés longs (« GPS coupé — réactive… ») | P1 | `StatePill` + libellé court `GpsStatusUI.tsx:32` |
| topArea | 6 pills empilables simultanément | P1 | Prioriser/fusionner `:111` |
| Typo | ~25 styles ; 5 tailles « caption », micro 8.5-9.5 px | P1 | Rôles R1-R6, plancher 12 `:409` |

### course-result — `app/course-result.tsx`

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| heroLine / heroWhy | `clip` coupe la ligne émotionnelle en silence | P1 | autoshrink `:828` |
| Typo | ~14 styles fermes | P1 | Rôles R1-R6 `:1475` |
| Cards | 9 styles de card locaux | P2→ | `Card` + `StatBlock` (L2) |

### partage — `app/partage.tsx` + `ShareCard.tsx`

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| Sélecteur Style — Classement | Style proposé même quand `rankLabel=null` (documenté inutilisable) | P1 | Masquer l'option sans classement réel `:220` |
| `shadowColor:'#000'` | Seul hex brut de StyleSheet de l'app | P2 | `colors.noir` `ShareCard.tsx:343` |

### onboarding — `app/onboarding/index.tsx`

| Élément | Problème | Grav. | Correction |
|---|---|:--:|---|
| Marge écran | `paddingHorizontal: cardPadding + 4 = 24` hors axe | P1 | `spacing.lg` (20) `:808` |
| Typo | ~15 combinaisons pour ~7 rôles | P1 | Rôles R1-R6 `:814` |
| AccountStep | Auth Apple/Google sans loading visible (`busy` en code seul) | P1 | `Button loading` `:684` |

---

## L5 — Secondaires (P1 saillants)

| Écran | P1 principaux | Réf |
|---|---|---|
| **historique** | noms coupés (`Saint-Germain…`), 2 paddings de card (14 vs 20), chips 37 px | `RunHistoryCard.tsx:86/142`, `historique.tsx:45` |
| **performance** | `trendLabel` 10 px, `verifyLink` < 44 px | `components.tsx:494`, `performance.tsx:101` |
| **parametres** | TogglePill 35 px, `ValueRow` valeur longue non gérée (flex/numberOfLines absents) | `motivation/ui.tsx:193`, `[section].tsx:441` |
| **confidentialite** | CTA suppression sans loading pendant `delete_account`, DisclosureCard = 2 flux/1 champ | `:601`, `:418` |
| **aujourdhui** | BadgeCard nom coupé (`ellipsize tail`) | `BadgeCard.tsx:84` |
| **amis** | 4 cibles < 44 px (onglets, kebab, pills invite), onglets Amis/Suggestions vides muets | `amis.tsx:368/77`, `FriendCard.tsx:128/137` |
| **badges** | filtre « Secrets » ne filtre rien, `loading`/`source` non déstructurés, tier 9 px, ~200 SVG en scroll, BadgeCard 5 infos | `badges.tsx:357/339/462`, `BadgeCard.tsx:156/84` |
| **challenges** | `rewardText` sans flex → clip en row | `[id].tsx:190` |
| **sources** | « Connecter » ~31 px, chip « Connecté » = bouton déguisé (pas d'affordance) | `sources.tsx:310/89` |
| **territoire** | CTA 48 px (famille 52-56), « Défendre » cosmétique, 4 liens → même route générique | `territoire.tsx:346/207/144` |

---

## L6 — Détail / annexes (P1 saillants)

| Écran | P1 principaux | Réf |
|---|---|---|
| **profil-edit** | brouillon `useState` figé au montage (perd l'hydratation async), toutes les frames équipables | `:84/342` |
| **crew-edit** | chip actif chartreuse plein (contraste texte), brouillon figé, pas de gestion clavier | `:395/65`, `StackScreen.tsx:58` |
| **crew-discovery** | CTA join répété par card (§A), libellé « Demander » ment (crew open→bienvenue), `openSpots` ignoré, card 7 infos, chips 32 px | `CrewDiscoveryCard.tsx:154/56/152`, `crew-discovery.tsx:119/116/181` |
| **crew-public** | confirmations mensongères (« Lien copié » sans copie), `(§37.3)` visible, 3× 10 px, 13 styles typo | `:225/240/286/248` |
| **route-planner** | échec de routage OSRM non géré (spinner infini), 13 composants bordés (80/20), 10 styles typo | `:149/579/711/672` |
| **course-detail** | titre de barre clippé, labels 10 px, `calcLink` ~25 px, 5 rayons, statut « partial » violet incohérent | `course/[id].tsx:506/611/650/72` |
| **support** | « C'est noté » sans envoi réel (signalement) | `support.tsx:138` |
| **course-live-demo** | `13.5`/`17` px hors grille, card-in-card sheet, ~30 typos, 4 rayons de card | `course-live.tsx:1358/1692/798/1719` |
| **faq** | 0 P1 (adopter `Segmented` partagé) | `faq.tsx:312` |
| **code-conduite** | 0 P1 (codemod tokens suffit) | — |

---

## L7 — États manquants (transverse)

Aucun bouton n'a d'état **loading** ; **disabled** absent de ~15 CTA (double-tap sur mutations
possible). États **vides** muets : amis, historique, crew-discovery, badges. Échec **réseau** non
géré : route-planner (OSRM), confidentialite/onboarding (auth). → porté par `Button` (loading/disabled,
L2) + `EmptyState` (L2) + `.catch` explicites par écran.

## L8 — Non audités (à compléter)

`nav-bar` (`GrydNavBar`), `calcul-zones`, `settings-motivation` : audit sur la même grille avant
correction. Écrans **OFF** (`arsenal`/`warroom`/`classement`, masqués par flag D8) : plafond P3,
à auditer avant toute réactivation.
