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
 *
 * ═══ G26 (10/09/2026) — LE RETRAIT SILENCIEUX ÉTAIT AUSSI UN MENSONGE ═══════
 * Le périmètre 5 les avait RETIRÉES de l'écran. La demande du fondateur qu'il
 * appliquait visait un « Bientôt » — une PROMESSE dont la date dépendait de
 * lui. Elle reste tenue : rien ici ne promet quoi que ce soit.
 * Mais le cahier de septembre (rang 0, ADR-012) tranche autrement sur la
 * LISTE : « Liste avec état réel : connecté, synchronisation en attente, action
 * nécessaire, indisponible » et « ne pas montrer Garmin ou Strava comme
 * "connecté" sur la seule présence d'un logo ». Une source absente n'explique
 * rien à qui la cherche, et laisse penser que GRYD l'ignore. Elles reviennent
 * donc avec `availability: 'unavailable'` : un ÉTAT, jamais une échéance, et
 * chacune renvoie vers ce qui marche vraiment — l'import .gpx.
 */
import type { IconName } from '@klaim/shared';
import { C } from '../../i18n/catalog/sources';
import type { Entry } from '../../i18n/types';

/** native = toujours active ; connectable = porte un CTA d'action ;
 * unavailable = listée avec son état réel, sans action (G26). */
export type SourceAvailability = 'native' | 'connectable' | 'unavailable';

/** Niveau de confiance GRYD Verify (élevé = signal direct, moyen = import). */
export type SourceTrustLevel = 'high' | 'medium';

/**
 * Libellés visibles du trust. Ils étaient des `string` FRANÇAISES rendues telles
 * quelles sur CHAQUE ligne du Hub : « Trust élevé » restait en français en
 * anglais, en allemand et en portugais. Ce sont des `Entry` (règle 17).
 */
export const TRUST_LABELS: Record<SourceTrustLevel, Entry> = {
  high: C.trustHigh,
  medium: C.trustMedium,
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
  /** Chemin de vérification visible — `Entry` (il était en français en dur). */
  path: Entry;
  /** Ce que la source apporte. Le Hub écrivait « Fichier .gpx » pour TOUTES
   * ses lignes, ce qui devenait faux dès qu'il y en avait une deuxième. */
  summary: Entry;
  /** État RÉEL d'une source `unavailable` (G26). Obligatoire pour elles : un
   * logo sans état laisse croire à une connexion. */
  state?: Entry;
}

/** Le Hub COMPLET : natif, import de fichier, puis les sources listées avec
 * leur état réel. L'ordre est celui de l'utilité décroissante ici et maintenant. */
export const VERIFY_SOURCES: readonly VerifySourceDef[] = [
  {
    key: 'gryd_live',
    name: 'GRYD Live GPS',
    icon: 'gps',
    availability: 'native',
    trust: 'high',
    path: C.pathDirect,
    summary: C.summaryLive,
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
    path: C.pathImport,
    summary: C.summaryGpx,
  },
  // ── G26 : listées, avec leur état, et sans aucune échéance promise ────────
  // Aucune n'a d'adaptateur : `sourceRowKind` rend 'unavailable' pour elles,
  // ce qui évite le « Lecture… » éternel d'un statut qui ne viendra jamais.
  {
    key: 'health',
    name: 'Santé',
    icon: 'performance',
    availability: 'unavailable',
    trust: 'medium',
    path: C.pathImport,
    summary: C.summaryHealth,
    state: C.stateHealth,
  },
  {
    key: 'strava',
    name: 'Strava',
    icon: 'lien',
    availability: 'unavailable',
    trust: 'medium',
    path: C.pathImport,
    summary: C.summaryStrava,
    state: C.stateStrava,
  },
  {
    key: 'garmin',
    name: 'Garmin',
    icon: 'lien',
    availability: 'unavailable',
    trust: 'medium',
    path: C.pathImport,
    summary: C.summaryGarmin,
    state: C.stateGarmin,
  },
];
