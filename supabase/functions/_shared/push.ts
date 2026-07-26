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
  type Activity,
  DECAY_WARNING_DAYS_BEFORE,
  PUSH_MAX_PER_DAY,
  PUSH_QUIET_HOURS_END,
  PUSH_QUIET_HOURS_START,
  STEAL_PUSH_COOLDOWN_MINUTES,
  STEAL_PUSH_MIN_HEXES,
} from './game-rules.ts';

const MS_PER_DAY = 86_400_000;
const MS_PER_MINUTE = 60_000;
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

/** Un couple singulier/pluriel. Le nombre décide, jamais l'appelant. */
interface Plural {
  one: string;
  many: string;
}

/**
 * Textes du push decay, 5 langues (parité imposée par le type `Record`).
 *
 * ═══ POURQUOI CETTE FORME A CHANGÉ (26/07/2026) ═════════════════════════════
 * L'ancienne version n'avait QU'UNE phrase par langue : « {n} zones
 * redeviennent neutres dans {d} j. Une course dessus les garde. » Deux fautes
 * y étaient enfermées, et `decay_job` avait choisi — à raison — de ne PAS
 * pousser plutôt que de les commettre :
 *   · elle prescrivait UNE COURSE à un cycliste. Repasser à pied sur une zone
 *     vélo n'en défend rien (le territoire est séparé depuis 0070) : c'était
 *     envoyer quelqu'un courir pour rien ;
 *   · pour un joueur menacé dans les DEUX mondes, son `{n}` unique aurait été
 *     la somme que E14 interdit (« jamais Run + Bike… JAMAIS sommées »).
 * Le résultat de ce refus était juste mais coûteux : la moitié du jeu perdait
 * son territoire sans le moindre avertissement sur son téléphone. On écrit
 * donc la copie qui manquait, au lieu de continuer à se taire.
 *
 * ═══ LA STRUCTURE, ET CE QU'ELLE INTERDIT ═══════════════════════════════════
 * `count` (fragment « {n} zones à vélo ») est SÉPARÉ de `single` (la phrase) et
 * de `save` (l'action). Ce découpage n'est pas de l'élégance : c'est ce qui
 * rend le cas MIXTE énonçable sans addition. Les fragments se juxtaposent
 * (« 3 zones à pied et 2 zones à vélo »), ils ne se cumulent jamais en un
 * total. Et parce que la liste se construit en bouclant sur `perActivity`,
 * une TROISIÈME discipline un jour n'exigerait aucune phrase de plus.
 *
 * Placeholders : `{n}` nombre de zones, `{c}` fragment de compte déjà rendu,
 * `{d}` jours restants, `{save}` l'action qui sauve, `{list}` les mondes
 * juxtaposés. Structure de chaque phrase : CE QUI SE PASSE, puis CE QUI LE
 * RÈGLE. Aucune ne dit au joueur qu'il a mal fait.
 */
interface DecayLocaleCopy {
  title: string;
  /** Fragment de compte PAR MONDE — « 1 zone à vélo » / « {n} zones à vélo ». */
  count: Readonly<Record<Activity, Plural>>;
  /** Phrase à UN SEUL monde menacé : `{c}`, `{d}`, `{save}`. */
  single: Plural;
  /**
   * L'action qui SAUVE la zone, PAR MONDE. C'est le cœur du correctif : une
   * course ne défend pas un territoire vélo, et l'inverse est vrai aussi.
   */
  save: Readonly<Record<Activity, Plural>>;
  /** Liaison de la liste mixte (espaces compris — ils diffèrent d'une langue à l'autre). */
  and: string;
  /**
   * Phrase à PLUSIEURS mondes : `{list}`, `{d}`. Le délai y est celui de la
   * PREMIÈRE échéance et se dit « au plus tôt » — sans quoi le joueur croirait
   * que tout part le même jour. Elle ne porte aucun total, et renvoie chaque
   * monde à sa propre discipline plutôt que d'y prescrire une action unique.
   */
  mixed: string;
}

