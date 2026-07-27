/**
 * GRYD — engine/contest.ts
 * §9 de la spec produit (GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md) : CONTESTATION et
 * DÉFENSE d'un territoire POLYGONAL. LOT 3, briques PURES.
 *
 * ═══ LE CHANGEMENT DE FOND — LE VOL N'EST PLUS INSTANTANÉ ═══════════════════
 * Aujourd'hui `claim_hexes` fait `on conflict do update set owner_user_id =
 * excluded.owner_user_id` (0070_activity_dimension.sql:610) : le territoire
 * CHANGE DE MAIN DANS LA TRANSACTION. La spec §9 veut l'inverse — une boucle
 * rivale valide qui recouvre ≥ CONTEST_INTERSECTION_THRESHOLD du polygone
 * possédé le rend CONTESTÉ, ouvre une FENÊTRE DE DÉFENSE (§9.1/§9.2), et le
 * transfert n'a lieu qu'À L'ÉCHÉANCE, faute de défense valide (§9.3/§9.4).
 *
 * ⚠ CE FICHIER NE CÂBLE RIEN. Il fournit les RÈGLES ; `ingest_run`,
 * `claim_hexes` et le cron d'échéance sont un lot suivant. Tant que ce câblage
 * n'a pas eu lieu, LE VOL RESTE INSTANTANÉ EN PRODUCTION — le dire ici plutôt
 * que laisser croire qu'écrire la règle l'a appliquée.
 *
 * ═══ LA DÉCISION LA PLUS LOURDE DU LOT : ON N'EMPILE PAS LES DEUX MODÈLES ═══
 * Le dépôt protège DÉJÀ le territoire, autrement, et de façon cohérente
 * (AMENDEMENT-23 §D, `claims.ts` étape 6) : fraîcheur 6 h, lock 24 h,
 * bouclier 48 h, nouveau joueur 14 j — quatre garde-fous qui INTERDISENT le
 * vol. Superposer « le vol est interdit pendant 48 h » ET « le vol prend 18 h
 * de contestation » donnerait un territoire imprenable pendant 66 h : injouable.
 * LA SPEC L'EMPORTE (AUDIT_GRYD.md §3.2, PLAN §Lot 3). Réexpression, protection
 * par protection — c'est le tableau que le prochain lecteur doit trouver :
 *
 *   ANCIEN (claims.ts / AMENDEMENT-23 §D)   →   NOUVEAU (§9, ce fichier)
 *   ─────────────────────────────────────────────────────────────────────────
 *   fraîcheur 6 h  FRESH_CAPTURE_PROTECT_HOURS  →  ABSORBÉE. La contestation
 *     « vol impossible pendant 6 h après        s'ouvre quand même, mais la
 *     la capture » (anti-harcèlement)           fenêtre de niveau 0 (18 h)
 *                                               couvre déjà trois fois ces 6 h :
 *                                               le propriétaire a le temps de
 *                                               revenir. AUCUNE règle séparée.
 *   lock 24 h      HEX_LOCK_HOURS              →  DEVIENT LE NIVEAU 1 (24 h,
 *     « involable 24 h après capture »          FORTIFICATION_WINDOW_HOURS_BY_LEVEL[1]).
 *     (anti ping-pong)                          Même durée, sens inversé : elle
 *                                               ne s'OFFRE plus à la capture,
 *                                               elle se GAGNE par une défense
 *                                               réussie (`nextDefenseLevel`).
 *   bouclier 48 h  SHIELD_DURATION_HOURS       →  PLAFONNÉ AU NIVEAU 3 (36 h).
 *     objet consommable, ACHETABLE en éclats    §9.2 : « il n'est jamais
 *     (SHIELD_EXTRA_ECLATS = 90)                achetable ». Un bouclier vendu
 *                                               qui rallonge une fenêtre de
 *                                               défense EST du pay-to-win : il
 *                                               ne survit pas à §9.2 en tant
 *                                               qu'objet. La fortification le
 *                                               remplace, et elle ne s'achète
 *                                               par aucun chemin.
 *   nouveau joueur NEW_PLAYER_PROTECTION_DAYS  →  NE SE RÉEXPRIME PAS EN NIVEAU,
 *     14 j involable + sans decay               et c'est dit franchement : 14 j
 *                                               = 336 h ≫ 36 h, la table §9.2
 *                                               ne peut pas la porter. Elle
 *                                               reste donc ce qu'elle est — une
 *                                               règle d'ONBOARDING — mais elle
 *                                               change de point d'application :
 *                                               elle empêche l'OUVERTURE de la
 *                                               contestation (`shouldContest`,
 *                                               motif `defender_under_onboarding_protection`)
 *                                               au lieu d'empêcher un transfert
 *                                               instantané. C'est le SEUL
 *                                               reliquat de l'ancien modèle, il
 *                                               est nommé, et il est testé.
 *
 * Le DECAY (§3.3, ZONE_DECAY_DAYS) reste ORTHOGONAL : il fait perdre un
 * territoire faute d'y courir, sans aucun rival. Rien ici ne le touche.
 *
 * ═══ PURETÉ ════════════════════════════════════════════════════════════════
 * Aucune I/O, aucune horloge : `nowMs` est TOUJOURS un paramètre. Aucun nombre
 * magique : tous les seuils viennent de @klaim/shared/game-rules. La géométrie
 * est déléguée à `polygon.ts` (lot 1) — ce fichier ne recalcule aucune aire.
 *
 * ═══ ANTI PAY-TO-WIN ═══════════════════════════════════════════════════════
 * Aucune fonction de ce fichier ne lit, ne prend ni ne dérive un statut payant.
 * La fenêtre de défense ne dépend QUE du niveau de fortification, et le niveau
 * ne bouge QUE par des défenses réussies (`nextDefenseLevel`) et par le temps
 * (`decayedDefenseLevel`). Il n'existe aucun paramètre par lequel un achat
 * pourrait entrer.
 */
