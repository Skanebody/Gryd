import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c, SEASON_REWARDS_2026 } from '@klaim/shared';
import { useArsenalInventory, itemByKey, type ArsenalCatalogItem } from '../arsenal';
import { arsenalName, arsenalDescription } from '../arsenal/copy';
import { ArsenalPreview } from '../arsenal/preview';
import { useMyBadges } from '../badges/myBadges';
import { useLocale, useT } from '../../i18n/store';
import { C as QUESTS } from '../../i18n/catalog/defisSemaine';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { screen } from '../../lib/analytics';
import { CommercialCollectionsPanel2026 } from './CommercialCollectionsPanel2026';
import { resolveStudioObject2026, seasonObjectPreview2026, type StudioObject2026, type StudioObjectRequest2026 } from '../share/studioObjects2026';
import { requestStudioObject2026 } from '../share/studioObjectSelection2026';
import { GrydIcon } from '../../ui/gryd';
import { rewardLabel2026 } from './SeasonJourneyScreen';
import { useProfileProgress } from './ProfileProgress';
import { SeasonCollections2026 } from './SeasonCollections2026';
import { useWeeklyQuests2026 } from './WeeklyQuests2026Data';
import { QUEST_REWARD_KIND_COPY_2026 } from './WeeklyQuests2026Model';
import type { WeeklyQuestObject2026 } from './WeeklyQuests2026Model';
import { ownedObjectsTotal2026, questObjectsSection2026 } from './collectionQuestObjects2026';
import { SeasonalIdentity2026 } from './SeasonalIdentity2026';
import { LevelRewardArtwork2026, SeasonRewardArtwork2026 } from './SeasonRewardArtwork2026';
import { canRenderSeasonIdentity2026 } from './seasonIdentityModel2026';
import { ProfileButton, ProfileLink, ProfilePage, ProfileSegments, s, useRefonteCopy } from './ProfilePrimitives';
import { AccountDoor2026 } from '../account/AccountDoor2026';
import { CosmeticsPanel2026 } from '../arsenal/CosmeticsPanel2026';
const COSMETIC_SECTIONS = new Set(['frames', 'skins_trace', 'templates', 'emblems', 'banners', 'skins_territory']);

