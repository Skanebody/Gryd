/**
 * GRYD — LES SCHÉMAS du guide « Comment ça marche ».
 *
 * Un chapitre sans dessin est une notice. Chaque planche répond à UNE question,
 * en moins de deux secondes, et se lit sans son texte.
 *
 * ─── TROIS RÈGLES TENUES ICI ────────────────────────────────────────────────
 *  · JAMAIS LA COULEUR SEULE (L15). Le terrain déjà possédé n'est pas « une
 *    autre teinte » : il est HACHURÉ. Les journées qui rapportent ne sont pas
 *    « plus vertes » : elles portent une coche. Le raccord refusé n'est pas
 *    « en gris » : il est BARRÉ.
 *  · RIEN N'EST AFFIRMÉ. Aucun de ces dessins n'affiche un état du joueur :
 *    pas de ville, pas de crew, pas de score, pas de progression de saison
 *    remplie à moitié (une jauge à moitié pleine serait une donnée inventée).
 *  · LES DÉCOMPTES VIENNENT DES RÈGLES. Le nombre de journées qui rapportent,
 *    de secteurs, d'équipes, de joueurs par équipe et de paliers est lu dans
 *    `game-rules.ts`. Redessiner la planche n'a jamais changé une règle.
 *
 * Le mouvement réutilise l'horloge de la découverte
 * (`features/onboarding/discoveryMotion2026.ts`) : une seule implémentation
 * dans le dépôt, et elle respecte déjà Reduce Motion, l'arrière-plan et le
 * focus. En mouvement réduit, la planche s'affiche TERMINÉE, jamais vide.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import {
  CHALLENGE_RULES_2026,
  PROGRESSION_RULES_2026,
  mapTokens,
  motion as MOTION,
  refonteColors as c,
} from '@klaim/shared';
import { GRYD_GLYPHS } from '../../ui/gryd/glyphs';
import { easeInOut, rampAt } from '../onboarding/plancheMotion';
import { useDiscoveryElapsed2026, useDiscoveryMotion2026 } from '../onboarding/useDiscoveryMotion2026';
import type { HelpArtKind } from './helpChapters2026';
import {
  HELP_ART_HEIGHT,
  HELP_ART_VIEWBOX,
  HELP_ART_WIDTH,
  HELP_CLOSURE_CENTRE,
  HELP_CLOSURE_RADIUS,
  HELP_COMMUNE_D,
  HELP_GRID_PATH,
  HELP_JUMP_AFTER_D,
  HELP_JUMP_BEFORE_D,
  HELP_JUMP_BRIDGE_D,
  HELP_JUMP_CROSS,
  HELP_JUMP_CROSS_ARM,
  HELP_OPEN_LOOP,
  HELP_OPEN_LOOP_D,
  HELP_OPEN_LOOP_LENGTH,
  HELP_OWNED_D,
  HELP_OWNED_HATCH,
  HELP_SHIELD_CHECK_D,
  HELP_SHIELD_D,
  HELP_TERRITORY_D,
  HELP_TERRITORY_LENGTH,
  HELP_TRACE,
  HELP_TRACE_D,
  HELP_TRACE_LENGTH,
  HELP_WEEK_COLUMNS,
  pointAlong,
} from './helpArt2026';

/** Épaisseurs et rayons du dessin — de la mise en page, jamais des règles. */
const STROKE_TRACE = 3;
const STROKE_SHADOW = 9;
const STROKE_HAIRLINE = 1;
const DOT_START = 7;
const DOT_HEAD = 6;
const DASH_GUIDE = '3 7';

function draw(length: number, progress: number) {
  return { strokeDasharray: `${length} ${length}`, strokeDashoffset: length * (1 - progress) };
}

/** Le fond de rues, identique d'une planche à l'autre : un décor, pas une carte. */
function StreetGrid() {
  return <Path d={HELP_GRID_PATH} stroke={c.darkSurfaceMuted} strokeWidth={STROKE_HAIRLINE} fill="none" />;
}

