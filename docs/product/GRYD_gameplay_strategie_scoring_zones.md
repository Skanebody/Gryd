# GRYD — Gameplay avancé : attaques, stratégie, scoring, zones et densité

## Objectif du document

Ce document complète les prompts précédents de GRYD.

Il regroupe les mécaniques de gameplay discutées après les premiers prompts Markdown :
- gestion des attaques ;
- notifications ;
- courses seules ;
- courses à plusieurs ;
- attaques live ;
- attaques décalées ;
- scoring ;
- rôle de la performance ;
- stratégie ;
- gestion des zones peu denses ;
- avant-postes ;
- ligues ;
- contribution crew ;
- adaptation ville/campagne.

Nom public : **GRYD**  
Baseline : **Cours. Capture. Défends.**  
Positionnement : **Le jeu de conquête de territoire pour run clubs.**

---

# 1. Principe général

GRYD ne doit pas être seulement :

> Je cours, je prends des hexagones.

Le vrai produit doit être :

> Je choisis où courir, quand courir, avec qui courir, quoi défendre, quoi attaquer, quoi sacrifier.

La boucle cœur :

```txt
courir → capturer → gagner → partager → se faire voler → revenir → défendre → progresser
```

La hiérarchie de game design :

```txt
Le rapide gagne un petit bonus.
Le régulier prend du terrain.
Le crew organisé contrôle la ville.
```

---

# 2. Définition d’une attaque

Dans GRYD, une attaque n’est pas forcément un bouton.

Une attaque est :

> Une course valide qui traverse un territoire adverse capturable.

Il y a deux niveaux d’attaque :

1. **Attaque passive**  
   Le joueur court normalement et traverse des hexes ennemis.

2. **Offensive déclarée**  
   Le crew cible une zone et plusieurs membres courent pour la reprendre.

Règle centrale :

```txt
Dernier passage valide prend l’hex,
sauf si :
- lock actif ;
- bouclier actif ;
- protection nouveau joueur ;
- zone privée ;
- course rejetée ou flaggée.
```

---

# 3. Types d’attaques

## 3.1 Attaque opportuniste

Cas normal.

Exemple :
- Benjamin court à République.
- Il traverse 20 hexes neutres, 12 hexes ennemis, 8 hexes déjà à son crew.

Résultat :
- 20 hexes capturés ;
- 12 hexes volés ;
- 8 hexes défendus.

Aucune déclaration nécessaire.  
Le jeu reste fluide.

---

## 3.2 Attaque ciblée solo

Depuis la carte, l’utilisateur appuie sur une zone ennemie.

L’app affiche :

```txt
Zone détenue par Crew Bastille
84 hexes capturables
Verrou levé
Gain estimé : +1 240 pts
```

CTA :

```txt
Reprendre cette zone
```

Important :
- ne pas proposer un itinéraire vers une personne ;
- ne pas exposer d’adresse ;
- ne jamais montrer la position live d’un adversaire ;
- proposer uniquement une zone publique.

---

## 3.3 Offensive crew en live

Un membre ou leader lance une offensive courte :

```txt
Raid sur Bastille — 45 min
```

Pendant la fenêtre, tous les membres du crew peuvent contribuer.

L’app affiche :
- progression collective ;
- hexes repris ;
- membres actifs ;
- zone cible ;
- temps restant.

Ne jamais afficher la position exacte des membres.

Afficher seulement :
- “3 membres actifs dans l’offensive” ;
- “+42 hexes repris par le crew” ;
- “Zone contestée en direct”.

---

## 3.4 Offensive décalée

Format principal recommandé.

Le leader crée une offensive :

```txt
Objectif : reprendre Canal Saint-Martin avant dimanche 20h.
```

Durées possibles :
- 6 h ;
- 24 h ;
- 72 h ;
- week-end ;
- semaine.

Chaque membre court quand il veut.  
Les contributions s’additionnent.

Avantages :
- compatible avec les emplois du temps ;
- plus inclusif ;
- plus simple à gérer ;
- meilleur pour la rétention ;
- moins dangereux qu’un raid live permanent.

---

## 3.5 Défense

La défense est l’inverse de l’attaque.

Quand un joueur repasse sur ses propres hexes :
- il gagne des points de défense ;
- il repousse le decay ;
- il renforce l’attachement à son territoire.

La défense doit être moins rémunératrice que l’attaque, mais donner du prestige.

Exemples de titres :
- Gardien de République ;
- Défenseur du Canal ;
- Zone tenue 14 jours ;
- Protecteur du QG.

---

# 4. Courses seules

Une course seule doit rester viable.

