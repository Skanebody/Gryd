/**
 * GRYD — engine/bonus.ts
 * AMENDEMENT-19 §2/§5/§6 — Moteur de bonus aléatoires CIBLÉS (« GRYD ne te donne
 * pas des bonus au hasard. Il révèle les bons moments pour agir. »).
 *
 * Fonctions PURES : aucune I/O, aucune horloge cachée, aucun accès réseau/DB.
 * L'appelant (Carte/War Room/Crew Chat/Post-run côté client, ingest_run/
 * digest_job côté serveur) lit l'état, appelle ces fonctions, persiste/affiche.
 * TOUS les seuils/caps/pourcentages/priorités viennent de @klaim/shared/game-
 * rules ; les FICHES de bonus viennent de @klaim/shared/bonuses — AUCUN nombre
 * magique, AUCUNE règle en dur ici (config-driven).
 *
 * Trois primitives :
 *  1. selectBonus(context, screen) — LE bonus le plus pertinent pour cet écran,
 *     pondéré par le CONTEXTE (joueur/crew/carte/temps) selon la PRIORITÉ
 *     (défense urgente > boucle à terminer > mission crew > coffre presque
 *     ouvert > retour/streak > exploration > cosmétique). JAMAIS de random nu :
 *     à priorité égale l'ordre est déterministe (id). Renvoie null si aucun
 *     bonus n'est pertinent sur cet écran.
 *  2. applyBonusReward(bonus, base) — la récompense CAPÉE à +35 % total
 *     (BONUS_MAX_TOTAL_PCT). UN SEUL multiplicateur : le pourcentage du bonus
 *     s'AJOUTE au pourcentage système déjà présent, puis le total est borné —
 *     JAMAIS de cumul multiplicatif (25 % + 25 % → 35 %, pas 56 %). Le coffre et
 *     l'XP ne sont JAMAIS des points/territoire/classement.
 *  3. eligible(bonus, context) — l'anti-abus complet (run vérifié, même crew,
 *     caps joueur/crew, cooldown zone). Un run qui échoue une seule garde n'est
 *     jamais récompensé.
 *
 * Le SERVEUR reste seul juge : ces fonctions décrivent la pertinence et bornent
 * l'impact ; l'appelant lit les active_bonuses/claims réels et persiste.
 */
import {
  BONUS_CREW_CHEST_MAX_RATIO,
  BONUS_CREW_CHEST_MIN_RATIO,
  BONUS_DEFENSE_DECAY_MAX_H,
  BONUS_MAX_TOTAL_PCT,
  BONUS_MIN_MOTION_TRUST,
  BONUS_PRIORITY,
  BONUS_RETURN_ABSENCE_MAX_DAYS,
  BONUS_RETURN_ABSENCE_MIN_DAYS,
  FINISHER_BONUS_MISSING_MAX_M,
} from '@klaim/shared/game-rules';
import { BONUS_DEFINITIONS } from '@klaim/shared/bonuses';
import type {
  BonusDefinition,
  BonusId,
  BonusReward,
  BonusVisibility,
} from '@klaim/shared/types';

// ─── Contexte de sélection (pertinence) ──────────────────────────────────────

/** Signaux JOUEUR (doc §2) — pertinence perso (retour/streak/exploration). */
export interface BonusPlayerContext {
  /** Jours écoulés depuis la dernière course (Retour). undefined = jamais couru. */
  daysSinceLastRun?: number;
  /** Un secteur vierge/peu couru est à proximité (Exploration). */
  hasUnexploredSectorNear?: boolean;
  /** La dernière course a fermé une boucle propre (Boucle Propre, post-run). */
  cleanLoopClosed?: boolean;
}

/** Signaux CREW (doc §2) — pertinence collective (finisher/défense/coffre). */
export interface BonusCrewContext {
  /** Le joueur a un crew (sinon aucun bonus crew ne s'affiche). */
  hasCrew: boolean;
  /** Mètres manquants de la frontière crew ouverte la plus proche (Finisher). */
  nearestOpenBoundaryMissingM?: number;
  /** Heures restantes avant decay de la zone crew la plus menacée (Défense). */
  soonestZoneDecayH?: number;
  /** Progression du coffre crew hebdo, part 0-1 du prochain palier (Coffre Crew). */
  chestRatio?: number;
}

