import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydMark } from '../../ui/gryd/GrydMark';
import type { LatLngPoint } from '../map/realAnchors';
import { PosterTrace } from './PosterTrace2026';
import { SHARE_EXPORT_FORMATS_2026, type buildShareFacts2026, type ShareFormat2026, type ShareTheme2026 } from './shareModel2026';
import type { StudioObject2026 } from './studioObjects2026';

export function CollectionIdentityArt2026({ kind, size, light = false }: {kind:'frame'|'emblem';size:number;light?:boolean}) {
  const ink=light?c.ink:c.darkInk;
  return <Svg width={size} height={size} viewBox="0 0 100 100">{kind==='frame'?<><Path d="M9 26V9h65M91 74v17H26M18 38V18h44M82 62v20H38" fill="none" stroke={ink} strokeWidth="2"/><Line x1="76" y1="9" x2="91" y2="24" stroke={ink} strokeWidth="5"/></>:<><Path d="M19 29h44l18 21-18 21H19l18-21z" fill="none" stroke={ink} strokeWidth="2"/><Path d="M40 29h22L44 50l18 21H40L22 50z" fill={ink}/><Circle cx="77" cy="25" r="3" fill={ink}/></>}</Svg>;
}

/** Exactly the same component is captured and previewed. No example activity is substituted. */
export function StudioObjectArtwork2026({ object, facts, segments = [], width, format = 'square', theme = 'dark', photoUri = null, locale='fr', onPhotoLoaded, onPhotoError }: {
  object: StudioObject2026; facts: ReturnType<typeof buildShareFacts2026> | null; segments?: readonly (readonly LatLngPoint[])[];
  width: number; format?: ShareFormat2026; theme?: ShareTheme2026; photoUri?:string|null; locale?:'fr'|'en';onPhotoLoaded?:()=>void;onPhotoError?:()=>void;
}) {
  const size=SHARE_EXPORT_FORMATS_2026[format], height=width*size.height/size.width, k=width/360;
  const light=theme==='light', ink=light?c.ink:c.darkInk, muted=light?c.muted:c.darkMuted, bg=light?c.surface:c.carbon;
  const transparent=object.layout==='sticker'; const photo=object.layout==='photo'&&photoUri!==null;
  const pad=26*k, safe=format==='story'?height*250/1920:24*k;
  const available=height-safe*2-64*k;
  const hasTrace=segments.some(s=>s.length>1);
  const text=(value:string|null|undefined,fontSize=12,color:string=ink)=>value?<Text allowFontScaling={false} style={{fontFamily:fonts.text,fontSize:fontSize*k,lineHeight:fontSize*1.25*k,color}}>{value}</Text>:null;
  const label=(value:string)=>text(value.toUpperCase(),8,muted);
  const distance=<View style={{gap:4*k}}>{label(facts?facts.sport:locale==='fr'?'Aperçu':'Preview')}{text(facts?.distance??object.name,object.layout==='title'?42:34)}</View>;
  const route=(w:number,h:number)=><View style={{width:w,height:Math.max(1,h),alignItems:'center',justifyContent:'center'}}>{hasTrace?<PosterTrace segments={segments} width={w} height={Math.max(1,h)} light={light||photo}/>:text(facts?(locale==='fr'?'Souvenir sans tracé':'Memory without a route'):(locale==='fr'?'Ta prochaine sortie':'Your next activity'),11,muted)}</View>;
  const factsRow=<View style={{flexDirection:'row',justifyContent:'space-between',gap:12*k,borderTopWidth:.5*k,borderColor:muted,paddingTop:10*k}}><View>{label(locale==='fr'?'DURÉE':'TIME')}{text(facts?.duration,16)}</View><View style={{alignItems:'flex-end'}}>{label(facts?.rateLabel??(locale==='fr'?'ÉDITION':'EDITION'))}{text(facts?.rate??object.edition,14)}</View></View>;
  const objectGlyph=<View style={{transform:[{rotate:object.premium?'45deg':'0deg'}]}}><CollectionIdentityArt2026 kind={object.layout==='frame'?'frame':'emblem'} size={Math.min(120*k,available*.52)} light={light}/></View>;
  const serial=String(object.design).padStart(2,'0');
  let body;
  switch(object.layout) {
    case 'badge': body=<View style={{flex:1,justifyContent:'space-evenly',alignItems:'center'}}><View style={{borderWidth:k,borderColor:ink,borderRadius:(object.premium?8:100)*k,width:180*k,height:(object.premium?154:180)*k,padding:22*k,justifyContent:'space-between',transform:[{rotate:object.premium?'-5deg':'0deg'}]}}>{label(object.name)}{route(132*k,70*k)}{text(facts?.distance??object.edition,16)}</View>{text(facts?.duration,14,muted)}</View>;break;
    case 'pattern': body=<View style={{flex:1,justifyContent:'space-between'}}><View style={{flexDirection:'row',justifyContent:'space-between'}}>{text(serial,20,muted)}{text(object.name,15)}</View><View style={{flex:1,justifyContent:'center'}}><Svg width={width-2*pad} height={Math.min(available*.48,170*k)} style={{position:'absolute'}}>{Array.from({length:object.design>=20?8:4},(_,i)=><Line key={i} x1={0} y1={(i+1)*17*k} x2={width-2*pad} y2={(i+1)*17*k} stroke={muted} strokeWidth={.4*k}/>)}</Svg>{route(width-2*pad,available*.5)}</View>{distance}{factsRow}</View>;break;
    case 'frame': body=<View style={{flex:1,borderWidth:(object.premium?2:1)*k,borderColor:ink,padding:(object.premium?23:14)*k,justifyContent:'space-between',borderLeftWidth:object.premium?8*k:k}}>{distance}{route(width-2*pad-28*k,available*.48)}{factsRow}</View>;break;
    case 'sticker': body=<View style={{flex:1,justifyContent:'center',gap:15*k}}><View style={{flexDirection:'row',alignItems:'center',gap:12*k}}>{route((width-2*pad)*.47,available*.55)}<View style={{flex:1}}>{distance}</View></View><View style={{height:2*k,backgroundColor:ink,width:42*k}}/>{text(object.edition,11)}</View>;break;
    case 'title': body=<View style={{flex:1,justifyContent:'space-between'}}><View><View style={{width:36*k,height:3*k,backgroundColor:ink,marginBottom:18*k}}/>{text(object.edition,28)}{text(object.name,15,muted)}</View>{route(width-2*pad,available*.25)}{distance}</View>;break;
    case 'photo': body=<View style={{flex:1,justifyContent:'space-between'}}><View style={{backgroundColor:bg,padding:12*k,alignSelf:'flex-start',maxWidth:'90%'}}>{text(object.edition,17)}{text(object.name,11,muted)}</View><View style={{backgroundColor:bg,padding:16*k}}>{distance}{factsRow}</View></View>;break;
    case 'emblem': body=<View style={{flex:1,alignItems:'center',justifyContent:'space-around'}}>{objectGlyph}{text(object.edition,20)}{distance}</View>;break;
    case 'recap': body=<View style={{flex:1,justifyContent:'space-between'}}>{text(locale==='fr'?'Le détail d’une sortie.':'One activity, in detail.',23)}{[['01',locale==='fr'?'Distance':'Distance',facts?.distance],['02',locale==='fr'?'Durée':'Time',facts?.duration],['03',facts?.rateLabel??(locale==='fr'?'Rythme':'Pace / speed'),facts?.rate]].map(([n,name,value])=><View key={n} style={{borderTopWidth:.5*k,borderColor:muted,paddingTop:9*k,flexDirection:'row',gap:12*k}}>{text(n,9,muted)}<View style={{flex:1}}>{label(name!)}{text(value,24)}</View></View>)}{route(width-2*pad,available*.19)}</View>;break;
    case 'final': body=<View style={{flex:1,justifyContent:'space-between'}}><View style={{flexDirection:'row',gap:15*k,alignItems:'flex-start'}}><View style={{width:3*k,height:80*k,backgroundColor:ink}}/><View style={{flex:1}}>{text(object.edition,28)}{text(object.name,12,muted)}</View></View>{route(width-2*pad,available*.43)}{distance}</View>;break;
    case 'memory': body=<View style={{flex:1,justifyContent:'space-between'}}>{text(locale==='fr'?'Une page de saison.':'A season page.',22)}<View style={{flexDirection:'row',gap:14*k,alignItems:'center'}}>{route((width-2*pad)*.48,available*.35)}<View style={{flex:1}}>{distance}</View></View><View style={{borderTopWidth:.5*k,borderBottomWidth:.5*k,borderColor:muted,paddingVertical:12*k}}>{text(object.edition,16)}{text(locale==='fr'?'Souvenir personnel d’une sortie':'A personal memory of one activity',10,muted)}</View>{factsRow}</View>;break;
    default: body=<View style={{flex:1,justifyContent:'space-between'}}>{distance}{route(width-2*pad,available*.56)}{factsRow}</View>;
  }
  if(object.request.kind==='commercial') {
    const id=object.request.designId;
    const panelWidth=width-2*pad;
    if(id==='contour_margin') body=<View style={{flex:1,flexDirection:'row',gap:16*k}}><View style={{width:34*k,borderRightWidth:.6*k,borderColor:muted,justifyContent:'space-between'}}>{text('02',21)}{text('C',28)}</View><View style={{flex:1,justifyContent:'space-between'}}>{text('CONTOUR',14)}{route(panelWidth-50*k,available*.60)}{distance}{factsRow}</View></View>;
    if(id==='contour_line') body=<View style={{flex:1,justifyContent:'space-between'}}>{text('Contour',29)}<View style={{borderTopWidth:2*k,borderBottomWidth:.6*k,borderColor:ink}}>{route(panelWidth,available*.53)}</View><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end'}}>{distance}{text('01',28,muted)}</View>{factsRow}</View>;
    if(id==='relief_column') body=<View style={{flex:1,flexDirection:'row',gap:18*k}}><View style={{width:35*k,borderLeftWidth:5*k,borderColor:ink,paddingLeft:7*k}}>{text('R',28)}{text('02',10,muted)}</View><View style={{flex:1,justifyContent:'space-between'}}>{route(panelWidth-53*k,available*.5)}{distance}<View>{label(locale==='fr'?'TEMPS DEHORS':'TIME OUTSIDE')}{text(facts?.duration,24)}</View></View></View>;
    if(id==='relief_window') body=<View style={{flex:1,justifyContent:'space-between'}}>{distance}<View style={{borderTopWidth:8*k,borderBottomWidth:8*k,borderColor:ink,paddingVertical:8*k}}>{route(panelWidth,available*.36)}</View>{factsRow}{text('RELIEF / 03',9,muted)}</View>;
    if(id==='relief_survey') body=<View style={{flex:1,justifyContent:'space-between'}}><View style={{flexDirection:'row',gap:12*k,alignItems:'center'}}>{route(panelWidth*.64,available*.54)}<View style={{flex:1,borderLeftWidth:.5*k,borderColor:muted,paddingLeft:12*k}}>{text('04',28)}{text('RELIEF',8,muted)}</View></View>{distance}{factsRow}</View>;
    if(id==='clubhouse_type') body=<View style={{flex:1,justifyContent:'space-between'}}><View>{text('CLUB',48)}{text('HOUSE',48)}<View style={{height:3*k,backgroundColor:ink,marginTop:9*k}}/></View>{route(panelWidth,available*.20)}{distance}{factsRow}</View>;
    if(id==='clubhouse_grid') body=<View style={{flex:1,justifyContent:'space-between'}}>{text(locale==='fr'?'UNE SORTIE':'ONE ACTIVITY',12)}<View style={{flexDirection:'row',borderTopWidth:k,borderBottomWidth:k,borderColor:ink}}><View style={{width:panelWidth*.54,borderRightWidth:k,borderColor:ink}}>{route(panelWidth*.54,available*.45)}</View><View style={{flex:1,padding:12*k,justifyContent:'space-between'}}>{label('DISTANCE')}{text(facts?.distance,23)}{label(locale==='fr'?'DURÉE':'TIME')}{text(facts?.duration,17)}</View></View>{text(object.edition,25)}{text(facts?.rate,15,muted)}</View>;
    if(id==='clubhouse_ticket') body=<View style={{flex:1,justifyContent:'center'}}><View style={{borderWidth:k,borderColor:ink,padding:16*k,gap:14*k}}><View style={{flexDirection:'row',justifyContent:'space-between'}}>{text('CLUBHOUSE',12)}{text('03',12)}</View>{route(panelWidth-32*k,available*.36)}<View style={{borderTopWidth:k,borderStyle:'dashed',borderColor:muted,paddingTop:16*k}}>{distance}</View>{factsRow}</View></View>;
    if(id==='clubhouse_photo') body=<View style={{flex:1,justifyContent:'space-between'}}><View style={{backgroundColor:bg,alignSelf:'flex-start',padding:12*k,borderLeftWidth:5*k,borderColor:ink}}>{text('CLUBHOUSE',17)}{text('04 / PHOTO',9,muted)}</View><View style={{backgroundColor:bg,padding:15*k}}>{distance}<View style={{height:.5*k,backgroundColor:muted,marginVertical:12*k}}/>{text(facts?.duration,20)}{text(facts?.rate,13,muted)}</View></View>;
    if(id==='clubhouse_report') body=<View style={{flex:1,justifyContent:'space-between'}}>{text(locale==='fr'?'LE COMPTE RENDU':'THE ACTIVITY REPORT',17)}{route(panelWidth,available*.46)}<View style={{flexDirection:'row',gap:12*k,borderTopWidth:3*k,borderColor:ink,paddingTop:14*k}}>{[[locale==='fr'?'DISTANCE':'DISTANCE',facts?.distance],[locale==='fr'?'DURÉE':'TIME',facts?.duration],[facts?.rateLabel,facts?.rate]].map(([name,value],i)=><View key={i} style={{flex:1,gap:8*k}}>{label(name??'—')}{text(value,14)}</View>)}</View>{text('CLUBHOUSE / 05',9,muted)}</View>;
    if(id==='clubhouse_diary') body=<View style={{flex:1,justifyContent:'space-between'}}><View style={{borderBottomWidth:.5*k,borderColor:muted,paddingBottom:12*k}}>{text(locale==='fr'?'À garder.':'For the memory.',30)}{text('CLUBHOUSE / 06',9,muted)}</View><View style={{flexDirection:'row',gap:15*k,alignItems:'center'}}><View style={{flex:1}}>{distance}{text(facts?.duration,16,muted)}</View>{route(panelWidth*.44,available*.42)}</View><View style={{borderTopWidth:.5*k,borderColor:muted,paddingTop:12*k}}>{text(locale==='fr'?'Une sortie. Un souvenir.':'One activity. One memory.',14)}</View></View>;
  }
  return <View collapsable={false} style={{width,height,backgroundColor:transparent?'transparent':bg,overflow:'hidden'}}>
    {photo?<Image source={{uri:photoUri!}} resizeMode="cover" style={StyleSheet.absoluteFill} onLoad={onPhotoLoaded} onError={onPhotoError}/>:null}
    <View style={{flex:1,paddingHorizontal:pad,paddingTop:safe,paddingBottom:safe,gap:16*k}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12*k,...(photo?{backgroundColor:bg,padding:8*k}:{})}}><GrydMark variant="wordmark" size={10*k} color={ink}/><View style={{flexShrink:1}}>{label(`${object.edition} / ${serial}`)}</View></View>
      {object.premium?<View style={{flexDirection:'row',gap:4*k}}>{[24,10,5].map((w,i)=><View key={i} style={{height:(i+1)*k,width:w*k,backgroundColor:ink}}/>)}</View>:null}
      {body}
    </View>
  </View>;
}
