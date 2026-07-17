/**
 * GRYD — navigation basse PERSISTANTE : une BARRE D'ONGLETS toujours visible,
 * destinations en 1 tap : Carte · Crew · Moi (Saison hors MVP ; Missions/War Room
 * atteintes depuis « Moi »). Onglet actif = trait chartreuse + icône PLEINE + label
 * gras + accessibilityState selected — jamais la couleur seule.
 *
 * Le DÉPART de course n'est PLUS dans la nav (override fondateur) : c'est un GESTE
 * « glisser pour courir » (SlideToStart) rendu UNIQUEMENT sur la Carte. La barre
 * reste donc un simple rang d'onglets, régulièrement espacés.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { NAV_BAR_HEIGHT } from './metrics';
import { flags } from '../../lib/flags';

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

/** Les destinations de la barre.
 *  D8 : « Saison » n'existe que hors MVP (flags.season) — la surface pilote
 *  est Carte · Crew · Moi ; les scores de saison s'accumulent quand même. */
const TABS: readonly NavItem[] = [
  { label: 'Carte', href: '/', icon: 'carte' },
  { label: 'Crew', href: '/crew', icon: 'crew' },
  ...(flags.season ? [{ label: 'Saison', href: '/classement', icon: 'classement' } as const] : []),
  { label: 'Moi', href: '/profil', icon: 'profil' },
];

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const go = (href: string) => {
    if (pathname !== href) router.navigate(href);
  };

  const renderTab = (item: NavItem) => {
    const active = pathname === item.href;
    return (
      <Pressable
        key={item.href}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
        onPress={() => go(item.href)}
        style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
      >
        <View style={[styles.activeBar, active && styles.activeBarOn]} />
        <Icon
          name={item.icon}
          size={20}
          color={active ? colors.chartreuse : colors.gris}
          active={active}
        />
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  // Barre d'onglets persistante — ancrée au bord bas, pleine largeur, onglets réguliers.
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>{TABS.map(renderTab)}</View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: colors.carbone,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  tabItem: {
    flex: 1,
    height: NAV_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  pressed: { opacity: 0.7 },
  /** Trait actif : présence/absence = canal non-couleur (en plus icône pleine + gras). */
  activeBar: { width: 28, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  activeBarOn: { backgroundColor: colors.chartreuse },
  tabLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  tabLabelActive: { color: colors.chartreuse, fontWeight: '700' },
});
