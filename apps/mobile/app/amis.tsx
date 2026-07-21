/**
 * GRYD — Page AMIS. Écran POUSSÉ depuis Profil.
 *
 * ─── FIN DU MODE VITRINE (décision fondateur, 21/07/2026) ────────────────────
 * Cet écran avait 5 onglets (Amis · Demandes · Suggestions · QR · Recherche) et
 * une liste de 6 amis fictifs (`features/social/demo`), avec des boutons qui
 * répondaient « @x ajouté », « demande envoyée » — des confirmations de choses
 * qui n'arrivaient nulle part. C'était le pire des mensonges d'interface : celui
 * qui fait croire à une action. Tout cela vivait derrière `isShowcasePlatform`,
 * qui disparaît ; la branche vitrine est donc supprimée, pas déplacée.
 *
 * Ce qui reste est ce qui est VRAI aujourd'hui :
 *   · aucun annuaire, aucune table d'amitiés, aucune demande — l'écran le DIT ;
 *   · le @handle, lui, est une donnée réelle de la session, partageable telle
 *     quelle → on la montre.
 * Il n'y a donc plus rien à onglet-iser : un écran, une information, zéro
 * navigation décorative (§A).
 *
 * LES TROIS ÉTATS, DISTINCTS :
 *   · session en cours d'hydratation → on n'affirme RIEN sur le joueur (ni
 *     « connecte-toi » ni un @ vide) ; seule la vérité produit est affichée ;
 *   · pas connecté (et un backend existe) → invite à se connecter, 1 CTA ;
 *   · connecté (ou build sans backend) → la fonctionnalité n'est pas ouverte, et
 *     le @ réel est affiché s'il en existe un.
 * Aucun échec de chargement n'est possible ici : rien n'est lu au réseau. Le
 * jour où une liste d'amis sera servie, c'est un 4ᵉ état — « on n'a pas su lire,
 * réessaie » — qui devra être écrit, PAS une liste vide.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, elevation, fontSizes, gameColors, radii, sizes, spacing } from '@klaim/shared';
import { useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/profil';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { useMyProfile } from '../src/features/social/profileStore';
import { useSession } from '../src/lib/session';

export default function AmisScreen() {
  const t = useT();
  const { session, configured, loading } = useSession();
  const { profile, editable, loading: profileLoading } = useMyProfile();
  /**
   * Un écran de connexion qui MARCHE existe-t-il ? Sans backend, /sign-in n'a
   * personne au bout : proposer « Se connecter » y serait un cul-de-sac.
   * `loading` exclut la fenêtre d'hydratation : sans ça, un joueur connecté
   * lisait « Connecte-toi » pendant une fraction de seconde au démarrage.
   */
  const signedIn = configured && session !== null;
  const canSignIn = configured && !session && !loading;
  /**
   * MON @ N'EST À MOI QUE S'IL VIENT DE MOI. `useMyProfile()` ne laisse jamais un
   * @handle blanc à l'écran : sans compte ni saisie il retombe sur le neutre
   * « @coureur ». Ce repli est honnête AILLEURS (un libellé d'avatar), mais ici
   * l'écran dirait « voici TON identité GRYD, c'est comme ça qu'on te
   * retrouvera » — d'un pseudo générique que personne ne peut chercher.
   *
   * On n'affiche donc le bloc que si le @ est adossé à quelque chose : une
   * saisie du joueur, ou une session (le handle y est dérivé du compte). Sinon
   * il n'y a pas de @ à montrer, et la carte disparaît — pas de placeholder.
   */
  const ownsHandle = editable.handle.trim().length > 0 || signedIn;
  const handle = !profileLoading && ownsHandle ? profile.handle : '';

  useEffect(() => {
    screen('amis');
  }, []);

  return (
    <StackScreen
      title={t(C.friendsTitle)}
      icon="ami"
      /* Le kicker ne porte QUE des faits : mon @ s'il existe, sinon rien.
         « 0 AMIS · 0 DEMANDES » comptait des demandes qui ne peuvent pas
         exister — deux zéros nus en tête d'écran. */
      kicker={handle ? t(C.friendsKickerHandle, { handle }) : undefined}
    >
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>
          {canSignIn ? t(C.friendsSignedOutTitle) : t(C.friendsNotOpenTitle)}
        </Text>
        <Text style={styles.stateBody}>
          {canSignIn ? t(C.friendsSignedOutBody) : t(C.friendsNotOpenBody)}
        </Text>
        {/* UN SEUL CTA, et seulement là où il change quelque chose : se
            connecter ramène une identité. Dans l'autre cas il n'y a rien à
            faire — un bouton y serait du décor. */}
        {canSignIn ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.signIn)}
            onPress={() => router.push('/sign-in')}
            style={({ pressed }) => [styles.stateCta, pressed && styles.statePressed]}
          >
            <Text style={styles.stateCtaLabel} numberOfLines={1}>
              {t(C.signIn)}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* MON @ — la seule donnée réelle de cet écran. Absente = rien d'affiché
          (jamais un « @ » orphelin ni le handle démo « koro »).
          Aucun QR n'est dessiné : l'icône `qr` en 120 px d'avant se présentait
          comme un code scannable que personne n'aurait pu scanner. */}
      {handle ? (
        <View style={styles.handleWrap}>
          <View style={styles.handleCard}>
            <Icon name="profil" size={64} color={colors.blanc} />
            <Text style={styles.handleText}>@{handle}</Text>
          </View>
          <Text style={styles.handleHint}>{t(C.qrHintReal)}</Text>
        </View>
      ) : null}

      <Text style={styles.footnote}>{t(C.friendsFootnote)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // ── État honnête (§A : ce qui manque + UNE action, jamais un trou) ──
  stateCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  stateTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },
  stateCta: {
    backgroundColor: gameColors.crew,
    borderRadius: radii.pill,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  // Texte NOIR sur chartreuse — jamais de chartreuse sur fond clair (charte).
  stateCtaLabel: {
    color: colors.noir,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statePressed: { opacity: 0.7 },

  // ── Mon @ ──
  handleWrap: { marginTop: spacing.lg, alignItems: 'center', gap: 16 },
  handleCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
  },
  handleText: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  handleHint: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 22,
  },
});
