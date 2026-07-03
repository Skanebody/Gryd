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
---

# PARTIE F — LEÇONS SUPERCELL ADAPTÉES À GRYD

## 32. Pourquoi regarder Supercell

Supercell ne crée pas seulement des jeux avec des mécaniques.  
Ils créent des **systèmes sociaux persistants** :

- progression individuelle ;
- progression de clan ;
- rôles ;
- donations / entraide ;
- guerres ;
- événements collectifs ;
- coffres communs ;
- récompenses partagées ;
- statuts visibles ;
- gestion simple des membres ;
- cycles réguliers qui ramènent les joueurs.

Pour GRYD, il ne faut pas copier Clash of Clans, Clash Royale ou Brawl Stars.  
Il faut adapter leurs principes à un univers :

```txt
running réel
territoire
carte
crews
saisons
conquête
défense
performance
anti-triche
```

Règle :

```txt
Ne pas copier les mécaniques Supercell.
Adapter la logique de progression sociale à la conquête par la course.
```

---

# 33. Ce que Supercell fait très bien

## 33.1 Clan XP et perks cumulés

Dans Clash of Clans, un clan gagne de l’XP, monte de niveau et débloque des perks.  
Ces perks sont cumulatifs : les nouveaux avantages s’ajoutent aux anciens. Certains perks touchent les donations, les récompenses de guerre ou des éléments visuels comme les bordures du badge de clan.

### Leçon pour GRYD

Un crew ne doit pas être uniquement un groupe de joueurs.  
Il doit avoir :

```txt
un niveau
une XP
des perks
un badge évolutif
une réputation
une histoire de saison
```

Le joueur doit vouloir rejoindre un crew fort, mais aussi avoir envie de construire son propre crew dans la durée.

---

## 33.2 Badge de clan évolutif

Supercell fait évoluer les bordures et l’apparence du badge de clan avec le niveau du clan.

### Leçon pour GRYD

Le blason de crew doit évoluer visuellement.

Exemple :

```txt
Crew Level 1 — bordure simple
Crew Level 5 — bordure renforcée
Crew Level 10 — bordure Carbon
Crew Level 15 — bordure Elite
Crew Level 20 — bordure Legend
```

Le badge crew doit être un symbole social fort.

---

## 33.3 Rôles simples mais puissants

Dans les clans Supercell, les membres ont des rangs. Les jeux utilisent des niveaux de permission clairs : membre, ancien, co-leader, leader. Les rôles déterminent ce que chacun peut faire dans la gestion du clan.

### Leçon pour GRYD

GRYD doit avoir des rôles simples, mais adaptés au territoire :

```txt
Runner
Scout
Raider
Defender
Captain
Co-Captain
Leader
```

Chaque rôle doit avoir une utilité dans la War Room.

---

## 33.4 Wars et opt-in

Dans Clash of Clans, les leaders / co-leaders peuvent lancer une guerre, sélectionner les participants, et les joueurs peuvent indiquer leur disponibilité pour la guerre.

### Leçon pour GRYD

GRYD doit éviter de forcer des joueurs casuals dans des offensives.

Ajouter un statut :

```txt
Disponible pour guerre
Non disponible
Défense seulement
Exploration seulement
```

Le Captain choisit ensuite l’escouade.

---

## 33.5 Phase de préparation

Clash of Clans donne une phase de préparation / scouting avant la bataille.

### Leçon pour GRYD

Chaque offensive crew doit avoir une phase de préparation :

```txt
Préparation
→ choix de la zone
→ estimation hexes
→ membres assignés
→ routes proposées
→ objectifs
→ notifications
→ fenêtre d’attaque
```

Cela rend l’offensive plus stratégique qu’un simple “allez courir”.

---

## 33.6 Clan Capital / base commune

Clash of Clans utilise une logique de Clan Capital : les joueurs contribuent des ressources à des districts / bâtiments communs, et tous les membres peuvent contribuer à l’amélioration.

### Leçon pour GRYD

Créer un système équivalent mais adapté :

```txt
Crew HQ
Outposts
Districts
Routes
Supply Lines
Crew Projects
```

