# GRYD — STATUS (tableau de vérité)

> Règle (MASTER Phase 0.c-8 + ADR-001) : tout démarre **ABSENT**, y compris ce qui
> existe dans le code conservé. **L'existence n'est jamais une preuve.** Seule une
> preuve `qa-verify` exécutée dans le contexte MVP fait passer une ligne à
> PARTIEL ou OPÉRATIONNEL — avec le lien vers la preuve (test, capture, log).

| Fonctionnalité (périmètre IN, §7) | État | Preuve |
|---|---|---|
| Onboarding 3 écrans + priming permissions | **ABSENT** | — |
| Carte sombre 60 fps + zones organiques (moi/neutre/fragile) | **ABSENT** | — |
| GO en 2 taps | **ABSENT** | — |
| Live Run minimal (jauge de fermeture, ≤ 5 infos) | **ABSENT** | — |
| Never-lose-a-run (kill → reprise) | **ABSENT** | — |
| Clip des zones d'eau (Rouen) | **OPÉRATIONNEL** | `rouen_water.pglite.test.mjs` (9 assertions) — 26 anneaux OSM, 9,63 km², étape 0 prouvant que la Seine était capturable |
| Pipeline territorial (8 fixtures GPX, codes de raison) | **PARTIEL** | bornes Annexe A + **fermeture assistée câblée** (`loopClosure.test.ts`, 12 tests) + `missingM` pour « il manquait {m} m » ; gate vert (3 987 tests). + **verdict transporté jusqu'au contrat client** (`loopAssisted`, `loopMissingM` — `loopMissing.test.ts`, 8 tests). + **8 fixtures GPX vertes** (`gpxFixtures.test.ts`) + seuil de 1ʳᵉ capture câblé. Reste ABSENT : l'affichage, qui vient avec la nouvelle UI (M7) |
| Verify v0 (VALIDATED/PARTIAL/STATS_ONLY) | **ABSENT** | — |
| Bouclier 24 h | **ABSENT** | — |
| Decay fragile J+7 | **ABSENT** | — |
| Decay neutre J+14 | **ABSENT** | — |
| Rafraîchissement par passage | **ABSENT** | — |
| Reprise de territoire (ST_Difference, zones protégées intouchées) | **ABSENT** | — |
| Objectif du jour (1 suggestion serveur) | **ABSENT** | — |
| Classement quartier hebdo (cohortes 30–60) | **ABSENT** | — |
| Streak hebdo + 1 joker | **ABSENT** | — |
| Crew : créer / rejoindre (code + deep link), max 20 | **ABSENT** | — |
| Territoire crew = union rendue avec motif | **ABSENT** | — |
| Classement crews ville | **ABSENT** | — |
| Réactions prédéfinies + ping « je sors à Xh » | **ABSENT** | — |
| Écran résultat ordonné (territoire → avant/après → points → crew → stats → partage) | **ABSENT** | — |
| Carte de partage 1 tap (Story 9:16 + 1:1, géométrie sociale) | **ABSENT** | — |
| Deep links (zone/crew/défi, test à froid) | **ABSENT** | — |
| Pages web publiques zones/crews + OG dynamiques | **ABSENT** | — |
| Referral validé à la 1ʳᵉ course | **ABSENT** | — |
| Notifications événementielles (défense, fragile, crew, classement) | **ABSENT** | — |
| Profil minimal (m², zones, historique, badges S0) | **ABSENT** | — |
| Saison 0 Rouen (8 sem., points, caps, reset festif, poster) | **ABSENT** | — |
| Confidentialité (zones privées, masque domicile 200 m, suppression, export) | **ABSENT** | — |
| Analytics Annexe B (funnel d'activation) | **ABSENT** | — |
| i18n FR/EN (aucun texte en dur) | **PARTIEL** | microcopy MVP posée, conforme et BRANCHÉE sur les cinq écrans `(mvp)` — `mvp.test.ts` (10 tests : L5/L8/L16/L18/L19 sur les 5 langues) + `registre.test.ts` (le portugais est brésilien). Reste ABSENT : les écrans non encore écrits |

### Phase 1 — écrans MVP (mis à jour le 03/08/2026)
| Écran | État | Preuve |
|---|---|---|
| Onboarding (2 écrans + priming) | **OPÉRATIONNEL** | `app/(mvp)/bienvenue.tsx`, `position.tsx` ; `permission.test.ts` 8/8 (les 3 issues + le défaut prudent) ; captures 375×812 |
| Home Map (empty + actif) | **OPÉRATIONNEL** | `app/(mvp)/carte.tsx` + `mvp/map/homeState.ts` (18 tests, balayage exhaustif des 72 entrées) + `territoryGeo.ts` (11) + `ui/area.ts` (7) ; fond `mvp/map/nightStyle.ts` ; capture de l'état `unavailable` |
| Préflight + décompte | **OPÉRATIONNEL** | `app/(mvp)/prete.tsx` + `mvp/run/countdown.ts` (6 tests) ; un seul tap depuis la carte (L3) ; capture |
| Live Run | **PARTIEL** | `app/(mvp)/course.tsx` + `mvp/run/trace.ts` (9) + `gauge.ts` (7) : chrono, distance et JAUGE DE FERMETURE réels — la jauge appelle `loopClosureVerdict`, la copie générée du moteur qui décide aussi le claim serveur (drift testé). **Manque** le never-lose-a-run : la trace vit en mémoire, et rien n'est encore envoyé |
| Capture / résultat / partage | **ABSENT** | — |

> ⚠️ Ces écrans ne sont atteints que par URL directe : la bascule d'entrée n'a pas eu lieu.

**Compteur : 1 opérationnel · 2 partiels · 28 absents.** (pipeline territorial : bornes, fermeture assistée, verdict au contrat et 8 fixtures — reste l'écran)
