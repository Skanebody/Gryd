# GRYD — Synthèse complète et précise de la conversation

## 0. But du document

Ce document résume toutes les décisions prises autour de **GRYD**, le jeu mobile de running territorial.  
Il est fait pour servir de base à Claude Code, Cursor, un designer UI, un game designer, un développeur mobile, un backend architect et une stratégie de lancement.

---

# 1. Vision produit

GRYD n’est pas une simple app de running.  
GRYD doit être conçu comme :

```txt
Un jeu mobile de running territorial.
Les joueurs courent dans le monde réel pour capturer, défendre et reprendre des zones.
Les zones appartiennent à des joueurs ou à des crews.
La ville devient une carte de conquête.
```

Formules de positionnement :

```txt
Cours. Ferme la boucle. Prends ton quartier.
Trace une frontière. Ferme la boucle. Prends la zone.
Le territoire se gagne avec les jambes.
Strava partage une activité. GRYD partage une conquête.
Pas une app de carte. Un jeu de territoire en courant.
```

GRYD doit être :
- simple comme Strava au premier regard ;
- profond comme Clash dans ses systèmes ;
- localement viral comme un défi de quartier.

---

# 2. Différence avec INTVL

## Ce qu’il ne faut pas faire

Ne pas viser :

```txt
GRYD = INTVL en mieux partout.
```

C’est le piège. INTVL a déjà une traction, des utilisateurs, du contenu social et de la densité dans certaines zones.  
Le vrai moat d’un jeu territorial n’est pas la feature. C’est :

```txt
La densité locale.
```

Un jeu territorial n’a de valeur que si d’autres joueurs courent **dans ta rue, ton quartier, ta ville**.

Mauvais lancement :

```txt
10 000 utilisateurs dispersés partout.
Carte vide localement.
```

Bon lancement :

```txt
500 joueurs dans une seule ville.
150 actifs par semaine.
10 à 15 crews.
Carte vivante.
```

## Stratégie contre INTVL

Ne pas chercher à les écraser mondialement.

Objectif réaliste :

```txt
Rendre INTVL non pertinent dans une ville précise.
```

Positionnement :

```txt
GRYD est le jeu de running de ta ville.
```

## Axes où GRYD peut gagner

1. **Densité locale**
   - lancement ville par ville ;
   - crews locaux ;
   - rivalités quartier contre quartier ;
   - clubs de running ;
   - facs ;
   - salles de sport.

2. **Fiabilité GPS**
   - ne jamais perdre un run ;
   - tracking fiable écran verrouillé ;
   - récupération après crash ;
   - upload différé ;
   - statut de synchronisation.

3. **Défense**
   - INTVL semble très orienté capture / reprise ;
   - GRYD doit ajouter une vraie couche de défense ;
   - défendre doit devenir une raison de revenir.

4. **Transparence des règles**
   - expliquer pourquoi une course a compté ;
   - expliquer pourquoi elle n’a pas compté ;
   - afficher les calculs ;
   - créer une FAQ pédagogique.

5. **Crew-first**
   - le jeu n’est pas seulement individuel ;
   - un membre peut ouvrir une frontière ;
   - un autre peut terminer la boucle ;
   - le crew conquiert ensemble.

6. **Partage local**
   - “République est tombée” ;
   - “Rive Gauche reprend les quais” ;
   - “Ton quartier est en train de perdre”.

---

# 3. Stratégie beachhead

## Ne pas lancer mondial

GRYD doit commencer sur un territoire très limité.

Priorité recommandée :

```txt
Beachhead 1 : Rouen
Beachhead 2 : Nantes ou Lille
Beachhead 3 : Paris Est / un arrondissement précis
```

Rouen est intéressant parce que l’exécution locale est plus facile : recrutement, run clubs, contenu local, événements, capitaines de crew.

Paris entier est trop large.  
Il faut plutôt viser Paris Est, République, Bastille, Canal Saint-Martin, le 10e ou le 11e.

## Seuils de densité

### Niveau 1 — Test jouable

```txt
100 inscrits locaux
30 runners actifs semaine
150 runs/semaine
5 crews
```

### Niveau 2 — Ville vivante

```txt
500 inscrits locaux
150 runners actifs semaine
700 à 1 000 runs/semaine
10 à 15 crews
8 à 12 secteurs contestés
```

### Niveau 3 — Ville défendable

```txt
1 500 inscrits locaux
500 runners actifs semaine
2 500 à 3 500 runs/semaine
25 crews
plusieurs rivalités récurrentes
```

## Recruter des blocs sociaux

Ne pas recruter des utilisateurs un par un.  
Recruter des groupes :

```txt
10 crews de 30 à 50 runners.
```

