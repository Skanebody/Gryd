/**
 * GRYD — E26 « FIN D'ACTIVITÉ » : la feuille basse INTERMÉDIAIRE.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1234-1252.)
 *
 * Elle s'intercale entre l'ARRÊT et le RÉSULTAT : temps, distance, objectif
 * détecté, `TERMINER ET ANALYSER`, `REPRENDRE`. Rien d'autre — §A : un écran,
 * une décision, un seul CTA chartreuse.
 *
 * ═══ « REPRENDRE » NE PEUT RIEN PERDRE, ET CE N'EST PAS UNE PROMESSE ════════
 * Cette feuille s'ouvre AVANT `RealRunApi.finish()`. Tant qu'elle est là, la
 * sortie est en PAUSE UTILISATEUR : le tracker vit, la trace est en mémoire et
 * sur le disque (autosave `run_autosave`, reprise après kill par
 * `gps/crashRecovery.ts`). `REPRENDRE` ne restaure rien — il lève la pause. Le
 * raisonnement complet est dans `finishModel.ts`.
 *
 * ═══ LA CONFIRMATION N'APPARAÎT QUE SOUS LE PLANCHER §3.2 ══════════════════
 * Spec l.1194 : « `Terminer` demande confirmation uniquement si l'activité est
 * trop courte pour produire un résultat ». Le test est `activityProducesResult`
 * (game-rules) — les MÊMES minima que le serveur, jamais un troisième seuil.
 * Et la confirmation ne BLOQUE pas : « Terminer quand même » existe, parce
 * qu'une sortie écourtée (blessure, fatigue) n'est pas une faute.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Activity, colors, fontSizes, radii, sizes, spacing, withAlpha } from '@klaim/shared';
import { Pressable } from 'react-native';
import { C } from '../../../i18n/catalog/finActivite';
import { useT } from '../../../i18n/store';
import type { Entry } from '../../../i18n/types';
import { formatClock, formatKm } from '../simulation';
import type { FinishObjective } from './finishModel';

/** Objectif détecté → libellé. Aucun défaut « plausible » : `unknown` existe. */
const OBJECTIVE_LABEL: Record<FinishObjective, Entry> = {
  conquest: C.objectiveConquest,
  defense: C.objectiveDefense,
  free: C.objectiveFree,
  unknown: C.objectiveUnknown,
};

export interface FinishSheetProps {
  readonly visible: boolean;
  /** Discipline RÉELLE de la sortie (figée au départ). */
  readonly activity: Activity;
  readonly distanceM: number;
  readonly durationS: number;
  readonly objective: FinishObjective;
  /** `false` ⇒ `TERMINER` passe d'abord par la confirmation (spec l.1194). */
  readonly producesResult: boolean;
  /** Finalise et ouvre l'analyse (E27). */
  readonly onFinish: () => void;
  /** Lève la pause : la sortie repart où elle en était. */
  readonly onResume: () => void;
  /**
   * La finalisation est EN COURS (arrêt des capteurs + envoi). Les deux
   * commandes se désarment le temps que ça dure : un second tap sur
   * `TERMINER` pendant l'envoi n'a aucun effet utile, et `REPRENDRE` après un
   * `finish()` déjà lancé serait un bouton mort.
   */
  readonly busy: boolean;
}

export function FinishSheet({
  visible,
  activity,
  distanceM,
  durationS,
  objective,
  producesResult,
  onFinish,
  onResume,
  busy,
}: FinishSheetProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    // Pas de `Modal` : la feuille est POSÉE sur l'activité, qui reste visible
    // derrière (spec : « feuille basse »). Le voile ne masque pas la carte.
    <View style={styles.overlay} accessibilityLabel={t(C.a11ySheet)}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.title}>{t(C.title)}</Text>

        {/* Les deux mesures, à plat — jamais une card dans une card (§A). */}
        <View style={styles.metrics}>
          <Metric label={t(C.timeLabel)} value={formatClock(durationS)} />
          <View style={styles.divider} />
          <Metric label={t(C.distanceLabel)} value={formatKm(distanceM)} unit="KM" />
        </View>

        <View style={styles.objectiveRow}>
          <Text style={styles.objectiveLabel}>{t(C.objectiveLabel)}</Text>
          <Text style={styles.objectiveValue} numberOfLines={1}>
            {t(OBJECTIVE_LABEL[objective])}
          </Text>
        </View>

        {/* Le plancher §3.2, DIT AVANT de terminer — jamais après coup, et
            jamais chiffré (le seuil exact inviterait à courir « juste ce qu'il
            faut »). Le CTA reste actif : on informe, on n'empêche pas. */}
        {!producesResult ? (
          <View style={styles.tooShort}>
            <Text style={styles.tooShortTitle}>{t(C.tooShortTitle)}</Text>
            <Text style={styles.tooShortBody}>{t(C.tooShortBody)}</Text>
          </View>
        ) : null}

        {/* L'UNIQUE chartreuse de la feuille (§A4). Son libellé change quand la
            sortie est sous le plancher : « Terminer quand même » dit exactement
            ce que le tap fait, au lieu de promettre une analyse qui n'aura pas
            de verdict. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(producesResult ? C.finishA11y : C.tooShortConfirm)}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onFinish}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Text style={styles.ctaText} numberOfLines={1}>
            {t(producesResult ? C.finishCta : C.tooShortConfirm)}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(producesResult ? C.resumeA11y : C.tooShortCancel)}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onResume}
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Text style={styles.ghostText} numberOfLines={1}>
            {t(producesResult ? C.resumeCta : C.tooShortCancel)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: withAlpha(colors.noir, 0.55),
  },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.cardPadding,
    gap: spacing.sm,
  },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800' },

  metrics: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  metric: { flex: 1, gap: 2 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.grisLigne },
  metricValue: {
    color: colors.blanc,
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricUnit: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  metricLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  objectiveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  objectiveLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  objectiveValue: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },

  tooShort: { gap: 4 },
  tooShortTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '800' },
  tooShortBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },

  cta: {
    minHeight: sizes.buttonLg,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  // Chartreuse = fond, texte NOIR (jamais de chartreuse sur clair — charte).
  ctaText: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '900', letterSpacing: 0.5 },
  ghost: {
    minHeight: sizes.buttonMd,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  ghostText: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
});
