/**
 * GRYD — STATISTIQUES SPORTIVES (/performance, cahier G25).
 *
 * ═══ CE QUE LE CAHIER DEMANDE, ET CE QUI MANQUAIT ═══════════════════════════
 * G25 : « Période puis sport. Distance, temps et fréquence de sortie ; sous ce
 * résumé, évolution lisible, splits et relief. »
 *
 * L'écran tenait la première phrase (trois compteurs, un histogramme par jour)
 * et pas la seconde : aucune ÉVOLUTION n'y était lisible. Sur 7 ou 28 jours, on
 * voit ses dernières séances, pas sa trajectoire. Deux graphiques arrivent donc
 * ici, tous deux dessinés en SVG (`react-native-svg` est déjà embarqué — zéro
 * dépendance nouvelle) et alimentés par des séries PURES et testées
 * (`features/journal/statsSeries.ts`) :
 *   · DISTANCE PAR SEMAINE sur huit semaines — une semaine sans sortie y vaut
 *     0 km et garde sa place : c'est ce qui rend une régularité visible ;
 *   · ALLURE (ou VITESSE) MOYENNE PAR SORTIE — une sortie sans allure mesurée
 *     est ABSENTE de la courbe, jamais interpolée entre ses voisines.
 * Les splits et le relief, eux, appartiennent à UNE sortie : ils vivent dans son
 * détail (`/course/[id]`), pas dans un agrégat.
 *
 * ═══ LA GÉOMÉTRIE NE VIT PLUS DANS LE JSX ══════════════════════════════════
 * L'histogramme par jour calculait sa hauteur en clair : `day.km / chartMax *
 * 112`, avec `chartMax = Math.max(...jours, 1)`. Une journée à 0,3 km dessinait
 * donc presque un tiers du graphique (le plancher de 1 km s'appliquait au
 * MAXIMUM, pas à l'échelle), et un jour sans sortie ne dessinait rien — il
 * disparaissait de l'axe. Les deux sont fermés par `ui/charts` (base zéro,
 * hauteur minimale d'une barre vide), testé sous Deno.
 *
 * ═══ LES ÉTATS RESTENT DISTINCTS ════════════════════════════════════════════
 * Pas connecté · lecture · échec · lu-et-vide : quatre écrans différents, aucun
 * repli. Un compte sans sortie ne voit pas « 0 km » sous un graphique vide : il
 * voit une phrase qui dit que la place est là.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c, type Activity } from '@klaim/shared';
import { GrydIcon } from '../../ui/gryd';
import { BarChart } from '../../ui/charts/BarChart';
import { LineChart } from '../../ui/charts/LineChart';
import type { ChartPoint } from '../../ui/charts/chartGeometry';
import { useLocale, useT } from '../../i18n/store';
import { C as JC, sessionCurveTitle } from '../../i18n/catalog/journal';
import { decimalSeparator } from '../../ui/format';
import { formatRate } from '../journal/format';
import { STATS_SESSIONS, STATS_WEEKS } from '../journal/display';
import { bestWeekIndex, sessionPaces, weeklyDistance } from '../journal/statsSeries';
import { screen } from '../../lib/analytics';
import { useProfileJournal } from './ProfileJournal';
import { ProfileButton, ProfileLink, ProfilePage, ProfileSegments, useRefonteCopy } from './ProfilePrimitives';

export function ProfileStatsScreen() {
  const copy = useRefonteCopy();
  const t = useT();
  const locale = useLocale();
  const sep = decimalSeparator();
  const [activity, setActivity] = useState<Activity>('run');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const journal = useProfileJournal(activity);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  useEffect(() => { screen('performance'); }, []);
  const countDays = period === 'week' ? 7 : 28;
  const days = useMemo(() => Array.from({ length: countDays }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - countDays + 1 + index);
    const end = new Date(date); end.setDate(end.getDate() + 1);
    const runs = journal.runs.filter(run => run.startedAtMs >= date.getTime() && run.startedAtMs < end.getTime());
    return { date, km: runs.reduce((sum, run) => sum + run.km, 0), seconds: runs.reduce((sum, run) => sum + run.durationS, 0), runs: runs.length, pending: runs.some(run => run.pending) };
  }), [journal.runs, countDays]);
  const km = days.reduce((sum, day) => sum + day.km, 0);
  const seconds = days.reduce((sum, day) => sum + day.seconds, 0);
  const outings = days.reduce((sum, day) => sum + day.runs, 0);
  // « jours avec sortie » : compté ICI, sur le journal. Ce n'est PAS la journée
  // active du serveur (≥ 10 min de mouvement admissible, §7.1) affichée dans le
  // Profil — deux mesures différentes ne partagent plus le même mot.
  const activeDays = days.filter(day => day.runs > 0).length;
  const format = (value: number, maximumFractionDigits = 1) => value.toLocaleString(locale, { maximumFractionDigits });
  const latestActiveDay = days.reduce((last, day, index) => day.runs > 0 ? index : last, days.length - 1);
  const selectedIndex = days.findIndex(day => day.date.toISOString() === selectedDate);
  const highlightedDay = selectedIndex >= 0 ? selectedIndex : latestActiveDay;
  const selected = days[highlightedDay];

  // ── ÉVOLUTION : les deux séries du cahier G25 ─────────────────────────────
  // `Date.now()` est lu ICI et passé aux fonctions pures : elles n'ont pas
  // d'horloge, ce qui les rend testables (même contrat que `groupRunsByWeek`).
  const weeks = useMemo(
    () => weeklyDistance(journal.runs, Date.now(), STATS_WEEKS),
    [journal.runs],
  );
  const bestWeek = bestWeekIndex(weeks);
  const paces = useMemo(() => sessionPaces(journal.runs, STATS_SESSIONS), [journal.runs]);
  const curve: ChartPoint[] = paces.map((session, index) => ({ x: index, y: session.paceSPerKm }));
  const fastest = paces.reduce<number | null>((min, s) => min === null || s.paceSPerKm < min ? s.paceSPerKm : min, null);
  const slowest = paces.reduce<number | null>((max, s) => max === null || s.paceSPerKm > max ? s.paceSPerKm : max, null);
  const fastLabel = formatRate(activity, fastest, sep);
  const slowLabel = formatRate(activity, slowest, sep);
  const shortDate = (ms: number) => new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const weekLabel = (ms: number) => new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return <ProfilePage tone="light" title={copy('Statistiques', 'Statistics')} back>
    <View style={local.filters}><View style={local.sport}><ProfileSegments tone="light" value={activity} onChange={value => { setActivity(value); setSelectedDate(null); }} options={[{ key: 'run', label: copy('Course', 'Run') }, { key: 'bike', label: copy('Vélo', 'Ride') }]} /></View><View style={local.period}><ProfileSegments tone="light" value={period} onChange={value => { setPeriod(value); setSelectedDate(null); }} options={[{ key: 'week', label: copy('7 jours', '7 days') }, { key: 'month', label: copy('28 jours', '28 days') }]} /></View></View>
    {journal.status === 'loading' ? <View style={local.state}><ActivityIndicator size="small" color={c.ink} /><Text style={local.meta}>{copy('Lecture des sorties…', 'Loading activities…')}</Text></View> : journal.status === 'failed' ? <View style={local.empty}><Text style={local.meta}>{copy('Les sorties n’ont pas pu être chargées.', 'Your activities could not be loaded.')}</Text><View style={local.compactAction}><ProfileButton tone="light" label={copy('Réessayer', 'Retry')} secondary onPress={journal.reload} /></View></View> : journal.status === 'signed-out' ? <View style={local.empty}><Text style={local.emptyTitle}>{copy('Tes sorties, en chiffres.', 'Your activities, in numbers.')}</Text><Text style={local.meta}>{copy('Distance, durée et jours avec sortie apparaîtront après ta première sortie.', 'Distance, duration and days with an outing appear after your first activity.')}</Text><View style={local.compactAction}><ProfileButton tone="light" label={copy('Ouvrir la carte', 'Open map')} onPress={() => router.push('/(tabs)')} /></View></View> : <>
      <View style={local.overview}><View style={local.heroHeading}><Text style={local.heroMeta}>{copy('Distance enregistrée', 'Recorded distance')}</Text><GrydIcon name="route" size={20} color={c.accent} /></View><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={local.big}>{format(km)}<Text style={local.unit}> km</Text></Text><Text style={local.heroMeta}>{days[0] ? shortDate(days[0].date.getTime()) : ''} · {days[days.length - 1] ? shortDate(days[days.length - 1]!.date.getTime()) : ''}</Text></View>
      <View style={local.numbers}>
        <View style={local.numberCard}><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={local.number}>{Math.round(seconds / 60)}</Text><Text style={local.meta}>min</Text></View>
        <View style={local.numberCard}><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={local.number}>{outings}</Text><Text style={local.meta}>{copy('sorties', 'outings')}</Text></View>
        <View style={local.numberCard}><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={local.number}>{activeDays}</Text><Text style={local.meta}>{t(JC.activeDays)}</Text></View>
      </View>
      {outings > 0 ? <View style={local.chartSection} onLayout={onLayout}>
        <View style={local.chartHeading}><Text style={local.sectionTitle}>{copy('Distance par jour', 'Daily distance')}</Text><Text style={local.meta}>km</Text></View>
        <BarChart
          values={days.map(day => day.km)}
          {...(period === 'week' ? { labels: days.map(day => day.date.toLocaleDateString(locale, { weekday: 'narrow' })) } : {})}
          a11yLabels={days.map(day => `${day.date.toLocaleDateString(locale)} : ${format(day.km)} km`)}
          highlight={highlightedDay}
          width={Math.max(0, width - 32)}
          tone="light"
          a11yLabel={copy(`Distance sur ${countDays} jours : ${format(km)} kilomètres. ${activeDays} journées avec sortie.`, `Distance over ${countDays} days: ${format(km)} kilometres. ${activeDays} days with an outing.`)}
          testID="stats-daily-bars"
        />
        <View style={local.chartCaption}><Text style={local.meta}>{days[0] ? shortDate(days[0].date.getTime()) : ''}</Text><Text style={local.meta}>{days[days.length - 1] ? shortDate(days[days.length - 1]!.date.getTime()) : ''}</Text></View>
        {selected ? <View style={local.dayDetail}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy('Jour précédent', 'Previous day')} accessibilityState={{ disabled: highlightedDay === 0 }} aria-disabled={highlightedDay === 0} disabled={highlightedDay === 0} onPress={() => { const day = days[highlightedDay - 1]; if (day) setSelectedDate(day.date.toISOString()); }} style={[local.dayAction, highlightedDay === 0 && local.disabled]}><GrydIcon name="chevronLeft" size={20} color={c.ink} /></Pressable>
          <View style={local.dayValue} accessibilityLiveRegion="polite"><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={local.selectedDistance}>{format(selected.km)} km</Text><Text style={local.meta}>{selected.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={copy('Jour suivant', 'Next day')} accessibilityState={{ disabled: highlightedDay === days.length - 1 }} aria-disabled={highlightedDay === days.length - 1} disabled={highlightedDay === days.length - 1} onPress={() => { const day = days[highlightedDay + 1]; if (day) setSelectedDate(day.date.toISOString()); }} style={[local.dayAction, highlightedDay === days.length - 1 && local.disabled]}><GrydIcon name="chevronRight" size={20} color={c.ink} /></Pressable>
        </View> : null}
      </View> : <View style={local.empty}><Text style={local.sectionTitle}>{copy('La place pour ta prochaine sortie.', 'Room for your next activity.')}</Text><Text style={local.meta}>{copy('Aucune sortie sur cette période.', 'No activities during this period.')}</Text></View>}

      {/* ── ÉVOLUTION 1 : la distance par semaine, sur huit semaines ────────── */}
      <View style={local.chartSection}>
        <View style={local.chartHeading}><Text style={local.sectionTitle}>{t(JC.weeklyDistance)}</Text><Text style={local.meta}>km</Text></View>
        <BarChart
          values={weeks.map(week => week.km)}
          labels={weeks.map((week, index) => index % 2 === 0 ? weekLabel(week.weekStartMs) : '')}
          a11yLabels={weeks.map(week => `${weekLabel(week.weekStartMs)} : ${format(week.km)} km`)}
          highlight={bestWeek}
          width={Math.max(0, width - 32)}
          tone="light"
          a11yLabel={t(JC.weeklyDistanceA11y, {
            n: STATS_WEEKS,
            best: bestWeek === null ? '—' : `${format(weeks[bestWeek]?.km ?? 0)} km`,
          })}
          testID="stats-weekly-bars"
        />
      </View>

      {/* ── ÉVOLUTION 2 : l'allure (ou la vitesse) moyenne par sortie ───────── */}
      <View style={local.chartSection}>
        <View style={local.chartHeading}><Text style={local.sectionTitle}>{t(sessionCurveTitle(activity))}</Text><Text style={local.meta}>{fastLabel?.unit ?? ''}</Text></View>
        {curve.length >= 2 && fastLabel !== null && slowLabel !== null ? <LineChart
          points={curve}
          width={Math.max(0, width - 32)}
          tone="light"
          invertY
          topLabel={fastLabel.value}
          bottomLabel={slowLabel.value}
          startLabel={shortDate(paces[0]!.startedAtMs)}
          endLabel={shortDate(paces[paces.length - 1]!.startedAtMs)}
          a11yLabel={t(JC.sessionCurveA11y, {
            n: paces.length,
            first: shortDate(paces[0]!.startedAtMs),
            last: shortDate(paces[paces.length - 1]!.startedAtMs),
          })}
          testID="stats-pace-curve"
        /> : <Text style={local.meta}>{t(JC.notEnoughForCurve)}</Text>}
      </View>

      {days.some(day => day.pending) ? <Text style={local.notice}>{copy('Inclut les mesures locales à synchroniser ; validation serveur en attente.', 'Includes local measurements awaiting sync and server validation.')}</Text> : null}
      {journal.historyStatus !== 'ready' ? <Text style={local.notice}>{copy('Seules les sorties disponibles sur cet appareil sont affichées.', 'Only activities available on this device are shown.')}</Text> : null}
      {journal.localFailed ? <Text style={local.notice}>{copy('Les sorties locales n’ont pas pu être lues et ne sont pas incluses.', 'Local activities could not be read and are not included.')}</Text> : null}
    </>}
    <View style={local.links}><ProfileLink tone="light" title={copy('Mon journal', 'My journal')} icon="historique" onPress={() => router.push('/(tabs)/profil')} /><ProfileLink tone="light" title={copy('Sources et appareils', 'Sources and devices')} icon="lien" onPress={() => router.push('/sources')} /></View>
  </ProfilePage>;
}
const local = StyleSheet.create({
  filters: { gap: 8, marginBottom: 12 }, sport: {}, period: {}, meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted }, state: { padding: 16, gap: 10, borderRadius: 24, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center' }, empty: { padding: 16, borderRadius: 24, backgroundColor: c.surface, gap: 12, marginBottom: 12 }, emptyTitle: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, color: c.ink, letterSpacing: -.6 }, compactAction: { alignSelf: 'flex-start', marginTop: 3 },
  overview: { padding: 16, borderRadius: 24, backgroundColor: c.carbon, gap: 12, marginBottom: 12 }, heroHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, heroMeta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted }, big: { fontFamily: fonts.displayMedium, fontSize: 30, lineHeight: 37, fontVariant: ['tabular-nums'], color: c.darkInk, letterSpacing: -1.4 }, unit: { fontFamily: fonts.text, fontSize: 14, letterSpacing: 0 }, numbers: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }, numberCard: { flex: 1, minWidth: 0, backgroundColor: c.surface, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 12, gap: 6 }, number: { fontFamily: fonts.displayMedium, color: c.ink, fontSize: 22, lineHeight: 28, fontVariant: ['tabular-nums'] }, sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 16, lineHeight: 22, color: c.ink },
  chartSection: { backgroundColor: c.surface, borderRadius: 24, padding: 16, marginBottom: 12 }, chartHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }, chartCaption: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 }, dayDetail: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border, marginTop: 14, paddingTop: 12 }, dayAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' }, dayValue: { flex: 1, alignItems: 'center', gap: 2 }, selectedDistance: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, color: c.ink, fontVariant: ['tabular-nums'] }, disabled: { opacity: .35 },
  notice: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted, marginBottom: 12 }, links: { marginTop: 4 },
});
