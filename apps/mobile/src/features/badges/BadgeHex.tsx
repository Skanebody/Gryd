/**
 * GRYD — emblème de badge SVG V3 : silhouette BOUCLIER-HEXAGONE tactique,
 * transcription EXACTE de maquette-badges-gryd.html (AMENDEMENT-06 §1.6,
 * demande fondateur 03/07/2026 : « tous les badges comme la planche »).
 * Géométrie (viewBox 120×136, outline/inner/halo/décors) et icônes centrales :
 * @klaim/shared/badge-icons (BADGE_SHIELD, badgeIconFor) — jamais dupliquées.
 * DEUX axes visuels indépendants :
 *   • la FAMILLE (familyColor, couleur DATA du catalogue — exception polychrome
 *     §1, la SEULE zone polychrome de l'app) teinte le PICTOGRAMME filaire ;
 *   • le TIER (road…legend) décide l'ANNEAU / le GLOW / le HALO / les décors
 *     (ticks tempo, vitesse race, tissage carbon, rayons elite, arcs+halo
 *     legend) via BADGE_TIER_STYLE + BADGE_TIER_DECOR (recettes de la planche).
 * 3 états : débloqué (icône famille + tier complet) · verrouillé (gris, sans
 * tier) · secret verrouillé (« ? », contour pointillé or discret) — inchangés.
 * react-native-svg : seul moyen de dessiner ce vectoriel (déjà en dépendance).
 */
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { BADGE_SHIELD, BADGE_TIER_DECOR, badgeIconFor, colors } from '@klaim/shared';
import { BADGE_TIER_STYLE, type BadgeFamilyId, type BadgeTier } from './catalog';

export type BadgeHexSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BadgeHexState = 'unlocked' | 'locked' | 'secretLocked';

/**
 * Tailles gelées (LARGEUR px — la hauteur suit le ratio 120:136 du bouclier) :
 * xs 28 (inline/chips) · sm 40 (aperçu profil) · md 64 (grille) · lg 96
 * (détail/cartes) · xl 128 (reveal plein écran). Usages existants inchangés.
 */
const SIZES: Record<BadgeHexSize, number> = { xs: 28, sm: 40, md: 64, lg: 96, xl: 128 };

const VBW = BADGE_SHIELD.viewBoxWidth; // 120
const VBH = BADGE_SHIELD.viewBoxHeight; // 136
const CX = VBW / 2;

/** Hachures « carbone tissé » (pattern weave planche) — diagonales 45°. */
const WEAVE_LINES: readonly string[] = Array.from({ length: 36 }, (_, i) => {
  const x = -VBH + i * 8;
  return `M${x} -4 l${VBH + 16} ${VBH + 16}`;
});

export interface BadgeHexProps {
  family: BadgeFamilyId;
  /** Couleur d'accent — DATA du catalogue (badgeColor), exception §1. */
  familyColor: string;
  state: BadgeHexState;
  /** Tier du badge — décide anneau/glow/halo/décors (§1.6). Défaut 'road'. */
  tier?: BadgeTier;
  size?: BadgeHexSize;
  /** Badge secret (révélé → icône résolue en famille 'secret' si pas de slug). */
  secret?: boolean;
  /**
   * Key catalogue (ex. `hex_hunter_3`) — résout l'icône EXACTE de la planche
   * (slug → famille progressive → famille). Absent = icône de famille.
   */
  slug?: string;
}

