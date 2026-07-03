# GRYD — Refonte complète des pages, intégrations marché et système de badges étendu

## Objectif

Ce document repense l’architecture de GRYD après les derniers ajustements :

- rendre le produit beaucoup plus gaming ;
- renforcer la compétition entre crews ;
- faire ressentir la guerre de territoire ;
- améliorer la landing page ;
- améliorer les pages app ;
- ajouter / supprimer / fusionner certaines pages ;
- intégrer Garmin, WHOOP, Strava, Apple Health et Health Connect ;
- étendre le système de badges : 24 badges ne suffisent pas ;
- créer des niveaux de progression longs, lisibles et désirables.

Nom marque : **GRYD**  
App Store international : **GRYD: Run the Map**  
Baseline FR : **Cours. Capture. Défends.**  
Baseline EN : **Run. Capture. Defend.**

---

# 1. Diagnostic global

La base produit est solide : carte, crews, capture, performance, anti-triche, monétisation, badges, France entière et architecture internationale.

Mais GRYD doit moins ressembler à :

```txt
une app de running premium avec une mécanique de carte
```

et beaucoup plus à :

```txt
un jeu de conquête territoriale premium alimenté par la course réelle
```

La hiérarchie produit doit devenir :

```txt
Territoire
→ Crew
→ Saison
→ Performance
→ Statut
→ Objets
```

Le joueur doit sentir :
- qu’il appartient à un crew ;
- qu’il prend du territoire ;
- qu’il se fait attaquer ;
- qu’il défend ;
- qu’il progresse ;
- qu’il débloque des statuts ;
- que chaque course change la carte.

---

# 2. Nouvelle promesse produit

Ancienne promesse implicite :

```txt
Cours et capture des zones.
```

Nouvelle promesse recommandée :

```txt
La carte est ouverte.
Chaque run peut changer la frontière.
Ton crew peut prendre la ville.
```

Version plus forte :

```txt
La France est une carte.
Ton corps est la manette.
Ton crew prend le territoire.
```

Version internationale :

```txt
The map is open.
Run it. Capture it. Defend it.
```

---

# 3. Architecture globale

Il faut distinguer deux architectures :

## Landing page web

Objectif :
- vendre l’univers ;
- récupérer waitlist ;
- recruter crews ;
- donner envie de rejoindre la Saison 0.

## Application mobile

Objectif :
- faire jouer ;
- faire courir ;
- faire capturer ;
- faire revenir ;
- faire progresser ;
- faire appartenir à un crew.

---

# PARTIE A — LANDING PAGE WEB V2

La landing actuelle est propre, mais trop SaaS / fitness.  
Il faut la transformer en vitrine de jeu compétitif.

---

# 4. Landing Page — Structure V2 recommandée

## 4.1 Hero / Battle State

Objectif : en 3 secondes, comprendre que GRYD est une guerre de territoire par la course.

### Titre

```txt
La carte est ouverte.
Cours. Capture. Défends.
```

### Sous-titre

```txt
GRYD transforme chaque run en conquête territoriale.
Rejoins ton crew, prends ton secteur et termine la saison au sommet.
```

### CTA

```txt
Créer mon crew
Réserver mon accès
```

### Éléments visuels obligatoires

- téléphone avec carte conflictuelle ;
- hexes verts = ton crew ;
- hexes rouges / orange = rival ;
- hexes gris = neutre ;
- alerte “Zone attaquée” ;
- mini leaderboard ;
- compteur saison ;
- flux live.

### Composants à ajouter dans le hero

```txt
Saison 0 — Fondateurs
J-18 avant ouverture
30 crews en attente
1 240 runners inscrits
```

```txt
LIVE FEED
+214 hexes capturés par Night Pacers
Paris Est est contesté
Canal Crew passe #2
```

---

## 4.2 Gameplay Loop

Remplacer la section concept trop abstraite par une boucle de jeu.

### Étapes

1. **Cours**  
   Lance une course réelle.

2. **Capture**  
   Les hexes traversés passent à ton crew.

3. **Attaque**  
   Traverse les zones adverses pour reprendre du terrain.

4. **Défends**  
   Repasse sur tes zones avant le decay.

5. **Domine**  
   Monte au classement de ta ville, puis de ton pays.

### UI

