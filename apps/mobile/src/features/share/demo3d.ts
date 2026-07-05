/**
 * GRYD — GEOMETRIE DE DEMO de la « Carte 3D » (AMENDEMENT-24). Le template
 * `carte3d` rend un RealMap PITCHE avec la ZONE conquise EXTRUDEE en volume
 * chartreuse translucide (fill-extrusion) — l'equivalent PROPRIETAIRE de la
 * carte 3D Strava, mais MapLibre, ZERO cle, tuiles CARTO dark. Ce module ne
 * produit QUE des couches de JEU (source GeoJSON locale, deterministe, scenario
 * Republique — coherent avec les 5 autres templates et le resultat de course) :
 *
 *   - `carte3dLayers()` : les RealMapGeoJSONLayer, dans l'ordre de peinture —
 *       zone rivale ATTENUEE (orange basse opacite, zero halo) → zone conquise
 *       EXTRUDEE (aplat chartreuse translucide + volume 3D + liseré net) →
 *       trace chartreuse EPAISSE (la boucle du run) + fil blanc discret.
 *   - `CARTE_3D_CAMERA` : cadre la boucle Republique (camera de la carte de
 *       partage — pas la camera egocentree de la Battle Map).
 *
 * Charte stricte : trace = chartreuse, zone = chartreuse translucide, rival =
 * gameColors.rival orange, fond = dark. Aucune teinte hors token (withAlpha ne
 * fait que decliner un token hex en rgba). Aucune regle de jeu ici — pur
 * ancrage geographique de rendu/demo (comme realAnchors / ShareMap).
 */
import { colors, gameColors } from '@klaim/shared';
import type { RealMapCamera, RealMapGeoJSONLayer } from '../../ui/game';
import { CORRIDOR_HALF_WIDTH_M, loopRing, ribbonRing } from '../map/allTerritories';
import { withAlpha } from '../map/mapStyle';
import {
  BOUCLE_REPUBLIQUE,
  RUE_FAUBOURG_DU_TEMPLE,
  type LatLngPoint,
} from '../map/realAnchors';

type RealMapData = RealMapGeoJSONLayer['data'];

// ─── Constantes de RENDU 3D (UI uniquement — jamais des regles de jeu) ───────

/**
 * Hauteur DOUCE d'extrusion de la zone conquise (metres MapLibre). Le territoire
 * « monte » sans devenir une tour : le volume se lit en perspective mais reste
 * lisible, la trace/les stats priment. Anti pay-to-win : purement cosmetique.
 */
const ZONE_EXTRUDE_HEIGHT_M = 140;
/** Base de l'extrusion (le sol) — la zone monte depuis la carte. */
const ZONE_EXTRUDE_BASE_M = 0;
/** Opacite du VOLUME extrude (translucide — les rues restent devinables). */
const ZONE_EXTRUDE_OPACITY = 0.32;
/** Aplat chartreuse discret SOUS le volume (empreinte au sol de la zone). */
const ZONE_FOOTPRINT_OPACITY = 0.14;
/** Liseré net de la zone (frontiere = le trace, charte AMENDEMENT-16 §0). */
const ZONE_STROKE_ALPHA = 0.55;
const ZONE_STROKE_WIDTH = 2;
/** Trace du run : chartreuse EPAISSE (le tracé prime sur la carte). */
const TRACE_WIDTH = 4.5;
/** Fil blanc DISCRET par-dessus la trace (lisibilite, comme ShareMap). */
const TRACE_HAIRLINE_WIDTH = 1;
const TRACE_HAIRLINE_ALPHA = 0.75;
/** Zone RIVALE : ruban orange ATTENUE (basse opacite, jamais dominant). */
const RIVAL_FILL_ALPHA = 0.1;
const RIVAL_STROKE_ALPHA = 0.4;
const RIVAL_WIDTH = 2.2;

/**
 * Camera de la carte de partage : cadre la boucle Republique en 3D. Le pitch
 * (inclinaison) et le bearing sont portes par le template (props RealMap) — ici
 * on ne fixe QUE le centre/zoom (le cadrage). Centre = barycentre approche de la
 * boucle, zoom quartier (la zone remplit la carte, volume 3D lisible).
 */
export const CARTE_3D_CAMERA: RealMapCamera = {
  lng: 2.3702,
  lat: 48.8637,
  zoom: 14.4,
};

