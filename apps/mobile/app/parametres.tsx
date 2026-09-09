import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c } from '@klaim/shared';
import { signOut } from '../src/lib/auth';
import { useSession } from '../src/lib/session';
import { screen } from '../src/lib/analytics';
import { ProfileButton, ProfileLink, ProfilePage, ProfileSection, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
import { C as CParcours } from '../src/i18n/catalog/parcours';
import { useT } from '../src/i18n/store';
import { SETTINGS_GLYPHS } from '../src/ui/gryd/glyphs';
import { TranslucentControl2026 } from '../src/ui/gryd/Surface2026';

export default function SettingsScreen() {
  const copy = useRefonteCopy();
  const t = useT();
  const { session } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  useEffect(() => { screen('parametres'); }, []);
  return <ProfilePage tone="light" title={copy('Réglages', 'Settings')} back>
    <Text style={local.intro}>{copy('Compte, confidentialité et préférences.', 'Account, privacy and preferences.')}</Text>
    <ProfileSection tone="light" title={copy('Compte', 'Account')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Compte & connexion', 'Account & sign-in')} grydIcon={SETTINGS_GLYPHS.accountConnection} onPress={() => router.push('/parametres/compte')} />
    <ProfileLink tone="light" title={copy('Modifier mon profil', 'Edit my profile')} grydIcon={SETTINGS_GLYPHS.editProfile} onPress={() => router.push('/profil-edit')} />
    <ProfileLink tone="light" title={copy('Confidentialité & données', 'Privacy & data')} subtitle={copy('Visibilité, export et suppression', 'Visibility, export and deletion')} grydIcon={SETTINGS_GLYPHS.privacyData} onPress={() => router.push('/confidentialite')} />
    <ProfileLink tone="light" title={copy('Notifications', 'Notifications')} grydIcon={SETTINGS_GLYPHS.notifications} onPress={() => router.push('/parametres/notifications')} />
    <ProfileLink tone="light" title={copy('Abonnement & achats', 'Subscription & purchases')} grydIcon={SETTINGS_GLYPHS.subscription} onPress={() => router.push('/abonnement')} />
    </TranslucentControl2026>
    <ProfileSection tone="light" title={copy('Tes sorties', 'Your outings')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Sources & appareils', 'Sources & devices')} grydIcon={SETTINGS_GLYPHS.sourcesDevices} onPress={() => router.push('/sources')} />
    <ProfileLink tone="light" title={copy('Mon journal', 'My journal')} grydIcon={SETTINGS_GLYPHS.journal} onPress={() => router.push('/(tabs)/profil')} />
    {/* `/mes-parcours` n'était référencée que par le catalogue MORT de
        features/settings/sections.ts : une page de transparence sur ce que GRYD
        déduit des habitudes, atteignable par personne. Elle est peinte ici. */}
    <ProfileLink tone="light" title={t(CParcours.title)} subtitle={t(CParcours.rowDetail)} grydIcon={SETTINGS_GLYPHS.journal} onPress={() => router.push('/mes-parcours')} />
    <ProfileLink tone="light" title={copy('Ma collection', 'My collection')} grydIcon={SETTINGS_GLYPHS.collection} onPress={() => router.push('/arsenal')} />
    <ProfileLink tone="light" title={copy('Mon crew', 'My crew')} grydIcon={SETTINGS_GLYPHS.crew} onPress={() => router.push('/(tabs)/crew')} />
    </TranslucentControl2026>
    <ProfileSection tone="light" title={copy('Aide et informations', 'Help and information')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Langue', 'Language')} grydIcon={SETTINGS_GLYPHS.language} onPress={() => router.push('/langue')} />
    <ProfileLink tone="light" title={copy('Comment ça marche', 'How it works')} grydIcon={SETTINGS_GLYPHS.howItWorks} onPress={() => router.push('/calcul-zones')} />
    <ProfileLink tone="light" title={copy('Revoir la découverte', 'Replay the introduction')} grydIcon={SETTINGS_GLYPHS.replayDiscovery} onPress={() => router.push('/onboarding?replay=1')} />
    <ProfileLink tone="light" title={copy('Questions fréquentes', 'Frequently asked questions')} grydIcon={SETTINGS_GLYPHS.faq} onPress={() => router.push('/faq')} />
    <ProfileLink tone="light" title={copy('Aide & signalement', 'Help & reporting')} grydIcon={SETTINGS_GLYPHS.support} onPress={() => router.push('/support')} />
    <ProfileLink tone="light" title={copy('À propos & mentions légales', 'About & legal notice')} grydIcon={SETTINGS_GLYPHS.about} onPress={() => router.push('/a-propos')} />
    <ProfileLink tone="light" title={copy('Conditions d’utilisation', 'Terms of use')} grydIcon={SETTINGS_GLYPHS.terms} onPress={() => router.push('/legal/cgu')} />
    <ProfileLink tone="light" title={copy('Politique de confidentialité', 'Privacy policy')} grydIcon={SETTINGS_GLYPHS.privacyPolicy} onPress={() => router.push('/legal/confidentialite')} />
    <ProfileLink tone="light" title={copy('Crédits des données', 'Data credits')} grydIcon={SETTINGS_GLYPHS.dataCredits} onPress={() => router.push('/credits-donnees')} />
    <ProfileLink tone="light" title={copy('Licences logicielles', 'Software licences')} grydIcon={SETTINGS_GLYPHS.licenses} onPress={() => router.push('/legal/licences')} />
    </TranslucentControl2026>
    {session ? <View style={local.signOut}><ProfileButton tone="light" label={copy('Me déconnecter', 'Sign out')} secondary busy={signingOut} onPress={() => {
      setSigningOut(true); setSignOutFailed(false);
      void signOut().then(result => { if (!result.ok) setSignOutFailed(true); else router.replace('/(tabs)/profil'); }).catch(() => setSignOutFailed(true)).finally(() => setSigningOut(false));
    }} /></View> : null}
    {signOutFailed ? <Text accessibilityRole="alert" style={local.meta}>{copy('La déconnexion n’a pas abouti. Réessaie.', 'Sign-out did not complete. Try again.')}</Text> : null}
  </ProfilePage>;
}

const local = StyleSheet.create({ intro: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted, paddingTop: 8, paddingBottom: 2 }, group: { position: 'relative', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 4 }, signOut: { alignSelf: 'flex-start', marginTop: 16, marginBottom: 12 }, meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted } });
