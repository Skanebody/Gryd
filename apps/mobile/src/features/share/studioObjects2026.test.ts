import { COMMERCIAL_OBJECTS_2026, LEVEL_OBJECT_LAYOUTS_2026, SEASON_OBJECT_LAYOUTS_2026, commercialObjectPreview2026, levelObjectPreview2026, readCommercialCollections2026, resolveStudioObject2026, studioObjectKey2026, type CommercialCollection2026, type StudioObjectRequest2026 } from './studioObjects2026.ts';
import { requestStudioObject2026, requestedStudioObject2026, clearStudioObject2026 } from './studioObjectSelection2026.ts';
import { setResultOwner2026 } from '../run/resultOwner2026.ts';
declare const Deno:{test(name:string,fn:()=>void):void};
const assert=(v:unknown,message:string)=>{if(!v)throw Error(message);};
const reward={collectionId:'season-real',rewardId:'short_animation',variant:'premium' as const,label:'Animation courte',tier:9};
const request:StudioObjectRequest2026={kind:'season',...reward};
Deno.test('season objects: exact collection, reward and artistic variant are all necessary',()=>{
  assert(resolveStudioObject2026(request,[reward],[])?.layout==='motion','Owned motion has native export route');
  for(const invalid of [{...request,collectionId:'other-season'},{...request,rewardId:'season_poster'},{...request,variant:'standard' as const}]) assert(!resolveStudioObject2026(invalid,[reward],[]),'No approximate ownership');
  assert(!resolveStudioObject2026(request,[],[]),'Navigation intention never grants an object');
});
Deno.test('season objects: all twelve layouts are distinct and usable without a live subscription',()=>{
  assert(Object.keys(SEASON_OBJECT_LAYOUTS_2026).length===12,'Twelve templates');
  assert(new Set(Object.values(SEASON_OBJECT_LAYOUTS_2026)).size===12,'No twelve recolorations');
  for(const [rewardId,layout]of Object.entries(SEASON_OBJECT_LAYOUTS_2026))for(const variant of ['standard','premium'] as const){
    const owned={...reward,rewardId,variant};assert(resolveStudioObject2026({kind:'season',...owned},[owned],[])?.layout===layout,'Permanent ownership sufficient, subscription status is not an input');
  }
});
Deno.test('commercial objects: preview never grants ownership and only the purchased collection opens',()=>{
  const owned:CommercialCollection2026={id:'relief',productIds:[],configured:false,owned:true,acquiredAt:'2026-09-01T00:00:00Z',equipped:false};
  for(const id of Object.keys(COMMERCIAL_OBJECTS_2026) as (keyof typeof COMMERCIAL_OBJECTS_2026)[])for(let i=0;i<COMMERCIAL_OBJECTS_2026[id].designs.length;i++){
    const preview=commercialObjectPreview2026(id,i)!;assert(preview,'Actual design exists');
    assert(!resolveStudioObject2026(preview.request,[],[]),'Preview alone cannot export');
    assert(!!resolveStudioObject2026(preview.request,[],[owned])===(id==='relief'),'Only exact permanent collection');
  }
  assert(!resolveStudioObject2026({kind:'commercial',collectionId:'relief',designId:'made-up'},[],[owned]),'No invented design');
});
Deno.test('Studio object routing: survives choosing an activity, invalidates switch and guest transitions',()=>{
  setResultOwner2026('alice');assert(requestStudioObject2026(request,'alice'),'Owner may request');
  assert(requestedStudioObject2026('alice')?.kind==='season','Selection survives same owner journal navigation');
  setResultOwner2026('bob');assert(!requestedStudioObject2026('bob'),'Other owner cannot export');
  setResultOwner2026('alice');assert(!requestedStudioObject2026('alice'),'Switch back does not resurrect request');
  setResultOwner2026(null);assert(!requestStudioObject2026(request,'alice'),'Guest cannot select someone else’s earned reward');assert(!requestedStudioObject2026(null),'Guest has no inherited selection');clearStudioObject2026();setResultOwner2026(undefined);
});
Deno.test('commercial ownership payload: no malformed or duplicated ownership is accepted',()=>{
  assert(readCommercialCollections2026({collections:[]})?.length===0,'Empty available catalogue');
  for(const value of [null,{collections:[{id:'relief',owned:true}]},{collections:[{id:'invented',productIds:[],owned:true,configured:true,acquiredAt:null,equipped:false}]}])assert(readCommercialCollections2026(value)===null,'Reject malformed receipt');
});
Deno.test('level objects: the eight §7.2 rewards render only when the server granted them',()=>{
  const catalogue=[['first_trace',2],['line_frame',3],['chalk',5],['atlas',10],['contour_animation',15],['ridge_merit',20],['cartographer',30],['horizon',50]] as const;
  assert(Object.keys(LEVEL_OBJECT_LAYOUTS_2026).length===catalogue.length,'Eight level templates');
  assert(Object.keys(LEVEL_OBJECT_LAYOUTS_2026).filter(id=>LEVEL_OBJECT_LAYOUTS_2026[id]==='frame').join()==='line_frame,ridge_merit','The two cadres are the only frames');
  for(const [rewardId,level] of catalogue){
    const request:StudioObjectRequest2026={kind:'level',rewardId};
    assert(studioObjectKey2026(request)===`level:${rewardId}`,'Level key never collides with a season key');
    // Un catalogue peint ne possède rien : sans octroi serveur, aucun rendu.
    assert(!resolveStudioObject2026(request,[],[],[],[]),'Painted catalogue is not ownership');
    assert(!!levelObjectPreview2026({id:rewardId,label:'x',level},'Niveau'),'Catalogue preview exists');
    const owned={rewardId,label:'Objet',level,edition:`Niveau ${level}`};
    const object=resolveStudioObject2026(request,[],[],[],[owned]);
    assert(object?.layout===LEVEL_OBJECT_LAYOUTS_2026[rewardId],'Owned level object renders its own layout');
    assert(object?.premium===false,'A level object is never a subscription edition');
    assert(object?.design===level,'The serial is the level itself');
  }
  assert(!resolveStudioObject2026({kind:'level',rewardId:'invented'},[],[],[],[{rewardId:'invented',label:'x',level:9,edition:'x'}]),'No invented level object');
  assert(!resolveStudioObject2026({kind:'level',rewardId:'chalk'},[],[],[],[{rewardId:'atlas',label:'x',level:10,edition:'x'}]),'No approximate level ownership');
});