/** Inclinaison signature de la carte 3D (caméra pitchée ~55°, AMENDEMENT-24 §1). */
export const CARTE_3D_PITCH = 55;
/** Léger cap pour que la perspective ne soit pas frontale (relief de volume). */
export const CARTE_3D_BEARING = -18;

// ─── Sources GeoJSON (deterministes — scenario Republique) ──────────────────

function polygonCollection(ring: readonly [number, number][]): RealMapData {
  const first = ring[0];
  const closed = first ? [...ring, first] : [...ring];
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [closed] }, properties: {} },
    ],
  };
}

function lineCollection(points: readonly LatLngPoint[]): RealMapData {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
        properties: {},
      },
    ],
  };
}

let cache: readonly RealMapGeoJSONLayer[] | null = null;

/**
 * Les couches de JEU de la carte 3D de partage, dans l'ordre de peinture. La
 * ZONE conquise porte `extrude: true` → RealMap la rend en `fill-extrusion`
 * (volume chartreuse translucide) quand le template active `extrudeZones` ;
 * defaut 2D : l'aplat au sol seul (non-regression totale). La zone rivale reste
 * un simple ruban orange attenue (jamais extrudee — le relief est reserve a MA
 * conquete). Geometrie figee (memoisee) — pas de nouvel objet par render.
 */
export function carte3dLayers(): readonly RealMapGeoJSONLayer[] {
  if (cache) return cache;
  const zoneRing = loopRing(BOUCLE_REPUBLIQUE);
  const zoneData = polygonCollection(zoneRing);
  // Fermeture de la boucle pour le trace (anneau ouvert → on referme).
  const first = BOUCLE_REPUBLIQUE[0];
  const traceClosed: readonly LatLngPoint[] = first
    ? [...BOUCLE_REPUBLIQUE, first]
    : BOUCLE_REPUBLIQUE;
  const rivalRing = ribbonRing(RUE_FAUBOURG_DU_TEMPLE, CORRIDOR_HALF_WIDTH_M);

  cache = [
    // 1. Zone RIVALE attenuee : ruban orange basse opacite, DESSOUS, jamais
    //    dominant (zero halo — charte AMENDEMENT-16 §0).
    {
      id: 'c3d-rival',
      data: polygonCollection(rivalRing),
      fillColor: withAlpha(gameColors.rival, RIVAL_FILL_ALPHA),
      fillOpacity: 1,
      lineColor: withAlpha(gameColors.rival, RIVAL_STROKE_ALPHA),
      lineWidth: RIVAL_WIDTH,
    },
    // 2. Empreinte au sol de MA zone : aplat chartreuse discret (visible aussi
    //    en 2D — c'est la base du volume extrude).
    {
      id: 'c3d-zone-footprint',
      data: zoneData,
      fillColor: colors.chartreuse,
      fillOpacity: ZONE_FOOTPRINT_OPACITY,
    },
    // 3. VOLUME 3D de MA zone : fill-extrusion chartreuse translucide — le look
    //    signature GRYD (le territoire « monte »). En 2D (extrudeZones absent /
    //    pitch 0) RealMap peint un simple fill : non-regression.
    {
      id: 'c3d-zone-volume',
      data: zoneData,
      extrude: true,
      extrudeColor: colors.chartreuse,
      extrudeHeight: ZONE_EXTRUDE_HEIGHT_M,
      extrudeBase: ZONE_EXTRUDE_BASE_M,
      extrudeOpacity: ZONE_EXTRUDE_OPACITY,
    },
    // 4. Liseré net de la zone (la frontiere EST le trace) par-dessus le volume.
    {
      id: 'c3d-zone-edge',
      data: zoneData,
      lineColor: withAlpha(colors.chartreuse, ZONE_STROKE_ALPHA),
      lineWidth: ZONE_STROKE_WIDTH,
    },
    // 5. TRACE du run : chartreuse EPAISSE + fil blanc discret (comme ShareMap).
    {
      id: 'c3d-trace',
      data: lineCollection(traceClosed),
      lineColor: colors.chartreuse,
      lineWidth: TRACE_WIDTH,
    },
    {
      id: 'c3d-trace-hairline',
      data: lineCollection(traceClosed),
      lineColor: withAlpha(colors.blanc, TRACE_HAIRLINE_ALPHA),
      lineWidth: TRACE_HAIRLINE_WIDTH,
    },
  ];
  return cache;
}
