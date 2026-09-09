import { nextCrewOuting2026 } from './crewNextOuting2026.ts';
import type { CrewOuting2026 } from './crewOutingsModel2026.ts';
const row=(id:string,startsAt:string,cancelled=false):CrewOuting2026=>({id,startsAt,cancelled,title:id,activity:'run',placeLabel:'Parc',capacity:20,goingCount:4,joined:false,canManage:false,revision:1,hostName:null});
Deno.test('crew priority is the next real meetup, independent of backend ordering',()=>{const items=[row('later','2026-09-09T19:00:00Z'),row('next','2026-09-09T17:00:00Z')];if(nextCrewOuting2026(items,Date.parse('2026-09-09T16:00:00Z'))?.id!=='next'||items[0]?.id!=='later')throw new Error('wrong next outing / mutated response');});
Deno.test('cancelled, started and invalid-dated meetings never become next meetup',()=>{const now=Date.parse('2026-09-09T16:00:00Z');if(nextCrewOuting2026([row('cancelled','2026-09-09T18:00:00Z',true),row('started','2026-09-09T16:00:00Z'),row('bad','bad')],now)!==null)throw new Error('not upcoming');});
