import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useLocale } from '../../../i18n/store';
import { GrydIcon } from '../../../ui/gryd';
import { RealMap, type RealMapCamera, type RealMapGeoJSONLayer, type RealMapRef } from '../../../ui/game/RealMap';
import { liveRateDisplay } from './liveRate';
import { courseResultParams } from './resultHandoff';
import type { RealRunApi } from './gateTypes';

function clock(seconds: number) { const value = Math.floor(Math.max(0, seconds)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`; }
/** A sports instrument. Capture is evaluated after saving, by the server. */
export function RealCourseLive({ run }: { run: RealRunApi }) {
  const insets = useSafeAreaInsets();
  const fr = useLocale() === 'fr';
  const [finishing, setFinishing] = useState(false);
  const [failed, setFailed] = useState(false);
  const finishingRef = useRef(false);
  const snapshot = run.snapshot;
  const paused = snapshot.phase === 'paused-user';
  const rate = liveRateDisplay(run.activity, snapshot.paceSPerKm, fr ? ',' : '.');
  const mapRef = useRef<RealMapRef>(null);
  const lastSegment = snapshot.traceSegments[snapshot.traceSegments.length - 1];
  const lastPoint = lastSegment?.[lastSegment.length - 1];
  const camera: RealMapCamera = lastPoint ? { ...lastPoint, zoom: 16 } : { lng: 2.5, lat: 46.6, zoom: 3.9 };
  const layers = useMemo<RealMapGeoJSONLayer[]>(() => {
    // Keep one feature per recorded segment: pauses and GPS gaps never get a connector.
    const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: snapshot.traceSegments.filter(segment => segment.length > 1).map((segment, index) => ({ type: 'Feature', id: index, properties: {}, geometry: { type: 'LineString', coordinates: segment.map(point => [point.lng, point.lat]) } })) };
    return [
      { id: 'live-route-casing', data, lineColor: c.carbon, lineWidth: 7, lineWidthStops: [[10, 4], [14, 5], [18, 8]] },
      { id: 'live-route-core', data, lineColor: c.accent, lineWidth: 4, lineWidthStops: [[10, 2], [14, 3], [18, 5]] },
    ];
  }, [snapshot.traceSegments]);
  const finish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true; setFinishing(true); setFailed(false);
    try {
      const result = await run.finish();
      router.replace({ pathname: '/course-result', params: courseResultParams({ mode: run.effectiveMode, activity: run.activity, ...result }) });
    } catch { setFailed(true); setFinishing(false); finishingRef.current = false; }
  };
  return <View style={s.root}>
    <View style={s.scene}>
      <RealMap ref={mapRef} camera={camera} basemap="dark" geojsonLayers={layers} style={StyleSheet.absoluteFill}
        onStyleLoaded={() => mapRef.current?.flyTo(camera)}
        markers={lastPoint ? [{ id: 'recorded-position', ...lastPoint, children: <View style={[s.position, (paused || snapshot.signal !== 'ok') && s.positionMuted]} /> }] : []} />
      <View style={[s.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.headerLabel}><GrydIcon name={run.activity === 'run' ? 'run' : 'bike'} size={20} color={c.darkInk} /><Text style={s.sport}>{run.activity === 'run' ? (fr ? 'Course' : 'Run') : (fr ? 'Vélo' : 'Ride')}</Text></View>
        <Pressable style={s.minimize} accessibilityRole="button" accessibilityLabel={fr ? 'Réduire le suivi, continuer à enregistrer' : 'Minimise tracking, keep recording'} onPress={() => router.push('/')}><GrydIcon name="chevronDown" size={22} color={c.darkInk} /></Pressable>
      </View>
      {!lastPoint && <View style={s.traceEmpty} pointerEvents="none"><GrydIcon name="location" size={22} color={c.darkMuted} /><Text style={s.traceLabel}>{fr ? 'En attente des premiers points GPS' : 'Waiting for the first GPS points'}</Text></View>}
      {lastPoint && <Pressable style={s.recenter} accessibilityRole="button" accessibilityLabel={fr ? 'Recentrer sur le dernier point enregistré' : 'Centre on the last recorded point'} onPress={() => mapRef.current?.flyTo(camera)}><GrydIcon name="location" size={21} color={c.darkInk} /></Pressable>}
    </View>
    <View style={[s.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={s.status}><View style={[s.dot, (paused || snapshot.signal !== 'ok') && s.dotMuted]} /><Text style={s.statusText}>{paused ? (fr ? 'En pause' : 'Paused') : (fr ? 'Enregistrement' : 'Recording')}</Text></View>
      <View style={s.metrics}>
        <View style={s.metric}><Text style={s.distance}>{(snapshot.distanceM / 1000).toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text><Text style={s.metricLabel}>{fr ? 'Distance · km' : 'Distance · km'}</Text></View>
        <View style={s.metric}><Text style={s.number}>{clock(snapshot.activeS)}</Text><Text style={s.metricLabel}>{fr ? 'Temps actif' : 'Moving time'}</Text></View>
        <View style={s.metric}><Text style={s.number}>{rate.value}</Text><Text style={s.metricLabel}>{run.activity === 'run' ? (fr ? 'Allure · /km' : 'Pace · /km') : (fr ? 'Vitesse · km/h' : 'Speed · km/h')}</Text></View>
      </View>
      <ScrollView style={s.messages} contentContainerStyle={s.messagesContent} showsVerticalScrollIndicator={false}>
        {(snapshot.signal !== 'ok' || run.permissionRevoked || run.approxLocation) && <View style={s.notice}><GrydIcon name="location" size={17} color={c.darkMuted} /><Text style={s.noticeText}>{run.permissionRevoked ? (fr ? 'Localisation désactivée. Tes points sont conservés.' : 'Location disabled. Your points are saved.') : (fr ? 'Signal GPS faible. La trace reprendra au retour du signal.' : 'Weak GPS signal. Your route resumes when the signal returns.')}</Text></View>}
        {run.foregroundOnlyPlatform && <Text style={s.fine}>{fr ? 'Garde cet écran ouvert : le navigateur ne suit pas en arrière-plan.' : 'Keep this screen open: the browser cannot track in the background.'}</Text>}
        {run.bgPrompt !== 'hidden' && <Pressable accessibilityRole="button" style={s.noticeAction} onPress={run.allowBackground}><Text style={s.noticeText}>{fr ? 'Autoriser l’enregistrement écran verrouillé' : 'Allow recording with the screen locked'}</Text><GrydIcon name="arrowUpRight" size={17} color={c.darkInk} /></Pressable>}
        {run.restore && <View style={s.restore}><Text style={s.restoreTitle}>{fr ? 'Sortie retrouvée' : 'Recovered outing'}</Text><Text style={s.fine}>{(run.restore.distanceM / 1000).toFixed(2)} km · {run.restore.activity === 'bike' ? (fr ? 'Vélo' : 'Cycling') : (fr ? 'Course' : 'Running')}</Text>{run.restore.resume ? <Pressable accessibilityRole="button" style={s.restoreAction} onPress={run.restore.resume}><Text style={s.secondaryText}>{fr ? 'Reprendre la sortie retrouvée' : 'Resume recovered outing'}</Text><GrydIcon name="play" size={16} color={c.darkInk} /></Pressable> : null}{run.restore.resumeBlocked === 'other_activity' ? <Text style={s.fine}>{fr ? 'Elle n’est pas dans la même discipline que la sortie en cours : elle ne peut pas y être fusionnée. Garde-la au journal, elle part dans son monde.' : 'It belongs to another sport than the outing in progress and cannot be merged into it. Keep it in the journal: it goes to its own world.'}</Text> : run.restore.resumeBlocked === 'too_old' ? <Text style={s.fine}>{fr ? 'Elle date de plus de 24 h : la reprendre ferait repartir son chrono sur des heures qui n’ont pas été courues. Ses mesures restent intactes.' : 'It is more than 24 h old: resuming it would restart its clock over hours nobody ran. Its measurements stay intact.'}</Text> : null}<Pressable accessibilityRole="button" style={s.restoreAction} onPress={run.restore.discard}><Text style={s.secondaryText}>{fr ? 'Garder cette sortie au journal' : 'Keep this outing in the journal'}</Text><GrydIcon name="arrowUpRight" size={16} color={c.darkInk} /></Pressable></View>}
        {failed && <Text accessibilityRole="alert" style={s.fine}>{fr ? 'La sauvegarde n’a pas abouti. Les données restent sur cet écran.' : 'Saving did not complete. Your data remains on this screen.'}</Text>}
      </ScrollView>
      <View style={s.controls}>
        {paused && <Pressable disabled={finishing} accessibilityState={{ disabled: finishing }} accessibilityRole="button" onPress={() => void finish()} style={s.secondary}><GrydIcon name="stop" size={17} color={c.darkInk} /><Text style={s.secondaryText}>{finishing ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Terminer' : 'Finish')}</Text></Pressable>}
        <Pressable disabled={finishing} accessibilityState={{ disabled: finishing }} accessibilityRole="button" onPress={run.togglePause} style={[s.primary, finishing && s.disabled]}><GrydIcon name={paused ? 'play' : 'pause'} color={c.ink} size={20} /><Text style={s.primaryText}>{paused ? (fr ? 'Reprendre' : 'Resume') : 'Pause'}</Text></Pressable>
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.carbon }, scene: { flex: 1, minHeight: 140, overflow: 'hidden' },
  header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, headerLabel: { minHeight: 44, borderRadius: 14, backgroundColor: c.floating, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9 }, sport: { color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20 }, minimize: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.floating, alignItems: 'center', justifyContent: 'center' }, position: { width: 14, height: 14, borderRadius: 7, backgroundColor: c.accent, borderWidth: 3, borderColor: c.carbon }, positionMuted: { backgroundColor: c.darkInk }, recenter: { position: 'absolute', bottom: 36, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: c.floating, alignItems: 'center', justifyContent: 'center' }, traceEmpty: { position: 'absolute', top: '45%', alignSelf: 'center', maxWidth: 240, padding: 16, alignItems: 'center', gap: 9, borderRadius: 16, backgroundColor: c.floating }, traceLabel: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted, textAlign: 'center' },
  dock: { paddingHorizontal: 20, paddingTop: 15, backgroundColor: c.carbon }, status: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent }, dotMuted: { backgroundColor: c.darkMuted }, statusText: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12 }, metrics: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingTop: 12, paddingBottom: 15 }, metric: { flex: 1, gap: 5 }, distance: { color: c.darkInk, fontFamily: fonts.displayMedium, fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] }, number: { color: c.darkInk, fontFamily: fonts.displayRegular, fontSize: 27, lineHeight: 34, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }, metricLabel: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 17 },
  messages: { flexGrow: 0, maxHeight: 150 }, messagesContent: { gap: 7 }, notice: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', paddingBottom: 3 }, noticeText: { flex: 1, color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 }, noticeAction: { minHeight: 44, flexDirection: 'row', gap: 12, alignItems: 'center' }, fine: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 }, restore: { borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted, paddingTop: 12, gap: 5 }, restoreTitle: { color: c.darkInk, fontFamily: fonts.displayMedium, fontSize: 20 }, restoreAction: { minHeight: 44, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingTop: 12 }, primary: { minHeight: 44, borderRadius: 22, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10 }, primaryText: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 14 }, disabled: { opacity: 0.5 }, secondary: { minHeight: 44, paddingHorizontal: 4, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 }, secondaryText: { flexShrink: 1, color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19 },
});
