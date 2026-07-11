# GRYD — Calcul des zones, règles, skills et FAQ pédagogique

## Objectif

Ce document définit comment GRYD calcule les zones, les routes, les boucles, les défenses, les bonus et les skills.

Il sert à :
- clarifier les règles du jeu ;
- éviter tout flou pour les joueurs ;
- guider le développement backend ;
- guider l’UX/UI ;
- créer une page d’explication dans l’app ;
- préparer une FAQ claire ;
- prévoir des schémas, icônes et explications imagées.

Principe central :

```txt
Une ligne ouvre une route.
Une boucle crée une zone.
Une frontière défendue protège une zone.
Une boucle collective crée un territoire crew.
```

Autre principe clé :

```txt
L’utilisateur voit des zones organiques.
Le backend calcule des micro-cellules invisibles.
```

---

# 1. Vision simple côté joueur

Le joueur doit comprendre :

```txt
Je cours.
Mon tracé dessine une frontière.
Si je ferme une boucle, la zone devient à moi ou à mon crew.
Si je passe sur une zone de mon crew, je la défends.
Si je passe sur une zone rival, je peux la reprendre.
Si je ne ferme pas la boucle, j’ouvre une route.
```

Le jeu doit être expliqué comme ça :

```txt
Je trace.
Je ferme.
Je prends.
Je défends.
Mon crew progresse.
```

---

# 2. Vision technique côté backend

GRYD fonctionne avec deux couches.

## Couche visible

Côté utilisateur :
- zones organiques ;
- formes lissées ;
- routes lisibles ;
- territoires colorés ;
- frontières ;
- labels de quartiers.

## Couche invisible

Côté backend :
- micro-cellules ;
- calculs géométriques ;
- ownership ;
- scoring ;
- anti-triche ;
- historique de capture ;
- conflits entre crews.

Pipeline :

```txt
Trace GPS
→ nettoyage
→ détection boucle
→ création polygone
→ découpage en micro-cellules invisibles
→ attribution au joueur / crew
→ rendu visuel lissé
```

---

# 3. Pourquoi garder des micro-cellules invisibles

Même si les hexagones ne sont plus affichés, il faut une couche technique stable.

Elle sert à :
- calculer précisément les surfaces ;
- gérer les chevauchements ;
- éviter les bugs de polygones ;
- gérer les conflits entre crews ;
- faire les scores ;
- appliquer le decay ;
- rendre les zones contestées ;
- garder un historique fiable ;
- éviter les abus.

Options techniques :
- H3 ;
- S2 Geometry ;
- grille carrée interne ;
- cellules maison de 20 à 50 mètres.

Recommandation :

```txt
Utiliser H3 ou S2 en backend.
Ne jamais afficher la grille à l’utilisateur.
```

Taille recommandée des micro-cellules :

```txt
Ville dense : 20 à 30 m
Ville normale : 30 à 40 m
Rural : 40 à 60 m
```

---

# 4. Pipeline complet de calcul d’une course

## Étape 1 — Collecte GPS

Pendant une course, GRYD collecte :

```txt
latitude
longitude
timestamp
accuracy
speed
altitude éventuelle
source GPS
données motion
source Health / Strava / Garmin si connecté
```

Exemple :

```json
{
  "lat": 48.867,
  "lng": 2.363,
  "timestamp": "2026-07-05T14:32:10Z",
  "accuracy": 8,
  "speed": 2.8
}
```

---

## Étape 2 — Nettoyage du tracé

Le GPS brut peut être sale.

GRYD doit retirer :
- points aberrants ;
- sauts GPS ;
- segments trop imprécis ;
- vitesses incohérentes ;
- pauses longues ;
- micro-tremblements ;
- segments suspects.

Règles MVP :

```txt
accuracy > 30 m → point faible
vitesse > 25 km/h en course à pied → suspect
saut brutal > 100 m en quelques secondes → exclure
GPS instable prolongé → capture partielle ou stats only
```

Résultat :

```txt
trace brute
→ trace propre
```

---

## Étape 3 — Détection de boucle

Une zone ne peut être créée que si le tracé forme une boucle valide.

Il existe 3 cas.

### Cas 1 — Retour proche du départ

