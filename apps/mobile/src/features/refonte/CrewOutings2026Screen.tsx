import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CREW_OUTING_CAPACITY_MAX, CREW_OUTING_CAPACITY_MIN, CREW_OUTING_TITLE_MAX, CREW_OUTING_PLACE_LABEL_MAX, fonts, refonteColors as c, type Activity } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { EVENTS, screen, track } from '../../lib/analytics';
import { useLocale } from '../../i18n/store';
import { resultOwnerEpoch2026, isResultOwnerCurrent2026 } from '../run/resultOwner2026';
import { ProfileButton, ProfilePage, ProfileSegments, s } from './ProfilePrimitives';
import { AccountDoor2026 } from '../account/AccountDoor2026';
import { GrydIcon } from '../../ui/gryd';
import { outingDraft2026, outingForm2026, localDate2026, parseCrewOutings2026, type CrewOuting2026, type CrewOutingDraft2026 } from './crewOutingsModel2026';
import { crewOutingCalendar2026 } from './crewOutingCalendar2026';
import { exportCrewCalendar2026 } from './exportCrewCalendar2026';

export default function CrewOutings2026Screen() {
  const { session } = useSession();
  const owner=session?.user.id ?? null;
  const locale=useLocale(), fr=locale==='fr';
  const copy=(a:string,b:string)=>fr?a:b;
  const [data,setData]=useState<ReturnType<typeof parseCrewOutings2026>>(null);
  const [dataOwner,setDataOwner]=useState<string|null>(null);
  const [loading,setLoading]=useState(true),[failure,setFailure]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const [sport,setSport]=useState<'all'|Activity>('all');
  const [editing,setEditing]=useState<CrewOuting2026|'new'|null>(null);
  const [formOwner,setFormOwner]=useState<string|null>(null);
  const [draft,setDraft]=useState<CrewOutingDraft2026>(()=>outingDraft2026());
  const [cancelId,setCancelId]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
  const ownerRef=useRef(owner);ownerRef.current=owner;
  const request=useRef(0);
  const exporting=useRef(false);
  const [calendarBusy,setCalendarBusy]=useState(false);
  const reason=(code:string)=>({
    title:copy('Donne un titre court à la sortie.','Give the outing a short title.'),
    date:copy('Choisis une date et une heure à venir, dans la période autorisée.','Choose an upcoming date and time within the allowed period.'),
    place:copy('Indique un point de rendez-vous public.','Add a public meeting point.'),
    place_looks_like_address:copy('Choisis un lieu public, sans adresse personnelle ni code d’entrée.','Choose a public place without a private address or entry code.'),
    capacity:copy(`Indique entre ${CREW_OUTING_CAPACITY_MIN} et ${CREW_OUTING_CAPACITY_MAX} places, ou laisse vide.`,`Enter ${CREW_OUTING_CAPACITY_MIN} to ${CREW_OUTING_CAPACITY_MAX} places, or leave blank.`),
    full:copy('Cette sortie est complète.','This outing is full.'), cancelled:copy('Cette sortie a été annulée.','This outing was cancelled.'),
    started:copy('Cette sortie a déjà commencé.','This outing has already started.'), stale:copy('La sortie a changé. Rouvre-la pour utiliser les dernières informations.','The outing changed. Reopen it to use the latest information.'),
    forbidden:copy('Cette action n’est pas disponible pour ton compte.','This action is not available for your account.'),
    capacity_below_attendance:copy('La capacité doit conserver les places des personnes déjà inscrites.','Capacity must include everyone already attending.'),
    moderated:copy('Reformule le titre ou le rendez-vous.','Rephrase the title or meeting point.'), duplicate:copy('Une sortie identique existe déjà.','An identical outing already exists.'),
    no_crew:copy('Rejoins un crew pour retrouver ses rendez-vous.','Join a crew to see its outings.'),
  }[code] ?? copy('Cette action n’a pas abouti. Réessaie.','This action did not complete. Try again.'));
  const reload=useCallback(async()=>{
    const tick=++request.current, epoch=resultOwnerEpoch2026();
    if (!owner || !supabase || !session?.access_token || !isResultOwnerCurrent2026(owner,epoch)) {setLoading(false);return;}
    setLoading(true);setFailure(null);
    try {
      const res=await supabase.rpc('crew_outings_2026').setHeader('Authorization',`Bearer ${session.access_token}`);
      if (tick!==request.current || !isResultOwnerCurrent2026(owner,epoch)) return;
      const parsed=parseCrewOutings2026(res.data);
      if (res.error || !parsed) { setFailure(res.data?.reason ?? 'unavailable');setData(null); }
      else {setData(parsed);setDataOwner(owner);}
    } catch {if(tick===request.current&&isResultOwnerCurrent2026(owner,epoch))setFailure('unavailable');}
    finally {if(tick===request.current&&ownerRef.current===owner&&isResultOwnerCurrent2026(owner,epoch))setLoading(false);}
  },[owner,session?.access_token]);
  useEffect(()=>{screen('crew_sortie');},[]);
  useEffect(()=>{setEditing(null);setFormOwner(null);setData(null);setCancelId(null);setNotice(null);setBusy(false);},[owner]);
  useFocusEffect(useCallback(()=>{void reload();return()=>{request.current++;};},[reload]));
  const current=dataOwner===owner?data:null;
  const activeEditing=formOwner===owner?editing:null;
  const begin=(item?:CrewOuting2026)=>{setFormOwner(owner);setDraft(outingDraft2026(item));setEditing(item??'new');setNotice(null);setCancelId(null);};
  async function mutate(name:string,params:Record<string,unknown>,success:string,created=false) {
    if (!owner || !supabase || busy || !session?.access_token) return;
    const epoch=resultOwnerEpoch2026();
    if (!isResultOwnerCurrent2026(owner,epoch)) return;
    setBusy(true);setNotice(null);
    try {
      const res=await supabase.rpc(name,params).setHeader('Authorization',`Bearer ${session.access_token}`);
      if (!isResultOwnerCurrent2026(owner,epoch)) return;
      if(res.error || res.data?.ok!==true){setNotice(reason(res.data?.reason??'unavailable'));if(res.data?.reason==='stale')setEditing(null);void reload();return;}
      if(created)track(EVENTS.crewOutingCreated,{activity:String(params.p_activity),objective:String(params.p_objective),hasZone:false,hasCapacity:params.p_capacity!==null});
      setNotice(success);setEditing(null);setCancelId(null);await reload();
    } catch {if(isResultOwnerCurrent2026(owner,epoch))setNotice(reason('unavailable'));}
    finally {if(isResultOwnerCurrent2026(owner,epoch))setBusy(false);}
  }
  function save() {
    if(!activeEditing)return;
    const checked=outingForm2026(draft,Date.now());
    if(!checked.ok){setNotice(reason(checked.reason));return;}
    if(activeEditing==='new')void mutate('crew_outing_create',{...checked.values,p_objective:'conquete',p_zone_label:null},copy('Sortie publiée. Les membres peuvent s’inscrire.','Outing published. Members can now join.'),true);
    else void mutate('crew_outing_change_2026',{...checked.values,p_event_id:activeEditing.id,p_revision:activeEditing.revision,p_cancelled:false},copy('Les informations de la sortie ont été mises à jour.','The outing information was updated.'));
  }
  function cancel(item:CrewOuting2026){void mutate('crew_outing_change_2026',{p_event_id:item.id,p_revision:item.revision,p_title:item.title,p_starts_at:item.startsAt,p_activity:item.activity,p_place_label:item.placeLabel,p_capacity:item.capacity,p_cancelled:true},copy('Sortie annulée. Les inscriptions ont été retirées.','Outing cancelled. Registrations were removed.'));}
  const patch=(values:Partial<CrewOutingDraft2026>)=>setDraft(prev=>({...prev,...values}));
  async function addToCalendar(id: string) {
    if (!owner || !supabase || !session?.access_token || exporting.current) return;
    const epoch=resultOwnerEpoch2026();
    const focusGeneration=request.current;
    const stillCurrent=()=>isResultOwnerCurrent2026(owner,epoch)&&request.current===focusGeneration;
    if (!stillCurrent()) return;
    exporting.current=true;setCalendarBusy(true);setNotice(null);
    try {
      // Re-read before export so a cancelled or withdrawn RSVP cannot use a stale card.
      const res=await supabase.rpc('crew_outings_2026').setHeader('Authorization',`Bearer ${session.access_token}`);
      if (!stillCurrent()) return;
      const latest=res.error?null:parseCrewOutings2026(res.data);
      const item=latest?.items.find(value=>value.id===id);
      const content=item?crewOutingCalendar2026(item,Date.now(),fr):null;
      if (!content) {setNotice(copy('Vérifie la sortie et ton inscription avant de l’exporter.','Check the outing and your registration before exporting.'));void reload();return;}
      const result=await exportCrewCalendar2026(content,stillCurrent);
      if (!stillCurrent() || result==='stale') return;
      setNotice(result==='prepared'
        ? copy('Fichier calendrier prêt. Les changements de sortie restent à vérifier dans GRYD.','Calendar file prepared. Check GRYD for changes to the outing.')
        : copy('L’export calendrier n’est pas disponible sur cet appareil.','Calendar export is unavailable on this device.'));
    } catch {if(stillCurrent())setNotice(copy('Le calendrier n’a pas pu être préparé. Réessaie.','The calendar file could not be prepared. Try again.'));}
    finally {exporting.current=false;setCalendarBusy(false);}
  }
  const dateLabel=(date:string)=>new Date(date).toLocaleString(locale,{weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const title=activeEditing==='new'?copy('Proposer une sortie','Plan an outing'):activeEditing?copy('Modifier la sortie','Edit outing'):copy('Sorties du crew','Crew outings');
  return <ProfilePage title={title} back backHref="/crew">
    {!owner ? <AccountDoor2026 reason={copy('Les sorties proposées par ton crew sont rattachées à ton compte.','The outings your crew plans are attached to your account.')} /> : activeEditing ? <View style={local.form}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setEditing(null);setNotice(null);}} style={local.link}><Text style={s.linkAction}>{copy('Retour aux sorties','Back to outings')}</Text></Pressable>
      <Text style={s.meta}>{copy('Visible par les membres de ton crew. Horaires dans le fuseau de cet appareil.','Visible to your crew members. Times use this device’s time zone.')}</Text>
      <Text style={s.linkTitle}>{copy('Titre','Title')}</Text><TextInput accessibilityLabel={copy('Titre de la sortie','Outing title')} value={draft.title} onChangeText={title=>patch({title})} maxLength={CREW_OUTING_TITLE_MAX} placeholder={copy('Sortie du canal','Canal outing')} placeholderTextColor={c.darkMuted} style={s.input} />
      <ProfileSegments value={draft.activity} onChange={activity=>patch({activity})} options={[{key:'run',label:copy('Course','Run')},{key:'bike',label:copy('Vélo','Ride')}]} />
      <Text style={s.linkTitle}>{copy('Quand ?','When?')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.days}>{Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);const iso=localDate2026(d);return <Pressable key={iso} accessibilityRole="radio" accessibilityState={{checked:draft.date===iso}} aria-checked={draft.date===iso} onPress={()=>patch({date:iso})} style={[local.day,draft.date===iso&&local.selectedDay]}><Text style={s.meta}>{d.toLocaleDateString(locale,{weekday:'short'})}</Text><Text style={s.body}>{d.getDate()}</Text></Pressable>;})}</ScrollView>
      <View style={local.fields}><View style={s.flex}><Text style={s.meta}>{copy('Date · AAAA-MM-JJ','Date · YYYY-MM-DD')}</Text><TextInput accessibilityLabel={copy('Date de la sortie','Outing date')} value={draft.date} onChangeText={date=>patch({date})} autoCorrect={false} maxLength={10} style={s.input} /></View><View style={local.hour}><Text style={s.meta}>{copy('Heure · HH:MM','Time · HH:MM')}</Text><TextInput accessibilityLabel={copy('Heure de départ','Start time')} value={draft.time} onChangeText={time=>patch({time})} autoCorrect={false} maxLength={5} style={s.input} /></View></View>
      <Text style={s.linkTitle}>{copy('Rendez-vous','Meeting point')}</Text><TextInput accessibilityLabel={copy('Lieu public de rendez-vous','Public meeting point')} value={draft.placeLabel} onChangeText={placeLabel=>patch({placeLabel})} maxLength={CREW_OUTING_PLACE_LABEL_MAX} placeholder={copy('Entrée du parc, côté canal','Park entrance, canal side')} placeholderTextColor={c.darkMuted} style={s.input} />
      <Text style={s.meta}>{copy('Un lieu public facile à reconnaître, sans adresse personnelle.','An easy-to-find public place, without a private address.')}</Text>
      <Text style={s.linkTitle}>{copy('Nombre de places · facultatif','Number of places · optional')}</Text><TextInput accessibilityLabel={copy('Nombre de places','Number of places')} value={draft.capacity} onChangeText={capacity=>patch({capacity})} keyboardType="number-pad" placeholder={copy('Sans limite','No limit')} placeholderTextColor={c.darkMuted} style={s.input} />
      {notice?<Text accessibilityRole="alert" style={s.body}>{notice}</Text>:null}
      <View style={local.compact}><ProfileButton label={activeEditing==='new'?copy('Publier la sortie','Publish outing'):copy('Enregistrer','Save changes')} busy={busy} onPress={save}/></View>
    </View> : <>
      <View style={local.heading}><Text style={local.title}>{copy('On se retrouve où ?','Where shall we meet?')}</Text>{current?.canCreate?<Pressable accessibilityRole="button" accessibilityLabel={copy('Proposer une sortie','Plan an outing')} style={local.add} onPress={()=>begin()}><GrydIcon name="plus" size={22} color={c.ink}/></Pressable>:null}</View>
      <ProfileSegments value={sport} onChange={setSport} options={[{key:'all',label:copy('Tout','All')},{key:'run',label:copy('Course','Run')},{key:'bike',label:copy('Vélo','Ride')}]} />
      {loading&&!current?<View style={s.state}><ActivityIndicator color={c.darkInk}/><Text style={s.meta}>{copy('Lecture des rendez-vous…','Loading outings…')}</Text></View>:failure?<View style={s.state}><Text style={s.body}>{failure==='no_crew'?reason(failure):copy('Les rendez-vous sont momentanément indisponibles.','Outings are currently unavailable.')}</Text><View style={local.compact}><ProfileButton label={failure==='no_crew'?copy('Trouver un crew','Find a crew'):copy('Réessayer','Try again')} secondary onPress={()=>failure==='no_crew'?router.push('/crew'):void reload()}/></View></View>:current?.items.filter(item=>sport==='all'||item.activity===sport).length===0?<View style={s.state}><Text style={s.title}>{copy('La prochaine sortie commence ici.','Your next outing starts here.')}</Text><Text style={s.body}>{copy('Un lieu, une heure et le plaisir de se retrouver.','A place, a time and a reason to get together.')}</Text>{current.canCreate?<View style={local.compact}><ProfileButton label={copy('Proposer une sortie','Plan an outing')} onPress={()=>begin()}/></View>:null}</View>:current?.items.filter(item=>sport==='all'||item.activity===sport).map(item=>{
        const started=Date.parse(item.startsAt)<=Date.now(), full=item.capacity!==null&&item.goingCount>=item.capacity;
        return <View key={item.id} style={local.outing}>
          <View style={local.type}><GrydIcon name={item.activity} size={18} color={c.darkMuted}/><Text style={s.meta}>{item.activity==='run'?copy('Course','Run'):copy('Vélo','Ride')}{item.cancelled?copy(' · Annulée',' · Cancelled'):started?copy(' · Commencée',' · Started'):''}</Text></View>
          <Text style={local.outingTitle}>{item.title}</Text><Text style={s.body}>{dateLabel(item.startsAt)}</Text><View style={local.place}><GrydIcon name="pin" size={16} color={c.darkMuted}/><Text style={[s.meta,s.flex]}>{item.placeLabel}</Text></View>
          {item.hostName?<Text style={s.meta}>{copy('Avec ','With ')}{item.hostName}</Text>:null}
          <View style={local.attend}><Text style={s.meta}>{item.goingCount}{item.capacity!==null?` / ${item.capacity}`:''} {copy(item.goingCount===1?'inscrit':'inscrits',item.goingCount===1?'attendee':'attendees')}{item.joined?copy(' · Tu participes',' · You’re going'):''}</Text>
            {!item.cancelled&&(!started||item.joined)?<Pressable accessibilityRole="button" disabled={busy||(!item.joined&&full)} onPress={()=>void mutate('crew_outing_rsvp_2026',{p_event_id:item.id,p_joined:!item.joined},item.joined?copy('Inscription retirée.','Registration removed.'):copy('Tu es inscrit à cette sortie.','You’re registered for this outing.'))} style={[local.join,item.joined&&local.joined]}><Text style={local.joinText}>{item.joined?copy('Me retirer','Withdraw'):full?copy('Complet','Full'):copy('Je participe','Join outing')}</Text></Pressable>:null}
          </View>
          {item.joined&&!item.cancelled&&!started?<Pressable accessibilityRole="button" accessibilityState={{disabled:calendarBusy}} disabled={calendarBusy} onPress={()=>void addToCalendar(item.id)} style={local.calendar}><GrydIcon name="calendar" size={17} color={c.darkInk}/><Text style={s.linkAction}>{calendarBusy?copy('Préparation…','Preparing…'):copy('Exporter vers mon calendrier','Export to my calendar')}</Text></Pressable>:null}
          {item.canManage?<View style={local.manage}><Pressable accessibilityRole="button" disabled={busy} onPress={()=>begin(item)} style={local.link}><Text style={s.linkAction}>{copy('Modifier','Edit')}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={()=>setCancelId(item.id)} style={local.link}><Text style={s.linkAction}>{copy('Annuler la sortie','Cancel outing')}</Text></Pressable></View>:null}
          {cancelId===item.id?<View style={local.confirm}><Text style={s.body}>{copy('Annuler ce rendez-vous pour tous les inscrits ?','Cancel this outing for everyone registered?')}</Text><View style={local.manage}><ProfileButton label={copy('Confirmer l’annulation','Confirm cancellation')} secondary busy={busy} onPress={()=>cancel(item)}/><Pressable accessibilityRole="button" onPress={()=>setCancelId(null)} style={local.link}><Text style={s.linkAction}>{copy('Garder','Keep')}</Text></Pressable></View></View>:null}
        </View>;
      })}
      {notice?<Text accessibilityRole="alert" style={local.notice}>{notice}</Text>:null}
    </>}
  </ProfilePage>;
}
const local=StyleSheet.create({
  calendar:{flexDirection:'row',alignItems:'center',gap:8,minHeight:44,alignSelf:'flex-start'},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingVertical:20},title:{flex:1,fontFamily:fonts.displayRegular,fontSize:23,lineHeight:28,color:c.darkInk},add:{width:44,height:44,borderRadius:22,backgroundColor:c.accent,alignItems:'center',justifyContent:'center'},
  form:{gap:13,paddingTop:12},compact:{alignSelf:'flex-start',marginVertical:10},fields:{flexDirection:'row',gap:12},hour:{width:110,gap:4},days:{gap:7},day:{width:54,minHeight:58,alignItems:'center',justifyContent:'center',gap:5,borderRadius:14,borderWidth:1,borderColor:c.darkSurfaceMuted},selectedDay:{backgroundColor:c.darkSurface,borderColor:c.darkInk},
  outing:{paddingVertical:20,gap:9,borderBottomWidth:1,borderColor:c.darkSurfaceMuted},type:{flexDirection:'row',gap:7,alignItems:'center'},outingTitle:{fontFamily:fonts.displayRegular,fontSize:22,lineHeight:28,color:c.darkInk},place:{flexDirection:'row',gap:7,alignItems:'center'},attend:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:10,paddingTop:6},join:{minHeight:44,paddingHorizontal:16,borderRadius:22,backgroundColor:c.surface,justifyContent:'center'},joined:{backgroundColor:c.darkMuted},joinText:{fontFamily:fonts.textMedium,fontSize:13,color:c.ink},link:{minHeight:44,justifyContent:'center'},manage:{flexDirection:'row',flexWrap:'wrap',gap:18},confirm:{gap:10,padding:14,backgroundColor:c.darkSurface,borderRadius:16},notice:{fontFamily:fonts.text,fontSize:14,lineHeight:21,color:c.darkInk,paddingVertical:16},
});