import {
  CONTEST_INTERSECTION_THRESHOLD,
  FORTIFICATION_WINDOW_HOURS_BY_LEVEL,
  MIN_POLYGON_AREA_M2,
  NEW_PLAYER_PROTECTION_DAYS,
  type FortificationLevel,
} from '@klaim/shared/game-rules';
import { intersectionRatio, polygonAreaM2, type PolygonRing } from './polygon.ts';

// Conversions d'unités — pas des règles de jeu.
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Tolérance NUMÉRIQUE de comparaison au seuil (sans unité, ~1e-9). Ce n'est PAS
 * un seuil de jeu : `intersectionRatio` passe par une projection locale et une
 * somme de shoelace, dont l'erreur double est de l'ordre de 1e-15. Sans cette
 * marge, un recouvrement de EXACTEMENT 60 % pourrait se lire 0.5999999999999999
 * et refuser la contestation — un joueur perdrait une conquête légitime à cause
 * d'un arrondi binaire. La marge est 6 ordres de grandeur au-dessus du bruit et
 * 8 en dessous du seuil : elle ne peut ni rater le bruit ni changer une règle.
 */
const RATIO_EPS = 1e-9;

/** Niveau de fortification maximal (§9.2) — DÉRIVÉ de la table, jamais écrit en dur. */
const MAX_DEFENSE_LEVEL = (FORTIFICATION_WINDOW_HOURS_BY_LEVEL.length - 1) as FortificationLevel;

// ═══════════════════════════════════════════════════════════════════════════
// §9.1 — DÉCLENCHEMENT DE LA CONTESTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pourquoi une boucle rivale conteste — ou ne conteste pas. Un motif = une
 * phrase honnête côté UI (« ta boucle couvre 42 % de cette zone, il en faut
 * 60 % »), jamais un booléen nu qui laisserait l'écran inventer l'explication.
 */