Le joueur revient proche de son point de départ.

Condition recommandée :

```txt
distance départ / arrivée < 50 à 100 m en ville
distance départ / arrivée < 150 m en rural
```

Cas typiques :
- tour d’un parc ;
- tour d’un quartier ;
- boucle autour d’un pâté de maisons.

### Cas 2 — Auto-intersection

Le tracé croise un segment déjà parcouru.

Exemples :
- boucle en forme de 8 ;
- boucle partielle ;
- retour par une rue qui croise le parcours.

GRYD peut extraire la sous-boucle fermée.

### Cas 3 — Fermeture assistée

Si la boucle est presque fermée :

```txt
il manque 40 à 100 m
```

GRYD peut afficher :

```txt
Boucle presque fermée.
Il reste 80 m.
```

GRYD ne doit pas fermer une boucle trop ouverte.

---

# 5. Critères de validation d’une boucle

Règles MVP recommandées :

```txt
Distance minimum : 1 km
Durée minimum : 6 minutes
Écart de fermeture : max 80 m en ville
GPS trust : minimum 80 / 100
Surface minimum : 0,005 à 0,01 km²
Surface maximum : selon distance courue
Compacité minimum : éviter les formes trop fines
Largeur moyenne minimum : 80 m
```

Exemple valide :

```txt
Course : 4,4 km
Départ/arrivée : 38 m
GPS trust : 91
Surface : 0,28 km²
Compacité : correcte

Résultat : boucle valide
```

Exemple refusé :

```txt
Course : 1,3 km
Départ/arrivée : 250 m
GPS trust : 76
Forme très ouverte

Résultat : route ouverte, pas de zone
```

---

# 6. Ligne ouverte vs boucle fermée

## Ligne ouverte

Une ligne ouverte ne crée pas un territoire complet.

Elle peut :
- ouvrir une route ;
- capturer ou défendre les cellules proches du tracé ;
- contribuer à une frontière collective ;
- créer une mission “à terminer”.

Exemple :

```txt
Tu cours 4 km en ligne droite.
Tu ouvres une route.
Tu ne crées pas de zone.
```

## Boucle fermée

Une boucle crée une surface.

Elle peut :
- créer une zone ;
- reprendre une zone rival ;
- défendre une zone existante ;
- créer une zone crew.

Exemple :

```txt
Tu fais le tour d’un quartier.
Tu fermes la boucle.
L’intérieur devient une zone.
```

---

# 7. Largeur de capture autour du trait

Même sans boucle, le tracé a une valeur.

GRYD applique une largeur de capture autour du trait.

Recommandation :

```txt
Ville dense : 20 à 30 m
Résidentiel : 30 à 40 m
Rural : 50 m
```

Effets :
- une ligne droite ouvre une route ;
- une course sur une frontière défend la zone ;
- une trace contribue à une boucle collective ;
- l’utilisateur gagne des zones proches du passage, mais pas tout un quartier.

---

# 8. Calcul de la zone intérieure

Quand une boucle est validée :

```txt
tracé fermé → polygone → surface intérieure
```

Puis GRYD :
1. nettoie le polygone ;
2. lisse la forme ;
3. supprime les micro-pointes ;
4. corrige les auto-intersections ;
5. exclut les zones interdites ;
6. découpe en micro-cellules invisibles ;
7. attribue les cellules au joueur ou au crew.

---

# 9. Surface maximale capturable

Il faut empêcher les captures énormes.

Exemple d’abus :

```txt
Un joueur court ou roule 25 km autour d’une ville entière.
```

Solution :

```txt
surface maximum = fonction de la distance courue
```

Table MVP :

```txt
1 à 3 km → max 0,20 km²
3 à 5 km → max 0,80 km²
5 à 10 km → max 1,80 km²
10 km+ → max 3,00 km²
```

Formule possible :

```txt
surface_max_km2 = distance_km × 0,18
capée à 3 km²
```

Exemple :

```txt
4,4 km × 0,18 = 0,79 km² max
```

Si la boucle entoure plus :

```txt
Boucle validée.
Capture plafonnée.
```

---

# 10. Surface minimale capturable

Pour éviter les micro-boucles inutiles :

