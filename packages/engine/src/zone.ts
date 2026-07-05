/**
 * GRYD — engine/zone.ts
 * AMENDEMENT-23 §D + doc §24/§25 — STATUTS DE ZONE + DECAY 14 j.
 *
 * Fonctions PURES : timestamps + activité → statut nommé, et échéance de decay
 * étendue par la défense graduée. AUCUN nombre magique (game-rules gèle tout).
 *
 * Cycle de vie d'une zone (doc §25, depuis la dernière défense/capture) :
 *   stable      0 → ZONE_STABLE_MAX_DAYS (7 j)
 *   fragile     ZONE_STABLE_MAX_DAYS → ZONE_FRAGILE_MAX_DAYS (8-14 j)
 *   a_defendre  dans les ZONE_DEFEND_WINDOW_HOURS (48 h) avant l'échéance decay
 *   en_decay    après l'échéance de decay
 * Deux statuts « transverses » priment quand leur signal est présent :
 *   protegee    bouclier actif OU stable_until (défense forte) loin dans le futur
 *   contestee   rival actif / contrôle partagé (signal externe fourni)
 *
 * PRÉFÉRENCE : dériver le statut au READ (pas de colonne). La SEULE persistance
 * introduite par ce chantier est `stable_until` (défense graduée cible 1) —
 * l'échéance de decay effective d'une zone.
 */
import {
  ZONE_DECAY_DAYS,
  ZONE_DEFEND_WINDOW_HOURS,
  ZONE_STABLE_MAX_DAYS,
} from '@klaim/shared/game-rules';

// Conversions d'unités — pas des règles de jeu.
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Statut nommé d'une zone (doc §24). Union stable pour l'UI/explicabilité. */
export type ZoneStatus =
  | 'stable'
  | 'fragile'
  | 'a_defendre'
  | 'contestee'
  | 'protegee'
  | 'en_decay';

/** Entrée de dérivation du statut d'une zone. Timestamps absolus (Date). */
export interface ZoneStatusInput {
  now: Date;
  /**
   * Échéance de decay effective de la zone (colonne stable_until / decay_at).
   * null = territoire SANS decay (protection nouveau joueur §3.3) → toujours
   * `stable` (sauf contestée/protégée par un signal explicite).
   */
  decayAt: Date | null;
  /** Dernière défense/capture (repère du cycle stable/fragile). null = inconnue. */
  lastDefendedAt: Date | null;
  /** Bouclier actif jusqu'à (protégée si futur). null/absent = pas de bouclier. */
  shieldedUntil?: Date | null;
  /** Rival actif / contrôle partagé sur le secteur (signal externe). Défaut false. */
  contested?: boolean;
}

/**
 * Dérive le STATUT nommé d'une zone (doc §24). PURE. Ordre de priorité :
 *  1. `en_decay`   — échéance de decay dépassée (perte de propriété imminente) ;
 *  2. `contestee`  — rival actif / partagé (signal externe) ;
 *  3. `protegee`   — bouclier actif ;
 *  4. `a_defendre` — dans les ZONE_DEFEND_WINDOW_HOURS avant l'échéance decay ;
 *  5. `stable`     — décayé null (nouveau joueur) OU < ZONE_STABLE_MAX_DAYS depuis
 *                    la dernière défense ;
 *  6. `fragile`    — sinon (8-14 j sans défense).
 * NB : `en_decay` prime sur tout — une zone dont l'échéance est passée EST en
 * decay, même si un signal contesté/bouclier traîne (état incohérent résolu au
 * profit du decay). `contestee`/`protegee` priment ensuite sur le cycle
 * temporel (une zone disputée l'est, qu'elle soit stable ou fragile).
 */