- ligne horizontale animée ;
- mini hex map ;
- chaque étape change la carte ;
- micro-animations de capture.

---

## 4.3 France Battle Map

La section carte doit devenir une vraie carte de bataille.

### Texte

```txt
Première carte officielle : France.
Chaque hex peut être capturé.
Chaque zone a son propre niveau de guerre.
```

### Afficher

- Paris : Zone active ;
- Lille : Zone active ;
- Rouen : Zone émergente ;
- Dieppe : Avant-postes ;
- Pays de Caux : Pionnier ;
- zones rurales : Exploration.

### Légende de carte

```txt
Vert = ton crew
Gris = neutre
Orange/rouge = rival
Bleu/violet = contesté
Or = dominé
Bouclier = protégé
Sablier = decay
```

---

## 4.4 War Room / Salle de Guerre

C’est la section qui manque le plus.

### Objectif

Montrer que GRYD n’est pas juste une carte : c’est un jeu collectif.

### Composant type

```txt
OFFENSIVE CREW
Canal Saint-Martin

Objectif : 800 hexes
Progression : 62 %
Temps restant : 04:21:08
Membres actifs : 7 / 10
Récompense : Coffre Crew
```

### Ajouter

- bouton “Voir l’offensive” ;
- jauge collective ;
- avatars membres ;
- territoire attaqué ;
- récompense.

---

## 4.5 Résultat de Course / Reward Moment

La section résultat doit devenir une carte de victoire.

### Résultat idéal

```txt
+214 HEXES
Paris Est passe à 62 %
Night Pacers gagne 1 rang
Badge ROUTE OPENED débloqué
+7 % bonus performance
```

### Ajouter

- zone capturée ;
- classement crew gagné ;
- badge débloqué ;
- rareté du badge ;
- preview story ;
- progression Pass ;
- progression niveau.

---

## 4.6 Crew Leaderboard

Indispensable pour vendre la compétition.

### Contenu

```txt
Classement Saison 0 — Preview
```

Onglets :
- France ;
- Paris ;
- Lille ;
- Dieppe ;
- Pionniers ;
- Crews.

Exemple :

```txt
#1 Bastille Runners — 18 420 pts
#2 Canal Crew — 16 870 pts
#3 Night Pacers — 15 240 pts
```

---

## 4.7 Badges & Medals

Ne pas montrer seulement 3 badges.  
Il faut montrer le système complet de statut.

### Contenu

- badges ;
- médailles ;
- raretés ;
- niveaux ;
- titres permanents ;
- récompenses de saison.

Texte :

```txt
Débloque des badges qui restent après le reset.
La carte change à chaque saison. Ton statut reste.
```

---

## 4.8 Arsenal Running / Objets virtuels

Transformer le pricing SaaS en boutique de jeu premium.

### Objets à montrer

- Shield ;
- Streak Gel ;
- Radar ;
- Scout ;
- Offensive Banner ;
- Carbon Skin ;
- Territory Skin ;
- Crew Emblem.

### Règle de copywriting

```txt
Tu ne peux pas acheter la ville.
Tu peux acheter du style, du confort et des objets capés.
```

### Style

Les objets doivent ressembler à des accessoires running premium / tech :
- gel énergétique ;
- plaque carbone ;
- semelle ;
- radar HUD ;
- bracelet performance ;
- bannière crew.

Pas fantasy.  
Pas militaire réaliste.

---

## 4.9 Performance → Territory Impact

La performance doit être vendue comme un avantage stratégique plafonné.

### Contenu

```txt
Ta forme progresse.
Ton territoire aussi.
```

Afficher :
- Score Forme ;
- km semaine ;
- allure ;
- bonus conquête ;
- hexes capturés ;
- GRYD Verified.

Exemple :

```txt
Score Forme 82
+7 % bonus conquête
412 hexes capturés cette semaine
96 % données fiables
```

---

## 4.10 Connect Your Gear

Nouvelle section obligatoire.

### Objectif

Montrer que GRYD peut se connecter à l’écosystème running sans bloquer le MVP.

### Contenu

```txt
Connecte tes données sportives.
GRYD lit tes activités, vérifie leur fiabilité, puis décide si elles peuvent capturer.
```

### Sources affichées

- Apple Health ;
- Health Connect ;
- Strava ;
- Garmin ;
- WHOOP ;
- Fitbit / Google Health ;
- Polar ;
- Coros / Suunto plus tard.

