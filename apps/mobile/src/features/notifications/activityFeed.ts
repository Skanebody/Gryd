/**
 * GRYD — MOTEUR PUR du flux d'ACTIVITÉ (planche E23), sans React ni Supabase.
 *
 * ─── CE QUE LA PLANCHE E23 EXIGE, ET POURQUOI UN MOTEUR ─────────────────────
 * E23 n'est pas une boîte aux lettres : c'est un flux TACTIQUE. Trois règles s'y
 * trompent en silence si on les laisse dans le JSX :
 *   1. L'ORDRE est fixe et par PRIORITÉ, jamais un tri chronologique pur : une
 *      contestation à défendre passe TOUJOURS avant un badge débloqué, même si
 *      le badge est plus récent. Seul le TRI INTERNE d'un groupe suit la
 *      récence.
 *   2. Le BADGE de la cloche compte les seules lignes ACTIONNABLES (celles qui
 *      portent une action inline : Défendre / Voir / Planifier / Répondre) —
 *      jamais les lignes à simple chevron (un badge débloqué n'appelle pas une
 *      action, il se consulte).
 *   3. Les alertes OBSOLÈTES (zone déjà défendue, défi expiré) se retirent
 *      SEULES : une ligne dont l'échéance est passée disparaît du flux.
 *
 * Ces trois décisions vivent ICI, testées sans réseau ni rendu
 * (`activityFeed.test.ts`). Le moteur est GÉNÉRIQUE sur la source des
 * événements : il ne fabrique aucune ligne. Tant qu'aucun événement réel
 * n'existe pour un groupe, ce groupe est ABSENT — pas peint « à venir ». C'est
 * l'écran qui branche les vraies sources (badges aujourd'hui ; contestation /
 * rivalité / crew le jour où le cross-joueur existe, O1).
 */

/**
 * Les QUATRE groupes fixes, dans l'ordre de PRIORITÉ de la planche E23 :
 * À défendre > Rivalité > Crew > Progression. L'ordre est une CONSTANTE, pas un
 * tri : le renverser reviendrait à enterrer une zone à défendre sous un badge.
 */
export type ActivityGroup = 'defend' | 'rivalry' | 'crew' | 'progression';

export const ACTIVITY_GROUP_ORDER: readonly ActivityGroup[] = [
  'defend',
  'rivalry',
  'crew',
  'progression',
];

/**
 * Un événement du flux. Volontairement minimal et SANS contenu fabriqué : le
 * texte de la ligne est dérivé par l'écran depuis la vraie donnée (un badge
 * réel, plus tard une contestation réelle). Le moteur ne connaît que ce dont il
 * a besoin pour ORDONNER et COMPTER.
 */
export interface ActivityEvent {
  /** Identité stable (rendu déterministe, dédup). */
  id: string;
  group: ActivityGroup;
  /** Instant de l'événement (ms epoch) — sert au tri INTERNE d'un groupe. */
  createdAtMs: number;
  /**
   * True si la ligne porte une ACTION inline (Défendre / Voir / Planifier /
   * Répondre). C'est elle, et elle seule, que compte le badge de la cloche. Une
   * ligne à simple chevron (badge débloqué, capture crew consultable) est
   * `false`.
   */
  actionable: boolean;
  /**
   * Échéance au-delà de laquelle l'alerte est OBSOLÈTE (zone déjà défendue à
   * temps, défi expiré). Absente = l'événement ne périme pas (un badge débloqué
   * reste vrai). Une alerte périmée quitte le flux d'elle-même.
   */
  expiresAtMs?: number;
}

/** Une alerte dont l'échéance est passée : elle a fait son temps, on la retire. */
export function isObsolete(e: ActivityEvent, nowMs: number): boolean {
  return e.expiresAtMs !== undefined && e.expiresAtMs <= nowMs;
}

/** Les événements ENCORE VIVANTS (les obsolètes se retirent seuls, planche E23). */
export function liveEvents<T extends ActivityEvent>(events: readonly T[], nowMs: number): T[] {
  return events.filter((e) => !isObsolete(e, nowMs));
}

/**
 * Le compte du BADGE de la cloche : les seules lignes ACTIONNABLES encore
 * vivantes. Un badge qui compterait des lignes à chevron (ou des alertes
 * périmées) serait un mensonge — c'est exactement pourquoi la cloche du Home
 * reste éteinte tant qu'aucune ligne actionnable réelle n'existe (O1).
 */
export function actionableCount(events: readonly ActivityEvent[], nowMs: number): number {
  return liveEvents(events, nowMs).filter((e) => e.actionable).length;
}

export interface ActivityFeedGroup<T extends ActivityEvent> {
  group: ActivityGroup;
  /** Lignes du groupe, plus récentes d'abord (tri INTERNE, pas global). */
  events: T[];
}

/**
 * Le flux ordonné : les groupes dans l'ORDRE FIXE de priorité, chacun trié par
 * récence en interne, et les groupes VIDES omis (jamais un en-tête au-dessus du
 * néant — « pas d'événement → groupe absent »).
 */
export function buildActivityFeed<T extends ActivityEvent>(
  events: readonly T[],
  nowMs: number,
): ActivityFeedGroup<T>[] {
  const live = liveEvents(events, nowMs);
  return ACTIVITY_GROUP_ORDER.map((group) => ({
    group,
    events: live
      .filter((e) => e.group === group)
      .sort((a, b) => b.createdAtMs - a.createdAtMs),
  })).filter((g) => g.events.length > 0);
}

/**
 * Âge relatif d'un événement, pour un « il y a … » honnête et localisable.
 * PUR et sans unité de langue : l'écran mappe l'unité + le nombre sur son
 * catalogue. `today` couvre les moins de 24 h (le flux est récent), puis les
 * jours, puis les semaines — au-delà, un événement n'a plus sa place dans un
 * flux d'activité.
 */
export type RelativeAge = { unit: 'today' } | { unit: 'day'; n: number } | { unit: 'week'; n: number };

export function relativeAge(ms: number, nowMs: number): RelativeAge {
  const dayMs = 24 * 3600 * 1000;
  const diff = Math.max(0, nowMs - ms);
  const days = Math.floor(diff / dayMs);
  if (days <= 0) return { unit: 'today' };
  if (days < 7) return { unit: 'day', n: days };
  return { unit: 'week', n: Math.floor(days / 7) };
}
