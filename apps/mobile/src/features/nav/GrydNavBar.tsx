/**
 * GRYD — barre de navigation flottante ULTRA-SIMPLE (4 slots) :
 *   Carte · Crew · [ RUN ] · Moi
 * Décision fondateur : le menu ne sert qu'à 3 besoins — courir, regarder la
 * carte, gérer sa progression. On tombe de 5 onglets à 3 (Carte · Crew · Moi) +
 * un BOUTON RUN CENTRAL permanent, gros et chartreuse : « le joueur ne doit
 * jamais chercher comment courir ». Missions et Saison sortent de la barre
 * (accès depuis « Moi » → /warroom, /classement — routes conservées).
 *
 * Le bouton RUN reprend la dérivation CONTEXTUELLE de l'AMENDEMENT-29
 * (deriveContextualAction) : défaut RUN, mais DÉFENDRE/CONQUÉRIR/TERMINER selon
 * l'écran (Carte lit l'attaque, Missions la mission urgente) — jamais « GO ».
 * Appui long = Route Planner (choix avancés). Il n'est plus un overlay gaté :
 * il vit DANS la barre, toujours visible.
 *
 * Icônes filaires 1,5 px (charte §F). Onglet actif = icône chartreuse (remplie
 * si fillable, §C.3 « moi / actif ») + label blanc — exception nav officielle
 * (AMENDEMENT-08 §2). La tab bar native est masquée ; cette barre navigue via
 * expo-router. Aucune couleur hors tokens.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, type IconName } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { EVENTS, track } from '../../lib/analytics';
import { deriveContextualAction, type ContextInput } from './contextualAction';
import { NAV_BAR_BOTTOM, NAV_BAR_HEIGHT, NAV_BAR_SIDE } from './metrics';

interface TabItem {
  label: string;
  href: string;
  icon: IconName;
}

/** 3 onglets de navigation (le 4ᵉ slot central = le bouton RUN, ci-dessous). */
const TABS: readonly TabItem[] = [
  { label: 'Carte', href: '/', icon: 'carte' },
  { label: 'Crew', href: '/crew', icon: 'crew' },
  { label: 'Moi', href: '/profil', icon: 'profil' },
];

/**
 * Recadrage contextuel du bouton RUN par route (comme l'ancien FAB gaté, mais
 * ici le bouton est TOUJOURS présent) : la Carte lit l'attaque (⇒ DÉFENDRE),
 * Missions la mission urgente (⇒ TERMINER). Ailleurs → défaut RUN (course libre).
 */
const RUN_SCREEN_BY_PATH: Readonly<Record<string, NonNullable<ContextInput['screen']>>> = {
  '/': 'map',
  '/warroom': 'missions',
};

function NavTab({ tab, active, onPress }: { tab: TabItem; active: boolean; onPress: () => void }) {
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

/** Bouton RUN central : gros, chartreuse, surélevé — l'action principale permanente. */
function RunButton() {
  const router = useRouter();
  const pathname = usePathname();
  const screen = RUN_SCREEN_BY_PATH[pathname];
  const action = deriveContextualAction(screen ? { screen } : {});
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.a11yLabel}
      onPress={() => {
        // L'intention CLIENT part au live ; le tracé décide, le serveur tranche.
        track(EVENTS.runStart, { context: action.kind, intention: action.intention });
        router.push(action.targetHref);
      }}
      // Appui long = choix avancés (itinéraire/intentions) sans imposer un mode.
      onLongPress={() => router.push('/route-planner')}
      style={({ pressed }) => [styles.run, pressed && styles.runPressed]}
    >
      <Icon name={action.icon} size={22} color={colors.noir} />
      <Text style={styles.runLabel} numberOfLines={1}>
        {action.label}
      </Text>
    </Pressable>
  );
}

export function GrydNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { bottom: insets.bottom + NAV_BAR_BOTTOM }]}>
      <NavTab
        tab={TABS[0]!}
        active={pathname === TABS[0]!.href}
        onPress={() => pathname !== TABS[0]!.href && router.navigate(TABS[0]!.href)}
      />
      <NavTab
        tab={TABS[1]!}
        active={pathname === TABS[1]!.href}
        onPress={() => pathname !== TABS[1]!.href && router.navigate(TABS[1]!.href)}
      />
      {/* Slot central : l'action principale, jamais un onglet. */}
      <RunButton />
      <NavTab
        tab={TABS[2]!}
        active={pathname === TABS[2]!.href}
        onPress={() => pathname !== TABS[2]!.href && router.navigate(TABS[2]!.href)}
      />
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
  // Bouton RUN : surélevé (déborde la barre), chartreuse plein, texte noir.
  run: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 13,
    transform: [{ translateY: -14 }],
    // Glow chartreuse discret — état N3 réservé à L'action principale (charte).
    shadowColor: colors.chartreuse,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  runPressed: { opacity: 0.85 },
  runLabel: { color: colors.noir, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
