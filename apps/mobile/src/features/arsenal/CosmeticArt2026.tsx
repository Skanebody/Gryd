/**
 * GRYD — LE RENDU DES COSMÉTIQUES DE PROFIL. 100 % code, zéro image.
 *
 * ─── CE QUI EST DESSINÉ ICI, ET AVEC QUOI ───────────────────────────────────
 * Sept familles, toutes en SVG, en dégradés et en typographie déjà chargée :
 * aucun fichier n'est livré, aucun asset n'est téléchargé, rien ne pèse dans le
 * bundle au-delà de ces quelques centaines de lignes. C'est la contrainte du
 * fondateur (« que du code, qui ne coûte rien ») prise au mot.
 *
 * ─── POURQUOI CE FICHIER EST SÉPARÉ DU CATALOGUE ────────────────────────────
 * `cosmetics2026.ts` est PUR (testé sous Deno). Il décrit ; ce fichier peint.
 * Le jour où une famille change de look, le catalogue ne bouge pas — et le
 * serveur, qui ne connaît que des identifiants, encore moins.
 *
 * ─── L15 : LA COULEUR NE PORTE JAMAIS SEULE ─────────────────────────────────
 * Chaque cadre a une FORME distincte (liseré, double, couture pointillée,
 * pulsation, hexagone), chaque bannière un MOTIF (trame, hachures, courbes), et
 * chaque pin une silhouette. Deux joueurs qui ne distinguent pas la chartreuse
 * de l'ivoire distinguent un hexagone d'une goutte. Les aperçus portent en plus
 * le NOM de l'objet, en toutes lettres, dans la liste.
 *
 * ─── L6 : L'ANIMATION SE COUPE ──────────────────────────────────────────────
 * La seule animation du lot est la pulsation du cadre GRYD+. Elle s'arrête si
 * « Réduire les animations » est actif (`useReduceMotion`), et le cadre reste
 * alors parfaitement lisible : la forme ne dépend pas du mouvement.
 */
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { ReactNode } from 'react';
import { colors, fonts, refonteColors as c, withAlpha } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game/anim';
import {
  type AvatarFrameCosmetic2026, type BannerCosmetic2026, type CosmeticItem2026,
  type CosmeticSlot2026, type NameColorCosmetic2026, type PinCosmetic2026,
  type TitleBadgeCosmetic2026, equippedCosmetic2026,
} from './cosmetics2026';

/** Durée d'un aller de la pulsation (ms). Pas une règle de jeu : un rythme. */
const PULSE_MS = 1_400;
/** Opacité basse de la pulsation. Le cadre ne disparaît jamais complètement. */
const PULSE_LOW = 0.35;

// ════════════════════════════════════════════════════════════════════════════
// (a) LE NOM ET LE @PSEUDO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Un aplat se peint avec un `<Text>` ordinaire — il garde le retour à la ligne,
 * la sélection et la mise à l'échelle des polices système. Un DÉGRADÉ, lui, n'a
 * pas d'équivalent en style RN : il passe par un `<Text>` SVG rempli d'un
 * `linearGradient`. On y perd le retour à la ligne, donc le composant demande
 * sa largeur et tronque proprement plutôt que de déborder.
 *
 * `accessibilityLabel` est TOUJOURS le texte lui-même : un lecteur d'écran doit
 * lire un nom, pas « image ».
 */
