/**
 * GRYD — digest_job/logic.ts (SPEC §4.3, GRYD_notifications_logic.md §3/§6).
 *
 * Fonctions PURES :
 *   - canPush : garde-fous push — quiet hours 21h-8h (heure LOCALE du joueur,
 *     défaut Europe/Paris) + cap PUSH_MAX_PER_DAY tous types confondus.
 *   - buildDigest : regroupe les petits événements en UN résumé
 *     (« Résumé GRYD — 3 zones défendues, 1 zone perdue… », doc notifs §6).
 */
import {
  PUSH_MAX_PER_DAY,
  PUSH_QUIET_HOURS_END,
  PUSH_QUIET_HOURS_START,
} from '../_shared/game-rules.ts';

const DEFAULT_TIME_ZONE = 'Europe/Paris'; // Saison 0 : Paris + Lille

export interface PushUser {
  id: string;
  /** IANA — préférence utilisateur quand elle existera (settings V1). */
  timeZone?: string;
}

export type PushBlockReason = 'quiet_hours' | 'daily_cap';

export interface CanPushResult {
  allowed: boolean;
  reason?: PushBlockReason;
}

/** Heure locale + jour local (YYYY-MM-DD) d'un instant, sans réseau. */
function localParts(at: Date, timeZone: string): { hour: number; day: string } {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  // hour12:false peut rendre '24' pour minuit selon les runtimes → normalise.
  const hour = Number(get('hour')) % 24;
  return { hour, day: `${get('year')}-${get('month')}-${get('day')}` };
}

/**
 * Un push est-il envoyable maintenant ?
 * @param pushLog dates d'envoi récentes du joueur (push_log.sent_at) — seules
 * celles du même jour LOCAL que `now` comptent pour le cap.
 */
export function canPush(user: PushUser, now: Date, pushLog: readonly Date[]): CanPushResult {
  const tz = user.timeZone ?? DEFAULT_TIME_ZONE;
  const { hour, day } = localParts(now, tz);

  // Quiet hours 21h-8h (§4.3) : [21h; minuit[ ∪ [minuit; 8h[ — 21:00 pile est
  // déjà silencieux, 8:00 pile est de nouveau autorisé.
  if (hour >= PUSH_QUIET_HOURS_START || hour < PUSH_QUIET_HOURS_END) {
    return { allowed: false, reason: 'quiet_hours' };
  }

  const sentToday = pushLog.filter((d) => localParts(d, tz).day === day).length;
  if (sentToday >= PUSH_MAX_PER_DAY) {
    return { allowed: false, reason: 'daily_cap' };
  }

  return { allowed: true };
}

// ─── Digest (doc notifs §6) ──────────────────────────────────────────────────

/** Petits événements agrégeables — jamais poussés un par un. */
export type DigestEventType =
  | 'hexes_gained'
  | 'hexes_defended'
  | 'hexes_lost'
  | 'zones_defended'
  | 'zones_lost'
  | 'badges_unlocked'
  | 'crew_runs';

export interface DigestEvent {
  type: DigestEventType;
  count: number;
}

export interface Digest {
  title: string;
  body: string;
  /** Nombre d'événements agrégés (analytics `digest_sent`). */
  itemCount: number;
}

/** Libellés fr : [singulier, pluriel] — le compte est préfixé. */
const LABELS: Record<DigestEventType, [string, string]> = {
  hexes_gained: ['hex gagné', 'hexes gagnés'],
  hexes_defended: ['hex défendu', 'hexes défendus'],
  hexes_lost: ['hex perdu', 'hexes perdus'],
  zones_defended: ['zone défendue', 'zones défendues'],
  zones_lost: ['zone perdue', 'zones perdues'],
  badges_unlocked: ['badge débloqué', 'badges débloqués'],
  crew_runs: ['course du crew', 'courses du crew'],
};

/** Ordre d'affichage stable (le positif d'abord, le crew en dernier). */
const DISPLAY_ORDER: readonly DigestEventType[] = [
  'hexes_gained',
  'hexes_defended',
  'zones_defended',
  'hexes_lost',
  'zones_lost',
  'badges_unlocked',
  'crew_runs',
];

/**
 * Groupe les événements en un résumé unique. null = rien à dire, PAS de digest
 * (« rares, utiles, actionnables » — on n'envoie jamais un résumé vide).
 */
export function buildDigest(
  events: readonly DigestEvent[],
  scope: 'crew' | 'weekly',
): Digest | null {
  // Fusion des doublons par type, comptes <= 0 ignorés.
  const totals = new Map<DigestEventType, number>();
  for (const e of events) {
    if (e.count <= 0) continue;
    totals.set(e.type, (totals.get(e.type) ?? 0) + e.count);
  }
  if (totals.size === 0) return null;

  const parts: string[] = [];
  for (const type of DISPLAY_ORDER) {
    const count = totals.get(type);
    if (!count) continue;
    const [singular, plural] = LABELS[type];
    const label = count === 1 ? singular : plural;
    parts.push(type === 'hexes_gained' ? `+${count} ${label}` : `${count} ${label}`);
  }

  return {
    title: scope === 'weekly' ? 'Résumé GRYD de la semaine' : 'Résumé GRYD du crew',
    body: `${parts.join(', ')}.`,
    itemCount: parts.length,
  };
}
