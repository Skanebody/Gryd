# RESTE À RECALER — Vague 1 « Night Print »

**État daté : 25/07/2026.** Vingt écrans (E01→E19 + E21) ont été recalés sur les planches.
Ce document décrit **tout le reste de l'app** : 29 écrans qui ne leur ressemblent pas encore,
ce qu'il faut y corriger, et **dans quel ordre / par quels lots parallèles**.

> **Autorité.** Ce document est un PLAN D'EXÉCUTION, pas une source de vérité produit. En cas de
> conflit, l'ordre de `CLAUDE.md` s'applique : `SOURCE_OF_TRUTH_REGISTER.md` → Spéc Unifiée →
> `GRYD_REGLES_NON_NEGOCIABLES.md` §A → `AMENDEMENT-47` → `docs/design/vague-1/PLANCHES.md`.
> Rien ici n'autorise à contredire « l'app ne ment jamais ».

---

## 0. Comment exécuter ce document

**Tu es un agent affecté à UN lot.** Lis, dans cet ordre :

1. **§1 — le système visuel** (obligatoire, c'est ta grammaire).
2. **§3.0 — Lot 0**, qui doit être LANDÉ avant ton lot (socle partagé).
3. **La section de TON lot uniquement** dans §3 : périmètre exclusif + écrans + écarts + mensonges.
4. **§4, §5, §6** — le chantier transverse « support », ce qui est bloqué, ce qu'il ne faut PAS peindre.

**Trois interdits absolus, valables pour tous les lots :**

- **Ne touche AUCUN fichier hors de ton périmètre exclusif.** Les autres lots tournent en parallèle.
  Si tu crois devoir modifier un fichier possédé par un autre lot, tu t'ARRÊTES et tu le remontes ;
  tu ne le modifies pas « juste une ligne ».
- **Ne touche AUCUN des 20 écrans recalés** (liste en §1.5). Ils sont la référence. Seule exception
  nommée : le Lot D, sur 4 lignes exactement, documentées dans sa section.
- **Ne touche PAS `packages/**`, `supabase/**`, ni `apps/mobile/src/features/run/gps/**`** — un autre
  chantier y travaille. `game-rules.ts` se LIT, jamais ne s'écrit depuis un lot d'écran.

**Un lot est terminé quand :** `npm run typecheck` passe, aucun fichier hors périmètre n'apparaît
dans `git status`, et chaque écran touché porte le docblock normatif en 3 parties (règle 14).

### ⚠️ État du dépôt au 25/07/2026 — un chantier E14 est EN VOL, non committé

Au moment où ce plan est écrit, `git status` montre un chantier parallèle **non committé** : le
**commutateur Run / Bike de la planche E14** (`ActivitySwitch` + lentille par onglet). Son périmètre
réel **dépasse** « `packages/**` + `supabase/**` + `features/run/gps/**` :

```
 M apps/mobile/app/historique.tsx              ← COLLISION avec le Lot B
 M apps/mobile/src/i18n/catalog/historique.ts  ← COLLISION avec le Lot B
 M apps/mobile/app/(tabs)/classement.tsx       (écran recalé)
 M apps/mobile/app/performance.tsx             (écran recalé)
 M apps/mobile/app/badges.tsx                  (écran recalé)
 M apps/mobile/src/features/map/{MapActivitySwitch,mapPref}.ts
 M apps/mobile/src/i18n/catalog/{badges,performance,saison}.ts
 ?? apps/mobile/src/ui/{ActivitySwitch.tsx,activityLens.ts,activityLens.test.ts}
 ?? apps/mobile/src/features/badges/{BadgeUnlockMoment.tsx,unlockMoment.ts,seenBadges.ts,…}
```

**Deux conséquences opérationnelles :**

1. **Le Lot B NE DÉMARRE PAS tant que ce chantier n'est pas committé.** `app/historique.tsx` et
   `catalog/historique.ts` sont réécrits en profondeur (+171 / +45 lignes) — le lot doit **repartir de
   l'état committé**, pas de celui décrit ici, et **revérifier ses numéros de ligne**. Les autres lots
   (A, C, D, E, F, G, H, I) n'ont aucune intersection avec ce chantier et **peuvent démarrer
   immédiatement**.
2. **Une hypothèse des audits est devenue caduque, en mieux.** Plusieurs écrans recalés documentaient
   l'**absence** du commutateur Run/Bike comme un bouton mort évité (`profil.tsx:54-57`,
   `performance.tsx:27-32`). `src/ui/ActivitySwitch.tsx` **existe maintenant**, avec sa lentille
   mémorisée par onglet et un **cinquième état nommé** (« discipline non mesurée », distinct du vide et
   de la panne). Tout lot qui ajoute un en-tête d'écran concerné par E14 (Carte, Classement,
   Historique, Profil-stats) **consomme cette primitive au lieu d'en recoder une** — et ne la modifie
   pas : elle appartient au chantier E14 jusqu'à son commit.

**Avant de démarrer, tout lot relit `git status`** : si un fichier de son périmètre y apparaît comme
modifié, il s'arrête et remonte.

---

## 1. Le système visuel de référence

### 1.1 Les 20 lois de composition

1. **HERO EN TÊTE, PLEINE LARGEUR, HAUTEUR NOMMÉE.** Tout écran-identité ouvre sur une bande qui
   SORT des gouttières (`marginHorizontal: -spacing.cardPadding`), jamais sur une card. La hauteur
   est une **constante exportée et commentée** (« mesure de composition, pas une règle de jeu »).
   → `src/features/social/ProfileHero.tsx:57` (`HERO_H = 210`), `app/(tabs)/profil.tsx:598` (`heroBleed`),
   `src/features/crew/CrewHero.tsx:116-118`, `src/features/social/SignatureMapCard.tsx:38`.
2. **KICKER MONO GRIS AVANT TOUT TITRE.** Sur-titre 12 px (`fontSizes.xs`), `colors.gris`,
   `letterSpacing: 2`, souvent `fontVariant: tabular-nums`, au-dessus du titre d'écran ET de chaque
   section. **C'est le marqueur visuel n°1 du recalage : un écran sans kicker n'est pas recalé.**
   → `src/ui/TabScreen.tsx:53-59`, `src/ui/StackScreen.tsx:114-120`,
   `src/features/performance/stats/StatBlock.tsx:101`, `app/(tabs)/profil.tsx:1153-1159`.
3. **LES MÉTRIQUES VIVENT DANS UN SEUL BLOC À SÉPARATEURS** — 3 ou 4 cellules MAX, filet de 1 px /
   `hairlineWidth` entre elles, **JAMAIS N cards**. Le bloc n'a lui-même **aucun contenant** quand il
   est déjà dans une surface. → `src/features/map/SheetMetrics.tsx:29-72` (le composant canonique),
   `app/(tabs)/profil.tsx:704-735`, `app/course-result.tsx:1015-1036`.
4. **UNE SEULE CELLULE EST MISE EN AVANT** — plus large (`flex: 1.45`) et en chartreuse sur surface
   SOMBRE, les autres en blanc. Le hero ne porte donc jamais un second gros chiffre concurrent.
   → `app/(tabs)/profil.tsx:706-719` et `:1114-1125`.
5. **UN SEUL CTA CHARTREUSE PLEIN PAR ÉCRAN**, nommé comme tel en commentaire. Tout le reste descend
   d'un cran : ghost, pilule N2, ou **LIEN TEXTE + chevron**. → `src/ui/Button.tsx:16-17`,
   `app/(tabs)/classement.tsx:713-716`, `app/performance.tsx:390-405`, `app/qr.tsx:186-204`.
6. **LES PREVIEWS SONT DES LIGNES SCANNABLES, PAS DES CARDS.** Patron fixe : visuel/icône à gauche →
   libellé `flex: 1` → chevron gris 16 ; posée sur l'espace, séparée par
   `borderBottomWidth: 1, borderBottomColor: borderState.hairline` ; `minHeight: sizes.touchTarget`.
   Les collections complètes vivent dans leur page. → `app/(tabs)/profil.tsx:276-301` (`PreviewRow`),
   `src/ui/ListRow.tsx:112-126`.
7. **EN-TÊTE DE SECTION** = icône `iconSizes.sm` grise + label `letterSpacing: 2` + (optionnel) LIEN
   TEXTE à droite via `marginLeft: 'auto'` — **jamais un bouton plein**.
   → `app/(tabs)/profil.tsx:766-803`, `app/(tabs)/classement.tsx:854-857`.
