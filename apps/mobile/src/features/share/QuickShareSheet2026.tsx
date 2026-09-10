/**
 * GRYD — « PARTAGER TA SORTIE » : LA FEUILLE COURTE.
 *
 * Elle s'ouvre PAR-DESSUS l'écran où l'on est déjà (Résultat de sortie, détail
 * d'une sortie du journal) et remet une image prête à la feuille système en UN
 * geste. Le raisonnement produit — pourquoi une feuille plutôt qu'un écran, et
 * pourquoi seulement deux décisions — est dans `quickShare2026.ts` ; ici il n'y
 * a que du rendu, de la capture et des états honnêtes.
 *
 * ─── CE QU'ELLE NE DUPLIQUE PAS ─────────────────────────────────────────────
 * L'affiche est `SharePoster2026`, le même composant que le Studio exporte, et
 * la trace passe par `protectedShareSegments2026`, le même masquage que le
 * Studio et que l'ingestion serveur. Deux chemins de partage, une seule vérité
 * de rendu et une seule règle de vie privée : c'est la condition pour que la
 * feuille rapide ne devienne pas, avec le temps, un partage « moins protégé ».
 *
 * ─── LES QUATRE ÉTATS, SANS EXCEPTION (L8/L14/L19) ──────────────────────────
 *   · protections en cours de lecture → aucune trace rendue, et on le dit ;
 *   · lecture échouée                 → mesures seules, et on le dit ;
 *   · préparation de l'image          → bouton occupé, libellé « Préparation… » ;
 *   · échec de remise                 → un message qui nomme la cause.
 * Aucun spinner infini : la capture est bornée par `guardedShareAsset2026`, et
 * le film par le délai de `generateRunFilm2026`.
 *
 * ─── AUCUN BOUTON MORT ──────────────────────────────────────────────────────
 * « Partager le film » n'apparaît QUE si le module natif `GrydRunFilm` répond
 * présent dans CE binaire. Aucun raccourci « Instagram » n'est peint : le pont
 * qui remet l'image à Instagram Stories (UIPasteboard + types
 * `com.instagram.sharedSticker.*`) n'existe pas dans les dépendances — preuve
 * dans `node_modules/expo-clipboard/ios/ClipboardModule.swift:54-60`, qui ne
 * sait écrire que `UIPasteboard.general.image`. Instagram reste donc atteint
 * par la feuille système, où son extension propose « Stories » et « Fil ».
 * Détail complet : docs/product/GRYD_PARTAGE_2026_09.md.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, PixelRatio, Platform, Pressable, ScrollView,
  StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useLocale } from '../../i18n/store';
import { EVENTS, track } from '../../lib/analytics';
import { GrydIcon } from '../../ui/gryd/GrydIcon';
import { usePrivacyPrefs } from '../privacy/store';
import { usePrivacyZones } from '../privacy/zonesStore';
import { zonesForPublication } from '../privacy/zones';
import { protectedShareSegments2026 } from './shareTrace2026';
import { shareAsImage } from './shareActions';
import { ShareExportStage } from './ShareExportStage';
import { SharePoster2026 } from './SharePoster2026';
import { generateRunFilm2026, getRunFilmCompatibility2026, releaseRunFilm2026 } from './film/generateRunFilm2026';
import { buildShareFacts2026, exportLayout2026, SHARE_EXPORT_FORMATS_2026 } from './shareModel2026';
import {
  QUICK_SHARE_FORMATS_2026, QUICK_SHARE_THEMES_2026, quickShareActions2026,
  quickSharePrimaryClaim2026, quickShareRendering2026, quickShareTraceState2026,
  type QuickShareFormat2026, type QuickShareTheme2026,
} from './quickShare2026';
import type { ShareRunData } from './shareRun';

/** Un tap qui a un effet a une réponse physique (L6). Le web n'en a pas. */
function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(style).catch(() => { /* Un moteur haptique absent n'est pas une panne. */ });
}

export interface QuickShareSheet2026Props {
  /** La sortie à partager, déjà armée par l'écran appelant. */
  run: ShareRunData;
  visible: boolean;
  onClose(): void;
  /**
   * Ouvre le Studio complet. L'appelant l'implémente parce que c'est lui qui
   * détient l'armement (`setShareRun`) et son propriétaire : la feuille ne
   * navigue jamais toute seule vers un écran qui lirait une autre mémoire.
   */
  onOpenStudio(): void;
}

