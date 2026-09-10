# GRYD — Journal et détail de sortie (audit + chantier du 10/09/2026)

Ce document répond à une question du fondateur : « Où s'affichent les différents runs ?
Dans le journal ? À quoi ressemble le journal avec des runs dedans ? Comment revoit-on un
run passé ? Quelles informations sont visibles ? Est-ce qu'on a des graphiques ? »

Il est en deux parties : **ce qui existait** (écran par écran, avec fichier et ligne), puis
**ce qui a été construit** ce jour-là. Tout ce qui suit a été lu dans le code, pas supposé.
Rang 0 applicable : `docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`, chapitres **G12**
(résultat d'une sortie), **G13** (détail d'activité), **G22** (profil et journal),
**G25** (statistiques sportives) et **§8.2** (matrice sportive).

---

## 0. Les réponses, une phrase chacune

| Question | Réponse | Preuve |
|---|---|---|
| Où s'affichent les runs ? | À trois endroits : le **journal du Profil** (`/(tabs)/profil`), l'**historique** (`/historique`, atteint depuis la carte) et les **statistiques** (`/performance`). | `ProfileHomeScreen.tsx:250-286` · `app/historique.tsx:250-262` · `app/performance.tsx:1` |
| À quoi ressemble le journal avec des runs dedans ? | Une liste de lignes qui portent désormais la vignette du tracé, la date, la discipline, la distance, la durée, l'allure (ou la vitesse), le terrain gagné et l'état ; avant ce chantier, une ligne ne montrait que la date, les kilomètres et les minutes. | `src/features/journal/JournalSection2026.tsx:80-166` |
| Comment revoit-on un run passé ? | En tapant sa ligne : une sortie serveur ouvre `/course/[id]`, une sortie encore locale ouvre `/course-result` avec son `localId` ; les deux montrent maintenant les mêmes blocs. | `ProfileHomeScreen.tsx:64` · `RealRunCard.tsx:166` |
| Quelles informations sont visibles ? | Carte du tracé, distance, durée, allure ou vitesse, temps en mouvement et temps écoulé, splits au kilomètre, courbe d'allure, dénivelé si une source existe, territoire décidé par le serveur, verdict d'enregistrement, partage. | `app/course/[id].tsx:387-529` · `src/features/journal/RunAnalysisBlocks2026.tsx` |
| Est-ce qu'on a des graphiques ? | Oui, depuis ce chantier : courbe d'allure et profil d'altitude sur le détail, histogramme par jour et par semaine plus courbe d'allure par sortie sur les statistiques, tous en SVG (`react-native-svg`, déjà embarqué). | `src/ui/charts/{LineChart,BarChart}.tsx` · `ProfileStatsScreen.tsx:130-190` |
| Fallait-il le mettre en place ? | Oui : le détail d'une sortie n'avait ni carte ni graphique, et il **affirmait** qu'aucun tracé n'existait alors que le serveur en garde deux formes depuis juillet. | `runDetail.ts` (avant : `runTraceState()` rendait `'not-archived'` en dur) |

---

## 1. Ce que le serveur garde réellement d'une sortie

C'est le point de départ, parce que trois écrans disaient le contraire.

| Colonne de `runs` | Écrite par | Contenu | Lisible par le joueur |
|---|---|---|---|
| `distance_m`, `duration_s`, `avg_pace_s_km` | `ingest_run` | mesures de la sortie | oui (`runs_select_own`, `0003_rls.sql:107`) |
| `status`, `reject_reason` | `ingest_run` | verdict d'enregistrement | oui |
| `points_awarded`, `xp_awarded` | `ingest_run` | `not null default 0` | oui |
| `celebration` (jsonb) | `ingest_run` | le reçu complet, dont `territory2026` (surfaces) | oui |
| **`polyline_masked`** | `ingest_run/index.ts:3146` | trace **expurgée** : extrémités coupées de `SHARE_TRIM_M`, zones privées retirées, simplifiée à 15 m ; **purgée à 90 jours** (`0101`) | oui |
| **`trace_points_2026`** (jsonb) | `ingest_run/refonte2026.ts:167` | les points **complets** de la sortie : `lat`, `lng`, `t` (epoch ms), `acc` | oui |
| `polyline_hash` | `ingest_run` | SHA-256, irréversible (anti-triche) | sans intérêt d'affichage |

**Ce que le serveur ne garde pas, et que rien ne doit inventer** : altitude, fréquence
cardiaque, puissance, cadence, calories, météo, nom de commune. `RunPoint`
(`packages/shared/src/types.ts:75`) porte `lat`, `lng`, `t`, `acc` et rien d'autre ; aucune
migration ne stocke de météo ; aucune colonne ne porte de commune pour une sortie.

