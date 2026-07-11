# GRYD — Amélioration de la page “Conquérir”

## Objectif de la page

La page **Conquérir** doit permettre au joueur de comprendre en moins de 5 secondes :

1. **Pourquoi courir maintenant** ;
2. **Quelle course choisir** ;
3. **Ce que cette course apporte à lui-même** ;
4. **Ce que cette course apporte à son crew** ;
5. **Combien de temps / distance / difficulté cela représente** ;
6. **Quel bouton lancer sans réfléchir**.

Actuellement, la page contient de bonnes mécaniques, mais elle donne encore l’impression d’un écran de configuration. Il y a trop de cartes, trop d’options, trop de choix visibles en même temps. Pour une app de running territoriale, l’écran doit devenir un **assistant de décision** : l’app propose la meilleure course selon le contexte, puis laisse l’utilisateur modifier rapidement s’il veut.

---

# 1. Diagnostic de l’écran actuel

## Ce qui fonctionne déjà

L’écran a plusieurs bases solides :

- la carte en haut donne un contexte territorial immédiat ;
- la distance est très visible ;
- le CTA principal “Conquérir” est clair ;
- les couleurs chartreuse / noir donnent une identité forte ;
- les notions “boucle”, “zones”, “crew”, “défendre” sont présentes ;
- la page commence à ressembler à un écran de jeu, pas à une app fitness classique.

## Ce qui bloque

Le problème principal : **l’utilisateur doit trop interpréter**.

Il voit :

- un objectif “Conquérir — Bastille” ;
- une distance ;
- une carte ;
- deux modes “Conquérir / Défendre” ;
- deux variantes “Rapide / Optimisée” ;
- un objectif crew ;
- des boucles populaires ;
- des options distance ;
- des options de style de course ;
- un bouton partage crew ;
- un gros CTA final.

Cela fait trop de décisions avant de courir.

La question que l’utilisateur se pose n’est pas :

> “Quel paramétrage dois-je choisir ?”

La vraie question est :

> “Quelle course est la meilleure pour moi et mon crew maintenant ?”

---

# 2. Principe UX à appliquer

## Règle principale

La page doit passer de :

```text
Je choisis tous les paramètres moi-même.
```

à :

```text
GRYD me recommande une course intelligente, puis je peux ajuster.
```

Donc l’écran ne doit pas commencer par des options. Il doit commencer par une **recommandation claire**.

---

# 3. Nouvelle hiérarchie de la page

La page doit être structurée en 5 blocs maximum :

```text
1. Résumé de la course recommandée
2. Carte simplifiée
3. Pourquoi cette course est recommandée
4. Alternatives rapides
5. Bouton de lancement
```

Tout le reste doit être secondaire, pliable ou accessible après un tap.

---

# 4. Structure recommandée de l’écran

## Haut de page — résumé immédiat

Au lieu d’afficher seulement :

```text
3,4 km
20 min · +52 zones dont 28 en boucle · +520 pts
```

Il faut afficher une proposition plus lisible :

```text
Course recommandée
Conquérir Bastille
3,4 km · 20 min · +520 pts
52 zones · 28 en boucle
```

Avec un statut clair :

```text
Meilleur choix maintenant
```

ou :

```text
Optimisé pour ton crew
```

ou :

```text
Adapté à ton temps habituel
```

### Exemple final

```text
CONQUÉRIR BASTILLE
Meilleur choix maintenant

3,4 km · 20 min
+520 pts · 52 zones · 28 en boucle
```

L’utilisateur comprend immédiatement le bénéfice.

---

# 5. Carte : simplifier fortement

La carte actuelle prend beaucoup de place, mais elle n’explique pas assez la décision.

## Ce que la carte doit montrer uniquement

En mode pré-course, la carte doit afficher :

- le point de départ ;
- le point de retour / fermeture ;
- la route recommandée ;
- les zones capturées par la boucle ;
- les zones crew utiles ;
- les zones rivales seulement si elles impactent la course.

Pas besoin d’afficher trop de détails de rue.

## Code visuel recommandé

