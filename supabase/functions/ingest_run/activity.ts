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
 *   3. UNE RÉCOMPENSE APPARTIENT AU MONDE DE SON DÉCLENCHEUR. Une fenêtre de
 *      bonus ouverte parce qu'une zone VÉLO s'efface ne se réclame pas à pied
 *      (`bonusWindowOpposable`). C'est le pendant « récompense » de la clé
 *      composite `(h3index, activity)` : le territoire était déjà séparé, le
 *      gain qui le récompense ne l'était pas.
 *
 * Ces règles sont ici, pures et testées (`activity_ingest_test.ts`,
 * `bonus_activity_test.ts`).
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

/**
 * Cette fenêtre `active_bonuses` est-elle RÉCLAMABLE par une sortie de ce monde ?
 *
 * ═══ CE QUE CETTE FONCTION RÉPARE ═══════════════════════════════════════════
 * 0070 a séparé les TERRITOIRES, 0071 a fait ÉCRIRE à `digest_job` le monde de
 * chaque fenêtre de bonus — mais personne ne le LISAIT. Une « Défense
 * critique » ouverte parce qu'une zone VÉLO s'efface, ou un « Finisher » posé
 * sur une frontière vélo (`partial_boundaries.activity`, 0070), restait
 * réclamable par une course à pied. La discipline était ENREGISTRÉE, pas
 * OPPOSÉE. Comme tout claim est décidé serveur, c'est ici — et nulle part dans
 * l'UI — que la séparation des mondes doit tenir.
 *
 * ═══ LES TROIS CAS, ET POURQUOI CHACUN EST CE QU'IL EST ═════════════════════
 * · `null` / absent ⇒ RÉCLAMABLE par n'importe quelle sortie. Ce n'est pas une
 *   tolérance : `active_bonuses.activity` est NULLABLE parce que certaines
 *   fenêtres n'ONT pas de monde (le Coffre crew se déclenche sur la
 *   progression hebdomadaire du coffre, qui n'appartient ni à la course ni au
 *   vélo — 0071). Refuser ces fenêtres à un cycliste inventerait une
 *   discipline qu'elles n'ont pas.
 *   NUANCE HÉRITÉE, dite plutôt que tue : les lignes créées AVANT 0071 sont
 *   `null` faute de colonne à l'époque, et elles, avaient bien un monde (la
 *   course — le vélo n'était pas ingérable). L'ambiguïté se purge d'elle-même :
 *   une fenêtre vit au plus `BONUS_DURATION_H` et `digest_job` expire les
 *   échues à chaque passage. Sous 24 h après le déploiement, tout `null`
 *   restant signifie bien « sans monde ».
 * · MÊME monde que la sortie ⇒ réclamable. C'est le cas nominal.
 * · AUTRE monde, ou valeur ILLISIBLE ⇒ NON réclamable.
 *
 * ═══ POURQUOI « ILLISIBLE » NE LÈVE PAS ═════════════════════════════════════
 * Ailleurs dans ce lot (decay_job, digest_job) une discipline illisible LÈVE :
 * ces jobs ÉCRIVENT du territoire ou un chiffre poussé au joueur, et se
 * tromper de monde y est pire que s'arrêter. Ici, non : `applyActiveBonus` est
 * appelé APRÈS que la course a été écrite et les hexagones attribués. Lever
 * transformerait une course déjà capturée en `500` — le joueur verrait un
 * échec sur une conquête pourtant réelle. Ne pas récompenser est en revanche
 * un résultat NORMAL et déjà fréquent de ce chemin (caps, cooldown, run non
 * vérifié) : la fenêtre reste ouverte, un prochain run la réclamera. La
 * contrainte `active_bonuses_activity_check` rend d'ailleurs le cas impossible
 * en base — ceci est une ceinture, pas une hypothèse de travail.
 *
 * @param windowActivity valeur BRUTE de `active_bonuses.activity` telle que
 *   PostgREST la rend (`string | null | undefined`) — non pré-validée, c'est
 *   tout l'intérêt.
 * @param runActivity discipline EFFECTIVE de la sortie en cours.
 */
export function bonusWindowOpposable(
  windowActivity: unknown,
  runActivity: Activity,
): boolean {
  if (windowActivity === null || windowActivity === undefined) return true;
  if (!isActivityShape(windowActivity)) return false;
  return windowActivity === runActivity;
}
