/**
 * GRYD — hexagone de badge SVG V2 (AMENDEMENT-06 §1.6, charte GRYD_motion §8.3).
 * DEUX axes visuels indépendants :
 *   • la FAMILLE (familyColor, couleur DATA du catalogue — exception polychrome
 *     §1, la SEULE zone polychrome de l'app) teinte le PICTOGRAMME filaire ;
 *   • le TIER (road…legend) décide l'ANNEAU / le GLOW / le HALO, via la recette
 *     BADGE_TIER_STYLE (transcrite de maquette-badges-gryd.html) : road contour
 *     graphite simple → legend or + halo.
 * 3 états : débloqué (couleur pleine + tier) · verrouillé (gris, sans tier) ·
 * secret verrouillé (« ? », contour pointillé or discret).
 * react-native-svg : seul moyen de dessiner ce vectoriel (déjà en dépendance).
 */
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '@klaim/shared';
import { BADGE_TIER_STYLE, type BadgeFamilyId, type BadgeTier } from './catalog';

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
const HEX_INNER = hexPoints(CENTER, CENTER, HEX_RADIUS - 5);

/**
 * Pictogrammes filaires par famille, dessinés dans une boîte 24×24 (motifs
 * charte §8.3 : drapeau planté, éclair, hexagone, couronne, étincelle).
 */
const FLAG = 'M7 21 V3 M7 4 H17 L14.2 7.5 L17 11 H7'; // drapeau planté
const BOLT = 'M13 3 L8 13 H12 L11 21 L16 11 H12 Z'; // éclair
const HEXA = 'M12 4 L18.9 8 V16 L12 20 L5.1 16 V8 Z'; // hexagone (le jeu lui-même)
const CROWN = 'M5 17 V9 L9 12 L12 6 L15 12 L19 9 V17 Z'; // couronne minimaliste
const SPARK = 'M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z'; // étincelle

const FAMILY_GLYPHS: Record<BadgeFamilyId, string> = {
  onboarding: FLAG,
  distance: BOLT,
  territoire: HEXA,
  attaque: SPARK,
  defense: 'M12 3 L19 6 V12 C19 17 12 21 12 21 C12 21 5 17 5 12 V6 Z', // bouclier
  exploration: 'M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z', // boussole/étoile
  routes: 'M4 20 C10 14 14 10 20 4 M4 20 L4 15 M4 20 L9 20', // route/flèche
  crew: CROWN,
  performance: BOLT,
  saison: CROWN,
  verified: 'M5 12 L10 17 L19 6', // coche vérifiée
  secret: 'M12 4 L19 12 L12 20 L5 12 Z', // losange (secret révélé)
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
  /** Tier du badge — décide anneau/glow/halo (§1.6). Défaut 'road' (compat). */
  tier?: BadgeTier;
  size?: BadgeHexSize;
  /** Badge secret révélé : pictogramme losange au lieu du glyphe de famille. */
  secret?: boolean;
}

export function BadgeHex({
  family,
  familyColor,
  state,
  tier = 'road',
  size = 'md',
  secret = false,
}: BadgeHexProps) {
  const px = SIZES[size];
  const unlocked = state === 'unlocked';
  const ts = BADGE_TIER_STYLE[tier];
  // ids uniques (glow diffus famille + glow de tier) — évite les collisions.
  const idKey = `${familyColor}-${tier}`.replace(/[^a-z0-9]/gi, '');
  const familyGlowId = `bhx-fg-${idKey}`;
  const tierGlowId = `bhx-tg-${idKey}`;

  // Anneau : teinté tier si débloqué, gris-ligne sinon. Secret = pointillé or.
  const ringColor = unlocked ? ts.ring : colors.grisLigne;
  const ringWidth = unlocked ? ts.strokeWidth : 1.5;
  const showTierGlow = unlocked && ts.glow !== null;
  const showHalo = unlocked && ts.haloOpacity > 0 && ts.glow !== null;
  const showRing2 = unlocked && ts.ring2 !== null;

  return (
    <Svg width={px} height={px} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      <Defs>
        {unlocked ? (
          <RadialGradient id={familyGlowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={familyColor} stopOpacity={0.34} />
            <Stop offset="70%" stopColor={familyColor} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={familyColor} stopOpacity={0} />
          </RadialGradient>
        ) : null}
        {showTierGlow ? (
          <RadialGradient id={tierGlowId} cx="50%" cy="50%" r="50%">
            <Stop offset="35%" stopColor={ts.glow!} stopOpacity={0} />
            <Stop offset="82%" stopColor={ts.glow!} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={ts.glow!} stopOpacity={0} />
          </RadialGradient>
        ) : null}
      </Defs>

      {/* Halo (legend uniquement) — ellipse diffuse derrière l'hexagone */}
      {showHalo ? (
        <Ellipse cx={CENTER} cy={CENTER} rx={CENTER} ry={CENTER} fill={ts.glow!} opacity={ts.haloOpacity} />
      ) : null}

      {/* Glow de tier (elite/legend) : couronne diffuse au ras de l'anneau */}
      {showTierGlow ? <Circle cx={CENTER} cy={CENTER} r={CENTER - 1} fill={`url(#${tierGlowId})`} /> : null}

      {/* Glow de famille (teinte) — uniquement débloqué (§8.3) */}
      {unlocked ? <Circle cx={CENTER} cy={CENTER} r={CENTER - 4} fill={`url(#${familyGlowId})`} /> : null}

      {/* Corps : fond noir ; teinte de famille très faible quand débloqué */}
      <Polygon points={HEX} fill={colors.noir} />
      {unlocked ? <Polygon points={HEX} fill={familyColor} fillOpacity={0.1} /> : null}

      {/* Contour : plein teinté-tier (débloqué), gris-ligne (verrouillé), pointillé or (secret) */}
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
          stroke={ringColor}
          strokeWidth={ringWidth}
          strokeLinejoin="round"
        />
      )}

      {/* Anneau intérieur du tier (race/carbon/elite/legend) */}
      {showRing2 ? (
        <Polygon points={HEX_INNER} fill="none" stroke={ts.ring2!} strokeWidth={1.1} strokeLinejoin="round" />
      ) : null}

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
