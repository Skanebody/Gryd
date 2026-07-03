# AMENDEMENT-04 — Système de badges complet (03/07/2026)

**Source : planche « GRYD — TOUS LES BADGES » fournie par le fondateur** (50 badges en 5 familles + 9 badges secrets). Complète AMENDEMENT-02 §6 (qui prévoyait ~20 badges). Source de code unique : `packages/shared/src/badges.ts`.

## 1. Familles et couleurs — exception contrôlée à la palette
La planche introduit une couleur d'accent PAR FAMILLE : **Fondateur violet · Performance cyan · Territoire vert · Crew orange · Spécial rose** (+ or pour les secrets). Décision :
- **Les badges sont la SEULE surface polychrome autorisée du produit** (écran collection, détail de badge, carte de partage de badge, notification de déblocage). La carte, la nav, les CTA et tout le reste restent strictement noir/blanc/chartreuse (addendum §C).
- En dehors des surfaces badge, un badge évoqué en UI (chip profil, inbox) reste monochrome charte.
- Les couleurs de famille vivent comme DATA dans le catalogue (`familyColor`), jamais dans design-tokens.

## 2. Le catalogue (résumé — détail exhaustif dans badges.ts)
- **Fondateur (10)** : Premiers Pas, Enclenché, Fondateur, Pionnier, Explorateur, Bâtisseur, Connecteur, Implanté (7 j), Racines (30 j), Légende Locale (100 j).
- **Performance (10)** : Sprinter (1 km < 4:00), Énergie (5 courses), Endurance (10 km en une course), Persévérant (21 km en une course), Dévoué (42 km cumulés), Iron Runner (100 km cumulés), Ultra Runner (200 km), Marathonien (42,195 km en une course), Inarrêtable (300 km), Machine (500 km).
- **Territoire (10)** : Conquérant (500 hex), Dominateur (1 000), Seigneur (5 000), Maître (10 000), Rival (1 vol), Pillard (10 vols), Prédateur (50 vols), Défenseur (10 défenses), Forteresse (50 défenses), Légende (dominer un secteur ≥ 70 %).
- **Crew (10)** : Recrue, Coéquipier (5 contributions), Membre Actif (20), Pilier (50), Stratège (10 avant-postes crew), Bâtisseur Crew (1 route), Leader (créer un crew), Commandant (10 membres), Légende Crew (50), Dynastie (100).
- **Spécial (10)** : Nocturne, Aube, Météo (pluie), Hiver (neige), Chaleur, Solitaire (10 courses sans crew), Social (1 filleul), Communauté (5 filleuls), Événement, Saison 0.
- **Secrets (9)** : masqués en UI (« ? ») jusqu'au déblocage — définis dans badges.ts, conditions calculables depuis les données de course existantes.

## 3. Interprétations gelées (la planche est ambiguë, on tranche)
- « X jours de présence » = **jours actifs distincts cumulés** (≥ 1 course valide), pas consécutifs.
- « Contribution » crew = course valide avec ≥ 1 hex claimé pendant l'appartenance au crew.
- « Course solo » = course valide alors que le joueur n'appartient à aucun crew.
- Sprinter : MVP = course ≥ 1 km avec allure moyenne < 4:00/km (le meilleur split exact arrive avec les splits V1).
- Nocturne = départ entre 22h et 5h locale ; Aube = départ entre 5h et 7h.
- Hex « capturés » (Territoire) = neutres + volés, cumulés vie entière (les défenses comptent à part).

## 4. Tous attribuables (03/07/2026)
Décision fondateur : le concept « dormant » disparaît — chaque badge du catalogue est réellement décernable (la colonne `badges.dormant` reste en base, plus jamais renseignée — migration 0008).
- **Météo / Hiver / Chaleur** : météo réelle via **Open-Meteo** dans ingest_run (heure locale du départ ; seuils `WEATHER_*` dans badges.ts, décision pure `weatherFlags` ; timeout 3 s **fail-open** — sans météo, la course n'est jamais impactée).
- **Bâtisseur / Stratège** : détection **avant-postes V0** branchée (zone pioneer/wild/emerging, ≥ OUTPOST_MIN_HEXES hexes du joueur à ≤ OUTPOST_RADIUS_KM du centroïde de la course, anti-doublon ; décision pure `shouldCreateOutpost`).
- **Connecteur / Bâtisseur Crew** : **routes V0** branchées (table `routes` — hexes de départ et d'arrivée possédés AVANT la course, distants de ≥ ROUTE_MIN_KM, anti-doublon à ROUTE_ENDPOINT_MATCH_KM ; décision pure `shouldOpenRoute`).
- **Événement** : table `events` seedée (« Grand Départ — Saison 0 », du 03/07 au 13/07/2026, bornes incluses — `inEventWindow`).
- **Légende Crew (50) / Dynastie (100)** : restent des **objectifs lointains** (cap crew 10 en S0) SANS étiquette spéciale — décernés automatiquement dès que le cap sera levé.

## 5. Implémentation
- Catalogue : `packages/shared/src/badges.ts` (+ export index).
- Attribution : `packages/engine/src/badges.ts` — `evaluateBadges(statsAvant, statsAprès, contexteCourse)` pur et testé ; branché dans `ingest_run` (réponse enrichie `newBadges`) ; stats vie entière en table `user_stats` (migration 0007) ; notification `reward` à chaque déblocage.
- UI mobile : écran collection depuis Profil, grille par famille, verrouillés en gris, secrets en « ? », compteur x/59.
- La planche image reste l'asset marketing de référence ; en app, les icônes sont des hexagones SVG (charte §H) teintés famille.