Le joueur solo peut :
- capturer des hexes neutres ;
- voler des hexes ennemis ;
- défendre son territoire ;
- monter son niveau ;
- gagner des Foulées ;
- progresser dans le Pass ;
- apparaître au classement joueur.

Mais il sera naturellement moins puissant qu’un crew.

Phrase produit :

```txt
Seul, tu prends des rues.
En crew, tu prends la ville.
```

---

# 5. Courses à plusieurs en même temps

## 5.1 Plusieurs membres du même crew courent ensemble

Problème à éviter :
- multiplier artificiellement les points parce que 5 membres passent sur le même hex.

Règle recommandée :

```txt
Si plusieurs membres du même crew passent sur le même hex dans une fenêtre courte,
l’hex n’est capturé qu’une seule fois.
```

Récompense :
- le premier capture l’hex normalement ;
- les suivants reçoivent une récompense personnelle réduite ;
- le groupe reçoit XP/Foulées/coffre crew ;
- le territoire n’est pas multiplié.

Exemple :
- premier membre : +10 ou +15 pts ;
- deuxième membre dans les 10 minutes : +1 XP / contribution crew ;
- pas de double capture.

---

## 5.2 Deux crews attaquent la même zone

Règle :

```txt
Chaque hex appartient au dernier passage valide,
sauf lock ou bouclier.
```

Exemple :
- Crew A passe à 18h02 → prend l’hex.
- Lock 24 h activé.
- Crew B passe à 18h10 → ne peut pas reprendre.

Le lock évite le ping-pong.

---

## 5.3 Course de groupe physique

Si 5 personnes courent ensemble dans la vraie vie, il faut les récompenser sans casser le jeu.

Mécanique :

```txt
Bonus sortie groupée
```

Conditions :
- 2 à 10 membres du même crew ;
- même zone approximative ;
- fenêtre de 15 minutes.

Récompenses :
- bonus XP ;
- bonus Foulées ;
- coffre crew ;
- badge social ;
- progression objectif crew.

Interdit :
- x5 points de territoire ;
- x5 hexes ;
- x5 vol.

Le territoire est pris une fois.  
Le collectif est récompensé ailleurs.

---

# 6. Attaques live

## 6.1 Nom recommandé

```txt
Raid Live
```

## 6.2 Durée

- 30 minutes ;
- 45 minutes ;
- 60 minutes maximum.

## 6.3 Déclenchement

- leader ;
- officier ;
- membre autorisé.

## 6.4 Coût possible

- 1 raid gratuit par semaine ;
- artefact “Bannière d’offensive” pour en lancer plus ;
- aucun bonus de points direct.

## 6.5 Écran Raid Live

```txt
Raid sur Bastille
18 membres mobilisés
284 / 600 hexes repris
31 min restantes
```

CTA :

```txt
Courir pour le raid
```

## 6.6 Règles de sécurité

Ne jamais afficher :
- position exacte d’un joueur ;
- trajectoire live d’un membre ;
- adresse ;
- domicile ;
- localisation d’un adversaire.

Afficher :
- progression ;
- zone ;
- nombre de membres actifs ;
- score collectif.

---

# 7. Attaques décalées

## 7.1 Nom recommandé

```txt
Offensive
```

## 7.2 Durées

- 6 h ;
- 24 h ;
- 72 h ;
- week-end.

## 7.3 Exemple

```txt
Offensive Canal
Objectif : reprendre 800 hexes avant dimanche 20h.
```

## 7.4 Contribution

Chaque course dans la zone cible contribue.

Critères :
- hexes repris ;
- hexes défendus ;
- membres participants ;
- distance dans la zone ;
- nombre de runs ;
- taux de réussite ;
- maintien après offensive.

## 7.5 Récompenses

- coffre crew ;
- XP crew ;
- Foulées ;
- badge ;
- bannière de victoire ;
- template de partage.

Pas de multiplicateur excessif sur les points de classement.

---

# 8. Notifications

## 8.1 Philosophie

Les notifications doivent être :
- rares ;
- utiles ;
- actionnables ;
- groupées ;
- non anxiogènes.

Règle recommandée :

```txt
Maximum 2 notifications push par jour,
sauf course active ou événement explicitement suivi.
```

Quiet hours :
- pas de notification de tension entre 21h et 8h ;
- digest possible à heure raisonnable.

---

## 8.2 Types de notifications

### Vol subi

```txt
Ton territoire à République vient de tomber.
Crew Bastille a repris 18 hexes.
```

CTA :

```txt
Reprendre
```

Condition :
- seulement si la zone est significative ;
- pas pour chaque hex isolé.

---

### Offensive crew

```txt
Ton crew lance une offensive sur Canal.
Objectif : 600 hexes avant 20h.
```

