import { publicationMasks2026 } from './captureMasks2026.ts';
import { assert, assertEquals, assertAlmostEquals, assertThrows } from 'jsr:@std/assert@^1';
import { analyzeTrace2026, captureRejection2026 } from '../_shared/engine/capture2026.ts';
import { GPS_ACCURACY_MAX_M, POINT_MAX_GAP_S, TERRITORY_RULES_2026 } from '../_shared/game-rules.ts';
import { pointsAfterAnchor2026, requiresReview2026, sourceClockVerdict2026 } from './refonte2026.ts';
import { scoreRun } from '../_shared/engine/anticheat.ts';
import { computeProgressLedger2026 } from '../_shared/progression2026.ts';
import { computeStats, filterPoints } from '../_shared/engine/validation.ts';
import type { RunPoint } from '../_shared/types.ts';

const origin=Date.parse('2026-09-09T08:00:00Z');
function trace(vertices: number[][], options:{offset?:number;step?:number;acc?:number}={}):RunPoint[] {
  const result:RunPoint[]=[];
  for(let i=1;i<vertices.length;i++) {
    const a=vertices[i-1]!,b=vertices[i]!;
    const count=Math.ceil(Math.hypot(b[0]!-a[0]!,b[1]!-a[1]!)/(options.step??20));
    for(let j=i===1?0:1;j<=count;j++) result.push({lat:48.8566+(a[1]!+(b[1]!-a[1]!)*j/count)/111195,
      lng:2.3522+(a[0]!+(b[0]!-a[0]!)*j/count)/(111195*Math.cos(48.8566*Math.PI/180)),
      t:origin+(options.offset??0)+result.length*10000,acc:options.acc??5});
  }
  return result;
}
const square=[[0,0],[300,0],[300,300],[0,300],[0,0]];

