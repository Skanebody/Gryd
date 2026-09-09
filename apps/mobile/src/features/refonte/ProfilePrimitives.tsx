import { useState, type ComponentProps, type ReactNode } from 'react';
import type { Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c, type IconName } from '@klaim/shared';
import { GrydIcon, type GrydIconName } from '../../ui/gryd';
import { TranslucentBackdrop2026 } from '../../ui/gryd/TranslucentBackdrop2026';
import { goBack } from '../../lib/nav';
import { useLocale } from '../../i18n/store';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../nav/metrics';

const GLYPHS: Partial<Record<IconName, ComponentProps<typeof GrydIcon>['name']>> = {
  route: 'route', historique: 'calendar', performance: 'chart', niveau: 'chart', badge: 'collection', pass: 'collection', lien: 'link', reglages: 'settings',
  crew: 'crew', plus: 'plus', ajoutami: 'crew', aujourdhui: 'calendar', feed: 'calendar', scout: 'location', boucle_fermee: 'loop', fermer: 'close',
  carte: 'map', profil: 'profile', ami: 'profile', verrou: 'lock', cloche: 'bell', aide: 'info', info: 'info', alerte: 'flag', conquete: 'check', partage: 'share',
};
export function ProfileGlyph({ name, grydIcon, size = 22, color = c.darkInk }: { name?: IconName; grydIcon?: GrydIconName; size?: number; color?: string }) {
  return <GrydIcon name={grydIcon ?? (name ? GLYPHS[name] : undefined) ?? 'arrowUpRight'} size={size} color={color} />;
}

export type ProfileTone = 'dark' | 'light';

/** Shared furniture for the new journal, community and collection surfaces. */
export function useRefonteCopy() {
  const locale = useLocale();
  return (fr: string, en: string) => locale === 'en' ? en : fr;
}

export function ProfilePage({ children, title, back, right, masthead, backHref = '/(tabs)/profil', tone = 'dark' }: {
  children: ReactNode; title: string; back?: boolean; right?: ReactNode; masthead?: ReactNode; backHref?: Href; tone?: ProfileTone;
}) {
  const insets = useSafeAreaInsets();
  const copy = useRefonteCopy();
  const light = tone === 'light';
  return <View style={[s.root, light && lightStyles.root]}>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag"
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + TAB_CONTENT_BOTTOM_CLEARANCE }]}>
      <View style={[s.masthead, light && lightStyles.masthead, { paddingTop: insets.top + 12 }]}><View style={s.header}>
        {back ? <Pressable accessibilityRole="button" accessibilityLabel={copy('Retour', 'Back')}
          onPress={() => goBack(backHref)} style={[s.iconButton, light && lightStyles.iconButton]}>
          <TranslucentBackdrop2026 tone={light ? 'light' : 'dark'} radius={22} />
          <View pointerEvents="none" style={s.controlContent}><GrydIcon name="chevronLeft" size={20} color={light ? c.ink : c.darkInk} /></View>
        </Pressable> : null}
        <Text style={[s.pageTitle, light && lightStyles.pageTitle, !back && s.destinationTitle]}>{title}</Text>{right ?? <View style={s.headerSpacer} />}
      </View>{masthead}</View>
      {children}
    </ScrollView>
  </View>;
}

export function ProfileButton({ label, onPress, secondary, busy, disabled, icon, tone = 'dark' }: {
  label: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean; icon?: IconName; tone?: ProfileTone;
}) {
  const light = tone === 'light';
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
    aria-disabled={!!disabled || !!busy} aria-busy={!!busy}
    disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, light && secondary && lightStyles.secondary, (disabled || busy) && s.disabled, pressed && s.pressed]}>
    {secondary ? <TranslucentBackdrop2026 tone={light ? 'light' : 'dark'} radius={23} /> : null}
    <View pointerEvents="none" style={s.buttonContent}>{busy ? <ActivityIndicator color={secondary ? (light ? c.ink : c.darkInk) : c.ink} /> : icon ? <ProfileGlyph name={icon} size={20} color={secondary ? (light ? c.ink : c.darkInk) : c.ink} /> : null}
      <Text style={[s.buttonText, secondary && s.secondaryText, light && secondary && lightStyles.secondaryText]}>{label}</Text>
    </View>
  </Pressable>;
}

type ProfileLinkProps = { title: string; subtitle?: string; onPress: () => void; tone?: ProfileTone } & (
  | { icon: IconName; grydIcon?: never }
  | { icon?: never; grydIcon: GrydIconName }
);

export function ProfileLink({ title, subtitle, icon, grydIcon, onPress, tone = 'dark' }: ProfileLinkProps) {
  const light = tone === 'light';
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.link, light && lightStyles.link, pressed && s.pressed]}>
    <ProfileGlyph name={icon} grydIcon={grydIcon} size={20} color={light ? c.ink : c.darkInk} /><View style={s.flex}>
      <Text style={[s.linkTitle, light && lightStyles.linkTitle]}>{title}</Text>{subtitle ? <Text style={[s.meta, light && lightStyles.meta]}>{subtitle}</Text> : null}
    </View><GrydIcon name="chevronRight" size={18} color={light ? c.muted : c.darkMuted} />
  </Pressable>;
}

export function ProfileSection({ title, action, onPress, tone = 'dark' }: { title: string; action?: string; onPress?: () => void; tone?: ProfileTone }) {
  const light = tone === 'light';
  return <View style={s.section}><Text style={[s.sectionTitle, light && lightStyles.sectionTitle]}>{title}</Text>
    {action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={s.sectionAction}><Text style={[s.linkAction, light && lightStyles.linkAction]}>{action}</Text></Pressable> : null}
  </View>;
}

