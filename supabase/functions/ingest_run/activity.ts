/**
 * GRYD — ingest_run : la DISCIPLINE d'une sortie (planche E14, « une version
 * bike et une version running »).
 *
 * POURQUOI CE FICHIER EXISTE. Le reste de `index.ts` est un `Deno.serve` : on ne
 * peut pas l'importer dans un test sans démarrer un serveur. Or les deux règles
 * qui décident dans QUEL UNIVERS une course atterrit sont exactement le genre de
 * chose qu'il ne faut pas laisser sans filet :
 *
 *   1. UNE DISCIPLINE ABSENTE VAUT « run ». Ce n'est pas un repli prudent, c'est
 *      un FAIT : tout client écrit avant l'arrivée du vélo décrit une course à
 *      pied, et toute ligne déjà en base en est une (migration 0070, `default
 *      'run'`). La rétro-compatibilité du contrat client ↔ serveur tient à cette
 *      seule ligne.
 *   2. UNE DISCIPLINE INCONNUE EST REFUSÉE, jamais repliée. Accepter un
 *      `activity: "scooter"` en le traitant comme de la course, ce serait
 *      décider à la place du joueur puis lui présenter le résultat comme le
 *      sien — une donnée fabriquée. Le refus est un `400 invalid_payload`,
 *      c'est-à-dire un fait que le client peut lire et corriger.
 *
 * Ces deux règles sont ici, pures et testées (`activity_ingest_test.ts`).
 */
import { ACTIVITIES, type Activity, DEFAULT_ACTIVITY } from '../_shared/game-rules.ts';

/**
 * `value` est-il une discipline que le jeu connaît ? Test de FORME uniquement,
 * appliqué à la frontière HTTP — comme `isCityIdShape` pour les villes.
 *
 * `ACTIVITIES` (game-rules) est la source unique : ajouter une troisième
 * discipline un jour ne demandera aucune retouche ici.
 */
export function isActivityShape(value: unknown): value is Activity {
  return typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value);
}

/**
 * Discipline EFFECTIVE d'une requête d'ingestion.
 *
 * Absente ⇒ `DEFAULT_ACTIVITY` ('run'). Le paramètre est typé `Activity |
 * undefined` et non `unknown` : la forme a déjà été jugée par
 * `isActivityShape` à l'entrée du handler, on ne re-décide rien ici. Une valeur
 * inconnue n'arrive donc jamais jusqu'à cette fonction — et si elle y arrivait
 * (appel interne fautif), le `?? DEFAULT_ACTIVITY` ne la masquerait pas : elle
 * ressortirait telle quelle et échouerait plus loin, sur la contrainte
 * `activity in ('run','bike')` de la base. Aucun silence possible.
 */
export function effectiveActivity(declared: Activity | undefined): Activity {
  return declared ?? DEFAULT_ACTIVITY;
}
