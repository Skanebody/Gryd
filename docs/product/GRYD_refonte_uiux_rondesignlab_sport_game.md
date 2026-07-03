# GRYD — Refonte UI/UX avec analyse Rondesignlab, sport premium et game UI

## Objectif du document

Ce document revoit l’UI/UX de GRYD à partir de l’analyse Rondesignlab et des références running / sport premium déjà étudiées.

Il définit :
- ce qu’il faut reprendre de Rondesignlab ;
- ce qu’il ne faut surtout pas copier ;
- comment adapter leurs patterns à GRYD ;
- comment séparer les écrans de conviction et les écrans d’usage réel ;
- comment améliorer la carte, le Route Planner, le Live Run, le Crew HQ, la War Room, l’Arsenal, le League et le Post-run Reward ;
- comment garder une app premium, lisible, communautaire et gaming sans tomber dans le pur visuel Dribbble.

Principe central :

```txt
Spectaculaire pour donner envie.
Lisible pour courir.
Social pour revenir.
Gaming pour progresser.
```

---

# 1. Conclusion stratégique

L’analyse Rondesignlab change la direction UI de GRYD.

Rondesignlab est une excellente référence pour :

```txt
landing page
App Store screenshots
onboarding
écrans héros
money screens
pitch deck
screens de communication
post-run reward
badge unlock
crew level up
```

Mais c’est une mauvaise référence pour :

```txt
Route Planner opérationnel
Live Run
support
gestion d’erreurs
cartes utilisées dehors
War Room dense
écrans de décision rapide
```

La règle pour GRYD :

```txt
GRYD doit être spectaculaire quand il récompense,
mais ultra lisible quand il guide.
```

---

# 2. Ce que GRYD doit reprendre de Rondesignlab

## 2.1 Dark mode premium

Rondesignlab maîtrise très bien :
- fonds sombres ;
- surfaces premium ;
- contrastes forts ;
- accent unique ;
- profondeur visuelle ;
- ambiance technologique.

Pour GRYD :
- conserver le dark premium ;
- garder une base carbone / noir profond ;
- utiliser la chartreuse comme signature principale ;
- ajouter quelques couleurs fonctionnelles, mais avec discipline.

---

## 2.2 Un seul accent saturé

Leur force est de ne pas utiliser 10 couleurs à la fois.

Pour GRYD :

```txt
Chartreuse = action / ton crew / réussite
Orange = rival / attaque
Violet = contesté / rareté
Gold = victoire / médaille
Blue steel = verify / confiance
Grey = neutre
Muted red = danger / decay
```

Règle :

```txt
La chartreuse est la signature.
Les autres couleurs sont des statuts de jeu, pas de la décoration.
```

---

## 2.3 KPI géants

Rondesignlab rend les chiffres héroïques.

GRYD doit faire pareil avec :

```txt
4,8 KM
+214 HEXES
62 %
#8 → #7
66 %
78
2147
```

Un jeu mobile ne doit pas seulement afficher les chiffres.  
Il doit les faire ressentir.

---

## 2.4 Bento cards

Leur usage des cartes modulaires est utile.

Pour GRYD, remplacer les listes longues par des bento cards :

Avant :

```txt
Niv. 2 Crew Marker
Niv. 3 Badge Frame
Niv. 4 War Room
Niv. 5 Weekly Chest
```

Après :

```txt
[ Coffre 66 % ] [ Rank #8 ]
[ 7/10 actifs ] [ Offensive prête ]
[ Prochain perk ] [ Défense urgente ]
```

Détail au tap.

---

## 2.5 Objet central / digital twin

Rondesignlab met souvent un objet central :
- voiture ;
- robot ;
- pompe ;
- satellite ;
- corps humain.

Pour GRYD, l’objet central n’est pas un gadget 3D.

Le vrai digital twin de GRYD est :

```txt
la ville transformée en territoire jouable
```

Objets centraux GRYD :

```txt
Battle Map
Route à suivre
Crew Crest
War Chest
Player Card
Zone contestée
Badge / Medal
```

---

## 2.6 Glassmorphism léger

