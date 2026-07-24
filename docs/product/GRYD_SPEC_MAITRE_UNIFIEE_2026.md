# GRYD — SPÉCIFICATION MAÎTRE UNIFIÉE POUR CLAUDE CODE
## Refonte globale UI/UX, étude INTVL, méthode LOOP, Run + Bike, univers 2026, inspiration Rondesignlab, i18n, psychologie comportementale et contrôle de conformité de l’existant

> Ce document fusionne et remplace les deux documents précédents.
> Il constitue la source de vérité active pour la refonte.

---

# RÈGLE ABSOLUE — L’EXISTANT N’EST JAMAIS UNE PREUVE DE CONFORMITÉ

Le code actuel, les écrans actuels, les composants actuels, les flux actuels, les textes actuels, les règles actuelles, les animations actuelles, les choix de navigation actuels, les fichiers de traduction actuels, les analytics actuels, les tests actuels et les documents historiques ne constituent jamais une preuve que le besoin est correctement traité.

Une réponse du type :

```txt
« C’est déjà implémenté. »
« Nous avons déjà ce composant. »
« Cette page existe déjà. »
« Cette mécanique est déjà prévue. »
« Le design system couvre déjà ce cas. »
« L’application est déjà multilingue. »
« Le mode vélo est déjà présent. »
```

est interdite si elle n’est pas suivie d’une vérification complète de conformité à la spécification actuelle.

La seule question acceptable est :

> Ce qui existe correspond-il exactement, aujourd’hui, à la vision, aux règles, à la hiérarchie, au niveau de friction, au design system, aux comportements, aux états, aux traductions, aux tests et aux exigences décrits dans ce document ?

Le fait qu’un élément soit déjà développé ne réduit pas le niveau de contrôle exigé.

## 1. Statuts obligatoires pour chaque élément existant

Chaque écran, composant, flux, fonction, règle, animation, texte, icône, API, table, type, feature flag, traduction et test doit être classé dans un seul des statuts suivants :

```txt
CONFORME
Conforme à 100 % à la spécification actuelle, preuve à l’appui.

PARTIELLEMENT CONFORME
La base existe, mais des écarts précis subsistent.

OBSOLETE
L’élément correspond à une ancienne vision et doit être remplacé.

REDONDANT
L’élément fait doublon avec une solution plus cohérente.

SURDIMENSIONNÉ
L’élément contient plus de fonctions, de texte, d’états ou de complexité que nécessaire.

SOUS-DIMENSIONNÉ
L’élément ne couvre pas tous les cas requis.

NON VÉRIFIABLE
L’existence est supposée mais aucune preuve suffisante n’a été trouvée.

ABSENT
L’élément n’existe pas.

BLOQUANT
L’élément empêche un parcours critique ou crée un risque majeur.
```

Aucun élément ne peut être marqué `CONFORME` sur simple lecture d’un nom de fichier, d’un commentaire, d’un ticket, d’un type, d’un mock, d’un TODO ou d’une interface.

## 2. Preuves minimales exigées avant de déclarer « conforme »

Pour déclarer un élément conforme, fournir au minimum :

```txt
- chemin du fichier ;
- composant ou fonction concerné ;
- route ou écran consommateur ;
- comportement observé ;
- états gérés ;
- traductions présentes ;
- analytics associés ;
- tests existants ;
- capture d’écran ou test visuel si UI ;
- test E2E si parcours ;
- résultat des tests ;
- éventuels écarts connus ;
- conclusion explicite.
```

Pour une page UI, la preuve doit couvrir :

```txt
- chargement ;
- état vide ;
- état normal ;
- erreur ;
- permission refusée ;
- texte long ;
- petite taille d’écran ;
- grande police ;
- français ;
- anglais ;
- espagnol ;
- mode sombre ou thème applicable ;
- accessibilité ;
- navigation retour ;
- deep link si applicable ;
- tracking ;
- effet de bord sur autres pages.
```

## 3. Règle « REBUILD MENTALLY »

Avant de conserver un écran ou un composant existant, Claude Code doit répondre à cette question :

> Si cet écran, ce composant ou ce flux devait être conçu aujourd’hui, sans tenir compte du code déjà écrit, serait-il construit exactement de cette manière ?

Trois réponses possibles seulement :

```txt
OUI
Conserver, avec preuve de conformité.

OUI, MAIS
Refactorer les écarts identifiés.

NON
Remplacer, fusionner ou supprimer.
```

## 4. Interdiction du biais du coût irrécupérable

Le temps déjà investi n’est jamais un motif de conservation.

Les formulations suivantes sont interdites :

```txt
« Cela demanderait trop de refactor. »
« Le composant est déjà largement utilisé. »
« Il vaut mieux garder l’existant. »
« On pourra améliorer plus tard. »
« Le coût de migration est élevé. »
```

sans :

- comparaison entre coût de conservation et coût de correction ;
- estimation de dette future ;
- risque UX ;
- risque produit ;
- risque technique ;
- risque i18n ;
- risque analytics ;
- plan de migration ;
- décision argumentée.

## 5. Règle « BEST CURRENT VERSION WINS »

Entre l’ancienne implémentation et la nouvelle exigence :

> La meilleure version actuelle gagne.

La priorité est :

```txt
1. cohérence produit ;
2. compréhension utilisateur ;
3. réduction de friction ;
4. fiabilité ;
5. accessibilité ;
6. évolutivité ;
7. maintenabilité ;
8. vitesse d’exécution.
```

La vitesse ne peut pas justifier une incohérence structurelle sur un parcours critique.

## 6. Vérification obligatoire des anciennes décisions

Rechercher dans tout le projet :

```txt
- documents obsolètes ;
- anciens prompts ;
- anciens amendements ;
- commentaires contradictoires ;
- composants hérités ;
- écrans cachés ;
- feature flags anciens ;
- routes non utilisées ;
- traductions incomplètes ;
- copies de composants ;
- variantes de couleurs ;
- variantes de wording ;
- anciennes règles Run/Bike ;
- anciens statuts territoriaux ;
- anciennes priorités de navigation ;
- anciens paywalls ;
- anciennes permissions ;
- anciens tutoriels.
```

Créer :

```txt
LEGACY_DECISION_AUDIT.md
```

Pour chaque élément historique :

```txt
Décision historique
Source
Date si connue
Implémentation actuelle
Conflit avec la vision présente
Décision finale
Migration requise
Tests requis
```

## 7. Matrice de conformité obligatoire

Créer :

```txt
CURRENT_STATE_CONFORMITY_MATRIX.md
```

Colonnes minimales :

```txt
Domaine
Élément
Existe ?
Statut
Référence code
Référence design
Référence traduction
Référence test
Écart exact
Gravité
Action
Dépendances
Risque de régression
Preuve finale
```

## 8. Aucun « déjà fait » sans comparaison ligne par ligne

Pour chaque exigence de ce document :

```txt
Exigence
→ implémentation existante
→ comparaison
→ écart
→ action
→ test
→ résultat
```

Le contrôle doit être atomique.

Exemple incorrect :

```txt
« L’onboarding existe déjà. »
```

Exemple correct :

```txt
Exigence : onboarding utilisable sans GPS.
Implémentation : l’écran CityChoice déclenche actuellement requestForegroundPermissionsAsync au montage.
Écart : non conforme.
Conséquence : impossible d’explorer depuis le métro ou le canapé.
Action : déplacer la demande de permission au recentrage ou au démarrage de mission.
Tests : permission non demandée à froid, choix manuel de ville, première carte accessible.
Résultat : conforme après test.
```

## 9. Toute modification locale déclenche un contrôle transversal

Lorsqu’un élément est modifié, analyser obligatoirement :

```txt
- tous ses appelants ;
- tous ses consommateurs ;
- tous ses tests ;
- toutes ses traductions ;
- toutes ses variantes ;
- tous ses analytics ;
- toutes ses routes ;
- tous ses deep links ;
- toutes ses notifications ;
- tous ses états ;
- tous ses feature flags ;
- tous ses composants dérivés ;
- tous ses usages Run ;
- tous ses usages Bike ;
- tous ses usages Crew ;
- tous ses usages Story ;
- tous ses usages Widget ;
- tous ses usages iOS ;
- tous ses usages Android.
```

## 10. Règle de sortie

Claude Code ne doit jamais conclure :

```txt
« Tout est déjà en place. »
```

Il doit conclure sous cette forme :

```txt
Éléments vérifiés : X
Conformes : X
Partiellement conformes : X
Obsolètes : X
Absents : X
Bloquants : X
Modifiés : X
Tests ajoutés : X
Tests passés : X
Régressions restantes : X
```

---

# PROTOCOLE DE FUSION ET SOURCE DE VÉRITÉ

Ce document fusionné devient la source de vérité active.

En cas de contradiction avec :

- un ancien fichier `.md` ;
- un ancien prompt ;
- une ancienne décision ;
- une ancienne maquette ;
- une ancienne implémentation ;
- un ancien design system ;
- un ancien wording ;

la règle est :

```txt
la spécification la plus récente, la plus explicite et la plus cohérente avec la vision actuelle de GRYD prévaut.
```

Toute contradiction doit être :

1. détectée ;
2. documentée ;
3. arbitrée ;
4. migrée ;
5. testée ;
6. supprimée des anciennes sources si possible.

Créer :

```txt
SOURCE_OF_TRUTH_REGISTER.md
```

Ce registre doit lister :

```txt
Document
Statut
Date
Autorité
Remplace
Est remplacé par
Conflits connus
```

Les documents obsolètes doivent être marqués explicitement :

