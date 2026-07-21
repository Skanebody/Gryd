/**
 * GRYD — UI des états GPS réels (AMENDEMENT-15 §2). Composants PURS (aucun
 * import natif — sûrs dans le bundle web même s'ils n'y sont jamais rendus) :
 *  - GpsSignalPill : GPS faible / signal perdu / autorisation coupée, branchée
 *    sur signalState — informatif, GO-first, jamais bloquant ;
 *  - PreciseLocationBanner : « Active la position exacte » (iOS approximatif /
 *    Android coarse) → réglages ;
 *  - BackgroundRationaleCard : rationale UNE phrase pour la permission
 *    arrière-plan, demandée seulement après une mise en fond en course ;
 *  - BackgroundHelpSheet : « Courir écran éteint » par constructeur ;
 *  - RestoreRunCard : reprise/clôture d'une course interrompue (kill process).
 * Textes FR courts, vocabulaire zones/secteurs, anti-shame. Tokens uniquement.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Platform } from 'react-native';
import { colors, fontSizes, gameColors, iconSizes, radii, sizes, spacing, withAlpha } from '@klaim/shared';
import { C } from '../../../i18n/catalog/runGps';
import { useT } from '../../../i18n/store';
import type { Entry } from '../../../i18n/types';
import { Icon } from '../../../ui/Icon';
import { StatePill } from '../../../ui/game';
import type { GpsSignalState } from './engine/gps';
import { IOS_HELP_STEPS, VENDOR_HELP, currentVendorId } from './deviceHelp';

// ─── Pill d'état signal (s'EMPILE sous la pill principale, ne remplace jamais) ─

export function GpsSignalPill({
  signal,
  permissionRevoked,
  awaitingFirstFix = false,
  firstFixOverdue = false,
}: {
  signal: GpsSignalState;
  permissionRevoked: boolean;
  /** Aucune position n'est encore JAMAIS arrivée depuis le départ. */
  awaitingFirstFix?: boolean;
  /** …et l'attente dépasse le délai au-delà duquel le moteur parle de perte. */
  firstFixOverdue?: boolean;
}) {
  const t = useT();
  if (permissionRevoked) {
    return <StatePill state="rejected" label={t(C.signalRevoked)} />;
  }
  // ── Ne JAMAIS confondre « je cherche » et « j'ai perdu » ──────────────────
  // `signalState` renvoie 'lost' quand il n'y a aucun fix — y compris à la
  // seconde 0, avant toute position. L'écran affichait donc « RECHERCHE GPS… »
  // ET « Signal perdu » en même temps : un chargement présenté comme un échec.
  // Tant que l'attente est jeune, la pill principale (« RECHERCHE GPS… ») dit
  // déjà tout ; passé le délai, on nomme le VRAI état — rien n'est arrivé, ce
  // qui n'est pas la même chose qu'un signal perdu en route.
  if (awaitingFirstFix) {
    return firstFixOverdue ? <StatePill state="decay" label={t(C.signalNeverReceived)} /> : null;
  }
  if (signal === 'lost') {
    return <StatePill state="decay" label={t(C.signalLost)} />;
  }
  if (signal === 'weak') {
    return <StatePill state="decay" label={t(C.signalWeak)} />;
  }
  return null;
}

// ─── Bandeau précision approximative (iOS 14+ / Android coarse) ──────────────

/**
 * `onOpenSettings === null` : la plateforme n'a pas de réglages de position à
 * ouvrir (navigateur). On change alors la PHRASE — dire « active la position
 * exacte » à quelqu'un dont l'ordinateur se localise par wifi lui demande un
 * geste qui n'existe pas — et on retire le bouton plutôt que d'en afficher un
 * qui ne mène nulle part.
 */