À utiliser pour :
- landing ;
- onboarding ;
- post-run reward ;
- badge unlock ;
- crew level up ;
- App Store screenshots ;
- cards premium ;
- mockups.

À éviter pour :
- Live Run ;
- Route Planner principal ;
- support ;
- données critiques ;
- lisibilité en extérieur ;
- écrans safety / privacy.

Règle :

```txt
Glass pour convaincre.
Contraste pour courir.
```

---

## 2.7 Un écran = une décision

C’est le pattern UX le plus important.

Chaque écran GRYD doit avoir une décision principale.

Exemples :

```txt
Home → démarrer la route recommandée
Battle Map → trouver un itinéraire
Route Planner → démarrer cette route
Live Run → continuer / terminer
Post-run → partager la conquête
Crew HQ → rejoindre l’objectif crew
War Room → défendre / raider
League → rattraper le rang suivant
Arsenal → obtenir / équiper un objet
```

---

# 3. Ce que GRYD ne doit pas copier

## 3.1 Data-viz décorative

Rondesignlab utilise souvent des jauges et courbes très jolies mais peu actionnables.

GRYD doit éviter les graphiques décoratifs.

Chaque data-viz doit répondre à :

```txt
Qu’est-ce que je dois faire ?
Qu’est-ce que je peux gagner ?
Qu’est-ce qui est urgent ?
Qu’est-ce qui a changé ?
```

---

## 3.2 UI faite pour Dribbble

Un écran peut être magnifique en vignette et mauvais en usage réel.

GRYD sera utilisé :
- dehors ;
- en mouvement ;
- sous soleil ;
- pendant l’effort ;
- avec fatigue ;
- avec GPS ;
- parfois sous pluie ;
- parfois avec une seule main.

Donc il faut privilégier :
- gros chiffres ;
- fort contraste ;
- route lisible ;
- CTA clair ;
- textes courts ;
- gestes simples.

---

## 3.3 Trop de glass

Le glassmorphism peut nuire à :
- contraste ;
- lisibilité ;
- accessibilité ;
- lecture en extérieur.

Donc :
- glass léger pour surfaces premium ;
- fond plein pour route / live / support.

---

## 3.4 Absence d’états réels

Rondesignlab montre souvent les money screens, rarement :
- erreurs ;
- loading ;
- offline ;
- vide ;
- conflit ;
- rejet ;
- GPS faible ;
- course partielle ;
- support ;
- edge cases.

GRYD doit prévoir tous ces états.

Exemples :

```txt
GPS faible
Segment exclu
Course partielle
Stats only
Run groupé détecté
Zone privée
Course rejetée
Réseau faible
Source non connectée
Aucun crew trouvé
Aucun itinéraire sûr
```

---

# 4. Nouvelle logique GRYD : deux régimes UI

GRYD doit avoir deux régimes d’interface.

---

## 4.1 Régime 1 — Écrans de conviction

Objectif :

```txt
donner envie
impressionner
faire partager
vendre l’univers
```

Écrans concernés :
- landing ;
- App Store ;
- onboarding ;
- post-run reward ;
- badge unlock ;
- crew level up ;
- chest opening ;
- rank up ;
- share cards ;
- founder campaign.

Style :
- cinématographique ;
- KPI géants ;
- glass léger ;
- bento cards ;
- glow ;
- mockups ;
- illustrations / photos IA ;
- animation.

---

## 4.2 Régime 2 — Écrans d’usage réel

Objectif :

```txt
aider le runner à agir vite
```

Écrans concernés :
- Route Planner ;
- Live Run ;
- Battle Map opérationnelle ;
- War Room ;
- Support ;
- Sources connectées ;
- privacy ;
- settings.

Style :
- lisible ;
- contrasté ;
- moins décoratif ;
- moins de glass ;
- hiérarchie brutale ;
- route dominante ;
- texte court ;
- CTA évident ;
- états d’erreur clairs.

---

# 5. Landing page

Rondesignlab est une excellente référence pour la landing.

La landing GRYD doit être un “money screen” très fort.

## Structure recommandée

