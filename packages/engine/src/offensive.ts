/**
 * GRYD — engine/offensive.ts (§38 Offensives crew : CRÉATION et CLÔTURE).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * La machinerie d'offensive était complète… sauf aux deux bouts. `ingest_run`
 * LIT les offensives actives et écrit `offensive_contributions` (contribution
 * réelle, en production), `offensiveResult()` sait juger une offensive — mais
 * RIEN n'en créait jamais une, et RIEN ne la clôturait. Conséquence mesurée :
 * `offensivesCompleted` est câblé à 0 dans ingest_run, donc les 200 XP crew ne
 * tombent jamais, et la famille de badges Raid Leader comme la skill Strategist
 * (métrique `offensivesJoined`) sont INATTEIGNABLES.
 *
 * Ce module fournit les RÈGLES PURES des deux bouts manquants :
 *   · création   — bornes de théâtre/objectif/fenêtre + garde-fou anti-spam +
 *                  rôle autorisé (CREW_PERMISSIONS.launchOffensive) ;
 *   · transition — quelle phase une offensive DEVRAIT avoir à l'instant t ;
 *   · clôture    — ce qui est crédité au crew selon le résultat, et quels
 *                  contributeurs comptent comme ayant « rejoint » l'offensive.
 *
 * Fonctions PURES : aucune I/O, aucune horloge (le `nowMs` est TOUJOURS un
 * paramètre). Tous les seuils viennent de @klaim/shared/game-rules — AUCUN
 * nombre magique ici.
 *
 * ANTI PAY-TO-WIN (règle dure) : aucune fonction de ce fichier ne prend, ne lit
 * ni ne dérive un statut payant. Lancer une offensive, y contribuer et en tirer
 * l'XP dépend du RÔLE dans le crew et des hexes RÉELLEMENT pris — rien d'autre.
 *
 * L'APP NE MENT JAMAIS : `offensiveAward` renvoie 0 sur un échec (pas de lot de
 * consolation), et `joinedContributors` ne compte que les membres ayant pris au
 * moins OFFENSIVE_JOINED_MIN_HEXES hexes RÉELS dans le théâtre.
 */
import {
  CREW_CHEST_WEIGHTS,
  CREW_XP_SOURCES,
  OFFENSIVE_FULL_AWARD_OBJECTIVE_HEXES,
  OFFENSIVE_HEX_AREA_KM2,
  OFFENSIVE_JOINED_MIN_HEXES,
  OFFENSIVE_MAX_ACTIVE_PER_CREW,
  OFFENSIVE_MIN_AWARD_SHARE,
  OFFENSIVE_MIN_OBJECTIVE_RATIO,
  OFFENSIVE_MAX_DURATION_H,
  OFFENSIVE_MAX_LEAD_TIME_H,
  OFFENSIVE_MIN_DURATION_H,
  OFFENSIVE_OBJECTIVE_HEXES_MAX,
  OFFENSIVE_OBJECTIVE_HEXES_MIN,
  OFFENSIVE_RADIUS_KM_MAX,
  OFFENSIVE_RADIUS_KM_MIN,
  OFFENSIVE_RESULT_AWARD_FACTOR,
  OFFENSIVE_ZONE_LABEL_MAX,
  OFFENSIVE_ZONE_LABEL_MIN,
  type CrewRole,
  type OffensiveResult,
} from '@klaim/shared/game-rules';
import { hasCrewPermission } from './crew.ts';

const MS_PER_HOUR = 3_600_000;

// ─── §38.2 Création ──────────────────────────────────────────────────────────

/** Motif de refus d'une création d'offensive. Un motif = une phrase honnête côté UI. */
export type OffensiveRejectReason =
  | 'forbidden_role'
  | 'label_length'
  | 'radius_out_of_range'
  | 'objective_out_of_range'
  /** L'objectif ne revendique pas assez du théâtre annoncé (§38.2b). */
  | 'objective_too_easy_for_theatre'
  | 'duration_out_of_range'
  | 'window_invalid'
  | 'starts_too_far_ahead'
  | 'too_many_open';

