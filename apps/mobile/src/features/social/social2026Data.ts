import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { currentResultOwner2026, resultOwnerEpoch2026, isResultOwnerCurrent2026, subscribeResultOwner2026 } from '../run/resultOwner2026';
import { ownerScopedValue2026, stripSocialImageMetadata2026 } from './social2026Model';

export function useSocialEpoch2026(){return useSyncExternalStore(subscribeResultOwner2026,resultOwnerEpoch2026,resultOwnerEpoch2026);}

export async function socialRpc2026<T>(owner: string, rpc: string, args: Record<string, unknown> = {}, epoch = resultOwnerEpoch2026()): Promise<T> {
 if(!supabase)throw new Error('unavailable'); if(!isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed'); const current=await supabase.auth.getSession();
 if(current.error || current.data.session?.user.id!==owner || !isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed');
 const result=await supabase.rpc(rpc,args).setHeader('Authorization',`Bearer ${current.data.session.access_token}`);
 const latest=await supabase.auth.getSession(); if(latest.data.session?.user.id!==owner || !isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed');
 if(result.error)throw new Error(result.error.message);return result.data as T;
}
export function useSocialRead2026<T>(rpc:string,args:Record<string,unknown>={},scopeKey='') {
 const {session,loading:restoring}=useSession();const owner=session?.user.id??null;const epoch=useSyncExternalStore(subscribeResultOwner2026,resultOwnerEpoch2026,resultOwnerEpoch2026);
 const current=useRef(owner);current.current=owner;const serial=JSON.stringify(args);
 const key=epoch+rpc+serial+scopeKey;
 const [read,setRead]=useState<{owner:string;key:string;value:T}|null>(null);const [state,setState]=useState<{owner:string;key:string;status:'loading'|'ready'|'failed'}|null>(null);const [tick,setTick]=useState(0);
 const reload=useCallback(()=>setTick(n=>n+1),[]);
 useFocusEffect(useCallback(()=>{if(!owner||restoring)return;let cancelled=false;setState({owner,key,status:'loading'});
  socialRpc2026<T>(owner,rpc,JSON.parse(serial)).then(value=>{if(!cancelled&&current.current===owner&&isResultOwnerCurrent2026(owner,epoch)){setRead({owner,key,value});setState({owner,key,status:'ready'});}}).catch(()=>{if(!cancelled&&current.current===owner&&isResultOwnerCurrent2026(owner,epoch)){setRead(null);setState({owner,key,status:'failed'});}});return()=>{cancelled=true};
 },[owner,epoch,restoring,rpc,serial,scopeKey,tick]));
 return {owner,data:read?.key===key?ownerScopedValue2026(owner,read):null,status:!owner?'signedOut':state?.owner===owner&&state?.key===key?state.status:'loading',reload};
}
export function useSocialMedia2026(path:string|null|undefined) {
 const {session}=useSession();const owner=session?.user.id??null;const epoch=useSyncExternalStore(subscribeResultOwner2026,resultOwnerEpoch2026,resultOwnerEpoch2026);
 const [read,setRead]=useState<{owner:string;epoch:number;path:string;url:string}|null>(null);
 useEffect(()=>{setRead(null);if(!owner||!path||!supabase)return;let cancelled=false;
  const load=async()=>{try{if(!isResultOwnerCurrent2026(owner,epoch))return;const res=await supabase!.storage.from('social-2026').createSignedUrl(path,120);if(!cancelled&&isResultOwnerCurrent2026(owner,epoch))setRead(res.error?null:{owner,epoch,path,url:res.data.signedUrl});}catch{if(!cancelled&&isResultOwnerCurrent2026(owner,epoch))setRead(null);}};
  void load();const timer=setInterval(()=>void load(),90000);return()=>{cancelled=true;clearInterval(timer)};
 },[owner,epoch,path]);
 return read?.owner===owner&&read?.epoch===epoch&&read?.path===path?read.url:null;
}
export async function pickSocialImage2026():Promise<string|null>{
 const owner=currentResultOwner2026(),epoch=resultOwnerEpoch2026();if(typeof owner!=='string')throw new Error('authentication_required');
 const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,quality:0.8,exif:false});return !isResultOwnerCurrent2026(owner,epoch)||result.canceled?null:result.assets[0]?.uri??null;
}
export async function uploadSocialImage2026(owner:string,uri:string,kind:'avatar'|'post',epoch=resultOwnerEpoch2026()):Promise<string>{
 if(!supabase)throw new Error('unavailable');if((await supabase.auth.getSession()).data.session?.user.id!==owner||!isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed');
 let input:Uint8Array;
 if(Platform.OS==='web'){const response=await fetch(uri);input=new Uint8Array(await response.arrayBuffer());}
 else {const raw=await FileSystem.readAsStringAsync(uri.split('?')[0]!,{encoding:FileSystem.EncodingType.Base64});input=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));}
 if(input.byteLength>5*1024*1024)throw new Error('media_too_large');const clean=stripSocialImageMetadata2026(input);const path=`${owner}/${kind}/${Crypto.randomUUID()}.${clean.extension}`;
 if((await supabase.auth.getSession()).data.session?.user.id!==owner||!isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed');
 const result=await supabase.storage.from('social-2026').upload(path,clean.bytes.buffer as ArrayBuffer,{contentType:clean.mime,upsert:false});
 if(result.error)throw new Error('invalid_media');if((await supabase.auth.getSession()).data.session?.user.id!==owner||!isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed');return path;
}
