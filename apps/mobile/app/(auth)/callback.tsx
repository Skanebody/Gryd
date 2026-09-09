import { useCallback, useRef, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/auth';
import { useT } from '../../src/i18n/store';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { rememberOnboardingCompletion2026 } from '../../src/features/onboarding/sessionCompletion2026';
import { completeAuthCallback } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { GrydMark } from '../../src/ui/gryd/GrydMark';
import { TranslucentControl2026 } from '../../src/ui/gryd/Surface2026';

export default function AuthCallbackScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  // Getter natif courant + événements warm-link. Contrairement à useURL(), il
  // ne démarre pas artificiellement à null avant une lecture asynchrone.
  const url = Linking.useLinkingURL();
  const { session, configured } = useSession();
  const { update } = useOnboardingState();
  const handledUrl = useRef<string | null>(null);
  const exchanges = useRef(new Map<string, ReturnType<typeof completeAuthCallback>>());
  const generation = useRef(0);
  const [failed, setFailed] = useState(false);

  useFocusEffect(useCallback(() => {
    const current = ++generation.current;
    if (!url) {
      setFailed(true);
      return () => { generation.current += 1; };
    }
    if (handledUrl.current === url) {
      return () => { generation.current += 1; };
    }
    setFailed(false);
    void (async () => {
      try {
        if (generation.current !== current) return;
        // Refocusing the same one-use callback joins its exchange instead of
        // consuming the code a second time while the first request is pending.
        let exchange = exchanges.current.get(url);
        if (!exchange) { exchange = completeAuthCallback(url); exchanges.current.set(url, exchange); }
        const result = await exchange;
        if (generation.current !== current) return;
        handledUrl.current = url;
        if (result.ok) router.replace('/');
        else setFailed(true);
      } catch {
        if (generation.current !== current) return;
        handledUrl.current = url;
        setFailed(true);
      }
    })();
    return () => {
      generation.current += 1;
    };
  }, [url]));

  if (session || !configured) return <Redirect href="/" />;

  return <View style={styles.root}>
    <View style={[styles.frame, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <GrydMark variant="symbol" size={24} color={colors.chartreuse} />
      <TranslucentControl2026 tone="dark" style={styles.panel}>
        <View style={styles.content}>
          {failed ? <>
            <Text accessibilityRole="alert" style={styles.title}>{t(C.callbackFailed)}</Text>
            <Button size="md" label={t(C.emailCta)} onPress={() => router.replace('/email')} />
            <Button label={t(C.guestCta)} onPress={() => {
              rememberOnboardingCompletion2026(true);
              void update({ onboardingDone: true, reachedStep: 'map' });
              router.replace('/');
            }} variant="ghost" size="md" />
          </> : <>
            <ActivityIndicator color={colors.chartreuse} />
            <Text accessibilityRole="header" style={styles.title}>{t(C.callbackChecking)}</Text>
          </>}
        </View>
      </TranslucentControl2026>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  frame: { flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  panel: { borderRadius: 24, overflow: 'hidden' },
  content: { position: 'relative', zIndex: 1, padding: 18, gap: 12, alignItems: 'stretch' },
  title: { color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, textAlign: 'center' },
});
