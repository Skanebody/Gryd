/**
 * GRYD — ÉCRAN D'ERREUR DE L'APP. Ce qui s'affiche à la place d'une trace
 * technique quand quelque chose casse au rendu.
 *
 * ─── L'AUDIT QUI DÉCIDE DE LA FORME (exigence du chantier) ──────────────────
 * expo-router fournit DÉJÀ une frontière d'erreur, et il fallait regarder ce
 * qu'elle fait avant d'en empiler une deuxième. Ce qu'elle fait :
 *   · `useScreens.fromImport` enveloppe un fichier de route dans `<Try>` DÈS
 *     QUE ce fichier exporte `ErrorBoundary`. La route enveloppée est le
 *     COMPOSANT DE ROUTE LUI-MÊME — pour `app/_layout.tsx`, cela couvre donc
 *     le corps de `RootLayout` (y compris l'appel à `useAppFonts`), ce qu'un
 *     `<ErrorBoundary>` posé À L'INTÉRIEUR du JSX ne peut PAS couvrir : un
 *     boundary n'attrape jamais ce qui casse chez son parent ;
 *   · `Try.getDerivedStateFromError` appelle `SplashScreen.hideAsync()` — sans
 *     quoi l'écran d'erreur resterait caché DERRIÈRE le splash ;
 *   · `Try.retry` rend une `Promise` qui se résout APRÈS le remontage.
 *   · en revanche son rendu par défaut affiche « Something went wrong » PUIS
 *     `Error: {error.message}` en clair — et ce chemin-là n'est PAS réservé au
 *     développement (`StandardErrorView` est rendu en production aussi).
 *
 * Conclusion appliquée : on garde le MÉCANISME d'expo-router (il est meilleur
 * que le nôtre) et on lui donne un RENDU GRYD. `app/_layout.tsx` exporte donc
 * ce composant sous le nom `ErrorBoundary`, et le `<ErrorBoundary>` maison qui
 * enveloppait `<Stack>` disparaît : une seule couche, pas deux.
 *
 * ─── TROIS DÉPENDANCES VOLONTAIREMENT REFUSÉES ──────────────────────────────
 * Un écran d'erreur qui casse en s'affichant est pire que pas d'écran du tout.
 * D'où trois renoncements assumés :
 *   1. AUCUNE FONTE DE MARQUE. Les rôles `typography.*` portent les familles
 *      Night Print — or la panne réellement observée par le fondateur était
 *      « fonts is not defined ». On garde le rôle (taille, graisse, interligne)
 *      et on remet `fontFamily` à `undefined` : la fonte système prend le
 *      relais. L'écran survit donc à la panne même qui l'appelle.
 *   2. PAS DE `<Button>` PARTAGÉ. Il tire `haptics` (expo-haptics), `analytics`
 *      (PostHog), `Icon` et `Animated` — quatre occasions de re-casser. Les
 *      deux boutons sont recodés ici avec les MÊMES tokens (hauteur, rayon,
 *      rôle R5, chartreuse/noir) : l'apparence est celle de la charte, la
 *      surface d'échec est réduite au minimum.
 *   3. PAS DE `SafeAreaProvider`. Quand c'est `RootLayout` qui casse, le
 *      provider n'a jamais été monté — `useSafeAreaInsets` planterait. On
 *      retombe sur une marge verticale généreuse, suffisante pour un écran
 *      centré sans barre.
 *
 * §A : 1 écran = 1 décision. UN SEUL CTA chartreuse (« Réessayer »), la sortie
 * secondaire est un ghost. Les deux mènent quelque part — jamais de cul-de-sac.
 */
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { router, type ErrorBoundaryProps } from 'expo-router';
import Svg, { Polygon } from 'react-native-svg';
import { colors, elevation, gameColors, radii, sizes, spacing, typography } from '@klaim/shared';
import { C } from '../i18n/catalog/route';
import { resolve } from '../i18n/types';
import { useLocale } from '../i18n/store';
import { buildAppErrorView } from './appErrorPolicy';
import { logAppError } from './fatalErrorGuard';

/**
 * Rôle typographique SANS sa famille de marque — voir le renoncement n°1.
 * `fontWeight` reste posé : c'est lui qui porte la graisse sur la fonte système.
 */
function systemFont(role: TextStyle): TextStyle {
  return { ...role, fontFamily: undefined };
}