const DECAY_COPY: Readonly<Record<PushLocale, DecayLocaleCopy>> = {
  fr: {
    title: 'Ton territoire s’efface bientôt',
    count: {
      run: { one: '1 zone à pied', many: '{n} zones à pied' },
      bike: { one: '1 zone à vélo', many: '{n} zones à vélo' },
    },
    single: {
      one: '{c} redevient neutre dans {d} j. {save}',
      many: '{c} redeviennent neutres dans {d} j. {save}',
    },
    save: {
      run: { one: 'Une course dessus la garde.', many: 'Une course dessus les garde.' },
      bike: {
        one: 'Une sortie vélo dessus la garde.',
        many: 'Une sortie vélo dessus les garde.',
      },
    },
    and: ' et ',
    mixed: '{list} redeviennent neutres dans {d} j au plus tôt. ' +
      'Chaque monde se défend dans sa discipline.',
  },
  en: {
    title: 'Your turf is fading soon',
    count: {
      run: { one: '1 running zone', many: '{n} running zones' },
      bike: { one: '1 cycling zone', many: '{n} cycling zones' },
    },
    single: {
      one: '{c} turns neutral in {d} d. {save}',
      many: '{c} turn neutral in {d} d. {save}',
    },
    save: {
      run: { one: 'A run across it keeps it.', many: 'A run across them keeps them.' },
      bike: { one: 'A ride across it keeps it.', many: 'A ride across them keeps them.' },
    },
    and: ' and ',
    mixed: '{list} turn neutral in {d} d at the earliest. ' +
      'Each world is defended in its own discipline.',
  },
  es: {
    title: 'Tu territorio se borra pronto',
    count: {
      run: { one: '1 zona a pie', many: '{n} zonas a pie' },
      bike: { one: '1 zona en bici', many: '{n} zonas en bici' },
    },
    single: {
      one: '{c} vuelve a ser neutral en {d} d. {save}',
      many: '{c} vuelven a ser neutrales en {d} d. {save}',
    },
    save: {
      run: {
        one: 'Una carrera por encima la conserva.',
        many: 'Una carrera por encima las conserva.',
      },
      bike: {
        one: 'Una salida en bici por encima la conserva.',
        many: 'Una salida en bici por encima las conserva.',
      },
    },
    and: ' y ',
    mixed: '{list} vuelven a ser neutrales en {d} d como muy pronto. ' +
      'Cada mundo se defiende en su disciplina.',
  },
  de: {
    title: 'Dein Gebiet verblasst bald',
    count: {
      run: { one: '1 Laufzone', many: '{n} Laufzonen' },
      bike: { one: '1 Radzone', many: '{n} Radzonen' },
    },
    single: {
      one: '{c} wird in {d} T. wieder neutral. {save}',
      many: '{c} werden in {d} T. wieder neutral. {save}',
    },
    save: {
      run: { one: 'Ein Lauf darüber behält sie.', many: 'Ein Lauf darüber behält sie.' },
      bike: {
        one: 'Eine Radtour darüber behält sie.',
        many: 'Eine Radtour darüber behält sie.',
      },
    },
    and: ' und ',
    mixed: '{list} werden frühestens in {d} T. wieder neutral. ' +
      'Jede Welt verteidigt man in ihrer Disziplin.',
  },
  pt: {
    title: 'Seu território vai sumir em breve',
    count: {
      run: { one: '1 zona a pé', many: '{n} zonas a pé' },
      bike: { one: '1 zona de bike', many: '{n} zonas de bike' },
    },
    single: {
      one: '{c} volta a ser neutra em {d} d. {save}',
      many: '{c} voltam a ser neutras em {d} d. {save}',
    },
    save: {
      run: {
        one: 'Uma corrida por cima mantém ela.',
        many: 'Uma corrida por cima mantém elas.',
      },
      bike: { one: 'Um pedal por cima mantém ela.', many: 'Um pedal por cima mantém elas.' },
    },
    and: ' e ',
    mixed: '{list} voltam a ser neutras em {d} d no mínimo. ' +
      'Cada mundo se defende na sua disciplina.',
  },
};

/** Choisit la forme et remplace `{n}` — le nombre décide, pas l'appelant. */
const pluralize = (p: Plural, n: number): string =>
  (n === 1 ? p.one : p.many).split('{n}').join(String(n));

