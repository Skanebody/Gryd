/**
 * GRYD — engine/engine.ts
 * COMPOSITION CANONIQUE du pipeline territorial (chemin CONQUÊTE principal).
 *
 * `runTerritoryEngine` EMBALLE en UN point d'entrée pur la séquence qui était
 * câblée à la main dans supabase/functions/ingest_run/index.ts (branche
 * `runMode === 'conquete'`, lignes ~2069-2161) :
 *
 *   hexesForSegments(claimable)                     → couloir (rues courues)
 *   → loopTracePoints(claimable)                    → trace contiguë (1 segment) ?
 *   → detectLoop(trace)                             → boucle (tolérance / auto-inter)
 *   → loopShapeVerdict(loop)  / gate gpsTrust ≥ 80  → forme OK & GPS fiable ?
 *   → enclosedCells(polygon, corridor)              → cellules intérieures triées
 *   → loopInteriorCellCap(distanceM)                → plafond d'aire (cap + capReached)
 *   → allHexes = [...couloir, ...intérieur]
 *   → resolveOwnership(allHexes)   (INJECTÉ, seul accès I/O)  → états + contexte DB
 *   → decideClaims({ hexes, states, context })      → décision par hex (pure)
 *   → verifyFactor(trustScore)                      → palier verify (1,0/0,5/0)
 *   → computeScore({...})                           → base × verify × streak × perf
 *
 * PURE : aucun accès DB. L'ownership (états d'hex, crews, densité, plafond du
 * jour, contexte §23…) arrive par le RÉSOLVEUR ASYNC INJECTÉ `resolveOwnership`.
 * C'est une EXTRACTION à ISO-comportement : mêmes appels, mêmes arguments, mêmes
 * valeurs de sortie qu'ingest_run — zéro re-conception, zéro nombre magique.
 *
 * `explanation` est la couche « chaque zone expliquée » (AMENDEMENT-23) : objet
 * structuré lisible (palier verify, verdict de boucle, points de base vs
 * multipliés, raison du refus d'intérieur) pour l'explicabilité post-run.
 */
import { LOOP_MIN_GPS_TRUST } from '@klaim/shared/game-rules';
import type { Segment } from './validation.ts';
import {
  type DetectedLoop,
  detectLoop,
  enclosedCells,
  hexesForSegments,
  loopInteriorCellCap,
  type LoopRejectedReason,
  loopShapeVerdict,
  loopTracePoints,
} from './hexing.ts';
import {
  decideClaims,
  type DecideClaimsResult,
  type HexState,
} from './claims.ts';
import type { ContextCoeffKey, ZoneDensity } from '@klaim/shared/game-rules';
import {
  computeScore,
  type ScoreResult,
  verifyFactor,
  type VerifyTier,
  verifyTier,
} from './scoring.ts';

/**
 * Ownership + contexte résolus depuis la DB pour l'ensemble `allHexes` (couloir
 * + intérieur de boucle). MÊME forme que les lectures d'ingest_run
 * (loadHexStates / loadOwnersCreatedAt / loadPrivacyHexes / loadNoCaptureHexes /
 * loadDensity / loadClaimsToday / loadContextByHex). Tout est fourni par
 * l'appelant : le moteur reste pur.
 */
export interface OwnershipResolution {
  /** État DB par hex (absent = jamais possédé). */
  states: ReadonlyMap<string, HexState>;
  /** Date de création de compte par ownerUserId (protection nouveau joueur). */
  ownersCreatedAt: ReadonlyMap<string, Date>;
  /** Hexes res 10 dans une zone privée du coureur (§7). */
  privacyHexes: ReadonlySet<string>;
  /** Hexes res 10 non capturables (autoroutes, zones militaires…). */
  noCaptureHexes: ReadonlySet<string>;
  /** Densité par hex, ou densité globale de la course. */
  zoneDensity: ZoneDensity | ReadonlyMap<string, ZoneDensity>;
  /** Hexes déjà claimés/défendus aujourd'hui AVANT cette course (§6.4). */
  claimsToday: number;
  /** coeff_contexte §23 par hex (contested / crew_mission / zone_bonus). */
  contextByHex?: ReadonlyMap<string, readonly ContextCoeffKey[]>;
}

