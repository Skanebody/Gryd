# GRYD — Refonte UI/UX 2026 : Route Planner, Battle Map, sport app premium et game UI

## Objectif du document

Ce document formalise la refonte UI/UX de GRYD à partir :

- de l’analyse de l’app actuelle ;
- des références jointes d’apps running / sport ;
- des meilleures directions UI mobile 2026 ;
- du besoin de rendre la carte plus lisible pour un coureur ;
- du besoin de rendre l’app moins SaaS et plus jeu mobile premium ;
- du besoin de concilier :
  - carte de territoire ;
  - itinéraire de course ;
  - crew ;
  - performance ;
  - récompenses ;
  - social ;
  - compétition.

Principe central :

```txt
Battle Map pour comprendre.
Route Planner pour courir.
Live Run pour ressentir.
Post-run Reward pour revenir.
Crew HQ pour appartenir.
League pour rivaliser.
```

---

# 1. Diagnostic général

L’app actuelle contient déjà les bons modules :

```txt
Carte
War Room
Crew
Classement
Profil
Amis
Arsenal
Sources connectées
Support
```

Le problème n’est pas le fond produit.

Le problème est l’exécution UI/UX.

Aujourd’hui, GRYD ressemble encore trop à :

```txt
dark SaaS
dashboard
admin panel
tableau de suivi
liste de paramètres
```

et pas assez à :

```txt
app running premium
jeu mobile de territoire
expérience communautaire
carte vivante
outil d’itinéraire
saison compétitive
```

Le produit a une mécanique forte, mais l’interface ne la fait pas encore ressentir.

---

# 2. Ce que les références jointes montrent

Les références envoyées montrent plusieurs directions intéressantes.

## 2.1 Références type Strava / route planner

Points forts :
- route très lisible ;
- carte utile ;
- tracé dominant ;
- filtres de route ;
- résumé distance / difficulté / altitude ;
- activité bien structurée ;
- progression claire.

À reprendre dans GRYD :
- vraie carte routable ;
- route épaisse ;
- rues visibles ;
- filtres d’itinéraire ;
- résumé avant départ ;
- logique “où courir maintenant ?”.

---

## 2.2 Référence Nike Run Club

Points forts :
- très gros chiffre ;
- écran live ultra focalisé ;
- très peu d’éléments ;
- énergie sportive immédiate ;
- couleur vive assumée ;
- bouton central évident.

À reprendre dans GRYD :
- distance ou hexes très grands pendant la course ;
- moins d’informations secondaires ;
- bouton d’action plus fort ;
- écran Course Live plus émotionnel ;
- moments de validation plus impactants.

---

## 2.3 Références sport premium avec photos

Points forts :
- humain ;
- motivation ;
- envie de courir ;
- photo lifestyle ;
- challenge cards ;
- onboarding plus émotionnel ;
- interface moins froide.

À reprendre dans GRYD :
- plus de photos / avatars / profils ;
- plus de crew identity ;
- plus de cards communautaires ;
- onboarding plus vivant ;
- challenge cards plus désirables.

---

## 2.4 Références glass / bento / premium

Points forts :
- cartes plus expressives ;
- profondeur ;
- glass léger ;
- gros indicateurs ;
- score circulaire ;
- interface plus moderne.

À reprendre dans GRYD :
- bento cards ;
- grosses cards d’action ;
- surfaces premium ;
- motion ;
- profondeur contrôlée ;
- pas de longues listes.

---

## 2.5 Référence chartreuse claire

Points forts :
- plus friendly ;
- plus lumineux ;
- plus accessible ;
- moins agressif ;
- très lisible.

À reprendre dans GRYD :
- ne pas rester full black partout ;
- utiliser la chartreuse comme surface positive dans certains moments ;
- créer des écrans Focus Solo plus lumineux ;
- rendre l’app moins froide.

---

# 3. Problème clé : la carte actuelle n’est pas assez lisible pour courir

La carte actuelle montre surtout :

```txt
hexes
territoire tenu
bouton GO
```

Mais un coureur qui veut un itinéraire a besoin de voir :

```txt
rues
chemins
parcs
ponts
sens du parcours
distance estimée
temps estimé
difficulté
zone à capturer
retour au point de départ
sécurité
```

