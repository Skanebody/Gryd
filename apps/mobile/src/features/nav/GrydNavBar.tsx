/**
 * GRYD — navigation basse PERSISTANTE : une BARRE D'ONGLETS toujours visible,
 * EXACTEMENT trois destinations en 1 tap — Carte · Crew · Profil (spec §2.1,
 * arbitrage A2, LOT 5 — 27/07/2026). « Saison » (/classement) et « Missions »
 * (/warroom) restent des écrans ENTIERS, atteignables par des chemins nommés
 * ailleurs (Profil pour Saison ; Aujourd'hui/Paramètres pour Missions
 * aujourd'hui — un accès direct depuis la Carte est hors périmètre de ce
 * chantier, cf. `./tabs.ts`) : ce ne sont plus des onglets de CETTE barre.
 * Onglet actif = trait chartreuse + icône PLEINE + label gras +
 * accessibilityState selected — jamais la couleur seule.
 *
 * Les TROIS destinations et leurs libellés viennent de `./tabs.ts` (module PUR,
 * testé sous Deno) : c'est la SOURCE UNIQUE, pour qu'un test sur ce fichier
 * fasse foi sur ce qui est réellement rendu ici (pas une liste dupliquée qui
 * pourrait diverger). « Profil » colle aux planches E02/E03/E15 et se traduit
 * dans les 5 langues ; « Crew » reste invariant (jamais traduit).
 *
 * Le DÉPART de course n'est PAS dans la nav (override fondateur) : c'est le
 * bouton GO, rendu UNIQUEMENT sur la Carte — pill au-dessus de cette barre quand
 * la sheet est compacte, rond ancré au bord haut de la sheet quand elle est
 * déployée (planche E02). La barre reste un simple rang d'onglets espacés.
 *
 * ─── EN SUSPENS (déclaré, pas maquillé) ─────────────────────────────────────
 * §2.1 : « tap sur l'onglet actif = remonter en tête ou recentrer la carte ».
 * Non câblé ici : recentrer la Carte ou remonter le scroll de Crew/Profil
 * exige de toucher ces écrans, hors périmètre EXCLUSIF de ce chantier (Carte
 * interdite, Profil limité à l'entrée Saison). `go()` ne fait donc rien de
 * plus qu'avant sur un tap d'onglet déjà actif — pas de régression, mais pas
 * la remontée promise par la spec.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, spacing, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { NAV_BAR_HEIGHT } from './metrics';
import { NAV_TABS, isTabActive, resolveTabLabel } from './tabs';
import { useT } from '../../i18n/store';

interface ResolvedTab {
  label: string;
  href: string;
  icon: IconName;
}

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const t = useT();

  /** EXACTEMENT trois — `NAV_TABS` (./tabs.ts) est la source unique testée. */
  const tabs: readonly ResolvedTab[] = NAV_TABS.map((tab) => ({
    href: tab.href,
    icon: tab.icon,
    label: resolveTabLabel(tab, t),
  }));

  const go = (href: string) => {
    if (pathname !== href) router.navigate(href);
  };

  const renderTab = (item: ResolvedTab) => {
    const active = isTabActive(pathname, item.href);
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
