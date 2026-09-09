/**
 * GRYD — G02, état « retour du lien magique ». Ce que l'écran a le droit de dire.
 *
 * ─── DEUX DÉFAUTS CORRIGÉS LE 10/09/2026 ────────────────────────────────────
 *
 * 1. IL DÉCLARAIT L'ÉCHEC AVANT D'AVOIR ATTENDU. Le premier rendu faisait :
 *
 *        if (!url) { setFailed(true); return; }
 *
 *    Or `Linking.useLinkingURL()` peut rendre `null` au tout premier rendu :
 *    l'URL d'un lancement à froid arrive par un ÉVÉNEMENT, pas de façon
 *    synchrone. Le joueur lisait donc « Ce retour de connexion n'est plus
 *    valide » avant même que le système ait répondu — et la vraie URL arrivait
 *    juste après, dans un écran qui avait déjà conclu. On attend désormais
 *    `AUTH_CALLBACK_URL_WAIT_MS`, et l'absence de retour a sa propre phrase.
 *
 * 2. QUATRE FAITS, UNE SEULE PHRASE. Réseau coupé, lien expiré, lien tronqué et
 *    absence de retour disaient tous « Demande un nouveau lien ». Conseiller ça
 *    à quelqu'un dont le réseau est coupé lui fait brûler son quota d'envoi pour
 *    un lien qui, lui, est encore bon (le code à usage unique n'a pas été
 *    consommé). Le verdict est calculé par `authCallbackVerdict2026` — PUR, donc
 *    testé —, jamais improvisé dans ce JSX.
 *
 * Aucune de ces phrases n'est un message serveur brut (cahier G02).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/auth';
import { C as EmailC } from '../../src/i18n/catalog/authEmail';
import { useT } from '../../src/i18n/store';
import { useOnboardingState } from '../../src/features/onboarding/store';
import { rememberOnboardingCompletion2026 } from '../../src/features/onboarding/sessionCompletion2026';
import {
  AUTH_CALLBACK_URL_WAIT_MS,
  authCallbackVerdict2026,
  parseAuthCallback2026,
} from '../../src/features/account/authCallback2026';
import { linkVerdictFromParams } from '../../src/features/account/emailLink';
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
  /** L'échange a-t-il été TENTÉ, et qu'a répondu le serveur ? */
  const [exchange, setExchange] = useState<{ done: boolean; message?: string }>({ done: false });
  /** Le délai d'attente de l'URL est-il écoulé ? Un `null` avant lui n'est pas un verdict. */
  const [waited, setWaited] = useState(false);
  /** Compteur de reprises : un échec de TRANSPORT n'a pas consommé le code. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (url) { setWaited(false); return; }
    const timer = setTimeout(() => setWaited(true), AUTH_CALLBACK_URL_WAIT_MS);
    return () => clearTimeout(timer);
  }, [url]);

  useFocusEffect(useCallback(() => {
    const current = ++generation.current;
    // ⚠️ PAS DE `setFailed(true)` ICI. Sans URL, il n'y a rien à échanger et
    // rien à conclure : le délai ci-dessus tranchera, pas ce rendu-ci.
    if (!url || handledUrl.current === url) {
      return () => { generation.current += 1; };
    }
    void (async () => {
      try {
        if (generation.current !== current) return;
        // Refocusing the same one-use callback joins its exchange instead of
        // consuming the code a second time while the first request is pending.
        let exchangeRun = exchanges.current.get(url);
        if (!exchangeRun) { exchangeRun = completeAuthCallback(url); exchanges.current.set(url, exchangeRun); }
        const result = await exchangeRun;
        if (generation.current !== current) return;
        handledUrl.current = url;
        if (result.ok) router.replace('/');
        else setExchange({ done: true, message: result.ok ? undefined : result.message });
      } catch (error) {
        if (generation.current !== current) return;
        handledUrl.current = url;
        setExchange({ done: true, message: String(error) });
      }
    })();
    return () => {
      generation.current += 1;
    };
  }, [url, attempt]));

  if (session || !configured) return <Redirect href="/" />;

  const parsed = parseAuthCallback2026(url);
  const verdict = authCallbackVerdict2026({
    parsed,
    waited,
    exchanged: exchange.done,
    exchangeMessage: exchange.message,
    // `linkVerdictFromParams` (emailLink.ts) distingue « expiré » de
    // « incomplet ». Elle existait depuis juillet sans aucun appelant : c'est
    // ce module-ci qui aurait dû la lire, et qui la lit enfin.
    linkVerdict: parsed.kind === 'error'
      ? linkVerdictFromParams({ error_description: parsed.message })
      : null,
  });

  const retry = () => {
    if (url) exchanges.current.delete(url);
    handledUrl.current = null;
    setExchange({ done: false });
    setAttempt((n) => n + 1);
  };

  const asGuest = () => {
    rememberOnboardingCompletion2026(true);
    void update({ onboardingDone: true, reachedStep: 'map' });
    router.replace('/');
  };

  return <View style={styles.root}>
    <View style={[styles.frame, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <GrydMark variant="symbol" size={24} color={colors.chartreuse} />
      <TranslucentControl2026 tone="dark" style={styles.panel}>
        <View style={styles.content}>
          {verdict === null ? <>
            <ActivityIndicator color={colors.chartreuse} />
            {/* Deux attentes distinctes : le système ne nous a pas encore remis
                le lien, ou le serveur ne nous a pas encore répondu. */}
            <Text accessibilityRole="header" style={styles.title}>
              {t(url ? C.callbackChecking : EmailC.verifying)}
            </Text>
          </> : verdict === 'expired' ? <>
            <Text accessibilityRole="alert" style={styles.title}>{t(EmailC.expiredTitle)}</Text>
            <Text style={styles.body}>{t(EmailC.expiredBody)}</Text>
            <Button size="md" label={t(EmailC.expiredCta)} onPress={() => router.replace('/email')} />
            <Button label={t(C.guestCta)} onPress={asGuest} variant="ghost" size="md" />
          </> : verdict === 'invalid' ? <>
            <Text accessibilityRole="alert" style={styles.title}>{t(EmailC.errorLinkInvalid)}</Text>
            <Button size="md" label={t(EmailC.expiredCta)} onPress={() => router.replace('/email')} />
            <Button label={t(C.guestCta)} onPress={asGuest} variant="ghost" size="md" />
          </> : verdict === 'network' ? <>
            {/* Le code n'a PAS été consommé : on réessaie le même lien plutôt
                que d'en réclamer un nouveau. */}
            <Text accessibilityRole="alert" style={styles.title}>{t(C.callbackNetwork)}</Text>
            <Button size="md" label={t(C.callbackRetryCta)} onPress={retry} />
            <Button label={t(C.guestCta)} onPress={asGuest} variant="ghost" size="md" />
          </> : verdict === 'no_return' ? <>
            <Text accessibilityRole="alert" style={styles.title}>{t(C.callbackNoReturn)}</Text>
            <Button size="md" label={t(C.emailCta)} onPress={() => router.replace('/email')} />
            <Button label={t(C.guestCta)} onPress={asGuest} variant="ghost" size="md" />
          </> : <>
            <Text accessibilityRole="alert" style={styles.title}>{t(C.callbackFailed)}</Text>
            <Button size="md" label={t(C.emailCta)} onPress={() => router.replace('/email')} />
            <Button label={t(C.guestCta)} onPress={asGuest} variant="ghost" size="md" />
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
  body: { color: colors.gris, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
