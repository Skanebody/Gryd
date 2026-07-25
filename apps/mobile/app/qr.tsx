/**
 * GRYD — ÉCRAN « MON CODE » (/qr, planche E16 variante profil).
 *
 * L'objet : connecter deux personnes qui se croisent DANS LA VRAIE VILLE en
 * deux secondes. On montre son écran, l'autre a l'adresse.
 *
 * ── CE QUI EST LIVRÉ, ET CE QUI NE L'EST PAS ────────────────────────────────
 * La planche décrit DEUX onglets (« Mon code | Scanner ») et une variante crew.
 *  · L'onglet SCANNER n'est pas peint : `apps/mobile/package.json` n'a AUCUNE
 *    dépendance caméra (ni expo-camera, ni scanner de code-barres) et ce
 *    chantier n'a pas le droit d'en installer. Un segmented dont un onglet sur
 *    deux ne peut rien faire est un bouton mort déguisé en navigation ; et un
 *    segmented à un seul item n'est plus un segmented. On l'OMET, et on le DIT
 *    en bas d'écran, avec l'alternative qui marche (montrer / envoyer).
 *    Corollaire : l'état « permission caméra refusée » de la planche n'existe
 *    pas ici — on ne demande aucune permission.
 *  · La variante « INVITER AU CREW » EXISTE DÉJÀ ailleurs
 *    (`features/crew/CrewInviteQRScreen`, atteinte depuis l'onglet Crew) et
 *    n'est pas dupliquée : deux générateurs de QR crew divergeraient au premier
 *    changement de format de lien.
 *
 * ── LES QUATRE ÉTATS, JAMAIS CONFONDUS ──────────────────────────────────────
 *   (a) hydratation (session ou profil pas encore lus) → on n'affirme RIEN,
 *       aucun squelette de QR, aucune carte grise ;
 *   (b) pas connecté ET un backend existe → une phrase + « Se connecter », le
 *       seul geste qui change quelque chose ;
 *   (c) aucun @handle qui appartienne vraiment au joueur → on demande le
 *       @handle plutôt que d'imprimer un QR vers @coureur, un pseudo générique
 *       qui n'est à personne ;
 *   (d) prêt → la carte.
 * Il n'y a PAS de cinquième état « échec de chargement » : rien n'est lu au
 * réseau sur cet écran. Le QR est généré LOCALEMENT (react-native-qrcode-svg
 * est du JS/SVG pur) — il fonctionne en avion, dans un parking, en course.
 *
 * ── LE LIEN NE MÈNE ENCORE NULLE PART, ET L'ÉCRAN LE DIT ───────────────────
 * `buildProfileLink` produit une URL BIEN FORMÉE, mais aucune page ne répond
 * sur le domaine (arbitrage gryd.run/gryd.app non rendu, O10) et l'app n'a pas
 * de route `/u/[handle]`. On ne promet donc ni « scannez pour suivre » ni
 * « scannez pour défier » (il n'existe ni suivi ni duel joueur-contre-joueur) :
 * on dit ce que le code CONTIENT, et on dit que la page n'est pas en ligne.
 */
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, elevation, fonts, fontSizes, iconSizes, radii, sizes, spacing } from '@klaim/shared';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/qr';
import { EVENTS, track } from '../src/lib/analytics';
import { useSession } from '../src/lib/session';
import { effectiveInitials, useMyProfile } from '../src/features/social/profileStore';
import { ProfileQRCard } from '../src/features/social/ProfileQRCard';
import {
  buildProfileLink,
  profileLinkLabel,
  profileShareMessage,
} from '../src/features/social/profileLink';
import { ToastHost, useToast } from '../src/features/social/Toast';
import { copyText, openShareSheet, shareAsImage } from '../src/features/share/shareActions';
import type { ShareActionResult } from '../src/features/share/shareActions';