8. **UNE SEULE COUCHE DE SURFACE PAR ZONE.** `Card` est SANS contour par défaut (`state='none'`) ;
   un contour signale un **ÉTAT** (actif / alerte / rareté / contesté), jamais une frontière de
   section. Les blocs se séparent par l'**ESPACE**. → `src/ui/Card.tsx:20-52` et son en-tête `:4-11`
   (« 79 % des cards avaient un cadre permanent — l'INVERSE de la règle 80/20 »).
9. **AUCUN TEXTE N'EST JAMAIS COUPÉ PAR « … »** — trois techniques, et seulement celles-là :
   (a) aucun `numberOfLines` → le texte s'enroule ; (b) `numberOfLines={1} adjustsFontSizeToFit` →
   il rétrécit ; (c) `ellipsizeMode="clip"` → il coupe net, sans ellipse. **Un `numberOfLines={1}` nu
   est un bug** (RN coupe en `tail` par défaut). → `src/ui/StackScreen.tsx:75-79`,
   `src/ui/Button.tsx:117-127`, `src/features/map/SheetMetrics.tsx:44-49`.
10. **LES CHIFFRES ONT UNE TYPO DE CHIFFRE** : `typography.stat` = `fonts.display` (Inter Tight 800)
    + `letterSpacing` négatif + `fontVariant: ['tabular-nums']`, avec un LABEL `fontSizes.xs` gris
    juste dessous. Aucun chiffre en typo de texte. → `packages/shared/src/design-tokens.ts:145` (R6),
    `src/features/performance/stats/StatBlock.tsx:105-116`.
11. **GRAMMAIRE D'ANALYSE UNIQUE : CHIFFRE → GRAPHIQUE → CONCLUSION EN LANGAGE NATUREL**, répétée à
    l'identique, chaque emplacement étant NULLABLE. La conclusion est BLANCHE, la note d'état grise,
    **une baisse reste grise — jamais rouge**. → `StatBlock.tsx:1-18` et `:118-132`, appliqué 3× dans
    `app/performance.tsx:291-381`.
12. **LES CHOIX PASSENT PAR UN `Segmented` `tone="surface"`** (jamais chartreuse : l'accent ne se
    dépense pas sur un filtre), `scrollable` dès que les libellés risquent de ne pas tenir.
    → `app/performance.tsx:513-522`, `src/features/crew/RealCrewScreen.tsx:735-746`.
13. **LA COULEUR DIT UN RÔLE ET NE PORTE JAMAIS LE SENS SEULE** : chartreuse = moi/mon crew,
    `gameColors.rival` = rival, `gameColors.contested` = contesté (il PRIME), `gameColors.danger` =
    urgence — **toujours doublée par du texte ou une icône**.
    → `src/features/map/BattleMapOverlays.tsx:1064-1079`, `app/(tabs)/classement.tsx:241-249`.
14. **LE DOCBLOCK DE TÊTE EST NORMATIF, EN TROIS PARTIES** : (1) l'**ORDRE DE COMPOSITION** numéroté
    de la planche, (2) « **CE QUI A ÉTÉ RETIRÉ, ET POURQUOI** », (3) « **ÉCARTS ASSUMÉS À LA
    PLANCHE** » avec la raison TECHNIQUE nommée (table, RPC, colonne, dépendance manquante).
    **Un écran recalé sans ce bloc n'est pas recalé.** → `app/(tabs)/profil.tsx:1-66`,
    `app/performance.tsx:1-57`, `app/qr.tsx:1-41`.
15. **CHAQUE VALEUR EST ADOSSÉE À UNE SOURCE NOMMÉE, ET UN SEGMENT SANS SOURCE DISPARAÎT** — jamais
    « — », jamais un « · » orphelin, jamais un « #— ». Les lignes de contexte se construisent par
    **filtrage puis `join(' · ')`**. → `app/(tabs)/profil.tsx:519-544`, `CrewHero.tsx:86-93`,
    `SheetMetrics.tsx:11-15` (« zéro métrique sourcée ⇒ zéro rangée »).
16. **1 ÉCRAN = 1 DÉCISION** : le détail est au tap, dans un accordéon REPLIÉ par défaut, ou dans une
    page dédiée — jamais imposé. → `app/(tabs)/profil.tsx:962-979`, `classement.tsx:311-343`
    (liste FENÊTRÉE + « Voir tout · +N »), `RealCrewScreen.tsx:293-302` (`ACTIVITY_MAX = 3`).
17. **TOUT TEXTE VISIBLE PASSE PAR `defineCatalog` + `t()`**, dans un catalogue de DOMAINE ; les
    invariants (km, km², @handle, GRYD, noms propres du catalogue de jeu) ne sont JAMAIS traduits et
    **c'est écrit en tête du catalogue**. → `src/i18n/types.ts:36-58`, `src/i18n/catalog/qr.ts:1-25`,
    `app/performance.tsx:99-102` (formatage **sans `Intl`**, séparateur décimal de la langue).
18. **UN `screen()` PAR ÉCRAN, ET AUCUN NOM D'EVENT INVENTÉ** hors `packages/shared/src/events.ts` ;
    `analyticsId` **stable et non-PII** sur les CTA décisifs (jamais le libellé i18n).
    → `app/(tabs)/profil.tsx:546-548`, `app/performance.tsx:435-443` (« Pas d'event §8 pour un
    changement de période : on n'en invente pas »), `src/ui/Button.tsx:50-56`.
19. **TOUTE MESURE HORS TOKENS EST UNE CONSTANTE NOMMÉE ET COMMENTÉE**, jamais un littéral nu — et la
    justification distingue « **mesure de composition** » de « **nombre magique de jeu** » (qui, lui,
    doit venir de `game-rules.ts`). → `ProfileHero.tsx:52-68`, `SignatureMapCard.tsx:37-45`.
20. **PLANCHER TACTILE ET PLANCHER TYPO SYSTÉMATIQUES** : `minHeight: sizes.touchTarget` (44) sur
    toute ligne/pilule tappable, `hitSlop` sur les cibles compactes, et **aucun texte porteur de sens
    sous 12 px**. → `app/(tabs)/profil.tsx:1081-1090` et `:1149-1152` (« les marges ne sont PAS
    tactiles »), `SheetMetrics.tsx:70-71`.

### 1.2 Les composants qui portent ces lois

**Aucun écran recalé ne recode un bouton, une card, une ligne de liste ou un groupe de choix. S'il en
recode un, c'est un signal de non-conformité.**

| Composant | Fichier | Ce qu'il impose |
|---|---|---|
| `SheetMetrics` | `src/features/map/SheetMetrics.tsx` | LE bloc de métriques : **aucun contenant**, filet 1 px, largeurs égales via `flex:1` sur le WRAPPER, `adjustsFontSizeToFit` sur valeur ET label, **zéro cellule vide** (retourne `null` si la liste est vide) |
| `StatBlock` | `src/features/performance/stats/StatBlock.tsx` | kicker → chiffre+unité → delta → sub → graphique → caption → conclusion → note ; UNE surface N1 sans sous-card ; tous les emplacements `null`-ables ; conclusion BLANCHE, baisse GRISE ; pas de graphique vide |
| `Card` + `IconPlate` | `src/ui/Card.tsx` | Surface N1 **sans contour** par défaut ; contour réservé aux états (`active`/`alert`/`gold`/`contested`). `IconPlate` (32/40/48) est **la seule source du carré d'icône** — c'est un contrôle N2, pas une card |
| `Button` | `src/ui/Button.tsx` | 3 variantes : `primary` (chartreuse/noir), `ghost` (filet), `raised` (N2). Hauteurs `sizes.buttonLg/Md`, `radii.pill`, `typography.button`, libellé qui rétrécit **sans ellipse**, anneau de focus clavier, `analyticsId` opt-in |
| `StackScreen` | `src/ui/StackScreen.tsx` | Gabarit des écrans poussés : retour + titre centré (**clip**, jamais d'ellipse), `kicker`/`subtitle`, `headerRight` (le CTA unique y vit, atteignable clavier ouvert), `floating` pour ce qui reste HORS du ScrollView |
| `TabScreen` | `src/ui/TabScreen.tsx` | Gabarit d'onglet : `colors.noir`, kicker mono gris, titre display, `paddingHorizontal: spacing.cardPadding`, `TAB_CONTENT_BOTTOM_CLEARANCE` |
| `ListRow` | `src/ui/ListRow.tsx` | La ligne de réglage/navigation : `IconPlate` + libellé jamais tronqué + `value` + `chevron`, surface N1 séparée par l'espace, `tone: 'danger'` pour le destructif. **Reçoit des chaînes DÉJÀ traduites** |
| `Segmented` | `src/ui/game/Segmented.tsx` | Le seul groupe de choix ; `tone="surface"` **obligatoire hors carte** ; `scrollable` pour ne jamais tronquer |
| `ProgressBar` | `src/ui/ProgressBar.tsx` | Rendue **UNIQUEMENT** quand un dénominateur honnête existe ; absente partout ailleurs |
| Tokens | `packages/shared/src/design-tokens.ts` | `colors` (carbone + chartreuse #C9FF38), `elevation` N0/N1/N2, `borderState.hairline`, `radii`, `spacing` (grille 4 px), `sizes.touchTarget`, `fontSizes`, `fonts` (**une famille PAR GRAISSE — ne jamais ajouter `fontWeight` par-dessus**), `typography` R1-R6, `gameColors` par rôle. **Toute couleur hors tokens = bug** |

### 1.3 Les quatre états honnêtes (le patron effectivement écrit)

Quatre états **NOMMÉS séparément, jamais fondus**, chacun avec sa forme visuelle propre.

**① PAS CONNECTÉ / PAS DE COMPTE** → une `stateCard` (surface N1, `radii.card`,
`padding: spacing.cardPadding`, `gap: spacing.xs`) = **TITRE blanc + CORPS gris + AU PLUS un CTA**.
Et le CTA n'existe **que si la connexion MARCHE** : `canSignIn = configured && !session && !sessionLoading`
— sans backend, une phrase remplace le bouton.
→ `app/(tabs)/profil.tsx:358-364` et `:639-668`, `app/performance.tsx:468-491`, `app/qr.tsx:152-176`.

**② CONNECTÉ MAIS VIDE** → le vide n'est **jamais un trou**, c'est un **POINT DE DÉPART** : on dit ce
que la page contiendra + le seul geste qui la remplit. Pour un compte neuf, les métriques sont
**REMPLACÉES par la première mission** (jamais quatre zéros alignés) ; pour un crew sans territoire,
l'aperçu est remplacé par un **plan d'action**.
→ `app/(tabs)/profil.tsx:445-451` et `:737-758`, `src/features/crew/CrewStarterPlan.tsx:1-9`.

**③ ÉCHEC DE LECTURE** → état **DISTINCT du vide**, avec sa propre copie **ET un « Réessayer »** :
« un réseau qui lâche ne prouve pas que la saison est déserte ».
→ `app/(tabs)/profil.tsx:670-689`, `RealCrewScreen.tsx:985-1008` (`territoryReading` vs `territoryUnavailable`).

**④ LECTURE EN COURS** → une **LIGNE grise non tapable** (`stateInline`), **jamais un spinner plein
écran**, jamais un squelette qui affirme une forme. Un chargement **N'AFFIRME RIEN** : les champs dont
le store a un DÉFAUT (« Coureur », « Public », « Niveau 1 ») **ne sont pas rendus tant qu'ils ne sont
pas LUS** — c'est la raison d'être des props `null`-ables de `ProfileHero`.
→ `app/(tabs)/profil.tsx:691-695`, `app/performance.tsx:493-496`, `ProfileHero.tsx:27-33`.

**Trois sous-règles qui reviennent partout :**
- **UN ÉTAT DE PLUS QUAND LA RÉALITÉ EN A UN DE PLUS** — « ville non rattachée », « source pas encore
  ouverte » sont des états à part entière (`classement.tsx:798-827`). À l'inverse, **un écran sans
  lecture réseau DÉCLARE qu'il n'a pas de 4e état** (`qr.tsx:31-34`, `amis.tsx:22-28`).
- **ON N'ANNONCE UN ÉCHEC QU'APRÈS UNE LECTURE RÉELLEMENT PARTIE** — témoin explicite `readStarted` :
  « un échec inventé est un mensonge au même titre qu'une donnée inventée » (`profil.tsx:478-496`).
- **LA DÉCISION D'AFFICHAGE EST UNE FONCTION PURE ET TESTÉE** quand elle est subtile
  (`features/social/nextMissionRow.ts`, `features/map/zoneDecision.ts`, `features/share/narrative.ts`).

### 1.4 Les anti-patrons, tous déjà éradiqués sur les 20 recalés

| Anti-patron | Ce qui le remplace | Preuve |
|---|---|---|
| **Card dans card** | Une seule couche de container ; sections séparées par l'espace | `Card.tsx:4-11`, `StatBlock.tsx:10-13` |
| **Quatre cards de métriques** | UN bloc à séparateurs, ≤ 4 cellules (3 sur la carte) | `profil.tsx:1102-1105`, `course-result.tsx:1008` |
| **Second CTA chartreuse** | Lien texte, ghost ou pilule N2 | `qr.tsx:188-193`, `performance.tsx:390-393`, `RealCrewScreen.tsx:785-788` |
| **Gros chiffre héros concurrent** | Une seule mise en avant par écran | `profil.tsx:31-32`, `classement.tsx:846-849` |
| **Données de démo** | Suppression, pas déplacement | `amis.tsx:4-11`, `arsenal.tsx:11-33`, `classement.tsx:900-906` |
| **Contrôle mort / bouton mort** | Absence + **absence DOCUMENTÉE** en gris, après l'action | `qr.tsx:9-16`, `performance.tsx:33-36`, `profil.tsx:360-364` |
| **« 0 » nu / zéros alignés** | Première mission, « données insuffisantes », phrase explicite | `profil.tsx:445-451`, `StatBlock.tsx:15-17`, `performance.tsx:207-209` |
| **Spinner plein écran** | LIGNE d'état grise non tapable, sur un écran qui montre déjà ce qu'il sait | `profil.tsx:691-695`, `qr.tsx:143-150` |
| **Ellipse « … » sur un texte d'action** | wrap / `adjustsFontSizeToFit` / `ellipsizeMode="clip"` ; les chips défilent | `classement.tsx:745-761` |
| **Barre de progression sans dénominateur** | Suppression ; l'écart se dit en PLACES, en mots | `RealCrewScreen.tsx:776-783`, `classement.tsx:849-851` |
| **Podium géant face à un non-classé** | Les 3 premiers redescendent en lignes ordinaires | `classement.tsx:289-294` |
| **Couleur seule porteuse de sens** | Icône + texte systématiques | `classement.tsx:497-510`, `BattleMapOverlays.tsx:1064-1069` |
| **Chartreuse sur un filtre / une décoration** | `tone="surface"` ; pilules N2 | `ProfileHero.tsx:296-299` |
| **Texte français en dur** | `defineCatalog` 5 langues | `badges.tsx:22-24` |
| **Toponymes / aires / tendances fabriqués** | Refus en bloc | `SignatureMapCard.tsx:26-30`, `CrewHero.tsx:20-23`, `performance.tsx:36-42` |

### 1.5 Ordre d'imitation — et écrans INTOUCHABLES

Ces 20 écrans sont **la référence**. On les LIT, on ne les MODIFIE pas.

1. **`app/(tabs)/profil.tsx`** — LA référence absolue. Tous les motifs y sont. En cas de doute sur un
   motif, **c'est ce fichier qui tranche**.
2. `src/features/performance/stats/StatBlock.tsx` + `app/performance.tsx` — la grammaire d'analyse et
   le meilleur exemple d'« écarts assumés » (six écarts, chacun avec sa raison technique).
3. `src/features/map/SheetMetrics.tsx` — 72 lignes qui contiennent toute la loi du bloc de métriques.
4. `src/ui/Card.tsx`, `Button.tsx`, `StackScreen.tsx`, `TabScreen.tsx`, `ListRow.tsx` — les primitives.
5. `src/features/social/ProfileHero.tsx`, `src/features/crew/CrewHero.tsx` — les heros et la discipline
   des props `null`-ables.
6. **`app/qr.tsx`** — le plus court, donc le plus lisible : 4 états explicités en tête, un CTA, une
   action d'en-tête choisie pour ne pas le dupliquer, et ce qui n'existe pas dit en bas, en gris.
7. `app/(tabs)/classement.tsx` — le cas dur : deux planches, ligne sticky, 6 états de board.
8. `src/features/crew/RealCrewScreen.tsx` + `CrewStarterPlan.tsx` — un état vide se répond par un PLAN.
9. `app/course-result.tsx` — l'ORDRE IMMUABLE et la hiérarchie de CTA à trois niveaux.
10. `src/features/map/{BattleMapOverlays,MissionBriefingSheet,MapAnchoredSheet}.tsx` — la grammaire
    des sheets de décision.
11. `app/partage.tsx`, `app/arsenal.tsx`, `app/badges.tsx`, `app/profil-edit.tsx`, `app/amis.tsx`,
    `app/(tabs)/index.tsx`, `src/features/run/gps/RealCourseLive.tsx`, `src/features/map/SheetMetrics.tsx`.

**Socle documentaire :** `docs/design/vague-1/PLANCHES.md` (composition + copie exacte E01→E21, avec
sa **loi de lecture** : les valeurs des planches sont des **placeholders**) et
`GRYD_REGLES_NON_NEGOCIABLES.md` §A.

---

## 2. État écran par écran

29 écrans. Priorité = **valeur réelle pour le fondateur** (ce qu'il traverse à chaque session, puis
ce qu'un joueur traverse une fois, puis ce que personne ne voit).

| # | Route | Fichier principal | Atteignable depuis | P | Effort | Écarts | Mensonges | Lot |
|---|---|---|---|---|---|---|---|---|
| 1 | `/route-planner` | `app/route-planner.tsx` | Classement (×4), carte | **P0** | L | 11 | **4** | **A** |
| 2 | `/onboarding` | `app/onboarding/index.tsx` | 1er lancement | **P0** | L | 12 | **4** | **C** |
| 3 | `/(auth)/sign-in` | `app/(auth)/sign-in.tsx` + `.web.tsx` | Profil, onboarding | **P0** | M | 9 | **3** | **C** |
| 4 | `/historique` | `app/historique.tsx` | Profil (×2), carte | **P1** | M | 8 | **3** | **B** |
| 5 | `/territoire` | `app/territoire.tsx` | Profil | **P1** | M | 9 | **4** | **B** |
| 6 | `/parametres/[section]` (×8) | `app/parametres/[section].tsx` | Paramètres | **P1** | L | 12 | **5** | **F** |
| 7 | `/parametres` | `app/parametres.tsx` | Profil | **P1** | M | 8 | **2** | **F** |
| 8 | `/confidentialite` | `app/confidentialite.tsx` | Réglages, profil-edit, support | **P1** | L | 11 | **7** | **F** |
| 9 | `/c/[code]` | `app/c/[code].tsx` | QR crew, lien d'invitation | **P1** | M | 8 | **4** | **D** |
| 10 | `/faq` | `app/faq.tsx` | Réglages, support, calcul-zones | **P1** | M | 10 | **4** | **H** |
| 11 | `/support` | `app/support.tsx` | Réglages, course/[id] | **P2** | M | 6 | **5** | **F** |
| 12 | `/mes-parcours` | `app/mes-parcours.tsx` | Paramètres | **P2** | M | 8 | **3** | **F** |
| 13 | `/sources` | `app/sources.tsx` | Réglages › Données | **P2** | M | 8 | **3** | **F** |
| 14 | `/langue` | `app/langue.tsx` | Paramètres | **P2** | S | 5 | **0** ✅ | **F** |
| 15 | `/code-conduite` | `app/code-conduite.tsx` | Confidentialité | **P2** | M | 8 | **5** | **F** |
| 16 | `/calcul-zones` | `app/calcul-zones.tsx` | Support, Réglages | **P2** | S | 7 | **0** ✅ | **H** |
| 17 | `/legal/confidentialite` | `app/legal/confidentialite.tsx` | Réglages › À propos | **P2** ⚠️ | M | 5 | **5** | **G** |
| 18 | `/legal/cgu` | `app/legal/cgu.tsx` | Réglages › À propos | **P2** | S | 10 | **2** | **G** |
| 19 | `/legal/cgv` | `app/legal/cgv.tsx` | Réglages › À propos | **P2** | S | 4 | **3** | **G** |
| 20 | `/legal/licences` | `app/legal/licences.tsx` | Réglages › À propos | **P2** ⚠️ | S | 3 | **3** | **G** |
| 21 | `/a-propos` | `app/a-propos.tsx` | Réglages › À propos | **P2** | M | 7 | **3** | **G** |
| 22 | `/credits-donnees` | `app/credits-donnees.tsx` | Réglages › À propos | **P2** | S | 7 | **0** ✅ | **G** |
| 23 | `/settings-motivation` | `app/settings-motivation.tsx` | Réglages › Course | **P2** | M | 8 | **3** | **E** |
| 24 | `/aujourdhui` | `app/aujourdhui.tsx` | **ORPHELIN** (0 entrée) | **P3** | M | 6 | **4** | **E** |
| 25 | `/challenges` | `app/challenges/index.tsx` | `/aujourdhui` seul | **P3** | M | 9 | **5** | **E** |
| 26 | `/challenges/[id]` | `app/challenges/[id].tsx` | `/challenges` | **P3** | M | 9 | **4** | **E** |
| 27 | `/(tabs)/warroom` | `app/(tabs)/warroom.tsx` | **flag fermé** | **P3** | S | 5 | **2** | **I** |
| 28 | `/course/[id]` | `app/course/[id].tsx` | **deep link seul** | **P3** | M | 6 | **4** | **B** |
| 29 | `/crew-discovery`, `/crew-public`, `/crew-edit` | 3 stubs de 23-26 lignes | redirects | **P3** | S | 3 | **1** | **D** |

**✅ Écrans SANS aucun mensonge de donnée** (écarts de forme uniquement — ne pas inventer de travail
supplémentaire) : `/langue`, `/calcul-zones`, `/credits-donnees`. `/crew-public` et `/crew-edit` sont
des **stubs conformes** : ils ne rendent rien, ne fabriquent rien, et leur absence est documentée.

**⚠️ Risque App Store / RGPD** (pas « ce que le fondateur voit », mais ce qui bloque une soumission) :
`/legal/confidentialite` déclare une collecte de chat et de données HealthKit **qui n'existent pas** ;
`/legal/licences` omet **trois polices sous SIL OFL** dont la licence exige la mention ;
`/code-conduite` promet une modération humaine que `/support` dément dans le même build.

---

## 3. Les lots d'exécution

**Principe : périmètre de fichiers STRICTEMENT DISJOINT**, catalogues i18n compris — c'est la source
de conflit n°1. Chaque lot déclare ce qu'il possède en **exclusivité** (droit d'écriture) et ce qu'il
lit sans écrire.

### Matrice de propriété — vue d'ensemble

| Ressource | Propriétaire EXCLUSIF | Lisible par |
|---|---|---|
| `src/ui/StackScreen.tsx`, `src/ui/format.ts`, `src/ui/numberFormat.ts`, **`src/ui/SectionLabel.tsx` (nouveau)** | **Lot 0** | tous |
| `src/ui/{Card,Button,ListRow,TabScreen,ProgressBar,Icon}.tsx`, `src/ui/game/Segmented.tsx` | **personne** (gelés) | tous |
| `app/route-planner.tsx`, `src/features/route/**`, `catalog/route.ts` | **Lot A** | — |
| `app/{historique,territoire}.tsx`, `app/course/[id].tsx`, `src/features/history/**`, `src/features/territory/**`, `catalog/historique.ts` | **Lot B** | — |
| `app/onboarding/**`, `app/(auth)/**`, `src/features/onboarding/**`, `catalog/onboarding.ts`, `catalog/auth.ts`, `assets/onboarding/**` | **Lot C** | Lot F lit `auth.ts` |
| `app/c/[code].tsx`, `app/crew-{discovery,public,edit}.tsx`, `catalog/crew.ts` | **Lot D** | — |
| `app/aujourdhui.tsx`, `app/challenges/**`, `app/settings-motivation.tsx`, `src/features/motivation/**`, `src/features/daily/**`, `src/ui/game/DailyFocusBlock.tsx`, `catalog/motivation.ts`, `catalog/daily.ts` | **Lot E** | — |
| `app/{parametres,confidentialite,langue,support,mes-parcours,sources,code-conduite}.tsx`, `app/parametres/[section].tsx`, `src/features/{settings,privacy,routePrefs,sources}/**`, `src/features/crew/moderation.ts`, `catalog/reglages.ts`, `catalog/parcours.ts`, **`catalog/sources.ts` (nouveau)** | **Lot F** | Lot A lit `routePrefs` |
| `app/legal/**`, `app/a-propos.tsx`, `app/credits-donnees.tsx`, `src/ui/LegalDoc.tsx`, `catalog/legal.ts`, `catalog/city.ts` | **Lot G** | Lot F lit `city.ts` |
| `app/faq.tsx`, `app/calcul-zones.tsx`, `src/features/explain/**`, `catalog/explain.ts`, `catalog/faq.ts` | **Lot H** | — |
| `app/(tabs)/warroom.tsx` + entrées War Room de `catalog/flagged.ts` | **Lot I** | — |
| `packages/**`, `supabase/**`, `src/features/run/gps/**` | **autre chantier** | lecture seule |
| `src/ui/ActivitySwitch.tsx`, `src/ui/activityLens.ts`, `src/features/map/{MapActivitySwitch,mapPref}.ts`, `src/features/badges/**` | **chantier E14 en vol** (cf. §0) | lecture seule |
| `src/features/{map,social,crew,performance,season,share,nav}/**` (hors `crew/moderation.ts`) | **personne** (recalés) | tous |

**Trois règles de non-collision, à respecter à la lettre :**

1. **Un catalogue partagé ne se modifie qu'en AJOUT.** `catalog/auth.ts` (Lot C) est lu par
   `app/sources.tsx` et `features/sources/adapters/gpx.ts` (Lot F) — **Lot C ne renomme et ne supprime
   aucune entrée existante**. Idem `catalog/city.ts` (Lot G), lu par `parametres/[section].tsx`,
   `profil-edit.tsx` et `RealCrewScreen.tsx`. Idem `catalog/flagged.ts` (Lot I), lu par
   `classement.tsx` et `arsenal.tsx` — **Lot I ne touche QUE les entrées War Room**.
2. **Quand un lot a besoin d'une chaîne dans un catalogue qu'il ne possède pas, il crée son propre
   catalogue de domaine** (fichier neuf = zéro conflit). C'est ce que fait le Lot F avec
   `catalog/sources.ts` plutôt que d'écrire dans `auth.ts`.
3. **`src/features/season/**` (`SeasonStatus`, `useActiveSeason`) est lu par le Lot F
   (`parametres/[section].tsx`) ET le Lot H (`faq.tsx`).** Aucun des deux ne le modifie : les deux se
   contentent de le RENDRE. Si un écart semblait l'exiger, il est reporté.

### Ordre de lancement

```
      ┌─ Lot 0 (socle, ~30 min, SÉQUENTIEL) ─┐
      └──────────────┬───────────────────────┘
                     ▼
  A · C · D · E · F · G · H · I     ← tous en parallèle, périmètres disjoints
  ▲   ▲               ▲
  P0  P0              risque App Store

  B  ← différé : attend le commit du chantier E14 (§0)
     (ses volets /territoire et /course/[id] peuvent démarrer avant)
```

Si un seul agent est disponible, l'ordre de valeur est : **0 → A → C → B → F → H → D → G → E → I**.

---

### Lot 0 — SOCLE PARTAGÉ (bloquant, séquentiel)

**Pourquoi séquentiel.** Chaque autre lot importe ces fichiers. Deux lots qui les modifient en
parallèle produisent un conflit garanti.

**Périmètre EXCLUSIF :**
- `apps/mobile/src/ui/StackScreen.tsx`
- `apps/mobile/src/ui/format.ts`, `apps/mobile/src/ui/numberFormat.ts` (+ son test)
- `apps/mobile/src/ui/SectionLabel.tsx` — **nouveau fichier**

**Travaux (3, tous petits) :**

1. **`StackScreen` consomme les rôles typo.** `styles.kicker` (`StackScreen.tsx:114-120`) recode
   `typography.kicker` à la main. Le substituer par `[typography.kicker, { color: colors.gris,
   textTransform: 'uppercase' }]`. Sept écrans poussés en héritent d'un coup.
2. **Un `formatKm` partagé et locale-aware dans `src/ui/format.ts`.** Il existe aujourd'hui **neuf
   implémentations locales** de `formatKm`, dont **une avec `toLocaleString('fr-FR')` en dur**
   (`app/route-planner.tsx:150-152` — en EN/DE/PT le séparateur décimal affiché est faux) et une
   correcte prenant la locale (`MissionBriefingSheet.tsx:61`). Ajouter
   `export function formatKm(km: number): string` bâti sur `DECIMAL_SEP` / `formatIntFor`, **sans
   `Intl`** (Hermes n'embarque pas ICU), avec son test dans `numberFormat.test.ts`. Les lots A, B, E
   s'y brancheront ; **Lot 0 ne modifie aucun appelant.**
3. **`src/ui/SectionLabel.tsx` — nouveau.** Le kicker de section vit aujourd'hui dans
   `src/features/privacy/ui.tsx:154-156` et `:245-252` — un composant de kicker importé depuis un
   dossier « privacy » par quatre écrans de réglages, qui recode le rôle R1. Créer la version
   canonique dans `src/ui/`, consommant `typography.kicker`. **Ne pas toucher `privacy/ui.tsx`** :
   c'est le Lot F qui le videra et le fera ré-exporter. Une cohabitation transitoire est acceptée et
   documentée dans le docblock du nouveau fichier.

**Ce que le Lot 0 NE fait PAS :** il ne touche ni `Card`, ni `Button`, ni `ListRow`, ni `TabScreen`,
ni `Segmented`, ni `ProgressBar`. Aucun écart d'aucun écran n'exige de les modifier — ils exigent de
les **utiliser**. Un lot qui croit devoir modifier une primitive s'arrête et remonte.

---

### Lot A — LE PLANIFICATEUR DE BOUCLE `/route-planner` — **P0, effort L**

**Pourquoi en tête.** C'est l'écran de préparation de mission, poussé quatre fois depuis le
Classement recalé (`classement.tsx:432,442,738,826`) et depuis la carte. Il porte **la donnée
fabriquée la plus grave de toute l'app** : un résultat de jeu inventé côté client.

**Périmètre EXCLUSIF :**
`apps/mobile/app/route-planner.tsx` · `apps/mobile/src/features/route/**` · `apps/mobile/src/i18n/catalog/route.ts`

**Lecture seule :** `src/features/map/MissionBriefingSheet.tsx` (recalé, consomme `routeLoop`),
`src/features/routePrefs/**` (Lot F), `src/features/social/Toast`, `src/ui/**`.

> **Vérifié, et c'est ce qui rend le lot faisable :** `MissionBriefingSheet` (écran recalé) importe
> `routeLoop` mais **ne lit que `route.km` / `distanceKm`** (`:161`, `:174`, `:213`). Purger les
> champs fabriqués de `PlannedRouteDemo` **ne casse aucun écran recalé**.

#### Mensonges (à traiter EN PREMIER)

- **DONNÉE FABRIQUÉE — le résultat de jeu est inventé côté client.**
  `src/features/route/liveRouting.ts:19-20` et `:146-158` : `ZONES_PER_KM = 15.3`,
  `LOOP_ZONE_RATIO = 0.6`, `zones = round(km × 15.3)`, `points = zones × POINTS_*`,
  `streetsToSave = max(6, km × 3)`, `expiresInH: 48`. **Rien n'est décidé serveur, rien ne vient de
  `game-rules.ts`.** Double violation : « tout claim est décidé serveur » + « aucun nombre magique ».
- **L'écran se contredit lui-même.** Ces chiffres sont affichés à **trois** endroits que le recalage
  a oubliés — résumé d'en-tête « ~26 min · +N zones · +N pts » (`route-planner.tsx:494-498`,
  `catalog/route.ts:136` et `:143`), microcopie du CTA « … · +N pts » (`:881`, `route.ts:150`), et
  chaque carte de variante « +N zones » / « +N pts » (`:840-847`, `route.ts:393` et `:400`) — **alors
  que le bloc de métriques juste au-dessus déclare explicitement (`:619-624`) que le gain et la
  difficulté restent O1 et sont ABSENTS.** Supprimer zones/points de ces trois emplacements.
- **BOUTON MORT ÉTIQUETÉ « (démo) ».** « Partager au crew » (`:857-865`) n'écrit nulle part : il
  affiche un toast dont le texte dit lui-même « ajoutée à ton plan de crew (démo) »
  (`catalog/route.ts:421`) et empile une **fausse ligne de feed locale** (`sharedFeed` `:435-437`,
  rendue `:866-874` avec « à l'instant »). C'est exactement le patron interdit par AMENDEMENT-47 :
  **l'étiquette « démo » ne rachète pas une action qui n'a pas lieu.** Retirer le bouton ET le feed
  tant qu'aucune RPC de partage crew n'existe.
- **ALLURE INVENTÉE.** `EST_PACE_SEC_PER_KM = 350` (`:154-158`) applique ~5'50/km à tout le monde et
  pilote **toutes** les durées affichées (header, bloc métriques, cartes de plan, variantes,
  microcopie CTA) — y compris pour un joueur dont l'allure RÉELLE est déjà lue via
  `features/routePrefs/habits.ts` (`habits.paceSKm`). Le « ~ » sauve la forme, pas le fond :
  **utiliser l'allure apprise, sinon ne pas donner de minutes du tout.**

#### Écarts de forme

1. Retirer fond et contour du bloc `estBlock` (`:981-1005` : `backgroundColor: colors.carbone` +
   `borderWidth: 1`) et le remplacer par **`SheetMetrics`** (règle 3 : AUCUN contenant).
2. Passer les valeurs `estValue` (`:991-997`) de `fonts.textSemi` à **`typography.stat`** (règle 10).
3. Remplacer les **trois** familles de contrôles de choix recodées — `plan` (`:1021-1035`),
   `intentionChip` (`:1055-1069`), cartes de variantes (`:1124-1133`), toutes bordées 1.5 px — par
   **`Segmented` `tone="surface"` + `scrollable`**.
4. Remplacer le CTA recodé `startBtn` (`:1188-1197`, `height: 56` littéral) par
   `<Button variant="primary">` avec un `analyticsId` stable non-PII.
5. Brancher `formatKm` sur le helper partagé du Lot 0 et supprimer la version locale (`:150-152`).
6. Sortir `difficulty: 'Facile' | 'Modéré' | 'Exigeant'` du français en dur
   (`src/features/route/liveRouting.ts:159`) — porté par le type, il fuirait au premier affichage.
7. Retirer les contours permanents empilés (`mapWrap` `:932`, `originField` `:943-954`, `gpsBtn`
   `:956-965`, `retryBtn` `:966-977`, `stepBtn`/`stepValue` `:1072-1094`, `shuffleBtn` `:1110-1119`,
   `shareBtn` `:1146-1155`, `feedRow` `:1157-1168`) : un contour **seulement** sur l'élément
   sélectionné.
8. Remplacer les `ActivityIndicator` de `:545` (carte), `:592` (bouton cible) et `:814` (variantes)
   par des lignes d'état grises non tapables. **Garder** celui collé au KPI pendant un recalcul
   (`:526`), qui est justifié.
9. Repenser les 3 cartes de plan : `planLabel`/`planDist`/`planReason` sont toutes à `fontSizes.xs`
   (12, le plancher) sur ~110 px, et le commentaire `:686-690` **avoue déjà le débordement** →
   segmented scrollable plutôt que trois lignes de 12 px empilées.
10. Ne plus peindre le CTA désactivé en chartreuse à 40 % d'opacité (`startDisabled` `:1196`) : un
    bouton d'accent qui ne répond pas se lit **cassé**. Le dégrader en surface tant que `gps !== 'ok'`
    — le geste utile est alors « Ma position ».
11. Ajouter la section « **ÉCARTS ASSUMÉS À LA PLANCHE** » au docblock : l'écran se réclame de E05
    (`:619-624`) sans lister ses écarts (règle 14).

---

### Lot C — L'ENTRÉE DANS LE JEU : onboarding + connexion — **P0, effort L+M**

**Pourquoi si haut.** C'est le tout premier écran de l'app, et la porte de connexion. Un joueur ne
les voit qu'une fois — mais **s'il les voit mal, il n'y a pas de deuxième fois**.

**Périmètre EXCLUSIF :**
`apps/mobile/app/onboarding/**` · `apps/mobile/app/(auth)/sign-in.tsx` · `apps/mobile/app/(auth)/sign-in.web.tsx` ·
`apps/mobile/src/features/onboarding/**` · `apps/mobile/src/i18n/catalog/onboarding.ts` ·
`apps/mobile/src/i18n/catalog/auth.ts` · `apps/mobile/assets/onboarding/**`

> ⚠️ **`catalog/auth.ts` est lu par le Lot F** (`app/sources.tsx`, `features/sources/adapters/gpx.ts`,
> `gpx.web.ts`). **Ajouts autorisés, renommages et suppressions INTERDITS.**

#### Mensonges

- **ASSET FABRIQUÉ PAR L'ABSENCE.** `assets/onboarding/e01-crew.png` est un **PNG de 2 × 3 pixels
  (74 octets)** — vérifié — étiré en `resizeMode="cover"` plein écran (`E01Hero.tsx:24` et `:52`). Le
  tout premier écran de l'app, décrit dans son propre docblock comme « photo plein cadre (coureur
  solo, lever du jour) », **rend un aplat flou**. Deux issues, pas trois : déposer la vraie photo au
  même chemin (**dépendance fondateur, cf. §5**), ou assumer un fond `colors.carbonImmersive` **sans
  `ImageBackground`** tant qu'elle n'existe pas.
- **FRISE QUI ANNONCE 5 ÉTAPES POUR UN PARCOURS DE 4.** `stepCount={5}` est passé en dur
  (`app/onboarding/index.tsx:306`) alors que `ONBOARDING_STEPS` en compte **4** (`content.ts:81-93`,
  vérifié). Une promesse chiffrée fausse, affichée sous le premier CTA ; le 5e point ne s'allume
  jamais. → `stepCount={ONBOARDING_STEPS.length}` + `stepIndex={ONBOARDING_STEPS.indexOf(step)}`.
- **CHIP « EXEMPLE » DISPARUE DU PREMIER ÉCRAN.** Le docblock (`index.tsx:40-44`) affirme « les deux
  démonstrations animées… chip "Exemple" posée sur le visuel ». Il n'y en a plus qu'une
  (`RivalryDemo`). `E01Route` dessine une boucle chartreuse **qui se ferme PUIS SE REMPLIT**
  (`E01Route.tsx:71-72`, `FILL_OPACITY = 0.18`) — la représentation exacte d'une capture — **sans
  aucune chip « Exemple »**, sur une photo plein cadre. Le garde-fou posé par le lot « Retour terrain
  2 » a sauté avec le remplacement de `CaptureDemo`. Le remettre.
- **PORTE « J'AI DÉJÀ UN COMPTE » PROMISE PAR TROIS DOCS, PEINTE PAR AUCUN ÉCRAN.** `SIGN_IN_DOOR`
  est importé (`index.tsx:129`) et **jamais rendu** ; `DemoCard` accepte déjà `signInLabel`/`onSignIn`
  (`:501-511`, `:530-532`) mais aucun appelant ne les passe. Or `(auth)/sign-in.tsx:16-19`,
  `sign-in.web.tsx:31-37` et `content.ts:165-171` **bâtissent tout leur raisonnement dessus**
  (« sans retour, elle était à SENS UNIQUE »). La seule sortie de E01 est « Passer »
  (`E01Hero.tsx:64-71`), qui n'annonce pas la connexion. → Rebrancher la porte, **ou** supprimer
  l'export, l'Entry `hookSignIn` (`catalog/onboarding.ts:80`) **et corriger les deux docblocks**.
- **EVENT DE FUNNEL RÉATTRIBUÉ.** `ONBOARDING_STEP_PROMISE = 1` (`sign-in.tsx:94`, `.web:85`) émet
  `EVENTS.onboardingStep { n: 1 }` (`sign-in.tsx:230-232`). Or `content.ts:129-131` déclare le n=1
  **RÉSERVÉ** au splash `hook` supprimé le 22/07/2026, avec la règle explicite « RÉSERVÉS, jamais
  réattribués — chacun a eu une population, les mélanger fausserait l'entonnoir historique ».
  → Attribuer un n neuf, ou supprimer l'event (le `screen()` automatique de `app/_layout.tsx:45-49`
  mesure déjà l'entrée).
- **PARITÉ ANNONCÉE, TYPO DIVERGENTE.** Le docblock web (`.web:53-56`) garantit « hero, copie, gate
  d'âge et styles dupliqués à la main », mais `title`/`gateTitle` posent `fontFamily: fonts.textSemi`
  côté web (`.web:453-460`, `:508-514`) et **RIEN** côté natif (`sign-in.tsx:518-524`, `:566-571`) :
  **le même hero rend deux fontes selon la plateforme**. Un `TODO fonts` traîne à `sign-in.tsx:302`.
  Aligner les deux sur `fonts.display`.

#### Écarts de forme — onboarding

1. La frise de points n'existe **que** sur E01 (`E01Hero.tsx:84-88`) : rivalry/city/account n'ont
   aucun repère de progression. La remonter dans `StepHeader` (`index.tsx:386-408`), déjà rendu hors
   contenu.
2. Deux boutons chartreuse recodés avec **deux rayons différents pour le MÊME rôle** sur deux écrans
   consécutifs : `radii.pill` (`index.tsx:1067-1073`) vs `radii.btn` (`E01Hero.tsx:124-131`).
   → `Button variant="primary" size="lg"` des deux côtés.
3. `E01Hero.tsx` n'utilise **aucun** token de taille : `fontSize: 40`/`lineHeight: 44` (`:108-115`),
   `fontSize: 16` (`:116-121`), `fontSize: 14` (`:104`), `dot` 5 px / actif 16 px (`:136-138`).
   → constantes nommées et commentées (règle 19) ou `fontSizes.*`.
4. Trois scrims en `rgba(6,8,7,0.25|0.55)` littéraux (`E01Hero.tsx:99-101`) alors que
   `withAlpha(colors.carbonImmersive, 0.25)` existe (`design-tokens.ts:257`). Idem
   `stroke="rgba(6,8,7,0.55)"` et `stroke="#060807"` (`E01Route.tsx:76`, `:96`).
5. Code mort : `MECHANIC.exampleTag` / `demoLabel` / `demoReplay` / `street` (`content.ts:253-261`)
   ne sont plus lus depuis le passage à `E01Hero`, et `CaptureDemo` (`visuals.tsx:237`) n'a plus
   **aucun** importeur — mais `flow.test.ts:104` teste encore `MECHANIC.demoLabel`. Retirer ou
   rebrancher, **et mettre le test d'accord**.
6. Cinq styles morts (`listLabel`, `cityRow`, `cityRowSelected`, `cityName`, `cityNameSelected`,
   `index.tsx:1120-1143`) : reliquats du sélecteur remplacé par `CitySearch`.
7. `styles.ghost` hauteur 54 (`:1081-1089`) et `styles.input` hauteur 48 (`:1108-1119`) : hors
   `sizes.buttonMd` (48) / `buttonLg` (56) et hors des **champs 56 pt** imposés par E21.
8. Aucune protection de troncature sur `ctaLabel` (`index.tsx:1077`, `E01Hero.tsx:132`) : le
   garde-fou `CITY_CTA_LABEL_MAX = 26` (`content.ts:387`) ne couvre **que** l'écran ville.
   → technique (b) de `Button.tsx:117-127` partout.
9. `confirmAge` (`index.tsx:255-257`) déclare `[step, update, go]` mais n'utilise ni `step` ni `go`.
10. **Cul-de-sac :** depuis l'écran ville, répondre « moins de 16 » (`:724-733` → `AgeStep blocked`,
    `:555-570`) rend un écran terminal **sans footer** ; la seule sortie est la flèche du header, qui
    pointe sur `rivalry`, **pas sur la ville**. Poser un retour explicite.

#### Écarts de forme — connexion

11. **Le kicker est CHARTREUSE** (`sign-in.tsx:511-517`, `.web:446-452`) alors que la grammaire impose
    un **kicker MONO GRIS** — c'est le marqueur n°1 du recalage (règle 2). → `typography.kicker` +
    `colors.gris` + `fonts.mono`.
12. Trois boutons recodés : `ghostButton` hauteur 52 (`sign-in.tsx:534-541`, `.web:469-476`) et `cta`
    hauteur 56 (`sign-in.tsx:582-590`). → `Button variant="ghost"|"primary"` (apporte au passage
    l'anneau de focus clavier, le libellé non tronqué et `analyticsId`).
13. **Une fois l'âge déclaré, l'écran n'a PLUS AUCUN CTA chartreuse** : la seule porte restante
    (l'e-mail) est peinte en ghost (`sign-in.tsx:372-381`). `AccountStep` de l'onboarding fait
    l'inverse pour la même décision (`index.tsx:977-978`). **Aligner : la voie unique monte en CTA.**
14. Champs sans label persistant (`placeholder` seul, `sign-in.tsx:390-401` et `:438-448`), hauteur 52
    et `radii.pill` — E21 impose **56 pt à labels persistants**, patron déjà appliqué dans `profil-edit`.
15. Parité a11y rompue : `styles.error` sans `accessibilityRole="alert"` sur natif (`:470`) alors que
    le web l'annonce (`.web:404-408`) ; `accessibilityState={{disabled}}` posé web (`.web:348`),
    absent natif (`:404`, `:451`).
16. `PromiseHexField` est dupliqué **VERBATIM sur ~85 lignes** (`sign-in.tsx:105-190` /
    `.web:93-178`). → extraire en `src/features/onboarding/PromiseHexField.tsx` (**fichier neuf, dans
    le périmètre du lot**).
17. Style inline sur le bouton « renvoyer » du natif (`:429`, `:464`) alors que le web a `resendHit`.
18. Docblocks sans les 3 sections normatives (règle 14), des deux côtés.

---

### Lot B — HISTORIQUE & TERRITOIRE — **P1, effort M+M+M** — 🚦 **DÉMARRAGE DIFFÉRÉ**

> 🚦 **Ne démarre pas tant que le chantier E14 n'est pas committé** (§0). `app/historique.tsx`
> (+171 l.) et `catalog/historique.ts` (+45 l.) sont en cours de réécriture. **Repartir de l'état
> committé et revérifier tous les numéros de ligne de la section `/historique` ci-dessous.** Un
> **cinquième état** (« lentille Bike : discipline non mesurée ») y sera présent : il ne remplace
> aucun des quatre, il s'y ajoute. Les parties `/territoire` et `/course/[id]` du lot, elles, sont
> libres de toute collision et peuvent commencer tout de suite.

**Pourquoi juste après les P0.** Les deux écrans sont poussés **depuis le Profil recalé**
(`profil.tsx:774` → `/territoire`, `:841` et `:910` → `/historique`) et depuis la carte
(`BattleMapOverlays.tsx:832`). C'est la première marche après la référence : la rupture de style s'y
voit immédiatement.

**Périmètre EXCLUSIF :**
`apps/mobile/app/historique.tsx` · `apps/mobile/app/territoire.tsx` · `apps/mobile/app/course/[id].tsx` ·
`apps/mobile/src/features/history/**` · `apps/mobile/src/features/territory/**` ·
`apps/mobile/src/i18n/catalog/historique.ts`

**Lecture seule :** `catalog/map.ts`, `catalog/performance.ts` (si une chaîne manque, elle va dans
`historique.ts`), `src/features/map/hexClaims.ts`.

#### `/historique` — le meilleur élève du groupe côté honnêteté

Les quatre états sont **correctement séparés** ; ne pas les refaire.

**Mensonges :**
- **TEXTE DEVENU FAUX.** L'état vide dit « Tes courses apparaîtront ici après ta première **capture**. »
  (`catalog/historique.ts:88`) alors que la liste affiche **TOUTES** les courses, capture ou pas — le
  filtre `stats` existe précisément pour les sorties sans capture (`historique.tsx:59`). Un joueur qui
  court sans capturer voit sa course apparaître **après avoir lu qu'elle n'y serait pas**. →
  « ta première course enregistrée ».
- **PROMESSE AU-DELÀ DU CODE.** Le sous-titre annonce « Tous tes parcours : **le tracé**, l'effort et
  ce qu'il a changé sur le terrain. » (`historique.ts:32`) alors qu'aucune vignette de tracé n'est
  rendue, et que `RealRunCard.tsx:17-19` documente pourquoi (`polyline_masked` n'est pas décodé). →
  retirer « le tracé » du sous-titre tant que la vignette n'existe pas.
- **PROMESSE IMPLICITE NON TENUE, ET NON DITE.** Aucune card n'est cliquable (`RealRunCard.tsx:20-24`
  explique le retrait du « Voir détail »), mais **l'écran ne le dit pas** : le joueur tape une course
  et rien ne se passe. → note grise de pied de page (patron `qr.tsx` : ce qui n'existe pas se dit en
  bas, en gris, **après** l'action), ou retirer toute apparence de card tappable.

**Écarts :** chips de filtre recodées (`:95-110`, styles `:252-273`) → `Segmented tone="surface"
scrollable` · **sortir la chartreuse du filtre sélectionné** (`filterChipOn` `:263`,
`filterLabelOn`/`filterCountOn` `:265`, `:273`) → surface N2 · CTA recodé de `StateCard`
(`:298-306`) → `<Button>` · retirer `borderWidth: 1` de la card de course
(`RealRunCard.tsx:140-146`) — N cards toutes bordées = le cadre permanent supprimé à la source ·
remplacer les deux mini-cellules d'impact (`RealRunCard.tsx:113-133`, `:158-160`) par `SheetMetrics` ·
chargement en **LIGNE grise**, pas en `StateCard` centrée (`:184`) · corriger les ellipses
(`styles.when` `:149`, `impactLabel`) · docblock règle 14.

#### `/territoire`

**Mensonges :**
- **BOUTON MORT.** En état `signed-out`, le CTA pousse `/(auth)/sign-in` (`:169`) **sans vérifier
  `configured`**. `useRealTerritories` met `signedOut: true` quand `supabase` est absent
  (`features/map/hexClaims.ts:167`) et `app/(auth)/sign-in.tsx:241` fait
  `if (session || !configured) return <Redirect href="/" />` : **sans backend, « Se connecter »
  renvoie le joueur à la carte.** → reprendre la garde `canSignIn = configured && !session &&
  !sessionLoading` (`profil.tsx:360-364`), et une phrase à la place du bouton quand elle est fausse.
- **CTA QUI NE FAIT PAS CE QU'IL DIT.** Le bouton Partager (`:265`) pousse `/partage?template=conquete`
  **sans jamais appeler `setShareRun`** — or `/partage` lit le singleton armé par le Résultat de course
  (`partage.tsx:201-206`) et affiche `ShareEmptyState` quand il est vide (`:766`). Depuis
  `/territoire`, « Partager » aboutit **toujours** à un écran vide. → armer une carte de partage
  territoriale réelle, ou retirer le bouton.
- **ÉTAT DE CHARGEMENT MUET.** En `pageState === 'loading'`, la page n'affiche **RIEN** (`:211-219` et
  `:242` sont conditionnés à `held`) : visuellement identique à l'état vide, pendant que le CTA du bas
  affirme déjà « Voir sur la carte » comme si la lecture était finie. → LIGNE grise non tapable.
- **GRAMMAIRE FAUSSE À 1.** « {n} zones tenues » (`catalog/historique.ts:418-421`) n'a pas de forme
  singulier : un joueur avec une seule zone lit « **1 zones tenues** ». Le catalogue sait déjà faire
  (`countRunsOne` / `countRunsMany`).

**Écarts :** remplacer le châssis recodé (barre retour, kicker, titre, ScrollView, insets `:183-198`,
styles `:276-299`) par **`StackScreen`** · **supprimer le composant `Section` (`:73-103`) — défini,
jamais monté — et les 16 styles morts** qui l'accompagnent (`:287-370`) · remplacer la ligne de résumé
(`:211-219`) par le bloc de métriques à séparateurs, 2 cellules, une seule mise en avant chartreuse ·
retirer le contour de `mapWrap` (`:302-309`) · **conditionner la carte de 220 px (`:223-225`) aux
états `held`/`empty`** (aujourd'hui rendue aussi en `signed-out`/`failed`/`loading`, où elle occupe le
premier écran avec une vue monde vide) · ajouter les **quatre cartes d'état nommées** (aujourd'hui les
états ne se distinguent QUE par le libellé du bouton du bas) · `ctaPrimary` (`:386-396`) → `<Button>`
et **dégrader Partager en lien texte ou `headerRight`** · `typography.title` / `typography.kicker` ·
docblock règle 14.

#### `/course/[id]` — **décision avant travail**

`findRealRun()` (`:337-339`) retourne `undefined` **en dur** — vérifié — donc le rendu s'arrête
toujours à `:357-363`. Les **~500 lignes suivantes** (bloc effort, pastille Verify, scène 2D/3D, bloc
de refus, mini-carte avant/après, détail du calcul, segments, 3 CTA) sont du **code mort compilé mais
jamais exécuté**. Aucune route ne pousse cet écran (0 référent, vérifié) : il n'est atteignable qu'en
deep link.

**Ne PAS recaler le corps.** Voir §6. Le travail du lot se limite à :
- Réduire l'écran à sa **page d'état honnête** : remplacer la phrase grise nue (`:360`,
  `styles.empty` `:520`) par une `stateCard` avec un retour explicite vers `/historique`.
- **Corriger le texte faux** : « Cette course n'est pas dans ton historique. Tes courses apparaîtront
  ici après ta première sortie enregistrée. » (`catalog/historique.ts:128`) sera servi **tel quel à un
  joueur qui a des dizaines de courses** le jour où un lien mènera ici. Le texte doit dire « le détail
  d'une course n'est pas encore disponible », **jamais nier l'historique**.
- **Supprimer les imports de démo** : `runTrace` (`:33`), `RunHistoryEntry`/`RefusalReason`/
  `SegmentState` (`:34-41`), `BOUCLE_REPUBLIQUE`/`BOUCLE_BASTILLE` (`:47-57`) — leur présence met la
  réactivation de la boucle République de démo **à un tap de distance**.
- **Vérifier l'analytics** : `screen('course_detail', { id })` (`:353-355`) envoie l'identifiant reçu
  par deep link en propriété d'event — s'assurer que ce n'est pas un identifiant interne / PII.
- Remonter en tête de docblock le fait que la lecture réelle n'existe pas (le commentaire vit à
  `:344-350`, soit **330 lignes après** un docblock `:1-19` qui décrit un écran riche), et déclarer
  qu'il n'y a **pas de 4e état** (patron `qr.tsx:31-34`).

---

### Lot F — RÉGLAGES & CONFIDENTIALITÉ — **P1, effort L (le plus gros lot)**

**Pourquoi P1.** `/parametres` est poussé depuis le Profil (`profil.tsx:583`) et ouvre huit
sous-pages + confidentialité + support. C'est **la plus grande surface de l'app** et celle qui porte
**le plus de boutons morts**.

**Périmètre EXCLUSIF :**
`app/parametres.tsx` · `app/parametres/[section].tsx` · `app/confidentialite.tsx` · `app/langue.tsx` ·
`app/support.tsx` · `app/mes-parcours.tsx` · `app/sources.tsx` · `app/code-conduite.tsx` ·
`src/features/settings/**` · `src/features/privacy/**` · `src/features/routePrefs/**` ·
`src/features/sources/**` · `src/features/crew/moderation.ts` ·
`src/i18n/catalog/reglages.ts` · `src/i18n/catalog/parcours.ts` · **`src/i18n/catalog/sources.ts` (nouveau)**

> ⚠️ **`catalog/auth.ts` (Lot C) et `catalog/city.ts` (Lot G) sont en LECTURE SEULE ici.** Les chaînes
> de sources à traduire vont dans le **nouveau** `catalog/sources.ts`, pas dans `auth.ts`.
> **`src/features/routePrefs/store.ts`** est lu par le Lot A via `features/route/suggestion.ts` :
> **ajouts autorisés (ex. `reload`), signatures existantes intouchées.**
> **`src/features/season/**` : lecture seule** (partagé avec le Lot H).

#### Les 5 mensonges structurants du lot

1. **NEUF LIGNES SUR QUINZE RESTENT EN FRANÇAIS** quelle que soit la langue : `SETTINGS_GROUPS`
   (`src/features/settings/sections.ts:47-108`) contient `'TON COMPTE'`, `'Compte'`, `'E-mail,
   connexion, sécurité'`… rendus tels quels (`parametres.tsx:87-89`), pendant que les 3 groupes
   ajoutés plus bas passent bien par `t()`. **La ligne « Langue » elle-même est traduite** — l'
   incohérence est visible dans le même écran. Idem le titre de barre des 8 sous-pages
   (`title={meta?.label}`, `[section].tsx:284`) et `<ListRow label="Crew">` (`:442`).
   → convertir `label`/`detail` en `Entry` (patron déjà appliqué à `EXPLAIN_ROWS`, `parametres.tsx:113-118`).
2. **DEUX BOUTONS MORTS DÉGUISÉS EN NAVIGATION.** « E-mail » (`[section].tsx:315-321`) et « Sécurité »
   (`:322-328`) portent un chevron et ouvrent une `Alert` « arrive très bientôt » : **ils échouent à
   100 % des taps, sur toutes les plateformes**. Les retirer et nommer leur absence en gris sous la
   section.
3. **QUATRE BOUTONS MORTS SUR L'ÉCRAN DE RECOURS.** `/support` : « Course non comptée », « Segment
   exclu », « Signaler une triche », « Zone dangereuse » (`RUN_TOPICS:77-90`, `REPORT_TOPICS:93-106`)
   ouvrent toutes la même `Alert` « cette remontée n'est pas encore transmise ». Et
   `C.supportFootnote` (`:222`) affirme « les décisions de vérification sont expliquées, jamais
   automatiques sans recours » — **or il n'existe aucun recours**. Voir §4.
4. **HUIT RÉGLAGES DE CONFIDENTIALITÉ SANS AUCUN CONSOMMATEUR.** `livePosition`, `territoryVisible`,
   `heartRatePrivate`, `sportDataPrivate`, `whoCanAdd`, `whoCanInvite`, `whoCanMessage`, `whoSeesStatus`
   : **0 occurrence hors du store et de cet écran**. Des interrupteurs sans effet sur la page qui
   promet de gouverner l'exposition de la géolocalisation. Pire :
   - « Rayon de flou · 200 m / 500 m / 1 km » (`:381-386`) **ne change rien** : le seul consommateur,
     `partage.tsx:276`, appelle `applySharePrivacy(runCard.trace)` **sans `trimM`**, donc toujours
     `SHARE_TRIM_M = 200` (`sharePrivacy.ts:19`). **Choisir « 1 km » masque 200 m.**
   - « Autour du domicile » / « Autour du travail » (`:388-397`) : `maskHome`/`maskWork` ne sont lus
     nulle part, **et aucun écran ne permet de déclarer une adresse**. Inopérables par construction.
   - La card maître affirme « tout est verrouillé » sur un simple `every()` de valeurs **LOCALES**
     (`:136-142`), alors que rien n'est envoyé au serveur (AsyncStorage, « miroir client », TODO O1).
   → **Soit on câble, soit on retire.** Un interrupteur de confidentialité sans effet est le pire
   mensonge de l'app.
5. **UN MÊME RÉGLAGE, DEUX STORES, DEUX VALEURS.** « Profil visible par » existe dans
   `motivation/store.ts` (clé `gryd.motivation.prefs.v1`, écran `/settings-motivation`, **Lot E**)
   ET dans `privacy/store.ts` (clé `gryd.privacy.prefs.v1`, écran `/confidentialite`). **C'est la
   valeur de `privacy` que lisent le Profil (`profil.tsx:326`) et l'édition de profil
   (`profil-edit.tsx:205`).** E21 tranche : « la visibilité renvoie à Confidentialité — un seul
   endroit ». **La suppression du doublon se fait côté Lot E** ; le Lot F ne fait rien ici, il
   constate. *(Coordination : c'est le seul point de contact entre F et E, et il ne partage aucun fichier.)*

#### Autres mensonges à corriger, par écran

- **`/parametres`** : la ligne « Carte · Couche par défaut, trace » (`sections.ts:66`) annonce un
  réglage **qui n'existe pas** — la sous-page ne rend qu'une valeur en lecture « Auto »
  (`[section].tsx:560`).
- **`/parametres/[section]`** : `C.emailSoonBody` renvoie vers `/support`, **boucle fermée** (§4) ·
  trois copies « bientôt disponible » sans date ni code (`accountSoonNote`, `emailSoonBody`,
  `securitySoonBody`) — **« bientôt » n'est pas un état honnête** · la sous-page Notifications n'a
  **pas d'état « pas connecté »** : on choisit ses canaux et on enregistre l'appareil hors session
  (`:534-546` ne teste que `pushStatus`).
- **`/confidentialite`** : « Supprimer l'historique » et « Supprimer les données sportives »
  (`:605-615`) sont **deux lignes destructives dont le seul comportement est une `Alert`** renvoyant
  vers un canal inexistant · l'état « lecture en cours » de la suppression différée n'est pas rendu :
  `deletionStatus` vaut `null` tant que le serveur n'a pas répondu, et la branche `else` (`:638-661`)
  **affirme alors qu'aucune suppression n'est en cours alors qu'elle ne le sait pas** · le bloc
  export/suppression **ne distingue pas « pas connecté »** : le CTA est peint, et l'utilisateur
  n'apprend qu'après le tap qu'il faut une session (`:298-301`, `:238-244`).
- **`/mes-parcours`** : **échec sans sortie** — « GRYD n'a pas pu charger tes réglages. Réessaie plus
  tard. » (`catalog/parcours.ts:314`) et **rien d'autre**, pas de « Réessayer » (`useRoutePrefs`
  n'expose pas de `reload` : l'ajouter, le refetch sur focus existe déjà via `focusTick`) · **états
  branchés sur le mauvais signal** : l'écran teste `!ready`/`loading`/`!prefs` (`:230-235`) au lieu du
  `status` que le store expose **exprès** (`routePrefs/store.ts:112-129` :
  `loading | unavailable | error | ready`) — il ne peut donc pas distinguer « pas de backend » de
  « lecture ratée » · la garde de `HabitsCard` en état `unknown` (« Pas encore assez de courses… »,
  `parcours.ts:73`) est **implicite** : la rendre explicite.
- **`/sources`** : **aucun état « pas connecté »** — « Importer » est peint hors session, l'utilisateur
  choisit un fichier dans le sélecteur natif et n'apprend qu'**après** qu'un compte est nécessaire
  (`gpx.ts:101-105`) : **le coût est payé avant le message** · `status()` de gpx renvoie **toujours**
  `READY` (`gpx.ts:165`) : l'écran ne peut structurellement pas dire « je n'ai pas réussi à lire l'état
  de tes sources » → **le déclarer**, comme `qr.tsx` déclare n'avoir pas de 4e état · le titre
  « GRYD Verify Hub » (`:228`) est en dur pendant que tout le reste passe par `t()`.
- **`/code-conduite`** : **quatre copies décrivent un chat qui n'existe pas** — « appui long ou menu
  "Signaler" » sur un message (`reglages.ts:1665`), « bloquer masque tous ses messages »
  (`:1680`), « le chat crew sert à jouer » (`:1637`) : **il n'y a ni route, ni 4e onglet, ni écran de
  chat** (`RealCrewScreen.tsx:36-38`) · « une personne lit chaque signalement » (`:1665`, `:1702`)
  **contredit frontalement `/support`** dans le même build — et c'est **la copie que l'App Store lira
  comme un engagement de modération (Guideline 1.2)** · **aucun chemin vers l'action** : l'écran
  explique comment signaler et bloquer **sans un seul lien vers `/confidentialite`**, où ces deux
  gestes existent réellement (`confidentialite.tsx:193`, `:526`).

#### Écarts de forme du lot (transversaux)

- **Le composant `Row` local de `/parametres` (`:44-75` + styles `:143-171`) duplique `ListRow` au
  pixel près** → `src/ui/ListRow`. Idem `TopicCard`/`NavCard`/`TopicIcon` de `/support` (`:129-187`),
  `SourceRow` de `/sources` (`:82-152`), la `Pressable` de `/langue` (`:45-63`), le `EmptyState` local
  de `[section].tsx` (`:164-184`).
- **Cadres permanents à retirer partout** : `parametres.tsx:149-150` (15 cadres pour de la
  navigation), `privacy/ui.tsx:163-164` et `:811-812` (10 cadres — `cardOpen` et `masterActive` sont
  de **vrais** états et perdent leur sens noyés dedans), `support.tsx:236-237` (9 cadres),
  `code-conduite.tsx:106-108` (8 cadres), `langue.tsx:80-81` (5 cadres dont un change juste de
  couleur — sans cadre permanent, la bordure chartreuse **redevient** un état), `mes-parcours.tsx:327-334`
  et `:362-374`, `sources.tsx:268-269` et `:298-299`, `challenges`… **et `iconWrap` de
  `code-conduite.tsx:112-120` est un carré CADRÉ dans une card CADRÉE** → `IconPlate`.
- **Ellipses garanties en DE/PT** (`numberOfLines={1}` nu, règle 9) : `parametres.tsx:65` et `:68`
  (le détail « GPS, Apple Health, Strava, WHOOP… » dépasse 375 px), `privacy/ui.tsx:65-71`
  (`headTitle`/`headValue` sous `maxWidth: '42%'`), `privacy/ui.tsx:537` (**`blockedName` — un pseudo
  tronqué dans une liste de blocage est le pire endroit possible**), `mes-parcours.tsx:86-91`,
  `:107`, `:156-161`, `sources.tsx:93`, `:96`, `:104`.
- **Boutons recodés** : `masterCta` (`privacy/ui.tsx:834-844`, hauteur 52 + aplat chartreuse),
  `confirmDelete` (`:976-985`), `emptyCta` de `[section].tsx`. → `<Button>`. Et **passer « Réessayer »
  de l'échec crew en `variant="ghost"`** (`[section].tsx:431` — un `Button` sans variante est
  `primary`, donc chartreuse).
- **`fontWeight` posé par-dessus une famille à graisse nommée** (interdit, `design-tokens.ts:55-57`) :
  `privacy/ui.tsx:820`, `:876`, `:879`, `:844` ; `[section].tsx:706` ; `sources.tsx:314-348` (6×) ;
  `code-conduite.tsx:122`. **Et zéro `fontFamily` dans `parametres.tsx`, `langue.tsx`,
  `support.tsx`, `settings`** → la fonte système, pas Inter.
- **Kickers absents** : `[section].tsx:284` (les 8 sous-pages), `confidentialite.tsx:332`,
  `support.tsx`, `sources.tsx`. Règle 2.
- **Spinners pleins écran** : `mes-parcours.tsx:233` et `:112`. → ligne grise.
- **Traductions manquantes** : `privacy/labels.ts` (5 tables `Record<..., string>` en **français en
  dur** — ce sont les valeurs affichées dans l'en-tête de **chaque** card et le libellé de **chaque**
  pastille), `crew/moderation.ts:37-42` (`REPORT_REASONS` + hints), `features/sources/catalog.ts:39-42`
  (`TRUST_LABELS`) et `:74`, `:86` (le champ `path`).
- **Épuration** : `/confidentialite` empile 9 cards + saisie + liste de bloqués + 2 blocs RGPD sur un
  seul scroll → extraire « Blocage & signalement » et « Mes données (RGPD) » vers deux pages poussées,
  avec deux `ListRow` à chevron · `/parametres` : **7 sur-titres → viser 3** (« TON COMPTE » et
  « DONNÉES & COMPTE » parlent du même sujet, séparés par « JEU » ; le sur-titre « LANGUE » est
  identique au libellé de l'unique ligne qu'il coiffe) · `/support` : fusionner les **deux** entrées
  qui pointent sur la MÊME route `/calcul-zones` (`:53-59` et `:60-66`) et **distinguer visuellement
  ce qui navigue de ce qui n'aboutit pas** (aujourd'hui les 9 cards ont le même chevron, donc la même
  promesse) · `[section].tsx` : supprimer « Annonces audio · Bientôt » (`:506`), « Couche par défaut ·
  Auto » (`:560`), « Build » (`:672` — **exactement la même chaîne que « Version » `:575`, sous un
  autre nom, dans une autre sous-page : deux noms pour une valeur = une distinction fabriquée**), et
  ne plus rendre la baseline produit en `<Soon>` (`:635`, style réservé au « pas encore disponible »).
- **`formatDate()` renvoie `'—'`** quand l'ISO est nul (`privacy/ui.tsx:214-221`) : « supprimé le — »
  est exactement le cas visé par la règle 15 → **supprimer le segment**.
- **`[section].tsx` : ajouter un état pour un slug inconnu** au lieu du repli silencieux
  `isSection(raw) ? raw : 'compte'` (`:189`) — un deep link `/parametres/xyz` affiche Compte sans
  jamais dire que la section demandée n'existe pas.
- **`/langue`** (aucun mensonge, 5 écarts seulement) : `ListRow` · retirer les cadres permanents ·
  `minHeight: 52` littéral → `sizes.touchTarget` ou constante nommée · poser les familles ·
  `accessibilityRole="radiogroup"` sur le conteneur (`:41`).
- **Vider `privacy/ui.tsx` de `SectionLabel`** et le faire ré-exporter depuis `src/ui/SectionLabel.tsx`
  (créé par le Lot 0), puis aligner le rythme vertical (aujourd'hui `marginTop: 24 / marginBottom: 10`
  ici vs `marginTop: spacing.xl` sans marge basse ailleurs).
- Documenter ou remplacer `SelectPills` (`privacy/ui.tsx`) : **ce n'est pas le `Segmented` du
  système**, et la raison (plus de 5 options de distance) doit être écrite si on le garde.
- Remplacer l'`Alert.alert` d'échec d'enregistrement (`mes-parcours.tsx:184`) par le toast maison ;
  la confirmation destructive (`:197`) peut rester native.
- Remplacer le placeholder `…` du statut en cours de lecture (`sources.tsx:148-150`) : **un caractère
  d'ellipse seul n'affirme rien et viole la règle 9** · réserver la couleur au rôle : l'icône de
  chaque source est chartreuse (`:89`) alors que **la chartreuse dit « moi/mon crew »** — ici elle
  décore une source tierce · réduire les deux notes de pied de page (`:255-256`) à une seule.

---

### Lot H — EXPLICABILITÉ : FAQ + calcul des zones — **P1, effort M**

**Pourquoi P1.** `/faq` est l'écran le plus atteint du groupe (Réglages, Support, et
`calcul-zones.tsx:89`), et il contient **une contradiction frontale avec les CGU du même build**.
`/calcul-zones` est, sur le fond, **irréprochable** — ne pas inventer de travail dessus.