```txt
Hero photo réaliste + mockup Battle Map
Concept en 3 bento cards
Route Planner en grand visuel
Crew War / War Room
Rewards / badges
Waitlist
```

---

## Hero

Objectif :
montrer immédiatement :

```txt
un crew humain
une ville
une route
des hexes
une énergie de conquête
```

Composition :
- photo IA ultra réaliste d’un crew ;
- ville européenne ensoleillée ;
- route chartreuse subtile ;
- hex grid léger ;
- mockup app flottant ;
- headline ;
- CTA waitlist.

Copy possible :

```txt
Cours. Capture. Défends.
```

Sous-texte :

```txt
GRYD transforme chaque run en conquête territoriale.
```

---

# 6. Onboarding

L’onboarding doit être immersif, pas seulement explicatif.

## Écran 1

```txt
La ville devient une carte.
```

Visuel :
- photo IA réaliste d’un crew ;
- overlay hex subtil ;
- route chartreuse.

---

## Écran 2

```txt
Chaque run capture du territoire.
```

Visuel :
- mockup route + hexes ;
- compteur +hexes.

---

## Écran 3

```txt
Seul tu prends des rues.
En crew, tu prends la ville.
```

Visuel :
- crew ;
- blason ;
- zone capturée.

---

## Écran 4

```txt
Choisis ton style.
```

Choix :

```txt
Focus Solo
Mixte
Crew War
```

---

## Écran 5

```txt
Rejoins un crew ou crée le tien.
```

Actions :
- rejoindre crew proche ;
- créer crew fondateur ;
- inviter amis.

---

# 7. Home / Today

GRYD a besoin d’un écran “Today” ou d’un état d’accueil très clair.

Objectif :

```txt
Que dois-je faire maintenant ?
```

---

## Wireframe

```txt
BONJOUR KORO

Paris Est est contesté.

ROUTE RECOMMANDÉE
4,8 km
+86 hexes
28 min
Boucle · retour départ

[START RUN]

Cette semaine
2/3 runs · Score Forme 78 · Coffre crew 66 %
```

---

## Règles UI

- 1 action principale ;
- 1 route recommandée ;
- 2 ou 3 indicateurs secondaires maximum ;
- gros chiffre ;
- CTA chartreuse ;
- pas de long feed.

---

# 8. Battle Map

La Battle Map est la vue jeu.

Objectif :

```txt
Qui contrôle quoi ?
Qui attaque ?
Quelle zone est contestée ?
Quel objectif est actif ?
```

---

## À afficher

- ton territoire ;
- territoire rival ;
- zone contestée ;
- objectif crew ;
- routes stratégiques ;
- decay ;
- boucliers ;
- avant-postes ;
- mini War Feed ;
- bouton “Trouver un itinéraire”.

---

## Hiérarchie

En Battle Map :

```txt
1. Territoire
2. Statut de zone
3. Rival / menace
4. Objectif
5. Routes
6. Rues en arrière-plan
```

---

## Exemple HUD

```txt
SAISON 0 · J-12
Paris Est · Zone contestée
Crew rank #8
```

Carte :
- hexes ;
- rival ;
- objectif ;
- routes ;
- labels.

Bas :

```txt
OBJECTIF CREW
Défendre 12 hexes
+340 pts possibles

[Trouver un itinéraire]
```

---

# 9. Route Planner

C’est le point le plus important pour l’usage réel.

La carte actuelle ne suffit pas pour un coureur.

GRYD doit dire :

```txt
cours ici pour prendre ce territoire
```

---

## Règle absolue

En mode Route Planner :

```txt
la route prime sur les hexes.
```

Hiérarchie :

```txt
1. Route épaisse
2. Rues visibles
3. Position
4. Prochaine direction
5. Hexes en transparence
6. Territoire en arrière-plan
```

---

## Écran Route Planner

```txt
ITINÉRAIRE RECOMMANDÉ

4,8 km · 28 min
+86 hexes · +340 pts
Boucle · retour départ

[Carte avec route dominante]

Objectif
Défendre République
12 hexes à sauver · 48 h restantes

[Modifier distance] [Démarrer]
```

---

## Types de routes

