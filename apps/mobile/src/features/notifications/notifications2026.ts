/**
 * GRYD — LA POLITIQUE DE NOTIFICATION DU CAHIER §14, CÔTÉ CLIENT. Module PUR
 * (zéro React, zéro AsyncStorage, zéro réseau, zéro natif) : testable sous Deno.
 *
 * ─── CE QU'IL REMPLACE, ET POURQUOI (10/09/2026) ────────────────────────────
 * `notifPrefs.ts` modélisait CINQ catégories — défense, crew, rivalité,
 * progression, produit — dont deux gouvernaient des envois RÉELS : « ton
 * territoire va s'effacer » (`decay_job`) et « on t'a pris une zone »
 * (`steal_push_job`). Le cahier de septembre a aboli les deux mécaniques :
 *   · §5.3 — « il n'y a ni bouclier, ni contestation de 18 heures, ni défense
 *     achetable, ni dette de connexion » : rien ne s'efface, donc aucune alarme
 *     d'effacement ne peut être vraie ;
 *   · §14.2 — « une reprise de terrain par un rival alimente le journal du jeu
 *     et le résumé choisi, PAS une alarme immédiate ».
 * Deux interrupteurs décrivaient donc au joueur un jeu qui n'existe plus.
 *
 * ─── CE QU'IL MODÉLISE ──────────────────────────────────────────────────────
 * Les six catégories de §14.1 (sport · crew · événements suivis · résultats ·
 * résumé hebdomadaire · nouveautés/offres) plus « Pause du jeu », et le moteur
 * de décision de §14.3. La liste des catégories n'est pas recopiée ici : elle
 * vient de `NOTIFICATION_RULES_2026.categories` (@klaim/shared), qui est aussi
 * ce que la contrainte `check` de la migration 0140 recopie.
 *
 * ─── POURQUOI CE MOTEUR EXISTE EN DOUBLE (ici ET en SQL) ────────────────────
 * Ce n'est pas une duplication décorative. Les envois SERVEUR sont arbitrés par
 * `can_notify_2026` (migration 0141) ; les notifications LOCALES, elles, sont
 * programmées par CE téléphone, hors ligne, sans aucun aller-retour possible —
 * il leur faut donc la même porte, ici. Les deux implémentations sont tenues
 * par la même liste de cas (`notifications2026.test.ts` et
 * `supabase/tests/notifications_2026.pglite.test.mjs` rejouent les MÊMES
 * scénarios), et toutes deux dérivent leurs nombres de la même constante.
 */
import { NOTIFICATION_RULES_2026 } from '@klaim/shared';

// ─── §14.1 — les six catégories, plus « Pause du jeu » ───────────────────────

/** Les six catégories de réglage du cahier. Union DÉRIVÉE de la constante. */
export type NotificationCategory2026 = (typeof NOTIFICATION_RULES_2026.categories)[number];

export const NOTIFICATION_CATEGORIES_2026: readonly NotificationCategory2026[] =
  NOTIFICATION_RULES_2026.categories;

/**
 * L'état d'un compte. `gamePause` n'est PAS une septième catégorie : il coupe
 * les sollicitations de rétention (sport, résumé, offres) en CONSERVANT ce qui
 * touche au compte et aux événements déjà suivis — §14.1 mot pour mot.
 *
 * `quietStartHour`/`quietEndHour` sont dans l'état parce que le cahier le dit :
 * « l'utilisateur peut choisir d'autres horaires ou tout couper ». Le défaut,
 * lui, vient de la constante, jamais d'un nombre écrit ici.
 */
export interface NotificationSettings2026 {
  sport: boolean;
  crew: boolean;
  events: boolean;
  results: boolean;
  weekly: boolean;
  offers: boolean;
  gamePause: boolean;
  quietStartHour: number;
  quietEndHour: number;
}

/**
 * Défauts. Une seule valeur est EXIGÉE par le cahier : `offers` désactivée
 * (« promotion désactivée par défaut, avec consentement distinct »). Elle est
 * dérivée de `promotionalConsentDefault` pour qu'un changement de politique
 * n'ait qu'un seul endroit où se faire.
 */
export const DEFAULT_NOTIFICATION_SETTINGS_2026: NotificationSettings2026 = {
  sport: true,
  crew: true,
  events: true,
  results: true,
  weekly: true,
  offers: NOTIFICATION_RULES_2026.promotionalConsentDefault,
  gamePause: false,
  quietStartHour: NOTIFICATION_RULES_2026.quietHoursStart,
  quietEndHour: NOTIFICATION_RULES_2026.quietHoursEnd,
};

