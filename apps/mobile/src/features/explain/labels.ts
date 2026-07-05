/**
 * GRYD — libellés FR de l'explicabilité (AMENDEMENT-23 §B / C2).
 * Helpers PURS qui DÉRIVENT les chiffres affichés (page « Comment GRYD calcule
 * tes zones », FAQ §33-34, schémas §31) des VRAIES constantes gelées de
 * `@klaim/shared` (game-rules.ts). AUCUN NOMBRE MAGIQUE ici : chaque valeur
 * passe par une constante importée — si un seuil bouge dans game-rules, les
 * pages suivent sans édition. Les exemples chiffrés EN PROSE (+247/+214/+33,
 * 79/21 %, 620 m) restent des SCÉNARIOS démo, portés par content.ts, pas des
 * règles. Présentation seule, zéro logique de jeu.
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

// ─── Formatage bas niveau (FR, sans dépendance) ──────────────────────────────

/** Nombre FR : virgule décimale, jamais de « .0 » superflu (0.5 → « 0,5 »). */
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

// ─── Decay & statuts de zone (§24-§25) ───────────────────────────────────────

/** Durée de vie d'une zone non défendue : « 14 jours ». */
export function decayDaysLabel(): string {
  return `${ZONE_DECAY_DAYS} jours`;
}

/** Fenêtres du cycle de vie (stable / fragile / à défendre) pour la FAQ decay. */
export function zoneLifecycleLabels(): {
  stable: string;
  fragile: string;
  aDefendre: string;
  decay: string;
} {
  return {
    stable: `${ZONE_STABLE_MAX_DAYS} jours`,
    fragile: `jours ${ZONE_STABLE_MAX_DAYS + 1} à ${ZONE_FRAGILE_MAX_DAYS}`,
    aDefendre: `dernières ${ZONE_DEFEND_WINDOW_HOURS} h`,
    decay: `après ${ZONE_DECAY_DAYS} jours`,
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
 * Phrase des 3 issues verify (complet ≥ 80 / partiel 60-80 / stats only < 60),
 * pour la FAQ « C'est quoi GRYD Verify ? ».
 */
export function verifyTiersSentence(): string {
  return `${VERIFY_FULL_MIN}+ : capture pleine · ${VERIFY_PARTIAL_MIN}-${VERIFY_FULL_MIN} : capture partielle · < ${VERIFY_PARTIAL_MIN} : stats only`;
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

/** Contribution minimale du finisher : « 400 m ou 15 % ». */
export function finisherMinLabel(): string {
  return `${metersLabel(FINISHER_MIN_SEGMENT_M)} ou ${Math.round(FINISHER_MIN_SHARE * 100)} %`;
}

// ─── Bonus (§26-§27, anti pay-to-win) ────────────────────────────────────────

/** Cap total des bonus : « +35 % ». */
export function bonusCapLabel(): string {
  return `+${Math.round(BONUS_MAX_TOTAL_PCT * 100)} %`;
}
