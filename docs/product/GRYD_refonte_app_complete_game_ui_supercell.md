# GRYD — Refonte complète de l’app vers un vrai jeu mobile premium

## Objectif

Ce document regroupe les modifications nécessaires pour transformer l’app GRYD actuelle, encore trop proche d’un **SaaS dark / dashboard**, en une vraie expérience de **jeu mobile premium de conquête territoriale par la course**.

Il couvre : diagnostic, nouvelle direction UI, refonte de navigation, refonte écran par écran, animations, composants à créer, logique Supercell adaptée, priorités MVP/V1/V2 et prompt Claude Code/Cursor.

Principe central :

```txt
Chaque page doit être une scène de jeu.
Chaque action doit générer un feedback.
Chaque progression doit se voir.
Chaque reward doit se ressentir.
Chaque crew doit avoir une identité.
```

---

# 1. Diagnostic général

L’app contient déjà les bons modules :

```txt
Carte
War Room
Crew
Classement
Profil
Amis
Crew Discovery
Arsenal
Sources connectées
Support
```

Elle contient aussi les bonnes mécaniques : Crew XP, Crew Level, perks, Crew Chest, badges, classement, sources connectées, recrutement, chat, support course et arsenal.

Le problème n’est donc pas le fond produit. Le problème est l’exécution UI actuelle.

Aujourd’hui, l’app ressemble trop à :

```txt
dark SaaS
dashboard Notion
admin panel
outil de gestion
liste de paramètres
```

Elle ne ressemble pas assez à :

```txt
jeu mobile premium
territoire à conquérir
crew war
saison compétitive
base de crew
carte vivante
récompenses
progression émotionnelle
```

Les écrans affichent surtout des listes, des cards longues, des textes, des barres de progression et des boutons simples. Il manque des blasons, coffres, rangs, ligues, avatars, missions, objectifs animés, récompenses, états de guerre, badges visibles, frames, objets et animations.

---

# 2. Ambition UI cible

GRYD ne doit pas être un logiciel qui suit des hexagones.

GRYD doit devenir :

```txt
un jeu mobile premium où ton crew prend la ville en courant.
```

L’app doit faire ressentir :

- une carte vivante ;
- une guerre de territoire ;
- un crew qui progresse ;
- des récompenses désirables ;
- des saisons ;
- des ligues ;
- des coffres ;
- des niveaux ;
- des badges ;
- une vraie identité sociale ;
- une tension compétitive saine.

Chaque écran doit répondre à au moins une de ces questions :

```txt
Qu’est-ce que je peux faire maintenant ?
Qu’est-ce que mon crew gagne ?
Qui nous attaque ?
Qu’est-ce que je peux débloquer ?
Où suis-je dans la saison ?
Qu’est-ce qui a changé sur la carte ?
```

Si un écran ne répond à aucune de ces questions, il doit être supprimé, fusionné ou transformé en scène de jeu.

---

# 3. Direction inspirée de Supercell, adaptée à GRYD

Supercell ne présente pas ses mécaniques comme des tableaux. Ils créent des boucles émotionnelles :

```txt
Mon clan progresse.
Je vois mon rôle.
Je contribue.
Le clan débloque un avantage.
On prépare une attaque.
On gagne un coffre.
Je reçois une récompense.
Je reviens.
```

Pour GRYD, la boucle devient :

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

À adapter :

```txt
clan → crew
guerre → offensive de territoire
base → Crew HQ
coffre → Crew Chest
ligue → League
badge clan → blason crew
rôles clan → rôles crew
Clan Capital → territoires / avant-postes / routes
raid weekend → offensive crew / city clash
```

À ne pas copier : fantasy, cartoon, villages, troupes, bâtiments, combats fictifs, logique militaire réaliste.

---

# 4. Nouvelle DA UI app

## Style cible

```txt
Premium mobile game UI
Dark tactical running universe
Crew-based territory conquest
Urban map
HUD tactique
Badges
Coffres
Blasons
Frames
Rewards
```