```txt
DEPRECATED — DO NOT IMPLEMENT
```

et ne doivent plus être utilisés comme référence d’implémentation.


---

# PARTIE I — PROMPT MAÎTRE UI/UX, INTVL, LOOP ET INTERNATIONALISATION

# GRYD — PROMPT MAÎTRE POUR CLAUDE CODE
## Refonte globale UI/UX, réduction radicale de friction, internationalisation complète, gamification et méthode LOOP

---

# 0. RÔLE ET MISSION

Tu es Claude Code, agissant simultanément comme :

- lead product designer mobile ;
- expert UX research ;
- directeur UI systems ;
- senior React Native / Expo engineer ;
- expert internationalisation mobile ;
- spécialiste en ergonomie cognitive ;
- expert en psychologie comportementale appliquée au produit ;
- game designer mobile ;
- spécialiste de la rétention, de l’activation et des boucles d’habitude ;
- QA lead ;
- architecte produit capable d’anticiper les effets de bord d’un changement local sur l’ensemble du système.

Tu dois réaliser une refonte globale, cohérente, systémique et mesurable de GRYD.

Le produit est un jeu mobile territorial basé sur la course à pied.

Le principe central :

> Le joueur court, ferme une boucle, capture une zone réelle, contribue à son crew, partage sa conquête, défend ou reprend un territoire.

La promesse produit :

> Une raison concrète de courir et de recommencer.

La boucle cœur :

```txt
Voir
→ choisir une cible
→ courir
→ fermer
→ capturer
→ voir la carte changer
→ partager
→ perdre / défendre / reprendre
→ revenir
```

L’objectif de ce travail n’est pas de produire une interface “plus jolie”.

L’objectif est de produire une application :

- immédiatement compréhensible ;
- utilisable en quelques secondes ;
- cohérente entre toutes les pages ;
- plus simple qu’INTVL ;
- plus ludique qu’une application de running classique ;
- plus claire qu’un réseau social sportif ;
- plus dense émotionnellement ;
- plus légère cognitivement ;
- plus virale ;
- plus rétentive ;
- plus internationale ;
- techniquement robuste ;
- sans contradiction entre ses écrans ;
- sans duplication de composants ;
- sans effet de bord caché ;
- sans dette UI/UX évitable.

---

# 1. POINT DE DÉPART STRATÉGIQUE

L’étude détaillée d’INTVL montre que leur produit est principalement :

> Un réseau social de running enrichi d’une mécanique de territoire.

GRYD doit prendre la direction inverse :

> Un jeu de territoire dans lequel courir est l’action qui transforme le monde.

Cette distinction doit influencer :

- la hiérarchie de chaque écran ;
- le wording ;
- les animations ;
- les notifications ;
- les résultats de course ;
- les classements ;
- les profils ;
- les crews ;
- les récompenses ;
- les stories ;
- les interactions ;
- les priorités de navigation ;
- la structure de l’onboarding ;
- la monétisation ;
- la profondeur sociale.

Dans INTVL, l’utilisateur voit souvent :

```txt
distance
→ allure
→ cardio
→ trace
→ territoire
```

Dans GRYD, la hiérarchie doit être :

```txt
conséquence territoriale
→ enjeu social
→ progression
→ action suivante
→ preuve sportive
→ statistiques avancées
```

Exemple :

```txt
RÉPUBLIQUE REPRISE
Tu repasses devant Koro
+0,18 km²
Le crew remonte #3

[PARTAGER]
[VOIR LA ZONE]

3,8 km · 22:16 · 5:49/km
```

Les données sportives restent importantes, mais elles ne doivent plus dominer la perception du produit.

---

# 2. LES PRINCIPAUX DÉFAUTS OBSERVÉS CHEZ INTVL À NE PAS REPRODUIRE

## 2.1 Onboarding trop long et trop séquentiel

INTVL demande successivement :

- inscription ;
- code d’invitation ;
- choix du sport ;
- explication de la boucle ;
- explication de la conquête ;
- explication de la croissance ;
- couleur ;
- localisation ;
- tracking publicitaire ;
- notifications ;
- essai payant ;
- tutoriel in-app ;
- classements ;
- territoires ;
- progression ;
- collectibles ;
- montres.

Cela crée :

- surcharge cognitive ;
- fatigue décisionnelle ;
- refus automatique des permissions ;
- abandon avant la première valeur ;
- impression de SaaS ;
- délai trop long avant le premier moment émotionnel.

GRYD doit apprendre pendant l’usage, pas avant l’usage.

## 2.2 Trop de texte avant l’action

L’utilisateur lit plusieurs paragraphes avant de pouvoir interagir.

GRYD doit respecter :

```txt
1 écran = 1 idée
1 écran = 1 action
1 phrase principale
1 phrase secondaire maximum
1 CTA principal
```

## 2.3 Paywall trop tôt

INTVL monétise avant que l’utilisateur ait capturé une zone.

GRYD ne doit jamais présenter un paywall avant :

- la première capture ;
- ou idéalement la troisième action territoriale réussie ;
- ou un moment naturel de personnalisation.

## 2.4 Demandes de permissions trop nombreuses

INTVL empile :

- localisation ;
- tracking ATT ;
- notifications ;
- potentiellement montres.

GRYD doit demander chaque permission uniquement lorsque la valeur devient évidente.

## 2.5 Carte très spectaculaire mais vite illisible

INTVL utilise :

- nombreuses couleurs utilisateur ;
- grandes surfaces superposées ;
- logos de clubs ;
- mosaïque nationale ;
- zones de tailles très variables ;
- peu de hiérarchie contextuelle.

GRYD doit afficher seulement ce qui sert la prochaine action.

## 2.6 Classements globaux démotivants

Un nouveau joueur voit immédiatement :

```txt
0 km²
contre
22 000 km²
```

GRYD doit privilégier les classements atteignables :

```txt
quartier
→ ville
→ crew
→ amis
→ région
→ national
→ mondial
```

## 2.7 Territoire trop souvent secondaire

Chez INTVL, la course reste souvent le héros.

Dans GRYD, le territoire est le résultat central.

## 2.8 Progression trop générique

Le simple “niveau” ne suffit pas.

GRYD doit faire progresser le joueur dans une identité territoriale visible.

## 2.9 Tutoriels non contextuels

INTVL explique des fonctionnalités avant que l’utilisateur en ait besoin.

GRYD doit déclencher l’aide au moment précis où une fonctionnalité devient utile.

## 2.10 Feed trop proche de Strava

INTVL montre :

- Morning Run ;
- Afternoon Run ;
- photos ;
- cartes ;
- distance ;
- allure.

GRYD doit générer des événements narratifs :

- zone prise ;
- zone reprise ;
- défense réussie ;
- crew attaqué ;
- rival dépassé ;
- objectif collectif atteint ;
- zone perdue ;
- revanche disponible.

---

# 3. OBJECTIFS PRODUIT PRIORITAIRES

Le redesign doit maximiser les métriques suivantes :

## 3.1 Activation

Événement principal :

```txt
first_territory_captured
```

Objectif :

- réduire le temps jusqu’à la première capture ;
- réduire le nombre d’écrans avant la première valeur ;
- garantir que l’utilisateur comprend la mécanique ;
- éviter qu’une première course se termine sans résultat compréhensible.

## 3.2 Rétention

Le produit doit donner une raison claire de revenir :

- zone perdue ;
- zone contestée ;
- rival proche ;
- mission crew ;
- progression locale ;
- collection ;
- saison ;
- objectif personnel ;
- opportunité proche.

## 3.3 Viralité

Chaque capture doit pouvoir générer :

```txt
capture
→ story prête
→ défi
→ deep link
→ nouvelle inscription
→ première capture de l’invité
```

## 3.4 Densité locale

L’application doit privilégier :

- quartier ;
- ville ;
- crews locaux ;
- rivalités locales ;
- défis proches ;
- classements atteignables.

## 3.5 Monétisation sans friction

Le paiement doit concerner :

- identité ;
- apparence ;
- statut ;
- personnalisation ;
- collections ;
- partage premium ;
- crew branding.

Jamais :

- puissance ;
- capture ;
- défense ;
- classement ;
- avantage territorial.

---

# 4. MÉTHODE LOOP OBLIGATOIRE

Tu dois utiliser une méthode d’exécution cyclique appelée LOOP.

Elle ne doit pas être symbolique. Elle doit structurer tout le travail.

## LOOP = Locate → Observe → Optimize → Prove

### L — Locate

Identifier :

- tous les écrans ;
- toutes les routes ;
- tous les composants ;
- tous les tokens ;
- tous les hooks ;
- toutes les dépendances visuelles ;
- tous les composants réutilisés ;
- tous les textes ;
- toutes les icônes ;
- toutes les règles de navigation ;
- toutes les données affichées ;
- tous les états ;
- tous les feature flags ;
- toutes les permissions ;
- toutes les dépendances i18n ;
- tous les liens entre pages.

Pour chaque écran, localiser :

- composants parents ;
- composants enfants ;
- stores ;
- queries ;
- mutations ;
- navigation ;
- tracking ;
- traductions ;
- tests ;
- styles ;
- deep links ;
- notifications ;
- entitlements ;
- feature flags.

### O — Observe

Observer :

- incohérences ;
- duplications ;
- contradictions ;
- frictions ;
- mauvais timings ;
- surcharge ;
- textes inutiles ;
- erreurs de hiérarchie ;
- icônes ambiguës ;
- mauvais contrastes ;
- paddings incohérents ;
- trop de scroll ;
- CTA concurrents ;
- navigation instable ;
- effets secondaires ;
- dépendances implicites ;
- données absentes ;
- états vides faibles ;
- erreurs de localisation ;
- chaînes non traduites ;
- composants non accessibles.