/**
 * Les catégories que « Pause du jeu » éteint. `crew`, `events` et `results` en
 * sont ABSENTES, et c'est le cœur du réglage : mettre le jeu en pause ne doit
 * pas faire rater un rendez-vous auquel on s'est inscrit, ni la réponse à sa
 * propre sortie. Une pause qui coupe ça n'est plus une pause, c'est un
 * désabonnement déguisé.
 */
export const PAUSED_BY_GAME_PAUSE_2026: readonly NotificationCategory2026[] = [
  'sport',
  'weekly',
  'offers',
];

// ─── Lecture tolérante d'un état venu du serveur ─────────────────────────────

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isHour = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 23;

/**
 * jsonb serveur → état. Chaque champ manquant ou d'un mauvais type retombe sur
 * SON défaut, jamais sur l'objet entier : une réponse partielle d'un serveur
 * plus ancien ne doit pas réinitialiser en silence un choix déjà fait.
 */
export function parseNotificationSettings2026(input: unknown): NotificationSettings2026 {
  if (input === null || typeof input !== 'object') return DEFAULT_NOTIFICATION_SETTINGS_2026;
  const o = input as Record<string, unknown>;
  const flag = (key: keyof NotificationSettings2026): boolean => {
    const raw = o[key];
    return isBool(raw) ? raw : (DEFAULT_NOTIFICATION_SETTINGS_2026[key] as boolean);
  };
  const hour = (key: 'quietStartHour' | 'quietEndHour'): number => {
    const raw = o[key];
    return isHour(raw) ? raw : DEFAULT_NOTIFICATION_SETTINGS_2026[key];
  };
  return {
    sport: flag('sport'),
    crew: flag('crew'),
    events: flag('events'),
    results: flag('results'),
    weekly: flag('weekly'),
    offers: flag('offers'),
    gamePause: flag('gamePause'),
    quietStartHour: hour('quietStartHour'),
    quietEndHour: hour('quietEndHour'),
  };
}

/** Patch partiel, PUR — dérive l'objet à écrire sans muter l'état d'origine. */
export function applyNotificationSettingsPatch2026(
  current: NotificationSettings2026,
  patch: Partial<NotificationSettings2026>,
): NotificationSettings2026 {
  return { ...current, ...patch };
}

// ─── §14.3 — le moteur de décision ───────────────────────────────────────────

/**
 * Une sollicitation déjà remise, telle qu'elle est journalisée
 * (`notification_log_2026` côté serveur, cache local côté client).
 */
export interface NotificationLogEntry2026 {
  eventId: string;
  category: NotificationCategory2026;
  /** Instant de remise (ms epoch). */
  atMs: number;
  /** Hors budget : incident de compte, événement annulé… (§14.1). */
  transactional: boolean;
}

export interface NotificationRequest2026 {
  category: NotificationCategory2026;
  /** Identifiant d'événement — c'est LUI qui empêche les doublons (§14.3). */
  eventId: string;
  atMs: number;
  /** Heure LOCALE du destinataire (0-23) au moment de `atMs`. */
  localHour: number;
  /** Transactionnel : sort du budget, JAMAIS de la déduplication (§14.1). */
  transactional?: boolean;
  /** §14.3 « activité en cours » : on n'interrompt pas quelqu'un qui court. */
  activityInProgress?: boolean;
  /** §14.3 « blocages » : l'auteur de l'événement est bloqué. */
  blocked?: boolean;
  /** §14.3 « événement toujours valide » : un rappel devenu faux est annulé. */
  eventStillValid?: boolean;
}

export type NotificationRefusal2026 =
  | 'category_off'
  | 'game_paused'
  | 'quiet_hours'
  | 'daily_budget'
  | 'weekly_budget'
  | 'monthly_offer_budget'
  | 'duplicate'
  | 'activity_in_progress'
  | 'blocked'
  | 'event_invalid';

export type NotificationDecision2026 =
  | { allowed: true }
  | { allowed: false; reason: NotificationRefusal2026 };

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * La plage calme est un INTERVALLE CIRCULAIRE : 21 h → 9 h enjambe minuit.
 * `start` pile est déjà silencieux, `end` pile est de nouveau autorisé — même
 * convention que `_shared/push.ts#canPush`, pour que les deux moteurs refusent
 * exactement les mêmes minutes.
 *
 * `start === end` ne veut pas dire « 24 h de silence » mais « aucune plage
 * calme » : c'est la seule lecture qui laisse quelqu'un tout ouvrir, et une
 * plage de 24 h se dit déjà en coupant les catégories.
 */
