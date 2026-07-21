/**
 * GRYD — steal_push_job : les règles PURES du drain de `steal_push_queue`.
 *
 * Le QUOI-DIRE et le À-QUI vivent déjà dans `_shared/push.ts`
 * (`planStealPushes`, testé). Ce module décide ce qui ADVIENT de chaque ligne
 * de la file : consommée (et pourquoi), ou reportée (et jusqu'à quand).
 *
 * ═══ LE PRINCIPE, EN UNE PHRASE ═════════════════════════════════════════════
 * Pour une notification push, **« au plus une fois » vaut mieux que « au moins
 * une fois »**. Perdre une alerte est un désagrément ; en envoyer dix est une
 * raison de désinstaller.
 *
 * Tout ce module en découle. En particulier `planDrainOutcome` est calculé et
 * appliqué AVANT l'appel à Expo : une ligne pour laquelle un push est TENTÉ est
 * consommée immédiatement, sans attendre de savoir si le téléphone l'a reçue.
 * Si le job meurt entre la consommation et l'envoi, l'alerte est PERDUE — c'est
 * le prix, il est choisi, et il est mesuré (`outcome = 'abandoned'`, cf. 0057).
 *
 * Ce que ce module ne fait PAS et ne doit jamais faire : conditionner la
 * consommation au succès de l'envoi. C'était la forme précédente
 * (`selectConsumedIds(rows, plan, pushedUserIds)`), et elle produisait le
 * défaut inverse — un échec de transport rendait le lot entier au drain
 * suivant, toutes les 5 minutes, pendant 24 h. Un mécanisme conçu POUR ne pas
 * spammer pouvait spammer.
 *
 * ═══ LA SECONDE RÈGLE : MOMENT vs DESTINATAIRE ══════════════════════════════
 * Une suppression qui parle du MOMENT reporte la ligne ; une suppression qui
 * parle du DESTINATAIRE la consomme.
 *
 *   · `below_threshold` — 2 zones perdues, seuil à 5. REPORTÉE : si 3 autres
 *     tombent, le joueur sera prévenu des 5. Consommer créerait un trou
 *     permanent — on pourrait perdre son territoire par tranches de 4 sans
 *     jamais rien apprendre.
 *   · `too_soon` — cooldown de vol en cours. REPORTÉE : le prochain message
 *     couvrira tout ce qui s'est passé pendant, avec le VRAI total.
 *   · `quiet_hours` — il est 23 h. REPORTÉE : le joueur l'apprend au réveil.
 *     Les quiet hours décalent une information, elles ne la détruisent pas.
 *   · `daily_cap` — plafond du jour atteint. REPORTÉE, même raison.
 *   · `no_device` / `channel_off` — aucun appareil, ou canal `competition`
 *     coupé. Rien ne changera en gardant la ligne. CONSOMMÉE
 *     (`undeliverable`) — et l'inbox est écrite pour autant.
 *
 * Consommer n'efface aucune information de jeu : la zone perdue est visible sur
 * la carte, dans le territoire du joueur et dans son historique. La file ne
 * porte QUE le droit de déranger quelqu'un.
 *
 * Aucune I/O ici, aucun `Date.now()` : `now` est toujours injecté.
 */
import {
  STEAL_PUSH_COOLDOWN_MINUTES,
  STEAL_QUEUE_DEFER_MINUTES,
  STEAL_QUEUE_MAX_AGE_HOURS,
} from '../_shared/game-rules.ts';
import type { PushPlan, SuppressReason } from '../_shared/push.ts';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/** Une ligne de `steal_push_queue` réservée par le drain courant. */
export interface StealQueueRow {
  id: number;
  victimUserId: string;
  thiefUserId: string;
  /** Hex H3 res 10 (string), déjà décodé depuis le bigint DB. */
  hexId: string;
  stolenAt: Date;
}

/**
 * Issue de consommation, miroir EXACT du `check` de `steal_push_queue.outcome`
 * (migration 0057). Toute valeur ajoutée ici doit l'être là-bas, sinon l'update
 * est rejeté à l'exécution.
 */
export type DrainOutcome =
  | 'pushed'
  | 'undeliverable'
  | 'expired'
  | 'invalid'
  | 'abandoned';

export interface DrainDecision {
  /** Lignes qui ne reviendront JAMAIS dans un lot. */
  consumed: { id: number; outcome: DrainOutcome }[];
  /** Lignes rendues au lot, mais pas avant `nextAttemptAt`. */
  deferred: { id: number; nextAttemptAt: Date }[];
}

