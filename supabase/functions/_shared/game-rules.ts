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
/**
 * Distance minimale d'une course qui compte. ALIGNÉE spec unifiée §8.2
 * (`MIN_ACTIVITY_DISTANCE_RUN = 800 m`, 27/07/2026 — audit GRYD_SPEC_PRODUIT_
 * UI_UX_COMPLET.md décision D-19). Le dépôt exigeait 1 000 m : PLUS STRICT que
 * la spec — alignement quand même (elle est la source de vérité), et ce
 * durcissement non écrit est NOTÉ ici pour qu'il ne se reproduise pas en
 * silence. Conséquence en cascade DOCUMENTÉE : `ACTIVITY_REFERENCE_SPEED_KMH`
 * et la dérivation vélo plus bas RÉFÉRENCENT explicitement ce changement plutôt
 * que de prétendre une exactitude qu'ils n'ont plus.
 */
export const RUN_MIN_DISTANCE_M = 800;
/**
 * Durée minimale d'une course qui compte. ALIGNÉE spec unifiée §8.2
 * (`MIN_ACTIVE_DURATION_RUN = 5 min`, 27/07/2026). Le dépôt exigeait 6 min :
 * PLUS STRICT que la spec — alignement quand même (source de vérité), durcissement
 * non écrit NOTÉ. ⚠ N'est PLUS partagée telle quelle avec le vélo : voir
 * `BIKE_MIN_DURATION_S`, désormais DÉCOUPLÉE (la spec fixe 6 min pour le vélo,
 * 5 min pour la course — un alias aurait fait tomber le vélo en silence).
 */
export const RUN_MIN_DURATION_S = 5 * 60;
/** Allure moyenne admise, en secondes par km : [2:50 ; 10:00] (borne basse anti-vélo). */
export const RUN_AVG_PACE_MIN_S_KM = 2 * 60 + 50;
export const RUN_AVG_PACE_MAX_S_KM = 10 * 60;
/**
 * Plafonds ANTI-ABUS d'UNE course/session (§3.2, audit sécurité offensif) : au-delà,
 * le payload est implausible → rejet serveur. Volontairement TRÈS généreux pour ne
 * JAMAIS exclure un ultra légitime ; ils ne servent qu'à couper les payloads forgés /
 * erronés grossiers et l'amplification DoS (trace serpentine de milliers d'hexes,
 * tableau de points géant). Ne remplacent pas une vraie attestation d'appareil.
 * NB durée : pas de plafond dédié — l'allure max (RUN_AVG_PACE_MAX_S_KM = 10:00/km)
 * borne déjà la durée par la distance (une course > 24 h serait « pace_too_slow » ou,
 * si assez longue pour ne pas l'être, « too_far »).
 */
export const RUN_MAX_DISTANCE_M = 100_000; // 100 km
export const RUN_MAX_POINTS = 100_000; // points GPS max/payload (~24 h @ 1 Hz), borné AVANT parsing
/**
 * Throttle anti-DoS d'ingest_run (audit sécurité) : chaque appel = pipeline lourd
 * (~30-66 requêtes DB). Plafond par utilisateur/heure, TRÈS au-dessus d'un usage humain
 * (~1-2 courses/jour) → ne gêne personne, coupe le flood scripté d'un compte.
 */
export const INGEST_MAX_RUNS_PER_HOUR = 30;
/** Filtrage des points GPS. */
export const POINT_MAX_ACCURACY_M = 25;
export const POINT_MAX_SPEED_KMH = 25; // au-delà → point rejeté
export const POINT_MAX_JUMP_M = 100; // saut entre points consécutifs → segment coupé
/** Allure par segment admise pour le claim : [2:30 ; 12:00] (hors bornes : segment exclu du claim, course conservée). */
export const SEGMENT_PACE_MIN_S_KM = 2 * 60 + 30;
export const SEGMENT_PACE_MAX_S_KM = 12 * 60;

// ─── §3.3 Propriété, vol, protection ─────────────────────────────────────────
export const HEX_LOCK_HOURS = 24; // hex fraîchement capturé involable
/**
 * Anti-harcèlement / anti-ping-pong (doc « Clash » §4, retour fondateur « j'ai
 * couru pour rien ») : une zone FRAÎCHEMENT capturée par autrui est PROTÉGÉE
 * d'un re-vol immédiat pendant ces heures. Dérive de last_captured_at (=
 * hex_claims.claimed_at, posé à now() à CHAQUE capture neutral/steal/pioneer,
 * jamais touché par une simple défense) : un hex dont la dernière capture est
 * dans cette fenêtre renvoie `blocked_fresh_protection` (0 pt) au lieu d'être
 * volé. Protection AUTOMATIQUE et TEMPORELLE — jamais achetable (anti
 * pay-to-win). Plus court que le lock 24 h : c'est l'attribution EXPLICABLE de
 * la fraîcheur (« zone tout juste prise, laisse-lui le temps »), le lock prend
 * le relais ensuite. TUNABLE (doc « MVP »). */
export const FRESH_CAPTURE_PROTECT_HOURS = 6;
export const NEW_PLAYER_PROTECTION_DAYS = 14; // territoire involable + sans decay
/**
 * Durée de vie (jours) d'une zone non re-parcourue avant decay → neutre
 * (AMENDEMENT-23 §D + doc §24/§25 : REMPLACE l'ancien decay binaire 21 j).
 * C'est l'échéance de decay POSÉE À LA CAPTURE (now + ZONE_DECAY_DAYS). Une
 * DÉFENSE ultérieure ne « reset » plus à 14 j : elle REPOUSSE l'échéance de
 * DEFENSE_HOURS_* selon la couverture de frontière (défense graduée ci-dessous)
 * — la stabilité s'ÉTEND, elle ne se remet pas à zéro. TUNABLE (doc « MVP »).
 */
export const ZONE_DECAY_DAYS = 14;
export const DECAY_WARNING_DAYS_BEFORE = 3; // notif « ton quartier s'efface »
/**
 * Statuts de zone dérivés (doc §24) — cycle de vie d'une zone à partir de son
 * échéance de decay et de son activité. NOMMÉS pour l'UI/l'explicabilité ; le
 * moteur les DÉRIVE (zoneStatus, engine/zone.ts) sans colonne dédiée quand
 * calculables au read.
 *  - `stable`     : capturée/défendue récemment, 0-7 j depuis la dernière défense ;
 *  - `fragile`    : 8-14 j sans défense (échéance approche) ;
 *  - `a_defendre` : dans les DERNIÈRES 48 h avant l'échéance de decay ;
 *  - `contestee`  : rival actif / contrôle partagé (signal externe) ;
 *  - `protegee`   : bouclier actif OU défense forte récente (stable_until futur loin) ;
 *  - `en_decay`   : échéance de decay dépassée (perd sa propriété).
 * Fenêtres de decay (doc §25, bornes en jours/heures depuis la dernière défense).
 */
export const ZONE_STABLE_MAX_DAYS = 7; // stable : 0-7 j
export const ZONE_FRAGILE_MAX_DAYS = 14; // fragile : 8-14 j (= ZONE_DECAY_DAYS)
export const ZONE_DEFEND_WINDOW_HOURS = 48; // « à défendre » : dernières 48 h avant decay
/**
 * Défense GRADUÉE (doc §16/§17, AMENDEMENT-23 §D) : la stabilité gagnée dépend
 * de la COUVERTURE de la frontière ciblée par le tracé (frontier coverage %,
 * engine/coverage.ts). 3 niveaux → heures de stabilité AJOUTÉES à l'échéance de
 * decay (repousse le decay de N h à partir de now). Valeurs = BORNE HAUTE des
 * plages doc (traverser 12-24 h → 24 ; longer 24-48 h → 48 ; couvrir 48-72 h →
 * 72) — TUNABLE. Une zone « couverte/fermée » tient donc 72 h de plus par
 * défense, une simple traversée 24 h.
 */
export const DEFENSE_HOURS_TRAVERSE = 24; // coverage < DEFENSE_COVER_LONGE_MIN
export const DEFENSE_HOURS_LONGE = 48; // DEFENSE_COVER_LONGE_MIN ≤ coverage < DEFENSE_COVER_FULL_MIN
export const DEFENSE_HOURS_COVER = 72; // coverage ≥ DEFENSE_COVER_FULL_MIN OU boucle fermée sur la zone
/**
 * Seuils de COUVERTURE de frontière (fraction 0-1) départageant les 3 niveaux
 * de défense (doc §16/§17). < 0,40 = traverser ; [0,40 ; 0,80[ = longer ;
 * ≥ 0,80 = couvrir/fermer. TUNABLE.
 */
export const DEFENSE_COVER_LONGE_MIN = 0.4;
export const DEFENSE_COVER_FULL_MIN = 0.8;
/**
 * Buffer (m) autour du tracé pour calculer la portion de frontière couverte
 * (doc §17 : « buffer autour du tracé = 30 m »). PURE (engine/coverage.ts) :
 * couverture = longueur de la frontière ciblée dont un point tombe à ≤ ce
 * buffer d'un segment du tracé, ÷ longueur totale de la frontière. TUNABLE.
 */
export const FRONTIER_COVERAGE_BUFFER_M = 30;
export const SHIELD_MAX_CLUSTER_HEXES = 300;
export const SHIELD_DURATION_HOURS = 48;
export const SHIELD_MAX_ACTIVE_PER_WEEK = 2; // cap absolu par joueur
// ANTI PAY-TO-WIN (AMENDEMENT-40 §2, AMENDEMENT-45 §2 « Bonus ») : l'abonnement
// GRYD Club ne bundle JAMAIS de bouclier ni de protection de zone → 0. Et le
// bouclier n'est plus un achat non plus : il fait partie des OBJETS
// FONCTIONNELS, qui ne s'achètent dans AUCUNE monnaie (voir
// FUNCTIONAL_ITEM_ACQUISITION, §3.4).
export const SHIELD_CLUB_INCLUDED_PER_WEEK = 0;

// ─── §3.4 Points, streaks, monnaies ──────────────────────────────────────────
// AMENDEMENT-23 §D + doc §23 : la FORMULE DE POINTS est désormais
// MULTIPLICATIVE — points = zones × coeff_action × coeff_contexte ×
// verify_factor (voir POINTS_BASE_PER_ZONE / ACTION_COEFF / CONTEXT_COEFF /
// VERIFY_* ci-dessous). Les 3 forfaits historiques (+10/+15/+3) NE sont plus le
// barème ; ils restent exposés comme RÉFÉRENCE de dérivation :
// POINTS_BASE_PER_ZONE=10 = l'ancien neutre ; steal 1,3 ≈ 15/10 ; l'ancien
// défendu +3 devient 10 × 1,2 (défense) × 0,5 (verify partiel) ≈ 6 ou plus —
// gros delta de balance SIGNALÉ (balanceNotes). Le pionnier par densité reste
// un ADDITIF de première capture (voir POINTS_PIONEER_BONUS_BY_DENSITY).
export const POINTS_NEUTRAL_HEX = 10;
export const POINTS_STOLEN_HEX = 15;
export const POINTS_DEFENDED_HEX = 3; // re-parcourir son hex (LEGACY — cf. formule §23)
export const DEFEND_COOLDOWN_HOURS = 24; // max 1 défense/24 h/hex

// ─── §23 Formule de points MULTIPLICATIVE (AMENDEMENT-23 §D, doc §23) ─────────
/**
 * Points de base d'UNE zone (micro-cellule res 10) capturée, avant tout
 * coefficient (doc §23 « POINTS_BASE_PER_ZONE=10 »). = l'ancien neutre forfait
 * (POINTS_NEUTRAL_HEX) — la conquête neutre reste 10 × 1,0 × … = 10.
 */
export const POINTS_BASE_PER_ZONE = 10;
/**
 * Coefficient d'ACTION par type de gain (doc §23). Une zone est gagnée par UNE
 * action : conquête neutre ×1, reprise rival ×1,3, défense ×1,2, boucle propre
 * ×1,1 (intérieur d'une boucle fermée bien formée), route ×0,5 (couloir d'un
 * run qui n'ouvre qu'une ligne, pas de zone). Le moteur (engine/scoring.ts)
 * choisit le coeff par hex selon l'outcome + le contexte boucle. TUNABLE.
 *  - `route` MVP : réservé au couloir d'une course SANS boucle (arbitrage
 *    fondateur — appliqué seulement si actionContext.route, sinon la conquête
 *    corridor reste ×1,0 pour ne pas casser la balance des runs simples).
 */
export const ACTION_COEFF = {
  conquest: 1.0,
  steal: 1.3,
  defense: 1.2,
  clean_loop: 1.1,
  route: 0.5,
} as const;
export type ActionCoeffKey = keyof typeof ACTION_COEFF;
/**
 * Coefficient de CONTEXTE (doc §23) — MAJORE les points selon la situation, PAS
 * un achat. `zone_bonus` = HOTSPOT de carte (gagné par le LIEU, hotspot §26),
 * jamais un bonus acheté (anti pay-to-win : les bonus payants ne touchent
 * jamais les points, cf. BONUS_REWARD_PCT/Crew Boost → coffre/XP seulement).
 * Le coeff contexte effectif d'un hex = le PLUS FORT contexte applicable (un
 * seul multiplicateur de contexte, jamais de cumul). 1,0 si aucun. TUNABLE.
 *  - `contested` ×1,2 : la zone est disputée (rival actif/partagé) ;
 *  - `crew_mission` ×1,1 : la zone compte pour une mission/offensive crew active ;
 *  - `zone_bonus` ×1,15 : la zone est un hotspot de carte (gagné, pas acheté).
 */
export const CONTEXT_COEFF = {
  contested: 1.2,
  crew_mission: 1.1,
  zone_bonus: 1.15,
} as const;
export type ContextCoeffKey = keyof typeof CONTEXT_COEFF;
/**
 * PALIERS de VERIFY (doc §23) — facteur multiplicatif final selon le score de
 * confiance de la course (trust = min(gpsTrust, motionTrust) 0-100) :
 *  - ≥ VERIFY_FULL_MIN (80) → VERIFY_FACTOR_FULL (1,0) : capture pleine ;
 *  - ≥ VERIFY_PARTIAL_MIN (60) → VERIFY_FACTOR_PARTIAL (0,5) : capture PARTIELLE
 *    (la course capture, mais chaque zone vaut moitié) ;
 *  - < 60 → 0 : STATS ONLY, aucune capture (le run compte sportivement).
 * verifyFactor(trust) (engine/scoring.ts) applique ces paliers. Remplace le
 * seuil unique 70. TUNABLE.
 */
export const VERIFY_FULL_MIN = 80;
export const VERIFY_PARTIAL_MIN = 60;
export const VERIFY_FACTOR_FULL = 1.0;
export const VERIFY_FACTOR_PARTIAL = 0.5;
export const VERIFY_FACTOR_NONE = 0; // < VERIFY_PARTIAL_MIN → stats only

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
/**
 * ANTI PAY-TO-WIN — AMENDEMENT-40 §2, correctif imposé mot pour mot :
 * « STREAK_FREEZE_CLUB_PER_MONTH doit valoir STREAK_FREEZE_FREE_PER_MONTH :
 *   l'abonnement ne protège pas mieux la série que la gratuité. »
 * La série multiplie les POINTS de territoire (STREAK_MULTIPLIER_CAP = 1,5,
 * engine/scoring.ts) : protéger la série mieux que les autres, c'est acheter un
 * multiplicateur de score. Dérivée de la constante gratuite — pas un 1 en dur,
 * pour qu'un changement de barème ne puisse pas rouvrir l'écart par oubli.
 */
export const STREAK_FREEZE_CLUB_PER_MONTH = STREAK_FREEZE_FREE_PER_MONTH;
/**
 * Profondeur d'historique lue pour DÉRIVER la série (LOT 1 « série visible ») :
 * la série et le « meilleur » sont recalculés à partir des courses réelles des
 * 52 dernières semaines. Au-delà, l'app ne prétend rien connaître — elle ne
 * conserve pas un chiffre qu'elle ne peut plus vérifier.
 */
export const STREAK_HISTORY_WEEKS = 52;
/** Foulées (monnaie douce) : 10 % des points gagnés. */
export const FOULEES_RATE_OF_POINTS = 0.1;
/**
 * ×1,5 de Foulées pour GRYD Club. CONDITION DE LÉGITIMITÉ, vérifiée le
 * 23/07/2026 : ce multiplicateur n'est acceptable QUE tant que les Foulées
 * n'achètent RIEN de fonctionnel. État constaté à cette date :
 *  - les seuls barèmes en Foulées de la source de vérité sont cosmétiques /
 *    d'identité (SKIN_EARNABLE_1/2_FOULEES, CREW_RENAME_FOULEES) ;
 *  - aucune fonction `spend_foulees` n'existe côté serveur — les Foulées sont
 *    créditées (RPC claim/defense) et ne se dépensent nulle part.
 *  - les objets FONCTIONNELS n'ont de prix dans AUCUNE monnaie
 *    (FUNCTIONAL_ITEM_ACQUISITION) — Foulées comprises.
 * ⚠ SI un jour un objet fonctionnel reçoit un barème en Foulées, ce ×1,5
 * devient « l'abonnement protège mieux » → il faudra le ramener à 1. Le test
 * `anti_pay_to_win_test.ts` garde la porte fermée du côté du prix.
 * ⚠ DUPLIQUÉ EN DUR (`then 1.5`) dans les RPC des migrations APPLIQUÉES 0005
 * ·0017 ·0018 ·0031 ·0041 : une migration appliquée ne se réécrit jamais, donc
 * un changement de cette constante exige une NOUVELLE migration qui remplace
 * les fonctions. Constat documenté, non corrigé ici.
 */
export const CLUB_FOULEES_MULTIPLIER = 1.5;
/** Barèmes en Foulées : COSMÉTIQUES / IDENTITÉ uniquement (voir ci-dessus). */
export const SKIN_EARNABLE_1_FOULEES = 800;
export const SKIN_EARNABLE_2_FOULEES = 1_500;
export const CREW_RENAME_FOULEES = 300;
/** Éclats (monnaie premium, achetée uniquement — n'achète jamais hexes/points/Foulées/stats). */
export const SKIN_PREMIUM_ECLATS_MIN = 180;
export const SKIN_PREMIUM_ECLATS_MAX = 280;

/**
 * ─── ANTI PAY-TO-WIN — OBJETS FONCTIONNELS : AUCUN PRIX, DANS AUCUNE MONNAIE ──
 *
 * AMENDEMENT-40 §2 (correctifs imposés, 15/07/2026) :
 *   « Le Bouclier et le Streak Gel ne sont plus achetables contre de l'argent
 *     (ni directement, ni via une monnaie achetable). »
 * AMENDEMENT-45 §2 « Bonus » (21/07/2026) :
 *   « Bouclier et scout_ping deviennent gagnables en jouant, jamais achetables
 *     en argent réel. L'objet reste, l'avantage n'est plus vendu. »
 *
 * Un objet est FONCTIONNEL dès qu'il touche le jeu : protection d'un secteur
 * (`shield`), protection de la série — donc du multiplicateur ×1,5 sur les
 * POINTS de territoire — (`streak_gel`), information tactique sur une zone
 * (`scout_ping`), alerte anticipée d'attaque (`attack_alert` — l'objet qui a
 * REMPLACÉ le bouclier en migration 0022, à 50 Éclats). CLAUDE.md interdit de
 * vendre « territoire, points, vitesse NI PROTECTION » ; AMENDEMENT-45 §2 C1
 * ajoute mot pour mot : « Être prévenu plus tôt d'une attaque, c'est défendre
 * en premier — un avantage compétitif payant, interdit. » Ces objets n'ont
 * donc plus de prix Éclats, plus de prix EUR, et ne sont crédités par AUCUN
 * pack payant (cf. SKU_GRANTED_ITEM_KEYS, d'où `streak_gel` a été retiré).
 *
 * Le TYPE lui-même referme la porte : `priceEclats`/`priceEur` sont typés
 * `null` et `purchasable` est typé `false` — réintroduire un prix ne compile
 * pas. Un test Deno gèle l'invariant côté runtime
 * (`supabase/functions/ingest_run/anti_pay_to_win_test.ts`).
 *
 * ⚠ EN SUSPENS, et l'app ne le promet nulle part : la voie d'obtention « en
 * jouant » n'est PAS codée (aucune RPC ne crédite `user_inventory` pour ces
 * trois clés, aucune fonction `spend_foulees`/`spend_eclats` n'existe). On
 * n'inscrit donc AUCUN barème en Foulées ici : un prix écrit avant que le code
 * le tienne serait la même faute qu'une donnée fabriquée. `earnedBy: 'play'`
 * dit la DIRECTION décidée, pas un tarif.
 */
export const FUNCTIONAL_ITEM_KEYS = [
  'shield',
  'streak_gel',
  'scout_ping',
  'attack_alert',
] as const;
export type FunctionalItemKey = (typeof FUNCTIONAL_ITEM_KEYS)[number];

export interface FunctionalItemAcquisition {
  /** Jamais vendable — typé `false`, pas `boolean` : la porte est fermée à la compilation. */
  readonly purchasable: false;
  /** Aucun prix en Éclats (monnaie ACHETABLE → argent réel → protection). */
  readonly priceEclats: null;
  /** Aucun prix EUR, ni direct ni via un pack. */
  readonly priceEur: null;
  /** Seule voie décidée : le jeu. Barème NON codé à ce jour (voir ci-dessus). */
  readonly earnedBy: 'play';
}

export const FUNCTIONAL_ITEM_ACQUISITION: Readonly<
  Record<FunctionalItemKey, FunctionalItemAcquisition>
> = {
  shield: { purchasable: false, priceEclats: null, priceEur: null, earnedBy: 'play' },
  streak_gel: { purchasable: false, priceEclats: null, priceEur: null, earnedBy: 'play' },
  scout_ping: { purchasable: false, priceEclats: null, priceEur: null, earnedBy: 'play' },
  attack_alert: { purchasable: false, priceEclats: null, priceEur: null, earnedBy: 'play' },
};

/** `true` si la clé d'item est un objet FONCTIONNEL (donc jamais achetable). */
export function isFunctionalItemKey(key: string): key is FunctionalItemKey {
  return (FUNCTIONAL_ITEM_KEYS as readonly string[]).includes(key);
}

// ─── §3.5 Crews ──────────────────────────────────────────────────────────────
export const CREW_MIN_MEMBERS = 2;
/**
 * Effectif MAX d'un crew (source = doc Clash→GRYD du fondateur : gros crews façon
 * clan Supercell). Passé de 10 à 50 (AMENDEMENT-34). L'affichage `X/CREW_MAX_MEMBERS`
 * s'adapte partout (aucun libellé ne code « 10 » en dur — cf. Hero.tsx / WarRoom.tsx
 * qui consomment déjà la constante). Anti pay-to-win : un crew plus grand ne donne
 * NI territoire NI points NI vitesse NI protection — seulement plus de monde.
 */
