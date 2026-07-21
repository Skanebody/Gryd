/**
 * GRYD — Types partagés : contrats client ↔ Edge Functions.
 * Le client n'attribue JAMAIS un hex : il envoie des points, le serveur décide.
 */
import type { CityId } from './game-rules';

/**
 * Provenance DÉCLARÉE de la trace envoyée à ingest_run. Elle est PERSISTÉE telle
 * quelle sur `runs.source` : jamais de re-étiquetage confortable (« l'app ne
 * ment jamais »). Le serveur reste seul juge du claim quelle que soit la source.
 *  - `gps`       : capture directe GRYD Live (tracker natif) ;
 *  - `healthkit` : import santé OS (Apple Health / Health Connect) ;
 *  - `gpx`       : fichier .gpx choisi par l'utilisateur et parsé sur l'appareil
 *                  (features/sources/adapters/gpx.ts) — comme `healthkit`, les
 *                  points n'ont PAS d'accuracy horizontale (le GPX n'en porte
 *                  pas), donc aucun gpsTrust client n'est envoyé et le serveur
 *                  calcule le sien.
 */
export type RunSource = 'gps' | 'healthkit' | 'gpx';

/**
 * Mode de course choisi au départ (AMENDEMENT-07 §2, social §10). `race_mode`
 * et `event_run` sont catalogués mais DÉSACTIVÉS (V1) : ingest_run les traite
 * comme `conquete` en MVP. Défaut `conquete` si absent de la requête.
 */
export type RunMode =
  | 'conquete' // capture normale + règles run groupé
  | 'social_run' // stats + badges + XP perso, capture désactivée (hexes → stats_only)
  | 'course_privee' // stats perso uniquement, aucun claim, aucun partage, aucun feed
  | 'race_mode' // V1 (désactivé)
  | 'event_run'; // V1 (désactivé)

/** Profil motivationnel (AMENDEMENT-07 §1, motivation §2-§4). Filtrage UI/notifs, pas de gameplay. */
export type PlayStyle = 'focus_solo' | 'mixte' | 'crew_war';

/** Visibilité du profil (AMENDEMENT-07 §1, motivation §4/§34). */
export type ProfileVisibility = 'private' | 'friends' | 'crew' | 'public';
/** Partage d'activité (AMENDEMENT-07 §1). */
export type ActivitySharing = 'private' | 'friends' | 'crew' | 'stats_only';
/** Partage de carte/traces (AMENDEMENT-07 §1). Défaut simplified, jamais de position live. */
export type MapSharing = 'precise' | 'simplified' | 'territory_only' | 'none';

/**
 * Statut social d'un hex touché par une course (AMENDEMENT-07 §3, social §13).
 *  - `stats_only` : traversé sans claim (social_run/course_privee, ou anti-collusion) ;
 *  - `contested`  : revendiqué par ≥ 2 crews dans la fenêtre → résolution pondérée ;
 *  - `defended`   : re-parcouru par son propriétaire lors d'un run groupé ;
 *  - `neutralized`: égalité de contribution entre crews → reste neutre/contesté, jamais volé.
 */
export type HexSocialStatus = 'contested' | 'defended' | 'neutralized' | 'stats_only';
/** `partial` (AMENDEMENT-02 §4) : segments douteux exclus, le reste claim. */
export type RunStatus = 'valid' | 'partial' | 'rejected' | 'flagged';

export type RejectReason =
  | 'too_short' // < RUN_MIN_DISTANCE_M
  | 'too_brief' // < RUN_MIN_DURATION_S
  | 'pace_too_fast' // allure moyenne < RUN_AVG_PACE_MIN_S_KM (anti-vélo)
  | 'pace_too_slow' // allure moyenne > RUN_AVG_PACE_MAX_S_KM
  | 'too_far' // > RUN_MAX_DISTANCE_M (plafond anti-abus/forge)
  | 'no_valid_points'; // tous les points filtrés

