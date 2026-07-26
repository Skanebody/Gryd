# GRYD — Spécification produit, UX/UI et logique complète du jeu

**Version :** 1.0  
**Date :** 26 juillet 2026  
**Statut :** document de référence exécutable  
**Périmètre :** application mobile GRYD — Run et Bike  
**Sources visuelles analysées :** 20 captures et planches jointes  
**Principe directeur :** l’utilisateur court ou roule ; le système comprend, calcule, protège, classe et raconte le résultat.

---

# 0. Mode d’emploi de ce document

Ce fichier est la source de vérité produit et UI de GRYD. Il ne s’agit pas d’un moodboard ni d’une liste d’idées. Chaque écran ci-dessous définit :

- son objectif utilisateur ;
- son point d’entrée ;
- son emplacement exact dans la navigation ;
- la hiérarchie de ses éléments ;
- les données qu’il consomme ;
- la logique serveur et client ;
- ses états vides, chargement, erreur et hors ligne ;
- les événements analytics ;
- ses critères d’acceptation.

En cas de conflit entre une ancienne maquette, une ancienne implémentation et ce document, ce document prévaut, sauf contrainte technique ou juridique démontrée.

---

# 1. Décisions produit non négociables

## 1.1 Proposition centrale

GRYD est un jeu territorial de course à pied et de vélo. L’activité physique réelle produit une trace. Une boucle valide peut créer, reprendre ou défendre un territoire.

Le produit doit être compris en moins de 20 secondes :

1. Je me déplace.
2. Je ferme une boucle.
3. La zone intérieure peut devenir mon territoire.
4. Les autres peuvent la reprendre.
5. Mon crew peut agrandir et défendre un territoire collectif.

## 1.2 Deux univers séparés

Les activités **Run** et **Bike** utilisent la même application, mais jamais le même classement ni la même carte compétitive.

- Un territoire Run n’est pas un territoire Bike.
- Une surface Run ne s’additionne pas à une surface Bike.
- Les classements, saisons, statistiques, missions et historiques sont filtrés par activité.
- Le commutateur Run/Bike est visible uniquement sur les écrans où il change réellement les données.
- Pendant une activité en cours, le mode est verrouillé.

## 1.3 Deux objectifs seulement

Le vocabulaire de jeu n’expose que :

- **CONQUÉRIR**
- **DÉFENDRE**

Le produit ne demande pas systématiquement à l’utilisateur de choisir. Il détermine l’objectif recommandé selon le contexte :

- aucune menace prioritaire : **Conquérir** ;
- territoire personnel ou crew contesté et accessible : **Défendre** ;
- mission crew active : objectif de la mission ;
- trace finale compatible avec un autre résultat : le serveur classe le résultat réel sans invalider arbitrairement la sortie.

L’utilisateur garde une possibilité de modification discrète dans la feuille de préparation, mais il n’est jamais confronté à un formulaire complexe.

## 1.4 Carte et géométrie

- Aucun hexagone.
- Les territoires suivent des polygones issus des traces réelles et des rues.
- La trace sportive reste visible comme un trait épais et lisible.
- Une fermeture de boucle produit un polygone.
- Plusieurs contributions d’un même crew peuvent fermer une frontière commune.
- Les territoires sont simplifiés visuellement à bas niveau de zoom, sans modifier leur géométrie serveur.
- Les zones privées, interdites, dangereuses ou sensibles sont exclues du calcul.

## 1.5 Confidentialité

- La position exacte en direct d’un joueur n’est jamais publique.
- Les rivaux ne voient jamais le déplacement en temps réel.
- Les membres d’un crew ne voient une position temporaire que si l’utilisateur active explicitement un partage de sortie limité dans le temps.
- Les 250 premiers et derniers mètres d’une activité sont masqués dans les exports publics par défaut.
- La publication d’un nouveau territoire est différée de 60 minutes par défaut.
- Les zones personnelles floutées prévalent sur tout rendu social.
- Les données privées ne peuvent jamais être vendues comme avantage Premium.

## 1.6 Monétisation

GRYD vend :

- des cosmétiques ;
- des cadres ;
- des emblèmes ;
- des avatars ;
- des styles de trace ;
- des modèles de story ;
- des analyses avancées ;
- des outils de planification et de replay.

GRYD ne vend jamais :

- de surface ;
- de distance ;
- une capture ;
- une défense ;
- une priorité de classement ;
- la position d’un rival ;
- un multiplicateur compétitif ;
- une victoire ;
- une immunité territoriale.

## 1.7 UX

- Navigation principale limitée à **Carte**, **Crew**, **Profil**.
- Une seule action principale par écran.
- Maximum deux niveaux de navigation visibles.
- Aucun dashboard rempli de cartes décoratives.
- Les valeurs sont expliquées en langage naturel.
- Aucun écran vide sans prochaine action.
- Aucun réglage technique demandé avant qu’il soit utile.
- Aucun modal de confirmation pour une action réversible.
- Confirmation obligatoire uniquement pour une action destructrice, payante ou irréversible.
- Les détails avancés existent, mais ne gênent jamais le parcours principal.

---

# 2. Architecture de navigation

## 2.1 Navigation principale persistante

Barre basse, hauteur 64 pt hors zone sûre :

| Onglet | Destination | Rôle |
|---|---|---|
| Carte | `/map` | Jouer, voir le territoire, lancer une activité |
| Crew | `/crew` | Coopérer, voir les missions et les membres |
| Profil | `/profile` | Progression, stats, historique et réglages |

### Règles

- La barre basse disparaît pendant une activité, un écran d’authentification, un moment de récompense plein écran et un paywall.
- L’onglet actif utilise la chartreuse.
- Les deux autres utilisent un gris lisible.
- Aucun badge rouge marketing. Seules les urgences de défense peuvent afficher un point orange ou violet.
- Le tap sur l’onglet actif remonte en tête ou recentre la carte.

## 2.2 Navigation contextuelle

Le header standard contient :

- à gauche : retour ou avatar selon le contexte ;
- au centre : titre ou sélecteur de ville ;
- à droite : action unique, cloche ou commutateur Run/Bike.

Aucun menu hamburger global. Les réglages sont accessibles depuis le profil.

## 2.3 Routes de haut niveau

```text
/
├── onboarding
├── auth
├── setup
├── map
│   ├── zone/:zoneId
│   ├── prepare
│   ├── route-plan
│   ├── activity
│   ├── result/:activityId
│   ├── missions
│   └── activity-feed
├── crew
│   ├── discover
│   ├── create
│   ├── :crewId
│   │   ├── map
│   │   ├── members
│   │   ├── stats
│   │   ├── mission/:missionId
│   │   └── settings
├── leaderboard
├── season
├── badges
├── shop
├── premium
├── profile
│   ├── edit
│   ├── stats
│   ├── history
│   ├── privacy
│   ├── notifications
│   ├── connections
│   ├── accessibility
│   └── account
├── player/:playerId
├── help
└── report
```

---

# 3. Design system exact

## 3.1 Références de viewport

Référence iOS :

- largeur logique : 390 pt ;
- hauteur logique : 844 pt ;
- marge horizontale : 16 pt ;
- zone utile minimale au-dessus de la barre basse : 700 pt.

Référence Android :

- largeur logique : 412 dp ;
- hauteur logique : 915 dp ;
- marge horizontale : 16 dp.

Le layout ne doit pas être dessiné en pixels fixes pour un seul téléphone. Les composants s’adaptent entre 360 et 430 points de largeur.

## 3.2 Palette

```css
--gryd-bg: #060907;
--gryd-surface-1: #0D120F;
--gryd-surface-2: #151C17;
--gryd-surface-3: #1D251F;
--gryd-border: #2A342D;
--gryd-text: #F5F7F5;
--gryd-text-muted: #9CA59E;
--gryd-text-faint: #667068;
--gryd-primary: #C2FF23;
--gryd-primary-dark: #6F9800;
--gryd-run: #C2FF23;
--gryd-bike: #9DDB24;
--gryd-defense: #8064FF;
--gryd-rival: #FF643C;
--gryd-warning: #F2B744;
--gryd-success: #48D597;
--gryd-info: #4A9EFF;
--gryd-gold: #F6C34F;
```

### Règles de couleur

- La chartreuse indique l’utilisateur, son action principale ou sa progression.
- Le violet indique une contestation ou une défense.
- L’orange indique un rival ou une reprise adverse.
- Le bleu indique une information système ou un officier de crew.
- L’or indique uniquement la rareté ou une première place.
- Une couleur de crew n’occupe jamais le fond complet de l’interface. Elle apparaît sur les cartes, emblèmes, frontières et accents.
- Maximum deux couleurs de données dans un même graphique.

## 3.3 Typographie

```css
--font-display: "High Cruiser", "Arial Black", sans-serif;
--font-ui: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display",
           "Roboto", sans-serif;
--font-mono: "IBM Plex Mono", "SFMono-Regular", monospace;
```

- High Cruiser est réservé aux slogans, rangs et titres héroïques.
- Le produit reste fonctionnel sans le fichier High Cruiser grâce au fallback.
- Corps minimum : 14 pt.
- Légendes : 12 pt minimum.
- CTA : 15 à 16 pt, semi-bold ou bold.
- Titres écran : 22 à 24 pt.
- Titres héro : 38 à 48 pt selon la place.
- Chiffre principal : 28 à 40 pt.
- Pas de texte intégralement en capitales pour les paragraphes.
- Les libellés de section peuvent être en capitales, 11 à 12 pt, tracking augmenté.

## 3.4 Grille et espacements

