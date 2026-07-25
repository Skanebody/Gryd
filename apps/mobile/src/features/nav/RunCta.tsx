/**
 * GRYD — CTA RUN Home Map (Vague 1 · E02).
 * Deux formes (morph) :
 *   · sheet déployée → rond 60 pt sneaker seule, ancré à droite du bloc mission ;
 *   · sheet fermée (« carte nue ») → pill sneaker + « RUN » au-dessus de la nav.
 * Label « RUN » invariant FR/EN/ES. VoiceOver : label accessible complet.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, radii } from '@klaim/shared';
import { C } from '../../i18n/catalog/nav';
import { useLocale, useT } from '../../i18n/store';
import { haptics } from '../../lib/haptics';
import { hasPendingUpload, retryPendingUpload } from '../../lib/pendingUpload';
import { Icon } from '../../ui/Icon';
import {
  useMapHudHidden,
  useMissionSheetDeployed,
  useZoneSheetOpen,
} from '../map/mapUiStore';
import { deriveContextualAction } from './contextualAction';
import { NAV_BAR_HEIGHT, RUN_BUTTON_BOTTOM, RUN_CTA_GAP, RUN_CTA_SIZE } from './metrics';

export function RunCta() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const locale = useLocale();
  const hudHidden = useMapHudHidden();
  const sheetDeployed = useMissionSheetDeployed();
  const zoneSheetOpen = useZoneSheetOpen();
  const action = useMemo(() => deriveContextualAction({ screen: 'map' }, locale), [locale]);

  // E04 : sheet de décision ouverte → RUN disparaît (un seul CTA primaire).
  if (zoneSheetOpen) return null;

  // Sheet visible → rond à droite ; sinon pill au-dessus de la nav.
  const round = sheetDeployed && !hudHidden;

  const onPress = () => {
    haptics.medium();
    router.push(action.targetHref);
  };

  const a11y = t(C.runCtaA11y);

  if (round) {
    return (
      <View
        style={[
          styles.roundWrap,
          { bottom: insets.bottom + RUN_BUTTON_BOTTOM + 72 },
        ]}
        pointerEvents="box-none"
      >
        <PendingRunNote />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y}
          onPress={onPress}
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          testID="map-run-cta-round"
        >
          <Icon name="basket" size={30} color={colors.noir} />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.pillWrap,
        { bottom: insets.bottom + NAV_BAR_HEIGHT + RUN_CTA_GAP },
      ]}
      pointerEvents="box-none"
    >
      <PendingRunNote />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        onPress={onPress}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        testID="map-run-cta-pill"
      >
        <Icon name="basket" size={22} color={colors.noir} />
        <Text style={styles.pillLabel}>{t(C.actionRun)}</Text>
      </Pressable>
    </View>
  );
}

function PendingRunNote() {
  const t = useT();
  const [pending, setPending] = useState(false);
  const refresh = useCallback(() => {
    void hasPendingUpload().then(setPending);
  }, []);
  useFocusEffect(refresh);
  if (!pending) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.pendingRunNote)}
      onPress={() => {
        haptics.light();
        void retryPendingUpload().then(refresh);
      }}
      style={({ pressed }) => [styles.pendingNote, pressed && { opacity: 0.7 }]}
      testID="pending-run-note"
    >
      <Text style={styles.pendingNoteText} numberOfLines={1} adjustsFontSizeToFit>
        {t(C.pendingRunNote)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  roundWrap: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 6,
  },
  round: {
    width: RUN_CTA_SIZE,
    height: RUN_CTA_SIZE,
    borderRadius: RUN_CTA_SIZE / 2,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.chartreuse,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  pillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 6,
  },
  pill: {
    minHeight: RUN_CTA_SIZE,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.chartreuse,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  pillLabel: {
    color: colors.noir,
    fontFamily: fonts.textBold,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pendingNote: {
    alignSelf: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grisLigne,
  },
  pendingNoteText: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
});