CTA :

```txt
Rejoindre
```

---

### Raid live

```txt
Raid en cours : Bastille est contestée.
31 min restantes.
```

CTA :

```txt
Courir maintenant
```

À utiliser avec prudence.

---

### Decay

```txt
Ton quartier s’efface dans 3 jours.
Repasse dessus pour le défendre.
```

CTA :

```txt
Défendre
```

---

### Streak

```txt
Il te manque 1 course pour garder ta série.
```

CTA :

```txt
Lancer une course
```

---

### Digest crew

```txt
Résumé du crew
+1 240 hexes, 3 zones perdues, 1 offensive gagnée.
```

CTA :

```txt
Voir le crew
```

---

## 8.3 Notifications interdites

Ne jamais envoyer :
- “Untel est près de toi” ;
- “Va courir maintenant sinon tu perds tout” ;
- “Tu as été attaqué 47 fois” ;
- une notification après chaque micro-vol ;
- une notification de tension la nuit ;
- un push qui expose une position humaine.

Il faut créer de la tension, pas de l’anxiété.

---

# 9. Scoring global

Il faut séparer les scores pour éviter la confusion.

## 9.1 Score territoire

Score principal de saison.

Il mesure :
- hexes neutres capturés ;
- hexes ennemis volés ;
- hexes défendus ;
- zones pionnières ;
- contribution aux objectifs crew.

Utilisé pour :
- classement joueur ;
- classement crew ;
- progression saison.

---

## 9.2 Score performance

Score sportif séparé.

Il mesure :
- distance ;
- allure ;
- régularité ;
- fréquence ;
- progression personnelle ;
- éventuellement dénivelé plus tard.

Il ne doit pas dominer le classement territoire.

---

## 9.3 Score crew

Score collectif.

Il mesure :
- hexes apportés au crew ;
- participation aux offensives ;
- défenses ;
- invitations ;
- objectifs atteints ;
- courses groupées ;
- avant-postes ;
- routes reliées.

---

## 9.4 Score réputation

Score permanent du profil.

Il mesure :
- saisons jouées ;
- badges ;
- titres ;
- posters ;
- niveau ;
- contributions historiques ;
- fair-play ;
- absence de triche.

Important :
- la carte peut reset ;
- la réputation reste.

---

# 10. Formule de scoring territoire

Base recommandée :

```txt
+10 pts par hex neutre
+15 pts par hex volé
+3 pts par hex défendu, max 1 fois / 24 h / hex
+5 pts bonus pionnier si l’hex n’a jamais été possédé
```

Formule :

```txt
Score course =
Points territoire bruts
× Multiplicateur zone
× Multiplicateur streak
× Modificateur performance plafonné
× Modificateur anti-abus
```

Exemple :

```txt
40 hexes neutres = 400 pts
12 hexes volés = 180 pts
20 hexes défendus = 60 pts
5 hexes pionniers = 25 pts

Total brut = 665 pts

Multiplicateurs :
zone contestée : ×1,10
streak : ×1,20
performance : ×1,05
anti-abus : ×1

Score final = 665 × 1,10 × 1,20 × 1,05 = 922 pts
```

---

# 11. Rôle de la performance

Oui, la performance doit compter.  
Mais modérément.

Règle recommandée :

```txt
Performance = bonus maximum +15 % sur le score d’une course.
```

Pourquoi :
- éviter que seuls les rapides gagnent ;
- éviter les comportements dangereux ;
- garder une chance aux débutants ;
- favoriser la régularité ;
- maintenir le rôle des crews ;
- ne pas transformer GRYD en Strava bis.

## 11.1 Modificateur performance

Intervalle :

```txt
×0,90 à ×1,15
```

Critères possibles :
- GPS propre ;
- régularité d’allure ;
- effort personnel vs historique ;
- distance utile ;
- progression personnelle.

## 11.2 Comparer l’utilisateur à lui-même

Ne pas uniquement comparer aux autres.

Exemples :
- meilleure distance récente ;
- allure meilleure que sa moyenne ;
- régularité supérieure ;
- fréquence améliorée.

Cela permet à un débutant de progresser et d’être récompensé.

---

# 12. Score d’attaque

Formule recommandée :

```txt
Score attaque =
hexes volés × 15
+ hexes neutres × 10
+ bonus zone contestée
+ bonus profondeur
+ bonus performance plafonné
```

## Bonus zone contestée

Si la zone change souvent de propriétaire :

```txt
+10 %
```

## Bonus profondeur

Si le joueur attaque loin de son territoire :

```txt
+5 à +10 %
```

À plafonner pour éviter les optimisations absurdes.

