import { refonteColors as c } from '@klaim/shared';
import type { FeatureCollection } from 'geojson';
export interface TerritoryPaintLayer2026 { id:string; data:FeatureCollection; fillColor?:string; fillOpacity?:number; fillOpacityStops?:readonly (readonly [number,number])[]; lineColor?:string; lineWidth?:number; lineOpacity?:number; lineDash?:readonly number[]; lineWidthStops?:readonly (readonly [number,number])[]; lineOffset?:number; lineBlur?:number }
import type { OwnedFeature, TerritoryRole2026 } from './territoryModel2026';

// Presentation tokens only. Palette has no sport, score, or capture authority.
export const OWNER_TONES_2026 = [c.darkSurfaceMuted, c.muted, c.rival, c.darkMuted, c.border, c.surfaceMuted] as const;
const NEIGHBOUR_WINDOW_2026 = 64;
export const ownerToneSeed2026 = (key: string) => {
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % OWNER_TONES_2026.length;
};
function box(feature: OwnedFeature) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const bounds = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity };
  for (const polygon of polygons) for (const ring of polygon) for (const [lng, lat] of ring) {
    bounds.west = Math.min(bounds.west, lng!); bounds.east = Math.max(bounds.east, lng!);
    bounds.south = Math.min(bounds.south, lat!); bounds.north = Math.max(bounds.north, lat!);
  }
  return bounds;
}
/** Deterministic for the same visible features, independent of response order.
 * Bounding-box neighbours conservatively include adjacent faces and avoid a
 * quadratic all-owner scan via a bounded x sweep. White seams remain in dense cases
 * where all six tones are already used. No claims or identities are inferred.
 */
export function ownerToneSlots2026(features: readonly OwnedFeature[]): Map<string, number> {
  const ordered = features.filter(f => f.properties.role !== 'mine').map(feature => ({ feature, bounds: box(feature) }))
    .sort((a,b) => a.bounds.west - b.bounds.west || a.feature.properties.id.localeCompare(b.feature.properties.id));
  const graph = new Map<string, Set<string>>(); let active: typeof ordered = [];
  for (const current of ordered) {
    const key = current.feature.properties.owner.key;
    if (!graph.has(key)) graph.set(key, new Set());
    active = active.filter(previous => previous.bounds.east >= current.bounds.west);
    for (const previous of active) {
      const other = previous.feature.properties.owner.key;
      if (other === key || previous.bounds.north < current.bounds.south || previous.bounds.south > current.bounds.north) continue;
      graph.get(key)!.add(other); graph.get(other)!.add(key);
    }
    active.push(current);
    if (active.length > NEIGHBOUR_WINDOW_2026) active.shift();
  }
  const slots = new Map<string, number>();
  for (const key of [...graph.keys()].sort()) {
    const occupied = [...graph.get(key)!].map(other => slots.get(other));
    const seed = ownerToneSeed2026(key);
    let slot = seed;
    for (let offset = 0; offset < OWNER_TONES_2026.length; offset++) {
      const candidate = (seed + offset) % OWNER_TONES_2026.length;
      if (!occupied.includes(candidate)) { slot = candidate; break; }
    }
    slots.set(key, slot);
  }
  return slots;
}
/**
 * Le TRAIT de MON terrain, tel que le cosmétique équipé le décrit
 * (`cosmeticTracePaint2026`). OPTIONNEL, et son absence rend EXACTEMENT la
 * peinture d'avant le lot personnalisation : aucun appelant n'a à changer, et
 * un serveur sans 0180 ne change rien à l'écran.
 * Le trait est le SEUL réglé ici. Le remplissage, lui, reste la chartreuse de
 * possession : c'est une information de jeu (« ce terrain est à moi »), pas une
 * décoration, et un cosmétique n'a pas le droit d'y toucher.
 */
export interface TerritoryTracePaint2026 { lineColor: string; lineWidth: number; lineBlur?: number }

export function territoryPaintLayers2026(input: {
  features: readonly OwnedFeature[]; filters: Record<TerritoryRole2026, boolean>; attenuate: boolean;
  dark: boolean; selectedId: string | null; trace?: TerritoryTracePaint2026 | null;
}): TerritoryPaintLayer2026[] {
  const { features, filters, attenuate, dark, selectedId, trace } = input;
  // Colour assignment uses all available faces so a role filter never recolours.
  const tones = ownerToneSlots2026(features);
  const visible = features.filter(f => filters[f.properties.role]);
  const data = (subset: readonly OwnedFeature[]) => ({ type: 'FeatureCollection' as const, features: subset.map(f => ({ ...f, properties: { ...f.properties, zoneId: f.properties.id } })) });
  const others = visible.filter(f => f.properties.role !== 'mine');
  const layers: TerritoryPaintLayer2026[] = OWNER_TONES_2026.map((tone, index) => ({
    id: `terr-owner-${index}`, data: data(others.filter(f => tones.get(f.properties.owner.key) === index)),
    fillColor: tone, fillOpacity: attenuate ? .26 : .44,
    fillOpacityStops: [[4,.34], [11,attenuate ? .32 : .5], [16,attenuate ? .18 : .32], [19,.1]],
  }));
  layers.push({ id: 'terr-owner-seam', data: data(others), lineColor: c.surface, lineWidth: 4, lineOpacity: .94 });
  for (const member of [false,true]) layers.push({
    id: `terr-owner-${member ? 'member' : 'solo'}`, data: data(others.filter(f => !!f.properties.owner.crew === member)),
    lineColor: c.ink, lineWidth: member ? 2 : 1.25, ...(member ? {lineDash:[3,2]} : {}),
    lineWidthStops: [[4,.7], [12,member ? 2 : 1.25], [17,member ? 2.5 : 1.5]],
  });
  // Current crew is a relationship highlight; it is never a collective title.
  layers.push({ id: 'terr-crew-affiliation', data: data(visible.filter(f => f.properties.role === 'crew')), lineColor: dark ? c.darkInk : c.ink, lineWidth: 1, lineOffset: 3 });
  // Sur fond CLAIR, la chartreuse est illisible (contraste 1,2:1 — charte) : le
  // cosmétique ne s'applique donc qu'au fond sombre, et le fond clair garde son
  // encre. Un objet équipé qui rendrait le terrain invisible ne serait pas un
  // cosmétique, ce serait une panne.
  layers.push({ id: 'terr-personal-fill', data: data(visible.filter(f => f.properties.role === 'mine')), fillColor:c.accent, fillOpacity:.24, fillOpacityStops:[[4,.34],[13,.24],[17,.12]],
    lineColor: dark ? trace?.lineColor ?? c.accent : c.ink, lineWidth: trace?.lineWidth ?? 3,
    ...(dark && trace?.lineBlur ? { lineBlur: trace.lineBlur } : {}) });
  const selected = visible.find(f => f.properties.id === selectedId);
  if (selected) {
    layers.push({ id:'terr-selected-seam',data:data([selected]),lineColor:c.surface,lineWidth:7 });
    layers.push({ id:'terr-selected',data:data([selected]),lineColor:c.ink,lineWidth:3 });
  }
  return layers;
}
