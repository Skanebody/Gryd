/**
 * GRYD — CE QUE LE PROFIL RACONTE DU TERRITOIRE, quand il n'a pas de lentille.
 *
 * ─── LE PROBLÈME, EN UNE PHRASE ─────────────────────────────────────────────
 * La planche E14 pose le commutateur Run/Bike sur QUATRE surfaces : Carte,
 * Classement, Historique, Statistiques. Le Profil n'en fait pas partie — c'est
 * une carte de visite, pas un monde. Il lisait donc `hex_claims` sans discipline,
 * c'est-à-dire dans le monde par DÉFAUT, et un joueur qui ne roule qu'à vélo y
 * était déclaré « nouveau joueur » alors qu'il tient du territoire.
 *
 * ─── LA RÈGLE APPLIQUÉE ICI ─────────────────────────────────────────────────
 * Une surface sans commutateur n'a que deux réponses honnêtes : montrer les DEUX
 * mondes côte à côte (jamais sommés — E14), ou DIRE lequel elle montre. Ce
 * module tranche ainsi, et c'est la seule décision qu'il prend :
 *
 *   · aucun des deux mondes n'a de zone  → `none` : le compte est réellement
 *     neuf, la PREMIÈRE MISSION a raison de s'afficher ;
 *   · UN SEUL monde a des zones          → `single` : l'écran montre CE monde et
 *     le NOMME. Pas de choix silencieux : le joueur lit « à vélo » ;
 *   · les DEUX ont des zones             → `both` : les deux, côte à côte, avec
 *     leurs deux mesures. JAMAIS un total.
 *
 * POURQUOI `single` PLUTÔT QUE « toujours les deux » : afficher « 0,00 km² à
 * vélo » à quelqu'un qui n'a jamais roulé, c'est le « 0 nu » que la loi du
 * projet interdit — un zéro qui se lit comme un échec sur une discipline qu'on
 * n'a jamais pratiquée. Un monde vide n'est pas une métrique, c'est une absence,
 * et une absence ne se peint pas.
 *
 * POURQUOI LE NOM DE LA DISCIPLINE EST OBLIGATOIRE en `single` : sans lui,
 * l'écran choisirait en silence — exactement le défaut corrigé. C'est le type
 * qui l'impose (`activity` est un champ requis de la variante), pas une
 * convention de rendu.
 *
 * PUR — zéro React, zéro réseau, zéro horloge.
 */
import { ACTIVITIES, type Activity } from '@klaim/shared';

/** Les deux mesures d'UN monde. Elles ne quittent jamais leur discipline. */
export interface WorldMeasure {
  /** Somme des aires de MES zones, en m². */
  areaM2: number;
  /** Nombre d'hexagones tenus. */
  zones: number;
}

/** Un monde nommé — la discipline voyage AVEC ses chiffres, jamais à côté. */
export interface NamedWorld extends WorldMeasure {
  activity: Activity;
}

/**
 * Ce que le bloc de métriques du Profil doit rendre. Discriminé : aucun écran ne
 * peut lire une aire sans savoir de quelle discipline elle parle.
 */
export type ProfileTerritoryView =
  | { kind: 'none' }
  | { kind: 'single'; world: NamedWorld }
  | { kind: 'both'; worlds: readonly [NamedWorld, NamedWorld] };

/**
 * Un monde COMPTE-T-IL comme peuplé ? On se fie aux ZONES et pas à l'aire : une
 * aire nulle sur des zones réelles serait une anomalie de géométrie (cellule
 * illisible), pas une absence de territoire — et faire disparaître le monde
 * pour cette raison effacerait des zones que le joueur possède vraiment.
 */
function held(measure: WorldMeasure): boolean {
  return measure.zones > 0;
}

/**
 * Décide ce que le Profil montre. L'ordre de `both` suit `ACTIVITIES`, donc
 * l'ordre du commutateur E14 : les deux surfaces qui parlent des mêmes mondes ne
 * doivent pas les présenter dans un ordre différent.
 */
export function profileTerritoryView(
  measures: Readonly<Record<Activity, WorldMeasure>>,
): ProfileTerritoryView {
  const populated: NamedWorld[] = ACTIVITIES.filter((a) => held(measures[a])).map((activity) => ({
    activity,
    ...measures[activity],
  }));
  const [first, second] = populated;
  if (first === undefined) return { kind: 'none' };
  if (second === undefined) return { kind: 'single', world: first };
  return { kind: 'both', worlds: [first, second] };
}

/**
 * Le compte est-il RÉELLEMENT neuf ? Le Profil remplace alors ses métriques par
 * la PREMIÈRE MISSION — quatre zéros alignés se liraient « tu as échoué ».
 *
 * Cette fonction existe pour que la question ne soit plus posée sur UN monde. Le
 * défaut corrigé le 26/07 tenait précisément à ça : `mine.length === 0` était
 * calculé sur la seule course à pied, donc un cycliste recevait l'écran de
 * bienvenue à chaque ouverture de son Profil, indéfiniment.
 */
export function isNewPlayerAcrossActivities(view: ProfileTerritoryView): boolean {
  return view.kind === 'none';
}

/**
 * Les mondes à ILLUSTRER (carte signature). Même liste que ce que le bloc de
 * métriques nomme : une silhouette sans chiffre, ou l'inverse, laisserait croire
 * que l'écran parle de deux périmètres différents.
 *
 * Un monde vide n'y figure jamais — une vignette vide n'est pas une signature,
 * c'est un trou (raison déjà écrite dans `SignatureMapCard`).
 */
export function illustratedWorlds(view: ProfileTerritoryView): readonly NamedWorld[] {
  if (view.kind === 'none') return [];
  return view.kind === 'single' ? [view.world] : view.worlds;
}
