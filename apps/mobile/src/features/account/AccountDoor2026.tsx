/**
 * GRYD — LA PORTE DE COMPTE. Une seule, partout.
 *
 * ─── ÉTAPE 0 : LE MÊME DÉFAUT, RECOPIÉ TREIZE FOIS ──────────────────────────
 * Le lot 1 a corrigé `/sign-in` et le profil invité après le constat du
 * fondateur (10/09/2026) : « on me dit de me connecter mais je n'ai aucun moyen
 * de créer mon compte ». Il restait une douzaine d'écrans qui peignaient chacun
 * sa propre invitation, et toutes disaient la même chose de travers :
 *
 *   app/badges.tsx        copy('Se connecter', 'Sign in')
 *   app/amis.tsx          copy('Connexion', 'Sign in')
 *   app/crew-feed.tsx     copy('Connexion', 'Sign in')
 *   app/profil-edit.tsx   copy('Connexion', 'Sign in')
 *   app/abonnement.tsx    copy('Me connecter', 'Sign in')
 *   app/sources.tsx       copy('Me connecter pour importer', …)
 *   SeasonJourneyScreen   copy('Me connecter', 'Sign in')
 *   CollectionScreen      copy('Me connecter', 'Sign in')
 *   WeeklyQuests2026      t(C.actionConnexion) = « Me connecter »
 *   CrewChallenges…       copy('Me connecter', 'Sign in')
 *   CrewOutings…          copy('Me connecter', 'Sign in')
 *   ProfileComparison…    copy('Me connecter', 'Sign in')
 *   CrewConversation…     copy('Connexion', 'Sign in')
 *
 * Aucun de ces mots ne s'adresse à quelqu'un qui n'a PAS de compte, alors que
 * la porte qu'ils ouvrent en crée un (`shouldCreateUser: true`). Ce n'était pas
 * treize petits défauts : c'était UN défaut, treize fois, et le seul moyen de
 * ne pas le repayer une quatorzième est qu'il n'existe plus qu'UN composant.
 *
 * ─── ET NEUF D'ENTRE EUX DISPARAISSAIENT SANS SERVEUR ───────────────────────
 * `{configured ? <Bouton/> : null}` — sur un build sans adresse Supabase,
 * l'écran ne proposait plus rien ET n'expliquait rien. La constitution est
 * catégorique (L8, L14, L19) : quatre états distincts, jamais un repli muet.
 * Cette porte ne rend JAMAIS `null`. Sans serveur, elle dit « Serveur non
 * configuré sur ce build » et pourquoi aucun compte ne peut naître ici.
 *
 * ─── CE QUE CE COMPOSANT NE FAIT PAS ────────────────────────────────────────
 * Il ne regarde PAS `session`. L'écran qui l'accueille possède déjà sa machine
 * à états (`status === 'signedOut'`, `!session && !sessionLoading`, `progress
 * .status === 'signed-out'`…) et sait, lui, distinguer « pas connecté » de
 * « lecture en cours ». Une seconde garde ici peindrait la porte pendant la
 * restauration de session, c'est-à-dire à quelqu'un de déjà connecté.
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, refonteColors as c } from '@klaim/shared';
import { C } from '../../i18n/catalog/auth';
import { useT } from '../../i18n/store';
import { haptics } from '../../lib/haptics';
import { ProfileButton, type ProfileTone } from '../refonte/ProfilePrimitives';
import { useSession } from '../../lib/session';

export interface AccountDoor2026Props {
  /**
   * CE QUE LE COMPTE DÉBLOQUE ICI, en une phrase, dans la langue de l'écran
   * appelant. Le titre et le bouton sont les mêmes partout — c'est le principe.
   * La raison, elle, est locale : « tes badges » n'est pas « ton abonnement ».
   * Absente, la porte reste juste ; elle est simplement plus sèche.
   */
  reason?: string;
  /**
   * Bloc serré : ni fond, ni carte, ni marge. Pour les écrans où la porte
   * s'insère dans une pile existante plutôt que de l'ouvrir. Le titre RESTE :
   * c'est lui qui nomme la création, le retirer recréerait le défaut d'origine.
   */
  compact?: boolean;
  /**
   * La surface qui l'accueille. Sans ce réglage, la porte peindrait du texte
   * quasi noir sur du carbone quasi noir dans la moitié des écrans : le mot
   * serait là, et personne ne le lirait. `ProfilePrimitives` fait déjà ce
   * partage, on ne s'en invente pas un second.
   */
  tone?: ProfileTone;
}

export function AccountDoor2026({ reason, compact = false, tone = 'dark' }: AccountDoor2026Props) {
  const t = useT();
  const { configured } = useSession();
  const light = tone === 'light';
  const open = () => { haptics.light(); router.push('/sign-in'); };
  return <View style={[s.door, light && s.doorLight, compact && s.compact]}>
    <Text accessibilityRole="header" style={[s.title, light && s.titleLight, compact && s.titleCompact]}>
      {t(C.methodsTitle)}
    </Text>
    {reason ? <Text style={[s.body, light && s.bodyLight]}>{reason}</Text> : null}
    {/* Un bouton qui mènerait à un écran incapable de créer quoi que ce soit
        serait un bouton mort : sans serveur, la porte se DIT fermée. */}
    {configured ? <>
      <ProfileButton tone={tone} label={t(C.doorCta)} onPress={open} />
      <Text style={[s.note, light && s.bodyLight]}>{t(C.doorOrSignIn)}</Text>
    </> : <Text style={[s.body, light && s.bodyLight]}>
      {t(C.noBackendTitle)}. {t(C.errorNoBackend)}
    </Text>}
  </View>;
}

const s = StyleSheet.create({
  // `alignSelf` : plusieurs états vides centrent leurs enfants
  // (`alignItems: 'center'`), ce qui réduirait la porte à la largeur de son
  // texte le plus long. Une porte n'est pas une légende.
  door: { alignSelf: 'stretch', gap: 10, padding: 16, borderRadius: 24, backgroundColor: c.darkSurface, marginVertical: 12 },
  doorLight: { backgroundColor: c.surface },
  compact: { padding: 0, backgroundColor: 'transparent', borderRadius: 0, marginVertical: 8 },
  title: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -0.5, color: c.darkInk },
  titleLight: { color: c.ink },
  titleCompact: { fontFamily: fonts.textSemi, fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  body: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.darkMuted },
  bodyLight: { color: c.muted },
  note: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted, textAlign: 'center' },
});
