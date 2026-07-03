# GRYD — Verify : Motion Intelligence, capteurs téléphone et anti-triche sportive

## Objectif du document

Ce document complète la stratégie anti-triche de GRYD.

Il décrit comment utiliser les capteurs du téléphone, de la montre et les données de mouvement pour déterminer si une activité ressemble réellement à une course à pied.

Principe central :

```txt
Le GPS dit où l’utilisateur est allé.
Le mouvement dit comment il s’est déplacé.
```

L’objectif n’est pas de bloquer les vrais coureurs, mais d’empêcher les activités en voiture, vélo, trottinette, transport public ou faux GPS de capturer du territoire.

Nom public : **GRYD**  
Baseline : **Cours. Capture. Défends.**  
Positionnement : **Le jeu de conquête de territoire pour run clubs.**

---

# 1. Principe général

Une trace GPS seule ne suffit pas.

Un tricheur peut :
- rouler en voiture lentement ;
- prendre un vélo ;
- utiliser une trottinette ;
- importer un fichier GPX ;
- simuler un faux GPS ;
- rejouer une ancienne trace ;
- prendre un bus ou un train ;
- faire porter son téléphone par quelqu’un d’autre.

GRYD doit donc croiser plusieurs signaux :

```txt
GPS
+ accélération
+ gyroscope
+ pas
+ cadence
+ activité système
+ source de l’activité
+ comportement historique
= score de confiance
```

Règle finale :

```txt
Aucune activité ne capture de territoire sans cohérence minimale entre GPS et mouvement.
```

---

# 2. GRYD Verify

Nom recommandé pour cette brique :

```txt
GRYD Verify
```

Rôle :

```txt
Valider qu’une activité est bien une course à pied avant d’autoriser les claims de territoire.
```

GRYD Verify ne décide pas seulement si l’activité existe.  
Il décide si elle peut :
- capturer des hexes ;
- voler un territoire ;
- défendre une zone ;
- marquer des points de classement ;
- contribuer à une offensive ;
- apparaître dans les classements.

---

# 3. Données à utiliser

## 3.1 Téléphone

Capteurs possibles :
- GPS ;
- accéléromètre ;
- gyroscope ;
- podomètre ;
- baromètre si disponible ;
- magnétomètre / orientation ;
- précision GPS ;
- vitesse instantanée ;
- accélération ;
- fréquence des points GPS.

Utilisation :
- détecter la course ;
- détecter les déplacements non pédestres ;
- identifier les segments suspects ;
- compenser certains bugs GPS ;
- calculer un score de mouvement.

---

## 3.2 Montre / HealthKit / Health Connect

Quand disponible :
- type d’activité déclaré ;
- pas ;
- cadence ;
- fréquence cardiaque ;
- calories ;
- route GPS ;
- source Apple Watch / montre ;
- durée ;
- distance ;
- éventuellement données d’effort.

Avantage :
- meilleure fiabilité ;
- données portées au poignet ;
- cadence plus cohérente ;
- meilleure détection de course ;
- source plus difficile à manipuler qu’un fichier manuel.

Attention :
- ces données nécessitent un consentement clair ;
- la fréquence cardiaque est une donnée sensible ;
- elle doit rester optionnelle ;
- elle ne doit jamais être le seul critère.

---

## 3.3 Activity Recognition / Core Motion

Sur Android :
- activité détectée : running, walking, cycling, in_vehicle, still, unknown.

Sur iOS :
- marche ;
- course ;
- automotive ;
- stationary ;
- activité de mouvement via Core Motion.

Utilisation :
- renforcer le score de confiance ;
- détecter vélo / véhicule ;
- confirmer une course ;
- segmenter une activité mixte.

---

# 4. Ce qu’on cherche à détecter

## 4.1 Course à pied probable

Signaux :
- oscillations verticales régulières ;
- impacts répétés ;
- cadence cohérente ;
- vitesse compatible avec la course ;
- accélérations humaines ;
- micro-variations naturelles ;
- pas cohérents avec la distance GPS ;
- mouvement du téléphone compatible avec poche/main/brassard ;
- éventuellement fréquence cardiaque cohérente.

Exemple :

```txt
GPS : 10 km/h
Cadence : 165 pas/min
Accéléromètre : impacts réguliers
Gyroscope : oscillation naturelle
Pas : cohérents avec distance
→ course fiable
```

---

## 4.2 Vélo probable

