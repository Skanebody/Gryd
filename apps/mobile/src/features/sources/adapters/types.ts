/**
 * GRYD — interface adaptateur unique des sources connectées (AMENDEMENT-15 §3).
 * Chaque source (Strava, Apple Health, montres…) implémente ce contrat ; le
 * Verify Hub (app/sources.tsx) n'affiche QUE des états réels retournés ici —
 * plus aucun statut de démo. États honnêtes :
 *  - `connected`       : liaison réelle active (token stocké sur l'appareil) ;
 *  - `disconnected`    : action faisable maintenant (CTA actif) ;
 *  - `app_only`        : l'action existe mais pas ICI (aperçu web : pas de
 *                        sélecteur de fichier natif) — CTA inactif, phrase vraie ;
 *  - `needs_keys`      : clés/API absentes (O-point fondateur) — CTA inactif ;
 *  - `needs_dev_build` : nécessite un dev build natif (O8) — CTA inactif ;
 *  - `coming_soon`     : programme partenaire non ouvert — non connectable.
 *
 * PÉRIMÈTRE 5 (21/07/2026) : les trois derniers états ne sont plus ATTEIGNABLES
 * depuis l'écran — les sources qui les portaient (Strava, Apple Health, Health
 * Connect, montres) ont été RETIRÉES du catalogue tant qu'elles dépendent d'une
 * intervention du fondateur (clés, entitlement, programme partenaire). Les
 * adaptateurs restent en place, prêts à être re-listés en une ligne.
 * Aucune valeur de jeu ici : le trust affiché est de la copy (catalog.ts), la
 * décision capture/stats reste 100 % serveur (strava_import / ingest_run).
 */
import type { Entry } from '../../../i18n/types';
import type { SourceTrustLevel } from '../catalog';

/** État réel d'une source — les 4 états AMENDEMENT-15 + « prêt à connecter ». */
export type SourceAdapterStatus =
  | 'connected'
  | 'disconnected'
  | 'app_only'
  | 'needs_keys'
  | 'needs_dev_build'
  | 'coming_soon';

/** Photographie de l'état d'une source à l'instant T (retour de status()). */
export interface SourceAdapterSnapshot {
  status: SourceAdapterStatus;
  /** ISO de la dernière synchro réussie, null si jamais synchronisée. */
  lastSync: string | null;
  /**
   * Une phrase FR courte et honnête pour l'UI (jamais de blâme, GO-first).
   * Legacy : réservé aux adaptateurs non listés (strava/appleHealth/…). Toute
   * phrase AFFICHÉE aujourd'hui passe par `detailEntry` (i18n 5 langues).
   */
  detail?: string;
  /** Phrase traduite (Entry ×5) — prioritaire sur `detail` côté écran. */
  detailEntry?: Entry;
  /** Variables d'interpolation de `detailEntry` (ex. { n: 412 }). */
  detailVars?: Record<string, string | number>;
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
