/**
 * GRYD — E27 : LE TRANSPORT DES FAITS DE SYNCHRONISATION (mémoire seule).
 *
 * ═══ LE TROU QUE CE MODULE BOUCHE (27/07/2026) ══════════════════════════════
 * `analysisMachine.ts` déclare quatre faits — `upload_started`, `retry_started`,
 * `server_ack`, `local_save_failed` — que RIEN n'émettait en production : ils
 * n'existaient que dans le type et dans les branches du réducteur. Conséquence
 * exacte : les phases `uploading` et `analysing` étaient INATTEIGNABLES, et E27
 * passait de `securing` à un état terminal sans jamais montrer l'envoi. Une
 * machine parfaitement testée dont aucune exécution n'emprunte les branches est
 * une maquette, pas un moteur.
 *
 * Les faits naissent maintenant LÀ OÙ ILS ONT LIEU (juste avant l'appel réseau,
 * juste après un échec d'écriture) ; ce module est le seul chemin entre ces
 * endroits et l'écran.
 *
 * ═══ POURQUOI CE PATRON, ET PAS UNE LIB ═════════════════════════════════════
 * Même forme que les deux autres relais transversaux de la course —
 * `features/run/runResult.ts` (verdict serveur) et `features/run/finishedTrace.ts`
 * (tracé mesuré) : un singleton de MODULE, armé par le producteur, lu par
 * l'écran, purgé au DÉPART de chaque course. On y ajoute la seule chose qu'ils
 * n'ont pas et dont E27 a besoin : un abonnement, parce qu'un fait peut arriver
 * pendant que l'écran est ouvert (le drain de la file d'envoi différé).
 * Aucune dépendance nouvelle.
 *
 * ═══ LE JOURNAL APPARTIENT À UNE SORTIE, ET À UNE SEULE (27/07/2026) ════════
 * Correctif du défaut le plus grave qu'ait porté ce module. Le journal était
 * GLOBAL et purgé au seul départ de course : tout ce que l'appareil publiait
 * ensuite y entrait, quelle que soit la sortie concernée. Deux chemins de
 * production versaient donc les faits d'une AUTRE course dans le journal de la
 * course en cours :
 *   · le drain de la file d'envoi différé (`pendingUpload`), déclenché à CHAQUE
 *     retour au premier plan (`app/_layout.tsx`) — donc en pleine course, au
 *     moindre déverrouillage d'écran : une sortie d'hier partait, et son
 *     `server_accepted` peignait « analyse terminée » sur E27 pour une course
 *     qui, elle, dormait encore en file ;
 *   · la clôture d'une course interrompue écartée (`useRealRunCore.discardStored`,
 *     bouton « Ignorer » de la carte de reprise), atteignable PENDANT la course.
 * Une phase `complete` est définitive (`isSettled`) : ces faits-là ne pouvaient
 * plus être corrigés par quoi que ce soit.
 *
 * D'où la règle, tenue par le TRANSPORT et pas par ses appelants : le journal
 * appartient à un `clientRunId` (`beginSyncFactRun`), et un fait publié pour un
 * autre `runId` n'y entre pas, n'est diffusé à personne, et n'existe donc pas.
 * Publier exige de NOMMER la sortie — on ne peut plus l'oublier par distraction.
 *
 * ═══ MÉMOIRE SEULE, ET C'EST UNE RÈGLE, PAS UN RACCOURCI ════════════════════
 * RIEN ici ne touche le disque. Un fait de synchronisation périmé, relu au
 * prochain démarrage, ferait mentir un écran neuf : il raconterait l'envoi de la
 * sortie d'avant-hier comme s'il était en cours. Ce qui doit survivre à un kill
 * survit déjà ailleurs et honnêtement (la file FIFO persistée, `pendingUpload`).
 *
 * ═══ LE JOURNAL EXISTE PARCE QUE L'ÉCRAN ARRIVE APRÈS ═══════════════════════
 * Sur le chemin nominal, `useRealRunCore.finish()` ATTEND `uploadOrQueue` avant
 * de rendre la main (useRealRunCore.ts:488) : E27 s'ouvre donc quand l'envoi est
 * déjà tranché. Un bus purement « live » ne lui livrerait jamais rien. D'où le
 * journal : l'écran rejoue les faits DÉJÀ survenus pour cette sortie.
 *
 * ⚠ REJOUER N'EST PAS ANIMER. Le rejeu est un `reduce` SYNCHRONE : l'écran
 * atterrit d'un coup sur l'état terminal réel. Aucune horloge, aucun délai,
 * aucune étape ne « défile » — c'est exactement ce qu'exige un écran rouvert par
 * lien profond ou par retour arrière.
 *
 * ═══ INCAPABLE DE FAIRE ÉCHOUER UN ENVOI ════════════════════════════════════
 * Les producteurs sont les DEUX chemins d'envoi du produit. `publishSyncFact`
 * est donc synchrone, sans I/O, et ne jette JAMAIS : un abonné qui explose est
 * journalisé et ignoré, et le corps entier est ceinturé. Observer ne doit rien
 * pouvoir coûter à la course.
 *
 * PUR au sens du dépôt (zéro import React / RN / stockage / réseau) : testé sous
 * Deno (`syncFactBus.test.ts`).
 */