/**
 * Motifs de suppression qui portent sur le MOMENT : l'événement mérite une
 * nouvelle chance. Tout autre motif est définitif.
 *
 * Exhaustif par construction : `SuppressReason` est une union fermée, ajouter
 * un motif sans trancher ici casse le typecheck.
 */
const TIMING_SUPPRESSIONS: Readonly<Record<SuppressReason, boolean>> = {
  below_threshold: true,
  too_soon: true,
  quiet_hours: true,
  daily_cap: true,
  no_device: false,
  channel_off: false,
};

export function isTimingSuppression(reason: SuppressReason): boolean {
  return TIMING_SUPPRESSIONS[reason] === true;
}

/**
 * Sépare les vols encore ANNONÇABLES de ceux qui sont PÉRIMÉS. PURE.
 *
 * Un vol plus vieux que STEAL_QUEUE_MAX_AGE_HOURS n'est plus une nouvelle : le
 * terrain a pu rechanger de mains deux fois depuis. On le purge sans push
 * plutôt que d'envoyer une information dont on ne sait plus si elle est encore
 * vraie — « l'app ne ment jamais » vaut aussi pour la fraîcheur.
 *
 * Une date FUTURE (horloge incohérente) n'est jamais périmée : dans le doute on
 * garde l'événement plutôt que de le détruire.
 *
 * POURQUOI DES LIGNES ET PLUS DES IDs. Cette fonction rendait `staleIds` :
 * l'appelant ne pouvait alors QUE les consommer, et la victime d'un vol périmé
 * n'avait ni push ni entrée d'inbox — elle n'apprenait JAMAIS qu'on lui avait
 * pris son territoire. Ce n'était pas le compromis assumé (« au plus une
 * fois »), c'était « parfois rien du tout ». Le périmé perd le droit de
 * DÉRANGER (le push), pas le droit d'être RACONTÉ (l'inbox) : les lignes
 * complètes sont donc rendues pour que `steal_push_job` puisse les agréger.
 */
export function partitionStealQueue(
  rows: readonly StealQueueRow[],
  now: Date,
): { fresh: StealQueueRow[]; stale: StealQueueRow[] } {
  const cutoff = now.getTime() - STEAL_QUEUE_MAX_AGE_HOURS * MS_PER_HOUR;
  const fresh: StealQueueRow[] = [];
  const stale: StealQueueRow[] = [];
  for (const row of rows) {
    if (row.stolenAt.getTime() < cutoff) stale.push(row);
    else fresh.push(row);
  }
  return { fresh, stale };
}

/**
 * Quand une ligne reportée redevient-elle LISIBLE ? PURE.
 *
 * ═══ POURQUOI CETTE FONCTION EXISTE : LA FAMINE ═════════════════════════════
 * Reporter sans DATE, c'est ne rien reporter : la ligne repart au drain suivant,
 * réoccupe une place dans le lot, et comme le lot est servi par ANCIENNETÉ, les
 * plus vieilles lignes jamais consommables finissent par le saturer — les vols
 * RÉCENTS ne sont alors plus jamais lus. C'est une famine, et elle frappe
 * exactement les joueurs actifs. Chaque motif reçoit donc la date la plus JUSTE
 * qu'on puisse calculer, pas un délai forfaitaire.
 *
 * ═══ CE QUI REND LE REPORT SÛR ══════════════════════════════════════════════
 * La lecture se fait par VICTIME (cf. `claim_steal_push_batch`, 0057) : dès
 * qu'UNE ligne de la victime redevient due, le drain reprend TOUTES ses lignes
 * en attente, reportées comprises. Une ligne endormie n'est donc jamais
 * orpheline — un nouveau vol réveille sa victime et la ramène dans l'agrégat.
 * Sans ce couplage, reporter une ligne `below_threshold` la retirerait du compte
 * et le seuil ne serait plus jamais atteint. Le report et la lecture-par-victime
 * ne sont pas deux décisions : c'en est une seule.
 *
 * @param row la ligne reportée — sa propre date de péremption sert d'échéance.
 * @param lastStealPushAt dernier push de VOL de cette victime, s'il existe.
 */
