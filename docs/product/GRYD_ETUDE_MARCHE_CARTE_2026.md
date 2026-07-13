# GRYD — Étude de marché UI/UX des cartes running et GPS en 2026

**Date de l’étude : 13 juillet 2026**  
**Objet :** déterminer ce que la carte GRYD doit afficher, comment le présenter sans pollution visuelle, et comment faire de la carte un état des lieux territorial compréhensible immédiatement.

---

# 1. Conclusion exécutive

La carte GRYD ne doit pas être un écran rempli de données de jeu.

Elle doit être un **état du monde actuel**, puis devenir un **outil d’action** lorsque l’utilisateur sélectionne une zone ou une mission.

Elle doit répondre en moins de trois secondes à cinq questions :

```txt
1. Où suis-je ?
2. Qui contrôle quoi ?
3. Quelle zone est en danger ou disponible ?
4. Quelle action est la plus utile maintenant ?
5. Où dois-je courir ?
```

La règle centrale issue des meilleures cartes 2026 :

```txt
Afficher l’état essentiel.
Révéler le détail au tap.
Changer le niveau d’information selon le zoom.
```

La carte GRYD doit utiliser :

- des territoires organiques, jamais une grille visible ;
- une hiérarchie stricte des couleurs ;
- des états de frontières, pas dix couleurs concurrentes ;
- une densité d’information liée au zoom ;
- une bottom sheet contextuelle ;
- une seule action recommandée ;
- une carte de contrôle par défaut ;
- un mode action lorsque le joueur veut courir ;
- un mode crew uniquement lorsque la coordination sociale est utile.

La bonne formule produit :

```txt
La carte montre ce qui est vrai maintenant.
La mission montre ce qu’il faut faire ensuite.
```

---

# 2. Précision méthodologique sur le « top 15 mondial »

Apple ne publie pas un classement mondial unique et stable. Les classements App Store sont propres à chaque pays, catégorie et instant.

L’étude utilise donc :

- les classements Apple français, américains et britanniques observés en juillet 2026 ;
- les applications en tête des catégories Navigation et Forme et santé ;
- les leaders mondiaux du running, de la navigation et de la planification d’itinéraires ;
- les applications dont la carte constitue une fonction centrale.

En France, Waze et Google Maps occupent les premières places de Navigation, Citymapper figure dans le top 10, tandis que Strava et AllTrails figurent parmi les principales applications cartographiques de Forme et santé.

L’objectif n’est pas d’établir un classement commercial absolu, mais de comparer les **15 références les plus pertinentes pour la carte GRYD**.

---

# 3. Benchmark des 15 références

## 3.1 Tableau de synthèse

| Application | Rôle principal de la carte | Informations dominantes | Pattern anti-friction | Leçon GRYD |
|---|---|---|---|---|
| Waze | État temps réel et guidage | Trafic, incidents, route, ETA, signalements | Alertes configurables, priorité aux événements proches et utiles | Afficher uniquement les attaques/opportunités pertinentes dans le viewport ou sur la mission |
| Google Maps | Exploration et navigation universelle | Route, alternatives, trafic, incidents, POI, transports | Calques optionnels, détail au tap, codage des lignes | Séparer fond de carte, contrôle territorial et action |
| Apple Maps | Navigation premium et sobre | Route, trafic, incidents validés, POI majeurs | Très peu d’éléments simultanés, bottom sheet, seuil de confiance | Ne pas afficher un événement territorial faible ou non confirmé |
| Citymapper | Exécution d’un trajet | Prochaine étape, mode, temps, perturbation | La prochaine action prime sur la carte complète | En mode course, la prochaine action doit remplacer la lecture stratégique |
| Organic Maps | Carte offline et privée | Routes, chemins, POI essentiels | Aucun compte obligatoire, pas de publicité, carte légère | Le mode de base doit rester utilisable sans bruit marketing |
| Strava | Découverte de routes et activité communautaire agrégée | Heatmaps, routes, points de départ, itinéraires | Agrégation en chaleur plutôt que milliers de points | Agréger l’activité crew/rivale au lieu d’afficher tous les runners |
| AllTrails | Navigation de sentier | Route vérifiée, position, waypoints, couches, relief | Route dominante, couches choisies, waypoints contextuels | Une route active doit dominer les territoires secondaires |
| Nike Run Club | Enregistrement et coaching | Position, trace, métriques, sécurité | L’utilisateur regarde ses stats, pas une carte tactique dense | Le Live Run GRYD doit être beaucoup plus simple que la Battle Map |
| Runna | Exécution d’un entraînement et suivi de route | Route importée, étapes du workout, cues | Le programme masque la complexité cartographique | Lorsqu’une mission est acceptée, masquer les options stratégiques |
| Komoot | Planification et découverte | Waypoints, POI, Highlights, segments recommandés | Les éléments apparaissent selon sport, pertinence, popularité et zoom | Utiliser la priorité et le zoom pour décider quels objectifs afficher |
| Garmin Connect | Planification par popularité | Heatmap, parcours, routes communautaires | La foule est synthétisée en intensité | Montrer la pression territoriale agrégée, pas chaque activité |
| Runkeeper | Enregistrement simple et live tracking | Position, route choisie, bouton start, partage live | Peu d’actions sur la carte de départ | Démarrer une course GRYD en deux taps maximum |
| MapMyRun | Tracking GPS et historique | Trace, position, stats, élévation | La fiabilité de l’enregistrement prime sur la richesse visuelle | « Never lose a run » est plus important qu’une carte spectaculaire |
| WorkOutDoors | Carte outdoor experte | Multiples données, traces, métriques et personnalisation | Puissance accessible par configuration, pas imposée par défaut | Les options expertes doivent rester derrière « Couches » ou paramètres |
| Geovelo | Navigation orientée confort/sécurité | Route, type de voie, sécurité, guidage | L’algorithme choisit, l’interface explique simplement | Intégrer la sécurité dans la recommandation, sans surcharger la carte |