```text
Route recommandée : chartreuse épais
Boucle capturable : remplissage chartreuse transparent
Zones crew : contour chartreuse
Zones rivales : contour orange uniquement si danger
Point départ : rond blanc/chartreuse
Point retour : cible chartreuse
Segment optionnel : pointillé
```

## Carte idéale

La carte ne doit pas seulement montrer une route. Elle doit prouver pourquoi cette route est intéressante.

Ajouter 3 micro-indicateurs sur la carte :

```text
+52 zones
Boucle fermée
+Crew impact
```

Pas sous forme de gros texte, mais en petits badges contextuels.

---

# 6. Fusionner “Conquérir” et “Défendre”

Actuellement, il y a un switch :

```text
Conquérir | Défendre
```

Mais ce choix ajoute de la friction. L’utilisateur ne doit pas forcément choisir manuellement entre attaquer et défendre.

## Recommandation

Remplacer par une logique d’intention automatique :

```text
Objectif recommandé : Conquérir
```

Puis afficher une alternative si nécessaire :

```text
Défense urgente disponible : République · +258 pts
```

Au lieu d’un onglet “Défendre”, il faut une **carte d’alerte crew**.

### Exemple

```text
Objectif crew urgent
Défendre République
12 rues à sauver · 48 h restantes · +258 pts
[Choisir cet objectif]
```

Cela rend la défense contextuelle au lieu de la mettre au même niveau que l’action principale.

---

# 7. Remplacer les cartes “Rapide / Optimisée” par 3 choix simples

Actuellement :

```text
A — Rapide
B — Optimisée
```

C’est bien, mais pas assez explicite. “Optimisée” ne dit pas optimisée pour quoi : points, distance, crew, fatigue, zones ?

## Nouvelle version

Créer 3 choix maximum :

```text
Recommandée
Rapide
Max points
```

### 1. Recommandée

La meilleure course selon :

- habitudes de l’utilisateur ;
- distance moyenne ;
- heure ;
- zone proche ;
- objectif crew ;
- opportunités territoriales ;
- météo éventuellement plus tard ;
- niveau de fatigue estimé plus tard.

### 2. Rapide

Pour courir sans réfléchir :

```text
2–3 km · 15–20 min · effort léger
```

### 3. Max points

Pour optimiser le jeu :

```text
plus de zones, plus de boucle, plus de points, distance plus élevée
```

## Exemple d’affichage

```text
Choisis ton plan

[Recommandée]
3,4 km · 20 min · +520 pts
Meilleur équilibre aujourd’hui

[Rapide]
2,1 km · 13 min · +210 pts
Simple, proche, efficace

[Max points]
5,1 km · 32 min · +940 pts
Plus rentable pour le crew
```

L’utilisateur comprend immédiatement.

---

# 8. Relier la course aux attentes du joueur

La page doit utiliser les habitudes utilisateur.

## Données à prendre en compte

```text
Distance moyenne des 10 dernières courses
Durée moyenne
Jours habituels de course
Heure habituelle
Allure moyenne
Type préféré : boucle / aller simple / exploration
Objectifs récents : XP, conquête, défense, performance
Zones fréquentées
Tolérance aux grands axes
Préférence dénivelé
```

## Exemple de message personnalisé

```text
Adapté à tes habitudes
Tu cours souvent autour de 3–4 km le soir.
Cette boucle garde ton format habituel et capture 52 zones.
```

Ou :

```text
Plus ambitieux que d’habitude
+1,2 km par rapport à ta moyenne, mais +420 pts crew.
```

Ou :

```text
Course tranquille
Sous ta distance moyenne, idéale pour maintenir ton streak.
```

Ces messages permettent au joueur de comprendre pourquoi la course lui est proposée.

---

# 9. Relier la course aux attentes du crew

L’utilisateur doit comprendre ce que sa course apporte au crew.

## Ajouter un bloc “Impact crew”

Exemple :

```text
Impact crew
+52 zones pour Blackline
+28 zones en boucle
Aide à sécuriser Bastille
Progression coffre crew : +8 %
```

Mais il faut le faire court.

### Version compacte recommandée