export function inQuietHours2026(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/**
 * §14.3, dans l'ordre où le cahier énonce les portes : « événement toujours
 * valide, audience autorisée, préférence de canal, budget, heure locale,
 * activité en cours, blocages, message déjà vu ».
 *
 * L'ordre COMPTE parce que la raison rendue est affichée et journalisée : dire
 * « budget » à propos d'un message que le joueur a explicitement coupé serait
 * une explication fausse.
 *
 * @param log sollicitations déjà remises à CE destinataire, toutes catégories.
 */
export function canNotify2026(
  settings: NotificationSettings2026,
  request: NotificationRequest2026,
  log: readonly NotificationLogEntry2026[],
): NotificationDecision2026 {
  if (request.eventStillValid === false) return { allowed: false, reason: 'event_invalid' };
  if (request.blocked === true) return { allowed: false, reason: 'blocked' };

  // Déjà vu : un identifiant d'événement empêche les doublons, y compris pour
  // un message transactionnel (le cahier les regroupe et les déduplique aussi).
  if (log.some((e) => e.eventId === request.eventId)) {
    return { allowed: false, reason: 'duplicate' };
  }

  if (!settings[request.category]) return { allowed: false, reason: 'category_off' };
  if (settings.gamePause && PAUSED_BY_GAME_PAUSE_2026.includes(request.category)) {
    return { allowed: false, reason: 'game_paused' };
  }

  // Transactionnel : hors budget, hors plage calme, hors « activité en cours ».
  // « Les informations transactionnelles demandées […] peuvent sortir de ce
  // budget » (§14.1) — un événement annulé ce soir ne se retient pas jusqu'à 9 h.
  if (request.transactional === true) return { allowed: true };

  if (request.activityInProgress === true) {
    return { allowed: false, reason: 'activity_in_progress' };
  }
  if (inQuietHours2026(request.localHour, settings.quietStartHour, settings.quietEndHour)) {
    return { allowed: false, reason: 'quiet_hours' };
  }

  const budgeted = log.filter((e) => !e.transactional);
  const sinceDay = budgeted.filter((e) => request.atMs - e.atMs < DAY_MS).length;
  if (sinceDay >= NOTIFICATION_RULES_2026.maximumNonTransactionalPerDay) {
    return { allowed: false, reason: 'daily_budget' };
  }
  const sinceWeek = budgeted.filter((e) => request.atMs - e.atMs < 7 * DAY_MS).length;
  if (sinceWeek >= NOTIFICATION_RULES_2026.maximumNonTransactionalPerWeek) {
    return { allowed: false, reason: 'weekly_budget' };
  }
  if (request.category === 'offers') {
    const offers = budgeted.filter(
      (e) => e.category === 'offers' && request.atMs - e.atMs < 30 * DAY_MS,
    ).length;
    if (offers >= NOTIFICATION_RULES_2026.maximumOffersPerMonth) {
      return { allowed: false, reason: 'monthly_offer_budget' };
    }
  }
  return { allowed: true };
}

// ─── Le miroir serveur des canaux HÉRITÉS (`push_devices.notif_channels`) ────

/** Contrainte SQL 0048/0059 recopiée : `notif_channels <@ {solo,crew,competition,off}`. */
export type WireNotifChannel = 'solo' | 'crew' | 'competition' | 'off';

/**
 * Les préférences 2026 → l'ancienne colonne de canaux.
 *
 * DÉLIBÉRÉMENT AMPUTÉ : `solo` était le canal de l'alarme d'effacement et
 * `competition` celui de l'alarme de vol. Les deux mécaniques sont abolies
 * (§5.3, §14.2) et leurs jobs refusent désormais de tourner. Les émettre encore
 * ferait croire au serveur qu'un joueur les a demandées.
 *
 * Il ne reste donc que `crew`, et `['off']` quand la catégorie est coupée —
 * jamais un tableau vide : c'est la valeur que `syncPushPreferences` sait déjà
 * interpréter comme « désenregistre cet appareil ».
 *
 * ⚠️ AUCUN JOB NE LIT PLUS CETTE COLONNE AUJOURD'HUI (`digest_job` est neutralisé
 * comme les deux autres). Cette fonction n'a donc de sens que le jour où un
 * build retrouvera la capacité push ET où un envoi crew existera. D'ici là,
 * `registerPushDevice` sort AVANT de l'utiliser (`remotePushCapability`) : elle
 * n'est pas un réglage qui dort, elle est un mapping qui n'est pas atteint.
 */
export function notifChannels2026(settings: NotificationSettings2026): WireNotifChannel[] {
  return settings.crew && !settings.gamePause ? ['crew'] : ['off'];
}
