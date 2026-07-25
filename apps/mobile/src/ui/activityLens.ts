/**
 * GRYD — E14 « commutateur Run / Bike » : TOUTE la logique dérivée, en fonctions
 * PURES (zéro React, zéro stockage, zéro réseau) — donc testable sous Deno.
 *
 * La planche E14 dit quatre choses que du code doit tenir, et pas une copie :
 *   1. le commutateur est « présent sur toutes les pages utiles : carte,
 *      classements, historique, profil-stats » ;
 *   2. il est « visible seulement si Bike est activé ; masqué sinon, JAMAIS
 *      grisé » et « VERROUILLÉ pendant une course » ;
 *   3. « le choix est mémorisé PAR ONGLET » — donc une clé de persistance par
 *      surface, jamais un réglage global qui téléporterait la lentille ;
 *   4. « SÉPARATION STRICTE : jamais Run + Bike dans une même lecture
 *      compétitive, jamais de somme ».
 *
 * ─── LE POINT D'HONNÊTETÉ, QUI EST TOUT LE SUJET ────────────────────────────
 * L'univers vélo est VIDE. Pas « pas encore rempli » : structurellement vide —
 * la discipline d'une sortie est DÉCLARÉE par le chemin qui la lance, et tous
 * déclarent la course à pied (`features/run/gps/runActivity.ts`,
 * `DECLARED_START_ACTIVITY: Extract<Activity, 'run'>`). Basculer en Bike sur le
 * Classement, l'Historique ou les Statistiques ne doit donc JAMAIS montrer les
 * données Run sous une étiquette vélo : ce serait exactement la donnée
 * fabriquée que la charte interdit. `activityIsRecorded` porte ce fait, et
 * `activitySwitch.test.ts` casse le jour où la déclaration s'élargit — pour que
 * la COPIE des états vides soit revue AVANT que le vélo n'existe, pas après.
 */
import { ACTIVITIES, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';

/** Les surfaces de la planche E14 qui portent le commutateur. */
export const ACTIVITY_SURFACES = ['map', 'classement', 'historique', 'stats'] as const;
export type ActivitySurface = (typeof ACTIVITY_SURFACES)[number];

/**
 * Clé de persistance de la préférence, PAR SURFACE (planche : « le choix est
 * mémorisé par onglet »). Une seule clé partagée ferait basculer la Carte
 * quand on regarde le Classement en vélo — ce n'est pas ce que la planche
 * décrit, et ça téléporterait la lentille d'un écran qu'on ne regarde pas.
 *
 * La Carte GARDE sa clé historique `gryd.mapactivity` : elle est déjà écrite
 * sur les téléphones du pilote, et la renommer effacerait un choix réel de
 * l'utilisateur (la migration ne se réécrit jamais, même côté client).
 */
const LEGACY_MAP_STORAGE_KEY = 'gryd.mapactivity';

export function activityStorageKey(surface: ActivitySurface): string {
  return surface === 'map' ? LEGACY_MAP_STORAGE_KEY : `gryd.activity.${surface}`;
}

/**
 * Lecture DÉFENSIVE d'une valeur stockée. `null` = illisible ou inconnue :
 * l'appelant retombe alors sur le défaut, il n'invente pas une discipline.
 */
export function parseActivity(raw: string | null | undefined): Activity | null {
  return typeof raw === 'string' && (ACTIVITIES as readonly string[]).includes(raw)
    ? (raw as Activity)
    : null;
}

/**
 * Les disciplines dont GRYD sait RÉELLEMENT enregistrer une sortie aujourd'hui.
 *
 * Ce n'est pas une opinion : c'est le miroir de `DECLARED_START_ACTIVITY`, dont
 * le type `Extract<Activity, 'run'>` interdit au compilateur toute autre valeur.
 * Une surface qui bascule sur une discipline NON enregistrée doit rendre un
 * état vide NOMMÉ — jamais les lignes de l'autre monde sous une nouvelle
 * étiquette, jamais un « 0 » nu.
 */
export const RECORDED_ACTIVITIES: readonly Activity[] = ['run'];

export function activityIsRecorded(activity: Activity): boolean {
  return RECORDED_ACTIVITIES.includes(activity);
}

/** Ce que l'écran sait au moment de décider d'afficher le commutateur. */
export interface ActivitySwitchContext {
  /** `flags.bike` — « visible seulement si Bike est activé » (planche E14). */
  bikeEnabled: boolean;
  /**
   * Une course est-elle RÉELLEMENT en cours (buffer GPS frais) ? La planche dit
   * « verrouillé pendant une course » ; la charte dit « masqué, jamais grisé ».
   * Un commutateur grisé serait un contrôle mort de plus — on le retire.
   *
   * ATTENTION : passer `true` tant que la lecture du stockage n'a pas abouti
   * ferait clignoter le contrôle à chaque ouverture d'écran. Une lecture non
   * aboutie n'est pas un verrou : l'appelant passe `running`, jamais `loading`.
   */
  runLive: boolean;
}

export function activitySwitchVisible({ bikeEnabled, runLive }: ActivitySwitchContext): boolean {
  return bikeEnabled && !runLive;
}

/**
 * LENTILLE EFFECTIVE d'une surface — ce que l'écran doit RÉELLEMENT montrer.
 *
 * Le verrou de course a un piège qu'il faut nommer : le commutateur est retiré
 * pendant une course (« masqué, jamais grisé »), or la lentille est MÉMORISÉE.
 * Un joueur qui avait laissé son Historique en Bike, puis qui lance une course
 * et revient sur cet onglet, se retrouverait devant un état vide SANS AUCUN
 * MOYEN d'en sortir. Ce n'est plus un verrou, c'est un cul-de-sac — et un écran
 * dont on ne peut pas sortir est le cousin du bouton mort.
 *
 * Tant qu'une course tourne, la surface montre donc le monde de CETTE course.
 * C'est vrai (il s'y passe quelque chose de réel), c'est utile, et ça
 * n'ÉCRASE PAS la préférence : elle est mise en veille et revient telle quelle
 * à la fin. `liveActivity` est `null` quand aucune course ne tourne.
 *
 * QUAND LE VÉLO SERA ENREGISTRABLE : l'appelant devra passer la discipline
 * DÉCLARÉE de la course en cours, pas une constante. La signature l'accepte
 * déjà ; c'est le seul endroit à revoir.
 */
export function effectiveActivity(stored: Activity, liveActivity: Activity | null): Activity {
  return liveActivity ?? stored;
}

/**
 * SÉPARATION STRICTE (planche E14) — une lecture COMPÉTITIVE est-elle
 * affichable sous cette lentille ?
 *
 * `sourceIsDisciplined` = la source porte-t-elle vraiment la colonne `activity`
 * (migration 0070) ? Deux cas, et un seul est sûr :
 *   · source DISCIPLINÉE (`player_leaderboard`, `season_scores`, `hex_claims`) :
 *     chaque lentille lit son monde, donc tout est affichable ;
 *   · source MONO-POT (`user_stats` → vue `specialty_leaderboard`, `user_badges`,
 *     XP, Foulées — cf. 0070 « ce qui reste en suspens » §2 et §3) : ses chiffres
 *     mélangent les disciplines. Elle ne peut donc s'afficher que sous la
 *     lentille par DÉFAUT, la seule dont ces compteurs disent aujourd'hui la
 *     vérité — les servir sous une étiquette vélo serait la somme interdite.
 */
export function competitiveReadAllowed(activity: Activity, sourceIsDisciplined: boolean): boolean {
  return sourceIsDisciplined || activity === DEFAULT_ACTIVITY;
}