export const CREW_MAX_MEMBERS = 50;
/**
 * Score de saison : SEULS les CREW_SCORE_TOP_ACTIVE membres les PLUS ACTIFS
 * comptent (source = doc Clash→GRYD). Empêche le « gros crew qui écrase par le
 * nombre » : à 50 membres, un crew ne score que sur ses 30 meilleurs contributeurs.
 * Consommé par engine/crew.ts `crewSeasonScore` (somme des topN contributions).
 * Anti pay-to-win : plafonne l'avantage de la TAILLE, ne vend rien.
 */
export const CREW_SCORE_TOP_ACTIVE = 30;
export const CREW_COLORS_COUNT = 12; // identité en DB ; rendu carte = AMENDEMENT-01
export const CREW_CODE_LENGTH = 6;
export const CREW_SWITCH_COOLDOWN_DAYS = 7;

/**
 * ─── AMENDEMENT-43 §0 maillon 3 — LA MISSION PRIORITAIRE DU CREW ────────────
 * « je cours pour l'AIDER ». Le crew a TOUJOURS AU PLUS UNE mission affichée,
 * DÉRIVÉE de l'état RÉEL (engine/crewMission.ts `chooseCrewMission`) — jamais
 * scriptée, jamais fabriquée. Quand la donnée réelle ne permet rien, la
 * dérivation renvoie `none` et l'écran le DIT (état honnête, pas un échec).
 *
 * La fenêtre de DÉFENSE n'a pas sa constante ici : c'est déjà
 * ZONE_DEFEND_WINDOW_HOURS (« à défendre » = dernières 48 h avant l'échéance de
 * decay, doc §24). Une 2ᵉ constante dirait deux vérités différentes du même
 * seuil.
 */

/**
 * Fenêtre (heures) pendant laquelle une zone PERDUE reste « à reprendre ».
 * Au-delà, la perte est de l'histoire : la remettre en mission prioritaire
 * inventerait une urgence morte. Source réelle : `contested_group_runs`
 * (prev_owner_crew_id = nous, winner_crew_id = un autre crew).
 */
export const CREW_MISSION_RECLAIM_WINDOW_H = 168; // 7 jours

/**
 * Nombre MINIMUM de zones réellement libres dans un secteur pour en faire une
 * mission de capture. En dessous, « allez prendre 1 zone » n'est pas une
 * mission de crew, c'est du bruit. Les zones libres sont COMPTÉES
 * (sectors.total_hexes − claims vivants du secteur), jamais estimées.
 */
export const CREW_MISSION_CAPTURE_MIN_FREE = 3;

/**
 * ─── AMENDEMENT-44 A4/A5 — SIGNAUX CREW + PING DE ZONE ──────────────────────
 * Le chat LIBRE reste REFUSÉ (A-43 §9 : modération, sécurité des mineurs, charge
 * juridique). On enrichit donc le VOCABULAIRE FIGÉ : un ping = un secteur RÉEL du
 * crew + un signal choisi dans un catalogue fermé. Zéro caractère saisi par
 * l'utilisateur ne transite : rien à modérer par construction.
 *
 * Les bornes ci-dessous sont des RÈGLES DE JEU (elles décident ce qui s'affiche
 * et ce qui est refusé), donc elles vivent ici et nulle part ailleurs — la RPC
 * les reçoit en paramètres, exactement comme les fenêtres de `crew_mission_inputs`.
 */

/**
 * Pings ACTIFS simultanés par membre. À 1, un nouveau ping REMPLACE le précédent
 * (il ne le refuse pas : refuser obligerait à comprendre une règle invisible pour
 * corriger une erreur de tap). Conséquence directe : un crew de 50 ne peut pas
 * afficher plus de 50 pings, et un membre ne peut pas noyer le mur à lui seul.
 */
export const CREW_PING_MAX_ACTIVE_PER_MEMBER = 1;

/**
 * Durée de vie d'un ping (heures). Un ping est une intention de COURSE, pas un
 * message : au-delà, « je défends ce soir » parle d'un soir qui est passé.
 * L'expiration est portée par le SERVEUR (colonne `expires_at`, filtrée en
 * lecture) — jamais par un timer client qui mentirait après un vol long-courrier.
 */
export const CREW_PING_TTL_H = 12;

/**
 * Délai minimal (minutes) entre deux pings d'un même membre. Le remplacement
 * est légitime (« je m'étais trompé de secteur »), le martèlement ne l'est pas.
 * Anti-spam sans jamais culpabiliser : un ping trop rapproché est REFUSÉ avec le
 * temps restant, pas commenté.
 */
export const CREW_PING_COOLDOWN_MIN = 5;

/**
 * Pings affichés simultanément sur l'écran Crew. Au-delà, un mur de pings n'est
 * plus une coordination, c'est un fil — et un fil demande de la modération. Les
 * plus RÉCENTS gagnent ; le reste n'est pas « caché », il n'existe plus à l'écran.
 */
export const CREW_PING_FEED_MAX = 8;

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
/**
 * E71 (spec produit §13) : au-delà de ce nombre d'événements NON URGENTS le même
 * jour, les suivants sont REGROUPÉS plutôt que remis un par un. Une urgence
 * (territoire contesté, défense expirant, activité interrompue, sécurité du
 * compte — §13.1) ignore TOUJOURS ce seuil : le confort ne doit jamais éteindre
 * ni retarder une urgence, c'est la règle qui protège le joueur.
 * Politique de CADENCE de notification (comme PUSH_MAX_PER_DAY ci-dessus), pas
 * une règle de score — elle vit ici par cohérence avec le reste de cette
 * section, pas parce qu'elle influence un claim.
 */
export const NOTIF_NON_URGENT_DAILY_THRESHOLD = 3;
export const RUN_AUTOSAVE_INTERVAL_S = 15;
/** Récompense variable : 1 drop gratuit toutes les 3-5 courses. */
export const FREE_DROP_MIN_RUNS = 3;
export const FREE_DROP_MAX_RUNS = 5;

/**
 * VOL SUBI (doc §4 « Vol subi » : « perte significative », « pas chaque hex »).
 * Perte minimale, en zones DISTINCTES, sous laquelle on ne pousse PAS. Un
 * coureur qui rogne le coin d'un territoire en passant n'est pas un événement ;
 * une incursion l'est.
 *
 * CE QUE COUPER LE PUSH CACHE, ET CE QUE ÇA NE CACHE PAS — état au 21/07/2026.
 * Cette phrase disait « l'inbox ET le marqueur de revanche restent ». La moitié
 * était fausse, et une garantie à moitié fausse est un mensonge de doc entier :
 *   · L'INBOX RESTE — c'est VRAI et c'est du code : `steal_push_job` écrit dans
 *     `public.notifications` (table 0006) pour toute victime dont les lignes
 *     sont consommées ET qui portent au moins un vol RÉEL — `no_device`,
 *     `channel_off` et `expired` compris (depuis la migration 0058 ; avant elle,
 *     un vol périmé ne laissait RIEN, ni push ni inbox). Vérifiable.
 *     Les seules lignes consommées sans inbox sont les `invalid` (vol de
 *     soi-même, identifiant vide) : il n'y a pas de perte à raconter.
 *   · LE MARQUEUR DE REVANCHE NE RESTE PAS — il n'existe pas côté serveur.
 *     `apps/mobile/src/features/crew/revanche.ts` le tient en AsyncStorage
 *     LOCAL, et son propre en-tête le dit : « Tout est LOCAL (démo).
 *     TODO(O1) : brancher un vrai `revanche_windows` ». Aucune table
 *     `revanche_windows` n'existe dans `supabase/migrations/`. Un joueur qui
 *     réinstalle, ou qui change de téléphone, n'a AUCUNE revanche persistée.
 * SUSPENS (à porter dans AMENDEMENT-47 §« Ce qui reste EN SUSPENS ») :
 * `revanche_windows` — table + alimentation par `steal_push_job` (l'agrégat par
 * victime y est déjà, c'est le seul endroit qui connaît le secteur volé) +
 * lecture mobile en remplacement du store local. Tant que ce n'est pas fait,
 * AUCUN fichier ne doit promettre que la revanche survit au push coupé.
 */
export const STEAL_PUSH_MIN_HEXES = 5;
/**
 * Fenêtre d'agrégation du vol subi : délai minimal entre DEUX pushs de vol pour
 * un même joueur. C'est la garde anti-spam PRINCIPALE — elle rend le cas « dix
 * rivaux différents dans la même heure » impossible par construction, sans
 * dépendre du cap journalier (qui reste le dernier filet, pas le design).
 *
 * CE QUI ARME CE COOLDOWN (migration 0058). La DÉCISION d'envoyer, pas la preuve
 * de livraison. L'horloge est lue sur `steal_push_queue` : la plus récente ligne
 * de la victime consommée avec `outcome = 'pushed'`, écrite dans la MÊME
 * transaction que la finalisation du lot, donc avant tout appel réseau.
 * Auparavant elle était lue sur `push_log`, écrit uniquement pour les issues
 * `delivered` et en best-effort : une panne Expo ou un échec d'écriture du
 * journal DÉSARMAIT la seule garde entre deux drains. Une panne de transport ne
 * doit jamais élargir le droit de déranger quelqu'un.
 * `push_log` continue d'alimenter le cap journalier tous types confondus
 * (`canPush`), qui lui doit rester adossé à un envoi réellement accepté.
 */
export const STEAL_PUSH_COOLDOWN_MINUTES = 180;
/**
 * Âge maximal d'un vol EN ATTENTE d'annonce (file `steal_push_queue`).
 *
 * Un vol non encore annoncé reste en file — c'est ce qui permet d'AGRÉGER
 * plusieurs courses adverses en un seul message, et de reporter proprement un
 * vol tombé pendant les quiet hours (21h-8h) au réveil du joueur. Il faut donc
 * que cette fenêtre dépasse largement la plus longue nuit silencieuse (11 h) et
 * le cooldown (3 h).
 *
 * Passé ce délai, le vol est PÉRIMÉ et purgé sans push : annoncer une perte
 * vieille d'un jour n'est plus de la rétention, c'est du bruit — et le terrain
 * a de bonnes chances d'avoir déjà rechangé de mains. Rien n'est caché pour
 * autant : la perte reste lisible sur la carte et dans le territoire du joueur,
 * ET une entrée d'INBOX datée est écrite au moment où la ligne est consommée
 * `expired` (0058). Ce qui est refusé au vol périmé, c'est le PUSH — le droit de
 * déranger quelqu'un pour une nouvelle qui n'en est plus une —, pas le droit du
 * joueur de savoir ce qu'il a perdu.
 *
 * DEUXIÈME RÔLE (0058) : ce délai borne aussi la rétention des lignes consommées
 * (purge de `steal_push_job`), or ces lignes portent l'horloge du cooldown de vol
 * (`outcome = 'pushed'`). INVARIANT, testé dans steal_push_job/logic_test.ts :
 * STEAL_QUEUE_MAX_AGE_HOURS × 60 ≥ STEAL_PUSH_COOLDOWN_MINUTES. Le descendre
 * sous 3 h effacerait le cooldown en même temps que les lignes.
 */
export const STEAL_QUEUE_MAX_AGE_HOURS = 24;
/**
 * Victimes traitées par drain de `steal_push_queue`. C'est un plafond de
 * VICTIMES, pas de lignes — et c'est la différence qui compte.
 *
 * POURQUOI PAS UN PLAFOND DE LIGNES. Le message de vol est agrégé PAR VICTIME :
 * son total (« 12 zones reprises ») n'est vrai que si le drain voit TOUTES les
 * lignes en attente de cette victime. Un plafond de lignes coupe un agrégat au
 * milieu et fait annoncer un nombre FAUX — l'app ne ment jamais, y compris par
 * troncature. En bornant les victimes, chaque victime retenue est traitée
 * ENTIÈRE ; celles qui débordent attendent le drain suivant (5 min).
 *
 * COÛT ASSUMÉ : le nombre de lignes lues n'est pas borné dur. Il l'est en
 * pratique par STEAL_QUEUE_MAX_AGE_HOURS (au-delà tout est périmé) et par
 * MAX_CLAIMS_PER_DAY côté voleurs. Le pire cas reste très en deçà de la mémoire
 * d'un isolate ; on préfère cette borne molle à un chiffre faux.
 */
export const STEAL_QUEUE_MAX_VICTIMS_PER_DRAIN = 500;
/**
 * Report d'une ligne écartée pour une raison de TIMING (seuil non atteint,
 * cooldown, quiet hours, cap journalier) : délai avant qu'elle redevienne
 * LISIBLE par un drain.
 *
 * POURQUOI CE DÉLAI EXISTE. Sans lui, une ligne bloquée par le cooldown (3 h)
 * est relue 36 fois pour rien et, surtout, occupe une place dans le lot : à
 * l'échelle, les plus vieilles lignes jamais consommées monopolisent le drain
 * et les vols RÉCENTS ne sont plus jamais lus. C'est une FAMINE, et elle frappe
 * exactement les joueurs actifs.
 *
 * POURQUOI REPORTER NE CASSE PAS L'AGRÉGATION. La lecture se fait par VICTIME :
 * dès qu'UNE ligne de la victime redevient due (un nouveau vol, par exemple),
 * le drain reprend TOUTES ses lignes en attente, y compris celles encore
 * reportées. Une perte sous le seuil ne se perd donc pas — elle attend d'être
 * complétée, ce qui est précisément le comportement voulu au §4 (« pas chaque
 * hex »). C'est ce couplage report ↔ lecture-par-victime qui rend le report sûr.
 *
 * 15 min : assez long pour vider le lot des lignes qui ne peuvent rien produire,
 * assez court pour qu'une sortie de quiet hours ou de cap soit vue vite.
 */
export const STEAL_QUEUE_DEFER_MINUTES = 15;
/**
 * Délai au bout duquel une RÉSERVATION restée ouverte est déclarée abandonnée.
 *
 * Le drain réserve les lignes AVANT d'appeler Expo (cf. `steal_push_job`). Si
 * l'isolate meurt entre les deux, ces lignes restent réservées sans jamais être
 * finalisées. On ne les remet PAS en file : les renvoyer, c'est risquer un
 * doublon pour un message peut-être déjà parti, et « au plus une fois » prime.
 * Elles sont donc consommées avec l'issue `abandoned` — et COMPTÉES, pour que
 * la perte soit visible dans les métriques au lieu d'être silencieuse.
 *
 * 30 min = 6 fois la période du cron : un drain lent n'est jamais pris pour un
 * drain mort.
 *
 * SECOND RÔLE (0058) : ce délai borne aussi l'ATTENTE d'une victime. Tant qu'une
 * de ses lignes reste réservée, la victime entière est écartée du lot — sinon le
 * drain agrégerait uniquement ses lignes libres et annoncerait « 5 zones » quand
 * 17 ont été prises. Un compte tronqué est un chiffre FAUX ; attendre, non. Le
 * réapeur ferme cette attente au bout de ces 30 minutes, dans le pire cas.
 */
export const STEAL_QUEUE_RESERVATION_GRACE_MINUTES = 30;

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

// ─── §12.1 Masquage des rendus PUBLICS (spec produit UI/UX complète, D-19) ───
// « couper au moins 250 m autour du départ et de l'arrivée publics ; appliquer
//   les zones floutées ; simplifier les contours ; retarder la publication ;
//   supprimer les timestamps détaillés. »  (§1.5 le redit : « Les 250 premiers
//   et derniers mètres d'une activité sont masqués dans les exports publics par
//   défaut », « la publication d'un nouveau territoire est différée de 60
//   minutes par défaut »).
//
// Ces trois constantes vivent ICI parce que ce sont des règles de produit, pas
// des détails d'écran : la card de partage, la note de l'écran Confidentialité
// et la vue SQL publique doivent toutes trois parler de la MÊME distance, du
// MÊME délai et de la MÊME granularité. Elles étaient auparavant écrites à
// découvert dans le code appelant (200 m dans `sharePrivacy.ts`, 60 min dans
// `supabase/functions/ingest_run/territory.ts`) — deux nombres magiques.

/**
 * §12.1 / §1.5 — mètres masqués à CHAQUE extrémité d'une trace rendue
 * PUBLIQUE (card de partage). Plancher de la spec : « AU MOINS 250 m ».
 * Consommé par `apps/mobile/src/features/share/sharePrivacy.ts` (qui coupe) et
 * par l'écran Confidentialité (qui ANNONCE la distance réellement appliquée) :
 * un seul nombre, donc l'écran ne peut pas promettre autre chose que la coupe.
 */
export const SHARE_TRIM_M = 250;

/**
 * §12.1 / §E35 « Confidentialité — avant export : […] simplifier la carte » —
 * tolérance (mètres) du Douglas-Peucker appliqué au tracé AVANT qu'il parte dans
 * une image publique.
 *
 * CE N'EST PAS UN DOUBLON DE `SHARE_TRIM_M` (250 m) : celui-là COUPE les deux
 * extrémités (le domicile), celui-ci DÉGRADE la résolution de TOUT ce qui reste.
 * Un tracé coupé aux bouts reste, entre les deux, une carte au mètre près :
 * quel trottoir, quelle contre-allée, quelle entrée d'immeuble traversée — assez
 * pour rejouer un itinéraire. Les deux règles sont donc cumulatives, jamais
 * alternatives.
 *
 * POURQUOI 15 m. C'est la première valeur qui efface l'échelle du BÂTIMENT tout
 * en gardant celle du QUARTIER : 15 m ≈ la largeur d'une rue, donc « quel côté
 * de la rue » cesse d'être lisible, alors que la forme de la boucle (le seul
 * fait que la card raconte) reste intacte. C'est aussi sous le pixel utile du
 * rendu : une card 1080 px sur un cadrage de 2 km donne ~1,9 m/px, l'écart
 * maximal introduit tient donc dans ~8 px — invisible à l'œil, décisif pour qui
 * essaierait de géolocaliser une habitude.
 *
 * ÉCHELLE, pour situer les trois tolérances du projet (elles ne servent pas la
 * même chose et ne doivent pas être confondues) :
 *   · `GPS_DECIMATE_EPSILON_M` = 2 m  → allègement du PAYLOAD, sous le bruit GPS ;
 *   · `SHARE_SIMPLIFY_EPSILON_M` = 15 m → confidentialité d'un rendu PUBLIC ;
 *   · `territory.ts SIMPLIFY_TOLERANCE_M` = 24 m → lissage des CONTOURS d'hexes.
 *
 * TUNABLE (à la hausse seulement : baisser réduirait la protection annoncée).
 */
export const SHARE_SIMPLIFY_EPSILON_M = 15;

/**
 * §1.5 — « La publication d'un nouveau territoire est différée de 60 minutes
 * par défaut. » Alimente `territories.publish_after` (migration 0074, colonne
 * `not null` SANS défaut : c'est l'ÉCRIVAIN qui décide l'instant, jamais le
 * schéma) et le filtre de la vue publique `public_territories` (0077).
 *
 * ⚠️ SUSPENS ASSUMÉ (27/07/2026) : `supabase/functions/ingest_run/territory.ts`
 * porte encore SA PROPRE copie du littéral `60`, posée là quand game-rules.ts
 * était hors périmètre. Les deux valeurs sont égales aujourd'hui et rien ne le
 * garantit demain. Le déménagement (remplacer la déclaration locale par un
 * import depuis `../_shared/game-rules.ts`) est un changement d'une ligne, mais
 * il touche un fichier tenu par un autre chantier en cours — il est donc
 * inscrit en suspens plutôt que fait à l'aveugle.
 */
export const TERRITORY_PUBLISH_DELAY_MINUTES = 60;

/**
 * §12.1 « supprimer les timestamps détaillés » — granularité (unité
 * `date_trunc` Postgres) à laquelle un horodatage devient PUBLIC. À l'heure :
 * une minute exacte, répétée, trahit une habitude (« il part à 7 h 12 tous les
 * mardis ») ; l'heure suffit à situer un territoire dans le temps sans dessiner
 * un emploi du temps. Lue par la vue `public_territories` (0077), annotée là-bas
 * `-- game-rules: PUBLIC_TIMESTAMP_TRUNC` selon le patron de 0002/0074.
 */
export const PUBLIC_TIMESTAMP_TRUNC = 'hour';
/**
 * Suppression de compte DIFFÉRÉE (RGPD art. 17 + Apple 5.1.1(v)) — politique
 * « Snapchat » : la demande rend le compte INVISIBLE immédiatement (profil,
 * classements, roster crew), puis la purge RÉELLE et irréversible a lieu à
 * l'échéance. Toute reconnexion pendant le délai ANNULE la suppression.
 *
 * 30 jours = standard du secteur (Snapchat, Instagram, X) et borne haute
 * défendable : au-delà, un « soft delete » éternel violerait le droit à
 * l'effacement. La purge est exécutée par le cron `gryd_purge_accounts`
 * (migration 0045) qui appelle public.purge_due_accounts() — sans lui, le
 * compte ne serait jamais supprimé et l'app mentirait.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

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

/**
 * ─── Seuils de densité ANNONCÉS PUBLIQUEMENT ────────────────────────────────
 * Ce que la page publique présente comme la règle de classement d'une zone :
 * combien de coureurs actifs (fenêtre WAR_MODE_WINDOW_DAYS, rayon
 * WAR_MODE_RADIUS_KM) et combien de crews il faut pour qu'une zone soit dite
 * active / émergente / pionnière. Ces valeurs étaient codées EN DUR dans
 * `apps/web/app/components/landing/dictionary.ts` ; elles vivent ici pour
 * qu'un changement de règle change la page du même coup — sinon la landing
 * continue d'annoncer l'ancienne règle, ce qui finit par être un mensonge.
 *
 * HONNÊTETÉ SUR LEUR STATUT (ne pas l'effacer d'une relecture) : seul le palier
 * `active` est aujourd'hui APPLIQUÉ par du code, via WAR_MODE_MIN_ACTIVE_RUNNERS
 * (activation du mode Guerre). `minCrews` et les paliers `emerging` / `pioneer`
 * sont des seuils DÉCLARÉS, pas encore évalués : `city_zones.status` est posé à
 * l'exploitation (Paris + Lille seedées `active` en Saison 0). Tant que c'est le
 * cas, ces nombres s'annoncent comme une RÈGLE (« ce qu'il faut pour »), jamais
 * comme une MESURE (« ce qu'il y a ici »).
 * `active.minCrews` = les « 5 crews actifs » de la version complète du seuil de
 * mode Guerre (docs/product/GRYD_map_zones_sectors_rules.md §4).
 *
 * Publié par : apps/web/app/components/landing/dictionary.ts (section `zones`).
 */
export const ZONE_DENSITY_THRESHOLDS: Record<
  ZoneDensity,
  { readonly minActiveRunners: number; readonly minCrews: number }
