/**
 * ─── E5 (12/09/2026) : CET ÉCRAN N'ATTEND PLUS DANS LE VIDE ─────────────────
 * Décision du fondateur : « vas juste vers une page qui dit que ça a été bien
 * validé mais derrière il faut que le compte fonctionne dans l'application ».
 *
 * Avant ce lot, « Lien envoyé » était un cul-de-sac dès que le lien s'ouvrait
 * AILLEURS — sur un ordinateur, dans un webmail, ou dans Safari faute du lien
 * universel (la capacité Apple « Associated Domains » manque au profil de
 * signature : build `fe030292` ERRORED). La page félicitait, le téléphone
 * restait sur le même écran, et rien ne rattrapait personne.
 *
 * Maintenant, tant que cet écran est affiché, il RÉCLAME la remise déposée par
 * la page web (`auth_handoff_claim_2026`, migration 0198) toutes les
 * `AUTH_HANDOFF_2026.pollEveryMs`, pendant `pollForMs` au plus. Quand elle
 * arrive, la session s'ouvre ici même et l'écran devient l'ACCUEIL — le même
 * composant que le lien universel et qu'Apple (`AccountWelcome2026`), avec le
 * même verdict, calculé par le même chemin.
 */
import { useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AUTH_HANDOFF_2026, colors, fonts, spacing } from '@klaim/shared';
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
import { AccountWelcome2026 } from '../../src/features/account/AccountWelcome2026';
import { handoffStillWaiting2026, handoffWelcomeUrl2026 } from '../../src/features/account/authHandoff2026';
import {
  claimHandoffSession2026,
  forgetHandoff2026,
  readHandoff2026,
  type PendingHandoff2026,
} from '../../src/features/account/authHandoffSession2026';
import { useWelcomeRead2026 } from '../../src/features/account/useWelcomeRead2026';
import type { CallbackType2026 } from '../../src/features/account/welcome2026';
import { AUTH_CALLBACK_DEEP_LINK } from '../../src/lib/links';
import { EMAIL_DELIVERY, requestEmailOtp, verifyEmailOtp } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { GrydMark } from '../../src/ui/gryd/GrydMark';
import { GrydIcon } from '../../src/ui/gryd/GrydIcon';
import { TranslucentControl2026 } from '../../src/ui/gryd/Surface2026';

type Step = 'email' | 'age' | 'sent' | 'code';

/**
 * CE QUE L'ÉCRAN SAIT DE LA REMISE, ET RIEN DE PLUS.
 *  · `idle`    — aucune remise en attente (aucun nonce tiré : le tirage a
 *                échoué, ou le lien a été demandé par un build antérieur) ;
 *  · `waiting` — on interroge, personne n'a encore ouvert le lien ;
 *  · `stopped` — le plafond de patience est atteint. On ARRÊTE, et on le dit ;
 *  · `failed`  — le jeton est arrivé et n'a PAS ouvert de session. La remise a
 *                été consommée (usage unique) : réessayer ne rendra plus rien.
 */