---

# 4. Patterns communs de simplification en 2026

## 4.1 Le zoom détermine l’information

Les meilleures cartes n’affichent pas les mêmes objets à tous les niveaux.

```txt
Zoom arrière
→ agrégats et tendances

Zoom ville
→ secteurs et propriétaires dominants

Zoom quartier
→ territoires individuels et frontières

Zoom rue
→ route, points de fermeture, objectifs précis
```

C’est le pattern le plus important pour GRYD.

Aucun écran ne doit afficher simultanément :

- toutes les zones ;
- tous les crews ;
- tous les runners ;
- toutes les attaques ;
- toutes les missions ;
- tous les labels ;
- toutes les routes.

## 4.2 L’élément actif domine

Lorsque l’utilisateur sélectionne une route, une mission ou une zone :

- l’objet sélectionné devient fortement visible ;
- le reste diminue en opacité ;
- les détails apparaissent dans une bottom sheet ;
- une seule action principale est proposée.

```txt
Sélection active = 100 % de contraste
Contexte proche = 40 à 60 %
Contexte secondaire = 10 à 25 %
```

## 4.3 Le détail est progressif

Le détail ne doit pas être imprimé sur la carte.

La carte montre :

```txt
forme
couleur
frontière
statut
priorité
```

Le tap révèle :

```txt
nom
propriétaire
surface
contrôle
ancienneté
activité
pression
défense
action recommandée
```

## 4.4 Les alertes ont une durée et une pertinence

GRYD doit appliquer une logique de fraîcheur :

```txt
attaque en cours
→ visible fortement

activité rivale récente
→ visible modérément

activité ancienne
→ disparaît ou devient historique
```

Un événement ne doit rester sur la carte que s’il aide à décider.

## 4.5 Les calques sont choisis, pas empilés

Trois modes suffisent :

```txt
Contrôle
Action
Crew
```

## 4.6 Les marqueurs sont agrégés

Quand plusieurs éléments sont proches :

- les runners deviennent un cluster ;
- les événements deviennent un compteur ;
- l’activité devient une heatmap ;
- les petites zones deviennent un secteur.

```txt
18 activités rivales
```

est préférable à 18 avatars orange.

## 4.7 Une carte opérationnelle n’est pas une carte marketing

La carte utilisée dehors doit être :

- contrastée ;
- peu décorative ;
- stable ;
- lisible au soleil ;
- utilisable d’une main ;
- sans glassmorphism excessif ;
- sans animations permanentes.

Le spectaculaire est réservé à l’onboarding, l’App Store, le post-run, le replay, le partage et les récompenses.

---

# 5. Mission exacte de la carte GRYD

La carte GRYD doit représenter l’état territorial actuel.

## Niveau 1 — Compréhension instantanée

Sans toucher l’écran :

