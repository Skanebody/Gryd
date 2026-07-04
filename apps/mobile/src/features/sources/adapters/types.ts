/**
 * GRYD — interface adaptateur unique des sources connectées (AMENDEMENT-15 §3).
 * Chaque source (Strava, Apple Health, montres…) implémente ce contrat ; le
 * Verify Hub (app/sources.tsx) n'affiche QUE des états réels retournés ici —
 * plus aucun statut de démo. États honnêtes :
 *  - `connected`       : liaison réelle active (token stocké sur l'appareil) ;
 *  - `disconnected`    : connexion faisable maintenant (CTA Connecter actif) ;
 *  - `needs_keys`      : clés/API absentes (O-point fondateur) — CTA inactif ;
 *  - `needs_dev_build` : nécessite un dev build natif (O8) — CTA inactif ;
 *  - `coming_soon`     : programme partenaire non ouvert — non connectable.
 * Aucune valeur de jeu ici : le trust affiché est de la copy (catalog.ts), la
 * décision capture/stats reste 100 % serveur (strava_import / ingest_run).
 */
import type { SourceTrustLevel } from '../catalog';

/** État réel d'une source — les 4 états AMENDEMENT-15 + « prêt à connecter ». */
export type SourceAdapterStatus =
  | 'connected'
  | 'disconnected'
  | 'needs_keys'
  | 'needs_dev_build'
  | 'coming_soon';

/** Photographie de l'état d'une source à l'instant T (retour de status()). */
export interface SourceAdapterSnapshot {
  status: SourceAdapterStatus;
  /** ISO de la dernière synchro réussie, null si jamais synchronisée. */
  lastSync: string | null;
  /** Une phrase FR courte et honnête pour l'UI (jamais de blâme, GO-first). */
  detail?: string;
}

/** Contrat unique — chaque source du Verify Hub passe par cette interface. */
export interface SourceAdapter {
  /** Clé du catalogue (catalog.ts) : 'strava', 'apple_health', 'garmin'… */
  id: string;
  /** Niveau de confiance GRYD Verify de la source (copy, décision serveur). */
  trustLevel: SourceTrustLevel;
  /** Lance la connexion réelle (OAuth…) ; retourne l'état résultant. */
  connect(): Promise<SourceAdapterSnapshot>;
  /** Coupe la liaison locale (oubli du token appareil). */
  disconnect(): Promise<SourceAdapterSnapshot>;
  /** État réel courant, sans effet de bord. */
  status(): Promise<SourceAdapterSnapshot>;
  /** Re-synchronise les activités récentes (sources connectées uniquement). */
  sync?(): Promise<SourceAdapterSnapshot>;
}