/** Remplace chaque `{clé}` par sa valeur. Aucun `{` ne doit survivre à l'écran. */
const fill = (template: string, values: Readonly<Record<string, string | number>>): string => {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
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

/** Ce qui s'efface DANS UN MONDE. Jamais additionné à l'autre (miroir de
 * `DecayActivityWarning`, decay_job/logic.ts). */
export interface DecayActivityCount {
  activity: Activity;
  /**
   * Hexes menacés dans CETTE discipline. La clé primaire `(h3index, activity)`
   * (0070) garantit qu'un hexagone n'y figure qu'une fois.
   */
  hexCount: number;
  /** Échéance la plus proche DANS CE MONDE — le « dans N jours » de sa phrase. */
  earliestDecayAt: Date;
}

/**
 * Ce que decay_job sait d'un joueur à avertir (miroir de `DecayWarning`).
 *
 * IL N'Y A PLUS DE `hexCount` GLOBAL, et c'est le point : un compte unique
 * tous mondes confondus serait la somme interdite par E14, et c'est cette
 * forme-là qui obligeait le job à ne pousser que les joueurs menacés
 * uniquement à pied. `perActivity` porte la vérité, monde par monde.
 */
export interface DecayTarget {
  userId: string;
  /**
   * Un bloc par discipline menacée, dans l'ordre de `ACTIVITIES`. JAMAIS
   * sommés. NON VIDE — un avertissement sans monde menacé n'existe pas
   * (`groupWarningsByUser` n'en produit aucun) ; `buildDecayPush` lève si
   * l'invariant est rompu, plutôt que d'envoyer une phrase creuse.
   */
  perActivity: readonly DecayActivityCount[];
  /**
   * Échéance la plus proche, toutes disciplines. C'est un INSTANT, pas un
   * compte : prendre le plus tôt des deux mondes ne mélange aucun territoire.
   */
  earliestDecayAt: Date;
}

/**
 * Corps du push d'avertissement. PUR.
 *
 * TROIS CAS, et le troisième est celui qui manquait :
 *  · UN monde → sa phrase, son compte, et l'action qui SAUVE dans cette
 *    discipline (une course pour la course, une sortie vélo pour le vélo) ;
 *  · DEUX mondes (menace MIXTE) → les deux comptes JUXTAPOSÉS, jamais
 *    additionnés, jamais l'un effacé au profit de l'autre ; le délai est celui
 *    de la première échéance et se dit « au plus tôt » ; aucune action unique
 *    n'est prescrite puisqu'il en faudrait deux ;
 *  · AUCUN monde → impossible par construction (cf. `DecayTarget.perActivity`).
 *    On lève : `decay_job` enveloppe la livraison dans un `try/catch` et
 *    l'échec y est REMONTÉ (`pushTransportError`) sans toucher à l'inbox déjà
 *    écrite. Un bug d'appelant se voit ; une notification vide, non.
 */
function decayBody(copy: DecayLocaleCopy, target: DecayTarget, now: Date): string {
  const parts = target.perActivity;
  if (parts.length === 0) {
    throw new Error('buildDecayPush: aucun monde menacé — appelant fautif');
  }

  if (parts.length === 1) {
    const [{ activity, hexCount, earliestDecayAt }] = parts;
    return fill(hexCount === 1 ? copy.single.one : copy.single.many, {
      c: pluralize(copy.count[activity], hexCount),
      d: daysUntilDecay(earliestDecayAt, now),
      save: pluralize(copy.save[activity], hexCount),
    });
  }

  return fill(copy.mixed, {
    list: parts.map((p) => pluralize(copy.count[p.activity], p.hexCount)).join(copy.and),
    d: daysUntilDecay(target.earliestDecayAt, now),
  });
}

export function buildDecayPush(
  device: PushDevice,
  target: DecayTarget,
  now: Date,
): PushMessage {
  const copy = DECAY_COPY[device.locale] ?? DECAY_COPY.fr;
  return {
    to: device.expoToken,
    title: copy.title,
    body: decayBody(copy, target, now),
    // Le tap ouvre la carte sur ce qui s'efface — une notification sans action
    // est du spam (§5). `hexIds` reste côté serveur : le payload est minimal.
    //
    // `byActivity` et PAS un `hexCount` mêlé : c'est exactement le payload que
    // decay_job écrit déjà dans l'inbox, pour que les deux surfaces racontent
    // le même événement — et pour qu'aucun client ne puisse réafficher une
    // somme des deux mondes qu'on aurait laissée traîner ici.
    data: {
      type: 'decay_warning',
      cta: 'defend',
      byActivity: target.perActivity.map((p) => ({
        activity: p.activity,
        hexCount: p.hexCount,
      })),
    },
    priority: 'default',
  };
}

// ─── Sélection ───────────────────────────────────────────────────────────────

export type SuppressReason =
  | PushBlockReason
  | 'no_device'
  | 'channel_off'
  /** Vol subi : moins de STEAL_PUSH_MIN_HEXES zones — « pas chaque hex » (doc §4). */
  | 'below_threshold'
  /** Vol subi : un push de vol est déjà parti il y a < STEAL_PUSH_COOLDOWN_MINUTES. */
  | 'too_soon';

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
      messages: opted.map((d) => buildDecayPush(d, target, now)),
    });
  }

  return { sends, suppressed };
}

