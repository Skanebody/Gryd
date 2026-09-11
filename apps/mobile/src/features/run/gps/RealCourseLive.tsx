/**
 * GRYD — L'ÉCRAN PENDANT LA SORTIE (LOT R, 11/09/2026).
 *
 * ═══ CE QU'IL MONTRAIT, ET CE QUI MANQUAIT ══════════════════════════════════
 * Demande fondateur : « Comment s'affiche l'écran quand on est en course ?
 * Vérifie qu'on a bien au minimum toutes les informations que Strava et INTVL
 * peuvent donner. » L'écran affichait TROIS chiffres — distance, temps actif,
 * allure MOYENNE — plus une carte, les notices GPS et deux boutons. L'audit
 * ligne à ligne vit dans `docs/product/GRYD_ECRAN_DE_COURSE_2026_09.md`.
 *
 * Ce lot ajoute : l'allure INSTANTANÉE (celle qui bouge encore après une heure),
 * le dernier kilomètre et la liste des splits, la cadence, le dénivelé positif,
 * la précision GPS chiffrée, l'état de la boucle GRYD, le tour manuel d'INTVL,
 * le verrouillage tactile, l'écran maintenu allumé et l'annonce vocale au
 * kilomètre.
 *
 * ═══ LA RÈGLE QUI GOUVERNE CHAQUE CASE ══════════════════════════════════════
 * Une mesure absente rend un TIRET CADRATIN, jamais un « 0 » (L8, doctrine de
 * `liveRate.ts`). Et la case ne DISPARAÎT pas : le bandeau est lu en mouvement,
 * on retrouve une information par sa PLACE avant de la lire — une mise en page
 * qui se réorganise au premier kilomètre, sous les yeux de quelqu'un qui court,
 * coûte plus cher que la case vide qu'elle évite.
 *
 * ═══ LISIBILITÉ EN PLEIN SOLEIL ═════════════════════════════════════════════
 * Chiffres blancs (`c.darkInk`, #FAFAFA) sur carbone (#0A0A0A) : le contraste
 * maximal de la charte. La chartreuse (`c.accent`) ne porte AUCUN chiffre — elle
 * ne marque que l'état vivant (le point d'enregistrement, le meilleur
 * kilomètre) : un chiffre chartreuse sur carbone descend à un contraste que le
 * plein soleil efface, et la charte réserve l'accent au rôle, pas à la donnée.
 */
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useLocale, useT } from '../../../i18n/store';
import { C } from '../../../i18n/catalog/courseLive';
import { GrydIcon } from '../../../ui/gryd';
import { RealMap, realMapAvailable, type RealMapCamera, type RealMapGeoJSONLayer, type RealMapRef } from '../../../ui/game/RealMap';
import { liveRateDisplay, NO_MEASURE } from './liveRate';
import { courseResultParams } from './resultHandoff';
import { bestSplitIndex, type Split } from '../../journal/metrics';
import { loopClosurePhase, loopMissingM } from './engine/loopClosure';
import { roundLoopM } from './engine/loopHint';
import { useKeepScreenAwake2026 } from './keepAwake2026';
import type { Lap } from './liveMetrics2026';
import type { RealRunApi } from './gateTypes';
import { DisciplineSheet2026 } from './DisciplineSheet2026';
import type { DisciplineChoice2026 } from './tracker';
import type { DisciplineVerdict2026 } from './engine/disciplineCheck2026';