**Périmètre EXCLUSIF :**
`app/faq.tsx` · `app/calcul-zones.tsx` · `src/features/explain/**` · `src/i18n/catalog/explain.ts` ·
`src/i18n/catalog/faq.ts`

**Lecture seule stricte :** `packages/shared/src/game-rules.ts` (chantier parallèle) et
`src/features/season/**` (partagé avec le Lot F).

#### Mensonges — `/faq`

- **CONTRADICTION AVEC LES CGU ET LES CGV.** « Les achats servent au style, au confort et **AU COFFRE
  CREW** » (`explain.ts:680`). Or le coffre crew **a été supprimé comme donnée fabriquée**
  (`aujourdhui.tsx:14` et `:28`, `(tabs)/crew.tsx:6`, `warroom.tsx:7`), et surtout la phrase **vend un
  objet de JEU**, ce que les CGU et CGV du même build interdisent noir sur blanc (« les objets qui
  touchent au jeu … ne sont vendus dans aucune monnaie », `legal.ts:248` et `:386`). → Réécrire :
  « Non. Le territoire ne s'achète jamais. Les achats ne portent que sur du cosmétique et du statut. »
- « **une personne lit chaque demande** » (`faqFootnote`, `explain.ts:426`) — canal inexistant (§4).
- « **L'aide GRYD reprend chaque cas** » (même note) : `/support` couvre 4 rubriques dont **deux
  n'aboutissent sur aucune action**.