export function CosmeticName2026({ item, text, size, weight = '600', style, numberOfLines = 1 }: {
  item: CosmeticItem2026; text: string; size: number;
  weight?: '400' | '500' | '600' | '700'; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  if (item.family !== 'nameColor' || item.ink.kind === 'solid') {
    const color = item.family === 'nameColor' && item.ink.kind === 'solid' ? item.ink.color : c.darkInk;
    // La couleur du cosmétique passe APRÈS le style reçu : l'appelant fournit la
    // typographie (police, taille, interlignage), l'objet équipé fournit
    // l'encre. L'ordre inverse laissait un `color` d'écran écraser le cadeau.
    return <Text numberOfLines={numberOfLines} style={[style, { color }]}>{text}</Text>;
  }
  const gradient = item.ink.gradient;
  const gradientId = `cosmetic-name-${gradient.id}`;
  // La boîte SVG doit contenir la ligne de base : 1,3 × la taille suffit pour
  // les jambages des polices du dépôt, et la largeur est estimée large.
  const height = Math.ceil(size * 1.3);
  const width = Math.ceil(size * 0.62 * Math.max(1, text.length) + size * 0.4);
  return <View accessible accessibilityRole="text" accessibilityLabel={text} style={{ height }}>
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={gradient.from} />
          <Stop offset="1" stopColor={gradient.to} />
        </LinearGradient>
      </Defs>
      <SvgText
        x={0} y={size} fontSize={size} fontWeight={weight}
        fontFamily={weight === '400' ? fonts.text : fonts.textSemi}
        fill={`url(#${gradientId})`}
      >{text}</SvgText>
    </Svg>
  </View>;
}

// ════════════════════════════════════════════════════════════════════════════
// (b) LE CADRE D'AVATAR
// ════════════════════════════════════════════════════════════════════════════

/**
 * Enveloppe l'avatar existant sans jamais le redessiner : ce lot n'a pas à
 * savoir si l'avatar est une photo, un hexagone ou des initiales. Il pose un
 * anneau AUTOUR, dans une boîte qui grandit de l'épaisseur du cadre — l'ancrage
 * du contenu ne bouge donc pas d'un pixel quand on change de cadre.
 */
export function CosmeticFrame2026({ item, size, children, label }: {
  item: CosmeticItem2026; size: number; children: ReactNode; label?: string;
}) {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  const frame: AvatarFrameCosmetic2026 | null = item.family === 'avatarFrame' ? item : null;
  const animated = frame?.ring === 'pulse' && !reduce;

  useEffect(() => {
    if (!animated) { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: PULSE_LOW, duration: PULSE_MS, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, pulse]);

  if (!frame || frame.ring === 'none') return <>{children}</>;

  const pad = Math.max(4, Math.round(size * 0.1));
  const box = size + pad * 2;
  const ring = <CosmeticRingArt2026 frame={frame} box={box} />;
  return <View
    accessible={!!label && Platform.OS !== 'web'}
    accessibilityRole={label ? 'image' : undefined}
    accessibilityLabel={label}
    style={[styles.frameBox, { width: box, height: box }]}
  >
    {animated
      ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: pulse }]}>{ring}</Animated.View>
      : <View pointerEvents="none" style={StyleSheet.absoluteFill}>{ring}</View>}
    {children}
  </View>;
}

