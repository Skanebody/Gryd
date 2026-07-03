/**
 * GRYD — MapBottomSheet : bottom sheet type Uber (AMENDEMENT-09 §1 & §5).
 * 3 états : compact (~96 px — une ligne d'état + CTA), semi (~40 % — contexte),
 * ouvert (~85 % — détail). Poignée + geste de glissement (PanResponder,
 * Animated core, spring au snap), fond carbon arrondi, safe area. Contenu par
 * SLOTS empilés (compactSlot toujours visible, semiSlot puis openSlot révélés
 * en glissant — structure Uber) OU par prop `renderContent(state)` quand le
 * contenu dépend entièrement de l'état. Réutilisable Battle Map / Course Live.
 * Reduce motion → snap direct sans spring (useReduceMotion). Haptic light au
 * changement d'état. Anti-bruit : les chiffres vivent ICI, pas sur la carte.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gameColors, radii } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { useReduceMotion } from './anim';

export type MapSheetState = 'compact' | 'semi' | 'open';

/** Hauteur visible de l'état compact (une ligne d'état + CTA). */
export const MAP_SHEET_COMPACT_HEIGHT = 96;
/** Part de l'écran couverte en semi (~40 %). */
export const MAP_SHEET_SEMI_RATIO = 0.4;
/** Part de l'écran couverte en ouvert (~85 %). */
export const MAP_SHEET_OPEN_RATIO = 0.85;

/** Glissement minimal (px) avant que la sheet prenne le geste. */
const DRAG_START_THRESHOLD_PX = 6;
/** Vitesse (px/ms) au-delà de laquelle un fling saute à l'état suivant. */
const FLING_VELOCITY = 0.45;
/** Ordre des états, du plus fermé au plus ouvert. */
const STATE_ORDER: readonly MapSheetState[] = ['compact', 'semi', 'open'];

export interface MapBottomSheetProps {
  /** État de départ (défaut compact — la carte reste le cœur de l'écran). */
  initialState?: MapSheetState;
  /** Notifié à chaque snap (l'écran logge ses events PostHog ici). */
  onStateChange?: (state: MapSheetState) => void;
  /** Slot TOUJOURS visible (ligne d'état + CTA) — zone de grab du geste. */
  compactSlot?: ReactNode;
  /** Slot révélé en semi et ouvert (contexte : défi proche, crew…). */
  semiSlot?: ReactNode;
  /** Slot révélé en ouvert (détail : parcours, runs d'amis, splits…). */
  openSlot?: ReactNode;
  /** Alternative aux slots : rendu entièrement piloté par l'état courant. */
  renderContent?: (state: MapSheetState) => ReactNode;
}

export function MapBottomSheet({
  initialState = 'compact',
  onStateChange,
  compactSlot,
  semiSlot,
  openSlot,
  renderContent,
}: MapBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [containerH, setContainerH] = useState(0);
  const [state, setState] = useState<MapSheetState>(initialState);

  const openH = Math.max(containerH * MAP_SHEET_OPEN_RATIO, MAP_SHEET_COMPACT_HEIGHT);
  const semiH = Math.max(containerH * MAP_SHEET_SEMI_RATIO, MAP_SHEET_COMPACT_HEIGHT);

  /** translateY de la sheet (hauteur openH ancrée en bas) pour chaque état. */
  const offsets = useMemo<Record<MapSheetState, number>>(
    () => ({
      open: 0,
      semi: openH - semiH,
      compact: openH - MAP_SHEET_COMPACT_HEIGHT,
    }),
    [openH, semiH],
  );

  const translateY = useRef(new Animated.Value(0)).current;
  /** Position réelle courante (Animated n'est pas lisible de façon sync). */
  const currentY = useRef(0);
  const stateRef = useRef(state);

  const snapTo = useCallback(
    (next: MapSheetState, animate: boolean) => {
      const to = offsets[next];
      currentY.current = to;
      if (stateRef.current !== next) {
        stateRef.current = next;
        setState(next);
        haptics.light();
        onStateChange?.(next);
      }
      if (!animate || reduce) {
        translateY.setValue(to); // reduce motion → snap direct, sans spring
        return;
      }
      Animated.spring(translateY, {
        toValue: to,
        friction: 9,
        tension: 90,
        useNativeDriver: true,
      }).start();
    },
    [offsets, onStateChange, reduce, translateY],
  );

  // (Re)cale la sheet quand la géométrie est connue ou change.
  useEffect(() => {
    if (containerH <= 0) return;
    const to = offsets[stateRef.current];
    currentY.current = to;
    translateY.setValue(to);
  }, [containerH, offsets, translateY]);

  const clamp = useCallback(
    (y: number) => Math.min(Math.max(y, offsets.open), offsets.compact),
    [offsets],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, g) =>
          Math.abs(g.dy) > DRAG_START_THRESHOLD_PX && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => translateY.stopAnimation((v) => (currentY.current = v)),
        onPanResponderMove: (_evt, g) => translateY.setValue(clamp(currentY.current + g.dy)),
        onPanResponderRelease: (_evt, g) => {
          const y = clamp(currentY.current + g.dy);
          const vy = g.vy;
          let next: MapSheetState;
          if (Math.abs(vy) > FLING_VELOCITY) {
            // Fling : état voisin dans le sens du geste.
            const idx = STATE_ORDER.indexOf(stateRef.current);
            const target = vy < 0 ? idx + 1 : idx - 1;
            next = STATE_ORDER[Math.min(Math.max(target, 0), STATE_ORDER.length - 1)] ?? 'compact';
          } else {
            // Sinon : snap au plus proche.
            next = STATE_ORDER.reduce<MapSheetState>(
              (best, s) => (Math.abs(offsets[s] - y) < Math.abs(offsets[best] - y) ? s : best),
              'compact',
            );
          }
          currentY.current = y;
          snapTo(next, true);
        },
        onPanResponderTerminate: () => snapTo(stateRef.current, true),
      }),
    [clamp, offsets, snapTo, translateY],
  );

  /** Tap sur la poignée : cycle compact → semi → ouvert → compact (a11y/web). */
  const cycle = () => {
    const idx = STATE_ORDER.indexOf(stateRef.current);
    snapTo(STATE_ORDER[(idx + 1) % STATE_ORDER.length] ?? 'compact', true);
  };

  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
      onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
    >
      {containerH > 0 ? (
        <Animated.View
          style={[styles.sheet, { height: openH, transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Panneau de course — glisse ou touche pour ouvrir"
            onPress={cycle}
            style={styles.handleZone}
          >
            <View style={styles.handle} />
          </Pressable>
          <View style={{ paddingBottom: insets.bottom }}>
            {renderContent ? (
              renderContent(state)
            ) : (
              <>
                {compactSlot}
                {semiSlot}
                {openSlot}
              </>
            )}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: gameColors.carbon,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
    overflow: 'hidden',
  },
  handleZone: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.gris,
    opacity: 0.5,
  },
});
