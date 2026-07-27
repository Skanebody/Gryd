// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/anticheat.ts

/**
 * GRYD — engine/anticheat.ts : LE SCORING ANTI-TRICHE (spec produit §11.1,
 * §11.2, §11.3). Fonctions PURES : aucune I/O, aucune horloge lue, aucun accès
 * réseau/DB. Le temps est INJECTÉ (`now`), comme dans contest.ts.
 *
 * ═══ POURQUOI CE FICHIER EXISTE : IL REFERME UN MENSONGE ════════════════════
 * Avant lui, `runs.status = 'flagged'` était un état TERMINAL (0002_schema.sql
 * :105) : aucune table de revue, aucune file, aucun opérateur, aucun appel. La
 * copie de l'écran de résultat annonçait pourtant « GRYD Verify examine cette
 * course » — elle a dû être retirée (docblock de `flaggedWhy`,
 * apps/mobile/src/i18n/catalog/result.ts). Ce module produit la DÉCISION qui
 * manquait ; la migration 0081 lui donne une table ; l'écran E28 (`/appel`) lui
 * donne un droit de réponse.
 *
 * ⚠️ CE MODULE N'EST ENCORE APPELÉ PAR PERSONNE. `ingest_run` ne le consomme pas
 * (câblage explicitement hors périmètre du lot 9). Tant que ce câblage n'existe
 * pas, AUCUNE course réelle n'est scorée par ce code : ne pas écrire ailleurs
 * qu'une revue « a lieu ». Ce fichier est une règle exécutable et testée, pas
 * une mécanique en service.
 *
 * ═══ §11.1 : LES 17 SIGNAUX DE LA SPEC, ET CE QUE LES DONNÉES PERMETTENT ════
 * La spec liste des signaux. Le dépôt ne collecte pas tout — et un signal qu'on
 * ne collecte pas ne se simule pas. NEUF signaux sont calculés ici à partir de
 * données RÉELLEMENT présentes dans le payload d'ingestion (`RunPoint[]`,
 * `stepCount`, `source`, l'horloge injectée) ; les autres sont NOMMÉS, avec la
 * raison de leur absence, dans `ANTICHEAT_SIGNALS_NOT_COLLECTED`. Cette liste
 * fait partie de la sortie du module : elle est là pour être lue, pas pour être
 * enterrée dans un commentaire.
 *
 * ═══ §11.3 : QUATRE DÉCISIONS, ET UN SCORING MULTI-SIGNAL ══════════════════
 * « Le système ne bannit pas automatiquement sur un signal unique faible. »
 * Ce n'est donc PAS un OU logique de seuils. Le score est une moyenne PONDÉRÉE
 * des signaux DISPONIBLES (un signal indisponible sort du dénominateur — il
 * n'est jamais compté comme « propre » ni comme « sale »), et l'échelle des
 * conséquences suit la force de la preuve :
 *
 *   REJECT          ─ soit un signal DÉCISIF au maximum (physiquement
 *                     impossible : rouler à 90 km/h en course à pied), soit une
 *                     CONVERGENCE de signaux au-dessus de REJECT_AT. UN SEUL
 *                     signal est décisif aujourd'hui (`sustained_speed`) : voir
 *                     `ANTICHEAT_SIGNAL_SPECS` pour la raison, signal par signal.
 *   MANUAL_REVIEW   ─ score au-dessus de REVIEW_AT, ou UN signal fort à lui
 *                     seul (mais seulement ceux qui savent l'être seuls, cf.
 *                     `soloEscalates`). Une revue n'est pas une sanction.
 *   PASS_WITH_EXCL. ─ rien de global, mais des SEGMENTS exclus du claim
 *                     (allure de segment hors bornes, §3.2). L'anomalie est
 *                     localisée : on n'annule pas la sortie pour autant.
 *   PASS            ─ le cas normal, y compris avec du bruit GPS.
 *
 * ═══ CE QUE CE MODULE NE FAIT PAS ══════════════════════════════════════════
 *  · Il ne REMPLACE PAS `validateRun` (§3.2). Une sortie trop courte reste
 *    `too_short` : c'est une règle de jeu, pas un soupçon. Les deux se lisent
 *    en parallèle, jamais l'une à la place de l'autre.
 *  · Il ne bannit personne, ne suspend aucun compte, ne touche à aucun score.
 *    Il rend un AVIS. Ce que le serveur en fait est une décision d'appelant.
 *  · Il ne promet aucun délai de traitement : il n'a pas d'horloge de file.
 *
 * ═══ ⚠️ SEUILS : DETTE ASSUMÉE, DÉCLARÉE ICI ════════════════════════════════
 * CLAUDE.md : « aucun nombre magique, toute constante de jeu vient de
 * packages/shared/src/game-rules.ts ». `game-rules.ts` est HORS du périmètre du
 * lot 9 (d'autres chantiers y écrivent en parallèle). Les seuils ci-dessous sont
 * donc déclarés LOCALEMENT, exportés, nommés, et chacun porte un TODO explicite.
 * TODO(lot ultérieur, propriétaire = le chantier qui câble ingest_run) :
 * promouvoir le bloc `ANTICHEAT_*` dans game-rules.ts, puis les importer ici.
 * Tant que ce n'est pas fait, ce module est la SEULE source de ces valeurs —
 * il ne doit pas en exister une seconde copie ailleurs.
 */