/**
 * Contexte complet de sélection. `player`/`crew` regroupent les signaux de
 * pertinence ; le moteur ne lit RIEN d'autre (pas d'horloge, pas de hasard).
 */
export interface BonusSelectionContext {
  player: BonusPlayerContext;
  crew: BonusCrewContext;
}

/**
 * Un bonus PERTINENT et affichable sur un écran donné, avec son poids de
 * priorité (BONUS_PRIORITY) — l'appelant affiche `def` et peut trier/animer
 * selon `priority`.
 */
export interface SelectedBonus {
  def: BonusDefinition;
  priority: number;
}

/** Priorité d'un bonus (BONUS_PRIORITY, 0 si non priorisé — ne devrait pas arriver). */
function priorityOf(id: BonusId): number {
  return (BONUS_PRIORITY as Record<string, number>)[id] ?? 0;
}

/**
 * Le bonus `id` est-il PERTINENT dans ce contexte (« bon moment pour agir ») ?
 * PURE. C'est le cœur du « ciblé, jamais random nu » : chaque bonus n'apparaît
 * QUE si son signal de contexte est dans sa fenêtre de game-rules. Aucun bonus
 * crew ne devient pertinent sans crew.
 */
export function isRelevant(id: BonusId, context: BonusSelectionContext): boolean {
  const { player, crew } = context;
  switch (id) {
    case 'finisher': {
      // Frontière crew ouverte ET segment manquant court (proche à fermer).
      if (!crew.hasCrew) return false;
      const m = crew.nearestOpenBoundaryMissingM;
      return m !== undefined && m > 0 && m <= FINISHER_BONUS_MISSING_MAX_M;
    }
    case 'defense_critical': {
      // Zone crew dont le decay tombe dans les prochaines [0, 12] h.
      if (!crew.hasCrew) return false;
      const h = crew.soonestZoneDecayH;
      return h !== undefined && h >= 0 && h <= BONUS_DEFENSE_DECAY_MAX_H;
    }
    case 'crew_chest': {
      // Coffre crew dans la dernière ligne droite [80 %, 95 %].
      if (!crew.hasCrew) return false;
      const r = crew.chestRatio;
      return r !== undefined && r >= BONUS_CREW_CHEST_MIN_RATIO && r <= BONUS_CREW_CHEST_MAX_RATIO;
    }
    case 'return': {
      // Joueur absent [5, 10] j (anti-shame : ni avant, ni trop tard).
      const d = player.daysSinceLastRun;
      return d !== undefined &&
        d >= BONUS_RETURN_ABSENCE_MIN_DAYS &&
        d <= BONUS_RETURN_ABSENCE_MAX_DAYS;
    }
    case 'exploration':
      return player.hasUnexploredSectorNear === true;
    case 'clean_loop':
      return player.cleanLoopClosed === true;
    default:
      return false;
  }
}

/**
 * Sélectionne LE bonus le plus pertinent pour `screen` (doc §4 : un seul bonus
 * principal par écran). PURE. Étapes :
 *  1. ne considère que les bonus dont la fiche est VISIBLE sur cet écran
 *     (def.visibility inclut `screen`) ;
 *  2. filtre par PERTINENCE de contexte (isRelevant — la fenêtre game-rules) ;
 *  3. choisit le bonus de PRIORITÉ la plus forte (BONUS_PRIORITY : défense
 *     urgente > boucle à terminer > mission crew > coffre presque ouvert >
 *     retour/streak > exploration > cosmétique). Départage déterministe par id
 *     (jamais de tirage aléatoire — « ciblé, pas random nu »).
 * Renvoie le bonus + sa priorité, ou null (rien de pertinent sur cet écran).
 *
 * NB : selectBonus décide de la PERTINENCE d'AFFICHAGE. L'ÉLIGIBILITÉ à la
 * RÉCOMPENSE (anti-abus, caps réels) est tranchée séparément par eligible() +
 * l'appelant serveur — un bonus peut s'afficher sans être encore récompensable.
 */
