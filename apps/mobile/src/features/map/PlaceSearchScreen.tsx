/** Place search only reframes the map. Local queries and history never publish a position. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts, refonteColors as c } from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { C } from '../../i18n/catalog/placeSearch';
import { useLocale, useT } from '../../i18n/store';
import { GrydIcon } from '../../ui/gryd';
import { defineCatalog } from '../../i18n/types';
import { ProfilePage } from '../refonte/ProfilePrimitives';
import { goBack } from '../../lib/nav';
import { useCityCatalog } from '../city/useCityCatalog';
import { usePrivacyZones } from '../privacy/zonesStore';
import { checkForegroundPermission, getCurrentPositionOnce } from '../refonte/location';
import { PLACE_DETAIL_ZOOM, type LatLngPoint } from './realAnchors';
import { requestPlaceFocus } from './placeFocus';
import { usePlaceRecents } from './placeRecents';
import {
  admitToRecents,
  formatPlaceDistanceKm,
  nearbyPlaceEntries,
  placeSearchPhase,
  searchPlaces,
  toPlaceResults,
  type PlaceEngineState,
  type PlacePrivacyKnowledge,
  type PlaceResult,
} from './placeSearch';

const UI = defineCatalog({
  nearby: { fr: 'À proximité', en: 'Nearby', es: 'Cerca', de: 'In der Nähe', pt: 'Por perto' },
  recents: { fr: 'Récents', en: 'Recent', es: 'Recientes', de: 'Zuletzt', pt: 'Recentes' },
  results: { fr: 'Résultats', en: 'Results', es: 'Resultados', de: 'Ergebnisse', pt: 'Resultados' },
  noPosition: { fr: 'Position indisponible.', en: 'Location unavailable.', es: 'Ubicación no disponible.', de: 'Standort nicht verfügbar.', pt: 'Localização indisponível.' },
  about: { fr: 'À propos de la recherche', en: 'About search', es: 'Acerca de la búsqueda', de: 'Über die Suche', pt: 'Sobre a busca' },
});

/** D'où vient le lieu choisi — vocabulaire FERMÉ, miroir de l'event. */
type PickSource = 'nearby' | 'recent' | 'query';

