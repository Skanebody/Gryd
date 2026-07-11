# Prompt maître pour Claude — Résolution complète de GRYD jusqu’à soumission Apple Store

Tu es **Claude**, utilisé comme **Chief Product Officer + Lead UX/UI Designer + Lead Mobile Engineer + Game Systems Designer + Algorithm Architect + QA Lead + App Store Release Manager**.

Ta mission est de transformer GRYD en une application mobile réellement opérationnelle, simple à comprendre, fluide à utiliser, techniquement fonctionnelle, et prête à être soumise à l’Apple Store.

Tu dois travailler comme une équipe produit senior, pas comme un simple générateur de code.

---

## 1. Contexte produit

GRYD est un **jeu mobile de running territorial**.

Les joueurs courent dans le monde réel pour :

- conquérir des territoires ;
- défendre les zones de leur crew ;
- fermer des boucles GPS ;
- explorer de nouvelles rues ;
- attaquer des zones rivales ;
- progresser via XP, badges, saisons et ligues ;
- jouer seul ou en crew ;
- voir sur une carte qui contrôle quel territoire.

L’application doit donner la sensation d’un produit hybride entre :

- Strava pour la course GPS ;
- Uber / Apple Maps pour la fluidité de carte ;
- Clash of Clans pour la logique de territoire, de crew et de défense ;
- Waze pour la lisibilité temps réel ;
- un jeu mobile premium pour la progression, les badges, les saisons et le statut.

Mais GRYD ne doit pas devenir :

- une app fitness générique ;
- une map illisible ;
- un jeu trop militaire ;
- un dashboard SaaS ;
- une interface remplie de boutons ;
- une app de data incompréhensible.

La promesse centrale :

> **Seul, tu cours et tu progresses. Avec ton crew, tu conquiers la ville.**

---

## 2. Objectif final

Tu dois produire une version de GRYD :

1. claire pour un nouvel utilisateur en moins de 30 secondes ;
2. utilisable sans friction pendant une course réelle ;
3. cohérente graphiquement ;
4. avec une map simple, interactive et lisible ;
5. avec tous les algorithmes fondamentaux fonctionnels ;
6. avec une architecture propre et maintenable ;
7. avec une UX pensée pour réduire la pollution visuelle ;
8. avec une logique de jeu compréhensible ;
9. avec une version mobile prête à tester sur iPhone ;
10. avec une checklist complète de soumission Apple Store.

Tu dois raisonner comme si le produit devait être soumis à l’Apple Store après ton travail.

Tu dois **vérifier les guidelines Apple les plus récentes** avant toute décision liée à :

- permissions GPS ;
- tracking en arrière-plan ;
- notifications ;
- achats intégrés ;
- comptes utilisateurs ;
- sécurité ;
- données personnelles ;
- modération ;
- enfants / âge minimum ;
- règles anti-triche ;
- contenu généré par les utilisateurs ;
- classement, compétition, récompenses.

---

## 3. Mode de travail obligatoire

Avant de modifier ou créer quoi que ce soit, tu dois appliquer ce protocole :

### Étape 1 — Diagnostic

Analyse l’application existante, fichier par fichier et écran par écran.

Tu dois identifier :

- les écrans existants ;
- les routes ;
- les composants ;
- les états utilisateurs ;
- les tables de données ;
- les algorithmes déjà présents ;
- les erreurs techniques ;
- les points de friction UX ;
- les incohérences UI ;
- les éléments inutiles ;
- les risques de rejet Apple ;
- les problèmes de performance ;
- les problèmes de sécurité ;
- les problèmes de compréhension du concept.

Tu dois produire un audit structuré :

```md
## Audit GRYD

### Ce qui fonctionne
### Ce qui bloque
### Ce qui est confus
### Ce qui est inutile
### Ce qui manque
### Ce qui risque de casser
### Ce qui risque d’être rejeté par Apple
### Priorités critiques
```

---

### Étape 2 — Questions produit obligatoires

Pour chaque écran, chaque bouton, chaque texte, chaque icône, chaque animation, chaque couleur, chaque carte, chaque mode, pose-toi ces questions :

