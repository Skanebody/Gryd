import { closedPathD, closedPathLength, easeInOut, type Vertex } from './plancheMotion';

/** Illustration coordinates and timings; no GPS, activity, XP or claim data. */
export const DISCOVERY_LOOP_2026: readonly Vertex[] = [[68,154],[66,82],[110,48],[182,52],[246,102],[228,159],[153,179]];
export const DISCOVERY_LOOP_PATH_2026 = closedPathD(DISCOVERY_LOOP_2026);
export const DISCOVERY_LOOP_LENGTH_2026 = closedPathLength(DISCOVERY_LOOP_2026);
export const DISCOVERY_TRACE_MS_2026 = 1900;
export const DISCOVERY_CLOSE_MS_2026 = 650;
export const DISCOVERY_FILL_MS_2026 = 420;
export const DISCOVERY_OPEN_PROGRESS_2026 = .89;
const clamp = (value:number) => Math.max(0,Math.min(1,value));
export function discoveryLoopFrame2026(elapsed:number, phase:'trace'|'close', from=DISCOVERY_OPEN_PROGRESS_2026, reduced=false) {
  if (phase==='trace') return {progress:DISCOVERY_OPEN_PROGRESS_2026*(reduced?1:easeInOut(clamp(elapsed/DISCOVERY_TRACE_MS_2026))),fill:0,closed:false};
  const progress=reduced?1:clamp(from)+(1-clamp(from))*easeInOut(clamp(elapsed/DISCOVERY_CLOSE_MS_2026));
  const fill=reduced?1:clamp((elapsed-DISCOVERY_CLOSE_MS_2026)/DISCOVERY_FILL_MS_2026);
  return {progress,fill,closed:progress>=1};
}
export function discoveryLoopPoint2026(progress:number): Vertex {
  let remaining=clamp(progress)*DISCOVERY_LOOP_LENGTH_2026;
  for(let i=0;i<DISCOVERY_LOOP_2026.length;i++){
    const start=DISCOVERY_LOOP_2026[i]!,end=DISCOVERY_LOOP_2026[(i+1)%DISCOVERY_LOOP_2026.length]!;
    const length=Math.hypot(end[0]-start[0],end[1]-start[1]);
    if(remaining<=length)return[start[0]+(end[0]-start[0])*remaining/length,start[1]+(end[1]-start[1])*remaining/length];
    remaining-=length;
  }
  return DISCOVERY_LOOP_2026[0]!;
}
export function discoveryMotionAllowed2026(state:{resolved:boolean;reduced:boolean;active:boolean;visible:boolean;focused:boolean}) {
  return state.resolved&&!state.reduced&&state.active&&state.visible&&state.focused;
}
/** Pause freezes elapsed time: hidden/background time never advances an example. */
export function createDiscoveryClock2026(schedule:(callback:(now:number)=>void)=>number,cancel:(id:number)=>void,onFrame:(elapsed:number)=>void) {
  let frame:number|null=null,running=false,elapsed=0,base=0,start:number|null=null,limit=Infinity,generation=0;
  const pause=()=>{running=false;generation++;if(frame!==null)cancel(frame);frame=null;start=null;base=elapsed;};
  const resume=(stopAt=Infinity)=>{
    if(running||elapsed>=stopAt)return;
    running=true;limit=stopAt;const ticket=++generation;start=null;base=elapsed;
    const tick=(now:number)=>{
      if(!running||ticket!==generation)return;
      start??=now;elapsed=Math.min(limit,base+Math.max(0,now-start));onFrame(elapsed);
      if(elapsed>=limit){running=false;frame=null;return;}
      frame=schedule(tick);
    };
    frame=schedule(tick);
  };
  return {resume,pause,reset:()=>{pause();elapsed=0;base=0;onFrame(0);},finish:(at:number)=>{pause();elapsed=at;base=at;onFrame(at);},elapsed:()=>elapsed};
}
