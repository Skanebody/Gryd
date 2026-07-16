# GRYD — Backlog (consommé par le skill `/gryd-loop`)

Format : `- [ ] <titre> — <valeur> — <S/M/L>`. Fait → `- [x]` + hash de commit.
Priorité : valeur × faible risque × débloque le reste. Un item = un chantier
(skill `/gryd`), gate de vérif obligatoire avant commit.

## PRIORITÉ ABSOLUE — MVP_CHANGESET (validé fondateur 17/07, verdict NO-GO à lever)
> Réf. opérations exactes : [MVP_CHANGESET.md](MVP_CHANGESET.md). Pas de push/deploy sans « pousse ».

### P0 — cœur (vraie personne → vraie capture → vraie zone visible → mesurée)
- [x] C1+B1+B2 Résultat honnête (3 chemins : jugé/en-file/démo) — `9d24465`
- [x] C5 Refresh carte post-capture (useFocusEffect, 1er focus sauté, parité native/web)
- [x] C2+C3 Never lose a run (4xx≠réseau, 429 réessayable, session-null→file, statut 'rejected')
- [x] C4+D3 cityId dérivé serveur + 4 tests contours réels (DÉPLOIEMENT ingest_run REQUIS — feu vert « pousse »)
- [x] D2+C6 Mesure d'activation : claim_result/loop_closed/loop_almost_closed émis depuis la réponse serveur + event_id/UTC dans le wrapper
- [ ] D1 Email OTP : signInWithOtp/verifyOtp dans sign-in (filet indépendant d'Apple) — M
- [ ] B4/C7 « Mon territoire » honnête : étiquette démo (minimum) ou branché réel — S
- [ ] B5 Cacher le bouton Google mort tant que client id absent — S

### P1 — boucle virale
- [ ] D5+D6 Export story PNG 9:16 : deps view-shot/sharing/media-library + captureRef + shareAsync + events share_exported — M
- [ ] C8+C9+B3 Purge des inventions de la card (rang #8/Paris Est, verified:true ×8, « Contestée ») + ShareMap fit sur vraie zone — M
- [ ] D4 Guidage live de boucle : « il manque N m » porté du flux démo vers RealCourseLive — M
- [ ] C11 Migration pilote mono-ville : une seule saison active + polygone resserré — S
- [ ] D8 Feature flags minimal : masquer season/shop/arsenal/war_room — M
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
