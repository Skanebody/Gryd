/**
 * GRYD — écran de CONNEXION (SPEC §4.1 étape 3). 2 taps, zéro formulaire.
 * Un refus/échec n'est jamais un mur (§4.1) : message + retry.
 *
 * ─── CE N'EST PLUS L'ÉCRAN PROMESSE (21/07/2026) ────────────────────────────
 * Il ouvrait le produit, d'où sa copy d'accroche (« SAISON 0 · PARIS & LILLE »,
 * « Cours pour ton crew. Conquiers ta ville. »). La promesse vit désormais dans
 * l'onboarding (hook), et cet écran est la DESTINATION de celui qui revient :
 * le lien « J'ai déjà un compte » du premier écran y mène, et (tabs)/_layout y
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
 */
import { useEffect, useState } from 'react';
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
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import { colors, fontSizes, iconSizes, mapTokens, radii, sizes, spacing } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/auth';
import { useT } from '../../src/i18n/store';
import { Icon } from '../../src/ui/Icon';
import type { Entry } from '../../src/i18n/types';
import { AGE } from '../../src/features/onboarding/content';
import {
  STORAGE_UNAVAILABLE_NOTICE,
  useOnboardingState,
} from '../../src/features/onboarding/store';
import { EVENTS, track } from '../../src/lib/analytics';
import {
  GOOGLE_CAPABLE,
  requestEmailOtp,
  signInWithApple,
  signInWithGoogle,
  verifyEmailOtp,
  type AuthResult,
} from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';

const ONBOARDING_STEP_PROMISE = 1;

/**
 * Visuel promesse (audit P2 visuel-2026) : un champ d'hexagones ÉGOCENTRÉ derrière
 * le hero, pour MONTRER « capture des zones sur la carte réelle » et pas seulement
 * l'écrire. Une grappe capturée (mine, chartreuse) au foyer, quelques tuiles rivales
 * en lisière (foe), le reste = ville neutre à peine tracée. Purement décoratif —
 * AUCUNE donnée fabriquée (pas de villes/classements) — et 100 % tokens carte
 * (mapTokens.*), donc cohérent au pixel avec la vraie Battle Map. Fondu vers le noir
 * en bas pour garder titre + sous-titre parfaitement lisibles.
 */
const FIELD_VB_W = 160;
const FIELD_VB_H = 240;
const HEX_R = 15;

type HexRole = 'neutral' | 'mine' | 'foe';
interface HexCell {
  points: string;
  role: HexRole;
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30); // pointy-top, comme AvatarHex/CrewFrame
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Nid d'abeilles déterministe : foyer capturé + frontière rivale + ville neutre. */
function buildHexField(): HexCell[] {
  const cells: HexCell[] = [];
  const w = Math.sqrt(3) * HEX_R; // largeur d'un hex pointy-top
  const vStep = 1.5 * HEX_R; // pas vertical du nid d'abeilles
  const focalX = FIELD_VB_W * 0.42;
  const focalY = FIELD_VB_H * 0.34;
  let row = 0;
  for (let cy = 0; cy <= FIELD_VB_H + HEX_R; cy += vStep, row += 1) {
    const offset = row % 2 ? w / 2 : 0;
    let col = 0;
    for (let cx = -w; cx <= FIELD_VB_W + w; cx += w, col += 1) {
      const x = cx + offset;
      const d = Math.hypot(x - focalX, cy - focalY);
      let role: HexRole = 'neutral';
      if (d < 24) role = 'mine';
      else if (d < 42 && (row + col) % 3 === 0) role = 'foe'; // quelques tuiles en lisière
      cells.push({ points: hexPoints(x, cy, HEX_R - 1.2), role });
    }
  }
  return cells;
}

const HEX_FIELD = buildHexField();

const HEX_FILL: Record<HexRole, string> = {
  neutral: 'none',
  mine: mapTokens.mineFill,
  foe: mapTokens.foeFill,
};
const HEX_STROKE: Record<HexRole, string> = {
  neutral: mapTokens.neutralStroke,
  mine: mapTokens.mineStroke,
  foe: mapTokens.foeStroke,
};

