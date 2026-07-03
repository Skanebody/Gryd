/**
 * GRYD — Onboarding motivationnel (AMENDEMENT-07 §8, motivation §17). Deux écrans
 * enchaînés en un seul flux : « Ton style GRYD » (Focus Solo / Mixte / Crew War)
 * puis « Ta visibilité » (Moi / Amis / Crew / Public + trace). Inséré APRÈS l'auth
 * (redirection depuis (tabs)/_layout tant que onboardingSeen=false, natif). NON
 * BLOQUANT : « Passer » à tout moment garde les défauts §1 et marque l'onboarding
 * comme vu ; sur web l'auth est court-circuitée donc ce flux ne bloque jamais.
 *
 * Les choix pilotent le FILTRAGE UI/notifs (§1), jamais le gameplay. Aucun nombre
 * magique : enums et défauts viennent de @klaim/shared / du store.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  radii,
  spacing,
  type MapSharing,
  type PlayStyle,
  type ProfileVisibility,
} from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { OptionCard } from '../../src/features/motivation/ui';
import {
  MAP_SHARING_LABELS,
  PLAY_STYLE_LABELS,
  PROFILE_VISIBILITY_LABELS,
} from '../../src/features/motivation/labels';
import { DEFAULT_PREFS, useMotivationPrefs } from '../../src/features/motivation/store';

/** Étapes de l'onboarding motivationnel (n = event onboarding_step §8). */
const STEP_STYLE = 10; // suite du funnel (promesse=1, permission… ; motiv ≥ 10)
const STEP_VISIBILITY = 11;

const STYLE_ORDER: PlayStyle[] = ['focus_solo', 'mixte', 'crew_war'];
const VISIBILITY_ORDER: ProfileVisibility[] = ['private', 'friends', 'crew', 'public'];
const STYLE_ICON: Record<PlayStyle, 'aujourdhui' | 'crew' | 'cible'> = {
  focus_solo: 'aujourdhui',
  mixte: 'crew',
  crew_war: 'cible',
};
/** Trace par défaut selon le style (jamais de position live) — proposition douce. */
const MAP_ORDER: MapSharing[] = ['simplified', 'precise', 'territory_only', 'none'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { prefs, update } = useMotivationPrefs();
  const [step, setStep] = useState<0 | 1>(0);
  const [playStyle, setPlayStyle] = useState<PlayStyle>(DEFAULT_PREFS.playStyle);
  const [visibility, setVisibility] = useState<ProfileVisibility>(DEFAULT_PREFS.profileVisibility);
  const [mapSharing, setMapSharing] = useState<MapSharing>(DEFAULT_PREFS.mapSharing);

  // Pré-remplir avec les prefs déjà stockées (retour dans le flux).
  useEffect(() => {
    setPlayStyle(prefs.playStyle);
    setVisibility(prefs.profileVisibility);
    setMapSharing(prefs.mapSharing);
  }, [prefs.playStyle, prefs.profileVisibility, prefs.mapSharing]);

  useEffect(() => {
    track(EVENTS.onboardingStep, { n: step === 0 ? STEP_STYLE : STEP_VISIBILITY });
  }, [step]);

  /** Ferme l'onboarding : persiste + marque vu, retourne à la carte. */
  const finish = async (persist: boolean) => {
    if (persist) {
      await update({
        playStyle,
        profileVisibility: visibility,
        mapSharing,
        onboardingSeen: true,
      });
    } else {
      await update({ onboardingSeen: true }); // « Passer » garde les défauts §1
    }
    router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.head}>
        <Text style={styles.kicker}>ÉTAPE {step + 1} / 2</Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => void finish(false)}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      {step === 0 ? (
        <View style={styles.body}>
          <Text style={styles.title}>Ton style GRYD</Text>
          <Text style={styles.subtitle}>
            Ça règle ce qu'on te met en avant — pas comment tu joues. Tu peux changer à tout moment.
          </Text>
          <View style={styles.options}>
            {STYLE_ORDER.map((s) => (
              <OptionCard
                key={s}
                title={PLAY_STYLE_LABELS[s].title}
                subtitle={PLAY_STYLE_LABELS[s].subtitle}
                icon={STYLE_ICON[s]}
                selected={playStyle === s}
                onPress={() => setPlayStyle(s)}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.title}>Ta visibilité</Text>
          <Text style={styles.subtitle}>
            Qui voit ton profil. Ta position en direct n'est jamais partagée, quel que soit ton choix.
          </Text>
          <View style={styles.options}>
            {VISIBILITY_ORDER.map((v) => (
              <OptionCard
                key={v}
                title={PROFILE_VISIBILITY_LABELS[v]}
                selected={visibility === v}
                onPress={() => setVisibility(v)}
              />
            ))}
          </View>
          <Text style={styles.groupLabel}>TA TRACE SUR LA CARTE</Text>
          <View style={styles.options}>
            {MAP_ORDER.map((m) => (
              <OptionCard
                key={m}
                title={MAP_SHARING_LABELS[m]}
                selected={mapSharing === m}
                onPress={() => setMapSharing(m)}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {step === 1 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep(0)}
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          >
            <View style={styles.mirror}>
              <Icon name="chevron" size={18} color={colors.blanc} />
            </View>
            <Text style={styles.ghostLabel}>Retour</Text>
          </Pressable>
        ) : (
          <View style={styles.ghostSpacer} />
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => (step === 0 ? setStep(1) : void finish(true))}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaLabel}>{step === 0 ? 'Continuer' : 'C’est parti'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.cardPadding,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  skip: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  body: { flex: 1, marginTop: 24 },
  title: { color: colors.blanc, fontSize: fontSizes.xl, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 8,
    marginBottom: 22,
  },
  options: {},
  groupLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 12,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  ghostSpacer: { flex: 0 },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  mirror: { transform: [{ scaleX: -1 }] },
  cta: {
    flex: 1,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