/** Hexagone pointy-top — motif de marque, tracé au trait (identique à la charte). */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Navigation de repli, TOUJOURS gardée : on ne relance pas d'erreur d'ici. */
function goToMap(): void {
  try {
    router.replace('/(tabs)');
  } catch {
    // Navigateur démonté (c'est le layout racine qui a cassé) : le remontage
    // seul remet l'app debout, sans changer de route.
  }
}

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const locale = useLocale();
  // Tout le choix de copie vit dans `appErrorPolicy` (pur, testé en Deno) :
  // ce composant ne fait que rendre. `detail` vaut `null` hors développement.
  const view = buildAppErrorView(error, locale, __DEV__);

  // JOURNAL INTERNE — une fois par erreur, jamais à l'écran.
  useEffect(() => {
    logAppError(error, false);
  }, [error]);

  const onRetry = (): void => {
    void retry().catch(() => undefined);
  };

  const onBackToMap = (): void => {
    // Deux tentatives, et c'est voulu. AVANT : si le navigateur est encore
    // monté (un écran enfant a cassé), la cible est déjà la carte au moment où
    // l'arbre se reconstruit — sinon il repartirait droit sur l'écran fautif.
    // APRÈS : `retry()` d'expo-router se résout une fois le remontage fait,
    // donc si le navigateur n'existait plus, c'est là qu'il redevient joignable.
    // Rejouer la même cible est sans effet de bord.
    goToMap();
    void retry().then(goToMap).catch(() => undefined);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Polygon
            points={hexPoints(36, 36, 30)}
            fill="none"
            stroke={colors.chartreuse}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Polygon
            points={hexPoints(36, 36, 20)}
            fill={colors.chartreuse14}
            stroke={colors.chartreuse40}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>

        <Text accessibilityRole="header" style={[systemFont(typography.title), styles.title]}>
          {view.title}
        </Text>
        <Text style={[systemFont(typography.body), styles.body]}>{view.body}</Text>

        {/* UNIQUE CTA chartreuse de l'écran (§A4) — il marche toujours : il ne
            dépend d'aucun réseau, il reconstruit l'arbre. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view.retryLabel}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            styles.primary,
            pressed && { backgroundColor: colors.chartreusePressed },
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            ellipsizeMode="clip"
            style={[systemFont(typography.button), { color: colors.noir }]}
          >
            {view.retryLabel}
          </Text>
        </Pressable>

        {/* Sortie secondaire : ghost, jamais une deuxième chartreuse. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={view.backLabel}
          onPress={onBackToMap}
          style={({ pressed }) => [styles.button, styles.ghost, pressed && { opacity: 0.6 }]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            ellipsizeMode="clip"
            style={[systemFont(typography.button), { color: colors.blanc }]}
          >
            {view.backLabel}
          </Text>
        </Pressable>

        {/* DÉVELOPPEMENT UNIQUEMENT. `view.detail` est `null` en production —
            la garantie tient dans `appErrorPolicy`, pas dans ce test-ci : même
            si ce bloc était rendu par erreur, il n'aurait rien à afficher. */}
        {view.detail !== null ? (
          <View style={styles.devBlock}>
            <Text style={[systemFont(typography.kicker), styles.devKicker]}>
              {resolve(C.crashDevKicker, locale).toUpperCase()}
            </Text>
            <ScrollView style={styles.devScroll}>
              <Text selectable style={[systemFont(typography.meta), styles.devText]}>
                {view.detail}
              </Text>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
    // Marge verticale généreuse : sans SafeAreaProvider, elle tient lieu
    // d'encoche et de barre système (voir le renoncement n°3).
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl + spacing.lg,
  },
  content: { width: '100%', maxWidth: 420, alignItems: 'center', gap: spacing.md },
  title: { color: colors.blanc, textAlign: 'center', marginTop: spacing.xs },
  body: {
    color: colors.gris,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  button: {
    alignSelf: 'stretch',
    height: sizes.buttonLg,
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primary: { backgroundColor: gameColors.crew }, // = chartreuse, libellé NOIR
  ghost: { borderWidth: 1, borderColor: colors.grisLigne },
  devBlock: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.control,
    backgroundColor: elevation.raised,
    gap: spacing.xxs,
  },
  devKicker: { color: colors.grisFaible },
  devScroll: { maxHeight: 160 },
  devText: { color: colors.gris },
});
