# SPEC MVP — « KLAIM » v0.1
### Jeu de conquête de territoire par la course à pied — France (Paris + Lille)
> **Nom de code uniquement.** Clearance INPI/EUIPO (classes 9, 41, 42) obligatoire avant tout usage public. Statut : non vérifié.
>
> **Objet du document :** définir le plus petit produit qui (1) valide la boucle course → capture → aversion à la perte → re-course, (2) est constructible en ~14 semaines par un fondateur + Claude Code, (3) encaisse de l'argent dès le jour 1.
>
> **Ce que ce document n'est pas :** la vision complète. Le fort/économie Clash, les guerres de crews formelles, le pass de saison à paliers, les sponsors et le vélo sont volontairement ABSENTS (voir §14).
---
## §0. Résumé exécutif
- **Produit :** app mobile (iOS d'abord, Android en bêta S13-14) où chaque course revendique des hexagones sur la carte réelle de sa ville. Les crews (2-10 coureurs) cumulent leur territoire. Saisons de 8 semaines avec classements par ville.
- **Différenciation vs INTVL :** crew-first, français natif, capture sans friction (import Apple Watch/HealthKit), protection anti-frustration (locks, decay, protection nouveau joueur), vie privée par défaut.
- **Lancement :** Saison 0 « Fondateurs » sur 2 villes seulement — Paris (intra-muros + petite couronne) et Métropole de Lille. Jamais de lancement national diffus : la densité locale est la contrainte n°1 d'un jeu de territoire.
- **Monétisation MVP :** abonnement Club (4,99 €/mois — 34,99 €/an) + Starter Pack 2,99 € + monnaie premium « Éclats » + 4 skins de territoire. Le pass de saison arrive en v1.1.
- **Interdits absolus :** vendre du territoire, des km, des stats PvP, des boucliers illimités. L'argent achète du confort, du prestige et de l'accès — jamais de la domination.
- **Cibles Go/No-Go à S0+8 semaines :** activation ≥ 45 %, D30 ≥ 10 %, ≥ 30 % des actifs en crew, conversion payante ≥ 2 % à 60 j. En dessous : on itère la boucle, on ne scale pas.
---
## §1. Hypothèses à valider (et rien d'autre)
Le MVP existe pour tester 4 hypothèses, dans cet ordre de risque :
| # | Hypothèse | Métrique de validation | Seuil |
|---|-----------|------------------------|-------|
| H1 | La capture de territoire fait courir plus (boucle cœur) | Fréquence de course des retenus S4 | ≥ 2 courses/sem |
| H2 | La perte de territoire fait revenir (ré-engagement) | Taux de retour < 72 h après notif de vol | ≥ 35 % |
| H3 | Le jeu se propage par les crews et le partage | Invitations acceptées / utilisateur actif | ≥ 0,25 |
| H4 | Une minorité paie pour du confort/prestige | Conversion payante à 60 j | ≥ 2 % |
Tout ce qui ne sert pas directement H1-H4 est hors périmètre.
---
## §2. Périmètre : IN / OUT
### 2.1 — IN (les 6 blocs du MVP)
1. **Carte-jeu H3** (écran d'accueil) : territoires en temps quasi réel, couleurs de crews, son cluster, bouton COURIR.
2. **Tracking + capture** : GPS foreground fiable, validation serveur, attribution d'hexagones, célébration post-course < 3 s.
3. **Crews** : créer/rejoindre par code ou lien, couleur, territoire cumulé, 2 classements ville (joueurs, crews).
4. **Saison 0** : 8 semaines, points, streaks, badges Fondateur permanents, reset final avec poster-souvenir.
5. **Capture sans friction** : import HealthKit (Apple Watch et autres apps) avec flux « Réclame ton territoire ». Health Connect = phase bêta Android.
6. **Monétisation + croissance câblées** : RevenueCat (Club, Starter, Éclats, skins), carte de partage 1-tap, parrainage, notifications de ré-engagement, waitlist par code postal (site Next.js).
### 2.2 — OUT (coupé volontairement, avec la raison)
| Feature | Raison de la coupe | Retour prévu |
|---|---|---|
| Pass de saison à paliers | 2-3 sem d'UI + design d'économie ; retarde la validation de H1-H2 | v1.1 (S0+4 sem) |
| Guerres de crews programmées | Nécessite matchmaking + calendrier ; les classements suffisent pour H3 | v1.1 |
| Fort / QG (économie Clash : ouvriers, timers, gemmes d'accélération) | Couche de monétisation profonde ; se pose sur un jeu qui retient déjà, jamais l'inverse (précédent : le Gold Pass ajouté à CoC 7 ans après le lancement) | Saison 2-3, en événement majeur |
| Vélo / marche | Détruit l'équilibre (surface couverte ×4) ; anti-triche plus dur | Marche : mode Explorateur v1.2. Vélo : carte séparée ou jamais |
| Coach / plans d'entraînement | Hors boucle cœur ; Strava/Runna le font mieux | v2, léger |
| Feed social, DM, commentaires | Coût de modération ; le crew chat minimal suffit | Jamais en v1 |
| Replay 3D | Coûteux ; la carte de partage statique/animée 2D suffit pour H3 | v1.2 |
| Intégrations Garmin/Coros/Polar directes | HealthKit/Health Connect couvrent ~80 % des cas montre | v1.1 (Garmin d'abord) |
| Dotations réelles (prix, dossards) | Interdites tant que App Attest / Play Integrity ne sont pas en place (triche + risque de qualification loterie) | Saison 1 |
| Web app, mode invité avec fusion de compte, Live Activities | Confort, pas validation | v1.x |
---
## §3. Règles du jeu v0 (chiffres gelés pour la Saison 0)
### 3.1 Grille de territoire
- **H3 résolution 10** (arête ~66 m, ~0,015 km²/hex). Précédent marché : Stride utilise des tuiles d'environ 60 m. Une sortie urbaine de 5 km traverse ~70-90 hexes.
- Capture = hexes intersectés par la trace validée (buffer 15 m autour de la polyline pour tolérance GPS).
- La carte de jeu est bornée aux `city_zones` ouvertes (GeoJSON Paris + Lille). Hors zone : la course est trackée et comptée en stats, aucun claim (message clair à l'utilisateur + inscription waitlist de sa ville).
### 3.2 Validité d'une course
- Distance ≥ 1,0 km ; durée ≥ 6 min.
- Allure moyenne ∈ [2:50 ; 10:00] min/km (borne basse anti-vélo).
- Filtrage des points : précision GPS ≤ 25 m ; vitesse instantanée > 25 km/h → point rejeté ; saut > 100 m entre points consécutifs → segment coupé.
- Segments à allure hors [2:30 ; 12:00] min/km exclus du claim (la course reste enregistrée).
- Import HealthKit : mêmes règles, appliquées à la route importée ; source marquée `healthkit`.
### 3.3 Propriété, vol, protection
- **Dernier passage valide prend l'hex.**
- **Lock 24 h** : un hex fraîchement capturé est involable pendant 24 h (anti ping-pong).
- **Protection nouveau joueur** : territoire d'un compte de < 14 jours involable (et exempt de decay).
- **Decay** : hex non re-parcouru depuis **21 jours** → redevient neutre. Notification à J-3 (« ton quartier s'efface »).
- **Bouclier** : protège un cluster contigu ≤ 300 hexes pendant 48 h. Club : 1/semaine inclus. +1 achetable (90 Éclats). **Cap absolu : 2 boucliers actifs/joueur/semaine.** Zone bouclier visible par tous (fair-play).
### 3.4 Points, streaks, monnaies
- Points de saison : **+10** hex neutre, **+15** hex volé, **+3** hex défendu (re-parcourir son hex, max 1×/24 h/hex), **+5** bonus « pionnier » (hex jamais possédé de l'histoire de la carte).
- Streak hebdomadaire (≥ 2 courses/sem) : multiplicateur +10 %/semaine consécutive, **cap ×1,5**. Gel de série : 1/mois offert (Club : 2). Une série cassée sans filet = churn ; le pardon est une feature.
- **Foulées** (monnaie douce, persistante) : 10 % des points gagnés. Sinks MVP : 2 skins earnables (800 / 1 500 Foulées), renommage de crew (300).
- **Éclats** (monnaie premium) : achetés uniquement. Sinks MVP : skins premium (180-280), bouclier supplémentaire (90). **Les Éclats n'achètent jamais : hexes, points, Foulées, stats.**
### 3.5 Crews
- 2 à 10 membres. 12 couleurs. Rejoindre par code 6 caractères ou deep link.
- Territoire crew = union des hexes des membres (rendu à la couleur du crew).
- 2 classements par ville : joueurs (points) et crews (hexes détenus + points cumulés).
- Cooldown de changement de crew : 7 jours (anti-mercenariat de fin de saison).
> **AMENDEMENT-01 (Addendum design §D)** : le rendu « 12 couleurs de crews » est remplacé par le rendu égocentré monochrome + accent chartreuse. Les 12 couleurs restent en DB (identité de crew), la différenciation visuelle des adversaires se fait par motif + étiquette.
### 3.6 Saison 0 « Fondateurs » (8 semaines)
- Récompenses **exclusivement virtuelles** : badge Fondateur permanent, skin exclusif jamais réédité, titres locaux (« Gardien·ne de [quartier] » pour le n°1 de chaque arrondissement/commune).
- Clôture : classements figés → 7 jours d'intersaison → **reset total de la carte**. Chaque joueur reçoit son **poster-souvenir** (image haute résolution de son territoire de saison, partageable).
- Fresh start assumé : le reset est le produit, pas un bug — il réactive les décrocheurs et relance les crews.
### 3.7 Parrainage
- Lien unique. Après la **1re course validée du filleul** : parrain ET filleul reçoivent **×2 points pendant 7 jours**. Cap : 5 filleuls actifs/saison. Récompense en gameplay, jamais en cash ni en Éclats (anti-fraude).
---
## §4. Parcours et écrans (9 écrans, pas un de plus)
### 4.1 Onboarding (< 90 secondes jusqu'à la carte)
1. **Écran promesse** (1 visuel : la carte de sa ville avec des territoires) — « Cours. Capture. Défends. »
2. **Pré-prompt localisation pédagogique** (pourquoi le GPS, pourquoi « toujours » pour l'arrière-plan) → prompt système iOS. Un refus = mode dégradé expliqué, jamais un mur.
3. **Sign in with Apple / Google** (2 taps, zéro formulaire). Pseudo auto-généré modifiable.
4. Choix ville (Paris / Lille / « ma ville n'y est pas » → waitlist code postal).
5. **Zone privée domicile** proposée d'office (voir §7) — valeur par défaut : ON, rayon 300 m.
### 4.2 Les 9 écrans
1. **Carte (home)** — territoires temps quasi réel, mon cluster, bouton COURIR, accès classements/boutique/profil. Carte sombre par défaut, palette daltonien-safe.
2. **Course en cours** — carte + hexes gagnés en live, stats grosses (distance, allure, temps), audio/haptique « zone capturée ». **Annulation protégée** : bouton stop → confirmation + auto-save continu toutes les 15 s (la faille exacte qui coûte des clients à INTVL).
3. **Résumé de course** — célébration < 3 s (animation de conquête + haptique + son signature), gains (hexes, points, Foulées, streak), CTA partage.
4. **Crew** — créer/rejoindre, membres, territoire commun, activité récente (digest, pas de feed).
5. **Classements** — ville : joueurs / crews, ancrés sur MA position (jamais le rang mondial en premier — être 47e de Lille motive, être 384 291e mondial tue).
6. **Profil** — stats, skins, streak, badges, réglages (zones privées, notifs granulaires).
7. **Boutique** — Club, Starter Pack (si éligible), Éclats, skins. Sobre : 1 écran, pas de casino.
8. **Inbox/notifications** — vol subi avec CTA « Reprendre » + itinéraire suggéré vers la zone volée.
9. **Réclamer (import HealthKit)** — liste des courses détectées non réclamées → « Réclame ton territoire » en 1 tap.
### 4.3 Moments de dopamine (design intentionnel, dosé)
- **Anticipation** : depuis la carte, un long-press sur une zone affiche le gain potentiel estimé (« ~45 hexes, ~520 pts »). Pas de planificateur complet en MVP.
- **Pic post-effort < 3 s** : la seule fenêtre de récompense variable — 1 drop aléatoire gratuit toutes les 3-5 courses (Foulées bonus ou fragment de skin). Jamais de drop payant.
- **Perte dosée** : la notif de vol arrive avec le CTA revanche, jamais la nuit (quiet hours 21h-8h), jamais plus de 2 push/jour tous types confondus.
---
## §5. Monétisation v0 (câblée jour 1, volontairement sobre)
### 5.1 SKUs RevenueCat
| SKU | Prix | Contenu | Trigger d'affichage |
|---|---|---|---|
| `club_monthly` / `club_annual` | 4,99 €/mois — 34,99 €/an | 1 bouclier/sem, heatmap des zones contestées, stats avancées, 2 gels de série/mois, badge, ×1,5 Foulées | Après 1er vol subi (aperçu bouclier) ; onglet boutique ; fin de 3e course |
| `starter_pack` | 2,99 € (one-time) | 1 skin exclusif + 120 Éclats + 1 bouclier | J5-J7 ET ≥ 3 courses. Proposé une seule fois à ce prix |
| `eclats_s` / `m` / `l` | 1,99 / 4,99 / 9,99 € | 100 / 320 / 720 Éclats | Boutique + contextuel (skin convoité, bouclier) |
| Skins territoire ×4 | 180-280 Éclats | Rendu des hexes (or, néon, marbre, esquisse) visible par toute la ville | Boutique + post-course |
Positionnement prix : sous l'ancre Strava (7,99-9,99 €/mois, 49,99-59,99 €/an selon grilles) et sous INTVL (6,99-10,99 €/mois).
### 5.2 Règles d'or
1. Le tracking, la capture, les crews et les classements ne sont **jamais** paywallés.
2. Aucune offre avant J5 ET la première capture (le moment magique précède toute facture).
3. Le premier contact avec le bouclier est un **cadeau** (1 offert au premier vol subi), l'offre vient après.
4. Aucun hasard payant (loot box) — cadre légal UE + marque santé.
5. Utilisateur perdu (10 j sans course) : **zéro offre payante** — cadeau de retour + rappel du fresh start.
### 5.3 Cibles économiques Saison 0
- Conversion payante ≥ 2 % des actifs à 60 j (cible confort : 3-4 %).
- Mix attendu : Club ~55 % du revenu, Starter ~25 %, Éclats/skins ~20 %.
- Calibrage honnête : même Clash of Clans, roi de l'IAP (100 % achats in-app, zéro pub), tourne à ~2,5-6 $/joueur mensuel/an. Objectif MVP : ARPU actif ≥ 0,40 €/mois. Pas de fantasme.
---
## §6. Architecture technique
### 6.1 Stack (optimisée coût + compatibilité Claude Code + stack existante)
| Couche | Choix | Notes |
|---|---|---|
| Mobile | **React Native + Expo** (dev builds, pas Expo Go) | Un codebase iOS+Android. `expo-location` + `expo-task-manager` pour le tracking |
| Carte | **MapLibre GL Native** (`@maplibre/maplibre-react-native`) + tuiles **Protomaps/OpenFreeMap** auto-hébergées (Cloudflare R2) | Coût ~0 €. Option Mapbox si besoin de polish (vérifier la grille tarifaire du moment) |
| Hexes | **H3** (h3-js côté client pour le rendu ; côté serveur : extension `h3` PostgreSQL si disponible sur Supabase, sinon h3-js dans les Edge Functions) | Res 10 gelée |
| Backend | **Supabase** : Postgres + PostGIS, Auth (Apple/Google), Realtime (updates carte), Storage (posters), Edge Functions | Stack déjà maîtrisée |
| Paiements | **RevenueCat** | Gratuit sous un seuil de revenu mensuel (vérifier la grille actuelle) ; webhooks → table `purchases` |
| Analytics | **PostHog** (events §8) + dashboards RevenueCat | Free tier |
| Push | **Expo Notifications** | Caps §4.3 |
| Site waitlist | **Next.js + Supabase** | Waitlist par code postal, compteur de déblocage par ville |
### 6.2 Schéma de données (tables principales)
```sql
users(id, pseudo, city_id, created_at, streak_weeks, foulees, eclats, is_club, referral_code, referred_by)
crews(id, name, color, city_id, code, created_by, created_at)
crew_members(crew_id, user_id, joined_at, left_at)           -- cooldown 7 j géré ici
runs(id, user_id, source,               -- 'gps' | 'healthkit'
     started_at, distance_m, duration_s, avg_pace_s_km,
     status,                             -- 'valid' | 'rejected' | 'flagged'
     reject_reason, polyline_masked, points_awarded)
hex_claims(h3index BIGINT PRIMARY KEY, city_id,
     owner_user_id, crew_color_cache, claimed_at, run_id,
     locked_until, shielded_until, decay_at)                 -- decay_at = claimed_at + 21 j, repoussé à chaque défense
shields(id, user_id, center_h3, hex_count, activated_at, expires_at, source)  -- 'club' | 'eclats'
seasons(id, city_id, starts_at, ends_at, status)
season_scores(season_id, user_id, points, rank_cache)        -- + vue matérialisée crews
purchases(id, user_id, sku, rc_event_id, amount, at)
privacy_zones(user_id, zone_index, center_h3_res8, radius_m) -- centre stocké en H3 res 8 (grossier), jamais en lat/lng exact
referrals(referrer_id, referee_id, activated_at, boost_expires_at)
city_zones(city_id, name, geojson, status)                   -- 'open' | 'waitlist'
waitlist(email_or_user, postal_code, created_at)
```
### 6.3 Edge Functions
- `ingest_run` : réception des points (ou de la route HealthKit) → filtrage §3.2 → conversion H3 → transaction de claims (respect locks/boucliers/protections) → points/Foulées/streak → payload de célébration. **Idempotente** (retry offline safe).
- `decay_job` (cron quotidien) : hexes `decay_at < now()` → neutres + notifs J-3.
- `season_close` (cron) : gel des classements, badges, génération des posters, reset à J+7.
- `rc_webhook` : synchronisation achats/abonnements → entitlements.
- `digest_job` (cron) : notifications groupées crew + résumé hebdo dimanche soir.
### 6.4 Anti-triche v0 (sans dotations réelles, suffisant)
- Toute validation **côté serveur** (le client n'attribue jamais un hex).
- Règles §3.2 + plafond de claims/jour (garde-fou : 1 200 hexes/jour/compte) + détection de traces identiques répétées à cadence anormale.
- Courses `flagged` : créditées en stats, claims gelés en file de revue manuelle (dashboard admin minimal = vue Supabase).
- **App Attest / Play Integrity = prérequis v1.1 avant toute dotation réelle.** Gelé dans le marbre.
### 6.5 Offline & batterie
- Enregistrement local (SQLite/AsyncStorage) avec flush ; une course finie hors réseau se synchronise et claim à la reconnexion (grâce à l'idempotence).
- GPS : précision adaptative (haute pendant la course uniquement), pas de tracking hors course. Cible : < 8 %/h de batterie en course.
- Android (phase S13-14) : foreground service + notification persistante + flux guidé de whitelisting batterie par OEM (Xiaomi/Samsung/Huawei = là où INTVL saigne ; c'est le fossé défensif technique).
---
## §7. Vie privée, sécurité, légal (non négociable, jour 1)
1. **Zones privées** : jusqu'à 3, rayon 200-500 m, **ON par défaut autour du domicile déclaré**. Dans une zone privée : aucune trace stockée, aucun hex capturé, aucune donnée rendue. (Leçon des heatmaps Strava.)
2. **Jamais de position live d'autrui.** La carte montre des états de territoire ; les traces de course ne sont visibles que par leur auteur. Les crews voient les hexes gagnés, pas les trajets.
3. **RGPD/CNIL** : géolocalisation = donnée sensible de fait. Base légale : consentement explicite au tracking (recueilli à l'onboarding, retirable). Registre des traitements tenu (SASU Nexus 1993, responsable de traitement). Export + suppression de compte en self-service dès la v0. Rétention des polylines brutes : 90 jours, puis agrégats H3 seuls.
4. **Âge : 16+** dans les CGU (consentement numérique FR à 15 ans + carte sociale géolocalisée = on prend la marge). Déclaration store cohérente.
5. **CGU** : clause anti-harcèlement territorial (le PvP local peut déraper), fair-play, triche = wipe de saison, pas de dotations S0 (verrouille aussi le risque de qualification loterie).
6. Contenu publicitaire/marques : néant en MVP → aucun sujet de transparence commerciale avant la Saison 2.
---
## §8. Analytics — événements traqués (PostHog)
Funnel : `app_open`, `onboarding_step{n}`, `signup_completed{method}`, `permission_location{result}`, `city_selected`, `privacy_zone_set`.
Boucle cœur : `run_start`, `run_autosave`, `run_cancel_attempt`, `run_complete{distance,duration,source}`, `claim_result{new,stolen,defended,rejected_reason}`, `celebration_viewed`, `steal_suffered`, `revenge_run{delay_h}` (H2), `decay_warning_sent`, `streak_saved`.
Social/viralité : `crew_created`, `crew_joined{via}`, `invite_sent`, `invite_accepted` (H3), `share_card_generated`, `share_completed{channel}`, `poster_downloaded`.
Monétisation : `paywall_view{trigger}`, `purchase_initiated{sku}`, `purchase_completed{sku}`, `subscription_started/renewed/cancelled`, `shield_activated{source}`, `skin_equipped`.
Santé produit : `notification_opened{type}`, `healthkit_import{runs}`, `battery_report`, `map_load_ms`, `crash`.
Dashboards jour 1 : funnel activation, rétention D1/D7/D30 par cohorte hebdo, H1-H4, revenu par SKU.
---
## §9. Croissance intégrée au produit (0 € de budget média en S0)
1. **Carte de partage** : image auto-générée post-course (capture stylisée de la carte + hexes gagnés + stats + QR/deep link « Reprends ce quartier »), format vertical 9:16, partage 1 tap vers IG story/TikTok. C'est LE livrable marketing du MVP — chaque post est une pub géociblée gratuite.
2. **Boucle revanche** : notif de vol → CTA → reconquête → nouvelle carte partagée. Réengagement et contenu auto-générés.
3. **Boucle crew** : plus de jambes = plus de terrain tenu → chaque crew recrute pour survivre (lien d'invitation = 1 tap).
4. **Parrainage** (§3.7) : boost ×2 partagé, récompense en gameplay.
5. **Pré-lancement (pendant le build, S6-S12)** : recruter 30-50 crews fondateurs dans les run clubs de Paris et Lille (statut Fondateur permanent + accès TestFlight) ; waitlist par code postal avec seuil de déblocage (« ton quartier ouvre à 500 inscrits ») ; build in public sur TikTok (le compte documente le développement puis scénarise les rivalités locales dès la S0).
6. **Éditorial S0** : 3 formats TikTok récurrents — « le quartier X vient de tomber », portrait de crew, classement de la semaine. Zéro budget, un téléphone.
---
## §10. Plan de build — 14 semaines
| Sem. | Livrable | Critère de sortie |
|---|---|---|
| 1-2 | Repo Expo + Supabase, auth Apple/Google, carte MapLibre + rendu couche H3 statique, schéma DB migré | La carte de Paris s'affiche avec des hexes de test colorés |
| 3-4 | Tracking GPS foreground + `ingest_run` complet (validation, claims, transaction) | Une vraie course dehors capture les bons hexes, visibles par un 2e compte |
| 5 | Résumé de course + célébration + points/Foulées/streaks + auto-save/annulation protégée | La boucle cœur est jouable de bout en bout |
| 6 | Crews (créer/rejoindre/couleurs) + 2 classements ville | 2 crews de test s'affrontent sur la carte |
| 7 | Notifications (vol, decay J-3, streak, digest) + inbox + quiet hours | La boucle revanche fonctionne (H2 mesurable) |
| 8 | Boutique RevenueCat : Club, Starter, Éclats, 4 skins + triggers contextuels §5 | Un achat sandbox débloque l'entitlement en < 5 s |
| 9 | Import HealthKit (« Réclamer ») + zones privées + réglages + suppression/export de compte | Une course Apple Watch claim son territoire sans ouvrir l'app pendant l'effort |
| 10 | Carte de partage + parrainage + site waitlist Next.js | Une story IG partagée installe l'app via deep link et crédite le parrain |
| 11-12 | Perf carte (tuiles, clustering), polish, TestFlight fermé avec les crews fondateurs, corrections | 50 bêta-testeurs, crash-free ≥ 99 %, carte < 1,5 s au chargement |
| 13-14 | Durcissement Android (foreground service, whitelisting OEM), soumissions stores, assets, seed final des crews | Approbations App Store + Play, Saison 0 armée |
| S0 | **Lancement Saison 0 Paris + Lille** (8 semaines) | Gates §12 mesurées à S0+4 et S0+8 |
Franchise technique : c'est 2-3× plus dur qu'un SaaS Next.js. Les trois morceaux durs sont le GPS arrière-plan Android, la perf de la carte et l'idempotence d'`ingest_run`. Budget optionnel recommandé : un audit freelance React Native de 2-3 jours (~2-3 k€) en semaine 11 sur ces trois points précis.
---
## §11. Budget
| Poste | Coût |
|---|---|
| Apple Developer + Google Play | ~99 $/an + 25 $ one-time |
| Supabase Pro | 25 $/mois |
| Tuiles carto (Protomaps sur Cloudflare R2) | 0-5 $/mois |
| RevenueCat, PostHog, Expo push | 0 € au démarrage (free tiers) |
| Domaine + site waitlist (Vercel hobby/Hetzner existant) | ~15 €/an |
| Design (icône, skins, sons) | 0-500 € (générable + retouches) |
| Audit freelance RN (optionnel, recommandé) | 2-3 k€ |
| Marketing S0 | 0 € (organique + crews) |
| **Total cash jusqu'au lancement** | **< 1 k€ hors audit ; < 4 k€ avec** |
---
## §12. KPIs et gates Go/No-Go
Mesure à S0+4 (lecture intermédiaire) et S0+8 (décision).
| Métrique | Gate S0+8 | Si en dessous |
|---|---|---|
| Activation (1re capture < 72 h post-install) | ≥ 45 % | Refondre l'onboarding avant tout le reste |
| Rétention D7 / D30 | ≥ 22 % / ≥ 10 % | D30 < 8 % sur 2 cohortes → itérer la boucle (H1-H2), interdire toute dépense d'acquisition |
| Retour < 72 h après vol (H2) | ≥ 35 % | Revoir dosage perte/notifs |
| % d'actifs en crew | ≥ 30 % | Simplifier création/invitation, seed de crews |
| Invitations acceptées / actif (H3) | ≥ 0,25 | Revoir carte de partage + parrainage |
| Partage post-course | ≥ 15 % des courses | Revoir la carte de partage |
| Conversion payante à 60 j (H4) | ≥ 2 % | Revoir triggers §5, pas les prix d'abord |
| ARPU actif | ≥ 0,40 €/mois | — |
| Crash-free / GPS-complete | ≥ 99 % / ≥ 97 % des courses | Priorité absolue sur tout le reste |
**Décision S0+8 :** 7 gates sur 9 au vert → Saison 1 (pass de saison, 3e ville, App Attest, dossards partenaires). Sinon → une saison d'itération sur la boucle, zéro expansion.
---
## §13. Risques et parades
| Risque | Impact | Parade |
|---|---|---|
| Carte vide au lancement (cold start) | Mort du jeu | City-gating strict, 30-50 crews seedés AVANT l'ouverture, waitlist à seuil, decay qui libère du terrain |
| GPS Android défaillant | Avis 1★, churn (le talon d'INTVL) | iOS d'abord ; Android seulement après durcissement S13-14 ; bêta fermée Android prolongée si besoin |
| Une grosse course perdue (bug) | Rage-quit définitif | Auto-save 15 s, annulation protégée, ingestion idempotente, support réactif J1 |
| INTVL localise en français | Perte de la fenêtre | Vitesse (14 sem), verrou communautaire (crews, run clubs, rivalités FR) — l'avance produit ne suffit pas, l'avance sociale oui |
| Batterie | Désinstallation silencieuse | Cible < 8 %/h, GPS adaptatif, mesure `battery_report` dès la bêta |
| Harcèlement territorial local | Risque humain + RP | Zones privées par défaut, pas de position live, signalement in-app, clause CGU |
| Sur-monétisation précoce | Churn + image | Règles d'or §5.2, aucune offre avant J5, caps de push |
| Triche (même sans dotation) | Crédibilité de la carte | §6.4 ; dotations réelles interdites avant App Attest |
---
## §14. Post-MVP (la roadmap qu'on NE construit PAS maintenant)
- **v1.1 (S0+4 sem)** : Pass de saison double piste 7,99 € avec achat rétroactif ; guerres de crews du week-end ; Garmin direct ; App Attest/Play Integrity.
- **v1.2** : mode Explorateur (marche, points réduits), Balises (boost de zone posable, modèle Lure), replay animé, Live Activities.
- **Saison 2-3** : le Fort/QG — économie Clash complète (ressources générées par les km, timers, ouvriers, Éclats d'accélération, double verrou « l'effort débloque, l'argent accélère ») lancée en événement majeur ; premières dotations réelles (dossards de courses complètes) ; ville n°3-5.
- **Saison 3+** : sponsors (stations Ravito, pont réel→virtuel), web store hors app stores, expansion européenne ville par ville.
---
## Annexe A — Prompt de kickoff Claude Code
```
Tu es le lead dev d'une app mobile React Native (Expo, TypeScript strict) : un jeu de
conquête de territoire par la course à pied. Réfère-toi à SPEC-MVP-territoire-running-v0.md
(à la racine du repo) comme source de vérité — en cas d'ambiguïté, applique la spec, ne
réinvente pas les règles du jeu.
STACK IMPOSÉE : Expo (dev builds) + expo-location/expo-task-manager,
@maplibre/maplibre-react-native + tuiles Protomaps, h3-js, Supabase (Postgres/PostGIS,
Auth Apple/Google, Realtime, Edge Functions Deno), RevenueCat, PostHog, Expo Notifications.
MILESTONE 1 (à faire maintenant) :
1. Monorepo : apps/mobile (Expo), apps/web (Next.js waitlist), packages/shared (types,
   constantes de jeu §3 de la spec), supabase/ (migrations + functions).
2. Migrations SQL du §6.2 avec RLS activé sur toutes les tables (owner-only en écriture,
   lecture publique limitée à hex_claims agrégés et classements).
3. Auth Apple/Google + écran carte : MapLibre centré Paris, couche GeoJSON d'hexes H3
   res 10 factices colorés, 60 fps sur un zoom ville.
4. Edge Function ingest_run : squelette avec les validations §3.2 en fonctions pures
   testées (Deno test), transaction de claims respectant locked_until/shielded_until/
   protection nouveau joueur, idempotence par run_id client.
CONVENTIONS : constantes de jeu centralisées dans packages/shared/game-rules.ts (jamais
de nombre magique en dur) ; tout claim est décidé serveur ; chaque écran logge ses events
PostHog du §8 ; pas de lib non listée sans justification en une ligne dans le PR.
DEFINITION OF DONE d'un milestone : build iOS OK sur device réel, tests des fonctions
pures verts, lint zéro erreur, events analytics visibles dans PostHog.
```
---
*Spec v0.1 — gelée pour la Saison 0. Toute modification des chiffres du §3 pendant la saison est interdite (équité) ; les ajustements passent par les patch notes d'intersaison.*
