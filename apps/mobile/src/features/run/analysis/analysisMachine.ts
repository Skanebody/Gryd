/**
 * GRYD — E27 « Analyse et synchronisation » : LA MACHINE À ÉTATS, PURE.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md l.1254-1268.)
 *
 * ═══ POURQUOI CET ÉCRAN EST LE PLUS FACILE À TRUQUER ════════════════════════
 * E27 tient entre la fin de l'effort et le verdict. C'est le moment où le
 * joueur ne peut RIEN vérifier — donc le moment où une barre qui se remplit
 * toute seule passerait inaperçue. La spec l'interdit en une ligne
 * (« progression non artificielle »), la constitution en une autre (« l'app ne
 * ment jamais »). Ce module est la réponse structurelle : l'écran n'a AUCUNE
 * horloge, AUCUN `setTimeout`, AUCUN pourcentage. Il ne peut avancer que parce
 * qu'un FAIT lui est rapporté.
 *
 * D'où la forme : une machine qui ne bouge QUE sur `SyncFact`, et un écran qui
 * ne fabrique jamais de fait. Les faits viennent de `observeSync.ts`, qui les
 * lit sur des modules réels (la file d'envoi différé, le verdict serveur
 * capturé, la trace mesurée, la présence d'un backend). Si rien ne se passe,
 * l'écran ne bouge pas — et c'est exactement ce qu'il doit faire.
 *
 * ═══ CE QU'IL N'Y A PAS ICI, ET C'EST VOLONTAIRE ════════════════════════════
 *  · AUCUNE BARRE DE PROGRESSION, aucun `progress: number`. Un pourcentage
 *    suppose qu'on connaisse le travail restant : ni le réseau ni `ingest_run`
 *    ne le disent. Une barre serait donc, par construction, inventée.
 *  · AUCUNE DURÉE, aucun « environ 10 s ». Personne ne sait quand le réseau
 *    revient.
 *  · AUCUN `Date.now()`. La machine est déterministe : mêmes faits, même état.
 *
 * ═══ LES TROIS ÉTAPES, ET LEUR HONNÊTETÉ EXACTE ═════════════════════════════
 * La spec liste « sécurisation ; analyse de boucle ; validation territoriale ».
 * Les deux dernières se déroulent DANS LE MÊME appel `ingest_run` : le client
 * n'a aucun moyen de savoir quand l'une finit et l'autre commence. Les peindre
 * séparément, en les faisant avancer chacune leur tour, serait précisément la
 * progression artificielle interdite. Les étapes servies sont donc les trois
 * transitions que le client OBSERVE réellement (même raisonnement que le
 * catalogue i18n `analyse.ts`, écrit avant ce module) :
 *
 *   1. `secure`  — la sortie est écrite/à l'abri sur l'appareil ;
 *   2. `upload`  — elle quitte l'appareil (ou attend un réseau) ;
 *   3. `analyse` — le serveur a répondu : boucle ET territoire jugés.
 *
 * ⚠ LIMITE ASSUMÉE, ÉCRITE PLUTÔT QUE MASQUÉE : avec un unique aller-retour
 * HTTP, le client n'a aucun accusé de réception intermédiaire. `upload` et
 * `analyse` basculent donc à `done` au MÊME instant (la réponse prouve à la
 * fois la réception et le jugement), et l'étape 3 n'est jamais vue « active »
 * sur le chemin direct. Le fait `server_ack` existe pour le jour où le rail
 * d'ingestion émettra une vraie réception (job asynchrone, websocket) ; AUCUN
 * observateur ne l'émet aujourd'hui, et personne n'a le droit de l'émettre
 * « pour faire joli ». C'est la seule façon honnête de tenir la promesse
 * « trois étapes visibles » sans fabriquer la troisième.
 *
 * ═══ L'ÉCHEC EST UN ÉTAT, PAS UNE ABSENCE ═══════════════════════════════════
 * Réseau coupé, serveur en erreur et course refusée sont TROIS phases
 * distinctes, et aucune ne se confond avec « en cours » :
 *   · `deferred`     — hors ligne, la sortie est EN FILE : elle partira ;
 *   · `unstored`     — hors ligne ET pas en file (stockage KO / file au
 *                      plafond) : elle n'est QUE dans le buffer de course ;
 *   · `server_error` — le serveur a répondu en erreur (5xx / 429) ;
 *   · `rejected`     — le serveur a JUGÉ et refusé (4xx hors 429) : retenter
 *                      rendrait le même verdict (idempotence `clientRunId`),
 *                      donc aucune reprise n'est proposée ;
 *   · `no_backend`   — aucun serveur configuré : rien n'est attendu ;
 *   · `no_run`       — aucune sortie à analyser ;
 *   · `unreadable`   — l'issue existe mais cet écran ne peut pas la lire. C'est
 *                      le « échec de chargement » de la constitution : on ne
 *                      devine pas, on le DIT.
 *
 * PUR : zéro import React / RN / stockage / réseau, aucune horloge. Testé sous
 * Deno (`analysisMachine.test.ts`) — un test par transition ET par échec.
 */
