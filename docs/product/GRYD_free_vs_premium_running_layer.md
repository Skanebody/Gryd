# GRYD — Couche running : gratuit vs premium (matrice inspirée Strava)

## Objectif

GRYD **ne doit pas devenir une app d’entraînement payante classique**. On reprend la logique Strava (tracking, communauté, routes, analyse), puis on la découpe en trois catégories :

```txt
1. Obligatoire et gratuit
2. Premium plus tard
3. Inutile ou dangereux pour GRYD
```

**Règle centrale :**

```txt
Le jeu territorial reste gratuit.
L’entraînement avancé, la personnalisation et l’analyse peuvent devenir premium.
```

**Formule produit :**

```txt
GRYD Free = le jeu complet.
GRYD Premium = l’expérience augmentée (analyser, planifier, personnaliser, partager mieux, organiser le crew).
```

Références externes (matrice Strava subscription) : [Strava Subscribe](https://www.strava.com/subscribe), [Strava Help — Subscription features](https://support.strava.com/en-us/articles/15402044-strava-subscription-features).

Documents GRYD liés : `GRYD_gameplay_crews_monetisation_contribution_personnalisation.md`, `GRYD_page_performance_stats_running.md`, `GRYD_safety_privacy_rgpd.md`, `GRYD_prompt_monetisation_supercell.md`.

---

# 1. Est-ce qu’on en a besoin ?

**Oui, mais pas tout au MVP.**

Les blocs Strava → GRYD :

| Bloc Strava | Besoin GRYD MVP | Quand |
|-------------|-----------------|-------|
| Tracking | **Obligatoire** | MVP |
| Communauté (crew-first) | **Obligatoire** | MVP |
| Navigation / routes | **Simple** | MVP ; avancé V1.5 |
| Analyse sportive avancée | **Différé** | V1.5–V2 |

**Danger à éviter :**

```txt
GRYD = Strava + Clash + Waze + jeu territorial
```

**MVP produit :**

```txt
Je cours.
Je capture.
Je défends.
Je partage.
Je progresse avec mon crew.
```

---

# 2. Matrice Strava → GRYD

| Fonction (lecture Strava) | Besoin GRYD ? | Gratuit / Premium | Pourquoi |
|---------------------------|--------------:|-------------------|----------|
| Enregistrer activités | Oui | **Gratuit** | Cœur du produit |
| Communauté | Oui | **Gratuit** | Densité locale, crews |
| Sécurité | Oui | **Gratuit** (socle) | Trust, App Store, responsabilité |
| Itinéraires suggérés | Oui, simple | Gratuit MVP / avancé premium | Mission = 1 reco principale |
| Itinéraires hors ligne | Plus tard | Premium V2 | Coût + valeur claire |
| Tracer ses routes | Oui V1.5 | Free basique / premium avancé | Utile crews, pas d’avantage capture |
| Historique entraînement | Oui | Gratuit basique | Confiance |
| Stats avancées | Plus tard | Premium | Bonne valeur abo |
| Objectifs | Oui | Free simple / premium avancé | Rétention |
| Classements segments | Oui, adapté | **Core gratuit** / filtres premium | Le classement = le jeu |
| Challenges amis | Oui | Gratuit crew / premium custom | Viral |
| Mesure effort (HR…) | Plus tard | Premium V2 | Wearables |
| Score condition physique | Plus tard | Premium V2 | Produit sport avancé |

---

# 3. Catégorie 1 — Obligatoire et gratuit

## 3.1 Enregistrement de course

Si l’enregistrement est payant ou artificiellement limité, GRYD meurt.

**Gratuit illimité :**

```txt
démarrer une course · GPS · distance · temps · allure · trace
zones gagnées · zones défendues · GRYD Verify
historique basique · partage simple
```

**Mantra technique :** `Never lose a run.`

Services cibles : `ActivityRecordingService`, `GPSRecorder`, `MotionValidator`, `RunStorage`, `SyncQueue`, `GRYDVerifyEngine`, `PostRunResultEngine`.

Exigences MVP :
- sauvegarde locale pendant la course ;
- reprise après crash ;
- sync différée ;
- état « run sauvegardé » ;
- export GPX plus tard (non bloquant MVP).

## 3.2 Communauté (crew-first)

**Gratuit :**

```txt
rejoindre / créer un crew simple · membres · crew log
demander défense / finisher · encourager · classement crew · inviter
```

**Premium plus tard (cosmétique / orga, jamais gameplay) :** bannières crew, blasons premium, thèmes HQ, analytics crew avancées, templates recrutement.

**Interdit :**

```txt
payer pour être utile au crew
payer pour compter dans le score
payer pour défendre plus fort
```

## 3.3 Sécurité

**Ne jamais mettre le socle sécurité en premium** (mauvais pour l’image et la responsabilité).

**Gratuit MVP :**

```txt
partage position live (1–3 contacts)
masquage départ/arrivée · mode privé · pause urgence
alerte GPS faible · arrêt course sécurisé · signalement zone dangereuse
```

**Premium plus tard :** plus de contacts, historique sécurité, alertes avancées, route safety score.

Alignement : `GRYD_safety_privacy_rgpd.md`.

## 3.4 Classements (cœur du jeu)

**Gratuit — jamais derrière un paywall :**

```txt
top ville · classement crew · classement saison · classement secteur · rang personnel
```

**Premium :** filtres avancés, comparaison amis/crew, historique classement, progression vers #N, analyse rivalité.

**Garde-fou :**

```txt
Voir son rang = gratuit.
Analyser comment progresser = premium.
```

## 3.5 Challenges

**Gratuit :** challenges officiels, hebdo crew, raid weekend, défendre N zones, fermer boucles, km collectif crew.

**Premium :** challenge personnalisé, privé, sponsorisé, badge custom, template story custom.

---

# 4. Catégorie 2 — Premium plus tard

## 4.1 Routes suggérées

**Free MVP :** une mission recommandée simple (ex. « Défendre République · 4,4 km · 3 zones · [DÉFENDRE] »).

**Premium V1.5+ :** Route Builder avancé, reroll, cibles distance/durée, types conquête/défense/exploration, contraintes sécurité, score opportunité territoire, export montre.

Moteurs : `RouteRecommendationEngine`, `MissionRouteGenerator`, `RouteBuilder`, `RouteRerollService`, `TerritoryOpportunityScorer`.

**Garde-fou :** `Premium aide à planifier. Premium ne garantit jamais la capture.`

## 4.2 Routes hors ligne — V2

Premium : carte offline secteur, mission offline, re-sync post-run.

## 4.3 Tracer ses routes — V1.5

| Niveau | Quota / capacités |
|--------|-------------------|
| Free | 3 routes sauvegardées, basique, partage crew |
| Premium | illimité, builder tactique, estimation zones, export GPX |

## 4.4 Historique — deux niveaux

| Free | Premium |
|------|---------|
| liste, distance, temps, allure, zones, trace, Verify | filtres avancés, tendances, heatmap perso, export CSV/GPX |

## 4.5 Stats avancées — premium

GRYD = performance sportive **+** impact territorial.

Exemple premium : `Efficacité GRYD · 42 zones/km · +18 % vs semaine dernière`.

## 4.6 Objectifs

| Free | Premium |
|------|---------|
| distance hebdo, nb runs, zones défendues, objectif crew simple | défense/conquête/streak/crew avancés, rappels intelligents |

## 4.7 Effort & Fitness score — V2

Free : effort ressenti manuel si besoin.

Premium : relative effort, zones cardio, charge, fatigue ( **jamais conseil médical** ).

`GRYD Form Score` = indicateur d’entraînement, pas diagnostic.

---

# 5. Catégorie 3 — Inutile ou dangereux

**Ne pas faire :**

```txt
bloquer les classements de base
bloquer les crews
bloquer la sécurité
bloquer l’enregistrement
bloquer le gameplay territorial
copier Strava comme produit principal
vendre la victoire / les hexes / les points classement
paywall brutal sur les données de base (« PAYE POUR VOIR TES DONNÉES »)
```

---

# 6. Roadmap produit

## MVP gratuit obligatoire

```txt
1. Enregistrement course (+ Never lose a run)
2. GPS fiable · GRYD Verify · post-run
3. Zones capturées / défendues
4. Historique basique
5. Communauté crew · crew log
6. Missions recommandées simples
7. Classements ville / crew / saison
8. Challenges crew officiels
9. Partage story basique
10. Sécurité basique · confidentialité / masquage
```

## Monétisation MVP (si early)

Cosmétique / statut uniquement :

```txt
Founder Pack · skins trace · frames profil · templates story premium · crew cosmetics
```

**Pas au MVP :** stats avancées payantes, routes premium, fitness score, abo « training » type Strava.

## V1.5 — GRYD Pass

```txt
objectifs avancés · route planner avancé · historique avancé
templates premium · replay premium · challenge custom · leaderboard filters
```

## V2

```txt
offline routes · personal heatmap · fitness/effort score
watch sync avancé · training insights · route export
challenge privé avancé · club/crew analytics
```

---

# 7. Matrice GRYD synthèse

| Feature GRYD | Free | Premium |
|--------------|------|---------|
| Enregistrer une course | Illimité | — |
| Capturer / défendre | Oui | — |
| Rejoindre un crew | Oui | — |
| Sécurité basique | Oui | alertes/contacts+ (V2) |
| Missions recommandées | 1 principale | planner avancé |
| Routes sauvegardées | 3 | illimité |
| Offline routes | Non | V2 |
| Route builder | basique | avancé |
| Historique | basique | analyse avancée |
| Stats post-run | basique | avancées |
| Objectifs | simples | personnalisés |
| Classements | core | filtres / historique |
| Challenges | officiels / crew | custom |
| Effort / Fitness score | RPE simple | V2 |
| Story / replay | basique | templates / premium |
| Crew cosmetics / skins | quelques gratuits | premium |

---

# 8. Implémentation technique

## 8.1 Constantes partagées

Fichier : `packages/shared/src/feature-entitlements.ts`

- `FEATURE_KEYS` — clés stables (pas de chaînes magiques dans le code)
- `FEATURE_AVAILABILITY` — tier par feature (`free` | `premium_v15` | `premium_v2`)
- `isFreeFeature(key)` — true pour tout le socle jeu

## 8.2 Table `feature_entitlements`

Migration : `supabase/migrations/0026_feature_entitlements.sql`

```sql
feature_entitlements (
  id uuid primary key,
  user_id uuid not null,
  feature_key text not null,
  source text not null,  -- pass | founder | promo | admin
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true
)
```

RPC : `is_feature_entitled(p_feature_key text) → boolean`  
Règle serveur : les features `free` retournent toujours `true` sans ligne.

## 8.3 Vérification côté client

Chaque écran premium :

```txt
isFeatureAvailable(user, feature_key)
```

Paywall **doux** :

```txt
Analyse avancée — Disponible avec GRYD Pass.
Ton historique basique reste gratuit.
[Voir GRYD Pass] [Plus tard]
```

## 8.4 Modèles données sport (V1.5+)

Tables cibles (hors MVP immédiat) :

- `activities` / réutilisation `runs` existant
- `activity_metrics` (HR, effort, training load…)
- `activity_territory_results` (zones, efficacité, crew points)
- `routes` · `route_recommendations`
- `user_goals` · `challenges` (flag `requires_premium`)

## 8.5 Analytics paywall

Événements (cf. `packages/shared/src/events.ts`) :

- `paywall_view` · `paywall_dismiss` · `subscription_start`
- contextes : `performance`, `route_builder_advanced`, `leaderboard_filters`, etc.

---

# 9. Verdict

GRYD s’inspire de Strava comme **deuxième couche**, pas comme identité produit.

| Couche | Contenu |
|--------|---------|
| **1 — Jeu** | courir · capturer · défendre · crew · saison · partage |
| **2 — Premium** | analyser · planifier · personnaliser · partager mieux · organiser le crew |

C’est l’équilibre pour ne pas trahir le concept territorial crew-first.
