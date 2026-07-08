/**
 * GRYD — Crew Discovery premium (AMENDEMENT-08 §10, doc §16). Écran POUSSÉ
 * depuis Crew HQ. Chaque crew = CrewDiscoveryCard du design system jeu :
 * blason CrewCrest + frame de ligue, Niv · ville · ligue, tags de style de jeu
 * en chips d'état (War/Defense/Competitive), places restantes, rôles
 * recherchés, CTA fort « Demander à rejoindre » + « Voir la base » →
 * /crew-public?crew=TAG. Niveau/tier DÉRIVÉS de l'XP réelle (features/crew/
 * rules), rôles recherchés depuis les fiches publiques (publicDemo) — mêmes
 * données que la page publique. Rejoindre = stub toast TODO(O1). Aucun nombre
 * magique. Zéro position live (§37.3).
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CREW_MAX_MEMBERS, CREW_TAGS, colors, fontSizes, radii } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { CrewDiscoveryCard } from '../src/ui/game';
import {
  CREW_ROLE_LABELS,
  RECRUITMENT_STATUS_LABELS,
  crewFrameTierForLevel,
  crewLevelForXp,
  FRAME_TIER_LABELS,
} from '../src/features/crew/rules';
import {
  playTagsFor,
  type PublicCrewDemo,
} from '../src/features/crew/publicDemo';
import { useDiscoverableCrews } from '../src/features/crew/useDiscoverableCrews';
import { useJoinPublicCrew } from '../src/features/crew/joinCrew';
import { ToastHost, useToast } from '../src/features/social/Toast';

/** Filtres rapides §27 — chaque clé teste un signal d'activité du crew. */
type FilterKey = 'all' | 'open' | 'beginner' | 'war' | 'defense' | 'pioneer';
const FILTERS: readonly { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'beginner', label: 'Débutant OK' },
  { key: 'war', label: 'War Active' },
  { key: 'defense', label: 'Defense Active' },
  { key: 'pioneer', label: 'Pionniers' },
];

function matchesFilter(crew: PublicCrewDemo, key: FilterKey): boolean {
  switch (key) {
    case 'all':
      return true;
    case 'open':
      return crew.recruitment === 'open';
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

export default function CrewDiscoveryScreen() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const toast = useToast();
  const joinCrew = useJoinPublicCrew();
  const { crews } = useDiscoverableCrews('paris');

  useEffect(() => {
    screen('crew_discovery');
  }, []);

  const filtered = useMemo(
    () => crews.filter((c) => matchesFilter(c, filter)),
    [crews, filter],
  );

  return (
    <>
      <StackScreen
        title="Explorer les crews"
        icon="crew"
        kicker="SAISON 0 · PARIS"
        subtitle="Rejoins un crew vivant — les tags te disent lesquels attaquent et défendent vraiment."
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
            filtered.map((crew) => {
              const level = crewLevelForXp(crew.xp);
              const tier = crewFrameTierForLevel(level);
              return (
                <View key={crew.tag}>
                  <CrewDiscoveryCard
                    name={crew.name}
                    seed={`${crew.tag}·${crew.name}`}
                    level={level}
                    city={crew.city}
                    leagueTier={tier}
                    leagueLabel={`${FRAME_TIER_LABELS[tier] ?? tier} League`}
                    tags={playTagsFor(crew)}
                    members={{ current: crew.members, max: CREW_MAX_MEMBERS }}
                    runsPerWeek={crew.weeklyRuns}
                    seeking={crew.rolesWanted.map((r) => CREW_ROLE_LABELS[r] ?? r)}
                    onJoin={() => {
                      haptics.medium();
                      void joinCrew(crew).then((outcome) => toast.show(outcome.message));
                    }}
                    onViewBase={() =>
                      router.push({ pathname: '/crew-public', params: { crew: crew.tag } })
                    }
                  />
                  {/* Statut de recrutement (§9) + tags de style (§10, crews.tags 0013) —
                      chips neutres sous la card (couleur réservée aux états de jeu). */}
                  <View style={styles.metaRow}>
                    <View style={[styles.metaChip, styles.metaChipRecruit]}>
                      <Text style={styles.metaChipRecruitText}>
                        {RECRUITMENT_STATUS_LABELS[crew.recruitment]}
                      </Text>
                    </View>
                    {crew.tags.map((t) => (
                      <View key={t} style={styles.metaChip}>
                        <Text style={styles.metaChipText}>{CREW_TAGS[t]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.empty}>Aucun crew ne correspond à ce filtre pour l'instant.</Text>
          )}
        </View>
        <Text style={styles.footnote}>
          Aucun signal ne montre de position live. Les tags viennent de l'activité agrégée du
          crew (§37.3).
        </Text>
      </StackScreen>
      <ToastHost state={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 16, gap: 12 },
  // Chips recrutement/tags sous chaque card — neutres (identité, pas état de jeu).
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  metaChipText: { color: colors.gris, fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  metaChipRecruit: { borderColor: colors.blanc },
  metaChipRecruitText: { color: colors.blanc, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  filterChip: {
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  // Actif = bordure blanche (motif classement/badges) — chartreuse réservée
  // à moi/crew, CTA primaire, gains, live.
  filterChipActive: { backgroundColor: colors.carbone2, borderColor: colors.blanc },
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