export function nextAttemptAt(
  reason: SuppressReason,
  row: StealQueueRow,
  lastStealPushAt: Date | undefined,
  now: Date,
): Date {
  switch (reason) {
    case 'below_threshold': {
      // CAS DOMINANT EN VOLUME, et le seul qui exige un long sommeil.
      // Une perte sous le seuil ne devient annonçable que si D'AUTRES vols
      // s'ajoutent — jamais par le simple passage du temps. La relire toutes
      // les 15 min pendant 24 h, c'est 96 réveils pour rien, et 96 places
      // prises dans le lot par une ligne qui ne peut RIEN produire.
      // On l'endort donc jusqu'à sa propre péremption : d'ici là, seul un
      // nouveau vol la réveillera (via sa victime), et c'est exactement le
      // moment où elle redevient utile. À l'échéance, elle est consommée
      // `expired` par `partitionStealQueue` — le trou du §4 « pas chaque hex »,
      // assumé et borné.
      return new Date(row.stolenAt.getTime() + STEAL_QUEUE_MAX_AGE_HOURS * MS_PER_HOUR);
    }
    case 'too_soon': {
      // Le cooldown a une FIN CONNUE : on la calcule au lieu de la deviner.
      // Sans `lastStealPushAt` (ne devrait pas arriver — c'est lui qui a
      // produit `too_soon`), on retombe sur le délai forfaitaire plutôt que de
      // fabriquer une date.
      if (!lastStealPushAt) return deferredBy(now, STEAL_QUEUE_DEFER_MINUTES);
      const end = new Date(
        lastStealPushAt.getTime() + STEAL_PUSH_COOLDOWN_MINUTES * MS_PER_MINUTE,
      );
      // Une fin déjà passée (horloge incohérente) ne doit pas rendre la ligne
      // due dans le passé et provoquer une relecture immédiate en boucle.
      return end.getTime() > now.getTime() ? end : deferredBy(now, STEAL_QUEUE_DEFER_MINUTES);
    }
    case 'quiet_hours':
    case 'daily_cap': {
      // Ces deux-là ont une fin réelle (8 h locales / minuit local) qu'on
      // POURRAIT calculer — mais seulement en faisant entrer le fuseau de
      // l'appareil dans cette fonction pure, pour un gain faible :
      //   · quiet_hours se résout d'elle-même au matin, et en Saison 0
      //     (Paris + Lille) tout le monde partage la même nuit — pendant
      //     laquelle il n'y a de toute façon personne à affamer ;
      //   · daily_cap suppose PUSH_MAX_PER_DAY pushs déjà envoyés dans la
      //     journée : rare, et jamais massif.
      // COÛT ASSUMÉ : au pire ~44 relectures sur une nuit de 11 h. Borné,
      // sans effet sur le joueur, et le jour où un fuseau sera disponible ici
      // sans compromettre la pureté, la date exacte remplacera ce forfait.
      return deferredBy(now, STEAL_QUEUE_DEFER_MINUTES);
    }
    case 'no_device':
    case 'channel_off':
      // Ne sont jamais reportés (cf. TIMING_SUPPRESSIONS). Présents pour que
      // l'ajout d'un motif casse le typecheck plutôt que de filer en silence.
      return deferredBy(now, STEAL_QUEUE_DEFER_MINUTES);
  }
}

function deferredBy(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * MS_PER_MINUTE);
}

/**
 * Décide, pour chaque ligne RÉSERVÉE, ce qu'il advient d'elle. PURE.
 *
 * ═══ APPELÉE AVANT L'ENVOI EXPO — C'EST TOUT L'INTÉRÊT ══════════════════════
 * Le résultat est appliqué en base (`finalize_steal_push_batch`) AVANT le
 * moindre appel réseau. Une victime pour laquelle un push est PRÉVU voit ses
 * lignes consommées `pushed` — que le téléphone reçoive ou non. Il n'existe
 * donc aucune écriture postérieure à l'envoi capable de provoquer un renvoi :
 * le journal de push et la désactivation des tokens morts se journalisent en
 * cas d'échec, ils ne relancent rien.
 *
 * `pushed` signifie « un push a été TENTÉ », jamais « reçu ». C'est le nom le
 * plus honnête disponible sans mentir dans l'autre sens : on ne peut pas
 * attendre l'accusé de réception sans rouvrir la boucle de renvoi.
 *
 * @param rows lignes réservées (déjà débarrassées des périmées).
 * @param plan décision pure de `planStealPushes`.
 * @param lastStealPushByUser dernier push de vol par joueur — sert à dater
 *   précisément la fin du cooldown pour les reports `too_soon`.
 */