```text
Impact crew
+52 zones · +8 % coffre · Bastille renforcée
```

Ou sous forme de 3 chips :

```text
+52 zones
+8 % coffre
Bastille renforcée
```

## Objectif crew urgent

Si une défense est importante, elle doit apparaître avant les boucles populaires.

Exemple :

```text
Priorité crew
République attaquée
12 rues à sauver · +258 pts · 48 h restantes
[Basculer en défense]
```

La défense ne doit pas être noyée au milieu des options.

---

# 10. Supprimer ou cacher les “Boucles populaires” au premier niveau

Les boucles populaires sont utiles, mais elles ne doivent pas venir trop tôt.

Actuellement, elles ajoutent encore du choix.

## Nouvelle logique

Les boucles populaires doivent devenir une section pliable :

```text
Autres boucles proches
```

Par défaut, afficher seulement 2 alternatives maximum :

```text
Alternative courte
Alternative rentable
```

Exemple :

```text
Autres options
[Courte] Le tour du Canal · 2,1 km · +210 pts
[Rentable] Rempart République · 4,4 km · +860 pts
```

Pas besoin d’afficher 3 ou 4 cartes détaillées au départ.

---

# 11. Simplifier les options

Actuellement :

```text
3 km / 5 km / 10 km / Libre
Boucle / Aller simple / Éviter grands axes / Dénivelé mini
Capture / Performance / Exploration
```

C’est trop. On dirait un configurateur sportif.

## Version recommandée

Remplacer par une seule ligne :

```text
Préférence
[Simple] [Points] [Explorer]
```

Puis un lien secondaire :

```text
Ajuster
```

Quand l’utilisateur clique sur “Ajuster”, il voit les options avancées :

```text
Distance : 3 / 5 / 10 / libre
Format : boucle / aller simple
Confort : éviter grands axes / dénivelé mini
Objectif : capture / performance / exploration
```

Mais par défaut, il ne faut pas tout afficher.

## Pourquoi

Un nouvel utilisateur doit pouvoir lancer une course sans comprendre tous les paramètres.

---

# 12. Nouvelle page recommandée — version MVP

Voici la structure exacte que je recommande.

```text
--------------------------------------------------
←                         CONQUÉRIR BASTILLE
--------------------------------------------------

Course recommandée
3,4 km · 20 min · +520 pts
52 zones · 28 en boucle

[Carte simplifiée avec route + zone capturable]

Pourquoi cette course ?
Adaptée à tes habitudes · Forte valeur crew · Boucle fermée

Choisis ton plan
[Recommandée] 3,4 km · +520 pts
[Rapide]      2,1 km · +210 pts
[Max points]  5,1 km · +940 pts

Priorité crew
République attaquée · 12 rues · +258 pts
[Basculer en défense]

Préférence
[Simple] [Points] [Explorer]

[CONQUÉRIR]
--------------------------------------------------
```

Cette version est beaucoup plus simple.

---

# 13. Version encore plus simple pour mobile

Sur mobile, il faut encore réduire.

```text
CONQUÉRIR BASTILLE
3,4 km · 20 min · +520 pts

[Map]

Recommandée pour toi
Habitude 3–4 km · +52 zones · +8 % coffre crew

[Rapide] [Max points]

Alerte crew : République attaquée +258 pts

[CONQUÉRIR]
```

Les détails avancés passent en drawer.

---

# 14. Le bon bouton principal

Le CTA doit changer selon le contexte.

## Si objectif attaque

```text
CONQUÉRIR
```

## Si objectif défense urgent

```text
DÉFENDRE RÉPUBLIQUE
```

## Si course crew

```text
LANCER AVEC LE CREW
```

## Si route optimisée pour habitude

```text
LANCER LA COURSE
```

Mais pour le MVP, garder :

```text
CONQUÉRIR
```

avec un sous-texte juste au-dessus :

```text
3,4 km · 20 min · +520 pts
```

---

# 15. Ajouter une vraie recommandation intelligente

La page doit choisir une course automatiquement selon un score.

## Score de recommandation

Chaque route candidate reçoit un score :

