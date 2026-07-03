# GRYD — Abandon des hexagones visibles et nouvelle carte de territoires

## Objectif du document

Ce document formalise une décision produit majeure pour GRYD :

```txt
Ne plus afficher les hexagones dans l’interface utilisateur.
```

Les hexagones ou micro-cellules peuvent rester utilisés en backend pour calculer la capture, la propriété et les scores.  
Mais côté utilisateur, GRYD doit afficher :

```txt
des territoires
des zones
des secteurs
des routes
des frontières
des quartiers
```

La nouvelle formule :

```txt
Pas une grille.
Une ville à prendre.
```

---

# 1. Diagnostic

La carte actuelle avec hexagones visibles donne une impression trop :

```txt
technique
abstraite
SaaS
dashboard
prototype
data visualization
```

Elle ne donne pas assez l’impression de :

```txt
territoire
ville
frontière
conquête
rivalité
jeu
possession
```

Le problème n’est pas seulement esthétique.  
C’est un problème de compréhension immédiate.

Un utilisateur comprend plus vite une carte avec :

```txt
zones colorées
frontières
routes
quartiers
territoires rivaux
```

qu’une grille régulière de petits hexagones.

---

# 2. Nouvelle décision produit

## Décision principale

```txt
Supprimer les hexagones visibles de l’app.
```

## Nuance technique importante

```txt
Les hexagones peuvent rester en backend.
Ils ne doivent plus être affichés comme grille dans l’UI.
```

Donc :

```txt
Backend = micro-cellules / H3 / calcul précis.
Frontend = territoires organiques / zones / frontières.
```

---

# 3. Pourquoi c’est mieux

Les références visuelles montrent une direction plus forte :

```txt
carte réelle
zones colorées
frontières visibles
trajets lisibles
territoires disputés
```

C’est plus immédiat pour comprendre :

```txt
où est mon territoire ?
qui contrôle cette zone ?
où dois-je courir ?
qu’est-ce que je vais capturer ?
qu’est-ce que mon crew peut reprendre ?
```

Les hexagones visibles rendent le concept trop abstrait.  
Les zones colorées rendent le concept plus populaire, viral et compréhensible.

---

# 4. Nouvelle logique de carte

## Avant

```txt
Tu vois des hexagones.
Tu dois deviner où courir.
```

## Après

```txt
Tu vois des territoires.
GRYD te propose une route pour les prendre.
```

La carte ne doit pas seulement montrer un système.  
Elle doit guider l’action.

---

# 5. Nouveau rendu cartographique

## Nom recommandé

```txt
GRYD Territory Map
```

À la place de :

```txt
Hex Map
```

---

## Couches visuelles

La carte doit être composée de 7 couches :

```txt
1. Fond carte ville
2. Rues / chemins / parcs / cours d’eau
3. Territoires colorés
4. Frontières de crews
5. Tracé de course recommandé
6. Objectifs / zones chaudes
7. Labels de quartiers / secteurs
```

---

# 6. Territoires organiques

Au lieu de petits hexagones réguliers, afficher des zones organiques.

Les formes peuvent suivre :
- les rues ;
- les quartiers ;
- les parcs ;
- les cours d’eau ;
- les boucles de course ;
- les zones urbaines ;
- les secteurs naturels.

Même si techniquement la capture est calculée par micro-cellules, l’affichage doit être fusionné et lissé.

---

## Pipeline visuel recommandé

```txt
Micro-cellules capturées
→ fusion par propriétaire
→ simplification des contours
→ lissage des frontières
→ affichage en territoires organiques
```

---

# 7. Système de couleurs

## Ton crew

```txt
Chartreuse
```

Usage :
- territoire contrôlé ;
- route recommandée ;
- action principale ;
- validation ;
- capture réussie.

---

## Crew rival

```txt
Orange / rouge sombre
```

Usage :
- territoire rival ;
- attaque ;
- reprise ;
- menace.

---

## Zone contestée

```txt
Violet
ou double contour chartreuse + orange
```

Usage :
- zone disputée ;
- run groupé entre crews ;
- offensive active ;
- secteur sous pression.

---

## Neutre

```txt
Gris sombre
```

Usage :
- territoire non capturé ;
- zone disponible ;
- zone sauvage.