/** Les cinq anneaux, en SVG pur. `stitch` porte un pointillé, jamais une teinte seule. */
function CosmeticRingArt2026({ frame, box }: { frame: AvatarFrameCosmetic2026; box: number }) {
  const half = frame.width / 2;
  const radius = Math.round(box * 0.28);
  const inset = half + 0.5;
  if (frame.ring === 'hex') {
    const points = hexPoints(box / 2, box / 2, box / 2 - inset);
    return <Svg width={box} height={box}>
      <Polygon points={points} fill="none" stroke={withAlpha(frame.color, 0.35)} strokeWidth={frame.width * 2.4} strokeLinejoin="round" />
      <Polygon points={points} fill="none" stroke={frame.color} strokeWidth={frame.width} strokeLinejoin="round" />
    </Svg>;
  }
  return <Svg width={box} height={box}>
    <Rect
      x={inset} y={inset} width={box - inset * 2} height={box - inset * 2}
      rx={radius} ry={radius} fill="none" stroke={frame.color} strokeWidth={frame.width}
      {...(frame.ring === 'stitch' ? { strokeDasharray: [3, 3] } : {})}
    />
    {frame.ring === 'double' ? <Rect
      x={inset + frame.width + 2} y={inset + frame.width + 2}
      width={box - (inset + frame.width + 2) * 2} height={box - (inset + frame.width + 2) * 2}
      rx={Math.max(0, radius - frame.width - 2)} ry={Math.max(0, radius - frame.width - 2)}
      fill="none" stroke={withAlpha(frame.color, 0.45)} strokeWidth={1}
    /> : null}
    {frame.ring === 'pulse' ? <Rect
      x={0.5} y={0.5} width={box - 1} height={box - 1}
      rx={radius + frame.width} ry={radius + frame.width}
      fill="none" stroke={withAlpha(frame.color, 0.3)} strokeWidth={1}
    /> : null}
  </Svg>;
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

// ════════════════════════════════════════════════════════════════════════════
// (c) LA BANNIÈRE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Un rectangle, un dégradé optionnel, un motif. JAMAIS une photo : une photo
 * serait un contenu importé — stockage, modération, vie privée — pour un objet
 * décoratif. La bannière se pose DERRIÈRE l'identité et ne prend jamais les
 * gestes (`pointerEvents="none"` chez l'appelant).
 */
export function CosmeticBanner2026({ item, width, height, radius = 24 }: {
  item: CosmeticItem2026; width: number; height: number; radius?: number;
}) {
  if (item.family !== 'banner' || width <= 0 || height <= 0) return null;
  const banner: BannerCosmetic2026 = item;
  const gradientId = `cosmetic-banner-${banner.id}`;
  const step = Math.max(10, Math.round(height / 4));
  return <Svg width={width} height={height} pointerEvents="none">
    {banner.gradient ? <Defs>
      <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={withAlpha(banner.gradient.from, 0.55)} />
        <Stop offset="1" stopColor={withAlpha(banner.gradient.to, 0.12)} />
      </LinearGradient>
    </Defs> : null}
    <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={banner.base} />
    {banner.gradient ? <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={`url(#${gradientId})`} /> : null}
    <G>
      {banner.pattern === 'grid' ? <>
        {range(Math.ceil(width / step)).map(index => <Line key={`v${index}`}
          x1={index * step} y1={0} x2={index * step} y2={height} stroke={banner.patternColor} strokeWidth={1} />)}
        {range(Math.ceil(height / step)).map(index => <Line key={`h${index}`}
          x1={0} y1={index * step} x2={width} y2={index * step} stroke={banner.patternColor} strokeWidth={1} />)}
      </> : null}
      {banner.pattern === 'hatch' ? range(Math.ceil((width + height) / step)).map(index => <Line key={index}
        x1={index * step - height} y1={height} x2={index * step} y2={0}
        stroke={banner.patternColor} strokeWidth={1.5} />) : null}
      {banner.pattern === 'contour' ? range(4).map(index => <Path key={index}
        d={contourPath(width, height, index)} fill="none"
        stroke={banner.patternColor} strokeWidth={1.5} strokeLinecap="round" />) : null}
    </G>
  </Svg>;
}

const range = (count: number): number[] => Array.from({ length: Math.max(0, count) }, (_, index) => index);

/** Une courbe de niveau : une sinusoïde en Bézier, décalée à chaque passe. */
function contourPath(width: number, height: number, index: number): string {
  const y = height * (0.2 + index * 0.2);
  const amplitude = height * 0.12;
  return `M0 ${y.toFixed(1)} C ${(width * 0.25).toFixed(1)} ${(y - amplitude).toFixed(1)}, `
    + `${(width * 0.55).toFixed(1)} ${(y + amplitude).toFixed(1)}, ${width.toFixed(1)} ${(y - amplitude / 2).toFixed(1)}`;
}

// ════════════════════════════════════════════════════════════════════════════
// (g) LE BADGE DE TITRE
// ════════════════════════════════════════════════════════════════════════════

/**
 * G22 : « pas de sept rangs différents au-dessus du nom ». Ce badge ne CLASSE
 * rien — il met en forme le titre déjà possédé (§7.2/§7.3), et il n'apparaît
 * que si un titre est équipé. Le contour est une ombre portée typographique,
 * pas un second texte : un lecteur d'écran ne lit jamais le titre deux fois.
 */
export function CosmeticTitleBadge2026({ item, label, size = 11 }: {
  item: CosmeticItem2026; label: string; size?: number;
}) {
  if (item.family !== 'titleBadge') return <Text style={styles.title}>{label}</Text>;
  const badge: TitleBadgeCosmetic2026 = item;
  const text = badge.letterCase === 'upper' ? label.toLocaleUpperCase('fr-FR') : label;
  return <Text
    accessibilityLabel={label}
    numberOfLines={1}
    style={[styles.title, {
      color: badge.color,
      fontSize: size,
      lineHeight: Math.round(size * 1.45),
      letterSpacing: badge.letterCase === 'upper' ? 1.1 : 0,
      fontFamily: badge.outline ? fonts.displayMedium : fonts.textMedium,
      ...(badge.outline ? {
        textShadowColor: withAlpha(colors.noir, 0.85),
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      } : {}),
    }]}
  >{text}</Text>;
}

// ════════════════════════════════════════════════════════════════════════════
// LES APERÇUS DE LA LISTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * L'aperçu MONTRE CE QUE ÇA FAIT — pas une icône générique. C'est la leçon déjà
 * payée par `preview/cosmetic.tsx` (« on ne sait pas à quoi servent les
 * objets »). Un cadre s'affiche autour d'un carré neutre, une trace comme une
 * trace, un pin comme un pin, un thème comme une mini-affiche.
 */
export function CosmeticPreview2026({ item, size = 72 }: { item: CosmeticItem2026; size?: number }) {
  switch (item.family) {
    case 'nameColor':
      return <View style={[styles.preview, { width: size, height: size }]}>
        <CosmeticNameSample2026 item={item} size={Math.round(size * 0.3)} />
      </View>;
    case 'avatarFrame': {
      const inner = Math.round(size * 0.52);
      return <View style={[styles.preview, { width: size, height: size }]}>
        <CosmeticFrame2026 item={item} size={inner}>
          <View style={{ width: inner, height: inner, borderRadius: Math.round(inner * 0.28), backgroundColor: colors.carbone2 }} />
        </CosmeticFrame2026>
      </View>;
    }
    case 'banner':
      return <View style={[styles.preview, { width: size, height: size, padding: 0, overflow: 'hidden' }]}>
        <CosmeticBanner2026 item={item} width={size} height={size} radius={12} />
      </View>;
    case 'trace':
      return <View style={[styles.preview, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {item.blur > 0 ? <Path d={TRACE_PATH(size)} fill="none" stroke={withAlpha(item.color, 0.28)}
            strokeWidth={item.width * 3} strokeLinecap="round" strokeLinejoin="round" /> : null}
          <Path d={TRACE_PATH(size)} fill="none" stroke={item.color}
            strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>;
    case 'pin':
      return <View style={[styles.preview, { width: size, height: size }]}>
        <Svg width={size * 0.62} height={size * 0.78} viewBox="0 0 40 52">
          <Path d={PIN_PATHS_2026[item.shape]} fill={colors.carbone3} stroke={colors.chartreuse} strokeWidth={2} strokeLinejoin="round" />
        </Svg>
      </View>;
    case 'titleBadge':
      return <View style={[styles.preview, { width: size, height: size }]}>
        <CosmeticTitleBadge2026 item={item} label={item.name.fr} size={Math.round(size * 0.16)} />
      </View>;
    case 'cardTheme':
      return <View style={[styles.preview, { width: size, height: size, padding: 0, overflow: 'hidden' }]}>
        <Svg width={size} height={size}>
          <Rect x={0} y={0} width={size} height={size} rx={12} ry={12} fill={item.background} />
          <Rect x={size * 0.16} y={size * 0.22} width={size * 0.5} height={2.5} rx={1.25} fill={item.ink} />
          <Rect x={size * 0.16} y={size * 0.34} width={size * 0.32} height={2.5} rx={1.25} fill={withAlpha(item.ink, 0.5)} />
          <Path d={TRACE_PATH(size)} fill="none" stroke={item.accent} strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      </View>;
  }
}

function CosmeticNameSample2026({ item, size }: { item: NameColorCosmetic2026; size: number }) {
  return <CosmeticName2026 item={item} text="GRYD" size={size} weight="700" style={styles.sample} />;
}

/** Une boucle de course stylisée : le même geste dans tous les aperçus. */
const TRACE_PATH = (size: number): string => {
  const s = (value: number) => (value * size).toFixed(1);
  return `M${s(0.18)} ${s(0.74)} C ${s(0.1)} ${s(0.4)}, ${s(0.38)} ${s(0.2)}, ${s(0.58)} ${s(0.34)} `
    + `S ${s(0.9)} ${s(0.56)}, ${s(0.78)} ${s(0.76)}`;
};

/**
 * LES CINQ SILHOUETTES DE PIN, dans le viewBox 40×52 de `MePinMarker2026` :
 * la POINTE reste en (20, 50) pour toutes, parce que c'est elle qui tombe sur
 * la coordonnée. Changer de pin ne déplace donc JAMAIS la position affichée.
 */
export const PIN_PATHS_2026: Readonly<Record<PinCosmetic2026['shape'], string>> = {
  /** Goutte historique : tête ronde de rayon 18 centrée en (20, 20). */
  drop: 'M20 50 L11 35.6 A18 18 0 1 1 29 35.6 Z',
  /** Hexagone pointe en bas : six sommets réguliers autour de (20, 20). */
  hex: 'M20 50 L4.4 29 L4.4 11 L20 2 L35.6 11 L35.6 29 Z',
  /** Éclair : un blason anguleux, encoché sur les flancs. */
  bolt: 'M20 50 L5 32 L9 20 L2 14 L20 2 L38 14 L31 20 L35 32 Z',
  /** Couronne : trois pointes au sommet, socle plein jusqu'à la pointe. */
  crown: 'M20 50 L5 33 L5 12 L11 19 L20 6 L29 19 L35 12 L35 33 Z',
  /** Blason : épaules droites, base en ogive. */
  crest: 'M20 50 C 8 42 4 34 4 22 L4 6 L36 6 L36 22 C 36 34 32 42 20 50 Z',
};

/** Le pin de la carte, dessiné pour l'objet équipé. Utilisé par MePinMarker2026. */
export function pinPathForCosmetic2026(equippedId: string | null | undefined): string {
  const item = equippedCosmetic2026('pin', equippedId);
  return item.family === 'pin' ? PIN_PATHS_2026[item.shape] : PIN_PATHS_2026.drop;
}

/** Le nom d'une famille, tel qu'il s'affiche en tête de section. */
export const COSMETIC_FAMILY_LABELS_2026: Readonly<Record<CosmeticSlot2026, { fr: string; en: string }>> = {
  nameColor: { fr: 'Couleur du nom', en: 'Name colour' },
  avatarFrame: { fr: 'Cadre d’avatar', en: 'Avatar frame' },
  banner: { fr: 'Bannière de profil', en: 'Profile banner' },
  trace: { fr: 'Style de trace', en: 'Trace style' },
  pin: { fr: 'Marqueur sur la carte', en: 'Map marker' },
  titleBadge: { fr: 'Badge de titre', en: 'Title badge' },
  cardTheme: { fr: 'Thème de partage', en: 'Sharing theme' },
};

/** Où chaque famille se VOIT. Une promesse vérifiable, jamais « partout ». */
export const COSMETIC_FAMILY_WHERE_2026: Readonly<Record<CosmeticSlot2026, { fr: string; en: string }>> = {
  nameColor: { fr: 'Sur ton profil et sur ta fiche vue par les autres.', en: 'On your profile and on the card others see.' },
  avatarFrame: { fr: 'Autour de ton avatar, partout où il apparaît.', en: 'Around your avatar, everywhere it appears.' },
  banner: { fr: 'Derrière ton identité, en haut du profil.', en: 'Behind your identity, at the top of your profile.' },
  trace: { fr: 'Sur ta trace et ton terrain, sur la carte.', en: 'On your trace and your ground, on the map.' },
  pin: { fr: 'Sur le marqueur de ta position, sur la carte.', en: 'On your position marker, on the map.' },
  titleBadge: { fr: 'Sur le titre équipé, sous ton nom.', en: 'On your equipped title, under your name.' },
  cardTheme: { fr: 'Sur les cartes que tu exportes depuis le Studio.', en: 'On the cards you export from the Studio.' },
};

const styles = StyleSheet.create({
  frameBox: { alignItems: 'center', justifyContent: 'center' },
  preview: {
    alignItems: 'center', justifyContent: 'center', padding: 6,
    borderRadius: 12, backgroundColor: colors.carbone,
  },
  sample: { fontFamily: fonts.displayMedium },
  title: { fontFamily: fonts.textMedium, fontSize: 11, lineHeight: 16, color: c.darkMuted },
});
