import { GrydSwitch as Switch } from '../../ui/gryd/GrydSwitch';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator, Modal, PixelRatio, Platform, Pressable, ScrollView,
  StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useLocale } from '../../i18n/store';
import { EVENTS, screen, track } from '../../lib/analytics';
import { goBack } from '../../lib/nav';
import { GrydIcon } from '../../ui/gryd/GrydIcon';
import { GrydMark } from '../../ui/gryd/GrydMark';
import { usePrivacyPrefs } from '../privacy/store';
import { usePrivacyZones } from '../privacy/zonesStore';
import { zonesForPublication } from '../privacy/zones';
import { protectedShareSegments2026 } from './shareTrace2026';
import { getShareRun, isShareRunCurrent2026, shareRunRevision2026, subscribeShareRun2026, type ShareRunData } from './shareRun';
import { useResultOwner2026 } from '../run/useResultOwner2026';
import { shareAsImage, shareStickerImage } from './shareActions';
import { shareDeliveryClaim } from './shareOutcome';
import { ShareExportStage } from './ShareExportStage';
import { SharePoster2026 } from './SharePoster2026';
import { STUDIO_COMPOSITIONS, type StudioComposition } from './StudioComposition2026';
import { useGrydPlusAccess } from '../premium';
import { PRE_SALE_INCLUDED_COPY_2026 } from '../premium/planCopy2026';
import { generateRunFilm2026, getRunFilmCompatibility2026, releaseRunFilm2026, type RunFilmCompatibility2026 } from './film/generateRunFilm2026';
import { RunFilmPreview2026 } from './film/RunFilmPreview2026';
import { useProfileProgress } from '../refonte/ProfileProgress';
import { useCommercialCollections2026 } from '../premium/useCommercialCollections2026';
import { requestedStudioObject2026, clearStudioObject2026 } from './studioObjectSelection2026';
import { resolveStudioObject2026, studioObjectKey2026, studioRewardLabel2026, type StudioObjectRequest2026 } from './studioObjects2026';
import { StudioObjectArtwork2026 } from './StudioObjectArtwork2026';
import { verifyStudioObject2026 } from './verifyStudioObject2026';
import {
  buildShareFacts2026, exportLayout2026, SHARE_EXPORT_FORMATS_2026, SHARE_FAMILIES_2026,
  shareFamilyCapability2026, type ShareFamily2026, type ShareFormat2026, type ShareTheme2026,
} from './shareModel2026';

export default function ShareStudio2026() {
  const { ownerId, epoch } = useResultOwner2026();
  const revision = useSyncExternalStore(subscribeShareRun2026, shareRunRevision2026, shareRunRevision2026);
  const run = getShareRun(ownerId);
  const locale = useLocale() === 'en' ? 'en' : 'fr';
  const insets = useSafeAreaInsets();
  useEffect(() => { screen('partage', { armed: run !== null, ruleset: '2026.1' }); }, [run]);
  if (run && ownerId !== undefined) return <ReadyStudio key={`${epoch}:${revision}`} run={run} locale={locale} ownerId={ownerId} />;
  return <View style={s.root}>
    <View style={[s.header, { paddingTop: insets.top + 8 }]}><BackButton locale={locale} /><Text style={s.headerTitle}>Studio</Text><GrydMark size={20} color={c.darkInk} /></View>
    <View style={s.emptyContent}>
      <View style={s.emptyHeading}><GrydIcon name="share" size={24} color={c.darkInk} /><Text style={s.emptyTitle}>{locale === 'fr' ? 'Choisir une sortie' : 'Choose an activity'}</Text></View>
      <Text style={s.body}>{locale === 'fr' ? 'Ouvre une sortie de ton journal pour créer son affiche.' : 'Open an activity in your journal to create its poster.'}</Text>
      <Pressable accessibilityRole="button" onPress={() => goBack('/(tabs)/profil')} style={[s.primary, { marginTop: 20 }]}>
        <Text style={s.primaryText}>{locale === 'fr' ? 'Ouvrir le journal' : 'Open journal'}</Text><GrydIcon name="arrowUpRight" color={c.ink} size={18} />
      </Pressable>
    </View>
  </View>;
}

