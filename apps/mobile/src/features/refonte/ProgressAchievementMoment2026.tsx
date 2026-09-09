import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { careerProgress2026, fonts, refonteColors as c } from '@klaim/shared';
import { useLocale } from '../../i18n/store';
import { EVENTS, track } from '../../lib/analytics';
import { RewardEmblem, rewardVariantForBadgeFamily } from '../../ui/gryd';
import { badgeById } from '../badges/catalog';
import { useMyBadges, type MyBadges } from '../badges/myBadges';
import { isResultOwnerCurrent2026 } from '../run/resultOwner2026';
import { useResultOwner2026 } from '../run/useResultOwner2026';
import { resolveStudioObject2026, studioRewardLabel2026 } from '../share/studioObjects2026';
import { useProfileProgress, type ProfileProgress2026 } from './ProfileProgress';
import type { MomentClaim2026, MomentDomain2026, MomentSnapshot2026 } from './progressMomentLedger2026';
import { isMomentReadCurrent2026 } from './progressMomentLedger2026';
import { progressMomentLedger2026 } from './progressMomentStore2026';
import { SeasonRewardArtwork2026 } from './SeasonRewardArtwork2026';

/** Mounted only for an owned, valid/partial server result, never a pending outing. */
export function VerifiedRunProgressMoment2026() {
  const progress = useProfileProgress();
  const badges = useMyBadges();
  // Group the two independent reads in one moment. A failed badge read must not
  // prevent a verified level from being shown (and conversely).
  const settled = progress.status !== 'loading' && !badges.loading;
  return <ProgressAchievementMoment2026 enabled={settled} progress={progress.status === 'ready' ? progress.data : null} badges={badges} />;
}

/** One compact receipt for a verified snapshot; no modal, optimistic XP or queue. */
export function ProgressAchievementMoment2026({ progress, badges, enabled = true }: {
  progress?: ProfileProgress2026 | null;
  badges?: MyBadges;
  enabled?: boolean;
}) {
  const { ownerId, epoch } = useResultOwner2026();
  const locale = useLocale() === 'en' ? 'en' : 'fr';
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [receipt, setReceipt] = useState<{ ownerId: string; epoch: number; claim: MomentClaim2026 } | null>(null);
  const visitClaimed = useRef(false);
  useEffect(() => { visitClaimed.current = false; setReceipt(null); }, [ownerId, epoch]);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    visitClaimed.current = false;
    return () => { setFocused(false); setReceipt(null); };
  }, []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  const snapshots = useMemo(() => {
    const result: Partial<Record<MomentDomain2026, MomentSnapshot2026>> = {};
    if (progress && !progress.pending && isMomentReadCurrent2026(progress.readScope, ownerId, epoch)) result.progress = {
      level: careerProgress2026(progress.totalXp).level,
      items: progress.ownedRewards.map(item => ({ id: item.id, earnedAt: item.earnedAt })),
    };
    if (badges?.source === 'server' && !badges.loading && !badges.failed && isMomentReadCurrent2026(badges.readScope, ownerId, epoch)) result.badges = {
      items: [...badges.unlockedIds].map(id => ({ id, earnedAt: badges.unlockedAt.get(id) ?? '' })),
    };
    return result;
  }, [progress, badges, ownerId, epoch]);
  const signature = JSON.stringify(snapshots);
  useEffect(() => {
    if (!enabled || !focused || !active || !ownerId || visitClaimed.current || Object.keys(snapshots).length === 0) return;
    let alive = true;
    const current = () => alive && AppState.currentState === 'active' && isResultOwnerCurrent2026(ownerId, epoch);
    void progressMomentLedger2026.claim(ownerId, snapshots, current).then(claim => {
      if (!claim || !current()) return;
      visitClaimed.current = true;
      setReceipt({ ownerId, epoch, claim });
    });
    return () => { alive = false; };
    // Snapshot contents, not freshly allocated Sets/Maps, determine a new read.
  }, [enabled, focused, active, ownerId, epoch, signature]);
  const claim = receipt && receipt.ownerId === ownerId && receipt.epoch === epoch ? receipt.claim : null;
  if (!claim || !focused) return null;
  const scopedProgress = progress && isMomentReadCurrent2026(progress.readScope, ownerId, epoch) ? progress : null;
  const rewards = scopedProgress?.ownedRewards.filter(reward => claim.rewardIds.includes(reward.id)) ?? [];
  const earnedBadges = isMomentReadCurrent2026(badges?.readScope, ownerId, epoch) ? claim.badgeIds.map(badgeById).filter(badge => badge !== undefined) : [];
  const firstReward = rewards[0];
  const firstBadge = earnedBadges[0];
  const object = firstReward && scopedProgress ? resolveStudioObject2026({ kind: 'season', collectionId: firstReward.collectionId, rewardId: firstReward.rewardId, variant: firstReward.variant }, scopedProgress.ownedRewards, [], scopedProgress.collections) : null;
  if (claim.level === null && rewards.length === 0 && earnedBadges.length === 0) return null;
  const labels = [...rewards.map(reward => studioRewardLabel2026(reward.rewardId, reward.label, locale)), ...earnedBadges.map(badge => badge.name)];
  const fr = locale === 'fr';
  const badgeOnly = claim.level === null && rewards.length === 0;
  const heading = claim.level !== null ? (fr ? `Niveau ${claim.level} atteint` : `Level ${claim.level} reached`) : rewards.length ? (fr ? 'Objet débloqué' : 'Item unlocked') : (fr ? 'Badge débloqué' : 'Badge unlocked');
  const collectionLabel = badgeOnly ? (fr ? 'Voir mes badges' : 'View my badges') : (fr ? 'Voir la collection' : 'View collection');
  const detail = labels.length ? `${labels.slice(0, 2).join(' · ')}${labels.length > 2 ? (fr ? ` · et ${labels.length - 2} autres` : ` · and ${labels.length - 2} more`) : ''}` : (fr ? 'Tes journées actives font avancer ton parcours.' : 'Your active days advance your journey.');
  return <MomentScene active={active && enabled} heading={heading} detail={detail} locale={locale} count={labels.length} collectionLabel={collectionLabel} onContinue={() => setReceipt(null)} onCollection={() => { setReceipt(null); router.push(badgeOnly ? '/badges' : '/arsenal'); }}>
    {object && firstReward ? <SeasonRewardArtwork2026 object={object} rewardId={firstReward.rewardId} tier={firstReward.tier} size={76} state="earned" locale={locale} /> : firstBadge ? <RewardEmblem variant={rewardVariantForBadgeFamily(firstBadge.family)} tier={firstBadge.tier} level={firstBadge.level} size={78} state="earned" tone="accent" /> : <RewardEmblem variant="orbit" level={claim.level ?? 0} size={78} state="earned" tone="accent" />}
  </MomentScene>;
}

