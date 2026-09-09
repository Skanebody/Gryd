import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, AppState, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { selectionFrame2026 } from './motionGeometry2026';

/** Motion confirms a gesture; an unknown preference stays still. No continuous loop. */
export function useControlMotion2026() {
  const [allowed, setAllowed] = useState(false);
  const [active, setActive] = useState(Platform.OS === 'web' || AppState.currentState === 'active');
  useEffect(() => {
    let alive = true; let changed = false;
    if (Platform.OS === 'web') {
      const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      const update = () => { if (alive) { setAllowed(query ? !query.matches : false); setActive(typeof document === 'undefined' || document.visibilityState !== 'hidden'); } };
      update(); query?.addEventListener?.('change', update);
      if (query && !query.addEventListener) query.addListener(update);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', update);
      return () => { alive = false; query?.removeEventListener?.('change', update); if (query && !query.removeEventListener) query.removeListener(update); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', update); };
    }
    const pref = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (alive) setAllowed(!value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive && !changed) setAllowed(!value); }).catch(() => {});
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { alive = false; pref.remove(); app.remove(); };
  }, []);
  return allowed && active;
}

/** A shared selection surface travels to the selected action, without moving hit areas. */
export function SlidingSelection2026({ index, count, width, color, inset = 5, gap = 4, height = 44 }: {
  index: number; count: number; width: number; color: string; inset?: number; gap?: number; height?: number;
}) {
  const motion = useControlMotion2026();
  const frame = selectionFrame2026(width, count, index, inset, gap);
  const x = useRef(new Animated.Value(frame.x)).current;
  useEffect(() => {
    x.stopAnimation();
    if (!motion) { x.setValue(frame.x); return; }
    const animation = Animated.spring(x, { toValue: frame.x, stiffness: 420, damping: 38, mass: .8, overshootClamping: true, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [frame.x, motion, x]);
  return <Animated.View testID="gryd-sliding-selection" pointerEvents="none" accessible={false} style={{ position: 'absolute', left: inset, top: inset, width: frame.width, height, borderRadius: height / 2, backgroundColor: color, transform: [{ translateX: x }] }} />;
}

/** Short continuity cue only when the content changes in an already mounted surface. */
export function MotionReveal2026({ identity, children, style }: { identity: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const motion = useControlMotion2026();
  const value = useRef(new Animated.Value(1)).current;
  const previous = useRef(identity);
  useEffect(() => {
    const changed = previous.current !== identity; previous.current = identity;
    if (!motion) { value.stopAnimation(); value.setValue(1); return; }
    if (!changed) return;
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, duration: 220, useNativeDriver: true });
    animation.start(); return () => { animation.stop(); value.setValue(1); };
  }, [identity, motion, value]);
  return <Animated.View style={[style, { opacity: value.interpolate({ inputRange: [0, 1], outputRange: [.6, 1] }), transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>{children}</Animated.View>;
}