## À éviter

```txt
SaaS dark mode
Notion-like dashboard
admin panel
tables froides
listes interminables
minimalisme vide
cartes trop plates
texte trop long
```

## App vs marketing

```txt
Landing / réseaux = photos IA ultra réalistes + overlays
App = UI 2D premium game + HUD + carte + badges + objets
```

L’app ne doit pas devenir photoréaliste. Elle doit rester rapide, lisible, mobile-first et game UI.

---

# 5. Palette fonctionnelle

Aujourd’hui, l’app utilise surtout noir + chartreuse. C’est insuffisant pour un jeu de territoire.

Palette recommandée :

```txt
Chartreuse = ton crew / action / validation
Orange = rival / attaque / menace
Violet = contesté / rareté / événement
Gold = victoire / médaille / récompense majeure
Blue steel = Verify / info / source fiable
Grey = neutre / non contrôlé
Muted red = danger / decay urgent / rejet
Carbon = cartes / profondeur / premium
```

Règle : ne pas tout colorer. La couleur doit servir à comprendre l’état de jeu.

---

# 6. Navigation principale

La navigation actuelle est bonne dans son principe, mais trop plate dans son rendu.

Navigation recommandée :

```txt
Carte
War Room
Crew
League
Profil
```

Bouton central contextuel :

```txt
RUN
DEFEND
RAID
CAPTURE
SCOUT
```

## Rôle des onglets

### Carte

Devient **Battle Map** : territoire, rival, objectifs, routes, statuts.

### War Room

Actions, offensives, défense, missions, scout reports.

### Crew

Devient **Crew HQ** : base du crew, blason, coffre, membres, chat, perks.

### League

Remplace “Classement” pour donner un aspect plus gaming.

### Profil

Devient **Player Card** : statut joueur, badges, niveau, progression, identité.

---

# 7. Refonte Carte — Battle Map

## Problème actuel

La carte actuelle montre :

```txt
une grille hexagonale
un cluster vert
un bouton GO
```

Mais on ne ressent pas :

```txt
une zone à défendre
un territoire rival
une menace
une saison
une guerre de crews
une ville vivante
```

Elle fait donc trop SaaS / data viz.

## Nouvelle Battle Map

La carte doit avoir 4 couches :

```txt
1. Basemap urbaine subtile
2. Hex grid
3. Ownership / statut
4. HUD gameplay
```

## Basemap urbaine subtile

Ajouter :

- rues fines ;
- parcs ;
- Seine / cours d’eau ;
- axes principaux ;
- quartiers ;
- noms de secteurs très discrets.

Exemples :

```txt
Paris Est
République
Canal
Bastille
Buttes-Chaumont
```

Ce ne doit pas être une carte Google classique. Il faut une carte tactique stylisée.

## États des hexes

### Neutre

```txt
fond noir
contour gris faible
```

### Ton crew

```txt
fond chartreuse sombre
contour chartreuse vif
glow léger
texture diagonale subtile
```

### Rival

```txt
fond rouge/orange très sombre
contour orange discret
```

### Contesté

```txt
double contour vert + orange
pulse léger
icône conflit
```

### Protégé

