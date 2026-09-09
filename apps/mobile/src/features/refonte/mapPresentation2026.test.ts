import { assertEquals, assertExists, assertNotEquals } from 'jsr:@std/assert@^1';
import { parseOwnership2026, territoryOwnerLabel2026, type OwnedFeature } from './territoryModel2026.ts';
import { OWNER_TONES_2026, ownerToneSeed2026, ownerToneSlots2026, territoryPaintLayers2026 } from './territoryPaint2026.ts';
import { createMapLocationGate2026, readMapLocation2026, type MapLocationProvider2026, type MapPermission2026 } from './mapLocation2026.ts';
const feature=(id:string,key:string,x=0,role:'mine'|'crew'|'others'='others'):OwnedFeature=>({type:'Feature',geometry:{type:'Polygon',coordinates:[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]]},properties:{id,ownerId:role==='mine'?'self':null,role,activity:'run',areaM2:1,capturedAreaM2:2,controlledSince:'2026-09-09T12:00:00Z',ruleset:'2026.1',owner:{key,kind:'individual',label:null,crew:null,identityAvailable:true}}});
const filters={mine:true,crew:true,others:true};
const payload=(f:OwnedFeature,contract='ownership.2026.3')=>({type:'FeatureCollection',contract,activity:'run',asOf:'2026-09-09T12:00:00Z',crew:null,features:[f]});
Deno.test('ownership v3 validates pseudonym and does not interpret membership as collective title',()=>{
  const f=feature('a','a'.repeat(32));f.properties.owner.crew={key:'b'.repeat(32),name:'Visible crew'};
  const parsed=parseOwnership2026(payload(f),'run','self');assertExists(parsed);
  assertEquals(parsed.features[0]!.properties.owner.kind,'individual');assertEquals(parsed.features[0]!.properties.role,'others');
  for(const bad of [{...f.properties.owner,kind:'crew'}, {...f.properties.owner,key:'raw-user-uuid'}, {...f.properties.owner,crew:{key:'private-id',name:'Crew'}}]){
    assertEquals(parseOwnership2026(payload({...f,properties:{...f.properties,owner:bad as never}}),'run','self'),null);
  }
});
Deno.test('ownership v2 remains usable with face-labelled fallback, never a fabricated foreign identity',()=>{
  const f=feature('face-old','a'.repeat(32));f.properties.owner.label='Untrusted old extension';
  const parsed=parseOwnership2026(payload(f,'ownership.2026.2'),'run','self');assertExists(parsed);
  assertEquals(parsed.features[0]!.properties.owner.identityAvailable,false);assertEquals(parsed.features[0]!.properties.owner.key,'face:face-old');
  assertEquals(territoryOwnerLabel2026(parsed.features[0]!,true),'Terrain · FACE-O');
});
Deno.test('owner labels only use server-authorized display names, otherwise pseudonyms',()=>{
  const f=feature('a','abcdef0123456789abcdef0123456789');
  assertEquals(territoryOwnerLabel2026(f,true),'Joueur · ABCDEF');f.properties.owner.label='Mila';assertEquals(territoryOwnerLabel2026(f,true),'Mila');
});
Deno.test('adjacent owners with identical palette seeds receive different neutral tones',()=>{
  const keys=Array.from({length:100},(_,i)=>String(i));let a='',b='';
  for(const key of keys){const other=keys.find(k=>k!==key&&ownerToneSeed2026(k)===ownerToneSeed2026(key));if(other){a=key;b=other;break;}}
  const features=[feature('left',a),feature('right',b,1)];const slots=ownerToneSlots2026(features);
  assertNotEquals(slots.get(a),slots.get(b));assertEquals([...slots],[...ownerToneSlots2026(features.toReversed())]);
});
Deno.test('multiple faces belonging to the same owner keep one tone and identity is not crew-derived',()=>{
  const faces=[feature('left','player-a'),feature('right','player-a',1),feature('next','player-b',2,'crew')];
  assertEquals(ownerToneSlots2026(faces).size,2);
  const layers=territoryPaintLayers2026({features:faces,filters,attenuate:true,dark:false,selectedId:null});
  assertEquals(layers.find(l=>l.id==='terr-owner-member')!.data.features.length,0);
  assertEquals(layers.find(l=>l.id==='terr-crew-affiliation')!.data.features.length,1);
});
Deno.test('only explicit visible membership creates dashed boundary; palette uses neutral tokens',()=>{
  const f=feature('a','person');f.properties.owner.crew={key:'visible-crew',name:'Crew'};
  const layers=territoryPaintLayers2026({features:[f],filters,attenuate:false,dark:false,selectedId:null});
  assertEquals(layers.find(l=>l.id==='terr-owner-member')!.data.features.length,1);
  assertEquals(layers.find(l=>l.id==='terr-owner-member')!.lineDash,[3,2]);
  assertEquals(OWNER_TONES_2026.every(t=>/^#([0-9a-f]{2})\1\1$/i.test(t)),true);
});
Deno.test('filters preserve colour and selection only references actually visible server geometry',()=>{
  const faces=[feature('a','left'),feature('b','right',1,'crew')];
  const all=territoryPaintLayers2026({features:faces,filters,attenuate:true,dark:false,selectedId:'b'});
  const hidden=territoryPaintLayers2026({features:faces,filters:{...filters,crew:false},attenuate:true,dark:false,selectedId:'b'});
  assertEquals(hidden.some(l=>l.id==='terr-selected'),false);
  const tone=(layers:typeof all)=>layers.find(l=>l.fillColor&&l.data.features.some(f=>f.properties?.id==='a'))?.fillColor;
  assertEquals(tone(all),tone(hidden));
});
Deno.test('map layers remain bounded and keep zoom LOD and queryable real IDs',()=>{
  const faces=Array.from({length:500},(_,i)=>feature(`face-${i}`,`owner-${i}`,i*2));
  const layers=territoryPaintLayers2026({features:faces,filters,attenuate:true,dark:true,selectedId:null});
  assertEquals(layers.length,11);assertEquals(layers.slice(0,6).every(l=>!!l.fillOpacityStops),true);
  assertEquals(layers[0]!.data.features.every(f=>f.properties?.zoneId===f.properties?.id),true);
});
const permission=(status:MapPermission2026['status'],canAskAgain=true,coarseOnly=false)=>({status,canAskAgain,coarseOnly});
const gps=(initial:MapPermission2026)=>{const calls:string[]=[];const provider:MapLocationProvider2026={checkForegroundPermission:async()=>{calls.push('check');return initial;},requestForegroundPermission:async()=>{calls.push('request');return permission('granted');},getCurrentPositionOnce:async()=>{calls.push('fix');return {lat:48,lng:2,accuracy:10,ts:Date.now()};}};return{calls,provider};};
Deno.test('map auto-centers from a real granted fix without asking any permission',async()=>{
  const {provider,calls}=gps(permission('granted'));const result=await readMapLocation2026(provider,false);
  assertEquals(result.kind,'position');assertEquals(calls,['check','fix']);
});
Deno.test('map automatic opening never prompts for denied or unknown permission',async()=>{
  for(const status of ['denied','undetermined'] as const){const {provider,calls}=gps(permission(status));const result=await readMapLocation2026(provider,false);assertNotEquals(result.kind,'position');assertEquals(calls,['check']);}
});
Deno.test('recenter asks only when allowed, permanent refusal is actionable without a second request',async()=>{
  const ask=gps(permission('undetermined'));assertEquals((await readMapLocation2026(ask.provider,true)).kind,'position');assertEquals(ask.calls,['check','request','fix']);
  const denied=gps(permission('denied',false));assertEquals(await readMapLocation2026(denied.provider,true),{kind:'denied',canAskAgain:false});assertEquals(denied.calls,['check']);
});
Deno.test('coarse permission stays approximate; unavailable and malformed fixes never become fake positions',async()=>{
  const coarse=gps(permission('granted',true,true));const result=await readMapLocation2026(coarse.provider,false);assertEquals(result.kind==='position'&&result.zoom,13);
  for(const fix of [null,{lat:NaN,lng:2,accuracy:10,ts:Date.now()},{lat:91,lng:2,accuracy:10,ts:Date.now()}]){const {provider}=gps(permission('granted'));provider.getCurrentPositionOnce=async()=>fix;assertEquals(await readMapLocation2026(provider,false),{kind:'unavailable'});}
});
Deno.test('new recenter, manual exploration, account cleanup and unmount invalidate late GPS results',()=>{
  const gate=createMapLocationGate2026();const first=gate.begin();const newer=gate.begin();assertEquals(gate.isCurrent(first),false);assertEquals(gate.isCurrent(newer),true);gate.cancel();assertEquals(gate.isCurrent(newer),false);
});

Deno.test('stale GPS never impersonates current position and a silent provider ends as unavailable',async()=>{
  const {provider}=gps(permission('granted'));provider.getCurrentPositionOnce=async()=>({lat:48,lng:2,accuracy:10,ts:0});
  assertEquals(await readMapLocation2026(provider,false),{kind:'unavailable'});
  provider.getCurrentPositionOnce=()=>new Promise(()=>{});
  assertEquals(await readMapLocation2026(provider,false,{timeoutMs:1}),{kind:'unavailable'});
});