export function QuickShareSheet2026({ run, visible, onClose, onOpenStudio }: QuickShareSheet2026Props) {
  const locale: 'fr' | 'en' = useLocale() === 'en' ? 'en' : 'fr';
  const copy = (fr: string, en: string) => locale === 'fr' ? fr : en;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [format, setFormat] = useState<QuickShareFormat2026>('story');
  const [theme, setTheme] = useState<QuickShareTheme2026>('noir');
  const [busy, setBusy] = useState<'image' | 'film' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filmAvailable, setFilmAvailable] = useState<boolean | null>(null);
  const exportRef = useRef<View>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const abortFilm = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abortFilm.current?.abort(); }; }, []);

  const { prefs, loading: prefsLoading } = usePrivacyPrefs();
  const zones = usePrivacyZones();
  const publication = useMemo(() => zonesForPublication(zones), [zones]);
  const privacyResolved = !prefsLoading && publication.ready;
  const privacyFailed = !publication.ready && publication.reason === 'error';
  const segments = useMemo(() => protectedShareSegments2026(run.traceSegments ?? [run.card.trace], {
    resolved: privacyResolved,
    maskEndpoints: prefs.maskEndpoints,
    zones: publication.ready ? publication.zones : [],
  }), [run, privacyResolved, prefs.maskEndpoints, publication]);
  const traceState = quickShareTraceState2026({ privacyResolved, privacyFailed, protectedSegmentCount: segments.length });
  const facts = useMemo(() => buildShareFacts2026(run, locale), [run, locale]);

  // La capacité VIDÉO se mesure, elle ne se suppose pas : un JS à jour sur un
  // binaire ancien n'a pas l'encodeur. Tant que la réponse n'est pas là, le
  // bouton n'existe pas (`filmAvailable === null` vaut non).
  useEffect(() => {
    if (!visible) return;
    let alive = true; setFilmAvailable(null);
    void getRunFilmCompatibility2026(format === 'square' ? 'square' : 'story')
      .then(value => { if (alive && mounted.current) setFilmAvailable(value.available); })
      .catch(() => { if (alive && mounted.current) setFilmAvailable(false); });
    return () => { alive = false; };
  }, [visible, format]);

  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const actions = quickShareActions2026({ platform, filmAvailable });
  const claim = quickSharePrimaryClaim2026(platform);
  const rendering = quickShareRendering2026(theme);
  const layout = exportLayout2026(format, PixelRatio.get());
  const previewHeight = Math.max(200, Math.min(360, height * 0.38));
  const previewWidth = Math.min(width - 96, previewHeight * SHARE_EXPORT_FORMATS_2026[format].width / SHARE_EXPORT_FORMATS_2026[format].height);
  const posterProps = {
    facts, segments, family: 'map' as const, format, theme: rendering.theme,
    accent: rendering.accent, photoUri: null, locale,
  };

  const formatNames: Record<QuickShareFormat2026, string> = { story: copy('Story 9:16', 'Story 9:16'), square: copy('Carré 1:1', 'Square 1:1') };
  const themeNames: Record<QuickShareTheme2026, string> = { noir: copy('Noir', 'Black'), chartreuse: 'Chartreuse', minimal: copy('Minimal', 'Minimal') };

  function close() {
    if (busyRef.current) return;
    setNotice(null);
    onClose();
  }

  async function shareImage() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy('image'); setNotice(null);
    tap();
    track(EVENTS.shareChannelTapped, { channel: 'system', family: 'map' });
    try {
      const result = await shareAsImage(exportRef.current, facts.caption, () => mounted.current);
      if (!mounted.current) return;
      if (!result.ok) {
        if (result.reason !== 'dismissed') setNotice(copy('Le partage est indisponible sur cet appareil.', 'Sharing is unavailable on this device.'));
        return;
      }
      if (result.via === 'image') {
        track(EVENTS.shareExported, { ratio: format, channel: 'system', family: 'map' });
        tap(Haptics.ImpactFeedbackStyle.Medium);
        setNotice(copy('Ton image est remise à la feuille de partage. Sa publication dépend de l’application choisie.', 'Your image was handed to the share sheet. Publication depends on the app you choose.'));
      } else {
        setNotice(copy('Le résumé texte a été remis au partage. Aucune image n’a été exportée.', 'The text summary was handed to sharing. No image was exported.'));
      }
    } catch {
      if (mounted.current) setNotice(copy('L’image n’a pas pu être préparée. Réessaie.', 'The image could not be prepared. Try again.'));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  async function shareFilm() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy('film'); setNotice(null);
    tap();
    track(EVENTS.shareChannelTapped, { channel: 'system', family: 'film' });
    abortFilm.current = new AbortController();
    try {
      const film = await generateRunFilm2026({
        facts, segments: run.traceSegments ?? [run.card.trace],
        privacy: { resolved: privacyResolved, maskEndpoints: prefs.maskEndpoints, zones: publication.ready ? publication.zones : [] },
        format: format === 'square' ? 'square' : 'story', theme: rendering.theme, locale, signal: abortFilm.current.signal,
      });
      if (!film.ok) {
        if (mounted.current && film.reason !== 'cancelled') setNotice(copy('La vidéo n’a pas pu être préparée sur cet appareil. Ton image reste disponible.', 'The video could not be prepared on this device. Your image is still available.'));
        return;
      }
      try {
        if (!mounted.current) return;
        if (!await Sharing.isAvailableAsync()) {
          if (mounted.current) setNotice(copy('Le partage vidéo est indisponible sur cet appareil.', 'Video sharing is unavailable on this device.'));
          return;
        }
        if (!mounted.current) return;
        await Sharing.shareAsync(film.uri, { mimeType: film.mimeType, UTI: 'public.mpeg-4', dialogTitle: 'GRYD' });
        if (!mounted.current) return;
        track(EVENTS.shareExported, { ratio: format, channel: 'system', family: 'film' });
        tap(Haptics.ImpactFeedbackStyle.Medium);
        setNotice(copy('Ta vidéo est remise à la feuille de partage.', 'Your video was handed to the share sheet.'));
      } finally { await releaseRunFilm2026(film.uri); }
    } catch {
      if (mounted.current) setNotice(copy('La vidéo n’a pas pu être préparée. Réessaie.', 'The video could not be prepared. Try again.'));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  const privacyLine = traceState === 'checking' ? copy('Protections en cours de vérification. Aucun tracé sur l’image.', 'Checking privacy settings. No route on the image.')
    : traceState === 'failed' ? copy('Protections indisponibles. Partage sans tracé.', 'Privacy settings unavailable. Sharing without route.')
    : traceState === 'none' ? copy('Mesures uniquement. Aucun tracé partagé.', 'Stats only. No route shared.')
    : prefs.maskEndpoints ? copy('Départ, arrivée et zones privées masqués.', 'Start, finish and private areas hidden.')
    : copy('Zones privées masquées. Extrémités visibles.', 'Private areas hidden. Endpoints visible.');

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <View style={s.scrim}>
      <Pressable accessibilityRole="button" accessibilityLabel={copy('Fermer', 'Close')} onPress={close} style={StyleSheet.absoluteFill} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>{copy('Partager ta sortie', 'Share your activity')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={copy('Fermer', 'Close')} onPress={close} style={s.iconButton}>
            <GrydIcon name="close" size={20} color={c.darkInk} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
          <View style={s.stage} accessibilityLabel={copy('Aperçu de ton image', 'Preview of your image')}>
            <View style={s.preview}><SharePoster2026 {...posterProps} width={previewWidth} /></View>
          </View>

          <View style={s.rail}>
            <Text style={s.railLabel}>{copy('Cadre', 'Frame')}</Text>
            <View style={s.options}>{QUICK_SHARE_FORMATS_2026.map(value => {
              const selected = format === value;
              return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: busy !== null }}
                disabled={busy !== null} onPress={() => { tap(); setFormat(value); setNotice(null); track(EVENTS.shareTemplateChanged, { template: value }); }}
                style={[s.option, selected && s.optionSelected]}>
                {/* MOTIF + LIBELLÉ, pas seulement une couleur (L15) : le cadre se
                    reconnaît à sa forme, lisible sans distinguer les teintes. */}
                <View style={[s.ratio, value === 'story' ? s.ratioStory : s.ratioSquare, selected && s.ratioSelected]} />
                <Text style={[s.optionText, selected && s.optionTextSelected]}>{formatNames[value]}</Text>
              </Pressable>;
            })}</View>
          </View>

          <View style={s.rail}>
            <Text style={s.railLabel}>{copy('Fond', 'Background')}</Text>
            <View style={s.options}>{QUICK_SHARE_THEMES_2026.map(value => {
              const selected = theme === value;
              const swatch = value === 'chartreuse' ? c.accent : value === 'minimal' ? c.surface : c.carbon;
              return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: busy !== null }}
                disabled={busy !== null} onPress={() => { tap(); setTheme(value); setNotice(null); track(EVENTS.shareCustomizeApplied, { tab: 'theme' }); }}
                style={[s.option, selected && s.optionSelected]}>
                <View style={[s.swatch, { backgroundColor: swatch }]} />
                <Text style={[s.optionText, selected && s.optionTextSelected]}>{themeNames[value]}</Text>
              </Pressable>;
            })}</View>
          </View>

          <View style={s.privacyRow}>
            <GrydIcon name="lock" size={15} color={c.darkMuted} />
            <Text style={s.privacy}>{privacyLine}</Text>
          </View>
          {notice ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text> : null}
        </ScrollView>

        <View style={s.footer}>
          <Pressable accessibilityRole="button" disabled={busy !== null} accessibilityState={{ busy: busy === 'image', disabled: busy !== null }}
            onPress={() => void shareImage()} style={[s.primary, busy !== null && s.dimmed]}>
            {busy === 'image' ? <ActivityIndicator color={c.ink} /> : <GrydIcon name="share" size={19} color={c.ink} />}
            <Text style={s.primaryText}>{busy === 'image' ? copy('Préparation…', 'Preparing…')
              : claim === 'text' ? copy('Partager le résumé', 'Share summary')
              : copy('Partager l’image', 'Share image')}</Text>
          </Pressable>
          {actions.includes('film') ? <Pressable accessibilityRole="button" disabled={busy !== null} accessibilityState={{ busy: busy === 'film', disabled: busy !== null }}
            onPress={() => void shareFilm()} style={[s.secondary, busy !== null && s.dimmed]}>
            {busy === 'film' ? <ActivityIndicator color={c.darkInk} /> : <GrydIcon name="play" size={18} color={c.darkInk} />}
            <Text style={s.secondaryText}>{busy === 'film' ? copy('Préparation de la vidéo…', 'Preparing video…') : copy('Partager la vidéo · 8 s', 'Share video · 8 sec')}</Text>
          </Pressable> : null}
          {busy === 'film' ? <Pressable accessibilityRole="button" onPress={() => abortFilm.current?.abort()} style={s.textButton}>
            <Text style={s.link}>{copy('Annuler', 'Cancel')}</Text>
          </Pressable> : <Pressable accessibilityRole="button" disabled={busy !== null} onPress={() => { tap(); onOpenStudio(); }} style={s.textButton}>
            <Text style={s.link}>{copy('Plus d’options dans le Studio', 'More options in the Studio')}</Text>
          </Pressable>}
        </View>
      </View>
    </View>

    {/* L'ÉTAGE D'EXPORT : la MÊME affiche, montée hors écran à la largeur qui
        décide les pixels de sortie. C'est elle qu'on capture — jamais l'aperçu
        réduit, qui produirait une image basse définition. */}
    <ShareExportStage ref={exportRef} widthPt={layout.widthPt}>
      <SharePoster2026 {...posterProps} width={layout.widthPt} />
    </ShareExportStage>
  </Modal>;
}