Deno.test('2026: open 5 km and out-and-back never invent a surface',()=>{
  for(const vertices of [[[0,0],[5000,0]],[[0,0],[2500,0],[0,0]]]) {
    const r=analyzeTrace2026(trace(vertices),'run');
    assertEquals(r.faces.length,0); assertAlmostEquals(r.distanceM,5000,2);
  }
});
Deno.test('2026: simple loop uses spherical area and closes before a long pause',()=>{
  const points=trace(square); const closed=points.at(-1)!;
  points.push({...closed,t:closed.t+3600_000});
  const result=analyzeTrace2026(points,'run');
  assertEquals(result.faces.length,1);
  assert(result.faces[0]!.areaM2>80_000 && result.faces[0]!.areaM2<91_000);
  assert(Date.parse(result.faces[0]!.closedAt)<=closed.t);
});
Deno.test('2026: figure eight keeps two faces and separate physical closure times',()=>{
  const points=trace([[0,0],[300,0],[300,300],[0,300],[0,0],[-300,0],[-300,-300],[0,-300],[0,0]]);
  const result=analyzeTrace2026(points,'run');
  assertEquals(result.faces.length,2);
  assert(Date.parse(result.faces[0]!.closedAt)<Date.parse(result.faces[1]!.closedAt));
  for(const face of result.faces) assert(face.areaM2<91_000);
});
Deno.test('2026: a crossing between GPS samples produces actual faces, not the outer hull',()=>{
  const points=trace([[0,0],[600,600],[0,600],[600,0],[0,0]],{step:35});
  const result=analyzeTrace2026(points,'run');
  assertEquals(result.faces.length,2);
  assert(result.faces.reduce((sum,face)=>sum+face.areaM2,0)<190_000);
});
Deno.test('2026: GPS interruption and explicit resume never become a capture edge',()=>{
  const points=trace(square);
  const middle=Math.floor(points.length/2);
  // Un vrai silence de mesure, au-delà de POINT_MAX_GAP_S — l'unique seuil du
  // dépôt depuis le lot R2S. Une veille iOS de 90 s, elle, ne coupe plus rien.
  const interrupted=points.map((p,i)=>({...p,t:p.t+(i>=middle?POINT_MAX_GAP_S*1000+1000:0)}));
  assertEquals(analyzeTrace2026(interrupted,'run').faces.length,0);
  const napped=points.map((p,i)=>({...p,t:p.t+(i>=middle?90_000:0)}));
  assertEquals(analyzeTrace2026(napped,'run').faces.length,1);
  const paused=points.map((p,i)=>({...p,...(i===middle?{breakBefore:true as const}:{})}));
  assertEquals(analyzeTrace2026(paused,'run').faces.length,0);
});
Deno.test('2026: urban accuracy captures, unknown accuracy fails closed, sport survives',()=>{
  // Ville : 30 m de précision, boucle bien réelle. Avant le lot R2S, le serveur
  // la refusait alors que l'écran l'avait dessinée. §5.5 n'exige la précision
  // qu'AUX EXTRÉMITÉS d'une fermeture déclarée, pas à chaque point.
  const urban=trace(square,{acc:TERRITORY_RULES_2026.endpointMaxAccuracyM+15});
  assertEquals(analyzeTrace2026(urban,'run').faces.length,1);
  assertEquals(analyzeTrace2026(urban,'run').qualityBreaks,0);
  const beyondClient=trace(square,{acc:GPS_ACCURACY_MAX_M+1});
  assertEquals(analyzeTrace2026(beyondClient,'run').faces.length,0);
  assert(analyzeTrace2026(beyondClient,'run').movingIntervals.length>0);
  const unknown=trace(square).map(({acc:_,...p})=>p);
  assertEquals(analyzeTrace2026(unknown,'run').faces.length,0);
  assertEquals(captureRejection2026(analyzeTrace2026(unknown,'run'),'run')?.code,'gps_quality_unconfirmed');
});
Deno.test('2026: Run/Bike use independent loop thresholds',()=>{
  assertEquals(analyzeTrace2026(trace(square),'run').faces.length,1);
  assertEquals(analyzeTrace2026(trace(square),'bike').faces.length,0);
  assertEquals(analyzeTrace2026(trace([[0,0],[700,0],[700,700],[0,700],[0,0]]),'bike').faces.length,1);
});
Deno.test('2026: tiny loop and nonmonotonic time cannot capture',()=>{
  assertEquals(analyzeTrace2026(trace([[0,0],[20,0],[20,20],[0,20],[0,0]]),'run').faces.length,0);
  const points=trace(square).map((p,i)=>({...p,t:origin-i*10000}));
  assertEquals(analyzeTrace2026(points,'run').faces.length,0);
});
Deno.test('2026: native session binds physical clock, client identity and discipline',()=>{
  const points=trace(square);
  const input={source:'gps',activity:'run',clientRunId:'a',points,receivedAt:new Date(points.at(-1)!.t+1000).toISOString(),
    session:{activity:'run',client_run_id:'a',started_at:new Date(origin-1000).toISOString()}};
  assertEquals(sourceClockVerdict2026(input).verified,true);
  assertEquals(sourceClockVerdict2026({...input,source:'gpx'}).verified,false);
  assertEquals(sourceClockVerdict2026({...input,activity:'bike'}).verified,false);
  // Sans session, le motif dit LAQUELLE des deux causes, pour que le serveur
  // sache si l'attente est résoluble (R2S-4/8) — jamais un `false` muet.
  const noSession=sourceClockVerdict2026({...input,session:null});
  assertEquals(noSession.verified,false);
  assertEquals(noSession.verified===false&&noSession.reason,'no_recording_session');
  const expired=sourceClockVerdict2026({...input,session:null,unavailableReason:'receipt_window_expired'});
  assertEquals(expired.verified===false&&expired.reason,'receipt_window_expired');
});
Deno.test('2026: a few seconds of NTP drift no longer suspend an entire territory',()=>{
  const points=trace(square);
  const drifted=(seconds:number)=>({source:'gps',activity:'run',clientRunId:'a',
    points:points.map(p=>({...p,t:p.t+seconds*1000})),
    receivedAt:new Date(points.at(-1)!.t+1000).toISOString(),
    session:{activity:'run',client_run_id:'a',started_at:new Date(origin-1000).toISOString()}});
  assertEquals(sourceClockVerdict2026(drifted(2)).verified,true);
  assertEquals(sourceClockVerdict2026(drifted(-2)).verified,true);
  const tolerance=TERRITORY_RULES_2026.clockToleranceSeconds;
  assertEquals(sourceClockVerdict2026(drifted(tolerance)).verified,true);
  const beyond=sourceClockVerdict2026(drifted(tolerance*3));
  assertEquals(beyond.verified,false);
  assertEquals(beyond.verified===false&&beyond.reason,'clock_drift_too_large');
  assert(beyond.verified===false&&beyond.driftS>=tolerance);
});
Deno.test('2026: GPS startup before the server anchor preserves the authoritative suffix',()=>{
  const points=trace(square);
  const tolerance=TERRITORY_RULES_2026.clockToleranceSeconds;
  // Une ancre postérieure de PLUS que la tolérance : là, les points d'avant
  // sont bien du pré-enregistrement, pas de la dérive d'horloge.
  const anchor=new Date(points[2]!.t+tolerance*1000).toISOString();
  const eligible=pointsAfterAnchor2026(points,anchor);
  assertEquals(eligible.length,points.length-2);
  assertEquals(eligible[0]!.breakBefore,true);
  // Deux secondes de retard d'horloge ne font plus disparaître la sortie.
  assertEquals(pointsAfterAnchor2026(points,new Date(points[0]!.t+2000).toISOString()).length,points.length);
  assertEquals(pointsAfterAnchor2026(points,new Date(points.at(-1)!.t+tolerance*1000+1).toISOString()),[]);
});
Deno.test('2026: ten minutes of slow sport earn the day despite legacy pace exclusions',()=>{
  const points=trace([[0,0],[720,0]],{step:12}).map((p,i)=>({...p,
    lng:p.lng+Math.sin(i*0.7)*0.000025,lat:p.lat+Math.sin(i*0.4)*0.00002}));
  const report=scoreRun({points,activity:'run',source:'gps',now:points.at(-1)!.t+1000});
  assertEquals(report.decision,'PASS_WITH_EXCLUSIONS');
  assertEquals(requiresReview2026(report.decision),false);
  const analysis=analyzeTrace2026(points,'run');
  const ledger=computeProgressLedger2026({accountId:'a',accountCreatedAt:'2026-01-01T00:00:00Z',initialTimeZone:'Europe/Paris',initialCollectionId:null,
    activities:[{canonicalId:'run',revision:1,sport:'run',source:'gps',eligibility:requiresReview2026(report.decision)?'review':'eligible',
      startedAt:points[0]!.t,endedAt:points.at(-1)!.t,receivedAt:points.at(-1)!.t+1000,movement:analysis.movingIntervals}]});
  assertEquals(ledger.totalXp,100);
});
Deno.test('2026: a short explicit pause contributes no speed, distance or jump between segments',()=>{
  const points:RunPoint[]=[
    {lat:48,lng:2,t:origin,acc:5},
    {lat:48,lng:2.0001,t:origin+10_000,acc:5},
    {lat:48,lng:2.004,t:origin+13_000,acc:5,breakBefore:true},
    {lat:48,lng:2.0041,t:origin+23_000,acc:5},
  ];
  const filtered=filterPoints(points,'run');
  assertEquals(filtered.keptPoints,4);
  assertEquals(filtered.segments.length,2);
  assert(computeStats(filtered.segments).distanceM<20);
  const report=scoreRun({points,activity:'run',now:origin+24_000});
  assertEquals(report.signals.find(s=>s.id==='sustained_speed')?.severity,0);
  assertEquals(report.signals.find(s=>s.id==='gps_jumps')?.severity,0);
});
Deno.test('2026: active ingest dispatches before every legacy side effect',async()=>{
  const source=await Deno.readTextFile(new URL('./index.ts',import.meta.url));
  const handler=source.slice(source.indexOf('Deno.serve('),source.indexOf('// ─── Étapes du handler'));
  assert(handler.includes('return await ingestRefonte2026'));
  assert(!handler.includes('claim_hexes'));
  assert(!handler.includes('legacyIngestRun('));
});