// ═════════════════════════════════════════════════════════════════════════════
// VOL SUBI — « quelqu'un a pris ton territoire » (doc §4 « Vol subi »)
// ═════════════════════════════════════════════════════════════════════════════
//
// C'est la boucle de rétention : on te prend ta zone, tu reviens la reprendre.
// Le moteur sait déjà voler (decideClaims → outcome 'stolen') ; ce bloc décide
// seulement QUOI dire et À QUI, en PUR.
//
// ─── L'AGRÉGATION : par VICTIME, et rien d'autre ─────────────────────────────
// Quatre unités étaient possibles, une seule tient :
//   · par victime × hex   → une course adverse de 50 hexes = 50 pushs. Absurde.
//   · par victime × zone  → une course qui traverse 3 secteurs = 3 pushs pour
//                           un seul événement vécu. Toujours du spam.
//   · par victime × rival → le cas « dix rivaux différents dans l'heure » donne
//                           dix messages. C'est exactement ce qu'on doit éviter.
//   · par VICTIME         → 1 message. RETENU.
// Le joueur ne vit pas « 50 hexes » ni « 3 crews » : il vit UNE dépossession.
// Le message porte donc un total et un lieu, pas une liste.
//
// L'agrégation dans UN appel ne suffit pas : dix rivaux peuvent arriver en dix
// appels. D'où une deuxième garde, dans le planificateur et non chez l'appelant :
// STEAL_PUSH_COOLDOWN_MINUTES depuis le dernier push de vol. Le cap journalier
// reste le dernier filet — jamais le design anti-spam.
//
// ─── ANTI PAY-TO-WIN (AMENDEMENT-45 C1, §22) ─────────────────────────────────
// « Être prévenu plus tôt d'une attaque, c'est défendre en premier. » Ce push
// est donc GRATUIT et IDENTIQUE pour tous : aucun paramètre d'entrée ne porte
// d'abonnement, de pass ni de niveau, priority reste 'default' comme le decay,
// et le seuil/cooldown sont des constantes globales — rien ici ne peut être
// accéléré par un achat. Toute future signature qui ferait entrer un statut
// payant dans ces fonctions viole §22.
//
// ─── VIE PRIVÉE : la victime est nommée, jamais l'attaquant ──────────────────
// Le doc §4 propose « Crew Bastille a repris 18 hexes ». On ne le suit PAS, et
// c'est délibéré :
//   1. AGRÉGER REND LE NOM FAUX. Un message par victime couvre potentiellement
//      plusieurs rivaux ; nommer le premier attribuerait à un crew des pertes
//      qu'il n'a pas causées — un mensonge, précisément ce qui est interdit.
//   2. UN PUSH EST UNE DIFFUSION, PAS UNE CONSULTATION. Le nom d'un crew est
//      public, mais il s'affiche ici sur un écran verrouillé, lu par qui passe,
//      et transforme un événement de jeu en désignation nominale de coupable.
//      Le moteur dépense déjà `blocked_fresh_protection` pour empêcher le
//      harcèlement d'un joueur ; le fil de notifications ne va pas le rouvrir.
//   3. LE NOM N'EST PAS PERDU. L'écran de revanche / l'inbox peut le montrer :
//      là c'est le joueur qui va chercher l'information, pas elle qui le trouve.
// `rivalCount` est donc exposé pour l'inbox et l'analytics, JAMAIS mis en copie.
// Aucune position, aucun tracé, aucun point de départ ne transite ici (§7) : le
// SECTEUR nommé est celui que la victime possédait — son territoire à elle.

/**
 * Un hex volé, tel que l'appelant le reconstitue (résultats `stolen` d'ingest_run
 * + l'ancien propriétaire lu dans hex_claims AVANT écriture). Le moteur ne
 * transporte pas la victime dans `HexClaimResult` : c'est l'appelant qui la joint.
 */
