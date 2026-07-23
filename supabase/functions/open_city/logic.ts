/**
 * GRYD — open_city : la partie PURE (aucune I/O, donc testable telle quelle).
 *
 * Une ville « existe » pour le jeu quand `city_zones` porte sa ligne. Ouvrir une
 * ville, c'est donc écrire cette ligne — et la question dangereuse est : d'où
 * viennent le NOM et la GÉOMÉTRIE de cette ligne ?
 *
 * RÉPONSE, ET C'EST TOUT LE MODULE : du RÉFÉRENTIEL EMBARQUÉ, jamais du client.
 * Le client n'envoie qu'un identifiant. S'il envoie « 2988507 », le serveur va
 * chercher lui-même « Brest, FR, 48.39, -4.49 » dans GeoNames. Un client ne peut
 * donc pas ouvrir « Paris » à Tokyo, ni renommer une ville, ni poser une aire de
 * jeu de sa composition. C'est la même règle que pour un claim : le client
 * propose, le serveur constate.
 */
import {
  CITY_DISC_RADIUS_M,
  isStarterCityId,
  starterCityCenter,
  starterCityName,
} from '../_shared/game-rules.ts';
import { cityDiscPolygon, findCityById, type GeoPolygon } from '../_shared/cities.ts';
import type { EuCity } from '../_shared/types.ts';

/** Motifs de refus, tous NOMMÉS (jamais un 500 générique sur une demande lisible). */
export type OpenCityReject =
  | 'invalid_body'
  | 'missing_city_id'
  | 'bad_city_id'
  | 'unknown_city';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: OpenCityReject };

/**
 * FORME de l'identifiant. Miroir exact de `ingest_run/city_zone.ts`
 * (`CITY_ID_SHAPE`) et de la regex de `provision_city` (migration 0066) : les
 * trois portes acceptent le même alphabet, pour qu'une ville ouvrable soit
 * toujours une ville rattachable.
 */
export const CITY_ID_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;

export function parseOpenCityRequest(raw: unknown): Parsed<string> {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'invalid_body' };
  const cityId = (raw as Record<string, unknown>).cityId;
  if (cityId === undefined || cityId === null || cityId === '') {
    return { ok: false, error: 'missing_city_id' };
  }
  if (typeof cityId !== 'string' || !CITY_ID_SHAPE.test(cityId)) {
    return { ok: false, error: 'bad_city_id' };
  }
  return { ok: true, value: cityId };
}

/** Ce que le serveur va réellement écrire, entièrement dérivé de ses propres sources. */
export interface CityOpeningPlan {
  readonly cityId: string;
  /** Nom du référentiel (ou de la liste de démarrage) — jamais fourni par le client. */
  readonly name: string;
  /** Code pays ISO2, absent pour les villes de démarrage (hors référentiel). */
  readonly country?: string;
  readonly geojson: GeoPolygon;
  /**
   * `true` quand la géométrie proposée est le DISQUE d'aire de jeu — une
   * approximation DÉCLARÉE, pas un contour administratif. Les villes de
   * démarrage ont un contour réel en base (0033) que `provision_city` ne
   * remplace jamais ; le disque calculé pour elles ne sert qu'au cas, anormal,
   * où leur ligne aurait disparu.
   */
  readonly approximateArea: boolean;
  /** Rayon du disque proposé, en mètres — pour que l'appelant puisse le NOMMER. */
  readonly radiusM: number;
}

/**
 * Résout un identifiant en plan d'ouverture, ou refuse.
 *
 * Deux espaces d'identifiants, par construction :
 *  · villes de DÉMARRAGE (`paris`, `lille`) : nom et centre viennent de
 *    `game-rules` (accès GARDÉ — c'est le blocage n°1 de l'audit, on ne
 *    réintroduit pas d'indexation nue) ;
 *  · toute autre ville : son `geonameid`, résolu dans le référentiel embarqué.
 *
 * Un identifiant introuvable dans les DEUX est refusé (`unknown_city`) — on
 * n'ouvre jamais une ville dont on ne sait rien. C'est précisément la frontière
 * de la demande fondateur : « ne pas en inventer une ».
 */
export function planCityOpening(
  cityId: string,
  cities: readonly EuCity[],
): Parsed<CityOpeningPlan> {
  if (isStarterCityId(cityId)) {
    const center = starterCityCenter(cityId);
    const name = starterCityName(cityId);
    if (!center || !name) return { ok: false, error: 'unknown_city' };
    return {
      ok: true,
      value: {
        cityId,
        name,
        geojson: cityDiscPolygon(center),
        approximateArea: true,
        radiusM: CITY_DISC_RADIUS_M,
      },
    };
  }

  const city = findCityById(cities, cityId);
  if (!city) return { ok: false, error: 'unknown_city' };
  return {
    ok: true,
    value: {
      cityId: city.id,
      name: city.name,
      country: city.country,
      geojson: cityDiscPolygon({ lat: city.lat, lng: city.lng }),
      approximateArea: true,
      radiusM: CITY_DISC_RADIUS_M,
    },
  };
}

/** Code HTTP d'un refus — chaque motif en a un, aucun n'est un 500. */
export function statusForReject(reason: OpenCityReject): number {
  return reason === 'unknown_city' ? 404 : 400;
}
