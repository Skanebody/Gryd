/**
 * GRYD — source de position d'une course dans le NAVIGATEUR (21/07/2026).
 *
 * CE MODULE N'EST PAS UNE SIMULATION. Il n'existe ici aucune trace scriptée,
 * aucun point de départ par défaut, aucune vitesse inventée : chaque fix vient
 * de `navigator.geolocation.watchPosition`, c'est-à-dire du capteur RÉEL de la
 * machine. Une course enregistrée depuis localhost est donc une VRAIE course —
 * le moteur (engine/gps.ts) la nettoie et la juge exactement comme sur iPhone,
 * et le serveur (ingest_run) reste seul décideur du claim.
 *
 * CE QU'IL NE SAIT PAS FAIRE, ET QUI EST DIT À L'ÉCRAN :
 *  - pas d'enregistrement en arrière-plan. Un navigateur suspend ou étrangle
 *    la géolocalisation d'un onglet caché : `background` vaut `null` côté
 *    adaptateur, et la course affiche « garde cet onglet au premier plan ».
 *    On n'annonce jamais une fiabilité qu'on n'a pas.
 *  - pas de réglages système à ouvrir : `openSettings` vaut `null`, et l'UI
 *    n'affiche alors aucun bouton qui ne mènerait nulle part.
 *  - précision très variable. Sur un ordinateur sans GPS, la position vient du
 *    wifi (souvent > 100 m) : au-delà de GPS_ACCURACY_MAX_M, le moteur REJETTE
 *    ces points, la distance reste à 0,00 km et le bandeau « position
 *    approximative » s'affiche. C'est le comportement CORRECT — mieux vaut
 *    zéro mètre honnête que des mètres inventés par triangulation wifi.
 *
 * Contexte sécurisé requis par la spec : `localhost` en fait partie, donc
 * l'aperçu du fondateur fonctionne sans HTTPS.
 */
import { GPS_ACCURACY_MAX_M } from '@klaim/shared';
import { EVENTS, track } from '../../../lib/analytics';
import {
  checkForegroundPermission,
  requestForegroundPermission,
} from '../../map/webGeolocation';
import type { RawFix } from './engine/gps';
import type { AcquireResult, RunLocationAdapter, RunWatchHandle } from './locationAdapter';

/** L'API existe-t-elle ? (SSR / export statique : `navigator` peut être absent.) */
function geolocation(): Geolocation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.geolocation ?? null;
}

/**
 * GeolocationPosition → RawFix. Une `accuracy` non finie (polyfill exotique)
 * est remplacée par GPS_ACCURACY_MAX_M : le point reste dans la trace mais pèse
 * « faible » dans la jauge de confiance — jamais une fausse certitude. Même
 * traitement que le provider natif (provider.ts `toRawFix`).
 */
function toRawFix(pos: GeolocationPosition): RawFix {
  const accuracy = pos.coords.accuracy;
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    ts: pos.timestamp,
    accuracy: Number.isFinite(accuracy) ? accuracy : GPS_ACCURACY_MAX_M,
    ...(pos.coords.speed !== null && pos.coords.speed >= 0 ? { speed: pos.coords.speed } : {}),
  };
}

/**
 * Permission au premier GO. Trois issues, trois phrases distinctes à l'écran —
 * aucune ne se replie sur une course fabriquée :
 *  - `no-sensor` : ce navigateur (ou cette page non sécurisée) n'a pas d'API de
 *    géolocalisation du tout ;
 *  - `denied` : refus explicite, seul cas où l'on parle de refus ;
 *  - `position-unavailable` : ni accordé ni refusé — le capteur n'a rien rendu
 *    (localisation OS coupée, timeout). On ne l'impute PAS à l'utilisateur.
 */
async function acquireWeb(): Promise<AcquireResult> {
  if (!geolocation()) return { ok: false, reason: 'no-sensor' };
  let perm = await checkForegroundPermission();
  if (perm.status !== 'granted') {
    // Le web n'a pas de « request » séparé : c'est la première lecture de
    // position qui ouvre l'invite du navigateur, et son issue EST la réponse.
    perm = await requestForegroundPermission();
    track(EVENTS.permissionLocation, { result: perm.status, platform: 'browser' });
  }
  if (perm.status === 'granted') return { ok: true };
  if (perm.status === 'denied') return { ok: false, reason: 'denied' };
  return { ok: false, reason: 'position-unavailable' };
}

/**
 * Flux de positions RÉELLES pendant la course. Pas de `timeout` : un capteur
 * lent ne doit pas couper l'abonnement — l'absence de fix est déjà racontée
 * honnêtement par `signalState` (« GPS faible » puis « signal perdu »).
 * `maximumAge: 0` : on veut des positions FRAÎCHES, jamais un point en cache
 * rejoué comme s'il était neuf.
 */
function watchPositionWeb(onFix: (fix: RawFix) => void): Promise<RunWatchHandle> {
  const api = geolocation();
  // Aucun capteur : on ne pousse RIEN. Le tracker restera à 0 fix et l'écran
  // affichera « recherche GPS… » puis « signal perdu » — la vérité.
  if (!api) return Promise.resolve({ remove: () => {} });
  const id = api.watchPosition(
    (pos) => onFix(toRawFix(pos)),
    () => {
      // Erreur transitoire (position momentanément introuvable) : on ne coupe
      // pas l'abonnement et on n'invente pas de point — le moteur verra le trou.
    },
    { enableHighAccuracy: true, maximumAge: 0 },
  );
  return Promise.resolve({ remove: () => api.clearWatch(id) });
}

/** La source de position du navigateur : vraie, mais premier plan seulement. */
export const WEB_RUN_ADAPTER: RunLocationAdapter = {
  platform: 'browser',
  acquire: acquireWeb,
  /**
   * Safari n'implémente pas `permissions.query({name:'geolocation'})` : il
   * répondrait « je ne sais pas » à chaque sondage. On ne signale donc un
   * retrait d'autorisation QUE lorsque le navigateur l'affirme — sinon on
   * afficherait « autorisation coupée » à quelqu'un en pleine course.
   */
  isStillGranted: async () => (await checkForegroundPermission()).status !== 'denied',
  watchPosition: watchPositionWeb,
  // Aucun réglage système à ouvrir depuis une page web : l'UI n'affiche pas de
  // bouton qui ne mènerait nulle part (elle explique où régler ça à la place).
  openSettings: null,
  // Aucun enregistrement en arrière-plan : la limite est ANNONCÉE, jamais
  // masquée par une demande de permission qui n'existe pas.
  background: null,
};
