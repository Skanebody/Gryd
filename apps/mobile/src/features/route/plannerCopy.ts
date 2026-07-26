/**
 * GRYD — LE PLANIFICATEUR NOMME L'EFFORT QU'IL PRÉPARE, PAS UN AUTRE.
 *
 * ─── LE DÉFAUT QUE CE MODULE SUPPRIME (26/07/2026) ───────────────────────────
 * `/route-planner` SAIT dans quelle discipline il travaille : il relit sa
 * lentille dans l'URL (`parseStartActivity(params[START_ACTIVITY_PARAM])`), il
 * borne toutes ses distances dessus (`activityPlanning.ts`), il route sur le
 * profil correspondant, et il l'ÉCRIT lui-même dans son kicker
 * (« CONQUÉRIR · BIKE · République »). Trois de ses textes étaient pourtant
 * rendus SANS CONDITION, en toutes langues :
 *   · le kicker de section « Pourquoi cette course » / « Why this run » ;
 *   · « Ajuster la course » — à la fois texte VISIBLE et libellé LU À VOIX
 *     HAUTE de l'accordéon ;
 *   · « Objectif de la course » — libellé du groupe de choix, lu lui aussi.
 * Un cycliste arrivé par « Ajuster » depuis sa carte vélo (`plannerHref`) lisait
 * donc « BIKE » en sur-titre et « cette course » quatre lignes plus bas. L'écran
 * se contredisait lui-même, sur la seule chose qu'il connaissait avec certitude.
 *
 * ─── POURQUOI DES JUMEAUX, ET PAS UNE NEUTRALISATION ─────────────────────────
 * La règle du projet (posée par `territoryBuild.dataNote` puis `zoneBoardCopy`)
 * est un partage, pas un réflexe : un écran qui PORTE la lentille reçoit un
 * jumeau par discipline ; un écran qui ne la porte pas voit son vocabulaire
 * NEUTRALISÉ, parce qu'un jumeau y serait un texte que rien ne peut choisir.
 * Ici le mot désigne l'objet de l'écran lui-même — la sortie qu'on prépare,
 * maintenant, dans une discipline connue — donc il peut et doit être précis.
 *
 * ─── CE QUI N'EST PAS TWINÉ, ET POURQUOI ─────────────────────────────────────
 * 1. `whyLearned` / `whyDefaultLearning` NOMMENT des « courses » et restent
 *    intactes : sous lentille vélo elles sont INATTEIGNABLES
 *    (`useRouteSuggestion` refuse la source d'habitudes hors discipline par
 *    défaut — cf. le commentaire de `catalog/route.ts` et le test associé).
 *    Un jumeau y serait deux vérités à maintenir pour zéro surface.
 * 2. Tout le reste du catalogue du planificateur est déjà NEUTRE (« boucle »,
 *    « tracé », « parcours », « format », « allure ») : le dédoubler créerait la
 *    divergence qu'on cherche à éviter.
 *
 * PUR : zéro React, zéro réseau, zéro stockage — Deno le charge tel quel.
 */
import type { Activity } from '@klaim/shared';
import { C } from '../../i18n/catalog/route';
import type { Entry } from '../../i18n/types';

/**
 * Les trois textes du planificateur qui NOMMENT l'effort. Un seul objet plutôt
 * que trois fonctions : ils basculent ENSEMBLE ou ils se contredisent entre eux,
 * et un appelant ne doit pas pouvoir n'en dériver que deux sur trois.
 */
export interface PlannerDisciplineCopy {
  /** Kicker de la section de justification (§5 de l'écran). */
  why: Entry;
  /** Accordéon « Ajuster » — texte VISIBLE et libellé d'accessibilité. */
  adjust: Entry;
  /** Libellé du groupe de choix d'objectif (lu à voix haute). */
  objectiveA11y: Entry;
}

/**
 * Discipline → les trois textes. `activity` est OBLIGATOIRE : un défaut ferait
 * retomber en silence sur la course à pied, c'est-à-dire exactement le défaut
 * corrigé. La comparaison est faite sur `'bike'` et non sur `!== 'run'` pour
 * qu'une troisième discipline, le jour où elle existera, échoue au test
 * d'exhaustivité au lieu d'hériter sans bruit du vocabulaire du coureur.
 */
export function plannerDisciplineCopy(activity: Activity): PlannerDisciplineCopy {
  return activity === 'bike'
    ? { why: C.secWhyBike, adjust: C.adjustRunBike, objectiveA11y: C.a11yObjectiveGroupBike }
    : { why: C.secWhy, adjust: C.adjustRun, objectiveA11y: C.a11yObjectiveGroup };
}
