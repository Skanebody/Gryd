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
  /**
   * FOND « CHARTREUSE » DE LA FEUILLE COURTE (`quickShareRendering2026`) : la
   * mesure principale prend l'accent de marque. Rien d'autre ne change — ni le
   * fond, ni la trace, ni les données. C'est délibéré : la charte donne à la
   * chartreuse un quota de 8 à 10 % de la surface, or une affiche est presque
   * entièrement occupée par un chiffre géant et un tracé. Teinter le chiffre
   * ET la trace ferait de l'accent la couleur dominante de l'image.
   * Non fourni ⇒ `false`, donc le Studio est rendu à l'identique.
   */
  accent?: boolean;
}

/** Every path comes from the privacy-filtered trace. No filled inferred polygon,
 * map-provider tiles, invented street, location marker or arbitrary closure.
 */
export function SharePoster2026({ facts, segments, family, format, theme, width, photoUri, onPhotoLoaded, onPhotoError, locale, composition = 'classic', accent = false }: PosterProps) {
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
  /**
   * LES MESURES DU PIED, dans l'ordre de lecture et sans trou. La distance n'y
   * est pas : elle EST le titre. Une mesure absente ne produit pas de colonne —
   * jamais un « 0 » nu ni un tiret de remplissage sur une image qui SORT de
   * l'app (L8/L14). La durée fait exception et garde son tiret : sans elle il
   * n'y aurait pas de sortie du tout, et l'absence se dit alors franchement.
   */
  const footer = [
    { key: 'duration', label: locale === 'fr' ? 'DURÉE' : 'TIME', value: facts.duration ?? '—', accent: false },
    facts.rate ? { key: 'rate', label: facts.rateLabel, value: facts.rate, accent: false } : null,
    facts.elevation ? { key: 'elevation', label: locale === 'fr' ? 'DÉNIVELÉ' : 'ELEVATION', value: facts.elevation, accent: false } : null,
    // Le terrain gagné est la SEULE valeur accentuée : le quota de chartreuse
    // de la charte ne tient que si une seule mesure le porte.
    facts.gain ? { key: 'gain', label: locale === 'fr' ? 'TERRAIN GAGNÉ' : 'TERRITORY GAINED', value: `+${facts.gain}`, accent: true } : null,
  ].filter((column): column is { key: string; label: string; value: string; accent: boolean } => column !== null);
  const wrapped = footer.length > 3;
  // Le pied sur deux lignes prend la place d'une ligne de plus : la trace la
  // rend, sinon elle déborderait sous la marge basse de l'affiche.
  const graphHeight = hasTrace ? height - 2 * reserved - ((format === 'square' ? 191 : 212) + (wrapped ? (format === 'square' ? 30 : 41) : 0)) * k : 0;
  const distance = facts.distance?.replace(/\s+km$/, '');
  // Un carré n'a pas la hauteur d'une story. Quand le pied y prend deux
  // lignes, le titre cède quelques points pour que la TRACE reste visible :
  // c'est elle qui rend l'affiche reconnaissable, pas la taille du chiffre.
  const metricSize = (format === 'square' ? (wrapped ? 54 : 64) : 80) * k;
  const footerSize = format === 'square' ? 17 : 20;
  const rule = light ? c.border : c.darkSurfaceMuted;
  const labelStyle = { fontFamily: fonts.textMedium, fontSize: 9 * k, lineHeight: 13 * k, letterSpacing: 1.2 * k, color: muted };
  const metrics = <View>
    <Text allowFontScaling={false} style={labelStyle}>{distance ? 'DISTANCE' : locale === 'fr' ? 'ACTIVITÉ' : 'ACTIVITY'}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 * k, marginTop: 3 * k }}>
      <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}
        style={{ fontFamily: fonts.displayMedium, fontSize: metricSize, lineHeight: metricSize * 1.05, letterSpacing: -4 * k, color: accent && !light ? c.accent : ink, flexShrink: 1 }}>
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
        {/* LA MARQUE RESTE DISCRÈTE (cahier §15.2 : le partage sert l'acquisition,
            il ne place pas un panneau publicitaire sur la sortie de quelqu'un).
            Sous elle, le contexte — commune et date — quand ils sont CONNUS ;
            l'heure n'y est jamais (voir `startedAt` dans shareModel2026.ts). */}
        <View style={{ flexShrink: 1, gap: 4 * k }}>
          <GrydMark variant="wordmark" size={12 * k} color={ink} />
          {facts.context ? <Text allowFontScaling={false} numberOfLines={1} style={labelStyle}>{facts.context.toUpperCase()}</Text> : null}
        </View>
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
        {/* ─── LE PIED DE L'AFFICHE ─────────────────────────────────────────
            Trois mesures tiennent sur une ligne. La QUATRIÈME (le dénivelé,
            possible depuis `RunPoint.alt`) ne tient pas : mesuré en aperçu web
            le 10/09/2026, « 5:00 /km » devenait « 5:00… » et « +0,01 km² »
            devenait « +0,0… ». `adjustsFontSizeToFit` ne sauve rien ici — il
            rétrécirait le chiffre jusqu'à l'illisible sur une image destinée à
            être vue au pouce, dans un fil. Au-delà de trois, on passe donc en
            DEUX LIGNES DE DEUX : chaque valeur garde sa taille, et l'affiche
            reste lisible d'un coup d'œil. ─────────────────────────────────── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 18 * k, rowGap: 14 * k }}>
          {footer.map((column, index) => {
            // Sur une ligne : la première à gauche, les autres à droite. Sur
            // deux lignes : colonne paire à gauche, impaire à droite.
            const right = wrapped ? index % 2 === 1 : index > 0;
            return <View key={column.key} style={{ flexGrow: 1, flexShrink: 1, flexBasis: wrapped ? '42%' : 0, gap: 4 * k, alignItems: right ? 'flex-end' : 'flex-start' }}>
              <Text allowFontScaling={false} numberOfLines={1} style={labelStyle}>{column.label}</Text>
              <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}
                style={{ fontFamily: fonts.textMedium, fontSize: (column.key === 'duration' ? footerSize + 2 : footerSize) * k, letterSpacing: -0.5 * k, color: column.accent && !light ? c.accent : ink }}>{column.value}</Text>
            </View>;
          })}
        </View>
      </View>
    </View>
  </View>;
}
