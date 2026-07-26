/**
 * GRYD — LE TYPE DE LA BOUCLE PLANIFIÉE.
 *
 * ─── CE QUI A DISPARU LE 25/07/2026, ET POURQUOI ───────────────────────────────
 * Ce fichier s'appelait `PlannedRouteDemo` et transportait un RÉSULTAT DE JEU :
 * `zones`, `loopZones`, `points`, `streetsToSave`, `expiresInH`, `difficulty`.
 * Aucun de ces champs n'était mesuré. `liveRouting.ts` les fabriquait côté client
 * à partir de deux constantes inventées (`ZONES_PER_KM = 15.3`,
 * `LOOP_ZONE_RATIO = 0.6`), puis l'écran les affichait à trois endroits — pendant
 * que le bloc de métriques du même écran déclarait, en commentaire, que le gain
 * territorial restait un point ouvert et n'était donc PAS affiché.
 *
 * Deux règles non négociables étaient violées à la fois :
 *   · « tout claim est décidé serveur » — le client n'attribue jamais un hex, et
 *     annoncer « +64 zones » AVANT la course est déjà une attribution ;
 *   · « aucun nombre magique » — 15,3 et 0,6 ne venaient pas de `game-rules.ts`,
 *     ils ne venaient de nulle part.
 *
 * Ce qui reste ici est exactement ce qu'OSRM a réellement renvoyé : un tracé et
 * sa longueur. Le nom `…Demo` part avec (AMENDEMENT-47 : plus rien n'est « démo »).
 *
 * ─── CE QUI A DISPARU AUSSI : LES CATALOGUES MORTS ─────────────────────────────
 * `ROUTE_OBJECTIVE_LABELS`, `ROUTE_TYPE_LABELS`, `ROUTE_PRIORITY_LABELS`,
 * `ROUTE_SHAPE_LABELS`, `OBJECTIVE_BY_ROUTE_TYPE` : cinq tables de libellés EN
 * FRANÇAIS EN DUR, sans un seul appelant dans tout le dépôt. Elles auraient fui
 * en français au premier affichage, dans les cinq langues. Le `RouteShape`
 * réellement utilisé (réglages, « Mes parcours ») vient de `@klaim/shared` —
 * celui d'ici en était un homonyme fantôme.
 */
import type { Activity } from '@klaim/shared';
import type { LatLngPoint } from '../map/basemap';

/**
 * Les DEUX verbes joueur (AMENDEMENT-12 §A). « attaquer » a été retiré : il
 * n'était proposé nulle part dans l'interface depuis l'amendement, mais restait
 * dans le type — et donc dans un cap de boussole, une icône « guerre » et une
 * puce « Frontière rivale » que personne ne pouvait atteindre. Du code mort qui
 * a l'air vivant est un piège pour le prochain lecteur.
 */
export type PlannerIntention = 'conquerir' | 'defendre';

export const PLANNER_INTENTIONS: readonly PlannerIntention[] = ['conquerir', 'defendre'];

/**
 * Une boucle RÉELLEMENT routée (OSRM, au profil de sa discipline), telle qu'elle
 * revient du réseau. Chaque champ est une MESURE ou un fait observé — rien n'est
 * dérivé d'une règle de jeu, rien n'anticipe une décision serveur.
 */
export interface PlannedLoop {
  /** Identité stable de la proposition (clé de rendu + sélection). */
  id: string;
  /**
   * Nom du secteur de DÉPART, résolu par reverse-geocode (`resolveSectorName`)
   * à partir de la position réelle. Jamais un toponyme inventé : sans réseau,
   * l'appelant passe « Ma position ».
   */
  zone: string;
  /** Le tracé renvoyé par OSRM, décimé — il SUIT LES RUES, il n'est pas dessiné. */
  line: readonly LatLngPoint[];
  /** Longueur MESURÉE de la boucle (km, 1 décimale) — la seule métrique sourcée. */
  distanceKm: number;
  /** L'objectif demandé par le joueur (oriente la boucle). Un choix, pas un calcul. */
  intention: PlannerIntention;
  /**
   * Discipline dans laquelle cette boucle a été routée. Ce n'est PAS une
   * décoration : le profil de routage en dépend (`foot` / `bike`), donc deux
   * boucles de même longueur au même endroit ne sont pas la même boucle. Le
   * champ existe pour qu'aucun écran ne puisse afficher un tracé de coureur
   * sous une lentille vélo sans que ce soit visible dans la donnée.
   */
  activity: Activity;
}
