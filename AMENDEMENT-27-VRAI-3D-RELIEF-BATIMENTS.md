# AMENDEMENT-27 — Vrai 3D : relief du terrain + bâtiments extrudés (05/07/2026)

**Décision fondateur (05/07/2026).** Le « 3D » actuel (AMENDEMENT-24/26) = caméra inclinée + zones de jeu extrudées, mais **la ville reste plate**. Ce n'est pas un vrai 3D. Il faut du **relief** : bâtiments 3D + terrain (DEM). **Sans clé, sans Mapbox** (on reste sur la stack MapLibre + sources publiques).

## 1. Bâtiments 3D (empreintes extrudées)
- Extruder la couche vectorielle `building` des tuiles CARTO déjà utilisées (`basemaps.cartocdn.com`, schéma OpenMapTiles) via un layer `fill-extrusion` :
  - hauteur = `['coalesce', ['get','render_height'], H_DEFAUT]` (fallback ~6 m si la tuile n'a pas la hauteur), base = `render_min_height` (défaut 0).
  - couleur : bâtiments **sombres/désaturés** (charte) pour rester en fond — la chartreuse (trace + zones de jeu) DOIT rester dominante ; les zones de conquête s'extrudent AU-DESSUS.
  - inséré SOUS les couches de jeu (les zones/trace GRYD passent devant).
- Si CARTO n'expose pas `render_height` sur `building`, fallback : hauteur fixe estimée (toujours « 3D ») OU source vectorielle keyless alternative (OpenFreeMap `tiles.openfreemap.org`, schéma OpenMapTiles avec hauteurs) — à trancher par l'agent selon l'inspection live.

## 2. Relief du terrain (DEM)
- Source `raster-dem` **AWS Terrarium** (publique, SANS CLÉ) : `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, `encoding: 'terrarium'`, tileSize 256.
- Web : `map.setTerrain({ source, exaggeration: ~1.3 })` en mode 3D ; retiré en 2D. Optionnel : `hillshade` léger + `sky`/atmosphère à fort pitch.
- Natif (@maplibre/maplibre-react-native) : `RasterDemSource` + `Terrain` + `FillExtrusionLayer` (mêmes sources).
- Paris = plat (effet subtil), mais RÉEL dès qu'il y a du relief (trails, montagne) — c'est le point du « vrai 3D ».

## 3. Discipline
- **Uniquement en `mode3d`** : la 2D reste STRICTEMENT inchangée (pas de terrain, pas d'extrusion bâtiments, pitch 0). Toggle 2D/3D (AMENDEMENT-26) inchangé.
- Keyless (dev). En prod, un provider de tuiles/DEM propre = point ouvert **O6** (Protomaps + terrain). AWS Terrarium documenté comme source dev (comme CARTO).
- Charte : bâtiments sombres, chartreuse dominante (trace + zones), zéro halo. Reduce motion (pas d'anim caméra imposée ; snap doux 2D↔3D). Perf : extrusion des bâtiments visibles seulement, terrain à exagération modérée.
- Anti pay-to-win : pur confort visuel, zéro impact calcul.

## 4. Build
Workflow : RealMap web (`maplibre-gl` : raster-dem + setTerrain + fill-extrusion `building` + sky) + RealMap natif (RasterDemSource + Terrain + FillExtrusionLayer), pilotés par `mode3d`. Itération VISUELLE sur preview : en 3D on VOIT les bâtiments monter + (le cas échéant) le relief ; les zones/trace GRYD restent dominantes ; 2D inchangée ; keyless, console propre. Puis vérif + build + fix. Cohérent avec AMENDEMENT-24/26 (le même `mode3d` déclenche maintenant AUSSI relief + bâtiments).
