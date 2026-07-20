/**
 * GRYD — SlideToStart : le départ de course en GLISSER (override fondateur, remplace
 * la capsule « GO » tapable). Uniquement rendu sur la CARTE (pas dans la nav) : on
 * lance une course depuis l'écran où l'on voit son territoire.
 *
 * - VISIBLEMENT DYNAMIQUE : au repos, 3 chevrons balaient vers la droite en boucle +
 *   le pouce (thumb) respire d'un halo chartreuse → invite au geste sans notice.
 * - GESTE : on tire le pouce vers la droite ; passé ~75 % de la piste, la course part
 *   (haptique + `onComplete`) ; en deçà, il revient en douceur (spring).
 * - Le ROUTING reste contextuel (la Carte passe la cible via `onComplete`).
 * - Respecte « Réduire les animations » (AccessibilityInfo) : boucle coupée, geste OK.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii } from '@klaim/shared';
import { C } from '../../i18n/catalog/nav';
import { useT } from '../../i18n/store';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';

/** Géométrie de la piste — layout only, aucune constante de jeu. */
const TRACK_HEIGHT = 60;
const THUMB_SIZE = 52;
const TRACK_PAD = 4; // marge intérieure entre le bord et le pouce
/** Fraction de la piste à franchir pour déclencher (généreux : ~75 %). */
const COMPLETE_RATIO = 0.75;

export interface SlideToStartProps {
  /** Verbe court affiché au centre (défaut « GO » — AMENDEMENT-38). */
  label?: string;
  /** Libellé lecteur d'écran (le pourquoi de la course). */
  accessibilityLabel?: string;
  /** Déclenché quand le geste est mené au bout (la Carte navigue vers le live). */
  onComplete: () => void;
}

export function SlideToStart({ label = 'GO', accessibilityLabel, onComplete }: SlideToStartProps) {
  const t = useT();
  const [trackW, setTrackW] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** Course maximale du pouce (piste - pouce - marges). */
  const maxX = Math.max(0, trackW - THUMB_SIZE - TRACK_PAD * 2);

  const x = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  // `maxX` change après le premier layout — on le lit via ref dans le PanResponder
  // (créé une seule fois) pour éviter une capture obsolète.
  const maxXRef = useRef(0);
  maxXRef.current = maxX;
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduceMotion(v));
    return () => {
      alive = false;
    };
  }, []);

  // Boucle « invite au geste » : halo du pouce + balayage des chevrons. Coupée si
  // l'utilisateur a demandé de réduire les animations (une seule anim par scène §A).
  useEffect(() => {
    if (reduceMotion) return;
    const g = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    const s = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: false }),
    );
    g.start();
    s.start();
    return () => {
      g.stop();
      s.stop();
    };
  }, [reduceMotion, glow, sweep]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2,
      onPanResponderMove: (_e, g) => {
        const clamped = Math.max(0, Math.min(g.dx, maxXRef.current));
        x.setValue(clamped);
      },
      onPanResponderRelease: (_e, g) => {
        const m = maxXRef.current;
        const clamped = Math.max(0, Math.min(g.dx, m));
        if (m > 0 && clamped >= m * COMPLETE_RATIO) {
          // Mené au bout : on cale à droite, on part, puis on réarme (retour Carte).
          Animated.timing(x, { toValue: m, duration: 90, useNativeDriver: false }).start(() => {
            if (doneRef.current) return;
            doneRef.current = true;
            haptics.medium();
            onComplete();
            // Réarme après un cycle (la nav a poussé le live par-dessus).
            setTimeout(() => {
              doneRef.current = false;
              x.setValue(0);
            }, 400);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
        }
      },
    }),
  ).current;

  // Le libellé + les chevrons s'effacent à mesure que le pouce avance (on ne lit
  // plus « GO » quand on a déjà glissé).
  const contentOpacity = maxX > 0 ? x.interpolate({ inputRange: [0, maxX], outputRange: [1, 0] }) : 1;
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  return (
    <View
      style={styles.track}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel ?? t(C.slideToStartA11y, { label })}
    >
      {/* Libellé + chevrons animés (centrés) — invitent au glissement. */}
      <Animated.View style={[styles.center, { opacity: contentOpacity }]} pointerEvents="none">
        <Text style={styles.label}>{label}</Text>
        <View style={styles.chevrons}>
          {[0, 1, 2].map((i) => (
            <Animated.Text
              key={i}
              style={[
                styles.chevron,
                {
                  opacity: reduceMotion
                    ? 0.5
                    : sweep.interpolate({
                        // Chaque chevron s'allume à son tour → sensation de flux vers la droite.
                        inputRange: [0, (i + 1) / 4, (i + 2) / 4, 1],
                        outputRange: [0.2, 1, 0.2, 0.2],
                        extrapolate: 'clamp',
                      }),
                },
              ]}
            >
              ›
            </Animated.Text>
          ))}
        </View>
      </Animated.View>

      {/* Pouce chartreuse draggable (halo respirant). */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            transform: [{ translateX: x }],
            shadowOpacity: reduceMotion ? 0.4 : glowOpacity,
          },
        ]}
      >
        <Icon name="foulees" size={26} color={colors.noir} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.chartreuse,
    justifyContent: 'center',
    paddingHorizontal: TRACK_PAD,
    overflow: 'hidden',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  label: { color: colors.chartreuse, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  chevrons: { flexDirection: 'row' },
  chevron: { color: colors.chartreuse, fontSize: 22, fontWeight: '800', marginHorizontal: -1 },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.chartreuse,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