function MomentScene({ active, heading, detail, locale, count, collectionLabel, children, onContinue, onCollection }: {
  active: boolean; heading: string; detail: string; locale: 'fr' | 'en'; count: number; collectionLabel: string;
  children: React.ReactNode; onContinue(): void; onCollection(): void;
}) {
  // Unknown/rejected accessibility preference defaults to a still presentation.
  const [reduce, setReduce] = useState<boolean | null>(null);
  const entrance = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(1)).current;
  const animated = useRef(false);
  useEffect(() => {
    let alive = true; let changed = false;
    if (Platform.OS === 'web') {
      const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      const update = () => { if (alive) setReduce(query?.matches ?? true); };
      update();
      if (query?.addEventListener) query.addEventListener('change', update);
      else query?.addListener(update);
      return () => { alive = false; if (query?.removeEventListener) query.removeEventListener('change', update); else query?.removeListener(update); };
    }
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive && !changed) setReduce(value); }, () => { if (alive && !changed) setReduce(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setReduce(value); });
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    if (!active || reduce !== false) {
      if (!active || reduce === true) animated.current = true;
      entrance.stopAnimation(); ring.stopAnimation(); entrance.setValue(1); ring.setValue(1); return;
    }
    if (animated.current) return;
    animated.current = true;
    entrance.setValue(0); ring.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ring, { toValue: 1, duration: 720, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    animation.start();
    return () => { animation.stop(); entrance.setValue(1); ring.setValue(1); };
  }, [active, reduce, entrance, ring]);
  useEffect(() => { track(EVENTS.celebrationViewed, { surface: 'progress_moment_2026', objects: count }); }, []);
  return <View style={[s.root, !active && s.inactive]} accessibilityLiveRegion="polite" aria-live="polite">
    <View style={s.row}>
      <View style={s.art} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View pointerEvents="none" style={[s.ring, { opacity: ring.interpolate({ inputRange: [0, .45, 1], outputRange: [0, .65, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [.72, 1.15] }) }] }]} />
        <Animated.View style={{ opacity: entrance.interpolate({ inputRange: [0, 1], outputRange: [.45, 1] }), transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }] }}>{children}</Animated.View>
      </View>
      <View style={s.copy}><Text style={s.kicker}>{locale === 'fr' ? 'ÉTAPE FRANCHIE' : 'MILESTONE REACHED'}</Text><Text accessibilityRole="header" style={s.heading}>{heading}</Text><Text style={s.detail}>{detail}</Text></View>
    </View>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" onPress={onContinue} style={s.continue}><Text style={s.continueText}>{locale === 'fr' ? 'Continuer' : 'Continue'}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onCollection} style={s.collection}><Text style={s.collectionText}>{collectionLabel}</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { padding: 16, borderRadius: 24, backgroundColor: c.carbon, marginVertical: 12, gap: 10 },
  inactive: { display: 'none' }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  art: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: c.accent },
  copy: { flex: 1, minWidth: 128, gap: 5 }, kicker: { fontFamily: fonts.textMedium, fontSize: 10, letterSpacing: .9, color: c.darkMuted },
  heading: { fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 27, color: c.darkInk }, detail: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.darkMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  continue: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, justifyContent: 'center', backgroundColor: c.surface },
  continueText: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 20, color: c.ink },
  collection: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 11, justifyContent: 'center' },
  collectionText: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 20, color: c.darkInk },
});
