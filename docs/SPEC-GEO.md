# SPEC-GEO — Pipeline territorial (extrait MASTER §6.2–6.3)

Implémentation : `packages/engine` (pur, Deno-testé — ADR-004/007). Constantes : `game-rules.ts` (ADR-003).

```text
points GPS bruts
→ filtre qualité (précision ≤ ACCURACY_MAX ; téléport si saut > 100 m / < 5 s → coupe le segment)
→ simplification Ramer-Douglas-Peucker (ε ≈ 5 m)
→ détection de fermeture : a) dist(départ, fin) ≤ CLOSE_GAP_MAX, ou b) auto-intersection
→ construction du ring (fermeture assistée : segment droit si écart ≤ CLOSE_GAP_ASSIST)
→ validation (distance, aire min/max, compacité Polsby-Popper, allure)
→ clip des zones interdites (MVP : eau OSM pour Rouen)
→ résolution de conflit : ST_Difference sur les zones NON protégées chevauchées
→ insertion zone + cellules H3 + zone_events
→ rendu client : union lissée, coins arrondis, JAMAIS d'hexagone visible
```

Codes de raison (L19) : `TOO_SHORT` · `GAP_TOO_WIDE {metres_manquants}` · `AREA_TOO_SMALL` · `PACE_INVALID` · `GPS_QUALITY` · `SEGMENT_REMOVED`. Le joueur sait toujours pourquoi, et combien de mètres manquaient.

Verify v0 : précision GPS, bornes d'allure, accélérations irréalistes, téléportation, cohérence podomètre, mock-location Android → `VALIDATED` / `PARTIAL` / `STATS_ONLY`. Jamais « REFUSED » affiché.

Fixtures GPX Phase 1 (définition du succès de `geo-engine`) : boucle parfaite · boucle à 84 m (assistée) · aller-retour (compacité) · tram (allure) · voiture (rejet) · GPS bruité urbain · boucle minuscule (aire) · 1ʳᵉ capture 500 m (seuil abaissé).

Existant conservé → cible : `gps.ts` (nettoyage/trust) et `polygon.ts` (boucle/aire) couvrent déjà une partie du pipeline ; les DELTAS Annexe A (fermeture assistée 60 m, compacité 0.15, seuils 1ʳᵉ capture, RDP ε=5 m) sont des chantiers Phase 1 avec tests — voir ADR-003.