export interface StealEvent {
  /** Propriétaire DÉPOSSÉDÉ. C'est lui qu'on notifie. */
  victimUserId: string;
  /** Auteur du vol — sert à COMPTER les rivaux, jamais à les nommer. */
  thiefUserId: string;
  /** Hex H3 res 10 (string). Dédupliqué : un hex volé deux fois = une perte. */
  hexId: string;
  /** Secteur H3 res 7 de l'hex — clé d'agrégation du lieu. */
  sectorId?: string | null;
  /**
   * Nom RÉEL du secteur (sectorName.ts / gridFallbackLabel), ou null/absent s'il
   * n'est pas connu. Jamais inventé : sans nom, la notification se formule
   * autrement plutôt que de fabriquer un lieu.
   */
  sectorName?: string | null;
  at: Date;
}

/** Une victime, ses pertes agrégées. Sortie de `aggregateStealEvents`. */
export interface StealTarget {
  userId: string;
  /** Hexes DISTINCTS perdus. */
  hexCount: number;
  /** Nom du secteur le plus touché, ou null s'il n'est pas connu. */
  sectorName: string | null;
  /** Id du secteur le plus touché (deep link carte), ou null. */
  sectorId: string | null;
  /** Secteurs distincts touchés — pour l'inbox, pas pour la copie. */
  sectorCount: number;
  /** Rivaux distincts — pour l'inbox et l'analytics, JAMAIS pour la copie. */
  rivalCount: number;
  /** Vol le plus récent de l'agrégat. */
  latestAt: Date;
}

/**
 * Agrège des vols en UNE perte par victime. PURE et déterministe.
 *
 * Écarté silencieusement (ce ne sont pas des vols) :
 *   · `victimUserId === thiefUserId` — re-capture d'un hex déjà à soi. Le moteur
 *     route ce cas en `defended`, mais un appelant qui diffe la DB brute peut le
 *     produire : on ne notifie JAMAIS un joueur qu'il s'est volé lui-même ;
 *   · victime ou voleur vide — un hex neutre pris n'a pas de dépossédé.
 *
 * Le secteur retenu est celui où la victime a perdu LE PLUS d'hexes (égalité →
 * le premier vu, l'ordre d'entrée fait foi). Si CE secteur n'a pas de nom connu,
 * `sectorName` vaut null — on ne se rabat pas sur le secteur suivant, ce serait
 * nommer le mauvais endroit.
 *
 * Les victimes ressortent dans leur ordre de première apparition (stable).
 */
export function aggregateStealEvents(events: readonly StealEvent[]): StealTarget[] {
  interface Acc {
    userId: string;
    hexes: Set<string>;
    rivals: Set<string>;
    /** clé secteur → { hexes distincts, nom connu, rang d'apparition } */
    sectors: Map<string, { hexes: Set<string>; name: string | null; seen: number }>;
    latestAt: Date;
  }
  const byVictim = new Map<string, Acc>();
  let order = 0;

  for (const e of events) {
    const victim = e.victimUserId;
    if (!victim || !e.thiefUserId) continue;
    if (victim === e.thiefUserId) continue; // on ne se vole pas soi-même
    if (!e.hexId) continue;

    let acc = byVictim.get(victim);
    if (!acc) {
      acc = { userId: victim, hexes: new Set(), rivals: new Set(), sectors: new Map(), latestAt: e.at };
      byVictim.set(victim, acc);
    }
    // Un hex déjà compté ne recompte pas — mais il reste rattaché à son secteur.
    const fresh = !acc.hexes.has(e.hexId);
    acc.hexes.add(e.hexId);
    acc.rivals.add(e.thiefUserId);
    if (e.at.getTime() > acc.latestAt.getTime()) acc.latestAt = e.at;

    if (fresh && e.sectorId) {
      let s = acc.sectors.get(e.sectorId);
      if (!s) {
        s = { hexes: new Set(), name: null, seen: order++ };
        acc.sectors.set(e.sectorId, s);
      }
      s.hexes.add(e.hexId);
      // Premier nom NON VIDE rencontré pour ce secteur ; un blanc ne l'écrase pas.
      const named = typeof e.sectorName === 'string' ? e.sectorName.trim() : '';
      if (!s.name && named.length > 0) s.name = named;
    }
  }

  return [...byVictim.values()].map((acc) => {
    let best: { id: string; name: string | null; hexes: number; seen: number } | null = null;
    for (const [id, s] of acc.sectors) {
      const n = s.hexes.size;
      if (!best || n > best.hexes || (n === best.hexes && s.seen < best.seen)) {
        best = { id, name: s.name, hexes: n, seen: s.seen };
      }
    }
    return {
      userId: acc.userId,
      hexCount: acc.hexes.size,
      sectorName: best?.name ?? null,
      sectorId: best?.id ?? null,
      sectorCount: acc.sectors.size,
      rivalCount: acc.rivals.size,
      latestAt: acc.latestAt,
    };
  });
}

