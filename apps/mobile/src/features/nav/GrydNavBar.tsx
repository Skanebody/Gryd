/**
 * GRYD — barre de navigation flottante : pill carbone, 5 onglets de JEU
 * Carte · War Room · Crew · League · Profil (AMENDEMENT-08 §3, doc §6 — la
 * route `classement` est conservée, seul le label devient « League »).
 * La Boutique est sortie de la nav (→ Arsenal, accès Profil/War Room). War Room
 * porte l'icône guerre. Icônes filaires 1,5 px (charte §F, set @klaim/shared
 * — décision fondateur 03/07/2026) : icône 22 + label 10 dessous ; actif = icône
 * chartreuse (remplie si fillable, §C.3 « moi / état actif ») + label blanc.
 * ARBITRAGE FONDATEUR (AMENDEMENT-06) : l'icône active de la nav RESTE
 * chartreuse — exception officielle C.3 consignée à l'AMENDEMENT-08 §2, seule
 * exception nav autorisée. Ne pas « corriger » vers le blanc.
 * La tab bar native est masquée ; cette barre navigue via expo-router.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { NAV_BAR_BOTTOM, NAV_BAR_HEIGHT, NAV_BAR_SIDE } from './metrics';

interface TabItem {
  label: string;
  href: string;
  icon: IconName;
}

const TABS: readonly TabItem[] = [
  { label: 'Carte', href: '/', icon: 'carte' },
  { label: 'War Room', href: '/warroom', icon: 'guerre' },
  { label: 'Crew', href: '/crew', icon: 'crew' },
  { label: 'League', href: '/classement', icon: 'classement' },
  { label: 'Profil', href: '/profil', icon: 'profil' },
];

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { bottom: insets.bottom + NAV_BAR_BOTTOM }]}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Pressable
            key={tab.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            hitSlop={8}
            onPress={() => {
              if (!active) router.navigate(tab.href);
            }}
            style={styles.item}
          >
            <Icon
              name={tab.icon}
              size={22}
              color={active ? colors.chartreuse : colors.gris}
              active={active}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: NAV_BAR_SIDE,
    right: NAV_BAR_SIDE,
    height: NAV_BAR_HEIGHT,
    borderRadius: radii.pill,
    // Maquette : carbone à 90 % + blur — opaque ici, aucune couleur hors tokens.
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  item: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  label: { color: colors.gris, fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
  labelActive: { color: colors.blanc },
});
