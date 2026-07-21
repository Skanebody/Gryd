/**
 * GRYD — briques d'affichage de la page Performance (AMENDEMENT-17 CHANTIER 3).
 * Résumé + détail : l'ESSENTIEL (Cette semaine) tient au-dessus du fold ; le
 * reste (Progression · Records · Verify) est du détail plus bas. Style dark
 * GRYD, accent chartreuse, texte court, cards compactes. Purement présentiel —
 * aucune constante de jeu, aucun réseau.
 *
 * MISE À JOUR 21/07/2026 (fin du mode vitrine) — ces briques ne servent plus
 * qu'UNE page : l'app réelle, alimentée par `derive.ts` (les courses du joueur).
 * Les props sont NULLABLES (`distancePct`, `paceGainSKm`, objectif hebdo) : un
 * signal sans source ne s'affiche pas, il ne s'invente pas.
 *
 * `ScoreFormeHero`, `GrydImpactCard` et `ImpactStat` ont été SUPPRIMÉS : ils
 * n'étaient rendus que par la vitrine et affichaient un « score de forme » et un
 * « impact GRYD » qu'AUCUNE source réelle n'alimente (cf. l'en-tête de
 * `derive.ts`). Sans vitrine, ils n'avaient plus d'appelant — et un score
 * fabriqué sur la page Performance d'un joueur est précisément ce que la règle
 * « l'app ne ment jamais » interdit. Ils reviendront si un jour un vrai calcul
 * les alimente.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { ProgressBar } from '../../ui/ProgressBar';
import { useCountUp } from '../../ui/game';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/performance';
import type { GrydImpactStat, PerfRecord, TrendPoint } from './demo';

// ─────────────────────────────────────────────────────────────────────────────
// HÉROS — Score Forme géant /100 + delta + interprétation (anti-shame)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CETTE SEMAINE — 4 chiffres compacts + jauge objectif hebdo
// ─────────────────────────────────────────────────────────────────────────────

function WeekStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.weekStat}>
      <Text style={styles.weekValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.weekLabel}>{label}</Text>
    </View>
  );
}

/**
 * Cette semaine. `goal` est OPTIONNEL et n'existe que sur la vitrine : le joueur
 * n'a jamais fixé d'objectif hebdomadaire, afficher « 3/4 » le mettait en échec
 * sur une consigne qu'il n'a pas donnée.
 *
 * Une semaine à zéro n'est PAS un vide à masquer : c'est lundi matin, et c'est
 * vrai. On affiche les quatre compteurs à 0 + une ligne qui le dit sans
 * culpabiliser (anti-shame) — jamais un « 0 » nu et muet.
 */
