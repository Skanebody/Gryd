/**
 * GRYD — engine/sectors.ts
 * RÈGLES NON NÉGOCIABLES §C — MODÈLE DE SECTEUR (rôle · pression · contestation).
 *
 * « On ne colore pas 200 000 utilisateurs ; on agrège en territoires / fronts /
 * pressions / missions. » Ce module transforme les PARTS de contrôle agrégées
 * d'un secteur + quelques signaux d'activité en :
 *   - un `pressure_score` 0-100 (activité rival récente + zones perdues +
 *     proximité de bascule + decay) ;
 *   - un `status` à 5 niveaux (stable / pression / contestée / attaque / urgence) ;
 *   - un `role` RELATIF au joueur (mine / ally / rival / neutral) — la couleur
 *     lit le rôle dans MON contexte, jamais l'identité universelle d'un crew.
 *
 * Fonctions 100 % PURES et déterministes. AUCUN nombre magique : tous les
 * seuils/poids viennent de @klaim/shared/game-rules (bandes de pression, règle
 * contesté, poids des composantes, saturations). Au MVP ces objets sont dérivés
 * côté client (démo) ; en V1 ils sont PRÉ-CALCULÉS par secteur côté serveur —
 * la MÊME forme d'objet, le frontend ne fait qu'afficher (§C « Backend scalable »).
 *
 * Anti pay-to-win : la pression/contestation ne dépend QUE de l'activité réelle
 * (parts de hex, runs rival, decay) — aucun bonus payant n'entre dans ce calcul.
 */
import {
  SECTOR_ACTIVE_ATTACK_MAX_H,
  SECTOR_CONTESTED_RULE,
  SECTOR_PRESSURE_BANDS,
  SECTOR_PRESSURE_MAX,
  SECTOR_PRESSURE_WEIGHTS,
  SECTOR_RIVAL_ACTIVITY_SATURATION,
  type SectorStatusKey,
  SECTOR_STATUS_LEVELS,
  SECTOR_ZONES_LOST_SATURATION,
} from '@klaim/shared/game-rules';

// ─── Conversions d'unités (pas des règles de jeu) ────────────────────────────
const MS_PER_HOUR = 3_600_000;