Conclusion :

```txt
La carte de territoire et la carte d’itinéraire ne doivent pas être la même vue.
```

---

# 4. Solution : deux modes de carte

GRYD doit séparer clairement :

```txt
Battle Map
Route Map / Route Planner
```

---

## 4.1 Battle Map

Objectif :

```txt
Comprendre la guerre de territoire.
```

La Battle Map affiche :
- hexes ;
- territoires ;
- crews rivaux ;
- zones contestées ;
- decay ;
- locks ;
- boucliers ;
- objectifs crew ;
- routes stratégiques ;
- avant-postes ;
- statut de zone ;
- mini War Feed.

C’est la vue jeu.

---

## 4.2 Route Map / Route Planner

Objectif :

```txt
Savoir où courir.
```

La Route Map affiche en priorité :
- route à suivre ;
- rues ;
- chemins ;
- parcs ;
- distance ;
- temps estimé ;
- allure cible ;
- hexes capturables ;
- gain estimé ;
- sécurité ;
- retour au départ.

C’est la vue runner.

---

# 5. Règle visuelle majeure

En mode itinéraire :

```txt
La route prime sur les hexes.
```

Hiérarchie visuelle recommandée :

```txt
1. Tracé de course
2. Position du runner
3. Rues / chemins / parcs
4. Objectif de capture
5. Hexes capturables en transparence
6. Territoires crew / rival
```

La grille hexagonale doit devenir une **couche de récompense**, pas la couche principale.

---

# 6. Refonte de la Battle Map

## 6.1 Problème actuel

La map actuelle est trop abstraite :

```txt
grille noire
cluster vert
peu de contexte
pas de routes
pas de rival visible
pas de zone claire
pas d’objectif fort
```

Elle ressemble à une visualisation de données.

---

## 6.2 Battle Map cible

La Battle Map doit avoir 4 couches :

```txt
1. Basemap urbaine subtile
2. Hex grid
3. Ownership / statuts
4. HUD gameplay
```

---

## 6.3 Basemap urbaine subtile

Ajouter :
- rues fines ;
- parcs ;
- Seine / cours d’eau ;
- ponts ;
- quartiers ;
- labels très discrets ;
- axes de run.

Exemples :

```txt
Paris Est
République
Canal
Bastille
Buttes-Chaumont
```

Pas de carte Google classique.

Il faut une :

```txt
carte tactique stylisée
```

---

## 6.4 États des hexes

### Neutre

```txt
fond sombre
contour gris faible
```

### Ton crew

```txt
fond chartreuse sombre
contour chartreuse
léger glow
```

### Rival

```txt
fond orange / rouge très sombre
contour orange
```

### Contesté

```txt
double contour vert + orange
pulse léger
```

### Protégé

```txt
icône shield
membrane translucide
```

### Decay

```txt
contour pointillé
sablier discret
rouge muted si urgent
```

### Objectif crew

```txt
pin / marker
halo chartreuse
CTA contextualisé
```

---

## 6.5 HUD Battle Map

Haut :

```txt
SAISON 0 · J-12
Paris Est · Zone contestée
Crew rank #8
```

Centre :
- carte ;
- rival ;
- objectifs ;
- routes ;
- hexes.

Bas :

```txt
OBJECTIF CREW
Défendre 12 hexes
+340 pts possibles

[DEFEND]
```

Bouton central contextuel :

```txt
RUN
DEFEND
RAID
CAPTURE
SCOUT
```

---

## 6.6 Mini War Feed

Petit feed flottant :

```txt
Lucas a défendu 8 hexes
Canal Crew a repris 14 hexes
Night Pacers passe #8
```

Objectif :
- rendre la carte vivante ;
- montrer que des choses se passent ;
- déclencher une action.

---

# 7. Route Planner GRYD

Le Route Planner est indispensable.

GRYD ne doit pas seulement montrer :

```txt
voici le territoire
```

Il doit dire :

```txt
cours ici pour le prendre
```

---

## 7.1 Entrée dans Route Planner

Depuis la Battle Map :

```txt
Trouver un itinéraire
```

Depuis une mission :

```txt
Planifier la défense
```

Depuis War Room :

