/** Permanent visual objects. A selection is an intention, never an ownership receipt. */
export const COMMERCIAL_OBJECTS_2026 = {
  contour: { name: 'Contour', designs: ['contour_line', 'contour_margin'] },
  relief: { name: 'Relief', designs: ['relief_strata', 'relief_column', 'relief_window', 'relief_survey'] },
  clubhouse: { name: 'Clubhouse', designs: ['clubhouse_type', 'clubhouse_grid', 'clubhouse_ticket', 'clubhouse_photo', 'clubhouse_report', 'clubhouse_diary'] },
} as const;
export type CommercialCollectionId2026 = keyof typeof COMMERCIAL_OBJECTS_2026;
export type StudioObjectRequest2026 =
  | { kind: 'season'; collectionId: string; rewardId: string; variant: 'standard' | 'premium' }
  /** Cahier §7.2 : objet permanent attaché au niveau de carrière, sans calendrier. */
  | { kind: 'level'; rewardId: string }
  | { kind: 'commercial'; collectionId: CommercialCollectionId2026; designId: string };
export interface StudioOwnedReward2026 { collectionId: string; rewardId: string; variant: 'standard' | 'premium'; label: string; tier: number }
/** `edition` est le libellé d'édition DÉJÀ localisé par l'écran : ce module reste pur. */
export interface StudioOwnedLevelReward2026 { rewardId: string; label: string; level: number; edition: string }
export interface CommercialCollection2026 { id: CommercialCollectionId2026; productIds: string[]; configured: boolean; owned: boolean; acquiredAt: string | null; equipped: boolean }
export type ObjectLayout2026 = 'poster' | 'badge' | 'pattern' | 'frame' | 'sticker' | 'title' | 'photo' | 'emblem' | 'motion' | 'recap' | 'final' | 'memory';
export const SEASON_OBJECT_LAYOUTS_2026: Record<string, ObjectLayout2026> = {
  season_poster: 'poster', participation_badge: 'badge', trace_pattern: 'pattern', profile_frame: 'frame', sticker: 'sticker', title: 'title',
  photo_composition: 'photo', personal_emblem: 'emblem', short_animation: 'motion', recap: 'recap', final_poster: 'final', season_memory: 'memory',
};
/** §7.2/§7.5 — les huit objets de niveau. Les deux CADRES du cahier (Ligne, L3 ;
 * Ligne de crête, L20) partagent la géométrie de cadre : ce sont deux cadres,
 * pas deux recolorations d'un même objet de saison. */