### O — Optimize

Optimiser :

- structure ;
- hiérarchie ;
- composants ;
- wording ;
- animation ;
- navigation ;
- permissions ;
- états ;
- responsive ;
- accessibilité ;
- i18n ;
- analytics ;
- erreurs ;
- performance ;
- récupération ;
- cohérence.

### P — Prove

Prouver que la modification fonctionne :

- tests unitaires ;
- tests d’intégration ;
- tests de navigation ;
- tests de traduction ;
- tests de snapshot ;
- screenshots avant/après ;
- tests petits écrans ;
- tests grands écrans ;
- tests textes longs ;
- tests français/anglais/espagnol ;
- tests mode hors ligne ;
- tests permission refusée ;
- tests loading ;
- tests erreur ;
- tests deep link ;
- tests achat ;
- tests accessibilité ;
- test du parcours complet.

La boucle doit être répétée jusqu’à ce que :

```txt
aucune régression critique
aucune incohérence visuelle majeure
aucun texte non traduit
aucun composant dupliqué sans raison
aucun CTA contradictoire
aucune route cassée
aucun effet de bord non expliqué
```

---

# 5. RÈGLE ABSOLUE SUR LES EFFETS DE BORD

Avant toute modification, construire une carte de dépendances.

Exemple :

```txt
Modifier TerritoryCard
peut impacter :
- carte
- profil
- résultat
- partage
- crew
- historique
- notifications
- deep link
- widget
- leaderboard
```

Aucune modification ne doit être faite sans vérifier :

- où le composant est utilisé ;
- quelles props sont attendues ;
- quels états existent ;
- quelles traductions sont consommées ;
- quels tests dépendent du rendu ;
- quelles métriques dépendent de l’action ;
- quels écrans dépendent du même wording ;
- quelles routes dépendent du même type métier ;
- quels deep links ouvrent cet écran ;
- quelles notifications pointent vers cet écran ;
- quels achats modifient ce composant.

Créer un fichier :

```txt
CHANGE_IMPACT_MATRIX.md
```

Chaque changement doit contenir :

```txt
Élément modifié
Écrans impactés
Composants impactés
Données impactées
Tracking impacté
i18n impactée
Tests requis
Risques
Résultat de validation
```

---

# 6. AUDIT GLOBAL À PRODUIRE AVANT LE CODE

Créer obligatoirement :

```txt
GRYD_UI_UX_GLOBAL_AUDIT.md
INTVL_COMPETITIVE_GAP_ANALYSIS.md
CHANGE_IMPACT_MATRIX.md
GLOBAL_COMPONENT_INVENTORY.md
GLOBAL_TEXT_INVENTORY.md
GLOBAL_ICON_INVENTORY.md
GLOBAL_ROUTE_MAP.md
GLOBAL_STATE_MAP.md
GLOBAL_PERMISSION_MAP.md
GLOBAL_I18N_MAP.md
GLOBAL_ANALYTICS_MAP.md
GLOBAL_VISUAL_DEBT.md
```

Le rapport doit couvrir chaque écran.

Pour chaque écran :

```txt
- objectif utilisateur ;
- action principale ;
- action secondaire ;
- nombre de décisions ;
- nombre de CTA ;
- nombre de mots ;
- temps de compréhension estimé ;
- friction cognitive ;
- friction physique ;
- friction émotionnelle ;
- friction de navigation ;
- dépendances ;
- composants ;
- données ;
- états ;
- erreurs ;
- permissions ;
- tracking ;
- i18n ;
- risques ;
- recommandation ;
- priorité P0/P1/P2/P3.
```

---

# 7. REFONTE DE L’ONBOARDING

## 7.1 Doctrine

L’onboarding doit être faisable :

- dans un canapé ;
- dans le métro ;
- sans GPS ;
- sans courir ;
- sans notifications ;
- sans montre ;
- sans choisir un crew ;
- sans paywall ;
- avec une seule main ;
- en moins de 45 secondes.

## 7.2 Parcours recommandé

### Écran 1 — Comprendre

```txt
FERME UNE BOUCLE.
PRENDS LA ZONE.

[animation]
[CONTINUER]
```

Animation :

```txt
trace
→ fermeture
→ remplissage du territoire
→ label “À TOI”
```

### Écran 2 — Comprendre la tension

```txt
TA ZONE PEUT ÊTRE REPRISE.

Cours seul.
Défends-la avec ton crew.

[CONTINUER]
```

Animation :

```txt
zone verte
→ attaque orange
→ statut contesté
→ retour chartreuse après défense
```

### Écran 3 — Ville

```txt
OÙ VEUX-TU JOUER ?

[Rechercher une ville]
[Utiliser ma position]
```

La ville doit pouvoir être choisie manuellement.

### Authentification

```txt
Continuer avec Apple
Continuer avec Google
Continuer avec email
```

### Arrivée directe sur carte démo

Pas de permission obligatoire.

Afficher une carte explorable avec données de démonstration ou zones publiques agrégées.

### Première course

Les permissions GPS doivent être demandées seulement ici.

## 7.3 Règles

- aucun écran d’invitation manuel sans deep link détecté ;
- aucun choix du sport au MVP si GRYD est running-first ;
- aucun choix de couleur territoriale ;
- aucun paywall ;
- aucune notification ;
- aucun ATT ;
- aucune intégration montre ;
- aucune explication de classement ;
- aucune explication de collectibles ;
- aucune explication de stats ;
- aucun tutoriel de 7 slides.

---

# 8. PERMISSIONS

Créer un système de pré-permission contextuelle.

## Localisation

Demander au moment de :

- recentrer ;
- voir les zones proches ;
- préparer une course ;
- lancer une course.

Texte :

```txt
VOIR LES ZONES PRÈS DE TOI

GRYD utilise ta position pour afficher les zones proches
et enregistrer ta course lorsque tu la lances.

[CONTINUER]
[CHOISIR UNE VILLE]
```

## Notifications

Demander après la première situation pertinente :

```txt
SOIS PRÉVENU SI TA ZONE EST REPRISE

[ACTIVER]
[PLUS TARD]
```

## ATT

Ne pas demander dans l’onboarding.

Déclencher après :

- une campagne attribuée ;
- un premier partage ;
- ou un moment où l’utilisateur comprend la valeur.

## Santé / montre

Disponible depuis :

```txt
Profil
→ Appareils et services
```

Pas de popup automatique.

---

# 9. CARTE PRINCIPALE

## 9.1 Question centrale

La carte doit répondre en moins d’une seconde :

```txt
où suis-je ?
qui possède quoi ?
quelle est ma priorité ?
que dois-je faire maintenant ?
```

## 9.2 Affichage

Montrer :

- position ;
- territoires personnels ;
- territoire crew ;
- zones adverses pertinentes ;
- zones neutres pertinentes ;
- mission principale ;
- zone sélectionnée ;
- statut contesté ;
- CTA contextuel ;
- recenter ;
- couches minimales.

Masquer par défaut :

- tous les joueurs ;
- tous les logos ;
- toutes les microcellules ;
- tous les classements ;
- toutes les missions ;
- toutes les routes ;
- tous les contenus sociaux ;
- toutes les boutiques ;
- tous les événements non pertinents.

## 9.3 Carte mondiale / dense

Ne jamais reproduire la mosaïque multicolore d’INTVL.

À faible zoom :

```txt
grands secteurs
crew dominant
zone neutre
zone contestée
activité générale
```

À moyen zoom :

```txt
territoires fusionnés
limites principales
missions pertinentes
```

À fort zoom :

```txt
frontière précise
zone sélectionnée
trace utile
objectif
```

## 9.4 Couleurs fonctionnelles

```txt
chartreuse = moi / mon crew
orange = rival
gris = neutre
violet = contesté
bleu = protégé / vérifié
or = prestige / saison / récompense
```

La personnalisation utilisateur ne doit pas modifier les couleurs fonctionnelles de la carte.

## 9.5 Bottom sheet

Une seule bottom sheet active.

Structure :

```txt
statut
nom de zone
propriétaire
enjeu
distance estimée
CTA principal
action secondaire discrète
```

Exemple rival :

```txt
RÉPUBLIQUE
Tenue par Koro
0,14 km²
Reprise possible en 2,8 km

[REPRENDRE]
```

---

# 10. LIVE RUN

L’écran doit être extrêmement simple.

Afficher seulement :

- temps ;
- distance ;
- allure ;
- trace ;
- progression de boucle ;
- état GPS ;
- pause ;
- terminer.

Une seule information temporaire :

```txt
Boucle possible
420 m pour fermer
Presque fermée
Boucle fermée
Zone rivale traversée
GPS faible
```

Ne jamais afficher simultanément plusieurs alertes.

Ajouter :

- sauvegarde continue ;
- récupération post-crash ;
- synchronisation différée ;
- statut local / synchronisé ;
- protection contre doublon ;
- message clair en cas d’erreur.

---

# 11. RÉSULTAT POST-COURSE

## Hiérarchie

```txt
1. conséquence territoriale
2. impact crew / rival
3. surface
4. action suivante
5. partage
6. statistiques
7. détails
```

Exemple :

```txt
RÉPUBLIQUE REPRISE

Tu repasses devant Koro.
+0,18 km²

[PARTAGER]
[VOIR LA ZONE]

3,8 km · 22:16 · 5:49/km
```

