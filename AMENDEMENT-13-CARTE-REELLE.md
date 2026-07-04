# AMENDEMENT-13 — Vraies cartes : tuiles réelles + territoires aux tracés réels (04/07/2026)

**Décision fondateur (04/07/2026)** : « une vraie carte de France comme celle de l'application Uber avec les territoires tracés avec les vrais tracés réels, et une vraie carte dans l'onglet Carte. » Fin des basemaps procédurales stylisées côté app : place à de **vraies tuiles cartographiques** (rues réelles, vraie géographie) sous les couches de jeu. Complète AMENDEMENT-11 (le rendu organique et le pipeline H3→zones restent LE système — on change le FOND, pas les territoires).

## 1. Infrastructure tuiles
- **Moteur** : MapLibre partout (stack imposée). Natif : `@maplibre/maplibre-react-native` (déjà intégré). **Web (Expo Web)** : `maplibre-gl` (nouvelle dépendance, la seule autorisée) monté dans un conteneur RN-Web ; CSS global Metro (supporté SDK 52).
- **Style** : fond vectoriel **sombre premium type Uber-night** — style hébergé sans clé pour le dev (dark-matter), avec surcharge des couleurs aux tokens GRYD quand possible (eau, parcs, routes, labels discrets). Attribution © OpenStreetMap affichée discrètement (obligation légale).
- **Prod** : la spec impose Protomaps → **point ouvert O6** (compte/clé API Protomaps ou PMTiles auto-hébergé). Le style/les couches sont écrits pour que seul le `styleURL`/la source change.
- Un composant partagé `RealMap` (web + natif si possible, sinon deux implémentations à API commune) : caméra, sources GeoJSON, couches par état, markers.

## 2. Onglet Carte (Battle Map) sur vraie carte de Paris
- **Ancrage réel** : centre égocentré = coordonnées réelles (quartier République/Canal Saint-Martin, ~48.867, 2.364). Les cellules H3 res 10 de la démo sont de VRAIES cellules sur le vrai Paris ; les couloirs démo sont **redessinés le long de vrais axes** (quais du canal Saint-Martin, boulevard Voltaire, rue du Faubourg-du-Temple…) via des waypoints lat/lng réels → « les vrais tracés réels ».
- **Couches de jeu au-dessus des tuiles** (GeoJSON depuis territory.ts, qui gagne un export GeoJSON) : aplats organiques + frontières par état (mêmes traitements AMENDEMENT-11 : contesté double contour pulse, decay pointillé, protégé halo+shield, or domination), route recommandée/RouteProgress, POI, mates opt-in, objectif, avant-poste. Zéro hexagone visible, comme avant.
- **HUD/sheet/boutons flottants/5 calques/échelle coureur inchangés** : zoom par défaut ≈ 14.6 (hex 130 m ≈ 30 px), barre 500 m remplacée par l'échelle MapLibre stylée tokens. Recentrer = flyTo fluide sur l'ego.
- La basemap procédurale (`basemap.ts`) reste UNIQUEMENT pour le Route Planner et la Course Live **dans cette passe** (bascule réelle = étape suivante, même API RealMap) — cohérence visuelle assurée par les mêmes couleurs/traitements.

## 3. « Mon territoire » : vraie carte de France
- Le bloc territoire du **Profil** (et l'écran territoire) devient une **vraie carte de France** (caméra nationale ~46.6, 2.4, zoom ~5) sur les mêmes tuiles sombres : territoires réels du joueur/crew en blobs organiques chartreuse sur **Paris et Lille** (Saison 0), crews adverses vers Lyon (orange), villes labellisées par les tuiles réelles.
- **Tap sur un territoire → flyTo animé** vers la ville à l'échelle coureur (on retrouve ses zones réelles) ; retour France par bouton. C'est le « digital twin » : la France réelle, tes vraies rues.
- L'asset SVG France (res 4) reste pour la **landing web** (marketing) — l'app passe au réel.

## 4. Natif
`MapScreen.tsx` : même styleURL sombre + mêmes sources GeoJSON fusionnées (déjà en place depuis AMENDEMENT-11) → parité visuelle web/natif de fait.

## 5. Contraintes
Réseau requis pour les tuiles : prévoir fond noir + grille de chargement discrète et états offline propres (« Carte indisponible — tes zones restent à toi », stats inchangées). Perf : sources GeoJSON mémoïsées, pas de re-render par frame. Privacy inchangée (l'ego démo = position fictive République ; jamais de vraie géoloc publiée). Charte stricte sur TOUTES les couches de jeu ; les tuiles gardent leur sobriété (labels gris discrets). Typecheck + tests + builds verts. Vocabulaire zones/secteurs (AMENDEMENT-11).
