/**
 * GRYD — mini carte « Mon territoire » : la VRAIE France (décision fondateur
 * 03/07/2026). Contours réels Etalab (FRANCE_OUTLINE, continent + Corse) +
 * quadrillage H3 res 4 réel (FRANCE_HEX_CELLS, 337 cellules) de @klaim/shared.
 * 3 états de cellule : à moi (Paris/Lille, chartreuse), adverse (Lyon, blanc
 * faible), neutre (contour blanc 5 % seulement — pas de fill, sinon bouillie).
 * react-native-svg : seule façon de rendre ce vectoriel statique sans
 * embarquer MapLibre ici (justification 1 ligne, CLAUDE.md). Universel — pas
 * de variante .web. Couleurs : uniquement tokens + opacités numériques.
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
import {
  FRANCE_CITIES,
  FRANCE_HEX_CELLS,
  FRANCE_HEX_R,
  FRANCE_OUTLINE,
  FRANCE_VIEWBOX,
  colors,
  mapTokens,
} from '@klaim/shared';
import { formatInt } from '../../ui/format';

/** Contours réels → un seul Path (sous-tracés continent, Corse, îles). */
const OUTLINE_PATH = FRANCE_OUTLINE.map(
  (poly) => `M${poly.map(([x, y]) => `${x} ${y}`).join('L')}Z`,
).join('');

/** Sommets d'un hexagone pointy-top (même géométrie que BadgeHex). */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

interface CityPoint {
  x: number;
  y: number;
}

/** Les villes projetées viennent des données générées — garde-fou typé strict. */
function cityOf(name: string): CityPoint {
  const city = FRANCE_CITIES[name];
  if (city === undefined) throw new Error(`FranceMap : ville inconnue « ${name} »`);
  return city;
}

const PARIS = cityOf('paris');
const LILLE = cityOf('lille');
const LYON = cityOf('lyon');

type HexCell = (typeof FRANCE_HEX_CELLS)[number];

/** Les `count` cellules H3 les plus proches d'une ville (hors déjà prises). */
function nearestCells(city: CityPoint, count: number, taken: ReadonlySet<string>): HexCell[] {
  return FRANCE_HEX_CELLS.filter((cell) => !taken.has(cell.h))
    .map((cell) => ({ cell, d2: (cell.x - city.x) ** 2 + (cell.y - city.y) ** 2 }))
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, count)
    .map((entry) => entry.cell);
}

/** Saison 0 : Paris + Lille seedées `active` (AMENDEMENT-02 §2) — 9 + 4 hexes à moi. */
const PARIS_CELLS = nearestCells(PARIS, 9, new Set());
const LILLE_CELLS = nearestCells(LILLE, 4, new Set(PARIS_CELLS.map((c) => c.h)));
const MINE_IDS = new Set([...PARIS_CELLS, ...LILLE_CELLS].map((c) => c.h));
/** Cellules adverses vers Lyon (crews rivaux — blanc faible, jamais de teinte). */
const FOE_CELLS = nearestCells(LYON, 5, MINE_IDS);
const FOE_IDS = new Set(FOE_CELLS.map((c) => c.h));
/** Le cœur du cluster Paris (cellule la plus proche) est rendu plus dense. */
const PARIS_CORE_ID = PARIS_CELLS[0]?.h;

/** Le reste du quadrillage : contour blanc 5 % seulement — un seul Path. */
const NEUTRAL_PATH = FRANCE_HEX_CELLS.filter((c) => !MINE_IDS.has(c.h) && !FOE_IDS.has(c.h))
  .map((c) => {
    const pts = hexPoints(c.x, c.y, FRANCE_HEX_R).split(' ');
    return `M${pts.join('L')}Z`;
  })
  .join('');

interface LockedCity {
  key: string;
  label?: string;
}