```txt
Créer route offensive
```

Depuis bouton central :

```txt
RUN
```

---

## 7.2 Écran Route Planner

Haut :

```txt
Itinéraire recommandé
4,8 km · 28 min · +86 hexes
Boucle · Retour départ
```

Carte :
- route épaisse chartreuse ;
- rues visibles ;
- flèches de direction ;
- départ / arrivée ;
- points de passage ;
- hexes capturables en transparence ;
- territoire secondaire.

Bas :

```txt
Objectif
Défendre République
12 hexes à sauver · 48 h restantes

[Modifier distance] [Démarrer]
```

---

## 7.3 Types d’itinéraires

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

## 7.4 Exemples de routes

### Capture rapide

```txt
Capture rapide
3,2 km
+48 hexes possibles
Difficulté : facile
Retour au point de départ
```

### Défense

```txt
Défense République
4,8 km
12 hexes expirent dans 48 h
+340 pts possibles
```

### Raid

```txt
Raid Canal
6,1 km
87 hexes rivaux traversés
Risque : élevé
```

### Exploration

```txt
Route pionnière
8,4 km
Nouvelle liaison possible
Badge Route Opened
```

---

## 7.5 Options indispensables

Le runner doit pouvoir choisir :

```txt
Distance cible : 3 km / 5 km / 10 km / libre
Type : boucle / aller simple
Priorité : capture / défense / performance / exploration
Sécurité : éviter grands axes
Dénivelé : faible / peu importe
Départ : position actuelle / autre point
```

---

## 7.6 Propositions de routes

GRYD doit proposer plusieurs options :

```txt
Route A — Rapide
3,4 km · +52 hexes

Route B — Optimisée
5,1 km · +94 hexes

Route C — Défense
4,8 km · 12 hexes sauvés
```

Chaque route doit afficher :
- distance ;
- durée ;
- points ;
- hexes ;
- type ;
- difficulté ;
- retour départ oui/non ;
- sécurité.

---

# 8. Home / Today

GRYD a besoin d’un vrai écran d’action quotidienne.

Objectif :

```txt
Dire au runner quoi faire maintenant.
```

---

## 8.1 Wireframe Today

```txt
BONJOUR KORO

Prêt pour une conquête ?
Paris Est est contesté.

[Route défense]
4,8 km · +86 hexes · 28 min

[Start Run]

Cette semaine
2 / 3 runs
Score Forme 78
Coffre crew 66 %
```

---

## 8.2 Rôle du Home

Le Home doit :
- rassurer le runner ;
- proposer une action ;
- montrer la progression ;
- connecter solo + crew + territoire ;
- éviter que l’utilisateur se perde dans la carte.

---

## 8.3 Cards Today

```txt
Route recommandée
Objectif personnel
Objectif crew
Score Forme
Coffre crew
Prochain badge
```

Mais il faut en afficher peu à la fois.

Règle :

```txt
1 objectif principal
2 indicateurs secondaires
1 CTA
```

---

# 9. Live Run

Le Live Run doit reprendre le meilleur des références Nike : très gros chiffres, peu d’éléments, intensité.

---

## 9.1 Écran live minimal

```txt
4,74 KM

+62 HEXES

5'09 / km
24:26
GRYD Verified
```

Contrôles :
- pause ;
- finish ;
- photo ;
- map ;
- musique optionnelle.

---

## 9.2 Modes live

```txt
Stats
Carte
Objectif
Music
```

La carte live ne doit pas être surchargée.

---

## 9.3 Carte live

Afficher :
- trace en cours ;
- route à suivre ;
- hexes qui s’allument ;
- prochaine direction ;
- distance restante ;
- objectif restant.

Ne pas afficher :
- tous les territoires ;
- trop de labels ;
- trop de feed.

---

## 9.4 Animation live

- route qui se dessine ;
- hexes qui s’allument ;
- compteur +hexes ;
- haptic léger ;
- alertes GPS douces.

---

# 10. Post-run Reward

Le post-run est le moment le plus important.

Il doit être plus proche d’un écran de récompense de jeu que d’un simple résumé sport.

---

## 10.1 Séquence

```txt
1. Course validée
2. +214 hexes
3. Zone modifiée
4. Crew rank
5. Badge unlock
6. Share card
```