Signaux :
- vitesse plus élevée ;
- mouvement plus fluide ;
- moins d’impacts verticaux ;
- pas faibles ou absents ;
- cadence incohérente avec la distance ;
- accélérations plus continues ;
- virages plus larges ;
- téléphone très stable si fixé au guidon ;
- vitesse fréquente entre 15 et 30 km/h.

Exemple :

```txt
GPS : 22 km/h
Pas : faibles ou incohérents
Accéléromètre : mouvement fluide
Gyroscope : rotations larges
→ vélo probable
```

---

## 4.3 Voiture probable

Signaux :
- vitesse élevée ;
- pas absents ;
- accélérations/freinages impossibles pour un coureur ;
- arrêts et reprises typiques feux/stop ;
- trajectoire très routière ;
- vitesse incompatible avec cadence ;
- vibrations route/moteur ;
- passage sur routes rapides.

Exemple :

```txt
GPS : 35 km/h
Pas : 0
Accélérations : fortes
Trace : route départementale
→ voiture probable
```

---

## 4.4 Trottinette / scooter probable

Signaux :
- vitesse stable ;
- pas absents ;
- accélérations électriques ;
- arrêts courts ;
- reprises rapides ;
- mouvement plus fluide qu’une course ;
- trajectoire routière ou piste cyclable.

Traitement :
- segments exclus ;
- claims gelés si majorité suspecte ;
- récidive = revue.

---

## 4.5 Transport public

Signaux :
- vitesse élevée ;
- arrêts réguliers ;
- trajectoire très linéaire ;
- suit une ligne de transport ;
- tunnels ;
- sauts GPS ;
- pas absents ;
- stationnements périodiques.

Traitement :
- segments exclus ;
- aucun claim ;
- activité éventuellement conservée comme non compétitive.

---

## 4.6 Faux GPS / mock location

Signaux :
- coordonnées trop parfaites ;
- absence de bruit naturel ;
- vitesse constante ;
- points espacés artificiellement ;
- changements brutaux ;
- Android mock location ;
- émulateur ;
- appareil rooté / jailbreak ;
- horodatage incohérent ;
- incohérence GPS/mouvement.

Traitement :
- trust score très bas ;
- claims gelés ou rejetés ;
- restriction si récidive.

---

# 5. Signal central : cohérence vitesse / pas / distance

Le signal le plus important est la cohérence entre :
- distance GPS ;
- nombre de pas ;
- cadence ;
- vitesse ;
- mouvement vertical.

## 5.1 Cas fiable

```txt
Distance GPS : 5 km
Pas : 6 000
Cadence : 165 pas/min
Allure : 6:00/km
Mouvement vertical : régulier
→ cohérent
```

## 5.2 Cas suspect voiture

```txt
Distance GPS : 5 km
Pas : 200
Allure : 5:30/km
Mouvement vertical : absent
→ incohérent
```

## 5.3 Cas suspect vélo

```txt
Distance GPS : 12 km
Pas : 400
Vitesse : 18 km/h
Mouvement : très fluide
→ suspect
```

Règle :

```txt
La distance parcourue doit être cohérente avec le mouvement corporel détecté.
```

---

# 6. Run Likelihood

Chaque segment reçoit un score :

```txt
run_likelihood = 0 à 100
```

## Interprétation

| Score | Interprétation | Effet |
|---:|---|---|
| 85-100 | Course très probable | Claims OK |
| 70-84 | Course probable | Claims OK |
| 50-69 | Activité douteuse | Claims partiels |
| 30-49 | Vélo / transport possible | Claims gelés |
| 0-29 | Non-course probable | Claims rejetés |

---

# 7. Scores internes

GRYD Verify doit produire plusieurs scores.

## 7.1 GPS Trust

Mesure :
- précision GPS ;
- continuité ;
- vitesse ;
- accélération ;
- sauts ;
- cohérence du tracé ;
- fréquence des points.

## 7.2 Motion Trust

Mesure :
- pas ;
- cadence ;
- impacts ;
- gyroscope ;
- accélération verticale ;
- cohérence mouvement/vitesse ;
- activité détectée par le système.

## 7.3 Source Trust

Mesure :
- GPS live app ;
- Apple Watch ;
- HealthKit ;
- Health Connect ;
- Garmin officiel ;
- Strava officiel ;
- import manuel ;
- fichier inconnu.

## 7.4 Behavior Trust

Mesure :
- historique personnel ;
- volume quotidien ;
- répétition de traces ;
- claims par jour ;
- multi-comptes ;
- parrainages suspects ;
- changement de crew ;
- activité anormale.