```text
score = utilisateur + crew + territoire + confort + nouveauté
```

### 1. Score utilisateur

```text
proximité avec distance habituelle
proximité avec durée habituelle
niveau d’effort estimé
préférence boucle / exploration / performance
historique de zones fréquentées
```

### 2. Score crew

```text
objectif crew actif
zone à défendre
zone à capturer
impact coffre crew
participation à mission quotidienne
```

### 3. Score territoire

```text
zones capturables
zones rivales faibles
nombre de frontières renforcées
surface capturée
qualité de la boucle
```

### 4. Score confort

```text
grandes routes évitées
dénivelé acceptable
densité urbaine
sécurité parcours
simplicité du trajet
```

### 5. Score nouveauté

```text
rues jamais parcourues
zones jamais explorées
possibilité de badge
bonus découverte
```

---

# 16. Pseudo-logique de recommandation

```text
Pour chaque route possible autour du joueur :

1. Calculer distance et durée estimée
2. Calculer zones capturées
3. Détecter si boucle fermée
4. Calculer impact crew
5. Vérifier objectifs urgents
6. Comparer avec habitudes utilisateur
7. Vérifier contraintes confort
8. Donner un score global
9. Proposer 3 routes :
   - recommandée
   - rapide
   - max points
```

---

# 17. Les 3 plans à générer automatiquement

## Plan 1 — Recommandée

Objectif : meilleur équilibre.

```text
Distance proche de l’habitude
Bonne capture
Bonne valeur crew
Pas trop complexe
```

## Plan 2 — Rapide

Objectif : friction minimale.

```text
Distance courte
Retour simple
Peu de croisements
Capture correcte
Idéal streak
```

## Plan 3 — Max points

Objectif : joueur motivé.

```text
Distance plus longue
Plus de zones
Meilleure boucle
Meilleur impact crew
Récompense supérieure
```

---

# 18. Ce qu’il faut afficher dans chaque carte de plan

Chaque carte doit contenir seulement :

```text
Nom du plan
Distance
Durée
Gain principal
Raison simple
```

Exemple :

```text
Recommandée
3,4 km · 20 min
+520 pts
Adaptée à tes habitudes
```

```text
Rapide
2,1 km · 13 min
+210 pts
Pour lancer sans réfléchir
```

```text
Max points
5,1 km · 32 min
+940 pts
Meilleure valeur crew
```

Pas plus.

---

# 19. Ce que la page ne doit plus afficher par défaut

À cacher derrière “Ajuster” :

```text
3 km / 5 km / 10 km / Libre
Boucle / Aller simple
Éviter grands axes
Dénivelé mini
Capture / Performance / Exploration
Boucles populaires complètes
Partager au crew
```

Ces éléments sont utiles, mais ils ne doivent pas bloquer le lancement.

---

# 20. Nouvelle logique “Partager au crew”

Le bouton “Partager au crew” est actuellement trop bas et trop isolé.

Il doit être contextuel.

## Si la course est solo

Afficher discret :

```text
Partager cette route au crew
```

## Si la course aide le crew

Afficher plus fort :

```text
2 membres proches peuvent aider
[Inviter le crew]
```

## Si objectif crew urgent

Afficher :

```text
Appeler le crew en renfort
```

Cela donne une vraie utilité sociale.

---

# 21. Intégrer les habitudes sans enfermer l’utilisateur

Tu veux optimiser la course selon les habitudes, mais pas forcément toujours. La bonne approche :

```text
Par défaut : route adaptée aux habitudes
Alternatives : route courte / route rentable / route exploration
```

L’utilisateur garde la liberté.

## Exemples de phrases

```text
Comme d’habitude
3–4 km autour de Bastille
```

```text
Changer de rythme
5,1 km pour maximiser les points
```

```text
Explorer
Nouvelles rues + bonus découverte
```

---

# 22. Gestion des attentes utilisateur vs crew

Il faut afficher un arbitrage clair.

## Si la meilleure course pour l’utilisateur est aussi bonne pour le crew

```text
Meilleur choix
Adapté à toi · utile au crew
```