```txt
surface minimum : 0,005 à 0,01 km²
```

Si trop petit :

```txt
Boucle trop petite.
Course validée, mais zone non créée.
```

---

# 11. Compacité et largeur minimale

Il faut refuser les formes trop fines.

Exemple d’abus :

```txt
aller-retour sur deux rues parallèles très proches
```

Règles :
- largeur moyenne minimale ;
- compacité minimale ;
- ratio surface / périmètre ;
- refus des formes trop fines.

Message joueur :

```txt
Zone trop étroite.
Resserre ou élargis ta boucle.
```

---

# 12. Zones interdites et exclusions

Même si une boucle entoure certains lieux, GRYD ne doit pas tout capturer.

À exclure :
- eau ;
- autoroutes ;
- voies ferrées ;
- zones militaires ;
- aéroports ;
- hôpitaux ;
- écoles sensibles ;
- zones privées sensibles ;
- zones signalées dangereuses.

Formule :

```txt
zone brute - zones interdites = zone capturable
```

---

# 13. Calcul des cellules capturées

Quand une boucle est validée :

```txt
1. GRYD récupère toutes les micro-cellules dans le polygone.
2. GRYD enlève les cellules interdites.
3. GRYD enlève les cellules invalides.
4. GRYD compare le propriétaire actuel.
5. GRYD attribue les cellules au joueur / crew.
6. GRYD calcule le gain.
```

Exemple :

```txt
Boucle fermée = 247 cellules valides

214 cellules étaient proches du trait
33 cellules sont gagnées grâce à la boucle fermée

Résultat :
+247 zones
dont +33 grâce à la boucle
```

Texte recommandé :

```txt
Trace seule : +214
Boucle fermée : +247
Gain de boucle : +33
```

---

# 14. Fusion en zones visibles

Le joueur ne doit pas voir 247 micro-cellules.

GRYD fusionne les cellules adjacentes :

```txt
cellules contrôlées adjacentes
→ fusion
→ secteur visible
→ forme lissée
```

Exemple :

```txt
247 cellules capturées autour de République
→ affichées comme 1 secteur République
```

Le joueur voit :

```txt
République capturée
+247 zones
```

Mais la carte montre une forme propre, pas 247 cellules.

---

# 15. Nommer les secteurs

Le nom visible du secteur est généré à partir de :
- quartier OpenStreetMap ;
- lieu proche ;
- POI ;
- rue principale ;
- nom de zone historique ;
- nom de secteur personnalisé par crew plus tard.

Exemples :
- République ;
- Canal ;
- Bastille ;
- Quai de l’Ourcq ;
- Paris Est.

Règle :

```txt
nom secteur = label géographique le plus parlant dans la zone
```

---

# 16. Calcul de la défense

Défendre ne veut pas toujours dire refaire une boucle complète.

Il y a 3 niveaux.

## Niveau 1 — Traverser une zone

Effet :

```txt
défense légère
+12 h ou +24 h de stabilité
```

## Niveau 2 — Longer une frontière

Effet :

```txt
défense forte
+24 h à +48 h
```

## Niveau 3 — Refaire la boucle / couvrir la frontière

Effet :

```txt
défense maximale
+48 h à +72 h
```

Règle :

```txt
plus le tracé couvre la frontière, plus la défense est forte
```

---

# 17. Calcul de “frontière couverte”

Dans l’app, tu peux afficher :

```txt
Frontière couverte : 80 %
```

Calcul technique :

```txt
frontière ciblée = ligne polygonale
tracé runner = ligne GPS
buffer autour du tracé = 30 m
portion de frontière intersectée par le buffer = couverture
```

Exemple :

```txt
frontière totale : 2 000 m
portion couverte : 1 600 m

frontière couverte = 80 %
```

---

# 18. Zones contestées

Une zone devient contestée si un rival prend une part significative du secteur.

Règle simple :

```txt
si rival prend > 15 % des cellules d’un secteur en 24 h
→ secteur contesté
```

Ou :

```txt
si deux crews ont chacun au moins 30 % de contrôle dans le même secteur
→ zone contestée
```

Exemple :

```txt
Ton crew : 42 %
Canal Crew : 38 %
Neutre : 20 %

Résultat : zone contestée
```

