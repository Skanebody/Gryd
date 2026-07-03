# AMENDEMENT-02 — Intégration du corpus GRYD (03/07/2026)

**Statut : actif. Modifie la SPEC MVP v0.1 et l'ADDENDUM DESIGN v0.1.**
Source : les 18 documents `docs/product/GRYD_*.md`, dont `GRYD_MASTER_SPEC.md` (nouvelle source de vérité produit). En cas de conflit : **MASTER_SPEC > cet amendement > SPEC v0.1**. Les chiffres §3 de la SPEC v0.1 restent gelés sauf mention explicite ci-dessous.

---

## 1. Nom et positionnement
- **Nom public : GRYD** (« KLAIM » abandonné). Baseline inchangée : « Cours. Capture. Défends. »
- Positionnement : **« Le jeu de conquête de territoire pour run clubs. »**
- Nom store : `GRYD: Run the City` (cf. `GRYD_store_submission.md`). Clearance INPI/EUIPO toujours à faire avant usage public.
- Conséquences repo : strings user-facing (app.json, metadata web, maquette, share cards) → GRYD. Le dossier/repo peut rester tel quel (interne).

## 2. Carte : la France entière (remplace le city-gating strict de la SPEC §3.1)
```
France entière = capturable.
Densité locale = niveau de guerre.
Zone rurale = exploration + avant-postes.
Zone dense = attaque + défense + PvP.
```
- La table `city_zones` est généralisée : statuts `active | emerging | pioneer | wild` (plus de `waitlist` bloquant — une course hors zone dense capture quand même).
- **Mode Guerre** (raids, alertes de vol, titres de quartier, zones contestées) activé par densité : seuil MVP = 20 coureurs actifs/30 j dans un rayon de 5 km. Paris + Lille sont seedées `active` d'office pour la Saison 0.
- 4 couches cartographiques : **hex (H3 res 10) → cluster → secteur → zone/ligue**.
- **Secteurs** : statut de contrôle par % d'hexes possédés : 0-10 % présence · 10-30 % implantation · 30-50 % contesté · 50-70 % contrôlé · 70 %+ dominé.
- **Jamais de remplissage d'intérieur de boucle** : seuls les hexes traversés sont capturés. « Une ligne prend un axe. Un maillage prend un quartier. »
- Zones non capturables (autoroutes, zones militaires…) : table dédiée, traversables sans claim.

## 3. Scoring (précisions, chiffres Saison 0 gelés)
- Barème inchangé : +10 neutre, +15 volé, +3 défendu (1×/24 h/hex).
- **Bonus pionnier devient variable par densité** (remplace le +5 unique) : **+5 zone dense · +8 zone émergente · +10 zone sauvage/pionnière**.
- **Bonus performance : plafonné à +15 %** (modificateur ×0,90-×1,15), calculé vs l'historique personnel — jamais dominant. MVP : appliqué simplement (régularité + fiabilité des données), raffinement V1.
- 4 scores séparés : territoire (saison), performance (sportif), crew (collectif), réputation (permanent). MVP : territoire complet + performance minimal ; crew/réputation = agrégats simples.

## 4. GRYD Verify (anti-triche, étend SPEC §6.4)
- Statuts de course : `valid | partial | flagged | rejected` (**ajout de `partial`** : segments douteux exclus, le reste claim).
- Trust score MVP = règles §3.2 existantes + cohérence pas/distance quand dispo (podomètre) + colonnes `trust_score`, `motion_trust`, `gps_trust` sur `runs` (nullable, remplies au fil des versions).
- Messages UX non accusatoires (cf. `GRYD_verify_...md §18`). Motion intelligence complète (accéléromètre/gyro/Activity Recognition) = V1.

## 5. Navigation : 5 onglets (remplace les 3 de l'addendum §F)
**Carte · Crew · Classement · Boutique · Profil** — bouton COURIR flottant au-dessus de la nav (inchangé, disque 72 px chartreuse).
- Page **Performance** : PAS un onglet — accessible depuis Profil et Résumé de course (cf. `GRYD_page_performance...md §2`).
- Inbox : icône depuis la carte.