---

## Victoire / rareté

```txt
Gold
```

Usage :
- médaille ;
- secteur dominé ;
- récompense saison ;
- badge rare.

---

# 8. Frontières

Les frontières doivent être plus importantes que les cellules.

## Types de frontières

### Frontière normale

```txt
contour fin semi-lumineux
```

### Frontière rivalité

```txt
contour orange plus visible
```

### Frontière contestée

```txt
double contour
pulse lent
```

### Frontière protégée

```txt
halo défensif
icône shield
```

### Frontière en decay

```txt
pointillé
rouge muted si urgent
```

---

# 9. Route-first UX

La route doit devenir centrale.

Un coureur veut savoir :

```txt
je pars où ?
je tourne où ?
combien de km ?
combien de temps ?
qu’est-ce que je capture ?
est-ce que je reviens au départ ?
```

Donc la route doit être plus visible que les territoires quand l’utilisateur prépare une course.

---

## Hiérarchie en mode Route Planner

```txt
1. Route épaisse
2. Position actuelle
3. Rues / chemins / parcs
4. Zones capturables
5. Territoires colorés en transparence
6. Frontières secondaires
```

---

# 10. Battle Map vs Route Planner

GRYD doit avoir deux modes de carte.

---

## 10.1 Battle Map

Objectif :

```txt
Comprendre la guerre de territoire.
```

Affiche :
- territoires ;
- crews rivaux ;
- zones contestées ;
- frontières ;
- objectifs ;
- avant-postes ;
- routes stratégiques ;
- statut de zone.

Priorité visuelle :

```txt
territoires d’abord
routes ensuite
rues en arrière-plan
```

---

## 10.2 Route Planner

Objectif :

```txt
Savoir où courir.
```

Affiche :
- route à suivre ;
- rues lisibles ;
- distance ;
- durée ;
- zones capturables ;
- gains estimés ;
- retour départ ;
- difficulté ;
- sécurité.

Priorité visuelle :

```txt
route d’abord
rues ensuite
territoires en arrière-plan
```

---

# 11. Exemple d’écran Battle Map

```txt
PARIS EST
Zone contestée

Ton crew : 42 %
Canal Crew : 38 %
Neutre : 20 %

Route recommandée
4,8 km · +86 zones · 28 min

[DEFEND]
```

Sur la carte :
- zone chartreuse ;
- zone orange ;
- frontière entre les deux ;
- route chartreuse traversant les zones à défendre ;
- labels de quartiers discrets.

---

# 12. Exemple d’écran Route Planner

```txt
ROUTE DÉFENSE
République

4,8 km
28 min
+86 zones
12 rues à défendre
Boucle · retour départ

[Modifier distance]
[Démarrer]
```

Sur la carte :
- tracé chartreuse épais ;
- départ ;
- arrivée ;
- flèches de direction ;
- zones capturables légèrement lumineuses ;
- territoire crew / rival en transparence.

---

# 13. Nouveau vocabulaire produit

Il faut arrêter de parler d’hexagones côté utilisateur.

## À remplacer

```txt
hexes
grille
cellules
cluster
ownership
```

## Par

```txt
zones
territoires
secteurs
routes
frontières
quartiers
rues
contrôle
```

---

## Exemples de nouveaux textes

Avant :

```txt
+214 hexes
37 hex tenus
Cluster protégé
Ownership mis à jour
```

Après :

```txt
+214 zones capturées
37 zones tenues
Secteur protégé
Contrôle mis à jour
```

Encore mieux selon contexte :

```txt
12 rues défendues
Paris Est +12 %
Canal Crew repoussé
Route ouverte
Secteur repris
```

---

# 14. Impacts sur le scoring visible

Le backend peut continuer à utiliser :

```txt
H3
micro-cellules
claims
ownership
clusters techniques
```

Mais l’UI doit afficher :

```txt
zones capturées
secteurs tenus
rues défendues
routes ouvertes
territoires contrôlés
```

---

## Mapping technique / UI

```txt
hex → zone
cluster → secteur
ownership → contrôle
claim → capture
decay → zone à défendre
shield → protection
route trace → itinéraire
```

---

# 15. Post-run Reward sans hexagones

