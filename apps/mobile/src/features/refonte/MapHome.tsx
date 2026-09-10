import Svg, { Line } from 'react-native-svg';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Linking, Platform, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c, type Activity } from '@klaim/shared';
import { RealMap, realMapAvailable, type RealMapCamera, type RealMapGeoJSONLayer, type RealMapRef } from '../../ui/game/RealMap';
import { GrydIcon, type GrydIconName } from '../../ui/gryd/GrydIcon';
import { GrydSwitch as Switch } from '../../ui/gryd/GrydSwitch';
import { MapTranslucent2026 } from '../../ui/gryd/MapTranslucent2026';
import { MotionReveal2026, useControlMotion2026 } from '../../ui/gryd/Motion2026';
import { GrydMark } from '../../ui/gryd/GrydMark';
import { MePinMarker2026 } from '../../ui/game/MePinMarker2026';
import { t, useLocale } from '../../i18n/store';
import { C as CClassement } from '../../i18n/catalog/classement';
import { useSession } from '../../lib/session';
import { EVENTS, track } from '../../lib/analytics';
import { getMapActivity, useMapActivity, useBasemapStyle } from '../map/mapPref';
import { MapActivitySwitch2026 } from '../map/MapActivitySwitch2026';
import { usePlaceFocus } from '../map/placeFocus';
import { basemapSpecRevision, prefetchLocalizedBasemaps, subscribeBasemapSpecs } from '../map/mapStyle';
import { cityCenter, cityLabel } from '../social/cities';
import { useOnboardingState } from '../onboarding/store';
import { effectiveInitials, useMyProfile } from '../social/profileStore';
import { GRYD_NAV_BAR_HEIGHT, GRYD_NAV_BOTTOM_GAP } from '../nav/metrics';
import { useRunSession } from './RunSession';
import { useOwnership, type MapExtent } from './useOwnership';
import { checkForegroundPermission, getCurrentPositionOnce, requestForegroundPermission } from './location';
import { useRecordingChoice2026 } from './useRecordingChoice2026';
import { territoryOwnerLabel2026, territoryRoleLabel2026, type TerritoryRole2026 } from './territoryModel2026';

import { territoryPaintLayers2026 } from './territoryPaint2026';
import { useMyCosmetics2026 } from '../arsenal/useMyCosmetics2026';
import { cosmeticTracePaint2026 } from '../arsenal/cosmetics2026';
import { createMapLocationGate2026, readMapLocation2026, type MapLocationResult2026 } from './mapLocation2026';

// France overview is labelled as exploration; it never impersonates a GPS position.
const FRANCE: RealMapCamera = { lat: 46.6, lng: 2.5, zoom: 3.9 };
const savedCameras: Partial<Record<Activity, RealMapCamera>> = {};
/**
 * PORTE DE COMPTE : fermée pour la session d'app, jamais persistée (10/09/2026).
 *
 * Étape 0 du correctif : sans compte, l'app s'ouvrait sur la carte, disait
 * « Connecte-toi pour voir les terrains de ton compte » dans un avis NON
 * cliquable, et la seule porte réelle vers /sign-in dormait dans la feuille
 * « Couches ». Autrement dit : on annonçait au joueur qu'il lui manque un
 * compte sans lui donner par où le créer.
 *
 * La carte porte donc un bloc avec un vrai bouton. Il se ferme d'un geste, et
 * cette fermeture vaut pour la session en cours seulement : au prochain
 * lancement la porte est là de nouveau. Un module-level suffit, et il est plus
 * honnête qu'un stockage : rien à écrire, rien à lire, rien à rater.
 */
let accountDoorDismissed2026 = false;
function boundsFor(camera: RealMapCamera, width: number, height: number): MapExtent {
  const span = 360 / 2 ** camera.zoom;
  const dx = span * Math.max(1, width / 512);
  const dy = span * Math.max(1, height / 512) * Math.cos(camera.lat * Math.PI / 180);
  return { west: Math.max(-180, camera.lng - dx), east: Math.min(180, camera.lng + dx), south: Math.max(-85, camera.lat - dy), north: Math.min(85, camera.lat + dy) };
}