---

# 19. Zones reprises

Si une boucle recouvre une zone rival :

```txt
GRYD calcule les cellules rival à l’intérieur.
Les cellules valides changent de propriétaire.
Le secteur peut devenir repris, contesté ou partiellement contrôlé.
```

Exemple :

```txt
Canal Crew possède République.
Ton crew ferme une boucle sur 47 cellules rival.

Résultat :
+47 zones reprises
République passe côté crew
```

---

# 20. Boucle collective crew

Une boucle peut être créée par plusieurs membres du même crew.

## Principe

```txt
Un membre ouvre une frontière.
Un autre membre termine la boucle.
Si les segments se connectent, le territoire appartient au crew.
```

## Pipeline

```txt
1. Runner A crée une frontière ouverte.
2. GRYD détecte une zone potentielle.
3. GRYD calcule le segment manquant.
4. Une mission est créée : “620 m pour fermer”.
5. Runner B court le segment.
6. GRYD fusionne les segments A+B.
7. Si la boucle est valide, la zone crew est capturée.
```

## Conditions

```txt
même crew uniquement
fenêtre de temps limitée
segments vérifiés
connexion géométrique propre
contribution minimale du finisher
surface max
GPS trust suffisant
```

## Fenêtre de temps

```txt
MVP : 24 h
Compétitif : 6 à 12 h
Event crew : 48 h
```

## Contribution minimale du finisher

```txt
300 à 500 m
ou 15 % de la frontière totale
```

## Répartition des contributions

```txt
contribution = longueur de frontière validée par chaque joueur
```

Exemple :

```txt
frontière totale : 3 000 m
Benjamin : 2 370 m = 79 %
Lena : 630 m = 21 %

Résultat :
Zone crew capturée
Benjamin 79 %
Lena 21 %
```

---

# 21. Routes ouvertes

Si une course ne ferme pas de boucle :

```txt
la course peut ouvrir une route
```

Une route est utile pour :
- relier deux secteurs ;
- préparer une conquête ;
- faciliter une défense ;
- créer un itinéraire crew ;
- générer une mission future.

Exemple :

```txt
Base → République
4,2 km
Route ouverte
```

---

# 22. Points, zones et XP

Il faut séparer 3 métriques.

## Zones

Unité territoriale.

```txt
+247 zones
```

## Points

Classement et saison.

```txt
+420 pts crew
```

## XP

Progression joueur / crew.

```txt
+180 XP
```

---

# 23. Formule simple des points

Formule recommandée :

```txt
points = zones × coefficient_action × coefficient_contexte × verify_score
```

## Coefficient action

```txt
Conquête neutre : ×1
Reprise rival : ×1,3
Défense urgente : ×1,2
Boucle propre : ×1,1
Route ouverte : ×0,4 à ×0,7
```

## Coefficient contexte

```txt
Zone contestée : ×1,2
Zone bonus : +10 à +25 %
Fin de saison : cap spécial, pas de surboost
Crew mission : ×1,1
```

## Verify score

Option UX recommandée :

```txt
Verify > 80 : score complet
Verify 60 à 80 : capture partielle
Verify < 60 : stats only
```

---

# 24. Statuts d’une zone

Chaque zone peut avoir un statut :

```txt
Stable
Fragile
À défendre
Contestée
Protégée
En decay
```

## Stable

```txt
défendue récemment
pas d’activité rival
```

## Fragile

```txt
pas défendue depuis plusieurs jours
```

## À défendre

```txt
expire bientôt
```

## Contestée

```txt
rival actif ou contrôle partagé
```

## Protégée

```txt
shield ou défense récente forte
```

## En decay

```txt
perd progressivement sa propriété
```

---

# 25. Expiration / decay des zones

Les zones ne doivent pas rester éternellement.

Recommandation MVP :

```txt
Stable : 7 jours
Fragile : jours 8 à 14
À défendre : dernières 48 h
Decay : après 14 jours
```

Défense possible :

```txt
traversée simple : +12 h à +24 h
frontière couverte : +24 h à +48 h
boucle complète : +48 h à +72 h
```

---

# 26. Bonus aléatoires ciblés

