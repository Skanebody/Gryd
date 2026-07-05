/**
 * GRYD — HISTORIQUE (AMENDEMENT-17 CHANTIER 3) : « chaque course raconte un
 * effort ET un impact territorial ». Résumé + détail, anti-scroll : au-dessus
 * du fold on voit les FILTRES (Tout/Conquêtes/Défenses/Routes/Stats only), les
 * 3 dernières courses en cards compactes, et « Voir tout » qui déroule le
 * reste. Le détail d'une course est au tap (route course/[id]). Aucune valeur
 * de jeu calculée ici : la liste est le miroir déterministe des runs/claims
 * déjà décidés serveur (features/history/demo). Analytics : screen('historique').
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { RunHistoryCard } from '../src/features/history/RunHistoryCard';
import {
  countByFilter,
  HISTORY_FILTERS,
  recentRuns,
  runsByFilter,
  type HistoryFilter,
} from '../src/features/history/demo';

/** Barre de filtres horizontale (Tout/Conquêtes/Défenses/Routes/Stats only). */
function FilterBar({
  active,
  onSelect,
}: {
  active: HistoryFilter;
  onSelect: (f: HistoryFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      {HISTORY_FILTERS.map((f) => {
        const selected = f.key === active;
        const count = countByFilter(f.key);
        return (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Filtre ${f.label}, ${count} courses`}
            onPress={() => onSelect(f.key)}
            style={({ pressed }) => [
              styles.filterChip,
              selected && styles.filterChipOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.filterLabel, selected && styles.filterLabelOn]}>
              {f.label}
            </Text>
            <Text style={[styles.filterCount, selected && styles.filterCountOn]}>
              {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function HistoriqueScreen() {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  /** Fold : par défaut on ne montre que les 3 dernières (filtre « Tout »). */
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    screen('historique');
  }, []);

  const selectFilter = (f: HistoryFilter) => {
    if (f === filter) return;
    haptics.light();
    setFilter(f);
    // Changer de filtre = on montre tout ce qui match (le fold ne vaut que
    // pour la vue « Tout » non dépliée).
    setExpanded(f !== 'all');
  };

  const openRun = (id: string) => {
    haptics.light();
    router.push(`/course/${id}`);
  };

  /** Liste affichée : « Tout » non déplié → 3 dernières ; sinon → filtre complet. */
  const list = useMemo(() => {
    if (filter === 'all' && !expanded) return recentRuns();
    return runsByFilter(filter);
  }, [filter, expanded]);

  const total = countByFilter(filter);
  const showVoirTout = filter === 'all' && !expanded && total > list.length;

  return (
    <StackScreen
      title="Historique"
      icon="historique"
      kicker="TES COURSES"
      subtitle="Chaque course : ton effort et ce qu’elle a changé sur le terrain."
    >
      <FilterBar active={filter} onSelect={selectFilter} />

      <Text style={styles.sectionLabel}>
        {filter === 'all' && !expanded
          ? '3 DERNIÈRES COURSES'
          : `${total} COURSE${total > 1 ? 'S' : ''}`}
      </Text>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune course dans ce filtre pour l’instant.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((entry) => (
            <RunHistoryCard key={entry.id} entry={entry} onPress={() => openRun(entry.id)} />
          ))}
        </View>
      )}

      {showVoirTout ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir tout l’historique"
          onPress={() => {
            haptics.light();
            setExpanded(true);
          }}
          style={({ pressed }) => [styles.voirTout, pressed && styles.pressed]}
        >
          <Text style={styles.voirToutText}>Voir tout ({total})</Text>
        </Pressable>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  filterBar: { gap: 8, paddingVertical: 4, paddingRight: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  filterChipOn: { borderColor: gameColors.crew, backgroundColor: colors.chartreuse14 },
  filterLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  filterLabelOn: { color: gameColors.crew },
  filterCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterCountOn: { color: gameColors.crew },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 22,
    marginBottom: 12,
  },
  list: { gap: 12 },
  voirTout: {
    marginTop: 14,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voirToutText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  empty: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
  },
  emptyText: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },
});
