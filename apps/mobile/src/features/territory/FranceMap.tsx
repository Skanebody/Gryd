/**
 * GRYD — mini carte « Mon territoire » à l'échelle de la France (maquette
 * écran 04 : l'Hexagone, littéralement). France low-poly + Corse, villes
 * verrouillées en gris, clusters chartreuse Paris/Lille avec glow.
 * react-native-svg : seule façon de rendre ce vectoriel statique sans
 * embarquer MapLibre ici (justification 1 ligne, CLAUDE.md).
 * Couleurs : uniquement tokens (@klaim/shared) + opacités numériques.
 */
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, mapTokens } from '@klaim/shared';
import { formatInt } from '../../ui/format';

const VIEWBOX_W = 320;
const VIEWBOX_H = 330;

/** Tracé low-poly de l'Hexagone (repris tel quel de la maquette écran 04). */
const FRANCE_PATH =
  'M173 22 L196 34 L212 60 L247 72 L262 96 L256 128 L266 158 L262 192 L268 214 ' +
  'L252 232 L214 226 L196 242 L172 250 L162 276 L138 282 L108 262 L96 232 L88 198 ' +
  'L60 172 L22 128 L58 112 L86 94 L92 66 L118 70 L134 84 L152 70 L150 44 Z';
const CORSICA_PATH = 'M292 232 L300 246 L296 270 L286 274 L284 250 Z';

interface LockedCity {
  x: number;
  y: number;
  label?: string;
  labelX?: number;
  labelY?: number;
}

/** Villes verrouillées (waitlist marketing — la capture n'y est plus bloquée). */
const LOCKED_CITIES: readonly LockedCity[] = [
  { x: 102, y: 220, label: 'BORDEAUX', labelX: 112, labelY: 224 },
  { x: 222, y: 196, label: 'LYON', labelX: 230, labelY: 200 },
  { x: 212, y: 238, label: 'MARSEILLE', labelX: 222, labelY: 242 },
  { x: 66, y: 130 }, // Nantes / Rennes
  { x: 150, y: 248 }, // Toulouse
  { x: 238, y: 66 }, // Strasbourg
];

type Cell = readonly [number, number];

interface CityCluster {
  cx: number;
  cy: number;
  hexR: number;
  glowR: number;
  labelX: number;
  labelY: number;
  cells: readonly Cell[];
}

/** Clusters actifs Saison 0 (Paris + Lille seedées `active`, AMENDEMENT-02 §2). */
const PARIS_CLUSTER: CityCluster = {
  cx: 158,
  cy: 96,
  hexR: 5,
  glowR: 26,
  labelX: 182,
  labelY: 92,
  cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [-1, 1], [0, -1], [1, -1], [-1, -1], [1, 1]],
};
const LILLE_CLUSTER: CityCluster = {
  cx: 172,
  cy: 34,
  hexR: 4,
  glowR: 16,
  labelX: 190,
  labelY: 30,
  cells: [[0, 0], [1, 0], [-1, 0], [0, 1]],
};

/** Sommets d'un hexagone pointy-top (même géométrie que la maquette). */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

interface ClusterHex {
  key: string;
  points: string;
  /** Le premier hex est le cœur du cluster (rendu plus dense). */
  core: boolean;
}

function clusterHexes(cluster: CityCluster): ClusterHex[] {
  const w = Math.sqrt(3) * cluster.hexR;
  const h = 1.5 * cluster.hexR;
  return cluster.cells.map(([col, row], idx) => ({
    key: `${col},${row}`,
    points: hexPoints(
      cluster.cx + col * w + (row % 2 !== 0 ? w / 2 : 0),
      cluster.cy + row * h,
      cluster.hexR,
    ),
    core: idx === 0,
  }));
}

function Cluster({ cluster, glowId, label }: { cluster: CityCluster; glowId: string; label: string }) {
  return (
    <G>
      <Circle cx={cluster.cx} cy={cluster.cy} r={cluster.glowR} fill={`url(#${glowId})`} />
      {clusterHexes(cluster).map((hex) => (
        <Polygon
          key={hex.key}
          points={hex.points}
          fill={hex.core ? colors.chartreuse40 : colors.chartreuse14}
          stroke={colors.chartreuse40}
          strokeWidth={1}
        />
      ))}
      <SvgText
        x={cluster.labelX}
        y={cluster.labelY}
        fontSize={9}
        letterSpacing={1.2}
        fill={colors.chartreuse}
      >
        {label}
      </SvgText>
    </G>
  );
}

export interface FranceMapProps {
  parisHexes: number;
  lilleHexes: number;
}

export function FranceMap({ parisHexes, lilleHexes }: FranceMapProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Carte de France avec mes territoires : clusters actifs à Paris et Lille"
      style={styles.frame}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}>
        <Defs>
          <RadialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.chartreuse} stopOpacity={0.6} />
            <Stop offset="100%" stopColor={colors.chartreuse} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* France low-poly + Corse — blanc très faible, comme les parcs du fond de carte */}
        <Path
          d={FRANCE_PATH}
          fill={mapTokens.parks}
          stroke={colors.grisLigne}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <Path d={CORSICA_PATH} fill={mapTokens.parks} stroke={colors.grisLigne} strokeWidth={1.2} />

        {/* Villes verrouillées (gris, jamais de chartreuse hors de mon territoire) */}
        <G>
          {LOCKED_CITIES.map((city) => (
            <Circle key={`${city.x},${city.y}`} cx={city.x} cy={city.y} r={3} fill={colors.gris} opacity={0.55} />
          ))}
          {LOCKED_CITIES.filter((c) => c.label !== undefined).map((city) => (
            <SvgText
              key={city.label}
              x={city.labelX}
              y={city.labelY}
              fontSize={8}
              letterSpacing={1}
              fill={colors.gris}
            >
              {city.label}
            </SvgText>
          ))}
        </G>

        {/* Mes clusters — emploi §C.3 (1) : moi et mon crew sur la carte */}
        <Cluster cluster={LILLE_CLUSTER} glowId="cityGlow" label={`LILLE · ${formatInt(lilleHexes)}`} />
        <Cluster cluster={PARIS_CLUSTER} glowId="cityGlow" label={`PARIS · ${formatInt(parisHexes)}`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: VIEWBOX_W / VIEWBOX_H },
});