---

## 10.2 Exemple

```txt
COURSE VALIDÉE
GRYD VERIFIED

+214 HEXES

PARIS EST +12 %
NIGHT PACERS #8 → #7

BADGE DEFENDER II

[Partager la conquête]
[Voir la carte]
```

---

## 10.3 Animations

- check Verified ;
- compteur hexes ;
- capture wave ;
- map before/after ;
- rank up ;
- badge reveal ;
- share card.

---

# 11. Crew HQ

Le Crew HQ doit devenir une base de crew, pas une page de gestion.

---

## 11.1 Header Crew HQ

```txt
LES FOULÉES 9³
Niv. 6 · Carbon League
War Ready

Coffre 66 %
7 / 10 actifs
Rank #8 Paris
```

Visuel :
- grand blason ;
- frame ;
- banner ;
- glow ;
- XP bar ;
- status pills.

---

## 11.2 Bento cards Crew HQ

```txt
Défense urgente
Recrutement
Coffre
Offensive
Prochain perk
Membres actifs
```

---

## 11.3 Onglets

```txt
Base
Membres
War Room
Coffre
Perks
Chat
```

---

# 12. Crew Discovery

La page actuelle est trop administrative.  
Elle doit devenir un écran de recrutement désirable.

---

## 12.1 Crew Card cible

```txt
[Blason]
CREW NORD-XI
Niv. 7 · Paris · Race League

War Active
Defense Active
Competitive

9 / 10 membres
84 runs / semaine
1 place restante

Recherche : Defender / Raider

[Demander à rejoindre]
[Voir la base]
```

---

## 12.2 À ajouter

- blason plus grand ;
- ligue visible ;
- tags colorés ;
- places restantes ;
- style crew ;
- recherche de rôles ;
- mini territoire ;
- CTA plus fort.

---

# 13. League

Le classement actuel est trop tableau.  
Il faut en faire une page de ligue.

---

## 13.1 Structure

```txt
SAISON 0 · SEMAINE 2/8
PARIS LEAGUE
```

Podium :

```txt
#1 Sprinteuse-88
#2 K.Runner
#3 Molokaï
```

Toi :

```txt
#8 KORO
342 pts du #7
≈ 35 hexes neutres peuvent suffire
```

Récompenses :

```txt
Top 10
Badge Paris Race
Frame Tempo
Coffre saison
```

---

## 13.2 Onglets

```txt
Joueurs
Crews
Ville
Région
France
Pionniers
Performance
```

---

## 13.3 Animations

- podium reveal ;
- sticky user row ;
- rank up ;
- médaille ;
- reward preview.

---

# 14. Profil / Player Card

Le profil doit devenir une carte joueur statutaire.

---

## 14.1 Header

```txt
[Photo hexagonale]
KORO
@koro
Tenace du 19e

Runner niv. 12 · Tempo
LES FOULÉES 9³
Rank saison #8 · Paris
```

---

## 14.2 Progression

```txt
PROGRESSION
Level 12 → 13
4 210 / 5 000 XP

Score Forme 78
Série x1,3 · 3 semaines
Contribution crew 12 %
```

---

## 14.3 Badges

```txt
BADGES RARES
[Hex Hunter III] [Founder] [Defender II] [Route Opened]
```

Les badges doivent être grands, pas minuscules.

---

# 15. Arsenal

L’Arsenal actuel ressemble à une liste de produits.  
Il doit devenir une vraie boutique d’objets de jeu.

---

## 15.1 Haut de page

```txt
ARSENAL
Saison 0 · Gear

Éclats : 320
Foulées : 2 140
Club : inactif
```

---

## 15.2 Sections

```txt
Featured
Pass Saison
Objets capés
Skins territoire
Skins trace
Crew gear
Packs
```

---

## 15.3 Card objet

```txt
[Shield icon]
Shield — Rare
Protège un cluster 48 h
Limite : 1 / semaine
90 Éclats

[Voir] [Obtenir]
```

---

## 15.4 Règle anti-pay-to-win

Toujours afficher :

```txt
Le territoire ne s’achète pas.
Le style et le confort, si.
```

