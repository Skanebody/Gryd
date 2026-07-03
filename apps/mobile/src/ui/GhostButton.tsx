/**
 * GRYD — bouton secondaire ghost (addendum §F) : bordure gris-ligne, texte blanc.
 * Le destructif est le même ghost + libellé explicite (pas de rouge, palette
 * tri-couleur stricte). Le CTA chartreuse global reste le disque COURIR.
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSizes, radii } from '@klaim/shared';

interface GhostButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function GhostButton({ label, onPress, disabled = false }: GhostButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dim: { opacity: 0.6 },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
});