export function CollectionScreen() {
  const { session, loading } = useSession();
  // Legacy inventory hooks have local caches: remount them on identity changes.
  return <CollectionContents key={loading ? 'restoring-session' : session?.user.id ?? 'anonymous'} />;
}
function CollectionContents() {
  const { width } = useWindowDimensions();
  const [galleryWidth, setGalleryWidth] = useState(0);
  const tileWidth = Math.max(0, Math.floor((galleryWidth - 12) / 2));
  const objectWidth = Math.min(110, Math.max(1, tileWidth - 24));
  const copy = useRefonteCopy(); const t = useT(); const locale = useLocale(); const { session } = useSession();
  const inventory = useArsenalInventory(); const badges = useMyBadges(); const progress = useProfileProgress();
  // §7.5 — les objets gagnés aux défis de la semaine sont possédés, permanents
  // et équipables : les taire ici ferait mentir le compteur d'objets obtenus.
  const quests = useWeeklyQuests2026(); const [questNotice, setQuestNotice] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  // Trois segments depuis le lot « personnalisation » : les objets gagnés, la
  // personnalisation du profil, et les collections (où l'achat vit déjà).
  const [segment, setSegment] = useState<'owned' | 'cosmetics' | 'collections'>('owned');
  const [selectedId, setSelectedId] = useState<string | null>(null); const [legacyItem, setLegacyItem] = useState<ArsenalCatalogItem | null>(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { screen('arsenal'); }, []);
  const rewards = progress.data?.ownedRewards ?? [];
  // §7.2 — les objets de niveau viennent du serveur (0144) au même titre que
  // les objets de saison. Un catalogue coché n'entre jamais dans cette liste.
  const levelRewards = progress.data?.levelRewards ?? [];
  const levelEdition = (level: number) => copy(`Niveau ${level}`, `Level ${level}`);
  const studioLevelRewards = levelRewards.map(reward => ({ rewardId: reward.rewardId, label: reward.label, level: reward.level, edition: levelEdition(reward.level) }));
  const selected = rewards.find(reward => reward.id === selectedId) ?? null;
  const selectedLevel = levelRewards.find(reward => reward.id === selectedId) ?? null;
  const collection = selected ? progress.data?.collections.find(item => item.id === selected.collectionId) : null;
  const selectedRequest:StudioObjectRequest2026|null=selected?{kind:'season',collectionId:selected.collectionId,rewardId:selected.rewardId,variant:selected.variant}:selectedLevel?{kind:'level',rewardId:selectedLevel.rewardId}:null;
  const selectedObject=resolveStudioObject2026(selectedRequest,rewards,[],progress.data?.collections??[],studioLevelRewards);
  const legacy = [...inventory.ownedKeys].map(itemByKey).filter((item): item is ArsenalCatalogItem => !!item && !item.consumable && COSMETIC_SECTIONS.has(item.section));
  const equipped = [...rewards, ...levelRewards].filter(reward => reward.equipped);
  const tiles: { id: string; serial: string; name: string; edition: string; equipped: boolean; level: boolean; rewardId: string; object: StudioObject2026 | null }[] = [
    ...rewards.map(reward => ({ id: reward.id, serial: String(reward.tier).padStart(2, '0'), name: rewardLabel2026(reward.rewardId, reward.label, locale),
      edition: reward.variant === 'premium' ? copy('Édition GRYD+', 'GRYD+ edition') : copy('Édition standard', 'Standard edition'),
      equipped: reward.equipped, level: false, rewardId: reward.rewardId,
      object: resolveStudioObject2026({ kind: 'season', collectionId: reward.collectionId, rewardId: reward.rewardId, variant: reward.variant }, rewards, [], progress.data?.collections ?? []) })),
    ...levelRewards.map(reward => ({ id: reward.id, serial: String(reward.level).padStart(2, '0'), name: rewardLabel2026(reward.rewardId, reward.label, locale),
      edition: levelEdition(reward.level), equipped: reward.equipped, level: true, rewardId: reward.rewardId,
      object: resolveStudioObject2026({ kind: 'level', rewardId: reward.rewardId }, rewards, [], progress.data?.collections ?? [], studioLevelRewards) })),
  ];
  const questSection = questObjectsSection2026(quests.status, quests.data?.objects);
  const owned = ownedObjectsTotal2026(tiles.length, questSection);
  async function toggleQuestObject(object: WeeklyQuestObject2026) {
    setQuestNotice(null);
    const result = await quests.equip(object.rewardId, !object.equipped);
    if (result.ok) return;
    setQuestNotice(t(result.reason.includes('reward_not_owned') ? QUESTS.erreurNonPossede
      : result.reason.includes('authentication_required') ? QUESTS.erreurSession : QUESTS.erreurAction));
  }
  async function equipSelected() {
    const equippableSeason = selected && canRenderSeasonIdentity2026(selected.rewardId);
    const equippableLevel = selectedLevel?.equippable === true;
    if (!supabase || busy || !equippableSeason && !equippableLevel) return;
    setBusy(true); setNotice(null);
    try {
      const result = selectedLevel
        ? selectedLevel.equipped ? await supabase.rpc('unequip_level_reward_2026', { p_reward_id: selectedLevel.rewardId }) : await supabase.rpc('equip_level_reward_2026', { p_reward_id: selectedLevel.rewardId })
        : selected!.equipped ? await supabase.rpc('unequip_season_reward_2026', { p_reward_id: selected!.rewardId }) : await supabase.rpc('equip_season_reward_2026', { p_collection_id: selected!.collectionId, p_reward_id: selected!.rewardId, p_variant: selected!.variant });
      if (result.error) throw result.error;
      progress.reload(); setSelectedId(null);
    } catch { setNotice(copy('Le choix n’a pas pu être enregistré. Réessaie.', 'Your choice could not be saved. Try again.')); }
    finally { setBusy(false); }
  }
  const close = () => { if (!busy) { setSelectedId(null); setLegacyItem(null); setNotice(null); } };
  return <>
    <ProfilePage tone="light" title={copy('Collection', 'Collection')} back>
      <ProfileSegments tone="light" value={segment} onChange={setSegment} options={[{ key: 'owned', label: copy('Mes objets', 'My objects') }, { key: 'cosmetics', label: copy('Personnalisation', 'Personalisation') }, { key: 'collections', label: copy('Collections', 'Collections') }]} />
      {segment === 'cosmetics' ? <CosmeticsPanel2026 /> : segment === 'collections' ? <><CommercialCollectionsPanel2026 tone="light" locale={locale==='en'?'en':'fr'}/>{progress.data?<SeasonCollections2026 tone="light" progress={progress.data} reload={progress.reload} locale={locale}/>:null}</> : progress.status === 'loading' ? <View style={local.loading}><ActivityIndicator size="small" color={c.ink} /><Text style={local.meta}>{copy('Lecture de tes objets…', 'Loading your objects…')}</Text></View> : progress.status === 'signed-out' ? <>
        <View style={local.intro}><Text style={local.introTitle}>{copy('Des éditions à garder.', 'Editions to keep.')}</Text><Text style={local.meta}>{copy('Des objets gagnés au fil des sorties, conservés dans ton compte.', 'Objects earned through your activities and kept in your account.')}</Text></View>
        <CataloguePreview locale={locale} />
        <AccountDoor2026 tone="light" reason={copy('Ces objets sont des aperçus de la collection. Ton compte est ce qui garde les tiens.', 'These are collection previews. Your account is what keeps the ones you earn.')} />
        <ProfileLink tone="light" title={copy('Découvrir les étapes', 'Explore the milestones')} icon="niveau" onPress={() => router.push('/season')} />
      </> : progress.status !== 'ready' ? <View style={local.empty}><Text style={local.meta}>{copy('Tes collections sont indisponibles pour le moment.', 'Your collections are currently unavailable.')}</Text><View style={local.compactAction}><ProfileButton tone="light" label={copy('Réessayer', 'Retry')} secondary onPress={progress.reload} /></View></View> : <>
        <View style={local.inventoryHeader}><View style={local.total}><Text style={local.count}>{owned.count}</Text><Text style={local.meta}>{copy(owned.count === 1 ? 'objet obtenu' : 'objets obtenus', owned.count === 1 ? 'object earned' : 'objects earned')}</Text></View>{equipped.length > 0 ? <Text style={local.meta}>{copy(equipped.length === 1 ? '1 sur le profil' : `${equipped.length} sur le profil`, equipped.length === 1 ? '1 on profile' : `${equipped.length} on profile`)}</Text> : null}</View>
        {equipped.length > 0 && progress.data ? <View style={local.identity}><SeasonalIdentity2026 rewards={rewards} levelRewards={levelRewards} collections={progress.data.collections} size={42} /><View style={local.identityText}><Text style={[local.rowTitle, { color: c.darkInk }]}>{copy('Ton identité équipée', 'Your equipped identity')}</Text><Text style={[local.meta, { color: c.darkMuted }]}>{copy('Conservée sans abonnement.', 'Kept without a subscription.')}</Text></View></View> : null}
        {owned.count === 0 && owned.complete ? <><CataloguePreview locale={locale} /><Text style={local.previewNote}>{copy('Aperçus · tes premiers objets apparaîtront ici.', 'Previews · your first objects will appear here.')}</Text><ProfileLink tone="light" title={copy('Voir ma progression', 'View progression')} icon="niveau" onPress={() => router.push('/season')} /></> : tiles.length === 0 ? null : <View style={local.grid} onLayout={event => setGalleryWidth(event.nativeEvent.layout.width)}>{galleryWidth > 0 && twoColumns(tiles).map((pair, index) => <View key={index} style={local.gridRow}>{pair.map(tile => <Pressable key={tile.id} accessibilityRole="button" accessibilityLabel={`${tile.name} · ${tile.edition} · ${copy('Possédé', 'Owned')}`} onPress={() => { setSelectedId(tile.id); setNotice(null); }} style={[local.tile, local.gridItem]}>
          <View style={local.tileTop}><Text style={local.meta}>{tile.serial}</Text>{tile.equipped ? <GrydIcon name="check" size={18} color={c.ink} /> : <GrydIcon name="arrowUpRight" size={18} color={c.muted} />}</View>
          <View style={local.art}>{tile.object ? tile.level ? <LevelRewardArtwork2026 object={tile.object} rewardId={tile.rewardId} size={objectWidth} state="earned" locale={locale==='en'?'en':'fr'}/> : <SeasonRewardArtwork2026 object={tile.object} rewardId={tile.rewardId} tier={Number(tile.serial)} size={objectWidth} state="earned" locale={locale==='en'?'en':'fr'}/> : null}</View>
          <Text style={local.name}>{tile.name}</Text><Text style={local.meta}>{tile.edition}</Text>
        </Pressable>)}{pair.length === 1 ? <View style={local.gridItem} /> : null}</View>)}</View>}
        {questSection.kind === 'absent' ? null : <View style={local.quests}>
          <Text style={local.rowTitle}>{t(QUESTS.sectionObjets)}</Text>
          {questSection.kind === 'loading' ? <View style={local.loading}><ActivityIndicator size="small" color={c.ink} /><Text style={local.meta}>{t(QUESTS.etatLecture)}</Text></View>
            : questSection.kind === 'failed' ? <Text style={local.previewNote}>{t(QUESTS.etatEchec)}</Text>
              : questSection.kind === 'empty' ? <Text style={local.previewNote}>{t(QUESTS.objetsVides)}</Text>
                : questSection.objects.map(object => <View key={object.rewardId} style={local.legacy}>
                  <GrydIcon name={object.equipped ? 'check' : 'collection'} size={20} color={object.equipped ? c.ink : c.muted} />
                  <View style={s.flex}><Text style={local.rowTitle}>{object.label}</Text><Text style={local.meta}>{t(QUEST_REWARD_KIND_COPY_2026[object.kind])}{' · '}{object.equipped ? t(QUESTS.etatEquipe) : t(QUESTS.objetPermanent)}</Text></View>
                  <Pressable accessibilityRole="button" accessibilityState={{ disabled: quests.busy }} disabled={quests.busy} onPress={() => { void toggleQuestObject(object); }} style={local.questAction}><Text style={local.questActionText}>{object.equipped ? t(QUESTS.actionRetirer) : t(QUESTS.actionEquiper)}</Text></Pressable>
                </View>)}
          {questNotice ? <Text accessibilityRole="alert" style={local.body}>{questNotice}</Text> : null}
        </View>}
      </>}
      {segment === 'owned' ? <View style={local.utilities}>
        <ProfileLink tone="light" title={copy('Créer depuis une sortie', 'Create from an activity')} subtitle={copy('Studio · affiches et Replay', 'Studio · posters and Replay')} icon="partage" onPress={() => router.push('/partage')} />
        {session ? <>
          {badges.loading ? <View style={local.loading}><ActivityIndicator size="small" color={c.ink} /><Text style={local.meta}>{copy('Lecture des badges…', 'Loading badges…')}</Text></View> : badges.failed ? <Text style={local.previewNote}>{copy('Les badges sont indisponibles.', 'Badges are unavailable.')}</Text> : <ProfileLink tone="light" title={copy('Badges', 'Badges')} subtitle={copy(`${badges.unlockedIds.size} obtenus`, `${badges.unlockedIds.size} earned`)} icon="badge" onPress={() => router.push('/badges')} />}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showLegacy }} aria-expanded={showLegacy} onPress={() => setShowLegacy(value => !value)} style={local.disclosure}><Text style={local.rowTitle}>{copy('Objets antérieurs', 'Earlier objects')}</Text><GrydIcon name={showLegacy ? 'minus' : 'plus'} size={18} color={c.muted} /></Pressable>
          {showLegacy ? inventory.loading ? <ActivityIndicator size="small" color={c.ink} /> : inventory.source !== 'server' ? <Text style={local.previewNote}>{copy('Les objets antérieurs sont indisponibles.', 'Earlier objects are unavailable.')}</Text> : legacy.length === 0 ? <Text style={local.previewNote}>{copy('Aucun objet antérieur dans cet inventaire.', 'No earlier objects in this inventory.')}</Text> : legacy.map(item => <Pressable key={item.key} accessibilityRole="button" onPress={() => setLegacyItem(item)} style={local.legacy}><ArsenalPreview item={item} size={44} /><View style={s.flex}><Text style={local.rowTitle}>{arsenalName(item, t)}</Text><Text style={local.meta}>{copy('Possédé · permanent', 'Owned · permanent')}</Text></View><GrydIcon name="chevronRight" size={18} color={c.muted} /></Pressable>) : null}
        </> : null}
      </View> : null}
    </ProfilePage>
    <Modal visible={selected !== null || selectedLevel !== null || legacyItem !== null} transparent animationType="slide" onRequestClose={close}>
      <View style={local.backdrop}><View style={local.sheet}><ScrollView contentContainerStyle={s.gap}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy('Fermer', 'Close')} disabled={busy} onPress={close} style={local.close}><GrydIcon name="close" size={20} color={c.ink} /></Pressable>
        {selectedLevel ? <>
          <View style={local.detailArt}>{selectedObject?<LevelRewardArtwork2026 object={selectedObject} rewardId={selectedLevel.rewardId} size={Math.min(220, Math.max(1, width - 104))} state="earned" locale={locale==='en'?'en':'fr'}/>:null}</View>
          <Text style={local.detailTitle}>{rewardLabel2026(selectedLevel.rewardId, selectedLevel.label, locale)}</Text>
          <Text style={local.meta}>{levelEdition(selectedLevel.level)}</Text>
          <View style={local.facts}><Text style={local.meta}>{copy(`Obtenu au niveau ${selectedLevel.level}`, `Earned at level ${selectedLevel.level}`)}</Text><Text style={local.meta}>{copy('Objet permanent · inclus, sans achat', 'Permanent object · included, no purchase')}</Text><Text style={local.meta}>{copy('Obtenu le ', 'Earned on ')}{new Date(selectedLevel.earnedAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View>
          {selectedLevel.equippable
            ? <ProfileButton tone="light" label={selectedLevel.equipped ? copy('Retirer du profil', 'Remove from profile') : copy('Équiper sur mon profil', 'Equip on profile')} busy={busy} onPress={() => void equipSelected()} />
            : <Text style={local.meta}>{copy('Cet objet reste acquis. Sa composition de partage arrivera dans le Studio.', 'This object stays yours. Its sharing template will arrive in the Studio.')}</Text>}
          {notice ? <Text accessibilityRole="alert" style={local.body}>{notice}</Text> : null}
        </> : selected ? <>
          <View style={local.detailArt}>{selectedObject?<SeasonRewardArtwork2026 object={selectedObject} rewardId={selected.rewardId} tier={selected.tier} size={Math.min(220, Math.max(1, width - 104))} state="earned" locale={locale==='en'?'en':'fr'}/>:null}</View>
          {!canRenderSeasonIdentity2026(selected.rewardId) ? <Text style={local.meta}>{copy('Aperçu du modèle. La création utilisera les données de la sortie choisie.','Template preview. Your creation will use the selected activity’s data.')}</Text> : null}
          <Text style={local.detailTitle}>{rewardLabel2026(selected.rewardId, selected.label, locale)}</Text>
          <Text style={local.meta}>{collection?.title ?? selected.collectionId}</Text>
          <View style={local.facts}><Text style={local.meta}>{copy('Palier', 'Tier')} {selected.tier}</Text><Text style={local.meta}>{selected.variant === 'premium' ? copy('Variante artistique GRYD+', 'GRYD+ artistic variant') : copy('Édition standard', 'Standard edition')}</Text><Text style={local.meta}>{copy('Obtenu le ', 'Earned on ')}{new Date(selected.earnedAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View>
          <Text style={local.meta}>{copy('Cet objet reste à toi après la fin de GRYD+.', 'This object stays yours after GRYD+ ends.')}</Text>
          {canRenderSeasonIdentity2026(selected.rewardId) ? <ProfileButton tone="light" label={selected.equipped ? copy('Retirer du profil', 'Remove from profile') : copy('Équiper sur mon profil', 'Equip on profile')} busy={busy} onPress={() => void equipSelected()} /> : <ProfileButton tone="light" label={copy('Créer avec cet objet','Create with this object')} onPress={()=>{if(session&&selectedRequest&&requestStudioObject2026(selectedRequest,session.user.id)){close();router.push('/partage');}}}/>}
          {notice ? <Text accessibilityRole="alert" style={local.body}>{notice}</Text> : null}
        </> : legacyItem ? <><View style={local.detailArt}><ArsenalPreview item={legacyItem} size={72} /></View><Text style={local.detailTitle}>{arsenalName(legacyItem, t)}</Text><Text style={local.body}>{arsenalDescription(legacyItem, t)}</Text><Text style={local.meta}>{copy('Objet conservé ; son équipement n’est pas disponible ici.', 'Object kept; equipping it is not available here.')}</Text></> : null}
      </ScrollView></View></View>
    </Modal>
  </>;
}
/** Published catalogue entries only: previews never masquerade as ownership. */
function CataloguePreview({ locale }: { locale: string }) {
  const copy = useRefonteCopy(); const [measuredWidth, setMeasuredWidth] = useState(0);
  const tileWidth = Math.max(0, Math.floor((measuredWidth - 12) / 2)), artWidth = Math.min(110, Math.max(1, tileWidth - 24));
  const editions = [SEASON_REWARDS_2026[0], SEASON_REWARDS_2026[3], SEASON_REWARDS_2026[7]];
  return <View style={local.catalogue} onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}>{measuredWidth > 0 && twoColumns(editions).map((pair, index) => <View key={index} style={local.gridRow}>{pair.map(item => {const object=seasonObjectPreview2026(item,locale==='en'?'Season':'Saison')!;return <View key={item.id} style={[local.catalogueItem, local.gridItem]} accessible accessibilityLabel={`${rewardLabel2026(item.id, item.label, locale)} · ${copy('Aperçu', 'Preview')}`}><Text style={local.previewTag}>{copy('Aperçu', 'Preview')}</Text><View style={local.art}><SeasonRewardArtwork2026 object={object} rewardId={item.id} tier={item.tier} size={artWidth} state="preview" locale={locale==='en'?'en':'fr'} /></View><Text style={local.catalogueName}>{rewardLabel2026(item.id, item.label, locale)}</Text></View>;})}{pair.length === 1 ? <View style={local.gridItem} /> : null}</View>)}</View>;
}
/** Pair rows keep the browser's subpixel widths inside flex layout, without wrapping arithmetic. */
function twoColumns<T>(items: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, index) => items.slice(index * 2, index * 2 + 2));
}
const local = StyleSheet.create({
  gridRow: { flexDirection: 'row', gap: 12 }, gridItem: { flex: 1, minWidth: 0 },
  intro: { paddingTop: 12, paddingBottom: 14, gap: 6 }, introTitle: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -.5, color: c.ink }, meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted }, body: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.ink }, guest: { paddingVertical: 14, gap: 12, alignItems: 'flex-start' }, compactAction: { alignSelf: 'flex-start' }, loading: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 16 },
  catalogue: { gap: 12 }, catalogueItem: { backgroundColor: c.surface, borderRadius: 24, padding: 12, gap: 6 }, catalogueName: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink }, previewTag: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted }, previewNote: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted, paddingVertical: 16 },
  inventoryHeader: { paddingVertical: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }, total: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }, count: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, color: c.ink, fontVariant: ['tabular-nums'] }, identity: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 16, marginBottom: 16, borderRadius: 24, backgroundColor: c.carbon }, identityText: { flex: 1, minWidth: 140, gap: 5 }, empty: { padding: 16, backgroundColor: c.surface, borderRadius: 24, gap: 14, marginTop: 16 }, grid: { gap: 12 }, tile: { backgroundColor: c.surface, borderRadius: 24, padding: 12, gap: 6 }, tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 }, art: { minHeight: 100, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 }, posterObject: { overflow: 'hidden', borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }, name: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink }, utilities: { marginTop: 16, marginBottom: 12, backgroundColor: c.surface, borderRadius: 24, paddingHorizontal: 16 }, rowTitle: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink }, disclosure: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border }, legacy: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  quests: { marginTop: 16, backgroundColor: c.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, gap: 4 }, questAction: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 }, questActionText: { fontFamily: fonts.textSemi, fontSize: 13, color: c.ink },
  detailTitle: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, color: c.ink }, backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' }, sheet: { padding: 20, paddingBottom: 38, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.surface, maxHeight: '90%' }, close: { height: 44, width: 44, borderRadius: 22, backgroundColor: c.canvas, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center' }, detailArt: { alignItems: 'center', paddingVertical: 8 }, facts: { gap: 8, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
});