export function planDrainOutcome(
  rows: readonly StealQueueRow[],
  plan: PushPlan,
  lastStealPushByUser: ReadonlyMap<string, Date>,
  now: Date,
): DrainDecision {
  const planned = new Set(plan.sends.map((s) => s.userId));
  const suppressedBy = new Map<string, SuppressReason>();
  for (const s of plan.suppressed) suppressedBy.set(s.userId, s.reason);

  const decision: DrainDecision = { consumed: [], deferred: [] };

  for (const row of rows) {
    const victim = row.victimUserId;

    if (planned.has(victim)) {
      decision.consumed.push({ id: row.id, outcome: 'pushed' });
      continue;
    }

    const reason = suppressedBy.get(victim);
    if (reason === undefined) {
      // Absente du plan ET des suppressions : l'événement a été écarté par
      // `aggregateStealEvents` (vol de soi-même, identifiant vide). Il ne
      // deviendra JAMAIS un message ; la garder ferait boucler le drain sur
      // elle jusqu'à péremption.
      decision.consumed.push({ id: row.id, outcome: 'invalid' });
      continue;
    }

    if (isTimingSuppression(reason)) {
      decision.deferred.push({
        id: row.id,
        nextAttemptAt: nextAttemptAt(reason, row, lastStealPushByUser.get(victim), now),
      });
    } else {
      decision.consumed.push({ id: row.id, outcome: 'undeliverable' });
    }
  }

  return decision;
}

/**
 * Ce qu'Expo nous a réellement appris, par joueur. PURE.
 *
 * ═══ LE PIÈGE QUE CETTE FONCTION FERME ══════════════════════════════════════
 * `okTokens: []` a DEUX sens radicalement différents, et les confondre était un
 * défaut réel :
 *   · Expo a répondu et a REFUSÉ chaque token → on SAIT que rien n'est parti ;
 *   · le réseau est tombé / Expo a renvoyé un 5xx → on ne sait RIEN. Les
 *     messages ont peut-être été acceptés côté serveur avant la coupure.
 * Traiter le second cas comme le premier, c'est affirmer un fait qu'on n'a pas.
 *
 * DIRECTION DE PRUDENCE. Dès qu'une erreur de transport est signalée, tout
 * token non explicitement accepté est déclaré `unknown`, jamais `rejected` —
 * y compris ceux qu'Expo avait peut-être refusés dans un autre lot. On préfère
 * sous-affirmer : `unknown` n'autorise aucune écriture, `rejected` en
 * autoriserait.
 *
 * CE QUI EN DÉCOULE CÔTÉ APPELANT :
 *   · `push_log` n'est écrit que pour `delivered`. Journaliser un `unknown`
 *     consommerait le cap journalier du joueur et déclencherait un cooldown de
 *     vol pour un message qu'il n'a peut-être jamais vu — soit exactement le
 *     silence qu'on cherche à éviter.
 *   · `unknown` ne rouvre AUCUNE boucle : les lignes sont déjà consommées au
 *     moment de l'envoi. Une panne réseau perd l'alerte, elle ne la répète pas.
 *     C'est la contrepartie directe du « au plus une fois ».
 *   · le compte des `unknown` remonte dans la réponse du job : une panne Expo
 *     doit être VISIBLE, pas ressembler à un drain calme.
 */
export type DeliveryStatus = 'delivered' | 'rejected' | 'unknown';

export function classifyDelivery(
  plan: PushPlan,
  okTokens: ReadonlySet<string>,
  transportFailed: boolean,
): Map<string, DeliveryStatus> {
  const byUser = new Map<string, DeliveryStatus>();
  for (const send of plan.sends) {
    const accepted = send.messages.some((m) => okTokens.has(m.to));
    byUser.set(send.userId, accepted ? 'delivered' : transportFailed ? 'unknown' : 'rejected');
  }
  return byUser;
}

/** Joueurs dont AU MOINS un appareil a réellement accepté le message. PURE. */
export function deliveredUserIds(byUser: ReadonlyMap<string, DeliveryStatus>): string[] {
  return [...byUser].filter(([, status]) => status === 'delivered').map(([userId]) => userId);
}

/** Compte par issue de livraison — observabilité honnête. PURE. */
export function deliveryTally(
  byUser: ReadonlyMap<string, DeliveryStatus>,
): { delivered: number; rejected: number; unknown: number } {
  const tally = { delivered: 0, rejected: 0, unknown: 0 };
  for (const status of byUser.values()) tally[status] += 1;
  return tally;
}