```txt
Capture rapide
Défense
Raid
Exploration
Boucle facile
Sortie longue
Social Run
Course privée
```

---

## Options

```txt
Distance : 3 km / 5 km / 10 km / libre
Type : boucle / aller simple
Priorité : capture / défense / performance / exploration
Sécurité : éviter grands axes
Dénivelé : faible / peu importe
Départ : position actuelle / autre point
```

---

## Routes proposées

```txt
Route A — Rapide
3,4 km · +52 hexes

Route B — Optimisée
5,1 km · +94 hexes

Route C — Défense
4,8 km · 12 hexes sauvés
```

---

# 10. Live Run

Le Live Run doit s’inspirer plus de Nike que de Rondesignlab.

Pendant la course :
- pas de decoration excessive ;
- pas de glass inutile ;
- pas trop de données ;
- lisibilité maximale.

---

## Écran live principal

```txt
4,74 KM

+62 HEXES

5'09 / km
24:26
GRYD VERIFIED
```

Contrôles :

```txt
[Pause] [Map] [Finish]
```

---

## Mode carte live

Afficher :
- route à suivre ;
- prochain virage ;
- trace en cours ;
- hexes qui s’allument ;
- distance restante ;
- objectif restant.

Ne pas afficher :
- tout le territoire ;
- tous les rivaux ;
- trop de feed ;
- trop de labels.

---

## Animation live

- route qui se dessine ;
- hexes qui s’allument ;
- compteur +hexes ;
- haptic léger ;
- alerte GPS douce.

---

# 11. Post-run Reward

Ici, Rondesignlab + Supercell sont utiles.

Le post-run doit être spectaculaire.

---

## Séquence

```txt
COURSE VALIDÉE
GRYD VERIFIED

+214 HEXES

PARIS EST +12 %
NIGHT PACERS #8 → #7

BADGE DEFENDER II
```

CTA :

```txt
Partager la conquête
Voir la carte
```

---

## Animations

- check Verified ;
- compteur hexes ;
- capture wave ;
- map before / after ;
- rank up ;
- badge reveal ;
- share card.

---

# 12. Crew HQ

Le Crew HQ doit devenir une base de crew.

L’objet central :

```txt
le blason + le coffre + le niveau du crew
```

---

## Header cible

```txt
LES FOULÉES 9³
Niveau 6 · Carbon League
War Ready

Coffre 66 %
7/10 actifs
Rank #8 Paris
```

---

## Bento grid

```txt
[Défense urgente]
[Offensive prête]
[Coffre crew 66 %]
[Recrutement 2 places]
[Prochain perk]
[Membres actifs]
```

---

## Perks

Ne plus afficher les perks en liste.

Afficher :

```txt
PERKS DÉBLOQUÉS
[ Crew Marker ] [ War Room ] [ Weekly Chest ] [ Badge Frame ]

PROCHAIN PERK
Scout Ping
Débloqué niveau 7
```

---

# 13. War Room

La War Room doit être opérationnelle, pas décorative.

Elle doit répondre à :

```txt
Que doit faire le crew ?
Qui est assigné ?
Combien de temps reste-t-il ?
Quelle récompense ?
Quel itinéraire ?
```

---

## Écran offensive

```txt
OFFENSIVE ACTIVE
République

62 %
498 / 800 hexes

Temps restant : 04:21
Participants : 6/10
Récompense : Crew Chest Gold

[Rejoindre] [Voir route]
```

---

## Sections

```txt
Défense urgente
Scout reports
Routes proposées
Membres disponibles
Historique
```

---

# 14. League

Le classement doit devenir une ligue, pas un tableau.

KPI héros :

```txt
#8
```

---

## Structure

```txt
SAISON 0 · SEMAINE 2/8
PARIS LEAGUE

#8 KORO
342 pts du #7
≈ 35 hexes neutres peuvent suffire
```

Podium :

```txt
#1
#2
#3
```

Récompenses :

```txt
Top 10
Badge Paris Race
Frame Tempo
Coffre saison
```

---

# 15. Arsenal

L’Arsenal doit devenir une boutique de jeu, pas une liste Stripe.

---

## Structure

