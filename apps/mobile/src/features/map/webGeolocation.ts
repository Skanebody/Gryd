/**
 * GRYD — position réelle du joueur pour la carte, côté WEB.
 *
 * POURQUOI CE FICHIER EXISTE. `MapScreen.web.tsx` importait STATIQUEMENT
 * `../run/gps/provider` — un module dont l'en-tête dit noir sur blanc « fichier
 * natif uniquement : importé via useRealRun.ts / registerBackgroundTask.ts
 * (variantes .web.ts vides) — jamais dans le bundle web ». L'import tirait donc
 * `expo-task-manager` (aucun support web) dans le bundle du navigateur : au
 * mieux du poids mort et un avertissement, au pire un échec de résolution qui
 * casse localhost:8081 — c'est-à-dire le SEUL instrument de contrôle du
 * fondateur tant que le quota de builds Expo est bloqué.
 *
 * Ce que ce module N'EST PAS : un repli de démo. Il n'y a AUCUNE position par
 * défaut, aucune caméra République, aucun fix fabriqué. Sans permission ou sans
 * capteur, il renvoie « refusé » / `null` et la carte le DIT (dataNoteLocationDenied) —
 * exactement comme le natif. La parité localhost ⇄ iPhone tient sur ce point.
 *
 * Surface volontairement IDENTIQUE aux trois fonctions consommées par la carte
 * (checkForegroundPermission / requestForegroundPermission /
 * getCurrentPositionOnce) : MapScreen.web.tsx change d'import, pas de code.
 */
import type { RawFix } from '../run/gps/engine/gps';

/** Même contrat que le provider natif — l'appelant ne distingue pas les deux. */
export interface ForegroundPermissionState {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  /** Le web n'expose pas la distinction fine/coarse d'Android : toujours false. */
  coarseOnly: boolean;
}

const DENIED: ForegroundPermissionState = {
  status: 'denied',
  canAskAgain: false,
  coarseOnly: false,
};
const UNDETERMINED: ForegroundPermissionState = {
  status: 'undetermined',
  canAskAgain: true,
  coarseOnly: false,
};
const GRANTED: ForegroundPermissionState = {
  status: 'granted',
  canAskAgain: false,
  coarseOnly: false,
};

/** L'API existe-t-elle ? (SSR / export statique : `navigator` peut être absent.) */
function geolocation(): Geolocation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.geolocation ?? null;
}

/**
 * Lecture NON INTRUSIVE de l'état de permission.
 *
 * Le navigateur n'a pas d'équivalent de `getForegroundPermissionsAsync` : la
 * Permissions API le donne quand elle est là (Chrome/Firefox/Edge), Safari ne
 * l'implémente pas pour `geolocation`. Dans ce cas on répond `undetermined` +
 * `canAskAgain` — ce qui est la VÉRITÉ (on ne sait pas encore) et laisse
 * l'appelant déclencher l'invite du navigateur, comme au premier lancement iOS.
 */
export async function checkForegroundPermission(): Promise<ForegroundPermissionState> {
  if (!geolocation()) return DENIED;
  const perms = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
  if (!perms?.query) return UNDETERMINED;
  try {
    const status = await perms.query({ name: 'geolocation' as PermissionName });
    if (status.state === 'granted') return GRANTED;
    if (status.state === 'denied') return DENIED;
    return UNDETERMINED;
  } catch {
    // Nom de permission non supporté : on ne conclut PAS « refusé » (ce serait
    // fermer la carte à un joueur qui n'a jamais été interrogé).
    return UNDETERMINED;
  }
}

/**
 * Demande la permission. Le web n'a pas de « request » séparé : c'est le premier
 * appel à `getCurrentPosition` qui ouvre l'invite, et son issue EST la réponse.
 *
 * ─── CORRECTIF (21/07/2026) : NE PLUS IMPUTER À L'UTILISATEUR UN REFUS QU'IL
 * N'A PAS PRONONCÉ. ──────────────────────────────────────────────────────────
 * L'ancienne version faisait `if (fix) return GRANTED;` puis retombait sur
 * `checkForegroundPermission()`. Or `getCurrentPositionOnce` échoue AUSSI pour
 * des raisons qui n'ont RIEN à voir avec la permission : localisation coupée au
 * niveau de l'OS, capteur absent, timeout de 10 s. Sur Safari — qui
 * n'implémente pas `navigator.permissions.query({name:'geolocation'})` — la
 * relecture renvoyait alors `undetermined`, l'appelant en déduisait
 * « pas granted » et la carte affichait « Active la localisation » à quelqu'un
 * qui venait précisément de l'autoriser.
 *
 * Maintenant on lit le CODE d'erreur de l'API : seul `PERMISSION_DENIED` (1)
 * est un refus. `POSITION_UNAVAILABLE` (2) et `TIMEOUT` (3) laissent la
 * permission telle qu'elle est réellement connue (souvent `undetermined` sur
 * Safari) — l'appelant distingue alors « refusé » de « je ne trouve pas ta
 * position », qui sont deux messages différents à l'écran.
 */
