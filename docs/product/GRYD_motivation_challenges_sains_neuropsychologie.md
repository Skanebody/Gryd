# GRYD — Système de motivation, challenges solo/crew et compétition saine

## Objectif du document

Ce document transforme les principes neuropsychologiques et comportementaux partagés en architecture produit concrète pour GRYD.

Il définit :
- la motivation solo ;
- la motivation communautaire ;
- les challenges de groupe ;
- la coopétition entre crews ;
- les garde-fous contre la pression sociale ;
- les wireframes fonctionnels ;
- les règles de notification ;
- les opportunités de monétisation saine ;
- les priorités MVP / V1 / V2 ;
- les prompts à donner à Claude Code / Cursor.

Principe central :

```txt
Solo pour progresser.
Crew pour appartenir.
Saison pour rivaliser.
Territoire pour rendre chaque effort visible.
```

---

# 1. Synthèse stratégique

Les informations fournies sont utiles parce qu’elles confirment un point produit central :

```txt
Tous les runners ne sont pas motivés par la même chose.
```

Certains utilisateurs sont motivés par :
- la progression personnelle ;
- le sentiment de compétence ;
- les records ;
- les objectifs ;
- l’auto-amélioration.

D’autres sont motivés par :
- le groupe ;
- la reconnaissance ;
- le crew ;
- le classement ;
- la rivalité ;
- la contribution collective.

GRYD doit donc proposer deux moteurs principaux :

```txt
1. Focus Solo
2. Crew / Communauté / Challenge
```

Et un troisième moteur transversal :

```txt
3. Territoire
```

La différence de GRYD par rapport aux apps fitness classiques :

```txt
Strava garde tes runs.
Garmin mesure ton corps.
WHOOP lit ton état.
GRYD transforme ton effort en territoire.
```

---

# 2. Les 3 profils motivationnels GRYD

GRYD doit segmenter les utilisateurs en trois profils, sans les enfermer.

## 2.1 Mastery Player

Profil :
- cherche à progresser ;
- veut voir ses statistiques ;
- aime les objectifs personnels ;
- peut ne pas aimer les classements publics ;
- veut courir à son rythme.

Motivations :
- compétence ;
- contrôle ;
- progression ;
- habitudes ;
- records personnels.

Features prioritaires :
- Focus Solo ;
- Score Forme ;
- objectifs hebdomadaires ;
- badges progressifs ;
- records personnels ;
- courses privées ;
- progression par rapport à soi-même.

Phrase UX :

```txt
Tu progresses. La carte le ressent.
```

---

## 2.2 Social Player

Profil :
- veut appartenir à un crew ;
- aime encourager et être reconnu ;
- veut courir avec d’autres ;
- veut contribuer à un objectif collectif ;
- n’est pas forcément ultra compétitif.

Motivations :
- appartenance ;
- reconnaissance ;
- soutien ;
- responsabilité partagée ;
- contribution collective.

Features prioritaires :
- crew feed ;
- chat crew ;
- sorties collectives ;
- coffre crew ;
- badges crew ;
- recrutement ;
- share cards ;
- réactions sociales.

Phrase UX :

```txt
Tu ne cours pas seulement pour toi. Tu fais avancer ton crew.
```

---

## 2.3 Competitive Player

Profil :
- aime les classements ;
- aime la rivalité ;
- veut gagner ;
- veut attaquer et défendre ;
- accepte une exposition sociale plus forte.

Motivations :
- statut ;
- comparaison ;
- victoire ;
- domination ;
- ranking ;
- rareté.

Features prioritaires :
- War Room ;
- offensives ;
- classements ;
- rivalités ;
- badges saison ;
- rank up ;
- medals ;
- share cards de victoire.

Phrase UX :

```txt
La saison commence. Prends ta zone.
```

---

# 3. Onboarding motivationnel

Dès l’onboarding, GRYD doit identifier le style du joueur.

## Écran : Ton style GRYD

Question :

```txt
Comment veux-tu jouer ?
```

Choix :

### Focus Solo

```txt
Je veux progresser sans pression.
```

Effets :
- moins de notifications compétitives ;
- leaderboard global masqué par défaut ;
- challenges solo prioritaires ;
- feed social réduit ;
- courses privées mises en avant.

### Mixte

```txt
Je veux progresser et contribuer à un crew.
```

Effets :
- crew recommandé ;
- challenges solo + crew ;
- notifications modérées ;
- classement local visible ;
- feed crew actif.

### Crew War

