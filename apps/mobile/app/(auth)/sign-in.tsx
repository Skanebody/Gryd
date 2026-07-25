/**
 * GRYD — écran de CONNEXION, variante NATIVE (SPEC §4.1 étape 3). 2 taps, zéro
 * formulaire inutile. Un refus/échec n'est jamais un mur (§4.1) : message + retry.
 *
 * ═══ ORDRE DE COMPOSITION ═══════════════════════════════════════════════════
 *  1. le champ d'hexagones, en plan de fond (`features/onboarding/PromiseHexField`) ;
 *  2. la flèche de retour vers l'onboarding ;
 *  3. le hero : kicker gris → titre display → sous-titre ;
 *  4. le bloc d'actions, en pied — UNE branche à la fois :
 *       âge refusé · lecture du gate en cours · question d'âge · voies d'entrée ;
 *  5. l'erreur, puis l'avis de non-persistance (gris, toutes branches confondues).
 *
 * ─── CE N'EST PLUS L'ÉCRAN PROMESSE (21/07/2026) ────────────────────────────
 * Il ouvrait le produit, d'où sa copy d'accroche (« SAISON 0 · PARIS & LILLE »,
 * « Cours pour ton crew. Conquiers ta ville. »). La promesse vit désormais dans
 * l'onboarding (E01), et cet écran est la DESTINATION de celui qui revient :
 * la porte « J'ai déjà un compte » du premier écran y mène, et (tabs)/_layout y
 * renvoie tout visiteur sans session. On ne revend pas le jeu à quelqu'un qui
 * l'a déjà installé — la copy (catalog/auth) dit ce qu'on attend de lui.
 *
 * ─── ET CE N'EST PLUS UN CUL-DE-SAC ─────────────────────────────────────────
 * La porte « J'ai déjà un compte » marque l'onboarding FAIT avant de router ici
 * (obligatoire : sinon (tabs)/_layout renvoie le joueur fraîchement connecté
 * vers /onboarding — rebond déjà payé une fois). Sans retour, elle était donc à
 * SENS UNIQUE : qui renonce à se connecter ne revoyait JAMAIS l'onboarding et
 * retombait ici à chaque lancement. Une flèche discrète (gris, coin haut-gauche,
 * ≥ 44 px, jamais un 2e CTA — §A) le ramène à la découverte.
 *
 * ═══ LE GATE D'ÂGE VIT ICI, ET NON SUR LA PORTE (21/07/2026) ════════════════
 *
 * ─── CE QUI A ÉTÉ ESSAYÉ, ET POURQUOI ÇA BRIQUAIT ───────────────────────────
 * Le gate 16+ a d'abord été rendu effectif par un `app/(auth)/_layout` qui
 * redirigeait vers /onboarding tant que `ageConfirmed` (AsyncStorage) n'était
 * pas lu à `true`. L'ACCÈS À LA CONNEXION dépendait donc d'une écriture locale
 * best-effort. Or ce stockage peut ne rien retenir — navigation privée,
 * localStorage bloqué, données de site purgées, quota plein — et l'écriture
 * échouait EN SILENCE. Résultat : /onboarding → âge → /sign-in → le layout ne
 * relit rien → /onboarding… en boucle, sans un mot d'explication. Le gate ne
 * protégeait plus un mineur, il enfermait tout le monde.
 *
 * ─── CE QUE LA LOI DEMANDE VRAIMENT ─────────────────────────────────────────
 * Apple 5.1.1 et le régime RGPD des mineurs interdisent de CRÉER UN COMPTE pour
 * un mineur. Ils n'exigent pas d'interdire l'accès à un écran. Le gate est donc
 * posé au POINT DE CRÉATION : ici, devant les trois voies de cet écran — et
 * elles créent toutes (`requestEmailOtp` envoie `shouldCreateUser: true` ;
 * Apple/Google provisionnent l'utilisateur à la première identité).
 *
 * ─── POURQUOI CETTE FORME NE PEUT PAS DEVENIR UN CUL-DE-SAC ─────────────────
 * La question est posée EN PLACE, dans le bloc d'actions. Aucune navigation,
 * donc aucun aller-retour possible : l'écran de connexion est TOUJOURS
 * atteignable et TOUJOURS quittable (flèche retour). Au pire, le joueur redonne
 * un tap à chaque lancement — et on le lui DIT (STORAGE_UNAVAILABLE_NOTICE).
 *
 * ─── ET ON NE TRANCHE JAMAIS SUR UN DÉFAUT ──────────────────────────────────
 * `ageConfirmed: false` par défaut ne veut PAS dire « mineur ». Les trois états
 * du stockage sont donc distingués (store.ts) :
 *   · `reading`      → on ATTEND. Le hero reste, le bloc d'actions ne peint rien
 *                      (ni fournisseurs — ce serait créer sans gate, ni question
 *                      — ce serait la poser pour rien). Borné : la lecture rend
 *                      la main ou expire (3 s) en `unavailable`.
 *   · `ready` + true → passé. La question ne se voit jamais.
 *   · sinon          → on RE-DEMANDE. Un défaut n'est pas une réponse, et
 *                      re-demander coûte un tap là où sauter coûte la conformité.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI (recalage Vague 1, 25/07/2026) ────────
 * · L'EVENT `onboarding_step { n: 1 }` ÉMIS AU MONTAGE. Le n=1 est le numéro
 *   RÉSERVÉ du splash `hook`, supprimé le 22/07/2026 — et `content.ts` écrit noir
 *   sur blanc que ces numéros « ne se réattribuent jamais : chacun a eu une
 *   population, les mélanger fausserait l'entonnoir historique ». Cet écran
 *   recollait donc silencieusement deux populations sans rapport. Il n'est même
 *   pas une étape de l'onboarding (absent d'`ONBOARDING_STEPS`) : son entrée est
 *   déjà mesurée par le `screen()` automatique du routeur (`app/_layout.tsx`).
 *   L'event est SUPPRIMÉ, pas renuméroté — inventer un n pour un écran hors flow
 *   aurait produit un entonnoir aussi faux, mais plus dur à démonter.
 * · ~85 LIGNES DE CHAMP D'HEXAGONES dupliquées VERBATIM avec `sign-in.web.tsx` :
 *   le fork n'existe que pour tenir `expo-apple-authentication` hors du bundle
 *   web, et ce visuel ne dépend d'aucun module natif. Il vit désormais dans
 *   `features/onboarding/PromiseHexField`.
 * · LE KICKER CHARTREUSE. La grammaire impose un kicker GRIS (`ui/SectionLabel`) :
 *   c'est le marqueur n°1 du recalage, et l'accent chartreuse ne se dépense pas
 *   sur un sur-titre.
 * · TROIS BOUTONS RECODÉS (ghost 52 px, CTA 56 px) → `ui/Button`, qui apporte
 *   l'anneau de focus clavier, `accessibilityState` et le libellé non tronqué.
 * · L'ICÔNE bouclier DANS le CTA d'âge : l'onboarding pose la MÊME question sans
 *   pictogramme. Deux écrans qui posent la même question la posent pareil.
 * · LE `TODO fonts` du titre : il attendait une police qui n'arrivera pas — le
 *   hero prend `fonts.display`, comme la variante web.
 *
 * ─── ÉCARTS ASSUMÉS ─────────────────────────────────────────────────────────
 * · PAS DE PLANCHE Vague 1 pour cet écran — raison : la série E01→E21 n'en
 *   contient pas. Il emprunte donc sa grammaire aux écrans recalés (kicker gris,
 *   un CTA chartreuse au plus, états nommés séparément) sans inventer de forme.
 * · LE HERO N'EST PAS UN BANDEAU PLEIN CADRE (loi 1) — raison : le bloc d'actions
 *   doit rester atteignable clavier ouvert (`KeyboardAvoidingView` + ScrollView),
 *   et un hero à hauteur fixe le repousserait hors de l'écran sur un 375×667.
 * · LE FICHIER EST DUPLIQUÉ (`.web.tsx`) — raison : Metro résout `.web.tsx` avant
 *   `.tsx`, et c'est le seul moyen de tenir `expo-apple-authentication` hors du
 *   bundle web. Tout ce qui pouvait être partagé l'est (catalogue, gate,
 *   `PromiseHexField`, `Button`) ; ce qui reste dupliqué, ce sont les styles.
 */
