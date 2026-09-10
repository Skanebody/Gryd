/**
 * GRYD — LE CENTRE DE NOTIFICATIONS, PARTIE PURE (§14.2, §14.3).
 *
 * Aucune I/O, aucun React : la lecture de `my_notifications_2026` se parse ici,
 * les faits se rendent ici, et le groupement par jour se calcule ici. C'est ce
 * qui rend l'écran testable en Deno sans monter React Native.
 *
 * ─── CE QUE LE SERVEUR ENVOIE, ET CE QUE L'APP EN FAIT ──────────────────────
 * Une ligne porte un FAIT (`kind`), son EMOJI (décidé serveur, jamais traduit)
 * et ses PARAMÈTRES. Le titre et le corps sont dits ici, dans la langue du
 * lecteur, depuis `i18n/catalog/notifications`. Les lignes d'AVANT ce lot
 * (`digest`, `season`… écrites par les jobs Edge) n'ont pas de fait : elles
 * portent leur propre texte figé, et il est rendu tel quel plutôt que caché.
 *
 * ─── UN PARAMÈTRE MANQUANT NE FAIT JAMAIS UNE PHRASE À TROU ────────────────
 * Un crew supprimé laisse `crewName` absent. Le rendu retombe alors sur
 * « ton crew » plutôt que d'écrire « Tu as rejoint  ». Le message reste vrai ;
 * il est seulement moins précis.
 *
 * ─── LE LIEN EST VÉRIFIÉ AVANT D'ÊTRE PROPOSÉ ──────────────────────────────
 * Le serveur rend `deepLink` déjà résolu, ou `null` quand un paramètre lui
 * manquait. Ici on refuse en plus tout ce qui ne commence pas par `/` : une
 * ligne ne doit jamais pouvoir emmener ailleurs que dans l'application. Sans
 * lien, la ligne n'est pas pressable — pas de bouton mort.
 */
import { NOTIFICATION_INBOX_2026, type NotificationKind2026 } from '@klaim/shared';
import { format, resolve, type Locale } from '../../i18n/types';
import { C, FAITS } from '../../i18n/catalog/notifications';

/** L'état de lecture, jamais replié : quatre causes, quatre phrases. */
export type NotificationCenterStatus2026 =
  | 'loading' | 'signed-out' | 'unavailable' | 'failed' | 'ready';

export interface NotificationItem2026 {
  id: string;
  /** `null` = ligne d'avant ce lot : elle porte son propre texte. */
  kind: NotificationKind2026 | null;
  family: string;
  emoji: string;
  /** Route de l'application (`/course/…`), ou `null` : rien à ouvrir. */
  deepLink: string | null;
  params: Readonly<Record<string, string>>;
  /** Rempli SEULEMENT pour une ligne d'avant ce lot. */
  legacyTitle: string | null;
  legacyBody: string | null;
  createdAtMs: number;
  readAtMs: number | null;
}

export interface NotificationPage2026 {
  unread: number;
  items: readonly NotificationItem2026[];
  hasMore: boolean;
}

const FAIT_KEYS = Object.keys(FAITS) as readonly NotificationKind2026[];
/** Les faits que l'application sait dire. Un fait inconnu ne s'affiche pas. */
export const NOTIFICATION_KINDS_WITH_COPY_2026: readonly NotificationKind2026[] = FAIT_KEYS;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asText = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null;

/** Un lien n'est accepté que s'il reste DANS l'application. */
export function safeDeepLink2026(value: unknown): string | null {
  const link = asText(value);
  if (link === null || !link.startsWith('/') || link.startsWith('//')) return null;
  // Un modèle non résolu (`/course/{runId}`) n'ouvrirait rien : on le refuse ici
  // aussi, même si le serveur promet de ne jamais en envoyer.
  return link.includes('{') ? null : link;
}

function parseItem(input: unknown): NotificationItem2026 | null {
  if (!isRecord(input)) return null;
  const id = asText(input.id);
  const createdAt = asText(input.createdAt);
  const createdAtMs = createdAt === null ? Number.NaN : Date.parse(createdAt);
  if (id === null || !Number.isFinite(createdAtMs)) return null;

  const rawKind = asText(input.kind);
  const kind = rawKind !== null && (FAIT_KEYS as readonly string[]).includes(rawKind)
    ? (rawKind as NotificationKind2026)
    : null;
  const legacyTitle = kind === null ? asText(input.title) : null;
  // Ni fait connu, ni texte figé : l'application n'a rien à dire de cette ligne.
  // La montrer vide serait pire que ne pas la montrer.
  if (kind === null && legacyTitle === null) return null;

  const params: Record<string, string> = {};
  if (isRecord(input.params)) {
    for (const [key, value] of Object.entries(input.params)) {
      if (typeof value === 'string') params[key] = value;
      else if (typeof value === 'number' && Number.isFinite(value)) params[key] = String(value);
    }
  }
  const readAt = asText(input.readAt);
  const readAtMs = readAt === null ? null : Date.parse(readAt);

  return {
    id,
    kind,
    family: asText(input.family) ?? 'system',
    emoji: asText(input.emoji) ?? 'ℹ️',
    deepLink: safeDeepLink2026(input.deepLink),
    params,
    legacyTitle,
    legacyBody: kind === null ? asText(input.body) : null,
    createdAtMs,
    readAtMs: readAtMs === null || !Number.isFinite(readAtMs) ? null : readAtMs,
  };
}