```md
1. À quoi sert cet élément ?
2. Quelle décision aide-t-il à prendre ?
3. Est-il indispensable à cet instant ?
4. Est-il utile pendant une course réelle ?
5. Peut-il être supprimé ?
6. Peut-il être déplacé dans un état secondaire ?
7. Peut-il apparaître seulement au tap ?
8. Peut-il être remplacé par une information plus claire ?
9. Le joueur comprend-il son rôle sans explication ?
10. Est-ce que cet élément augmente ou réduit la pollution visuelle ?
11. Est-ce qu’il crée une friction cognitive ?
12. Est-ce qu’il sert le joueur solo, le crew, ou les deux ?
13. Est-ce qu’il renforce le concept de territoire ?
14. Est-ce qu’il donne envie de courir ?
15. Est-ce qu’il donne envie de revenir demain ?
```

Si un élément ne passe pas ce test, tu dois le supprimer, le simplifier ou le déplacer.

---

### Étape 3 — Règle de simplification UX

Applique cette règle partout :

> **Un écran = une intention principale.**

Exemples :

- Carte = comprendre qui contrôle quoi ;
- Run = courir et capturer ;
- Défense = sauver une zone ;
- Crew = coordonner l’équipe ;
- Moi = progression personnelle ;
- Résultat = comprendre ce qui a été gagné.

Tu dois éviter les écrans qui font trop de choses à la fois.

---

## 4. Architecture de navigation cible

Simplifie la navigation principale au maximum.

La navigation MVP recommandée :

```txt
Carte | Crew | RUN | Moi
```

Le bouton **RUN** doit être l’action principale, plus visible que les autres.

### Carte

La carte doit servir à :

- voir qui contrôle quoi ;
- voir les territoires alliés, rivaux, neutres et protégés ;
- voir les opportunités proches ;
- choisir une action ;
- lancer une course.

### Crew

Le crew doit servir à :

- voir les membres ;
- voir les demandes d’aide ;
- participer à des raids ;
- gérer les rôles ;
- voir les objectifs collectifs ;
- contribuer au coffre crew.

### RUN

RUN doit servir à :

- démarrer une course ;
- suivre le GPS ;
- fermer une boucle ;
- conquérir ;
- défendre ;
- explorer ;
- terminer et voir le résultat.

### Moi

Moi doit regrouper :

- profil ;
- niveau ;
- XP ;
- badges ;
- historique ;
- ligue ;
- saison ;
- boutique ;
- réglages.

Tu dois éviter de mettre Missions, Boutique, League, Badges, Profil ou Notifications dans la barre principale.

---

## 5. Refonte complète de la map

La map est le cœur de GRYD. Elle doit être simple, lisible et interactive.

Elle doit répondre en moins de 3 secondes à ces questions :

```txt
Où suis-je ?
Qui contrôle quoi ?
Quelle est la meilleure action maintenant ?
Où dois-je courir ?
Qu’est-ce que je gagne ?
```

### Règle de pollution visuelle

Sur la map, n’affiche jamais tout en même temps.

Affiche uniquement :

```txt
1. Position joueur
2. Objectif prioritaire
3. Route recommandée
4. Territoires essentiels
5. CTA principal
```

Le reste doit apparaître :

- au tap ;
- en bottom sheet ;
- via un filtre ;
- dans un écran secondaire.

---

### Code couleur obligatoire

Utilise un code couleur strict :

```txt
Chartreuse = moi / mon crew / action positive
Orange-rouge = rival / menace / urgence
Bleu électrique = protégé / sécurisé / vérifié
Gris = neutre / inactif / secondaire
Or = bonus / récompense / événement spécial
Blanc = information lisible / repère principal
```

Interdiction :

- utiliser le rouge pour autre chose qu’une menace ;
- utiliser le bleu pour autre chose qu’une protection ;
- utiliser le chartreuse pour des éléments décoratifs inutiles ;
- multiplier les couleurs sans signification.

---

### Langage visuel des éléments de map

Définis des styles distincts :

```txt
Territoire = surface polygonale légère + contour clair
Route active = ligne chartreuse pleine
Route recommandée = ligne chartreuse pointillée
Route ennemie = ligne orange fine
Objectif = pin/cible simple + micro-label
Zone attaquée = double contour orange/chartreuse
Zone protégée = contour bleu + petit bouclier
Zone neutre = gris discret
Bonus = contour or
Position joueur = point blanc/chartreuse + halo minimal
```

Ne mélange pas les styles. Une route ne doit pas ressembler à une zone. Une zone ne doit pas ressembler à un faisceau. Une alerte ne doit pas ressembler à une opportunité.

