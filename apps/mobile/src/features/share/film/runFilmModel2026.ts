import { refonteColors } from '@klaim/shared';
import type { LatLngPoint } from '../../map/realAnchors';
import { REAL_M_PER_DEG_LAT } from '../../map/realAnchors';
import { frameFor } from '../mapFrame';
import { protectedShareSegments2026 } from '../shareTrace2026';
import type { PrivacyZone } from '../sharePrivacy';
import { SHARE_EXPORT_FORMATS_2026, type ShareFormat2026, type ShareTheme2026 } from '../shareModel2026';
import { GRYD_BRAND } from '../../../ui/gryd/brandPaths';
import { grydGraphicColors as colors } from '../../../ui/gryd/palette';

export const RUN_FILM_2026 = { durationMs: 8000, fps: 30, frames: 240, revealStartFrame: 15, revealEndFrame: 150, maxPoints: 20000 } as const;
export interface RunFilmFacts2026 { sport: string; distance: string | null; duration: string | null; gain: string | null; rate?: string | null }
export interface RunFilmInput2026 {
  edition?: { name: string; collection: string; premium: boolean };
  facts: RunFilmFacts2026;
  /** Actual recorded segments. The encoder never receives these geographic coordinates. */
  segments: readonly (readonly LatLngPoint[])[];
  privacy: { resolved: boolean; maskEndpoints: boolean; zones: readonly PrivacyZone[] };
  format: ShareFormat2026;
  theme: ShareTheme2026;
  locale: 'fr' | 'en';
  signal?: AbortSignal;
}
export interface FilmText2026 { text: string; x: number; y: number; size: number; color: string; maxWidth: number; weight: 'regular' | 'medium' }
/** A pixel-only drawing plan. It contains no coordinates, location metadata, identifiers or tile URLs. */
export interface RunFilmScene2026 {
  version: 1; width: number; height: number; fps: number; frames: number;
  revealStartFrame: number; revealEndFrame: number;
  background: string; traceColor: string; traceWidth: number;
  logo: { contours: number[][]; x: number; y: number; height: number; color: string };
  texts: FilmText2026[];
  segments: number[][];
}

