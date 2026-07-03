/**
 * GRYD — onglet Crew (placeholder MVP, GRYD_prompt_pages_ux §6 : crew-first).
 * État vide directif (§F : une phrase + un CTA) + crews factices du quartier,
 * cohérents avec la carte Milestone 1. Chat / membres / offensives = Milestone 3,
 * rien n'est câblé ici.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CREW_CODE_LENGTH,
  CREW_MAX_MEMBERS,
  colors,
  fontSizes,
  radii,
  spacing,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { GhostButton } from '../../src/ui/GhostButton';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';

interface FakeCrew {
  name: string;
  members: number;
  hexes: number;
}

/** Crews factices crédibles (mêmes noms que les motifs de la carte factice). */
const FAKE_CREWS: readonly FakeCrew[] = [
  { name: 'CREW NORD·XI', members: 9, hexes: 1240 },
  { name: 'LES PAVÉS 12', members: 6, hexes: 872 },
  { name: 'BPM BASTILLE', members: 4, hexes: 356 },
];

export default function CrewScreen() {
  useEffect(() => {
    screen('crew');
  }, []);

  const todoCrewFlow = (step: string) => {
    // TODO Milestone 3 : création / rejoindre un crew (crew_created, crew_joined §8).
    if (__DEV__) console.log(`[crew] ${step} — flux crew à venir (Milestone 3)`);
  };

  return (
    <TabScreen
      title="Crew"
      kicker="SAISON 0 · PARIS"
      subtitle="Le jeu de conquête de territoire pour run clubs."
    >
      {/* État vide directif (§F) — je n'ai pas encore de crew */}
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Personne ne tient un quartier seul.</Text>
        <Text style={styles.emptyBody}>
          Un crew cumule le territoire de ses coureurs — et le défend quand tu dors. Fonde le
          tien ou rejoins-en un en 1 tap.
        </Text>
        <View style={styles.emptyActions}>
          <GhostButton label="Créer mon crew" onPress={() => todoCrewFlow('create')} />
          <GhostButton
            label={`Rejoindre avec un code (${CREW_CODE_LENGTH} caractères)`}
            onPress={() => todoCrewFlow('join')}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>CREWS ACTIFS AUTOUR DE TOI</Text>
      {FAKE_CREWS.map((crew) => (
        <View key={crew.name} style={styles.crewRow}>
          <View style={styles.crewInfo}>
            <Text style={styles.crewName}>{crew.name}</Text>
            <Text style={styles.crewMeta}>
              {crew.members}/{CREW_MAX_MEMBERS} membres · {formatInt(crew.hexes)} hexes
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      ))}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    marginTop: 22,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  emptyTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 8,
  },
  emptyActions: { marginTop: 18, gap: 10 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 28,
    marginBottom: 12,
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  crewInfo: { flex: 1 },
  crewName: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  crewMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  chevron: { color: colors.gris, fontSize: fontSizes.lg },
});