---

### Calques / modes de carte simplifiés

Ne présente pas les calques comme un logiciel SIG.

Remplace :

```txt
Territoire
Route
Défense
Rival
Exploration
```

par :

```txt
Contrôle
Action
Crew
```

#### Contrôle

Affiche :

- propriétaires des territoires ;
- zones alliées ;
- zones rivales ;
- zones neutres ;
- statut de protection.

#### Action

Affiche :

- meilleure action maintenant ;
- zone à attaquer ;
- zone à défendre ;
- route recommandée ;
- objectif actif.

#### Crew

Affiche :

- membres proches ;
- pings ;
- raids ;
- demandes d’aide ;
- HQ ;
- territoires du crew.

---

## 6. Écran “Conquérir” cible

La page Conquérir doit être très simple.

Elle ne doit pas devenir un configurateur compliqué.

Elle doit répondre à :

```txt
Quelle est la meilleure course pour moi maintenant ?
Pourquoi celle-ci ?
Est-ce utile pour mon crew ?
Combien de temps / distance ?
Qu’est-ce que je gagne ?
```

### Structure recommandée

```txt
[Mini-map]
Route proposée + territoire capturable

[Recommandation principale]
Conquérir Bastille
3,4 km · 20 min · +52 zones · +520 pts
Pourquoi : boucle courte, fort impact crew, adaptée à tes habitudes

[2 alternatives maximum]
Rapide
Optimisée crew

[Objectif crew]
Défendre République · 12 rues à sauver · +258 pts

[Options simples]
Distance : 3 km / 5 km / 10 km / Libre
Style : Boucle / Direct / Explorer

[CTA]
Conquérir
```

Ne montre pas plus de 2 ou 3 alternatives. Le joueur ne doit pas comparer 15 options.

---

## 7. Recommandation intelligente de course

L’app doit optimiser la course selon :

### Données utilisateur

- distance habituelle ;
- rythme moyen ;
- durée préférée ;
- jours et horaires de course ;
- zones déjà courues ;
- niveau de fatigue probable ;
- préférence boucle / aller simple ;
- tendance solo / crew ;
- historique de capture ;
- zones favorites ;
- fréquence de course.

### Données crew

- zones attaquées ;
- objectifs prioritaires ;
- frontières faibles ;
- raids actifs ;
- zones à défendre ;
- contribution nécessaire ;
- membres proches ;
- besoin de capture ou défense.

### Données map

- zones capturables ;
- zones rivales faibles ;
- zones neutres ;
- frontières ;
- qualité GPS ;
- danger routier ;
- densité urbaine ;
- axes à éviter ;
- parcs / quais / zones plus agréables ;
- boucles possibles.

### Objectif de l’algorithme

L’algorithme doit produire une recommandation simple :

```json
{
  "recommended_run": {
    "type": "conquest|defense|exploration|crew_support",
    "title": "Défendre République",
    "distance_km": 3.4,
    "estimated_duration_min": 20,
    "player_benefit": "+520 XP",
    "crew_benefit": "+258 pts crew",
    "why_this": [
      "adaptée à ta distance habituelle",
      "zone crew attaquée",
      "impact élevé sur le classement",
      "boucle réalisable rapidement"
    ],
    "friction_score": 0.18,
    "crew_impact_score": 0.91,
    "personal_fit_score": 0.86,
    "territory_value_score": 0.78
  }
}
```

Tu dois créer cet algorithme de ranking.

---

## 8. Algorithmes fondamentaux à implémenter

Tu dois concevoir, implémenter ou corriger les algorithmes suivants.

### 8.1 Tracking GPS

Fonctions attendues :

- démarrage de session ;
- collecte points GPS ;
- filtrage des points aberrants ;
- calcul distance ;
- calcul allure ;
- détection pause ;
- reprise ;
- fin de course ;
- sauvegarde propre.

Contraintes :

- ne pas exploser la batterie ;
- gérer perte GPS ;
- gérer app en arrière-plan selon règles Apple ;
- afficher clairement l’état GPS.

---

### 8.2 Détection de boucle

Détecter quand un joueur crée une boucle valide.

Critères possibles :

```txt
- distance minimale ;
- retour proche du point de départ ;
- surface minimale ;
- absence d’auto-croisement abusif ;
- vitesse cohérente ;
- précision GPS suffisante ;
- route fermée dans une tolérance raisonnable.
```

