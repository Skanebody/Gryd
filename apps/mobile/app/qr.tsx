/**
 * GRYD — ÉCRAN « MON CODE » (/qr, planche E16 variante profil).
 *
 * L'objet : connecter deux personnes qui se croisent DANS LA VRAIE VILLE en
 * deux secondes. On montre son écran, l'autre a l'adresse.
 *
 * ── CE QUI EST LIVRÉ, ET CE QUI NE L'EST PAS ────────────────────────────────
 * La planche décrit DEUX onglets (« Mon code | Scanner ») et une variante crew.
 *  · L'onglet SCANNER EXISTE DEPUIS LE 11/09/2026 (lot Q4). Il n'existait pas
 *    avant, et l'ancien en-tête de ce fichier disait pourquoi : le dépôt
 *    n'avait AUCUNE dépendance caméra. `expo-camera` est maintenant au build,
 *    et la règle qui justifiait l'absence n'a pas changé d'un mot : un onglet
 *    qui ne peut rien faire est un bouton mort déguisé en navigation. C'est
 *    `scanCapability2026` qui tranche, en lisant le BINAIRE (config embarquée
 *    + module natif) : sur le web l'onglet n'est pas peint du tout, et sur un
 *    build antérieur au plugin il est peint mais dit qu'un nouveau build est
 *    nécessaire. Le segmented n'apparaît donc jamais avec un côté mort.
 *  · L'onglet SCANNER NE DEMANDE AUCUN COMPTE. Scanner l'invitation de
 *    quelqu'un est justement ce que fait une personne qui n'a pas encore de
 *    compte : `/c/[code]` mémorise l'invitation et propose d'en créer un. Le
 *    segmented vit donc AU-DESSUS des états de profil, pas dedans.
 *  · La variante « INVITER AU CREW » EXISTE DÉJÀ ailleurs (`/crew-invitation`,
 *    `features/crew/CrewInvitationScreen2026`, atteinte en un tap depuis la
 *    page du crew) et n'est pas dupliquée : deux générateurs de QR crew
 *    divergeraient au premier changement de format de lien.
 *
 * ── LES TROIS ÉTATS, JAMAIS CONFONDUS ──────────────────────────────────────
 *   (a) hydratation (session ou profil pas encore lus) → on n'affirme RIEN,
 *       aucun squelette de QR, aucune carte grise ;
 *   (b) aucun @handle qui appartienne vraiment au joueur → la PORTE DE COMPTE
 *       partagée (`AccountDoor2026`), plutôt qu'un QR vers @coureur, un pseudo
 *       générique qui n'est à personne. Sans backend elle se dit fermée : elle
 *       ne s'efface pas, et elle ne renvoie plus vers /profil-edit, qui refuse
 *       toute saisie sans session (lot 11, 10/09/2026) ;
 *   (c) prêt → la carte.
 * Il n'y a PAS de quatrième état « échec de chargement » : rien n'est lu au
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
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, iconSizes, sizes, spacing } from '@klaim/shared';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { Segmented } from '../src/ui/game/Segmented';
import { QRScannerPanel2026 } from '../src/features/scan/QRScannerPanel2026';
import { scanAvailable2026 } from '../src/features/scan/scanCapability2026';
import { useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/qr';
import { EVENTS, track } from '../src/lib/analytics';
import { useSession } from '../src/lib/session';
import { effectiveInitials, useMyProfile } from '../src/features/social/profileStore';
import { ProfileQRCard } from '../src/features/social/ProfileQRCard';
import { AccountDoor2026 } from '../src/features/account/AccountDoor2026';
import {
  buildProfileLink,
  profileLinkLabel,
  profileShareMessage,
} from '../src/features/social/profileLink';
import { ToastHost, useToast } from '../src/features/social/Toast';
import { copyText, openShareSheet, shareAsImage } from '../src/features/share/shareActions';
import type { ShareActionResult } from '../src/features/share/shareActions';

type QRTab = 'code' | 'scan';

export default function QRScreen() {
  const t = useT();
  const toast = useToast();
  /** Cible EXACTE de l'export PNG (`collapsable={false}` obligatoire côté natif). */
  const cardRef = useRef<View>(null);
  const [tab, setTab] = useState<QRTab>('code');
  /**
   * CE BINAIRE SAIT-IL SCANNER ? Mesuré une fois : ni le natif embarqué ni la
   * config du build ne changent en cours d'écran. `unsupported_platform` (web)
   * ⇒ AUCUN onglet : un segmented à un seul item n'est plus un segmented.
   */
  const scan = useMemo(() => scanAvailable2026(), []);
  const hasScanTab = scan !== 'unsupported_platform';

  const { session, configured, loading: sessionLoading } = useSession();
  const { profile, editable, loading: profileLoading } = useMyProfile();

  /** Une session RÉELLE : sans backend, `session` ne peut pas en être une. */
  const signedIn = configured && session !== null;
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

  /**
   * LE SÉLECTEUR D'ONGLETS. Il vit AU-DESSUS des trois états du profil, parce
   * que scanner ne dépend d'aucun compte : la personne qui n'en a pas encore
   * est précisément celle qui scanne l'invitation d'un ami. `tone="surface"` :
   * la chartreuse reste au CTA de l'écran (§A4), jamais sur une navigation.
   */
  const tabs = hasScanTab ? (
    <Segmented
      style={styles.tabs}
      tone="surface"
      accessibilityLabel={t(C.title)}
      value={tab}
      onChange={(id: QRTab) => setTab(id)}
      options={[
        { id: 'code' as QRTab, label: t(C.tabMyCode) },
        { id: 'scan' as QRTab, label: t(C.tabScanner) },
      ]}
    />
  ) : null;

  // ── L'ONGLET SCANNER : il n'attend NI session NI profil ───────────────────
  if (tab === 'scan') {
    return (
      <StackScreen title={t(C.title)} icon="qr">
        {tabs}
        <QRScannerPanel2026 />
      </StackScreen>
    );
  }

  // ── (a) HYDRATATION : une phrase, rien d'autre. Un chargement n'affirme rien. ─
  if (hydrating) {
    return (
      <StackScreen title={t(C.title)} icon="qr">
        {tabs}
        <Text style={styles.loading}>{t(C.stateLoading)}</Text>
      </StackScreen>
    );
  }

  // ── (b) PAS DE CODE À MONTRER, ET UNE SEULE RAISON À CELA ─────────────────
  // Sans session, `ownsHandle` ne peut être vrai que par un @handle DÉJÀ saisi
  // (un profil invité hérité) — et il n'y a alors plus rien à demander. Cet
  // état n'a donc qu'un occupant : quelqu'un sans compte. La porte partagée le
  // dit, et c'est elle qui porte le titre (lot 11, 10/09/2026).
  //
  // ÉTAPE 0 (10/09/2026), deux défauts en un seul bloc :
  //   · le bouton disait « Se connecter » (`C.signIn`), un mot qui n'ouvre rien
  //     à qui n'a PAS de compte, alors que /sign-in en crée un ;
  //   · sans backend, il basculait sur « Choisir mon @handle » vers
  //     /profil-edit, qui REFUSE toute saisie sans session (`profileStore.save`
  //     lève `authentication_required`) et rend, lui aussi, cette même porte.
  //     Le second geste était un détour vers le premier.
  if (!link) {
    return (
      <StackScreen title={t(C.title)} icon="qr">
        {tabs}
        <AccountDoor2026
          family="ui"
          reason={t(C.stateSignedOutBody)}
          analyticsId="qr_sign_in"
        />
        {/* La note « scanner » ne se dit QUE là où il n'y a pas d'onglet
            (le web) : ailleurs, l'onglet parle pour lui-même, et répéter son
            absence sous un onglet présent serait faux. */}
        {hasScanTab ? null : (
          <>
            <Text style={styles.footnote}>{t(C.scannerTitle)}</Text>
            <Text style={styles.footnoteBody}>{t(C.scannerBody)}</Text>
          </>
        )}
      </StackScreen>
    );
  }

  // ── (c) PRÊT ──────────────────────────────────────────────────────────────
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
      {tabs}
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
          l'action, jamais en travers de l'écran. La note « scanner » disparaît
          dès qu'un onglet Scanner existe : il dit lui-même son état. */}
      {hasScanTab ? null : (
        <>
          <Text style={styles.footnote}>{t(C.scannerTitle)}</Text>
          <Text style={styles.footnoteBody}>{t(C.scannerBody)}</Text>
        </>
      )}
      <Text style={styles.footnoteBody}>{t(C.linkPending)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { marginTop: spacing.lg },
  headerAction: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },

  loading: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22, marginTop: spacing.lg },

  // Les états sans code n'ont plus de card LOCALE : `AccountDoor2026` porte la
  // sienne (`Card`, surface N1), la même que partout ailleurs dans l'app.

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