import { type Activity, activityRules, DEFAULT_ACTIVITY } from '../game-rules.ts';
import type { RunPoint, RunSource } from '../types.ts';
import {
  claimableSegments,
  computeStats,
  filterPoints,
  haversineM,
  stepCoherence,
  MOTION_TRUST_NEUTRAL,
} from './validation.ts';

// Constantes physiques / d'unités — pas des règles de jeu.
const MS_PER_S = 1_000;
const KMH_PER_M_S = 3.6;

// ════════════════════════════════════════════════════════════════════════════
// SEUILS — dette déclarée (cf. docblock). Aucun n'est une règle de JEU au sens
// du §3 : ce sont des bornes de PLAUSIBILITÉ physique et des seuils de décision.
// ════════════════════════════════════════════════════════════════════════════

/** Score (0-100) à partir duquel une revue humaine est demandée. TODO: game-rules. */
export const ANTICHEAT_REVIEW_AT = 20;
/** Score (0-100) à partir duquel la convergence des signaux vaut refus. TODO: game-rules. */
export const ANTICHEAT_REJECT_AT = 55;
/** Sévérité au-delà de laquelle UN signal `soloEscalates` suffit à demander une revue. TODO: game-rules. */
export const ANTICHEAT_STRONG_SEVERITY = 0.8;
/** Sévérité au-delà de laquelle un signal DÉCISIF vaut refus à lui seul. TODO: game-rules. */
export const ANTICHEAT_DECISIVE_SEVERITY = 0.95;
/**
 * Accélération plausible d'un humain (m/s²). Un départ de sprint tient dans
 * ~3 m/s² ; en dessous, aucune sévérité. TODO: game-rules.
 */
export const ANTICHEAT_HUMAN_MAX_ACCEL_M_S2 = 3;
/** Accélération qu'aucun corps ne produit sur une trace GPS (m/s²) → sévérité 1. TODO: game-rules. */
export const ANTICHEAT_IMPOSSIBLE_ACCEL_M_S2 = 10;
/** Nombre de sauts GPS au-delà duquel la trace est jugée totalement discontinue. TODO: game-rules. */
export const ANTICHEAT_JUMPS_SEVERE = 5;
/**
 * Largeur de la rampe « allure trop rapide » : à `avgPaceMin × (1 − span)` la
 * sévérité atteint 1. 0,5 ⇒ deux fois plus rapide que la borne = maximum.
 * TODO: game-rules.
 */
export const ANTICHEAT_PACE_SPAN = 0.5;
/** Nombre minimal de tronçons pour que la régularité de trace ait un sens. TODO: game-rules. */
export const ANTICHEAT_MIN_LEGS_FOR_REGULARITY = 20;
/**
 * Coefficient de variation MINIMAL des vitesses d'une trace humaine. Un humain
 * accélère, ralentit, s'arrête à un feu : sa dispersion de vitesse est loin de
 * zéro. Une trace interpolée par un outil est quasi parfaite. TODO: game-rules.
 */
export const ANTICHEAT_HUMAN_MIN_SPEED_CV = 0.1;
/** Tolérance d'horloge appareil avant de compter un point « dans le futur » (ms). TODO: game-rules. */
export const ANTICHEAT_CLOCK_SKEW_TOLERANCE_MS = 120_000;
/** Tronçons trop courts pour porter une accélération fiable (bruit GPS) — ignorés. */
export const ANTICHEAT_MIN_LEG_DURATION_S = 1;
/** Nombre de points retenus dans l'empreinte de trace (décimation régulière). */
export const ANTICHEAT_FINGERPRINT_POINTS = 32;
/** Arrondi des coordonnées de l'empreinte (1e-4° ≈ 11 m). */
export const ANTICHEAT_FINGERPRINT_COORD_DECIMALS = 4;

