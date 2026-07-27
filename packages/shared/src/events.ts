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
  // E06/E19 — préflight affiché (conditions vérifiées avant le compte à rebours).
  // `readiness` dit la GRANULARITÉ de la permission (fine vs coarse), PAS la
  // qualité du fix : une permission fine sur un signal à 28 m est « prêt » côté
  // permission et orange côté anneau.
  //
  // ⚠ PAS de `accuracy_grade` ICI, contrairement à ce que cette ligne annonçait
  // le 27/07/2026 avant que l'écran existe : à l'instant où le préflight
  // s'affiche, AUCUNE position n'est encore arrivée (le sondage vient d'ouvrir
  // le capteur). La valeur y serait 'unknown' à tous les coups — une colonne
  // constante qui ferait croire à une mesure. La qualité RÉELLE du fix se lit
  // dans les deux events d'E19 ci-dessous, `gps_ready_reached` (bande verte
  // atteinte, avec le délai) et `run_start_degraded` (départ pris sans elle).
  runPreflightViewed: 'run_preflight_viewed', // props: { readiness: 'ready'|'approximate', platform, requested }
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

  // ══════════════════════════════════════════════════════════════════════════
  // VAGUE E14 · E19 · E22 · E25 · E26 · E27 · E30 · E33 · E34 · E37
  // (spec produit UI/UX, l.943 · 1088 · 1163 · 1219 · 1234 · 1254 · 1311 ·
  //  1362 · 1377 · 1463), ajoutée le 27/07/2026.
  //
  // TROIS RÈGLES APPLIQUÉES, les mêmes que les blocs précédents :
  //  1. AUCUN event sans point d'émission NOMMABLE. Chaque nom ci-dessous
  //     désigne un instant qu'un écran de cette vague traverse vraiment ; aucun
  //     n'est posé « pour plus tard ». Quand un event existant couvrait déjà
  //     l'instant, il n'est PAS doublé — c'est dit à sa place ;
  //  2. AUCUNE PII, AUCUNE POSITION. Pas d'`id` de zone, de secteur ni de
  //     cellule H3 : un index H3 EST une coordonnée, et §18.2 interdit les
  //     coordonnées précises dans l'analytics. Pas de pseudo, pas de nom de
  //     quartier, pas de libellé i18n — seulement des clés fermées, énumérées
  //     ligne par ligne ;
  //  3. AUCUN NOMBRE DE JEU. Les seuils (bandes GPS, couverture de défense)
  //     vivent dans game-rules.ts ; ici on ne transporte que la CLASSE dérivée.

  // ── E14 — Détail d'un territoire (`/map/zone/:zoneId`) ────────────────────
  /**
   * La feuille de zone s'est ouverte, avec l'état qu'elle a RÉELLEMENT rendu.
   * `state` FERMÉ, miroir des cinq variantes de la spec (l.949-978) :
   * 'free' | 'personal' | 'crew' | 'rival' | 'contested'.
   * L'identifiant de la zone ne part PAS : il localise le joueur au mètre.
   * Le CTA de la feuille (CONQUÉRIR / RENFORCER / REPRENDRE / DÉFENDRE) se
   * mesure avec `cta_tapped`, qui existe déjà pour ça.
   */
  zoneDetailViewed: 'zone_detail_viewed', // props: { state }

  // ── E19 — Acquisition GPS / prêt (`/activity/ready`) ──────────────────────
  /**
   * L'anneau a atteint la bande VERTE pour la première fois de cet écran.
   * `seconds` = durée d'acquisition mesurée depuis l'ouverture (entier, jamais
   * un horodatage : une heure précise est une donnée de vie privée).
   * Le KPI : combien de temps on fait attendre avant un départ propre.
   */
  gpsReadyReached: 'gps_ready_reached', // props: { seconds }
  /**
   * Départ pris SANS la bande verte — le lien « Démarrer quand même ».
   * `grade` FERMÉ (`GpsAccuracyGrade`) : en pratique 'usable', mais la valeur
   * est transmise telle quelle plutôt que supposée. C'est le signal qui dira si
   * le seuil de 15 m est trop sévère sur le terrain.
   */
  runStartDegraded: 'run_start_degraded', // props: { grade }

  // ── E22 — Défense active (variante de E20/E21) ────────────────────────────
  /** L'activité s'affiche en mode DÉFENSE (contour de zone + jauge + échéance). */
  defenseRunViewed: 'defense_run_viewed',
  /**
   * La couverture de frontière a franchi un palier RÉEL (moteur pur
   * `engine/coverage.ts`, seuils `DEFENSE_COVER_LONGE_MIN` /
   * `DEFENSE_COVER_FULL_MIN`) — c'est l'instant du label « Défense possible ».
   * `level` FERMÉ, miroir de `DefenseLevel` : 'traverse' | 'longe' | 'cover'.
   * Aucun pourcentage n'est envoyé : une couverture fine, croisée avec l'heure,
   * dessine un tracé.
   */
  defenseCoverageReached: 'defense_coverage_reached', // props: { level }

  // ── E25 — Sécurité (panneau discret pendant l'activité) ───────────────────
  /** Le panneau Sécurité a été ouvert pendant une activité. */
  safetyPanelOpened: 'safety_panel_opened',
  /**
   * Une fonction du panneau a été tapée. `action` FERMÉ :
   * 'share' (prévenir un proche) | 'emergency' (ouverture du composeur —
   * JAMAIS la preuve d'un appel, l'app n'en sait rien) | 'stop' | 'guidelines'.
   * Aucun numéro, aucun destinataire, aucun contenu de message.
   */
  safetyActionTapped: 'safety_action_tapped', // props: { action }

  // ── E26 — Fin d'activité (feuille basse) ──────────────────────────────────
  /**
   * La feuille de fin s'est ouverte. `produces_result` = verdict de
   * `activityProducesResult()` (les minima §3.2 de la discipline) : c'est LUI
   * qui décide si `TERMINER` demande confirmation (spec l.1194), donc il doit
   * être mesurable — sinon personne ne saura jamais combien de sorties meurent
   * sous le plancher.
   */
  activityFinishSheetViewed: 'activity_finish_sheet_viewed', // props: { produces_result }
  /**
   * L'activité REPREND au lieu de se terminer. `from` FERMÉ :
   * 'finish_sheet' (E26) | 'pause' (E23). Deux hésitations différentes, deux
   * décisions produit différentes — les confondre effacerait l'information.
   */
  activityResumed: 'activity_resumed', // props: { from }

  // ── E27 — Analyse et synchronisation ──────────────────────────────────────
  /** L'écran d'analyse s'ouvre (après le tap `TERMINER ET ANALYSER`). */
  activityAnalysisViewed: 'activity_analysis_viewed',
  /**
   * UNE ÉTAPE RÉELLEMENT FRANCHIE. `step` FERMÉ :
   * 'securing' (finalisation + chiffrement locaux) | 'uploading' (envoi en
   * cours) | 'judging' (envoi accepté, verdict serveur attendu).
   *
   * ⚠ CE VOCABULAIRE S'ÉCARTE DES TROIS ÉTAPES DE LA SPEC (l.1258-1261 :
   * « sécurisation ; analyse de boucle ; validation territoriale »), ET C'EST
   * VOLONTAIRE. « Analyse de boucle » et « validation territoriale » se
   * déroulent TOUTES DEUX à l'intérieur du même appel serveur : le client ne
   * peut pas savoir quand l'une finit et l'autre commence. Émettre deux étapes
   * distinctes fabriquerait une progression — exactement ce que la spec
   * interdit à la ligne suivante (« progression non artificielle »). On mesure
   * donc les trois transitions que le client OBSERVE vraiment.
   */
  activityAnalysisStep: 'activity_analysis_step', // props: { step }
  /**
   * L'envoi n'a pas pu aboutir et la sortie attend en file locale (le
   * `uploadQueued` que `RealRunApi.finish()` renvoie déjà). `reason` FERMÉ :
   * 'offline' | 'error'. Rien n'est perdu, et l'analytics doit pouvoir le
   * prouver plutôt que de laisser un trou entre `run_complete` et `claim_result`.
   */
  activityUploadQueued: 'activity_upload_queued', // props: { reason }
  /**
   * L'utilisateur QUITTE l'écran avant le verdict — un droit explicite de la
   * spec (l.1265 : « L'utilisateur peut quitter »). `step` = la même énumération
   * fermée que ci-dessus : savoir OÙ on abandonne dit si l'attente est trop longue.
   */
  activityAnalysisLeft: 'activity_analysis_left', // props: { step }

  // ── E29-E34 — Les six résultats ───────────────────────────────────────────
  /**
   * L'écran de résultat s'est composé, avec la variante RÉELLEMENT rendue.
   * `variant` FERMÉ, miroir de `ResultVariantId`
   * (`features/run/resultVariant.ts`) : 'conquest' | 'reprise' | 'defense' |
   * 'freeRun' | 'crewContribution' | 'partial'.
   *
   * UN SEUL event pour six écrans, parce que le KPI est justement la
   * RÉPARTITION : « combien de sorties finissent en E32 plutôt qu'en E29 ».
   * Six noms auraient rendu ce ratio impossible à lire d'un seul graphe.
   *
   * NE DOUBLE RIEN : `claim_result` porte le verdict SERVEUR (nouveau/volé/
   * défendu/refusé), `celebration_viewed` l'animation, et
   * `segments_excluded_viewed` la portion exclue d'E34 — qui existe déjà et ne
   * doit PAS être recréée.
   */
  resultViewed: 'result_viewed', // props: { variant }

  // ── E37 — Partage terminé ─────────────────────────────────────────────────
  /**
   * Le lien du partage a été copié depuis l'écran de fin (spec l.1471).
   * Distinct de `sticker_copied` (une IMAGE mise au presse-papiers) et de
   * `share_completed` (le canal a abouti). Aucune URL n'est transmise : un lien
   * de partage porte un identifiant de course.
   *
   * La troisième action de la spec, « voir le profil public », n'a PAS d'event
   * ici : aucune route de profil public n'existe dans l'app au 27/07/2026
   * (`apps/mobile/app/` n'a pas de `u/[handle]`). Un event pour une destination
   * inexistante décrirait un écran qui n'existe pas.
   */
  shareLinkCopied: 'share_link_copied',

  // ══════════════════════════════════════════════════════════════════════════
  // VAGUE E13 · E15 · E16 · E17 · E39 · E40 · E49 · E50 · E54
  // (spec produit UI/UX, l.926 · 991 · 1009 · 1028 · 1498 · 1527 · 1722 · 1738
  //  · 1831), ajoutée le 27/07/2026.
  //
  // LES MÊMES TROIS RÈGLES QUE LES BLOCS PRÉCÉDENTS, plus une quatrième que le
  // contexte impose :
  //  1. AUCUN event sans point d'émission NOMMABLE ET ATTEIGNABLE. Deux écrans
  //     de cette vague n'ont AUCUN event pour cette raison : voir la note E49 et
  //     la note E50 en fin de bloc — ce n'est pas un oubli, c'est le constat ;
  //  2. AUCUNE PII, AUCUNE POSITION. Pas de nom de crew, pas de @handle, pas
  //     d'`id` de joueur/zone/ville, pas de terme de recherche : une requête de
  //     recherche de lieu EST une intention de déplacement, et un nom de crew
  //     identifie un groupe de personnes réelles. Seules des clés FERMÉES,
  //     énumérées ligne par ligne, et des ENTIERS d'agrégat partent ;
  //  3. AUCUN NOMBRE DE JEU — les seuils vivent dans game-rules.ts ;
  //  4. LA BASE EST VIDE, DONC L'ÉTAT VIDE SE MESURE. Sur ces neuf écrans, le
  //     cas le plus fréquent en 2026 sera « aucune donnée ». Un `screen()` nu ne
  //     dit pas si l'écran a montré des faits, un vide honnête ou une panne ;
  //     les trois events `*_viewed` ci-dessous portent donc un `state` FERMÉ qui
  //     distingue exactement les quatre états de la constitution. C'est la seule
  //     façon de savoir, plus tard, si le produit était vide ou cassé.

  // ── E13 — Recherche de lieu (`/map/search`) ───────────────────────────────
  /**
   * Un résultat a été CHOISI et la carte s'est déplacée. C'est le seul instant
   * de cet écran qui décide quelque chose.
   *
   * `source` FERMÉ : 'nearby' (une suggestion de proximité, avant toute frappe)
   * | 'recent' (une recherche récente rejouée) | 'query' (un résultat de la
   * requête tapée). Le KPI : les trois entrées ne coûtent pas le même effort —
   * si 'recent' domine, l'écran est un carnet d'adresses et pas un moteur.
   *
   * ⚠ NE TRANSPORTE NI LE TERME CHERCHÉ, NI LE LIEU CHOISI, NI SES
   * COORDONNÉES. §12 : la recherche sert à déplacer la carte, jamais à publier
   * une position — l'analytics ne doit pas faire ce que l'écran s'interdit.
   */
  placeSearchResultPicked: 'place_search_result_picked', // props: { source }

  // ── E15 — Carte des zones d'un rival (`/player/:playerId/zones`) ──────────
  /**
   * La carte des territoires publics d'un rival s'est composée, avec l'état
   * qu'elle a RÉELLEMENT rendu. `state` FERMÉ : 'ready' (des contours publiés
   * ont été rendus) | 'empty' (lecture aboutie, ce joueur ne tient rien de
   * public) | 'unavailable' (la lecture a échoué — on n'affirme rien).
   *
   * POURQUOI CET EVENT EXISTE ALORS QUE `screen()` EXISTE : 'empty' et
   * 'unavailable' sont deux écrans très différents que le fondateur doit
   * pouvoir distinguer sans ouvrir l'app. Le `$screen` PostHog les confond.
   *
   * ⚠ AUCUN identifiant de joueur, aucun nombre de zones : un compte de zones
   * croisé avec l'heure de consultation situe un rival. On mesure l'ÉTAT, pas
   * le rival.
   */
  rivalZonesViewed: 'rival_zones_viewed', // props: { state }

  // ── E16 — Mission recommandée (`/map/missions/:missionId`) ────────────────
  /**
   * Une mission recommandée a DISPARU parce qu'elle était devenue impossible —
   * le comportement que la spec exige mot pour mot (l.1009 : « Une mission
   * devenue impossible disparaît proprement avec explication »).
   *
   * `reason` FERMÉ : 'taken' (la zone a changé de mains) | 'expired' (la fenêtre
   * de défense est passée — `MISSION_DEFEND_WINDOW_H`) | 'out_of_range' (la
   * carte s'est déplacée trop loin de la cible) | 'no_position' (la position
   * qui fondait la recommandation a été perdue).
   *
   * LE KPI EST INCONFORTABLE, ET C'EST LE BUT : combien de fois GRYD propose
   * une mission qu'il retire ensuite. Un produit qui recommande puis se dédit
   * use la confiance plus vite qu'un produit qui ne recommande rien.
   *
   * NE DOUBLE RIEN : `opportunity_shown` mesure l'APPARITION d'une opportunité,
   * `mission_completed` sa réussite, `cta_tapped` le tap de « PRÉPARER LA
   * SORTIE ». Aucun des trois ne dit qu'une mission s'est éteinte.
   */
  missionDropped: 'mission_dropped', // props: { reason }

  // ── E17 — Préparation d'activité (`/map/prepare`) ─────────────────────────
  /**
   * L'écran de préparation s'est composé avec l'objectif qu'il RECOMMANDE.
   * `objective` FERMÉ : 'conquer' | 'defend' (les deux branches du mini-segment
   * de la spec). Aucun nom de zone ne part — « Défendre Saint-Rémy » se réduit
   * ici à 'defend'.
   */
  activityPrepareViewed: 'activity_prepare_viewed', // props: { objective }
  /**
   * L'utilisateur a CHANGÉ l'objectif recommandé (le lien « Changer »).
   * `objective` = celui qu'il a choisi, même vocabulaire fermé.
   *
   * C'est la mesure de qualité de la recommandation : un taux de changement
   * élevé dit que la ligne d'objectif proposée est mauvaise. Sans cet event,
   * personne ne saurait jamais si la recommandation sert ou gêne.
   *
   * NE DOUBLE PAS `run_preflight_viewed` (E06/E19) : celui-là mesure
   * l'ACQUISITION GPS juste avant le départ, celui-ci la DÉCISION d'objectif,
   * un écran plus tôt. Ni `setup_activity_chosen` (E09), qui est le choix de
   * discipline Run/Bike à l'inscription — un autre choix, une autre fois.
   */
  activityObjectiveChanged: 'activity_objective_changed', // props: { objective }

  // ── E39 — Découverte des crews (`/crew/discover`) ─────────────────────────
  /**
   * La liste de découverte s'est composée, avec l'état RÉELLEMENT rendu et le
   * filtre actif.
   *
   * `state` FERMÉ, miroir des états que l'écran distingue déjà en copie
   * (catalogue `crew.ts`, bloc LOT 7) : 'ready' | 'empty' (lecture aboutie,
   * aucun crew dans cette ville) | 'no_city' (aucune ville connue — on demande,
   * on ne devine pas) | 'unavailable' (échec de lecture) | 'signed_out'.
   * `filter` FERMÉ : 'all' | 'near' | 'friends' | 'open'.
   *
   * CE QUE CET EVENT SERT À PROUVER : au 27/07/2026 la base est vide, donc
   * 'empty' sera la valeur dominante. C'est une information PRODUIT (personne
   * ne fonde de crew dans cette ville), pas une panne — et le jour où
   * 'unavailable' monte, on le verra sans le confondre avec le vide.
   *
   * ⚠ AUCUN nom de crew, aucun identifiant de ville, aucun nombre de résultats.
   */
  crewDiscoveryViewed: 'crew_discovery_viewed', // props: { state, filter }

  // ── E40 — Profil public d'un crew (`/crew/:crewId/public`) ────────────────
  /**
   * Une DEMANDE d'adhésion a été enregistrée par le serveur (RPC 0083), pas le
   * tap du CTA. `from` FERMÉ : 'discovery' (la liste E39) | 'public' (la fiche
   * E40) | 'code' (un code d'invitation).
   *
   * NE DOUBLE PAS `crew_joined` : celui-là dit qu'on EST ENTRÉ ; une demande
   * peut rester sans réponse pour toujours (0083 n'envoie aucune notification,
   * la copie de l'écran le dit). L'écart entre les deux — combien de demandes
   * n'aboutissent jamais — est précisément ce qu'on ne sait pas mesurer
   * aujourd'hui.
   */
  crewJoinRequested: 'crew_join_requested', // props: { from }
  /**
   * Une demande reçue a été TRANCHÉE par le crew (réponse serveur).
   * `decision` FERMÉ : 'accept' | 'decline'. Aucun identifiant de candidat.
   * Complète l'event ci-dessus : sans lui, une demande sans réponse et une
   * demande refusée se ressemblent dans les chiffres.
   */
  crewJoinRequestDecided: 'crew_join_request_decided', // props: { decision }

  // ── E54 — Classement crews (et les autres onglets de `/classement`) ───────
  /**
   * Un classement s'est composé, avec l'onglet et l'état RÉELLEMENT rendus.
   * `board` FERMÉ : 'players' | 'specialties' | 'city' | 'crews'.
   * `state` FERMÉ : 'ready' | 'empty' (lecture aboutie, aucune ligne) |
   * 'no_source' (aucune source serveur ne l'alimente encore — l'écran le DIT,
   * cf. `boardNoSourceCrews`) | 'unavailable' (échec de lecture) | 'signed_out'.
   *
   * 'empty' ET 'no_source' SONT DEUX CHOSES DIFFÉRENTES, et les fondre serait
   * le mensonge de cet écran : « personne n'a encore de points » est un fait sur
   * le monde ; « GRYD ne lit pas encore cette table » est un fait sur GRYD. Le
   * classement des crews est aujourd'hui dans le second cas.
   *
   * UN SEUL event pour quatre onglets, parce que le KPI est la RÉPARTITION —
   * quatre noms auraient rendu la comparaison illisible (même raison que
   * `result_viewed` pour les six résultats).
   */
  leaderboardViewed: 'leaderboard_viewed', // props: { board, state }

  // ── E49 — Créer une sortie crew (`/crew-sortie`) ──────────────────────────
  /**
   * Une sortie crew a été ENREGISTRÉE PAR LE SERVEUR (`crew_outing_create`,
   * migration 0085) — pas le tap du CTA, pas un brouillon local.
   *
   * ⚠ CET EVENT N'EXISTAIT PAS AVANT LE 27/07/2026, ET C'ÉTAIT JUSTE : tant que
   * `insert` était révoqué sur `crew_events` sans aucun RPC pour l'écrire,
   * aucune sortie ne pouvait naître et un event défini-jamais-émis aurait décrit
   * une fonctionnalité inexistante. 0085 a créé le chemin d'écriture ; l'event
   * arrive AVEC lui, jamais avant.
   *
   * `activity` FERMÉ : 'run' | 'bike'. `objective` FERMÉ : 'defense' |
   * 'conquete'. `hasZone` / `hasCapacity` : des BOOLÉENS, parce que la question
   * produit est « ces champs facultatifs servent-ils ? », pas « quelle zone ».
   * `leadH` : heures ENTIÈRES entre la création et le rendez-vous — combien de
   * temps à l'avance un crew s'organise. Arrondi à l'heure : à la minute près,
   * ce serait un quasi-identifiant de la sortie.
   *
   * ⚠ AUCUN titre, AUCUN lieu, AUCUN nom de zone, AUCUN identifiant de crew ni
   * de sortie. Le libellé du point de rendez-vous est écrit par un humain et
   * peut nommer un lieu privé : il ne quitte JAMAIS le couple app↔serveur.
   */
  crewOutingCreated: 'crew_outing_created', // props: { activity, objective, hasZone, hasCapacity, leadH }

  // ══════════════════════════════════════════════════════════════════════════
  // L'ÉCRAN DE CETTE VAGUE QUI N'A AUCUN EVENT, ET POURQUOI
  //
  // · E50 — STATISTIQUES DU CREW. Rien à ajouter : `crew_overview()` (RPC 0044)
  //   rend le total d'hexes, la dernière capture, le rang de ville et la
  //   contribution par membre — la consultation de ces chiffres est un
  //   `$screen`, et aucun autre instant de cet écran ne décide quoi que ce
  //   soit. Les trois métriques que la spec ajoute (défenses, distance
  //   collective, courbe quatre semaines) n'ont AUCUNE source : mesurer combien
  //   de fois on affiche « indisponible » n'apprendrait rien qu'on ne sache
  //   déjà.
  // ══════════════════════════════════════════════════════════════════════════
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
