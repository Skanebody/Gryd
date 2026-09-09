import { selectionFrame2026 } from './motionGeometry2026.ts';
function equal(a:unknown,b:unknown){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`);}
Deno.test('sliding selection stays inside the compact navigation at every destination',()=>{
 for(let i=0;i<3;i++){const f=selectionFrame2026(188,3,i,5,4); if(f.x<0||f.x+f.width>178)throw new Error('selection outside navigation');}
});
Deno.test('sport switch uses two full touch targets and clips unknown index to a real target',()=>{
 equal(selectionFrame2026(92,2,1,0,4),{width:44,x:48});equal(selectionFrame2026(92,2,99,0,4),{width:44,x:48});equal(selectionFrame2026(92,2,-1,0,4),{width:44,x:0});
});
Deno.test('empty available space never generates negative selection width',()=>{equal(selectionFrame2026(0,0,0,5,4),{width:0,x:0});});