Ne pas ouvrir directement sur :

- cardio ;
- splits ;
- graphiques ;
- allure moyenne ;
- élévation.

Ces éléments restent accessibles sous :

```txt
VOIR LES STATISTIQUES
```

---

# 12. PROFIL ET PROGRESSION

## 12.1 Remplacer le “niveau” générique

Utiliser une progression statutaire.

Exemple :

```txt
Recrue
Éclaireur
Capitaine
Commandant
Gouverneur
Souverain
Légende
```

Le rang doit refléter :

- activité territoriale ;
- constance ;
- défense ;
- reprise ;
- contribution crew ;
- diversité ;
- fair-play.

Ne pas refléter uniquement la distance.

## 12.2 Profil prioritaire

Afficher :

- rang ;
- surface contrôlée ;
- zones ;
- rival principal ;
- crew ;
- progression locale ;
- série active ;
- dernière conquête ;
- objectif suivant.

Les statistiques sportives avancées vont dans un onglet secondaire.

---

# 13. CHALLENGES

Ne pas récompenser principalement :

- activer les notifications ;
- ajouter une photo ;
- connecter une montre.

Ces actions peuvent donner un petit bonus d’onboarding, mais ne doivent pas être les défis principaux.

Défis prioritaires :

```txt
Capturer 3 zones
Reprendre une zone
Défendre 24 h
Fermer une boucle parfaite
Contribuer à une mission crew
Dépasser un rival
Partager une conquête
Faire réaliser une première capture à un ami
Conserver un territoire 7 jours
Aider un membre
```

Chaque défi doit répondre à :

```txt
action
progression
récompense
raison
```

---

# 14. COLLECTIBLES ET COSMÉTIQUES

Chaque objet doit avoir une histoire.

Ne pas présenter une simple galerie de skins.

Associer les objets à :

- saisons ;
- exploits ;
- villes ;
- rivalités ;
- premiers joueurs ;
- crews ;
- anniversaires ;
- événements ;
- collections.

Exemples :

```txt
Badge Saison 0
Skin Paris Est
Titre Premier Conquérant
Cadre 100 défenses
Trace 1 000 km
Emblème Premier Crew
```

La rareté doit être réelle et explicite.

---

# 15. CREWS

Le crew doit être une unité active, pas une page de statistiques.

Afficher :

```txt
mission prioritaire
guerre en cours
zone contestée
dernière victoire
dernière perte
rival principal
membres disponibles
surface
rang local
```

Navigation :

```txt
APERÇU
TERRITOIRE
MEMBRES
```

Actions visibles :

```txt
INVITER
PARTAGER
AIDER
DÉFENDRE
REPRENDRE
```

## Fil interne

Préférer un fil d’événements automatiques :

```txt
Koro a repris République
Maya demande de l’aide
Canal est contesté
Le crew passe #3
```

Réactions simples :

```txt
🔥 💪 🛡️ 👏 🏃
```

Éviter le chat complet au MVP.

---

# 16. CLASSEMENTS

Priorité :

```txt
quartier
ville
crew
amis
saison
région
national
mondial
```

Afficher l’utilisateur dans une zone atteignable.

Exemple :

```txt
#8 Paris Est
0,12 km² du top 5
```

Créer plusieurs spécialités :

```txt
Conquérant
Défenseur
Voleur
Stratège
MVP
Progression
Plus longue possession
Meilleure reprise
```

Éviter un unique classement basé sur km².

---

# 17. FEED SOCIAL

Le feed ne doit pas devenir un clone de Strava.

Les posts doivent être orientés gameplay.

Types :

```txt
zone capturée
zone reprise
zone perdue
défense
victoire crew
rival dépassé
mission terminée
saison
badge
recrue activée
```

Structure :

```txt
événement
carte
conséquence
identité
CTA
```

Exemple :

```txt
KORO A REPRIS RÉPUBLIQUE

+0,18 km²
Les Foulées 93 passent #3

[VOIR LA ZONE]
[DÉFIER]
```

Les photos restent optionnelles.

---

# 18. STORIES ET VIRALITÉ

Story gratuite :

```txt
J’AI PRIS
RÉPUBLIQUE

[grande carte]

+0,14 km²

PRENDS-LA-MOI
```

Règles :

```txt
1 idée
1 preuve
1 résultat
1 défi
```

Retirer :

- trop de badges ;
- trop de texte ;
- privacy note visible ;
- hashtag obligatoire ;
- mascotte permanente ;
- plusieurs logos ;
- statistiques secondaires.

---

# 19. NEUROPSYCHOLOGIE ET RÉTENTION

Tu dois appliquer les principes suivants sans créer de dark patterns.

## 19.1 Réduction de charge cognitive

Le cerveau traite plus vite :

- contraste clair ;
- hiérarchie stable ;
- formes répétées ;
- actions prévisibles ;
- vocabulaire constant ;
- options limitées ;
- feedback immédiat.

Règle :

```txt
maximum 1 action principale par écran
maximum 3 choix simultanés
maximum 2 niveaux de texte secondaire
```

## 19.2 Effet de progression

Toujours montrer :

```txt
ce qui est accompli
ce qui manque
ce qui se passe ensuite
```

Exemple :

```txt
0,12 km² pour passer #5
```

Plus motivant que :

```txt
Tu es #8
```

## 19.3 Effet Zeigarnik

Les tâches incomplètes restent mentalement actives.

Utiliser :

```txt
Boucle presque fermée
Plus que 420 m
Mission crew à 80 %
Zone contestée à 46 %
```

Sans transformer le produit en source de pression excessive.

## 19.4 Aversion à la perte

Une zone perdue doit être formulée comme une possibilité d’action.

Mauvais :

```txt
Tu as perdu République.
```

Bon :

```txt
Koro a repris République.
Tu peux la récupérer en 2,8 km.
```

## 19.5 Endowment effect

L’utilisateur valorise davantage ce qu’il considère comme sien.

Renforcer :

- nom de zone ;
- durée de possession ;
- historique ;
- défenses ;
- badge ;
- story ;
- crew ;
- narration.

## 19.6 Proximité sociale

Un rival précis est plus motivant qu’un classement global.

Afficher :

```txt
Koro est à 0,08 km² devant toi
```

Pas :

```txt
Tu es 184 321e mondial
```

## 19.7 Variable reward contrôlée

Varier :

- forme de mission ;
- rival ;
- zone ;
- badge ;
- animation ;
- objectif local.

Ne jamais utiliser de lootbox payante aléatoire.

## 19.8 Peak-end rule

La fin d’une course doit contenir un pic émotionnel :

```txt
animation de capture
nom de zone
impact visible
partage
prochaine action
```

## 19.9 Social proof

Montrer :

```txt
3 membres ont déjà contribué
12 runners défendent cette zone
Koro vient de répondre à ton défi
```

## 19.10 Autonomie

Toujours laisser :

- plus tard ;
- choisir un autre objectif ;
- indisponible cette semaine ;
- masquer une alerte ;
- changer de mission ;
- abandonner sans punition.

## 19.11 Compétence

Le produit doit faire ressentir une progression compréhensible.

Ne pas utiliser un score opaque.

## 19.12 Appartenance

Le crew doit montrer :

- contribution ;
- reconnaissance ;
- besoin collectif ;
- objectif partagé ;
- identité ;
- histoire.

---

# 20. MICROCOPY

Chaque mot doit être audité.

Créer :

```txt
GLOBAL_COPY_SYSTEM.md
```

Règles :

- verbes d’action ;
- une intention par phrase ;
- pas de jargon technique ;
- pas de formulation bureaucratique ;
- pas de phrases longues ;
- pas de CTA vagues ;
- pas de “Découvrir” si l’action est “Choisir” ;
- pas de “Continuer” si une action plus précise est possible.

Exemples :

```txt
GO
CONQUÉRIR
REPRENDRE
DÉFENDRE
TERMINER
AIDER
PARTAGER
VOIR LA ZONE
```

Éviter :

```txt
Commencer l’expérience
Découvrir ma ville
Poursuivre le processus
Effectuer une action
```

Créer un dictionnaire produit partagé :

```txt
territoire
zone
crew
capture
reprise
défense
contestation
boucle
mission
rang
rival
```

Un même concept ne doit pas avoir plusieurs noms selon les écrans.

---

# 21. ICONOGRAPHIE

Créer une seule bibliothèque d’icônes principale.

Pour chaque icône, documenter :

```txt
nom
sens
état
taille
stroke
couleur
usage autorisé
usage interdit
```

Aucune icône ne doit être ambiguë.

Exemple :

- drapeau = territoire ;
- bouclier = défense ;
- épées = guerre ;
- boucle = capture ;
- groupe = crew ;
- cible = mission ;
- couronne = rang ;
- flèche retour = navigation ;
- partage = action externe ;
- cloche = notifications.

Éviter :

- mélange outline / filled ;
- emoji utilisés comme icônes système ;
- pictogrammes sans label dans les premières utilisations ;
- icônes de plusieurs familles incompatibles.

---

# 22. DESIGN SYSTEM

Créer des tokens stricts.

## Spacing

```txt
4
8
12
16
20
24
32
40
48
```

## Radius

```txt
8
12
20
24
```

## Typographie

Maximum 6 styles principaux :

```txt
Display
H1
H2
H3
Body
Caption
```

## Boutons

```txt
Primary
Secondary
Ghost
Destructive
Icon
```

Tous doivent gérer :

- default ;
- pressed ;
- disabled ;
- loading ;
- focus ;
- long text ;
- accessibility.