Au lieu de construire des bâtiments fantasy, les membres contribuent à :

- renforcer le QG ;
- maintenir un avant-poste ;
- ouvrir une route ;
- protéger un secteur ;
- débloquer une skin crew ;
- améliorer le blason ;
- préparer une offensive ;
- débloquer des missions crew.

---

## 33.7 Raid Weekend / événements collectifs courts

Supercell utilise des événements collectifs limités dans le temps, comme les raids, pour créer un pic d’activité.

### Leçon pour GRYD

Créer des événements récurrents :

```txt
Weekend Raid
Crew Offensive
Defense Window
Pioneer Weekend
City Clash
```

Ces événements doivent être courts, lisibles et fortement partageables.

---

## 33.8 Récompenses partagées

Dans Brawl Stars, les clubs remplissent une Méga Tirelire / Mega Pig avec des victoires lors d’événements de club. L’idée importante : l’effort collectif remplit une récompense commune.

### Leçon pour GRYD

Créer un :

```txt
Crew Chest
```

ou :

```txt
War Chest
```

Le coffre se remplit par :
- hexes capturés ;
- hexes défendus ;
- routes ouvertes ;
- participation offensive ;
- activité collective ;
- missions crew.

Mais la récompense doit rester non pay-to-win.

---

## 33.9 Donations / entraide

Clash Royale permet aux membres de demander et donner des cartes à intervalle régulier. Clash of Clans utilise aussi la logique de renforts / donations.

### Leçon pour GRYD

Adapter la donation à la course sans vendre de territoire.

Système recommandé :

```txt
Requests & Reinforcements
```

Un membre peut demander :

```txt
Besoin de défense sur République
Besoin de 3 km pour finir la route
Besoin d’un scout sur Canal
Besoin d’aide pour le coffre hebdo
```

Les autres membres ne donnent pas des hexes.  
Ils donnent :
- leur présence ;
- une course ;
- des Foulées gagnées ;
- un Scout token gagné ;
- un boost cosmétique crew ;
- une contribution de mission.

---

## 33.10 Recherche de clan lisible

Clash Royale affiche des indicateurs pour aider à trouver un clan actif : guerre active, donations actives, amis présents.

### Leçon pour GRYD

La recherche de crews doit afficher des signaux rapides :

```txt
War Active
Runs Weekly
Defense Active
Social Chat
Beginner Friendly
Competitive
Pioneer Crew
City Crew
```

Cela évite que les joueurs rejoignent un crew mort.

---

# 34. Système Crew GRYD inspiré de Supercell

## 34.1 Crew Level

Chaque crew possède :

```txt
Crew XP
Crew Level
Crew Reputation
Crew Badge Frame
Crew Perks
Crew History
```

### Sources d’XP crew

```txt
Courses validées
Hexes capturés
Hexes défendus
Offensives terminées
Routes ouvertes
Avant-postes maintenus
Missions crew
Participation semaine
Fair-play / verified runs
```

### Plafonds anti-farm

Pour éviter les abus :

```txt
XP crew quotidienne plafonnée par joueur
XP réduite sur doublons de route
XP réduite si activité suspecte
XP bonus sur objectifs variés
```

---

## 34.2 Crew Levels recommandés

### MVP

```txt
Level 1 à 10
```

### V1

```txt
Level 1 à 20
```

### V2

```txt
Level 1 à 50
```

Mais la puissance compétitive doit rester plafonnée.

---

## 34.3 Crew XP Table MVP

| Level | XP cumulée | Statut |
|---:|---:|---|
| 1 | 0 | Crew créé |
| 2 | 1 000 | Crew actif |
| 3 | 3 000 | Blason amélioré |
| 4 | 7 500 | War Room débloquée |
| 5 | 15 000 | 1er perk crew |
| 6 | 30 000 | Avant-postes |
| 7 | 60 000 | Missions avancées |
| 8 | 100 000 | Coffre crew amélioré |
| 9 | 175 000 | Badge frame Carbon |
| 10 | 300 000 | Crew Elite Saison |

---

# 35. Crew Perks GRYD

