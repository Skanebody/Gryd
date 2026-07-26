/**
 * GRYD — digest_job/logic.ts (SPEC §4.3, GRYD_notifications_logic.md §3/§6).
 *
 * Fonctions PURES :
 *   - canPush : garde-fous push — quiet hours 21h-8h (heure LOCALE du joueur,
 *     défaut Europe/Paris) + cap PUSH_MAX_PER_DAY tous types confondus.
 *   - buildDigest : regroupe les petits événements en UN résumé
 *     (« Résumé GRYD — 3 zones défendues, 1 zone perdue… », doc notifs §6).
 *
 * canPush vit désormais dans `../_shared/push.ts` (PÉRIMÈTRE 3) : decay_job en a
 * besoin aussi, et deux copies de la règle « quiet hours + cap » auraient
 * dérivé. Ré-exporté ici pour ne rien casser des appelants existants.
 */
export {
  canPush,
  type CanPushResult,
  type PushBlockReason,
  type PushUser,
} from '../_shared/push.ts';

import { ACTIVITIES, type Activity, DEFAULT_ACTIVITY } from '../_shared/game-rules.ts';

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
  /**
   * Monde du compte. OBLIGATOIRE dès que la dimension est SÉPARÉE par
   * discipline (`ACTIVITY_SCOPE.territory = 'per_activity'`) : un compte de
   * zones sans discipline est une SOMME des deux mondes, et E14 l'interdit
   * (« jamais Run + Bike dans une même lecture compétitive… JAMAIS sommées »).
   *
   * Absente = le compte n'appartient à aucun monde (badges débloqués, courses
   * du crew). Ce n'est pas « discipline inconnue » : c'est « cette dimension
   * n'en a pas ».
   */
  activity?: Activity;
}

/**
 * Discipline d'une ligne lue en base.
 *
 * · ABSENTE (null/undefined) ⇒ `run`. Ce n'est pas un repli prudent, c'est un
 *   FAIT : tout ce qui existait avant la migration 0070 est de la course à pied
 *   (`default 'run'`), et le vélo n'a jamais pu être ingéré avant elle.
 * · ILLISIBLE (valeur hors ACTIVITIES) ⇒ on LÈVE. La contrainte
 *   `hex_claims_activity_check` rend le cas impossible en base ; s'il survenait,
 *   compter la ligne comme de la course écrirait un chiffre FAUX dans le résumé
 *   d'un joueur — et un résumé faux part sur son écran de verrouillage. Un job
 *   qui s'arrête se voit ; un chiffre inventé, non.
 *
 * (Jumeau de `readActivity` dans decay_job/index.ts : les deux Edge Functions
 *  sont des unités de déploiement séparées et ne s'importent pas entre elles.
 *  Ici la fonction est PURE et testée — c'est la version à recopier le jour où
 *  `_shared` héritera de la règle.)
 */
export function readActivity(value: unknown): Activity {
  if (value === null || value === undefined) return DEFAULT_ACTIVITY;
  if (typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value)) {
    return value as Activity;
  }
  throw new Error(`discipline illisible « ${value} »`);
}

