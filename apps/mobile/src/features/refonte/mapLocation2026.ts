/** The map reads foreground location only. No tracking or background permission. */
export type MapPermission2026 = { status:'granted'|'denied'|'undetermined'; canAskAgain:boolean; coarseOnly:boolean };
type Fix = { lat:number; lng:number; accuracy:number; ts:number };
export interface MapLocationProvider2026 {
  checkForegroundPermission():Promise<MapPermission2026>;
  requestForegroundPermission():Promise<MapPermission2026>;
  getCurrentPositionOnce():Promise<Fix|null>;
}
export type MapLocationResult2026 = { kind:'position'; point:Fix; zoom:number } | { kind:'denied'; canAskAgain:boolean } | { kind:'unavailable'|'unrequested' };
export async function readMapLocation2026(provider:MapLocationProvider2026, ask:boolean, options:{now?:()=>number;timeoutMs?:number}={}):Promise<MapLocationResult2026> {
  try {
    let permission = await provider.checkForegroundPermission();
    if (permission.status !== 'granted' && ask && permission.canAskAgain) permission = await provider.requestForegroundPermission();
    if (permission.status === 'denied') return {kind:'denied',canAskAgain:permission.canAskAgain};
    if (permission.status !== 'granted') return {kind:ask ? 'unavailable' : 'unrequested'};
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fix = await Promise.race([
      provider.getCurrentPositionOnce(),
      new Promise<null>(resolve => { timer=setTimeout(()=>resolve(null),options.timeoutMs ?? 15_000); }),
    ]).finally(()=>{ if(timer!==undefined) clearTimeout(timer); });
    if (!fix || !Number.isFinite(fix.lat) || Math.abs(fix.lat)>90 || !Number.isFinite(fix.lng) || Math.abs(fix.lng)>180 ||
      !Number.isFinite(fix.accuracy) || fix.accuracy<0 || !Number.isFinite(fix.ts) || Math.abs((options.now ?? Date.now)()-fix.ts)>120_000) return {kind:'unavailable'};
    return {kind:'position',point:fix,zoom:fix.accuracy>1000 ? 11 : permission.coarseOnly || fix.accuracy>100 ? 13 : 15};
  } catch { return {kind:'unavailable'}; }
}
/** An old request cannot undo a new recenter, search, gesture, or unmount. */
export function createMapLocationGate2026() {
  let revision=0;
  return { begin:()=>++revision, cancel:()=>{revision++;}, isCurrent:(ticket:number)=>ticket===revision };
}
