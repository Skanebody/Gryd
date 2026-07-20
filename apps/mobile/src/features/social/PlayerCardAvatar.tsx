/**
 * GRYD — avatar hexagonal de la Player Card qui REFLÈTE l'équipement
 * (AMENDEMENT-16 §16 : équiper un cosmétique = effet tangible). Comme
 * PlayerAvatarFrame (ui/game), mais piloté par le PROFIL ÉDITABLE (photo OU
 * couleur de fond + initiales choisies) ET par le FRAME cosmétique ÉQUIPÉ
 * (anneau extérieur dérivé de la rareté du frame, recette BADGE_TIER_STYLE —
 * jamais une couleur décorative). Sans frame équipé → anneau du tier joueur.
 *
 * GÉOMÉTRIE : plus une copie locale de la recette hexagonale. Tout vient de
 * `ui/game/hexAvatar` — c'est là qu'est documenté ce qui était désaligné
 * (boîte carrée pour une encre anisotrope, empreinte variable selon le tier,
 * contour plus épais pour « moi »). Ce composant ne décide QUE des couleurs et
 * du contenu du corps.
 *
 * PHOTO ou INITIALES — les DEUX sont des chemins de première classe : une photo
 * si le joueur veut un visage, l'avatar généré (initiales + couleur de la
 * charte) s'il veut rester derrière son pseudo. Aucun des deux n'est un pis-aller.
 */
import { useId } from 'react';
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import {
  BADGE_TIER_STYLE,
  colors,
  gameColors,
  type BadgeTier,
} from '@klaim/shared';
import {
  BODY_R,
  BODY_STROKE,
  INITIALS_BASELINE,
  INITIALS_FONT,
  RING2_R,
  RING2_W,
  hexAvatarBox,
  hexPoints,
  ringRadiusFor,
} from '../../ui/game/hexAvatar';
import { itemByKey, isFrameItem } from '../arsenal';

/** Choisit un texte lisible (blanc/noir) sur un fond donné — contraste charte. */
function textOn(fill: string): string {
  // Fonds clairs (ivoire/chartreuse) → texte noir ; sombres → texte ivoire.
  return fill === colors.blanc || fill === colors.chartreuse ? colors.noir : colors.blanc;
}

export interface PlayerCardAvatarProps {
  /** Initiales déjà résolues (1-2 lettres) — affichées si aucune photo. */
  initials: string;
  /** Couleur de fond de l'hexagone (token charte) — visible si aucune photo. */
  fillColor: string;
  /** Tier joueur (anneau par défaut si aucun frame équipé). */
  tier: BadgeTier;
  /** Clé de l'item FRAME équipé (portée profile) — override l'anneau si présent. */
  equippedFrameKey?: string;
  /** Hauteur en px (défaut 72, la Player Card). La largeur en découle. */
  size?: number;
  /** true = c'est MOI (contour chartreuse — COULEUR seule, jamais l'épaisseur). */
  isMe?: boolean;
  /**
   * Photo de profil (URI locale ou distante). Absente = avatar généré. Le choix
   * « pas de photo » est délibéré et pleinement valable, pas un état dégradé.
   */
  imageUri?: string;
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
  imageUri,
}: PlayerCardAvatarProps) {
  const ringTier = ringTierFor(equippedFrameKey, tier);
  const frame = BADGE_TIER_STYLE[ringTier];
  const bodyStroke = isMe ? gameColors.crew : colors.grisLigne;
  const box = hexAvatarBox(size);
  const body = hexPoints(box.cx, box.cy, BODY_R);
  // Identifiant de clip UNIQUE par instance : les anciens ids étaient dérivés de
  // la taille, donc DUPLIQUÉS dès que deux avatars de même taille coexistaient.
  const clipId = `pca-${useId()}`;

  return (
    <Svg width={box.width} height={box.height} viewBox={box.viewBox}>
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={body} />
        </ClipPath>
      </Defs>

      {/* Anneau extérieur — posé par son BORD EXTÉRIEUR : empreinte identique
          pour les 6 tiers (cf. hexAvatar, défaut n°2). */}
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

      {/* Corps : la photo si le joueur en a choisi une, sinon l'avatar généré. */}
      <Polygon points={body} fill={fillColor} />
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
          fill={textOn(fillColor)}
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