export default function MapHome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const fr = useLocale() === 'fr';
  /**
   * LA CAPACITÉ RÉELLE DE CE BUILD. Sans module natif, la carte se replie sur
   * un dessin dont la caméra n'existe pas : « Me recentrer » et la bascule de
   * fond appelleraient un `flyTo` vide. On ne les peint donc pas — « aucun
   * bouton mort », et l'affichage se dérive de ce que la plateforme sait faire.
   */
  const mapReady = realMapAvailable();
  const motion = useControlMotion2026();
  const { session, configured } = useSession();
  const { gate } = useRunSession();
  const choice = useRecordingChoice2026();
  const [roleFilters, setRoleFilters] = useState<Record<TerritoryRole2026, boolean>>({ mine: true, crew: true, others: true });
  const { activity, setActivity } = useMapActivity();
  const [activityReady, setActivityReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void getMapActivity().finally(() => { if (alive) setActivityReady(true); });
    return () => { alive = false; };
  }, []);
  const { basemap, setBasemap } = useBasemapStyle();
  const basemapRevision = useSyncExternalStore(subscribeBasemapSpecs, basemapSpecRevision, basemapSpecRevision);
  useEffect(() => prefetchLocalizedBasemaps(basemap), [basemap]);
  const { profile } = useMyProfile();
  // Ce que je PORTE sur la carte : la silhouette du pin, et le trait de mon
  // terrain. Une seule lecture partagée avec le profil et la collection
  // (`useMyCosmetics2026`) ; sans compte ou sans 0180, elle rend les objets
  // livrés et la carte garde exactement l'apparence d'avant ce lot.
  const cosmetics = useMyCosmetics2026();
  const { state: onboarding } = useOnboardingState();
  const place = usePlaceFocus();
  const handledPlace = useRef(0);
  const map = useRef<RealMapRef>(null);
  const [camera, setCamera] = useState<RealMapCamera>(savedCameras[activity] ?? FRANCE);
  const cameraTarget = useRef(camera);
  const [settled, setSettled] = useState(camera);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<MapLocationResult2026['kind']>('unrequested');
  const [locationCanAsk, setLocationCanAsk] = useState(true);
  const locationGate = useRef(createMapLocationGate2026()).current;
  const cameraIntent = useRef<'fallback'|'gps'|'explore'>('fallback');
  const [approximate, setApproximate] = useState(false);
  const [sheet, setSheet] = useState<'layers' | 'list' | null>(null);
  const [doorClosed, setDoorClosed] = useState(accountDoorDismissed2026);
  const [attenuate, setAttenuate] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cityId = onboarding.cityId ?? profile.cityId;
  const city = cityCenter(cityId);
  const cityName = place.label ?? onboarding.cityName ?? cityLabel(cityId);
  const extent = useMemo(() => boundsFor(settled, width, height), [settled, width, height]);
  const ownership = useOwnership(activity, extent);
  const visibleFeatures = ownership.features.filter(f => roleFilters[f.properties.role]);
  const selected = visibleFeatures.find(f => f.properties.id === selectedId);
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) firstFocus.current = false;
    else ownership.reload();
  }, [ownership.reload]));

  const moveTo = useCallback((next: RealMapCamera) => {
    savedCameras[activity] = next; cameraTarget.current = next;
    setCamera(next); setSettled(next);
    map.current?.flyTo(next);
  }, [activity]);
  useEffect(() => {
    if (!activityReady) return;
    const target = cameraIntent.current !== 'fallback' ? cameraTarget.current : savedCameras[activity] ?? (city ? { ...city, zoom: 13.5 } : FRANCE);
    cameraTarget.current = target;
    setSelectedId(null); setCamera(target); setSettled(target);
    map.current?.flyTo(target);
  }, [activity, cityId, activityReady]);
  useEffect(() => {
    if (activityReady && place.ticket > handledPlace.current) {
      handledPlace.current = place.ticket;
      locationGate.cancel(); setLocating(false); cameraIntent.current = 'explore';
      moveTo({ ...place.point, zoom: place.zoom });
    }
  }, [place.ticket, moveTo, activityReady]);

  const locate = useCallback(async (ask: boolean) => {
    const ticket = locationGate.begin();
    setLocating(true);
    const result = await readMapLocation2026({ checkForegroundPermission, requestForegroundPermission, getCurrentPositionOnce }, ask);
    if (!locationGate.isCurrent(ticket)) return;
    setLocating(false); setLocationState(result.kind);
    if (result.kind === 'position') {
      setPosition({ lat: result.point.lat, lng: result.point.lng }); setApproximate(result.zoom < 15);
      if (ask || cameraIntent.current !== 'explore') {
        cameraIntent.current = 'gps';
        moveTo({ lat: result.point.lat, lng: result.point.lng, zoom: result.zoom });
      }
    } else {
      setPosition(null);
      if (result.kind === 'denied') setLocationCanAsk(result.canAskAgain);
    }
  }, [moveTo, locationGate]);
  useEffect(() => {
    if (activityReady) void locate(false);
    return () => locationGate.cancel();
  }, [activityReady, locate, session?.user.id, locationGate]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active' && activityReady) void locate(false); });
    return () => subscription.remove();
  }, [activityReady, locate]);

  const trace = useMemo(() => cosmeticTracePaint2026(cosmetics.equipped.trace), [cosmetics.equipped.trace]);
  const layers = useMemo<ReadonlyArray<RealMapGeoJSONLayer>>(() => territoryPaintLayers2026({
    features: ownership.features, filters: roleFilters, attenuate, dark: basemap !== 'color', selectedId, trace,
  }), [ownership.features, roleFilters, attenuate, selectedId, basemap, trace]);

  const text = (a: string, b: string) => fr ? a : b;
  const bottom = insets.bottom + GRYD_NAV_BOTTOM_GAP + GRYD_NAV_BAR_HEIGHT + 12;
  const recording = gate?.kind === 'real';
  /**
   * MON PIN. La photo vient de la SOURCE qui existe déjà (`profile.avatarUri`,
   * signée à la lecture par `profileStore`) : aucun nouveau champ, aucun
   * renommage. Sans session il n'y a ni photo ni pseudo à montrer, et
   * `effectiveInitials` rendrait « ? » : l'invité porte donc le G, jamais un
   * point d'interrogation qui ferait croire à un compte cassé.
   */
  const myInitials = session ? effectiveInitials(profile) : '';
  const pinInitials = myInitials === '?' ? '' : myInitials;
  const pinPhoto = session ? profile.avatarUri : '';
  /** La porte de compte est ouverte tant que personne n'est connecté ET qu'elle
   *  n'a pas été fermée pendant cette session d'app. */
  const accountDoorOpen = ownership.signedOut && !doorClosed;
  const closeAccountDoor = () => { accountDoorDismissed2026 = true; setDoorClosed(true); };
  const overlayHeight = Math.max(100, Math.min(200, height - insets.top - bottom - 132));
  const area = (n: number) => (n / 1e6).toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 3 });
  if (!activityReady) return <View style={s.root} />;
  return <View style={s.root}>
    <View style={s.map}>
      {/* La `key` ne porte QUE ce qui exige une reconstruction du style : le fond
          et sa révision. La discipline, elle, ne change que les COUCHES
          (`territoryPaintLayers2026`) — la mettre ici détruisait et remontait la
          MapView à chaque bascule Course/Vélo, avec son style, sa caméra et sa
          seconde de noir. */}
      <RealMap key={`${basemap}-${basemapRevision}`} ref={map} camera={camera} basemap={basemap} geojsonLayers={layers}
        onStyleLoaded={() => map.current?.flyTo(cameraTarget.current)}
        onCameraGesture={() => { cameraIntent.current = 'explore'; locationGate.cancel(); setLocating(false); }}
        onCameraSettled={next => { savedCameras[activity] = next; cameraTarget.current = next; setSettled(next); }}
        onPress={event => { setSelectedId(event.zoneId ?? null); if (event.zoneId) track(EVENTS.mapZoneTap, { role: 'terrain' }); }}
        markers={position ? [{ id: 'me', ...position, children: <MePinMarker2026
          label={approximate ? text('Position approximative', 'Approximate location') : text('Ma position', 'My location')}
          photoUri={pinPhoto} initials={pinInitials} approximate={approximate} styleId={cosmetics.equipped.pin} /> }] : []} />
    </View>
    <View pointerEvents="box-none" style={[s.header, { top: insets.top + 12 }]}>
      <View style={s.topRow}>
        {/* LE G, CHARTREUSE, SUR RIEN (10/09/2026, demande fondateur). Il vivait
            au centre d'un disque translucide de 44 pt qui le faisait lire comme
            un bouton de carte de plus, à côté de Couches et Me recentrer. La
            marque n'est pas un contrôle : elle ne se pose pas sur un socle. La
            boîte de 44 pt reste, elle tient l'alignement avec la pastille de
            ville et garderait la zone tactile le jour où le G deviendrait
            pressable. */}
        <View style={s.brand}><GrydMark variant="symbol" size={24} color={c.accent} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={text('Choisir une ville', 'Choose a city')} onPress={() => router.push('/map/search')} style={({ pressed }) => [s.place, pressed && s.pressed]}>
          <MapTranslucent2026 tone="dark" radius={22} />
          <View style={s.overlayContent}><GrydIcon name="search" size={16} color={c.darkInk} /></View>
          <Text style={s.placeName}>{cameraIntent.current === 'gps' && position ? text('Autour de moi', 'Around me') : cityName ?? 'France'}</Text>
        </Pressable>
      </View>
      {/* LA PORTE DE COMPTE, SUR LA CARTE, SANS OUVRIR UNE FEUILLE.
          Elle n'existe que si un backend peut l'honorer : sans lui, /sign-in
          renverrait à la carte, et ce serait un bouton mort. On ne cache pas la
          porte pour autant, on DIT pourquoi elle n'est pas franchissable. */}
      {accountDoorOpen ? <View style={s.accountCard}>
        <MapTranslucent2026 tone="dark" radius={20} />
        <View style={[s.overlayContent, s.accountBody]}>
          <View style={s.accountHead}>
            <Text style={s.accountTitle}>{text('Garde tes terrains', 'Keep your terrain')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={text('Masquer la proposition de compte', 'Dismiss account prompt')}
              onPress={closeAccountDoor} style={({ pressed }) => [s.accountClose, pressed && s.pressed]}>
              <GrydIcon name="close" size={16} color={c.darkInk} />
            </Pressable>
          </View>
          <Text style={s.accountLine}>{text('Sans compte, tes sorties restent sur cet appareil et ne prennent aucun terrain.', 'Without an account your outings stay on this device and take no terrain.')}</Text>
          {configured ? <>
            <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={({ pressed }) => [s.accountCta, pressed && s.pressed]}>
              <Text style={s.accountCtaText}>{text('Créer mon compte', 'Create my account')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={({ pressed }) => [s.accountSecondary, pressed && s.pressed]}>
              <Text style={s.accountSecondaryText}>{text('ou me connecter', 'or sign in')}</Text>
            </Pressable>
          </> : <Text style={s.accountState}>{text('Serveur non configuré sur ce build', 'Server not configured on this build')}</Text>}
        </View>
      </View> : null}
    </View>
    <View style={[s.sports, { top: insets.top + 8 }]}>
      <MapActivitySwitch2026 activity={activity} onChange={setActivity}
        labels={{ group: text('Sport sur la carte', 'Map activity'), run: text('Course', 'Run'), bike: text('Vélo', 'Ride') }} />
    </View>
    <View pointerEvents="box-none" style={[s.tools, { bottom }]}>
      <MapControl icon="layers" label={text('Couches', 'Layers')} onPress={() => setSheet('layers')} />
      <MapControl icon="route" label={text('Préparer un parcours', 'Plan a route')} onPress={() => router.push(`/route-planner?activity=${activity}`)} />
      {mapReady && <MapControl icon="location" disabled={locating} label={locating ? text('Localisation en cours', 'Locating') : text('Me recentrer', 'Find my location')} onPress={() => void locate(true)} />}
    </View>
    <View pointerEvents="box-none" style={[s.overlayAnchor, { bottom, maxHeight: overlayHeight }]}>
      <ScrollView style={s.overlayScroll} contentContainerStyle={s.overlayStack} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ─── LES QUATRE ÉTATS DU TERRITOIRE, UN SEUL À LA FOIS ───────────
            Pas connecté, en cours de lecture, échec et vide RÉEL rendaient la
            même carte muette : impossible de distinguer « GRYD ne sait pas » de
            « il n'y a rien ici ». Le vide a sa phrase (cahier G03). L'état de
            lecture ne se montre que quand il n'y a encore rien à voir — sinon
            il clignoterait à chaque déplacement de carte. */}
        {/* PAS DEUX FOIS LA MÊME PHRASE. Tant que la porte de compte est ouverte
            au-dessus, elle dit déjà tout, et mieux : cet avis ne se rend que
            lorsqu'elle a été fermée. Il RESTE, parce que sans lui l'état « pas
            connecté » se confondrait avec « le quartier est vide » : sans
            session, `useOwnership` ne lit RIEN (aucun appel), il ne peut donc
            pas conclure au vide. Et il est cliquable : la porte se retrouve. */}
        {ownership.signedOut
          ? accountDoorOpen ? null : configured
            ? <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={({ pressed }) => [s.notice, pressed && s.pressed]}><MapTranslucent2026 tone="dark" radius={16} /><Text style={s.noticeText}>{text('Terrains masqués sans compte · Créer mon compte', 'Terrain hidden without an account · Create my account')}</Text></Pressable>
            : <View style={s.notice}><MapTranslucent2026 tone="dark" radius={16} /><Text style={s.noticeText}>{text('Terrains masqués sans compte · Serveur non configuré sur ce build', 'Terrain hidden without an account · Server not configured on this build')}</Text></View>
          : ownership.failed
            ? <Pressable accessibilityRole="button" style={s.notice} onPress={ownership.reload}><MapTranslucent2026 tone="dark" radius={16} /><Text style={s.noticeText}>{text('Terrains indisponibles · Réessayer', 'Terrains unavailable · Retry')}</Text></Pressable>
            : ownership.loading && ownership.features.length === 0
              ? <View style={s.notice}><MapTranslucent2026 tone="dark" radius={16} /><Text style={s.noticeText}>{text('Lecture des terrains…', 'Loading terrain…')}</Text></View>
              : ownership.features.length === 0
                ? <View style={s.notice}><MapTranslucent2026 tone="dark" radius={16} /><Text style={s.noticeText}>{text('Le quartier est à découvrir.', 'This neighbourhood is yours to discover.')}</Text></View>
                : null}
        {choice.failed && !recording ? <Pressable accessibilityRole="button" onPress={() => setSheet('layers')} style={s.notice}><MapTranslucent2026 tone="dark" radius={16} /><Text style={s.noticeText}>{text('Préférences indisponibles · Réessayer', 'Preferences unavailable · Retry')}</Text></Pressable> : null}
        {(locationState === 'denied' || locationState === 'unavailable') && <Pressable accessibilityRole="button" onPress={() => {
          if (locationState === 'denied' && !locationCanAsk && Platform.OS !== 'web') void Linking.openSettings();
          else if (locationState === 'denied' && !locationCanAsk) router.push('/map/search');
          else void locate(true);
        }} style={s.notice}><MapTranslucent2026 tone="dark" radius={16} /><Text style={s.noticeText}>{locationState === 'denied'
          ? locationCanAsk ? text('Localisation refusée · Autoriser', 'Location denied · Allow') : Platform.OS === 'web' ? text('Localisation refusée · Choisir une ville', 'Location denied · Choose a city') : text('Localisation refusée · Réglages', 'Location denied · Settings')
          : text('Position indisponible · Réessayer', 'Location unavailable · Retry')}</Text></Pressable>}
        {selected ? <View style={s.selectedSurface}><MapTranslucent2026 tone="dark" radius={20} /><MotionReveal2026 identity={selectedId ?? ''} style={s.overlayContent}>
          <View style={s.selectedPanel}>
            <View style={s.panelHeading}><Text style={s.eyebrow}>{territoryOwnerLabel2026(selected, fr)}</Text>
              <Pressable onPress={() => setSelectedId(null)} accessibilityRole="button" accessibilityLabel={text('Fermer la zone', 'Close zone')} style={s.close}><GrydIcon name="close" size={18} color={c.darkInk} /></Pressable></View>
            <Text style={s.areaValue}>{area(selected.properties.areaM2)} <Text style={s.unit}>km²</Text></Text>
            <Text style={s.context}>{text('Surface actuelle · Propriété individuelle', 'Current area · Individual ownership')}{selected.properties.owner.crew ? ` · ${text('Membre de', 'Member of')} ${selected.properties.owner.crew.name}` : ''}</Text>
            {!selected.properties.owner.identityAvailable && <Text style={s.context}>{text('Identité non disponible.', 'Identity unavailable.')}</Text>}
            <Text style={s.context}>{text('Capture initiale', 'Initial capture')} : {area(selected.properties.capturedAreaM2)} km². {text('La sortie reste au journal quand le terrain change.', 'The outing stays in the journal when terrain changes.')}</Text>
            {/* G04 : « surface et dernière mise à jour ». La date est validée par
                le contrat depuis toujours (`controlledSince`) et n'était peinte
                nulle part — une possession sans date ne dit pas si elle tient
                depuis ce matin ou depuis six semaines. */}
            <Text style={s.context}>{text('Terrain pris le ', 'Held since ')}{new Date(selected.properties.controlledSince).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
        </MotionReveal2026></View> : null}
      </ScrollView>
    </View>
    {/* LA BARRE N'EST PLUS MONTÉE ICI (10/09/2026). La Carte rendait sa PROPRE
        GrydNavBar avec l'action Courir dedans, ce qui donnait aux autres
        onglets une barre différente et sans départ. Une seule barre existe
        désormais, montée par `app/(tabs)/_layout.tsx`, et elle calcule son
        action elle-même (`features/nav/useRunAction2026`) : libellé, cible,
        attente et provenance analytique, à l'identique de ce qui vivait ici. */}
    <Modal visible={sheet !== null} transparent animationType={motion ? "slide" : "none"} onRequestClose={() => setSheet(null)}>
      <View style={s.modalRoot}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={text('Fermer les couches', 'Close layers')} onPress={() => setSheet(null)} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24, maxHeight: height * 0.85 }]}>
          <View style={s.grabber} />
          <View style={s.titleRow}><Text style={s.sheetTitle}>{sheet === 'layers' ? text('Couches', 'Layers') : text('Terrains', 'Terrains')}</Text><Pressable style={s.close} onPress={() => setSheet(null)} accessibilityRole="button" accessibilityLabel={text('Fermer', 'Close')}><GrydIcon name="close" size={19} /></Pressable></View>
          <ScrollView>
            {sheet === 'layers' ? <>
              {/* Sans compte, la règle n'est pas « une sortie d'essai » : c'est
                  que RIEN n'est capturé, jamais. « Ta première sortie peut se
                  faire sans compte » laissait croire à une limite d'essai — et
                  cachait la seule chose qui compte ici. La porte n'existe que
                  si un backend peut l'honorer (sans lui, /sign-in renvoie à la
                  carte : un bouton mort). */}
              {ownership.signedOut ? (configured ? <Pressable accessibilityRole="button" onPress={() => { setSheet(null); router.push('/sign-in'); }} style={s.optionRow}><View style={{flex:1,gap:4}}><Text style={s.optionText}>{text('Retrouver mes terrains', 'Find my territories')}</Text><Text style={s.sheetStatus}>{text('Sans compte, tes sorties restent sur cet appareil et ne prennent aucun terrain.', 'Without an account your outings stay on this device and take no terrain.')}</Text></View><GrydIcon name="chevronRight" size={18} /></Pressable> : <Text style={s.sheetNote}>{text('Sans compte, tes sorties restent sur cet appareil et ne prennent aucun terrain.', 'Without an account your outings stay on this device and take no terrain.')}</Text>) : ownership.loading ? <Text style={s.sheetNote}>{text('Chargement des terrains…', 'Loading territories…')}</Text> : !ownership.failed && ownership.features.length === 0 ? <Text style={s.sheetNote}>{text('Aucun terrain partagé dans cette vue.', 'No shared terrain in this view.')}</Text> : null}
              {!mapReady && <Text style={s.sheetNote}>{text('Le fond de carte n’est pas disponible sur cette version de l’app. Les terrains et les tracés restent affichés, sans fond.', 'The map background is unavailable on this build. Terrain and routes are still drawn, without a base map.')}</Text>}
              {mapReady && <View style={s.basemaps}>{(['color', 'dark', 'satellite'] as const).map((key, i) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: basemap === key }} aria-checked={basemap === key} onPress={() => setBasemap(key)} style={[s.basemap, basemap === key && s.basemapSelected]}>
                <View style={[s.swatch, { backgroundColor: key === 'dark' ? c.carbon : key === 'satellite' ? c.rival : c.surfaceMuted }]}><GrydIcon name="map" size={32} color={key === 'color' ? c.ink : c.darkInk} /></View>
                <Text style={s.optionText}>{[text('Clair', 'Light'), text('Noir', 'Dark'), 'Satellite'][i]}</Text>
              </Pressable>)}</View>}
              <Text style={s.sheetNote}>{text('Une nuance par propriétaire. Trait plein : solo ou affiliation masquée. Pointillés : membre d’un crew. Chaque terrain reste individuel.', 'A shade per owner. Solid line: solo or hidden affiliation. Dashes: crew member. Every territory remains individually owned.')}</Text><Text style={s.sheetNote}>{text('Afficher les terrains', 'Show terrain')}</Text>
              {(['mine','crew','others'] as const).map(role => { /* LOT K — la ligne « crew » PORTE LE NOM du crew quand le serveur l'a rendu (`get_ownership_2026`, contrat 2026.3). « Membres de mon crew » est un rôle ; « Membres des Quais » est le sien. Aucune lecture ajoutée : ce nom était déjà chargé, il ne servait qu'à la note du bas. */
                const label = role === 'crew' && ownership.crew ? `${text('Membres de', 'Members of')} ${ownership.crew.name}` : territoryRoleLabel2026(role, fr);
                return <View key={role} style={s.optionRow}><View style={s.filterLabel}><RoleLine role={role} light /><Text style={s.optionText}>{label}</Text></View><Switch value={roleFilters[role]} onValueChange={value => setRoleFilters(current => ({ ...current, [role]: value }))} accessibilityLabel={label} trackColor={{ true: c.ink, false: c.border }} thumbColor={c.surface} /></View>; })}
              {session && <Text style={s.sheetNote}>{ownership.signedOut ? text('Connecte-toi pour retrouver ton crew.', 'Sign in to find your crew.') : ownership.loading ? text('Lecture du crew…', 'Loading crew…') : ownership.failed ? text('Crew indisponible avec les terrains.', 'Crew unavailable with terrain.') : ownership.crew ? `${text('Crew actuel', 'Current crew')} : ${ownership.crew.name}. ${text('Chaque terrain appartient à son joueur.', 'Each terrain belongs to its player.')}` : text('Aucun crew actif trouvé pour ton compte.', 'No active crew found for your account.')}</Text>}
              {session && <>
              <View style={s.optionRow}><Text style={s.optionText}>{text('Terrain partagé au départ', 'Share terrain when starting')}</Text><Switch value={choice.shared} disabled={!session || !choice.ready || choice.saving} onValueChange={value => void choice.save(value)} accessibilityLabel={text('Participer à la carte partagée', 'Participate in shared terrain')} trackColor={{ true: c.ink, false: c.border }} thumbColor={c.surface} /></View>
              <Text style={s.sheetNote}>{text('Ta trace reste privée. Une zone publiée peut révéler une partie du parcours et être reprise. Les zones personnelles protégées restent privées.', 'Your route stays private. Published terrain can reveal part of the route and be reclaimed. Personal protected places stay private.')}</Text>
              </>}
              {choice.failed ? <Pressable accessibilityRole="button" style={s.optionRow} onPress={() => void choice.reload()}><Text style={s.optionText}>{text('Charger le choix de confidentialité · Réessayer', 'Load privacy choice · Retry')}</Text></Pressable> : choice.saveFailed ? <Text accessibilityRole="alert" style={s.sheetNote}>{text('Choix non enregistré. Réessaie.', 'Choice not saved. Try again.')}</Text> : null}
              <View style={s.optionRow}><Text style={s.optionText}>{text('Atténuer les autres terrains', 'Soften other terrains')}</Text><Switch accessibilityLabel={text('Atténuer les autres terrains', 'Soften other terrains')} value={attenuate} onValueChange={setAttenuate} trackColor={{ true: c.ink, false: c.border }} thumbColor={c.surface} ios_backgroundColor={c.border} /></View>
              <Pressable style={s.optionRow} onPress={() => setSheet('list')} accessibilityRole="button"><Text style={s.optionText}>{text('Terrains visibles', 'Visible terrains')}</Text><GrydIcon name="chevronRight" size={19} /></Pressable>
              {/* ADR-013 §2.1 — la SEULE porte du classement de commune. Elle vit
                  dans la feuille (toujours atteignable en un geste) et non dans le
                  panneau de zone, qui n'existe que si un terrain est sélectionné :
                  la porte disparaîtrait exactement quand la commune est vide, or
                  c'est là que l'écran a le plus à dire (« Premier ici »). */}
              <Pressable style={s.optionRow} onPress={() => { setSheet(null); router.push('/classement-commune'); }} accessibilityRole="button"><Text style={s.optionText}>{t(CClassement.entreeCarte)}</Text><GrydIcon name="chevronRight" size={19} /></Pressable>
              <Pressable style={s.optionRow} onPress={() => { setSheet(null); router.push('/calcul-zones'); }} accessibilityRole="button"><Text style={s.optionText}>{text('Comprendre les boucles', 'How loops work')}</Text><GrydIcon name="chevronRight" size={19} /></Pressable>
            </> : ownership.loading ? <Text style={s.sheetNote}>{text('Chargement des terrains…', 'Loading terrains…')}</Text> : ownership.failed ? <Pressable style={s.optionRow} onPress={ownership.reload}><Text style={s.optionText}>{text('Réessayer', 'Try again')}</Text></Pressable> : ownership.features.length === 0 ? <Text style={s.sheetNote}>{ownership.signedOut ? text('Connecte-toi pour voir les terrains partagés.', 'Sign in to see shared terrains.') : text('Aucun terrain partagé dans cette zone.', 'No shared terrain in this area.')}</Text> : visibleFeatures.map(f => <Pressable key={f.properties.id} style={s.optionRow} onPress={() => { setSelectedId(f.properties.id); setSheet(null); }} accessibilityRole="button"><Text style={s.optionText}>{territoryOwnerLabel2026(f, fr)}</Text><Text style={s.optionText}>{area(f.properties.areaM2)} km²</Text></Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}