```txt
Où suis-je ?
Quelle partie appartient à mon crew ?
Où est le rival principal ?
Quelle zone est contestée ?
Quelle action est prioritaire ?
```

## Niveau 2 — Compréhension d’une zone

Après un tap :

```txt
Qui possède cette zone ?
Depuis quand ?
Quelle surface ?
Quel niveau de contrôle ?
Qui la menace ?
Quand a-t-elle été défendue ?
Combien de runners ont contribué ?
Est-elle protégée, stable ou en decay ?
```

## Niveau 3 — Passage à l’action

Après ouverture de la bottom sheet :

```txt
Que puis-je faire ?
Combien de kilomètres ?
Combien de temps ?
Que vais-je capturer ou défendre ?
Quel impact pour mon crew ?
La route forme-t-elle une boucle ?
```

---

# 6. Carte GRYD recommandée — état par défaut

## 6.1 Header

```txt
PARIS EST
● À jour
```

Ou :

```txt
PARIS EST · LIVE
```

Ne pas afficher en permanence :

- classement complet ;
- coffre crew ;
- progression saison ;
- points ;
- bonus ;
- alertes multiples.

## 6.2 Carte visible

Par défaut, montrer uniquement :

```txt
1. Position du joueur
2. Territoires utiles autour de lui
3. Propriétaires dominants
4. Zone prioritaire
5. Une mission recommandée
6. Bouton Couches
7. Bouton Recentrer
```

Maximum :

```txt
2 boutons flottants à droite
1 bottom sheet
1 CTA principal
```

## 6.3 Bottom sheet par défaut

```txt
RÉPUBLIQUE SOUS PRESSION
3 zones à sauver · 4,4 km

[DÉFENDRE]
```

---

# 7. Grammaire visuelle GRYD

## 7.1 Canaux visuels

```txt
Remplissage = propriétaire
Contour = état
Opacité = force / récence
Texture = conflit ou indisponibilité
Icône = événement ponctuel
Animation = urgence active uniquement
```

## 7.2 Couleurs

### Mon crew

```txt
Chartreuse
```

- fill : 16 à 24 % ;
- contour : 70 à 90 % ;
- sélection : 100 % ;
- route active : 100 %.

### Rival principal

```txt
Orange
```

- fill : 16 à 22 % ;
- contour : 70 à 90 % ;
- attaque active : halo court et contrôlé.

### Autres crews

```txt
Couleurs désaturées et limitées
```

- pas une couleur saturée par crew ;
- regroupement au zoom ville ;
- nom et blason exacts au tap ;
- palette secondaire au zoom quartier.

### Neutre

```txt
Gris / transparent
```

### Protégé / vérifié

```txt
Bleu électrique
```

### Contesté

```txt
Double contour chartreuse + orange
ou hachures discrètes
```

### Bonus / événement

```txt
Or
```

---

# 8. États territoriaux à gérer

## Stable

```txt
fill propriétaire léger
contour plein
aucune animation
```

## Sous pression

```txt
petit halo rival
contour légèrement renforcé
pas de pulse permanent
```

## Contesté

```txt
double contour
hachures légères
badge contesté au zoom quartier
```

## Attaque active

```txt
pulse lent uniquement sur la frontière concernée
micro-label temporaire
```

## Protégé

```txt
contour bleu
petit bouclier seulement au zoom proche ou au tap
```

## En decay

```txt
contour pointillé
opacité réduite
```

## Neutre

```txt
pas de fill fort
contour gris discret
```

## Frontière ouverte

```txt
segment pointillé
point de fermeture visible
```

## Boucle à terminer

```txt
ligne ouverte
segment manquant contrasté
distance restante
```

## Zone exclue / non jouable

```txt
hachures grises
aucun CTA de conquête
raison au tap
```

---

# 9. Comment afficher « qui possède quoi »

Ne pas mettre le nom du crew sur chaque zone.

## Zoom ville

```txt
Secteur dominant
+ blason du crew dominant
+ pourcentage global
```

## Zoom quartier

```txt
territoires colorés
blason uniquement sur les grandes zones
```

## Tap sur zone

```txt
Les Foulées 9³
Contrôle : 64 %
```

## Bottom sheet développée

```txt
Propriétaire : Les Foulées 9³
Contrôle : 64 %
Depuis : 2 j 4 h
Surface : 0,18 km²
Dernière défense : il y a 18 min
Top rival : Canal Crew · 31 %
```

