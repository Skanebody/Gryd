/**
 * GRYD — décision d'envoi push (PUR, testable sans réseau).
 *
 * PÉRIMÈTRE 3 — boucle de retour asynchrone. Ce module répond à UNE question :
 * « ce joueur doit-il recevoir ce push, maintenant, sur quels appareils, et
 * avec quel texte ? ». Il ne parle jamais au réseau (voir ./expo-push.ts) et
 * ne lit jamais la base (les rangées lui sont passées).
 *
 * DOCTRINE APPLIQUÉE (GRYD_notifications_logic.md §3/§5/§6) :
 *   • uniquement de l'ACTIONNABLE — un decay se défend en repassant dessus ;
 *   • jamais une notification par hex ni par course : decay_job groupe déjà en
 *     UNE alerte par joueur, on n'en fabrique pas d'autre ;
 *   • quiet hours 21h-8h dans l'heure LOCALE RÉELLE de l'appareil ;
 *   • cap PUSH_MAX_PER_DAY tous types confondus, compté PAR JOUEUR (deux
 *     téléphones = une seule notification, pas deux) ;
 *   • préférences d'abord : un canal désactivé coupe l'envoi, `off` coupe tout.
 *
 * COPIE : dire ce qui se passe + ce qu'on peut y faire. Jamais « tu vas tout
 * perdre », jamais de compte à rebours anxiogène, jamais de reproche (§5).
 */
import {
  DECAY_WARNING_DAYS_BEFORE,
  PUSH_MAX_PER_DAY,
  PUSH_QUIET_HOURS_END,
  PUSH_QUIET_HOURS_START,
} from './game-rules.ts';

const MS_PER_DAY = 86_400_000;
const DEFAULT_TIME_ZONE = 'Europe/Paris'; // Saison 0 : Paris + Lille

// ─── Quiet hours + cap journalier (§4.3) ─────────────────────────────────────