export type ContestReason =
  /** Contestation OUVERTE : le recouvrement atteint le seuil. */
  | 'overlap_reaches_threshold'
  /** La boucle attaquante n'est pas un polygone (< 3 sommets, ou aire nulle). */
  | 'attacker_polygon_degenerate'
  /** Le territoire visé n'est pas un polygone — rien à contester. */
  | 'defender_polygon_degenerate'
  /** La boucle attaquante n'est pas fermée (§9.1 « boucle rivale VALIDE »). */
  | 'attacker_loop_not_closed'
  /** La boucle attaquante a échoué à l'anti-triche (§11) — elle ne conteste rien. */
  | 'attacker_anti_cheat_failed'
  /** Boucle trop petite pour être un territoire (MIN_POLYGON_AREA_M2, §1.4). */
  | 'attacker_area_below_minimum'
  /** Propriétaire encore sous protection d'onboarding (NEW_PLAYER_PROTECTION_DAYS). */
  | 'defender_under_onboarding_protection'
  /** Recouvrement réel < CONTEST_INTERSECTION_THRESHOLD : simple frôlement. */
  | 'overlap_below_threshold';

/** Décision de §9.1, EXPLICABLE : le verdict, le chiffre, et le seuil comparé. */
export interface ContestDecision {
  /** true ⇔ le territoire passe CONTESTÉ et une fenêtre de défense s'ouvre. */
  contested: boolean;
  /**
   * Fraction de l'aire du territoire VISÉ couverte par la boucle attaquante,
   * ∈ [0, 1]. Toujours renseignée quand la géométrie le permet (0 sur un
   * polygone dégénéré) — jamais NaN, jamais absente : l'écran doit pouvoir
   * afficher « 42 % / 60 % » même quand la contestation est refusée.
   */
  overlapRatio: number;
  /** Le seuil auquel `overlapRatio` a été comparé (game-rules, jamais en dur). */
  threshold: number;
  /** Le motif, unique et explicite. */
  reason: ContestReason;
}

/**
 * Garde-fous fournis par l'APPELANT (déjà mesurés en amont) — tous optionnels,
 * et un garde-fou non fourni n'est PAS présumé satisfait : il n'est simplement
 * pas évalué ici. La validité GPS/anti-triche §3.2/§11 est établie par le
 * pipeline avant d'arriver jusqu'ici ; ces drapeaux permettent de la
 * re-refuser explicitement plutôt que de la supposer.
 */
export interface ContestGate {
  /** false ⇒ refus 'attacker_loop_not_closed'. Absent ⇒ non évalué ici. */
  attackerLoopClosed?: boolean;
  /** false ⇒ refus 'attacker_anti_cheat_failed'. Absent ⇒ non évalué ici. */
  attackerAntiCheatPassed?: boolean;
  /**
   * Protection d'onboarding du propriétaire visé (§3.3, réexprimée — voir le
   * tableau du docblock). Les deux instants vont ENSEMBLE ou pas du tout : un
   * `ownerCreatedAtMs` sans `nowMs` ne serait pas évaluable, et le typage
   * empêche de l'écrire.
   */
  defenderOnboarding?: { ownerCreatedAtMs: number; nowMs: number };
}

/**
 * §9.1 — « Une zone devient contestée lorsqu'une boucle rivale valide couvre le
 * seuil de surface. »
 *
 * SENS DE LA MESURE, et il n'est pas symétrique : on mesure la fraction du
 * TERRITOIRE VISÉ couverte par la boucle attaquante — `intersectionRatio(
 * defenderPolygon, attackerPolygon)`. Une petite boucle entièrement contenue
 * dans un grand territoire ne le conteste donc PAS (elle en couvre 5 %), alors
 * qu'elle est couverte à 100 %. C'est la lecture de §9.1 (« couvre la zone »),
 * et l'inverse rendrait n'importe quel petit tour de pâté de maisons capable de
 * remettre en jeu un quartier entier.
 *
 * ORDRE DES CONTRÔLES — GELÉ (et testé) : géométrie dégénérée, validité de la
 * boucle, aire minimale, protection d'onboarding, puis seuil. Le premier motif
 * rencontré est celui qui est rendu, et il est CHOISI : « ta boucle est trop
 * petite » est plus utile que « tu ne couvres pas 60 % », même quand les deux
 * sont vrais.
 *
 * Fonction PURE.
 */