/** Un point GPS brut envoyé par le client (ou issu d'une route HealthKit). */
export interface RunPoint {
  lat: number;
  lng: number;
  /** Timestamp epoch ms. */
  t: number;
  /** Précision horizontale en mètres (absente pour HealthKit → considérée bonne). */
  acc?: number;
}

/** Requête d'ingestion — idempotente par (user, clientRunId). */
export interface IngestRunRequest {
  /** UUID généré côté client AVANT la course : clé d'idempotence (retry offline safe). */
  clientRunId: string;
  source: RunSource;
  /** Ville de rattachement déclarée (classements) — la capture n'y est PAS bornée (France entière, AMENDEMENT-02 §2). */
  cityId?: CityId;
  startedAt: string; // ISO 8601
  points: RunPoint[];
  /** Nombre de pas mesuré sur la période (podomètre/HealthKit) — signal GRYD Verify optionnel. */
  stepCount?: number;
  /**
   * GPS Trust client 0-100 (AMENDEMENT-15 §1) : score du moteur gps.ts calculé
   * sur la trace BRUTE (accuracy moyenne, pertes de signal, ratio d'outliers —
   * compteurs perdus après décimation, le serveur ne peut pas le recalculer).
   * Signal INDICATIF : le serveur le borne par min() avec son propre calcul et
   * reste SEUL juge du claim (§3.2).
   */
  gpsTrust?: number;
  /** Le joueur a partagé le résultat de cette course (badge First Share, AMENDEMENT-06 §1). */
  shared?: boolean;
  /** sha-256 de la polyline arrondie (dédup Activity Hub §4) — calculé serveur si absent. */
  polylineHash?: string;
  /** Mode de course (AMENDEMENT-07 §2) — défaut `conquete` si absent. */
  runMode?: RunMode;
  /**
   * Mode facile choisi au départ (AMENDEMENT-07 §6) : course SANS objectif de
   * vitesse (badges Easy Run / Recovery Run). Défaut false. Signal client, jamais
   * déduit du gameplay — la récup se choisit, elle n'est ni imposée ni jugée.
   */
  easyMode?: boolean;
}

/** Avancement d'un challenge renvoyé après une course (AMENDEMENT-07 §5). */
export interface ChallengeUpdate {
  challengeId: string;
  /** Sujet : le joueur (`user`) ou son crew (`crew`). */
  kind: 'user' | 'crew';
  name: string;
  /** Valeur courante sur la métrique de l'objectif. */
  progress: number;
  target: number;
  /** Objectif atteint (juste franchi ou déjà fait). */
  done: boolean;
}

/** Résultat d'un claim par hexagone, décidé serveur. */
export type HexOutcome =
  | 'claimed_neutral' // +POINTS_NEUTRAL_HEX (+ pionnier éventuel)
  | 'stolen' // +POINTS_STOLEN_HEX
  | 'defended' // +POINTS_DEFENDED_HEX (max 1×/24 h/hex)
  | 'blocked_lock' // lock 24 h d'un autre joueur
  | 'blocked_fresh_protection' // capture fraîche d'autrui (< FRESH_CAPTURE_PROTECT_HOURS), anti-harcèlement
  | 'blocked_shield' // bouclier actif
  | 'blocked_new_player' // protection compte < 14 j
  | 'blocked_privacy' // zone privée (aucune donnée rendue)
  | 'blocked_no_capture_zone' // zone non capturable (autoroute, zone militaire…)
  | 'blocked_daily_cap' // > MAX_CLAIMS_PER_DAY
  | 'already_owned_cooldown' // déjà à moi, défendu il y a < 24 h
  // AMENDEMENT-41 (LE RELAIS) : co-coureur d'une capture fraîche d'autrui.
  | 'co_captured' // payé 1/rang de la valeur de l'hex (loi harmonique) — n'écrit JAMAIS lock/decay/owner
  | 'co_captured_cooldown'; // relais déjà crédité sur cet hex < DEFEND_COOLDOWN_HOURS → 0 pt (anti-farm)

