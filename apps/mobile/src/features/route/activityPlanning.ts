/**
 * GRYD — LE PLANIFICATEUR PARLE ENFIN LA LANGUE DE SA DISCIPLINE (E14, 26/07/2026).
 *
 * ─── LE DÉFAUT QUE CE MODULE SUPPRIME ─────────────────────────────────────────
 * `features/route/generator.ts` portait QUATRE nombres écrits à la main —
 * `GEN_MIN_KM = 1.5`, `GEN_MAX_KM = 50`, `GEN_STEP_KM = 0.5`,
 * `GEN_DEFAULT_KM = 3.4` — et TOUT le planificateur en dépendait : le plancher
 * du pas de distance, le plafond, la distance par défaut, les deux formats
 * fixes. Aucun ne venait de `game-rules.ts`. Tant que GRYD ne chronométrait que
 * la course à pied, c'était une entorse tolérée. Depuis que le vélo est une
 * discipline RÉELLE, c'est devenu une PROMESSE IMPOSSIBLE À TENIR :
 *
 *   en lentille vélo, le planificateur proposait une boucle de 3 km. Le
 *   périmètre minimal d'une boucle vélo est `BIKE_LOOP_MIN_PERIMETER_M`
 *   (5 000 m). La boucle proposée était donc STRUCTURELLEMENT INCAPTURABLE :
 *   le cycliste la roulait entière et ne faisait aucune zone.
 *
 * Un écran qui propose un effort que le moteur ne peut pas récompenser ment,
 * même sans afficher un seul chiffre inventé.
 *
 * ─── CE QUE CE MODULE EST ─────────────────────────────────────────────────────
 * Une dérivation PURE (zéro React, zéro réseau, zéro stockage) : discipline →
 * bornes de distance, pas, formats, profil de routage. Il ne CRÉE aucune valeur :
 * il LIT `activityRouting(activity)` (game-rules, table `ACTIVITY_ROUTING`) et
 * n'en fait que des `min`, des `max` et des rapports.
 *
 * ─── LA RÉGRESSION COUREUR DU 26/07, ET SA CORRECTION ────────────────────────
 * Première version de ce module : le plancher et le plafond du planificateur
 * étaient pris dans `targetDistanceMinM/MaxM`, c'est-à-dire dans les bornes de
 * la PRÉFÉRENCE ENREGISTRÉE. L'intention était juste (sortir des quatre nombres
 * sans source de `generator.ts`), le résultat non — il coûtait DEUX choses au
 * coureur, mesurées à la revue finale :
 *   · plancher 1,5 → 3 km  ⇒ la boucle de 2 km disparaissait. C'est la sortie du
 *     DÉBUTANT et celle de la RÉCUPÉRATION ;
 *   · plafond 50 → 42,195 km ⇒ plus de trail au-delà du marathon.
 * La règle du projet est « aucun nombre magique », pas « des nombres plus
 * jolis ». game-rules porte donc désormais DEUX jeux de bornes distincts, et ce
 * module lit le bon (cf. le bloc « BORNES DU PLANIFICATEUR ») :
 *   · `targetDistance*` = ce qu'on peut ENREGISTRER (borné par la contrainte SQL
 *     de `route_preferences`, migration 0054 appliquée) ;
 *   · `planner*`        = ce que le SÉLECTEUR peut atteindre. Rien n'est écrit
 *     nulle part : seules la géométrie de capture et la plausibilité humaine
 *     bornent une cible de routage.
 *
 * ─── D'OÙ VIENT CHAQUE BORNE, ET POURQUOI CELLE-LÀ ───────────────────────────
 * · PLANCHER = `plannerMinM` = 1,5 × le périmètre minimal de boucle de LA
 *   discipline (1,5 km à pied, 7,5 km à vélo). La marge de 50 % n'est pas de la
 *   timidité : le planificateur demande une CIBLE, OSRM répond avec la longueur
 *   des rues trouvées. On ne prend PAS `targetDistanceMinM` (1 km à pied, 2 km à
 *   vélo) : c'est le plancher d'une sortie qui COMPTE (§3.2), pas d'une boucle
 *   qui fait une ZONE — à vélo il tombe SOUS `BIKE_LOOP_MIN_PERIMETER_M`, donc
 *   l'utiliser réintroduirait très exactement le défaut d'origine.
 * · PLAFOND = `plannerMaxM` — le repère long de la discipline (le 50K du trail à
 *   pied, l'ordre du brevet 200 à vélo), jamais le plafond de l'INGÉRABLE, et
 *   jamais non plus celui d'une préférence persistée.
 * · DÉFAUT = `plannerDefaultM` = 3 × le périmètre minimal (3 km à pied, 15 km à
 *   vélo). Quand on ne sait RIEN du joueur : assez pour traverser plusieurs
 *   zones, assez court pour ne rien présumer. Surtout PAS le plancher — proposer
 *   1,5 km à un inconnu serait une seconde régression, dans l'autre sens.
 * · PAS = mesure de PRÉSENTATION (aucune règle de jeu n'en dépend), mais son
 *   ÉCHELLE est sourcée : un pas de 0,5 km sur une plage vélo qui va jusqu'à
 *   211 km demanderait 420 taps. Il suit donc le rapport que game-rules a déjà
 *   fixé entre les deux tables de distances (×5), et rien d'autre.
 */