---

# 10. Bottom sheet détaillée d’une zone

```txt
[RÉPUBLIQUE]

Les Foulées 9³
Contrôle 64 % · Contestée

0,18 km²
Tenue depuis 2 j 4 h
Défendue il y a 18 min

PRESSION
Canal Crew 31 %
Neutre 5 %

ACTIVITÉ 24 H
12 runs · 7 alliés · 5 rivaux

ACTION RECOMMANDÉE
Défense courte
3,8 km · 24 min · +86 zones

[DÉFENDRE]
```

Derrière « Plus » :

```txt
historique d’ownership
contributeurs
GRYD Verify agrégé
courbe de pression
événements récents
règles de calcul
```

---

# 11. Zoom sémantique exact

## Zoom 6–9 — Pays / région

Afficher :

```txt
villes actives
nombre de crews
pression globale
saison locale
```

## Zoom 10–12 — Métropole

Afficher :

```txt
secteurs
crew dominant
contrôle %
secteurs contestés
```

## Zoom 13–15 — Quartier

Afficher :

```txt
territoires organiques
frontières
propriétaires principaux
missions
pression
routes stratégiques
```

## Zoom 16–18 — Rue / mission

Afficher :

```txt
route exacte
position
segment restant
point de fermeture
petites zones
alliés opt-in utiles
objectifs précis
```

## Zoom 19+ — Live / précision

Afficher :

```txt
trace en cours
direction
prochaine action
fermeture
segment exclu
```

Masquer presque tout le reste.

---

# 12. Modes de carte

## Contrôle — par défaut

Question :

```txt
Qui contrôle quoi maintenant ?
```

Afficher territoires, frontières, propriétaire, contestation, pression, protection et decay.

## Action

Question :

```txt
Où dois-je courir maintenant ?
```

Afficher mission, route, distance, durée, gain, point de fermeture et zones affectées.

## Crew

Question :

```txt
Où mon crew a-t-il besoin de moi ?
```

Afficher pings, boucles à terminer, demandes de défense, raid, alliés opt-in et HQ.

Ne jamais afficher la position exacte d’un rival.

---

# 13. Activité live et runners

## Alliés

Afficher seulement si :

- opt-in ;
- mission crew active ;
- proximité utile ;
- délai faible.

## Rivaux

Ne jamais afficher :

- position exacte ;
- identité ;
- trajet live ;
- départ/arrivée.

Afficher :

```txt
activité rivale détectée
pression par secteur
halo agrégé
nombre d’activités récentes
```

Exemple :

```txt
Canal actif · 5 runs récents
```

---

# 14. Système de priorité des objets

```txt
display_priority =
mission_relevance
+ urgency
+ proximity
+ viewport_relevance
+ user_context
+ crew_context
- clutter_cost
```

Ordre :

```txt
1. Sécurité
2. Position / trace live
3. Mission sélectionnée
4. Zone urgente
5. Boucle à terminer
6. Rivalité active
7. Bonus actif
8. Alliés utiles
9. Historique
10. Autres crews
```

---

# 15. Réduction de pollution visuelle

```txt
Pas plus de 1 mission ouverte.
Pas plus de 2 boutons flottants.
Pas plus de 1 bottom sheet.
Pas plus de 3 labels territoriaux simultanés au zoom quartier.
Pas plus de 1 animation permanente.
Pas de texte long sur la carte.
Pas de KPI de saison sur la carte.
Pas de boutique sur la carte.
Pas d’avatars rivaux exacts.
Pas de filtre exposé en permanence.
```

Masquer au premier niveau :

```txt
classement
coffre
badges
stats performance
bonus secondaires
historique
détails de calcul
liste des membres
tous les crews
toutes les routes
```

---

# 16. Carte pendant une course

Afficher :

```txt
trace
position
direction
distance
temps
allure
objectif
progression
```

Une seule alerte temporaire :

```txt
Boucle possible
320 m pour fermer
Zone défendue
Canal actif
```

Atténuer territoires secondaires, labels non essentiels et frontières hors mission.

---

# 17. Fiabilité et fraîcheur des données

La carte doit afficher :

```txt
À jour
Mise à jour…
Hors ligne
Données de 3 min
```

Règles :

- mise à jour par delta ;
- animation courte des changements ;
- snapshot serveur versionné ;
- aucune bascule d’ownership sans confirmation backend ;
- événements faibles agrégés avant affichage ;
- carte utilisable si le réseau est lent.

