# GRYD — La map doit ressembler à une map Uber (version running / gaming premium)

> Brief fondateur du 03/07/2026 (verbatim condensé). Références visuelles : app running dark + tracé chartreuse sur plan de quartier ; maps Uber (structure, bottom sheet, lisibilité).

**Diagnostic** : une map « SaaS » montre de la donnée ; une map Uber montre **une situation en direct**, lecture immédiate, fluide, ultra claire.

## Direction
1. **Lecture ultra immédiate** (1 seconde) : où je suis, où je vais, le trajet, combien il reste, quoi faire maintenant.
2. **Map centrée sur l'action** : la carte est le cœur de l'expérience, pas une vue de fond. Elle répond à : je suis où ? je cours vers quoi ? qu'est-ce qui m'attend ?
3. **Esthétique sobre mais premium** : carto moderne, routes bien dessinées, blocs urbains propres, peu de bruit, UI flottante par-dessus, accent chartreuse pour l'énergie/gameplay.
4. **Sensation de mouvement permanent** : position live, progression en direct, tracé qui se dessine, zones qui s'activent, effets de capture, micro-animations.

## Couche principale
- **Position utilisateur** : point/avatar centré, orientation selon le déplacement, halo léger, animation discrète.
- **Tracé de course** : route principale très visible, partie parcourue différenciée de la partie restante.
- **Point d'arrivée / objectif** : repère fort + distance restante.
- **Repères clés** : départ, checkpoints, segments, zones à capturer, objectifs spéciaux.

## 10 fonctionnalités sur la map
1. **Suivi live** : GPS temps réel, vitesse, distance parcourue/restante, durée, allure, ETA.
2. **Itinéraire intelligent** : trajet recommandé, recalcul si déviation, variantes, boucle/A→B, virages simples.
3. **Vue objectif** : destination, checkpoint suivant, % progression, prochain objectif, ETA.
4. **Mode gaming/territoire** (différenciation vs Uber) : zones, rues/blocs capturables, route qui conquiert au passage, couleurs crew, secteurs alliés/ennemis/neutres, niveau de contrôle, animation de prise.
5. **Position amis/crew** : position live des amis **si activée**, coureurs proches, membres crew, leader, écart, rejoindre un run.
6. **POI running** : départ conseillé, fontaines, parcs, pistes, montées/descentes, spots populaires, zones de danger/trafic.
7. **Défis & événements en direct** : défi à proximité, zone bonus, mission quotidienne, segment chrono, événement crew.
8. **Feedback temps réel** : vibration/animation checkpoint, « zone capturée », « nouveau record segment », « ami à proximité », « déviation ».
9. **CTA rapides flottants** : pause, reprendre, recentrer, changer la vue, lancer défi, partager live, stats.
10. **Bottom sheet type Uber** : nom du run, distance, temps, allure, objectif, prochain checkpoint, crew, récompense, bouton principal — états compacte / semi-ouverte / ouverte.

## Cycle produit
- **Avant** : choisir un parcours (difficulté, distance, dénivelé, zones à conquérir, runs d'amis), lancer solo/crew.
- **Pendant** : navigation live, progression, capture, stats, défis, interaction crew, recalcul.
- **Après** : replay, zones capturées, points/XP, badges, classement, comparaison, partage.

## Structure d'écran
Header minimal (mode, retour, mini état crew) → map plein écran (utilisateur centré, tracé, territoires, amis/checkpoints) → boutons flottants à droite (recentrer, zoom, 2D/3D, couches, stats) → bottom sheet Uber (distance, durée, allure, objectif, bouton action).

## À éviter (anti-SaaS)
Trop de couches simultanées, trop de chiffres, trop de badges, trop de couleurs, carte trop technique, polygones compliqués, lecture « tableau de bord », UX froide.

> Cible : **Uber + Strava live + jeu de territoire premium** — pas un outil analytique de géodata.