/** `null` = la réponse n'est pas une page (hors session, ou illisible). */
export function parseNotificationPage2026(input: unknown): NotificationPage2026 | null {
  if (!isRecord(input) || input.hasAccount !== true) return null;
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems.map(parseItem).filter((i): i is NotificationItem2026 => i !== null);
  const unread = typeof input.unread === 'number' && Number.isFinite(input.unread)
    ? Math.max(0, Math.trunc(input.unread))
    : items.filter((i) => i.readAtMs === null).length;
  return { unread, items, hasMore: input.hasMore === true };
}

/** Le texte affiché d'une ligne. `body` peut être `null` : beaucoup le sont. */
export function renderNotification2026(
  item: NotificationItem2026,
  locale: Locale,
): { emoji: string; title: string; body: string | null } {
  if (item.kind === null) {
    return { emoji: item.emoji, title: item.legacyTitle ?? '', body: item.legacyBody };
  }
  const fait = FAITS[item.kind];
  const vars = {
    ...item.params,
    crew: item.params.crewName ?? resolve(C.crewDefaut, locale),
    handle: item.params.handle ?? resolve(C.handleDefaut, locale),
  };
  return {
    emoji: item.emoji,
    title: format(fait.titre, vars, locale),
    body: fait.corps === null ? null : format(fait.corps, vars, locale),
  };
}

/** La clé de JOUR local d'un instant. `2026-09-11`, dans le fuseau du lecteur. */
export function dayKey2026(ms: number): string {
  const d = new Date(ms);
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

export interface NotificationDay2026 {
  key: string;
  /** `today` / `yesterday` / `date` : l'écran choisit le libellé, pas ce module. */
  label: 'today' | 'yesterday' | 'date';
  items: readonly NotificationItem2026[];
}

/**
 * Les lignes groupées par jour, du plus récent au plus ancien. L'ordre à
 * l'intérieur d'un jour est celui du serveur (récent d'abord) : on ne retrie
 * pas, sans quoi deux lignes du même instant danseraient d'un rendu à l'autre.
 */
export function groupNotificationsByDay2026(
  items: readonly NotificationItem2026[],
  nowMs: number,
): readonly NotificationDay2026[] {
  const aujourdhui = dayKey2026(nowMs);
  const hier = dayKey2026(nowMs - 86_400_000);
  const ordre: string[] = [];
  const parJour = new Map<string, NotificationItem2026[]>();
  for (const item of items) {
    const key = dayKey2026(item.createdAtMs);
    const bucket = parJour.get(key);
    if (bucket === undefined) { parJour.set(key, [item]); ordre.push(key); }
    else bucket.push(item);
  }
  return ordre.map((key) => ({
    key,
    label: key === aujourdhui ? 'today' : key === hier ? 'yesterday' : 'date',
    items: parJour.get(key) ?? [],
  }));
}

/**
 * Le nombre de la cloche. `0` rend `null` : une pastille permanente est
 * interdite (G24, §14 « pas de pastille rouge permanente »), et « 0 » nu est
 * exactement le mensonge que L14 refuse.
 */
export function unreadBadge2026(unread: number): string | null {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  const max = NOTIFICATION_INBOX_2026.unreadBadgeMaximum;
  return unread > max ? `${max}+` : String(Math.trunc(unread));
}

/**
 * Faut-il relire ? Le centre relit à l'ouverture et au retour au premier plan,
 * jamais en boucle : `refreshMinimumIntervalMs` borne la cadence. Un centre
 * d'activité qui sonde le serveur toutes les cinq secondes vide la batterie
 * pour une nouvelle qui n'arrive pas.
 */
export function shouldRefresh2026(lastReadMs: number | null, nowMs: number): boolean {
  if (lastReadMs === null) return true;
  return nowMs - lastReadMs >= NOTIFICATION_INBOX_2026.refreshMinimumIntervalMs;
}

/**
 * Le libellé d'un jour ancien, sans `Intl`. Hermes n'embarque pas toujours les
 * données de locale sur Android, et un `toLocaleDateString` qui retombe en
 * silence sur l'anglais afficherait une date que le lecteur ne reconnaît pas.
 * Deux ordres suffisent : mois d'abord en anglais, jour d'abord ailleurs.
 */
export function formatDayLabel2026(key: string, locale: Locale): string {
  const [annee, mois, jour] = key.split('-');
  if (annee === undefined || mois === undefined || jour === undefined) return key;
  return locale === 'en' ? `${mois}/${jour}/${annee}` : `${jour}/${mois}/${annee}`;
}
