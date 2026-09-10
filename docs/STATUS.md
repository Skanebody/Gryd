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
> `crew_overview()` figé sur `hex_claims` — **CORRIGÉ le 10/09/2026 par la migration 0152** (`crew_facts_2026` :
> `crew_overview` / `crew_discovery` / `crew_public_profile` / `crew_activity_feed` lisent `ownership_2026` +
> `capture_events_2026` publiés ; ni surface ni rang de crew, le titre reste individuel — 0126) ; RESTE FIGÉ :
> `crew_stats()` (épinglée `ruleset_version='legacy'` par 0118) et `crew_board()` (matview alimentée par les
> tables héritées), donc `/crew-stats` peut afficher des zéros VRAIS d'une source MORTE, résidu dé-identifié
> dans `capture_events_2026` après purge de compte (`on delete set
> null`, à documenter côté RGPD) ; (4) dette L18 : ~585 `copy('fr','en')` inline dans `features/refonte/`
> (`ProfilePrimitives.useRefonteCopy` ne connaît que fr/en). **Conséquence assumée le 10/09/2026** : `/langue`
> ne propose plus que FR et EN (`SELECTABLE_LOCALES`, `src/i18n/store.ts`) et l'écran DIT pourquoi
> (`reglages.langueOnlyTwo`) — un compte es/de/pt lisait du français sans avertissement. Les catalogues
> restent typés 5 langues (ADR-009) ; rouvrir la liste exige d'abord de traduire les inline, dont les plus
> fournis : `CrewHomeScreen.tsx`, `ProfileHomeScreen.tsx`, `SeasonJourneyScreen.tsx`, `CollectionScreen.tsx`,
> `ProfilePrimitives.tsx`, plus `app/crew-feed.tsx`, `app/member.tsx`, `app/amis.tsx` et
> `features/crew/CrewConversationScreen2026.tsx`. Verrou : `src/i18n/selectableLocales.test.ts` ;
> (4bis) vocabulaire §15.1 NON tenu par les routes : `/warroom` et `/arsenal` survivent (beaucoup de liens,
> renommage = audit de routes à part), et l'icône partagée `raid` (`packages/shared/src/icons.ts`) irrigue
> `MapMode`, les tags de crew et `runStoryUi` — renommage non trivial, inscrit ici plutôt que bâclé ;
> (4ter) deux domaines ORPHELINS constatés le 10/09/2026, corrigés mais pas supprimés : `features/explain/`
> (20 fichiers dont 3 tests — `content.ts`, ses 9 schémas, `FAQ_ITEMS` et ses 29 entrées — plus le catalogue
> `i18n/catalog/explain.ts`, 5 langues) n'est plus importé que par ses propres tests, tandis que la FAQ affichée (`app/faq.tsx`) écrit ses
> dix questions en clair ; sa réponse `q6A` promettait encore la CONTESTATION que §5.3 abolit — réécrite en
> 5 langues (verrou `i18n/catalog/explain.contestation.test.ts`), le domaine reste à trancher (supprimer ou
> remonter, décision à part). Et `features/crew/revanche.ts`, qu'aucun écran n'importe, POSAIT au premier
> lancement une revanche inventée (rival « MEUTE 20 », secteur parisien, 14 zones perdues) qu'il persistait :
> seed retiré, store vide tant qu'aucun événement serveur ne l'alimente (verrou `features/crew/revanche.test.ts`) ;
> (5) `_shared/` porte quatre fichiers `*2026` écrits à la main sans source de sync (`commercial2026`,
> `premium2026`, `premium2026_io`, `recomputeProgress2026`) ; (6) GRYD+ (cahier §16.1) contredit ADR-011 :
> les écrans existent, le SDK reste muet sans clé de production (`capability.ts`) — tension ouverte, App
> Privacy à déclarer le jour d'une clé. Audit de routes sous l'entrée du cahier : adapté le 10/09 (ré-exportations résolues, arbre d'imports suivi) : 56/80 routes atteignables depuis `/`, `/onboarding`, `/course` (reprise après crash), `/c/[code]`, `/callback` ; 16 orphelines, toutes documentées ; **les obligations App Store tiennent** : `/sign-in`, `/email`, `/confidentialite` (suppression de compte + export RGPD), `/code-conduite`, `/support` atteignables depuis `/` ; exit 0. Constats de l'audit, NON corrigés : (a) la quarantaine `(mvp)` n'est pas étanche : `app/_layout.tsx` rouvre `/course` (écran MVP) à la reprise après crash alors que la carte du cahier enregistre sur `/course-live`, deux écrans de course selon le chemin, et cette reprise finit sur `/carte` (carte MVP) ; (b) conflit de routes réel : `/profil` est servi par `(mvp)/profil.tsx` ET `(tabs)/profil.tsx` ; (c) huit écrans ont perdu leur unique porte dans la fusion, dont `/appel` (recours anti-triche : plus aucun joueur ne peut l'ouvrir) et `/course/analyse` (E27, court-circuité vers `/course-result`) ; (d) le tunnel `/setup/*` (E08 à E10) n'est plus dans aucun parcours.
> Migrations 0118-0128 et fonctions : appliquées en prod le 10/09/2026 (`supabase db push`, 120 appliquées, dernière 0128, aucune en attente), RLS réelle re-vérifiée (`verify:rls` vert), fonctions `ingest_run`, `progression_2026`, `sync_gryd_plus_access_2026` et `rc_webhook` (sans JWT, `config.toml`) redéployées — première exécution réelle de ces migrations sous PostGIS, réussie ; leur COMPORTEMENT (points 3 ci-dessus) reste à recetter. Build iOS EAS `e4f952c9` (profil preview, `--clear-cache`, HEAD `bb63031`) **FINISHED** le 10/09/2026 : première compilation des sources natives du module film, réussie ; IPA https://expo.dev/artifacts/eas/0iY6kaJiVH8wN5A_QOhOXwik6Xg2902_JLQfNzvMR6s.ipa (page https://expo.dev/accounts/iambelou/projects/gryd/builds/e4f952c9-f641-465c-8a8a-4b62ac380953). C'est le build à installer pour recetter l'app fusionnée sur iPhone. Aucune ligne du tableau ne bouge sur cette base.