Sources :
- run clubs ;
- salles de sport ;
- facs ;
- écoles ;
- clubs d’athlé ;
- CrossFit ;
- Hyrox ;
- groupes Strava locaux ;
- pages Instagram sport locales.

Pitch :

```txt
Je lance une saison fermée où les crews vont se battre pour prendre Rouen.
Je cherche 10 crews fondateurs.
```

Pas :

```txt
Tu veux tester mon app ?
```

## Plan 90 jours

### Jours 1 à 15 — Produit réduit

Construire uniquement :
- tracking GPS fiable ;
- carte ;
- boucle = zone ;
- défense simple ;
- crew simple ;
- classement local ;
- partage story ;
- FAQ calculs ;
- confidentialité.

Objectif :

```txt
Une course doit être capturée, expliquée et partageable.
```

### Jours 16 à 30 — Capitaines

Objectif :

```txt
10 capitaines
10 crews
100 à 150 runners pré-inscrits
```

### Jours 31 à 45 — Beta privée

Objectif :

```txt
300 utilisateurs
100 runners actifs
premières cartes partageables
premiers bugs tracking corrigés
```

### Jours 46 à 60 — Launch weekend

Nom possible :

```txt
GRYD Rouen — Take the City
```

Objectif :
- 500 inscrits ;
- 200 runners actifs sur 48 h ;
- 1 000 runs cumulés sur la semaine ;
- stories locales ;
- classement crews.

### Jours 61 à 90 — Saison 1

Objectif :
- rétention ;
- rituels ;
- rivalités ;
- défense ;
- classement.

Rythme :
- lundi : missions ;
- mercredi : raid local ;
- vendredi : bonus crew ;
- dimanche : classement + stories.

---

# 4. Gameplay central

## Règle fondamentale

```txt
Une ligne ouvre une route.
Une boucle crée une zone.
Une frontière défendue protège une zone.
Une boucle collective crée un territoire crew.
```

## Ce que comprend le joueur

```txt
Je cours.
Mon tracé dessine une frontière.
Si je ferme une boucle, la zone devient à moi ou à mon crew.
Si je passe sur une zone de mon crew, je la défends.
Si je passe sur une zone rival, je peux la reprendre.
Si je ne ferme pas la boucle, j’ouvre une route.
```

Formule joueur :

```txt
Je trace.
Je ferme.
Je prends.
Je défends.
Mon crew progresse.
```

---

# 5. Hexagones vs zones organiques

## Décision

Ne pas afficher d’hexagones dans l’interface.

Architecture recommandée :

```txt
Frontend : zones organiques visibles.
Backend : micro-cellules invisibles.
```

## Pourquoi

Les polygones visibles :
- sont plus naturels ;
- épousent le parcours réel ;
- sont plus viraux en story ;
- ressemblent aux partages Strava ;
- donnent une vraie satisfaction visuelle.

Les micro-cellules invisibles :
- facilitent le calcul ;
- gèrent les conflits entre crews ;
- permettent l’anti-triche ;
- facilitent le scoring ;
- permettent le scale.

Phrase produit :

```txt
La boucle fait la zone.
```

Phrase technique :

```txt
La zone visible est organique.
Le calcul est cellulaire.
```

---

# 6. Calcul des zones

## Pipeline technique

```txt
Trace GPS
→ nettoyage
→ détection boucle
→ création polygone
→ découpage en micro-cellules invisibles
→ attribution au joueur / crew
→ rendu visuel lissé
```

## Points GPS collectés

Chaque point contient :

```txt
latitude
longitude
timestamp
accuracy
speed
altitude éventuelle
source GPS
données motion
```

## Nettoyage GPS

GRYD doit retirer :
- sauts GPS ;
- points imprécis ;
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

## Détection de boucle

Une zone est créée si le tracé forme une boucle valide.

Cas :
1. retour proche du départ ;
2. auto-intersection ;
3. fermeture assistée.

Règles :

```txt
distance départ / arrivée < 50 à 100 m en ville
distance départ / arrivée < 150 m en rural
```

Si presque fermé :

```txt
Boucle presque fermée.
Il reste 80 m.
```

## Validation d’une boucle

Règles MVP :

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

## Ligne ouverte

Une ligne ouverte :
- ouvre une route ;
- défend un passage ;
- capture seulement autour du trait ;
- peut créer une mission “à terminer”.

## Boucle fermée

Une boucle fermée :
- crée une zone ;
- capture l’intérieur ;
- peut reprendre une zone rival ;
- peut défendre une zone.

## Largeur de capture autour du trait

```txt
Ville dense : 20 à 30 m
Résidentiel : 30 à 40 m
Rural : 50 m
```

## Surface maximale

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

## Surface minimale

```txt
surface minimum : 0,005 à 0,01 km²
```

Si trop petit :

