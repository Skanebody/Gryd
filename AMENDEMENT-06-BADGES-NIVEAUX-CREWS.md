# AMENDEMENT-06 — Badges à niveaux, crews Supercell, nav V2, Activity Hub (03/07/2026)

**Sources : `docs/product/GRYD_refonte_pages_v2_badges_integrations.md` + `GRYD_refonte_pages_v3_supercell_crews_badges.md`** (v3 = v2 + Partie F Supercell). Remplace AMENDEMENT-04 §2 (catalogue) ; complète AMENDEMENT-02/05. Copie les 2 docs dans docs/product/ si absent.

## 0. État vs docs (ne pas refaire ce qui existe)
Landing V2 (Partie A) : ✅ livrée sauf **Connect Your Gear** (§4.10, nouvelle section), titre hero variante « La carte est ouverte. » (à AJOUTER en kicker au-dessus de « LA FRANCE EST OUVERTE. » → décision : le kicker devient « LA CARTE EST OUVERTE. »), ordre du loop (Cours→Capture→**Attaque→Défends**→Domine — inverser les étapes 3/4 actuelles), FAQ + « Et hors de France ? ». Badges attribuables ✅ (AMENDEMENT-04 §4). Routes/avant-postes/events V0 ✅. War Room landing ✅.

## 1. BADGES V2 — système à niveaux (Partie D)
### 1.1 Raretés → TIERS (remplace common/rare/epic/legend PARTOUT)
`road · tempo · race · carbon · elite · legend`. Migration DB : badges.rarity check remplacé, mapping ancien→nouveau : common→road, rare→tempo, epic→carbon, legend→legend (+ race/elite utilisés par le nouveau catalogue). Visuel par tier = celui de maquette-badges-gryd.html (road graphite → legend or+halo).
### 1.2 Les 12 familles (couleurs = DATA, exception polychrome AMENDEMENT-04 §1 inchangée)
| id | couleur | contenu |
|---|---|---|
| onboarding | #8B5CF6 | First Run, First Capture, First Crew, First Defense, First Share, First Verified Run, Founder, Season 0 (8 simples — reprend les keys existantes : premiers_pas, enclenche→first_capture… cf. mapping §1.5) |
| distance | #F472B6 | Distance Runner (une course) I 3/5/10/21,1/42,195/LEG 50 km · Season Distance 25/50/100/250/500/1000 km · Lifetime Distance 100/500/1k/2,5k/5k/10k km |
| territoire | #4ADE80 | Hex Hunter 100/500/1k/5k/10k/50k · Zone Taker (secteurs contrôlés) 1/3/10/25/50/100 · City Control (% secteur actif) 10/25/50/70/90/LEG dominé 30 j |
| attaque | #FF5C33 | Raider (volés) 10/100/500/1k/5k/10k · Sector Breaker (secteurs contestés) 1/3/10/25/50/100 · Raid Leader (offensives) 1/5/10/25/50/100 |
| defense | #6FB7FF | Defender (défendus) 10/100/500/1k/5k/10k · Hold The Line (jours de tenue d'une zone) 3/7/14/30/60/100 · Fortress (clusters protégés) 1/3/10/25/50/100 |
| exploration | #2DD4BF | Pioneer (hexes pionniers) 10/100/500/1k/5k/10k · Frontier Runner (zones rurales ouvertes) 1/3/10/25/50/100 |
| routes | #F59E0B | Route Opened 1/5/10/25/50/100 · Outpost Builder 1/3/5/10/25/50 · Supply Line (routes maintenues 7 j) 1/3/10/25/50/100 |
| crew | #FB923C | Crew Member (contributions) join/5/25/100/500/1000 · Crew Captain (créer/3/5/10 actifs/top10/N°1) · United Front (membres actifs même semaine) 2/5/10/10×4sem/10×saison/invaincu |
| performance | #22D3EE | Pace Progress (amélioration allure/mois) · Consistency (semaines actives) 2/4/8/12/24/52 · Score Forme 60/70/80/85/90/95 |
| saison | #E7B84C | Season Rank (médailles top 100/50/10/3/#1/winner local) · National Rank (1000/500/100/50/10/#1 France) · Crew Season — ATTRIBUÉES PAR season_close, pas par course |
| verified | #9BA3AD | GRYD Verified (courses vérifiées) 10/50/100/250/500/1000 · Clean Runner (jours sans run rejeté) 30/60/90/180/365/730 |
| secret | #E7B84C | les 9 existants + Comeback (course après ≥ 30 j d'inactivité), Silent Takeover (voler ≥ 50 hexes entre 22h-5h), No Map Run (course valide 100 % en zone jamais possédée) = 12 secrets |
### 1.3 Mécanique de niveaux
Un badge progressif = UNE famille d'icône, 6 niveaux ; key = `<slug>_1..5` + `<slug>_legend` ; name = « Hex Hunter III » (chiffres romains, LEGEND en toutes lettres) ; tier du niveau n = [road,tempo,race,carbon,elite,legend][n-1]. Le moteur décerne TOUS les niveaux franchis (jamais ré-attribués). Total attendu : 8 onboarding + 19 familles progressives ×6 = 114 + 12 secrets + saison (18, décernées hors course) ≈ **152 badges**.
### 1.4 Métriques — qui alimente quoi
Alimentées par ingest_run DÈS MAINTENANT : distance (course/saison/vie), hexes, volés, défendus, pionniers, routes, avant-postes, contributions, semaines actives (nouveau : weeksActive dérivé des jours actifs), verifiedRuns (course valid+partial avec motionTrust ≥ seuil ou sans signal négatif — définir VERIFIED_MIN_TRUST=70 dans badges.ts), cleanDays (jours depuis dernier run rejeté — suivi interne lastRejectedDay), secrets. Alimentées par les JOBS (sector_control/season_close/offensives V1) : Zone Taker, City Control, Hold The Line, Fortress (clusters protégés = boucliers posés — shieldsUsed dispo via table shields → ingest ne le sait pas, job hebdo), Raid Leader, United Front, Crew Captain hauts niveaux, saison, Pace Progress/Score Forme (performance_snapshots V1). RÈGLE : plus JAMAIS d'étiquette « À venir » — un badge non encore alimenté est simplement verrouillé à 0 (AMENDEMENT-04 §4).
### 1.5 Migration
0009 : nouveau check tier ; reseed COMPLET du catalogue ; TABLE DE MAPPING des attributions existantes (premiers_pas→first_run… conquerant→hex_hunter_2, dominateur→hex_hunter_3, seigneur→hex_hunter_4, maitre→hex_hunter_5, rival→raider… pillard→raider_1(10)? NON : pillard(10 vols)→raider_1, predateur(50)→raider_1 reste + progression réelle recalculée depuis user_stats — le mapping est APPROXIMATIF assumé, documenté dans la migration ; AUCUNE attribution supprimée : les keys sans équivalent (fondateur 10 hex, explorateur…) restent des badges « héritage Saison 0 » conservés dans le catalogue, famille onboarding, non listés en avant).
### 1.6 UI Collection V2 (mobile)
Header « x / N débloqués · Tier max : Carbon » ; filtres = les 12 familles + Tous + Secrets ; **section « Proches du déblocage »** (top 3 progressions % via user_stats démo) ; chaque badge progressif : jauge `720 / 1 000` + « Prochain niveau : Hex Hunter IV » ; rangée tiers. BadgeHex : anneau/glow par TIER (plus par famille — la famille reste la teinte, le tier l'intensité/bordure : road contour simple → legend or+halo, mêmes recettes que la planche).

## 2. CREWS SUPERCELL — MVP (§51 exactement)
- **Crew XP & Level 1-10** (table §34.3 : 0/1k/3k/7,5k/15k/30k/60k/100k/175k/300k) ; sources §34.1 ; **caps anti-farm** : CREW_XP_DAILY_CAP_PER_MEMBER=500, XP route dupliquée ÷2 (constantes dans game-rules.ts).
- **Perks par niveau** (§35.1) : L2 Crew Marker (1 zone prioritaire/sem) · L3 Badge Frame I · L4 War Room Basic · L5 Weekly Crew Chest · L6 Outpost Slot I · L7 Scout Ping (1/sem) · L8 Share Templates · L9 Frame Carbon · L10 War Banner (1 offensive majeure/saison). DATA-driven (CREW_PERKS dans game-rules), jamais pay-to-win (§52).
- **Rôles** : runner · scout · defender · raider · captain · co_captain · leader (permissions §36 — colonne role sur crew_members, check ; leader = created_by par défaut).
- **War availability** : colonne sur crew_members : `war|defense|exploration|casual|absent` (§37.2).
- **Crew Chest hebdo** (§39) : table crew_chests (week_start, progress, tier atteint bronze/silver/gold/carbon/elite/legend aux paliers 25/50/75/100/150 %, claimed) ; progression = somme pondérée hexes/défenses/routes/missions de la semaine ; récompenses cosmétiques/Foulées capées.
- **Offensive simple 24 h + Defense missions** (§38) : tables offensives (crew, zone/secteur cible, objectif hexes, fenêtre, statut préparation/active/terminée, résultat victoire/échec/partiel) + defense_missions (zone, expire_at, assigned_role) ; contribution comptée par ingest_run (hexes claimés dans la cible pendant la fenêtre → colonne offensive_id sur… NON : table offensive_contributions(offensive_id,user_id,hexes)).
- **Crew Activity Score** (§45 : 30 % actifs 7 j + 20 % runs vérifiés + 20 % missions + 15 % chat/coordination (MVP : proxy participation) + 10 % défense + 5 % fair-play) → statut Dormant/Casual/Active/Competitive/War Ready ; vue matérialisée refresh par digest_job.
- **Crew Badge Frame évolutif** : frame = f(level) (road L1-4 → legend, §43.2) — rendu SVG autour de l'emblème.
- **Player Level 1-50** : XP existante ; tiers visuels §43.1 (1-9 Road… 50+ Legend) ; courbe PLAYER_LEVEL_XP dans game-rules (progression géométrique douce, documentée) ; frame avatar par tier.
- **Crew Discovery** : signaux War Active/Defense Active/Weekly Runs/Beginner Friendly/Competitive/Pioneer/City sur la table crews (+ statut open/request/fermé, langue, objectif) — écran recherche mobile.
- Animations level-up/badge unlock : mobile, sobres (charte §G).
- OUT MVP (§51) : leagues, rivalries, scout reports avancés, alliances, raid weekend, challenges, public crew page.

## 3. NAV MOBILE V2 (§6) 
`Carte · War Room · Crew · Classement · Profil` + GO flottant. **Arsenal** (ex-Boutique, renommé partout ; EN « Gear ») sort de la nav → entrée depuis Profil ET War Room. Nouvelles pages : **War Room** (À faire/offensive/défense/missions/chest — fusionne Missions §9), **Sources connectées** (depuis Profil→Paramètres et Performance ; états §16 : GRYD Live Actif · Apple Health Connecté · Health Connect/Strava Connecter · Garmin Bientôt · WHOOP pour Score Forme — UI réelle, connexions stub TODO O2), **Support course** (§7.15 : ma course n'a pas compté/segments/signalement/données). Inbox reste icône (cloche sur Carte + entrée War Room).

## 4. ACTIVITY HUB (Partie C — backend seulement au MVP)
- Table `imported_activities` (source check gryd_live|healthkit|health_connect|strava|garmin|whoop|fitbit|polar|coros|suunto, external_id, started_at, duration_s, distance_m, polyline_hash, status check capture_eligible|stats_only|partial|rejected|duplicate|review, matched_run_id).
- **Dédup pure dans engine** (`dedupeActivity`) : même user + départ à ±3 min + durée ±10 % + distance ±10 % OU polyline_hash identique → duplicate (constantes DEDUP_* dans game-rules). ingest_run : calcule polyline_hash (sha-256 des points arrondis res ~6 déc.) et vérifie avant traitement → statut duplicate = réponse idempotente douce (pas d'erreur).
- Statuts §15 : WHOOP/imports sans trace → stats_only (jamais de claims) ; GPX manuel → review. P1 OAuth = plus tard.

## 5. Priorités de build (cet amendement)
1. Backend badges V2 (catalogue+moteur+0009+ingest+deploy) → 2. Backend crews (tables+XP/chest/offensives+0010+wiring+deploy) → 3. Mobile (Collection V2 ∥ Nav V2/War Room/Crew HQ/Sources/Support/Arsenal rename) → 4. Landing add-on (Connect Your Gear + kicker + ordre loop + FAQ) → 5. Vérification transverse. Anti-farm, pas de position live, pas de pay-to-win (§52) partout.