import { isPermanentHttpStatus } from '../../../lib/pendingUploadQueue';

/** Les trois étapes VISIBLES de E27, dans l'ordre. */
export const ANALYSIS_STEPS = ['secure', 'upload', 'analyse'] as const;
export type AnalysisStepId = (typeof ANALYSIS_STEPS)[number];

/**
 * L'état d'UNE étape. Sept valeurs, et pas une de moins : chacune existe parce
 * que deux situations RÉELLEMENT différentes se lisaient autrement à
 * l'identique. Le test `chaque phase a une signature d'étapes UNIQUE` est né
 * exactement de là — il a attrapé « pas de backend », « issue illisible » et
 * « sécurisée, envoi pas encore parti » qui peignaient les trois mêmes lignes.
 * Trois situations, une seule image : c'est un mensonge d'écran, même sans un
 * seul mot faux.
 */
export type StepStatus =
  /** Pas commencée. Sans cette valeur, une étape à venir se lirait « en cours ». */
  | 'pending'
  /** Vraiment en train de se faire (un travail est en vol). */
  | 'active'
  /** Vraiment terminée (un fait l'atteste). */
  | 'done'
  /** Arrêtée en attendant une condition hors de notre contrôle (le réseau). */
  | 'waiting'
  /** Arrêtée sans aboutir. */
  | 'failed'
  /** Ne peut PAS avoir lieu ici (aucun serveur configuré). Ni attente, ni échec. */
  | 'unavailable'
  /** Son issue existe peut-être, mais cet écran ne peut pas la lire. */
  | 'unknown';

/** Où en est la synchronisation, du point de vue de l'écran. */
export type AnalysisPhase =
  /** Étape 1 en cours : la sortie est en train d'être mise à l'abri. */
  | 'securing'
  /** Étape 1 faite, l'envoi n'a pas encore commencé. */
  | 'secured'
  /** La requête est en vol. */
  | 'uploading'
  /** Le serveur a accusé réception et juge (voir la limite en en-tête). */
  | 'analysing'
  /** Le serveur a rendu son verdict : E27 a fini son travail. */
  | 'complete'
  /** Hors ligne : la sortie est EN FILE et repartira au premier réseau. */
  | 'deferred'
  /** Ni envoyée ni mise en file : elle n'est que dans le buffer de course. */
  | 'unstored'
  /** Le serveur a répondu en erreur (5xx / 429). */
  | 'server_error'
  /** Le serveur a jugé et refusé (4xx hors 429). */
  | 'rejected'
  /** Aucun backend configuré : rien n'est attendu, rien n'est promis. */
  | 'no_backend'
  /** Aucune sortie à analyser (écran ouvert hors contexte, lien profond). */
  | 'no_run'
  /** L'issue existe mais cet écran ne sait pas la lire. Jamais devinée. */
  | 'unreadable';

/**
 * UN FAIT rapporté à la machine. Chaque variante correspond à quelque chose
 * qu'un observateur a RÉELLEMENT constaté — jamais à un tic d'horloge.
 */