export function PreciseLocationBanner({
  onOpenSettings,
}: {
  onOpenSettings: (() => void) | null;
}) {
  const t = useT();
  return (
    <View style={styles.banner}>
      <Icon name="gps" size={16} color={colors.chartreuse} />
      <Text style={styles.bannerText} numberOfLines={2}>
        {t(onOpenSettings === null ? C.preciseBannerBrowser : C.preciseBanner)}
      </Text>
      {onOpenSettings === null ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yOpenLocationSettings)}
          onPress={onOpenSettings}
          style={({ pressed }) => [styles.bannerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.bannerBtnText}>{t(C.btnSettings)}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Rationale background (permission progressive, une phrase) ───────────────

export function BackgroundRationaleCard({
  onAllow,
  onLater,
}: {
  onAllow: () => void;
  onLater: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t(C.bgTitle)}</Text>
      <Text style={styles.cardText}>{t(C.bgText)}</Text>
      <View style={styles.cardRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yAllowBackground)}
          onPress={onAllow}
          style={({ pressed }) => [styles.cardBtnMain, pressed && styles.pressed]}
        >
          <Text style={styles.cardBtnMainText}>{t(C.btnAllow)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yLater)}
          onPress={onLater}
          style={({ pressed }) => [styles.cardBtnGhost, pressed && styles.pressed]}
        >
          <Text style={styles.cardBtnGhostText}>{t(C.btnLater)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Reprise après kill : reprendre ou clôturer, jamais perdre ────────────────

export function RestoreRunCard({
  distanceLabel,
  onResume,
  onDiscard,
}: {
  /** Ex. « 3,42 km retrouvés ». */
  distanceLabel: string;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t(C.restoreTitle)}</Text>
      <Text style={styles.cardText}>{t(C.restoreQuestion, { distance: distanceLabel })}</Text>
      <View style={styles.cardRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yResumeInterrupted)}
          onPress={onResume}
          style={({ pressed }) => [styles.cardBtnMain, pressed && styles.pressed]}
        >
          <Text style={styles.cardBtnMainText}>{t(C.btnResume)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11ySaveInterrupted)}
          onPress={onDiscard}
          style={({ pressed }) => [styles.cardBtnGhost, pressed && styles.pressed]}
        >
          <Text style={styles.cardBtnGhostText}>{t(C.btnSave)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Aide « Courir écran éteint » (constructeurs Android + iOS) ───────────────

export function BackgroundHelpSheet({
  visible,
  onClose,
  onOpenSettings,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const t = useT();
  const vendorId = currentVendorId();
  const sections =
    Platform.OS === 'android'
      ? [...VENDOR_HELP].sort((a, b) => Number(b.id === vendorId) - Number(a.id === vendorId))
      : [];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Icon name="gps" size={iconSizes.md} color={colors.chartreuse} />
            <Text style={styles.sheetTitle}>{t(C.bgTitle)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.a11yCloseHelp)}
              onPress={onClose}
              style={({ pressed }) => [styles.sheetClose, pressed && styles.pressed]}
            >
              <Text style={styles.sheetCloseText}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetIntro}>{t(C.helpIntro)}</Text>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollInner}>
            {Platform.OS === 'ios' ? (
              <HelpSection title="iPhone" highlighted steps={IOS_HELP_STEPS} />
            ) : (
              sections.map((v) => (
                <HelpSection
                  key={v.id}
                  title={t(v.vendor)}
                  highlighted={v.id === vendorId}
                  steps={v.steps}
                />
              ))
            )}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.a11yOpenGrydSettings)}
            onPress={onOpenSettings}
            style={({ pressed }) => [styles.cardBtnMain, pressed && styles.pressed]}
          >
            <Text style={styles.cardBtnMainText}>{t(C.btnOpenGrydSettings)}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function HelpSection({
  title,
  steps,
  highlighted,
}: {
  title: string;
  steps: readonly Entry[];
  highlighted: boolean;
}) {
  const t = useT();
  return (
    <View style={[styles.helpSection, highlighted && styles.helpSectionActive]}>
      <View style={styles.helpHead}>
        <Text style={[styles.helpVendor, highlighted && styles.helpVendorActive]}>{title}</Text>
        {highlighted ? <Text style={styles.helpTag}>{t(C.helpYourPhone)}</Text> : null}
      </View>
      {steps.map((s) => (
        <Text key={s.fr} style={styles.helpStep}>
          · {t(s)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 360,
  },
  bannerText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700', flexShrink: 1 },
  bannerBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBtnText: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 1 },

  card: {
    backgroundColor: gameColors.carbon,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 8,
    maxWidth: 360,
    alignSelf: 'center',
  },
  cardTitle: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 1.6 },
  cardText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  cardRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  cardBtnMain: {
    backgroundColor: colors.chartreuse,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sizes.touchTarget,
  },
  cardBtnMainText: { color: colors.noir, fontSize: fontSizes.xs, fontWeight: '900', letterSpacing: 1 },
  cardBtnGhost: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sizes.touchTarget,
  },
  cardBtnGhostText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 1 },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: withAlpha(colors.noir, 0.85),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 10,
    maxHeight: '80%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '900',
    letterSpacing: 1.6,
    flex: 1,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  sheetCloseText: { color: colors.gris, fontSize: 14, fontWeight: '700' },
  sheetIntro: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 17 },
  sheetScroll: { flexGrow: 0 },
  sheetScrollInner: { gap: 8, paddingBottom: 4 },

  helpSection: {
    backgroundColor: gameColors.carbon,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 12,
    gap: 4,
  },
  helpSectionActive: { borderColor: colors.chartreuse40 },
  helpHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpVendor: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '800', flex: 1 },
  helpVendorActive: { color: colors.chartreuse },
  helpTag: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 1 },
  helpStep: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 17 },
});