```txt
Boucle trop petite.
Course validée, mais zone non créée.
```

## Zones interdites

À exclure :
- eau ;
- autoroutes ;
- voies ferrées ;
- zones militaires ;
- aéroports ;
- hôpitaux ;
- écoles sensibles ;
- zones privées sensibles ;
- zones dangereuses.

Formule :

```txt
zone brute - zones interdites = zone capturable
```

## Calcul final

Exemple :

```txt
Trace seule : +214
Boucle fermée : +247
Gain boucle : +33
```

---

# 7. Défense, contestation et decay

## Défense

Défendre ne veut pas toujours dire refaire une boucle.

Niveaux :

```txt
Traverser une zone = défense légère
Longer une frontière = défense forte
Fermer une boucle = défense maximale
```

Effets :

```txt
traversée simple : +12 h à +24 h
frontière couverte : +24 h à +48 h
boucle complète : +48 h à +72 h
```

## Frontière couverte

Calcul :

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

## Statuts d’une zone

```txt
Stable
Fragile
À défendre
Contestée
Protégée
En decay
```

## Decay

Recommandation MVP :

```txt
Stable : 7 jours
Fragile : jours 8 à 14
À défendre : dernières 48 h
Decay : après 14 jours
```

## Contestation

Une zone devient contestée si :
- le rival prend une part significative ;
- l’écart entre crew et rival devient faible ;
- une attaque récente a eu lieu.

Règles possibles :

```txt
rival_principal >= 25 %
et ton_crew <= 60 %

ou

écart entre ton crew et rival principal < 15 points

ou

rival a repris plus de X zones sur 24 h
```

Exemple :

```txt
Ton crew : 42 %
Canal Crew : 38 %
Neutre : 20 %

Résultat : Zone contestée
```

---

# 8. Couleurs, crews et carte à grande échelle

## Règle principale

À 200 000 utilisateurs, il ne faut pas afficher les gens.  
Il faut afficher l’état du territoire.

```txt
On ne colore pas 200 000 utilisateurs.
On agrège leur activité en territoires, fronts, pressions et missions.
```

## Ne pas utiliser une couleur par crew

Erreur :

```txt
Crew A = bleu
Crew B = rouge
Crew C = violet
Crew D = jaune
...
```

C’est ingérable et illisible.

## Palette relative à l’utilisateur

```txt
Moi / mon crew = chartreuse
Alliés = chartreuse secondaire
Rival principal = orange / rouge
Zone contestée = violet + double contour
Neutre = gris
Protégé = bleu / shield
Decay / danger = rouge sombre
Bonus = gold
```

La couleur indique un rôle, pas l’identité universelle d’un crew.

## Zone contestée

Une zone contestée doit utiliser :
- double contour ;
- hachures légères ;
- badge contestation ;
- pulse lent ;
- contraste selon intensité.

Niveaux :
1. stable ;
2. pression ;
3. contesté ;
4. attaque active ;
5. urgence.

## Affichage par zoom

### Pays

Afficher :
- villes actives ;
- grands fronts ;
- top crews locaux.

### Ville

Afficher :
- secteurs ;
- quartiers contestés ;
- missions principales.

### Quartier

Afficher :
- territoires ;
- frontières ;
- routes ;
- zones à défendre.

### Rue / mission

Afficher :
- tracé exact ;
- segment manquant ;
- alliés opt-in ;
- activité rival approximative.

### Live run

Afficher seulement :
- toi ;
- ta route ;
- ton objectif ;
- alliés utiles ;
- rival approximatif.

## Runners live

Alliés :
- visibles en mission ;
- opt-in ;
- position plus précise.

Rivaux :
- jamais GPS exact ;
- activité approximative ;
- halo orange ;
- délai ;
- pas de nom exact.

Règle :

```txt
Alliés = live précis opt-in.
Rivaux = activité approximative.
```

## Pressure score

Créer un score de pression par secteur :

```txt
pressure_score = activité rival récente + perte de zones + proximité de bascule + decay
```

Lecture :

```txt
0-30 = stable
31-60 = pression
61-80 = contesté
81-100 = urgence
```

---

# 9. Boucles collectives crew

## Principe

Un joueur peut ouvrir une frontière.  
Un autre membre du même crew peut terminer la boucle.

Exemple :

```txt
KORO ouvre 79 %
LENA ferme 21 %
Le crew prend la zone
```

## Pipeline

