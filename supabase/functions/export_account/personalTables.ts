/**
 * GRYD — LA LISTE DES TABLES QUE L'EXPORT RGPD DOIT LIRE (art. 15 + art. 20).
 *
 * ═══ LE DÉFAUT QUE CE MODULE CORRIGE (10/09/2026) ═══════════════════════════
 * `export_account/index.ts` portait une liste FIGÉE au monde d'avant la refonte
 * 2026 : `runs`, `hex_claims`, `season_scores`… et PAS UNE SEULE des tables
 * `*_2026`. Depuis 0118-0127, c'est pourtant là que vivent les données du
 * joueur : ses sessions d'enregistrement, ses captures (géométrie !), ses
 * territoires, son XP, ses achats, ses publications, ses commentaires, ses
 * signalements, ses blocages, ses messages de crew. Un export « complet » qui
 * n'en rendait aucun n'était pas une copie partielle : c'était une réponse
 * fausse à une demande d'accès.
 *
 * ═══ POURQUOI UNE LISTE DANS UN MODULE À PART ══════════════════════════════
 * Pour qu'un test puisse la CONFRONTER aux migrations sans démarrer la
 * fonction. `personalTables_test.ts` relit `supabase/migrations/*.sql` et exige
 * ici toute table porteuse d'une colonne d'identité qui est SOIT suffixée
 * `_2026`, SOIT écrite par une migration de la refonte (≥ 0118). La liste ne
 * peut donc plus prendre du retard en silence sur le schéma : la prochaine
 * table oubliée fera rougir le gate.
 *
 * ⚠️ LE SUFFIXE NE SUFFISAIT PAS, ET ÇA S'EST VU LE JOUR MÊME (10/09/2026,
 * soir). La première version de ce test ne cherchait que `*_2026`. Le lot L
 * (0160-0164) a publié le classement de commune en RÉUTILISANT les tables de
 * 0082 — `leaderboard_snapshots`, `leaderboard_entries` — qui ne portent pas ce
 * suffixe : mon rang, ma surface prise et ma surface tenue dans ma commune
 * étaient hors export quelques heures après que la règle a été écrite. Le nom
 * d'une table ne dit pas qui l'écrit ; seuls ses écrivains le disent.
 *
 * ═══ CE QUI N'Y EST PAS, ET POURQUOI ════════════════════════════════════════
 * · Les lignes où le joueur est la CIBLE et non l'auteur — `social_blocks_2026`
 *   filtré sur `target_id`, `challenge_identity_blocks_2026` sur
 *   `blocked_user_id`. Les rendre, ce serait livrer « voici qui t'a bloqué » :
 *   un export deviendrait un outil de représailles. Le droit d'accès ne va pas
 *   jusqu'à désigner l'auteur d'une mesure de protection prise contre soi.
 * · Les tables de RÈGLES (`challenge_rules_2026`, `season_collections_2026`,
 *   `commercial_collections_2026`…) : elles ne portent aucune donnée
 *   personnelle, ce sont les paramètres du jeu.
 */

/** Une table à copier : sa clé de sortie, sa table, sa colonne d'identité. */
export interface PersonalTable {
  /** Clé dans le JSON exporté (camelCase, lisible par un humain). */
  readonly key: string;
  readonly table: string;
  /** Colonne qui porte l'identité du DEMANDEUR (jamais celle d'un tiers). */
  readonly column: string;
  /** `true` quand la table a au plus une ligne par compte. */
  readonly single?: boolean;
  /**
   * Égalités SUPPLÉMENTAIRES, pour les tables POLYMORPHES.
   *
   * `leaderboard_entries.subject_id` désigne un joueur OU un crew selon
   * `subject_type` (0082 : « aucune clé étrangère, deux tables cibles »).
   * Filtrer sur le seul identifiant reviendrait à parier qu'aucun `crews.id` ne
   * vaut un `users.id` : improbable n'est pas impossible, et un export qui
   * livrerait la ligne d'un tiers serait une fuite, pas une imprécision.
   */
  readonly also?: Readonly<Record<string, string>>;
}

