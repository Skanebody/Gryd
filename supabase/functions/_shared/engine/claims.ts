// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/claims.ts

/**
 * GRYD — engine/claims.ts
 * Décision des claims par hex (SPEC §3.3/§3.4 + AMENDEMENT-02 §2/§3 + §6.4).
 * Points par zone = FORMULE MULTIPLICATIVE §23 (AMENDEMENT-23 §D) :
 *   points_zone = POINTS_BASE_PER_ZONE × coeff_action × coeff_contexte (+ pionnier).
 *
 * Fonction PURE : l'état existant et le contexte sont fournis par l'appelant,
 * la sortie est appliquée atomiquement par la RPC claim_hexes. Tout claim est
 * décidé ICI, côté serveur — jamais par le client, jamais par la RPC.
 *
 * Ordre de décision par hex (gelé, testé) :
 *   1. zone non capturable        → blocked_no_capture_zone
 *   2. zone privée                → blocked_privacy
 *   3. plafond MAX_CLAIMS_PER_DAY → blocked_daily_cap
 *   4. déjà à moi                 → defended (action ×1,2 si dernière défense > 24 h)
 *                                   | already_owned_cooldown (0 pt)
 *                                   — decay repoussé dans les deux cas
 *   5. neutre                     → claimed_neutral (action conquest/clean_loop/
 *                                   route × contexte, + bonus pionnier par densité
 *                                   si jamais possédé)
 *   6. adverse : capture fraîche   → blocked_fresh_protection (anti-harcèlement,
 *                (< FRESH_CAPTURE_PROTECT_HOURS)  0 pt — priorité sur le lock)
 *                lock actif       → blocked_lock
 *                bouclier actif   → blocked_shield
 *                propriétaire<14j → blocked_new_player
 *                sinon            → stolen (action ×1,3)
 *
 * ACTION par hex : `steal` (stolen), `defense` (defended), et pour un neutre :
 *  - `clean_loop` (×1,1) si l'hex est une cellule INTÉRIEURE d'une boucle bien
 *    formée (interiorHexes) ;
 *  - `route` (×0,5) si l'appelant a marqué la course comme route-only
 *    (corridorAction='route') ET que l'hex n'est pas intérieur ;
 *  - `conquest` (×1,0) sinon (couloir d'un run normal).
 * CONTEXTE par hex : contextByHex (contested/crew_mission/zone_bonus) → le plus
 * fort contexte s'applique (zoneBasePoints). Le pionnier reste ADDITIF.
 */
import {
  DEFEND_COOLDOWN_HOURS,
  FRESH_CAPTURE_PROTECT_HOURS,
  HEX_LOCK_HOURS,
  MAX_CLAIMS_PER_DAY,
  NEW_PLAYER_PROTECTION_DAYS,
  POINTS_PIONEER_BONUS_BY_DENSITY,
  type ActionCoeffKey,
  type ContextCoeffKey,
  ZONE_DECAY_DAYS,
  type ZoneDensity,
} from '../game-rules.ts';
import type { HexClaimResult } from '../types.ts';
import { zoneBasePoints } from './scoring.ts';

// Conversions d'unités — pas des règles de jeu.
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** État DB existant d'un hex. Absent de la map = hex jamais possédé. */
export interface HexState {
  /** null = hex neutre (decayé) mais déjà possédé dans l'histoire de la carte. */
  ownerUserId: string | null;
  lockedUntil: Date | null;
  shieldedUntil: Date | null;
  decayAt: Date | null;
  /** Dernière défense/capture (colonne last_defended_at, AMENDEMENT-23 §D). */
  lastDefendedAt: Date | null;
  /**
   * Dernière CAPTURE de l'hex par son propriétaire actuel (colonne
   * hex_claims.claimed_at : posée à now() à CHAQUE neutral/steal/pioneer, JAMAIS
   * touchée par une défense — donc = « last_captured_at »). Sert la protection
   * anti-harcèlement d'une capture fraîche (FRESH_CAPTURE_PROTECT_HOURS). Optionnel
   * pour rétro-compat : absent/null → pas de fraîcheur connue → aucune protection
   * fraîche (l'hex reste volable selon les autres règles). Aucune migration :
   * loadHexStates le dérive de claimed_at, déjà sélectionné. */
  lastCapturedAt?: Date | null;
  /** true si l'hex a déjà eu un propriétaire (bonus pionnier = jamais possédé). */
  everOwned: boolean;
}