Les perks doivent être utiles, mais jamais pay-to-win.

## Règle

Ne jamais donner :

```txt
+ territoire automatique
+ vitesse de capture injuste
+ bonus de points illimité
+ protection permanente
```

Donner plutôt :

```txt
meilleure organisation
meilleure lisibilité
cosmétique
récompenses capées
templates de partage
missions supplémentaires
statut
```

---

## 35.1 Perks recommandés

### Level 2 — Crew Marker

```txt
Possibilité de marquer une zone prioritaire par semaine.
```

Utilité :
- guide les membres ;
- pas d’avantage direct ;
- renforce stratégie.

---

### Level 3 — Badge Frame I

```txt
Bordure de blason crew améliorée.
```

Effet :
- purement statutaire.

---

### Level 4 — War Room Basic

```txt
Débloque la War Room crew.
```

Permet :
- assigner zones ;
- voir objectifs ;
- afficher decay urgent ;
- créer missions internes.

---

### Level 5 — Weekly Crew Chest

```txt
Débloque un coffre hebdomadaire crew.
```

Récompenses :
- Foulées ;
- skins ;
- fragments ;
- badges ;
- objets capés.

---

### Level 6 — Outpost Slot I

```txt
1 avant-poste crew actif.
```

Condition :
- activité réelle dans une zone ;
- maintien hebdomadaire ;
- pas achetable.

---

### Level 7 — Scout Ping

```txt
1 analyse de zone par semaine.
```

Effet :
- détecte zones faibles ;
- affiche potentiel ;
- pas de capture automatique.

---

### Level 8 — Share Templates Crew

```txt
Templates sociaux premium crew.
```

Effet :
- acquisition organique ;
- statut ;
- pas de gameplay direct.

---

### Level 9 — Badge Frame Carbon

```txt
Bordure Carbon visible sur classement et profil crew.
```

Effet :
- statut.

---

### Level 10 — War Banner

```txt
1 bannière offensive par saison.
```

Effet :
- active une offensive crew limitée ;
- récompenses capées ;
- pas d’achat de victoire.

---

# 36. Crew Roles GRYD

## 36.1 Runner

Rôle par défaut.

Peut :
- courir ;
- capturer ;
- défendre ;
- contribuer ;
- participer aux missions ;
- envoyer des messages ;
- partager des résultats.

Ne peut pas :
- lancer offensive ;
- changer paramètres crew ;
- exclure membres ;
- activer objets crew majeurs.

---

## 36.2 Scout

Rôle tactique.

Peut :
- proposer routes ;
- marquer zones à potentiel ;
- créer “Scout Reports” ;
- ping une zone ;
- recommander des courses.

Ne peut pas :
- lancer offensive officielle ;
- utiliser ressources crew majeures.

---

## 36.3 Defender

Rôle défense.

Peut :
- assigner zones à défendre ;
- activer alertes défense ;
- proposer bouclier si disponible ;
- créer missions “Hold the Line”.

---

## 36.4 Raider

Rôle attaque.

Peut :
- proposer attaques ;
- rejoindre offensives ;
- ping faiblesses ennemies ;
- créer routes d’attaque.

---

## 36.5 Captain

Rôle manager terrain.

Peut :
- créer missions crew ;
- assigner membres ;
- lancer petites offensives ;
- valider routes ;
- gérer War Room quotidienne.

---

## 36.6 Co-Captain

Rôle gestion avancée.

Peut :
- inviter / accepter membres ;
- lancer offensives majeures ;
- gérer roles jusqu’à Captain ;
- activer objets crew ;
- modifier objectifs.

---

## 36.7 Leader

Rôle fondateur / propriétaire.

Peut tout faire :
- transférer leadership ;
- changer nom / blason ;
- gérer membres ;
- lancer saison crew ;
- déclarer offensive majeure ;
- fermer / ouvrir crew.

---

# 37. Gestion des membres

## 37.1 Paramètres crew

Chaque crew doit avoir :

```txt
Nom
Tag
Ville principale
Pays
Description
Blason
Couleur secondaire
Statut : ouvert / sur demande / fermé
Niveau minimum
Objectif : casual / compétitif / pionnier
Langue
Règles internes
```

