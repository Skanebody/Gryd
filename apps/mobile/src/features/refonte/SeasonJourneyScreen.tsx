import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { GrydIcon, RewardEmblem } from '../../ui/gryd';
import { careerProgress2026, colors, EVENTS, fonts, LEVEL_REWARDS_2026, PROGRESSION_RULES_2026 as rules, refonteColors as c, SEASON_REWARDS_2026 } from '@klaim/shared';
import { screen, track } from '../../lib/analytics';
import { useLocale } from '../../i18n/store';
import { useSession } from '../../lib/session';
import { seasonObjectPreview2026 } from '../share/studioObjects2026';
import { rewardLabel2026 } from './SeasonRewardLabels2026';
import { useProfileProgress } from './ProfileProgress';
import { SeasonCollections2026 } from './SeasonCollections2026';
import { ProfileButton, ProfilePage, ProfileSection, ProfileSegments, s, useRefonteCopy } from './ProfilePrimitives';
import { rewardVariant2026, SeasonRewardArtwork2026 } from './SeasonRewardArtwork2026';
import { ProgressAchievementMoment2026 } from './ProgressAchievementMoment2026';

export { rewardVariant2026 } from './SeasonRewardArtwork2026';

export { rewardLabel2026 } from './SeasonRewardLabels2026';

