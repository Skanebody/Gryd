/**
 * GRYD — clés d’entitlement free vs premium (matrice running / Strava-like).
 * Source de vérité : docs/product/GRYD_free_vs_premium_running_layer.md
 *
 * Règle : le jeu territorial + tracking de base = free.
 * Analyse avancée, planification avancée, personnalisation = premium (V1.5+).
 */

/** Quand la feature devient disponible (roadmap). */
export type FeatureAvailabilityTier =
  | 'free'
  | 'premium_mvp' // cosmétique early (Founder Pack, skins…)
  | 'premium_v15' // GRYD Pass
  | 'premium_v2';

/** Clés stables — utilisées dans feature_entitlements.feature_key et les paywalls. */
export const FEATURE_KEYS = {
  // ── Socle gratuit (jeu + trust) ─────────────────────────────────────────
  recordActivity: 'record_activity',
  basicHistory: 'basic_history',
  basicCrew: 'basic_crew',
  basicSafety: 'basic_safety',
  suggestedMissions: 'suggested_missions',
  coreLeaderboards: 'core_leaderboards',
  officialChallenges: 'official_challenges',
  basicShare: 'basic_share',
  grydVerify: 'gryd_verify',
  privacyMasking: 'privacy_masking',

  // ── Premium MVP (cosmétique uniquement — pas de gameplay) ───────────────
  founderPack: 'founder_pack',
  traceSkinsPremium: 'trace_skins_premium',
  profileFramesPremium: 'profile_frames_premium',
  shareTemplatesPremium: 'share_templates_premium',
  crewCosmetics: 'crew_cosmetics',

  // ── Premium V1.5 (GRYD Pass) ────────────────────────────────────────────
  advancedRoutes: 'advanced_routes',
  routeBuilderAdvanced: 'route_builder_advanced',
  routeReroll: 'route_reroll',
  savedRoutesUnlimited: 'saved_routes_unlimited',
  advancedHistory: 'advanced_history',
  advancedStats: 'advanced_stats',
  advancedGoals: 'advanced_goals',
  leaderboardFilters: 'leaderboard_filters',
  customChallenges: 'custom_challenges',
  premiumReplay: 'premium_replay',

  // ── Premium V2 ──────────────────────────────────────────────────────────
  offlineRoutes: 'offline_routes',
  personalHeatmap: 'personal_heatmap',
  fitnessScore: 'fitness_score',
  effortScore: 'effort_score',
  watchSyncAdvanced: 'watch_sync_advanced',
  trainingInsights: 'training_insights',
  routeExportGpx: 'route_export_gpx',
  safetyAdvanced: 'safety_advanced',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

/** Tier de disponibilité par feature (roadmap produit). */
export const FEATURE_AVAILABILITY: Readonly<Record<FeatureKey, FeatureAvailabilityTier>> = {
  record_activity: 'free',
  basic_history: 'free',
  basic_crew: 'free',
  basic_safety: 'free',
  suggested_missions: 'free',
  core_leaderboards: 'free',
  official_challenges: 'free',
  basic_share: 'free',
  gryd_verify: 'free',
  privacy_masking: 'free',

  founder_pack: 'premium_mvp',
  trace_skins_premium: 'premium_mvp',
  profile_frames_premium: 'premium_mvp',
  share_templates_premium: 'premium_mvp',
  crew_cosmetics: 'premium_mvp',

  advanced_routes: 'premium_v15',
  route_builder_advanced: 'premium_v15',
  route_reroll: 'premium_v15',
  saved_routes_unlimited: 'premium_v15',
  advanced_history: 'premium_v15',
  advanced_stats: 'premium_v15',
  advanced_goals: 'premium_v15',
  leaderboard_filters: 'premium_v15',
  custom_challenges: 'premium_v15',
  premium_replay: 'premium_v15',

  offline_routes: 'premium_v2',
  personal_heatmap: 'premium_v2',
  fitness_score: 'premium_v2',
  effort_score: 'premium_v2',
  watch_sync_advanced: 'premium_v2',
  training_insights: 'premium_v2',
  route_export_gpx: 'premium_v2',
  safety_advanced: 'premium_v2',
};

/** Quota free pour routes sauvegardées (matrice §4.3). */
export const FREE_SAVED_ROUTES_MAX = 3 as const;

const FREE_KEYS = new Set<FeatureKey>(
  (Object.entries(FEATURE_AVAILABILITY) as [FeatureKey, FeatureAvailabilityTier][])
    .filter(([, tier]) => tier === 'free')
    .map(([key]) => key),
);

export function isFreeFeature(key: FeatureKey): boolean {
  return FREE_KEYS.has(key);
}

export function featureAvailabilityTier(key: FeatureKey): FeatureAvailabilityTier {
  return FEATURE_AVAILABILITY[key];
}

/** Sources d’entitlement persistées (feature_entitlements.source). */
export const ENTITLEMENT_SOURCES = {
  pass: 'pass',
  founder: 'founder',
  promo: 'promo',
  admin: 'admin',
  eclats: 'eclats',
} as const;

export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[keyof typeof ENTITLEMENT_SOURCES];
