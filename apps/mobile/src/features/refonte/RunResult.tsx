import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c, DEFAULT_ACTIVITY, type IngestRunResponse } from '@klaim/shared';
import { useLocale } from '../../i18n/store';
import { EVENTS, track } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { getFinishedActivity2026, resolveResultActivity2026 } from '../run/finishedActivity2026';
import { useResultOwner2026 } from '../run/useResultOwner2026';
import { isResultOwnerCurrent2026 } from '../run/resultOwner2026';
import { liveRateDisplay } from '../run/gps/liveRate';
import { setShareRun, shareCardFromResult, type ShareRunData } from '../share/shareRun';
import { QuickShareSheet2026 } from '../share/QuickShareSheet2026';
import { UNJUDGED_VERDICT } from '../share/narrative';
import { useLocalActivities2026 } from './localActivities';
import { GrydIcon } from '../../ui/gryd';
import { TranslucentBackdrop2026 } from '../../ui/gryd/TranslucentBackdrop2026';
import { SocialPublicationAction2026 } from '../social/SocialPublicationAction2026';
import { CrewCrest } from '../../ui/game/CrewCrest';
import { crewEmblemSeed, isCrewEmblem } from '../crew/crewEmblem';
import { crewRunImpactLine2026 } from '../crew/crewRunImpact2026';
import { useCrewRunImpact2026 } from '../crew/crewRunImpactData2026';
import { captureAreaLabel2026, captureAreaParts2026, captureExplanation2026, remainingCaptureArea2026, type CaptureReceipt2026, type RunReceipt2026 } from './captureReceipt2026';
import { RealMap, type RealMapBounds, type RealMapGeoJSONLayer } from '../../ui/game/RealMap';
import { VerifiedRunProgressMoment2026 } from './ProgressAchievementMoment2026';
import { RunAnalysisBlocks2026 } from '../journal/RunAnalysisBlocks2026';
import { parseTracePoints2026 } from '../journal/traceRead';
import { elevationFrom, type JournalPoint } from '../journal/metrics';