/** Brouillon d'offensive soumis par un membre du crew (avant toute écriture). */
export interface OffensiveDraft {
  /** Libellé de zone saisi (le théâtre, pas un adversaire nommé). */
  zoneLabel: string;
  /** Rayon du théâtre autour de `center_h3` (km). */
  radiusKm: number;
  /** Objectif en hexes res H3_RESOLUTION à prendre dans le théâtre. */
  objectiveHexes: number;
  /** Ouverture de la fenêtre (epoch ms). */
  startsAtMs: number;
  /** Fermeture de la fenêtre (epoch ms). */
  endsAtMs: number;
}

/** État serveur nécessaire pour juger un brouillon (lu par l'appelant). */
export interface OffensiveCreationContext {
  /** Instant de la décision (epoch ms) — jamais lu d'une horloge ici. */
  nowMs: number;
  /** Rôle du demandeur DANS ce crew (colonne crew_members.role). */
  role: CrewRole;
  /** Offensives du crew non encore clôturées (status <> 'done'). */
  openOffensives: number;
}

export type OffensiveValidation =
  | { ok: true }
  | { ok: false; reason: OffensiveRejectReason };

/**
 * Le brouillon est-il acceptable ? PURE. Ordre des contrôles = ordre de
 * lecture pour l'humain : qui a le droit, puis quoi, puis quand, puis combien.
 *
 * NOTE D'HONNÊTETÉ SUR LES RÔLES : `CREW_PERMISSIONS.launchOffensive` limite
 * l'action à co_captain/founder. Aujourd'hui AUCUNE RPC promote/demote/kick
 * n'existe dans le repo — `crew_members.role` n'est écrit que par le backfill
 * de 0010 (créateur → founder) et l'écriture client y est révoquée. Ce gate
 * est donc RÉEL (personne ne peut s'auto-promouvoir) mais, en pratique, seul
 * le fondateur du crew passe. Ce n'est pas un bug de ce lot : c'est l'état du
 * repo, et il vaut mieux un gate strict qu'un gate imaginaire.
 */
export function validateOffensiveDraft(
  draft: OffensiveDraft,
  ctx: OffensiveCreationContext,
): OffensiveValidation {
  if (!hasCrewPermission(ctx.role, 'launchOffensive')) {
    return { ok: false, reason: 'forbidden_role' };
  }

  const label = draft.zoneLabel.trim();
  if (label.length < OFFENSIVE_ZONE_LABEL_MIN || label.length > OFFENSIVE_ZONE_LABEL_MAX) {
    return { ok: false, reason: 'label_length' };
  }

  if (
    !Number.isFinite(draft.radiusKm) ||
    draft.radiusKm < OFFENSIVE_RADIUS_KM_MIN ||
    draft.radiusKm > OFFENSIVE_RADIUS_KM_MAX
  ) {
    return { ok: false, reason: 'radius_out_of_range' };
  }

  if (
    !Number.isInteger(draft.objectiveHexes) ||
    draft.objectiveHexes < OFFENSIVE_OBJECTIVE_HEXES_MIN ||
    draft.objectiveHexes > OFFENSIVE_OBJECTIVE_HEXES_MAX
  ) {
    return { ok: false, reason: 'objective_out_of_range' };
  }

  // §38.2b — LE THÉÂTRE N'EST PAS UNE VITRINE. Le rayon et l'objectif étaient
  // libres INDÉPENDAMMENT l'un de l'autre : annoncer 10 km pour aller prendre
  // 5 hexes rendait « victorieuse » n'importe quelle sortie. On exige désormais
  // que l'objectif revendique une part minimale du terrain revendiqué. Le
  // plancher relatif ne remplace pas l'absolu : c'est le plus exigeant des deux.
  if (draft.objectiveHexes < offensiveMinObjectiveFor(draft.radiusKm)) {
    return { ok: false, reason: 'objective_too_easy_for_theatre' };
  }

  if (
    !Number.isFinite(draft.startsAtMs) ||
    !Number.isFinite(draft.endsAtMs) ||
    draft.endsAtMs <= draft.startsAtMs
  ) {
    return { ok: false, reason: 'window_invalid' };
  }

  const durationH = (draft.endsAtMs - draft.startsAtMs) / MS_PER_HOUR;
  if (durationH < OFFENSIVE_MIN_DURATION_H || durationH > OFFENSIVE_MAX_DURATION_H) {
    return { ok: false, reason: 'duration_out_of_range' };
  }

  // Une offensive déjà fermée à la création serait née morte.
  if (draft.endsAtMs <= ctx.nowMs) return { ok: false, reason: 'window_invalid' };
  const leadH = (draft.startsAtMs - ctx.nowMs) / MS_PER_HOUR;
  if (leadH > OFFENSIVE_MAX_LEAD_TIME_H) return { ok: false, reason: 'starts_too_far_ahead' };

  // ⚠ LE TEMPS DÉCLARÉ N'EST PAS LE TEMPS JOUABLE. Le contrôle de durée ci-dessus
  // porte sur `endsAt - startsAt` ; il ne borne PAS `startsAt` par le bas. Une
  // date de début ANTÉRIEURE à maintenant passait donc tous les filtres, et
  // OFFENSIVE_MIN_DURATION_H cessait d'être opposable : il suffisait d'antidater
  // le début pour s'ouvrir une offensive qui ne laisse, en vrai, presque plus de
  // temps de course — une fenêtre annoncée de 6 h dont 5 h 59 sont déjà passées.
  // Ce qui compte pour un coureur, c'est le temps qu'il lui RESTE. On rejuge donc
  // la durée sur la fenêtre EFFECTIVE, à partir de maintenant.
  //
  // L'antidatage reste toléré tant qu'il ne rogne rien (l'offensive démarre
  // simplement active) : on ne l'interdit pas, on lui retire son intérêt. Il ne
  // permet pas non plus de rattraper des courses passées — `ingest_run` ne crédite
  // que les courses ingérées PENDANT la fenêtre, jamais rétroactivement.
  const playableH = (draft.endsAtMs - Math.max(draft.startsAtMs, ctx.nowMs)) / MS_PER_HOUR;
  if (playableH < OFFENSIVE_MIN_DURATION_H) return { ok: false, reason: 'duration_out_of_range' };

  if (ctx.openOffensives >= OFFENSIVE_MAX_ACTIVE_PER_CREW) {
    return { ok: false, reason: 'too_many_open' };
  }

  return { ok: true };
}