function RoleLine({ role, light = false }: { role: TerritoryRole2026; light?: boolean }) {
  const color = role === 'mine' ? (light ? c.ink : c.accent) : role === 'crew' ? (light ? c.ink : c.darkInk) : c.rival;
  return <Svg width={20} height={12} viewBox="0 0 20 12"><Line x1={1} x2={19} y1={6} y2={6} stroke={color} strokeWidth={role === 'mine' ? 3 : role === 'crew' ? 2 : 1} strokeDasharray={role === 'crew' ? '4 3' : undefined} strokeLinecap="round" /></Svg>;
}
function MapControl({ icon, label, onPress, disabled = false, selected }: { icon: GrydIconName; label: string; onPress(): void; disabled?: boolean; selected?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  return <View style={s.controlSlot}>
    <Pressable accessibilityRole={selected === undefined ? 'button' : 'tab'} accessibilityLabel={label}
      accessibilityState={{ disabled, selected }} aria-disabled={disabled} aria-selected={selected} disabled={disabled}
      onFocus={() => { setFocused(true); setHintVisible(true); }} onBlur={() => { setFocused(false); setHintVisible(false); }} onHoverIn={() => setHintVisible(true)} onHoverOut={() => setHintVisible(false)}
      onPress={() => { setHintVisible(false); onPress(); }} style={({ pressed }) => [s.mapControl, focused && { borderColor: selected ? c.ink : c.surface }, disabled && s.controlDisabled, pressed && s.pressed]}>
      <MapTranslucent2026 tone={selected ? 'light' : 'dark'} radius={22} />
      <View style={s.overlayContent}><GrydIcon name={icon} size={21} active={selected} color={selected ? c.ink : c.darkInk} /></View>
    </Pressable>
    {Platform.OS === 'web' && hintVisible ? <View pointerEvents="none" style={s.tooltip}><MapTranslucent2026 tone="dark" radius={12} /><Text style={s.tooltipText}>{label}</Text></View> : null}
  </View>;
}
const s = StyleSheet.create({
  overlayContent: { zIndex: 1 },
  root: { flex: 1, backgroundColor: c.carbon, overflow: 'hidden' }, map: { ...StyleSheet.absoluteFillObject },
  header: { position: 'absolute', left: 16, right: 76, alignItems: 'flex-start' },
  topRow: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  // Ni fond ni rayon : le G est chartreuse sur la carte, rien derrière.
  brand: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  place: { flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  placeName: { zIndex: 1, fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18, color: c.darkInk, flex: 1, flexShrink: 1 },
  sports: { position: 'absolute', right: 16, zIndex: 4 }, tools: { position: 'absolute', right: 16, gap: 8, zIndex: 4 },
  controlSlot: { position: 'relative', zIndex: 2 }, mapControl: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' }, controlDisabled: { opacity: .6 },
  tooltip: { position: 'absolute', right: 52, top: 0, minHeight: 44, width: 156, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }, tooltipText: { zIndex: 1, fontFamily: fonts.textMedium, color: c.darkInk, fontSize: 12, lineHeight: 17 },
  // Le point chartreuse (positionHalo / positionDot / approximatePosition) a
  // disparu avec lui : c'est `ui/game/MePinMarker2026` qui peint « moi », et il
  // porte sa géométrie, pointe comprise.
  accountCard: { marginTop: 8, width: '100%', maxWidth: 360, borderRadius: 20 },
  accountBody: { padding: 12, gap: 6 },
  accountHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  accountTitle: { flex: 1, fontFamily: fonts.displayMedium, fontSize: 15, lineHeight: 21, color: c.darkInk },
  accountClose: { width: 44, height: 44, marginTop: -12, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  accountLine: { fontFamily: fonts.text, fontSize: 12, lineHeight: 17, color: c.darkMuted },
  accountCta: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  accountCtaText: { fontFamily: fonts.textSemi, fontSize: 14, lineHeight: 18, color: c.ink },
  accountSecondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  accountSecondaryText: { fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 17, color: c.darkInk, textDecorationLine: 'underline' },
  accountState: { fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 17, color: c.darkInk },
  overlayAnchor: { position: 'absolute', left: 16, right: 76, alignItems: 'flex-start' }, overlayScroll: { maxWidth: 360, width: '100%', flexGrow: 0 }, overlayStack: { gap: 8 },
  notice: { minHeight: 44, padding: 12, borderRadius: 16 }, noticeText: { zIndex: 1, color: c.darkInk, fontFamily: fonts.text, fontSize: 12, lineHeight: 17 },
  selectedSurface: { borderRadius: 20, paddingHorizontal: 12, paddingBottom: 14, paddingTop: 4 }, selectedPanel: { gap: 7 }, panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  eyebrow: { flex: 1, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.darkInk }, areaValue: { fontFamily: fonts.displayRegular, fontSize: 28, letterSpacing: -.8, color: c.darkInk }, unit: { fontSize: 13, color: c.darkInk }, context: { color: c.darkInk, fontFamily: fonts.text, fontSize: 11, lineHeight: 16 }, pressed: { opacity: .7 },
  filterLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetStatus: { fontFamily: fonts.text, color: c.muted, fontSize: 12, lineHeight: 18 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim }, sheet: { padding: 24, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, grabber: { width: 32, height: 3, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 20 }, titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { fontFamily: fonts.displayMedium, fontSize: 20, color: c.ink }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, sheetNote: { fontFamily: fonts.text, color: c.muted, fontSize: 14, lineHeight: 21, paddingVertical: 16 }, basemaps: { flexDirection: 'row', gap: 10, marginVertical: 16 }, basemap: { flex: 1, gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 5, paddingBottom: 12, alignItems: 'center' }, basemapSelected: { borderColor: c.ink }, swatch: { height: 52, width: '100%', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, optionRow: { minHeight: 56, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, optionText: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 14, flexShrink: 1 },
});