export function WeekCard({
  runs,
  km,
  duration,
  pace,
  goal,
}: {
  runs: number;
  km: string;
  duration: string;
  pace: string;
  goal?: { done: number; target: number };
}) {
  const t = useT();
  const ratio = goal && goal.target > 0 ? goal.done / goal.target : 0;
  return (
    <View style={styles.card}>
      <SectionTitle icon="foulees" label={t(C.weekTitle)} />
      <View style={styles.weekRow}>
        <WeekStat value={String(runs)} label={t(C.weekRuns)} />
        <View style={styles.weekSep} />
        <WeekStat value={km} label={t(C.weekKm)} />
        <View style={styles.weekSep} />
        <WeekStat value={duration} label={t(C.weekDuration)} />
        <View style={styles.weekSep} />
        <WeekStat value={pace} label={t(C.weekPace)} />
      </View>
      {goal ? (
        <View style={styles.goalWrap}>
          <View style={styles.goalHead}>
            <Text style={styles.goalLabel}>{t(C.weeklyGoal)}</Text>
            <Text style={styles.goalCount}>
              {goal.done}/{goal.target}
            </Text>
          </View>
          <ProgressBar value={ratio} height={8} />
        </View>
      ) : runs === 0 ? (
        <Text style={styles.cardNote}>{t(C.weekNoRun)}</Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPACT GRYD — le cœur du jeu (au-dessus du fold) : 4 stats + ligne crew
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION — 3 signaux + UN mini-graph (barres, pas 15 courbes)
// ─────────────────────────────────────────────────────────────────────────────

function TrendBars({ points }: { points: readonly TrendPoint[] }) {
  const max = Math.max(...points.map((p) => p.km), 1);
  return (
    <View style={styles.trendWrap}>
      <View style={styles.trendBars}>
        {points.map((p, i) => {
          const last = i === points.length - 1;
          return (
            <View key={p.label} style={styles.trendCol}>
              <View style={styles.trendBarTrack}>
                <View
                  style={[
                    styles.trendBarFill,
                    { height: `${Math.round((p.km / max) * 100)}%` },
                    last && styles.trendBarFillLast,
                  ]}
                />
              </View>
              <Text style={[styles.trendLabel, last && styles.trendLabelLast]} numberOfLines={1}>
                {p.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ProgressSignal({
  value,
  label,
  good,
}: {
  value: string;
  label: string;
  good: boolean;
}) {
  return (
    <View style={styles.signal}>
      <Text style={[styles.signalValue, good && styles.signalValueGood]}>{value}</Text>
      <Text style={styles.signalLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Progression. `distancePct` et `paceGainSKm` sont NULLABLES : sans semaine
 * précédente à comparer, il n'existe aucune progression à afficher — on retire
 * le signal plutôt que d'écrire « +0 % », qui se lirait « tu stagnes ».
 * La régularité, elle, est toujours vraie (0 semaine est une réponse).
 */
export function ProgressionCard({
  distancePct,
  paceGainSKm,
  regularityWeeks,
  trend,
}: {
  distancePct: number | null;
  paceGainSKm: number | null;
  regularityWeeks: number;
  trend: readonly TrendPoint[];
}) {
  const t = useT();
  const signals: { key: string; value: string; label: string; good: boolean }[] = [];
  if (distancePct !== null) {
    signals.push({
      key: 'distance',
      value: `${distancePct > 0 ? '+' : ''}${distancePct} %`,
      label: t(C.signalDistance),
      good: distancePct > 0,
    });
  }
  if (paceGainSKm !== null && paceGainSKm !== 0) {
    // Gain positif = plus rapide → on l'écrit en secondes ÔTÉES (« -8 s/km »).
    signals.push({
      key: 'pace',
      value: `${paceGainSKm > 0 ? '-' : '+'}${Math.abs(paceGainSKm)} s/km`,
      label: t(C.signalPace),
      good: paceGainSKm > 0,
    });
  }
  signals.push({
    key: 'regularity',
    value: t(C.weeksShort, { n: regularityWeeks }),
    label: t(C.signalRegularity),
    good: regularityWeeks >= 3,
  });

  return (
    <View style={styles.card}>
      <SectionTitle icon="performance" label={t(C.progressionTitle)} />
      <View style={styles.signalRow}>
        {signals.map((s, i) => (
          <View key={s.key} style={styles.signalSlot}>
            {i > 0 ? <View style={styles.weekSep} /> : null}
            <ProgressSignal value={s.value} label={s.label} good={s.good} />
          </View>
        ))}
      </View>
      <TrendBars points={trend} />
      {signals.length === 1 ? (
        <Text style={styles.cardNote}>{t(C.progressionNeedsHistory)}</Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORDS — 4 records compacts (2 colonnes)
// ─────────────────────────────────────────────────────────────────────────────

function RecordCell({ record }: { record: PerfRecord }) {
  return (
    <View style={styles.recordCell}>
      <View style={styles.recordHead}>
        <Text style={styles.recordLabel} numberOfLines={1}>
          {record.label}
        </Text>
        {record.fresh ? <View style={styles.recordFresh} /> : null}
      </View>
      <Text style={styles.recordValue} numberOfLines={1}>
        {record.value}
      </Text>
      {record.meta ? (
        <Text style={styles.recordMeta} numberOfLines={1}>
          {record.meta}
        </Text>
      ) : null}
    </View>
  );
}

export function RecordsCard({
  records,
  title,
}: {
  records: readonly PerfRecord[];
  /** Titre déjà traduit — la card est partagée app réelle / vitrine. */
  title: string;
}) {
  // Aplati (AMENDEMENT-22 §A) : les records sont posés sur l'espace de la card,
  // séparés par des filets hairline (colonnes façon WeekCard, rangées façon
  // Skills) — jamais une boîte bordée par cellule. UN seul niveau de boîte.
  const rows: { a: PerfRecord; b?: PerfRecord }[] = [];
  for (let i = 0; i < records.length; i += 2) {
    const a = records[i];
    if (!a) continue;
    rows.push({ a, b: records[i + 1] });
  }
  return (
    <View style={styles.card}>
      <SectionTitle icon="cible" label={title} />
      <View style={styles.recordGrid}>
        {rows.map((row, ri) => (
          <View key={row.a.key} style={[styles.recordRow, ri > 0 && styles.recordRowSep]}>
            <RecordCell record={row.a} />
            <View style={styles.recordColSep} />
            {row.b ? <RecordCell record={row.b} /> : <View style={styles.recordCell} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRYD VERIFY — score fiabilité + canaux, lien vers /sources
// ─────────────────────────────────────────────────────────────────────────────

export function VerifyCard({
  reliablePct,
  channels,
  meta,
}: {
  reliablePct: number;
  /** Canaux réellement présents en base — déjà traduits par l'appelant. */
  channels: readonly string[];
  /** Dénominateur (« sur 12 courses ») quand il est connu. */
  meta?: string;
}) {
  const t = useT();
  const sub = [meta, channels.join(' · ')].filter(Boolean).join(' · ');
  return (
    <View style={[styles.card, styles.verifyCard]}>
      <View style={styles.verifyHead}>
        <View style={styles.verifyIcon}>
          <Icon name="radar" size={18} color={gameColors.verify} />
        </View>
        <View style={styles.verifyText}>
          <Text style={styles.verifyStrong}>
            <Text style={styles.verifyPct}>{reliablePct} %</Text> {t(C.verifyReliable)}
          </Text>
          {sub ? <Text style={styles.verifyMeta}>{sub}</Text> : null}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Titre de section commun
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({
  icon,
  label,
  accent,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Icon name={icon} size={16} color={accent ? colors.chartreuse : colors.gris} />
      <Text style={[styles.sectionTitleText, accent && styles.sectionTitleAccent]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Card générique compacte ──
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 14,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitleText: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  sectionTitleAccent: { color: colors.chartreuse },
  /** Note de bas de card : dit ce qui manque, sans culpabiliser (anti-shame). */
  cardNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
  },

  // ── Héros Score Forme ──
  hero: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    paddingVertical: 24,
    paddingHorizontal: spacing.cardPadding,
    alignItems: 'center',
    gap: 4,
  },
  heroKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroNumberRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroNumber: {
    color: colors.blanc,
    fontSize: fontSizes.hero,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    lineHeight: fontSizes.hero,
  },
  heroDenom: {
    color: colors.gris,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginLeft: 4,
  },
  heroDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  // Le tracé « virage » pointe vers le haut-droite → ok pour « en hausse ».
  mirrorMaybe: {},
  heroDelta: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  heroDeltaUp: { color: colors.chartreuse },
  heroReading: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },

  // ── Cette semaine ──
  weekRow: { flexDirection: 'row', alignItems: 'stretch' },
  weekStat: { flex: 1, alignItems: 'center', gap: 3 },
  weekValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  weekLabel: { color: colors.gris, fontSize: fontSizes.xs },
  weekSep: { width: 1, backgroundColor: colors.grisLigne, marginVertical: 2 },
  goalWrap: { gap: 8 },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  goalCount: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // ── Impact GRYD ──
  impactCard: { borderColor: colors.chartreuse40 },
  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  impactStat: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  impactIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chartreuse14,
  },
  impactValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  impactLabel: { flex: 1, color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.3 },
  crewLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: 12,
  },
  crewLineText: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '700' },

  // ── Progression ──
  signalRow: { flexDirection: 'row', alignItems: 'stretch' },
  /** Un signal + son filet de gauche : les colonnes restent de largeur égale
   *  quel que soit le nombre de signaux réellement disponibles (1 à 3). */
  signalSlot: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  signal: { flex: 1, alignItems: 'center', gap: 3 },
  signalValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  signalValueGood: { color: colors.chartreuse },
  signalLabel: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },
  trendWrap: { marginTop: 2 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 96 },
  trendCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' },
  trendBarTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: colors.carbone2,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: colors.chartreuse40,
    borderRadius: 8,
  },
  trendBarFillLast: { backgroundColor: colors.chartreuse },
  trendLabel: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  trendLabelLast: { color: colors.blanc, fontWeight: '700' },

  // ── Records (aplati : filets hairline, aucun cadre par cellule) ──
  recordGrid: {},
  recordRow: { flexDirection: 'row', alignItems: 'stretch' },
  recordRowSep: { borderTopWidth: 1, borderTopColor: colors.grisLigne },
  recordColSep: { width: 1, backgroundColor: colors.grisLigne, marginVertical: 12 },
  recordCell: {
    flex: 1,
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  recordHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  recordFresh: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.chartreuse },
  recordValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  recordMeta: { color: colors.gris, fontSize: fontSizes.xs },

  // ── Verify ──
  verifyCard: { borderColor: gameColors.verifySoft },
  verifyHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifyIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: gameColors.verify,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyText: { flex: 1, gap: 2 },
  verifyStrong: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  verifyPct: { color: gameColors.verify, fontWeight: '800' },
  verifyMeta: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
});