```txt
Je veux participer aux offensives et aux classements.
```

Effets :
- War Room prioritaire ;
- classements visibles ;
- rivalités suggérées ;
- notifications offensives ;
- CTA rejoindre / créer crew.

---

# 4. Réglages de visibilité dès l’onboarding

Pour éviter la pression sociale, l’utilisateur choisit aussi :

```txt
Qui peut voir tes activités ?
```

Options :

```txt
Moi seulement
Mes amis
Mon crew
Public GRYD
```

Puis :

```txt
Que veux-tu afficher ?
```

Options :

```txt
Stats complètes
Stats principales
Territoire seulement
Pas de carte
```

Par défaut recommandé :

```txt
Activités visibles crew
Trace simplifiée
Pas de position live
Données santé masquées
```

---

# 5. Focus Solo — architecture produit

Le mode Focus Solo soutient la progression personnelle sans imposer la comparaison.

## 5.1 Page Aujourd’hui

Objectif :
donner une action simple à faire aujourd’hui.

Wireframe :

```txt
AUJOURD’HUI

Score Forme : 78
Semaine équilibrée

Objectif du jour
→ 25 min facile
ou
→ Défendre 12 hexes proches

Progression semaine
2 / 3 runs
8,4 / 12 km
68 % du badge Consistency II

[Courir]
```

---

## 5.2 Objectifs personnels

Types d’objectifs :
- nombre de runs par semaine ;
- distance hebdo ;
- temps actif ;
- streak ;
- Score Forme ;
- défense légère ;
- exploration douce ;
- retour après pause.

Exemples :

```txt
Courir 3 fois cette semaine.
Atteindre 10 km cumulés.
Faire une sortie de 30 minutes.
Défendre 20 hexes.
Ouvrir une nouvelle route.
```

---

## 5.3 Feedback solo après course

Après une course, ne pas montrer directement la compétition si l’utilisateur est Focus Solo.

Afficher :

```txt
Mission accomplie
+5,8 km
+72 hexes
Score Forme +2
Consistency II : 68 % → 74 %
```

Puis CTA :

```txt
Voir ma progression
Partager
Continuer
```

Ne pas pousser :

```txt
Tu es #842.
Tu es loin du top 10.
```

---

## 5.4 Badges solo

Badges adaptés :
- Consistency ;
- Pace Progress ;
- Distance Runner ;
- Comeback ;
- Clean Runner ;
- Long Run ;
- Personal Best ;
- Streak 7 ;
- First Defense ;
- Pathfinder.

Important :
valoriser la régularité autant que la performance.

---

# 6. Crew / Communauté — architecture produit

Le mode communautaire doit créer appartenance et responsabilité partagée, sans pression excessive.

## 6.1 Crew Home

Wireframe :

```txt
NIGHT PACERS

Level 8 · Carbon League
8 / 10 membres
War Active

Objectif semaine
412 / 800 hexes

Coffre Crew
68 %

À faire
→ Défendre République
→ Ouvrir route Canal
→ Inviter 2 runners actifs

[War Room]
[Inviter]
[Chat]
```

---

## 6.2 Crew Feed

Le feed prioritaire est le feed crew.

Contenus :
- courses importantes ;
- captures ;
- défenses ;
- badges ;
- rank up ;
- coffre crew ;
- recrutement ;
- sorties collectives ;
- objectifs atteints.

Exemples :

```txt
Benjamin a défendu 42 hexes sur Paris Est.
Lucas a débloqué Hex Hunter III.
Night Pacers passe #3 local.
Coffre crew à 82 %.
```

Interactions :
- réagir ;
- commenter ;
- demander renfort ;
- partager ;
- proposer sortie.

---

## 6.3 Soutien social

Au lieu de simples likes, utiliser des réactions contextualisées :

```txt
Respect
Hold
Raid
Clean
Legend
Fast
```

Objectif :
- encourager ;
- reconnaître ;
- éviter le feed passif ;
- renforcer l’identité GRYD.

---

# 7. Challenges solo

Les challenges solo sont conçus pour nourrir :
- progrès ;
- compétence ;
- contrôle ;
- habitude.

## 7.1 Types de challenges solo

### Regularité

```txt
3 runs cette semaine
2 semaines actives d’affilée
7 jours sans casser la série
```

### Distance

```txt
10 km cumulés
25 km ce mois-ci
Première sortie 10 km
```

### Territoire personnel

```txt
Capturer 100 hexes
Défendre 30 hexes
Ouvrir 1 route
```

### Performance

