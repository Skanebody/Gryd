import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { outingDraft2026, outingForm2026, parseCrewOutings2026 } from './crewOutingsModel2026.ts';
const now=new Date(2026,8,9,10,0).getTime();
const valid=()=>({...outingDraft2026(undefined,new Date(now)),title:'Canal ensemble',placeLabel:'Entrée du parc',activity:'bike' as const,capacity:'12'});
Deno.test('rendez-vous vélo : le fuseau local est converti en instant et la discipline est conservée',()=>{
  const result=outingForm2026(valid(),now);if(!result.ok)throw new Error(result.reason);
  assertEquals(result.values.p_activity,'bike');assertEquals(result.values.p_capacity,12);assertEquals(new Date(result.values.p_starts_at).getHours(),19);
});
Deno.test('une date impossible ou un horaire passé ne devient pas un autre rendez-vous silencieusement',()=>{
  for(const change of [{date:'2026-02-30'},{date:'2026-09-09',time:'09:00'},{time:'25:10'},{date:'2026-99-01'}])assertEquals(outingForm2026({...valid(),...change},now).ok,false);
});
Deno.test('capacité : vide reste illimité, les fractions et la notation exponentielle sont refusées',()=>{
  const unlimited=outingForm2026({...valid(),capacity:''},now);if(!unlimited.ok)throw new Error(unlimited.reason);assertEquals(unlimited.values.p_capacity,null);
  for(const capacity of ['0','1','3.5','1e1','-3'])assertEquals(outingForm2026({...valid(),capacity},now).ok,false);
});
Deno.test('les détails d’entrée et adresses privées sont refusés avant la publication',()=>{
  for(const placeLabel of ['12 rue Victor Hugo','Interphone Martin digicode 1234'])assertEquals(outingForm2026({...valid(),placeLabel},now),{ok:false,reason:'place_looks_like_address'});
});
Deno.test('une réponse serveur incomplète ne se transforme pas en liste vide ou fausse inscription',()=>{
  assertEquals(parseCrewOutings2026({ok:true,canCreate:true,items:[{title:'sortie'}]}),null);
  assertEquals(parseCrewOutings2026({ok:false,reason:'forbidden'}),null);
  assertEquals(parseCrewOutings2026({ok:true,canCreate:false,items:[]}),{canCreate:false,items:[]});
});