export function SeasonJourneyScreen() {
  const copy = useRefonteCopy(); const locale = useLocale();
  const { session, configured } = useSession();
  const progress = useProfileProgress();
  const [segment, setSegment] = useState<'season' | 'career'>('season');
  const [showRules, setShowRules] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const career = progress.data ? careerProgress2026(progress.data.totalXp) : null;
  const seasonProgress = progress.data?.season ?? null;
  const current = segment === 'career' ? career?.level : seasonProgress?.stage;
  const entries = segment === 'career'
    ? LEVEL_REWARDS_2026.map(item => ({ id: item.id, label: item.label, threshold: item.level }))
    : SEASON_REWARDS_2026.map(item => ({ id: item.id, label: item.label, threshold: item.tier }));
  const nextIndex = entries.findIndex(item => item.threshold > (current ?? 0));
  const next = nextIndex >= 0 ? entries[nextIndex] : null;
  const timeline = showAll ? entries : next ? entries.slice(nextIndex + 1, nextIndex + 4) : entries.slice(-3);
  const hasMeasure = current !== undefined;
  useEffect(() => { screen('season'); }, []);
  useEffect(() => {
    if (progress.status === 'loading') return;
    track(EVENTS.seasonViewed, { phase: seasonProgress && !seasonProgress.archived ? 'active' : 'upcoming', activity: 'run', state: progress.status === 'ready' ? 'ready' : progress.status === 'signed-out' ? 'signed_out' : 'failed' });
  }, [progress.status, seasonProgress]);
  return <ProfilePage tone="light" title={copy('Progression', 'Progress')} back>
    <ProgressAchievementMoment2026 progress={progress.status === 'ready' ? progress.data : null} />
    <ProfileSegments tone="light" value={segment} onChange={value => { setSegment(value); setShowAll(false); }} options={[{ key: 'season', label: copy('Saison', 'Season') }, { key: 'career', label: copy('Parcours', 'Journey') }]} />
    {hasMeasure ? <View style={local.overview}><SeasonContours />
      <Text style={[local.caption, local.heroMeta]}>{segment === 'season' ? seasonProgress?.title : copy('Parcours permanent', 'Lifetime journey')}</Text>
      <View style={local.measureRow}><View style={local.measure}><Text style={local.number}>{current}</Text><Text style={local.measureUnit}>{segment === 'season' ? copy(`sur ${rules.seasonTierCount} paliers`, `of ${rules.seasonTierCount} stages`) : copy('niveau actuel', 'current level')}</Text></View><Text style={local.xp}>{(segment === 'career' ? career?.xp : seasonProgress?.xp)?.toLocaleString(locale)} XP</Text></View>
      {segment === 'season' ? <View style={local.tiers} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: rules.seasonTierCount, now: current }}>{SEASON_REWARDS_2026.map(item => <View key={item.id} style={[local.tier, item.tier <= current && local.tierEarned]} />)}</View> : career ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(career.progress * 100) }} style={local.track}><View style={[local.fill, { width: `${career.progress * 100}%` }]} /></View> : null}
      <Text style={[local.caption, local.heroMeta]}>{segment === 'career' && career ? copy(`${career.xpRemaining} XP avant le niveau ${career.level + 1}`, `${career.xpRemaining} XP to level ${career.level + 1}`) : seasonProgress?.archived ? copy('Collection poursuivie en archive', 'Continuing an archived collection') : seasonProgress && seasonProgress.activeDays > 0 ? copy(`${seasonProgress.activeDays} ${seasonProgress.activeDays === 1 ? 'journée active' : 'journées actives'} dans cette collection.`, `${seasonProgress.activeDays} active ${seasonProgress.activeDays === 1 ? 'day' : 'days'} in this collection.`) : copy('Tes journées actives font avancer la collection.', 'Active days advance your collection.')}</Text>
    </View> : <View style={local.overview}><SeasonContours />
      <Text style={[local.caption, local.heroMeta]}>{copy('APERÇU', 'PREVIEW')}</Text>
      <Text style={local.intro}>{segment === 'season' ? copy(`Une saison, ${rules.seasonTierCount} étapes.`, `One season, ${rules.seasonTierCount} stages.`) : copy('Un parcours au fil des sorties.', 'A journey through your activities.')}</Text>
      <Text style={[local.caption, local.heroMeta]}>{segment === 'season' ? copy(`${rules.seasonWeeks} semaines · Course et vélo`, `${rules.seasonWeeks} weeks · Runs and rides`) : copy('Les mêmes XP, sans remise à zéro.', 'The same XP, with no reset.')}</Text>
    </View>}
    {progress.status === 'loading' ? <View style={local.status}><ActivityIndicator size="small" color={c.ink} /><Text style={local.caption}>{copy('Lecture de la progression…', 'Loading progress…')}</Text></View> : progress.status === 'failed' ? <View style={local.status}><Text style={[local.caption, s.flex]}>{copy('La progression est indisponible.', 'Progress is unavailable.')}</Text><ProfileButton tone="light" label={copy('Réessayer', 'Retry')} onPress={progress.reload} secondary /></View> : progress.status === 'unavailable' ? <Text style={local.notice}>{copy('Progression indisponible. Tes sorties restent dans le journal.', 'Progress unavailable. Activities remain in your journal.')}</Text> : null}
    {next ? <View style={local.objectRow}>
      <View style={local.objectCopy}><Text style={local.caption}>{hasMeasure ? copy('Prochain objet', 'Next object') : copy('Premier objet · aperçu', 'First object · preview')}</Text><Text style={local.objectName}>{rewardLabel2026(next.id, next.label, locale)}</Text><Text style={local.caption}>{segment === 'career' ? copy(`Niveau ${next.threshold}`, `Level ${next.threshold}`) : copy(`Palier ${next.threshold}`, `Stage ${next.threshold}`)}</Text></View>
      <View>{segment==='season'?<SeasonRewardArtwork2026 object={seasonObjectPreview2026({id:next.id,label:next.label,tier:next.threshold},seasonProgress?.title??copy('Saison','Season'))!} rewardId={next.id} tier={next.threshold} size={104} state={hasMeasure ? 'locked' : 'preview'} locale={locale==='en'?'en':'fr'}/>:<RewardEmblem variant={rewardVariant2026(next.id)} size={72} level={next.threshold} tone="neutral" state={hasMeasure ? 'locked' : 'preview'} serial={String(next.threshold).padStart(2, '0')} />}</View>
    </View> : <View style={local.objectRow}><GrydIcon name="check" size={20} color={c.ink} /><Text style={local.objectName}>{copy('Toutes les étapes franchies', 'Every milestone reached')}</Text></View>}
    <ProfileSection tone="light" title={showAll ? copy('Les étapes', 'Milestones') : copy('À suivre', 'Coming up')} action={copy('Collection', 'Collection')} onPress={() => router.push('/arsenal')} />
    <View style={local.timeline}>{timeline.map((item, index) => {
      const reached = current !== undefined && item.threshold <= current;
      const upcoming = item.id === next?.id;
      return <View key={item.id} style={local.step}>
        <View style={local.rail}>{index > 0 && <View style={local.railTop} />}<View style={[local.dot, reached && local.dotReached, upcoming && local.dotNext]} />{index < timeline.length - 1 && <View style={local.railBottom} />}</View>
        <View style={local.stepCopy}><Text style={local.stepName}>{rewardLabel2026(item.id, item.label, locale)}</Text><Text style={local.caption}>{segment === 'career' ? copy(`Niveau ${item.threshold}`, `Level ${item.threshold}`) : copy(`Palier ${item.threshold}`, `Stage ${item.threshold}`)}</Text></View>
        {reached ? <GrydIcon name="check" size={18} color={c.ink} /> : <Text style={local.stepIndex}>{String(item.threshold).padStart(2, '0')}</Text>}
      </View>;
    })}</View>
    {entries.length > timeline.length || showAll ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAll }} aria-expanded={showAll} onPress={() => setShowAll(value => !value)} style={local.disclosure}><Text style={local.linkText}>{showAll ? copy('Réduire les étapes', 'Show fewer milestones') : copy('Toutes les étapes', 'All milestones')}</Text><GrydIcon name={showAll ? 'minus' : 'plus'} size={18} color={c.muted} /></Pressable> : null}
    {!session && progress.status !== 'loading' ? <View style={local.guest}><Text style={[local.caption, s.flex]}>{copy('Un compte conserve ta progression et tes objets.', 'An account keeps your progress and objects.')}</Text>{configured ? <ProfileButton tone="light" label={copy('Me connecter', 'Sign in')} onPress={() => router.push('/sign-in')} /> : null}</View> : null}
    {segment === 'season' && progress.data ? <><Pressable accessibilityRole="button" accessibilityState={{ expanded: showCollections }} aria-expanded={showCollections} onPress={() => setShowCollections(value => !value)} style={local.disclosure}><Text style={local.linkText}>{copy('Collections et archives', 'Collections and archives')}</Text><GrydIcon name={showCollections ? 'minus' : 'plus'} size={18} color={c.muted} /></Pressable>{showCollections ? <View style={{ backgroundColor: c.carbon, padding: 18, borderRadius: 24, marginVertical: 12 }}><SeasonCollections2026 progress={progress.data} reload={progress.reload} locale={locale} /></View> : null}</> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showRules }} aria-expanded={showRules} onPress={() => setShowRules(value => !value)} style={local.disclosure}><Text style={local.linkText}>{copy('Comment progresser', 'How progress works')}</Text><GrydIcon name={showRules ? 'minus' : 'plus'} size={18} color={c.muted} /></Pressable>
    {showRules ? <View style={local.rulesDetail}><Text style={local.caption}>{copy(`${rules.minimumMovementSecondsPerDay / 60} minutes de mouvement admissible = ${rules.xpPerActiveDay} XP par journée, jusqu’à ${rules.maximumCreditedDaysPerWeek} journées par semaine. Course et vélo font avancer le même parcours.`, `${rules.minimumMovementSecondsPerDay / 60} minutes of eligible movement = ${rules.xpPerActiveDay} XP per day, up to ${rules.maximumCreditedDaysPerWeek} days per week. Runs and rides advance the same journey.`)}</Text><Text style={local.caption}>{copy('Le repos ne retire aucun XP. Une collection commencée peut continuer en archive ; les objets gagnés restent acquis.', 'Rest never takes away XP. Started collections can continue in the archive; earned objects stay yours.')}</Text></View> : null}
  </ProfilePage>;
}

