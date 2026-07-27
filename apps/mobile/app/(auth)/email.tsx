/**
 * GRYD — E07 « Connexion par e-mail » (spec produit UI/UX complète, l.735).
 *
 * Layout imposé par la planche, dans cet ordre : retour · titre · champ e-mail ·
 * CTA `RECEVOIR LE LIEN` · clavier e-mail · AUCUNE demande de mot de passe en
 * première intention. Les cinq états nommés par la spec sont tous rendus (repères
 * ÉTAT 1…5 dans le JSX) : lien envoyé, e-mail invalide, compte existant avec
 * fournisseur externe, lien expiré, renvoi après délai.
 *
 * ═══ CET ÉCRAN N'EST PAS UN SECOND CHEMIN D'AUTHENTIFICATION ════════════════
 * Il EXTRAIT le filet e-mail qui vivait replié dans `app/(auth)/sign-in*.tsx`,
 * il ne le duplique pas. L'envoi passe par le MÊME `requestEmailOtp`
 * (`src/lib/auth.ts:253`, `auth.web.ts:134` — `supabase.auth.signInWithOtp`,
 * `shouldCreateUser: true`, `emailRedirectTo: 'gryd://'`), qui émet déjà
 * `signup_started`. Aucune ligne d'auth n'est réécrite ici : cet écran PEINT,
 * il ne parle pas à GoTrue autrement que par ce module.
 *
 * Les décisions (forme d'adresse, motif d'échec, décompte de renvoi, verdict du
 * lien ouvert) sont PURES et vivent dans `src/features/account/emailLink.ts`,
 * testées en Deno. Rien de ce qui se décide ici ne se décide dans du JSX.
 *
 * ═══ LE GATE 16+ RESTE DEVANT LA CRÉATION, ET IL EST POSÉ ICI AUSSI ═════════
 * `requestEmailOtp` envoie `shouldCreateUser: true` : CET écran crée des comptes.
 * Apple 5.1.1 / RGPD mineurs interdisent d'en créer un pour un mineur — le gate
 * doit donc précéder l'envoi, pas seulement l'écran d'où l'on vient.
 *
 * POURQUOI PAS UN SIMPLE « on arrive de /sign-in, donc c'est passé » : parce que
 * cet écran est atteignable directement (URL sur le bundle web, lien profond,
 * reprise de pile) et parce qu'un laissez-passer transmis en paramètre de route
 * serait falsifiable — un gate légal ne se délègue pas au client appelant.
 *
 * POURQUOI PAS UNE REDIRECTION VERS /sign-in QUAND L'ÂGE EST INCONNU : c'est
 * EXACTEMENT la faute déjà commise et corrigée le 21/07/2026 (voir l'entête de
 * sign-in.tsx). `useOnboardingState` est un état PAR MONTAGE : arriver ici relit
 * le stockage, et si celui-ci ne retient rien (navigation privée, localStorage
 * bloqué, données purgées) la relecture rendrait `false` à chaque fois →
 * /email → /sign-in → /email… en boucle. La question est donc reposée EN PLACE,
 * sans navigation : au pire un tap de plus, jamais une porte fermée. Et la
 * lecture EN COURS ne peint ni le champ (ce serait ouvrir la création sans gate)
 * ni la question (ce serait la poser à quelqu'un qui y a déjà répondu) — c'est
 * borné à 3 s par le store, jamais un écran mort.
 *
 * ═══ CE QUE CET ÉCRAN N'AFFIRME JAMAIS (constitution §1) ════════════════════
 * · Il ne dit pas si l'adresse EXISTE : la même adresse connecte ou crée
 *   (`shouldCreateUser: true`), et `whatHappens` le dit une fois, sans deviner.
 * · Il ne devine pas de fournisseur : `existing_provider` n'est rendu que si le
 *   SERVEUR l'a nommé (classifyEmailLinkFailure) — jamais depuis un domaine.
 * · Il n'annonce « lien envoyé » qu'après un `ok: true` du serveur ; pendant
 *   l'envoi il dit « Envoi… », ce qui n'affirme rien.
 * · Il n'affiche le raccourci « Continuer avec {provider} » que si ce
 *   fournisseur est RÉELLEMENT utilisable ici (§2 : aucun bouton mort) — sinon
 *   il garde l'explication, qui reste vraie, et retire le raccourci.
 *
 * ═══ SUSPENS ASSUMÉS, DATÉS DU 27/07/2026 ══════════════════════════════════
 * · ROUTE. Le fichier vit dans le groupe `(auth)`, dont expo-router retire le
 *   segment : l'URL réelle est **`/email`**, pas `/auth/email` comme l'écrit la
 *   spec. Aligner l'URL demanderait de renommer le dossier `(auth)` (donc de
 *   toucher `sign-in`, `_layout.tsx` et tous les `router.push('/sign-in')`) —
 *   hors périmètre de ce chantier. La route est nommée ici pour que personne ne
 *   la croie déjà conforme.
 * · ÉTAT 4 « lien expiré ». Il est rendu dès que l'écran reçoit
 *   `error_code=otp_expired` (paramètres de route). Mais `emailRedirectTo` vaut
 *   `'gryd://'` (racine) dans `src/lib/auth.ts:261`, et `app/_layout.tsx` ne
 *   route aujourd'hui que les liens d'invitation crew : RIEN ne conduit encore
 *   ce retour jusqu'ici. L'état est donc PRÊT et NON CÂBLÉ de bout en bout —
 *   les deux fichiers à changer sont hors périmètre.
 * · ÉTAT 3 « compte existant avec fournisseur externe ». Codé et testé comme un
 *   mapping, JAMAIS observé : `signInWithOtp` envoie le lien sans jamais dire
 *   qu'une identité Apple/Google porte déjà l'adresse (cf. emailLink.ts).
 * · L'écran est LIEN, pas code, parce que `EMAIL_DELIVERY === 'link'`
 *   (`src/lib/auth.ts:251` — l'expéditeur par défaut du plan gratuit refuse un
 *   gabarit portant `{{ .Token }}`). C'est pour ça que /sign-in n'y route que
 *   dans ce mode et garde son étape « code » pour l'autre.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fonts, iconSizes, radii, sizes, spacing, typography } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/authEmail';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { SectionLabel } from '../../src/ui/SectionLabel';
import { AGE } from '../../src/features/onboarding/content';
import { SignInPhotoBackdrop } from '../../src/features/onboarding/SignInPhotoBackdrop';
import {
  STORAGE_UNAVAILABLE_NOTICE,
  useOnboardingState,
} from '../../src/features/onboarding/store';
import {
  canResend,
  classifyEmailLinkFailure,
  isEmailShapeValid,
  linkVerdictFromParams,
  normalizeEmail,
  resendSecondsLeft,
  type EmailLinkVerdict,
  type ExternalProvider,
} from '../../src/features/account/emailLink';
import { EVENTS, track } from '../../src/lib/analytics';
import {
  GOOGLE_CAPABLE,
  isAppleAuthAvailable,
  requestEmailOtp,
} from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';

/** Motif d'échec → la phrase montrée. Les deux viennent du même verdict pur. */
const FAILURE_COPY: Readonly<Record<'invalid_email' | 'rate_limited' | 'network' | 'unknown', Entry>> =
  {
    invalid_email: C.errorInvalidEmail,
    rate_limited: C.errorRateLimited,
    network: C.errorNetwork,
    unknown: C.errorUnknown,
  };