// ════════════════════════════════════════════════════════════════════════════
// §11.1 — LES SIGNAUX
// ════════════════════════════════════════════════════════════════════════════

/** Les signaux RÉELLEMENT calculables sur les données que GRYD collecte. */
export type AntiCheatSignalId =
  /** Part de la durée passée au-dessus de la vitesse max de la discipline. */
  | 'sustained_speed'
  /** Plus forte variation de vitesse entre deux tronçons consécutifs. */
  | 'acceleration'
  /** Part des points dont la précision horizontale dépasse la borne. */
  | 'gps_accuracy'
  /** Nombre de discontinuités (téléportations) dans la trace. */
  | 'gps_jumps'
  /** Allure moyenne sous la borne basse de la discipline. */
  | 'distance_time_ratio'
  /** Podomètre incohérent avec la distance (véhicule, ou discipline mal déclarée). */
  | 'step_coherence'
  /** Trace trop régulière pour être humaine (interpolation/synthèse). */
  | 'trace_regularity'
  /** Trace déjà enregistrée (empreintes antérieures INJECTÉES par l'appelant). */
  | 'duplicate_trace'
  /** Points horodatés dans le futur au-delà de la tolérance d'horloge. */
  | 'future_timestamps';

interface SignalSpec {
  /** Poids dans la moyenne pondérée. */
  readonly weight: number;
  /**
   * Un signal DÉCISIF au maximum vaut refus à lui seul : il décrit un état
   * PHYSIQUEMENT IMPOSSIBLE, pas un doute. Réservé à ce qui ne peut pas être un
   * artefact de capteur.
   */
  readonly decisive: boolean;
  /**
   * Ce signal, seul et fort, peut demander une REVUE (jamais un refus). Faux
   * pour les signaux bruités par nature (précision GPS, accélération), qui
   * enverraient des honnêtes en revue par temps de mauvaise réception.
   */
  readonly soloEscalates: boolean;
}

/**
 * Poids et rôles. Le classement dit la HIÉRARCHIE DE PREUVE : ce qui est
 * physiquement impossible pèse plus que ce qui est seulement inhabituel, et le
 * bruit de capteur pèse le moins.
 */
export const ANTICHEAT_SIGNAL_SPECS: Readonly<Record<AntiCheatSignalId, SignalSpec>> = {
  // Rouler à 90 km/h « à pied » n'est pas un artefact : c'est un véhicule.
  // SEUL signal DÉCISIF du dépôt, et il est mesuré sur les points BRUTS — donc
  // rien ne le plafonne.
  sustained_speed: { weight: 3, decisive: true, soloEscalates: true },
  /**
   * ⚠️ NON DÉCISIF, ET C'EST UNE CONSTATATION, PAS UN RÉGLAGE PRUDENT.
   * Ce signal se calcule sur les segments RETENUS, et `filterPoints` a déjà
   * jeté tout point au-dessus de `pointMaxSpeedKmh` : l'allure moyenne des
   * segments ne peut donc JAMAIS descendre sous 3600/pointMaxSpeedKmh s/km
   * (144 s/km en course à pied). Sa sévérité est structurellement bornée à
   * environ 0,3 avec `ANTICHEAT_PACE_SPAN = 0.5` — la marquer « décisive »
   * inscrirait dans la table une conséquence qui ne peut pas se produire.
   * Elle reste `soloEscalates` : si un jour les bornes de filtrage changent,
   * la règle s'appliquera d'elle-même, sans qu'on ait à s'en souvenir.
   */
  distance_time_ratio: { weight: 3, decisive: false, soloEscalates: true },
  // Une horloge fausse n'est PAS de la triche — d'où `decisive: false`. Mais une
  // sortie dans le futur ne peut pas être créditée telle quelle : revue.
  future_timestamps: { weight: 3, decisive: false, soloEscalates: true },
  // Rejouer une trace est un cheat classique. NON décisif quand même : deux
  // boucles du même joueur sur le même parcours peuvent se ressembler beaucoup,
  // et refuser automatiquement punirait la routine — qui est le cœur du jeu.
  duplicate_trace: { weight: 3, decisive: false, soloEscalates: true },
  gps_jumps: { weight: 2, decisive: false, soloEscalates: true },
  step_coherence: { weight: 2, decisive: false, soloEscalates: true },
  trace_regularity: { weight: 2, decisive: false, soloEscalates: true },
  // Bruité : un tunnel, un canyon urbain, un téléphone en poche en produisent.
  acceleration: { weight: 2, decisive: false, soloEscalates: false },
  gps_accuracy: { weight: 1, decisive: false, soloEscalates: false },
};

