# GRYD — Page Performance : statistiques running, progression sportive et lien avec la conquête

## Objectif du document

Ce document complète les documents produit/gameplay de GRYD.

Il définit la page **Performance** de l’application : une page dédiée aux statistiques running, à la progression sportive, aux records personnels et au lien entre performance physique et conquête territoriale.

Principe central :

```txt
GRYD est un jeu de territoire,
mais chaque joueur doit sentir qu’il progresse aussi comme coureur.
```

Nom public : **GRYD**  
Baseline : **Cours. Capture. Défends.**  
Positionnement : **Le jeu de conquête de territoire pour run clubs.**

---

# 1. Pourquoi créer une page Performance

GRYD ne doit pas être seulement un jeu de carte.

Un joueur doit pouvoir répondre à ces questions :

- Est-ce que je cours plus ?
- Est-ce que je cours mieux ?
- Est-ce que je suis plus régulier ?
- Est-ce que mon allure s’améliore ?
- Est-ce que ma forme progresse ?
- Est-ce que mes courses servent autant au jeu qu’à ma performance ?
- Est-ce que je deviens un meilleur coureur grâce à GRYD ?

La page Performance sert donc à montrer :

```txt
progression sportive
+ régularité
+ records
+ charge de course
+ lien avec la conquête
```

Elle doit satisfaire les vrais runners sans transformer GRYD en Strava bis.

---

# 2. Position dans l’application

La page Performance ne doit pas être un onglet principal au MVP.

Navigation principale recommandée :

```txt
Carte · Crew · Classement · Boutique · Profil
```

Accès à la page Performance depuis :

```txt
Profil → Performance
```

Et après chaque course :

```txt
Résumé de course → Voir performance
```

Accès secondaire possible :
- carte “Performance de la semaine” sur la home ;
- détail d’une course ;
- badge record ;
- notification de progression ;
- profil public.

Pourquoi ne pas en faire un onglet principal :
- la carte reste le cœur du produit ;
- GRYD doit rester un jeu de conquête ;
- trop d’onglets diluent la boucle principale ;
- la performance est une couche secondaire, mais importante.

---

# 3. Objectif UX de la page

La page doit être :
- claire ;
- motivante ;
- non culpabilisante ;
- orientée progression ;
- lisible rapidement ;
- utile aux débutants comme aux runners confirmés.

Elle ne doit pas :
- ressembler à un tableur ;
- afficher trop de graphes ;
- créer une pression santé ;
- donner des diagnostics médicaux ;
- rendre la fréquence cardiaque obligatoire ;
- faire passer le chrono avant la conquête.

Phrase produit interne :

```txt
Plus fort physiquement.
Plus dangereux sur la carte.
```

---

# 4. Header de la page

## Titre

```txt
Performance
```

## Sous-titre

Exemples :

```txt
Semaine 28 · Saison Fondateurs
```

Ou :

```txt
Ta progression running cette saison
```

## Phrase d’accompagnement

Option sobre :

```txt
Tu progresses mieux quand tu cours régulièrement.
```

Option plus GRYD :

```txt
Plus fort physiquement. Plus dangereux sur la carte.
```

---

# 5. Score principal : Score Forme GRYD

Créer un score central, affiché comme gros chiffre.

Exemple :

```txt
82
Score Forme
```

Ce score ne doit pas être médical.  
Il s’agit d’un indicateur interne de progression running.

Il ne doit jamais être présenté comme :
- diagnostic santé ;
- score de forme médicale ;
- récupération clinique ;
- aptitude physique réelle certifiée.

Il doit être présenté comme :

```txt
Un indicateur GRYD de régularité, volume et progression.
```

---

# 6. Calcul du Score Forme GRYD

Formule recommandée :

```txt
Score Forme GRYD =
régularité 30 %
+ volume hebdomadaire 25 %
+ progression personnelle 20 %
+ qualité d’allure 15 %
+ fiabilité des données 10 %
```

## Exemple

| Composant | Score |
|---|---:|
| Régularité | 91 |
| Volume | 74 |
| Progression | 86 |
| Allure | 78 |
| Fiabilité | 96 |

Score final :

```txt
82 / 100
```

Règle importante :

```txt
Le joueur doit être comparé à lui-même avant d’être comparé aux autres.
```

Cela évite de démotiver les débutants ou les coureurs plus lents.

---

# 7. Composants du Score Forme

## 7.1 Régularité — 30 %

Mesure :
- nombre de courses par semaine ;
- streak ;
- fréquence ;
- régularité sur 7/30 jours ;
- respect des objectifs personnels.

