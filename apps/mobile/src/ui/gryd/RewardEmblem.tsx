import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text } from 'react-native-svg';
import { EMBLEM_ARTWORK, rewardEmblemMark, type RewardVariant } from './emblems';
import { grydGraphicColors as c } from './palette';
export { REWARD_VARIANTS } from './emblems';
export type { RewardVariant } from './emblems';

export type RewardEmblemTier = 'road' | 'tempo' | 'race' | 'carbon' | 'elite' | 'legend';

export interface RewardEmblemProps {
  variant: RewardVariant;
  size?: number;
  tone?: 'neutral' | 'accent';
  /** Presentation only: ownership is always supplied by the verified ledger. */
  state?: 'preview' | 'locked' | 'earned';
  /** Displayed rank. It never computes or grants a level. */
  level?: number;
  /** Visual material only. Tier is supplied by the badge catalogue. */
  tier?: RewardEmblemTier;
  serial?: string;
  accessibilityLabel?: string;
}

const TIER_RANK: Record<RewardEmblemTier, number> = {
  road: 1, tempo: 2, race: 3, carbon: 4, elite: 5, legend: 6,
};

const STAR = 'M80 13.5l2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.8 2.6.9-5.5-4-3.9 5.5-.8 2.4-5Z';
const LEFT_WING = 'M57 47C43 34 25 31 10 38c9 4 16 9 21 16-8-2-16-1-24 2 12 5 20 11 27 20l24-8Z';
const RIGHT_WING = 'M103 47c14-13 32-16 47-9-9 4-16 9-21 16 8-2 16-1 24 2-12 5-20 11-27 20l-24-8Z';
const SHIELD = 'M80 29c18 0 32 8 37 17v35c0 25-16 43-37 55-21-12-37-30-37-55V46c5-9 19-17 37-17Z';

/** A numbered urban-sport medal: machined metal, enamel shield and family engraving. */
export function RewardEmblem({
  variant,
  size = 128,
  tone = 'neutral',
  state = 'preview',
  level,
  tier = 'road',
  serial,
  accessibilityLabel,
}: RewardEmblemProps) {
  const id = useId().replace(/:/g, '');
  const art = EMBLEM_ARTWORK[variant] ?? EMBLEM_ARTWORK.origin;
  const locked = state === 'locked';
  const earned = state === 'earned';
  const metal = `rewardMetal${id}`;
  const darkMetal = `rewardDark${id}`;
  const enamel = `rewardEnamel${id}`;
  const rank = TIER_RANK[tier];
  const mark = rewardEmblemMark(variant, level, serial);
  const crown = tier === 'legend';
  const winged = variant === 'relay' || variant === 'stride' || variant === 'horizon' || rank >= 5;
  const shieldFill = locked ? c.graphite : tier === 'carbon' ? c.black : c.charcoal;
  const accent = tone === 'accent' && !locked;

  return <Svg
    width={size}
    height={size}
    viewBox="0 0 160 160"
    accessible={!!accessibilityLabel}
    accessibilityRole={accessibilityLabel ? 'image' : undefined}
    accessibilityLabel={accessibilityLabel}
    aria-label={accessibilityLabel}
  >
    <Defs>
      <LinearGradient id={metal} x1="10%" y1="4%" x2="88%" y2="100%">
        <Stop offset="0" stopColor={c.white} />
        <Stop offset=".18" stopColor={c.silver} />
        <Stop offset=".42" stopColor={c.graphite} />
        <Stop offset=".62" stopColor={c.white} />
        <Stop offset=".82" stopColor={c.steel} />
        <Stop offset="1" stopColor={c.graphite} />
      </LinearGradient>
      <LinearGradient id={darkMetal} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0" stopColor={c.graphite} />
        <Stop offset=".45" stopColor={c.black} />
        <Stop offset=".72" stopColor={c.steel} />
        <Stop offset="1" stopColor={c.black} />
      </LinearGradient>
      <LinearGradient id={enamel} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0" stopColor={accent ? c.accent : c.white} />
        <Stop offset=".16" stopColor={accent ? c.accent : c.silver} />
        <Stop offset="1" stopColor={accent ? c.graphite : c.steel} />
      </LinearGradient>
    </Defs>

    <G opacity={locked ? .48 : state === 'preview' ? .82 : 1}>
      {winged ? <G transform="translate(0 4)" fill={c.black} opacity={.7}><Path d={LEFT_WING} /><Path d={RIGHT_WING} /></G> : null}
      <Path d={SHIELD} transform="translate(0 5)" fill={c.black} opacity={.75} />

      {winged ? <G fill={`url(#${metal})`} stroke={c.graphite} strokeWidth={2} strokeLinejoin="round">
        <Path d={LEFT_WING} /><Path d={RIGHT_WING} />
        <Path d="M16 40c16 3 28 10 37 22M12 55c18 1 29 6 39 14M144 40c-16 3-28 10-37 22m41-7c-18 1-29 6-39 14" fill="none" stroke={c.white} strokeWidth={1.5} opacity={.6} />
      </G> : null}

      <Path d={SHIELD} fill={`url(#${metal})`} stroke={c.black} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M80 35c14 0 25 6 30 13v31c0 20-12 36-30 47-18-11-30-27-30-47V48c5-7 16-13 30-13Z" fill={shieldFill} stroke={c.white} strokeWidth={1.4} opacity={.98} />
      <Path d="M54 50c7-8 16-11 26-11 11 0 21 4 27 12" fill="none" stroke={c.white} strokeWidth={2} opacity={.34} strokeLinecap="round" />

      <G transform="translate(56 36) scale(.3)" fill="none" stroke={locked ? c.silver : c.white} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
        <Path d={art.route} />
      </G>

      {rank >= 2 ? <Path d="M57 55v25c0 16 8 29 23 39 15-10 23-23 23-39V55" fill="none" stroke={c.silver} strokeWidth={1} opacity={.5} /> : null}
      {rank >= 3 ? <G fill={accent ? c.accent : c.white}><Circle cx={48} cy={70} r={2.5} /><Circle cx={112} cy={70} r={2.5} /></G> : null}

      <Rect x={58} y={91} width={44} height={25} rx={12.5} fill={c.black} stroke={`url(#${enamel})`} strokeWidth={2.4} />
      <Text x={80} y={109} fill={c.white} textAnchor="middle" fontFamily="monospace" fontSize={18} fontWeight="700" letterSpacing={1}>{mark}</Text>

      {Array.from({ length: 6 }, (_, index) => <Rect
        key={index}
        x={59 + index * 7.2}
        y={122}
        width={4.2}
        height={index < rank ? 5 : 2}
        rx={1}
        fill={index < rank ? (accent && rank >= 5 ? c.accent : c.white) : c.steel}
        opacity={index < rank ? 1 : .42}
      />)}

      <Circle cx={80} cy={25} r={11} fill={`url(#${darkMetal})`} stroke={`url(#${metal})`} strokeWidth={2.2} />
      <Path d={STAR} fill={crown && accent ? c.accent : c.white} stroke={c.black} strokeWidth={1.3} strokeLinejoin="round" />
      {earned ? <Path d="m97 49 4 4 8-10" fill="none" stroke={accent ? c.accent : c.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </G>

    {locked ? <G>
      <Circle cx={80} cy={85} r={18} fill={c.black} stroke={c.silver} strokeWidth={1.5} />
      <Path d="M72 83v-5a8 8 0 0 1 16 0v5m-19 0h22v17H69V83Z" fill={c.graphite} stroke={c.white} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={80} cy={91} r={2} fill={c.white} />
    </G> : null}
  </Svg>;
}