## Bonus première attaque

Si le joueur ouvre une nouvelle zone pour son crew :
- badge ;
- XP ;
- Foulées ;
- pas forcément points de classement.

---

# 13. Score de défense

Formule recommandée :

```txt
Score défense =
hexes défendus × 3
+ bonus zone menacée
+ bonus streak défense
```

Si une zone est proche du decay :
- bonus XP ;
- bonus Foulées ;
- badge possible.

Si une zone vient d’être attaquée :
- bonus contre-attaque.

Attention :
- ne pas trop récompenser la défense ;
- sinon les joueurs tournent en boucle sur les mêmes hexes.

---

# 14. Scoring offensive crew

Formule :

```txt
Score offensive =
hexes repris
+ participation membres
+ diversité des coureurs
+ objectif atteint
+ défense post-offensive
```

## 14.1 Hexes repris

Base du score.

## 14.2 Participation membres

Plus il y a de membres actifs, plus le coffre crew monte.

Exemple :
- 2 membres : coffre niveau 1 ;
- 5 membres : coffre niveau 2 ;
- 10 membres : coffre niveau 3.

## 14.3 Diversité des coureurs

Évite qu’un seul très gros coureur fasse tout.

Si 5 membres contribuent chacun au moins 10 % :
- bonus coffre ;
- badge crew ;
- XP crew.

## 14.4 Objectif atteint

Si le crew atteint l’objectif :
- badge ;
- coffre ;
- template story ;
- progression QG.

## 14.5 Défense post-offensive

Si le crew garde la zone 24 h :
- bonus prestige ;
- coffre amélioré ;
- titre temporaire.

---

# 15. Attaque live — scoring spécifique

Pendant un Raid Live :
- chaque hex repris compte normalement ;
- contributions affichées en direct ;
- classement temporaire du raid ;
- récompenses surtout XP/Foulées/coffres ;
- pas de multiplicateur excessif.

Exemple :

```txt
Raid Bastille terminé
428 hexes repris
7 membres actifs
Zone contrôlée à 64 %
Coffre Crew niveau 2 débloqué
```

Récompenses :
- membres actifs : XP + Foulées ;
- top contributeur : badge raid ;
- crew : progression QG / coffre.

---

# 16. Attaque décalée — scoring spécifique

Pendant une offensive 24 h :
- chaque course dans la zone contribue ;
- les hexes sont pris en temps réel ;
- l’objectif est mesuré à la fin ;
- le crew peut perdre/reprendre pendant la fenêtre.

Formule :

```txt
Score offensive 24 h =
hexes nets gagnés
+ hexes ennemis volés
+ nombre de membres actifs
+ % objectif atteint
+ maintien 24 h après offensive
```

Le “hexes nets gagnés” est important.

Exemple :
- Crew A reprend 500 hexes ;
- il en reperd 200 avant la fin ;
- score net = 300.

Cela évite les attaques éclairs sans défense.

---

# 17. Locks

Le lock évite le ping-pong.

Règles :
- hex capturé = lock 24 h ;
- pendant le lock, l’hex ne peut pas être volé ;
- le propriétaire peut le défendre ;
- le lock est visible sur la carte ;
- le lock ne peut pas être supprimé avec de l’argent ;
- le lock ne peut pas être prolongé indéfiniment.

Effets :
- réduit la frustration ;
- limite le harcèlement territorial ;
- donne de la lisibilité ;
- évite les guerres absurdes minute par minute.

---

# 18. Boucliers

Le bouclier doit rester rare.

Règles :
- protège un cluster, pas toute la ville ;
- durée 48 h ;
- limite hebdomadaire ;
- visible par les autres ;
- non cumulable à l’infini ;
- ne bloque pas le decay éternellement ;
- ne doit pas être pay-to-win.

Exemple :
- cluster ≤ 300 hexes ;
- 48 h ;
- 2 boucliers actifs maximum par semaine.

---

# 19. Stratégie

Oui, GRYD doit avoir une vraie stratégie.  
Sinon le produit devient “Strava avec des hexagones”.

La stratégie doit être lisible en 3 secondes :

```txt
Où je cours ?
Quand je cours ?
Avec qui je cours ?
Qu’est-ce que je protège ?
Qu’est-ce que je sacrifie ?
```

---

# 20. Les 7 couches de stratégie

## 20.1 Stratégie de territoire

Le joueur choisit entre :

| Zone | Intérêt stratégique |
|---|---|
| Zone neutre | Facile à prendre, bon pour débuter |
| Zone ennemie | Plus rentable, plus risquée |
| Zone à défendre | Moins sexy, mais évite de perdre |
| Zone proche du decay | À sauver avant disparition |
| Zone contestée | Beaucoup de points, beaucoup de mouvement |
| Zone verrouillée | Inutile à attaquer maintenant |
| Zone protégée | À contourner ou attendre |

