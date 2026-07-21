/**
 * GRYD — Règles du jeu v0 (SPEC §3 + AMENDEMENT-02, gelées pour la Saison 0).
 * SOURCE DE VÉRITÉ UNIQUE des constantes de jeu. Aucun nombre magique ailleurs.
 * La copie supabase/functions/_shared/game-rules.ts est GÉNÉRÉE par
 * scripts/sync-game-rules.mjs — ne jamais l'éditer à la main.
 */

// ─── §3.1 Grille de territoire ───────────────────────────────────────────────
export const H3_RESOLUTION = 10;
export const TRACE_BUFFER_M = 15; // buffer autour de la polyline (tolérance GPS)

// ─── §3.2 Validité d'une course ──────────────────────────────────────────────
export const RUN_MIN_DISTANCE_M = 1_000;
export const RUN_MIN_DURATION_S = 6 * 60;
/** Allure moyenne admise, en secondes par km : [2:50 ; 10:00] (borne basse anti-vélo). */
export const RUN_AVG_PACE_MIN_S_KM = 2 * 60 + 50;
export const RUN_AVG_PACE_MAX_S_KM = 10 * 60;
/**
 * Plafonds ANTI-ABUS d'UNE course/session (§3.2, audit sécurité offensif) : au-delà,
 * le payload est implausible → rejet serveur. Volontairement TRÈS généreux pour ne
 * JAMAIS exclure un ultra légitime ; ils ne servent qu'à couper les payloads forgés /
 * erronés grossiers et l'amplification DoS (trace serpentine de milliers d'hexes,
 * tableau de points géant). Ne remplacent pas une vraie attestation d'appareil.
 * NB durée : pas de plafond dédié — l'allure max (RUN_AVG_PACE_MAX_S_KM = 10:00/km)
 * borne déjà la durée par la distance (une course > 24 h serait « pace_too_slow » ou,
 * si assez longue pour ne pas l'être, « too_far »).
 */
export const RUN_MAX_DISTANCE_M = 100_000; // 100 km
export const RUN_MAX_POINTS = 100_000; // points GPS max/payload (~24 h @ 1 Hz), borné AVANT parsing
/**
 * Throttle anti-DoS d'ingest_run (audit sécurité) : chaque appel = pipeline lourd
 * (~30-66 requêtes DB). Plafond par utilisateur/heure, TRÈS au-dessus d'un usage humain
 * (~1-2 courses/jour) → ne gêne personne, coupe le flood scripté d'un compte.
 */
export const INGEST_MAX_RUNS_PER_HOUR = 30;
/** Filtrage des points GPS. */
export const POINT_MAX_ACCURACY_M = 25;
export const POINT_MAX_SPEED_KMH = 25; // au-delà → point rejeté
export const POINT_MAX_JUMP_M = 100; // saut entre points consécutifs → segment coupé
/** Allure par segment admise pour le claim : [2:30 ; 12:00] (hors bornes : segment exclu du claim, course conservée). */
export const SEGMENT_PACE_MIN_S_KM = 2 * 60 + 30;
export const SEGMENT_PACE_MAX_S_KM = 12 * 60;

// ─── §3.3 Propriété, vol, protection ─────────────────────────────────────────
export const HEX_LOCK_HOURS = 24; // hex fraîchement capturé involable
/**
 * Anti-harcèlement / anti-ping-pong (doc « Clash » §4, retour fondateur « j'ai
 * couru pour rien ») : une zone FRAÎCHEMENT capturée par autrui est PROTÉGÉE
 * d'un re-vol immédiat pendant ces heures. Dérive de last_captured_at (=
 * hex_claims.claimed_at, posé à now() à CHAQUE capture neutral/steal/pioneer,
 * jamais touché par une simple défense) : un hex dont la dernière capture est
 * dans cette fenêtre renvoie `blocked_fresh_protection` (0 pt) au lieu d'être
 * volé. Protection AUTOMATIQUE et TEMPORELLE — jamais achetable (anti
 * pay-to-win). Plus court que le lock 24 h : c'est l'attribution EXPLICABLE de
 * la fraîcheur (« zone tout juste prise, laisse-lui le temps »), le lock prend
 * le relais ensuite. TUNABLE (doc « MVP »). */
export const FRESH_CAPTURE_PROTECT_HOURS = 6;
export const NEW_PLAYER_PROTECTION_DAYS = 14; // territoire involable + sans decay
/**
 * Durée de vie (jours) d'une zone non re-parcourue avant decay → neutre
 * (AMENDEMENT-23 §D + doc §24/§25 : REMPLACE l'ancien decay binaire 21 j).
 * C'est l'échéance de decay POSÉE À LA CAPTURE (now + ZONE_DECAY_DAYS). Une
 * DÉFENSE ultérieure ne « reset » plus à 14 j : elle REPOUSSE l'échéance de
 * DEFENSE_HOURS_* selon la couverture de frontière (défense graduée ci-dessous)
 * — la stabilité s'ÉTEND, elle ne se remet pas à zéro. TUNABLE (doc « MVP »).
 */
export const ZONE_DECAY_DAYS = 14;
export const DECAY_WARNING_DAYS_BEFORE = 3; // notif « ton quartier s'efface »
/**
 * Statuts de zone dérivés (doc §24) — cycle de vie d'une zone à partir de son
 * échéance de decay et de son activité. NOMMÉS pour l'UI/l'explicabilité ; le
 * moteur les DÉRIVE (zoneStatus, engine/zone.ts) sans colonne dédiée quand
 * calculables au read.
 *  - `stable`     : capturée/défendue récemment, 0-7 j depuis la dernière défense ;
 *  - `fragile`    : 8-14 j sans défense (échéance approche) ;
 *  - `a_defendre` : dans les DERNIÈRES 48 h avant l'échéance de decay ;
 *  - `contestee`  : rival actif / contrôle partagé (signal externe) ;
 *  - `protegee`   : bouclier actif OU défense forte récente (stable_until futur loin) ;
 *  - `en_decay`   : échéance de decay dépassée (perd sa propriété).
 * Fenêtres de decay (doc §25, bornes en jours/heures depuis la dernière défense).
 */
export const ZONE_STABLE_MAX_DAYS = 7; // stable : 0-7 j
export const ZONE_FRAGILE_MAX_DAYS = 14; // fragile : 8-14 j (= ZONE_DECAY_DAYS)
export const ZONE_DEFEND_WINDOW_HOURS = 48; // « à défendre » : dernières 48 h avant decay
/**
 * Défense GRADUÉE (doc §16/§17, AMENDEMENT-23 §D) : la stabilité gagnée dépend
 * de la COUVERTURE de la frontière ciblée par le tracé (frontier coverage %,
 * engine/coverage.ts). 3 niveaux → heures de stabilité AJOUTÉES à l'échéance de
 * decay (repousse le decay de N h à partir de now). Valeurs = BORNE HAUTE des
 * plages doc (traverser 12-24 h → 24 ; longer 24-48 h → 48 ; couvrir 48-72 h →
 * 72) — TUNABLE. Une zone « couverte/fermée » tient donc 72 h de plus par
 * défense, une simple traversée 24 h.
 */
export const DEFENSE_HOURS_TRAVERSE = 24; // coverage < DEFENSE_COVER_LONGE_MIN
export const DEFENSE_HOURS_LONGE = 48; // DEFENSE_COVER_LONGE_MIN ≤ coverage < DEFENSE_COVER_FULL_MIN
export const DEFENSE_HOURS_COVER = 72; // coverage ≥ DEFENSE_COVER_FULL_MIN OU boucle fermée sur la zone
/**
 * Seuils de COUVERTURE de frontière (fraction 0-1) départageant les 3 niveaux
 * de défense (doc §16/§17). < 0,40 = traverser ; [0,40 ; 0,80[ = longer ;
 * ≥ 0,80 = couvrir/fermer. TUNABLE.
 */
export const DEFENSE_COVER_LONGE_MIN = 0.4;
export const DEFENSE_COVER_FULL_MIN = 0.8;
/**
 * Buffer (m) autour du tracé pour calculer la portion de frontière couverte
 * (doc §17 : « buffer autour du tracé = 30 m »). PURE (engine/coverage.ts) :
 * couverture = longueur de la frontière ciblée dont un point tombe à ≤ ce
 * buffer d'un segment du tracé, ÷ longueur totale de la frontière. TUNABLE.
 */
export const FRONTIER_COVERAGE_BUFFER_M = 30;
export const SHIELD_MAX_CLUSTER_HEXES = 300;
export const SHIELD_DURATION_HOURS = 48;
export const SHIELD_MAX_ACTIVE_PER_WEEK = 2; // cap absolu par joueur
// ANTI PAY-TO-WIN (décision fondateur) : l'abonnement GRYD Club ne bundle JAMAIS
// de bouclier ni de protection de zone. Les boucliers restent des ACHATS
// PONCTUELS capés (à la carte), jamais inclus dans le sub → 0.
export const SHIELD_CLUB_INCLUDED_PER_WEEK = 0;

// ─── §3.4 Points, streaks, monnaies ──────────────────────────────────────────
// AMENDEMENT-23 §D + doc §23 : la FORMULE DE POINTS est désormais
// MULTIPLICATIVE — points = zones × coeff_action × coeff_contexte ×
// verify_factor (voir POINTS_BASE_PER_ZONE / ACTION_COEFF / CONTEXT_COEFF /
// VERIFY_* ci-dessous). Les 3 forfaits historiques (+10/+15/+3) NE sont plus le
// barème ; ils restent exposés comme RÉFÉRENCE de dérivation :
// POINTS_BASE_PER_ZONE=10 = l'ancien neutre ; steal 1,3 ≈ 15/10 ; l'ancien
// défendu +3 devient 10 × 1,2 (défense) × 0,5 (verify partiel) ≈ 6 ou plus —
// gros delta de balance SIGNALÉ (balanceNotes). Le pionnier par densité reste
// un ADDITIF de première capture (voir POINTS_PIONEER_BONUS_BY_DENSITY).
export const POINTS_NEUTRAL_HEX = 10;
export const POINTS_STOLEN_HEX = 15;
export const POINTS_DEFENDED_HEX = 3; // re-parcourir son hex (LEGACY — cf. formule §23)
export const DEFEND_COOLDOWN_HOURS = 24; // max 1 défense/24 h/hex

// ─── §23 Formule de points MULTIPLICATIVE (AMENDEMENT-23 §D, doc §23) ─────────
/**
 * Points de base d'UNE zone (micro-cellule res 10) capturée, avant tout
 * coefficient (doc §23 « POINTS_BASE_PER_ZONE=10 »). = l'ancien neutre forfait
 * (POINTS_NEUTRAL_HEX) — la conquête neutre reste 10 × 1,0 × … = 10.
 */
export const POINTS_BASE_PER_ZONE = 10;
/**
 * Coefficient d'ACTION par type de gain (doc §23). Une zone est gagnée par UNE
 * action : conquête neutre ×1, reprise rival ×1,3, défense ×1,2, boucle propre
 * ×1,1 (intérieur d'une boucle fermée bien formée), route ×0,5 (couloir d'un
 * run qui n'ouvre qu'une ligne, pas de zone). Le moteur (engine/scoring.ts)
 * choisit le coeff par hex selon l'outcome + le contexte boucle. TUNABLE.
 *  - `route` MVP : réservé au couloir d'une course SANS boucle (arbitrage
 *    fondateur — appliqué seulement si actionContext.route, sinon la conquête
 *    corridor reste ×1,0 pour ne pas casser la balance des runs simples).
 */
export const ACTION_COEFF = {
  conquest: 1.0,
  steal: 1.3,
  defense: 1.2,
  clean_loop: 1.1,
  route: 0.5,
} as const;
export type ActionCoeffKey = keyof typeof ACTION_COEFF;
/**
 * Coefficient de CONTEXTE (doc §23) — MAJORE les points selon la situation, PAS
 * un achat. `zone_bonus` = HOTSPOT de carte (gagné par le LIEU, hotspot §26),
 * jamais un bonus acheté (anti pay-to-win : les bonus payants ne touchent
 * jamais les points, cf. BONUS_REWARD_PCT/Crew Boost → coffre/XP seulement).
 * Le coeff contexte effectif d'un hex = le PLUS FORT contexte applicable (un
 * seul multiplicateur de contexte, jamais de cumul). 1,0 si aucun. TUNABLE.
 *  - `contested` ×1,2 : la zone est disputée (rival actif/partagé) ;
 *  - `crew_mission` ×1,1 : la zone compte pour une mission/offensive crew active ;
 *  - `zone_bonus` ×1,15 : la zone est un hotspot de carte (gagné, pas acheté).
 */
export const CONTEXT_COEFF = {
  contested: 1.2,
  crew_mission: 1.1,
  zone_bonus: 1.15,
} as const;
export type ContextCoeffKey = keyof typeof CONTEXT_COEFF;
/**
 * PALIERS de VERIFY (doc §23) — facteur multiplicatif final selon le score de
 * confiance de la course (trust = min(gpsTrust, motionTrust) 0-100) :
 *  - ≥ VERIFY_FULL_MIN (80) → VERIFY_FACTOR_FULL (1,0) : capture pleine ;
 *  - ≥ VERIFY_PARTIAL_MIN (60) → VERIFY_FACTOR_PARTIAL (0,5) : capture PARTIELLE
 *    (la course capture, mais chaque zone vaut moitié) ;
 *  - < 60 → 0 : STATS ONLY, aucune capture (le run compte sportivement).
 * verifyFactor(trust) (engine/scoring.ts) applique ces paliers. Remplace le
 * seuil unique 70. TUNABLE.
 */
export const VERIFY_FULL_MIN = 80;
export const VERIFY_PARTIAL_MIN = 60;
export const VERIFY_FACTOR_FULL = 1.0;
export const VERIFY_FACTOR_PARTIAL = 0.5;
export const VERIFY_FACTOR_NONE = 0; // < VERIFY_PARTIAL_MIN → stats only

/** Bonus pionnier (hex jamais possédé) — variable par densité de zone (AMENDEMENT-02 §3). */
export const POINTS_PIONEER_BONUS_BY_DENSITY = {
  active: 5,
  emerging: 8,
  pioneer: 10,
  wild: 10,
} as const;
export type ZoneDensity = keyof typeof POINTS_PIONEER_BONUS_BY_DENSITY;
/** Bonus performance : modificateur plafonné, jamais dominant (AMENDEMENT-02 §3). */
export const PERFORMANCE_BONUS_FLOOR = 0.9;
export const PERFORMANCE_BONUS_CAP = 1.15;
/** Streak hebdomadaire : ≥ 2 courses/sem, +10 %/semaine consécutive, cap ×1,5. */
export const STREAK_MIN_RUNS_PER_WEEK = 2;
export const STREAK_MULTIPLIER_STEP = 0.1;
export const STREAK_MULTIPLIER_CAP = 1.5;
export const STREAK_FREEZE_FREE_PER_MONTH = 1;
export const STREAK_FREEZE_CLUB_PER_MONTH = 2;
/**
 * Profondeur d'historique lue pour DÉRIVER la série (LOT 1 « série visible ») :
 * la série et le « meilleur » sont recalculés à partir des courses réelles des
 * 52 dernières semaines. Au-delà, l'app ne prétend rien connaître — elle ne
 * conserve pas un chiffre qu'elle ne peut plus vérifier.
 */
