# AMENDEMENT-32 — Backlog P2 : events crew + itinéraires populaires + challenges sponsorisés (06/07/2026)

Source : `GRYD_TEARDOWN_STRAVA_COMPLET.md` §2 (P2). 3 emprunts Strava supplémentaires, pur code (zéro dépendance externe), câblés démo. Charte, §A, anti pay-to-win, reduce motion, textes non tronqués.

## 1. Events de crew (comme les club events Strava)
Planifier une **sortie de crew** : titre + heure + lieu de rendez-vous + **zone cible** (défense/conquête). Liste des events à venir dans le Crew HQ + « Je viens » (RSVP démo). Rappelle §A.19 (social, pas monétisation). Store persistant (comme reactions/requests). But : coordination + densité (courir ensemble = le moat).

## 2. Itinéraires populaires (crowd-sourced conquest routes)
Dans le Route Planner / Missions : suggérer des **boucles populaires** (les tracés que les crews réussissent le mieux) comme routes de conquête, avec distance + zones potentielles + « X crews l'ont prise ». Démo déterministe (les vraies stats = agrégat serveur V1). But : réduire la friction de décision « où courir ».

## 3. Challenges sponsorisés (monétisation sponsors locaux)
Sur le système de challenges existant (A-07) : un **challenge sponsorisé** (ex. « Défi du magasin X · 50 km cette semaine · lots offerts ») avec blason sponsor discret + mention « offert par ». Câble la monétisation sponsors locaux du doc stratégie §3.5. Anti pay-to-win : le sponsor finance des LOTS/COSMÉTIQUES, jamais du territoire ; entrée gratuite (contourne le risque loterie). Démo (le vrai sponsor = back-office V1).

## 4. Build
Workflow, 3 agents parallèles (disjoints) : (a) crew-events (Crew HQ + store events) ∥ (b) popular-routes (Route Planner/Missions + demo) ∥ (c) sponsored-challenges (challenges + sponsor demo). Vérif visuelle + build + fix.