export interface DecideClaimsContext {
  userId: string;
  /** Création du compte du COUREUR (exemption de decay < 14 j, §3.3). */
  userCreatedAt: Date;
  now: Date;
  /** Date de création de compte par ownerUserId (protection nouveau joueur). */
  ownersCreatedAt: ReadonlyMap<string, Date>;
  /** Hexes res 10 dans une zone privée du coureur (§7). */
  privacyHexes: ReadonlySet<string>;
  /** Hexes res 10 non capturables (autoroutes, zones militaires… AMENDEMENT-02 §2). */
  noCaptureHexes: ReadonlySet<string>;
  /** Densité par hex, ou densité globale de la course. Hex inconnu → 'wild'. */
  zoneDensity: ZoneDensity | ReadonlyMap<string, ZoneDensity>;
  /** Hexes déjà claimés/défendus aujourd'hui AVANT cette course (§6.4). */
  claimsToday: number;
  /**
   * Cellules INTÉRIEURES d'une boucle bien formée (AMENDEMENT-12) — leur
   * conquête neutre prend l'action `clean_loop` (×1,1) au lieu de `conquest`.
   * Optionnel (absent = aucune : tout neutre = conquest/route).
   */
  interiorHexes?: ReadonlySet<string>;
  /**
   * Action du COULOIR d'une conquête neutre HORS boucle (doc §23) : `conquest`
   * (×1,0, défaut — un run normal capture la rue à pleine valeur) ou `route`
   * (×0,5, un run qui n'ouvre qu'une ligne). Arbitrage fondateur : MVP laisse
   * `conquest` sauf demande explicite de l'appelant. N'affecte PAS les cellules
   * intérieures (clean_loop) ni le vol/défense.
   */
  corridorAction?: Extract<ActionCoeffKey, 'conquest' | 'route'>;
  /**
   * Contexte de jeu par hex (doc §23) : contested / crew_mission / zone_bonus.
   * Le PLUS FORT contexte applicable majore les points (contextCoeff). Hex
   * absent = aucun contexte (×1,0). `zone_bonus` = hotspot de carte (gagné par
   * le lieu, PAS acheté — anti pay-to-win intact).
   */
  contextByHex?: ReadonlyMap<string, readonly ContextCoeffKey[]>;
  /**
   * Import onboarding fondateur (ONBOARDING_IMPORT_NEUTRAL_ONLY) : seuls les hexes
   * neutres sont capturés ; vol/défense sur hex possédé → blocked_onboarding_neutral_only.
   */
  neutralOnly?: boolean;
}

export interface DecideClaimsInput {
  /** Cellules H3 res 10 (strings) traversées par la trace claimable. */
  hexes: readonly string[];
  states: ReadonlyMap<string, HexState>;
  context: DecideClaimsContext;
}

export interface DecideClaimsTotals {
  claimed: number;
  stolen: number;
  /** Inclut les défenses en cooldown (0 pt) : l'hex est bien re-parcouru. */
  defended: number;
  pioneer: number;
  blocked: number;
  /**
   * Points de BASE (doc §23 : zones × action × contexte + pionnier), AVANT
   * verify/streak/performance. computeScore applique verify puis les
   * multiplicateurs externes.
   */
  points: number;
}

export interface DecideClaimsResult {
  results: HexClaimResult[];
  totals: DecideClaimsTotals;
  /** locked_until à poser sur les hexes pris : now + HEX_LOCK_HOURS. */
  lockedUntil: Date;
  /** decay_at (= stable_until) à poser sur une CAPTURE : now + ZONE_DECAY_DAYS (14 j). */
  decayAt: Date;
  /**
   * true si le coureur a < NEW_PLAYER_PROTECTION_DAYS : son territoire est
   * exempt de decay (§3.3) → l'appelant pose decay_at = null en DB.
   */
  decayExempt: boolean;
}

function densityFor(
  zoneDensity: ZoneDensity | ReadonlyMap<string, ZoneDensity>,
  hex: string,
): ZoneDensity {
  if (typeof zoneDensity === 'string') return zoneDensity;
  return zoneDensity.get(hex) ?? 'wild'; // défaut hors zone connue : sauvage
}

