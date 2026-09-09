import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { createDiscoveryClock2026, discoveryMotionAllowed2026 } from './discoveryMotion2026';

/** Similar scope to ui/game/anim, with conservative hydration and web visibility. */
export function useDiscoveryMotion2026() {
  const [preference,setPreference]=useState({resolved:false,reduced:true});
  const [active,setActive]=useState(Platform.OS==='web'||AppState.currentState==='active');
  const [visible,setVisible]=useState(typeof document==='undefined'||document.visibilityState!=='hidden');
  const [focused,setFocused]=useState(false);
  useFocusEffect(useCallback(()=>{setFocused(true);return()=>setFocused(false);},[]));
  useEffect(()=>{
    let alive=true,revision=0;
    if(Platform.OS==='web'){
      const query=typeof window!=='undefined'&&typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
      const update=()=>{if(alive)setPreference({resolved:true,reduced:query?.matches??true});};
      const visibility=()=>setVisible(document.visibilityState!=='hidden');update();
      query?.addEventListener?.('change',update);
      if(query&&!query.addEventListener)query.addListener(update);
      if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
      return()=>{alive=false;query?.removeEventListener?.('change',update);if(query&&!query.removeEventListener)query.removeListener(update);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);};
    }
    const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',reduced=>{revision++;if(alive)setPreference({resolved:true,reduced});});
    const started=revision;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(alive&&revision===started)setPreference({resolved:true,reduced});}).catch(()=>{if(alive&&revision===started)setPreference({resolved:true,reduced:true});});
    const app=AppState.addEventListener('change',state=>setActive(state==='active'));
    return()=>{alive=false;listener.remove();app.remove();};
  },[]);
  return {ready:preference.resolved,reduced:preference.reduced,enabled:discoveryMotionAllowed2026({...preference,active,visible,focused})};
}
export function useDiscoveryElapsed2026(enabled:boolean,key:string,stopAt=Infinity,still=false) {
  const [snapshot,setSnapshot]=useState({key,elapsed:0});
  // Each replay owns its callback; a late frame from an old attempt cannot paint
  // elapsed time into the new attempt before React has cleaned up its effect.
  const clock=useMemo(()=>createDiscoveryClock2026(callback=>requestAnimationFrame(callback),id=>cancelAnimationFrame(id),elapsed=>setSnapshot({key,elapsed})),[key]);
  useEffect(()=>{
    if(still&&Number.isFinite(stopAt))clock.finish(stopAt);
    else if(enabled)clock.resume(stopAt);
    else clock.pause();
    return()=>clock.pause();
  },[enabled,clock,stopAt,still]);
  return snapshot.key===key?snapshot.elapsed:0;
}
