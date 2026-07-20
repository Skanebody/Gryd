/**
 * GRYD — catalogue du GRYD VERIFY HUB (AMENDEMENT-10 §6, copy trust par source).
 * Ici : identité/copy UNIQUEMENT — les STATUTS réels viennent des adaptateurs
 * (adapters/registry, AMENDEMENT-15 §3). Aucune valeur de jeu ici.
 *
 * ═══ PÉRIMÈTRE 5 (21/07/2026) — « pas de bientôt qui dépend du fondateur » ═══
 * Le Hub n'affiche plus QUE les sources réellement utilisables aujourd'hui, sans
 * aucune action du fondateur. Toutes les autres ont été RETIRÉES de l'écran
 * plutôt que laissées en « Bientôt » (demande fondateur explicite). Leur code
 * reste en place — les re-lister est une ligne ici + une ligne dans registry.ts :
 *
 *  · Strava          → adaptateur (adapters/strava.ts) + edge `strava_import`
 *                      COMPLETS. Manque : une app API Strava (client ID public
 *                      + client secret) que seul le titulaire du compte peut
 *                      créer. Détail dans docs/BACKLOG-SOURCES.md.
 *  · Apple Health    → entitlement `com.apple.developer.healthkit` sur le compte
 *                      développeur Apple + module natif + dev build.
 *  · Health Connect  → permissions Android health.READ_* + module natif + build.
 *  · Garmin / WHOOP / Fitbit / Polar / Coros / Suunto
 *                    → programmes partenaires (comptes développeur à demander,
 *                      revue et délais côté constructeur).
 *
 * Ce qui RESTE, et qui marche vraiment :
 *  · GRYD Live GPS — capture directe native, toujours active ;
 *  · Import GPX    — un fichier .gpx exporté par n'importe quelle montre ou app
 *                    de course EST la source directe de la trace. Sélecteur de
 *                    fichier natif → parse local → ingest_run (seul juge).
 */
import type { IconName } from '@klaim/shared';

/** native = toujours active ; connectable = porte un CTA d'action. */
export type SourceAvailability = 'native' | 'connectable';

/** Niveau de confiance GRYD Verify (élevé = signal direct, moyen = import). */
export type SourceTrustLevel = 'high' | 'medium';

/** Libellés FR visibles du trust (copy AMENDEMENT-10 §6). */
export const TRUST_LABELS: Record<SourceTrustLevel, string> = {
  high: 'Trust élevé',
  medium: 'Trust moyen',
};

/**
 * Nature du CTA d'une source connectable — le libellé du bouton en dépend :
 *  - `connect` : liaison durable (OAuth…) → « Connecter » / « Connecté » ;
 *  - `import`  : action PONCTUELLE et répétable → « Importer », jamais un état
 *                « connecté » mensonger pour ce qui est un choix de fichier.
 */
export type SourceActionKind = 'connect' | 'import';

export interface VerifySourceDef {
  key: string;
  name: string;
  /** Icône filaire de la source (gps pour le Live GPS, lien sinon). */
  icon: IconName;
  availability: SourceAvailability;
  /** Nature du CTA (sources connectables). Défaut `connect`. */
  action?: SourceActionKind;
  trust: SourceTrustLevel;
  /** Chemin de vérification visible (« Capture directe », « Import + vérif »). */
  path: string;
}

/** Sources RÉELLEMENT disponibles — natif d'abord, puis import de fichier. */
export const VERIFY_SOURCES: readonly VerifySourceDef[] = [
  {
    key: 'gryd_live',
    name: 'GRYD Live GPS',
    icon: 'gps',
    availability: 'native',
    trust: 'high',
    path: 'Capture directe',
  },
  {
    // Le fichier .gpx est la trace elle-même (pas un résumé) → trust élevé. Parse
    // local (adapters/gpx-parse.ts, pur et testé) → RunPoint[], puis le pipeline
    // serveur (ingest_run §3.2) reste SEUL juge du claim.
    key: 'gpx',
    name: 'Import GPX',
    icon: 'lien',
    availability: 'connectable',
    action: 'import',
    trust: 'high',
    path: 'Import + vérif',
  },
];
