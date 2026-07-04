/**
 * GRYD — écran promesse + sign-in (SPEC §4.1 étapes 1 et 3).
 * « Cours. Capture. Défends. » — 2 taps, zéro formulaire.
 * Un refus/échec n'est jamais un mur (§4.1) : message + retry.
 */
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { signInWithApple, signInWithGoogle, type AuthResult } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';

const ONBOARDING_STEP_PROMISE = 1;

function failureMessage(result: AuthResult): string | null {
  if (result.ok || (!result.ok && result.reason === 'cancelled')) return null;
  if (!result.ok && result.reason === 'google_not_configured') {
    return 'Connexion Google pas encore configurée (O2). Utilise Apple pour l’instant.';
  }
  return 'La connexion a échoué. Réessaie — ta course ne se perdra jamais pour ça.';
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track(EVENTS.onboardingStep, { n: ONBOARDING_STEP_PROMISE });
  }, []);

  // Déjà connecté, ou mode dev sans backend → carte directement.
  if (session || !configured) return <Redirect href="/" />;

  const run = async (fn: () => Promise<AuthResult>) => {
    setBusy(true);
    setError(null);
    const result = await fn();
    setError(failureMessage(result));
    setBusy(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {/* Visuel promesse : la carte de sa ville — placeholder Milestone 1 */}
      <View style={styles.hero}>
        <Text style={styles.kicker}>SAISON 0 · PARIS & LILLE</Text>
        {/* TODO fonts : Space Grotesk 700, tracking -2 % (addendum §E) — système en attendant */}
        <Text style={styles.title}>Cours.{'\n'}Capture.{'\n'}Défends.</Text>
        <Text style={styles.subtitle}>
          Chaque course capture des zones sur la carte réelle de ta ville. Ton crew tient
          le quartier — ou le perd.
        </Text>
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
        {/* Bouton secondaire ghost (addendum §F) */}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void run(signInWithGoogle)}
          style={({ pressed }) => [styles.ghostButton, (pressed || busy) && styles.ghostPressed]}
        >
          <Text style={styles.ghostLabel}>Continuer avec Google</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.cardPadding + 4,
    justifyContent: 'space-between',
  },
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
  actions: { gap: 11 },
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
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  error: { color: colors.blanc, fontSize: fontSizes.sm, textAlign: 'center', marginTop: 6 },
});
