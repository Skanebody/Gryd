/**
 * Couche carte — boucle pointillée « première mission » (planche E02).
 */
import type { Activity } from '@klaim/shared';
import { referenceLoopPerimeterM, referenceSquareLoopRing } from '@klaim/shared';
import type { RealMapGeoJSONLayer } from '../../ui/game';
import type { LatLngPoint } from './realAnchors';
import { TRACE_DASH, traceStyle } from './mapStyle';

export function firstMissionLoopLayer(
  center: LatLngPoint,
  activity: Activity,
): RealMapGeoJSONLayer {
  const perimeterM = referenceLoopPerimeterM(activity);
  const ring = referenceSquareLoopRing(center, perimeterM);
  return {
    id: 'first-mission-loop',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: ring },
        },
      ],
    },
    lineColor: traceStyle.missing,
    lineWidth: 3,
    lineDash: TRACE_DASH.missing,
  };
}