/** Entrée du moteur territorial (chemin CONQUÊTE). */
export interface RunTerritoryInput {
  /**
   * Segments claimables (validation §3.2 : `ClaimableResult.claimable`). Le
   * couloir et la détection de boucle en dérivent — le couloir vient TOUJOURS
   * de la trace claimable, jamais des segments exclus.
   */
  claimable: Segment[];
  /** GPS Trust 0-100 (borné serveur). Gate d'intérieur de boucle (≥ 80). */
  gpsTrust: number;
  /** trustScore 0-100 (min gpsTrust/motionTrust) : palier verify de la formule §23. */
  trustScore: number;
  /** Distance validée (m) : plafond d'aire d'intérieur (loopInteriorCellCap). */
  distanceM: number;
  /** Horloge de la course (decideClaims l'utilise ; jamais Date.now() interne). */
  now: Date;
  /** Coureur. */
  userId: string;
  /** Création du compte du coureur (exemption de decay < 14 j, §3.3). */
  userCreatedAt: Date;
  /** Semaines consécutives déjà validées (streakMultiplier). */
  streakWeeks: number;
  /** Compte Club (×1,5 sur les Foulées). */
  isClub: boolean;
  /**
   * Résolveur d'ownership INJECTÉ (seul accès I/O du pipeline) : reçoit
   * l'ensemble complet des hexes candidats (couloir + intérieur) et rend les
   * états DB + le contexte. Appelé UNE fois, après la construction d'`allHexes`.
   */
  resolveOwnership: (allHexes: readonly string[]) => Promise<OwnershipResolution>;
}

/**
 * Explicabilité structurée (AMENDEMENT-23 « chaque zone expliquée »). Lisible,
 * sans I/O : de quoi rendre la page post-run / historique sans recalcul.
 */
export interface RunTerritoryExplanation {
  /** Palier verify nommé (full / partial / stats_only), miroir de verifyFactor. */
  verifyTier: VerifyTier;
  /** Facteur verify appliqué (1,0 / 0,5 / 0). */
  verifyFactor: number;
  /** Cellules du couloir (rues courues, hors intérieur). */
  corridorCellCount: number;
  /** Cellules d'intérieur de boucle réellement capturées (après cap). */
  interiorCellCount: number;
  loop: {
    /** Une boucle a-t-elle été fermée (tolérance ou auto-intersection) ? */
    closed: boolean;
    /** Mode de fermeture, si boucle. */
    closure?: DetectedLoop['closure'];
    /** Verdict de forme (null si aucune boucle). */
    shapeOk: boolean | null;
    /** Compacité 4πA/P² (null si aucune boucle). */
    compactness: number | null;
    /** Largeur moyenne estimée 2A/P en m (null si aucune boucle). */
    widthM: number | null;
    /**
     * Raison du REFUS d'intérieur, boucle fermée mais intérieur non capturé :
     *  - 'narrow'    → forme trop étroite (compacité/largeur sous seuil) ;
     *  - 'low_trust' → GPS < LOOP_MIN_GPS_TRUST (loopRejectedReason='narrow' en
     *    DB, cause fine distinguée ici pour l'explicabilité) ;
     *  - undefined   → intérieur capturé (ou aucune boucle).
     */
    interiorRejected?: 'narrow' | 'low_trust';
    /** true si l'intérieur a été TRONQUÉ au plafond d'aire (secteurs les plus proches gardés). */
    capReached: boolean;
  };
  points: {
    /** Points de BASE (formule §23 : zones × action × contexte + pionnier), AVANT verify/streak/perf. */
    base: number;
    /** Points FINAUX : floor(base × verify × streak × perf). */
    final: number;
    /** Multiplicateur de streak appliqué. */
    streakMultiplier: number;
    /** Modificateur de performance appliqué. */
    performanceModifier: number;
  };
}

