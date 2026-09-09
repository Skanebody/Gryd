import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refonteColors as c, fonts } from '@klaim/shared';
import { GrydIcon, type GrydIconName } from '../../ui/gryd/GrydIcon';
import { SlidingSelection2026, useControlMotion2026 } from '../../ui/gryd/Motion2026';
import { TranslucentBackdrop2026 } from '../../ui/gryd/TranslucentBackdrop2026';
import { MapTranslucent2026 } from '../../ui/gryd/MapTranslucent2026';
import {
  NAV_BAR_HEIGHT,
  NAV_BOTTOM_GAP,
  NAV_MAP_BAR_HEIGHT,
  NAV_MAP_BOTTOM_GAP,
  NAV_MAP_MAX_WIDTH,
} from './metrics';
import { NAV_TABS, isTabActive, resolveTabLabel } from './tabs';
import { useT } from '../../i18n/store';

export type MapNavigationAction2026 = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
};

/** Three stable destinations, with the map's contextual start action in the same dock. */
export function GrydNavBar({ mapAction }: { mapAction?: MapNavigationAction2026 }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const t = useT();
  const motion = useControlMotion2026();
  const icons: GrydIconName[] = ['map', 'crew', 'profile'];
  const overMap = pathname === '/';
  const integrated = overMap && mapAction !== undefined;
  const [railWidth, setRailWidth] = useState(integrated ? 132 : 188);
  const selectedIndex = Math.max(0, NAV_TABS.findIndex(tab => isTabActive(pathname, tab.href)));
  const [focusedHref, setFocusedHref] = useState<string | null>(null);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [actionFocused, setActionFocused] = useState(false);
  const blocked = !!mapAction?.disabled || !!mapAction?.busy;

  return <View
    pointerEvents="box-none"
    style={[
      s.anchor,
      overMap ? s.mapAnchor : s.regularAnchor,
      { bottom: insets.bottom + (overMap ? NAV_MAP_BOTTOM_GAP : NAV_BOTTOM_GAP) },
    ]}
  >
    <View testID={overMap ? 'gryd-map-dock' : undefined} style={[
      s.bar,
      overMap ? s.mapBarHeight : s.regularBarHeight,
      integrated ? s.integratedBar : s.compactBar,
      overMap ? s.mapBar : s.lightBar,
    ]}>
      {overMap
        ? <MapTranslucent2026 radius={30} tone="dark" />
        : <TranslucentBackdrop2026 tone="light" radius={30} />}

      <View
        accessibilityRole="tablist"
        onLayout={event => setRailWidth(event.nativeEvent.layout.width)}
        style={[s.rail, overMap ? s.mapRail : s.regularRail]}
      >
        <SlidingSelection2026
          index={selectedIndex}
          count={3}
          width={railWidth}
          color={overMap ? c.surface : c.ink}
          inset={overMap ? 4 : 0}
        />
        {NAV_TABS.map((tab, index) => {
          const active = isTabActive(pathname, tab.href);
          const label = resolveTabLabel(tab, t);
          const focused = focusedHref === tab.href;
          return <View key={tab.href} style={s.slot}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              aria-selected={active}
              accessibilityLabel={label}
              onFocus={() => setFocusedHref(tab.href)}
              onBlur={() => setFocusedHref(null)}
              onHoverIn={() => setHoveredHref(tab.href)}
              onHoverOut={() => setHoveredHref(null)}
              onPress={() => router.navigate(tab.href)}
              style={({ pressed }) => [
                s.tab,
                focused && {
                  borderColor: overMap
                    ? (active ? c.ink : c.surface)
                    : (active ? c.surface : c.ink),
                },
                pressed && s.pressed,
                pressed && motion && s.pressedMotion,
              ]}
            >
              <GrydIcon
                name={icons[index] ?? 'map'}
                size={22}
                active={active}
                color={active ? (overMap ? c.ink : c.surface) : (overMap ? c.darkInk : c.ink)}
              />
            </Pressable>
            {Platform.OS === 'web' && (hoveredHref === tab.href || focused) ? <View pointerEvents="none" style={s.tooltip}>
              <Text style={s.tooltipText}>{label}</Text>
            </View> : null}
          </View>;
        })}
      </View>

      {integrated && mapAction ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={mapAction.label}
        accessibilityState={{ disabled: blocked, busy: !!mapAction.busy }}
        aria-disabled={blocked}
        aria-busy={!!mapAction.busy}
        disabled={blocked}
        onFocus={() => setActionFocused(true)}
        onBlur={() => setActionFocused(false)}
        onPress={mapAction.onPress}
        style={({ pressed }) => [
          s.mapAction,
          actionFocused && s.actionFocus,
          blocked && s.blocked,
          pressed && s.pressed,
          pressed && motion && s.pressedMotion,
        ]}
      >
        {mapAction.busy ? <ActivityIndicator size="small" color={c.ink} /> : null}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} ellipsizeMode="clip" style={s.mapActionText}>
          {mapAction.label}
        </Text>
      </Pressable> : null}
    </View>
  </View>;
}

const s = StyleSheet.create({
  anchor: { position: 'absolute', alignItems: 'center', zIndex: 20 },
  regularAnchor: { left: 20, right: 20 },
  mapAnchor: { left: 16, right: 16 },
  bar: { position: 'relative', flexDirection: 'row', alignItems: 'center', padding: 4, gap: 4, borderRadius: 30, borderWidth: 1 },
  regularBarHeight: { height: NAV_BAR_HEIGHT },
  mapBarHeight: { height: NAV_MAP_BAR_HEIGHT },
  compactBar: { width: 188, maxWidth: '100%' },
  integratedBar: { width: '100%', maxWidth: NAV_MAP_MAX_WIDTH },
  mapBar: { borderWidth: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  lightBar: { borderColor: 'rgba(60,60,60,0.2)', backgroundColor: 'transparent' },
  rail: { position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  regularRail: { width: '100%', height: 44 },
  mapRail: { minWidth: 148, height: 52, paddingHorizontal: 4 },
  slot: { flex: 1, minWidth: 44, position: 'relative', zIndex: 1 },
  tab: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', borderRadius: 24 },
  tooltip: { position: 'absolute', bottom: 56, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: c.ink },
  tooltipText: { fontFamily: fonts.textMedium, fontSize: 11, color: c.darkInk },
  mapAction: { zIndex: 1, flexShrink: 1, minWidth: 104, maxWidth: 142, height: 48, borderRadius: 24, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, borderWidth: 2, borderColor: 'transparent' },
  mapActionText: { flexShrink: 1, color: c.ink, fontFamily: fonts.textSemi, fontSize: 14, lineHeight: 18, textAlign: 'center' },
  actionFocus: { borderColor: c.surface },
  blocked: { opacity: 0.46 },
  pressed: { opacity: 0.74 },
  pressedMotion: { transform: [{ scale: 0.96 }] },
});