/**
 * Tables porteuses de données perso + colonne utilisateur.
 *
 * ⚠️ ORDRE ET NOMS SONT DE LA DOCUMENTATION : le JSON exporté est lu par un
 * humain (et parfois par une autorité). On garde le legacy d'abord, puis la
 * refonte 2026 par domaine, chaque bloc annoté par ce qu'il contient vraiment.
 */
export const PERSONAL_TABLES: readonly PersonalTable[] = [
  // ── Compte et monde legacy (antérieur à la refonte 2026) ──────────────────
  { key: 'profile', table: 'users', column: 'id', single: true },
  { key: 'socialProfile', table: 'user_profiles', column: 'user_id', single: true },
  { key: 'stats', table: 'user_stats', column: 'user_id', single: true },
  { key: 'runs', table: 'runs', column: 'user_id' },
  { key: 'hexClaims', table: 'hex_claims', column: 'owner_user_id' },
  { key: 'seasonScores', table: 'season_scores', column: 'user_id' },
  { key: 'badges', table: 'user_badges', column: 'user_id' },
  { key: 'inventory', table: 'user_inventory', column: 'user_id' },
  { key: 'purchases', table: 'purchases', column: 'user_id' },
  { key: 'crewMemberships', table: 'crew_members', column: 'user_id' },
  { key: 'privacyZones', table: 'privacy_zones', column: 'user_id' },
  { key: 'missionProgress', table: 'mission_progress', column: 'user_id' },
  { key: 'notifications', table: 'notifications', column: 'user_id' },
  { key: 'importedActivities', table: 'imported_activities', column: 'user_id' },
  // Droit d'accès : l'utilisateur doit aussi récupérer ses actions de MODÉRATION
  // (signalements émis, pseudos bloqués) — ce sont ses données personnelles au
  // même titre que ses courses. Cf. 0029_moderation.sql.
  { key: 'contentReports', table: 'content_reports', column: 'reporter_id' },
  { key: 'blockedPseudos', table: 'user_blocks', column: 'blocker_id' },

  // ── TABLES LEGACY QUE LA REFONTE ÉCRIT ENCORE ─────────────────────────────
  // Elles n'ont pas le suffixe `_2026` et sont donc passées entre les mailles de
  // la première version de cette liste (10/09/2026, matin), qui ne cherchait que
  // ce suffixe. Le nom d'une table ne dit pas qui l'écrit : le test lit
  // désormais aussi les INSERT/UPDATE des migrations de la refonte.
  //   · `feature_entitlements` (0026) : 0129 y écrit les droits premium tirés
  //     d'un reçu App Store / Play. C'est ce qu'un joueur a PAYÉ.
  //   · `leaderboard_entries` (0082) : depuis 0162, chaque snapshot horaire y
  //     inscrit mon rang, ma surface prise et ma surface tenue dans MA commune.
  //     Un rang est une phrase publique sur une personne (0164) — donc une
  //     donnée personnelle, et l'une des rares que d'autres ont pu voir.
  //   · `leaderboard_snapshots` (0082) : `audience_user_id` désigne la personne
  //     POUR QUI un classement d'amis a été calculé. Le lot L n'en produit pas
  //     encore (il écrit `null` pour la commune) : l'entrée rendra donc `[]`
  //     aujourd'hui, et sera juste le jour où un classement d'amis existera.
  //     Une liste d'export ne doit pas attendre que la fuite soit possible.
  { key: 'featureEntitlements', table: 'feature_entitlements', column: 'user_id' },
  {
    key: 'leaderboardEntries',
    table: 'leaderboard_entries',
    column: 'subject_id',
    also: { subject_type: 'user' },
  },
  { key: 'leaderboardAudience', table: 'leaderboard_snapshots', column: 'audience_user_id' },

  // ── 2026 · enregistrement, captures et territoire (0118) ──────────────────
  // `capture_events_2026` porte la GÉOMÉTRIE de chaque capture : c'est la donnée
  // de localisation la plus sensible de la base. Elle DOIT figurer dans une
  // demande d'accès.
  { key: 'recordingSessions2026', table: 'recording_sessions_2026', column: 'user_id' },
  { key: 'captureEvents2026', table: 'capture_events_2026', column: 'owner_id' },
  { key: 'ownership2026', table: 'ownership_2026', column: 'owner_id' },

  // ── 2026 · progression (0119, 0121) ───────────────────────────────────────
  { key: 'progressAccount2026', table: 'progress_accounts_2026', column: 'user_id', single: true },
  { key: 'progressActivity2026', table: 'progress_activity_2026', column: 'user_id' },
  { key: 'progressCorrections2026', table: 'progress_corrections_2026', column: 'user_id' },
  { key: 'progressTimezoneChanges2026', table: 'progress_timezone_changes_2026', column: 'user_id' },
  { key: 'progressCollectionSelections2026', table: 'progress_collection_selections_2026', column: 'user_id' },

  // ── 2026 · saison et récompenses (0121, 0144) ────────────────────────────
  { key: 'seasonCollectionEnrollments2026', table: 'season_collection_enrollments_2026', column: 'user_id' },
  { key: 'seasonRewardOwnership2026', table: 'season_reward_ownership_2026', column: 'user_id' },
  { key: 'seasonRewardEquipment2026', table: 'season_reward_equipment_2026', column: 'user_id' },
  { key: 'levelRewardOwnership2026', table: 'level_reward_ownership_2026', column: 'user_id' },
  { key: 'levelRewardEquipment2026', table: 'level_reward_equipment_2026', column: 'user_id' },
  // `profile_cosmetics_2026` (0180) : ce que le joueur PORTE sur son profil.
  // Sept lignes au plus, aucune date d'activité, aucune localité — mais ce sont
  // des choix qu'il a faits, donc ils lui appartiennent et partent dans son
  // export. La table de MODÈLES (`profile_cosmetic_items_2026`) n'y va pas :
  // c'est un catalogue, il ne décrit personne.
  { key: 'profileCosmetics2026', table: 'profile_cosmetics_2026', column: 'user_id' },

  // ── 2026 · achats (0120, 0125) ────────────────────────────────────────────
  { key: 'premiumEntitlements2026', table: 'premium_entitlements_2026', column: 'user_id' },
  { key: 'premiumReceipts2026', table: 'premium_receipts_2026', column: 'user_id' },
  { key: 'commercialOwnership2026', table: 'commercial_ownership_2026', column: 'user_id' },
  { key: 'commercialReceipts2026', table: 'commercial_receipts_2026', column: 'user_id' },
  { key: 'commercialEquipment2026', table: 'commercial_equipment_2026', column: 'user_id' },

  // ── 2026 · défis de crew (0122) ───────────────────────────────────────────
  // `player_id` VAUT `auth.uid()` (0122 §join : `values(..., auth.uid(), auth.uid(), ...)`)
  // — ce n'est pas un pseudonyme, le filtre est donc exact.
  { key: 'challengesCreated2026', table: 'crew_challenges_2026', column: 'created_by' },
  { key: 'challengeRoster2026', table: 'challenge_roster_2026', column: 'user_id' },
  { key: 'challengePreferences2026', table: 'challenge_preferences_2026', column: 'player_id' },
  { key: 'challengeContributions2026', table: 'challenge_contributions_2026', column: 'player_id' },
  { key: 'challengeIdentityBlocks2026', table: 'challenge_identity_blocks_2026', column: 'blocker_id' },

  // ── 2026 · quêtes hebdomadaires (0166, 0167) ──────────────────────────────
  // `weekly_quest_faces_2026` porte une LOCALITÉ (carreau ~1,1 km) et un
  // horodatage par boucle fermée : c'est une donnée de localisation, elle
  // appartient à la demande d'accès au même titre qu'une capture.
  { key: 'weeklyQuestFaces2026', table: 'weekly_quest_faces_2026', column: 'owner_id' },
  { key: 'weeklyQuestAssignments2026', table: 'weekly_quest_assignments_2026', column: 'user_id' },
  { key: 'weeklyQuestRewardOwnership2026', table: 'weekly_quest_reward_ownership_2026', column: 'user_id' },
  { key: 'weeklyQuestRewardEquipment2026', table: 'weekly_quest_reward_equipment_2026', column: 'user_id' },

  // ── 2026 · social et modération (0124, 0127) ──────────────────────────────
  { key: 'socialPosts2026', table: 'social_posts_2026', column: 'author_id' },
  { key: 'socialComments2026', table: 'social_comments_2026', column: 'author_id' },
  { key: 'socialReactions2026', table: 'social_reactions_2026', column: 'user_id' },
  { key: 'socialReports2026', table: 'social_reports_2026', column: 'reporter_id' },
  { key: 'socialBlocks2026', table: 'social_blocks_2026', column: 'owner_id' },
  { key: 'crewMessages2026', table: 'crew_messages_2026', column: 'author_id' },
  { key: 'crewMessageReports2026', table: 'crew_message_reports_2026', column: 'reporter_id' },

  // ── 2026 · historique du @pseudo (0175) ───────────────────────────────────
  // L'HISTORIQUE D'UN PSEUDO EST UNE DONNÉE PERSONNELLE, et l'une des plus
  // parlantes : il dit sous quels noms cette personne s'est présentée, et
  // quand. Le lui rendre est le minimum d'une demande d'accès (art. 15), et
  // c'est aussi le seul moyen pour elle de vérifier le décompte qu'on lui
  // oppose (« il te reste 1 changement »).
  //
  // `handle_holds_2026` suit, bien que le test de couverture ne l'EXIGE pas :
  // sa colonne d'identité s'appelle `held_for`, un nom que le détecteur ne
  // connaissait pas. Elle porte pourtant, en clair, un pseudo que cette
  // personne a porté et qui lui reste réservé. L'ajouter au détecteur ferme le
  // trou pour de bon ; l'exporter ferme le trou pour elle, tout de suite.
  { key: 'handleChanges2026', table: 'handle_changes_2026', column: 'user_id' },
  { key: 'handleHolds2026', table: 'handle_holds_2026', column: 'held_for' },

  // ── 2026 · notifications (0140, 0141) ─────────────────────────────────────
  // Les RÉGLAGES sont un choix explicite du joueur : les lui rendre est le
  // minimum d'une demande d'accès. Le JOURNAL, lui, dit ce que GRYD lui a
  // envoyé et quand — c'est-à-dire ce que nous savons de nos propres
  // sollicitations à son égard. Le taire reviendrait à garder pour nous la
  // seule preuve du budget qu'on lui promet dans les réglages.
  { key: 'notificationPreferences2026', table: 'notification_preferences_2026', column: 'user_id', single: true },
  { key: 'notificationLog2026', table: 'notification_log_2026', column: 'user_id' },

  // ── 2026 · habilitation de modération (0187) ──────────────────────────────
  // « Vous êtes modérateur depuis telle date, pour tel motif » est une donnée
  // personnelle du titulaire, et l'une des rares qui décrivent un POUVOIR qu'on
  // lui a donné : la taire dans une demande d'accès serait le pire endroit où
  // faire une exception. Le JOURNAL des décisions
  // (`anticheat_review_journal_2026`) n'est PAS exporté et ne doit pas l'être :
  // filtré sur `moderator_id`, il livrerait les dossiers d'AUTRES joueurs — la
  // même faute que « qui t'a bloqué », dans l'autre sens.
  { key: 'moderatorGrant2026', table: 'moderators_2026', column: 'user_id', single: true },

  // ── 2026 · parrainage (0184, 0185, 0186) ──────────────────────────────────
  // Le code est une donnée personnelle ordinaire : il DÉSIGNE le compte, et son
  // titulaire a le droit de le récupérer. Les octrois, le bonus d'XP et le
  // crédit GRYD+ disent ce que GRYD lui a donné, quand, et pourquoi — c'est
  // exactement ce qu'une demande d'accès réclame.
  //
  // LE LIEN EST FILTRÉ SUR `referee_id`, ET SUR LUI SEUL. C'est le filleul qui
  // ÉCRIT la ligne (`redeem_referral_code_2026` s'exécute sous son `auth.uid()`)
  // : c'est donc SA donnée, au même titre que `friendships.requester_id` est
  // celle du demandeur et jamais celle de l'autre. Le parrain, lui, retrouve ce
  // que GRYD lui a donné dans `referral_grants_2026` (une ligne par octroi,
  // avec son `link_id` et son côté) — sans que l'export ne lui livre pour autant
  // l'identifiant des comptes qu'il a parrainés.
  // Ni `referrer_id` ni `referee_id` ne sont dans l'`IDENTITY_COLUMNS` du
  // détecteur : cette ligne est VOLONTAIRE, pas arrachée par un test rouge —
  // élargir le détecteur aurait élargi la règle pour tout le dépôt.
  //
  // `referral_codes_2026` n'est PAS marquée `single` bien qu'elle n'ait qu'une
  // ligne par compte : la liste des tables `single` est figée par
  // `personalTables_test.ts`, et une liste d'un élément ne dit rien de faux.
  { key: 'referralCode2026', table: 'referral_codes_2026', column: 'user_id' },
  { key: 'referralAsReferee2026', table: 'referral_links_2026', column: 'referee_id' },
  { key: 'referralGrants2026', table: 'referral_grants_2026', column: 'user_id' },
  { key: 'referralXpBonus2026', table: 'referral_xp_bonus_2026', column: 'user_id' },
  { key: 'referralGrydPlusCredits2026', table: 'referral_gryd_plus_credits_2026', column: 'user_id' },

  // --- Reprises de l'audit de securite du 10/09 (refonte-2026-09 @ 6e98ecb) : tables du socle
  // legacy portant une colonne d'identite, absentes de la premiere liste. Une purge ou un export
  // qui les tairait rendrait le droit d'acces incomplet sans le dire (RGPD art. 15).
  { key: 'crewOutingsHosted2026', table: 'crew_events', column: 'created_by' },
  { key: 'crewOutingRsvps2026', table: 'crew_event_rsvps', column: 'user_id' },
  { key: 'antiCheatReviews', table: 'anticheat_reviews', column: 'user_id' },
  { key: 'antiCheatAppeals', table: 'anticheat_appeals', column: 'user_id' },
  { key: 'pushDevices', table: 'push_devices', column: 'user_id' },
  { key: 'pushLog', table: 'push_log', column: 'user_id' },
  { key: 'friendshipsRequested', table: 'friendships', column: 'requester_id' },
  { key: 'following', table: 'follows', column: 'follower_id' },
  { key: 'duelsStarted', table: 'duels', column: 'challenger_id' },
  { key: 'referralsSent', table: 'referrals', column: 'referrer_id' },
  { key: 'routes', table: 'routes', column: 'user_id' },
  { key: 'routePreferences', table: 'route_preferences', column: 'user_id' },
  { key: 'outposts', table: 'outposts', column: 'user_id' },
  { key: 'shields', table: 'shields', column: 'user_id' },
  { key: 'streakGels', table: 'streak_gels', column: 'user_id' },
  { key: 'scoutPings', table: 'scout_pings', column: 'user_id' },
  { key: 'attackAlerts', table: 'attack_alerts', column: 'user_id' },
  { key: 'itemUsage', table: 'item_usage_logs', column: 'user_id' },
  { key: 'dailyZoneAwards', table: 'daily_zone_awards', column: 'user_id' },
  { key: 'bonusClaims', table: 'player_bonus_claims', column: 'user_id' },
  { key: 'coCaptures', table: 'hex_co_captures', column: 'user_id' },
  { key: 'boundaryContributions', table: 'boundary_contributions', column: 'user_id' },
  { key: 'partialBoundariesOpened', table: 'partial_boundaries', column: 'opener_user_id' },
  { key: 'offensiveContributions', table: 'offensive_contributions', column: 'user_id' },
  { key: 'crewMessagesLegacy', table: 'crew_messages', column: 'author_id' },
  { key: 'crewApplications', table: 'crew_applications', column: 'user_id' },
  { key: 'crewRequests', table: 'crew_requests', column: 'requester_id' },
  { key: 'crewChestContributions', table: 'crew_chest_contributions', column: 'user_id' },
  { key: 'crewGiftsOffered', table: 'crew_gifts', column: 'offered_by_user_id' },
  { key: 'crewGiftClaims', table: 'crew_gift_claims', column: 'user_id' },
  { key: 'crewXpDaily', table: 'crew_xp_daily', column: 'user_id' },
  { key: 'crewFeedActions', table: 'crew_feed_events', column: 'actor_id' },
  { key: 'sectorsOwnedSolo', table: 'sector_snapshot', column: 'owner_user_id' },
];
