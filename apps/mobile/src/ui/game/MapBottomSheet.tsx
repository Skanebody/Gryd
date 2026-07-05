/**
 * GRYD — MapBottomSheet : bottom sheet type Uber (AMENDEMENT-09 §1 & §5).
 * 3 états : compact (~96 px — une ligne d'état + CTA), semi (~40 % — contexte),
 * ouvert (~85 % — détail). Poignée + geste de glissement (PanResponder,
 * Animated core, spring au snap), fond carbon arrondi, safe area. Contenu par
 * SLOTS empilés (compactSlot toujours visible, semiSlot puis openSlot révélés
 * en glissant — structure Uber) OU par prop `renderContent(state)` quand le
 * contenu dépend entièrement de l'état. Le openSlot fond en entrée piloté par
 * translateY (pas de coupe nette en semi) ; l'état ouvert est scrollable
 * (ScrollView, poignée = zone de grab du pan). Réutilisable Battle Map /
 * Course Live. Reduce motion → snap direct sans spring (useReduceMotion).
 * Haptic light au changement d'état. Anti-bruit : les chiffres vivent ICI,
 * pas sur la carte.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gameColors, radii } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { useReduceMotion } from './anim';

export type MapSheetState = 'compact' | 'semi' | 'open';

/**
 * Hauteur visible de l'état compact. AMENDEMENT-21 : en écran mission, le
 * compact porte la CARD STICKY complète (titre + méta + micro-bonus + gros
 * [Défendre] + lien « Voir les options ») — il faut assez de peek pour montrer
 * le CTA ET le lien SANS troncature (pet peeve #1 : aucun texte/action coupé).
 */
export const MAP_SHEET_COMPACT_HEIGHT = 208;
/**
 * Hauteur visible du panneau INFO (AMENDEMENT-25 §1) : révélé par le FAB Info,
 * il empile la SITUATION (zone · crew % vs rival % · directive) EN HAUT puis la
 * MISSION (titre + micro-bonus + gros [Défendre] + « Voir les options »). Plus
 * haut que le compact mission seul — assez de peek pour tout montrer SANS
 * troncature. Ne remplace pas MAP_SHEET_COMPACT_HEIGHT (défaut inchangé pour
 * tout autre usage) : passé via la prop `compactHeight`.
 */
export const MAP_SHEET_INFO_COMPACT_HEIGHT = 320;
/** Part de l'écran couverte en semi (~40 %). */
export const MAP_SHEET_SEMI_RATIO = 0.4;
/** Part de l'écran couverte en ouvert (~85 %). */
export const MAP_SHEET_OPEN_RATIO = 0.85;

/** Glissement minimal (px) avant que la sheet prenne le geste. */
const DRAG_START_THRESHOLD_PX = 6;
/** Vitesse (px/ms) au-delà de laquelle un fling saute à l'état suivant. */
const FLING_VELOCITY = 0.45;
/**
 * Fraction du trajet semi→open (côté open) sur laquelle le openSlot fond en
 * entrée : opacité 0 tant que la sheet est au-delà, 1 à l'état ouvert.
 */
const OPEN_SLOT_FADE_FRACTION = 0.5;
/** Ordre des états, du plus fermé au plus ouvert. */
const STATE_ORDER: readonly MapSheetState[] = ['compact', 'semi', 'open'];

export interface MapBottomSheetProps {
  /** État de départ (défaut compact — la carte reste le cœur de l'écran). */
  initialState?: MapSheetState;
  /**
   * Hauteur visible de l'état compact (peek). Défaut MAP_SHEET_COMPACT_HEIGHT.
   * Le panneau Info d'AMENDEMENT-25 passe un peek plus grand (situation +
   * mission empilées) via MAP_SHEET_INFO_COMPACT_HEIGHT.
   */
  compactHeight?: number;
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
  compactHeight = MAP_SHEET_COMPACT_HEIGHT,
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

  const openH = Math.max(containerH * MAP_SHEET_OPEN_RATIO, compactHeight);
  const semiH = Math.max(containerH * MAP_SHEET_SEMI_RATIO, compactHeight);

  /** translateY de la sheet (hauteur openH ancrée en bas) pour chaque état. */
  const offsets = useMemo<Record<MapSheetState, number>>(
    () => ({
      open: 0,
      semi: openH - semiH,
      compact: openH - compactHeight,
    }),
    [openH, semiH, compactHeight],
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

  /**
   * Opacité du openSlot pilotée par translateY : invisible jusqu'à mi-chemin
   * semi→open, puis fondu progressif — pas de titres coupés net en semi.
   * (Interpolation pure : suit aussi le setValue direct du reduce motion.)
   */
  const openSlotOpacity = useMemo(() => {
    const span = offsets.semi - offsets.open;
    if (span <= 0) return 1; // géométrie dégénérée (petit conteneur) : pas de fade
    return translateY.interpolate({
      inputRange: [offsets.open, offsets.open + span * OPEN_SLOT_FADE_FRACTION, offsets.semi],
      outputRange: [1, 0, 0],
      extrapolate: 'clamp',
    });
  }, [offsets, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, g) =>
          Math.abs(g.dy) > DRAG_START_THRESHOLD_PX && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => translateY.stopAnimation((v) => (currentY.current = v)),
        onPanResponderMove: (_evt, g) => translateY.setValue(clamp(currentY.current + g.dy)),
        onPanResponderRelease: (_evt, g) => {
          const y = clamp(currentY.current + g.dy);
          // État le plus proche de la POSITION courante (pas de l'état d'origine
          // du drag — sinon un drag lent + flick renvoie au mauvais voisin).
          const nearest = STATE_ORDER.reduce<MapSheetState>(
            (best, s) => (Math.abs(offsets[s] - y) < Math.abs(offsets[best] - y) ? s : best),
            'compact',
          );
          let next = nearest;
          if (Math.abs(g.vy) > FLING_VELOCITY) {
            // Fling : voisin du plus proche, dans le sens du geste (clampé aux bornes).
            const idx = STATE_ORDER.indexOf(nearest);
            const target = g.vy < 0 ? idx + 1 : idx - 1;
            next = STATE_ORDER[Math.min(Math.max(target, 0), STATE_ORDER.length - 1)] ?? nearest;
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
          // En compact/semi toute la sheet se laisse glisser ; en ouvert le
          // contenu appartient au ScrollView, seule la poignée ferme.
          {...(state === 'open' ? {} : panResponder.panHandlers)}
        >
          <View {...panResponder.panHandlers}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Panneau de course — glisse ou touche pour ouvrir"
              onPress={cycle}
              style={styles.handleZone}
            >
              <View style={styles.handle} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
            scrollEnabled={state === 'open'}
            bounces={false}
            showsVerticalScrollIndicator={state === 'open'}
          >
            {renderContent ? (
              renderContent(state)
            ) : (
              <>
                {compactSlot}
                {semiSlot}
                <Animated.View
                  style={{ opacity: openSlotOpacity }}
                  pointerEvents={state === 'open' ? 'auto' : 'none'}
                >
                  {openSlot}
                </Animated.View>
              </>
            )}
          </ScrollView>
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
  content: { flex: 1 },
  handleZone: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.gris,
    opacity: 0.5,
  },
});
