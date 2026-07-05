# AMENDEMENT-25 — Mission dans Info + Historique complet avec tracé 3D (05/07/2026)

**Décision fondateur (05/07/2026).** Deux ajustements après AMENDEMENT-21/24.

## 1. La carte de mission quitte l'écran par défaut → dans « Info »
La card « Défendre République · 4,4 km · 3 zones · bonus actif · [Défendre] · Voir les options » ne doit **plus être visible en permanence** sur la Carte. Elle passe dans **Info**.
- **Écran par défaut de la Carte** : header 1 ligne (`République attaquée / 3 zones à sauver`) + pill rival compacte + carte + bottom nav + FABs droite. **Plus de card sticky en bas.**
- **Bouton Info** (FAB) : au tap, révèle un panneau qui contient la **situation** (`PARIS EST · Ton crew 42 % · Canal 38 % · directive`) **ET** la **mission** (`Défendre République` + micro-bonus + **[Défendre]** + `Voir les options` → les 4 blocs Résumé/Parcours/Équipe/Détails). Le seul gros CTA [Défendre] vit désormais dans ce panneau Info.
- Résultat : la carte respire au maximum (règle 1 écran = 1 carte). L'action reste à 1 tap (Info → Défendre). FABs : Recentrer + Calques + **Info** (l'Info remplace la card sticky, il ne s'ajoute pas à un cockpit — Calques peut fusionner sous un menu si besoin pour ne pas dépasser 3).
- Réconcilie AMENDEMENT-21 §8 : l'arbitrage « card sticky porte Voir les options » est **remplacé** — tout (situation + mission + options) vit sous Info.

## 2. Historique : tous les parcours + stats + tracé (2D et 3D)
L'utilisateur doit **retrouver tous ses parcours** avec :
- **Stats par course** : date, **temps**, **distance**, **vitesse/allure**, zones (+ défendues/prises), verify.
- **Le dessin de son parcours** (le tracé réel), déjà présent en 2D (RunLoopMap) — le garder/renforcer sur chaque course.
- **Vue 3D du tracé** (nouveau) : un toggle **2D / 3D** sur le détail de course qui rend le parcours dans le style **GRYD 3D Conquest** (carte dark pitchée + trace chartreuse épaisse + zone extrudée si boucle fermée), en **réutilisant `RealMap` (props `pitch`/`bearing`/`extrudeZones`) et `ShareMap3D`** d'AMENDEMENT-24. Zéro clé (CARTO), reduce motion.
- Liste `historique.tsx` : toutes les courses (pas de troncature de la liste), chacune avec un aperçu du tracé + stats clés ; tap → détail avec le tracé 2D/3D + le détail du calcul (AMENDEMENT-23 C2).

## 3. Build (parallèle de C3, fichiers disjoints)
Workflow 2 agents : (a) **map-info** — `BattleMapOverlays.tsx` (+ `MapScreen` si besoin) : retirer la card sticky du défaut, ajouter/brancher le FAB Info qui révèle situation + mission (le sheet existant sert de contenu) ; (b) **historique-3d** — `historique.tsx`, `course/[id].tsx`, `RunHistoryCard.tsx`, `RunLoopMap.tsx` (+ nouveau `RunRoute3D` réutilisant `RealMap`) : liste complète avec temps/vitesse/distance + tracé, toggle 2D/3D du parcours. Puis vérif (visuelle : carte épurée + Info révèle la mission ; historique liste + tracé + 3D ; non-régression) + build (typecheck/tests/preview) + fix. Charte, UI en scènes (AMENDEMENT-22), reduce motion, anti pay-to-win, textes non tronqués.
