/**
 * GRYD — écran promesse + sign-in (SPEC §4.1 étapes 1 et 3).
 * « Cours pour ton crew. Conquiers ta ville. » — 2 taps, zéro formulaire.
 * Un refus/échec n'est jamais un mur (§4.1) : message + retry.
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
import { Redirect } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import { colors, fontSizes, mapTokens, radii, sizes, spacing } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/auth';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { EVENTS, track } from '../../src/lib/analytics';
import {
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
const GOOGLE_CONFIGURED = Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { session, configured } = useSession();
  const [error, setError] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  // P0 D1 — filet email OTP (code à 6 chiffres, pas de magic-link : zéro deep link).
  const [emailStep, setEmailStep] = useState<'hidden' | 'email' | 'code'>('hidden');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    track(EVENTS.onboardingStep, { n: ONBOARDING_STEP_PROMISE });
  }, []);

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
      <View style={styles.hero}>
        <Text style={styles.kicker}>{t(C.kicker)}</Text>
        {/* TODO fonts : Space Grotesk 700, tracking -2 % (addendum §E) — système en attendant */}
        <Text style={styles.title}>{t(C.title)}</Text>
        <Text style={styles.subtitle}>{t(C.subtitle)}</Text>
      </View>

      <View style={styles.actions}>
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
  hero: { marginTop: 48 },
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
});