function TraceArt({ t }: { t: number }) {
  const head = pointAlong(HELP_TRACE, t);
  const start = HELP_TRACE[0] ?? [0, 0];
  return <G>
    <StreetGrid />
    <Path d={HELP_TRACE_D} fill="none" stroke={c.carbon} strokeWidth={STROKE_SHADOW} strokeLinecap="round" strokeLinejoin="round" />
    <Path d={HELP_TRACE_D} fill="none" stroke={c.accent} strokeWidth={STROKE_TRACE} strokeLinecap="round" strokeLinejoin="round" {...draw(HELP_TRACE_LENGTH, t)} />
    <Circle cx={start[0]} cy={start[1]} r={DOT_START} fill={c.carbon} stroke={c.darkInk} strokeWidth={1.5} />
    <Circle cx={head[0]} cy={head[1]} r={DOT_HEAD} fill={c.accent} stroke={c.carbon} strokeWidth={2} />
  </G>;
}

function ClosureArt({ t }: { t: number }) {
  const left = HELP_OPEN_LOOP[HELP_OPEN_LOOP.length - 1] ?? [0, 0];
  const right = HELP_OPEN_LOOP[0] ?? [0, 0];
  return <G>
    <StreetGrid />
    <Path d={HELP_OPEN_LOOP_D} fill="none" stroke={c.darkSurfaceMuted} strokeWidth={STROKE_HAIRLINE} strokeDasharray={DASH_GUIDE} />
    <Path d={HELP_OPEN_LOOP_D} fill="none" stroke={c.accent} strokeWidth={STROKE_TRACE} strokeLinecap="round" strokeLinejoin="round" {...draw(HELP_OPEN_LOOP_LENGTH, t)} />
    <Circle cx={HELP_CLOSURE_CENTRE[0]} cy={HELP_CLOSURE_CENTRE[1]} r={HELP_CLOSURE_RADIUS} fill="none" stroke={c.accent} strokeWidth={1.5} strokeDasharray={DASH_GUIDE} opacity={t} />
    <Circle cx={left[0]} cy={left[1]} r={DOT_HEAD} fill={c.carbon} stroke={c.darkInk} strokeWidth={2} />
    <Circle cx={right[0]} cy={right[1]} r={DOT_HEAD} fill={c.accent} stroke={c.carbon} strokeWidth={2} />
  </G>;
}

function TerritoryArt({ t }: { t: number }) {
  return <G>
    <StreetGrid />
    <Path d={HELP_COMMUNE_D} fill="none" stroke={c.darkMuted} strokeWidth={STROKE_HAIRLINE} strokeDasharray="5 8" />
    <Path d={HELP_TERRITORY_D} fill={mapTokens.mineFill} fillOpacity={t} stroke="none" />
    <Path d={HELP_TERRITORY_D} fill="none" stroke={c.accent} strokeWidth={STROKE_TRACE} strokeLinejoin="round" {...draw(HELP_TERRITORY_LENGTH, t)} />
    <G opacity={t}>
      <Path d={HELP_OWNED_D} fill={c.carbon} fillOpacity={0.55} stroke={c.darkInk} strokeWidth={STROKE_HAIRLINE} strokeDasharray="4 4" />
      {HELP_OWNED_HATCH.map(([a, b], index) => <Line key={index} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c.darkInk} strokeWidth={1.4} opacity={0.7} />)}
    </G>
  </G>;
}