---

# 8. Trust Score final

Formule conceptuelle :

```txt
trust_score =
GPS Trust
+ Motion Trust
+ Source Trust
+ Behavior Trust
```

Ou sous forme pénalisée :

```txt
trust_score = 100
- speed_penalty
- gps_penalty
- motion_penalty
- step_distance_penalty
- acceleration_penalty
- source_penalty
- device_integrity_penalty
- behavior_penalty
```

## Exemples

### Course propre

```txt
GPS Trust : 95
Motion Trust : 92
Source Trust : 90
Behavior Trust : 95
→ trust élevé
```

### Vélo

```txt
GPS Trust : 80
Motion Trust : 35
Source Trust : 70
Behavior Trust : 80
→ claims gelés ou partiels
```

### Voiture

```txt
GPS Trust : 60
Motion Trust : 10
Source Trust : 70
Behavior Trust : 70
→ claims rejetés
```

### GPS faible mais vraie course

```txt
GPS Trust : 45
Motion Trust : 90
Source Trust : 85
Behavior Trust : 90
→ segments partiellement validables
```

Point clé :

```txt
Les capteurs peuvent aussi sauver une vraie course avec GPS imparfait.
```

---

# 9. Décision selon le Trust Score

| Trust Score | Statut | Effet |
|---:|---|---|
| 85-100 | Valid | Stats, claims, points, classement OK |
| 70-84 | Valid prudent | Claims OK, segments douteux exclus |
| 50-69 | Partial | Stats OK, claims partiels, points réduits |
| 30-49 | Flagged | Stats OK, claims gelés, pas de classement |
| 0-29 | Rejected | Pas de claim, pas de points, pas de classement |

---

# 10. Validation par segments

Ne jamais juger seulement une course entière.

Découper en fenêtres :
- 5 secondes ;
- 10 secondes ;
- 30 secondes.

Pour chaque segment :
- vitesse ;
- accélération ;
- pas ;
- cadence ;
- gyroscope ;
- précision GPS ;
- activité système ;
- run likelihood.

Statuts possibles :

```txt
valid
excluded
suspicious
review
```

Exemple :
- 7 km propres ;
- 500 m en bus parce que l’utilisateur a oublié d’arrêter ;
- GRYD valide les 7 km et exclut les 500 m.

---

# 11. Règles MVP

Pas besoin d’IA complexe au départ.

## Règle 1 — Vitesse instantanée

```txt
vitesse instantanée > 25 km/h
→ segment exclu
```

## Règle 2 — Allure trop rapide

```txt
allure < 2:30/km sur un segment long
→ segment suspect ou exclu
```

## Règle 3 — Distance sans pas

```txt
distance significative sans pas détectés
→ motion_penalty
```

## Règle 4 — Cadence running probable

```txt
cadence running probable : environ 130-210 pas/min
```

À utiliser comme signal, pas comme règle absolue.

## Règle 5 — Accélération humaine

```txt
accélération/freinage impossible pour un coureur
→ segment suspect
```

## Règle 6 — Activité système

Si Android/iOS détecte véhicule ou vélo avec forte confiance :

```txt
→ motion_penalty important
```

## Règle 7 — Cohérence GPS / mouvement

```txt
GPS rapide + pas absents + mouvement fluide
→ vélo/voiture probable
```

---

# 12. Modèle V1 : classifier maison

Après collecte de données, entraîner un modèle simple.

## Classes

- running ;
- walking ;
- cycling ;
- vehicle ;
- public_transport ;
- stationary ;
- unknown.

## Features

- vitesse moyenne ;
- vitesse max ;
- variance vitesse ;
- accélération moyenne ;
- variance accélération ;
- fréquence dominante de pas ;
- cadence ;
- vertical oscillation proxy ;
- gyroscope variance ;
- stop/start pattern ;
- GPS accuracy ;
- step/GPS ratio ;
- source ;
- device placement estimate ;
- activité système ;
- historique personnel.

## Sortie

```txt
activity_class = running / cycling / vehicle / unknown
confidence = 0-100
```

Le MVP peut démarrer avec un moteur de règles.  
Le modèle maison vient après avoir collecté assez de données.

---

# 13. Placement du téléphone

Le téléphone peut être :
- dans la main ;
- dans une poche ;
- dans un brassard ;
- dans une ceinture ;
- dans un sac ;
- fixé sur un vélo ;
- posé en voiture.

Le placement influence fortement les capteurs.

## 13.1 Main

