# DELTA-PROGRESSION — E11 Classement local · E12 Saison & rang

> **Lecture datée du 26/07/2026.** Lecture SEULE. Aucun fichier de code touché.
> Des chantiers écrivent en parallèle dans `apps/mobile/**` : les `fichier:ligne`
> ci-dessous sont un instantané, pas une garantie de stabilité.
>
> **Règle appliquée** : « l'existant n'est jamais une preuve ». Chaque ligne
> conforme est adossée à EXIGENCE → implémentation (`fichier:ligne`) → différence
> → donnée réelle ou vide. Rien n'est déclaré « fait » sur un nom de fichier.

---

## 0. BLOCAGE DE MÉTHODE — les planches E11/E12 ne sont PAS sur le disque

**On m'a demandé de mesurer ce que je vois. Je ne peux pas : les images n'y sont pas.**

J'ai ouvert avec Read **les 14 PNG présents** dans
`docs/design/vague-1/planches-png/` (il n'existe pas de `-selection9`) :

| Fichier | Dimensions | Écran reconnu |
|---|---|---|
| `-selection.png` | 780×1688 | blanc (vide) |
| `-selection2.png` | 786×1694 | Onboarding « FERME LA BOUCLE » |
| `-selection3.png` | 780×1690 | décor « REPRIS » (chevauchement) |
| `-selection4.png` | 780×1690 | décor (territoires) |
| `-selection5.png` | 786×1694 | Onboarding « VOTRE POSITION CRÉE LE TRACÉ » |
| `-selection6.png` | 780×1688 | blanc (vide) |
| `-selection7.png` | 780×1688 | Carte mission « 900 M » (fond E02/E07) |
| `-selection8.png` | 780×1688 | Carte territoires « PORT OUEST / K.RUNNER » (E03) |
| `-selection10.png` | 784×1692 | **E04** Quartier Saint-Rémy |
| `-selection11.png` | 784×1692 | **E05** Reprenez Saint-Rémy |
| `-selection12.png` | 780×1688 | décor (tracé) |
| `-selection13.png` | 784×1692 | **E08** « SAINT-RÉMY REPRIS » |
| `-selection14.png` | 784×1692 | **E09** Résultat de course |
| `-selection15.png` | 828×1834 | **E09 variante** « Boucle non fermée » |

**Constat vérifiable :** les 14 fichiers sont des rendus **téléphone unique en
portrait** (~780×1690). **Aucune** image « canvas » (deux téléphones + panneaux
d'annotation STRUCTURE/RÈGLES/PSYCHOLOGIE), et **aucune** ne montre E11
(podium + chips « Autour de moi/Quartier/Ville/Amis/Crews », ligne « #4 Vous »)
ni E12 (« Saison 3 », bouclier « Argent II », frise de récompenses, moment
« NOUVEAU RANG · ARGENT I »). Le set couvre E01→E09, pas E11/E12.

Sources écrites confrontées :
- `docs/design/vague-1/PLANCHES.md:146-184` **contient** une transcription E11/E12
  — mais c'est du texte, pas la planche, et la loi de lecture la déclare
  « potentiellement PÉRIMÉE ». Je la cite comme **seule référence disponible**,
  jamais comme vérité mesurée.
- `docs/design/vague-1/RESTE-A-RECALER.md` : **zéro** occurrence E11/E12
  (`grep -i "E11|E12|classement local|argent ii|nouveau rang"` → vide).
- `docs/design/vague-1/planches.html` : tronqué à 256 Kio (E01-E07 seulement,
  d'après l'en-tête de PLANCHES.md).

**Conséquence honnête :** le mandat « mesurer les pixels pour recaler la forme »
est **impossible pour E11/E12 tant que le fondateur ne réexporte pas les deux
canvases**. Tout ce qui suit compare le CODE à la **transcription PLANCHES.md**,
en signalant que le référentiel-image manque.

---

## 1. BLOCAGE PRODUIT — E11 et E12 sont invisibles aujourd'hui (`flags.season`)

**EXIGENCE (loi de lecture) :** « flags.season = false masque tout l'onglet
Saison (Redirect vers /) — premier blocage à lever. »

**Vérifié :**
- `apps/mobile/src/lib/flags.ts:15` `const FULL_SURFACE = process.env.EXPO_PUBLIC_FULL_SURFACE === '1'`
- `apps/mobile/src/lib/flags.ts:54` `season: FULL_SURFACE` → **`false` par défaut**
  (vrai uniquement si `EXPO_PUBLIC_FULL_SURFACE=1`, inliné au bundle).
- `apps/mobile/app/(tabs)/classement.tsx:679`
  `if (!flags.season) return <Redirect href="/" />;` — **l'écran E11 tout entier
  redirige vers la carte.**
- **E12 vit DANS l'écran classement** (rang + récompenses + reset, cf. §3), donc
  le même redirect le masque aussi. Il n'existe **aucune** route `app/saison.tsx`
  séparée (`find apps/mobile/app -iname "*season*|*saison*"` → vide).
- `apps/mobile/src/features/nav/GrydNavBar.tsx:39-44` : l'onglet « Saison »
  n'est ajouté à la nav que `...(flags.season ? …)`.
- `apps/mobile/app/(tabs)/profil.tsx:974` : le lien « Saison › » de la carte de
  progression n'apparaît que `flags.season ?` → sinon rien (pas de lien mort).

**Différence vs planche :** les planches supposent E11/E12 accessibles ; le
produit les tient **délibérément hors MVP** (D8). Les moteurs (season_scores,
badges) accumulent côté serveur — c'est la SURFACE qui est cachée, réactivable
d'un flag. **C'est le premier verrou à lever pour que E11/E12 soient seulement
VISIBLES.**

---

## 2. E11 — Classement local : forme reproduite, taxonomie et unités divergentes

Écran = `apps/mobile/app/(tabs)/classement.tsx` (`LeagueScreen`, ligne 683).
Source de données = `apps/mobile/src/features/social/leagueBoard.ts`.

### 2.1 Ce qui est reproduit fidèlement (composition + rôle-couleurs)

| Élément planche | Implémentation | Verdict |
|---|---|---|
| Commutateur Run/Bike **en tête** (E14) | `classement.tsx:885-893` `ActivitySwitch`, poussé au bord droit par une cale élastique (`titleSpacer`), visible si `switchVisible` | **Conforme** (toggle RÉEL, `flags.bike=true`) |
| Podium 3 (photos rondes, #1 or, or=#1 uniquement) | `Podium` `classement.tsx:278-339` ; anneau `podiumRingGold` si `rank===1` ; `LeagueMedal` (`src/ui/game/LeagueMedal.tsx:18-23` #1 or/legend, #2 titane, #3 blanc) | **Conforme** (couleurs par RÔLE) |
| **Ma ligne STICKY surlignée chartreuse** « #4 Vous » | `classement.tsx:846` `stickyHeaderIndices={[1]}` + `mineCard` `902-940` ; chartreuse = ma ligne seule | **Conforme** |
| Écart « … pour passer #3 » | `classement.tsx:806` `gapPoints = aboveRow.value - meRow.value`, barre `gapRatio` `811-812`, phrase `932-934` | **Conforme (calcul RÉEL)** — voir unité §2.3 |
| Psychologie « jamais 22 000 / toi : 0 » | `classement.tsx:1026-1028` (pas de podium géant sans ma ligne), `BoardBody showPodium` `466`, `1034` | **Conforme** |
| Égalité (ex æquo) dite en texte, jamais couleur | `leagueRanking.ts:31-48` rangs 1224 partagés ; rendu `classement.tsx:389-393` `S.exAequo` | **Conforme** (état « égalité » de la planche) |
| Modération par ligne (« … » gris, jamais chartreuse) | `classement.tsx:399-403`, `PlayerModerationSheet` `1240` | **Conforme** (ajout App-Store, hors planche) |

### 2.2 Écarts de STRUCTURE (chips) — la barre de filtres de la planche n'existe pas telle quelle

**EXIGENCE PLANCHES.md:147** : chips ordonnées « **autour de moi → quartier →
ville → amis → crew** », le MONDE caché.

**Implémenté** (`classement.tsx:198-204`) :
```
type PrimaryTab = 'joueurs' | 'specialites' | 'ville' | 'crews'
  Ma ville · Spécialités · Villes · Crews
```
- **« Autour de moi », « Quartier », « Amis » : SUPPRIMÉES** — commentaire
  `classement.tsx:190-191` : « aucune vue de secteur, de quartier ni d'amitié
  n'alimente un classement — trois chips mortes ». **Absence assumée**, pas un
  oubli : elles seraient des boutons morts (CLAUDE.md « aucun bouton mort »).
- **« Ma ville »** = l'ancien « Joueurs » (le seul board réel).
- **« Spécialités »** (Conquérant/Défenseur/Voleur/Pionnier) = **ajout** hors
  planche, source `specialty_leaderboard` (`leagueBoard.ts:294-363`).
- Le MONDE est bien caché (`classement.tsx:214-216` : filtre Paris/France retiré,
  AMENDEMENT-35).

**Différence :** la barre de 5 chips de proximité de la planche est remplacée par
4 onglets dont 2 seulement portent une donnée. Recalage-forme impossible sans la
planche-image, mais la **taxonomie diverge franchement**.

### 2.3 Écart d'UNITÉ — la planche dit « km² », le produit compte des POINTS

**EXIGENCE PLANCHES.md:151** : « #4 Vous · **1,84 km²** … **0,12 km² pour passer
#3** » ; liste avec « **km²** » par joueur.

**Implémenté :** la valeur affichée est `formatInt(row.value)` + `board.valueLabel`
(`classement.tsx:396-397`, ma ligne `923-924`), où `value = season_scores.points`
(`leagueBoard.ts:194,210`). Commentaire `classement.tsx:930-931` : « L'unité RÉELLE
du board est le **POINT** (les km² par joueur n'existent nulle part) ».

→ **La composition est tenue, la donnée diffère : POINTS, pas km².** Le « pour
passer #N » est en points (`gapPoints`), converti en zones **seulement** pour la
phrase-objectif du CTA (`gapHexes = ceil(gapPoints / POINTS_NEUTRAL_HEX)`,
`classement.tsx:807`). Aucune valeur km²/joueur n'est fabriquée — c'est correct
au regard de la constitution, mais **c'est un écart visible avec la planche**.

### 2.4 Écarts d'ABSENCE (E11)

- **Sélecteur de période « Semaine ▾ » : OMIS.** `classement.tsx:852-854` :
  « aucune agrégation hebdomadaire n'existe en base (season_scores est cumulatif
  sur la saison) ». La portée temporelle est nommée par la saison (kicker
  `856-865`, décompte `866-872`). **Absent, à raison.**
- **Variation « ▲2 / —0 / ▼1 » par ligne : ABSENTE.** `BoardRow`
  (`classement.tsx:342-407`) rend rang · avatar · nom · valeur · « … » ; **aucune
  flèche de variation**. Impossible sans snapshot hebdomadaire (idem ci-dessus).
  Seul le marquage `tied` (ex æquo) existe.
- **Colonne « crew » par ligne : ABSENTE.** `classement.tsx:386-388` :
  « player_leaderboard ne joint pas crew_members » → la colonne reste vide.
- **Onglet « Crews » avec ligne sticky « #2 NIGHT OWLS · votre crew · 14 membres
  · 6,2 km² » : ABSENT.** L'onglet `crews` rend `BoardEmpty` (`classement.tsx:1040-1049`)
  — `crew_leaderboard` (matview) n'est **jamais rafraîchie**. État « pas encore
  ouvert » honnête, pas la ligne crew de la planche.
- **« Villes » : ABSENT** (aucun agrégat inter-villes) → `BoardEmpty` aussi.
- **Fond carto local à 35 % derrière le podium : ABSENT.** `classement.tsx:35`
  (en-tête du fichier) : « aucune carte n'est rendue ici ». (Le détail « fond
  carto 35 % » de la loi de lecture concerne les écrans sociaux — non tenu ici.)

---

## 3. E12 — Saison & rang : composition conservée, système « Argent/XP » réécrit sur le RÉEL

E12 **n'est pas un écran séparé** : il occupe le bas de `classement.tsx`
(sections `1120-1234`), donc masqué par le même `flags.season` (§1).

### 3.1 Card de rang — « Argent II · 2 340/3 000 XP · Prochain jalon : Argent I »

**EXIGENCE PLANCHES.md:163-164** : bouclier + « Argent II » + « Rang local · Run »
+ barre XP + « 2 340 / 3 000 XP » + « Prochain jalon : Argent I ».

**Implémenté :** `classement.tsx:1141-1187`. Le code le DIT lui-même
(`1120-1122`) : « **Rien de tout ça n'existe : ni rangs nommés, ni XP.** » Il
conserve la **composition** (grand bouclier `IconPlate` `1148-1152` + libellé fort
+ jalon) et la remplit avec le **seul palier réel** : le standing de fin de saison
(`seasonStanding`, `seasonRewards.ts:96-111`), adossé aux médailles
`season_rank_*` du catalogue shared.
- `standing.current` → `tierLabel` (`1165`) ; `standing.next` → « prochain palier »
  (`1170`) ; `standing.placesToNext` → écart **en PLACES** (`1173-1178`), pas une
  barre (`1128-1129` : « aucun dénominateur honnête n'existe entre deux paliers »).
- **`grep -i "Argent|division|XP" ` sur les rangs → introuvable dans le code.**
  Le mot « Argent II », la barre XP, « 2 340/3 000 » : **ABSENTS**, remplacés.

→ **Différence majeure :** la planche dessine un **système de divisions à XP**
(Bronze→Argent→Or, progression continue). Le produit n'a **ni divisions nommées
ni XP de rang** ; il a un **classement numérique** (#N) + une **échelle de
paliers de fin de saison**. La forme (bouclier + libellé + jalon) est reprise, le
**modèle sous-jacent est autre**.

### 3.2 « RÉCOMPENSES DE SAISON » — frise réelle, pas la frise Bronze/Argent/Titane/Or de la planche

**EXIGENCE PLANCHES.md:165-168** : 4 paliers (Bronze : badge acier ✓ · Argent :
trail chartreuse ✓ · Titane : emblème animé · Or : cadre or S3), rareté par
matériau.

**Implémenté :** `classement.tsx:1189-1224`, frise `SEASON_REWARD_TIERS`
(`seasonRewards.ts:50-68`) = les **6 médailles réelles** décernées par
`supabase/functions/season_close/logic.ts` : `season_rank_1..5` + `season_rank_legend`
(top 100 / 50 / 10 / 3 / #1 / vainqueur non ex æquo).
- Matériau/rareté **LU** du catalogue (`BADGES_BY_KEY`, `seasonRewards.ts:65-67`)
  : acier → chrome → titane → élite → or. **Conforme au principe « rareté = matériau ».**
- Statut Obtenu/verrouillé **LU** dans `user_badges` (`classement.tsx:1215-1221`,
  `badges.unlockedIds.has(tier.badgeKey)`), jamais re-dérivé.
- Les 3 anciennes cartes fabriquées (« Badge Paris Race » Paris-en-dur, « Frame
  Tempo », « Coffre saison ») ont été **supprimées** (`seasonRewards.ts:4-9`,
  `classement.tsx:1190-1192`).

→ **La forme (frise verticale à matériaux) est tenue ; le CONTENU est le vrai
barème serveur, pas les 4 récompenses illustratives de la planche.**

### 3.3 Règles du reset — la planche est FACTUELLEMENT FAUSSE, le code la corrige

**EXIGENCE PLANCHES.md:169-170** : « vos **territoires** et badges restent acquis ;
le rang repart en ligne de départ. »

**Implémenté :** `classement.tsx:1226-1230` **contredit explicitement la planche** :
« ⚠ La planche écrit « vos territoires et badges restent acquis ». C'est **FAUX**
pour les territoires : `season_close` phase 2 fait le **WIPE des hex_claims et des
boucliers**. On écrit ce que le moteur fait vraiment. » → deux lignes `resetLigne1/2`.

→ **Écart voulu et vertueux** : la doc ne doit pas promettre au-delà du code
(CLAUDE.md). **À arbitrer** : recaler la planche, pas le code.

### 3.4 Moment plein écran « NOUVEAU RANG · ARGENT I » — ABSENT

**EXIGENCE PLANCHES.md:171-172** : anneau qui se complète + « NOUVEAU RANG » +
« ARGENT I » + « Débloqué : cadre chrome » + CONTINUER + « Voir la saison ».

**Vérifié :** le composant le plus proche est `RankUpCard`
(`src/ui/game/RankUpCard.tsx`) — mais :
1. il célèbre un **rang NUMÉRIQUE** (« #8 → #7 · Paris League », `50-62`), pas une
   promotion de division « Argent I » ;
2. il est **alimenté par de la démo** (`features/social/league.ts:114` « Rang
   gagné cette semaine (démo) ») ;
3. **il n'est monté nulle part** : `grep -rn "<RankUpCard" apps/mobile` → **vide**.

→ **Le moment « passage de rang » plein écran d'E12 est ABSENT** (ni division
« Argent I », ni écran de reveal câblé). C'est un composant orphelin.

### 3.5 Run/Bike rangs séparés — tenu

`useSeasonLeaderboard(activity)` (`leagueBoard.ts:189-198`) filtre
`.eq('activity', activity)` sur `player_leaderboard` (une ligne par saison ×
joueur × discipline depuis migration 0070) ; les cartes E12 rang + récompenses
sont retirées hors lentille par défaut (`competitiveReadAllowed`,
`classement.tsx:1141,1202`) parce que `user_badges`/`user_stats` restent
**MONO-POT**. **Conforme à E12 « rangs SÉPARÉS », avec la dette user_stats
nommée.**

---

## 4. DONNÉES RÉELLES — le produit les calcule-t-il ? (par métrique)

| Métrique planche | Source réelle | Statut |
|---|---|---|
| Classement joueurs « Ma ville » | Vue `public.player_leaderboard` (season_scores⋈seasons⋈users), ciblée `season_id`+`activity` de la ville du joueur (`leagueBoard.ts:153-214`) | **RÉEL** (sinon 6 états vides distincts) |
| Rang #N | Dérivé de l'ordre `index+1` puis **re-rangé 1224** (`leagueRanking.ts:31-48`) | **RÉEL** |
| « X pour passer #N » | `aboveRow.value − meRow.value` en **points** (`classement.tsx:806`) | **RÉEL** (en points, pas km²) |
| Rang de **quartier** | — aucune vue quartier/secteur disciplinée | **ABSENT** → chip omise |
| Classement **Villes** / **Crews** | aucun agrégat / `crew_leaderboard` jamais rafraîchie | **ABSENT** → `BoardEmpty` honnête |
| Classements **Spécialités** | Vue `specialty_leaderboard` (user_stats LIFETIME, migration 0069) | **RÉEL mais MONO-POT** (toutes disciplines confondues) |
| Numéro de saison + décompte | RPC `season_current` (`useActiveSeason`) + moteur pur `seasonProgress` (`SeasonStatus.tsx:42-121`) | **RÉEL** |
| Standing « prochain palier » E12 | `seasonStanding(rang réel, tied)` sur le barème `season_close` (`seasonRewards.ts`) | **RÉEL** (dette : seuils 100/50/10/3/1 **recopiés** d'une const PRIVÉE de `season_close/logic.ts`, non exportée de shared — `seasonRewards.ts:16-22`) |
| Récompenses Obtenu/verrouillé | `user_badges` via `useMyBadges` (`classement.tsx:1215-1221`) | **RÉEL** |
| « Argent II » / barre XP « 2 340/3 000 » / « Prochain jalon Argent I » | **aucune table, aucun champ** | **N'EXISTE PAS** → composition réutilisée pour le standing réel |
| Variation ▲/▼ hebdo par ligne | aucun snapshot hebdomadaire | **ABSENT** |
| Moment « NOUVEAU RANG » plein écran | `RankUpCard` démo + non monté | **ABSENT** |

---

## 5. INCERTITUDES

- **Référentiel-image E11/E12 manquant** : la fidélité pixel (tailles, casse,
  espacements, « fond carto 35 % ») **ne peut pas être vérifiée**. Tout §2-§3
  compare au TEXTE `PLANCHES.md` (déclaré « potentiellement périmé »).
- **Dépendances de déploiement non vérifiables en lecture** : `player_leaderboard.activity`
  (migration 0070) et `specialty_leaderboard` (0069). Si non appliquées en base,
  la lecture **échoue → `unavailable`** (état honnête), pas un faux vide
  (`leagueBoard.ts:54-58`). Je ne peux pas confirmer l'état réel de la base.
- **Fichiers en mouvement** : `classement.tsx` daté `Jul 26 04:39`, un chantier
  pouvait écrire pendant ma lecture.
- **Fonte « High Cruiser »** (loi de lecture) : non recherchée ici (hors E11/E12) ;
  le dépôt titre en Inter Tight — à confirmer ailleurs.

---

## 6. BILAN CHIFFRÉ

**Écrans du périmètre : 2** (E11 Classement local, E12 Saison & rang).

**Planches-image ouvertes : 14/14 présentes** — dont **0 portant E11 ou E12**
(toutes E01→E09). Fichiers de code lus (fichier:ligne) : `flags.ts`, `warroom.tsx`,
`classement.tsx`, `leagueBoard.ts`, `leagueRanking.ts`, `seasonRewards.ts`,
`SeasonStatus.tsx`, `LeagueMedal.tsx`, `RankUpCard.tsx`, `profil.tsx`,
`GrydNavBar.tsx`.

| Catégorie | Nb | Détail |
|---|---:|---|
| **Vérifiés (fichier:ligne)** | 11 fichiers | cf. ci-dessus |
| **Conformes** (forme + donnée réelle) | 8 | Run/Bike switch · podium+or · ma ligne sticky · écart calculé · anti-« 22 000/0 » · ex æquo 1224 · modération · frise récompenses réelle |
| **Partiels** (forme tenue, donnée/modèle divergent) | 4 | unité **points≠km²** · **taxonomie chips** (Ma ville/Spéc/Villes/Crews ≠ 5 chips proximité) · **card rang** (standing réel, pas Argent II/XP) · **reset** (code corrige une planche fausse) |
| **Absents** | 7 | sélecteur « Semaine ▾ » · variation ▲/▼ · colonne crew/ligne · board Villes · sticky crew · fond carto 35 % · moment « NOUVEAU RANG » plein écran |
| **Bloquants** | 2 | (1) **`flags.season=false`** masque E11+E12 (`classement.tsx:679`) — 1er verrou à lever ; (2) **planches-image E11/E12 absentes du dépôt** — recalage-fidélité impossible sans réexport |

**Verdict de progression :** E11/E12 sont **bâtis et adossés au réel** (données
vraies ou vides honnêtes, jamais fabriquées), mais **délibérément invisibles**
(`flags.season`) et **volontairement infidèles au dessin** là où la planche
suppose des données que le jeu ne calcule pas (km²/joueur, divisions Argent/XP,
variation hebdo, territoires « conservés » au reset). Le premier travail n'est pas
de construire : c'est (a) **ouvrir le flag** et (b) **réexporter les 2 planches**
pour trancher chaque écart forme-vs-vérité.
