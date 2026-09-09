import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydIcon, type GrydIconName } from './GrydIcon';
import { TranslucentBackdrop2026 } from './TranslucentBackdrop2026';

export type Surface2026Tone = 'light' | 'dark' | 'outlined';

export interface Surface2026Props {
  children: ReactNode;
  tone?: Surface2026Tone;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** One flat bento module. Keep sibling surfaces adjacent; do not nest them for decoration. */
export function Surface2026({ children, tone = 'light', style, accessibilityLabel }: Surface2026Props) {
  return <View accessibilityLabel={accessibilityLabel} style={[
    styles.surface,
    tone === 'dark' && styles.surfaceDark,
    tone === 'outlined' && styles.surfaceOutlined,
    style,
  ]}>{children}</View>;
}

export interface TranslucentControl2026Props {
  children: ReactNode;
  tone?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

/** Local control with a uniform translucent fill and sharp foreground content. */
export function TranslucentControl2026({ children, tone = 'light', style }: TranslucentControl2026Props) {
  return <View style={[
    styles.translucent,
    style,
    styles.translucentReset,
  ]}><TranslucentBackdrop2026 tone={tone} radius={Number(StyleSheet.flatten(style)?.borderRadius ?? 24)} />{children}</View>;
}

/** @deprecated Use TranslucentControl2026. */
export type GlassControl2026Props = TranslucentControl2026Props;
/** @deprecated Use TranslucentControl2026. */
export const GlassControl2026 = TranslucentControl2026;

export type CircularAction2026Tone =
  | 'light'
  | 'dark'
  | 'translucent'
  | 'translucentDark'
  /** @deprecated Use translucent. */
  | 'glass'
  /** @deprecated Use translucentDark. */
  | 'glassDark';

export interface CircularAction2026Props {
  label: string;
  icon: GrydIconName;
  onPress: () => void;
  tone?: CircularAction2026Tone;
  disabled?: boolean;
  accessibilityHint?: string;
  tooltipPlacement?: 'top' | 'bottom';
  style?: StyleProp<ViewStyle>;
}

/** Compact local action with a persistent accessible name and a web hover/focus tooltip. */
export function CircularAction2026({
  label,
  icon,
  onPress,
  tone = 'translucent',
  disabled,
  accessibilityHint,
  tooltipPlacement = 'top',
  style,
}: CircularAction2026Props) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const dark = tone === 'dark' || tone === 'translucentDark' || tone === 'glassDark';
  const translucent = tone === 'translucent' || tone === 'translucentDark' || tone === 'glass' || tone === 'glassDark';
  const showTooltip = Platform.OS === 'web' && (hovered || focused);

  return <View style={styles.actionSlot}>
    {showTooltip ? <View pointerEvents="none" style={[styles.tooltip, tooltipPlacement === 'bottom' && styles.tooltipBelow]}>
      <Text style={styles.tooltipText}>{label}</Text>
    </View> : null}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.circular,
        dark && styles.circularDark,
        translucent && styles.circularTranslucent,
        focused && (dark ? styles.focusedDark : styles.focused),
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {translucent ? <TranslucentBackdrop2026 tone={dark ? 'dark' : 'light'} radius={22} /> : null}
      <View pointerEvents="none" style={{ zIndex: 1 }}><GrydIcon name={icon} size={20} color={dark ? c.surface : c.ink} /></View>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: c.surface,
  },
  surfaceDark: { backgroundColor: c.carbon },
  surfaceOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.border,
  },
  translucent: { position: 'relative' },
  translucentReset: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  actionSlot: { position: 'relative', width: 44, height: 44, zIndex: 2 },
  circular: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  circularDark: { backgroundColor: c.ink, borderColor: c.ink },
  circularTranslucent: { borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'hidden', shadowOpacity: 0, elevation: 0 },
  focused: { borderWidth: 2, borderColor: c.ink },
  focusedDark: { borderWidth: 2, borderColor: c.surface },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.45 },
  tooltip: {
    position: 'absolute',
    bottom: 50,
    right: 0,
    minHeight: 28,
    minWidth: 80,
    maxWidth: 220,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.ink,
  },
  tooltipText: {
    color: c.surface,
    fontFamily: fonts.textMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  tooltipBelow: { top: 50, bottom: undefined },
});