import { activityRouting, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import type { SuggestionBounds } from './suggestion';

/** Le seul facteur d'unité du module (game-rules parle mètres, l'écran km). */
const M_PER_KM = 1000;

/**
 * Pas du sélecteur de distance À L'ÉCHELLE DE LA COURSE À PIED (km). MESURE DE
 * COMPOSITION : il ne décide d'aucun claim, d'aucun point, d'aucune protection —
 * il ne règle que la granularité des boutons « − / + ». Les autres disciplines
 * ne le recopient pas : elles le mettent à LEUR échelle (cf. `plannerStepKm`).
 */
const STEP_AT_RUN_SCALE_KM = 0.5;

/** Distances suggérables d'une discipline (m), TRIÉES — game-rules ne promet pas l'ordre. */
function choicesM(activity: Activity): readonly number[] {
  const raw = activityRouting(activity).targetDistanceChoicesM;
  return [...raw].filter((m) => Number.isFinite(m) && m > 0).sort((a, b) => a - b);
}

/**
 * La plus petite distance proposée EN UN TAP dans une discipline (m). Sert
 * uniquement d'UNITÉ D'ÉCHELLE (pas du sélecteur, bandes de format) : c'est le
 * rapport entre les deux tables que game-rules garantit (×5), pas leur valeur.
 * Repli sur `targetDistanceMinM` si la table venait à être vidée : mieux vaut
 * une borne sourcée mais basse qu'un `undefined` qui ferait passer `NaN` dans
 * tout l'écran.
 */
function smallestChoiceM(activity: Activity): number {
  return choicesM(activity)[0] ?? activityRouting(activity).targetDistanceMinM;
}

/** Distances proposées en un tap (km), triées croissant. */
export function plannerChoicesKm(activity: Activity): readonly number[] {
  return choicesM(activity).map((m) => m / M_PER_KM);
}

/** Plancher du SÉLECTEUR (km) — cf. l'en-tête : 1,5 × le périmètre de capture. */
export function plannerMinKm(activity: Activity): number {
  return activityRouting(activity).plannerMinM / M_PER_KM;
}

/** Plafond du SÉLECTEUR (km) — le repère long de la discipline, jamais l'ingérable. */
export function plannerMaxKm(activity: Activity): number {
  return activityRouting(activity).plannerMaxM / M_PER_KM;
}

/**
 * Pas du sélecteur (km), à l'échelle de la discipline. Le rapport entre deux
 * disciplines est celui de leurs tables de distances (×5 entre course et vélo,
 * cf. game-rules) : on ne choisit pas un second nombre, on transporte le premier.
 */
export function plannerStepKm(activity: Activity): number {
  const scale = smallestChoiceM(activity) / smallestChoiceM(DEFAULT_ACTIVITY);
  // 1 décimale : le pas sert à composer un affichage, pas à mesurer un effort.
  return Math.round(STEP_AT_RUN_SCALE_KM * scale * 10) / 10;
}

/** Bornes complètes, dans la forme qu'attend le résolveur de suggestion. */
export function plannerBounds(activity: Activity): SuggestionBounds {
  return {
    minKm: plannerMinKm(activity),
    maxKm: plannerMaxKm(activity),
    stepKm: plannerStepKm(activity),
    // Rien de su sur le joueur ⇒ `plannerDefaultM`, PAS le plancher : proposer
    // d'office la plus petite boucle atteignable serait supposer un débutant.
    fallbackKm: activityRouting(activity).plannerDefaultM / M_PER_KM,
  };
}

/**
 * Borne une distance dans la plage de SA discipline. Une valeur non finie
 * (champ vidé, saisie abîmée) retombe sur le défaut plutôt que de propager un
 * `NaN` jusqu'au routeur, qui renverrait une URL invalide sans rien dire.
 */
export function clampPlannerKm(activity: Activity, km: number): number {
  const { minKm, maxKm, fallbackKm } = plannerBounds(activity);
  if (!Number.isFinite(km)) return fallbackKm;
  return Math.min(maxKm, Math.max(minKm, km));
}

/**
 * Les DEUX formats fixes proposés à côté de la distance recommandée. Ils ne sont
 * plus écrits à la main (2 km / 5 km, deux nombres sans source) : ils sont PRIS
 * DANS la table sourcée — la plus PETITE distance proposable en un tap qui tienne
 * au-dessus du plancher du sélecteur, et la plus longue. À pied, cela redonne
 * exactement la « boucle courte » de 2 km que le chantier vélo avait fait
 * disparaître ; à vélo, cela donne 10 km, son équivalent d'échelle.
 *
 * La « Recommandée », elle, reste la distance personnalisée : les trois segments
 * restent distincts même quand la recommandation retombe sur le défaut (3 km à
 * pied), puisque le défaut n'est ni le plancher ni un format.
 */
export interface PlannerFormatsKm {
  shortKm: number;
  longKm: number;
}

export function plannerFormatsKm(activity: Activity): PlannerFormatsKm {
  const km = plannerChoicesKm(activity);
  const floor = plannerMinKm(activity);
  // `>=` et pas `>` : une pastille posée pile sur le plancher reste proposable —
  // c'est le plancher qui porte déjà la marge de routage, pas les pastilles.
  return {
    shortKm: km.find((k) => k >= floor) ?? km[0] ?? floor,
    longKm: km[km.length - 1] ?? floor,
  };
}

/**
 * Bandes de FORMAT (km) — l'adjectif affiché sous le tracé (« format court »,
 * « format moyen », « grande boucle »). MESURES DE COMPOSITION, mais à l'échelle
 * de la discipline : sans ça, un 10 km à vélo — la plus PETITE sortie proposée en
 * un tap — s'annoncerait comme une « grande boucle ». Même transport d'échelle
 * que le pas.
 */
const SHORT_FORMAT_MAX_AT_RUN_SCALE_KM = 3;
const MEDIUM_FORMAT_MAX_AT_RUN_SCALE_KM = 6;

export function formatBandsKm(activity: Activity): { shortMaxKm: number; mediumMaxKm: number } {
  const scale = smallestChoiceM(activity) / smallestChoiceM(DEFAULT_ACTIVITY);
  return {
    shortMaxKm: SHORT_FORMAT_MAX_AT_RUN_SCALE_KM * scale,
    mediumMaxKm: MEDIUM_FORMAT_MAX_AT_RUN_SCALE_KM * scale,
  };
}

/**
 * Profil de routage de la discipline (OSRM `foot` / `bike`). Passe par
 * game-rules : router un cycliste au profil piéton produit un tracé que personne
 * ne peut suivre (escaliers, passages, sens interdits piétonnisés) — donc un
 * bouton qui ment.
 */
export function plannerRoutingProfile(activity: Activity): string {
  return activityRouting(activity).profile;
}

/**
 * LA GARANTIE D'HONNÊTETÉ DU PLANIFICATEUR : une distance PROPOSÉE fait-elle une
 * zone dans sa discipline ?
 *
 * Comparaison STRICTE là où le moteur accepte l'égalité (`< loopMinPerimeterM`
 * ⇒ rejet). Ce n'est pas de la timidité : le planificateur propose une CIBLE, et
 * le routeur rend la longueur des rues qu'il a trouvées — jamais la cible au
 * mètre près. Une proposition posée exactement sur le plancher reviendrait donc
 * une fois sur deux en dessous. La marge n'est pas un nombre inventé : c'est
 * `PLANNER_FLOOR_PERIMETER_FACTOR` (×1,5), que game-rules met entre le périmètre
 * minimal d'une discipline et la plus petite distance que son sélecteur peut
 * atteindre — et cette fonction vérifie que la marge a bien été tenue, quelle
 * que soit la distance qu'un écran finit par afficher.
 */
export function proposalMakesZone(activity: Activity, km: number): boolean {
  return km * M_PER_KM > activityRouting(activity).loopMinPerimeterM;
}
