/**
 * GRYD — libellés de l'explicabilité (AMENDEMENT-23 §B / C2), i18n 5 langues.
 * Helpers PURS (zéro import du store i18n — importables partout) qui DÉRIVENT
 * les chiffres affichés (page « Comment GRYD calcule tes zones », FAQ §33-34,
 * schémas §31) des VRAIES constantes gelées de `@klaim/shared` (game-rules.ts).
 * AUCUN NOMBRE MAGIQUE ici : chaque valeur passe par une constante importée —
 * si un seuil bouge dans game-rules, les pages suivent sans édition.
 *
 * i18n : les libellés UNIQUEMENT numériques (« 80 m », « +24 h », « 6 min »)
 * restent des strings neutres (unités invariantes m/km/min/h). Les libellés qui
 * portent des MOTS (« jours », « ou », phrase verify) deviennent des `Entry`
 * complètes (5 langues, catalogue explain.ts) que les écrans résolvent via t()
 * — jamais résolues ici, pour que la bascule de langue reste réactive.
 * Les exemples chiffrés EN PROSE (+247/+214/+33, 79/21 %, 620 m) restent des
 * SCÉNARIOS démo, portés par le catalogue, pas des règles.
 */
import {
  DEFENSE_HOURS_TRAVERSE,
  DEFENSE_HOURS_LONGE,
  DEFENSE_HOURS_COVER,
  ZONE_DECAY_DAYS,
  ZONE_STABLE_MAX_DAYS,
  ZONE_FRAGILE_MAX_DAYS,
  ZONE_DEFEND_WINDOW_HOURS,
  ACTION_COEFF,
  CONTEXT_COEFF,
  VERIFY_FULL_MIN,
  VERIFY_PARTIAL_MIN,
  LOOP_MIN_GPS_TRUST,
  LOOP_MIN_WIDTH_M,
  LOOP_MAX_AREA_CAP_KM2,
  LOOP_CLOSE_TOLERANCE_M,
  RUN_MIN_DISTANCE_M,
  RUN_MIN_DURATION_S,
  FRONTIER_COVERAGE_BUFFER_M,
  FINISHER_MIN_SEGMENT_M,
  FINISHER_MIN_SHARE,
  PARTIAL_BOUNDARY_TTL_H,
  BONUS_MAX_TOTAL_PCT,
  type ActionCoeffKey,
  type ContextCoeffKey,
} from '@klaim/shared';
import { LOCALES, resolve, type Entry, type Locale } from '../../i18n/types';
import { C } from '../../i18n/catalog/explain';

// ─── Formatage bas niveau (sans dépendance) ──────────────────────────────────

/** Nombre à virgule décimale, jamais de « .0 » superflu (0.5 → « 0,5 »). */
function frNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

/** Multiplicateur « ×1,3 » depuis un coefficient (1.3 → « ×1,3 »). */
export function coeffLabel(k: number): string {
  return `×${frNum(k)}`;
}

/** Mètres → « 80 m » (< 1 km) ou « 1 km » (multiple rond de km). */
function metersLabel(m: number): string {
  if (m >= 1000 && m % 1000 === 0) return `${m / 1000} km`;
  if (m >= 1000) return `${frNum(m / 1000)} km`;
  return `${m} m`;
}

/**
 * Remplit les {placeholders} d'une Entry POUR CHAQUE langue et rend une Entry
 * complète. Les valeurs peuvent être neutres (string/number, identiques
 * partout : « 80 m ») ou elles-mêmes des Entries (résolues langue à langue :
 * « 14 jours » / « 14 days »). Pur — utilisable à module scope (content.ts).
 */
export function fillEntry(
  entry: Entry,
  vars: Readonly<Record<string, string | number | Entry>>,
): Entry {
  const out = {} as Record<Locale, string>;
  for (const locale of LOCALES) {
    let text = entry[locale];
    for (const [key, value] of Object.entries(vars)) {
      const resolved = typeof value === 'object' ? value[locale] : String(value);
      text = text.split(`{${key}}`).join(resolved);
    }
    out[locale] = text;
  }
  return out;
}

// ─── Decay & statuts de zone (§24-§25) ───────────────────────────────────────

/** Durée de vie d'une zone non défendue : « 14 jours » (Entry 5 langues). */
export function decayDaysEntry(): Entry {
  return fillEntry(C.nDays, { n: ZONE_DECAY_DAYS });
}

/** Fenêtres du cycle de vie (stable / fragile / à défendre / expirée). */
export function zoneLifecycleEntries(): {
  stable: Entry;
  fragile: Entry;
  defend: Entry;
  decay: Entry;
} {
  return {
    stable: fillEntry(C.nDays, { n: ZONE_STABLE_MAX_DAYS }),
    fragile: fillEntry(C.lifecycleFragile, {
      a: ZONE_STABLE_MAX_DAYS + 1,
      b: ZONE_FRAGILE_MAX_DAYS,
    }),
    defend: fillEntry(C.lifecycleDefend, { h: ZONE_DEFEND_WINDOW_HOURS }),
    decay: fillEntry(C.lifecycleDecay, { n: ZONE_DECAY_DAYS }),
  };
}

