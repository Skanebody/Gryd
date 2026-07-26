/**
 * GRYD — LOGIQUE PURE de la sheet E22 « DÉFENSE · Zone attaquée ».
 *
 * L'étape « Se faire reprendre → Revenir » du core loop : ma zone (donc mon crew,
 * `role === 'mine'`) est CONTESTÉE (`sector_snapshot.contested`, un booléen RÉEL).
 * Un sheet = UNE décision : DÉFENDRE. Zéro import React/RN → Deno charge ce module
 * tel quel, à côté de `zoneDecision.ts` dont il RÉUTILISE les formateurs (jamais
 * un second « 0,42 » qui arrondirait autrement).
 *
 * ─── CE QUE LE MOTEUR SAIT RÉELLEMENT DIRE, ET RIEN DE PLUS ─────────────────
 * La planche compose l'identité du rival (« Nina M. a couru dans votre zone · il
 * y a 2 h · sa boucle couvre ~60 % »). TROIS de ces faits sont INTERDITS ici :
 *   · le PSEUDO du rival — on ne synthétise jamais une identité depuis un UUID ;
 *   · « il y a 2 h » — la RLS `runs_select_own` interdit au client de lire
 *     l'activité d'autrui, et une fraîcheur à l'heure près est un pas vers la
 *     position live que la planche proscrit ;
 *   · « sa boucle couvre ~60 % » — la BOUCLE du rival est une donnée de course
 *     privée. On la remplace par la seule couverture APPROXIMATIVE qui ait une
 *     source : `rivalPercent`, la part AGRÉGÉE que le rival tient du SECTEUR
 *     (`sector_snapshot`), jamais son tracé.
 * Reste ce qui se calcule vraiment : l'ÉCHÉANCE (la plus proche `decay_at` de mes
 * hex, une échéance serveur posée à la capture — game-rules `ZONE_DECAY_DAYS`),
 * la SURFACE en jeu (aire H3 exacte du territoire), et le fait CONTESTÉ.
 *
 * ─── LE COMPTE À REBOURS EST EN HEURES, JAMAIS EN SECONDES ──────────────────
 * La planche l'exige : « N h restantes », jamais un chrono qui défile. Cette
 * fonction rend donc des HEURES entières — l'écran n'a aucun `setInterval` à la
 * seconde, il lit une valeur figée au montage.
 */
import { areaStatParts, type StatParts } from './zoneDecision';

// ─── Sélection : cette zone relève-t-elle de E22 ? ──────────────────────────

/**
 * E22 s'ouvre sur MA zone (mon crew, `role === 'mine'`) et CONTESTÉE. Une zone
 * rivale reste E04 (« Reprendre »), une zone à moi NON contestée reste la sheet
 * d'information sans décision. Séparé en fonction PURE : les deux écrans (natif
 * et .web) tranchent la même chose, testée une fois.
 */
export function isDefenseZone(z: { role: 'mine' | 'rival'; contested: boolean }): boolean {
  return z.role === 'mine' && z.contested === true;
}

// ─── Échéance (heures) ──────────────────────────────────────────────────────

const MS_PER_HOUR = 3_600_000;

/**
 * Seuil PRÉSENTATION (pas une règle de jeu) : sous cette échéance, l'écran passe
 * à l'or (planche E22 « échéance < 2 h → or, jamais rouge »). Vit ici, avec les
 * autres constantes d'affichage, exactement comme les hauteurs de rangée de
 * `zoneDecision.ts` : aucune mécanique n'en dépend, seulement le rendu.
 */
export const DEFENSE_IMMINENT_HOURS = 2;

/**
 * Heures (arrondi au SUPÉRIEUR) jusqu'à `decayAt`. `null` si la date est absente
 * ou illisible — on n'affiche alors PAS d'échéance plutôt que d'en inventer une
 * (une zone sous protection nouveau-joueur, ou dont le job n'a pas encore posé
 * l'échéance, n'a réellement pas de compte à rebours).
 *
 * Une échéance DÉPASSÉE (le job de decay n'a pas encore tourné) rend 0, jamais un
 * nombre négatif : « -3 h pour défendre » serait un bug lu au joueur. L'arrondi
 * au supérieur évite d'annoncer « 0 h » quand il reste encore quelques minutes.
 */
export function defenseHoursRemaining(decayAt: string | null, now: Date): number | null {
  if (!decayAt) return null;
  const ms = Date.parse(decayAt);
  if (!Number.isFinite(ms)) return null;
  const diff = ms - now.getTime();
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_HOUR);
}

