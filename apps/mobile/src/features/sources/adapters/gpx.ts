/**
 * GRYD — adaptateur « Import GPX » (AMENDEMENT-15 §3). L'alternative GRATUITE à
 * Strava (dont l'API est passée payante, O7) : n'importe quelle montre / app de
 * course exporte un fichier .gpx, et ce fichier EST la source directe de la
 * trace → trust ÉLEVÉ (catalog.ts). On le parse LOCALEMENT (gpx-parse.ts, pur)
 * en RunPoint[] — le même contrat que le tracker GPS et l'import HealthKit —
 * puis le pipeline serveur existant (ingest_run) reste SEUL juge du claim (§3.2).
 *
 * Statut HONNÊTE : la sélection d'un vrai fichier exige un sélecteur natif
 * (expo-document-picker) hors stack imposée et un dev build (O8). Plutôt que de
 * mentir avec un faux « Connecté », connect() lance une DÉMO honnête : il parse
 * l'échantillon GPX embarqué (gpx-demo.ts) pour prouver le pipeline de bout en
 * bout, et l'expose comme tel dans le Hub. Aucune exception ne remonte à l'UI.
 *
 * Chemin d'intégration réel (à câbler dès O8, PAS de lib hors stack sans besoin) :
 *  1. deps : expo-document-picker (pickAsync type 'application/gpx+xml,.gpx').
 *  2. lire le fichier (expo-file-system readAsStringAsync) → parseGpx(xml).
 *  3. RunPoint[] → IngestRunRequest (clientRunId, source, startedAt = 1er point)
 *     → ingest_run : le serveur valide (§3.2), déduplique (Activity Hub §4) et
 *     décide capture/stats. Le client n'attribue JAMAIS un hex.
 */
import type { SourceAdapter, SourceAdapterSnapshot } from './types';
import { parseGpx } from './gpx-parse';
import { DEMO_GPX } from './gpx-demo';

/** Faisable maintenant : le CTA « Connecter » lance la démo d'import (honnête). */
const READY: SourceAdapterSnapshot = {
  status: 'disconnected',
  lastSync: null,
  detail: 'Importe un fichier .gpx exporté par ta montre',
};

/**
 * Résultat de la démo d'import : on parse l'échantillon embarqué et on rapporte
 * honnêtement combien de points la trace produit — la preuve visible que le
 * parseur pur fonctionne, sans prétendre à une capture (décision serveur).
 */
function demoImport(): SourceAdapterSnapshot {
  const { points, trackpointCount } = parseGpx(DEMO_GPX);
  if (points.length === 0) {
    // Ne devrait pas arriver avec l'échantillon ; filet honnête si l'entrée casse.
    return { ...READY, detail: 'Aucun point exploitable — fichier .gpx invalide' };
  }
  return {
    status: 'connected',
    lastSync: new Date().toISOString(),
    detail: `Démo : ${points.length}/${trackpointCount} points lus (sélecteur natif — O8)`,
  };
}

export const gpxAdapter: SourceAdapter = {
  id: 'gpx',
  trustLevel: 'high', // le fichier .gpx est la source directe (catalog §6)
  status: () => Promise.resolve(READY),
  connect: () => Promise.resolve(demoImport()),
  disconnect: () => Promise.resolve(READY),
};