export function PlaceSearchScreen() {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // ── La source des lieux : l'index déjà construit ailleurs ────────────────
  // `useCityCatalog` fusionne le référentiel EMBARQUÉ (toujours là, hors ligne
  // compris) et ce que le serveur dit des villes OUVERTES. On ne le réécrit pas.
  const catalog = useCityCatalog();
  /**
   * A-t-on RÉELLEMENT lu `city_zones` ? Sans cette lecture, toutes les villes
   * ressortent `referenced` de l'index — l'afficher tel quel peindrait « pas
   * encore un terrain de jeu » SUR PARIS, qui l'est. Une puce est une
   * affirmation ; sans lecture, il n'y en a aucune.
   */
  const serverRead = catalog.state === 'ready';

  /**
   * État du MOTEUR. Le référentiel est embarqué, donc `ready` dès que l'index
   * porte au moins une ville. `unavailable` n'est pas décoratif : un paquet
   * illisible rendrait un index VIDE, et l'écran doit alors dire « recherche
   * impossible » — pas « aucun lieu ne correspond ».
   */
  const engine: PlaceEngineState =
    catalog.index.open.length + catalog.index.referenced.length > 0 ? 'ready' : 'unavailable';

  // ── Position : LUE seulement si la permission est DÉJÀ accordée ──────────
  /**
   * On ne déclenche AUCUNE demande de permission depuis cet écran. Le GO la
   * demande, à sa place et pour une raison que le joueur comprend ; la faire
   * surgir sur une recherche de lieu serait la demander pour un service qu'on
   * peut rendre sans elle. Trois issues, et une seule autorise « proches ».
   */
  const [position, setPosition] = useState<LatLngPoint | null>(null);
  const [positionRead, setPositionRead] = useState<'reading' | 'done'>('reading');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const perm = await checkForegroundPermission();
        if (cancelled) return;
        if (perm.status !== 'granted') {
          setPositionRead('done');
          return;
        }
        const fix = await getCurrentPositionOnce();
        if (cancelled) return;
        if (fix) setPosition({ lat: fix.lat, lng: fix.lng });
      } catch {
        // `getCurrentPositionOnce` ne lève pas ; ceinture de plus.
      } finally {
        if (!cancelled) setPositionRead('done');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Zones floutées : la règle de vie privée de l'historique ──────────────
  const zonesRead = usePrivacyZones();
  /**
   * `PrivacyZonesRead` (5 états d'écran) → ce dont le moteur a besoin (sait /
   * ne sait pas). `no-account` COMPTE comme « su » : les zones sont stockées par
   * compte, donc sans compte il n'en existe aucune à honorer — c'est le même
   * arbitrage que `zonesForPublication` (features/privacy/zones.ts), pas une
   * facilité.
   */
  const privacy: PlacePrivacyKnowledge = useMemo(() => {
    if (zonesRead.status === 'ready') return { known: true, zones: zonesRead.zones };
    if (zonesRead.status === 'no-account') return { known: true, zones: [] };
    return { known: false };
  }, [zonesRead]);

  const recents = usePlaceRecents();

  // ── Les trois listes ─────────────────────────────────────────────────────
  const nearby = useMemo(
    () =>
      toPlaceResults(nearbyPlaceEntries(catalog.index, position), {
        serverRead,
        from: position,
      }),
    [catalog.index, position, serverRead],
  );

  const results = useMemo(
    () => searchPlaces(catalog.index, query, { serverRead, from: position }),
    [catalog.index, query, serverRead, position],
  );

  const phase = placeSearchPhase({ query, engine, results });

  // ── Analytics : l'ÉCRAN, puis le seul instant qui décide ─────────────────
  useEffect(() => {
    screen('map_place_search');
  }, []);

  /**
   * Un lieu est choisi. TROIS effets, dans cet ordre, et aucun de plus :
   *  1. la carte reçoit sa demande de cadrage (le seul geste de l'écran) ;
   *  2. le lieu entre dans l'historique — SI la règle de vie privée l'admet ;
   *  3. l'event part, SANS le terme cherché ni le lieu ni ses coordonnées.
   */
  const pick = useCallback(
    (place: PlaceResult, source: PickSource) => {
      haptics.light();
      requestPlaceFocus(place.center, PLACE_DETAIL_ZOOM, place.label);
      if (admitToRecents(place.center, privacy) === 'record') {
        recents.remember({
          cityId: place.cityId,
          label: place.label,
          lat: place.center.lat,
          lng: place.center.lng,
        });
      }
      track(EVENTS.placeSearchResultPicked, { source });
      goBack('/(tabs)', { silent: true });
    },
    [privacy, recents],
  );

  const clearField = () => {
    haptics.light();
    setQuery('');
  };

  return (
    <ProfilePage title={t(C.screenTitle)} back backHref="/(tabs)">
      <View style={styles.fieldRow}>
        <GrydIcon name="search" size={20} color={c.darkMuted} />
        <TextInput style={styles.field} value={query} onChangeText={setQuery} placeholder={t(C.fieldPlaceholder)} placeholderTextColor={c.darkMuted} accessibilityLabel={t(C.fieldA11y)} autoCorrect={false} autoCapitalize="words" returnKeyType="search" />
        {query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={t(C.clearFieldA11y)} onPress={clearField} style={({ pressed }) => [styles.clear, pressed && styles.pressed]}><GrydIcon name="close" size={18} color={c.darkMuted} /></Pressable> : null}
      </View>
      {phase.kind === 'too-short' ? <Text style={styles.note}>{t(C.queryTooShort, { n: phase.min })}</Text> : null}
      {phase.kind === 'searching' ? <Text style={styles.note}>{t(C.searching)}</Text> : null}
      {phase.kind === 'failed' ? <Text style={styles.blockTitle} accessibilityRole="alert">{t(C.failedTitle)}</Text> : null}
      {phase.kind === 'empty' ? <View style={styles.block}><Text style={styles.blockTitle}>{t(C.noResultTitle)}</Text><Text style={styles.note}>{t(C.noResultBody)}</Text></View> : null}
      {phase.kind === 'results' ? <><Text style={styles.heading}>{t(UI.results)}</Text>{phase.results.map(place => <PlaceRow key={place.cityId} place={place} locale={locale} onPress={() => pick(place, 'query')} />)}</> : null}
      {phase.kind === 'idle' ? <>
        <Text style={styles.heading}>{t(UI.nearby)}</Text>
        {positionRead === 'reading' ? <Text style={styles.note}>{t(C.nearbyLoading)}</Text> : !position ? <View style={styles.locationNote}><GrydIcon name="location" size={18} color={c.darkMuted} /><Text style={styles.note}>{t(UI.noPosition)}</Text></View> : nearby.length === 0 ? <Text style={styles.note}>{t(C.nearbyEmpty)}</Text> : nearby.map(place => <PlaceRow key={place.cityId} place={place} locale={locale} onPress={() => pick(place, 'nearby')} />)}
        <View style={styles.sectionHeading}><Text style={styles.heading}>{t(UI.recents)}</Text>{recents.loaded && recents.items.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={t(C.recentClearA11y)} onPress={() => { haptics.light(); recents.clear(); }} style={({ pressed }) => [styles.clearHistory, pressed && styles.pressed]}><Text style={styles.textButtonLabel}>{t(C.recentClear)}</Text></Pressable> : null}</View>
        {!recents.loaded ? <Text style={styles.note}>{t(C.recentLoading)}</Text> : recents.items.length === 0 ? <Text style={styles.note}>{t(C.recentEmpty)}</Text> : recents.items.map(recent => {
          // Recent history never replays a claim about current territory access.
          const place: PlaceResult = { cityId: recent.cityId, label: recent.label, center: { lat: recent.lat, lng: recent.lng }, openness: 'unknown', distanceKm: null };
          return <PlaceRow key={recent.cityId} place={place} locale={locale} onPress={() => pick(place, 'recent')} />;
        })}
      </> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(value => !value)} style={styles.about}><GrydIcon name="info" size={18} color={c.darkMuted} /><Text style={styles.aboutText}>{t(UI.about)}</Text><GrydIcon name={showDetails ? 'minus' : 'plus'} size={18} color={c.darkMuted} /></Pressable>
      {showDetails ? <View style={styles.details}>
        <Text style={styles.note}>{t(C.coverageNote)}</Text>
        <Text style={styles.note}>{t(C.recentPrivacyNote)}</Text>
        {!position && positionRead === 'done' ? <Text style={styles.note}>{t(C.nearbyNoPosition)}</Text> : null}
        {phase.kind === 'failed' ? <Text style={styles.note}>{t(C.failedBody)}</Text> : null}
      </View> : null}
    </ProfilePage>
  );
}

