/**
 * GRYD — MateMarker : mini avatar hexagonal d'un membre crew/ami SUR la carte
 * (AMENDEMENT-09 §2). INVARIANT AMENDEMENT-07 : jamais de position publique —
 * ce marker n'est rendu QUE pour des membres opt-in (démo : 2 consentants).
 * Reprend PlayerAvatarFrame en taille 's' (32 px) + halo chartreuse animé
 * discret (usePulse — reduce motion → halo fixe). Le PSEUDO n'apparaît qu'AU
 * TAP (bulle « MARA · 1,2 km ») — anti-bruit, la carte reste propre.
 * `isLeader` : mini couronne or (état de jeu : tête du crew).
 * Positionné en absolu par l'écran parent (centre du marker = le point).
 */
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gameColors } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../Icon';
import { PlayerAvatarFrame } from './PlayerAvatarFrame';
import { usePulse } from './anim';

/** Côté du marker (avatar hex 's' de PlayerAvatarFrame). */
export const MATE_MARKER_SIZE = 32;
/** Diamètre du halo animé autour de l'avatar. */
const HALO_SIZE = MATE_MARKER_SIZE + 14;
/** Cadence lente du halo — discret, pas un beacon. */
const HALO_PULSE_MS = 2_400;

export interface MateMarkerProps {
  /** Pseudo — affiché uniquement au tap. */
  name: string;
  /** Écart avec moi (km) — affiché dans la bulle au tap. */
  distanceKm: number;
  /** Leader du crew : mini couronne or. */
  isLeader?: boolean;
  /** Photo de profil (repli : initiale). */
  imageUri?: string;
}

/** « 1,2 km » — décimale française, pas d'Intl (parité Hermes). */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function MateMarker({ name, distanceKm, isLeader = false, imageUri }: MateMarkerProps) {
  const [showLabel, setShowLabel] = useState(false);
  const halo = usePulse(true, 1.12, HALO_PULSE_MS);
  const haloOpacity = halo.interpolate({ inputRange: [1, 1.12], outputRange: [0.45, 0.1] });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {showLabel ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleName} numberOfLines={1}>
            {name.toUpperCase()}
          </Text>
          <Text style={styles.bubbleDistance}>{formatKm(distanceKm)}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, à ${formatKm(distanceKm)}${isLeader ? ', leader du crew' : ''}`}
        onPress={() => {
          haptics.light();
          setShowLabel((v) => !v);
        }}
        style={styles.markerZone}
      >
        <Animated.View
          style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: halo }] }]}
        />
        <PlayerAvatarFrame name={name} size="s" imageUri={imageUri} />
        {isLeader ? (
          <View style={styles.crown}>
            <Icon name="couronne" size={12} color={gameColors.gold} />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  markerZone: {
    width: MATE_MARKER_SIZE,
    height: MATE_MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
  },
  crown: { position: 'absolute', top: -9, right: -5 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    maxWidth: 140,
  },
  bubbleName: { color: colors.blanc, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  bubbleDistance: { color: colors.gris, fontSize: 10, fontVariant: ['tabular-nums'] },
});
