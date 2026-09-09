import { CREW_OUTING_CAPACITY_MAX, CREW_OUTING_CAPACITY_MIN, CREW_OUTING_HORIZON_DAYS, CREW_OUTING_PLACE_LABEL_MAX, CREW_OUTING_TITLE_MAX, type Activity } from '@klaim/shared';
import { meetingPointRefusal } from '../crew/crewOuting';

export interface CrewOuting2026 {
  id: string; title: string; startsAt: string; activity: Activity; placeLabel: string;
  capacity: number | null; goingCount: number; joined: boolean; canManage: boolean;
  cancelled: boolean; revision: number; hostName: string | null;
}
export interface CrewOutingDraft2026 { title: string; date: string; time: string; activity: Activity; placeLabel: string; capacity: string }
export const localDate2026 = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function outingDraft2026(item?: CrewOuting2026, now = new Date()): CrewOutingDraft2026 {
  const date = item ? new Date(item.startsAt) : new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 19, 0);
  return { title: item?.title ?? '', date: localDate2026(date), time: `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`, activity: item?.activity ?? 'run', placeLabel: item?.placeLabel ?? '', capacity: item?.capacity?.toString() ?? '' };
}
export function outingForm2026(draft: CrewOutingDraft2026, nowMs: number): { ok: true; values: { p_title: string; p_starts_at: string; p_activity: Activity; p_place_label: string; p_capacity: number|null } } | { ok:false; reason:string } {
  const title = draft.title.trim(), place = draft.placeLabel.trim();
  if (!title || title.length > CREW_OUTING_TITLE_MAX) return { ok:false, reason:'title' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^\d{2}:\d{2}$/.test(draft.time)) return { ok:false, reason:'date' };
  const [y,m,d] = draft.date.split('-').map(Number), [h,min] = draft.time.split(':').map(Number);
  const when = new Date(y!,m!-1,d!,h!,min!);
  if (!Number.isFinite(when.getTime()) || localDate2026(when) !== draft.date || when.getHours() !== h || when.getMinutes() !== min || when.getTime()<=nowMs || when.getTime()>nowMs+CREW_OUTING_HORIZON_DAYS*86400000) return {ok:false, reason:'date'};
  if (!place || place.length>CREW_OUTING_PLACE_LABEL_MAX) return {ok:false,reason:'place'};
  if (meetingPointRefusal(place)) return {ok:false,reason:'place_looks_like_address'};
  if (draft.activity !== 'run' && draft.activity !== 'bike') return {ok:false,reason:'invalid'};
  const raw=draft.capacity.trim(), capacity=raw===''?null:Number(raw);
  if (capacity !== null && (!/^\d+$/.test(raw) || !Number.isSafeInteger(capacity) || capacity<CREW_OUTING_CAPACITY_MIN || capacity>CREW_OUTING_CAPACITY_MAX)) return {ok:false,reason:'capacity'};
  return {ok:true,values:{p_title:title,p_starts_at:when.toISOString(),p_activity:draft.activity,p_place_label:place,p_capacity:capacity}};
}
export function parseCrewOutings2026(data: unknown): { canCreate: boolean; items: CrewOuting2026[] } | null {
  if (!data || typeof data !== 'object') return null;
  const raw=data as Record<string,unknown>;
  if (raw.ok!==true || typeof raw.canCreate!=='boolean' || !Array.isArray(raw.items)) return null;
  const items: CrewOuting2026[]=[];
  for (const v of raw.items) {
    if (!v || typeof v!=='object') return null;
    const row=v as CrewOuting2026;
    if (typeof row.id!=='string' || typeof row.title!=='string' || typeof row.startsAt!=='string' || !Number.isFinite(Date.parse(row.startsAt)) || !['run','bike'].includes(row.activity) || typeof row.placeLabel!=='string' || (row.capacity!==null && (!Number.isInteger(row.capacity) || row.capacity<0)) || !Number.isInteger(row.goingCount) || row.goingCount<0 || !Number.isInteger(row.revision) || typeof row.joined!=='boolean' || typeof row.cancelled!=='boolean' || typeof row.canManage!=='boolean' || (row.hostName!==null && typeof row.hostName!=='string')) return null;
    items.push(row);
  }
  return {canCreate:raw.canCreate,items};
}