> = {
  active: { minActiveRunners: WAR_MODE_MIN_ACTIVE_RUNNERS, minCrews: 5 },
  emerging: { minActiveRunners: 10, minCrews: 2 },
  /** Un seul coureur suffit à ouvrir une zone pionnière — aucun crew requis. */
  pioneer: { minActiveRunners: 1, minCrews: 0 },
  /** Zone sauvage = ABSENCE de densité : aucun seuil à franchir, rien à publier. */
  wild: { minActiveRunners: 0, minCrews: 0 },
};

/** Avant-poste basique (V0) : présence construite en zone peu dense. */
export const OUTPOST_MIN_HEXES = 100;
export const OUTPOST_RADIUS_KM = 2;
/** Secteurs auto-générés MVP : agrégat H3 grossier (arbitrage A3 AMENDEMENT-02). */
export const SECTOR_H3_RESOLUTION = 7;

// ─── Pression & contestation d'un secteur (RÈGLES NON NÉGOCIABLES §C) ────────
// GRYD ne colore pas 200 000 users : il AGRÈGE en secteurs porteurs d'un
// `pressure_score` (0-100) et d'un `status` (5 niveaux). Ces seuils sont la
// SOURCE DE VÉRITÉ consommée par engine/sectors.ts (dérivation démo côté client
// au MVP ; pré-calcul serveur par secteur en V1 — cf. §C « Backend scalable »).
// Toutes les bornes ci-dessous sont TUNABLE (équilibrage jeu, pas structurel).

/**
 * §C — 5 niveaux de contestation pilotés par `pressure_score` (0-100), par
 * BORNE BASSE incluse. Chaque niveau porte un traitement visuel distinct
 * (jamais la couleur seule : forme + icône + animation en plus — daltonisme) :
 *   0 stable   [0-30]   aucune alerte
 *   1 pression [31-60]  halo orange léger + « Canal actif »
 *   2 contestee[61-80]  double contour + violet + « Zone contestée »
 *   4 urgence  [81-100] rouge limité + [DÉFENDRE] + « N zones à sauver »
 * Le niveau 3 « attaque active » n'est PAS une bande de score : c'est une
 * SUR-SIGNALISATION posée sur un secteur en pression/contesté quand une attaque
 * rival est EN COURS (cf. SECTOR_ACTIVE_ATTACK_MAX_H) — d'où l'absence de borne
 * 3 ici. `sectorStatus` combine bande de score + drapeau d'attaque active.
 * TUNABLE.
 */
export const SECTOR_PRESSURE_BANDS = {
  stable: 0,
  pression: 31,
  contestee: 61,
  urgence: 81,
} as const;
export type SectorPressureBand = keyof typeof SECTOR_PRESSURE_BANDS;

/**
 * Niveaux de secteur (0-4) — index STABLE consommé par l'UI (LOD, priorité
 * d'affichage §C). 3 = attaque active (drapeau, pas une bande). Alignés sur les
 * clés de traitement visuel de §C.
 */
export const SECTOR_STATUS_LEVELS = {
  stable: 0,
  pression: 1,
  contestee: 2,
  attaque: 3,
  urgence: 4,
} as const;
export type SectorStatusKey = keyof typeof SECTOR_STATUS_LEVELS;

/**
 * §C — RÈGLE « contesté » (déclenche le traitement violet + double contour).
 * Un secteur est contesté si l'UNE de ces conditions est vraie :
 *   (a) le rival principal détient ≥ RIVAL_MIN ET mon crew ≤ MINE_MAX ;
 *   (b) l'ÉCART |mon_crew − rival_principal| < GAP_MAX (coude à coude) ;
 *   (c) le rival a REPRIS > RECLAIM_ZONES_24H zones sur 24 h (poussée récente).
 * Bornes en FRACTION de contrôle du secteur (0-1). TUNABLE.
 */
export const SECTOR_CONTESTED_RULE = {
  /** (a) part minimale du rival principal pour disputer. */
  rivalMinShare: 0.25,
  /** (a) part maximale de mon crew au-delà de laquelle le secteur est tenu. */
  mineMaxShare: 0.6,
  /** (b) écart max mon_crew↔rival en-deçà duquel c'est un coude-à-coude. */
  closeGapMax: 0.15,
  /** (c) nb de zones reprises par le rival sur 24 h qui force le statut contesté. */
  reclaimZones24h: 8,
} as const;

/**
 * Fenêtre (heures depuis `last_attack_at`) pendant laquelle un secteur est en
 * ATTAQUE ACTIVE (niveau 3 — contour orange fort + pulse) dès lors qu'il est
 * déjà sous pression. Au-delà, l'attaque « refroidit » et le secteur retombe
 * sur sa bande de score. TUNABLE.
 */
export const SECTOR_ACTIVE_ATTACK_MAX_H = 6;

/**
 * §C — `pressure_score = activité rival récente + zones perdues + proximité de
 * bascule + decay`. POIDS (points de score) de chaque composante AVANT plafond
 * à 100. La somme des maxima dépasse 100 à dessein : plusieurs signaux forts se
 * cumulent puis SATURENT (un secteur violemment attaqué ET en decay = 100, pas
 * plus). Chaque composante est un sous-score 0-1 (normalisé côté engine) ×
 * son poids ici. TUNABLE (équilibrage de la lecture de pression).
 */
export const SECTOR_PRESSURE_WEIGHTS = {
  /** Activité rival récente (runs/attaques rival normalisés sur la fenêtre). */
  rivalActivity: 45,
  /** Zones perdues récemment (frontières reprises, normalisé). */
  zonesLost: 30,
  /** Proximité de BASCULE : plus l'écart mon_crew↔rival est faible, plus c'est chaud. */
  flipProximity: 30,
  /** Decay : fraction du secteur dont l'échéance de decay est imminente. */
  decay: 20,
} as const;
export type SectorPressureComponent = keyof typeof SECTOR_PRESSURE_WEIGHTS;

/**
 * Normalisation de l'activité rival : nb de runs/attaques rival récents qui
 * SATURENT la composante `rivalActivity` (au-delà, sous-score = 1). Évite qu'un
 * pic ponctuel n'écrase l'échelle. TUNABLE.
 */
export const SECTOR_RIVAL_ACTIVITY_SATURATION = 20;
/**
 * Normalisation des zones perdues : nb de zones reprises sur la fenêtre qui
 * SATURE la composante `zonesLost`. Aligné sur l'ordre de grandeur de
 * SECTOR_CONTESTED_RULE.reclaimZones24h. TUNABLE.
 */
export const SECTOR_ZONES_LOST_SATURATION = 16;
/** Score de pression borné à [0, 100] — plafond structurel (pas TUNABLE). */
export const SECTOR_PRESSURE_MAX = 100;

// ─── XP joueur (permanent, jamais acheté, survit au reset — AMENDEMENT-02 §6) ─
/** Choix D18 : XP = points territoire bruts de la course (1:1), boosts cosmétiques V1. */
export const XP_RATE_OF_POINTS = 1;

// ═══════════════════════════════════════════════════════════════════════════
// VILLES — LISTE DE DÉMARRAGE (et non plus énumération fermée du monde)
//
// « Dans la création de crew on doit pouvoir choisir n'importe quelle ville. »
// L'Europe entière est capturable (AMENDEMENT-35) : une ville ne peut donc plus
// être un membre d'un enum figé dans le code. `CITIES` ne dit PLUS « voici les
// villes qui existent » — elle dit « voici les villes DÉJÀ PROVISIONNÉES »,
// c'est-à-dire celles qui ont une ligne `city_zones` avec un CONTOUR OFFICIEL
// (migration 0033_real_city_zones.sql, contours geo.api.gouv.fr) et une saison.
// La liste des villes CHOISISSABLES, elle, est le référentiel GeoNames
// (packages/shared/src/cities-eu.ts) — 7 870 villes réelles d'Europe (compte
// MESURÉ dans le fichier livré : `EU_CITIES_COUNT`, 53 pays).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Villes de DÉMARRAGE : seedées 'active' d'office pour la Saison 0, avec un
 * contour RÉEL en base (0033). Leurs identifiants sont historiques et en toutes
 * lettres (`paris`, `lille`) ; toute ville ouverte plus tard depuis le
 * référentiel porte son `geonameid` comme identifiant.
 *
 * ⚠️ CE N'EST PAS LA LISTE DES VILLES EXISTANTES. Ne jamais l'utiliser pour
 * refuser une ville, ni comme source d'un sélecteur de ville : ce serait
 * réintroduire le plafond que la demande fondateur a fait tomber.
 */
export const CITIES = {
  paris: { id: 'paris', name: 'Paris', center: { lat: 48.8566, lng: 2.3522 } },
  lille: { id: 'lille', name: 'Métropole de Lille', center: { lat: 50.6292, lng: 3.0573 } },
} as const;

/**
 * Identifiant d'une ville = `city_zones.city_id`. **Volontairement `string`, et
 * non plus `keyof typeof CITIES`.**
 *
 * L'enum fermé était un PLAFOND DUR : il propageait « il n'existe que deux
 * villes » dans types.ts, dans ingest_run (`b.cityId in CITIES` → 400) et
 * jusque dans les écrans. Une ville est désormais une donnée, pas un membre de
 * type — elle se VALIDE À L'EXÉCUTION contre `city_zones` (autorité serveur),
 * jamais à la compilation.
 *
 * Deux espaces d'identifiants cohabitent, par construction et non par accident :
 *  · les villes de démarrage : `paris`, `lille` (historiques, contour réel) ;
 *  · toute autre ville : son `geonameid` GeoNames en chaîne (« 2988507 »),
 *    identifiant STABLE — c'est lui qui hache le tirage de la Zone du Jour
 *    (migration 0052), un id instable casserait la reproductibilité du tirage.
 */
export type CityId = string;

/** Identifiant d'une ville de DÉMARRAGE — sous-ensemble typé de `CityId`. */
export type StarterCityId = keyof typeof CITIES;

/** Vrai si `id` désigne une ville de démarrage (donc au contour officiel connu). */
export function isStarterCityId(id: string): id is StarterCityId {
  return Object.prototype.hasOwnProperty.call(CITIES, id);
}

/**
 * Centre d'une ville de DÉMARRAGE, ou `undefined` si l'id n'en est pas une.
 * Accès GARDÉ : `CITIES[id]` sur un id venu de la base rendait `undefined`, et
 * `CITIES[id].name` levait un TypeError avalé par le catch global — une course
 * écrite en base mais rendue en 500 au coureur (blocage n°1 de l'audit).
 */
export function starterCityCenter(id: string): { lat: number; lng: number } | undefined {
  return isStarterCityId(id) ? CITIES[id].center : undefined;
}

/**
 * Nom d'affichage d'une ville de DÉMARRAGE, ou `undefined`. Un appelant qui
 * n'obtient rien doit nommer la ville autrement (référentiel, base) ou se
 * taire — jamais inventer un libellé.
 */
export function starterCityName(id: string): string | undefined {
  return isStarterCityId(id) ? CITIES[id].name : undefined;
}

// ─── Aire de jeu d'une ville ouverte depuis le référentiel ──────────────────
/**
 * RAYON du disque servant d'aire de jeu à une ville ouverte depuis le
 * référentiel GeoNames.
 *
 * ⚠️ RÉSERVÉ À LA VOIE EUROPE-VISION, JAMAIS À UNE COMMUNE FRANÇAISE (23/07/2026).
 * En France, une commune ouverte reçoit son CONTOUR ADMINISTRATIF RÉEL
 * (geo.api.gouv.fr, comme 0033) : les communes PARTITIONNENT le territoire, un
 * disque de 15 km autour d'un village en avalerait des dizaines et ferait se
 * chevaucher les pionniers voisins. Ce disque ne subsiste que pour les villes
 * GeoNames hors France, qui ne fournissent qu'un POINT (lat/lng) sans contour —
 * il est alors NOMMÉ « aire de jeu approximative », jamais « limites de la ville ».
 *
 * ⚠️ C'EST UNE APPROXIMATION DÉCLARÉE, PAS UN CONTOUR OFFICIEL. `city_zones.geojson`
 * est NOT NULL et exige un polygone : faute de contour, on pose un disque et on
 * l'annonce comme tel. Approximer une aire de jeu et le DIRE n'est pas fabriquer
 * de la donnée ; la présenter comme un contour administratif le serait.
 *
 * Les villes de DÉMARRAGE (`CITIES` : paris, lille) gardent leur VRAI contour
 * (0033) — ce disque ne les remplace jamais.
 *
 * 15 km : couvre l'aire urbaine courue d'une métropole sans déborder sur la
 * voisine. Ce n'est PAS une borne de capture ; le `cityId` ne sert qu'au
 * rattachement pour les classements. TUNABLE.
 */
export const CITY_DISC_RADIUS_M = 15_000;

/**
 * Nombre de sommets du polygone approximant le disque d'aire de jeu. 64 sommets
 * → écart au cercle parfait < 0,1 % du rayon (soit < 12 m à 15 km), invisible à
 * l'écran, tout en gardant un GeoJSON léger à stocker et à tester en in/out.
 */
export const CITY_DISC_POLYGON_VERTICES = 64;

/**
 * Tolérance de simplification (Douglas-Peucker) du CONTOUR administratif réel
 * d'une commune, en DEGRÉS, avant de l'écrire dans `city_zones.geojson`.
 *
 * POURQUOI. Le contour brut de geo.api.gouv.fr peut porter des milliers de
 * sommets — trop lourd à stocker et à évaluer en point-in-polygon à chaque
 * course. On le simplifie, en gardant sa forme reconnaissable. 0,0003° ≈ 33 m au
 * milieu de la France (miroir des ~30 m retenus pour les contours de 0033) : le
 * joueur ne verra aucune différence, mais le polygone est allégé d'un ordre de
 * grandeur. C'est une constante de CODE (précision géométrique), pas une donnée :
 * la commune (nom, contour) reste réelle, seule sa RÉSOLUTION est bornée. TUNABLE.
 */
export const COMMUNE_CONTOUR_SIMPLIFY_DEG = 0.0003;

// ─── Recherche de ville (le sélecteur ne peut pas lister 7 870 villes) ──────
/**
 * Nombre maximal de villes rendues par une recherche. §A : « comprendre l'écran
 * en moins de 3 s » — une pill par ville tenait à 2 villes, elle est illisible à
 * 7 870. On cherche, on ne parcourt pas. TUNABLE.
 */
export const CITY_SEARCH_RESULT_LIMIT = 25;

/**
 * Longueur minimale d'une requête avant de filtrer. En deçà, l'écran montre les
 * villes les plus peuplées (le référentiel est trié par population) plutôt
 * qu'une liste vide ou 7 870 lignes. TUNABLE.
 */
export const CITY_SEARCH_MIN_QUERY_LENGTH = 2;

// ─── Garde-fou d'OUVERTURE de ville (open_city / provision_city) ────────────
/**
 * Nombre maximal de villes qu'un MÊME compte peut OUVRIR par fenêtre glissante.
 *
 * POURQUOI UN PLAFOND. Ouvrir une ville n'invente aucune donnée de joueur (la
 * zone naît `wild`, le classement naît vide) et le référentiel borne
 * structurellement le monde à 7 870 villes réelles. Le risque n'est donc pas le
 * mensonge, c'est le BRUIT : un compte pouvait provisionner des centaines de
 * villes où personne ne courra jamais, et les faire figurer partout où l'on
 * énumère les villes ouvertes.
 *
 * POURQUOI CE CHIFFRE. 5 couvre très largement l'usage honnête — on ouvre sa
 * ville, éventuellement celle d'un déplacement ou d'un ami. Au-delà, ce n'est
 * plus un joueur qui s'installe. Le plafond REFUSE, il ne dégrade pas
 * silencieusement : la fonction répond `open_quota_reached`, jamais un faux
 * succès. Il ne compte QUE les ouvertures RÉELLES : rouvrir une ville déjà
 * ouverte n'écrit rien, donc ne consomme rien. TUNABLE.
 */
export const CITY_OPEN_LIMIT_PER_USER = 5;

/** Fenêtre glissante du plafond ci-dessus, en heures. TUNABLE. */
export const CITY_OPEN_LIMIT_WINDOW_H = 24;

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

// ─── §43.3 Personnage GRIP — 7 rangs cosmétiques dérivés du niveau joueur ─────
/**
 * Rangs du personnage-mascotte GRIP (une POSE par palier — la bande de référence
 * fondateur : nu → course → loupe → bouclier → drapeau → bandeau → couronne).
 * COSMÉTIQUE PUR : la pose se GAGNE au niveau joueur (§43.1, points de jeu course
 * + contributions), JAMAIS achetée — anti pay-to-win. Bornes basses de NIVEAU (pas
 * une nouvelle courbe : réutilise PLAYER_LEVEL_XP / playerLevelForXp). L'argent
 * n'achète que du cosmétique neutre (skin/frame), jamais un rang.
 */
export const GRIP_RANK_LEVELS = {
  rookie: 1,
  runner: 5,
  scout: 12,
  defender: 20,
  conqueror: 30,
  veteran: 40,
  legend: 50,
} as const;
export type GripRank = keyof typeof GRIP_RANK_LEVELS;

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

// ─── §38.2 Bornes de CRÉATION d'une offensive (garde-fous serveur) ───────────
// Une offensive est un OBJECTIF DE TERRITOIRE que le crew se donne — jamais un
// duel contre un crew nommé (la table n'a aucun opponent_crew_id). Ces bornes
// existent pour qu'un endpoint de création ne puisse pas fabriquer une cible
// absurde (rayon d'un continent, objectif de 1 hex, fenêtre de 10 ans) ni
// noyer le War Room sous 100 objectifs simultanés. Elles sont vérifiées par le
// moteur PUR (engine/offensive.ts) côté serveur, jamais par le client.
// ANTI PAY-TO-WIN : aucune de ces bornes n'est modulée par un statut payant.
/** Durée minimale d'une offensive (h) — sous 6 h, la fenêtre est intenable. */
export const OFFENSIVE_MIN_DURATION_H = 6;
/** Durée maximale d'une offensive (h) — 3 jours ; au-delà ce n'est plus un raid. */
export const OFFENSIVE_MAX_DURATION_H = 72;
/** Avance maximale de programmation d'une offensive (h avant `starts_at`) : 7 j. */
export const OFFENSIVE_MAX_LEAD_TIME_H = 168;
/** Rayon minimal du théâtre d'une offensive (km) — sous 500 m, une seule rue. */
export const OFFENSIVE_RADIUS_KM_MIN = 0.5;
/** Rayon maximal du théâtre d'une offensive (km) — l'échelle d'une ville. */
export const OFFENSIVE_RADIUS_KM_MAX = 10;
/** Objectif minimal en hexes (res H3_RESOLUTION) d'une offensive. */
export const OFFENSIVE_OBJECTIVE_HEXES_MIN = 5;
/** Objectif maximal en hexes (res H3_RESOLUTION) d'une offensive. */
export const OFFENSIVE_OBJECTIVE_HEXES_MAX = 1_000;
/** Longueur min/max du libellé de zone d'une offensive (miroir du CHECK 0010). */
export const OFFENSIVE_ZONE_LABEL_MIN = 1;
export const OFFENSIVE_ZONE_LABEL_MAX = 80;
/** Garde-fou anti-spam : offensives simultanément ACTIVES (ou programmées) par crew. */
export const OFFENSIVE_MAX_ACTIVE_PER_CREW = 3;

// ─── §38.2b Un objectif LÉGITIME (23/07/2026) ────────────────────────────────
/**
 * LE TROU QUE CES TROIS CONSTANTES FERMENT. L'objectif d'une offensive est
 * AUTO-DÉCLARÉ : le crew choisissait librement son rayon (jusqu'à 10 km) et son
 * objectif (plancher ABSOLU de 5 hexes), sans aucun lien entre les deux. Un
 * théâtre de 10 km avec un objectif de 5 hexes rendait donc toute course de
 * 5 hexes « victorieuse » — une victoire que personne n'avait gagnée, et le
 * barème plein avec. C'est la même faute qu'une donnée fabriquée, en habit de
 * règle de jeu.
 *
 * ON NE PUNIT PAS, ON RETIRE L'INTÉRÊT. Deux règles complémentaires, dans la
 * grammaire déjà employée ailleurs (rendements décroissants, plafonds) plutôt
 * que l'interdiction sèche :
 *   1. un PLANCHER RELATIF au théâtre revendiqué → l'absurde devient impossible ;
 *   2. une RÉCOMPENSE PROPORTIONNELLE à l'ambition → se sous-coter ne paie plus.
 * Aucune pénalité, aucun cooldown d'échec : le projet ne punit pas un crew qui
 * n'a pas réussi (cf. LE RELAIS, A-41).
 */
/**
 * Aire de référence d'un hex à `H3_RESOLUTION` (km²). Sert UNIQUEMENT d'échelle
 * pour convertir un rayon en capacité de théâtre, donc à calculer un PLANCHER.
 * ⚠ Jamais affichée : l'aire réelle d'un hex H3 varie d'environ ±20 % selon la
 * latitude, et un projet qui ne ment pas ne montre pas une surface « moyenne »
 * comme si c'était la vraie (le même écueil a déjà été refusé pour la « surface
 * contrôlée »). Pour un seuil, l'approximation est honnête ; pour un chiffre à
 * l'écran, elle ne l'est pas.
 */
export const OFFENSIVE_HEX_AREA_KM2 = 0.015_047_5;
/**
 * Part MINIMALE du théâtre qu'un objectif doit revendiquer. En dessous, le
 * théâtre est une vitrine : on annonce une ville pour aller prendre une rue.
 * À 2 %, un rayon de 10 km exige ~418 hexes (un vrai engagement collectif) et un
 * rayon de 500 m retombe sous le plancher absolu de 5 hexes, qui prend le relais.
 */
export const OFFENSIVE_MIN_OBJECTIVE_RATIO = 0.02;
/**
 * Objectif à partir duquel la récompense est PLEINE. En dessous, elle est
 * proportionnelle : promettre peu rapporte peu. Volontairement bien sous le
 * maximum (1 000) — l'ambition maximale n'est pas exigée pour le barème plein,
 * seulement un engagement sérieux.
 */
export const OFFENSIVE_FULL_AWARD_OBJECTIVE_HEXES = 300;
/**
 * Part plancher de la récompense : une offensive modeste mais RÉELLEMENT gagnée
 * crédite toujours quelque chose. On réduit l'intérêt de se sous-coter, on
 * n'annule pas l'effort de ceux qui ont couru.
 */
export const OFFENSIVE_MIN_AWARD_SHARE = 0.25;

// ─── §38.3 Clôture d'une offensive : ce qui est crédité, et à qui ────────────
/**
 * Part de CREW_XP_SOURCES.offensiveCompleted / CREW_CHEST_WEIGHTS.offensiveCompleted
 * effectivement créditée au crew à la clôture, selon le résultat (§38.3).
 * Un échec ne crédite RIEN — pas de lot de consolation qui mentirait sur l'effort.
 */