## Si la meilleure course pour le crew est plus difficile

```text
Objectif crew prioritaire
+1,7 km vs ton habitude · +940 pts crew
```

## Si l’utilisateur veut juste courir simple

```text
Course rapide
Moins de points, mais parfaite pour ton streak
```

Cela évite la frustration.

---

# 23. États recommandés de la page

## État normal

```text
Course recommandée pour toi
```

## État attaque/conquête

```text
Opportunité de conquête proche
```

## État défense urgente

```text
Ton crew a besoin de toi
```

## État streak

```text
Course courte pour garder ton streak
```

## État exploration

```text
Nouvelle zone à découvrir
```

## État performance

```text
Parcours rapide pour battre ton record
```

La même page peut servir à tout, mais le titre et la recommandation changent.

---

# 24. Design visuel recommandé

## Réduire les bordures

L’écran actuel a beaucoup de rectangles et de contours. Cela donne un aspect dashboard.

Il faut :

- moins de cartes encadrées ;
- plus de hiérarchie typographique ;
- plus d’espaces ;
- des cartes uniquement pour les vrais choix ;
- un gros CTA clair.

## Priorité visuelle

```text
1. CTA
2. Distance / durée / points
3. Carte
4. Plan recommandé
5. Impact crew
6. Ajustements
```

## Couleurs

```text
Chartreuse = action principale / gain / sélection
Rouge = urgence crew
Bleu = protection / sécurité
Or = bonus rare
Gris = secondaire
```

Ne pas utiliser le chartreuse partout, sinon tout semble important.

---

# 25. Nouvelle version de la page — wireframe final

```text
┌────────────────────────────────────────────┐
│ ←               CONQUÉRIR BASTILLE         │
│                                            │
│  Course recommandée                        │
│  3,4 km · 20 min · +520 pts                │
│  52 zones · 28 en boucle                   │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │        CARTE SIMPLIFIÉE              │  │
│  │   route + boucle + zones capturées   │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Pourquoi cette course ?                   │
│  [Adaptée à toi] [Forte valeur crew]       │
│  [Boucle fermée]                           │
│                                            │
│  Plans                                     │
│  ┌──────────────┐ ┌──────────────┐         │
│  │ Recommandée  │ │ Rapide       │         │
│  │ 3,4 km       │ │ 2,1 km       │         │
│  │ +520 pts     │ │ +210 pts     │         │
│  └──────────────┘ └──────────────┘         │
│  ┌──────────────┐                          │
│  │ Max points   │                          │
│  │ 5,1 km       │                          │
│  │ +940 pts     │                          │
│  └──────────────┘                          │
│                                            │
│  Priorité crew                             │
│  République attaquée · +258 pts            │
│                                            │
│  [Ajuster la course]                       │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [          CONQUÉRIR          ]           │
└────────────────────────────────────────────┘
```

---

# 26. Version mobile ultra-simple

```text
CONQUÉRIR BASTILLE
3,4 km · 20 min · +520 pts

[MAP]

Recommandée
Adaptée à tes habitudes · utile au crew

[Rapide] [Max points]

Crew : République attaquée +258 pts

[CONQUÉRIR]
```

C’est la version la plus fluide.

---

# 27. Comportement au tap

## Tap sur la carte

Ouvre un aperçu route :

```text
Zones capturées
segments clés
difficulté
risques
```

## Tap sur “Rapide”

Met à jour :

- distance ;
- durée ;
- points ;
- route sur carte ;
- CTA.

## Tap sur “Max points”

Met à jour la route et affiche :

```text
+1,7 km vs recommandé
+420 pts crew
```

## Tap sur “Priorité crew”

Transforme la page en mode défense :

```text
DÉFENDRE RÉPUBLIQUE
2,8 km · 18 min · +258 pts
12 rues à sauver
```

---

# 28. Fonctionnalités MVP à garder

Pour le MVP, garder uniquement :

```text
1. Carte route prévisualisée
2. Course recommandée
3. Alternative rapide
4. Alternative max points
5. Objectif crew urgent
6. Ajuster en option
7. CTA principal
```