export type SyncFact =
  /** La sortie est durablement tenue sur l'appareil (file ou buffer écrit). */
  | { readonly kind: 'local_saved' }
  /** Le stockage local a échoué : la sortie n'est nulle part de sûr. */
  | { readonly kind: 'local_save_failed' }
  /** Aucun backend n'est configuré (O1) : il n'y a rien à envoyer. */
  | { readonly kind: 'no_backend' }
  /** Il n'y a aucune sortie à analyser. */
  | { readonly kind: 'no_run' }
  /** Une sortie existe, mais son issue n'est pas lisible depuis cet écran. */
  | { readonly kind: 'outcome_unreadable' }
  /** Une tentative d'envoi vient de PARTIR (requête en vol). */
  | { readonly kind: 'upload_started' }
  /**
   * Le serveur a accusé RÉCEPTION sans encore juger. Aucun rail n'émet ce fait
   * aujourd'hui (cf. en-tête) : ne l'émettre que sur un vrai accusé.
   */
  | { readonly kind: 'server_ack' }
  /** Le serveur a répondu SANS erreur : le verdict est rendu. */
  | { readonly kind: 'server_accepted' }
  /** Le serveur a répondu EN ERREUR. Le statut décide refus vs panne. */
  | { readonly kind: 'server_replied_error'; readonly httpStatus: number }
  /** Pas de réseau : la sortie est entrée dans la file d'envoi différé. */
  | { readonly kind: 'offline_queued'; readonly queueDepth: number }
  /** La sortie n'a PAS pu être mise en file (stockage KO / file au plafond). */
  | { readonly kind: 'not_stored'; readonly reason: 'storage' | 'queue_full' }
  /** Le joueur a demandé une reprise, et une tentative RÉELLE vient de partir. */
  | { readonly kind: 'retry_started' };

/** `queueDepth` inconnu — jamais 0, qui affirmerait « file vide ». */
export const QUEUE_DEPTH_UNKNOWN = -1;

/** Aucun statut HTTP connu — jamais 200, qui affirmerait « succès ». */
export const HTTP_STATUS_NONE = 0;

export interface AnalysisState {
  readonly phase: AnalysisPhase;
  /** Statut HTTP du dernier verdict serveur, ou `HTTP_STATUS_NONE`. */
  readonly httpStatus: number;
  /** Sorties en attente d'envoi, tel que la file l'a rendu, ou `QUEUE_DEPTH_UNKNOWN`. */
  readonly queueDepth: number;
  /** Tentatives d'envoi RÉELLEMENT parties depuis l'ouverture de l'écran. */
  readonly attempts: number;
}

/** État d'ouverture : l'écran n'affirme encore rien d'autre que « je regarde ». */
export const INITIAL_ANALYSIS_STATE: AnalysisState = {
  phase: 'securing',
  httpStatus: HTTP_STATUS_NONE,
  queueDepth: QUEUE_DEPTH_UNKNOWN,
  attempts: 0,
};

/**
 * Phases DÉFINITIVES : plus rien ne peut les faire bouger, pas même une
 * reprise. `rejected` en fait partie — le serveur a jugé, et l'idempotence
 * `clientRunId` garantit qu'un renvoi rendrait le MÊME verdict : proposer
 * « Réessayer » serait un bouton mort au sens de la constitution.
 */
export function isSettled(phase: AnalysisPhase): boolean {
  return (
    phase === 'complete' || phase === 'rejected' || phase === 'no_backend' || phase === 'no_run'
  );
}

/** Un travail est-il RÉELLEMENT en vol ? (Rien d'autre n'a le droit d'animer.) */
export function isWorking(phase: AnalysisPhase): boolean {
  return phase === 'securing' || phase === 'uploading' || phase === 'analysing';
}

/**
 * Une reprise peut-elle CHANGER quelque chose ? Seules les phases où un
 * nouveau travail a une prise réelle : hors ligne (le réseau peut être revenu,
 * la file est là et se draine), serveur en panne (elle peut avoir cessé),
 * issue illisible (une relecture du stockage peut aboutir).
 *
 * ⚠ `unstored` N'EN FAIT PAS PARTIE, et c'est un correctif, pas un oubli. Une
 * sortie « non stockée » n'est NI en file NI accessible à cet écran (son
 * payload vit dans le buffer de course, que E27 ne touche pas) : « Réessayer »
 * n'aurait rien à renvoyer et échouerait TOUJOURS — un bouton mort au sens
 * exact de la constitution. Ce qui la sauve est ailleurs et déjà vrai : les
 * clés de la course ne sont pas purgées et elle est re-proposée au prochain GO
 * (useRealRunCore.ts:494-499). C'est ce que dit la copie, et rien de plus.
 */
