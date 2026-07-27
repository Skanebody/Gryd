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
  // E06 — préflight affiché (conditions vérifiées avant le compte à rebours).
  runPreflightViewed: 'run_preflight_viewed', // props: { readiness: 'ready'|'approximate', platform }
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

  // ── E07-E10 : la marche d'entrée (spec produit UI/UX, l.735 à ~l.810) ──────
  // RÈGLE APPLIQUÉE ICI, la même que §26 : aucun event n'est ajouté sans un
  // point d'émission RÉEL et nommable. Ceux-ci en ont un — les quatre écrans
  // E07/E08/E09/E10 sont à construire, et chaque nom ci-dessous désigne un
  // instant que SON écran traverse vraiment. Ils ne DOUBLENT pas le funnel
  // existant : `signup_started` / `signup_completed` restent les bornes du
  // compte (E06 les émet déjà au tap d'une méthode), ce qui suit mesure ce
  // qu'il y a ENTRE — l'endroit exact où l'on perd les gens.
  //
  // AUCUN de ces events ne transporte de PII : ni adresse e-mail, ni @handle,
  // ni nom de ville, ni libellé i18n. Les `reason` / `result` sont des clés
  // FERMÉES, énumérées dans le commentaire de chaque ligne.

  // E07 — connexion par e-mail (`/auth/email`). Les cinq états de la spec sont
  // couverts par trois events : « lien envoyé » et « renvoi après délai » sont
  // le MÊME instant (d'où `resend`, un booléen, plutôt qu'un second event) ;
  // « e-mail invalide » et « compte existant avec fournisseur externe » sont
  // deux motifs du même échec ; « lien expiré » se constate à l'OUVERTURE du
  // lien, dans une autre session — c'est donc un troisième instant.
  /** Le serveur a ACCEPTÉ d'envoyer le lien (pas le tap : le tap, c'est signup_started). */
  authEmailLinkSent: 'auth_email_link_sent', // props: { resend: boolean }
  /** L'envoi n'a pas eu lieu. reason FERMÉ : 'invalid_email' | 'existing_provider' | 'rate_limited' | 'network' | 'unknown' */
  authEmailLinkFailed: 'auth_email_link_failed', // props: { reason }
  /** Le lien a été OUVERT et le verdict est tombé. result FERMÉ : 'signed_in' | 'expired' | 'invalid' */
  authEmailLinkOpened: 'auth_email_link_opened', // props: { result }

  // E08 — profil minimal (`/setup/profile`). Le KPI : combien abandonnent au
  // @handle, et pour quel motif (c'est le seul champ qui peut REFUSER).
  setupProfileViewed: 'setup_profile_viewed',
  /**
   * Un verdict de `check_handle_available` (RPC 0047) a été AFFICHÉ. Un par
   * fenêtre de debounce (HANDLE_CHECK_DEBOUNCE_MS), jamais un par frappe.
   * result FERMÉ, miroir de `HandleCheck` : 'free' | 'taken' | 'reserved' |
   * 'too_short' | 'too_long' | 'bad_chars' | 'unknown'.
   * ⚠️ Le @handle lui-même ne part JAMAIS — seulement le verdict.
   */
  setupHandleChecked: 'setup_handle_checked', // props: { result }
  /** Une suggestion de repêchage a été prise. `rank` = 0…HANDLE_SUGGESTION_COUNT-1. */
  setupHandleSuggestionPicked: 'setup_handle_suggestion_picked', // props: { rank }
  /**
   * Profil minimal ENREGISTRÉ (réponse serveur, pas le tap du CTA).
   * city_source FERMÉ : 'location' (ville déduite de la position) | 'manual'
   * (l'utilisateur l'a changée) — le KPI de « ville issue de la localisation,
   * mais modifiable ». Aucun nom de ville n'est transmis.
   */
  setupProfileCompleted: 'setup_profile_completed', // props: { city_source }

  // E09 — choix d'activité initial (`/setup/activity`). Ce choix « initialise
  // seulement le filtre » : l'event dit lequel, il n'affirme aucune pratique.
  setupActivityViewed: 'setup_activity_viewed',
  setupActivityChosen: 'setup_activity_chosen', // props: { activity: 'run' | 'bike' }

  // E10 — permissions utiles (`/setup/permissions`). `permission_location`
  // existe déjà (E05 l'explique et la demande) : on ne le double pas. Les deux
  // permissions de CET écran manquaient — et sans elles, impossible de savoir
  // si « le bouton principal peut être CONTINUER même si une permission
  // secondaire est refusée » coûte quelque chose.
  setupPermissionsViewed: 'setup_permissions_viewed',
  /** Mouvements et activité physique. result FERMÉ : 'granted' | 'denied' | 'blocked' | 'unavailable' */
  permissionMotion: 'permission_motion', // props: { result }
  /** Notifications tactiques. Mêmes valeurs de `result` que ci-dessus. */
  permissionNotifications: 'permission_notifications', // props: { result }
  /** CONTINUER tapé — avec l'état RÉEL des deux permissions à cet instant. */
  setupPermissionsCompleted: 'setup_permissions_completed', // props: { motion: boolean, notifications: boolean }

  // ── E35/E36 : compositeur de partage ──────────────────────────────────────
  // `share_card_generated`, `share_export`, `share_completed` et
  // `share_template_changed` existent déjà (preview, PNG, canal, format). Ce
  // qui manquait : l'ÉDITEUR (E36) et le raccourci NOMMÉ vers un réseau.
  /**
   * Le sheet « Personnaliser » (E36) s'ouvre.
   * tab FERMÉ : 'style' | 'format' | 'data' | 'text' | 'privacy'
   *
   * `'data'` (la section « Donnée » de la planche E10 : quel chiffre passe en
   * géant) a été AJOUTÉ au vocabulaire le 27/07/2026, quand la section a été
   * peinte. `'media'` en a été RETIRÉ : c'est la section Photo, et elle n'est
   * pas peinte — `apps/mobile/app.json` déclare `NSPhotoLibraryUsageDescription`
   * pour un usage photo de PROFIL uniquement. Un vocabulaire qui listerait un
   * onglet inexistant décrirait un écran qui n'existe pas.
   */
  shareCustomizeOpened: 'share_customize_opened', // props: { tab }
  /** CTA `APPLIQUER` de E36 — un réglage a réellement été appliqué à l'aperçu. */
  shareCustomizeApplied: 'share_customize_applied', // props: { tab }
  /**
   * Raccourci vers un réseau NOMMÉ (E35 : Instagram, TikTok, WhatsApp, Plus).
   * C'est une INTENTION, pas un partage : la remise à l'app tierce se mesure
   * avec `share_exported`, et l'aboutissement avec `share_completed`. Les trois
   * ne se confondent pas — l'écart entre eux EST le KPI.
   * channel FERMÉ : 'instagram' | 'tiktok' | 'whatsapp' | 'more'
   */
  shareChannelTapped: 'share_channel_tapped', // props: { channel }
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
