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
 *
 * ─── SEPT AUTRES PORTES, DANS L'AUTRE FAMILLE (lot 10, 10/09/2026) ──────────
 * Les treize écrans ci-dessus vivent tous dans `ProfilePrimitives` (échelle
 * `refonteColors`, fond clair possible). Sept portes restaient en dehors, dans
 * la famille `ui/Button` + `Card` + `StackScreen` (échelle `colors.*`, carbone) :
 *
 *   app/defis.tsx · app/activite.tsx · app/challenges/index.tsx
 *   app/c/[code].tsx · app/crew-create.tsx · app/confidentialite.tsx (×2)
 *
 * Leur donner la porte du lot 9 telle quelle aurait peint du texte quasi blanc
 * de l'échelle claire sur du carbone, et un bouton d'une autre famille au
 * milieu de leurs `Button` : le mot aurait été là, et l'écran aurait eu deux
 * grammaires. `family` choisit donc les PRIMITIVES, jamais les MOTS — le texte
 * est écrit une seule fois, plus haut dans ce fichier, et les deux rendus le
 * partagent. Deux libellés jumeaux finissent toujours par diverger.
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, refonteColors as c, spacing, typography } from '@klaim/shared';
import { C } from '../../i18n/catalog/auth';
import { useT } from '../../i18n/store';
import { EVENTS, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ProfileButton, type ProfileTone } from '../refonte/ProfilePrimitives';
import { useSession } from '../../lib/session';

/**
 * La famille de primitives de l'écran d'accueil, PAS un thème de plus :
 *  - `profile` : `ProfilePrimitives` (échelle `refonteColors`, `tone` clair/sombre) ;
 *  - `ui` : `ui/Button` + `Card` (échelle `colors.*`, surface N1 `elevation.surface`).
 */
export type AccountDoorFamily = 'profile' | 'ui';

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
   * Sans objet pour `family="ui"` : cette famille n'a qu'une échelle, sombre.
   */
  tone?: ProfileTone;
  /**
   * LES PRIMITIVES DE L'ÉCRAN D'ACCUEIL, pas un thème. Défaut `profile` : les
   * treize écrans du lot 9 ne changent pas d'un pixel.
   */
  family?: AccountDoorFamily;
  /**
   * §26 friction — l'id STABLE que l'écran d'avant émettait déjà sur SON bouton
   * (`defis_sign_in`, `activite_sign_in`…). Sans lui, réunir sept portes en une
   * aurait fondu sept entonnoirs en un seul, et personne n'aurait pu dire d'OÙ
   * un compte naît. Il est émis ici, pour les DEUX familles : `ProfileButton`
   * n'a pas de crochet d'analytics, et le poser sur le seul `ui/Button` aurait
   * rendu la mesure dépendante de la primitive.
   */
  analyticsId?: string;
}

export function AccountDoor2026({
  reason,
  compact = false,
  tone = 'dark',
  family = 'profile',
  analyticsId,
}: AccountDoor2026Props) {
  const t = useT();
  const { configured } = useSession();
  const ui = family === 'ui';
  const light = !ui && tone === 'light';
  const open = () => {
    haptics.light();
    if (analyticsId !== undefined) track(EVENTS.ctaTapped, { cta: analyticsId });
    router.push('/sign-in');
  };
  /* LE CONTENU EST ÉCRIT UNE FOIS. Les deux familles ne se partagent pas les
     textes « à peu près » : c'est le MÊME arbre, avec d'autres primitives et
     d'autres tokens. Un second bloc JSX aurait rouvert la porte du lot 9.
     Le libellé du bouton passe par une variable pour la même raison : les deux
     primitives de bouton ne prennent pas les mêmes props, mais elles doivent
     peindre le MÊME mot. */
  const cta = t(C.doorCta);
  const contenu = <>
    <Text accessibilityRole="header" style={[s.title, light && s.titleLight, compact && s.titleCompact, ui && u.title, ui && compact && u.titleCompact]}>
      {t(C.methodsTitle)}
    </Text>
    {reason ? <Text style={[s.body, light && s.bodyLight, ui && u.body]}>{reason}</Text> : null}
    {/* Un bouton qui mènerait à un écran incapable de créer quoi que ce soit
        serait un bouton mort : sans serveur, la porte se DIT fermée. */}
    {configured ? <>
      {ui
        ? <View style={u.action}><Button size="md" label={cta} onPress={open} /></View>
        : <ProfileButton tone={tone} label={cta} onPress={open} />}
      <Text style={[s.note, light && s.bodyLight, ui && u.note]}>{t(C.doorOrSignIn)}</Text>
    </> : <Text style={[s.body, light && s.bodyLight, ui && u.body]}>
      {t(C.noBackendTitle)}. {t(C.errorNoBackend)}
    </Text>}
  </>;
  if (ui) {
    /* `Card` = la surface N1 du dépôt (elevation.surface + radii.card), celle
       que ces écrans peignaient déjà à la main autour de leur porte. En
       `compact`, aucune surface : la porte s'insère dans une pile existante. */
    return compact
      ? <View style={u.compact}>{contenu}</View>
      : <Card style={u.card}>{contenu}</Card>;
  }
  return <View style={[s.door, light && s.doorLight, compact && s.compact]}>{contenu}</View>;
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

/**
 * FAMILLE `ui` — les mêmes rôles, pris dans l'échelle `colors.*` et les rôles
 * typographiques du dépôt (R3 titre de card, R4 corps, R4-méta pour la note).
 * Aucun hex : la source est `design-tokens.ts` (ADR-008).
 */
const u = StyleSheet.create({
  // `Card` porte déjà son padding et son rayon : ici, l'espace intérieur.
  card: { gap: spacing.xs, marginVertical: spacing.sm },
  compact: { alignSelf: 'stretch', gap: spacing.xs, marginVertical: spacing.xs },
  title: { ...typography.cardTitle, color: colors.blanc },
  titleCompact: { ...typography.itemTitle },
  body: { ...typography.body, color: colors.gris },
  action: { marginTop: spacing.xs },
  note: { ...typography.meta, color: colors.gris, textAlign: 'center' },
});