```txt
icône shield
membrane translucide
halo défensif
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

### Avant-poste

```txt
marker hexagonal
badge outpost
petite aura
```

### Route ouverte

```txt
ligne GPS chartreuse
points de liaison
label discret
```

## HUD de carte

Le haut de l’écran doit afficher :

```txt
SAISON 0 · J-12
Paris Est · Zone contestée
Crew rank #8
```

Le centre doit afficher :

- hexes ;
- rival ;
- route ;
- objectif ;
- decay ;
- pin.

Le bas, au-dessus du bouton central :

```txt
OBJECTIF CREW
Défendre 12 hexes
+340 pts possibles
```

Bouton :

```txt
DEFEND
```

ou selon contexte :

```txt
RUN
RAID
CAPTURE
SCOUT
```

## Mini War Feed sur la carte

Ajouter un feed flottant :

```txt
Lucas a défendu 8 hexes
Canal Crew a repris 14 hexes
Night Pacers passe #8
```

But : rendre la carte vivante et déclencher une action.

## Layers activables

Mode par défaut simple :

```txt
ton territoire
rival proche
objectif
bouton action
```

Layers activables :

```txt
Decay
Routes
Crew
Rivals
Missions
Performance
```

---

# 8. Bouton central contextuel

Le bouton “GO” est trop générique.

## Nouveaux états

```txt
RUN = run libre
DEFEND = zone menacée
RAID = offensive active
CAPTURE = zone neutre proche
SCOUT = mission exploration
```

## Animation

- pulse léger ;
- halo chartreuse ;
- appui long pour démarrer ;
- transition vers Course Live ;
- haptic au lancement.

---

# 9. Course Live

## Objectif

Faire ressentir que la carte change pendant l’effort.

## UI Live

Afficher :

```txt
Distance
Temps
Allure
Hexes capturés
Points estimés
GPS Trust
Motion Trust
Objectif crew
Trace qui se dessine
Hexes qui s’allument
```

## États live

```txt
GPS OK
GPS faible
Verify actif
Zone privée
Zone non capturable
Segment exclu
Run groupé détecté
Mode contesté
```

## Animation live

- trace GPS qui se dessine ;
- hex qui pulse au passage ;
- compteur hexes qui monte ;
- petit ping haptique quand zone capturée ;
- alerte douce si GPS faible.

---

# 10. Résultat de course

C’est le moment dopamine principal de GRYD. Il doit être spectaculaire.

## Séquence

```txt
1. Course validée
2. +214 hexes
3. Zone modifiée
4. Contribution crew
5. Badge unlock
6. Progression niveau
7. Share card
```

## Exemple

```txt
COURSE VALIDÉE
GRYD VERIFIED

+214 HEXES

Paris Est passe à 62 %
Night Pacers gagne 1 rang

+7 % bonus performance
Badge Route Opened débloqué

[Partager la conquête]
[Voir la carte]
```

## Animation

- check Verified ;
- compteur hexes ;
- vague de capture ;
- map before/after ;
- rang crew qui monte ;
- badge reveal ;
- haptic par étape.

---

# 11. Crew HQ

## Problème actuel

La page Crew actuelle ressemble à une page d’administration : niveau, activity score, perks listés, membres, feed, chat.

La donnée est bonne, mais la mise en scène est trop plate.

## Nouveau Crew HQ

L’écran doit devenir la **base du crew**.

Header :

```txt
[Grand blason animé]

LES FOULÉES 9³
Paris · Carbon League · War Ready
Niveau 6

Rank local : #8
Membres actifs : 7 / 10
Coffre hebdo : 66 %
Offensive : prête
```

Visuel :

- grand blason hexagonal ;
- frame de ligue ;
- bannière crew ;
- jauge XP ;
- badge War Ready ;
- glow chartreuse.

## Onglets Crew HQ

Ne pas tout afficher en scroll vertical.

```txt
Base
Membres
War Room
Coffre
Perks
Chat
```

## Section Base

Afficher 4 cartes courtes :

```txt
Coffre crew — 66 %
Membres actifs — 7 / 10
Rank Paris — #8
Objectif — Défendre 120 hexes
```

CTA :

```txt
Voir War Room
Inviter un membre
Ouvrir coffre
```

## Perks Crew

Ne plus présenter les perks comme une liste longue.

Afficher :

```txt
PERKS DÉBLOQUÉS
[ Crew Marker ] [ Badge Frame ] [ War Room ] [ Weekly Chest ]

