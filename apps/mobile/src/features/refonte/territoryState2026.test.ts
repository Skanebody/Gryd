import { assertEquals, assertExists } from 'jsr:@std/assert@^1';
import { createRecordingChoiceStore2026, recordingChoiceKey2026 } from './recordingChoiceModel2026.ts';
import { parseOwnership2026 } from './territoryModel2026.ts';
import { captureExplanation2026, remainingCaptureArea2026, type CaptureReceipt2026 } from './captureReceipt2026.ts';
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const memory = () => { const data = new Map<string,string>(); return { data, getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string,value: string) => { data.set(key,value); } }; };
Deno.test('privacy choice: Map and preflight share durable owner consent; guests stay private', async () => {
  const storage = memory(); const store = createRecordingChoiceStore2026(storage); let changes = 0;
  const unsubscribe = store.subscribe(() => changes++);
  await store.load('a'); assertEquals(store.getSnapshot().hasChoice,false);
  assertEquals(await store.save('a',true),true); assertEquals(storage.data.get(recordingChoiceKey2026('a')),'shared');
  await store.load('b'); assertEquals(store.getSnapshot().shared,false);
  assertEquals(await store.save('a',false),false); assertEquals(await store.save('b',false),true);
  await store.load('a'); assertEquals(store.getSnapshot().shared,true);
  await store.load(null); assertEquals(await store.save(null,true),false); assertEquals(await store.save(null,false),true);
  assertEquals(store.getSnapshot().shared,false); assertEquals(changes > 5,true); unsubscribe();
});
Deno.test('privacy choice: late hydration cannot disclose another account preference', async () => {
  const old = deferred<string|null>(); const store = createRecordingChoiceStore2026({ getItem:key => key.endsWith('.a') ? old.promise : Promise.resolve('private'),setItem:async()=>{} });
  const pending=store.load('a'); await store.load('b'); old.resolve('shared'); await pending;
  assertEquals(store.getSnapshot().ownerId,'b'); assertEquals(store.getSnapshot().shared,false);
});
Deno.test('privacy choice: a switched-owner write may persist only its original key and cannot start a run', async () => {
  const written=deferred<void>(); const keys:string[]=[]; const store=createRecordingChoiceStore2026({getItem:async()=>null,setItem:async key=>{keys.push(key);await written.promise;}});
  await store.load('a'); const saving=store.save('a',true); await Promise.resolve(); await store.load('b'); written.resolve();
  assertEquals(await saving,false); assertEquals(keys,[recordingChoiceKey2026('a')]); assertEquals(store.getSnapshot().ownerId,'b'); assertEquals(store.getSnapshot().shared,false);
});
Deno.test('privacy choice: failed persistence retains the prior private choice and is retryable', async () => {
  let fail=true; const store=createRecordingChoiceStore2026({getItem:async()=> 'private',setItem:async()=>{if(fail)throw Error('disk');}});
  await store.load('a'); assertEquals(await store.save('a',true),false); assertEquals(store.getSnapshot().shared,false); assertEquals(store.getSnapshot().saveFailed,true);
  fail=false; assertEquals(await store.save('a',true),true); assertEquals(store.getSnapshot().shared,true);
});
Deno.test('privacy choice: unreadable storage never silently becomes authorisation', async () => {
  let value='corrupt'; const store=createRecordingChoiceStore2026({getItem:async()=>value,setItem:async()=>{}});
  await store.load('a'); assertEquals(store.getSnapshot().status,'failed'); assertEquals(await store.save('a',true),false);
  value='private'; await store.load('a',true); assertEquals(store.getSnapshot().status,'ready');
  await store.load(undefined); assertEquals(store.getSnapshot().status,'unresolved'); assertEquals(await store.save(undefined,false),false);
});
const feature = (role='mine',ownerId:string|null='a') => ({ type:'Feature',id:'face',geometry:{type:'Polygon',coordinates:[[[2,48],[2.01,48],[2.01,48.01],[2,48]]]},properties:{id:'face',ownerId,role,activity:'run',areaM2:50,capturedAreaM2:100,controlledSince:'2026-09-09T12:00:00Z',ruleset:'2026.1'} });
const payload = () => ({type:'FeatureCollection',contract:'ownership.2026.2',activity:'run',asOf:'2026-09-09T12:00:00Z',crew:{id:'crew-a',name:'Real crew'},features:[feature(),feature('crew',null),feature('others',null)]});
Deno.test('territory: role is explicit server data and remaining area is distinct from original area', () => {
  const parsed=parseOwnership2026(payload(),'run','a'); assertExists(parsed); assertEquals(parsed.features.map(f=>f.properties.role),['mine','crew','others']);
  assertEquals(parsed.features[0]!.properties.areaM2,50); assertEquals(parsed.features[0]!.properties.capturedAreaM2,100);
  assertEquals(parseOwnership2026({...payload(),features:[],crew:null},'run','a')?.features,[]);
});
Deno.test('territory: old schema, mismatched sport, leaked identity and unknown membership fail closed', () => {
  for (const data of [{...payload(),contract:undefined},{...payload(),activity:'bike'},{...payload(),crew:null},
    {...payload(),features:[feature('mine','b')]},{...payload(),features:[feature('crew','b')]},{...payload(),features:[feature('other',null)]}]) assertEquals(parseOwnership2026(data,'run','a'),null);
  assertEquals(parseOwnership2026(payload(),'bike','a'),null);
});
Deno.test('territory: malformed coordinates, missing closure and nonfinite measures fail closed', () => {
  for(const coordinates of [[],[[[2,48],[3,48],[2,49],[3,49]]],[[[2,48],[190,48],[2,49],[2,48]]],[[[2,48],[NaN,48],[2,49],[2,48]]]]) {
    const data=payload();data.features[0]!.geometry.coordinates=coordinates;assertEquals(parseOwnership2026(data,'run','a'),null);
  }
  const data=payload();data.features[0]!.properties.areaM2=NaN;assertEquals(parseOwnership2026(data,'run','a'),null);
});
const receipt=(patch:Partial<CaptureReceipt2026>={}):CaptureReceipt2026=>({ruleset:'2026.1',status:'no_loop',loopAreaM2:0,newTerrainM2:null,alreadyOwnedM2:null,neutralTakenM2:null,takenFromOthersM2:null,...patch});
Deno.test('capture explanation: no-loop never invents physical openness and server refusal reasons remain distinct',()=>{
  assertEquals(captureExplanation2026(receipt(),true)?.title,'Aucune boucle admissible');
  const reasons=['gps_quality_unconfirmed','loop_too_small','closure_crosses_known_barrier','source_or_clock_unconfirmed','verification_required'];
  const titles=reasons.map(reason=>captureExplanation2026(receipt({reason} ),true)?.title);
  assertEquals(new Set(titles).size,reasons.length);assertEquals(titles.includes(undefined),false);
});
Deno.test('capture explanation: published partial capture is not falsely labelled entirely private',()=>{
  assertEquals(captureExplanation2026(receipt({status:'published',reason:'protected_place'}),true),null);
  assertEquals(captureExplanation2026(receipt({status:'private',reason:'protected_place'}),true)?.title,'Boucle gardée privée');
  assertEquals(captureExplanation2026(receipt({status:'scheduled'}),true)?.title,'Boucle validée · publication différée');
});
Deno.test('capture remainder: actual zero after reclaim is shown; unavailable and invalid measures are never fabricated',()=>{
  assertEquals(remainingCaptureArea2026(receipt({remainingTerrainM2:0})),0);
  for(const value of [null,undefined,NaN,Infinity,-1])assertEquals(remainingCaptureArea2026(receipt({remainingTerrainM2:value})),null);
});
