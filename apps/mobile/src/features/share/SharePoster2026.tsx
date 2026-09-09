import { useId } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polyline, Rect, Stop } from 'react-native-svg';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydMark } from '../../ui/gryd/GrydMark';
import { REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';
import { PosterTrace } from './PosterTrace2026';
import { StudioComposition2026 } from './StudioComposition2026';
import type { buildShareFacts2026, ShareFamily2026, ShareFormat2026, ShareTheme2026 } from './shareModel2026';
import { SHARE_EXPORT_FORMATS_2026 } from './shareModel2026';

export interface PosterProps {
  composition?: 'classic' | 'index' | 'contour' | 'tempo' | 'editorial';
  facts: ReturnType<typeof buildShareFacts2026>;
  segments: readonly (readonly LatLngPoint[])[];
  family: ShareFamily2026;
  format: ShareFormat2026;
  theme: ShareTheme2026;
  width: number;
  photoUri: string | null;
  onPhotoLoaded?: () => void;
  onPhotoError?: () => void;
  locale: 'fr' | 'en';
}

/** Every path comes from the privacy-filtered trace. No filled inferred polygon,
 * map-provider tiles, invented street, location marker or arbitrary closure.
 */
export function SharePoster2026({ facts, segments, family, format, theme, width, photoUri, onPhotoLoaded, onPhotoError, locale, composition = 'classic' }: PosterProps) {
  const overlayId = `poster-overlay-${useId().replace(/:/g, '')}`;
  const size = SHARE_EXPORT_FORMATS_2026[format];
  const height = width * size.height / size.width;
  const k = width / 360;
  const photo = family === 'photo' && photoUri !== null;
  const sticker = family === 'sticker';
  const light = theme === 'light' && !photo;
  const ink = light ? c.ink : c.darkInk;
  const muted = light ? c.muted : c.darkMuted;
  const hasTrace = segments.some((segment) => segment.length >= 2);
  const padding = 28 * k;
  const reserved = format === 'story' ? height * 250 / 1920 : 24 * k;
  const graphHeight = hasTrace ? height - 2 * reserved - (format === 'square' ? 191 : 212) * k : 0;
  const distance = facts.distance?.replace(/\s+km$/, '');
  const metricSize = (format === 'square' ? 64 : 80) * k;
  const rule = light ? c.border : c.darkSurfaceMuted;
  const labelStyle = { fontFamily: fonts.textMedium, fontSize: 9 * k, lineHeight: 13 * k, letterSpacing: 1.2 * k, color: muted };
  const metrics = <View>
    <Text allowFontScaling={false} style={labelStyle}>{distance ? 'DISTANCE' : locale === 'fr' ? 'ACTIVITÉ' : 'ACTIVITY'}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 * k, marginTop: 3 * k }}>
      <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}
        style={{ fontFamily: fonts.displayMedium, fontSize: metricSize, lineHeight: metricSize * 1.05, letterSpacing: -4 * k, color: ink, flexShrink: 1 }}>
        {distance ?? (locale === 'fr' ? 'Sortie' : 'Activity')}
      </Text>
      {distance ? <Text allowFontScaling={false} style={{ fontFamily: fonts.text, fontSize: 19 * k, color: muted }}>km</Text> : null}
    </View>
  </View>;
  if (family === 'map' && composition !== 'classic') return <StudioComposition2026 facts={facts} segments={segments} format={format} theme={theme} width={width} locale={locale} composition={composition} />;
  return <View collapsable={false} style={{ width, height, backgroundColor: sticker ? 'transparent' : light ? c.surface : c.carbon, overflow: 'hidden' }}>
    {photo ? <>
      <Image source={{ uri: photoUri! }} resizeMode="cover" style={StyleSheet.absoluteFill} onLoad={onPhotoLoaded} onError={onPhotoError} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs><LinearGradient id={overlayId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0" stopColor={c.carbon} stopOpacity={0.65} />
          <Stop offset="0.28" stopColor={c.carbon} stopOpacity={0} />
          <Stop offset="0.7" stopColor={c.carbon} stopOpacity={0.82} />
          <Stop offset="1" stopColor={c.carbon} stopOpacity={1} />
        </LinearGradient></Defs>
        <Rect width={width} height={height} fill={`url(#${overlayId})`} />
      </Svg>
    </> : null}
    <View style={{ flex: 1, paddingHorizontal: padding, paddingTop: reserved, paddingBottom: reserved, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 * k }}>
        <GrydMark variant="wordmark" size={12 * k} color={ink} />
        <View style={{ borderWidth: 0.7 * k, borderColor: photo ? c.darkMuted : rule, borderRadius: 20 * k, paddingHorizontal: 9 * k, paddingVertical: 6 * k }}>
          <Text allowFontScaling={false} style={{ fontFamily: fonts.textMedium, fontSize: 8 * k, letterSpacing: 0.8 * k, color: ink }}>{facts.sport}</Text>
        </View>
      </View>
      {!photo ? metrics : null}
      {hasTrace ? <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <PosterTrace segments={segments} width={width - 2 * padding} height={graphHeight} light={light} />
      </View> : null}
      <View>
        {photo ? <View style={{ marginBottom: 17 * k }}>{metrics}</View> : null}
        <View style={{ height: 0.7 * k, backgroundColor: photo ? c.darkMuted : rule, marginBottom: 13 * k }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 18 * k }}>
          <View style={{ flex: 1, gap: 4 * k }}>
            <Text allowFontScaling={false} style={labelStyle}>{locale === 'fr' ? 'DURÉE' : 'TIME'}</Text>
            <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1}
              style={{ fontFamily: fonts.textMedium, fontSize: 22 * k, letterSpacing: -0.5 * k, color: ink }}>{facts.duration ?? '—'}</Text>
          </View>
          {facts.rate ? <View style={{ flex: 1, gap: 4 * k, alignItems: 'flex-end' }}>
            <Text allowFontScaling={false} style={labelStyle}>{facts.rateLabel}</Text>
            <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={{ fontFamily: fonts.textMedium, fontSize: 20 * k, color: ink }}>{facts.rate}</Text>
          </View> : null}
          {facts.gain ? <View style={{ flex: 1, gap: 4 * k, alignItems: 'flex-end' }}>
            <Text allowFontScaling={false} style={labelStyle}>{locale === 'fr' ? 'TERRAIN GAGNÉ' : 'TERRITORY GAINED'}</Text>
            <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1}
              style={{ fontFamily: fonts.textMedium, fontSize: 20 * k, letterSpacing: -0.5 * k, color: light ? c.ink : c.accent }}>+{facts.gain}</Text>
          </View> : null}
        </View>
      </View>
    </View>
  </View>;
}
