import { assertEquals, assertAlmostEquals } from 'jsr:@std/assert';
import { createDiscoveryClock2026, discoveryLoopFrame2026, discoveryLoopPoint2026, discoveryMotionAllowed2026, DISCOVERY_CLOSE_MS_2026, DISCOVERY_FILL_MS_2026, DISCOVERY_LOOP_2026, DISCOVERY_OPEN_PROGRESS_2026, DISCOVERY_TRACE_MS_2026 } from './discoveryMotion2026.ts';
Deno.test('interactive demo never closes or fills without the user closure phase',()=>{
  for(const elapsed of [0,500,DISCOVERY_TRACE_MS_2026,100000]){
    const frame=discoveryLoopFrame2026(elapsed,'trace');assertEquals(frame.closed,false);assertEquals(frame.fill,0);assertEquals(frame.progress<=DISCOVERY_OPEN_PROGRESS_2026,true);
  }
});
Deno.test('a closure gesture draws the missing route before filling the example',()=>{
  const before=discoveryLoopFrame2026(DISCOVERY_CLOSE_MS_2026-1,'close');assertEquals(before.closed,false);assertEquals(before.fill,0);
  const joined=discoveryLoopFrame2026(DISCOVERY_CLOSE_MS_2026,'close');assertEquals(joined.progress,1);assertEquals(joined.closed,true);assertEquals(joined.fill,0);
  assertEquals(discoveryLoopFrame2026(DISCOVERY_CLOSE_MS_2026+DISCOVERY_FILL_MS_2026,'close').fill,1);
});
Deno.test('an early tap completes from the actual drawn point without jumping backwards',()=>{
  const from=discoveryLoopFrame2026(600,'trace').progress;let previous=from;
  for(let elapsed=0;elapsed<=DISCOVERY_CLOSE_MS_2026;elapsed+=50){const frame=discoveryLoopFrame2026(elapsed,'close',from);assertEquals(frame.progress>=previous,true);previous=frame.progress;}
  assertEquals(discoveryLoopFrame2026(0,'close',from).progress,from);
});
Deno.test('reduce motion keeps the same interaction: open example first, filled only after the tap',()=>{
  assertEquals(discoveryLoopFrame2026(0,'trace',0,true),{progress:DISCOVERY_OPEN_PROGRESS_2026,fill:0,closed:false});
  assertEquals(discoveryLoopFrame2026(0,'close',.4,true),{progress:1,fill:1,closed:true});
});
Deno.test('mobile illustration point follows the exact path and rejoins the same start',()=>{
  assertEquals(discoveryLoopPoint2026(0),DISCOVERY_LOOP_2026[0]);const end=discoveryLoopPoint2026(1);
  assertAlmostEquals(end[0],DISCOVERY_LOOP_2026[0]![0],.000001);assertAlmostEquals(end[1],DISCOVERY_LOOP_2026[0]![1],.000001);
  const halfway=discoveryLoopPoint2026(.5);assertEquals(halfway[0]>=66&&halfway[0]<=246,true);assertEquals(halfway[1]>=48&&halfway[1]<=179,true);
});
Deno.test('motion stays off until preference is known and stops for every inactive surface state',()=>{
  const state={resolved:true,reduced:false,active:true,visible:true,focused:true};assertEquals(discoveryMotionAllowed2026(state),true);
  for(const patch of [{resolved:false},{reduced:true},{active:false},{visible:false},{focused:false}])assertEquals(discoveryMotionAllowed2026({...state,...patch}),false);
});
function harness(){let id=0;const queued=new Map<number,(now:number)=>void>();const frames:number[]=[];const cancelled:number[]=[];const clock=createDiscoveryClock2026(callback=>{queued.set(++id,callback);return id;},key=>{cancelled.push(key);queued.delete(key);},elapsed=>frames.push(elapsed));
  return{clock,frames,cancelled,queued,tick:(now:number)=>{const next=queued.entries().next().value!;queued.delete(next[0]);next[1](now);}};}
Deno.test('background pause freezes progress and resume excludes all hidden elapsed time',()=>{
  const h=harness();h.clock.resume();h.tick(10);h.tick(110);assertEquals(h.clock.elapsed(),100);
  h.clock.pause();assertEquals(h.queued.size,0);h.clock.resume();h.tick(50000);assertEquals(h.clock.elapsed(),100);h.tick(50016);assertEquals(h.clock.elapsed(),116);
});
Deno.test('an already queued obsolete frame cannot advance a resumed or replayed scene',()=>{
  const h=harness();h.clock.resume();const late=h.queued.values().next().value!;h.clock.pause();h.clock.reset();h.clock.resume();late(90000);
  assertEquals(h.frames,[0]);assertEquals(h.clock.elapsed(),0);h.tick(100000);h.tick(100100);assertEquals(h.clock.elapsed(),100);
});
Deno.test('finite tracing stops its frame loop and replay restarts from an empty trail',()=>{
  const h=harness();h.clock.resume(200);h.tick(0);h.tick(250);assertEquals(h.frames,[0,200]);assertEquals(h.queued.size,0);
  h.clock.reset();h.clock.resume(200);h.tick(1000);assertEquals(h.clock.elapsed(),0);assertEquals(discoveryLoopFrame2026(h.clock.elapsed(),'trace').fill,0);
});
Deno.test('switching reduce motion on settles a finite interaction without later restarting it',()=>{
  const h=harness();h.clock.resume(200);h.tick(0);h.tick(70);h.clock.finish(200);assertEquals(h.clock.elapsed(),200);assertEquals(h.queued.size,0);
  h.clock.resume(200);assertEquals(h.queued.size,0);
});
Deno.test('unmount/blur cleanup cancels all pending animation work',()=>{
  const h=harness();h.clock.resume();h.tick(0);h.clock.pause();assertEquals(h.queued.size,0);assertEquals(h.cancelled.length,1);
});