Échelle unique :

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
```

- Marge écran : 16.
- Espacement header-contenu : 16 à 20.
- Espacement entre blocs majeurs : 24.
- Espacement entre lignes : 12 à 16.
- Coins des cartes : 14 à 18.
- Feuilles basses : 24 en haut, 0 en bas.
- Bouton principal : 56 de hauteur.
- Bouton secondaire : 48.
- Zone tactile minimale : 44 × 44.
- Ne jamais imbriquer plus de deux surfaces bordées.

## 3.5 Icônes

- Trait arrondi, épaisseur cohérente, taille standard 22–24.
- Icône + texte pour toute action non évidente.
- Pas d’emoji dans l’interface de production.
- Les familles d’icônes doivent couvrir : carte, capture, défense, crew, rivalité, course, vélo, objectif, saison, rang, badge, partage, sécurité et alerte.

## 3.6 Boutons

### Primaire

- fond chartreuse ;
- texte noir ;
- largeur disponible ;
- hauteur 56 ;
- rayon 16 à 18 ;
- état pressé : échelle 0,98 et luminosité réduite ;
- loading : spinner à gauche, texte conservé ;
- disabled : surface 3, texte faint, raison disponible sous le bouton.

### Secondaire

- fond surface 2 ;
- bordure 1 px ;
- texte blanc ;
- même hauteur lorsque placé à côté d’un primaire.

### Tertiaire

- texte seul ;
- zone tactile de 44 ;
- jamais utilisé comme CTA principal.

## 3.7 Mouvement

- Durée standard : 180 ms.
- Changement d’écran : 220–280 ms.
- Fermeture de boucle : 900 ms maximum.
- Capture : remplissage progressif du polygone, puis pulsation unique.
- Rang : moment dédié de 1,4 seconde maximum, skippable.
- Reduce Motion : suppression du zoom, des particules et des pulsations répétées.
- Aucun clignotement.

## 3.8 Haptique

- léger : changement Run/Bike, filtre, sélection ;
- moyen : boucle fermée ;
- succès : capture ou défense validée ;
- avertissement : GPS insuffisant, activité suspendue ;
- aucun haptique répétitif pendant la course.

## 3.9 Cartographie

- fond sombre à faible contraste ;
- routes principales visibles avant routes secondaires ;
- bâtiments et labels réduits ;
- trace utilisateur de 5 à 7 px ;
- frontière de territoire de 2 à 3 px ;
- zone personnelle : remplissage chartreuse à 18–24 % ;
- zone crew : couleur crew à 16–20 % ;
- zone rivale : orange à 14–18 % ;
- contestée : double contour chartreuse/violet ou couleur propriétaire/violet ;
- simplification géométrique par niveau de zoom ;
- aucun label si sa lecture masque la trace.

---

# 4. Composants globaux

## 4.1 `AppHeader`

Variantes :

1. avatar + ville + cloche ;
2. retour + titre + action ;
3. retour + titre seul ;
4. plein écran transparent sur photo.

## 4.2 `ActivitySwitch`

Commutateur compact Run/Bike :

- largeur 80 à 96 ;
- hauteur 40 ;
- icône Run à gauche, Bike à droite ;
- l’activité sélectionnée a un fond chartreuse sombre ;
- absent pendant une activité ;
- mémorisé par onglet ;
- provoque un rechargement atomique des territoires, classements et stats.

## 4.3 `BottomNav`

Trois onglets uniquement.

## 4.4 `ActionSheet`

Feuille basse contextuelle :

- poignée centrée ;
- hauteur selon contenu ;
- titre ;
- une phrase de contexte ;
- métriques essentielles ;
- un CTA principal ;
- une action secondaire éventuelle.

## 4.5 `ZonePreview`

Mini-carte avec :

- polygone ;
- type ;
- surface ;
- statut ;
- aucun détail de position privée.

## 4.6 `StatusPill`

États autorisés :

- À défendre ;
- Contestée ;
- Protégée ;
- En validation ;
- Hors ligne ;
- Premium ;
- Nouveau ;
- Expire bientôt.

## 4.7 `DecisionCard`

Une recommandation système contient :

- fait ;
- impact ;
- action ;
- niveau de confiance si utile ;
- lien « Pourquoi ? » uniquement lorsque la décision est complexe.

## 4.8 `EmptyState`

Toujours :

- illustration fonctionnelle ou mini-carte ;
- phrase claire ;
- une action ;
- aucune culpabilisation.

---

# 5. Modèle métier central

## 5.1 Entités

```text
User
Profile
Device
Activity
TrackPoint
ActivitySession
Polygon
Territory
TerritoryOwnership
TerritoryContest
Crew
CrewMembership
CrewContribution
CrewMission
LeaderboardSnapshot
Season
Rank
Badge
Reward
Notification
Follow
Challenge
Purchase
Subscription
PrivacyZone
Report
AntiCheatReview
ShareArtifact
```

## 5.2 Statuts d’une activité

```text
DRAFT
GPS_ACQUIRING
READY
ACTIVE
PAUSED
RECOVERING
FINISHING
UPLOADING
PROCESSING
VALID
PARTIALLY_VALID
REVIEW
REJECTED
ARCHIVED
```

## 5.3 Statuts d’un territoire

```text
UNOWNED
OWNED_PERSONAL
OWNED_CREW
CONTESTED
DEFENDED
TRANSFER_PENDING
PROTECTED_BY_PRIVACY
EXPIRED
INVALIDATED
```

## 5.4 Événements métier

```text
ACTIVITY_STARTED
TRACK_POINT_RECEIVED
LOOP_POTENTIALLY_CLOSED
LOOP_CONFIRMED
POLYGON_CREATED
TERRITORY_CAPTURED
TERRITORY_CONTESTED
TERRITORY_DEFENDED
TERRITORY_TRANSFERRED
CREW_FRONTIER_COMPLETED
BADGE_UNLOCKED
RANK_CHANGED
SEASON_ENDED
ANTI_CHEAT_FLAGGED
ACTIVITY_RECOVERED
SHARE_CREATED
```

Tous les événements critiques sont idempotents.

---

# 6. Inventaire complet des écrans

Les identifiants `E00` à `E79` sont stables. Ils doivent être repris dans les tickets, composants, tests E2E et analytics.

---

## A. Démarrage, onboarding et compte

## E00 — Splash / restauration de session

**Route :** `/`  
**Objectif :** démarrer sans écran inutile et restaurer l’état local.

### Layout

- fond `--gryd-bg` ;
- logo GRYD centré horizontalement, légèrement au-dessus du centre ;
- aucun slogan ;
- indicateur discret uniquement si le chargement dépasse 600 ms.

### Logique

Ordre :

1. lire le token local ;
2. charger le profil minimal ;
3. restaurer une activité interrompue ;
4. vérifier la version minimale ;
5. router vers activité, onboarding, setup ou carte.

### États

- activité active retrouvée : aller directement à E19 « récupération » ;
- token expiré : tenter un refresh silencieux ;
- hors ligne avec session connue : ouvrir la carte en mode cache ;
- version bloquée : E77 ;
- incident serveur : E76.

### Critère

Aucun flash de l’écran de connexion lorsqu’une session valide existe.

---

## E01 — Promesse visuelle

**Route :** `/onboarding/1`  
**Référence :** planche photo « COURS. PRENDS TA VILLE. »

### Layout exact

- photo plein écran sous la status bar ;
- dégradé noir du milieu vers le bas ;
- lien « Passer » en haut à droite, 44 × 44 minimum ;
- titre en bas, marge 24, sur 2 lignes ;
- sous-titre de 2 lignes maximum ;
- CTA primaire à 24 pt du bas de contenu ;
- indicateur 4 points au-dessus de la home indicator.

### Texte

**Titre :** `COURS. PRENDS TA VILLE.`  
**Sous-titre :** `Chaque boucle fermée peut devenir votre territoire.`  
**CTA :** `CONTINUER`

### Pourquoi

La promesse précède les règles. La photo transmet l’énergie sociale avant l’explication cartographique.

---

## E02 — Onboarding : fermer la boucle

**Route :** `/onboarding/2`

### Layout

- mini-carte occupant 58 % de la hauteur ;
- animation de trace chartreuse ;
- point départ et point de fermeture ;
- contenu ancré en bas ;
- bouton primaire ;
- progression 2/4.

### Texte

**Titre :** `FERME LA BOUCLE.`  
**Corps :** `Quand votre tracé se referme, la zone à l’intérieur devient une conquête possible.`

### Logique

L’animation :

1. dessine la trace ;
2. ferme la boucle ;
3. remplit le territoire ;
4. s’arrête.

Aucune lecture automatique en boucle après deux répétitions.

---

## E03 — Onboarding : rivalité

**Route :** `/onboarding/3`

### Texte

**Titre :** `ON PEUT TE LA REPRENDRE.`  
**Corps :** `Vos zones restent en jeu. Défendez-les, ou reprenez celles des autres.`

### Visuel

- zone personnelle chartreuse ;
- frontière rivale orange qui coupe ou recouvre une partie ;
- label `REPRISE` ;
- aucune donnée complexe.

---

## E04 — Onboarding : crew

**Route :** `/onboarding/4`

### Texte

**Titre :** `PLUS FORTS EN CREW.`  
**Corps :** `Vos boucles s’additionnent. Le quartier se prend à plusieurs.`

### Visuel

- deux territoires de couleurs distinctes ;
- fusion ou frontière collective ;
- photo humaine possible en arrière-plan à faible contraste.

---

## E05 — Pré-permission de localisation

**Route :** `/onboarding/location`

### Layout

- carte simplifiée ;
- point utilisateur et zone de confidentialité ;
- titre dans le tiers inférieur ;
- trois garanties en lignes ;
- CTA primaire ;
- action `Plus tard`.

### Texte

**Titre :** `VOTRE POSITION CRÉE LE TRACÉ.`

Garanties :

- `Utilisée seulement pendant vos activités`
- `Jamais visible en direct par les autres`
- `Zones floutées autour des lieux sensibles`

### Logique

Le dialogue système n’est ouvert qu’après le tap sur `AUTORISER LA LOCALISATION`.

`Plus tard` mène à l’authentification, puis la carte fonctionne en lecture seule. Le lancement d’une activité réaffiche une explication contextuelle.

---

## E06 — Authentification

**Route :** `/auth`

### Layout

- photo plein écran avec groupe de coureurs ;
- logo en haut ;
- panneau de boutons dans le tiers inférieur ;
- Apple ;
- Google ;
- e-mail ;
- texte légal minimal.

### Ordre

Sur iOS : Apple, Google, e-mail.  
Sur Android : Google, Apple si disponible, e-mail.

### Logique

- fusion de comptes par e-mail vérifié ;
- aucun mot de passe demandé si magic link ou passkey disponible ;
- l’authentification ne crée pas automatiquement un profil public complet ;
- reprise du parcours exact après succès.

---

## E07 — Connexion par e-mail

**Route :** `/auth/email`

### Layout

- retour ;
- titre ;
- champ e-mail ;
- CTA `RECEVOIR LE LIEN` ;
- clavier e-mail ;
- aucune demande de mot de passe en première intention.

### États

- lien envoyé ;
- e-mail invalide ;
- compte existant avec fournisseur externe ;
- lien expiré ;
- renvoi après délai.

---

## E08 — Création du profil minimal

**Route :** `/setup/profile`

### Champs visibles

1. nom d’affichage ;
2. handle ;
3. ville de jeu.

La photo, la bio et le crew ne sont pas obligatoires.

### Layout

- aperçu compact du profil en haut ;
- champs en colonne ;
- CTA sticky au-dessus du clavier.

### Logique

- handle vérifié en temps réel avec debounce ;
- suggestions en cas d’indisponibilité ;
- ville issue de la localisation, mais modifiable ;
- pas de demande de genre, âge exact ou poids.

---

## E09 — Choix d’activité initial

**Route :** `/setup/activity`

### Objectif

Choisir le contexte affiché au premier lancement, sans enfermer l’utilisateur.

### Layout

Deux grandes lignes :

- `Course à pied`
- `Vélo`

Une seule sélection. Texte : `Vous pourrez changer à tout moment.`

### Logique

Ce choix ne mélange jamais les données. Il initialise seulement le filtre.

---

## E10 — Permissions utiles

**Route :** `/setup/permissions`

### Contenu

Deux cartes seulement :

1. mouvements et activité physique ;
2. notifications tactiques.

La localisation a déjà été expliquée.

### Règle

Chaque permission est demandée au moment de son bénéfice. Le bouton principal peut être `CONTINUER` même si une permission secondaire est refusée.

---

## B. Carte et exploration

## E11 — Carte principale

**Route :** `/map`  
**Écran central du jeu.**

### Structure

#### Header flottant

- gauche : avatar 44 × 44 avec anneau de niveau ;
- centre : pill `Ville · secteur` ;
- droite : cloche ;
- sous la cloche ou aligné à droite : commutateur Run/Bike.

#### Carte

- plein écran ;
- position utilisateur ;
- territoires ;
- frontières ;
- missions ;
- zones contestées ;
- aucun panneau permanent au centre.

#### Feuille basse compacte

Hauteur repos : 156 à 196 pt.

Contenu :

- label contextuel : `MISSION RECOMMANDÉE`, `À DÉFENDRE` ou `CONQUÉRIR` ;
- titre en une ou deux lignes ;
- distance estimée ou surface en jeu ;
- CTA principal rond ou pleine largeur ;
- poignée permettant d’étendre.

#### Barre basse

Carte actif, Crew, Profil.

### Logique de recommandation

Priorité :

1. défense expirant en moins de 6 h ;
2. mission crew active à proximité ;
3. boucle suggérée atteignable ;
4. conquête libre.

### Gestes

- tap territoire : E14 ;
- tap mission : E16 ;
- tap CTA : E17 ;
- swipe feuille vers le haut : détails ;
- double tap carte : zoom ;
- long press : placer un point de planification ;
- tap sur l’onglet Carte déjà actif : recentrer.

### États

- localisation refusée : carte de ville + CTA `ACTIVER POUR JOUER` ;
- GPS faible : bandeau discret ;
- hors ligne : carte mise en cache, lancement autorisé si données locales suffisantes ;
- aucune zone : premier objectif pédagogique ;
- activité interrompue : bandeau `Reprendre l’activité`.

### Analytics

`map_view`, `map_zone_tap`, `map_recommendation_shown`, `map_recenter`, `activity_switch`.

---

## E12 — Couches et filtres de carte

**Entrée :** icône couches depuis E11.

### Format

Feuille basse, jamais un écran complet.

### Options

- mes territoires ;
- crew ;
- rivaux ;
- contestées ;
- missions ;
- zones protégées privées ;
- labels.

### Règle

Les réglages persistent par activité. Le filtre ne peut pas masquer une menace urgente concernant l’utilisateur ; celle-ci reste visible sous forme de marqueur.

---

## E13 — Recherche de lieu

**Route :** `/map/search`

### Layout

- champ en haut ;
- résultats proches ;
- recherches récentes ;
- retour carte.

### Logique

La recherche sert à déplacer la carte ou planifier, jamais à publier la position. Les adresses de domicile ne sont pas ajoutées à l’historique si elles se trouvent dans une zone floutée.

---

## E14 — Détail d’un territoire

**Route :** `/map/zone/:zoneId`

### Présentation

Feuille basse sur la carte. Quatre variantes :

#### Zone libre

- nom géographique ;
- surface estimée ;
- meilleure boucle suggérée ;
- CTA `CONQUÉRIR`.

#### Zone personnelle

- durée de contrôle ;
- niveau de protection ;
- activité récente ;
- CTA `RENFORCER` si utile, sinon `PLANIFIER UNE SORTIE`.

#### Zone crew

- contribution de l’utilisateur ;
- derniers événements ;
- CTA selon mission.

#### Zone rivale

- propriétaire public ou crew ;
- surface publique ;
- frontière ;
- CTA `REPRENDRE`.

#### Zone contestée

- temps restant ;
- surface en jeu ;
- progression de contestation ;
- CTA `DÉFENDRE`.

### Confidentialité

Aucun départ, arrivée, horaire précis ou trace brute d’un tiers.

---

## E15 — Carte des zones d’un rival

**Route :** `/player/:playerId/zones`

### Rôle

Montrer les territoires publics généralisés d’un rival.

### Layout

- carte plein écran ;
- header avec identité réduite ;
- contours généralisés ;
- CTA de retour ;
- aucune position actuelle.

---

## E16 — Mission recommandée

**Route :** `/map/missions/:missionId`

### Layout

- carte ;
- objectif ;
- raison ;
- métriques : distance, durée, surface potentielle ;
- difficulté ;
- CTA `PRÉPARER LA SORTIE`.

### Logique

Les estimations sont recalculées lorsque la carte ou l’état du territoire change. Une mission devenue impossible disparaît proprement avec explication.

---

## E17 — Préparation d’activité

**Route :** `/map/prepare`

### Objectif

Passer de l’intention à l’activité en un seul écran.

### Layout exact

- header : retour + activité Run/Bike verrouillable ;
- grande ligne d’objectif recommandé :
  - `Conquérir autour de vous`
  - ou `Défendre Saint-Rémy`
- mini-carte de la cible ;
- trois états techniques :
  - GPS ;
  - batterie ;
  - synchronisation ;
- options repliées :
  - audio ;
  - partage temporaire crew ;
  - plan de route ;
- CTA sticky `DÉMARRER`.

### Friction minimale

Aucun compte à rebours obligatoire. Après le tap, un compte à rebours 3–2–1 est utilisé uniquement si l’utilisateur l’a activé.

### Sélection d’objectif

Un lien `Changer` ouvre un mini-segment `Conquérir / Défendre`. Le système garde la recommandation visible.

---

## E18 — Planificateur de boucle

**Route :** `/map/route-plan`

### Contenu

- carte pleine hauteur ;
- point de départ ;
- distance souhaitée sous forme de trois suggestions ;
- objectif territorial ;
- parcours calculé ;
- CTA `UTILISER CETTE BOUCLE`.

### Règles

- pas de formulaire multi-critères par défaut ;
- choix rapides : court, moyen, long ;
- éviter autoroutes, zones interdites et chemins incompatibles ;
- mode Premium pour planifications avancées ;
- les plans ne garantissent jamais une capture avant validation serveur.

---

## C. Activité en cours

## E19 — Acquisition GPS / prêt

**Route :** `/activity/ready`

### Layout

- carte ;
- anneau de précision ;
- texte `Recherche du signal` puis `Prêt` ;
- bouton `DÉMARRER MAINTENANT` lorsque le seuil est acceptable ;
- lien `Démarrer quand même` seulement si la précision reste exploitable.

### Seuils

- vert : précision ≤ 15 m ;
- orange : 16–30 m ;
- rouge : > 30 m.

Le serveur garde la précision réelle de chaque point.

---

## E20 — Activité Run active

**Route :** `/activity/live`

### Layout

#### Zone haute

- temps ;
- distance ;
- allure ;
- statut GPS.

#### Carte centrale

- trace active ;
- projection de fermeture ;
- cible territoriale ;
- aucun rival en direct ;
- alliés uniquement en partage crew volontaire et approximation.

#### Zone basse

- bouton pause ;
- objectif ;
- indication de fermeture :
  - `Retour à 180 m`
  - `Boucle presque fermée`
  - `Boucle fermée`

### Règles

- l’écran reste lisible en mouvement ;
- métriques en chiffres larges ;
- aucune interaction fine requise ;
- écran verrouillable avec suivi natif ou bridge ;
- récupération locale permanente.

---

## E21 — Activité Bike active

Même structure que E20 avec :

- vitesse à la place de l’allure ;
- seuils anti-triche Bike ;
- carte et classement Bike ;
- distances suggérées adaptées.

Run et Bike réutilisent les mêmes composants, mais les données ne sont jamais additionnées.

---

## E22 — Défense active

Variante de E20/E21.

### Éléments supplémentaires

- contour de la zone contestée ;
- jauge de couverture de défense ;
- temps restant avant échéance ;
- libellé `DÉFENSE` ;
- aucune barre agressive ou alarmiste.

### Feedback

Lorsque la couverture devient suffisante :

- haptique succès ;
- label `Défense possible — terminez la boucle` ;
- la validation finale reste serveur.

---

## E23 — Pause

### Format

Overlay, pas de navigation.

### Actions

- reprendre ;
- terminer ;
- annuler l’activité.

`Terminer` demande confirmation uniquement si l’activité est trop courte pour produire un résultat. `Annuler` précise que la trace locale sera supprimée.

---

## E24 — GPS faible / activité en récupération

### Format

Bandeau ou overlay selon gravité.

### Cas

- GPS faible : continuer en enregistrant ;
- permission révoquée : pause automatique ;
- app tuée : session locale restaurée ;
- réseau absent : file d’attente locale ;
- capteur incohérent : activité continue mais passe en analyse.

Aucune perte silencieuse.

---

## E25 — Sécurité

Accessible pendant l’activité depuis une icône discrète.

### Fonctions

- partager la sortie avec un contact ;
- appeler les secours selon pays ;
- arrêter l’activité ;
- afficher les consignes.

Aucune fonction sociale compétitive dans ce panneau.

---

## E26 — Fin d’activité

### Format

Feuille basse.

### Contenu

- temps ;
- distance ;
- objectif détecté ;
- bouton `TERMINER ET ANALYSER` ;
- bouton `REPRENDRE`.

### Logique

Le tap finalise localement, chiffre les données, lance l’upload puis ouvre E27.

---

## E27 — Analyse et synchronisation

### Layout

- carte avec trace ;
- étapes :
  - sécurisation ;
  - analyse de boucle ;
  - validation territoriale ;
- progression non artificielle ;
- message hors ligne si upload différé.

### Règle

L’utilisateur peut quitter. Une notification l’informe du résultat. Ne jamais bloquer plusieurs minutes sur un faux spinner.

---

## E28 — Activité en revue anti-triche

### Texte

`Votre activité est enregistrée. Une incohérence doit être vérifiée avant le classement.`

### Contenu

- ce qui reste enregistré ;
- délai estimatif ;
- lien d’explication ;
- aucun langage accusatoire ;
- aucune possibilité de payer pour accélérer.

---

## D. Résultats et partage

## E29 — Résultat : conquête

**Route :** `/result/:activityId`

### Layout

- titre `ZONE CONQUISE` ;
- carte du nouveau polygone ;
- surface héro ;
- distance, temps, allure/vitesse ;
- contribution crew ;
- rang ou badge éventuel ;
- CTA `PARTAGER` ;
- secondaire `VOIR SUR LA CARTE`.

### Règle

Le territoire est le contenu principal. Les statistiques sportives sont secondaires.

---

## E30 — Résultat : reprise

### Titre

`SAINT-RÉMY REPRIS`

### Contenu

- ancien propriétaire ou crew selon confidentialité ;
- surface reprise ;
- variation de rang ;
- activité ;
- CTA `PARTAGER LA REPRISE`.

Le ton célèbre l’action, pas l’humiliation d’un joueur.

---

## E31 — Résultat : défense

### Titre

`ZONE DÉFENDUE`

### Contenu

- échéance évitée ;
- surface conservée ;
- niveau de protection obtenu ;
- CTA `VOIR LA ZONE`.

---

## E32 — Résultat : sortie libre

### Cas

Boucle non fermée ou aucune action territoriale.

### Contenu

- trace ;
- stats sportives ;
- explication courte :
  - `La boucle n’était pas fermée`
  - ou `Zone non éligible`
- suggestion concrète pour la prochaine sortie ;
- aucun sentiment d’échec artificiel.

---

## E33 — Résultat : contribution crew

### Cas

La sortie ne crée pas seule une zone mais complète une frontière commune.

### Contenu

- contribution en km de frontière ;
- progression de fermeture ;
- membres contributeurs ;
- CTA `VOIR LA MISSION`.

---

## E34 — Résultat partiellement valide

### Cas

Une partie de la trace est exclue.

### Contenu

- stats valides ;
- portion exclue ;
- raison en langage simple ;
- lien d’appel si nécessaire.

---

## E35 — Compositeur de partage

**Référence :** planche « Partager ».

### Structure

- close en haut gauche ;
- titre `Partager` ;
- badge `Protégé` en haut droite ;
- aperçu 9:16 principal ;
- carrousel de formats sous l’aperçu :
  - Auto ;
  - Impact ;
  - Photo ;
  - Avant/Après ;
  - Minimal ;
  - Sticker ;
  - Replay ;
- justification de la sélection ;
- lien `Personnaliser` ;
- CTA `PARTAGER LA STORY` ;
- raccourcis Instagram, TikTok, WhatsApp, Plus.

### Logique Auto

Le moteur choisit selon l’événement dominant :

1. reprise ;
2. défense ;
3. capture ;
4. record ;
5. classement ;
6. performance sportive.

### Confidentialité

Avant export :

- masquer départ et arrivée ;
- supprimer les zones floutées ;
- simplifier la carte ;
- enlever les horaires sensibles ;
- afficher le badge Protégé.

### Personnalisation

Une seule option à la fois :

- style ;
- format ;
- média ;
- texte ;
- confidentialité.

---

## E36 — Partage personnalisé

### Layout

Éditeur simple :

- aperçu ;
- onglet actif ;
- 3 à 6 choix maximum ;
- CTA `APPLIQUER`.

Aucun éditeur de design libre complexe.

---

## E37 — Partage terminé

### Format

Toast ou petit écran de succès selon canal.

### Actions

- retour au résultat ;
- copier le lien ;
- voir le profil public.

---

## E. Crew

## E38 — Crew : état sans crew

**Route :** `/crew`

### Layout

- header ;
- carte héro `Trouvez votre crew` ;
- CTA `DÉCOUVRIR LES CREWS` ;
- secondaire `CRÉER UN CREW` ;
- explication en trois lignes maximum ;
- barre basse.

### Logique

Proposer d’abord les crews locaux pertinents, pas un annuaire mondial.

---

## E39 — Découverte des crews

**Route :** `/crew/discover`

### Contenu

- recherche ;
- filtres minimaux :
  - proches ;
  - amis ;
  - ouverts ;
- liste de crews ;
- surface ;
- membres ;
- activité récente ;
- état des demandes.

### Classement

Pertinence :

1. ville ;
2. amis ou contacts ;
3. activité récente ;
4. capacité disponible ;
5. compatibilité Run/Bike.

---

## E40 — Profil public d’un crew

**Route :** `/crew/:crewId/public`

### Contenu

- bannière ;
- emblème ;
- nom, handle, ville ;
- rang local ;
- surface ;
- membres ;
- carte publique simplifiée ;
- activité récente ;
- CTA `REJOINDRE` ou `DEMANDER À REJOINDRE`.

Aucun chat ni information privée avant adhésion.

---

## E41 — Création d’un crew

**Route :** `/crew/create`

### Étapes sur un seul écran scrollable court

- nom ;
- handle ;
- emblème ;
- couleur validée ;
- accès : public, sur demande, privé.

### Règles

- aperçu en direct ;
- nom et handle vérifiés ;
- couleurs choisies dans une palette accessible ;
- la couleur crew ne remplace jamais la chartreuse utilisateur ;
- le créateur devient chef.

---

## E42 — Crew nouveau sans territoire

**Route :** `/crew/:crewId`

### Référence

Planche `Votre premier territoire crew`.

### Layout

- identité crew ;
- carte mission première zone ;
- CTA `LANCER LA PREMIÈRE MISSION` ;
- trois actions de démarrage :
  1. inviter deux coureurs ;
  2. choisir emblème et couleur ;
  3. fermer trois boucles dans le quartier.

Aucun dashboard vide.

---

## E43 — Crew actif : aperçu

### Layout

- photo ou bannière ;
- emblème ;
- nom, handle, ville, rang, surface, membres ;
- segment `Aperçu / Carte / Membres` ;
- objectif du jour ;
- mini-carte de territoire ;
- activité récente ;
- avatars membres ;
- barre basse.

### Pourquoi

L’objectif du jour vient avant les statistiques. L’écran doit conduire à une sortie collective.

---

## E44 — Carte du crew

### Contenu

- territoires crew ;
- zones vulnérables ;
- missions ;
- contributions ;
- filtres Run/Bike ;
- légende limitée.

### Confidentialité

Les contributions individuelles sont agrégées. Les membres ne voient pas automatiquement le domicile ou les traces complètes des autres.

---

## E45 — Mission crew

### Contenu

- objectif ;
- carte ;
- progression collective ;
- échéance ;
- contributions nécessaires ;
- participants ;
- CTA `CONTRIBUER`.

### Complétion collective

Des segments compatibles peuvent être fusionnés si :

- même activité ;
- même crew ;
- distance entre extrémités inférieure au seuil serveur ;
- contributions dans la fenêtre temporelle ;
- géométrie finale valide.

---

## E46 — Membres et rôles

### Groupes

- chef ;
- officiers ;
- membres.

### Ligne membre

- avatar ;
- nom ;
- handle ;
- rôle ;
- contribution de saison ;
- dernière contribution formulée de manière neutre ;
- menu selon permissions.

### Permissions

- chef : tout, y compris transfert et suppression ;
- officier : missions, invitations, modération limitée ;
- membre : contribution et interactions ;
- aucun rôle ne donne d’avantage de capture.

---

## E47 — Actions sur un membre

### Format

Feuille d’actions.

Actions selon permission :

- promouvoir ;
- rétrograder ;
- retirer ;
- transférer le rôle de chef ;
- signaler ;
- bloquer.

Toute action sensible affiche une conséquence claire.

---

## E48 — Activité et annonces crew

### Objectif

Coordination sans créer une messagerie lourde.

### Sections

- annonces épinglées ;
- propositions de sortie ;
- captures et défenses ;
- demandes d’aide.

### Actions

- répondre ;
- participer ;
- planifier ;
- voir la zone.

Le chat temps réel complet peut être un module ultérieur. La V1 privilégie les objets structurés.

---

## E49 — Créer une sortie crew

### Champs minimaux

- date et heure ;
- point de rendez-vous approximatif ;
- activité Run/Bike ;
- objectif ou zone ;
- nombre de places facultatif.

### Confidentialité

L’adresse exacte n’est visible qu’aux participants acceptés et peut être remplacée par un lieu public.

---

## E50 — Statistiques du crew

### Layout

- surface ;
- rang local ;
- défenses ;
- distance collective ;
- courbe quatre semaines ;
- top contributeurs ;
- lien membres.

### Règle

Run et Bike restent séparés. Une contribution n’est jamais présentée comme une obligation morale.

---

## E51 — Paramètres du crew

Réservé au chef et aux officiers autorisés.

### Contenu

- identité ;
- accès ;
- bannière ;
- emblème ;
- couleur ;
- règles ;
- permissions ;
- transfert ;
- quitter ;
- supprimer.

Les actions destructrices sont isolées en bas.

---

## E52 — Invitation crew

### Format

Feuille partageable.

- lien ;
- QR ;
- contacts ;
- aperçu ;
- expiration facultative.

---

## F. Classements, rivalité et profils publics

## E53 — Classement joueurs

**Route :** `/leaderboard`

### Header

- retour ou accès depuis profil/carte ;
- titre `Classement` ;
- commutateur Run/Bike ;
- période : semaine, saison.

### Filtres horizontaux

- autour de moi ;
- quartier ;
- ville ;
- amis ;
- crews.

### Contenu

- podium compact ;
- ligne utilisateur sticky ;
- liste ;
- rang ;
- surface ;
- variation ;
- progression vers le rang précédent.

### Règles psychologiques

- l’utilisateur est comparé à des joueurs atteignables ;
- pas de podium mondial au premier écran ;
- égalité : dernier snapshot + date ;
- aucune fausse urgence.

---

## E54 — Classement crews

Même structure, avec :

- crews ;
- membres ;
- surface ;
- progression ;
- crew utilisateur sticky.

---

## E55 — Profil personnel

**Route :** `/profile`

### Layout

- header visuel ou surface sombre ;
- avatar avec niveau ;
- nom, handle, crew, ville, rang ;
- quatre métriques maximum ;
- carte signature ;
- progression de rang ;
- activité récente ;
- badges ;
- historique ;
- barre basse.

### Métriques

- surface contrôlée ;
- zones ;
- défenses ;
- distance de saison.

Run/Bike via commutateur.

---

## E56 — Profil public / rival

**Route :** `/player/:playerId`

### Layout

- identité ;
- follow ;
- défi ;
- surface publique ;
- zones ;
- rang ;
- bloc `Votre rivalité` ;
- territoire public généralisé ;
- faits publics récents ;
- CTA `VOIR SES ZONES`.

### Interdits

- heure précise des sorties ;
- départ/arrivée ;
- position en direct ;
- historique complet ;
- données privées ;
- comparaisons impossibles.

### Bloc rivalité

Exemples :

- `Nina tient Saint-Rémy, votre ancienne zone.`
- `Vous vous êtes repris 3 zones cette saison.`

---

## E57 — Suivis et amis

### Sections

- suit ;
- abonnés ;
- amis importés ;
- suggestions locales.

Le suivi n’autorise aucune donnée supplémentaire de localisation.

---

## E58 — Défi

### Format

Feuille courte.

Types autorisés :

- surface sur une période ;
- nombre de boucles ;
- défense d’une zone publique ;
- distance sportive.

Aucune mise d’argent ni récompense pay-to-win.

---

## G. Saison, rangs et badges

## E59 — Saison

**Route :** `/season`

### Layout

- titre Saison N ;
- temps restant ;
- carte de rang ;
- XP ;
- prochain jalon ;
- récompenses de saison ;
- règles ;
- historique saison précédente.

### Règles

- rangs Run et Bike séparés ;
- reset de rang clair ;
- territoires et badges acquis ne disparaissent pas ;
- récompenses cosmétiques ;
- aucune capacité compétitive.

---

## E60 — Passage de rang

### Plein écran

- emblème ;
- anneau chartreuse ;
- `NOUVEAU RANG` ;
- rang ;
- récompense ;
- CTA `CONTINUER` ;
- lien `Voir la saison`.

### Motion

1,4 seconde maximum, skippable, Reduce Motion pris en charge.

---

## E61 — Fin de saison

### Contenu

- rang final ;
- bilan ;
- récompenses ;
- prochaine saison ;
- règles de remise à zéro ;
- CTA `RÉCUPÉRER`.

---

## E62 — Collection de badges

**Route :** `/badges`

### Layout

- compteur obtenu/total ;
- catégories :
  - conquête ;
  - défense ;
  - exploration ;
  - crew ;
  - saison ;
- grille trois colonnes ;
- rareté par matériau, jamais par couleur criarde.

### États

- obtenu ;
- verrouillé avec condition ;
- secret ;
- expiré mais conservé ;
- saisonnier.

---

## E63 — Détail d’un badge

### Contenu

- visuel ;
- nom ;
- description ;
- rareté ;
- date ;
- progression ;
- CTA ajouter au profil si obtenu ;
- partage si obtenu.

---

## E64 — Badge débloqué

### Plein écran

- visuel grand ;
- glow limité ;
- nom ;
- condition accomplie ;
- rareté ;
- CTA `AJOUTER AU PROFIL` ;
- secondaire `CONTINUER`.

---

## H. Statistiques et historique

## E65 — Statistiques personnelles

**Route :** `/profile/stats`

### Filtres

- semaine ;
- mois ;
- saison ;
- Run/Bike.

### Trois blocs

1. volume d’activité ;
2. progression territoriale ;
3. régularité.

Chaque bloc contient :

- une valeur principale ;
- un graphique simple ;
- une phrase de conclusion.

### Règle

Pas de radar, donut décoratif ou table surchargée.

---

## E66 — Analytics territoriales Premium

### Contenu

- heatmap territoriale ;
- temps de contrôle par zone ;
- gains/pertes 90 jours ;
- zone la plus défendue ;
- frontières à surveiller ;
- planification.

### Limite éthique

Aucune information privée sur les rivaux. Le Premium aide à comprendre son propre territoire, pas à espionner.

---

## E67 — Historique des activités

**Route :** `/profile/history`

### Header

- titre ;
- commutateur Run/Bike ;
- résumé :
  - sorties ;
  - kilomètres ;
  - captures ;
  - défenses.

### Liste

Groupée par semaine. Chaque ligne :

- mini-carte ;
- type ;
- nom de zone ;
- impact territorial en premier ;
- distance ;
- durée ;
- date relative ;
- chevron.

### États

- activité en revue ;
- activité rejetée ;
- zone reprise depuis ;
- sortie libre.

---

## E68 — Détail historique

### Contenu

- résultat archivé ;
- carte ;
- trace protégée ;
- stats ;
- impact ;
- rang/badges ;
- partage rétroactif ;
- explication d’une invalidation.

---

## I. Notifications et activité

## E69 — Flux d’activité

**Route :** `/map/activity-feed`

### Groupes fixes

1. à défendre ;
2. rivalité ;
3. crew ;
4. progression.

### Ligne

- icône ou avatar ;
- fait en deux lignes maximum ;
- temps relatif ;
- action directe ou chevron.

### Règles

- ordre chronologique à l’intérieur d’un groupe ;
- priorité défense ;
- éléments obsolètes supprimés automatiquement ;
- `Tout lu` en haut.

---

## E70 — Zone attaquée

**Entrée :** notification ou tap sur zone contestée.

### Layout

- carte en haut ;
- polygone contesté ;
- feuille basse ;
- titre `VOTRE ZONE EST CONTESTÉE` ;
- nom ;
- rival public ;
- temps restant ;
- boucle de défense estimée ;
- surface ;
- CTA `DÉFENDRE` ;
- secondaire `Alerter le crew`.

### Ton

Des faits, une échéance, une décision. Pas d’alarme anxiogène.

---

## E71 — Réglages de notifications

### Catégories

- défense ;
- crew ;
- rivalité ;
- progression ;
- produit.

### Défauts

- défense : activée ;
- crew : activée ;
- rivalité : regroupée ;
- progression : activée ;
- produit : désactivée ou consentement explicite.

### Fréquence

Les événements non urgents sont regroupés au-delà de trois par jour.

---

## J. Boutique et Premium

## E72 — Boutique

**Route :** `/shop`

### Layout

- titre ;
- collection saisonnière ;
- catégories horizontales ;
- grille deux colonnes ;
- aperçu dans le contexte GRYD ;
- prix ;
- propriété ;
- durée saison/permanent.

### Produits

- trails ;
- cadres ;
- emblèmes ;
- avatars ;
- templates de story.

### Règles

- aucune loot box ;
- aucune monnaie opaque ;
- prix réel affiché ;
- aperçu avant achat ;
- compatibilité expliquée.

---

## E73 — Détail produit

### Contenu

- aperçu grand ;
- variantes ;
- contexte d’utilisation ;
- prix ;
- propriété ;
- CTA `ACHETER` ou `ÉQUIPER`.

### Achat

Confirmation native store. Le CTA reste stable pendant le traitement.

---

## E74 — Premium

**Route :** `/premium`

### Contenu

- aperçu analytics ;
- titre `GRYD Premium` ;
- promesse : comprendre et planifier ;
- trois bénéfices maximum ;
- annuel pré-sélectionné si économiquement pertinent ;
- mensuel ;
- CTA essai ;
- restauration ;
- conditions.

### Prix

Les valeurs visibles dans les planches, `39,99 € / an` et `4,99 € / mois`, sont des valeurs de configuration, jamais codées en dur. Le store et la remote config sont sources de vérité.

### Règles

- Premium n’améliore jamais la capacité de capture ;
- pas de faux compte à rebours ;
- essai et renouvellement explicités.

---

## E75 — Gestion d’abonnement et achats

### Contenu

- statut ;
- prochaine échéance ;
- gérer dans le store ;
- restaurer ;
- historique minimal ;
- support.

---

## K. Profil, confidentialité et réglages

## E76 — Modifier le profil

### Contenu

- aperçu ;
- nom ;
- handle ;
- ville ;
- bio ;
- afficher le crew ;
- visibilité du profil.

### Règle

Les réglages de localisation restent dans Confidentialité, pas ici.

---

## E77 — Confidentialité et sécurité

### Bloc confiance

`Votre position en direct n’est jamais visible par les autres joueurs.`

### Sections

#### Visibilité

- profil visible par ;
- nom sur territoires ;
- classement.

#### Zones protégées

- domicile ;
- travail ;
- autre zone ;
- rayon.

#### Sécurité

- délai de publication ;
- signaler ;
- notifications ;
- exporter ;
- supprimer.

### Règles

Chaque réglage explique sa conséquence. Les valeurs dangereuses sont impossibles, pas seulement déconseillées.

---

## E78 — Connexions et appareils

### Contenu

- Apple Health ;
- Google Health Connect ;
- Strava ;
- Garmin ;
- Whoop ;
- montre ;
- autorisations capteurs.

### États

- connecté ;
- expiré ;
- synchronisation ;
- données importées ;
- déconnexion.

### Règle de jeu

Une activité importée peut alimenter les stats sportives, mais ne produit un territoire que si les données nécessaires à l’intégrité sont présentes et validées.

---

## E79 — Compte, aide et légal

### Sections

- langue ;
- accessibilité ;
- centre d’aide ;
- règles du jeu ;
- anti-triche ;
- conditions ;
- confidentialité ;
- export ;
- suppression ;
- déconnexion.

---

# 7. Écrans système transversaux

Ces états ne reçoivent pas d’identifiant de navigation principal, mais doivent être implémentés.

## S01 — Chargement squelette

- structure identique à l’écran final ;
- aucun spinner plein écran sauf E00 ;
- pas de saut de layout.

## S02 — Hors ligne

- bandeau persistant discret ;
- données cache ;
- activités enregistrées localement ;
- mutations en file ;
- statut de synchronisation visible.

## S03 — Erreur récupérable

- fait ;
- action ;
- retry ;
- journal technique non exposé.

## S04 — Maintenance

- état du service ;
- ce qui reste disponible ;
- aucun faux horaire de retour.

## S05 — Mise à jour obligatoire

- raison ;
- store ;
- pas de fermeture.

## S06 — Permission refusée

- bénéfice ;
- chemin vers réglages ;
- alternative lecture seule.

## S07 — Contenu supprimé

- explication ;
- retour sûr ;
- pas d’écran blanc.

## S08 — Action réussie

Toast de 2 à 3 secondes, sauf récompense majeure.

## S09 — Confirmation destructive

Feuille basse avec intitulé précis, conséquence et bouton rouge/orange.

## S10 — Limite atteinte

Expliquer la limite et la prochaine action, sans dark pattern Premium.

---

# 8. Logique de capture

## 8.1 Pipeline

```text
points bruts
→ nettoyage temporel
→ contrôle précision
→ détection pauses
→ map matching prudent
→ détection fermeture
→ création polygone
→ correction auto-intersections
→ exclusions géographiques
→ calcul surface
→ anti-triche
→ règle de propriété
→ événement de jeu
```

## 8.2 Fermeture

Constantes serveur configurables :

```text
MIN_ACTIVITY_DISTANCE_RUN = 800 m
MIN_ACTIVITY_DISTANCE_BIKE = 2 000 m
MIN_POLYGON_AREA = 5 000 m²
MAX_CLOSURE_DISTANCE = max(35 m, 2.5 × précision GPS médiane)
MIN_ACTIVE_DURATION_RUN = 5 min
MIN_ACTIVE_DURATION_BIKE = 6 min
```

Ces valeurs sont des paramètres, pas des constantes dispersées dans le client.

Une boucle est candidate lorsque :

- la distance minimale est atteinte ;
- l’extrémité rejoint le corridor de départ ;
- la géométrie forme une surface exploitable ;
- la précision est suffisante ;
- la zone n’est pas majoritairement exclue.

## 8.3 Auto-intersections

- extraire les anneaux valides ;
- retenir l’anneau conforme à l’objectif et à la trace ;
- ne pas créer plusieurs captures opportunistes dans une même sortie sans règle explicite ;
- afficher le résultat calculé, pas une interprétation client.

## 8.4 Territoire personnel et crew

Une boucle valide attribue d’abord le résultat selon le contexte :

- joueur sans crew : personnel ;
- joueur avec crew et mission crew active : crew ;
- joueur avec crew sans mission : contribution personnelle comptée dans le contexte crew selon les règles de saison ;
- la propriété visible doit être claire avant le départ.

## 8.5 Frontière collective

Le serveur peut fusionner des segments de plusieurs membres si :

- ils appartiennent au même crew au moment de la contribution ;
- ils sont du même mode ;
- leurs extrémités sont compatibles ;
- les contributions datent de moins de 72 h ;
- la frontière finale est fermée ;
- l’aire est éligible ;
- aucun segment invalidé n’est nécessaire à la fermeture.

Contribution individuelle :

```text
contribution = longueur de frontière utile apportée / longueur totale finale
```

Une sortie ne peut pas être comptée deux fois dans deux frontières incompatibles.

## 8.6 Recouvrement

Lorsqu’un nouveau polygone recouvre un territoire :

- calculer intersection et ratio ;
- conserver la topologie ;
- éviter les fragments minuscules ;
- appliquer un seuil minimal de reprise ;
- produire un événement explicable.

Les seuils exacts sont versionnés côté serveur.

---

# 9. Logique de contestation et défense

## 9.1 Déclenchement

Une zone devient contestée lorsqu’une boucle rivale valide couvre le seuil de surface ou ferme une frontière compatible avec la zone.

Valeur de départ recommandée :

```text
CONTEST_INTERSECTION_THRESHOLD = 60 %
BASE_DEFENSE_WINDOW = 18 h
```

## 9.2 Fortification

Niveaux discrets, visibles par un bouclier simple :

- niveau 0 : 18 h ;
- niveau 1 : 24 h ;
- niveau 2 : 30 h ;
- niveau 3 : 36 h.

Le niveau dépend des défenses récentes et décroît avec le temps. Il n’est jamais achetable.

## 9.3 Défense réussie

Une défense est valide si :

- activité du propriétaire ou du crew propriétaire ;
- boucle fermée ;
- intersection suffisante avec la zone contestée ;
- activité terminée avant échéance ;
- validation anti-triche.

## 9.4 Échec

À l’échéance :

- si défense valide : propriété conservée ;
- sinon : transfert ;
- notification factuelle ;
- historique préservé ;
- possibilité de reprise future.

---

# 10. Classements et saisons

## 10.1 Métrique principale

Surface contrôlée validée dans le contexte choisi.

## 10.2 Tie-breakers

1. surface ;
2. nombre de défenses réussies ;
3. surface conquise sur la période ;
4. timestamp du snapshot précédent.

## 10.3 Snapshots

- classement hebdomadaire ;
- saison ;
- local ;
- quartier ;
- ville ;
- amis ;
- crews.

Les classements ne sont pas recalculés entièrement dans le client.

## 10.4 Rangs

Exemple de structure configurable :

```text
Bronze III → Bronze II → Bronze I
Argent III → Argent II → Argent I
Or III → Or II → Or I
Titane III → Titane II → Titane I
Élite locale
```

Les noms, seuils et récompenses viennent du serveur.

## 10.5 XP

L’XP récompense :

- activité valide ;
- capture ;
- défense ;
- contribution crew ;
- régularité ;
- mission.

Elle ne modifie jamais la puissance territoriale.

---

# 11. Anti-triche

## 11.1 Signaux

- vitesse instantanée et soutenue ;
- accélération ;
- précision GPS ;
- sauts géographiques ;
- cadence si disponible ;
- inertie ;
- gyroscope ;
- baromètre ;
- cohérence du parcours ;
- pauses ;
- origine de l’activité ;
- duplications ;
- altérations de fichier ;
- appareil compromis si signal légalement exploitable.

## 11.2 Seuils de pré-filtrage

Paramètres serveur, non exposés comme règles de contournement.

Exemples de garde-fous :

- Run : vitesse irréaliste soutenue ;
- Bike : vitesse incompatible avec le parcours et les capteurs ;
- saut GPS ;
- ratio distance/temps incohérent ;
- trace identique réutilisée.

## 11.3 Décisions

```text
PASS
PASS_WITH_EXCLUSIONS
MANUAL_REVIEW
REJECT
```

Le système ne bannit pas automatiquement sur un signal unique faible.

## 11.4 Appel

- motif ;
- données concernées ;
- bouton d’appel ;
- délai ;
- statut ;
- décision finale.

---

# 12. Confidentialité géospatiale

## 12.1 Masquage

- couper au moins 250 m autour du départ et de l’arrivée publics ;
- appliquer les zones floutées ;
- simplifier les contours ;
- retarder la publication ;
- supprimer les timestamps détaillés.

## 12.2 Partage crew

Opt-in par activité :

- durée limitée ;
- précision réduite ;
- visible uniquement par participants ou crew autorisé ;
- désactivation instantanée ;
- aucun historique de position partagé après la sortie.

## 12.3 Rendus publics

Un territoire public est une géométrie dérivée. Il ne doit pas permettre de reconstruire le trajet privé exact.

---

# 13. Notifications

## 13.1 Urgentes

- territoire contesté ;
- défense expirant bientôt ;
- activité interrompue nécessitant récupération ;
- sécurité du compte.

## 13.2 Non urgentes

- crew ;
- rivalité ;
- badge ;
- saison ;
- résumé.

## 13.3 Deep links

Chaque notification ouvre l’écran exact et jamais la home générique.

## 13.4 Déduplication

Une même contestation ne produit pas plusieurs alertes identiques. Les rappels sont limités et regroupés.

---

# 14. Partage social

## 14.1 Formats

- 9:16 ;
- 4:5 ;
- 1:1 ;
- sticker transparent ;
- replay vidéo court.

## 14.2 Contenu

- une statistique héro ;
- une carte simplifiée ;
- une phrase ;
- marque GRYD discrète ;
- aucune donnée sensible.

## 14.3 Export

Le rendu est calculé serveur ou par moteur graphique déterministe. Il ne dépend pas d’une capture d’écran arbitraire.

---

# 15. Accessibilité

- contraste AA minimum pour le texte ;
- VoiceOver/TalkBack sur toutes les actions ;
- ordre de focus logique ;
- labels qui décrivent l’action et l’état ;
- alternatives aux codes couleur ;
- Reduce Motion ;
- taille de texte dynamique jusqu’à 130 % sans rupture ;
- cartes accompagnées d’un résumé textuel ;
- boutons 44 × 44 minimum ;
- retour haptique facultatif ;
- pas d’information critique uniquement dans une animation.

---

# 16. Localisation

Langues prioritaires :

- français ;
- anglais ;
- espagnol.

Règles :

- aucune chaîne codée en dur ;
- unités locales ;
- kilomètres et km² par défaut en France ;
- pluralisation ;
- dates relatives ;
- textes extensibles de 30 % ;
- CTA courts ;
- le nom des zones géographiques n’est pas traduit artificiellement.

---

# 17. Performance et résilience

## 17.1 Carte

- clustering ;
- tuiles ;
- simplification ;
- cache ;
- rendu progressif ;
- limite du nombre de polygones détaillés ;
- calcul géométrique lourd côté serveur ou worker.

## 17.2 Activité

- persistance locale fréquente ;
- file d’upload ;
- compression ;
- reprise ;
- idempotence ;
- batterie surveillée ;
- mode écran éteint via capacité native.

## 17.3 PWA et natif

Une PWA seule ne doit pas prétendre offrir un suivi arrière-plan fiable identique à une application native sur iOS. L’architecture doit isoler :

```text
TrackingEngine interface
├── NativeTrackingAdapter
├── CapacitorAdapter
└── WebForegroundAdapter
```

Le WebForegroundAdapter est un fallback, pas la promesse finale du tracking compétitif.

---

# 18. Analytics produit

## 18.1 Événements minimum

```text
onboarding_started
onboarding_completed
auth_started
auth_completed
permission_prompted
permission_granted
map_view
activity_prepare_view
activity_started
activity_paused
activity_recovered
activity_finished
activity_validated
activity_reviewed
loop_closed
territory_captured
territory_contested
territory_defended
territory_lost
crew_discovered
crew_join_requested
crew_created
crew_mission_joined
leaderboard_view
profile_view
share_composer_view
share_exported
premium_view
trial_started
purchase_completed
privacy_setting_changed
report_submitted
```

## 18.2 Propriétés

- mode ;
- ville agrégée ;
- source ;
- statut ;
- latence ;
- raison de sortie ;
- version d’algorithme ;
- jamais de coordonnées précises dans l’analytics généraliste.

## 18.3 Funnels

1. installation → onboarding → compte → permission → première activité ;
2. activité → boucle → validation → partage ;
3. crew découverte → demande → contribution ;
4. menace → notification → défense ;
5. premium vu → essai → rétention.

---

# 19. Modèle de données indicatif

## 19.1 `activities`

```ts
type Activity = {
  id: string
  userId: string
  crewId?: string
  mode: 'RUN' | 'BIKE'
  objectiveRecommended: 'CONQUER' | 'DEFEND'
  objectiveSelected?: 'CONQUER' | 'DEFEND'
  status: ActivityStatus
  startedAt: string
  endedAt?: string
  distanceMeters: number
  activeDurationSeconds: number
  averageSpeedMps?: number
  gpsMedianAccuracyM?: number
  trackStorageKey: string
  algorithmVersion: string
  antiCheatStatus: 'PASS' | 'EXCLUSIONS' | 'REVIEW' | 'REJECT'
  resultType?: 'CAPTURE' | 'RECAPTURE' | 'DEFENSE' | 'CREW_CONTRIBUTION' | 'FREE'
}
```

## 19.2 `territories`

```ts
type Territory = {
  id: string
  mode: 'RUN' | 'BIKE'
  ownerType: 'USER' | 'CREW'
  ownerId: string
  geometryStorageKey: string
  generalizedGeometryStorageKey: string
  areaM2: number
  cityId: string
  districtId?: string
  state: TerritoryState
  defenseLevel: 0 | 1 | 2 | 3
  controlledSince: string
  publishAfter: string
  algorithmVersion: string
}
```

## 19.3 `contests`

```ts
type TerritoryContest = {
  id: string
  territoryId: string
  attackerType: 'USER' | 'CREW'
  attackerId: string
  sourceActivityId: string
  overlapRatio: number
  startedAt: string
  expiresAt: string
  status: 'ACTIVE' | 'DEFENDED' | 'TRANSFERRED' | 'CANCELLED'
}
```

---

# 20. Contrats API minimaux

```text
POST   /auth/session
GET    /me
PATCH  /me
GET    /map/tiles
GET    /map/context
GET    /territories/:id
POST   /activities
POST   /activities/:id/points
POST   /activities/:id/pause
POST   /activities/:id/resume
POST   /activities/:id/finish
GET    /activities/:id/status
GET    /activities
GET    /activities/:id
POST   /activities/:id/appeal
GET    /missions/recommended
GET    /crews/discover
POST   /crews
GET    /crews/:id
POST   /crews/:id/join
GET    /crews/:id/missions
POST   /crews/:id/missions/:id/join
GET    /leaderboards
GET    /seasons/current
GET    /badges
GET    /notifications
PATCH  /notifications/read
GET    /shop
POST   /share-artifacts
GET    /subscriptions
PATCH  /privacy
POST   /reports
```

Les endpoints précis peuvent suivre la convention du dépôt existant. Les invariants métier doivent rester.

---

# 21. Matrice de priorités

## P0 — boucle jouable

- E00 à E11 ;
- E14 ;
- E17 ;
- E19 à E32 ;
- E55 ;
- E67 ;
- E69 à E71 ;
- E77 ;
- états système ;
- tracking ;
- géométrie ;
- anti-triche ;
- confidentialité ;
- analytics fondamentaux.

## P1 — rétention et social

- crews E38 à E52 ;
- classements E53–E58 ;
- saison E59–E64 ;
- partage E35–E37 ;
- stats E65–E68.

## P2 — monétisation et profondeur

- boutique E72–E73 ;
- Premium E74–E75 ;
- planificateur avancé ;
- intégrations ;
- replay.

---

# 22. Critères de qualité UI

Un écran est refusé si :

- il contient plus d’une action principale ;
- un texte est tronqué en français ;
- il nécessite un scroll pour trouver l’action principale alors que celle-ci peut être sticky ;
- il imbrique trois cartes ;
- il utilise une couleur sans signification ;
- il montre un spinner sans progression réelle ;
- il expose un réglage technique dans le parcours principal ;
- il mélange Run et Bike ;
- il montre une position live d’un tiers ;
- il rend le Premium pay-to-win ;
- il utilise de fausses données en production ;
- il ne gère pas le vide, l’erreur et le hors ligne.

---

# 23. Critères de qualité technique

Une fonctionnalité est terminée seulement si :

- UI connectée aux données réelles ;
- schéma et migration ;
- permissions ;
- validation serveur ;
- cache et hors ligne si pertinent ;
- erreurs ;
- loading ;
- analytics ;
- accessibilité ;
- tests unitaires ;
- tests intégration ;
- test E2E principal ;
- logs et monitoring ;
- aucun secret dans le client ;
- aucune donnée de démonstration dans le flux réel ;
- aucune fonction critique laissée en TODO silencieux.

---

# 24. Ordre d’implémentation recommandé

## Phase 1 — Audit

- cartographier le dépôt ;
- identifier stack, routes, composants, stores, API, tables et services ;
- établir une matrice `existant / partiel / absent / à supprimer` ;
- confirmer les capacités réelles de tracking.

## Phase 2 — Fondations

- tokens ;
- navigation ;
- composants globaux ;
- modèles ;
- événements ;
- migrations ;
- feature flags ;
- i18n ;
- analytics.

## Phase 3 — Boucle centrale

- carte ;
- préparation ;
- tracking ;
- récupération ;
- fin ;
- traitement ;
- résultats ;
- historique ;
- confidentialité.

## Phase 4 — Jeu territorial

- capture ;
- reprise ;
- contestation ;
- défense ;
- missions ;
- notifications ;
- classement.

## Phase 5 — Crews

- découverte ;
- création ;
- adhésion ;
- missions ;
- membres ;
- contributions ;
- stats.

## Phase 6 — Progression et partage

- saisons ;
- rangs ;
- badges ;
- compositeur ;
- profils publics.

## Phase 7 — Monétisation

- Premium ;
- boutique ;
- achats ;
- restauration ;
- garde-fous.

## Phase 8 — Durcissement

- anti-triche ;
- charge ;
- erreurs ;
- accessibilité ;
- sécurité ;
- tests appareils ;
- observabilité.

---

# 25. Scénarios E2E obligatoires

## Scénario 1 — Premier lancement

Installation → onboarding → Apple/Google → profil minimal → localisation → carte → préparer → démarrer.

## Scénario 2 — Capture

Départ → activité → fermeture → fin → analyse → zone conquise → carte mise à jour → historique.

## Scénario 3 — App tuée

Activité active → app tuée → relance → récupération → suite → résultat sans perte.

## Scénario 4 — Hors ligne

Activité sans réseau → fin → stockage local → retour réseau → upload idempotent → résultat.

## Scénario 5 — Défense

Notification → zone contestée → défendre → activité → validation → propriété conservée.

## Scénario 6 — Revue

Activité incohérente → revue → historique visible → décision → appel.

## Scénario 7 — Crew

Découverte → demande → acceptation → mission → contribution → progression collective.

## Scénario 8 — Confidentialité

Créer zone floutée → activité près du domicile → export → vérification absence de données sensibles.

## Scénario 9 — Run/Bike

Basculer Bike → carte, classement, stats, historique Bike → retour Run → données inchangées et séparées.

## Scénario 10 — Achat

Aperçu cosmétique → achat store → restauration → équipement → aucun impact de capacité.

---

# 26. Prompt maître d’implémentation

Le bloc suivant peut être donné à Claude Code, Cursor ou un agent de développement avec ce fichier.

```text
Tu es le lead engineer et product engineer de GRYD. Tu dois transformer le dépôt existant en produit fonctionnel conforme au fichier « GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md ».