## Cards

Limiter les variantes :

```txt
BaseCard
ActionCard
TerritoryCard
CrewCard
StatCard
ResultCard
```

Interdiction de recréer une card dans chaque écran.

---

# 23. INTERNATIONALISATION COMPLÈTE

L’application doit être multilingue immédiatement.

Langues minimum :

```txt
fr
en
es
```

Préparer l’architecture pour :

```txt
de
it
pt
nl
ja
ko
```

## Règles

- aucun texte en dur ;
- aucune concaténation de phrase ;
- aucun pluriel manuel ;
- aucune date locale codée ;
- aucune unité codée ;
- aucun prix codé ;
- aucune capitale imposée ;
- aucun genre grammatical supposé ;
- aucun ordre de mots fixe ;
- aucune largeur calculée sur le français uniquement.

## Structure

```txt
locales/
  fr/
    common.json
    onboarding.json
    map.json
    run.json
    result.json
    crew.json
    profile.json
    notifications.json
    errors.json
    monetization.json
  en/
  es/
```

## ICU MessageFormat

Utiliser :

- pluriels ;
- select ;
- nombres ;
- dates ;
- durées ;
- unités ;
- pourcentages.

Exemple :

```json
{
  "territory_count": "{count, plural, =0 {Aucune zone} one {# zone} other {# zones}}"
}
```

## Tests obligatoires

Tester :

```txt
français long
anglais court
espagnol long
noms de ville longs
noms de crew longs
RTL readiness
grandes polices
format 24 h / 12 h
virgule / point décimal
km / miles
m² / km²
```

## Détection

Ordre :

```txt
préférence utilisateur
→ langue système
→ anglais
```

La langue doit pouvoir être changée dans les réglages sans redémarrage.

---

# 24. ACCESSIBILITÉ

Tester :

- VoiceOver ;
- TalkBack ;
- contraste ;
- taille dynamique ;
- Reduce Motion ;
- touch targets 44×44 ;
- labels accessibles ;
- ordre de lecture ;
- focus ;
- lecteurs d’écran ;
- vibration désactivable ;
- daltonisme.

Ne jamais utiliser uniquement la couleur pour communiquer un état.

Ajouter :

```txt
couleur + contour + icône + label
```

---

# 25. ANIMATIONS

Chaque animation doit avoir une fonction.

Types utiles :

- trace qui se dessine ;
- boucle qui se ferme ;
- territoire qui se remplit ;
- changement de camp ;
- contestation ;
- défense ;
- montée de rang ;
- progression ;
- story ;
- crew contribution.

Règles :

- 60 fps ;
- interruption possible ;
- pas de délai bloquant ;
- Reduce Motion ;
- pas d’animation décorative répétitive ;
- pas de glow excessif ;
- pas de vibration permanente ;
- durée courte ;
- feedback immédiat.

---

# 26. ANALYTICS

Créer un tracking qui mesure la friction.

Événements :

```txt
screen_viewed
cta_tapped
back_tapped
permission_pre_prompt_viewed
permission_granted
permission_denied
onboarding_skipped
first_run_started
first_run_completed
first_loop_closed
first_territory_captured
share_preview_generated
share_exported
deep_link_opened
crew_joined
crew_help_accepted
territory_lost
territory_recaptured
paywall_viewed
purchase_completed
```

Propriétés :

```txt
screen
source
language
city_id
territory_id
crew_id
mission_type
cta
time_on_screen
previous_screen
permission_status
app_version
experiment_id
```

Mesurer :

- temps jusqu’à première capture ;
- abandon par écran ;
- refus permission ;
- retour arrière ;
- CTA incompris ;
- écrans visités sans action ;
- taux de partage ;
- conversion deep link ;
- rétention après perte ;
- rétention après crew ;
- conversion cosmétique.

---

# 27. TESTS DE PARCOURS COMPLETS

Créer des tests E2E pour :

```txt
installation
→ onboarding
→ auth
→ ville
→ carte
→ première mission
→ permission GPS
→ run
→ capture
→ résultat
→ partage
→ deep link
→ inscription invité
→ crew
→ achat cosmétique
→ restauration
→ suppression compte
```

Tester variantes :

- GPS refusé ;
- notification refusée ;
- offline ;
- faible batterie ;
- crash pendant run ;
- reprise après crash ;
- deep link sans app ;
- deep link avec app ;
- traduction espagnole ;
- texte long ;
- nom crew long ;
- zone sans nom ;
- achat échoué ;
- restauration ;
- zone perdue ;
- changement de langue.

---

# 28. PRIORISATION

## P0

- auth réelle ;
- onboarding réduit ;
- carte lisible ;
- GPS ;
- run sauvegardé ;
- capture persistée ;
- résultat territorial ;
- story ;
- deep link ;
- i18n fr/en/es ;
- design system ;
- composants partagés ;
- tests critiques ;
- suppression des textes en dur.

## P1

- crew MVP ;
- aides ;
- rival ;
- notifications contextuelles ;
- classements locaux ;
- profil territorial ;
- progression ;
- collectibles ;
- analytics complet ;
- paywall contextuel.

## P2

- animations premium ;
- stats avancées ;
- montres ;
- saisons ;
- compétitions ;
- GRYD+ ;
- internationalisation supplémentaire.

---

# 29. LIVRABLES OBLIGATOIRES

Créer :

```txt
GRYD_UI_UX_GLOBAL_AUDIT.md
INTVL_COMPETITIVE_GAP_ANALYSIS.md
CHANGE_IMPACT_MATRIX.md
GLOBAL_COMPONENT_INVENTORY.md
GLOBAL_TEXT_INVENTORY.md
GLOBAL_ICON_INVENTORY.md
GLOBAL_ROUTE_MAP.md
GLOBAL_STATE_MAP.md
GLOBAL_PERMISSION_MAP.md
GLOBAL_I18N_MAP.md
GLOBAL_ANALYTICS_MAP.md
GLOBAL_VISUAL_DEBT.md
GLOBAL_COPY_SYSTEM.md
DESIGN_TOKENS.md
COMPONENT_SYSTEM.md
SCREEN_BY_SCREEN_REFACTOR_PLAN.md
I18N_IMPLEMENTATION_PLAN.md
ACCESSIBILITY_PLAN.md
ANIMATION_SYSTEM.md
VISUAL_REGRESSION_PLAN.md
E2E_TEST_PLAN.md
MIGRATION_PLAN.md
RELEASE_CHECKLIST.md
```

---

# 30. PROCÉDURE D’EXÉCUTION

## Étape 1

Auditer, ne rien modifier.

## Étape 2

Construire les inventaires et la matrice d’impact.

## Étape 3

Figer :

- vocabulaire ;
- tokens ;
- composants ;
- navigation ;
- i18n ;
- icônes ;
- analytics.

## Étape 4

Refactorer le design system.

## Étape 5

Refactorer écran par écran avec LOOP.

## Étape 6

Après chaque écran :

```txt
Locate
Observe
Optimize
Prove
```

## Étape 7

Créer screenshots avant/après.

## Étape 8

Tester les effets de bord.

## Étape 9

Tester fr/en/es.

## Étape 10

Tester le parcours complet.

## Étape 11

Faire un audit final indépendant.

---

# 31. DÉFINITION DE TERMINÉ

Le travail n’est terminé que lorsque :

```txt
- un utilisateur comprend GRYD en moins de 10 secondes ;
- l’onboarding fonctionne sans GPS ;
- l’utilisateur peut explorer depuis son canapé ;
- la première permission arrive au moment utile ;
- la première capture est claire ;
- le territoire est toujours prioritaire sur la statistique ;
- les cartes restent lisibles avec forte densité ;
- les CTA sont cohérents ;
- chaque mot est traduit ;
- chaque icône a un sens stable ;
- chaque composant utilise les tokens ;
- aucune page critique n’a de style en dur ;
- aucun texte critique n’est tronqué ;
- aucun écran n’a deux CTA principaux concurrents ;
- aucune route n’est cassée ;
- aucun deep link n’est cassé ;
- aucun achat n’est non restaurable ;
- aucune course n’est perdue ;
- les tests fr/en/es passent ;
- les screenshots de référence passent ;
- tous les changements ont été validés par matrice d’impact ;
- la totalité du parcours fonctionne sur appareil réel.
```

---

# 32. PRINCIPE FINAL

Pour chaque écran, chaque bloc, chaque mot, chaque icône, chaque animation et chaque notification, pose systématiquement ces questions :

```txt
Est-ce nécessaire ?
Est-ce compréhensible en une seconde ?
Est-ce cohérent avec les autres pages ?
Est-ce que cela réduit ou augmente la friction ?
Est-ce que cela aide l’utilisateur à agir ?
Est-ce que cela renforce le jeu territorial ?
Est-ce que cela donne une raison de revenir ?
Est-ce que cela reste clair dans toutes les langues ?
Est-ce que cela crée un effet de bord ailleurs ?
Est-ce que cela peut être testé ?
```

Aucune décision ne doit être prise pour des raisons purement esthétiques.

La règle maîtresse est :

> GRYD ne doit jamais demander à l’utilisateur de comprendre le système avant d’en ressentir la valeur.

La meilleure UX est celle qui fait oublier l’interface et pousse naturellement vers :

```txt
voir
→ agir
→ gagner
→ partager
→ revenir
```


---

# PARTIE II — EXTENSION RUN + BIKE, UNIVERS VISUEL ET ÉTUDE RONDESIGNLAB

