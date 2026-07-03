/**
 * GRYD — Crew Discovery (AMENDEMENT-06 §2, doc v3 §46). Écran POUSSÉ depuis
 * Crew HQ. Cards de crews à rejoindre avec SIGNAUX d'activité rapides (§46 :
 * War Active / Defense Active / Beginner Friendly / Pioneer / Competitive +
 * runs hebdo, places libres, open/request, langue). Le niveau et le statut sont
 * DÉRIVÉS de l'XP / activityScore réels (features/crew/rules) — pas saisis en
 * dur. Rejoindre = stub TODO(O1). Aucun nombre magique.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CREW_MAX_MEMBERS, colors, fontSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt } from '../src/ui/format';
import {
  ACTIVITY_STATUS_LABELS,
  activityStatusForScore,
  crewLevelForXp,
} from '../src/features/crew/rules';
import { DISCOVERY_CREWS, type DiscoveryCrewDemo } from '../src/features/crew/demo';

const OBJECTIVE_LABELS: Record<DiscoveryCrewDemo['objective'], string> = {
  casual: 'Casual',
  competitif: 'Compétitif',
  pionnier: 'Pionnier',
};

/** Signaux d'activité §46 → chips (booléens). L'ordre est stable. */
function signals(crew: DiscoveryCrewDemo): string[] {
  const out: string[] = [];
  if (crew.warActive) out.push('War Active');
  if (crew.defenseActive) out.push('Defense Active');
  if (crew.objective === 'competitif') out.push('Competitive');
  if (crew.pioneer) out.push('Pioneer');
  if (crew.beginnerFriendly) out.push('Beginner Friendly');
  return out;
}

/** Filtres rapides §27 (enrichissement) — chaque clé teste un champ du crew. */
type FilterKey = 'all' | 'open' | 'beginner' | 'war' | 'defense' | 'pioneer';
const FILTERS: readonly { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'beginner', label: 'Débutant OK' },
  { key: 'war', label: 'War Active' },
  { key: 'defense', label: 'Defense Active' },
  { key: 'pioneer', label: 'Pionniers' },
];

function matchesFilter(crew: DiscoveryCrewDemo, key: FilterKey): boolean {
  switch (key) {
    case 'all':
      return true;
    case 'open':
      return crew.policy === 'open';
    case 'beginner':
      return crew.beginnerFriendly;
    case 'war':
      return crew.warActive;
    case 'defense':
      return crew.defenseActive;
    case 'pioneer':
      return crew.pioneer;
  }
}

function CrewCard({ crew }: { crew: DiscoveryCrewDemo }) {
  const level = crewLevelForXp(crew.xp);
  const status = activityStatusForScore(crew.activityScore);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.tagBox}>
          <Text style={styles.tagText}>{crew.tag}</Text>
        </View>
        <View style={styles.headInfo}>
          <Text style={styles.name}>{crew.name}</Text>
          <Text style={styles.meta}>
            Niv. {level} · {crew.city} · {ACTIVITY_STATUS_LABELS[status]}
          </Text>
        </View>
      </View>

      <View style={styles.signals}>
        {signals(crew).map((s) => (
          <View key={s} style={styles.signalChip}>
            <Text style={styles.signalText}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {crew.members}/{CREW_MAX_MEMBERS}
          </Text>
          <Text style={styles.statLabel}>membres</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatInt(crew.weeklyRuns)}</Text>
          <Text style={styles.statLabel}>runs/sem</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{crew.openSpots}</Text>
          <Text style={styles.statLabel}>places</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{crew.language}</Text>
          <Text style={styles.statLabel}>{OBJECTIVE_LABELS[crew.objective]}</Text>
        </View>
      </View>

      <View style={styles.joinRow}>
        <GhostButton
          label={crew.policy === 'open' ? 'Rejoindre' : 'Demander à rejoindre'}
          icon="plus"
          onPress={() => {
            // TODO(O1) : crew_joined / demande d'adhésion (§8, policy open/request).
            if (__DEV__) console.log(`[crew-discovery] join ${crew.name} (${crew.policy})`);
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Voir la fiche de ${crew.name}`}
          onPress={() => router.push('/crew-public')}
          style={({ pressed }) => [styles.detailLink, pressed && styles.dim]}
        >
          <Text style={styles.detailText}>Voir la fiche</Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CrewDiscoveryScreen() {
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    screen('crew_discovery');
  }, []);

  const filtered = useMemo(
    () => DISCOVERY_CREWS.filter((c) => matchesFilter(c, filter)),
    [filter],
  );

  return (
    <StackScreen
      title="Explorer les crews"
      icon="crew"
      kicker="SAISON 0 · PARIS"
      subtitle="Rejoins un crew vivant — les signaux te disent lesquels courent, attaquent et défendent vraiment."
    >
      {/* Filtres rapides §27 */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityLabel={`Filtrer : ${f.label}`}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {filtered.length > 0 ? (
          filtered.map((crew) => <CrewCard key={crew.name} crew={crew} />)
        ) : (
          <Text style={styles.empty}>Aucun crew ne correspond à ce filtre pour l'instant.</Text>
        )}
      </View>
      <Text style={styles.footnote}>
        Aucun signal ne montre de position live. Les indicateurs viennent de l'activité agrégée
        du crew (§37.3).
      </Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 16, gap: 12 },
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tagBox: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0.5 },
  headInfo: { flex: 1 },
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0.3 },
  meta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3, letterSpacing: 0.3 },
  signals: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  signalChip: {
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  signalText: { color: colors.blanc, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  stat: { alignItems: 'center' },
  statValue: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  joinRow: { marginTop: 16, gap: 10 },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  detailText: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.2 },
  dim: { opacity: 0.6 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  filterChip: {
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  filterChipActive: { backgroundColor: colors.carbone2, borderColor: colors.chartreuse40 },
  filterText: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  filterTextActive: { color: colors.blanc, fontWeight: '600' },
  empty: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center', paddingVertical: 24 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 18,
  },
});
