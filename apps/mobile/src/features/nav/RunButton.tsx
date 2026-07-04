/**
 * GRYD — bouton central GO (AMENDEMENT-14 §2, remplace le flux AMENDEMENT-08
 * §3) : zéro question avant de courir. Le disque affiche TOUJOURS « GO »
 * (l'unique CTA chartreuse global, §C.3), rendu au niveau du layout (tabs),
 * permanent sur les 5 onglets.
 *
 *   TAP        départ IMMÉDIAT : run_start(conquete) → Course Live sur
 *              l'itinéraire du plan auto (runContext — aucun écran
 *              intermédiaire, le serveur décide toujours du territoire).
 *   APPUI LONG choix avancés (power users) : RunModeSheet (Conquête / Social
 *              Run / Course privée) + « Changer d'itinéraire » → Route Planner.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type RunMode } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { ContextualRunButton } from '../../ui/game';
import { RunModeSheet } from '../motivation/RunModeSheet';
import { RUN_BUTTON_BOTTOM, RUN_BUTTON_SIZE } from './metrics';
import { battleContext, goHref } from './runContext';

export function RunButton() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [modePickerOpen, setModePickerOpen] = useState(false);

  // Plan auto dérivé des données démo (defense/conquete) — stable sur la session.
  const { mode: contextMode, plan } = useMemo(() => battleContext(), []);

  /** TAP = départ immédiat sur le plan auto (AMENDEMENT-14 §2). */
  const goNow = () => {
    track(EVENTS.runStart, { mode: 'conquete', context: contextMode, route: plan.routeId });
    router.push(goHref(plan));
  };

  /** Choix avancés (appui long) : mode explicite, itinéraire du plan conservé. */
  const startRun = (mode: RunMode) => {
    haptics.medium();
    setModePickerOpen(false);
    track(EVENTS.runStart, { mode, context: contextMode });
    router.push(
      mode === 'conquete' ? goHref(plan) : `/course-live?mode=${mode}`,
    );
  };

  const changeRoute = () => {
    setModePickerOpen(false);
    router.push('/route-planner');
  };

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + RUN_BUTTON_BOTTOM }]}
      pointerEvents="box-none"
    >
      <ContextualRunButton
        size={RUN_BUTTON_SIZE}
        onGo={goNow}
        onLongPress={() => setModePickerOpen(true)}
        // La phrase du plan auto accompagne le GO partout SAUF sur la carte,
        // où la sheet compacte la porte déjà (pas de doublon).
        hint={pathname === '/' ? undefined : plan.phrase}
      />
      <RunModeSheet
        visible={modePickerOpen}
        onSelect={startRun}
        onChangeRoute={changeRoute}
        onClose={() => setModePickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    width: RUN_BUTTON_SIZE,
    height: RUN_BUTTON_SIZE,
  },
});
