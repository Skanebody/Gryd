import { assertEquals } from 'jsr:@std/assert';
import { createActivityPreferenceSlot2026 as create, ensureActivityPreferenceSlot2026 as load, chooseActivityPreferenceSlot2026 as choose } from './activityPreferenceSlot2026.ts';
const deferred = <T>() => { let resolve!: (value:T)=>void; const promise=new Promise<T>(done=>{resolve=done;}); return {promise,resolve}; };
Deno.test('activity hydration: a late stored value cannot replace an explicit newer choice', async()=>{
  const slot=create(), disk=deferred<string|null>(), observed:string[]=[], written:string[]=[];
  slot.listeners.add(value=>observed.push(value)); const pending=load(slot,()=>disk.promise);await Promise.resolve();
  choose(slot,'bike',async value=>{written.push(value);}); disk.resolve('run'); await pending;
  assertEquals(slot.value,'bike');assertEquals(observed,['bike']);assertEquals(written,['bike']);
});
Deno.test('activity hydration: choosing the visible default still wins over a contrary stored value', async()=>{
  const slot=create(), disk=deferred<string|null>(), observed:string[]=[], written:string[]=[];
  slot.listeners.add(value=>observed.push(value));const pending=load(slot,()=>disk.promise);await Promise.resolve();
  choose(slot,'run',async value=>{written.push(value);});disk.resolve('bike');await pending;
  assertEquals(slot.value,'run');assertEquals(observed,[]);assertEquals(written,['run']);
});
Deno.test('activity hydration: a choice before first hydration prevents stale reads entirely', async()=>{
  const slot=create();let reads=0;choose(slot,'run',async()=>{});
  await load(slot,async()=>{reads++;return 'bike';});assertEquals(slot.value,'run');assertEquals(reads,0);
});
Deno.test('activity hydration: unresolved storage is shared and valid untouched preferences still restore', async()=>{
  const slot=create(), disk=deferred<string|null>(), observed:string[]=[];let reads=0;slot.listeners.add(value=>observed.push(value));
  const read=()=>{reads++;return disk.promise;};const first=load(slot,read),second=load(slot,read);assertEquals(first,second);
  disk.resolve('bike');await first;assertEquals(reads,1);assertEquals(slot.value,'bike');assertEquals(observed,['bike']);
});
Deno.test('activity hydration: latest choice wins even when value returns to initial default', async()=>{
  const slot=create(), disk=deferred<string|null>(), observed:string[]=[];slot.listeners.add(value=>observed.push(value));const pending=load(slot,()=>disk.promise);await Promise.resolve();
  choose(slot,'bike',async()=>{});choose(slot,'run',async()=>{});disk.resolve('bike');await pending;
  assertEquals(slot.value,'run');assertEquals(observed,['bike','run']);
});
Deno.test('activity hydration: surfaces remain independent and failed/invalid reads never invent a sport', async()=>{
  const map=create(), stats=create();choose(map,'bike',async()=>{});await load(stats,async()=> 'run');assertEquals(map.value,'bike');assertEquals(stats.value,'run');
  for(const raw of [null,'swim','']){const slot=create();await load(slot,async()=>raw);assertEquals(slot.value,'run');}
  const failed=create();await load(failed,()=>{throw Error('blocked');});assertEquals(failed.value,'run');
});