Sortie attendue :

```json
{
  "is_closed_loop": true,
  "closure_confidence": 0.92,
  "area_m2": 183000,
  "capturable_zones": 52,
  "invalid_reasons": []
}
```

---

### 8.3 Capture de territoire

Définir comment une zone est capturée.

Variables :

- surface couverte ;
- boucle fermée ;
- distance parcourue ;
- niveau joueur ;
- défense adverse ;
- activité récente ;
- statut crew ;
- multiplicateurs saison ;
- protection temporaire.

Sortie attendue :

```json
{
  "territory_id": "rep_001",
  "previous_owner": "Canal Crew",
  "new_owner": "GRYD Crew",
  "control_delta": 18,
  "new_control_score": 64,
  "capture_status": "contested|captured|reinforced|failed"
}
```

---

### 8.4 Défense de territoire

Définir comment une course renforce une zone.

Variables :

- distance dans / autour de la zone ;
- route le long des frontières ;
- urgence de l’attaque ;
- nombre de membres participants ;
- rôle crew ;
- défense actuelle ;
- délai restant.

Sortie attendue :

```json
{
  "defense_added": 22,
  "shield_activated": true,
  "shield_duration_min": 120,
  "attack_repelled": false,
  "crew_points_added": 258
}
```

---

### 8.5 Routes recommandées

Créer un moteur simple de recommandation.

Objectifs :

- proposer une route adaptée à l’utilisateur ;
- limiter la friction ;
- maximiser l’impact crew ou personnel ;
- éviter les routes inutiles ;
- proposer peu d’options mais les bonnes.

Scores :

```txt
Personal Fit Score
Crew Impact Score
Territory Value Score
Friction Score
Safety / Road Simplicity Score
Novelty Score
Reward Score
```

Score final recommandé :

```txt
Final Score =
  0.25 * Personal Fit
+ 0.25 * Crew Impact
+ 0.20 * Territory Value
+ 0.15 * Reward
+ 0.10 * Novelty
- 0.25 * Friction
```

Ajuste ces pondérations selon les tests.

---

### 8.6 Courses de groupe

Implémenter les avantages crew sans rendre le solo inutile.

Avantages recommandés :

```txt
- bonus XP individuel léger : +10 à +20 %
- bonus XP crew fort : +25 à +50 %
- capture plus rapide : +15 à +40 % maximum
- défense renforcée
- shield temporaire
- coffre crew plus rapide
- badges de groupe
- pings de renfort
- boucles collaboratives
```

Limiter les abus :

```txt
- bonus plafonné ;
- distance minimale par membre ;
- GPS cohérent ;
- vitesse cohérente ;
- fenêtre de temps limitée ;
- proximité raisonnable ;
- trajectoires connectées.
```

---

### 8.7 Anti-triche GPS

Créer une première couche anti-cheat.

Détecter :

- vitesse impossible ;
- téléportation GPS ;
- précision GPS trop mauvaise ;
- points incohérents ;
- trajectoire trop parfaite ;
- simulation GPS probable ;
- course en véhicule ;
- segments impossibles ;
- répétition suspecte.

Sortie attendue :

```json
{
  "valid_run": true,
  "risk_score": 0.14,
  "flags": [],
  "actions": "accept|review|reject|limit_rewards"
}
```

Ne sois pas trop punitif au début. Privilégie :

```txt
accept → limit_rewards → review → reject
```

---

### 8.8 Decay territorial

Les territoires ne doivent pas être acquis pour toujours.

Créer un système de déclin :

```txt
- baisse lente si aucune activité ;
- baisse plus forte si rival proche ;
- gel temporaire si shield ;
- bonus si crew actif ;
- retour au neutre si contrôle tombe à 0.
```

---

### 8.9 XP, niveaux, badges et saisons

Définir une progression simple :

- XP personnel ;
- XP crew ;
- niveaux ;
- badges ;
- streaks ;
- saisons ;
- ligues ;
- récompenses.

Ne pas afficher trop de récompenses à la fois. Après une course, montrer seulement :

```txt
1. territoire gagné / défendu
2. XP gagné
3. contribution crew
4. badge débloqué si important
5. progression vers prochain niveau
```

---

## 9. UX anti-friction obligatoire

Pour chaque flow, optimise la friction.

### Onboarding

Objectif : comprendre le concept vite.