OBJECTIF
Implémenter la totalité du produit décrit, directement branchée aux données et services réels. Le résultat ne doit pas être une maquette, un prototype statique, un mode démo ou un ensemble d’écrans non connectés.

RÈGLES ABSOLUES
1. Lis entièrement la spécification avant de modifier le code.
2. Audite le dépôt, la stack, les routes, le backend, les tables, les composants, le tracking, l’authentification et les intégrations existantes.
3. Ne réécris pas ce qui fonctionne sans raison démontrée.
4. Ne crée aucune fausse API, fausse réservation, faux utilisateur, faux territoire ou donnée codée en dur dans le parcours de production.
5. Toute donnée d’exemple doit être confinée aux tests, Storybook ou fixtures explicitement isolées.
6. Aucune fonctionnalité ne doit afficher un bouton inactif sans explication.
7. Aucun TODO ne doit masquer une fonctionnalité critique.
8. Conserve exactement trois onglets principaux : Carte, Crew, Profil.
9. Sépare strictement Run et Bike dans les données, cartes, classements, saisons, historiques et statistiques.
10. N’utilise jamais d’hexagones.
11. Ne rends jamais la position exacte en direct d’un joueur visible par les autres.
12. Applique le masquage de départ/arrivée, les zones floutées et le délai de publication.
13. Aucun achat ne donne un avantage de capture, défense ou classement.
14. Toute mutation critique doit être idempotente côté serveur.
15. Le serveur est autoritaire pour la géométrie, la propriété, l’anti-triche, les rangs et les récompenses.
16. Le client doit résister à une coupure réseau, une fermeture de l’app et une reprise.
17. Si la stack est une PWA, ne simule pas un tracking arrière-plan iOS fiable. Implémente une interface d’adaptateurs et documente le besoin d’un bridge natif.
18. Respecte l’accessibilité, Reduce Motion et les zones tactiles minimales.
19. Toutes les chaînes passent par l’i18n FR/EN/ES.
20. Les prix Store viennent du Store/remote config et ne sont jamais codés en dur.