import type { RunSyncFact, SyncFact } from './analysisMachine';

/**
 * Plafond du journal. Un drain de file peut produire deux faits par entrée
 * (12 entrées au plafond, `PENDING_QUEUE_MAX_ENTRIES`), et l'écran peut rester
 * ouvert plusieurs reprises : 64 laisse une marge large tout en bornant la
 * mémoire. Au-delà on garde les DERNIERS — les faits terminaux (verdict rendu,
 * refus, mise en file) sont les plus récents, et ce sont eux qui décident de
 * l'état affiché.
 */
export const MAX_RECORDED_FACTS = 64;

type Listener = (fact: SyncFact) => void;

/**
 * LA SORTIE À QUI CE JOURNAL APPARTIENT (`clientRunId`), ou `null` — aucune
 * course n'a été ouverte dans cette session de l'app (démarrage à froid, écran
 * atteint par lien profond). `null` n'est pas « toutes les sorties » : c'est
 * « aucune », et tout fait publié est alors écarté. Un drain d'arrière-plan
 * lancé au lancement de l'app ne peut donc rien raconter à personne.
 */
let ownerRunId: string | null = null;
let recorded: SyncFact[] = [];
const listeners = new Set<Listener>();

/**
 * Ce qu'un abonnement rend : les faits DÉJÀ survenus, et de quoi se détacher.
 * Les deux arrivent ensemble, et c'est essentiel — voir `subscribeSyncFacts`.
 */
export interface SyncFactSubscription {
  /** Les faits journalisés à l'instant EXACT de l'abonnement. */
  readonly recorded: readonly SyncFact[];
  /** Détache l'abonné. Idempotent. */
  readonly unsubscribe: () => void;
}

/**
 * PUBLIE UN FAIT, POUR UNE SORTIE NOMMÉE. À n'appeler qu'au moment où il a
 * RÉELLEMENT eu lieu : juste avant un appel réseau qui part, juste après une
 * écriture qui échoue. Jamais « parce qu'on va sans doute le faire », jamais
 * pour combler une étape vide.
 *
 * `runId` est le `clientRunId` de la sortie CONCERNÉE — celui du payload qu'on
 * envoie, pas « la course qu'on regarde ». Un fait qui ne concerne pas la sortie
 * propriétaire du journal est ÉCARTÉ : ni journalisé, ni diffusé. C'est le seul
 * endroit du dépôt qui décide de ça, et c'est volontaire — un appelant ne peut
 * pas oublier un filtre qu'il n'a pas à écrire.
 *
 * Ne jette jamais, ne bloque jamais, ne fait aucun I/O.
 */