PROCHAIN PERK
Scout Ping — Niveau 7
18 000 XP restants
```

Chaque perk doit être une **carte reward** avec icône, rareté, niveau, statut débloqué/verrouillé et animation si débloqué.

---

# 12. Membres du crew

## Problème actuel

Les membres sont trop abstraits : pseudo, rôle, score.

## MemberCard

Chaque membre affiche :

```txt
Avatar / photo
Pseudo
Rôle
Disponibilité
Contribution semaine
Badge rare
Dernière action
```

Exemple :

```txt
MOLOKAÏ
Raider · Dispo guerre
176 pts cette semaine
Dernière action : 14 hexes repris
```

Actions au tap :

```txt
Assigner mission
Inviter sortie
Promouvoir
Voir profil
```

## Rôles visuels

```txt
Runner
Scout
Defender
Raider
Captain
Co-Captain
Leader
```

Chaque rôle doit avoir icône, couleur secondaire, permission et badge.

---

# 13. Crew Feed / War Log

## Problème actuel

Le feed est fonctionnel, mais plat.

Il doit devenir :

```txt
War Log
```

## Types d’événements

```txt
Reprise
Défense
Badge
Rank up
Coffre
Offensive
Recrutement
Niveau crew
Route ouverte
Avant-poste
```

## Exemple WarEventCard

```txt
[Icone attaque]
MOLOKAÏ a repris 14 hexes
Buttes-Chaumont
+176 pts · il y a 8 min

[Respect] [Raid] [Partager]
```

## Animations

- nouvel event slide-in ;
- icône pulse ;
- chiffres qui montent ;
- réaction haptic léger ;
- badge LIVE si récent.

---

# 14. Chat Crew

## Problème actuel

Le chat ressemble à une zone de logs. Il doit devenir un outil de coordination.

## Messages actionnables

Le chat doit permettre :

```txt
message texte
mission défense
proposition de sortie
ping zone
appel renfort
résultat course
badge débloqué
```

## Exemples

```txt
LENA_RUN
Sortie défense Canal demain 7h, qui est chaud ?

[Je participe] [Peut-être] [Indispo]
```

```txt
KORO
Je prends l’aile Est. Ramenez du monde, on tient la zone.

[Assigner zone] [Ouvrir carte]
```

---

# 15. War Room

La War Room est l’écran le plus “jeu”. Elle centralise offensives, défense, decay, missions, scout reports, objectifs crew et rewards.

## Structure

```txt
À faire
Offensives
Défense
Routes
Scout Reports
Coffre
Historique
```

## Carte offensive

```txt
OFFENSIVE CREW
République

Objectif : +800 hexes
Progression : 62 %
Temps restant : 04:21:08
Participants : 6 / 10
Récompense : Crew Chest Gold

[Rejoindre]
[Voir carte]
```

## Défense urgente

```txt
DÉFENSE URGENTE
34 hexes expirent dans 48 h
Zone : Canal

[Défendre]
[Assigner membre]
```

---

# 16. Crew Discovery

## Problème actuel

La page est trop administrative.

## Nouvelle CrewDiscoveryCard

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

Visuel : blason plus grand, bandeau de ligue, tags colorés, places restantes visibles, bouton principal fort, mini territoire si possible.

---

# 17. Classement → League

## Problème actuel

Le classement est trop vide, trop tableau.

## Nouvelle page League

Haut :

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

Section joueur :

```txt
TOI
#8 KORO
342 pts du #7
≈ 35 hexes neutres peuvent suffire
```

Récompenses :

```txt
Récompense Top 10
Badge Paris Race
Frame Tempo
+ coffre saison
```

## Onglets

```txt
Joueurs
Crews
Ville
Région
France
Pionniers
Performance
```

## Animations

- ligne utilisateur sticky ;
- rank up ;
- podium reveal ;
- médaille ;
- reward top 10.

---

# 18. Profil → Player Card

## Problème actuel

Le profil est encore trop “fiche compte”.

## Header Player Card

```txt
[Photo hexagonale]
KORO
@koro
Tenace du 19e

Runner niv. 12 · Tempo
LES FOULÉES 9³
Rank saison #8 · Paris
```

Ajouter :

- photo de profil réelle ou avatar ;
- frame rareté ;
- badge crew ;
- titre affiché ;
- bouton partager.

## Progression

```txt
PROGRESSION
Level 12 → 13
4 210 / 5 000 XP