MÉTHODE
A. Produis d’abord un fichier AUDIT_GRyd.md contenant :
- architecture actuelle ;
- fonctionnalités existantes ;
- écarts par écran E00–E79 ;
- dettes ;
- risques ;
- plan de migration ;
- ordre exact des changements.

B. Produis ensuite PLAN_IMPLEMENTATION_GRYD.md :
- lots ;
- dépendances ;
- migrations ;
- endpoints ;
- composants ;
- tests ;
- critères de validation ;
- rollback.

C. Implémente par vertical slices, dans cet ordre :
1. fondations de design, navigation, auth, setup ;
2. carte et modèle territorial ;
3. tracking, récupération, upload et traitement ;
4. capture, reprise, contestation et défense ;
5. résultat, historique, partage et confidentialité ;
6. notifications ;
7. crews ;
8. classements, saisons, rangs, badges ;
9. stats et analytics Premium ;
10. boutique et abonnement ;
11. réglages, connexions, aide et appel anti-triche ;
12. durcissement et observabilité.

POUR CHAQUE SLICE
- schéma/migration ;
- contrat API ;
- logique serveur ;
- store client ;
- UI ;
- états loading/vide/erreur/hors ligne ;
- analytics ;
- accessibilité ;
- tests unitaires ;
- tests intégration ;
- test E2E ;
- documentation.