export const STREAK_HISTORY_WEEKS = 52;
/** Foulées (monnaie douce) : 10 % des points gagnés. */
export const FOULEES_RATE_OF_POINTS = 0.1;
export const CLUB_FOULEES_MULTIPLIER = 1.5;
export const SKIN_EARNABLE_1_FOULEES = 800;
export const SKIN_EARNABLE_2_FOULEES = 1_500;
export const CREW_RENAME_FOULEES = 300;
/** Éclats (monnaie premium, achetée uniquement — n'achète jamais hexes/points/Foulées/stats). */
export const SHIELD_EXTRA_ECLATS = 90;
export const SKIN_PREMIUM_ECLATS_MIN = 180;
export const SKIN_PREMIUM_ECLATS_MAX = 280;

// ─── §3.5 Crews ──────────────────────────────────────────────────────────────
export const CREW_MIN_MEMBERS = 2;
/**
 * Effectif MAX d'un crew (source = doc Clash→GRYD du fondateur : gros crews façon
 * clan Supercell). Passé de 10 à 50 (AMENDEMENT-34). L'affichage `X/CREW_MAX_MEMBERS`
 * s'adapte partout (aucun libellé ne code « 10 » en dur — cf. Hero.tsx / WarRoom.tsx
 * qui consomment déjà la constante). Anti pay-to-win : un crew plus grand ne donne
 * NI territoire NI points NI vitesse NI protection — seulement plus de monde.
 */
export const CREW_MAX_MEMBERS = 50;
/**
 * Score de saison : SEULS les CREW_SCORE_TOP_ACTIVE membres les PLUS ACTIFS
 * comptent (source = doc Clash→GRYD). Empêche le « gros crew qui écrase par le
 * nombre » : à 50 membres, un crew ne score que sur ses 30 meilleurs contributeurs.
 * Consommé par engine/crew.ts `crewSeasonScore` (somme des topN contributions).
 * Anti pay-to-win : plafonne l'avantage de la TAILLE, ne vend rien.
 */
export const CREW_SCORE_TOP_ACTIVE = 30;
export const CREW_COLORS_COUNT = 12; // identité en DB ; rendu carte = AMENDEMENT-01
export const CREW_CODE_LENGTH = 6;
export const CREW_SWITCH_COOLDOWN_DAYS = 7;

/**
 * ─── AMENDEMENT-43 §0 maillon 3 — LA MISSION PRIORITAIRE DU CREW ────────────
 * « je cours pour l'AIDER ». Le crew a TOUJOURS AU PLUS UNE mission affichée,
 * DÉRIVÉE de l'état RÉEL (engine/crewMission.ts `chooseCrewMission`) — jamais
 * scriptée, jamais fabriquée. Quand la donnée réelle ne permet rien, la
 * dérivation renvoie `none` et l'écran le DIT (état honnête, pas un échec).
 *
 * La fenêtre de DÉFENSE n'a pas sa constante ici : c'est déjà
 * ZONE_DEFEND_WINDOW_HOURS (« à défendre » = dernières 48 h avant l'échéance de
 * decay, doc §24). Une 2ᵉ constante dirait deux vérités différentes du même
 * seuil.
 */

/**
 * Fenêtre (heures) pendant laquelle une zone PERDUE reste « à reprendre ».
 * Au-delà, la perte est de l'histoire : la remettre en mission prioritaire
 * inventerait une urgence morte. Source réelle : `contested_group_runs`
 * (prev_owner_crew_id = nous, winner_crew_id = un autre crew).
 */
export const CREW_MISSION_RECLAIM_WINDOW_H = 168; // 7 jours

/**
 * Nombre MINIMUM de zones réellement libres dans un secteur pour en faire une
 * mission de capture. En dessous, « allez prendre 1 zone » n'est pas une
 * mission de crew, c'est du bruit. Les zones libres sont COMPTÉES
 * (sectors.total_hexes − claims vivants du secteur), jamais estimées.
 */
export const CREW_MISSION_CAPTURE_MIN_FREE = 3;

/**
 * ─── AMENDEMENT-44 A4/A5 — SIGNAUX CREW + PING DE ZONE ──────────────────────
 * Le chat LIBRE reste REFUSÉ (A-43 §9 : modération, sécurité des mineurs, charge
 * juridique). On enrichit donc le VOCABULAIRE FIGÉ : un ping = un secteur RÉEL du
 * crew + un signal choisi dans un catalogue fermé. Zéro caractère saisi par
 * l'utilisateur ne transite : rien à modérer par construction.
 *
 * Les bornes ci-dessous sont des RÈGLES DE JEU (elles décident ce qui s'affiche
 * et ce qui est refusé), donc elles vivent ici et nulle part ailleurs — la RPC
 * les reçoit en paramètres, exactement comme les fenêtres de `crew_mission_inputs`.
 */

/**
 * Pings ACTIFS simultanés par membre. À 1, un nouveau ping REMPLACE le précédent
 * (il ne le refuse pas : refuser obligerait à comprendre une règle invisible pour
 * corriger une erreur de tap). Conséquence directe : un crew de 50 ne peut pas
 * afficher plus de 50 pings, et un membre ne peut pas noyer le mur à lui seul.
 */
export const CREW_PING_MAX_ACTIVE_PER_MEMBER = 1;

/**
 * Durée de vie d'un ping (heures). Un ping est une intention de COURSE, pas un
 * message : au-delà, « je défends ce soir » parle d'un soir qui est passé.
 * L'expiration est portée par le SERVEUR (colonne `expires_at`, filtrée en
 * lecture) — jamais par un timer client qui mentirait après un vol long-courrier.
 */
export const CREW_PING_TTL_H = 12;

/**
 * Délai minimal (minutes) entre deux pings d'un même membre. Le remplacement
 * est légitime (« je m'étais trompé de secteur »), le martèlement ne l'est pas.
 * Anti-spam sans jamais culpabiliser : un ping trop rapproché est REFUSÉ avec le
 * temps restant, pas commenté.
 */
export const CREW_PING_COOLDOWN_MIN = 5;

/**
 * Pings affichés simultanément sur l'écran Crew. Au-delà, un mur de pings n'est
 * plus une coordination, c'est un fil — et un fil demande de la modération. Les
 * plus RÉCENTS gagnent ; le reste n'est pas « caché », il n'existe plus à l'écran.
 */
export const CREW_PING_FEED_MAX = 8;

// ─── §3.6 Saison ─────────────────────────────────────────────────────────────
export const SEASON_DURATION_WEEKS = 8;
export const INTERSEASON_DAYS = 7;

// ─── §3.7 Parrainage ─────────────────────────────────────────────────────────
export const REFERRAL_BOOST_MULTIPLIER = 2;
export const REFERRAL_BOOST_DAYS = 7;
export const REFERRAL_MAX_ACTIVE_PER_SEASON = 5;

// ─── §4.3 Notifications ──────────────────────────────────────────────────────
export const PUSH_QUIET_HOURS_START = 21; // 21h
export const PUSH_QUIET_HOURS_END = 8; // 8h
export const PUSH_MAX_PER_DAY = 2;
export const RUN_AUTOSAVE_INTERVAL_S = 15;
/** Récompense variable : 1 drop gratuit toutes les 3-5 courses. */
export const FREE_DROP_MIN_RUNS = 3;
export const FREE_DROP_MAX_RUNS = 5;

/**
 * VOL SUBI (doc §4 « Vol subi » : « perte significative », « pas chaque hex »).
 * Perte minimale, en zones DISTINCTES, sous laquelle on ne pousse PAS. Un
 * coureur qui rogne le coin d'un territoire en passant n'est pas un événement ;
 * une incursion l'est.
 *
 * CE QUE COUPER LE PUSH CACHE, ET CE QUE ÇA NE CACHE PAS — état au 21/07/2026.
 * Cette phrase disait « l'inbox ET le marqueur de revanche restent ». La moitié
 * était fausse, et une garantie à moitié fausse est un mensonge de doc entier :
 *   · L'INBOX RESTE — c'est VRAI et c'est du code : `steal_push_job` écrit dans
 *     `public.notifications` (table 0006) pour toute victime dont les lignes
 *     sont consommées ET qui portent au moins un vol RÉEL — `no_device`,
 *     `channel_off` et `expired` compris (depuis la migration 0058 ; avant elle,
 *     un vol périmé ne laissait RIEN, ni push ni inbox). Vérifiable.
 *     Les seules lignes consommées sans inbox sont les `invalid` (vol de
 *     soi-même, identifiant vide) : il n'y a pas de perte à raconter.
 *   · LE MARQUEUR DE REVANCHE NE RESTE PAS — il n'existe pas côté serveur.
 *     `apps/mobile/src/features/crew/revanche.ts` le tient en AsyncStorage
 *     LOCAL, et son propre en-tête le dit : « Tout est LOCAL (démo).
 *     TODO(O1) : brancher un vrai `revanche_windows` ». Aucune table
 *     `revanche_windows` n'existe dans `supabase/migrations/`. Un joueur qui
 *     réinstalle, ou qui change de téléphone, n'a AUCUNE revanche persistée.
 * SUSPENS (à porter dans AMENDEMENT-47 §« Ce qui reste EN SUSPENS ») :
 * `revanche_windows` — table + alimentation par `steal_push_job` (l'agrégat par
 * victime y est déjà, c'est le seul endroit qui connaît le secteur volé) +
 * lecture mobile en remplacement du store local. Tant que ce n'est pas fait,
 * AUCUN fichier ne doit promettre que la revanche survit au push coupé.
 */
export const STEAL_PUSH_MIN_HEXES = 5;
/**
 * Fenêtre d'agrégation du vol subi : délai minimal entre DEUX pushs de vol pour
 * un même joueur. C'est la garde anti-spam PRINCIPALE — elle rend le cas « dix
 * rivaux différents dans la même heure » impossible par construction, sans
 * dépendre du cap journalier (qui reste le dernier filet, pas le design).
 *
 * CE QUI ARME CE COOLDOWN (migration 0058). La DÉCISION d'envoyer, pas la preuve
 * de livraison. L'horloge est lue sur `steal_push_queue` : la plus récente ligne
 * de la victime consommée avec `outcome = 'pushed'`, écrite dans la MÊME
 * transaction que la finalisation du lot, donc avant tout appel réseau.
 * Auparavant elle était lue sur `push_log`, écrit uniquement pour les issues
 * `delivered` et en best-effort : une panne Expo ou un échec d'écriture du
 * journal DÉSARMAIT la seule garde entre deux drains. Une panne de transport ne
 * doit jamais élargir le droit de déranger quelqu'un.
 * `push_log` continue d'alimenter le cap journalier tous types confondus
 * (`canPush`), qui lui doit rester adossé à un envoi réellement accepté.
 */
export const STEAL_PUSH_COOLDOWN_MINUTES = 180;
/**
 * Âge maximal d'un vol EN ATTENTE d'annonce (file `steal_push_queue`).
 *
 * Un vol non encore annoncé reste en file — c'est ce qui permet d'AGRÉGER
 * plusieurs courses adverses en un seul message, et de reporter proprement un
 * vol tombé pendant les quiet hours (21h-8h) au réveil du joueur. Il faut donc
 * que cette fenêtre dépasse largement la plus longue nuit silencieuse (11 h) et
 * le cooldown (3 h).
 *
 * Passé ce délai, le vol est PÉRIMÉ et purgé sans push : annoncer une perte
 * vieille d'un jour n'est plus de la rétention, c'est du bruit — et le terrain
 * a de bonnes chances d'avoir déjà rechangé de mains. Rien n'est caché pour
 * autant : la perte reste lisible sur la carte et dans le territoire du joueur,
 * ET une entrée d'INBOX datée est écrite au moment où la ligne est consommée
 * `expired` (0058). Ce qui est refusé au vol périmé, c'est le PUSH — le droit de
 * déranger quelqu'un pour une nouvelle qui n'en est plus une —, pas le droit du
 * joueur de savoir ce qu'il a perdu.
 *
 * DEUXIÈME RÔLE (0058) : ce délai borne aussi la rétention des lignes consommées
 * (purge de `steal_push_job`), or ces lignes portent l'horloge du cooldown de vol
 * (`outcome = 'pushed'`). INVARIANT, testé dans steal_push_job/logic_test.ts :
 * STEAL_QUEUE_MAX_AGE_HOURS × 60 ≥ STEAL_PUSH_COOLDOWN_MINUTES. Le descendre
 * sous 3 h effacerait le cooldown en même temps que les lignes.
 */
export const STEAL_QUEUE_MAX_AGE_HOURS = 24;
/**
 * Victimes traitées par drain de `steal_push_queue`. C'est un plafond de
 * VICTIMES, pas de lignes — et c'est la différence qui compte.
 *
 * POURQUOI PAS UN PLAFOND DE LIGNES. Le message de vol est agrégé PAR VICTIME :
 * son total (« 12 zones reprises ») n'est vrai que si le drain voit TOUTES les
 * lignes en attente de cette victime. Un plafond de lignes coupe un agrégat au
 * milieu et fait annoncer un nombre FAUX — l'app ne ment jamais, y compris par
 * troncature. En bornant les victimes, chaque victime retenue est traitée
 * ENTIÈRE ; celles qui débordent attendent le drain suivant (5 min).
 *
 * COÛT ASSUMÉ : le nombre de lignes lues n'est pas borné dur. Il l'est en
 * pratique par STEAL_QUEUE_MAX_AGE_HOURS (au-delà tout est périmé) et par
 * MAX_CLAIMS_PER_DAY côté voleurs. Le pire cas reste très en deçà de la mémoire
 * d'un isolate ; on préfère cette borne molle à un chiffre faux.
 */
export const STEAL_QUEUE_MAX_VICTIMS_PER_DRAIN = 500;
/**
 * Report d'une ligne écartée pour une raison de TIMING (seuil non atteint,
 * cooldown, quiet hours, cap journalier) : délai avant qu'elle redevienne
 * LISIBLE par un drain.
 *
 * POURQUOI CE DÉLAI EXISTE. Sans lui, une ligne bloquée par le cooldown (3 h)
 * est relue 36 fois pour rien et, surtout, occupe une place dans le lot : à
 * l'échelle, les plus vieilles lignes jamais consommées monopolisent le drain
 * et les vols RÉCENTS ne sont plus jamais lus. C'est une FAMINE, et elle frappe
 * exactement les joueurs actifs.
 *
 * POURQUOI REPORTER NE CASSE PAS L'AGRÉGATION. La lecture se fait par VICTIME :
 * dès qu'UNE ligne de la victime redevient due (un nouveau vol, par exemple),
 * le drain reprend TOUTES ses lignes en attente, y compris celles encore
 * reportées. Une perte sous le seuil ne se perd donc pas — elle attend d'être
 * complétée, ce qui est précisément le comportement voulu au §4 (« pas chaque
 * hex »). C'est ce couplage report ↔ lecture-par-victime qui rend le report sûr.
 *
 * 15 min : assez long pour vider le lot des lignes qui ne peuvent rien produire,
 * assez court pour qu'une sortie de quiet hours ou de cap soit vue vite.
 */
export const STEAL_QUEUE_DEFER_MINUTES = 15;
/**
 * Délai au bout duquel une RÉSERVATION restée ouverte est déclarée abandonnée.
 *
 * Le drain réserve les lignes AVANT d'appeler Expo (cf. `steal_push_job`). Si
 * l'isolate meurt entre les deux, ces lignes restent réservées sans jamais être
 * finalisées. On ne les remet PAS en file : les renvoyer, c'est risquer un
 * doublon pour un message peut-être déjà parti, et « au plus une fois » prime.
 * Elles sont donc consommées avec l'issue `abandoned` — et COMPTÉES, pour que
 * la perte soit visible dans les métriques au lieu d'être silencieuse.
 *
 * 30 min = 6 fois la période du cron : un drain lent n'est jamais pris pour un
 * drain mort.
 *
 * SECOND RÔLE (0058) : ce délai borne aussi l'ATTENTE d'une victime. Tant qu'une
 * de ses lignes reste réservée, la victime entière est écartée du lot — sinon le
 * drain agrégerait uniquement ses lignes libres et annoncerait « 5 zones » quand
 * 17 ont été prises. Un compte tronqué est un chiffre FAUX ; attendre, non. Le
 * réapeur ferme cette attente au bout de ces 30 minutes, dans le pire cas.
 */
