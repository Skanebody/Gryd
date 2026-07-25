/**
 * GRYD — onglet Carte (home) : la carte EST le produit (SPEC §4.2.1).
 * Vague 1 · E02 : header (avatar/lieu/notifs) + sheet PREMIÈRE MISSION +
 * capsule contrôles + CTA RUN sneaker. Bike absent (feature flag).
 *
 * ─── FIN DU MODE VITRINE (21/07/2026) ───────────────────────────────────────
 * Aucune donnée fabriquée. Mission RÉELLE via useRealMission, ou sheet
 * PREMIÈRE MISSION honnête (E02) quand aucun territoire.
 */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, gameColors, iconSizes, radii } from '@klaim/shared';
import { MapScreen } from '../../src/features/map/MapScreen';
import { RunCta } from '../../src/features/nav/RunCta';
import { C } from '../../src/i18n/catalog/nav';
import { C as M } from '../../src/i18n/catalog/mission';
import { useRealMission } from '../../src/features/mission/useRealMission';
import { useLocale, useT } from '../../src/i18n/store';
import type { Locale } from '../../src/i18n/types';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { useMapHudHidden } from '../../src/features/map/mapUiStore';
import { Icon } from '../../src/ui/Icon';

// ─── Métriques locales (layout uniquement — aucune constante de jeu) ────────
/** Marges latérales de la ligne mission (alignées sur le header : 20 px). */
const MISSION_LINE_SIDE = 20;
/** Sous le header E02 (avatar 40 + gap). */
const MISSION_LINE_TOP_GAP = 58;
/** Cible tactile minimale (accessibilité — jamais sous 44 px). */
const MIN_TAP_TARGET = 44;
/**
 * La ligne mission ne se tronque JAMAIS (« … » interdit) : au pire elle
 * rétrécit — plancher 12 px (fontSizes.xs), la plus petite taille autorisée.
 */
const MISSION_TEXT_SIZE = 13;
const MISSION_TEXT_MIN_SCALE = fontSizes.xs / MISSION_TEXT_SIZE;

/** « 4,4 km » — décimale selon la langue, pas d'Intl (parité Hermes) ;
 *  « km » invariant. Seul l'anglais prend le point. */
function formatKm(km: number, locale: Locale): string {
  const fixed = km.toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

export default function CarteTab() {
  return (
    <View style={styles.root}>
      <MapScreen />
      <MissionLine />
      <RunCta />
    </View>
  );
}

/**
 * LIGNE MISSION fixe — uniquement pour defend/expand (E03+). En premier usage
 * (first_capture) la sheet E02 PREMIÈRE MISSION porte le message ; pas de
 * doublon §A. Tap = détail compact + entrée Route Planner.
 */
function MissionLine() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hudHidden = useMapHudHidden();
  const t = useT();
  const locale = useLocale();
  const [detailOpen, setDetailOpen] = useState(false);
  const { mission: realMission } = useRealMission();

  useFocusEffect(
    useCallback(() => {
      setDetailOpen(false);
    }, []),
  );

  if (hudHidden) return null;
  // first_capture → sheet E02 ; null/lecture → rien (pas de mensonge).
  if (!realMission || realMission.kind === 'first_capture') return null;

  const defend = realMission.kind === 'defend_expiring' ? realMission : null;
  const kmLabel =
    realMission.distanceM != null ? formatKm(realMission.distanceM / 1000, locale) : null;
  const nearText = defend ? t(M.missionDefend, { h: defend.hoursLeft }) : t(M.missionExpand);
  const lineText =
    kmLabel != null
      ? defend
        ? t(M.missionDefendFar, { km: kmLabel, h: defend.hoursLeft })
        : t(M.missionExpandFar, { km: kmLabel })
      : nearText;
  const accent = defend ? gameColors.danger : colors.chartreuse;

  const toggleRealDetail = () => {
    haptics.light();
    setDetailOpen((open) => {
      const next = !open;
      if (next) screen('map_mission_line_open');
      return next;
    });
  };
  const openRealPlanner = () => {
    haptics.light();
    router.push(defend ? '/route-planner?type=defense' : '/route-planner');
  };

  return (
    <View
      style={[styles.missionWrap, { top: insets.top + MISSION_LINE_TOP_GAP }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: detailOpen }}
        accessibilityLabel={`${lineText} — ${t(
          detailOpen ? C.missionDetailCloseA11y : C.missionDetailOpenA11y,
        )}`}
        onPress={toggleRealDetail}
        style={({ pressed }) => [styles.missionLine, pressed && styles.pressed]}
        testID="battle-map-mission-line-real"
      >
        <View style={[styles.missionBar, { backgroundColor: accent }]} />
        <Text
          style={styles.missionText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={MISSION_TEXT_MIN_SCALE}
        >
          {lineText}
        </Text>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>

      {detailOpen ? (
        <View style={styles.missionDetail}>
          <Text
            style={styles.detailTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MISSION_TEXT_MIN_SCALE}
          >
            {nearText}
          </Text>
          <View style={styles.detailDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(M.missionPlanA11y)}
            onPress={openRealPlanner}
            style={({ pressed }) => [styles.detailAction, pressed && styles.pressed]}
            testID="battle-map-plan-route-real"
          >
            <Text style={styles.detailActionLabel} numberOfLines={1}>
              {t(M.missionPlan)}
            </Text>
            <Icon name="chevron" size={iconSizes.sm} color={colors.blanc} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  pressed: { opacity: 0.7 },

  missionWrap: {
    position: 'absolute',
    left: MISSION_LINE_SIDE,
    right: MISSION_LINE_SIDE,
    gap: 8,
  },
  missionLine: {
    minHeight: MIN_TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    overflow: 'hidden',
  },
  missionBar: { width: 4, alignSelf: 'stretch', backgroundColor: gameColors.rival },
  missionText: {
    flex: 1,
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: MISSION_TEXT_SIZE,
    fontWeight: '700',
    paddingLeft: 10,
  },

  missionDetail: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailTitle: {
    color: colors.blanc,
    fontFamily: fonts.displaySemi,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  detailDivider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 10 },
  detailAction: {
    minHeight: MIN_TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailActionLabel: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
