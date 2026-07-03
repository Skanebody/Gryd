/**
 * GRYD — PlayerAvatarFrame : avatar hexagonal du joueur + frame par tier
 * (AMENDEMENT-08 §1, doc §18). Photo réelle clippée en hexagone si fournie,
 * sinon initiales sur fond carbone. La frame lit le TIER joueur via la recette
 * BADGE_TIER_STYLE (road → legend) — jamais de couleur décorative.
 */
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { BADGE_TIER_STYLE, colors, gameColors, type BadgeTier } from '@klaim/shared';

export type PlayerAvatarSize = 's' | 'm' | 'l' | 'xl';

/** Tailles gelées : s 32 (lignes de league) · m 48 (cartes) · l 72 · xl 112 (Player Card). */
const SIZES: Record<PlayerAvatarSize, number> = { s: 32, m: 48, l: 72, xl: 112 };

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const HEX_RADIUS = 38;

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const HEX = hexPoints(CENTER, CENTER, HEX_RADIUS);
const HEX_FRAME = hexPoints(CENTER, CENTER, HEX_RADIUS + 6);

export interface PlayerAvatarFrameProps {
  /** Pseudo — fournit l'initiale de repli. */
  name: string;
  /** Tier joueur (frame road → legend). Absent = pas de frame. */
  tier?: BadgeTier;
  size?: PlayerAvatarSize;
  /** Photo de profil (uri locale/distante). Repli : initiales. */
  imageUri?: string;
  /** true = c'est MOI (contour chartreuse — ton crew/moi de la charte). */
  isMe?: boolean;
}

export function PlayerAvatarFrame({
  name,
  tier,
  size = 'm',
  imageUri,
  isMe = false,
}: PlayerAvatarFrameProps) {
  const px = SIZES[size];
  const frame = tier ? BADGE_TIER_STYLE[tier] : null;
  const bodyStroke = isMe ? gameColors.crew : colors.grisLigne;
  const initials = (name.trim().charAt(0) || '?').toUpperCase();
  const clipId = `pavf-${size}-${isMe ? 'me' : 'x'}`;

  return (
    <Svg width={px} height={px} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={HEX} />
        </ClipPath>
      </Defs>

      {/* Frame de tier (anneau extérieur) */}
      {frame ? (
        <Polygon
          points={HEX_FRAME}
          fill="none"
          stroke={frame.ring}
          strokeWidth={frame.strokeWidth}
          strokeLinejoin="round"
        />
      ) : null}
      {frame?.ring2 ? (
        <Polygon
          points={hexPoints(CENTER, CENTER, HEX_RADIUS + 2.5)}
          fill="none"
          stroke={frame.ring2}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Corps : photo clippée hex, ou initiale sur carbone */}
      <Polygon points={HEX} fill={colors.carbone2} />
      {imageUri ? (
        <SvgImage
          x={CENTER - HEX_RADIUS}
          y={CENTER - HEX_RADIUS}
          width={HEX_RADIUS * 2}
          height={HEX_RADIUS * 2}
          preserveAspectRatio="xMidYMid slice"
          href={{ uri: imageUri }}
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <SvgText
          x={CENTER}
          y={CENTER + 12}
          textAnchor="middle"
          fontSize={34}
          fontWeight="600"
          fill={colors.blanc}
        >
          {initials}
        </SvgText>
      )}
      <Polygon points={HEX} fill="none" stroke={bodyStroke} strokeWidth={isMe ? 2 : 1.5} strokeLinejoin="round" />
    </Svg>
  );
}
