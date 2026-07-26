/**
 * GRYD — engine/activityScope.ts : LA FRONTIÈRE « SÉPARÉ / GLOBAL », EXÉCUTABLE.
 *
 * POURQUOI CE FICHIER EXISTE. La décision fondateur du 26/07/2026 tient en deux
 * phrases contradictoires en apparence : « SÉPARÉS par discipline : les
 * territoires, les courses, les classements de saison, les statistiques,
 * l'historique, les missions » et « GLOBAL, partagé par les deux : LE NIVEAU ET
 * L'XP DU JOUEUR ». Écrite en commentaire, cette frontière se relit de travers :
 * un agent qui « met le vélo au propre » scinde l'XP par discipline (il croit
 * bien faire — la planche E12 dit « rangs SÉPARÉS »), un autre affiche « mes
 * zones » en sommant les deux mondes (il croit bien faire — le joueur n'en a
 * qu'un, de territoire, vu de loin). Les deux fautes sont SILENCIEUSES : rien ne
 * plante, les chiffres ont l'air plausibles, et le jeu ment.
 *
 * Ce module rend les deux fautes IMPOSSIBLES À COMMETTRE SANS LE SAVOIR :
 *   · `splitByActivity` REFUSE une dimension globale (scinder l'XP lève) ;
 *   · `totalAcrossActivities` REFUSE une dimension séparée (sommer les
 *     territoires lève).
 * La table de vérité est `ACTIVITY_SCOPE` (game-rules — source unique) ; ici,
 * seulement des fonctions PURES qui la font respecter. Aucune I/O, aucune
 * horloge, aucun nombre magique.
 *
 * CE QUE CE MODULE NE FAIT PAS : il ne va PAS chercher les données. Il ne sait
 * pas si un lecteur a oublié son `.eq('activity', …)` — ça, seule une requête le
 * dit. Il garantit qu'une fois les données lues, on ne peut plus les additionner
 * du mauvais côté de la frontière.
 */
import {
  ACTIVITIES,
  ACTIVITY_SCOPE,
  type Activity,
  type ActivityScopedDimension,
  type ActivityScopeKind,
} from '@klaim/shared/game-rules';

/** Camp d'une dimension : deux mondes (`per_activity`) ou un seul (`global`). */
export function activityScopeOf(dimension: ActivityScopedDimension): ActivityScopeKind {
  return ACTIVITY_SCOPE[dimension];
}

/** VRAI si la dimension vit dans DEUX mondes qui ne se somment jamais. */
export function isPerActivity(dimension: ActivityScopedDimension): boolean {
  return ACTIVITY_SCOPE[dimension] === 'per_activity';
}

/** VRAI si la dimension est UNE valeur, nourrie par les deux disciplines. */
export function isGlobalScope(dimension: ActivityScopedDimension): boolean {
  return ACTIVITY_SCOPE[dimension] === 'global';
}

/** Une quantité mesurée DANS une discipline (une ligne de score, de zones…). */
export interface ActivityMeasure {
  readonly activity: Activity;
  readonly value: number;
}

/**
 * Compte PAR DISCIPLINE. Les deux disciplines sont TOUJOURS présentes dans le
 * résultat, à 0 si rien n'a été mesuré : un monde vide est un fait honnête
 * (« vous n'avez pas encore de territoire à vélo »), pas une absence de clé qui
 * ferait afficher un tiret ou disparaître le commutateur E14.
 *
 * LÈVE si la dimension est GLOBALE. C'est le verrou anti-« on scinde l'XP » :
 * `splitByActivity('xp', …)` ne peut pas compiler par erreur puis mentir en
 * silence — il s'arrête net, en nommant la décision fondateur du 26/07/2026.
 */
export function splitByActivity(
  dimension: ActivityScopedDimension,
  measures: readonly ActivityMeasure[],
): Readonly<Record<Activity, number>> {
  if (!isPerActivity(dimension)) {
    throw new Error(
      `activityScope: « ${dimension} » est GLOBAL (décision fondateur 26/07/2026 : ` +
        `« LE NIVEAU DOIT ÊTRE GLOBAL »). Le scinder par discipline fabriquerait ` +
        `deux demi-progressions là où le joueur en a une seule. Utiliser ` +
        `totalAcrossActivities().`,
    );
  }
  const out = {} as Record<Activity, number>;
  for (const a of ACTIVITIES) out[a] = 0;
  for (const m of measures) {
    // Une discipline inconnue n'est pas repliée en silence sur la course : la
    // compter ailleurs fabriquerait un chiffre. On refuse.
    if (!(m.activity in out)) {
      throw new Error(`activityScope: discipline inconnue « ${m.activity} »`);
    }
    out[m.activity] += m.value;
  }
  return out;
}

/**
 * Somme TOUTES disciplines confondues. C'est la SEULE fonction du moteur
 * autorisée à franchir la frontière, et elle ne le fait que pour les dimensions
 * déclarées globales.
 *
 * LÈVE si la dimension est SÉPARÉE. C'est le verrou anti-« on somme les
 * territoires » : E14 dit « crews hybrides = deux métriques côte à côte, JAMAIS
 * SOMMÉES », et un total de zones run+bike serait exactement la somme interdite
 * — d'autant qu'un même hexagone peut être tenu dans les DEUX mondes (clé
 * primaire composite `(h3index, activity)`, migration 0070) : le « total »
 * compterait deux fois la même parcelle de ville.
 */
export function totalAcrossActivities(
  dimension: ActivityScopedDimension,
  measures: readonly ActivityMeasure[],
): number {
  if (!isGlobalScope(dimension)) {
    throw new Error(
      `activityScope: « ${dimension} » est SÉPARÉ par discipline (E14 : « jamais ` +
        `sommées »). Un total mêlerait deux mondes — et pour le territoire, ` +
        `compterait deux fois un hexagone tenu dans les deux. Utiliser ` +
        `splitByActivity().`,
    );
  }
  let total = 0;
  for (const m of measures) {
    if (!(ACTIVITIES as readonly string[]).includes(m.activity)) {
      throw new Error(`activityScope: discipline inconnue « ${m.activity} »`);
    }
    total += m.value;
  }
  return total;
}

/**
 * Garde-fou d'écriture : la discipline sous laquelle une mesure doit être
 * ENREGISTRÉE. Pour une dimension séparée, c'est celle de la sortie ; pour une
 * dimension globale, il n'y en a pas — et rendre `null` plutôt que
 * DEFAULT_ACTIVITY est délibéré : écrire « run » sur une ligne d'XP laisserait
 * croire, six mois plus tard, que l'XP a une discipline.
 */
export function writeActivityFor(
  dimension: ActivityScopedDimension,
  activity: Activity,
): Activity | null {
  return isPerActivity(dimension) ? activity : null;
}
