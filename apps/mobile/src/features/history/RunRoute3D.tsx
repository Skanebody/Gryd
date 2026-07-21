/**
 * GRYD — RunRoute3D : la vue 3D du parcours d'une course (AMENDEMENT-25 §2).
 * « Un toggle 2D/3D sur le détail de course qui rend le parcours dans le style
 * GRYD 3D Conquest (carte dark pitchée + trace chartreuse épaisse + zone
 * extrudée si boucle fermée), en réutilisant RealMap (pitch/bearing/extrudeZones)
 * et ShareMap3D d'AMENDEMENT-24. »
 *
 * `ShareMap3D` n'existe plus (supprimé le 21/07/2026, AMENDEMENT-47 : il montait
 * une conquête inventée sur la boucle République). RunRoute3D en garde la stack
 * — MapLibre, PAS Mapbox ; ZÉRO clé ; tuiles CARTO dark — mais avec la
 * différence qui l'a fait survivre : il est PARAMÉTRÉ PAR LE TRACÉ de la course
 * reçu en prop, jamais par une scène pré-écrite.
 *   - `closed` → la boucle enferme une aire : elle est EXTRUDÉE en volume
 *     chartreuse translucide (fill-extrusion) + empreinte au sol + liseré net ;
 *   - ouverte (route/aller-retour) → PAS de volume (rien à enfermer) : seule la
 *     trace chartreuse épaisse court sur la carte (honnête — pas de fausse zone).
 * Dans les deux cas : trace chartreuse ÉPAISSE + fil blanc discret, sur le fond
 * dark. La caméra CADRE le tracé (traceCamera) ; le pitch/bearing signature
 * (~55° / -18°) sont RÉUTILISÉS de camera3d (CARTE_3D_PITCH/BEARING) — le look 3D
 * du partage et de l'historique est strictement le même. Les constantes de
 * VOLUME/trace (hauteur, opacité, épaisseur — UI de rendu, pas des règles de
 * jeu) sont posées localement, alignées sur celles de camera3d.
 *
 * Non-régression : RealMap reçoit pitch/bearing/extrudeZones — props
 * OPTIONNELLES dont le défaut est la 2D actuelle ; ici on les active (comme
 * la carte 3D de partage le faisait avant sa suppression). Reduce motion :
 * porté par RealMap (pitch FIXE, aucune animation caméra imposée). Attribution
 * masquée (le bloc porte sa chrome), carte silencieuse (labels de quartiers
 * éteints — le tracé prime). Le conteneur clippe (overflow) pour épouser le coin
 * arrondi, sans double container (AMENDEMENT-22).
 */
import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '@klaim/shared';
import { RealMap, type RealMapGeoJSONLayer } from '../../ui/game';
import { loopRing } from '../map/allTerritories';
import { withAlpha } from '../map/mapStyle';
import { CARTE_3D_BEARING, CARTE_3D_PITCH } from '../share/camera3d';
import type { LatLngPoint } from '../map/realAnchors';
import { traceCamera, type RunTrace } from './demoRuns';

// ─── Constantes de RENDU 3D (UI uniquement — jamais des règles de jeu) ───────
// Mêmes valeurs de rendu que la carte 3D de partage (camera3d) — le look est UN
// (le partage et l'historique montrent la MÊME 3D signature GRYD).

/** Hauteur DOUCE du volume de la zone (m MapLibre) — le territoire « monte ». */
const ZONE_EXTRUDE_HEIGHT_M = 140;
/** Base du volume (le sol). */
const ZONE_EXTRUDE_BASE_M = 0;
/** Opacité du volume extrudé (translucide — les rues restent devinables). */
const ZONE_EXTRUDE_OPACITY = 0.32;
/** Aplat chartreuse discret SOUS le volume (empreinte au sol de la zone). */
const ZONE_FOOTPRINT_OPACITY = 0.14;
/** Liseré net de la zone (la frontière EST le tracé, charte AMENDEMENT-16 §0). */
const ZONE_STROKE_ALPHA = 0.55;
const ZONE_STROKE_WIDTH = 2;
/** Trace du run : chartreuse ÉPAISSE (le tracé prime sur la carte). */
const TRACE_WIDTH = 4.5;
/** Fil blanc DISCRET par-dessus la trace (lisibilité, comme ShareMap/camera3d). */
const TRACE_HAIRLINE_WIDTH = 1;
const TRACE_HAIRLINE_ALPHA = 0.75;

type RealMapData = RealMapGeoJSONLayer['data'];

/** Anneau [lng,lat] → FeatureCollection polygone fermé (une aire). */
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

