/**
 * GRYD — E25 : DANS QUEL PAYS SUIS-JE ? (la seule question dont dépend le
 * numéro de secours pré-rempli.)
 *
 * ═══ POURQUOI LA POSITION, ET PAS LA LANGUE NI LA RÉGION DE L'APPAREIL ══════
 * `expo-localization` sait dire la région CONFIGURÉE du téléphone. Ce n'est PAS
 * l'endroit où se trouve son propriétaire : un téléphone réglé sur « France »
 * qui court à Tokyo afficherait « Composer le 112 » — un numéro qui ne joint
 * personne au Japon. La seule source qui réponde à la bonne question est la
 * POSITION MESURÉE, déjà lue par la sortie en cours.
 *
 * ═══ CE QUE ÇA COÛTE, DIT SANS EUPHÉMISME ══════════════════════════════════
 * ⚠ CORRECTIF DU 27/07. Ce docblock affirmait « Aucune position n'est stockée ni
 * transmise ailleurs » — et la fonction, six lignes plus bas, envoyait la
 * latitude et la longitude EN PLEINE PRÉCISION du coureur EN COURS DE SORTIE à
 * `nominatim.openstreetmap.org`, un tiers. Le paramètre `zoom=3` réduit la
 * précision de la RÉPONSE, pas celle de la REQUÊTE. C'était exactement la faute
 * que la constitution nomme : une doc qui promet au-delà du code.
 *
 * CE QUI EST VRAI, ET C'EST TOUT :
 *  · une requête sortante vers OSM/Nominatim, à l'OUVERTURE du panneau E25
 *    seulement (jamais en boucle pendant la course) ;
 *  · la position envoyée est ARRONDIE au degré-dixième (`COUNTRY_LOOKUP_DECIMALS`)
 *    avant de quitter l'appareil — voir plus bas pourquoi c'est sans effet sur
 *    la réponse et décisif pour la vie privée ;
 *  · rien n'est stocké par cette app, ni en local ni côté GRYD ;
 *  · l'échec ne dégrade rien d'autre : on retombe sur le composeur nu.
 *
 * Cette sortie de données est déclarée dans la politique de confidentialité
 * EMBARQUÉE dans le même binaire (i18n/catalog/legal.ts, section
 * « PARTAGE DES DONNÉES ») : sans cette ligne, le texte contractuel et le code
 * se contredisaient.
 *
 * ⚠ CONSÉQUENCE ASSUMÉE, ÉCRITE PLUTÔT QUE MASQUÉE : HORS LIGNE, LE PAYS EST
 * INCONNU, donc aucun numéro n'est pré-rempli. C'est le compromis choisi contre
 * l'alternative — pré-remplir un numéro qui n'a pas été vérifié.
 */
import type { CoveragePoint } from '../defense/coverage';

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

/**
 * DÉCIMALES CONSERVÉES avant l'envoi. Un dixième de degré vaut ~11 km : c'est
 * beaucoup plus fin que ce dont un découpage NATIONAL a besoin (`zoom=3` rend de
 * toute façon le pays et rien d'autre), et beaucoup trop grossier pour dire où
 * quelqu'un court — un carreau de 11 km couvre Paris entier.
 *
 * Pourquoi pas plus grossier : à 1 degré (~111 km), un coureur du nord de la
 * France pourrait être arrondi en Belgique, et le panneau pré-remplirait alors
 * un numéro de secours étranger. La vie privée ne se paie pas d'un mauvais
 * numéro d'urgence.
 *
 * Pourquoi pas plus fin : chaque décimale supplémentaire rend la position
 * exploitable, et rien dans la réponse ne s'améliore.
 *
 * Ce n'est PAS une constante de jeu (elle ne décide d'aucun territoire, d'aucun
 * point, d'aucun claim) : elle vit donc ici plutôt que dans `game-rules.ts`,
 * même statut que `PREFLIGHT_PROBE_HINT_MS`.
 */
export const COUNTRY_LOOKUP_DECIMALS = 1;

/**
 * Arrondi PUR appliqué avant l'envoi. Exporté pour être testé sous Deno : c'est
 * la seule garantie de vie privée que ce module offre, elle doit être vérifiable
 * sans réseau.
 */
export function coarseForCountryLookup(value: number): number {
  const factor = 10 ** COUNTRY_LOOKUP_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Code pays ISO 3166-1 alpha-2 (MAJUSCULES) à une position, ou `null`.
 *
 * `null` couvre TOUS les cas non concluants — réseau absent, réponse illisible,
 * champ `country_code` manquant ou de longueur inattendue. Aucun repli, aucune
 * valeur par défaut : `emergencyPlan()` traite `null` comme « pays inconnu »,
 * ce qui est exactement la vérité.
 */
export async function countryIsoAt(point: CoveragePoint): Promise<string | null> {
  try {
    const lat = coarseForCountryLookup(point.lat);
    const lon = coarseForCountryLookup(point.lng);
    const url =
      `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}` + `&format=json&zoom=3&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as { address?: { country_code?: unknown } };
    const code = json.address?.country_code;
    if (typeof code !== 'string') return null;
    const iso = code.trim().toUpperCase();
    return iso.length === 2 ? iso : null;
  } catch {
    return null;
  }
}
