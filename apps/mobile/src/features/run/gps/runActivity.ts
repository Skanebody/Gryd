/**
 * GRYD — QUI DÉCLARE LA DISCIPLINE D'UNE SORTIE (E14, recalage du 25/07/2026).
 *
 * ─── LE DÉFAUT QUE CE FICHIER A PORTÉ, ET QUI EST RETIRÉ ICI ────────────────
 * Ce module LISAIT `gryd.mapactivity` — le commutateur Run/Bike de la CARTE —
 * et en déduisait la discipline de la sortie qui démarrait. Tant que
 * `flags.bike` était fermé, personne ne pouvait basculer ce commutateur et le
 * raccourci ne coûtait rien. Le drapeau a été OUVERT le 25/07/2026 (le
 * commutateur est VISIBLE sur la Carte, décision fondateur), et le raccourci
 * est devenu un piège :
 *
 *   le joueur laisse sa carte en lentille Bike (« choix mémorisé », il l'a
 *   peut-être basculée trois jours plus tôt) → il lance une course depuis le
 *   PLANIFICATEUR (`/route-planner`, qui pousse vers `/course-live` sans passer
 *   par le GO de la Carte, lequel est bien retiré en lentille Bike) → sa VRAIE
 *   course à pied est nettoyée aux bornes du vélo (80 km/h par point au lieu de
 *   25), déclarée `bike` à `ingest_run`, et écrite dans un univers de territoire
 *   que la lentille Run n'affiche JAMAIS. Il rentre chez lui avec « 0 zone ».
 *
 * ─── L'ARBITRAGE (pilote, 25/07/2026) ───────────────────────────────────────
 * UNE PRÉFÉRENCE D'AFFICHAGE NE DÉCIDE JAMAIS DE LA NATURE D'UN EFFORT
 * ENREGISTRÉ. La discipline d'une sortie est DÉCLARÉE par le chemin qui la
 * lance ; elle n'est ni devinée depuis un réglage de carte, ni inférée depuis
 * la trace (une trace rapide n'est PAS une preuve de vélo — c'est justement ce
 * que l'anti-triche doit juger, pas présupposer).
 *
 * ─── CE QUE LE COMPILATEUR IMPOSE DÉSORMAIS ────────────────────────────────
 * Il n'existe plus aucun défaut silencieux sur le trajet du départ :
 *   · `PreflightApi.confirmStart(activity)` — PARAMÈTRE OBLIGATOIRE : on ne
 *     peut pas démarrer une course sans avoir dit ce qu'on fait ;
 *   · `TrackerInit.activity` — CHAMP OBLIGATOIRE : on ne peut pas construire un
 *     tracker sans discipline (avant : `activity?` résolu par un `??`).
 * Aujourd'hui, TOUS les chemins de départ (GO de la Carte, planificateur
 * d'itinéraire, lien direct vers `/course-live`) convergent vers le MÊME
 * préflight, qui déclare `DECLARED_START_ACTIVITY` — c'est-à-dire `run`.
 *
 * ─── POURQUOI `run` POUR TOUT LE MONDE, AUJOURD'HUI ────────────────────────
 * Parce que le vélo n'existe pas sous l'écran : aucun moteur vélo, aucune
 * capture vélo possible, aucun classement séparé (les quatre chantiers listés
 * dans `lib/flags.ts`). Déclarer `bike` produirait une sortie que rien ne sait
 * lire — donc un mensonge, pas une fonctionnalité. Le jour où ces chantiers
 * seront livrés, il suffira à un écran de passer `'bike'` à `confirmStart` :
 * le type du paramètre est déjà `Activity`, rien d'autre n'est à toucher ici.
 *
 * CE FICHIER NE LIT PLUS RIEN. Il n'importe ni `features/map/mapPref`, ni
 * AsyncStorage, ni quoi que ce soit d'asynchrone : c'est une DÉCLARATION, et
 * `runActivity.test.ts` échoue si une dérivation depuis la préférence de carte
 * revient dans `features/run/**`.
 */
import type { Activity } from '@klaim/shared';

/**
 * La discipline que déclarent AUJOURD'HUI tous les chemins de départ.
 *
 * Le type `Extract<Activity, 'run'>` n'est pas décoratif : il dit que la seule
 * discipline que GRYD sache RÉELLEMENT enregistrer est la course à pied. Élargir
 * cette constante à `Activity` sans avoir livré le moteur vélo serait exactement
 * la promesse au-delà du code que la charte interdit.
 */
export const DECLARED_START_ACTIVITY: Extract<Activity, 'run'> = 'run';