```txt
Améliorer son allure moyenne
Battre son record 5 km
Stabiliser son allure
```

### Recovery / soft challenge

```txt
Faire une sortie facile
Courir sans objectif de vitesse
Reprendre après une pause
```

---

## 7.2 Structure d’un challenge solo

Chaque challenge doit avoir :

```txt
Nom
Objectif
Durée
Progression
Récompense
Badge associé
Share card
Niveau de difficulté
Mode privé possible
```

Exemple :

```txt
Consistency II
Objectif : courir 3 fois cette semaine
Progression : 2 / 3
Récompense : 150 XP + badge progression
Share card : optionnelle
```

---

## 7.3 Feedback challenge solo

Message recommandé :

```txt
Tu as complété Consistency II.
3 runs cette semaine.
Ton Score Forme passe à 79.
```

CTA :
- partager ;
- voir prochain niveau ;
- programmer prochain run.

Upsell possible :
- template premium ;
- plan structuré ;
- analyse avancée.

À éviter :
- culpabilisation ;
- comparaison négative ;
- “tu aurais pu faire mieux”.

---

# 8. Challenges crew

Les challenges crew combinent :
- coopération ;
- contribution ;
- reconnaissance ;
- objectif collectif.

## 8.1 Types de challenges crew

### Capture collective

```txt
Capturer 1 000 hexes en 7 jours.
```

### Défense collective

```txt
Défendre 300 hexes avant dimanche.
```

### Participation

```txt
Avoir 5 membres actifs cette semaine.
```

### Route

```txt
Ouvrir 3 routes entre zones.
```

### Pionnier

```txt
Créer un avant-poste dans une zone rurale.
```

### War Room

```txt
Terminer une offensive en 24 h.
```

---

## 8.2 Structure d’un challenge crew

Chaque challenge doit avoir :

```txt
Nom
Objectif collectif
Objectif minimum individuel
Durée
Progression collective
Contribution personnelle
Récompense collective
Récompense personnelle
Visibilité
Share card
```

Exemple :

```txt
Defense Week

Objectif collectif :
300 hexes défendus

Objectif minimum individuel :
1 run validé ou 20 hexes défendus

Progression :
214 / 300

Récompense :
Crew Chest Silver
+ XP crew
Badge Defender pour contributeurs
```

---

## 8.3 Pourquoi un objectif minimum individuel

Sans objectif individuel, certains joueurs peuvent profiter de l’effort collectif sans participer.

Mais l’objectif minimum ne doit pas être trop dur.

Bonne règle :

```txt
Chaque membre doit pouvoir contribuer même lentement.
```

Exemples :
- 1 run ;
- 2 km ;
- 10 hexes ;
- 1 défense ;
- 1 message de participation ;
- 1 scout report.

---

# 9. Challenges coopétitifs

La coopétition est le cœur de GRYD :

```txt
coopération dans le crew
+
compétition contre un autre crew
```

## 9.1 Exemple

```txt
Night Pacers vs Canal Crew
Durée : 48 h
Objectif : plus d’hexes défendus
Zone : Paris Est
```

Scores possibles :
- hexes capturés ;
- hexes défendus ;
- routes ouvertes ;
- membres actifs ;
- fiabilité moyenne ;
- participation.

---

## 9.2 Éviter la domination des rapides

Ne pas baser tous les challenges sur :
- vitesse ;
- distance brute ;
- volume total.

Ajouter des critères alternatifs :
- régularité ;
- défense ;
- participation ;
- exploration ;
- fiabilité ;
- progression personnelle ;
- nombre de membres actifs.

Ainsi, un coureur lent peut être utile.

---

## 9.3 Résultat coopétitif

À la fin :

```txt
VICTOIRE CREW
Night Pacers gagne 934 à 812

Top contributions :
Benjamin — 142 hexes défendus
Lucas — 3 routes ouvertes
Sarah — 4 runs verified
```

Récompenses :
- Crew XP ;
- coffre ;
- badge rivalry ;
- share card ;
- médaille.

---

# 10. Leaderboards avec exposition graduée

La comparaison sociale peut motiver, mais aussi décourager.  
GRYD doit donc rendre les leaderboards progressifs et contrôlables.

## 10.1 Niveaux de classement

```txt
Personnel
Crew
Amis
Local
Ville
Région
France
Global
```

## 10.2 Visibilité par défaut

### Nouveau joueur

Voir :
- progression personnelle ;
- rang dans crew si volontaire ;
- objectifs simples.