Cela suffit.

---

# 29. Fonctionnalités à repousser

À repousser après MVP :

```text
Options avancées multiples
Dénivelé mini
Éviter grands axes
Partager au crew avancé
Toutes les boucles populaires
Analyse météo
Fatigue estimée
Score détaillé de recommandation
Comparatif complet des parcours
```

Ces éléments peuvent venir plus tard.

---

# 30. Spécification de l’algorithme de recommandation MVP

## Données nécessaires

```text
user_id
position actuelle
historique distance moyenne
historique durée moyenne
préférence récente
territoires proches
objectifs crew actifs
routes populaires proches
zones capturables proches
zones à défendre proches
```

## Sortie attendue

L’algorithme doit retourner :

```text
recommended_route
quick_route
max_points_route
crew_priority_route optionnelle
```

Chaque route doit contenir :

```text
id
type
distance_km
duration_min
points_estimated
zones_estimated
loop_zones_estimated
crew_impact_score
personal_fit_score
geometry
reason_tags
```

## Tags de raison

```text
adapted_to_habits
high_crew_value
closed_loop
quick_streak
max_points
new_area
defense_urgent
safe_route
popular_loop
```

Ces tags servent à afficher les phrases simples.

---

# 31. Exemple de réponse JSON côté front

```json
{
  "screen_title": "Conquérir Bastille",
  "recommended_route_id": "route_123",
  "routes": [
    {
      "id": "route_123",
      "label": "Recommandée",
      "distance_km": 3.4,
      "duration_min": 20,
      "points": 520,
      "zones": 52,
      "loop_zones": 28,
      "personal_fit_score": 86,
      "crew_impact_score": 72,
      "reason_tags": ["adapted_to_habits", "high_crew_value", "closed_loop"]
    },
    {
      "id": "route_124",
      "label": "Rapide",
      "distance_km": 2.1,
      "duration_min": 13,
      "points": 210,
      "zones": 18,
      "loop_zones": 8,
      "personal_fit_score": 91,
      "crew_impact_score": 38,
      "reason_tags": ["quick_streak", "safe_route"]
    },
    {
      "id": "route_125",
      "label": "Max points",
      "distance_km": 5.1,
      "duration_min": 32,
      "points": 940,
      "zones": 94,
      "loop_zones": 41,
      "personal_fit_score": 61,
      "crew_impact_score": 94,
      "reason_tags": ["max_points", "high_crew_value"]
    }
  ],
  "crew_priority": {
    "type": "defense",
    "title": "Défendre République",
    "distance_km": 2.8,
    "points": 258,
    "time_remaining": "48 h",
    "reason_tags": ["defense_urgent"]
  }
}
```

---

# 32. Copywriting exact recommandé

## Titre

```text
Conquérir Bastille
```

## Sous-titre recommandé

```text
Course recommandée pour toi et utile au crew
```

## Bloc raison

```text
Pourquoi cette course ?
Adaptée à tes habitudes · Boucle fermée · Forte valeur crew
```

## Objectif crew

```text
Priorité crew
République attaquée · 12 rues à sauver · +258 pts
```

## Options avancées

```text
Ajuster la course
```

## CTA

```text
Conquérir
```

## Microcopy CTA

```text
3,4 km · 20 min · +520 pts
```

---

# 33. Résultat attendu

La nouvelle page doit donner cette sensation :

```text
GRYD sait où je suis.
GRYD sait comment je cours.
GRYD sait ce dont mon crew a besoin.
GRYD me propose la meilleure course.
Je peux lancer maintenant ou ajuster vite.
```

C’est exactement la promesse à viser.

---

# 34. Décision finale

La page actuelle doit être simplifiée autour d’un principe :

```text
Une recommandation principale.
Deux alternatives.
Un objectif crew urgent.
Un bouton clair.
```

Structure finale :

```text
Course recommandée
Carte
Pourquoi cette course
Plans : Recommandée / Rapide / Max points
Priorité crew
Ajuster
CTA
```

C’est plus simple, plus game, plus intelligent, et beaucoup moins frictionnel.