/** Villes verrouillées (waitlist marketing — la capture n'y est plus bloquée). */
const LOCKED_CITIES: readonly LockedCity[] = [
  { key: 'bordeaux', label: 'BORDEAUX' },
  { key: 'lyon', label: 'LYON' },
  { key: 'marseille', label: 'MARSEILLE' },
  { key: 'nantes' },
  { key: 'toulouse' },
  { key: 'strasbourg' },
];

export interface FranceMapProps {
  parisHexes: number;
  lilleHexes: number;
}

export function FranceMap({ parisHexes, lilleHexes }: FranceMapProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Carte de France avec mes territoires : clusters actifs à Paris et Lille, crews adverses vers Lyon"
      style={styles.frame}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${FRANCE_VIEWBOX.w} ${FRANCE_VIEWBOX.h}`}>
        <Defs>
          <RadialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.chartreuse} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={colors.chartreuse} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Contours réels — blanc 3,5 % / trait blanc 16 % (tokens + opacités) */}
        <Path
          d={OUTLINE_PATH}
          fill={colors.blanc}
          fillOpacity={0.035}
          stroke={colors.blanc}
          strokeOpacity={0.16}
          strokeWidth={1}
          strokeLinejoin="round"
        />

        {/* Quadrillage H3 neutre — contour seul, pas de fill (lisibilité) */}
        <Path d={NEUTRAL_PATH} fill="none" stroke={mapTokens.neutralStroke} strokeWidth={1} />

        {/* Glows radiaux conservés — mes deux zones de guerre actives */}
        <Circle cx={PARIS.x} cy={PARIS.y} r={82} fill="url(#cityGlow)" />
        <Circle cx={LILLE.x} cy={LILLE.y} r={52} fill="url(#cityGlow)" />

        {/* Cellules adverses (§D : blanc faible, différenciées par motif plus tard) */}
        <G>
          {FOE_CELLS.map((cell) => (
            <Polygon
              key={cell.h}
              points={hexPoints(cell.x, cell.y, FRANCE_HEX_R)}
              fill={mapTokens.foeFill}
              stroke={mapTokens.foeStroke}
              strokeWidth={1}
            />
          ))}
        </G>

        {/* Mes cellules — emploi §C.3 (1) : moi et mon crew sur la carte */}
        <G>
          {[...PARIS_CELLS, ...LILLE_CELLS].map((cell) => (
            <Polygon
              key={cell.h}
              points={hexPoints(cell.x, cell.y, FRANCE_HEX_R)}
              fill={cell.h === PARIS_CORE_ID ? colors.chartreuse : mapTokens.mineFill}
              fillOpacity={cell.h === PARIS_CORE_ID ? 0.45 : 1}
              stroke={mapTokens.mineStroke}
              strokeWidth={1}
            />
          ))}
        </G>

        {/* Villes verrouillées (gris, jamais de chartreuse hors de mon territoire) */}
        <G>
          {LOCKED_CITIES.map(({ key }) => {
            const city = cityOf(key);
            return <Circle key={key} cx={city.x} cy={city.y} r={9} fill={colors.gris} opacity={0.55} />;
          })}
          {LOCKED_CITIES.filter((c) => c.label !== undefined).map(({ key, label }) => {
            const city = cityOf(key);
            return (
              <SvgText
                key={`${key}-label`}
                x={city.x + 20}
                y={city.y + 9}
                fontSize={25}
                letterSpacing={3}
                fill={colors.gris}
              >
                {label}
              </SvgText>
            );
          })}
        </G>

        {/* Étiquettes de mes clusters — compteurs branchés sur les props */}
        <SvgText
          x={LILLE.x + 48}
          y={LILLE.y + 10}
          fontSize={28}
          letterSpacing={3.5}
          fill={colors.chartreuse}
        >
          {`LILLE · ${formatInt(lilleHexes)}`}
        </SvgText>
        <SvgText
          x={PARIS.x + 60}
          y={PARIS.y - 44}
          fontSize={28}
          letterSpacing={3.5}
          fill={colors.chartreuse}
        >
          {`PARIS · ${formatInt(parisHexes)}`}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: FRANCE_VIEWBOX.w / FRANCE_VIEWBOX.h },
});
