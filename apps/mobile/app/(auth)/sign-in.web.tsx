/**
 * GRYD — sign-in, variante WEB. Metro/expo-router résolvent `.web.tsx` avant
 * `.tsx` : les modules natifs-only (expo-apple-authentication) ne sont PAS
 * importés dans le bundle web.
 *
 * ─── CE QUE CE FICHIER FAISAIT DE FAUX (corrigé le 21/07/2026) ──────────────
 * Il renvoyait `<Redirect href="/" />` INCONDITIONNEL, en s'appuyant sur un
 * commentaire devenu faux (« en aperçu web la session est en mode non
 * configuré »). Depuis que `session.web.tsx` lit la VRAIE session Supabase,
 * `configured` vaut true sur web : (tabs)/_layout voyait `configured && !session`
 * et redirigeait ici, qui renvoyait vers `/`, qui redirigeait ici… Boucle, DOM
 * vide, ÉCRAN NOIR MORT. Aucun message, aucun spinner, aucune erreur console —
 * l'état exactement interdit par « état vide ≠ écran blanc ».
 *
 * ─── CE QU'IL FAIT MAINTENANT ───────────────────────────────────────────────
 * Un VRAI écran de connexion, e-mail OTP (code à 6 chiffres). Trois états
 * distincts, jamais confondus :
 *   · session en cours de restauration → fond noir muet, on n'affirme RIEN sur
 *     le joueur (un chargement n'est pas un état vide) ;
 *   · pas connecté → cet écran, invite à se connecter ;
 *   · échec (réseau, code faux, e-mail refusé) → le dit et laisse réessayer,
 *     jamais un mur (§4.1).
 *
 * POURQUOI PAS DE BOUTON APPLE / GOOGLE ICI : ils n'ont aucun chemin utilisable
 * dans un navigateur aujourd'hui (cf. entête de src/lib/auth.web.ts — O2 et URL
 * de redirection). Les peindre serait peindre deux boutons morts. Leur ABSENCE
 * n'est pas un mensonge ; un bouton qui échoue toujours en serait un. Le natif
 * (sign-in.tsx) garde Apple + Google + le même filet e-mail : l'écran web est
 * donc identique à ce que voit un Android sans Google configuré.
 *
 * ⚠️ PARITÉ avec sign-in.tsx : hero, copie (même catalogue i18n) et styles sont
 * dupliqués à la main. Toute évolution de l'un se reporte sur l'autre. Le fork
 * n'existe QUE pour tenir expo-apple-authentication hors du bundle web.
 */
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import { colors, fontSizes, mapTokens, radii, sizes, spacing } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/auth';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { EVENTS, track } from '../../src/lib/analytics';
import { requestEmailOtp, verifyEmailOtp, type AuthResult } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';

const ONBOARDING_STEP_PROMISE = 1;

/**
 * Visuel promesse — copie conforme de sign-in.tsx (§ PARITÉ ci-dessus) : un champ
 * d'hexagones ÉGOCENTRÉ derrière le hero. Purement décoratif, déterministe,
 * AUCUNE donnée fabriquée (pas de villes, pas de classements, pas de rivaux) et
 * 100 % tokens carte (mapTokens.*).
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
          <LinearGradient id="promiseFadeWeb" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.noir} stopOpacity="0" />
            <Stop offset="0.55" stopColor={colors.noir} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.noir} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={FIELD_VB_W} height={FIELD_VB_H} fill="url(#promiseFadeWeb)" />
      </Svg>
    </View>
  );
}

/** Retourne l'Entry i18n (résolue à l'affichage — la bascule de langue suit). */
function failureMessage(result: AuthResult): Entry | null {
  if (result.ok) return null;
  // `cancelled` n'existe pas sur le chemin e-mail (aucune feuille système à
  // fermer) ; tout autre échec est dit, avec la même phrase que le natif.
  return C.errorSignInFailed;
}

export default function SignInScreenWeb() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { session, loading, configured } = useSession();
  const [error, setError] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  // Le web n'a que le filet e-mail : il est OUVERT d'emblée (§A — 1 écran =
  // 1 décision). Le replier derrière un bouton ajouterait un tap pour rien.
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  /* Conditions d'envoi, nommées une fois : elles pilotent À LA FOIS `disabled`
     et le style, sinon les deux divergent — c'est exactement ce qui rendait le
     bouton inerte sans le montrer. */
  const canSendEmail = !busy && email.includes('@');

  useEffect(() => {
    track(EVENTS.onboardingStep, { n: ONBOARDING_STEP_PROMISE });
  }, []);

  // ⚠️ Règle des hooks : tous les hooks sont déclarés AVANT ces returns.
  // Restauration de session en cours → on n'affirme rien (ni « connecte-toi »,
  // ni « connecté »). Fond noir muet, comme (tabs)/_layout.
  if (loading) return <View style={styles.root} />;
  // Déjà connecté, ou mode dev sans backend (O1) → carte directement.
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
    // Le flux e-mail OTP saisit du texte : sans esquive du clavier, le champ et
    // le CTA (bas de l'écran) sont masqués sur petit écran → connexion
    // impossible. Sur web `behavior` est undefined (pas de clavier logiciel qui
    // recouvre le viewport), mais le ScrollView reste nécessaire en fenêtre basse.
    <KeyboardAvoidingView style={styles.root}>
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
          <Text style={styles.title}>{t(C.title)}</Text>
          <Text style={styles.subtitle}>{t(C.subtitle)}</Text>
        </View>

        <View style={styles.actions}>
          {step === 'email' ? (
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
                accessibilityLabel={t(C.otpRequestCta)}
                disabled={!canSendEmail}
                accessibilityState={{ disabled: !canSendEmail }}
                onPress={() => {
                  // N'avance vers la saisie du code QUE si l'envoi a réussi.
                  void run(() => requestEmailOtp(email.trim())).then((r) => {
                    if (r.ok) setStep('code');
                  });
                }}
                style={({ pressed }) => [
                  styles.ghostButton,
                  (pressed || busy) && styles.ghostPressed,
                  !canSendEmail && styles.ghostDisabled,
                ]}
              >
                <Text style={styles.ghostLabel}>{t(C.otpRequestCta)}</Text>
              </Pressable>
            </>
          ) : (
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
                accessibilityLabel={t(C.otpVerifyCta)}
                disabled={busy || code.length < 6}
                onPress={() => void run(() => verifyEmailOtp(email.trim(), code.trim()))}
                style={({ pressed }) => [
                  styles.ghostButton,
                  (pressed || busy) && styles.ghostPressed,
                ]}
              >
                <Text style={styles.ghostLabel}>{t(C.otpVerifyCta)}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.otpResendCta)}
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
          )}
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {t(error)}
            </Text>
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
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
  // Champ d'hexagones décoratif : occupe le haut de l'écran, derrière hero +
  // actions. pointerEvents none → n'intercepte rien.
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
  ghostButton: {
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostPressed: { opacity: 0.7 },
  /* Un CTA désactivé DOIT se voir. Sans cette différence, l'écran de connexion
     donne un bouton qui ne répond pas et n'explique rien — le lecteur conclut
     que l'app est cassée, pas qu'il lui manque une saisie. */
  ghostDisabled: { opacity: 0.4 },
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
  resendHit: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