```txt
1. Runner A crée une frontière ouverte.
2. GRYD détecte une zone potentielle.
3. GRYD calcule le segment manquant.
4. Mission créée : “620 m pour fermer”.
5. Runner B court le segment.
6. GRYD fusionne les segments.
7. Si boucle valide → zone crew capturée.
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

## Fenêtre

```txt
MVP : 24 h
Compétitif : 6 à 12 h
Event crew : 48 h
```

## Contribution minimale

```txt
300 à 500 m
ou 15 % de la frontière totale
```

---

# 10. Points, zones, XP

Séparer :

```txt
Zones = unité territoriale
Points = classement / saison
XP = progression joueur / crew
```

Formule points :

```txt
points = zones × coefficient_action × coefficient_contexte × verify_score
```

Coefficients action :

```txt
Conquête neutre : ×1
Reprise rival : ×1,3
Défense urgente : ×1,2
Boucle propre : ×1,1
Route ouverte : ×0,4 à ×0,7
```

Verify score :

```txt
Verify > 80 : score complet
Verify 60 à 80 : capture partielle
Verify < 60 : stats only
```

---

# 11. Tracking GPS et GRYD Verify

## Slogan interne

```txt
Never lose a run.
```

Dans GRYD, le run est la monnaie.  
Un run perdu = l’utilisateur a couru pour rien.

## Priorité technique

Mettre en place :
- tracking écran verrouillé ;
- sauvegarde locale continue ;
- reprise après crash ;
- upload différé ;
- statut sync ;
- export GPX ;
- import activité si autorisé ;
- alerte GPS faible avant lancement ;
- recovery automatique post-crash.

## GRYD Verify

Vérifie :
- GPS ;
- vitesse ;
- régularité ;
- motion ;
- source connectée ;
- cohérence du tracé.

Résultats :
- course validée ;
- capture partielle ;
- stats only ;
- capture refusée.

## Segment exclu

Un segment peut être exclu si :
- GPS faible ;
- vitesse incohérente ;
- saut GPS ;
- mouvement suspect ;
- absence de données motion.

La course peut rester sportive, mais la capture devient partielle.

---

# 12. Skills

Les skills sont gagnés par comportement, pas achetés.

Familles :
- Defender ;
- Finisher ;
- Scout ;
- Route Maker ;
- Conqueror ;
- Strategist ;
- Supporter ;
- Streak Runner.

## Defender

Débloqué par :
- zones défendues ;
- frontières couvertes ;
- runs sur zones fragiles.

Exemple :

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

---

# 13. Bonus

## Règle

Les bonus doivent être :

```txt
Aléatoires dans l’apparition.
Ciblés dans la pertinence.
Capés dans l’impact.
Clairs dans l’UX.
Non pay-to-win.
```

## Bonus MVP

- Bonus Finisher ;
- Bonus Défense Critique ;
- Bonus Coffre Crew ;
- Bonus Retour ;
- Bonus Exploration ;
- Bonus Boucle Propre.

## Cap

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

Résultat : +35 % max, pas +56 %
```

---

# 14. Monétisation

## Ne jamais vendre

- territoire ;
- victoire ;
- zones ;
- kilomètres ;
- classement direct ;
- capture directe.

## Vendre

- style ;
- statut ;
- personnalisation ;
- organisation ;
- analytics ;
- partage ;
- confort capé ;
- contribution crew.

## Éviter au lancement

- abonnement obligatoire ;
- loterie ;
- loot boxes payantes ;
- pay-to-win ;
- tirage au sort payant ;
- territoire achetable.

## Produits possibles

- Founder Pack ;
- skins de trace ;
- blasons crew ;
- frames profil ;
- templates story ;
- bannières crew ;
- drops physiques ;
- sponsors locaux ;
- challenges sponsorisés.

---

# 15. Marque running future

GRYD peut devenir une marque de running.

Architecture :

```txt
GRYD = marque mère
GRYD App = jeu mobile
GRYD Athletics = vêtements running
GRYD Run Club = communauté / events
GRYD Gear = produits
GRYD Lab = drops expérimentaux
```

Positionnement :

```txt
L’équipement des runners qui prennent la ville.
```

Produits initiaux :
- t-shirt technique noir ;
- casquette running ;
- chaussettes ;
- veste coupe-vent ;
- short running.

Drops liés au jeu :
- Drop République ;
- Drop Defender ;
- Drop Founder Runner ;
- Drop Crew Captain ;
- Drop Paris Est.

---

# 16. Logo

Trois logos avaient été comparés : 11, 12, 13.

## Verdict

Choisir le **13** comme logo principal.

Raisons :
- plus lisible en petit ;
- plus simple ;
- plus mémorisable ;
- plus premium ;
- meilleur pour app icon ;
- meilleur pour textile ;
- meilleur pour badge ;
- meilleur pour map marker.

## Logo 11

À garder pour :
- animation ;
- badge spécial ;
- effet conquête ;
- loading ;
- rareté.

Mais pas comme logo principal.

## Logo 12

À abandonner.