# GRYD — ADDENDUM V2 POUR CLAUDE CODE
## Vélo, refonte esthétique complète, étude de marché couleur/design, univers visuel, inspiration Rondesignlab, humanisation, friction zéro

---

# 0. CONTEXTE

Ce document complète le prompt maître précédent :

```txt
GRYD_prompt_maitre_refonte_UI_UX_INTLV_LOOP_i18n.md
```

Il ajoute les décisions suivantes :

1. Ajouter la catégorie **vélo / bike** demandée par certains utilisateurs.
2. Repenser GRYD comme une app **running + cycling**, mais sans casser la simplicité du MVP.
3. Faire une refonte complète du design global.
4. Garder la **chartreuse** comme couleur signature, mais faire une vraie étude de marché sur la palette, les contrastes, les couleurs secondaires fonctionnelles et la différenciation.
5. Étudier l’approche visuelle de **Rondesignlab** sur site, Instagram, Behance, Dribbble, cas clients et systèmes visuels.
6. Adapter cette approche à GRYD pour créer un univers premium, vivant, humain, sportif et territorial.
7. Ajouter des photos humaines dans l’onboarding et certains écrans si cela améliore la compréhension et l’émotion.
8. Ajouter proprement la photo de profil utilisateur.
9. Réduire la friction dans l’usage et dans le design.
10. Vérifier chaque effet de bord page par page avec la méthode LOOP.

Le but n’est pas de copier INTVL ni Rondesignlab.

Le but est de créer une version de GRYD :

```txt
plus claire qu’INTVL
plus premium qu’une app sport classique
plus humaine qu’un simple jeu de carte
plus vivante qu’un tracker GPS
plus mémorable qu’un SaaS mobile
```

---

# 1. CONTRAINTE FONDAMENTALE

GRYD doit rester compréhensible en moins de 10 secondes.

L’ajout du vélo ne doit pas créer une app confuse.

La refonte graphique ne doit pas créer une app décorative.

La direction esthétique ne doit jamais prendre le dessus sur :

```txt
comprendre
→ agir
→ courir / rouler
→ capturer
→ partager
→ revenir
```

Chaque changement visuel doit réduire la friction ou renforcer l’émotion utile.

---

# 2. AJOUT DE LA CATÉGORIE VÉLO

## 2.1 Décision produit

Ajouter le vélo comme catégorie officielle :

```txt
Run
Bike
```

En français :

```txt
Course
Vélo
```

En espagnol :

```txt
Correr
Bici
```

L’ajout du vélo crée une nouvelle catégorie de jeu, pas un simple filtre d’activité.

## 2.2 Pourquoi c’est stratégique

Le vélo peut augmenter :

- taille du marché ;
- surface couverte ;
- fréquence des sorties ;
- compatibilité avec Garmin / Wahoo / Strava ;
- potentiel événementiel ;
- partenariats marques ;
- clubs locaux ;
- mécaniques de territoire plus grandes ;
- contenu social plus spectaculaire.

Mais il augmente aussi :

- complexité des règles ;
- risque d’illisibilité carte ;
- risque d’injustice entre coureurs et cyclistes ;
- risque de confusion dans les classements ;
- risque anti-triche, surtout vélo vs voiture ;
- charge UX.

Donc le vélo doit être séparé proprement.

---

# 3. RÈGLE ABSOLUE : NE PAS MÉLANGER RUN ET BIKE DANS LA COMPÉTITION DIRECTE

Un coureur et un cycliste ne doivent pas se battre dans le même classement brut ni sur la même logique de capture.

Pourquoi :

```txt
course = zones petites, précision, effort lent, proximité
vélo = zones longues, vitesse, distance, lignes, amplitude
```

Mélanger les deux créerait :

- sentiment d’injustice ;
- domination du vélo sur la surface ;
- dévalorisation du running ;
- confusion des règles ;
- mauvais équilibrage.

## Architecture recommandée

```txt
Compte utilisateur unique
Profil unique
Crew unique ou hybride
Mais couches de jeu séparées :
- Run World
- Bike World
```

Le joueur peut passer d’un monde à l’autre.

Le feed peut afficher les deux.

Les cartes de domination compétitive doivent rester séparées par défaut.

---

# 4. STRUCTURE DES MODES

## 4.1 Top-level mode switch

Ajouter un sélecteur global :

```txt
RUN
BIKE
```

ou :

```txt
COURSE
VÉLO
```

Mais il ne doit pas être envahissant.

Position recommandée :

- dans la barre supérieure de la carte ;
- sous forme de chip ;
- état actif très clair ;
- changement rapide ;
- accessible dans Feed, Map, Crew, Profile.

Exemple :

```txt
[ Course ▼ ]
```

Tap :

```txt
Course
Vélo
Tout voir
```

## 4.2 “Tout voir” interdit pour la compétition

Le mode `Tout voir` peut exister uniquement pour :

- feed social ;
- profil ;
- historique ;
- exploration non compétitive.

Pas pour :

- classement ;
- capture ;
- guerre ;
- ownership ;
- scoring.

---

# 5. BIKE GAMEPLAY

## 5.1 Captures vélo

Le vélo ne doit pas copier exactement le running.

Pour le vélo :

- distances minimales plus élevées ;
- tolérance GPS différente ;
- surfaces plus grandes ;
- vitesse plausible plus haute ;
- anti-triche renforcé ;
- préférence pour segments, corridors, boucles larges ;
- moins de micro-zones ;
- plus de secteurs.

## 5.2 Règles Bike MVP

MVP vélo simple :

```txt
Rouler
→ fermer une boucle large
→ capturer un secteur vélo
```

ou :

```txt
Rouler
→ relier des points / segments
→ prendre un corridor
```

Choisir après audit technique.

## 5.3 Ne pas lancer Bike avant stabilité Run

Si Bike met en danger le MVP, le cacher derrière feature flag.

Feature flags obligatoires :

```txt
FEATURE_BIKE_MODE
FEATURE_BIKE_LEADERBOARD
FEATURE_BIKE_CREWS
FEATURE_BIKE_CHALLENGES
FEATURE_BIKE_STORIES
```

## 5.4 Première expérience Bike

Ne pas demander au joueur au premier écran :

```txt
Comment bouges-tu ?
```

sauf si cela a une vraie utilité immédiate.

Option recommandée :

- onboarding générique territorial ;
- après authentification, choix léger :

```txt
Tu veux jouer comment ?

[Course]
[Vélo]
[Les deux]
```

Le choix reste modifiable.

Le joueur ne doit jamais être bloqué.

---

# 6. CREWS HYBRIDES

Un crew peut être :

```txt
Run
Bike
Hybrid
```

Mais l’affichage doit rester clair.

## Crew Run

- surfaces course ;
- missions course ;
- classements course.

## Crew Bike

- surfaces vélo ;
- missions vélo ;
- classements vélo.

## Crew Hybrid

Afficher deux colonnes :

```txt
Course
0,82 km²
#3 local

Vélo
14,6 km²
#5 local
```

Ne jamais additionner naïvement course + vélo.

Créer éventuellement un score composite, mais documenté.

---

# 7. CLASSEMENTS RUN / BIKE

Créer des classements séparés :

```txt
Run leaderboard
Bike leaderboard
Hybrid crew leaderboard
```

Chaque classement doit avoir ses propres métriques.

## Running

- zones capturées ;
- reprises ;
- défenses ;
- surface contrôlée ;
- régularité ;
- contribution crew.

## Bike

- secteurs capturés ;
- corridors ;
- distance stratégique ;
- boucles larges ;
- cols / segments si applicable ;
- contribution crew.

## Ne pas utiliser uniquement km²

Même en bike, la surface seule favorise trop les gros volumes.

---

# 8. ANTI-TRICHE BIKE

Le vélo est plus exposé au risque voiture/scooter.

Ajouter une stratégie spécifique :

```txt
vitesse moyenne
vitesse max
accélérations
arrêts
trajectoire route
cohérence GPS
capteurs
altitude
données montre / compteur
pattern voiture
pattern train
pattern scooter
```

Dans les compétitions ou guerres bike, envisager :

- vérification renforcée ;
- import Garmin / Wahoo / Apple Health ;
- exclusion automatique des anomalies ;
- flag manuel ;
- preuve d’appareil connecté si lots ou prix.

---

# 9. ÉTUDE DE MARCHÉ COULEUR ET DESIGN

## 9.1 Objectif

Ne pas choisir une esthétique “au goût”.

Créer une direction visuelle fondée sur :

- différenciation ;
- lisibilité ;
- mémorisation ;
- friction ;
- performance mobile ;
- viralité ;
- screenshots App Store ;
- TikTok ;
- stories ;
- accessibilité ;
- longévité de marque.

## 9.2 Marché à analyser

Auditer visuellement :

```txt
INTVL
Strava
Nike Run Club
Garmin Connect
Wahoo
Komoot
Zwift
Whoop
Apple Fitness
Adidas Running
AllTrails
Pokémon GO
Clash Royale
Clash of Clans
Duolingo
Rondesignlab
Mobbin top fitness apps
Dribbble / Behance 2026 mobile design
```

Pour chaque concurrent :

```txt
couleur principale
fond
typographie
densité
cartes
CTA
photos humaines
cartographie
gamification
social
paywall
friction
distinctivité
ce qu’on garde
ce qu’on refuse
```

Créer :

```txt
GRYD_MARKET_DESIGN_STUDY.md
```

---

# 10. COULEUR : GARDER LA CHARTREUSE MAIS LA MAÎTRISER

## 10.1 Règle

La chartreuse reste la couleur signature de GRYD.

Elle doit signifier :