Question centrale :

```txt
Est-ce que je prends du nouveau terrain,
est-ce que j’attaque,
ou est-ce que je défends ?
```

---

## 20.2 Stratégie de timing

Le quand est aussi important que le où.

Exemples :
- attaquer juste après la fin d’un lock ;
- défendre avant le decay ;
- courir avant la fin de semaine pour garder sa streak ;
- lancer une offensive le dimanche matin ;
- protéger une zone avant un week-end faible ;
- attendre que l’adversaire soit moins actif.

Phrase produit :

```txt
La ville ne se gagne pas seulement en courant plus.
Elle se gagne en courant au bon moment.
```

---

## 20.3 Stratégie de crew

Un solo prend des rues.  
Un crew contrôle des quartiers.

Questions crew :
- Qui attaque ?
- Qui défend ?
- Qui court tôt ?
- Qui couvre quelle zone ?
- Qui garde le territoire historique ?
- Qui ouvre une nouvelle zone ?
- Quelle zone mérite un bouclier ?

Rôles possibles :
- Éclaireur ;
- Raider ;
- Défenseur ;
- Capitaine ;
- Gardien.

Ces rôles peuvent d’abord être informels, puis officiels plus tard.

---

## 20.4 Stratégie d’itinéraire

Deux courses de 5 km peuvent avoir une valeur très différente.

Course A :
- 5 km ;
- 30 hexes neutres ;
- 300 pts.

Course B :
- 5 km ;
- 18 hexes volés ;
- 22 hexes défendus ;
- 12 hexes neutres ;
- 650 pts.

Même effort physique.  
Meilleur choix stratégique.

L’app doit afficher une estimation avant course :

```txt
Route estimée :
48 hexes
620 pts
12 hexes ennemis
```

---

## 20.5 Stratégie d’attaque

Types d’attaques :

### Attaque rapide

Voler quelques hexes sans s’exposer.

### Attaque profonde

Traverser une zone ennemie importante.

### Attaque de coupure

Couper visuellement un territoire adverse en deux.

### Attaque d’usure

Reprendre régulièrement les mêmes zones pour fatiguer l’adversaire.

### Attaque coordonnée

Plusieurs membres courent dans la même fenêtre pour renverser une zone.

---

## 20.6 Stratégie de défense

Défendre sert à :
- repousser le decay ;
- conserver un quartier symbolique ;
- protéger un QG ;
- garder un titre local ;
- empêcher un crew adverse de monter ;
- maintenir le moral du crew.

Niveaux de défense :

| Défense | Fonction |
|---|---|
| Repassage | Tu repasses sur tes hexes |
| Bouclier | Tu protèges une zone limitée |
| Garde crew | Le crew désigne une zone prioritaire |

La défense doit donner du prestige.

---

## 20.7 Stratégie de ressources

Ressources à gérer :
- boucliers ;
- gels de série ;
- Foulées ;
- Éclats ;
- artefacts ;
- boosts ;
- offensives crew ;
- priorités de saison.

Exemple de vraie décision :

```txt
Est-ce que j’utilise mon bouclier maintenant,
ou est-ce que je le garde pour dimanche avant la fin du classement ?
```

---

# 21. Signaux stratégiques sur la carte

La stratégie doit être visible.

| Signal | Signification |
|---|---|
| Zone contestée | Beaucoup d’activité récente |
| Decay proche | À défendre bientôt |
| Lock actif | Inutile d’attaquer maintenant |
| Bouclier | Zone protégée |
| Gain élevé | Bon spot pour courir |
| Objectif crew | Zone prioritaire |
| Quartier dominant | Zone à forte valeur symbolique |

Ne pas surcharger l’UI.  
Utiliser icônes simples + bottom sheet.

---

# 22. Mécaniques stratégiques MVP

À mettre dès le MVP :
1. Zones neutres / ennemies / à soi.
2. Hexes volés plus rentables.
3. Hexes défendus.
4. Lock 24 h.
5. Decay.
6. Boucliers limités.
7. Classement crew.
8. Objectif crew simple.
9. Zones contestées.
10. Gain potentiel estimé avant course.

---

# 23. Mécaniques stratégiques V1

À mettre en V1 :
1. Offensives crew décalées.
2. Raids live courts.
3. Rôles crew.
4. Artefacts d’intelligence.
5. Radar.
6. Scout.
7. QG crew.
8. Titres de quartier.
9. Missions hebdomadaires.
10. Coffres crew.