Les bonus ne doivent pas être purement aléatoires.

Règle :

```txt
Aléatoire dans l’apparition.
Ciblé dans la pertinence.
Capé dans l’impact.
Clair dans l’UX.
Non pay-to-win dans la récompense.
```

## Types de bonus MVP

```txt
Bonus Finisher
Bonus Défense Critique
Bonus Coffre Crew
Bonus Retour
Bonus Exploration
Bonus Boucle Propre
```

### Bonus Finisher

Déclencheur :
- boucle ouverte par un membre ;
- moins de 800 m à fermer ;
- expire bientôt.

Récompense :
- XP crew ;
- coffre ;
- badge Finisher.

### Bonus Défense Critique

Déclencheur :
- zone crew expire dans moins de 12 h.

Récompense :
- progression coffre ;
- défense prolongée ;
- badge Defender.

### Bonus Coffre Crew

Déclencheur :
- coffre entre 80 % et 95 %.

Récompense :
- progression coffre boostée.

### Bonus Retour

Déclencheur :
- joueur absent 5 à 10 jours.

Récompense :
- fragment streak ;
- template share ;
- XP.

### Bonus Exploration

Déclencheur :
- secteur vierge ou peu couru proche.

Récompense :
- XP ;
- badge Pioneer ;
- route ouverte.

### Bonus Boucle Propre

Déclencheur :
- boucle bien fermée ;
- bonne compacité ;
- GPS trust élevé.

Récompense :
- badge progress ;
- XP ;
- animation post-run.

---

# 27. Cap des bonus

Pour éviter le pay-to-win :

```txt
1 seul multiplicateur actif à la fois
pas de cumul multiplicatif
bonus total capé à +35 %
aucun bonus ne donne de territoire direct
aucun bonus ne donne de victoire automatique
```

Exemple :

```txt
Bonus système : +25 %
Crew Boost acheté : +25 %

Résultat :
+35 % max
pas +56 %
```

---

# 28. Skills du joueur

Les skills sont des spécialisations de gameplay.

Ils doivent être gagnés par comportement, pas uniquement achetés.

## Familles de skills

```txt
Defender
Finisher
Scout
Route Maker
Conqueror
Strategist
Supporter
Streak Runner
```

## Defender

Débloqué par :
- zones défendues ;
- frontières couvertes ;
- runs sur zones fragiles.

Exemples de niveaux :

```txt
Defender I : 10 zones défendues
Defender II : 50 zones défendues
Defender III : 150 zones défendues
```

## Finisher

Débloqué par :
- boucles terminées ;
- boucles crew fermées ;
- segments manquants complétés.

## Scout

Débloqué par :
- scout reports ;
- routes découvertes ;
- zones faibles trouvées.

## Route Maker

Débloqué par :
- routes ouvertes ;
- routes utilisées par d’autres ;
- itinéraires crew validés.

## Conqueror

Débloqué par :
- zones capturées ;
- secteurs pris ;
- reprises rival.

## Strategist

Débloqué par :
- missions proposées ;
- plans suivis ;
- routes gagnantes ;
- participation War Room.

## Supporter

Débloqué par :
- boosts offerts ;
- coffres offerts ;
- remerciements reçus ;
- participation crew.

Aucun pouvoir territorial direct.

## Streak Runner

Débloqué par :
- régularité ;
- semaines complètes ;
- objectifs personnels.

---

# 29. Exemple d’affichage des skills

Dans le profil :

```txt
Skills

Defender II
50 zones défendues

Finisher I
6 boucles terminées

Route Maker III
18 routes ouvertes
```

Dans la War Room :

```txt
KORO est recommandé pour cette mission :
Finisher II · 620 m restants
```

---

# 30. Icônes à créer

GRYD doit avoir des icônes propriétaires.

## Icônes gameplay

```txt
Conquête = drapeau
Défense = bouclier
Boucle ouverte = cercle ouvert
Boucle fermée = cercle fermé
Route = ligne courbe
Scout = radar
Rival = cible
Crew = blason
Coffre = cube / chest
Bonus = éclair
Verify = check bleu
Segment exclu = segment gris barré
Decay = sablier
Protected = bouclier plein
```

