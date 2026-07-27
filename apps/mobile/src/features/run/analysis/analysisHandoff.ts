/**
 * GRYD — E26 → E27 → E29 : LE RELAIS QUI TRAVERSE L'ANALYSE SANS S'ABÎMER.
 *
 * ─── LE DÉFAUT QUE CE MODULE EXISTE POUR RENDRE IMPOSSIBLE ─────────────────
 * Il a DÉJÀ eu lieu une fois, un cran plus tôt : `RealCourseLive` construisait
 * les paramètres du Résultat à la main et y oubliait la DISCIPLINE. Un cycliste
 * lisait « COURSE TERMINÉE » à la fin de chaque sortie, sur l'écran qui ferme
 * l'effort, alors que les vingt libellés vélo existaient déjà — simplement
 * inatteignables. C'est pour ça que `gps/resultHandoff.ts` est devenu une
 * fonction pure et testée.
 *
 * En intercalant E27 entre la fin de course et le Résultat, on rouvre
 * exactement la même porte : ces paramètres traversent désormais UN ÉCRAN DE
 * PLUS. S'ils étaient reconstruits (ou filtrés à l'œil) au passage, le même
 * défaut renaîtrait au même endroit, avec la même invisibilité — les params
 * d'`expo-router` sont un dictionnaire libre, que ni le typage ni un rendu ne
 * vérifient.
 *
 * D'où : le passage est une fonction PURE, testée, et le contrat est
 * INVERSÉ — on ne liste pas ce qu'on jette, on liste ce qu'on transmet, et le
 * test compare cette liste aux clés que `courseResultParams` produit RÉELLEMENT.
 * Ajouter un paramètre à la fin de course sans l'ajouter ici fera rougir le
 * test, pas rougir un cycliste.
 *
 * PUR : zéro import React / RN / expo-router. Testé sous Deno.
 */

/**
 * Les clés que E26 pose sur `/course/analyse`, et que E27 remet à `/course-result`.
 * Miroir EXACT de `courseResultParams` (gps/resultHandoff.ts), vérifié par test.
 *
 * `activity` porte la DISCIPLINE — c'est la clé dont l'oubli a coûté un
 * chantier entier. Elle est en tête pour qu'on la voie.
 */
export const FINISH_PARAM_KEYS = ['activity', 'mode', 'dist', 'dur', 'queued'] as const;
export type FinishParamKey = (typeof FINISH_PARAM_KEYS)[number];

/**
 * Ce qu'`expo-router` rend : un dictionnaire libre où une valeur peut être
 * répétée (`?a=1&a=2` → tableau). On ne fait confiance à rien.
 */
export type RouterParams = Readonly<Record<string, string | string[] | undefined>>;

/**
 * Première valeur exploitable d'un paramètre, ou `undefined`. Un tableau
 * (paramètre répété dans l'URL) rend son premier élément : c'est ce que fait
 * un navigateur, et c'est plus sûr que de sérialiser « a,b ».
 */
function firstString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value.length > 0 ? value : undefined;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' && first.length > 0 ? first : undefined;
  }
  return undefined;
}

/**
 * Extrait le relais de fin de course, et RIEN d'autre.
 *
 * Pourquoi une liste blanche plutôt qu'un `{...params}` : cet écran est
 * atteignable par lien profond, donc ses paramètres viennent de l'EXTÉRIEUR.
 * Tout réexpédier au Résultat ferait de `/course/analyse` un relais ouvert vers
 * un écran qui lit ses params — une porte que personne n'a ouverte exprès.
 * Une clé absente reste ABSENTE (jamais `''`, jamais `'0'`) : c'est la
 * convention de `courseResultParams`, et le Résultat teste `queued === '1'`.
 */
export function forwardableParams(params: RouterParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of FINISH_PARAM_KEYS) {
    const value = firstString(params[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * E26 a-t-elle réellement passé le relais ? Vrai dès qu'une clé de fin de
 * course est là. Faux sur un lien profond nu — et l'écran n'a alors AUCUN
 * contexte de sortie, ce qui est une information, pas un défaut à combler.
 */
export function cameFromFinish(params: RouterParams): boolean {
  return Object.keys(forwardableParams(params)).length > 0;
}

/**
 * E26 a-t-elle dit « pas envoyée » ? `queued` n'est écrit QUE s'il vaut vrai
 * (`courseResultParams`) : l'égalité stricte à `'1'` est donc la lecture exacte
 * du contrat, et non un booléen deviné à partir d'une présence.
 */
export function queuedHintOf(params: RouterParams): boolean {
  return forwardableParams(params).queued === '1';
}
