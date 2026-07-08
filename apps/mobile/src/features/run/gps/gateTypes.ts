/**
 * GRYD — types du sélecteur réel/simulation de course-live (AMENDEMENT-15 §2).
 * Fichier PUR (aucun import natif) partagé entre useRealRun.ts (natif) et
 * useRealRun.web.ts (stub) : le contrat est identique sur toutes les
 * plateformes, seule l'implémentation change.
 */
import type { RunMode } from '@klaim/shared';
import type { TrackerSnapshot } from './tracker';

export interface TraceGeoPoint {
  lat: number;
  lng: number;
}

/** API de la course RÉELLE exposée à l'écran (RealCourseLive). */
export interface RealRunApi {
  /** Mode effectif (celui du tracker — une reprise garde le mode d'origine). */
  effectiveMode: RunMode;
  snapshot: TrackerSnapshot;
  /** Trace GPS lissée (mise à jour ~1 Hz). */
  traceGeo: readonly TraceGeoPoint[];
  /** Bandeau « Active la position exacte » (iOS approximatif / Android coarse). */
  approxLocation: boolean;
  /** Autorisation retirée EN course (réglages) — pill honnête, jamais bloquant. */
  permissionRevoked: boolean;
  /**
   * Permission arrière-plan (progressive GO-first) :
   *  - hidden : rien à montrer ;
   *  - offer  : rationale une phrase (retour d'un passage en fond sans « Toujours ») ;
   *  - denied : refusée → « Course enregistrée quand l'app est ouverte. »
   */
  bgPrompt: 'hidden' | 'offer' | 'denied';
  /** Course interrompue (kill process) retrouvée — reprendre ou enregistrer. */
  restore: { distanceM: number; resume: () => void; discard: () => void } | null;
  openSettings: () => void;
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
  finish: () => Promise<{
    distanceM: number;
    durationS: number;
    uploadQueued: boolean;
    clientRunId: string;
    ingestSent: boolean;
  }>;
}

/** Résultat du sélecteur : vrai GPS, simulation démo, ou démarrage en cours. */
export type RealRunGate =
  /** Permission/service en cours de résolution (natif, quelques instants). */
  | { kind: 'starting' }
  /** Web, refus ou localisation coupée → simulation démo INCHANGÉE (+ phrase). */
  | { kind: 'simulation'; notice: string | null }
  | { kind: 'real'; run: RealRunApi };