/** Borne un nombre dans [min, max]. Primitive numérique — pas une règle. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Ramène une valeur brute ≥ 0 à un sous-score 0-1 par saturation linéaire. */
function saturate(raw: number, saturation: number): number {
  if (saturation <= 0) return raw > 0 ? 1 : 0;
  return clamp(raw / saturation, 0, 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// RÔLE relatif au joueur (§C — couleur PAR RÔLE, pas par identité)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rôle d'un crew DANS LE CONTEXTE du joueur. La carte colore ce rôle :
 * `mine` = chartreuse, `ally` = chartreuse secondaire, `rival` = orange/rouge,
 * `neutral` = gris. Jamais plus de 2 rôles fortement colorés sur une zone (moi
 * + rival dominant) — les autres crews sont agrégés dans le détail au tap.
 */
export type SectorRole = 'mine' | 'ally' | 'rival' | 'neutral';

/**
 * Résout le rôle d'un `crewId` du point de vue de `myCrewId`.
 *   - `crewId === myCrewId`            → mine
 *   - `crewId ∈ allyCrewIds`           → ally
 *   - `crewId` absent / null / vide    → neutral (aucun propriétaire)
 *   - sinon                            → rival
 * `myCrewId` null (joueur sans crew) : tout crew possédant est un rival, le
 * vide reste neutre. PURE.
 */
export function resolveRole(
  crewId: string | null | undefined,
  myCrewId: string | null | undefined,
  allyCrewIds: readonly string[] = [],
): SectorRole {
  if (!crewId) return 'neutral';
  if (myCrewId && crewId === myCrewId) return 'mine';
  if (allyCrewIds.includes(crewId)) return 'ally';
  return 'rival';
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESSION (§C — pressure_score 0-100)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Entrées du calcul de pression d'un secteur — toutes AGRÉGÉES (jamais 200k
 * runners). Parts de contrôle en FRACTION du secteur (0-1). Ces champs sont le
 * miroir des colonnes pré-calculées serveur (`owner_percent`, `top_rival_percent`,
 * `last_attack_at`…) de §C.
 */
export interface SectorPressureInput {
  /** Part de MON crew dans le secteur (0-1). */
  minePercent: number;
  /** Part du rival PRINCIPAL (le seul autre crew fortement coloré) (0-1). */
  rivalPercent: number;
  /** Runs/attaques rival récents sur la fenêtre (brut, saturé côté engine). */
  rivalActivityRecent: number;
  /** Zones (hex) reprises par le rival sur la fenêtre récente (brut, saturé). */
  zonesLostRecent: number;
  /** Fraction du secteur dont l'échéance de decay est imminente (0-1). */
  decayFraction: number;
}

/** Sous-scores 0-1 de chaque composante de pression (pour explicabilité/UI). */
export interface SectorPressureBreakdown {
  rivalActivity: number;
  zonesLost: number;
  flipProximity: number;
  decay: number;
}

/**
 * Décompose la pression en sous-scores 0-1 (avant pondération) — exposé pour la
 * couche d'explicabilité (« pourquoi ce secteur est chaud »). PURE.
 *
 *   rivalActivity  = saturation(runs rival récents)
 *   zonesLost      = saturation(zones reprises récentes)
 *   flipProximity  = 1 − |mine − rival|, mais 0 si le rival est ABSENT
 *                    (< rivalMinShare) : pas de bascule sans adversaire.
 *   decay          = fraction du secteur en decay imminent (déjà 0-1)
 */
export function pressureBreakdown(input: SectorPressureInput): SectorPressureBreakdown {
  const mine = clamp(input.minePercent, 0, 1);
  const rival = clamp(input.rivalPercent, 0, 1);
  // Proximité de bascule : d'autant plus forte que l'écart est faible — mais un
  // rival quasi absent ne « fait pas basculer » (évite qu'un secteur solitaire
  // paraisse chaud). En-dessous de rivalMinShare, la composante s'annule.
  const flipProximity =
    rival < SECTOR_CONTESTED_RULE.rivalMinShare ? 0 : clamp(1 - Math.abs(mine - rival), 0, 1);
  return {
    rivalActivity: saturate(Math.max(0, input.rivalActivityRecent), SECTOR_RIVAL_ACTIVITY_SATURATION),
    zonesLost: saturate(Math.max(0, input.zonesLostRecent), SECTOR_ZONES_LOST_SATURATION),
    flipProximity,
    decay: clamp(input.decayFraction, 0, 1),
  };
}

/**
 * `pressure_score` 0-100 (§C). Somme pondérée des 4 sous-scores, SATURÉE à 100 :
 * plusieurs signaux forts se cumulent puis plafonnent (un secteur violemment
 * attaqué ET en decay = 100, jamais plus). Entier. PURE.
 */
export function pressureScore(input: SectorPressureInput): number {
  const b = pressureBreakdown(input);
  const raw =
    b.rivalActivity * SECTOR_PRESSURE_WEIGHTS.rivalActivity +
    b.zonesLost * SECTOR_PRESSURE_WEIGHTS.zonesLost +
    b.flipProximity * SECTOR_PRESSURE_WEIGHTS.flipProximity +
    b.decay * SECTOR_PRESSURE_WEIGHTS.decay;
  return Math.round(clamp(raw, 0, SECTOR_PRESSURE_MAX));
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTESTATION (§C — règle « contesté »)
// ═══════════════════════════════════════════════════════════════════════════

/** Entrées de la règle « contesté » — parts en fraction (0-1) + poussée 24 h. */
export interface SectorContestInput {
  /** Part de MON crew (0-1). */
  minePercent: number;
  /** Part du rival principal (0-1). */
  rivalPercent: number;
  /** Zones reprises par le rival sur les 24 dernières heures. */
  rivalReclaimed24h: number;
}

/**
 * Applique la règle « contesté » de §C. Vrai si l'UNE des conditions :
 *   (a) rival ≥ rivalMinShare ET mine ≤ mineMaxShare ;
 *   (b) |mine − rival| < closeGapMax (coude à coude) — un rival quasi nul ne
 *       compte pas (garde-fou : le rival doit exister, ≥ rivalMinShare) ;
 *   (c) rival a repris > reclaimZones24h zones sur 24 h.
 * PURE.
 */
export function isContested(input: SectorContestInput): boolean {
  const mine = clamp(input.minePercent, 0, 1);
  const rival = clamp(input.rivalPercent, 0, 1);
  const rivalPresent = rival >= SECTOR_CONTESTED_RULE.rivalMinShare;
  const conditionA = rivalPresent && mine <= SECTOR_CONTESTED_RULE.mineMaxShare;
  const conditionB = rivalPresent && Math.abs(mine - rival) < SECTOR_CONTESTED_RULE.closeGapMax;
  const conditionC = input.rivalReclaimed24h > SECTOR_CONTESTED_RULE.reclaimZones24h;
  return conditionA || conditionB || conditionC;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUT (§C — 5 niveaux 0-4)
// ═══════════════════════════════════════════════════════════════════════════

/** Résultat de `sectorStatus` : niveau numérique STABLE (0-4) + clé nommée. */
export interface SectorStatus {
  /** 0 stable · 1 pression · 2 contestée · 3 attaque · 4 urgence. */
  level: (typeof SECTOR_STATUS_LEVELS)[SectorStatusKey];
  key: SectorStatusKey;
}

/** Entrées de dérivation du statut. `now`/`lastAttackAt` en Date absolues. */
export interface SectorStatusInput {
  /** Score de pression 0-100 (issu de `pressureScore`). */
  pressure: number;
  /** Le secteur satisfait-il la règle « contesté » (issu de `isContested`) ? */
  contested: boolean;
  /** Une attaque rival est-elle en cours ? (dernier assaut rival, ou null). */
  lastAttackAt?: Date | null;
  /** Horloge (défaut : maintenant) — injectable pour tests déterministes. */
  now?: Date;
}

/** Bande de pression brute (0-3) → clé, par borne basse. Interne. */
function pressureBand(pressure: number): SectorStatusKey {
  const p = clamp(pressure, 0, SECTOR_PRESSURE_MAX);
  if (p >= SECTOR_PRESSURE_BANDS.urgence) return 'urgence';
  if (p >= SECTOR_PRESSURE_BANDS.contestee) return 'contestee';
  if (p >= SECTOR_PRESSURE_BANDS.pression) return 'pression';
  return 'stable';
}

/** L'attaque est-elle ACTIVE (dans la fenêtre chaude depuis le dernier assaut) ? */
function attackIsActive(lastAttackAt: Date | null | undefined, now: Date): boolean {
  if (!lastAttackAt) return false;
  const ageH = (now.getTime() - lastAttackAt.getTime()) / MS_PER_HOUR;
  return ageH >= 0 && ageH <= SECTOR_ACTIVE_ATTACK_MAX_H;
}

/**
 * Statut d'un secteur (§C) — combine bande de score, drapeau contesté et
 * attaque active pour produire un des 5 niveaux. Règles d'arbitrage (du plus
 * fort au plus faible), à design pour que le joueur voie TOUJOURS le signal le
 * plus urgent :
 *
 *   4 urgence   pressure ≥ 81 (borne urgence) — prime sur tout (« N zones à sauver »).
 *   3 attaque   attaque rival EN COURS ET secteur déjà ≥ pression — sur-signal
 *               (contour orange fort + pulse) posé sur pression/contesté.
 *   2 contestée règle « contesté » vraie OU bande de score ≥ contestée (61-80).
 *   1 pression  bande de score ≥ pression (31-60).
 *   0 stable    sinon (0-30, aucune alerte).
 *
 * Note : `contested` remonte le statut à AU MOINS contestée même si le score est
 * dans la bande pression (une zone coude-à-coude se lit « contestée » quel que
 * soit son score) — sauf si urgence/attaque priment. PURE.
 */
export function sectorStatus(input: SectorStatusInput): SectorStatus {
  const now = input.now ?? new Date();
  const band = pressureBand(input.pressure);
  const active = attackIsActive(input.lastAttackAt, now);

  // 4 — urgence : la bande la plus haute prime sur tout (le joueur doit défendre).
  if (band === 'urgence') return statusOf('urgence');

  // 3 — attaque active : uniquement si le secteur est DÉJÀ tendu (au moins en
  // pression, OU contesté). Une attaque sur un secteur totalement calme reste
  // en pression (le sur-signal « attaque » ne se déclenche pas sur du stable).
  const alreadyHot = band !== 'stable' || input.contested;
  if (active && alreadyHot) return statusOf('attaque');

  // 2 — contestée : règle métier « contesté » OU bande de score contestée.
  if (input.contested || band === 'contestee') return statusOf('contestee');

  // 1 — pression : bande de score pression.
  if (band === 'pression') return statusOf('pression');

  // 0 — stable.
  return statusOf('stable');
}

/** Construit le SectorStatus (niveau + clé) à partir de la clé. Interne. */
function statusOf(key: SectorStatusKey): SectorStatus {
  return { level: SECTOR_STATUS_LEVELS[key], key };
}

// ═══════════════════════════════════════════════════════════════════════════
// DÉRIVATION COMPLÈTE (secteur agrégé → objet d'affichage)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Secteur AGRÉGÉ tel que reçu par le client (miroir des colonnes pré-calculées
 * §C). `neutralPercent` est déductible (1 − mine − rival − autres) mais transmis
 * pour l'affichage « moi X % · rival Y % · neutre Z % » sans recalcul.
 */
export interface AggregatedSector {
  /** Identifiant du secteur (H3 res 7 agrégé, ou id métier). */
  id: string;
  /** Crew propriétaire majoritaire (null = neutre). */
  ownerCrewId: string | null;
  /** Rival principal du secteur (le SEUL autre crew fortement coloré). */
  topRivalCrewId: string | null;
  /** Part du propriétaire dans le secteur (0-1). */
  ownerPercent: number;
  /** Part du rival principal (0-1). */
  topRivalPercent: number;
  /** Part neutre (0-1). */
  neutralPercent: number;
  /** Runs/attaques rival récents (fenêtre pression). */
  rivalActivityRecent: number;
  /** Zones reprises par le rival sur la fenêtre pression. */
  zonesLostRecent: number;
  /** Zones reprises par le rival sur 24 h (règle contesté). */
  rivalReclaimed24h: number;
  /** Fraction du secteur en decay imminent (0-1). */
  decayFraction: number;
  /** Dernier assaut rival (attaque active), ou null. */
  lastAttackAt: Date | null;
}

/**
 * Vue d'affichage d'un secteur, RÉSOLUE pour le joueur courant : rôle du
 * propriétaire, rôle du rival, score de pression, statut à 5 niveaux. C'est
 * l'objet que la couche de RENDU consomme (l'agent Rendu en dépend). Les parts
 * sont recopiées pour l'étiquette « moi/rival/neutre » sans recalcul.
 */
export interface SectorView {
  id: string;
  ownerRole: SectorRole;
  rivalRole: SectorRole;
  minePercent: number;
  rivalPercent: number;
  neutralPercent: number;
  pressure: number;
  contested: boolean;
  status: SectorStatus;
}

/**
 * Dérive la `SectorView` d'un secteur agrégé pour `myCrewId` (+ alliés). Un seul
 * point d'entrée qui compose resolveRole / pressureScore / isContested /
 * sectorStatus — le rendu n'appelle que ça. `minePercent` est la part du
 * propriétaire SI c'est mon crew, sinon 0 (je ne « possède » ce secteur que si
 * j'en suis le propriétaire majoritaire). PURE.
 */
export function deriveSectorView(
  sector: AggregatedSector,
  myCrewId: string | null | undefined,
  allyCrewIds: readonly string[] = [],
  now: Date = new Date(),
): SectorView {
  const ownerRole = resolveRole(sector.ownerCrewId, myCrewId, allyCrewIds);
  const rivalRole = resolveRole(sector.topRivalCrewId, myCrewId, allyCrewIds);

  // Ma part = part du propriétaire si je suis ce propriétaire, sinon 0.
  const minePercent = ownerRole === 'mine' ? clamp(sector.ownerPercent, 0, 1) : 0;
  // La part « rivale » qui pilote pression/contestation est celle du rival
  // principal DÈS LORS qu'il m'est hostile ; si le « top rival » est en réalité
  // un allié ou moi, il n'exerce pas de pression rivale.
  const rivalPercent = rivalRole === 'rival' ? clamp(sector.topRivalPercent, 0, 1) : 0;

  const pressure = pressureScore({
    minePercent,
    rivalPercent,
    rivalActivityRecent: sector.rivalActivityRecent,
    zonesLostRecent: sector.zonesLostRecent,
    decayFraction: sector.decayFraction,
  });
  const contested = isContested({
    minePercent,
    rivalPercent,
    rivalReclaimed24h: sector.rivalReclaimed24h,
  });
  const status = sectorStatus({
    pressure,
    contested,
    lastAttackAt: sector.lastAttackAt,
    now,
  });

  return {
    id: sector.id,
    ownerRole,
    rivalRole,
    minePercent,
    rivalPercent,
    neutralPercent: clamp(sector.neutralPercent, 0, 1),
    pressure,
    contested,
    status,
  };
}
