/**
 * GRYD — TRACE LIVE (§10) : la vraie polyligne mesurée de la course EN COURS,
 * dessinée pendant qu'on court. Pas de fond de carte (A-47 : « aucune carte vaut
 * mieux qu'une carte qui montre ailleurs ») — juste le tracé, cadré tout seul,
 * façon Strava. Rendu SVG (react-native-svg) donc visible en preview web ET natif.
 *
 * Réutilise le projecteur unique `fitTracesToBox` (features/map) et le style §B
 * `traceStyle` (casing sombre + core chartreuse, bouts arrondis) — plus aucun
 * blob décoratif. Un point chartreuse marque la POSITION COURANTE (dernier fix).
 *
 * HONNÊTE : ne rend RIEN sous 2 points — il n'y a pas encore de tracé, et un
 * segment fabriqué serait un mensonge. C'est l'appelant qui décide quand l'afficher.
 * PUR : aucune dépendance i18n (le libellé accessible arrive en prop, résolu par
 * l'écran) — testable et sans état.
 */
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors } from '@klaim/shared';
import { fitTracesToBox } from '../../map/projectTrace';
import { traceStyle, withAlpha } from '../../map/mapStyle';

/** ViewBox de la vignette (ratio large-court, discret sous les KPI Nike). */
const VB_W = 260;
const VB_H = 92;

export function LiveTraceThumb({
  points,
  accessibilityLabel,
  width = VB_W,
}: {
  points: readonly { lat: number; lng: number }[];
  accessibilityLabel: string;
  width?: number;
}) {
  // Rien à tracer : pas de tracé fabriqué (l'écran montre déjà l'état GPS).
  if (points.length < 2) return null;
  const proj = fitTracesToBox([points], VB_W, VB_H, 12);
  const poly = proj.points(points);
  const last = points[points.length - 1];
  const head = last ? proj.project(last) : null;

  return (
    <Svg
      width={width}
      height={width * (VB_H / VB_W)}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={accessibilityLabel}
    >
      {/* §B : casing sombre puis core chartreuse, joints/bouts arrondis. */}
      <Polyline
        points={poly}
        stroke={traceStyle.casing}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Polyline
        points={poly}
        stroke={traceStyle.core}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Position courante : halo + point plein chartreuse (le « je suis ici »). */}
      {head ? (
        <>
          <Circle cx={head.x} cy={head.y} r={8} fill={withAlpha(colors.chartreuse, 0.18)} />
          <Circle cx={head.x} cy={head.y} r={4} fill={colors.chartreuse} />
        </>
      ) : null}
    </Svg>
  );
}
