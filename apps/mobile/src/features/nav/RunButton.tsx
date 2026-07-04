/**
 * GRYD — bouton central de jeu (AMENDEMENT-08 §3, AMENDEMENT-12 §A) : le
 * `ContextualRunButton` du design system remplace le disque « GO » générique.
 * Son OBJECTIF (CONQUÉRIR / DÉFENDRE) est DÉRIVÉ des données démo (runContext) — l'anneau
 * d'état lit le contexte de jeu, le disque reste LE CTA chartreuse global
 * (§C.3 : 1 seul CTA chartreuse par écran). Rendu au niveau du layout (tabs),
 * permanent sur les 5 onglets.
 *
 * Flux conservé (AMENDEMENT-07 §2/§8) : APPUI LONG 500 ms → RunModeSheet
 * (Conquête / Social Run / Course privée) → run_start(mode) → Course Live
 * (`/course-live?mode=<mode>` — le serveur décide toujours du territoire).
 * Un tap court affiche l'aide « Maintiens pour lancer » (anti-faux départ).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, type RunMode } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { ContextualRunButton } from '../../ui/game';
import { RunModeSheet } from '../motivation/RunModeSheet';
import { RUN_BUTTON_BOTTOM, RUN_BUTTON_SIZE } from './metrics';
import { deriveRunButtonMode } from './runContext';

/** Durée d'affichage de l'aide au tap court (UI). */
const HINT_MS = 1_600;

export function RunButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Objectif contextuel dérivé des données démo (decay urgent ou mission
  // défense active → DÉFENDRE, sinon CONQUÉRIR) — stable sur la session.
  const contextMode = useMemo(() => deriveRunButtonMode(), []);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  // Tap court : rappel du geste (l'appui long est le déclencheur anti-faux départ).
  const showHint = () => {
    setHintVisible(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintVisible(false), HINT_MS);
  };

  const startRun = (mode: RunMode) => {
    setModePickerOpen(false);
    track(EVENTS.runStart, { mode, context: contextMode });
    // Course Live (AMENDEMENT-08 §5) — le mode sera passé à IngestRunRequest.runMode.
    router.push(`/course-live?mode=${mode}`);
  };

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + RUN_BUTTON_BOTTOM }]}
      pointerEvents="box-none"
    >
      {hintVisible ? (
        <View style={styles.hintWrap} pointerEvents="none">
          <View style={styles.hint}>
            <Text style={styles.hintLabel}>Maintiens pour lancer</Text>
          </View>
        </View>
      ) : null}
      <ContextualRunButton
        mode={contextMode}
        size={RUN_BUTTON_SIZE}
        onStart={() => setModePickerOpen(true)}
        onPress={showHint}
      />
      <RunModeSheet
        visible={modePickerOpen}
        onSelect={startRun}
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
  hintWrap: {
    position: 'absolute',
    bottom: RUN_BUTTON_SIZE + 16,
    left: -80,
    right: -80,
    alignItems: 'center',
  },
  hint: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  hintLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
});