export function ProfileSegments<T extends string>({ options, value, onChange, tone = 'dark' }: {
  options: readonly { key: T; label: string }[]; value: T; onChange: (value: T) => void; tone?: ProfileTone;
}) {
  const light = tone === 'light';
  const [focusedKey, setFocusedKey] = useState<T | null>(null);
  return <View accessibilityRole="tablist" style={[s.segments, light && lightStyles.segments]}><TranslucentBackdrop2026 tone={light ? 'light' : 'dark'} radius={999} />{options.map(option => <Pressable key={option.key} accessibilityRole="tab"
    accessibilityState={{ selected: value === option.key }} aria-selected={value === option.key}
    onFocus={() => setFocusedKey(option.key)} onBlur={() => setFocusedKey(null)} onPress={() => onChange(option.key)}
    style={[s.segment, light && lightStyles.segment, value === option.key && s.segmentSelected, light && value === option.key && lightStyles.segmentSelected, focusedKey === option.key && (light ? lightStyles.segmentFocused : s.segmentFocused)]}>
    <Text style={[s.segmentText, light && lightStyles.segmentText, value === option.key && s.segmentTextSelected, light && value === option.key && lightStyles.segmentTextSelected]}>{option.label}</Text>
  </Pressable>)}</View>;
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.carbon }, content: { paddingHorizontal: 20 },
  masthead: { marginHorizontal: -20, paddingHorizontal: 20, paddingBottom: 8, marginBottom: 8, backgroundColor: c.carbon },
  brand: { width: 44, height: 44, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 12 },
  pageTitle: { flex: 1, fontFamily: fonts.textMedium, fontSize: 15, color: c.surface },
  destinationTitle: { fontFamily: fonts.displayRegular, fontSize: 21, letterSpacing: -0.5 },
  headerSpacer: { width: 42 }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, marginLeft: -10, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: c.darkSurfaceMuted },
  kicker: { fontFamily: fonts.textSemi, color: c.darkMuted, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, letterSpacing: -0.7, color: c.darkInk },
  subtitle: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.darkMuted },
  meta: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.darkMuted },
  body: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.darkInk },
  flex: { flex: 1, gap: 4 }, gap: { gap: 16 },
  button: { minHeight: 46, borderRadius: 23, paddingHorizontal: 20, paddingVertical: 11, justifyContent: 'center', alignItems: 'center', backgroundColor: c.accent },
  buttonContent: { position: 'relative', zIndex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  controlContent: { position: 'relative', zIndex: 1 },
  secondary: { position: 'relative', overflow: 'hidden', backgroundColor: 'transparent', borderWidth: 1, borderColor: c.darkSurfaceMuted },
  secondaryText: { color: c.darkInk }, buttonText: { fontFamily: fonts.textSemi, fontSize: 14, color: c.ink, textAlign: 'center' },
  pressed: { opacity: 0.65 }, disabled: { opacity: 0.5 },
  link: { flexDirection: 'row', minHeight: 56, paddingVertical: 12, alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: c.darkSurfaceMuted },
  linkTitle: { fontFamily: fonts.textMedium, fontSize: 14, color: c.darkInk },
  section: { marginTop: 18, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { flex: 1, fontFamily: fonts.displayRegular, fontSize: 17, letterSpacing: -0.3, color: c.darkInk },
  sectionAction: { minHeight: 44, justifyContent: 'center' }, linkAction: { fontFamily: fonts.textSemi, fontSize: 13, color: c.darkInk },
  segments: { position: 'relative', overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: c.darkSurfaceMuted, borderRadius: 999, gap: 4, padding: 4, marginBottom: 8 },
  segment: { position: 'relative', zIndex: 1, minHeight: 44, flex: 1, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderRadius: 999 },
  segmentSelected: { backgroundColor: c.darkSurfaceMuted }, segmentText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.darkMuted }, segmentTextSelected: { color: c.surface },
  segmentFocused: { borderWidth: 2, borderColor: c.surface },
  empty: { paddingVertical: 28, gap: 14 },
  state: { paddingVertical: 22, gap: 14 },
  input: { minHeight: 50, backgroundColor: c.darkSurface, borderRadius: 16, borderWidth: 1, borderColor: c.darkSurfaceMuted, paddingHorizontal: 16, fontFamily: fonts.text, fontSize: 14, color: c.darkInk },
});

/** Light companions for screen-local styles that already consume `s`. */
export const lightStyles = StyleSheet.create({
  root: { backgroundColor: c.canvas },
  masthead: { backgroundColor: c.canvas },
  pageTitle: { color: c.ink },
  kicker: { color: c.muted },
  title: { color: c.ink },
  subtitle: { color: c.muted },
  meta: { color: c.muted },
  body: { color: c.ink },
  iconButton: { borderColor: c.border },
  secondary: { backgroundColor: 'transparent', borderColor: c.border },
  secondaryText: { color: c.ink },
  link: { borderBottomColor: c.border },
  linkTitle: { color: c.ink },
  sectionTitle: { color: c.ink },
  linkAction: { color: c.ink },
  segments: { borderColor: c.border, backgroundColor: 'transparent' },
  segment: { minHeight: 44, flex: 1, paddingHorizontal: 14, borderBottomWidth: 0, borderRadius: 999 },
  segmentSelected: { borderBottomColor: 'transparent', backgroundColor: c.ink },
  segmentFocused: { borderWidth: 2, borderColor: c.ink },
  segmentText: { color: c.muted },
  segmentTextSelected: { color: c.surface },
  input: { backgroundColor: c.surface, borderColor: c.border, color: c.ink },
});
