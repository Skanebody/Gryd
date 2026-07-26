/**
 * GRYD — QUI DÉCLARE LA DISCIPLINE D'UNE SORTIE (E14 ; LE VÉLO DEVIENT RÉEL,
 * décision fondateur du 26/07/2026).
 *
 * ─── CE QUE CE MODULE A DÉFENDU LE 25/07, ET QUI NE BOUGE PAS ───────────────
 * Ce module LISAIT `gryd.mapactivity` — le commutateur Run/Bike de la CARTE —
 * et en déduisait la discipline de la sortie qui démarrait. Le scénario que ça
 * coûtait :
 *
 *   le joueur laisse sa carte en lentille Bike (« choix mémorisé », basculée
 *   trois jours plus tôt) → il lance une course depuis le PLANIFICATEUR
 *   (`/route-planner`, qui pousse vers `/course-live` sans passer par le GO de
 *   la Carte) → sa VRAIE course à pied est nettoyée aux bornes du vélo (80 km/h
 *   par point au lieu de 25), déclarée `bike` à `ingest_run`, et écrite dans un
 *   univers de territoire que la lentille Run n'affiche JAMAIS. Il rentre chez
 *   lui avec « 0 zone ».
 *
 * L'ARBITRAGE QUI EN EST SORTI TIENT TOUJOURS, MOT POUR MOT : une PRÉFÉRENCE
 * D'AFFICHAGE ne décide JAMAIS de la NATURE d'un effort enregistré. Rien dans
 * `features/run/**` ne lit `features/map/mapPref` — `runActivity.test.ts`
 * échoue si cette dérivation revient, par n'importe quel chemin.
 *
 * ─── CE QUI CHANGE LE 26/07 : LA DISCIPLINE DEVIENT DÉCLARABLE ──────────────
 * Jusqu'ici la conclusion tirée de ce défaut était « tout le monde déclare
 * `run` », parce que le vélo n'existait pas sous l'écran. Il existe désormais :
 * bornes anti-triche par discipline, schéma séparé (0070, appliquée), routage
 * vélo, `ingest_run` discipliné. Continuer à forcer `run` ferait mentir l'app
 * dans l'autre sens — un cycliste ne pourrait tout simplement pas jouer.
 *
 * La faute d'origine n'était PAS que la lentille informe le départ ; c'était
 * qu'elle le décidait EN SILENCE. La règle devient donc :
 *
 *   LA DISCIPLINE EST DÉCLARÉE PAR LE CHEMIN QUI LANCE LA SORTIE, ET ELLE EST
 *   MONTRÉE AU JOUEUR AVANT QUE QUOI QUE CE SOIT NE SOIT ENREGISTRÉ.
 *
 * Concrètement, deux marches, et pas une de plus :
 *   1. le chemin de départ DÉCLARE, par le paramètre d'URL `activity`
 *      (`START_ACTIVITY_PARAM`) — un écran qui ne déclare rien obtient
 *      EXACTEMENT le comportement historique (`UNDECLARED_START_ACTIVITY`) ;
 *   2. le PRÉFLIGHT (E06) l'AFFICHE en toutes lettres pendant le décompte et
 *      laisse la CORRIGER d'un tap avant le GO. Une déclaration qu'on peut
 *      lire et démentir n'est plus une décision silencieuse — c'est le point
 *      exact du garde-fou, et c'est ce que teste `runActivity.test.ts`.
 *
 * La discipline n'est toujours JAMAIS inférée depuis la trace : une trace
 * rapide n'est pas une preuve de vélo, c'est précisément ce que l'anti-triche
 * doit JUGER, pas présupposer.
 *
 * ─── CE QUE LE COMPILATEUR IMPOSE (inchangé) ───────────────────────────────
 *   · `PreflightApi.confirmStart(activity)` — PARAMÈTRE OBLIGATOIRE ;
 *   · `TrackerInit.activity` — CHAMP OBLIGATOIRE.
 * Aucun défaut silencieux ne peut se glisser sur le trajet du départ.
 *
 * CE FICHIER NE LIT RIEN : ni AsyncStorage, ni la carte, ni le réseau. Il
 * n'expose que des fonctions PURES, testées sous Deno.
 */
import { ACTIVITIES, type Activity } from '@klaim/shared';

/**
 * Nom du paramètre d'URL par lequel un chemin de départ DÉCLARE sa discipline
 * (`/course-live?mode=conquete&activity=bike`).
 *
 * C'est un CONTRAT, et il est volontairement explicite plutôt que déduit : les
 * écrans qui lancent une sortie (GO de la Carte, planificateur d'itinéraire,
 * lien direct) vivent hors de `features/run/**`. Leur laisser passer une
 * chaîne les oblige à ÉCRIRE ce qu'ils lancent, au lieu de laisser le départ
 * aller le chercher dans un réglage — ce qui est exactement le défaut corrigé
 * le 25/07.
 */
export const START_ACTIVITY_PARAM = 'activity';

/**
 * Ce que vaut une sortie lancée par un chemin qui n'a RIEN déclaré.
 *
 * Le type `Extract<Activity, 'run'>` n'est pas décoratif et ne s'élargira
 * jamais : un chemin muet est un chemin ANTÉRIEUR au vélo, et tout ce qui
 * existait avant le vélo est de la course à pied. Ce n'est pas un repli de
 * confort, c'est un constat — le même que celui de `DEFAULT_ACTIVITY` côté
 * domaine, et un test vérifie que les deux ne divergent pas.
 */
export const UNDECLARED_START_ACTIVITY: Extract<Activity, 'run'> = 'run';

/**
 * Lecture DÉFENSIVE de la discipline déclarée par l'URL. `expo-router` rend
 * `string | string[] | undefined` : un paramètre répété (`?activity=run&
 * activity=bike`) donne un tableau, et on ne garde que la PREMIÈRE valeur —
 * jamais la dernière, qu'un lien forgé pourrait ajouter après coup.
 *
 * Toute valeur inconnue retombe sur `UNDECLARED_START_ACTIVITY` plutôt que de
 * bloquer le départ : un joueur qui appuie sur GO doit partir. Le pire cas est
 * donc une sortie déclarée `run` — le comportement historique — et il est
 * VISIBLE au préflight, donc corrigeable avant le premier mètre.
 */
export function parseStartActivity(raw: string | readonly string[] | null | undefined): Activity {
  const value = Array.isArray(raw) ? raw[0] : (raw as string | null | undefined);
  return (ACTIVITIES as readonly string[]).includes(value ?? '')
    ? (value as Activity)
    : UNDECLARED_START_ACTIVITY;
}

/**
 * Une sortie INTERROMPUE (kill process) peut-elle être REPRISE par la sortie
 * qui vient de démarrer ?
 *
 * Reprendre, c'est FUSIONNER : la trace stockée, les fixes de la file
 * background et ceux déjà mesurés par la sortie courante deviennent UNE seule
 * sortie, sous UNE seule discipline. Si les deux disciplines diffèrent, cette
 * fusion écrirait des kilomètres de course à l'intérieur d'une sortie vélo
 * (ou l'inverse) : c'est exactement la SOMME entre deux mondes que la
 * séparation stricte d'E14 interdit, et le résultat serait rejugé aux bornes
 * d'une discipline qui n'est pas la sienne.
 *
 * La sortie interrompue n'est pas perdue pour autant : elle reste CLÔTURABLE
 * telle quelle (payload envoyé ou mis en file, dans SON monde). On retire une
 * action impossible, on n'efface aucune donnée.
 */
export function canResumeInterrupted(interrupted: Activity, current: Activity): boolean {
  return interrupted === current;
}
