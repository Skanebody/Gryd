import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c, DEFAULT_ACTIVITY, type IngestRunResponse } from '@klaim/shared';
import { useLocale } from '../../i18n/store';
import { EVENTS, track } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { getFinishedActivity2026, resolveResultActivity2026 } from '../run/finishedActivity2026';
import { useResultOwner2026 } from '../run/useResultOwner2026';
import { isResultOwnerCurrent2026 } from '../run/resultOwner2026';
import { liveRateDisplay } from '../run/gps/liveRate';
import { setShareRun, shareCardFromResult } from '../share/shareRun';
import { UNJUDGED_VERDICT } from '../share/narrative';
import { useLocalActivities2026 } from './localActivities';
import { GrydIcon } from '../../ui/gryd';
import { TranslucentBackdrop2026 } from '../../ui/gryd/TranslucentBackdrop2026';
import { SocialPublicationAction2026 } from '../social/SocialPublicationAction2026';
import { captureExplanation2026, remainingCaptureArea2026, type CaptureReceipt2026 } from './captureReceipt2026';
import { RealMap, type RealMapBounds, type RealMapGeoJSONLayer } from '../../ui/game/RealMap';
import { VerifiedRunProgressMoment2026 } from './ProgressAchievementMoment2026';

type ResultParams2026 = { dist?: string; dur?: string; activity?: string; queued?: string; localId?: string };
const clock = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n) % 60).padStart(2, '0')}`;
export default function RunResult() {
  const params = useLocalSearchParams<ResultParams2026>();
  const { ownerId, epoch } = useResultOwner2026();
  return <OwnedRunResult key={`${epoch}:${params.localId ?? 'latest'}`} params={params} ownerId={ownerId} ownerEpoch={epoch} />;
}
function OwnedRunResult({ params, ownerId, ownerEpoch }: { params: ResultParams2026; ownerId: string | null | undefined; ownerEpoch: number }) {
  const { activities, loading } = useLocalActivities2026();
  const evidence = resolveResultActivity2026({ ownerId, localId: params.localId, activities, finished: getFinishedActivity2026(ownerId, params.localId) });
  const local = evidence?.activity ?? null;
  const [refreshed, setRefreshed] = useState<{ clientRunId: string; result: IngestRunResponse } | null>(null);
  const result = refreshed && local && refreshed.clientRunId === local.clientRunId ? refreshed.result : local?.result ?? null;
  const [details, setDetails] = useState(false);
  const [captureRead, setCaptureRead] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const { session } = useSession();
  const fr = useLocale() === 'fr';
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const text = (a: string, b: string) => fr ? a : b;
  useEffect(() => { track(EVENTS.celebrationViewed, { ruleset: '2026.1' }); }, []);
  useEffect(() => {
    if (!result?.territory2026 || !supabase || !session || !local || session.user.id !== ownerId) return;
    const runId = result.runId;
    let alive = true; setCaptureRead('loading');
    const refresh = () => { void Promise.resolve(supabase!.rpc('capture_result_2026', { p_run_id: runId })).then(({ data, error }) => {
      if (!alive || !isResultOwnerCurrent2026(ownerId, ownerEpoch)) return;
      if (!error && data?.ruleset === '2026.1') {
        setRefreshed({ clientRunId: local.clientRunId, result: { ...result, territory2026: data } }); setCaptureRead('ready');
      } else setCaptureRead('failed');
    }).catch(() => { if (alive && isResultOwnerCurrent2026(ownerId, ownerEpoch)) setCaptureRead('failed'); }); };
    refresh();
    if (result.territory2026.status !== 'scheduled') return () => { alive = false; };
    const timer = setInterval(refresh, 30_000);
    return () => { alive = false; clearInterval(timer); };
  }, [result?.runId, result?.territory2026?.status, session?.user.id, local?.clientRunId, ownerId, ownerEpoch]);
  const activity = local?.activity ?? DEFAULT_ACTIVITY;
  const distance = local ? result?.distanceM ?? local.distanceM : null;
  const duration = local ? result?.durationS ?? local.durationS : null;
  const segments = local?.traceSegments ?? [];
  const map = useMemo(() => {
    const points = segments.flat();
    if (points.length === 0) return null;
    const lngs = points.map(point => point.lng); const lats = points.map(point => point.lat);
    const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
    const lngPad = Math.max((maxLng - minLng) * 0.12, 0.0006);
    const latPad = Math.max((maxLat - minLat) * 0.12, 0.0006);
    const bounds: RealMapBounds = { sw: [minLng - lngPad, minLat - latPad], ne: [maxLng + lngPad, maxLat + latPad], paddingPx: 64 };
    // Separate features preserve every pause and signal break in the recorded outing.
    const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: segments.filter(segment => segment.length > 1).map((segment, index) => ({ type: 'Feature', id: index, properties: {}, geometry: { type: 'LineString', coordinates: segment.map(point => [point.lng, point.lat]) } })) };
    const layers: RealMapGeoJSONLayer[] = [
      { id: 'result-route-casing', data, lineColor: c.carbon, lineWidth: 7, lineWidthStops: [[10, 4], [14, 5], [18, 8]] },
      { id: 'result-route-core', data, lineColor: c.accent, lineWidth: 4, lineWidthStops: [[10, 2], [14, 3], [18, 5]] },
    ];
    return { bounds, layers, first: points[0]! };
  }, [segments]);
  const rate = liveRateDisplay(activity, distance && duration ? duration / (distance / 1000) : 0, fr ? ',' : '.');
  const territory = result?.territory2026 as CaptureReceipt2026 | undefined;
  const explanation = captureExplanation2026(territory, fr);
  const remainingArea = captureRead === 'ready' ? remainingCaptureArea2026(territory) : null;
  const gain = territory?.status === 'published' ? territory.newTerrainM2 : null;
  const area = (n: number) => (n / 1e6).toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 3 });
  const km = distance === null ? '—' : (distance / 1000).toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const canShare = evidence !== null && ownerId !== undefined && distance !== null && duration !== null;
  const canPublish = canShare && !!result?.runId && (result.status === 'valid' || result.status === 'partial') && local?.pending !== true && typeof ownerId === 'string' && session?.user.id === ownerId && isResultOwnerCurrent2026(ownerId, ownerEpoch);
  const share = () => {
    if (!canShare || !local || ownerId === undefined || !isResultOwnerCurrent2026(ownerId, ownerEpoch)) return;
    const armed = setShareRun({
      card: shareCardFromResult({ activity, distanceKm: km, clockLabel: clock(duration!), paceLabel: rate.measured ? rate.value : '', trace: segments.flat(),
        surfaceValue: gain !== null && gain !== undefined && gain > 0 ? area(gain) : '', surfaceUnit: gain && gain > 0 ? 'km²' : '', verified: false }),
      traceSegments: segments, territory2026: territory, intention: null, mode: 'conquete',
      verdict: { ...UNJUDGED_VERDICT, judged: !!result, credited: result?.status === 'valid', loopClosed: result?.loopClosed === true },
    }, { ownerId, clientRunId: local.clientRunId });
    if (armed) router.push('/partage');
  };
  return <View style={s.root}><ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
    <View style={[s.hero, { height: Math.max(260, Math.min(440, height * 0.5)) }]}>
      {map ? <RealMap key={local?.clientRunId} bounds={map.bounds} geojsonLayers={map.layers} basemap="dark" style={StyleSheet.absoluteFill} markers={[{ id: 'result-start', ...map.first, children: <View style={s.startPoint} /> }]} /> : <View style={s.emptyTrace}><GrydIcon name="route" size={26} color={c.darkMuted} /><Text style={s.emptyText}>{params.localId && loading ? text('Lecture de la sortie…', 'Loading outing…') : text('La trace n’est pas disponible sur cet appareil.', 'The route is not available on this device.')}</Text></View>}
      <View style={[s.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.titlePlate}><TranslucentBackdrop2026 tone="dark" radius={14} /><Text style={[s.title, s.overlayContent]}>{text('Récapitulatif', 'Outing summary')}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={text('Retour au journal', 'Back to journal')} style={s.close} onPress={() => router.replace('/profil')}><TranslucentBackdrop2026 tone="dark" radius={22} /><View style={s.overlayContent}><GrydIcon name="close" size={21} color={c.darkInk} /></View></Pressable>
      </View>
      <View style={s.heroFooter} pointerEvents="none"><TranslucentBackdrop2026 tone="dark" radius={10} /><View style={s.overlayContent}><GrydIcon name={activity === 'run' ? 'run' : 'bike'} size={17} color={c.darkInk} /></View><Text style={[s.heroMark, s.overlayContent]}>{evidence ? (activity === 'run' ? text('Course à pied', 'Running') : text('Sortie vélo', 'Cycling')) : text('Aucune sortie', 'No activity')}</Text></View>
    </View>
    <View style={s.content}>
    {canPublish && <VerifiedRunProgressMoment2026 key={result!.runId} />}
    <View style={s.metrics}>
      <Metric value={km} label={text('Distance · km', 'Distance · km')} />
      <Metric value={duration === null ? '—' : clock(duration)} label={text('Durée', 'Duration')} />
      <Metric value={rate.value} label={activity === 'run' ? text('Allure · /km', 'Pace · /km') : text('Vitesse · km/h', 'Speed · km/h')} />
    </View>
    <View style={s.impact}>
      <GrydIcon name={gain && gain > 0 ? "loop" : "route"} size={23} color={c.ink} />
      <View style={{ flex: 1 }}>
        <Text style={s.impactTitle}>{explanation?.title ?? (gain !== null && gain !== undefined && gain > 0 ? `+${area(gain)} km² ${text('à cette capture', 'at this capture')}` : canShare ? evidence?.archiveSaved ? text('Sortie enregistrée', 'Outing saved') : text('Sortie à archiver', 'Outing awaiting archive') : text('Aucune sortie sélectionnée', 'No outing selected'))}</Text>
        <Text style={s.body}>{explanation?.body ?? (!result && canShare ? (local?.pending ? text('Les statistiques sont disponibles. La synchronisation suivra.', 'Your statistics are available. Synchronisation will follow.') : evidence?.archiveSaved ? text('Ta sortie est conservée dans le journal de cet appareil.', 'Your outing is saved in this device’s journal.') : text('Les mesures sont conservées pour récupération. L’archive du journal n’a pas encore été écrite.', 'Measurements are retained for recovery. The journal archive has not been written yet.')) : !evidence ? text('Ouvre une sortie de ton journal pour consulter ses mesures.', 'Open a journal activity to see its measurements.') : text('Le gain de cette sortie et le terrain encore possédé sont deux mesures distinctes.', 'The gain from this activity and the terrain still controlled are separate measurements.'))}</Text>
        {territory?.status === 'scheduled' && territory.publishAfter && Number.isFinite(Date.parse(territory.publishAfter)) && <Text style={s.body}>{text('À partir du ', 'From ')}{new Date(territory.publishAfter).toLocaleString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>}

      </View>
    </View>
    {(territory?.status === 'published' || remainingArea !== null) && <View style={s.currentTerrain}>
      <Detail label={text('Surface publiée à la capture', 'Area published at capture')} value={typeof territory?.publishedAreaM2 === 'number' && Number.isFinite(territory.publishedAreaM2) && territory.publishedAreaM2 >= 0 ? `${area(territory.publishedAreaM2)} km²` : '—'} />
      <Detail label={text('Encore possédé', 'Still controlled')} value={remainingArea === null ? '—' : `${area(remainingArea)} km²`} />
      <Text style={s.body}>{captureRead === 'failed' || (captureRead === 'ready' && remainingArea === null) ? text('L’état actuel du terrain est indisponible. Le résultat historique reste conservé.', 'Current terrain is unavailable. The historical result is preserved.') : remainingArea === null ? text('Vérification du terrain actuel…', 'Checking current terrain…') : text('Les reprises modifient le terrain. Elles ne suppriment pas ta sortie.', 'Reclaims change terrain. They never delete your activity.')}</Text>
    </View>}
    {!!result?.xpAwarded && <Text style={s.progress}>+{result.xpAwarded} XP · {text('Progression', 'Progress')}</Text>}
    <View style={s.actions}>
      <Pressable accessibilityRole="button" style={s.journal} onPress={() => router.replace('/profil')}><Text style={s.detailsLabel}>{text('Journal', 'Journal')}</Text><GrydIcon name="chevronRight" size={16} color={c.muted} /></Pressable>
      {canShare && <Pressable accessibilityRole="button" onPress={share} style={s.primary}><GrydIcon name="share" size={18} color={c.ink} /><Text style={s.primaryText}>{text('Partager', 'Share')}</Text></Pressable>}
    </View>
    {canPublish && result && <SocialPublicationAction2026 runId={result.runId} activity={activity} surface="light" />}
    {evidence && <Pressable accessibilityRole="button" style={s.detailsButton} onPress={() => setDetails(value => !value)} accessibilityState={{ expanded: details }} aria-expanded={details}><Text style={s.detailsLabel}>{details ? text('Fermer les détails', 'Close details') : text('Détails de la sortie', 'Outing details')}</Text><GrydIcon name={details ? 'minus' : 'plus'} size={18} color={c.ink} /></Pressable>}
    {details && <View style={s.details}>
      <Text style={s.body}>{text('La surface d’une boucle et le nouveau terrain sont deux mesures différentes. Seule la partie réellement gagnée est affichée comme un gain.', 'Loop area and new terrain are different measurements. Only genuinely gained terrain is shown as a gain.')}</Text>
      {territory && <><Detail label={text('Surface de la boucle', 'Loop area')} value={`${area(territory.loopAreaM2)} km²`} /><Detail label={text('Nouveau terrain', 'New terrain')} value={gain == null ? (territory.status === 'private' ? text('Personnel', 'Personal') : territory.status === 'no_loop' ? '—' : text('En attente', 'Pending')) : `${area(gain)} km²`} /><Detail label={text('Déjà possédé', 'Already owned')} value={territory.alreadyOwnedM2 == null ? '—' : `${area(territory.alreadyOwnedM2)} km²`} /></>}
      <Pressable accessibilityRole="button" style={s.detailsButton} onPress={() => router.push('/support')}><Text style={s.detailsLabel}>{text('Demander de l’aide pour cette sortie', 'Get help with this outing')} →</Text></Pressable>
    </View>}
    </View>
  </ScrollView></View>;
}
function Metric({ value, label }: { value: string; label: string }) { return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={s.detailRow}><Text style={[s.body, s.detailLabel]}>{label}</Text><Text style={[s.detailsLabel, s.detailValue]}>{value}</Text></View>; }
const s = StyleSheet.create({
  overlayContent: { zIndex: 1 }, root: { flex: 1, backgroundColor: c.surface }, content: { paddingHorizontal: 20 },
  hero: { backgroundColor: c.carbon, overflow: 'hidden' }, header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, titlePlate: { minHeight: 44, borderRadius: 14, justifyContent: 'center', backgroundColor: 'transparent', paddingHorizontal: 14 }, title: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 27, letterSpacing: -0.5, color: c.darkInk }, close: { height: 44, width: 44, borderRadius: 22, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, startPoint: { width: 13, height: 13, borderRadius: 7, backgroundColor: c.surface, borderWidth: 3, borderColor: c.carbon }, heroFooter: { position: 'absolute', bottom: 28, left: 20, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'transparent', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, heroMark: { fontFamily: fonts.text, fontSize: 12, color: c.darkInk }, emptyTrace: { flex: 1, paddingHorizontal: 42, justifyContent: 'center', alignItems: 'center', gap: 12 }, emptyText: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, textAlign: 'center', color: c.darkMuted },
  metrics: { flexDirection: 'row', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }, metric: { flex: 1, gap: 5 }, metricValue: { fontFamily: fonts.displayMedium, fontSize: 27, lineHeight: 33, letterSpacing: -0.5, color: c.ink, fontVariant: ['tabular-nums'] }, metricLabel: { color: c.muted, fontFamily: fonts.text, fontSize: 12, lineHeight: 17 }, impact: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingTop: 18, paddingBottom: 16 }, impactTitle: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink, marginBottom: 5 }, body: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted }, progress: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 13, marginBottom: 16 },
  currentTerrain: { paddingBottom: 18, borderTopWidth: 1, borderTopColor: c.border },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingBottom: 16 }, primary: { minHeight: 44, backgroundColor: c.accent, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 17, paddingVertical: 12 }, primaryText: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 14 }, journal: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center' }, detailsButton: { minHeight: 48, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.border }, detailsLabel: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.ink, flexShrink: 1 }, details: { paddingTop: 10 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingVertical: 12 }, detailLabel: { flex: 1 }, detailValue: { maxWidth: '50%', textAlign: 'right' },
});