export function decideClaims(input: DecideClaimsInput): DecideClaimsResult {
  const { states, context } = input;
  const { userId, now } = context;
  const nowMs = now.getTime();
  const contextByHex = context.contextByHex;
  const interiorHexes = context.interiorHexes;
  const corridorAction = context.corridorAction ?? 'conquest';

  const isActive = (until: Date | null): boolean => until !== null && until.getTime() > nowMs;
  const ctxFor = (hex: string): readonly ContextCoeffKey[] => contextByHex?.get(hex) ?? [];

  const results: HexClaimResult[] = [];
  const totals: DecideClaimsTotals = {
    claimed: 0,
    stolen: 0,
    defended: 0,
    pioneer: 0,
    blocked: 0,
    points: 0,
  };
  // Compteur pour le plafond §6.4 : claims/défenses du jour + ceux de cette course.
  let countedToday = context.claimsToday;
  const seen = new Set<string>();

  for (const hex of input.hexes) {
    if (seen.has(hex)) continue;
    seen.add(hex);

    const push = (r: HexClaimResult) => {
      results.push(r);
      totals.points += r.points;
      if (r.pioneer) totals.pioneer++;
      switch (r.outcome) {
        case 'claimed_neutral':
          totals.claimed++;
          countedToday++;
          break;
        case 'stolen':
          totals.stolen++;
          countedToday++;
          break;
        case 'defended':
        case 'already_owned_cooldown':
          totals.defended++;
          countedToday++;
          break;
        default:
          totals.blocked++;
      }
    };

    // 1-2. Zones interdites au claim.
    if (context.noCaptureHexes.has(hex)) {
      push({ h3: hex, outcome: 'blocked_no_capture_zone', points: 0, pioneer: false });
      continue;
    }
    if (context.privacyHexes.has(hex)) {
      push({ h3: hex, outcome: 'blocked_privacy', points: 0, pioneer: false });
      continue;
    }
    // 3. Plafond quotidien (§6.4).
    if (countedToday >= MAX_CLAIMS_PER_DAY) {
      push({ h3: hex, outcome: 'blocked_daily_cap', points: 0, pioneer: false });
      continue;
    }

    const state = states.get(hex);
    // Un hex dont le decay est échu est neutre même si la ligne DB existe encore
    // (le cron decay_job peut ne pas être passé).
    const decayed = state !== undefined && state.decayAt !== null &&
      state.decayAt.getTime() <= nowMs;
    const owner = state !== undefined && !decayed ? state.ownerUserId : null;

    // 4. Déjà à moi → défense (decay repoussé dans les deux cas, §3.3/§3.4).
    if (owner === userId) {
      if (context.neutralOnly) {
        push({ h3: hex, outcome: 'blocked_onboarding_neutral_only', points: 0, pioneer: false });
        continue;
      }
      const lastDefended = state?.lastDefendedAt ?? null;
      const cooldownActive = lastDefended !== null &&
        nowMs - lastDefended.getTime() < DEFEND_COOLDOWN_HOURS * MS_PER_HOUR;
      if (cooldownActive) {
        push({ h3: hex, outcome: 'already_owned_cooldown', points: 0, pioneer: false });
      } else {
        // Défense : action ×1,2 × contexte (doc §23), sur la base par zone.
        const points = zoneBasePoints('defense', ctxFor(hex));
        push({ h3: hex, outcome: 'defended', points, pioneer: false });
      }
      continue;
    }

    // 5. Neutre → capture (action conquest/clean_loop/route × contexte, + pionnier).
    if (owner === null) {
      const pioneer = state === undefined || !state.everOwned;
      const action: ActionCoeffKey = interiorHexes?.has(hex)
        ? 'clean_loop'
        : corridorAction;
      const pioneerBonus = pioneer
        ? POINTS_PIONEER_BONUS_BY_DENSITY[densityFor(context.zoneDensity, hex)]
        : 0;
      const points = zoneBasePoints(action, ctxFor(hex), pioneerBonus);
      push({ h3: hex, outcome: 'claimed_neutral', points, pioneer });
      continue;
    }

    // 6. Adverse : protections puis vol.
    if (context.neutralOnly) {
      push({ h3: hex, outcome: 'blocked_onboarding_neutral_only', points: 0, pioneer: false });
      continue;
    }
    // 6.0 Capture fraîche d'autrui → protection anti-harcèlement (doc « Clash »
    // §4). Priorité sur le lock : le re-vol d'une zone tout juste prise est bloqué
    // et EXPLIQUÉ comme tel (« laisse-lui le temps ») tant que la dernière capture
    // date de < FRESH_CAPTURE_PROTECT_HOURS. Fenêtre plus courte que le lock 24 h,
    // qui prend le relais ensuite. Automatique + temporelle → jamais achetable.
    const lastCaptured = state?.lastCapturedAt ?? null;
    const freshlyCaptured = lastCaptured !== null &&
      nowMs - lastCaptured.getTime() < FRESH_CAPTURE_PROTECT_HOURS * MS_PER_HOUR;
    if (freshlyCaptured) {
      push({ h3: hex, outcome: 'blocked_fresh_protection', points: 0, pioneer: false });
      continue;
    }
    if (isActive(state?.lockedUntil ?? null)) {
      push({ h3: hex, outcome: 'blocked_lock', points: 0, pioneer: false });
      continue;
    }
    if (isActive(state?.shieldedUntil ?? null)) {
      push({ h3: hex, outcome: 'blocked_shield', points: 0, pioneer: false });
      continue;
    }
    const ownerCreatedAt = context.ownersCreatedAt.get(owner);
    const ownerProtected = ownerCreatedAt !== undefined &&
      nowMs - ownerCreatedAt.getTime() < NEW_PLAYER_PROTECTION_DAYS * MS_PER_DAY;
    if (ownerProtected) {
      push({ h3: hex, outcome: 'blocked_new_player', points: 0, pioneer: false });
      continue;
    }
    // Vol : action ×1,3 × contexte (doc §23).
    push({ h3: hex, outcome: 'stolen', points: zoneBasePoints('steal', ctxFor(hex)), pioneer: false });
  }

  return {
    results,
    totals,
    lockedUntil: new Date(nowMs + HEX_LOCK_HOURS * MS_PER_HOUR),
    decayAt: new Date(nowMs + ZONE_DECAY_DAYS * MS_PER_DAY),
    decayExempt: nowMs - context.userCreatedAt.getTime() <
      NEW_PLAYER_PROTECTION_DAYS * MS_PER_DAY,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-23 §D / doc §23 — coeff_contexte par hex (contested/crew_mission).
// ═══════════════════════════════════════════════════════════════════════════

export interface DeriveContextInput {
  /** Cellules de la course à qualifier. */
  hexes: readonly string[];
  /** État pré-run des hexes (même map que decideClaims). */
  states: ReadonlyMap<string, HexState>;
  /** Le coureur (pour exclure ses propres cellules de `contested`). */
  userId: string;
  /** Crew actif du coureur, ou null (solo). */
  crewId: string | null;
  /** Crew actif du propriétaire de chaque hex owné (ownerUserId → crewId). */
  ownerCrewByUser: ReadonlyMap<string, string>;
  /** Cellules couvertes par une offensive/mission crew ACTIVE (géométrie résolue en amont). */
  crewMissionHexes?: ReadonlySet<string>;
  now: Date;
}

/**
 * Décide le `contextByHex` de la formule §23 (coeff_contexte), PUR — l'appelant
 * fournit l'état pré-run, les crews propriétaires et l'ensemble des cellules en
 * mission (géométrie d'offensive résolue côté I/O). Deux contextes câblés :
 *
 *  - `contested` ×1,2 (doc §18, approx cellule au MVP) : l'hex est possédé
 *    (non-decayé) par quelqu'un d'AUTRE que le coureur, dont le crew ≠ le sien
 *    (un propriétaire sans crew = solo adverse compte aussi comme disputé). Une
 *    cellule réellement tenue par un rival que ce run vole/conteste. Un hex dont
 *    le decay est échu compte neutre (même règle que decideClaims). N'exige PAS
 *    que le vol réussisse : le lock d'un run concurrent est traité ailleurs
 *    (handleContested → statut de zone), pas ici.
 *  - `crew_mission` ×1,1 : l'hex ∈ crewMissionHexes (offensive crew active).
 *
 * `zone_bonus` ×1,15 (hotspot de carte, gagné PAS acheté) : non produit ici —
 * aucune source de hotspots au MVP (point d'extension, cf. ingest_run). Le
 * PLUS FORT contexte s'applique ensuite par hex (contextCoeff) — pas de cumul.
 * Non pay-to-win : le contexte se gagne par la SITUATION (rival présent, mission
 * crew), jamais par un achat.
 */
export function deriveContextByHex(
  input: DeriveContextInput,
): ReadonlyMap<string, ContextCoeffKey[]> {
  const { hexes, states, userId, crewId, ownerCrewByUser, crewMissionHexes, now } = input;
  const nowMs = now.getTime();
  const context = new Map<string, ContextCoeffKey[]>();
  const add = (hex: string, key: ContextCoeffKey) => {
    const list = context.get(hex);
    if (list) {
      if (!list.includes(key)) list.push(key);
    } else {
      context.set(hex, [key]);
    }
  };

  const seen = new Set<string>();
  for (const hex of hexes) {
    if (seen.has(hex)) continue;
    seen.add(hex);

    // contested : cellule tenue par un rival (owner ≠ moi, crew ≠ le mien).
    const st = states.get(hex);
    if (st && st.ownerUserId !== null && st.ownerUserId !== userId) {
      const decayed = st.decayAt !== null && st.decayAt.getTime() <= nowMs;
      if (!decayed) {
        const ownerCrewId = ownerCrewByUser.get(st.ownerUserId) ?? null;
        if (ownerCrewId === null || ownerCrewId !== crewId) add(hex, 'contested');
      }
    }

    // crew_mission : cellule dans une offensive crew active.
    if (crewMissionHexes?.has(hex)) add(hex, 'crew_mission');
  }

  return context;
}