## Avant

```txt
COURSE VALIDÉE
+214 HEXES
```

## Après

```txt
COURSE VALIDÉE
+214 ZONES
```

Ou plus immersif :

```txt
PARIS EST REPRIS
+86 zones capturées
12 rues défendues
Night Pacers +12 %
```

---

## Séquence recommandée

```txt
1. Course validée
2. Zones capturées
3. Secteur modifié
4. Frontière repoussée
5. Contribution crew
6. Badge débloqué
7. Share card
```

---

# 16. Share cards et réseaux sociaux

Cette direction est beaucoup plus virale.

Une carte avec zones colorées est plus compréhensible sur Instagram / TikTok qu’une grille d’hexagones.

---

## Exemple share card

```txt
PARIS EST REPRIS

Night Pacers +12 %
86 zones capturées
12 rues défendues

Cours. Capture. Défends.
```

Visuel :
- carte avec zone chartreuse ;
- frontière orange repoussée ;
- route brillante ;
- gros chiffre ;
- logo GRYD.

---

# 17. Route Planner social

La route peut devenir un objet social.

Exemples :

```txt
Route défense République
4,8 km · +86 zones
```

```txt
Route offensive Canal
6,1 km · 87 zones rivales traversées
```

```txt
Route pionnière
8,4 km · nouvelle liaison possible
```

Les routes peuvent être partagées dans :
- Crew Chat ;
- War Room ;
- stories ;
- feed ;
- invitations de sortie.

---

# 18. War Room avec territoires

La War Room doit utiliser cette logique organique.

Au lieu de :

```txt
défendre 37 hexes
```

Dire :

```txt
Défendre République
12 rues à sauver
48 h restantes
+340 pts possibles
```

Au lieu de :

```txt
cluster à 62 %
```

Dire :

```txt
Paris Est contrôlé à 62 %
```

---

# 19. Crew HQ avec territoires

Le Crew HQ doit afficher :

```txt
Territoire crew
Paris Est : 42 %
Zones tenues : 2147
Frontières contestées : 3
Routes ouvertes : 6
```

Pas :

```txt
hex held
clusters
claim count
```

---

# 20. League avec territoires

Le classement doit parler comme un jeu de territoire.

Exemples :

```txt
#8 KORO
4 210 pts

342 pts du #7
≈ 35 zones neutres peuvent suffire
```

Ou :

```txt
Top 10 Paris
Récompense : Frame Paris Race
```

---

# 21. Arsenal avec territoires

Les objets doivent être reliés aux territoires organiques.

Exemples :

```txt
Shield
Protège un secteur 48 h

Scout
Révèle une zone faible

Radar
Montre les rues les plus rentables

Route Boost
Suggère une route optimisée

Skin territoire
Change l’apparence de tes zones
```

---

# 22. Modes de carte

## Mode Territoire

```txt
Voir qui contrôle quoi.
```

## Mode Route

```txt
Voir où courir.
```

## Mode Défense

```txt
Voir les rues / zones à sauver.
```

## Mode Raid

```txt
Voir les territoires rivaux à traverser.
```

## Mode Exploration

```txt
Voir les zones vierges et routes à ouvrir.
```

---

# 23. Lisibilité mobile

La carte doit être lisible :
- en plein soleil ;
- en courant ;
- d’un coup d’œil ;
- avec une seule main ;
- en mode sombre ;
- sur petit écran.

Règles :
- route épaisse ;
- labels courts ;
- grandes zones ;
- pas de micro-détails ;
- pas de grille dense ;
- CTA évident ;
- zoom intelligent.

---

# 24. Ce qu’il faut éviter

Ne pas faire :

```txt
petits hexagones visibles partout
grille omniprésente
carte trop technique
route trop fine
frontières invisibles
zones trop nombreuses
couleurs trop saturées
labels illisibles
```

Éviter aussi :

```txt
carte multicolore illisible comme un patchwork complet
```

Il faut garder une hiérarchie claire.

---

# 25. Système de rendu recommandé

## Backend

```txt
H3 ou micro-cellules
capture précise
anti-triche
calcul des scores
ownership technique
```

## Frontend