export type DefenseUrgency = 'imminent' | 'normal';

/**
 * `imminent` sous le seuil (or à l'écran), `normal` au-dessus. Une échéance
 * INCONNUE (`null`) reste `normal` : ne pas savoir quand la zone tombe n'est pas
 * une urgence, et surtout ça ne se colore pas comme telle.
 */
export function defenseUrgency(hoursRemaining: number | null): DefenseUrgency {
  if (hoursRemaining === null) return 'normal';
  return hoursRemaining <= DEFENSE_IMMINENT_HOURS ? 'imminent' : 'normal';
}

// ─── Couverture rivale APPROXIMATIVE (agrégat de secteur, jamais le tracé) ───

/**
 * Part du secteur tenue par un rival, en POURCENTAGE entier, ou `null` si aucune
 * source (pas de rival identifié, ou part nulle). C'est un agrégat de
 * `sector_snapshot`, pas l'activité privée du rival : on peut le montrer. Borné à
 * 100 par sécurité (une part > 1 côté serveur ne doit pas produire « 140 % »).
 */
export function defenseCoveragePercent(rivalPercent: number | null): number | null {
  if (rivalPercent === null || !Number.isFinite(rivalPercent)) return null;
  if (rivalPercent <= 0) return null;
  const pct = Math.round(rivalPercent * 100);
  if (pct <= 0) return null;
  return pct > 100 ? 100 : pct;
}

// ─── Métriques réellement affichables (jamais une cellule vide) ─────────────

/**
 * Les deux métriques SOURCÉES de la rangée à séparateurs : l'échéance en heures
 * et la surface en jeu. La planche en montre une TROISIÈME — « ≈ km boucle de
 * défense » — volontairement ABSENTE : aucune boucle n'est routée à l'ouverture
 * de la sheet (même refus que « ≈ km effort estimé » de E04). Sa distance RÉELLE
 * n'existe qu'une fois le briefing E05 ouvert, mesurée par OSRM ; l'annoncer ici
 * promettrait un chiffre qu'aucun calcul n'a produit.
 */
export type DefenseMetricKey = 'deadline' | 'area';

/** Ordre d'affichage (planche : échéance d'abord, puis surface en jeu). */
export const DEFENSE_METRIC_ORDER: readonly DefenseMetricKey[] = ['deadline', 'area'];

export function defenseMetricKeys(input: {
  hoursRemaining: number | null;
  areaKm2: number;
}): readonly DefenseMetricKey[] {
  const out: DefenseMetricKey[] = [];
  if (input.hoursRemaining !== null && Number.isFinite(input.hoursRemaining)) {
    out.push('deadline');
  }
  // Une surface nulle ou non finie n'est pas « 0 km² » : c'est une absence de
  // mesure. La ligne saute plutôt que d'afficher un zéro nu (§ zéro-mensonge).
  if (Number.isFinite(input.areaKm2) && input.areaKm2 > 0) out.push('area');
  return out;
}

/** « 0,42 km² » → { value, unit } — mêmes règles décimales que E04 (réexport pur). */
export function areaInPlayParts(km2: number, locale: string): StatParts {
  return areaStatParts(km2, locale);
}

/**
 * TOUT ce que la sheet de défense ET son calcul de hauteur ont besoin de savoir,
 * dérivé UNE fois. Écran et hauteur partent de la même source : impossible de
 * peindre une ligne que la hauteur ignore (le défaut que `zoneSheetHeight` a déjà
 * réglé pour E04). `now` est FOURNI (aucune horloge cachée) — le parent le fige
 * pour que hauteur et rendu voient la même heure.
 */
export interface DefenseView {
  hoursRemaining: number | null;
  urgency: DefenseUrgency;
  coveragePercent: number | null;
  metrics: readonly DefenseMetricKey[];
}

export function deriveDefenseView(
  zone: { decayAt: string | null; rivalPercent: number | null; areaKm2: number },
  now: Date,
): DefenseView {
  const hoursRemaining = defenseHoursRemaining(zone.decayAt, now);
  return {
    hoursRemaining,
    urgency: defenseUrgency(hoursRemaining),
    coveragePercent: defenseCoveragePercent(zone.rivalPercent),
    metrics: defenseMetricKeys({ hoursRemaining, areaKm2: zone.areaKm2 }),
  };
}

// ─── Résultat de l'alerte au crew (mapping PUR d'un verdict serveur) ────────