Deno.test('2026: endpoint media protection does not block an otherwise admissible ordinary loop',()=>{
  const points=trace(square); const result=analyzeTrace2026(points,'run');
  const masks=publicationMasks2026([],points,points);
  assertEquals(result.faces.length,1); assertEquals(masks.capture,[]);
  assert(masks.media.some(mask=>mask.lat===points[0]!.lat && mask.lng===points[0]!.lng));
  assert(masks.media.every(mask=>mask.radiusM>0));
});
Deno.test('2026: explicit sensitive zones remain whole-face capture masks independently of media endpoints',()=>{
  const points=trace(square); const personal={lat:points[0]!.lat,lng:points[0]!.lng,radiusM:250};
  const masks=publicationMasks2026([personal],points,points.slice(2));
  assertEquals(masks.capture,[personal]); assertEquals(masks.media.length,4);
  masks.capture[0]!.radiusM=1; assertEquals(personal.radiusM,250);
  assertThrows(()=>publicationMasks2026([{...personal,radiusM:NaN}],points,points));
  assertThrows(()=>publicationMasks2026([{...personal,lat:91}],points,points));
});
Deno.test('2026: a closed undersized face is distinguishable from an open route',()=>{
  const small=analyzeTrace2026(trace([[0,0],[100,0],[100,100],[0,100],[0,0]],{step:10}),'run');
  assertEquals(small.faces.length,0); assert(small.rejectedSmallLoops>0);
  assertEquals(analyzeTrace2026(trace([[0,0],[500,0]]),'run').rejectedSmallLoops,0);
});