/**
 * §11.1 — les signaux de la spec que GRYD NE calcule PAS, et POURQUOI. Aucun
 * n'est simulé, aucun n'est approché par un proxy inventé. Cette liste est
 * rendue avec le rapport : un opérateur qui lit une revue doit voir ce que le
 * système n'a PAS regardé, sinon il surestime la preuve qu'on lui présente.
 */
export const ANTICHEAT_SIGNALS_NOT_COLLECTED: readonly {
  readonly signal: string;
  readonly reason: string;
}[] = [
  {
    signal: 'cadence',
    reason:
      'Seul un TOTAL de pas est transmis (`runs.step_count`) — aucune série temporelle de cadence n’est collectée, donc aucune cadence instantanée n’est calculable.',
  },
  {
    signal: 'inertie (accéléromètre)',
    reason:
      'Aucune donnée d’accéléromètre n’entre dans le payload d’ingestion : le client n’en envoie pas et le schéma n’a pas de colonne pour ça.',
  },
  {
    signal: 'gyroscope',
    reason: 'Non collecté. Aucun capteur d’orientation n’est lu ni transmis.',
  },
  {
    signal: 'baromètre / altitude',
    reason:
      '`RunPoint` ne porte que lat/lng/t/acc — aucune altitude, donc aucun dénivelé ni pression exploitables.',
  },
  {
    signal: 'altérations de fichier',
    reason:
      'Aucun import de fichier (GPX/FIT/TCX) n’existe côté serveur : il n’y a pas de fichier à contrôler. `RunSource` catalogue bien `gpx`, mais aucune route d’import ne l’alimente aujourd’hui.',
  },
  {
    signal: 'appareil compromis (root/jailbreak)',
    reason:
      'Non collecté. Une attestation d’intégrité d’appareil est un traitement à part entière (base légale, information, conservation) : elle n’est ni implémentée ni documentée, donc elle n’est pas devinée.',
  },
  {
    signal: 'pauses',
    reason:
      'Mesurables, mais NON scorées : une pause n’est pas un indice de triche (feu rouge, lacet, photo). Ce qu’une pause peut cacher — une reprise ailleurs — est déjà couvert par `gps_jumps`. Compter les deux serait compter deux fois la même preuve.',
  },
  {
    signal: 'origine de l’activité',
    reason:
      '`runs.source` est enregistré (`gps` | `healthkit` | `gpx`) et rendu dans le rapport, mais AUCUNE origine n’est traitée comme suspecte en soi. Elle sert à savoir quels signaux sont disponibles, pas à juger le joueur.',
  },
];

/** Un signal évalué. `available: false` ⇒ il ne pèse rien, dans aucun sens. */
export interface AntiCheatSignal {
  readonly id: AntiCheatSignalId;
  /** Le signal a-t-il pu être calculé sur cette sortie ? */
  readonly available: boolean;
  /** Gravité 0 (rien) → 1 (maximum). 0 quand indisponible. */
  readonly severity: number;
  readonly weight: number;
  /**
   * Les nombres qui ONT produit la sévérité, pour que la décision soit
   * relisable — par un opérateur comme par le joueur qui fait appel (§11.4
   * « données concernées »). Jamais de coordonnée brute ici : le rapport voyage
   * (revue, appel, journal) et §12 interdit d'y recopier un trajet.
   */
  readonly evidence: Readonly<Record<string, number>>;
  /** Pourquoi le signal est indisponible (absent quand il l'est). */
  readonly unavailableReason?: string;
}

