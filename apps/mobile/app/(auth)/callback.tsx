/**
 * GRYD — G02, état « retour du lien ». Ce que l'écran a le droit de dire.
 *
 * ─── LE DÉFAUT DU FONDATEUR (12/09/2026) ────────────────────────────────────
 * « le bouton mène vers rien du tout ; il faudrait qu'appuyer sur le lien dise
 * félicitations, vous êtes inscrit ». Deux pannes en une phrase, et les deux
 * sont réparées ailleurs qu'ici pour moitié :
 *
 *   · LE LIEN N'ARRIVAIT PAS. `emailRedirectTo` valait `gryd://callback`, un
 *     schéma privé qu'aucun client mail ne rend cliquable. Il vaut désormais
 *     `AUTH_CALLBACK_URL` (`src/lib/links.ts`), une URL https réelle, et
 *     `app.json` déclare `applinks:gryd.run` pour qu'iOS ouvre l'app plutôt que
 *     Safari. CET ÉCRAN reçoit donc les DEUX formes, et n'a rien à en savoir :
 *     `Linking.useLinkingURL()` rend l'URL BRUTE, fragment compris, qu'elle
 *     commence par `https://` ou par `gryd://`.
 *
 *   · L'ARRIVÉE NE DISAIT RIEN. Cet écran faisait `router.replace('/')` à la
 *     seconde où la session prenait : le joueur passait de sa boîte mail à une
 *     carte, sans un mot. Le geste le plus engageant du produit n'avait aucun
 *     accusé de réception. Il en a un, et il est JUSTE : on ne félicite pas
 *     quelqu'un qui se reconnecte (le même lien crée OU connecte). Le verdict
 *     est calculé par `features/account/welcome2026.ts` — PUR, donc testé —,
 *     jamais improvisé dans ce JSX.
 *
 * ─── DEUX DÉFAUTS CORRIGÉS LE 10/09/2026, CONSERVÉS ─────────────────────────
 *
 * 1. IL DÉCLARAIT L'ÉCHEC AVANT D'AVOIR ATTENDU. `Linking.useLinkingURL()` peut
 *    rendre `null` au tout premier rendu : l'URL d'un lancement à froid arrive
 *    par un ÉVÉNEMENT. On attend `AUTH_CALLBACK_URL_WAIT_MS`, et l'absence de
 *    retour a sa propre phrase.
 *
 * 2. QUATRE FAITS, UNE SEULE PHRASE. Réseau coupé, lien expiré, lien tronqué et
 *    absence de retour disaient tous « Demande un nouveau lien ». Conseiller ça
 *    à quelqu'un dont le réseau est coupé lui fait brûler son quota d'envoi
 *    pour un lien qui, lui, est encore bon.
 *
 * ─── L'ACCUEIL LUI-MÊME N'EST PLUS ICI ──────────────────────────────────────
 * Il vit dans `features/account/AccountWelcome2026.tsx`, parce qu'il y a DEUX
 * arrivées à accueillir : le lien e-mail (cet écran) et Apple
 * (`app/(auth)/bienvenue.tsx`). Deux copies du même panneau auraient divergé au
 * premier retouchage, et la moitié des nouveaux joueurs aurait lu une phrase
 * différente de l'autre moitié. C'est lui, aussi, qui inscrit ce qu'une session
 * neuve prouve sur l'appareil (découverte vue, âge déclaré).
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
import { AccountWelcome2026 } from '../../src/features/account/AccountWelcome2026';
import { useWelcomeRead2026 } from '../../src/features/account/useWelcomeRead2026';
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
  // ⚠️ IL REND L'URL BRUTE : `https://gryd.run/callback#access_token=…` comme
  // `gryd://callback#…`. Le fragment n'est JAMAIS perdu — c'est pour ça que cet
  // écran ne lit pas les paramètres de route d'expo-router, qui n'en portent
  // qu'une version déjà découpée.
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

  /**
   * L'état de pseudo du compte (`my_handle_status_2026`, migration 0175). Il
   * affine l'accueil et n'en bloque jamais l'affichage — voir
   * `useWelcomeRead2026` pour son plafond de patience.
   */
  const welcomeRead = useWelcomeRead2026(session !== null);

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
        setExchange({ done: true, message: result.ok ? undefined : result.message });
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

  if (!configured) return <Redirect href="/" />;

  const parsed = parseAuthCallback2026(url);

  /**
   * SESSION OUVERTE = ACCUEIL. Deux exceptions, et elles disent la même chose :
   * cet écran n'est une destination que lorsqu'un lien vient d'y mener. Ouvert
   * sans retour (restauration de pile, URL tapée) alors qu'une session existe
   * déjà, il n'a rien à célébrer et rend la main à la carte.
   */
  if (session !== null) {
    if (parsed.kind === 'none' && !exchange.done) return <Redirect href="/" />;
    return <AccountWelcome2026
      insets={insets}
      callbackUrl={url}
      accountCreatedAt={typeof session.user.created_at === 'string' ? session.user.created_at : null}
      read={welcomeRead}
    />;
  }

  const verdict = authCallbackVerdict2026({
    parsed,
    waited,
    exchanged: exchange.done,
    exchangeMessage: exchange.message,
    // `linkVerdictFromParams` (emailLink.ts) distingue « expiré » de
    // « incomplet ».
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
  hero: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  panel: { borderRadius: 24, overflow: 'hidden' },
  content: { position: 'relative', zIndex: 1, padding: 18, gap: 12, alignItems: 'stretch' },
  title: { color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, textAlign: 'center' },
  body: { color: colors.gris, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
