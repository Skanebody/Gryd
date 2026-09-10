import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PROGRESSION_RULES_2026 as rules, refonteColors as c } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { RewardEmblem, REWARD_VARIANTS } from '../../ui/gryd';
import type { ProfileProgress2026 } from './ProfileProgress';
import { ProfileButton, ProfileSection, s, useRefonteCopy } from './ProfilePrimitives';
import { formatCivilDay2026, readableTimeZone2026 } from './SeasonPresentation2026';

export function SeasonCollections2026({ progress, reload, locale, tone = 'dark' }: { progress: ProfileProgress2026; reload: () => void; locale: string; tone?: 'dark' | 'light' }) {
  const copy = useRefonteCopy();
  const light = tone === 'light', ink = light ? c.ink : c.darkInk, muted = light ? c.muted : c.darkMuted;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function mutate(name: 'select_progress_collection_2026' | 'set_progress_timezone_2026', args: Record<string, string>) {
    if (!supabase || busy) return;
    setBusy(true); setNotice(null);
    try {
      const result = await supabase.rpc(name, args);
      if (result.error) throw result.error;
      setNotice(name === 'select_progress_collection_2026' ? copy('Choix enregistré pour ta prochaine journée.', 'Choice saved for your next day.') : copy('Le changement de fuseau est enregistré pour la prochaine semaine.', 'Time zone change saved for next week.'));
      reload();
    } catch { setNotice(copy('Le choix n’a pas pu être enregistré. Réessaie.', 'Your choice could not be saved. Try again.')); }
    finally { setBusy(false); }
  }
  return <View>
    {progress.pending ? <Text accessibilityLiveRegion="polite" style={[s.meta, { color: muted, marginTop: 18 }]}>{copy('Tes dernières sorties sont en cours de vérification. Les totaux affichés sont les derniers confirmés.', 'Your latest activities are being checked. These are your last confirmed totals.')}</Text> : null}
    <ProfileSection tone={tone} title={copy('Mes collections', 'My collections')} />
    {progress.collections.length ? progress.collections.map((collection, collectionIndex) => {
      const selected = collection.id === progress.selectedCollectionId;
      const pending = collection.id === progress.pendingSelection?.collectionId;
      return <Pressable key={collection.id} accessibilityRole="button" accessibilityState={{ selected, disabled: busy || selected || !collection.selectable }} aria-pressed={selected} disabled={busy || selected || !collection.selectable}
        onPress={() => void mutate('select_progress_collection_2026', { p_collection_id: collection.id })}
        style={{ paddingVertical: 18, paddingHorizontal: light ? 18 : 0, backgroundColor: light ? c.surface : 'transparent', borderRadius: light ? 24 : 0, marginBottom: light ? 12 : 0, borderBottomWidth: light ? 0 : 1, borderColor: c.darkSurfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RewardEmblem variant={REWARD_VARIANTS[collectionIndex % REWARD_VARIANTS.length]!} size={58} level={collection.stage} state="preview" tone={selected ? 'accent' : 'neutral'} />
        <View style={s.flex}><Text style={[s.linkTitle, { color: ink }]}>{collection.title}</Text>
          <Text style={[s.meta, { color: muted }]}>{collection.state === 'archived' ? copy('Archive', 'Archive') : collection.state === 'current' ? copy('En cours', 'Current') : copy('À venir', 'Upcoming')} · {new Date(collection.startsAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}{copy(' au ', ' — ')}{new Date(collection.endsAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</Text>
          <Text style={[s.meta, { color: muted }]}>{selected ? copy('Collection suivie', 'Selected collection') : pending ? copy(`À partir du ${formatCivilDay2026(progress.pendingSelection!.effectiveDay, locale)}`, `From ${formatCivilDay2026(progress.pendingSelection!.effectiveDay, locale)}`) : collection.selectable ? copy('Toucher pour suivre cette collection', 'Tap to follow this collection') : copy('Cette collection n’a pas été commencée.', 'This collection has not been started.')}</Text>
        </View>
        <Text style={[s.linkTitle, { color: ink }]}>{collection.stage}/{rules.seasonTierCount}</Text>
      </Pressable>;
    }) : <Text style={[s.body, { color: ink }]}>{copy('Le calendrier de la prochaine collection sera annoncé ici. Ton parcours permanent continue.', 'The next collection calendar will appear here. Your permanent journey continues.')}</Text>}
    <Text style={[s.meta, { color: muted, marginTop: 14 }]}>{copy('Un changement s’applique le lendemain. Une archive commencée peut être reprise, et tous les objets gagnés restent acquis.', 'Changes apply the following day. You can resume a started archive and keep every earned object.')}</Text>
    <ProfileSection tone={tone} title={copy('Mon rythme', 'My rhythm')} />
    <Text style={[s.body, { color: ink }]}>{readableTimeZone2026(progress.timeZone)}</Text>
    {progress.pendingTimeZone ? <Text style={[s.meta, { color: muted }]}>{copy('Prochain fuseau', 'Next time zone')} : {readableTimeZone2026(progress.pendingTimeZone.timeZone)} · {new Date(progress.pendingTimeZone.effectiveAt).toLocaleDateString(locale)}</Text> : null}
    {deviceZone && deviceZone !== progress.timeZone && deviceZone !== progress.pendingTimeZone?.timeZone ? <View style={{ marginTop: 12 }}><ProfileButton tone={tone} secondary busy={busy} label={copy(`Utiliser ${readableTimeZone2026(deviceZone)}`, `Use ${readableTimeZone2026(deviceZone)}`)} onPress={() => void mutate('set_progress_timezone_2026', { p_time_zone: deviceZone })} /></View> : null}
    <Text style={[s.meta, { color: muted, marginTop: 8 }]}>{copy('Le fuseau fixe tes journées actives. Un changement prend effet la semaine suivante.', 'Your time zone defines active days. Changes take effect the following week.')}</Text>
    {notice ? <Text accessibilityRole="alert" style={[s.meta, { color: muted, marginTop: 12 }]}>{notice}</Text> : null}
  </View>;
}
