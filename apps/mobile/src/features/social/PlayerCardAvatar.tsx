/**
 * GRYD — avatar hexagonal de la Player Card qui REFLÈTE l'équipement
 * (AMENDEMENT-16 §16 : équiper un cosmétique = effet tangible). Comme
 * PlayerAvatarFrame (ui/game), mais piloté par le PROFIL ÉDITABLE (couleur de
 * fond + initiales choisies) ET par le FRAME cosmétique ÉQUIPÉ (anneau extérieur
 * dérivé de la rareté du frame, recette BADGE_TIER_STYLE — jamais une couleur
 * décorative). Sans frame équipé → anneau par défaut du tier joueur.
 *
 * Ce composant vit dans social/** car ui/game/PlayerAvatarFrame n'accepte pas de
 * couleur/initiales custom ; on ne duplique QUE la géométrie hexagonale figée.
 */
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import {
  BADGE_TIER_STYLE,
  colors,
  gameColors,
  type BadgeTier,
} from '@klaim/shared';
import { itemByKey, isFrameItem } from '../arsenal';

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
const HEX_FRAME2 = hexPoints(CENTER, CENTER, HEX_RADIUS + 2.5);

/** Choisit un texte lisible (blanc/noir) sur un fond donné — contraste charte. */
function textOn(fill: string): string {
  // Fonds clairs (ivoire/chartreuse) → texte noir ; sombres → texte ivoire.
  return fill === colors.blanc || fill === colors.chartreuse ? colors.noir : colors.blanc;
}

export interface PlayerCardAvatarProps {
  /** Initiales déjà résolues (1-2 lettres). */
  initials: string;
  /** Couleur de fond de l'hexagone (token charte). */
  fillColor: string;
  /** Tier joueur (anneau par défaut si aucun frame équipé). */
  tier: BadgeTier;
  /** Clé de l'item FRAME équipé (portée profile) — override l'anneau si présent. */
  equippedFrameKey?: string;
  /** Côté en px (défaut 72, la Player Card). */
  size?: number;
  /** true = c'est MOI (contour chartreuse du corps). */
  isMe?: boolean;
}

/**
 * Rareté du frame équipé → recette d'anneau BADGE_TIER_STYLE (la MÊME que
 * PlayerAvatarFrame utilise pour le tier). Rien d'équipé → tier joueur.
 */
function ringTierFor(equippedFrameKey: string | undefined, playerTier: BadgeTier): BadgeTier {
  if (!equippedFrameKey) return playerTier;
  const item = itemByKey(equippedFrameKey);
  if (item && isFrameItem(item)) return item.rarity;
  return playerTier;
}

export function PlayerCardAvatar({
  initials,
  fillColor,
  tier,
  equippedFrameKey,
  size = 72,
  isMe = true,
}: PlayerCardAvatarProps) {
  const ringTier = ringTierFor(equippedFrameKey, tier);
  const frame = BADGE_TIER_STYLE[ringTier];
  const bodyStroke = isMe ? gameColors.crew : colors.grisLigne;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      {/* Anneau extérieur — dérivé de la rareté du frame équipé (effet tangible) */}
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
          points={HEX_FRAME2}
          fill="none"
          stroke={frame.ring2}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Corps : fond choisi + initiales choisies */}
      <Polygon points={HEX} fill={fillColor} />
      <SvgText
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        fontSize={34}
        fontWeight="600"
        fill={textOn(fillColor)}
      >
        {initials}
      </SvgText>
      <Polygon
        points={HEX}
        fill="none"
        stroke={bodyStroke}
        strokeWidth={isMe ? 2 : 1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