/**
 * L'issue d'un « Alerter le crew » : le crew a un canal RÉEL (`crew_ping_zone`,
 * migration 0051, vocabulaire FERMÉ — aucun texte libre). L'écriture est décidée
 * SERVEUR ; cette fonction ne fait que TRADUIRE son verdict en une issue stable
 * que l'écran mappe vers un toast honnête. Aucune issue n'est muette.
 */
export type CrewAlertOutcome =
  | 'sent'
  | 'no_crew'
  | 'cooldown'
  | 'not_crew_sector'
  | 'signed_out'
  | 'failed';

/**
 * Verdict RPC (`{ ok, reason }`) → issue d'écran. On ne dépend pas du type de la
 * feature crew (import croisé) : la forme minimale suffit, et reste chargeable
 * par Deno. Un `reason` inconnu retombe sur `failed` — jamais un toast vide.
 */
export function crewAlertOutcome(res: { ok: boolean; reason?: string | null }): CrewAlertOutcome {
  if (res.ok) return 'sent';
  switch (res.reason) {
    case 'no_crew':
      return 'no_crew';
    case 'cooldown':
      return 'cooldown';
    // Secteur qui n'est pas un secteur de crew pingable, ou pas encore nommé :
    // dans les deux cas, ce lieu n'est pas une cible d'alerte de crew valide.
    case 'sector_not_allowed':
    case 'sector_unnamed':
      return 'not_crew_sector';
    case 'signed_out':
      return 'signed_out';
    // bad_bounds / bad_signal / network / inconnu : un échec, dit comme tel.
    default:
      return 'failed';
  }
}

// ─── Hauteur de la sheet : elle ÉPOUSE ce qui est réellement rendu ──────────
//
// Calibrée sur les styles de DefenseZoneSheet, mêmes rangées que zoneDecision.ts
// (police, gap de 6, paddings de `info`, dégagement du panneau fixe). La sheet de
// zone est un panneau FIXE qui hug son contenu : une hauteur trop courte
// tronquerait le CTA (§A9), une trop longue laisserait une bande carbone vide
// (§A). On la DÉDUIT donc des blocs présents plutôt que de figer « 52 % ».

/** Dégagement haut du panneau fixe (MapAnchoredSheet.fixedTopGap) + bas de `info`. */
const SHEET_CHROME = 14 + 12;
/** Rangée d'en-tête : pastille + kicker + bouton Fermer (cible tactile 32). */
const HEAD_ROW = 32;
/** Nom de zone — TITRE HÉROS (`typography.title`, 28 px + marge). */
const NAME_ROW = 36;
/** Ligne de couverture rivale approx / fait contesté (jusqu'à 2 lignes). */
const COVERAGE_ROW = 34;
/** Note d'urgence OR (état imminent uniquement) — une ligne courte. */
const URGENCY_ROW = 18;
/** Bloc de métriques à séparateurs (gros nombre + unité + libellé). */
const METRICS_BLOCK = 64;
/** Phrase tactique — deux lignes autorisées, jamais coupée (§A9). */
const SENTENCE_ROW = 34;
/** CTA plein (54) + son dégagement haut (12). */
const CTA_ROW = 66;
/** Lien tertiaire « Alerter le crew » — cible tactile a11y de 44. */
const LINK_ROW = 44;
/** Espacement vertical entre deux blocs de `info`. */
const GAP = 6;
/** Marge de sécurité : métriques de police variables selon la plateforme. */
const ROW_SLACK = 20;

export interface DefenseSheetHeightInput {
  /** Nombre de métriques réellement rendues (0 ⇒ pas de bloc). */
  metrics: number;
  /** La ligne de couverture / fait contesté est-elle rendue ? (toujours vrai en pratique). */
  hasCoverageLine: boolean;
  /** La note d'urgence OR est-elle rendue (échéance imminente) ? */
  hasUrgencyNote: boolean;
  /** Le lien « Alerter le crew » est-il rendu ? */
  hasSecondary: boolean;
}

export function defenseSheetHeight(input: DefenseSheetHeightInput): number {
  let h = SHEET_CHROME + HEAD_ROW + GAP + NAME_ROW + ROW_SLACK;
  if (input.hasCoverageLine) h += GAP + COVERAGE_ROW;
  if (input.hasUrgencyNote) h += GAP + URGENCY_ROW;
  if (input.metrics > 0) h += GAP + METRICS_BLOCK;
  h += GAP + SENTENCE_ROW;
  h += CTA_ROW;
  if (input.hasSecondary) h += GAP + LINK_ROW;
  return h;
}
