/**
 * GRYD — Événements PostHog (SPEC §8 + AMENDEMENT-02 §10). Noms exacts, ne pas renommer.
 */
export const EVENTS = {
  // Funnel
  appOpen: 'app_open',
  waitlistJoined: 'waitlist_joined', // web — inscription à la waitlist (landing)
  onboardingStep: 'onboarding_step', // props: { n }
  signupCompleted: 'signup_completed', // props: { method }
  permissionLocation: 'permission_location', // props: { result }
  citySelected: 'city_selected',
  privacyZoneSet: 'privacy_zone_set',
  // Boucle cœur
  runStart: 'run_start',
  runAutosave: 'run_autosave',
  runCancelAttempt: 'run_cancel_attempt',
  runComplete: 'run_complete', // props: { distance, duration, source }
  claimResult: 'claim_result', // props: { new, stolen, defended, rejected_reason }
  celebrationViewed: 'celebration_viewed',
  stealSuffered: 'steal_suffered',
  revengeRun: 'revenge_run', // props: { delay_h } — H2
  decayWarningSent: 'decay_warning_sent',
  streakSaved: 'streak_saved',
  // Social / viralité
  crewCreated: 'crew_created',
  crewJoined: 'crew_joined', // props: { via }
  inviteSent: 'invite_sent',
  inviteAccepted: 'invite_accepted', // H3
  shareCardGenerated: 'share_card_generated',
  shareCompleted: 'share_completed', // props: { channel }
  posterDownloaded: 'poster_downloaded',
  // Monétisation
  paywallView: 'paywall_view', // props: { trigger }
  purchaseInitiated: 'purchase_initiated', // props: { sku }
  purchaseCompleted: 'purchase_completed', // props: { sku }
  subscriptionStarted: 'subscription_started',
  subscriptionRenewed: 'subscription_renewed',
  subscriptionCancelled: 'subscription_cancelled',
  shieldActivated: 'shield_activated', // props: { source } — legacy
  attackAlertActivated: 'attack_alert_activated', // props: { h3, source }
  inventoryItemUsed: 'inventory_item_used', // props: { item_key }
  skinEquipped: 'skin_equipped',
  // Performance (AMENDEMENT-02)
  performancePageViewed: 'performance_page_viewed',
  recordShared: 'record_shared',
  performanceBonusApplied: 'performance_bonus_applied',
  segmentsExcludedViewed: 'segments_excluded_viewed',
  // Missions (AMENDEMENT-02)
  missionCompleted: 'mission_completed', // props: { key }
  missionRewardClaimed: 'mission_reward_claimed',
  // Notifications (AMENDEMENT-02)
  pushSent: 'push_sent',
  pushSuppressed: 'push_suppressed', // quiet hours ou cap journalier
  digestSent: 'digest_sent',
  // Santé produit
  notificationOpened: 'notification_opened', // props: { type }
  healthkitImport: 'healthkit_import', // props: { runs }
  onboardingImportComplete: 'onboarding_import_complete', // props: { runs, founder_xp, hexes }
  batteryReport: 'battery_report',
  mapLoadMs: 'map_load_ms',
  crash: 'crash',
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