export function publishSyncFact(fact: SyncFact, runId: string): void {
  try {
    // Fait d'une AUTRE sortie (drain de la file, course interrompue écartée) :
    // il n'a rien à dire de la sortie qu'on regarde. Il n'entre pas.
    if (runId !== ownerRunId) return;
    recorded.push(fact);
    if (recorded.length > MAX_RECORDED_FACTS) {
      recorded = recorded.slice(recorded.length - MAX_RECORDED_FACTS);
    }
    // Copie de la liste : un abonné qui se détache pendant la diffusion ne doit
    // pas décaler l'itération (et E27 se détache bel et bien au démontage).
    for (const listener of [...listeners]) {
      try {
        listener(fact);
      } catch (e) {
        // Un écran qui explose ne fait pas échouer une course.
        console.warn('[syncFactBus] abonné en erreur (ignoré)', e);
      }
    }
  } catch (e) {
    console.warn('[syncFactBus] publication impossible (ignorée)', e);
  }
}

/**
 * Publie une suite de faits DÉJÀ RATTACHÉS chacun à sa sortie, dans l'ordre.
 * C'est la forme que rend `factsFromDrain` : un drain touche plusieurs sorties
 * en un passage, et chacune emporte son propre verdict. Mêmes garanties.
 */
export function publishRunSyncFacts(items: readonly RunSyncFact[]): void {
  for (const item of items) publishSyncFact(item.fact, item.runId);
}

/**
 * S'abonne ET récupère le journal, EN UN SEUL PAS. C'est volontaire : lire le
 * journal puis s'abonner en deux temps laisse une fenêtre où un fait publié
 * entre les deux serait soit perdu, soit compté DEUX fois (et `attempts`
 * mentirait sur le nombre de tentatives réellement parties). Ici, il n'y a pas
 * d'entre-deux.
 */
export function subscribeSyncFacts(listener: Listener): SyncFactSubscription {
  const snapshot = recorded.slice();
  listeners.add(listener);
  return {
    recorded: snapshot,
    unsubscribe: () => {
      listeners.delete(listener);
    },
  };
}

/** Les faits journalisés pour la sortie courante (lecture seule). */
export function syncFactLog(): readonly SyncFact[] {
  return recorded;
}

/**
 * La sortie à qui le journal appartient, ou `null`. Lecture publique parce
 * qu'un lecteur qui interroge le monde (`observeSync.runRealRetry`) doit savoir
 * DE QUELLE sortie il parle avant d'adopter le verdict d'un drain qui en a
 * touché plusieurs.
 */
export function syncFactRunId(): string | null {
  return ownerRunId;
}

/**
 * OUVRE LE JOURNAL D'UNE SORTIE : purge tout, et désigne son propriétaire.
 * À appeler AU DÉPART d'une course, jamais à l'arrivée — exactement comme
 * `clearLastRunResult()` et `clearFinishedTrace()`, et pour la même raison :
 * entre la fin et le Résultat, E27 doit encore pouvoir le lire. Sans cette
 * purge, la sortie N+1 rejouerait la synchronisation de la sortie N.
 *
 * `runId` est le `clientRunId` de la course qui commence. `null` = plus aucune
 * sortie ne possède le journal : tout fait publié est alors écarté (c'est l'état
 * d'ouverture de l'app, et l'isolation utilisée par les tests).
 *
 * ⚠ À RAPPELER SI L'IDENTITÉ DE LA COURSE CHANGE EN CHEMIN. C'est exactement ce
 * qui arrive à la REPRISE d'une course interrompue : `resumeStored` reconstruit
 * le tracker sous le `runId` de la course reprise (idempotence serveur), donc la
 * sortie qui finira ne porte plus le `runId` stampé au départ.
 *
 * Les ABONNÉS ne sont pas touchés : un écran ouvert reste branché.
 */
export function beginSyncFactRun(runId: string | null): void {
  ownerRunId = runId;
  recorded = [];
}