Raisons :
- trop abstrait ;
- évoque infini / lunettes ;
- moins statutaire ;
- moins lisible comme G.

## Déclinaisons nécessaires

Créer :
- icône app ;
- logo horizontal ;
- monogramme textile ;
- version monochrome ;
- version broderie ;
- version réfléchissante ;
- patch ;
- étiquette ;
- favicon ;
- map marker.

---

# 17. UI/UX : simplification

## Problème actuel

L’app était trop dense :
- trop de cards ;
- rectangles dans rectangles ;
- trop d’alertes ;
- trop de CTA ;
- trop de texte ;
- trop de scroll ;
- trop de filtres visibles ;
- trop d’information sur la carte.

## Règle principale

```txt
1 écran = 1 décision.
1 écran = 1 action principale.
1 card = 1 idée.
1 CTA principal maximum.
```

## Règles non négociables

```txt
Ne jamais tout montrer.
Pas de cards dans les cards.
Un seul CTA chartreuse.
Pas de GO partout.
Pas de texte coupé avec “…”.
Pas de scroll nécessaire pour décider.
Pas de filtres visibles en permanence.
Pas de dashboard pendant le run.
Calculs détaillés uniquement au tap.
```

## Rectangles dans rectangles

À éviter :

```txt
page noire
→ section
→ grande card
→ petite card
→ badge
→ bouton dans card
```

À remplacer par :

```txt
section simple
espace
contenu
CTA
```

Règle :

```txt
Une seule couche de container par zone.
```

## Contours

Les contours servent uniquement à :
- état actif ;
- sélection ;
- alerte ;
- rareté.

Pas de bordures partout.

## CTA

Un seul gros bouton chartreuse par écran.

Utiliser :

```txt
RUN
DÉFENDRE
CONQUÉRIR
TERMINER
REJOINDRE
PARTAGER
```

Éviter :

```txt
GO
```

---

# 18. Carte principale

## Problème

La carte essayait de :
- informer ;
- alerter ;
- faire choisir ;
- montrer la carte ;
- pousser à défendre ;
- afficher des missions ;
- afficher du social ;
- afficher des parcours.

Résultat : surcharge.

## Règle

La carte doit être un écran mission.

Elle doit répondre à :

```txt
Où suis-je ?
Quelle zone est importante ?
Où dois-je courir ?
Qu’est-ce que je gagne ou sauve ?
Quel bouton dois-je appuyer ?
```

## Structure cible

```txt
République attaquée
3 zones à sauver

[Carte épurée]

Défendre République
4,4 km · bonus actif · +120 pts

[DÉFENDRE]
```

## À retirer du premier niveau

- contrôle du secteur ;
- missions secondaires ;
- zone bonus détaillée ;
- runs d’amis ;
- liste de parcours ;
- gros bandeau bonus ;
- filtres permanents ;
- double CTA ;
- social live trop visible.

## Bottom sheet

### Fermé

```txt
Défendre République
4,4 km · 3 zones à sauver
[DÉFENDRE]
```

### Ouvert

Sections :
- résumé ;
- parcours ;
- équipe ;
- détails.

---

# 19. Trace GPS et rendu type Strava

## Ce que fait Strava

Strava rend la trace forte parce que :
- la trace est l’objet principal ;
- la carte est le décor ;
- le trait est épais ;
- il est arrondi ;
- il a souvent un contour ;
- le fond est atténué.

## GRYD doit faire pareil

Pendant le run :

```txt
La trace doit dominer.
La carte doit servir de décor.
Les zones sont secondaires.
```

## Deux traces

```txt
Trace de calcul = précise, non simplifiée.
Trace d’affichage = lissée, simplifiée, lisible.
```

## Rendu en couches

```txt
1. contour / casing
2. ligne principale
3. glow léger optionnel
```

Exemple :

```txt
casing : 14-16 px
core : 9-12 px
line-cap : round
line-join : round
```

## Épaisseurs

Préparation route :

```txt
core : 8-10 px
casing : 12-14 px
```

Live run :

```txt
core : 9-12 px
casing : 14-16 px
```

Segment restant :

```txt
core : 6-8 px
opacité 60 %
```

Segment exclu :

```txt
gris
pointillé
opacité 35 %
```

## Types de lignes

```txt
Trace courue = chartreuse pleine, épaisse
Route restante = chartreuse plus légère
Segment manquant = pointillé chartreuse
Segment exclu = gris pointillé
Rival = orange, moins visible
Allié = chartreuse secondaire
```

## Position actuelle

Doit être très visible :
- flèche directionnelle ;
- cercle chartreuse ;
- halo GPS ;
- pulse discret.

---

# 20. Live Run

Pendant une course, ne jamais afficher plus de :
- 1 objectif ;
- 1 progression ;
- 1 alerte temporaire.