---

## 37.2 Statuts de disponibilité

Chaque membre peut choisir :

```txt
Disponible pour guerre
Défense seulement
Exploration
Casual cette semaine
Absent
Blessé / pause
```

Utilité :
- éviter pression sociale excessive ;
- améliorer sélection offensive ;
- protéger les joueurs casuals.

---

## 37.3 Activité membre

Afficher :
- dernière course ;
- contribution semaine ;
- hexes crew ;
- défenses ;
- disponibilité ;
- rôle ;
- fiabilité GRYD Verify ;
- participation missions.

Ne pas afficher :
- position live ;
- données santé ;
- domicile ;
- fréquence cardiaque précise.

---

## 37.4 Gestion des membres inactive

Système doux :

```txt
Actif
Risque inactivité
Inactif 14 jours
Inactif 30 jours
```

Actions :
- reminder ;
- déplacement en réserve ;
- proposition de remplacement ;
- pas de shame public.

---

# 38. War Room Supercell-like adaptée

La War Room est l’équivalent GRYD du centre de guerre.

## 38.1 Onglets War Room

```txt
À faire
Offensives
Défense
Routes
Scout Reports
Coffre Crew
Historique
```

---

## 38.2 Offensive crew

Une offensive suit 4 phases :

```txt
1. Préparation
2. Fenêtre active
3. Résultat
4. Reward / partage
```

### Phase 1 — Préparation

Le Captain choisit :
- zone cible ;
- objectif hexes ;
- durée ;
- membres ;
- routes ;
- récompense ;
- stratégie.

Exemple :

```txt
Offensive République
Objectif : +800 hexes
Durée : 24 h
Participants : 6 / 10
Risque : élevé
Récompense : Crew Chest progress + badge
```

### Phase 2 — Active

Afficher :
- progression ;
- membres actifs ;
- hexes pris ;
- temps restant ;
- rivalité ;
- leaderboard interne.

### Phase 3 — Résultat

```txt
Victoire
Échec
Partiel
Overtime
```

### Phase 4 — Reward

- XP crew ;
- coffre ;
- badges ;
- share card ;
- contribution individuelle.

---

## 38.3 Défense crew

Défense structurée :

```txt
Zones sous pression
Hexes en decay
Zones attaquées
Boucliers disponibles
Membres proches
```

Actions :
- assigner Defender ;
- créer mission défense ;
- activer Shield ;
- envoyer notification.

---

## 38.4 Scout Reports

Le Scout peut générer un rapport :

```txt
Zone : Canal Saint-Martin
Contrôle rival : 58 %
Hexes faibles : 184
Distance recommandée : 4,2 km
Fenêtre idéale : dimanche matin
Risque : moyen
```

Ce rapport devient une mission.

---

# 39. Crew Chest / War Chest

## 39.1 Principe

Récompense collective hebdomadaire / événementielle.

Le coffre se remplit par :

```txt
hexes capturés
hexes défendus
offensives
routes ouvertes
missions complétées
participation vérifiée
```

---

## 39.2 Paliers

```txt
Bronze Chest — 25 %
Silver Chest — 50 %
Gold Chest — 75 %
Carbon Chest — 100 %
Elite Chest — 150 %
Legend Chest — événement spécial
```

---

## 39.3 Récompenses possibles

- Foulées ;
- fragments cosmétiques ;
- skins territory ;
- skins trace ;
- badges crew ;
- objets capés ;
- templates share ;
- XP crew ;
- emblèmes.

Pas de :
- hexes gratuits ;
- points classement directs illimités ;
- victoire achetable.

---

## 39.4 Distribution

Chaque membre reçoit selon :
- participation ;
- fiabilité des runs ;
- contribution ;
- présence minimale ;
- rôle éventuel.

Exemple :

```txt
Participation minimale : 1 course validée
Bonus contribution : top 3 contributeurs
Bonus défense : defenders
Bonus scout : rapport utilisé
```

---

# 40. Donations / Requests adaptés à GRYD

