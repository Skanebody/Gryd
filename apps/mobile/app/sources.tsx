import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c, type Activity } from '@klaim/shared';
import { C } from '../src/i18n/catalog/auth';
import { useLocale, useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { useSession } from '../src/lib/session';
import { SOURCE_ADAPTERS } from '../src/features/sources/adapters/registry';
import type { SourceAdapterSnapshot } from '../src/features/sources/adapters/types';
import { VERIFY_SOURCES } from '../src/features/sources/catalog';
import { sourceRowKind } from '../src/features/sources/rowView';
import { C as CSources } from '../src/i18n/catalog/sources';
import { ProfileButton, ProfilePage, ProfileSegments, ProfileSection, s } from '../src/features/refonte/ProfilePrimitives';
import { AccountDoor2026 } from '../src/features/account/AccountDoor2026';
import { GrydIcon } from '../src/ui/gryd';
import { useMapActivity } from '../src/features/map/mapPref';
import { useResultOwner2026 } from '../src/features/run/useResultOwner2026';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026 } from '../src/features/run/resultOwner2026';

export default function SourcesScreen() {
  const { epoch } = useResultOwner2026();
  return <SourcesContent key={epoch} />;
}

function SourcesContent() {
  const t = useT();
  const locale = useLocale();
  const fr = locale === 'fr';
  const copy = (a: string, b: string) => fr ? a : b;
  const { session, configured } = useSession();
  const owner = session?.user.id ?? null;
  const { activity: mapActivity } = useMapActivity();
  const [activity, setActivity] = useState<Activity>(mapActivity);
  const [snapshots, setSnapshots] = useState<Record<string, SourceAdapterSnapshot>>({});
  const [loadedOwner, setLoadedOwner] = useState<string | null | undefined>();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [details, setDetails] = useState(false);
  const signedIn = configured && session !== null;
  const unavailableSources = VERIFY_SOURCES.filter(source =>
    sourceRowKind({ availability: source.availability, action: source.action, status: undefined, busy: false, signedIn }) === 'unavailable');
  useEffect(() => { screen('sources'); }, []);
  useEffect(() => {
    let alive = true;
    setSnapshots({}); setLoadedOwner(undefined); setFailed(false); setBusyKey(null);
    void Promise.all(Object.values(SOURCE_ADAPTERS).map(async adapter => [adapter.id, await adapter.status()] as const))
      .then(entries => { if (alive) { setSnapshots(Object.fromEntries(entries)); setLoadedOwner(owner); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [owner, refresh]);
  async function act(key: string, disconnect = false) {
    const adapter = SOURCE_ADAPTERS[key];
    if (!adapter || busyKey || !signedIn) return;
    const capturedOwner = owner, epoch = resultOwnerEpoch2026();
    if (!isResultOwnerCurrent2026(capturedOwner, epoch)) return;
    setBusyKey(key);
    try {
      const next = disconnect ? await adapter.disconnect() : await adapter.connect({ activity });
      if (isResultOwnerCurrent2026(capturedOwner, epoch)) setSnapshots(prev => ({ ...prev, [key]: next }));
    } catch {
      if (isResultOwnerCurrent2026(capturedOwner, epoch)) setFailed(true);
    } finally { if (isResultOwnerCurrent2026(capturedOwner, epoch)) setBusyKey(null); }
  }
  return <ProfilePage title={copy('Sources et appareils', 'Sources and devices')} back>
    <Text style={local.intro}>{copy('Retrouve tes sorties au même endroit.', 'Keep your outings together.')}</Text>
    <Text style={s.body}>{copy('Enregistre avec GRYD ou ajoute un fichier de ta montre.', 'Record with GRYD or add a file from your watch.')}</Text>
    <ProfileSection title={copy('Enregistrer', 'Record')} />
    <View style={local.source}>
      <View style={local.icon}><GrydIcon name="location" size={24} color={c.darkInk} /></View>
      <View style={s.flex}><Text style={local.title}>GRYD</Text><Text style={s.meta}>{copy('Course et vélo · GPS du téléphone', 'Run and ride · phone GPS')}</Text></View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={local.link}><Text style={local.linkText}>{copy('Ouvrir', 'Open')}</Text><GrydIcon name="arrowUpRight" size={16} color={c.darkInk} /></Pressable>
    </View>
    <ProfileSection title={copy('Importer une sortie', 'Import an activity')} />
    <ProfileSegments value={activity} onChange={setActivity} options={[{ key: 'run', label: copy('Course', 'Run') }, { key: 'bike', label: copy('Vélo', 'Ride') }]} />
    {/* UNE SEULE PORTE, PAS UNE PAR LIGNE. Chaque source connectable peignait
        son propre « Me connecter pour importer » : quatre boutons identiques
        pour un seul geste, et aucun ne disait qu'il CRÉE le compte. */}
    {signedIn ? null : <AccountDoor2026 reason={copy('Un fichier importé est rattaché à toi, pas à ce téléphone. C’est pour ça que l’import demande un compte.', 'An imported file is attached to you, not to this phone. That is why importing needs an account.')} />}
    {VERIFY_SOURCES.filter(source => source.availability === 'connectable').map(source => {
      const snapshot = loadedOwner === owner ? snapshots[source.key] : undefined;
      const kind = snapshot?.status === 'app_only' ? 'app_only' : sourceRowKind({ availability: source.availability, action: source.action, status: snapshot?.status, busy: busyKey === source.key, signedIn });
      const message = snapshot?.detailEntry ? t(snapshot.detailEntry, snapshot.detailVars ?? {}) : snapshot?.detail;
      const actionable = kind === 'import' || kind === 'connect' || kind === 'connected';
      return <View key={source.key} style={local.import}>
        <View style={local.source}><View style={local.icon}><GrydIcon name="route" size={24} color={c.darkInk} /></View><View style={s.flex}><Text style={local.title}>{source.name}</Text><Text style={s.meta}>{t(source.summary)}</Text></View></View>
        {message ? <Text style={s.meta}>{message}</Text> : null}
        {snapshot?.lastSync ? <Text style={s.meta}>{copy('Dernier import : ', 'Last import: ')}{new Date(snapshot.lastSync).toLocaleString(locale)}</Text> : null}
        {kind === 'reading' && !failed ? <ActivityIndicator color={c.darkInk} /> : kind === 'needsAccount' ? <Text style={s.meta}>{copy('L’import demande un compte.', 'Importing needs an account.')}</Text> : actionable || kind === 'busy' ? <View style={local.action}><ProfileButton label={kind === 'connected' ? copy('Déconnecter', 'Disconnect') : source.action === 'import' ? copy('Choisir un fichier', 'Choose a file') : copy('Connecter', 'Connect')} busy={kind === 'busy'} disabled={busyKey !== null} onPress={() => void act(source.key, kind === 'connected')} /></View> : snapshot?.status === 'app_only' && message ? null : <Text style={s.meta}>{snapshot?.status === 'app_only' ? t(C.chipAppOnly) : copy('Indisponible pour le moment.', 'Currently unavailable.')}</Text>}
      </View>;
    })}
    {failed ? <View style={local.action}><Text accessibilityRole="alert" style={s.body}>{copy('Impossible de lire les sources.', 'Unable to load sources.')}</Text><ProfileButton label={copy('Réessayer', 'Try again')} secondary onPress={() => setRefresh(n => n + 1)} /></View> : null}
    {/* G26 : listées avec leur ÉTAT RÉEL. Aucun adaptateur ne répond pour elles,
        donc `sourceRowKind` rend 'unavailable' — jamais « connecté », jamais un
        « Lecture… » éternel, et aucune action peinte qui échouerait à coup sûr. */}
    {unavailableSources.length > 0 ? <>
      <ProfileSection title={t(CSources.sectionOther)} />
      {unavailableSources.map(source => <View key={source.key} style={local.import}>
        <View style={local.source}><View style={local.icon}><GrydIcon name="link" size={24} color={c.darkMuted} /></View><View style={s.flex}><Text style={[local.title, { color: c.darkMuted }]}>{source.name}</Text><Text style={s.meta}>{t(source.summary)}</Text></View></View>
        <Text style={s.meta}>{source.state ? t(source.state) : copy('Indisponible pour le moment.', 'Currently unavailable.')}</Text>
      </View>)}
      <Text style={local.note}>{t(CSources.otherSourcesNote)}</Text>
    </> : null}
    <Text style={local.note}>{copy('Un fichier importé enrichit ton journal. Il ne donne pas automatiquement de terrain ni d’XP.', 'An imported file enriches your journal. It does not automatically award territory or XP.')}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(value => !value)} style={local.explain}><Text style={s.linkTitle}>{copy('À propos des connexions', 'About connections')}</Text><GrydIcon name={details ? 'minus' : 'plus'} size={18} color={c.darkMuted} /></Pressable>
    {details ? <Text style={s.body}>{copy('Les connexions automatiques aux montres ne sont pas disponibles dans cette version. Tu peux exporter une sortie au format GPX depuis ton appareil ou son application, puis choisir ce fichier ici.', 'Automatic watch connections are not available in this version. Export an activity as a GPX file from your device or its app, then choose that file here.')}</Text> : null}
  </ProfilePage>;
}
const local = StyleSheet.create({
  intro: { fontFamily: fonts.displayRegular, fontSize: 23, lineHeight: 29, color: c.darkInk, marginTop: 16, marginBottom: 10 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 }, icon: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.textMedium, fontSize: 16, color: c.darkInk }, link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }, linkText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.darkInk },
  import: { gap: 8, paddingBottom: 18, borderBottomWidth: 1, borderColor: c.darkSurfaceMuted }, action: { alignSelf: 'flex-start', gap: 12, marginTop: 12 }, note: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.darkMuted, paddingVertical: 18 },
  explain: { minHeight: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: c.darkSurfaceMuted },
});
