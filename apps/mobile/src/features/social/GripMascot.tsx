/**
 * GRYD — GRIP, le personnage-mascotte propriétaire. Une POSE par rang joueur
 * (§43.3, GRIP_RANK_LEVELS) : la bande de référence fondateur, noir sur chartreuse.
 * nu (Rookie) → course (Runner) → loupe (Scout) → bouclier (Defender) →
 * drapeau (Conqueror) → bandeau étoile (Veteran) → couronne (Legend).
 *
 * COSMÉTIQUE PUR : la pose est DÉRIVÉE du rang (gripRankForLevel), jamais achetée.
 * Aucune couleur hors tokens (charte) : encre = colors.noir, yeux = colors.blanc,
 * tuile = colors.chartreuse. Géométrie figée (comme PlayerCardAvatar) — SVG pur,
 * pas de <use>/<defs> (react-native-svg), le corps est inline par pose pour le z-order.
 */
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors, type GripRank } from '@klaim/shared';

const INK = colors.noir;
const EYE = colors.blanc;
const TILE = colors.chartreuse;

/** Corps commun : anneau G + langue + yeux blancs (sans pupilles). */
function Core() {
  return (
    <G>
      <Path d="M150 64 A57 57 0 1 0 150 152" fill="none" stroke={INK} strokeWidth={38} />
      <Path d="M152 112 H109" fill="none" stroke={INK} strokeWidth={26} strokeLinecap="round" />
      <Circle cx={82} cy={50} r={24} fill={EYE} stroke={INK} strokeWidth={5} />
      <Circle cx={124} cy={44} r={26} fill={EYE} stroke={INK} strokeWidth={5} />
    </G>
  );
}

/** Jambes debout (poses statiques). */
function StandLegs() {
  return (
    <G stroke={INK} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path d="M86 150 V176 L72 185" />
      <Path d="M118 150 V176 L132 185" />
    </G>
  );
}

/** Table des 7 poses — clés = GripRank. Ordre de rendu = z-order (arrière → avant). */
const POSES: Record<GripRank, () => React.ReactElement> = {
  rookie: () => (
    <G>
      <Core />
      <Circle cx={86} cy={46} r={10.5} fill={INK} />
      <Circle cx={130} cy={42} r={11.5} fill={INK} />
      <StandLegs />
    </G>
  ),

  runner: () => (
    <G>
      {/* lignes de vitesse (hors rotation) */}
      <G stroke={INK} strokeWidth={6} strokeLinecap="round">
        <Path d="M2 132 h30" />
        <Path d="M-4 150 h34" />
        <Path d="M6 168 h26" />
      </G>
      <G rotation={-12} origin="104, 112">
        <Core />
        <Circle cx={92} cy={44} r={10.5} fill={INK} />
        <Circle cx={134} cy={40} r={11.5} fill={INK} />
        <Path d="M90 150 L60 168 L44 172" fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M122 150 L134 168 L126 188" fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M28 168 h22 a7 7 0 0 1 7 7 v3 h-33 z" fill={INK} />
        <Path d="M26 180 h33" stroke={TILE} strokeWidth={3} strokeLinecap="round" />
      </G>
    </G>
  ),

  scout: () => (
    <G>
      {/* bras + loupe (derrière le corps) */}
      <Path d="M64 118 Q46 102 52 84" fill="none" stroke={INK} strokeWidth={15} strokeLinecap="round" />
      <Circle cx={52} cy={70} r={15} fill="none" stroke={INK} strokeWidth={7} />
      <Path d="M60 81 L72 94" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <Core />
      <Circle cx={76} cy={44} r={10.5} fill={INK} />
      <Circle cx={132} cy={40} r={11.5} fill={INK} />
      <StandLegs />
    </G>
  ),

  defender: () => (
    <G>
      <Core />
      <Circle cx={88} cy={48} r={10.5} fill={INK} />
      <Circle cx={132} cy={46} r={11.5} fill={INK} />
      <G stroke={INK} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M86 150 V176 L72 185" />
        <Path d="M112 150 V176 L126 185" />
      </G>
      {/* bouclier tenu à droite + coche chartreuse */}
      <Path d="M152 96 l24 8 v16 c0 15 -11 24 -24 29 c-13 -5 -24 -14 -24 -29 v-16 z" fill={INK} />
      <Path d="M143 122 l6 7 12 -15" fill="none" stroke={TILE} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),

  conqueror: () => (
    <G>
      {/* bras + mât + fanion (derrière) */}
      <Path d="M130 116 Q150 108 154 92" fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <Path d="M154 92 V-26" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <Path d="M154 -26 L198 -8 L154 10 Z" fill={INK} />
      <Core />
      <Circle cx={84} cy={44} r={10.5} fill={INK} />
      <Circle cx={126} cy={40} r={11.5} fill={INK} />
      <G stroke={INK} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M84 150 L78 178 L66 184" />
        <Path d="M116 150 L126 176 L138 182" />
      </G>
    </G>
  ),

  veteran: () => (
    <G>
      <Core />
      <Circle cx={86} cy={42} r={10} fill={INK} />
      <Circle cx={130} cy={38} r={11} fill={INK} />
      {/* bandeau + queue + étoile blanche */}
      <Path d="M54 58 Q104 70 154 54 L158 66 Q104 82 52 70 Z" fill={INK} />
      <Path d="M154 60 l20 -4 -3 15 z" fill={INK} />
      <Path d="M104 56 l3.2 6.5 7.2 .6 -5.4 4.9 1.7 7.1 -6.7 -3.8 -6.7 3.8 1.7 -7.1 -5.4 -4.9 7.2 -.6z" fill={EYE} />
      <StandLegs />
    </G>
  ),

  legend: () => (
    <G>
      {/* couronne + gemme */}
      <Path d="M64 22 L84 -8 102 16 120 -10 138 16 156 -8 162 26 Z" fill={INK} />
      <Circle cx={102} cy={12} r={3.4} fill={TILE} />
      {/* bras poings sur hanches (derrière) */}
      <Path d="M60 116 Q34 122 46 148 L66 152" fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M132 116 Q162 122 150 148 L132 152" fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <Core />
      {/* sourcils fâchés + pupilles basses */}
      <Path d="M70 36 L94 46" stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <Path d="M140 32 L116 44" stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <Circle cx={86} cy={58} r={10} fill={INK} />
      <Circle cx={126} cy={56} r={11} fill={INK} />
      <G stroke={INK} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M84 150 V176 L70 185" />
        <Path d="M120 150 V176 L134 185" />
      </G>
    </G>
  ),
};

export interface GripMascotProps {
  /** Rang GRIP (dérivé du niveau via gripRankForLevel) → pose affichée. */
  rank: GripRank;
  /** Largeur en px (défaut 88). La hauteur suit le ratio de la scène. */
  size?: number;
  /** Tuile chartreuse arrière-plan (défaut true — le perso vit sur chartreuse). */
  tile?: boolean;
}

/** GRIP à la pose de son rang. Cosmétique, dérivé du niveau — jamais acheté. */
export function GripMascot({ rank, size = 88, tile = true }: GripMascotProps) {
  const height = Math.round((size * 246) / 200);
  return (
    <Svg
      width={size}
      height={height}
      viewBox="0 -34 200 246"
      accessibilityLabel={`GRIP · rang ${rank}`}
    >
      {tile ? <Rect x={0} y={-34} width={200} height={246} rx={40} fill={TILE} /> : null}
      {POSES[rank]()}
    </Svg>
  );
}
