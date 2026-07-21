/**
 * GRYD — « OÙ EST LE JOUEUR », et surtout : QUE DIRE quand on ne le sait pas.
 *
 * ─── POURQUOI CE MODULE EXISTE (21/07/2026) ─────────────────────────────────
 * Les deux MapScreen (natif / web) portaient CHACUN leur propre séquence
 * permission → position, écrite deux fois à la main. Elles ont dérivé, et elles
 * partageaient le même cul-de-sac MUET :
 *
 *   const fix = await getCurrentPositionOnce();
 *   if (cancelled || !fix) return;        // ← sortie sans RIEN poser
 *
 * Permission ACCORDÉE + aucun fix (localisation coupée au niveau de l'OS, GPS
 * froid en intérieur, timeout) ⇒ pas de point « moi », pas de message, et un
 * bouton Recentrer qui ne produisait STRICTEMENT rien à l'écran. La carte
 * restait sur le globe entier sans une explication — exactement l'écran-blanc
 * déguisé que la règle « état vide ≠ écran blanc » interdit.
 *
 * Deuxième défaut réparé ici : le RÉSULTAT était réduit à un booléen
 * (`granted`). Tout échec non-permission se retrouvait donc étiqueté « refusé »
 * — un mensonge sur le dos de l'utilisateur, particulièrement sur Safari où
 * `navigator.permissions.query({name:'geolocation'})` n'existe pas et où l'état
 * réel est « je ne sais pas » (voir webGeolocation.ts).
 *
 * Ce module est la SEULE séquence, partagée par les deux variantes. Il ne
 * connaît ni expo-location ni `navigator.geolocation` : le provider lui est
 * passé (`../run/gps/provider` sur natif, `./webGeolocation` sur web), ce qui
 * garantit que localhost et l'iPhone suivent la même logique de décision, à la
 * seule différence des capteurs eux-mêmes.
 */
import type { LatLngPoint } from './realAnchors';

/**
 * Ce que la carte SAIT de la position, et donc ce qu'elle a le droit de dire :
 *  • `locating`    — recherche en cours. On n'affirme rien (chargement ≠ vide).
 *  • `denied`      — l'utilisateur (ou la politique du navigateur) a REFUSÉ.
 *  • `unavailable` — permission acquise ou inconnue, mais AUCUN fix : capteur
 *                    muet, localisation OS coupée, timeout. Ce n'est PAS un
 *                    refus, et l'écran ne doit pas l'appeler ainsi.
 *  • `ok`          — un vrai fix est arrivé ; le point « moi » est légitime.
 */
export type MapLocationState = 'locating' | 'denied' | 'unavailable' | 'ok';

/** État de permission, dans la forme commune aux deux providers. */
interface PermissionState {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

/**
 * Les trois fonctions consommées par la carte. Volontairement structurel (pas
 * d'import de provider ici) : le natif et le web branchent le leur.
 * `getCurrentPositionOnce` est typé au minimum utile — `RawFix` en porte plus,
 * mais la carte ne lit que la latitude et la longitude.
 */
export interface MapLocationProvider {
  checkForegroundPermission: () => Promise<PermissionState>;
  requestForegroundPermission: () => Promise<PermissionState>;
  getCurrentPositionOnce: () => Promise<{ lat: number; lng: number } | null>;
}

/** Issue d'une tentative : un état AFFIRMABLE, et le point s'il existe. */
export interface MapLocationOutcome {
  state: Exclude<MapLocationState, 'locating'>;
  point: LatLngPoint | null;
}

/**
 * Une tentative complète : lire la permission, la demander si c'est encore
 * possible, puis chercher un fix. Ne renvoie JAMAIS « rien » — chacune des trois
 * issues possibles a son état, donc sa phrase à l'écran.
 *
 * ⚠️ `undetermined` n'est PAS traité comme un refus. Safari n'expose pas l'état
 * de la permission géoloc : après une invite acceptée, `checkForegroundPermission`
 * y répond toujours `undetermined`. Conclure « refusé » fermerait la carte à un
 * joueur qui vient d'accepter. On TENTE donc la position, et c'est l'échec (ou
 * non) de cette tentative qui tranche.
 */
export async function resolveLocation(
  provider: MapLocationProvider,
): Promise<MapLocationOutcome> {
  const current = await provider.checkForegroundPermission();
  const permission =
    current.status !== 'granted' && current.canAskAgain
      ? await provider.requestForegroundPermission()
      : current;

  // Seul un refus EXPLICITE ferme la porte (et il reste réouvrable par les
  // réglages système — d'où le message dédié plutôt qu'un silence).
  if (permission.status === 'denied') return { state: 'denied', point: null };

  const fix = await provider.getCurrentPositionOnce();
  if (!fix) return { state: 'unavailable', point: null };
  return { state: 'ok', point: { lat: fix.lat, lng: fix.lng } };
}
