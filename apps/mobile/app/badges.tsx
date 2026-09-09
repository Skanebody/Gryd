import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydIcon, GrydMark, RewardEmblem, rewardVariantForBadgeFamily } from '../src/ui/gryd';
import { goBack } from '../src/lib/nav';
import { screen } from '../src/lib/analytics';
import { useLocale, useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/badges';
import { useSession } from '../src/lib/session';
import { useMyBadges, type MyBadges } from '../src/features/badges/myBadges';
import { BADGES, BADGE_FAMILIES, BADGE_TIER_LABEL, COLLECTION_BADGES, badgeGauge, badgeRewardLabel, isBadgeProgressMeasured, type BadgeDef, type BadgeFamilyId } from '../src/features/badges/catalog';
import { addToFeatured } from '../src/features/badges/unlockMoment';
import { ProgressAchievementMoment2026 } from '../src/features/refonte/ProgressAchievementMoment2026';
import { FEATURED_BADGE_COUNT, useMyProfile } from '../src/features/social/profileStore';
import { openShareSheet } from '../src/features/share/shareActions';

const visualOf = (badge: BadgeDef, earned: boolean) => rewardVariantForBadgeFamily(badge.family, badge.secret && !earned);

/** A fresh read model per account prevents a previous account's badges flashing on sign-in. */
export default function BadgesScreen() {
  const { session } = useSession();
  return <BadgeAlbum key={session?.user.id ?? 'local'} />;
}

function BadgeAlbum() {
  const locale = useLocale();
  const fr = locale === 'fr';
  const copy = (a: string, b: string) => fr ? a : b;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, configured } = useSession();
  const badges = useMyBadges();
  const [tab, setTab] = useState<'owned' | 'catalogue'>('owned');
  const [family, setFamily] = useState<BadgeFamilyId | 'all'>('all');
  const [selected, setSelected] = useState<BadgeDef | null>(null);
  const personal = !!session && badges.source === 'server' && !badges.loading && !badges.failed;
  const earned = useMemo(() => BADGES.filter(badge => badges.unlockedIds.has(badge.id)), [badges.unlockedIds]);
  const catalogue = useMemo(() => COLLECTION_BADGES.filter(badge => family === 'all' || badge.family === family), [family]);
  const items = tab === 'owned' ? (personal ? earned : []) : catalogue;
  const tileWidth = Math.max(0, Math.min(168, Math.floor((width - 60) / 2)));
  useEffect(() => { screen('badges'); }, []);
  const select = (badge: BadgeDef) => { setSelected(badge); };
  return <View style={s.root}>
    <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy('Retour à ma collection', 'Back to my collection')} onPress={() => goBack('/arsenal')} style={s.iconButton}><GrydIcon name="chevronLeft" size={22} /></Pressable>
        <GrydMark variant="wordmark" size={16} />
        <View style={s.headerSpacer} />
      </View>
      <Text style={s.eyebrow}>{copy('BADGES & SOUVENIRS', 'BADGES & MEMORIES')}</Text>
      <Text style={s.title}>{copy('Badges', 'Badges')}</Text>
      <Text style={s.intro}>{copy('Les souvenirs de tes sorties.', 'Memories from your activities.')}</Text>
      <View accessibilityRole="tablist" style={s.tabs}>
        {(['owned', 'catalogue'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} aria-selected={tab === value} onPress={() => setTab(value)} style={[s.tab, tab === value && s.tabSelected]}>
          <Text style={[s.tabLabel, tab === value && s.tabLabelSelected]}>{value === 'owned' ? copy('Mes badges', 'My badges') : copy('Catalogue', 'Catalogue')}</Text>
          {value === 'owned' && personal && earned.length > 0 && <Text style={[s.tabCount, tab === value && s.tabLabelSelected]}>{earned.length}</Text>}
        </Pressable>)}
      </View>
      {tab === 'owned' ? badges.loading ? <View style={s.empty}><ActivityIndicator color={c.ink} /><Text style={s.body}>{copy('Lecture de tes badges…', 'Loading your badges…')}</Text></View> : badges.failed ? <View style={s.empty}>
        <GrydIcon name="collection" size={36} color={c.muted} /><Text style={s.emptyTitle}>{copy('Tes badges restent à toi.', 'Your badges are still yours.')}</Text><Text style={s.body}>{copy('Nous n’avons pas pu les charger. Tu peux réessayer.', 'We could not load them. You can try again.')}</Text><Action label={copy('Réessayer', 'Try again')} onPress={badges.reload} />
      </View> : !personal ? <View style={s.empty}>
        <GrydMark size={32} color={c.muted} /><Text style={s.emptyTitle}>{copy('Ton histoire t’attend.', 'Your story is waiting.')}</Text><Text style={s.body}>{copy('Retrouve ici les badges réellement gagnés avec ton compte.', 'Find the badges you have earned with your account here.')}</Text>
        {configured && !session ? <Action label={copy('Se connecter', 'Sign in')} onPress={() => router.push('/sign-in')} /> : <Text style={s.body}>{copy('Le compte n’est pas disponible pour le moment.', 'Your account is unavailable right now.')}</Text>}
      </View> : earned.length === 0 ? <View style={s.empty}>
        <GrydMark size={32} color={c.muted} /><Text style={s.emptyTitle}>{copy('Tout commence dehors.', 'It starts outside.')}</Text><Text style={s.body}>{copy('Tes premiers badges apparaîtront ici après leur attribution. Tu n’as rien à rattraper.', 'Your first badges will appear here once awarded. There is nothing to catch up with.')}</Text>
      </View> : null : <>
        <Text style={s.catalogueNote}>{copy('Explore les modèles et leurs conditions.', 'Explore the designs and their requirements.')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {[{ id: 'all' as const, name: copy('Tous', 'All') }, ...BADGE_FAMILIES, { id: 'secret' as const, name: copy('Secrets', 'Secrets') }].map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: family === item.id }} aria-pressed={family === item.id} onPress={() => setFamily(item.id)} style={[s.filter, family === item.id && s.filterSelected]}><Text style={[s.filterLabel, family === item.id && s.filterLabelSelected]}>{item.name}</Text></Pressable>)}
        </ScrollView>
      </>}
      <ProgressAchievementMoment2026 badges={badges} enabled={tab === 'owned' && personal && selected === null} />
      <View style={s.grid}>{items.map(badge => {
        const owned = personal && badges.unlockedIds.has(badge.id);
        const hidden = badge.secret && !owned;
        return <Pressable key={badge.id} accessibilityRole="button" accessibilityLabel={`${hidden ? copy('Badge secret', 'Secret badge') : badge.name}. ${owned ? copy('Obtenu', 'Earned') : copy('Aperçu', 'Preview')}`} onPress={() => select(badge)} style={({ pressed }) => [s.tile, { width: tileWidth }, pressed && s.pressed]}>
          <View style={s.art}><RewardEmblem variant={visualOf(badge, owned)} size={82} level={badge.level} tier={badge.tier} state={owned ? 'earned' : hidden ? 'locked' : 'preview'} tone={owned ? 'accent' : 'neutral'} /></View>
          <Text style={s.badgeName}>{hidden ? copy('À découvrir', 'To discover') : badge.name}</Text>
          <View style={s.badgeMeta}><Text style={s.badgeState}>{hidden ? copy('Secret', 'Secret') : `${BADGE_TIER_LABEL[badge.tier]} · ${owned ? copy('Obtenu', 'Earned') : copy('Aperçu', 'Preview')}`}</Text><GrydIcon name={owned ? 'check' : 'arrowUpRight'} size={14} color={c.muted} /></View>
        </Pressable>;
      })}</View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/arsenal')} style={s.collectionLink}><Text style={s.linkText}>{copy('Retrouver ma collection', 'Back to my collection')}</Text><GrydIcon name="chevronRight" size={20} /></Pressable>
    </ScrollView>
    <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
      <View style={s.backdrop}><View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy('Fermer le détail', 'Close detail')} onPress={() => setSelected(null)} style={[s.iconButton, s.sheetClose]}><GrydIcon name="close" size={24} color={c.darkInk} /></Pressable>
        {selected && <BadgeDetail key={selected.id} badge={selected} personal={personal} badges={badges} close={() => setSelected(null)} />}
      </View></View>
    </Modal>
  </View>;
}