Exemples :
- 1 course/semaine = faible ;
- 2 courses/semaine = base GRYD ;
- 3-4 courses/semaine = très bon ;
- régularité sur plusieurs semaines = bonus.

---

## 7.2 Volume hebdomadaire — 25 %

Mesure :
- distance hebdomadaire ;
- temps total de course ;
- progression vs semaine précédente ;
- volume saison.

Exemple :

```txt
24,8 km cette semaine
+18 % vs semaine dernière
```

Attention :
- ne pas survaloriser l’ultra-volume ;
- éviter que les très gros coureurs écrasent tout ;
- plafonner le bonus volume.

---

## 7.3 Progression personnelle — 20 %

Mesure :
- amélioration de l’allure ;
- augmentation progressive de distance ;
- meilleure régularité ;
- retour après pause ;
- comparaison avec les 30 derniers jours.

Exemple :

```txt
Allure moyenne : -12 sec/km vs mois dernier
```

---

## 7.4 Qualité d’allure — 15 %

Mesure :
- allure stable ;
- effort cohérent ;
- segments réguliers ;
- absence d’accélérations suspectes ;
- progression personnelle.

Ce composant peut aussi servir à renforcer l’anti-triche, mais il ne doit pas être punitif pour les coureurs irréguliers.

---

## 7.5 Fiabilité des données — 10 %

Mesure :
- GPS propre ;
- motion trust ;
- source fiable ;
- Apple Watch / HealthKit / GPS live ;
- faible proportion de segments exclus ;
- cohérence distance/pas/cadence.

Cette partie relie la page Performance à GRYD Verify.

Exemple :

```txt
Fiabilité : 96 %
Données GPS et mouvement cohérentes.
```

---

# 8. Cartes principales

Sous le Score Forme, afficher 4 cartes simples.

## Carte 1 — Volume

```txt
24,8 km
cette semaine
+18 % vs semaine dernière
```

## Carte 2 — Régularité

```txt
4 courses
série : 3 semaines
```

## Carte 3 — Allure

```txt
5:42 / km
allure moyenne
-12 sec/km vs mois dernier
```

## Carte 4 — Effort

```txt
7,8 / 10
effort moyen
```

Si fréquence cardiaque autorisée :

```txt
Effort basé sur allure + fréquence cardiaque
```

Si pas de montre :

```txt
Effort estimé par allure + durée + régularité
```

---

# 9. Graphiques à afficher

## 9.1 Distance hebdomadaire

Vue simple par jour :

```txt
Lun · Mar · Mer · Jeu · Ven · Sam · Dim
```

Objectifs :
- voir la semaine ;
- pousser la régularité ;
- montrer les jours actifs ;
- rappeler la streak.

---

## 9.2 Allure moyenne

Évolution sur :
- 7 jours ;
- 30 jours ;
- saison.

Objectif :
- montrer la progression sportive réelle.

---

## 9.3 Charge GRYD

Nom recommandé :

```txt
Charge GRYD
```

Cette charge mesure :
- durée ;
- distance ;
- intensité ;
- fréquence ;
- effort estimé.

Affichage :

```txt
Charge faible
Charge équilibrée
Charge élevée
```

Formulation prudente :
- ne pas faire de diagnostic médical ;
- ne pas dire “tu es en surmenage” au MVP ;
- rester sur un indicateur sportif interne.

---

## 9.4 Répartition des courses

Catégories possibles :
- conquête ;
- défense ;
- exploration ;
- attaque ;
- récupération ;
- longue sortie ;
- performance.

Exemple :

```txt
Cette semaine :
40 % conquête
30 % défense
20 % exploration
10 % performance
```

Intérêt :
- relier performance et stratégie ;
- montrer le style du joueur ;
- donner une identité de jeu.

---

# 10. Records personnels

Section :

```txt
Records
```

À afficher :

## Records sportifs

- meilleur 1 km ;
- meilleur 5 km ;
- meilleur 10 km ;
- plus longue sortie ;
- meilleure allure moyenne ;
- meilleur mois ;
- plus grosse semaine ;
- plus longue série.

## Records GRYD

- plus grosse conquête ;
- plus gros nombre d’hexes en une course ;
- plus gros nombre d’hexes volés ;
- plus grosse défense ;
- meilleure offensive ;
- meilleur score course ;
- plus longue route ouverte ;
- plus gros apport crew.

Exemple :

```txt
Meilleur 5 km : 27:42
Plus longue sortie : 18,6 km
Plus grosse conquête : +214 hexes
Meilleure attaque : 87 hexes volés
```

