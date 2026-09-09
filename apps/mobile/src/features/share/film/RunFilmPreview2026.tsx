import { refonteColors as colors } from '@klaim/shared';
import Svg, { G, Path, Polyline, Rect, Text } from 'react-native-svg';
import { buildRunFilmScene2026, filmTraceAtFrame2026, type RunFilmInput2026, type RunFilmScene2026 } from './runFilmModel2026';

/** Static final frame, using the encoder's exact composition and protected pixel paths. */
export function RunFilmPreview2026({ input, width }: { input: Omit<RunFilmInput2026, 'signal'>; width: number }) {
  let scene: RunFilmScene2026;
  try { scene = buildRunFilmScene2026(input); }
  catch {
    return <Svg width={width} height={width} viewBox="0 0 360 360"><Rect width={360} height={360} fill={colors.carbon} /><Text x={24} y={180} fill={colors.darkInk} fontFamily="sans-serif" fontSize={14}>{input.locale === 'fr' ? 'Aperçu du film indisponible.' : 'Film preview unavailable.'}</Text></Svg>;
  }
  const height = width * scene.height / scene.width;
  const logo = scene.logo.contours.map(contour => `M${contour[0]} ${contour[1]} ${contour.slice(2).reduce((s, value, i) => s + (i % 2 === 0 ? `L${value} ` : `${value} `), '')}Z`).join(' ');
  return <Svg width={width} height={height} viewBox={`0 0 ${scene.width} ${scene.height}`}>
    <Rect width={scene.width} height={scene.height} fill={scene.background} />
    <G transform={`translate(${scene.logo.x} ${scene.logo.y}) scale(${scene.logo.height / 100})`}><Path d={logo} fill={scene.logo.color} fillRule="evenodd" /></G>
    {scene.texts.map((text, i) => <Text key={i} x={text.x} y={text.y} fill={text.color} fontSize={text.size} fontFamily="Helvetica Neue, sans-serif" fontWeight={text.weight === 'medium' ? '500' : '400'}>{text.text}</Text>)}
    {filmTraceAtFrame2026(scene, scene.frames - 1).map((segment, i) => <Polyline key={i} points={segment.join(' ')} fill="none" stroke={scene.traceColor} strokeWidth={scene.traceWidth} strokeLinecap="round" strokeLinejoin="round" />)}
  </Svg>;
}