/** Sortie du moteur territorial. */
export interface RunTerritoryResult {
  /** Cellules du COULOIR (rues courues + tolérance GPS). */
  hexes: string[];
  /** Cellules INTÉRIEURES capturées (après gate GPS/forme et cap d'aire). */
  interiorCells: string[];
  /** Union couloir + intérieur, telle que passée à decideClaims. */
  allHexes: string[];
  /** true si une boucle a été fermée (peu importe si l'intérieur est capturé). */
  loopClosed: boolean;
  /** true si l'intérieur a été tronqué au plafond d'aire (capReached). */
  capReached: boolean;
  /**
   * Raison DB du refus d'intérieur ('narrow') — forme trop étroite OU GPS < 80,
   * EXACTEMENT comme ingest_run (les deux causes partagent la copy UI ; la
   * distinction fine est dans `explanation.loop.interiorRejected`). undefined si
   * l'intérieur est capturé ou s'il n'y a pas de boucle.
   */
  loopRejectedReason?: LoopRejectedReason;
  /** Décision par hex (pure) — appliquée atomiquement en aval par claim_hexes. */
  decision: DecideClaimsResult;
  /** Score de course (base × verify × streak × perf → Foulées / XP). */
  score: ScoreResult;
  /** Explicabilité structurée (AMENDEMENT-23). */
  explanation: RunTerritoryExplanation;
}

/**
 * Compose le pipeline territorial (chemin CONQUÊTE). PURE (I/O uniquement via
 * `resolveOwnership`). Reproduit à l'identique la séquence d'ingest_run.
 */