export function selectBonus(
  context: BonusSelectionContext,
  screen: BonusVisibility,
): SelectedBonus | null {
  let best: SelectedBonus | null = null;
  // Ordre déterministe des ids (clés de BONUS_DEFINITIONS) pour un départage stable.
  const ids = Object.keys(BONUS_DEFINITIONS) as BonusId[];
  for (const id of ids) {
    const def = BONUS_DEFINITIONS[id];
    if (!def.visibility.includes(screen)) continue;
    if (!isRelevant(id, context)) continue;
    const priority = priorityOf(id);
    if (
      best === null ||
      priority > best.priority ||
      (priority === best.priority && id < best.def.id)
    ) {
      best = { def, priority };
    }
  }
  return best;
}

// ─── Éligibilité (anti-abus) ─────────────────────────────────────────────────

/**
 * Compteurs anti-abus RÉELS (lus par l'appelant depuis player_bonus_claims /
 * active_bonuses) confrontés aux caps de la fiche. Toute valeur absente est
 * traitée comme « pas encore atteint » (0 / cooldown écoulé) côté appelant.
 */
export interface BonusEligibilityContext {
  /** Motion Trust du run (GRYD Verified si ≥ BONUS_MIN_MOTION_TRUST). */
  motionTrust: number;
  /** Le run appartient bien au crew ciblé (requis pour un bonus crew). */
  sameCrew: boolean;
  /** Occurrences déjà récompensées à CE joueur cette semaine (ce bonus). */
  playerClaimsThisWeek: number;
  /** Occurrences déjà récompensées au CREW aujourd'hui (ce bonus). */
  crewClaimsToday: number;
  /** Occurrences déjà récompensées au CREW cette semaine (ce bonus). */
  crewClaimsThisWeek: number;
  /** Jours depuis la dernière récompense de CE bonus à CE joueur (Retour). undefined = jamais. */
  daysSinceLastPlayerClaim?: number;
  /** Heures depuis la dernière récompense de CE bonus sur la MÊME zone. undefined = jamais. */
  hoursSinceLastZoneClaim?: number;
}

/** Motif de refus d'éligibilité (anti-abus) — libellé technique, pas d'UX. */
export type BonusIneligibleReason =
  | 'not_verified' // run non GRYD Verified (Motion Trust trop bas)
  | 'not_same_crew' // bonus crew mais run hors du crew ciblé
  | 'player_week_cap' // cap par joueur/semaine atteint
  | 'crew_day_cap' // cap par crew/jour atteint
  | 'crew_week_cap' // cap par crew/semaine atteint
  | 'player_days_cooldown' // intervalle mini par joueur non écoulé (Retour)
  | 'zone_cooldown'; // cooldown de la même zone/frontière non écoulé

/** Verdict d'éligibilité d'un bonus à la RÉCOMPENSE. */
export interface BonusEligibleVerdict {
  eligible: boolean;
  reason?: BonusIneligibleReason;
}

/**
 * Le run est-il ÉLIGIBLE à la récompense de `bonus` (anti-abus, doc §5) ? PURE.
 * Vérifie, dans l'ordre (le premier échec l'emporte) :
 *  1. GRYD Verified — Motion Trust ≥ BONUS_MIN_MOTION_TRUST (jamais de véhicule/
 *     GPS douteux) si la fiche l'exige ('run_verified') ;
 *  2. MÊME CREW — un bonus crew ('same_crew') exige que le run soit du crew ;
 *  3. caps : joueur/semaine, crew/jour, crew/semaine (selon la fiche) ;
 *  4. intervalle mini par joueur (Retour : cap.perPlayerPerDays) ;
 *  5. cooldown zone (bonus.cooldownH sur la même zone/frontière).
 * Un cap `null`/absent = pas de contrainte sur cet axe. Renvoie eligible=false
 * + reason au premier échec, sinon eligible=true.
 */