/** Tracé → FeatureCollection LineString (la polyligne du parcours). */
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

/**
 * Couches de JEU du parcours 3D, dans l'ordre de peinture. Si la boucle est
 * FERMÉE : empreinte au sol → VOLUME extrudé (extrude: true → fill-extrusion en
 * mode 3D) → liseré net, puis la trace. Ouverte : uniquement la trace (aucune
 * aire à enfermer — honnête, pas de volume fantôme). Zéro teinte hors token
 * (withAlpha ne fait que décliner un token hex en rgba).
 */
function runRoute3dLayers(trace: RunTrace): readonly RealMapGeoJSONLayer[] {
  const { points, closed } = trace;
  // Ferme la trace pour l'affichage d'une boucle (anneau ouvert → on referme).
  const first = points[0];
  const traceClosed: readonly LatLngPoint[] =
    closed && first ? [...points, first] : points;

  const traceLayers: RealMapGeoJSONLayer[] = [
    // TRACE du run : chartreuse ÉPAISSE + fil blanc discret (comme camera3d).
    {
      id: 'rr3d-trace',
      data: lineCollection(traceClosed),
      lineColor: colors.chartreuse,
      lineWidth: TRACE_WIDTH,
    },
    {
      id: 'rr3d-trace-hairline',
      data: lineCollection(traceClosed),
      lineColor: withAlpha(colors.blanc, TRACE_HAIRLINE_ALPHA),
      lineWidth: TRACE_HAIRLINE_WIDTH,
    },
  ];

  if (!closed) return traceLayers;

  // Boucle fermée : l'aire enfermée EST la zone (le polygone affiché = le tracé).
  const zoneData = polygonCollection(loopRing(points));
  return [
    // 1. Empreinte au sol de la zone : aplat chartreuse discret (base du volume,
    //    visible aussi à plat).
    {
      id: 'rr3d-zone-footprint',
      data: zoneData,
      fillColor: colors.chartreuse,
      fillOpacity: ZONE_FOOTPRINT_OPACITY,
    },
    // 2. VOLUME 3D de la zone : fill-extrusion chartreuse translucide — le look
    //    signature GRYD (le territoire « monte »). En 2D (extrudeZones absent)
    //    RealMap peint un simple fill : non-régression.
    {
      id: 'rr3d-zone-volume',
      data: zoneData,
      extrude: true,
      extrudeColor: colors.chartreuse,
      extrudeHeight: ZONE_EXTRUDE_HEIGHT_M,
      extrudeBase: ZONE_EXTRUDE_BASE_M,
      extrudeOpacity: ZONE_EXTRUDE_OPACITY,
    },
    // 3. Liseré net de la zone (la frontière EST le tracé) par-dessus le volume.
    {
      id: 'rr3d-zone-edge',
      data: zoneData,
      lineColor: withAlpha(colors.chartreuse, ZONE_STROKE_ALPHA),
      lineWidth: ZONE_STROKE_WIDTH,
    },
    // 4. TRACE par-dessus (chartreuse épaisse + fil blanc).
    ...traceLayers,
  ];
}

export interface RunRoute3DProps {
  /** Tracé de la course (points + drapeau boucle fermée) — via demoRuns. */
  trace: RunTrace;
  /** testID transmis à RealMap (vérif preview). */
  testID?: string;
  style?: ViewStyle;
}

/**
 * Vue 3D du parcours d'une course (détail Historique). Aspect géré par le parent
 * via `style`. La caméra cadre le tracé de CETTE course. La
 * 3D d'un parcours d'historique n'affiche que MON tracé/ma zone (chartreuse),
 * jamais un rival (un historique montre mon effort, pas la guerre en cours).
 */
export function RunRoute3D({ trace, testID, style }: RunRoute3DProps) {
  const layers = useMemo(() => runRoute3dLayers(trace), [trace]);
  const camera = useMemo(() => traceCamera(trace.points), [trace]);
  return (
    <View style={[styles.wrap, style]}>
      <RealMap
        camera={camera}
        pitch={CARTE_3D_PITCH}
        bearing={CARTE_3D_BEARING}
        extrudeZones
        geojsonLayers={layers}
        attributionCompact={false}
        silent
        style={StyleSheet.absoluteFill}
        testID={testID ?? 'run-route-3d'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond noir derrière les tuiles (jamais d'écran blanc au chargement), clippe
  // le pitch/volume au coin arrondi (overflow). Pas de bord visible ni de double
  // container (AMENDEMENT-22 : le bloc parent porte déjà sa surface).
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.noir,
  },
});