export function BadgeHex({
  family,
  familyColor,
  state,
  tier = 'road',
  size = 'md',
  secret = false,
  slug,
}: BadgeHexProps) {
  const width = SIZES[size];
  const height = Math.round((width * VBH) / VBW);
  const unlocked = state === 'unlocked';
  const ts = BADGE_TIER_STYLE[tier];
  const decor = BADGE_TIER_DECOR[tier];
  // ids uniques par recette (plate + clip weave) — évite les collisions DOM web.
  const idKey = `${familyColor}-${tier}-${state}`.replace(/[^a-z0-9]/gi, '');
  const plateId = `bhx-plate-${idKey}`;
  const clipId = `bhx-clip-${idKey}`;

  // Anneau : recette tier si débloqué, gris-ligne sinon. Secret = pointillé or.
  const ringColor = unlocked ? ts.ring : colors.grisLigne;
  const ringWidth = unlocked ? ts.strokeWidth : 1.5;
  const showGlow = unlocked && ts.glow !== null;
  const showHalo = unlocked && ts.haloOpacity > 0 && ts.glow !== null;
  const showRing2 = unlocked && ts.ring2 !== null;
  // Teinte des décors : anneau du tier (ticks/vitesse), anneau intérieur (rayons/arcs).
  const decorColor = ts.ring2 ?? ts.ring;

  // Icône : slug exact → famille progressive → famille (badge-icons).
  const iconPaths = badgeIconFor(slug, secret ? 'secret' : family);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`}>
      <Defs>
        {/* Plateau : dégradé sombre charte (planche g-dark), neutre. */}
        <LinearGradient id={plateId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.carbone} />
          <Stop offset="1" stopColor={colors.noir} />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Path d={BADGE_SHIELD.outline} />
        </ClipPath>
      </Defs>

      {/* Halo (legend uniquement) — ellipse diffuse derrière le bouclier */}
      {showHalo ? (
        <Ellipse
          cx={BADGE_SHIELD.halo.cx}
          cy={BADGE_SHIELD.halo.cy}
          rx={BADGE_SHIELD.halo.rx}
          ry={BADGE_SHIELD.halo.ry}
          fill={ts.glow!}
          opacity={ts.haloOpacity}
        />
      ) : null}

      {/* Glow du tier (race/elite/legend) : contour diffus au ras de l'anneau */}
      {showGlow ? (
        <Path
          d={BADGE_SHIELD.outline}
          fill="none"
          stroke={ts.glow!}
          strokeWidth={ringWidth + 5.5}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Plateau bouclier-hexagone + teinte de famille très faible (débloqué) */}
      <Path d={BADGE_SHIELD.outline} fill={`url(#${plateId})`} />
      {unlocked ? <Path d={BADGE_SHIELD.outline} fill={familyColor} fillOpacity={0.08} /> : null}

      {/* Texture tissée du tier carbon (pattern weave planche), très subtile */}
      {unlocked && decor.weave ? (
        <G clipPath={`url(#${clipId})`}>
          {WEAVE_LINES.map((d) => (
            <Path key={d} d={d} stroke={colors.blanc} strokeOpacity={0.05} strokeWidth={2.6} />
          ))}
        </G>
      ) : null}

      {/* Contour : recette tier (débloqué), gris-ligne (verrouillé), pointillé or (secret) */}
      {state === 'secretLocked' ? (
        <Path
          d={BADGE_SHIELD.outline}
          fill="none"
          stroke={familyColor}
          strokeWidth={1.5}
          strokeOpacity={0.55}
          strokeDasharray="7 6"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d={BADGE_SHIELD.outline}
          fill="none"
          stroke={ringColor}
          strokeWidth={ringWidth}
          strokeLinejoin="round"
        />
      )}

      {/* Anneau intérieur du tier (race/carbon/elite/legend) */}
      {showRing2 ? (
        <Path d={BADGE_SHIELD.inner} fill="none" stroke={ts.ring2!} strokeWidth={1.1} strokeLinejoin="round" />
      ) : null}

      {/* Décors par tier (planche) : ticks tempo · vitesse race · rayons elite · arcs legend */}
      {unlocked && decor.ticks ? (
        <G stroke={ts.ring} strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round">
          {BADGE_SHIELD.ticks.map((d) => (
            <Path key={d} d={d} fill="none" />
          ))}
        </G>
      ) : null}
      {unlocked && decor.speed ? (
        <G stroke={ts.ring} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round">
          {BADGE_SHIELD.speed.map((d) => (
            <Path key={d} d={d} fill="none" />
          ))}
        </G>
      ) : null}
      {unlocked && decor.rays ? (
        <G stroke={decorColor} strokeWidth={1.6} strokeLinecap="round">
          {BADGE_SHIELD.rays.map((d) => (
            <Path key={d} d={d} fill="none" />
          ))}
        </G>
      ) : null}
      {unlocked && decor.arcs ? (
        <G stroke={decorColor} strokeWidth={1.6} strokeLinecap="round">
          {BADGE_SHIELD.arcs.map((d) => (
            <Path key={d} d={d} fill="none" />
          ))}
        </G>
      ) : null}

      {/* Centre : « ? » (secret verrouillé) ou icône planche teintée famille */}
      {state === 'secretLocked' ? (
        <SvgText
          x={CX}
          y={BADGE_SHIELD.halo.cy + 13}
          textAnchor="middle"
          fontSize={38}
          fontWeight="500"
          fill={familyColor}
          fillOpacity={0.8}
        >
          ?
        </SvgText>
      ) : (
        <G
          transform={`translate(${BADGE_SHIELD.icon.x},${BADGE_SHIELD.icon.y}) scale(${BADGE_SHIELD.icon.scale})`}
        >
          {iconPaths.map((d) => (
            <Path
              key={d}
              d={d}
              fill="none"
              stroke={unlocked ? familyColor : colors.gris}
              strokeOpacity={unlocked ? 1 : 0.75}
              strokeWidth={BADGE_SHIELD.iconStrokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </G>
      )}
    </Svg>
  );
}