Interdit :
- acheter des hexes ;
- acheter des km ;
- acheter une victoire ;
- acheter un classement.

Autorisé :
- skins ;
- frames ;
- templates share ;
- objets capés ;
- stats avancées ;
- confort d’organisation.

---

# 16. GRYD Verify Hub

La page Sources connectées doit devenir :

```txt
GRYD VERIFY HUB
```

---

## 16.1 Message

```txt
Connecte tes sources.
GRYD vérifie l’effort réel.
Seules les courses vérifiées capturent.
```

---

## 16.2 Source Card

```txt
Apple Health
Connecté
Trust : élevé
Rôle : courses, pas, cadence
Capture : après vérif
```

Sources :
- GRYD Live GPS ;
- Apple Health ;
- Health Connect ;
- Strava ;
- Garmin ;
- WHOOP ;
- Fitbit ;
- Polar ;
- Coros ;
- Suunto.

---

# 17. Amis

La page Amis actuelle donne trop d’importance au bouton “Bloquer”.

Il faut inverser la logique.

---

## 17.1 Friend Card

```txt
[Avatar]
@lena_run
Paris · LES FOULÉES 9³
Dispo défense · 3 runs cette semaine

[Inviter sortie] [Inviter crew] [...]
```

“Bloquer” doit être dans le menu secondaire.

---

## 17.2 Onglets

```txt
Amis
Demandes
Suggestions
QR
Recherche
```

---

# 18. Support

Le support peut rester sobre.

Objectif :
- confiance ;
- clarté ;
- transparence.

Sections :
- course non comptée ;
- segment exclu ;
- signaler triche ;
- zone dangereuse ;
- exporter données ;
- supprimer données.

Ne pas rendre cette page trop gaming.

---

# 19. UI 2026 — règles à appliquer

## 19.1 Grands chiffres

Les chiffres importants doivent être très grands :

```txt
4,74 KM
+214 HEXES
62 %
#8 → #7
```

---

## 19.2 Bento cards

Remplacer les longues listes par des cartes modulaires.

Exemple :

```txt
[ Coffre 66 % ] [ Rank #8 ]
[ 7/10 actifs ] [ Offensive prête ]
```

---

## 19.3 Surfaces premium

Utiliser :
- card sombre ;
- glass léger ;
- blur contrôlé ;
- ombre douce ;
- bordure subtile.

Mais ne jamais sacrifier la lisibilité.

---

## 19.4 Motion naturelle

Animations :
- route draw ;
- capture wave ;
- badge unlock ;
- rank up ;
- chest open ;
- map layer transition ;
- button pulse ;
- reward reveal.

---

## 19.5 Couleurs fonctionnelles

```txt
Chartreuse = action / ton crew / réussite
Orange = rival / attaque
Violet = contesté / rare
Gold = médaille / victoire
Blue steel = Verify / source connectée
Grey = neutre
Muted red = danger / decay urgent
```

---

## 19.6 Plus d’humain

Ajouter :
- photos de profil ;
- avatars ;
- crew portraits ;
- challenges illustrés ;
- cards avec membres ;
- share cards humaines.

---

# 20. Nouvelle architecture UX recommandée

```txt
Home / Today
Battle Map
Route Planner
Live Run
Post-run Reward
War Room
Crew HQ
League
Player Card
Badges
Arsenal
GRYD Verify Hub
Amis
Support
```

---

# 21. Priorité MVP UI V2

```txt
1. Home / Today plus motivant
2. Battle Map avec vrai statut de zone
3. Route Planner séparé
4. Live Run avec très gros chiffres
5. Post-run Reward animé
6. Crew HQ plus visuel
7. League avec podium
8. Player Card
9. Arsenal en cards objets
10. GRYD Verify Hub plus premium
```

---

# 22. V1

```txt
1. Route suggestions automatiques
2. Route alternatives A/B/C
3. Crew challenges visuels
4. Coffres animés
5. Badge unlock complet
6. Share cards intégrées
7. Friend suggestions
8. Crew discovery avec mini territoire
9. Filters avancés route
10. Mode discret
```

---

# 23. V2

```txt
1. Guidage vocal léger
2. Route live avancée
3. AR route preview
4. Replay de conquête
5. Saison recap animé
6. League cinematic
7. Dynamic territory skins
8. Events publics
9. Sponsor challenges
10. IA de recommandation route / action
```

