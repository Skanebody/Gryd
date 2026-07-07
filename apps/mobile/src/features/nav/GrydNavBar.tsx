/**
 * GRYD — navigation ÉPURÉE AU MAXIMUM (décision fondateur). Plus de barre
 * d'onglets en bas. À la place :
 *   - un MENU hamburger en HAUT À GAUCHE : toute la navigation dedans (Carte,
 *     Crew, Missions, Saison, Moi) ;
 *   - un SEUL bouton d'action en BAS AU CENTRE : RUN (contextuel — DÉFENDRE /
 *     CONQUÉRIR / TERMINER selon l'écran, jamais « GO »).
 * La carte sert à DÉCIDER avant la course puis à MONTRER la course ; tout le
 * reste est caché (menu, ou bouton Info de la carte). Rien d'autre à l'écran.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { EVENTS, track } from '../../lib/analytics';
import { deriveContextualAction, type ContextInput } from './contextualAction';

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

/** Toute la navigation vit dans le menu hamburger. */
const MENU_ITEMS: readonly NavItem[] = [
  { label: 'Carte', href: '/', icon: 'carte' },
  { label: 'Crew', href: '/crew', icon: 'crew' },
  { label: 'Missions', href: '/warroom', icon: 'guerre' },
  { label: 'Saison', href: '/classement', icon: 'classement' },
  { label: 'Moi', href: '/profil', icon: 'profil' },
];

/** Recadrage contextuel du RUN par route (Carte lit l'attaque ⇒ DÉFENDRE, etc.). */
const RUN_SCREEN_BY_PATH: Readonly<Record<string, NonNullable<ContextInput['screen']>>> = {
  '/': 'map',
  '/warroom': 'missions',
};

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  const screen = RUN_SCREEN_BY_PATH[pathname];
  const action = deriveContextualAction(screen ? { screen } : {});

  const go = (href: string) => {
    setMenuOpen(false);
    if (pathname !== href) router.navigate(href);
  };

  return (
    <>
      {/* MENU hamburger — HAUT À GAUCHE */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menu"
        hitSlop={8}
        onPress={() => setMenuOpen((o) => !o)}
        style={[styles.menuBtn, { top: insets.top + 10 }]}
      >
        <View style={styles.hLine} />
        <View style={styles.hLine} />
        <View style={styles.hLine} />
      </Pressable>

      {/* RUN — BAS AU CENTRE, le SEUL bouton d'action (contextuel). */}
      <View style={[styles.runAnchor, { bottom: insets.bottom + 22 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.a11yLabel}
          onPress={() => {
            track(EVENTS.runStart, { context: action.kind, intention: action.intention });
            router.push(action.targetHref);
          }}
          onLongPress={() => router.push('/route-planner')}
          style={({ pressed }) => [styles.run, pressed && styles.runPressed]}
        >
          <Icon name={action.icon} size={24} color={colors.noir} />
          <Text style={styles.runLabel} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      </View>

      {/* Menu déployé : scrim + panneau ancré sous le hamburger. */}
      {menuOpen ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le menu"
            style={styles.scrim}
            onPress={() => setMenuOpen(false)}
          />
          <View style={[styles.menuPanel, { top: insets.top + 62 }]}>
            {MENU_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={item.label}
                  onPress={() => go(item.href)}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    color={active ? colors.chartreuse : colors.blanc}
                    active={active}
                  />
                  <Text style={[styles.menuLabel, active && styles.menuLabelActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    position: 'absolute',
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  hLine: { width: 18, height: 2, borderRadius: 1, backgroundColor: colors.blanc },

  runAnchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  run: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.pill,
    paddingHorizontal: 26,
    paddingVertical: 16,
    shadowColor: colors.chartreuse,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  runPressed: { opacity: 0.85 },
  runLabel: { color: colors.noir, fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },

  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuPanel: {
    position: 'absolute',
    left: 14,
    minWidth: 200,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  menuItemPressed: { opacity: 0.7 },
  menuLabel: { color: colors.blanc, fontSize: 15, fontWeight: '600' },
  menuLabelActive: { color: colors.chartreuse },
});