function PromiseHexField() {
  return (
    <View style={styles.backdrop} pointerEvents="none" accessible={false}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${FIELD_VB_W} ${FIELD_VB_H}`}
        preserveAspectRatio="xMidYMin slice"
      >
        {HEX_FIELD.map((cell, i) => (
          <Polygon
            key={i}
            points={cell.points}
            fill={HEX_FILL[cell.role]}
            stroke={HEX_STROKE[cell.role]}
            strokeWidth={cell.role === 'neutral' ? 0.8 : 1.1}
          />
        ))}
        {/* Fondu vers le noir : le bas de l'écran reste un fond propre pour le texte. */}
        <Defs>
          <LinearGradient id="promiseFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.noir} stopOpacity="0" />
            <Stop offset="0.55" stopColor={colors.noir} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.noir} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={FIELD_VB_W} height={FIELD_VB_H} fill="url(#promiseFade)" />
      </Svg>
    </View>
  );
}

/** Retourne l'Entry i18n (résolue à l'affichage — la bascule de langue suit). */
function failureMessage(result: AuthResult): Entry | null {
  if (result.ok || (!result.ok && result.reason === 'cancelled')) return null;
  if (!result.ok && result.reason === 'google_not_configured') {
    return C.errorGoogleNotConfigured;
  }
  return C.errorSignInFailed;
}

/** P0 B5 — un bouton Google MORT est un mensonge : caché tant que le client id manque. */
/* Même source que le moteur (cf. onboarding) : `GOOGLE_CAPABLE` dérive de
   l'identifiant de LA plateforme courante, pas de celui d'iOS. */
const GOOGLE_CONFIGURED = GOOGLE_CAPABLE;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { session, loading, configured } = useSession();
  const [error, setError] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  // P0 D1 — filet email OTP (code à 6 chiffres, pas de magic-link : zéro deep link).
  const [emailStep, setEmailStep] = useState<'hidden' | 'email' | 'code'>('hidden');
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

  useEffect(() => {
    track(EVENTS.onboardingStep, { n: ONBOARDING_STEP_PROMISE });
  }, []);

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
      {/* Visuel promesse : carte égocentrée de sa ville, montrée derrière le hero. */}
      <PromiseHexField />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
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
          <Text style={styles.kicker}>{t(askAge ? AGE.kickerSignIn : C.kicker)}</Text>
          {/* TODO fonts : Space Grotesk 700, tracking -2 % (addendum §E) — système en attendant */}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(AGE.confirmA11y)}
            onPress={() => void updateOnboarding({ ageConfirmed: true })}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Icon name="bouclier" size={20} color={colors.noir} />
            <Text style={styles.ctaLabel}>{t(AGE.confirm)}</Text>
          </Pressable>
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
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={radii.pill}
            style={styles.appleButton}
            onPress={() => void run(signInWithApple)}
          />
        ) : null}
        {/* Bouton secondaire ghost (addendum §F) — B5 : jamais de bouton mort. */}
        {GOOGLE_CONFIGURED ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void run(signInWithGoogle)}
            style={({ pressed }) => [styles.ghostButton, (pressed || busy) && styles.ghostPressed]}
          >
            <Text style={styles.ghostLabel}>{t(C.googleCta)}</Text>
          </Pressable>
        ) : null}

        {/* P0 D1 — filet e-mail : replié par défaut (§A, l'écran garde UNE décision). */}
        {emailStep === 'hidden' ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setEmailStep('email')}
            style={({ pressed }) => [styles.ghostButton, (pressed || busy) && styles.ghostPressed]}
          >
            <Text style={styles.ghostLabel}>{t(C.emailCta)}</Text>
          </Pressable>
        ) : null}
        {emailStep === 'email' ? (
          <>
            {/* Dit AVANT la saisie ce que le code va faire : connecter un compte
                existant, ou en créer un. C'est la porte d'entrée de celui qui
                réinstalle — il doit savoir qu'il est au bon endroit. */}
            <Text style={styles.otpHint}>{t(C.otpCreatesOrSignsIn)}</Text>
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
            <Pressable
              accessibilityRole="button"
              disabled={busy || !email.includes('@')}
              onPress={() => {
                // N'avance vers la saisie du code QUE si l'envoi a réussi.
                void run(() => requestEmailOtp(email.trim())).then((r) => {
                  if (r.ok) setEmailStep('code');
                });
              }}
              style={({ pressed }) => [styles.ghostButton, (pressed || busy) && styles.ghostPressed]}
            >
              <Text style={styles.ghostLabel}>{t(C.otpRequestCta)}</Text>
            </Pressable>
          </>
        ) : null}
        {emailStep === 'code' ? (
          <>
            <Text style={styles.otpHint}>{t(C.otpSent, { email: email.trim() })}</Text>
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
            <Pressable
              accessibilityRole="button"
              disabled={busy || code.length < 6}
              onPress={() => void run(() => verifyEmailOtp(email.trim(), code.trim()))}
              style={({ pressed }) => [styles.ghostButton, (pressed || busy) && styles.ghostPressed]}
            >
              <Text style={styles.ghostLabel}>{t(C.otpVerifyCta)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setCode('');
                void run(() => requestEmailOtp(email.trim()));
              }}
              style={{ minHeight: sizes.touchTarget, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={styles.otpResend}>{t(C.otpResendCta)}</Text>
            </Pressable>
          </>
        ) : null}
        {error ? <Text style={styles.error}>{t(error)}</Text> : null}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
  },
  // Le contenu garde le layout space-between historique (hero en haut, actions en
  // bas), mais devient défilable quand le clavier réduit la hauteur utile.
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  // Champ d'hexagones décoratif : occupe le haut de l'écran, derrière hero + actions
  // (premier enfant + absolu = plan de fond). pointerEvents none → n'intercepte rien.
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: '64%' },
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
  // 48 → 20 : la flèche occupe désormais le haut du bloc, le hero se recale sous elle.
  hero: { marginTop: spacing.lg },
  kicker: {
    color: colors.chartreuse, // emploi §C.3 : accent unique, jamais sur fond clair
    fontSize: fontSizes.xs,
    letterSpacing: 2.5,
    marginBottom: 18,
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.hero,
    lineHeight: fontSizes.hero * 1.02,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  subtitle: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: 22,
    maxWidth: 320,
  },
  actions: { gap: spacing.sm },
  appleButton: { height: 56, width: '100%' },
  ghostButton: {
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostPressed: { opacity: 0.7 },
  input: {
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.blanc,
    paddingHorizontal: 20,
    fontSize: fontSizes.sm,
  },
  otpHint: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },
  otpResend: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 6,
  },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  error: { color: colors.blanc, fontSize: fontSizes.sm, textAlign: 'center', marginTop: 6 },

  // ── GATE D'ÂGE, POSÉ AU POINT DE CRÉATION (voir l'entête) ──
  // La question vit dans le bloc du bas : le hero ne bouge pas, donc rien ne
  // « saute » quand la lecture du stockage rend la main.
  gateTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    lineHeight: fontSizes.md * 1.3,
  },
  /** Sert aussi à l'avis de non-persistance : gris, jamais chartreuse (≠ action). */
  gateNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    marginBottom: 4,
  },
  // L'UNIQUE CTA chartreuse de l'écran, et seulement tant que la question est
  // posée (§A4 : au plus un). Une fois l'âge déclaré, l'écran repasse à zéro
  // chartreuse — les voies d'auth restent des boutons système / ghost.
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '600', letterSpacing: 0.2 },
  ctaPressed: { opacity: 0.85 },
  // Lien secondaire « moins de 16 » — cible ≥ 44 px, gris, jamais un 2e CTA.
  gateLink: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  gateLinkLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
});