export function eligible(
  bonus: BonusDefinition,
  ctx: BonusEligibilityContext,
): BonusEligibleVerdict {
  const requires = (e: BonusDefinition['eligibility'][number]) => bonus.eligibility.includes(e);

  // 1. GRYD Verified.
  if (requires('run_verified') && ctx.motionTrust < BONUS_MIN_MOTION_TRUST) {
    return { eligible: false, reason: 'not_verified' };
  }
  // 2. Même crew.
  if (requires('same_crew') && !ctx.sameCrew) {
    return { eligible: false, reason: 'not_same_crew' };
  }
  // 3a. Cap joueur/semaine.
  const weekCap = bonus.cap.perPlayerPerWeek;
  if (weekCap != null && ctx.playerClaimsThisWeek >= weekCap) {
    return { eligible: false, reason: 'player_week_cap' };
  }
  // 3b. Cap crew/jour.
  const crewDayCap = bonus.cap.perCrewPerDay;
  if (crewDayCap != null && ctx.crewClaimsToday >= crewDayCap) {
    return { eligible: false, reason: 'crew_day_cap' };
  }
  // 3c. Cap crew/semaine.
  const crewWeekCap = bonus.cap.perCrewPerWeek;
  if (crewWeekCap != null && ctx.crewClaimsThisWeek >= crewWeekCap) {
    return { eligible: false, reason: 'crew_week_cap' };
  }
  // 4. Intervalle mini par joueur (Retour) : jamais deux fois avant N jours.
  const minDays = bonus.cap.perPlayerPerDays;
  if (
    minDays != null &&
    ctx.daysSinceLastPlayerClaim !== undefined &&
    ctx.daysSinceLastPlayerClaim < minDays
  ) {
    return { eligible: false, reason: 'player_days_cooldown' };
  }
  // 5. Cooldown zone.
  if (
    bonus.cooldownH > 0 &&
    ctx.hoursSinceLastZoneClaim !== undefined &&
    ctx.hoursSinceLastZoneClaim < bonus.cooldownH
  ) {
    return { eligible: false, reason: 'zone_cooldown' };
  }
  return { eligible: true };
}

// ─── Application de la récompense (impact capé +35 %) ─────────────────────────

/**
 * Base sur laquelle appliquer la récompense d'un bonus. Tous les pourcentages
 * sont des parts 0-1 ; les quantités de base (progression coffre, XP) sont dans
 * l'unité de l'appelant (le résultat est un DELTA à ajouter).
 */
export interface BonusApplyBase {
  /** Progression de coffre crew de base pour ce run (avant bonus). 0 si pas de crew. */
  chestBase: number;
  /** XP perso de base pour ce run (avant bonus). */
  xpBase: number;
  /**
   * Pourcentage de multiplicateur SYSTÈME déjà actif (ex. Crew Boost coffre =
   * +0.25). Sert le CAP : le bonus s'AJOUTE à ce pourcentage, puis le total est
   * borné à BONUS_MAX_TOTAL_PCT — un seul multiplicateur effectif, jamais de
   * cumul multiplicatif. 0 si aucun boost système. Négatif ignoré (traité 0).
   */
  systemPct?: number;
}

/** Récompense APPLIQUÉE (deltas + méta), après cap. */
export interface AppliedBonusReward {
  /** Delta de progression coffre crew (0 si le bonus ne touche pas le coffre). */
  chestDelta: number;
  /** Delta d'XP perso (0 si le bonus ne touche pas l'XP). */
  xpDelta: number;
  /** Progrès de badge à créditer (0 si aucun). */
  badgeProgress: number;
  /** Heures de protection à accorder (0 si aucune). */
  protectionH: number;
  /** Clé cosmétique à créditer (undefined si aucune). */
  cosmetic?: string;
  /**
   * Pourcentage EFFECTIVEMENT appliqué au multiplicateur (coffre/XP) APRÈS cap.
   * Toujours ≤ BONUS_MAX_TOTAL_PCT. C'est la preuve du cap : le delta coffre/XP
   * dérive de ce pourcentage borné.
   */
  appliedPct: number;
}