```txt
territoires fusionnés
zones organiques
frontières simplifiées
routes lisibles
labels contextuels
```

---

## Process de rendu

```txt
1. Récupérer les cellules capturées
2. Grouper par owner / crew
3. Fusionner les cellules adjacentes
4. Simplifier les contours
5. Lisser visuellement
6. Appliquer couleur / statut
7. Dessiner frontières
8. Superposer route
9. Afficher labels contextuels
```

---

# 26. Prompt Claude / Cursor

```md
Tu es Lead Product Designer, Game UI Designer et Map Product Designer.

Refais entièrement la carte GRYD.

## Décision majeure
Ne plus afficher les hexagones dans l’interface utilisateur.

Les hexagones ou micro-cellules peuvent rester utilisés en backend pour calculer la capture, mais l’utilisateur ne doit plus voir une grille hexagonale.

## Nouvelle direction
Créer une carte de conquête territoriale avec :
- zones organiques colorées ;
- frontières visibles ;
- routes très lisibles ;
- quartiers / secteurs ;
- territoires de crew ;
- territoires rivaux ;
- zones contestées ;
- tracés de course dominants.

## Style
La carte doit ressembler à une carte de territoire de jeu, pas à une grille SaaS.
Inspirations : carte de conquête, turf map, zones colorées, route planning, social map.

## Règles visuelles
- Ton crew = chartreuse.
- Crew rival = orange / rouge.
- Zone contestée = violet ou double contour.
- Neutre = gris sombre.
- Route recommandée = trait épais chartreuse.
- Les frontières doivent être lisibles.
- Les rues doivent rester visibles.
- Les hexagones ne doivent jamais apparaître côté utilisateur.

## UX
La carte doit répondre à :
1. Où est mon territoire ?
2. Qui contrôle la zone voisine ?
3. Où dois-je courir ?
4. Qu’est-ce que je vais capturer ?
5. Combien je peux gagner ?

## Modes carte
Créer 5 modes :
- Territoire
- Route
- Défense
- Raid
- Exploration

## Route Planner
Créer un mode itinéraire :
- route épaisse ;
- distance ;
- durée ;
- zones capturables ;
- points estimés ;
- boucle / aller simple ;
- objectif capture / défense / exploration.

## Post-run
Remplacer le vocabulaire visible :
- hexes → zones
- cluster → secteur
- ownership → contrôle
- capture cells → territoires capturés

Exemples :
+86 zones capturées
Paris Est +12 %
12 rues défendues
Secteur repris
Frontière repoussée
```

---

# 27. Prompt design visuel de la map

```md
Design a premium mobile game territory map for GRYD, a running conquest app.

Do not show hexagons.
Show organic colored territories following city streets, parks and natural boundaries.

Dark premium map style with readable roads.
Chartreuse territory for the user’s crew.
Orange territory for rival crew.
Violet double-border for contested zones.
Grey dark neutral areas.
Thick chartreuse route line clearly visible above the map.
Visible neighborhood labels.
Soft glowing borders.
Mobile-first readability.
No technical grid.
No SaaS dashboard feeling.
The map must feel like a city being conquered by runners.
```

---

# 28. Décisions finales

## Décision 1

```txt
Supprimer les hexagones visibles de l’UI.
```

## Décision 2

```txt
Afficher des territoires organiques colorés.
```

## Décision 3

```txt
Garder les hexagones uniquement comme couche technique invisible.
```

## Décision 4

```txt
Créer une vraie carte route-first pour le coureur.
```

## Décision 5

```txt
Renommer les métriques visibles :
hexes → zones / territoires / secteurs.
```

---

# 29. Conclusion

Oui, il faut laisser tomber les hexagones visibles.

C’est une meilleure direction pour GRYD.

La bonne formule devient :

```txt
Pas une grille.
Une ville à prendre.
```

La carte doit maintenant montrer :
- des territoires ;
- des frontières ;
- des routes ;
- des zones rivales ;
- des secteurs contestés ;
- des objectifs de crew ;
- des itinéraires lisibles.

GRYD ne doit plus demander à l’utilisateur de comprendre une grille.

GRYD doit lui montrer :

```txt
voici ton territoire,
voici l’ennemi,
voici la route,
cours ici pour prendre la zone.
```
