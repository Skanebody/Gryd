/**
 * GRYD — FORME ET FENÊTRE DU JOURNAL LOCAL DES SOLLICITATIONS. Module PUR.
 *
 * Il vit séparé de `localNotificationLog.ts` pour la même raison que
 * `pushStatus.ts` vit séparé de `push.ts` : Deno type-vérifie le FICHIER
 * entier, et `@react-native-async-storage` n'y est pas vérifiable. Importer
 * l'I/O depuis un test suffirait à rendre la règle intestable — alors la règle
 * descend ici, sans une seule dépendance native.
 */
import {
  NOTIFICATION_CATEGORIES_2026,
  type NotificationCategory2026,
  type NotificationLogEntry2026,
} from './notifications2026';

/** La plus longue fenêtre du cahier : celle des offres (2 par mois, §14.1). */
export const NOTIFICATION_LOG_WINDOW_MS = 30 * 24 * 3_600_000;

const isCategory = (v: unknown): v is NotificationCategory2026 =>
  typeof v === 'string' && (NOTIFICATION_CATEGORIES_2026 as readonly string[]).includes(v);

/** Lecture tolérante : une entrée illisible est écartée, jamais tout le journal. */
export function parseNotificationLog2026(raw: string | null): NotificationLogEntry2026[] {
  if (raw === null || raw.length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: NotificationLogEntry2026[] = [];
  for (const item of parsed) {
    if (item === null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.eventId !== 'string' || !isCategory(o.category)) continue;
    if (typeof o.atMs !== 'number' || !Number.isFinite(o.atMs)) continue;
    out.push({
      eventId: o.eventId,
      category: o.category,
      atMs: o.atMs,
      transactional: o.transactional === true,
    });
  }
  return out;
}

/** Écarte ce qui est sorti de la fenêtre. PURE. */
export function pruneNotificationLog2026(
  entries: readonly NotificationLogEntry2026[],
  nowMs: number,
): NotificationLogEntry2026[] {
  return entries.filter((e) => nowMs - e.atMs < NOTIFICATION_LOG_WINDOW_MS);
}