### Règle

```txt
Toutes les sources peuvent enrichir la performance.
Seules les activités vérifiées peuvent capturer du territoire.
```

---

## 4.11 Founder Access

La waitlist doit devenir une porte d’entrée de saison.

### Ajouter

- places limitées ;
- badge Fondateur ;
- création de crew ;
- code postal ;
- pays ;
- ville ;
- profil ;
- accès international futur.

Texte :

```txt
Saison 0 — Fondateurs
Crée ton crew avant l’ouverture officielle.
Débloque un badge permanent.
```

---

## 4.12 FAQ Gameplay

Ajouter des questions plus jeu :
- Comment je capture un territoire ?
- Comment mon crew gagne une saison ?
- Que se passe-t-il si on me vole une zone ?
- Est-ce que je peux jouer en campagne ?
- Comment une ville passe en mode Guerre ?
- Comment GRYD évite la triche ?
- Est-ce pay-to-win ?
- Et hors de France ?

---

# 5. Sections landing à supprimer / fusionner

## À remplacer

### Section concept trop théorique

Remplacer par **Gameplay Loop**.

### Pricing SaaS classique

Remplacer par **Arsenal + Access**.

### FAQ corporate

Remplacer par **FAQ gameplay**.

---

# PARTIE B — APPLICATION MOBILE V2

---

# 6. Navigation mobile recommandée

Éviter trop d’onglets, mais donner de la profondeur.

## Navigation principale

```txt
Carte
War Room
Crew
Classement
Profil
```

Bouton central flottant :

```txt
COURIR
```

Pourquoi :
- Carte = cœur du jeu ;
- War Room = actions / attaques / missions ;
- Crew = social ;
- Classement = compétition ;
- Profil = statut + performance + badges ;
- Courir = action centrale.

---

# 7. Pages principales de l’app

## 7.1 Onboarding

### Objectif

Faire entrer dans l’univers en moins de 90 secondes.

### Étapes

1. Promesse :
```txt
La carte est ouverte.
Ton run peut changer la frontière.
```

2. Pays :
```txt
France ouverte.
Autres pays en waitlist.
```

3. Ville / zone de départ.

4. Pseudo.

5. Rejoindre / créer crew.

6. Zone privée.

7. Permissions :
- GPS ;
- Motion ;
- Health ;
- Notifications.

8. Première mission :
```txt
Capture tes 10 premiers hexes.
```

---

## 7.2 Carte / Battle Map

Page principale.

### Afficher

- position joueur ;
- territoires crew ;
- territoires rivaux ;
- zones neutres ;
- zones contestées ;
- decay ;
- locks ;
- boucliers ;
- objectifs ;
- routes ;
- avant-postes ;
- statut de secteur ;
- gain potentiel.

### Bottom sheet secteur

```txt
Paris Est
62 % Night Pacers
31 % Canal Crew
7 % Neutre

Statut : Contesté
Hexes à reprendre : 184
Gain estimé : +1 240 pts
Action : Courir ici
```

---

## 7.3 Course Live

### Objectif

Faire ressentir la capture en temps réel.

Afficher :
- distance ;
- temps ;
- allure ;
- hexes capturés ;
- points estimés ;
- GPS / Motion trust ;
- objectif crew ;
- trace qui se dessine ;
- capture d’hex en live.

### États

- GPS OK ;
- GPS faible ;
- Verify actif ;
- Zone privée ;
- Zone non capturable ;
- Segment exclu.

---

## 7.4 Résultat de Course

Page critique.

### Ordre d’apparition

1. Course validée.
2. Hexes capturés.
3. Zones modifiées.
4. Points.
5. Bonus performance.
6. Contribution crew.
7. Badges / records.
8. Jauges progression.
9. Partage.

### Exemple

```txt
+214 HEXES
Paris Est passe à 62 %
Night Pacers gagne 1 rang
+7 % bonus performance
Badge ROUTE OPENED débloqué
```

---

## 7.5 War Room

Nouvelle page principale.

### Objectif

Centraliser les actions importantes.

Afficher :
- offensive en cours ;
- zones à défendre ;
- secteurs attaqués ;
- decay urgent ;
- missions crew ;
- routes à ouvrir ;
- objectifs saison ;
- prochaine meilleure action.

