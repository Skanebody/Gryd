/**
 * GRYD — E27 : COMMENT UN ÉTAT DU MONDE DEVIENT UN FAIT DE SYNCHRONISATION.
 *
 * `analysisMachine.ts` ne bouge que sur des `SyncFact`. Ce module est le SEUL
 * endroit autorisé à en produire, et il ne le fait qu'à partir de ce qui a été
 * RÉELLEMENT lu. Aucun `setTimeout`, aucun compteur, aucune progression : si
 * rien n'a été observé, aucun fait n'est rendu, et l'écran ne bouge pas.
 *
 * PUR au sens du dépôt (zéro import React / RN / stockage / réseau) : la
 * LECTURE des sources vit dans `observeSync.ts`, qui n'ajoute aucune décision.
 * C'est ce découpage qui rend la table de décision testable sous Deno, là où
 * AsyncStorage et `supabase` n'existent pas.
 *
 * ─── LES QUATRE SOURCES, ET CE QUE CHACUNE PROUVE ───────────────────────────
 *  · `supabase` (lib/supabase.ts:58) — `null` ⇒ aucun backend n'est configuré.
 *    Rien ne sera envoyé : le dire vaut mieux qu'un envoi qui n'arrive jamais.
 *  · `getFinishedTrace()` (features/run/finishedTrace.ts) — la polyligne
 *    MESURÉE par le tracker, armée par `finish()`. Non vide ⇒ une sortie vient
 *    réellement de se terminer sur cet appareil.
 *  · `getLastRunResult()` (features/run/runResult.ts) — le `IngestRunResponse`
 *    capturé quand `ingest_run` a répondu SANS erreur (useRealRunCore.ts:179).
 *    Non nul ⇒ le serveur a rendu son verdict. C'est la seule preuve d'analyse
 *    terminée que le client possède ; elle n'est jamais déduite.
 *  · `pendingUploadCount()` (lib/pendingUpload.ts) — la file FIFO d'envoi
 *    différé. > 0 ⇒ la sortie attend un réseau : ni un succès, ni un échec, et
 *    l'écran le DIT au lieu de faire semblant d'analyser. C'est AUSSI la seule
 *    source qui prouve une écriture disque, donc le seul émetteur légitime de
 *    `local_saved` (voir le correctif du 27/07 sur `factsFromSnapshot`).
 *
 * ─── CE QU'AUCUNE SOURCE NE DIT, ET QU'ON N'AFFIRME DONC PAS ────────────────
 * « La sortie est enregistrée sur l'appareil » en dehors de la file. Rien dans
 * ce dépôt n'écrit la sortie terminée ailleurs : `runJournal` ne persiste qu'un
 * TIMESTAMP (pour la série), `finishedTrace` est un singleton MÉMOIRE, et
 * `finish()` purge les clés de la course dès que le payload est ailleurs.
 *
 * ─── LE CAS QU'ON NE DEVINE PAS ─────────────────────────────────────────────
 * Une trace mesurée, aucun verdict capturé, une file illisible : quelque chose
 * est arrivé à cette sortie, et cet écran ne peut pas dire quoi. Il rend alors
 * `outcome_unreadable` — le troisième des quatre états de la constitution,
 * « échec de chargement ». Choisir « terminé » serait annoncer une conquête sur
 * un refus.
 */
import type { DrainReport } from '../../../lib/pendingUploadQueue';
import { QUEUE_DEPTH_UNKNOWN, type SyncFact } from './analysisMachine';

