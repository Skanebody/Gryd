/**
 * GRYD — E01 Onboarding « promesse » (planche Vague 1, direction Night Print).
 * Photo plein cadre (coureur/crew, lever du jour) + voile carbone bas pour la
 * lisibilité, puis la PROMESSE : titre Display + une phrase + un CTA. Aucune card,
 * pas de téléphone flottant, pas de pavé (interdits §14). Le dégradé est
 * FONCTIONNEL (lisibilité du texte), jamais décoratif.
 *
 * ⚠ L'ASSET PHOTO. `assets/onboarding/e01-crew.png` est un PLACEHOLDER carbone tant
 * que la vraie photo n'est pas déposée (le fondateur remplace ce fichier). Le
 * layout est prêt : dès que la photo est là, elle s'affiche sous le voile.
 *
 * Rendu plein écran (bypass de l'en-tête commun de l'onboarding) — voir le
 * early-return `step === 'mechanic'` dans app/onboarding/index.tsx.
 */
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';

// Photo E01. Placeholder carbone jusqu'à ce que le vrai visuel soit déposé ici.
const E01_PHOTO = require('../../../assets/onboarding/e01-crew.png');

export interface E01HeroProps {
  brand: string;
  title: string;
  tagline: string;
  cta: string;
  signInLabel?: string;
  onNext: () => void;
  onSignIn?: () => void;
  insets: EdgeInsets;
  /** Étape courante (0-indexée) et total, pour l'indicateur discret. */
  stepIndex: number;
  stepCount: number;
}

export function E01Hero({
  brand,
  title,
  tagline,
  cta,
  signInLabel,
  onNext,
  onSignIn,
  insets,
  stepIndex,
  stepCount,
}: E01HeroProps) {
  return (
    <ImageBackground source={E01_PHOTO} resizeMode="cover" style={styles.root}>
      {/* Voile carbone bas — fonctionnel (contraste ≥ 7:1 sur le texte). Empilé
          en 3 paliers pour un dégradé sans dépendance (expo-linear-gradient absent). */}
      <View pointerEvents="none" style={[styles.scrim, styles.scrim1]} />
      <View pointerEvents="none" style={[styles.scrim, styles.scrim2]} />
      <View pointerEvents="none" style={[styles.scrim, styles.scrim3]} />

      {/* Marque discrète en haut (signe la page, ne domine pas). */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.brand}>{brand}</Text>
      </View>

      {/* Contenu : indicateur, titre, phrase, CTA — en zone pouce. */}
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.dots}>
          {Array.from({ length: stepCount }).map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.tagline}>{tagline}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaLabel}>{cta}</Text>
        </Pressable>
        {signInLabel && onSignIn ? (
          <Pressable
            accessibilityRole="button"
            onPress={onSignIn}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkLabel}>{signInLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.carbonImmersive, justifyContent: 'space-between' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // Trois paliers de voile carbone (du plus haut/léger au plus bas/dense).
  scrim1: { height: '70%', backgroundColor: 'rgba(6,8,7,0.30)' },
  scrim2: { height: '46%', backgroundColor: 'rgba(6,8,7,0.55)' },
  scrim3: { height: '26%', backgroundColor: 'rgba(6,8,7,0.82)' },

  top: { paddingHorizontal: spacing.lg },
  brand: {
    color: colors.chartreuse,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 3.5,
  },

  content: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blanc35 },
  dotActive: { width: 18, backgroundColor: colors.chartreuse },

  // Display 40 (Night Print) — capitales ≤ 4 mots, 2 lignes.
  title: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: fontSizes.xxl * 1.02,
  },
  tagline: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
    marginBottom: spacing.xs,
  },

  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0.2 },
  pressed: { opacity: 0.85 },

  link: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.xs },
  linkLabel: { color: colors.gris, fontFamily: fonts.textMedium, fontSize: fontSizes.sm, fontWeight: '500', textDecorationLine: 'underline' },
});