export interface AntiCheatInput {
  readonly points: readonly RunPoint[];
  /** Discipline DÉCLARÉE. Absente ⇒ 'run' (même convention que validation.ts). */
  readonly activity?: Activity;
  /** Podomètre, optionnel : absent ⇒ le signal est indisponible, pas défavorable. */
  readonly stepCount?: number;
  /** Origine, enregistrée et rendue — jamais scorée. */
  readonly source?: RunSource;
  /** Horloge INJECTÉE (epoch ms). Le moteur ne lit jamais `Date.now()`. */
  readonly now: number;
  /**
   * Empreintes des traces DÉJÀ enregistrées par CE joueur, fournies par
   * l'appelant (le moteur ne lit aucune base). `undefined` ⇒ signal
   * indisponible ; `[]` ⇒ signal disponible et négatif (aucun antécédent).
   */
  readonly priorTraceFingerprints?: readonly string[];
}

/** §11.3 — les quatre décisions, telles que la spec les nomme. */
export type AntiCheatDecision =
  | 'PASS'
  | 'PASS_WITH_EXCLUSIONS'
  | 'MANUAL_REVIEW'
  | 'REJECT';

export interface AntiCheatReport {
  readonly decision: AntiCheatDecision;
  /** Score de suspicion 0-100 : moyenne pondérée des signaux DISPONIBLES. */
  readonly suspicion: number;
  /** Tous les signaux, disponibles ou non — l'absence est une information. */
  readonly signals: readonly AntiCheatSignal[];
  /** Les signaux ayant réellement contribué, du plus lourd au plus léger. */
  readonly reasons: readonly AntiCheatSignalId[];
  /** Segments écartés du claim (§3.2) : c'est ce qui rend PASS_WITH_EXCLUSIONS. */
  readonly excludedSegmentCount: number;
  /** Empreinte de CETTE trace, à conserver pour détecter un futur rejeu. */
  readonly fingerprint: string;
  /** Origine déclarée, reportée telle quelle (jamais scorée). */
  readonly source: RunSource | null;
  /** §11.1 — ce que le système n'a pas regardé, et pourquoi. */
  readonly notCollected: typeof ANTICHEAT_SIGNALS_NOT_COLLECTED;
}

// ════════════════════════════════════════════════════════════════════════════
// OUTILS PURS
// ════════════════════════════════════════════════════════════════════════════

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

interface Leg {
  readonly dtS: number;
  readonly distM: number;
  /** Vitesse du tronçon en m/s. */
  readonly speedMs: number;
}

/** Tronçons entre points BRUTS consécutifs (triés, dt > 0). */
function legsOf(points: readonly RunPoint[]): Leg[] {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const legs: Leg[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    const dtS = (b.t - a.t) / MS_PER_S;
    if (dtS <= 0) continue;
    const distM = haversineM(a, b);
    legs.push({ dtS, distM, speedMs: distM / dtS });
  }
  return legs;
}

/**
 * Empreinte PURE d'une trace : géométrie décimée et arrondie (~11 m) + durée
 * et distance en paliers grossiers, hachées en FNV-1a 32 bits.
 *
 * Grossière EXPRÈS. Une empreinte fine ne détecterait qu'un rejeu bit à bit et
 * raterait un GPX ré-exporté ; une empreinte trop grossière collerait deux
 * boucles voisines. Elle n'est JAMAIS une preuve à elle seule — c'est pourquoi
 * `duplicate_trace` n'est pas décisif : elle ouvre une revue, elle ne condamne
 * pas. Aucun hachage cryptographique n'est utilisé (ce n'est pas un secret) et
 * aucune coordonnée n'en sort : l'empreinte ne permet pas de reconstruire le
 * trajet.
 */
export function traceFingerprint(points: readonly RunPoint[]): string {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length === 0) return 'empty';
  const f = 10 ** ANTICHEAT_FINGERPRINT_COORD_DECIMALS;
  const step = Math.max(1, Math.floor(sorted.length / ANTICHEAT_FINGERPRINT_POINTS));
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i += step) {
    const p = sorted[i]!;
    parts.push(`${Math.round(p.lat * f)},${Math.round(p.lng * f)}`);
  }
  const last = sorted[sorted.length - 1]!;
  const first = sorted[0]!;
  parts.push(`d${Math.round((last.t - first.t) / MS_PER_S / 10)}`);
  parts.push(`n${sorted.length}`);
  const s = parts.join('|');
  // FNV-1a 32 bits — déterministe, sans dépendance, sans prétention de sécurité.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ════════════════════════════════════════════════════════════════════════════
// LE SCORING
// ════════════════════════════════════════════════════════════════════════════

const NA = (id: AntiCheatSignalId, reason: string): AntiCheatSignal => ({
  id,
  available: false,
  severity: 0,
  weight: ANTICHEAT_SIGNAL_SPECS[id].weight,
  evidence: {},
  unavailableReason: reason,
});