## Icônes pages

```txt
Carte = territoire
War Room = drapeau / command center
Crew = blason
League = trophée
Profil = avatar
Performance = jauge
Historique = horloge
Paramètres = engrenage
Confidentialité = cadenas
```

---

# 31. Schémas pédagogiques à créer

L’app doit expliquer les règles avec des visuels.

## Schéma 1 — Ligne vs boucle

```txt
Ligne ouverte
→ route ouverte

Boucle fermée
→ zone capturée
```

Visuel :
- à gauche : trait simple ;
- à droite : boucle remplie.

## Schéma 2 — La boucle fait la zone

```txt
Trace seule : +214
Boucle fermée : +247
Gain boucle : +33
```

Visuel :
- avant : trait ;
- après : zone remplie.

## Schéma 3 — Défendre une frontière

```txt
Traverser = défense légère
Longer la frontière = défense forte
Fermer la boucle = défense maximale
```

Visuel :
- 3 mini cartes.

## Schéma 4 — Boucle collective

```txt
KORO ouvre 79 %
LENA ferme 21 %
Le crew prend la zone
```

Visuel :
- deux traits ;
- zone qui se remplit ;
- contributions.

## Schéma 5 — Bonus ciblé

```txt
Il manque 620 m
Bonus Finisher actif
Termine la boucle
```

Visuel :
- segment manquant en pointillé ;
- icône bonus ;
- CTA.

## Schéma 6 — Verify

```txt
GPS propre + Motion cohérent = capture validée
GPS faible = stats only ou capture partielle
```

Visuel :
- check bleu ;
- segment exclu grisé.

---

# 32. Page d’explication dans l’app

Créer une page :

```txt
Comment GRYD calcule tes zones
```

Accès depuis :
- résultat de course ;
- FAQ ;
- Paramètres ;
- écran “Pourquoi ma course n’a pas compté ?”

Structure :

```txt
1. La ligne ouvre une route
2. La boucle crée une zone
3. La défense protège une frontière
4. Le crew peut fermer une boucle ensemble
5. Les bonus sont ciblés
6. GRYD Verify valide les courses
```

Chaque section :
- une icône ;
- une phrase simple ;
- un mini schéma ;
- un exemple concret.

---

# 33. FAQ complète

## Q1. Comment GRYD calcule une zone ?

GRYD analyse ton tracé GPS.  
Si ton parcours forme une boucle valide, GRYD transforme l’intérieur de la boucle en zone.

```txt
Tu dessines une frontière.
La boucle fermée crée le territoire.
```

---

## Q2. Est-ce qu’une ligne droite capture une zone ?

Non.  
Une ligne droite peut ouvrir une route ou défendre un passage, mais elle ne crée pas un territoire complet.

```txt
Ligne ouverte = route.
Boucle fermée = zone.
```

---

## Q3. Pourquoi ma boucle n’a pas créé de zone ?

Causes possibles :
- boucle pas assez fermée ;
- GPS trop faible ;
- zone trop petite ;
- zone trop fine ;
- surface trop grande ;
- vitesse incohérente ;
- zone interdite ;
- durée ou distance insuffisante.

---

## Q4. Que veut dire “frontière couverte” ?

Cela indique quelle portion de la frontière ciblée tu as réellement courue.

Exemple :

```txt
frontière totale : 2 km
tu en as couvert 1,6 km
frontière couverte : 80 %
```

---

## Q5. Est-ce qu’un membre du crew peut finir ma boucle ?

Oui.  
Si tu ouvres une frontière et qu’il manque un segment, un membre de ton crew peut terminer la boucle dans un délai limité.

Conditions :
- même crew ;
- segments vérifiés ;
- fenêtre de temps limitée ;
- distance minimale du finisher ;
- GPS fiable.

---

## Q6. Est-ce qu’un rival peut finir ma boucle ?

Non au MVP.  
Un rival peut contester la zone, mais ne peut pas compléter une boucle pour ton crew.

---

## Q7. Comment GRYD calcule les zones reprises à un rival ?

Si ta boucle recouvre une partie d’un territoire rival, GRYD calcule les micro-cellules reprises et met à jour le contrôle du secteur.

---