export interface HexClaimResult {
  /** Index H3 res 10 en représentation string (converti en BIGINT en DB). */
  h3: string;
  outcome: HexOutcome;
  points: number;
  pioneer: boolean;
}

/** Payload de célébration renvoyé au client (< 3 s après la fin de course). */
export interface IngestRunResponse {
  runId: string;
  status: RunStatus;
  rejectReason?: RejectReason;
  /** True si la réponse vient d'un traitement antérieur (retry idempotent). */
  replayed: boolean;
  distanceM: number;
  durationS: number;
  avgPaceSKm: number;
  hexes: {
    claimed: number;
    stolen: number;
    defended: number;
    pioneer: number;
    blocked: number;
    /** A-41 (LE RELAIS) : zones co-courues payées 1/rang. Absent = 0. */
    coCaptured?: number;
  };
  pointsAwarded: number;
  fouleesAwarded: number;
  xpAwarded: number;
  /** Série APPLIQUÉE au score : semaines validées AVANT cette course (§3.4). */
  streak: { weeks: number; multiplier: number };
  /**
   * LOT 1 « LA SÉRIE VISIBLE » — état de la série APRÈS cette course, pour
   * l'écran de résultat. Absent quand le serveur n'a rien de fiable à dire
   * (l'app n'affiche alors rien, jamais un « 0 »). `status` suit
   * `engine/streak.StreakStatus` ; `weeksBefore` permet de détecter la semaine
   * qui vient d'être validée par CETTE course.
   */
  streakAfter?: {
    status: 'none' | 'building' | 'active' | 'atRisk' | 'frozen' | 'broken';
    weeks: number;
    /** Multiplicateur correspondant — calculé SERVEUR, jamais recalculé côté app. */
    multiplier: number;
    weeksBefore: number;
    runsThisWeek: number;
    runsToValidate: number;
    best: number;
    frozen: boolean;
  };
  results: HexClaimResult[];
  /** Badges débloqués par cette course (keys du catalogue badges.ts, AMENDEMENT-04 §5). */
  newBadges: string[];
  /** XP crew créditée par cette course (après cap quotidien §34.1). Absent si sans crew. */
  crewXp?: number;
  /** Montée de niveau crew déclenchée par cette course (§34.3). Absent si aucune. */
  crewLevelUp?: { from: number; to: number };
  /** Mode de course appliqué (AMENDEMENT-07 §2) — écho du runMode (défaut conquete). */
  runMode?: RunMode;
  /**
   * Hexes passés en `contested` par cette course (AMENDEMENT-07 §3, approx MVP :
   * 2ᵉ ingest d'un autre crew dans la fenêtre de lock d'un hex fraîchement claimé).
   * Absent/vide si aucun. Le résumé de course les explicite (social §13).
   */
  contestedHexes?: string[];
  /**
   * Challenges actifs du joueur et de son crew mis à jour par cette course
   * (AMENDEMENT-07 §5). Absent/vide si aucun challenge actif concerné. Sert au
   * feedback sain (« à 1 run de ton objectif », jamais culpabilisant §12).
   */
  challengeUpdates?: ChallengeUpdate[];
  /**
   * AMENDEMENT-12 §B « la boucle fait la zone », durci AMENDEMENT-16 §2 : true
   * si la trace claimable a fermé une boucle par l'UN des 2 modes MVP (décidé
   * serveur, detectLoop) — retour à ≤ LOOP_CLOSE_TOLERANCE_M (80 m) du départ,
   * OU AUTO-INTERSECTION (le tracé se recroise → la partie fermée fait la
   * boucle, un 8 = la plus grande boucle). Toujours présent en mode conquête ;
   * absent hors conquête (social_run/course_privee : jamais de claims, boucle
   * ou pas) et sur les courses rejetées/gelées. Reste true quand l'intérieur
   * est plafonné (capReached) ou refusé (loopRejectedReason).
   */
  loopClosed?: boolean;
  /**
   * Zones INTÉRIEURES gagnées grâce à la boucle fermée (claimed_neutral +
   * stolen, DÉJÀ comptées dans `hexes`/`results` — pas un total séparé).
   * Alimente le « dont N en boucle fermée » du post-run et le burst Live Run
   * (AMENDEMENT-12 §C). 0 si boucle ouverte ou intérieur entièrement bloqué.
   */
  enclosedZones?: number;
  /**
   * AMENDEMENT-16 §2 anti-abus « boucle trop grande » : présent (true) quand
   * l'intérieur de la boucle a été TRONQUÉ au plafond d'aire par distance
   * courue (LOOP_MAX_AREA_BY_DISTANCE_KM2, interpolation linéaire) — seules
   * les cellules les plus PROCHES du tracé sont conservées (tri enclosedCells).
   * Copy UI gelée : « Boucle validée. Capture plafonnée : seuls les secteurs
   * proches du tracé sont capturés. » Absent si pas de troncature.
   */
  capReached?: boolean;
  /**
   * AMENDEMENT-16 §2 anti-abus « boucle trop fine » : présent quand la boucle
   * est fermée mais son intérieur est REFUSÉ (course et couloir restent
   * pleinement valides). 'narrow' = compacité 4πA/P² < LOOP_MIN_COMPACTNESS
   * OU largeur estimée 2A/P < LOOP_MIN_WIDTH_M. Copy UI gelée : « Zone non
   * capturée : forme trop étroite. » Absent si l'intérieur est accepté.
   */
  loopRejectedReason?: 'narrow';
  /**
   * AMENDEMENT-17 §CH2 — Frontière partielle OUVERTE par cette course : run
   * VALIDE, long, NON bouclé mais FERMABLE → une `partial_boundary` `open` du
   * crew a été créée (gardée PARTIAL_BOUNDARY_TTL_H, complétable par un membre).
   * Présent uniquement en mode conquête, quand une frontière a réellement été
   * ouverte (pas de doublon d'une frontière équivalente déjà ouverte). Le crew
   * peut la fermer. Copy UX gelée : « Frontière ouverte · Il manque {missingM} m
   * pour fermer la zone. » — jamais de polyline ni de géométrie exposée.
   */
  openBoundary?: {
    /** Nom lisible de la frontière (secteur/zone déclaré, ex. « République »). */
    name: string;
    /** Mètres restants pour fermer la boucle (segment manquant). Affiché tel quel. */
    missingM: number;
    /** Expiration ISO 8601 (now + PARTIAL_BOUNDARY_TTL_H). UI : « expire dans 23 h ». */
    expiresAt: string;
  };
  /**
   * AMENDEMENT-17 §CH2 — Cette course a REFERMÉ une frontière partielle ouverte
   * par un membre du MÊME crew : la boucle est fermée, l'intérieur capturé au
   * nom du CREW (moteur AMENDEMENT-12), les contributions réparties au prorata
   * de la longueur validée. Copy UX gelée du résultat : « Boucle crew fermée ·
   * {name} capturée · {pseudo} 79 % · {pseudo} 21 % · Crew +{crewPoints} pts. »
   * Absent si aucune frontière n'a été complétée par cette course.
   */
  boundaryCompleted?: {
    /** Nom de la frontière fermée (secteur/zone). */
    name: string;
    /** Répartition au prorata de la longueur validée (somme des share = 1). */
    contributions: { user: string; share: number }[];
    /** Points crew attribués par la fermeture (zone crew). */
    crewPoints: number;
  };
  /**
   * AMENDEMENT-19 §7 — UN bonus ciblé a été APPLIQUÉ par cette course : un
   * `active_bonus` du joueur/crew était actif ET éligible (run GRYD Verified,
   * caps/cooldowns OK), et sa récompense a été créditée (coffre crew / XP /
   * progrès badge / durée de protection) avec le CAP +35 % (BONUS_MAX_TOTAL_PCT,
   * UN seul multiplicateur, jamais de cumul). JAMAIS de territoire/points/rang.
   * Absent si aucun bonus n'était applicable. `effect` = libellé COURT, non
   * tronqué, prêt à afficher (ex. « +25 % coffre crew », « +10 % XP · Explorateur »).
   * Le post-run l'affiche comme bonus principal gagné (UX doc §4).
   */
  bonusApplied?: {
    /** id du bonus (BonusId) — pour l'icône/animation côté client. */
    bonusId: string;
    /** Nom lisible du bonus (ex. « Bonus Finisher »). */
    name: string;
    /** Effet appliqué, libellé court prêt à l'affichage (jamais tronqué). */
    effect: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-17 §CH2 — Frontières partielles crew (migration 0015).
// « Ouvre une frontière. Ton crew peut la fermer. » Le client ne voit JAMAIS
// les segments/polylines (lecture serveur only pour la géométrie) — ces types
// décrivent les lignes DB telles que manipulées côté Edge Functions.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Statut d'une frontière partielle (partial_boundaries.status) :
 *  - `open`      : ouverte, complétable par un membre du crew (dans le TTL) ;
 *  - `completed` : refermée par un membre → zone crew + contributions ;
 *  - `expired`   : TTL écoulé sans complétion → segments en exploration, pas de zone ;
 *  - `contested` : un rival a chevauché la frontière (V1 — pas de complétion MVP).
 */
export type PartialBoundaryStatus = 'open' | 'completed' | 'expired' | 'contested';

/**
 * Un « bout ouvert » d'une frontière : l'une des deux extrémités du segment
 * manquant, que le finisher doit rejoindre à ≤ PARTIAL_JOIN_TOLERANCE_M.
 * Géométrie SERVEUR only — jamais rendue au client.
 */
export interface BoundaryEnd {
  lat: number;
  lng: number;
}

/**
 * Segment validé d'une frontière (partial_boundaries.segments[] jsonb) : une
 * contribution d'un membre (l'ouvreur au départ, un finisher ensuite), avec sa
 * longueur validée (m) et son auteur. Sert au prorata (contributionSplit).
 */
export interface BoundarySegment {
  userId: string;
  /** Longueur validée (m) de la contribution de ce membre à la frontière. */
  validatedLengthM: number;
}

/** Ligne partial_boundaries (0015) telle que manipulée côté serveur. */
export interface PartialBoundary {
  id: string;
  crewId: string;
  openerUserId: string;
  cityId: CityId | null;
  name: string;
  /** Contributions validées (ouvreur + finisher(s)). Géométrie serveur only. */
  segments: BoundarySegment[];
  totalLengthM: number;
  missingM: number;
  /** Les deux bouts ouverts du segment manquant [départ, arrivée]. */
  missingSegment: [BoundaryEnd, BoundaryEnd];
  /** Aire estimée de la zone si la boucle est fermée (km²) — indicatif. */
  zoneEstimateKm2: number;
  status: PartialBoundaryStatus;
  createdAt: string;
  expiresAt: string;
}

/** Ligne boundary_contributions (0015) : part d'un membre dans une frontière fermée. */
export interface BoundaryContribution {
  id: string;
  boundaryId: string;
  userId: string;
  validatedLengthM: number;
  /** Part au prorata de la longueur validée (0-1, somme = 1 sur la frontière). */
  share: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-19 §2/§6/§7 — Bonus aléatoires CIBLÉS (moteur d'opportunités).
// Contrats des 6 bonus MVP (DATA = packages/shared/src/bonuses.ts), du moteur
// pur (packages/engine/src/bonus.ts) et des tables active_bonuses /
// player_bonus_claims (migration 0016). Un bonus ne touche JAMAIS
// territoire/points/classement : seulement coffre crew / XP / progrès badge /
// durée de protection / cosmétique. UN seul multiplicateur, cap +35 %.
// ═══════════════════════════════════════════════════════════════════════════

/** Id stable d'un bonus MVP (clé de la fiche DATA + de active_bonuses.bonus_id). */
export type BonusId =
  | 'finisher'
  | 'defense_critical'
  | 'crew_chest'
  | 'return'
  | 'exploration'
  | 'clean_loop';

/**
 * FAMILLE de jeu du bonus (doc §2 « 8 familles cataloguées » — 6 actives au
 * MVP). Sert au tri/priorité et à l'icône. Pas de reward par famille : chaque
 * fiche porte sa reward.
 */
export type BonusType =
  | 'social' // entraide (Finisher)
  | 'defense' // défense d'une zone (Défense Critique)
  | 'crew' // objectif crew (Coffre Crew)
  | 'streak' // régularité/retour (Retour, anti-shame)
  | 'exploration' // secteur vierge (Exploration)
  | 'conquete'; // boucle bien fermée (Boucle Propre)

/**
 * Rareté d'un bonus (doc §3, « pas de casino ») — MIROIR des tiers existants.
 * Commun (fréquent), Rare (+25 % coffre…), Épique (événement crew), Légendaire
 * (cosmétique très rare). Purement descriptif (fréquence/traitement visuel).
 */
export type BonusRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Portée d'un bonus : au CREW (partagé) ou au JOUEUR (perso). */
export type BonusTargetScope = 'crew' | 'player';

/**
 * Déclencheur d'apparition d'un bonus (doc §2, contexte carte/temps/joueur/
 * crew). DATA descriptive : le moteur (engine/bonus.ts) implémente la logique
 * de pertinence ; ces clés documentent QUAND GRYD révèle le bon moment.
 */
export type BonusTrigger =
  | 'crew_boundary_open_near' // frontière crew ouverte, segment manquant court
  | 'crew_zone_decay_soon' // zone crew qui expire bientôt
  | 'crew_chest_almost_full' // coffre crew dans la dernière ligne droite
  | 'player_absent' // joueur absent depuis quelques jours (anti-shame)
  | 'sector_unexplored_near' // secteur vierge/peu couru à proximité
  | 'clean_loop_closed'; // boucle bien fermée, compacité + GPS trust élevés

/**
 * Condition d'ÉLIGIBILITÉ (anti-abus, doc §5) vérifiée AVANT toute récompense.
 * DATA : le moteur/serveur implémente chaque garde. Un run qui échoue une seule
 * de ces conditions n'est jamais récompensé.
 */
export type BonusEligibility =
  | 'run_verified' // GRYD Verified (Motion Trust ≥ seuil) — pas de véhicule/GPS douteux
  | 'same_crew' // le run appartient au crew ciblé (bonus crew)
  | 'under_player_week_cap' // sous le cap par joueur/semaine
  | 'under_crew_day_cap' // sous le cap par crew/jour
  | 'zone_cooldown_elapsed'; // cooldown de la même zone/frontière écoulé

/** Écran où un bonus peut s'afficher (doc §4 : un seul bonus principal/écran). */
export type BonusVisibility = 'map' | 'war_room' | 'crew_chat' | 'post_run';

/**
 * Récompense d'un bonus (doc §1/§6). Aucun champ ne touche territoire/points/
 * classement. Les pourcentages sont des SURCROÎTS (0-1), re-bornés au cap +35 %
 * par applyBonusReward. Au moins un champ est présent.
 */
export interface BonusReward {
  /** Surcroît de progression du coffre CREW (0-1). Jamais points/rang. */
  chestPct?: number;
  /** Surcroît d'XP perso (0-1). Jamais points de classement. */
  xpPct?: number;
  /** Progrès de badge offert (points vers le prochain palier). */
  badgeProgress?: number;
  /** Durée de protection de zone offerte (heures) — prolonge un bouclier. */
  protectionH?: number;
  /** Clé cosmétique offerte (skin/frame/titre) — jamais un avantage de jeu. */
  cosmetic?: string;
}

/** Plafonds d'occurrences d'un bonus (DATA, miroir de BONUS_CAPS). null = pas de cap. */
export interface BonusCap {
  perPlayerPerWeek?: number | null;
  perCrewPerDay?: number | null;
  perCrewPerWeek?: number | null;
  /** Intervalle minimal (jours) entre deux occurrences pour le MÊME joueur (Retour). */
  perPlayerPerDays?: number | null;
}

/** Copy d'un bonus (doc §4) : titre + corps + bouton. Libellés COURTS, non tronqués. */
export interface BonusCopy {
  title: string;
  body: string;
  button: string;
}

/**
 * FICHE d'un bonus MVP (DATA, bonuses.ts). Config-driven : aucune règle en dur
 * dans le moteur — tout vient d'ici + des caps/cooldowns game-rules. Décrit
 * l'apparition (trigger), la pertinence (targetScope/type), l'impact (reward,
 * borné), l'anti-abus (eligibility/cap/cooldownH/antiAbuse) et l'UX
 * (visibility/cta/copy).
 */
export interface BonusDefinition {
  id: BonusId;
  name: string;
  type: BonusType;
  rarity: BonusRarity;
  targetScope: BonusTargetScope;
  /** Déclencheurs d'apparition (au moins un). */
  trigger: BonusTrigger[];
  /** Conditions d'éligibilité anti-abus (toutes requises). */
  eligibility: BonusEligibility[];
  /** Durée de vie de la fenêtre (heures) — le Finisher suit sa frontière. */
  durationH: number;
  reward: BonusReward;
  cap: BonusCap;
  /** Cooldown (heures) sur la même zone/frontière (0 = aucun). */
  cooldownH: number;
  /** Écrans d'affichage (un seul bonus principal par écran, doc §4). */
  visibility: BonusVisibility[];
  /** Verbe d'action court (« TERMINER », « DÉFENDRE »…). */
  cta: string;
  copy: BonusCopy;
  /** Notes anti-abus lisibles (doc §5) — documentaire, appliqué par le serveur. */
  antiAbuse: string[];
}

/**
 * `active_bonuses` (migration 0016) : une fenêtre de bonus OUVERTE et ciblée
 * (créée par digest_job / à l'ouverture d'une frontière), rattachée à un crew
 * ou un joueur. Le moteur (selectBonus) lit ces lignes ; ingest_run applique la
 * récompense au run éligible qui « répond » au bonus. `subjectId` = crew_id ou
 * user_id selon `scope`. Statut : `active` → `claimed` (récompensé) / `expired`.
 */
export type ActiveBonusStatus = 'active' | 'claimed' | 'expired';
export interface ActiveBonus {
  id: string;
  scope: BonusTargetScope;
  /** crew_id (scope=crew) ou user_id (scope=player) concerné. */
  subjectId: string;
  bonusId: BonusId;
  type: BonusType;
  startsAt: string;
  expiresAt: string;
  status: ActiveBonusStatus;
  createdAt: string;
}

/**
 * `player_bonus_claims` (migration 0016) : trace des récompenses de bonus déjà
 * accordées à un joueur, pour appliquer les caps (par joueur/semaine, par
 * joueur/jours, cooldown zone). `week`/`day` = buckets ISO (UTC).
 */
export interface PlayerBonusClaim {
  id: string;
  bonusId: BonusId;
  userId: string;
  /** Semaine ISO 'YYYY-Www' (cap par joueur/semaine). */
  week: string;
  /** Jour ISO 'YYYY-MM-DD' (cap par joueur/jour, cooldown). */
  day: string;
  claimedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-16 §4 — Inventaire, items, achats, crew boosts (doc §17-§26).
// Le catalogue vit en DB (items, seed 0014) ; les prix EUR/Éclats de référence
// dans game-rules (SKU_PRICES_EUR, *_ECLATS). Aucun effet gameplay vendable.
// ═══════════════════════════════════════════════════════════════════════════

/** Type d'un item du catalogue (items.type, seed 0014). */
export type ItemType =
  | 'pack' // Starter/Founder Pack (§19)
  | 'eclats' // packs de monnaie premium (§19.3)
  | 'skin_territory' // skin de territoire sur la carte (§16.3)
  | 'skin_trace' // skin de trace (§16.3)
  | 'frame_profile' // frame de profil joueur (§16.1)
  | 'template_share' // template de share card (§16.1)
  | 'banner_crew' // bannière Crew HQ (§21.5)
  | 'emblem_crew' // blason crew premium (§16.2)
  | 'shield' // bouclier secteur 48 h (§20.1, capé)
  | 'streak_gel' // protection de série perso (§20.2, capé)
  | 'scout_ping' // analyse de zone (§20.3, capé)
  | 'crew_boost' // contribution groupée capée (§21.1-§21.2)
  | 'cosmetic_chest' // coffre cosmétique crew (§21.3)
  | 'recruit_template' // template recrutement crew (§21.4)
  | 'season_pass' // GRYD Pass §23 — seedé INACTIF (draft)
  | 'badge' // badge cosmétique pack-only (Founder)
  | 'title'; // titre de profil (§16.1)

/** Rareté d'un item — MIROIR des tiers visuels existants (badges/niveaux). */
export type ItemRarity = 'road' | 'tempo' | 'race' | 'carbon' | 'elite' | 'legend';

/** Portée d'un item (items.target_scope, doc §26). */
export type ItemTargetScope = 'user' | 'crew' | 'zone' | 'route' | 'share' | 'profile';

/** Statut catalogue : `draft` = catalogué mais NON vendu (GRYD Pass §23). */
export type ItemStatus = 'active' | 'draft';

/** Ligne du catalogue items (0014) telle qu'exposée au client (lecture seule). */
export interface CatalogItem {
  id: string;
  itemKey: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  /** Prix en Éclats (null = pas vendu en Éclats : pack-only ou SKU EUR). */
  priceShards: number | null;
  /** Prix EUR de référence (null = pas vendu en EUR). */
  priceEur: number | null;
  isConsumable: boolean;
  /** Limite anti-abus affichée (règle §17.6), null si aucune. */
  usageLimit: string | null;
  targetScope: ItemTargetScope;
  animationKey: string;
  description: string;
  status: ItemStatus;
}

/** Ligne user_inventory / crew_inventory (0014) côté client. */
export interface InventoryEntry {
  itemId: string;
  itemKey: string;
  quantity: number;
  equipped: boolean;
  acquiredAt: string;
}

/**
 * Crew Boost actif/planifié (crew_boosts, 0014). Effet UNIQUEMENT sur la
 * progression du coffre crew (multiplier ≤ CREW_BOOST_CHEST_MULTIPLIER) —
 * jamais points/XP/leaderboard. `activatedByUserId` null = offrande anonyme
 * (GIFT_ANONYMOUS_ALLOWED, doc §14).
 */
export type CrewBoostStatus = 'active' | 'expired' | 'cancelled';
export interface CrewBoostRow {
  id: string;
  crewId: string;
  /** CrewBoostType de game-rules (boost_24h | boost_72h | boost_weekend | boost_season). */
  boostType: string;
  activatedByUserId: string | null;
  startsAt: string;
  endsAt: string;
  multiplier: number;
  status: CrewBoostStatus;
}

/** Plateforme d'un achat (purchases.platform, doc §26). */
export type PurchasePlatform = 'app_store' | 'play_store' | 'promo' | 'unknown';
/** Statut d'un achat (purchases.status) : applied = crédité, skipped = anomalie loggée (ex. boost crew sans crew actif). */
export type PurchaseStatus = 'applied' | 'skipped';

/** Ligne hex_claims exposée publiquement (jamais de trace, jamais de position live). */
export interface PublicHexClaim {
  h3: string;
  cityId: CityId;
  ownerPseudo: string;
  crewId: string | null;
  crewColorCache: string | null;
  claimedAt: string;
  lockedUntil: string | null;
  shieldedUntil: string | null;
}