## 6. Progression (ajouts MVP légers)
- **XP joueur + niveau permanent** (séparé des points de saison, jamais acheté, survit au reset).
- **Missions** : MVP = 5 missions d'onboarding + 1 objectif du jour + missions hebdo simples (cf. `GRYD_missions_quests.md §9`). Coffres = V1 sauf coffre hebdo simple.
- Badges : ~20 de base (distance, conquête, défense, crew, performance) + rangs **Bronze → Silver → Gold → Carbon → Elite → Legend** (système Shoe Rank, cf. motion design doc).
- Ce qui survit au reset de saison : compte, niveau/XP, badges, titres, skins, posters, records, réputation, crew (cf. `GRYD_reglement_saison_0.md §3`).

## 7. Notifications (confirme et précise SPEC §4.3)
- Max 2 push/jour, quiet hours 21h-8h, digest groupé, priorités P0-P6 (cf. `GRYD_notifications_logic.md`).
- Interdits absolus : position d'autrui, anxiogène nocturne, push par micro-vol.

## 8. Ce qui reste OUT du MVP (confirmé par MASTER_SPEC P1/P2)
Raids live, offensives crew formelles, QG/fort, routes de ravitaillement, GRYD Pass, boutique quotidienne, coffres avancés, artefacts (Radar/Scout/Bannière), sponsors, dotations, ML anti-triche, page admin complète (MVP = vues Supabase + liste courses flaggées), diplomatie. Avant-postes : **version basique seulement** (détection 100 hexes/rayon 2 km → badge + entrée DB), le reste V1.

## 9. Impacts base de données (migrations à amender)
- `runs` : status accepte `partial` ; colonnes `trust_score`, `gps_trust`, `motion_trust`, `step_count` (nullable) ; `xp_awarded`.
- `users` : `xp`, `level`.
- Nouvelles tables : `sectors(id, city_id, name, type, geojson, total_hexes)`, `sector_control` (vue matérialisée : crew_id, owned_hexes, control_percent, status), `outposts(id, crew_id, user_id, center_h3, hex_count, created_at)` (V0 minimal), `no_capture_zones(geojson, reason)`, `missions` + `mission_progress` (MVP simple), `badges` + `user_badges`.
- `city_zones.status` : `active | emerging | pioneer | wild` (remplace `open | waitlist`).
- La waitlist par code postal reste (marketing/densité), mais ne bloque plus la capture.

## 10. Impacts packages/shared
- `game-rules.ts` : PIONEER_BONUS par densité, PERFORMANCE_BONUS_CAP (1.15) / FLOOR (0.90), seuils secteur, seuil mode Guerre, statut `partial`, conditions avant-poste, XP de base par course.
- `types.ts` : RunStatus + `partial`, ZoneDensity, SectorControlStatus.
- `events.ts` : ajouts performance/missions/notifications (`performance_page_viewed`, `mission_completed`, `push_suppressed`…).

## 11. Design (complète l'addendum, ne le remplace pas)
- Palette/typo/tokens inchangés. Univers d'objets « running premium » (semelle, carbone, gel) — jamais fantasy (cf. motion design doc).
- Jauge signature « semelle », raretés Common→Legend, médailles Bronze/Silver/Gold/Carbon/Elite/Legend : V1 pour l'essentiel, MVP = jauges capsule simples + 20 badges.

## 12. Arbitrages assumés (à trancher avec le fondateur si désaccord)
- A1. La Saison 0 reste **focalisée marketing sur Paris + Lille** (crews fondateurs, densité) même si toute la France est capturable — le MASTER_SPEC l'exige et ça règle le cold start rural par l'exploration.
- A2. Le **pass de saison reste v1.1** malgré le doc monétisation (le doc lui-même dit MVP = Club + Starter + Éclats).
- A3. Secteurs MVP = **auto-générés simples** (grille H3 res 7 nommée par géocodage inverse différé) — pas de découpage éditorial quartier par quartier avant la bêta.
- A4. `partial` est implémenté dès le MVP dans ingest_run (c'est un statut, pas une techno) ; la motion intelligence qui l'alimente finement arrive en V1.