## Q8. Pourquoi une partie de ma course est “segment exclu” ?

Un segment peut être exclu si :
- GPS faible ;
- vitesse incohérente ;
- saut GPS ;
- mouvement suspect ;
- absence de données motion.

La course peut rester valide sportivement, mais la capture peut être partielle.

---

## Q9. C’est quoi GRYD Verify ?

GRYD Verify vérifie si une course est fiable.

Il utilise :
- GPS ;
- vitesse ;
- régularité ;
- motion ;
- source connectée ;
- cohérence du tracé.

Résultats possibles :
- course validée ;
- capture partielle ;
- stats only ;
- capture refusée.

---

## Q10. Pourquoi ma course est en “stats only” ?

Cela signifie que la course compte pour tes stats sportives, mais pas pour la capture territoriale.

Causes possibles :
- pas de boucle ;
- GPS faible ;
- source non éligible ;
- suspicion véhicule ;
- zone interdite.

---

## Q11. Comment fonctionne la défense ?

Tu peux défendre une zone en :
- la traversant ;
- longeant sa frontière ;
- refaisant une boucle ;
- couvrant un segment fragile.

Plus tu couvres la frontière, plus la défense est forte.

---

## Q12. Combien de temps une zone reste à nous ?

Une zone reste stable pendant une durée limitée.

Exemple MVP :
- stable : 7 jours ;
- fragile : jours 8 à 14 ;
- à défendre : dernières 48 h ;
- decay : après 14 jours.

---

## Q13. Les zones expirent-elles ?

Oui.  
Si une zone n’est jamais défendue, elle devient fragile puis peut repasser neutre ou être reprise plus facilement.

---

## Q14. Les bonus sont-ils aléatoires ?

Ils sont partiellement aléatoires, mais ciblés.

GRYD peut créer des opportunités selon :
- ta position ;
- ton crew ;
- les zones faibles ;
- les boucles ouvertes ;
- ton activité ;
- les rivalités ;
- le coffre crew.

---

## Q15. Est-ce qu’on peut acheter une zone ?

Non.

```txt
Le territoire ne s’achète jamais.
Il se gagne en courant.
```

Les achats servent uniquement à :
- personnalisation ;
- confort ;
- contribution crew ;
- bonus capés ;
- cosmétiques ;
- partage.

---

## Q16. Les boosts payants sont-ils pay-to-win ?

Non, s’ils sont configurés correctement.

Règles :
- pas de territoire direct ;
- pas de victoire automatique ;
- bonus total capé ;
- pas de cumul multiplicatif ;
- impact surtout sur coffre, XP ou cosmétiques.

---

## Q17. Pourquoi mes zones ne correspondent pas exactement à ma trace ?

Parce que GRYD transforme ton tracé en zone propre et lissée.  
Le backend calcule avec des micro-cellules invisibles, puis l’app affiche une forme simplifiée.

---

## Q18. Pourquoi GRYD n’affiche pas les cellules techniques ?

Parce que ce serait trop complexe visuellement.  
L’utilisateur voit des territoires lisibles.  
Le calcul reste précis en arrière-plan.

---

## Q19. Comment fonctionne une route ouverte ?

Si tu cours sans fermer de boucle, GRYD peut créer une route.

Une route peut :
- relier deux secteurs ;
- aider le crew ;
- préparer une défense ;
- proposer un futur itinéraire.

---

## Q20. Comment sont calculées les contributions dans une boucle collective ?

Chaque membre est crédité selon la longueur de frontière validée.

Exemple :

```txt
KORO : 79 %
LENA : 21 %
```

La zone appartient au crew.

---

# 34. FAQ courte après une course

## Pourquoi +247 zones ?

```txt
Ta trace a couvert +214 zones.
Ta boucle fermée a ajouté +33 zones.
Total : +247.
```

## Pourquoi un segment exclu ?

```txt
Une partie du GPS était trop faible.
La course reste validée, mais ce segment ne capture pas.
```

## Pourquoi “stats only” ?

```txt
Ta course compte sportivement, mais ne remplit pas les conditions de capture.
```

## Pourquoi “frontière ouverte” ?

```txt
Tu as presque fermé une zone.
Il manque un segment que toi ou ton crew pouvez terminer.
```

