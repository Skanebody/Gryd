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

## 4bis. Monde entier, navigation libre (décision fondateur 04/07/2026)
« Pour les deux cartes, mets entièrement les cartes du monde comme ça on peut voir tous les endroits pris et naviguer sur toute la carte. »
- **Les deux cartes sont MONDIALES et librement navigables** : aucun `maxBounds`, aucun verrou de zoom-out (minZoom tuiles), pan/zoom libre sur toute la planète. Le cadrage n'est qu'une CAMÉRA D'OUVERTURE : Battle Map = égocentrée échelle coureur ; Mon territoire = `fitBounds` sur l'ensemble des possessions (pas un cadrage France figé).
- **Tous les territoires pris rendent sur les DEUX cartes** (une seule source : l'export GeoJSON complet — démo : Paris + Lille + rival Lyon), pas de filtrage par viewport côté données (volumes MVP négligeables ; clustering = optimisation V1).
- **Lisibilité au dézoom** : en dessous d'un zoom seuil, chaque territoire est représenté par un **marqueur-point coloré à taille minimale** (chartreuse possession / orange rival) + label ville, pour rester visible au niveau monde/pays ; les aplats organiques reprennent au zoom ville.
- **Navigation rapide** : chips « Mes territoires » (Paris · Lille · Rival Lyon en démo) → flyTo ; bouton recentrer inchangé.
- Les lieux démo (République/canal/Lille/Lyon) restent des DONNÉES Saison 0, pas une limite du produit. La règle de CAPTURE (France entière, AMENDEMENT-02) est inchangée — la carte est mondiale, la zone capturable reste une règle produit distincte (extension monde = décision séparée).

## 4ter. Frontières = tracés du coureur (décision fondateur 04/07/2026)
« Fais des traits pour délimiter les zones en fonction du trajet du coureur, retire les formes bizarres. » — REMPLACE le lissage Chaikin des cellules (AMENDEMENT-11 §2, qui produisait des contours ondulés « pétales ») :
- **Zone (boucle fermée)** : le polygone affiché EST le tracé de course (segments de rues, coins nets, `lineJoin` arrondi léger) — trait continu 2-2,5 px couleur d'état + remplissage faible à l'intérieur. La frontière raconte le run qui l'a prise.
- **Couloir (course sans boucle)** : ruban net le long du tracé (épaisseur ~2 zones ≈ 60 m à l'échelle, bords parallèles, extrémités arrondies) — pas de lobes.
- **Contesté** : la portion de tracé partagée entre deux crews en double trait chartreuse+orange (plus de blob violet rond) ; **decay** : segment de frontière en pointillé ; **protégé** : halo doux le long du trait + shield.
- Les cellules H3 restent la vérité serveur (capture/score) — le tracé est la REPRÉSENTATION ; l'écart cellules/tracé est invisible à l'échelle coureur.
- Vaut pour toutes les surfaces : Battle Map, territoire (Lille/Lyon = polygones nets aussi), before/after post-run, share cards.

## 5. Contraintes
Réseau requis pour les tuiles : prévoir fond noir + grille de chargement discrète et états offline propres (« Carte indisponible — tes zones restent à toi », stats inchangées). Perf : sources GeoJSON mémoïsées, pas de re-render par frame. Privacy inchangée (l'ego démo = position fictive République ; jamais de vraie géoloc publiée). Charte stricte sur TOUTES les couches de jeu ; les tuiles gardent leur sobriété (labels gris discrets). Typecheck + tests + builds verts. Vocabulaire zones/secteurs (AMENDEMENT-11).
