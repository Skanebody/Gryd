/**
 * GRYD — types du sélecteur de course de course-live (AMENDEMENT-15 §2).
 * Fichier PUR (aucun import natif) partagé entre useRealRunCore.ts et ses deux
 * points d'entrée useRealRun.ts (appareil) / useRealRun.web.ts (navigateur) :
 * le contrat est identique sur toutes les plateformes, seule la SOURCE DE
 * POSITION change (voir locationAdapter.ts).
 *
 * MORT DU `kind: 'simulation'` (21/07/2026). Cette branche existait pour servir
 * une course FABRIQUÉE au preview web. Le mode vitrine étant abandonné, plus
 * aucun écran ne la rendait : elle ne produisait qu'un cul-de-sac muet. Elle est
 * remplacée par `unavailable` + une RAISON — le seul cas où GRYD n'enregistre
 * rien est celui où il n'a VRAIMENT pas de position, et il le dit.
 */
import type { Activity, RunMode } from '@klaim/shared';
import type { RunUnavailableReason } from './locationAdapter';
import type { DisciplineChoice2026, TrackerSnapshot } from './tracker';
import type { DisciplineVerdict2026 } from './engine/disciplineCheck2026';

/** API de la course RÉELLE exposée à l'écran (RealCourseLive). */
export interface RealRunApi {
  /** Mode effectif (celui du tracker — une reprise garde le mode d'origine). */
  effectiveMode: RunMode;
  /**
   * DISCIPLINE RÉELLEMENT ENREGISTRÉE (E14, vélo réel 26/07/2026) — celle du
   * tracker, déclarée au départ et figée pour toute la sortie.
   *
   * Elle est EXPOSÉE à l'écran pour deux raisons distinctes, et les deux
   * comptent : l'écran la DIT (personne ne doit découvrir après coup que sa
   * sortie est partie dans l'autre monde), et l'écran s'en sert pour les seuils
   * de FERMETURE DE BOUCLE (1 km à pied, 5 km à vélo) — sans elle, la mise en
   * scène E08 promettrait au cycliste une capture que le serveur refuserait.
   */
  activity: Activity;
  snapshot: TrackerSnapshot;
  /**
   * Où la course s'enregistre. `browser` = aperçu localhost : les positions
   * sont RÉELLES (navigator.geolocation) mais la plateforme ne sait pas
   * enregistrer hors premier plan. Ne change aucun chiffre, seulement la copie.
   */
  platform: 'device' | 'browser';
  /** Bandeau « position approximative » (iOS 14+, Android coarse, wifi navigateur). */
  approxLocation: boolean;
  /** Autorisation retirée EN course (réglages) — pill honnête, jamais bloquant. */
  permissionRevoked: boolean;
  /**
   * Permission arrière-plan (progressive GO-first) :
   *  - hidden : rien à montrer ;
   *  - offer  : rationale une phrase (retour d'un passage en fond sans « Toujours ») ;
   *  - denied : refusée → « Course enregistrée quand l'app est ouverte. »
   * Toujours `hidden` là où l'arrière-plan n'existe pas (navigateur) : on ne
   * propose jamais une permission qui n'existe pas.
   */
  bgPrompt: 'hidden' | 'offer' | 'denied';
  /**
   * La plateforme NE SAIT PAS enregistrer hors premier plan (navigateur) : ce
   * n'est pas un refus de l'utilisateur, c'est une limite qu'on annonce.
   */
  foregroundOnlyPlatform: boolean;
  /**
   * Course interrompue (kill process) retrouvée — reprendre ou enregistrer.
   *
   * `resume` vaut `null` quand la sortie interrompue n'est PAS de la même
   * discipline que celle qui vient de démarrer : reprendre, c'est FUSIONNER, et
   * fusionner deux mondes est la somme que la séparation stricte d'E14
   * interdit (cf. `canResumeInterrupted`). L'écran retire alors le bouton
   * plutôt que d'en peindre un qui échouerait — « aucun bouton mort » — et
   * garde la clôture, qui envoie la sortie dans SON monde. `activity` est là
   * pour que la carte le DISE au lieu de laisser un bouton disparaître sans
   * raison visible.
   */
  restore: {
    distanceM: number;
    activity: Activity;
    resume: (() => void) | null;
    /**
     * POURQUOI « Reprendre » n'existe pas, quand `resume` vaut `null`. Un
     * bouton qui disparaît sans raison visible est un état vide muet : l'écran
     * doit pouvoir DIRE laquelle des deux règles s'applique.
     *  · `other_activity` — la sortie retrouvée n'est pas dans la même
     *    discipline (fusionner deux mondes est interdit, E14) ;
     *  · `too_old` — elle date d'au-delà de la fenêtre de reprise : la
     *    rouvrir ferait repartir un chrono sur des heures qui n'ont pas été
     *    courues. Elle reste ENTIÈREMENT récupérable par le journal.
     */
    resumeBlocked: 'other_activity' | 'too_old' | null;
    discard: () => void;
  } | null;
  /** Ouvrir les réglages système — `null` dans un navigateur (il n'y en a pas). */
  openSettings: (() => void) | null;
  allowBackground: () => void;
  dismissBackground: () => void;
  togglePause: () => void;
  /**
   * TOUR MANUEL (« lap », LOT R) — pose une marque horodatée sur la sortie.
   * Rend `false` quand le geste tombe sous `LIVE_LAP_MIN_DURATION_S` (double
   * appui, rebond tactile) : l'écran n'a alors rien à annoncer, il a déjà
   * désactivé le bouton via `canMarkLap`.
   */
  markLap: () => boolean;
  /**
   * Le bouton « Tour » est-il actionnable MAINTENANT ? Recalculé à chaque tick
   * (1 Hz) : le bouton se DÉSACTIVE pendant le plancher au lieu de refuser en
   * silence, parce qu'« aucun bouton mort » vaut aussi pour un bouton qui ne
   * fait rien une seconde sur cinq.
   */
  canMarkLap: boolean;
  /**
   * Fin de course : arrêt propre capteurs/tâche, payload IngestRunRequest réel
   * envoyé via Supabase SI session réelle, buffer purgé. Résout les stats
   * réelles pour la navigation. `uploadQueued` : l'envoi a échoué (hors-ligne)
   * et la course attend en file — message discret « Course enregistrée —
   * envoi dès que possible » (anti-shame, jamais bloquant).
   */
  /**
   * « LA TRACE RACONTE-T-ELLE UNE AUTRE DISCIPLINE ? » (12/09/2026)
   *
   * Lecture PURE, à appeler AVANT `finish`. Elle ne bascule rien et ne signale
   * rien au serveur : elle rend les CHIFFRES MESURÉS pour que l'écran de fin
   * puisse poser la question avec eux, au lieu d'un soupçon nu.
   *
   * `suspected === null` (rien d'anormal, ou aucun podomètre) ⇒ aucune question
   * n'est posée, et `finish()` s'appelle sans argument, exactement comme avant.
   */
  disciplineVerdict: () => DisciplineVerdict2026;
  /**
   * `choice` : ce que le joueur a répondu à « Un problème avec ta sortie ».
   * ABSENT = aucune question posée. Basculer re-nettoie la trace aux bornes de
   * la nouvelle discipline ; garder marque la sortie « sport seulement ».
   */
  finish: (choice?: DisciplineChoice2026) => Promise<{ distanceM: number; durationS: number; uploadQueued: boolean; localId?: string }>;
}

