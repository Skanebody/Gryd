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
 */
import { C } from '../../i18n/catalog/route';
import type { Entry } from '../../i18n/types';
import type { PlannerIntention } from './types';

export type { PlannerIntention } from './types';

export const PLANNER_INTENTION_LABELS: Record<PlannerIntention, Entry> = {
  conquerir: C.intentConquer,
  defendre: C.intentDefend,
};

// Bornes de distance : du footing au TRAIL (des coureurs font 50 km).
export const GEN_MIN_KM = 1.5;
export const GEN_MAX_KM = 50;
export const GEN_STEP_KM = 0.5;
export const GEN_DEFAULT_KM = 3.4;

/**
 * Bandes de FORMAT (km) — MESURES DE COMPOSITION, pas des règles de jeu : elles
 * ne choisissent qu'un adjectif d'affichage (« format court / moyen / grande
 * boucle ») et n'entrent dans aucun calcul de score ni de territoire.
 */
const SHORT_FORMAT_MAX_KM = 3;
const MEDIUM_FORMAT_MAX_KM = 6;

/**
 * Ce qu'on peut dire de VRAI d'une boucle routée, sans rien lire d'autre que sa
 * géométrie. Deux faits invariants (elle part de ta position, elle suit les
 * rues) + la bande de format déduite de la distance mesurée. Aucune de ces
 * puces n'affirme quoi que ce soit sur le territoire ou sur le score.
 */
export function generatedReasons(distanceKm: number): Entry[] {
  return [
    C.reasonAtYourDoor,
    distanceKm <= SHORT_FORMAT_MAX_KM
      ? C.reasonShortFormat
      : distanceKm <= MEDIUM_FORMAT_MAX_KM
        ? C.reasonMediumFormat
        : C.reasonLongLoop,
    C.reasonFollowsStreets,
  ];
}