Exemples :

```txt
DÉFENSE
République
80 % couvert
9 min restantes
```

Toasts :

```txt
Boucle possible
320 m pour fermer
Boucle fermée
+47 zones
Canal actif
Zone défendue
```

Règle :

```txt
3 à 5 mots.
2 secondes.
Pas de popup bloquante.
```

---

# 21. Post-run

Premier écran :

```txt
COURSE VALIDÉE

+247
zones

République défendue
Paris Est +5 %

[PARTAGER]
[Voir détails]
```

Détails au tap :
- trace seule ;
- boucle fermée ;
- gain boucle ;
- zones défendues ;
- routes ouvertes ;
- segments exclus ;
- GPS score ;
- Motion score ;
- verify status.

Exemple :

```txt
Trace seule : +214
Boucle fermée : +247
Gain boucle : +33
```

---

# 22. Partage story

## Objectif

Faire mieux que Strava : transformer une activité en conquête partageable.

## Structure écran

```txt
Partager ta conquête

[Preview story directe]

Format
Story 9:16 | Carré 1:1

Style
Carte | Conquête | Défense | Boucle | Crew

[Story Instagram]

Sauver · Copier · Plus
```

Pas de rectangles dans rectangles.

## Templates

- Carte 3D ;
- Carte sombre GRYD ;
- Conquête ;
- Défense ;
- Boucle fermée ;
- Crew.

## Rendu

```txt
Mapbox / MapLibre 3D
fond dark ou satellite
trace chartreuse épaisse
zone conquise transparente
stats simples
format Story 9:16
```

---

# 23. Navigation

## Onglets actuels

```txt
Carte · War Room · Crew · League · Profil
```

Problèmes :
- War Room et Crew se chevauchent ;
- League est trop froid ;
- l’état actif avec cadre jaune/orange est trop agressif.

## Navigation recommandée

```txt
Carte · Missions · Crew · Saison · Profil
```

## Pourquoi

### Carte
Territoire, zones, routes, live map.

### Missions
Quoi faire maintenant : défendre, conquérir, terminer, bonus, mission crew.

### Crew
Membres, chat, rôles, blason, coffre, War Room comme sous-section.

### Saison
Classement, rang, récompenses, objectifs, reset, progression.

### Profil
Player card, stats, badges, historique, paramètres.

## État actif

Remplacer le gros cadre par :
- icône chartreuse ;
- label clair ;
- petit glow ou trait subtil ;
- pas de gros cadre.

---

# 24. Bouton direct pour courir

## Conclusion

Oui, il faut un bouton direct pour courir.  
Mais ce bouton ne doit pas être un onglet classique.

Navigation = où je vais.  
Bouton principal = ce que je fais maintenant.

## Format

Bottom nav :

```txt
Carte · Missions · Crew · Saison · Profil
```

Bouton principal flottant :

```txt
RUN / DÉFENDRE / CONQUÉRIR / TERMINER / REJOINDRE
```

## États

Sans mission :

```txt
RUN
```

Zone attaquée :

```txt
DÉFENDRE
```

Zone neutre ou rival :

```txt
CONQUÉRIR
```

Boucle presque fermée :

```txt
TERMINER
```

Mission crew :

```txt
REJOINDRE
```

## Où il apparaît

Oui :
- Carte ;
- Missions ;
- War Room ;
- détail zone ;
- route ;
- boucle à terminer.

Non :
- Profil ;
- Paramètres ;
- Confidentialité ;
- Historique ;
- Partage ;
- Boutique ;
- FAQ.

---

# 25. War Room / Missions

“War Room” est stylé, mais moins clair en onglet principal.

Il peut rester comme sous-section du Crew.

L’onglet principal doit être :

```txt
Missions
```

Structure :

```txt
Missions

Urgent
République · 3 zones · 4,4 km
[DÉFENDRE]

À terminer
Canal · 620 m
[TERMINER]

Active
Bastille · 496/800
[REJOINDRE]
```

Règle :
- une card par section visible ;
- le reste dans “Voir tout”.

---

# 26. Crew

Crew doit être le hub social et statutaire.

Contenu :
- nom ;
- blason ;
- niveau ;
- rang ;
- membres actifs ;
- War Room ;
- chat ;
- membres ;
- coffre ;
- rôles ;
- contribution ;
- personnalisation.

La contribution payante doit être secondaire, pas en haut.

---

# 27. Profil

Le profil doit être une player card, pas un dashboard.

Afficher :
- avatar ;
- pseudo ;
- niveau ;
- crew ;
- rang ;
- zones tenues ;
- CTA partager.

Puis cards compactes :
- territoire ;
- performance ;
- historique ;
- badges.

---

# 28. League devient Saison

Remplacer “League” par “Saison”.