```txt
action
énergie
capture
territoire à toi
victoire
progression
CTA
```

Mais elle ne doit pas saturer tout l’écran.

## 10.2 Problème

Si la chartreuse est partout, elle ne veut plus rien dire.

Elle devient du bruit.

## 10.3 Solution

Utiliser la chartreuse comme accent stratégique :

- CTA principal ;
- trace active ;
- territoire propre ;
- succès ;
- focus ;
- progression importante ;
- micro-glow.

Ne pas l’utiliser pour :

- tous les fonds ;
- toutes les cartes ;
- tous les textes ;
- tous les badges ;
- tous les contours ;
- toutes les icônes.

## 10.4 Palette recommandée à tester

Créer 3 directions.

### Direction A — Tactical Carbon

```txt
Brand accent: Chartreuse
Background: Deep Carbon
Surface: Graphite
Surface elevated: Soft black glass
Text: Off-white
Muted text: Warm gray
Danger/rival: Electric coral
Contest: Violet
Verified/protected: Electric blue
Prestige: pale gold
```

### Direction B — Premium Sport Editorial

```txt
Brand accent: Chartreuse
Background: Near black
Surface: translucent black
Photo overlays: black gradient
Text: white
Secondary: bone gray
Functional colors only when required
```

### Direction C — Clean RDL-inspired Light/Dark Hybrid

```txt
Brand accent: Chartreuse
Background alternates: black / warm off-white
Cards: glossy rounded panels
Text: black or white depending context
Motion: blurred gradients
Photos: editorial athlete shots
```

## 10.5 Validation

Tester chaque palette sur :

- onboarding ;
- carte ;
- live run ;
- résultat ;
- story ;
- crew ;
- feed ;
- profil ;
- paywall ;
- App Store screenshots ;
- TikTok ad frame.

Créer :

```txt
GRYD_COLOR_DECISION_MATRIX.md
```

Critères :

```txt
lisibilité
différenciation
premium
sport
jeu
émotion
accessibilité
dark mode
photo compatibility
map compatibility
story virality
```

---

# 11. ÉTUDE RONDESIGNLAB

## 11.1 Ce qu’il faut étudier

Étudier :

- site rondesignlab.com ;
- Instagram @rondesignlab ;
- Behance ;
- Dribbble ;
- cas clients ;
- pages services ;
- animations ;
- typographie ;
- mise en page ;
- composants ;
- effets de profondeur ;
- logique de présentation ;
- direction artistique ;
- usage des mockups ;
- usage des fonds ;
- usage des gradients ;
- usage des photos ;
- micro-interactions.

Créer :

```txt
RONDESIGNLAB_STYLE_AUDIT_FOR_GRYD.md
```

## 11.2 Ce qui ressort déjà de l’analyse

À partir de leur site et des captures Instagram :

- esthétique très premium ;
- compositing fort ;
- gros composants visuels ;
- écrans mis en scène comme objets désirables ;
- travail important de profondeur ;
- cartes translucides ;
- soft gradients ;
- glass / blur / glossy surfaces ;
- typographie massive ;
- mise en page éditoriale ;
- attention aux détails ;
- contraste entre éléments très purs et éléments très expressifs ;
- sensation “concept car” appliquée au digital ;
- forte importance du “look and feel” avant l’interface brute ;
- visuels conçus pour être partagés sur Instagram / Behance / Dribbble.

## 11.3 Ce qu’il faut reprendre

Reprendre les principes :

```txt
aesthetic effectiveness
visual hierarchy
premium composition
motion-supported UX
large elegant components
photographic emotion
deep contrast
strong object identity
minimal but memorable screens
```

## 11.4 Ce qu’il ne faut pas copier

Ne pas copier :

- assets ;
- logos ;
- layouts exacts ;
- cas clients ;
- visuels ;
- cartes bancaires ;
- formes propriétaires ;
- posts Instagram.

Adapter les principes à GRYD.

GRYD doit être original.

---

# 12. DIRECTION ARTISTIQUE GRYD 2026

## 12.1 Nouvelle phrase de direction

```txt
Premium tactical sports game.
Real-world conquest.
Human motion.
Carbon interface.
Chartreuse energy.
```

En français :

```txt
Un jeu sportif territorial premium.
Le monde réel comme terrain.
Une interface carbone.
La chartreuse comme énergie de conquête.
```

## 12.2 Univers

GRYD doit créer un univers, pas seulement une app.

Mots-clés :

```txt
territoire
trace
frontière
crew
attaque
défense
reprise
saison
rival
quartier
ville
conquête
```

Le design doit évoquer :

- carte tactique ;
- énergie sportive ;
- mouvement réel ;
- compétition locale ;
- statut ;
- précision ;
- modernité ;
- communauté.

## 12.3 Ce que GRYD ne doit pas devenir

Ne pas devenir :

- application SaaS générique ;
- Strava noir et vert ;
- INTVL bis ;
- jeu enfantin ;
- carte multicolore illisible ;
- dashboard fintech ;
- interface crypto ;
- app militaire anxiogène ;
- application de fitness froide.

---

# 13. HUMANISATION : PHOTOS DE COUREURS ET CYCLISTES

## 13.1 Pourquoi ajouter de l’humain

Les captures INTVL montrent que les photos humaines créent immédiatement :

- émotion ;
- projection ;
- sport réel ;
- aspiration ;
- preuve d’usage ;
- énergie ;
- contraste avec la carte abstraite.

GRYD doit ajouter l’humain sans perdre son identité territoriale.

## 13.2 Où utiliser les photos

Utiliser des photos dans :

- premier onboarding ;
- pages de crew ;
- stories ;
- feed ;
- profils ;
- écrans de succès ;
- pages événements ;
- App Store screenshots ;
- TikTok creatives.

Ne pas en mettre partout.

## 13.3 Onboarding recommandé

Écran 1 avec photo ou vidéo courte :

```txt
un runner / cycliste réel
fond urbain
overlay noir carbone
trace chartreuse qui apparaît
```

Texte :

```txt
FERME UNE BOUCLE.
PRENDS LA ZONE.
```

Pas de photo générique trop stock.

Photos voulues :

- vraies attitudes sportives ;
- urbain ;
- matin / nuit / golden hour ;
- pas trop fitness mannequin ;
- diversité ;
- solo et crew ;
- coureurs et cyclistes ;
- énergie réaliste ;
- expression humaine ;
- sensation locale.

## 13.4 Règles photo

- jamais de photo qui nuit à la lecture ;
- gradient sombre obligatoire derrière texte ;
- pas de visage coupé maladroitement ;
- pas d’arrière-plan trop chargé ;
- pas de cliché fitness ;
- pas d’image qui ressemble à une banque d’images gratuite ;
- pas de sexualisation ;
- pas de pose artificielle.

---

# 14. PHOTO DE PROFIL UTILISATEUR

## 14.1 Ajouter la fonctionnalité

Permettre :

- photo personnelle ;
- avatar par défaut ;
- prise de photo ;
- import galerie ;
- recadrage ;
- suppression ;
- changement ;
- signalement ;
- modération.

## 14.2 Ne pas créer de friction

Ne pas forcer la photo pendant l’onboarding.

Proposer après :

- création du profil ;
- première capture ;
- rejoindre un crew ;
- premier partage.

Exemple :

```txt
Ajoute une photo pour que ton crew te reconnaisse.
[AJOUTER]
[PLUS TARD]
```

## 14.3 Sécurité et modération

Prévoir :

- image safe check ;
- signalement ;
- suppression admin ;
- placeholder ;
- cache ;
- compression ;
- taille max ;
- fallback ;
- règles de contenu.

## 14.4 Rôle dans le jeu

La photo doit apparaître dans :

- profil ;
- crew members ;
- rival card ;
- feed ;
- leaderboard local ;
- stories si autorisé ;
- invitation.

Mais sur la carte, éviter les avatars partout.

---

# 15. RECOMMANDATION D’ARCHITECTURE VISUELLE

## 15.1 Navigation

Réduire à :

```txt
Carte
Crew
Profil
```

ou :

```txt
Play
Crew
Me
```

Mais si Bike est ajouté, ne pas ajouter un onglet `Bike`.

Le mode Bike est un filtre global, pas une nouvelle navigation principale.

## 15.2 Écran Carte

Le design doit être :

- immersif ;
- sombre ;
- tactique ;
- peu de chrome UI ;
- une action claire ;
- une mission visible ;
- bottom sheet propre ;
- map lisible ;
- pas de mosaïque multicolore.

## 15.3 Écran Profil

Le profil doit être statutaire.

Pas une page réglages.

Afficher :

```txt
rang
photo
nom
ville
crew
surface
rival
progression
prochaine mission
collections
historique
```

## 15.4 Écran Crew

Plus émotionnel.

Afficher :

```txt
photo/banner
blason
mission
rival
membres
territoire
guerre
recrutement
QR
```

## 15.5 Feed

Le feed doit être une chronique de guerre territoriale, pas un feed de jogging.

---

# 16. ÉPURATION DESIGN

## 16.1 Principes

Supprimer tout élément qui ne sert pas :

- compréhension ;
- action ;
- feedback ;
- émotion ;
- statut ;
- sécurité ;
- viralité.

## 16.2 Audit obligatoire

Pour chaque écran :

```txt
Compter :
- boutons
- icônes
- mots
- couleurs
- cartes
- niveaux de hiérarchie
- éléments animés
- états visibles
- CTA
```

Puis réduire.

Objectifs :