/** Une semaine : les journées qui rapportent portent une COCHE, pas juste une teinte. */
function PointsArt({ t }: { t: number }) {
  const credited = PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek;
  const pad = 18;
  const gap = 10;
  const width = (HELP_ART_WIDTH - pad * 2 - gap * (HELP_WEEK_COLUMNS - 1)) / HELP_WEEK_COLUMNS;
  const top = 40;
  const height = HELP_ART_HEIGHT - top - 26;
  return <G>
    {Array.from({ length: HELP_WEEK_COLUMNS }, (_, index) => {
      const x = pad + index * (width + gap);
      const on = index < credited;
      const reveal = Math.min(1, Math.max(0, t * HELP_WEEK_COLUMNS - index));
      return <G key={index} opacity={0.25 + 0.75 * reveal}>
        <Rect x={x} y={top} width={width} height={height} rx={10} fill={on ? c.accent : 'none'} stroke={on ? c.accent : c.darkSurfaceMuted} strokeWidth={1.5} />
        {on ? <Path d={`M${x + width * 0.28} ${top + height * 0.5}L${x + width * 0.45} ${top + height * 0.66}L${x + width * 0.74} ${top + height * 0.34}`} fill="none" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /> : null /* sur chartreuse : la coche est posee sur la colonne accent */}
      </G>;
    })}
  </G>;
}

/** Deux équipes, des secteurs : l'équipe adverse est CREUSE, jamais « d'une autre couleur ». */
function CrewArt({ t }: { t: number }) {
  const sectors = CHALLENGE_RULES_2026.sectorCount;
  const players = CHALLENGE_RULES_2026.playersPerTeam;
  const pad = 20;
  const gap = 12;
  const sectorWidth = (HELP_ART_WIDTH - pad * 2 - gap * (sectors - 1)) / sectors;
  const dotStep = (HELP_ART_WIDTH - pad * 2) / players;
  return <G>
    {Array.from({ length: players }, (_, index) => {
      const x = pad + dotStep * index + dotStep / 2;
      const reveal = Math.min(1, Math.max(0, t * players - index));
      return <G key={index} opacity={reveal}>
        <Circle cx={x} cy={24} r={8} fill={c.accent} />
        <Circle cx={x} cy={HELP_ART_HEIGHT - 24} r={8} fill="none" stroke={c.darkInk} strokeWidth={2} strokeDasharray="3 3" />
      </G>;
    })}
    {Array.from({ length: sectors }, (_, index) => {
      const x = pad + index * (sectorWidth + gap);
      return <Rect key={index} x={x} y={58} width={sectorWidth} height={64} rx={14} fill={c.darkSurface} stroke={c.darkSurfaceMuted} strokeWidth={1.5} opacity={0.4 + 0.6 * t} />;
    })}
  </G>;
}

/**
 * Les paliers d'une saison, TOUS identiques : aucun n'est peint « atteint ».
 * Une jauge à moitié pleine ici serait une progression inventée.
 */
function SeasonArt({ t }: { t: number }) {
  const tiers = PROGRESSION_RULES_2026.seasonTierCount;
  const pad = 24;
  const y = HELP_ART_HEIGHT / 2;
  const span = HELP_ART_WIDTH - pad * 2;
  const step = tiers > 1 ? span / (tiers - 1) : 0;
  return <G>
    <Line x1={pad} y1={y} x2={pad + span * t} y2={y} stroke={c.accent} strokeWidth={STROKE_TRACE} strokeLinecap="round" />
    {Array.from({ length: tiers }, (_, index) => {
      const x = pad + step * index;
      const first = index === 0;
      return <G key={index} opacity={Math.min(1, Math.max(0, t * tiers - index + 1))}>
        <Line x1={x} y1={y - 18} x2={x} y2={y + 18} stroke={c.darkSurfaceMuted} strokeWidth={1.5} />
        <Circle cx={x} cy={y} r={first ? 8 : 5} fill={first ? c.accent : c.carbon} stroke={first ? c.carbon : c.darkInk} strokeWidth={first ? 2 : 1.5} />
      </G>;
    })}
  </G>;
}