```txt
ARSENAL
Éclats 320 · Foulées 2140

FEATURED
[Shield]
[Scout]
[Radar]

SKINS TERRITOIRE
[Carbon Grid]
[Ghost Hex]
[Founder Glow]
```

---

## Card objet

```txt
SHIELD
Rare

Protège un cluster 48 h
1 / semaine
90 Éclats

[Obtenir]
```

---

## Règle

```txt
Le territoire ne s’achète pas.
Le style et le confort, si.
```

---

# 16. GRYD Verify Hub

Ici, il ne faut pas trop gamifier.  
Il faut créer de la confiance.

---

## Structure

```txt
GRYD VERIFY HUB

Seules les courses vérifiées capturent.
Les autres enrichissent tes stats.

[GRYD Live GPS]
Trust élevé · Capture directe

[Apple Health]
Trust élevé · Import + vérif

[Strava]
Trust moyen · Vérification requise

[Garmin]
Bientôt
```

---

# 17. Amis

La page Amis actuelle met trop en avant le blocage.

Nouvelle logique :
- courir ensemble ;
- recruter ;
- soutenir ;
- rejoindre ;
- bloquer seulement en menu secondaire.

---

## FriendCard

```txt
@lena_run
Paris · Les Foulées 9³
Dispo défense · 3 runs cette semaine

[Inviter sortie] [Inviter crew] [...]
```

Menu secondaire :

```txt
Bloquer
Signaler
Masquer
```

---

# 18. Règles UI issues de Rondesignlab adaptées à GRYD

## 18.1 Un écran = une décision

Chaque écran doit avoir une action principale.

```txt
Home → Démarrer la route recommandée
Battle Map → Trouver un itinéraire
Route Planner → Démarrer cette route
Live Run → Continuer / terminer
Post-run → Partager la conquête
Crew HQ → Rejoindre l’objectif crew
War Room → Défendre / raider
League → Rattraper le rang suivant
```

---

## 18.2 Un accent fort

```txt
Chartreuse = action / ton crew / réussite
Orange = rival
Violet = contesté / rare
Gold = reward
Blue steel = verify
```

---

## 18.3 KPI géant

Chaque écran clé doit avoir un chiffre héros :

```txt
4,8 KM
+86 HEXES
66 %
#8
78
2147
```

---

## 18.4 Bento cards

Remplacer les longues listes par :

```txt
grosses cartes courtes
2 à 6 maximum
CTA clair
détail au tap
```

---

## 18.5 Glassmorphism limité

Utiliser le glass sur :
- landing ;
- onboarding ;
- post-run ;
- badge reveal ;
- reward cards.

Éviter le glass sur :
- Live Run ;
- Route Planner ;
- support ;
- données critiques ;
- écrans outdoor.

---

# 19. Nouvelle architecture GRYD

Structure recommandée :

```txt
1. Today
2. Battle Map
3. Route Planner
4. Live Run
5. Post-run Reward
6. War Room
7. Crew HQ
8. Crew Members
9. Crew Discovery
10. League
11. Player Card
12. Badges
13. Arsenal
14. GRYD Verify Hub
15. Amis
16. Support
```

---

# 20. Priorités de refonte

## Priorité 1 — Route Planner

Pourquoi :
sans itinéraire lisible, le runner ne sait pas où courir.

À créer :
- route claire ;
- rues visibles ;
- filtres ;
- options 3 / 5 / 10 km ;
- hexes en transparence ;
- gain estimé.

---

## Priorité 2 — Live Run

Pourquoi :
c’est le cœur sportif.

À créer :
- gros chiffres ;
- écran minimal ;
- route secondaire ;
- hex count ;
- GRYD Verified.

---

## Priorité 3 — Post-run Reward

Pourquoi :
c’est le moment rétention / partage.

À créer :
- animation ;
- +hexes ;
- rank up ;
- badge ;
- share.

---

## Priorité 4 — Home / Today

Pourquoi :
il faut une porte d’entrée simple.

À créer :
- route recommandée ;
- objectif du jour ;
- progression semaine ;
- CTA.

---

## Priorité 5 — Crew HQ

