/**
 * GRYD — mini-carte hex de Course Live (AMENDEMENT-08 §5, doc §9) : la trace
 * GPS se dessine (polyline segmentée — coupée dans les zones privées), les
 * hexes s'allument au passage, le dernier hex pulse. Grille SCHÉMATIQUE de la
 * zone (géométrie écran, pas H3) — la vraie résolution est comptée par les
 * compteurs, le serveur décide de toute attribution.
 * Couleurs : chartreuse = capture (mon crew) ; gris = stats only (social/privé) ;
 * violet contesté sur le dernier hex pendant la fenêtre « zone contestée ».
 */
import { useMemo, useState } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';
import { colors, gameColors, mapTokens, radii } from '@klaim/shared';
import { usePulse } from '../../ui/game';
import {
  HEX_R,
  LIVE_MAP_H,
  LIVE_MAP_W,
  hexPolygonPoints,
  litCellIdsAt,
  traceSegmentsAt,
  type HexCell,
  type RunSimulation,
} from './simulation';

export interface LiveHexMapProps {
  sim: RunSimulation;
  /** Tick courant de la simulation (0..ticks.length-1). */
  tickIndex: number;
  /** true = capture réelle (conquête) ; false = stats only (allumage gris). */
  capturing: boolean;
  /** Fenêtre « zone contestée » active → dernier hex souligné violet. */
  contested?: boolean;
}

export function LiveHexMap({ sim, tickIndex, capturing, contested = false }: LiveHexMapProps) {
  // Largeur réelle du conteneur → échelle px pour l'anneau de pulse overlay.
  const [width, setWidth] = useState(0);
  const scale = width > 0 ? width / LIVE_MAP_W : 0;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Fond de grille : statique, memoïsé une fois pour toutes.
  const baseGrid = useMemo(
    () =>
      sim.cells.map((cell) => (
        <Polygon
          key={cell.id}
          points={hexPolygonPoints(cell.cx, cell.cy, HEX_R - 0.8)}
          fill="none"
          stroke={mapTokens.neutralStroke}
          strokeWidth={1}
        />
      )),
    [sim.cells],
  );

  const litIds = litCellIdsAt(sim, tickIndex);
  const litSet = useMemo(() => new Set(litIds), [litIds]);
  const lastLitId = litIds.length > 0 ? litIds[litIds.length - 1] : undefined;
  const cellById = useMemo(() => {
    const map = new Map<string, HexCell>();
    for (const c of sim.cells) map.set(c.id, c);
    return map;
  }, [sim.cells]);
  const lastCell = lastLitId !== undefined ? cellById.get(lastLitId) : undefined;

  const segments = traceSegmentsAt(sim, tickIndex);
  const current = sim.ticks[Math.min(tickIndex, sim.ticks.length - 1)] ?? sim.ticks[0]!;
  const start = sim.ticks[0]!;

  // Teintes fonctionnelles : capture = ton crew ; stats only = gris carte.
  const litFill = capturing ? colors.chartreuse14 : mapTokens.foeFill;
  const litStroke = capturing ? colors.chartreuse40 : mapTokens.foeStroke;
  const traceStroke = capturing ? colors.chartreuse : colors.blanc;

  // Pulse du dernier hex allumé (Animated core — reduce motion géré par le hook).
  const pulse = usePulse(lastCell !== undefined, 1.3, 1_400);
  const ringPx = HEX_R * 2 * scale;

  return (
    <View style={styles.frame} onLayout={onLayout}>
      <View style={{ width: '100%', aspectRatio: LIVE_MAP_W / LIVE_MAP_H }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${LIVE_MAP_W} ${LIVE_MAP_H}`}>
          {baseGrid}
          {/* Hexes allumés au passage. */}
          {sim.cells.map((cell) =>
            litSet.has(cell.id) ? (
              <Polygon
                key={`lit-${cell.id}`}
                points={hexPolygonPoints(cell.cx, cell.cy, HEX_R - 0.8)}
                fill={litFill}
                stroke={cell.id === lastLitId && contested ? gameColors.contested : litStroke}
                strokeWidth={cell.id === lastLitId ? 1.8 : 1.2}
              />
            ) : null,
          )}
          {/* Trace GPS — segmentée : rien n'est dessiné en zone privée. */}
          {segments.map((points, i) => (
            <Polyline
              key={`seg-${i}`}
              points={points}
              fill="none"
              stroke={traceStroke}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          ))}
          {/* Départ (anneau) + position courante (point) — position DÉMO, jamais publiée. */}
          <Circle cx={start.x} cy={start.y} r={4} fill="none" stroke={colors.gris} strokeWidth={1.5} />
          {!current.masked ? (
            <Circle cx={current.x} cy={current.y} r={3.4} fill={colors.blanc} stroke={colors.noir} strokeWidth={1.2} />
          ) : null}
        </Svg>

        {/* Anneau pulsé sur le dernier hex capturé (overlay px, échelle mesurée). */}
        {lastCell !== undefined && scale > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                width: ringPx,
                height: ringPx,
                borderRadius: ringPx / 2,
                left: lastCell.cx * scale - ringPx / 2,
                top: lastCell.cy * scale - ringPx / 2,
                borderColor: contested
                  ? gameColors.contested
                  : capturing
                    ? colors.chartreuse40
                    : mapTokens.foeStroke,
                transform: [{ scale: pulse }],
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    overflow: 'hidden',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
});