## 40.1 Pas de donation de territoire

Interdit :

```txt
donner des hexes
donner des kilomètres
donner des points classement
```

---

## 40.2 Requests autorisées

Un membre peut demander :

```txt
Défense sur zone
Aide pour route
Scout report
Participation offensive
Renfort de crew chest
Conseil itinéraire
```

---

## 40.3 Contributions autorisées

Un membre peut contribuer :

```txt
Foulées gagnées
Scout token gagné
Shield token crew gagné
Route proposal
Mission completion
Run verified
```

Les ressources doivent être gagnées par l’activité, pas achetables directement pour gagner.

---

# 41. Matchmaking crew

Pour éviter qu’un crew dominant écrase tout le monde, les conflits doivent être pondérés.

## Variables de matchmaking

```txt
Crew Level
membres actifs 7 jours
membres actifs 30 jours
volume km
hexes capturés
territoire contrôlé
fiabilité moyenne
zone density
historique victoires
```

---

## Modes

### Local Battle

Même ville / même zone.

### Regional Clash

Même région.

### Pioneer Race

Crews ruraux / exploration.

### National Season

Classement France.

### Friendly Challenge

Défi sans impact classement.

---

# 42. Système de leagues crew

Inspiré des ligues / wars, adapté GRYD.

## Leagues recommandées

```txt
Road League
Tempo League
Race League
Carbon League
Elite League
Legend League
```

Critères :
- score saison ;
- crew activity ;
- territoire ;
- participation ;
- fair-play.

---

## Rewards de ligue

- badge saison ;
- frame crew ;
- poster ;
- coffre ;
- templates share ;
- titre profil.

Pas de boost territoire permanent.

---

# 43. Badges de niveaux façon Supercell adaptés à GRYD

Il faut deux axes :

```txt
Player Level Badges
Crew Level Badges
```

---

## 43.1 Player Level Badges

Chaque joueur a un niveau global :

```txt
Runner Level
```

XP gagnée par :
- courses validées ;
- captures ;
- défenses ;
- badges ;
- missions ;
- crew contribution ;
- fair-play.

### Tiers visuels

```txt
Level 1–9 : Road
Level 10–19 : Tempo
Level 20–29 : Race
Level 30–39 : Carbon
Level 40–49 : Elite
Level 50+ : Legend
```

### Effet visuel

- avatar frame ;
- profil ;
- share cards ;
- leaderboard ;
- badge profile.

---

## 43.2 Crew Level Badges

Chaque crew a un blason évolutif.

### Tiers

```txt
Crew Level 1–4 : Road Frame
Crew Level 5–9 : Tempo Frame
Crew Level 10–14 : Race Frame
Crew Level 15–19 : Carbon Frame
Crew Level 20–29 : Elite Frame
Crew Level 30+ : Legend Frame
```

### Effets

- bordure blason ;
- animation sur profil crew ;
- share card crew ;
- badge sur leaderboard ;
- War Room header.

---

## 43.3 Badge level-up animation

Quand un joueur ou crew passe de niveau :

```txt
LEVEL UP
Runner Level 18 → 19
```

ou :

```txt
CREW LEVEL UP
Night Pacers
Level 8 → 9
Badge Frame Carbon débloqué
```

Animation :
- ancien cadre se fissure / se dématérialise ;
- nouveau cadre se dessine ;
- glow selon tier ;
- haptic moyen ;
- CTA partager.

---

# 44. Crew Achievements

Créer des achievements collectifs.

## Territoire

```txt
First Sector
10 000 Hexes
City Control
District Dominance
France Top 100
```

## Défense

```txt
Hold 7 Days
Hold 30 Days
Shield Wall
No Decay Week
```

## Attaque

```txt
First Raid
1000 Reclaimed
Perfect Offensive
Comeback Win
```

## Exploration

```txt
First Outpost
10 Outposts
Route Network
Pioneer Region
```

## Social

```txt
10 Active Members
Perfect Week
All Members Ran
Crew Anniversary
```

---

# 45. Crew Activity Score

Créer un score de santé de crew, visible sur la recherche.