**Le mensonge qui a été corrigé.** Trois fichiers affirmaient « GRYD n'archive aucun
tracé », en citant `ingest_run/anticheat_wiring.ts:178` — un commentaire du serveur de
juillet, exact à l'époque, faux depuis le chantier `tracePersist.ts`. Conséquence en
chaîne : pas de carte, pas de splits, pas de courbe, pas de partage rétroactif, et un test
qui verrouillait l'absence (`runDetail.test.ts`) avec ce commentaire : « si un jour
`ingest_run` écrit `polyline_masked`, ce test échoue : c'est exactement ce qu'on veut. »
Il a échoué. Ce chantier est sa réponse.

---

## 2. Écran par écran, avant ce chantier

### 2.1 Profil › Journal (`/(tabs)/profil`)

**Affiché** : titre « Journal » ; filtre Course / Vélo ; calendrier de 7 jours avec une
pastille les jours où une sortie existe ; deux périodes (« Ce mois » / « Journal récent ») ;
trois compteurs (km · min · sorties) ; un lien « Détails des statistiques » vers
`/performance` ; puis 3 lignes de sortie (dépliables), chacune portant : une vignette de
tracé **pour les sorties locales uniquement**, la date, la distance, les minutes, et
« À synchroniser » si la sortie n'est pas partie.

**Provenance** : `useProfileJournal(activity)` fusionne la lecture serveur
(`history/real.ts`, table `runs`, filtrée par discipline, 200 lignes max) et les sorties
locales (`localActivities`), en dédoublonnant par `clientRunId` / `runId`.

**Quatre états** : tenus (`ProfileHomeScreen.tsx:266-269`) — chargement, échec avec
« Réessayer », vide (« Aucune sortie enregistrée »), lu.

**Ce qui manquait** : l'allure, le terrain gagné, le verdict serveur — les trois étaient
**déjà lus** par `history/real.ts`, personne ne les remontait jusqu'à la ligne. Deux sorties
de 5 km se ressemblaient trait pour trait, et une sortie qui avait pris du terrain se
lisait comme une sortie sans capture.

### 2.2 Historique (`/historique`)

**Affiché** : commutateur Course / Vélo ; un bandeau de synthèse (sorties · distance ·
captures · défenses) ; les sorties groupées par semaine ; chaque ligne (`RealRunCard`) porte
une tuile de type colorée par rôle, le type (Capture / Reprise / Défense / Course libre),
l'impact dominant, l'effort (distance · durée · allure) et une pastille GRYD Verify.

**Quatre états** : tenus, et distincts (`app/historique.tsx:191-243`), y compris « pas de
backend » qui n'affiche **pas** de bouton « Se connecter ».

**Le défaut trouvé** : le type et l'impact d'une ligne étaient dérivés des **cellules H3**
(`celebration.hexes`). Or `ingest_run/refonte2026.ts` écrit `hexes.claimed/stolen/defended`
**à zéro** pour toute sortie de septembre et met le vrai résultat dans le reçu
`territory2026`. Toute sortie de septembre s'affichait donc « Course libre », en gris, sans
un chiffre — y compris celles qui avaient pris du terrain — et le bandeau annonçait
« 0 capture ». Le détail avait été corrigé le 10/09 ; la ligne, non.

### 2.3 Détail d'une sortie (`/course/[id]`)