// ─── §38.2 Transition de phase ───────────────────────────────────────────────

/** Statut persisté d'une offensive (miroir du CHECK de `offensives.status`). */
export type OffensiveStatus = 'preparation' | 'active' | 'done';

/** Fenêtre d'une offensive (miroir `offensives`, timestamps epoch ms). */
export interface OffensiveWindow {
  startsAtMs: number;
  endsAtMs: number;
  status: OffensiveStatus;
}

/**
 * Statut que l'offensive DEVRAIT porter à l'instant `nowMs`. PURE.
 * `done` est un état TERMINAL : une offensive clôturée ne repart jamais, même
 * si l'horloge du serveur recule (c'est la moitié moteur de l'idempotence de
 * clôture ; l'autre moitié est la transition conditionnelle en SQL).
 * Fenêtre semi-ouverte [startsAt, endsAt) — cohérent avec crewBoostActive.
 */
export function offensiveStatusAt(win: OffensiveWindow, nowMs: number): OffensiveStatus {
  if (win.status === 'done') return 'done';
  if (nowMs >= win.endsAtMs) return 'done';
  if (nowMs >= win.startsAtMs) return 'active';
  return 'preparation';
}

/** L'offensive doit-elle passer `preparation` → `active` à `nowMs` ? PURE. */
export function shouldActivateOffensive(win: OffensiveWindow, nowMs: number): boolean {
  return win.status === 'preparation' && offensiveStatusAt(win, nowMs) === 'active';
}

/** L'offensive doit-elle être clôturée à `nowMs` ? PURE (vrai même si jamais activée). */
export function shouldCloseOffensive(win: OffensiveWindow, nowMs: number): boolean {
  return win.status !== 'done' && nowMs >= win.endsAtMs;
}

// ─── §38.3 Clôture : ce qui est crédité ──────────────────────────────────────

/** Récompenses crew d'une offensive clôturée (créditées UNE seule fois). */
export interface OffensiveAward {
  /** XP crew (CREW_XP_SOURCES.offensiveCompleted × facteur de résultat). */
  crewXp: number;
  /** Progression de coffre (CREW_CHEST_WEIGHTS.offensiveCompleted × facteur). */
  chestDelta: number;
}

