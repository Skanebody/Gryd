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
| Connexion | **OPÉRATIONNEL** | `app/(mvp)/connexion.tsx` + `mvp/onboarding/signIn.ts` (11 tests, les 8 combinaisons de capacité balayées). Portes DÉRIVÉES de la capacité réelle : Apple sondé (pas déduit de l'OS), Google selon client id, e-mail comme plancher. Aucun identifiant manipulé — l'e-mail mène à l'écran legacy qui gère déjà le code. Photo du fondateur conservée |
| Onboarding (2 écrans + priming) | **OPÉRATIONNEL** | `app/(mvp)/bienvenue.tsx`, `position.tsx` ; `permission.test.ts` 8/8 (les 3 issues + le défaut prudent) ; captures 375×812 |
| Home Map (empty + actif) | **OPÉRATIONNEL** | `app/(mvp)/carte.tsx` + `mvp/map/homeState.ts` (18 tests, balayage exhaustif des 72 entrées) + `territoryGeo.ts` (11) + `ui/area.ts` (7) ; fond `mvp/map/nightStyle.ts` ; capture de l'état `unavailable` |
| Préflight + décompte | **OPÉRATIONNEL** | `app/(mvp)/prete.tsx` + `mvp/run/countdown.ts` (6 tests) ; un seul tap depuis la carte (L3) ; capture |
| Live Run | **OPÉRATIONNEL** | `app/(mvp)/course.tsx` + `trace.ts` (9) + `gauge.ts` (7) + `persist.ts` (10) : chrono, distance, jauge de fermeture et NEVER-LOSE-A-RUN réels. Preuve bout en bout en preview : buffer planté → `/carte` annonce et offre → reprise à 0,43 km avec chrono CONTINU depuis le vrai départ → TERMINER → buffers vides, plus aucune offre. SUIVI EN ARRIÈRE-PLAN câblé (`mvp/run/gpsProvider.ts`, déplacé) : écran éteint compris, avec fusion dédupliquée des deux sources (`mergeFixes`, 4 tests) et un dernier drain avant l'envoi |
| Capture + résultat | **OPÉRATIONNEL** | `app/(mvp)/resultat.tsx` + `mvp/run/payload.ts` (7) + `outcome.ts` (13) + `sendRun.ts`. La course PART : envoi direct, ou file FIFO persistée si le réseau manque. `ingest_run` renvoie désormais `loopAreaM2` (`reportableAreaM2`, 3 tests) — le chiffre héros existait nulle part avant. Captures des 4 issues clés en preview : capture 42 350 m², attente sans verdict, manque « 23 m », intérieur partiel SANS chiffre |
| Profil : suivi + compte + légal | **OPÉRATIONNEL** | `app/(mvp)/profil.tsx` + `mvp/profil/stats.ts` + `account.ts` (14 tests). Débloque le REFUS App Store créé par la bascule : suppression de compte (5.1.1(v)) via `request_account_deletion` (délai de grâce déjà en prod), export RGPD, confidentialité, code de conduite, aide — tous atteignables. Tableau de bord : territoire · sorties · distance, avec les 4 états honnêtes |
| Partage (carte 1-tap, deep links) | **ABSENT** | — |

> **BASCULE D'ENTRÉE FAITE le 03/08/2026** — un joueur connecté et configuré
> atterrit sur `/carte` (MVP), plus sur les onglets legacy. Posée au SEUL point de
> décision du parcours (`app/(tabs)/_layout.tsx`), et la reprise après crash mène
> désormais à `/course` (MVP) : les deux écrans lisent le même buffer, donc une
> course interrompue avant la bascule se reprend quand même.
> **BASCULE COMPLÈTE le 03/08** — `/` ouvre sur `/bienvenue`. Parcours entier en
> MVP : onboarding → priming → connexion → carte → GO → décompte → course →
> résultat. `/bienvenue` et `/position` sont SORTIS de `KNOWN_ORPHANS` : ils ont
> une vraie porte.
> ⚠️ RESTE LEGACY : le FORMULAIRE de code à usage unique (`/sign-in`), vers
> lequel « Continuer par e-mail » renvoie — une surface d'authentification ne se
> réécrit pas à la hâte. Et l'ancienne PORTE d'onboarding (`onboardingDone` vit dans un hook legacy qu'ADR-001 interdit
> d'importer). `/bienvenue` et `/position` restent donc atteints par URL directe.
> ⚠️ NON VÉRIFIÉ À L'ÉCRAN : la bascule demande une session, et je n'ai pas de
> compte — même preuve manquante que le reste.
> **Backend PROD au 03/08/2026** : migrations `0107→0112` APPLIQUÉES (prod était à
> 0106), fonction `ingest_run` DÉPLOYÉE. Vérifié en base : `territory_reigns` +
> son trigger, `my_territory_history`, `purge_due_accounts`, `crew_overview`,
> `add_crew_xp`, et **26 anneaux d'eau à Rouen = 9,63 km² soustraits à la
> capture** (sans quoi une boucle longeant les deux rives capturait la Seine).
> RLS réelle re-vérifiée APRÈS migration : **11/11** sur 83 tables — la nouvelle
> table n'a pas ouvert de trou. Données de jeu réelles : 3 comptes, 0 territoire,
> 0 course. Ce que PGlite ne peut pas prouver (superutilisateur) l'est ici.
>
> Verdict L1–L19 des 8 écrans : `docs/UX-GATE-PHASE1.md` — **CONFORME SOUS RÉSERVE**
> (L7 et L14 partielles, L13 absente et hors périmètre, L3 non vérifiable avant la bascule).

**Compteur : 1 opérationnel · 2 partiels · 28 absents.** (pipeline territorial : bornes, fermeture assistée, verdict au contrat et 8 fixtures — reste l'écran)
