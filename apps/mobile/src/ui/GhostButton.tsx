/**
 * GRYD — bouton secondaire ghost (addendum §F) : bordure gris-ligne, texte blanc,
 * icône filaire optionnelle à gauche (icône + texte court > texte long).
 * Le destructif est le même ghost + libellé explicite (pas de rouge, palette
 * tri-couleur stricte). Le CTA chartreuse global reste le disque COURIR.
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSizes, radii, type IconName } from '@klaim/shared';
import { Icon } from './Icon';

interface GhostButtonProps {
  label: string;
  /** Icône filaire (charte §F) posée à gauche du libellé. */
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
}

export function GhostButton({ label, icon, onPress, disabled = false }: GhostButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}
    >
      {icon ? <Icon name={icon} size={16} color={colors.blanc} /> : null}
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
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dim: { opacity: 0.6 },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
});