UI
- utilise les tokens du fichier ;
- marge 16 ;
- CTA principal 56 ;
- une seule action principale ;
- header et barre basse conformes ;
- pas de rectangles imbriqués inutilement ;
- pas de dashboard SaaS décoratif ;
- la carte reste le cœur ;
- les informations critiques sont visibles sans scroll lorsque possible ;
- les boutons importants sont sticky ;
- les textes français ne doivent pas être tronqués ;
- les états et couleurs gardent leur signification.

LOGIQUE TERRITORIALE
- implémente le pipeline de trace décrit ;
- garde les seuils en configuration serveur versionnée ;
- ne calcule pas la propriété définitive dans le client ;
- enregistre la version de l’algorithme ;
- gère les auto-intersections, exclusions, recouvrements et fragments ;
- gère les contributions de crew et la fermeture collective ;
- gère la contestation, l’échéance, la fortification et le transfert ;
- produit des événements métier idempotents.

TRACKING
- persistence locale fréquente ;
- points horodatés avec précision ;
- pause/reprise ;
- file d’attente ;
- chiffrement ou protection adaptée ;
- récupération après crash ;
- upload chunké ;
- déduplication ;
- statut visible ;
- consommation batterie mesurée.

ANTI-TRICHE
- scoring multi-signal ;
- PASS / EXCLUSIONS / REVIEW / REJECT ;
- aucun bannissement automatique sur un signal faible isolé ;
- écran de revue et appel ;
- logs d’audit.