function BadgeDetail({ badge, personal, badges, close }: { badge: BadgeDef; personal: boolean; badges: MyBadges; close(): void }) {
  const locale = useLocale();
  const fr = locale === 'fr';
  const copy = (a: string, b: string) => fr ? a : b;
  const t = useT();
  const { profile, save } = useMyProfile();
  const [busy, setBusy] = useState(false);
  const [shareNote, setShareNote] = useState<'none' | 'copied' | 'unavailable'>('none');
  const owned = personal && badges.unlockedIds.has(badge.id);
  const hidden = badge.secret && !owned;
  const gauge = personal && !owned && !hidden && isBadgeProgressMeasured(badge.id) ? badgeGauge(badge.id, badges.stat(badge.metric)) : null;
  const reward = badgeRewardLabel(badge);
  const featured = addToFeatured(profile.featuredBadgeIds, badge.id, FEATURED_BADGE_COUNT);
  const feature = async () => {
    if (!owned || busy || featured.kind === 'already') return;
    if (featured.kind === 'full') { close(); router.push('/profil-edit'); return; }
    setBusy(true);
    try { await save({ featuredBadgeIds: featured.next }); } finally { setBusy(false); }
  };
  const share = async () => {
    if (!owned || busy) return;
    setShareNote('none');
    const outcome = await openShareSheet(t(C.unlockShareText, { name: badge.name, requirement: badge.requirement }));
    if (outcome.ok && outcome.via === 'clipboard') setShareNote('copied');
    if (!outcome.ok && outcome.reason === 'unavailable') setShareNote('unavailable');
  };
  return <ScrollView contentContainerStyle={s.detailContent}>
    <View style={s.detailArt}><RewardEmblem variant={visualOf(badge, owned)} size={132} level={badge.level} tier={badge.tier} state={owned ? 'earned' : hidden ? 'locked' : 'preview'} tone={owned ? 'accent' : 'neutral'} accessibilityLabel={hidden ? copy('Badge secret verrouillé', 'Locked secret badge') : `${badge.name} · ${BADGE_TIER_LABEL[badge.tier]}`} /></View>
    <Text style={s.detailKicker}>{owned ? copy('DANS TON HISTOIRE', 'IN YOUR HISTORY') : copy('APERÇU DU CATALOGUE', 'CATALOGUE PREVIEW')}</Text>
    <Text style={s.detailTitle}>{hidden ? copy('Un souvenir à découvrir.', 'A memory to discover.') : badge.name}</Text>
    <Text style={s.detailBody}>{hidden ? t(C.secretRequirement) : badge.requirement}</Text>
    {owned && badges.unlockedDates.get(badge.id) ? <Text style={s.detailMeta}>{t(C.stateUnlockedOn, { date: badges.unlockedDates.get(badge.id)! })}</Text> : null}
    {reward && !hidden ? <Text style={s.detailMeta}>{t(C.reward, { reward })}</Text> : null}
    {gauge ? <View style={s.gauge}>
      <Text style={s.detailMeta}>{gauge.value.toLocaleString(locale)} / {gauge.threshold.toLocaleString(locale)}</Text><View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${Math.min(1, Math.max(0, gauge.ratio)) * 100}%` }]} /></View>
    </View> : personal && !owned && !hidden && !isBadgeProgressMeasured(badge.id) ? <Text style={s.detailMeta}>{t(C.progressNotMeasured)}</Text> : null}
    {owned ? <>
      <Action label={featured.kind === 'already' ? copy('Sur mon profil', 'On my profile') : featured.kind === 'full' ? copy('Choisir un badge à remplacer', 'Choose a badge to replace') : copy('Afficher sur mon profil', 'Show on my profile')} disabled={featured.kind === 'already' || busy} onPress={() => void feature()} />
      <Pressable accessibilityRole="button" onPress={() => void share()} style={s.shareLink}><GrydIcon name="share" color={c.darkInk} size={20} /><Text style={s.shareText}>{copy('Partager ce badge', 'Share this badge')}</Text></Pressable>
      {shareNote !== 'none' && <Text style={s.detailMeta}>{t(shareNote === 'copied' ? C.unlockShareCopied : C.unlockShareUnavailable)}</Text>}
    </> : null}
  </ScrollView>;
}

function Action({ label, onPress, disabled = false }: { label: string; onPress(): void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.primary, disabled && s.disabled]}><Text style={[s.primaryText, disabled && { color: c.darkMuted }]}>{label}</Text>{!disabled && <GrydIcon name="arrowUpRight" size={21} />}</Pressable>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.canvas }, content: { paddingHorizontal: 20, width: '100%', maxWidth: 480, alignSelf: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, headerSpacer: { width: 44 }, iconButton: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, eyebrow: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, color: c.muted }, title: { fontFamily: fonts.text, fontSize: 22, lineHeight: 28, letterSpacing: -.6, color: c.ink, marginTop: 8 }, intro: { color: c.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 20, marginTop: 6, maxWidth: 330 }, tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border, marginTop: 14, marginBottom: 12 }, tab: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabSelected: { borderBottomColor: c.ink }, tabLabel: { fontFamily: fonts.textMedium, fontSize: 13, color: c.muted }, tabLabelSelected: { color: c.ink }, tabCount: { fontFamily: fonts.mono, fontSize: 12, color: c.muted }, empty: { minHeight: 196, paddingVertical: 20, alignItems: 'center', justifyContent: 'center', gap: 12 }, emptyTitle: { fontFamily: fonts.text, fontSize: 20, letterSpacing: -.3, color: c.ink, textAlign: 'center' }, body: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.muted, textAlign: 'center' }, primary: { marginTop: 14, alignSelf: 'stretch', borderRadius: 17, minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.accent, flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between' }, primaryText: { fontFamily: fonts.textSemi, fontSize: 13, color: c.ink, flexShrink: 1 }, disabled: { backgroundColor: c.darkSurfaceMuted }, catalogueNote: { fontFamily: fonts.text, fontSize: 12, lineHeight: 19, color: c.muted }, filters: { gap: 8, paddingVertical: 14 }, filter: { minHeight: 44, borderRadius: 22, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: c.surface }, filterSelected: { backgroundColor: c.ink }, filterLabel: { fontFamily: fonts.text, fontSize: 12, color: c.muted }, filterLabelSelected: { color: c.darkInk }, grid: { gap: 12 }, gridRow: { flexDirection: 'row', gap: 12 }, tileSpacer: { flex: 1, minWidth: 0 }, tile: { flex: 1, minWidth: 0, minHeight: 168, padding: 12, borderRadius: 24, backgroundColor: c.surface }, art: { alignItems: 'center', justifyContent: 'center', minHeight: 88 }, badgeName: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink, marginTop: 4 }, badgeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 9 }, badgeState: { flexShrink: 1, fontFamily: fonts.text, fontSize: 12, lineHeight: 17, color: c.muted }, pressed: { opacity: .7 }, collectionLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, gap: 16 }, linkText: { fontFamily: fonts.textMedium, fontSize: 14, color: c.ink, flexShrink: 1 }, newRow: { flexDirection: 'row', padding: 14, backgroundColor: c.carbon, borderRadius: 24, alignItems: 'center', gap: 12, marginBottom: 14 }, flex: { flex: 1 }, newTitle: { fontFamily: fonts.textMedium, fontSize: 14, color: c.darkInk }, newMeta: { fontFamily: fonts.text, fontSize: 13, color: c.darkMuted, marginTop: 6 }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim }, sheet: { backgroundColor: c.carbon, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingHorizontal: 20 }, sheetClose: { alignSelf: 'flex-end', marginTop: 12 }, detailContent: { paddingBottom: 12 }, detailArt: { alignItems: 'center' }, detailKicker: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: .8, color: c.darkMuted, marginTop: 12 }, detailTitle: { fontFamily: fonts.text, fontSize: 20, lineHeight: 26, letterSpacing: -.4, color: c.darkInk, marginTop: 16 }, detailBody: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.darkInk, marginTop: 12 }, detailMeta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 20, color: c.darkMuted, marginTop: 16 }, gauge: { gap: 10, marginTop: 10, marginBottom: 16 }, gaugeTrack: { height: 3, borderRadius: 2, backgroundColor: c.darkSurfaceMuted }, gaugeFill: { height: 3, backgroundColor: c.accent }, shareLink: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', gap: 12, alignItems: 'center', marginTop: 12 }, shareText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.darkInk },
});
