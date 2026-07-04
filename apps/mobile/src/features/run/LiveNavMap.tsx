/**
 * GRYD — carte de navigation de la Course Live (AMENDEMENT-09 §3, revu
 * AMENDEMENT-11 : ZÉRO hexagone visible) : le MÊME plan de quartier Uber-night
 * que la Battle Map (monde pixels de liveNav, primitives basemap), rendu UNE
 * fois dans un conteneur animé que la CAMÉRA translate (Animated core, native
 * driver) — le coureur reste centré, le monde glisse sous lui.
 *   - itinéraire RouteProgress (gris en avance, parcouru peint chartreuse,
 *     flèche au prochain virage) — remonté à la déviation (la route restante
 *     se redessine en se repeignant, démo scriptée) ;
 *   - TERRITOIRE ORGANIQUE qui s'étend derrière le coureur : les zones H3
 *     traversées (moteur invisible) fusionnent via territory.ts en UNE
 *     trainée-zone chartreuse lissée qui grossit — jamais des hexagones qui
 *     s'allument ; frontière contestée = double contour chartreuse+orange ;
 *     anneau pulsé au front de capture (violet si fenêtre contestée) ;
 *   - SOBRE (AMENDEMENT-11 §3) : pas tout le territoire, pas les rivaux —
 *     la route, le coureur, sa zone qui grandit, la destination ;
 *   - avatar coureur : disque chartreuse orienté selon le déplacement, halo
 *     animé ; destination marquée fort (pin + halo pulsé) ;
 *   - glisser = caméra libre (le suivi se coupe), `recenter()` (ref) ramène
 *     la caméra sur le coureur — bouton flottant côté écran.
 * Position DÉMO locale, jamais publiée (AMENDEMENT-07). Reduce motion : snap
 * caméra/avatar directs, halos fixes (hooks anim). AUCUN chiffre ici : tous
 * les compteurs vivent dans la bottom sheet (anti-bruit AMENDEMENT-09).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, gameColors, motion } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { RouteProgress, usePulse, useReduceMotion } from '../../ui/game';
import { battleMapStyle as ms, territoryStyle } from '../map/mapStyle';
import { cellsToTerritory, territoryPath } from '../map/territory';
import type { LoopPhase, RunLoop } from './loop';
import { SIM_TICK_MS, type RunSimulation } from './simulation';
import {
  NAV_WORLD_H,
  NAV_WORLD_W,
  cellCenterWorld,
  navProject,
  type LiveNav,
} from './liveNav';

/** Diamètre du disque coureur. */
const AVATAR_SIZE = 24;
/** Halo animé autour du coureur. */
const AVATAR_HALO_SIZE = 44;
/** Le coureur vit un peu AU-DESSUS du centre (la sheet occupe le bas). */
const CAMERA_CENTER_Y_RATIO = 0.4;
/** Glissement minimal (px) avant que la carte prenne le geste caméra. */
const PAN_START_THRESHOLD_PX = 10;
/** Durée du retour caméra au recentrage (ms). */
const RECENTER_MS = 380;
/** Halo de la destination. */
const DEST_HALO_SIZE = 40;
/** Anneau de pulse du front de capture / checkpoint atteint (≈ 1 zone). */
const PULSE_RING_SIZE = 30;
/** Le pulse checkpoint reste visible N ticks après le franchissement. */
const CHECKPOINT_PULSE_TICKS = 4;
/** Frontière du territoire crew (parité MapScreen — AMENDEMENT-11). */
const TERRITORY_BORDER_WIDTH = 1.8;
/** Lueur douce sous la frontière crew. */
const TERRITORY_GLOW_WIDTH = 7;
/** Contour EXTÉRIEUR orange de la frontière contestée (double contour). */
const CONTESTED_OUTER_WIDTH = 3;
/** Pointillé « boucle ouverte » position → départ (AMENDEMENT-12 §C). */
const LOOP_DASH = '7 7';
/** Rayon du marqueur départ (anneau chartreuse) tant que la boucle est ouverte. */
const LOOP_START_R = 5;
/** Contour de la zone fantôme (aperçu < 300 m) — pointillé plus serré. */
const LOOP_GHOST_DASH = '5 5';