### Exemple

```txt
À faire maintenant
Défends République : 34 hexes expirent dans 48 h.

Offensive Crew
Canal Saint-Martin — 62 %
Temps restant : 04:21:08
```

La War Room évite que le joueur se perde.

---

## 7.6 Crew HQ

Page sociale et stratégique.

### Onglets

```txt
Vue d’ensemble
Membres
Chat
Offensives
Avant-postes
Récompenses
```

### Afficher

- rang crew ;
- score saison ;
- membres actifs ;
- carte crew ;
- objectifs ;
- leaderboard interne ;
- rôles ;
- coffres ;
- historique.

---

## 7.7 Classements

### Onglets

```txt
Local
Ville
Région
France
Pionniers
Crews
Performance
```

### Important

Ne pas mélanger tous les classements.

Séparer :
- territoire ;
- crew ;
- performance ;
- pionnier ;
- saison.

### Médailles

Chaque classement doit donner des médailles :
- Bronze ;
- Silver ;
- Gold ;
- Carbon ;
- Elite ;
- Legend.

---

## 7.8 Performance

Accessible via Profil et résultat de course.

### Onglets

```txt
Vue d’ensemble
Courses
Records
Impact carte
Sources
```

### Afficher

- Score Forme ;
- semaine ;
- distance ;
- allure ;
- charge GRYD ;
- bonus conquête ;
- hexes capturés ;
- GRYD Verified ;
- prochaine meilleure action.

Règle :

```txt
Strava te dit ce que tu as couru.
Garmin te dit comment ton corps répond.
WHOOP te dit dans quel état tu es.
GRYD te dit ce que ta performance a conquis.
```

---

## 7.9 Profil

Page statut.

Afficher :
- avatar ;
- niveau ;
- rang ;
- crew ;
- badges ;
- médailles ;
- titres ;
- posters ;
- stats carrière ;
- saisons passées ;
- progression rareté.

Le profil ne doit pas être juste un compte.  
Il doit être une vitrine de statut.

---

## 7.10 Badges & Medals

Cette page peut être dans Profil, mais doit être assez riche.

### Onglets

```txt
Tous
Territoire
Performance
Crew
Défense
Exploration
Saison
Rares
```

### Afficher

- badges obtenus ;
- badges verrouillés ;
- progression ;
- rareté ;
- prochaine étape ;
- récompense.

Exemple :

```txt
HEX HUNTER III
720 / 1000 hexes
Prochain niveau : HEX HUNTER IV
```

---

## 7.11 Arsenal / Boutique

Renommer Boutique.

Noms possibles :
- Arsenal ;
- Locker ;
- Gear ;
- Atelier.

Recommandation FR :

```txt
Arsenal
```

EN :

```txt
Gear
```

### Sections

- Skins de territoire ;
- Skins de trace ;
- objets capés ;
- Pass ;
- Club ;
- badges premium ;
- emblèmes crew ;
- posters.

### Règle

Toujours afficher :

```txt
Aucun objet ne vend des hexes, des kilomètres ou la victoire.
```

---

## 7.12 Missions

La page Missions peut être intégrée à War Room.  
Pas besoin d’onglet principal.

### Types

- quotidienne ;
- hebdomadaire ;
- crew ;
- performance ;
- pionnier ;
- saison.

---

## 7.13 Sources connectées

Accessible depuis Performance ou Paramètres.

### Sources

- GPS live GRYD ;
- Apple Health ;
- Health Connect ;
- Strava ;
- Garmin ;
- WHOOP ;
- Fitbit / Google Health ;
- Polar ;
- Coros ;
- Suunto.

### Rôle

```txt
Importer tes activités.
Enrichir ta performance.
Vérifier la fiabilité.
Éviter les doublons.
```

---

## 7.14 Inbox

Ne pas en faire un onglet principal au début.

Accessible depuis :
- icône notification ;
- War Room ;
- Profil.

Contient :
- vols ;
- decay ;
- récompenses ;
- offensives ;
- support ;
- GRYD Verify ;
- saisons.

---

## 7.15 Support / Contestation

Page obligatoire mais secondaire.

Cas :
- ma course n’a pas compté ;
- segment exclu ;
- signaler triche ;
- signaler zone dangereuse ;
- problème achat ;
- supprimer données.