Masquer :
- global ;
- France ;
- top compétitif.

### Joueur crew

Voir :
- classement crew ;
- contribution ;
- local ;
- War Room.

### Joueur compétitif

Voir :
- ville ;
- France ;
- rivalités ;
- top 100 ;
- leagues.

---

## 10.3 Mode discret

Ajouter :

```txt
Mode discret
```

Effets :
- pas d’apparition en leaderboard global ;
- profil limité ;
- activités visibles amis / crew ;
- partage manuel seulement ;
- stats sensibles masquées.

---

# 11. Healthy Competition

GRYD doit créer de l’intensité sans créer de honte.

## 11.1 Interdits UX

Ne jamais afficher :

```txt
Tu es lent.
Ton crew perd à cause de toi.
Tu es dernier.
Tu as échoué.
Tu n’as pas assez couru.
```

## 11.2 Formulations recommandées

Préférer :

```txt
Tu as contribué à 12 % du coffre crew.
Tu as défendu 18 hexes.
Tu es à 1 run de ton objectif.
Ta régularité progresse.
Ton crew a besoin de renfort.
```

## 11.3 Valoriser plusieurs profils

GRYD doit récompenser :
- les rapides ;
- les réguliers ;
- les défenseurs ;
- les explorateurs ;
- les recruteurs ;
- les capitaines ;
- les pionniers ;
- les clean runners ;
- les membres sociaux.

---

# 12. Notification design

Les notifications doivent soutenir, pas culpabiliser.

## 12.1 Notifications solo

Bonnes :

```txt
Tu es à 1 run de ton objectif semaine.
Ton badge Consistency II est proche.
Une sortie courte suffit pour garder ta série.
```

Mauvaises :

```txt
Tu es en retard.
Tu vas perdre ta série.
Tu n’as pas couru.
```

---

## 12.2 Notifications crew

Bonnes :

```txt
Night Pacers a besoin de 80 hexes pour ouvrir le coffre.
République est sous pression : 24 h restantes.
Lucas propose une sortie défense demain.
```

Mauvaises :

```txt
Ton crew perd parce que tu n’as pas couru.
Tu es le moins actif.
```

---

## 12.3 Notifications compétitives

Bonnes :

```txt
Canal Crew a repris 34 hexes.
Une défense peut faire basculer Paris Est.
Ton crew est à 120 pts du top 3.
```

Mauvaises :
- humiliantes ;
- agressives ;
- trop fréquentes ;
- anxiogènes.

---

# 13. Neuromarketing propre

Les meilleurs moments d’upsell sont les micro-victoires.

## 13.1 Bons moments d’upsell

- badge débloqué ;
- challenge réussi ;
- crew chest rempli ;
- nouveau record ;
- fin de saison ;
- rank up ;
- Founder Pack ;
- passage de niveau ;
- première victoire crew.

## 13.2 Mauvais moments d’upsell

- échec ;
- retard ;
- baisse de performance ;
- défaite crew ;
- blessure / pause ;
- course rejetée ;
- perte de streak.

Règle :

```txt
Monétiser l’état positif, jamais la culpabilité.
```

---

## 13.3 Upsells recommandés

### Après badge unlock

```txt
Badge Hex Hunter III débloqué.
Débloque le template Legend pour partager ta conquête.
```

### Après challenge solo réussi

```txt
Tu viens de réussir 3 semaines régulières.
Envie d’un plan structuré pour continuer ?
```

### Après victoire crew

```txt
Votre crew vient de gagner.
Débloque le poster HD de la victoire.
```

### Après fin de saison

```txt
Ta Saison 0 est prête.
Génère ton poster saison premium.
```

---

# 14. Monétisation par profil

## 14.1 Mastery Player

Offres :
- stats avancées ;
- plans de progression ;
- analyse performance ;
- historique long ;
- templates progression ;
- objectifs personnalisés.

## 14.2 Social Player

Offres :
- templates crew ;
- posters crew ;
- avatars / frames ;
- emotes premium ;
- public profile premium ;
- outils de recrutement.

## 14.3 Competitive Player

Offres :
- battle pass ;
- skins territoire ;
- skins trace ;
- posters rank ;
- replay de conquête ;
- analytics War Room avancées.

Règle :
aucune offre ne doit vendre des kilomètres, des hexes ou une victoire.

---

# 15. Architecture des challenges

Chaque challenge dans GRYD doit utiliser ce modèle.