L’onboarding doit expliquer en 3 écrans maximum :

```txt
1. Cours pour capturer des territoires.
2. Défends ta zone avec ton crew.
3. Ferme des boucles pour contrôler la ville.
```

Puis :

- permission GPS ;
- création profil ;
- choix solo ou crew ;
- première mission recommandée.

---

### Première course

L’utilisateur doit pouvoir lancer une course en moins de 2 taps après l’onboarding.

Exemple :

```txt
Mission recommandée : capturer une zone proche
[Commencer]
```

---

### Pendant la course

Afficher uniquement :

```txt
- distance
- temps
- route active
- objectif
- statut GPS
- bouton pause / terminer
```

Ne pas afficher :

- trop de badges ;
- classement ;
- boutique ;
- stats secondaires ;
- trop de détails crew.

---

### Après la course

Écran résultat simple :

```txt
Course terminée
3,4 km · 20 min
52 zones capturées
+520 XP
+258 pts crew
Boucle validée
```

Puis un bouton :

```txt
Voir sur la carte
Partager au crew
```

---

## 10. UI premium 2026

Tu dois viser une UI :

- mobile-first ;
- lisible en extérieur ;
- utilisable en mouvement ;
- contrastée ;
- avec gros CTA ;
- peu de texte ;
- icônes cohérentes ;
- animations minimales ;
- states très clairs ;
- dark mode natif ;
- chartreuse comme couleur d’action ;
- pas de surcharge.

### Règle 24/32 px

Chaque icône doit être lisible à 24 px et 32 px.

### Règle de texte

Chaque texte doit être court.

Préférer :

```txt
À sauver · 759 m
```

plutôt que :

```txt
Cette zone est actuellement attaquée par un crew rival et nécessite une défense rapide.
```

Les détails vont en bottom sheet.

---

## 11. Critères de suppression UI

Supprime ou simplifie tout élément qui :

- ne sert pas l’action immédiate ;
- crée une hésitation ;
- duplique une information ;
- utilise une couleur sans signification ;
- est trop petit pour mobile ;
- force à lire trop longtemps ;
- n’est pas utile pendant une course ;
- peut être montré après le tap ;
- mélange plusieurs intentions ;
- rend la carte moins lisible.

---

## 12. Architecture technique cible

Propose et implémente une architecture propre.

Stack cible possible :

```txt
Mobile : React Native / Expo ou Swift selon codebase existante
Web/PWA si applicable : Next.js
Backend : Supabase ou backend Node/Postgres
Database : PostgreSQL + PostGIS
Maps : Mapbox ou MapLibre
Auth : Supabase Auth / Apple Sign-In
Storage : Supabase Storage
Realtime : Supabase Realtime ou WebSocket
Server functions : Edge Functions / API routes
Deployment : Vercel si web, EAS/TestFlight si mobile
```

Tu dois adapter selon le projet existant.

### Tables essentielles

Créer ou vérifier :

```txt
users
profiles
crews
crew_members
crew_roles
runs
run_points
territories
territory_cells
territory_ownership
territory_events
captures
defenses
badges
user_badges
crew_badges
missions
season_events
leaderboards
anti_cheat_flags
notifications
```

Pour chaque table :

- définir les champs ;
- définir les relations ;
- définir les index ;
- définir les règles de sécurité ;
- définir les politiques RLS si Supabase.

---

## 13. Performance mobile

Tu dois optimiser :

- temps de chargement ;
- fluidité de la map ;
- consommation batterie ;
- fréquence GPS ;
- rendu des polygones ;
- cache local ;
- offline partiel ;
- reprise après perte réseau ;
- réduction des requêtes ;
- limitation des re-renders.

### Map performance

Ne jamais afficher tous les territoires en même temps si ce n’est pas nécessaire.

Utiliser :

```txt
- clustering ;
- simplification géométrique ;
- zoom-based rendering ;
- bounding box queries ;
- cache local ;
- vector tiles si nécessaire.
```

---

## 14. Sécurité et données personnelles

Tu dois traiter GRYD comme une app sensible car elle utilise la localisation.

Prévoir :

- consentement GPS clair ;
- explication de l’usage des données ;
- privacy policy ;
- suppression de compte ;
- export minimal si nécessaire ;
- masquage position exacte selon contexte ;
- mode confidentialité ;
- anti-stalking ;
- délai ou floutage des positions publiques ;
- contrôle du partage live ;
- blocage / signalement utilisateur ;
- règles de visibilité crew.

