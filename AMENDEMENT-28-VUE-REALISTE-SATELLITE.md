# AMENDEMENT-28 — Vue réaliste : fond satellite (keyless) + 3D terrain (05/07/2026)

**Décision fondateur (05/07/2026).** La carte stylisée sombre (DA jeu) + bâtiments extrudés ne suffit pas quand on veut du **réaliste**. Ajouter un **fond satellite** (vraies photos aériennes), combiné au relief 3D (AMENDEMENT-27). **Sans clé, sans Mapbox** — le photoréalisme total « Google Earth » (photogrammétrie 3D) reste O6 (clé Google payante).

## 1. Fond « Réaliste » (satellite), keyless
- Source raster **Esri World Imagery** (publique, SANS CLÉ, attribution requise) :
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`.
- Nouveau fond basemap **`satellite`** (`gryd.basemap` gagne cette 3ᵉ valeur : `dark` · `color` · `satellite`), sélectionnable dans le menu **Calques**.
- Attribution Esri affichée (comme « © OpenStreetMap © CARTO »).
- Documenté source DEV (comme CARTO/Terrarium) ; prod = provider dédié O6.

## 2. Réaliste + 3D
- Le fond satellite se combine au **terrain DEM** (Terrarium, AMENDEMENT-27) : en 3D → **satellite drapé sur le relief** (vue Strava/hybride).
- **Bâtiments** : sur satellite, les toits sont DÉJÀ dans la photo → par défaut PAS d'extrusion vectorielle des bâtiments en fond satellite (évite le doublon/clash) ; le relief 3D vient du terrain. (Option future : extrusion légère si demandé.)

## 3. Lisibilité charte sur satellite (NON négociable)
- Le satellite est clair/coloré : la **chartreuse (trace + zones) DOIT rester lisible** → liseré/casing sombre porteur sous les traits chartreuse (réutiliser `withColorCasing`/mapStyle, déjà fait pour le fond couleur Voyager) ; aplats de zones en chartreuse translucide avec contour net.
- JAMAIS de texte/icône chartreuse illisible sur zone claire du satellite. Labels de rues du satellite discrets (halo).
- Le satellite est une OPTION (l'utilisateur la choisit) ; le défaut reste le fond sombre brandé.

## 4. Discipline
- Reduce motion, anti pay-to-win (pur visuel, zéro impact calcul), zéro halo de jeu. Le toggle 2D/3D (AMENDEMENT-26) marche avec les 3 fonds. Perf : tuiles raster satellite = plus lourdes que le vectoriel → cache/limite de zoom raisonnable.

## 5. Build
Workflow : mapStyle/basemap (ajouter le style `satellite` Esri + attribution) + RealMap web (raster satellite + terrain drapé + casing chartreuse) + RealMap natif (RasterSource Esri + Terrain si dispo) + le menu Calques (3ᵉ option « Réaliste »). Itération VISUELLE : le fond satellite charge (vraies photos), la chartreuse reste lisible, en 3D le satellite épouse le relief, 2D/couleur/dark inchangés, keyless, console propre. Puis vérif + build + fix. Cohérent avec AMENDEMENT-26/27.