const s = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim },
  sheet: { backgroundColor: c.carbon, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 12, maxHeight: '92%', gap: 12 },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: c.darkSurfaceMuted, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontFamily: fonts.displayMedium, fontSize: 21, lineHeight: 27, letterSpacing: -0.5, color: c.darkInk },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center' },
  preview: { overflow: 'hidden', borderRadius: 4, borderWidth: 1, borderColor: c.darkSurfaceMuted },
  rail: { gap: 8 },
  railLabel: { fontFamily: fonts.textMedium, fontSize: 11, letterSpacing: 1, color: c.darkMuted },
  options: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.darkSurfaceMuted },
  optionSelected: { borderColor: c.darkInk, backgroundColor: c.darkSurfaceMuted },
  optionText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.darkMuted },
  optionTextSelected: { color: c.darkInk },
  ratio: { borderWidth: 1.5, borderColor: c.darkMuted, borderRadius: 2 },
  ratioStory: { width: 10, height: 17 },
  ratioSquare: { width: 15, height: 15 },
  ratioSelected: { borderColor: c.darkInk },
  swatch: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: c.darkSurfaceMuted },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  privacy: { flex: 1, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted },
  notice: { color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 20 },
  footer: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted },
  primary: { backgroundColor: c.accent, borderRadius: 14, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  primaryText: { fontFamily: fonts.textMedium, fontSize: 15, color: c.ink },
  secondary: { borderWidth: 1, borderColor: c.darkSurfaceMuted, borderRadius: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  secondaryText: { fontFamily: fonts.textMedium, fontSize: 14, color: c.darkInk },
  dimmed: { opacity: 0.5 },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  link: { fontFamily: fonts.textMedium, fontSize: 13, color: c.darkMuted },
});