export const OFFENSIVE_RESULT_AWARD_FACTOR = {
  fail: 0,
  partial: 0.5,
  victory: 1,
} as const;
/**
 * Hexes minimaux apportés à une offensive pour qu'elle compte comme « rejointe »
 * (métrique badge `offensivesJoined` — famille Raid Leader, skill Strategist).
 * Rejoindre = avoir RÉELLEMENT pris du terrain dans le théâtre, pas cliquer.
 */
export const OFFENSIVE_JOINED_MIN_HEXES = 1;

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

// ─── §E07 « Connexion par e-mail » — le RENVOI APRÈS DÉLAI ───────────────────
/**
 * §E07 (spec produit l.735, état « renvoi après délai ») — secondes à attendre,
 * après un envoi ACCEPTÉ par le serveur, avant que « Renvoyer le lien » soit
 * armé.
 *
 * 60 s, et ce n'est PAS un choix d'ergonomie : c'est la cadence RÉELLE de
 * l'expéditeur. GoTrue applique un `SMTP_MAX_FREQUENCY` (60 s par défaut, la
 * valeur de l'expéditeur intégré Supabase que ce projet utilise — cf. l'entête
 * de `apps/mobile/src/lib/auth.web.ts` sur le plan gratuit) : un second envoi
 * demandé plus tôt est REFUSÉ (`over_email_send_rate_limit`). Armer le bouton
 * avant ce délai peindrait donc une action qui échoue toujours — exactement le
 * bouton mort que la constitution §2 interdit. Le compte à rebours ne « punit »
 * personne : il DIT l'attente que le serveur impose de toute façon.
 *
 * ⚠️ CE NOMBRE DÉCRIT UN SERVEUR, il ne le commande pas. Si l'expéditeur change
 * (SMTP personnalisé, `SMTP_MAX_FREQUENCY` différent), c'est ICI qu'on le
 * recale — et l'écran suit. Le descendre sous la cadence réelle réarmerait un
 * bouton condamné à un refus ; le monter au-delà ferait attendre pour rien.
 *
 * Ce n'est pas la durée de vie du lien (1 h côté GoTrue, `mailer_otp_exp`) :
 * celle-là est dite au joueur en copie (catalog/authEmail `sentHint`) et n'est
 * pas une constante de jeu — l'app ne la mesure jamais, elle la subit.
 */
export const AUTH_EMAIL_RESEND_DELAY_S = 60;

// ─── §E08 « Création du profil minimal » — le @handle, en pièces nommées ─────
// `HANDLE_REGEX` ci-dessus reste LE juge (il est le miroir exact du `check` de
// la migration 0011 et de la RPC 0047 : on ne le dérive pas d'une concaténation
// de constantes, sinon un jour la base et le client ne diraient plus la même
// chose). Ce qui suit l'ÉCLATE en pièces utilisables par l'écran — longueurs,
// jeu de caractères, cadence de vérification, nombre de repêchages — parce que
// E08 doit AFFICHER « 3 caractères minimum », filtrer la frappe et rythmer ses
// requêtes, et qu'aucune de ces trois choses ne se fait avec une regex ancrée.
//
// ⚠️ INVARIANT : ces trois-là DÉCRIVENT `HANDLE_REGEX`, elles ne le
// redéfinissent pas. Changer l'un sans l'autre casse le contrat client/serveur.

/** §E08 — longueur minimale d'un @handle. Miroir de `HANDLE_REGEX` / 0011. */
export const HANDLE_MIN_LENGTH = 3;
/** §E08 — longueur maximale d'un @handle. Miroir de `HANDLE_REGEX` / 0011. */
export const HANDLE_MAX_LENGTH = 20;
/**
 * §E08 — jeu de caractères autorisé, exprimé CARACTÈRE PAR CARACTÈRE (non
 * ancré, contrairement à `HANDLE_REGEX`). Sert au FILTRE de saisie : l'écran
 * écarte la frappe interdite au lieu de laisser taper puis de gronder. ASCII
 * strict et volontairement : le @handle sert d'identifiant d'URL publique
 * (`profileLink.ts`) — un accent y serait ré-encodé, et deux graphies
 * différentes pourraient viser le même profil.
 */
export const HANDLE_ALLOWED_CHAR_REGEX = /[a-z0-9_]/;
/**
 * §E08 « handle vérifié en temps réel avec debounce » — repos (ms) après la
 * dernière frappe avant d'interroger `check_handle_available` (RPC 0047).
 *
 * 450 ms : au-dessus de l'intervalle entre deux frappes d'une saisie normale
 * (~150-250 ms), donc un pseudo tapé d'un trait ne déclenche QU'UNE requête au
 * lieu d'une par caractère ; en dessous du seuil où le verdict paraît en retard
 * sur la frappe. Le champ n'est JAMAIS gelé pendant ce délai (handleCheck.ts
 * règle 2) : ce nombre borne un TRAFIC, il ne bloque aucune saisie.
 *
 * SUSPENS REFERMÉ (27/07/2026) : `apps/mobile/src/features/social/handleCheck.ts`
 * — le SEUL module qui exécute réellement ce debounce et ce seuil — importe
 * désormais ces deux constantes au lieu d'en porter une copie
 * (`DEBOUNCE_MS = HANDLE_CHECK_DEBOUNCE_MS`, `MIN_LEN = HANDLE_MIN_LENGTH`).
 * Changer la valeur ici change donc le comportement, ce qui n'était pas le cas
 * tant que le littéral 450 vivait là-bas.
 */
export const HANDLE_CHECK_DEBOUNCE_MS = 450;
/**
 * §E08 « suggestions en cas d'indisponibilité » — combien on en propose.
 *
 * TROIS. §A (« 1 écran = 1 décision », « comprendre l'écran en moins de 3 s ») :
 * les suggestions sont un REPÊCHAGE sous un champ, pas un menu. Trois pills de
 * ~20 caractères tiennent sur une ligne à 375 px sans troncature (§A : aucun
 * texte d'action coupé) ; six en imposeraient deux et transformeraient un
 * dépannage en second choix à faire. C'est aussi le plancher de la fourchette
 * « 3 à 6 choix maximum » que la spec pose pour l'éditeur E36.
 *
 * Ce nombre borne l'AFFICHAGE. Il n'affirme rien sur la disponibilité : chaque
 * suggestion reste soumise au serveur au moment de l'enregistrement, exactement
 * comme une saisie manuelle (le client n'attribue jamais un @handle).
 */
export const HANDLE_SUGGESTION_COUNT = 3;

/**
 * Anti-collusion (§11, approx MVP) : nombre d'alternances de reprise d'un même
 * hex entre les DEUX mêmes crews au-delà duquel le bonus vol est retiré (statut
 * `stats_only`). Une « alternance » = un changement de crew possédant l'hex.
 */
export const COLLUSION_MAX_ALTERNATIONS = 3;

// ─── AMENDEMENT-41 : sorties de groupe — LE RELAIS ────────────────────────────
/**
 * Plafond QUOTIDIEN de points de RELAIS (`co_captured`) par compte. Le relais
 * paie une part 1/rang de la valeur d'un hex fraîchement pris par un autre
 * coureur (loi harmonique — AUCUN barème : `coCaptureShare` dans engine/social).
 * Ce cap borne le rendement d'une ferme multi-comptes en attendant la
 * séparation plausible des traces (A-41 §5.3). Ordre de grandeur : la valeur
 * d'une boucle solo type (~200 hexes × POINTS_BASE_PER_ZONE).
 * Distinct de MAX_CLAIMS_PER_DAY : un relais n'est PAS un claim (il n'écrit
 * jamais lock/decay/owner) et ne consomme pas ce plafond-là.
 */
export const CO_CAPTURE_DAILY_POINTS_CAP = 2_000;

// ─── Mission dynamique RÉELLE (repositionnement « mission-first ») ────────────
/**
 * Fenêtre « ta zone expire bientôt » : une zone à MOI dont le decay tombe dans
 * moins de MISSION_DEFEND_WINDOW_H devient LA mission prioritaire (« défends X
 * avant {h} h »). Au-delà, la mission bascule sur l'extension de territoire.
 * 100 % dérivée de données RÉELLES (hex_claims.decay_at) — jamais une urgence
 * fabriquée (règle zéro-mensonge).
 */
export const MISSION_DEFEND_WINDOW_H = 72;

// ─── AMENDEMENT-41 §4 Bonus de capture COLLECTIF (CAPÉ, anti pay-to-win) ──────
/**
 * Avantage de groupe #1 — bonus de VITESSE de remplissage du contrôle d'un hex
 * quand plusieurs coéquipiers du MÊME crew capturent ENSEMBLE (co-présents sur
 * la capture). Barème croissant PLAFONNÉ par nombre de runners.
 *
 * Anti pay-to-win (constitution §52) : ce bonus se GAGNE par l'effort collectif
 * (courir ensemble, au même endroit, au même moment) — il ne s'ACHÈTE JAMAIS.
 * Il s'applique UNIQUEMENT à la vitesse de remplissage du contrôle (le temps
 * pour verrouiller l'hex), JAMAIS aux points bruts ni au territoire gagné, et
 * il est CAPÉ (+40 % absolu) pour qu'un gros crew ne « steamroll » pas par le
 * nombre. Le SOLO reste viable : 1 runner = +0 %, aucune pénalité.
 *
 * Indexé par nombre de coéquipiers présents : idx 0 et 1 → 0 % (solo = plancher),
 * 2 → +15 %, 3 → +25 %, 4 → +35 %, 5+ → +40 % (dernier pas = cap absolu, indices
 * au-delà de la table saturent au cap). Barème monotone croissant.
 */
export const GROUP_CAPTURE_BONUS_BY_RUNNERS: readonly number[] = [0, 0, 0.15, 0.25, 0.35, 0.4];
/** Cap ABSOLU du bonus de capture collectif (part 0-1). Jamais dépassé. */
export const GROUP_CAPTURE_BONUS_MAX_PCT = 0.4;

// ─── AMENDEMENT-41 §4 Crew Streak (avantage de groupe #2, se GAGNE) ───────────
/**
 * Avantage de groupe #2 — le STREAK crew (le streak PERSO existe déjà :
 * STREAK_* §MVP). Récompense la RÉGULARITÉ collective : nombre de jours où le
 * crew est resté actif d'affilée. Bornes BASSES (accessible dès le 1er jour),
 * paliers cosmétiques/fonctionnels sains — jamais un gain de territoire ou de
 * points (anti pay-to-win) : `bonus` ouvre un bonus de coffre capé (déjà borné
 * ailleurs), `premiumBadge` est purement un statut COSMÉTIQUE.
 *
 * jours actifs → tier (borne basse, on prend le plus haut palier franchi) :
 *  1 j  → `active`        (streak amorcé)
 *  3 j  → `bonus`         (le crew débloque son bonus de régularité)
 *  7 j  → `chestPlus`     (coffre amélioré — plafond de coffre inchangé)
 *  30 j → `premiumBadge`  (badge premium — COSMÉTIQUE/statut, zéro gameplay)
 */
export const CREW_STREAK_THRESHOLDS = {
  active: 1,
  bonus: 3,
  chestPlus: 7,
  premiumBadge: 30,
} as const;
/** Tier de streak crew ('none' = sous le 1er palier, streak non amorcé). */
export type CrewStreakTier = 'none' | keyof typeof CREW_STREAK_THRESHOLDS;

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
 * le défaut MVP.
 *
 * SANS CONSOMMATEUR depuis le 23/07/2026, et c'est VOULU : son seul appelant
 * était le seed de rivalité fabriquée (`rivalry_night_canal`), retiré ci-dessous.
 * La RÈGLE de durée, elle, reste valide — ne pas la supprimer comme du code mort :
 * elle s'appliquera à la première rivalité entre deux crews RÉELS.
 */
export const RIVALRY_DURATION_H = 48;

/**
 * Seeds MVP des challenges (motivation §15-§16, seed 0012). DATA du catalogue :
 * la migration 0012 les insère telles quelles. Aucun nombre magique ailleurs.
 *  - solo Consistency II : 3 courses/semaine ;
 *  - solo Distance : 10 km cumulés ;
 *  - solo Defense : 30 hexes défendus ;
 *  - crew Defense Week : 300 hexes collectifs, minimum perso 20 (§8.3).
 *
 * RETIRÉ (23/07/2026) : le seed `rivalry_night_canal`. Il décrivait une rivalité
 * INVENTÉE — « Night Pacers vs Canal », « Paris Est » — c'est-à-dire deux crews
 * et un terrain qui n'ont jamais existé. AMENDEMENT-47 a purgé le code de démo
 * mais pas les seeds : la ligne vivait encore en base (`visibility: 'public'`,
 * `target: 0`, donc « atteinte » d'emblée) et sa recette restait déclarée ICI,
 * dans la source unique des règles. La migration 0062 supprime la ligne, ceci
 * supprime la recette. Aucun consommateur (catalog.ts ne lit que les 4 seeds
 * ci-dessus). Une vraie rivalité se créera entre deux crews RÉELS ou pas du tout.
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
 * ─── §8.2 spec unifiée — MAX_CLOSURE_DISTANCE, tolérance ADAPTATIVE bornée ──
 *
 * La spec (27/07/2026, audit GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md décision D-19)
 * demande `MAX_CLOSURE_DISTANCE = max(35 m, 2,5 × précision GPS médiane)` : une
 * tolérance qui s'ASSOUPLIT quand le signal GPS de la course est mauvais
 * (canyon urbain, forêt) au lieu de rejeter injustement une boucle honnête
 * fermée avec un GPS dégradé.
 *
 * MAIS `LOOP_CLOSE_TOLERANCE_M` (80 m, ci-dessus) a été DURCI
 * VOLONTAIREMENT de 100 → 80 m par AMENDEMENT-16 §2 pour FERMER un vecteur
 * d'abus : sans plafond, une tolérance purement adaptative REROUVRIRAIT
 * exactement ce vecteur — il suffirait d'invoquer une précision GPS dégradée
 * (vraie ou falsifiée côté client) pour obtenir une tolérance de fermeture
 * arbitrairement large, et donc « fermer » une boucle à 200 ou 300 m de son
 * point de départ.
 *
 * RÉSOLUTION — les deux règles cohabitent, aucune n'est sacrifiée :
 * `maxClosureDistanceM` borne l'adaptatif de la spec PAR le plafond durci
 * d'AMENDEMENT-16 §2 : `max(35, min(LOOP_CLOSE_TOLERANCE_M, 2,5 × accuracyMedianM))`.
 *  - GPS EXCELLENT (accuracyMedianM petit) → la tolérance retombe vers le
 *    PLANCHER 35 m (jamais en dessous : même un GPS parfait garde une marge
 *    physique de fermeture) ;
 *  - GPS MÉDIOCRE (accuracyMedianM grand) → la tolérance MONTE avec le signal
 *    réellement mesuré sur CETTE course, mais ne dépasse JAMAIS les 80 m
 *    durcis par AMENDEMENT-16 §2 — le plafond anti-abus reste absolu.
 * PURE (aucune horloge, aucun I/O, aucun état) — testée dans
 * `game-rules.test.ts` (bornes basse/haute + cas nominal).
 */
export const MAX_CLOSURE_DISTANCE_FLOOR_M = 35;
/** Facteur de la spec §8.2 : tolérance adaptative = ce facteur × précision GPS médiane (m). */
export const MAX_CLOSURE_DISTANCE_ACCURACY_FACTOR = 2.5;
/**
 * Tolérance de fermeture EFFECTIVE d'une boucle pour une course donnée, à
 * partir de la précision GPS MÉDIANE (m) de ses points. Voir le commentaire
 * ci-dessus pour le raisonnement complet (spec adaptative × plafond durci
 * AMENDEMENT-16 §2). `accuracyMedianM` doit être ≥ 0 ; une valeur négative ou
 * non finie n'est pas de la responsabilité de cette fonction PURE — le moteur
 * GPS (packages/engine) est seul responsable de fournir une médiane valide.
 */
export function maxClosureDistanceM(accuracyMedianM: number): number {
  const adaptive = MAX_CLOSURE_DISTANCE_ACCURACY_FACTOR * accuracyMedianM;
  return Math.max(MAX_CLOSURE_DISTANCE_FLOOR_M, Math.min(LOOP_CLOSE_TOLERANCE_M, adaptive));
}
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
/**
 * §8.2 spec unifiée — `MIN_POLYGON_AREA` : aire minimale (m²) d'un polygone de
 * capture pour être RETENU comme zone (27/07/2026, décision D-19). En dessous,
 * le polygone existe géométriquement mais ne capture rien — même traitement
 * que `loopRejectedReason` (course VALIDE, intérieur refusé).
 *
 * ⚠ CE PLANCHER EST PLUS PERMISSIF que le plancher IMPLICITE actuel du dépôt :
 * tant que la propriété reste hexagonale (H3_RESOLUTION = 10), la plus petite
 * unité capturable est UNE cellule, dont l'aire de référence
 * (`OFFENSIVE_HEX_AREA_KM2` = 0,015 047 5 km² = 15 047,5 m², cf. §38.2b
 * ci-dessous) dépasse déjà ce seuil de 5 000 m². `MIN_POLYGON_AREA_M2` ne
 * remplace donc PAS ce plancher hexagonal tant que le stockage reste H3 — il
 * devient l'autorité le jour où le polygone GeoJSON devient la donnée de
 * capture (arbitrage A1/A1-bis, ARBITRAGES_SPEC_2026.md) : c'est la constante
 * que ce futur moteur polygonal devra lire, posée ICI pour que la migration ne
 * l'invente pas au dernier moment.
 */
export const MIN_POLYGON_AREA_M2 = 5_000;

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
 * Cap DUR d'aire capturable d'une boucle (km²), en PLUS de la table par
 * distance (doc §9 « surface_max = distance × 0,18 capée à 3 km² »,
 * AMENDEMENT-23 §D). loopMaxAreaM2 borne le résultat de l'extrapolation par
 * distance à ce plafond : même un run de 25 km ne capture jamais plus de
 * 3 km² d'intérieur. TUNABLE.
 */
export const LOOP_MAX_AREA_CAP_KM2 = 3.0;
/**
 * GPS trust MINIMAL (0-100) pour qu'une boucle capture son INTÉRIEUR plein
 * (doc §5 « GPS trust : minimum 80 / 100 », AMENDEMENT-23 §D). En deçà, la
 * boucle reste une COURSE VALIDE et son couloir est pris, mais son intérieur
 * n'est PAS attribué (gate anti-abus : une boucle au GPS douteux ne crée pas de
 * zone pleine). Aligné sur VERIFY_FULL_MIN (80). TUNABLE.
 */
export const LOOP_MIN_GPS_TRUST = 80;
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
 * calcul exotique) : durcie 60 → 80 m (AMENDEMENT-23 §D, doc §5 « largeur
 * moyenne minimum : 80 m ») ≈ ~3 zones res 10 de large. En deçà (aller-retour
 * sur deux rues parallèles très proches) : course valide, intérieur REFUSÉ —
 * loopRejectedReason='narrow', copy gelée : « Zone non capturée : forme trop
 * étroite. »
 */
export const LOOP_MIN_WIDTH_M = 80;
/**
 * Mise en scène de la boucle (AMENDEMENT-12 §C — PRÉSENTATION, pas des règles
 * serveur) : « Boucle ouverte » (pointillé position → départ) sous 600 m,
 * aperçu de la zone fantôme + « Ferme ta boucle » sous 300 m (chiffre spécifié
 * par l'amendement, d'où sa place ici et pas dans un fichier UI).
 */
export const LOOP_HINT_DISTANCE_M = 600;
export const LOOP_PREVIEW_DISTANCE_M = 300;

// ─── E00 « Splash / restauration de session » (spec produit l.547-577) ───────
/**
 * Seuil (ms) au-delà duquel le splash E00 a le DROIT de montrer un indicateur
 * discret. En dessous, RIEN ne bouge : un démarrage à froid normal (session
 * déjà en cache, aucune course interrompue) se résout en quelques dizaines de
 * millisecondes, et faire clignoter un spinner sur cette durée fabrique une
 * impression de lenteur que l'app n'a pas.
 *
 * Chiffre SPÉCIFIÉ par la spec (« indicateur discret uniquement si le
 * chargement dépasse 600 ms », l.550) — d'où sa place ici et non dans un
 * fichier UI, exactement comme LOOP_HINT_DISTANCE_M au-dessus, lui aussi une
 * mise en scène chiffrée par la spec.
 *
 * ⚠ Ce n'est PAS un délai maximum : le splash ne « part » jamais tout seul au
 * bout de 600 ms. Il part quand la séquence de démarrage a réellement fini
 * (features/boot/bootSequence.ts). Ce seuil ne gouverne QUE l'apparition de
 * l'indicateur — un chargement n'affirme rien sur le joueur.
 */
export const SPLASH_INDICATOR_DELAY_MS = 600;

// ═══════════════════════════════════════════════════════════════════════════
// §9 spec unifiée — Contestation & défense POLYGONALE (27/07/2026, audit
// GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md décision D-19, architecture A1/A1-bis
// ARBITRAGES_SPEC_2026.md). CE MÉCANISME N'EXISTAIT PAS AVANT : une boucle
// RIVALE VALIDE qui recouvre suffisamment un polygone déjà possédé rend ce
// polygone CONTESTÉ, ouvrant une fenêtre de temps pendant laquelle le
// propriétaire peut le DÉFENDRE (§9.3) avant transfert automatique (§9.4).
//
// ⚠ À NE PAS CONFONDRE avec deux mécanismes EXISTANTS qui portent des noms
// voisins mais gouvernent autre chose :
//  · DEFENSE_HOURS_TRAVERSE/LONGE/COVER (plus haut, §3.3) REPOUSSENT
//    l'échéance de DECAY d'une zone déjà possédée quand son propriétaire la
//    re-parcourt — aucun rival n'est impliqué, ce n'est pas une contestation.
//  · SECTOR_CONTESTED_RULE / SECTOR_PRESSURE_* (plus bas, RÈGLES §C) évaluent
//    la pression à l'échelle d'un SECTEUR entier (agrégat, `pressure_score`
//    0-100) — pas la contestation d'UN polygone précis par UNE boucle rivale.
// Les trois cohabitent : un secteur peut être « sous pression » (agrégat)
// pendant qu'un seul de ses polygones est « contesté » (ce mécanisme) suite à
// une boucle rivale précise.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * §9.1 — Seuil d'INTERSECTION déclenchant la contestation : une boucle rivale
 * valide dont le polygone recouvre CETTE fraction (0-1) — ou davantage — du
 * polygone possédé le fait passer CONTESTÉ. En dessous, le recouvrement est
 * un simple frôlement de frontière (déjà géré par le §8.6 « recouvrement » à
 * la capture), pas une remise en jeu de la zone entière.
 * Valeur de départ RECOMMANDÉE par la spec (§9.1, 27/07/2026) : 60 %.
 * TUNABLE (équilibrage), comme les autres seuils d'intersection du dépôt
 * (cf. SECTOR_CONTESTED_RULE).
 */
