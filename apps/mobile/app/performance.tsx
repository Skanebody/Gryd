/**
 * GRYD — page PERFORMANCE (running + impact GRYD).
 * Socle gratuit : Score Forme, semaine, impact GRYD, Verify.
 * Analyse avancée : premium (GRYD Club) — paywall doux.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FEATURE_KEYS, colors, fontSizes } from '@klaim/shared';
import { EVENTS, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { usePremiumGate } from '../src/features/monetization/usePremiumGate';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { SoftPaywall } from '../src/ui/SoftPaywall';
import { PERFORMANCE } from '../src/features/performance/demo';
import {
  GrydImpactCard,
  ProgressionCard,
  RecordsCard,
  ScoreFormeHero,
  VerifyCard,
  WeekCard,
} from '../src/features/performance/components';

export default function PerformanceScreen() {
  const advanced = usePremiumGate(FEATURE_KEYS.advancedStats);

  useEffect(() => {
    track(EVENTS.performancePageViewed);
  }, []);

  const p = PERFORMANCE;

  const openSources = () => {
    haptics.light();
    router.push('/sources');
  };

  return (
    <StackScreen title="Performance" icon="performance" kicker="TA FORME · TON IMPACT">
      <View style={styles.stack}>
        <ScoreFormeHero score={p.formeScore} delta={p.formeDelta} reading={p.formeReading} />
        <WeekCard
          runs={p.week.runs}
          km={p.week.km}
          duration={p.week.duration}
          pace={p.week.pace}
          goalDone={p.week.goalDone}
          goalTarget={p.week.goalTarget}
        />
        <GrydImpactCard stats={p.gryd.stats} crewLine={p.gryd.crewLine} />

        {advanced.loading ? (
          <Text style={styles.loading}>Chargement de ton accès…</Text>
        ) : advanced.available ? (
          <>
            <ProgressionCard
              distancePct={p.progression.distancePct}
              paceGainSec={p.progression.paceGainSec}
              regularityWeeks={p.progression.regularityWeeks}
              trend={p.progression.trend}
            />
            <RecordsCard records={p.records} />
          </>
        ) : (
          <SoftPaywall
            trigger="performance_advanced"
            title="Analyse avancée"
            body="Disponible avec GRYD Club. Ton historique basique et ton impact territorial restent gratuits."
          />
        )}

        <VerifyCard reliablePct={p.verify.reliablePct} channels={p.verify.channels} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir GRYD Verify et les sources connectées"
          onPress={openSources}
          style={({ pressed }) => [styles.verifyLink, pressed && styles.pressed]}
        >
          <Text style={styles.verifyLinkText}>Voir GRYD Verify · sources connectées</Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14, marginTop: 4 },
  loading: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center', paddingVertical: 8 },
  verifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  verifyLinkText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