> **11/09/2026 — recette par agents, corrections, sécurité, classement, défis, notifications (branche `claude/reprise-session-5a1692`).**
> **Recette** : quatre recettes statiques (entrée/compte, carte/course, profil/progression/GRYD+, crew/social/défis/notifs — ~110 constats, 26 P0) + une recette dynamique du parcours invité en preview web (démarrage, carte, porte de compte, gate 16 ans, e-mail, crew, saison, GRYD+, collection, sources, réglages, confidentialité : honnête de bout en bout, une seule alerte DOM). **Audit de sécurité offensif** : une faille CRITIQUE corrigée et appliquée en prod (`0129` : `sync_club_entitlements` SECURITY DEFINER ouverte à `anon` accordait cinq droits premium permanents à n'importe qui), une fonction orpheline en prod hors migration supprimée (`hex_claims_for_city`, contournait la RLS), matview `sector_control` fermée, TRUNCATE retiré à `anon`, `verify:rls` 11 → 18 vérifications ; **ouverts, consignés** : `flowType` implicite (vol de refresh token par une app Android déclarant le schéma `gryd` — PKCE casserait le lien inter-appareils, décision fondateur), session en AsyncStorage (→ `expo-secure-store`), signaux anti-triche `stepCount`/empreintes jamais transmis, `join_crew_by_code` sans limite de débit, `rc_webhook` chemin legacy sans relecture, vues `public_profiles`/`player_leaderboard` sans `security_invoker`.
> **Corrections livrées, gate vert** (151 migrations sans collision · 293 packages · 2 716 mobile · 1 643 fonctions · 67 SQL ; 3 fichiers PostGIS exécutables hors gate avec `GRYD_TEST_DATABASE_URL`) : ligne `user_profiles` créée à l'inscription (`0154`, le terrain d'un compte neuf était invisible pour tous) ; collision `/profil` levée (`(mvp)/profil-mvp`) ; refus d'âge = mur persistant ; suppression de compte annulée en silence désormais dite ; invitation par lien profond réel ; session rafraîchie avec `AppState`, expiration dite ; capture serveur : précision exigée aux extrémités seulement (plus `acc ≤ 15 m` à chaque point), une seule constante de trou (`POINT_MAX_GAP_S`), tolérance d'horloge 300 s (`0155`), fin des « en attente » éternels (`0156`, 24 h), budget de lecture de la carte avec simplification par zoom (`0157`), gain provisoire à l'ingestion (`0158`), sortie sans session récupérable, contrat de réponse `territory2026.status ∈ published | scheduled | pending | rejected | private | no_loop` + `reason` + `reasonDetail` ; client : reprise après crash sur `/course-live` avec chrono honnête, résultat gaté sur `published`, plus de « +0 km² » nu, 401/403 n'efface plus une sortie, discipline choisie d'un tap, carte à 4 états sans clignotement ni fausse carte, voix et haptique dans la chaîne vivante, `course/[id]` lit 2026 ; profil : 8 récompenses de niveau octroyées serveur (`0144`), `activeDays` ≠ `stage` (`0145`), motif d'un zéro XP, 7 états GRYD+ décidés serveur, Studio ouvert depuis la collection, Santé/Strava/Garmin à l'état réel ; vie privée : écran Confidentialité vrai (4 expositions : carte, fil, conversation, classement), réglages d'audience serveur (`0135`), signalement de profil (`0137`), modération par la direction + file (`0138`), blocage unifié et opposable à l'adhésion par code (`0139`), purge des médias (`0136`), export RGPD à 88 tables ; notifications : sept catégories §14.1 serveur (`0140`), moteur §14.3 (`0141`, budget 3/semaine, plage calme, dédup), plus aucune permission demandée pour un push impossible, jobs legacy neutralisés, notification locale « Ta sortie est analysée » branchée ; crew : lectures rebranchées sur 2026 (`0152`), trois réactions nommées et lien profond vélo (`0153`), blocage confirmé, langues restreintes à FR/EN (dette L18 : ~620 `copy()` inline), donnée factice dormante supprimée, avertissement DOM `accessible` réglé ; défis 5v5 : retrait impossible après clôture (`0148`), refus nommés (`0149`), mesure sur la trace validée (`0150`, `0169`), arènes publiées depuis une vraie géographie seulement (`0151` + fonction `challenges_arena_2026`, aucun seed) ; **ADR-013** : classement solo « Ta commune, cette semaine » (`0160`-`0164`, flux hebdomadaire, N = 5, job horaire, écran depuis la Carte), défis personnels de la semaine (`0165`-`0168`, objet jamais XP, expiration silencieuse, objets équipables depuis la collection) ; audit de routes propre (54/83 atteignables, quarantaine `(mvp)` étanche, 5 obligations App Store ✓).
> **Production** : migrations 0129 puis 0135-0169 APPLIQUÉES (151 appliquées, dernière 0169, aucune en attente) ; 17 fonctions Edge redéployées (dont ingest_run avec la signature de 0155, export_account, delete_account, challenges_arena_2026 nouvelle, rc_webhook sans JWT) ; verify:rls 18/18 ; job pg_cron leaderboard-snapshots-2026 posé (premier instantané : 0, aucune donnée). **Saison 0 configurée** (14/09 00:00 → 25/10 23:59 Europe/Paris, 12 modèles, 0 inscription avant l'heure, rejeu idempotent). Aucune arène 5v5 publiée : la commande refuse tant qu'aucune possession réelle n'existe (juste). **Tests de bout en bout** : harnais Playwright fusionné (apps/mobile/e2e, npm run test:e2e:parcours, 22 tests, réseau scellé, aucune écriture en prod) ; il a révélé, une fois débarrassé d'un serveur statique orphelin, une régression web (realMapAvailable absent de RealMap.web.tsx → écran de carte en garde-fou d'erreur, corrigée ea57d50) et l'instantané périmé de useOnboardingState (corrigé) ; harnais réécrit sur le LIEN MAGIQUE — le produit refuse le mode code sans preuve serveur — : 22/22 verts sur deux exécutions consécutives (f004546), cinq verdicts de /callback distingués, contre-preuve par mutation faite ; il ne prouve ni l'envoi réel de l'e-mail, ni le natif, ni la RLS.
> **Build iOS EAS `0a07b73c` (profil preview, HEAD `c86971c`) FINISHED le 11/09** : IPA https://expo.dev/artifacts/eas/AfppUSrf7Ik534CRxCTe_0MOLwlqZLJd0VfJbpNN1qw.ipa (page https://expo.dev/accounts/iambelou/projects/gryd/builds/0a07b73c-5acb-4afa-9f97-c0bdd736ed8e) — c'est le build à installer pour recetter sur iPhone. **Installé sur l'iPhone 14 Plus du fondateur le 11/09** (IPA `0a07b73c` posé et lancé par USB : `xcrun devicectl device install app` puis `process launch`, sans compilation locale) — la recette sur appareil peut commencer. Build LOCAL Xcode 26.6 : plateforme iOS 26.5 installée, CocoaPods en Ruby 3.3 utilisateur, plugin `withFmtXcode26` (fmt 11.0.2 vs clang 17) vérifié sur les pods ; la compilation complète n'a pas abouti faute de disque (Mac à moins de 3 Go libres). **Toujours NON prouvé** : tout ce qui exige un iPhone (GPS, reprise après kill, permission « Toujours », voix écran éteint, notification locale en arrière-plan, Sign in with Apple) ; la RLS sous un vrai rôle pour les tables 0135-0169 (`verify:rls` couvre 18 points) ; les trois fichiers PostGIS (aire, exclusivité) hors gate ; le rendu visuel de tous les écrans corrigés (aucun `ux-gate`). **Décisions fondateur** (ADR-013 §5 + audit) : APNs, N, 16 ans vs adultes, PKCE, `expo-secure-store`, dates de Saison 0 (posées par défaut), applinks `gryd.run`, région Etalab, ADR-010 à clore, ADR-011 vs GRYD+.

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