function BackButton({ locale }: { locale: 'fr' | 'en' }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={locale === 'fr' ? 'Retour' : 'Back'}
    onPress={() => goBack('/(tabs)/profil')} style={s.iconButton}>
    <GrydIcon name="chevronLeft" color={c.darkInk} size={22} />
  </Pressable>;
}

function ReadyStudio({ run, locale, ownerId }: { run: ShareRunData; locale: 'fr' | 'en'; ownerId: string | null }) {
  const mounted = useRef(true);
  const isCurrent = () => mounted.current && isShareRunCurrent2026(run, ownerId);
  const copy = (fr: string, en: string) => locale === 'fr' ? fr : en;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [baseFamily, setFamily] = useState<ShareFamily2026>('map');
  const [objectRequest,setObjectRequest]=useState<StudioObjectRequest2026|null>(()=>requestedStudioObject2026(ownerId));
  useEffect(()=>{clearStudioObject2026();},[]);
  const progress=useProfileProgress(); const commercial=useCommercialCollections2026();
  const object=resolveStudioObject2026(objectRequest,progress.data?.ownedRewards??[],commercial.rows,progress.data?.collections??[]);
  const objectPending=!!objectRequest && (objectRequest.kind==='season'?progress.status==='loading':commercial.status==='loading');
  const objectBlocked=!!objectRequest&&!object;
  const family:ShareFamily2026=object?.layout==='motion'?'film':object?.layout==='sticker'?'sticker':object?.layout==='photo'?'photo':object?'map':baseFamily;
  const [format, setFormat] = useState<ShareFormat2026>('story');
  const [theme, setTheme] = useState<ShareTheme2026>('dark');
  const [composition, setComposition] = useState<StudioComposition>('classic');
  const [filmCompatibility, setFilmCompatibility] = useState<RunFilmCompatibility2026 | null>(null);
  const access = useGrydPlusAccess();
  const abortFilm = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abortFilm.current?.abort(); }; }, []);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [photoRevision, setPhotoRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const exportRef = useRef<View>(null);
  const busyRef = useRef(false);
  const { prefs, loading: prefsLoading, update } = usePrivacyPrefs();
  const zones = usePrivacyZones();
  const publication = useMemo(() => zonesForPublication(zones), [zones]);
  const segments = useMemo(() => {
    return protectedShareSegments2026(run.traceSegments ?? [run.card.trace], {
      resolved: !prefsLoading && publication.ready,
      maskEndpoints: prefs.maskEndpoints,
      zones: publication.ready ? publication.zones : [],
    });
  }, [run, publication, prefsLoading, prefs.maskEndpoints]);
  const facts = useMemo(() => buildShareFacts2026(run, locale), [run, locale]);
  useEffect(() => {
    let alive = true; setFilmCompatibility(null);
    void getRunFilmCompatibility2026(format).then(value => { if (alive) setFilmCompatibility(value); });
    return () => { alive = false; };
  }, [format]);
  const capability = shareFamilyCapability2026(family, photoUri !== null || object?.layout==='photo', filmCompatibility?.available === true);
  const effectiveComposition = family === 'map' && !object ? composition : 'classic';
  const paidComposition = effectiveComposition !== 'classic';
  const previewHeight = Math.max(240, Math.min(450, height * 0.52));
  const previewWidth = Math.min(width - 40, 350, previewHeight * SHARE_EXPORT_FORMATS_2026[format].width / SHARE_EXPORT_FORMATS_2026[format].height);
  const layout = exportLayout2026(format, PixelRatio.get());
  const formatNames = { story: 'Story', portrait: 'Portrait', square: copy('Carré', 'Square') };
  const familyNames = { map: copy('Trace', 'Route'), photo: 'Photo', sticker: 'Sticker', film: 'Replay' };
  const compositionNames = { classic: copy('Classique', 'Classic'), index: 'Index', contour: 'Contour', tempo: 'Tempo', editorial: copy('Édito', 'Editorial') };
  const familyIcons = { map: 'route', photo: 'camera', sticker: 'collection', film: 'play' } as const;
  const tracePending = prefsLoading || (!publication.ready && publication.reason === 'loading');
  const traceError = !publication.ready && publication.reason === 'error';
  useEffect(() => { track(EVENTS.shareCardGenerated, { family: 'map', ruleset: '2026.1' }); }, []);

  function chooseFamily(value: ShareFamily2026) {
    if (busy || !isCurrent()) return;
    setFamily(value);
    setObjectRequest(null); clearStudioObject2026();
    setNotice(null);
    track(EVENTS.shareTemplateChanged, { template: value });
  }
  async function pickPhoto() {
    if (busyRef.current || !isCurrent()) return;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    try {
      // System picker: selected asset only, no full library permission or EXIF.
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false });
      if (!isCurrent() || result.canceled || !result.assets[0]) return;
      setPhotoReady(false);
      setPhotoRevision(value => value + 1);
      setPhotoUri(result.assets[0].uri);
      setFamily('photo');
    } catch {
      if (isCurrent()) setNotice(copy('La photothèque ne peut pas s’ouvrir. La carte reste disponible.', 'The photo library could not open. Your map is still available.'));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function share() {
    if (!isCurrent() || busyRef.current || objectBlocked || capability !== 'ready' || (family === 'photo' && photoUri !== null && !photoReady)) return;
    if (paidComposition && !access.active) { router.push('/premium'); return; }
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    track(EVENTS.shareChannelTapped, { channel: 'system', family });
    const confirmObject=objectRequest?async()=>{const valid=await verifyStudioObject2026(objectRequest,ownerId);if(!valid&&isCurrent())setNotice(copy('Le droit de cet objet n’est plus confirmé. Aucun visuel n’a été transmis.','This object’s access is no longer confirmed. No image was handed over.'));return valid&&isCurrent();}:undefined;
    try {
      if(objectRequest && !await verifyStudioObject2026(objectRequest,ownerId)) { if(isCurrent()) setNotice(copy('Cet objet n’a pas pu être vérifié. Actualise ta collection avant de réessayer.','This object could not be verified. Refresh your collection before retrying.')); return; }
      if(!isCurrent()) return;
      if (family === 'film') {
        abortFilm.current = new AbortController();
        const film = await generateRunFilm2026({ facts, segments: run.traceSegments ?? [run.card.trace],
          privacy: { resolved: !prefsLoading && publication.ready, maskEndpoints: prefs.maskEndpoints, zones: publication.ready ? publication.zones : [] },
          format, theme, locale, edition:object?{name:object.name,collection:object.edition,premium:object.premium}:undefined, signal: abortFilm.current.signal });
        if (!film.ok) {
          if (isCurrent() && film.reason !== 'cancelled') setNotice(copy('La vidéo n’a pas pu être préparée sur cet appareil. Ton affiche reste disponible.', 'The video could not be prepared on this device. Your poster is still available.'));
          return;
        }
        try {
          if (!isCurrent()) return;
          const available = await Sharing.isAvailableAsync();
          if (!isCurrent()) return;
          if (!available) { setNotice(copy('Le partage vidéo est indisponible sur cet appareil.', 'Video sharing is unavailable on this device.')); return; }
          if(confirmObject&&!await confirmObject())return;
          await Sharing.shareAsync(film.uri, { mimeType: film.mimeType, UTI: 'public.mpeg-4', dialogTitle: copy('Mon Replay GRYD', 'My GRYD Replay') });
          if (!isCurrent()) return;
          track(EVENTS.shareExported, { ratio: format, channel: 'system', family });
          setNotice(copy('Ton Replay a été remis à la feuille de partage.', 'Your Replay was handed to the share sheet.'));
        } finally { await releaseRunFilm2026(film.uri); }
        return;
      }
      const result = family === 'sticker'
        ? await shareStickerImage(exportRef.current, facts.caption, isCurrent,confirmObject)
        : await shareAsImage(exportRef.current, facts.caption, isCurrent,confirmObject);
      if (!isCurrent()) return;
      if (!result.ok) {
        if (result.reason !== 'dismissed') setNotice(copy('Le partage est indisponible sur cet appareil.', 'Sharing is unavailable on this device.'));
        return;
      }
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const claim = shareDeliveryClaim(result.via, platform);
      if (result.via === 'image') track(EVENTS.shareExported, { ratio: format, channel: 'system', family });
      if (claim === 'confirmed') track(EVENTS.shareCompleted, { channel: result.via, family });
      setNotice(claim === 'copied' ? copy('Le résumé texte est copié.', 'The text summary was copied.')
        : claim === 'confirmed' ? copy('Le résumé a été partagé.', 'The summary was shared.')
        : result.via === 'image' ? copy('Ton image a été remise à la feuille de partage. Sa publication dépend de l’application choisie.', 'Your image was handed to the share sheet. Publication depends on the app you choose.')
        : copy('Le résumé texte a été remis au partage. Aucune image n’a été exportée.', 'The text summary was handed to sharing. No image was exported.'));
    } catch {
      if (isCurrent()) setNotice(copy('L’image n’a pas pu être préparée. Réessaie.', 'The image could not be prepared. Try again.'));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const posterProps = { facts, segments, family, format, theme, photoUri, locale, composition: effectiveComposition };
  return <View style={s.root}>
    <View style={[s.header, { paddingTop: insets.top + 8 }]}><BackButton locale={locale} /><Text style={s.headerTitle}>Studio</Text><GrydMark size={20} color={c.darkInk} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 18 }}>
      {objectRequest?<View style={{paddingVertical:14,gap:6}}><Text style={s.link}>{object?.name??copy('Objet de collection','Collection object')}</Text><Text style={s.small}>{objectPending?copy('Vérification de ton objet…','Checking your object…'):objectBlocked?copy('Objet indisponible pour ce compte. Aucun export de cet objet n’est autorisé.','Object unavailable for this account. Export is not authorized.'):copy('Objet détenu · rendu permanent, sans abonnement','Owned object · permanent rendering, no subscription required')}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setObjectRequest(null);clearStudioObject2026();}} style={s.textButton}><Text style={s.link}>{copy('Revenir aux formats essentiels','Back to essential formats')}</Text></Pressable></View>:null}
      {!objectRequest&&progress.data?.ownedRewards.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:14,paddingVertical:10}}>{progress.data.ownedRewards.map(reward=>{const request:StudioObjectRequest2026={kind:'season',collectionId:reward.collectionId,rewardId:reward.rewardId,variant:reward.variant};return <Pressable key={studioObjectKey2026(request)} accessibilityRole="button" disabled={busy} onPress={()=>setObjectRequest(request)} style={{minHeight:44,justifyContent:'center'}}><Text style={s.link}>{studioRewardLabel2026(reward.rewardId,reward.label,locale)}{reward.variant==='premium'?' +':''}</Text></Pressable>;})}</ScrollView>:null}
      <View style={s.families}>{SHARE_FAMILIES_2026.map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: family === value, disabled: busy }}
        onPress={() => chooseFamily(value)} disabled={busy} style={[s.family, family === value && s.selectedFamily]}>
        <GrydIcon name={familyIcons[value]} size={16} color={family === value ? c.darkInk : c.darkMuted} />
        <Text style={[s.familyText, family === value && { color: c.darkInk }]}>{familyNames[value]}</Text>
      </Pressable>)}</View>
      {capability === 'film_not_available' ? <View style={s.unavailable}>
        <GrydIcon name="play" size={40} color={c.darkMuted} />
        <Text style={s.emptyTitle}>{copy('Ta sortie en 8 secondes.', 'Your activity in 8 seconds.')}</Text>
        <Text style={s.body}>{filmCompatibility === null ? copy('Vérification de l’export vidéo…', 'Checking video export…') : !filmCompatibility.available && filmCompatibility.reason === 'web_not_supported' ? copy('Le Replay vidéo gratuit s’exporte depuis l’app iOS ou Android.', 'Export your free video Replay from the iOS or Android app.') : !filmCompatibility.available && filmCompatibility.reason === 'native_build_required' ? copy('Installe la nouvelle version de GRYD pour exporter ton Replay.', 'Install the new GRYD version to export your Replay.') : copy('Cet appareil ne prend pas en charge l’export vidéo. Ton affiche reste disponible.', 'This device does not support video export. Your poster is available.')}</Text>
        <Pressable accessibilityRole="button" onPress={() => chooseFamily('map')} style={s.secondary}><Text style={s.secondaryText}>{copy('Choisir la carte', 'Choose map')}</Text><GrydIcon name="chevronRight" size={18} color={c.darkInk} /></Pressable>
      </View> : capability === 'choose_photo' ? <View style={s.unavailable}>
        <GrydIcon name="camera" size={40} color={c.darkMuted} />
        <Text style={s.emptyTitle}>{copy('Ajouter une photo', 'Add a photo')}</Text>
        <Text style={s.body}>{copy('Tes mesures et ta trace protégée se superposent à la photo.', 'Your stats and protected route appear over your photo.')}</Text>
        <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={s.primary}><Text style={s.primaryText}>{copy('Choisir une photo', 'Choose a photo')}</Text></Pressable>
      </View> : <>
        <View style={s.stage}>
          <View style={[s.preview, family === 'sticker' && { backgroundColor: theme === 'dark' ? c.darkSurfaceMuted : c.surfaceMuted }]} accessibilityLabel={copy('Aperçu du visuel', 'Visual preview')}>
            {objectBlocked?null:family === 'film' ? <RunFilmPreview2026 width={previewWidth} input={{ facts, segments: run.traceSegments ?? [run.card.trace], privacy: { resolved: !prefsLoading && publication.ready, maskEndpoints: prefs.maskEndpoints, zones: publication.ready ? publication.zones : [] }, format, theme, locale,edition:object?{name:object.name,collection:object.edition,premium:object.premium}:undefined }} /> : object?<StudioObjectArtwork2026 object={object} facts={facts} segments={segments} width={previewWidth} format={format} theme={theme} locale={locale} photoUri={photoUri}/>:<SharePoster2026 {...posterProps} width={previewWidth} />}
          </View>
        </View>
      {family === 'map' && !objectRequest ? <View style={s.compositionRail}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{STUDIO_COMPOSITIONS.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: composition === value, disabled: busy }} disabled={busy} onPress={() => { setComposition(value); setNotice(null); track(EVENTS.shareTemplateChanged, { template: value }); }} style={[s.composition, composition === value && { borderColor: c.darkInk, backgroundColor: c.darkSurfaceMuted }]}>
          <Text style={s.link}>{compositionNames[value]}</Text>{value !== 'classic' ? <Text style={s.plus}>+</Text> : null}
        </Pressable>)}</ScrollView>
        {paidComposition ? <Text style={[s.small, { marginTop: 9 }]}>{access.reason === 'pre_sale_open' ? copy(PRE_SALE_INCLUDED_COPY_2026.fr, PRE_SALE_INCLUDED_COPY_2026.en) : access.active ? copy('Composition incluse avec GRYD+', 'Composition included with GRYD+') : copy('Aperçu libre · Export avec GRYD+', 'Free preview · Export with GRYD+')}</Text> : null}
      </View> : null}
        <View style={s.previewMeta}><Text style={s.small}>{family === 'film' ? copy('Image finale · MP4 · 8 s', 'Final frame · MP4 · 8 sec') : family === 'sticker' ? copy('PNG · fond transparent', 'PNG · transparent background') : `${formatNames[format]} · ${layout.width} × ${layout.height}`}</Text>
          <Pressable accessibilityRole="button" onPress={() => { setCustomize(true); track(EVENTS.shareCustomizeOpened, { tab: 'composition' }); }} disabled={busy} style={s.formatButton}><GrydIcon name="settings" size={16} color={c.darkInk} /><Text style={s.link}>Format</Text></Pressable>
        </View>
        <View style={s.privacyRow}><GrydIcon name="lock" size={15} color={c.darkMuted} /><Text style={s.privacy}>{tracePending ? copy('Protections en cours de vérification. Tracé masqué.', 'Checking privacy settings. Route hidden.')
          : traceError ? copy('Protections indisponibles. Partage sans tracé.', 'Privacy settings unavailable. Sharing without route.')
          : segments.length > 0 ? prefs.maskEndpoints ? copy('Départ, arrivée et zones privées masqués.', 'Start, finish and private areas hidden.')
            : copy('Zones privées masquées. Extrémités visibles.', 'Private areas hidden. Endpoints visible.')
          : copy('Mesures uniquement. Aucun tracé partagé.', 'Stats only. No route shared.')}</Text></View>
        {family === 'photo' ? <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={s.textButton}><Text style={s.link}>{photoUri?copy('Changer la photo','Change photo'):copy('Ajouter une photo','Add a photo')}</Text></Pressable> : null}
      </>}
      {notice ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text> : null}
    </ScrollView>
    {capability === 'ready' && !objectBlocked ? <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
      <View style={s.footerRow}>
      {Platform.OS === 'web' ? <Text style={s.footerNote}>{copy('Web · résumé texte', 'Web · text summary')}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || (family === 'photo' && photoUri !== null && !photoReady)} accessibilityState={{ busy, disabled: busy || (family === 'photo' && photoUri !== null && !photoReady) }} onPress={() => void share()}
        style={[s.primary, (busy || (family === 'photo' && photoUri !== null && !photoReady)) && { opacity: 0.5 }]}>
        <Text style={s.primaryText}>{busy ? copy('Préparation…', 'Preparing…') : paidComposition && !access.active ? copy('Découvrir GRYD+', 'Explore GRYD+') : family === 'film' ? copy('Partager mon Replay', 'Share my Replay') : Platform.OS === 'web' ? copy('Partager le résumé', 'Share summary') : copy('Partager', 'Share')}</Text>
        {busy ? <ActivityIndicator color={c.ink} /> : <GrydIcon name="share" color={c.ink} size={20} />}
      </Pressable>
      </View>
      {busy && family === 'film' ? <Pressable accessibilityRole="button" onPress={() => abortFilm.current?.abort()} style={s.textButton}><Text style={[s.link, { textAlign: 'center' }]}>{copy('Annuler', 'Cancel')}</Text></Pressable> : null}
    </View> : null}
    {capability === 'ready' && family !== 'film' && !objectBlocked ? <ShareExportStage ref={exportRef} widthPt={layout.widthPt}>
      {object?<StudioObjectArtwork2026 key={photoRevision} object={object} facts={facts} segments={segments} width={layout.widthPt} format={format} theme={theme} locale={locale} photoUri={photoUri} onPhotoLoaded={()=>setPhotoReady(true)} onPhotoError={()=>{setPhotoReady(false);setNotice(copy('Photo indisponible. Choisis une autre photo.','Photo unavailable. Choose another photo.'));}}/>:<SharePoster2026 key={photoRevision} {...posterProps} width={layout.widthPt} onPhotoLoaded={() => setPhotoReady(true)}
        onPhotoError={() => { setPhotoReady(false); setNotice(copy('Cette photo ne peut pas être chargée. Choisis-en une autre.', 'This photo could not be loaded. Choose another.')); }} />}
    </ShareExportStage> : null}
    <Modal visible={customize} transparent animationType="slide" onRequestClose={() => setCustomize(false)}>
      <View style={s.modalScrim}><Pressable accessibilityRole="button" accessibilityLabel={copy('Fermer', 'Close')} onPress={() => setCustomize(false)} style={StyleSheet.absoluteFill} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 22 }]}><ScrollView contentContainerStyle={{ gap: 18 }}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}><Text style={s.sheetTitle}>Format</Text><Pressable accessibilityRole="button" onPress={() => setCustomize(false)} style={s.textButton}><Text style={s.sheetLink}>{copy('Terminé', 'Done')}</Text></Pressable></View>
          <Text style={s.fieldLabel}>Format</Text><View style={s.options}>{(Object.keys(SHARE_EXPORT_FORMATS_2026) as ShareFormat2026[]).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: format === value }} onPress={() => setFormat(value)} style={[s.option, value === format && s.optionSelected]}><Text style={s.optionText}>{formatNames[value]}</Text></Pressable>)}</View>
          {family !== 'photo' ? <>
            <Text style={s.fieldLabel}>{family === 'sticker' ? copy('Texte', 'Text') : copy('Fond', 'Background')}</Text>
            <View style={s.options}>{(['dark', 'light'] as ShareTheme2026[]).map(value => {
              const black = family === 'sticker' ? value === 'light' : value === 'dark';
              return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: theme === value }} onPress={() => setTheme(value)} style={[s.option, value === theme && s.optionSelected]}><View style={[s.swatch, { backgroundColor: black ? c.carbon : c.surface }]} /><Text style={s.optionText}>{black ? copy('Noir', 'Black') : copy('Blanc', 'White')}</Text></Pressable>;
            })}</View>
          </> : null}
          <View style={s.switchRow}><View style={{ flex: 1, gap: 6 }}><Text style={s.fieldLabel}>{copy('Masquer départ et arrivée', 'Hide start and finish')}</Text><Text style={s.sheetSmall}>{copy('Appliqué aux prochains partages.', 'Applied to future shares.')}</Text></View><Switch value={prefs.maskEndpoints} onValueChange={value => void update({ maskEndpoints: value })} trackColor={{ false: c.border, true: c.ink }} thumbColor={c.surface} accessibilityLabel={copy('Masquer départ et arrivée', 'Hide start and finish')} /></View>
          <Text style={s.sheetSmall}>{copy('Une image envoyée ne peut pas être retirée des appareils de ses destinataires.', 'A shared image cannot be removed from its recipients’ devices.')}</Text>
        </ScrollView></View>
      </View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.carbon },
  emptyContent: { paddingHorizontal: 20, paddingTop: 28, gap: 10 },
  emptyHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compositionRail: { marginTop: 16 },
  composition: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.darkSurfaceMuted, borderRadius: 14, paddingHorizontal: 14 },
  plus: { fontFamily: fonts.textMedium, color: c.darkMuted, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { flex: 1, color: c.darkInk, fontSize: 20, letterSpacing: -0.4, fontFamily: fonts.displayRegular },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: c.darkInk },
  body: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.darkMuted, marginTop: 4 },
  families: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.darkSurfaceMuted, marginBottom: 14 },
  family: { flex: 1, minHeight: 44, flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  selectedFamily: { borderBottomColor: c.darkInk }, familyText: { fontFamily: fonts.textMedium, fontSize: 12, color: c.darkMuted },
  stage: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  preview: { alignSelf: 'center', overflow: 'hidden', borderRadius: 3, backgroundColor: c.carbon, borderWidth: 1, borderColor: c.darkSurfaceMuted },
  previewMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 5 },
  small: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 9, marginBottom: 4 },
  privacy: { flex: 1, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted },
  link: { color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 13 },
  textButton: { minHeight: 44, paddingVertical: 12, justifyContent: 'center' },
  formatButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  footerNote: { flex: 1, color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 },
  footer: { paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted, backgroundColor: c.carbon },
  primary: { alignSelf: 'flex-start', backgroundColor: c.accent, borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, flexDirection: 'row' },
  primaryText: { fontFamily: fonts.textMedium, fontSize: 14, color: c.ink, textAlign: 'center' },
  secondary: { alignSelf: 'flex-start', borderWidth: 1, borderColor: c.darkSurfaceMuted, borderRadius: 14, minHeight: 44, padding: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 12 },
  secondaryText: { fontFamily: fonts.textMedium, fontSize: 14, color: c.darkInk },
  unavailable: { paddingVertical: 28, gap: 12 },
  emptyTitle: { flexShrink: 1, fontFamily: fonts.displayRegular, fontSize: 20, lineHeight: 26, color: c.darkInk, letterSpacing: -0.8 },
  notice: { color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 20, marginTop: 16 },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingTop: 12, maxHeight: '85%' },
  sheetHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  sheetTitle: { fontFamily: fonts.displayRegular, fontSize: 20, color: c.ink, letterSpacing: -0.8 },
  sheetLink: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 13 },
  sheetSmall: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted },
  fieldLabel: { fontFamily: fonts.textMedium, color: c.ink, fontSize: 14 },
  options: { flexDirection: 'row', gap: 9, flexWrap: 'wrap', marginTop: -12 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  optionSelected: { borderColor: c.ink, backgroundColor: c.surfaceMuted },
  optionText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.ink },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: c.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 22 },
});