---

# 24. Mécaniques à éviter au début

Ne pas mettre au MVP :
- diplomatie entre crews ;
- alliances formelles ;
- marché d’artefacts ;
- guerre programmée complexe ;
- fog of war ;
- carte trop grande ;
- météo comme facteur de score ;
- bonus de vitesse trop fort ;
- vol automatique ;
- pièges payants ;
- classement mondial.

---

# 25. Problème de densité

Problème identifié :

Si un crew contient :
- un coureur à Lille ;
- un coureur à Offranville ;
- un coureur à Sainte-Foy ;
- un coureur à Aubermesnil-Beaumais ;

certains coureurs seront en zone rurale ou peu dense.  
Ils risquent de ne jamais subir d’attaque.

Si GRYD fonctionne uniquement en PvP local direct, ces joueurs s’ennuient.

Solution :

```txt
Tu captures localement,
mais tu scores aussi globalement pour ton crew.
```

---

# 26. Les 3 échelles de territoire

GRYD doit fonctionner sur 3 échelles :

## 26.1 Micro-zone

Là où tu cours vraiment.

Usage :
- capture ;
- défense ;
- course ;
- hexes.

## 26.2 Ville / bassin local

Là où les crews s’affrontent.

Usage :
- classements locaux ;
- raids ;
- offensives ;
- zones contestées.

## 26.3 Ligue régionale / nationale

Là où les joueurs isolés peuvent contribuer.

Usage :
- score crew global ;
- exploration ;
- avant-postes ;
- ligues ;
- contribution régionale.

---

# 27. Ne pas ouvrir toute la France en une seule carte

Une seule carte nationale ouverte créerait une mauvaise expérience.

Effet :
- Paris/Lille = action ;
- campagne = vide ;
- joueurs isolés = aucune attaque.

Il faut donc faire :
- city-gating ;
- zone-gating ;
- ouverture progressive ;
- modes adaptés selon densité.

---

# 28. Les 3 types de zones

## 28.1 Zone active

Exemples :
- Paris ;
- Lille ;
- Rouen ;
- Dieppe ;
- villes avec run clubs.

Mode :
- PvP territorial complet.

Fonctionnalités :
- attaque ;
- défense ;
- vol ;
- crews ;
- classements locaux ;
- raids ;
- offensives ;
- decay ;
- boucliers.

---

## 28.2 Zone émergente

Exemples :
- Offranville ;
- Ouville-la-Rivière ;
- Saint-Valery-en-Caux ;
- villages autour de Dieppe.

Mode :
- capture + progression + avant-postes.

Fonctionnalités :
- capture ;
- progression personnelle ;
- contribution crew ;
- missions ;
- titres locaux ;
- exploration ;
- challenges hebdo ;
- classement régional.

---

## 28.3 Zone sauvage

Exemples :
- campagne pure ;
- forêt ;
- zones isolées.

Mode :
- exploration / conquête personnelle.

Fonctionnalités :
- hexes pionniers ;
- badges explorateur ;
- longues routes ;
- contrôle de secteurs ;
- scoring distance/régularité ;
- contribution ligue crew.

---

# 29. Crews dispersés

Le crew ne doit pas dépendre uniquement de la proximité.

Un crew peut avoir :
- membre A à Lille ;
- membre B à Offranville ;
- membre C à Sainte-Foy ;
- membre D à Aubermesnil.

Ils ne peuvent pas toujours attaquer la même zone, mais ils peuvent contribuer au même crew.

Il faut deux scores :

## 29.1 Territoire local

Chaque membre capture autour de lui.

Exemple :
- Lille ;
- Offranville ;
- Sainte-Foy ;
- Aubermesnil.

## 29.2 Contribution globale crew

Chaque course rapporte au crew :
- hexes capturés ;
- distance utile ;
- zones pionnières ;
- streaks ;
- défenses ;
- missions ;
- exploration ;
- objectifs hebdo.

---

# 30. Avant-postes

Concept clé.

Un crew peut avoir plusieurs avant-postes.

Exemple :

```txt
Crew GRYD Normandy
QG : Lille
Avant-postes : Offranville, Sainte-Foy, Aubermesnil, Dieppe
```

---

## 30.1 Création d’un avant-poste

Un avant-poste se crée quand un membre capture assez d’hexes dans une zone isolée.

Conditions possibles :
- 100 hexes capturés dans un rayon de 2 km ;
- ou 3 courses dans la même zone ;
- ou 10 km cumulés ;
- ou 7 jours d’activité.

---

## 30.2 Utilité d’un avant-poste

