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
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import { colors, fontSizes, mapTokens, radii, spacing } from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { signInWithApple, signInWithGoogle, type AuthResult } from '../../src/lib/auth';
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
      {/* Visuel promesse : carte égocentrée de sa ville, montrée derrière le hero. */}
      <PromiseHexField />
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