export function shouldContest(
  attackerPolygon: PolygonRing,
  defenderPolygon: PolygonRing,
  gate: ContestGate = {},
): ContestDecision {
  const threshold = CONTEST_INTERSECTION_THRESHOLD;
  const refuse = (reason: ContestReason, overlapRatio: number): ContestDecision => ({
    contested: false,
    overlapRatio,
    threshold,
    reason,
  });

  const attackerArea = polygonAreaM2(attackerPolygon);
  if (attackerPolygon.length < 3 || attackerArea <= 0) {
    return refuse('attacker_polygon_degenerate', 0);
  }
  if (defenderPolygon.length < 3 || polygonAreaM2(defenderPolygon) <= 0) {
    return refuse('defender_polygon_degenerate', 0);
  }
  if (gate.attackerLoopClosed === false) return refuse('attacker_loop_not_closed', 0);
  if (gate.attackerAntiCheatPassed === false) return refuse('attacker_anti_cheat_failed', 0);
  if (attackerArea < MIN_POLYGON_AREA_M2) return refuse('attacker_area_below_minimum', 0);

  // Le recouvrement est calculé AVANT le dernier refus possible : même quand la
  // contestation est refusée pour cause de protection d'onboarding, l'écran doit
  // pouvoir dire « tu couvrais 78 % » — la donnée est réelle, on ne la cache pas.
  const overlapRatio = intersectionRatio(defenderPolygon, attackerPolygon);

  if (gate.defenderOnboarding) {
    const { ownerCreatedAtMs, nowMs } = gate.defenderOnboarding;
    const protectedUntil = ownerCreatedAtMs + NEW_PLAYER_PROTECTION_DAYS * MS_PER_DAY;
    if (nowMs < protectedUntil) {
      return refuse('defender_under_onboarding_protection', overlapRatio);
    }
  }

  if (overlapRatio + RATIO_EPS < threshold) {
    return refuse('overlap_below_threshold', overlapRatio);
  }
  return { contested: true, overlapRatio, threshold, reason: 'overlap_reaches_threshold' };
}

// ═══════════════════════════════════════════════════════════════════════════
// §9.2 — FORTIFICATION ET FENÊTRE DE DÉFENSE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ramène un entier quelconque dans 0-3. La base garantit déjà l'intervalle
 * (`territories_defense_level_check`) : un niveau hors bornes ici est un BUG
 * d'appelant, pas une donnée. On le borne plutôt que de rendre NaN ou `undefined`
 * — une échéance absurde serait pire qu'une échéance conservatrice — et le test
 * verrouille ce comportement pour qu'il reste une décision, pas un accident.
 */
function clampLevel(level: number): FortificationLevel {
  if (!Number.isFinite(level)) return 0;
  const n = Math.trunc(level);
  if (n <= 0) return 0;
  if (n >= MAX_DEFENSE_LEVEL) return MAX_DEFENSE_LEVEL;
  return n as FortificationLevel;
}

/** §9.2 — Durée (heures) de la fenêtre de défense au niveau donné. */
export function defenseWindowHours(defenseLevel: number): number {
  return FORTIFICATION_WINDOW_HOURS_BY_LEVEL[clampLevel(defenseLevel)];
}

/**
 * §9.1/§9.2 — Instant (ms epoch) auquel la contestation est tranchée : début de
 * la contestation + la fenêtre du niveau de fortification du territoire
 * (18 / 24 / 30 / 36 h). Aucune durée n'est écrite ici.
 *
 * DÉTERMINISTE : `startedAtMs` est celui de la contestation, jamais « now ».
 * Deux calculs de l'échéance à deux instants différents donnent la MÊME date —
 * c'est ce qui permet au cron d'échéance d'être rejoué sans dériver.
 */
