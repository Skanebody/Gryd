import { useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/authEmail';
import { C as AuthC } from '../../src/i18n/catalog/auth';
import { useT } from '../../src/i18n/store';
import { AGE } from '../../src/features/onboarding/content';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { rememberOnboardingCompletion2026 } from '../../src/features/onboarding/sessionCompletion2026';
import {
  classifyEmailLinkFailure,
  isEmailShapeValid,
  normalizeEmail,
  resendSecondsLeft,
} from '../../src/features/account/emailLink';
import { EMAIL_DELIVERY, requestEmailOtp, verifyEmailOtp } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { GrydMark } from '../../src/ui/gryd/GrydMark';
import { GrydIcon } from '../../src/ui/gryd/GrydIcon';
import { TranslucentControl2026 } from '../../src/ui/gryd/Surface2026';

type Step = 'email' | 'age' | 'sent' | 'code';

export default function EmailAuthScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { session, loading, configured } = useSession();
  const { state: onboarding, status: onboardingStatus, update } = useOnboardingState();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  /** Accusé de renvoi : sans lui, le joueur retape « Renvoyer » sans savoir. */
  const [resent, setResent] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (step !== 'sent' && step !== 'code') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  if (loading) return <View style={styles.root} />;
  if (session) return <Redirect href="/" />;
  // ⚠️ VERS LA PORTE, PAS VERS LA CARTE (10/09/2026). Un build sans Supabase
  // renvoyait ici à `/` sans un mot : qui ouvre `/email` par lien profond
  // atterrissait sur la carte comme si son geste avait raté. `/sign-in` rend
  // maintenant l'état honnête « Serveur non configuré sur ce build », qui dit
  // POURQUOI aucun compte ne peut être créé.
  if (!configured) return <Redirect href="/sign-in" />;

  // LA MÊME PHRASE QU'À L'ÉCRAN PRÉCÉDENT, mot pour mot : c'est la même entrée
  // de catalogue (`catalog/auth.ts`), plus un jumeau à tenir accordé. Elle dit
  // la CRÉATION d'abord — l'ordre inverse laissait le nouveau venu penser que
  // cette porte ne le concernait pas.
  const deliveryCopy = EMAIL_DELIVERY === 'code' ? AuthC.otpCreatesOrSignsIn : AuthC.otpCreatesOrSignsInLink;

  const request = async () => {
    if (inFlight.current) return;
    const normalized = normalizeEmail(email);
    if (!isEmailShapeValid(normalized)) {
      setError(t(C.errorInvalidEmail));
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setResent(false);
    let result;
    try {
      result = await requestEmailOtp(normalized);
    } catch {
      inFlight.current = false;
      if (mounted.current) {
        setBusy(false);
        setError(t(C.errorNetwork));
      }
      return;
    }
    inFlight.current = false;
    if (!mounted.current) return;
    setBusy(false);
    if (!result.ok) {
      const failure = classifyEmailLinkFailure(result.message);
      setError(t(
        failure.reason === 'invalid_email' ? C.errorInvalidEmail :
        failure.reason === 'rate_limited' ? C.errorRateLimited :
        failure.reason === 'network' ? C.errorNetwork : C.errorUnknown,
      ));
      return;
    }
    setEmail(normalized);
    // Un renvoi est un envoi qui SUCCÈDE à un premier : c'est exactement le
    // moment où rien ne se voit à l'écran (même titre, même adresse, même
    // panneau) et où le joueur retape le bouton en croyant l'avoir manqué.
    setResent(sentAt !== 0);
    setSentAt(Date.now());
    setNow(Date.now());
    setStep(EMAIL_DELIVERY === 'code' ? 'code' : 'sent');
  };

  const beginRequest = () => {
    if (onboarding.ageDeclined) return;
    if (!isEmailShapeValid(email)) {
      setError(t(C.errorInvalidEmail));
      return;
    }
    if (onboarding.ageConfirmed) void request();
    else setStep('age');
  };

  const confirmAge = () => {
    void update({ ageConfirmed: true, ageDeclined: false });
    void request();
  };

  /** Le mur : persisté, sans aucune sortie vers `/` (voir AuthEntry2026). */
  const declineAge = () => {
    setBusy(false);
    void update({ ageConfirmed: false, ageDeclined: true });
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code) || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    let result;
    try {
      result = await verifyEmailOtp(email, code);
    } catch {
      inFlight.current = false;
      if (mounted.current) {
        setBusy(false);
        setError(t(C.errorNetwork));
      }
      return;
    }
    inFlight.current = false;
    if (!mounted.current) return;
    setBusy(false);
    if (!result.ok) {
      // ÉTAPE 0 : TOUT échec de vérification rendait `errorSignInFailed`
      // (« La connexion a échoué. Réessaie »), y compris une coupure réseau et
      // un code déjà consommé. L'envoi, lui, classait déjà son refus depuis le
      // 27/07 — la même règle s'applique ici, sur le même module pur.
      const failure = classifyEmailLinkFailure(result.message);
      setError(t(
        failure.reason === 'rate_limited' ? C.errorRateLimited :
        failure.reason === 'network' ? C.errorNetwork :
        failure.reason === 'invalid_email' ? C.errorInvalidEmail :
        AuthC.errorSignInFailed,
      ));
    }
  };

  const seconds = sentAt ? resendSecondsLeft(sentAt, now) : 0;
  const guest = () => {
    if (inFlight.current || onboarding.ageDeclined) return;
    inFlight.current = true;
    rememberOnboardingCompletion2026(true);
    void update({ onboardingDone: true, reachedStep: 'map' });
    router.replace('/');
    // Même correctif que `AuthEntry2026.guest` : sur une cible où l'écran reste
    // monté après `replace`, un `inFlight` bloqué rendait tout l'écran inerte.
    inFlight.current = false;
  };
  const reading = onboardingStatus === 'reading';
  const declined = onboarding.ageDeclined;

  return <View style={styles.root}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <TranslucentControl2026 tone="dark" style={styles.backSurface}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.backA11y)}
              accessibilityState={{ disabled: busy }}
              aria-disabled={busy}
              disabled={busy}
              // Sans pile (lien profond, ou `callback.tsx` qui REMPLACE vers ici),
              // `back()` ne ferait rien : un bouton mort. On retombe sur l'entree.
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <GrydIcon name="chevronLeft" size={18} color={colors.blanc} />
              <Text style={styles.backText}>{t(C.backLabel)}</Text>
            </Pressable>
          </TranslucentControl2026>
        </View>
        <View style={styles.heading}>
          <Text style={styles.kicker}>{t(C.kicker)}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {declined ? t(C.title) : step === 'sent' ? t(C.sentTitle) : t(C.title)}
          </Text>
          {/* Derrière le mur, ne pas promettre ce que l'e-mail contiendra. */}
          {declined ? null : <Text style={styles.subtitle}>{t(deliveryCopy)}</Text>}
        </View>

        <TranslucentControl2026 tone="dark" style={styles.panel}>
          <View style={styles.panelContent}>
            {/* Tant que le stockage n'a pas répondu, on ne peint NI le
                formulaire NI le mur : peindre le formulaire rouvrirait la porte
                à quelqu'un qui l'a fermée au lancement précédent. */}
            {reading ? <View style={styles.reading}><ActivityIndicator color={colors.blanc} /></View> : null}

            {/* LE MUR — persisté, et sans aucune sortie vers `/`. « Continuer
                sans compte » se trouvait juste dessous et ouvrait toute l'app :
                la phrase et le bouton se contredisaient. */}
            {!reading && declined ? <>
              <Text accessibilityRole="header" style={styles.panelTitle}>{t(AGE.blockedTitle)}</Text>
              <Text style={styles.note}>{t(AGE.blockedTagline)}</Text>
              <Button label={t(AGE.notMe)} onPress={() => void update({ ageDeclined: false })} variant="ghost" size="md" />
            </> : null}

            {!reading && !declined && step === 'email' ? <>
              <Text style={styles.fieldLabel}>{t(C.emailLabel)}</Text>
              <TextInput
                accessibilityLabel={t(C.emailLabel)}
                style={styles.input}
                value={email}
                onChangeText={(value) => { setEmail(value); setError(null); }}
                placeholder={t(C.emailPlaceholder)}
                placeholderTextColor={colors.gris}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Button size="md"
                label={EMAIL_DELIVERY === 'code' ? t(AuthC.otpRequestCta) : t(C.cta)}
                onPress={beginRequest}
                loading={busy}
                disabled={!email.trim()}
                analyticsId="auth_email_request"
              />
            </> : null}

            {!reading && !declined && step === 'age' ? <>
              <Text accessibilityRole="header" style={styles.panelTitle}>{t(AGE.title)}</Text>
              <Text style={styles.note}>{t(AGE.tagline)}</Text>
              <Text style={styles.note}>{t(AuthC.ageAccountOnly)}</Text>
              <Button size="md" label={t(AGE.confirm)} onPress={confirmAge} loading={busy} />
              <Button label={t(AGE.under)} onPress={declineAge} variant="ghost" size="md" disabled={busy} />
            </> : null}

            {!reading && !declined && step === 'sent' ? <>
              <Text style={styles.panelTitle}>{t(C.sentBody, { email })}</Text>
              <Text style={styles.note}>{t(C.sentHint)}</Text>
              {/* ÉCRITE DEPUIS JUILLET, RENDUE NULLE PART. Le spam est la
                  première cause de « le lien ne marche pas » : la phrase
                  existait dans le catalogue et aucun écran ne la peignait. */}
              <Text style={styles.note}>{t(C.sentSpamHint)}</Text>
              {/* L'ACCUSÉ DE RENVOI. Sans lui, « Renvoyer le lien » ne changeait
                  RIEN à l'écran : même titre, même adresse, même panneau — et le
                  joueur retapait le bouton jusqu'à se faire limiter. */}
              {resent ? <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.note}>{t(C.resendDone)}</Text> : null}
              <Button
                label={seconds > 0 ? t(C.resendCountdown, { s: seconds }) : t(C.resendCta)}
                onPress={() => void request()}
                disabled={seconds > 0}
                loading={busy}
                variant="ghost"
                size="md"
              />
              <Button label={t(C.sentChangeEmail)} onPress={() => setStep('email')} variant="ghost" size="md" disabled={busy} />
            </> : null}

            {!reading && !declined && step === 'code' ? <>
              <Text style={styles.panelTitle}>{t(AuthC.otpSent, { email })}</Text>
              <Text style={styles.fieldLabel}>{t(AuthC.otpFieldA11y)}</Text>
              <TextInput
                accessibilityLabel={t(AuthC.otpFieldA11y)}
                style={[styles.input, styles.code]}
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
              />
              <Button size="md" label={t(AuthC.otpVerifyCta)} onPress={() => void verify()} disabled={code.length !== 6} loading={busy} />
              <Button
                label={seconds > 0 ? t(C.resendCountdown, { s: seconds }) : t(AuthC.otpResendCta)}
                onPress={() => void request()}
                disabled={seconds > 0}
                variant="ghost"
                size="md"
              />
            </> : null}

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {/* PAS DE SORTIE SOUS LE MUR. C'était le défaut : « Continuer sans
                compte » était rendu quelle que soit l'étape, y compris sous
                « GRYD n'est pas accessible avant 16 ans ». */}
            {!reading && !declined ? <View style={styles.guestBlock}>
              <Button label={t(AuthC.guestCta)} onPress={guest} variant="ghost" size="md" disabled={busy} />
              <Text style={styles.note}>{t(AuthC.guestNote)}</Text>
            </View> : null}
          </View>
        </TranslucentControl2026>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 18, gap: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backSurface: { borderRadius: 22, overflow: 'hidden' },
  back: { position: 'relative', zIndex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13 },
  backText: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.68 },
  heading: { gap: 8 },
  kicker: { color: colors.gris, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1 },
  title: { color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  subtitle: { color: colors.gris, fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  panel: { marginTop: 'auto', borderRadius: 24, overflow: 'hidden' },
  panelContent: { position: 'relative', zIndex: 1, padding: 18, gap: 12 },
  panelTitle: { color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 23 },
  fieldLabel: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: 13, lineHeight: 18 },
  input: { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.blanc22, backgroundColor: colors.carbone2, color: colors.blanc, paddingHorizontal: 16, fontFamily: fonts.text, fontSize: 16 },
  code: { textAlign: 'center', fontFamily: fonts.mono, fontSize: 20, letterSpacing: 5 },
  note: { color: colors.gris, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  reading: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19 },
  guestBlock: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.grisLigne, gap: 8 },
});
