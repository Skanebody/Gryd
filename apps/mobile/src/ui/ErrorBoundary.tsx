/**
 * GRYD — ErrorBoundary global brandé (AMENDEMENT-08 §0, doc §28 — PRIORITÉ
 * ABSOLUE) : plus JAMAIS d'écran d'erreur brut « Cannot read properties of
 * undefined ». Fond noir charte, hexagone chartreuse, « Reprends ta course. »,
 * bouton Recharger qui remonte le state (et recharge la page en web — protège
 * aussi contre un onglet connecté à un ancien serveur dev planté).
 */
import { Component, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
// i18n : composant CLASSE (pas de hook) → résolution ponctuelle via t() du
// store (langue courante au moment de l'erreur — le boundary reste autonome).
import { C } from '../i18n/catalog/route';
import { t } from '../i18n/store';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Hexagone pointy-top chartreuse — motif de marque, tracé au trait. */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    // Log console uniquement (pas de réseau) — le boundary reste autonome.
    console.error('[GRYD] ErrorBoundary', error);
  }

  private readonly reload = (): void => {
    if (Platform.OS === 'web') {
      // Web : un vrai reload récupère aussi un bundle dev périmé (doc §28).
      const loc = (globalThis as { location?: { reload(): void } }).location;
      if (loc) {
        loc.reload();
        return;
      }
    }
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.screen}>
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
            fill={colors.chartreuse}
            fillOpacity={0.14}
            stroke={colors.chartreuse}
            strokeOpacity={0.4}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={styles.title}>{t(C.errorTitle)}</Text>
        <Text style={styles.subtitle}>{t(C.errorSubtitle)}</Text>
        <Pressable accessibilityRole="button" onPress={this.reload} style={styles.button}>
          <Text style={styles.buttonLabel}>{t(C.errorReload)}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.cardPadding * 2,
    gap: 16,
  },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    height: 52,
    paddingHorizontal: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Libellé NOIR sur chartreuse (jamais de chartreuse sur clair — charte).
  buttonLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '600' },
});