Règle :

```txt
Mélanger sport et jeu.
```

Cela rend la page Performance propre à GRYD, pas générique.

---

# 11. Historique des courses

Créer une liste simple :

Chaque course affiche :
- date ;
- distance ;
- durée ;
- allure ;
- score forme ;
- hexes capturés ;
- type de course ;
- trust status ;
- contribution crew.

Exemple :

```txt
Mercredi 18:42
5,8 km · 34:10 · 5:53/km
+72 hexes · +640 pts · Défense
```

Filtre possible :
- toutes ;
- conquête ;
- défense ;
- exploration ;
- performance ;
- records ;
- partiellement validées.

---

# 12. Détail d’une course

Depuis une course précise, ouvrir une page détail.

## 12.1 Données sportives

Afficher :
- distance ;
- durée ;
- allure moyenne ;
- allure par km ;
- cadence si disponible ;
- fréquence cardiaque si autorisée ;
- dénivelé si fiable ;
- calories si source fiable ;
- score d’effort ;
- fiabilité GPS/motion.

## 12.2 Données GRYD

Afficher :
- hexes capturés ;
- hexes volés ;
- hexes défendus ;
- points ;
- Foulées ;
- zones traversées ;
- contribution crew ;
- bonus performance appliqué ;
- segments exclus si anti-triche.

Exemple :

```txt
Performance bonus : +7 %
Raison : allure stable + progression personnelle + données fiables
```

## 12.3 Segments exclus

Si segments exclus :

```txt
320 m exclus
Raison : vitesse incompatible avec une course valide
```

Formulation non accusatoire.

---

# 13. Performance et scoring territoire

Oui, la performance doit jouer dans GRYD.

Mais elle doit rester plafonnée.

Règle :

```txt
Bonus performance maximum : +15 %
```

Ce bonus peut venir de :
- allure cohérente ;
- effort personnel ;
- progression vs historique ;
- régularité ;
- distance utile ;
- données fiables.

La performance ne doit jamais écraser :
- stratégie ;
- régularité ;
- crew ;
- territoire ;
- densité de zone ;
- décisions tactiques.

Phrase produit :

```txt
La performance améliore ta conquête.
Elle ne remplace pas la stratégie.
```

---

# 14. Exemple de bonus performance

Course de base :

```txt
Score territoire brut : 800 pts
Bonus performance : +7 %
Score final : 856 pts
```

Explication affichée :

```txt
+7 % performance
Allure stable · effort personnel en progression · données fiables
```

Si mauvais signal motion/GPS :

```txt
Bonus performance : 0 %
Raison : données insuffisantes pour appliquer un bonus
```

Ne pas punir deux fois :
- si la course est valide mais sans données avancées, elle peut avoir 0 bonus ;
- ne pas réduire brutalement sauf suspicion réelle.

---

# 15. Classements performance

Il faut des classements performance, mais séparés du classement territoire.

## 15.1 Classement performance dans le crew

À créer en premier.

Catégories :
- plus grande progression ;
- plus gros volume semaine ;
- meilleure régularité ;
- meilleur 5 km ;
- plus longue sortie ;
- plus gros effort ;
- meilleur Score Forme ;
- meilleure progression de streak.

Pourquoi commencer par le crew :
- moins intimidant ;
- plus social ;
- plus motivant ;
- moins brutal pour débutants.

## 15.2 Classement performance ville

À ajouter avec prudence.

Catégories :
- top progression ;
- top streak ;
- top volume ;
- top 5 km ;
- top exploration ;
- meilleur retour après pause.

Éviter de mettre uniquement :
- “les plus rapides” ;
- “les plus gros volumes”.

Sinon les débutants décrochent.

---

# 16. Badges performance

Exemples :

## Badges débutants

- Première course ;
- Premier 3 km ;
- Premier 5 km ;
- 2 courses dans la semaine ;
- Série de 2 semaines.

## Badges progression

- Allure améliorée ;
- Distance améliorée ;
- Meilleure semaine ;
- Retour après pause ;
- Régularité 4 semaines.

## Badges volume

- 25 km saison ;
- 50 km saison ;
- 100 km saison ;
- 500 km total ;
- 1 000 km total.

## Badges hybrides GRYD

- 1 000 hexes en une semaine ;
- 100 hexes volés ;
- 500 hexes défendus ;
- 5 km + 100 hexes ;
- Long run stratégique ;
- Meilleure défense.