---

# 24. Prompt Claude / Cursor

```md
Tu es Lead Product Designer mobile, spécialisé en app sport premium, game UI et navigation cartographique.

Analyse l’app GRYD actuelle et refais l’UI/UX pour 2026.

## Références à suivre
- Écrans running modernes avec grands chiffres live.
- Route planners type Strava / fitness apps : carte lisible, route dominante, filtres distance/difficulté.
- Nike Run Club : énergie sportive, très gros chiffre, CTA simple.
- Material 3 Expressive : composants plus expressifs, motion, couleurs fonctionnelles.
- Apple Liquid Glass : surfaces premium et profondeur, mais seulement si la lisibilité reste parfaite.
- Game UI mobile premium : badges, coffres, blasons, ligues, rewards.

## Problème actuel
GRYD ressemble trop à un SaaS dark.
Les pages sont trop plates, trop textuelles, trop en listes.
La carte n’est pas assez lisible pour planifier un itinéraire runner.
La map montre les hexes mais ne dit pas clairement où courir.

## Direction cible
Créer une app de running/territoire plus lisible, plus sportive, plus communautaire et plus gaming.

## À créer

### 1. Home / Today
Un écran d’action quotidienne :
- objectif du jour ;
- route recommandée ;
- progression semaine ;
- Score Forme ;
- coffre crew ;
- bouton Start.

### 2. Battle Map
Vue territoire :
- hexes ;
- rival ;
- zone contestée ;
- objectifs ;
- mini War Feed ;
- CTA Trouver un itinéraire.

### 3. Route Planner
Vue itinéraire :
- route dominante ;
- rues lisibles ;
- hexes en transparence ;
- distance ;
- durée ;
- hexes capturables ;
- points estimés ;
- options 3/5/10 km ;
- boucle / aller simple ;
- capture / défense / exploration.

### 4. Live Run
Écran très lisible :
- très gros chiffre distance ;
- temps ;
- allure ;
- hexes capturés ;
- GRYD Verified ;
- contrôles simples ;
- carte live secondaire.

### 5. Post-run Reward
Animation :
- Course validée ;
- +hexes ;
- zone modifiée ;
- crew rank ;
- badge unlock ;
- share card.

### 6. Crew HQ
Faire une base de crew :
- blason ;
- niveau ;
- coffre ;
- membres actifs ;
- rank ;
- war state ;
- objectif actuel.

### 7. League
Créer une ligue :
- podium ;
- utilisateur sticky ;
- écart au rang suivant ;
- récompenses ;
- rank up.

### 8. Player Card
Profil joueur :
- photo ;
- avatar frame ;
- @handle ;
- titre ;
- crew ;
- badges ;
- territoire ;
- partage.

### 9. Arsenal
Boutique objets :
- cards visuelles ;
- rareté ;
- skins ;
- shields ;
- radar ;
- scout ;
- pass ;
- club ;
- pas de pay-to-win.

### 10. GRYD Verify Hub
Sources connectées :
- trust level ;
- capture eligible ;
- stats only ;
- statut connecté.

## Règles UI
- En mode route, la route prime sur les hexes.
- En mode battle, le territoire prime sur les rues.
- Un écran = une action principale.
- Un chiffre important doit être grand.
- Une liste longue doit devenir des bento cards.
- Toujours montrer ce que le joueur peut gagner.
- Toujours montrer l’état du crew ou de la saison.
- Ajouter motion : route draw, capture wave, badge unlock, rank up, chest open.
```

---

# 25. Conclusion

Les références montrent clairement que GRYD doit évoluer vers :

```txt
moins dashboard
plus sport
plus route
plus humain
plus récompense
plus motion
plus jeu
```

Le point le plus critique :

```txt
GRYD doit arrêter de seulement montrer une carte de territoire.
GRYD doit proposer des itinéraires lisibles pour prendre ce territoire.
```

Formule finale :

```txt
Battle Map pour comprendre.
Route Planner pour courir.
Live Run pour ressentir.
Post-run Reward pour revenir.
Crew HQ pour appartenir.
League pour rivaliser.
```
