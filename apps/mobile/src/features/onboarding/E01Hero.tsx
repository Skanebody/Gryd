/**
 * GRYD — E01 Onboarding « promesse » — REPRODUCTION FIDÈLE de la planche Claude
 * Design (GRYD - Vague 1 Planches, hi-fi iOS 390×844). Composition exacte de la
 * planche :
 *   · photo plein cadre (coureur solo, lever du jour, espace négatif bas) ;
 *   · label chartreuse « VOTRE RUE » posé au tiers ~44 % (la rue = le territoire) ;
 *   · voile bas dégradé à partir de 38 % (transparent → carbone) pour la lisibilité ;
 *   · « Passer » discret en haut à droite ;
 *   · bloc bas : titre Inter Tight 40/44, sous-titre 16/22, CTA « CONTINUER »
 *     (56 pt, radius 18, chartreuse/noir), puis 5 points d'étape (actif 16 px).
 *
 * ⚠ L'ASSET PHOTO reste un PLACEHOLDER carbone (`assets/onboarding/e01-crew.png`)
 * tant que le fondateur ne dépose pas la vraie photo (même chemin/nom).
 *
 * Rendu plein écran (bypass de l'en-tête onboarding) — early-return `step ===
 * 'mechanic'` dans app/onboarding/index.tsx.
 */
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '@klaim/shared';
import { E01Route } from './E01Route';

// Photo E01. Placeholder carbone jusqu'à ce que le vrai visuel soit déposé ici.
const E01_PHOTO = require('../../../assets/onboarding/e01-crew.png');

export interface E01HeroProps {
  title: string;
  tagline: string;
  cta: string;
  /** « Passer » en haut à droite (saute l'onboarding). */
  skipLabel: string;
  onNext: () => void;
  onSkip: () => void;
  insets: EdgeInsets;
  /** Étape courante (0-indexée) et total, pour les points d'étape. */
  stepIndex: number;
  stepCount: number;
}

export function E01Hero({
  title,
  tagline,
  cta,
  skipLabel,
  onNext,
  onSkip,
  insets,
  stepIndex,
  stepCount,
}: E01HeroProps) {
  return (
    <ImageBackground source={E01_PHOTO} resizeMode="cover" style={styles.root}>
      {/* Parcours chartreuse ANIMÉ qui se dessine sur la photo (remplace « VOTRE
          RUE ») — illustre la mécanique « ferme une boucle ». */}
      <E01Route />

      {/* Voile bas dégradé à partir de 38 % — fonctionnel (lisibilité), empilé en
          paliers (expo-linear-gradient absent) : transparent → carbone plein. */}
      <View pointerEvents="none" style={[styles.scrim, styles.scrim1]} />
      <View pointerEvents="none" style={[styles.scrim, styles.scrim2]} />
      <View pointerEvents="none" style={[styles.scrim, styles.scrim3]} />

      {/* « Passer » en haut à droite. */}
      <Pressable
        accessibilityRole="button"
        onPress={onSkip}
        hitSlop={8}
        style={({ pressed }) => [styles.skip, { top: insets.top + spacing.sm }, pressed && styles.pressed]}
      >
        <Text style={styles.skipLabel}>{skipLabel}</Text>
      </Pressable>

      {/* Bloc bas : titre → sous-titre → CTA → points d'étape. */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.tagline}>{tagline}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaLabel}>{cta}</Text>
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: stepCount }).map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.carbonImmersive },

  // Voile bas : à partir de ~38 % (donc hauteur 62 %), de plus en plus dense.
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrim1: { height: '62%', backgroundColor: 'rgba(6,8,7,0.25)' },
  scrim2: { height: '40%', backgroundColor: 'rgba(6,8,7,0.55)' },
  scrim3: { height: '22%', backgroundColor: colors.carbonImmersive },

  skip: { position: 'absolute', right: spacing.md, paddingHorizontal: 12, paddingVertical: 8 },
  skipLabel: { color: colors.gris, fontFamily: fonts.textMedium, fontSize: 14, fontWeight: '500' },

  bottom: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: 0, gap: 14 },
  // Titre Inter Tight 40 / interligne 44 / -0,01em (planche).
  title: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 44,
  },
  tagline: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 320,
  },
  // CTA plein chartreuse, radius 18 (btn), libellé noir (jamais chartreuse sur clair).
  cta: {
    marginTop: 4,
    height: 56,
    borderRadius: radii.btn,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { color: colors.noir, fontFamily: fonts.textBold, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  pressed: { opacity: 0.85 },

  // Points d'étape SOUS le CTA (planche) : actif 16 px chartreuse, inactifs 5 px.
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.grisLigne },
  dotActive: { width: 16, backgroundColor: colors.chartreuse },
});
