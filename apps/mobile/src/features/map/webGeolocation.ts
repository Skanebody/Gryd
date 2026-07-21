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

// ═══════════════════════════════════════════════════════════════════════════
// MÉMOIRE D'ACCORD — le seul moyen de savoir, sur Safari, qu'une position peut
// être lue SANS ouvrir d'invite.
//
// LE PROBLÈME. Depuis que la carte ne DEMANDE plus rien au montage (elle LIT),
// elle renonce dès que la permission n'est pas `granted`. Or sur tout navigateur
// sans Permissions API pour la géoloc — Safari en tête — `checkForegroundPermission`
// répond TOUJOURS `undetermined`, même après un accord. Résultat : la position
// n'était PLUS JAMAIS tentée à l'ouverture, et un joueur Safari qui avait
// pourtant autorisé la localisation ne se voyait jamais sur sa carte.
//
// CE QU'ON NE VEUT PAS. Retomber sur une demande automatique au montage : une
// invite de géolocalisation non liée à un geste est précisément ce que le
// produit a promis de ne plus faire (« le GPS s'allume au départ »).
//
// LA SORTIE. Un accord de géolocalisation est PERSISTÉ PAR ORIGINE par le
// navigateur : si cette origine a déjà rendu un fix réel, un nouvel appel à
// `getCurrentPosition` n'ouvre pas d'invite. On mémorise donc UNIQUEMENT ce
// fait — « cette origine a déjà rendu une position » — et on s'en sert pour
// reprendre la lecture là où l'état de permission est illisible. Ce n'est pas
// une donnée fabriquée : c'est le compte rendu d'un évènement réel, écrit par le
// code qui l'a observé, et effacé dès qu'un refus le contredit.
//
// ⚠️ LIMITE ASSUMÉE, à ne pas cacher : si le joueur accorde puis REMET la
// permission à « demander » dans les réglages du navigateur, cette mémoire
// survit à la remise à zéro et la lecture d'ouverture rouvrira une invite. Le
// cas est étroit (une manipulation explicite dans les réglages du navigateur),
// et la première réponse — accord ou refus — remet la mémoire d'aplomb.
// ═══════════════════════════════════════════════════════════════════════════

const GRANT_MEMO_KEY = 'gryd.geo.granted';

/** localStorage peut être absent (SSR) ou interdit (mode privé strict). */
function memo(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Consigne ce qui vient d'être OBSERVÉ (un fix réel, ou un refus explicite). */
function rememberGrant(granted: boolean): void {
  const store = memo();
  if (!store) return;
  try {
    if (granted) store.setItem(GRANT_MEMO_KEY, '1');
    else store.removeItem(GRANT_MEMO_KEY);
  } catch {
    // Quota / mode privé : la mémoire est un CONFORT, jamais une dépendance —
    // sans elle on retombe simplement sur « le joueur touche Recentrer ».
  }
}

/**
 * Cette origine a-t-elle DÉJÀ rendu une position ? Utilisé par la carte pour
 * décider si une lecture d'ouverture est sûre (aucune invite) là où l'état de
 * permission est illisible. Ne dit RIEN de l'état courant de la permission :
 * c'est un fait passé, et il est traité comme tel.
 */
export function hasProvenGrant(): boolean {
  const store = memo();
  if (!store) return false;
  try {
    return store.getItem(GRANT_MEMO_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * L'état de permission est-il LISIBLE sur ce navigateur ? `false` sur Safari
 * (pas de Permissions API pour la géoloc) : `checkForegroundPermission` y répond
 * `undetermined` par honnêteté, mais cet `undetermined` veut dire « je ne sais
 * pas », pas « on ne t'a rien demandé ». L'appelant qui doit distinguer les deux
 * lit ce prédicat plutôt que de deviner.
 */
export function isPermissionStateReadable(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.permissions?.query === 'function';
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
    // La mémoire d'accord suit l'état RÉEL là où il est lisible : un refus
    // prononcé dans Chrome efface une mémoire devenue fausse.
    if (status.state === 'granted') {
      rememberGrant(true);
      return GRANTED;
    }
    if (status.state === 'denied') {
      rememberGrant(false);
      return DENIED;
    }
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
          // Un fix RÉEL est arrivé : cette origine a donc l'accord du navigateur.
          // C'est le seul endroit qui a le droit de l'écrire — on consigne ce
          // qu'on vient d'observer, jamais une supposition.
          rememberGrant(true);
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
          const denied = err.code === GEOLOCATION_PERMISSION_DENIED;
          // Refus EXPLICITE seulement : un capteur muet ou un timeout ne dit
          // rien de la permission et ne doit donc pas effacer la mémoire.
          if (denied) rememberGrant(false);
          done({ fix: null, reason: denied ? 'denied' : 'unavailable' });
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
