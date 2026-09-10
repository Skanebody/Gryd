/**
 * GRYD — G02 « Connexion et création de compte ». La porte de compte du cahier.
 *
 * ─── LE DÉFAUT DU FONDATEUR (10/09/2026) : LA PORTE NE DISAIT PAS QU'ELLE CRÉE ─
 * « je ne suis pas connecté, l'application s'ouvre sur la carte, on me dit de me
 * connecter mais je n'ai aucun moyen de créer mon compte. » Il avait raison, et
 * rien n'était cassé : cet écran CRÉE le compte depuis toujours
 * (`shouldCreateUser: true` dans `requestEmailOtp`), il ne le disait nulle part.
 * Kicker « CONNEXION », titre « Retrouve ton terrain », trois boutons
 * « Continuer avec… » : pas une occurrence du verbe « créer ». Deviner qu'un
 * lien par e-mail ouvre un compte n'est pas un geste de joueur, c'est un savoir
 * de développeur.
 *
 * DEUX CHOSES CHANGENT ICI, ET AUCUNE N'EST DÉCORATIVE :
 *  1. LE TITRE nomme les deux gestes (`methodsTitle` → « Crée ton compte ou
 *     connecte-toi ») et le corps s'adresse d'abord à celui qui n'a pas de
 *     compte. La porte Apple reste la PREMIÈRE proposition sur iOS.
 *  2. SOUS LA PORTE E-MAIL, une phrase dit ce qu'elle fait vraiment, et c'est
 *     la MÊME entrée de catalogue que rend `/email` à l'écran suivant.
 *
 * ─── ET LA PORTE NE PEUT PLUS S'ÉVAPORER ────────────────────────────────────
 * `if (session || !configured) return <Redirect href="/" />;` renvoyait à la
 * carte, SANS UN MOT, tout build sans Supabase configuré : taper « Créer mon
 * compte » ramenait à la carte, exactement comme un bouton qui rate. Une porte
 * qui ne peut pas s'ouvrir se dit fermée et se dit POURQUOI (`noBackendTitle` +
 * `errorNoBackend`). La redirection ne vaut plus que pour une session ouverte,
 * où il n'y a plus rien à faire ici.
 *
 * ─── QUATRE DÉFAUTS CORRIGÉS LE 10/09/2026 ──────────────────────────────────
 *
 * 1. LE REFUS D'ÂGE ÉTAIT CONTOURNABLE, ET IL S'EFFAÇAIT AU REDÉMARRAGE.
 *    L'écran affichait « GRYD n'est pas accessible avant 16 ans » et peignait,
 *    juste dessous, « Continuer sans compte » — qui ouvrait toute l'app. La
 *    phrase et le bouton se contredisaient dans le même panneau. Pire, le refus
 *    ne vivait que dans un `useState` : relancer l'app le faisait disparaître.
 *    Désormais : le mur n'a AUCUNE sortie vers `/`, sa seule issue est « Ce
 *    n'est pas moi » (retour à la question), et il est PERSISTÉ
 *    (`onboarding/store`, champ `ageDeclined`).
 *    ⚠️ Le seuil reste 16 ans : le cahier §13.5 dit que « l'âge de disponibilité
 *    réel et la classification App Store sont évalués séparément ». Ce n'est pas
 *    une décision d'écran.
 *
 * 2. TOUS LES BOUTONS MOURAIENT APRÈS « CONTINUER SANS COMPTE ». `guest()`
 *    posait `inFlight.current = true` et ne le remettait JAMAIS à `false`. Sur
 *    une cible où l'écran reste monté après `router.replace` (le web), revenir
 *    dessus trouvait un écran entièrement inerte : chaque `finish()` et chaque
 *    `guest()` sortaient immédiatement sur le premier test.
 *
 * 3. LE PANNEAU SAUTAIT SOUS LE DOIGT. `isAppleAuthAvailable()` est une sonde
 *    ASYNCHRONE : le premier rendu ne peignait pas le bouton Apple, la réponse
 *    arrivait quelques dizaines de millisecondes plus tard et tout le panneau se
 *    décalait de 48 pt — au moment exact où le joueur vise un bouton. La place
 *    est maintenant RÉSERVÉE tant que la sonde n'a pas répondu, et seulement là
 *    où Apple est possible en principe (`APPLE_PLATFORM`).
 *
 * 4. SIX MOTIFS D'ÉCHEC, UNE SEULE PHRASE. Voir
 *    `features/account/authFailure2026.ts` : « Sign in with Apple n'est pas
 *    proposé sur cet appareil » ne dit plus « Réessaie ».
 *
 * ─── UN SEUL TITRE HÉROS (L12) ──────────────────────────────────────────────
 * L'écran empilait deux titres : `methodsTitle` en héros et `title`
 * (« Connecte-toi. ») en tête de panneau, à 200 px d'écart, tous deux en gras.
 * Le second ne disait rien que les boutons ne disaient déjà. Un écran, un titre.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@klaim/shared';
import { C } from '../../i18n/catalog/auth';
import { useLocale, useT } from '../../i18n/store';
import { AGE } from '../onboarding/content';
import { useOnboardingState } from '../onboarding/store';
import { rememberOnboardingCompletion2026 } from '../onboarding/sessionCompletion2026';
import { Button } from '../../ui/Button';
import { GrydMark } from '../../ui/gryd/GrydMark';
import { brandImagery } from '../../ui/gryd/brandImagery';
import { TranslucentControl2026 } from '../../ui/gryd/Surface2026';
import { authFailureVoice2026, type AuthFailureVoice2026 } from './authFailure2026';
import {
  APPLE_PLATFORM,
  EMAIL_DELIVERY,
  GOOGLE_CAPABLE,
  isAppleAuthAvailable,
  signInWithApple,
  signInWithGoogle,
  type AuthResult,
} from '../../lib/auth';
import { useSession } from '../../lib/session';

type AccountMethod = 'apple' | 'google' | 'email';

/**
 * Hauteur du bouton natif Apple — LA MÊME que celle peinte par
 * `app/(auth)/sign-in.tsx`. Exportée pour qu'il n'y ait qu'un seul nombre : une
 * place réservée qui ne correspond pas au bouton ne supprime pas le saut, elle
 * le déplace.
 */
