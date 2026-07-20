/**
 * GRYD — PlayerAvatarFrame : avatar hexagonal du joueur + frame par tier
 * (AMENDEMENT-08 §1, doc §18). Photo réelle clippée en hexagone si fournie,
 * sinon initiales sur fond carbone. La frame lit le TIER joueur via la recette
 * BADGE_TIER_STYLE (road → legend) — jamais de couleur décorative.
 *
 * GÉOMÉTRIE : partagée avec PlayerCardAvatar via `./hexAvatar` (une seule
 * recette pour tout le jeu). Les défauts d'alignement corrigés y sont
 * documentés — notamment le contour de corps qui était plus ÉPAIS pour « moi »
 * (2 vs 1,5), ce qui rendait mon avatar plus gros que celui des autres sur la
 * même ligne de classement. Le rôle se lit à la COULEUR, jamais à la taille.
 *
 * La boîte de layout n'est PAS carrée : un hexagone régulier fait √3/2 de large
 * pour 1 de haut. `hexAvatarWidth(size)` donne la largeur exacte — sans quoi le
 * composant réserve un vide fantôme à gauche et à droite.
 */
import { useId } from 'react';
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { BADGE_TIER_STYLE, colors, gameColors, type BadgeTier } from '@klaim/shared';
import {
  BODY_R,
  BODY_STROKE,
  INITIALS_BASELINE,
  INITIALS_FONT,
  RING2_R,
  RING2_W,
  hexAvatarBox,
  hexAvatarWidth,
  hexPoints,
  ringRadiusFor,
} from './hexAvatar';

export type PlayerAvatarSize = 's' | 'm' | 'l' | 'xl';

/** Hauteurs gelées : s 32 (lignes de league) · m 48 (cartes) · l 72 · xl 112 (Player Card). */
const SIZES: Record<PlayerAvatarSize, number> = { s: 32, m: 48, l: 72, xl: 112 };

/** Largeur RÉELLE occupée par un avatar — à utiliser pour réserver la place. */
export function playerAvatarWidth(size: PlayerAvatarSize): number {
  return hexAvatarWidth(SIZES[size]);
}

export interface PlayerAvatarFrameProps {
  /** Pseudo — fournit l'initiale de repli. */
  name: string;
  /** Tier joueur (frame road → legend). Absent = pas de frame. */
  tier?: BadgeTier;
  size?: PlayerAvatarSize;
  /** Photo de profil (uri locale/distante). Repli : initiales. */
  imageUri?: string;
  /** true = c'est MOI (contour chartreuse — COULEUR seule, jamais l'épaisseur). */
  isMe?: boolean;
}

export function PlayerAvatarFrame({
  name,
  tier,
  size = 'm',
  imageUri,
  isMe = false,
}: PlayerAvatarFrameProps) {
  const box = hexAvatarBox(SIZES[size]);
  const frame = tier ? BADGE_TIER_STYLE[tier] : null;
  const bodyStroke = isMe ? gameColors.crew : colors.grisLigne;
  const initials = (name.trim().charAt(0) || '?').toUpperCase();
  const body = hexPoints(box.cx, box.cy, BODY_R);
  // Id UNIQUE par instance (l'ancien `pavf-${size}-${isMe}` collisionnait dès
  // que deux avatars de même taille cohabitaient sur un écran).
  const clipId = `pavf-${useId()}`;

  return (
    <Svg width={box.width} height={box.height} viewBox={box.viewBox}>
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={body} />
        </ClipPath>
      </Defs>

      {/* Frame de tier — posée par son BORD EXTÉRIEUR : même empreinte pour tous. */}
      {frame ? (
        <Polygon
          points={hexPoints(box.cx, box.cy, ringRadiusFor(frame.strokeWidth))}
          fill="none"
          stroke={frame.ring}
          strokeWidth={frame.strokeWidth}
          strokeLinejoin="round"
        />
      ) : null}
      {frame?.ring2 ? (
        <Polygon
          points={hexPoints(box.cx, box.cy, RING2_R)}
          fill="none"
          stroke={frame.ring2}
          strokeWidth={RING2_W}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Corps : photo clippée hex, ou initiale sur carbone */}
      <Polygon points={body} fill={colors.carbone2} />
      {imageUri ? (
        <SvgImage
          x={box.cx - BODY_R}
          y={box.cy - BODY_R}
          width={BODY_R * 2}
          height={BODY_R * 2}
          preserveAspectRatio="xMidYMid slice"
          href={{ uri: imageUri }}
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <SvgText
          x={box.cx}
          y={INITIALS_BASELINE}
          textAnchor="middle"
          fontSize={INITIALS_FONT}
          fontWeight="600"
          fill={colors.blanc}
        >
          {initials}
        </SvgText>
      )}
      <Polygon
        points={body}
        fill="none"
        stroke={bodyStroke}
        strokeWidth={BODY_STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
