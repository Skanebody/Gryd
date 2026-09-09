# GRYD — STATUS (tableau de vérité)

> Règle (MASTER Phase 0.c-8 + ADR-001) : tout démarre **ABSENT**, y compris ce qui
> existe dans le code conservé. **L'existence n'est jamais une preuve.** Seule une
> preuve `qa-verify` exécutée dans le contexte MVP fait passer une ligne à
> PARTIEL ou OPÉRATIONNEL — avec le lien vers la preuve (test, capture, log).

> **09/09/2026 — la ligne produit a changé (ADR-012)** : le cahier de septembre passe au rang 0, le MASTER
> devient archive ; le tableau ci-dessous décrit encore le périmètre MASTER et n'a pas été réécrit.
>
> **10/09/2026 — intégration FAITE, recette NON FAITE.** Branche `refonte-2026-09` : fusion de
> `codex/refonte-2026-09` (`b48fde5`, migrations renumérotées 0118-0128) dans la ligne du 02/09 (`ca28b3a`),
> commit de fusion `4483150` puis trois commits de suite. Gate vert sur l'arbre fusionné : typecheck 4/4, sync
> sans dérive, 120 migrations sans collision, 2 641 tests mobile, 1 597 fonctions, 47 fichiers SQL — première
> exécution de la lignée 0001→0128 sous PGlite (superutilisateur : la RLS réelle se re-vérifie en prod).
> Ce que la fusion a tranché (politique ADR-012 : l'intention produit suit le cahier) : entrée `(tabs)/_layout`
> version Codex (`/` = carte, invité → `/onboarding`), écrans legacy ré-exportés vers `features/refonte`, écran
> e-mail OTP Codex (gate 16+ conservé, repli sans pile restauré), moteur `validation.ts` = coupure déclarée
> PUIS silence temporel, `flags.season` retiré (surface Saison legacy retirée, routes ré-aiguillées vers
> `/season`), `expo-blur` retiré, sources natives du module film rapatriées (exclues par gitignore, jamais
> compilées ici).
> **Rien de ce qui suit n'est recetté** : (1) l'app fusionnée n'a encore jamais tourné, ni en preview ni sur
> appareil ; (2) le flux de course du cahier (`/map/prepare` → `/course-live` → `/course/analyse`) ne porte PAS
> les correctifs du 02/09 faits dans `(mvp)/course` (maintien 1,2 s, chrono honnête après kill, envoi non
> bloquant, voix) — le groupe `(mvp)` est conservé en quarantaine, réconciliation à faire ; (3) trois
> interactions backend constatées, non corrigées : `territory_reigns` restera vide sous le trigger de 0118
> (`my_territory_history()` rendrait un vide qui a l'air vrai ; aucun écran atteignable ne le peint aujourd'hui),
> `crew_overview()` figé sur `hex_claims` (lu par les écrans crew legacy `CrewHero` / `stats.ts` — à vérifier
> sous l'entrée Codex), résidu dé-identifié dans `capture_events_2026` après purge de compte (`on delete set
> null`, à documenter côté RGPD) ; (4) dette L18 : 585 `copy('fr','en')` inline dans `features/refonte/` ;
> (5) `_shared/` porte quatre fichiers `*2026` écrits à la main sans source de sync (`commercial2026`,
> `premium2026`, `premium2026_io`, `recomputeProgress2026`) ; (6) GRYD+ (cahier §16.1) contredit ADR-011 :
> les écrans existent, le SDK reste muet sans clé de production (`capability.ts`) — tension ouverte, App
> Privacy à déclarer le jour d'une clé. Audit de routes sous l'entrée du cahier : adapté le 10/09 (ré-exportations résolues, arbre d'imports suivi) : 56/80 routes atteignables depuis `/`, `/onboarding`, `/course` (reprise après crash), `/c/[code]`, `/callback` ; 16 orphelines, toutes documentées ; **les obligations App Store tiennent** : `/sign-in`, `/email`, `/confidentialite` (suppression de compte + export RGPD), `/code-conduite`, `/support` atteignables depuis `/` ; exit 0. Constats de l'audit, NON corrigés : (a) la quarantaine `(mvp)` n'est pas étanche : `app/_layout.tsx` rouvre `/course` (écran MVP) à la reprise après crash alors que la carte du cahier enregistre sur `/course-live`, deux écrans de course selon le chemin, et cette reprise finit sur `/carte` (carte MVP) ; (b) conflit de routes réel : `/profil` est servi par `(mvp)/profil.tsx` ET `(tabs)/profil.tsx` ; (c) huit écrans ont perdu leur unique porte dans la fusion, dont `/appel` (recours anti-triche : plus aucun joueur ne peut l'ouvrir) et `/course/analyse` (E27, court-circuité vers `/course-result`) ; (d) le tunnel `/setup/*` (E08 à E10) n'est plus dans aucun parcours.
> Migrations 0118-0128 et fonctions : appliquées en prod le 10/09/2026 (`supabase db push`, 120 appliquées, dernière 0128, aucune en attente), RLS réelle re-vérifiée (`verify:rls` vert), fonctions `ingest_run`, `progression_2026`, `sync_gryd_plus_access_2026` et `rc_webhook` (sans JWT, `config.toml`) redéployées — première exécution réelle de ces migrations sous PostGIS, réussie ; leur COMPORTEMENT (points 3 ci-dessus) reste à recetter. Aucune ligne du tableau ne bouge sur cette base.

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
| Onboarding (UN écran : jeu + priming) | **OPÉRATIONNEL** | `app/(mvp)/position.tsx` ; `permission.test.ts` 8/8 (les 3 issues + le défaut prudent) ; captures 375×812. ⚠️ FUSION du 02/09/2026 : `bienvenue.tsx` est SUPPRIMÉE — ses deux écrans n'en font plus qu'un (L9 est un plafond, pas un objectif ; HIG « fast, fun, and optional »). La capture d'avant montre donc DEUX écrans qui n'existent plus : à refaire au prochain `ux-gate` |
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
> **BASCULE COMPLÈTE le 03/08** — `/` ouvre sur l'onboarding. Parcours entier en
> MVP : onboarding → connexion → carte → GO → décompte → course → résultat.
> L'onboarding est SORTI de `KNOWN_ORPHANS` : il a une vraie porte.
> ⚠️ La porte visait `/bienvenue` jusqu'au 02/09/2026 ; depuis la fusion elle
> vise `/position`, l'écran unique. `ENTRY_ROUTES` de `scripts/audit-routes.mjs`
> a suivi — sans quoi l'audit aurait calculé l'atteignabilité depuis une route
> qui n'existe plus.
> ⚠️ RESTE LEGACY : le FORMULAIRE de code à usage unique (`/sign-in`), vers
> lequel « Continuer par e-mail » renvoie — une surface d'authentification ne se
> réécrit pas à la hâte. Et l'ancienne PORTE d'onboarding (`onboardingDone` vit dans un hook legacy qu'ADR-001 interdit
> d'importer).
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

### Prêt à builder (03/08/2026)
`expo-doctor` : **18/18**. `eas.json` a ses trois profils ; `ios.buildNumber` est
absent À RAISON (`appVersionSource: remote` + `autoIncrement` — c'est EAS qui le
tient). Bundle `fr.nexus1993.gryd`, permissions de position rédigées dans le
plugin `expo-location`. Ce qui manque est côté fondateur : les credentials Apple
(O2). **Rien dans le dépôt ne bloque un build.**

**Compteur : 1 opérationnel · 2 partiels · 28 absents.** (pipeline territorial : bornes, fermeture assistée, verdict au contrat et 8 fixtures — reste l'écran)
