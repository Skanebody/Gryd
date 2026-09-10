/**
 * GRYD — LA CARTE STATIQUE D'UNE SORTIE PASSÉE (cahier G12/G13 : « la trace
 * devient l'image principale »).
 *
 * ═══ POURQUOI DU SVG ET PAS `RealMap` ═══════════════════════════════════════
 * `RunResult` monte une vraie carte MapLibre pour la sortie qu'on vient de
 * terminer, et c'est justifié : c'est LE moment de l'app où l'on regarde son
 * terrain. Le détail d'une sortie ARCHIVÉE est un autre usage — on l'ouvre
 * depuis une liste, parfois plusieurs de suite, souvent en déplacement. Deux
 * raisons, déjà écrites dans `SignatureMapCard`, s'appliquent mot pour mot :
 *   1. l'onglet Carte reste monté à côté ; ouvrir un second contexte WebGL pour
 *      une vignette dépense de la batterie pour rien ;
 *   2. le fond de carte n'ajoute aucune information sur CETTE sortie : la forme
 *      du parcours, elle, est la mesure.
 * Le tracé SVG est donc la forme RÉELLE, sans rues autour. La vraie carte reste
 * à un tap, dans l'onglet Carte.
 *
 * ═══ CE QUI N'EST JAMAIS DESSINÉ ════════════════════════════════════════════
 * · Aucun trait entre deux segments séparés par une rupture : le raccourci que
 *   personne n'a couru (`traceSegments` les garde distincts).
 * · Aucune boucle « refermée » automatiquement : si le départ et l'arrivée ne
 *   se rejoignent pas, le trait ne se rejoint pas non plus.
 * · Aucune trace sans points : l'appelant affiche l'état honnête à la place.
 *
 * Vie privée : ce rendu sert au joueur qui regarde SA sortie. Toute image
 * SORTANTE passe d'abord par `features/share/sharePrivacy`.
 */
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors, refonteColors } from '@klaim/shared';
import { REAL_M_PER_DEG_LAT } from '../map/realAnchors';
import { frameFor } from '../share/mapFrame';
import type { ChartTone } from '../../ui/charts/palette';
import type { JournalPoint } from './metrics';
import { traceSegments } from './traceRead';

export interface TraceMap2026Props {
  points: readonly JournalPoint[];
  width: number;
  height: number;
  tone: ChartTone;
  /** Point de départ marqué. Sur une trace masquée, il ne l'est PAS : ses
   *  extrémités sont coupées, marquer un « départ » désignerait un point qui
   *  n'en est pas un. */
  showStart?: boolean;
  testID?: string;
}

/** Épaisseurs du ruban — même grammaire que `PosterTrace` (gaine + cœur). */
const CASING_W = 5;
const CORE_W = 2.6;

export function TraceMap2026({
  points,
  width,
  height,
  tone,
  showStart = false,
  testID,
}: TraceMap2026Props) {
  const segments = traceSegments(points);
  if (segments.length === 0 || width < 2 || height < 2) return null;

  const rings = segments.map((segment) => segment.map((p) => [p.lng, p.lat] as const));
  const all = rings.flat();
  const latitude = all.length > 0 ? all.reduce((sum, p) => sum + p[1], 0) / all.length : 0;
  // Longitude corrigée par cos(φ) : sans elle, une boucle est étirée d'est en
  // ouest et ne ressemble plus au parcours couru.
  const frame = frameFor(
    rings,
    width / height,
    REAL_M_PER_DEG_LAT * Math.max(0.01, Math.cos((latitude * Math.PI) / 180)),
    REAL_M_PER_DEG_LAT,
  );
  const drawn = rings.map((ring) =>
    ring
      .map(([lng, lat]) => {
        const point = frame.project(lng, lat);
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      })
      .join(' '),
  );
  const first = rings[0]?.[0];
  const start = first ? frame.project(first[0], first[1]) : null;
  const casing = tone === 'light' ? refonteColors.surface : colors.noir;
  const core = tone === 'light' ? refonteColors.ink : colors.chartreuse;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${frame.vbW} ${frame.vbH}`} testID={testID}>
      {drawn.map((ring, index) => (
        <Polyline
          key={`casing-${index}`}
          points={ring}
          fill="none"
          stroke={casing}
          strokeWidth={CASING_W}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {drawn.map((ring, index) => (
        <Polyline
          key={`core-${index}`}
          points={ring}
          fill="none"
          stroke={core}
          strokeWidth={CORE_W}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {showStart && start ? (
        <Circle cx={start.x} cy={start.y} r={3.4} fill={casing} stroke={core} strokeWidth={2} />
      ) : null}
    </Svg>
  );
}