Score Forme 78
Série x1,3 · 3 semaines
Contribution crew 12 %
```

## Badges

Les badges doivent être grands et désirables.

```txt
BADGES RARES
[Hex Hunter III] [Founder] [Defender II] [Route Opened]
```

Raretés : Road, Tempo, Race, Carbon, Elite, Legend.

---

# 19. Amis

## Problème actuel

La page Amis ressemble à une liste de comptes à bloquer. Le bouton “Bloquer” est trop visible.

## Nouvelle page Amis

Onglets :

```txt
Amis
Demandes
Suggestions
QR
Recherche
```

## FriendCard

```txt
[Avatar]
@lena_run
Paris · LES FOULÉES 9³
Dispo défense · 3 runs cette semaine

[Inviter sortie] [Inviter crew] [...]
```

Mettre “Bloquer” dans un menu secondaire.

---

# 20. Arsenal

## Problème actuel

L’Arsenal ressemble à une liste d’abonnements et produits Stripe.

## Nouveau haut de page

```txt
ARSENAL
Saison 0 · Gear

Éclats : 320
Foulées : 2 140
Club : inactif
```

## Sections

```txt
Featured
Pass Saison
Objets capés
Skins territoire
Skins trace
Crew gear
Packs
```

## ArsenalItemCard

Chaque objet :

```txt
Icône
Nom
Rareté
Usage
Limite
Preview
Prix
Statut
```

Exemple :

```txt
[Shield icon]
Shield — Rare
Protège un cluster 48 h
Limite : 1 / semaine
90 Éclats