---

# 8. Pages à ajouter

À ajouter absolument :

```txt
War Room
Badges & Medals
Sources connectées
Arsenal / Gear
Support course non comptée
Zone detail page
Season page
```

---

# 9. Pages à fusionner

## Missions

À intégrer dans War Room.

## Inbox

À garder en icône, pas onglet.

## Performance

Pas onglet principal.  
Dans Profil + accès rapide après course.

## Boutique

Renommer Arsenal / Gear pour plus gaming.

---

# 10. Pages à éviter au MVP

Éviter :
- feed social général ;
- messagerie privée ;
- coaching running complet ;
- marketplace d’objets ;
- alliances diplomatiques ;
- carte monde complète ;
- hall of fame complexe ;
- vraies dotations.

---

# PARTIE C — INTÉGRATIONS MARCHÉ

---

# 11. Principe d’intégration

GRYD doit être compatible avec les acteurs du marché sans dépendre de connexions payantes au lancement.

Règle :

```txt
Toutes les sources peuvent enrichir la performance.
Seules les activités vérifiées peuvent capturer du territoire.
```

---

# 12. Priorité des sources

## P0 — MVP

```txt
GPS live GRYD
Apple HealthKit
Android Health Connect
```

Pourquoi :
- rapide ;
- gratuit côté API ;
- natif téléphone ;
- couvre Apple Watch ;
- couvre beaucoup d’apps Android ;
- évite dépendance aux partenariats.

---

## P1 — Après MVP

```txt
Strava
Garmin
WHOOP
Google Health / Fitbit
```

### Strava

Usage :
- import activité ;
- historique ;
- social ;
- réclamation.

Mais pas source de vérité absolue.

### Garmin

Usage :
- activités fiables ;
- runners sérieux ;
- GPS montre.

Demander accès Garmin Developer Program.

### WHOOP

Usage :
- recovery ;
- strain ;
- sleep ;
- effort ;
- Score Forme.

WHOOP n’est pas la source principale pour capturer le territoire.

### Google Health / Fitbit

Usage :
- Android ;
- Fitbit ;
- Pixel Watch.

---

## P2

```txt
Polar
Coros
Suunto
```

---

# 13. GRYD Activity Hub

Créer une couche unique :

```txt
GRYD Activity Hub
```

Flow :

```txt
Source externe
→ OAuth / permission
→ import activité
→ normalisation
→ déduplication
→ GRYD Verify
→ trust score
→ décision : stats / claims / rejet
```

---

# 14. Déduplication

Obligatoire.

Un utilisateur peut enregistrer la même course via :
- Apple Watch ;
- Garmin ;
- Strava ;
- GRYD live.

Règle :

```txt
Une activité réelle = une seule course GRYD.
```

Déduplication par :
- heure de départ ;
- durée ;
- distance ;
- polyline ;
- device ;
- hash ;
- similarité.

---

# 15. Statuts d’activité importée

```txt
Capture eligible
Stats only
Partial
Rejected
Duplicate
Review
```

Exemples :

## GPS live GRYD propre

```txt
Capture eligible
```

## Garmin propre

```txt
Capture eligible après GRYD Verify
```

## WHOOP seul

```txt
Stats / performance only
```

## GPX manuel

```txt
Stats only ou review
```

---

# 16. Page Sources connectées

### Exemple UI

```txt
Sources connectées

GRYD Live GPS — Actif
Apple Health — Connecté
Health Connect — Non connecté
Strava — Connecter
Garmin — Bientôt
WHOOP — Connecter pour Score Forme
```

### Texte par source

Apple Health :
```txt
Importe tes courses, pas, cadence et données Apple Watch.
```

Garmin :
```txt
Importe tes activités Garmin. Les courses éligibles peuvent capturer après vérification.
```

WHOOP :
```txt
Ajoute récupération, strain et sommeil à ton Score Forme.
```

Strava :
```txt
Importe tes courses Strava. Elles doivent passer GRYD Verify pour capturer.
```

---

# PARTIE D — SYSTÈME DE BADGES ÉTENDU

---

# 17. Problème des 24 badges

24 badges, c’est bien pour une planche de présentation.  
Mais ce n’est pas suffisant pour une vraie app de progression.