type HandoffState = 'idle' | 'waiting' | 'stopped' | 'failed';

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
  /** La remise réclamée, quand elle a abouti. `null` = elle n'a pas encore eu lieu. */
  const [claimed, setClaimed] = useState<{ type: CallbackType2026 | null } | null>(null);
  const [handoff, setHandoff] = useState<HandoffState>('idle');
  /**
   * ⚠️ LA COURSE QUE CE DRAPEAU FERME, ET ELLE ENVOYAIT LE JOUEUR SUR LA CARTE.
   * `refreshSession` fait naître la session AVANT de rendre la main (il émet
   * `TOKEN_REFRESHED`, traité par `lib/session.tsx` pendant l'`await`). Entre
   * cet instant et le `setClaimed` qui suit, un rendu voyait une session
   * ouverte et `claimed` encore nul — donc `<Redirect href="/" />`, c'est-à-dire
   * la carte, sans un mot : le défaut exact du 12/09. Ce drapeau est posé de
   * façon SYNCHRONE dès que le jeton est en main (`onSessionIncoming`), donc
   * tout rendu qui voit la session voit aussi ce drapeau.
   * Une `ref` et non un `state` : un `state` serait, lui aussi, asynchrone.
   */
  const claiming = useRef(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (step !== 'sent' && step !== 'code') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  /**
   * ─── LA BOUCLE DE RÉCLAMATION ─────────────────────────────────────────────
   * Elle ne tourne QUE pendant l'attente du lien (`step === 'sent'`) et tant
   * qu'aucune session n'existe. Elle s'arrête proprement à la sortie de
   * l'écran : `alive` coupe les réponses en vol, le minuteur est annulé, et
   * l'écouteur d'état d'app est retiré.
   *
   * `setTimeout` EN CHAÎNE, PAS `setInterval` : chaque tour n'est armé qu'une
   * fois le précédent revenu. Sur un réseau lent, un `setInterval` empilerait
   * des requêtes concurrentes sur le même nonce — dont une seule peut gagner,
   * les autres n'étant que du bruit.
   *
   * `AppState` : au réveil, l'OS a suspendu le JavaScript et le minuteur a raté
   * ses échéances. On ne les rattrape pas, on repart immédiatement — c'est le
   * moment exact où le joueur revient de sa boîte mail, donc le moment où la
   * remise a le plus de chances d'être là.
   *
   * `sentAt` EST DANS LES DÉPENDANCES, et c'est ce qui fait marcher
   * « Renvoyer » : un renvoi tire un NOUVEAU nonce (`requestEmailOtp`), donc la
   * boucle doit relire le stockage. Sans cette dépendance, elle continuerait de
   * réclamer l'ancien, que plus personne n'alimentera.
   */
  useEffect(() => {
    if (step !== 'sent' || session !== null || claimed !== null) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: PendingHandoff2026 | null = null;

    const stop = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };

    const tick = async () => {
      if (!alive) return;
      if (pending === null) {
        pending = await readHandoff2026();
        if (!alive) return;
        // Aucun nonce : rien à réclamer. L'écran reste honnête (il n'annonce
        // aucune attente) et le parcours E4 continue de fonctionner.
        if (pending === null) { setHandoff('idle'); return; }
      }
      if (!handoffStillWaiting2026(pending.startedAt, Date.now())) {
        setHandoff('stopped');
        return;
      }
      setHandoff('waiting');
      const outcome = await claimHandoffSession2026(pending.nonce, () => { claiming.current = true; });
      if (!alive) return;
      if (outcome.state === 'claimed') { setClaimed({ type: outcome.type }); return; }
      if (outcome.state === 'failed') { setHandoff('failed'); return; }
      timer = setTimeout(() => { void tick(); }, AUTH_HANDOFF_2026.pollEveryMs);
    };

    void tick();
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || !alive) return;
      stop();
      void tick();
    });

    return () => { alive = false; stop(); appState.remove(); };
  }, [step, session, claimed, sentAt]);

  /**
   * L'état du pseudo, lu pour affiner l'accueil — jamais pour le bloquer. Il
   * n'est demandé qu'une fois la remise aboutie : avant, il n'y a pas de
   * session à interroger. Voir `useWelcomeRead2026` pour son plafond.
   */
  const welcomeRead = useWelcomeRead2026(session !== null && claiming.current);

  if (loading) return <View style={styles.root} />;
  /**
   * ─── LA REMISE A ABOUTI : CET ÉCRAN DEVIENT L'ACCUEIL ─────────────────────
   * Et c'est le MÊME composant que le lien e-mail (`app/(auth)/callback.tsx`)
   * et qu'Apple (`app/(auth)/bienvenue.tsx`). Rediriger vers la carte ferait
   * exactement ce que le fondateur a reproché le 12/09 : passer de sa boîte
   * mail à une carte, sans un mot.
   *
   * `callbackUrl` porte le `type` que le SERVEUR a écrit dans le lien, remonté
   * par la remise — pas une supposition d'écran. Sans type, `null` : l'accueil
   * retombe alors sur ses autres sources plutôt que de féliciter au hasard.
   */
  if (session && claiming.current) {
    return <AccountWelcome2026
      insets={insets}
      callbackUrl={handoffWelcomeUrl2026(AUTH_CALLBACK_DEEP_LINK, claimed?.type ?? null)}
      accountCreatedAt={typeof session.user.created_at === 'string' ? session.user.created_at : null}
      read={welcomeRead}
    />;
  }
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
              {/* ─── E5 : L'ÉTAT DE L'ATTENTE, ET SEULEMENT CE QUI EST VRAI ──
                  `idle` ne peint RIEN : sans nonce, l'écran n'attend rien et
                  promettre une connexion automatique serait un mensonge. Les
                  trois autres états ont chacun leur phrase — aucun ne se
                  déguise en un autre (L8/L14). */}
              {handoff === 'waiting' ? <View accessibilityLiveRegion="polite" aria-live="polite" style={styles.waiting}>
                <ActivityIndicator color={colors.chartreuse} size="small" />
                <Text style={styles.note}>{t(C.sentWaiting)}</Text>
              </View> : null}
              {handoff === 'stopped' ? <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.note}>{t(C.sentWaitingStopped)}</Text> : null}
              {/* Le jeton est arrivé et n'a pas ouvert de session : la remise a
                  été consommée, réessayer ne rendra plus rien. On renvoie donc
                  vers un NOUVEAU lien, pas vers une reprise. */}
              {handoff === 'failed' ? <Text accessibilityRole="alert" style={styles.error}>{t(AuthC.errorSignInFailed)}</Text> : null}
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
              {/* Changer d'adresse ABANDONNE la remise en cours : le lien parti
                  vers l'ancienne adresse ne doit plus pouvoir connecter cet
                  appareil à l'insu de celui qui vient de se corriger. */}
              <Button label={t(C.sentChangeEmail)} onPress={() => { void forgetHandoff2026(); claiming.current = false; setHandoff('idle'); setStep('email'); }} variant="ghost" size="md" disabled={busy} />
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
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  error: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19 },
  guestBlock: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.grisLigne, gap: 8 },
});
