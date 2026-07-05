# AMENDEMENT-26 — La vue 3D proposée sur TOUTES les cartes (05/07/2026)

**Décision fondateur (05/07/2026).** La 3D (carte pitchée + zone extrudée, GRYD 3D Conquest, AMENDEMENT-24) ne doit pas rester cantonnée au partage et à l'historique : **toute carte de l'app propose un basculement 2D / 3D.**

## 1. Portée — toutes les surfaces de carte
- **Carte (Battle Map, onglet home)** — toggle 2D/3D.
- **Course Live** (`LiveNavMap`) — toggle 2D/3D (le run en perspective, trace chartreuse dominante).
- **Mon Territoire** (vue territoire du profil/onglet) — toggle 2D/3D.
- **Historique** (détail de course) — déjà couvert par AMENDEMENT-25 (toggle 2D/3D du parcours) ; s'aligner sur le même contrôle/préf.
- **Partage** (template Carte 3D) — déjà 3D natif (AMENDEMENT-24).

## 2. Un seul mécanisme, cohérent
- **Préférence persistée** `gryd.map3d` (comme `gryd.basemap`) dans `mapPref` — le choix 2D/3D est mémorisé et partagé entre surfaces (au moins par surface ; défaut = 2D pour rester lisible/rapide).
- **Contrôle unique** : un petit toggle 2D/3D (segmented léger AMENDEMENT-22, ou un FAB dédié) présent sur chaque carte — libellé court, jamais tronqué, discret. Ne pas multiplier les cockpits : réutiliser la colonne de FABs existante.
- **Rendu unique** : tout passe par `RealMap` (props `pitch`/`bearing`/`extrudeZones` d'AMENDEMENT-24). 3D = pitch ~50-55° + zones capturées en `fill-extrusion` (volume chartreuse) + trace épaisse ; rival atténué. 2D = comportement actuel (pitch 0). Zéro clé (tuiles CARTO). Satellite/relief réel = upgrade O6.
- **Reduce motion** : pas d'animation caméra imposée ; le passage 2D↔3D est un snap doux (respecte le flag). Perf : la 3D reste fluide (fill-extrusion des zones visibles seulement).

## 3. Non-régression & discipline
- Défaut 2D partout : aucune carte ne bascule en 3D sans action utilisateur → aucune régression de lisibilité/perf.
- Charte, UI en scènes (AMENDEMENT-22), anti pay-to-win (zéro impact gameplay — pur affichage), zéro halo.
- La 3D est un CONFORT visuel : elle ne change jamais le calcul ni la décision serveur.

## 4. Build (APRÈS AMENDEMENT-25 — mêmes fichiers de carte)
Workflow : `mapPref` (pref `gryd.map3d`) + `RealMap` (mode 3D pilotable partout, défaut 2D) + toggle 2D/3D sur `MapScreen`/`BattleMapOverlays` (Battle Map), `LiveNavMap` (Course Live), la vue Mon Territoire, en s'alignant sur l'historique (AMENDEMENT-25). Puis vérif (chaque carte propose 2D/3D, la 3D rend sans clé/erreur, 2D par défaut, non-régression) + build + fix. Cohérent avec AMENDEMENT-24 (rendu) et AMENDEMENT-25 (historique/Info).