- Les 3 questions « Saison » (`faq.tsx:196-217`) expliquent une saison de 8 semaines et un inter-saison
  de 7 jours **sans dire nulle part qu'aucune saison n'est ouverte** — c'est précisément pour ça que le
  segment « Saison » a été retiré de `performance.tsx:33-36`. → note d'état, ou renvoi au vrai statut
  serveur (`SeasonStatus`, **en lecture seule**).

#### Mensonges — `/calcul-zones` : **aucun**

Toutes les valeurs de règles sont injectées depuis `game-rules.ts` via `ExplainSchema` et `labels.ts`
(zéro nombre magique), et les chiffres de scénario sont préfixés « Exemple : » dans le catalogue
5 langues. **Deux points de vigilance à inscrire, pas à corriger :**
- ces exemples doivent rester **impersonnels** (« une course de 6,2 km »), jamais formulés en « ta
  course », sinon ils redeviennent une donnée fabriquée sur le joueur ;
- l'écran ne fait **aucune** lecture réseau et ne l'écrit nulle part → **déclarer** « pas de lecture ⇒
  ni chargement ni échec » (patron `qr.tsx:31-34`), pour qu'une passe future n'invente ni spinner ni
  « Réessayer ».

#### Écarts

**`/faq`** : le segmented « Simple / Avancé » est **recodé** (`:145-168` + `:243-261`) alors que
`Segmented` est **obligatoire hors carte** — on récupère au passage `accessibilityRole="tablist"/"tab"`
(aujourd'hui `"button"`, `:146`, `:158`), l'haptique, `radii.pill` et le clip · `iconWrap` 30×30 cadré
(`:275-283`) → `IconPlate size="sm"` · `groupLabel` (`:264-269`) → `SectionLabel` du Lot 0 · `q`
cumule `fonts.textSemi` **et** `fontWeight: '600'` (`:284`), `a` (`:288`) et `footnote` (`:292`) n'ont
aucune famille · `colors.carbone`/`carbone2` en dur (`:245`, `:259`) → `elevation.surface`/`raised` ·
`rowHead` (`:273`) sans `minHeight: sizes.touchTarget` · **filet orphelin** : `borderBottomWidth: 1`
sur CHAQUE ligne (`:272`), donc un filet flotte au-dessus du label de groupe suivant · littéraux nus
(`:276-277`, `:287`, `:296` — **`FAQ_SCHEMA_WIDTH = 260` `:62` est en revanche le bon patron**) ·
**~32 accordéons sans sommaire ni recherche** : replier aussi les GROUPES, ou ajouter un champ de
filtre · docblock règle 14.

**`/calcul-zones`** : `iconWrap` recodé (`:105-113` : 38×38, `borderRadius: 11`, `borderWidth: 1`) →
`IconPlate` · donner un **vrai kicker mono** à chaque scène (le numéro « 01 » `:52` tient lieu de
sur-titre sans `typography.kicker`) · `styles.title` (`:120`) → `typography.cardTitle` · nommer
`schemaWidth = 280` (`:45`) et `marginBottom: 40` (`:103`) en constantes de composition commentées ·
`Icon size={20}` en dur (`:50`) → `iconSizes.md` · aligner la ligne de pied (`:86-95`) sur le patron
de ligne scannable (`minHeight: sizes.touchTarget`, `borderState.hairline`) · docblock règle 14.

---

### Lot D — INVITATION & CREW PUBLIC — **P1, effort M**

**Pourquoi P1.** `/c/[code]` est l'écran que **traverse tout nouveau recruté**. Son raisonnement
anti-mensonge (ne jamais afficher le nom du crew avant l'adhésion) est **exemplaire** ; ce sont la DA
et deux états qui ne suivent pas.

**Périmètre EXCLUSIF :**
`app/c/[code].tsx` · `app/crew-discovery.tsx` · `app/crew-public.tsx` · `app/crew-edit.tsx` ·
`src/i18n/catalog/crew.ts`

> **UNIQUE dérogation aux écrans recalés, dans toute cette Vague.** Ce lot — et lui seul — est
> autorisé à modifier **deux points précis** :
> - `app/(tabs)/profil.tsx:617-620` : la destination `router.push('/crew-discovery')` ;
> - `src/i18n/catalog/profil.ts`, entrée **`linkFindCrew` uniquement** (`profil.ts:1344`).
>
> **Rien d'autre dans ces deux fichiers.** Motif : le libellé « Trouver un crew » est **le seul chemin
> offert à un joueur sans crew** (`noCrewConfirmed`), et il n'ouvre aucune découverte — l'écran
> d'arrivée (`RealCrewScreen`) ne propose que « Créer mon crew » et « J'ai un code ». Le bouton
> n'échoue pas techniquement, **mais il ne tient pas ce qu'il dit**. Renommer le lien pour dire ce qui
> existe (« Rejoindre avec un code »), et router **directement** sur `/crew` — un écran P0 ne doit pas
> payer une frame de redirection.

#### Mensonges — `/c/[code]`

- **« SAISON 0 » AFFIRMÉE SANS SOURCE.** Le kicker (`:214`) est une constante en dur
  (`catalog/crew.ts:34-40`), jamais une lecture de `useActiveSeason`. `arsenal.tsx:233` lit le vrai
  numéro de saison, et `performance.tsx:33-36` **refuse** d'afficher le segment « Saison » précisément
  parce qu'aucune saison n'est ouverte. **Deux écrans, deux vérités, sur l'écran que traverse tout
  nouveau recruté.**
- **CHARGEMENT = ÉCRAN VIDE.** La branche `sessionLoading` (`:169`) rend `<Shell>` **sans aucun
  enfant** : barre, titre, kicker, puis du noir. C'est l'état exactement interdit. → `stateInline`.
- **ÉTAT ③ MANQUANT.** L'échec de `fetchMyCode()` est **avalé** (`:101-107`,
  `if (alive && res.ok && res.code === code)`) : une RPC injoignable est traitée **exactement comme
  « tu n'es pas dans ce crew »**, et l'écran propose « Rejoindre » à quelqu'un qui en est peut-être
  déjà membre. → 4e état distinct + « Réessayer » (patron `RealCrewScreen.tsx:985-1008`).
- **PROMESSE AVANT VÉRIFICATION.** `C.cInviteJoinBody` affirme « Ce code t'ouvre le crew. Tu cours
  pour lui dès ta prochaine sortie. » (`catalog/crew.ts:3243-3244`) **avant tout appel serveur**,
  alors que le docblock du fichier explique lui-même (`:20-24`) qu'aucune RPC ne peut résoudre le
  code : il peut être inconnu, le crew plein, ou le joueur en cooldown. → reformuler à l'action
  (« Ce code demande l'entrée dans un crew. »).

#### Écarts — `/c/[code]`

Le kicker vaut « SAISON 0 » (`:214`) : sur un écran d'invitation il doit nommer **le contexte de
l'écran** (« INVITATION ») · `styles.title` (`:233`) et `styles.body` (`:234`) recodent taille +
graisse au lieu de `typography.title`/`typography.body`, et **n'ont aucun `fontFamily`** → fonte
système · le `Button` « Rejoindre » (`:197`) n'a pas d'`analyticsId` alors que **c'est LA décision de
l'écran** · le message de refus (`:195`) est rendu **sans `accessibilityRole="alert"`** · `styles.plate`
(`:237-245`) porte un contour permanent qui ne signale aucun état (la surface N2 suffit) · **le code
affiché n'est ni copiable ni sélectionnable** alors que E16 exige une URL crew COPIABLE et que
`qr.tsx:186-204` a déjà l'action « Copier » en en-tête → `headerRight` de `StackScreen` · docblock
règle 14, avec la dépendance manquante nommée (la RPC publique qui résoudrait un code en nom).

#### Les trois stubs — **rien à peindre, tout à documenter**

`crew-discovery.tsx` (23 l.), `crew-public.tsx` (23 l.), `crew-edit.tsx` (26 l.) sont des redirects
avec docblock d'archivage. **L'archivage est propre : 0 mensonge, 0 rendu, 0 donnée fabriquée.**
Le lot ne construit rien ; il **inscrit** :

- **La fiche publique de crew que supposent DEUX planches n'existe nulle part** : E15 (profil public
  vu par un rival : contours généralisés, badge « Jamais de position live », DÉFIER/Suivre) et E16
  (variante crew du QR, URL `gryd.app/c/NIGHTOWLS`). **Aujourd'hui le QR crew encode `/c/CODE`, qui
  mène à l'ADHÉSION, jamais à une fiche consultable.** Et la route n'a **aucun segment dynamique**
  (`crew-public.tsx`, pas `crew-public/[tag].tsx`) : elle ne peut pas recevoir l'identité d'un crew.
  Une vraie fiche devra être `app/crew/[tag].tsx`, avec une RPC publique qui n'expose **ni le code
  secret** (colonne `code`, migration 0036) **ni la moindre position**.
- **Toute la moitié CREW de la planche E21 reste à construire** (`PLANCHES.md:296-302`) : bannière ·
  emblème en bibliothèque modulaire (12 silhouettes × 24 symboles, lisible à 24 pt) · **couleur limitée
  à une PALETTE VALIDÉE** (jamais une roue libre, qui dégraderait la carte) · Accès Public / Sur
  demande / Privé · prévisualisations · confirmation au changement de tag avec redirection 30 j.
- **Écrire ces trois manques dans la section « Ce qui reste EN SUSPENS » de
  `AMENDEMENT-47-FIN-DU-MODE-DEMO.md`**, pas seulement dans les docblocks des stubs. *(Le lot est
  autorisé à écrire dans ce fichier ; aucun autre lot n'y touche.)*

---

### Lot G — LÉGAL, MENTIONS & ATTRIBUTIONS — **P2 (⚠️ risque App Store / RGPD), effort M**

**Pourquoi ce n'est pas P1 malgré le risque.** Le fondateur ne voit jamais ces pages. Mais elles
contiennent **cinq déclarations juridiques fausses** et une **obligation de licence non tenue** — donc
ce lot peut, et devrait, tourner en parallèle dès le départ : son périmètre est totalement disjoint.

**Périmètre EXCLUSIF :**
`app/legal/**` (4 écrans) · `app/a-propos.tsx` · `app/credits-donnees.tsx` · `src/ui/LegalDoc.tsx` ·
`src/i18n/catalog/legal.ts` · `src/i18n/catalog/city.ts`

> ⚠️ **`catalog/city.ts` est lu par `parametres/[section].tsx` (Lot F), `profil-edit.tsx` et
> `RealCrewScreen.tsx` (recalés). AJOUTS SEULEMENT.**

#### Le châssis : neuf écarts qui se corrigent UNE fois dans `LegalDoc.tsx`

Kicker jamais passé (`LegalDoc.tsx:47` l'accepte pourtant ; `cgu.tsx:51-57` ne le donne pas) → créer
`cguKicker`, `cgvKicker`, `privacyKicker` (« POLITIQUE · RGPD » — **il lève au passage l'ambiguïté
entre le DOCUMENT et l'écran de réglages `/confidentialite`**), `licencesKicker` (« OPEN SOURCE ·
LICENCES ») · **police système au lieu d'Inter** : `LegalDoc.tsx:22` n'importe ni `fonts` ni
`typography` → `styles.body` (`:123`) = `[typography.body, …]`, `styles.heading` (`:108-114`) =
`[typography.kicker, …]` **en supprimant le `fontWeight: '700'` posé sans famille** · **N cards
empilées** (`:117-121` pose `elevation.surface` sur CHAQUE section : 11 pour les CGU, 10 pour les CGV,
**13 pour la politique**) → retirer le fond, laisser `styles.section` (`:103`) séparer par l'espace ·
surface recodée → `<Card>` si une surface est conservée · docblock non normatif → 3 parties, dont
« aucune planche Vague 1 ne couvre le légal » et « le corps reste français dans les 5 langues via
`fr5()` (`legal.ts:72`) » · **4 états non déclarés** : aucune lecture réseau, **le dire** ·
**aucun repère dans 11-13 sections** : ni sommaire ni accordéons repliés, alors que le patron
d'accordéon existe dans `faq.tsx:65-109` → trancher, et **écrire l'arbitrage** (un contrat se lit
d'un bloc ; une politique RGPD, non) · **bandeau indistinct du corps** (`:97-102`, blanc en
`fontSizes.sm`) → note d'état grise : c'est un avertissement, pas du texte contractuel · **texte non
sélectionnable** (`:79`) : **un CGU qui ne peut être ni copié ni cité**.

#### Mensonges par document

**`/legal/confidentialite` — le plus grave, et le plus urgent pour une soumission :**
- « Contenu que tu crées : **messages de chat de crew**, noms de crew, réactions » (`legal.ts:296`) et
  « Contenu de crew — chat et vie de communauté : exécution du contrat (art. 6.1.b) » : **il n'y a pas
  de chat dans l'app**, il est refusé, sans route ni 4e onglet (`RealCrewScreen.tsx:36-38`, `:293`).
  **La politique déclare une collecte qui n'a pas lieu.**
- « Santé importée (optionnelle) : … importée depuis **Apple Santé / HealthKit** », classée donnée
  sensible art. 9 : **HealthKit n'est PAS branché** (`app.json:3-16`, bloc `_healthkit_o8`
  « volontairement NON branché » ; **aucun module natif santé dans `apps/mobile/package.json`**). En
  prime, `NSHealthShareUsageDescription` est déclaré dans l'Info.plist **sans entitlement** — risque
  de revue App Store **en plus** du texte faux. *(La correction d'`app.json` n'est pas dans le
  périmètre du lot : elle est remontée en §5 comme décision.)*
- « Hébergement : **Supabase, région eu-west-1, Irlande** » (`legal.ts:386`) : région écrite en dur,
  adossée à **aucune constante ni vérification** (l'URL Supabase vit en variable d'environnement) —
  et c'est ce qui fonde la clause « aucun transfert hors UE ». À confirmer ou à sourcer.
- « **Paiement : Apple / Google** » déclaré comme traitement en cours, alors que **la CGV du même
  build affirme qu'aucune offre n'est commercialisée** (`legal.ts:394`). **Deux textes contractuels
  embarqués qui ne disent pas la même chose.**
- Aucune passerelle vers l'exercice des droits : le texte dit « directement depuis l'application
  (Réglages, puis Confidentialité) » (`:346`) alors que la route `/confidentialite` **existe** →
  ajouter **une ligne-lien** en pied (patron `PreviewRow`), jamais un CTA chartreuse.
- **Docblock périmé** : `confidentialite.tsx:8-10` affirme encore que « la ligne Politique de
  confidentialité des Réglages route par erreur vers l'écran de réglages ». **C'est corrigé**
  (`[section].tsx:600`). Supprimer la phrase, sinon le prochain lecteur ira « corriger » un bug mort.

**`/legal/licences` :**
- **LES TROIS POLICES EMBARQUÉES NE SONT CRÉDITÉES NULLE PART.** `@expo-google-fonts/inter`,
  `inter-tight` et `jetbrains-mono` sont des dépendances réelles, **chargées au démarrage**
  (`src/lib/fonts.ts:19-26`). Inter / Inter Tight (Rasmus Andersson) et JetBrains Mono sont sous **SIL
  Open Font License 1.1, qui EXIGE la mention de copyright et de licence**. L'écran ne connaît que
  MIT / BSD-3 / Apache-2.0 : **la condition d'usage des fontes n'est pas tenue.** → ajouter une
  section « SIL OPEN FONT LICENSE 1.1 ».
- **La liste est tenue à la main** et ne dérive d'aucun `package.json` : elle dérive silencieusement à
  chaque ajout de dépendance — **elle a DÉJÀ raté les 3 polices**. C'est l'inverse exact de la
  discipline de `credits-donnees.tsx:73-74`, qui lit ses chiffres dans le fichier généré. → générer
  depuis les `license` des paquets installés, **ou au minimum un test de dérive**.
- `licencesMitBody` (`legal.ts:457`) énumère **14 bibliothèques séparées par des « ; » dans un seul
  paragraphe**. C'est une LISTE (`LegalDoc` accepte un tableau de paragraphes).

**`/legal/cgv` :** la clause de réclamation préalable à la médiation (art. L612-1) **désigne un chemin
qui ne mène nulle part** (`legal.ts:428`, §4) · l'URL de recours `ec.europa.eu/consumers/odr`
(`:432`) est **peinte en texte mort** — ni tappable, ni sélectionnable, ni copiable : un recours
affiché mais inatteignable ; **à revérifier juridiquement, la plateforme européenne RLL ayant cessé
son activité** · **le fait qui prime est en 3ᵉ position** : « à la date d'entrée en vigueur, AUCUNE de
ces offres n'est commercialisée » (`:394`) est la vérité la plus importante du document et arrive
après deux paragraphes de catalogue → la remonter en `intro=` · **la seule section qui mérite une
surface est noyée** : l'identité du vendeur (`cgv.tsx:31-39`, RCS/SIREN/TVA) est le seul bloc qui
gagne à être encadré, or les 10 sections portent la même boîte · `cgvOffresBody2` (`:386`) empile
3 puces dans UN paragraphe.

**`/legal/cgu` :** « Écris-nous depuis la page Support » (`:273`) — §4 · « Tu peux … supprimer ton
compte à tout moment depuis l'application » (`:261`) est **vrai uniquement si Supabase est configuré**
— sans backend, `/confidentialite` désarme la suppression, et la phrase ne pose aucune condition ·
**aucun point d'entrée à l'inscription** : le seul chemin est Réglages › À propos › Légal, soit
**4 taps** → ajouter un lien texte « Conditions » sous le CTA de `(auth)/sign-in.tsx`. *(⚠️ Ce
fichier appartient au **Lot C** : le Lot G **n'y touche pas** — il inscrit la demande ici, et le Lot C
la reprend s'il a le temps, sinon elle reste en suspens.)*

**`/a-propos` :** « écris-nous depuis la page Support » (`:170`) — §4, **troisième occurrence** ·
hébergement eu-west-1 affirmé sans vérification (`:133`) · **mention d'hébergeur incomplète** : la
LCEN art. 6-III impose **nom, dénomination, adresse et téléphone** de l'hébergeur ; l'écran ne donne
que « Supabase » et une région — **l'entité (Supabase Inc.) et son adresse manquent** ·
**deuxième châssis pour la même famille** : `a-propos.tsx:31-38` recode `Section` + `card` alors que
`LegalDoc` fait exactement cela → migrer, et les 5 documents auront **une seule grammaire** ·
**mention légale NON DATÉE** : c'est le SEUL des 5 à ne pas afficher `LEGAL_LAST_UPDATED` ·
`backgroundColor: colors.carbone` (`:84`) au lieu de `elevation.surface` · polices hors tokens
(`:90-91`).

**`/credits-donnees` — aucun mensonge d'affichage.** C'est le **seul écran du groupe dont les valeurs
sont LUES à la source** (`:73-74`) plutôt que retapées. Écarts uniquement : le kicker n'en est pas un
(`:66` réutilise le **sous-libellé** de la ligne de Réglages, en casse de phrase) → créer
`creditsKicker` (« SOURCES · LICENCES ») · date brute non localisée (`generatedAt` = « 2026-07-23 »
affiché tel quel `:83-85`, alors que les 4 documents légaux affichent « 23/07/2026 ») → formater
**sans `Intl`** · URL peinte en texte mort (`:81`) → `selectable` ou lien texte · **séparateur « · »
assemblé en dur** (`:80-85`) → filtrage + `join(' · ')` (règle 15) · 3 cards recodées (`:105-110`) —
**des attributions ne sont pas des cards** · polices hors tokens (`:111-115`) · **docblock périmé**
(`:8-11` parle encore de « Paris et Lille (migration 0033) » alors que le texte affiché couvre les
**34 969 communes**, `city.ts:413`).
**Seule source de dérive à inscrire :** `MAP_ATTRIBUTIONS` (`:45-48`) est une **recopie manuelle** des
chaînes rendues par `MapScreen` — deux sources pour la même obligation de licence, qui peuvent diverger
en silence. *(Exporter depuis le module carte serait la bonne correction, mais `features/map/**` est
gelé : l'inscrire en suspens.)*

---

### Lot E — MOTIVATION & ÉCRANS ORPHELINS — **P3, effort M — DÉCISION AVANT TRAVAIL**

**Ne commence pas par recaler.** Trois de ces quatre écrans sont **injoignables** : `/aujourdhui` a
**zéro** entrée dans toute l'app (vérifié : `app/_layout.tsx:172` le déclare, et toutes les autres
occurrences du mot sont le nom d'icône `'aujourdhui'`), `/challenges` n'est atteignable que **depuis
`/aujourdhui`** (`aujourdhui.tsx:228`), `/challenges/[id]` que depuis `/challenges`. **Recaler un
écran mort, c'est peindre un écran mort.**

**Étape 1 — trancher, et l'écrire :** câbler `/aujourdhui` (depuis Profil ou Carte) **ou** l'archiver
comme `crew-discovery` (redirect + docblock). Puis seulement, exécuter le reste.

**Périmètre EXCLUSIF :**
`app/aujourdhui.tsx` · `app/challenges/index.tsx` · `app/challenges/[id].tsx` ·
`app/settings-motivation.tsx` · `src/features/motivation/**` · `src/features/daily/**` ·
`src/ui/game/DailyFocusBlock.tsx` · `src/i18n/catalog/motivation.ts` · `src/i18n/catalog/daily.ts`

**Lecture seule :** `src/ui/game/index.ts` (barrel partagé — **ne pas modifier**),
`src/features/social/**` (`useMyStreak`), `src/features/privacy/**` (Lot F).

#### Mensonges

- **JAUGE FABRIQUÉE, DEUX FOIS.** `const pct = c.target > 0 ? c.current / c.target : 0.5;`
  (`challenges/index.tsx:44` **et** `challenges/[id].tsx:58`, vérifié) : quand la cible est nulle ou
  absente, l'écran peint **une barre à moitié pleine** — une mesure purement inventée. La règle est
  « pas de barre sans dénominateur honnête » → **ne pas rendre la `ProgressBar` quand `target <= 0`**.
- **40 % DE `challenges/index` EST DU CODE MORT, ET LE DOCBLOCK L'ANNONCE COMME VIVANT.** L'en-tête
  (`:3-4`) promet « Solo, crew (coffre) et rivalry, depuis le seed 0012 (`features/motivation/demo` →
  …) ». Or `features/motivation/demo` **n'existe plus** (renommé `catalog.ts` le 21/07/2026) et
  `challengeState.readable()` (`:86-88`) ne sert **QUE** le type `solo`. La branche rivalry (`:65-77`)
  et le bloc sponsor (`:90-97`) ne peuvent **jamais** être rendus. Idem `[id].tsx` : rivalry
  (`:72-87`), crew (`:107-119`), sponsor (`:126-141`).
- **BLOCS PEINTS SANS SOURCE.** `challengeState.ts:192-197` ne copie **QUE** `target` et `current` :
  `sponsor`, `rivalMine`, `rivalOther`, `myContrib`, `partnerName` sont **toujours `undefined`**.
  « Offert par … », les deux scores de rivalité et « tu as déjà défendu {n} zones » sont des promesses
  au-delà du code, **et des pièges pour le prochain lecteur qui croira ces sections vivantes**.
- **TEXTES FRANÇAIS EN DUR SUR UNE APP 5 LANGUES.** `c.blurb` (`[id].tsx:70`), `c.reward` (`:123`) et
  `c.name` (`:66`) sont rendus **BRUTS** depuis `catalog.ts:110-156`, où ils sont écrits en français
  en dur (« 3 courses cette semaine, à ton rythme. », « Coffre crew · palier Or », « Badge Defender »).
  **Un joueur en DE/ES/PT/EN lit du français.**
- **ÉTAT MANQUANT DEVENU AFFIRMATION FAUSSE.** `if (!c)` (`[id].tsx:50-56`) affiche « Ce challenge
  n'est plus disponible. » **pour toutes les causes confondues** : `useChallenge`
  (`challengeState.ts:221-227`) ne remonte pas `empty`, donc **un joueur non connecté ou un serveur
  injoignable lit une conclusion sur le contenu du jeu qui est fausse**. Le docblock (`:8-12`) prétend
  précisément traiter ce point ; il ne traite que `loading`.
- **SOUS-TITRE DEVENU FAUX.** `C.challengesSubtitle` (`catalog/motivation.ts:216-217`) annonce « Des
  objectifs **CHOISIS**, à ton rythme » — le joueur ne choisit rien : la liste est celle des
  challenges actifs du serveur, sans opt-in ni sélection.
- **`/aujourdhui` — texte devenu faux, affiché SANS CONDITION.** La card héros dit « GRYD ne connaît
  pas encore ton terrain » et « Les routes recommandées arrivent après tes premières sorties »
  (`catalog/motivation.ts:85`, `:92`) et elle est rendue **inconditionnellement** (`:150-157`) — même
  pour un joueur avec des dizaines de courses et une distance apprise. Or **`/route-planner` calcule
  une boucle recommandée à la demande depuis la position GPS, sans aucune course préalable**. → soit
  le bloc disparaît quand une suggestion existe, soit il affiche la vraie suggestion et pointe vers
  `/route-planner`.
- **`/aujourdhui` — échec indistinguable du vide.** La série (`useMyStreak`), la Zone du Jour
  (`useDailyFocus`, **dont le docblock l'assume** : « tout échec retombe SILENCIEUSEMENT sur
  `focus: null` ») et le badge proche (`:117-124`) disparaissent tous **sans distinguer « rien à dire »
  de « la lecture a échoué »**. Sur cet écran, **échec == vide**, ce que la doctrine interdit.
- **`/aujourdhui` — personnalisation annoncée, pas tenue.** « TA JOURNÉE GRYD » + « Ta prochaine course
  t'attend » construisent une page personnalisée alors que le CTA est **toujours** « CONQUÉRIR »
  (`:75`, verbe fixe assumé par le docblock faute de données de défense). Soit on câble le verbe
  contextuel, soit **on assume la page comme un lanceur et on aligne la copie**.
- **`/settings-motivation` — un même réglage, deux valeurs.** « Profil visible par » (`:152-158`)
  écrit dans `motivation/store.ts` alors que Confidentialité écrit le même concept dans
  `privacy/store.ts`, **et c'est privacy que lisent le Profil et l'édition de profil**. Régler « Moi
  seul » ici **ne change rien à ce que le Profil affiche**. · `activitySharing` et `mapSharing` ne sont
  lus par aucun autre écran. · La frise « Classements visibles » (`:117-129`) **affirme sur quels
  classements le joueur apparaît** alors que l'onglet Saison est masqué par `flags.season` et qu'aucun
  classement serveur n'est ouvert.

#### Écarts

**`/settings-motivation` — le vrai travail est une SOUSTRACTION.** Réduire l'écran à **sa** décision :
le style de jeu (les 3 `OptionCard`), seule chose que la ligne d'entrée annonce et seule chose qui ne
soit réglable nulle part ailleurs. **Supprimer** : « Profil visible par » / « Partage d'activité » /
« Trace sur la carte » (`:152-175` — E21 tranche : « la visibilité renvoie à Confidentialité … un seul
endroit ») → remplacer par une `ListRow` « Visibilité → Confidentialité › » · « Notifications »
(`:132-150` — les 4 mêmes `TogglePill` sur le même store sont déjà rendus par
`/parametres/notifications`) · « Retours haptiques » (`:177-187` — même interrupteur, même store
global, déjà dans `/parametres/course`). Puis : **supprimer les primitives concurrentes de
`src/features/motivation/ui.tsx`** — elles doublent `privacy/ui.tsx` (deux `SelectPills`, deux
`SwitchRow`, deux `Section`) **avec des rendus DIFFÉRENTS** (ici un `Switch` natif iOS `:126-132`, là
un track/knob maison) : **le même réglage n'a pas la même apparence selon la page** · retirer
`opacity: 0.5` de `levelChip` (`:219`) — un `colors.gris` à 50 % passe sous le plancher de lisibilité,
et le masqué se dit **par le texte** · kicker + rôles typo (zéro `fontFamily` dans le fichier).

**`/challenges`** : cards bordées (`:169-176`, `:222-229`) → **lignes scannables** séparées par
`borderState.hairline` · `iconWrap` (`:179-186`) → `IconPlate size="md"` · **aucun kicker** (`:151-155`)
· `ActivityIndicator` centré (`:156-157`) → ligne grise · `styles.current` (`:191-197`) et
`rivalScore` (`:201-207`) → `typography.stat` · aucun garde-fou de troncature sur `name` (`:188`) /
`meta` (`:189`) · le `Pressable` de `Row` (`:45-51`) sans `minHeight: sizes.touchTarget` ni
`analyticsId` · espacements littéraux (`:175`, `:178`, `:190`, `:214-215`) · **docblock qui dit
explicitement qu'aucune planche Vague 1 ne couvre les Challenges**, plutôt que de laisser croire à un
recalage.

**`/challenges/[id]`** : **3 cards empilées** (`:156-161`, rendues `:73/89/108/130`) → **UN** bloc à
séparateurs + espace · `ActivityIndicator` plein écran (`:42-47`) · **chartreuse dépensée en
DÉCORATION alors qu'aucun CTA chartreuse n'existe sur l'écran** (`Icon name="coffre"` `:122`,
`contribNum` `:181`) · `current`/`rivalScore` → `typography.stat` · `cardKicker` (`:162-168`) sans
`textTransform: 'uppercase'` · ellipses sur `rewardText` (`:207`) et `sponsorName` (`:217`) · **le
kicker est construit par `.toUpperCase()` JS** (`:68`) : sur 5 langues, `toUpperCase()` sans locale
casse (turc, accents) → `textTransform` en style.

**`/aujourdhui`** : card héros recodée (`:150-157`, `:270-277`) → `<Card>` sans contour · `heroKicker`
(`:279-285`), `blockKicker` (`:308-314`), `greeting` (`:255-262`) → rôles typo · `linkRow`
(`:225-249`, `:316-324`) → `ListRow`/`PreviewRow` (aujourd'hui `borderTopWidth` sur `colors.grisLigne`
et **aucun plancher tactile déclaré**) · dégrader « Prochain badge » (`:199-222`) d'une `BadgeCard`
vers une ligne scannable · **trois lignes de contexte avant la première décision** (kicker + salutation
+ phrase de situation) → n'en garder que deux · docblock 3 parties.

---

### Lot I — WAR ROOM (sous drapeau fermé) — **P3, effort S — CINQ CORRECTIONS, PAS UNE DE PLUS**

`flags.warRoom` vaut `false` hors `EXPO_PUBLIC_FULL_SURFACE=1` (`src/lib/flags.ts`), et **les trois
entrées vers `/warroom` sont toutes gardées par le même flag** (`aujourdhui.tsx:241`,
`profil.tsx:263`, `parametres/[section].tsx:451`) : **aucun bouton mort de ce côté**. L'écran est
propre sur le fond. **Ne rien construire ici.**

**Périmètre EXCLUSIF :** `app/(tabs)/warroom.tsx` + **les seules entrées War Room** de
`src/i18n/catalog/flagged.ts`.
> ⚠️ `catalog/flagged.ts` est aussi lu par `classement.tsx` et `arsenal.tsx` (recalés) et par
> `features/arsenal/recommendations.ts`. **Ne toucher que les entrées War Room.**

**Mensonges :** le sous-titre (`:59`) dit « Ta prochaine mission, **triée par urgence**. »
(`flagged.ts:259`) sur un écran qui n'a **aucune** mission et où **aucun tri par urgence n'existe** →
le réécrire sur ce que la page fait, **ou le supprimer** puisque le corps de la card le dit déjà ·
**état non déclaré** : l'écran ne fait aucune lecture (le commentaire `:43-49` le dit très bien en
interne) mais **ne le déclare ni au joueur ni en tête de fichier**.

**Écarts :** `emptyCard` (`:77-83`) → `<Card>` · **ajouter un `kicker` au `TabScreen`** (la prop existe,
`TabScreen.tsx:51-59` ; tous les onglets recalés en portent un, celui-ci n'en a pas) ·
`InlineRunCTA` (`:64-68`) → `<Button analyticsId="warroom_open_map">` · `emptyCardTitle` (`:84`) et
`emptyCardBody` (`:85-90`) → `typography.cardTitle` / `typography.body` · docblock 3 parties.

---

## 4. Chantier transverse : **le canal de support n'existe pas**, et neuf écrans le promettent

C'est **le mensonge le plus répandu de l'app**, et il n'appartient à aucun lot : il est causé par une
seule chose manquante, et il se manifeste dans **cinq catalogues différents**.

**Le fait.** `/support` ne contient **ni adresse e-mail, ni formulaire, ni `Linking.openURL('mailto:')`**.
Ses quatre cards de signalement ouvrent une `Alert` disant « cette remontée n'est pas encore transmise
— on finalise le canal de modération » (`support.tsx:150-155`, `reglages.ts:1538`).

**Les neuf promesses mortes qui pointent dessus :**

| Copie | Fichier | Lot |
|---|---|---|
| « écris-nous depuis Aide & support » (e-mail du compte) | `catalog/reglages.ts` (`emailSoonBody`) | F |
| « demande-la depuis Aide & support » (suppression partielle) | `catalog/reglages.ts` (`partialDeleteBody`) | F |
| « une personne lit chaque signalement » ×2 | `catalog/reglages.ts:1665`, `:1702` | F |
| « Les décisions … jamais automatiques sans recours » | `catalog/reglages.ts` (`supportFootnote`) | F |
| « une personne lit chaque demande » / « l'aide GRYD reprend chaque cas » | `catalog/explain.ts:426` | H |
| « Une question sur ces conditions ? Écris-nous depuis la page Support » | `catalog/legal.ts:273` (CGU) | G |
| « Toute réclamation peut nous être adressée depuis la page Support » | `catalog/legal.ts:428` (CGV, **art. L612-1**) | G |
| « Écris-nous depuis la page Support » (RGPD art. 12) | `catalog/legal.ts:362`, `:346` | G |
| « le texte intégral … depuis la page Support » ×2 | `catalog/legal.ts:453`, `:468` | G |
| « écris-nous depuis la page Support » (mentions légales) | `catalog/legal.ts:170` | G |

**Et une contradiction interne :** le signalement d'un joueur est **RÉEL** ailleurs
(`confidentialite.tsx:186-210`, table `content_reports`) — **l'écran d'aide dit « pas encore transmis »
pendant que la page Confidentialité transmet.**

**La décision à prendre AVANT que les lots F, G et H écrivent leur copie** (une seule, prise une fois,
appliquée par chaque lot **dans son propre catalogue** — aucun lot ne touche le catalogue d'un autre) :

- **Option A — ouvrir le canal** (le moins de travail, et le seul qui ferme les obligations légales) :
  une adresse e-mail de contact + `Linking.openURL('mailto:')` dans `/support` (**Lot F**). Toutes les
  copies deviennent vraies **sans être réécrites**. RGPD art. 12 et art. L612-1 sont satisfaits.
- **Option B — dire la vérité partout** : chaque lot réécrit ses copies pour nommer le canal réel
  (adresse postale du siège, déjà présente dans les mentions légales) et **retirer** les quatre cards
  mortes de `/support`, les deux lignes destructives de `/confidentialite`, et les deux boutons morts
  de `/parametres/compte`.

**A est fortement recommandé** : B laisse une politique RGPD sans moyen effectif d'exercer ses droits,
ce qui est un défaut juridique, pas seulement un défaut d'UI.

---

## 5. Ce qui est BLOQUÉ, et par quoi

| Bloqué | Bloqueur | Conséquence sur ce plan |
|---|---|---|
| Édition d'identité de crew (moitié CREW de E21) | **O1** — RPC serveur rôle-gatée (`CREW_PERMISSIONS`, le serveur seul juge) | Lot D **n'ouvre pas** `crew-edit` ; il inscrit le manque dans A-47 § « EN SUSPENS » |
| Annuaire de crews + fiche publique de crew (E15/E16) | **O1** — recherche, recrutement, modération serveur | Lot D **ne reconstruit rien** ; il documente la forme cible |
| Détail d'une course `/course/[id]` | **O1** — aucune lecture d'une course par id | Lot B réduit l'écran à son état honnête, **ne recale pas le corps** |
| Gain territorial et difficulté d'une boucle planifiée | **O1** — pas de simulation serveur | Lot A **supprime** zones/points/difficulté au lieu de les inventer |
| Partage d'une route au crew | **O1** — aucune RPC | Lot A **retire** le bouton et le faux feed |
| Mode privé « verrouillé », rayon de flou, masques domicile/travail | **O1** — le store est un miroir client (AsyncStorage) | Lot F **câble ou retire** ; ne laisse pas d'interrupteur sans effet |
| Scanner QR (E16) | **`expo-camera` absent** — impact revue App Store à arbitrer | Hors périmètre : déjà traité dans `qr.tsx` (recalé) |
| Onglet Saison, classements de saison | **`flags.season = false`** | Lot H ajoute la note d'état ; Lot E ne peint pas de visibilité dans un espace inexistant |
| War Room | **`flags.warRoom = false`** | Lot I : 5 corrections de forme, rien de plus |
| Photo du premier écran | **Asset manquant** — `e01-crew.png` fait 2 × 3 px | **Dépendance fondateur.** Lot C : vraie photo au même chemin, **ou** fond `carbonImmersive` sans `ImageBackground` |
| Canal de support | **Décision produit** (une adresse e-mail suffit) | §4 — à trancher **avant** que F, G, H écrivent leur copie |
| `NSHealthShareUsageDescription` sans entitlement | **`app.json`, hors périmètre de tout lot** | Remontée ici comme **décision** : soit retirer la clé Info.plist, soit brancher HealthKit. En l'état : **texte de politique faux + risque de revue** |

---

## 6. Ce qui NE DOIT PAS être recalé

**Peindre un écran mort est pire que de le laisser laid : ça le rend crédible.**

1. **Le corps de `/course/[id]`** — ~500 lignes (bloc effort, Verify, scène 2D/3D, refus, mini-carte
   avant/après, détail du calcul, segments, 3 CTA) **compilées mais jamais exécutées**, `findRealRun()`
   retournant `undefined` sans condition. **Garder 500 lignes qui ne s'exécutent jamais garantit
   qu'elles divergeront de la refonte.** → réduire à l'état honnête, ou supprimer. Ne pas styliser.
2. **`/crew-edit`, `/crew-public`, `/crew-discovery`** — trois stubs **déjà conformes** (0 mensonge,
   0 rendu, absence documentée). Ne rien y peindre tant qu'O1 est ouvert. Le seul travail utile est
   **d'inscrire le manque dans A-47**, pas dans un docblock de stub.
3. **Les branches mortes de `/challenges`** (rivalry, crew, sponsor) — ne **pas** les styliser : les
   **retirer** ou les alimenter. Styliser du code jamais rendu crée un piège pour le prochain lecteur.
4. **`/(tabs)/warroom` au-delà de 5 lignes** — drapeau fermé, entrées gardées. Cinq corrections de
   forme, aucune construction.
5. **`/aujourdhui` et `/challenges` avant la décision de câblage** — **zéro entrée** dans toute
   l'app. Trancher d'abord (§ Lot E).
6. **Les 20 écrans recalés** (§1.5) — sauf les **4 lignes** nommément autorisées au Lot D.
7. **`packages/**`, `supabase/**`, `src/features/run/gps/**`** — chantier parallèle.
8. **Les primitives `src/ui/{Card,Button,ListRow,TabScreen,Segmented,ProgressBar}`** — aucun écart ne
   les exige. Un lot qui croit devoir les modifier a mal lu son écran.
9. **`/langue`, `/calcul-zones`, `/credits-donnees` côté HONNÊTETÉ** — **zéro mensonge**. Leurs
   sections ne listent que des écarts de forme : ne pas gonfler.

---

## 7. Gate de vérification (par lot, avant de rendre)

1. `npm run typecheck` → 4/4.
2. `git status` → **aucun fichier hors du périmètre exclusif du lot**.
3. Checklist §A sur chaque écran touché : 1 décision · 1 CTA chartreuse max · zéro card-in-card ·
   zéro texte tronqué · compris en < 3 s · détails au tap.
4. Les 4 états sont **nommés séparément** dans le code — ou l'écran **déclare** qu'il n'en a pas 4.
5. **Aucun `numberOfLines={1}` nu** (règle 9), **aucun `fontWeight` par-dessus une famille**
   (`design-tokens.ts:55-57`), **aucune couleur hors tokens**, **aucun littéral de mesure non nommé**.
6. Chaque écran porte le **docblock en 3 parties** (règle 14), avec la raison **technique** nommée de
   chaque écart assumé.
7. Chaque texte visible passe par `defineCatalog` + `t()` ; **aucun `Intl`** dans un formatage.
8. Aucun event inventé hors `packages/shared/src/events.ts` ; `analyticsId` non-PII sur les CTA.
9. **Le test décisif :** ouvrir l'écran sans backend, sans session, puis avec une lecture qui échoue.
   S'il affiche la même chose dans deux de ces cas, il n'est pas fini.
