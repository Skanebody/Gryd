/**
 * GRYD — barre de navigation flottante : pill carbone, 5 onglets
 * Carte · Crew · Classement · Boutique · Profil (AMENDEMENT-02 §5).
 * Rendu maquette écran 01 : libellés texte + point chartreuse pour l'actif
 * (pas d'icônes filaires tant qu'aucun set SVG n'est dessiné — le point
 * chartreuse est l'emploi §C.3 « moi / état actif », doctrine respectée).
 * La tab bar native est masquée ; cette barre navigue via expo-router.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii } from '@klaim/shared';
import { NAV_BAR_BOTTOM, NAV_BAR_HEIGHT, NAV_BAR_SIDE } from './metrics';

interface TabItem {
  label: string;
  href: string;
}

const TABS: readonly TabItem[] = [
  { label: 'Carte', href: '/' },
  { label: 'Crew', href: '/crew' },
  { label: 'Classement', href: '/classement' },
  { label: 'Boutique', href: '/boutique' },
  { label: 'Profil', href: '/profil' },
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
            {active ? <View style={styles.activeDot} /> : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse, // §C.3 : état actif « moi »
  },
  label: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '500' },
  labelActive: { color: colors.blanc },
});