export function zoneStatus(input: ZoneStatusInput): ZoneStatus {
  const nowMs = input.now.getTime();

  // 1. Échéance dépassée → decay (prioritaire absolu).
  if (input.decayAt !== null && input.decayAt.getTime() <= nowMs) return 'en_decay';

  // 2. Contestée (signal externe rival actif/partagé).
  if (input.contested === true) return 'contestee';

  // 3. Protégée (bouclier actif).
  if (input.shieldedUntil != null && input.shieldedUntil.getTime() > nowMs) return 'protegee';

  // 4. À défendre : dans la fenêtre finale avant l'échéance de decay.
  if (input.decayAt !== null) {
    const msToDecay = input.decayAt.getTime() - nowMs;
    if (msToDecay <= ZONE_DEFEND_WINDOW_HOURS * MS_PER_HOUR) return 'a_defendre';
  }

  // 5. Stable : décayé null (nouveau joueur, jamais de decay) ou défense récente.
  if (input.decayAt === null) return 'stable';
  if (input.lastDefendedAt !== null) {
    const ageDays = (nowMs - input.lastDefendedAt.getTime()) / MS_PER_DAY;
    if (ageDays < ZONE_STABLE_MAX_DAYS) return 'stable';
    return 'fragile';
  }
  // Dernière défense inconnue : on classe par le temps restant avant decay.
  // Il reste > 48 h (sinon a_defendre ci-dessus). Si l'échéance est ≥ à une
  // fenêtre « fraîche » (> ZONE_FRAGILE_MAX_DAYS − ZONE_STABLE_MAX_DAYS), stable.
  const msToDecay = input.decayAt.getTime() - nowMs;
  const freshWindowMs = (ZONE_STABLE_MAX_DAYS) * MS_PER_DAY;
  // La zone est stable si son échéance est encore à plus de (14−7)=7 j restants
  // rapportés au cycle : approx sûre — une zone fraîchement capturée a
  // decayAt ≈ now + 14 j, donc msToDecay > 7 j → stable.
  return msToDecay > freshWindowMs ? 'stable' : 'fragile';
}

/**
 * Échéance de decay à POSER À LA CAPTURE d'une zone (doc §25) : now +
 * ZONE_DECAY_DAYS. PURE. L'appelant pose stable_until/decay_at à cette valeur
 * (ou null si le coureur est un nouveau joueur exempté de decay §3.3).
 */
export function initialDecayAt(now: Date): Date {
  return new Date(now.getTime() + ZONE_DECAY_DAYS * MS_PER_DAY);
}

/**
 * ÉTEND l'échéance de decay d'une zone défendue (doc §16/§25, AMENDEMENT-23 §D).
 * PURE. La défense REPOUSSE l'échéance de `hours` heures À PARTIR DE MAINTENANT
 * (la stabilité s'étend, elle ne se reset PAS à une valeur fixe) :
 *
 *   nouvelle échéance = max(échéance actuelle, now) + hours
 *
 * — on ne raccourcit jamais une échéance déjà plus lointaine (max avec l'actuelle),
 * et une zone déjà en decay (échéance passée) repart de `now + hours`. Le
 * plafond `capDays` (défaut ZONE_DECAY_DAYS) borne l'horizon pour qu'une zone
 * sur-défendue ne devienne pas éternelle : l'échéance ne dépasse jamais
 * now + capDays. Passer capDays=0 (ou négatif) désactive le plafond.
 */
export function extendDecay(
  now: Date,
  currentDecayAt: Date | null,
  hours: number,
  capDays: number = ZONE_DECAY_DAYS,
): Date {
  const nowMs = now.getTime();
  const base = currentDecayAt !== null ? Math.max(currentDecayAt.getTime(), nowMs) : nowMs;
  let extended = base + hours * MS_PER_HOUR;
  if (capDays > 0) {
    const ceil = nowMs + capDays * MS_PER_DAY;
    // Le plafond ne doit jamais RACCOURCIR sous l'échéance actuelle (une zone qui
    // avait déjà > capDays reste où elle est) — on borne seulement le GAIN.
    extended = Math.min(extended, Math.max(ceil, base));
  }
  return new Date(extended);
}
