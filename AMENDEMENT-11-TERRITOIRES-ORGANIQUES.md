# AMENDEMENT-11 — Territoires organiques : plus d'hexagones visibles (03/07/2026)

**Source : `docs/product/GRYD_carte_sans_hexagones_territoires_routes.md`.** DÉCISION PRODUIT MAJEURE, prime sur les points carte/vocabulaire d'AMENDEMENT-08 §4, -09 et -10 : **les hexagones ne sont plus jamais affichés côté utilisateur**. Formule : **« Pas une grille. Une ville à prendre. »**

## 0. Les 5 décisions (doc §28)
1. Supprimer les hexagones visibles de l'UI. 2. Afficher des **territoires organiques colorés**. 3. Les hexagones (H3) restent **uniquement** couche technique invisible (backend : capture, scores, anti-triche, ownership — RIEN ne change dans game-rules/engine/DB/edge functions). 4. Carte **route-first** pour le coureur. 5. Renommer les métriques visibles : hexes → zones / territoires / secteurs / rues.

## 1. Périmètre de l'interdiction — arbitrages
- INTERDIT : grille hexagonale sur toute carte (Battle Map, Route Planner, Course Live, mini-cartes, before/after du post-run, share cards carto, aperçus territoire).
- **NON concernés** (décisions fondateur antérieures, hors « grille ») : la silhouette **bouclier-hexagone des badges** (planche DA, AMENDEMENT-10 §0), l'**avatar hexagonal** (AvatarHex/PlayerAvatarFrame), le **blason CrewCrest**, l'icône hex du logo/nav. Le mot « hex » disparaît néanmoins de TOUT texte visible.
- La **carte de France** territoire (asset national) : conserve ses cellules res 4 pour l'instant (échelle nationale, lecture « régions ») — à réévaluer V1.

## 2. GRYD Territory Map — rendu (doc §5, §6, §25)
7 couches : 1 fond ville (îlots) ; 2 rues/chemins/parcs/eau ; 3 **territoires colorés organiques** ; 4 **frontières** de crews ; 5 tracé de course recommandé ; 6 objectifs/zones chaudes ; 7 labels quartiers.
**Pipeline** (dans le rendu UI seulement) : cellules H3 capturées → groupement par owner → fusion des adjacentes (`h3.cellsToMultiPolygon`) → simplification des contours → **lissage** (Chaikin 1-2 itérations) → aplat couleur statut + frontière. Les états deviennent des traitements de FRONTIÈRE : normale = contour fin semi-lumineux ; rivalité = contour orange marqué ; contestée = double contour chartreuse+orange, pulse lent ; protégée = halo + icône shield (1 icône par secteur, pas par cellule) ; decay = pointillé (muted red si urgent) + sablier au secteur. Avant-poste = petit blob organique ; objectif = pin + zone chaude douce ; route ouverte = ligne.
Couleurs inchangées (chartreuse crew / orange rival / violet ou double-contour contesté / gris sombre neutre / or domination-récompense). Anti-patchwork : jamais plus de 3-4 aplats colorés simultanés, hiérarchie stricte, grandes zones, labels courts.

## 3. Deux priorités visuelles (doc §10)
- **Battle Map** (comprendre la guerre) : territoires > statut de zone > rival > objectif > routes > rues. HUD : `PARIS EST · Zone contestée — Ton crew 42 % · Canal Crew 38 % · Neutre 20 %` + route recommandée résumée + CTA contextuel.
- **Route Planner / Course Live** (savoir où courir) : route épaisse > position > rues > zones capturables (légèrement lumineuses) > territoires en transparence > frontières secondaires.
- **5 modes de carte** (remplacent les layers-chips) : Territoire / Route / Défense (rues-zones à sauver) / Raid (territoires rivaux à traverser) / Exploration (zones vierges, routes à ouvrir).

## 4. Vocabulaire produit (doc §13-§14) — sweep TOTAL des textes visibles
`hex(es) → zone(s)` ; `grille → territoire` ; `cluster → secteur` ; `ownership → contrôle` ; `claim → capture` ; `decay → zone à défendre` (l'état visuel garde son traitement) ; `shield → protection` ; `route trace → itinéraire`. Formulations riches selon contexte : `+214 zones capturées`, `37 zones tenues`, `12 rues défendues`, `Paris Est +12 %`, `Secteur repris`, `Frontière repoussée`, `Canal Crew repoussé`, `Paris Est contrôlé à 62 %`, `≈ 35 zones neutres peuvent suffire`. Concerné : Battle Map (HUD, bandeau, sheet), métriques nav, Course Live/Résultat, War Room (`Défendre République — 12 rues à sauver · 48 h · +340 pts`), Crew HQ (`Territoire crew : Paris Est 42 % · Zones tenues 2 147 · Frontières contestées 3 · Routes ouvertes 6`), League, challenges, Aujourd'hui, Arsenal (Shield « Protège un secteur 48 h », Radar « Montre les rues les plus rentables »), share cards, notifications, **landing web** (textes marketing). Les noms d'events PostHog et le backend NE changent PAS.

## 5. Post-run sans hexagones (doc §15)
Séquence 7 étapes conservée, reformulée : Course validée → **+214 zones capturées** (ou `PARIS EST REPRIS — +86 zones · 12 rues défendues`) → **Secteur modifié / Frontière repoussée** (before/after ORGANIQUE : la frontière bouge, pas des cellules) → contribution crew (`Night Pacers +12 %`) → bonus perf → badge → share card virale (carte zone chartreuse + frontière orange repoussée + route brillante + gros chiffre + logo).

## 6. Routes = objets sociaux (doc §17) — MVP léger
Une route a un nom/type/stats (`Route défense République — 4,8 km · +86 zones`) et peut être **partagée dans le Crew Chat / War Room** (message actionnable « Voir la route » → Route Planner). Stories/feed externes = V1.

## 7. Hors scope (V1/V2)
Génération réelle d'itinéraires ; partage social externe des routes ; skins de territoire dynamiques ; refonte France map nationale ; guidage vocal ; AR.

## 8. Contraintes
Lisibilité mobile (soleil, une main, un coup d'œil) : route épaisse, grandes zones, pas de micro-détails, labels courts, CTA évident. Charte et régimes UI (AMENDEMENT-10) inchangés. Zéro position live publique, anti-shame, reduce motion, haptics. H3/engine/SQL/edge functions intouchés — la conversion est 100 % couche de rendu + textes.