export const LEVEL_OBJECT_LAYOUTS_2026: Record<string, ObjectLayout2026> = {
  first_trace: 'poster', line_frame: 'frame', chalk: 'pattern', atlas: 'recap',
  contour_animation: 'motion', ridge_merit: 'frame', cartographer: 'title', horizon: 'memory',
};
export interface StudioObject2026 { key: string; request: StudioObjectRequest2026; name: string; edition: string; layout: ObjectLayout2026; premium: boolean; design: number }
export function studioRewardLabel2026(id:string,label:string,locale:string='fr') { return id==='recap'?(locale==='en'?'Activity recap':'Récap de sortie'):label; }
export function seasonObjectPreview2026(reward:{id:string;label:string;tier:number},edition:string,variant:'standard'|'premium'='standard'):StudioObject2026|null {
  const layout=SEASON_OBJECT_LAYOUTS_2026[reward.id];if(!layout)return null;
  const request:StudioObjectRequest2026={kind:'season',collectionId:'preview',rewardId:reward.id,variant};
  return {key:studioObjectKey2026(request),request,name:studioRewardLabel2026(reward.id,reward.label),edition,layout,premium:variant==='premium',design:reward.tier};
}
const commercialLayouts: Record<CommercialCollectionId2026, readonly ObjectLayout2026[]> = { contour: ['pattern','poster'], relief: ['pattern','title','frame','recap'], clubhouse: ['title','memory','badge','photo','recap','final'] };
/** Describes a template for a clearly labelled preview, never grants permission to export it. */
export function commercialObjectPreview2026(id:CommercialCollectionId2026,index:number):StudioObject2026|null {
  const catalog=COMMERCIAL_OBJECTS_2026[id],designId=catalog?.designs[index]; if(!designId) return null;
  const request:StudioObjectRequest2026={kind:'commercial',collectionId:id,designId};
  return {key:studioObjectKey2026(request),request,name:`${catalog.name} ${String(index+1).padStart(2,'0')}`,edition:catalog.name,layout:commercialLayouts[id][index]!,premium:false,design:index+(id==='relief'?20:id==='clubhouse'?30:10)};
}
/** Aperçu de catalogue d'un objet de niveau : décrit un modèle, ne possède rien. */
export function levelObjectPreview2026(reward:{id:string;label:string;level:number},edition:string):StudioObject2026|null {
  const layout=Object.hasOwn(LEVEL_OBJECT_LAYOUTS_2026,reward.id)?LEVEL_OBJECT_LAYOUTS_2026[reward.id]:null; if(!layout) return null;
  const request:StudioObjectRequest2026={kind:'level',rewardId:reward.id};
  return {key:studioObjectKey2026(request),request,name:reward.label,edition,layout,premium:false,design:reward.level};
}
export function studioObjectKey2026(request: StudioObjectRequest2026) { return request.kind === 'season' ? `season:${request.collectionId}:${request.rewardId}:${request.variant}` : request.kind === 'level' ? `level:${request.rewardId}` : `commercial:${request.collectionId}:${request.designId}`; }
export function resolveStudioObject2026(request: StudioObjectRequest2026 | null, rewards: readonly StudioOwnedReward2026[], collections: readonly CommercialCollection2026[], seasonNames: readonly { id: string; title: string }[] = [], levelRewards: readonly StudioOwnedLevelReward2026[] = []): StudioObject2026 | null {
  if (!request) return null;
  if (request.kind === 'level') {
    // La possession vient du SERVEUR (0144). Un identifiant du catalogue ne
    // suffit pas : sans ligne de possession, aucun objet n'est rendu.
    const owned = levelRewards.find(r => r.rewardId === request.rewardId);
    const layout = Object.hasOwn(LEVEL_OBJECT_LAYOUTS_2026,request.rewardId)?LEVEL_OBJECT_LAYOUTS_2026[request.rewardId]:null;
    if (!owned || !layout) return null;
    return { key: studioObjectKey2026(request), request, name: owned.label, edition: owned.edition, layout, premium: false, design: owned.level };
  }
  if (request.kind === 'season') {
    const owned = rewards.find(r => r.collectionId === request.collectionId && r.rewardId === request.rewardId && r.variant === request.variant);
    const layout = Object.hasOwn(SEASON_OBJECT_LAYOUTS_2026,request.rewardId)?SEASON_OBJECT_LAYOUTS_2026[request.rewardId]:null;
    if (!owned || !layout) return null;
    return { key: studioObjectKey2026(request), request, name: studioRewardLabel2026(owned.rewardId,owned.label), edition: seasonNames.find(c => c.id === request.collectionId)?.title ?? request.collectionId, layout, premium: owned.variant === 'premium', design: owned.tier };
  }
  const catalog = Object.hasOwn(COMMERCIAL_OBJECTS_2026,request.collectionId)?COMMERCIAL_OBJECTS_2026[request.collectionId]:null;
  if (!catalog || !collections.some(c => c.id === request.collectionId && c.owned)) return null;
  const index = (catalog.designs as readonly string[]).indexOf(request.designId);
  if (index < 0) return null;
  return commercialObjectPreview2026(request.collectionId,index);
}
export function readCommercialCollections2026(value: unknown): CommercialCollection2026[] | null {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { collections?: unknown }).collections)) return null;
  const rows = (value as { collections: unknown[] }).collections;
  const valid = rows.filter((v): v is CommercialCollection2026 => !!v && typeof v === 'object' && 'id' in v && typeof v.id === 'string' && Object.hasOwn(COMMERCIAL_OBJECTS_2026,v.id) && 'productIds' in v && Array.isArray(v.productIds) && v.productIds.every(p => typeof p === 'string' && p.length > 0) && 'configured' in v && typeof v.configured === 'boolean' && 'owned' in v && typeof v.owned === 'boolean' && 'equipped' in v && typeof v.equipped === 'boolean' && 'acquiredAt' in v && (v.acquiredAt === null || typeof v.acquiredAt === 'string' && Number.isFinite(Date.parse(v.acquiredAt))));
  return valid.length === rows.length && new Set(valid.map(v=>v.id)).size === valid.length ? valid : null;
}