export const APPLE_BUTTON_HEIGHT = 48;

/** Ce que la sonde de capacité Apple sait, en trois états — jamais deux. */
type AppleProbe = 'probing' | 'available' | 'unavailable';

export interface AuthEntry2026Props {
  renderAppleButton?: (onPress: () => void, busy: boolean) => ReactNode;
}

export function AuthEntry2026({ renderAppleButton }: AuthEntry2026Props) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const locale = useLocale();
  const { session, loading, configured } = useSession();
  const { state: onboarding, status: onboardingStatus, update } = useOnboardingState();
  const [appleProbe, setAppleProbe] = useState<AppleProbe>('probing');
  const [pending, setPending] = useState<AccountMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState<AuthFailureVoice2026 | null>(null);
  const [photoWidth, setPhotoWidth] = useState(0);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const focused = useRef(false);

  const finish = useCallback(async (method: AccountMethod) => {
    if (inFlight.current || !focused.current) return;
    if (method === 'email') {
      router.push('/email');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setVoice(null);
    try {
      const result: AuthResult = method === 'apple' ? await signInWithApple() : await signInWithGoogle();
      const next = authFailureVoice2026(result);
      if (mounted.current) setVoice(next === 'silent' ? null : next);
    } catch {
      if (mounted.current) setVoice('generic');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void isAppleAuthAvailable().then((available) => {
      if (active) setAppleProbe(available ? 'available' : 'unavailable');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => () => { mounted.current = false; }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => {
      focused.current = false;
      setPending(null);
    };
  }, []));

  useEffect(() => {
    if (!focused.current || !pending || onboardingStatus === 'reading' || !onboarding.ageConfirmed) return;
    const method = pending;
    setPending(null);
    void finish(method);
  }, [finish, onboarding.ageConfirmed, onboardingStatus, pending]);

  if (loading) return <View style={styles.root} />;
  // ⚠️ `!configured` A ÉTÉ RETIRÉ DE CETTE LIGNE (10/09/2026) : il renvoyait à la
  // carte sans rien dire. Il est rendu comme un ÉTAT, plus bas.
  if (session) return <Redirect href="/" />;

  // ⚠️ LE REFUS EST LU, PAS DEVINÉ. Tant que le stockage n'a pas répondu
  // (`reading`), le panneau ne peint NI les méthodes NI le mur : peindre les
  // méthodes reviendrait à rouvrir la porte pendant quelques centaines de
  // millisecondes à quelqu'un qui l'a fermée au lancement précédent.
  const reading = onboardingStatus === 'reading';
  const declined = onboarding.ageDeclined;

  const begin = (method: AccountMethod) => {
    if (!focused.current || declined) return;
    setVoice(null);
    if (onboarding.ageConfirmed) void finish(method);
    else setPending(method);
  };

  const confirmAge = () => {
    const method = pending;
    if (!method || !focused.current) return;
    setPending(null);
    void update({ ageConfirmed: true, ageDeclined: false });
    void finish(method);
  };

  /** Le mur. Aucune sortie latérale : il n'ouvre rien, il ne referme rien d'autre. */
  const declineAge = () => {
    setPending(null);
    setBusy(false);
    void update({ ageConfirmed: false, ageDeclined: true });
  };

  /** « Ce n'est pas moi » — la SEULE issue du mur, et elle revient à la question. */
  const undecline = () => {
    void update({ ageDeclined: false });
  };

  const guest = () => {
    if (inFlight.current || declined) return;
    inFlight.current = true;
    rememberOnboardingCompletion2026(true);
    void update({ onboardingDone: true, reachedStep: 'map' });
    router.replace('/');
    // ⚠️ REMIS À `false` (10/09/2026). Sur une cible où cet écran reste monté
    // après la navigation — react-native-web ne démonte pas toujours l'écran
    // remplacé — un `inFlight` resté à `true` rendait DÉFINITIVEMENT inertes
    // « Continuer avec un e-mail », Apple, Google et ce bouton-ci.
    inFlight.current = false;
  };

  const failureCopy = voice === 'apple_unavailable' ? C.errorAppleUnavailable
    : voice === 'google_not_configured' ? C.errorGoogleNotConfigured
    : voice === 'no_backend' ? C.errorNoBackend
    : voice === 'generic' ? C.errorSignInFailed
    : null;

  return <View style={styles.root}>
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <GrydMark variant="symbol" size={24} color={colors.chartreuse} />
        <Text style={styles.kicker}>{t(C.kicker)}</Text>
      </View>
      {/* LE SEUL TITRE DE L'ÉCRAN (L12). */}
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.title}>{t(C.methodsTitle)}</Text>
        <Text style={styles.subtitle}>{t(C.subtitle)}</Text>
      </View>
      <View style={styles.photo} onLayout={(event) => setPhotoWidth(event.nativeEvent.layout.width)}>
        <Image
          source={brandImagery.movement.source}
          accessibilityLabel={locale === 'fr' ? brandImagery.movement.fr : brandImagery.movement.en}
          style={[
            styles.photoImage,
            { height: photoWidth ? photoWidth * 1.5 : 88, top: photoWidth ? -(photoWidth * 1.5 - 88) * 0.30 : 0 },
          ]}
        />
      </View>

      <TranslucentControl2026 tone="dark" style={styles.panel}>
        <View style={styles.panelContent}>
          {reading ? <View style={styles.reading}><ActivityIndicator color={colors.blanc} /></View>
          : declined ? (
            <>
              <Text accessibilityRole="header" style={styles.panelTitle}>{t(AGE.blockedTitle)}</Text>
              <Text style={styles.panelNote}>{t(AGE.blockedTagline)}</Text>
              {/* Aucune sortie vers `/` ici — c'était la contradiction. */}
              <Button
                label={t(AGE.notMe)}
                onPress={undecline}
                variant="ghost"
                size="md"
                analyticsId="signin_age_not_me"
              />
            </>
          ) : !configured ? (
            /* NI ÉCHEC NI SILENCE : ce build n'a pas d'adresse de serveur, aucun
               compte ne peut y être créé, et l'écran le dit avant qu'on tape.
               La seule sortie mène là où l'app fonctionne encore. */
            <>
              <Text accessibilityRole="header" style={styles.panelTitle}>{t(C.noBackendTitle)}</Text>
              <Text style={styles.panelNote}>{t(C.errorNoBackend)}</Text>
              <Button
                label={t(C.noBackendBackCta)}
                onPress={() => router.replace('/')}
                variant="ghost"
                size="md"
                analyticsId="signin_no_backend_back"
              />
            </>
          ) : pending ? (
            <>
              <Text accessibilityRole="header" style={styles.panelTitle}>{t(AGE.title)}</Text>
              <Text style={styles.panelNote}>{t(AGE.tagline)}</Text>
              <Text style={styles.panelNote}>{t(C.ageAccountOnly)}</Text>
              <Button size="md"
                label={t(AGE.confirm)}
                accessibilityLabel={t(AGE.confirmA11y)}
                onPress={confirmAge}
                loading={busy}
                analyticsId="signin_age_confirm"
              />
              <Button label={t(AGE.under)} onPress={declineAge} variant="ghost" size="md" />
              <Button label={t(C.guestCta)} onPress={guest} variant="ghost" size="md" disabled={busy} />
            </>
          ) : (
            <>
              {/* PLACE RÉSERVÉE tant que la sonde n'a pas tranché : le panneau ne
                  bouge pas quand la réponse arrive. Rien n'est réservé là où
                  Apple est impossible en principe (Android, web). */}
              {APPLE_PLATFORM && renderAppleButton
                ? appleProbe === 'probing'
                  ? <View style={styles.appleReserve} />
                  : appleProbe === 'available' ? renderAppleButton(() => begin('apple'), busy) : null
                : null}
              {GOOGLE_CAPABLE ? <Button
                label={t(C.googleCta)}
                onPress={() => begin('google')}
                variant="ghost"
                size="md"
                loading={busy}
              /> : null}
              <Button size="md"
                label={t(C.emailCta)}
                onPress={() => begin('email')}
                loading={busy}
                analyticsId="signin_email_door"
              />
              {/* CE QUE LA PORTE FAIT, SOUS LA PORTE. Même entrée de catalogue
                  que le sous-titre de `/email` : le joueur relit mot pour mot ce
                  qu'il vient de lire, au lieu d'une paraphrase qui le fait
                  douter d'avoir changé de sujet. La cadence RÉELLEMENT servie
                  décide (lien ou code) — promettre un code non envoyé était la
                  panne d'origine. */}
              <Text style={styles.doorNote}>
                {t(EMAIL_DELIVERY === 'code' ? C.otpCreatesOrSignsIn : C.otpCreatesOrSignsInLink)}
              </Text>
              {failureCopy ? <Text accessibilityRole="alert" style={styles.error}>
                {t(failureCopy)}
              </Text> : null}
              <View style={styles.guestBlock}>
                <Button label={t(C.guestCta)} onPress={guest} variant="ghost" size="md" disabled={busy} />
                <Text style={styles.guestNote}>{t(C.guestNote)}</Text>
              </View>
            </>
          )}
        </View>
      </TranslucentControl2026>
      <View style={styles.legal}>
        <Text style={styles.legalLead}>{t(C.consentLead)}</Text>
        <Pressable accessibilityRole="link" onPress={() => { setPending(null); router.push('/legal/cgu'); }} style={styles.legalLink}>
          <Text style={styles.legalLinkText}>{t(C.consentTerms)}</Text>
        </Pressable>
        <Text style={styles.legalLead}>{t(C.consentAnd)}</Text>
        <Pressable accessibilityRole="link" onPress={() => { setPending(null); router.push('/legal/confidentialite'); }} style={styles.legalLink}>
          <Text style={styles.legalLinkText}>{t(C.consentPrivacy)}</Text>
        </Pressable>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 18, gap: 16 },
  brandRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kicker: { color: colors.gris, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1 },
  hero: { gap: 8 },
  title: { color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  subtitle: { maxWidth: 360, color: colors.gris, fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  photo: { height: 88, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.carbone },
  photoImage: { position: 'absolute', width: '100%', resizeMode: 'cover' },
  panel: { marginTop: 'auto', borderRadius: 24, overflow: 'hidden' },
  panelContent: { position: 'relative', zIndex: 1, padding: 18, gap: 12 },
  panelTitle: { color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 23 },
  panelNote: { color: colors.gris, fontFamily: fonts.text, fontSize: 13, lineHeight: 19 },
  // La lecture du stockage ne fait pas rétrécir le panneau : elle occupe la
  // hauteur d'un bouton, comme ce qui la remplacera.
  reading: { minHeight: APPLE_BUTTON_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  appleReserve: { alignSelf: 'stretch', height: APPLE_BUTTON_HEIGHT },
  doorNote: { marginTop: -4, color: colors.gris, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 },
  error: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19 },
  guestBlock: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.grisLigne, gap: 9 },
  guestNote: { color: colors.gris, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  legal: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  legalLead: { color: colors.gris, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  legalLinkText: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
});