Pourquoi :
GRYD doit être communautaire.

À créer :
- blason ;
- coffre ;
- membres actifs ;
- objectifs ;
- war state.

---

# 21. Prompt Claude / Cursor mis à jour

```md
Tu es Lead Product Designer mobile, expert en app sport premium, game UI, navigation cartographique et design system 2026.

Refais l’UI/UX de GRYD en tenant compte des patterns Rondesignlab sans tomber dans la dribbblisation.

## Analyse à appliquer
Rondesignlab est excellent pour :
- écrans héros ;
- onboarding ;
- landing ;
- App Store ;
- KPI géants ;
- bento cards ;
- objet central / digital twin ;
- dark premium ;
- accent unique ;
- glassmorphism léger.

Mais il ne faut pas copier :
- data-viz décorative ;
- glass partout ;
- manque d’états réels ;
- écrans beaux mais peu utilisables ;
- absence de flows ;
- UI faite pour vignette Dribbble.

## Principe GRYD
GRYD doit être spectaculaire quand il récompense, mais ultra lisible quand il guide.

## À faire

### 1. Today
Créer un écran d’action quotidienne :
- route recommandée ;
- objectif du jour ;
- Score Forme ;
- coffre crew ;
- CTA Start.

### 2. Battle Map
Créer une vue territoire :
- hexes ;
- zones ;
- rival ;
- statut de zone ;
- mini War Feed ;
- bouton Trouver un itinéraire.

### 3. Route Planner
Créer une vraie vue runner :
- route dominante ;
- rues visibles ;
- hexes en transparence ;
- distance ;
- durée ;
- points ;
- options 3/5/10 km ;
- boucle / aller simple ;
- capture / défense / exploration.

Règle : en mode route, la route prime sur les hexes.

### 4. Live Run
Créer un écran façon app running premium :
- très gros chiffre distance ;
- hexes capturés ;
- temps ;
- allure ;
- GRYD Verified ;
- contrôles simples.

### 5. Post-run Reward
Créer un écran spectaculaire :
- Course validée ;
- +hexes ;
- zone modifiée ;
- crew rank ;
- badge unlock ;
- share card.

### 6. Crew HQ
Transformer la page crew en base de crew :
- blason central ;
- niveau ;
- ligue ;
- coffre ;
- membres actifs ;
- objectif ;
- bento cards.

### 7. War Room
Créer un écran opérationnel :
- offensives ;
- défense urgente ;
- scout reports ;
- routes ;
- membres disponibles ;
- rewards.

### 8. League
Transformer classement en ligue :
- podium ;
- toi ;
- écart au rang suivant ;
- récompenses ;
- rank up.

### 9. Arsenal
Créer une boutique d’objets :
- cards visuelles ;
- raretés ;
- skins ;
- shield ;
- scout ;
- radar ;
- pass ;
- club ;
- anti-pay-to-win.

### 10. Verify Hub
Créer un hub de confiance :
- sources ;
- trust level ;
- capture eligible ;
- stats only.

## Règles UI
- Un écran = une décision.
- Un chiffre important = très grand.
- Une liste longue = bento cards.
- Glass pour convaincre, contraste pour courir.
- Route Planner lisible dehors.
- Pas de SaaS dashboard.
- Pas de données décoratives non actionnables.
- Toujours montrer ce que l’utilisateur peut gagner ou faire maintenant.

## Motion
Ajouter :
- route draw ;
- capture wave ;
- badge unlock ;
- rank up ;
- chest opening ;
- reward reveal ;
- button pulse.
```

---

# 22. Conclusion

L’analyse Rondesignlab renforce une décision importante :

```txt
GRYD doit utiliser les codes premium de conviction pour séduire,
mais garder une UX très opérationnelle pour courir.
```

La bonne synthèse :

```txt
Rondesignlab pour les écrans héros.
Nike pour le live run.
Strava pour le route planner.
Supercell pour la progression crew.
GRYD pour le territoire.
```

Formule finale :

```txt
Spectaculaire pour donner envie.
Lisible pour courir.
Social pour revenir.
Gaming pour progresser.
```