[Voir] [Obtenir]
```

## Anti-pay-to-win

Toujours afficher :

```txt
Le territoire ne s’achète pas.
Le style et le confort, si.
```

Interdit : acheter hexes, kilomètres, victoire, classement.

Autorisé : skins, frames, templates share, objets capés, stats avancées, confort d’organisation.

---

# 21. Sources connectées → GRYD Verify Hub

## Problème actuel

La page est trop settings.

## Nouveau nom

```txt
GRYD VERIFY HUB
```

## Message

```txt
Connecte tes sources.
GRYD vérifie l’effort réel.
Seules les courses vérifiées capturent.
```

## SourceCard

Chaque source affiche :

```txt
Nom
Statut
Trust level
Rôle
Capture eligible / Stats only
Bouton
```

Exemple :

```txt
Apple Health
Connecté
Trust : élevé
Rôle : courses, pas, cadence
Capture : après vérif
```

Sources : GRYD Live GPS, Apple Health, Health Connect, Strava, Garmin, WHOOP, Fitbit, Polar, Coros, Suunto.

---

# 22. Support

Le support doit rester sobre pour créer confiance, mais son habillage doit rester cohérent.

Sections :

```txt
Course non comptée
Segment exclu
Signaler triche
Zone dangereuse
Exporter mes données
Supprimer mes données
```

Style : cards courtes, icônes propres, pas trop gaming, ton calme, explications transparentes.

---

# 23. Badges

## Problème

Les badges actuels sont trop petits et peu désirables.

## Nouvelle page Badges

Haut :

```txt
BADGES
54 / 188 débloqués
Rareté max : Carbon
```

Filtres :

```txt
Tous
Territoire
Défense
Attaque
Crew
Performance
Exploration
Saison
Secrets
```

Proches du déblocage :

```txt
Hex Hunter III — 720 / 1000
Defender II — 82 / 100
Consistency III — 6 / 8 semaines
```

## BadgeCard

Chaque badge :

```txt
Icône
Nom
Famille
Niveau
Rareté
Progression
Condition
Récompense
```

Exemple :

```txt
HEX HUNTER III
Territoire · Race
720 / 1 000 hexes
Récompense : titre “Hex Hunter”
```

---

# 24. Animations obligatoires

## Carte

- hex pulse ;
- vague de capture ;
- frontière qui bouge ;
- zone rival qui pulse ;
- route GPS qui se dessine ;
- objectif qui ping ;
- decay alert ;
- shield deploy.

## Bouton RUN

- pulse léger ;
- appui long ;
- transition vers live ;
- label contextuel ;
- haptic.

## Résultat de course

```txt
Course validée
+214 hexes
Zone modifiée
Crew contribution
Badge unlock
Share card
```

## Badge unlock

- full-screen reveal ;
- badge au centre ;
- glow selon rareté ;
- ancien niveau → nouveau niveau ;
- haptic ;
- CTA partager.

## Crew level up

```txt
LES FOULÉES 9³
Niveau 6 → 7
Scout Ping débloqué
```

Animation : blason évolue, frame se transforme, perk card révélée.

## Coffre crew

- jauge atteint 100 % ;
- coffre apparaît ;
- ouverture ;
- rewards en cartes ;
- contribution des membres ;
- share card.

## Achat Arsenal

- item reveal ;
- ajout inventaire ;
- compteur Éclats descend ;
- objet glisse vers Arsenal.

## Rank up

```txt
#8 → #7
Paris League
```

Animation : ligne du classement monte, glow, médaille si seuil franchi.

---

# 25. Haptics et sound design

## Haptics

Léger : bouton, capture simple, check, réaction.  
Moyen : badge Race / Carbon, rank up, achat, zone contrôlée.  
Fort court : Legend unlock, victoire crew, #1 classement, fin de saison.

Toujours prévoir option désactivation.

## Sons

Sons courts, premium, non agressifs :

```txt
soft click
pulse
capture ping
reward rise
badge reveal
rank up
purchase confirm
shield deploy
```

Pas de son arcade cheap. Pas de fanfare excessive.

## Reduce motion

Si `reduce motion` est activé : fade à la place des animations longues, particules désactivées, haptics réduits, pas de shake, lisibilité conservée.

---

# 26. Design system à créer

Composants principaux :

```txt
CrewCrest
PlayerAvatarFrame
BadgeCard
RewardCard
ChestCard
LeagueMedal
PerkCard
WarEventCard
MemberCard
ArsenalItemCard
ContextualRunButton
BattleMapHUD
WarRoomObjectiveCard
CrewFeedCard
SourceTrustCard
FriendCard
CrewDiscoveryCard
RankUpCard
ShareCard
```

États visuels :

```txt
Unlocked
Locked
In progress
Claimable
Active
Expired
Contested
Protected
Decay
Verified
Stats only
Rejected
```

---

# 27. Copywriting UI

Réduire les phrases longues.

Au lieu de :

```txt
Coffre hebdomadaire crew à récompenses cosmétiques et Foulées capées.
```

Mettre :

```txt
WEEKLY CHEST
66 %
Prochain palier : Gold
```

Description détaillée au tap.

Utiliser un vocabulaire de jeu :

```txt
War Ready
Raid
Defend
Capture
Rank Up
Chest
Perk
League
Outpost
Route Opened
Zone Held
Crew XP
```

En français possible :

```txt
Prêt guerre
Offensive
Défense
Capture
Rang gagné
Coffre
Avantage
Ligue
Avant-poste
Route ouverte
Zone tenue
XP crew
```

---

# 28. Erreur technique à corriger immédiatement

Toutes les captures montrent :

```txt
Cannot read properties of undefined
```

À corriger en priorité.

Même en MVP, cette erreur casse la confiance et donne une impression amateur.

Actions :

- trouver le composant qui lit une propriété undefined ;
- ajouter guards ;
- ajouter fallback data ;
- logger proprement ;
- masquer les erreurs runtime en prod.

---

# 29. Priorités de refonte

## Priorité 1 — Battle Map

Passer de grille SaaS à carte vivante : rival, zones, objectifs, HUD, routes, statuts, actions contextuelles, animation capture.

## Priorité 2 — Crew HQ

Passer de page liste à base de crew : grand blason, niveau, coffre, objectifs, membres actifs, war state, onglets.

## Priorité 3 — Résultat de course

Créer le moment dopamine principal : animations, compteur, badges, crew impact, share.

## Priorité 4 — Arsenal

Créer une vraie boutique de jeu : objets visuels, raretés, previews, animation achat.

## Priorité 5 — Profil

Créer une vraie player card : photo, frame, titre, badges, statut.

## Priorité 6 — League

Transformer le classement en ligue : podium, rewards, progression, rank up.

---

# 30. Nouvelle structure MVP gaming

Écrans à garder / créer :

```txt
1. Carte — Battle Map
2. Course Live
3. Résultat de course
4. War Room
5. Crew HQ
6. Crew Members
7. Crew Chat
8. Crew Discovery
9. League
10. Profil / Player Card
11. Badges
12. Arsenal
13. GRYD Verify Hub
14. Support
15. Amis
16. Sources connectées
```

Chaque page doit être refaite en scène de jeu.

---

# 31. Roadmap MVP / V1 / V2

## MVP immédiat

```txt
1. Corriger erreur undefined
2. Refonte Battle Map visuelle
3. Bouton RUN contextuel
4. Crew HQ avec blason + coffre
5. Résultat de course animé
6. Badges plus visibles
7. Arsenal avec objets visuels
8. League avec podium
9. Profil avec avatar/frame
10. War Feed plus vivant
```

## V1

```txt
1. Animations avancées
2. Coffre crew animé
3. Crew level up
4. Badge level up
5. Routes / avant-postes
6. Rivalité automatique
7. Share cards intégrées
8. War Room offensive complète
9. Crew Discovery premium
10. GRYD Verify Hub enrichi
```

## V2

```txt
1. Vidéos de fin de saison
2. Recap crew animé
3. Legend cinematic
4. League seasons avancées
5. Events sponsorisés
6. Tournois inter-crews
7. Arsenal visuel complet
8. IA de recommandation action
9. Personnalisation crew avancée
10. Skins dynamiques de territoire
```

---

# 32. Prompt complet Claude Code / Cursor

```md
Tu es Lead Product Designer, Game UI Designer et Motion Designer.

