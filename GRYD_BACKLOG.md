# GRYD — Backlog (consommé par le skill `/gryd-loop`)

Format : `- [ ] <titre> — <valeur> — <S/M/L>`. Fait → `- [x]` + hash de commit.
Priorité : valeur × faible risque × débloque le reste. Un item = un chantier
(skill `/gryd`), gate de vérif obligatoire avant commit.

## Refonte Spéc Maître Unifiée 2026 (priorité ACTIVE — « continue la transformation »)
> Réf : `docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md` + roadmap priorisée dans `CURRENT_STATE_CONFORMITY_MATRIX.md` (Row 1-15). Un Row = un chantier, gate complet. Décisions fondateur en attente = 6 arbitrages (photo onboarding §13.3, flags.season §16, Bike, grammaire analytics, vocabulaire rang, carte démo §7.2).

- [x] Row 1 · P0 — i18n Arsenal complète (catalogue + conseils + aperçus VoiceOver) + dead-code (RunModeSheet supprimé) — L — `65174d7` `9af259b` `638a3af`
- [x] Row 2 · P1 — Analytics §26 : friction/activation/conversion (5 events + super-props + t0→time_to_first_capture + skin_equipped émis) — M — `c5c0ca1`
- [x] Row 3 · P1 — Trace live sur l'écran de course (§10) : vraie polyligne GPS mesurée exposée au snapshot + LiveTraceThumb SVG §B, sans fond fabriqué (A-47) — M — `ff97bf6`
- [x] Row 4 · P1 — Profil (§12.2/§15.3) : crew réel (useRealCrew) + progression locale (seasonRankProgress) + prochaine mission (useRealMission) ; rival laissé en vide honnête (aucune source réelle) — M — `58babdf`
- [ ] Row 5 · P1 — Classements : échelle §16 navigable (quartier/ville/crew/amis) + spécialités + challenges territoire — L — DÉPEND décision flags.season
- [ ] Row 11 · P1 — Rail IAP réel (O3, RevenueCat) + purchase_*/subscription_* — L — BLOQUÉ O3
- [ ] Row 12 · P1 — Photo de profil publique (§14) — L — PROGRAMME séquencé, modération d'abord
- [ ] Rows 6-10, 13-15 · P2 — résultat post-course honnête, live 1 info, rang statutaire, design-system §22, formatteurs locale-aware, agrégation carte, Bike, humain onboarding — voir matrice

## Repositionnement mission-first (décision fondateur 21/07/2026, analyse stratégique vs INTVL)
> Réf : AMENDEMENT-41 + analyse stratégique INTVL (shared territories livré par INTVL 2026 — notre réponse = LE RELAIS). Les 4 comportements MVP à mesurer via PostHog : comprendre la capture / dévier son parcours / revenir après attaque / inviter.