export function contestDeadline(startedAtMs: number, defenseLevel: number): number {
  return startedAtMs + defenseWindowHours(defenseLevel) * MS_PER_HOUR;
}

/** Issue d'une contestation, du point de vue de la fortification. */
export type ContestOutcome = 'defended' | 'transferred' | 'cancelled';

/**
 * §9.2 — « Le niveau dépend des défenses récentes. » Axe ÉVÉNEMENTIEL :
 *  · défense réussie   → +1, plafonné au niveau maximal de la table ;
 *  · transfert         → 0 : le nouveau propriétaire N'HÉRITE PAS du bouclier
 *                        de celui qu'il vient de battre. Hériter d'un niveau 3
 *                        gagné par un autre rendrait la reprise (§9.4
 *                        « possibilité de reprise future ») quasi impossible ;
 *  · annulation        → inchangé : rien ne s'est joué.
 *
 * L'axe TEMPOREL (« décroît avec le temps ») est dans `decayedDefenseLevel` :
 * il exige une durée écoulée, qu'une fonction pure ne peut pas deviner. Deux
 * axes, deux fonctions — plutôt qu'un paramètre optionnel qui rendrait
 * silencieusement l'un des deux inopérant quand on l'oublie.
 *
 * JAMAIS ACHETABLE (§9.2) : les seules entrées sont un niveau et une issue de
 * match. Aucun statut payant n'a de porte d'entrée.
 */
export function nextDefenseLevel(
  current: number,
  outcome: ContestOutcome,
): FortificationLevel {
  const level = clampLevel(current);
  if (outcome === 'transferred') return 0;
  if (outcome === 'cancelled') return level;
  return clampLevel(level + 1);
}

/**
 * §9.2 — « … et décroît avec le temps. » Axe TEMPOREL.
 *
 * RÈGLE : un cran de fortification ne survit pas à SA PROPRE FENÊTRE sans
 * défense. Le niveau 3 (36 h) retombe à 2 après 36 h sans défense, puis à 1
 * après 30 h de plus, puis à 0 après 24 h de plus — 90 h en tout pour repartir
 * de zéro. La table §9.2 sert ainsi DEUX fois (durée de fenêtre, et coût
 * temporel du cran), ce qui évite d'inventer une constante de décroissance :
 * aucun nombre magique, et un seul curseur d'équilibrage à bouger.
 *
 * `lastDefendedAtMs` null/absent ⇒ AUCUNE décroissance appliquée, et le niveau
 * est rendu tel quel. Un territoire fortifié dont on ignore la dernière défense
 * est une donnée incomplète : on ne la remplace pas par une supposition.
 */
export function decayedDefenseLevel(params: {
  level: number;
  lastDefendedAtMs: number | null;
  nowMs: number;
}): FortificationLevel {
  let level = clampLevel(params.level);
  if (params.lastDefendedAtMs === null) return level;

  let remainingMs = params.nowMs - params.lastDefendedAtMs;
  while (level > 0) {
    const costMs = FORTIFICATION_WINDOW_HOURS_BY_LEVEL[level] * MS_PER_HOUR;
    if (remainingMs < costMs) break;
    remainingMs -= costMs;
    level = (level - 1) as FortificationLevel;
  }
  return level;
}

// ═══════════════════════════════════════════════════════════════════════════
// §9.3 — DÉFENSE VALIDE
// ═══════════════════════════════════════════════════════════════════════════

/** Statuts de §19.3, en minuscules (vocabulaire des énumérés du dépôt). */
export type ContestStatus = 'active' | 'defended' | 'transferred' | 'cancelled';

/** Un propriétaire : joueur OU crew (§19.2 `ownerType`/`ownerId`). */
export interface ContestParty {
  type: 'user' | 'crew';
  id: string;
}

/**
 * Ce qu'il faut savoir d'une contestation pour la juger. Reflet de la ligne
 * `territory_contests` (0078) + du territoire visé — lu par l'appelant, jamais
 * par ce module.
 */