Refais entièrement l’application GRYD pour qu’elle ressemble à un vrai jeu mobile premium de conquête territoriale par la course, inspiré des principes de Clash of Clans / Supercell, mais adapté à un univers running, carte, crews et territoire.

## Problème actuel
L’app actuelle ressemble trop à un SaaS dark / dashboard.
Les pages sont trop plates, trop textuelles, trop listées.
Il manque des assets de jeu, des animations, des rewards, des blasons, des coffres, des états de guerre et des moments émotionnels.

## Direction cible
Premium mobile game UI.
Dark tactical running universe.
Crew-based territory conquest.
Saison, ligues, coffres, blasons, niveaux, récompenses, War Room.
Pas cartoon enfantin.
Pas militaire réaliste.
Pas SaaS.

## À refaire

### Carte
Créer une Battle Map :
- hexes ton crew / rival / neutre / contesté / protégé / decay ;
- mini HUD saison ;
- zone status ;
- objectifs crew ;
- routes ;
- avant-postes ;
- bouton contextuel RUN / DEFEND / RAID ;
- animations hex takeover.

### Course Live
Créer une expérience de capture en temps réel :
- trace GPS qui se dessine ;
- hexes qui s’allument ;
- compteur live ;
- GPS Trust ;
- Motion Trust ;
- objectifs crew ;
- segment exclu si nécessaire.

### Résultat de course
Créer un moment reward complet :
- Course validée ;
- +hexes ;
- zone modifiée ;
- crew impact ;
- bonus performance ;
- badge unlock ;
- progression niveau ;
- share card.

### Crew HQ
Remplacer la page liste par une base de crew :
- grand blason ;
- niveau crew ;
- XP ;
- league ;
- rank local ;
- coffre hebdo ;
- membres actifs ;
- war state ;
- onglets Base / Membres / War Room / Coffre / Perks / Chat.

