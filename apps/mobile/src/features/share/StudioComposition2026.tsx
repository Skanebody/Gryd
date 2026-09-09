import { Text, View } from 'react-native';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydMark } from '../../ui/gryd/GrydMark';
import { PosterTrace } from './PosterTrace2026';
import type { PosterProps } from './SharePoster2026';
import { SHARE_EXPORT_FORMATS_2026 } from './shareModel2026';

export type StudioComposition = 'classic' | 'index' | 'contour' | 'tempo' | 'editorial';
export const STUDIO_COMPOSITIONS = ['classic', 'index', 'contour', 'tempo', 'editorial'] as const;

/** Original compositions of the same protected, factual activity. No invented map,
 * route, splits, elevation, achievement or decorative data. */
export function StudioComposition2026({ facts, segments, format, theme, width, locale, composition }: Pick<PosterProps, 'facts' | 'segments' | 'format' | 'theme' | 'width' | 'locale'> & { composition: Exclude<StudioComposition, 'classic'> }) {
  const height = width * SHARE_EXPORT_FORMATS_2026[format].height / SHARE_EXPORT_FORMATS_2026[format].width;
  const k = width / 360;
  const light = theme === 'light';
  const ink = light ? c.ink : c.darkInk;
  const muted = light ? c.muted : c.darkMuted;
  const surface = light ? c.surface : c.carbon;
  const rule = light ? c.border : c.darkSurfaceMuted;
  const pad = 26 * k;
  const safeY = format === 'story' ? height * 250 / 1920 : 26 * k;
  const inner = width - pad * 2;
  const room = height - safeY * 2;
  const distance = facts.distance?.replace(/\s+km$/, '') ?? '—';
  const hasTrace = segments.some(segment => segment.length >= 2);
  const indexSize = format === 'square' ? 60 : 83;
  const editorialSize = format === 'square' ? 66 : 94;
  const tempoGap = 13 * k;
  const tempoDivider = 0.7 * k;
  const tempoStatsWidth = inner * 0.44;
  const tempoTraceWidth = inner - tempoStatsWidth - tempoDivider - tempoGap * 2;
  const fr = locale === 'fr';
  const label = (text: string, color: string = muted) => <Text allowFontScaling={false} style={{ fontFamily: fonts.textMedium, fontSize: 9 * k, lineHeight: 13 * k, letterSpacing: 0.8 * k, color }}>{text}</Text>;
  const number = (text: string, size: number, color: string = ink) => <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ fontFamily: fonts.displayRegular, fontSize: size * k, lineHeight: size * 1.08 * k, letterSpacing: -size * 0.045 * k, color, flexShrink: 1 }}>{text}</Text>;
  const trace = (w: number, h: number) => <PosterTrace segments={segments} width={w} height={Math.max(30 * k, h)} light={light} />;
  const brand = <GrydMark variant="wordmark" size={11 * k} color={ink} />;
  const stat = (name: string, value: string | null, size = 22) => <View style={{ gap: 5 * k, flex: 1, minWidth: 0 }}>{label(name)}{number(value ?? '—', size)}</View>;
  const distanceUnit = facts.distance ? label('KM', ink) : null;
  const footer = <View style={{ borderTopWidth: k * 0.7, borderColor: rule, paddingTop: 12 * k, flexDirection: 'row', gap: 12 * k }}>
    {stat(fr ? 'DURÉE' : 'TIME', facts.duration)}
    {stat(facts.rateLabel, facts.rate)}
    {facts.gain ? stat(fr ? 'TERRAIN' : 'TERRITORY', `+${facts.gain}`, 18) : null}
  </View>;
  return <View collapsable={false} style={{ width, height, backgroundColor: surface, paddingHorizontal: pad, paddingVertical: safeY, overflow: 'hidden' }}>
    {!hasTrace ? <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>{brand}{label(facts.sport)}</View>
      <View style={{ gap: 18 * k }}>
        <View>{label('DISTANCE')}<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 * k }}>{number(distance, format === 'square' ? 60 : 76)}{distanceUnit}</View></View>
        {label(fr ? 'TRACE NON PARTAGÉE' : 'ROUTE NOT SHARED')}
      </View>
      {footer}
    </View> : composition === 'index' ? <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>{brand}{label(facts.sport)}</View>
      <View><View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 * k }}>{number(distance, indexSize)}{distanceUnit}</View>
        <View style={{ height: 4 * k, backgroundColor: light ? ink : c.accent, marginTop: 12 * k }} /></View>
      {trace(inner, room - (100 + indexSize * 1.08) * k)}
      {footer}
    </View> : composition === 'contour' ? <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{label(facts.sport)}{brand}</View>
      <View style={{ borderWidth: 0.7 * k, borderColor: rule, borderRadius: inner / 2, width: inner, height: Math.min(inner, room - 168 * k), alignItems: 'center', justifyContent: 'center' }}>
        {trace(inner * 0.78, Math.min(inner, room - 168 * k) * 0.78)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10 * k }}>{number(distance, 62)}{distanceUnit}</View>
      {footer}
    </View> : composition === 'tempo' ? <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>{brand}{label(facts.sport)}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tempoGap }}>
        <View style={{ width: tempoStatsWidth }}>
          {stat('KM', distance, 59)}
          <View style={{ height: 20 * k }} />
          {stat(fr ? 'DURÉE' : 'TIME', facts.duration, 32)}
          <View style={{ height: 20 * k }} />
          {stat(facts.rateLabel, facts.rate, 32)}
        </View>
        <View style={{ width: tempoDivider, height: room * 0.65, backgroundColor: rule }} />
        {trace(tempoTraceWidth, room * 0.67)}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: k * 0.7, borderColor: rule, paddingTop: 12 * k, justifyContent: 'space-between' }}>{label(fr ? 'UNE SORTIE. TA TRACE.' : 'YOUR ACTIVITY. YOUR ROUTE.')}{facts.gain ? label(`+${facts.gain}`, light ? ink : c.accent) : null}</View>
    </View> : <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View>{brand}<View style={{ height: 15 * k }} />{label(facts.sport)}</View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 * k }}>{number(distance, editorialSize)}{distanceUnit}</View>
      <View style={{ marginHorizontal: -pad, backgroundColor: light ? c.surfaceMuted : c.darkSurface, paddingVertical: 10 * k, alignItems: 'center' }}>
        {trace(inner * 0.85, room - (130 + editorialSize * 1.08) * k)}
      </View>
      {footer}
    </View>}
  </View>;
}