/**
 * Textes du push « vol subi », 5 langues (parité imposée par le type `Record`).
 * `{n}` = zones perdues, `{s}` = nom du secteur, `{w}` = le monde (ou rien).
 *
 * TON (§5, motivation saine) : le titre CONSTATE (« a changé de mains » — un
 * fait, pas une faute), le corps DONNE L'ACTION (« repasse dessus »). Aucune
 * phrase ne dit « tu as perdu », « tu n'as pas défendu », ni ne met la pression
 * par un compte à rebours. Personne n'est nommé — ni coupable, ni victime.
 * `titleNamed` n'est utilisé que si le nom du secteur est RÉELLEMENT connu.
 *
 * ═══ LE MONDE : MÊME RÈGLE QUE L'INBOX, MÊME PLACE DANS LA PHRASE ═══════════
 * L'inbox nommait déjà le monde, le push non : le même événement se racontait
 * de deux façons sur le même téléphone. `{w}` referme cet écart.
 *
 * Il se substitue là où se trouve déjà l'ACTION (« 2 zones reprises À VÉLO »),
 * parce que c'est elle que la discipline conditionne — reprendre à pied ce
 * qu'on a perdu à vélo ne rend rien. Le titre reste le LIEU, inchangé.
 *
 * `worlds` porte son ESPACE INITIAL : la substitution est alors la même
 * opération dans les deux cas (avec monde ou sans), et aucune phrase ne peut se
 * retrouver avec un espace en trop devant son point. La DÉCISION de nommer,
 * elle, n'est pas prise ici (cf. `worldToName` dans steal_push_job/logic.ts) :
 * ce module rend un monde qu'on lui donne, il n'en choisit aucun.
 */
const STEAL_COPY: Readonly<
  Record<PushLocale, {
    titleNamed: string;
    titlePlain: string;
    one: string;
    many: string;
    worlds: Readonly<Record<Activity, string>>;
  }>
> = {
  fr: {
    titleNamed: 'Ton territoire à {s} a changé de mains',
    titlePlain: 'Ton territoire a changé de mains',
    one: '1 zone reprise{w}. Repasse dessus pour la récupérer.',
    many: '{n} zones reprises{w}. Repasse dessus pour les récupérer.',
    worlds: { run: ' en course à pied', bike: ' à vélo' },
  },
  en: {
    titleNamed: 'Your turf in {s} changed hands',
    titlePlain: 'Your turf changed hands',
    one: '1 zone taken{w}. Cover it again to win it back.',
    many: '{n} zones taken{w}. Cover them again to win them back.',
    worlds: { run: ' on foot', bike: ' on the bike' },
  },
  es: {
    titleNamed: 'Tu territorio en {s} cambió de manos',
    titlePlain: 'Tu territorio cambió de manos',
    one: '1 zona tomada{w}. Vuelve a pasar para recuperarla.',
    many: '{n} zonas tomadas{w}. Vuelve a pasar para recuperarlas.',
    worlds: { run: ' corriendo', bike: ' en bici' },
  },
  de: {
    titleNamed: 'Dein Gebiet in {s} hat den Besitzer gewechselt',
    titlePlain: 'Dein Gebiet hat den Besitzer gewechselt',
    // Verbe NEUTRE, comme dans les quatre autres langues (« Repasse dessus »,
    // « Cover it again »…). Il avait été réécrit en « Fahr oder lauf » — donc le
    // vélo nommé INCONDITIONNELLEMENT, y compris quand `{w}` est vide. Comme
    // aucune sortie vélo n'existe en base, 100 % des joueurs germanophones
    // lisaient une distinction que le produit n'offre pas encore. C'est `{w}` qui
    // porte le monde, et lui seul, et uniquement pour qui a réellement les deux.
    one: '1 Zone übernommen{w}. Überquer sie erneut, um sie zurückzuholen.',
    many: '{n} Zonen übernommen{w}. Überquer sie erneut, um sie zurückzuholen.',
    worlds: { run: ' beim Laufen', bike: ' auf dem Rad' },
  },
  pt: {
    titleNamed: 'Seu território em {s} mudou de mãos',
    titlePlain: 'Seu território mudou de mãos',
    one: '1 zona tomada{w}. Passe por cima de novo para recuperá-la.',
    many: '{n} zonas tomadas{w}. Passe por cima de novo para recuperá-las.',
    worlds: { run: ' correndo', bike: ' de bicicleta' },
  },
};