---

# 35. UX recommandée pour expliquer les calculs

## Dans le résultat de course

Ajouter un lien :

```txt
Comment est calculé ce résultat ?
```

Au tap :

```txt
Trace seule : +214
Boucle fermée : +247
Gain boucle : +33
```

Avec mini schéma.

## Dans l’historique

Pour chaque course :

```txt
Détail du calcul
```

Affiche :
- zones par trace ;
- zones par boucle ;
- zones défendues ;
- segments exclus ;
- verify score.

## Dans la FAQ

Créer une page :

```txt
Calculs & règles du jeu
```

Avec :
- icônes ;
- schémas ;
- exemples ;
- questions fréquentes.

---

# 36. Prompt Claude / Cursor

```md
Tu es Game System Designer, Product Designer et Backend Architect.

Je veux créer dans GRYD une page claire qui explique tous les calculs du jeu : zones, routes, boucles, défenses, bonus, skills, GRYD Verify et FAQ.

## Objectif
Le joueur ne doit jamais se demander pourquoi une course a compté ou non.
Les règles doivent être transparentes, visuelles et faciles à comprendre.

## À créer
1. Page “Comment GRYD calcule tes zones”
2. Page “Calculs & règles du jeu”
3. FAQ complète
4. Schémas pédagogiques
5. Icônes système
6. Explications post-run
7. Détail du calcul dans l’historique

## Règles de calcul
- Une ligne ouverte crée une route.
- Une boucle fermée crée une zone.
- Une frontière couverte défend une zone.
- Une boucle collective peut être fermée par plusieurs membres du même crew.
- Le backend utilise des micro-cellules invisibles.
- Le frontend affiche des zones organiques.
- Les zones sont soumises à surface min/max, compacité, GPS trust et exclusions.

## Schémas à créer
1. Ligne ouverte vs boucle fermée
2. La boucle fait la zone
3. Défense de frontière
4. Boucle collective crew
5. Bonus ciblé
6. GRYD Verify
7. Segment exclu
8. Zones contestées

## Icônes à créer
- conquête
- défense
- boucle ouverte
- boucle fermée
- route
- scout
- rival
- crew
- coffre
- bonus
- verify
- segment exclu
- decay
- protected
- confidentialité

## Page post-run
Ajouter :
- “Comment est calculé ce résultat ?”
- trace seule
- boucle fermée
- gain boucle
- zones défendues
- routes ouvertes
- segments exclus
- GPS score
- Motion score
- verify status

## FAQ
Créer une FAQ avec au minimum :
- Comment GRYD calcule une zone ?
- Pourquoi une ligne droite ne crée pas de territoire ?
- Pourquoi ma boucle n’a pas compté ?
- Comment marche la défense ?
- Comment marche une boucle collective ?
- Pourquoi un segment est exclu ?
- C’est quoi GRYD Verify ?
- C’est quoi stats only ?
- Comment marchent les bonus ?
- Peut-on acheter des zones ?
- Pourquoi mes zones sont lissées ?
- Comment sont calculées mes contributions ?
- Comment fonctionne le decay ?
- Comment sont calculés les points ?

## UX
- mobile-first
- très peu de texte par écran
- schémas simples
- icônes propriétaires
- exemples concrets
- détails au tap
- zéro flou
- pas de jargon technique visible sauf dans une section avancée

Objectif final :
GRYD doit être aussi clair qu’un jeu Supercell dans ses règles, mais aussi crédible qu’une app sportive dans ses calculs.
```

---

# 37. Conclusion

La règle de calcul doit être transparente.

GRYD doit être simple côté joueur :

```txt
Je trace.
Je ferme.
Je prends.
Je défends.
Mon crew progresse.
```

Mais rigoureux côté système :

```txt
GPS propre.
Boucle valide.
Surface raisonnable.
Cellules invisibles.
Contrôle mis à jour.
Score expliqué.
```

La FAQ et les schémas sont indispensables.  
Sans eux, les joueurs penseront que les captures sont arbitraires.

Promesse à tenir :

```txt
Chaque zone gagnée doit pouvoir être expliquée.
Chaque zone refusée aussi.
```