export const STEAL_QUEUE_RESERVATION_GRACE_MINUTES = 30;

// ─── §6.4 Anti-triche ────────────────────────────────────────────────────────
export const MAX_CLAIMS_PER_DAY = 1_200; // hexes/jour/compte

// ─── §7 Vie privée ───────────────────────────────────────────────────────────
export const PRIVACY_ZONES_MAX = 3;
export const PRIVACY_ZONE_RADIUS_MIN_M = 200;
export const PRIVACY_ZONE_RADIUS_MAX_M = 500;
export const PRIVACY_ZONE_DEFAULT_RADIUS_M = 300;
export const PRIVACY_ZONE_H3_RESOLUTION = 8; // centre stocké grossier, jamais en lat/lng exact
export const RAW_POLYLINE_RETENTION_DAYS = 90;
export const MIN_AGE_YEARS = 16;
/**
 * Suppression de compte DIFFÉRÉE (RGPD art. 17 + Apple 5.1.1(v)) — politique
 * « Snapchat » : la demande rend le compte INVISIBLE immédiatement (profil,
 * classements, roster crew), puis la purge RÉELLE et irréversible a lieu à
 * l'échéance. Toute reconnexion pendant le délai ANNULE la suppression.
 *
 * 30 jours = standard du secteur (Snapchat, Instagram, X) et borne haute
 * défendable : au-delà, un « soft delete » éternel violerait le droit à
 * l'effacement. La purge est exécutée par le cron `gryd_purge_accounts`
 * (migration 0045) qui appelle public.purge_due_accounts() — sans lui, le
 * compte ne serait jamais supprimé et l'app mentirait.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

// ─── §5.1 Monétisation (SKUs RevenueCat) — étendus AMENDEMENT-16 §4 ─────────
export const SKUS = {
  clubMonthly: 'club_monthly',
  clubAnnual: 'club_annual',
  starterPack: 'starter_pack',
  founderPack: 'founder_pack', // AMENDEMENT-16 (doc §19.2)
  eclatsS: 'eclats_s',
  eclatsM: 'eclats_m',
  eclatsL: 'eclats_l',
  eclatsXl: 'eclats_xl', // AMENDEMENT-16 (doc §19.3 : 1 500)
  eclatsXxl: 'eclats_xxl', // AMENDEMENT-16 (doc §19.3 : 3 200)
  crewBoost24: 'crew_boost_24', // AMENDEMENT-16 (doc §21.1)
  crewBoost72: 'crew_boost_72', // AMENDEMENT-16 (doc §13.1)
  crewBoostWeekend: 'crew_boost_weekend', // AMENDEMENT-16 (doc §21.2)
  crewBoostSeason: 'crew_boost_season', // AMENDEMENT-16 (doc §13.1)
  cosmeticChest: 'cosmetic_chest_crew', // AMENDEMENT-16 (doc §21.3)
  recruitTemplate: 'recruit_template_crew', // AMENDEMENT-16 (doc §21.4)
  bannerCrew: 'banner_crew', // AMENDEMENT-16 (doc §21.5)
} as const;
export const ECLATS_PACKS = {
  eclats_s: 100,
  eclats_m: 320,
  eclats_l: 720,
  eclats_xl: 1_500, // AMENDEMENT-16 (doc §19.3)
  eclats_xxl: 3_200, // AMENDEMENT-16 (doc §19.3)
} as const;
export const STARTER_PACK_ECLATS = 120;
/** §5.2 : aucune offre avant J5 ET la première capture. */
export const OFFER_MIN_ACCOUNT_AGE_DAYS = 5;
export const STARTER_PACK_WINDOW_DAYS = [5, 7] as const;
export const STARTER_PACK_MIN_RUNS = 3;
export const CHURNED_NO_OFFER_AFTER_DAYS = 10;

// ─── Carte France entière (AMENDEMENT-02 §2) ────────────────────────────────
/** Statuts de contrôle d'un secteur, par fraction d'hexes possédés (bornes basses). */
export const SECTOR_CONTROL_THRESHOLDS = {
  presence: 0,
  implantation: 0.1,
  contested: 0.3,
  controlled: 0.5,
  dominated: 0.7,
} as const;
export type SectorControlStatus = keyof typeof SECTOR_CONTROL_THRESHOLDS;
/** Activation du mode Guerre (raids, alertes de vol, titres) — seuil MVP. */
export const WAR_MODE_MIN_ACTIVE_RUNNERS = 20;
export const WAR_MODE_WINDOW_DAYS = 30;
export const WAR_MODE_RADIUS_KM = 5;

/**
 * ─── Seuils de densité ANNONCÉS PUBLIQUEMENT ────────────────────────────────
 * Ce que la page publique présente comme la règle de classement d'une zone :
 * combien de coureurs actifs (fenêtre WAR_MODE_WINDOW_DAYS, rayon
 * WAR_MODE_RADIUS_KM) et combien de crews il faut pour qu'une zone soit dite
 * active / émergente / pionnière. Ces valeurs étaient codées EN DUR dans
 * `apps/web/app/components/landing/dictionary.ts` ; elles vivent ici pour
 * qu'un changement de règle change la page du même coup — sinon la landing
 * continue d'annoncer l'ancienne règle, ce qui finit par être un mensonge.
 *
 * HONNÊTETÉ SUR LEUR STATUT (ne pas l'effacer d'une relecture) : seul le palier
 * `active` est aujourd'hui APPLIQUÉ par du code, via WAR_MODE_MIN_ACTIVE_RUNNERS
 * (activation du mode Guerre). `minCrews` et les paliers `emerging` / `pioneer`
 * sont des seuils DÉCLARÉS, pas encore évalués : `city_zones.status` est posé à
 * l'exploitation (Paris + Lille seedées `active` en Saison 0). Tant que c'est le
 * cas, ces nombres s'annoncent comme une RÈGLE (« ce qu'il faut pour »), jamais
 * comme une MESURE (« ce qu'il y a ici »).
 * `active.minCrews` = les « 5 crews actifs » de la version complète du seuil de
 * mode Guerre (docs/product/GRYD_map_zones_sectors_rules.md §4).
 *
 * Publié par : apps/web/app/components/landing/dictionary.ts (section `zones`).
 */
export const ZONE_DENSITY_THRESHOLDS: Record<
  ZoneDensity,
  { readonly minActiveRunners: number; readonly minCrews: number }
> = {
  active: { minActiveRunners: WAR_MODE_MIN_ACTIVE_RUNNERS, minCrews: 5 },
  emerging: { minActiveRunners: 10, minCrews: 2 },
  /** Un seul coureur suffit à ouvrir une zone pionnière — aucun crew requis. */
  pioneer: { minActiveRunners: 1, minCrews: 0 },
  /** Zone sauvage = ABSENCE de densité : aucun seuil à franchir, rien à publier. */
  wild: { minActiveRunners: 0, minCrews: 0 },
};

/** Avant-poste basique (V0) : présence construite en zone peu dense. */
export const OUTPOST_MIN_HEXES = 100;
export const OUTPOST_RADIUS_KM = 2;
/** Secteurs auto-générés MVP : agrégat H3 grossier (arbitrage A3 AMENDEMENT-02). */
export const SECTOR_H3_RESOLUTION = 7;

// ─── Pression & contestation d'un secteur (RÈGLES NON NÉGOCIABLES §C) ────────
// GRYD ne colore pas 200 000 users : il AGRÈGE en secteurs porteurs d'un
// `pressure_score` (0-100) et d'un `status` (5 niveaux). Ces seuils sont la
// SOURCE DE VÉRITÉ consommée par engine/sectors.ts (dérivation démo côté client
// au MVP ; pré-calcul serveur par secteur en V1 — cf. §C « Backend scalable »).
// Toutes les bornes ci-dessous sont TUNABLE (équilibrage jeu, pas structurel).

/**
 * §C — 5 niveaux de contestation pilotés par `pressure_score` (0-100), par
 * BORNE BASSE incluse. Chaque niveau porte un traitement visuel distinct
 * (jamais la couleur seule : forme + icône + animation en plus — daltonisme) :
 *   0 stable   [0-30]   aucune alerte
 *   1 pression [31-60]  halo orange léger + « Canal actif »
 *   2 contestee[61-80]  double contour + violet + « Zone contestée »
 *   4 urgence  [81-100] rouge limité + [DÉFENDRE] + « N zones à sauver »
 * Le niveau 3 « attaque active » n'est PAS une bande de score : c'est une
 * SUR-SIGNALISATION posée sur un secteur en pression/contesté quand une attaque
 * rival est EN COURS (cf. SECTOR_ACTIVE_ATTACK_MAX_H) — d'où l'absence de borne
 * 3 ici. `sectorStatus` combine bande de score + drapeau d'attaque active.
 * TUNABLE.
 */
export const SECTOR_PRESSURE_BANDS = {
  stable: 0,
  pression: 31,
  contestee: 61,
  urgence: 81,
} as const;
export type SectorPressureBand = keyof typeof SECTOR_PRESSURE_BANDS;

/**
 * Niveaux de secteur (0-4) — index STABLE consommé par l'UI (LOD, priorité
 * d'affichage §C). 3 = attaque active (drapeau, pas une bande). Alignés sur les
 * clés de traitement visuel de §C.
 */
export const SECTOR_STATUS_LEVELS = {
  stable: 0,
  pression: 1,
  contestee: 2,
  attaque: 3,
  urgence: 4,
} as const;
export type SectorStatusKey = keyof typeof SECTOR_STATUS_LEVELS;

/**
 * §C — RÈGLE « contesté » (déclenche le traitement violet + double contour).
 * Un secteur est contesté si l'UNE de ces conditions est vraie :
 *   (a) le rival principal détient ≥ RIVAL_MIN ET mon crew ≤ MINE_MAX ;
 *   (b) l'ÉCART |mon_crew − rival_principal| < GAP_MAX (coude à coude) ;
 *   (c) le rival a REPRIS > RECLAIM_ZONES_24H zones sur 24 h (poussée récente).
 * Bornes en FRACTION de contrôle du secteur (0-1). TUNABLE.
 */
export const SECTOR_CONTESTED_RULE = {
  /** (a) part minimale du rival principal pour disputer. */
  rivalMinShare: 0.25,
  /** (a) part maximale de mon crew au-delà de laquelle le secteur est tenu. */
  mineMaxShare: 0.6,
  /** (b) écart max mon_crew↔rival en-deçà duquel c'est un coude-à-coude. */
  closeGapMax: 0.15,
  /** (c) nb de zones reprises par le rival sur 24 h qui force le statut contesté. */
  reclaimZones24h: 8,
} as const;

/**
 * Fenêtre (heures depuis `last_attack_at`) pendant laquelle un secteur est en
 * ATTAQUE ACTIVE (niveau 3 — contour orange fort + pulse) dès lors qu'il est
 * déjà sous pression. Au-delà, l'attaque « refroidit » et le secteur retombe
 * sur sa bande de score. TUNABLE.
 */
export const SECTOR_ACTIVE_ATTACK_MAX_H = 6;

/**
 * §C — `pressure_score = activité rival récente + zones perdues + proximité de
 * bascule + decay`. POIDS (points de score) de chaque composante AVANT plafond
 * à 100. La somme des maxima dépasse 100 à dessein : plusieurs signaux forts se
 * cumulent puis SATURENT (un secteur violemment attaqué ET en decay = 100, pas
 * plus). Chaque composante est un sous-score 0-1 (normalisé côté engine) ×
 * son poids ici. TUNABLE (équilibrage de la lecture de pression).
 */
export const SECTOR_PRESSURE_WEIGHTS = {
  /** Activité rival récente (runs/attaques rival normalisés sur la fenêtre). */
  rivalActivity: 45,
  /** Zones perdues récemment (frontières reprises, normalisé). */
  zonesLost: 30,
  /** Proximité de BASCULE : plus l'écart mon_crew↔rival est faible, plus c'est chaud. */
  flipProximity: 30,
  /** Decay : fraction du secteur dont l'échéance de decay est imminente. */
  decay: 20,
} as const;
export type SectorPressureComponent = keyof typeof SECTOR_PRESSURE_WEIGHTS;

/**
 * Normalisation de l'activité rival : nb de runs/attaques rival récents qui
 * SATURENT la composante `rivalActivity` (au-delà, sous-score = 1). Évite qu'un
 * pic ponctuel n'écrase l'échelle. TUNABLE.
 */
export const SECTOR_RIVAL_ACTIVITY_SATURATION = 20;
/**
 * Normalisation des zones perdues : nb de zones reprises sur la fenêtre qui
 * SATURE la composante `zonesLost`. Aligné sur l'ordre de grandeur de
 * SECTOR_CONTESTED_RULE.reclaimZones24h. TUNABLE.
 */
export const SECTOR_ZONES_LOST_SATURATION = 16;
/** Score de pression borné à [0, 100] — plafond structurel (pas TUNABLE). */
export const SECTOR_PRESSURE_MAX = 100;

// ─── XP joueur (permanent, jamais acheté, survit au reset — AMENDEMENT-02 §6) ─
/** Choix D18 : XP = points territoire bruts de la course (1:1), boosts cosmétiques V1. */
export const XP_RATE_OF_POINTS = 1;

// ─── Villes seedées 'active' d'office pour la Saison 0 ──────────────────────
export const CITIES = {
  paris: { id: 'paris', name: 'Paris', center: { lat: 48.8566, lng: 2.3522 } },
  lille: { id: 'lille', name: 'Métropole de Lille', center: { lat: 50.6292, lng: 3.0573 } },
} as const;
export type CityId = keyof typeof CITIES;

// ═══════════════════════════════════════════════════════════════════════════
// CREWS SUPERCELL — MVP (AMENDEMENT-06 §2, doc v3 §33-§53)
// SOURCE DE VÉRITÉ des constantes crew. Anti pay-to-win strict (§52) :
// aucun perk ne donne territoire/points/vitesse/protection ; tout est
// organisation, lisibilité, cosmétique ou récompense capée gagnée à l'activité.
// ═══════════════════════════════════════════════════════════════════════════

// ─── §34.3 Crew XP Table MVP (Level 1-10, XP CUMULÉE) ────────────────────────
/** XP cumulée minimale requise pour ATTEINDRE chaque niveau (index 0 = L1).
 * Barème gelé §34.3 : 0/1k/3k/7,5k/15k/30k/60k/100k/175k/300k. */
export const CREW_XP_TABLE: readonly number[] = [
  0, // L1 — Crew créé
  1_000, // L2 — Crew actif
  3_000, // L3 — Blason amélioré (Badge Frame I)
  7_500, // L4 — War Room débloquée
  15_000, // L5 — 1er perk (Weekly Crew Chest)
  30_000, // L6 — Avant-postes (Outpost Slot I)
  60_000, // L7 — Missions avancées (Scout Ping)
  100_000, // L8 — Coffre amélioré (Share Templates)
  175_000, // L9 — Badge Frame Carbon
  300_000, // L10 — Crew Elite Saison (War Banner)
];
export const CREW_LEVEL_MAX = CREW_XP_TABLE.length; // 10 en MVP

