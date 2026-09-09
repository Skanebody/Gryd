import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydMark, GrydIcon } from '../../ui/gryd';
import { TranslucentBackdrop2026 } from '../../ui/gryd/TranslucentBackdrop2026';
import { useLocale, useT } from '../../i18n/store';
import { SIGN_IN_DOOR } from './content';
import { useSession } from '../../lib/session';
import { useOnboardingState } from './store';
import { rememberOnboardingCompletion2026 } from './sessionCompletion2026';
import { readMapLocation2026 } from '../refonte/mapLocation2026';
import { checkForegroundPermission, requestForegroundPermission, getCurrentPositionOnce } from '../refonte/location';
import { LOCATION_CAPABLE } from './locate';
import { requestPlaceFocus } from '../map/placeFocus';
import { DISCOVERY_STEPS, DISCOVERY_OPTIONAL_STEPS, discoveryExit2026, discoveryProgress, resumeDiscovery, type DiscoveryStep } from './journey2026';
import { EVENTS, track } from '../../lib/analytics';
import { DiscoveryLoop2026 } from './DiscoveryLoop2026';
import { DiscoverySonar2026 } from './DiscoverySonar2026';
import { brandImagery } from '../../ui/gryd/brandImagery';

export default function Discovery2026Screen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fr = useLocale() !== 'en';
  const t = useT();
  // G01 — la porte « J'ai déjà un compte » n'est peinte que si un compte peut
  // EXISTER. Sans backend (O1), /sign-in redirige aussitôt vers la carte : ce
  // serait un bouton mort au sens de la constitution §2.
  const { configured } = useSession();
  const text = (a: string, b: string) => fr ? a : b;
  const replay = useLocalSearchParams<{ replay?: string }>().replay === '1';
  const { state, status, persistenceFailed, update } = useOnboardingState();
  const [step, setStep] = useState<DiscoveryStep>('welcome');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'denied' | 'unavailable' | null>(null);
  const resumed = useRef(false);
  const locationRequest = useRef(0);
  const finishing = useRef(false);
  const alive = useRef(true);
  const pending = useRef(false);
  const progress = discoveryProgress(step);
  const welcome = step === 'welcome';
  useEffect(() => { alive.current = true; return () => { alive.current = false; locationRequest.current++; }; }, []);
  useEffect(() => {
    if (status === 'reading' || resumed.current) return;
    resumed.current = true;
    setStep(resumeDiscovery(state.reachedStep, state.onboardingDone, replay));
  }, [status, state.reachedStep, state.onboardingDone, replay]);
  useEffect(() => {
    track(EVENTS.onboardingStep, { n: DISCOVERY_STEPS.indexOf(step) + 1, step, journey: 'discovery2026_optional', optional: !welcome, replay });
  }, [step, replay]);
  const cancelLocation = () => { locationRequest.current++; pending.current = false; setBusy(false); };
  const go = (next: DiscoveryStep) => {
    if (finishing.current) return;
    resumed.current = true;
    cancelLocation(); setLocationStatus(null); setStep(next); setFocused(null);
    if (!replay && !state.onboardingDone) void update({ reachedStep: next === 'welcome' ? null : `discovery2026:optional:${next}` });
  };
  const finish = (action: 'explore' | 'close' | 'done') => {
    if (finishing.current) return;
    finishing.current = true; resumed.current = true; cancelLocation();
    const exit = discoveryExit2026(replay, action);
    if (exit.patch) {
      // Navigation never waits for disk. The patcher preserves unknown existing
      // fields and the session receipt prevents a redirect loop if storage fails.
      rememberOnboardingCompletion2026(true);
      void update(exit.patch);
    }
    router.replace(exit.target);
  };
  const locate = async () => {
    if (pending.current || finishing.current || replay) return;
    pending.current = true; const ticket = ++locationRequest.current; setBusy(true); setLocationStatus(null);
    try {
      const outcome = await readMapLocation2026({ checkForegroundPermission, requestForegroundPermission, getCurrentPositionOnce }, true);
      if (!alive.current || ticket !== locationRequest.current || finishing.current) return;
      if (outcome.kind === 'position') { requestPlaceFocus(outcome.point, outcome.zoom); finish('explore'); }
      else setLocationStatus(outcome.kind === 'denied' ? 'denied' : 'unavailable');
    } catch { if (alive.current && ticket === locationRequest.current) setLocationStatus('unavailable'); }
    finally { if (ticket === locationRequest.current) { pending.current = false; if (alive.current) setBusy(false); } }
  };
  const focus = (id: string) => ({ onFocus: () => setFocused(id), onBlur: () => setFocused(null) });
  const title = welcome ? text('La ville est ton terrain.', 'The city is your playground.') : step === 'loop' ? text('Trace. Ferme. Capture.', 'Trace. Close. Capture.') : step === 'crew' ? text('À plusieurs, le jeu change.', 'Together, the game changes.') : text('Commence où tu veux.', 'Start wherever you like.');
  const body = welcome ? text('À pied ou à vélo, chaque boucle laisse ta marque.', 'On foot or by bike, every loop leaves your mark.') : step === 'loop' ? text('Ferme une boucle pendant ta sortie. Après validation, le terrain à l’intérieur devient le tien. Les autres peuvent le reprendre.', 'Close a loop during your outing. Once validated, the ground inside becomes yours. Others can take it back.') : step === 'crew' ? text('En solo ou en crew, organise tes sorties, échange et compose ton équipe pour les défis 5 contre 5.', 'Go solo or meet your crew. Plan outings, chat and build your team for 5-versus-5 challenges.') : text('Déplace la carte librement. Ta position est facultative pour explorer ; le GPS servira à enregistrer une sortie.', 'Move around the map freely. Location is optional for exploring; GPS will record an activity when you start one.');
  // En REJEU, l'accueil ne promet plus « Explorer la carte » : la sortie ramène
  // dans les Paramètres d'où la découverte a été rouverte (journey2026, §9.3).
  const primaryLabel = welcome && !replay ? text('Explorer la carte', 'Explore the map') : progress.next ? text('Continuer', 'Continue') : replay || welcome ? text('Terminer', 'Done') : text('Explorer la carte', 'Explore the map');
  const chapter = (value: typeof DISCOVERY_OPTIONAL_STEPS[number]) => value === 'loop' ? text('La boucle', 'The loop') : value === 'crew' ? text('Le crew', 'The crew') : text('La carte', 'The map');
  return <View style={s.root}>
    {welcome ? <><Image source={brandImagery.movement.source} accessibilityLabel={fr ? brandImagery.movement.fr : brandImagery.movement.en} resizeMode="cover" style={s.photo} /><Svg pointerEvents="none" accessible={false} width="100%" height="100%" style={StyleSheet.absoluteFill}><Defs><LinearGradient id="discoveryShade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c.carbon} stopOpacity={0.3} /><Stop offset="0.35" stopColor={c.carbon} stopOpacity={0} /><Stop offset="0.6" stopColor={c.carbon} stopOpacity={0.45} /><Stop offset="1" stopColor={c.carbon} stopOpacity={0.88} /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#discoveryShade)" /></Svg></> : null}
    <ScrollView key={step} showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { minHeight: height, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={s.header}>
        <View style={s.headerLeft}><View style={s.brand}><GrydMark variant="symbol" size={24} color={c.accent} /></View>{progress.previous ? <Pressable {...focus('back')} accessibilityRole="button" accessibilityLabel={text('Retour', 'Back')} onPress={() => go(progress.previous!)} style={[s.headerControl, focused === 'back' && s.focus]}><GrydIcon name="chevronLeft" size={20} color={c.darkInk} /></Pressable> : null}</View>
        <Pressable {...focus('close')} accessibilityRole="button" accessibilityLabel={text(replay ? 'Fermer la découverte' : 'Fermer et explorer la carte', replay ? 'Close discovery' : 'Close and explore the map')} onPress={() => finish('close')} style={[s.headerControl, focused === 'close' && s.focus]}><TranslucentBackdrop2026 tone="dark" radius={22} /><View style={s.overlayContent}><GrydIcon name="close" size={20} color={c.darkInk} /></View></Pressable>
      </View>
      {!welcome ? <View accessibilityRole="tablist" accessibilityLabel={text('Comment jouer · découverte facultative', 'How to play · optional introduction')} style={s.chapters}>{DISCOVERY_OPTIONAL_STEPS.map(value => <Pressable key={value} {...focus(value)} accessibilityRole="tab" accessibilityState={{ selected: value === step }} aria-selected={value === step} onPress={() => go(value)} style={[s.chapter, value === step && s.chapterOn, focused === value && s.focus]}><Text style={[s.chapterText, value === step && s.chapterTextOn]}>{chapter(value)}</Text></Pressable>)}</View> : null}
      {welcome ? <View style={[s.photoSpace, { minHeight: Math.max(130, Math.min(330, height * 0.3)) }]} /> : <View style={[s.art, { minHeight: Math.min(230, height * 0.29) }]}>{step === 'loop' ? <DiscoveryLoop2026 fr={fr} /> : step === 'crew' ? <><Image source={brandImagery.community.source} resizeMode="cover" accessibilityLabel={fr ? brandImagery.community.fr : brandImagery.community.en} style={s.crewPhoto} /><View style={s.crewCaption}><View style={s.overlayContent}><GrydIcon name="crew" size={20} color={c.darkInk} /></View><Text style={[s.crewCaptionText, s.overlayContent]}>{text('Une sortie. Une équipe.', 'One outing. One team.')}</Text></View></> : <DiscoverySonar2026 />}</View>}
      <View style={s.copy}><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.body}>{body}</Text></View>
      <View style={s.spacer} />
      {step === 'loop' ? <View style={s.note}><GrydIcon name="loop" color={c.darkMuted} size={17} /><Text style={s.noteText}>{text('Le dessin est un exemple, pas un territoire gagné.', 'An illustration, not a territory you have won.')}</Text></View> : null}
      {step === 'location' ? <View style={s.note}><GrydIcon name="lock" size={18} color={c.darkMuted} /><Text style={s.noteText}>{text('Centrer la carte ne publie pas ta position.', 'Centring the map does not publish your location.')}</Text></View> : null}
      {status === 'unavailable' || persistenceFailed ? <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.error}>{text('La carte reste accessible. Cette découverte peut revenir au prochain lancement.', 'The map remains available. This introduction may return next time you open the app.')}</Text> : null}
      {locationStatus ? <Text accessibilityRole="alert" style={s.error}>{locationStatus === 'denied' ? text('Position non autorisée. Tu peux explorer la carte.', 'Location is not allowed. You can explore the map.') : text('Position introuvable. Réessaie ou explore la carte.', 'Location is unavailable. Try again or explore the map.')}</Text> : null}
      <Pressable {...focus('primary')} accessibilityRole="button" onPress={() => welcome ? finish(replay ? 'done' : 'explore') : progress.next ? go(progress.next) : finish(replay ? 'done' : 'explore')} style={({ pressed }) => [s.primary, pressed && s.pressed, focused === 'primary' && s.focus]}><Text style={s.primaryText}>{primaryLabel}</Text><GrydIcon name="chevronRight" size={19} color={c.ink} /></Pressable>
      {welcome ? <Pressable {...focus('learn')} accessibilityRole="button" onPress={() => go('loop')} style={[s.secondary, focused === 'learn' && s.focus]}><Text style={s.secondaryText}>{text('Comment jouer', 'How to play')}</Text></Pressable> : step === 'location' && !replay && LOCATION_CAPABLE ? <Pressable {...focus('locate')} accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} aria-disabled={busy} aria-busy={busy} disabled={busy} onPress={() => void locate()} style={[s.secondary, focused === 'locate' && s.focus]}>{busy ? <ActivityIndicator color={c.darkInk} size="small" /> : null}<Text style={s.secondaryText}>{busy ? text('Recherche de la position…', 'Finding your location…') : text('Me localiser · facultatif', 'Use my location · optional')}</Text></Pressable> : progress.next && !replay ? <Pressable {...focus('explore')} accessibilityRole="button" onPress={() => finish('explore')} style={[s.secondary, focused === 'explore' && s.focus]}><Text style={s.secondaryText}>{text('Explorer la carte', 'Explore the map')}</Text></Pressable> : null}
      {welcome && configured && !replay ? <Pressable {...focus('signin')} accessibilityRole="link" onPress={() => router.push('/sign-in')} style={[s.secondary, focused === 'signin' && s.focus]}><Text style={s.signInText}>{t(SIGN_IN_DOOR)}</Text></Pressable> : null}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.carbon }, photo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  content: { paddingHorizontal: 22, flexGrow: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brand: { height: 44, justifyContent: 'center' }, headerControl: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' }, overlayContent: { zIndex: 1 },
  photoSpace: { flex: 1 }, copy: { gap: 10 }, title: { color: c.darkInk, fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 }, body: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 13, lineHeight: 20 },
  art: { marginTop: 14, marginBottom: 18, justifyContent: 'center', borderRadius: 24, overflow: 'hidden', flex: 1 }, crewPhoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }, crewCaption: { backgroundColor: c.carbon, position: 'absolute', bottom: 12, left: 12, right: 12, padding: 12, borderRadius: 14, flexDirection: 'row', gap: 9, alignItems: 'center' }, crewCaptionText: { color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 12, flexShrink: 1 },
  chapters: { flexDirection: 'row', gap: 6, marginTop: 12 }, chapter: { flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' }, chapterOn: { backgroundColor: c.surface }, chapterText: { fontFamily: fonts.textMedium, fontSize: 12, color: c.darkInk }, chapterTextOn: { color: c.ink },
  spacer: { height: 16 }, note: { flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 18 }, noteText: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted, flex: 1 }, error: { fontFamily: fonts.text, color: c.darkInk, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  primary: { minHeight: 48, borderRadius: 24, borderWidth: 2, borderColor: 'transparent', backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, primaryText: { fontFamily: fonts.textSemi, fontSize: 13, lineHeight: 19, color: c.ink, flexShrink: 1 },
  secondary: { minHeight: 44, borderWidth: 2, borderColor: 'transparent', borderRadius: 22, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 8 }, secondaryText: { fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18, color: c.darkInk, flexShrink: 1 }, signInText: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted, flexShrink: 1, textDecorationLine: 'underline' }, focus: { borderColor: c.darkInk, ...(Platform.OS === 'web' ? { outlineStyle: 'solid', outlineWidth: 2, outlineColor: c.darkInk, outlineOffset: 2 } : {}) } as ViewStyle, pressed: { opacity: .8 },
});
