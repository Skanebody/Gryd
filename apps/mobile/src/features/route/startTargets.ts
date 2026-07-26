/**
 * GRYD — LES CIBLES DE DÉPART DU PLANIFICATEUR ET DU BRIEFING (E14, 26/07/2026).
 *
 * ─── LE DÉFAUT QUE CE MODULE SUPPRIME ─────────────────────────────────────────
 * Trois chemins mènent à `/course-live`. Le 26/07 au matin, UN SEUL déclarait sa
 * discipline :
 *
 *   · GO de la Carte      → `withStartActivity(action.targetHref, activity)` ✔
 *   · « Commencer la mission » (briefing de zone) → `/course-live?mode=conquete` ✘
 *   · « Conquérir / Défendre » (planificateur)    → `…&intention=conquest`     ✘
 *
 * Les deux derniers partaient donc TOUJOURS en course à pied — y compris quand
 * le joueur venait de traverser trois écrans en lentille vélo. Ce n'est pas un
 * réglage manquant : c'est le scénario que l'arbitrage du 25/07 a payé cher à
 * refermer, dans l'autre sens (« il rentre chez lui avec 0 zone »). Le briefing
 * est de nouveau atteignable en lentille vélo depuis que le tap de zone y est
 * réarmé, et le planificateur l'a toujours été.
 *
 * ─── POURQUOI UN MODULE, ET PAS TROIS CHAÎNES ÉCRITES SUR PLACE ──────────────
 * Une URL de départ construite à la main dans un composant n'est testable que
 * par le composant. Ici elles sont PURES : un test Deno prouve que chacune porte
 * la déclaration, et qu'elle est relue à l'identique par `parseStartActivity` —
 * le lecteur RÉEL du départ, pas une copie de sa logique.
 *
 * ─── CE QUE CE MODULE NE FAIT PAS ─────────────────────────────────────────────
 * Il ne LIT aucune préférence. La discipline lui est DONNÉE par l'écran appelant,
 * qui la tient de sa propre lentille ou du paramètre d'URL qui la lui a
 * transmise. L'interdit du 25/07 tient : rien dans le chemin du départ ne va
 * chercher `gryd.mapactivity` — l'écran ÉCRIT ce qu'il lance, et le préflight
 * l'AFFICHE trois secondes, corrigeable d'un tap, avant le premier mètre.
 */
import { type Activity } from '@klaim/shared';
import { START_SORTIE_BASE_HREF, withStartActivity } from '../../ui/activityLens';
import type { PlannerIntention } from './types';

/**
 * Objectif du planificateur → valeur du paramètre `intention` de `/course-live`.
 * Table plutôt que ternaire : le jour où un troisième objectif apparaît, le
 * `Record` exige sa valeur au lieu de le faire silencieusement passer pour une
 * conquête.
 */
export const START_INTENTION_PARAM: Readonly<Record<PlannerIntention, string>> = {
  conquerir: 'conquest',
  defendre: 'defense',
};

/**
 * « Commencer la mission » (briefing de zone E05). Même base que le GO de la
 * Carte — `START_SORTIE_BASE_HREF` — parce qu'un départ lancé d'ici ne doit pas
 * être un autre départ que celui d'à côté.
 */
export function missionStartHref(activity: Activity): string {
  return withStartActivity(START_SORTIE_BASE_HREF, activity);
}

/**
 * CTA du planificateur. L'objectif voyage (il oriente la boucle), le tracé NON :
 * `ingest_run` décide la capture sur la boucle réellement fermée, jamais sur le
 * respect d'un itinéraire conseillé.
 */
export function plannerStartHref(intention: PlannerIntention, activity: Activity): string {
  return withStartActivity(
    `${START_SORTIE_BASE_HREF}&intention=${START_INTENTION_PARAM[intention]}`,
    activity,
  );
}

/** L'écran du planificateur (il n'est pas un onglet : il n'a pas de lentille à lui). */
export const PLANNER_HREF = '/route-planner';

/**
 * Ouvrir le planificateur DEPUIS une lentille. Le planificateur ne possède pas
 * de commutateur Run/Bike : sa discipline lui est TRANSMISE, par le même
 * paramètre contractuel que le départ (`START_ACTIVITY_PARAM`), et il la relit
 * avec `parseStartActivity`. Sans ça, un cycliste qui ouvre « Ajuster » depuis
 * sa carte vélo se voit proposer des distances de coureur — et repart à pied.
 *
 * Ce n'est PAS un départ, mais c'est le même contrat, volontairement : deux noms
 * de paramètre pour la même information finiraient par diverger, et la
 * divergence serait silencieuse.
 */
export function plannerHref(activity: Activity): string {
  return withStartActivity(PLANNER_HREF, activity);
}