Un jeu compétitif a besoin :
- de badges courts termes ;
- de badges moyens termes ;
- de badges long terme ;
- de niveaux ;
- de raretés ;
- de badges saisonniers ;
- de badges secrets ;
- de badges crew ;
- de médailles de classement ;
- de titres permanents.

Objectif :

```txt
Donner au joueur une raison de revenir même s’il ne gagne pas le classement.
```

---

# 18. Architecture complète des badges

GRYD doit avoir 5 couches.

## Couche 1 — Badges simples

Débloqués une fois :
- première course ;
- premier vol ;
- première défense ;
- premier crew.

## Couche 2 — Badges à niveaux

Évoluent :
- niveau I ;
- niveau II ;
- niveau III ;
- niveau IV ;
- niveau V ;
- niveau LEGEND.

## Couche 3 — Médailles de classement

Attribuées par saison :
- top 100 ;
- top 50 ;
- top 10 ;
- top 3 ;
- #1.

## Couche 4 — Titres

Affichables sur le profil :
- Defender ;
- Pathfinder ;
- Founder ;
- Raid Leader ;
- City Taker.

## Couche 5 — Badges secrets

Débloqués par comportements rares.

---

# 19. Raretés

Système recommandé :

```txt
ROAD
TEMPO
RACE
CARBON
ELITE
LEGEND
```

Correspondance :

| Rareté | Sens |
|---|---|
| ROAD | début |
| TEMPO | régularité |
| RACE | performance affirmée |
| CARBON | premium / avancé |
| ELITE | très rare |
| LEGEND | saison / exploit majeur |

---

# 20. Niveaux d’un badge

Pour les badges à progression, utiliser 6 niveaux.

Exemple :

```txt
Hex Hunter I — 100 hexes
Hex Hunter II — 500 hexes
Hex Hunter III — 1 000 hexes
Hex Hunter IV — 5 000 hexes
Hex Hunter V — 10 000 hexes
Hex Hunter Legend — 50 000 hexes
```

Chaque niveau a :
- icône similaire ;
- bordure plus rare ;
- glow plus fort ;
- statut plus visible.

---

# 21. Familles de badges

Créer au minimum 12 familles :

1. Onboarding
2. Distance
3. Territoire
4. Attaque
5. Défense
6. Exploration
7. Routes / Avant-postes
8. Crew
9. Performance
10. Saison / Classements
11. Fair-play / Verified
12. Secrets

---

# 22. Liste étendue de badges

## A. Onboarding

Badges simples :
1. First Run
2. First Capture
3. First Crew
4. First Defense
5. First Share
6. First Verified Run
7. Founder
8. Season 0

---

## B. Distance

### Distance Runner

```txt
I — 3 km
II — 5 km
III — 10 km
IV — 21,1 km
V — 42,195 km
LEGEND — 50 km+
```

### Season Distance

```txt
I — 25 km saison
II — 50 km
III — 100 km
IV — 250 km
V — 500 km
LEGEND — 1 000 km
```

### Lifetime Distance

```txt
I — 100 km total
II — 500 km
III — 1 000 km
IV — 2 500 km
V — 5 000 km
LEGEND — 10 000 km
```

---

## C. Territoire / Capture

### Hex Hunter

```txt
I — 100 hexes
II — 500
III — 1 000
IV — 5 000
V — 10 000
LEGEND — 50 000
```

### Zone Taker

```txt
I — 1 secteur contrôlé
II — 3
III — 10
IV — 25
V — 50
LEGEND — 100 secteurs
```

### City Control

```txt
I — 10 % d’un secteur actif
II — 25 %
III — 50 %
IV — 70 %
V — 90 %
LEGEND — secteur dominé 30 jours
```

---

## D. Attaque

### Raider

```txt
I — 10 hexes volés
II — 100
III — 500
IV — 1 000
V — 5 000
LEGEND — 10 000
```

### Sector Breaker

```txt
I — 1 secteur contesté
II — 3
III — 10
IV — 25
V — 50
LEGEND — 100
```

### Raid Leader

```txt
I — participer à 1 offensive
II — 5
III — 10
IV — 25
V — 50
LEGEND — 100 offensives
```

---

## E. Défense

### Defender

```txt
I — 10 hexes défendus
II — 100
III — 500
IV — 1 000
V — 5 000
LEGEND — 10 000
```