```txt
Crew Activity Score
```

Composition :

```txt
30 % membres actifs 7 jours
20 % runs vérifiés
20 % missions complétées
15 % chat / coordination
10 % défense
5 % fair-play
```

Statuts :

```txt
Dormant
Casual
Active
Competitive
War Ready
```

---

# 46. Crew Discovery

Page pour trouver un crew.

## Filtres

```txt
Ville
Pays
Langue
Niveau
Casual / compétitif
War Active
Pioneer
Beginner Friendly
Open / request
```

## Cards crew

Chaque card affiche :

```txt
Nom
Blason
Level
League
Membres actifs
Ville principale
War Active oui/non
Defense Active oui/non
Weekly Runs
Open spots
```

---

# 47. Interactions entre crews

## 47.1 Attaquer une zone

Un crew peut cibler une zone contrôlée par un autre crew.

Conditions :
- zone active ;
- densité suffisante ;
- pas de bouclier actif ;
- membres disponibles ;
- fenêtre d’offensive.

---

## 47.2 Défier un crew

Mode friendly ou classé.

```txt
Crew Challenge
```

Types :
- plus d’hexes en 24 h ;
- meilleure défense ;
- plus longue route ;
- plus de membres actifs ;
- capture d’une zone neutre.

---

## 47.3 Rivalités

Si deux crews se croisent souvent, créer une rivalité automatique.

```txt
Rivalité détectée
Night Pacers vs Canal Crew
```

Effets :
- page rivalité ;
- historique ;
- stats ;
- share card ;
- badges rivalry.

---

## 47.4 Alliances

À éviter en MVP.

Raison :
- complexifie ;
- risque collusion ;
- risque farming ;
- moins lisible.

V2 possible :
- pacte temporaire ;
- événement régional ;
- alliance non classée.

---

## 47.5 War Feed

Flux d’événements entre crews :

```txt
Canal Crew attaque République
Night Pacers défend Paris Est
Bastille Runners ouvre une route
Rouen Run Club passe #1 Normandie
```

Ce feed doit alimenter :
- War Room ;
- notifications ;
- share cards ;
- landing page.

---

# 48. Notifications crew inspirées Supercell

## Types

```txt
Offensive lancée
Préparation ouverte
Défense urgente
Coffre crew presque plein
Membre a débloqué un badge
Crew level up
Rival a repris une zone
Scout report disponible
```

## Limites

- max 2 push / jour hors événements suivis ;
- groupées ;
- pas de position live ;
- quiet hours ;
- opt-in par type.

---

# 49. Season System façon Supercell adapté

Supercell crée des cycles réguliers de retour.  
GRYD doit faire pareil avec la Saison.

## Saison GRYD

```txt
8 semaines
classements
badges saisonniers
crew chest
offensives
rank final
reset territoire
statut conservé
```

## À conserver après reset

- badges ;
- niveau joueur ;
- niveau crew ;
- blason ;
- historique ;
- records ;
- titres ;
- médailles ;
- réputation.

## À reset

- ownership hexes ;
- classement saison ;
- locks ;
- decay ;
- boucliers actifs ;
- objectifs temporaires.

---

# 50. Pages à modifier avec ces mécaniques

## Crew HQ

Ajouter :
- Crew Level ;
- Crew XP ;
- Crew Perks ;
- Badge Frame ;
- Activity Score ;
- Roles ;
- War Availability ;
- Crew Chest ;
- Crew Achievements.

## War Room

Ajouter :
- phase préparation ;
- roster ;
- scout reports ;
- offensive progress ;
- defense missions ;
- crew chest progress ;
- rival feed.

## Profil

Ajouter :
- Runner Level ;
- avatar frame ;
- titles ;
- crew role ;
- player contribution ;
- unlocked perks via crew ;
- badges Supercell-like.

## Badges

Ajouter :
- Player Level badges ;
- Crew Level badges ;
- Crew Achievements ;
- Role badges ;
- Rivalry badges.

## Classements

Ajouter :
- crew leagues ;
- war ranking ;
- activity ranking ;
- pioneer ranking ;
- rivalry ranking.

