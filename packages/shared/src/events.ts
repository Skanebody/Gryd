/**
 * GRYD — Événements PostHog (SPEC §8 + AMENDEMENT-02 §10). Noms exacts, ne pas renommer.
 */
export const EVENTS = {
  // Funnel
  appOpen: 'app_open',
  waitlistJoined: 'waitlist_joined', // web — inscription à la waitlist (landing)
  onboardingStep: 'onboarding_step', // props: { n }
  // P0 D1 — chute AVANT l'inscription (funnel Activation) : émis au tap d'une
  // méthode de connexion, complété (ou pas) par signup_completed.
  signupStarted: 'signup_started', // props: { method }
  signupCompleted: 'signup_completed', // props: { method }
  permissionLocation: 'permission_location', // props: { result }
  citySelected: 'city_selected', // props: { was_open } — la ville choisie était-elle déjà un terrain de jeu ?
  // Ouverture RÉELLE d'une ville depuis le référentiel (« n'importe quelle ville
  // d'Europe »). Émis depuis la RÉPONSE serveur (`open_city`), jamais depuis
  // l'UI : `created` distingue une zone provisionnée d'une ville déjà ouverte
  // qu'on re-sélectionne (idempotence). Le KPI : combien de villes hors Saison 0
  // deviennent vraiment jouées.
  cityOpened: 'city_opened', // props: { created, source: 'manual' | 'run' }
  privacyZoneSet: 'privacy_zone_set',
  // Boucle cœur
  runStart: 'run_start',
  runAutosave: 'run_autosave',
  runCancelAttempt: 'run_cancel_attempt',
  runComplete: 'run_complete', // props: { distance, duration, source }
  claimResult: 'claim_result', // props: { new, stolen, defended, rejected_reason }
  // P0 D2 (MVP_CHANGESET) — activation mesurable : émis depuis la RÉPONSE serveur
  // (capture persistée), jamais depuis l'UI. loop_almost_closed = signal d'activation
  // ratée (openBoundary.missingM) — le « il manquait N m » du funnel.
  loopClosed: 'loop_closed', // props: { enclosed_zones }
  loopAlmostClosed: 'loop_almost_closed', // props: { missing_m }
  celebrationViewed: 'celebration_viewed',
  stealSuffered: 'steal_suffered',
  revengeRun: 'revenge_run', // props: { delay_h } — H2
  decayWarningSent: 'decay_warning_sent',
  streakSaved: 'streak_saved',
  // Social / viralité
  crewCreated: 'crew_created',
  crewJoined: 'crew_joined', // props: { via }
  // AMENDEMENT-44 A4/A5 — un signal FIGÉ posé au crew. `situation` et `signal`
  // sont des clés du catalogue fermé (engine/crewSignals.ts), `has_sector` un
  // booléen : AUCUN nom de zone, AUCUN pseudo, aucun texte ne part en analytics.
  // Le KPI visé : le vocabulaire situé est-il réellement utilisé, et lequel ?
  crewSignalSent: 'crew_signal_sent', // props: { situation, signal, has_sector }
  inviteSent: 'invite_sent',
  inviteAccepted: 'invite_accepted', // H3
  shareCardGenerated: 'share_card_generated',
  // P1 D6 (MVP_CHANGESET) — image PNG réellement rasterisée et remise au share
  // sheet (≠ share_card_generated : la preview React). Le KPI viralité du pilote
  // (« nouveaux activés pour 100 captures partagées ») se mesure d'ici.
  shareExported: 'share_exported', // props: { ratio, channel }
  // Widget « Mon territoire » (spec 17/07) — le KPI : % de CTA ayant conduit à
  // une action territoriale validée. viewed = vue UTILISATEUR (jamais le
  // rafraîchissement automatique) ; props communs : widget_state, primary_action.
  territoryWidgetViewed: 'territory_widget_viewed', // props: { widget_state }
  territoryWidgetActionTapped: 'territory_widget_action_tapped', // props: { widget_state, primary_action }
  territoryWidgetStateChanged: 'territory_widget_state_changed', // props: { from, to }
  shareCompleted: 'share_completed', // props: { channel }
  shareTemplateChanged: 'share_template_changed', // props: { template } — doc partage viral §12
  stickerCopied: 'sticker_copied', // sticker territoire copié pour story — doc partage viral §12
  replayPlayed: 'replay_played', // replay animé de la conquête rejoué — doc partage viral §12
  posterDownloaded: 'poster_downloaded',
  // Monétisation
  paywallView: 'paywall_view', // props: { trigger }
  purchaseInitiated: 'purchase_initiated', // props: { sku }
  purchaseCompleted: 'purchase_completed', // props: { sku }
  subscriptionStarted: 'subscription_started',
  subscriptionRenewed: 'subscription_renewed',
  subscriptionCancelled: 'subscription_cancelled',
  shieldActivated: 'shield_activated', // props: { source }
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
  batteryReport: 'battery_report',
  mapLoadMs: 'map_load_ms',
  opportunityShown: 'opportunity_shown', // props: { kind: capture|rival|defense, distance_m }
  crash: 'crash',
  // ── Friction & activation (§26 — funnel neuromarketing) ────────────────────
  // La Spéc Unifiée §26 nomme un funnel « friction → activation → conversion ».
  // On NE RENOMME PAS les events §8 (table de correspondance ci-dessous) : on
  // AJOUTE les signaux de friction qui manquaient, chacun avec un point
  // d'émission RÉEL (aucun event défini-jamais-émis — le défaut même que §26
  // reprochait à purchase_*). Un event sans déclencheur honnête n'est pas ajouté.
  //
  //   §26 (concept)              →  event §8 émis (où)
  //   arrivée / ouverture        →  app_open (_layout), deep_link_opened (_layout)
  //   friction avant compte      →  signup_started, onboarding_skipped, back_tapped
  //   compte                     →  signup_completed
  //   permission                 →  permission_location
  //   activation (1re capture)   →  claim_result, loop_closed, time_to_first_capture
  //   activation ratée           →  loop_almost_closed
  //   intention CTA              →  cta_tapped
  //   conversion cosmétique      →  paywall_view, skin_equipped (purchase_* : Row 11,
  //                                 quand le rail IAP réel existera — pas avant, sinon
  //                                 ce serait un achat fabriqué)
  ctaTapped: 'cta_tapped', // props: { cta } — un CTA décisif tapé (id non-PII, jamais le libellé i18n)
  backTapped: 'back_tapped', // props: { had_history, to? } — retour explicite ; `to` SEULEMENT sans historique (sinon la destination réelle est inconnue)
  onboardingSkipped: 'onboarding_skipped', // « plus tard » assumé — chute AVANT le compte
  deepLinkOpened: 'deep_link_opened', // props: { kind } — l'app ouverte par un lien (kind FERMÉ, jamais l'URL/le code)
  // t0 = signup_completed persisté ; émis UNE fois à la 1re capture serveur-jugée.
  timeToFirstCapture: 'time_to_first_capture', // props: { seconds }
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