function logoContours(): number[][] {
  // The supplied vector identity consists exclusively of traced M/L/Z contours.
  return GRYD_BRAND.wordmark.paths.flatMap(path => path.split(/(?=M)/).filter(Boolean).map(contour =>
    [...contour.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]))));
}
function validPoint(point: LatLngPoint) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}
export function buildRunFilmScene2026(input: RunFilmInput2026): RunFilmScene2026 {
  if (!(input.format in SHARE_EXPORT_FORMATS_2026)) throw new Error('invalid_input');
  if (input.segments.reduce((sum, segment) => sum + segment.length, 0) > RUN_FILM_2026.maxPoints) throw new Error('trace_too_large');
  // An invalid fix creates a break, never a line to the next valid fix.
  const validSegments: LatLngPoint[][] = [];
  for (const segment of input.segments) {
    let valid: LatLngPoint[] = [];
    for (const point of segment) {
      if (validPoint(point)) valid.push(point);
      else { if (valid.length > 1) validSegments.push(valid); valid = []; }
    }
    if (valid.length > 1) validSegments.push(valid);
  }
  const protectedSegments = protectedShareSegments2026(validSegments, input.privacy);
  const { width, height } = SHARE_EXPORT_FORMATS_2026[input.format];
  const light = input.theme === 'light', ink = light ? colors.black : colors.white;
  const muted = light ? refonteColors.muted : refonteColors.darkMuted;
  const top = input.format === 'story' ? 250 : 84;
  const bottom = height - (input.format === 'story' ? 250 : 84);
  const texts: FilmText2026[] = [];
  const add = (text: string | null | undefined, x: number, y: number, size: number, maxWidth: number, color: string = ink, weight: 'regular' | 'medium' = 'regular') => {
    if (!text) return;
    if (text.length > 100 || /[\u0000-\u001f]/.test(text)) throw new Error('invalid_input');
    texts.push({ text, x, y, size, maxWidth, color, weight });
  };
  add(input.edition ? `${input.edition.collection} / ${input.edition.name}` : input.facts.sport, 84, top + 93, 24, 912, muted);
  const metricY = top + 208;
  add(input.facts.distance ?? (input.locale === 'fr' ? 'Une sortie.' : 'An activity.'), 84, metricY, input.facts.distance ? 112 : 82, 912, ink, 'medium');
  const hasRoute = protectedSegments.some(segment => segment.length > 1);
  const graph = { x: 60, y: metricY + 62, width: 960, height: Math.max(120, bottom - metricY - 210) };
  const rings = protectedSegments.map(segment => segment.map(point => [point.lng, point.lat] as const));
  const all = rings.flat();
  const latitude = all.length ? all.reduce((sum, point) => sum + point[1], 0) / all.length : 0;
  const frame = frameFor(rings, graph.width / graph.height, REAL_M_PER_DEG_LAT * Math.max(.01, Math.cos(latitude * Math.PI / 180)), REAL_M_PER_DEG_LAT);
  const segments = rings.map(ring => ring.flatMap(([lng, lat]) => {
    const point = frame.project(lng, lat);
    return [graph.x + point.x / frame.vbW * graph.width, graph.y + point.y / frame.vbH * graph.height];
  }));
  if (!hasRoute) add(input.locale === 'fr' ? 'Un moment dehors.' : 'Time outside.', 84, graph.y + graph.height / 2, 38, 912, muted);
  add(input.locale === 'fr' ? 'DURÉE' : 'TIME', 84, bottom - 60, 22, 430, muted);
  add(input.facts.duration ?? '—', 84, bottom, 45, 430, ink, 'medium');
  if (input.facts.gain) {
    add(input.locale === 'fr' ? 'TERRAIN GAGNÉ' : 'TERRITORY GAINED', 576, bottom - 60, 22, 420, muted);
    add(`+${input.facts.gain}`, 576, bottom, 45, 420, ink, 'medium');
  } else if (input.facts.rate) {
    add(input.locale === 'fr' ? 'RYTHME' : 'PACE / SPEED', 576, bottom - 60, 22, 420, muted);
    add(input.facts.rate, 576, bottom, 45, 420, ink, 'medium');
  }
  return {
    version: 1, width, height, fps: RUN_FILM_2026.fps, frames: RUN_FILM_2026.frames,
    revealStartFrame: RUN_FILM_2026.revealStartFrame, revealEndFrame: RUN_FILM_2026.revealEndFrame,
    background: light ? colors.white : colors.black, traceColor: light ? colors.black : input.edition ? colors.white : colors.accent, traceWidth: input.edition?.premium ? 11 : 7,
    logo: { contours: logoContours(), x: 84, y: top, height: 30, color: ink }, texts, segments,
  };
}

/** Distance along independent pixel segments, used by both native encoder implementations. */
export function filmTraceAtFrame2026(scene: RunFilmScene2026, frame: number): number[][] {
  const lengths = scene.segments.map(segment => {
    let length = 0;
    for (let i = 2; i < segment.length; i += 2) length += Math.hypot(segment[i]! - segment[i - 2]!, segment[i + 1]! - segment[i - 1]!);
    return length;
  });
  const ratio = Math.max(0, Math.min(1, (frame - scene.revealStartFrame) / (scene.revealEndFrame - scene.revealStartFrame)));
  let remaining = lengths.reduce((sum, n) => sum + n, 0) * ratio;
  const paths: number[][] = [];
  scene.segments.forEach(segment => {
    if (remaining <= 0 || segment.length < 4) return;
    const path = segment.slice(0, 2);
    for (let i = 2; i < segment.length && remaining > 0; i += 2) {
      const length = Math.hypot(segment[i]! - segment[i - 2]!, segment[i + 1]! - segment[i - 1]!);
      const portion = length > 0 ? Math.min(1, remaining / length) : 1;
      path.push(segment[i - 2]! + (segment[i]! - segment[i - 2]!) * portion, segment[i - 1]! + (segment[i + 1]! - segment[i - 1]!) * portion);
      remaining -= length;
    }
    if (path.length >= 4) paths.push(path);
  });
  return paths;
}
