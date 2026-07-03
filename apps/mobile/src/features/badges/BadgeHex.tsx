/**
 * GRYD — hexagone de badge SVG (AMENDEMENT-04, charte badges GRYD_motion §8.3 :
 * forme hexagonale premium, lisible petit, rareté exprimée par le glow — pas de
 * fantasy). Fond noir, contour + glow teintés `familyColor` (couleur DATA du
 * catalogue — exception polychrome §1, la SEULE de l'app). Pictogramme
 * géométrique filaire par famille (jamais d'emoji). 3 états :
 * débloqué (couleur pleine + glow) · verrouillé (gris, sans glow) ·
 * secret verrouillé (« ? », contour pointillé or discret).
 * react-native-svg : seul moyen de dessiner ce vectoriel (déjà en dépendance).
 */
import Svg, { Circle, Defs, G, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '@klaim/shared';
import type { BadgeFamilyId } from './catalog';

export type BadgeHexSize = 'sm' | 'md' | 'lg';
export type BadgeHexState = 'unlocked' | 'locked' | 'secretLocked';

/** Tailles gelées : sm 40 (aperçu profil) · md 64 (grille) · lg 96 (détail). */
const SIZES: Record<BadgeHexSize, number> = { sm: 40, md: 64, lg: 96 };

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const HEX_RADIUS = 38;

/** Sommets d'un hexagone pointy-top (même géométrie que FranceMap). */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const HEX = hexPoints(CENTER, CENTER, HEX_RADIUS);

/**
 * Pictogrammes filaires par famille, dessinés dans une boîte 24×24 (motifs
 * charte §8.3 : drapeau planté, éclair, hexagone, couronne, étincelle).
 */
const FAMILY_GLYPHS: Record<BadgeFamilyId, string> = {
  fondateur: 'M7 21 V3 M7 4 H17 L14.2 7.5 L17 11 H7', // drapeau planté
  performance: 'M13 3 L8 13 H12 L11 21 L16 11 H12 Z', // éclair
  territoire: 'M12 4 L18.9 8 V16 L12 20 L5.1 16 V8 Z', // hexagone (le jeu lui-même)
  crew: 'M5 17 V9 L9 12 L12 6 L15 12 L19 9 V17 Z', // couronne minimaliste
  special: 'M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z', // étincelle
};

/** Losange — pictogramme des secrets une fois révélés. */
const SECRET_GLYPH = 'M12 4 L19 12 L12 20 L5 12 Z';

/** Échelle du pictogramme 24×24 vers le centre du viewBox 100. */
const GLYPH_SCALE = 1.6;
const GLYPH_OFFSET = CENTER - 12 * GLYPH_SCALE;

export interface BadgeHexProps {
  family: BadgeFamilyId;
  /** Couleur d'accent — DATA du catalogue (badgeColor), exception §1. */
  familyColor: string;
  state: BadgeHexState;
  size?: BadgeHexSize;
  /** Badge secret révélé : pictogramme losange au lieu du glyphe de famille. */
  secret?: boolean;
}

export function BadgeHex({ family, familyColor, state, size = 'md', secret = false }: BadgeHexProps) {
  const px = SIZES[size];
  const glowId = `bhx-glow-${familyColor.replace('#', '')}`;
  const unlocked = state === 'unlocked';

  return (
    <Svg width={px} height={px} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      {unlocked ? (
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={familyColor} stopOpacity={0.4} />
            <Stop offset="70%" stopColor={familyColor} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={familyColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
      ) : null}

      {/* Glow de rareté — uniquement débloqué (§8.3 : la rareté est un glow) */}
      {unlocked ? <Circle cx={CENTER} cy={CENTER} r={CENTER - 1} fill={`url(#${glowId})`} /> : null}

      {/* Corps : fond noir ; teinte très faible quand débloqué */}
      <Polygon points={HEX} fill={colors.noir} />
      {unlocked ? <Polygon points={HEX} fill={familyColor} fillOpacity={0.1} /> : null}

      {/* Contour : plein teinté (débloqué), gris-ligne (verrouillé), pointillé or (secret) */}
      {state === 'secretLocked' ? (
        <Polygon
          points={HEX}
          fill="none"
          stroke={familyColor}
          strokeWidth={1.5}
          strokeOpacity={0.55}
          strokeDasharray="6 5"
          strokeLinejoin="round"
        />
      ) : (
        <Polygon
          points={HEX}
          fill="none"
          stroke={unlocked ? familyColor : colors.grisLigne}
          strokeWidth={unlocked ? 2 : 1.5}
          strokeLinejoin="round"
        />
      )}

      {/* Centre : « ? » (secret verrouillé) ou pictogramme filaire de famille */}
      {state === 'secretLocked' ? (
        <SvgText
          x={CENTER}
          y={CENTER + 11}
          textAnchor="middle"
          fontSize={32}
          fontWeight="500"
          fill={familyColor}
          fillOpacity={0.8}
        >
          ?
        </SvgText>
      ) : (
        <G transform={`translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_SCALE})`}>
          <Path
            d={secret ? SECRET_GLYPH : FAMILY_GLYPHS[family]}
            fill="none"
            stroke={unlocked ? familyColor : colors.gris}
            strokeOpacity={unlocked ? 1 : 0.75}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </G>
      )}
    </Svg>
  );
}
