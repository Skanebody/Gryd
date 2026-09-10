/**
 * GRYD — RÉGLAGES. La table des matières de tout ce qui n'est pas le jeu.
 *
 * ═══ CE QUE LE LOT « RÉGLAGES ET PROFIL » A CHANGÉ (10/09/2026) ═════════════
 * Trois groupes devenaient six. L'ancien découpage — « Compte », « Tes
 * sorties », « Aide et informations » — mélangeait dans un même bloc la
 * politique de confidentialité, les licences logicielles, la langue et le
 * guide interactif : quatorze lignes sous un seul titre, et l'obligation
 * légale au milieu des préférences. Le nouveau découpage nomme ce qu'on
 * cherche : Compte · Confidentialité et données · Préférences · Sources et
 * appareils · Aide · Légal.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ──────────────────────────────────────
 * · « Mon journal » → `/(tabs)/profil` et « Mon crew » → `/(tabs)/crew`. Deux
 *   lignes de réglages qui ne réglaient rien : elles rejouaient un ONGLET, déjà
 *   présent en bas de l'écran, à un tap de n'importe où. Une table des matières
 *   qui recopie la barre de navigation apprend au joueur que les Réglages sont
 *   l'endroit où tout est rangé deux fois.
 * · « Ma collection » → `/arsenal`. Même faute d'un cran : le Profil porte une
 *   carte Collection pleine largeur, avec l'aperçu de l'objet équipé. La ligne
 *   grise d'ici ne pouvait qu'y perdre.
 * Aucune de ces trois destinations ne perd sa porte : elles en avaient déjà une
 * meilleure. C'est la condition pour retirer une ligne sans fermer une pièce.
 *
 * ─── CE QUI A ÉTÉ AJOUTÉ, ET POURQUOI ──────────────────────────────────────
 * · « Conditions de vente » (CGV). Le document est OBLIGATOIRE dès qu'un service
 *   payant est proposé (art. L111-1 du Code de la consommation) et il existait :
 *   `app/legal/cgv.tsx`. Mais sa seule ligne dans l'univers Réglages vivait dans
 *   la branche `apropos` de `app/parametres/[section].tsx`, que la route
 *   intercepte par un `<Redirect>` depuis le 09/09. Autrement dit : depuis
 *   Réglages, plus AUCUN chemin n'y menait. On ne la remplace pas, on la
 *   remet où on la cherche — à côté des CGU.
 * · « Autorisations de l'appareil » → `/parametres/permissions`. Position,
 *   photos, appareil photo, mouvement : l'app en dépend, l'OS en décide, et
 *   rien dans GRYD ne disait leur état. G27 : « ouvrir les réglages du système
 *   lorsque le changement s'effectue là-bas ».
 * · « Pendant la sortie » → `/parametres/course`. Cette sous-page existe depuis
 *   des mois, porte un VRAI réglage (les haptiques, persistées) et n'était
 *   atteignable par personne : aucun écran du dépôt ne poussait vers ce slug.
 *
 * ─── LES PORTES DE DERNIER RECOURS ─────────────────────────────────────────
 * Sept routes n'ont aucune autre porte fiable dans ce build, et l'écran est leur
 * seule entrée : `/parametres/compte`, `/parametres/notifications`,
 * `/confidentialite`, `/langue`, `/credits-donnees`, `/legal/licences`,
 * `/mes-parcours`. `features/settings/sections.test.ts` le vérifie sur CE
 * fichier — sur la liste qu'on voit, jamais sur un catalogue parallèle.
 */
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
    <Text style={local.intro}>{copy('Ton compte, tes données, tes préférences.', 'Your account, your data, your preferences.')}</Text>

    <ProfileSection tone="light" title={copy('Compte', 'Account')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Compte et connexion', 'Account and sign-in')} grydIcon={SETTINGS_GLYPHS.accountConnection} onPress={() => router.push('/parametres/compte')} />
    <ProfileLink tone="light" title={copy('Modifier mon profil', 'Edit my profile')} grydIcon={SETTINGS_GLYPHS.editProfile} onPress={() => router.push('/profil-edit')} />
    <ProfileLink tone="light" title={copy('Notifications', 'Notifications')} grydIcon={SETTINGS_GLYPHS.notifications} onPress={() => router.push('/parametres/notifications')} />
    <ProfileLink tone="light" title={copy('Abonnement et achats', 'Subscription and purchases')} grydIcon={SETTINGS_GLYPHS.subscription} onPress={() => router.push('/abonnement')} />
    </TranslucentControl2026>

    {/* Deux lignes, deux natures, et c'est tout l'intérêt de les séparer : la
        première règle ce que GRYD montre de toi (audiences, zones protégées,
        export, suppression) ; la seconde ne règle rien du tout, elle LIT ce que
        l'iPhone a décidé et ouvre les réglages du système. G27 interdit de les
        confondre — « ne pas afficher un interrupteur local qui prétend modifier
        HealthKit ». */}
    <ProfileSection tone="light" title={copy('Confidentialité et données', 'Privacy and data')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Confidentialité et données', 'Privacy and data')} subtitle={copy('Visibilité, zones protégées, export et suppression', 'Visibility, protected zones, export and deletion')} grydIcon={SETTINGS_GLYPHS.privacyData} onPress={() => router.push('/confidentialite')} />
    <ProfileLink tone="light" title={copy('Autorisations de l’appareil', 'Device permissions')} subtitle={copy('Position, photos, appareil photo, mouvement', 'Location, photos, camera, motion')} grydIcon={SETTINGS_GLYPHS.devicePermissions} onPress={() => router.push('/parametres/permissions')} />
    </TranslucentControl2026>

    <ProfileSection tone="light" title={copy('Préférences', 'Preferences')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Langue', 'Language')} grydIcon={SETTINGS_GLYPHS.language} onPress={() => router.push('/langue')} />
    {/* `/parametres/course` : les haptiques pendant la sortie. Un vrai réglage,
        persisté, lu par toute la chaîne de course — et pourtant zéro `push`
        vers ce slug dans tout le dépôt jusqu'ici. Il est relié, pas réinventé.
        Aucune ligne « Unités » : rien dans l'app ne sait afficher des miles, et
        un choix qui n'a qu'une option n'est pas un choix. */}
    <ProfileLink tone="light" title={copy('Pendant la sortie', 'During activity')} subtitle={copy('Vibrations aux moments clés', 'Haptics at key moments')} grydIcon={SETTINGS_GLYPHS.duringActivity} onPress={() => router.push('/parametres/course')} />
    {/* `/mes-parcours` n'était référencée que par le catalogue MORT de
        features/settings/sections.ts : une page de transparence sur ce que GRYD
        déduit des habitudes, atteignable par personne. Elle est peinte ici. */}
    <ProfileLink tone="light" title={t(CParcours.title)} subtitle={t(CParcours.rowDetail)} grydIcon={SETTINGS_GLYPHS.journal} onPress={() => router.push('/mes-parcours')} />
    </TranslucentControl2026>

    <ProfileSection tone="light" title={copy('Sources et appareils', 'Sources and devices')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Sources et appareils', 'Sources and devices')} subtitle={copy('Ce qui alimente tes sorties', 'What feeds your activities')} grydIcon={SETTINGS_GLYPHS.sourcesDevices} onPress={() => router.push('/sources')} />
    </TranslucentControl2026>

    <ProfileSection tone="light" title={copy('Aide', 'Help')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    {/* « Revoir la découverte » ne disait pas ce qu'on allait revoir (retour
        fondateur, 10/09/2026). L'entrée a disparu d'ici : le guide la reprend
        sous un libellé qui nomme sa destination, « Revoir l'écran d'accueil »,
        au bas de son chapitre Questions (features/help/HelpGuide2026.tsx). */}
    <ProfileLink tone="light" title={copy('Comment ça marche', 'How it works')} subtitle={copy('Le guide interactif', 'The interactive guide')} grydIcon={SETTINGS_GLYPHS.howItWorks} onPress={() => router.push('/comment-ca-marche')} />
    <ProfileLink tone="light" title={copy('Questions fréquentes', 'Frequently asked questions')} grydIcon={SETTINGS_GLYPHS.faq} onPress={() => router.push('/comment-ca-marche?chapitre=faq')} />
    <ProfileLink tone="light" title={copy('Aide et signalement', 'Help and reporting')} grydIcon={SETTINGS_GLYPHS.support} onPress={() => router.push('/support')} />
    </TranslucentControl2026>

    <ProfileSection tone="light" title={copy('Légal', 'Legal')} />
    <TranslucentControl2026 tone="light" style={local.group}>
    <ProfileLink tone="light" title={copy('Conditions d’utilisation', 'Terms of use')} grydIcon={SETTINGS_GLYPHS.terms} onPress={() => router.push('/legal/cgu')} />
    {/* LES CGV, ENFIN ATTEIGNABLES DEPUIS RÉGLAGES. Elles n'avaient plus qu'une
        porte, `/abonnement`, alors que le document régit la VENTE et qu'on le
        cherche à côté des CGU. Voir le bloc d'en-tête. */}
    <ProfileLink tone="light" title={copy('Conditions de vente', 'Terms of sale')} subtitle={copy('Prix, paiement, rétractation', 'Pricing, payment, withdrawal')} grydIcon={SETTINGS_GLYPHS.terms} onPress={() => router.push('/legal/cgv')} />
    <ProfileLink tone="light" title={copy('Politique de confidentialité', 'Privacy policy')} grydIcon={SETTINGS_GLYPHS.privacyPolicy} onPress={() => router.push('/legal/confidentialite')} />
    <ProfileLink tone="light" title={copy('À propos et mentions légales', 'About and legal notice')} grydIcon={SETTINGS_GLYPHS.about} onPress={() => router.push('/a-propos')} />
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