Un avant-poste donne :
- points crew ;
- ressources ;
- badges ;
- visibilité ;
- prestige ;
- objectif à défendre ;
- possibilité d’être attaqué si un autre joueur arrive.

Même sans adversaire, le joueur a un but :

```txt
Tu ne fais pas juste une sortie isolée.
Tu construis un avant-poste.
```

---

# 31. Taille des zones

Il faut distinguer :
- hexes fins pour la capture ;
- secteurs larges pour la stratégie.

## 31.1 Hex

Unité de capture.

Recommandation :
- H3 res 10 ;
- environ 66 m d’arête.

Usage :
- capture ;
- claim ;
- vol ;
- défense.

## 31.2 Cluster

Groupe d’hexes proches.

Usage :
- bouclier ;
- défense ;
- résumé de course ;
- affichage carte.

Taille :
- ville : 100 à 500 hexes ;
- campagne : 300 à 1 500 hexes.

## 31.3 Secteur

Unité stratégique.

Usage :
- quartier ;
- avant-poste ;
- titre ;
- classement local.

Taille :
- ville dense : 0,5 à 2 km² ;
- ville moyenne : 2 à 5 km² ;
- campagne : 5 à 20 km².

## 31.4 Zone / Ligue

Unité compétitive.

Usage :
- classement ;
- saison ;
- ouverture ville ;
- ligue.

Exemples :
- Paris Est ;
- Lille Centre ;
- Dieppe Agglo ;
- Pays de Caux ;
- Seine-Maritime.

---

# 32. Adapter le scoring à la densité

Si un joueur rural n’a jamais d’attaque, il ne peut pas gagner beaucoup de points de vol.

Il faut donc compenser avec :
- bonus pionnier ;
- bonus exploration ;
- bonus avant-poste ;
- bonus liaison ;
- classement régional.

## 32.1 Bonus pionnier

Un hex jamais capturé donne plus.

Recommandation :
- zone dense : +5 pts ;
- zone émergente : +8 pts ;
- zone sauvage : +10 pts.

## 32.2 Bonus avant-poste

Exemples :
- création avant-poste : +500 XP ;
- maintien 7 jours : coffre ;
- maintien 30 jours : titre ;
- défense réussie : bonus.

## 32.3 Bonus exploration

Récompense :
- nouvelles routes ;
- nouvelles zones ;
- nouveaux secteurs ;
- distance utile ;
- régularité.

---

# 33. Missions adaptées aux zones isolées

Exemples :
- capturer 300 hexes pionniers ;
- créer un avant-poste ;
- relier deux communes ;
- défendre une boucle pendant 7 jours ;
- courir 3 fois cette semaine ;
- explorer 5 nouvelles routes ;
- capturer 5 km de chemins jamais pris ;
- maintenir un secteur pendant 14 jours ;
- faire tomber un avant-poste adverse.

Récompenses :
- XP ;
- Foulées ;
- fragments ;
- badges ;
- progression crew.

---

# 34. Mécanique de liaison

Très importante pour la campagne.

Objectif :

```txt
Relier deux zones capturées par une chaîne d’hexes.
```

Exemples :
- relier Offranville à Sainte-Foy ;
- relier Aubermesnil à Dieppe ;
- relier deux parcs ;
- relier deux avant-postes du crew.

Récompenses :
- XP ;
- Foulées ;
- badge ;
- bonus crew ;
- titre “Route ouverte”.

---

# 35. Routes de ravitaillement

Post-MVP.

Si deux avant-postes sont reliés par des hexes capturés, le crew crée une :

```txt
Route de ravitaillement
```

Effets :
- bonus Foulées ;
- visibilité crew ;
- progression QG ;
- mission hebdo.

Si un crew adverse coupe la route :
- notification ;
- mission de défense ;
- événement stratégique.

---

# 36. Ligues par densité

Ne pas mettre un coureur rural en concurrence directe avec un runner parisien.

## 36.1 Ligue urbaine

Score important :
- vols ;
- défense ;
- attaques ;
- zones contestées ;
- classements crews.

## 36.2 Ligue régionale

Score important :
- exploration ;
- régularité ;
- contrôle de secteurs ;
- distance ;
- streak ;
- pionniers.

## 36.3 Ligue crew nationale

Score important :
- contribution totale ;
- nombre d’avant-postes ;
- activité des membres ;
- objectifs atteints ;
- participation moyenne.

---

# 37. Crews locaux vs crews étendus

## 37.1 Crew local

Exemple :

```txt
Crew Lille Centre
```

Avantages :
- meilleur scoring territorial local ;
- raids efficaces ;
- classement ville ;
- coordination forte.

## 37.2 Crew étendu

Exemple :

```txt
Crew Normandy
```