/**
 * Construit le message de vol pour UN appareil. PURE.
 * Un nom de secteur absent, vide ou blanc → titre sans lieu : on ne fabrique
 * jamais un endroit pour faire une plus jolie phrase.
 *
 * @param world monde à NOMMER, ou `null` pour n'en nommer aucun. Le paramètre
 *   est REQUIS (et non optionnel) : un appelant qui l'oublie doit casser le
 *   typecheck, sinon le push retomberait en silence dans l'état d'avant —
 *   muet sur le monde là où l'inbox le nomme.
 */
export function buildStealPush(
  device: PushDevice,
  target: StealTarget,
  world: Activity | null,
): PushMessage {
  const copy = STEAL_COPY[device.locale] ?? STEAL_COPY.fr;
  const sector = target.sectorName?.trim() ?? '';
  const title = sector.length > 0
    ? copy.titleNamed.split('{s}').join(sector)
    : copy.titlePlain;
  const template = target.hexCount === 1 ? copy.one : copy.many;
  return {
    to: device.expoToken,
    title,
    body: template
      .split('{n}').join(String(target.hexCount))
      .split('{w}').join(world ? copy.worlds[world] : ''),
    // Payload MINIMAL : de quoi ouvrir la carte au bon endroit, rien de plus.
    // `sectorId` est le secteur de la VICTIME (son territoire), jamais une
    // position de rival ; aucun identifiant d'attaquant ne transite (§7).
    data: {
      type: 'steal_alert',
      cta: 'reclaim',
      hexCount: target.hexCount,
      ...(target.sectorId ? { sectorId: target.sectorId } : {}),
    },
    // 'default' comme le decay : une reprise de zone n'est pas une urgence, et
    // une priorité plus haute réservée à certains serait un avantage (§22).
    priority: 'default',
  };
}

/**
 * Le joueur peut-il recevoir un NOUVEAU push de vol à `now` ? PURE.
 * Faux tant que STEAL_PUSH_COOLDOWN_MINUTES ne sont pas écoulées depuis le
 * dernier. Une date future (horloge incohérente) bloque aussi — au bénéfice du
 * silence : dans le doute, on ne dérange pas.
 */
export function stealCooldownElapsed(lastStealPushAt: Date | undefined, now: Date): boolean {
  if (!lastStealPushAt) return true;
  const since = now.getTime() - lastStealPushAt.getTime();
  return since >= STEAL_PUSH_COOLDOWN_MINUTES * MS_PER_MINUTE;
}

