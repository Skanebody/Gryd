import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { screen } from '../../lib/analytics';
import { useLocale } from '../../i18n/store';
import { CircularAction2026, GrydIcon } from '../../ui/gryd';
import { ProfileButton, ProfilePage, useRefonteCopy } from '../refonte/ProfilePrimitives';
import { socialRpc2026, useSocialEpoch2026, useSocialRead2026 } from '../social/social2026Data';
import { useRealCrew } from './real';
import { crewConversationError2026, parseCrewConversation2026, type CrewMessage2026 } from './crewConversation2026';

export function CrewConversationScreen2026() {
  const { session, loading } = useSession(); const epoch = useSocialEpoch2026();
  return <CrewConversationGate key={`${epoch}:${loading ? 'restoring' : session?.user.id ?? 'guest'}`} />;
}
/**
 * ─── QUATRE ÉTATS, ET DEUX QUI ÉTAIENT FONDUS (10/09/2026) ─────────────────
 * `!session || !crew.crew` traitait « pas connecté » et « pas de crew » comme
 * une seule situation : on proposait « Voir les crews » à quelqu'un qui n'a pas
 * de compte, et on lui expliquait comment rejoindre un crew avant de lui dire
 * qu'il faut d'abord se connecter. Ce sont deux faits différents, deux phrases
 * différentes et deux gestes différents — la règle des quatre états distincts
 * vaut ici comme ailleurs.
 */