/**
 * Récompense crew pour un résultat d'offensive. PURE, entiers (arrondi bas —
 * on ne crédite jamais plus que le barème). `fail` → 0 sur les deux lignes.
 *
 * Le cap quotidien CREW_XP_DAILY_CAP_PER_MEMBER ne s'applique PAS ici : ce
 * crédit est collectif (il n'est imputé à aucun membre), donc il ne peut pas
 * servir à contourner le plafond anti-farm individuel.
 */
/**
 * Capacité approximative d'un théâtre, en hexes de jeu, pour un rayon donné.
 *
 * PURE et déterministe : aire du disque / aire de référence d'un hex. Sert de
 * base au PLANCHER d'objectif (§38.2b) — jamais à afficher une surface, dont la
 * valeur réelle varie avec la latitude (cf. OFFENSIVE_HEX_AREA_KM2).
 */
export function offensiveTheatreCapacityHexes(radiusKm: number): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return 0;
  return Math.floor((Math.PI * radiusKm * radiusKm) / OFFENSIVE_HEX_AREA_KM2);
}

/**
 * Objectif MINIMAL légitime pour un théâtre : le plus exigeant des deux planchers
 * — l'absolu (§38.2) et le relatif au théâtre revendiqué (§38.2b).
 */
export function offensiveMinObjectiveFor(radiusKm: number): number {
  const relatif = Math.ceil(offensiveTheatreCapacityHexes(radiusKm) * OFFENSIVE_MIN_OBJECTIVE_RATIO);
  return Math.max(OFFENSIVE_OBJECTIVE_HEXES_MIN, relatif);
}

/**
 * Part du barème méritée par l'AMBITION de l'objectif, entre
 * OFFENSIVE_MIN_AWARD_SHARE et 1. Promettre peu rapporte peu : c'est ce qui
 * retire l'intérêt de se sous-coter, sans rien interdire ni punir.
 */
export function offensiveAmbitionShare(objectiveHexes: number): number {
  if (!Number.isFinite(objectiveHexes) || objectiveHexes <= 0) return OFFENSIVE_MIN_AWARD_SHARE;
  const brut = objectiveHexes / OFFENSIVE_FULL_AWARD_OBJECTIVE_HEXES;
  return Math.min(1, Math.max(OFFENSIVE_MIN_AWARD_SHARE, brut));
}

/**
 * Récompense de clôture : barème × résultat × ambition.
 *
 * `objectiveHexes` a été AJOUTÉ (23/07/2026) : sans lui, une offensive de 5 hexes
 * et une de 1 000 créditaient exactement la même chose, ce qui payait plein tarif
 * une promesse minuscule. Un échec continue de ne RIEN créditer, quelle qu'ait été
 * l'ambition — l'ambition module ce qu'on gagne, elle n'invente pas un lot de
 * consolation.
 */
export function offensiveAward(result: OffensiveResult, objectiveHexes: number): OffensiveAward {
  const factor = OFFENSIVE_RESULT_AWARD_FACTOR[result];
  const share = offensiveAmbitionShare(objectiveHexes);
  return {
    crewXp: Math.floor(CREW_XP_SOURCES.offensiveCompleted * factor * share),
    chestDelta: Math.floor(CREW_CHEST_WEIGHTS.offensiveCompleted * factor * share),
  };
}

/** Contribution d'un membre à une offensive (miroir `offensive_contributions`). */
export interface OffensiveContribution {
  userId: string;
  hexes: number;
}

/**
 * Membres qui comptent comme ayant REJOINT l'offensive (métrique
 * `offensivesJoined` : famille de badges Raid Leader, skill Strategist). PURE.
 * Seuil = OFFENSIVE_JOINED_MIN_HEXES hexes RÉELLEMENT pris dans le théâtre —
 * une ligne de contribution à 0 hex ne vaut rien. Sortie dédupliquée et triée
 * pour être stable (l'appelant l'écrit dans user_stats.offensives_joined).
 */
export function joinedContributors(
  contributions: readonly OffensiveContribution[],
): string[] {
  const ids = new Set<string>();
  for (const c of contributions) {
    if (c.hexes >= OFFENSIVE_JOINED_MIN_HEXES) ids.add(c.userId);
  }
  return [...ids].sort();
}

/** Total d'hexes pris dans le théâtre (somme des contributions). PURE. */
export function offensiveHexesTaken(
  contributions: readonly OffensiveContribution[],
): number {
  let total = 0;
  for (const c of contributions) total += Math.max(0, c.hexes);
  return total;
}
