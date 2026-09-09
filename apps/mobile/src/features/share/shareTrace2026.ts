import type { LatLngPoint } from '../map/realAnchors';
import { applySharePrivacy, SHARE_TRIM_M, type PrivacyZone } from './sharePrivacy';

/** One privacy policy for every export family. Interruptions remain separate.
 * Only the activity's actual start/finish create endpoint masks: a pause does
 * not trim another 250m from both sides of every remaining fragment.
 */
export function protectedShareSegments2026(
  segments: readonly (readonly LatLngPoint[])[],
  options: { resolved: boolean; maskEndpoints: boolean; zones: readonly PrivacyZone[] },
): readonly (readonly LatLngPoint[])[] {
  if (!options.resolved) return [];
  const nonempty = segments.filter(segment => segment.length > 0);
  const first = nonempty[0]?.[0];
  const finalSegment = nonempty[nonempty.length - 1];
  const last = finalSegment?.[finalSegment.length - 1];
  const zones = [...options.zones];
  if (options.maskEndpoints && first && last) {
    zones.push({ center: first, radiusM: SHARE_TRIM_M }, { center: last, radiusM: SHARE_TRIM_M });
  }
  return nonempty.map(segment => applySharePrivacy(segment, 0, zones)).filter(segment => segment.length >= 2);
}
