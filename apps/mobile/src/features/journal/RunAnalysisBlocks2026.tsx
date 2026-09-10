/**
 * GRYD — L'ANALYSE SPORTIVE D'UNE SORTIE : splits, courbe d'allure, altitude.
 * Le cahier G13 : « carte, statistiques puis splits et graphiques disponibles ».
 *
 * ═══ UN SEUL JEU DE BLOCS POUR DEUX ÉCRANS ══════════════════════════════════
 * `/course/[id]` (sortie archivée, châssis sombre) et `/course-result` (sortie
 * fraîche ou locale, surface claire du cahier) doivent raconter la MÊME chose
 * dans le MÊME ordre : c'est la « même grammaire » demandée. Deux implémentations
 * finiraient par diverger — l'une afficherait un split partiel comme un
 * kilomètre entier, l'autre pas, et personne ne le verrait avant un joueur.
 * Ce composant est donc unique et prend un `tone` : la palette change, la
 * grammaire non.
 *
 * ═══ CE QUI APPARAÎT, ET SEULEMENT S'IL EXISTE ══════════════════════════════
 *  · TEMPS — mouvement et écoulé, distingués (cahier §8.2). L'écoulé n'apparaît
 *    que s'il DIFFÈRE du temps de mouvement : deux fois le même chiffre sous
 *    deux libellés ferait croire à deux mesures.
 *  · SPLITS — un par kilomètre, le dernier marqué partiel avec sa distance
 *    réelle, le meilleur kilomètre ENTIER surligné.
 *  · COURBE — allure (course) ou vitesse (vélo), lissée, axe = distance.
 *  · ALTITUDE — seulement si la trace en porte. Aucune source GRYD n'en fournit
 *    aujourd'hui : ce bloc ne s'affichera pas, et c'est la vérité de l'app.
 * Sur une trace masquée (géométrie sans temps), aucun de ces blocs n'existe :
 * une phrase dit pourquoi, et rien n'est extrapolé de l'allure moyenne.
 */
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { fonts, fontSizes, spacing, type Activity } from '@klaim/shared';
import { LineChart } from '../../ui/charts/LineChart';
import type { ChartPoint } from '../../ui/charts/chartGeometry';
import { chartPalette, type ChartTone } from '../../ui/charts/palette';
import { decimalSeparator } from '../../ui/format';
import { useT } from '../../i18n/store';
import { C, journalRateCopy } from '../../i18n/catalog/journal';
import { formatClock, formatKm2, formatMeters, formatRate } from './format';
import {
  PACE_WINDOW_M,
  bestSplitIndex,
  elevationFrom,
  hasTiming,
  paceSeries,
  splitsFrom,
  traceTotals,
  type JournalPoint,
} from './metrics';

/** Écart minimal, en secondes, pour afficher le temps écoulé À CÔTÉ du mouvement. */
const ELAPSED_VISIBLE_GAP_S = 5;

export interface RunAnalysisBlocks2026Props {
  activity: Activity;
  /** La trace telle qu'elle a été LUE. Moins de deux points : rien à analyser. */
  points: readonly JournalPoint[];
  tone: ChartTone;
  testID?: string;
}

/**
 * ⚠ CE COMPOSANT NE DEMANDE PAS D'OÙ VIENT LA TRACE, IL LUI DEMANDE CE QU'ELLE
 * PORTE. Une trace masquée du serveur et une trace locale d'avant l'envoi n'ont
 * pas la même provenance mais le même manque : aucun horodatage. La question
 * qui décide de l'analyse est donc `hasTiming(points)`, pas une étiquette de
 * colonne — un jour où une troisième source arrivera, elle sera traitée juste
 * sans que personne ait à y penser.
 */