- [x] Mission dynamique RÉELLE v1 (defend/expand/first_capture depuis hex_claims + GPS) — la feature-réflexe « où courir maintenant » — M (ce commit)
- [x] Crew réel 1/3 : créer/rejoindre/quitter RÉEL — RPC serveur (0042, SECURITY DEFINER, code généré serveur, cooldown 7 j, plafond 50 verrouillé FOR UPDATE) + écran natif honnête + règle pure testée — M (ce commit)
- [x] Crew réel 2/3 : union réelle sur la carte — les zones des membres actifs prennent le rôle chartreuse (§C « moi/mon crew »), frontières par propriétaire préservées (tap = qui tient quoi) — M (ce commit)
- [x] Crew réel 3/3 : conséquence collective au résultat — ligne RELAIS (déjà câblée, constat d'audit) + « Capturées pour ton crew — N coéquipiers les voient » sur roster réel — S (ce commit)
- [ ] Boucle de retour asynchrone — notification « ta zone expire dans 48 h / a été prise » (decay serveur déjà réel, notifs à câbler) — M
- [ ] Mission v2 : secteurs réels + rival réel (sector_snapshot 0037 + activité 0040) quand la densité existe — M
- [ ] DÉCISION FONDATEUR : couche PvE étiquetée (forteresses « système ») vs objectifs solo purs — attendre les 1res données de rétention — S (décision)
- [x] « Ensemble ça tient » : lock-extension rétroactive par les relais (retroactiveLockUntil pur + ingest service-role, gardes owner + claimed_at en plage 1 ms) — DÉPLOYÉ prod — M — `a482d63`
- [ ] Séparation plausible des traces (anti multi-téléphone A-41 §6) — L

## Boucle A-45 — les 7 actions propres (arbitrage marge + compromis, 21/07)
> Réf : [AMENDEMENT-45](AMENDEMENT-45-MARGE-ET-COMPROMIS.md). Un chantier = un lot committé, gate complet. Les 5 contradictions sont TRANCHÉES (Pass sans notifs prioritaires ni Cristaux, pas de fatigue territoriale, Zone Légendaire hors carte des autres, pas de selfie, bouclier/scout gagnables et non achetables).
> RAPPEL MARGE : les achats intégrés plafonnent à 85 %. Les 90 % viennent du sponsoring territorial (~99 %) et de l'événement réel (~95 %), qui exigent d'abord de la DENSITÉ — d'où la priorité maintenue sur la boucle virale.

- [ ] L1 — Série VISIBLE (le moteur streak existe, rien ne l'affiche) — meilleur ratio valeur/effort — S
- [ ] L2 — Messages crew CONTEXTUELS (10-15 selon défense/attaque/rassemblement) — S
- [ ] L3 — Zone du Jour dérivée du RÉEL (état honnête si aucune ne convient) — M
- [ ] L4 — Défi 7 jours d'accueil (réutilise challenge_progress, 0012) — M
- [ ] L5 — Ping de zone (coordination sans chat libre) — M
- [ ] L6 — Programme ambassadeur : le DOCUMENT (critères, contreparties, budget) — S
- [ ] L7 — Widget compte à rebours « Canal tombe dans 2 h » — M — BLOQUÉ O8 (extension native)
- [ ] L8 — Sponsoring territorial : le produit à 99 % (défi financé, étiqueté, zéro avantage vendu) — L — attend la densité

## Doctrine Crew MVP (AMENDEMENT-43, document fondateur du 20/07)
> Audit fait : les 18 exclusions sont DÉJÀ toutes inaccessibles en natif (0/18) — pas d'arbitrage à prendre. Le serveur calcule déjà territoire + contribution ; personne ne les lit. Les trous sont en LECTURE et en VIRALITÉ.

- [x] LOT 0 — arrêter de mentir : `/crew-discovery` + `/crew-public` (crews INVENTÉS, atteints depuis l'onboarding) sous flag vitrine, « 3 crews près de toi » retiré, faux QR remplacé — S — `51a6dce`
- [x] Bug serveur : le créateur d'un crew n'était pas chef (0043, backfill idempotent) — DÉPLOYÉ prod — S — `51a6dce`
- [x] LOT 1 — territoire du crew + contribution par membre, lus FRAIS via `crew_overview()` (0044) ; `crew_leaderboard` (vue morte) annotée, jamais lue ; agrégat opt-in — DÉPLOYÉ prod — M — `0dd9421`
- [ ] LOT 2 — viralité qui boucle : route `/c/[code]`, réception du deep link (`Linking`), `associatedDomains`/`intentFilters` — **BLOQUÉ : décision domaine gryd.app vs gryd.run** — M
- [ ] LOT 3 — mission crew prioritaire (`defense_missions`/`offensives` existent en base, jamais insérées) — M
- [ ] LOT 4 — funnel d'attribution réel (events jamais émis, `referrals` sans colonnes, badge Recruiter inatteignable) — M
- [ ] Modération serveur du nom de crew (insultes/usurpation) — exigée §1, absente — risque App Store — M
- [ ] DÉCISION FONDATEUR : bouclier + scout_ping payants touchent la capture (contredit §4 + constitution) — S (décision)
- [ ] DÉCISION FONDATEUR : modèle de monétisation (abonnement+monnaie existant vs 4 packs permanents de la doctrine) — S (décision)
- [ ] Prix EUR en dur dans l'Arsenal (`arsenal.tsx`, `ArsenalItemCard.tsx`) → `product.displayPrice` — viole §23 + règle Apple — S

## « La fiabilité est le produit » (analyse INTVL n°2, 21/07 — leurs reviews négatives = runs perdus)
> L'infra existe déjà : autosave trace 30 s (runStore), reprise après kill (double clé), file d'upload idempotente (D14), RestoreRunCard, états de signal honnêtes. Ce qui manque n'est pas du code : c'est la PREUVE terrain.

- [x] Alerte haptique GPS perdu en course (fort à la perte, léger à la récup, muet en pause) — le coureur regarde la route, pas l'écran — S — `9716943`
- [ ] TORTURE TEST TERRAIN (fondateur, aucune ligne de code) : run réel avec kill volontaire de l'app à mi-course → reprise → upload ; run en mode avion → file → sync au retour ; tunnel/bâtiment → signal lost → récup. Chaque échec devient un chantier P0 — S
- [x] « Où est mon run » : pill « 1 course à synchroniser — toucher pour envoyer » au-dessus de GO (hasPendingUpload + relance manuelle), disparaît sitôt envoyée — S (ce commit)

## PRIORITÉ ABSOLUE — MVP_CHANGESET (validé fondateur 17/07, verdict NO-GO à lever)
> Réf. opérations exactes : [MVP_CHANGESET.md](MVP_CHANGESET.md). Pas de push/deploy sans « pousse ».

### P0 — cœur (vraie personne → vraie capture → vraie zone visible → mesurée)
- [x] C1+B1+B2 Résultat honnête (3 chemins : jugé/en-file/démo) — `9d24465`
- [x] C5 Refresh carte post-capture (useFocusEffect, 1er focus sauté, parité native/web)
- [x] C2+C3 Never lose a run (4xx≠réseau, 429 réessayable, session-null→file, statut 'rejected')
- [x] C4+D3 cityId dérivé serveur + 4 tests contours réels (DÉPLOIEMENT ingest_run REQUIS — feu vert « pousse »)
- [x] D2+C6 Mesure d'activation : claim_result/loop_closed/loop_almost_closed émis depuis la réponse serveur + event_id/UTC dans le wrapper
- [x] D1 Email OTP (requestEmailOtp/verifyEmailOtp + UI 2 étapes) — ⚠️ fondateur : template e-mail doit afficher {{ .Token }}
- [x] B4/C7 « Mon territoire » étiqueté démo (dataNote canonique) — branchement réel = chantier secteurs à part
- [x] B5 Bouton Google caché tant que EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID absent (fait avec D1)

### WIDGET « Mon territoire » (spec fondateur 17/07 — formule : possession + changement + action)
- [x] W1 Fondation pure (8 états, priorité stricte, copie spec, 7 tests, events §8)
- [x] W2 Widget carte (réel : first_capture/stable/loop_incomplete/share_moment ; démo → MissionPeek inchangé ; action=LIEN anti double-CTA)
- [x] W3 Widget compact au profil (remplace le résumé démo quand le réel existe, même fondation)
- [ ] W4 Widget OS iOS/Android + Live Activity — BLOQUÉ O8 (extension native + dev build + Apple) — L

### P1 — boucle virale
- [x] D5+D6 Export story PNG (view-shot+sharing posés, shareAsImage + share_exported, filet texte web) — vérif device au dev build
- [x] Story épurée 5 éléments (retour fondateur : Résultat massif · trace en GRAND · Impact · Identité · Défi seule capsule ; privacy → légende sous l'aperçu ; titres jamais coupés web+natif) — `66192b0`
- [x] C8+C9+B3 Card honnête (verified serveur, rang null neutralisé, beforeState masqué, signature sans KORO) + ShareMap cadre la vraie trace
- [x] D4 Guidage live de boucle réel (loopHint pur : écart vol d'oiseau départ↔courant, seuils serveur game-rules, « BOUCLE PRÊTE » chartreuse ; test:map 22→26) — `7f92d7e`
- [ ] C11 Migration pilote mono-ville — REQUALIFIÉ BLOQUÉ FONDATEUR : désactiver Lille contredit CLAUDE.md (« Saison 0 Paris + Lille ») — arbitrage produit requis
- [x] D8 Feature flags minimal (flags.ts season/warRoom/arsenal, EXPO_PUBLIC_FULL_SURFACE=1 ré-affiche ; nav 3 onglets + GO, gardes de route Redirect, tous les liens d'entrée gatés) — `4fdeec4`
- [ ] C10+D7 Deep links réception — BLOQUÉ arbitrage host (gryd.run vs gryd.app, fondateur) + hébergeur AASA — L

### Rappels fondateur (hors repo)
- [ ] A1 Activer provider Apple (dashboard) + test iPhone neuf · A2 confirmer POSTHOG_KEY dans build EAS · A3 trancher host deep links

## À faire — actionnable maintenant
### Map — retour fondateur (clarté) : hiérarchie `a4acca9` + fond `297a2ec` + territoires `aeb2778` FAITS ; reste :
- [x] Tracés différenciés : recommandée = chartreuse pointillé vs course = plein épais vs rival = orange — commit route dash
- [ ] Parité NATIVE du fond atténué : porter les surcharges dark-matter (bâtiments/routes/labels) sur RealMap.tsx (aujourd'hui web-only) — M
- [ ] Badge crew/rival posé sur la zone dominante + contesté « plat clignotant » (renfort d'identité) — `mapStyle.ts` sectorStatus — M
### Map (filtres + tap — audité, prêt à câbler)
- [ ] Filtres carte → 4 (Carte/Attaque/Défense/Crew) : relabel MAP_MODE_ORDER + emphase Crew — `territory.ts` + `BattleMapOverlays` — S/M
- [ ] Zones tappables → ouvrir la sheet au tap (onPress carte niveau lng/lat + hit-test secteur, SIMPLE per audit) — `MapScreen` + `BattleMapOverlays` — M
### Map (socle déjà là : 8 états, LOD 3 niveaux, bottom-sheet, mapStyle)
- [ ] Filtres carte : relabel des 5 « Calques » vers 4 (Carte/Attaque/Défense/Crew) + ajouter le mode Crew — `map/territory.ts` + `BattleMapOverlays.tsx` — S/M
- [ ] Zones tappables → ouvrir la bottom-sheet au tap (aujourd'hui ouverte par le FAB Info) — `BattleMapOverlays.tsx` + `MapBottomSheet` — M
### Courses en groupe (fondation moteur + badges FAITE `9c96cac` ; reste le wiring + 3 mécaniques)
- [ ] DEPLOY ingest_run (bonus de groupe live câblé + testé — `442d631`) : `supabase functions deploy ingest_run` pour l'activer en prod (outward-facing, feu vert fondateur)
- [ ] Crew shield à l'échelle du territoire crew (étendre le shield zone/joueur existant) — M
- [ ] Objectifs crew QUOTIDIENS (board reset chaque jour ; l'hebdo + coffre login existent) — M
- [ ] Zones « crew-only » (proche : outpost) — M/L
- [ ] Câbler `crewStreakTier` (fonction pure + seuils faits) dans le digest/affichage crew — S
### GRIP
- [ ] GRIP dans les surfaces many-players (classement + membres crew) : mini-GRIP par joueur avec LOD/perf (§C jamais 200k) — M
- [ ] Icônes façon Apple : remplacer les Lucide/génériques écran par écran par un jeu SF-like propriétaire (outline/filled/hiérarchique) — L
- [ ] Badges façon Apple Fitness : médaillons à anneau de progression, branchés sur le moteur de badges existant — M
- [ ] GRIP : assets vectoriels de prod à partir des fichiers sources fondateur (remplacer les SVG de référence) + polish accessoires (loupe Scout, basket Runner plus nets) — S

## En attente d'un retour utilisateur (ne pas boucler dessus)
- [ ] Carte satellite : ajuster les curseurs `SAT_CORE_WIDTH_MULT / SAT_LINE_ALPHA_BOOST / SAT_FILL_BOOST / SATELLITE_DIM` après capture d'écran du fondateur — S
- [ ] Direction artistique « bold » : décliner la DA choisie (C+A+B) sur Missions / Résultat / Profil / Carte, puis inscrire dans les tokens — L

## Bloqué sur un O-item (l'utilisateur doit lever le blocage — ne pas simuler)
- [ ] IAP réel (paywall Apple) — O3 RevenueCat (compte + clés)
- [ ] Import Apple Santé / HealthKit réel — O8 (Apple Developer + dev build EAS)
- [ ] Clés API Strava + abonnement API — O7
- [ ] Pages légales : hébergeur du site (mentions légales) + adhésion médiateur de la consommation (CGV) — données société à fournir
- [ ] Clearance marque INPI avant usage public de « GRYD »
- [ ] PostHog : clés projet (events §8 déjà nommés, câblage à finir)

## Fait (récent)
- [x] **A-46 — Parcours personnalisés par les habitudes réelles** : moteur pur `habits.ts` (médiane+MAD, seuil d'honnêteté, zéro géographie), RPC 0054/0055 bornées à `auth.uid()`, écran `mes-parcours` (déduit / cible / apprentissage / oublier). Corrige au passage une RPC fantôme (`run_habit_profile`) et deux stores homonymes qui rendaient les réglages inertes — `f786bbd`, 743 tests + 42 contrôles PGlite, migrations appliquées en prod
- [x] Carte = interface de décision (retour fondateur) : alerte tactique forte en haut + card DÉFENDRE contextuelle en bas au-dessus du bouton + suppression des mini-pills au centre — `a4acca9`
- [x] Carte : coach « opportunités proches » (module pur + tests + bandeau OpportunityPill, informatif sans CTA) — `e55cddc`, 508 tests
- [x] Bonus de groupe ACTIF en live : ingest_run compte les coéquipiers same-crew (rivaux exclus) → lock étendu — `442d631`
- [x] Bonus de groupe câblé au MOTEUR : le LOCK (= remplissage du contrôle) tient +% en course de crew via `DecideClaimsContext.runners`, capé +40 %, solo inchangé, tests — `8a3c596`, 497 tests (activation live = compte same-crew, à suivre)
- [x] Avantages de groupe (fondation) : bonus de capture collectif CAPÉ +40 % (pur+testé, anti-P2W) + crew streak + 4 badges de groupe — `9c96cac`, 494 tests
- [x] Carte : trait du parcours DOUBLÉ (trace courue + route + PARCOURS/ROUTE ×2, rival laissé plus fin) — `9b2be25`
- [x] Nav ultra-simple 4 slots : Carte · Crew · [RUN central permanent] · Moi ; Missions/Saison sortis de la barre (→ Moi) — `f1edd1c`
- [x] GRIP au partage & célébration : slot `mascot` ShareCard (6 templates /partage) + Profil share (central) + héros course-result — `8452db7`
- [x] Personnage GRIP : 7 poses = 7 rangs dérivés du niveau existant, câblé au Profil (module Progression), anti-P2W — `aff8ccc`, 481 tests
- [x] Consolidation monétisation : freemium + abonnement unique GRYD Club + boucliers sortis du sub (SHIELD_CLUB_INCLUDED_PER_WEEK 1→0) — `cec7f82`
- [x] Anti-harcèlement : protection « capture fraîche » 6 h (moteur, sans migration, ingest_run redéployé) — /gryd-loop tour 3, 480 tests
- [x] Crew Perks UI : affichage des perks par niveau (débloqués/verrouillés) — /gryd-loop tour 4
- [x] Import GPX : adaptateur + parseur pur (alternative gratuite à Strava) — /gryd-loop tour 5
- [x] Sources : Strava passé en 'soon' (API désormais payante O7) — Apple Santé/Health Connect en tête (gratuits) — /gryd-loop tour 2
- [x] Carte : couche de guerre lisible aussi sur fond `color` (Voyager) — `22454eb`
- [x] AMENDEMENT-34 delta Clash (crew 50 + top 30, Raid Weekend 48h, Revanche 24h, colle quotidienne) — `b20c6e7`, 473 tests
- [x] GRYD Territory Engine : runTerritoryEngine (#1) + runCrewBoundaryClose (#8) unifiés + déployés — `0b417fd`
- [x] Carte : lisibilité de guerre sur satellite (dim + casing + core boost) — `e4cd502`
- [x] Pages légales web (mentions légales + CGV) + identité Nexus 1993 (RCS Paris) — `8d23038`
- [x] AMENDEMENT-33 : conformité App Store (modération UGC, permissions, suppression compte) — `74e1d5c`
- [x] Audit boutons (352) + parcours (166 transitions) — `47a7bf6` / `7e61cd0`