export async function runTerritoryEngine(
  input: RunTerritoryInput,
): Promise<RunTerritoryResult> {
  // ── Hexing (pur) : le couloir = cellules des segments claimables ──────────
  const hexes = hexesForSegments(input.claimable);

  // ── AMENDEMENT-12 §B + AMENDEMENT-16 §2 : la boucle fait la zone (pur) ────
  // Le polygone n'est construit que sur une trace claimable CONTIGUË
  // (loopTracePoints : exactement UN segment). Deux modes de fermeture
  // (detectLoop : tolérance ≤ 80 m OU auto-intersection). Puis anti-abus :
  // forme trop fine → intérieur refusé ; GPS < 80 → intérieur refusé ; boucle
  // trop grande → intérieur tronqué au plafond d'aire (les plus proches du tracé).
  const loopTrace = loopTracePoints(input.claimable);
  const loop = loopTrace !== null ? detectLoop(loopTrace) : null;
  const loopClosed = loop !== null;
  let loopRejectedReason: LoopRejectedReason | undefined;
  let capReached = false;
  let interiorCells: string[] = [];
  // Distingue la cause FINE du refus d'intérieur pour l'explicabilité (les deux
  // partagent loopRejectedReason='narrow' côté DB/copy UI).
  let interiorRejectedCause: 'narrow' | 'low_trust' | undefined;
  let shapeCompactness: number | null = null;
  let shapeWidthM: number | null = null;
  let shapeOk: boolean | null = null;

  // GATE GPS TRUST (AMENDEMENT-23 §D, doc §5) : gpsTrust < LOOP_MIN_GPS_TRUST →
  // pas d'intérieur plein (course + couloir restent valides, comme 'narrow').
  const loopGpsOk = input.gpsTrust >= LOOP_MIN_GPS_TRUST;
  if (loop !== null) {
    const shape = loopShapeVerdict(loop);
    shapeOk = shape.ok;
    shapeCompactness = shape.compactness;
    shapeWidthM = shape.widthM;
    if (!shape.ok) {
      loopRejectedReason = shape.reason; // course valide, intérieur refusé (forme)
      interiorRejectedCause = 'narrow';
    } else if (!loopGpsOk) {
      loopRejectedReason = 'narrow'; // course valide, intérieur refusé (GPS < 80)
      interiorRejectedCause = 'low_trust';
    } else {
      interiorCells = enclosedCells(loop.polygon, hexes);
      const cellCap = loopInteriorCellCap(input.distanceM);
      if (interiorCells.length > cellCap) {
        interiorCells = interiorCells.slice(0, cellCap); // les plus proches du tracé
        capReached = true;
      }
    }
  }
  const interiorSet = new Set(interiorCells);
  const allHexes = interiorCells.length > 0 ? [...hexes, ...interiorCells] : hexes;

  // ── Lecture d'état + contexte (I/O INJECTÉ, seul accès DB du pipeline) ────
  const ownership = await input.resolveOwnership(allHexes);

  // ── Décision par hex (pur) ────────────────────────────────────────────────
  const decision = decideClaims({
    hexes: allHexes,
    states: ownership.states,
    context: {
      userId: input.userId,
      userCreatedAt: input.userCreatedAt,
      now: input.now,
      ownersCreatedAt: ownership.ownersCreatedAt,
      privacyHexes: ownership.privacyHexes,
      noCaptureHexes: ownership.noCaptureHexes,
      zoneDensity: ownership.zoneDensity,
      claimsToday: ownership.claimsToday,
      // Les cellules INTÉRIEURES d'une boucle bien formée prennent l'action
      // `clean_loop` (×1,1) au lieu de `conquest`. Ajouté seulement si non vide,
      // comme ingest_run (préserve le comportement du défaut).
      ...(interiorSet.size > 0 ? { interiorHexes: interiorSet } : {}),
      // coeff_contexte §23 (contested / crew_mission / zone_bonus) — le plus
      // fort contexte s'applique par hex, jamais de cumul.
      ...(ownership.contextByHex !== undefined && ownership.contextByHex.size > 0
        ? { contextByHex: ownership.contextByHex }
        : {}),
    },
  });

  // ── Scoring (pur) : formule §23 (base) × VERIFY × streak × perf ────────────
  // verify_factor = paliers 80/60 sur le trustScore. Puis streak (régularité,
  // cap ×1,5) et performance (0,9-1,15), multiplicateurs EXTERNES orthogonaux.
  // La `performance` est dérivée EXACTEMENT comme ingest_run
  // (dataReliability = gpsTrust/100 ; isRegular = streakWeeks ≥ 1).
  const runVerifyFactor = verifyFactor(input.trustScore);
  const score = computeScore({
    basePoints: decision.totals.points,
    streakWeeks: input.streakWeeks,
    isClub: input.isClub,
    verifyFactor: runVerifyFactor,
    performance: {
      dataReliability: input.gpsTrust / 100,
      isRegular: input.streakWeeks >= 1,
    },
  });

  const explanation: RunTerritoryExplanation = {
    verifyTier: verifyTier(input.trustScore),
    verifyFactor: score.verifyFactor,
    corridorCellCount: hexes.length,
    interiorCellCount: interiorCells.length,
    loop: {
      closed: loopClosed,
      ...(loop !== null ? { closure: loop.closure } : {}),
      shapeOk,
      compactness: shapeCompactness,
      widthM: shapeWidthM,
      ...(interiorRejectedCause !== undefined ? { interiorRejected: interiorRejectedCause } : {}),
      capReached,
    },
    points: {
      base: decision.totals.points,
      final: score.points,
      streakMultiplier: score.streakMultiplier,
      performanceModifier: score.performanceModifier,
    },
  };

  return {
    hexes,
    interiorCells,
    allHexes,
    loopClosed,
    capReached,
    ...(loopRejectedReason !== undefined ? { loopRejectedReason } : {}),
    decision,
    score,
    explanation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BOUCLE COLLECTIVE CREW (algo #8) — fermeture d'une frontière partielle
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ownership + contexte résolus depuis la DB pour l'intérieur PLAFONNÉ d'une
 * boucle crew fermée. MÊME forme que les lectures d'ingest_run
 * (loadHexStates / loadOwnersCreatedAt / loadPrivacyHexes / loadNoCaptureHexes /
 * loadClaimsToday / loadContextByHex). Le résolveur reçoit l'ensemble déjà
 * TRONQUÉ (`capped`) — le plafond d'aire est décidé PUR, en amont, comme
 * ingest_run. Aucune densité ici : elle est fournie à l'entrée du moteur
 * (`zoneDensity` de la course), pas relue par hex (miroir exact de
 * completeBoundaries).
 */
export interface CrewOwnershipResolution {
  /** État DB par hex (absent = jamais possédé). */
  states: ReadonlyMap<string, HexState>;
  /** Date de création de compte par ownerUserId (protection nouveau joueur). */
  ownersCreatedAt: ReadonlyMap<string, Date>;
  /** Hexes res 10 dans une zone privée du coureur (§7). */
  privacyHexes: ReadonlySet<string>;
  /** Hexes res 10 non capturables (autoroutes, zones militaires…). */
  noCaptureHexes: ReadonlySet<string>;
  /** Hexes déjà claimés/défendus aujourd'hui AVANT cette course (§6.4). */
  claimsToday: number;
  /** coeff_contexte §23 par hex (contested / crew_mission / zone_bonus). */
  contextByHex?: ReadonlyMap<string, readonly ContextCoeffKey[]>;
}

/** Entrée du moteur de fermeture de boucle CREW (algo #8). */
export interface CrewBoundaryCloseInput {
  /**
   * Anneau OUVREUR de la frontière partielle (points {lat,lng} de la course qui
   * a ouvert la frontière, `partial_boundaries.opener_ring`). Le polygone de la
   * boucle = anneau ouvreur + trace du finisher (pont end→start implicite).
   */
  openerRing: readonly { lat: number; lng: number }[];
  /**
   * Trace claimable du FINISHER (course qui referme). Sert au pont du polygone
   * ET au couloir déjà pris par cette course (exclu de l'intérieur).
   */
  finisherTrace: readonly { lat: number; lng: number }[];
  /** Longueur validée du segment contribuant du finisher (m) : moitié du plafond d'aire. */
  finisherLengthM: number;
  /** Longueur totale déjà accumulée par la frontière (m) : `total_length_m`, autre moitié du plafond. */
  accumulatedLengthM: number;
  /** Coureur finisher. */
  userId: string;
  /** Création du compte du finisher (exemption de decay < 14 j, §3.3). */
  userCreatedAt: Date;
  /** Horloge de la course (decideClaims l'utilise ; jamais Date.now() interne). */
  now: Date;
  /** Densité de la course (globale) : la zone crew qui referme prend cette densité. */
  zoneDensity: ZoneDensity;
  /**
   * Résolveur d'ownership INJECTÉ (seul accès I/O) : reçoit l'intérieur DÉJÀ
   * PLAFONNÉ (`capped`) et rend les états DB + le contexte. Appelé UNE fois,
   * après le calcul du plafond d'aire.
   */
  resolveOwnership: (capped: readonly string[]) => Promise<CrewOwnershipResolution>;
}

/**
 * Explicabilité structurée de la fermeture crew (miroir de la couche §23) :
 * combien de cellules ont fermé, si le plafond d'aire a été atteint, la part de
 * base vs multipliée. PAS de verify/streak ici : le score crew de la fermeture
 * est le total de base de decideClaims (comme ingest_run — la fermeture crew ne
 * passe pas par computeScore).
 */
export interface CrewBoundaryCloseExplanation {
  /** true si le polygone (anneau + finisher) enclôt au moins une cellule. */
  interiorClosed: boolean;
  /** Cellules d'intérieur brutes (avant plafond d'aire). */
  interiorCellCount: number;
  /** Cellules d'intérieur réellement décidées (après plafond). */
  cappedCellCount: number;
  /** true si l'intérieur a été TRONQUÉ au plafond d'aire (secteurs les plus proches gardés). */
  capReached: boolean;
  /** Plafond d'aire (cellules) pour finisher + accumulé. */
  cellCap: number;
  points: {
    /** Points de BASE crew (formule §23 : zones × action × contexte + pionnier). */
    base: number;
    /** Nombre d'hexes réellement pris (claimed_neutral + stolen) — l'action crew en aval. */
    actionable: number;
  };
}

/** Sortie du moteur de fermeture de boucle CREW. */
export interface CrewBoundaryCloseResult {
  /** Intérieur PLAFONNÉ (cellules décidées) — jamais tronqué côté couloir finisher (déjà pris). */
  interiorCells: string[];
  /** true si l'intérieur a été tronqué au plafond d'aire. */
  cappedAt: boolean;
  /** Décision par hex (pure) — appliquée atomiquement en aval par claim_hexes (zone → CREW). */
  decision: DecideClaimsResult;
  /** Explicabilité structurée. */
  explanation: CrewBoundaryCloseExplanation;
}

/**
 * Compose la fermeture d'une boucle CREW (algo #8). PURE (I/O uniquement via
 * `resolveOwnership`). EXTRACTION à ISO-comportement du cœur de
 * completeBoundaries (ingest_run) : mêmes appels, mêmes arguments, mêmes
 * valeurs de sortie.
 *
 * Contrairement au solo (`runTerritoryEngine`), la boucle crew est fermée PAR
 * CONSTRUCTION (anneau ouvreur + trace finisher) : PAS de detectLoop, PAS de
 * loopShapeVerdict, PAS de gate GPS, et l'intérieur N'est PAS marqué
 * `clean_loop` (le contexte ne passe pas `interiorHexes` — reproduit tel quel).
 */
export async function runCrewBoundaryClose(
  input: CrewBoundaryCloseInput,
): Promise<CrewBoundaryCloseResult> {
  // ── Polygone = anneau ouvreur + trace finisher (pont end→start implicite) ──
  const fullRing = [...input.openerRing, ...input.finisherTrace];
  // Couloir du finisher déjà pris par cette course → exclu de l'intérieur.
  // finisherTrace ({lat,lng}[]) EST un Segment (RunPoint[], `t` optionnel) : on
  // le passe comme UNIQUE segment, exactement comme completeBoundaries.
  const finisherCorridor = hexesForSegments([input.finisherTrace as Segment]);
  const interiorCells = enclosedCells(fullRing, finisherCorridor);
  // NB : interiorCells vide (rare) → on ferme quand même ; decideClaims([]) rend
  // un total nul, la zone crew est la fermeture elle-même (comme ingest_run).

  // ── Plafond d'aire par distance courue (finisher + accumulé) ───────────────
  const cellCap = loopInteriorCellCap(input.finisherLengthM + input.accumulatedLengthM);
  let capped = interiorCells;
  let cappedAt = false;
  if (capped.length > cellCap) {
    capped = capped.slice(0, cellCap); // les plus proches du tracé
    cappedAt = true;
  }

  // ── Lecture d'état + contexte (I/O INJECTÉ, seul accès DB) ─────────────────
  const ownership = await input.resolveOwnership(capped);

  // ── Décision SERVEUR des claims intérieurs (pure) ──────────────────────────
  // MÊME contexte que completeBoundaries : densité GLOBALE de la course, PAS
  // d'interiorHexes (la fermeture crew ne prend pas l'action clean_loop),
  // contextByHex ajouté seulement si non vide.
  const decision = decideClaims({
    hexes: capped,
    states: ownership.states,
    context: {
      userId: input.userId,
      userCreatedAt: input.userCreatedAt,
      now: input.now,
      ownersCreatedAt: ownership.ownersCreatedAt,
      privacyHexes: ownership.privacyHexes,
      noCaptureHexes: ownership.noCaptureHexes,
      zoneDensity: input.zoneDensity,
      claimsToday: ownership.claimsToday,
      ...(ownership.contextByHex !== undefined && ownership.contextByHex.size > 0
        ? { contextByHex: ownership.contextByHex }
        : {}),
    },
  });

  const actionable = decision.results.filter(
    (r) => r.outcome === 'claimed_neutral' || r.outcome === 'stolen',
  ).length;

  const explanation: CrewBoundaryCloseExplanation = {
    interiorClosed: interiorCells.length > 0,
    interiorCellCount: interiorCells.length,
    cappedCellCount: capped.length,
    capReached: cappedAt,
    cellCap,
    points: {
      base: decision.totals.points,
      actionable,
    },
  };

  return {
    interiorCells: capped,
    cappedAt,
    decision,
    explanation,
  };
}