/** Ce que l'écran a RÉELLEMENT pu lire du monde, à un instant donné. */
export interface SyncSnapshot {
  /** Un backend est-il configuré ? (`supabase !== null`) */
  readonly backendConfigured: boolean;
  /** Points de la trace MESURÉE de la sortie qui vient de finir. */
  readonly tracePoints: number;
  /** Le serveur a-t-il rendu un verdict capturé pour cette sortie ? */
  readonly hasServerVerdict: boolean;
  /** Sorties en file, ou `QUEUE_DEPTH_UNKNOWN` si la file est illisible. */
  readonly queueDepth: number;
  /**
   * E26 a-t-elle passé le relais ? (`courseResultParams` présents dans l'URL.)
   * Faux sur un lien profond nu : l'écran n'a alors AUCUN contexte de sortie.
   */
  readonly fromFinish: boolean;
  /**
   * E26 a-t-elle dit « pas envoyée » (`queued: '1'`) ? C'est le drapeau que
   * `finish()` rend, et il vaut pour DEUX verdicts distincts ('queued' et
   * 'lost', useRealRunCore.ts:506). Croisé avec la file, il les sépare enfin :
   * en file ⇒ différé ; file VIDE ⇒ la sortie n'a même pas pu y entrer.
   */
  readonly queuedHint: boolean;
}

/**
 * Une trace de moins de deux points ne dessine rien et ne prouve rien : c'est
 * le même seuil que le Résultat applique pour refuser d'inventer un segment
 * (features/run/ResultTrace.tsx, docblock « ne rend RIEN sans géométrie »).
 */
export const MIN_TRACE_POINTS = 2;

/** Snapshot d'ouverture quand AUCUNE lecture n'a encore abouti. */
export const UNREAD_SNAPSHOT: SyncSnapshot = {
  backendConfigured: false,
  tracePoints: 0,
  hasServerVerdict: false,
  queueDepth: QUEUE_DEPTH_UNKNOWN,
  fromFinish: false,
  queuedHint: false,
};

/**
 * SNAPSHOT → FAITS. Exhaustive et sans défaut caché : chaque branche est
 * justifiée par ce que les sources PROUVENT, jamais par ce qui « arrive
 * d'habitude ».
 *
 * ═══ CORRECTIF DU 27/07 — LE FAIT QUE CE MODULE FABRIQUAIT ══════════════════
 * `local_saved` était émis EN TÊTE DE CHAQUE BRANCHE, sans qu'aucune source ne
 * l'atteste. C'était le seul fait inventé du dépôt, et il vivait dans le fichier
 * dont l'en-tête promet « il ne le fait qu'à partir de ce qui a été RÉELLEMENT
 * lu ». Le `SyncSnapshot` ne porte AUCUNE lecture d'une écriture disque de la
 * sortie : il lit `supabase`, la trace EN MÉMOIRE, le verdict serveur capturé et
 * la profondeur de file. Rien d'autre.
 *
 * Ce que le code fait vraiment, vérifié ligne à ligne :
 *  · sans backend, `uploadOrQueue` sort en `'none'` AVANT toute mise en file
 *    (useRealRunCore.ts:166), puis `finish()` purge les clés de la course
 *    (`clearCurrentRun` + `clearActiveRun`, useRealRunCore.ts:495-499). Il ne
 *    reste sur l'appareil QUE le singleton mémoire `finishedTrace` (perdu au
 *    prochain lancement) et un timestamp de série (`runJournal`, qui ne stocke
 *    que des millisecondes — pas la sortie). L'écran affirmait pourtant
 *    « Sortie enregistrée sur ton appareil » ;
 *  · pire, la branche `not_stored` émettait `local_saved` ET `not_stored` — deux
 *    faits contradictoires dans le même tableau, dont le second dit exactement
 *    que la sortie n'a PAS pu être stockée.
 *
 * LA SEULE PREUVE DE PERSISTANCE QUE CET ÉCRAN POSSÈDE est `queueDepth > 0` :
 * `pendingUploadCount()` a RELU la file FIFO sur le disque et y a compté des
 * entrées. `local_saved` n'est donc plus émis QUE là. Partout ailleurs, l'étape 1
 * ne prétend plus rien (cf. `stepStatuses`, où `no_backend` la peint
 * `unavailable` et `unreadable` la peint `unknown`).
 */