---

# 18. Modèle de données territorial

## `territories`

```sql
territories (
  id uuid primary key,
  sector_id uuid not null,
  geometry geometry not null,
  area_m2 numeric not null,
  owner_crew_id uuid,
  owner_control_percent numeric,
  top_rival_crew_id uuid,
  top_rival_control_percent numeric,
  neutral_percent numeric,
  status text not null,
  pressure_score integer,
  defense_strength integer,
  protected_until timestamp,
  decay_at timestamp,
  captured_at timestamp,
  last_defended_at timestamp,
  last_activity_at timestamp,
  contributor_count_24h integer,
  verify_confidence numeric,
  version bigint,
  updated_at timestamp
)
```

Statuts :

```txt
neutral
stable
under_pressure
contested
under_attack
protected
decaying
open_boundary
loop_incomplete
excluded
```

## `territory_events`

```sql
territory_events (
  id uuid primary key,
  territory_id uuid not null,
  event_type text not null,
  crew_id uuid,
  user_id uuid,
  activity_id uuid,
  value jsonb,
  occurred_at timestamp,
  expires_at timestamp
)
```

## `sector_snapshots`

```sql
sector_snapshots (
  sector_id uuid primary key,
  dominant_crew_id uuid,
  dominant_percent numeric,
  top_rival_crew_id uuid,
  top_rival_percent numeric,
  neutral_percent numeric,
  pressure_score integer,
  status text,
  active_mission_id uuid,
  version bigint,
  updated_at timestamp
)
```

---

# 19. Ordre des couches de rendu

```txt
1. Fond sombre
2. Eau / parcs / bâtiments
3. Routes principales
4. Territory fills
5. Territory outlines
6. Status textures
7. Route casing
8. Route core
9. Missions et clusters
10. Labels contextuels
11. Position utilisateur
12. UI native
```

La route active doit toujours être au-dessus des territoires.

---

# 20. Architecture cartographique recommandée

Une architecture Mapbox ou MapLibre est généralement plus flexible qu’une simple carte standard pour ce niveau de personnalisation.

## Backend

```txt
PostGIS
H3 / micro-cellules invisibles
fusion par owner
simplification par zoom
vector tiles
snapshots de secteurs
websocket / delta updates
```

## Frontend

```txt
Mapbox Maps SDK ou MapLibre
style expressions
feature state
symbol collision
clusters
bottom sheets natives
```

---

# 21. Performance attendue

```txt
60 FPS cible pendant pan/zoom
feedback tap < 100 ms
bottom sheet < 200 ms
première carte utile < 1,5 s
snapshot territorial < 2 s
mise à jour ownership visible < 5 s après validation serveur
```

Prévoir geometry simplification, vector tiles, viewport queries, lazy loading, clustering et cache local.

---

# 22. MVP recommandé

## À faire

```txt
Carte Contrôle
Territoires organiques
3 statuts : stable / contesté / neutre
Mon crew / rival principal / autres
Bottom sheet zone
Mission recommandée
Route action
Position
Recentrer
Couches
Fraîcheur
```

## À ne pas faire

```txt
15 états animés
runners live en permanence
3D
heatmaps multiples
tous les crews en couleurs saturées
historique directement sur la carte
weather layer
bonus partout
animations continues
```

---

# 23. V1

```txt
decay
protection
boucles à terminer
activité crew agrégée
clusters
filtres simples
historique de zone
replay territorial
```

# 24. V2

```txt
3D sector view
heatmap personnelle
heatmap crew
events sponsorisés
offline map
advanced route planner
activity pressure prediction
```

---

# 25. Wireframe final

```txt
┌──────────────────────────────┐
│ PARIS EST              ● LIVE│
│                              │
│          [CARTE]             │
│                              │
│  chartreuse = mon crew       │
│  orange = rival principal    │
│  double contour = contesté   │
│                              │
│                    [◎]       │
│                    [▱]       │
│                              │
├──────────────────────────────┤
│ RÉPUBLIQUE SOUS PRESSION     │
│ 3 zones à sauver · 4,4 km    │
│                              │
│ [DÉFENDRE]                   │
└──────────────────────────────┘
```

Au tap :

