# AMENDEMENT-24 — GRYD 3D Conquest Map (template de partage, 05/07/2026)

**Décision fondateur (05/07/2026).** Strava = carte 3D terrain/satellite (Mapbox), caméra inclinée, trace superposée. GRYD fait l'équivalent **propriétaire, sans copier l'orange Strava et sans changer de stack** : **MapLibre 3D + zone de conquête EXTRUDÉE**, pas de satellite ni de Mapbox.

## 0. Choix technique (tranché)
- **MapLibre, PAS Mapbox** (stack imposée ; Mapbox = facturation + hors stack — refusé pour le MVP).
- **Zéro clé** : la carte dark utilise déjà les tuiles CARTO ; le pitch (caméra inclinée) et la `fill-extrusion` (volume 3D) ne demandent aucun provider.
- **Satellite / relief DEM réel = upgrade V1** gated sur un provider de tuiles (point ouvert O6). Non fait ici.

## 1. « Carte 3D » — nouveau template (on GARDE les 5 existants → 6 styles)
Styles de partage : **Carte simple · Conquête · Défense · Boucle · Crew · Carte 3D** (nouveau). Le segmented « Style » (AMENDEMENT-22) montre les 3 principaux + « Plus » déplie les autres — jamais de pills séparées ni de troncature.

**Rendu « Carte 3D » (GRYD 3D Conquest) :**
- Fond **dark map pitché** (caméra inclinée ~50-60°, CARTO dark).
- **Trace chartreuse épaisse** (le tracé du run).
- **Zone conquise EXTRUDÉE** : polygone de la zone en **volume 3D chartreuse translucide** (`fill-extrusion`, hauteur douce) — le look signature GRYD (le territoire « monte »).
- **Zone rivale atténuée** (orange/rouge `gameColors.rival`, basse opacité, jamais dominante — zéro halo).
- Points départ/arrivée discrets.
- Overlay stats GRYD natif : `GRYD` · KPI géant (`+47`) · `Zones · République`.
- Charte stricte : trace = chartreuse, zone = chartreuse translucide, rival = orange/rouge, fond = dark. Reduce motion (pitch fixe, pas d'animation caméra imposée).

## 2. Formats (ajout « Carte seule »)
Formats : **Story 9:16 · Carré 1:1 · Carte seule** (nouveau). « Carte seule » = la carte 3D en grand avec chrome minimal (juste trace + zone + 1 ligne), pour un partage épuré.

## 3. Implémentation (sans régression)
- Étendre `RealMap` (web `maplibre-gl` + natif `@maplibre/maplibre-react-native`) avec des **props 3D OPTIONNELLES** : `pitch`, `bearing`, `extrudeZones` (rendu `fill-extrusion` des zones capturées), styling trace. **Défauts = comportement 2D actuel inchangé** (Battle Map, Course Live, autres templates NON impactés).
- La « Carte 3D » du partage rend un `RealMap` en mode 3D + zone extrudée démo (polygone de conquête déterministe). Les 5 autres templates gardent le `ShareMap` SVG léger (rapide).
- Export : ViewShot natif / capture web (démo : toasts, comme AMENDEMENT-20 §3 — la vraie capture native = O1).

## 4. Build (parallèle de C1, fichiers disjoints)
Workflow frontend : construction (RealMap props 3D + template Carte 3D + format Carte seule + wiring /partage) → vérif visuelle (préview : carte 3D pitchée + zone extrudée rend sans clé ni erreur ; Battle Map/Course Live toujours 2D nickel) + build (typecheck/expo export) → fix. Charte, reduce motion, anti pay-to-win (aucun impact gameplay), textes non tronqués.