export interface ContestSnapshot {
  territoryId: string;
  /** Propriétaire du territoire AU MOMENT de la contestation (celui qui défend). */
  owner: ContestParty;
  /** L'assaillant, qui deviendra propriétaire en cas de transfert (§9.4). */
  attacker: ContestParty;
  /** Le polygone CONTESTÉ : c'est lui que la défense doit re-couvrir. */
  polygon: PolygonRing;
  startedAtMs: number;
  /** Échéance, telle que persistée. Vient de `contestDeadline` à l'ouverture. */
  expiresAtMs: number;
  status: ContestStatus;
  /** Fortification du territoire à l'ouverture (0-3). Sert à l'issue, pas au jugement. */
  defenseLevel: number;
  /** Instant de résolution si la contestation est déjà tranchée, sinon null. */
  resolvedAtMs?: number | null;
}

/** Une activité candidate à la défense (§9.3). */
export interface DefenseActivity {
  /** Identité stable — sert aussi de départage DÉTERMINISTE en cas d'égalité. */
  activityId: string;
  /** Auteur de l'activité. */
  actorUserId: string;
  /** Crew ACTIF de l'auteur au moment de l'activité, si connu. */
  actorCrewId: string | null;
  /** Polygone de la boucle défensive. */
  polygon: PolygonRing;
  /** §9.3 « boucle fermée ». */
  closedLoop: boolean;
  /** Fin de l'activité (ms epoch) — c'est CETTE date que §9.3 compare à l'échéance. */
  finishedAtMs: number;
  /** §9.3 « validation anti-triche » (§11) : verdict du pipeline, pas d'ici. */
  antiCheatPassed: boolean;
}

/** Motif du verdict de §9.3. Un motif = une phrase honnête côté UI. */
export type DefenseReason =
  | 'valid'
  /** La contestation n'est plus ouverte : rien à défendre. */
  | 'contest_not_active'
  /** Ni le propriétaire, ni un membre du crew propriétaire (§9.3 1er point). */
  | 'not_owner_activity'
  /** Activité terminée APRÈS l'instant courant : impossible, donc rejetée. */
  | 'finished_in_future'
  /** Activité terminée AVANT l'ouverture de la contestation : elle ne la défend pas. */
  | 'finished_before_contest'
  /** §9.3 « activité terminée avant échéance » — ici, elle ne l'est pas. */
  | 'finished_after_deadline'
  /** §9.3 « validation anti-triche ». */
  | 'anti_cheat_failed'
  /** §9.3 « boucle fermée ». */
  | 'loop_not_closed'
  /** §9.3 « intersection suffisante avec la zone contestée ». */
  | 'overlap_below_threshold';

/** Verdict de §9.3, EXPLICABLE (même exigence que `ContestDecision`). */
export interface DefenseVerdict {
  valid: boolean;
  reason: DefenseReason;
  /** Fraction de la zone CONTESTÉE re-couverte par la boucle défensive ∈ [0, 1]. */
  overlapRatio: number;
  /** Seuil comparé — le MÊME que celui de l'attaque, cf. docblock. */
  threshold: number;
}

/**
 * §9.3 — Une défense est valide si : activité du propriétaire (ou du crew
 * propriétaire), boucle fermée, intersection suffisante avec la zone contestée,
 * activité terminée avant échéance, validation anti-triche.
 *
 * QUEL SEUIL D'INTERSECTION ? §9.3 dit « suffisante » sans donner de constante.
 * On réutilise CONTEST_INTERSECTION_THRESHOLD, et c'est un choix explicite :
 * défendre demande AUTANT que conquérir. Inventer un second seuil (plus doux)
 * aurait été un nombre magique et un avantage caché au tenant du terrain ; plus
 * dur, une punition invisible. Symétrique, donc explicable en une phrase.
 *
 * SENS DE LA MESURE : fraction de la ZONE CONTESTÉE couverte par la boucle
 * défensive — même sens que §9.1, pour que « 60 % » veuille dire la même chose
 * des deux côtés.
 *
 * ORDRE DES CONTRÔLES — GELÉ (et testé) : statut, appartenance, cohérence
 * temporelle (futur, avant, après), anti-triche, boucle fermée, recouvrement.
 * L'appartenance passe avant tout le reste : un tiers n'a même pas à savoir
 * pourquoi sa boucle ne défend pas un territoire qui n'est pas le sien.
 *
 * Fonction PURE — `nowMs` injecté.
 */