function SeasonContours() {
  return <View pointerEvents="none" style={local.contours}><Svg width={145} height={145} viewBox="0 0 145 145" accessible={false}>{Array.from({length: 7}, (_, i) => <Path key={i} d={`M ${22+i*10} -12 C ${-45+i*10} 72, ${170+i*5} 44, ${75+i*8} 160`} fill="none" stroke={colors.blanc14} strokeWidth={1} />)}</Svg></View>;
}
const local = StyleSheet.create({
  overview: { backgroundColor: c.carbon, borderRadius: 24, padding: 16, marginTop: 12, marginBottom: 12, minHeight: 148, justifyContent: 'center', gap: 10, overflow: 'hidden' },
  contours: { position: 'absolute', right: -28, top: -12 }, heroMeta: { color: c.darkMuted },
  intro: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, color: c.darkInk, letterSpacing: -.7, maxWidth: 255 },
  caption: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted },
  measureRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }, measure: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 9 }, number: { fontFamily: fonts.displayMedium, fontSize: 28, lineHeight: 34, color: c.darkInk, fontVariant: ['tabular-nums'] }, measureUnit: { fontFamily: fonts.text, fontSize: 12, color: c.darkMuted }, xp: { fontFamily: fonts.text, fontSize: 14, color: c.darkInk, fontVariant: ['tabular-nums'] },
  tiers: { flexDirection: 'row', gap: 4, marginVertical: 4 }, tier: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.darkSurfaceMuted }, tierEarned: { backgroundColor: c.accent }, track: { height: 5, borderRadius: 3, backgroundColor: c.darkSurfaceMuted, overflow: 'hidden', marginVertical: 4 }, fill: { height: 5, backgroundColor: c.accent },
  objectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 24, backgroundColor: c.surface }, objectCopy: { flex: 1, gap: 5 }, objectName: { fontFamily: fonts.displayMedium, fontSize: 16, lineHeight: 22, color: c.ink },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 }, notice: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted, paddingBottom: 15 },
  timeline: { backgroundColor: c.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 },
  step: { minHeight: 56, flexDirection: 'row', gap: 12, alignItems: 'center' }, rail: { width: 13, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }, railTop: { position: 'absolute', top: 0, bottom: '50%', width: 1, backgroundColor: c.border }, railBottom: { position: 'absolute', top: '50%', bottom: 0, width: 1, backgroundColor: c.border }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.surface, borderWidth: 1, borderColor: c.muted }, dotNext: { borderColor: c.ink, backgroundColor: c.ink }, dotReached: { borderColor: c.ink, backgroundColor: c.ink }, stepCopy: { flex: 1, gap: 3, alignSelf: 'stretch', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }, stepName: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.ink }, stepIndex: { fontFamily: fonts.text, fontSize: 12, color: c.muted, fontVariant: ['tabular-nums'] },
  disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }, linkText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.ink }, guest: { paddingVertical: 14, gap: 12, alignItems: 'flex-start' }, rulesDetail: { gap: 10, paddingVertical: 14 },
});
