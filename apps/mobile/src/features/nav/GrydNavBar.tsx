/**
 * GRYD — navigation basse PERSISTANTE : une BARRE D'ONGLETS toujours visible,
 * destinations en 1 tap : Carte · Crew · Profil (Saison hors MVP ; Missions/War
 * Room atteintes depuis « Profil »). Onglet actif = trait chartreuse + icône
 * PLEINE + label gras + accessibilityState selected — jamais la couleur seule.
 *
 * Les libellés sont RÉSOLUS via i18n (`t(C.tab…)`) : « Profil » colle aux planches
 * E02/E03/E15 et se traduit dans les 5 langues. « Crew » reste invariant (jamais
 * traduit). Ils vivaient auparavant en dur (« Moi »), donc jamais traduits.
 *
 * Le DÉPART de course n'est PAS dans la nav (override fondateur) : c'est le
 * bouton GO, rendu UNIQUEMENT sur la Carte — pill au-dessus de cette barre quand
 * la sheet est compacte, rond ancré au bord haut de la sheet quand elle est
 * déployée (planche E02). La barre reste un simple rang d'onglets espacés.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, spacing, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { NAV_BAR_HEIGHT } from './metrics';
import { flags } from '../../lib/flags';
import { C } from '../../i18n/catalog/nav';
import { useT } from '../../i18n/store';

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const t = useT();

  /** Les destinations de la barre — libellés résolus via i18n (« Crew » invariant).
   *  D8 : « Saison » n'existe que hors MVP (flags.season) — la surface pilote
   *  est Carte · Crew · Profil ; les scores de saison s'accumulent quand même. */
  const tabs: readonly NavItem[] = [
    { label: t(C.tabCarte), href: '/', icon: 'carte' },
    { label: 'Crew', href: '/crew', icon: 'crew' },
    ...(flags.season
      ? [{ label: t(C.tabSaison), href: '/classement', icon: 'classement' } as const]
      : []),
    { label: t(C.tabMoi), href: '/profil', icon: 'profil' },
  ];

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
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>{tabs.map(renderTab)}</View>
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
  tabLabel: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.xs, fontWeight: '600' },
  tabLabelActive: { color: colors.chartreuse, fontWeight: '700' },
});
