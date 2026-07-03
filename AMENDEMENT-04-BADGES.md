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

## 4. Badges non attribuables en l'état (flag `dormant` — visibles, jamais décernés)
- **Légende Crew (50) / Dynastie (100)** : CREW_MAX_MEMBERS = 10 en Saison 0 → attribuables quand le cap sera levé (V2). On ne change PAS la règle de jeu pour un badge.
- **Météo / Hiver / Chaleur** : nécessitent une source météo (V1).
- **Événement** : nécessite le système d'events (V1).
- **Stratège / Bâtisseur Crew / Connecteur / Bâtisseur / Explorateur** : avant-postes et routes = détection basique V0 (OUTPOST_*) — attribuables dès que la détection tourne, dormants d'ici là si non branchés.

## 5. Implémentation
- Catalogue : `packages/shared/src/badges.ts` (+ export index).
- Attribution : `packages/engine/src/badges.ts` — `evaluateBadges(statsAvant, statsAprès, contexteCourse)` pur et testé ; branché dans `ingest_run` (réponse enrichie `newBadges`) ; stats vie entière en table `user_stats` (migration 0007) ; notification `reward` à chaque déblocage.
- UI mobile : écran collection depuis Profil, grille par famille, verrouillés en gris, secrets en « ? », compteur x/59.
- La planche image reste l'asset marketing de référence ; en app, les icônes sont des hexagones SVG (charte §H) teintés famille.
