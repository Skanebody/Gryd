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
/** Filtrage des points GPS. */
export const POINT_MAX_ACCURACY_M = 25;
export const POINT_MAX_SPEED_KMH = 25; // au-delà → point rejeté
export const POINT_MAX_JUMP_M = 100; // saut entre points consécutifs → segment coupé
/** Allure par segment admise pour le claim : [2:30 ; 12:00] (hors bornes : segment exclu du claim, course conservée). */
export const SEGMENT_PACE_MIN_S_KM = 2 * 60 + 30;
export const SEGMENT_PACE_MAX_S_KM = 12 * 60;

// ─── §3.3 Propriété, vol, protection ─────────────────────────────────────────
export const HEX_LOCK_HOURS = 24; // hex fraîchement capturé involable
export const NEW_PLAYER_PROTECTION_DAYS = 14; // territoire involable + sans decay
export const DECAY_DAYS = 21; // hex non re-parcouru → neutre
export const DECAY_WARNING_DAYS_BEFORE = 3; // notif « ton quartier s'efface »
export const SHIELD_MAX_CLUSTER_HEXES = 300;
export const SHIELD_DURATION_HOURS = 48;
export const SHIELD_MAX_ACTIVE_PER_WEEK = 2; // cap absolu par joueur
export const SHIELD_CLUB_INCLUDED_PER_WEEK = 1;

// ─── §3.4 Points, streaks, monnaies ──────────────────────────────────────────
export const POINTS_NEUTRAL_HEX = 10;
export const POINTS_STOLEN_HEX = 15;
export const POINTS_DEFENDED_HEX = 3; // re-parcourir son hex
export const DEFEND_COOLDOWN_HOURS = 24; // max 1 défense/24 h/hex
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
export const CREW_MAX_MEMBERS = 10;
export const CREW_COLORS_COUNT = 12; // identité en DB ; rendu carte = AMENDEMENT-01
export const CREW_CODE_LENGTH = 6;
export const CREW_SWITCH_COOLDOWN_DAYS = 7;

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

// ─── §5.1 Monétisation (SKUs RevenueCat) ─────────────────────────────────────
export const SKUS = {
  clubMonthly: 'club_monthly',
  clubAnnual: 'club_annual',
  starterPack: 'starter_pack',
  eclatsS: 'eclats_s',
  eclatsM: 'eclats_m',
  eclatsL: 'eclats_l',
} as const;
export const ECLATS_PACKS = { eclats_s: 100, eclats_m: 320, eclats_l: 720 } as const;
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
/** Avant-poste basique (V0) : présence construite en zone peu dense. */
export const OUTPOST_MIN_HEXES = 100;
export const OUTPOST_RADIUS_KM = 2;
/** Secteurs auto-générés MVP : agrégat H3 grossier (arbitrage A3 AMENDEMENT-02). */
export const SECTOR_H3_RESOLUTION = 7;

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

// ─── §36 Rôles crew + permissions ────────────────────────────────────────────
export type CrewRole =
  | 'runner' // §36.1 rôle par défaut
  | 'scout' // §36.2 tactique
  | 'defender' // §36.3 défense
  | 'raider' // §36.4 attaque
  | 'captain' // §36.5 manager terrain
  | 'co_captain' // §36.6 gestion avancée
  | 'leader'; // §36.7 fondateur/propriétaire
export const CREW_ROLES: readonly CrewRole[] = [
  'runner', 'scout', 'defender', 'raider', 'captain', 'co_captain', 'leader',
];
export const CREW_DEFAULT_ROLE: CrewRole = 'runner';

/**
 * Permissions crew (§36). Chaque action liste les rôles qui peuvent l'exécuter.
 * MVP : ces règles vivent côté serveur (endpoints rôle-gated V1) ; en attendant,
 * l'écriture reste service_role only (voir 0010). `launchOffensiveMajor` =
 * offensive majeure (War Banner L10) ; `launchOffensiveMinor` = petite offensive.
 */
export const CREW_PERMISSIONS: Record<string, readonly CrewRole[]> = {
  launchOffensiveMinor: ['captain', 'co_captain', 'leader'],
  launchOffensiveMajor: ['co_captain', 'leader'],
  createMission: ['defender', 'raider', 'captain', 'co_captain', 'leader'],
  assignMembers: ['captain', 'co_captain', 'leader'],
  invite: ['co_captain', 'leader'],
  accept: ['co_captain', 'leader'],
  kick: ['co_captain', 'leader'],
  manageRoles: ['co_captain', 'leader'], // co_captain jusqu'à captain ; leader tout
  changeSettings: ['leader'],
  changeNameEmblem: ['leader'],
  transferLeadership: ['leader'],
  openCloseCrew: ['leader'],
  activateMajorCrewItem: ['co_captain', 'leader'],
  scoutPing: ['scout', 'captain', 'co_captain', 'leader'],
} as const;

// ─── §37.2 Disponibilité de guerre (colonne crew_members) ────────────────────
export type WarAvailability = 'war' | 'defense' | 'exploration' | 'casual' | 'absent';
export const WAR_AVAILABILITY: readonly WarAvailability[] = [
  'war', 'defense', 'exploration', 'casual', 'absent',
];
export const WAR_AVAILABILITY_DEFAULT: WarAvailability = 'casual';

// ─── §37.1 Paramètres crew (discovery) ───────────────────────────────────────
export type CrewJoinPolicy = 'open' | 'request' | 'closed';
export const CREW_JOIN_POLICIES: readonly CrewJoinPolicy[] = ['open', 'request', 'closed'];
export type CrewObjective = 'casual' | 'competitif' | 'pionnier';
export const CREW_OBJECTIVES: readonly CrewObjective[] = ['casual', 'competitif', 'pionnier'];

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