function PlaceRow({ place, locale, onPress }: { place: PlaceResult; locale: string; onPress: () => void }) {
  const t = useT();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${place.label}, ${t(C.resultOpenA11y)}`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <GrydIcon name="pin" size={20} color={c.darkMuted} />
    <View style={styles.rowCopy}><Text style={styles.rowLabel}>{place.label}</Text>{place.distanceKm !== null ? <Text style={styles.rowMeta}>{t(C.resultDistance, { km: formatPlaceDistanceKm(place.distanceKm, locale) })}</Text> : null}</View>
    <GrydIcon name="arrowUpRight" size={16} color={c.darkMuted} />
  </Pressable>;
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4, gap: 10, borderRadius: 24, backgroundColor: c.darkSurface, marginBottom: 8 },
  field: { flex: 1, minHeight: 48, paddingVertical: 12, fontFamily: fonts.text, fontSize: 14, color: c.darkInk }, clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: 22, marginBottom: 8, fontFamily: fonts.displayRegular, fontSize: 17, lineHeight: 23, color: c.darkInk }, block: { paddingVertical: 18, gap: 6 }, blockTitle: { marginTop: 14, fontFamily: fonts.displayRegular, fontSize: 18, lineHeight: 24, color: c.darkInk }, sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 62, paddingVertical: 13, borderBottomWidth: 1, borderColor: c.darkSurfaceMuted }, rowCopy: { flex: 1, gap: 4 }, rowLabel: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.darkInk }, rowMeta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted },
  note: { fontFamily: fonts.text, fontSize: 12, lineHeight: 19, color: c.darkMuted }, locationNote: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearHistory: { minHeight: 44, justifyContent: 'center' }, textButtonLabel: { fontFamily: fonts.text, fontSize: 11, color: c.darkMuted }, about: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, borderTopWidth: 1, borderColor: c.darkSurfaceMuted }, aboutText: { flex: 1, fontFamily: fonts.text, fontSize: 12, color: c.darkMuted }, details: { gap: 12, paddingBottom: 16 }, pressed: { opacity: 0.7 },
});
