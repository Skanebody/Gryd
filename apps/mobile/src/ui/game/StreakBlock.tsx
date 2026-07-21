/**
 * GRYD — LOT 1 « LA SÉRIE VISIBLE » : le bloc de série, partagé par l'écran
 * Aujourd'hui et le résultat de course. UNE source visuelle, deux emplacements.
 *
 * §A (épuration) : un seul bloc, aucune card dans une card (surface plate posée
 * dans le flux), AUCUN CTA (l'unique CTA chartreuse de l'écran reste ailleurs),
 * ≤ 3 informations, compris en moins de 3 s. Le libellé n'est jamais tronqué :
 * les phrases s'enroulent sur plusieurs lignes plutôt que de couper.
 *
 * L'APP NE MENT JAMAIS : ce composant ne s'affiche QUE si l'appelant lui passe
 * un état réel. Il ne rend RIEN pour un `status: 'none'` — jamais un « 0 »
 * (voir features/social/streak.ts : pas de session → pas de bloc).
 *
 * ANTI-SHAME (§11) : une série rompue n'affiche AUCUN chiffre barré, aucun
 * « perdu ». Elle affiche « Une nouvelle série » + « elle démarre à ta prochaine
 * course », et rappelle le record comme une preuve de capacité.
 *
 * COULEURS : la chartreuse ne sert qu'à l'ACQUIS (une série qui court) et jamais
 * sur fond clair — le fond est `colors.carbone`. Une série rompue ou en
 * construction reste en blanc/gris : on ne met pas un accent d'alerte sur un
 * joueur qui a raté une semaine.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import type { StreakState } from '@klaim/shared';
import { Icon } from '../Icon';
import { formatMultiplier } from '../format';
import { C } from '../../i18n/catalog/streak';
import { useT } from '../../i18n/store';

/**
 * Ce dont le bloc a besoin — sous-ensemble structurel de `StreakState` (moteur)
 * pour accepter aussi le payload `streakAfter` d'ingest_run sans le dupliquer.
 */
export type StreakView = Pick<
  StreakState,
  'status' | 'weeks' | 'multiplier' | 'runsToValidate' | 'best'
>;

export interface StreakBlockProps {
  /** État RÉEL. `null` (ou status 'none') → le composant ne rend rien. */
  state: StreakView | null;
  /**
   * Résultat de course : la série AVANT la course. Si la semaine vient d'être
   * validée par cette course, on le dit explicitement.
   */
  weeksBefore?: number;
}

export function StreakBlock({ state, weeksBefore }: StreakBlockProps) {
  const t = useT();
  if (state === null || state.status === 'none') return null;

  const weeksLabel = state.weeks === 1
    ? t(C.streakWeeksOne)
    : t(C.streakWeeksMany, { n: state.weeks });

  // Une seule ligne de détail — la situation, jamais un jugement.
  const justValidated = weeksBefore !== undefined &&
    state.weeks > weeksBefore &&
    state.status === 'active';
  const detail = state.status === 'frozen'
    ? t(C.streakFrozen)
    : justValidated
      ? t(C.streakResultExtended)
      : state.status === 'active'
        ? t(C.streakActive, { m: formatMultiplier(state.multiplier).replace('×', '') })
        : state.status === 'atRisk'
          ? (state.runsToValidate === 1
              ? t(C.streakAtRiskOne)
              : t(C.streakAtRiskMany, { n: state.runsToValidate }))
          : state.status === 'building'
            ? (state.runsToValidate === 1
                ? t(C.streakBuildingOne)
                : t(C.streakBuildingMany, { n: state.runsToValidate }))
            : t(C.streakRestartBody);

  // Série rompue : AUCUN chiffre en grand (on n'affiche pas « 0 »), un titre qui
  // regarde devant, et le record comme preuve — jamais comme regret.
  if (state.status === 'broken') {
    const best = state.best === 1 ? t(C.streakBestOne) : t(C.streakBestMany, { n: state.best });
    return (
      <View
        accessibilityRole="summary"
        accessibilityLabel={`${t(C.streakRestartTitle)}. ${detail} ${best}`}
        style={styles.block}
      >
        <View style={styles.head}>
          <Icon name="serie" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.kicker}>{t(C.streakKicker)}</Text>
        </View>
        <Text style={styles.restartTitle}>{t(C.streakRestartTitle)}</Text>
        <Text style={styles.detail}>{detail}</Text>
        {state.best > 0 ? <Text style={styles.best}>{best}</Text> : null}
      </View>
    );
  }

  // Série en construction : pas encore de semaine validée → pas de chiffre non
  // plus (« 0 semaine » ne veut rien dire), seulement ce qu'il reste à faire.
  const showCount = state.weeks > 0;
  const accent = state.status === 'active' || state.status === 'frozen';

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={t(C.streakA11y, {
        weeks: showCount ? weeksLabel : t(C.streakRestartTitle),
        detail,
      })}
      style={styles.block}
    >
      <View style={styles.head}>
        <Icon
          name="serie"
          size={iconSizes.sm}
          color={accent ? colors.chartreuse : colors.gris}
        />
        <Text style={styles.kicker}>{t(C.streakKicker)}</Text>
      </View>
      {showCount ? (
        <Text style={[styles.count, accent && styles.countAccent]}>{weeksLabel}</Text>
      ) : null}
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  count: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xxs,
  },
  // Chartreuse UNIQUEMENT sur fond carbone (jamais sur fond clair — charte).
  countAccent: { color: colors.chartreuse },
  restartTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  detail: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
  },
  best: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.xxs },
});
