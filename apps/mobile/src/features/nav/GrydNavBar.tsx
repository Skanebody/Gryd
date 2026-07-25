/**
 * GRYD — navigation basse PERSISTANTE (maquettes 2026) :
 * Carte · Crew · Profil (+ Saison si flags.season).
 * Onglet actif = trait chartreuse + icône pleine + label — jamais la couleur seule.
 * Le départ de course vit sur la Carte (SlideToStart), pas dans la barre.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, spacing, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { NAV_BAR_HEIGHT } from './metrics';
import { flags } from '../../lib/flags';

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

const TABS: readonly NavItem[] = [
  { label: 'Carte', href: '/', icon: 'carte' },
  { label: 'Crew', href: '/crew', icon: 'crew' },
  ...(flags.season ? [{ label: 'Saison', href: '/classement', icon: 'classement' } as const] : []),
  { label: 'Profil', href: '/profil', icon: 'profil' },
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
  activeBar: { width: 28, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  activeBarOn: { backgroundColor: colors.chartreuse },
  tabLabel: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  tabLabelActive: { color: colors.chartreuse, fontWeight: '700' },
});