// ─── ZONES PERDUES : compter des ZONES, et ne chiffrer que le vrai ───────────
//
// ═══ LE DÉFAUT ══════════════════════════════════════════════════════════════
// Le récap hebdo comptait des LIGNES de `notifications` de type `steal`. Or une
// ligne est un ÉVÉNEMENT AGRÉGÉ par victime (steal_push_job:inboxRow) : elle
// couvre `payload.hexCount` hexagones — parfois vingt. « 3 zones perdues »
// pouvait donc valoir vingt zones. Et ce nombre part dans l'inbox du joueur.
//
// Deuxième faute, imbriquée : ce compte ne portait aucune discipline, alors
// que le territoire est SÉPARÉ (`ACTIVITY_SCOPE.territory = 'per_activity'`,
// E14 « JAMAIS sommées »).
//
// ═══ POURQUOI LA DISCIPLINE NE SE LIT PAS DANS LA NOTIFICATION ══════════════
// `payload.activity` ne dit PAS le monde de la perte. `worldToName`
// (steal_push_job/logic.ts) y met `null` dans DEUX situations qui n'ont rien à
// voir : les pertes couvrent les deux mondes, OU le joueur n'en pratique qu'un
// (auquel cas nommer le monde n'aurait rien distingué). Un `null` ne peut donc
// pas être lu comme « mêlé » — c'est « non attribuable ». La source ne peut pas
// être corrigée depuis ici : `steal_push_job` écrit ce payload et n'appartient
// pas à ce lot.
//
// ═══ CE QU'ON FAIT, ALORS ═══════════════════════════════════════════════════
// On répond à la question « ce joueur a-t-il DEUX mondes à distinguer ? » avec
// la MÊME source que steal_push_job, et pour la même raison : `season_scores`,
// bornée PAR CONSTRUCTION (clé primaire `(season_id, user_id, activity)` — au
// plus deux lignes par saison jouée), là où `runs` ou `hex_claims` seraient
// proportionnelles à l'activité. Alors :
//   · un `null` chez un joueur qui n'a de lignes que dans UN monde est LEVÉ :
//     tout son territoire vit là, donc toutes ses pertes aussi. Le compte est
//     exact, et il porte enfin son monde ;
//   · un `null` chez un joueur qui en a DEUX reste non attribuable. On ne
//     chiffre alors RIEN pour lui — pas même ses lignes non ambiguës, qui
//     seraient exactes dans leur monde mais INCOMPLÈTES (« 2 zones perdues à
//     pied » quand un lot mêlé en contenait deux autres est un chiffre faux).
// Le sens de l'erreur est toujours le même : dans le doute on se TAIT. Le
// joueur a de toute façon reçu, sur le moment, une notification exacte par
// événement ; le résumé ne lui doit pas un nombre, il lui doit la vérité.

/** Une ligne `notifications` de type `steal`, telle que le job la lit. */
export interface StealNotificationRow {
  userId: string;
  /**
   * `payload.hexCount` — zones couvertes par CET événement agrégé.
   * `null` = illisible : on ne sait pas combien, et « 1 » serait une invention.
   */
  hexCount: number | null;
  /**
   * `payload.activity` — monde NOMMÉ par la notification, ou `null` = NON
   * ATTRIBUABLE (cf. en-tête). Jamais « run par défaut » : ici, contrairement à
   * `readActivity` au-dessus, l'absence n'est pas un fait historique mais une
   * ambiguïté d'écriture.
   */
  activity: Activity | null;
}

export interface ZonesLostReading {
  /** Ce qui peut être dit VRAI : un compte par (joueur, monde). */
  events: { userId: string; event: DigestEvent }[];
  /**
   * Joueurs pour qui AUCUN chiffre n'est énonçable. Remonté pour
   * l'observabilité du job : une abstention se compte, elle ne se tait pas.
   */
  unquantifiable: string[];
}

/**
 * Lit une discipline de PAYLOAD (et non de colonne). PURE.
 *
 * Trois différences avec `readActivity`, toutes voulues :
 *  · absente ⇒ `null` (non attribuable) et NON `run` — le payload n'a pas de
 *    `default 'run'` derrière lui, l'absence n'y prouve rien ;
 *  · illisible ⇒ `null` aussi, et non une levée. Ce chemin ne décide d'aucune
 *    écriture de territoire : la seule conséquence d'un `null` est qu'on
 *    s'abstient de chiffrer. Faire tomber le cron du soir en entier pour un
 *    payload malformé coûterait le digest de TOUS les joueurs ;
 *  · le retour est donc `Activity | null`, jamais `Activity`.
 */
export function readPayloadActivity(value: unknown): Activity | null {
  if (typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value)) {
    return value as Activity;
  }
  return null;
}

/**
 * Lit `payload.hexCount`. PURE. Un entier strictement positif, ou `null`.
 *
 * `null` couvre l'absence ET toute valeur invalide (négative, fractionnaire,
 * non numérique). Le repli à `1` serait précisément le bug d'origine — une
 * ligne comptée pour une zone.
 */