export function isDefenseValid(params: {
  contest: ContestSnapshot;
  defenseActivity: DefenseActivity;
  nowMs: number;
}): DefenseVerdict {
  const { contest, defenseActivity: act, nowMs } = params;
  const threshold = CONTEST_INTERSECTION_THRESHOLD;
  const refuse = (reason: DefenseReason, overlapRatio = 0): DefenseVerdict => ({
    valid: false,
    reason,
    overlapRatio,
    threshold,
  });

  if (contest.status !== 'active') return refuse('contest_not_active');

  // §9.3 1er point. Territoire personnel ⇒ SON propriétaire ; territoire de crew
  // ⇒ n'importe quel membre actif de CE crew (l'appelant fournit le crew actif
  // de l'auteur ; ce module ne consulte aucune table).
  const belongs = contest.owner.type === 'user'
    ? act.actorUserId === contest.owner.id
    : act.actorCrewId !== null && act.actorCrewId === contest.owner.id;
  if (!belongs) return refuse('not_owner_activity');

  if (act.finishedAtMs > nowMs) return refuse('finished_in_future');
  if (act.finishedAtMs < contest.startedAtMs) return refuse('finished_before_contest');
  if (act.finishedAtMs > contest.expiresAtMs) return refuse('finished_after_deadline');
  if (!act.antiCheatPassed) return refuse('anti_cheat_failed');
  if (!act.closedLoop) return refuse('loop_not_closed');

  const overlapRatio = intersectionRatio(contest.polygon, act.polygon);
  if (overlapRatio + RATIO_EPS < threshold) {
    return refuse('overlap_below_threshold', overlapRatio);
  }
  return { valid: true, reason: 'valid', overlapRatio, threshold };
}

// ═══════════════════════════════════════════════════════════════════════════
// §9.4 — RÉSOLUTION À L'ÉCHÉANCE
// ═══════════════════════════════════════════════════════════════════════════

/** Motif de l'état rendu par `resolveContest`. */
export type ResolutionReason =
  /** L'échéance n'est pas atteinte : la contestation reste ouverte. */
  | 'deadline_not_reached'
  /** Échéance atteinte, au moins une défense valide : propriété CONSERVÉE. */
  | 'defense_valid_at_deadline'
  /** Échéance atteinte, aucune défense valide : TRANSFERT. */
  | 'no_valid_defense_at_deadline'
  /** La contestation était déjà tranchée : le verdict est RENDU À L'IDENTIQUE. */
  | 'already_resolved';

/** Ce qu'il faut appliquer en base après §9.4 — décidé ici, écrit ailleurs. */
export interface ContestResolution {
  /** Statut à écrire sur la contestation. */
  status: ContestStatus;
  reason: ResolutionReason;
  /** Instant de résolution (ms), null tant que la contestation reste ouverte. */
  resolvedAtMs: number | null;
  /** Nouveau propriétaire à appliquer au territoire, null si conservation. */
  newOwner: ContestParty | null;
  /** Niveau de fortification à écrire sur le territoire après §9.4. */
  defenseLevel: FortificationLevel;
  /** L'activité qui a défendu (déterministe), null s'il n'y en a pas. */
  winningDefenseId: string | null;
  /**
   * true dès qu'une défense valide existe, MÊME avant l'échéance : l'écran peut
   * alors dire « défense enregistrée, verdict à H-x » sans re-dériver la règle.
   */
  hasValidDefense: boolean;
}

