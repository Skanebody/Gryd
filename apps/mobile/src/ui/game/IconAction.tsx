/**
 * GRYD — IconAction (AMENDEMENT-22 §3). Action SECONDAIRE légère, façon Strava :
 * une icône dans un cercle DISCRET + un label dessous. PAS de grosse card / pas
 * de rectangle plein — l'écran n'a qu'UN seul gros CTA chartreuse, tout le reste
 * est léger (`○ Sauver   ○ Copier   ○ Plus`).
 *
 * Règle de profondeur : le cercle est une surface N2 (`elevation.raised`) SANS
 * contour permanent (contour = état seulement). Au press, on assombrit ; jamais
 * de bordure chartreuse ni de fond plein qui la ferait lire comme un bouton
 * primaire. Le label vit en gris/blanc, jamais en chartreuse.
 *
 * Pensé pour vivre dans une rangée (`flexDirection: 'row'`, réparti) : passe
 * `style` si besoin, mais par défaut le composant se centre et prend sa place.
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, elevation, fontSizes } from '@klaim/shared';
import { Icon } from '../Icon';
import type { IconName } from '@klaim/shared';

export interface IconActionProps {
  /** Icône filaire (source unique @klaim/shared). */
  icon: IconName;
  /** Label COURT sous l'icône (jamais tronqué par « … »). */
  label: string;
  onPress: () => void;
  /** Libellé d'accessibilité (défaut = `label`). */
  accessibilityLabel?: string;
  /** Diamètre du cercle (défaut 52). */
  size?: number;
  style?: ViewStyle;
}

export function IconAction({
  icon,
  label,
  onPress,
  accessibilityLabel,
  size = 52,
  style,
}: IconActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed, style]}
    >
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Icon name={icon} size={Math.round(size * 0.42)} color={colors.blanc} />
      </View>
      {/* §A.9 — label court, JAMAIS « … ». clip (pas le défaut RN `tail`) : si un
          label dépassait, on coupe net plutôt que d'afficher l'ellipse interdite. */}
      <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  // Cercle N2 discret, SANS contour (le contour est réservé aux états).
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  label: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.2 },
  pressed: { opacity: 0.55 },
});