```txt
┌──────────────────────────────┐
│ RÉPUBLIQUE                   │
│ Les Foulées 9³ · 64 %        │
│ Contestée                    │
│                              │
│ 0,18 km² · tenue 2 j 4 h     │
│ Défendue il y a 18 min       │
│ Canal Crew 31 %              │
│                              │
│ Défense courte               │
│ 3,8 km · 24 min · +86 zones  │
│                              │
│ [DÉFENDRE]                   │
└──────────────────────────────┘
```

---

# 26. Critères d’acceptation UX

```txt
[ ] En 3 secondes, un utilisateur identifie son territoire.
[ ] En 3 secondes, il identifie le rival principal.
[ ] Une zone contestée est comprise sans légende.
[ ] Le propriétaire exact est accessible en un tap.
[ ] La taille et l’ancienneté sont accessibles en un tap.
[ ] L’action recommandée est visible sans scroll.
[ ] Il n’y a pas plus de deux boutons flottants.
[ ] La route active domine visuellement.
[ ] La carte reste lisible en extérieur.
[ ] Aucun rival n’est localisé précisément en live.
[ ] Les détails techniques n’apparaissent pas au premier niveau.
[ ] Les objets changent avec le zoom.
[ ] Les marqueurs nombreux sont agrégés.
[ ] La carte indique si les données sont à jour.
[ ] Le mode Live Run est plus simple que le mode Contrôle.
```

---

# 27. Décision finale

La carte GRYD doit être :

```txt
un état territorial lisible
+
une recommandation d’action
+
une route pour agir
```

Hiérarchie :

```txt
Contrôle
→ comprendre

Action
→ décider

Route
→ courir

Résultat
→ voir ce qui a changé
```

Phrase produit :

```txt
Qui possède quoi.
Ce qui est en danger.
Où courir pour changer la carte.
```

---

# 28. Sources officielles principales

## Classements App Store

- Apple France — Navigation : https://apps.apple.com/fr/iphone/charts/6010
- Apple France — Forme et santé : https://apps.apple.com/fr/iphone/charts/6013
- Apple États-Unis — Navigation : https://apps.apple.com/us/iphone/charts/6010
- Apple Royaume-Uni — Navigation : https://apps.apple.com/gb/iphone/charts/6010

## Références navigation

- Google Maps layers : https://support.google.com/maps/answer/3092439
- Waze alerts : https://support.google.com/waze/answer/13786535
- Waze road features : https://support.google.com/waze/answer/14964557
- Apple Maps incidents : https://support.apple.com/guide/iphone/iphb8a99022c/ios
- Citymapper navigation : https://content.citymapper.com/news/2235/a-warm-welcome-to-bristol-cardiff-and-the-entire-south-west
- Organic Maps : https://organicmaps.app/

## Références running / outdoor

- Strava generated routes : https://support.strava.com/en-us/articles/15401756-generated-community-routes
- Strava heatmap : https://support.strava.com/en-us/articles/15401880-the-global-heatmap-and-strava-metro
- Strava map layers : https://support.strava.com/en-us/articles/15401924-strava-map-layers
- AllTrails map layers : https://support.alltrails.com/hc/en-us/articles/37228180990228-AllTrails-map-types-overlays-and-extras
- AllTrails waypoints : https://support.alltrails.com/hc/en-us/articles/49923480369172-Understanding-Waypoint-Types-on-AllTrails
- Nike Run Club : https://www.nike.com/nl/en/nrc-app
- Runna route following : https://support.runna.com/en/articles/11027305-how-to-follow-a-route-in-the-runna-app
- Komoot Highlights : https://support.komoot.com/hc/en-us/articles/10194639751450-Highlights
- Komoot route planning : https://support.komoot.com/hc/en-us/articles/10194270667034-Plan-routes-on-the-website
- Garmin Popularity Heatmap : https://support.garmin.com/en-US/?faq=n2UzfNkYOt3iAbXqgl03W7
- Runkeeper routes : https://help.runkeeper.com/en/hc/all-about-routes
- WorkOutDoors maps : https://www.workoutdoors.net/Maps.html
- Geovelo : https://geovelo.app/download/

## Références techniques

- Mapbox zoom/data-driven styling : https://docs.mapbox.com/mapbox-gl-js/guides/styles/style-layers/
- Mapbox clustering : https://docs.mapbox.com/mapbox-gl-js/example/cluster/
- Google marker clustering : https://developers.google.com/maps/documentation/ios-sdk/utility/marker-clustering
- Apple Maps HIG : https://developer.apple.com/design/human-interface-guidelines/maps
