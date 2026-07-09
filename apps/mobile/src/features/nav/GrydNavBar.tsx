/**
 * GRYD — barre de navigation : Carte · Missions · RUN · Crew · Moi
 * RUN = action principale chartreuse (route-planner).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { EVENTS, track } from '../../lib/analytics';
import { NAV_BAR_BOTTOM, NAV_BAR_HEIGHT, NAV_BAR_SIDE } from './metrics';

interface TabItem {
  label: string;
  href: string;
  icon: IconName;
}

const SIDE_TABS: readonly TabItem[] = [
  { label: 'Carte', href: '/', icon: 'carte' },
  { label: 'Missions', href: '/warroom', icon: 'guerre' },
  { label: 'Crew', href: '/crew', icon: 'crew' },
  { label: 'Moi', href: '/profil', icon: 'profil' },
];

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const goTab = (href: string) => {
    if (pathname !== href) router.navigate(href);
  };

  const goRun = () => {
    track(EVENTS.runStart, { context: 'nav_run', intention: 'conquest' });
    router.push('/route-planner');
  };

  const leftTabs = SIDE_TABS.slice(0, 2);
  const rightTabs = SIDE_TABS.slice(2);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { bottom: insets.bottom + NAV_BAR_BOTTOM }]}
    >
      {leftTabs.map((tab) => (
        <NavItem key={tab.href} tab={tab} active={pathname === tab.href} onPress={() => goTab(tab.href)} />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lancer une course"
        onPress={goRun}
        style={({ pressed }) => [styles.runBtn, pressed && styles.runBtnPressed]}
      >
        <Text style={styles.runLabel}>RUN</Text>
      </Pressable>
      {rightTabs.map((tab) => (
        <NavItem key={tab.href} tab={tab} active={pathname === tab.href} onPress={() => goTab(tab.href)} />
      ))}
    </View>
  );
}

function NavItem({
  tab,
  active,
  onPress,
}: {
  tab: TabItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      hitSlop={8}
      onPress={onPress}
      style={styles.item}
    >
      <Icon name={tab.icon} size={22} color={active ? colors.chartreuse : colors.gris} active={active} />
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: NAV_BAR_SIDE,
    right: NAV_BAR_SIDE,
    height: NAV_BAR_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  item: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 2,
    flex: 1,
  },
  label: { color: colors.gris, fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
  labelActive: { color: colors.blanc },
  runBtn: {
    backgroundColor: colors.chartreuse,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginHorizontal: 2,
  },
  runBtnPressed: { opacity: 0.88 },
  runLabel: {
    color: colors.noir,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