Signaux :
- rotations fréquentes ;
- oscillations de bras ;
- gyroscope actif ;
- mouvement variable.

## 13.2 Poche

Signaux :
- impacts forts ;
- cadence claire ;
- verticalité marquée.

## 13.3 Brassard

Signaux :
- rythme de bras ;
- gyroscope régulier ;
- oscillation latérale.

## 13.4 Sac

Signaux :
- mouvement amorti ;
- pas moins lisibles ;
- GPS OK ;
- motion trust plus faible.

## 13.5 Vélo guidon

Signaux :
- très stable ;
- vibrations fines ;
- virages réguliers ;
- pas absents.

## 13.6 Voiture

Signaux :
- posé/stable ;
- vibrations routières ;
- pas absents ;
- accélérations/freinages forts.

Règle :

```txt
Ne pas rejeter une course uniquement parce que le téléphone est dans un sac.
Dans ce cas, baisser le Motion Trust et regarder GPS + source montre.
```

---

# 14. Apple Watch / montre

Avec montre, la fiabilité augmente.

Signaux utiles :
- activité déclarée running ;
- cadence ;
- fréquence cardiaque ;
- calories ;
- route ;
- source HealthKit ;
- mouvement du poignet ;
- effort physiologique.

Exemple fiable :

```txt
Vitesse de course
+ cadence cohérente
+ fréquence cardiaque élevée
+ activité running
→ confiance forte
```

Exemple suspect :

```txt
Vitesse 25 km/h
+ activité vélo
+ pas de cadence running
→ claims rejetés
```

---

# 15. Fréquence cardiaque

La fréquence cardiaque peut aider, mais ne doit pas être obligatoire.

Pourquoi :
- tout le monde n’a pas de montre ;
- certaines personnes ont des FC atypiques ;
- données sensibles ;
- permissions plus délicates ;
- risque RGPD / santé.

Usage recommandé :
- bonus de confiance ;
- signal optionnel ;
- jamais seul critère ;
- jamais obligatoire pour capturer.

Règle :

```txt
FC cohérente + cadence cohérente + GPS cohérent
→ trust bonus
```

Ne jamais dire :

```txt
fréquence cardiaque basse = triche
```

---

# 16. Grille course vs vélo

| Signal | Course | Vélo |
|---|---|---|
| Pas | Forts / réguliers | Faibles / absents |
| Cadence | 130-210 spm typique | incohérente ou absente |
| Accélération verticale | régulière | faible |
| Vitesse | souvent 7-16 km/h | souvent 15-30 km/h |
| Variabilité | naturelle | plus fluide |
| Virages | petits ajustements | arcs plus larges |
| Arrêts/reprises | progressives | plus rapides |
| Téléphone guidon | improbable | possible |

---

# 17. Grille course vs voiture

| Signal | Course | Voiture |
|---|---|---|
| Pas | présents | absents |
| Vitesse | limitée | élevée |
| Accélération | humaine | forte |
| Freinage | progressif | marqué |
| Trace | rues/chemins | réseau routier |
| Arrêts | naturels | feux/stops réguliers |
| Vibration | foulée | moteur/route |
| GPS | parfois bruité | très routier |

---

# 18. UX anti-conflit

Ne pas accuser directement l’utilisateur.

## Si motion incohérent

```txt
Le mouvement détecté ne correspond pas assez à une course à pied.
Ton activité est enregistrée, mais certains segments ne capturent pas de territoire.
```

## Si GPS faible mais motion bon

```txt
GPS faible détecté.
Les segments avec mouvement de course fiable ont été conservés.
```

## Si vélo probable

```txt
Certains segments ressemblent à un déplacement non pédestre.
Ils ne comptent pas pour la conquête.
```

## Si voiture probable

```txt
La vitesse de certains segments dépasse les critères d’une course valide.
Ces segments ne capturent pas de territoire.
```

## Si course rejetée

```txt
Cette activité ne peut pas capturer de territoire.
Tu peux consulter tes stats, mais elle ne compte pas pour la carte.
```

---

# 19. Modèle de données recommandé

## 19.1 runs

```sql
runs(
  id,
  user_id,
  source,
  started_at,
  distance_m,
  duration_s,
  avg_pace_s_km,
  max_speed_kmh,
  gps_accuracy_avg,
  step_count,
  avg_cadence_spm,
  motion_trust,
  gps_trust,
  source_trust,
  behavior_trust,
  trust_score,
  run_likelihood,
  status, -- valid | partial | flagged | rejected
  reject_reason,
  fraud_flags,
  polyline_hash,
  points_awarded,
  claims_awarded,
  created_at
)
```