Ces badges nourrissent :
- le profil ;
- le partage social ;
- la progression permanente ;
- le statut.

---

# 17. Partage performance

Après une bonne course, proposer :

```txt
Partager ma performance
```

## Templates possibles

### Record 5 km

```txt
NOUVEAU RECORD
5 km · 27:42
+96 hexes capturés
GRYD
```

### Meilleure semaine

```txt
MEILLEURE SEMAINE
24,8 km
+412 hexes
GRYD
```

### Score Forme

```txt
SCORE FORME
82 / 100
3 semaines de régularité
GRYD
```

### Conquête + performance

```txt
10 KM VALIDÉS
+214 hexes
Crew République avance
GRYD
```

Format :
- 9:16 ;
- fond noir ;
- carte chartreuse ;
- gros chiffre ;
- QR/deep link ;
- branding GRYD.

---

# 18. Données avancées avec montre

Si Apple Watch / HealthKit ou autre montre connectée :

Afficher :
- cadence ;
- fréquence cardiaque moyenne ;
- zones d’effort ;
- temps en effort élevé ;
- récupération estimée simple ;
- régularité cardio ;
- calories si source fiable.

Formulation prudente :

```txt
Indicateur d’effort
```

Éviter :

```txt
diagnostic de santé
```

La montre améliore :
- Score Forme ;
- GRYD Verify ;
- bonus performance ;
- analyse de course.

Mais elle ne doit jamais être obligatoire.

---

# 19. Relation avec GRYD Verify

La page Performance doit afficher la fiabilité des données sans humilier l’utilisateur.

Exemples :

## Données fiables

```txt
GRYD Verified
GPS et mouvement cohérents.
```

## Données partielles

```txt
Données partielles
Certains segments n’ont pas été utilisés pour la carte.
```

## Données rejetées

```txt
Non compté pour la conquête
Cette activité ne correspond pas aux critères d’une course valide.
```

Ne pas afficher publiquement :
- “tricheur” ;
- “fraude” ;
- score de suspicion humiliant.

---

# 20. Page Performance — Structure complète

## 20.1 Header

- Performance ;
- semaine/saison ;
- Score Forme.

## 20.2 Cartes rapides

- distance semaine ;
- courses semaine ;
- allure moyenne ;
- streak ;
- effort moyen.

## 20.3 Graphiques

- distance hebdo ;
- allure ;
- Charge GRYD ;
- répartition des courses.

## 20.4 Records

- records sportifs ;
- records GRYD.

## 20.5 Historique

- liste de courses ;
- filtres.

## 20.6 Détail course

- sport ;
- territoire ;
- bonus performance ;
- segments exclus ;
- partage.

## 20.7 Classement crew

- progression ;
- régularité ;
- volume ;
- records.

## 20.8 Badges

- progression ;
- volume ;
- hybride sport/jeu.

---

# 21. États vides

## Aucun run

```txt
Ta première performance commence avec ta première course.
```

CTA :

```txt
Courir
```

## Pas assez de données

```txt
Encore 2 courses pour calculer ton Score Forme.
```

CTA :

```txt
Lancer une course
```

## Pas de montre

```txt
Connecte une montre pour enrichir tes statistiques.
```

CTA secondaire :

```txt
Continuer sans montre
```

## GPS faible

```txt
Certaines données GPS étaient faibles.
GRYD a conservé les segments fiables.
```

## Progression négative

Ne pas dire :

```txt
Tu régresses.
```

Dire :

```txt
Semaine plus légère.
Garde ta série avec une sortie simple.
```

---

# 22. Moments de monétisation liés à Performance

Attention : ne pas vendre de bonus pay-to-win.

## GRYD Club

Fonctionnalités premium possibles :
- historique 12 mois ;
- stats avancées ;
- heatmap performance/territoire ;
- comparaisons saison ;
- templates premium de partage ;
- analyse détaillée des courses ;
- exports posters performance.

## GRYD Pass

Récompenses liées :
- badges ;
- skins ;
- titres ;
- cartes de partage ;
- objectifs performance.

## Interdits

Ne pas vendre :
- bonus de vitesse ;
- points de performance classement ;
- correction de course suspecte ;
- validation payante d’une activité ;
- augmentation directe du score territoire.

---

# 23. Analytics à tracker

Événements :
- `performance_page_viewed`
- `score_forme_viewed`
- `performance_card_clicked`
- `run_detail_viewed`
- `record_viewed`
- `record_shared`
- `performance_share_generated`
- `performance_share_completed`
- `watch_connect_clicked`
- `health_permission_granted`
- `health_permission_denied`
- `performance_bonus_applied`
- `performance_bonus_explained`
- `segments_excluded_viewed`
- `club_paywall_from_performance`