Pourquoi :
- plus gaming ;
- plus large ;
- inclut classement, objectifs, récompenses ;
- meilleure rétention.

Structure :

```txt
#8 KORO
342 pts du #7
35 zones peuvent suffire

[TROUVER UNE ROUTE]
```

---

# 29. Multilingue

## Décision

Oui, le multilingue vaut le coup.  
Mais il faut le prévoir dès le code, sans lancer toutes les langues.

Stratégie :

```txt
Architecture multilingue dès maintenant.
FR + EN au MVP.
Autres langues après traction.
```

## Langues

MVP :
- français ;
- anglais.

Expansion :
- espagnol ;
- portugais ;
- allemand.

Plus tard :
- italien ;
- japonais ;
- coréen ;
- néerlandais.

## Règles

- aucun texte hardcodé ;
- tous les textes via i18n ;
- fallback anglais ;
- langue automatique téléphone ;
- changement manuel dans paramètres ;
- noms de lieux non traduits ;
- skills principaux peuvent rester en anglais ;
- phrases courtes ;
- pluriels ;
- unités km/miles ;
- dates/heures locales.

## Structure fichiers

```txt
/locales/en/common.json
/locales/en/map.json
/locales/en/run.json
/locales/en/crew.json
/locales/en/league.json
/locales/en/profile.json
/locales/en/share.json
/locales/en/faq.json
/locales/en/errors.json
/locales/en/notifications.json

/locales/fr/common.json
/locales/fr/map.json
/locales/fr/run.json
/locales/fr/crew.json
/locales/fr/league.json
/locales/fr/profile.json
/locales/fr/share.json
/locales/fr/faq.json
/locales/fr/errors.json
/locales/fr/notifications.json
```

---

# 30. App Store

## Stratégie de validation

Soumettre une V1 simple, stable, claire.

Ne pas soumettre une version trop complexe avec :
- chat libre complet ;
- live rival précis ;
- loot boxes ;
- achats flous ;
- features “bientôt” ;
- social non modéré.

## V1 recommandée

```txt
Run GPS
Carte de territoire
Conquête par boucle
Défense simple
Résultat de course
Partage story
Profil
Historique
Confidentialité
FAQ calculs
Crew simple sans chat ouvert complexe
Pas de live rival précis
Pas de loot box payante
```

## Risques Apple

GRYD touche à :
- géolocalisation ;
- fitness ;
- mouvement ;
- social / UGC ;
- chat ;
- achats intégrés ;
- récompenses aléatoires ;
- sécurité physique.

## À inclure

- permission location claire ;
- écran avant permission ;
- mode privé ;
- masquage départ / arrivée ;
- live opt-in ;
- rival approximatif ;
- suppression compte ;
- export données ;
- politique confidentialité ;
- signaler / bloquer ;
- support ;
- CGU ;
- pas de paiement externe.

## À retirer avant première soumission

```txt
chat libre complet
live rival précis
coffres aléatoires payants
features “bientôt”
replay vidéo bientôt
vocabulaire trop agressif
route dangereuse / chase
accès contacts
tracking publicitaire
paiement web
screenshots conceptuels
```

---

# 31. FAQ et pédagogie

Créer une page :

```txt
Comment GRYD calcule tes zones
```

Accès depuis :
- résultat de course ;
- FAQ ;
- Paramètres ;
- écran “Pourquoi ma course n’a pas compté ?”.

Sections :
1. la ligne ouvre une route ;
2. la boucle crée une zone ;
3. la défense protège une frontière ;
4. le crew peut fermer une boucle ;
5. les bonus sont ciblés ;
6. GRYD Verify valide les courses.

## Schémas à créer

1. Ligne ouverte vs boucle fermée ;
2. La boucle fait la zone ;
3. Défense de frontière ;
4. Boucle collective crew ;
5. Bonus ciblé ;
6. GRYD Verify ;
7. Segment exclu ;
8. Zones contestées.

## Questions FAQ

Inclure :
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

Promesse :

```txt
Chaque zone gagnée doit pouvoir être expliquée.
Chaque zone refusée aussi.
```

---

# 32. Icônes

GRYD doit avoir un système d’icônes propriétaire.

## Gameplay

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

## Pages

```txt
Carte = territoire
Missions = cible / route
Crew = blason / groupe
Saison = trophée / couronne
Profil = player card
Performance = jauge
Historique = horloge
Paramètres = engrenage
Confidentialité = cadenas
```

---

# 33. Décisions finales

## Produit

```txt
GRYD = jeu de running territorial crew-first.
```

## Gameplay

```txt
La ligne ouvre une route.
La boucle crée une zone.
La défense protège.
Le crew peut fermer ensemble.
```

## Carte

