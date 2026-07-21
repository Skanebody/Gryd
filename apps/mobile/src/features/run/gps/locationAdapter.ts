/**
 * GRYD — contrat de la SOURCE DE POSITION d'une course (21/07/2026).
 *
 * POURQUOI CE FICHIER EXISTE. `useRealRun.web.ts` était un stub qui renvoyait
 * `{ kind: 'simulation' }`. Depuis l'abandon du mode vitrine, plus personne ne
 * rend de course simulée : `course-live.tsx` tombait donc sur « rien à
 * enregistrer ici » À TOUS LES COUPS sur localhost. La boucle centrale du
 * produit — GO → course-live → course-result → /partage — était injouable sur
 * le seul instrument de contrôle du fondateur.
 *
 * Le navigateur a pourtant une VRAIE API de géolocalisation
 * (`navigator.geolocation.watchPosition`), qui rend de VRAIES positions du
 * VRAI appareil. Une course enregistrée depuis le navigateur est donc une VRAIE
 * course : rien n'y est fabriqué, les mètres viennent du capteur, le moteur
 * (engine/gps.ts) nettoie et juge exactement comme sur iPhone, et le serveur
 * (ingest_run) reste seul décideur du claim. Aucune règle n'est violée.
 *
 * Ce que ce contrat sépare : la SEULE chose qui change entre iPhone et
 * navigateur, c'est la façon de lire la position et ce que la plateforme sait
 * faire (arrière-plan, réglages système). Toute l'orchestration — permission,
 * tracker, autosave, reprise après kill, envoi ingest_run — vit une seule fois
 * dans `useRealRunCore.ts`. Même cœur, deux capteurs.
 *
 * Ce que ce contrat n'autorise PAS : aucune implémentation ne peut fabriquer un
 * fix. Une source qui n'a pas de position renvoie une RAISON, jamais un point
 * inventé — et l'écran affiche cette raison.
 */
import type { RawFix } from './engine/gps';

/**
 * Pourquoi aucune course ne peut être enregistrée. Chaque valeur correspond à
 * UNE phrase à l'écran (état vide honnête) : jamais un « rien à enregistrer
 * ici » opaque qui laisse le coureur sans action.
 */
export type RunUnavailableReason =
  /** L'utilisateur (ou la politique du navigateur) a REFUSÉ la position. */
  | 'denied'
  /** Localisation du téléphone coupée au niveau de l'OS (natif). */
  | 'services-off'
  /** Aucune API de géolocalisation ici (navigateur trop ancien, page non sécurisée). */
  | 'no-sensor'
  /** Autorisation ni accordée ni refusée : le capteur n'a rendu aucune position. */
  | 'position-unavailable';

/** Issue de la demande de position au démarrage de la course. */
export type AcquireResult = { ok: true } | { ok: false; reason: RunUnavailableReason };

/** Abonnement au flux de positions — coupé à la fin de course / au démontage. */
export interface RunWatchHandle {
  remove(): void;
}

/**
 * Enregistrement quand l'app n'est plus au premier plan. `null` côté adaptateur
 * quand la plateforme ne sait pas le faire (navigateur) : l'UI ne propose alors
 * JAMAIS une permission qui n'existe pas — elle dit la limite à la place.
 */
export interface RunBackgroundSupport {
  checkGranted(): Promise<boolean>;
  request(): Promise<boolean>;
  setFixListener(listener: ((fixes: RawFix[]) => void) | null): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Fixes reçus par la tâche pendant que personne n'écoutait (relance headless). */
  drainQueuedFixes(): Promise<RawFix[]>;
}

/** La source de position d'une plateforme. Une implémentation par cible. */
export interface RunLocationAdapter {
  /**
   * Où la course est enregistrée. Ne change AUCUN chiffre — seulement la copie
   * des états (parler de « Réglages » n'a aucun sens dans un navigateur).
   */
  platform: 'device' | 'browser';
  /** Permission + service : accordé, ou la RAISON exacte du refus. */
  acquire(): Promise<AcquireResult>;
  /**
   * Re-vérification EN COURSE (autorisation retirée depuis les réglages).
   * `false` uniquement quand la plateforme l'affirme — un « je ne sais pas »
   * ne doit jamais afficher « autorisation coupée » à quelqu'un qui court.
   */
  isStillGranted(): Promise<boolean>;
  /** Flux de positions RÉELLES. Aucune implémentation n'a le droit d'en inventer. */
  watchPosition(onFix: (fix: RawFix) => void): Promise<RunWatchHandle>;
  /** Ouvrir les réglages système — `null` quand il n'y en a pas (navigateur). */
  openSettings: (() => void) | null;
  /** Suivi arrière-plan — `null` quand la plateforme ne sait pas le faire. */
  background: RunBackgroundSupport | null;
}