Métriques :
- taux de consultation Performance ;
- taux de partage record ;
- impact sur rétention D7/D30 ;
- connexion montre ;
- corrélation Score Forme / fréquence de course ;
- conversion Club depuis stats avancées.

---

# 24. Modèle de données recommandé

## 24.1 performance_snapshots

```sql
performance_snapshots(
  id,
  user_id,
  period_type, -- week | month | season
  period_start,
  period_end,
  score_forme,
  regularity_score,
  volume_score,
  progression_score,
  pace_quality_score,
  data_reliability_score,
  distance_m,
  run_count,
  avg_pace_s_km,
  streak_weeks,
  effort_score,
  created_at
)
```

## 24.2 personal_records

```sql
personal_records(
  id,
  user_id,
  record_type,
  value,
  unit,
  run_id,
  achieved_at,
  season_id
)
```

`record_type` possible :
- `best_1k`
- `best_5k`
- `best_10k`
- `longest_run`
- `biggest_hex_capture`
- `biggest_attack`
- `biggest_defense`
- `best_week_distance`
- `longest_streak`

## 24.3 performance_badges

```sql
performance_badges(
  id,
  user_id,
  badge_key,
  earned_at,
  run_id,
  season_id
)
```

## 24.4 run_performance_metrics

```sql
run_performance_metrics(
  run_id,
  user_id,
  distance_m,
  duration_s,
  avg_pace_s_km,
  best_split_s_km,
  avg_cadence_spm,
  avg_hr,
  effort_score,
  performance_bonus_pct,
  performance_bonus_reason,
  data_reliability_score,
  created_at
)
```

---

# 25. Priorisation MVP / V1 / V2

## MVP

À faire en premier :
1. Page Performance accessible depuis Profil.
2. Score Forme GRYD simple.
3. Distance semaine.
4. Nombre de courses semaine.
5. Allure moyenne.
6. Streak.
7. Records personnels simples.
8. Historique des courses.
9. Détail course sport + territoire.
10. Bonus performance appliqué.
11. Partage record/performance.
12. États vides propres.

## V1

Ajouter :
1. Graphiques 30 jours.
2. Charge GRYD.
3. Cadence.
4. HealthKit avancé.
5. Classement performance crew.
6. Badges performance.
7. Zones d’effort.
8. Comparaison mois/saison.
9. Conseils simples.
10. Détection progression personnelle.
11. Stats avancées Club.

## V2

Ajouter :
1. Score récupération léger.
2. Fatigue / charge chronique.
3. Objectifs personnalisés.
4. Plans de progression simples.
5. Comparaison avec profils similaires.
6. Certificat GRYD Verified.
7. Analyse de forme plus poussée.
8. Détection risque surmenage, très prudemment.
9. Intégration Garmin/Coros/Polar.
10. Coaching optionnel.

Ne pas mettre le coaching au MVP.  
C’est trop éloigné de la boucle cœur.

---

# 26. Erreurs à éviter

1. Transformer GRYD en Strava.
2. Mettre Performance en onglet principal dès le MVP.
3. Afficher trop de graphiques.
4. Culpabiliser les débutants.
5. Faire des diagnostics santé.
6. Rendre la fréquence cardiaque obligatoire.
7. Donner trop d’impact au chrono dans le classement territoire.
8. Créer un classement global brutal des plus rapides.
9. Vendre des bonus de performance pay-to-win.
10. Masquer l’explication du bonus performance.
11. Punir les utilisateurs sans montre.
12. Mélanger classement territoire et classement performance.
13. Ne montrer que l’allure au lieu de montrer la progression.
14. Oublier les records GRYD.
15. Faire une page générique qui pourrait être dans n’importe quelle app running.

---

# 27. Résumé final

Oui, GRYD doit avoir une vraie page Performance.

Elle doit répondre à deux besoins :

```txt
Je veux voir que je deviens meilleur coureur.
Je veux voir que ma performance sert ma conquête.
```

Mais la hiérarchie produit reste :

```txt
Carte = jeu principal
Crew = social
Classement = compétition
Performance = progression personnelle
Profil = statut
```

Le bon équilibre :

```txt
GRYD ne doit pas être une app de running avec un jeu autour.
GRYD doit être un jeu de territoire qui te rend meilleur coureur.
```

Phrase finale :

```txt
Ta forme progresse.
Ton territoire aussi.
```