function clock(seconds: number) { const value = Math.floor(Math.max(0, seconds)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`; }
/** « 5'28 » — la convention d'allure de tout le produit (`liveRate.formatPaceMmSs`). */
function pace(sPerKm: number | null) { if (sPerKm === null || !Number.isFinite(sPerKm) || sPerKm <= 0) return NO_MEASURE; const s = Math.round(sPerKm); return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}`; }
/** Un entier, ou le tiret. Aucun arrondi ne fabrique de mesure : `null` reste `null`. */
function whole(value: number | null) { return value === null || !Number.isFinite(value) ? NO_MEASURE : String(Math.round(value)); }
/**
 * FRACTION DE LA PISTE À FRANCHIR POUR DÉVERROUILLER. Un glissement, pas un tap :
 * c'est le seul geste qu'un frottement de poche ou une goutte de pluie ne
 * produit pas. 60 % est assez long pour être délibéré, assez court pour se faire
 * d'un pouce, sur un écran tenu à bout de bras.
 */
const UNLOCK_RATIO = 0.6;

/** A sports instrument. Capture is evaluated after saving, by the server. */
export function RealCourseLive({ run }: { run: RealRunApi }) {
  const insets = useSafeAreaInsets();
  const fr = useLocale() === 'fr';
  const t = useT();
  // L'écran reste allumé tant que cet écran est monté. No-op silencieux là où le
  // module natif n'existe pas encore (build antérieur) : un confort de lecture
  // ne peut pas coûter une sortie.
  useKeepScreenAwake2026();
  const [finishing, setFinishing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locked, setLocked] = useState(false);
  /**
   * LE CONTRÔLE DE DISCIPLINE, EN ATTENTE DE RÉPONSE (12/09/2026).
   *
   * `null` = aucune question posée. Non nul = la feuille est ouverte et la
   * sortie N'EST PAS PARTIE : le tracker vit, la trace est en mémoire et sur le
   * disque de reprise. Rien ne se ferme sans l'une des deux réponses.
   */
  const [asking, setAsking] = useState<DisciplineVerdict2026 | null>(null);
  const finishingRef = useRef(false);
  const snapshot = run.snapshot;
  const paused = snapshot.phase === 'paused-user';
  const decimal = fr ? ',' : '.';
  const rate = liveRateDisplay(run.activity, snapshot.paceSPerKm, decimal);
  // L'allure de MAINTENANT passe par le MÊME formateur que la moyenne : le
  // cycliste lit deux vitesses, le coureur deux allures. Deux conversions
  // séparées finiraient par diverger d'un dixième, à trois centimètres l'une de
  // l'autre sur l'écran.
  const now = liveRateDisplay(run.activity, snapshot.livePaceSPerKm ?? 0, decimal);
  const mapRef = useRef<RealMapRef>(null);
  // Sans module natif, `flyTo` est vide : le bouton de recentrage serait allumé
  // et sans effet. On ne le peint pas (« aucun bouton mort »).
  const mapReady = realMapAvailable();
  const lastSegment = snapshot.traceSegments[snapshot.traceSegments.length - 1];
  const lastPoint = lastSegment?.[lastSegment.length - 1];
  const camera: RealMapCamera = lastPoint ? { ...lastPoint, zoom: 16 } : { lng: 2.5, lat: 46.6, zoom: 3.9 };
  const layers = useMemo<RealMapGeoJSONLayer[]>(() => {
    // Keep one feature per recorded segment: pauses and GPS gaps never get a connector.
    const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: snapshot.traceSegments.filter(segment => segment.length > 1).map((segment, index) => ({ type: 'Feature', id: index, properties: {}, geometry: { type: 'LineString', coordinates: segment.map(point => [point.lng, point.lat]) } })) };
    return [
      { id: 'live-route-casing', data, lineColor: c.carbon, lineWidth: 7, lineWidthStops: [[10, 4], [14, 5], [18, 8]] },
      { id: 'live-route-core', data, lineColor: c.accent, lineWidth: 4, lineWidthStops: [[10, 2], [14, 3], [18, 5]] },
    ];
  }, [snapshot.traceSegments]);
  // LA BOUCLE : la mesure qu'aucune app de course ne donne, parce qu'elle est le
  // jeu. Même AUTORITÉ que la voix et que le serveur (`loopClosurePhase`) : un
  // écran qui annoncerait « fermée » sur son propre seuil promettrait une
  // capture que le serveur refuserait.
  const closure = loopClosurePhase({
    conquest: run.effectiveMode === 'conquete', activity: run.activity,
    distanceM: snapshot.distanceM, gapM: snapshot.loopGapM,
  });
  const splits = snapshot.splits;
  const bestSplit = bestSplitIndex(splits);
  const laps = snapshot.laps;
  /**
   * LE TAP SUR « TERMINER ». Il ne termine pas toujours tout de suite.
   *
   * Le contrôle de discipline est lu ICI, avant le moindre effet irréversible :
   * si la trace raconte une autre discipline, la question est posée et la
   * sortie attend une réponse. Sinon, rien ne change — `finish()` part sans
   * argument, exactement comme avant ce lot.
   */
  const finish = async () => {
    if (finishingRef.current || asking !== null) return;
    const verdict = run.disciplineVerdict();
    if (verdict.suspected !== null) { setAsking(verdict); return; }
    await complete();
  };
  /**
   * LA CLÔTURE RÉELLE. `choice` porte ce que le joueur a répondu, et rien de
   * plus : jamais une décision prise à sa place.
   */
  const complete = async (choice?: DisciplineChoice2026) => {
    if (finishingRef.current) return;
    finishingRef.current = true; setFinishing(true); setFailed(false);
    try {
      const result = await run.finish(choice);
      // ─── G11 « SAUVEGARDE ET ANALYSE » EST SUR LE CHEMIN (10/09/2026) ──────
      // `/course/analyse` (E27) peint les trois issues que cet écran-ci ne sait
      // pas dire — analyse en attente, panne de réseau, envoi différé — et
      // n'avait AUCUN appelant : la fin de sortie sautait au résultat, et un
      // envoi resté en file ne se voyait nulle part. Le relais est celui du
      // module testé (`courseResultParams`), transmis TEL QUEL par E27 au
      // résultat : la discipline s'est déjà perdue une fois dans un objet
      // littéral recopié à la main.
      router.replace({ pathname: '/course/analyse', params: courseResultParams({ mode: run.effectiveMode, activity: run.activity, ...result }) });
    } catch {
      setFailed(true); setFinishing(false); finishingRef.current = false;
      // La feuille se referme même en cas d'échec : la question a bien reçu sa
      // réponse, et la rouvrir ferait redemander un choix déjà fait. La sortie,
      // elle, reste entière sur cet écran (« Les données restent sur cet écran »).
      setAsking(null);
    }
  };
  return <View style={s.root}>
    <View style={s.scene}>
      <RealMap ref={mapRef} camera={camera} basemap="dark" geojsonLayers={layers} style={StyleSheet.absoluteFill}
        onStyleLoaded={() => mapRef.current?.flyTo(camera)}
        markers={lastPoint ? [{ id: 'recorded-position', ...lastPoint, children: <View style={[s.position, (paused || snapshot.signal !== 'ok') && s.positionMuted]} /> }] : []} />
      <View style={[s.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.headerLabel}><GrydIcon name={run.activity === 'run' ? 'run' : 'bike'} size={20} color={c.darkInk} /><Text style={s.sport}>{run.activity === 'run' ? (fr ? 'Course' : 'Run') : (fr ? 'Vélo' : 'Ride')}</Text></View>
        <Pressable style={s.minimize} accessibilityRole="button" accessibilityLabel={fr ? 'Réduire le suivi, continuer à enregistrer' : 'Minimise tracking, keep recording'} onPress={() => router.push('/')}><GrydIcon name="chevronDown" size={22} color={c.darkInk} /></Pressable>
      </View>
      {!lastPoint && <View style={s.traceEmpty} pointerEvents="none"><GrydIcon name="location" size={22} color={c.darkMuted} /><Text style={s.traceLabel}>{fr ? 'En attente des premiers points GPS' : 'Waiting for the first GPS points'}</Text></View>}
      {lastPoint && mapReady && <Pressable style={s.recenter} accessibilityRole="button" accessibilityLabel={fr ? 'Recentrer sur le dernier point enregistré' : 'Centre on the last recorded point'} onPress={() => mapRef.current?.flyTo(camera)}><GrydIcon name="location" size={21} color={c.darkInk} /></Pressable>}
    </View>
    <View style={[s.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* ── LIGNE D'ÉTAT : ce qui est mesuré, et avec quelle précision ──────
          Strava rend la qualité du signal par trois barres ; GRYD rend le
          CHIFFRE, parce qu'il décide de ce que le serveur acceptera comme
          boucle. Le cacher ferait découvrir la raison d'un refus après coup. */}
      <View style={s.status}>
        <View style={[s.dot, (paused || snapshot.signal !== 'ok') && s.dotMuted]} />
        <Text style={s.statusText}>{paused ? (fr ? 'En pause' : 'Paused') : (fr ? 'Enregistrement' : 'Recording')}</Text>
        <Text style={s.statusDivider}>·</Text>
        <Text style={s.statusText}>{snapshot.accuracyM === null
          ? t(C.gpsAccuracyUnknown)
          : t(C.gpsAccuracy, { m: Math.round(snapshot.accuracyM) })}</Text>
      </View>

      {/* ── LES TROIS GRANDS CHIFFRES : ceux qu'on lit d'un coup d'œil ────── */}
      <View style={s.metrics}>
        <View style={s.metric}><Text style={s.distance}>{(snapshot.distanceM / 1000).toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text><Text style={s.metricLabel}>{t(C.metricDistance)}</Text></View>
        <View style={s.metric}><Text style={s.number}>{clock(snapshot.activeS)}</Text><Text style={s.metricLabel}>{t(C.metricActiveTime)}</Text></View>
        <View style={s.metric}><Text style={s.number}>{snapshot.livePaceSPerKm === null ? NO_MEASURE : now.value}</Text><Text style={s.metricLabel}>{t(run.activity === 'run' ? C.metricPaceNow : C.metricSpeedNow)}</Text></View>
      </View>

      {/* ── LA SECONDE RANGÉE : mesurée si la plateforme le permet, TIRET sinon.
          Chaque case garde sa place et son libellé — le libellé dit alors ce
          qui manque, et la mise en page ne bouge pas en pleine course. */}
      <View style={s.secondary}>
        <View style={s.metric}><Text style={s.small}>{rate.value}</Text><Text style={s.metricLabel}>{t(run.activity === 'run' ? C.metricPaceAvg : C.metricSpeedAvg)}</Text></View>
        <View style={s.metric}><Text style={s.small}>{whole(snapshot.elevationGainM)}</Text><Text style={s.metricLabel}>{t(C.metricElevation)}</Text></View>
        <View style={s.metric}><Text style={s.small}>{whole(snapshot.cadenceSpm)}</Text><Text style={s.metricLabel}>{t(C.metricCadence)}</Text></View>
      </View>

      {/* ── LA BOUCLE GRYD : la seule mesure de cet écran qui parle du JEU ─── */}
      {run.effectiveMode === 'conquete' && <View style={s.loop}>
        <GrydIcon name="loop" size={16} color={closure === 'closed' ? c.accent : c.darkMuted} />
        <Text style={[s.loopText, closure === 'closed' && s.loopClosed]}>
          {closure === 'closed'
            ? t(C.loopClosed)
            : snapshot.loopGapM === null || closure === 'idle'
              ? t(C.loopUnknown)
              : t(C.loopRemaining, { m: roundLoopM(loopMissingM(snapshot.loopGapM, run.activity)) })}
        </Text>
      </View>}

      <ScrollView style={s.messages} contentContainerStyle={s.messagesContent} showsVerticalScrollIndicator={false}>
        {/* ── LES KILOMÈTRES, PENDANT QU'ON COURT ────────────────────────────
            Mêmes objets que le détail de sortie (`splitsFrom`) : le « 5'42 au
            3ᵉ km » lu en courant est celui qu'on relira le soir. Le meilleur
            kilomètre porte l'accent ; il n'est décerné qu'entre kilomètres
            COMPLETS (comparer un résidu de 120 m couronnerait le résidu). */}
        {splits.length > 0 && <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>{t(C.splitsTitle)}</Text>
            {snapshot.lastSplit !== null && <Text style={s.sectionAside}>{t(C.metricLastKm)} · {pace(snapshot.lastSplit.paceSPerKm)}</Text>}
          </View>
          {splits.map((split) => <SplitRow key={split.index} split={split} best={split.index === bestSplit} partial={t(C.splitPartial)} />)}
        </View>}

        {/* ── LES TOURS (« lap » d'INTVL) : seulement s'il y en a ────────────
            Sans marque, il n'y a qu'un tour implicite — l'afficher répéterait la
            sortie entière sous un autre nom. La section naît au premier tour. */}
        {laps.length > 1 && <View style={s.section}>
          <Text style={s.sectionTitle}>{t(C.lapsTitle)}</Text>
          {laps.map((lap) => <LapRow key={lap.index} lap={lap} fr={fr} activity={run.activity} decimal={decimal} />)}
        </View>}

        {/* ─── TROIS CAUSES, TROIS PHRASES (10/09/2026) ────────────────────
            Un seul bandeau les servait toutes, et il disait « signal faible »
            à quelqu'un dont la PRÉCISION EXACTE est coupée dans les réglages :
            une phrase fausse, qui fait attendre un retour de signal qui
            n'arrivera jamais et qui cache le seul geste qui débloque. L'ordre
            est celui de ce qu'on peut faire : ce qui se règle d'abord. */}
        {run.permissionRevoked
          ? <View style={s.notice}><GrydIcon name="location" size={17} color={c.darkMuted} /><View style={{ flex: 1 }}><Text style={s.noticeText}>{fr ? 'Localisation désactivée pendant la sortie. Les points déjà mesurés sont conservés ; plus rien ne s’ajoute.' : 'Location was switched off during the outing. The points already measured are kept; nothing more is added.'}</Text>{run.openSettings && <Pressable accessibilityRole="button" style={s.noticeAction} onPress={run.openSettings}><Text style={s.secondaryText}>{fr ? 'Ouvrir les Réglages' : 'Open Settings'}</Text><GrydIcon name="arrowUpRight" size={16} color={c.darkInk} /></Pressable>}</View></View>
          : run.approxLocation
            ? <View style={s.notice}><GrydIcon name="location" size={17} color={c.darkMuted} /><View style={{ flex: 1 }}><Text style={s.noticeText}>{fr ? 'Position approximative : la précision exacte est coupée pour GRYD. La trace restera grossière tant qu’elle l’est.' : 'Approximate location: precise accuracy is off for GRYD. Your route stays coarse until you turn it on.'}</Text>{run.openSettings && <Pressable accessibilityRole="button" style={s.noticeAction} onPress={run.openSettings}><Text style={s.secondaryText}>{fr ? 'Activer la position exacte' : 'Turn on precise location'}</Text><GrydIcon name="arrowUpRight" size={16} color={c.darkInk} /></Pressable>}</View></View>
            : snapshot.signal !== 'ok'
              ? <View style={s.notice}><GrydIcon name="location" size={17} color={c.darkMuted} /><Text style={s.noticeText}>{snapshot.signal === 'lost' ? (fr ? 'Signal GPS perdu. La trace reprendra au retour du signal ; ce qui manque restera un trou, jamais une ligne inventée.' : 'GPS signal lost. Your route resumes when it returns; the gap stays a gap, never an invented line.') : (fr ? 'Signal GPS faible. La trace continue, avec moins de précision.' : 'Weak GPS signal. Recording continues with less accuracy.')}</Text></View>
              : null}
        {run.foregroundOnlyPlatform && <Text style={s.fine}>{fr ? 'Garde cet écran ouvert : le navigateur ne suit pas en arrière-plan.' : 'Keep this screen open: the browser cannot track in the background.'}</Text>}
        {run.bgPrompt !== 'hidden' && <Pressable accessibilityRole="button" style={s.noticeAction} onPress={run.allowBackground}><Text style={s.noticeText}>{fr ? 'Autoriser l’enregistrement écran verrouillé' : 'Allow recording with the screen locked'}</Text><GrydIcon name="arrowUpRight" size={17} color={c.darkInk} /></Pressable>}
        {run.restore && <View style={s.restore}><Text style={s.restoreTitle}>{fr ? 'Sortie retrouvée' : 'Recovered outing'}</Text><Text style={s.fine}>{(run.restore.distanceM / 1000).toFixed(2)} km · {run.restore.activity === 'bike' ? (fr ? 'Vélo' : 'Cycling') : (fr ? 'Course' : 'Running')}</Text>{run.restore.resume ? <Pressable accessibilityRole="button" style={s.restoreAction} onPress={run.restore.resume}><Text style={s.secondaryText}>{fr ? 'Reprendre la sortie retrouvée' : 'Resume recovered outing'}</Text><GrydIcon name="play" size={16} color={c.darkInk} /></Pressable> : null}{run.restore.resumeBlocked === 'other_activity' ? <Text style={s.fine}>{fr ? 'Elle n’est pas dans la même discipline que la sortie en cours : elle ne peut pas y être fusionnée. Garde-la au journal, elle part dans son monde.' : 'It belongs to another sport than the outing in progress and cannot be merged into it. Keep it in the journal: it goes to its own world.'}</Text> : run.restore.resumeBlocked === 'too_old' ? <Text style={s.fine}>{fr ? 'Elle date de plus de 24 h : la reprendre ferait repartir son chrono sur des heures qui n’ont pas été courues. Ses mesures restent intactes.' : 'It is more than 24 h old: resuming it would restart its clock over hours nobody ran. Its measurements stay intact.'}</Text> : null}<Pressable accessibilityRole="button" style={s.restoreAction} onPress={run.restore.discard}><Text style={s.secondaryText}>{fr ? 'Garder cette sortie au journal' : 'Keep this outing in the journal'}</Text><GrydIcon name="arrowUpRight" size={16} color={c.darkInk} /></Pressable></View>}
        {failed && <Text accessibilityRole="alert" style={s.fine}>{fr ? 'La sauvegarde n’a pas abouti. Les données restent sur cet écran.' : 'Saving did not complete. Your data remains on this screen.'}</Text>}
      </ScrollView>
      <View style={s.controls}>
        {paused && <Pressable disabled={finishing} accessibilityState={{ disabled: finishing }} accessibilityRole="button" onPress={() => void finish()} style={s.secondary2}><GrydIcon name="stop" size={17} color={c.darkInk} /><Text style={s.secondaryText}>{finishing ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Terminer' : 'Finish')}</Text></Pressable>}
        {/* TOUR : désactivé PENDANT le plancher (`LIVE_LAP_MIN_DURATION_S`)
            plutôt que muet — un bouton qui ne fait rien une seconde sur cinq est
            un bouton mort une seconde sur cinq. */}
        <Pressable disabled={finishing || !run.canMarkLap} accessibilityState={{ disabled: finishing || !run.canMarkLap }} accessibilityRole="button" accessibilityLabel={t(C.a11yLap)} onPress={() => { run.markLap(); }} style={[s.ghost, (finishing || !run.canMarkLap) && s.disabled]}><GrydIcon name="flag" size={17} color={c.darkInk} /><Text style={s.secondaryText}>{t(C.lapCta)}</Text></Pressable>
        <Pressable disabled={finishing} accessibilityState={{ disabled: finishing }} accessibilityRole="button" onPress={run.togglePause} style={[s.primary, finishing && s.disabled]}><GrydIcon name={paused ? 'play' : 'pause'} color={c.ink} size={20} /><Text style={s.primaryText}>{paused ? (fr ? 'Reprendre' : 'Resume') : 'Pause'}</Text></Pressable>
        {/* VERROU : le geste le plus facile à provoquer par accident, sur un
            écran dans une poche ou sous la pluie, est celui qui TERMINE la
            sortie. Le verrou le met hors de portée sans rien arrêter. */}
        <Pressable disabled={finishing} accessibilityState={{ disabled: finishing }} accessibilityRole="button" accessibilityLabel={t(C.lockCta)} onPress={() => setLocked(true)} style={[s.ghost, finishing && s.disabled]}><GrydIcon name="lock" size={17} color={c.darkInk} /><Text style={s.secondaryText}>{t(C.lockCta)}</Text></Pressable>
      </View>
    </View>
    {locked && <LockOverlay
      title={t(C.lockedTitle)} body={t(C.lockedBody)} hint={t(C.unlockHint)} a11y={t(C.a11yUnlock)}
      distance={(snapshot.distanceM / 1000).toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      distanceLabel={t(C.metricDistance)} time={clock(snapshot.activeS)} timeLabel={t(C.metricActiveTime)}
      onUnlock={() => setLocked(false)} top={insets.top} bottom={insets.bottom} />}
    {/* ── « UN PROBLÈME AVEC TA SORTIE » : deux issues, aucune troisième ───
        Montée APRÈS le verrou dans l'arbre, donc AU-DESSUS de lui : le verrou
        n'a plus de raison d'être une fois que la sortie est finie, et une
        feuille cachée derrière lui serait une question qu'on ne peut pas
        répondre. Aucun `onRequestClose`, aucun tap hors zone : la seule sortie
        passe par l'un des deux boutons. */}
    {asking !== null && <DisciplineSheet2026
      verdict={asking} busy={finishing}
      onSwitch={() => { const to = asking.suspected; if (to === null) return; setAsking(null); void complete({ kind: 'switch', to }); }}
      onKeep={() => { setAsking(null); void complete({ kind: 'keep', evidence: asking.evidence }); }} />}
  </View>;
}

/** Une ligne de split. `partial` marque le kilomètre EN COURS : son allure n'est pas comparable. */
function SplitRow({ split, best, partial }: { split: Split; best: boolean; partial: string }) {
  return <View style={s.row}>
    <Text style={[s.rowIndex, best && s.rowBest]}>{split.index}</Text>
    <Text style={s.rowMain}>{split.complete ? pace(split.paceSPerKm) : `${pace(split.paceSPerKm)} · ${partial}`}</Text>
    <Text style={s.rowAside}>{split.complete ? '1,00 km' : `${(split.distanceM / 1000).toFixed(2)} km`}</Text>
  </View>;
}

/**
 * Une ligne de tour. Le tour EN COURS le dit : sa durée grandit sous les yeux,
 * et le présenter comme bouclé le rendrait comparable aux autres, ce qu'il n'est
 * pas encore.
 */
function LapRow({ lap, fr, activity, decimal }: { lap: Lap; fr: boolean; activity: RealRunApi['activity']; decimal: string }) {
  const rate = lap.paceSPerKm === null ? NO_MEASURE : liveRateDisplay(activity, lap.paceSPerKm, decimal).value;
  return <View style={s.row}>
    <Text style={[s.rowIndex, !lap.closed && s.rowOpen]}>{lap.index}</Text>
    <Text style={s.rowMain}>{clock(lap.durationS)} · {rate}</Text>
    <Text style={s.rowAside}>{(lap.distanceM / 1000).toLocaleString(fr ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km</Text>
  </View>;
}

/**
 * L'ÉCRAN VERROUILLÉ. Il n'arrête RIEN — il le dit d'ailleurs en toutes lettres,
 * sinon un voile plein écran se lirait comme une interruption.
 *
 * Il garde les deux chiffres qu'on veut voir sans rien toucher (temps et
 * distance) et n'offre qu'un geste : GLISSER. Le déverrouillage se mesure sur la
 * largeur RÉELLE de la piste (`onLayout`), jamais sur une largeur supposée : un
 * seuil en pixels codé en dur serait franchi d'un frottement sur un petit écran
 * et inatteignable au pouce sur une tablette.
 */
function LockOverlay({ title, body, hint, a11y, distance, distanceLabel, time, timeLabel, onUnlock, top, bottom }: {
  title: string; body: string; hint: string; a11y: string;
  distance: string; distanceLabel: string; time: string; timeLabel: string;
  onUnlock: () => void; top: number; bottom: number;
}) {
  const [width, setWidth] = useState(0);
  const [dx, setDx] = useState(0);
  const startRef = useRef(0);
  const threshold = width * UNLOCK_RATIO;
  return <View style={[s.lock, { paddingTop: top + 24, paddingBottom: bottom + 24 }]}>
    <View style={s.lockHead}><GrydIcon name="lock" size={18} color={c.darkMuted} /><Text style={s.lockTitle}>{title}</Text></View>
    <Text style={s.lockBody}>{body}</Text>
    <View style={s.lockMetrics}>
      <View style={s.metric}><Text style={s.distance}>{distance}</Text><Text style={s.metricLabel}>{distanceLabel}</Text></View>
      <View style={s.metric}><Text style={s.distance}>{time}</Text><Text style={s.metricLabel}>{timeLabel}</Text></View>
    </View>
    <View style={s.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={s.trackHint}>{hint}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        // Le lecteur d'écran ne glisse pas : pour lui, l'activation SUFFIT.
        // Refuser le tap ici rendrait l'écran verrouillé définitif à quelqu'un
        // qui navigue en VoiceOver, au milieu d'une sortie.
        onAccessibilityTap={onUnlock}
        onTouchStart={(e) => { startRef.current = e.nativeEvent.pageX; setDx(0); }}
        onTouchMove={(e) => setDx(Math.max(0, e.nativeEvent.pageX - startRef.current))}
        onTouchEnd={() => { if (threshold > 0 && dx >= threshold) onUnlock(); setDx(0); }}
        onTouchCancel={() => setDx(0)}
        style={[s.knob, { transform: [{ translateX: Math.min(dx, Math.max(0, width - 56)) }] }]}
      ><GrydIcon name="chevronRight" size={20} color={c.ink} /></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.carbon }, scene: { flex: 1, minHeight: 140, overflow: 'hidden' },
  header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, headerLabel: { minHeight: 44, borderRadius: 14, backgroundColor: c.floating, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9 }, sport: { color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20 }, minimize: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.floating, alignItems: 'center', justifyContent: 'center' }, position: { width: 14, height: 14, borderRadius: 7, backgroundColor: c.accent, borderWidth: 3, borderColor: c.carbon }, positionMuted: { backgroundColor: c.darkInk }, recenter: { position: 'absolute', bottom: 36, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: c.floating, alignItems: 'center', justifyContent: 'center' }, traceEmpty: { position: 'absolute', top: '45%', alignSelf: 'center', maxWidth: 240, padding: 16, alignItems: 'center', gap: 9, borderRadius: 16, backgroundColor: c.floating }, traceLabel: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted, textAlign: 'center' },
  dock: { paddingHorizontal: 20, paddingTop: 15, backgroundColor: c.carbon }, status: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent }, dotMuted: { backgroundColor: c.darkMuted }, statusText: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12 }, statusDivider: { color: c.darkSurfaceMuted, fontFamily: fonts.text, fontSize: 12 },
  metrics: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingTop: 12, paddingBottom: 10 }, secondary: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingBottom: 12 }, metric: { flex: 1, gap: 5 },
  // Chiffres BLANCS sur carbone : le contraste maximal de la charte, le seul qui
  // survive au plein soleil. La chartreuse ne porte jamais un chiffre.
  distance: { color: c.darkInk, fontFamily: fonts.displayMedium, fontSize: 34, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] }, number: { color: c.darkInk, fontFamily: fonts.displayRegular, fontSize: 27, lineHeight: 34, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }, small: { color: c.darkInk, fontFamily: fonts.displayRegular, fontSize: 19, lineHeight: 25, letterSpacing: -0.2, fontVariant: ['tabular-nums'] }, metricLabel: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 17 },
  loop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12 }, loopText: { flex: 1, color: c.darkMuted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 }, loopClosed: { color: c.accent, fontFamily: fonts.textMedium },
  messages: { flexGrow: 0, maxHeight: 190 }, messagesContent: { gap: 7 }, notice: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', paddingBottom: 3 }, noticeText: { flex: 1, color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 }, noticeAction: { minHeight: 44, flexDirection: 'row', gap: 12, alignItems: 'center' }, fine: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 }, restore: { borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted, paddingTop: 12, gap: 5 }, restoreTitle: { color: c.darkInk, fontFamily: fonts.displayMedium, fontSize: 20 }, restoreAction: { minHeight: 44, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  section: { gap: 3, paddingBottom: 6 }, sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }, sectionTitle: { color: c.darkMuted, fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18, letterSpacing: 0.6, textTransform: 'uppercase' }, sectionAside: { color: c.darkInk, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 3 }, rowIndex: { width: 22, color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, fontVariant: ['tabular-nums'] }, rowBest: { color: c.accent, fontFamily: fonts.textMedium }, rowOpen: { color: c.darkInk }, rowMain: { flex: 1, color: c.darkInk, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, fontVariant: ['tabular-nums'] }, rowAside: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 12, flexWrap: 'wrap' }, primary: { minHeight: 44, borderRadius: 22, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10 }, primaryText: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 14 }, disabled: { opacity: 0.5 }, secondary2: { minHeight: 44, paddingHorizontal: 4, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 }, ghost: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, secondaryText: { flexShrink: 1, color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19 },
  lock: { ...StyleSheet.absoluteFillObject, backgroundColor: c.carbon, paddingHorizontal: 24, justifyContent: 'center', gap: 14 }, lockHead: { flexDirection: 'row', alignItems: 'center', gap: 9 }, lockTitle: { color: c.darkInk, fontFamily: fonts.displayMedium, fontSize: 20 }, lockBody: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 13, lineHeight: 19 }, lockMetrics: { flexDirection: 'row', gap: 16, paddingVertical: 18 },
  track: { height: 56, borderRadius: 28, backgroundColor: c.darkSurface, justifyContent: 'center', paddingHorizontal: 4 }, trackHint: { position: 'absolute', alignSelf: 'center', color: c.darkMuted, fontFamily: fonts.text, fontSize: 13 }, knob: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
});