export const CONTEST_INTERSECTION_THRESHOLD = 0.6;

/**
 * §9.1 — Fenêtre de DÉFENSE de base (heures) une fois un polygone déclaré
 * contesté : délai avant transfert automatique (§9.4) si aucune défense
 * valide (§9.3) n'est enregistrée entre-temps. Valeur de départ RECOMMANDÉE
 * par la spec : 18 h. C'est le NIVEAU 0 de fortification (§9.2) — voir
 * `FORTIFICATION_WINDOW_HOURS_BY_LEVEL` ci-dessous, qui LE RÉFÉRENCE plutôt
 * que de dupliquer 18 en dur, pour qu'un changement de cette base ne puisse
 * pas désynchroniser le niveau 0 de la table de fortification par oubli.
 */
export const BASE_DEFENSE_WINDOW_HOURS = 18;

/**
 * §9.2 — Fortification : niveaux DISCRETS 0→3, chacun portant sa propre
 * fenêtre de défense (heures) avant transfert, visibles par un bouclier
 * simple à l'écran. « Le niveau dépend des défenses récentes et décroît avec
 * le temps » (spec §9.2) : la DÉRIVATION du niveau courant d'un polygone
 * (nombre de défenses réussies récentes, décroissance temporelle) est une
 * responsabilité du MOTEUR (packages/engine, à construire — hors périmètre de
 * ce fichier de constantes), jamais de cette table, qui ne fait que MAPPER un
 * niveau déjà déterminé vers sa fenêtre en heures.
 * Index = niveau de fortification (0-3). Niveau 0 = `BASE_DEFENSE_WINDOW_HOURS`
 * (référencé, jamais dupliqué). Valeurs de départ RECOMMANDÉES par la spec :
 * 18 / 24 / 30 / 36 h. « Il n'est jamais achetable » (spec §9.2) : AUCUN palier
 * de cette table n'est modulé par un statut payant — anti pay-to-win, comme
 * FRESH_CAPTURE_PROTECT_HOURS et le reste de la protection temporelle §3.3.
 */
export const FORTIFICATION_WINDOW_HOURS_BY_LEVEL = [
  BASE_DEFENSE_WINDOW_HOURS,
  24,
  30,
  36,
] as const;
export type FortificationLevel = 0 | 1 | 2 | 3;

/**
 * §9.2 — LE NIVEAU MAXIMUM, DÉRIVÉ DE LA TABLE PLUTÔT QUE RECOPIÉ. Il vaut
 * exactement la borne haute de la contrainte SQL `territories_defense_level_check`
 * (supabase/migrations/0074_territories_polygon.sql : `between 0 and 3`) : la
 * base et le jeu doivent bouger ENSEMBLE, et le seul moyen de le garantir est
 * que personne n'écrive « 3 » une deuxième fois.
 */
export const FORTIFICATION_LEVEL_MAX = FORTIFICATION_WINDOW_HOURS_BY_LEVEL.length - 1;

/**
 * LE NIVEAU DE PROTECTION AFFICHABLE — une seule fonction pour toute l'app.
 *
 * ⚠ POURQUOI ELLE VIT ICI, ET PAS DANS UN ÉCRAN. Elle existait en DEUX
 * exemplaires, dans deux dossiers que Metro ne partage pas : `features/map/
 * zoneDetail.ts` (`zoneProtectionLevel`, qui rejetait > 3) et `features/run/
 * resultVariant.ts` (`displayableProtection`, qui n'avait AUCUNE borne haute).
 * Le docblock du premier revendiquait « une seule vérité dans l'app » — c'était
 * faux : sur une ligne `territories` dont `defense_level` vaudrait 4 (contrainte
 * contournée, migration future, lecture corrompue), la feuille de carte masquait
 * la protection pendant que l'écran de Résultat imprimait « niveau 4 ». Deux
 * écrans, deux vérités sur le MÊME fait de jeu. Les deux appelants délèguent
 * désormais ici, et aucun test ne peut plus les voir diverger sans le dire.
 *
 * `null` = RIEN À AFFICHER, et couvre trois situations qu'on ne peint jamais :
 *  · `0` — la valeur par défaut d'un territoire jamais fortifié. Ce n'est pas
 *    « niveau 0 de protection », c'est « aucune fortification » : peindre un
 *    bouclier vide serait le « 0 nu » que la charte interdit ;
 *  · non entier / non fini / absent — un niveau est un palier discret ;
 *  · hors bornes — une valeur qu'on ne sait pas lire ne devient pas un chiffre.
 */
export function displayableFortificationLevel(
  level: number | null | undefined,
): number | null {
  if (typeof level !== 'number' || !Number.isFinite(level)) return null;
  if (!Number.isInteger(level)) return null;
  if (level < 1 || level > FORTIFICATION_LEVEL_MAX) return null;
  return level;
}

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
// E19 — ACQUISITION GPS / PRÊT : LES TROIS BANDES DE L'ANNEAU DE PRÉCISION
// (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1100-1104 — « vert :
//  précision ≤ 15 m ; orange : 16-30 m ; rouge : > 30 m »).
//
// POURQUOI CES DEUX CONSTANTES N'EN DOUBLENT AUCUNE. Le fichier portait déjà
// TROIS seuils de précision, et pas un ne dit ce que dit la spec E19 :
//   · `POINT_MAX_ACCURACY_M` = 25 — filtre de CLAIM §3.2 (un point plus flou ne
//     capture pas). Verdict serveur sur un point ENREGISTRÉ ;
//   · `GPS_ACCURACY_MAX_M` = 35 — filtre d'AFFICHAGE de `cleanTrace` (au-delà,
//     le point est un outlier et sort de la trace) ;
//   · `GPS_ACCURACY_GOOD_M` = 10 — précision « excellente » qui met la
//     composante accuracy du GPS Trust à 1 (une NOTE, pas un feu tricolore).
// E19 parle d'autre chose : ce que l'anneau montre AVANT le départ, quand
// aucune trace n'existe encore. Réutiliser 10/25/35 aurait peint un anneau
// rouge à 26 m là où la spec le veut orange, et surtout aurait fait dépendre un
// message d'attente d'un seuil anti-triche — deux idées qui doivent pouvoir
// bouger séparément.
//
// CE QUE CES SEUILS NE FONT PAS : décider d'un claim. Le serveur « garde la
// précision réelle de chaque point » (spec l.1106) et reste seul juge. Un
// départ en bande orange enregistre une sortie parfaitement valide dont
// certains points seront simplement écartés du claim par §3.2.
// ═══════════════════════════════════════════════════════════════════════════

/** E19 — bande VERTE : précision ≤ 15 m, l'acquisition est « Prêt ». */
export const GPS_READY_ACCURACY_M = 15;
/** E19 — bande ORANGE : 16-30 m ; au-delà de 30 m, bande ROUGE. */
export const GPS_USABLE_ACCURACY_M = 30;

/**
 * L'état de l'anneau E19. QUATRE valeurs et pas trois : `unknown` est l'état
 * « aucun fix reçu pour l'instant » — la lecture EN COURS, que la charte
 * interdit de confondre avec un mauvais signal. Un anneau rouge affiché avant
 * le premier fix affirmerait que le GPS est mauvais alors que personne ne sait
 * encore rien.
 */
export type GpsAccuracyGrade = 'unknown' | 'ready' | 'usable' | 'poor';

/**
 * Précision horizontale (m) → bande E19. Fonction PURE, sans horloge ni I/O :
 * elle est l'unique traduction du feu tricolore, pour que l'anneau, le libellé,
 * l'état du bouton `DÉMARRER MAINTENANT` et l'analytics ne puissent pas se
 * contredire.
 *
 * `null` / `undefined` / non-fini / négatif ⇒ `'unknown'`. Une précision
 * négative est ce que renvoient certaines plateformes quand le fix est
 * invalide : la traiter comme « ≤ 15 m » aurait affiché « Prêt » sur une
 * position inexistante.
 *
 * LECTURE DES DEUX PHRASES DE LA SPEC (l.1097-1098), à l'usage des écrans :
 * « bouton `DÉMARRER MAINTENANT` lorsque le seuil est acceptable » ⇒ `'ready'` ;
 * « lien `Démarrer quand même` seulement si la précision reste exploitable »
 * ⇒ `'usable'`. En `'poor'` comme en `'unknown'`, aucun des deux n'est peint :
 * un bouton qui promet un départ propre sur un signal absent est le bouton mort
 * que la constitution interdit. La spec ne nomme pas explicitement quelle bande
 * est « exploitable » — c'est la seule lecture qui laisse les trois bandes
 * distinctes, et elle est isolée ICI pour qu'un arbitrage la change en un point.
 */
export function gpsAccuracyGrade(accuracyM: number | null | undefined): GpsAccuracyGrade {
  if (typeof accuracyM !== 'number' || !Number.isFinite(accuracyM) || accuracyM < 0) {
    return 'unknown';
  }
  if (accuracyM <= GPS_READY_ACCURACY_M) return 'ready';
  if (accuracyM <= GPS_USABLE_ACCURACY_M) return 'usable';
  return 'poor';
}

// ═══════════════════════════════════════════════════════════════════════════
// E25 — SÉCURITÉ PENDANT L'ACTIVITÉ (spec produit, l.1219-1232 : « appeler les
// secours selon pays »).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Numéro d'urgence unique européen. Ce n'est pas un choix produit : c'est le
 * numéro imposé dans tout l'EEE (directive « service universel »), joignable
 * gratuitement depuis tout mobile, y compris hors abonnement. Le terrain de jeu
 * de GRYD est l'Europe (AMENDEMENT-35), donc un seul numéro couvre le
 * périmètre réel du jeu.
 *
 * ⚠ RÈGLE D'USAGE, aussi contraignante que la valeur : hors d'un pays que l'app
 * SAIT être en Europe, l'écran E25 ne pré-remplit AUCUN numéro et se contente
 * d'ouvrir le composeur. Deviner un numéro national (911, 999, 000…) sur une
 * position mal résolue serait un « bouton mort » dont le coût ne se mesure pas
 * en rétention. On n'invente pas un numéro de secours — jamais.
 */
export const EMERGENCY_NUMBER_EUROPE = '112';

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

/**
 * Bannière crew (§21.5) — cosmétique d'identité, seul prix Éclats qui subsiste
 * de l'ancien bloc « objets fonctionnels capés » (doc §20).
 *
 * SUPPRIMÉS ici par AMENDEMENT-40 §2 / AMENDEMENT-45 §2 : `STREAK_GEL_ECLATS`
 * (60) et `SCOUT_PING_ECLATS` (120), comme `SHIELD_EXTRA_ECLATS` (90) plus
 * haut. Les objets fonctionnels n'ont plus de prix — voir
 * FUNCTIONAL_ITEM_ACQUISITION (§3.4).
 */
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
 *
 * ANTI PAY-TO-WIN (AMENDEMENT-40 §2) : AUCUNE clé d'objet FONCTIONNEL ici. Un
 * pack payant qui crédite un `streak_gel` (c'était le cas du Starter Pack à
 * 2,99 €) vend une PROTECTION — « ni directement, ni via une monnaie
 * achetable » vaut a fortiori pour un pack en euros. Invariant gelé par
 * `supabase/functions/ingest_run/anti_pay_to_win_test.ts`.
 */