// ─── §34.1 Sources d'XP crew + barème (par événement, avant caps) ────────────
/**
 * Points d'XP crew accordés par événement. Barème MVP documenté (aucune valeur
 * dans la doc §34.1 — arbitrage gelé ici, cohérent avec l'échelle §34.3 :
 * atteindre L2 = 1000 XP ≈ 500 hexes capturés OU 20 routes OU 10 avant-postes).
 * hex capturé=2, hex défendu=1, route ouverte=50, avant-poste=100, mission=30,
 * offensive terminée=200, course vérifiée=15, participation semaine=25.
 */
export const CREW_XP_SOURCES = {
  hexCaptured: 2,
  hexDefended: 1,
  routeOpened: 50,
  outpostMaintained: 100,
  missionCompleted: 30,
  offensiveCompleted: 200,
  verifiedRun: 15,
  weeklyParticipation: 25,
} as const;
export type CrewXpSource = keyof typeof CREW_XP_SOURCES;

// ─── §34.1 Plafonds anti-farm ────────────────────────────────────────────────
/** XP crew maximale qu'UN membre peut générer par jour (toutes sources). */
export const CREW_XP_DAILY_CAP_PER_MEMBER = 500;
/** XP d'une route dupliquée (même trajet re-parcouru) divisée par ce facteur. */
export const CREW_XP_ROUTE_DUP_DIVISOR = 2;

// ─── §35.1 Perks par niveau (DATA-driven, jamais pay-to-win §52) ─────────────
export interface CrewPerk {
  /** Niveau crew qui débloque le perk. */
  level: number;
  key: string;
  name: string;
  desc: string;
}
export const CREW_PERKS: readonly CrewPerk[] = [
  { level: 2, key: 'crew_marker', name: 'Crew Marker', desc: 'Marque 1 zone prioritaire par semaine pour guider les membres.' },
  { level: 3, key: 'badge_frame_1', name: 'Badge Frame I', desc: 'Bordure de blason crew améliorée (purement statutaire).' },
  { level: 4, key: 'war_room_basic', name: 'War Room Basic', desc: 'Débloque la War Room : assigner zones, objectifs, decay urgent, missions internes.' },
  { level: 5, key: 'weekly_crew_chest', name: 'Weekly Crew Chest', desc: 'Coffre hebdomadaire crew à récompenses cosmétiques et Foulées capées.' },
  { level: 6, key: 'outpost_slot_1', name: 'Outpost Slot I', desc: '1 avant-poste crew actif, maintenu par l\'activité réelle (non achetable).' },
  { level: 7, key: 'scout_ping', name: 'Scout Ping', desc: '1 analyse de zone par semaine : détecte les zones faibles (pas de capture auto).' },
  { level: 8, key: 'share_templates', name: 'Share Templates', desc: 'Templates sociaux premium crew (acquisition organique, statut).' },
  { level: 9, key: 'badge_frame_carbon', name: 'Badge Frame Carbon', desc: 'Bordure Carbon visible sur classement et profil crew.' },
  { level: 10, key: 'war_banner', name: 'War Banner', desc: '1 offensive majeure par saison (récompenses capées, pas d\'achat de victoire).' },
];

// ─── §36 Rôles crew + permissions (RÉALIGNÉS AMENDEMENT-16 §3, doc crews §8) ─
/**
 * Rôles façon clan (doc §8.1-§8.7). `defender`/`raider` ne sont PLUS des rôles
 * (AMENDEMENT-16 §3) : le style de jeu vit dans les TAGS de crew (CREW_TAGS §10)
 * et la war_availability §37.2. Migration 0013 : leader→founder,
 * defender/raider→runner. Ordre du tableau = rang hiérarchique CROISSANT
 * (rookie < runner < … < founder) — consommé par engine/crew.ts (crewRoleRank).
 */
export type CrewRole =
  | 'rookie' // §8.7 période d'essai (ROOKIE_TRIAL_DAYS)
  | 'runner' // §8.6 rôle standard (défaut après essai)
  | 'scout' // §8.5 exploration
  | 'strategist' // §8.4 tactique
  | 'captain' // §8.3 manager terrain
  | 'co_captain' // §8.2 gestion avancée
  | 'founder'; // §8.1 propriétaire
export const CREW_ROLES: readonly CrewRole[] = [
  'rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder',
];
export const CREW_DEFAULT_ROLE: CrewRole = 'runner';
/** Rôle attribué à l'ENTRÉE dans un crew : période d'essai (§8.7). */
export const CREW_ENTRY_ROLE: CrewRole = 'rookie';

/**
 * Matrice de permissions COMPLÈTE (doc §8, serveur = source de vérité).
 * Chaque action liste les rôles qui peuvent l'exécuter. MVP : l'écriture DB
 * reste service_role only (0010/0011) ; les Edge Functions rôle-gated (V1)
 * et l'UI (gating visuel) consomment la même matrice. Limites NON exprimables
 * en liste plate (périmètre kick/promotion du co_captain, départ du founder) :
 * CO_CAPTAIN_KICKABLE_ROLES / CO_CAPTAIN_PROMOTE_MAX_ROLE / canLeaveCrew.
 */
export const CREW_PERMISSIONS = {
  // §8.1 Founder seul (propriétaire).
  changeNameEmblem: ['founder'],
  manageRecruitment: ['founder'], // statut §9 + tags §10
  changeSettings: ['founder'],
  managePerks: ['founder'],
  transferFoundership: ['founder'],
  archiveCrew: ['founder'],
  // §8.1-§8.2 Direction (co_captain = co-leader, sans suppression/founder).
  launchOffensive: ['co_captain', 'founder'],
  invite: ['co_captain', 'founder'],
  acceptApplications: ['co_captain', 'founder'],
  kick: ['co_captain', 'founder'], // périmètre co_captain : CO_CAPTAIN_KICKABLE_ROLES
  promote: ['co_captain', 'founder'], // co_captain jusqu'à CO_CAPTAIN_PROMOTE_MAX_ROLE
  assignObjectives: ['co_captain', 'founder'],
  pinMessage: ['co_captain', 'founder'],
  manageWarRoom: ['co_captain', 'founder'],
  activateMajorCrewItem: ['co_captain', 'founder'],
  // §8.3 Captain (terrain).
  createOuting: ['captain', 'co_captain', 'founder'],
  assignDefense: ['captain', 'co_captain', 'founder'],
  pingZone: ['captain', 'co_captain', 'founder'],
  massPing: ['captain', 'co_captain', 'founder'], // jamais rookie (§8.7)
  proposeOffensive: ['captain', 'co_captain', 'founder'],
  acceptRookies: ['captain', 'co_captain', 'founder'], // si le crew l'autorise
  manageWeeklyMissions: ['captain', 'co_captain', 'founder'],
  // §8.4 Strategist (tactique).
  createRecommendedRoute: ['strategist', 'captain', 'co_captain', 'founder'],
  useScoutPing: ['strategist', 'co_captain', 'founder'], // perk L7 si débloqué
  proposeTargets: ['strategist', 'captain', 'co_captain', 'founder'],
  proposePlans: ['strategist', 'captain', 'co_captain', 'founder'],
  // §8.5 Scout (exploration).
  openRoutes: ['scout', 'strategist', 'captain', 'co_captain', 'founder'],
  createScoutReport: ['scout', 'strategist', 'captain', 'co_captain', 'founder'],
  markWeakZones: ['scout', 'strategist', 'captain', 'co_captain', 'founder'],
  proposeOutpost: ['scout', 'captain', 'co_captain', 'founder'],
  // §8.6 Runner standard — le rookie est EXCLU là où l'essai le restreint (§8.7).
  readWarRoomStats: ['runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'],
  useCrewItems: ['runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'],
  inviteViaLink: ['runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'], // si autorisé
  // Ouvert à tous, rookie inclus (sa contribution COMPTE, §8.7).
  chat: ['rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'],
  react: ['rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'],
  joinOuting: ['rookie', 'runner', 'scout', 'strategist', 'captain', 'co_captain', 'founder'],
} as const satisfies Record<string, readonly CrewRole[]>;
export type CrewPermissionAction = keyof typeof CREW_PERMISSIONS;

/** §8.2 : rôles qu'un co_captain peut exclure (jamais founder ni un autre co_captain). */
export const CO_CAPTAIN_KICKABLE_ROLES: readonly CrewRole[] = ['rookie', 'runner', 'scout'];
/** §8.2 : rôle MAXIMAL qu'un co_captain peut attribuer en promotion. */
export const CO_CAPTAIN_PROMOTE_MAX_ROLE: CrewRole = 'strategist';

// ─── §37.2 Disponibilité de guerre (colonne crew_members) ────────────────────
export type WarAvailability = 'war' | 'defense' | 'exploration' | 'casual' | 'absent';
export const WAR_AVAILABILITY: readonly WarAvailability[] = [
  'war', 'defense', 'exploration', 'casual', 'absent',
];
export const WAR_AVAILABILITY_DEFAULT: WarAvailability = 'casual';

// ─── §37.1 Paramètres crew (discovery) ───────────────────────────────────────
/** `crews.statut` historique (0010) — le recrutement AMENDEMENT-16 §3 vit dans
 * `crews.recruitment_status` (CREW_RECRUITMENT_STATUSES ci-dessous, 0011+0013). */
export type CrewJoinPolicy = 'open' | 'request' | 'closed';
export const CREW_JOIN_POLICIES: readonly CrewJoinPolicy[] = ['open', 'request', 'closed'];
export type CrewObjective = 'casual' | 'competitif' | 'pionnier';
export const CREW_OBJECTIVES: readonly CrewObjective[] = ['casual', 'competitif', 'pionnier'];

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-16 §3 — Crews façon clan : rookie, recrutement, tags (doc §8-§10)
// ═══════════════════════════════════════════════════════════════════════════

/** Durée de la période d'essai rookie, en jours (§8.7). */
export const ROOKIE_TRIAL_DAYS = 7;
/**
 * Restrictions DATA-driven de l'essai rookie (§8.7) : le serveur les applique
 * (Edge Functions rôle-gated V1), l'UI les affiche. Les interdictions sont déjà
 * encodées dans CREW_PERMISSIONS (rookie absent de useCrewItems/massPing/
 * readWarRoomStats) — ce bloc documente l'INTENTION et porte le seul droit
 * positif : la contribution du rookie compte (coffre §39, XP crew §34).
 */
export const ROOKIE_RESTRICTIONS = {
  crewItems: false, // pas d'utilisation des objets crew
  massPing: false, // pas de ping massif
  warRoomFull: false, // War Room limitée (résumé, pas de stats complètes)
  contributionCounted: true, // contribution comptée malgré l'essai
} as const;

/** Statuts de recrutement (§9) — `crews.recruitment_status` (0013). */
export type CrewRecruitmentStatus = 'open' | 'on_request' | 'invite_only' | 'closed';
export const CREW_RECRUITMENT_STATUSES: readonly CrewRecruitmentStatus[] = [
  'open', 'on_request', 'invite_only', 'closed',
];
/** Défaut recommandé (§9 : « Sur demande, mode recommandé par défaut »). */
export const CREW_RECRUITMENT_DEFAULT: CrewRecruitmentStatus = 'on_request';

/**
 * Les 9 tags de style de crew (§10) : discovery, matching, recommandations,
 * recrutement, identité sociale. Clés stockées en DB (`crews.tags`, 0013),
 * libellés FR affichés tels quels. `defense`/`raid` REMPLACENT les anciens
 * rôles defender/raider (AMENDEMENT-16 §3) — style de crew, pas hiérarchie.
 */
export const CREW_TAGS = {
  casual: 'Casual',
  competitif: 'Compétitif',
  defense: 'Défense',
  raid: 'Raid',
  exploration: 'Exploration',
  performance: 'Performance',
  run_club: 'Run Club réel',
  debutants_ok: 'Débutants acceptés',
  pionnier: 'Pionnier',
} as const;
export type CrewTag = keyof typeof CREW_TAGS;
export const CREW_TAG_KEYS = Object.keys(CREW_TAGS) as readonly CrewTag[];

// ─── §39 Crew Chest hebdomadaire ─────────────────────────────────────────────
/** Paliers du coffre (§39.2) : fraction de la cible atteinte (bornes basses). */
export const CREW_CHEST_TIERS = {
  bronze: 0.25,
  silver: 0.5,
  gold: 0.75,
  carbon: 1.0,
  elite: 1.5,
} as const;
export type CrewChestTier = keyof typeof CREW_CHEST_TIERS;
/** Ordre croissant des paliers (le plus haut atteint gagne). */
export const CREW_CHEST_TIER_ORDER: readonly CrewChestTier[] = [
  'bronze', 'silver', 'gold', 'carbon', 'elite',
];
/**
 * Cible hebdomadaire de points pondérés du coffre (§39.1). Base documentée MVP :
 * 2000 points pondérés/semaine (≈ un crew actif de 10 membres capturant ~40
 * hexes/membre — atteint le palier carbon 100 %). Ajustable par saison.
 */
export const CREW_CHEST_WEEKLY_TARGET = 2_000;
/**
 * Poids de progression du coffre (§39.1) : combien chaque événement de la
 * semaine ajoute à la jauge. Distinct de l'XP crew (le coffre récompense
 * l'effort collectif hebdo, l'XP la progression permanente du crew).
 */
export const CREW_CHEST_WEIGHTS = {
  hexCaptured: 1,
  hexDefended: 1,
  routeOpened: 25,
  missionCompleted: 20,
  verifiedRun: 5,
  offensiveCompleted: 100,
} as const;
export type CrewChestSource = keyof typeof CREW_CHEST_WEIGHTS;

// ─── §45 Crew Activity Score ─────────────────────────────────────────────────
/** Poids (%) des composantes du score de santé crew (§45) — somme = 100. */
export const ACTIVITY_SCORE_WEIGHTS = {
  activeMembers7d: 0.3, // 30 % membres actifs 7 jours
  verifiedRuns: 0.2, // 20 % runs vérifiés
  missions: 0.2, // 20 % missions complétées
  coordination: 0.15, // 15 % chat/coordination (MVP : proxy participation)
  defense: 0.1, // 10 % défense
  fairPlay: 0.05, // 5 % fair-play
} as const;
/** Statuts de santé crew par seuil de score (bornes basses, score 0-100, §45). */
export const ACTIVITY_STATUS_THRESHOLDS = {
  dormant: 0,
  casual: 20,
  active: 45,
  competitive: 70,
  war_ready: 90,
} as const;
export type CrewActivityStatus = keyof typeof ACTIVITY_STATUS_THRESHOLDS;

// ─── §43.1 Player Level 1-50 + tiers visuels ─────────────────────────────────
/** Nombre de niveaux joueur (MVP : courbe complète 1-50, §43.1). */
export const PLAYER_LEVEL_MAX = 50;
/**
 * Base de la courbe géométrique douce d'XP joueur : XP cumulée pour ATTEINDRE
 * le niveau L = round(PLAYER_LEVEL_XP_BASE × (ratio^(L-1) − 1) / (ratio − 1)).
 * Documentée : douce (ratio 1,12) pour que L50 ≈ 380k XP (≈ 380k points
 * territoire, XP_RATE_OF_POINTS=1) — atteignable sur plusieurs saisons, jamais
 * acheté (survit au reset, AMENDEMENT-02 §6). La table est matérialisée dans
 * PLAYER_LEVEL_XP par playerLevelXpTable() (engine) — ici les paramètres seuls.
 */
export const PLAYER_LEVEL_XP_BASE = 200;
export const PLAYER_LEVEL_XP_RATIO = 1.12;
/** Tiers visuels joueur par tranche de niveau (§43.1, bornes basses). */
export const PLAYER_TIER_THRESHOLDS = {
  road: 1,
  tempo: 10,
  race: 20,
  carbon: 30,
  elite: 40,
  legend: 50,
} as const;
export type PlayerTier = keyof typeof PLAYER_TIER_THRESHOLDS;