export function factsFromSnapshot(snap: SyncSnapshot): readonly SyncFact[] {
  const hasRun =
    snap.fromFinish ||
    snap.tracePoints >= MIN_TRACE_POINTS ||
    snap.queueDepth > 0 ||
    snap.hasServerVerdict;
  if (!hasRun) return [{ kind: 'no_run' }];

  if (!snap.backendConfigured) {
    // Sans backend : rien à envoyer, ET rien d'écrit sur le disque (le chemin
    // 'none' ne passe jamais par la file, et les clés de course sont purgées).
    // On ne dit donc QUE ce qui est établi.
    return [{ kind: 'no_backend' }];
  }
  if (snap.hasServerVerdict) {
    // Le verdict PRIME sur tout le reste : une sortie jugée n'est plus en
    // attente, quoi que la file contienne par ailleurs (d'autres sorties).
    // Pas de `local_saved` : sur ce chemin la sortie est chez le SERVEUR, et les
    // clés locales viennent justement d'être purgées.
    return [{ kind: 'server_accepted' }];
  }
  if (snap.queueDepth > 0) {
    // LA SEULE BRANCHE QUI PROUVE UNE PERSISTANCE LOCALE : la file a été relue
    // sur le disque et elle n'est pas vide.
    return [{ kind: 'local_saved' }, { kind: 'offline_queued', queueDepth: snap.queueDepth }];
  }
  if (snap.fromFinish && snap.queuedHint && snap.queueDepth === 0) {
    // E26 affirme que la sortie n'est PAS partie, et la file est vide : elle
    // n'a donc pas pu y entrer (stockage indisponible, ou file au plafond, qui
    // REFUSE au lieu d'écraser). C'est le chemin 'lost' de `useRealRunCore`,
    // et c'est le seul endroit du dépôt où il redevient distinguable de
    // 'queued'. Sans ce croisement, les deux se lisaient « envoi différé » —
    // dont une moitié promettait un envoi qui ne viendrait jamais.
    return [{ kind: 'not_stored', reason: 'storage' }];
  }
  // Reste : file vide (la sortie est partie, mais aucun verdict n'a été
  // capturé — succès à réponse creuse, ou refus définitif) ou file ILLISIBLE.
  // Dans les deux cas l'issue est inconnue de cet écran, et c'est ce qu'il dit.
  return [{ kind: 'outcome_unreadable' }];
}

/**
 * RAPPORT DE RENVOI → FAITS. `null` (aucun rejeu : pas de backend, ou un rejeu
 * déjà en vol) ne produit AUCUN fait : l'écran reste où il est plutôt que de
 * prétendre avoir appris quelque chose.
 *
 * Ordre de lecture : un envoi RÉUSSI prime — c'est le verdict que le joueur
 * attend. Un refus définitif ensuite. Puis la file restante.
 */
export function factsFromDrain(report: DrainReport | null): readonly SyncFact[] {
  if (report === null) return [];
  if (report.sent.length > 0) return [{ kind: 'server_accepted' }];
  if (report.rejected.length > 0) {
    // Le statut exact n'est pas propagé par la file (elle ne conserve que le
    // fait « jugé et refusé »). 400 est le représentant NEUTRE de la classe
    // « 4xx hors 429 » — la seule information réellement portée.
    return [{ kind: 'server_replied_error', httpStatus: 400 }];
  }
  if (report.remaining.length > 0) {
    // `retry_later` (réseau / 5xx / 429) et `no_session` laissent TOUS DEUX la
    // file intacte, et l'écran ne peut pas les distinguer d'ici. Ce qui est
    // vrai dans les deux cas — et tout ce qu'on affirme — c'est que la sortie
    // est gardée et repartira. La copie ne nomme donc AUCUNE cause.
    return [{ kind: 'offline_queued', queueDepth: report.remaining.length }];
  }
  // Rapport VIDE : ni envoi, ni refus, ni reste. Cela veut dire une seule
  // chose — il n'y avait RIEN à envoyer dans la file. Ce n'est pas une issue,
  // c'est une absence d'information, et ça n'enseigne donc AUCUN fait.
  // (Rendre `outcome_unreadable` ici était une faute : le drain aurait
  // « prouvé » que l'issue est illisible alors qu'il n'avait rien regardé —
  // et, sur un écran déjà en `unstored`, il aurait dégradé un diagnostic juste
  // en un diagnostic vague. L'appelant relit le monde à la place.)
  return [];
}