export const SKU_GRANTED_ITEM_KEYS = {
  starter_pack: [
    'skin_trace_neon_ivory',
    'frame_road',
    'template_first_zone',
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

// ─── Opportunités proches (coach tactique de la carte) ───────────────────────
/**
 * Coach « opportunités proches » (§carte). `OPPORTUNITY_NEAR_MAX_M` = rayon
 * « autour de toi » (au-delà, une zone n'est plus une opportunité proche).
 * `OPPORTUNITY_DEFENSE_PRESSURE_MIN` = pression (0-100) au-dessus de laquelle une
 * zone TENUE devient « à défendre ». Anti pay-to-win : une opportunité se lit dans
 * la SITUATION (rôle + pression + distance), jamais achetée.
 */
export const OPPORTUNITY_NEAR_MAX_M = 2_000;
export const OPPORTUNITY_DEFENSE_PRESSURE_MIN = 50;

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

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-34 §DELTA-CLASH — emprunts Clash of Clans → GRYD (06/07/2026).
// SOURCE = le doc « Clash → GRYD » du fondateur (cadences façon clan, SANS
// obliger à courir tous les jours). ~85 % du mapping existait déjà (crew, rôles,
// perks par niveau, requêtes, feed, discovery, défense graduée, boucle crew) —
// ceci n'ajoute QUE le delta : RAID crew, REVANCHE, coffre quotidien (boost léger
// GRATUIT). ANTI PAY-TO-WIN STRICT : AUCUNE de ces constantes ne donne
// territoire / points / vitesse / protection — que du social, du statut et une
// jauge collective. Moteur PUR : engine/raid.ts + engine/revanche.ts.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Durée (heures) d'un RAID crew (source = doc Clash : « raid » collectif à
 * fenêtre courte façon Clan War / Raid Weekend). 48 h = un week-end de jeu.
 * Un raid est une OFFENSIVE COLLECTIVE à durée bornée dont la progression est
 * une jauge (zones prises pendant la fenêtre) ; consommé par engine/raid.ts
 * (`raidStatus` : active avant échéance / complete si cible atteinte / expired).
 * Anti pay-to-win : le raid ne DONNE pas de territoire bonus — il met en scène,
 * dans le temps, la conquête que le crew fait de toute façon.
 */
export const RAID_DURATION_HOURS = 48;
/**
 * Cible de DÉMO d'un raid (zones à prendre pendant la fenêtre) — valeur de
 * SEED/démo, pas un barème d'équilibrage (source = doc Clash, ordre de grandeur
 * d'un objectif de raid week-end à l'échelle d'un gros crew). Les vraies cibles
 * (par raid, par saison) seront en base ; cette constante documente le défaut
 * MVP/démo consommé par `raidProgressPct` et les écrans. TUNABLE.
 */
export const RAID_DEMO_TARGET_ZONES = 1_000;

/**
 * Fenêtre (heures) de REVANCHE (source = doc Clash : après s'être fait attaquer/
 * voler, on peut « rendre la pareille » pendant un temps limité). 24 h après le
 * déclenchement (un vol/une attaque rival sur une zone du joueur/crew), la
 * revanche est OUVERTE : signalisation sociale « prends ta revanche », pas un
 * bonus de gameplay. Consommé par engine/revanche.ts (`revancheActive` /
 * `revancheExpiry` / `revancheHoursLeft`). Anti pay-to-win STRICT : la revanche
 * ne donne NI point NI territoire supplémentaire NI protection — c'est un
 * MARQUEUR temporel qui invite à re-courir la zone (le gain reste celui des
 * règles normales de reprise/vol §3.4).
 */
export const REVANCHE_WINDOW_HOURS = 24;

/**
 * Coffre QUOTIDIEN — nombre de « boosts » gratuits offerts par jour (source =
 * doc Clash : récompense de connexion quotidienne, façon coffre/cadeau du jour).
 * 1/jour, GRATUIT (jamais acheté). Sert d'accroche de rétention douce.
 */
export const DAILY_CHEST_BOOST_PER_DAY = 1;
/**
 * Ampleur (fraction) du boost du coffre quotidien : PETIT et GRATUIT (+2 %).
 * S'applique — comme le Crew Boost payant (CREW_BOOST_CHEST_MULTIPLIER) — à la
 * PROGRESSION DU COFFRE crew UNIQUEMENT, jamais aux points/territoire/XP/
 * leaderboard. Anti pay-to-win STRICT : c'est un cadeau de connexion, pas un
 * levier payant ; l'effet est volontairement marginal (agrément, pas puissance).
 * TUNABLE.
 */
export const DAILY_CHEST_BOOST_PCT = 0.02;

// ═══════════════════════════════════════════════════════════════════════════
// Garde-fous de PRATICABILITÉ des routes (sécurité — décision fondateur).
// « Vérifier que les routes utilisées sont bien accessibles à pied et non des
// autoroutes. » Deux couches complémentaires :
//   1. GÉNÉRATION : toute route GRYD est produite au profil de routage de SA
//      DISCIPLINE (OSRM/valhalla), qui EXCLUT structurellement autoroutes et
//      voies rapides — `foot` pour la course, `bike` pour le vélo.
//   2. VALIDATION (défense en profondeur, engine/route.ts) : on RE-VÉRIFIE la
//      géométrie renvoyée (surtout pour les sources non maîtrisées — import
//      Strava, tracé utilisateur) contre une DENYLIST de classes de voies + une
//      plausibilité de connexité. Une route non praticable n'est jamais proposée.
// Classes = valeurs OSM `highway=*`. Aucun nombre magique ailleurs.
//
// ⚠️ CE BLOC EST L'ÉTAT « COURSE À PIED ». Il portait, jusqu'au 26/07/2026, un
// interdit GLOBAL (« jamais car/bike ») écrit à une époque où le vélo n'existait
// pas dans le jeu. La DÉCISION FONDATEUR du 26/07/2026 (« il faut tout brancher
// pour que la partie bike fonctionne dès maintenant ») rouvre cet interdit : le
// profil et les classes de voies se lisent désormais PAR DISCIPLINE dans
// `ACTIVITY_ROUTING` (bloc E14, fin de fichier). Les constantes ci-dessous
// restent la source de la course à pied — `ACTIVITY_ROUTING.run` les RÉFÉRENCE
// au lieu de les recopier, donc le comportement piéton ne peut pas dériver.
// L'interdit qui reste ENTIER, dans les deux disciplines : `car`. Aucune route
// GRYD n'est produite au profil automobile, jamais.
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Profil de routage de la COURSE À PIED (OSRM `foot`). Ce n'est PLUS « le »
 * profil GRYD : depuis le 26/07/2026 il vaut `ACTIVITY_ROUTING.run.profile`,
 * et le vélo a le sien. Conservé sous ce nom parce qu'il EST la valeur piétonne
 * et que la renommer ne changerait rien à ce qu'elle dit.
 */
export const ROUTE_PEDESTRIAN_PROFILE = 'foot' as const;

/**
 * DENYLIST — classes de voies OSM sur lesquelles un coureur ne doit JAMAIS être
 * routé (piéton interdit / dangereux). Une seule occurrence rend la route non
 * walkable (rejet DUR). motorway/trunk = autoroutes et voies rapides ; les
 * `*_link` sont les bretelles ; raceway/bus_guideway/construction/proposed ne
 * sont pas des voies piétonnes utilisables.
 */
export const ROUTE_FORBIDDEN_HIGHWAY_CLASSES: readonly string[] = [
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'raceway',
  'bus_guideway',
  'construction',
  'proposed',
];

/**
 * ALLOWLIST — classes de voies OSM normalement praticables à pied (trottoirs,
 * chemins, rues résidentielles, voies partagées…). Une classe HORS de cette
 * liste ET hors denylist = `unknown_class` : signal DOUX (on n'affole pas, mais
 * on le remonte pour audit), jamais un rejet dur.
 */
export const ROUTE_WALKABLE_HIGHWAY_CLASSES: readonly string[] = [
  'footway',
  'path',
  'pedestrian',
  'living_street',
  'residential',
  'unclassified',
  'service',
  'track',
  'cycleway',
  'steps',
  'tertiary',
  'tertiary_link',
  'secondary',
  'secondary_link',
  'primary',
  'primary_link',
  'road',
];

/**
 * Écart MAX (m) entre deux sommets consécutifs d'un itinéraire avant de le juger
 * DÉCONNECTÉ (téléport / « vol d'oiseau » hors réseau : traversée d'eau, saut de
 * quartier). Volontairement HAUT (une longue avenue droite peut n'avoir qu'un
 * segment) — c'est un filet de connexité structurelle, pas un détecteur
 * d'autoroute (ça, c'est la denylist de classes). TUNABLE.
 */
export const ROUTE_MAX_STEP_M = 1_500;

/** Nombre MINIMAL de points d'un itinéraire exploitable (départ + arrivée). */
export const ROUTE_MIN_POINTS = 2;

// ═══════════════════════════════════════════════════════════════════════════
// LOT 3 — ZONE DU JOUR + DÉFI 7 JOURS D'ACCUEIL (A-45 §3, actions 3 et 4).
//
// DÉCISION FONDATEUR 21/07/2026 : l'app est GRATUITE, monétisée UNIQUEMENT par
// achats intégrés. Les deux mécaniques ci-dessous sont des mécaniques de
// RÉTENTION GRATUITES : elles ne sont ni vendues, ni accélérables contre de
// l'argent, et leur récompense est STRICTEMENT COSMÉTIQUE (anti pay-to-win §22).
//
// « L'APP NE MENT JAMAIS » s'applique intégralement ici : ces constantes sont
// des SEUILS DE LECTURE de données réelles (hex_claims, sectors, user_stats),
// jamais des paramètres de fabrication. Aucune zone, aucun rival, aucune ville
// n'est inventé — quand le réel ne porte rien, l'état honnête est « aucune ».
// ═══════════════════════════════════════════════════════════════════════════

// ─── A. Zone du Jour ─────────────────────────────────────────────────────────

/**
 * Fenêtre (heures) en deçà de laquelle une zone détenue est dite FRAGILE, donc
 * éligible comme Zone du Jour. C'est un seuil de LECTURE de `hex_claims.decay_at`
 * (échéance réellement posée en base à la capture), pas une urgence dramatisée :
 * en dehors de cette fenêtre, la zone n'est simplement pas comptée fragile.
 * Volontairement plus court que ZONE_DEFEND_WINDOW_HOURS (48 h) : la Zone du
 * Jour vit UNE journée, elle ne doit pas désigner une échéance de surlendemain.
 * TUNABLE.
 */
export const DAILY_ZONE_FRAGILE_WINDOW_H = 24;

/**
 * Nombre MINIMAL de zones réellement libres pour qu'un secteur soit éligible en
 * tant que candidat NEUTRE. `sectors.total_hexes − claims vivants` est un compte
 * exact (discover_sectors pose total_hexes depuis la propriété H3 des enfants
 * res-10 d'un res-7), jamais une estimation. À 0, le secteur est plein : le
 * proposer enverrait courir pour rien.
 */
export const DAILY_ZONE_MIN_FREE_HEXES = 1;

/**
 * Durée (heures) de la DISTINCTION VISUELLE obtenue en capturant la Zone du Jour.
 * Purement COSMÉTIQUE et TEMPORAIRE : zéro point, zéro XP, zéro Foulée, zéro
 * avantage de jeu, aucune influence sur le classement ni sur le decay
 * (anti pay-to-win STRICT §22 — et anti « pay-to-progress » tout court, puisque
 * la mécanique est gratuite). 24 h = la distinction couvre exactement la journée
 * où elle a du sens, puis s'éteint sans rien retirer au joueur.
 */
export const DAILY_ZONE_DISTINCTION_H = 24;

// ─── B. Défi 7 jours d'accueil ───────────────────────────────────────────────

/**
 * Horizon SUGGÉRÉ (jours) du défi d'accueil. C'est un RYTHME AFFICHÉ, jamais une
 * échéance couperet : passé le 7ᵉ jour, le défi reste ouvert et la progression
 * acquise reste acquise (règle ANTI-SHAME — cf. WELCOME_STEPS ci-dessous, et
 * l'absence totale de remise à zéro dans engine/welcomeChallenge.ts).
 */
export const WELCOME_CHALLENGE_DAYS = 7;

/**
 * Métrique RÉELLE derrière chaque étape d'accueil. Chacune est une colonne
 * `user_stats` DÉJÀ alimentée par ingest_run — aucune nouvelle instrumentation,
 * aucun compteur fabriqué :
 *   · `bestRunDistanceM` → user_stats.best_run_distance_m ;
 *   · `loopRuns`         → user_stats.loop_runs ;
 *   · `hexesCaptured`    → user_stats.hexes_captured ;
 *   · `shares`           → user_stats.first_shares.
 */
export const WELCOME_METRICS = [
  'bestRunDistanceM',
  'loopRuns',
  'hexesCaptured',
  'shares',
] as const;
export type WelcomeMetric = (typeof WELCOME_METRICS)[number];

/**
 * Les 5 étapes du défi d'accueil, DANS L'ORDRE (A-45 §3 action 4 :
 * « 3 km → 5 km → boucle → capture → partage »). DATA : le moteur pur
 * `deriveWelcomeChallenge` les consomme, la migration les seede, aucune valeur
 * n'est réécrite ailleurs.
 *
 * Pourquoi cet ordre : il monte en engagement sans jamais exiger l'étape
 * suivante avant que la précédente ait un sens — courir, courir un peu plus,
 * boucler (la mécanique propre à GRYD), capturer (la récompense), partager
 * (l'ouverture aux autres). Une étape est un PALIER, jamais un quota
 * hebdomadaire : elle se franchit une fois et ne se re-perd JAMAIS.
 *
 * ANTI-SHAME (contrainte non négociable) : rater un jour ne remet rien à zéro,
 * ne fait expirer aucune étape et ne produit aucun message de reproche. Le
 * `day` ci-dessous est une SUGGESTION de rythme affichée, pas une date limite.
 */
export const WELCOME_STEPS = [
  { key: 'run_3k', day: 1, metric: 'bestRunDistanceM', target: 3_000 },
  { key: 'run_5k', day: 3, metric: 'bestRunDistanceM', target: 5_000 },
  { key: 'loop', day: 4, metric: 'loopRuns', target: 1 },
  { key: 'capture', day: 5, metric: 'hexesCaptured', target: 1 },
  { key: 'share', day: 7, metric: 'shares', target: 1 },
] as const satisfies readonly {
  key: string;
  day: number;
  metric: WelcomeMetric;
  target: number;
}[];

/** Clé d'une étape d'accueil (dérivée de la DATA — jamais réécrite à la main). */
export type WelcomeStepKey = (typeof WELCOME_STEPS)[number]['key'];

/** Slug du challenge d'accueil seedé dans `challenges` (migration 0051). */
export const WELCOME_CHALLENGE_SLUG = 'welcome_7d';

// ─────────────────────────────────────────────────────────────────────────────
// PROFIL D'HABITUDES (A-46 §1) — personnalisation des parcours proposés.
//
// Demande fondateur (21/07) : « se baser sur les habitudes des utilisateurs,
// nombre de kilomètres, route utilisée, il faut qu'un algorithme puisse
// apprendre ». Constat d'audit : le Route Planner AFFICHAIT déjà « Adaptée à
// tes habitudes » alors que rien n'apprenait. Ces constantes bornent ce que
// l'app a le droit de PRÉTENDRE savoir.
//
// VIE PRIVÉE — apprendre des habitudes de déplacement est du profilage sur des
// données de localisation. Le profil ne consomme QUE des agrégats non
// géographiques (distance, durée, allure, horodatage) : aucune coordonnée,
// aucun point de départ, rien qui puisse ré-exposer le domicile que §7 floute
// à 500 m. Un créneau horaire ne dit pas OÙ.
//
// ANTI PAY-TO-WIN : un profil d'habitudes SUGGÈRE un parcours. Il n'accorde
// jamais de points, de territoire ni de multiplicateur.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SEUIL D'HONNÊTETÉ : nombre minimal de courses comptabilisées en dessous
 * duquel on ne connaît PAS les habitudes de quelqu'un — le profil renvoie
 * « inconnu » et l'app le dit, au lieu d'inventer une habitude à partir d'un run.
 *
 * Pourquoi 5, et pas 3 :
 *  1. La médiane de n valeurs ne survit qu'à floor((n-1)/2) valeurs aberrantes.
 *     n = 3 → UNE seule sortie longue exceptionnelle suffit à déplacer le
 *     profil ; n = 5 → il en faut DEUX. Or « ~2 courses courtes + 1 longue par
 *     semaine » est le schéma le plus banal chez un coureur : à n = 3 le profil
 *     serait structurellement faux, à n = 5 il tient.
 *  2. Coût pour l'utilisateur : à STREAK_MIN_RUNS_PER_WEEK (2/semaine), 5
 *     courses ≈ 2,5 semaines. Assez court pour que la personnalisation arrive
 *     vite, assez long pour couvrir plus d'une semaine — donc pour qu'un jour
 *     ou un créneau RÉCURRENT ait pu se répéter au moins une fois.
 *  3. Au-dessus (8, 10) on ne gagne pas en robustesse de médiane, on ne fait
 *     que retarder : la confiance montante est déjà portée par
 *     HABITS_CONFIDENT_RUNS.
 */
export const HABITS_MIN_RUNS = 5;

/**
 * Fenêtre d'historique retenue. Au-delà, une course ne décrit plus les
 * habitudes ACTUELLES (blessure, déménagement, changement de rythme). Alignée
 * sur RAW_POLYLINE_RETENTION_DAYS (90 j) : on n'apprend pas sur des données
 * plus vieilles que ce que le projet accepte de conserver.
 */
export const HABITS_HISTORY_DAYS = 90;

/** Borne de lecture serveur : jamais plus de courses que ça par appel. */
export const HABITS_MAX_RUNS = 200;

/**
 * À partir de ce nombre de courses, l'échantillon est assez fourni pour une
 * confiance HAUTE — à condition que la dispersion soit faible
 * (HABITS_TIGHT_SPREAD_RATIO). ~6 semaines à 2 courses/semaine.
 */
export const HABITS_CONFIDENT_RUNS = 12;

/**
 * Dispersion robuste (MAD / médiane) en dessous de laquelle on considère
 * l'habitude RÉGULIÈRE. 0,20 = « la moitié des courses tombent à ±20 % de la
 * distance habituelle ». Au-delà, la personne varie trop pour qu'on prétende
 * connaître « sa » distance : confiance basse, l'UI reste prudente.
 */
export const HABITS_TIGHT_SPREAD_RATIO = 0.2;

/**
 * Part minimale des courses qu'un jour (ou un créneau) doit concentrer pour
 * être qualifié d'habituel. 0,4 : en dessous, c'est du bruit — on ne surface
 * RIEN plutôt qu'un « tu cours le mardi » tiré de 2 courses sur 9.
 */
export const HABITS_PATTERN_MIN_SHARE = 0.4;

/**
 * Créneaux de la journée (heure LOCALE de l'appareil). Bornes = heure de début,
 * le créneau court jusqu'au début du suivant ; `night` enjambe minuit.
 * DATA, jamais réécrite à la main : HabitSlotKey en est dérivé.
 */
export const HABITS_SLOTS = [
  { key: 'dawn', startHour: 5 },
  { key: 'day', startHour: 10 },
  { key: 'evening', startHour: 17 },
  { key: 'night', startHour: 21 },
] as const satisfies readonly { key: string; startHour: number }[];

/** Clé d'un créneau d'habitude (dérivée de HABITS_SLOTS). */
export type HabitSlotKey = (typeof HABITS_SLOTS)[number]['key'];

// ─── PRÉFÉRENCES DE PARCOURS (demande fondateur 21/07 — « un endroit dans les
//     paramètres pour la personnaliser ») ─────────────────────────────────────
/**
 * Une PRÉFÉRENCE de parcours n'est PAS une règle de jeu : elle ne donne aucun
 * point, aucun territoire, aucun avantage. Elle oriente une SUGGESTION. Ces
 * constantes vivent quand même ici parce que la borne écrite dans la contrainte
 * SQL (`route_preferences`) et celle affichée par l'écran doivent être la MÊME —
 * c'est exactement le cas d'usage de « aucun nombre magique ».
 */

/**
 * Distances cibles proposées en un tap (m). Échelle de coureur, pas de machine :
 * de la boucle de récupération à la sortie longue de 15 km. Un ultra-traileur
 * n'a pas de pastille dédiée — il n'a pas besoin d'une SUGGESTION quotidienne.
 *
 * POURQUOI 2 km OUVRE LA TABLE (rétabli le 26/07/2026). Le chantier vélo avait
 * fait démarrer cette table à 3 km, et la « boucle courte » du planificateur —
 * 2 km avant le vélo — avait disparu avec elle. C'est la sortie du DÉBUTANT et
 * celle de la RÉCUPÉRATION : les deux profils que le produit peut le moins se
 * permettre de perdre. 2 000 m n'est pas un nombre repris tel quel : il vaut
 * 2 × LOOP_MIN_PERIMETER_M, soit la plus petite boucle qui fasse une zone avec
 * une marge de routage confortable (OSRM rend la longueur des rues trouvées,
 * jamais la cible au mètre près). La même dérivation à vélo donne 10 km
 * (2 × BIKE_LOOP_MIN_PERIMETER_M) — et c'est EXACTEMENT le facteur de longueur
 * ×5 de la planche E14, parce que 5 000 / 1 000 = 5. Les deux raisonnements
 * tombent sur le même nombre : c'est ce qui les rend fiables.
 */
export const ROUTE_TARGET_DISTANCE_CHOICES_M = [
  2_000,
  3_000,
  5_000,
  8_000,
  10_000,
  15_000,
] as const;

/** Plancher d'une distance cible = plancher d'une course qui compte (§3.2). */
export const ROUTE_TARGET_DISTANCE_MIN_M = RUN_MIN_DISTANCE_M;

/**
 * Plafond d'une distance cible ENREGISTRABLE : le marathon. Au-delà, GRYD ne
 * « propose » plus une sortie du jour — RUN_MAX_DISTANCE_M (100 km) reste la
 * borne de ce qui est INGÉRABLE, jamais de ce qui est SUGGÉRABLE.
 *
 * ⚠️ CETTE BORNE EST CELLE DE LA PRÉFÉRENCE PERSISTÉE, PAS CELLE DU SÉLECTEUR.
 * Elle est le MIROIR EXACT de la contrainte SQL de `route_preferences`
 * (`0054_route_preferences.sql` : `target_distance_m between 1000 and 42195`),
 * migration APPLIQUÉE. La remonter ici sans migration ferait afficher un choix
 * que la base refuserait — le bouton mort de manuel. Le planificateur, lui,
 * n'écrit RIEN : ses bornes à lui sont plus bas (`ROUTE_PLANNER_*_M`).
 */
export const ROUTE_TARGET_DISTANCE_MAX_M = 42_195;

// ─── BORNES DU PLANIFICATEUR (≠ bornes de la préférence enregistrée) ─────────
/**
 * POURQUOI DEUX JEUX DE BORNES, ET PAS UN (26/07/2026).
 *
 * Le chantier vélo a fait lire au planificateur les bornes de la PRÉFÉRENCE
 * (`ROUTE_TARGET_DISTANCE_*`). L'intention était juste — les quatre nombres
 * qu'il portait avant (`generator.ts` : 1,5 / 50 / 0,5 / 3,4 km) ne venaient de
 * nulle part. Mais le résultat a coûté deux choses AU COUREUR :
 *   · le plancher est passé de 1,5 à 3 km → plus de boucle de 2 km ;
 *   · le plafond de 50 à 42,195 km       → plus de trail au-delà du marathon.
 *
 * Ce sont deux notions DIFFÉRENTES, et les confondre était le vrai défaut :
 *   · une PRÉFÉRENCE est ÉCRITE dans `route_preferences`, donc bornée par une
 *     contrainte SQL déjà en production (1 000 … 42 195 m) ;
 *   · une cible de PLANIFICATEUR n'est écrite nulle part. Elle ne borne qu'un
 *     appel de routage. Rien dans le jeu ne la limite — seules la géométrie de
 *     capture (en bas) et la plausibilité humaine (en haut) la limitent.
 *
 * Les bornes ci-dessous sont donc DÉRIVÉES, discipline par discipline, du seul
 * fait de jeu qui les concerne : le périmètre minimal d'une boucle qui fait une
 * zone. Elles retombent sur les valeurs d'avant le chantier vélo pour la course
 * — cette fois avec une source.
 */

/**
 * Marge de routage du PLANCHER : la plus petite boucle atteignable au sélecteur
 * vaut 1,5 × le périmètre minimal de sa discipline. Pourquoi une marge : le
 * planificateur demande une CIBLE, OSRM répond avec la longueur des rues qu'il a
 * trouvées. Une cible posée pile sur le périmètre minimal reviendrait une fois
 * sur deux EN DESSOUS, et la boucle ne ferait aucune zone — un effort réel, zéro
 * territoire, et personne pour le dire avant la fin.
 */
export const PLANNER_FLOOR_PERIMETER_FACTOR = 1.5;

/**
 * Facteur du DÉFAUT : quand on ne sait rien du joueur (pas assez de courses,
 * apprentissage coupé, réglages illisibles), on propose 3 × le périmètre minimal
 * de sa discipline. Assez pour traverser plusieurs zones, assez court pour ne
 * rien présumer de quelqu'un qu'on ne connaît pas.
 */
export const PLANNER_DEFAULT_PERIMETER_FACTOR = 3;

/** Plancher du sélecteur du planificateur, COURSE À PIED (m) → 1 500 m. */
export const ROUTE_PLANNER_MIN_M = PLANNER_FLOOR_PERIMETER_FACTOR * LOOP_MIN_PERIMETER_M;

/** Distance proposée quand rien n'est su du coureur (m) → 3 000 m. */
export const ROUTE_PLANNER_DEFAULT_M = PLANNER_DEFAULT_PERIMETER_FACTOR * LOOP_MIN_PERIMETER_M;

/**
 * Plafond du sélecteur, COURSE À PIED (m) : 50 km, le « 50K » — la première
 * distance normalisée du trail au-delà du marathon, et la borne que le
 * planificateur portait avant le chantier vélo (« des coureurs font 50 km »).
 *
 * Écrit en clair, et pas dérivé, VOLONTAIREMENT : c'est un repère du monde réel
 * (une distance d'épreuve), au même titre que les 42 195 m du marathon. L'écrire
 * `RUN_MAX_DISTANCE_M / 2` donnerait le même nombre aujourd'hui mais inventerait
 * un lien qui n'existe pas — le jour où la borne ANTI-ABUS bougerait, le plafond
 * du suggérable la suivrait sans que personne l'ait décidé.
 * Contrôle de cohérence : 50 km reste bien SOUS RUN_MAX_DISTANCE_M (100 km) —
 * on ne propose jamais une sortie que l'ingestion refuserait.
 */
export const ROUTE_PLANNER_MAX_M = 50_000;

/**
 * Forme de parcours souhaitée. `any` = GRYD choisit (défaut assumé) ; `loop` =
 * boucle fermée (la mécanique GRYD, remplissage d'intérieur) ; `out_and_back` =
 * aller-retour (rassurant : on rentre par le chemin connu).
 */
export const ROUTE_SHAPES = ['any', 'loop', 'out_and_back'] as const;
export type RouteShape = (typeof ROUTE_SHAPES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// A-46 × A-45 — LA ZONE DU JOUR LUE À LA DISTANCE RÉELLEMENT COURUE
// (bloc ajouté en fin de fichier, chantier « suggestion de parcours × zone du
//  jour ». Une seule constante : tout le reste est réutilisé.)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Distance CENTRE À CENTRE (m) entre deux zones voisines de la grille de jeu.
 *
 * Ce n'est PAS un réglage de jeu : c'est une propriété géométrique de H3 à
 * `H3_RESOLUTION` (10). Une cellule res-10 a une arête moyenne de ~65,9 m ;
 * deux cellules adjacentes ont donc leurs centres à √3 × 65,9 ≈ 114 m. La
 * valeur est figée ici, et pas recalculée dans l'app, parce que le mobile
 * n'embarque pas h3-js (Metro ne le résout pas dans ce chemin) : sans source
 * unique, chaque écran finirait avec son propre « à peu près ».
 *
 * SEUL USAGE : borner le nombre de zones qu'une sortie peut traverser
 * (`zonesWithinReach`, apps/mobile/src/features/daily/zoneFit.ts), pour dire
 * honnêtement si le terrain libre d'une Zone du Jour tient la comparaison avec
 * la distance qu'une personne court vraiment. Le calcul suppose une trajectoire
 * RECTILIGNE — c'est une borne HAUTE assumée, qui rend le verdict « il y a de
 * quoi faire » plus difficile à obtenir plutôt que plus facile.
 *
 * ANTI PAY-TO-WIN : cette constante n'entre dans aucun score, aucun claim,
 * aucune protection, aucun decay. Elle ne sert qu'à formuler une PROPOSITION,
 * qui ne donne rien (§22).
 */
export const ZONE_CENTER_SPACING_M = 114;

// ═══════════════════════════════════════════════════════════════════════════
// E14 — DEUX DISCIPLINES, DEUX UNIVERS (planche docs/design/vague-1/PLANCHES.md
// §E14, décision fondateur 24/07/2026 : « une version bike et une version
// running »).
//
// OÙ ON EN EST, au 26/07/2026 : ① les BORNES par discipline (ce bloc-ci) ; ②
// le SCHÉMA séparé (migration 0070, APPLIQUÉE en production le 25/07/2026) ;
// ③ le ROUTAGE par discipline et la FRONTIÈRE séparé/global (les deux blocs qui
// suivent `activityRules`, 26/07/2026). Ce qui n'est PAS fait est listé dans
// « CE QUI RESTE EN SUSPENS » en fin de bloc — c'est cette liste qui fait foi,
// pas ce résumé.
//
// POURQUOI CE BLOC EXISTE : toutes les bornes anti-triche de §3.2 ont été
// calibrées pour la COURSE À PIED (RUN_AVG_PACE_MIN_S_KM porte littéralement le
// commentaire « borne basse anti-vélo », POINT_MAX_SPEED_KMH = 25 km/h). Un
// cycliste réel à 28-35 km/h est donc rejeté DEUX fois : chacun de ses points
// dépasse la vitesse max (→ `no_valid_points`), et son allure moyenne tombe
// sous la borne basse (→ `pace_too_fast`). Faire exister le vélo commence par
// des bornes PAR DISCIPLINE — sinon le jeu appelle « tricheur » un cycliste
// honnête, ce qui est exactement le contraire de « l'app ne ment jamais ».
//
// PRINCIPE DE DÉRIVATION : les valeurs `run` ne sont PAS recopiées, elles
// RÉFÉRENCENT les constantes historiques ci-dessus — l'identité de comportement
// pour la course est garantie par construction, pas par relecture. Les valeurs
// `bike` sont DÉRIVÉES (physiologie, records, ou proportion explicite de la
// course), jamais choisies au doigt mouillé : chaque champ porte son pourquoi.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Disciplines du jeu. `run` est la valeur HISTORIQUE et le DÉFAUT partout :
 * tout ce qui existe déjà (chaque course, chaque hexagone capturé) est de la
 * course à pied. Une donnée sans discipline déclarée n'est pas « inconnue »,
 * elle EST de la course — c'est un fait, pas un repli inventé.
 */
export const ACTIVITIES = ['run', 'bike'] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Discipline par défaut quand la requête n'en déclare aucune (rétro-compat). */
export const DEFAULT_ACTIVITY: Activity = 'run';

/**
 * VITESSE DE RÉFÉRENCE d'une discipline (km/h) — le pivot de TOUTES les
 * dérivations `bike` ci-dessous. Aucune des deux valeurs n'est choisie :
 *  · `run` était LUE dans les règles existantes — le « coin » de validité
 *    §3.2 (RUN_MIN_DISTANCE_M 1 000 m atteint en RUN_MIN_DURATION_S 360 s)
 *    valait exactement 10 km/h, la vitesse d'un coureur honnête.
 *    ⚠ Depuis l'alignement spec unifiée §8.2 (27/07/2026, décision D-19),
 *    RUN_MIN_DISTANCE_M = 800 m et RUN_MIN_DURATION_S = 300 s : ce coin vaut
 *    désormais 9,6 km/h. `run: 10` reste un ARRONDI délibéré au palier
 *    lisible le plus proche (0,4 km/h d'écart, sans effet sur les bornes
 *    anti-triche RÉELLES — RUN_AVG_PACE_MIN/MAX_S_KM restent la seule
 *    autorité de vitesse de course, indépendante de ce pivot) plutôt qu'une
 *    lecture exacte des deux constantes ;
 *  · `bike` = 2 × `run`, et ce facteur 2 est LU sur la planche E14 elle-même :
 *    mission course 900 m ≈ 6 min → 9 km/h ; mission vélo 4 800 m ≈ 15 min
 *    → 19,2 km/h ; rapport 2,13, arrondi PRUDEMMENT à 2.
 * Le second (et dernier) degré de liberté est l'axe des LONGUEURS de boucle :
 * 4 800 / 900 = 5,33 → arrondi à 5, prudent lui aussi (une boucle vélo minimale
 * plus courte n'exclut personne). Tout le reste des constantes vélo découle de
 * ces deux facteurs — ×2 en vitesse, ×5 en longueur.
 */
export const ACTIVITY_REFERENCE_SPEED_KMH = { run: 10, bike: 20 } as const;

/**
 * Jeu COMPLET des bornes qu'une discipline impose au moteur pur. Une seule
 * table indexée par discipline : aucune fonction du moteur n'a le droit de lire
 * une borne §3.2 « en dur » — elle lit `activityRules(activity)`.
 */
export interface ActivityRuleSet {
  /** §3.2 — distance minimale d'une sortie qui compte. */
  readonly minDistanceM: number;
  /** §3.2 — durée minimale d'une sortie qui compte. */
  readonly minDurationS: number;
  /** §3.2 — allure MOYENNE minimale admise (s/km) : sous cette valeur, moteur. */
  readonly avgPaceMinSKm: number;
  /** §3.2 — allure MOYENNE maximale admise (s/km) : au-delà, ce n'est plus la discipline. */
  readonly avgPaceMaxSKm: number;
  /** §3.2 — plafond anti-abus/DoS d'UNE session (m). */
  readonly maxDistanceM: number;
  /** §3.2 — vitesse instantanée max d'un point GPS (km/h) : au-delà, point rejeté. */
  readonly pointMaxSpeedKmh: number;
  /** §3.2 — saut entre deux points consécutifs (m) : au-delà, segment COUPÉ. */
  readonly pointMaxJumpM: number;
  /** §3.2 — précision horizontale max d'un point accepté (m). */
  readonly pointMaxAccuracyM: number;
  /** §3.2 — allure SEGMENT minimale pour claimer (s/km). */
  readonly segmentPaceMinSKm: number;
  /** §3.2 — allure SEGMENT maximale pour claimer (s/km). */
  readonly segmentPaceMaxSKm: number;
  /** A-12 §B — tolérance de fermeture départ/arrivée d'une boucle (m). */
  readonly loopCloseToleranceM: number;
  /** A-12 §B — périmètre minimal d'une boucle (m) ; en deçà : couloir seul. */
  readonly loopMinPerimeterM: number;
  /** A-16 §2 — paliers [distance courue (km), aire capturable max (km²)]. */
  readonly loopMaxAreaByDistanceKm2: readonly (readonly [number, number])[];
  /** A-23 §D — cap DUR d'aire capturable d'une boucle (km²). */
  readonly loopMaxAreaCapKm2: number;
  /** A-16 §2 — compacité minimale 4πA/P² d'une boucle. */
  readonly loopMinCompactness: number;
  /** A-23 §D — largeur moyenne minimale estimée 2A/P (m). */
  readonly loopMinWidthM: number;
  /** A-23 §D — GPS trust minimal pour capturer l'INTÉRIEUR d'une boucle. */
  readonly loopMinGpsTrust: number;
  /** A-12 §C (présentation) — « boucle ouverte » sous cette distance au départ (m). */
  readonly loopHintDistanceM: number;
  /** A-12 §C (présentation) — aperçu de la zone fantôme sous cette distance (m). */
  readonly loopPreviewDistanceM: number;
}

/**
 * COURSE À PIED — l'état historique, INCHANGÉ. Chaque champ RÉFÉRENCE la
 * constante §3.2 d'origine : il est structurellement impossible qu'une valeur
 * `run` dérive de ce qu'elle valait avant l'arrivée du vélo.
 */
const RUN_RULES: ActivityRuleSet = {
  minDistanceM: RUN_MIN_DISTANCE_M,
  minDurationS: RUN_MIN_DURATION_S,
  avgPaceMinSKm: RUN_AVG_PACE_MIN_S_KM,
  avgPaceMaxSKm: RUN_AVG_PACE_MAX_S_KM,
  maxDistanceM: RUN_MAX_DISTANCE_M,
  pointMaxSpeedKmh: POINT_MAX_SPEED_KMH,
  pointMaxJumpM: POINT_MAX_JUMP_M,
  pointMaxAccuracyM: POINT_MAX_ACCURACY_M,
  segmentPaceMinSKm: SEGMENT_PACE_MIN_S_KM,
  segmentPaceMaxSKm: SEGMENT_PACE_MAX_S_KM,
  loopCloseToleranceM: LOOP_CLOSE_TOLERANCE_M,
  loopMinPerimeterM: LOOP_MIN_PERIMETER_M,
  loopMaxAreaByDistanceKm2: LOOP_MAX_AREA_BY_DISTANCE_KM2,
  loopMaxAreaCapKm2: LOOP_MAX_AREA_CAP_KM2,
  loopMinCompactness: LOOP_MIN_COMPACTNESS,
  loopMinWidthM: LOOP_MIN_WIDTH_M,
  loopMinGpsTrust: LOOP_MIN_GPS_TRUST,
  loopHintDistanceM: LOOP_HINT_DISTANCE_M,
  loopPreviewDistanceM: LOOP_PREVIEW_DISTANCE_M,
};

// ─── VÉLO : chaque borne, et son pourquoi ────────────────────────────────────

/**
 * Distance minimale d'une sortie vélo — ALIGNÉE spec unifiée §8.2
 * (`MIN_ACTIVITY_DISTANCE_BIKE = 2 000 m`, 27/07/2026, décision D-19) : la
 * valeur du dépôt COÏNCIDAIT DÉJÀ exactement avec la spec, confirmée telle
 * quelle (aucun changement numérique).
 * COHÉRENCE avec la dérivation historique (toujours vraie) : à la vitesse de
 * référence vélo (`ACTIVITY_REFERENCE_SPEED_KMH.bike` = 20 km/h) et à la durée
 * propre du vélo (`BIKE_MIN_DURATION_S` = 360 s, ci-dessous — DÉCOUPLÉE de la
 * course depuis cet alignement), 20 km/h × 360 s = 2 000 m. L'ancienne
 * dérivation « 2 × la course » ne tient plus littéralement (la course est
 * passée à 800 m / 300 s, cf. RUN_MIN_DISTANCE_M) : c'est attendu, la spec
 * fixe les deux disciplines INDÉPENDAMMENT désormais, elles cessent d'être un
 * simple facteur l'une de l'autre sur cet axe précis.
 */
export const BIKE_MIN_DISTANCE_M = 2_000;

/**
 * Durée minimale d'une sortie vélo — ALIGNÉE spec unifiée §8.2
 * (`MIN_ACTIVE_DURATION_BIKE = 6 min`, 27/07/2026, décision D-19).
 * ⚠ N'EST PLUS « IDENTIQUE à la course » (l'était avant cet alignement, via
 * `= RUN_MIN_DURATION_S`) : la même spec §8.2 fixe la course à 5 min
 * (`RUN_MIN_DURATION_S = 300 s`, voir plus haut) — les deux disciplines
 * DIVERGENT désormais d'une minute, c'est un choix EXPLICITE de la spec, pas
 * un oubli. DÉCOUPLÉE de `RUN_MIN_DURATION_S` en conséquence : garder l'alias
 * aurait fait tomber le plancher vélo à 5 min EN SILENCE le jour où la course
 * a été réalignée, exactement le genre de couplage accidentel qu'une
 * constante partagée est censée éviter d'introduire. La valeur numérique
 * elle-même NE CHANGE PAS : le dépôt affichait déjà 360 s via l'alias.
 */
export const BIKE_MIN_DURATION_S = 6 * 60;

/**
 * Allure MOYENNE minimale d'une sortie vélo : 60 s/km = 60 km/h de MOYENNE.
 * RÉFÉRENCE : le record de l'heure UCI est de 56,79 km/h (F. Ganna, 2022) — sur
 * piste, en position aéro, sans arrêt ni virage. Une sortie sur route publique
 * dont la moyenne dépasse 60 km/h sur au moins BIKE_MIN_DURATION_S n'est pas
 * humainement pédalable : c'est un moteur. La marge (60 vs 56,8) est délibérée :
 * elle absorbe une sortie très descendante et le bruit de mesure, parce qu'un
 * faux positif (cycliste traité en tricheur) coûte infiniment plus cher qu'un
 * faux négatif (un scooter passe et sera repris par les signaux §8, en suspens).
 */
export const BIKE_AVG_PACE_MIN_S_KM = 60;

/**
 * Allure MOYENNE maximale d'une sortie vélo : IDENTIQUE à la course
 * (600 s/km = 6 km/h). Sous 6 km/h de moyenne on ne roule pas, on POUSSE son
 * vélo — et 6 km/h laisse largement passer une sortie urbaine hachée de feux
 * rouges (12-18 km/h) comme une ascension de col (8-12 km/h). Aucune raison
 * d'inventer une seconde valeur.
 */
export const BIKE_AVG_PACE_MAX_S_KM = RUN_AVG_PACE_MAX_S_KM;

/**
 * Plafond anti-abus d'UNE session vélo : 400 km (4 × la course). Même rôle que
 * RUN_MAX_DISTANCE_M — couper les payloads forgés et l'amplification DoS, jamais
 * exclure un pratiquant réel. Le vélo longue distance vit à une autre échelle
 * que la course (un brevet randonneur fait 200, 300 ou 400 km d'une traite), le
 * plafond doit donc monter au-delà. MÊME arbitrage assumé que pour la course :
 * au-delà (600 km, Paris-Brest-Paris) la sortie serait refusée — c'est un cas
 * connu et accepté, pas un oubli.
 */
export const BIKE_MAX_DISTANCE_M = 400_000;

/**
 * Vitesse INSTANTANÉE maximale d'un point vélo : 80 km/h. Un cycliste de route
 * atteint réellement 70-80 km/h en descente de col ; au-dessus, sur la durée
 * d'un échantillon, on quitte le domaine du vélo sur route ouverte.
 * ⚠️ HONNÊTETÉ : cette borne arrête un véhicule LANCÉ (voie rapide, autoroute),
 * elle ne distingue PAS une voiture en ville (30-50 km/h) d'un cycliste rapide.
 * Aucune borne de VITESSE ne le peut. Les signaux qui le pourraient
 * (accélérations, arrêts, altitude, trajectoire) n'existent nulle part dans le
 * code — voir « CE QUI RESTE EN SUSPENS » ci-dessous. On ne prétend donc pas
 * que le vélo est « protégé de la voiture » : il est protégé du véhicule rapide.
 */
export const BIKE_POINT_MAX_SPEED_KMH = 80;

/**
 * Saut maximal entre deux points vélo consécutifs : 300 m. DÉRIVÉ du même
 * rapport que la course : 100 m représente ~7 intervalles d'échantillonnage
 * (GPS_SAMPLE_INTERVAL_MS = 2 s) parcourus à la vitesse max course (25 km/h).
 * Le même « 7 intervalles » à 80 km/h vaut 7 × 2 s × 22,2 m/s ≈ 311 m → 300 m.
 * Sans cette montée, une descente rapide verrait ses segments coupés en
 * permanence par un filtre pensé pour des foulées.
 */
export const BIKE_POINT_MAX_JUMP_M = 300;

/**
 * Précision horizontale max d'un point vélo : IDENTIQUE à la course (25 m). La
 * qualité d'un fix GPS dépend du ciel et du récepteur, pas de la discipline.
 * Champ présent dans la table pour que le moteur n'ait QU'UNE source, mais sa
 * valeur ne bouge pas — et le dire évite qu'on la « règle » un jour sans raison.
 */
export const BIKE_POINT_MAX_ACCURACY_M = POINT_MAX_ACCURACY_M;

/**
 * Allure SEGMENT minimale pour qu'un tronçon vélo puisse CLAIMER : 50 s/km
 * = 72 km/h de moyenne sur le tronçon. Un segment de descente peut réellement
 * tourner à 60-70 km/h de moyenne ; au-delà de 72 km/h SUR TOUT UN TRONÇON, ce
 * n'est plus une descente, c'est un moteur. Reste sous BIKE_POINT_MAX_SPEED_KMH
 * (80 km/h) exactement comme la course garde SEGMENT_PACE_MIN_S_KM (24 km/h)
 * sous POINT_MAX_SPEED_KMH (25 km/h) : les pointes isolées survivent au filtre
 * point par point, un tronçon entier à vitesse de moteur ne capture rien.
 */
export const BIKE_SEGMENT_PACE_MIN_S_KM = 50;

/**
 * Allure SEGMENT maximale pour claimer à vélo : IDENTIQUE à la course
 * (720 s/km = 5 km/h). Sous 5 km/h sur tout un tronçon, on marche à côté du
 * vélo — la sortie reste VALIDE, seul ce tronçon ne capture pas.
 */
export const BIKE_SEGMENT_PACE_MAX_S_KM = SEGMENT_PACE_MAX_S_KM;

/**
 * Périmètre minimal d'une boucle vélo : 5 000 m (5 × la course). C'est
 * l'ÉCHELLE de la planche E14 (« boucles plus grandes, échelle ville ») lue sur
 * ses propres chiffres : la boucle course de référence y fait 900 m et
 * LOOP_MIN_PERIMETER_M vaut 1 000 m ; la boucle vélo de référence fait 4 800 m,
 * son plancher vaut donc 5 000 m. Conséquence assumée : une sortie vélo entre
 * BIKE_MIN_DISTANCE_M (2 km) et 5 km reste une course VALIDE qui capture son
 * couloir, mais ne fait pas de zone — « à vélo, la zone se gagne à l'échelle
 * du quartier, pas du pâté de maisons ».
 */
export const BIKE_LOOP_MIN_PERIMETER_M = 5_000;

/**
 * Tolérance de fermeture d'une boucle vélo : IDENTIQUE à la course (80 m).
 * C'est une tolérance GPS (« suis-je revenu à mon point de départ ? »), pas une
 * mesure d'effort : elle ne dépend pas de la vitesse.
 */
export const BIKE_LOOP_CLOSE_TOLERANCE_M = LOOP_CLOSE_TOLERANCE_M;

/**
 * Aire capturable max d'une boucle vélo, par distance parcourue.
 * DÉRIVÉE de la table course par la SEULE loi qui ait un sens géométrique :
 * l'aire varie comme le CARRÉ de la longueur. Les distances sont donc ×5
 * (3/5/10 km → 15/25/50 km) et les aires ×25 (0,25/0,8/1,8 → 6,25/20/45 km²).
 * Le rapport aire/distance² est ainsi RIGOUREUSEMENT IDENTIQUE entre les deux
 * disciplines : un cycliste n'est ni avantagé ni pénalisé, il joue la même
 * règle à son échelle. (Contrôle : à son périmètre minimal, chaque discipline
 * se retrouve juste au-dessus de la borne isopérimétrique P²/4π — 0,083 km²
 * pour 1 km à pied, 2,08 km² pour 5 km à vélo — donc dans les deux cas la
 * géométrie mord avant la règle, exactement comme aujourd'hui.)
 */
export const BIKE_LOOP_MAX_AREA_BY_DISTANCE_KM2 = [
  [15, 6.25],
  [25, 20],
  [50, 45],
] as const;

/**
 * Cap DUR d'aire d'une boucle vélo : 75 km² = 25 × LOOP_MAX_AREA_CAP_KM2, par
 * la même loi du carré. ⚠️ HONNÊTETÉ : ce cap ne mordra probablement JAMAIS en
 * l'état — MAX_CLAIMS_PER_DAY (1 200 zones/jour/compte, PARTAGÉ entre les
 * disciplines) plafonne déjà à ~18 km²/jour à la résolution 10. Il est écrit
 * malgré tout pour rester cohérent le jour où l'arbitrage sur le plafond
 * quotidien sera tranché (voir « EN SUSPENS » : par compte, ou par compte ET
 * discipline ?) — décision FONDATEUR, pas d'agent.
 */
export const BIKE_LOOP_MAX_AREA_CAP_KM2 = 75.0;

/**
 * Forme d'une boucle vélo : compacité et largeur IDENTIQUES à la course.
 * La compacité 4πA/P² est SANS DIMENSION (un carré vaut 0,785 quelle que soit
 * sa taille) et la largeur minimale de 80 m est dictée par la GRILLE (≈ 3 zones
 * res 10 de large), pas par la discipline. Les scaler serait un nombre inventé.
 */
export const BIKE_LOOP_MIN_COMPACTNESS = LOOP_MIN_COMPACTNESS;
export const BIKE_LOOP_MIN_WIDTH_M = LOOP_MIN_WIDTH_M;

/**
 * GPS trust minimal pour capturer l'intérieur d'une boucle vélo : IDENTIQUE
 * (80). C'est une exigence sur la QUALITÉ DE LA MESURE, pas sur l'effort.
 */
export const BIKE_LOOP_MIN_GPS_TRUST = LOOP_MIN_GPS_TRUST;

/**
 * Mise en scène de la boucle vélo (PRÉSENTATION, comme LOOP_HINT/PREVIEW) :
 * ×5 comme toutes les longueurs de boucle. Un cycliste couvre 600 m en ~2 min :
 * lui annoncer « ferme ta boucle » à cette distance arriverait trop tard.
 */
export const BIKE_LOOP_HINT_DISTANCE_M = 3_000;
export const BIKE_LOOP_PREVIEW_DISTANCE_M = 1_500;

const BIKE_RULES: ActivityRuleSet = {
  minDistanceM: BIKE_MIN_DISTANCE_M,
  minDurationS: BIKE_MIN_DURATION_S,
  avgPaceMinSKm: BIKE_AVG_PACE_MIN_S_KM,
  avgPaceMaxSKm: BIKE_AVG_PACE_MAX_S_KM,
  maxDistanceM: BIKE_MAX_DISTANCE_M,
  pointMaxSpeedKmh: BIKE_POINT_MAX_SPEED_KMH,
  pointMaxJumpM: BIKE_POINT_MAX_JUMP_M,
  pointMaxAccuracyM: BIKE_POINT_MAX_ACCURACY_M,
  segmentPaceMinSKm: BIKE_SEGMENT_PACE_MIN_S_KM,
  segmentPaceMaxSKm: BIKE_SEGMENT_PACE_MAX_S_KM,
  loopCloseToleranceM: BIKE_LOOP_CLOSE_TOLERANCE_M,
  loopMinPerimeterM: BIKE_LOOP_MIN_PERIMETER_M,
  loopMaxAreaByDistanceKm2: BIKE_LOOP_MAX_AREA_BY_DISTANCE_KM2,
  loopMaxAreaCapKm2: BIKE_LOOP_MAX_AREA_CAP_KM2,
  loopMinCompactness: BIKE_LOOP_MIN_COMPACTNESS,
  loopMinWidthM: BIKE_LOOP_MIN_WIDTH_M,
  loopMinGpsTrust: BIKE_LOOP_MIN_GPS_TRUST,
  loopHintDistanceM: BIKE_LOOP_HINT_DISTANCE_M,
  loopPreviewDistanceM: BIKE_LOOP_PREVIEW_DISTANCE_M,
};

/** Table COMPLÈTE des bornes par discipline — seule porte d'entrée du moteur. */
export const ACTIVITY_RULES: Readonly<Record<Activity, ActivityRuleSet>> = {
  run: RUN_RULES,
  bike: BIKE_RULES,
};

/**
 * Bornes d'une discipline. Argument absent ⇒ DEFAULT_ACTIVITY ('run') : tout
 * appelant qui ignore encore la notion de discipline obtient EXACTEMENT le
 * comportement historique, sans un seul `if` chez lui.
 */
export function activityRules(activity: Activity = DEFAULT_ACTIVITY): ActivityRuleSet {
  return ACTIVITY_RULES[activity] ?? RUN_RULES;
}

/**
 * E26 — « L'ACTIVITÉ EST-ELLE ASSEZ LONGUE POUR PRODUIRE UN RÉSULTAT ? »
 *
 * La spec (l.1194) fait dépendre une confirmation de cette question : « `Terminer`
 * demande confirmation uniquement si l'activité est trop courte pour produire un
 * résultat ». Sans fonction commune, chaque écran (feuille de fin E26, overlay de
 * pause E23) aurait recodé le test — et un écran aurait fini par demander
 * confirmation sur une sortie valide, ou pire, par n'en demander aucune sur une
 * sortie qui allait être refusée.
 *
 * LES BORNES NE SONT PAS NOUVELLES : ce sont EXACTEMENT les deux minima §3.2 de
 * la discipline (`minDistanceM`, `minDurationS` — 800 m / 300 s à pied,
 * 2 000 m / 360 s à vélo), donc les mêmes que celles que le serveur applique à
 * l'ingestion. Aucun troisième seuil n'est introduit : un client qui promettrait
 * un résultat que le serveur refuse serait la définition du mensonge d'écran.
 *
 * CE QUE CETTE FONCTION N'AFFIRME PAS : qu'un TERRITOIRE sera capturé. Elle dit
 * seulement que la sortie franchit le plancher d'enregistrement §3.2. La boucle,
 * son aire, sa compacité et le verdict territorial restent au serveur.
 *
 * Valeurs non finies ou négatives ⇒ `false` : sans mesure lisible, on ne
 * promet rien.
 */
export function activityProducesResult(
  distanceM: number,
  durationS: number,
  activity: Activity = DEFAULT_ACTIVITY,
): boolean {
  if (!Number.isFinite(distanceM) || !Number.isFinite(durationS)) return false;
  const rules = activityRules(activity);
  return distanceM >= rules.minDistanceM && durationS >= rules.minDurationS;
}

// ═══════════════════════════════════════════════════════════════════════════
// E14 × ROUTAGE — LE PLANIFICATEUR SAIT ENFIN PROPOSER UNE BOUCLE VÉLO
// (DÉCISION FONDATEUR 26/07/2026 : « il faut tout brancher pour que la partie
//  bike fonctionne dès maintenant […] il faut le mettre entier et le pousser
//  maintenant ».)
//
// CE QUI CHANGE, ET POURQUOI C'EST UN CHANGEMENT DE RÈGLE, PAS UN RÉGLAGE :
// `ROUTE_PEDESTRIAN_PROFILE` portait, en commentaire, « jamais car/bike ».
// C'était JUSTE : à cette date, toute route GRYD était une route de coureur, et
// router un coureur au profil vélo l'aurait envoyé sur des voies qu'il n'a rien
// à faire d'emprunter. Ça ne l'est plus — refuser le profil vélo à une sortie
// DÉCLARÉE vélo, c'est refuser au cycliste la seule aide que le jeu sait
// donner : une boucle qui suit de vraies rues. L'interdit devient donc une
// RÈGLE PAR DISCIPLINE ; il ne disparaît pas, il se lit à la bonne ligne.
//
// CE QUI NE CHANGE PAS : le profil `car` reste interdit dans TOUTES les
// disciplines (aucune route GRYD n'est produite pour une voiture), et la
// DENYLIST de voies rapides reste DURE dans les deux mondes.
//
// PÉRIMÈTRE : ce bloc décrit une SUGGESTION, jamais une règle de jeu. Aucune de
// ces constantes n'entre dans un claim, un score, un decay ou une protection.
// Un cycliste qui ignore la boucle proposée capture exactement pareil (§22,
// anti pay-to-win) — la même frontière que celle déjà posée pour les
// PRÉFÉRENCES DE PARCOURS (`ROUTE_TARGET_DISTANCE_*`).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Profil de routage du VÉLO (OSRM `bike` / valhalla `bicycle`). Ce n'est pas un
 * choix esthétique : le profil piéton route par des passages, des escaliers et
 * des sens interdits piétonnisés qu'un vélo ne peut pas prendre, et il ignore
 * les pistes cyclables qui sont précisément le bon terrain. Router un cycliste
 * au profil `foot` produirait un tracé que personne ne peut suivre — donc un
 * bouton qui ment (§ « aucun bouton mort », « l'app ne ment jamais »).
 */
export const BIKE_ROUTING_PROFILE = 'bike' as const;

/**
 * DENYLIST vélo — IDENTIQUE à la denylist piétonne, et ce n'est pas un raccourci.
 * En France, le code de la route interdit la bicyclette sur autoroute ET sur
 * route express (motorway/trunk et leurs bretelles `*_link`) exactement comme au
 * piéton ; raceway/bus_guideway/construction/proposed ne sont utilisables par
 * personne. La classe de voies dangereuses ne dépend donc pas de la discipline —
 * inventer une seconde liste, c'est fabriquer une divergence qui finira par
 * dériver. On RÉFÉRENCE la liste piétonne : les deux ne peuvent pas diverger.
 */
export const BIKE_ROUTE_FORBIDDEN_HIGHWAY_CLASSES: readonly string[] =
  ROUTE_FORBIDDEN_HIGHWAY_CLASSES;

/**
 * ALLOWLIST vélo = allowlist piétonne MOINS `steps`. Un escalier n'est ni
 * interdit ni dangereux : il est IMPRATICABLE à vélo (on descend et on porte).
 * Il ne mérite donc pas la denylist (qui rejette DUREMENT la route entière),
 * mais il ne peut pas non plus rester « normalement praticable » : hors
 * allowlist, il devient `unknown_class`, le signal DOUX déjà prévu par
 * engine/route.ts — remonté pour audit, jamais un rejet. C'est exactement la
 * gradation que ce moteur sait exprimer, et le seul écart honnête entre les
 * deux disciplines.
 * DÉRIVÉE (filtre), jamais recopiée : ajouter une classe piétonne l'ajoute ici.
 */
export const BIKE_ROUTE_RIDEABLE_HIGHWAY_CLASSES: readonly string[] =
  ROUTE_WALKABLE_HIGHWAY_CLASSES.filter((cls) => cls !== 'steps');

/**
 * Distances cibles proposées en un tap à VÉLO (m). DÉRIVÉES de l'échelle course
 * par le facteur de LONGUEUR ×5 déjà établi plus haut (planche E14 : boucle
 * course de référence 900 m ↔ boucle vélo 4 800 m, soit 5,33 arrondi
 * prudemment à 5) : [2, 3, 5, 8, 10, 15] km → [10, 15, 25, 40, 50, 75] km.
 *
 * Le rapport « plus petite suggestion / périmètre minimal de boucle » est le
 * MÊME dans les deux disciplines (2 000/1 000 = 10 000/5 000 = 2), donc la plus
 * petite sortie proposée fait toujours une zone — jamais une suggestion qui ne
 * peut rien capturer. Ce n'est pas une coïncidence entretenue à la main : le
 * facteur de longueur E14 (×5) EST le rapport des deux périmètres minimaux
 * (5 000 / 1 000), donc les deux tables restent alignées par construction.
 *
 * La table s'ouvre à 10 km depuis le 26/07/2026 (elle démarrait à 15 km) :
 * conséquence mécanique du 2 km rendu au coureur. Un cycliste gagne au passage
 * la sortie courte qui lui manquait — 10 km font deux fois le périmètre de
 * capture vélo, ils font donc bien une zone.
 */
export const BIKE_ROUTE_TARGET_DISTANCE_CHOICES_M = [
  10_000,
  15_000,
  25_000,
  40_000,
  50_000,
  75_000,
] as const;

/** Plancher d'une distance cible vélo = plancher d'une sortie qui compte (§3.2). */
export const BIKE_ROUTE_TARGET_DISTANCE_MIN_M = BIKE_MIN_DISTANCE_M;

/**
 * Plafond d'une distance cible vélo : 210 975 m = 5 × le marathon, par le même
 * facteur de longueur. Le raisonnement de la course est repris tel quel — le
 * plafond du SUGGÉRABLE est l'épreuve longue de référence de la discipline, pas
 * le plafond de l'INGÉRABLE (BIKE_MAX_DISTANCE_M, 400 km). Contrôle de
 * plausibilité : 5 × 42,195 km ≈ 211 km tombe à 5 % du brevet randonneur de
 * 200 km, l'épreuve longue grand public du vélo — la dérivation arrive donc où
 * le réel l'attend, ce qui vaut mieux qu'un chiffre choisi pour y arriver.
 * Comme à pied, le suggérable reste nettement sous l'ingérable (211 < 400).
 */
export const BIKE_ROUTE_TARGET_DISTANCE_MAX_M = 210_975;

/**
 * Plancher du sélecteur du planificateur, VÉLO (m) → 7 500 m. MÊME règle que la
 * course (`ROUTE_PLANNER_MIN_M`), appliquée au périmètre du VÉLO : chaque
 * discipline tient sa borne de SA géométrie de capture, jamais de celle de
 * l'autre. Conséquence assumée : un cycliste peut désormais viser une boucle de
 * 8 km, plus courte que la plus petite pastille (10 km) — et elle fait quand
 * même une zone, puisque 7 500 m > BIKE_LOOP_MIN_PERIMETER_M (5 000 m).
 */
export const BIKE_ROUTE_PLANNER_MIN_M =
  PLANNER_FLOOR_PERIMETER_FACTOR * BIKE_LOOP_MIN_PERIMETER_M;

/** Distance proposée quand rien n'est su du cycliste (m) → 15 000 m. */
export const BIKE_ROUTE_PLANNER_DEFAULT_M =
  PLANNER_DEFAULT_PERIMETER_FACTOR * BIKE_LOOP_MIN_PERIMETER_M;

/**
 * Plafond du sélecteur, VÉLO (m). IDENTIQUE au plafond de la cible vélo — et il
 * n'y a rien à corriger ici : la borne de préférence du vélo n'a jamais été
 * amputée par une contrainte SQL, parce qu'elle n'est pas encore enregistrable
 * (`route_preferences` ne porte pas de discipline, cf. « en suspens » E14). Le
 * repère reste celui de la discipline : ~211 km, l'ordre de grandeur du brevet
 * randonneur de 200 km, très en dessous de BIKE_MAX_DISTANCE_M (400 km).
 * L'alias existe pour que le planificateur lise TOUJOURS un champ `planner*`,
 * et jamais par erreur une borne de préférence.
 */
export const BIKE_ROUTE_PLANNER_MAX_M = BIKE_ROUTE_TARGET_DISTANCE_MAX_M;

/**
 * Règles de ROUTAGE d'une discipline — tout ce dont un planificateur a besoin
 * pour proposer un tracé, et rien de plus. Séparé d'`ActivityRuleSet`
 * VOLONTAIREMENT : celui-ci porte des bornes ANTI-TRICHE (elles décident si un
 * effort compte), celui-là une SUGGESTION (elle ne décide de rien). Les mélanger
 * ferait croire qu'une préférence de parcours est une règle de jeu.
 */
export interface ActivityRoutingRules {
  /** Profil de routage OSRM/valhalla. Jamais `car`, dans aucune discipline. */
  readonly profile: string;
  /** Classes OSM interdites — rejet DUR d'une route qui en contient une. */
  readonly forbiddenHighwayClasses: readonly string[];
  /** Classes OSM normalement praticables ; hors liste ⇒ signal DOUX. */
  readonly usableHighwayClasses: readonly string[];
  /** Distances cibles proposées en un tap (m). */
  readonly targetDistanceChoicesM: readonly number[];
  /**
   * Plancher d'une distance cible ENREGISTRABLE (m) = plancher d'une sortie qui
   * compte. C'est une borne de PRÉFÉRENCE (elle part en base) — le sélecteur du
   * planificateur, lui, lit `plannerMinM`.
   */
  readonly targetDistanceMinM: number;
  /**
   * Plafond d'une distance ENREGISTRABLE (m) — jamais le plafond d'ingestion,
   * et jamais non plus celui du sélecteur (`plannerMaxM`). Pour la course, ce
   * champ est le miroir d'une contrainte SQL en production (0054).
   */
  readonly targetDistanceMaxM: number;
  /**
   * Plancher du SÉLECTEUR du planificateur (m). Distinct de
   * `targetDistanceMinM` : une cible de planificateur n'est écrite nulle part,
   * elle n'est bornée que par la géométrie de capture de la discipline.
   */
  readonly plannerMinM: number;
  /** Distance proposée par le planificateur quand rien n'est su du joueur (m). */
  readonly plannerDefaultM: number;
  /** Plafond du SÉLECTEUR du planificateur (m) — plausibilité humaine, pas SQL. */
  readonly plannerMaxM: number;
  /**
   * Périmètre minimal d'une boucle qui fait une ZONE (m). Recopié depuis
   * `ACTIVITY_RULES[activity].loopMinPerimeterM` — le planificateur ne doit
   * JAMAIS proposer une boucle plus courte que ce que le moteur sait capturer,
   * sinon la suggestion promet une zone que la course ne rendra pas.
   */
  readonly loopMinPerimeterM: number;
}

/** Table COMPLÈTE du routage par discipline — seule porte d'entrée d'un planificateur. */
export const ACTIVITY_ROUTING: Readonly<Record<Activity, ActivityRoutingRules>> = {
  run: {
    profile: ROUTE_PEDESTRIAN_PROFILE,
    forbiddenHighwayClasses: ROUTE_FORBIDDEN_HIGHWAY_CLASSES,
    usableHighwayClasses: ROUTE_WALKABLE_HIGHWAY_CLASSES,
    targetDistanceChoicesM: ROUTE_TARGET_DISTANCE_CHOICES_M,
    targetDistanceMinM: ROUTE_TARGET_DISTANCE_MIN_M,
    targetDistanceMaxM: ROUTE_TARGET_DISTANCE_MAX_M,
    plannerMinM: ROUTE_PLANNER_MIN_M,
    plannerDefaultM: ROUTE_PLANNER_DEFAULT_M,
    plannerMaxM: ROUTE_PLANNER_MAX_M,
    loopMinPerimeterM: LOOP_MIN_PERIMETER_M,
  },
  bike: {
    profile: BIKE_ROUTING_PROFILE,
    forbiddenHighwayClasses: BIKE_ROUTE_FORBIDDEN_HIGHWAY_CLASSES,
    usableHighwayClasses: BIKE_ROUTE_RIDEABLE_HIGHWAY_CLASSES,
    targetDistanceChoicesM: BIKE_ROUTE_TARGET_DISTANCE_CHOICES_M,
    targetDistanceMinM: BIKE_ROUTE_TARGET_DISTANCE_MIN_M,
    targetDistanceMaxM: BIKE_ROUTE_TARGET_DISTANCE_MAX_M,
    plannerMinM: BIKE_ROUTE_PLANNER_MIN_M,
    plannerDefaultM: BIKE_ROUTE_PLANNER_DEFAULT_M,
    plannerMaxM: BIKE_ROUTE_PLANNER_MAX_M,
    loopMinPerimeterM: BIKE_LOOP_MIN_PERIMETER_M,
  },
};

/**
 * Règles de routage d'une discipline. Argument absent ⇒ DEFAULT_ACTIVITY :
 * tout appelant qui ignore encore la notion de discipline obtient EXACTEMENT le
 * routage piéton d'avant le vélo.
 */
export function activityRouting(activity: Activity = DEFAULT_ACTIVITY): ActivityRoutingRules {
  return ACTIVITY_ROUTING[activity] ?? ACTIVITY_ROUTING.run;
}

// ═══════════════════════════════════════════════════════════════════════════
// E14 × E12 — LA FRONTIÈRE « SÉPARÉ / GLOBAL », ÉCRITE UNE FOIS POUR TOUTES
//
// ⚠️ OVERRIDE EXPLICITE DE LA PLANCHE E12 — DÉCISION FONDATEUR DU 26/07/2026.
// La planche `docs/design/vague-1/PLANCHES.md` §E12 dit, mot pour mot :
// « Run et Bike ont des rangs SÉPARÉS. » Elle a été écrite le 24/07/2026, avant
// que le vélo soit branché, et sa carte de rang mêle DEUX choses que le produit
// distingue désormais : le RANG DE SAISON (Argent II, « Rang local · Run ») et
// le NIVEAU DU JOUEUR (Niveau 12, « 2 340 / 3 000 XP »).
//
// LE FONDATEUR TRANCHE, le 26/07/2026, mot pour mot : « LE NIVEAU DOIT ÊTRE
// GLOBAL […] un kilomètre à vélo fait progresser le même joueur qu'un kilomètre
// à pied. » Donc :
//   · RANG DE SAISON, POINTS DE SAISON, CLASSEMENTS  → SÉPARÉS (E12 tient) ;
//   · NIVEAU ET XP DU JOUEUR                         → GLOBAUX (E12 est
//     OVERRIDÉ sur ce point précis, et sur celui-là seulement).
//
// POURQUOI CETTE DISTINCTION EST COHÉRENTE, ET PAS UN COMPROMIS : un CLASSEMENT
// compare des joueurs entre eux — mêler deux disciplines y fabriquerait une
// hiérarchie fausse (E14 : « jamais Run + Bike dans une même lecture
// compétitive »). Un NIVEAU ne compare personne : il mesure le chemin parcouru
// par UNE personne. Scinder son XP punirait le joueur complet, qui verrait deux
// demi-progressions au lieu d'une — exactement le contraire de ce que le niveau
// raconte.
//
// CE BLOC EST LA SOURCE DE CETTE FRONTIÈRE. Il est DATA, et il est TESTÉ
// (supabase/functions/ingest_run/activity_scope_test.ts + engine/activityScope.ts) :
// un agent qui « corrigerait la conformité » en scindant l'XP, ou en sommant les
// territoires, fera tomber la suite — la décision produit est une propriété
// vérifiée, pas un commentaire qu'on peut lire de travers.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les dimensions du jeu qui doivent choisir un camp. La valeur dit CE QUE LA
 * DIMENSION EST, pas ce que le code en fait aujourd'hui (l'écart entre les deux
 * est un bug, et c'est précisément ce que les tests mesurent) :
 *   · `per_activity` — deux mondes qui ne se voient pas et ne se somment jamais ;
 *   · `global`       — une seule valeur, nourrie par les deux disciplines.
 */
export const ACTIVITY_SCOPE = {
  /** E14 : deux lignes `hex_claims`, deux propriétaires. Jamais additionnées. */
  territory: 'per_activity',
  /** `runs.activity` — une sortie appartient à une discipline et une seule. */
  runs: 'per_activity',
  /** E12/E14 : `season_scores` est clé par (saison, joueur, DISCIPLINE). */
  seasonPoints: 'per_activity',
  /** E12 : le rang de saison se calcule DANS un monde (`rank_cache` gelé par discipline). */
  seasonRank: 'per_activity',
  /** Vues `player_leaderboard` / `crew_leaderboard` / `sector_control` : une ligne par monde. */
  leaderboards: 'per_activity',
  /** Historique de courses : filtrable par discipline (index `runs_user_activity_started_idx`). */
  history: 'per_activity',
  /** Missions et objectifs : une mission vélo ne se termine pas en courant. */
  missions: 'per_activity',
  /** OVERRIDE FONDATEUR 26/07/2026 : le joueur progresse, pas sa discipline. */
  xp: 'global',
  /** Idem — `users.level` est dérivé de `users.xp`, il ne peut pas être scindé sans lui. */
  level: 'global',
  /**
   * Foulées : monnaie de progression personnelle, même raisonnement que l'XP.
   * (Statu quo assumé et ANTÉRIEUR à l'override — inscrit ici pour que la
   * frontière soit lisible d'un seul endroit, pas pour l'élargir en douce.)
   */
  foulees: 'global',
  /** Série de jours actifs : elle mesure la CONSTANCE d'une personne, pas un sport. */
  streak: 'global',
} as const satisfies Readonly<Record<string, 'per_activity' | 'global'>>;

/** Dimension du jeu soumise à la frontière séparé/global. */
export type ActivityScopedDimension = keyof typeof ACTIVITY_SCOPE;
/** Camp d'une dimension : deux mondes, ou un seul. */
export type ActivityScopeKind = (typeof ACTIVITY_SCOPE)[ActivityScopedDimension];

// ─── CE QUI RESTE EN SUSPENS (à ne pas promettre, à ne pas oublier) ──────────
// 1. ANTI-TRICHE §8 DE LA SPÉC UNIFIÉE — les signaux « pattern d'accélération »,
//    « arrêts », « altitude/dénivelé » et « cohérence de trajectoire routière »
//    n'existent NULLE PART dans le code (aucune borne d'altitude n'a jamais été
//    définie). Sans eux, aucune borne de vitesse ne sépare un cycliste d'une
//    voiture EN VILLE. Les bornes ci-dessus arrêtent le véhicule LANCÉ et les
//    payloads forgés : c'est tout ce qu'elles prétendent faire.
// 2. TERRITOIRE ET CLASSEMENTS — APPLIQUÉS EN PRODUCTION DEPUIS LE 25/07/2026
//    (migration 0070). Elle donne à `hex_claims` la clé primaire COMPOSITE
//    `(h3index, activity)` et à `season_scores` la clé `(season_id, user_id,
//    activity)` : un claim vélo ne peut plus voler la zone d'un coureur (deux
//    lignes, deux propriétaires) et les points ne peuvent plus être sommés (deux
//    lignes de score). `claim_hexes` prend un 6ᵉ argument `p_activity` (défaut
//    'run'), et les mêmes colonnes sont portées par `runs`, `hex_co_captures`,
//    `partial_boundaries`, `steal_push_queue`, `contested_group_runs`,
//    `outposts`, `routes`, plus les agrégats `player_leaderboard` /
//    `crew_leaderboard` / `sector_control`. `ingest_run` est DÉPLOYÉ avec la
//    signature à 6 arguments.
//    CE QUE ÇA VAUT, dit plutôt que promis : les 32 invariants SQL ont été
//    vérifiés sur Postgres réel HORS de ce dépôt (`supabase/tests/
//    activity_dimension.pglite.test.mjs` — `@electric-sql/pglite` n'est pas
//    installé ici, le fichier sort 2 en disant « NON EXÉCUTÉ » ; la commande
//    pour le rejouer est écrite dans la migration). Depuis ce dépôt, ce qui est
//    MESURÉ est la LECTURE du SQL appliqué : supabase/functions/_shared/
//    activity_scope_test.ts vérifie les clés composites, l'upsert discipliné des
//    scores et le crédit d'XP resté global — c'est une preuve d'INTENTION du
//    fichier, pas une exécution.
//    CE QUI RESTE OUVERT AU 26/07/2026, côté MOTEUR ET SERVEUR :
//      · JOBS — `recompute_sectors` alimente `sector_snapshot`, dont la clé
//        primaire est `sector_id` SEUL (migration 0037:14, inchangée : 0070 et
//        0071 disent noir sur blanc ne pas y toucher) : le monde Bike y
//        écraserait le monde Run. Cette table est lue par la carte — sa
//        correction est un chantier CONJOINT schéma + `features/map/`, elle ne
//        peut pas être faite d'un seul côté.
//        REFERMÉ LE 26/07/2026 : `decay_job` écrit désormais PAR DISCIPLINE
//        (`groupKeysByActivity`) ; le garde-fou SQL n'est plus la seule défense.
//        REFERMÉ AUSSI, ET CE PARAGRAPHE L'A NIÉ TROP LONGTEMPS : `digest_job`
//        ne somme PLUS les deux mondes. Il sélectionne `activity` et groupe le
//        récap par « joueur + monde » (`worldKey` / `splitKey`,
//        supabase/functions/digest_job/index.ts:573-603, commentaire « PAR
//        DISCIPLINE (0071) ») ; les zones perdues passent par `buildZonesLost`,
//        qui refuse de chiffrer plutôt que de mêler quand la discipline ne se
//        tranche pas. Laisser écrit qu'un défaut corrigé est ouvert use la
//        confiance dans les avertissements de cette liste qui, eux, sont vrais.
//      · RPC non disciplinées qui lisent `hex_claims` : `crew_overview` (0044/
//        0046), `crew_mission_inputs` (0049), `daily_zone_inputs` (0052/0053),
//        `crew_pings_feed` (0051), `welcome_challenge_facts` (0052),
//        `habits_inputs` (0055), vues `sector_holdings` (0061) et
//        `sector_activity` (0040). Chacune change un CONTRAT lu par le mobile :
//        à faire avec l'écran concerné, jamais en aveugle.
//      · AGRÉGATS PERSONNELS — `user_stats` et la vue `specialty_leaderboard`
//        (voir §4) : le seul CLASSEMENT COMPARATIF qui mélange encore les deux
//        mondes, et donc le prochain à traiter.
//    CÔTÉ CLIENT, LES DEUX DERNIERS POINTS ONT ÉTÉ REFERMÉS LE 26/07/2026 — ils
//    étaient encore déclarés ouverts ici alors que le code les tient :
//      · `features/map/hexClaims.ts` FILTRE désormais (`.eq('activity',
//        activity)`, :188) et la lentille est une dépendance de l'effet (:225) :
//        basculer relit. La SECONDE lecture du même fichier (:322) omet le `.eq`
//        VOLONTAIREMENT et demande la colonne — elle sert à compter les deux
//        mondes sans les confondre ; son commentaire le dit sur place.
//      · `features/run/gps/runActivity.ts` ne force plus rien : la discipline
//        est DÉCLARÉE par le chemin de départ (`START_ACTIVITY_PARAM`) puis
//        montrée au joueur au préflight avant tout enregistrement. Ce qui
//        subsiste est `UNDECLARED_START_ACTIVITY` (:81), la valeur d'un chemin
//        qui ne déclare RIEN — un chemin antérieur au vélo, donc de la course à
//        pied. Ce n'est pas un forçage, c'est le comportement historique laissé
//        intact ; le symbole `DECLARED_START_ACTIVITY` nommé ici n'existe plus.
//    REFERMÉS LE 25/07/2026, à ne plus compter comme ouverts : `season_close`
//    (gel de `rank_cache` et départages §13 par discipline), `steal_push_job`
//    (il lit la discipline rendue par la RPC), `features/mission/
//    useRealMissionCore.ts`, `features/social/leagueBoard.ts` et
//    `features/social/economy.ts`.
//    La liste complète et datée vit dans le bloc « CE QUI RESTE EN SUSPENS » de
//    supabase/migrations/0070_activity_dimension.sql — ATTENTION, ce bloc DATE
//    du 25/07/2026 et décrit la migration comme non appliquée : elle l'a été
//    depuis, et une migration appliquée ne se réécrit JAMAIS. Sur l'état
//    d'application, c'est le présent commentaire qui fait foi ; sur le contenu
//    du schéma, c'est le SQL.
// 3. PLAFONDS PARTAGÉS — MAX_CLAIMS_PER_DAY (1 200) et INGEST_MAX_RUNS_PER_HOUR
//    (30) restent PAR COMPTE : un cycliste consomme le quota du coureur.
//    Arbitrage FONDATEUR (par compte, ou par compte × discipline ?) : non tranché
//    ici, volontairement.
// 4. COMPTEURS « RUN-SHAPED » — user_stats (~60 colonnes) et la vue
//    `specialty_leaderboard` (0069) qui les CLASSE entre joueurs, badges
//    (badges.ts réutilise RUN_AVG_PACE_MIN/MAX pour la « smart run »), XP,
//    Foulées, séries : tous mono-pot. Non disciplinés à ce stade — une sortie
//    vélo y serait comptée comme une course. Pour les badges, le défaut est SÛR
//    (les bornes d'allure de la course ne se déclenchent jamais à vélo, donc
//    rien n'est attribué à tort) ; pour `specialty_leaderboard`, non : c'est un
//    rang comparatif, et il mélangerait les deux mondes.