// ─── §43.3 Personnage GRIP — 7 rangs cosmétiques dérivés du niveau joueur ─────
/**
 * Rangs du personnage-mascotte GRIP (une POSE par palier — la bande de référence
 * fondateur : nu → course → loupe → bouclier → drapeau → bandeau → couronne).
 * COSMÉTIQUE PUR : la pose se GAGNE au niveau joueur (§43.1, points de jeu course
 * + contributions), JAMAIS achetée — anti pay-to-win. Bornes basses de NIVEAU (pas
 * une nouvelle courbe : réutilise PLAYER_LEVEL_XP / playerLevelForXp). L'argent
 * n'achète que du cosmétique neutre (skin/frame), jamais un rang.
 */
export const GRIP_RANK_LEVELS = {
  rookie: 1,
  runner: 5,
  scout: 12,
  defender: 20,
  conqueror: 30,
  veteran: 40,
  legend: 50,
} as const;
export type GripRank = keyof typeof GRIP_RANK_LEVELS;

// ─── §43.2 Crew Level Badge Frame (tiers visuels par niveau crew) ────────────
/** Tier du cadre de blason crew par tranche de niveau (§43.2, bornes basses). */
export const CREW_FRAME_THRESHOLDS = {
  road: 1,
  tempo: 5,
  race: 10,
  carbon: 15,
  elite: 20,
  legend: 30,
} as const;
export type CrewFrameTier = keyof typeof CREW_FRAME_THRESHOLDS;

// ─── §38 Offensives / défense ────────────────────────────────────────────────
/** Durée standard d'une offensive crew simple (§38.2, exemple : 24 h). */
export const OFFENSIVE_DURATION_H = 24;
/**
 * Résultat d'une offensive selon la fraction de l'objectif hexes atteinte
 * (bornes basses). victory ≥ 100 %, partial ≥ 50 %, sinon fail (§38.3).
 */
export const OFFENSIVE_RESULT_THRESHOLDS = {
  fail: 0,
  partial: 0.5,
  victory: 1.0,
} as const;
export type OffensiveResult = 'fail' | 'partial' | 'victory';
/** Durée de vie standard d'une mission de défense crew (§38.3). */
export const DEFENSE_MISSION_DURATION_H = 48;

// ─── AMENDEMENT-07 §3 Runs groupés & anti-farm ───────────────────────────────
/** Écart de départ maximal (min) entre deux courses pour un même Group Run. */
export const GROUP_RUN_START_TOLERANCE_MIN = 3;
/** Chevauchement de trace minimal (ratio d'hexes communs) pour un Group Run. */
export const GROUP_RUN_OVERLAP_MIN = 0.7;
/**
 * Part d'hexes partagés minimale (ratio des hexes de CHAQUE course qui sont
 * communs) pour valider un Group Run. Approx MVP : |A∩B| / min(|A|,|B|).
 */
export const GROUP_RUN_HEX_SHARE_MIN = 0.7;
/**
 * Barème de contribution crew d'un hex re-parcouru en Group Run par le MÊME
 * crew (§6) : le 1ᵉʳ capture (part pleine implicite = 1re entrée), les suivants
 * apportent une contribution DÉCROISSANTE PLAFONNÉE — pas de multiplication du
 * territoire. Indices au-delà de la table → dernier pas (0.1).
 */
export const SAME_CREW_CONTRIB_STEPS = [1, 0.3, 0.2, 0.1] as const;
/** Handle @ social (AMENDEMENT-07 §4, doc §44) : minuscules/chiffres/_, 3-20. */
export const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;
/**
 * Anti-collusion (§11, approx MVP) : nombre d'alternances de reprise d'un même
 * hex entre les DEUX mêmes crews au-delà duquel le bonus vol est retiré (statut
 * `stats_only`). Une « alternance » = un changement de crew possédant l'hex.
 */
export const COLLUSION_MAX_ALTERNATIONS = 3;

// ─── AMENDEMENT-41 : sorties de groupe — LE RELAIS ────────────────────────────
/**
 * Plafond QUOTIDIEN de points de RELAIS (`co_captured`) par compte. Le relais
 * paie une part 1/rang de la valeur d'un hex fraîchement pris par un autre
 * coureur (loi harmonique — AUCUN barème : `coCaptureShare` dans engine/social).
 * Ce cap borne le rendement d'une ferme multi-comptes en attendant la
 * séparation plausible des traces (A-41 §5.3). Ordre de grandeur : la valeur
 * d'une boucle solo type (~200 hexes × POINTS_BASE_PER_ZONE).
 * Distinct de MAX_CLAIMS_PER_DAY : un relais n'est PAS un claim (il n'écrit
 * jamais lock/decay/owner) et ne consomme pas ce plafond-là.
 */
export const CO_CAPTURE_DAILY_POINTS_CAP = 2_000;

// ─── Mission dynamique RÉELLE (repositionnement « mission-first ») ────────────
/**
 * Fenêtre « ta zone expire bientôt » : une zone à MOI dont le decay tombe dans
 * moins de MISSION_DEFEND_WINDOW_H devient LA mission prioritaire (« défends X
 * avant {h} h »). Au-delà, la mission bascule sur l'extension de territoire.
 * 100 % dérivée de données RÉELLES (hex_claims.decay_at) — jamais une urgence
 * fabriquée (règle zéro-mensonge).
 */
export const MISSION_DEFEND_WINDOW_H = 72;

// ─── AMENDEMENT-41 §4 Bonus de capture COLLECTIF (CAPÉ, anti pay-to-win) ──────
/**
 * Avantage de groupe #1 — bonus de VITESSE de remplissage du contrôle d'un hex
 * quand plusieurs coéquipiers du MÊME crew capturent ENSEMBLE (co-présents sur
 * la capture). Barème croissant PLAFONNÉ par nombre de runners.
 *
 * Anti pay-to-win (constitution §52) : ce bonus se GAGNE par l'effort collectif
 * (courir ensemble, au même endroit, au même moment) — il ne s'ACHÈTE JAMAIS.
 * Il s'applique UNIQUEMENT à la vitesse de remplissage du contrôle (le temps
 * pour verrouiller l'hex), JAMAIS aux points bruts ni au territoire gagné, et
 * il est CAPÉ (+40 % absolu) pour qu'un gros crew ne « steamroll » pas par le
 * nombre. Le SOLO reste viable : 1 runner = +0 %, aucune pénalité.
 *
 * Indexé par nombre de coéquipiers présents : idx 0 et 1 → 0 % (solo = plancher),
 * 2 → +15 %, 3 → +25 %, 4 → +35 %, 5+ → +40 % (dernier pas = cap absolu, indices
 * au-delà de la table saturent au cap). Barème monotone croissant.
 */
export const GROUP_CAPTURE_BONUS_BY_RUNNERS: readonly number[] = [0, 0, 0.15, 0.25, 0.35, 0.4];
/** Cap ABSOLU du bonus de capture collectif (part 0-1). Jamais dépassé. */
export const GROUP_CAPTURE_BONUS_MAX_PCT = 0.4;

// ─── AMENDEMENT-41 §4 Crew Streak (avantage de groupe #2, se GAGNE) ───────────
/**
 * Avantage de groupe #2 — le STREAK crew (le streak PERSO existe déjà :
 * STREAK_* §MVP). Récompense la RÉGULARITÉ collective : nombre de jours où le
 * crew est resté actif d'affilée. Bornes BASSES (accessible dès le 1er jour),
 * paliers cosmétiques/fonctionnels sains — jamais un gain de territoire ou de
 * points (anti pay-to-win) : `bonus` ouvre un bonus de coffre capé (déjà borné
 * ailleurs), `premiumBadge` est purement un statut COSMÉTIQUE.
 *
 * jours actifs → tier (borne basse, on prend le plus haut palier franchi) :
 *  1 j  → `active`        (streak amorcé)
 *  3 j  → `bonus`         (le crew débloque son bonus de régularité)
 *  7 j  → `chestPlus`     (coffre amélioré — plafond de coffre inchangé)
 *  30 j → `premiumBadge`  (badge premium — COSMÉTIQUE/statut, zéro gameplay)
 */
export const CREW_STREAK_THRESHOLDS = {
  active: 1,
  bonus: 3,
  chestPlus: 7,
  premiumBadge: 30,
} as const;
/** Tier de streak crew ('none' = sous le 1er palier, streak non amorcé). */
export type CrewStreakTier = 'none' | keyof typeof CREW_STREAK_THRESHOLDS;

// ─── AMENDEMENT-07 §5 Challenges (motivation §15-§16) ────────────────────────
/** Types de challenge (motivation §15). `event`/`season` catalogués, hors MVP actif. */
export const CHALLENGE_TYPES = ['solo', 'crew', 'rivalry', 'event', 'season'] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];
/** Difficulté d'un challenge (motivation §16) — étiquette UI, pas de gameplay. */
export const CHALLENGE_DIFFICULTIES = ['chill', 'standard', 'intense'] as const;
export type ChallengeDifficulty = (typeof CHALLENGE_DIFFICULTIES)[number];
/**
 * Métriques mesurables d'un challenge (goal.metric). Sous-ensemble aligné sur
 * les stats déjà alimentées (ingest_run/jobs) + les compteurs de challenge.
 * `runs` = nombre de courses valides ; `defends` = hexes défendus ;
 * `hexes` = hexes capturés ; `distanceM` = distance cumulée (m).
 */
export const CHALLENGE_METRICS = ['runs', 'distanceM', 'hexes', 'defends'] as const;
export type ChallengeMetric = (typeof CHALLENGE_METRICS)[number];
/**
 * Durée standard d'un challenge rivalry (motivation §17.4, exemple 48 h). Les
 * bornes réelles (starts_at/ends_at) sont en base ; cette constante documente
 * le défaut MVP du seed.
 */
export const RIVALRY_DURATION_H = 48;

/**
 * Seeds MVP des challenges (motivation §15-§16, seed 0012). DATA du catalogue :
 * la migration 0012 les insère telles quelles. Aucun nombre magique ailleurs.
 *  - solo Consistency II : 3 courses/semaine ;
 *  - solo Distance : 10 km cumulés ;
 *  - solo Defense : 30 hexes défendus ;
 *  - crew Defense Week : 300 hexes collectifs, minimum perso 20 (§8.3) ;
 *  - rivalry Night Pacers vs Canal : 48 h, Paris Est.
 */
export const CHALLENGE_SEEDS = {
  consistency_ii: { type: 'solo', metric: 'runs', target: 3, difficulty: 'standard' },
  distance_10k: { type: 'solo', metric: 'distanceM', target: 10_000, difficulty: 'standard' },
  defense_30: { type: 'solo', metric: 'defends', target: 30, difficulty: 'standard' },
  crew_defense_week: {
    type: 'crew',
    metric: 'defends',
    collectiveTarget: 300,
    personalMinimum: 20,
    difficulty: 'intense',
  },
  rivalry_night_canal: {
    type: 'rivalry',
    metric: 'hexes',
    durationH: RIVALRY_DURATION_H,
    difficulty: 'intense',
  },
} as const;

// ─── AMENDEMENT-07 §7 Leaderboards gradués (motivation §10) ──────────────────
/** Niveaux de classement, du plus intime au plus exposé (motivation §10.1). */
export const LEADERBOARD_LEVELS = [
  'personnel',
  'crew',
  'amis',
  'local',
  'ville',
  'region',
  'france',
  'global',
] as const;
export type LeaderboardLevel = (typeof LEADERBOARD_LEVELS)[number];
/**
 * Niveaux VISIBLES par défaut selon le play_style (motivation §10.2). Un
 * classement absent de la liste est masqué par défaut (activable en réglages).
 * `discreet_mode` retire TOUJOURS `global` (et l'exposition large) par-dessus —
 * cf. leaderboardVisibility (engine/challenge.ts).
 */
export const LEADERBOARD_DEFAULT_VISIBILITY: Record<PlayStyleKey, readonly LeaderboardLevel[]> = {
  focus_solo: ['personnel', 'crew'],
  mixte: ['personnel', 'crew', 'amis', 'local'],
  crew_war: ['personnel', 'crew', 'amis', 'local', 'ville', 'region', 'france'],
} as const;
/** Play styles (miroir de PlayStyle dans types.ts — évite l'import circulaire). */
export type PlayStyleKey = 'focus_solo' | 'mixte' | 'crew_war';

// ─── AMENDEMENT-07 §9.2 Coopétition multi-critères (motivation §9.2) ──────────
/**
 * Poids des critères du score coopétitif crew (motivation §9.2) : PAS que la
 * vitesse — régularité / défense / participation / exploration / fiabilité, pour
 * qu'un coureur lent reste utile. Somme = 1. DATA : engine/challenge.ts les
 * consomme, aucune valeur en dur ailleurs.
 */
export const COOPETITION_WEIGHTS = {
  regularity: 0.25, // régularité (jours/semaines actifs)
  defense: 0.25, // hexes défendus
  participation: 0.2, // présence aux sorties/missions crew
  exploration: 0.15, // hexes pionniers / zones ouvertes
  reliability: 0.15, // fiabilité (courses vérifiées, fair-play)
} as const;
export type CoopetitionCriterion = keyof typeof COOPETITION_WEIGHTS;

// ─── AMENDEMENT-07 §6 Courses saines (motivation §19, healthy badges) ────────
/**
 * Recovery Run : une course « facile » (easyMode) dont l'allure moyenne est
 * STRICTEMENT plus lente que ce seuil compte comme récupération. Seuil doux
 * (7:00/km) : la récup se choisit, elle n'est jamais imposée ni jugée.
 */
export const RECOVERY_MIN_AVG_PACE_S_KM = 7 * 60;
/**
 * Balanced Week : une semaine ISO active est « équilibrée » si le nombre de
 * courses valides est dans [min ; max] (ni sous- ni sur-entraînement, §18).
 * Bornes INCLUSES.
 */
export const BALANCED_WEEK_MIN_RUNS = 2;
export const BALANCED_WEEK_MAX_RUNS = 6;
/**
 * Smart Runner : une course « smart » est vérifiée (motionTrust ≥
 * VERIFIED_MIN_TRUST), non flaggée, ET à allure moyenne dans la plage
 * raisonnable de course (réutilise RUN_AVG_PACE_MIN/MAX_S_KM). Documenté :
 * pas de nouveau nombre magique, on réutilise les bornes de validité §3.2.
 */

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-12 §B — « La boucle fait la zone » (delta §3.1, 04/07/2026)
// Trait (défaut, inchangé) : une course capture le couloir de cellules res 10
// traversées. Boucle fermée : l'INTÉRIEUR du polygone de la trace est capturé,
// chaque cellule intérieure passant UNE PAR UNE par les règles existantes
// (lock 24 h, bouclier, protection nouveau joueur, vol/barème, contested
// AMENDEMENT-07, plafond MAX_CLAIMS_PER_DAY couloir + intérieur).
// « Trace un trait, tu prends la rue. Ferme la boucle, tu prends la zone. »
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Tolérance de fermeture : la trace est une boucle si son arrivée revient à
 * ≤ 80 m de son départ (durci 100 → 80 m par AMENDEMENT-16 §2, critères MVP
 * doc §5 « fermeture : < 80 m »). 2ᵉ mode de fermeture MVP (AMENDEMENT-16 §2,
 * doc §4.2) : AUTO-INTERSECTION — le tracé se recroise → la partie fermée fait
 * la boucle, un 8 = LA PLUS GRANDE boucle (detectLoop, engine/hexing.ts).
 */