export interface PushUser {
  id: string;
  /** IANA — celui de l'appareil (push_devices.time_zone) quand il est connu. */
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
  const tz = safeTimeZone(user.timeZone);
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

/**
 * Un fuseau invalide (appareil exotique, valeur héritée) ferait LEVER
 * Intl.DateTimeFormat et ferait tomber tout le job. On retombe sur le défaut :
 * un push envoyé une heure à côté vaut mieux qu'un cron mort.
 */
function safeTimeZone(tz: string | undefined): string {
  if (!tz) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

// ─── Appareils + préférences ─────────────────────────────────────────────────

export const PUSH_LOCALES = ['fr', 'en', 'es', 'de', 'pt'] as const;
export type PushLocale = (typeof PUSH_LOCALES)[number];

/** Canaux miroir de MotivationPrefs.notifChannels (mobile). */
export type NotifChannel = 'solo' | 'crew' | 'competition' | 'off';

/** Une ligne push_devices, telle que le job la lit. */
export interface PushDevice {
  userId: string;
  expoToken: string;
  locale: PushLocale;
  timeZone: string;
  channels: readonly NotifChannel[];
}

/**
 * Le joueur veut-il ce canal ? `off` est exclusif (il coupe tout), une liste
 * vide vaut silence : l'absence de préférence explicite n'autorise rien.
 */
export function channelEnabled(
  channels: readonly NotifChannel[],
  channel: Exclude<NotifChannel, 'off'>,
): boolean {
  if (channels.includes('off')) return false;
  return channels.includes(channel);
}

// ─── Message ─────────────────────────────────────────────────────────────────

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  /** Expo : 'default' — jamais 'high', un decay n'est pas une urgence. */
  priority: 'default';
}

/**
 * Textes du push decay, 5 langues (parité imposée par le type `Record`).
 * `{n}` = nombre de zones, `{d}` = jours restants avant la plus proche.
 * Structure volontaire : CE QUI SE PASSE, puis CE QUI LE RÈGLE. Aucune phrase
 * ne dit au joueur qu'il a mal fait.
 */
const DECAY_COPY: Readonly<
  Record<PushLocale, { title: string; one: string; many: string }>
> = {
  fr: {
    title: 'Ton territoire s’efface bientôt',
    one: '1 zone redevient neutre dans {d} j. Une course dessus la garde.',
    many: '{n} zones redeviennent neutres dans {d} j. Une course dessus les garde.',
  },
  en: {
    title: 'Your turf is fading soon',
    one: '1 zone turns neutral in {d} d. A run across it keeps it.',
    many: '{n} zones turn neutral in {d} d. A run across them keeps them.',
  },
  es: {
    title: 'Tu territorio se borra pronto',
    one: '1 zona vuelve a ser neutral en {d} d. Una carrera por encima la conserva.',
    many: '{n} zonas vuelven a ser neutrales en {d} d. Una carrera por encima las conserva.',
  },
  de: {
    title: 'Dein Gebiet verblasst bald',
    one: '1 Zone wird in {d} T. wieder neutral. Ein Lauf darüber behält sie.',
    many: '{n} Zonen werden in {d} T. wieder neutral. Ein Lauf darüber behält sie.',
  },
  pt: {
    title: 'Seu território vai sumir em breve',
    one: '1 zona volta a ser neutra em {d} d. Uma corrida por cima mantém ela.',
    many: '{n} zonas voltam a ser neutras em {d} d. Uma corrida por cima mantém elas.',
  },
};

/**
 * Jours restants AFFICHÉS : arrondi au jour supérieur, borné à [1 ;
 * DECAY_WARNING_DAYS_BEFORE]. Le plancher à 1 évite « dans 0 j » (qui ne dit
 * rien d'actionnable) ; le plafond évite d'annoncer plus que la fenêtre réelle
 * si le cron a pris du retard.
 */
export function daysUntilDecay(earliestDecayAt: Date, now: Date): number {
  const raw = Math.ceil((earliestDecayAt.getTime() - now.getTime()) / MS_PER_DAY);
  return Math.min(DECAY_WARNING_DAYS_BEFORE, Math.max(1, raw));
}

export function buildDecayPush(
  device: PushDevice,
  hexCount: number,
  earliestDecayAt: Date,
  now: Date,
): PushMessage {
  const copy = DECAY_COPY[device.locale] ?? DECAY_COPY.fr;
  const days = daysUntilDecay(earliestDecayAt, now);
  const template = hexCount === 1 ? copy.one : copy.many;
  return {
    to: device.expoToken,
    title: copy.title,
    body: template.split('{n}').join(String(hexCount)).split('{d}').join(String(days)),
    // Le tap ouvre la carte sur ce qui s'efface — une notification sans action
    // est du spam (§5). `hexIds` reste côté serveur : le payload est minimal.
    data: { type: 'decay_warning', cta: 'defend', hexCount },
    priority: 'default',
  };
}

// ─── Sélection ───────────────────────────────────────────────────────────────

/** Ce que decay_job sait d'un joueur à avertir (miroir de DecayWarning). */
export interface DecayTarget {
  userId: string;
  hexCount: number;
  earliestDecayAt: Date;
}

export type SuppressReason = PushBlockReason | 'no_device' | 'channel_off';

export interface PushPlan {
  /** Un envoi = un joueur (1..n appareils), compté UNE fois dans push_log. */
  sends: readonly { userId: string; messages: readonly PushMessage[] }[];
  /** Traçable en analytics `push_suppressed` — jamais silencieux. */
  suppressed: readonly { userId: string; reason: SuppressReason }[];
}

/**
 * Décide qui reçoit le push decay. Le canal exigé est `solo` : le decay
 * concerne le territoire du joueur lui-même, pas son crew ni un classement.
 *
 * Un joueur dont AUCUN appareil n'accepte `solo` n'est pas poussé — mais sa
 * notification d'inbox a déjà été créée par decay_job : couper le push ne fait
 * jamais disparaître l'information.
 */
export function planDecayPushes(
  targets: readonly DecayTarget[],
  devicesByUser: ReadonlyMap<string, readonly PushDevice[]>,
  pushLogByUser: ReadonlyMap<string, readonly Date[]>,
  now: Date,
): PushPlan {
  const sends: { userId: string; messages: PushMessage[] }[] = [];
  const suppressed: { userId: string; reason: SuppressReason }[] = [];

  for (const target of targets) {
    const devices = devicesByUser.get(target.userId) ?? [];
    if (devices.length === 0) {
      suppressed.push({ userId: target.userId, reason: 'no_device' });
      continue;
    }

    const opted = devices.filter((d) => channelEnabled(d.channels, 'solo'));
    if (opted.length === 0) {
      suppressed.push({ userId: target.userId, reason: 'channel_off' });
      continue;
    }

    // Quiet hours : évaluées sur le fuseau du premier appareil opté (le joueur
    // n'a qu'une nuit, même avec deux téléphones). Le cap, lui, est par joueur.
    const gate = canPush(
      { id: target.userId, timeZone: opted[0].timeZone },
      now,
      pushLogByUser.get(target.userId) ?? [],
    );
    if (!gate.allowed) {
      suppressed.push({ userId: target.userId, reason: gate.reason ?? 'daily_cap' });
      continue;
    }

    sends.push({
      userId: target.userId,
      messages: opted.map((d) => buildDecayPush(d, target.hexCount, target.earliestDecayAt, now)),
    });
  }

  return { sends, suppressed };
}
