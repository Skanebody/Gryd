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
  /**
   * Part AGRÉGÉE (0-1) que le rival tient du secteur (`sector_snapshot`), quand
   * elle existe. Facultative : `RealSectorView` la porte, mais une source plus
   * pauvre (juste `{ id, contested }`) reste acceptée. Sert la couverture
   * APPROXIMATIVE de la défense (E22) — jamais le tracé privé du rival.
   */
  rivalPercent?: number;
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
  /**
   * Échéance de decay la plus PROCHE du territoire (`hex_claims.decay_at`, ISO),
   * `null` si aucun hex n'en porte. Alimente le compte à rebours de la DÉFENSE
   * (E22) — une échéance serveur RÉELLE, jamais dérivée de `capturedAt` (le MAX
   * des claims surestimerait le délai et ignorerait les défenses passées).
   */
  decayAt: string | null;
  /**
   * Part rivale APPROXIMATIVE (0-1) du secteur contesté le plus pressé couvert
   * par le territoire, `null` sans source. Agrégat `sector_snapshot`, jamais
   * l'activité privée du rival (RLS `runs_select_own`).
   */
  rivalPercent: number | null;
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
  const coveredIds = new Set(found.sectorIds);
  // Index des secteurs contestés RÉELLEMENT couverts par ce territoire, avec leur
  // part rivale. On y lit à la fois « la zone est-elle contestée ? » et « quelle
  // couverture rivale approximative montrer ? » — une seule passe, une seule vérité.
  let contested = false;
  let rivalPercent: number | null = null;
  for (const s of sectors) {
    if (!coveredIds.has(s.id) || !s.contested) continue;
    contested = true;
    // Le secteur contesté le PLUS pressé (part rivale max) : c'est la fissure la
    // plus large, celle qu'on veut montrer. `undefined` (source pauvre) ⇒ ignoré.
    if (typeof s.rivalPercent === 'number' && Number.isFinite(s.rivalPercent)) {
      rivalPercent = rivalPercent === null ? s.rivalPercent : Math.max(rivalPercent, s.rivalPercent);
    }
  }
  return {
    role: found.props.status === 'crew' ? 'mine' : 'rival',
    zones: found.zoneCount,
    areaKm2: found.props.areaM2 / 1_000_000,
    capturedAt: found.props.capturedAt,
    center: found.props.center,
    // Premier secteur (liste TRIÉE par buildTerritories) : clé de cache stable
    // d'un rendu à l'autre, et partagée par les territoires du même quartier.
    sectorId: found.sectorIds[0] ?? null,
    contested,
    decayAt: found.props.earliestDecayAt,
    rivalPercent,
  };
}
