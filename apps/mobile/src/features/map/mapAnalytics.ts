/**
 * GRYD — E11 : les deux DÉRIVATIONS que la mesure de la Carte exige, en PUR.
 *
 * `map_view { state }` et `map_zone_tap { role }` portent des unions FERMÉES
 * décrites dans `packages/shared/src/events.ts`. Écrites en ternaires dans un
 * composant, elles se seraient réordonnées à la première refonte visuelle — et
 * la barre PostHog aurait changé de sens sans que personne ne s'en aperçoive.
 * Elles vivent donc ici : pures, testées sous Deno, et PARTAGÉES par les deux
 * forks de `MapScreen` (natif et web), qui divergent déjà sur tout le reste.
 *
 * ZÉRO PII, ET C'EST LE POINT (events.ts, règle 5 de la vague) : aucune de ces
 * deux fonctions ne reçoit — ni ne peut donc renvoyer — un `zoneId`, un
 * `sectorId`, une coordonnée, un zoom ou un nom de quartier. Elles remplacent
 * `screen('map_zone_open', { zone })`, qui envoyait l'identifiant d'une zone,
 * c'est-à-dire la position du joueur à ~100 m près.
 */
import type { MapRecommendationKind } from '@klaim/shared';
import type { ZoneOwnership } from './zoneDetail';

/**
 * Les six états que la carte peut avoir RÉELLEMENT rendus (contrat
 * `EVENTS.mapView`) : les quatre de la constitution, plus les deux que seule
 * cette carte connaît.
 */
export type MapViewState =
  | 'signed_out'
  | 'locating'
  | 'no_location'
  | 'empty'
  | 'failed'
  | 'ready';

/** Ce que l'écran sait, au moment où il compose. Aucun de ces faits n'est deviné. */
export interface MapViewFacts {
  /** Pas de session (ou backend absent) — la carte est vide faute de joueur. */
  readonly signedOut: boolean;
  /** Une lecture est EN VOL (session en restauration, territoires en requête). */
  readonly loading: boolean;
  /** Lecture aboutie et RATÉE. Jamais confondue avec un vide. */
  readonly failed: boolean;
  /** La position est-elle connue ? `false` = refusée, jamais demandée, ou muette. */
  readonly hasLocation: boolean;
  /** Nombre de territoires LUS, `null` tant qu'on ne sait pas encore. */
  readonly territoryCount: number | null;
}

/**
 * L'ÉTAT COMPOSÉ, dans l'ORDRE de priorité de l'écran lui-même — c'est la seule
 * façon que la mesure ne raconte pas une autre histoire que la pill du bas de
 * carte (`MapScreen.mapNote`) :
 *
 *   1. `signed_out` — il n'y a personne ; rien d'autre n'a de sens ;
 *   2. `failed`     — on a essayé et raté : ce n'est PAS un vide ;
 *   3. `locating`   — une lecture est en vol : on n'affirme RIEN sur le joueur ;
 *   4. `no_location`— on sait ce qu'il possède, mais pas OÙ IL EST : c'est ce
 *      qui explique une carte cadrée sur le monde entier, et c'est la première
 *      chose que la pill dit ;
 *   5. `empty`      — lu, et réellement vide ;
 *   6. `ready`      — lu, non vide, position connue.
 *
 * ⚠ `territoryCount === null` SANS `loading` ne peut pas exister honnêtement :
 * on retombe alors sur `locating` plutôt que d'inventer `empty`.
 */
export function mapViewState(facts: MapViewFacts): MapViewState {
  if (facts.signedOut) return 'signed_out';
  if (facts.failed) return 'failed';
  if (facts.loading || facts.territoryCount === null) return 'locating';
  if (!facts.hasLocation) return 'no_location';
  return facts.territoryCount === 0 ? 'empty' : 'ready';
}

/**
 * RÔLE de la zone tapée (contrat `EVENTS.mapZoneTap`) — le rôle, jamais
 * l'identité, jamais l'identifiant.
 *
 * `null` = ON NE SAIT PAS ENCORE, et alors AUCUN event n'est émis. Le cas est
 * réel : tant que la lecture du crew est en vol, `zoneOwnership` renvoie
 * `'unknown'` et désigner 'rival' par défaut inscrirait un fait faux dans
 * l'entrepôt (la zone peut très bien être celle de mon crew). Un trou dans la
 * série est honnête ; une valeur inventée ne l'est pas.
 *
 * `'free'` fait partie de l'union du contrat mais n'est JAMAIS renvoyé ici, et
 * c'est structurel : une zone libre n'est pas peinte (« le neutre n'existe pas :
 * c'est la basemap », territory.ts), donc elle ne peut pas être tapée. La valeur
 * reste au contrat pour le jour où la carte peindra du libre.
 */
export function zoneTapRole(
  status: string | null,
  ownership: ZoneOwnership | null,
): 'mine' | 'crew' | 'rival' | 'contested' | null {
  // `contested` gagne sur la propriété — même arbitrage que `territoryRole`
  // (territoriesSource.ts) : c'est l'état qui déclenche l'action.
  if (status === 'contested') return 'contested';
  if (ownership === 'personal') return 'mine';
  if (ownership === 'crew') return 'crew';
  if (ownership === 'rival') return 'rival';
  return null;
}

/**
 * RECOMMANDATION affichée (contrat `EVENTS.mapRecommendationShown`), dérivée de
 * la mission RÉELLE que la Carte a calculée (`useRealMission`).
 *
 * La traduction est volontairement PAUVRE, et c'est le fond du sujet :
 *   · `defend_expiring` → 'defense_urgent' (priorité 1 de la spec l.871) ;
 *   · `expand`          → 'free_conquest'  (priorité 4 — étendre son territoire
 *     EST de la conquête libre, dérivée de mes vraies captures) ;
 *   · tout le reste     → 'none', c'est-à-dire l'AVEU qu'aucun fait ne permet de
 *     recommander. `first_capture` en fait partie : « prends ta première zone »
 *     est un état vide pédagogique, pas une mission située.
 *
 * `crew_mission` et `suggested_loop` NE SONT JAMAIS ÉMIS aujourd'hui, et ça se
 * voit : aucune mission crew ni aucune boucle suggérée n'alimente cette surface.
 * Les mapper de force sur `expand` aurait rendu le KPI illisible — c'est
 * exactement l'inconfort que le docblock de l'event revendique.
 */
export function mapRecommendationKind(
  missionKind: string | null,
): MapRecommendationKind | 'none' {
  if (missionKind === 'defend_expiring') return 'defense_urgent';
  if (missionKind === 'expand') return 'free_conquest';
  return 'none';
}