/** Borne un nombre dans [0, max]. PURE. */
function clamp(x: number, max: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  return x > max ? max : x;
}

/**
 * Applique la récompense de `bonus` sur `base`, CAPÉE à +35 % total. PURE.
 *
 * GARANTIE DU CAP +35 % (doc §5) — UN SEUL multiplicateur, le meilleur, jamais
 * de cumul :
 *  - le pourcentage « multiplicateur » du bonus (reward.chestPct ?? reward.xpPct
 *    — un bonus ne porte qu'un seul de ces deux axes au MVP) est ADDITIONNÉ au
 *    pourcentage système déjà actif (base.systemPct, ex. Crew Boost +0.25), PAS
 *    multiplié ;
 *  - la somme est BORNÉE à BONUS_MAX_TOTAL_PCT (0.35) → appliedPct ;
 *  - la PART du bonus dans ce total borné (appliedPct − systemPct, ≥ 0) est ce
 *    que CE bonus ajoute réellement : chestDelta/xpDelta = base × cette part.
 * Exemple gelé : système 0.25 + bonus 0.25 → somme 0.50 bornée à 0.35 →
 * appliedPct 0.35, part bonus 0.10 → +10 % de coffre en plus du boost (total
 * effectif +35 %, jamais +56 %). Sans boost système : bonus 0.25 → appliedPct
 * 0.25, part 0.25.
 *
 * Les récompenses NON multiplicatives (badgeProgress, protectionH, cosmetic)
 * passent telles quelles — elles ne touchent ni le coffre-multiplicateur ni le
 * classement (jamais de territoire/points).
 */
export function applyBonusReward(
  bonus: BonusDefinition,
  base: BonusApplyBase,
): AppliedBonusReward {
  const reward: BonusReward = bonus.reward;
  const systemPct = base.systemPct && base.systemPct > 0 ? base.systemPct : 0;

  // Total borné des multiplicateurs (système + bonus), UN seul effectif.
  const bonusPct = reward.chestPct ?? reward.xpPct ?? 0;
  const totalPct = clamp(systemPct + bonusPct, BONUS_MAX_TOTAL_PCT);
  // Part réellement AJOUTÉE par ce bonus (le reste, jamais négatif).
  const bonusShare = Math.max(0, totalPct - systemPct);

  const chestDelta = reward.chestPct !== undefined
    ? Math.max(0, base.chestBase) * bonusShare
    : 0;
  const xpDelta = reward.xpPct !== undefined
    ? Math.max(0, base.xpBase) * bonusShare
    : 0;

  const applied: AppliedBonusReward = {
    chestDelta,
    xpDelta,
    badgeProgress: reward.badgeProgress ?? 0,
    protectionH: reward.protectionH ?? 0,
    appliedPct: totalPct,
  };
  if (reward.cosmetic !== undefined) applied.cosmetic = reward.cosmetic;
  return applied;
}

/**
 * Libellé COURT et NON TRONQUÉ de l'effet appliqué (doc §4, pour bonusApplied.
 * effect côté réponse). PURE. Priorise l'effet dominant : coffre > XP >
 * protection > progrès badge > cosmétique. Utilise le POURCENTAGE de la fiche
 * (l'intention affichée « +25 % coffre crew »), pas le delta brut — l'UX montre
 * la promesse du bonus. Jamais « points » ni « territoire ».
 */
export function bonusEffectLabel(bonus: BonusDefinition): string {
  const r = bonus.reward;
  const pct = (p: number) => `${Math.round(p * 100)} %`;
  if (r.chestPct !== undefined) return `+${pct(r.chestPct)} coffre crew`;
  if (r.xpPct !== undefined) {
    return `+${pct(r.xpPct)} XP`;
  }
  if (r.protectionH !== undefined) return `+${r.protectionH} h de protection`;
  if (r.badgeProgress !== undefined) return `Progrès badge`;
  if (r.cosmetic !== undefined) return `Cosmétique débloqué`;
  return bonus.name;
}