export const LOOP_CLOSE_TOLERANCE_M = 80;
/**
 * Périmètre minimal d'une boucle : en deçà, couloir seulement (pas de
 * micro-boucle farmée sur place — filtre AUSSI les micro-croisements du bruit
 * GPS en mode auto-intersection). L'auto-limite isopérimétrique (aire ≤ P²/4π)
 * reste vraie physiquement, mais le plafond EXPLICITE est désormais
 * LOOP_MAX_AREA_BY_DISTANCE_KM2 (AMENDEMENT-16 §2, ci-dessous) — et le plafond
 * quotidien MAX_CLAIMS_PER_DAY (appliqué au total couloir + intérieur,
 * intérieur tronqué par distance croissante au tracé) reste la borne dure.
 */
export const LOOP_MIN_PERIMETER_M = 1_000;

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-16 §2 — Durcissement boucle→zone (delta AMENDEMENT-12, doc §4-§6,
// 05/07/2026). « Le territoire se gagne avec les jambes » : une boucle reste
// une COURSE VALIDE même quand son intérieur est plafonné ou refusé — seuls
// les messages doux changent (capReached / loopRejectedReason, types.ts).
// Zones interdites GÉOGRAPHIQUES (eau, autoroutes, voies ferrées, zones
// militaires, écoles, hôpitaux, zones dangereuses signalées — doc §5 étape 5)
// = V1 EXPLICITE : nécessite une source géo serveur ; le mécanisme
// no_capture_zones + privacy zones EXISTANT s'applique déjà cellule par
// cellule (decideClaims) et servira de support au seed géo V1.
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Aire capturable MAXIMALE d'une boucle selon la distance courue (doc §6
 * « Boucle trop grande ») : paires [distance courue (km), aire max (km²)].
 * 3 km → 0,25 km² ; 5 km → 0,8 km² ; 10 km → 1,8 km². INTERPOLATION LINÉAIRE
 * entre paliers ; EXTRAPOLATION BORNÉE au ratio du palier le plus proche
 * (< 3 km : × 0,25/3 par km ; > 10 km : × 1,8/10 par km — jamais plus
 * généreux que le dernier ratio). Au-delà du plafond : intérieur TRONQUÉ par
 * distance croissante au tracé (mécanisme enclosedCells existant) + réponse
 * capReached=true — copy gelée : « Boucle validée. Capture plafonnée : seuls
 * les secteurs proches du tracé sont capturés. »
 */
export const LOOP_MAX_AREA_BY_DISTANCE_KM2 = [
  [3, 0.25],
  [5, 0.8],
  [10, 1.8],
] as const;
/**
 * Cap DUR d'aire capturable d'une boucle (km²), en PLUS de la table par
 * distance (doc §9 « surface_max = distance × 0,18 capée à 3 km² »,
 * AMENDEMENT-23 §D). loopMaxAreaM2 borne le résultat de l'extrapolation par
 * distance à ce plafond : même un run de 25 km ne capture jamais plus de
 * 3 km² d'intérieur. TUNABLE.
 */
export const LOOP_MAX_AREA_CAP_KM2 = 3.0;
/**
 * GPS trust MINIMAL (0-100) pour qu'une boucle capture son INTÉRIEUR plein
 * (doc §5 « GPS trust : minimum 80 / 100 », AMENDEMENT-23 §D). En deçà, la
 * boucle reste une COURSE VALIDE et son couloir est pris, mais son intérieur
 * n'est PAS attribué (gate anti-abus : une boucle au GPS douteux ne crée pas de
 * zone pleine). Aligné sur VERIFY_FULL_MIN (80). TUNABLE.
 */
export const LOOP_MIN_GPS_TRUST = 80;
/**
 * Compacité minimale d'une boucle : 4πA/P² (1 = cercle, 0 = trait). Choix
 * documenté 0,12 dans la plage produit 0,10-0,15 (doc §6 « Boucle trop
 * fine ») : un carré vaut π/4 ≈ 0,785, un rectangle 4:1 ≈ 0,5, un rectangle
 * ~28:1 ≈ 0,12 — on ne rejette que les formes plus étirées, jamais un tour
 * de quartier honnête.
 */
export const LOOP_MIN_COMPACTNESS = 0.12;
/**
 * Largeur moyenne minimale (m) d'une boucle, ESTIMÉE 2A/P (doc §6 : pas de
 * calcul exotique) : durcie 60 → 80 m (AMENDEMENT-23 §D, doc §5 « largeur
 * moyenne minimum : 80 m ») ≈ ~3 zones res 10 de large. En deçà (aller-retour
 * sur deux rues parallèles très proches) : course valide, intérieur REFUSÉ —
 * loopRejectedReason='narrow', copy gelée : « Zone non capturée : forme trop
 * étroite. »
 */
export const LOOP_MIN_WIDTH_M = 80;
/**
 * Mise en scène de la boucle (AMENDEMENT-12 §C — PRÉSENTATION, pas des règles
 * serveur) : « Boucle ouverte » (pointillé position → départ) sous 600 m,
 * aperçu de la zone fantôme + « Ferme ta boucle » sous 300 m (chiffre spécifié
 * par l'amendement, d'où sa place ici et pas dans un fichier UI).
 */
export const LOOP_HINT_DISTANCE_M = 600;
export const LOOP_PREVIEW_DISTANCE_M = 300;

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-15 §1 — Moteur GPS pur (pipeline IDENTIQUE client/serveur).
// Le client pré-filtre pour l'affichage, le serveur reste SEUL juge du claim.
// Les bornes de VITESSE course ne sont PAS dupliquées ici : le moteur GPS
// réutilise les règles §3.2 existantes (POINT_MAX_SPEED_KMH pour la vitesse
// implicite max, POINT_MAX_JUMP_M pour la téléportation, POINT_MAX_ACCURACY_M
// comme seuil « signal faible » de la jauge).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Précision horizontale maximale d'un fix GPS accepté par cleanTrace (m).
 * Au-delà : point rejeté (outlier accuracy). Plus tolérant que le filtre de
 * claim §3.2 (POINT_MAX_ACCURACY_M = 25) : le moteur GPS garde des points
 * « affichables » 25-35 m pour la continuité visuelle ; le serveur reste seul
 * juge des points qui claiment.
 */
export const GPS_ACCURACY_MAX_M = 35;
/** Précision (m) considérée « excellente » : jauge GPS pleine, composante accuracy du trust = 1. */
export const GPS_ACCURACY_GOOD_M = 10;
/** Vitesse (m/s) en dessous de laquelle le coureur est considéré à l'arrêt (~0,7 m/s < marche lente). */
export const GPS_PAUSE_SPEED_MS = 0.7;
/** Durée (s) sous GPS_PAUSE_SPEED_MS avant de basculer en segment pause (UI « En pause », distance non comptée). */
export const GPS_PAUSE_AFTER_S = 10;
/** Cadence d'échantillonnage FIXE du suivi GPS (ms) — 2 s + distanceInterval 0 + lissage moteur : suffisant au MVP (pas de cadence adaptative). */
export const GPS_SAMPLE_INTERVAL_MS = 2_000;
/** Sans fix frais depuis N s : signal « weak » (jauge orange, on continue d'enregistrer). */
export const GPS_SIGNAL_WEAK_AFTER_S = 5;
/** Sans fix frais depuis N s : signal « lost » (tunnel) — la distance ne compte JAMAIS un trou de signal. */
export const GPS_SIGNAL_LOST_AFTER_S = 15;
/** Plafond de points GPS envoyés à ingest_run (décimation Douglas-Peucker avant envoi). */
export const GPS_MAX_PAYLOAD_POINTS = 2_000;
/** Tolérance (m) du Douglas-Peucker « léger » de decimateForPayload — sous le bruit GPS, ne déforme pas la trace. */
export const GPS_DECIMATE_EPSILON_M = 2;
/**
 * Rayon (m) de la dérive GPS en immobilité (« jitter parking ») : à l'arrêt,
 * les fixes qui restent dans ce rayon de l'ancre du cluster stationnaire sont
 * rejetés (aucun faux mètre accumulé au feu rouge).
 */
export const GPS_JITTER_RADIUS_M = 8;
/** Taille (points, impaire) de la fenêtre de médiane glissante de smoothTrace. */
export const GPS_MEDIAN_WINDOW = 5;
/**
 * Re-verrouillage GPS : après N rejets CONSÉCUTIFS de téléportation/vitesse
 * contre la même ancre, le point suivant est accepté comme nouvelle ancre
 * (discontinuité marquée, distance non comptée à travers) — sinon un relock
 * permanent (démarrage à froid) tuerait toute la suite de la trace.
 */
export const GPS_REANCHOR_AFTER_REJECTS = 5;
/**
 * Pondération des composantes du GPS Trust 0-100 (somme = 1) :
 * accuracy moyenne des points gardés, temps de signal perdu, ratio d'outliers.
 */
export const GPS_TRUST_WEIGHTS = {
  accuracy: 0.5,
  signal: 0.25,
  outliers: 0.25,
} as const;
/** Ratio d'outliers (points rejetés / points reçus, hors jitter d'arrêt) qui met la composante outliers à 0. */
export const GPS_TRUST_OUTLIER_BAD_RATIO = 0.3;

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-16 §4 — Monétisation & contribution (doc §12-§26).
// ANTI PAY-TO-WIN ABSOLU : jamais vendu = territoire, km, zones, victoire,
// points leaderboard, attaque/défense illimitées. Vendable = statut,
// esthétique, personnalisation, confort, organisation, contribution GROUPÉE
// CAPÉE. Un effet de boost ne touche QUE la progression du coffre crew —
// JAMAIS points/XP/leaderboard.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prix EUR de référence des SKUs store (doc §19-§23). DATA : RevenueCat est la
 * source des prix réels côté store (O3) ; ici la référence catalogue (seed
 * migration 0014, affichage Arsenal). Aucun prix EUR en dur ailleurs.
 */
export const SKU_PRICES_EUR = {
  club_monthly: 4.99,
  club_annual: 34.99,
  starter_pack: 2.99,
  founder_pack: 9.99,
  eclats_s: 0.99,
  eclats_m: 2.99,
  eclats_l: 5.99,
  eclats_xl: 11.99,
  eclats_xxl: 24.99,
  crew_boost_24: 1.99,
  crew_boost_72: 4.99,
  crew_boost_weekend: 6.99,
  crew_boost_season: 14.99,
  cosmetic_chest_crew: 2.99,
  recruit_template_crew: 0.99,
  banner_crew: 3.99,
  gryd_pass: 7.99, // §23 — catalogué INACTIF (status draft, pas de SKU actif)
} as const;

/** Éclats crédités par le Founder Pack (doc §19.2). */
export const FOUNDER_PACK_ECLATS = 300;

/** Prix Éclats des objets fonctionnels capés (doc §20) + bannière crew (§21.5). */
export const STREAK_GEL_ECLATS = 60;
export const SCOUT_PING_ECLATS = 120;
export const BANNER_CREW_ECLATS = 350;

/**
 * Crew Boost (doc §13.1/§21) : contribution volontaire, effet UNIQUEMENT sur la
 * progression du coffre crew (multiplier), plafonné, non cumulable.
 *  - durationH null = jusqu'à la fin de la saison active (boost saison) ;
 *  - weekend : fenêtre 72 h à l'activation (approx MVP du « vendredi →
 *    dimanche » — l'ancrage calendaire exact est V1).
 */
export const CREW_BOOSTS = {
  crew_boost_24: { type: 'boost_24h', durationH: 24 },
  crew_boost_72: { type: 'boost_72h', durationH: 72 },
  crew_boost_weekend: { type: 'boost_weekend', durationH: 72 },
  crew_boost_season: { type: 'boost_season', durationH: null },
} as const;
export type CrewBoostSku = keyof typeof CREW_BOOSTS;
export type CrewBoostType = (typeof CREW_BOOSTS)[CrewBoostSku]['type'];

/** +25 % de progression coffre, borne DURE (jamais de cumul au-delà). */
export const CREW_BOOST_CHEST_MULTIPLIER = 1.25;
/** 1 seul boost actif à la fois par crew (doc §13.1 « Limites anti-abus »). */
export const CREW_BOOST_MAX_ACTIVE = 1;
/** Blackout : aucun effet de boost dans les N dernières heures d'une saison. */
export const BOOST_BLACKOUT_END_OF_SEASON_H = 48;
/** Gifting : l'offrande anonyme est TOUJOURS possible (doc §14, jamais de classement des payeurs). */
export const GIFT_ANONYMOUS_ALLOWED = true;
/**
 * Cadeau premium au crew (Coffre cosmétique / Crew Boost offert, AMENDEMENT-18
 * A.3) : anti pay-to-win STRICT. Chaque membre ne peut réclamer qu'UNE fois, et
 * l'offre EXPIRE au bout de 24 h. Jamais de montant, jamais de classement des
 * payeurs, jamais de territoire ni de point — seulement des cosmétiques.
 */
export const CREW_GIFT_CLAIMS_PER_MEMBER = 1;
export const CREW_GIFT_EXPIRY_H = 24;

/**
 * Items crédités à l'inventaire par les SKUs pack/gift (item_key du catalogue
 * 0014). rc_webhook les upsert via les RPC grant_user_items /
 * grant_crew_item ; le seed 0014 DOIT contenir chacune de ces clés.
 */