```txt
challenge_id
type: solo | crew | rivalry | event | season
name
description
duration
difficulty
visibility
primary_goal
secondary_goals
personal_minimum
collective_goal
reward_personal
reward_collective
share_template
privacy_mode
eligibility_rules
anti_abuse_rules
```

---

# 16. Types de challenges GRYD

## Solo

```txt
Consistency
Distance
Score Forme
Defense
Exploration
Comeback
```

## Crew

```txt
Crew Chest
Defense Week
Route Network
Outpost Builder
Active Members
War Room
```

## Rivalry

```txt
Crew vs Crew
Zone Battle
Defense Duel
Pioneer Race
```

## Event

```txt
Race Mode
City Weekend
Sponsor Challenge
Run Club Event
```

## Season

```txt
Season Rank
Founder Season
Top City
Top Pioneer
Legend League
```

---

# 17. Wireframes détaillés

## 17.1 Onboarding motivationnel

```txt
Écran 1
La carte est ouverte.
Ton run peut changer la frontière.

Écran 2
Choisis ton style :
[Focus Solo]
[Mixte]
[Crew War]

Écran 3
Choisis ta visibilité :
[Moi]
[Amis]
[Crew]
[Public]

Écran 4
Choisis ta zone :
Ville / pays / secteur

Écran 5
Rejoins un crew ou crée ton crew fondateur.
```

---

## 17.2 Page Aujourd’hui — Focus Solo

```txt
AUJOURD’HUI

Score Forme 78
Semaine équilibrée

Objectif
3e run de la semaine

Progression
2 / 3 runs
8,4 / 12 km
Badge Consistency II : 74 %

Prochaine action
20 min suffisent pour valider l’objectif

[Courir]
```

---

## 17.3 Page Crew Challenge

```txt
DEFENSE WEEK

Night Pacers
214 / 300 hexes défendus

Contribution personnelle
42 hexes
Objectif minimum atteint

Membres actifs
Benjamin — 42
Lucas — 38
Sarah — 31

Récompense
Crew Chest Silver à 300

[Proposer une sortie]
[Partager]
```

---

## 17.4 Page Rivalry Challenge

```txt
NIGHT PACERS vs CANAL CREW

Zone : Paris Est
Durée : 24 h restantes

Score
Night Pacers — 612
Canal Crew — 580

À faire
Défendre République
Ouvrir route Canal
Ramener 2 membres actifs

[War Room]
[Partager rivalité]
```

---

## 17.5 Fin de challenge solo

```txt
CHALLENGE RÉUSSI

Consistency II
3 runs cette semaine

Score Forme +4
Badge progress : 74 % → 100 %

[Partager]
[Voir prochain niveau]
[Continuer]
```

---

## 17.6 Fin de challenge crew

```txt
COFFRE CREW DÉBLOQUÉ

Night Pacers
300 / 300 hexes défendus

Top contributions
Benjamin — Defender
Lucas — Scout
Sarah — Raider

Récompenses
Crew XP +1200
Badge Defense Week
Skin share template

[Partager victoire]
[Ouvrir coffre]
```

---

# 18. Garde-fous psychologiques

## 18.1 Anti-shame

Ne jamais afficher publiquement :
- “membre faible” ;
- “dernier” ;
- “a fait perdre le crew” ;
- “pas assez actif”.

## 18.2 Contribution minimale souple

Pour les challenges crew, permettre plusieurs manières de contribuer :
- courir ;
- défendre ;
- explorer ;
- recruter ;
- organiser ;
- participer au chat ;
- scout report ;
- sortie collective.

## 18.3 Feed filtrable

Filtres :
- Tous ;
- Crew ;
- Amis ;
- Badges ;
- Offensives ;
- Perso.

## 18.4 Pause / blessure

Ajouter un statut :

```txt
Pause
Blessure
Indisponible
Défense seulement
Casual cette semaine
```

Ainsi, l’utilisateur n’est pas socialement pénalisé.

---

# 19. Badges motivationnels à ajouter

## Mastery

```txt
Consistency
Comeback
Personal Best
Clean Week
Steady Runner
Score Forme
```

## Social

```txt
Crew Helper
First Invite
Recruiter
Group Run
Encourager
Crew Founder
```

## Competitive

```txt
Rank Up
Zone Winner
Raid Leader
Defense MVP
Rivalry Winner
Season Top
```

## Healthy

```txt
Easy Run
Recovery Run
Balanced Week
Smart Runner
No Pressure Week
```

Ces badges évitent que seul le volume ou la vitesse soient récompensés.

---

