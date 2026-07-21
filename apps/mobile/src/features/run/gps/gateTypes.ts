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
import type { RunMode } from '@klaim/shared';
import type { RunUnavailableReason } from './locationAdapter';
import type { TrackerSnapshot } from './tracker';

/** API de la course RÉELLE exposée à l'écran (RealCourseLive). */
export interface RealRunApi {
  /** Mode effectif (celui du tracker — une reprise garde le mode d'origine). */
  effectiveMode: RunMode;
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
  /** Course interrompue (kill process) retrouvée — reprendre ou enregistrer. */
  restore: { distanceM: number; resume: () => void; discard: () => void } | null;
  /** Ouvrir les réglages système — `null` dans un navigateur (il n'y en a pas). */
  openSettings: (() => void) | null;
  allowBackground: () => void;
  dismissBackground: () => void;
  togglePause: () => void;
  /**
   * Fin de course : arrêt propre capteurs/tâche, payload IngestRunRequest réel
   * envoyé via Supabase SI session réelle, buffer purgé. Résout les stats
   * réelles pour la navigation. `uploadQueued` : l'envoi a échoué (hors-ligne)
   * et la course attend en file — message discret « Course enregistrée —
   * envoi dès que possible » (anti-shame, jamais bloquant).
   */
  finish: () => Promise<{ distanceM: number; durationS: number; uploadQueued: boolean }>;
}

/** Résultat du sélecteur : course réelle, démarrage en cours, ou rien à mesurer. */
export type RealRunGate =
  /** Permission/position en cours de résolution — l'écran le DIT (jamais de noir muet). */
  | { kind: 'starting' }
  /**
   * Aucune position réelle disponible → AUCUNE course. `reason` porte la
   * phrase exacte à afficher : jamais un état vide opaque, jamais une course
   * fabriquée à la place de la sienne.
   */
  | { kind: 'unavailable'; reason: RunUnavailableReason }
  | { kind: 'real'; run: RealRunApi };