**Affiché** : titre, date et heure de départ, kicker de discipline ; un bandeau (type +
impact dominant + pastille de verdict) ; **Effort** (distance · durée · allure, chacune
disparaissant si elle n'est pas mesurée) ; **Impact territorial** (surfaces du reçu 2026 ou
compteurs de cellules du monde d'août, plus Points et XP) ; **Ce que GRYD a retenu**
(explication d'une invalidation) ; puis, en gris, deux phrases : « Pas de carte ici : GRYD
ne conserve pas le tracé d'une sortie passée » et « Le partage rétroactif attend ce tracé ».

**Cinq états** : tenus et documentés (chargement, pas connecté, sans backend, échec, pas
dans ton historique, lu) — `app/course/[id].tsx:530-580`.

**Ce qui manquait** : tout ce qui fait un détail de sortie ailleurs — la carte, les splits,
la courbe, le dénivelé, le partage. Les deux phrases grises étaient devenues fausses.

### 2.4 Fin de sortie (`/course-result` → `RunResult.tsx`)

**Affiché** : une vraie carte MapLibre du tracé mesuré (segments séparés, ruptures
préservées) ; trois mesures (distance · durée · allure ou vitesse) ; une phrase de terrain
issue du reçu serveur (`captureExplanation2026`) ; « Surface publiée à la capture » et
« Encore possédé » ; XP ; « Partager » ; « Détails de la sortie » (surface de boucle,
nouveau terrain, déjà possédé) ; lien vers le journal.

**Ce qui manquait** : aucun split, aucune courbe — alors que les points **horodatés** de la
sortie sont juste là, dans `uploadPayload.points` (écrit par `tracker.buildPayload()`).

### 2.5 Statistiques (`/performance` → `ProfileStatsScreen.tsx`)

**Affiché** : sport (Course / Vélo) ; période (7 / 28 jours) ; distance totale ; trois
compteurs (min · sorties · jours avec sortie) ; un histogramme « Distance par jour » ; un
sélecteur jour précédent / jour suivant ; trois avertissements honnêtes (mesures locales à
synchroniser, journal en ligne indisponible, sorties locales illisibles).

**Ce qui manquait** : l'**évolution**, que G25 demande explicitement (« sous ce résumé,
évolution lisible »). Sur 7 ou 28 jours on voit ses dernières séances, pas sa trajectoire.
Et la géométrie des barres vivait dans le JSX (`day.km / chartMax * 112`), donc hors de
portée de tout test : une journée à 0,3 km dessinait presque un tiers du graphique, et un
jour sans sortie disparaissait de l'axe au lieu de se lire « rien ce jour-là ».

---

## 3. L'écart avec Strava et INTVL, mesuré

| Élément | Strava / INTVL | GRYD avant | GRYD après |
|---|---|---|---|
| Carte du tracé sur une sortie passée | oui | **non** (« GRYD ne conserve pas le tracé ») | **oui** (SVG, tracé réel, ruptures préservées) |
| Allure moyenne | oui | oui | oui |
| Splits au kilomètre | oui | **non** | **oui**, avec le meilleur km surligné et le dernier marqué partiel |
| Courbe d'allure | oui | **non** | **oui**, lissée sur 200 m, axe = distance |
| Profil de dénivelé | oui | **non** | **le calcul existe et est testé ; le bloc ne s'affichera que le jour où une source d'altitude existera** |
| Vitesse pour le vélo | oui | oui (`effortRate`) | oui, partout, y compris sur les splits et l'axe de la courbe |
| Fréquence cardiaque | oui (si capteur) | non | **non** — aucune source ; rien n'est peint |
| Calories | oui | non | **non**, et c'est une décision : sans source, ce serait une estimation présentée comme une mesure (cahier §8.2) |
| Météo | oui | non | **non** — aucune migration ne la stocke ; vérifié |
| Territoire gagné | propre à GRYD | oui, sur le détail | oui, **et sur la ligne de journal et d'historique** |
| Partage d'une sortie passée | oui | **non** | **oui** : la sortie arme le studio de partage (`features/share`) |
| Temps écoulé ≠ temps en mouvement | oui | non | **oui**, quand les deux diffèrent |
| Nom du lieu | oui | non | **non** — aucune colonne ne porte de commune pour une sortie, et le déduire d'un point GPS serait une affirmation sur le terrain du joueur (règle déjà écrite dans `RealRunCard`) |

---

## 4. Ce qui a été construit

### 4.1 Les calculs, purs et testés

| Fichier | Rôle |
|---|---|
| `src/features/journal/metrics.ts` | splits au kilomètre (avec interpolation du temps à la borne), courbe d'allure lissée, dénivelé avec seuil anti-bruit, totaux, écart départ/arrivée |
| `src/features/journal/traceRead.ts` | lecture défensive des deux colonnes de trace, décimation d'affichage, découpage en segments |
| `src/features/journal/format.ts` | chronomètre, allure, vitesse, distances — une valeur non mesurée rend `null` |
| `src/features/journal/statsSeries.ts` | distance par semaine, allure par sortie, jours avec sortie |
| `src/ui/charts/chartGeometry.ts` | projection, échelle à base zéro, axe inversé explicite |

**La règle du serveur est respectée à la lettre.** `analyzeTrace2026`
(`packages/engine/src/capture2026.ts`) accumule distance et durée en sautant une paire de
points quand elle porte `breakBefore`, quand l'écart de temps est nul ou négatif, ou quand
il dépasse `pointMaxGapS`. `metrics.ts` applique exactement cette règle — c'est ce qui fait
que la somme des splits retombe sur `runs.distance_m` au lieu de produire un second total
qui la contredirait sous les yeux du joueur. Un test miroir relit la source du moteur et
échoue le jour où les deux divergeraient.

### 4.2 Le détail d'une sortie (`/course/[id]`)

Ordre de lecture : titre, date, discipline → **carte du tracé** → bandeau (type, impact,
verdict) → **Effort** → **temps en mouvement / temps écoulé** → **Splits** → **courbe
d'allure ou de vitesse** → **dénivelé** (si une source existe) → **Impact territorial** →
**Ce que GRYD a retenu** → **Partager**.

Trois régimes de trace, jamais confondus (`runTraceState`, testé) :

- **trace complète** (`trace_points_2026`) : carte, splits, courbe, temps en mouvement ;
- **trace masquée** (`polyline_masked`) : la carte, plus une phrase qui dit que les abords
  du départ et de l'arrivée sont retirés et que la trace s'efface au bout de 90 jours, plus
  une seconde qui dit qu'il n'y a ni split ni courbe faute d'horodatage ;
- **aucune trace** : « Tracé non disponible pour cette sortie. Ses mesures, elles, sont
  conservées. » Le bouton Partager disparaît, et la phrase le dit avant le tap.

### 4.3 La fin de sortie (`/course-result`)

Les **mêmes blocs**, sur la surface claire du cahier, alimentés par les points horodatés de
l'enregistrement (`uploadPayload.points`). Sans horodatage, la même phrase qu'ailleurs.
Une seule grammaire pour une même sortie, avant et après son envoi.

### 4.4 Le journal

`src/features/journal/JournalSection2026.tsx` — vignette du tracé quand cet appareil l'a,
date, discipline, distance, durée, allure ou vitesse, terrain gagné (jamais « 0 m² »),
« À synchroniser » ou verdict serveur quand il n'est pas « validée ». Tap → détail.

La section ne peint **ni** état vide **ni** erreur : ils appartiennent à l'écran hôte, seul
capable de distinguer « pas connecté », « en cours », « échec » et « lu, et rien ».

**Écart assumé** : pas de vignette pour les sorties **serveur** dans la liste. La lecture
porte jusqu'à 200 sorties ; y joindre chaque trace ferait descendre des centaines de
kilo-octets de géométrie pour peindre trois vignettes de 64 pt. La trace d'une sortie
serveur est lue à l'ouverture de son détail, là où elle sert.

### 4.5 Les statistiques

Deux graphiques ajoutés, tous deux en SVG et adossés à des séries pures :

- **Distance par semaine**, huit semaines, meilleure semaine en chartreuse. Une semaine
  sans sortie vaut 0 km et **garde sa place** : c'est ce qui rend une régularité visible ;
- **Allure (ou vitesse) moyenne par sortie**, vingt sorties au plus, la plus rapide en
  haut. Une sortie sans allure mesurée est **absente** de la courbe, jamais interpolée.

L'histogramme par jour existant passe sur la même géométrie testée : base zéro, et un jour
sans sortie garde une barre minimale visible.

---

## 5. Ce qui reste ouvert

1. **Altitude.** Aucune source. `expo-location` expose une altitude, `RunPoint` ne la
   transporte pas et `ingest_run` ne la stocke pas. Le jour où la chaîne la portera, le
   bloc de dénivelé s'affichera sans qu'une ligne d'écran change — le calcul et ses tests
   sont déjà là. Décision produit à prendre : l'altitude GPS d'un téléphone est bruitée de
   plusieurs mètres ; un baromètre ou un modèle de terrain donne un dénivelé plus juste.
2. **Rétention de `trace_points_2026`.** La purge de 90 jours (`0101`) ne vise que
   `polyline_masked`. Les points bruts, eux, restent. Ce n'est pas un défaut de cet écran,
   c'est une décision de vie privée à trancher côté serveur (hors périmètre de ce lot :
   `ingest_run/**` et les migrations n'y appartiennent pas).
3. **Nom de commune sur une sortie.** Demandé au bandeau du détail ; aucune colonne ne le
   porte. Le déduire du référentiel de villes le plus proche donnerait un toponyme faux dès
   la périphérie d'une agglomération. À ouvrir avec le serveur, ou pas du tout.
4. **`/historique` et le journal du Profil restent deux surfaces.** Elles disent maintenant
   les mêmes choses, dans deux châssis différents (sombre pour l'historique, clair pour le
   Profil). La fusion est un arbitrage de navigation, pas un correctif d'honnêteté.
5. **Aucun rendu réel n'a été vérifié** pour ce chantier : ni capture d'écran, ni appareil.
   Les preuves sont le typecheck, la suite de tests et les tests de couture qui lisent le
   source des écrans.