/**
 * API du PRÉFLIGHT (E06) exposée à l'écran AVANT le départ réel. Aucune de ces
 * valeurs n'est fabriquée : `status` vient du résultat d'acquisition RÉEL
 * (permission accordée + services on, `approximate` = position grossière connue
 * dès l'acquisition). `confirmStart` est le SEUL point qui construit le tracker
 * (stampe `startedAt` + ouvre le flux GPS) — appelé par le compte à rebours, à
 * sa FIN : le décompte ne compte donc AUCUNE seconde de course, et une
 * annulation ne laisse AUCUNE course fantôme (aucun tracker n'a été construit).
 */
export interface PreflightApi {
  /** 'ready' = permission accordée + services on + position précise ;
   *  'approximate' = position grossière. Détecté au préflight sur ANDROID
   *  (permission « coarse »). Sur iOS, la précision réduite n'est PAS lisible
   *  ici : elle est signalée PENDANT la course (bannière `approxLocation`) — donc
   *  pré-course, iOS reste 'ready'. On ne prétend jamais détecter ce qu'on ne lit pas. */
  status: 'ready' | 'approximate';
  platform: 'device' | 'browser';
  /** La plateforme ne sait pas enregistrer hors premier plan (navigateur). */
  foregroundOnlyPlatform: boolean;
  /** Ouvrir les réglages système — `null` dans un navigateur (il n'y en a pas). */
  openSettings: (() => void) | null;
  /**
   * L'ENREGISTREMENT ÉCRAN VERROUILLÉ, PROPOSÉ AVANT LA SORTIE (G07).
   *
   * `null` là où l'arrière-plan n'existe pas (navigateur) : on ne propose
   * jamais une permission introuvable. `offer` n'est vrai que si la plateforme
   * sait le faire, que la permission n'est PAS déjà accordée, et qu'on ne l'a
   * jamais demandée sur cet appareil — un refus est une réponse, et cette
   * question ne se repose pas à chaque départ.
   *
   * `allow` demande la permission système SANS ouvrir aucun capteur : le
   * tracker n'existe pas encore, et démarrer la tâche d'arrière-plan avant le
   * GO enregistrerait une sortie que personne n'a lancée.
   */
  background: { offer: boolean; allow: () => void; decline: () => void } | null;
  /**
   * PAUSE AUTOMATIQUE, réglée AVANT la sortie (cahier §8.2 : « désactivée par
   * défaut, réglage personnel » à pied ; « proposée » à vélo). Une préférence
   * PAR DISCIPLINE : les deux mondes n'ont ni le même besoin ni le même défaut.
   * `value` rend `null` tant que le stockage n'a pas répondu — on n'affiche
   * alors aucun état plutôt qu'un état supposé.
   */
  autoPause: {
    value: (activity: Activity) => boolean | null;
    set: (activity: Activity, value: boolean) => void;
  };
  /**
   * Démarre la course RÉELLE (tracker + capteurs). Appelé À LA FIN du compte à
   * rebours uniquement. Idempotent (jamais deux trackers).
   *
   * E14 — `activity` est OBLIGATOIRE, et c'est tout l'intérêt : on ne peut pas
   * démarrer une sortie sans DIRE ce qu'on est en train de faire. Le cœur ne
   * devine rien ; il lisait auparavant la préférence d'AFFICHAGE de la carte
   * (`gryd.mapactivity`), si bien qu'une lentille Bike oubliée transformait une
   * vraie course à pied en sortie vélo — bornes anti-triche à 80 km/h et
   * univers de territoire que la lentille Run n'affiche jamais.
   *
   * 26/07/2026 — la valeur passée ici n'est PLUS toujours `run` : le préflight
   * affiche la discipline déclarée par le chemin de départ et laisse la
   * corriger avant le GO (cf. `runActivity.ts`). Ce qui reste verrouillé, c'est
   * que la valeur vient d'un ÉCRAN qui l'a montrée au joueur, jamais d'un
   * réglage lu en silence.
   */
  confirmStart: (activity: Activity, sharedMapParticipation?: boolean) => void;
  /** Compte à rebours annulé : rien à défaire (tracker jamais construit). */
  cancel: () => void;
}

/** Résultat du sélecteur : course réelle, démarrage en cours, ou rien à mesurer. */
export type RealRunGate =
  /** Permission/position en cours de résolution — l'écran le DIT (jamais de noir muet). */
  | { kind: 'starting' }
  /**
   * E06 — acquisition RÉUSSIE, course pas encore démarrée : l'écran de préflight
   * confirme les conditions puis lance le compte à rebours. Le tracker n'existe
   * PAS encore (cf. PreflightApi.confirmStart).
   */
  | { kind: 'preflight'; preflight: PreflightApi }
  /**
   * Aucune position réelle disponible → AUCUNE course. `reason` porte la
   * phrase exacte à afficher : jamais un état vide opaque, jamais une course
   * fabriquée à la place de la sienne.
   */
  | { kind: 'unavailable'; reason: RunUnavailableReason }
  | { kind: 'real'; run: RealRunApi };
