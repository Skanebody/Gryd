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
  /**
   * E65 « Statistiques personnelles » (`/profile/stats`, servi par
   * `/performance`). ÉMIS RÉELLEMENT depuis `app/performance.tsx:566` avec
   * `{ period }` — 'semaine' | 'mois' | 'saison', les filtres de la spec.
   *
   * E65 lui ajoute deux propriétés, sur CET event plutôt qu'un nouveau nom (un
   * second nom couperait la série temporelle à l'instant précis où l'on ajoute
   * une dimension) :
   *  · `activity` FERMÉ : 'run' | 'bike'. La lecture (`useStats(activity)`) est
   *    bornée par `.eq('activity', …)` : deux mondes, deux jeux de chiffres —
   *    sans cette propriété, un vide côté vélo et un vide côté course se
   *    confondent ;
   *  · `state` FERMÉ, les quatre de la constitution : 'signed_out' | 'empty'
   *    (lu, aucune sortie) | 'failed' | 'ready'. Avec zéro course en base, la
   *    valeur dominante sera 'empty' — et il faut pouvoir le distinguer d'une
   *    panne sans ouvrir l'app.
   *
   * ⚠ AUCUN CHIFFRE DE STATISTIQUE (volume, allure, régularité, surface) : ce
   * sont les données d'entraînement d'une personne réelle, et le serveur les a
   * déjà. On mesure QUE l'écran a servi, et dans quel état.
   */
  performancePageViewed: 'performance_page_viewed', // props: { period, activity, state }
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
   * 'finish_sheet' (E26) | 'pause' (E23) | 'restore' (E24 — une session
   * interrompue retrouvée au lancement, cf. `activity_restore_offered`).
   * Trois hésitations différentes, trois décisions produit différentes — les
   * confondre effacerait l'information.
   *
   * ⚠ 'restore' AJOUTÉ LE 28/07/2026 (vague E24) sur cet event PLUTÔT QU'UN
   * NOM NEUF : c'est le même fait — « la sortie continue » — et un second nom
   * couperait la série au moment précis où l'on gagne un troisième chemin.
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

  // ══════════════════════════════════════════════════════════════════════════
  // E38 / E42-E48 — LE BLOC CREW (vague du 28/07/2026)
  //
  // ⚠ CES TROIS EVENTS N'ONT AUCUN APPELANT À L'INSTANT OÙ ILS SONT ÉCRITS.
  // Ce fichier interdit normalement exactement ça (« un event émis par personne
  // serait un KPI qui ment par zéro », bloc E52). L'exception est NOMMÉE et
  // BORNÉE : ils sont posés pour les quatre agents d'écran de CETTE vague, qui
  // les câblent dans le même lot. La règle de fin de fichier s'applique sans
  // adoucissement — un event encore sans appelant à la vague suivante se
  // supprime ou se câble, et ils sont inscrits à l'inventaire pour ça.
  //
  // ⚠ AUCUN DES TROIS NE PORTE DE NOM DE CREW, DE @handle, DE PSEUDO, DE NOM DE
  // SECTEUR NI DE POSITION. Un nom de crew dans une ville de Saison 0 ne
  // désigne pas un groupe : il désigne les quatre personnes qui le composent.
  // ══════════════════════════════════════════════════════════════════════════

  // ── E38 / E42 / E43 / E44 / E46 — l'onglet Crew, quel qu'en soit l'état ───
  /**
   * L'onglet Crew s'est composé. UN SEUL event pour les cinq écrans, parce
   * qu'ils sont la MÊME route (`/crew`) dans cinq situations : la question
   * produit est « où en sont les gens vis-à-vis d'un crew ? », et cinq noms
   * rendraient le ratio illisible (même arbitrage que `leaderboard_viewed`
   * pour ses quatre onglets, et que `profile_view` pour ses deux profils).
   *
   * `state` FERMÉ — les quatre états de la constitution, plus les deux
   * situations de jeu qu'il serait faux de confondre avec un vide de lecture :
   *   'signed_out'    — pas de session (E38 sans compte) ;
   *   'loading'       — lecture EN COURS. N'AFFIRME RIEN sur le joueur : ce
   *                     n'est ni « pas de crew » ni « crew vide » ;
   *   'failed'        — la lecture a échoué. On ne sait pas s'il a un crew ;
   *   'no_crew'       — LU : ce joueur n'appartient à aucun crew (E38) ;
   *   'no_territory'  — LU : il a un crew, qui ne tient AUCUNE zone (E42) ;
   *   'ready'         — LU : crew avec territoire (E43).
   * Au 28/07/2026 la base ne contient AUCUN crew : 'no_crew' sera la valeur
   * dominante, et c'est un fait produit, pas une panne. Le jour où 'failed'
   * monte, il ne se noiera pas dedans.
   *
   * `view` FERMÉ : 'overview' | 'map' | 'members' — le segment E43 §Layout,
   * qui EST E43 / E44 / E46. `null` quand aucun segment n'est rendu (les trois
   * premiers états : il n'y a pas d'onglet à choisir).
   *
   * ⚠ AUCUN COMPTEUR : ni effectif, ni surface, ni rang de ville. Un effectif
   * de crew est un quasi-identifiant dans une ville qui en compte trois.
   */
  crewHomeViewed: 'crew_home_viewed', // props: { state, view }

  // ── E45 — Mission crew ────────────────────────────────────────────────────
  /**
   * La mission prioritaire du crew a été RENDUE, avec le genre que le moteur a
   * réellement choisi. `kind` FERMÉ, miroir EXACT de `CrewMission`
   * (packages/engine/src/crewMission.ts) : 'defend' | 'reclaim' | 'close_loop'
   * | 'capture' | 'none_no_data' | 'none_nothing_urgent' — les deux motifs de
   * `none` sont SÉPARÉS ici parce qu'ils le sont déjà dans le moteur et qu'ils
   * ne disent pas la même chose : « on ne sait rien » (crew tout neuf) n'est
   * pas « on sait, et tout est stable ».
   *
   * POURQUOI IL COMPTE : la mission est le maillon 3 de la boucle A-43 (« je
   * cours pour l'AIDER »). Elle est DÉRIVÉE, jamais écrite : si le moteur rend
   * 'none_no_data' à tout le monde pendant un mois, la boucle ne tourne pas —
   * et c'est invisible sans cet event, puisque l'écran, lui, affiche une phrase
   * parfaitement honnête.
   *
   * ⚠ AUCUN NOM DE SECTEUR, AUCUN COMPTE DE ZONES, AUCUNE ÉCHÉANCE. « défendre
   * République, 3 zones, avant 19 h » raconte où quelqu'un court et quand.
   * Le sectorName est déjà un lieu ; l'analytique n'en a aucun besoin pour
   * répondre à « quel genre de mission le moteur choisit-il ? ».
   *
   * NE DOUBLE PAS `crew_home_viewed` : celui-là dit dans quel ÉTAT est l'onglet,
   * celui-ci ce que le moteur a eu à PROPOSER. Un crew 'ready' dont la mission
   * est 'none_nothing_urgent' est un cas parfaitement normal — et c'est
   * précisément le croisement qu'on veut pouvoir lire.
   *
   * Le CTA `CONTRIBUER` de la spéc ne reçoit PAS d'event propre : c'est un tap
   * décisif, donc un `cta_tapped`, qui existe déjà pour ça.
   */
  crewMissionShown: 'crew_mission_shown', // props: { kind }

  // ── E47 — Actions sur un membre ───────────────────────────────────────────
  /**
   * Une action de la feuille E47 a été EXÉCUTÉE sur un autre membre.
   *
   * `action` FERMÉ : 'report' | 'block' | 'unblock' | 'promote' | 'demote'
   * | 'remove' | 'transfer_lead'.
   *
   * ⚠ LES QUATRE DERNIÈRES SONT ENTRÉES LE 28/07/2026, AVEC LEUR RPC — et
   * l'ordre compte. Ce bloc disait, quelques heures plus tôt : « AUCUNE RPC ne
   * les exécute, les inscrire ici peindrait une mesure d'un geste impossible ».
   * C'était exact. La migration 0093 (`crew_set_member_role`,
   * `crew_remove_member`, `crew_transfer_lead`) a ouvert les quatre chemins,
   * testés en PGlite ; elles entrent donc AVEC eux, exactement comme
   * `crew_outing_created` est entré avec la migration 0085 — jamais avant.
   *
   * `effect` (second champ, FERMÉ) dit ce que le serveur a RÉELLEMENT fait :
   * 'done' | 'unchanged' | 'refused'. Sans lui, un `crew_member_action` ne
   * mesurerait que des INTENTIONS : un fondateur qui tente dix exclusions
   * refusées produirait la même série que dix exclusions abouties. 'unchanged'
   * (idempotence : même rôle réappliqué, membre déjà sorti) reste distinct de
   * 'done' — c'est un double tap, pas un geste.
   *
   * `block` / `unblock` et `report` écrivent, eux, RÉELLEMENT : `user_blocks` et
   * `content_reports` (migration 0029), via features/crew/moderation.ts.
   *
   * POURQUOI IL COMPTE : c'est la seule mesure de la Guideline App Store 1.2 du
   * bloc crew. Un taux de blocage qui monte dans un crew est un signal de
   * modération ; un taux à zéro pendant que les signalements montent dit que le
   * blocage n'est pas trouvable.
   *
   * ⚠ AUCUNE CIBLE, AUCUN MOTIF. Pas de `userId`, pas de pseudo : attaché au
   * `distinct_id` de l'émetteur, un identifiant de cible dirait « qui bloque
   * qui » — le graphe social, la donnée la plus ré-identifiante que GRYD
   * manipule. Le motif de signalement, lui, est OMIS parce que le serveur l'a
   * déjà (`content_reports.reason`) : l'analytique n'a pas à redire ce que la
   * table de modération sait mieux qu'elle.
   */
  crewMemberAction: 'crew_member_action', // props: { action, effect }

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
   *
   * ─── 28/07/2026 — E53 « CLASSEMENT JOUEURS » (spec l.1793) ────────────────
   * ⚠ CONSTAT D'ABORD : cet event n'a JAMAIS été émis. Défini le 27/07 pour la
   * vague E54, il n'a aucun appelant (`app/(tabs)/classement.tsx` n'émet que
   * `screen('classement')`). C'est à E53 de le CÂBLER — pas à un nom neuf de le
   * remplacer, ce qui laisserait deux events pour un seul écran.
   *
   * E53 lui ajoute les deux dimensions que la spec pose, et rien de plus :
   *  · `scope` FERMÉ — les niveaux de `LEADERBOARD_LEVELS` (game-rules), dont
   *    les filtres horizontaux de la planche sont un sous-ensemble : 'local'
   *    (autour de moi), 'ville', 'amis', 'crew'. On ne crée PAS un second
   *    vocabulaire de portées : il en existe déjà un, il fait autorité.
   *    « Quartier » n'y figure pas et n'est pas ajouté — aucune granularité de
   *    quartier n'existe côté serveur, et un `scope` qui nommerait un découpage
   *    inexistant décrirait un filtre qui n'est pas là ;
   *  · `activity` FERMÉ : 'run' | 'bike' (le commutateur de la planche).
   *
   * ⚠ AUCUN RANG, AUCUN ÉCART, AUCUN NOMBRE DE JOUEURS. « 3ᵉ sur 47 à 21 h dans
   * une ville de Saison 0 » désigne une personne. La règle psychologique de la
   * spec (« comparé à des joueurs atteignables ») se vérifie sur le PRODUIT, pas
   * en exportant la position de chacun.
   */
  leaderboardViewed: 'leaderboard_viewed', // props: { board, state, scope, activity }

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

  /**
   * Une ANNONCE ÉPINGLÉE a été ENREGISTRÉE PAR LE SERVEUR
   * (`crew_announcement_post`, migration 0096). E48 §1.
   *
   * MÊME JUSTIFICATION QUE `crew_outing_created`, ET MÊME CALENDRIER : le bloc
   * « E48 » plus bas dans ce fichier a longtemps constaté que les annonces
   * n'avaient AUCUNE table (« `CREW_PERMISSIONS.pinMessage` décrit un droit sur
   * un objet qui n'existe pas »). C'était vrai jusqu'au 28/07/2026. La
   * migration 0096 crée la table et son unique chemin d'écriture ; l'event
   * arrive AVEC lui, jamais avant. Émis par `CrewActivityScreen` UNIQUEMENT
   * après un `ok` du serveur — jamais sur le tap, qui ne prouve rien.
   *
   * `duplicate` : le serveur a reconnu un REJEU (même corps normalisé) et rendu
   * la ligne existante. C'est la seule propriété qui vaille ici — elle mesure
   * les double-taps et les retries réseau, pas le contenu.
   *
   * ⚠ AUCUN corps, AUCUN extrait, AUCUNE longueur, AUCUN identifiant de crew,
   * d'annonce ou d'auteur. Le corps est écrit par un humain et lu par son crew :
   * il ne quitte JAMAIS le couple app↔serveur. Même une LONGUEUR serait un
   * quasi-identifiant du texte pour qui l'a déjà lu.
   */
  crewAnnouncementPosted: 'crew_announcement_posted', // props: { duplicate }

  // ══════════════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════════════
  // VAGUE PROFIL · SAISON · RANGS · ACTIVITÉ · RÉGLAGES (E55-E61, E69-E71,
  // E78-E79) — ajoutée le 27/07/2026.
  // ════════════════════════════════════════════════════════════════════════

  // ── E55 / E56 — Profil personnel et profil public ─────────────────────────
  /**
   * `profile_view` du minimum §18.1 de la spéc. UN SEUL event pour les DEUX
   * profils, distingués par `self` : la question produit est « regarde-t-on
   * plus son propre profil ou celui des autres ? », et deux noms rendraient le
   * ratio illisible (même raison que `leaderboard_viewed` pour ses 4 onglets).
   *
   * `self` : true = E55 (`/profile`), false = E56 (`/player/:playerId`).
   * `activity` FERMÉ : 'run' | 'bike' — la lentille active (§4.2), parce que
   *   les métriques du profil sont par discipline (`ACTIVITY_SCOPE`).
   * `state` FERMÉ, les quatre états de la constitution, jamais confondus :
   *   'signed_out' | 'empty' | 'failed' | 'ready'.
   *
   * ⚠ AUCUN `playerId`, AUCUN handle, AUCUN nom de crew, AUCUN chiffre de
   * territoire. Attaché au `distinct_id` de l'OBSERVATEUR, un identifiant de
   * profil regardé dirait « qui regarde qui » — une donnée relationnelle que
   * GRYD ne mesure nulle part, exactement ce que `screenName.ts` rédige déjà
   * dans `$screen` pour `/profil-rival/[handle]`.
   */
  profileViewed: 'profile_view', // props: { self, activity, state }

  // ── E59 — Saison (`/season`) ──────────────────────────────────────────────
  /**
   * L'écran Saison s'est composé, avec la PHASE réelle et l'état de lecture.
   * `phase` FERMÉ : 'upcoming' | 'active' | 'ended' — dérivé du TEMPS par
   * `seasonProgress` (shared/season.ts), pas du statut serveur : une saison
   * encore marquée `active` dont `ends_at` est passé rend 'ended'.
   * `state` FERMÉ : 'signed_out' | 'none' (lu, aucune saison ouverte) |
   *   'failed' (la lecture a échoué — on ne sait pas) | 'ready'.
   * `activity` FERMÉ : 'run' | 'bike' (E59 : « rangs Run et Bike SÉPARÉS »).
   *
   * NE DOUBLE PAS `leaderboard_viewed` : celui-là mesure un CLASSEMENT (qui est
   * devant qui), celui-ci l'écran de PROGRESSION personnelle (rang, XP, jalon,
   * récompenses). Les deux vivent sur des routes différentes depuis l'arbitrage
   * A2, et confondre « je regarde le classement » avec « je regarde ma
   * progression » effacerait la seule distinction utile.
   */
  seasonViewed: 'season_view', // props: { phase, activity, state }

  // ── E60 — Passage de rang (plein écran) ───────────────────────────────────
  /**
   * Le moment de rang s'est TERMINÉ, et comment. C'est la seule mesure qui
   * vaille : un moment célébratoire qu'on saute systématiquement est un moment
   * raté, et le fondateur doit pouvoir le voir sans ouvrir l'app.
   *
   * `dismissal` FERMÉ : 'auto' (l'échéance `motion.rankMomentMaxMs` est
   *   arrivée) | 'skip' (tap n'importe où / geste de saut) | 'cta' (CONTINUER)
   *   | 'season' (le lien « Voir la saison » — l'utilisateur veut le détail).
   * `reduced_motion` : booléen — l'animation a-t-elle été supprimée (§3.7) ?
   *   Sans lui, un taux de 'skip' élevé serait illisible.
   *
   * ⚠ AUCUN nom de rang, AUCUN niveau. Le rang atteint est une donnée de
   * progression déjà portée par le serveur ; ici il identifierait un joueur
   * dans une petite ville. On mesure le MOMENT, pas la personne.
   */
  rankMomentDismissed: 'rank_moment_dismissed', // props: { dismissal, reduced_motion }

  // ── E61 — Fin de saison (bilan) ───────────────────────────────────────────
  /**
   * Le bilan de fin de saison s'est affiché, avec ce qu'il a RÉELLEMENT pu
   * montrer. `state` FERMÉ : 'signed_out' | 'no_result' (la saison est close
   * mais aucun rang final n'a été lu pour ce joueur — il n'a pas participé) |
   * 'failed' | 'ready'.
   *
   * ⚠ AUCUN rang final, AUCUN palier décroché : dans une ville de Saison 0, le
   * couple (rang, heure) désigne une personne. Le rang final est déjà connu du
   * serveur qui l'a calculé — l'analytics n'en a aucun besoin.
   *
   * PAS D'EVENT « RÉCUPÉRER » : le CTA de la planche accuse RÉCEPTION d'un
   * badge que `season_close` a déjà décerné côté serveur — rien n'est
   * « claim » à ce moment-là. Un `season_reward_claimed` décrirait une
   * mécanique qui n'existe pas ; le tap se mesure avec `cta_tapped`.
   */
  seasonRecapViewed: 'season_recap_viewed', // props: { state }

  // ── E71 — Réglages de notifications ───────────────────────────────────────
  /**
   * Une catégorie de notification a été basculée. C'est le seul instant de
   * l'écran qui DÉCIDE quelque chose, et le KPI est direct : quelles alertes
   * les joueurs éteignent en premier.
   *
   * `category` FERMÉ, les cinq de la spéc §13 : 'defense' | 'crew' |
   *   'rivalite' | 'progression' | 'produit' (miroir de
   *   `NotificationCategory`, features/notifications/notifPrefs.ts).
   * `enabled` : l'état APRÈS le basculement.
   *
   * ⚠ N'ÉMETTRE QUE POUR UNE CATÉGORIE RÉELLEMENT GOUVERNÉE. Aujourd'hui seules
   * 'defense' et 'rivalite' pilotent un envoi serveur (`decay_job`,
   * `steal_push_job`) — l'écran ne peint d'interrupteur que pour elles. Émettre
   * pour les trois autres mesurerait un réglage qui ne gouverne rien.
   *
   * NE DOUBLE PAS `permission_notifications` (E10), qui mesure la réponse à la
   * permission SYSTÈME — un oui/non de l'OS, pas une préférence de contenu.
   */
  notifPrefChanged: 'notif_pref_changed', // props: { category, enabled }

  // ── E57 / E58 — Suivis, amis et défi (migration 0087) ─────────────────────
  /**
   * ⚠ CES QUATRE EVENTS N'EXISTAIENT PAS AVANT LE 27/07/2026, ET C'ÉTAIT JUSTE.
   * Le bloc ci-dessous portait alors, en toutes lettres, « E57 et E58 n'ont
   * aucun event » : `friendships` n'avait aucun chemin d'écriture, aucune table
   * `follows` ni `duels` n'existait, donc aucun de ces gestes ne pouvait
   * aboutir. La migration 0087 a créé ces chemins ; les events arrivent AVEC
   * eux, jamais avant — exactement le protocole suivi par
   * `crew_outing_created` (0085).
   *
   * ⚠ AUCUN DE CES EVENTS NE PORTE DE PII, ET C'EST PLUS STRICT QU'AILLEURS.
   * Pas de @handle, pas de nom affiché, pas d'identifiant de personne, pas de
   * ville, pas de libellé de zone. Un event social est le pire endroit du
   * produit pour laisser passer un identifiant : attaché au `distinct_id` de
   * l'émetteur, il dirait « qui connaît qui » — un GRAPHE SOCIAL, la donnée la
   * plus ré-identifiante que GRYD manipule (même raison que la rédaction de
   * `/profil-rival/[handle]` dans `lib/screenName.ts`).
   */

  /**
   * Un suivi a été ENREGISTRÉ PAR LE SERVEUR (`follow_user`). `result` FERMÉ,
   * miroir des réponses de la RPC : 'followed' | 'already' | 'not_found' |
   * 'rate_limited'. Le KPI est le TAUX D'ÉCHEC — si 'not_found' domine, c'est
   * que le partage de @handle ne fonctionne pas, pas que les gens refusent.
   */
  socialFollowed: 'social_followed', // props: { result }

  /**
   * Une demande d'ami a été SOUMISE au serveur (`friend_request`). `result`
   * FERMÉ : 'pending' | 'accepted' (croisement) | 'already' | 'cooldown' |
   * 'too_many_pending' | 'not_found'. 'cooldown' est le signal à surveiller :
   * il compte les insistances après refus.
   */
  friendRequestSent: 'friend_request_sent', // props: { result }

  /**
   * Une demande d'ami REÇUE a été tranchée (`friend_respond`). `decision`
   * FERMÉ : 'accepted' | 'declined'. Aucune raison de refus n'est mesurée — il
   * n'en existe pas, et en inventer une pour l'analytique reviendrait à
   * réintroduire la friction que E57 interdit.
   */
  friendRequestDecided: 'friend_request_decided', // props: { decision }

  /**
   * Un défi a été SOUMIS au serveur (`duel_create`). `kind` FERMÉ, les quatre
   * de `DUEL_KINDS` ; `activity` FERMÉ : 'run' | 'bike' ; `periodDays` entier
   * borné par DUEL_PERIOD_DAYS_MIN/MAX ; `result` FERMÉ : 'sent' |
   * 'no_relation' | 'cooldown' | 'already_pending' | 'too_many_pending' |
   * 'not_found'. Aucune CIBLE chiffrée n'est envoyée : « 12,4 km » est un
   * quasi-identifiant du défi, et le produit n'a rien à en faire.
   */
  duelSent: 'duel_sent', // props: { kind, activity, periodDays, result }

  /**
   * Un défi REÇU a été tranché (`duel_respond`). `decision` FERMÉ : 'accepted'
   * | 'declined'. C'est LA mesure de santé de E58 : un taux de refus élevé est
   * une information saine (les gens se sentent libres) ; ce qui alerterait,
   * c'est qu'il tombe à zéro — signe que refuser coûte quelque chose.
   */
  duelDecided: 'duel_decided', // props: { decision }

  // ══════════════════════════════════════════════════════════════════════════
  // VAGUE BADGES · STATISTIQUES · HISTORIQUE · BOUTIQUE · ABONNEMENT
  // (E52 · E53 · E62-E68 · E72-E75 — spec produit UI/UX, l.1777 · 1793 · 1994 ·
  //  2020 · 2035 · 2051 · 2080 · 2097 · 2133 · 2227 · 2260 · 2277 · 2305),
  // ajoutée le 28/07/2026.
  //
  // LES QUATRE RÈGLES DES BLOCS PRÉCÉDENTS, INCHANGÉES :
  //  1. AUCUN event sans point d'émission NOMMABLE ET ATTEIGNABLE. Trois écrans
  //     de cette vague n'en reçoivent AUCUN — voir les notes E52, E68 et E73 en
  //     fin de bloc. Ce n'est pas un oubli, c'est le constat ;
  //  2. AUCUNE PII. Pas de @handle, pas d'identifiant de course, de joueur ni de
  //     crew, pas de nom de zone ou de ville, pas de libellé i18n. Et, propre à
  //     cette vague : AUCUNE CLÉ DE BADGE. Un badge rare, croisé avec l'heure,
  //     désigne une personne dans une ville de Saison 0 — même raison que le
  //     refus de transmettre le rang dans `rank_moment_dismissed` (E60). On
  //     mesure la RARETÉ (booléen), jamais l'objet ;
  //  3. AUCUN NOMBRE DE JEU. Le plafond de vitrine vit dans game-rules
  //     (`FEATURED_BADGE_COUNT`) ; ici on ne transporte que l'ISSUE qu'il produit ;
  //  4. LA BASE EST VIDE DE JEU, DONC L'ÉTAT VIDE SE MESURE. Zéro course, zéro
  //     territoire, zéro crew au 28/07/2026 : sur une collection, un historique
  //     ou une analyse territoriale, « rien à montrer » sera le cas DOMINANT. Un
  //     `$screen` nu ne dit pas si l'écran a montré des faits, un vide honnête ou
  //     une panne — d'où le `state` FERMÉ porté par chaque `*_viewed` ci-dessous,
  //     qui distingue exactement les quatre états de la constitution.
  //
  // ⚠ ET UNE CINQUIÈME, IMPOSÉE PAR CETTE VAGUE — ON NE MESURE JAMAIS UN ACHAT
  //   QUE LE STORE N'A PAS CONFIRMÉ. La chaîne existante est déjà à trois temps
  //   et ne doit pas être aplatie : `paywall_view` (on a VU), `purchase_initiated`
  //   (on a VOULU), `purchase_completed` (le Store a DIT OUI). Aucun event de ce
  //   bloc ne franchit ces bornes ; aucun ne transporte de PRIX non plus — les
  //   montants viennent du Store, et un prix figé dans l'analytique serait aussi
  //   faux qu'un prix figé dans le code (constitution §9).

  // ── E62 — Collection de badges (`/badges`) ────────────────────────────────
  /**
   * La collection s'est composée, avec l'état qu'elle a RÉELLEMENT rendu.
   * `state` FERMÉ, les cinq que l'écran distingue déjà en copie (catalogue
   * `badges.ts` : `signedOutTitle`, `noBackendTitle`, `failedTitle`, `emptyLine`,
   * `loading`) : 'signed_out' | 'no_backend' (aucun backend configuré — il n'y a
   * personne au bout, ce n'est PAS une panne) | 'failed' | 'empty' (lecture
   * aboutie, aucun badge décerné) | 'ready'.
   *
   * POURQUOI IL NE DOUBLE PAS `$screen` : `screen('badges')` (app/badges.tsx)
   * dit qu'on a ouvert l'écran, jamais ce qu'il a pu montrer. Or 'empty' sera la
   * valeur dominante tant qu'aucune course n'est ingérée, et le jour où 'failed'
   * monte il faut le voir SANS le confondre avec le vide.
   *
   * ⚠ AUCUN NOMBRE DE BADGES : le compte obtenu/total, croisé avec l'heure, est
   * un quasi-identifiant. Le serveur le connaît déjà, l'analytique n'en a rien à
   * faire.
   */
  badgesViewed: 'badges_viewed', // props: { state }

  // ── E63 — Détail d'un badge (feuille au tap) ──────────────────────────────
  /**
   * La feuille de détail s'est ouverte sur un badge, dans l'état qu'il a POUR
   * CE JOUEUR. `state` FERMÉ : 'unlocked' | 'locked' (visible avec sa condition)
   * | 'secret' (masqué tant qu'il n'est pas obtenu).
   *
   * LE KPI EST UNE QUESTION DE MOTIVATION, PAS DE VANITÉ : ouvre-t-on les badges
   * qu'on a (on se contemple) ou ceux qu'on n'a pas (on se projette) ? Si
   * 'locked' ne s'ouvre jamais, les conditions n'appellent personne et la
   * collection ne sert qu'à archiver.
   *
   * ⚠ AUCUNE CLÉ DE BADGE, AUCUNE FAMILLE, AUCUN TIER (règle 2 de ce bloc).
   * `zone_detail_viewed` a la même forme et pour la même raison.
   */
  badgeDetailViewed: 'badge_detail_viewed', // props: { state }

  // ── E63 / E64 — « AJOUTER AU PROFIL » ─────────────────────────────────────
  /**
   * L'action de vitrine a été TRANCHÉE par `addToFeatured`
   * (features/badges/unlockMoment.ts), avec son issue réelle.
   * `result` FERMÉ, miroir exact des trois branches de la fonction pure :
   * 'added' | 'already' (le badge y était déjà) | 'full' (la vitrine est à
   * `FEATURED_BADGE_COUNT`).
   * `rare` : booléen (`isRareBadge`) — pas la clé, pas le tier. Il sert à savoir
   * si l'on met en avant ce qui est RARE ou simplement ce qui vient d'arriver.
   *
   * POURQUOI 'full' MÉRITE D'ÊTRE COMPTÉ : c'est le seul cas où le CTA principal
   * d'un moment célébratoire n'aboutit pas. S'il domine, le plafond de vitrine
   * transforme une récompense en friction — et personne ne le saurait autrement.
   *
   * NE DOUBLE PAS `cta_tapped` : celui-là compte des TAPS, celui-ci des ISSUES.
   */
  badgeFeaturedAdded: 'badge_featured_added', // props: { result, rare }

  // ── E67 — Historique des activités (`/profile/history`) ───────────────────
  /**
   * La liste d'historique s'est composée. `state` FERMÉ, les cinq que l'écran
   * nomme lui-même dans son docblock (app/historique.tsx, « LES CINQ ÉTATS,
   * JAMAIS CONFONDUS ») : 'loading' | 'signed_out' | 'no_backend' | 'failed' |
   * 'empty' | 'ready'.
   * `activity` FERMÉ : 'run' | 'bike' — la lentille E14 mémorisée pour cet
   * onglet (`gryd.activity.historique`). La lecture SUIT la lentille
   * (`.eq('activity', …)`), donc un vide côté vélo n'est pas un vide côté course :
   * sans cette propriété, deux mondes distincts seraient additionnés.
   *
   * ⚠ AUCUN NOMBRE DE SORTIES, AUCUN KILOMÈTRE, AUCUNE DATE. Le résumé d'en-tête
   * (sorties, km, captures, défenses) décrit une vie réelle : agrégé sur un
   * `distinct_id`, il reconstitue un entraînement. Le serveur l'a déjà.
   */
  historyViewed: 'history_viewed', // props: { state, activity }

  // ── E66 — Analytics territoriales Premium (`/premium-analytics`) ──────────
  /**
   * L'analyse territoriale s'est composée. `state` FERMÉ, miroir des branches
   * réellement peintes par `app/premium-analytics.tsx` : 'loading' |
   * 'signed_out' | 'locked' (pas de droit Pro — l'écran vend, il n'analyse pas)
   * | 'failed' | 'empty' (lecture aboutie, ce joueur ne tient aucune zone) |
   * 'ready'.
   *
   * 'locked' ET 'empty' NE SE CONFONDENT PAS, et c'est tout l'intérêt : un
   * abonné qui ne tient rien voit un écran vide malgré son paiement. Fondre les
   * deux masquerait exactement la population qu'il faut voir.
   *
   * NE DOUBLE PAS `paywall_view` : celui-ci est déjà émis en 'locked'
   * (premium-analytics.tsx:462, `trigger: 'e66_analytics'`) et mesure une
   * OCCASION DE VENTE. Celui-là mesure la SANTÉ D'UNE LECTURE.
   *
   * ⚠ AUCUNE SURFACE, AUCUNE DURÉE DE CONTRÔLE, AUCUN NOMBRE DE ZONES ni de
   * frontières : §12 interdit la coordonnée précise, et un profil territorial
   * chiffré en est une par approximation. E66 est aussi le seul écran dont la
   * spec pose une LIMITE ÉTHIQUE explicite (« aide à comprendre son propre
   * territoire, pas à espionner ») — son analytique doit s'y tenir aussi.
   */
  territoryAnalyticsViewed: 'territory_analytics_viewed', // props: { state }

  // ── E72 — Boutique (`/shop`, servie par `/arsenal`) ───────────────────────
  /**
   * Le rayon s'est composé, avec l'état de vente RÉEL et la catégorie affichée.
   * `state` FERMÉ : 'signed_out' | 'closed' (la boutique n'est pas ouverte —
   * aucun rail d'achat n'est branché, et le catalogue `arsenal.ts` le DIT à
   * l'écran) | 'failed' | 'ready'.
   * `category` FERMÉ : les clés de `shopCategoryKeys()`
   * (features/arsenal/shop.ts) — 'all' et les sections du catalogue.
   *
   * POURQUOI 'closed' EST UNE VALEUR ET PAS UNE ABSENCE : au 28/07/2026 la
   * boutique montre des objets qu'on ne peut pas acheter. C'est un FAIT sur GRYD
   * (le rail IAP n'existe pas), pas un vide de catalogue, et le jour où il
   * s'ouvre la bascule doit se voir dans les chiffres.
   *
   * ⚠ AUCUN PRIX, AUCUNE CLÉ D'OBJET, AUCUN SOLDE D'ÉCLATS. Un prix dans
   * l'analytique se fige exactement comme un prix dans le code (constitution §9),
   * et un solde est une donnée de compte.
   */
  shopViewed: 'shop_viewed', // props: { state, category }

  // ── E75 — Gestion d'abonnement et achats ──────────────────────────────────
  /**
   * L'écran de gestion s'est composé, avec le DROIT réellement lu.
   * `state` FERMÉ, miroir de `ProStatus` (features/premium/entitlement.ts) plus
   * les états de LECTURE, qui ne sont pas des statuts d'abonnement :
   * 'loading' | 'signed_out' | 'unavailable' (la plateforme ou la configuration
   * ne permet aucune lecture — web, clé absente) | 'failed' | 'none' (lu :
   * ce compte n'a jamais eu le droit) | 'expired' | 'active'.
   *
   * `renews` : booléen — l'abonnement se reconduit-il ? Il vient de `willRenew`
   * recoupé avec l'échéance, jamais du seul drapeau caché du SDK. C'est le KPI
   * de résiliation SILENCIEUSE : quelqu'un qui a coupé le renouvellement est
   * encore « actif » et disparaîtra sans prévenir.
   *
   * ⚠ AUCUNE DATE D'ÉCHÉANCE, AUCUN `productId`, AUCUN PRIX, AUCUN
   * `originalAppUserId`. Une échéance à la seconde est un identifiant d'achat.
   *
   * NE DOUBLE PAS `paywall_view` : E75 n'est pas un écran de vente. Quelqu'un
   * qui gère un abonnement qu'il a déjà ne « voit » pas une offre — compter les
   * deux ensemble gonflerait le haut du funnel avec des clients existants.
   */
  subscriptionManageViewed: 'subscription_manage_viewed', // props: { state, renews }
  /**
   * `RESTAURER MES ACHATS` a rendu son verdict — la réponse du Store, jamais le
   * tap. `result` FERMÉ, miroir de `PremiumActionResult`
   * (features/premium/usePremium.ts) : 'restored' | 'nothing_to_restore' |
   * 'failed'.
   *
   * POURQUOI IL COMPTE : c'est le geste du joueur qui a payé et ne voit rien —
   * un changement d'appareil, une réinstallation, un compte Store différent. Un
   * taux de 'nothing_to_restore' élevé ne dit pas « personne n'a payé », il dit
   * « quelqu'un a payé et on ne le retrouve pas ». C'est aussi la seule exigence
   * de l'App Store de cette vague qui soit mesurable côté client.
   *
   * ⚠ NE VAUT PAS ACHAT. `purchase_completed` reste réservé à une transaction
   * que le Store vient de confirmer ; une restauration rend un droit ANCIEN. Les
   * confondre inventerait des ventes.
   */
  purchasesRestored: 'purchases_restored', // props: { result }

  // ══════════════════════════════════════════════════════════════════════════
  // VAGUE E11 · E12 · E18 · E20 · E21 · E23 · E24 (spec produit UI/UX, l.829 ·
  // 902 · 1063 · 1110 · 1150 · 1185 · 1201), ajoutée le 28/07/2026.
  //
  // LES QUATRE RÈGLES DES BLOCS PRÉCÉDENTS S'APPLIQUENT (émission nommable,
  // zéro PII, zéro nombre de jeu, l'état vide se mesure), PLUS DEUX que le
  // contexte impose et qui gouvernent tout ce bloc :
  //
  //  5. ZÉRO POSITION, ET ÇA VA PLUS LOIN QU'UN COUPLE DE COORDONNÉES. Ces sept
  //     écrans sont les seuls du produit qui tournent LA CARTE OUVERTE ou LE GPS
  //     ALLUMÉ. Ne partent donc JAMAIS : lat/lng même arrondie, `zoneId` /
  //     `sectorId` / `territoryId` / index H3, niveau de zoom, cap, distance
  //     restante, terme de recherche, nom de quartier. Un identifiant de zone
  //     localise au mètre — c'est ce que dit déjà le docblock de
  //     `zone_detail_viewed`, et cette vague l'étend à la carte entière.
  //     ⚠ CONSTAT, PAS PROMESSE : trois appels `screen()` du dépôt violent
  //     aujourd'hui cette règle (`map_zone_open { zone }`
  //     features/map/BattleMapOverlays.tsx:721, `map_zone_act { zone }` :1013,
  //     `map_mission_brief { zone }` features/map/MissionBriefingSheet.tsx:154).
  //     Ce ne sont pas des events §8 — ce sont des `$screen` PostHog avec une
  //     propriété — mais ils envoient bel et bien l'identifiant. Les events
  //     ci-dessous sont leur REMPLACEMENT sans identifiant ; le retrait des
  //     trois appels revient aux agents d'écran E11/E12 de cette vague.
  //
  //  6. SUBI ≠ CHOISI. E23 (pause) et E24 (GPS faible / récupération) se
  //     ressemblent à l'écran et n'ont RIEN à voir : l'un est un geste, l'autre
  //     un accident. Les mêler ferait une série où « le joueur souffle » et
  //     « l'app a perdu le signal » se compensent — la mesure ne servirait plus
  //     à rien. Deux events distincts, `activity_paused` (choisi ou physique) et
  //     `activity_interrupted` (subi), et une frontière écrite sur chacun.

  // ── E11 — Carte principale (`/map`) ───────────────────────────────────────
  /**
   * LA CARTE S'EST COMPOSÉE, avec l'état qu'elle a RÉELLEMENT rendu et la
   * lentille active. Nom EXIGÉ MOT POUR MOT par la spec (l.897).
   *
   * `state` FERMÉ — les quatre états de la constitution, plus les deux que la
   * carte seule connaît :
   *   'signed_out' | 'locating' (lecture EN COURS — n'affirme RIEN sur le
   *   joueur) | 'no_location' | 'empty' (lecture aboutie, aucun territoire dans
   *   cette discipline) | 'failed' | 'ready'.
   *
   * POURQUOI 'no_location' FOND TROIS CAS (refusé / jamais demandé /
   * indisponible) alors que l'écran, lui, les distingue en copie
   * (`dataNoteLocationDenied` / `…Unasked` / `…Unavailable`) : `permission_location
   * { result }` mesure DÉJÀ exactement cette distinction, à la source, depuis
   * `useRealRun.ts:68`. Les redire ici fabriquerait une seconde vérité sur la
   * même question, qui divergerait au premier changement de flux.
   *
   * `activity` FERMÉ ('run' | 'bike') : la carte est séparée par discipline
   * (`ACTIVITY_SCOPE.territory`). Sans cette propriété, un monde vélo vide et
   * une panne côté course se confondraient dans la même barre.
   *
   * ⚠ AUCUN zoom, AUCUN centre, AUCUN compte de zones : un nombre de
   * territoires croisé avec l'heure situe un joueur dans sa ville.
   */
  mapView: 'map_view', // props: { state, activity }
  /**
   * UNE ZONE A ÉTÉ TAPÉE sur la carte (le geste qui ouvre E14). Nom EXIGÉ par
   * la spec (l.897).
   *
   * `role` FERMÉ — le RÔLE de la zone, jamais son identité : 'free' | 'mine' |
   * 'crew' | 'rival' | 'contested'. C'est le même vocabulaire que
   * `zone_detail_viewed { state }`, et ce n'est PAS un doublon : celui-ci
   * mesure le GESTE sur la carte (combien de taps trouvent une zone), celui-là
   * la FEUILLE qui s'ouvre ensuite. L'écart entre les deux est le taux de taps
   * perdus — la mesure de lisibilité de la carte que §A réclame (« comprendre
   * en moins de 3 s »).
   *
   * ⚠ REMPLACE `screen('map_zone_open', { zone })` : cet appel envoie
   * l'identifiant de la zone, donc la position du joueur à ~100 m près.
   */
  mapZoneTap: 'map_zone_tap', // props: { role }
  /**
   * LA FEUILLE BASSE A RECOMMANDÉ QUELQUE CHOSE — ou a honnêtement renoncé.
   * Nom EXIGÉ par la spec (l.897).
   *
   * `kind` FERMÉ, miroir EXACT de `MAP_RECOMMENDATION_PRIORITY` (game-rules) :
   * 'defense_urgent' | 'crew_mission' | 'suggested_loop' | 'free_conquest',
   * plus 'none' — qui n'est PAS une cinquième priorité mais l'aveu qu'aucun
   * fait ne permettait de recommander. C'est la valeur la plus importante du
   * lot : une base vide doit produire 'none', jamais une conquête inventée.
   *
   * LE KPI EST INCONFORTABLE, comme celui de `mission_dropped` : si
   * 'defense_urgent' ne sort jamais alors que des zones meurent, la priorité 1
   * de la spec n'est pas câblée — et personne ne le verrait autrement.
   *
   * ⚠ AUCUN nom de zone, AUCUNE distance estimée : « Défendre Saint-Rémy ·
   * 3,2 km » se réduit ici à 'defense_urgent'.
   */
  mapRecommendationShown: 'map_recommendation_shown', // props: { kind }
  /**
   * RECENTRAGE demandé (FAB, ou tap sur l'onglet Carte déjà actif — spec
   * l.893). Nom EXIGÉ par la spec (l.897).
   *
   * `outcome` FERMÉ : 'centered' (une position réelle existait, la caméra a
   * bougé) | 'no_position' (aucun fix : le bouton a nommé son échec).
   * Sans `outcome`, ce serait un compteur de taps ; avec lui, c'est la mesure du
   * « bouton mort » que la constitution interdit — un taux de 'no_position'
   * élevé dit que l'affordance promet ce que le capteur ne donne pas.
   *
   * `source` FERMÉ : 'fab' | 'tab' — deux gestes de coût très différent.
   */
  mapRecenter: 'map_recenter', // props: { outcome, source }
  /**
   * CHANGEMENT DE LENTILLE Run ↔ Bike. Nom EXIGÉ par la spec (l.897).
   *
   * `to` FERMÉ ('run' | 'bike') et `surface` FERMÉ (la surface qui porte le
   * commutateur : 'map' | 'leaderboard' | 'history' | 'profile'…, cf.
   * `ui/activityLens.ts` — le réglage est mémorisé PAR surface).
   *
   * NE DOUBLE PAS `setup_activity_chosen` (E09), qui est le choix de discipline
   * à l'inscription : celui-ci est une LENTILLE de lecture, qu'on bascule vingt
   * fois par semaine. Ni `run_start { activity }`, qui est la discipline d'une
   * sortie RÉELLE — la seule des trois qui engage le joueur.
   */
  activitySwitch: 'activity_switch', // props: { to, surface }

  // ── E12 — Couches et filtres de carte (feuille basse depuis E11) ──────────
  /** La feuille des couches s'est ouverte. Le seul instant d'entrée d'E12. */
  mapLayersOpened: 'map_layers_opened',
  /**
   * UNE COUCHE A ÉTÉ BASCULÉE. `layer` FERMÉ, miroir EXACT de `MAP_LAYER_KEYS`
   * (game-rules) : 'mine' | 'crew' | 'rivals' | 'contested' | 'missions' |
   * 'private_zones' | 'labels'. `visible` = l'état APRÈS le geste.
   *
   * `activity` FERMÉ ('run' | 'bike') parce que le réglage est persisté PAR
   * DISCIPLINE (`ACTIVITY_SCOPE.mapLayers`) : sans elle, on ne saurait pas quel
   * des deux mondes on vient de filtrer.
   *
   * LE KPI : quelles couches les gens ÉTEIGNENT. Une couche que tout le monde
   * coupe est une couche qui ne devrait pas être allumée par défaut — c'est la
   * seule façon de le savoir sans demander.
   *
   * ⚠ L'EXCEPTION D'URGENCE NE S'ÉMET PAS. Quand un marqueur de menace urgente
   * survit à un filtre éteint (`mapFeatureVisible`, spec l.928), AUCUN event
   * n'est envoyé : ce serait un compteur d'affichages automatiques, et il
   * porterait implicitement l'information « ce joueur a une zone qui expire »,
   * horodatée. La règle se teste (game-rules.test.ts), elle ne se mesure pas.
   */
  mapLayerToggled: 'map_layer_toggled', // props: { layer, visible, activity }

  // ── E18 — Planificateur de boucle (`/map/route-plan`) ─────────────────────
  /**
   * UN CALCUL DE BOUCLE A RENDU SON VERDICT — le seul instant de cet écran qui
   * apprenne quelque chose (le tap `UTILISER CETTE BOUCLE` reste un
   * `cta_tapped`, et l'ouverture un `$screen`).
   *
   * `outcome` FERMÉ, miroir des états que `plannerCta()` distingue déjà
   * (features/route/plannerCta.ts) : 'ready' (OSRM a répondu, un tracé est
   * affiché) | 'no_route' (position acquise, routeur muet) | 'no_position'
   * (aucun fix : rien n'a pu être demandé).
   *
   * `preset` FERMÉ : 'recommended' | 'short' | 'long' | 'custom' (la distance
   * ajustée à la main). La spec (l.1072) veut « trois suggestions » et pas de
   * formulaire : si 'custom' domine, les trois formats sont mal choisis.
   *
   * `activity` FERMÉ : le planificateur route au profil de la discipline
   * (`ACTIVITY_ROUTING`), et une boucle vélo de 10 km n'est pas une boucle de
   * course de 10 km. Confondre les deux rendrait le taux de 'no_route'
   * illisible.
   *
   * ⚠ AUCUNE DISTANCE, AUCUN POINT DE DÉPART, AUCUN TRACÉ. Un point de départ
   * de boucle EST une adresse — c'est très exactement ce que §12 protège, et ce
   * que `place_search_result_picked` s'interdit déjà.
   */
  routePlanComputed: 'route_plan_computed', // props: { outcome, preset, activity }

  // ── E20 / E21 — Activité Run et Bike actives (`/activity/live`) ───────────
  /**
   * L'ÉCRAN DE COURSE A ÉTÉ VERROUILLÉ ou DÉVERROUILLÉ (spec l.1145 : « écran
   * verrouillable »). `locked` = l'état APRÈS le geste.
   *
   * POURQUOI IL MÉRITE UN EVENT alors que c'est « juste » un bouton : c'est la
   * seule affordance de ces deux écrans qui protège À LA FOIS d'un arrêt
   * accidentel en poche et de la consommation d'un écran qu'on rallume vingt
   * fois. Savoir si elle est utilisée décide s'il faut la rendre automatique.
   *
   * NE PORTE PAS `activity` : la discipline d'une sortie est déjà dans
   * `run_start { activity }`, émis quelques secondes plus tôt sur la MÊME
   * session. La répéter ici n'ajouterait qu'une colonne à recouper.
   */
  activityScreenLocked: 'activity_screen_locked', // props: { locked }

  // ── E23 — Pause (overlay, jamais une navigation) ──────────────────────────
  /**
   * L'ACTIVITÉ S'EST MISE EN PAUSE — le côté CHOISI (ou physique) de la
   * frontière, jamais le subi.
   *
   * `cause` FERMÉ :
   *   · 'user'       — le bouton PAUSE (E23). Un geste, une décision ;
   *   · 'auto_still' — la pause AUTOMATIQUE d'immobilité (moteur GPS,
   *      `GPS_PAUSE_SPEED_MS` / `GPS_PAUSE_AFTER_S`). Ni choisie ni subie : le
   *      joueur s'est arrêté à un feu, et l'app l'a vu.
   *
   * ⚠ 'permission_revoked' N'EST PAS ICI, bien que la spec (l.1205) dise qu'une
   * permission révoquée déclenche une « pause automatique ». Elle est comptée
   * dans `activity_interrupted` : c'est un ACCIDENT, et le mêler aux deux
   * ci-dessus rendrait le taux de pause inexploitable — on ne saurait plus si
   * les gens soufflent ou si le produit casse.
   *
   * LA REPRISE N'A PAS D'EVENT NEUF : `activity_resumed { from: 'pause' }`
   * existe et couvre exactement ce cas.
   */
  activityPaused: 'activity_paused', // props: { cause }
  /**
   * L'ACTIVITÉ A ÉTÉ ANNULÉE — la troisième action d'E23 (l.1192), celle qui
   * SUPPRIME la trace locale. Émis APRÈS la confirmation et la suppression
   * effective, jamais au tap : une intention d'annuler n'est pas une annulation.
   *
   * `produces_result` = verdict de `activityProducesResult()` (les minima §3.2
   * de la discipline), la même propriété que `activity_finish_sheet_viewed`.
   * C'est LA question qui compte : combien de sorties DÉTRUITES auraient compté.
   * Un taux élevé dit qu'on a laissé jeter du territoire gagné.
   *
   * NE DOUBLE PAS `run_cancel_attempt { phase: 'preflight' }`, qui mesure
   * l'abandon AVANT le départ (`useRealRunCore.ts:620`) — rien n'existe encore
   * à cet instant, il n'y a donc rien à détruire.
   */
  activityCancelled: 'activity_cancelled', // props: { produces_result }

  // ── E24 — GPS faible / activité en récupération ───────────────────────────
  /**
   * L'ACTIVITÉ A SUBI UN ACCIDENT — le côté SUBI de la frontière. « Aucune perte
   * silencieuse » (spec l.1211) commence par ne pas perdre la mesure de ce qui
   * casse.
   *
   * `cause` FERMÉ, les quatre cas de la spec qui sont OBSERVABLES par le client :
   *   · 'signal_lost'         — plus aucun fix frais (`GPS_SIGNAL_LOST_AFTER_S`).
   *      La distance ne compte jamais un trou de signal ; l'écran le dit, et
   *      cette valeur dit combien de fois ;
   *   · 'permission_revoked'  — l'autorisation a été coupée EN COURSE →
   *      pause automatique. Compté ICI et pas dans `activity_paused` ;
   *   · 'app_killed'          — une session interrompue a été retrouvée au
   *      lancement (`shouldProposeCrashRecovery`) ;
   *   · 'sensor_inconsistent' — capteur incohérent : l'activité continue mais
   *      part en analyse (spec l.1209).
   *
   * ⚠ 'network_lost' N'EXISTE PAS DANS CETTE LISTE, alors que la spec cite
   * « réseau absent : file d'attente locale ». C'est déjà mesuré, exactement, par
   * `activity_upload_queued { reason: 'offline' }` — l'ajouter ici compterait
   * chaque coupure deux fois et gonflerait le taux d'accident d'un incident qui,
   * lui, ne perd rien.
   *
   * ⚠ AUCUNE DURÉE DE TROU, AUCUNE PRÉCISION EN MÈTRES, AUCUN NOMBRE DE POINTS
   * PERDUS : croisés avec l'heure, ils dessinent où le signal tombe — donc un
   * itinéraire.
   */
  activityInterrupted: 'activity_interrupted', // props: { cause }
  /**
   * UNE SESSION INTERROMPUE A ÉTÉ PROPOSÉE À LA REPRISE (spec l.1207 : « app
   * tuée : session locale restaurée »). Émis quand la feuille s'AFFICHE, donc
   * quand `shouldProposeCrashRecovery` a dit oui.
   *
   * `same_activity` (booléen) : la session retrouvée appartient-elle à la
   * discipline en cours ? L'écran distingue déjà les deux cas en copie
   * (`restoreTitle` vs `restoreTitleOtherActivity`, catalogue runGps) — les
   * mélanger ici cacherait le cas le plus déroutant pour le joueur.
   *
   * L'ISSUE N'A PAS D'EVENT NEUF : reprendre est `activity_resumed
   * { from: 'restore' }`, enregistrer est `run_complete`, et jeter est
   * `activity_cancelled`. Trois faits déjà nommés.
   *
   * ⚠ AUCUN ÂGE DE SESSION, AUCUNE DISTANCE DÉJÀ PARCOURUE.
   */
  activityRestoreOffered: 'activity_restore_offered', // props: { same_activity }

  // ══════════════════════════════════════════════════════════════════════════
  // LES ÉCRANS DE CETTE VAGUE QUI N'ONT AUCUN EVENT NEUF, ET POURQUOI
  //
  // · E21 — ACTIVITÉ BIKE ACTIVE. AUCUN event propre, et c'est la décision la
  //   plus importante du bloc. E21 est E20 avec une autre discipline (spec
  //   l.1152 : « Même structure que E20 ») ; toute la chaîne porte déjà
  //   `activity` — `run_start { activity }`, `run_complete`, `claim_result`,
  //   `map_view { activity }`, `route_plan_computed { activity }`. Un
  //   `bike_live_viewed` couperait en deux chaque série de la boucle cœur au
  //   moment précis où le produit a besoin de comparer les deux mondes. « Run et
  //   Bike réutilisent les mêmes composants » (l.1157) vaut aussi pour la mesure.
  //
  // · E20 — OUVERTURE DE L'ÉCRAN DE COURSE. Pas de `activity_live_viewed` :
  //   `run_start` est émis à l'instant exact où cet écran prend la main
  //   (`useRealRunCore.ts:608`), avec la discipline, le mode et la plateforme.
  //   Un second nom au même instant dédoublerait le haut du funnel de course.
  //
  // · E20/E21 — PROJECTION DE FERMETURE DE BOUCLE. Déjà mesurée aux deux bouts :
  //   `loop_almost_closed { missing_m }` (l'activation ratée) et `loop_closed
  //   { enclosed_zones }` (le fait, émis depuis la RÉPONSE serveur). Les trois
  //   bandes d'indication (`LOOP_HINT_DISTANCE_M` → `LOOP_PREVIEW_DISTANCE_M` →
  //   `LOOP_CLOSE_TOLERANCE_M`) sont un AFFICHAGE continu : les mesurer
  //   produirait un event par seconde de course, pour rien.
  //
  // · E22 — DÉFENSE ACTIVE : `defense_run_viewed` et `defense_coverage_reached`
  //   existent (bloc E22 plus haut) et sont RÉELLEMENT émis
  //   (`RealCourseLive.tsx:318` et :328). Rien à ajouter dans cette vague.
  //
  // · E11 — GESTES DE CARTE SANS DÉCISION (double tap = zoom, swipe de la
  //   feuille, long press = point de planification). Aucun n'engage le joueur ni
  //   ne change d'écran ; les mesurer transformerait l'analytics en journal de
  //   gestes, et le zoom est une donnée de localisation déguisée (§12).
  //   L'ouverture de la feuille reste couverte par `screen('map_sheet_open')`.
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // LES ÉCRANS DE LA VAGUE E38-E75 QUI N'ONT AUCUN EVENT, ET POURQUOI
  //
  // · E52 — INVITATION CREW. `invite_sent` existe et est RÉELLEMENT émis (3
  //   sites), `crew_joined { via }` et `invite_accepted` ferment la boucle.
  //   Le carnet de CONTACTS de la spec n'existe toujours nulle part (aucune
  //   permission contacts n'est déclarée dans `apps/mobile/app.json`).
  //   ⚠ CORRECTION DU 28/07/2026 — ce bloc affirmait que « `crew_invites` ne
  //   porte aucune colonne d'expiration ». C'était doublement faux : la table
  //   n'existait pas du tout, et elle existe MAINTENANT
  //   (`supabase/migrations/0090_crew_invite_tokens.sql`), avec `expires_at`
  //   NOT NULL et `revoked_at`. L'EXPIRATION est donc réelle CÔTÉ SERVEUR.
  //   Elle n'a toujours pas d'event, et pour la raison inchangée : AUCUN écran
  //   n'appelle encore `create_crew_invite` / `redeem_crew_invite` (grep,
  //   28/07/2026 : zéro appelant hors tests). L'event viendra AVEC son écran,
  //   comme `crew_outing_created` est venu avec la migration 0085 — un event
  //   émis par personne serait un KPI qui ment par zéro.
  //
  // · E68 — DÉTAIL HISTORIQUE. Il n'existe AUCUNE lecture d'une course par
  //   identifiant (`app/course/[id].tsx` le dit dans son docblock, et l'écran
  //   n'affiche qu'une carte d'état). Sans donnée, il n'y a ni « vide », ni
  //   « échec », ni « prêt » à distinguer : il n'y a qu'une situation. Son event
  //   viendra AVEC sa lecture, pas avant — comme `crew_outing_created` est venu
  //   avec la migration 0085.
  //
  // · E73 — DÉTAIL PRODUIT. La chaîne d'achat est déjà à trois temps
  //   (`paywall_view` → `purchase_initiated` → `purchase_completed`) et E73 n'y
  //   ajoute aucun instant NOUVEAU : l'ouverture de la fiche est un `$screen`,
  //   le tap `ACHETER` est l'intention (`purchase_initiated`, le jour où un rail
  //   d'achat existe), `ÉQUIPER` est déjà `skin_equipped`. Un `product_viewed`
  //   ne dirait rien que `shop_viewed { category }` ne dise déjà — et il ferait
  //   croire à un entonnoir produit là où il n'y a pas de caisse.
  //
  // · E53 — CLASSEMENT JOUEURS : `leaderboard_viewed` EXISTE DÉJÀ (bloc E54
  //   ci-dessus) et couvre l'onglet 'players'. On ne le double pas. ⚠ MAIS il
  //   n'est émis NULLE PART au 28/07/2026 (`grep EVENTS.leaderboardViewed` :
  //   zéro appelant) — c'est à E53 de le câbler, pas à un nouveau nom de le
  //   remplacer. Voir l'inventaire des events non émis en fin de fichier.
  //
  // · E65 — STATISTIQUES PERSONNELLES : `performance_page_viewed` existe et est
  //   RÉELLEMENT émis (app/performance.tsx:566) avec `{ period }`. E65 ajoute
  //   une lentille Run/Bike dont la lecture est bornée par discipline : la
  //   propriété `activity` lui revient, sur l'event EXISTANT. Un second nom
  //   rendrait la série temporelle illisible au moment précis où on ajoute la
  //   dimension.
  //
  // · E74 — PREMIUM : entièrement couvert et CÂBLÉ (`paywall_view`
  //   premium.tsx:69, `purchase_initiated` :78, `purchase_completed` :81 — ce
  //   dernier uniquement sur `result.kind === 'purchased'`, donc sur une
  //   confirmation Store). Rien à ajouter.
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // LES ÉCRANS DE LA VAGUE PRÉCÉDENTE QUI N'ONT AUCUN EVENT, ET POURQUOI
  //
  // · E69 — FLUX D'ACTIVITÉ. La consultation est un `$screen`, et
  //   `notification_opened` mesure déjà l'entrée depuis une notification. Le
  //   « Tout lu » de la spéc n'a AUCUN modèle de lecture derrière lui :
  //   `bell.ts` expose un statut de LECTURE DE DONNÉES ('loading' | 'failed' |
  //   'ready'), jamais un curseur lu/non-lu. Son event viendra AVEC ce curseur,
  //   pas avant.
  //
  // · E70 — ZONE ATTAQUÉE. Déjà couvert des deux côtés : `zone_detail_viewed`
  //   porte `state: 'contested'` pour l'entrée par tap, `notification_opened`
  //   porte le `type` pour l'entrée par notification, et le CTA DÉFENDRE est un
  //   `cta_tapped`. Un troisième event dirait la même chose une troisième fois.
  //
  // · E78 — CONNEXIONS ET APPAREILS. Le Hub ne liste aujourd'hui que les deux
  //   sources réellement utilisables sans action du fondateur (GPS natif,
  //   import GPX) ; les autres sont RETIRÉES de l'écran, pas grisées. Il n'y a
  //   donc ni connexion, ni expiration, ni déconnexion à mesurer — seulement un
  //   import, que `run_complete` porte déjà via sa prop `source`.
  //
  // · E79 — COMPTE, AIDE ET LÉGAL. Navigation et lecture : `$screen` et
  //   `cta_tapped` suffisent. La suppression de compte, elle, est un fait
  //   SERVEUR (grâce de `ACCOUNT_DELETION_GRACE_DAYS`) — la mesurer côté client
  //   compterait des intentions, pas des suppressions.
  // ══════════════════════════════════════════════════════════════════════════

  // L'ÉCRAN DE LA VAGUE PRÉCÉDENTE QUI N'A AUCUN EVENT, ET POURQUOI
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

  // ══════════════════════════════════════════════════════════════════════════
  // LES ÉCRANS CREW DE CETTE VAGUE QUI N'ONT AUCUN EVENT NEUF, ET POURQUOI
  //
  // · E41 — CRÉATION D'UN CREW. `crew_created` existe et est RÉELLEMENT émis
  //   (apps/mobile/src/features/crew/RealCrewScreen.tsx:421, après la réponse
  //   de `create_crew`). La spéc lui ajoute quatre champs — handle, emblème,
  //   couleur, accès — dont TROIS n'ont aucun chemin serveur :
  //   `create_crew(text, smallint, text)` (0050:433) ne prend que nom, couleur
  //   et ville ; `crews.slug` et `crews.tag` (0011) n'ont AUCUNE écriture, et
  //   l'accès n'est modifiable qu'APRÈS coup (`crew_edit`, 0084). Une propriété
  //   `access` sur `crew_created` mesurerait donc un choix que l'écran ne peut
  //   pas offrir — une colonne constante qui ferait croire à une décision.
  //
  // · E48 — ACTIVITÉ ET ANNONCES CREW. ⚠ CE BLOC A ÉTÉ RÉÉCRIT LE 28/07/2026 :
  //   il affirmait que les annonces épinglées n'avaient AUCUNE table. C'était
  //   vrai le matin, ce ne l'est plus — la migration 0096 crée
  //   `crew_announcements` et son unique chemin d'écriture
  //   (`crew_announcement_post`). Laisser le constat périmé aurait été la même
  //   faute à l'envers : une doc qui dit « ça n'existe pas » d'une chose livrée.
  //   État RÉEL des quatre sections :
  //     · annonces épinglées   → chemin d'écriture RÉEL (0096) →
  //       `crew_announcement_posted` ci-dessus, émis après un `ok` serveur ;
  //     · propositions de sortie → `crew_outing_created` (0085), inchangé ;
  //     · captures et défenses  → LECTURE d'un fait déjà mesuré à la source
  //       (`claim_result`, `loop_closed`). Rien à mesurer en plus ;
  //     · demandes d'aide       → toujours SANS chemin d'écriture propre
  //       (`crew_requests`, 0019, INSERT révoqué 0019:167, aucune RPC). L'écran
  //       rend les PINGS (`crew_signal_sent` les mesure déjà).
  //   Aucun `crew_activity_viewed { section }` n'est ajouté pour autant : il
  //   compterait surtout des sections vides, et l'ouverture de l'écran est déjà
  //   portée par `screen`.
  //
  // · E43 §« objectif du jour » — c'est la mission, couverte par
  //   `crew_mission_shown`. Un second nom pour le même bloc rendu au même
  //   instant dédoublerait la série.
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTAIRE — LES EVENTS DÉFINIS QUE PERSONNE N'ÉMET (relevé du 28/07/2026)
  //
  // Ce fichier répète depuis le 27/07 sa règle n°1 : « aucun event sans point
  // d'émission RÉEL ». Elle n'a jamais été VÉRIFIÉE. Un grep
  // `EVENTS.<nom>` sur `apps/` et `supabase/` en trouve huit à zéro appelant.
  // Les nommer coûte trois minutes et évite la faute que la règle vise :
  // croire mesurer ce qu'on ne mesure pas. Aucun n'est SUPPRIMÉ ici — six ont
  // un consommateur légitime en attente, deux sont serveur.
  //
  //   · leaderboard_viewed        → E53/E54. Défini pour la vague E54, jamais
  //                                 câblé : `app/(tabs)/classement.tsx` n'émet
  //                                 que `screen('classement')`. À CÂBLER par E53.
  //   · subscription_started      → dépendent d'un webhook RevenueCat
  //   · subscription_renewed        (`supabase/functions/rc_webhook`) qui ne
  //   · subscription_cancelled      pousse rien vers PostHog. Ce sont des faits
  //                                 SERVEUR : les émettre côté client
  //                                 inventerait des renouvellements que l'app
  //                                 n'observe pas.
  //   · record_shared             → aucun partage de record n'existe côté
  //                                 Performance (E65) ; `share_completed` porte
  //                                 déjà les partages qui, eux, ont lieu.
  //   · performance_bonus_applied → le bonus de performance est calculé
  //                                 SERVEUR (ingest_run) ; le client ne le voit
  //                                 pas s'appliquer.
  //   · crew_home_viewed          → POSÉS LE 28/07/2026 POUR LES QUATRE AGENTS
  //   · crew_mission_shown          D'ÉCRAN DE LA MÊME VAGUE (E38/E42-E48), qui
  //                                 les câblent dans le même lot. Ils sont
  //                                 inscrits ICI dès leur naissance, et non
  //                                 après coup : si la vague se termine sans
  //                                 émetteur, ils tombent sous la règle
  //                                 ci-dessous comme les autres. Aucun n'a de
  //                                 dérogation.
  //     ⚠ `crew_member_action` A QUITTÉ CETTE LISTE le 28/07/2026 : il est
  //     RÉELLEMENT émis par `features/crew/PlayerModerationSheet.tsx`, à
  //     l'issue de chaque geste E47 (signalement, blocage, déblocage, et les
  //     quatre gestes de rôle venus avec la migration 0093). Il ne bénéficie
  //     d'aucune indulgence — il a simplement trouvé son appelant.
  //
  //   · map_view                  → POSÉS LE 28/07/2026 POUR LES QUATRE AGENTS
  //   · map_zone_tap                D'ÉCRAN DE LA VAGUE E11/E12/E18/E20/E21/
  //   · map_recommendation_shown    E23/E24, qui les câblent dans le même lot.
  //   · map_recenter                Inscrits ICI dès leur naissance, comme
  //   · activity_switch             `crew_home_viewed` avant eux : si la vague
  //   · map_layers_opened           se termine sans émetteur, ils tombent sous
  //   · map_layer_toggled           la règle ci-dessous. Aucune dérogation.
  //   · route_plan_computed         Point d'émission NOMMÉ pour chacun dans son
  //   · activity_screen_locked      propre docblock — c'est la condition pour
  //   · activity_paused             qu'ils aient le droit d'exister.
  //   · activity_cancelled
  //   · activity_interrupted
  //   · activity_restore_offered
  //
  // RÈGLE POUR LA SUITE : un event qui reste ici sans appelant à la vague
  // suivante se supprime ou se câble. Le laisser indéfiniment redonne au
  // fichier l'apparence d'une mesure qui n'a jamais eu lieu.
  // ══════════════════════════════════════════════════════════════════════════
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