// ─── Défense graduée (§16-§17) ───────────────────────────────────────────────

/** Les 3 niveaux de défense : traverser / longer / couvrir → heures ajoutées. */
export function defenseHoursLabels(): {
  traverse: string;
  longe: string;
  cover: string;
} {
  return {
    traverse: `+${DEFENSE_HOURS_TRAVERSE} h`,
    longe: `+${DEFENSE_HOURS_LONGE} h`,
    cover: `+${DEFENSE_HOURS_COVER} h`,
  };
}

/** Buffer de calcul de « frontière couverte » : « 30 m ». */
export function coverageBufferLabel(): string {
  return metersLabel(FRONTIER_COVERAGE_BUFFER_M);
}

// ─── Points multiplicatifs (§23) ─────────────────────────────────────────────

/** Coefficient d'action « ×1,3 » depuis sa clé (steal, defense…). */
export function actionCoeffLabel(k: ActionCoeffKey): string {
  return coeffLabel(ACTION_COEFF[k]);
}

/** Coefficient de contexte « ×1,2 » depuis sa clé (contested…). */
export function contextCoeffLabel(k: ContextCoeffKey): string {
  return coeffLabel(CONTEXT_COEFF[k]);
}

/** Paliers verify affichés : « 80 » (complet) et « 60 » (partiel). */
export function verifyTiersLabel(): { full: string; partial: string } {
  return { full: String(VERIFY_FULL_MIN), partial: String(VERIFY_PARTIAL_MIN) };
}

/**
 * Phrase des 3 issues verify (complet ≥ 80 / partiel 60-80 / compte en stats
 * < 60) en Entry 5 langues — pour la FAQ « C'est quoi GRYD Verify ? » et
 * l'exemple de la scène verify.
 */
export function verifyTiersSentenceEntry(): Entry {
  return fillEntry(C.verifyTiers, {
    full: VERIFY_FULL_MIN,
    partial: VERIFY_PARTIAL_MIN,
  });
}

/**
 * Variante string de la phrase verify pour les appelants historiques
 * (app/course/[id].tsx) — défaut fr tant qu'ils ne passent pas leur locale.
 */
export function verifyTiersSentence(locale: Locale = 'fr'): string {
  return resolve(verifyTiersSentenceEntry(), locale);
}

// ─── Validité d'une boucle (§5-§6) ───────────────────────────────────────────

/** GPS trust minimal pour capturer l'intérieur : « 80 ». */
export function gpsGateLabel(): string {
  return String(LOOP_MIN_GPS_TRUST);
}

/** Largeur moyenne minimale d'une boucle : « 80 m ». */
export function widthMinLabel(): string {
  return metersLabel(LOOP_MIN_WIDTH_M);
}

/** Plafond dur d'aire capturable : « 3 km² ». */
export function loopMaxAreaCapLabel(): string {
  return `${frNum(LOOP_MAX_AREA_CAP_KM2)} km²`;
}

/** Tolérance de fermeture départ/arrivée : « 80 m ». */
export function closeToleranceLabel(): string {
  return metersLabel(LOOP_CLOSE_TOLERANCE_M);
}

/** Distance minimale d'une course pour compter : « 1 km ». */
export function runMinDistanceLabel(): string {
  return metersLabel(RUN_MIN_DISTANCE_M);
}

/** Durée minimale d'une course : « 6 min ». */
export function runMinDurationLabel(): string {
  return `${RUN_MIN_DURATION_S / 60} min`;
}

// ─── Boucle collective crew (§20) ────────────────────────────────────────────

/** Fenêtre de temps pour qu'un crew ferme une boucle ouverte : « 24 h ». */
export function crewLoopWindowLabel(): string {
  return `${PARTIAL_BOUNDARY_TTL_H} h`;
}

/** Contribution minimale du finisher : « 400 m ou 15 % » (Entry 5 langues). */
export function finisherMinEntry(): Entry {
  return fillEntry(C.finisherMin, {
    m: metersLabel(FINISHER_MIN_SEGMENT_M),
    pct: Math.round(FINISHER_MIN_SHARE * 100),
  });
}

// ─── Bonus (§26-§27, anti pay-to-win) ────────────────────────────────────────

/** Cap total des bonus : « +35 % » (Entry 5 langues, typo % par langue). */
export function bonusCapEntry(): Entry {
  return fillEntry(C.bonusCap, { pct: Math.round(BONUS_MAX_TOTAL_PCT * 100) });
}