import { useState } from 'react';
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
import { Redirect, router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fonts, iconSizes, radii, sizes, spacing, typography } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/auth';
import { useT } from '../../src/i18n/store';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { SectionLabel } from '../../src/ui/SectionLabel';
import type { Entry } from '../../src/i18n/types';
import { AGE } from '../../src/features/onboarding/content';
import { PromiseHexField } from '../../src/features/onboarding/PromiseHexField';
import {
  STORAGE_UNAVAILABLE_NOTICE,
  useOnboardingState,
} from '../../src/features/onboarding/store';
import {
  GOOGLE_CAPABLE,
  requestEmailOtp,
  EMAIL_DELIVERY,
  signInWithApple,
  signInWithGoogle,
  verifyEmailOtp,
  type AuthResult,
} from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';

/** Retourne l'Entry i18n (résolue à l'affichage — la bascule de langue suit). */
function failureMessage(result: AuthResult): Entry | null {
  if (result.ok || (!result.ok && result.reason === 'cancelled')) return null;
  if (!result.ok && result.reason === 'google_not_configured') {
    return C.errorGoogleNotConfigured;
  }
  return C.errorSignInFailed;
}

/**
 * LA CAPACITÉ RÉELLE, PAS L'APPARENCE (P0 B5 : un bouton mort est un mensonge).
 * `GOOGLE_CAPABLE` dérive de l'identifiant de LA plateforme courante, pas de
 * celui d'iOS. Ce fichier n'est jamais chargé sur web (Metro résout `.web.tsx`),
 * donc `Platform.OS` y vaut ios ou android.
 */