function CrewConversationGate() {
  const { session, loading } = useSession(); const crew = useRealCrew(); const copy = useRefonteCopy();
  const page = (children: ReactNode) => <ProfilePage tone="light" title={copy('Conversation', 'Conversation')} back backHref="/(tabs)/crew">{children}</ProfilePage>;
  // 1. LECTURE EN COURS — n'affirme rien, ni sur le compte ni sur le crew.
  if (loading || (crew.loading && !crew.crew)) return page(<ActivityIndicator color={c.ink} />);
  // 2. PAS CONNECTÉ — le seul geste utile est la connexion. Ne PAS proposer de
  //    rejoindre un crew : il n'y a pas encore de compte pour en être membre.
  if (!session) return page(<View style={styles.panel}><Text style={styles.title}>{copy('Réservé aux membres du crew', 'Crew members only')}</Text><Text style={styles.body}>{copy('La conversation reste entre les membres. Connecte-toi pour retrouver la tienne.', 'The conversation stays between members. Sign in to find yours.')}</Text><ProfileButton tone="light" label={copy('Connexion', 'Sign in')} onPress={() => router.push('/sign-in')} /></View>);
  // 3. LECTURE ÉCHOUÉE — on n'a rien établi : ni « pas de crew », ni « crew ».
  if (crew.loadFailed) return page(<View style={styles.panel}><Text style={styles.title}>{copy('Crew indisponible', 'Crew unavailable')}</Text><Text style={styles.body}>{copy('Impossible de retrouver ton crew pour le moment.', 'Your crew could not be loaded right now.')}</Text><ProfileButton tone="light" label={copy('Réessayer', 'Retry')} onPress={crew.reload} /></View>);
  // 4. CONNECTÉ, SANS CREW — une affirmation VRAIE, et son geste.
  if (!crew.crew) return page(<View style={styles.panel}><Text style={styles.title}>{copy('La conversation du groupe.', 'Your group conversation.')}</Text><Text style={styles.body}>{copy('Rejoins un crew pour préparer vos sorties et échanger entre membres.', 'Join a crew to plan activities and talk with fellow members.')}</Text><ProfileButton tone="light" label={copy('Voir les crews', 'View crews')} onPress={() => router.push('/(tabs)/crew')} /></View>);
  return <Conversation key={`${session.user.id}:${crew.crew.id}`} crewId={crew.crew.id} suspended={crew.loading} />;
}
function Conversation({ crewId, suspended }: { crewId: string; suspended: boolean }) {
  const copy = useRefonteCopy(); const locale = useLocale();
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null);
  const read = useSocialRead2026<unknown>('crew_conversation_2026', { p_crew_id: crewId, p_before_created_at: cursor?.createdAt ?? null, p_before_id: cursor?.id ?? null });
  const data = parseCrewConversation2026(read.data, crewId);
  const [body, setBody] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<CrewMessage2026 | null>(null);
  const attempt = useRef<{ id: string; body: string } | null>(null);
  useEffect(() => { screen('crew_conversation'); }, []);
  // Focus-only refresh: no background messages, push promises or fabricated unread count.
  useFocusEffect(useCallback(() => { const timer = setInterval(read.reload, 15000); return () => clearInterval(timer); }, [read.reload]));
  async function mutate(rpc: string, args: Record<string, unknown>, success: () => void) {
    if (!read.owner || lock.current) return;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    try { await socialRpc2026(read.owner, rpc, args); success(); read.reload(); }
    catch (cause) { setError(crewConversationError2026(String(cause), locale === 'en')); }
    finally { lock.current = false; setBusy(false); }
  }
  function send() {
    if (!data || !body.trim() || body.trim().length > data.bodyMax) return;
    const text = body.trim();
    if (attempt.current?.body !== text) attempt.current = { id: Crypto.randomUUID(), body: text };
    const request = attempt.current;
    void mutate('crew_message_send_2026', { p_crew_id: crewId, p_client_id: request.id, p_body: text }, () => {
      setBody(''); setCursor(null); attempt.current = null; setNotice(copy('Message envoyé au crew.', 'Message sent to your crew.'));
    });
  }
  // Keep a same-crew draft through membership refresh, but hide cached messages
  // until this audience has been confirmed. An owner/crew change remounts it.
  if (suspended) return <ProfilePage tone="light" title={copy('Conversation', 'Conversation')} back backHref="/(tabs)/crew"><ActivityIndicator color={c.ink} /></ProfilePage>;
  const unavailable = read.status === 'failed' || (read.status === 'ready' && !data);
  return <ProfilePage tone="light" title={copy('Conversation', 'Conversation')} back backHref="/(tabs)/crew" right={<CircularAction2026 label={copy('Actualiser la conversation', 'Refresh conversation')} icon="clock" onPress={read.reload} tone="light" />}>
    {unavailable ? <View style={styles.panel}><Text style={styles.title}>{copy('Conversation indisponible', 'Conversation unavailable')}</Text><Text style={styles.body}>{copy('Les messages n’ont pas pu être chargés. Ton brouillon reste ici.', 'Messages could not be loaded. Your draft stays here.')}</Text><ProfileButton tone="light" label={copy('Réessayer', 'Retry')} secondary onPress={read.reload} /></View> : !data ? <View style={styles.panel}><ActivityIndicator color={c.ink} /><Text style={styles.meta}>{copy('Lecture de la conversation…', 'Loading conversation…')}</Text></View> : <>
      <View style={styles.intro}><Text style={styles.title}>{data.crewName}</Text><Text style={styles.meta}>{copy('Entre membres. Un mot pour la prochaine sortie ?', 'Members only. A word about your next outing?')}</Text></View>
      <View style={styles.composer}><Text style={styles.author}>{copy('Ton message', 'Your message')}</Text><TextInput accessibilityLabel={copy('Message au crew', 'Message to your crew')} placeholder={copy('On se retrouve quand ?', 'When shall we meet?')} placeholderTextColor={c.muted} value={body} onChangeText={setBody} editable={!busy} aria-disabled={busy} multiline maxLength={data.bodyMax} style={styles.input} /><View style={styles.composerFooter}><Text style={styles.meta}>{body.length}/{data.bodyMax}</Text><ProfileButton tone="light" label={copy('Envoyer', 'Send')} busy={busy} disabled={!body.trim()} onPress={send} /></View></View>
      {error ? <Text accessibilityRole="alert" style={styles.notice}>{error}</Text> : null}{notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.author}>{cursor ? copy('Messages précédents', 'Earlier messages') : copy('Échanges récents', 'Recent conversation')}</Text>
      {data.messages.length === 0 ? <View style={styles.panel}><GrydIcon name="crew" size={24} color={c.ink} /><Text style={styles.title}>{copy('La discussion commence ici.', 'The conversation starts here.')}</Text><Text style={styles.body}>{copy('Présente-toi ou propose un rendez-vous. Aucune sortie préalable n’est nécessaire.', 'Introduce yourself or suggest a meetup. No previous activity is needed.')}</Text></View> : <View style={styles.messages}>{data.messages.slice().reverse().map(message => <View key={message.id} style={[styles.message, message.mine && styles.mine]}>
        <View style={styles.messageHeading}><Pressable accessibilityRole="button" accessibilityLabel={copy(`Voir le profil de ${message.authorName}`, `View ${message.authorName}'s profile`)} onPress={() => router.push({ pathname: '/member', params: { userId: message.authorId } })} style={styles.authorAction}><Text style={styles.author}>{message.mine ? copy('Toi', 'You') : message.authorName}</Text><Text style={styles.time}>{new Date(message.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></Pressable><CircularAction2026 label={copy(`Actions sur le message de ${message.authorName}`, `Actions for ${message.authorName}'s message`)} icon="more" onPress={() => { Keyboard.dismiss(); setSelected(message); }} tone="light" /></View>
        <Text selectable style={styles.body}>{message.body}</Text>
      </View>)}</View>}
      <View style={styles.pagination}>{data.olderCursor ? <ProfileButton tone="light" label={copy('Messages plus anciens', 'Older messages')} secondary onPress={() => setCursor(data.olderCursor)} /> : null}{cursor ? <ProfileButton tone="light" label={copy('Revenir aux derniers messages', 'Back to latest messages')} secondary onPress={() => setCursor(null)} /> : null}</View>

      {selected ? <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}><View style={styles.modalRoot}><Pressable accessibilityRole="button" accessibilityLabel={copy('Fermer les actions', 'Close actions')} onPress={() => setSelected(null)} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal style={styles.actionSheet}><Text style={styles.author}>{copy('Actions sur ce message', 'Message actions')}</Text>{selected.canRemove ? <ProfileButton tone="light" label={selected.mine ? copy('Retirer mon message', 'Remove my message') : copy('Retirer du crew', 'Remove from crew')} disabled={busy} secondary onPress={() => void mutate('crew_message_remove_2026', { p_message_id: selected.id }, () => { setSelected(null); setNotice(copy('Message retiré.', 'Message removed.')); })} /> : null}{!selected.mine ? <><Text style={styles.meta}>{copy('Signaler et masquer pour toi :', 'Report and hide for you:')}</Text>{(['spam', 'harassment', 'other'] as const).map(reason => <ProfileButton key={reason} tone="light" secondary disabled={busy} label={reason === 'spam' ? copy('Spam', 'Spam') : reason === 'harassment' ? copy('Harcèlement', 'Harassment') : copy('Autre problème', 'Other issue')} onPress={() => void mutate('crew_message_report_2026', { p_message_id: selected.id, p_reason: reason }, () => { setSelected(null); setNotice(copy('Signalement enregistré. Message masqué pour toi.', 'Report saved. Message hidden for you.')); })} />)}</> : null}{error ? <Text accessibilityRole="alert" style={styles.notice}>{error}</Text> : null}<ProfileButton tone="light" label={copy('Fermer', 'Close')} secondary onPress={() => setSelected(null)} /></View></View></Modal> : null}
    </>}
  </ProfilePage>;
}
const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim, padding: 16 }, actionSheet: { backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center' }, pagination: { gap: 12, marginBottom: 16 },
  intro: { gap: 6, paddingBottom: 20 }, title: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, color: c.ink }, body: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.ink }, meta: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.muted }, panel: { backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 12, marginBottom: 12 }, messages: { gap: 12, marginBottom: 16 }, message: { padding: 18, backgroundColor: c.surface, borderRadius: 24, gap: 8 }, mine: { borderWidth: 1, borderColor: c.border }, messageHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, authorAction: { flex: 1, minHeight: 44, justifyContent: 'center', gap: 3 }, author: { fontFamily: fonts.textSemi, fontSize: 14, color: c.ink }, time: { fontFamily: fonts.text, fontSize: 11, lineHeight: 16, color: c.muted }, composer: { backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 12, marginBottom: 12 }, input: { minHeight: 100, color: c.ink, fontFamily: fonts.text, fontSize: 14, lineHeight: 21, textAlignVertical: 'top' }, composerFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, notice: { fontFamily: fonts.text, color: c.ink, fontSize: 13, lineHeight: 20, marginVertical: 12 },
});