/**
 * Décide qui reçoit le push « vol subi ». Canal exigé : `competition` — un vol
 * est un événement compétitif ; un joueur qui a coupé ce canal ne reçoit rien
 * (et c'est tracé `channel_off`, jamais silencieux).
 *
 * ORDRE DES GARDES (gelé, testé), du moins cher au plus contextuel :
 *   1. perte < STEAL_PUSH_MIN_HEXES        → below_threshold
 *   2. aucun appareil                      → no_device
 *   3. canal `competition` coupé           → channel_off
 *   4. push de vol trop récent             → too_soon
 *   5. quiet hours / cap journalier        → quiet_hours | daily_cap
 *
 * @param events vols BRUTS de la passe (agrégés ici même, pas par l'appelant).
 * @param lastStealPushByUser dernier push de VOL par joueur (pas tous types :
 *   le cap journalier tous types confondus est déjà couvert par `canPush`).
 * @param worldToNameByUser monde à NOMMER pour chaque joueur — DÉJÀ décidé par
 *   l'appelant (`worldToName`, steal_push_job/logic.ts), qui seul connaît les
 *   disciplines réellement jouées. Absent ⇒ on n'en nomme aucun. Ce module
 *   RESTITUE un monde, il n'en choisit jamais : la décision de nommer se prend
 *   au même endroit pour le push et pour l'inbox, sinon les deux divergent.
 *
 * CE QUE COUPER LE PUSH LAISSE INTACT — et ce qu'il n'y a PAS. État au
 * 21/07/2026, à re-vérifier dans `steal_push_job/index.ts` (étape 5) avant de
 * s'appuyer dessus : une garantie écrite ici ne vaut que ce que ce code tient.
 *   · L'INBOX, OUI — mais la formulation précédente (« pour toute victime dont
 *     les lignes sont consommées ») était trop large, et une garantie trop large
 *     est une garantie fausse. Exactement : `steal_push_job` insère dans
 *     `public.notifications` pour toute victime dont des lignes sont consommées
 *     ET qui portent au moins un vol RÉEL. Cela couvre `no_device`,
 *     `channel_off` et — depuis la migration 0058 — `expired` : un vol périmé
 *     ne laissait auparavant NI push NI inbox, la victime ne l'apprenait
 *     jamais. Les `invalid` (vol de soi-même, identifiant vide) n'ont pas
 *     d'entrée : `aggregateStealEvents` les écarte, il n'y a rien à raconter.
 *     Une victime REPORTÉE (`below_threshold`, `too_soon`, `quiet_hours`,
 *     `daily_cap`) n'a pas encore d'entrée — ses lignes ne sont pas consommées ;
 *     elle l'aura d'un coup, avec le total complet.
 *   · LE MARQUEUR DE REVANCHE, NON. Il n'existe pas côté serveur : aucune table
 *     `revanche_windows` dans `supabase/migrations/`, et
 *     `apps/mobile/src/features/crew/revanche.ts` le tient en AsyncStorage
 *     LOCAL (son en-tête le dit : « Tout est LOCAL (démo). TODO(O1) »).
 * Suspens détaillé sur STEAL_PUSH_MIN_HEXES dans game-rules.ts. Tant qu'il est
 * ouvert, aucun fichier ne doit promettre que la revanche survit au push coupé.
 */
export function planStealPushes(
  events: readonly StealEvent[],
  devicesByUser: ReadonlyMap<string, readonly PushDevice[]>,
  pushLogByUser: ReadonlyMap<string, readonly Date[]>,
  lastStealPushByUser: ReadonlyMap<string, Date>,
  now: Date,
  worldToNameByUser: ReadonlyMap<string, Activity | null>,
): PushPlan {
  const sends: { userId: string; messages: PushMessage[] }[] = [];
  const suppressed: { userId: string; reason: SuppressReason }[] = [];

  for (const target of aggregateStealEvents(events)) {
    if (target.hexCount < STEAL_PUSH_MIN_HEXES) {
      suppressed.push({ userId: target.userId, reason: 'below_threshold' });
      continue;
    }

    const devices = devicesByUser.get(target.userId) ?? [];
    if (devices.length === 0) {
      suppressed.push({ userId: target.userId, reason: 'no_device' });
      continue;
    }

    const opted = devices.filter((d) => channelEnabled(d.channels, 'competition'));
    if (opted.length === 0) {
      suppressed.push({ userId: target.userId, reason: 'channel_off' });
      continue;
    }

    if (!stealCooldownElapsed(lastStealPushByUser.get(target.userId), now)) {
      suppressed.push({ userId: target.userId, reason: 'too_soon' });
      continue;
    }

    // Quiet hours sur le fuseau du premier appareil opté (le joueur n'a qu'une
    // nuit) ; le cap, lui, est par joueur — identique au plan decay.
    const gate = canPush(
      { id: target.userId, timeZone: opted[0].timeZone },
      now,
      pushLogByUser.get(target.userId) ?? [],
    );
    if (!gate.allowed) {
      suppressed.push({ userId: target.userId, reason: gate.reason ?? 'daily_cap' });
      continue;
    }

    const world = worldToNameByUser.get(target.userId) ?? null;
    sends.push({
      userId: target.userId,
      messages: opted.map((d) => buildStealPush(d, target, world)),
    });
  }

  return { sends, suppressed };
}