### Membres
Créer des cartes membres avec :
- avatar ;
- rôle ;
- disponibilité ;
- contribution ;
- dernière action ;
- actions assigner / inviter / promouvoir.

### Crew Feed / Chat
Transformer le feed en War Log :
- reprises ;
- défenses ;
- rank up ;
- badges ;
- coffre ;
- messages actionnables ;
- réactions GRYD custom.

### War Room
Créer l’écran le plus stratégique :
- offensives ;
- défense urgente ;
- scout reports ;
- routes ;
- objectifs crew ;
- coffre ;
- historiques.

### League
Créer une page League :
- podium ;
- ligue ;
- récompenses ;
- progression vers le rang suivant ;
- sticky row utilisateur ;
- animations rank up.

### Profil
Créer une Player Card :
- avatar hexagonal ;
- frame de niveau ;
- titre ;
- crew ;
- score forme ;
- XP ;
- badges rares ;
- territoire ;
- share profile.

### Amis
Créer des FriendCards :
- avatar ;
- handle ;
- crew ;
- activité ;
- inviter sortie ;
- inviter crew ;
- bouton bloquer en menu secondaire.

### Arsenal
Créer une vraie boutique de jeu :
- objets visuels ;
- raretés ;
- skins ;
- shield ;
- scout ;
- radar ;
- streak gel ;
- pass ;
- club ;
- animation achat ;
- pas de pay-to-win.

### Sources
Renommer visuellement GRYD Verify Hub :
- statut connecté ;
- trust level ;
- rôle de chaque source ;
- capture eligible / stats only.

### Support
Garder sobre mais cohérent.

## Animations obligatoires
- hex capture wave ;
- badge unlock ;
- badge level up ;
- crew level up ;
- chest opening ;
- rank up ;
- purchase reveal ;
- object activation ;
- war declaration ;
- route opened ;
- defense success.

## Design system
Créer :
- CrewCrest
- PlayerAvatarFrame
- BadgeCard
- RewardCard
- ChestCard
- LeagueMedal
- PerkCard
- WarEventCard
- MemberCard
- ArsenalItemCard
- ContextualRunButton
- BattleMapHUD
- WarRoomObjectiveCard
- CrewFeedCard
- SourceTrustCard
- FriendCard
- CrewDiscoveryCard
- RankUpCard
- ShareCard

## Couleurs
Chartreuse = action / ton crew
Orange = rival / attaque
Violet = contesté / rare
Gold = victoire / médaille
Blue steel = verify / info
Grey = neutre
Muted red = danger / decay

## Règles UX
Chaque écran doit répondre à :
- Qu’est-ce que je peux faire maintenant ?
- Qu’est-ce que mon crew gagne ?
- Qu’est-ce que je peux débloquer ?
- Qui nous attaque ?
- Où suis-je dans la saison ?

Si un écran ne répond pas à une de ces questions, il doit être simplifié ou supprimé.

## Contraintes
- pas de SaaS look ;
- pas de listes interminables ;
- pas de texte trop long ;
- pas de pay-to-win ;
- pas de position live publique ;
- respect privacy ;
- reduce motion ;
- haptics optionnels ;
- app mobile-first ;
- premium, lisible, rapide.
```

---

# 33. Conclusion

L’app actuelle a les bons modules, mais pas encore la bonne mise en scène.

Elle doit passer de :

```txt
un tableau de bord sombre
```

à :

```txt
une base de crew, une carte de bataille et une boucle de récompense.
```

La refonte doit viser :

```txt
plus de blasons
plus de coffres
plus de badges
plus d’objectifs
plus de rivalité lisible
plus de statuts de territoire
plus d’animations
plus de rewards
moins de listes
moins de texte
moins de SaaS
```

Phrase finale :

```txt
GRYD doit faire ressentir que chaque run déplace une frontière, que chaque crew construit une base, et que chaque saison laisse un statut.
```
