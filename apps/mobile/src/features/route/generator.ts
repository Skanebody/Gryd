/**
 * GRYD — libellés et bornes du planificateur de boucle. Les tracés ne sont pas
 * générés ici : ils sont ROUTÉS EN DIRECT autour d'une origine réelle
 * (`features/route/liveRouting.ts`). Ce module ne porte que les libellés
 * d'objectif, les bornes de distance et les faits affichables d'une boucle.
 *
 * i18n : les libellés sont des `Entry` (5 langues, parité forcée par le type) —
 * les composants résolvent à l'affichage via `t()` (i18n/store).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 25/07/2026 ────────────────────────────────────────
 * · `PLANNER_INTENTION_ORDER` et `PLANNER_INTENTION_STATUS` : deux exports sans
 *   un seul appelant dans le dépôt (les statuts « Conquête recommandée », « Raid
 *   sur la frontière rivale » n'étaient rendus nulle part — et le second aurait
 *   de toute façon affirmé une frontière rivale que rien ne lit).
 * · L'intention « attaquer », jamais proposée par l'interface depuis
 *   AMENDEMENT-12 §A, avec sa puce « Frontière rivale ».
 * · La puce « Secteur à tenir », affichée sur l'objectif Défendre : elle affirme
 *   que le joueur TIENT du territoire à cet endroit. Aucune lecture de
 *   `hex_claims` n'a lieu sur cet écran — c'était un fait de jeu inventé, de la
 *   même famille que les « +N zones » supprimés du même écran.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 26/07/2026 : LES QUATRE BORNES SANS SOURCE ────────
 * `GEN_MIN_KM = 1.5`, `GEN_MAX_KM = 50`, `GEN_STEP_KM = 0.5`,
 * `GEN_DEFAULT_KM = 3.4` pilotaient TOUTES les distances du planificateur, et
 * aucune ne venait de `game-rules.ts`. Tant que GRYD ne chronométrait que la
 * course, c'était une entorse tolérée à « aucun nombre magique » ; depuis que le
 * vélo est réel, c'était une boucle de 3 km proposée à un cycliste dont le
 * périmètre minimal de capture est 5 000 m — une sortie STRUCTURELLEMENT
 * incapturable. Les bornes vivent désormais dans `activityPlanning.ts`, qui ne
 * fait que LIRE `activityRouting(activity)` (game-rules).
 */
import { type Activity } from '@klaim/shared';
import { C } from '../../i18n/catalog/route';
import type { Entry } from '../../i18n/types';
import { formatBandsKm } from './activityPlanning';
import type { PlannerIntention } from './types';

export type { PlannerIntention } from './types';

export const PLANNER_INTENTION_LABELS: Record<PlannerIntention, Entry> = {
  conquerir: C.intentConquer,
  defendre: C.intentDefend,
};

/**
 * Ce qu'on peut dire de VRAI d'une boucle routée, sans rien lire d'autre que sa
 * géométrie. Deux faits invariants (elle part de ta position, elle suit les
 * rues) + la bande de format déduite de la distance mesurée. Aucune de ces
 * puces n'affirme quoi que ce soit sur le territoire ou sur le score.
 *
 * La bande est celle de LA DISCIPLINE (`formatBandsKm`) : avec les seuils de la
 * course, la plus PETITE sortie vélo proposée — 15 km — se serait annoncée comme
 * une « grande boucle ». Un adjectif n'attribue rien, mais il ne doit pas non
 * plus décrire un effort qui n'est pas celui-là.
 */
export function generatedReasons(distanceKm: number, activity: Activity): Entry[] {
  const { shortMaxKm, mediumMaxKm } = formatBandsKm(activity);
  return [
    C.reasonAtYourDoor,
    distanceKm <= shortMaxKm
      ? C.reasonShortFormat
      : distanceKm <= mediumMaxKm
        ? C.reasonMediumFormat
        : C.reasonLongLoop,
    C.reasonFollowsStreets,
  ];
}