export const SKU_GRANTED_ITEM_KEYS = {
  starter_pack: [
    'skin_trace_neon_ivory',
    'frame_road',
    'template_first_zone',
    'streak_gel',
  ],
  founder_pack: [
    'founder_badge',
    'frame_founder',
    'skin_territory_founder_glow',
    'skin_trace_founder_line',
    'title_founder_runner',
    'template_founder',
  ],
  cosmetic_chest_crew: ['crew_cosmetic_chest'],
  recruit_template_crew: ['crew_recruit_template'],
  banner_crew: ['crew_banner_impact'],
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-17 §CHANTIER 2 — Boucle crew collaborative (05/07/2026).
// Mécanique fondateur : « Ouvre une frontière. Ton crew peut la fermer. »
// Un run VALIDE, long, NON bouclé mais FERMABLE (les deux extrémités pourraient
// se rejoindre par un segment court) crée une FRONTIÈRE PARTIELLE gardée 24 h ;
// un membre du MÊME crew qui court le segment manquant referme la boucle →
// ZONE CREW, contributions réparties au prorata de la longueur validée.
// Réutilise TOUTES les règles boucle/surface d'AMENDEMENT-12/§16 (LOOP_*,
// loopShapeVerdict, loopMaxAreaM2…) — la frontière n'est qu'une boucle dont il
// manque un morceau. ANTI-ABUS (strict, moteur pur testé) : même crew
// uniquement (rival qui chevauche → contested, jamais de complétion au MVP) ;
// TTL 24 h (expiré → segments = exploration/contribution, pas de zone) ; tous
// segments GRYD Verified (un segment douteux → boucle incomplète, pas de
// complétion) ; contribution min du finisher ; jamais de complétion par achat.
// UX : « Il manque 620 m pour prendre République. » — jamais de polylines
// multiples, de scores de géométrie, de cellules ni de % trop précis.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Durée de vie (heures) d'une frontière partielle OUVERTE (chantier 2). Passé
 * ce délai sans complétion, digest_job la passe `expired` : ses segments
 * comptent en exploration/contribution, jamais en zone (aucun claim).
 */
export const PARTIAL_BOUNDARY_TTL_H = 24;
/**
 * Tolérance (m) de JONCTION du finisher (chantier 2) : le run qui referme la
 * boucle doit rejoindre le segment manquant à ≤ cette distance À CHACUNE de ses
 * deux extrémités (les deux « bouts ouverts » de la frontière). Alignée sur la
 * fermeture boucle durcie LOOP_CLOSE_TOLERANCE_M (80 m, AMENDEMENT-16 §2) :
 * fermer une frontière crew = fermer une boucle, même exigence géométrique.
 */
export const PARTIAL_JOIN_TOLERANCE_M = 80;
/**
 * Contribution MINIMALE du finisher pour valider une complétion (chantier 2),
 * en OU : le run du finisher couvre un segment ≥ FINISHER_MIN_SEGMENT_M (400 m,
 * ordre de grandeur d'une vraie portion de frontière — pas un pas de porte),
 * OU sa part ≥ FINISHER_MIN_SHARE (15 %) de la longueur totale de la frontière.
 * En deçà des DEUX : pas de complétion (canComplete.reason='finisher_too_short')
 * — anti-abus « je ferme la zone d'un autre en courant 20 m ».
 */
export const FINISHER_MIN_SEGMENT_M = 400;
export const FINISHER_MIN_SHARE = 0.15;

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-19 §2/§5/§6 — Bonus aléatoires CIBLÉS (moteur d'opportunités).
// « GRYD ne te donne pas des bonus au hasard. Il révèle les bons moments pour
// agir. » Aléatoire dans l'APPARITION, ciblé dans la PERTINENCE, capé dans
// l'IMPACT, clair dans l'UX, JAMAIS de victoire achetée. Un bonus ne touche
// QUE coffre crew / XP / progrès badge / durée de protection / cosmétique —
// jamais territoire/points/classement.
//
// Ce bloc = les CAPS et COOLDOWNS (seuls nombres autorisés hors game-rules).
// Les FICHES des 6 bonus (id/trigger/reward/visibilité/copy…) vivent en DATA
// dans packages/shared/src/bonuses.ts — qui consomme ces constantes, aucun
// nombre magique. Le moteur pur packages/engine/src/bonus.ts applique la
// sélection pondérée et le cap.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CAP D'IMPACT ABSOLU (doc §5) : un bonus système + un Crew Boost acheté ne se
 * cumulent JAMAIS multiplicativement. UN SEUL multiplicateur actif à la fois —
 * le MEILLEUR s'applique — et le total d'un effet de type « multiplicateur »
 * (coffre/XP/progrès) ne dépasse jamais +35 %. Exemple gelé : coffre système
 * 25 % + Crew Boost 25 % → 35 % (pas 56 %). Garanti par applyBonusReward
 * (engine/bonus.ts) qui borne DUREMENT le pourcentage total à cette valeur.
 * NB : CREW_BOOST_CHEST_MULTIPLIER (1.25 = +25 %) reste sous ce plafond ; un
 * bonus coffre de +25 % additionné au boost donne min(0.25+0.25, 0.35)=0.35.
 */
export const BONUS_MAX_TOTAL_PCT = 0.35;

/**
 * Seuil de PERTINENCE du bonus Finisher (doc §6.1) : une frontière crew
 * `open` (AMENDEMENT-17 partial_boundaries) n'est un « bon moment pour agir »
 * — donc éligible à un active_bonus Finisher — que si son segment manquant est
 * ≤ ce nombre de mètres (« il ne reste presque rien à courir »). Au-delà, la
 * frontière existe mais GRYD ne pousse pas de bonus dessus (pas assez proche).
 * Ordre de grandeur : le double d'une vraie portion de frontière courue.
 */
export const FINISHER_BONUS_MISSING_MAX_M = 800;

// ─── Opportunités proches (coach tactique de la carte) ───────────────────────
/**
 * Coach « opportunités proches » (§carte). `OPPORTUNITY_NEAR_MAX_M` = rayon
 * « autour de toi » (au-delà, une zone n'est plus une opportunité proche).
 * `OPPORTUNITY_DEFENSE_PRESSURE_MIN` = pression (0-100) au-dessus de laquelle une
 * zone TENUE devient « à défendre ». Anti pay-to-win : une opportunité se lit dans
 * la SITUATION (rôle + pression + distance), jamais achetée.
 */
export const OPPORTUNITY_NEAR_MAX_M = 2_000;
export const OPPORTUNITY_DEFENSE_PRESSURE_MIN = 50;

/**
 * Récompenses (part 0-1) des bonus MVP — TOUTES ≤ BONUS_MAX_TOTAL_PCT (le cap
 * les re-borne de toute façon). `chestPct` = surcroît de progression coffre
 * crew ; `xpPct` = surcroît d'XP perso. Pas de reward « points/territoire ».
 *  - Rare (doc §3) : +25 % coffre (Finisher, Défense Critique).
 *  - Commun/crew : +20 % progression coffre (Coffre Crew).
 *  - Retour/Exploration/Boucle Propre : XP + progrès badge + cosmétique/durée
 *    (pas de coffre — le boost porte sur la progression perso, jamais le rang).
 */
export const BONUS_REWARD_PCT = {
  finisher_chest: 0.25,
  defense_chest: 0.25,
  crew_chest: 0.2,
  return_xp: 0.1,
  exploration_xp: 0.1,
  clean_loop_xp: 0.1,
} as const;

/**
 * Progrès de badge offert par un bonus (points de progression vers le prochain
 * palier, AMENDEMENT-04). Petit, non pay-to-win : accélère un badge déjà en
 * cours, ne l'achète jamais. Uniforme MVP.
 */
export const BONUS_BADGE_PROGRESS = 1;

/**
 * Durée de PROTECTION (heures) offerte par le bonus Défense Critique (doc §6.2)
 * — prolonge le bouclier de la zone qui expire, jamais un gain de territoire.
 */
export const BONUS_PROTECTION_H = 24;

/**
 * Fenêtres de vie (heures) des bonus MVP (doc §6) : un active_bonus expire
 * passé sa `durationH` (digest_job le passe `expired`). Le Finisher hérite du
 * TTL de la frontière (PARTIAL_BOUNDARY_TTL_H) — il n'a pas de durée propre.
 */
export const BONUS_DURATION_H = {
  finisher: PARTIAL_BOUNDARY_TTL_H, // suit la frontière (24 h)
  defense_critical: 12,
  crew_chest: 6,
  return: 24,
  exploration: 48,
  clean_loop: 24,
} as const;

/**
 * CAPS anti-abus par bonus (doc §5/§6) : nombre maximal d'occurrences ré-
 * compensées par joueur/semaine et par crew/jour. `null` = pas de cap sur cet
 * axe. Ces plafonds sont vérifiés côté serveur (player_bonus_claims) AVANT
 * d'appliquer une récompense — jamais de spam de bonus.
 */
export const BONUS_CAPS = {
  finisher: { perPlayerPerWeek: 3, perCrewPerDay: 5 },
  defense_critical: { perPlayerPerWeek: null, perCrewPerDay: 1 },
  crew_chest: { perPlayerPerWeek: null, perCrewPerWeek: 1 },
  return: { perPlayerPerWeek: null, perPlayerPerDays: 14 },
  exploration: { perPlayerPerWeek: 2, perCrewPerDay: null },
  clean_loop: { perPlayerPerWeek: null, perCrewPerDay: null },
} as const;

/**
 * COOLDOWN (heures) minimal entre deux occurrences d'un même bonus sur la MÊME
 * zone/frontière (doc §5 « cooldown même zone ») : évite de re-déclencher le
 * même bonus au même endroit. 0 = pas de cooldown de zone.
 */
export const BONUS_COOLDOWN_H = {
  finisher: 24,
  defense_critical: 24,
  crew_chest: 0,
  return: 0,
  exploration: 24,
  clean_loop: 0,
} as const;

/**
 * PRIORITÉ d'affichage (doc §4) : plus le poids est ÉLEVÉ, plus le bonus est
 * urgent/important. selectBonus (engine/bonus.ts) choisit le bonus éligible de
 * plus forte priorité (défense urgente > boucle à terminer > mission crew >
 * coffre presque ouvert > retour/streak > exploration > cosmétique). C'est le
 * socle du « ciblé, jamais random nu » : à pertinence égale on ne tire pas au
 * hasard, on suit cet ordre. Valeurs espacées pour rester lisibles.
 */
export const BONUS_PRIORITY = {
  defense_critical: 70,
  finisher: 60,
  crew_chest: 50,
  return: 40,
  exploration: 30,
  clean_loop: 20,
} as const;

/**
 * Fenêtre de PERTINENCE du bonus Coffre Crew (doc §6.3) : le coffre hebdo n'est
 * un « bon moment » que dans la dernière ligne droite — progression comprise
 * dans [80 %, 95 %] du prochain palier. Exprimé en part 0-1 du palier.
 */
export const BONUS_CREW_CHEST_MIN_RATIO = 0.8;
export const BONUS_CREW_CHEST_MAX_RATIO = 0.95;

/**
 * Fenêtre d'ABSENCE (jours) du bonus Retour (doc §6.4, anti-shame) : le joueur
 * n'a pas couru depuis [5, 10] jours → GRYD propose un retour DOUX (« 2 km
 * suffisent »), jamais « tu vas perdre ta série ». Sous 5 j : pas encore
 * pertinent ; au-delà de 10 j : le Retour n'est plus le bon levier (V1).
 */
export const BONUS_RETURN_ABSENCE_MIN_DAYS = 5;
export const BONUS_RETURN_ABSENCE_MAX_DAYS = 10;

/**
 * Fenêtre de DÉCLENCHEMENT du bonus Défense Critique (doc §6.2) : une zone crew
 * dont le decay tombe dans les prochaines [0, 12] h est « en danger imminent ».
 */
export const BONUS_DEFENSE_DECAY_MAX_H = 12;

/**
 * ANTI-ABUS transverse (doc §5) : un bonus n'est jamais récompensé si le run
 * n'est pas GRYD Verified (Motion Trust ≥ ce seuil — pas de véhicule/GPS
 * douteux). Aligné sur VERIFIED_MIN_TRUST (badges.ts) : même exigence que la
 * fermeture de boucle crew. Dupliqué ici comme constante de règle de bonus
 * pour rester lisible côté DATA/moteur sans dépendre de badges.ts.
 */
export const BONUS_MIN_MOTION_TRUST = 70;

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-34 §DELTA-CLASH — emprunts Clash of Clans → GRYD (06/07/2026).
// SOURCE = le doc « Clash → GRYD » du fondateur (cadences façon clan, SANS
// obliger à courir tous les jours). ~85 % du mapping existait déjà (crew, rôles,
// perks par niveau, requêtes, feed, discovery, défense graduée, boucle crew) —
// ceci n'ajoute QUE le delta : RAID crew, REVANCHE, coffre quotidien (boost léger
// GRATUIT). ANTI PAY-TO-WIN STRICT : AUCUNE de ces constantes ne donne
// territoire / points / vitesse / protection — que du social, du statut et une
// jauge collective. Moteur PUR : engine/raid.ts + engine/revanche.ts.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Durée (heures) d'un RAID crew (source = doc Clash : « raid » collectif à
 * fenêtre courte façon Clan War / Raid Weekend). 48 h = un week-end de jeu.
 * Un raid est une OFFENSIVE COLLECTIVE à durée bornée dont la progression est
 * une jauge (zones prises pendant la fenêtre) ; consommé par engine/raid.ts
 * (`raidStatus` : active avant échéance / complete si cible atteinte / expired).
 * Anti pay-to-win : le raid ne DONNE pas de territoire bonus — il met en scène,
 * dans le temps, la conquête que le crew fait de toute façon.
 */
export const RAID_DURATION_HOURS = 48;
/**
 * Cible de DÉMO d'un raid (zones à prendre pendant la fenêtre) — valeur de
 * SEED/démo, pas un barème d'équilibrage (source = doc Clash, ordre de grandeur
 * d'un objectif de raid week-end à l'échelle d'un gros crew). Les vraies cibles
 * (par raid, par saison) seront en base ; cette constante documente le défaut
 * MVP/démo consommé par `raidProgressPct` et les écrans. TUNABLE.
 */
export const RAID_DEMO_TARGET_ZONES = 1_000;

/**
 * Fenêtre (heures) de REVANCHE (source = doc Clash : après s'être fait attaquer/
 * voler, on peut « rendre la pareille » pendant un temps limité). 24 h après le
 * déclenchement (un vol/une attaque rival sur une zone du joueur/crew), la
 * revanche est OUVERTE : signalisation sociale « prends ta revanche », pas un
 * bonus de gameplay. Consommé par engine/revanche.ts (`revancheActive` /
 * `revancheExpiry` / `revancheHoursLeft`). Anti pay-to-win STRICT : la revanche
 * ne donne NI point NI territoire supplémentaire NI protection — c'est un
 * MARQUEUR temporel qui invite à re-courir la zone (le gain reste celui des
 * règles normales de reprise/vol §3.4).
 */
export const REVANCHE_WINDOW_HOURS = 24;

/**
 * Coffre QUOTIDIEN — nombre de « boosts » gratuits offerts par jour (source =
 * doc Clash : récompense de connexion quotidienne, façon coffre/cadeau du jour).
 * 1/jour, GRATUIT (jamais acheté). Sert d'accroche de rétention douce.
 */
export const DAILY_CHEST_BOOST_PER_DAY = 1;
/**
 * Ampleur (fraction) du boost du coffre quotidien : PETIT et GRATUIT (+2 %).
 * S'applique — comme le Crew Boost payant (CREW_BOOST_CHEST_MULTIPLIER) — à la
 * PROGRESSION DU COFFRE crew UNIQUEMENT, jamais aux points/territoire/XP/
 * leaderboard. Anti pay-to-win STRICT : c'est un cadeau de connexion, pas un
 * levier payant ; l'effet est volontairement marginal (agrément, pas puissance).
 * TUNABLE.
 */
export const DAILY_CHEST_BOOST_PCT = 0.02;

// ═══════════════════════════════════════════════════════════════════════════
// Garde-fous de WALKABILITÉ des routes (sécurité — décision fondateur).
// « Vérifier que les routes utilisées sont bien accessibles à pied et non des
// autoroutes. » Deux couches complémentaires :
//   1. GÉNÉRATION : toute route GRYD est produite au profil PIÉTON (OSRM/valhalla
//      `foot`), qui EXCLUT structurellement autoroutes/voies rapides.
//   2. VALIDATION (défense en profondeur, engine/route.ts) : on RE-VÉRIFIE la
//      géométrie renvoyée (surtout pour les sources non maîtrisées — import
//      Strava, tracé utilisateur) contre une DENYLIST de classes de voies + une
//      plausibilité de connexité. Une route non piétonne n'est jamais proposée.
// Classes = valeurs OSM `highway=*`. Aucun nombre magique ailleurs.
// ═══════════════════════════════════════════════════════════════════════════
/** Profil de routage AUTORISÉ pour toute génération d'itinéraire GRYD (jamais car/bike). */
export const ROUTE_PEDESTRIAN_PROFILE = 'foot' as const;

/**
 * DENYLIST — classes de voies OSM sur lesquelles un coureur ne doit JAMAIS être
 * routé (piéton interdit / dangereux). Une seule occurrence rend la route non
 * walkable (rejet DUR). motorway/trunk = autoroutes et voies rapides ; les
 * `*_link` sont les bretelles ; raceway/bus_guideway/construction/proposed ne
 * sont pas des voies piétonnes utilisables.
 */
export const ROUTE_FORBIDDEN_HIGHWAY_CLASSES: readonly string[] = [
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'raceway',
  'bus_guideway',
  'construction',
  'proposed',
];

/**
 * ALLOWLIST — classes de voies OSM normalement praticables à pied (trottoirs,
 * chemins, rues résidentielles, voies partagées…). Une classe HORS de cette
 * liste ET hors denylist = `unknown_class` : signal DOUX (on n'affole pas, mais
 * on le remonte pour audit), jamais un rejet dur.
 */
export const ROUTE_WALKABLE_HIGHWAY_CLASSES: readonly string[] = [
  'footway',
  'path',
  'pedestrian',
  'living_street',
  'residential',
  'unclassified',
  'service',
  'track',
  'cycleway',
  'steps',
  'tertiary',
  'tertiary_link',
  'secondary',
  'secondary_link',
  'primary',
  'primary_link',
  'road',
];

/**
 * Écart MAX (m) entre deux sommets consécutifs d'un itinéraire avant de le juger
 * DÉCONNECTÉ (téléport / « vol d'oiseau » hors réseau : traversée d'eau, saut de
 * quartier). Volontairement HAUT (une longue avenue droite peut n'avoir qu'un
 * segment) — c'est un filet de connexité structurelle, pas un détecteur
 * d'autoroute (ça, c'est la denylist de classes). TUNABLE.
 */
export const ROUTE_MAX_STEP_M = 1_500;

/** Nombre MINIMAL de points d'un itinéraire exploitable (départ + arrivée). */
export const ROUTE_MIN_POINTS = 2;

// ═══════════════════════════════════════════════════════════════════════════
// LOT 3 — ZONE DU JOUR + DÉFI 7 JOURS D'ACCUEIL (A-45 §3, actions 3 et 4).
//
// DÉCISION FONDATEUR 21/07/2026 : l'app est GRATUITE, monétisée UNIQUEMENT par
// achats intégrés. Les deux mécaniques ci-dessous sont des mécaniques de
// RÉTENTION GRATUITES : elles ne sont ni vendues, ni accélérables contre de
// l'argent, et leur récompense est STRICTEMENT COSMÉTIQUE (anti pay-to-win §22).
//
// « L'APP NE MENT JAMAIS » s'applique intégralement ici : ces constantes sont
// des SEUILS DE LECTURE de données réelles (hex_claims, sectors, user_stats),
// jamais des paramètres de fabrication. Aucune zone, aucun rival, aucune ville
// n'est inventé — quand le réel ne porte rien, l'état honnête est « aucune ».
// ═══════════════════════════════════════════════════════════════════════════

// ─── A. Zone du Jour ─────────────────────────────────────────────────────────

/**
 * Fenêtre (heures) en deçà de laquelle une zone détenue est dite FRAGILE, donc
 * éligible comme Zone du Jour. C'est un seuil de LECTURE de `hex_claims.decay_at`
 * (échéance réellement posée en base à la capture), pas une urgence dramatisée :
 * en dehors de cette fenêtre, la zone n'est simplement pas comptée fragile.
 * Volontairement plus court que ZONE_DEFEND_WINDOW_HOURS (48 h) : la Zone du
 * Jour vit UNE journée, elle ne doit pas désigner une échéance de surlendemain.
 * TUNABLE.
 */
export const DAILY_ZONE_FRAGILE_WINDOW_H = 24;

/**
 * Nombre MINIMAL de zones réellement libres pour qu'un secteur soit éligible en
 * tant que candidat NEUTRE. `sectors.total_hexes − claims vivants` est un compte
 * exact (discover_sectors pose total_hexes depuis la propriété H3 des enfants
 * res-10 d'un res-7), jamais une estimation. À 0, le secteur est plein : le
 * proposer enverrait courir pour rien.
 */
export const DAILY_ZONE_MIN_FREE_HEXES = 1;

/**
 * Durée (heures) de la DISTINCTION VISUELLE obtenue en capturant la Zone du Jour.
 * Purement COSMÉTIQUE et TEMPORAIRE : zéro point, zéro XP, zéro Foulée, zéro
 * avantage de jeu, aucune influence sur le classement ni sur le decay
 * (anti pay-to-win STRICT §22 — et anti « pay-to-progress » tout court, puisque
 * la mécanique est gratuite). 24 h = la distinction couvre exactement la journée
 * où elle a du sens, puis s'éteint sans rien retirer au joueur.
 */
export const DAILY_ZONE_DISTINCTION_H = 24;

// ─── B. Défi 7 jours d'accueil ───────────────────────────────────────────────

/**
 * Horizon SUGGÉRÉ (jours) du défi d'accueil. C'est un RYTHME AFFICHÉ, jamais une
 * échéance couperet : passé le 7ᵉ jour, le défi reste ouvert et la progression
 * acquise reste acquise (règle ANTI-SHAME — cf. WELCOME_STEPS ci-dessous, et
 * l'absence totale de remise à zéro dans engine/welcomeChallenge.ts).
 */
export const WELCOME_CHALLENGE_DAYS = 7;

/**
 * Métrique RÉELLE derrière chaque étape d'accueil. Chacune est une colonne
 * `user_stats` DÉJÀ alimentée par ingest_run — aucune nouvelle instrumentation,
 * aucun compteur fabriqué :
 *   · `bestRunDistanceM` → user_stats.best_run_distance_m ;
 *   · `loopRuns`         → user_stats.loop_runs ;
 *   · `hexesCaptured`    → user_stats.hexes_captured ;
 *   · `shares`           → user_stats.first_shares.
 */
export const WELCOME_METRICS = [
  'bestRunDistanceM',
  'loopRuns',
  'hexesCaptured',
  'shares',
] as const;
export type WelcomeMetric = (typeof WELCOME_METRICS)[number];

/**
 * Les 5 étapes du défi d'accueil, DANS L'ORDRE (A-45 §3 action 4 :
 * « 3 km → 5 km → boucle → capture → partage »). DATA : le moteur pur
 * `deriveWelcomeChallenge` les consomme, la migration les seede, aucune valeur
 * n'est réécrite ailleurs.
 *
 * Pourquoi cet ordre : il monte en engagement sans jamais exiger l'étape
 * suivante avant que la précédente ait un sens — courir, courir un peu plus,
 * boucler (la mécanique propre à GRYD), capturer (la récompense), partager
 * (l'ouverture aux autres). Une étape est un PALIER, jamais un quota
 * hebdomadaire : elle se franchit une fois et ne se re-perd JAMAIS.
 *
 * ANTI-SHAME (contrainte non négociable) : rater un jour ne remet rien à zéro,
 * ne fait expirer aucune étape et ne produit aucun message de reproche. Le
 * `day` ci-dessous est une SUGGESTION de rythme affichée, pas une date limite.
 */
export const WELCOME_STEPS = [
  { key: 'run_3k', day: 1, metric: 'bestRunDistanceM', target: 3_000 },
  { key: 'run_5k', day: 3, metric: 'bestRunDistanceM', target: 5_000 },
  { key: 'loop', day: 4, metric: 'loopRuns', target: 1 },
  { key: 'capture', day: 5, metric: 'hexesCaptured', target: 1 },
  { key: 'share', day: 7, metric: 'shares', target: 1 },
] as const satisfies readonly {
  key: string;
  day: number;
  metric: WelcomeMetric;
  target: number;
}[];

/** Clé d'une étape d'accueil (dérivée de la DATA — jamais réécrite à la main). */
export type WelcomeStepKey = (typeof WELCOME_STEPS)[number]['key'];

/** Slug du challenge d'accueil seedé dans `challenges` (migration 0051). */
export const WELCOME_CHALLENGE_SLUG = 'welcome_7d';

// ─────────────────────────────────────────────────────────────────────────────
// PROFIL D'HABITUDES (A-46 §1) — personnalisation des parcours proposés.
//
// Demande fondateur (21/07) : « se baser sur les habitudes des utilisateurs,
// nombre de kilomètres, route utilisée, il faut qu'un algorithme puisse
// apprendre ». Constat d'audit : le Route Planner AFFICHAIT déjà « Adaptée à
// tes habitudes » alors que rien n'apprenait. Ces constantes bornent ce que
// l'app a le droit de PRÉTENDRE savoir.
//
// VIE PRIVÉE — apprendre des habitudes de déplacement est du profilage sur des
// données de localisation. Le profil ne consomme QUE des agrégats non
// géographiques (distance, durée, allure, horodatage) : aucune coordonnée,
// aucun point de départ, rien qui puisse ré-exposer le domicile que §7 floute
// à 500 m. Un créneau horaire ne dit pas OÙ.
//
// ANTI PAY-TO-WIN : un profil d'habitudes SUGGÈRE un parcours. Il n'accorde
// jamais de points, de territoire ni de multiplicateur.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SEUIL D'HONNÊTETÉ : nombre minimal de courses comptabilisées en dessous
 * duquel on ne connaît PAS les habitudes de quelqu'un — le profil renvoie
 * « inconnu » et l'app le dit, au lieu d'inventer une habitude à partir d'un run.
 *
 * Pourquoi 5, et pas 3 :
 *  1. La médiane de n valeurs ne survit qu'à floor((n-1)/2) valeurs aberrantes.
 *     n = 3 → UNE seule sortie longue exceptionnelle suffit à déplacer le
 *     profil ; n = 5 → il en faut DEUX. Or « ~2 courses courtes + 1 longue par
 *     semaine » est le schéma le plus banal chez un coureur : à n = 3 le profil
 *     serait structurellement faux, à n = 5 il tient.
 *  2. Coût pour l'utilisateur : à STREAK_MIN_RUNS_PER_WEEK (2/semaine), 5
 *     courses ≈ 2,5 semaines. Assez court pour que la personnalisation arrive
 *     vite, assez long pour couvrir plus d'une semaine — donc pour qu'un jour
 *     ou un créneau RÉCURRENT ait pu se répéter au moins une fois.
 *  3. Au-dessus (8, 10) on ne gagne pas en robustesse de médiane, on ne fait
 *     que retarder : la confiance montante est déjà portée par
 *     HABITS_CONFIDENT_RUNS.
 */
export const HABITS_MIN_RUNS = 5;

/**
 * Fenêtre d'historique retenue. Au-delà, une course ne décrit plus les
 * habitudes ACTUELLES (blessure, déménagement, changement de rythme). Alignée
 * sur RAW_POLYLINE_RETENTION_DAYS (90 j) : on n'apprend pas sur des données
 * plus vieilles que ce que le projet accepte de conserver.
 */
export const HABITS_HISTORY_DAYS = 90;

/** Borne de lecture serveur : jamais plus de courses que ça par appel. */
export const HABITS_MAX_RUNS = 200;

/**
 * À partir de ce nombre de courses, l'échantillon est assez fourni pour une
 * confiance HAUTE — à condition que la dispersion soit faible
 * (HABITS_TIGHT_SPREAD_RATIO). ~6 semaines à 2 courses/semaine.
 */
export const HABITS_CONFIDENT_RUNS = 12;

/**
 * Dispersion robuste (MAD / médiane) en dessous de laquelle on considère
 * l'habitude RÉGULIÈRE. 0,20 = « la moitié des courses tombent à ±20 % de la
 * distance habituelle ». Au-delà, la personne varie trop pour qu'on prétende
 * connaître « sa » distance : confiance basse, l'UI reste prudente.
 */
export const HABITS_TIGHT_SPREAD_RATIO = 0.2;

/**
 * Part minimale des courses qu'un jour (ou un créneau) doit concentrer pour
 * être qualifié d'habituel. 0,4 : en dessous, c'est du bruit — on ne surface
 * RIEN plutôt qu'un « tu cours le mardi » tiré de 2 courses sur 9.
 */
export const HABITS_PATTERN_MIN_SHARE = 0.4;

/**
 * Créneaux de la journée (heure LOCALE de l'appareil). Bornes = heure de début,
 * le créneau court jusqu'au début du suivant ; `night` enjambe minuit.
 * DATA, jamais réécrite à la main : HabitSlotKey en est dérivé.
 */
export const HABITS_SLOTS = [
  { key: 'dawn', startHour: 5 },
  { key: 'day', startHour: 10 },
  { key: 'evening', startHour: 17 },
  { key: 'night', startHour: 21 },
] as const satisfies readonly { key: string; startHour: number }[];

/** Clé d'un créneau d'habitude (dérivée de HABITS_SLOTS). */
export type HabitSlotKey = (typeof HABITS_SLOTS)[number]['key'];

// ─── PRÉFÉRENCES DE PARCOURS (demande fondateur 21/07 — « un endroit dans les
//     paramètres pour la personnaliser ») ─────────────────────────────────────
/**
 * Une PRÉFÉRENCE de parcours n'est PAS une règle de jeu : elle ne donne aucun
 * point, aucun territoire, aucun avantage. Elle oriente une SUGGESTION. Ces
 * constantes vivent quand même ici parce que la borne écrite dans la contrainte
 * SQL (`route_preferences`) et celle affichée par l'écran doivent être la MÊME —
 * c'est exactement le cas d'usage de « aucun nombre magique ».
 */

/**
 * Distances cibles proposées en un tap (m). Échelle de coureur, pas de machine :
 * du 3 km d'un soir de semaine à la sortie longue de 15 km. Un ultra-traileur
 * n'a pas de pastille dédiée — il n'a pas besoin d'une SUGGESTION quotidienne.
 */
export const ROUTE_TARGET_DISTANCE_CHOICES_M = [3_000, 5_000, 8_000, 10_000, 15_000] as const;

/** Plancher d'une distance cible = plancher d'une course qui compte (§3.2). */
export const ROUTE_TARGET_DISTANCE_MIN_M = RUN_MIN_DISTANCE_M;

/**
 * Plafond d'une distance cible : le marathon. Au-delà, GRYD ne « propose » plus
 * une sortie du jour — RUN_MAX_DISTANCE_M (100 km) reste la borne de ce qui est
 * INGÉRABLE, jamais de ce qui est SUGGÉRABLE. Deux notions distinctes.
 */
export const ROUTE_TARGET_DISTANCE_MAX_M = 42_195;

/**
 * Forme de parcours souhaitée. `any` = GRYD choisit (défaut assumé) ; `loop` =
 * boucle fermée (la mécanique GRYD, remplissage d'intérieur) ; `out_and_back` =
 * aller-retour (rassurant : on rentre par le chemin connu).
 */
export const ROUTE_SHAPES = ['any', 'loop', 'out_and_back'] as const;
export type RouteShape = (typeof ROUTE_SHAPES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// A-46 × A-45 — LA ZONE DU JOUR LUE À LA DISTANCE RÉELLEMENT COURUE
// (bloc ajouté en fin de fichier, chantier « suggestion de parcours × zone du
//  jour ». Une seule constante : tout le reste est réutilisé.)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Distance CENTRE À CENTRE (m) entre deux zones voisines de la grille de jeu.
 *
 * Ce n'est PAS un réglage de jeu : c'est une propriété géométrique de H3 à
 * `H3_RESOLUTION` (10). Une cellule res-10 a une arête moyenne de ~65,9 m ;
 * deux cellules adjacentes ont donc leurs centres à √3 × 65,9 ≈ 114 m. La
 * valeur est figée ici, et pas recalculée dans l'app, parce que le mobile
 * n'embarque pas h3-js (Metro ne le résout pas dans ce chemin) : sans source
 * unique, chaque écran finirait avec son propre « à peu près ».
 *
 * SEUL USAGE : borner le nombre de zones qu'une sortie peut traverser
 * (`zonesWithinReach`, apps/mobile/src/features/daily/zoneFit.ts), pour dire
 * honnêtement si le terrain libre d'une Zone du Jour tient la comparaison avec
 * la distance qu'une personne court vraiment. Le calcul suppose une trajectoire
 * RECTILIGNE — c'est une borne HAUTE assumée, qui rend le verdict « il y a de
 * quoi faire » plus difficile à obtenir plutôt que plus facile.
 *
 * ANTI PAY-TO-WIN : cette constante n'entre dans aucun score, aucun claim,
 * aucune protection, aucun decay. Elle ne sert qu'à formuler une PROPOSITION,
 * qui ne donne rien (§22).
 */
export const ZONE_CENTER_SPACING_M = 114;