/** Cadence du décompte de renvoi : une seconde. Ce n'est pas une règle de jeu. */
const COUNTDOWN_TICK_MS = 1000;

/** Ce qui a été envoyé, et quand — la base du décompte (ÉTAT 1 + ÉTAT 5). */
interface SentLink {
  readonly email: string;
  readonly at: number;
  /** Le dernier envoi était-il un RENVOI ? (confirmation discrète, ÉTAT 5) */
  readonly resent: boolean;
}

export default function AuthEmailScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { session, loading, configured } = useSession();
  const params = useLocalSearchParams<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Entry | null>(null);
  const [existingProvider, setExistingProvider] = useState<ExternalProvider | null>(null);
  const [sent, setSent] = useState<SentLink | null>(null);
  const [now, setNow] = useState(() => Date.now());
  /** Capacité RÉELLE des fournisseurs ICI — jamais déduite de l'apparence (§2). */
  const [appleCapable, setAppleCapable] = useState(false);

  // ÉTAT 4 — verdict du lien OUVERT, lu UNE fois : les paramètres de route ne
  // changent pas sous nos pieds, et re-tracker à chaque rendu gonflerait le KPI.
  const [verdict] = useState<EmailLinkVerdict | null>(() => linkVerdictFromParams(params));
  const verdictTracked = useRef(false);

  const {
    state: onboarding,
    status: storageStatus,
    persistenceFailed,
    update: updateOnboarding,
  } = useOnboardingState();
  // « Moins de 16 » : LOCAL et terminal pour cette vue. Rien n'est persisté (on
  // n'enregistre pas qu'un visiteur s'est dit mineur) et le retour reste ouvert.
  const [ageDeclined, setAgeDeclined] = useState(false);

  useEffect(() => {
    if (verdict === null || verdictTracked.current) return;
    verdictTracked.current = true;
    track(EVENTS.authEmailLinkOpened, { result: verdict });
  }, [verdict]);

  useEffect(() => {
    let alive = true;
    void isAppleAuthAvailable().then((ok) => {
      if (alive) setAppleCapable(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ÉTAT 5 — le décompte ne tourne QUE tant qu'il sert : il s'arrête dès que le
  // renvoi est armé (un intervalle qui survit à son utilité réveille l'écran
  // pour rien). Aucune animation n'est en jeu — Reduce Motion n'a rien à couper.
  //
  // ⚠️ LA CONDITION D'ARRÊT LIT `now`, PAS `Date.now()`. Écrite avec l'horloge
  // fraîche, elle pouvait couper l'intervalle quelques millisecondes AVANT que
  // le rendu (qui, lui, lit `now`) tombe à zéro : le décompte se figeait alors
  // sur « Renvoyer dans 1 s » et le bouton ne s'armait JAMAIS. Le rendu et
  // l'arrêt doivent lire la même horloge, sinon ils ne parlent pas du même
  // instant.
  useEffect(() => {
    if (sent === null) return;
    if (resendSecondsLeft(sent.at, now) === 0) return;
    const id = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [sent, now]);

  const send = useCallback(
    async (address: string, resend: boolean) => {
      setBusy(true);
      setFailure(null);
      setExistingProvider(null);
      const result = await requestEmailOtp(address);
      if (result.ok) {
        track(EVENTS.authEmailLinkSent, { resend });
        setSent({ email: address, at: Date.now(), resent: resend });
        setNow(Date.now());
        setBusy(false);
        return;
      }
      const why = classifyEmailLinkFailure(result.message);
      track(EVENTS.authEmailLinkFailed, { reason: why.reason });
      if (why.reason === 'existing_provider') {
        // Le module pur ne rend `existing_provider` QUE si le serveur a nommé le
        // fournisseur (sinon il rend `unknown`) : ce `provider` est toujours là.
        if (why.provider) setExistingProvider(why.provider);
      } else {
        setFailure(FAILURE_COPY[why.reason]);
      }
      setBusy(false);
    },
    [],
  );

  // ⚠️ Règle des hooks : tous déclarés AVANT ces returns.
  // Restauration de session EN COURS → fond noir muet. Un chargement n'affirme
  // rien : ni « connecte-toi », ni « tu es connecté » (parité sign-in).
  if (loading) return <View style={styles.root} />;
  // Déjà connecté → la carte. Sans backend (O1), l'envoi échouerait TOUJOURS :
  // peindre le CTA ici serait le bouton mort de la constitution §2.
  if (session || !configured) return <Redirect href="/" />;

  const ageDeclared = onboarding.ageConfirmed;
  const ageUnknown = storageStatus === 'reading' && !ageDeclared;
  const askAge = !ageDeclared && !ageUnknown;

  const address = normalizeEmail(email);
  const shapeOk = isEmailShapeValid(email);
  const secondsLeft = sent ? resendSecondsLeft(sent.at, now) : 0;
  const resendArmed = sent !== null && canResend(sent.at, now);
  const providerCapableHere =
    existingProvider === 'Apple' ? appleCapable : existingProvider === 'Google' ? GOOGLE_CAPABLE : false;

  /** ÉTAT 4 : tant que le lien ouvert a rendu « expiré », le CTA le dit. */
  const ctaLabel = verdict === 'expired' ? t(C.expiredCta) : t(C.cta);

  return (
    <SignInPhotoBackdrop>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── HAUT : retour + titre (spec E07, dans l'ordre) ─────────────── */}
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.backA11y)}
              onPress={() => router.replace('/sign-in')}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              {/* Chevron pointé à gauche (le tracé pointe à droite → miroir). */}
              <View style={styles.backMirror}>
                <Icon name="chevron" size={iconSizes.lg} color={colors.gris} />
              </View>
            </Pressable>
            {/* HERO COURT, ET C'EST UNE CONTRAINTE, PAS UN GOÛT : le fond photo
                n'est voilé qu'en haut (`SCRIM_TOP_H = 22 %` dans
                SignInPhotoBackdrop) — en dessous, les visages du crew forment
                une bande CLAIRE. Un hero de trois blocs y débordait, et le
                sous-titre gris tombait sur cette bande (contraste interdit par
                la charte). Le kicker et le titre tiennent dans le voile ; TOUT
                le reste vit en bas, sur l'aplat carbone plein. */}
            <View style={styles.hero}>
              <SectionLabel style={styles.kicker}>{t(C.kicker)}</SectionLabel>
              <Text style={styles.title} accessibilityRole="header">
                {sent ? t(C.sentTitle) : t(C.title)}
              </Text>
            </View>
          </View>

          {/* ── BAS : UNE branche à la fois ────────────────────────────────── */}
          <View style={styles.actions}>
            {ageDeclined ? (
              /* Moins de 16 : terminal ICI (rien à créer), mais le retour reste
                 ouvert. Aucun champ, aucun CTA — on ne peint pas une porte. */
              <>
                <Text style={styles.gateTitle}>{t(AGE.blockedTitle)}</Text>
                <Text style={styles.note}>{t(AGE.blockedTagline)}</Text>
              </>
            ) : ageUnknown ? (
              /* Lecture EN COURS du gate : on n'affirme rien et on ne peint
                 rien. Le titre porte l'écran ; borné à 3 s par le store. */
              null
            ) : askAge ? (
              <>
                <Text style={styles.gateTitle}>{t(AGE.title)}</Text>
                <Text style={styles.note}>{t(AGE.tagline)}</Text>
                {/* L'UNIQUE CTA chartreuse tant que la question est posée (§A4) :
                    le champ e-mail n'existe pas encore, donc aucun conflit. */}
                <Button
                  label={t(AGE.confirm)}
                  accessibilityLabel={t(AGE.confirmA11y)}
                  onPress={() => void updateOnboarding({ ageConfirmed: true })}
                  variant="primary"
                  size="lg"
                  analyticsId="e07_age_confirm"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(AGE.under)}
                  onPress={() => setAgeDeclined(true)}
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <Text style={styles.linkLabel}>{t(AGE.under)}</Text>
                </Pressable>
              </>
            ) : sent ? (
              /* ═══ ÉTAT 1 · LIEN ENVOYÉ (+ ÉTAT 5 · RENVOI APRÈS DÉLAI) ═════
                 Le serveur a dit oui. On dit ce que le lien fait et ce qu'il ne
                 fait pas — appareil, durée de vie, usage unique — puis on arme
                 le renvoi À LA CADENCE DU SERVEUR. */
              <>
                <Text style={styles.subtitle}>{t(C.sentBody, { email: sent.email })}</Text>
                <Text style={styles.note}>{t(C.sentHint)}</Text>
                <Text style={styles.note}>{t(C.sentSpamHint)}</Text>
                {sent.resent ? <Text style={styles.note}>{t(C.resendDone)}</Text> : null}
                {/* ÉTAT 5 — le bouton n'est pas « grisé sans raison » : tant que
                    le serveur refuserait, l'attente est DITE en secondes. Un
                    bouton daté n'est pas un bouton mort (constitution §2). */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    resendArmed ? t(C.resendCta) : t(C.resendCountdown, { s: secondsLeft })
                  }
                  accessibilityState={{ disabled: !resendArmed || busy }}
                  disabled={!resendArmed || busy}
                  onPress={() => void send(sent.email, true)}
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <Text style={resendArmed ? styles.linkLabel : styles.noteCentered}>
                    {busy
                      ? t(C.ctaBusy)
                      : resendArmed
                        ? t(C.resendCta)
                        : t(C.resendCountdown, { s: secondsLeft })}
                  </Text>
                </Pressable>
                {/* Sortie de l'état « envoyé » : l'adresse était fausse. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.sentChangeEmail)}
                  onPress={() => {
                    setSent(null);
                    setFailure(null);
                  }}
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <Text style={styles.linkLabel}>{t(C.sentChangeEmail)}</Text>
                </Pressable>
              </>
            ) : (
              /* ═══ LE FORMULAIRE — et ce qui l'entoure ═══════════════════════ */
              <>
                {/* ÉTAT 4 · LIEN EXPIRÉ — constaté à l'OUVERTURE, souvent dans
                    une autre session : on le dit à froid, sans supposer qu'on
                    connaît encore l'adresse, et on rouvre le champ. */}
                {verdict === 'expired' ? (
                  <View style={styles.notice}>
                    <Text style={styles.gateTitle}>{t(C.expiredTitle)}</Text>
                    <Text style={styles.note}>{t(C.expiredBody)}</Text>
                  </View>
                ) : null}
                {verdict === 'invalid' ? (
                  <Text style={styles.noteCentered} accessibilityRole="alert">
                    {t(C.errorLinkInvalid)}
                  </Text>
                ) : null}

                {/* LA PROMESSE, puis LE FAIT — les deux avant la saisie.
                    « aucune demande de mot de passe en première intention » est
                    une règle de la spec ; ici c'est une phrase LISIBLE, sinon le
                    joueur attend un champ mot de passe qui ne viendra pas et
                    croit l'écran cassé. `whatHappens` dit ensuite ce que le lien
                    fait vraiment — connecter OU créer — sans jamais affirmer
                    que le compte existe (l'écran ne le sait pas). */}
                <Text style={styles.subtitle}>{t(C.subtitle)}</Text>
                <Text style={styles.noteCentered}>{t(C.whatHappens)}</Text>

                {/* Champ 56 pt à LABEL PERSISTANT (planche E21) : un placeholder
                    seul disparaît à la première frappe et le champ ne dit plus
                    ce qu'il attend. Un seul texte = label affiché + nom a11y.
                    AUCUN champ mot de passe — la spec l'exclut en première
                    intention, et le flux n'en a aucun usage. */}
                <Text style={styles.fieldLabel}>{t(C.emailLabel)}</Text>
                <TextInput
                  accessibilityLabel={t(C.emailLabel)}
                  style={styles.input}
                  value={email}
                  onChangeText={(next) => {
                    setEmail(next);
                    // Une frappe efface le reproche : le message d'erreur ne
                    // survit pas à la correction qu'il a provoquée.
                    if (failure) setFailure(null);
                  }}
                  placeholder={t(C.emailPlaceholder)}
                  placeholderTextColor={colors.gris}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address" // clavier e-mail (spec E07)
                  inputMode="email"
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (!shapeOk) {
                      // ÉTAT 2 · E-MAIL INVALIDE — refus de FORME, constaté sans
                      // appel réseau. Il ne dit PAS que l'adresse n'existe pas.
                      setFailure(C.errorInvalidEmail);
                      track(EVENTS.authEmailLinkFailed, { reason: 'invalid_email' });
                      return;
                    }
                    void send(address, false);
                  }}
                  autoFocus
                />

                {/* L'UNIQUE CTA chartreuse de l'écran (§A4). Il n'est pas grisé
                    sur une adresse incomplète : il est ACTIF et REFUSE en
                    disant pourquoi — un bouton qui ne réagit pas fait conclure
                    que l'app est cassée. */}
                <Button
                  label={busy ? t(C.ctaBusy) : ctaLabel}
                  onPress={() => {
                    if (!shapeOk) {
                      setFailure(C.errorInvalidEmail);
                      track(EVENTS.authEmailLinkFailed, { reason: 'invalid_email' });
                      return;
                    }
                    void send(address, false);
                  }}
                  variant="primary"
                  size="lg"
                  loading={busy}
                  analyticsId="e07_request_link"
                />

              </>
            )}

            {/* ═══ CE QUI VAUT POUR TOUTES LES BRANCHES ═══════════════════════
                Les deux surfaces d'échec vivent ICI, pas dans le formulaire :
                un envoi peut échouer depuis le formulaire ET depuis l'état
                « lien envoyé » (le RENVOI passe par le même chemin, et c'est lui
                qui se fait refuser par la cadence serveur). Rendues dans la
                branche « formulaire », elles auraient été invisibles pour un
                renvoi rate-limité — le joueur aurait tapé « Renvoyer » et
                n'aurait RIEN vu se passer. */}

            {/* ÉTAT 3 · COMPTE EXISTANT AVEC FOURNISSEUR EXTERNE — rendu
                UNIQUEMENT si le serveur a nommé le fournisseur. Le raccourci
                n'apparaît que si ce fournisseur marche RÉELLEMENT ici (§2) ;
                l'explication, elle, reste vraie dans tous les cas. */}
            {existingProvider ? (
              <View style={styles.notice}>
                <Text style={styles.note} accessibilityRole="alert">
                  {t(C.errorExistingProvider, { provider: existingProvider })}
                </Text>
                {providerCapableHere ? (
                  <Button
                    label={t(C.existingProviderCta, { provider: existingProvider })}
                    onPress={() => router.replace('/sign-in')}
                    variant="ghost"
                    size="md"
                    analyticsId="e07_existing_provider"
                  />
                ) : null}
              </View>
            ) : null}

            {/* ÉTAT 2 + échecs de transport. `alert` : un message qui apparaît
                en silence n'existe pas pour un lecteur d'écran. */}
            {failure ? (
              <Text style={styles.error} accessibilityRole="alert">
                {t(failure)}
              </Text>
            ) : null}

            {/* L'ÉTAT QU'ON NE PEUT PAS RETENIR SE DIT. Sans cette ligne, le
                joueur redonnerait sa réponse d'âge à chaque lancement sans
                jamais comprendre pourquoi. */}
            {persistenceFailed ? <Text style={styles.note}>{t(STORAGE_UNAVAILABLE_NOTICE)}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SignInPhotoBackdrop>
  );
}

/** Interligne du titre : serré, comme le hero de /sign-in (mesure de composition). */
const TITLE_LINE_RATIO = 1.05;
/** Largeur de lecture confortable du sous-titre — ~60 caractères. */
const SUBTITLE_MAX_WIDTH = 320;

const styles = StyleSheet.create({
  // Fallback de restauration de session : fond noir muet, jamais d'écran blanc.
  root: { flex: 1, backgroundColor: colors.noir, paddingHorizontal: spacing.xl },
  kav: { flex: 1, paddingHorizontal: spacing.xl },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  // Retour : cible 44×44 RÉELLE (pas un hitSlop qui simule la taille), gris
  // discret, jamais un 2e CTA. marginLeft négatif = recalage optique du glyphe.
  back: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backMirror: { transform: [{ scaleX: -1 }] },
  pressed: { opacity: 0.7 },
  hero: { marginTop: spacing.lg },
  kicker: { marginBottom: spacing.md },
  // Titre au palier `xl` et non `hero`/`xxl` : il doit tenir DANS le voile haut
  // (22 % de la hauteur) même en allemand et en espagnol, où il passe à deux
  // lignes. Un titre plus gros mordrait sur la bande claire de la photo.
  title: {
    color: colors.blanc,
    fontFamily: fonts.display, // Inter Tight 800 — la famille porte la graisse
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * TITLE_LINE_RATIO,
    letterSpacing: -0.8,
  },
  // Vit EN BAS, sur l'aplat carbone (jamais sur la photo) : centré comme le
  // reste du bloc d'actions, largeur de lecture bornée.
  subtitle: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: SUBTITLE_MAX_WIDTH,
  },
  actions: { gap: spacing.sm },
  // Bloc d'annonce (lien expiré, fournisseur externe) : jamais une card DANS une
  // card (§A) — c'est un simple groupe de texte espacé, sans fond ni bordure.
  notice: { gap: spacing.xs },
  gateTitle: { ...typography.cardTitle, color: colors.blanc }, // R3 — Inter Tight 600
  note: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
  },
  noteCentered: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    textAlign: 'center',
  },
  // Champ 56 pt à label persistant (planche E21) — même patron que /profil-edit.
  fieldLabel: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
  },
  input: {
    height: sizes.buttonLg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    color: colors.blanc,
    fontFamily: fonts.text,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.md,
  },
  // Liens secondaires (renvoyer, changer d'adresse, « moins de 16 ») : plancher
  // tactile RÉEL de 44 px, gris, jamais un 2e CTA chartreuse.
  link: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  linkLabel: {
    color: colors.blanc,
    fontFamily: fonts.textMedium,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  error: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
});