CONFIDENTIALITÉ
- aucune coordonnée précise dans les analytics généralistes ;
- masquage public ;
- zones protégées ;
- publication différée ;
- partage crew opt-in et temporaire ;
- profil rival sans position ni trace privée.

SORTIE ATTENDUE
À la fin :
1. donne la liste des fichiers modifiés ;
2. donne les migrations appliquées ;
3. donne les endpoints créés ou modifiés ;
4. donne les écrans E00–E79 terminés, partiels ou bloqués ;
5. donne les tests exécutés et leurs résultats ;
6. donne les risques restants ;
7. donne les étapes exactes de déploiement ;
8. donne les variables d’environnement requises ;
9. donne une checklist App Store / Play Store / PWA ;
10. n’affirme jamais qu’un élément est terminé s’il repose encore sur une fixture ou une simulation.

ARBITRAGE
Lorsque plusieurs solutions sont possibles, choisis celle qui :
1. réduit la friction utilisateur ;
2. protège la fiabilité du tracking ;
3. protège la confidentialité ;
4. garde la logique côté serveur ;
5. minimise la dette ;
6. permet un déploiement progressif.

Ne demande une décision que si elle bloque réellement une règle métier ou une intégration externe. Pour les détails d’implémentation ordinaires, tranche, documente et avance.
```

---

# 27. Résultat attendu pour l’utilisateur

L’expérience finale doit se résumer ainsi :

- il ouvre GRYD ;
- il voit sa ville et l’action prioritaire ;
- il appuie une fois ;
- il court ou roule ;
- GRYD enregistre sans perdre la sortie ;
- GRYD comprend si la boucle conquiert, reprend, défend ou contribue ;
- GRYD protège les lieux sensibles ;
- GRYD raconte le résultat ;
- GRYD met à jour la carte, le crew, le classement, la saison et l’historique ;
- l’utilisateur n’a pas eu à gérer les calculs.

La complexité appartient au système, pas au joueur.