# 20. Données à mesurer

## Solo

- objectifs complétés ;
- régularité ;
- progression personnelle ;
- rétention ;
- streaks ;
- courses privées ;
- Score Forme.

## Social

- amis ajoutés ;
- crews rejoints ;
- invitations envoyées ;
- candidatures ;
- réactions ;
- commentaires ;
- sorties collectives.

## Crew

- contributions ;
- membres actifs ;
- challenges terminés ;
- coffres ouverts ;
- offensives ;
- défense.

## Risques

- désactivation notifications ;
- passage en privé ;
- churn après pression sociale ;
- baisse d’activité après leaderboard ;
- signalements ;
- blocages.

Ces métriques permettent de voir si le social motive ou stresse.

---

# 21. Paramètres utilisateur

Créer une page :

```txt
Motivation & visibilité
```

Options :

```txt
Style de jeu :
Focus Solo / Mixte / Crew War

Classements :
Masqués / Crew / Local / Tous

Notifications :
Solo / Crew / Compétition / Off

Visibilité :
Moi / Amis / Crew / Public

Mode discret :
On / Off
```

---

# 22. Priorité MVP

À implémenter :

```txt
1. Onboarding style de jeu
2. Focus Solo / Mixte / Crew War
3. Challenges solo simples
4. Challenges crew simples
5. Progression personnelle
6. Crew contribution
7. Leaderboards gradués
8. Mode discret
9. Notifications non culpabilisantes
10. Upsell uniquement sur micro-victoire
11. Badges motivationnels
12. Paramètres de visibilité
```

---

# 23. V1

```txt
1. Challenges rivalité
2. Coopétition crew vs crew
3. Feed filtrable
4. Group runs liés aux challenges
5. Contribution non-running partielle
6. Segment local optionnel
7. Templates share par profil
8. Analytics motivationnels
9. Recommandations personnalisées
10. Plans premium pour Focus Solo
```

---

# 24. V2

```txt
1. Adaptation intelligente du style de jeu
2. Détection risque pression sociale
3. Auto-suggestion de mode discret
4. Coaching stratégique
5. Challenges sponsorisés
6. Events publics
7. Hall of Fame sain
8. Recaps émotionnels saison
9. Personnalisation avancée du feed
10. IA de recommandation challenge
```

---

# 25. Prompt Claude Code / Cursor

```md
Tu es Lead Product Designer, Behavioral Product Designer et Mobile Game Designer.

Crée le système de motivation GRYD autour de 3 profils :
- Mastery / Focus Solo
- Social / Crew Community
- Competitive / Crew War

## Objectifs
- Permettre à chaque utilisateur de choisir son style de jeu.
- Créer des challenges solo, crew, rivalité, event et saison.
- Éviter la pression sociale excessive.
- Ajouter des leaderboards gradués.
- Ajouter un mode discret.
- Créer des notifications non culpabilisantes.
- Déclencher les upsells uniquement après des micro-victoires.
- Valoriser la régularité, la défense, l’exploration, le recrutement et la contribution, pas seulement la vitesse.

## Pages à créer / modifier
- Onboarding motivationnel
- Page Aujourd’hui
- War Room
- Crew Challenge
- Rivalry Challenge
- Challenge Detail
- Challenge Result
- Motivation Settings
- Badges
- Profil
- Notifications

## Règles
- Pas de shame.
- Pas de leaderboard global forcé.
- Pas d’upsell après échec.
- Pas de notification culpabilisante.
- Mode discret disponible.
- Contribution crew visible mais non humiliante.
- Les utilisateurs peuvent passer de Focus Solo à Crew War à tout moment.

## Sortie attendue
- composants UI
- modèle de données challenge
- logique de progression
- états de notification
- règles de privacy
- animations de micro-victoires
- priorités MVP / V1 / V2
```

---

# 26. Conclusion

Les principes neuropsychologiques fournis sont utiles parce qu’ils évitent une erreur classique :

```txt
croire que plus de compétition = plus de motivation pour tout le monde.
```

La bonne approche pour GRYD :

```txt
plus de personnalisation motivationnelle
plus de progression personnelle
plus d’appartenance crew
plus de rivalité optionnelle
moins de pression forcée
```

GRYD doit pouvoir parler à trois personnes différentes :

```txt
Le runner qui veut progresser.
Le membre qui veut appartenir.
Le compétiteur qui veut dominer.
```

Phrase finale :

```txt
GRYD doit rendre l’effort visible, la progression désirable et la compétition choisie.
```