export function RunAnalysisBlocks2026({
  activity,
  points,
  tone,
  testID,
}: RunAnalysisBlocks2026Props) {
  const t = useT();
  const palette = chartPalette(tone);
  const sep = decimalSeparator();
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const timed = hasTiming(points);
  const analysis = useMemo(() => {
    if (!timed || points.length < 2) return null;
    return {
      totals: traceTotals(points, activity),
      splits: splitsFrom(points, activity),
      pace: paceSeries(points, activity),
      elevation: elevationFrom(points, activity),
    };
  }, [points, activity, timed]);

  // Trace sans horodatage (masquée par le serveur, ou pas encore envoyée) : la
  // carte existe, l'analyse non. On le dit une fois, on n'extrapole rien.
  if (!timed && points.length >= 2) {
    return (
      <Text style={[styles.note, { color: palette.muted }]} testID={testID}>
        {t(C.traceMaskedNoTiming)}
      </Text>
    );
  }
  if (analysis === null) return null;

  const { totals, splits, pace, elevation } = analysis;
  const best = bestSplitIndex(splits);
  const rateCopy = journalRateCopy(activity);
  const moving = formatClock(totals.movingS);
  const elapsed = totals.elapsedS === null ? null : formatClock(totals.elapsedS);
  const showElapsed =
    elapsed !== null &&
    totals.elapsedS !== null &&
    totals.elapsedS - totals.movingS >= ELAPSED_VISIBLE_GAP_S;

  // ── LA COURBE ────────────────────────────────────────────────────────────
  // L'axe des ordonnées porte l'ALLURE en secondes par km, y compris à vélo :
  // la conversion en km/h se fait au moment d'écrire les bornes, à partir de la
  // même mesure (`formatRate`), et l'inversion place le plus rapide en haut
  // dans les deux disciplines.
  const curve: ChartPoint[] = pace.map((sample) => ({
    x: sample.distanceM,
    y: sample.paceSPerKm,
  }));
  const fastest = pace.reduce<number | null>(
    (min, sample) => (min === null || sample.paceSPerKm < min ? sample.paceSPerKm : min),
    null,
  );
  const slowest = pace.reduce<number | null>(
    (max, sample) => (max === null || sample.paceSPerKm > max ? sample.paceSPerKm : max),
    null,
  );
  const fastLabel = formatRate(activity, fastest, sep);
  const slowLabel = formatRate(activity, slowest, sep);
  const totalKm = formatKm2(totals.distanceM / 1000, sep);

  // ── L'ALTITUDE ───────────────────────────────────────────────────────────
  const climb: ChartPoint[] = elevation.available
    ? elevation.samples.map((sample) => ({ x: sample.distanceM, y: sample.altM }))
    : [];

  return (
    <View style={styles.root} onLayout={onLayout} testID={testID}>
      {/* ── TEMPS : mouvement et écoulé ne se confondent pas ───────────────── */}
      {moving !== null ? (
        <View style={styles.timeRow}>
          <Measure label={t(C.movingTime)} value={moving} tone={tone} />
          {showElapsed && elapsed !== null ? (
            <Measure label={t(C.elapsedTime)} value={elapsed} tone={tone} />
          ) : null}
        </View>
      ) : null}

      {/* ── SPLITS ─────────────────────────────────────────────────────────── */}
      {splits.length > 0 ? (
        <View style={styles.block}>
          <Label tone={tone}>{t(C.splitsLabel)}</Label>
          <View style={styles.splitHeader}>
            <Text style={[styles.splitHeaderCell, styles.splitKm, { color: palette.muted }]}>
              {t(C.splitsColumnKm)}
            </Text>
            <Text style={[styles.splitHeaderCell, styles.splitBar, { color: palette.muted }]}>
              {t(rateCopy.average)}
            </Text>
            <Text style={[styles.splitHeaderCell, styles.splitValue, { color: palette.muted }]}>
              {t(C.splitsColumnTime)}
            </Text>
          </View>
          {splits.map((split) => {
            const isBest = split.index === best;
            const rate = formatRate(activity, split.paceSPerKm, sep);
            const time = formatClock(split.durationS);
            // Barre proportionnelle à la VITESSE relative du kilomètre : le
            // plus rapide est le plus long. Elle ne porte aucun chiffre neuf,
            // c'est la même mesure, vue d'un coup d'œil.
            const ratio =
              fastest !== null && split.paceSPerKm > 0
                ? Math.max(0.15, Math.min(1, fastest / split.paceSPerKm))
                : 0.15;
            return (
              <View
                key={split.index}
                style={styles.splitRow}
                accessible
                accessibilityLabel={[
                  `${t(C.splitsColumnKm)} ${split.index}`,
                  rate === null ? null : `${rate.value} ${rate.unit}`,
                  split.complete ? null : t(C.splitsPartial, { m: formatMeters(split.distanceM) ?? '' }),
                  isBest ? t(C.splitsBest) : null,
                ]
                  .filter((part): part is string => part !== null)
                  .join(', ')}
              >
                <View style={styles.splitKm}>
                  <Text style={[styles.splitIndex, { color: palette.ink }]}>{split.index}</Text>
                  {!split.complete ? (
                    <Text style={[styles.splitPartial, { color: palette.muted }]} numberOfLines={1}>
                      {t(C.splitsPartial, { m: formatMeters(split.distanceM) ?? '' })}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.splitBar, styles.barTrack, { backgroundColor: palette.track }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(ratio * 100)}%`,
                        backgroundColor: isBest ? palette.accent : palette.neutral,
                      },
                    ]}
                  />
                </View>
                <View style={styles.splitValue}>
                  <Text style={[styles.splitRate, { color: palette.ink }]}>
                    {rate === null ? '' : rate.value}
                  </Text>
                  {time !== null ? (
                    <Text style={[styles.splitTime, { color: palette.muted }]}>{time}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
          {best !== null ? (
            <Text style={[styles.note, { color: palette.muted }]}>
              {`${t(C.splitsBest)} · ${best}`}
            </Text>
          ) : null}
          <Text style={[styles.note, { color: palette.muted }]}>{t(C.splitsNote)}</Text>
        </View>
      ) : null}

      {/* ── COURBE D'ALLURE / DE VITESSE ───────────────────────────────────── */}
      {curve.length >= 2 && fastLabel !== null && slowLabel !== null ? (
        <View style={styles.block}>
          {/* L'unité vit dans le titre, pas sur l'axe : « 5’28 min/km » répété
              deux fois dans une gouttière de 52 pt serait tronqué, et §A
              interdit une troncature. */}
          <View style={styles.blockHead}>
            <Label tone={tone}>{t(rateCopy.curve)}</Label>
            <Text style={[styles.note, { color: palette.muted }]}>{fastLabel.unit}</Text>
          </View>
          <LineChart
            points={curve}
            width={width}
            tone={tone}
            invertY
            topLabel={fastLabel.value}
            bottomLabel={slowLabel.value}
            startLabel="0"
            {...(totalKm === null ? {} : { endLabel: `${totalKm} km` })}
            a11yLabel={t(C.paceCurveA11y, {
              km: totalKm === null ? '' : `${totalKm} km`,
              best: `${fastLabel.value} ${fastLabel.unit}`,
              worst: `${slowLabel.value} ${slowLabel.unit}`,
            })}
            testID="run-pace-curve"
          />
          <Text style={[styles.note, { color: palette.muted }]}>
            {t(C.paceCurveNote, { m: PACE_WINDOW_M })}
          </Text>
        </View>
      ) : null}

      {/* ── ALTITUDE — seulement si la trace en porte ───────────────────────── */}
      {elevation.available && climb.length >= 2 ? (
        <View style={styles.block}>
          <Label tone={tone}>{t(C.elevationLabel)}</Label>
          <View style={styles.timeRow}>
            <Measure
              label={t(C.elevationGain)}
              value={`${Math.round(elevation.gainM)} m`}
              tone={tone}
            />
            <Measure
              label={t(C.elevationLoss)}
              value={`${Math.round(elevation.lossM)} m`}
              tone={tone}
            />
          </View>
          <LineChart
            points={climb}
            width={width}
            tone={tone}
            topLabel={`${Math.round(elevation.maxM ?? 0)} m`}
            bottomLabel={`${Math.round(elevation.minM ?? 0)} m`}
            a11yLabel={t(C.elevationA11y, {
              min: `${Math.round(elevation.minM ?? 0)} m`,
              max: `${Math.round(elevation.maxM ?? 0)} m`,
            })}
            testID="run-elevation-profile"
          />
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Label({ children, tone }: { children: string; tone: ChartTone }) {
  const palette = chartPalette(tone);
  return <Text style={[styles.label, { color: palette.muted }]}>{children}</Text>;
}

function Measure({ label, value, tone }: { label: string; value: string; tone: ChartTone }) {
  const palette = chartPalette(tone);
  return (
    <View style={styles.measure}>
      <Text style={[styles.measureValue, { color: palette.ink }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.measureLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xl },
  block: { gap: spacing.sm },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: {
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  note: { fontFamily: fonts.text, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.6 },

  timeRow: { flexDirection: 'row', gap: spacing.lg },
  measure: { flex: 1, gap: spacing.xxs },
  measureValue: {
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  measureLabel: { fontFamily: fonts.text, fontSize: fontSizes.xs },

  splitHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  splitHeaderCell: { fontFamily: fonts.text, fontSize: fontSizes.xs },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 34 },
  splitKm: { width: 56 },
  splitIndex: {
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: fontSizes.sm,
    fontVariant: ['tabular-nums'],
  },
  splitPartial: { fontFamily: fonts.text, fontSize: fontSizes.xs },
  splitBar: { flex: 1 },
  barTrack: { height: 10, borderRadius: 5, overflow: 'hidden', justifyContent: 'center' },
  barFill: { height: 10, borderRadius: 5 },
  splitValue: { width: 76, alignItems: 'flex-end' },
  splitRate: {
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: fontSizes.sm,
    fontVariant: ['tabular-nums'],
  },
  splitTime: { fontFamily: fonts.text, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
});