function FairPlayArt({ t }: { t: number }) {
  const arm = HELP_JUMP_CROSS_ARM;
  const [cx, cy] = HELP_JUMP_CROSS;
  return <G>
    <StreetGrid />
    <Path d={HELP_SHIELD_D} fill={c.darkSurface} stroke={c.accent} strokeWidth={2.5} strokeLinejoin="round" />
    <Path d={HELP_SHIELD_CHECK_D} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={t} />
    <Path d={HELP_JUMP_BEFORE_D} fill="none" stroke={c.darkInk} strokeWidth={STROKE_TRACE} strokeLinecap="round" strokeLinejoin="round" />
    <Path d={HELP_JUMP_AFTER_D} fill="none" stroke={c.darkInk} strokeWidth={STROKE_TRACE} strokeLinecap="round" strokeLinejoin="round" />
    <Path d={HELP_JUMP_BRIDGE_D} fill="none" stroke={c.darkMuted} strokeWidth={2} strokeDasharray="5 6" opacity={t} />
    <G opacity={t}>
      <Line x1={cx - arm} y1={cy - arm} x2={cx + arm} y2={cy + arm} stroke={c.darkInk} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={cx + arm} y1={cy - arm} x2={cx - arm} y2={cy + arm} stroke={c.darkInk} strokeWidth={2.5} strokeLinecap="round" />
    </G>
  </G>;
}

/** La planche de la FAQ : la marque « question » du jeu d'icônes, agrandie. */
function QuestionsArt({ t }: { t: number }) {
  const scale = 5;
  const glyph = 24 * scale;
  const offsetX = (HELP_ART_WIDTH - glyph) / 2;
  const offsetY = (HELP_ART_HEIGHT - glyph) / 2;
  return <G>
    {[0, 1, 2].map((index) => <Rect key={index} x={54 + index * 12} y={126 - index * 10} width={212 - index * 24} height={14} rx={7} fill={c.darkSurface} opacity={0.6 * t} />)}
    <G transform={`translate(${offsetX} ${offsetY}) scale(${scale})`} fill="none" stroke={c.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.35 + 0.65 * t}>
      {GRYD_GLYPHS.faq.map((d, index) => <Path key={index} d={d} />)}
    </G>
  </G>;
}

export interface HelpDiagram2026Props {
  kind: Exclude<HelpArtKind, 'loop'>;
  /** Ce que le dessin raconte : lu par VoiceOver, jamais deviné (L15). */
  label: string;
}

export function HelpDiagram2026({ kind, label }: HelpDiagram2026Props) {
  const motion = useDiscoveryMotion2026();
  const still = !motion.ready || motion.reduced;
  const elapsed = useDiscoveryElapsed2026(motion.enabled, kind, MOTION.traceDrawMs, still);
  const t = easeInOut(rampAt(elapsed, { from: 0, to: MOTION.traceDrawMs }));
  return <View accessibilityRole="image" accessibilityLabel={label} style={styles.art}>
    {/* `aria-hidden` SEUL sur le <svg> : react-native-svg étale ses props telles
        quelles sur le DOM (web/utils/prepare.js) et `createDOMProps` de
        react-native-web n'intercepte ni `accessible`, ni
        `accessibilityElementsHidden`. Le libellé est porté par la View. */}
    <Svg aria-hidden width="100%" height={HELP_ART_HEIGHT} viewBox={HELP_ART_VIEWBOX}>
      {kind === 'trace' ? <TraceArt t={t} /> : null}
      {kind === 'closure' ? <ClosureArt t={t} /> : null}
      {kind === 'territory' ? <TerritoryArt t={t} /> : null}
      {kind === 'points' ? <PointsArt t={t} /> : null}
      {kind === 'crew' ? <CrewArt t={t} /> : null}
      {kind === 'season' ? <SeasonArt t={t} /> : null}
      {kind === 'fairplay' ? <FairPlayArt t={t} /> : null}
      {kind === 'questions' ? <QuestionsArt t={t} /> : null}
    </Svg>
  </View>;
}

const styles = StyleSheet.create({
  art: { width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: c.darkSurface, paddingVertical: 4 },
});
