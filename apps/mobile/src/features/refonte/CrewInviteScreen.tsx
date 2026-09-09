import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { GrydMark } from '../../ui/gryd';
import { EVENTS, fonts, refonteColors as c } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { screen, track } from '../../lib/analytics';
import { buildInviteLink, copyInviteLink, probeInviteShare, shareInviteLink } from '../crew/invite';
import { resolveInviteCapabilities } from '../crew/inviteShareCapabilities';
import type { CodeResult } from '../crew/real';
import { ProfileButton, ProfilePage, lightStyles, s as darkStyles, useRefonteCopy } from './ProfilePrimitives';

const s = { ...darkStyles, ...lightStyles };
export function CrewInviteScreen({ crewName, fetchMyCode, onBack }: {
  crewName: string; fetchMyCode: () => Promise<CodeResult>; onBack: () => void;
}) {
  const copy = useRefonteCopy();
  const { width } = useWindowDimensions();
  const qrSize = Math.max(80, Math.min(208, width - 144));
  const { configured } = useSession();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    const result = await fetchMyCode();
    setCode(result.ok ? result.code : null); setFailed(!result.ok); setLoading(false);
  }, [fetchMyCode]);
  useEffect(() => { screen('crew_invite_qr'); void load(); }, [load]);
  const actions = useMemo(() => {
    const probe = probeInviteShare();
    return resolveInviteCapabilities({ platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web', hasShareable: code !== null, clipboardAvailable: probe.clipboardAvailable, webShareAvailable: probe.webShareAvailable, backendConfigured: configured, myRole: null }).actions.map(action => action.id).filter(action => action === 'copy' || action === 'share').sort((a, b) => a === b ? 0 : a === 'share' ? -1 : 1);
  }, [code, configured]);
  async function act(action: 'copy' | 'share') {
    if (!code) return;
    const result = action === 'copy' ? await copyInviteLink(buildInviteLink(code)) : await shareInviteLink(buildInviteLink(code));
    if (result.ok) { track(EVENTS.inviteSent, { channel: result.via === 'clipboard' ? 'copy' : 'share' }); setMessage(result.via === 'clipboard' ? copy('Lien copié.', 'Link copied.') : copy('Partage système ouvert.', 'System sharing opened.')); }
    else if (result.reason !== 'dismissed') setMessage(copy('Le partage n’a pas abouti. Tu peux montrer le QR.', 'Sharing did not complete. You can show the QR code.'));
  }
  return <ProfilePage tone="light" title={copy('Invitation', 'Invitation')}>
    <Text style={s.kicker}>{copy('INVITATION AU CREW', 'CREW INVITATION')}</Text>
    <Text style={[s.title, { marginTop: 16 }]}>{crewName}</Text>
    <Text style={[s.subtitle, { marginTop: 16 }]}>{copy('Scanne le QR ou partage le lien pour rejoindre ce crew.', 'Scan the QR or share the link to join this crew.')}</Text>
    {loading ? <View style={s.state}><ActivityIndicator color={c.ink} /></View> : failed ? <View style={s.state}><Text style={s.body}>{copy('L’invitation n’a pas pu être chargée.', 'The invitation could not be loaded.')}</Text><ProfileButton tone="light" label={copy('Réessayer', 'Try again')} onPress={() => void load()} /></View> : code ? <>
      <View style={local.poster}><GrydMark variant="wordmark" size={18} color={c.surface} /><View style={local.qr}><QRCode value={buildInviteLink(code)} size={qrSize} color={c.ink} backgroundColor={c.surface} quietZone={16} /></View><Text selectable style={local.code}>{code}</Text><Text style={local.hint}>{copy('CODE D’INVITATION', 'INVITATION CODE')}</Text></View>
      <View style={local.linkPanel}><Text style={local.linkLabel}>{copy('Lien du crew', 'Crew link')}</Text><Text selectable style={local.linkText}>{buildInviteLink(code)}</Text><Text style={local.linkHint}>{copy('Le QR et ce lien ouvrent la même invitation.', 'The QR and this link open the same invitation.')}</Text></View>
      <View style={s.gap}>{actions.map((action, i) => <ProfileButton tone="light" key={action} label={action === 'copy' ? copy('Copier le lien', 'Copy link') : copy('Partager l’invitation', 'Share invitation')} secondary={i > 0} onPress={() => void act(action)} />)}</View>
    </> : null}
    {message ? <Text accessibilityRole="alert" style={[s.meta, { marginTop: 18 }]}>{message}</Text> : null}
    <View style={{ marginTop: 22 }}><ProfileButton tone="light" label={copy('Retour au crew', 'Back to crew')} secondary onPress={onBack} /></View>
  </ProfilePage>;
}
const local = StyleSheet.create({
  linkPanel: { backgroundColor: c.surface, padding: 18, borderRadius: 24, gap: 8, marginBottom: 16 }, linkLabel: { fontFamily: fonts.textMedium, fontSize: 14, color: c.ink }, linkText: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.ink }, linkHint: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.muted },
  poster: { marginVertical: 24, padding: 20, gap: 18, alignItems: 'center', backgroundColor: c.carbon, borderRadius: 24 }, qr: { backgroundColor: c.darkSurface, borderRadius: 16, padding: 6 }, code: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 4, color: c.surface }, hint: { fontFamily: fonts.textMedium, color: c.darkMuted, fontSize: 10, letterSpacing: 1.3 },
});