```txt
1 CTA principal
1 action secondaire maximum
3 informations principales maximum
aucun texte décoratif
aucune icône non expliquée
aucune couleur gratuite
aucun bloc sans rôle
```

## 16.3 Test de 1 seconde

Chaque écran doit passer le test :

```txt
en 1 seconde, je sais quoi faire
```

Sinon l’écran est raté.

---

# 17. INSPIRATION RONDESIGNLAB ADAPTÉE À GRYD

## 17.1 Composants visuels

Créer des composants premium :

```txt
GrydGlassCard
GrydActionPill
GrydTerritoryPanel
GrydMissionCard
GrydProfileOrb
GrydCrewBanner
GrydStoryPreview
GrydResultHero
```

## 17.2 Effets

Utiliser :

- blur subtil ;
- gradient radial ;
- reflets faibles ;
- ombres douces ;
- profondeur ;
- grain très discret ;
- cards flottantes ;
- transition de carte ;
- contours chartreuse très propres.

Ne pas utiliser :

- glow énorme ;
- néon cheap ;
- trop de 3D ;
- trop de glassmorphism illisible ;
- contours partout ;
- bruit visuel.

## 17.3 Typographie

Utiliser une typographie display forte pour les moments héro :

```txt
ZONE REPRISE
PRENDS LA VILLE
CREW EN TÊTE
```

Mais garder une typographie très lisible pour :

- stats ;
- corps ;
- boutons ;
- navigation ;
- formulaires ;
- petites tailles.

Ne pas utiliser une police décorative partout.

## 17.4 Motion

Motion premium :

```txt
trace draw
territory fill
panel rise
photo fade
rank tick
crew pulse
capture snap
story export
```

Motion toujours au service de l’action.

---

# 18. BIKE UI

## 18.1 Différenciation sans nouvelle couleur de marque

Bike ne doit pas avoir une couleur de marque différente.

Différencier par :

- icône ;
- pattern ;
- type de trace ;
- rythme d’animation ;
- terminologie ;
- métriques ;
- cartes ;
- badges.

Exemple :

```txt
Run trace = ligne vive, courte, nerveuse
Bike trace = ligne plus longue, flux, segments
```

## 18.2 Bike words

Français :

```txt
Rouler
Tracer
Relier
Prendre un secteur
Défendre un corridor
```

Anglais :

```txt
Ride
Trace
Connect
Claim a sector
Defend a corridor
```

Espagnol :

```txt
Rodar
Trazar
Conectar
Tomar un sector
Defender un corredor
```

## 18.3 Bike onboarding contextual

Si l’utilisateur choisit Bike :

```txt
ROULE.
FERME UNE BOUCLE.
PRENDS LE SECTEUR.
```

Mais ne pas créer un onboarding complet séparé si 80 % est identique.

---

# 19. NEUROMARKETING SPÉCIFIQUE À CETTE REFONTE

## 19.1 Le cerveau veut une action claire

Chaque écran doit déclencher une intention :

```txt
je comprends
je choisis
je pars
je reprends
je partage
je rejoins
```

Un écran qui ne déclenche aucune intention est un écran faible.

## 19.2 Identité avant données

Les gens retiennent :

```txt
ma zone
mon crew
mon rival
ma ville
mon rang
```

plus que :

```txt
1,60 km
13:10/km
0,06 km²
```

Donc mettre l’identité avant la donnée brute.

## 19.3 L’humain augmente la projection

Photos de coureurs/cyclistes dans l’onboarding :

- augmentent la projection ;
- rendent le produit moins abstrait ;
- créent un imaginaire ;
- facilitent les créas TikTok ;
- donnent une tonalité lifestyle.

Mais la carte reste la preuve.

## 19.4 La rareté doit être vraie

Utiliser :

```txt
Saison 0
Premier Crew
Lancement Paris
Lancement Bike
Premier badge Bike
```

Ne pas utiliser de faux compte à rebours agressif.

## 19.5 L’utilisateur doit sentir que le monde bouge

À chaque retour app :

```txt
Qu’est-ce qui a changé ?
Qui a pris quoi ?
Qui m’a dépassé ?
Quel crew attaque ?
Quelle zone peut tomber ?
```

C’est plus rétentif qu’un feed de statistiques.

---

# 20. MARKET-POSITIONING FINAL

GRYD doit se positionner ainsi :

```txt
Not a running tracker.
Not a cycling tracker.
Not a social feed.
Not a map toy.

A real-world territory game powered by running and cycling.
```

En français :

```txt
Pas un tracker.
Pas un simple réseau sportif.
Un jeu de territoire dans le monde réel.
```

---

# 21. LIVRABLES SUPPLÉMENTAIRES À PRODUIRE

Créer en plus des livrables précédents :

```txt
GRYD_BIKE_MODE_PRODUCT_SPEC.md
GRYD_RUN_BIKE_RULE_SEPARATION.md
GRYD_BIKE_ANTI_CHEAT_PLAN.md
GRYD_MARKET_DESIGN_STUDY.md
GRYD_COLOR_DECISION_MATRIX.md
RONDESIGNLAB_STYLE_AUDIT_FOR_GRYD.md
GRYD_2026_VISUAL_UNIVERSE.md
GRYD_HUMAN_PHOTO_DIRECTION.md
GRYD_PROFILE_PHOTO_SYSTEM.md
GRYD_RUN_BIKE_I18N_TERMS.md
GRYD_DESIGN_REFACTOR_ROADMAP.md
```

---

# 22. ORDRE D’EXÉCUTION OBLIGATOIRE

Ne pas coder immédiatement.

## Étape 1 — Audit

Auditer le produit actuel.

## Étape 2 — Étude marché

Comparer running, bike, apps sociales, jeux, design studios, Rondesignlab.

## Étape 3 — Direction artistique

Proposer 3 directions visuelles.

## Étape 4 — Décision palette

Garder chartreuse, choisir neutres et sémantique.

## Étape 5 — Architecture Run/Bike

Définir séparation exacte des règles.

## Étape 6 — Design system

Créer tokens, composants, motion, iconographie.

## Étape 7 — Refonte écran par écran

Appliquer LOOP.

## Étape 8 — i18n

Traduire fr/en/es, préparer autres langues.

## Étape 9 — Tests

Tests visuels, E2E, parcours, traductions, permissions, mode bike off/on.

## Étape 10 — Rapport final

Documenter décisions, risques, effets de bord, captures avant/après.

---

# 23. QUESTIONS OBLIGATOIRES AVANT CHAQUE DÉCISION

Pour chaque modification :

```txt
Est-ce que cela rend GRYD plus clair ?
Est-ce que cela rend GRYD plus désirable ?
Est-ce que cela crée une friction ?
Est-ce que cela aide la première capture ?
Est-ce que cela aide le retour utilisateur ?
Est-ce que cela garde le territoire au centre ?
Est-ce que cela fonctionne en Run ?
Est-ce que cela fonctionne en Bike ?
Est-ce que cela fonctionne en Crew ?
Est-ce que cela fonctionne en fr/en/es ?
Est-ce que cela crée un effet de bord ?
Est-ce que cela reste lisible à forte densité ?
Est-ce que cela respecte la chartreuse comme signature ?
Est-ce que cela ressemble trop à INTVL ?
Est-ce que cela copie trop Rondesignlab ?
Est-ce que cela peut être testé ?
```

---

# 24. DÉFINITION DE RÉUSSITE

La refonte est réussie si :

```txt
- GRYD a un univers propre ;
- la chartreuse est mémorisable ;
- l’app paraît premium et sportive ;
- l’humain est présent sans masquer le jeu ;
- Run et Bike coexistent sans confusion ;
- les cartes restent lisibles ;
- les pages sont plus courtes ;
- les CTA sont plus clairs ;
- le profil devient statutaire ;
- le crew devient vivant ;
- la première capture reste prioritaire ;
- les permissions arrivent au bon moment ;
- les photos de profil sont utiles mais non obligatoires ;
- les stories sont plus partageables ;
- les rivalités deviennent plus fortes ;
- les classements deviennent atteignables ;
- les composants sont homogènes ;
- l’i18n est complète ;
- la dette visuelle est réduite ;
- aucun changement ne casse une autre page.
```

---

# 25. PRINCIPE FINAL

GRYD doit être conçu comme :

```txt
un monde territorial vivant
où chaque sortie à pied ou à vélo
modifie quelque chose que le joueur veut montrer,
défendre ou reprendre.
```

Le design ne doit pas seulement être beau.

Il doit créer :

```txt
compréhension
désir
projection
action
possession
rivalité
retour
partage
```

La chartreuse est la signature.

Le monde réel est le plateau.

La ville est l’enjeu.

Le joueur est l’acteur.

Le crew est l’appartenance.

La trace est l’arme.

Le territoire est la récompense.


---

# RÈGLE FINALE D’EXÉCUTION

Claude Code doit commencer par un audit, pas par une déclaration de conformité.

Ordre imposé :

```txt
1. Lire la totalité de cette spécification.
2. Inventorier l’existant.
3. Construire la matrice de conformité.
4. Identifier les contradictions historiques.
5. Produire la matrice d’impact.
6. Proposer les arbitrages.
7. Ne modifier qu’après validation des dépendances.
8. Appliquer LOOP.
9. Tester chaque changement local et transversal.
10. Produire les preuves de conformité finales.
```

L’existence d’une fonctionnalité ne signifie rien tant que sa conformité exacte n’est pas démontrée.

La règle ultime est :

> Ne pas préserver l’existant. Préserver la cohérence, la simplicité, la qualité du gameplay et la vision actuelle de GRYD.
