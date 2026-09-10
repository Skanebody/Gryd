/**
 * GRYD : LA BARRE BASSE, UNE SEULE, IDENTIQUE SUR TOUTES LES PAGES.
 *
 * ─ CE QUI CHANGE LE 10/09/2026 ──────────────────────────────────────────────
 * Le fondateur a testé l'app sur son iPhone : « le menu en bas avec le bouton
 * Courir doit être le même sur toutes les pages ». Il ne l'était pas. Ce
 * composant rendait DEUX barres selon `pathname === '/'` :
 *   . sur la Carte : socle sombre de 60 pt, pastille d'action « Courir » que
 *     l'écran lui passait en prop (`mapAction`) ;
 *   . ailleurs : socle clair de 54 pt, large de 188 pt, SANS action.
 * Et le layout d'onglets ajoutait l'insulte à la blessure en n'en montant
 * aucune sur la Carte (`pathname === '/' ? null : <GrydNavBar />`), parce que
 * la Carte montait la sienne.
 *
 * Il n'y a plus qu'un socle, un jeu de mesures (`metrics.ts`), et l'action est
 * CALCULÉE par la barre (`useRunAction2026`) au lieu de lui être passée par un
 * écran : c'est ce qui rend impossible qu'une page l'oublie.
 *
 * ─ CE QUI NE CHANGE PAS ─────────────────────────────────────────────────────
 * Trois destinations, toujours (§2.1, `./tabs.ts`), et la chaîne de course :
 * le bouton pousse exactement la même route qu'avant.
 */
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refonteColors as c, fonts } from '@klaim/shared';
import { GrydIcon, type GrydIconName } from '../../ui/gryd/GrydIcon';
import { SlidingSelection2026, useControlMotion2026 } from '../../ui/gryd/Motion2026';
import {
  GRYD_NAV_BAR_HEIGHT,
  GRYD_NAV_BOTTOM_GAP,
  GRYD_NAV_MAX_WIDTH,
} from './metrics';
import { NAV_TABS, isTabActive, resolveTabLabel } from './tabs';
import { useRunAction2026 } from './useRunAction2026';
import { useT } from '../../i18n/store';

/**
 * Hauteur de la barre, ré-exportée par la barre elle-même : un écran qui doit
 * dégager son contenu n'a pas à savoir dans quel module vit la mesure.
 */
export { GRYD_NAV_BAR_HEIGHT, GRYD_NAV_BOTTOM_GAP, GRYD_NAV_MAX_WIDTH } from './metrics';

/** Three stable destinations, plus the start action, in the same dock everywhere. */
export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const t = useT();
  const motion = useControlMotion2026();
  const icons: GrydIconName[] = ['map', 'crew', 'profile'];
  const action = useRunAction2026(pathname);
  const [railWidth, setRailWidth] = useState(132);
  const selectedIndex = Math.max(0, NAV_TABS.findIndex(tab => isTabActive(pathname, tab.href)));
  const [focusedHref, setFocusedHref] = useState<string | null>(null);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [actionFocused, setActionFocused] = useState(false);
  const blocked = action.disabled || action.busy;

  return <View
    pointerEvents="box-none"
    style={[s.anchor, { bottom: insets.bottom + GRYD_NAV_BOTTOM_GAP }]}
  >
    <View testID="gryd-nav-dock" style={s.bar}>
      <View
        accessibilityRole="tablist"
        onLayout={event => setRailWidth(event.nativeEvent.layout.width)}
        style={s.rail}
      >
        <SlidingSelection2026
          index={selectedIndex}
          count={3}
          width={railWidth}
          color={c.surface}
          inset={4}
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
                focused && { borderColor: active ? c.ink : c.surface },
                pressed && s.pressed,
                pressed && motion && s.pressedMotion,
              ]}
            >
              <GrydIcon
                name={icons[index] ?? 'map'}
                size={22}
                active={active}
                color={active ? c.ink : c.darkInk}
              />
            </Pressable>
            {Platform.OS === 'web' && (hoveredHref === tab.href || focused) ? <View pointerEvents="none" style={s.tooltip}>
              <Text style={s.tooltipText}>{label}</Text>
            </View> : null}
          </View>;
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityState={{ disabled: blocked, busy: action.busy }}
        aria-disabled={blocked}
        aria-busy={action.busy}
        disabled={blocked}
        onFocus={() => setActionFocused(true)}
        onBlur={() => setActionFocused(false)}
        onPress={action.onPress}
        style={({ pressed }) => [
          s.action,
          actionFocused && s.actionFocus,
          blocked && s.blocked,
          pressed && s.pressed,
          pressed && motion && s.pressedMotion,
        ]}
      >
        {action.busy ? <ActivityIndicator size="small" color={c.ink} /> : null}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} ellipsizeMode="clip" style={s.actionText}>
          {action.label}
        </Text>
      </Pressable>
    </View>
  </View>;
}

const s = StyleSheet.create({
  anchor: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 20 },
  bar: {
    position: 'relative', flexDirection: 'row', alignItems: 'center', padding: 4, gap: 4,
    borderRadius: 30, height: GRYD_NAV_BAR_HEIGHT, width: '100%', maxWidth: GRYD_NAV_MAX_WIDTH,
    // OPAQUE, ET C'EST LE POINT. Le socle était `TranslucentBackdrop2026` : un
    // matériau translucide prend la couleur de ce qu'il y a DERRIÈRE. Il rendait
    // donc noir sur la Carte et gris délavé sur le Profil, deux surfaces
    // claires et sombres. « La même barre sur toutes les pages » interdit ça.
    // `c.carbon` est exactement la valeur que ce même matériau adopte déjà
    // quand iOS demande de réduire la transparence : on ne quitte pas le
    // système, on en prend la variante qui ne dépend de personne.
    backgroundColor: c.carbon, shadowOpacity: 0, elevation: 0,
  },
  rail: { position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 148, height: 52, paddingHorizontal: 4 },
  slot: { flex: 1, minWidth: 44, position: 'relative', zIndex: 1 },
  tab: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', borderRadius: 24 },
  tooltip: { position: 'absolute', bottom: 56, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: c.ink },
  tooltipText: { fontFamily: fonts.textMedium, fontSize: 11, color: c.darkInk },
  action: { zIndex: 1, flexShrink: 1, minWidth: 104, maxWidth: 142, height: 48, borderRadius: 24, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, borderWidth: 2, borderColor: 'transparent' },
  actionText: { flexShrink: 1, color: c.ink, fontFamily: fonts.textSemi, fontSize: 14, lineHeight: 18, textAlign: 'center' },
  actionFocus: { borderColor: c.surface },
  blocked: { opacity: 0.46 },
  pressed: { opacity: 0.74 },
  pressedMotion: { transform: [{ scale: 0.96 }] },
});
