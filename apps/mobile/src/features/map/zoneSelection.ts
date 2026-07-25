/**
 * GRYD — DÉRIVATION PURE de la zone tapée (planche E04) : `hex_claims` +
 * `sector_snapshot` → ce que la sheet a le droit de dire.
 *
 * POURQUOI CE MODULE EXISTE PLUTÔT QU'UN useMemo DANS CHAQUE ÉCRAN. La carte a
 * DEUX implémentations tenues à la PARITÉ STRICTE — `MapScreen.tsx` (natif) et
 * `MapScreen.web.tsx` (localhost, seul instrument de contrôle du fondateur). Une
 * sélection recopiée des deux côtés finit toujours par diverger : c'est
 * exactement comme ça que les zones du crew étaient sorties en orange rival sur
 * localhost et en chartreuse sur iPhone (corrigé le 21/07). Ici, une seule
 * fonction, testée, appelée par les deux écrans.
 *
 * Zéro import React/RN : Deno charge ce module tel quel.
 */
import type { RealTerritory } from './territoryBuild';

/**
 * Ce que la sélection a besoin de savoir d'un secteur — et rien de plus. Prendre
 * `RealSectorView` entier lierait ce module au rendu des secteurs (contour,
 * rôles, parts) alors qu'il n'en lit que deux champs. `RealSectorView` s'y
 * conforme structurellement : les écrans passent leurs vues telles quelles.
 */
export interface ZoneSectorFact {
  id: string;
  contested: boolean;
}

/**
 * Une VRAIE zone tapée, réduite à ce que le serveur sait réellement dire : un
 * RÔLE (moi/mon crew vs rival — §C, jamais une couleur par crew), un nombre de
 * zones, une surface EXACTE, la date du dernier claim, le centre géographique et
 * l'état CONTESTÉ du secteur qui la contient.
 *
 * Pas de nom de crew, pas d'avatar, pas de « contrôle % », pas d'« effort
 * estimé », pas de « dernière activité » du rival : rien de tout cela n'a de
 * source, et la RLS `runs_select_own` interdit d'ailleurs au client de lire
 * l'activité d'autrui. Une fraîcheur d'activité rivale serait en plus un premier
 * pas vers la position live, que la planche interdit explicitement.
 */
export interface MapZoneView {
  role: 'mine' | 'rival';
  zones: number;
  areaKm2: number;
  /**
   * Claim le plus RÉCENT du territoire (ISO), `null` si aucune ligne ne le
   * porte. Sert la métrique « Dernière prise » — et surtout PAS un « tenu
   * depuis », qui sous-estimerait la possession (cf. zoneDecision.ts).
   */
  capturedAt: string | null;
  /** Centroïde réel : cadrage caméra (E04) + géocodage inverse du nom. */
  center: { lat: number; lng: number } | null;
  /** Secteur H3 res 7 principal — clé de CACHE du nom de quartier. */
  sectorId: string | null;
  /**
   * `sector_snapshot.contested` d'un des secteurs couverts — un booléen RÉEL,
   * déjà chargé par la carte. `false` quand aucun snapshot n'existe : c'est
   * l'état réel (aucune pression mesurée), jamais une supposition.
   */
  contested: boolean;
}

/**
 * Zone tapée → vue de sheet. `null` quand rien ne correspond : une zone tapée
 * sans donnée n'ouvre RIEN, on ne remplit pas le vide avec un scénario.
 *
 * `territoryId` est la clé produite par `buildTerritories`, donc la même que
 * celle portée par les couches : un tap retrouve exactement la forme peinte.
 *
 * CONTESTÉ : vrai dès qu'UN des secteurs réellement couverts par le territoire
 * l'est. Se contenter du secteur du centroïde rattacherait un territoire à
 * cheval au mauvais secteur — donc afficherait parfois l'état d'un endroit où il
 * n'est pas.
 */
export function selectZoneView(
  territories: readonly RealTerritory[] | null,
  sectors: readonly ZoneSectorFact[],
  zoneId: string | null,
): MapZoneView | null {
  if (zoneId === null || territories === null) return null;
  const found = territories.find((t) => t.props.territoryId === zoneId);
  if (!found) return null;
  const contestedIds = new Set(sectors.filter((s) => s.contested).map((s) => s.id));
  return {
    role: found.props.status === 'crew' ? 'mine' : 'rival',
    zones: found.zoneCount,
    areaKm2: found.props.areaM2 / 1_000_000,
    capturedAt: found.props.capturedAt,
    center: found.props.center,
    // Premier secteur (liste TRIÉE par buildTerritories) : clé de cache stable
    // d'un rendu à l'autre, et partagée par les territoires du même quartier.
    sectorId: found.sectorIds[0] ?? null,
    contested: found.sectorIds.some((id) => contestedIds.has(id)),
  };
}