interface XY {
  x: number;
  y: number;
}

export interface LiveNavMapHandle {
  /** Ramène la caméra sur le coureur et réactive le suivi. */
  recenter(): void;
}

export interface LiveNavMapProps {
  nav: LiveNav;
  sim: RunSimulation;
  /** Tick courant de la simulation. */
  tickIndex: number;
  /** true = conquête (territoire qui s'étend) ; false = stats only. */
  capturing: boolean;
  /** Fenêtre « zone contestée » active → frontière double contour + pulse violet. */
  contested?: boolean;
  /** État boucle démo (AMENDEMENT-12 §C) — null hors conquête. */
  loop?: RunLoop | null;
  /** Phase d'affichage de la boucle au tick courant. */
  loopPhase?: LoopPhase;
  /** Notifié quand le suivi caméra change (geste = off, recenter = on). */
  onFollowChange?: (following: boolean) => void;
}

/** Écart angulaire normalisé [-180, 180] (rotation continue sans tour complet). */
function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export const LiveNavMap = forwardRef<LiveNavMapHandle, LiveNavMapProps>(function LiveNavMap(
  { nav, sim, tickIndex, capturing, contested = false, loop = null, loopPhase = 'none', onFollowChange },
  ref,
) {
  const reduce = useReduceMotion();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const sizeRef = useRef<{ w: number; h: number } | null>(null);

  const lastIndex = nav.ticks.length - 1;
  const i = Math.min(Math.max(tickIndex, 0), lastIndex);
  const tick = nav.ticks[i] ?? nav.ticks[0];
  const tickRef = useRef(tick);
  tickRef.current = tick;

  // ── Caméra + avatar (valeurs animées, native driver) ──────────────────────
  const start = nav.ticks[0];
  const camera = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const avatar = useRef(
    new Animated.ValueXY({ x: start?.x ?? 0, y: start?.y ?? 0 }),
  ).current;
  const heading = useRef(new Animated.Value(start?.headingDeg ?? 0)).current;
  const headingCum = useRef(start?.headingDeg ?? 0);
  const followingRef = useRef(true);
  /** Base numérique de la caméra pendant un geste (Animated illisible sync). */
  const panBase = useRef<XY>({ x: 0, y: 0 });

  const clampCamera = useCallback((x: number, y: number, s: { w: number; h: number }): XY => {
    return {
      x: Math.min(0, Math.max(s.w - NAV_WORLD_W, x)),
      y: Math.min(0, Math.max(s.h - NAV_WORLD_H, y)),
    };
  }, []);

  const cameraTargetFor = useCallback(
    (t: { x: number; y: number }, s: { w: number; h: number }): XY =>
      clampCamera(s.w / 2 - t.x, s.h * CAMERA_CENTER_Y_RATIO - t.y, s),
    [clampCamera],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => {
      const next = prev && prev.w === width && prev.h === height ? prev : { w: width, h: height };
      sizeRef.current = next;
      return next;
    });
  };

  // Cale caméra + avatar dès que la géométrie est connue (sans animation).
  useEffect(() => {
    if (!size) return;
    const t = tickRef.current;
    if (!t) return;
    avatar.setValue({ x: t.x, y: t.y });
    if (followingRef.current) camera.setValue(cameraTargetFor(t, size));
  }, [size, avatar, camera, cameraTargetFor]);

  // Chaque tick : avatar + cap + caméra glissent ensemble vers le tick suivant.
  useEffect(() => {
    if (!size || !tick) return;
    const delta = normalizeDeg(tick.headingDeg - headingCum.current);
    const nextHeading = headingCum.current + delta;
    headingCum.current = nextHeading;
    const target = cameraTargetFor(tick, size);
    if (reduce) {
      avatar.setValue({ x: tick.x, y: tick.y });
      heading.setValue(nextHeading);
      if (followingRef.current) camera.setValue(target);
      return;
    }
    const anims = [
      Animated.timing(avatar, {
        toValue: { x: tick.x, y: tick.y },
        duration: SIM_TICK_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(heading, {
        toValue: nextHeading,
        duration: SIM_TICK_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ];
    if (followingRef.current) {
      anims.push(
        Animated.timing(camera, {
          toValue: target,
          duration: SIM_TICK_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
    }
    Animated.parallel(anims).start();
  }, [i, size, reduce, tick, avatar, camera, heading, cameraTargetFor]);

  // ── Geste caméra libre (le suivi se coupe, recenter le rétablit) ──────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, g) =>
          Math.abs(g.dx) > PAN_START_THRESHOLD_PX || Math.abs(g.dy) > PAN_START_THRESHOLD_PX,
        onPanResponderGrant: () => {
          if (followingRef.current) {
            followingRef.current = false;
            onFollowChange?.(false);
          }
          camera.stopAnimation((v) => {
            panBase.current = v;
          });
        },
        onPanResponderMove: (_evt, g) => {
          const s = sizeRef.current;
          if (!s) return;
          camera.setValue(
            clampCamera(panBase.current.x + g.dx, panBase.current.y + g.dy, s),
          );
        },
        onPanResponderRelease: (_evt, g) => {
          const s = sizeRef.current;
          if (!s) return;
          panBase.current = clampCamera(
            panBase.current.x + g.dx,
            panBase.current.y + g.dy,
            s,
          );
        },
      }),
    [camera, clampCamera, onFollowChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => {
        const s = sizeRef.current;
        const t = tickRef.current;
        if (!s || !t) return;
        followingRef.current = true;
        onFollowChange?.(true);
        const target = cameraTargetFor(t, s);
        if (reduce) {
          camera.setValue(target);
          return;
        }
        Animated.timing(camera, {
          toValue: target,
          duration: RECENTER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      },
    }),
    [camera, cameraTargetFor, onFollowChange, reduce],
  );

  // ── Monde statique (basemap + grille) : construit une fois ────────────────
  const world = nav.world;
  const baseWorld = useMemo(
    () => (
      <Svg width={world.w} height={world.h}>
        {/* Îlots urbains pleins : le vide entre eux = la rue (ordre basemap) */}
        <Path d={world.blocksD} fill={ms.block} stroke={ms.blockEdge} strokeWidth={1} strokeLinejoin="round" />
        {world.minorAxesD.map((d, k) => (
          <Path key={`minor-${k}`} d={d} stroke={ms.streetCasing} strokeWidth={world.minorPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {world.axesD.map((d, k) => (
          <Path key={`axis-casing-${k}`} d={d} stroke={ms.streetCasing} strokeWidth={world.majorCasingPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {world.axesD.map((d, k) => (
          <Path key={`axis-${k}`} d={d} stroke={ms.streetMajor} strokeWidth={world.majorPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <Path d={world.canalD} stroke={ms.streetCasing} strokeWidth={world.canalBankPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={world.canalD} stroke={ms.water} strokeWidth={world.canalPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {world.parksD.map((d, k) => (
          <Path key={`park-base-${k}`} d={d} fill={ms.parkBase} />
        ))}
        {world.parksD.map((d, k) => (
          <Path key={`park-${k}`} d={d} fill={ms.parkFill} stroke={ms.parkEdge} strokeWidth={1} />
        ))}
        {world.labels.map((l) => (
          <SvgText key={l.name} x={l.x} y={l.y} fill={ms.sectorLabel} opacity={0.55} fontSize={10} fontWeight="600" letterSpacing={2} textAnchor="middle">
            {l.name}
          </SvgText>
        ))}
      </Svg>
    ),
    [world],
  );

  // ── Territoire ORGANIQUE qui s'étend derrière le coureur (AMENDEMENT-11) ──
  // Les zones H3 traversées (préfixe litCells) fusionnent en UNE trainée-zone
  // lissée : la zone grossit, aucune cellule visible.
  const litCount = tick?.litCount ?? 0;
  const lastCell = litCount > 0 ? nav.litCells[litCount - 1] : undefined;
  const loopClosed = loopPhase === 'closed';
  const territoryD = useMemo(() => {
    // Boucle fermée (AMENDEMENT-12 §C) : couloir + intérieur fusionnés en UNE
    // zone organique — le remplissage, pas une grille.
    const cells = loopClosed && loop
      ? [...nav.litCells.slice(0, litCount), ...loop.interiorCells]
      : nav.litCells.slice(0, litCount);
    const territory = cellsToTerritory(cells, 'crew');
    return territory ? territoryPath(territory, navProject) : '';
  }, [litCount, nav.litCells, loopClosed, loop]);
  /** Zone fantôme / burst : l'INTÉRIEUR seul, lissé (aperçu puis remplissage). */
  const interiorD = useMemo(() => {
    if (!loop || loop.interiorCells.length === 0) return '';
    const territory = cellsToTerritory(loop.interiorCells, 'crew');
    return territory ? territoryPath(territory, navProject) : '';
  }, [loop]);
  // Burst de fermeture : l'intérieur s'allume fort puis se fond dans la zone
  // (Animated core, reduce motion → aucun flash, la zone fusionnée suffit).
  const fillBurst = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loopClosed) {
      fillBurst.setValue(0);
      return;
    }
    if (reduce) return;
    Animated.sequence([
      Animated.timing(fillBurst, {
        toValue: 1,
        duration: motion.transitionMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fillBurst, {
        toValue: 0,
        duration: motion.celebrationCountMs,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [loopClosed, reduce, fillBurst]);
  /** Front de capture (centre de la dernière zone prise) — anneau pulsé. */
  const frontXY = useMemo(() => (lastCell ? cellCenterWorld(lastCell) : null), [lastCell]);

  // ── Itinéraire affiché : plan court, puis tracé recalculé (déviation) ─────
  const deviated = i >= nav.deviationTick;
  const routePoints = deviated ? nav.actualPoints : nav.plannedPoints;
  const routeTotal = deviated ? nav.actualTotal : nav.plannedTotal;
  const routeProgress = routeTotal > 0 ? Math.min(1, (tick?.lenPx ?? 0) / routeTotal) : 0;

  // ── Pulses (reduce motion géré par le hook) ───────────────────────────────
  const capturePulse = usePulse(capturing && lastCell !== undefined, 1.3, 1_400);
  const destPulse = usePulse(true, 1.18, 2_200);
  const avatarHalo = usePulse(true, 1.15, 1_800);
  const reachedCp = nav.checkpointsActual.find(
    (cp) => cp.tick >= 0 && i >= cp.tick && i - cp.tick <= CHECKPOINT_PULSE_TICKS,
  );
  const checkpointPulse = usePulse(reachedCp !== undefined, 1.6, 800);

  const rotate = heading.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.root} onLayout={onLayout} {...panResponder.panHandlers}>
      {size ? (
        <Animated.View
          style={[styles.world, camera ? { transform: camera.getTranslateTransform() } : null]}
        >
          {baseWorld}

          {/* Territoire organique : la trainée-zone chartreuse grossit derrière
              le coureur — frontière lisse, double contour si contesté. */}
          {territoryD ? (
            <Svg width={world.w} height={world.h} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path
                d={territoryD}
                fill="none"
                stroke={territoryStyle.crewGlow}
                strokeWidth={TERRITORY_GLOW_WIDTH}
                strokeLinejoin="round"
              />
              {contested ? (
                <Path
                  d={territoryD}
                  fill="none"
                  stroke={territoryStyle.contestedOuterStroke}
                  strokeWidth={CONTESTED_OUTER_WIDTH}
                  strokeLinejoin="round"
                />
              ) : null}
              <Path
                d={territoryD}
                fill={territoryStyle.crewFill}
                fillRule="evenodd"
                stroke={contested ? territoryStyle.contestedInnerStroke : territoryStyle.crewStroke}
                strokeWidth={TERRITORY_BORDER_WIDTH}
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}

          {/* Boucle (AMENDEMENT-12 §C) : aperçu fantôme de l'intérieur (< 300 m)
              puis burst de remplissage à la fermeture — jamais de cellules. */}
          {interiorD && loopPhase === 'approach' ? (
            <Svg width={world.w} height={world.h} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path
                d={interiorD}
                fill={territoryStyle.objectiveSoft}
                fillRule="evenodd"
                stroke={colors.chartreuse40}
                strokeWidth={TERRITORY_BORDER_WIDTH}
                strokeDasharray={LOOP_GHOST_DASH}
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
          {interiorD && loopClosed ? (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fillBurst }]} pointerEvents="none">
              <Svg width={world.w} height={world.h}>
                <Path d={interiorD} fill={territoryStyle.crewFill} fillRule="evenodd" />
              </Svg>
            </Animated.View>
          ) : null}

          {/* Boucle ouverte : pointillé discret position → départ + marqueur. */}
          {loop && !loopClosed && (loopPhase === 'open' || loopPhase === 'approach') && tick ? (
            <Svg width={world.w} height={world.h} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Line
                x1={tick.x}
                y1={tick.y}
                x2={loop.startXY.x}
                y2={loop.startXY.y}
                stroke={colors.chartreuse40}
                strokeWidth={2}
                strokeDasharray={LOOP_DASH}
                strokeLinecap="round"
              />
              <Circle
                cx={loop.startXY.x}
                cy={loop.startXY.y}
                r={LOOP_START_R}
                fill={colors.noir}
                stroke={colors.chartreuse}
                strokeWidth={2}
              />
            </Svg>
          ) : null}

          {/* Itinéraire : gris en avance, parcouru chartreuse, flèche virage.
              key = la route restante se REDESSINE à la déviation (repaint). */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <RouteProgress
              key={deviated ? 'recalcule' : 'plan'}
              points={routePoints}
              progress={routeProgress}
              width={world.w}
              height={world.h}
            />
          </View>

          {/* Destination : repère fort (pin + halo pulsé) */}
          <View
            pointerEvents="none"
            style={[
              styles.destWrap,
              { left: nav.destination.x - DEST_HALO_SIZE / 2, top: nav.destination.y - DEST_HALO_SIZE / 2 },
            ]}
          >
            <Animated.View style={[styles.destHalo, { transform: [{ scale: destPulse }] }]} />
            <Icon name="pin" size={18} color={colors.chartreuse} />
          </View>

          {/* Checkpoint atteint : anneau pulsé bref */}
          {reachedCp ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  left: reachedCp.x - PULSE_RING_SIZE / 2,
                  top: reachedCp.y - PULSE_RING_SIZE / 2,
                  borderColor: colors.chartreuse40,
                  transform: [{ scale: checkpointPulse }],
                },
              ]}
            />
          ) : null}

          {/* Front de capture : anneau pulsé (violet si contesté) */}
          {capturing && frontXY ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  left: frontXY.x - PULSE_RING_SIZE / 2,
                  top: frontXY.y - PULSE_RING_SIZE / 2,
                  borderColor: contested ? gameColors.contested : colors.chartreuse40,
                  transform: [{ scale: capturePulse }],
                },
              ]}
            />
          ) : null}

          {/* Avatar coureur : halo animé + disque orienté selon le déplacement.
              Position DÉMO locale — jamais publiée (AMENDEMENT-07). */}
          <Animated.View
            pointerEvents="none"
            style={[styles.avatarWrap, { transform: avatar.getTranslateTransform() }]}
          >
            <Animated.View style={[styles.avatarHalo, { transform: [{ scale: avatarHalo }] }]} />
            <Animated.View style={[styles.avatarDisc, { transform: [{ rotate }] }]}>
              <Svg width={AVATAR_SIZE} height={AVATAR_SIZE} viewBox="0 0 24 24">
                <Path d="M12 5 L17 16 L12 13.4 L7 16 Z" fill={colors.noir} />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, overflow: 'hidden' },
  world: { position: 'absolute', width: NAV_WORLD_W, height: NAV_WORLD_H },

  destWrap: {
    position: 'absolute',
    width: DEST_HALO_SIZE,
    height: DEST_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DEST_HALO_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
    backgroundColor: colors.chartreuse14,
  },

  pulseRing: {
    position: 'absolute',
    width: PULSE_RING_SIZE,
    height: PULSE_RING_SIZE,
    borderRadius: PULSE_RING_SIZE / 2,
    borderWidth: 1.5,
  },

  avatarWrap: {
    position: 'absolute',
    left: -AVATAR_HALO_SIZE / 2,
    top: -AVATAR_HALO_SIZE / 2,
    width: AVATAR_HALO_SIZE,
    height: AVATAR_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AVATAR_HALO_SIZE / 2,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
  },
  avatarDisc: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
