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