export default function QRScreen() {
  const t = useT();
  const toast = useToast();
  /** Cible EXACTE de l'export PNG (`collapsable={false}` obligatoire côté natif). */
  const cardRef = useRef<View>(null);

  const { session, configured, loading: sessionLoading } = useSession();
  const { profile, editable, loading: profileLoading } = useMyProfile();

  /** Un écran de connexion qui MARCHE existe-t-il ? Sans backend, /sign-in n'a personne au bout. */
  const signedIn = configured && session !== null;
  const canSignIn = configured && !session && !sessionLoading;
  /** Tant que ça n'a pas résolu, la moindre valeur affichée serait un défaut, pas un fait. */
  const hydrating = sessionLoading || profileLoading;

  /**
   * MON @ N'EST À MOI QUE S'IL VIENT DE MOI (même porte qu'amis.tsx, lignes
   * 54-64). `useMyProfile()` ne laisse jamais un @handle blanc à l'écran : sans
   * saisie ni session il retombe sur « @coureur ». Ce repli est honnête pour un
   * libellé d'avatar ; il ne l'est pas ici, où l'écran dit « voici comment on me
   * retrouve ». On n'imprime donc un code que si le @ est adossé à une saisie du
   * joueur ou à un compte.
   */
  const ownsHandle = editable.handle.trim().length > 0 || signedIn;
  /** Même raisonnement pour le NOM : le neutre « Coureur » n'est l'identité de personne. */
  const ownsName = editable.displayName.trim().length > 0 || signedIn;

  const handle = profile.handle;
  const link = !hydrating && ownsHandle ? buildProfileLink(handle) : null;

  // ── Actions. Aucune ne confirme quoi que ce soit avant d'avoir réussi. ─────

  /**
   * Un « annulé » n'est pas une erreur (fermer une feuille de partage est un
   * droit) → silence. Et on ne dit « copié » que si le presse-papier a VRAIMENT
   * servi : `copyText` retombe silencieusement sur la feuille de partage quand
   * expo-clipboard est absent, en renvoyant quand même `ok:true` — annoncer
   * « copié » dans ce cas serait un mensonge d'écran (correctif déjà appliqué
   * une fois dans CrewInviteQRScreen).
   */
  const settle = useCallback(
    (p: Promise<ShareActionResult>, channel: string) => {
      void p.then((r) => {
        if (r.ok) {
          track(EVENTS.shareCompleted, { channel });
          toast.show(t(r.via === 'clipboard' ? C.toastCopied : C.toastShared));
          return;
        }
        if (r.reason === 'unavailable') toast.show(t(C.toastShareUnavailable));
      });
    },
    [t, toast],
  );

  const onShareLink = useCallback(() => {
    if (!link) return;
    // Message PROPRE AU PROFIL — surtout pas `inviteMessage()` de crew/invite.ts,
    // qui dit « prenons le quartier ensemble » : ici on ne recrute personne.
    settle(openShareSheet(profileShareMessage(link)), 'profile_link');
  }, [link, settle]);

  const onCopyLink = useCallback(() => {
    if (!link) return;
    settle(copyText(link), 'profile_link_copy');
  }, [link, settle]);

  /**
   * « Partager l'image » et NON « Enregistrer l'image » comme la planche :
   * `app.json` ne déclare pas `NSPhotoLibraryAddUsageDescription`, donc une
   * écriture dans la pellicule iOS échouerait TOUJOURS, et app.json est hors du
   * périmètre de ce chantier. Un bouton qui échoue toujours est un bouton mort.
   * `shareAsImage` (view-shot + expo-sharing, répertoire de cache) ne demande
   * aucune permission photo et retombe sur le partage texte si la capture rate.
   */
  const onShareImage = useCallback(() => {
    if (!link) return;
    settle(shareAsImage(cardRef.current, profileShareMessage(link)), 'profile_qr_image');
  }, [link, settle]);

  // ── (a) HYDRATATION : une phrase, rien d'autre. Un chargement n'affirme rien. ─
  if (hydrating) {
    return (
      <StackScreen title={t(C.title)} icon="qr">
        <Text style={styles.loading}>{t(C.stateLoading)}</Text>
      </StackScreen>
    );
  }

  // ── (b) et (c) : pas de code à montrer. UN seul CTA, là où il change quelque chose. ─
  if (!link) {
    const needsAccount = canSignIn && !ownsHandle;
    return (
      <StackScreen title={t(C.title)} icon="qr">
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>
            {t(needsAccount ? C.stateSignedOutTitle : C.stateNoHandleTitle)}
          </Text>
          <Text style={styles.stateBody}>
            {t(needsAccount ? C.stateSignedOutBody : C.stateNoHandleBody)}
          </Text>
          <View style={styles.stateCta}>
            <Button
              label={t(needsAccount ? C.signIn : C.stateNoHandleCta)}
              analyticsId={needsAccount ? 'qr_sign_in' : 'qr_pick_handle'}
              onPress={() => router.push(needsAccount ? '/sign-in' : '/profil-edit')}
            />
          </View>
        </View>
        <Text style={styles.footnote}>{t(C.scannerTitle)}</Text>
        <Text style={styles.footnoteBody}>{t(C.scannerBody)}</Text>
      </StackScreen>
    );
  }

  // ── (d) PRÊT ──────────────────────────────────────────────────────────────
  const city = profile.city.trim();
  const identityLine = city
    ? t(C.handleCity, { handle, city })
    : t(C.handleOnly, { handle });

  return (
    <StackScreen
      title={t(C.title)}
      icon="qr"
      /* Action d'en-tête = COPIER, pas « partager ». La planche pose une icône
         de partage ici, mais l'écran a déjà « Partager le lien » en CTA
         chartreuse : dupliquer sa seule décision dans la barre est exactement le
         doublon que §A interdit. Copier est l'action DISTINCTE dont la carte a
         besoin (l'URL est affichée juste dessous), et c'est le couple
         partager/copier déjà rodé sur le QR crew. */
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yCopy)}
          onPress={onCopyLink}
          hitSlop={8}
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
        >
          <Icon name="copier" size={iconSizes.md} color={colors.blanc} />
        </Pressable>
      }
      floating={<ToastHost state={toast} />}
    >
      <View ref={cardRef} collapsable={false}>
        <ProfileQRCard
          displayName={ownsName ? profile.displayName : null}
          identityLine={identityLine}
          link={link}
          linkLabel={profileLinkLabel(link)}
          qrA11yLabel={t(C.cardA11y, { handle })}
          initials={effectiveInitials({
            avatarInitials: editable.avatarInitials,
            // Sans nom possédé, l'initiale se dérive du @handle — lui, il est
            // réel. Jamais le « ? » du repli, jamais l'initiale d'un neutre.
            displayName: ownsName ? profile.displayName : handle,
          })}
          avatarColor={profile.avatarColor}
          avatarUri={profile.avatarUri || undefined}
        />
      </View>

      <Text style={styles.tagline}>{t(C.tagline)}</Text>
      <Text style={styles.privacy}>{t(C.privacyNote)}</Text>

      <View style={styles.cta}>
        <Button
          label={t(C.ctaShare)}
          icon="partage"
          analyticsId="qr_share_link"
          onPress={onShareLink}
        />
      </View>
      <View style={styles.secondary}>
        <Button variant="ghost" size="md" label={t(C.ctaShareImage)} onPress={onShareImage} />
      </View>

      {/* Ce qui n'existe pas encore, dit à sa place : en bas, en gris, après
          l'action — jamais en travers de l'écran. */}
      <Text style={styles.footnote}>{t(C.scannerTitle)}</Text>
      <Text style={styles.footnoteBody}>{t(C.scannerBody)}</Text>
      <Text style={styles.footnoteBody}>{t(C.linkPending)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },

  loading: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22, marginTop: spacing.lg },

  // ── États sans code (§A : ce qui manque + UNE action, jamais un trou) ──
  stateCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  stateTitle: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },
  stateCta: { marginTop: spacing.xs },

  // ── Sous la carte ──
  tagline: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  privacy: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  cta: { marginTop: spacing.lg },
  secondary: { marginTop: spacing.sm },

  footnote: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginTop: spacing.xl,
  },
  footnoteBody: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xxs,
  },
});