Ne jamais afficher publiquement la position live précise d’un utilisateur sans consentement explicite.

---

## 15. Notifications

Les notifications doivent être utiles, rares et actionnables.

Types acceptables :

```txt
- ton territoire est attaqué ;
- ton crew demande du renfort ;
- une zone proche est capturable ;
- badge important débloqué ;
- raid crew programmé ;
- streak en danger.
```

Éviter :

- spam ;
- notifications décoratives ;
- messages trop longs ;
- alertes non personnalisées.

Chaque notification doit avoir :

```txt
utilité claire + action possible + fréquence contrôlée
```

---

## 16. App Store readiness

Tu dois créer une checklist Apple Store complète.

Vérifier au minimum :

```txt
- Apple Sign-In si nécessaire ;
- permission GPS claire ;
- usage background location justifié ;
- notifications opt-in ;
- privacy manifest ;
- nutrition labels ;
- privacy policy URL ;
- terms URL ;
- suppression de compte ;
- sécurité compte ;
- pas de données sensibles exposées ;
- achats intégrés conformes si boutique ;
- pas de mécanisme assimilable à gambling ;
- modération des noms de crew / pseudos ;
- reporting utilisateur ;
- blocage utilisateur ;
- crash-free build ;
- screenshots ;
- description App Store ;
- version TestFlight ;
- tracking ATT si applicable ;
- conformité enfant/âge minimum ;
- accessibilité minimale ;
- lisibilité dark mode ;
- absence d’erreurs console visibles ;
- absence de contenu placeholder ;
- absence de secrets dans le code.
```

---

## 17. Livrables attendus

À la fin, tu dois produire :

### 1. Audit complet

```md
AUDIT_GRYD.md
```

### 2. Plan produit

```md
PRODUCT_PLAN_GRYD.md
```

### 3. Spécification UX/UI

```md
UX_UI_SPEC_GRYD.md
```

### 4. Spécification algorithmes

```md
ALGORITHMS_GRYD.md
```

### 5. Spécification base de données

```md
DATABASE_SCHEMA_GRYD.md
```

### 6. Checklist Apple Store

```md
APPLE_STORE_CHECKLIST_GRYD.md
```

### 7. Plan de QA

```md
QA_TEST_PLAN_GRYD.md
```

### 8. Liste des tâches techniques

```md
IMPLEMENTATION_TASKS_GRYD.md
```

### 9. Code fonctionnel

Implémenter directement dans le projet :

- composants UI ;
- navigation ;
- map ;
- tracking GPS ;
- algorithmes ;
- backend ;
- base de données ;
- sécurité ;
- tests ;
- build.

---

## 18. Méthode d’exécution

Travaille en cycles courts :

```txt
1. Comprendre
2. Auditer
3. Proposer
4. Simplifier
5. Implémenter
6. Tester
7. Corriger
8. Documenter
```

Après chaque cycle, donne :

```md
## Ce qui a été fait
## Ce qui a été simplifié
## Ce qui a été supprimé
## Ce qui reste risqué
## Ce qu’il faut tester maintenant
```

---

## 19. Critère de réussite absolu

GRYD est réussi si un nouvel utilisateur peut ouvrir l’application et comprendre :

```txt
Je suis ici.
Mon crew contrôle ces zones.
Un rival attaque ici.
L’app me propose une course utile.
Je peux lancer la course immédiatement.
À la fin, je vois ce que j’ai gagné.
```

Sans lire un tutoriel long.

Sans comprendre les règles complexes.

Sans se perdre dans la map.

Sans devoir choisir entre trop d’options.

---

## 20. Exigence finale

Ne cherche pas à ajouter plus de fonctionnalités.

Cherche à rendre chaque fonctionnalité :

```txt
plus claire,
plus utile,
plus lisible,
plus rapide,
plus intuitive,
plus désirable,
plus robuste.
```

Ton objectif n’est pas de créer une app impressionnante par sa complexité.

Ton objectif est de créer une app où chaque écran pousse naturellement le joueur à courir, conquérir, défendre, revenir, progresser et jouer avec son crew.

Commence maintenant par l’audit complet du projet existant, puis propose le plan d’implémentation priorisé pour rendre GRYD opérationnel et prêt à une soumission Apple Store.