### Hold The Line

```txt
I — tenir une zone 3 jours
II — 7 jours
III — 14 jours
IV — 30 jours
V — 60 jours
LEGEND — 100 jours
```

### Fortress

```txt
I — 1 cluster protégé
II — 3
III — 10
IV — 25
V — 50
LEGEND — 100 clusters
```

---

## F. Exploration / Pionnier

### Pioneer

```txt
I — 10 hexes pionniers
II — 100
III — 500
IV — 1 000
V — 5 000
LEGEND — 10 000
```

### Pathfinder

```txt
I — 1 nouvelle route
II — 3
III — 10
IV — 25
V — 50
LEGEND — 100 routes
```

### Frontier Runner

```txt
I — 1 zone rurale ouverte
II — 3
III — 10
IV — 25
V — 50
LEGEND — 100 zones
```

---

## G. Routes / Avant-postes

### Route Opened

```txt
I — 1 route ouverte
II — 5
III — 10
IV — 25
V — 50
LEGEND — 100 routes
```

### Outpost Builder

```txt
I — 1 avant-poste créé
II — 3
III — 5
IV — 10
V — 25
LEGEND — 50 avant-postes
```

### Supply Line

```txt
I — 1 route maintenue 7 jours
II — 3 routes
III — 10 routes
IV — 25 routes
V — 50 routes
LEGEND — 100 routes maintenues
```

---

## H. Crew

### Crew Member

```txt
I — rejoindre un crew
II — 5 contributions
III — 25 contributions
IV — 100 contributions
V — 500 contributions
LEGEND — 1 000 contributions
```

### Crew Captain

```txt
I — créer un crew
II — 3 membres actifs
III — 5 membres actifs
IV — 10 membres actifs
V — crew top 10 local
LEGEND — crew #1 saison
```

### United Front

```txt
I — 2 membres actifs même semaine
II — 5
III — 10
IV — 10 membres pendant 4 semaines
V — 10 membres pendant une saison
LEGEND — crew invaincu localement
```

---

## I. Performance

### Pace Progress

```txt
I — améliorer son allure sur 1 mois
II — -10 sec/km
III — -20 sec/km
IV — -30 sec/km
V — -45 sec/km
LEGEND — -60 sec/km
```

### Consistency

```txt
I — 2 semaines actives
II — 4
III — 8
IV — 12
V — 24
LEGEND — 52 semaines
```

### Score Forme

```txt
I — Score Forme 60+
II — 70+
III — 80+
IV — 85+
V — 90+
LEGEND — 95+
```

---

## J. Saisons / Classements

### Season Rank

```txt
Top 100 local
Top 50 local
Top 10 local
Top 3 local
#1 local
Legend season winner
```

### National Rank

```txt
Top 1 000 France
Top 500 France
Top 100 France
Top 50 France
Top 10 France
#1 France
```

### Crew Season

```txt
Top 100 crew
Top 50 crew
Top 10 crew
Top 3 crew
#1 crew local
#1 crew France
```

---

## K. Verified / Fair-play

### GRYD Verified

```txt
I — 10 courses verified
II — 50
III — 100
IV — 250
V — 500
LEGEND — 1 000
```

### Clean Runner

```txt
I — 30 jours sans run rejeté
II — 60
III — 90
IV — 180
V — 365
LEGEND — 2 ans clean
```

---

## L. Badges secrets

Exemples :
- Midnight Runner ;
- Rain Runner ;
- Snow Runner ;
- Heat Runner ;
- Comeback ;
- Solo Wall ;
- Last Minute Defense ;
- Underdog Win ;
- Silent Takeover ;
- Ghost Route ;
- Perfect Week ;
- No Map Run.

Ces badges doivent être cachés jusqu’au déblocage.

---

# 23. Volume cible de badges

Pour un vrai jeu, viser :

```txt
MVP : 60 badges
V1 : 120 badges
V2 : 200+ badges
```

Mais ne pas créer 200 icônes uniques au départ.

Méthode efficace :
- 20 familles d’icônes ;
- 6 niveaux par famille ;
- variation de rareté ;
- variation de couleur ;
- variation de bordure.

Donc avec 20 familles × 6 niveaux :

```txt
120 badges progressifs
```

sans exploser la production design.

---

# 24. Badge UI dans l’app

