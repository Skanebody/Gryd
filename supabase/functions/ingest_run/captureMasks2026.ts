import { SHARE_TRIM_M } from '../_shared/game-rules.ts';
import type { RunPoint } from '../_shared/types.ts';
export interface PublicationMask2026 { lat: number; lng: number; radiusM: number }
/** §5.6: personal sensitive places protect whole public faces; media also trim endpoints. */
export function publicationMasks2026(personal: readonly PublicationMask2026[], points: readonly RunPoint[], anchored: readonly RunPoint[]) {
  if (personal.some(m => !Number.isFinite(m.lat) || !Number.isFinite(m.lng) || Math.abs(m.lat) > 90 || Math.abs(m.lng) > 180 || !Number.isFinite(m.radiusM) || m.radiusM <= 0)) throw new Error('privacy_masks_unavailable');
  const capture = personal.map(mask => ({ ...mask }));
  const media = [...capture];
  for (const point of [points[0], anchored[0], points.at(-1)]) if (point) media.push({ lat: point.lat, lng: point.lng, radiusM: SHARE_TRIM_M });
  return { capture, media };
}
