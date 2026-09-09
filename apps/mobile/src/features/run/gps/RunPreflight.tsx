import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c, type Activity } from '@klaim/shared';
import { useLocale } from '../../../i18n/store';
import { useSession } from '../../../lib/session';
import { EVENTS, track } from '../../../lib/analytics';
import { GrydSwitch as Switch, GrydIcon } from '../../../ui/gryd';
import { RealMap, type RealMapCamera, type RealMapRef } from '../../../ui/game/RealMap';
import { checkForegroundPermission, getCurrentPositionOnce } from '../../refonte/location';
import type { PreflightApi } from './gateTypes';
import { useRecordingChoice2026 } from '../../refonte/useRecordingChoice2026';

export function RunPreflight({ preflight, requestedActivity }: { preflight: PreflightApi; requestedActivity: Activity }) {
  const fr = useLocale() === 'fr';
  /**
   * LA DISCIPLINE QUI SERA ENREGISTRÉE — celle-ci, et aucune autre.
   *
   * Le chemin de départ la DÉCLARE (paramètre d'URL, cf. `runActivity.ts`) ;
   * cet écran l'AFFICHE et laisse la CORRIGER d'un tap avant que quoi que ce
   * soit ne soit enregistré. C'est la deuxième marche de la règle E14, promise
   * depuis le 26/07 et jamais construite : la pastille était une `View`, et le
   * décompte part tout seul quand un choix de confidentialité existe déjà —
   * une lentille de carte oubliée sur Vélo envoyait donc une vraie course à
   * pied dans le monde vélo en trois secondes, sans recours.
   */
  const [activity, setActivity] = useState<Activity>(requestedActivity);
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const choice = useRecordingChoice2026();
  const shared = choice.shared;
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<RealMapRef>(null);
  // Read the already-authorised position for the preview. This never starts tracking.
  useEffect(() => {
    let alive = true;
    void checkForegroundPermission().then(async permission => {
      if (!alive || permission.status !== 'granted') return;
      const fix = await getCurrentPositionOnce();
      if (alive && fix) setPosition({ lat: fix.lat, lng: fix.lng });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const camera: RealMapCamera = position ? { ...position, zoom: 15 } : { lng: 2.5, lat: 46.6, zoom: 3.9 };
  const [count, setCount] = useState<number | null>(null);
  const ownerKey = choice.ownerId ?? 'local';
  const initialChoiceOwner = useRef<string | null>(null);
  const started = useRef(false);
  const confirm = useRef(preflight.confirmStart);
  confirm.current = preflight.confirmStart;
  useEffect(() => {
    setCount(null);
    track(EVENTS.runPreflightViewed, { readiness: preflight.status, platform: preflight.platform, requested: requestedActivity });
  }, [ownerKey]);
  // Une nouvelle déclaration du chemin de départ (retour sur l'écran avec un
  // autre `?activity=`) reprend la main : elle vient d'un geste, pas d'un cache.
  useEffect(() => { setActivity(requestedActivity); }, [requestedActivity]);
  /**
   * Corriger la discipline avant le départ. Pendant le décompte, le tap le
   * RELANCE à trois secondes : le joueur vient de changer ce qui sera
   * enregistré, il doit avoir le temps de le lire. Après le GO, plus rien ne
   * change de monde en chemin (§8.1 : changer de sport pendant l'enregistrement
   * est interdit) — la garde `started` le rend impossible.
   */
  const correctActivity = () => {
    if (started.current) return;
    setActivity(current => (current === 'run' ? 'bike' : 'run'));
    setCount(value => (value === null ? null : 3));
  };
  useEffect(() => {
    if (!choice.ready || initialChoiceOwner.current === ownerKey) return;
    initialChoiceOwner.current = ownerKey;
    // Only a previously saved choice starts automatically. Editing this visit does not.
    if (choice.hasChoice) setCount(3);
  }, [choice.ready, ownerKey]);
  useEffect(() => {
    if (count === null || !choice.ready || choice.saving) return;
    if (count === 0) {
      const consent = choice.currentConsent();
      if (consent === null) { setCount(null); return; }
      if (!started.current) { started.current = true; confirm.current(activity, consent); }
      return;
    }
    const timer = setTimeout(() => setCount(n => n === null ? null : n - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, shared, activity, choice.ready, choice.saving, ownerKey]);
  const cancel = () => { setCount(null); preflight.cancel(); router.back(); };
  const begin = async () => { if (await choice.save(shared)) setCount(3); };
  const sport = activity === 'run' ? (fr ? 'Course' : 'Run') : (fr ? 'Vélo' : 'Ride');
  const otherSport = activity === 'run' ? (fr ? 'Vélo' : 'Ride') : (fr ? 'Course' : 'Run');
  const audience = shared ? (fr ? 'Terrain partagé' : 'Shared terrain') : (fr ? 'Sortie privée' : 'Private activity');
  return <View style={s.root}>
    <View style={s.scene}>
      <RealMap ref={mapRef} camera={camera} basemap="dark" geojsonLayers={[]} style={StyleSheet.absoluteFill}
        onStyleLoaded={() => mapRef.current?.flyTo(camera)}
        markers={position ? [{ id: 'departure-position', ...position, children: <View style={s.position}><View style={s.positionCore} /></View> }] : []} />
      <View style={[s.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button"
          accessibilityLabel={fr ? `Sport enregistré : ${sport}. Toucher pour enregistrer en ${otherSport}.` : `Recording as ${sport}. Tap to record as ${otherSport} instead.`}
          onPress={correctActivity} style={({ pressed }) => [s.discipline, pressed && s.pressed]}>
          <GrydIcon name={activity === 'run' ? 'run' : 'bike'} size={20} color={c.surface} />
          <Text style={s.sport}>{sport}</Text>
          <Text style={s.sportSwap}>{fr ? `→ ${otherSport}` : `→ ${otherSport}`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={fr ? 'Annuler le départ' : 'Cancel start'} onPress={cancel} style={s.close}><GrydIcon name="close" size={21} color={c.surface} /></Pressable>
      </View>
      {count !== null && <View pointerEvents="none" style={s.countdown}>
        <View style={s.countCircle}>{count > 0 ? <Text accessibilityLiveRegion="polite" style={s.count}>{count}</Text> : <GrydIcon name="arrowUpRight" size={38} color={c.surface} />}</View>
      </View>}
      {!position && <View style={s.mapCaption} pointerEvents="none"><GrydIcon name="location" size={15} color={c.darkMuted} /><Text style={s.caption}>{fr ? 'Vue générale · position en attente' : 'Overview · waiting for location'}</Text></View>}
    </View>
    <ScrollView style={s.dock} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 12) }]} showsVerticalScrollIndicator={false}>
      <View style={s.dockHeading}><Text style={s.title}>{count === null ? (fr ? 'Départ' : 'Start') : (fr ? 'Départ imminent' : 'Starting soon')}</Text><View style={s.gps}><View style={[s.dot, preflight.status === 'approximate' && s.dotMuted]} /><Text style={s.gpsLabel}>{preflight.status === 'approximate' ? (fr ? 'Précision réduite' : 'Reduced accuracy') : (fr ? 'GPS disponible' : 'GPS available')}</Text></View></View>
      {count === null ? <>
        <View style={s.privacy}>
          <View style={s.audienceTitle}><GrydIcon name={shared ? 'map' : 'lock'} size={18} color={c.surface} /><Text style={s.label}>{audience}</Text></View>
          {session && <Switch accessibilityLabel={fr ? 'Participer au terrain partagé' : 'Participate in shared terrain'} value={shared} disabled={!choice.ready || choice.saving} onValueChange={value => { void choice.save(value); }} trackColor={{ true: c.accent, false: c.darkSurfaceMuted }} thumbColor={shared ? c.carbon : c.surface} ios_backgroundColor={c.darkSurfaceMuted} />}
        </View>
        <Text style={s.small}>{!session
          ? (fr ? 'Enregistrée sur cet appareil. Aucun compte nécessaire, aucun territoire publié.' : 'Saved on this device. No account needed, no territory published.')
          : shared ? (fr ? 'Une zone publiée peut révéler une partie de ton parcours, même si ta trace reste privée. Elle peut être reprise.' : 'Published terrain can reveal part of your route even when your activity is private. Others can reclaim it.')
          : (fr ? 'Ta sortie reste privée et ne modifie pas le terrain partagé.' : 'Your activity stays private and does not change shared terrain.')}</Text>
        {preflight.foregroundOnlyPlatform && <Text style={s.platformNote}>{fr ? 'Navigateur : garde cet écran ouvert pendant la sortie.' : 'Browser: keep this screen open during your outing.'}</Text>}
        {/* G07 — L'ARRIÈRE-PLAN SE DEMANDE AVANT LA SORTIE, PAS APRÈS.
            La question n'arrivait qu'au retour d'un passage en arrière-plan :
            le joueur l'apprenait après avoir déjà perdu des points, sur un
            écran où il court. Une fois, ici, avec le refus offert au même
            endroit — un refus est une réponse, pas un report. */}
        {preflight.background?.offer && <View style={s.backgroundOffer}>
          <Text style={s.label}>{fr ? 'Enregistrer écran verrouillé' : 'Record with the screen locked'}</Text>
          <Text style={s.small}>{fr ? 'Sans cette autorisation, GRYD n’enregistre que lorsque l’app est ouverte. Tu peux la donner maintenant ou t’en passer.' : 'Without this permission GRYD only records while the app is open. You can grant it now or do without.'}</Text>
          <View style={s.backgroundActions}>
            <Pressable accessibilityRole="button" onPress={preflight.background.decline} style={s.cancel}><Text style={s.cancelText}>{fr ? 'Plus tard' : 'Not now'}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={preflight.background.allow} style={s.link}><Text style={s.linkText}>{fr ? 'Autoriser' : 'Allow'}</Text></Pressable>
          </View>
        </View>}
      </> : <View style={s.audienceSummary}><GrydIcon name={shared ? 'map' : 'lock'} size={17} color={c.darkMuted} /><Text style={s.small}>{audience}</Text></View>}
      {choice.failed && <Pressable accessibilityRole="button" style={s.link} onPress={() => void choice.reload()}><Text style={s.linkText}>{fr ? 'Choix de confidentialité indisponible · Réessayer' : 'Privacy choice unavailable · Retry'}</Text></Pressable>}
      {choice.saveFailed && <Text accessibilityRole="alert" style={s.small}>{fr ? 'Le choix n’a pas été enregistré. Réessaie.' : 'Your choice could not be saved. Try again.'}</Text>}
      <View style={s.actions}>
        <Pressable accessibilityRole="button" onPress={cancel} style={s.cancel}><Text style={s.cancelText}>{fr ? 'Annuler' : 'Cancel'}</Text></Pressable>
        {count === null ? <Pressable accessibilityRole="button" disabled={!choice.ready || choice.saving} accessibilityState={{ disabled: !choice.ready || choice.saving }} onPress={() => void begin()} style={[s.primary, (!choice.ready || choice.saving) && s.disabled]}><Text style={s.primaryText}>{(!choice.ready || choice.saving) ? (fr ? 'Préparation…' : 'Preparing…') : (fr ? 'Démarrer' : 'Start')}</Text><GrydIcon name="play" size={18} color={c.ink} /></Pressable> : <Text style={s.countHint}>{fr ? 'Enregistrement après le décompte' : 'Recording after the countdown'}</Text>}
      </View>
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.carbon }, scene: { flex: 1, minHeight: 160, overflow: 'hidden' }, pressed: { opacity: 0.7 }, sportSwap: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted },
  header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, discipline: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: c.floating, borderRadius: 14, paddingHorizontal: 14, minHeight: 44 }, sport: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.surface }, close: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.floating, alignItems: 'center', justifyContent: 'center' },
  position: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }, positionCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.surface, borderWidth: 3, borderColor: c.carbon }, mapCaption: { position: 'absolute', bottom: 32, left: 16, right: 16, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7 }, caption: { fontFamily: fonts.text, fontSize: 12, color: c.darkMuted, backgroundColor: c.carbon, paddingHorizontal: 6, paddingVertical: 4 },
  dock: { flexGrow: 0, maxHeight: '58%', backgroundColor: c.carbon }, content: { paddingHorizontal: 20, paddingTop: 18 }, dockHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 25, letterSpacing: -0.4, color: c.surface }, gps: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent }, dotMuted: { backgroundColor: c.darkMuted }, gpsLabel: { fontFamily: fonts.text, color: c.darkMuted, fontSize: 12 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 48, marginTop: 10 }, audienceTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, label: { flexShrink: 1, color: c.surface, fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20 }, small: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 }, platformNote: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, marginTop: 8 }, link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, linkText: { flexShrink: 1, color: c.surface, fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18 },
  backgroundOffer: { gap: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted, marginTop: 12 }, backgroundActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12 }, primary: { minHeight: 44, borderRadius: 14, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, paddingVertical: 12, gap: 12 }, primaryText: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 14 }, disabled: { opacity: 0.5 }, cancel: { minHeight: 44, minWidth: 64, justifyContent: 'center' }, cancelText: { color: c.darkMuted, fontFamily: fonts.textMedium, fontSize: 13 },
  countdown: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }, countCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.floating, alignItems: 'center', justifyContent: 'center' }, count: { fontFamily: fonts.displayMedium, fontSize: 60, lineHeight: 70, color: c.surface, fontVariant: ['tabular-nums'], letterSpacing: -2 }, audienceSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 }, countHint: { flexShrink: 1, color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, textAlign: 'right' },
});
