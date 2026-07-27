/**
 * GRYD — E19 : le SONDAGE DE PRÉCISION pré-course, dans le NAVIGATEUR.
 *
 * Jumeau web de `preflightProbe.ts` (résolu par l'extension de plateforme, même
 * patron que `useRealRun.web.ts`). Il lit `navigator.geolocation`, c'est-à-dire
 * le capteur RÉEL de la machine — rien n'est simulé ici non plus.
 *
 * ─── CE QU'IL DIT QUAND IL N'Y A RIEN À MESURER ─────────────────────────────
 * Sur un ordinateur sans GPS, la position vient du wifi et sa précision se
 * compte en centaines de mètres : l'anneau affichera une bande ROUGE, ce qui
 * est la VÉRITÉ, et E19 ne peindra aucun départ « propre ». Et lorsque l'API
 * n'existe pas du tout (page non sécurisée, navigateur ancien), on ne peint
 * AUCUN anneau : la consigne est explicite — là où aucun capteur ne répond, on
 * ne dessine pas un cadran qui ne mesure rien.
 *
 * `accuracy` est obligatoire dans la spec Geolocation, mais un polyfill peut
 * rendre autre chose : une valeur non finie devient `null` (« non mesuré »),
 * jamais un chiffre de remplissage.
 */
export interface PreflightProbeHandlers {
  /** Précision horizontale RÉELLE (m), ou `null` si la plateforme n'en chiffre pas. */
  onAccuracy: (accuracyM: number | null) => void;
  /** Aucune position mesurable ici : l'écran ne peint alors aucun anneau. */
  onUnavailable: () => void;
}

function geolocation(): Geolocation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.geolocation ?? null;
}

export function subscribePreflightAccuracy(h: PreflightProbeHandlers): () => void {
  const api = geolocation();
  if (!api) {
    h.onUnavailable();
    return () => {};
  }
  let stopped = false;
  const id = api.watchPosition(
    (pos) => {
      if (stopped) return;
      const a = pos.coords.accuracy;
      h.onAccuracy(typeof a === 'number' && Number.isFinite(a) ? a : null);
    },
    (err) => {
      if (stopped) return;
      // Une erreur TRANSITOIRE (position momentanément introuvable) ne dit rien
      // de définitif : on garde l'abonnement et l'écran reste en « Recherche du
      // signal ». Seul un refus ferme la question — et il est définitif, donc on
      // le nomme au lieu de faire tourner un anneau pour toujours.
      if (err.code === err.PERMISSION_DENIED) h.onUnavailable();
    },
    { enableHighAccuracy: true, maximumAge: 0 },
  );
  return () => {
    stopped = true;
    api.clearWatch(id);
  };
}
