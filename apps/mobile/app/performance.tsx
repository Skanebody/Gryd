/**
 * GRYD — page PERFORMANCE (AMENDEMENT-17 CHANTIER 3). Running + impact GRYD,
 * PAS une copie Strava. Résumé + détail : au-dessus du fold on décide en un
 * regard — Score Forme géant (/100 + interprétation), Cette semaine, Impact
 * GRYD. Le détail (Progression avec UN mini-graph, Records, GRYD Verify) est
 * plus bas, au scroll. Pas 15 graphiques.
 *
 * Style dark GRYD, accent chartreuse, texte court, cards compactes, anti-shame.
 * Aucune valeur de jeu ici : la page LIT des données démo déterministes
 * (features/performance/demo) dérivées de la même source que carte + profil.
 * Analytics : event §8 `performance_page_viewed` à l'ouverture.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, sizes, spacing } from '@klaim/shared';
import { EVENTS, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
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
        {/* Honnêteté (§A) : tant qu'O1 n'est pas câblé, ces chiffres sont une
            démo — jamais présentés comme les vraies stats du joueur. */}
        <Text style={styles.demoNote}>Données de démonstration — pas encore tes vrais chiffres.</Text>

        {/* ── AU-DESSUS DU FOLD : décider en un regard ── */}
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

        {/* ── DÉTAIL : au scroll, pour explorer ── */}
        <ProgressionCard
          distancePct={p.progression.distancePct}
          paceGainSec={p.progression.paceGainSec}
          regularityWeeks={p.progression.regularityWeeks}
          trend={p.progression.trend}
        />
        <RecordsCard records={p.records} />

        <VerifyCard reliablePct={p.verify.reliablePct} channels={p.verify.channels} />
        {/* Lien vers le hub GRYD Verify (détail des sources / fiabilité). */}
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
  stack: { gap: spacing.sm, marginTop: spacing.xxs },
  demoNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  verifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    minHeight: sizes.touchTarget, // P1 : le lien était ~41 px de haut
    paddingVertical: spacing.sm,
  },
  verifyLinkText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