/**
 * §9.4 — À l'échéance : défense valide ⇒ propriété conservée ; sinon transfert.
 *
 * IDEMPOTENTE ET DÉTERMINISTE, et ce n'est pas une formule de politesse — c'est
 * un cron qui appellera cette fonction, avec des retards, des rejeux et des
 * doublons. Trois propriétés le garantissent :
 *  1. `resolvedAtMs` vaut l'ÉCHÉANCE, jamais `nowMs`. Résoudre à l'heure ou
 *     trois jours plus tard produit le MÊME instant de résolution : l'histoire
 *     ne dépend pas de l'heure à laquelle le cron s'est réveillé.
 *  2. Une contestation déjà tranchée (`status !== 'active'`) est RENDUE TELLE
 *     QUELLE, sans rejuger : rejouer la résolution ne peut pas retourner un
 *     verdict. Le second appel est un no-op observable, pas un second transfert.
 *  3. Le choix de la défense retenue est TOTAL et sans ex æquo : la plus
 *     ANCIENNE fin d'activité l'emporte (celle qui a réellement sauvé la zone),
 *     et à date identique, le plus petit `activityId` — un départage arbitraire
 *     mais stable vaut mieux qu'un « la première du tableau », qui dépendrait
 *     de l'ordre d'un `select` sans `order by`.
 *
 * `cancelled` n'est JAMAIS produit ici : une annulation vient de l'extérieur
 * (activité attaquante invalidée a posteriori, territoire disparu, compte
 * supprimé). Cette fonction sait la RECONNAÎTRE et la rendre, pas la décider.
 *
 * Fonction PURE — `nowMs` injecté.
 */
export function resolveContest(params: {
  contest: ContestSnapshot;
  defenses: readonly DefenseActivity[];
  nowMs: number;
}): ContestResolution {
  const { contest, defenses, nowMs } = params;

  // (2) Déjà tranchée : on rend le verdict existant, on ne rejuge rien.
  if (contest.status !== 'active') {
    return {
      status: contest.status,
      reason: 'already_resolved',
      resolvedAtMs: contest.resolvedAtMs ?? null,
      newOwner: null,
      defenseLevel: clampLevel(contest.defenseLevel),
      winningDefenseId: null,
      hasValidDefense: false,
    };
  }

  // (3) Sélection déterministe de la défense retenue.
  let winner: DefenseActivity | null = null;
  for (const act of defenses) {
    if (!isDefenseValid({ contest, defenseActivity: act, nowMs }).valid) continue;
    if (
      winner === null ||
      act.finishedAtMs < winner.finishedAtMs ||
      (act.finishedAtMs === winner.finishedAtMs && act.activityId < winner.activityId)
    ) {
      winner = act;
    }
  }

  // Avant l'échéance, RIEN n'est tranché — §9.4 dit « à l'échéance ». On rend
  // quand même `hasValidDefense` : c'est une information réelle, la cacher
  // obligerait l'écran à la recalculer, donc à dupliquer la règle.
  if (nowMs < contest.expiresAtMs) {
    return {
      status: 'active',
      reason: 'deadline_not_reached',
      resolvedAtMs: null,
      newOwner: null,
      defenseLevel: clampLevel(contest.defenseLevel),
      winningDefenseId: winner?.activityId ?? null,
      hasValidDefense: winner !== null,
    };
  }

  if (winner !== null) {
    return {
      status: 'defended',
      reason: 'defense_valid_at_deadline',
      resolvedAtMs: contest.expiresAtMs, // (1) jamais nowMs
      newOwner: null,
      defenseLevel: nextDefenseLevel(contest.defenseLevel, 'defended'),
      winningDefenseId: winner.activityId,
      hasValidDefense: true,
    };
  }

  return {
    status: 'transferred',
    reason: 'no_valid_defense_at_deadline',
    resolvedAtMs: contest.expiresAtMs, // (1) jamais nowMs
    newOwner: contest.attacker,
    defenseLevel: nextDefenseLevel(contest.defenseLevel, 'transferred'),
    winningDefenseId: null,
    hasValidDefense: false,
  };
}