## Sources connectées

Afficher impact sur :
- contribution crew ;
- GRYD Verify ;
- eligibility for crew wars.

---

# 51. MVP adapté Supercell

## À implémenter au MVP

```txt
Crew Level 1–10
Crew XP
Crew Roles simples
Crew Chest hebdomadaire
War Room Basic
War Availability
Crew Activity Score
Crew Badge Frame évolutif
Crew Discovery avec signaux d’activité
Offensive simple 24 h
Defense missions
Player Level 1–50
Badge unlock / level up animation
```

## À attendre V1

```txt
Crew Leagues
Rivalries
Scout Reports avancés
Outpost Projects
Crew Achievements avancés
Raid Weekend
Crew Challenge
Public Crew Page
Advanced Crew Perks
```

## À attendre V2

```txt
Alliances temporaires
Season Hall of Fame
Animated crew war recaps
Inter-city tournaments
Sponsor crew events
Legend League
```

---

# 52. Règles anti-pay-to-win

Comme GRYD est compétitif, les systèmes Supercell-like doivent être strictement encadrés.

## Interdit

```txt
acheter des hexes
acheter des kilomètres
acheter une victoire
acheter un score crew
acheter un classement
acheter une protection permanente
acheter des runs
```

## Autorisé

```txt
cosmétiques
templates share
badge frames
skins territoire
skins trace
objets capés
confort d’organisation
stats avancées
Pass rewards non décisifs
```

## Principe

```txt
L’argent améliore le statut et l’expression.
L’effort réel décide la carte.
```

---

# 53. Prompt Claude Code — Crew System Supercell-like

```md
Tu es Lead Game Designer + Mobile Product Architect.

Implémente un système de crews GRYD inspiré des meilleurs principes Supercell, mais adapté à une app de conquête territoriale par la course.

## Objectifs
- Créer des crews qui progressent dans le temps.
- Ajouter Crew XP, Crew Level, Crew Perks et Crew Badge Frames.
- Ajouter des rôles avec permissions.
- Ajouter War Room, offensives, défense, scout reports, availability.
- Ajouter Crew Chest hebdomadaire.
- Ajouter Crew Discovery avec signaux d’activité.
- Ajouter Player Level badges et Crew Level badges.
- Ajouter animations de level up, badge unlock, crew chest, rank up.

## Contraintes
- Pas de pay-to-win.
- Pas d’achat de territoire.
- Pas d’achat de kilomètres.
- Pas de position live.
- Toutes les activités doivent passer GRYD Verify pour contribuer au territoire.
- Le système doit fonctionner en ville et en campagne.
- L’UX doit rester simple mobile-first.

## Pages à créer / modifier
- Crew HQ
- War Room
- Crew Discovery
- Crew Settings
- Member Profile
- Badges
- Classements
- Résultat de course
- Share Cards

## Rôles
Runner, Scout, Defender, Raider, Captain, Co-Captain, Leader.

## Crew Perks MVP
- Crew Marker
- Badge Frame
- War Room Basic
- Weekly Crew Chest
- Outpost Slot
- Scout Ping
- Share Templates Crew
- War Banner

## Crew events MVP
- Offensive 24 h
- Defense Mission
- Weekly Crew Chest
- Pioneer Route
- Friendly Challenge
```

---

# 54. Conclusion Supercell → GRYD

La vraie leçon de Supercell n’est pas seulement “faire des badges”.  
C’est de créer une boucle sociale persistante :

```txt
Je joue pour moi.
Je contribue à mon crew.
Mon crew progresse.
Mon crew débloque des statuts.
On prépare une attaque.
On gagne une récompense.
On partage.
On revient demain.
```

Adapté à GRYD :

```txt
Je cours.
Je capture.
Je défends.
Je contribue à mon crew.
Mon crew monte de niveau.
Notre blason évolue.
On prépare une offensive.
On gagne un coffre.
On partage la conquête.
La saison continue.
```

Phrase finale :

```txt
Supercell fait progresser les clans par le jeu.
GRYD doit faire progresser les crews par l’effort réel.
```