```txt
Pas d’hexagones visibles.
Zones organiques.
Micro-cellules invisibles backend.
```

## UI

```txt
1 écran = 1 décision.
1 CTA principal.
Pas de card dans card.
Carte = écran mission.
```

## Navigation

```txt
Carte · Missions · Crew · Saison · Profil
+
bouton flottant RUN / DÉFENDRE / CONQUÉRIR / TERMINER
```

## Tracking

```txt
Never lose a run.
```

## Stratégie

```txt
Pas de lancement mondial.
Beachhead local.
500 joueurs dans une ville.
```

## Différenciation INTVL

```txt
Densité locale.
Fiabilité GPS.
Défense.
Transparence.
Crew.
Partage local.
```

## Logo

```txt
Logo principal : 13.
Logo effet game : 11.
Logo 12 à abandonner.
```

## Monétisation

```txt
Pas de pay-to-win.
Pas de territoire achetable.
Cosmétiques, statut, contribution, partage.
```

## Multilingue

```txt
i18n dès maintenant.
FR + EN MVP.
Expansion progressive.
```

---

# 34. Prompt global Claude / Cursor

```md
Tu es Lead Product Designer, Game Designer, Mobile Architect et Growth Strategist.

Je veux refondre GRYD comme un jeu mobile de running territorial extrêmement simple, fiable et localement viral.

## Vision
GRYD n’est pas une app de running classique.
GRYD est le jeu de running qui transforme une ville en territoire à conquérir.

## Règle produit
- Une ligne ouvre une route.
- Une boucle crée une zone.
- Une frontière défendue protège une zone.
- Une boucle collective crée un territoire crew.

## Technique
- Pas d’hexagones visibles.
- Frontend : zones organiques.
- Backend : micro-cellules invisibles.
- Tracking GPS fiable.
- Ne jamais perdre un run.
- Trace de calcul précise.
- Trace d’affichage lisible.

## UI
- 1 écran = 1 décision.
- 1 écran = 1 CTA principal.
- Pas de card dans card.
- Pas de rectangles empilés.
- Pas de texte coupé.
- Pas de scroll pour décider.
- La carte est un écran mission.
- Les détails vont au tap.

## Navigation
Bottom nav :
Carte · Missions · Crew · Saison · Profil

Bouton flottant contextuel :
RUN / DÉFENDRE / CONQUÉRIR / TERMINER / REJOINDRE

## Carte
Afficher uniquement :
- position ;
- zone importante ;
- route / trace ;
- mission ;
- CTA.

Masquer :
- filtres permanents ;
- stats secondaires ;
- social inutile ;
- plusieurs alertes ;
- plusieurs CTA.

## Run
Pendant la course :
- 1 objectif ;
- 1 progression ;
- 1 toast événement.
La trace doit dominer la carte.

## Post-run
Afficher :
COURSE VALIDÉE
+247 zones
République défendue
[PARTAGER]
[Voir détails]

## Calculs
Ajouter une FAQ et des schémas :
- ligne vs boucle ;
- défense ;
- boucle collective ;
- GRYD Verify ;
- segment exclu ;
- zone contestée.

## Couleurs
Pas une couleur par crew.
Une couleur par rôle :
- mon crew = chartreuse ;
- rival = orange ;
- contesté = violet + double contour ;
- neutre = gris ;
- bonus = gold ;
- protégé = bleu.

## Stratégie
Ne pas lancer mondial.
Lancer dans une ville.
Objectif beachhead :
500 inscrits locaux.
150 runners actifs semaine.
10 à 15 crews.
Carte vivante.

## Différenciation INTVL
- densité locale ;
- fiabilité tracking ;
- défense stratégique ;
- calculs transparents ;
- crew-first ;
- partage local.

## Monétisation
Pas de pay-to-win.
Pas de territoire achetable.
Pas de loterie payante.
Cosmétiques, statut, contribution et partage.

## App Store
V1 simple :
- tracking GPS ;
- carte ;
- boucle = zone ;
- défense simple ;
- crew simple ;
- partage story ;
- confidentialité ;
- FAQ.
Pas de chat libre complet, pas de live rival précis, pas de loot boxes.

## Objectif final
GRYD doit être simple comme Strava au premier regard,
profond comme Clash dans les systèmes,
et localement viral comme un défi de quartier.
```

---

# 35. Résumé ultra-court

```txt
GRYD doit cacher sa complexité.

Le joueur voit :
où courir,
quoi défendre,
quoi conquérir,
quoi partager.

Le backend gère :
cellules,
calculs,
anti-triche,
scoring,
pression,
decay.

La stratégie n’est pas de battre INTVL partout.
La stratégie est de dominer une ville, puis une autre.

Le produit doit être :
simple,
fiable,
local,
crew-first,
partageable,
transparent.
```
