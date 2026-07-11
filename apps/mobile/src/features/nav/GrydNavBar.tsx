/**
 * GRYD — navigation basse PERSISTANTE (remplace l'ancien menu hamburger) :
 *   - une BARRE D'ONGLETS toujours visible, 4 destinations en 1 tap :
 *     Carte · Crew · Saison · Moi (Missions/War Room reste une route atteinte
 *     depuis « Moi »). Onglet actif = trait chartreuse + icône PLEINE + label
 *     gras + accessibilityState selected — jamais la couleur seule ;
 *   - UN bouton d'action contextuel chartreuse SOULEVÉ au centre, présent sur
 *     TOUS les onglets (deriveContextualAction : RUN par défaut, DÉFENDRE /
 *     CONQUÉRIR / TERMINER / REJOINDRE selon l'écran — jamais « GO ») ;
 *   - quand le verbe dérivé n'est PAS le RUN libre, un lien texte discret
 *     « Course libre » au-dessus du bouton garde le run libre atteignable en
 *     1 tap (aucun geste caché — l'ancien long-press invisible est supprimé).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { EVENTS, track } from '../../lib/analytics';
import {
  deriveContextualAction,
  type ContextInput,
  type ContextualAction,
} from './contextualAction';
import {
  ACTION_BUTTON_EMBED,
  ACTION_BUTTON_HEIGHT,
  ACTION_SLOT_WIDTH,
  NAV_BAR_HEIGHT,
} from './metrics';

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

/** Les 4 destinations de la barre (2 de chaque côté du bouton central). */
const TABS: readonly NavItem[] = [
  { label: 'Carte', href: '/', icon: 'carte' },
  { label: 'Crew', href: '/crew', icon: 'crew' },
  { label: 'Saison', href: '/classement', icon: 'classement' },
  { label: 'Moi', href: '/profil', icon: 'profil' },
];

/**
 * Contexte de dérivation du bouton central par route. `null` = aucun contexte
 * de jeu à lire ⇒ défaut RUN (course libre). La Carte lit l'attaque en cours
 * (DÉFENDRE / CONQUÉRIR). Missions reste en RUN neutre : son CONTENU porte déjà
 * le verbe de la mission n°1 (hero) — deux verbes chartreuse divergents sur le
 * même écran seraient la confusion que l'audit zéro-friction condamne (§A.4).
 */
const RUN_SCREEN_BY_PATH: Readonly<Record<string, NonNullable<ContextInput['screen']> | null>> = {
  '/': 'map',
  '/warroom': null,
  '/crew': null,
  '/classement': null,
  '/profil': null,
};

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const screen = RUN_SCREEN_BY_PATH[pathname] ?? null;
  const action = deriveContextualAction(screen ? { screen } : {});
  // Run libre toujours atteignable : lien discret quand le verbe central diffère.
  const freeRun = action.kind === 'run' ? null : deriveContextualAction({});

  const go = (href: string) => {
    if (pathname !== href) router.navigate(href);
  };

  const launch = (a: ContextualAction) => {
    track(EVENTS.runStart, { context: a.kind, intention: a.intention });
    router.push(a.targetHref);
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
    <>
      {/* Barre d'onglets persistante — ancrée au bord bas, pleine largeur. */}
      <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
        {TABS.slice(0, 2).map(renderTab)}
        {/* Réserve du bouton central (rendu au-dessus, soulevé). */}
        <View style={styles.actionSlot} pointerEvents="none" />
        {TABS.slice(2).map(renderTab)}
      </View>

      {/* Bouton d'action contextuel — LE seul CTA chartreuse de la nav. */}
      <View
        style={[styles.actionAnchor, { bottom: insets.bottom + NAV_BAR_HEIGHT - ACTION_BUTTON_EMBED }]}
        pointerEvents="box-none"
      >
        {freeRun ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Course libre — départ sans objectif imposé"
            hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
            onPress={() => launch(freeRun)}
            style={({ pressed }) => [styles.freeRunLink, pressed && styles.pressed]}
          >
            <Text style={styles.freeRunText} numberOfLines={1}>
              Course libre
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.a11yLabel}
          onPress={() => launch(action)}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Icon name={action.icon} size={22} color={colors.noir} />
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      </View>
    </>
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
    gap: 4,
  },
  pressed: { opacity: 0.7 },
  /** Trait actif : présence/absence = canal non-couleur (en plus icône pleine + gras). */
  activeBar: { width: 28, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  activeBarOn: { backgroundColor: colors.chartreuse },
  tabLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  tabLabelActive: { color: colors.chartreuse, fontWeight: '700' },
  actionSlot: { width: ACTION_SLOT_WIDTH },

  actionAnchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: ACTION_BUTTON_HEIGHT,
    paddingHorizontal: 22,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: colors.noir,
    shadowColor: colors.chartreuse,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  actionPressed: { opacity: 0.85 },
  actionLabel: { color: colors.noir, fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },

  /** Lien discret (jamais un 2e CTA chartreuse) — fond sombre pour rester lisible sur la carte. */
  freeRunLink: {
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  freeRunText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
});
