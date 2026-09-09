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
import {
  GOOGLE_CAPABLE,
  isAppleAuthAvailable,
  isSilentFailure,
  signInWithApple,
  signInWithGoogle,
  type AuthResult,
} from '../../lib/auth';
import { useSession } from '../../lib/session';

type AccountMethod = 'apple' | 'google' | 'email';

export interface AuthEntry2026Props {
  renderAppleButton?: (onPress: () => void, busy: boolean) => ReactNode;
}

function visibleFailure(result: AuthResult): boolean {
  return !result.ok && !isSilentFailure(result);
}

export function AuthEntry2026({ renderAppleButton }: AuthEntry2026Props) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const locale = useLocale();
  const { session, loading, configured } = useSession();
  const { state: onboarding, status: onboardingStatus, update } = useOnboardingState();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [pending, setPending] = useState<AccountMethod | null>(null);
  const [ageDeclined, setAgeDeclined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
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
    setFailed(false);
    try {
      const result = method === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (mounted.current) setFailed(visibleFailure(result));
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void isAppleAuthAvailable().then((available) => {
      if (active) setAppleAvailable(available);
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
  if (session || !configured) return <Redirect href="/" />;

  const begin = (method: AccountMethod) => {
    if (!focused.current) return;
    setFailed(false);
    if (onboarding.ageConfirmed) void finish(method);
    else setPending(method);
  };

  const confirmAge = () => {
    const method = pending;
    if (!method || !focused.current) return;
    setAgeDeclined(false);
    setPending(null);
    void update({ ageConfirmed: true });
    void finish(method);
  };

  const guest = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    rememberOnboardingCompletion2026(true);
    void update({ onboardingDone: true, reachedStep: 'map' });
    router.replace('/');
  };
  const checkingAge = pending !== null && onboardingStatus === 'reading';

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
          {checkingAge ? <ActivityIndicator color={colors.blanc} /> : pending ? (
            <>
              <Text accessibilityRole="header" style={styles.panelTitle}>
                {t(ageDeclined ? AGE.blockedTitle : AGE.title)}
              </Text>
              <Text style={styles.panelNote}>
                {t(ageDeclined ? AGE.blockedTagline : AGE.tagline)}
              </Text>
              <Text style={styles.panelNote}>{t(C.ageAccountOnly)}</Text>
              {!ageDeclined ? <Button size="md"
                label={t(AGE.confirm)}
                accessibilityLabel={t(AGE.confirmA11y)}
                onPress={confirmAge}
                loading={busy}
                analyticsId="signin_age_confirm"
              /> : null}
              {!ageDeclined ? <Button
                label={t(AGE.under)}
                onPress={() => setAgeDeclined(true)}
                variant="ghost"
                size="md"
              /> : null}
              <Button label={t(C.guestCta)} onPress={guest} variant="ghost" size="md" disabled={busy} />
            </>
          ) : (
            <>
              <Text style={styles.panelTitle}>{t(C.title)}</Text>
              {appleAvailable && renderAppleButton ? renderAppleButton(() => begin('apple'), busy) : null}
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
              {failed ? <Text accessibilityRole="alert" style={styles.error}>
                {t(C.errorSignInFailed)}
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
  error: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19 },
  guestBlock: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.grisLigne, gap: 9 },
  guestNote: { color: colors.gris, fontFamily: fonts.text, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  legal: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  legalLead: { color: colors.gris, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  legalLinkText: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
});
