# Fidélité planches Vague 1 — checklist mesurable (E01→E26)

**Méthode** : pour chaque écran, statut **✅ / 🔄 / 🆕 / ❌**, preuve (commit ou capture), écarts restants.
**Règle** : données réelles ou vides — jamais les placeholders des maquettes (Nina M., km² inventés…).

| # | Écran | Statut | Preuve / critères | Écarts restants |
|---|-------|--------|-------------------|-----------------|
| E01 | Onboarding promesse | ✅ | Boucle + copy E01 | Photo asset `e01-crew.png` à déposer |
| E02 | Home Map · nouveau joueur | 🔄 | `FirstMissionPeek`, boucle pointillée, label `900 M`, métriques `game-rules` | Sous-label header « · Centre » (O1 secteur) ; position joueur à 44 % hauteur (cadrage caméra) |
| E03 | Home Map · joueur actif | 🔄 | Territoires réels | Halo 15 %, pill contexte 5 s, sheet km² 48 pt |
| E04 | Zone rivale | 🔄 | Sheet zone | Recalage 52 %, 3 métriques, REPRENDRE |
| E05 | Briefing mission | 🔄 | Bloc métriques | Gain km² / difficulté (O1) |
| E06 | Préflight | ✅ | Compte à rebours | — |
| E07 | Live Run | 🔄 | Live GPS | Carte 100 %, métriques 24 pt |
| E08 | Fermeture capture | 🆕 | — | Séquence encre 900–1100 ms |
| E09 | Résultat post-run | 🔄 | Écran existant | Hero avant/après (O1) |
| E10 | Story / partage | 🔄 | Partage | Compositeur modes |
| E11 | Classement | 🔄 | RPC surface | Podium photos, chips période |
| E12 | Saison & rang | 🔄 | Saison | Frise cosmétiques, passage de rang |
| E13 | Crew Home | 🔄 | Crew | Hero photo, onglets |
| E14 | Run/Bike switch | 🔄 | `MapActivitySwitch` si `flags.bike` | Masqué si flag OFF ✓ |
| E15 | Profil | 🔄 | Player card | Hero + 4 métriques (O1) |
| E16 | QR codes | 🆕 | — | Scanner + deep links |
| E17 | Boutique / Premium | 🔄 | Arsenal | Anti-p2w, heatmap réelle paywall |
| E18 | Statistiques | 🔄 | Performance | 3 blocs volume/territoire/régularité |
| E19 | Badges | ✅ | Grille 3 col | — |
| E21 | Édition profil / crew | 🔄 | Profil edit | Identité crew stub |
| E25 | Confidentialité | 🔄 | Page réduite | Parité planche suppression / export |

**Prochaine revue visuelle** : E02 capture côte à côte avec `docs/design/vague-1/planches.html` (serveur local 8899).