const CAN_APPLE = Platform.OS === 'ios'; // expo-apple-authentication : iOS only
const CAN_GOOGLE = GOOGLE_CAPABLE;
/**
 * L'E-MAIL EST LA SEULE PORTE : elle monte alors en CTA chartreuse, et le champ
 * s'ouvre d'emblée. Peindre l'unique voie d'un écran en secondaire laissait un
 * écran SANS décision visible — l'étape compte de l'onboarding fait l'inverse
 * pour exactement la même question.
 */
const EMAIL_IS_ONLY_DOOR = !CAN_APPLE && !CAN_GOOGLE;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { session, loading, configured } = useSession();
  const [error, setError] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  // P0 D1 — filet email OTP (code à 6 chiffres, pas de magic-link : zéro deep link).
  const [emailStep, setEmailStep] = useState<'hidden' | 'email' | 'code' | 'sent'>(
    EMAIL_IS_ONLY_DOOR ? 'email' : 'hidden',
  );
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  // Gate légal (voir l'entête) : mémoire de la déclaration + son statut de lecture.
  const {
    state: onboarding,
    status: storageStatus,
    persistenceFailed,
    update: updateOnboarding,
  } = useOnboardingState();
  // Auto-déclaration « moins de 16 ans » : état LOCAL, terminal pour cette vue.
  // Rien n'est persisté (on n'enregistre pas qu'un visiteur s'est dit mineur) et
  // la flèche retour reste ouverte — un remontage rouvre la question, comme
  // l'étape `age` de l'onboarding. Une auto-déclaration est par nature
  // contournable ; c'est le gate attendu par Apple 5.1.1, pas une preuve d'âge.
  const [ageDeclined, setAgeDeclined] = useState(false);

  // ⚠️ Règle des hooks : tous les hooks sont déclarés AVANT ces returns.
  // Restauration de session en cours → fond noir muet (parité avec la variante
  // web et avec (tabs)/_layout) : sans ce cas, un joueur DÉJÀ connecté voyait
  // l'écran de connexion clignoter le temps de la restauration — on lui aurait
  // demandé de se connecter alors qu'il l'était. Un chargement n'affirme rien.
  if (loading) return <View style={styles.root} />;
  // Déjà connecté, ou mode dev sans backend → carte directement.
  if (session || !configured) return <Redirect href="/" />;

  const run = async (fn: () => Promise<AuthResult>): Promise<AuthResult> => {
    setBusy(true);
    setError(null);
    const result = await fn();
    setError(failureMessage(result));
    setBusy(false);
    return result;
  };

  /**
   * LES TROIS ÉTATS DU GATE, jamais confondus (voir l'entête).
   * `ageDeclared` est le SEUL laissez-passer : tout le reste — lecture en cours,
   * lecture impossible, réponse absente — n'est pas une réponse, donc on attend
   * ou on redemande. Aucune de ces branches ne ferme l'écran.
   */
  const ageDeclared = onboarding.ageConfirmed;
  const ageUnknown = storageStatus === 'reading' && !ageDeclared;
  const askAge = !ageDeclared && !ageUnknown;

  return (
    // P0 — le flux e-mail OTP saisit du texte : sans esquive du clavier, le champ
    // et le CTA (bas de l'écran, layout space-between) sont masqués sur petit écran
    // → connexion impossible. KeyboardAvoidingView + ScrollView les remontent ;
    // keyboardShouldPersistTaps garde le CTA tappable clavier ouvert.
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Visuel promesse : un champ d'hexagones égocentré, derrière le hero. */}
      <PromiseHexField />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Un seul enfant pour garder le `space-between` à DEUX blocs (haut/bas) :
            la flèche vit avec le hero, elle ne devient pas un 3e bloc réparti. */}
        <View>
          {/* LA SORTIE : sans elle, « J'ai déjà un compte » enfermait le joueur
              ici pour toujours (l'onboarding est marqué fait avant d'arriver). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.backToOnboarding)}
            hitSlop={12}
            onPress={() => router.replace('/onboarding')}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            {/* Chevron pointé à gauche (le tracé pointe à droite → miroir). */}
            <View style={styles.backMirror}>
              <Icon name="chevron" size={iconSizes.lg} color={colors.gris} />
            </View>
          </Pressable>
          <View style={styles.hero}>
            {/* Le kicker dit à quelle étape on est : la vérification légale d'abord,
                la connexion ensuite. Il bascule en même temps que le bloc du bas. */}
            <SectionLabel style={styles.kicker}>
              {t(askAge ? AGE.kickerSignIn : C.kicker)}
            </SectionLabel>
            <Text style={styles.title}>{t(C.title)}</Text>
            <Text style={styles.subtitle}>{t(C.subtitle)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {/* ── LE GATE, EN PLACE ──
              Trois branches exclusives, dans l'ordre des questions de l'entête. */}
          {ageDeclined ? (
            /* Moins de 16 : terminal ICI (aucun chemin vers l'avant, §A 1 CTA), mais
               l'écran reste quittable par la flèche. On ne peint aucune voie d'auth :
               il n'y a rien à créer. */
            <>
              <Text style={styles.gateTitle}>{t(AGE.blockedTitle)}</Text>
              <Text style={styles.gateNote}>{t(AGE.blockedTagline)}</Text>
            </>
          ) : ageUnknown ? (
            /* Lecture EN COURS : on n'affirme rien. Ni les fournisseurs (ce serait
               ouvrir la création sans gate), ni la question (ce serait la poser à
               quelqu'un qui y a déjà répondu). Le hero porte l'écran pendant ce
               temps — jamais de page vide, et c'est borné (3 s → `unavailable`). */
            null
          ) : askAge ? (
            <>
              <Text style={styles.gateTitle}>{t(AGE.title)}</Text>
              <Text style={styles.gateNote}>{t(AGE.tagline)}</Text>
              {/* L'UNIQUE CTA chartreuse de l'écran, et seulement tant que la
                  question est posée (§A4 : au plus un). */}
              <Button
                label={t(AGE.confirm)}
                accessibilityLabel={t(AGE.confirmA11y)}
                onPress={() => void updateOnboarding({ ageConfirmed: true })}
                variant="primary"
                size="lg"
                analyticsId="signin_age_confirm"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(AGE.under)}
                onPress={() => setAgeDeclined(true)}
                style={({ pressed }) => [styles.gateLink, pressed && styles.backPressed]}
              >
                <Text style={styles.gateLinkLabel}>{t(AGE.under)}</Text>
              </Pressable>
            </>
          ) : (
            /* Âge déclaré : les voies de création/connexion, telles quelles. */
            <>
              {CAN_APPLE ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={radii.pill}
                  style={styles.appleButton}
                  onPress={() => void run(signInWithApple)}
                />
              ) : null}
              {/* B5 : jamais de bouton mort — caché tant que le client id manque. */}
              {CAN_GOOGLE ? (
                <Button
                  label={t(C.googleCta)}
                  onPress={() => void run(signInWithGoogle)}
                  variant="ghost"
                  size="md"
                  loading={busy}
                  analyticsId="signin_google"
                />
              ) : null}

              {/* P0 D1 — filet e-mail : replié tant qu'une autre porte existe (§A,
                  l'écran garde UNE décision), ouvert d'emblée quand il est LA
                  porte : le replier coûterait un tap pour rien. */}
              {emailStep === 'hidden' ? (
                <Button
                  label={t(C.emailCta)}
                  onPress={() => setEmailStep('email')}
                  variant="ghost"
                  size="md"
                  disabled={busy}
                />
              ) : null}
              {emailStep === 'email' ? (
                <>
                  {/* Dit AVANT la saisie ce que le code va faire : connecter un compte
                      existant, ou en créer un. C'est la porte d'entrée de celui qui
                      réinstalle — il doit savoir qu'il est au bon endroit. */}
                  <Text style={styles.otpHint}>
                    {t(EMAIL_DELIVERY === 'code' ? C.otpCreatesOrSignsIn : C.otpCreatesOrSignsInLink)}
                  </Text>
                  {/* Champ 56 pt à LABEL PERSISTANT (planche E21) : un placeholder
                      seul disparaît à la première frappe — le champ ne dit alors
                      plus ce qu'il attend. */}
                  <Text style={styles.fieldLabel}>{t(C.emailFieldA11y)}</Text>
                  <TextInput
                    accessibilityLabel={t(C.emailFieldA11y)}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t(C.emailPlaceholder)}
                    placeholderTextColor={colors.gris}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoFocus
                  />
                  <Button
                    label={t(EMAIL_DELIVERY === 'code' ? C.otpRequestCta : C.otpRequestLinkCta)}
                    onPress={() => {
                      // N'avance vers la saisie du code QUE si l'envoi a réussi.
                      void run(() => requestEmailOtp(email.trim())).then((r) => {
                        // On n'annonce QUE ce qui part vraiment : un lien sur le plan
                        // actuel, un code le jour où un SMTP personnalisé le permet.
                        if (r.ok) setEmailStep(EMAIL_DELIVERY === 'code' ? 'code' : 'sent');
                      });
                    }}
                    variant={EMAIL_IS_ONLY_DOOR ? 'primary' : 'ghost'}
                    size={EMAIL_IS_ONLY_DOOR ? 'lg' : 'md'}
                    loading={busy}
                    disabled={!email.includes('@')}
                    analyticsId="signin_email_request"
                  />
                </>
              ) : null}
              {emailStep === 'sent' ? (
                <>
                  <Text style={styles.otpHint}>{t(C.otpLinkSent, { email: email.trim() })}</Text>
                  <Text style={styles.otpHint}>{t(C.otpLinkHint)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(C.otpLinkResendCta)}
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={() => void run(() => requestEmailOtp(email.trim()))}
                    style={styles.resendHit}
                  >
                    <Text style={styles.otpResend}>{t(C.otpLinkResendCta)}</Text>
                  </Pressable>
                </>
              ) : null}
              {emailStep === 'code' ? (
                <>
                  <Text style={styles.otpHint}>{t(C.otpSent, { email: email.trim() })}</Text>
                  <Text style={styles.fieldLabel}>{t(C.otpFieldA11y)}</Text>
                  <TextInput
                    accessibilityLabel={t(C.otpFieldA11y)}
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    placeholderTextColor={colors.gris}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <Button
                    label={t(C.otpVerifyCta)}
                    onPress={() => void run(() => verifyEmailOtp(email.trim(), code.trim()))}
                    variant={EMAIL_IS_ONLY_DOOR ? 'primary' : 'ghost'}
                    size={EMAIL_IS_ONLY_DOOR ? 'lg' : 'md'}
                    loading={busy}
                    disabled={code.length < 6}
                    analyticsId="signin_email_verify"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(C.otpResendCta)}
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={() => {
                      setCode('');
                      void run(() => requestEmailOtp(email.trim()));
                    }}
                    style={styles.resendHit}
                  >
                    <Text style={styles.otpResend}>{t(C.otpResendCta)}</Text>
                  </Pressable>
                </>
              ) : null}
              {/* L'échec est ANNONCÉ aux lecteurs d'écran (parité avec le web) :
                  un message qui apparaît en silence n'existe pas pour eux. */}
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {t(error)}
                </Text>
              ) : null}
            </>
          )}
          {/* L'ÉTAT QU'ON NE PEUT PAS RETENIR SE DIT (toutes branches confondues).
              Sans cette ligne, le joueur redonnait sa réponse à chaque lancement sans
              jamais comprendre pourquoi — l'écriture échouait dans un `catch {}`. */}
          {persistenceFailed ? (
            <Text style={styles.gateNote}>{t(STORAGE_UNAVAILABLE_NOTICE)}</Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Interligne du titre hero : 64 px serrés (mesure de composition). */
const HERO_LINE_RATIO = 1.02;
/** Largeur de lecture confortable du sous-titre — ~60 caractères. */
const SUBTITLE_MAX_WIDTH = 320;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
  },
  // Le contenu garde le layout space-between historique (hero en haut, actions en
  // bas), mais devient défilable quand le clavier réduit la hauteur utile.
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  // Flèche de retour vers l'onboarding : cible ≥ 44×44 (+hitSlop), gris discret,
  // jamais un 2e CTA (§A). `marginLeft` négatif : le glyphe est centré dans sa
  // boîte de 44, on le recale optiquement sur la marge du texte.
  back: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: { opacity: 0.7 },
  backMirror: { transform: [{ scaleX: -1 }] },
  hero: { marginTop: spacing.lg },
  // Le kicker CONSOMME `ui/SectionLabel` (gris, rôle R1) : ne reste ici que la
  // marge de CETTE page, et les chiffres tabulaires (le kicker porte parfois un
  // compte). Il était CHARTREUSE — l'accent ne se dépense pas sur un sur-titre.
  kicker: { marginBottom: spacing.md, fontVariant: ['tabular-nums'] },
  title: {
    color: colors.blanc,
    fontFamily: fonts.display, // Inter Tight 800 — la famille porte la graisse
    fontSize: fontSizes.hero,
    lineHeight: fontSizes.hero * HERO_LINE_RATIO,
    letterSpacing: -1.2,
  },
  subtitle: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: spacing.lg,
    maxWidth: SUBTITLE_MAX_WIDTH,
  },
  actions: { gap: spacing.sm },
  appleButton: { height: sizes.buttonLg, width: '100%' },
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
  otpHint: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xs, textAlign: 'center' },
  // Le « renvoyer » est un LIEN, pas un bouton : il garde quand même son plancher
  // tactile — une cible de 14 px de haut n'est pas atteignable.
  resendHit: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpResend: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
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

  // ── GATE D'ÂGE, POSÉ AU POINT DE CRÉATION (voir l'entête) ──
  // La question vit dans le bloc du bas : le hero ne bouge pas, donc rien ne
  // « saute » quand la lecture du stockage rend la main.
  gateTitle: {
    ...typography.cardTitle, // R3 — Inter Tight 600
    color: colors.blanc,
  },
  /** Sert aussi à l'avis de non-persistance : gris, jamais chartreuse (≠ action). */
  gateNote: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    marginBottom: spacing.xxs,
  },
  // Lien secondaire « moins de 16 » — cible ≥ 44 px, gris, jamais un 2e CTA.
  gateLink: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  gateLinkLabel: { color: colors.gris, fontFamily: fonts.textMedium, fontSize: fontSizes.sm },
});
