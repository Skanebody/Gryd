/**
 * GRYD — E19 : le SONDAGE DE PRÉCISION pré-course, sur APPAREIL (natif).
 *
 * L'anneau de précision d'E19 n'a de valeur que s'il mesure quelque chose de
 * réel. Ce module est ce quelque chose : il ouvre `expo-location` et rend la
 * précision horizontale RENDUE PAR LE CAPTEUR, telle quelle. Il n'y a ici ni
 * valeur de départ, ni moyenne, ni valeur de repli.
 *
 * ─── POURQUOI IL N'UTILISE PAS `provider.watchPosition` ─────────────────────
 * `provider.toRawFix` remplace une `accuracy` absente par `GPS_ACCURACY_MAX_M`
 * (35 m). C'est le bon choix pour le MOTEUR — un point sans précision connue
 * doit peser « faible » dans la jauge de confiance plutôt que passer pour
 * excellent. Mais à l'écran, cette substitution afficherait une bande ROUGE
 * « 35 m » mesurée sur un chiffre que le téléphone n'a jamais donné. E19 lit
 * donc `coords.accuracy` brut et transmet `null` quand il n'y en a pas : le
 * module pur (`preflightSignal.ts`) sait alors ne peindre AUCUN anneau plutôt
 * que d'en peindre un faux.
 *
 * ─── POURQUOI `BestForNavigation` ───────────────────────────────────────────
 * C'est exactement le profil que la course ouvrira au départ (provider.ts).
 * Sonder à un profil plus économe afficherait une précision qui n'est pas celle
 * que la sortie aura : l'anneau doit promettre ce qui va réellement se passer.
 *
 * ─── DURÉE DE VIE ───────────────────────────────────────────────────────────
 * Ce flux vit UNIQUEMENT le temps de la phase d'acquisition d'E19, et l'écran
 * le coupe avant d'appeler `confirmStart` : jamais deux abonnements GPS
 * simultanés, jamais un watch orphelin si le joueur annule ou quitte.
 *
 * Fichier NATIF (importe expo-location) — le bundle web résout le jumeau
 * `preflightProbe.web.ts`, même patron que `useRealRun.ts` / `.web.ts`.
 */
import * as Location from 'expo-location';

export interface PreflightProbeHandlers {
  /** Précision horizontale RÉELLE (m), ou `null` si la plateforme n'en chiffre pas. */
  onAccuracy: (accuracyM: number | null) => void;
  /** Aucune position mesurable ici : l'écran ne peint alors aucun anneau. */
  onUnavailable: () => void;
}

/**
 * Ouvre le sondage. Renvoie la fonction d'arrêt, appelable à tout moment — y
 * compris AVANT que l'abonnement asynchrone soit résolu (cas réel : l'écran est
 * démonté pendant que la première position arrive). Le drapeau `stopped` est là
 * pour ça : sans lui, l'abonnement se poserait après coup et ne serait plus
 * jamais retiré.
 */
export function subscribePreflightAccuracy(h: PreflightProbeHandlers): () => void {
  let stopped = false;
  let sub: Location.LocationSubscription | null = null;

  void (async () => {
    try {
      const s = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 0 },
        (loc) => {
          if (stopped) return;
          const a = loc.coords.accuracy;
          h.onAccuracy(typeof a === 'number' && Number.isFinite(a) ? a : null);
        },
      );
      if (stopped) {
        s.remove();
        return;
      }
      sub = s;
    } catch {
      // La permission a été retirée entre l'acquisition et cet écran, ou le
      // service s'est coupé. On ne devine RIEN : l'écran dira qu'il ne mesure
      // pas, et n'affichera pas un anneau vide qui tournerait sans fin.
      if (!stopped) h.onUnavailable();
    }
  })();

  return () => {
    stopped = true;
    sub?.remove();
    sub = null;
  };
}