export function canRetry(phase: AnalysisPhase): boolean {
  return phase === 'deferred' || phase === 'server_error' || phase === 'unreadable';
}

/**
 * L'unique réducteur. Déterministe, total (tout fait a une réponse), et
 * IMMUABLE : un fait qui n'a pas de sens dans la phase courante rend l'état
 * INCHANGÉ (même référence) plutôt qu'un état à moitié faux.
 *
 * Règle d'ordre : une phase définitive absorbe tout. Un observateur qui relit
 * l'état du monde après coup peut donc rejouer ses faits sans jamais
 * « dé-terminer » un verdict déjà rendu.
 */
export function reduceAnalysis(state: AnalysisState, fact: SyncFact): AnalysisState {
  if (isSettled(state.phase)) return state;

  switch (fact.kind) {
    case 'local_saved':
      // N'avance que depuis l'étape 1 : une sortie déjà en vol ne « re-sécurise »
      // pas, et le dire ferait reculer l'écran.
      return state.phase === 'securing' ? { ...state, phase: 'secured' } : state;

    case 'local_save_failed':
      return { ...state, phase: 'unstored' };

    case 'no_backend':
      return { ...state, phase: 'no_backend' };

    case 'no_run':
      return { ...state, phase: 'no_run' };

    case 'outcome_unreadable':
      return { ...state, phase: 'unreadable' };

    case 'upload_started':
    case 'retry_started':
      // `retry_started` n'est accepté QUE depuis une phase où une reprise a un
      // sens : sinon le compteur de tentatives mentirait sur ce qui est parti.
      if (fact.kind === 'retry_started' && !canRetry(state.phase)) return state;
      return { ...state, phase: 'uploading', attempts: state.attempts + 1 };

    case 'server_ack':
      // Un accusé de réception ne vaut que pendant un envoi en vol.
      return state.phase === 'uploading' ? { ...state, phase: 'analysing' } : state;

    case 'server_accepted':
      return { ...state, phase: 'complete' };

    case 'server_replied_error':
      return {
        ...state,
        // Une SEULE source de vérité pour « le serveur a jugé » : la même
        // fonction que la file d'envoi différé (pendingUploadQueue). Deux
        // définitions du « rejet définitif » finiraient par diverger.
        phase: isPermanentHttpStatus(fact.httpStatus) ? 'rejected' : 'server_error',
        httpStatus: fact.httpStatus,
      };

    case 'offline_queued':
      return { ...state, phase: 'deferred', queueDepth: fact.queueDepth };

    case 'not_stored':
      return { ...state, phase: 'unstored' };
  }
}

/** Rejoue une suite de faits depuis un état donné (relecture d'observation). */
export function reduceAnalysisAll(
  state: AnalysisState,
  facts: readonly SyncFact[],
): AnalysisState {
  return facts.reduce(reduceAnalysis, state);
}

/**
 * L'état des TROIS étapes pour une phase donnée. C'est ici — et nulle part
 * ailleurs — que se décide ce que la liste d'étapes affiche. Chaque phase a une
 * signature DISTINCTE : aucune ne peut être confondue avec une autre à l'écran
 * (invariant vérifié par un test).
 */