## 19.2 run_segments

```sql
run_segments(
  id,
  run_id,
  start_time,
  end_time,
  distance_m,
  avg_speed_kmh,
  max_speed_kmh,
  gps_accuracy_avg,
  step_count,
  cadence_spm,
  accel_variance,
  gyro_variance,
  run_likelihood,
  motion_trust,
  status, -- valid | excluded | suspicious | review
  reason
)
```

## 19.3 motion_samples

À stocker avec parcimonie ou agréger rapidement pour éviter trop de données sensibles.

```sql
motion_samples(
  id,
  run_id,
  segment_id,
  timestamp,
  accel_magnitude,
  gyro_magnitude,
  step_detected,
  activity_type,
  confidence
)
```

Recommandation :
- ne pas conserver toutes les données brutes longtemps ;
- agréger par segment ;
- supprimer ou anonymiser les données brutes ;
- conserver les scores et raisons de décision.

## 19.4 device_integrity

```sql
device_integrity(
  user_id,
  device_id,
  platform,
  app_attest_status,
  play_integrity_status,
  mock_location_detected,
  rooted_or_jailbroken,
  emulator_detected,
  last_checked_at
)
```

---

# 20. Algorithme simplifié d’ingestion

```txt
1. Recevoir la course.
2. Nettoyer les points GPS.
3. Découper en segments.
4. Calculer GPS Trust par segment.
5. Calculer Motion Trust par segment.
6. Lire activité système si disponible.
7. Vérifier cohérence distance / pas / cadence.
8. Calculer Run Likelihood.
9. Exclure les segments non pédestres.
10. Calculer Trust Score final.
11. Autoriser claims uniquement sur segments valides.
12. Geler ou rejeter si confiance insuffisante.
13. Générer résumé de course.
14. Expliquer clairement les segments exclus.
```

---

# 21. Priorité de build

## MVP

À faire dès le départ :
1. GPS speed rules.
2. Accéléromètre basique.
3. Podomètre / step count.
4. Cohérence distance / pas.
5. Segments exclus.
6. Trust score simple.
7. Status `valid / partial / flagged / rejected`.
8. Messages UX non accusatoires.
9. Dashboard admin des courses flaggées.
10. Pas de GPX manuel compétitif.

## V1

Ajouter :
1. Gyroscope.
2. Activity Recognition Android.
3. Core Motion activity iOS.
4. Cadence avancée.
5. Placement téléphone approximatif.
6. Source trust par device.
7. Détection vélo/voiture plus fine.
8. App Attest / Play Integrity.
9. Similarité avancée de traces.
10. Réduction automatique sur farming.

## V2

Ajouter :
1. Modèle ML maison.
2. Données montre avancées.
3. Fréquence cardiaque optionnelle.
4. Classification multi-sport.
5. Certificat “GRYD Verified”.
6. Anti-cheat temps réel pendant raids.
7. Graphe de fraude multi-comptes.
8. Système d’appel utilisateur.
9. Score de confiance par appareil.
10. Dotations réelles uniquement après durcissement.

---

# 22. Ce que GRYD Verify doit éviter

Ne pas :
- bannir automatiquement sur un seul signal ;
- exiger une montre ;
- exiger la fréquence cardiaque ;
- rejeter toutes les courses avec GPS imparfait ;
- accuser frontalement ;
- rendre le système opaque ;
- pénaliser les téléphones dans un sac ;
- confondre très bon coureur et vélo sans autres signaux ;
- stocker indéfiniment les données motion brutes ;
- rendre le jeu injouable par excès de sécurité.

---

# 23. Résumé final

La règle centrale :

```txt
Une activité peut avoir une trace GPS parfaite et être refusée si le mouvement ne ressemble pas à une course.
```

Et inversement :

```txt
Une vraie course avec GPS imparfait peut être sauvée si le mouvement ressemble clairement à une course.
```

Formule finale :

```txt
GPS = où l’utilisateur est allé.
Motion = comment il s’est déplacé.
Trust Score = est-ce que cette activité peut capturer du territoire ?
```

Phrase produit interne :

```txt
Toute activité peut être enregistrée.
Seules les courses fiables peuvent conquérir.
```

GRYD Verify doit devenir une brique centrale du produit, surtout avant :
- raids live ;
- classements sérieux ;
- dotations ;
- partenariats ;
- événements sponsorisés ;
- expansion publique.