Avantages :
- avant-postes ;
- exploration ;
- ligue régionale ;
- flexibilité ;
- couverture large.

## 37.3 Garde-fous

Pour éviter qu’un crew national avale tout :
- cap de membres ;
- score normalisé ;
- score par membre actif ;
- ligues séparées ;
- cooldown changement crew ;
- classement local distinct.

---

# 38. Exemple concret : crew dispersé

Crew composé de :
- Lille ;
- Offranville ;
- Sainte-Foy ;
- Aubermesnil-Beaumais.

## 38.1 Lille

Mode :

```txt
PvP urbain
```

Objectifs :
- attaquer ;
- défendre ;
- gagner des quartiers ;
- scorer en ligue ville.

## 38.2 Offranville

Mode :

```txt
Avant-poste
```

Objectifs :
- créer un secteur ;
- le maintenir ;
- relier Dieppe ;
- attirer d’autres joueurs.

## 38.3 Sainte-Foy

Mode :

```txt
Exploration / liaison
```

Objectifs :
- capturer des routes ;
- relier l’avant-poste ;
- progresser dans la ligue régionale.

## 38.4 Aubermesnil-Beaumais

Mode :

```txt
Pionnier
```

Objectifs :
- hexes jamais capturés ;
- titre local ;
- coffre explorateur ;
- contribution crew.

Tous contribuent au même crew, mais pas avec la même boucle.

---

# 39. Recommandation produit finale

GRYD doit adapter l’expérience à la densité :

```txt
Ville dense = guerre de territoire.
Zone rurale = avant-postes, exploration, routes et contribution crew.
Zone vide = pionnier, waitlist, invitation et ouverture progressive.
```

La carte doit être pensée en 4 couches :

```txt
hex → cluster → secteur → ligue
```

C’est ce qui permet à GRYD de fonctionner aussi bien à :
- Paris ;
- Lille ;
- Dieppe ;
- Offranville ;
- Sainte-Foy ;
- Aubermesnil-Beaumais.

---

# 40. Priorisation MVP / V1 / V2

## MVP

À créer en premier :
1. Capture hex.
2. Vol hex.
3. Défense hex.
4. Lock 24 h.
5. Decay.
6. Crew.
7. Classement local.
8. Score territoire.
9. Score performance plafonné.
10. Notifications de vol/decay/streak.
11. Zones contestées.
12. Carte de partage.
13. Objectif crew simple.
14. Premiers avant-postes basiques en zone peu dense.

## V1

À ajouter après validation :
1. Offensives décalées.
2. Raids live courts.
3. Scoring offensive.
4. Rôles crew.
5. Missions rurales.
6. Bonus exploration.
7. Bonus avant-poste.
8. Liaisons entre zones.
9. Classements régionaux.
10. Artefacts d’intelligence.

## V2 / Saison 2

À ajouter plus tard :
1. QG crew.
2. Routes de ravitaillement.
3. Bâtiments crew.
4. Marché crew.
5. Événements sponsorisés.
6. Diplomatie légère.
7. Guerre de crews programmée.
8. Crafting.
9. Ligues nationales avancées.
10. Mode exploration complet.

---

# 41. Erreurs à éviter

1. Ouvrir toute la France trop tôt.
2. Faire dépendre le plaisir uniquement du PvP local.
3. Mettre les ruraux dans le même classement brut que Paris.
4. Vendre des points ou des hexes.
5. Donner trop de poids à la vitesse.
6. Montrer la position live des autres joueurs.
7. Envoyer trop de notifications.
8. Créer un système d’attaque trop compliqué dès le MVP.
9. Punir les débutants.
10. Laisser les gros crews avaler toutes les petites zones.
11. Rendre la défense inutile.
12. Rendre la campagne vide.
13. Ne pas compenser l’absence d’attaques avec exploration/avant-postes.
14. Mettre trop d’onglets et trop d’icônes sur la carte.
15. Créer une économie pay-to-win.

---

# 42. Résumé final

GRYD doit être :

```txt
Un jeu de territoire pour les villes denses.
Un jeu d’avant-postes pour les zones peu denses.
Un jeu d’exploration pour les zones rurales.
Un jeu de contribution pour les crews dispersés.
```

La promesse ne doit pas être :

```txt
Tu seras toujours attaqué.
```

La promesse doit être :

```txt
Chaque course sert à ton territoire, à ton crew et à ta réputation.
```

Formule finale :

```txt
Le joueur rapide gagne un bonus.
Le joueur régulier construit un territoire.
Le joueur stratégique choisit les bons moments.
Le crew organisé contrôle la carte.
Le joueur isolé bâtit des avant-postes.
```