export function stepStatuses(phase: AnalysisPhase): Readonly<Record<AnalysisStepId, StepStatus>> {
  switch (phase) {
    case 'securing':
      return { secure: 'active', upload: 'pending', analyse: 'pending' };
    case 'secured':
      return { secure: 'done', upload: 'pending', analyse: 'pending' };
    case 'uploading':
      return { secure: 'done', upload: 'active', analyse: 'pending' };
    case 'analysing':
      return { secure: 'done', upload: 'done', analyse: 'active' };
    case 'complete':
      return { secure: 'done', upload: 'done', analyse: 'done' };
    case 'deferred':
      // L'envoi ATTEND un réseau : ce n'est ni en cours, ni un échec.
      return { secure: 'done', upload: 'waiting', analyse: 'pending' };
    case 'unstored':
      // C'est l'étape 1 qui a échoué : la sortie n'est pas à l'abri.
      return { secure: 'failed', upload: 'pending', analyse: 'pending' };
    case 'server_error':
      return { secure: 'done', upload: 'failed', analyse: 'pending' };
    case 'rejected':
      // Le serveur a bien REÇU (l'envoi a donc abouti) puis refusé : c'est
      // l'analyse qui se solde par un refus, pas l'envoi qui a raté.
      return { secure: 'done', upload: 'done', analyse: 'failed' };
    case 'no_backend':
      // ⚠ CORRECTIF 27/07 — l'étape 1 valait `done` ici, avec le commentaire
      // « la sortie est à l'abri ». Elle ne l'est pas : sans backend,
      // `uploadOrQueue` sort en 'none' AVANT la file, et `finish()` purge
      // ensuite les clés de la course. Rien n'écrit la sortie sur le disque sur
      // ce chemin — l'app affirmait « Sortie enregistrée sur ton appareil » sur
      // un fait que personne n'avait observé.
      // Les TROIS étapes sont donc `unavailable` : aucune n'a lieu ici, et
      // « pending » suggérerait qu'elles vont avoir lieu, ce qui est FAUX tant
      // qu'O1 est ouvert.
      return { secure: 'unavailable', upload: 'unavailable', analyse: 'unavailable' };
    case 'unreadable':
      // ⚠ CORRECTIF 27/07 — l'étape 1 valait `done` (« la sortie existe sur
      // l'appareil, seul fait établi ») : ce n'était justement PAS établi. Cette
      // phase est atteinte file VIDE ou file ILLISIBLE ; dans les deux cas
      // personne n'a vu la sortie écrite quelque part. Les trois étapes sont
      // `unknown` — l'écran dit qu'il ne sait pas, ce qui est la vérité.
      return { secure: 'unknown', upload: 'unknown', analyse: 'unknown' };
    case 'no_run':
      return { secure: 'pending', upload: 'pending', analyse: 'pending' };
  }
}

/**
 * Combien d'étapes sont RÉELLEMENT terminées (a11y « étape n sur 3 »). Jamais
 * un pourcentage : c'est un compte de faits.
 */
export function doneStepCount(phase: AnalysisPhase): number {
  const s = stepStatuses(phase);
  return ANALYSIS_STEPS.filter((id) => s[id] === 'done').length;
}

/**
 * La liste des étapes à AFFICHER, ou `null` quand il n'y a rien à raconter
 * (aucune sortie à analyser). Un écran sans sortie ne doit pas peindre trois
 * lignes grises qui suggèrent qu'un traitement existe.
 */
export function visibleSteps(phase: AnalysisPhase): readonly AnalysisStepId[] | null {
  return phase === 'no_run' ? null : ANALYSIS_STEPS;
}

/**
 * Traduit le verdict d'envoi utilisé partout ailleurs dans le dépôt
 * (`useRealRunCore.uploadOrQueue` : 'sent' | 'rejected' | 'queued' | 'lost' |
 * 'none') en fait de synchronisation. Une seule table de correspondance, pour
 * que le jour où E26 passera son verdict à E27, personne n'ait à le
 * ré-interpréter à la main.
 *
 * ⚠ `queueDepth` n'est pas connu de ce verdict : il arrive en paramètre, et
 * vaut `QUEUE_DEPTH_UNKNOWN` tant que la file n'a pas été relue.
 */
export type FinishUploadVerdict = 'sent' | 'rejected' | 'queued' | 'lost' | 'none';

export function factFromFinishVerdict(
  verdict: FinishUploadVerdict,
  queueDepth: number = QUEUE_DEPTH_UNKNOWN,
): SyncFact {
  switch (verdict) {
    case 'sent':
      return { kind: 'server_accepted' };
    case 'rejected':
      // Le statut exact n'est pas propagé par `finish()` — on ne l'invente pas.
      // 400 est le représentant NEUTRE de la classe « 4xx hors 429 », la seule
      // information réellement portée par le verdict 'rejected'.
      return { kind: 'server_replied_error', httpStatus: 400 };
    case 'queued':
      return { kind: 'offline_queued', queueDepth };
    case 'lost':
      return { kind: 'not_stored', reason: 'storage' };
    case 'none':
      return { kind: 'no_backend' };
  }
}