export function readPayloadHexCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

/**
 * Transforme les notifications de vol de la semaine en comptes de ZONES par
 * monde — ou en abstentions. PURE.
 *
 * @param rows lignes `steal` de la fenêtre, une par événement agrégé.
 * @param worldsByUser disciplines dans lesquelles chaque joueur a RÉELLEMENT
 *   des lignes (`season_scores`). Un joueur absent de la map est traité comme
 *   « on ne sait pas » : ses lignes ambiguës restent ambiguës. Dans le doute,
 *   on se tait — on ne lui invente pas un monde unique.
 */
export function buildZonesLost(
  rows: readonly StealNotificationRow[],
  worldsByUser: ReadonlyMap<string, ReadonlySet<Activity>>,
): ZonesLostReading {
  /** Ordre de première apparition : un digest ne change pas d'ordre au hasard. */
  const order: string[] = [];
  const byUser = new Map<string, StealNotificationRow[]>();
  for (const row of rows) {
    const acc = byUser.get(row.userId);
    if (acc) acc.push(row);
    else {
      byUser.set(row.userId, [row]);
      order.push(row.userId);
    }
  }

  const events: { userId: string; event: DigestEvent }[] = [];
  const unquantifiable: string[] = [];

  for (const userId of order) {
    const userRows = byUser.get(userId)!;
    const worlds = worldsByUser.get(userId);
    /** Le monde à créditer, ou `undefined` si la ligne reste ambiguë. */
    const resolve = (row: StealNotificationRow): Activity | undefined => {
      if (row.activity !== null) return row.activity;
      // Un seul monde pratiqué ⇒ le `null` venait du « inutile de nommer »,
      // pas d'un mélange : tout son territoire vit là.
      if (worlds !== undefined && worlds.size === 1) return [...worlds][0];
      return undefined;
    };

    const totals = new Map<Activity, number>();
    let silent = false;
    for (const row of userRows) {
      const world = resolve(row);
      // Une seule ligne inexploitable suffit à rendre TOUT le compte faux : les
      // autres seraient exactes mais incomplètes, ce qui se lit pareil.
      if (world === undefined || row.hexCount === null) {
        silent = true;
        break;
      }
      totals.set(world, (totals.get(world) ?? 0) + row.hexCount);
    }

    if (silent) {
      unquantifiable.push(userId);
      continue;
    }
    // Ordre de ACTIVITIES : le résumé ne dépend pas de l'ordre de lecture.
    for (const activity of ACTIVITIES) {
      const count = totals.get(activity);
      if (count) events.push({ userId, event: { type: 'zones_lost', count, activity } });
    }
  }

  return { events, unquantifiable };
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
 * Suffixe de monde, accolé au libellé. Même vocabulaire que le vol subi
 * (steal_push_job) : le joueur lit « à pied » / « à vélo », jamais « run » /
 * « bike ». Le suffixe est TOUJOURS présent sur un compte discipliné, même
 * quand le joueur n'a qu'un monde : « 3 zones gagnées » sans monde laisserait
 * un cycliste croire qu'on lui parle de course.
 */
const WORLD_SUFFIX: Readonly<Record<Activity, string>> = {
  run: ' à pied',
  bike: ' à vélo',
};

/** Clé d'agrégation : un compte appartient à (type, monde), jamais au type seul. */
const bucketKey = (type: DigestEventType, activity: Activity | undefined): string =>
  `${type}\u0000${activity ?? ''}`;

/**
 * Groupe les événements en un résumé unique. null = rien à dire, PAS de digest
 * (« rares, utiles, actionnables » — on n'envoie jamais un résumé vide).
 *
 * DEUX MONDES, DEUX LIGNES. Les comptes disciplinés ne fusionnent JAMAIS entre
 * eux : « +3 hexes gagnés à pied, +2 hexes gagnés à vélo » et jamais « +5 hexes
 * gagnés » (E14 ; `ACTIVITY_SCOPE.territory = 'per_activity'`). Le digest part
 * sur l'écran de verrouillage : une somme fausse y est un mensonge qui sort de
 * l'app.
 */
export function buildDigest(
  events: readonly DigestEvent[],
  scope: 'crew' | 'weekly',
): Digest | null {
  // Fusion des doublons par (type, monde), comptes <= 0 ignorés.
  const totals = new Map<string, number>();
  for (const e of events) {
    if (e.count <= 0) continue;
    const key = bucketKey(e.type, e.activity);
    totals.set(key, (totals.get(key) ?? 0) + e.count);
  }
  if (totals.size === 0) return null;

  // Ordre : par type (positif d'abord), puis par monde (course, vélo), puis le
  // compte SANS monde (badges, courses du crew) — stable, jamais aléatoire.
  const worldOrder: readonly (Activity | undefined)[] = [...ACTIVITIES, undefined];
  const parts: string[] = [];
  for (const type of DISPLAY_ORDER) {
    for (const activity of worldOrder) {
      const count = totals.get(bucketKey(type, activity));
      if (!count) continue;
      const [singular, plural] = LABELS[type];
      const label = (count === 1 ? singular : plural) +
        (activity ? WORLD_SUFFIX[activity] : '');
      parts.push(type === 'hexes_gained' ? `+${count} ${label}` : `${count} ${label}`);
    }
  }

  return {
    title: scope === 'weekly' ? 'Résumé GRYD de la semaine' : 'Résumé GRYD du crew',
    body: `${parts.join(', ')}.`,
    itemCount: parts.length,
  };
}

// ─── Nudge challenge sain (AMENDEMENT-07 §9, motivation §12) ──────────────────

/** Avancement d'un challenge pour le nudge (sous-ensemble de ChallengeUpdate). */
export interface ChallengeNudgeInput {
  name: string;
  /** Sujet : joueur (`user`) ou crew (`crew`). */
  kind: 'user' | 'crew';
  progress: number;
  target: number;
}

export interface ChallengeNudge {
  title: string;
  body: string;
}

/**
 * Construit un rappel de challenge NON CULPABILISANT (motivation §11.1/§12). PURE.
 * Règles anti-shame :
 *  - JAMAIS « en retard / tu vas perdre / tu n'as pas couru » ;
 *  - objectif atteint → félicitation ; proche (reste ≤ 1 unité) → « à 1 de ton
 *    objectif » ; sinon progression positive (« X/Y, ta régularité progresse »).
 * Renvoie null si rien d'actionnable (target ≤ 0, ou aucun progrès à saluer sans
 * pression — on n'envoie jamais un rappel vide/anxiogène).
 */
export function buildChallengeNudge(ch: ChallengeNudgeInput): ChallengeNudge | null {
  const target = ch.target;
  if (target <= 0) return null;
  const progress = Math.max(0, ch.progress);
  const remaining = Math.max(0, target - progress);
  const who = ch.kind === 'crew' ? 'Votre crew' : 'Tu';
  const possessive = ch.kind === 'crew' ? 'votre' : 'ton';

  if (remaining === 0) {
    return {
      title: `${ch.name} — objectif atteint`,
      body: ch.kind === 'crew'
        ? `${who} avez bouclé ${ch.name}. Beau travail collectif.`
        : `${who} as bouclé ${ch.name}. Beau travail.`,
    };
  }
  if (remaining <= 1) {
    return {
      title: `${ch.name}`,
      body: ch.kind === 'crew'
        ? `${who} êtes à 1 pas de ${possessive} objectif ${ch.name}.`
        : `${who} es à 1 pas de ${possessive} objectif ${ch.name}.`,
    };
  }
  // Progression saine : on valorise l'avancée, jamais le manque.
  return {
    title: `${ch.name}`,
    body: ch.kind === 'crew'
      ? `${who} avancez sur ${ch.name} : ${progress}/${target}. La régularité paie.`
      : `${who} avances sur ${ch.name} : ${progress}/${target}. Ta régularité progresse.`,
  };
}
