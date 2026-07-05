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
 * Compacité minimale d'une boucle : 4πA/P² (1 = cercle, 0 = trait). Choix
 * documenté 0,12 dans la plage produit 0,10-0,15 (doc §6 « Boucle trop
 * fine ») : un carré vaut π/4 ≈ 0,785, un rectangle 4:1 ≈ 0,5, un rectangle
 * ~28:1 ≈ 0,12 — on ne rejette que les formes plus étirées, jamais un tour
 * de quartier honnête.
 */
export const LOOP_MIN_COMPACTNESS = 0.12;
/**
 * Largeur moyenne minimale (m) d'une boucle, ESTIMÉE 2A/P (doc §6 : pas de
 * calcul exotique) : ~60 m ≈ 2 zones res 10 de large. En deçà (aller-retour
 * sur deux rues parallèles très proches) : course valide, intérieur REFUSÉ —
 * loopRejectedReason='narrow', copy gelée : « Zone non capturée : forme trop
 * étroite. »
 */
export const LOOP_MIN_WIDTH_M = 60;
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