type ResultParams2026 = { dist?: string; dur?: string; activity?: string; queued?: string; localId?: string };
const clock = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n) % 60).padStart(2, '0')}`;
export default function RunResult() {
  const params = useLocalSearchParams<ResultParams2026>();
  const { ownerId, epoch } = useResultOwner2026();
  return <OwnedRunResult key={`${epoch}:${params.localId ?? 'latest'}`} params={params} ownerId={ownerId} ownerEpoch={epoch} />;
}
function OwnedRunResult({ params, ownerId, ownerEpoch }: { params: ResultParams2026; ownerId: string | null | undefined; ownerEpoch: number }) {
  const { activities, loading } = useLocalActivities2026();
  const evidence = resolveResultActivity2026({ ownerId, localId: params.localId, activities, finished: getFinishedActivity2026(ownerId, params.localId) });
  const local = evidence?.activity ?? null;
  const [refreshed, setRefreshed] = useState<{ clientRunId: string; result: IngestRunResponse } | null>(null);
  const result = refreshed && local && refreshed.clientRunId === local.clientRunId ? refreshed.result : local?.result ?? null;
  const [details, setDetails] = useState(false);
  /** La sortie ARMÉE dont la feuille courte est ouverte. `null` = fermée. */
  const [sharing, setSharing] = useState<ShareRunData | null>(null);
  // 'unavailable' : il n'y a PAS de lecture en cours et il n'y en aura pas —
  // pas de backend, pas de session, ou cette sortie n'appartient pas au compte
  // connecté. Sans cet état, l'écran affichait « Vérification du terrain… »
  // pour toujours : un spinner textuel infini, interdit (L8).
  const [captureRead, setCaptureRead] = useState<'idle' | 'loading' | 'ready' | 'failed' | 'unavailable'>('idle');
  const { session, configured } = useSession();
  const fr = useLocale() === 'fr';
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const text = (a: string, b: string) => fr ? a : b;
  useEffect(() => { track(EVENTS.celebrationViewed, { ruleset: '2026.1' }); }, []);
  useEffect(() => {
    if (!result?.territory2026) return;
    if (!supabase || !session || !local || session.user.id !== ownerId) { setCaptureRead('unavailable'); return; }
    const runId = result.runId;
    let alive = true; setCaptureRead('loading');
    const refresh = () => { void Promise.resolve(supabase!.rpc('capture_result_2026', { p_run_id: runId })).then(({ data, error }) => {
      if (!alive || !isResultOwnerCurrent2026(ownerId, ownerEpoch)) return;
      if (!error && data?.ruleset === '2026.1') {
        setRefreshed({ clientRunId: local.clientRunId, result: { ...result, territory2026: data } }); setCaptureRead('ready');
      } else setCaptureRead('failed');
    }).catch(() => { if (alive && isResultOwnerCurrent2026(ownerId, ownerEpoch)) setCaptureRead('failed'); }); };
    refresh();
    if (result.territory2026.status !== 'scheduled') return () => { alive = false; };
    const timer = setInterval(refresh, 30_000);
    return () => { alive = false; clearInterval(timer); };
  }, [result?.runId, result?.territory2026?.status, session?.user.id, local?.clientRunId, ownerId, ownerEpoch]);
  const activity = local?.activity ?? DEFAULT_ACTIVITY;
  const distance = local ? result?.distanceM ?? local.distanceM : null;
  const duration = local ? result?.durationS ?? local.durationS : null;
  const segments = local?.traceSegments ?? [];
  /**
   * LA TRACE ANALYSABLE — les mêmes blocs que le détail d'une sortie archivée
   * (`/course/[id]`), donc la même grammaire d'un écran à l'autre.
   *
   * DEUX SOURCES, ET L'ORDRE COMPTE :
   *  · `uploadPayload.points` — les points tels que l'enregistreur les a
   *    mesurés, HORODATÉS (`tracker.buildPayload()`). C'est la seule source qui
   *    permette des splits et une courbe ;
   *  · `traceSegments` — la géométrie seule, conservée pour l'affichage. Sans
   *    temps, l'analyse ne s'affiche pas et l'écran DIT pourquoi (il n'étale
   *    surtout pas l'allure moyenne sur des kilomètres jamais chronométrés).
   * Ces points ne quittent pas l'appareil : le partage passe, lui, par le
   * studio, qui applique sa protection de vie privée avant toute image.
   */
  const analysisPoints = useMemo<readonly JournalPoint[]>(() => {
    const recorded = local?.uploadPayload?.points;
    const timed = Array.isArray(recorded) ? parseTracePoints2026(recorded) : [];
    if (timed.length >= 2) return timed;
    return segments.flat();
  }, [local?.uploadPayload, segments]);
  /**
   * LE RELIEF DE CETTE SORTIE, s'il a été mesuré. `elevationFrom` rend
   * `available: false` dès que la trace ne porte pas d'altitude — c'est le cas
   * de toutes les sorties archivées avant `RunPoint.alt` (10/09/2026). L'affiche
   * de partage n'invente alors aucune ligne de dénivelé.
   */
  const elevation = useMemo(() => elevationFrom(analysisPoints, activity), [analysisPoints, activity]);
  const map = useMemo(() => {
    const points = segments.flat();
    if (points.length === 0) return null;
    const lngs = points.map(point => point.lng); const lats = points.map(point => point.lat);
    const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
    const lngPad = Math.max((maxLng - minLng) * 0.12, 0.0006);
    const latPad = Math.max((maxLat - minLat) * 0.12, 0.0006);
    const bounds: RealMapBounds = { sw: [minLng - lngPad, minLat - latPad], ne: [maxLng + lngPad, maxLat + latPad], paddingPx: 64 };
    // Separate features preserve every pause and signal break in the recorded outing.
    const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: segments.filter(segment => segment.length > 1).map((segment, index) => ({ type: 'Feature', id: index, properties: {}, geometry: { type: 'LineString', coordinates: segment.map(point => [point.lng, point.lat]) } })) };
    const layers: RealMapGeoJSONLayer[] = [
      { id: 'result-route-casing', data, lineColor: c.carbon, lineWidth: 7, lineWidthStops: [[10, 4], [14, 5], [18, 8]] },
      { id: 'result-route-core', data, lineColor: c.accent, lineWidth: 4, lineWidthStops: [[10, 2], [14, 3], [18, 5]] },
    ];
    return { bounds, layers, first: points[0]! };
  }, [segments]);
  const rate = liveRateDisplay(activity, distance && duration ? duration / (distance / 1000) : 0, fr ? ',' : '.');
  const territory = result?.territory2026 as CaptureReceipt2026 | undefined;
  const explanation = captureExplanation2026(territory, fr);
  const remainingArea = captureRead === 'ready' ? remainingCaptureArea2026(territory) : null;
  const gain = territory?.status === 'published' ? territory.newTerrainM2 : null;
  // Surface RÉELLE avec son unité (m² sous 0,01 km²) : « +0 km² » annonçait un
  // gain existant comme un zéro nu. `null` quand ce n'est pas une surface —
  // l'appelant affiche alors un tiret, jamais un chiffre inventé.
  const area = (n: number | null | undefined) => captureAreaLabel2026(n, fr);
  const gainParts = captureAreaParts2026(gain, fr);
  const km = distance === null ? '—' : (distance / 1000).toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const canShare = evidence !== null && ownerId !== undefined && distance !== null && duration !== null;
  /**
   * LA CAPTURE EST PUBLIÉE — le seul fait qui autorise à annoncer un gain de
   * terrain. `result.status` valait `'valid'` pour TOUTE sortie ingérée (le
   * serveur l'écrit en dur) : ce n'était pas une garde, c'était une constante.
   */
  const capturePublished = territory?.status === 'published';
  /**
   * LA PROGRESSION SPORTIVE EST CONFIRMÉE. Elle est INDÉPENDANTE du terrain
   * (§5.5 règle 8 : « un échec géographique ne bloque pas les XP sportifs ») :
   * la gater sur la capture priverait de ses XP une sortie honnête sans boucle.
   * Le serveur la confirme séparément ; on lit ce fait, tolérant à son absence.
   */
  const progressionConfirmed = (result as RunReceipt2026 | null)?.progression2026?.status === 'confirmed';
  /** La sortie est chez le serveur, sous ce compte, et n'attend plus son envoi. */
  const serverHeld = canShare && !!result?.runId && local?.pending !== true && typeof ownerId === 'string' && session?.user.id === ownerId && isResultOwnerCurrent2026(ownerId, ownerEpoch);
  const canPublish = serverHeld;
  /*
   * POUR TON CREW (cahier §13.4, migration 0182). Trois faits SERVEUR, aucun
   * calcul : le crew actuel, la capture publiée ou non, le partage volontaire,
   * et la journée comptée dans un défi en cours.
   *
   * ⚠️ AUCUNE SURFACE DE CREW N'EST AFFICHÉE ICI, et ce n'est pas un oubli :
   * 0126 pose que le titre territorial est INDIVIDUEL. Le « combien » de cette
   * sortie est juste au-dessus (`capture_result_2026`) ; le redire au nom du
   * crew fabriquerait une propriété collective qui n'existe pas.
   *
   * La lecture ne part QUE si la sortie est chez le serveur sous ce compte :
   * une sortie invitée ou en attente d'envoi n'a rien à demander (et le
   * demander quand même serait un aller-retour au pire moment).
   */
  const { impact: crewImpact } = useCrewRunImpact2026(serverHeld && result?.runId ? result.runId : null);
  /** Sortie enregistrée SANS COMPTE : rien n'est capturé, et on le dit (§9.2). */
  const guestRecording = ownerId === null && evidence !== null;
  /**
   * ARMER LA SORTIE À PARTAGER. Rend la donnée armée, ou `null` si l'armement a
   * été refusé (propriétaire changé, sortie d'un autre compte) — auquel cas
   * aucune feuille ne s'ouvre : on n'affiche jamais l'affiche de quelqu'un
   * d'autre.
   */
  const armShare = (): ShareRunData | null => {
    if (!canShare || !local || ownerId === undefined || !isResultOwnerCurrent2026(ownerId, ownerEpoch)) return null;
    const data: ShareRunData = {
      card: shareCardFromResult({ activity, distanceKm: km, clockLabel: clock(duration!), paceLabel: rate.measured ? rate.value : '', trace: segments.flat(),
        surfaceValue: capturePublished ? gainParts?.value ?? '' : '', surfaceUnit: capturePublished ? gainParts?.unit ?? '' : '', verified: false }),
      // Le reçu tel que le serveur l'a rendu : `territory` est la MÊME valeur,
      // vue par un type volontairement ouvert aux statuts que ce client ne
      // connaît pas encore (captureReceipt2026). La carte de partage, elle,
      // consomme le contrat partagé.
      traceSegments: segments, territory2026: result?.territory2026, intention: null, mode: 'conquete',
      // Le CONTEXTE de l'affiche : la date du départ telle que l'archive locale
      // l'a écrite, et le dénivelé s'il a été RÉELLEMENT mesuré (`available`).
      // Aucune commune : l'app ne la connaît pas pour une sortie, et un
      // géocodage inverse du point de départ pour décorer une image serait
      // exactement ce que le masquage des extrémités cherche à éviter.
      startedAt: local.startedAt ?? null,
      elevationGainM: elevation.available ? elevation.gainM : null,
      // « Crédité » veut dire : le terrain a RÉELLEMENT changé de mains, donc la
      // capture est publiée. `result.status === 'valid'` le disait de toute
      // sortie ingérée — une affiche de victoire pour une boucle refusée.
      verdict: { ...UNJUDGED_VERDICT, judged: !!result, credited: capturePublished, loopClosed: result?.loopClosed === true },
    };
    return setShareRun(data, { ownerId, clientRunId: local.clientRunId }) ? data : null;
  };
  /**
   * LE GESTE COURT (10/09/2026, demande fondateur « partager facilement »). Le
   * bouton n'emmène plus sur l'écran Studio : il ouvre la feuille ici même,
   * avec l'affiche déjà rendue. Le Studio reste entier, derrière « Plus
   * d'options », et lit la MÊME sortie armée.
   */
  const share = () => { const armed = armShare(); if (armed) setSharing(armed); };
  const openStudio = () => { setSharing(null); router.push('/partage'); };
  return <View style={s.root}><ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
    <View style={[s.hero, { height: Math.max(260, Math.min(440, height * 0.5)) }]}>
      {map ? <RealMap key={local?.clientRunId} bounds={map.bounds} geojsonLayers={map.layers} basemap="dark" style={StyleSheet.absoluteFill} markers={[{ id: 'result-start', ...map.first, children: <View style={s.startPoint} /> }]} /> : <View style={s.emptyTrace}><GrydIcon name="route" size={26} color={c.darkMuted} /><Text style={s.emptyText}>{params.localId && loading ? text('Lecture de la sortie…', 'Loading outing…') : text('La trace n’est pas disponible sur cet appareil.', 'The route is not available on this device.')}</Text></View>}
      <View style={[s.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.titlePlate}><TranslucentBackdrop2026 tone="dark" radius={14} /><Text style={[s.title, s.overlayContent]}>{text('Récapitulatif', 'Outing summary')}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={text('Retour au journal', 'Back to journal')} style={s.close} onPress={() => router.replace('/(tabs)/profil')}><TranslucentBackdrop2026 tone="dark" radius={22} /><View style={s.overlayContent}><GrydIcon name="close" size={21} color={c.darkInk} /></View></Pressable>
      </View>
      <View style={s.heroFooter} pointerEvents="none"><TranslucentBackdrop2026 tone="dark" radius={10} /><View style={s.overlayContent}><GrydIcon name={activity === 'run' ? 'run' : 'bike'} size={17} color={c.darkInk} /></View><Text style={[s.heroMark, s.overlayContent]}>{evidence ? (activity === 'run' ? text('Course à pied', 'Running') : text('Sortie vélo', 'Cycling')) : text('Aucune sortie', 'No activity')}</Text></View>
    </View>
    <View style={s.content}>
    {serverHeld && progressionConfirmed && <VerifiedRunProgressMoment2026 key={result!.runId} />}
    <View style={s.metrics}>
      <Metric value={km} label={text('Distance · km', 'Distance · km')} />
      <Metric value={duration === null ? '—' : clock(duration)} label={text('Durée', 'Duration')} />
      <Metric value={rate.value} label={activity === 'run' ? text('Allure · /km', 'Pace · /km') : text('Vitesse · km/h', 'Speed · km/h')} />
    </View>
    {/* L'ANALYSE SPORTIVE, exactement comme dans le détail d'une sortie
        archivée : temps en mouvement, splits au km, courbe d'allure, et le
        relief le jour où une source d'altitude existera. */}
    {analysisPoints.length >= 2 && <View style={s.analysis}>
      <RunAnalysisBlocks2026 activity={activity} points={analysisPoints} tone="light" testID="run-result-analysis" />
    </View>}
    {guestRecording && <View style={s.guest}>
      <Text style={s.impactTitle}>{text('Sans compte, cette sortie reste sur cet appareil', 'Without an account this outing stays on this device')}</Text>
      <Text style={s.body}>{text('Elle ne prend aucun terrain et n’apparaît sur aucune carte partagée. Ses mesures, elles, sont bien enregistrées ici.', 'It takes no terrain and appears on no shared map. Its measurements are saved here.')}</Text>
      {configured && <Pressable accessibilityRole="button" style={s.detailsButton} onPress={() => router.push('/sign-in')}>
        <Text style={s.detailsLabel}>{text('Créer un compte pour garder mes sorties', 'Create an account to keep my outings')}</Text>
        <GrydIcon name="chevronRight" size={16} color={c.muted} />
      </Pressable>}
    </View>}
    <View style={s.impact}>
      <GrydIcon name={capturePublished && gain && gain > 0 ? "loop" : "route"} size={23} color={c.ink} />
      <View style={{ flex: 1 }}>
        <Text style={s.impactTitle}>{explanation?.title ?? (gain !== null && gain !== undefined && gain > 0 && area(gain) !== null ? `+${area(gain)} ${text('à cette capture', 'at this capture')}` : canShare ? evidence?.archiveSaved ? text('Sortie enregistrée', 'Outing saved') : text('Sortie à archiver', 'Outing awaiting archive') : text('Aucune sortie sélectionnée', 'No outing selected'))}</Text>
        <Text style={s.body}>{explanation?.body ?? (!result && canShare ? (local?.pending ? text('Les statistiques sont disponibles. La synchronisation suivra.', 'Your statistics are available. Synchronisation will follow.') : evidence?.archiveSaved ? text('Ta sortie est conservée dans le journal de cet appareil.', 'Your outing is saved in this device’s journal.') : text('Les mesures sont conservées pour récupération. L’archive du journal n’a pas encore été écrite.', 'Measurements are retained for recovery. The journal archive has not been written yet.')) : !evidence ? text('Ouvre une sortie de ton journal pour consulter ses mesures.', 'Open a journal activity to see its measurements.') : text('Le gain de cette sortie et le terrain encore possédé sont deux mesures distinctes.', 'The gain from this activity and the terrain still controlled are separate measurements.'))}</Text>
        {territory?.status === 'scheduled' && territory.publishAfter && Number.isFinite(Date.parse(territory.publishAfter)) && <Text style={s.body}>{text('À partir du ', 'From ')}{new Date(territory.publishAfter).toLocaleString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>}

      </View>
    </View>
    {(territory?.status === 'published' || remainingArea !== null) && <View style={s.currentTerrain}>
      <Detail label={text('Surface publiée à la capture', 'Area published at capture')} value={area(territory?.publishedAreaM2) ?? '—'} />
      <Detail label={text('Encore possédé', 'Still controlled')} value={area(remainingArea) ?? '—'} />
      <Text style={s.body}>{captureRead === 'unavailable' ? text('L’état actuel du terrain se lit avec ton compte. Le résultat de cette sortie, lui, est conservé ici.', 'Current terrain requires your account. This activity’s result is kept here.') : captureRead === 'failed' || (captureRead === 'ready' && remainingArea === null) ? text('L’état actuel du terrain est indisponible. Le résultat historique reste conservé.', 'Current terrain is unavailable. The historical result is preserved.') : remainingArea === null ? text('Vérification du terrain actuel…', 'Checking current terrain…') : text('Les reprises modifient le terrain. Elles ne suppriment pas ta sortie.', 'Reclaims change terrain. They never delete your activity.')}</Text>
    </View>}
    {!!result?.xpAwarded && <Text style={s.progress}>+{result.xpAwarded} XP · {text('Progression', 'Progress')}</Text>}
    <View style={s.actions}>
      <Pressable accessibilityRole="button" style={s.journal} onPress={() => router.replace('/(tabs)/profil')}><Text style={s.detailsLabel}>{text('Journal', 'Journal')}</Text><GrydIcon name="chevronRight" size={16} color={c.muted} /></Pressable>
      {canShare && <Pressable accessibilityRole="button" onPress={share} style={s.primary}><GrydIcon name="share" size={18} color={c.ink} /><Text style={s.primaryText}>{text('Partager', 'Share')}</Text></Pressable>}
    </View>
    {/* CE QUE CETTE SORTIE A APPORTÉ AU CREW. Le bloc n'existe que si le
        serveur a répondu ET que ce compte a un crew : « je n'ai pas pu lire »
        et « tu n'as pas de crew » ne se peignent ni l'un ni l'autre en une
        carte vide sur un écran de fin de course. */}
    {crewImpact.kind === 'ready' && <View style={s.crewBlock}>
      <View style={s.crewHead}>
        {isCrewEmblem(crewImpact.facts.crewEmblem) ? <CrewCrest seed={crewEmblemSeed(crewImpact.facts.crewEmblem)} name={crewImpact.facts.crewName} size="s" /> : <GrydIcon name="crew" size={20} color={c.ink} />}
        <Text style={[s.impactTitle, { flex: 1, marginBottom: 0 }]}>{text('Pour ton crew', 'For your crew')}</Text>
      </View>
      <Text style={s.body}>{crewRunImpactLine2026(crewImpact.facts, fr)}</Text>
      {crewImpact.facts.sharedWithCrew && <Text style={s.body}>{text('Elle est déjà dans le fil du crew.', 'It is already in the crew feed.')}</Text>}
      <Pressable accessibilityRole="button" style={s.detailsButton} onPress={() => router.push('/(tabs)/crew')}>
        <Text style={s.detailsLabel}>{crewImpact.facts.crewName}</Text>
        <GrydIcon name="chevronRight" size={16} color={c.muted} />
      </Pressable>
    </View>}
    {canPublish && result && <SocialPublicationAction2026 runId={result.runId} activity={activity} surface="light" />}
    {evidence && <Pressable accessibilityRole="button" style={s.detailsButton} onPress={() => setDetails(value => !value)} accessibilityState={{ expanded: details }} aria-expanded={details}><Text style={s.detailsLabel}>{details ? text('Fermer les détails', 'Close details') : text('Détails de la sortie', 'Outing details')}</Text><GrydIcon name={details ? 'minus' : 'plus'} size={18} color={c.ink} /></Pressable>}
    {details && <View style={s.details}>
      <Text style={s.body}>{text('La surface d’une boucle et le nouveau terrain sont deux mesures différentes. Seule la partie réellement gagnée est affichée comme un gain.', 'Loop area and new terrain are different measurements. Only genuinely gained terrain is shown as a gain.')}</Text>
      {territory && <><Detail label={text('Surface de la boucle', 'Loop area')} value={area(territory.loopAreaM2) ?? '—'} /><Detail label={text('Nouveau terrain', 'New terrain')} value={gain == null ? (territory.status === 'private' ? text('Personnel', 'Personal') : territory.status === 'no_loop' ? '—' : text('En attente', 'Pending')) : area(gain) ?? '—'} /><Detail label={text('Déjà possédé', 'Already owned')} value={area(territory.alreadyOwnedM2) ?? '—'} /></>}
      <Pressable accessibilityRole="button" style={s.detailsButton} onPress={() => router.push('/support')}><Text style={s.detailsLabel}>{text('Demander de l’aide pour cette sortie', 'Get help with this outing')} →</Text></Pressable>
    </View>}
    </View>
  </ScrollView>
  {/* LA FEUILLE COURTE — montée seulement quand une sortie est ARMÉE, pour que
      son étage d'export hors écran n'existe pas en permanence sous l'écran. */}
  {sharing && <QuickShareSheet2026 run={sharing} visible onClose={() => setSharing(null)} onOpenStudio={openStudio} />}
  </View>;
}
function Metric({ value, label }: { value: string; label: string }) { return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={s.detailRow}><Text style={[s.body, s.detailLabel]}>{label}</Text><Text style={[s.detailsLabel, s.detailValue]}>{value}</Text></View>; }
const s = StyleSheet.create({
  overlayContent: { zIndex: 1 }, root: { flex: 1, backgroundColor: c.surface }, content: { paddingHorizontal: 20 },
  hero: { backgroundColor: c.carbon, overflow: 'hidden' }, header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, titlePlate: { minHeight: 44, borderRadius: 14, justifyContent: 'center', backgroundColor: 'transparent', paddingHorizontal: 14 }, title: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 27, letterSpacing: -0.5, color: c.darkInk }, close: { height: 44, width: 44, borderRadius: 22, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, startPoint: { width: 13, height: 13, borderRadius: 7, backgroundColor: c.surface, borderWidth: 3, borderColor: c.carbon }, heroFooter: { position: 'absolute', bottom: 28, left: 20, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'transparent', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, heroMark: { fontFamily: fonts.text, fontSize: 12, color: c.darkInk }, emptyTrace: { flex: 1, paddingHorizontal: 42, justifyContent: 'center', alignItems: 'center', gap: 12 }, emptyText: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, textAlign: 'center', color: c.darkMuted },
  metrics: { flexDirection: 'row', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }, metric: { flex: 1, gap: 5 }, metricValue: { fontFamily: fonts.displayMedium, fontSize: 27, lineHeight: 33, letterSpacing: -0.5, color: c.ink, fontVariant: ['tabular-nums'] }, metricLabel: { color: c.muted, fontFamily: fonts.text, fontSize: 12, lineHeight: 17 }, impact: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingTop: 18, paddingBottom: 16 }, impactTitle: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink, marginBottom: 5 }, body: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted }, progress: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 13, marginBottom: 16 },
  currentTerrain: { paddingBottom: 18, borderTopWidth: 1, borderTopColor: c.border },
  crewBlock: { paddingTop: 14, paddingBottom: 4, gap: 6, borderTopWidth: 1, borderTopColor: c.border }, crewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  analysis: { paddingTop: 20, paddingBottom: 4 },
  guest: { paddingTop: 18, gap: 6, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 6 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingBottom: 16 }, primary: { minHeight: 44, backgroundColor: c.accent, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 17, paddingVertical: 12 }, primaryText: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 14 }, journal: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center' }, detailsButton: { minHeight: 48, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.border }, detailsLabel: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.ink, flexShrink: 1 }, details: { paddingTop: 10 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingVertical: 12 }, detailLabel: { flex: 1 }, detailValue: { maxWidth: '50%', textAlign: 'right' },
});
