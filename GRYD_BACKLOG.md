# GRYD — Backlog (consommé par le skill `/gryd-loop`)

Format : `- [ ] <titre> — <valeur> — <S/M/L>`. Fait → `- [x]` + hash de commit.
Priorité : valeur × faible risque × débloque le reste. Un item = un chantier
(skill `/gryd`), gate de vérif obligatoire avant commit.

## À faire — actionnable maintenant
_(vidé — les items actionnables ont été traités par le loop. Réalimenter depuis
les docs produit / retours fondateur pour continuer.)_

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