Chaque badge doit avoir :

```txt
Nom
Famille
Niveau
Rareté
Progression
Condition
Date d’obtention
Saison
Statut public/privé
```

Exemple :

```txt
HEX HUNTER III
Territoire · Race
720 / 1 000 hexes
Récompense : titre “Hex Hunter”
```

---

# 25. Page Badges — UX recommandée

## Haut de page

```txt
Badges
42 / 180 débloqués
Rareté max : Carbon
```

## Filtres

```txt
Tous
Territoire
Performance
Crew
Défense
Exploration
Saison
Secrets
```

## Section progression

```txt
Proches du déblocage
Hex Hunter III — 720 / 1000
Defender II — 82 / 100
Consistency III — 6 / 8 semaines
```

## Section rareté

```txt
Road
Tempo
Race
Carbon
Elite
Legend
```

---

# 26. Prompt badge étendu pour Claude Code

```md
Tu es Lead Product Designer + Game Economy Designer.
Crée le système complet de badges GRYD.

Contraintes :
- 12 familles de badges
- chaque badge progressif a 6 niveaux : ROAD, TEMPO, RACE, CARBON, ELITE, LEGEND
- minimum 120 badges au total
- ne pas créer 120 icônes uniques : créer des familles d’icônes qui évoluent par niveau
- chaque badge a un nom, une condition, une rareté, une progression, une récompense visuelle
- l’univers doit rester running / territoire / crew / premium
- pas de fantasy
- pas de militaire réaliste
- pas de rendu photoréaliste
- compatible mobile app
```

---

# PARTIE E — PRIORITÉ DE BUILD

---

# 27. MVP produit V2

## Pages MVP

1. Onboarding
2. Carte / Battle Map
3. Course Live
4. Résultat de Course
5. War Room
6. Crew HQ
7. Classements
8. Profil
9. Performance
10. Badges
11. Arsenal
12. Sources connectées
13. Paramètres / Vie privée
14. Support course

---

# 28. Landing MVP V2

Sections à construire :

1. Hero Battle State
2. Gameplay Loop
3. France Battle Map
4. War Room
5. Reward Moment
6. Crew Leaderboard
7. Badges & Medals
8. Arsenal Running
9. Performance Impact
10. Connect Your Gear
11. Founder Access
12. FAQ Gameplay

---

# 29. Ce qu’il faut corriger dans la landing actuelle

## Ajouter

- conflit ;
- leaderboard ;
- saison ;
- war room ;
- badges massifs ;
- arsenal ;
- feed live ;
- crews rivaux ;
- carte plus tactique ;
- couleurs rival/contesté ;
- visuel “zone attaquée”.

## Réduire

- impression SaaS ;
- pricing trop classique ;
- cards trop calmes ;
- textes trop institutionnels ;
- grandes zones vides ;
- abstractions.

## Conserver

- dark premium ;
- chartreuse ;
- lisibilité ;
- typographie propre ;
- simplicité ;
- qualité visuelle.

---

# 30. Règle finale

GRYD doit être construit autour de trois mots :

```txt
TERRITOIRE
CREW
SAISON
```

Chaque page doit répondre à au moins une de ces questions :

```txt
Qu’est-ce que je peux prendre ?
Qu’est-ce que je dois défendre ?
Qu’est-ce que mon crew gagne ?
Où suis-je dans la saison ?
Qu’est-ce que je débloque ensuite ?
```

Si une page ne répond à aucune de ces questions, elle doit être supprimée ou fusionnée.

---

# 31. Conclusion

La prochaine version de GRYD doit moins expliquer le concept et davantage mettre le joueur dans l’univers.

La bonne promesse :

```txt
La France est une carte.
Chaque run change une frontière.
Chaque crew peut écrire sa saison.
```

La page Performance doit faire mieux que les concurrents en reliant le sport à la carte.

Les intégrations Garmin / WHOOP / Strava / Health doivent enrichir la performance, mais jamais contourner GRYD Verify.

Le système de badges doit passer de 24 badges de présentation à un vrai système long terme :

```txt
60 badges MVP
120 badges V1
200+ badges V2
```

Phrase finale :

```txt
Strava garde tes runs.
Garmin mesure ton corps.
WHOOP lit ton état.
GRYD transforme ton effort en territoire.
```