const SIG = (
  id: AntiCheatSignalId,
  severity: number,
  evidence: Record<string, number>,
): AntiCheatSignal => ({
  id,
  available: true,
  severity: clamp01(severity),
  weight: ANTICHEAT_SIGNAL_SPECS[id].weight,
  evidence,
});

/**
 * §11.1 + §11.2 + §11.3 — l'avis anti-triche d'une sortie. PURE et
 * DÉTERMINISTE : deux appels avec la même entrée rendent le même rapport.
 *
 * Ce que l'appelant DOIT savoir avant de s'en servir :
 *  · `MANUAL_REVIEW` demande une revue HUMAINE. Si personne ne dépile la file,
 *    la course reste non créditée — c'est un fait à assumer dans la copie, pas
 *    à maquiller en « examen en cours ».
 *  · `REJECT` ne bannit pas un compte : il refuse UNE sortie.
 *  · `PASS_WITH_EXCLUSIONS` crédite la sortie en écartant les segments douteux.
 */
export function scoreRun(input: AntiCheatInput): AntiCheatReport {
  const activity = input.activity ?? DEFAULT_ACTIVITY;
  const rules = activityRules(activity);
  const points = input.points;
  const legs = legsOf(points);

  const filtered = filterPoints([...points], activity);
  const stats = computeStats(filtered.segments);
  const claim = claimableSegments(filtered.segments, activity);

  const signals: AntiCheatSignal[] = [];

  // ── 1. Vitesse SOUTENUE (§11.2 « vitesse irréaliste soutenue ») ───────────
  // Mesurée sur les points BRUTS : `filterPoints` supprime justement les points
  // trop rapides, donc la mesurer après filtrage rendrait toujours zéro. La
  // sévérité est une PART DE DURÉE, pas un compteur d'incidents : un pic isolé
  // de 200 km/h dû à un saut de satellite pèse quelques secondes sur une heure,
  // alors qu'un trajet en voiture pèse tout.
  if (legs.length === 0) {
    signals.push(NA('sustained_speed', 'Moins de deux points horodatés exploitables.'));
  } else {
    let overS = 0;
    let totalS = 0;
    let maxKmh = 0;
    for (const leg of legs) {
      totalS += leg.dtS;
      const kmh = leg.speedMs * KMH_PER_M_S;
      if (kmh > maxKmh) maxKmh = kmh;
      if (kmh > rules.pointMaxSpeedKmh) overS += leg.dtS;
    }
    signals.push(
      SIG('sustained_speed', totalS > 0 ? overS / totalS : 0, {
        shareOfDuration: totalS > 0 ? overS / totalS : 0,
        maxSpeedKmh: maxKmh,
        limitKmh: rules.pointMaxSpeedKmh,
      }),
    );
  }

  // ── 2. Accélération ───────────────────────────────────────────────────────
  // Tronçons de moins d'une seconde ignorés : sur un dt minuscule, le bruit de
  // position produit des accélérations absurdes chez des coureurs honnêtes.
  const accelLegs = legs.filter((l) => l.dtS >= ANTICHEAT_MIN_LEG_DURATION_S);
  if (accelLegs.length < 2) {
    signals.push(
      NA(
        'acceleration',
        'Moins de deux tronçons d’au moins une seconde : aucune variation de vitesse fiable.',
      ),
    );
  } else {
    let maxAccel = 0;
    for (let i = 1; i < accelLegs.length; i++) {
      const prev = accelLegs[i - 1]!;
      const cur = accelLegs[i]!;
      const a = Math.abs(cur.speedMs - prev.speedMs) / cur.dtS;
      if (a > maxAccel) maxAccel = a;
    }
    const span = ANTICHEAT_IMPOSSIBLE_ACCEL_M_S2 - ANTICHEAT_HUMAN_MAX_ACCEL_M_S2;
    signals.push(
      SIG('acceleration', (maxAccel - ANTICHEAT_HUMAN_MAX_ACCEL_M_S2) / span, {
        maxAccelMS2: maxAccel,
        humanMaxMS2: ANTICHEAT_HUMAN_MAX_ACCEL_M_S2,
      }),
    );
  }

  // ── 3. Précision GPS ──────────────────────────────────────────────────────
  // Indisponible si AUCUN point ne porte `acc` (HealthKit n'en fournit pas) :
  // une absence de mesure n'est ni bonne ni mauvaise nouvelle.
  const withAcc = points.filter((p) => p.acc !== undefined);
  if (withAcc.length === 0) {
    signals.push(
      NA('gps_accuracy', 'Aucun point ne porte de précision horizontale (source sans `acc`).'),
    );
  } else {
    const bad = withAcc.filter((p) => (p.acc ?? 0) > rules.pointMaxAccuracyM).length;
    signals.push(
      SIG('gps_accuracy', bad / withAcc.length, {
        badPoints: bad,
        measuredPoints: withAcc.length,
        limitM: rules.pointMaxAccuracyM,
      }),
    );
  }

  // ── 4. Sauts géographiques ────────────────────────────────────────────────
  if (legs.length === 0) {
    signals.push(NA('gps_jumps', 'Moins de deux points horodatés exploitables.'));
  } else {
    const jumps = legs.filter((l) => l.distM > rules.pointMaxJumpM).length;
    signals.push(
      SIG('gps_jumps', jumps / ANTICHEAT_JUMPS_SEVERE, {
        jumps,
        severeAt: ANTICHEAT_JUMPS_SEVERE,
        limitM: rules.pointMaxJumpM,
      }),
    );
  }

  // ── 5. Ratio distance/temps (§11.2) ───────────────────────────────────────
  // UNIQUEMENT le côté « trop rapide ». Trop LENT n'est pas de la triche : c'est
  // de la marche, et `validateRun` s'en occupe comme d'une règle de jeu
  // (`pace_too_slow`). Traiter la lenteur comme un soupçon serait accuser des
  // gens de marcher.
  if (stats.distanceM <= 0) {
    signals.push(
      NA('distance_time_ratio', 'Aucune distance exploitable après filtrage des points.'),
    );
  } else {
    const min = rules.avgPaceMinSKm;
    const severity = stats.avgPaceSKm >= min ? 0 : (min - stats.avgPaceSKm) / (min * ANTICHEAT_PACE_SPAN);
    signals.push(
      SIG('distance_time_ratio', severity, {
        avgPaceSKm: stats.avgPaceSKm,
        minPaceSKm: min,
        distanceM: stats.distanceM,
        durationS: stats.durationS,
      }),
    );
  }

  // ── 6. Cohérence des pas ──────────────────────────────────────────────────
  // Réutilise `stepCoherence` (validation.ts) : une seule définition du signal
  // dans le dépôt. `MOTION_TRUST_NEUTRAL` signifie « pas d'information » — on le
  // traduit en INDISPONIBLE, jamais en « propre ».
  if (input.stepCount === undefined) {
    signals.push(NA('step_coherence', 'Aucun podomètre transmis (`stepCount` absent).'));
  } else if (stats.distanceM < rules.minDistanceM) {
    signals.push(
      NA(
        'step_coherence',
        'Distance sous le minimum de la discipline : le ratio pas/mètre n’y est pas fiable.',
      ),
    );
  } else {
    const trust = stepCoherence(stats.distanceM, input.stepCount, activity);
    signals.push(
      SIG('step_coherence', (MOTION_TRUST_NEUTRAL - trust) / MOTION_TRUST_NEUTRAL, {
        motionTrust: trust,
        stepCount: input.stepCount,
        distanceM: stats.distanceM,
      }),
    );
  }

  // ── 7. Régularité de trace (« cohérence du parcours ») ────────────────────
  // Une trace humaine a une dispersion de vitesse importante (feux, côtes,
  // fatigue). Une trace fabriquée par interpolation est presque plate. On mesure
  // donc le coefficient de variation des vitesses, et on ne s'y risque qu'avec
  // assez de tronçons — sur 5 points, une trace régulière ne prouve rien.
  const keptLegs: number[] = [];
  for (const seg of filtered.segments) {
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1]!;
      const b = seg[i]!;
      const dtS = (b.t - a.t) / MS_PER_S;
      if (dtS > 0) keptLegs.push(haversineM(a, b) / dtS);
    }
  }
  if (keptLegs.length < ANTICHEAT_MIN_LEGS_FOR_REGULARITY) {
    signals.push(
      NA(
        'trace_regularity',
        `Moins de ${ANTICHEAT_MIN_LEGS_FOR_REGULARITY} tronçons retenus : la régularité n’est pas mesurable.`,
      ),
    );
  } else {
    const mean = keptLegs.reduce((s, v) => s + v, 0) / keptLegs.length;
    if (mean <= 0) {
      signals.push(NA('trace_regularity', 'Vitesse moyenne nulle : aucune dispersion à mesurer.'));
    } else {
      const variance = keptLegs.reduce((s, v) => s + (v - mean) ** 2, 0) / keptLegs.length;
      const cv = Math.sqrt(variance) / mean;
      signals.push(
        SIG('trace_regularity', 1 - cv / ANTICHEAT_HUMAN_MIN_SPEED_CV, {
          speedCv: cv,
          humanMinCv: ANTICHEAT_HUMAN_MIN_SPEED_CV,
          legs: keptLegs.length,
        }),
      );
    }
  }

  // ── 8. Duplication ────────────────────────────────────────────────────────
  const fingerprint = traceFingerprint(points);
  if (input.priorTraceFingerprints === undefined) {
    signals.push(
      NA(
        'duplicate_trace',
        'Aucune empreinte antérieure fournie par l’appelant : le moteur ne lit aucune base.',
      ),
    );
  } else {
    const hit = input.priorTraceFingerprints.includes(fingerprint);
    signals.push(
      SIG('duplicate_trace', hit ? 1 : 0, {
        matched: hit ? 1 : 0,
        comparedTo: input.priorTraceFingerprints.length,
      }),
    );
  }

  // ── 9. Horodatages dans le futur ──────────────────────────────────────────
  if (points.length === 0) {
    signals.push(NA('future_timestamps', 'Aucun point à horodater.'));
  } else {
    const limit = input.now + ANTICHEAT_CLOCK_SKEW_TOLERANCE_MS;
    const future = points.filter((p) => p.t > limit).length;
    signals.push(
      SIG('future_timestamps', future / points.length, {
        futurePoints: future,
        totalPoints: points.length,
        toleranceMs: ANTICHEAT_CLOCK_SKEW_TOLERANCE_MS,
      }),
    );
  }

  // ── LA DÉCISION ───────────────────────────────────────────────────────────
  const available = signals.filter((s) => s.available);
  const totalWeight = available.reduce((w, s) => w + s.weight, 0);
  const weighted = available.reduce((acc, s) => acc + s.weight * s.severity, 0);
  const suspicion = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;

  const decisive = available.some(
    (s) => ANTICHEAT_SIGNAL_SPECS[s.id].decisive && s.severity >= ANTICHEAT_DECISIVE_SEVERITY,
  );
  const strongAlone = available.some(
    (s) => ANTICHEAT_SIGNAL_SPECS[s.id].soloEscalates && s.severity >= ANTICHEAT_STRONG_SEVERITY,
  );
  const excludedSegmentCount = claim.excluded.length;

  let decision: AntiCheatDecision;
  if (decisive || suspicion >= ANTICHEAT_REJECT_AT) {
    decision = 'REJECT';
  } else if (suspicion >= ANTICHEAT_REVIEW_AT || strongAlone) {
    decision = 'MANUAL_REVIEW';
  } else if (excludedSegmentCount > 0) {
    decision = 'PASS_WITH_EXCLUSIONS';
  } else {
    decision = 'PASS';
  }

  const reasons = available
    .filter((s) => s.severity > 0)
    .sort((a, b) => b.weight * b.severity - a.weight * a.severity)
    .map((s) => s.id);

  return {
    decision,
    suspicion,
    signals,
    reasons,
    excludedSegmentCount,
    fingerprint,
    source: input.source ?? null,
    notCollected: ANTICHEAT_SIGNALS_NOT_COLLECTED,
  };
}

/**
 * Une décision demande-t-elle une intervention humaine ? Seul `MANUAL_REVIEW`
 * en demande une. `REJECT` est automatique et ouvre un DROIT D'APPEL (§11.4) —
 * ce qui n'est pas la même chose qu'une file de revue.
 */
export function needsHumanReview(decision: AntiCheatDecision): boolean {
  return decision === 'MANUAL_REVIEW';
}

/**
 * La capture est-elle créditée ? `PASS` en totalité, `PASS_WITH_EXCLUSIONS`
 * partiellement ; `MANUAL_REVIEW` et `REJECT` ne créditent rien — et c'est
 * exactement ce que l'écran de résultat doit DIRE, sans promettre de suite
 * qu'aucun code ne tient.
 */
export function creditsCapture(decision: AntiCheatDecision): boolean {
  return decision === 'PASS' || decision === 'PASS_WITH_EXCLUSIONS';
}
