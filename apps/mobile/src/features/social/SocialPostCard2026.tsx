import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydIcon, type GrydIconName } from '../../ui/gryd';
import { useLocale } from '../../i18n/store';
import { haptics } from '../../lib/haptics';
import { s, useRefonteCopy } from '../refonte/ProfilePrimitives';
import { useSocialMedia2026 } from './social2026Data';
import { myReaction2026, reactionCount2026, SOCIAL_REACTION_KINDS_2026, type SocialPost2026, type SocialPerson2026, type SocialReactionKind2026 } from './social2026Model';
export function SocialAvatar2026({ person, size = 38 }: { person: SocialPerson2026; size?: number }) {
 const url = useSocialMedia2026(person.avatarPath);
 return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.darkSurfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{url ? <Image source={{ uri: url }} style={{ width: size, height: size }} /> : <Text style={s.linkTitle}>{person.name?.slice(0, 1) ?? '·'}</Text>}</View>;
}
/**
 * §13.4 — « Réactions limitées et humaines : encouragement, merci, à la
 * prochaine. » Trois, nommées, sobres, et pas une de plus : la liste est fermée
 * ici comme elle l'est en base (CHECK de 0153), donc pas d'emoji libre, pas de
 * modération d'emoji à inventer, pas de réaction qui se lise comme une moquerie.
 *
 * LIMITÉES : une personne pose UNE réaction. Taper une autre REMPLACE — c'est
 * le serveur qui l'arbitre (clé primaire (post, personne)), et l'écran le dit en
 * n'allumant jamais deux pastilles à la fois. Le cahier demande plus RICHE, pas
 * plus ABONDANT.
 *
 * Chaque réaction porte un GLYPHE DISTINCT **et** son libellé (L15 : jamais la
 * couleur seule). Le compteur n'apparaît qu'au-dessus de zéro : « 0 merci »
 * n'apprend rien et se lit comme un reproche.
 */
const REACTION_GLYPHS: Readonly<Record<SocialReactionKind2026, GrydIconName>> = {
 cheer: 'spark', thanks: 'heart', next_time: 'replay',
};

export function SocialPostCard2026({ post, onOpen, onReact, busy = false, tone = 'dark' }: { post: SocialPost2026; onOpen: () => void; onReact?: (kind: SocialReactionKind2026) => void; busy?: boolean; tone?: 'light' | 'dark' }) {
 const copy = useRefonteCopy(); const locale = useLocale(); const media = useSocialMedia2026(post.mediaPath);
 const ink = tone === 'light' ? c.ink : c.darkInk, muted = tone === 'light' ? c.muted : c.darkMuted;
 const disabled = busy || !onReact;
 const mine = myReaction2026(post);
 const label = (kind: SocialReactionKind2026) => kind === 'cheer' ? copy('Encouragement', 'Cheer') : kind === 'thanks' ? copy('Merci', 'Thanks') : copy('À la prochaine', 'Next time');
 const react = (kind: SocialReactionKind2026) => { haptics.light(); onReact?.(kind); };
 return <View style={[styles.post, { borderColor: tone === 'light' ? c.border : c.darkSurfaceMuted }]}>
  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/member', params: { userId: post.author.id } })} style={styles.identity}><SocialAvatar2026 person={post.author} /><View style={s.flex}><Text style={[styles.name, { color: ink }]}>{post.author.name}</Text><Text style={[styles.meta, { color: muted }]}>{new Date(post.createdAt).toLocaleDateString(locale)} · {post.activity === 'run' ? copy('Course', 'Run') : copy('Vélo', 'Ride')}</Text></View><GrydIcon name="chevronRight" size={16} color={muted} /></Pressable>
  {post.body ? <Text style={[styles.body, { color: ink }]}>{post.body}</Text> : null}
  {media ? <Pressable accessibilityRole="button" accessibilityLabel={copy('Ouvrir la publication', 'Open post')} onPress={onOpen}><Image source={{ uri: media }} style={styles.media} resizeMode="cover" /></Pressable> : post.mediaPath ? <View style={[styles.photoLoading, { backgroundColor: tone === 'light' ? c.canvas : c.darkSurface }]}><Text style={[styles.meta, { color: muted }]}>{copy('Photo privée indisponible', 'Private photo unavailable')}</Text></View> : null}
  <Pressable accessibilityRole="button" onPress={onOpen} style={styles.metrics}><GrydIcon name={post.activity} size={20} color={ink} /><Text style={[styles.distance, { color: ink }]}>{(post.distanceM / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} <Text style={[styles.meta, { color: muted }]}>km</Text></Text><Text style={[styles.meta, { color: ink }]}>{Math.round(post.durationS / 60)} min</Text></Pressable>
  <View style={styles.footer}>{SOCIAL_REACTION_KINDS_2026.map(kind => { const selected = mine === kind; const n = reactionCount2026(post, kind); return <Pressable key={kind} disabled={disabled} accessibilityRole="button"
   accessibilityLabel={selected ? copy(`Retirer : ${label(kind)}`, `Remove: ${label(kind)}`) : label(kind)}
   accessibilityState={{ selected, disabled, busy }} aria-pressed={selected} aria-disabled={disabled} aria-busy={busy}
   onPress={() => react(kind)} style={styles.action}>
   <View style={[styles.reactionCircle, { backgroundColor: selected ? c.accent : tone === 'light' ? c.canvas : c.darkSurfaceMuted }]}><GrydIcon name={REACTION_GLYPHS[kind]} size={18} color={selected ? c.ink : ink} /></View>
   <Text style={[styles.meta, { color: selected ? ink : muted }]}>{label(kind)}{n > 0 ? ` ${n}` : ''}</Text>
  </Pressable>; })}</View>
  <Pressable accessibilityRole="button" onPress={onOpen} style={styles.action}><GrydIcon name="message" size={18} color={muted} /><Text style={[styles.meta, { color: muted }]}>{post.commentCount} {copy('commentaires', 'comments')}</Text></Pressable>
 </View>;
}
const styles = StyleSheet.create({ post: { paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth }, identity: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginBottom: 12 }, name: { fontFamily: fonts.textMedium, fontSize: 14 }, meta: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19 }, body: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, marginBottom: 15 }, media: { width: '100%', height: 240, borderRadius: 20 }, photoLoading: { minHeight: 80, padding: 12, justifyContent: 'center' }, metrics: { minHeight: 62, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 }, distance: { fontFamily: fonts.displayMedium, fontSize: 25 }, footer: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }, action: { flexDirection: 'row', gap: 7, alignItems: 'center', minHeight: 44 }, reactionCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' } });