export async function requestForegroundPermission(): Promise<ForegroundPermissionState> {
  const api = geolocation();
  if (!api) return DENIED;
  const result = await getPositionOrFailure();
  if (result.fix) return GRANTED;
  if (result.reason === 'denied') return DENIED;
  // Échec SANS rapport avec la permission : on renvoie l'état réellement connu,
  // jamais un DENIED fabriqué (dont le `canAskAgain: false` condamnerait en
  // prime toute nouvelle tentative depuis le bouton Recentrer).
  return checkForegroundPermission();
}

/** Délai au-delà duquel on renonce plutôt que de laisser la carte en suspens. */
const POSITION_TIMEOUT_MS = 10_000;
/** Un fix de moins d'une minute est réutilisable : inutile de rallumer le GPS. */
const POSITION_MAX_AGE_MS = 60_000;

/** Code d'erreur `GeolocationPositionError.PERMISSION_DENIED` (valeur figée par la spec). */
const GEOLOCATION_PERMISSION_DENIED = 1;

/**
 * Pourquoi la position n'est pas arrivée. `denied` = l'utilisateur (ou la
 * politique du navigateur) a REFUSÉ ; `unavailable` = tout le reste — capteur
 * muet, localisation coupée au niveau de l'OS, timeout. Cette distinction est le
 * cœur du correctif : sans elle, un GPS qui ne répond pas se lisait « refusé ».
 */
export type PositionFailure = 'denied' | 'unavailable';

/** Résultat détaillé : soit un fix, soit la RAISON de son absence. */
export interface PositionAttempt {
  fix: RawFix | null;
  reason: PositionFailure | null;
}

/**
 * Position PONCTUELLE + raison d'échec. `getCurrentPositionOnce` en est la
 * façade « fix ou null » (surface identique au provider natif) ; les appelants
 * qui doivent distinguer refus et indisponibilité utilisent celle-ci.
 */
export function getPositionOrFailure(): Promise<PositionAttempt> {
  const api = geolocation();
  if (!api) return Promise.resolve({ fix: null, reason: 'unavailable' });
  return new Promise((resolveAttempt) => {
    let settled = false;
    const done = (attempt: PositionAttempt) => {
      if (settled) return;
      settled = true;
      resolveAttempt(attempt);
    };
    try {
      api.getCurrentPosition(
        (pos) => {
          done({
            fix: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              ts: pos.timestamp,
              // `accuracy` est obligatoire côté moteur ; le web la fournit toujours,
              // mais un 0 hérité d'un polyfill vaudrait « précision parfaite » — on
              // garde alors la valeur brute plutôt que d'inventer une confiance.
              accuracy: pos.coords.accuracy,
              ...(pos.coords.speed !== null && pos.coords.speed >= 0
                ? { speed: pos.coords.speed }
                : {}),
            },
            reason: null,
          });
        },
        (err) => {
          done({
            fix: null,
            reason: err.code === GEOLOCATION_PERMISSION_DENIED ? 'denied' : 'unavailable',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: POSITION_TIMEOUT_MS,
          maximumAge: POSITION_MAX_AGE_MS,
        },
      );
    } catch {
      done({ fix: null, reason: 'unavailable' });
    }
  });
}

/**
 * Position PONCTUELLE (carte, hors course) — `null` si refus, capteur absent ou
 * timeout. `null` n'est JAMAIS remplacé par une position par défaut : la carte
 * ouvre alors sur sa vue neutre monde, ce qui dit la vérité (« je ne sais pas
 * encore où tu es ») au lieu de poser le joueur à Paris.
 */
export async function getCurrentPositionOnce(): Promise<RawFix | null> {
  return (await getPositionOrFailure()).fix;
}
